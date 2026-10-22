import uuid
from decimal import Decimal
from django.utils import timezone
from .models import AuditEvent


def _sanitize_for_json(data):
    """Recursively clean data for JSON serialization and remove sensitive keys."""
    if not isinstance(data, dict):
        return data

    sensitive_keys = {"password", "password_hash", "token", "secret", "authorization"}
    cleaned = {}
    for key, val in data.items():
        if key.lower() in sensitive_keys:
            continue
        if isinstance(val, Decimal):
            cleaned[key] = str(val)
        elif isinstance(val, (dict, list)):
            cleaned[key] = _sanitize_for_json(val)
        elif hasattr(val, "isoformat"):
            cleaned[key] = val.isoformat()
        else:
            cleaned[key] = val
    return cleaned


def log_audit_event(
    *,
    business,
    actor_user=None,
    action: str,
    entity_type: str,
    entity_id: int,
    before_data=None,
    after_data=None,
    request=None,
):
    """
    Records an AuditEvent inside the current database transaction.
    """
    request_id = None
    if request is not None and hasattr(request, "request_id"):
        request_id = request.request_id

    return AuditEvent.objects.create(
        business=business,
        actor_user=actor_user,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        before_data=_sanitize_for_json(before_data) if before_data else None,
        after_data=_sanitize_for_json(after_data) if after_data else None,
        occurred_at=timezone.now(),
        request_id=request_id,
    )
