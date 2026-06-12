"""Mapping from Wazuh rule levels (0-16) to human-friendly severity buckets."""

CRITICAL = "critical"
HIGH = "high"
MEDIUM = "medium"
LOW = "low"

SEVERITY_ORDER = [CRITICAL, HIGH, MEDIUM, LOW]


def severity_from_level(level: int) -> str:
    """Map a Wazuh rule level to a severity bucket.

    Wazuh levels range 0-16; the official docs treat 12+ as severe events.
    """
    if level >= 12:
        return CRITICAL
    if level >= 7:
        return HIGH
    if level >= 4:
        return MEDIUM
    return LOW
