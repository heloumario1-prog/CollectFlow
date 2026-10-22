from rest_framework import generics, permissions
from audit.models import AuditEvent
from audit.serializers import AuditEventSerializer
from common.permissions import IsOwnerOnly


class AuditEventListView(generics.ListAPIView):
    """
    Owner-only chronological view of audit events for the business.
    """
    serializer_class = AuditEventSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOnly]

    def get_queryset(self):
        qs = AuditEvent.objects.filter(business=self.request.user.business).select_related("actor_user")
        entity_type = self.request.query_params.get("entity_type")
        if entity_type:
            qs = qs.filter(entity_type__iexact=entity_type)
        action_param = self.request.query_params.get("action")
        if action_param:
            qs = qs.filter(action__iexact=action_param)
        return qs.order_by("-occurred_at")
