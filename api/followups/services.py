from audit.services import log_audit_event
from django.db import transaction
from django.utils import timezone
from followups.models import FollowUp
from rest_framework.generics import get_object_or_404


@transaction.atomic
def change_lifecycle(*, followup_id, actor, archive=False, request=None):
    followup = get_object_or_404(
        FollowUp.objects.select_for_update().filter(
            customer__business=actor.business,
            archived_at__isnull=True,
        ),
        pk=followup_id,
    )
    if archive:
        followup.archived_at = timezone.now()
        followup.archived_by = actor
        fields = ["archived_at", "archived_by", "updated_at"]
        action = "ARCHIVE"
        after = {"archived_at": followup.archived_at.isoformat()}
    elif followup.completed_at is None:
        followup.completed_at = timezone.now()
        followup.completed_by = actor
        fields = ["completed_at", "completed_by", "updated_at"]
        action = "UPDATE"
        after = {"completed_at": followup.completed_at.isoformat()}
    else:
        return followup
    followup.save(update_fields=fields)
    log_audit_event(
        business=actor.business,
        actor_user=actor,
        action=action,
        entity_type="FollowUp",
        entity_id=followup.id,
        after_data=after,
        request=request,
    )
    return followup
