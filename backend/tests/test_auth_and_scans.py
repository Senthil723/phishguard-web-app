import unittest
from unittest.mock import patch

from fastapi import HTTPException, Response
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.api.v1.endpoints.auth import (
    get_current_user,
    login_user,
    logout_user,
    register_user,
)
from app.api.v1.endpoints.scans import create_scan, get_scan, get_scan_stats, list_scans
from app.db.base import Base
from app.models.scan import Scan
from app.models.session import UserSession
from app.models.user import User
from app.schemas.scan import ScanCreate
from app.schemas.user import UserLogin, UserRegister


class AuthAndScanTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(bind=self.engine)
        self.session = sessionmaker(bind=self.engine)()

    def tearDown(self) -> None:
        self.session.close()
        self.engine.dispose()

    def register(self, username: str) -> User:
        return register_user(
            UserRegister(
                username=username,
                email=f"{username}@example.com",
                password="test-password-123",
            ),
            db=self.session,
        )

    def test_registration_login_session_and_logout(self) -> None:
        user = self.register("analyst")
        self.assertNotEqual(user.hashed_password, "test-password-123")

        response = Response()
        logged_in = login_user(
            UserLogin(username="analyst", password="test-password-123"),
            response=response,
            db=self.session,
        )
        self.assertEqual(logged_in.id, user.id)
        token = response.headers["set-cookie"].split("phishguard_session=")[1].split(";")[0]
        self.assertEqual(get_current_user(token, db=self.session).id, user.id)
        self.assertEqual(self.session.query(UserSession).count(), 1)

        logout_user(response=Response(), phishguard_session=token, db=self.session)
        with self.assertRaises(HTTPException) as raised:
            get_current_user(token, db=self.session)
        self.assertEqual(raised.exception.status_code, 401)

    def test_login_rejects_wrong_password(self) -> None:
        self.register("analyst")
        with self.assertRaises(HTTPException) as raised:
            login_user(
                UserLogin(username="analyst", password="wrong"),
                response=Response(),
                db=self.session,
            )
        self.assertEqual(raised.exception.status_code, 401)

    def test_scan_stores_prediction_and_is_private_to_owner(self) -> None:
        owner = self.register("analyst")
        other = self.register("other")
        prediction = {
            "prediction": "needs_review",
            "risk_level": "medium",
            "model_score": 0.7,
            "model_version": "test-model",
        }
        with patch("app.api.v1.endpoints.scans.predict_url", return_value=prediction):
            scan = create_scan(
                ScanCreate(url="https://example.com/login"),
                db=self.session,
                current_user=owner,
            )

        self.assertEqual(scan.user_id, owner.id)
        self.assertEqual(scan.prediction, "needs_review")
        self.assertEqual(get_scan(scan.id, db=self.session, current_user=owner).id, scan.id)
        self.assertEqual([row.id for row in list_scans(20, offset=0, db=self.session, current_user=owner)], [scan.id])
        self.assertEqual(list_scans(20, offset=0, db=self.session, current_user=other), [])
        self.assertEqual(list_scans(20, offset=1, db=self.session, current_user=owner), [])
        self.assertEqual(get_scan_stats(db=self.session, current_user=owner).analyzed_scans, 1)

        with self.assertRaises(HTTPException) as raised:
            get_scan(scan.id, db=self.session, current_user=other)
        self.assertEqual(raised.exception.status_code, 404)

    def test_scan_reports_missing_model_without_saving(self) -> None:
        owner = self.register("analyst")
        with patch("app.api.v1.endpoints.scans.predict_url", side_effect=FileNotFoundError):
            with self.assertRaises(HTTPException) as raised:
                create_scan(
                    ScanCreate(url="https://example.com"),
                    db=self.session,
                    current_user=owner,
                )
        self.assertEqual(raised.exception.status_code, 503)
        self.assertEqual(self.session.query(Scan).count(), 0)


if __name__ == "__main__":
    unittest.main()
