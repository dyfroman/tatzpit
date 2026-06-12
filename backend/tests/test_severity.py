import pytest

from app.severity import CRITICAL, HIGH, LOW, MEDIUM, severity_from_level


@pytest.mark.parametrize(
    ("level", "expected"),
    [
        (0, LOW),
        (1, LOW),
        (3, LOW),
        (4, MEDIUM),
        (5, MEDIUM),
        (6, MEDIUM),
        (7, HIGH),
        (10, HIGH),
        (11, HIGH),
        (12, CRITICAL),
        (15, CRITICAL),
        (16, CRITICAL),
    ],
)
def test_severity_boundaries(level, expected):
    assert severity_from_level(level) == expected
