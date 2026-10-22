from rest_framework import viewsets, permissions, status
from rest_framework.response import Response

from followups.models import FollowUp
from followups.serializers import FollowUpSerializer
from common.permissions import IsBusinessMember
from audit.services import log_audit_event


class FollowUpViewSet(viewsets.ModelViewSet):
    """
    CRUD for manual WhatsApp Follow-up notes. Tenant-scoped.
    DELETE returns 405 Method Not Allowed.
    """
    serializer_class = FollowUpSerializer
    permission_classes = [permissions.IsAuthenticated, IsBusinessMember]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        qs = FollowUp.objects.filter(
            customer__business=self.request.user.business
        ).select_related("customer", "receivable", "payment_promise", "created_by")

        customer_id = self.request.query_params.get("customer")
        if customer_id:
            qs = qs.filter(customer_id=customer_id)

        receivable_id = self.request.query_params.get("receivable")
        if receivable_id:
            qs = qs.filter(receivable_id=receivable_id)

        promise_id = self.request.query_params.get("payment_promise")
        if promise_id:
            qs = qs.filter(payment_promise_id=promise_id)

        return qs.order_by("-occurred_at", "-created_at")

    def perform_update(self, serializer):
        followup = self.get_object()
        before_data = {"note": followup.note}
        updated = serializer.save()
        log_audit_event(
            business=self.request.user.business,
            actor_user=self.request.user,
            action="UPDATE",
            entity_type="FollowUp",
            entity_id=updated.id,
            before_data=before_data,
            after_data={"note": updated.note},
            request=self.request,
        )

    def destroy(self, request, *args, **kwargs):
        return Response(
            {"detail": "Permanent deletion of follow-up history is not permitted."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )
