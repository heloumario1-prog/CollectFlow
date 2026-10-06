from django.conf import settings
from django.db import models
from django.utils import timezone


class AuditEvent(models.Model):
    class Action(models.TextChoices):
        CREATE = "CREATE", "Create"
        UPDATE = "UPDATE", "Update"
        ARCHIVE = "ARCHIVE", "Archive"
        RESTORE = "RESTORE", "Restore"
        CANCEL = "CANCEL", "Cancel"
        VOID = "VOID", "Void"
        DEACTIVATE = "DEACTIVATE", "Deactivate"

    id = models.BigAutoField(primary_key=True)
    business = models.ForeignKey(
        "businesses.Business",
        on_delete=models.PROTECT,
        related_name="audit_events",
    )
    actor_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="audit_events",
        null=True,
        blank=True,
    )
    action = models.CharField(max_length=20, choices=Action.choices)
    entity_type = models.CharField(max_length=40)
    entity_id = models.BigIntegerField()
    before_data = models.JSONField(null=True, blank=True)
    after_data = models.JSONField(null=True, blank=True)
    occurred_at = models.DateTimeField(default=timezone.now)
    request_id = models.UUIDField(null=True, blank=True)

    class Meta:
        db_table = "audit_events"
        indexes = [
            models.Index(fields=["business", "-occurred_at"], name="idx_audit_biz_occurred_desc"),
            models.Index(fields=["entity_type", "entity_id"], name="idx_audit_entity"),
        ]
        ordering = ["-occurred_at"]

    def __str__(self):
        actor = self.actor_user.email if self.actor_user else "System"
        return f"[{self.action}] {self.entity_type} #{self.entity_id} by {actor}"
