from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # SQLite makes first-time local setup simple. Set DATABASE_URL in .env for MySQL.
    database_url: str = "sqlite:///./phishguard.db"
    # Used only by the one-time SQLite-to-MySQL transfer script.
    mysql_database_url: str | None = None
    frontend_origins: str = "http://localhost:5173"
    session_cookie_secure: bool = False
    password_reset_frontend_url: str = "http://localhost:5173"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""
    smtp_use_ssl: bool = False

    @property
    def smtp_configured(self) -> bool:
        return bool(
            self.smtp_host
            and self.smtp_from_email
            and (not self.smtp_username or self.smtp_password)
        )

    @property
    def cors_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.frontend_origins.split(",")
            if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    return Settings()
