
from fastapi import HTTPException, Request, status

from app.core.config import get_settings


def validate_request_origin(request: Request) -> None:
    """Validate the origin of a browser's state-changing request."""

    origin = request.headers.get("origin")

    settings = get_settings()

    allowed_origins = set(settings.cors_origins)

    # Allow the backend's own origin for Swagger UI.
    backend_origin = f"{request.url.scheme}://{request.url.netloc}"
    allowed_origins.add(backend_origin)

    if origin not in allowed_origins:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Untrusted request origin.",
        )
