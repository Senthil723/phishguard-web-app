"""Copy PhishGuard records from SQLite into an empty MySQL database.

Run from backend/: python -m scripts.migrate_sqlite_to_mysql
The source file is opened read-only. DATABASE_URL is not changed by this script.
"""

import argparse
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import DateTime, create_engine, func, inspect, insert, select
from sqlalchemy.engine import Engine, make_url

from app.core.config import get_settings
from app.db.base import Base
from app.models.scan import Scan
from app.models.session import UserSession
from app.models.user import User


TABLES = (User.__table__, Scan.__table__, UserSession.__table__)


def _read_source(path: Path) -> dict[str, list[dict]]:
    if not path.is_file():
        raise RuntimeError(f"SQLite source does not exist: {path}")

    connection = sqlite3.connect(f"{path.resolve().as_uri()}?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    try:
        connection.execute("BEGIN")
        rows = {}
        for table in TABLES:
            name = table.name
            columns = {
                row[1] for row in connection.execute(f"PRAGMA table_info({name})")
            }
            required = {column.name for column in table.columns}
            if not columns or not required.issubset(columns):
                raise RuntimeError(
                    f"SQLite table {name} is missing columns: "
                    f"{', '.join(sorted(required - columns)) or name}. "
                    "Start the app once with SQLite to apply its schema updates."
                )
            records = [dict(row) for row in connection.execute(f"SELECT * FROM {name}")]
            for record in records:
                for column in table.columns:
                    if isinstance(record[column.name], str) and isinstance(column.type, DateTime):
                        value = datetime.fromisoformat(record[column.name])
                        if value.tzinfo is not None:
                            value = value.astimezone(timezone.utc).replace(tzinfo=None)
                        record[column.name] = value
            rows[name] = [
                {column.name: record[column.name] for column in table.columns}
                for record in records
            ]
        return rows
    finally:
        connection.close()


def copy_data(source_path: Path, target: Engine) -> dict[str, int]:
    """Copy all records, preserving primary keys; reject a populated target."""
    source = _read_source(source_path)
    with target.connect() as connection:
        existing = set(inspect(connection).get_table_names())
        occupied = existing.intersection(table.name for table in TABLES)
        if occupied:
            raise RuntimeError(
                "Target already contains PhishGuard tables: "
                + ", ".join(sorted(occupied))
                + ". Use a new empty MySQL database for this one-time transfer."
            )

    Base.metadata.create_all(target)
    with target.begin() as connection:
        for table in TABLES:
            records = source[table.name]
            for start in range(0, len(records), 500):
                connection.execute(insert(table), records[start:start + 500])

        counts = {}
        for table in TABLES:
            count = connection.scalar(select(func.count()).select_from(table))
            if count != len(source[table.name]):
                raise RuntimeError(f"Count mismatch for {table.name}; transfer rolled back")
            counts[table.name] = count
    return counts


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--sqlite-path", type=Path, default=Path("phishguard.db"),
        help="SQLite file to copy (default: ./phishguard.db from backend/)",
    )
    args = parser.parse_args()
    settings = get_settings()
    mysql_url = settings.mysql_database_url or settings.database_url
    if not mysql_url:
        parser.error("Set MYSQL_DATABASE_URL or DATABASE_URL in backend/.env first")
    url = make_url(mysql_url)
    if url.drivername != "mysql+pymysql":
        parser.error("The MySQL URL must use mysql+pymysql://")

    engine = create_engine(url, pool_pre_ping=True)
    try:
        counts = copy_data(args.sqlite_path, engine)
    finally:
        engine.dispose()
    for name, count in counts.items():
        print(f"{name}: {count} copied and verified")
    if settings.database_url == mysql_url:
        print("SQLite source unchanged. DATABASE_URL already points to MySQL.")
    else:
        print("SQLite source unchanged. Set DATABASE_URL to the MySQL URL, then start the API.")


if __name__ == "__main__":
    main()
