from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.scan import Scan
from app.schemas.scan import ScanCreate, ScanRead

router = APIRouter()


@router.post("", response_model=ScanRead, status_code=status.HTTP_201_CREATED)
def create_scan(payload: ScanCreate, db: Session = Depends(get_db)) -> Scan:
    """Save a URL submission. This endpoint does not analyze the URL yet."""
    scan = Scan(url=str(payload.url), status="not_analyzed")
    db.add(scan)
    db.commit()
    db.refresh(scan)
    return scan


@router.get("", response_model=list[ScanRead])
def list_scans(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[Scan]:
    """Return the latest saved scan submissions."""
    statement = select(Scan).order_by(Scan.created_at.desc(), Scan.id.desc()).limit(limit)
    return list(db.scalars(statement).all())


@router.get("/{scan_id}", response_model=ScanRead)
def get_scan(scan_id: int, db: Session = Depends(get_db)) -> Scan:
    """Return one saved scan by its numeric ID."""
    scan = db.get(Scan, scan_id)
    if scan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan not found",
        )
    return scan
