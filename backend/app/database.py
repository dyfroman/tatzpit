"""SQLite storage via SQLAlchemy 2.0."""
import os

from sqlalchemy import Index, Integer, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

from .config import get_settings


class Base(DeclarativeBase):
    pass


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    # Wazuh's own alert id ("<epoch>.<counter>"); used to dedupe across polls.
    wazuh_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    # ISO-8601 UTC ("2026-06-12T13:05:22.123Z"); lexicographic order == time order.
    timestamp: Mapped[str] = mapped_column(String(40), index=True)
    agent_id: Mapped[str] = mapped_column(String(16), default="")
    agent_name: Mapped[str] = mapped_column(String(128), index=True, default="")
    rule_id: Mapped[str] = mapped_column(String(16), index=True)
    rule_description: Mapped[str] = mapped_column(Text, default="")
    rule_level: Mapped[int] = mapped_column(Integer)
    severity: Mapped[str] = mapped_column(String(16), index=True)
    rule_groups: Mapped[str] = mapped_column(Text, default="")       # comma-joined
    mitre_ids: Mapped[str] = mapped_column(Text, default="")         # comma-joined
    mitre_tactics: Mapped[str] = mapped_column(Text, default="")     # comma-joined
    mitre_techniques: Mapped[str] = mapped_column(Text, default="")  # comma-joined
    location: Mapped[str] = mapped_column(String(256), default="")
    raw: Mapped[str] = mapped_column(Text)  # full original alert JSON

    __table_args__ = (
        Index("ix_alerts_severity_timestamp", "severity", "timestamp"),
    )


def make_engine(db_path: str | None = None):
    path = db_path or get_settings().db_path
    if path != ":memory:":
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    return create_engine(
        f"sqlite:///{path}",
        connect_args={"check_same_thread": False},
    )


engine = make_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def init_db(target_engine=None) -> None:
    Base.metadata.create_all(target_engine or engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
