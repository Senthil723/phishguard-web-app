from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, HttpUrl, field_validator


class ScanCreate(BaseModel):
    url: HttpUrl

    @field_validator("url")
    @classmethod
    def require_http_or_https(cls, value: HttpUrl) -> HttpUrl:
        if value.scheme not in {"http", "https"}:
            raise ValueError("Only http and https URLs are accepted.")
        return value


class ScanRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    url: HttpUrl
    status: str
    created_at: datetime

    @field_validator("created_at", mode="before")
    @classmethod
    def normalize_created_at_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)


class ScanStatsRead(BaseModel):
    total_scans: int
    analyzed_scans: int
    pending_scans: int
    failed_scans: int
    unknown_scans: int
    status_counts: dict[str, int]
