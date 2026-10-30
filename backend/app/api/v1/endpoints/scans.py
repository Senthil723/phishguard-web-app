
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.scan import Scan
from app.schemas.scan import ScanCreate, ScanRead, ScanStatsRead

router = APIRouter()

PENDING_STATUSES = {
    "not_analyzed",
    "pending",
    "queued",
    "running",
    "processing",
    "in_progress",
}
ANALYZED_STATUSES = {"analyzed", "analysed", "completed"}
FAILED_STATUSES = {"failed", "error"}


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
    statement = (
        select(Scan)
        .order_by(Scan.created_at.desc(), Scan.id.desc())
        .limit(limit)
    )
    return list(db.scalars(statement).all())


@router.get("/stats")
def get_scan_stats(db: Session = Depends(get_db)) -> ScanStatsRead:
    """Return database-wide scan statistics, without analyzing URLs."""
    total_scans = db.scalar(select(func.count()).select_from(Scan)) or 0

    statement = select(Scan.status, func.count(Scan.id)).group_by(Scan.status)
    rows = db.execute(statement).all()

    status_counts = {}
    pending_scans = 0
    analyzed_scans = 0
    failed_scans = 0

    for scan_status, count in rows:
        status_name = str(scan_status or "unknown")
        status_counts[status_name] = count
        normalized_status = status_name.strip().lower()

        if normalized_status in PENDING_STATUSES:
            pending_scans += count
        elif normalized_status in ANALYZED_STATUSES:
            analyzed_scans += count
        elif normalized_status in FAILED_STATUSES:
            failed_scans += count

    return ScanStatsRead(
        total_scans=total_scans,
        analyzed_scans=analyzed_scans,
        pending_scans=pending_scans,
        failed_scans=failed_scans,
        unknown_scans=total_scans
        - analyzed_scans
        - pending_scans
        - failed_scans,
        status_counts=status_counts,
    )


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
