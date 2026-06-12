"""Fallback poller: read recent lines of alerts.json on the manager over SSH.

Each poll runs `tail -n N` on /var/ossec/logs/alerts/alerts.json and parses
the JSON lines; duplicate alerts are dropped by their Wazuh id, so the
overlap between polls is harmless. If more than N alerts arrive between two
polls the oldest are missed — acceptable for a homelab, documented in the
README.
"""
import json
import logging

import paramiko

from ..config import Settings
from ..database import SessionLocal
from ..ingest import store_alerts

logger = logging.getLogger(__name__)

TAIL_LINES = 500


class SshTailPoller:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.client: paramiko.SSHClient | None = None

    def _connect(self) -> paramiko.SSHClient:
        client = paramiko.SSHClient()
        client.load_system_host_keys()
        # Homelab convenience; pin host keys in known_hosts for anything serious.
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        kwargs = {
            "hostname": self.settings.ssh_host,
            "port": self.settings.ssh_port,
            "username": self.settings.ssh_user,
            "timeout": 10,
        }
        if self.settings.ssh_key_path:
            kwargs["key_filename"] = self.settings.ssh_key_path
        else:
            kwargs["password"] = self.settings.ssh_password
        client.connect(**kwargs)
        return client

    def _ensure_connected(self) -> paramiko.SSHClient:
        if self.client is not None:
            transport = self.client.get_transport()
            if transport is not None and transport.is_active():
                return self.client
        self.client = self._connect()
        logger.info("SSH connected to %s", self.settings.ssh_host)
        return self.client

    def poll_once(self) -> int:
        client = self._ensure_connected()
        # shlex.quote is POSIX-only quoting, which matches the remote side.
        from shlex import quote

        cmd = f"tail -n {TAIL_LINES} {quote(self.settings.ssh_alerts_path)}"
        try:
            _, stdout, stderr = client.exec_command(cmd, timeout=20)
            lines = stdout.read().decode("utf-8", errors="replace").splitlines()
            err = stderr.read().decode("utf-8", errors="replace").strip()
        except Exception:
            self.client = None  # force reconnect on next poll
            raise
        if err:
            raise RuntimeError(f"remote tail failed: {err}")

        alerts = []
        for line in lines:
            line = line.strip()
            if not line:
                continue
            try:
                alerts.append(json.loads(line))
            except json.JSONDecodeError:
                logger.debug("Skipping malformed line (%d bytes)", len(line))
        with SessionLocal() as db:
            return store_alerts(db, alerts)
