
from sqlalchemy import inspect, text

from app.db.session import engine


def migrate_scan_prediction_columns() -> None:
    """Safely add ML prediction columns without deleting existing records."""

    new_columns = {
        "prediction": "VARCHAR(32)",
        "risk_level": "VARCHAR(16)",
        "model_score": "FLOAT",
        "model_version": "VARCHAR(64)",
    }

    with engine.begin() as connection:
        inspector = inspect(connection)

        if not inspector.has_table("scans"):
            raise RuntimeError(
                "The scans table does not exist. Initialize the database first."
            )

        existing_columns = {
            column["name"]
            for column in inspector.get_columns("scans")
        }

        for column_name, column_type in new_columns.items():
            if column_name not in existing_columns:
                connection.execute(
                    text(
                        f"ALTER TABLE scans "
                        f"ADD COLUMN {column_name} {column_type}"
                    )
                )
                print(f"Added column: {column_name}")
            else:
                print(f"Already exists: {column_name}")

    print("Scan table migration completed.")
