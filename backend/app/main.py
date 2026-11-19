from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from starlette.concurrency import run_in_threadpool

from app.api.v1.api import api_router
from app.core.config import get_settings
from app.db.base import Base
from app.db.migrations import migrate_scan_columns
from app.db.session import engine

# Import models so SQLAlchemy knows which tables to create.
from app.models import scan  # noqa: F401
from app.models import user
from app.models import session


def initialize_database() -> None:
    Base.metadata.create_all(bind=engine)
    migrate_scan_columns(engine)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    await run_in_threadpool(initialize_database)
    yield
    engine.dispose()


settings = get_settings()

app = FastAPI(
    title="PhishGuard API",
    description=(
        "Authenticated URL submissions, experimental ML assessments, "
        "scan history, and reporting."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/", tags=["root"])
def root() -> dict[str, str]:
    return {"name": "PhishGuard API", "docs": "/docs", "status": "running"}
