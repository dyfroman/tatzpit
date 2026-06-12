"""Poller for the Wazuh Indexer (OpenSearch).

Note: the Wazuh *manager* API (port 55000) does not expose alerts — they are
shipped by Filebeat to the Wazuh Indexer and stored in `wazuh-alerts-4.x-*`.
This poller queries that index directly with basic auth.
"""
import logging

import httpx
from sqlalchemy import func, select

from ..config import Settings
from ..database import Alert, SessionLocal
from ..ingest import store_alerts

logger = logging.getLogger(__name__)

BATCH_SIZE = 500
MAX_BATCHES_PER_POLL = 10  # cap catch-up work per cycle


class IndexerPoller:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.client = httpx.Client(
            base_url=settings.wazuh_indexer_url,
            auth=(settings.wazuh_indexer_user, settings.wazuh_indexer_password),
            verify=settings.wazuh_verify_ssl,
            timeout=15,
        )
        # Resume from the newest alert we already have; dedupe in store_alerts
        # makes an overlap harmless.
        with SessionLocal() as db:
            self.last_ts: str | None = db.scalar(select(func.max(Alert.timestamp)))

    def _search(self) -> list[dict]:
        query = {
            "size": BATCH_SIZE,
            "sort": [{"timestamp": {"order": "asc"}}],
            "query": {
                "range": {"timestamp": {"gt": self.last_ts or "now-24h"}}
            },
        }
        resp = self.client.post(
            f"/{self.settings.wazuh_indexer_index}/_search", json=query
        )
        resp.raise_for_status()
        hits = resp.json()["hits"]["hits"]
        alerts = []
        for hit in hits:
            src = hit["_source"]
            src.setdefault("id", hit["_id"])
            alerts.append(src)
        return alerts

    def poll_once(self) -> int:
        stored = 0
        for _ in range(MAX_BATCHES_PER_POLL):
            alerts = self._search()
            if not alerts:
                break
            with SessionLocal() as db:
                stored += store_alerts(db, alerts)
            self.last_ts = max(a.get("timestamp", "") for a in alerts)
            if len(alerts) < BATCH_SIZE:
                break
        return stored
