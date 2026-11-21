
from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

from app.db.session import engine
from app.models.scan import Scan


def migrate_scan_columns(db_engine: Engine = engine) -> None:
    """Bring legacy scan tables up to the current nullable-column schema."""

    new_columns = {
        "user_id": "INTEGER REFERENCES users(id)",
        "prediction": "VARCHAR(32)",
        "risk_level": "VARCHAR(16)",
        "model_score": "FLOAT",
        "model_version": "VARCHAR(64)",
    }

    with db_engine.begin() as connection:
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
                if column_name == "user_id" and db_engine.dialect.name == "mysql":
                    column_type = "INTEGER NULL"
                connection.execute(
                    text(
                        f"ALTER TABLE scans "
                        f"ADD COLUMN {column_name} {column_type}"
                    )
                )

        if db_engine.dialect.name == "mysql":
            foreign_keys = inspector.get_foreign_keys("scans")
            if not any("user_id" in key["constrained_columns"] for key in foreign_keys):
                connection.execute(text(
                    "ALTER TABLE scans ADD CONSTRAINT fk_scans_user_id "
                    "FOREIGN KEY (user_id) REFERENCES users(id)"
                ))

        user_index = next(
            index for index in Scan.__table__.indexes
            if index.name == "ix_scans_user_id"
        )
        user_index.create(bind=connection, checkfirst=True)


def migrate_mysql_datetime_precision(db_engine: Engine = engine) -> None:
    """Preserve fractional seconds in MySQL timestamp columns."""
    if db_engine.dialect.name != "mysql":
        return

    timestamp_columns = {
        "users": ("created_at",),
        "user_sessions": ("created_at", "expires_at", "revoked_at"),
        "scans": ("created_at",),
    }
    with db_engine.begin() as connection:
        inspector = inspect(connection)
        for table_name, names in timestamp_columns.items():
            columns = {column["name"]: column for column in inspector.get_columns(table_name)}
            for name in names:
                column = columns[name]
                if getattr(column["type"], "fsp", None) == 6:
                    continue
                nullability = "NULL" if column["nullable"] else "NOT NULL"
                connection.execute(text(
                    f"ALTER TABLE `{table_name}` MODIFY COLUMN `{name}` "
                    f"DATETIME(6) {nullability}"
                ))
