"""Demo poller: seeds the database from a fixture of realistic Wazuh alerts.

On the first poll it generates `demo_alert_count` events spread over the last
24 hours (so charts have data immediately). On every subsequent poll it
injects one fresh alert, which makes the dashboard's auto-refresh visibly
update during a live demo.
"""
import copy
import json
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import func, select

from ..config import Settings
from ..database import Alert, SessionLocal
from ..ingest import store_alerts

FIXTURE_PATH = Path(__file__).resolve().parents[2] / "fixtures" / "sample_alerts.json"


def _iso(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%S.") + f"{dt.microsecond // 1000:03d}Z"


class DemoPoller:
    def __init__(self, settings: Settings, fixture_path: Path = FIXTURE_PATH):
        self.settings = settings
        self.templates: list[dict] = json.loads(fixture_path.read_text(encoding="utf-8"))
        self.weights = [t.get("_weight", 1) for t in self.templates]
        self.rng = random.Random(settings.demo_seed)
        self.seeded = False
        self._counter = self.rng.randint(100000, 999999)

    def _instantiate(self, template: dict, ts: datetime) -> dict:
        alert = copy.deepcopy(template)
        alert.pop("_weight", None)
        self._counter += 1
        alert["timestamp"] = _iso(ts)
        alert["id"] = f"{int(ts.timestamp())}.{self._counter}"
        alert["manager"] = {"name": "wazuh-manager"}
        return alert

    def poll_once(self) -> int:
        with SessionLocal() as db:
            if not self.seeded:
                self.seeded = True
                if (db.scalar(select(func.count()).select_from(Alert)) or 0) == 0:
                    return store_alerts(db, self._seed_batch())
            if not self.settings.demo_live_feed:
                return 0
            template = self.rng.choices(self.templates, weights=self.weights)[0]
            alert = self._instantiate(template, datetime.now(timezone.utc))
            return store_alerts(db, [alert])

    def _seed_batch(self) -> list[dict]:
        now = datetime.now(timezone.utc)
        alerts = []
        for _ in range(self.settings.demo_alert_count):
            template = self.rng.choices(self.templates, weights=self.weights)[0]
            ts = now - timedelta(seconds=self.rng.uniform(0, 24 * 3600))
            alerts.append(self._instantiate(template, ts))
        return alerts
