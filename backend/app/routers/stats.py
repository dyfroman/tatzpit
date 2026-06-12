"""Aggregate statistics endpoints for the dashboard."""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..database import Alert, get_db
from ..schemas import (
    HealthStatus,
    SeverityCounts,
    SummaryStats,
    TimelineBucket,
    TopAgent,
    TopRule,
)
from ..state import poller_state

router = APIRouter(prefix="/api/stats", tags=["stats"])


def _since(hours: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(hours=hours)).strftime(
        "%Y-%m-%dT%H:%M:%S.%f"
    )[:-3] + "Z"


@router.get("/summary", response_model=SummaryStats)
def summary(hours: int = Query(24, ge=1, le=720), db: Session = Depends(get_db)):
    since = _since(hours)
    rows = db.execute(
        select(Alert.severity, func.count())
        .where(Alert.timestamp >= since)
        .group_by(Alert.severity)
    ).all()
    counts = SeverityCounts(**{sev: n for sev, n in rows})
    last = db.scalar(select(func.max(Alert.timestamp)))
    return SummaryStats(
        total=sum(n for _, n in rows),
        by_severity=counts,
        last_alert_at=last,
    )


@router.get("/top-rules", response_model=list[TopRule])
def top_rules(
    hours: int = Query(24, ge=1, le=720),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        select(
            Alert.rule_id,
            Alert.rule_description,
            Alert.severity,
            func.count().label("n"),
        )
        .where(Alert.timestamp >= _since(hours))
        .group_by(Alert.rule_id, Alert.rule_description, Alert.severity)
        .order_by(func.count().desc())
        .limit(limit)
    ).all()
    return [
        TopRule(rule_id=r, rule_description=d, severity=s, count=n)
        for r, d, s, n in rows
    ]


@router.get("/top-agents", response_model=list[TopAgent])
def top_agents(
    hours: int = Query(24, ge=1, le=720),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        select(Alert.agent_name, func.count().label("n"))
        .where(Alert.timestamp >= _since(hours))
        .group_by(Alert.agent_name)
        .order_by(func.count().desc())
        .limit(limit)
    ).all()
    return [TopAgent(agent_name=a, count=n) for a, n in rows]


@router.get("/timeline", response_model=list[TimelineBucket])
def timeline(hours: int = Query(24, ge=1, le=168), db: Session = Depends(get_db)):
    """Hourly alert counts per severity, including empty buckets."""
    since = _since(hours)
    # timestamps are ISO-8601 strings, so the hour bucket is a simple prefix
    bucket = func.substr(Alert.timestamp, 1, 13).label("bucket")
    rows = db.execute(
        select(bucket, Alert.severity, func.count())
        .where(Alert.timestamp >= since)
        .group_by(bucket, Alert.severity)
    ).all()

    by_bucket: dict[str, dict[str, int]] = {}
    for b, sev, n in rows:
        by_bucket.setdefault(b, {})[sev] = n

    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    out = []
    for i in range(hours, -1, -1):
        hour = now - timedelta(hours=i)
        key = hour.strftime("%Y-%m-%dT%H")
        counts = by_bucket.get(key, {})
        out.append(TimelineBucket(bucket=key + ":00:00Z", **counts))
    return out


@router.get("/health", response_model=HealthStatus)
def health(db: Session = Depends(get_db)):
    return HealthStatus(
        status="ok",
        mode=get_settings().tatzpit_mode,
        alerts_stored=db.scalar(select(func.count()).select_from(Alert)) or 0,
        last_poll_at=poller_state.last_poll_at,
        last_poll_error=poller_state.last_poll_error,
    )
