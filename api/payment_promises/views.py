from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from payment_promises.models import PaymentPromise
from payment_promises.serializers import PaymentPromiseSerializer, CancelPromiseSerializer
from common.permissions import IsBusinessMember
from audit.services import log_audit_event


class PaymentPromiseViewSet(viewsets.ModelViewSet):
    """
    CRUD + Cancel for Payment Promises. Strictly tenant-scoped.
    DELETE returns 405 Method Not Allowed.
    """
    serializer_class = PaymentPromiseSerializer
    permission_classes = [permissions.IsAuthenticated, IsBusinessMember]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        qs = PaymentPromise.objects.filter(
            receivable__business=self.request.user.business
        ).select_related("receivable", "receivable__customer", "created_by")

        receivable_id = self.request.query_params.get("receivable")
        if receivable_id:
            qs = qs.filter(receivable_id=receivable_id)

        customer_id = self.request.query_params.get("customer")
        if customer_id:
            qs = qs.filter(receivable__customer_id=customer_id)

        promised_on_from = self.request.query_params.get("promised_on_from")
        if promised_on_from:
            qs = qs.filter(promised_on__gte=promised_on_from)

        promised_on_to = self.request.query_params.get("promised_on_to")
        if promised_on_to:
            qs = qs.filter(promised_on__lte=promised_on_to)

        status_param = self.request.query_params.get("status")
        if status_param == "CANCELLED":
            qs = qs.filter(cancelled_at__isnull=False)
        elif status_param and status_param != "ALL":
            qs = qs.filter(cancelled_at__isnull=True)

        return qs.order_by("promised_on", "-created_at")

    def perform_create(self, serializer):
        promise = serializer.save()
        log_audit_event(
            business=self.request.user.business,
            actor_user=self.request.user,
            action="CREATE",
            entity_type="PaymentPromise",
            entity_id=promise.id,
            after_data={
                "receivable_id": promise.receivable_id,
                "amount": str(promise.amount),
                "promised_on": promise.promised_on.isoformat(),
            },
            request=self.request,
        )

    def perform_update(self, serializer):
        prom = self.get_object()
        before_data = {"amount": str(prom.amount), "promised_on": prom.promised_on.isoformat(), "note": prom.note}
        updated = serializer.save()
        log_audit_event(
            business=self.request.user.business,
            actor_user=self.request.user,
            action="UPDATE",
            entity_type="PaymentPromise",
            entity_id=updated.id,
            before_data=before_data,
            after_data={"amount": str(updated.amount), "promised_on": updated.promised_on.isoformat(), "note": updated.note},
            request=self.request,
        )

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        with transaction.atomic():
            promise = PaymentPromise.objects.select_for_update().get(
                pk=pk,
                receivable__business=request.user.business,
            )
            if promise.cancelled_at is not None:
                return Response({"detail": "This promise is already cancelled."}, status=status.HTTP_400_BAD_REQUEST)

            serializer = CancelPromiseSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            reason = serializer.validated_data["cancel_reason"]

            promise.cancelled_at = timezone.now()
            promise.cancelled_by = request.user
            promise.cancel_reason = reason
            promise.save(update_fields=["cancelled_at", "cancelled_by", "cancel_reason", "updated_at"])

            log_audit_event(
                business=request.user.business,
                actor_user=request.user,
                action="CANCEL",
                entity_type="PaymentPromise",
                entity_id=promise.id,
                after_data={"cancelled_at": promise.cancelled_at.isoformat(), "cancel_reason": reason},
                request=request,
            )

        return Response({"detail": f"Promise #{promise.id} cancelled successfully."})

    def destroy(self, request, *args, **kwargs):
        return Response(
            {"detail": "Permanent deletion of payment promises is not permitted. Use cancel instead."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )
