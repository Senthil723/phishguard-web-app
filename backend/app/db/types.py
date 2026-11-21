from sqlalchemy import DateTime
from sqlalchemy.dialects.mysql import DATETIME as MySQLDateTime


def utc_datetime_type():
    """Keep microsecond precision when storing timestamps in MySQL."""
    return DateTime(timezone=True).with_variant(MySQLDateTime(fsp=6), "mysql")
