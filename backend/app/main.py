"""Tatzpit backend — FastAPI app with a background alert poller."""
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import init_db
from .pollers import make_poller
from .routers import alerts, stats
from .state import poller_state

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("tatzpit")


async def _poll_loop() -> None:
    settings = get_settings()
    poller = make_poller(settings)
    logger.info("Poller started in '%s' mode (every %ss)", settings.tatzpit_mode, settings.poll_interval_seconds)
    while True:
        try:
            # Pollers do blocking I/O (DB, HTTP, SSH); keep the event loop free.
            await asyncio.to_thread(poller.poll_once)
            poller_state.mark_success()
        except Exception as exc:  # noqa: BLE001 - poller must survive transient failures
            poller_state.mark_error(exc)
            logger.exception("Poll cycle failed")
        await asyncio.sleep(settings.poll_interval_seconds)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    task = asyncio.create_task(_poll_loop())
    yield
    task.cancel()


app = FastAPI(
    title="Tatzpit",
    description="Personal mini-SIEM dashboard for Wazuh alerts. "
    "Tatzpit (תצפית) is Hebrew for 'observation post'.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(alerts.router)
app.include_router(stats.router)
