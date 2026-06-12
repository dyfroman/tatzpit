import json
from datetime import datetime, timedelta, timezone

from app.ingest import store_alerts

from .conftest import make_raw_alert


def _ts(minutes_ago: int) -> str:
    dt = datetime.now(timezone.utc) - timedelta(minutes=minutes_ago)
    return dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")


def seed(db):
    alerts = [
        make_raw_alert(wazuh_id="1.1", timestamp=_ts(5), agent_name="web-01",
                       rule_id="5712", level=10, description="sshd: brute force"),
        make_raw_alert(wazuh_id="1.2", timestamp=_ts(10), agent_name="web-01",
                       rule_id="5710", level=5, description="sshd: invalid user"),
        make_raw_alert(wazuh_id="1.3", timestamp=_ts(20), agent_name="db-01",
                       rule_id="5715", level=3, description="sshd: auth success"),
        make_raw_alert(wazuh_id="1.4", timestamp=_ts(30), agent_name="db-01",
                       rule_id="100020", level=12, description="possible brute force success",
                       mitre={"id": ["T1110"], "tactic": ["Credential Access"],
                              "technique": ["Brute Force"]}),
        make_raw_alert(wazuh_id="1.5", timestamp=_ts(40), agent_name="app-02",
                       rule_id="5710", level=5, description="sshd: invalid user"),
    ]
    assert store_alerts(db, alerts) == 5


def test_list_alerts_returns_all(client, db):
    seed(db)
    body = client.get("/api/alerts").json()
    assert body["total"] == 5
    assert len(body["items"]) == 5
    # default sort: newest first
    assert body["items"][0]["wazuh_id"] == "1.1"


def test_filter_by_severity(client, db):
    seed(db)
    body = client.get("/api/alerts", params={"severity": "critical"}).json()
    assert body["total"] == 1
    assert body["items"][0]["rule_id"] == "100020"

    body = client.get("/api/alerts", params={"severity": "critical,high"}).json()
    assert body["total"] == 2


def test_invalid_severity_rejected(client, db):
    assert client.get("/api/alerts", params={"severity": "extreme"}).status_code == 422


def test_filter_by_agent_and_rule(client, db):
    seed(db)
    assert client.get("/api/alerts", params={"agent": "db-01"}).json()["total"] == 2
    assert client.get("/api/alerts", params={"rule_id": "5710"}).json()["total"] == 2


def test_filter_by_time_range(client, db):
    seed(db)
    body = client.get("/api/alerts", params={"since": _ts(25)}).json()
    assert body["total"] == 3  # alerts from 5, 10 and 20 minutes ago


def test_sorting(client, db):
    seed(db)
    body = client.get("/api/alerts", params={"sort_by": "rule_level", "order": "asc"}).json()
    levels = [item["rule_level"] for item in body["items"]]
    assert levels == sorted(levels)


def test_pagination(client, db):
    seed(db)
    body = client.get("/api/alerts", params={"limit": 2, "offset": 2}).json()
    assert body["total"] == 5
    assert len(body["items"]) == 2


def test_alert_detail_includes_raw_json(client, db):
    seed(db)
    listing = client.get("/api/alerts", params={"rule_id": "100020"}).json()
    detail = client.get(f"/api/alerts/{listing['items'][0]['id']}").json()
    assert detail["severity"] == "critical"
    assert detail["mitre_tactics"] == "Credential Access"
    assert detail["mitre_ids"] == "T1110"
    raw = json.loads(detail["raw"])
    assert raw["rule"]["level"] == 12


def test_alert_detail_404(client, db):
    assert client.get("/api/alerts/99999").status_code == 404


def test_summary_counts_by_severity(client, db):
    seed(db)
    body = client.get("/api/stats/summary").json()
    assert body["total"] == 5
    assert body["by_severity"] == {"critical": 1, "high": 1, "medium": 2, "low": 1}


def test_top_rules(client, db):
    seed(db)
    rules = client.get("/api/stats/top-rules").json()
    assert rules[0]["rule_id"] == "5710"
    assert rules[0]["count"] == 2


def test_top_agents(client, db):
    seed(db)
    agents = client.get("/api/stats/top-agents").json()
    counts = {a["agent_name"]: a["count"] for a in agents}
    assert counts == {"web-01": 2, "db-01": 2, "app-02": 1}


def test_timeline_includes_empty_buckets(client, db):
    seed(db)
    buckets = client.get("/api/stats/timeline", params={"hours": 24}).json()
    assert len(buckets) == 25  # 24 past hours + current hour
    assert sum(b["medium"] for b in buckets) == 2


def test_duplicate_alerts_are_skipped(client, db):
    seed(db)
    duplicate = make_raw_alert(wazuh_id="1.1", timestamp=_ts(5))
    assert store_alerts(db, [duplicate]) == 0
    assert client.get("/api/alerts").json()["total"] == 5


def test_health(client, db):
    seed(db)
    body = client.get("/api/stats/health").json()
    assert body["status"] == "ok"
    assert body["mode"] == "demo"
    assert body["alerts_stored"] == 5
