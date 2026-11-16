
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.session_security import (
    generate_session_token,
    get_session_expiry,
    hash_session_token,
)
from app.models.session import UserSession
from app.models.user import User


# 1. CREATE LOGIN SESSION

def create_user_session(
    db: Session,
    user_id: int,
    remember_me: bool = False,
) -> tuple[str, datetime]:
    """Create a database-backed login session."""

    token = generate_session_token()
    expires_at = get_session_expiry(remember_me)

    new_session = UserSession(
        user_id=user_id,
        token_hash=hash_session_token(token),
        expires_at=expires_at,
    )

    db.add(new_session)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    return token, expires_at


# 2. VALIDATE LOGIN SESSION

def get_user_from_session(
    db: Session,
    token: str,
) -> User | None:
    """Return the user associated with a valid login session."""

    if not token:
        return None

    token_hash = hash_session_token(token)

    stored_session = db.scalar(
        select(UserSession).where(
            UserSession.token_hash == token_hash
        )
    )

    if stored_session is None:
        return None

    if stored_session.revoked_at is not None:
        return None

    now = datetime.now(timezone.utc)
    expires_at = stored_session.expires_at

    # SQLite may return timezone-naive datetime values.
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at <= now:
        return None

    user = db.get(User, stored_session.user_id)

    if user is None or not user.is_active:
        return None

    return user

# --------------------------------------------------
# 3. REVOKE LOGIN SESSION
# --------------------------------------------------

def revoke_user_session(
    db: Session,
    token: str,
) -> bool:
    """Revoke a login session so it can no longer be used."""

    if not token:
        return False

    token_hash = hash_session_token(token)

    stored_session = db.scalar(
        select(UserSession).where(
            UserSession.token_hash == token_hash
        )
    )

    if stored_session is None:
        return False

    # An already revoked session cannot be revoked again.
    if stored_session.revoked_at is not None:
        return False

    stored_session.revoked_at = datetime.now(timezone.utc)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    return True
