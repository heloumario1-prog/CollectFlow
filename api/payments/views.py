import hashlib
import json

from audit.services import log_audit_event
from common.permissions import IsBusinessMember
from common.writes import BusinessWriteLockMixin
from django.db import transaction
from django.utils import timezone
from payments.models import Payment, PaymentRequest
from payments.serializers import PaymentSerializer, VoidPaymentSerializer
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response


class PaymentViewSet(BusinessWriteLockMixin, viewsets.ModelViewSet):
    """
    List, Record, and Void Payments. Strictly tenant-scoped.
    DELETE returns 405 Method Not Allowed.
    """

    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated, IsBusinessMember]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def create(self, request, *args, **kwargs):
        # Optional for existing API consumers; the connected payment form supplies it.
        key = request.headers.get("Idempotency-Key")
        if key is None:
            return super().create(request, *args, **kwargs)
        if not key.strip() or len(key) > 100:
            return Response(
                {"detail": "Use an idempotency key of 1 to 100 characters."}, status=400
            )
        fingerprint = hashlib.sha256(
            json.dumps(request.data, sort_keys=True, separators=(",", ":")).encode()
        ).hexdigest()
        previous = PaymentRequest.objects.filter(
            business=request.user.business, key=key
        ).first()
        if previous:
            if previous.fingerprint != fingerprint:
                return Response(
                    {
                        "detail": "This payment request key was already used with different details."
                    },
                    status=409,
                )
            return Response(previous.response_data, status=201)
        response = super().create(request, *args, **kwargs)
        PaymentRequest.objects.create(
            business=request.user.business,
            key=key,
            fingerprint=fingerprint,
            response_data=response.data,
        )
        return response

    def get_queryset(self):
        qs = Payment.objects.filter(
            payment_promise__receivable__business=self.request.user.business
        ).select_related(
            "payment_promise",
            "payment_promise__receivable",
            "payment_promise__receivable__customer",
            "recorded_by",
            "voided_by",
        )

        promise_id = self.request.query_params.get("payment_promise")
        if promise_id:
            qs = qs.filter(payment_promise_id=promise_id)

        receivable_id = self.request.query_params.get("receivable")
        if receivable_id:
            qs = qs.filter(payment_promise__receivable_id=receivable_id)

        customer_id = self.request.query_params.get("customer")
        if customer_id:
            qs = qs.filter(payment_promise__receivable__customer_id=customer_id)

        method = self.request.query_params.get("method")
        if method:
            qs = qs.filter(method=method)

        is_voided = self.request.query_params.get("is_voided")
        if is_voided is not None and is_voided.lower() in ["true", "1"]:
            qs = qs.filter(voided_at__isnull=False)
        elif is_voided is not None and is_voided.lower() in ["false", "0"]:
            qs = qs.filter(voided_at__isnull=True)

        paid_on_from = self.request.query_params.get("paid_on_from")
        if paid_on_from:
            qs = qs.filter(paid_on__gte=paid_on_from)

        paid_on_to = self.request.query_params.get("paid_on_to")
        if paid_on_to:
            qs = qs.filter(paid_on__lte=paid_on_to)

        return qs.order_by("-paid_on", "-created_at")

    def perform_create(self, serializer):
        with transaction.atomic():
            payment = serializer.save()
            log_audit_event(
                business=self.request.user.business,
                actor_user=self.request.user,
                action="CREATE",
                entity_type="Payment",
                entity_id=payment.id,
                after_data={
                    "promise_id": payment.payment_promise_id,
                    "amount": str(payment.amount),
                    "method": payment.method,
                    "paid_on": payment.paid_on.isoformat(),
                },
                request=self.request,
            )

    @action(detail=True, methods=["post"])
    def void(self, request, pk=None):
        with transaction.atomic():
            payment = get_object_or_404(
                Payment.objects.select_for_update(),
                pk=pk,
                payment_promise__receivable__business=request.user.business,
            )
            if payment.voided_at is not None:
                return Response(
                    {"detail": "This payment has already been voided."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if (
                payment.payment_promise.receivable.archived_at is not None
                or payment.payment_promise.receivable.customer.archived_at is not None
            ):
                return Response(
                    {
                        "detail": "Restore the customer and receivable before voiding this payment."
                    },
                    status=400,
                )

            serializer = VoidPaymentSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            reason = serializer.validated_data["void_reason"]

            before_data = {
                "amount": str(payment.amount),
                "method": payment.method,
                "paid_on": payment.paid_on.isoformat(),
                "voided_at": None,
            }

            payment.voided_at = timezone.now()
            payment.voided_by = request.user
            payment.void_reason = reason
            payment.save(update_fields=["voided_at", "voided_by", "void_reason"])

            log_audit_event(
                business=request.user.business,
                actor_user=request.user,
                action="VOID",
                entity_type="Payment",
                entity_id=payment.id,
                before_data=before_data,
                after_data={
                    "voided_at": payment.voided_at.isoformat(),
                    "void_reason": reason,
                    "voided_by_id": request.user.id,
                },
                request=request,
            )

        return Response(PaymentSerializer(payment).data)

    def destroy(self, request, *args, **kwargs):
        return Response(
            {
                "detail": "Permanent deletion of payments is not permitted. Use void instead."
            },
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )
