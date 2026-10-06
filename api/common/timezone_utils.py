from datetime import date, datetime
from zoneinfo import ZoneInfo
from django.utils import timezone

BEIRUT_TZ = ZoneInfo("Asia/Beirut")


def get_beirut_today() -> date:
    """Return the current calendar date in Asia/Beirut timezone."""
    return timezone.localdate(timezone=BEIRUT_TZ)


def get_beirut_now() -> datetime:
    """Return the current datetime in Asia/Beirut timezone."""
    return timezone.now().astimezone(BEIRUT_TZ)
