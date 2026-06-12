"""Shared runtime state for poller health reporting."""
from datetime import datetime, timezone


class PollerState:
    def __init__(self) -> None:
        self.last_poll_at: str | None = None
        self.last_poll_error: str | None = None

    def mark_success(self) -> None:
        self.last_poll_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        self.last_poll_error = None

    def mark_error(self, error: Exception) -> None:
        self.last_poll_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        self.last_poll_error = f"{type(error).__name__}: {error}"


poller_state = PollerState()
