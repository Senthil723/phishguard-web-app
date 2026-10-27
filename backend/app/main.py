from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from starlette.concurrency import run_in_threadpool

from app.api.v1.api import api_router
from app.core.config import get_settings
from app.db.base import Base
from app.db.session import engine

# Import models so SQLAlchemy knows which tables to create.
from app.models import scan  # noqa: F401


def initialize_database() -> None:
    Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    await run_in_threadpool(initialize_database)
    yield
    engine.dispose()


settings = get_settings()

app = FastAPI(
    title="PhishGuard API",
    description=(
        "Backend foundation for URL submission and scan history. "
        "Phishing detection is not implemented yet; saved scans are marked not_analyzed."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/", tags=["root"])
def root() -> dict[str, str]:
    return {"name": "PhishGuard API", "docs": "/docs", "status": "running"}
