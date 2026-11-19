import unittest

from sqlalchemy import create_engine, inspect, text

from app.db.migrations import migrate_scan_columns
from app.models.user import User


class ScanMigrationTests(unittest.TestCase):
    def test_legacy_scan_table_is_upgraded_without_losing_rows(self) -> None:
        engine = create_engine("sqlite:///:memory:")
        try:
            User.__table__.create(bind=engine)
            with engine.begin() as connection:
                connection.execute(text(
                    "CREATE TABLE scans (id INTEGER PRIMARY KEY, url VARCHAR(2048) NOT NULL, "
                    "status VARCHAR(32) NOT NULL, created_at DATETIME NOT NULL)"
                ))
                connection.execute(text(
                    "INSERT INTO scans (id, url, status, created_at) "
                    "VALUES (1, 'https://example.com', 'not_analyzed', '2026-01-01')"
                ))

            migrate_scan_columns(engine)
            migrate_scan_columns(engine)

            columns = {column["name"] for column in inspect(engine).get_columns("scans")}
            self.assertTrue({"user_id", "prediction", "risk_level", "model_score", "model_version"} <= columns)
            with engine.connect() as connection:
                self.assertEqual(connection.scalar(text("SELECT COUNT(*) FROM scans")), 1)
        finally:
            engine.dispose()


if __name__ == "__main__":
    unittest.main()
