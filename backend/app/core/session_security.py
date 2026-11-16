
import hashlib
import secrets

from datetime import datetime, timedelta, timezone


# Normal login: session expires after 8 hours.
NORMAL_SESSION_HOURS = 8

# Remember Me: session expires after 30 days.
REMEMBER_ME_DAYS = 30


def generate_session_token() -> str:
    """Generate a cryptographically secure random token."""
    return secrets.token_urlsafe(32)


def hash_session_token(token: str) -> str:
    """Hash the session token before storing it in SQLite."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def get_session_expiry(remember_me: bool = False) -> datetime:
    """Calculate when the login session expires."""
    now = datetime.now(timezone.utc)

    if remember_me:
        return now + timedelta(days=REMEMBER_ME_DAYS)

    return now + timedelta(hours=NORMAL_SESSION_HOURS)
