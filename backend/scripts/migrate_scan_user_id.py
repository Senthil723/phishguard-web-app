
import sqlite3
from pathlib import Path


DATABASE_PATH = (
    Path(__file__).resolve().parents[1] / "phishguard.db"
)


def migrate():
    if not DATABASE_PATH.is_file():
        raise FileNotFoundError(
            f"Database not found: {DATABASE_PATH}"
        )

    with sqlite3.connect(DATABASE_PATH) as connection:
        connection.execute("BEGIN IMMEDIATE")

        tables = {
            row[0]
            for row in connection.execute(
                "SELECT name FROM sqlite_master "
                "WHERE type = 'table'"
            )
        }

        if "scans" not in tables or "users" not in tables:
            raise RuntimeError(
                "Required scans or users table is missing."
            )

        before_count = connection.execute(
            "SELECT COUNT(*) FROM scans"
        ).fetchone()[0]

        columns = {
            row[1]
            for row in connection.execute(
                "PRAGMA table_info(scans)"
            )
        }

        if "user_id" not in columns:
            connection.execute(
                "ALTER TABLE scans "
                "ADD COLUMN user_id INTEGER REFERENCES users(id)"
            )
            print("user_id column added successfully.")
        else:
            print("user_id column already exists.")

        connection.execute(
            "CREATE INDEX IF NOT EXISTS "
            "ix_scans_user_id ON scans(user_id)"
        )

        after_count = connection.execute(
            "SELECT COUNT(*) FROM scans"
        ).fetchone()[0]

        if before_count != after_count:
            raise RuntimeError(
                "Scan record count changed unexpectedly."
            )

        print("Scan records before:", before_count)
        print("Scan records after:", after_count)
        print("Database migration successful.")


if __name__ == "__main__":
    migrate()
