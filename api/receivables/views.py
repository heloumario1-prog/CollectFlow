from decimal import Decimal
from django.db.models import Q, Sum
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from receivables.models import Receivable
from receivables.serializers import ReceivableSerializer
from common.permissions import IsBusinessMember
from audit.services import log_audit_event


class ReceivableViewSet(viewsets.ModelViewSet):
    """
    CRUD + Archive/Restore for Receivables, strictly tenant-scoped.
    DELETE returns 405 Method Not Allowed.
    """
    serializer_class = ReceivableSerializer
    permission_classes = [permissions.IsAuthenticated, IsBusinessMember]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        qs = Receivable.objects.filter(
            business=self.request.user.business
        ).select_related("customer", "created_by")

        is_archived = self.request.query_params.get("is_archived")
        if is_archived is not None and is_archived.lower() in ["true", "1"]:
            qs = qs.filter(archived_at__isnull=False)
        elif is_archived is not None and is_archived.lower() in ["all"]:
            pass
        else:
            qs = qs.filter(archived_at__isnull=True)

        customer_id = self.request.query_params.get("customer")
        if customer_id:
            qs = qs.filter(customer_id=customer_id)

        due_date_from = self.request.query_params.get("due_date_from")
        if due_date_from:
            qs = qs.filter(due_date__gte=due_date_from)

        due_date_to = self.request.query_params.get("due_date_to")
        if due_date_to:
            qs = qs.filter(due_date__lte=due_date_to)

        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(reference__icontains=search)
                | Q(description__icontains=search)
                | Q(customer__name__icontains=search)
            )

        # Status filter
        status_filter = self.request.query_params.get("status")
        if status_filter:
            # We filter in memory or evaluate for derived status
            pass

        return qs.order_by("-created_at")

    def perform_create(self, serializer):
        receivable = serializer.save()
        log_audit_event(
            business=self.request.user.business,
            actor_user=self.request.user,
            action="CREATE",
            entity_type="Receivable",
            entity_id=receivable.id,
            after_data={
                "customer_id": receivable.customer_id,
                "original_amount": str(receivable.original_amount),
                "due_date": receivable.due_date.isoformat(),
                "reference": receivable.reference,
            },
            request=self.request,
        )

    def perform_update(self, serializer):
        rec = self.get_object()
        before_data = {
            "original_amount": str(rec.original_amount),
            "due_date": rec.due_date.isoformat(),
            "reference": rec.reference,
        }
        updated = serializer.save()
        log_audit_event(
            business=self.request.user.business,
            actor_user=self.request.user,
            action="UPDATE",
            entity_type="Receivable",
            entity_id=updated.id,
            before_data=before_data,
            after_data={
                "original_amount": str(updated.original_amount),
                "due_date": updated.due_date.isoformat(),
                "reference": updated.reference,
            },
            request=self.request,
        )

    @action(detail=True, methods=["post"])
    def archive(self, request, pk=None):
        receivable = self.get_object()
        if receivable.archived_at is not None:
            return Response({"detail": "Receivable is already archived."}, status=status.HTTP_400_BAD_REQUEST)

        # Rule: A receivable may be archived only when paid or when it has no promises or payments.
        from payments.models import Payment
        paid = Payment.objects.filter(
            payment_promise__receivable=receivable,
            voided_at__isnull=True,
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0.00")

        remaining = receivable.original_amount - paid
        has_promises = receivable.payment_promises.exists()
        has_payments = Payment.objects.filter(payment_promise__receivable=receivable).exists()

        if remaining > Decimal("0.00") and (has_promises or has_payments):
            return Response(
                {
                    "detail": f"Receivable #{receivable.id} cannot be archived because it has an active balance (${remaining:.2f}) and existing promises/payments."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        receivable.archived_at = timezone.now()
        receivable.archived_by = request.user
        receivable.save(update_fields=["archived_at", "archived_by", "updated_at"])

        log_audit_event(
            business=request.user.business,
            actor_user=request.user,
            action="ARCHIVE",
            entity_type="Receivable",
            entity_id=receivable.id,
            after_data={"archived_at": receivable.archived_at.isoformat()},
            request=request,
        )
        return Response({"detail": f"Receivable #{receivable.id} archived successfully."})

    @action(detail=True, methods=["post"])
    def restore(self, request, pk=None):
        receivable = self.get_object()
        if receivable.archived_at is None:
            return Response({"detail": "Receivable is not archived."}, status=status.HTTP_400_BAD_REQUEST)

        receivable.archived_at = None
        receivable.archived_by = None
        receivable.save(update_fields=["archived_at", "archived_by", "updated_at"])

        log_audit_event(
            business=request.user.business,
            actor_user=request.user,
            action="RESTORE",
            entity_type="Receivable",
            entity_id=receivable.id,
            after_data={"status": "active"},
            request=request,
        )
        return Response({"detail": f"Receivable #{receivable.id} restored successfully."})

    def destroy(self, request, *args, **kwargs):
        return Response(
            {"detail": "Permanent deletion of receivables is not permitted. Use archive instead."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )
