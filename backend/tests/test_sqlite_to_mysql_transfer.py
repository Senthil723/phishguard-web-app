import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import create_engine, insert, select

from app.db.base import Base
from app.models.scan import Scan
from app.models.session import UserSession
from app.models.user import User
from scripts.migrate_sqlite_to_mysql import copy_data


class TransferTest(unittest.TestCase):
    def test_copies_accounts_sessions_and_scans_with_ids(self):
        with tempfile.TemporaryDirectory() as directory:
            source_path = Path(directory) / "source.db"
            source = create_engine(f"sqlite:///{source_path.as_posix()}")
            target = create_engine("sqlite:///:memory:")
            try:
                Base.metadata.create_all(source)
                now = datetime.now(timezone.utc)
                with source.begin() as connection:
                    connection.execute(insert(User), {
                        "id": 7, "username": "alice", "email": "alice@example.com",
                        "hashed_password": "hash", "is_active": True, "created_at": now,
                    })
                    connection.execute(insert(UserSession), {
                        "id": 11, "user_id": 7, "token_hash": "token-hash",
                        "created_at": now, "expires_at": now, "revoked_at": None,
                    })
                    connection.execute(insert(Scan), {
                        "id": 19, "user_id": 7, "url": "https://example.com",
                        "status": "completed", "created_at": now,
                        "prediction": "low_risk", "risk_level": "low",
                        "model_score": 0.25, "model_version": "test",
                    })

                self.assertEqual(copy_data(source_path, target), {
                    "users": 1, "scans": 1, "user_sessions": 1,
                })
                with target.connect() as connection:
                    self.assertEqual(connection.scalar(select(User.id)), 7)
                    self.assertEqual(connection.scalar(select(UserSession.user_id)), 7)
                    self.assertEqual(connection.scalar(select(Scan.user_id)), 7)
                    self.assertEqual(connection.scalar(select(Scan.id)), 19)
                with self.assertRaisesRegex(RuntimeError, "already contains"):
                    copy_data(source_path, target)
            finally:
                source.dispose()
                target.dispose()


if __name__ == "__main__":
    unittest.main()
