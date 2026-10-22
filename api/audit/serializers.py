from rest_framework import serializers
from audit.models import AuditEvent


class AuditEventSerializer(serializers.ModelSerializer):
    actor_email = serializers.CharField(source="actor_user.email", read_only=True, default="System")

    class Meta:
        model = AuditEvent
        fields = [
            "id",
            "actor_email",
            "action",
            "entity_type",
            "entity_id",
            "before_data",
            "after_data",
            "occurred_at",
            "request_id",
        ]
        read_only_fields = fields
