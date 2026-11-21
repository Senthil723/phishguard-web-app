import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from fastapi import BackgroundTasks, HTTPException
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from app.api.v1.endpoints.auth import confirm_password_reset, request_password_reset
from app.core.config import Settings
from app.core.security import hash_password, verify_password
from app.db.base import Base
from app.models.password_reset import PasswordResetToken
from app.models.session import UserSession
from app.models.user import User
from app.schemas.user import PasswordResetConfirm, PasswordResetRequest
from app.services.password_reset_email import send_password_reset_email


class PasswordResetTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()
        self.settings = Settings(
            _env_file=None,
            smtp_host="smtp.example.com",
            smtp_port=587,
            smtp_username="mailer",
            smtp_password="secret",
            smtp_from_email="noreply@example.com",
        )
        self.user = User(
            username="alice", email="alice@example.com",
            hashed_password=hash_password("original-password-123"),
        )
        self.db.add(self.user)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def request(self, email):
        tasks = BackgroundTasks()
        with patch("app.api.v1.endpoints.auth.get_settings", return_value=self.settings):
            response = request_password_reset(
                PasswordResetRequest(email=email), tasks, db=self.db
            )
        return response, tasks

    def test_unknown_email_has_same_response_and_no_token(self):
        known, tasks = self.request("alice@example.com")
        unknown, unknown_tasks = self.request("missing@example.com")
        self.assertEqual(known, unknown)
        self.assertEqual(len(tasks.tasks), 1)
        self.assertEqual(len(unknown_tasks.tasks), 0)
        self.assertEqual(self.db.query(PasswordResetToken).count(), 1)

    def test_reset_is_single_use_and_revokes_sessions(self):
        session = UserSession(
            user_id=self.user.id,
            token_hash="session-hash",
            expires_at=datetime.now(timezone.utc) + timedelta(days=1),
        )
        self.db.add(session)
        self.db.commit()

        _, tasks = self.request("ALICE@example.com")
        token = tasks.tasks[0].args[1]
        self.assertNotEqual(self.db.scalar(select(PasswordResetToken)).token_hash, token)
        self.assertEqual(len(self.request("alice@example.com")[1].tasks), 0)

        result = confirm_password_reset(
            PasswordResetConfirm(token=token, password="new-password-456"),
            db=self.db,
        )
        self.assertIn("Password updated", result["message"])
        self.db.refresh(self.user)
        self.db.refresh(session)
        self.assertTrue(verify_password("new-password-456", self.user.hashed_password))
        self.assertFalse(verify_password("original-password-123", self.user.hashed_password))
        self.assertIsNotNone(session.revoked_at)
        with self.assertRaises(HTTPException):
            confirm_password_reset(
                PasswordResetConfirm(token=token, password="another-password-789"),
                db=self.db,
            )

    def test_expired_token_is_rejected(self):
        _, tasks = self.request("alice@example.com")
        token = tasks.tasks[0].args[1]
        reset = self.db.scalar(select(PasswordResetToken))
        reset.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
        self.db.commit()
        with self.assertRaises(HTTPException) as raised:
            confirm_password_reset(
                PasswordResetConfirm(token=token, password="new-password-456"),
                db=self.db,
            )
        self.assertEqual(raised.exception.status_code, 400)

    def test_smtp_uses_starttls_and_sends_reset_link(self):
        class FakeSMTP:
            def __init__(self, host, port, timeout):
                self.host, self.port = host, port
                self.secured = False
                self.sent = None

            def __enter__(self):
                return self

            def __exit__(self, *_):
                return None

            def starttls(self, context):
                self.secured = context is not None

            def login(self, username, password):
                self.credentials = (username, password)

            def send_message(self, message):
                self.sent = message

        sent = FakeSMTP("smtp.example.com", 587, 10)
        with patch("app.services.password_reset_email.smtplib.SMTP", return_value=sent):
            send_password_reset_email("alice@example.com", "test-token", self.settings)
        self.assertTrue(sent.secured)
        self.assertEqual(sent.credentials, ("mailer", "secret"))
        self.assertIn("/reset-password#token=test-token", sent.sent.get_content())


if __name__ == "__main__":
    unittest.main()
