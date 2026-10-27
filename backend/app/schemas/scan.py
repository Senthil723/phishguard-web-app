from datetime import datetime

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
