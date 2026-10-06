from decimal import Decimal
from django.db.models import Sum
from rest_framework import serializers

from receivables.models import Receivable
from customers.models import Customer
from common.timezone_utils import get_beirut_today


class CustomerBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ["id", "name", "phone_e164", "email"]


class ReceivableSerializer(serializers.ModelSerializer):
    customer_detail = CustomerBriefSerializer(source="customer", read_only=True)
    customer = serializers.PrimaryKeyRelatedField(queryset=Customer.objects.all(), write_only=True)
    paid_amount = serializers.SerializerMethodField()
    remaining_amount = serializers.SerializerMethodField()
    unpromised_amount = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = Receivable
        fields = [
            "id",
            "customer",
            "customer_detail",
            "original_amount",
            "currency",
            "reference",
            "description",
            "issue_date",
            "due_date",
            "status",
            "paid_amount",
            "remaining_amount",
            "unpromised_amount",
            "archived_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "currency",
            "status",
            "paid_amount",
            "remaining_amount",
            "unpromised_amount",
            "archived_at",
            "created_at",
            "updated_at",
        ]

    def _get_financials(self, obj):
        if hasattr(obj, "_cached_fin"):
            return obj._cached_fin

        from payments.models import Payment
        paid = Payment.objects.filter(
            payment_promise__receivable=obj,
            voided_at__isnull=True,
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0.00")

        remaining = max(Decimal("0.00"), obj.original_amount - paid)

        # Promises active remaining
        from payment_promises.models import PaymentPromise
        active_promises = obj.payment_promises.filter(cancelled_at__isnull=True)
        active_promised_remaining = Decimal("0.00")
        for p in active_promises:
            p_paid = Payment.objects.filter(payment_promise=p, voided_at__isnull=True).aggregate(
                total=Sum("amount")
            )["total"] or Decimal("0.00")
            p_rem = max(Decimal("0.00"), p.amount - p_paid)
            active_promised_remaining += p_rem

        unpromised = max(Decimal("0.00"), remaining - active_promised_remaining)

        # Derived status
        beirut_today = get_beirut_today()
        if remaining == Decimal("0.00"):
            derived_status = Receivable.Status.PAID
        elif obj.due_date < beirut_today:
            derived_status = Receivable.Status.OVERDUE
        elif paid > Decimal("0.00"):
            derived_status = Receivable.Status.PARTIALLY_PAID
        else:
            derived_status = Receivable.Status.OPEN

        data = {
            "paid": f"{paid:.2f}",
            "remaining": f"{remaining:.2f}",
            "unpromised": f"{unpromised:.2f}",
            "status": derived_status,
        }
        obj._cached_fin = data
        return data

    def get_paid_amount(self, obj) -> str:
        return self._get_financials(obj)["paid"]

    def get_remaining_amount(self, obj) -> str:
        return self._get_financials(obj)["remaining"]

    def get_unpromised_amount(self, obj) -> str:
        return self._get_financials(obj)["unpromised"]

    def get_status(self, obj) -> str:
        return self._get_financials(obj)["status"]

    def validate(self, attrs):
        request = self.context["request"]
        customer = attrs.get("customer") or getattr(self.instance, "customer", None)
        if customer and customer.business_id != request.user.business_id:
            raise serializers.ValidationError({"customer": "Customer does not belong to your business."})
        if customer and customer.archived_at is not None:
            raise serializers.ValidationError({"customer": "Cannot create or edit receivable for an archived customer."})

        issue_date = attrs.get("issue_date") or getattr(self.instance, "issue_date", None)
        due_date = attrs.get("due_date") or getattr(self.instance, "due_date", None)
        if issue_date and due_date and due_date < issue_date:
            raise serializers.ValidationError({"due_date": "Due date cannot be before issue date."})

        original_amount = attrs.get("original_amount")
        if original_amount is not None and original_amount <= Decimal("0.00"):
            raise serializers.ValidationError({"original_amount": "Original amount must be greater than zero."})

        # Reference uniqueness per business
        reference = attrs.get("reference")
        if reference:
            qs = Receivable.objects.filter(business=request.user.business, reference=reference)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {"reference": f"Reference '{reference}' is already used in your business."}
                )

        # On update: original_amount cannot be reduced below paid amount or active promises sum
        if self.instance and original_amount is not None:
            fin = self._get_financials(self.instance)
            paid = Decimal(fin["paid"])
            if original_amount < paid:
                raise serializers.ValidationError(
                    {"original_amount": f"Cannot reduce receivable below total paid amount (${paid:.2f})."}
                )

        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        validated_data["business"] = request.user.business
        validated_data["created_by"] = request.user
        validated_data["currency"] = "USD"
        return super().create(validated_data)
