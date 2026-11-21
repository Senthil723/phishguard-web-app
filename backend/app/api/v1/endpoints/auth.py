
from datetime import datetime, timedelta, timezone
from secrets import token_urlsafe

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Cookie,
    Depends,
    HTTPException,
    Response,
    status,
)

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.core.csrf import validate_request_origin
from app.core.config import get_settings
from app.core.session_security import hash_session_token
from app.db.session import get_db
from app.models.password_reset import PasswordResetToken
from app.models.session import UserSession
from app.models.user import User
from app.schemas.user import (
    PasswordResetConfirm,
    PasswordResetRequest,
    UserRead,
    UserRegister,
    UserLogin,
)
from app.services.password_reset_email import send_password_reset_email_safely
from app.services.auth_sessions import (
    create_user_session,
    get_user_from_session,
    revoke_user_session,
)

router = APIRouter()


RESET_RESPONSE = {"message": "If that email is registered, a reset link will be sent."}


@router.post("/password-reset/request")
def request_password_reset(
    payload: PasswordResetRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _: None = Depends(validate_request_origin),
) -> dict[str, str]:
    settings = get_settings()
    if not settings.smtp_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Password reset email is not configured on the server.",
        )

    user = db.scalar(select(User).where(User.email == payload.email))
    if user is None or not user.is_active:
        return RESET_RESPONSE

    now = datetime.now(timezone.utc)
    latest = db.scalar(
        select(PasswordResetToken.created_at)
        .where(PasswordResetToken.user_id == user.id)
        .order_by(PasswordResetToken.created_at.desc())
        .limit(1)
    )
    if latest is not None:
        if latest.tzinfo is None:
            latest = latest.replace(tzinfo=timezone.utc)
        if now - latest < timedelta(minutes=5):
            return RESET_RESPONSE

    raw_token = token_urlsafe(32)
    db.execute(
        update(PasswordResetToken)
        .where(PasswordResetToken.user_id == user.id, PasswordResetToken.used_at.is_(None))
        .values(used_at=now)
    )
    db.add(PasswordResetToken(
        user_id=user.id,
        token_hash=hash_session_token(raw_token),
        expires_at=now + timedelta(minutes=30),
    ))
    db.commit()
    background_tasks.add_task(send_password_reset_email_safely, user.email, raw_token, settings)
    return RESET_RESPONSE


@router.post("/password-reset/confirm")
def confirm_password_reset(
    payload: PasswordResetConfirm,
    db: Session = Depends(get_db),
    _: None = Depends(validate_request_origin),
) -> dict[str, str]:
    now = datetime.now(timezone.utc)
    reset = db.scalar(
        select(PasswordResetToken)
        .where(PasswordResetToken.token_hash == hash_session_token(payload.token))
        .with_for_update()
    )
    if reset is None or reset.used_at is not None:
        raise HTTPException(status_code=400, detail="Reset link is invalid or expired.")

    expires_at = reset.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= now:
        raise HTTPException(status_code=400, detail="Reset link is invalid or expired.")

    user = db.get(User, reset.user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=400, detail="Reset link is invalid or expired.")

    user.hashed_password = hash_password(payload.password)
    db.execute(
        update(PasswordResetToken)
        .where(PasswordResetToken.user_id == user.id, PasswordResetToken.used_at.is_(None))
        .values(used_at=now)
    )
    db.execute(
        update(UserSession)
        .where(UserSession.user_id == user.id, UserSession.revoked_at.is_(None))
        .values(revoked_at=now)
    )
    db.commit()
    return {"message": "Password updated. Sign in with your new password."}


# --------------------------------------------------
# 1. USER REGISTRATION
# --------------------------------------------------

@router.post(
    "/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
)
def register_user(
    payload: UserRegister,
    db: Session = Depends(get_db),
    _: None = Depends(validate_request_origin),
):
    # Check whether the username is already registered.
    existing_username = db.scalar(
        select(User).where(User.username == payload.username)
    )

    if existing_username is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username is already registered.",
        )

    # Check whether the email is already registered.
    existing_email = db.scalar(
        select(User).where(User.email == payload.email)
    )

    if existing_email is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered.",
        )

    # Never store the original password.
    new_user = User(
        username=payload.username,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        is_active=True,
    )

    db.add(new_user)

    try:
        db.commit()
        db.refresh(new_user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username or email is already registered.",
        )

    return new_user


# --------------------------------------------------
# 2. USER LOGIN
# --------------------------------------------------

@router.post(
    "/login",
    response_model=UserRead,
)
def login_user(
    payload: UserLogin,
    response: Response,
    db: Session = Depends(get_db),
    _: None = Depends(validate_request_origin),
):
    # Find the registered user.
    user = db.scalar(
        select(User).where(User.username == payload.username)
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )

    # Verify the Argon2 password hash.
    if not verify_password(
        payload.password,
        user.hashed_password,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is disabled.",
        )

    # Create the database-backed login session.
    token, expires_at = create_user_session(
        db=db,
        user_id=user.id,
        remember_me=payload.remember_me,
    )

    # Normal login: browser-session cookie.
    # Remember Me: persistent cookie for 30 days.
    max_age = (
        30 * 24 * 60 * 60
        if payload.remember_me
        else None
    )

    response.set_cookie(
        key="phishguard_session",
        value=token,
        httponly=True,
        secure=get_settings().session_cookie_secure,
        samesite="lax",
        max_age=max_age,
        path="/api/v1",
    )

    # The response contains user details, not the token.
    return user


# --------------------------------------------------
# 3. VERIFY CURRENT LOGIN SESSION
# --------------------------------------------------

@router.get(
    "/me",
    response_model=UserRead,
)
def get_current_user(
    phishguard_session: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
):
    # Reject requests without a session cookie.
    if not phishguard_session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated.",
        )

    # Check the session stored in SQLite.
    user = get_user_from_session(
        db=db,
        token=phishguard_session,
    )

    # Reject invalid, expired or revoked sessions.
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid.",
        )

    # Return account details, never the password.
    return user

# --------------------------------------------------
# 4. USER LOGOUT
# --------------------------------------------------

@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
)
def logout_user(
    response: Response,
    phishguard_session: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
    _: None = Depends(validate_request_origin),
):
    # Invalidate the database session if a cookie exists.
    if phishguard_session:
        revoke_user_session(
            db=db,
            token=phishguard_session,
        )

    # Clear the browser cookie.
    # The path must match the original login cookie path.
    response.delete_cookie(
        key="phishguard_session",
        path="/api/v1",
        httponly=True,
        samesite="lax",
        secure=get_settings().session_cookie_secure,
    )

    return Response(
        status_code=status.HTTP_204_NO_CONTENT,
        headers=response.headers,
    )
