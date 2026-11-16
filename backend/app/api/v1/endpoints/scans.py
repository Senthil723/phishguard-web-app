
from datetime import date, datetime, time, timedelta, timezone
from http import HTTPStatus

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.dependencies import require_current_user
from app.core.csrf import validate_request_origin
from app.models.user import User
from app.models.scan import Scan
from app.schemas.scan import (
    ScanAnalyticsRead,
    ScanCreate,
    ScanRead,
    ScanStatsRead,
)
from app.services.url_predictor import predict_url

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


def _summarize_status_counts(rows: list[tuple[str | None, int]]) -> dict:
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

    total_scans = sum(status_counts.values())

    return {
        "total_scans": total_scans,
        "analyzed_scans": analyzed_scans,
        "pending_scans": pending_scans,
        "failed_scans": failed_scans,
        "unknown_scans": (
            total_scans
            - analyzed_scans
            - pending_scans
            - failed_scans
        ),
        "status_counts": status_counts,
    }


# --------------------------------------------------
# CREATE SCAN AND RUN ML PREDICTION
# --------------------------------------------------

@router.post(
    "",
    response_model=ScanRead,
    status_code=status.HTTP_201_CREATED,
)
def create_scan(
    payload: ScanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_current_user),
    _: None = Depends(validate_request_origin),
) -> Scan:
    """
    Analyze submitted URL features using the local ML model
    and save the prediction.

    The submitted URL is never visited or downloaded.
    """

    try:
        prediction_result = predict_url(str(payload.url))

    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The ML model is currently unavailable.",
        )

    scan = Scan(
        user_id=current_user.id,
        url=str(payload.url),
        status="analyzed",
        prediction=prediction_result["prediction"],
        risk_level=prediction_result["risk_level"],
        model_score=prediction_result["model_score"],
        model_version=prediction_result["model_version"],
    )

    try:
        db.add(scan)
        db.commit()
        db.refresh(scan)

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save the scan result.",
        )

    return scan


# --------------------------------------------------
# SCAN HISTORY
# --------------------------------------------------


@router.get("", response_model=list[ScanRead])
def list_scans(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_current_user),
) -> list[Scan]:
    """Return scans belonging to the logged-in user."""

    statement = (
        select(Scan)
        .where(Scan.user_id == current_user.id)
        .order_by(
            Scan.created_at.desc(),
            Scan.id.desc(),
        )
        .limit(limit)
    )

    return list(db.scalars(statement).all())



# --------------------------------------------------
# SCAN STATISTICS
# --------------------------------------------------


@router.get("/stats", response_model=ScanStatsRead)
def get_scan_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_current_user),
) -> ScanStatsRead:
    """Return scan statistics for the logged-in user."""

    statement = (
        select(Scan.status, func.count(Scan.id))
        .where(Scan.user_id == current_user.id)
        .group_by(Scan.status)
    )

    return ScanStatsRead(
        **_summarize_status_counts(
            db.execute(statement).all()
        )
    )



# --------------------------------------------------
# REPORTS AND ANALYTICS
# --------------------------------------------------

@router.get("/analytics", response_model=ScanAnalyticsRead)
def get_scan_analytics(
    from_date: date | None = Query(default=None),
    through_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_current_user),
) -> ScanAnalyticsRead:
    """Return scan statistics and daily counts in UTC."""

    if from_date and through_date and from_date > through_date:
        raise HTTPException(
            status_code=HTTPStatus.UNPROCESSABLE_ENTITY,
            detail="from_date must be on or before through_date",
        )

    filters = [Scan.user_id == current_user.id]

    if from_date:
        start = datetime.combine(
            from_date,
            time.min,
            tzinfo=timezone.utc,
        )
        filters.append(Scan.created_at >= start)

    if through_date:
        if through_date == date.max:
            end_inclusive = datetime.combine(
                through_date,
                time.max,
                tzinfo=timezone.utc,
            )
            filters.append(Scan.created_at <= end_inclusive)

        else:
            end_exclusive = datetime.combine(
                through_date + timedelta(days=1),
                time.min,
                tzinfo=timezone.utc,
            )
            filters.append(Scan.created_at < end_exclusive)

    status_statement = (
        select(Scan.status, func.count(Scan.id))
        .where(*filters)
        .group_by(Scan.status)
    )

    summary = _summarize_status_counts(
        db.execute(status_statement).all()
    )

    day_expression = func.date(Scan.created_at)

    activity_statement = (
        select(day_expression, func.count(Scan.id))
        .where(*filters)
        .group_by(day_expression)
        .order_by(day_expression)
    )

    daily_submissions = [
        {"date": day, "count": count}
        for day, count in db.execute(activity_statement).all()
    ]

    return ScanAnalyticsRead(
        **summary,
        from_date=from_date,
        through_date=through_date,
        timezone="UTC",
        daily_submissions=daily_submissions,
    )


# --------------------------------------------------
# GET INDIVIDUAL SCAN
# --------------------------------------------------


@router.get("/{scan_id}", response_model=ScanRead)
def get_scan(
    scan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_current_user),
) -> Scan:
    """Return a scan only if it belongs to the logged-in user."""

    scan = db.scalar(
        select(Scan).where(
            Scan.id == scan_id,
            Scan.user_id == current_user.id,
        )
    )

    if scan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan not found",
        )

    return scan
