"""Test configuration. Environment must be set before any app import."""
import os
import tempfile

_tmpdir = tempfile.mkdtemp(prefix="tatzpit-test-")
os.environ["DB_PATH"] = os.path.join(_tmpdir, "test.db")
os.environ["TATZPIT_MODE"] = "demo"
os.environ["DEMO_LIVE_FEED"] = "false"

import pytest
from fastapi.testclient import TestClient

from app.database import Base, SessionLocal, engine
from app.main import app


@pytest.fixture(autouse=True)
def clean_db():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield


@pytest.fixture
def db():
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture
def client():
    # No `with` block: lifespan (and thus the background poller) stays off,
    # so tests fully control the database contents.
    return TestClient(app)


def make_raw_alert(
    wazuh_id="1781200000.1001",
    timestamp="2026-06-12T12:00:00.000Z",
    agent_name="web-01",
    agent_id="001",
    rule_id="5710",
    level=5,
    description="sshd: Attempt to login using a non-existent user",
    mitre=None,
):
    rule = {
        "id": rule_id,
        "level": level,
        "description": description,
        "groups": ["syslog", "sshd"],
    }
    if mitre is not None:
        rule["mitre"] = mitre
    return {
        "id": wazuh_id,
        "timestamp": timestamp,
        "agent": {"id": agent_id, "name": agent_name},
        "rule": rule,
        "location": "/var/log/auth.log",
        "data": {"srcip": "203.0.113.7"},
    }
