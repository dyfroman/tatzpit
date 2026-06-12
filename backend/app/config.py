"""Application settings, loaded from environment variables / .env file."""
from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Reads repo-root .env (docker compose layout) first, then backend/.env,
    # which takes priority for local development. Missing files are ignored.
    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"), env_file_encoding="utf-8", extra="ignore"
    )

    # demo: load bundled fixture alerts (no Wazuh needed)
    # indexer: poll the Wazuh Indexer (OpenSearch) REST API for alerts
    # ssh: tail /var/ossec/logs/alerts/alerts.json on the manager over SSH
    tatzpit_mode: Literal["demo", "indexer", "ssh"] = "demo"

    db_path: str = "data/tatzpit.db"
    poll_interval_seconds: int = 30

    # --- Wazuh Indexer (OpenSearch) ---
    # The manager API (port 55000) does not serve alerts; they live in the
    # indexer under wazuh-alerts-4.x-*.
    wazuh_indexer_url: str = "https://wazuh.local:9200"
    wazuh_indexer_user: str = "admin"
    wazuh_indexer_password: str = ""
    wazuh_indexer_index: str = "wazuh-alerts-4.x-*"
    wazuh_verify_ssl: bool = False  # self-signed certs are the Wazuh default

    # --- SSH fallback ---
    ssh_host: str = "wazuh.local"
    ssh_port: int = 22
    ssh_user: str = "wazuh-reader"
    ssh_password: str = ""
    ssh_key_path: str = ""  # preferred over password if set
    ssh_alerts_path: str = "/var/ossec/logs/alerts/alerts.json"

    # --- Demo mode ---
    demo_alert_count: int = 200      # events generated from the fixture templates
    demo_live_feed: bool = True      # inject a fresh alert each poll cycle
    demo_seed: int = 7


@lru_cache
def get_settings() -> Settings:
    return Settings()
