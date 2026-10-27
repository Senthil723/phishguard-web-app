from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.db.session import SessionLocal

router = APIRouter()


@router.get("/health")
def health_check() -> dict[str, str]:
    """Check whether the API process is responding."""
    return {"status": "ok", "service": "phishguard-api"}


@router.get("/health/database")
def database_health_check() -> dict[str, str]:
    """Check whether the configured database can answer a simple query."""
    try:
        with SessionLocal() as session:
            session.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=503,
            detail="Database is unavailable. Check DATABASE_URL and database service.",
        ) from exc
