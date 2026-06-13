"""Normalization of raw Wazuh alert JSON into Alert rows.

All three pollers (demo, indexer, ssh) produce alerts in the same shape that
Wazuh writes to alerts.json / the wazuh-alerts-* index, so a single
normalizer handles every source.
"""
import json
import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import Alert
from .severity import severity_from_level

logger = logging.getLogger(__name__)


def _canonical_timestamp(value: str) -> str:
    """Normalize a Wazuh timestamp to ISO-8601 UTC with a uniform 'Z' suffix.

    Sources disagree on the suffix: the indexer emits '...+0000', while demo
    and SSH emit '...Z'. Every time filter (summary/timeline/alerts?since)
    compares timestamps as plain strings, and a mix of '+' and 'Z' suffixes
    breaks lexicographic ordering. Re-emit one canonical form for all sources.
    """
    raw = (value or "").strip()
    if not raw:
        return ""
    try:
        dt = datetime.fromisoformat(raw)
    except ValueError:
        return raw  # leave anything we can't parse untouched
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    dt = dt.astimezone(timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%S.") + f"{dt.microsecond // 1000:03d}Z"


def normalize(raw: dict) -> Alert | None:
    """Convert one raw Wazuh alert dict into an Alert row (or None if malformed)."""
    rule = raw.get("rule") or {}
    if "id" not in raw or "level" not in rule:
        return None

    mitre = rule.get("mitre") or {}
    level = int(rule["level"])
    return Alert(
        wazuh_id=str(raw["id"]),
        timestamp=_canonical_timestamp(str(raw.get("timestamp", ""))),
        agent_id=str((raw.get("agent") or {}).get("id", "")),
        agent_name=str((raw.get("agent") or {}).get("name", "")),
        rule_id=str(rule.get("id", "")),
        rule_description=str(rule.get("description", "")),
        rule_level=level,
        severity=severity_from_level(level),
        rule_groups=",".join(rule.get("groups") or []),
        mitre_ids=",".join(mitre.get("id") or []),
        mitre_tactics=",".join(mitre.get("tactic") or []),
        mitre_techniques=",".join(mitre.get("technique") or []),
        location=str(raw.get("location", "")),
        raw=json.dumps(raw, ensure_ascii=False),
    )


def store_alerts(db: Session, raw_alerts: list[dict]) -> int:
    """Insert alerts, skipping duplicates (by Wazuh alert id). Returns count inserted."""
    rows = [a for a in (normalize(r) for r in raw_alerts) if a is not None]
    if not rows:
        return 0

    existing = set(
        db.scalars(
            select(Alert.wazuh_id).where(Alert.wazuh_id.in_([r.wazuh_id for r in rows]))
        )
    )
    new_rows = [r for r in rows if r.wazuh_id not in existing]
    # Dedupe within the batch itself as well.
    seen: set[str] = set()
    unique_rows = []
    for r in new_rows:
        if r.wazuh_id not in seen:
            seen.add(r.wazuh_id)
            unique_rows.append(r)

    db.add_all(unique_rows)
    db.commit()
    if unique_rows:
        logger.info("Stored %d new alert(s)", len(unique_rows))
    return len(unique_rows)
