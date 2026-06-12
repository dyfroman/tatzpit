"""Pydantic response models."""
from pydantic import BaseModel


class AlertSummary(BaseModel):
    id: int
    wazuh_id: str
    timestamp: str
    agent_name: str
    rule_id: str
    rule_description: str
    rule_level: int
    severity: str
    mitre_tactics: str
    mitre_ids: str

    model_config = {"from_attributes": True}


class AlertDetail(AlertSummary):
    agent_id: str
    rule_groups: str
    mitre_techniques: str
    location: str
    raw: str


class AlertListResponse(BaseModel):
    total: int
    items: list[AlertSummary]


class SeverityCounts(BaseModel):
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0


class SummaryStats(BaseModel):
    total: int
    by_severity: SeverityCounts
    last_alert_at: str | None


class TopRule(BaseModel):
    rule_id: str
    rule_description: str
    severity: str
    count: int


class TopAgent(BaseModel):
    agent_name: str
    count: int


class TimelineBucket(BaseModel):
    bucket: str  # ISO hour, e.g. "2026-06-12T13:00:00Z"
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0


class HealthStatus(BaseModel):
    status: str
    mode: str
    alerts_stored: int
    last_poll_at: str | None
    last_poll_error: str | None
