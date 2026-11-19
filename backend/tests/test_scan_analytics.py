import unittest
from datetime import date, datetime, timezone

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.api.v1.endpoints.scans import get_scan_analytics
from app.db.base import Base
from app.models.scan import Scan
from app.models.user import User


class ScanAnalyticsEndpointTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(bind=self.engine)
        self.session = sessionmaker(bind=self.engine)()
        self.user = User(
            username="analyst",
            email="analyst@example.com",
            hashed_password="test-only",
        )
        self.other_user = User(
            username="other",
            email="other@example.com",
            hashed_password="test-only",
        )
        self.session.add_all([self.user, self.other_user])
        self.session.flush()

        self.session.add_all(
            [
                Scan(
                    user_id=self.user.id,
                    url="https://pending.example",
                    status="not_analyzed",
                    created_at=datetime(2026, 10, 30, 23, 59, tzinfo=timezone.utc),
                ),
                Scan(
                    user_id=self.user.id,
                    url="https://complete.example",
                    status="completed",
                    created_at=datetime(2026, 10, 31, 0, 0, tzinfo=timezone.utc),
                ),
                Scan(
                    user_id=self.user.id,
                    url="https://unknown.example",
                    status="other",
                    created_at=datetime(2026, 10, 31, 23, 59, tzinfo=timezone.utc),
                ),
                Scan(
                    user_id=self.user.id,
                    url="https://failed.example",
                    status="failed",
                    created_at=datetime(2026, 11, 1, 0, 0, tzinfo=timezone.utc),
                ),
                Scan(
                    user_id=self.other_user.id,
                    url="https://private.example",
                    status="completed",
                    created_at=datetime(2026, 10, 31, 12, 0, tzinfo=timezone.utc),
                ),
            ]
        )
        self.session.commit()

    def tearDown(self) -> None:
        self.session.close()
        self.engine.dispose()

    def test_inclusive_utc_date_range_aggregates_all_status_categories(self) -> None:
        result = get_scan_analytics(
            from_date=date(2026, 10, 31),
            through_date=date(2026, 10, 31),
            db=self.session,
            current_user=self.user,
        )

        self.assertEqual(result.total_scans, 2)
        self.assertEqual(result.pending_scans, 0)
        self.assertEqual(result.analyzed_scans, 1)
        self.assertEqual(result.failed_scans, 0)
        self.assertEqual(result.unknown_scans, 1)
        self.assertEqual(result.status_counts, {"completed": 1, "other": 1})
        self.assertEqual(
            [(bucket.date, bucket.count) for bucket in result.daily_submissions],
            [(date(2026, 10, 31), 2)],
        )

    def test_unbounded_analytics_includes_all_records_and_active_days(self) -> None:
        result = get_scan_analytics(
            from_date=None,
            through_date=None,
            db=self.session,
            current_user=self.user,
        )

        self.assertEqual(result.total_scans, 4)
        self.assertEqual(result.pending_scans, 1)
        self.assertEqual(result.analyzed_scans, 1)
        self.assertEqual(result.failed_scans, 1)
        self.assertEqual(result.unknown_scans, 1)
        self.assertEqual(
            [bucket.count for bucket in result.daily_submissions],
            [1, 2, 1],
        )

    def test_reversed_date_range_is_rejected(self) -> None:
        with self.assertRaises(HTTPException) as raised:
            get_scan_analytics(
                from_date=date(2026, 11, 1),
                through_date=date(2026, 10, 31),
                db=self.session,
                current_user=self.user,
            )

        self.assertEqual(raised.exception.status_code, 422)

    def test_maximum_through_date_does_not_overflow(self) -> None:
        result = get_scan_analytics(
            from_date=date.max,
            through_date=date.max,
            db=self.session,
            current_user=self.user,
        )

        self.assertEqual(result.total_scans, 0)
        self.assertEqual(result.daily_submissions, [])


if __name__ == "__main__":
    unittest.main()
