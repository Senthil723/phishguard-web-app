
from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.services.auth_sessions import get_user_from_session


def require_current_user(
    phishguard_session: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
) -> User:
    """Require a valid authenticated user session."""

    if not phishguard_session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    user = get_user_from_session(
        db=db,
        token=phishguard_session,
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid.",
        )

    return user
