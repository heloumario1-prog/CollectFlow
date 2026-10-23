from decimal import Decimal

from audit.services import log_audit_event
from common.financials import receivable_balances
from common.permissions import IsBusinessMember
from common.writes import BusinessWriteLockMixin
from customers.models import Customer
from customers.serializers import CustomerSerializer
from django.db.models import Prefetch, Q
from django.utils import timezone
from receivables.models import Receivable
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response


class CustomerViewSet(BusinessWriteLockMixin, viewsets.ModelViewSet):
    """
    CRUD + Archive/Restore for Customers, strictly scoped to the user's business.
    DELETE returns 405 Method Not Allowed.
    """

    serializer_class = CustomerSerializer
    permission_classes = [permissions.IsAuthenticated, IsBusinessMember]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        qs = Customer.objects.filter(business=self.request.user.business)
        is_archived = self.request.query_params.get("is_archived")
        if is_archived is not None and is_archived.lower() in ["true", "1"]:
            qs = qs.filter(archived_at__isnull=False)
        elif is_archived is not None and is_archived.lower() in ["all"]:
            pass
        else:
            qs = qs.filter(archived_at__isnull=True)

        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(name__icontains=search)
                | Q(phone_e164__icontains=search)
                | Q(email__icontains=search)
                | Q(notes__icontains=search)
            )

        ordering = self.request.query_params.get("ordering", "name")
        if ordering in [
            "name",
            "-name",
            "created_at",
            "-created_at",
            "next_follow_up_on",
            "-next_follow_up_on",
        ]:
            qs = qs.order_by(ordering, "id")
        else:
            qs = qs.order_by("name", "id")

        return qs.prefetch_related(
            Prefetch(
                "receivables",
                queryset=receivable_balances(
                    Receivable.objects.filter(archived_at__isnull=True)
                ),
                to_attr="_active_receivables",
            )
        )

    def perform_create(self, serializer):
        customer = serializer.save()
        log_audit_event(
            business=self.request.user.business,
            actor_user=self.request.user,
            action="CREATE",
            entity_type="Customer",
            entity_id=customer.id,
            after_data={"name": customer.name, "phone_e164": customer.phone_e164},
            request=self.request,
        )

    def perform_update(self, serializer):
        customer = self.get_object()
        before_data = {
            "name": customer.name,
            "phone_e164": customer.phone_e164,
            "notes": customer.notes,
        }
        updated = serializer.save()
        log_audit_event(
            business=self.request.user.business,
            actor_user=self.request.user,
            action="UPDATE",
            entity_type="Customer",
            entity_id=updated.id,
            before_data=before_data,
            after_data={
                "name": updated.name,
                "phone_e164": updated.phone_e164,
                "notes": updated.notes,
            },
            request=self.request,
        )

    @action(detail=True, methods=["post"])
    def archive(self, request, pk=None):
        customer = self.get_object()
        if customer.archived_at is not None:
            return Response(
                {"detail": "Customer is already archived."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check outstanding receivables
        # Per spec: A customer cannot be archived while they have an outstanding receivable.
        for receivable in receivable_balances(
            customer.receivables.filter(archived_at__isnull=True)
        ):
            paid = receivable._paid_total
            remaining = receivable.original_amount - paid
            if remaining > Decimal("0.00"):
                return Response(
                    {
                        "detail": f"Cannot archive customer '{customer.name}' because receivable #{receivable.id} has an outstanding balance of ${remaining:.2f}."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        customer.archived_at = timezone.now()
        customer.archived_by = request.user
        customer.save(update_fields=["archived_at", "archived_by", "updated_at"])

        log_audit_event(
            business=request.user.business,
            actor_user=request.user,
            action="ARCHIVE",
            entity_type="Customer",
            entity_id=customer.id,
            after_data={"archived_at": customer.archived_at.isoformat()},
            request=request,
        )
        return Response(
            {"detail": f"Customer '{customer.name}' archived successfully."}
        )

    @action(detail=True, methods=["post"])
    def restore(self, request, pk=None):
        customer = self.get_object()
        if customer.archived_at is None:
            return Response(
                {"detail": "Customer is not archived."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        customer.archived_at = None
        customer.archived_by = None
        customer.save(update_fields=["archived_at", "archived_by", "updated_at"])

        log_audit_event(
            business=request.user.business,
            actor_user=request.user,
            action="RESTORE",
            entity_type="Customer",
            entity_id=customer.id,
            after_data={"status": "active"},
            request=request,
        )
        return Response(
            {"detail": f"Customer '{customer.name}' restored successfully."}
        )

    def destroy(self, request, *args, **kwargs):
        return Response(
            {
                "detail": "Permanent deletion of customers is not permitted. Use archive instead."
            },
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )
