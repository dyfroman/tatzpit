"""Alert listing and detail endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import Alert, get_db
from ..schemas import AlertDetail, AlertListResponse
from ..severity import SEVERITY_ORDER

router = APIRouter(prefix="/api/alerts", tags=["alerts"])

SORTABLE = {
    "timestamp": Alert.timestamp,
    "rule_level": Alert.rule_level,
    "agent_name": Alert.agent_name,
    "rule_id": Alert.rule_id,
    "severity": Alert.rule_level,  # numeric level sorts more meaningfully
}


@router.get("", response_model=AlertListResponse)
def list_alerts(
    severity: str | None = Query(None, description="Comma-separated: critical,high,medium,low"),
    agent: str | None = Query(None, description="Agent name (exact match)"),
    rule_id: str | None = Query(None),
    since: str | None = Query(None, description="ISO-8601 lower bound (inclusive)"),
    until: str | None = Query(None, description="ISO-8601 upper bound (exclusive)"),
    search: str | None = Query(None, description="Substring match on rule description"),
    sort_by: str = Query("timestamp"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    if sort_by not in SORTABLE:
        raise HTTPException(422, f"sort_by must be one of {sorted(SORTABLE)}")

    filters = []
    if severity:
        wanted = [s.strip().lower() for s in severity.split(",") if s.strip()]
        invalid = [s for s in wanted if s not in SEVERITY_ORDER]
        if invalid:
            raise HTTPException(422, f"Unknown severity value(s): {invalid}")
        filters.append(Alert.severity.in_(wanted))
    if agent:
        filters.append(Alert.agent_name == agent)
    if rule_id:
        filters.append(Alert.rule_id == rule_id)
    if since:
        filters.append(Alert.timestamp >= since)
    if until:
        filters.append(Alert.timestamp < until)
    if search:
        filters.append(Alert.rule_description.ilike(f"%{search}%"))

    total = db.scalar(select(func.count()).select_from(Alert).where(*filters)) or 0

    col = SORTABLE[sort_by]
    stmt = (
        select(Alert)
        .where(*filters)
        .order_by(col.desc() if order == "desc" else col.asc(), Alert.id.desc())
        .limit(limit)
        .offset(offset)
    )
    return AlertListResponse(total=total, items=db.scalars(stmt).all())


@router.get("/{alert_id}", response_model=AlertDetail)
def get_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.get(Alert, alert_id)
    if alert is None:
        raise HTTPException(404, "Alert not found")
    return alert
