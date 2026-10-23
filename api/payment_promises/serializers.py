from decimal import Decimal

from common.timezone_utils import get_beirut_today
from django.db import transaction
from django.db.models import Sum
from payment_promises.models import PaymentPromise
from receivables.models import Receivable
from rest_framework import serializers


class PaymentPromiseSerializer(serializers.ModelSerializer):
    receivable = serializers.PrimaryKeyRelatedField(queryset=Receivable.objects.all())
    customer_id = serializers.IntegerField(
        source="receivable.customer.id", read_only=True
    )
    customer_name = serializers.CharField(
        source="receivable.customer.name", read_only=True
    )
    receivable_archived_at = serializers.DateTimeField(
        source="receivable.archived_at", read_only=True
    )
    customer_archived_at = serializers.DateTimeField(
        source="receivable.customer.archived_at", read_only=True
    )
    paid_amount = serializers.SerializerMethodField()
    remaining_amount = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = PaymentPromise
        fields = [
            "id",
            "receivable",
            "customer_id",
            "customer_name",
            "receivable_archived_at",
            "customer_archived_at",
            "amount",
            "promised_on",
            "note",
            "status",
            "paid_amount",
            "remaining_amount",
            "cancelled_at",
            "cancel_reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "status",
            "paid_amount",
            "remaining_amount",
            "cancelled_at",
            "cancel_reason",
            "created_at",
            "updated_at",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            self.fields["receivable"].queryset = self.fields[
                "receivable"
            ].queryset.filter(business=request.user.business)

    def _get_financials(self, obj):
        if hasattr(obj, "_cached_fin"):
            return obj._cached_fin

        if not hasattr(obj, "_paid_total"):
            from common.financials import promise_balances

            obj = promise_balances(PaymentPromise.objects.all()).get(pk=obj.pk)
        paid = obj._paid_total

        remaining = max(Decimal("0.00"), obj.amount - paid)
        status_val = obj.status_for(remaining, today=get_beirut_today())

        data = {
            "paid": f"{paid:.2f}",
            "remaining": f"{remaining:.2f}",
            "status": status_val,
        }
        obj._cached_fin = data
        return data

    def get_paid_amount(self, obj) -> str:
        return self._get_financials(obj)["paid"]

    def get_remaining_amount(self, obj) -> str:
        return self._get_financials(obj)["remaining"]

    def get_status(self, obj) -> str:
        return self._get_financials(obj)["status"]

    def validate(self, attrs):
        request = self.context["request"]
        receivable = attrs.get("receivable") or getattr(
            self.instance, "receivable", None
        )
        amount = attrs.get("amount")

        if receivable.business_id != request.user.business_id:
            raise serializers.ValidationError(
                {"receivable": "Receivable does not belong to your business."}
            )

        if receivable.archived_at is not None:
            raise serializers.ValidationError(
                {
                    "receivable": "Cannot create or edit promises on an archived receivable."
                }
            )

        if receivable.customer.archived_at is not None:
            raise serializers.ValidationError(
                {"receivable": "Restore the customer before recording activity."}
            )

        if (
            self.instance
            and receivable.pk != self.instance.receivable_id
            and self.instance.payments.exists()
        ):
            raise serializers.ValidationError(
                {
                    "receivable": "A promise with payment history cannot be moved to another receivable."
                }
            )

        if self.instance and self.instance.cancelled_at is not None:
            raise serializers.ValidationError(
                {"detail": "Cancelled promises are immutable and cannot be edited."}
            )

        if amount is not None and amount <= Decimal("0.00"):
            raise serializers.ValidationError(
                {"amount": "Promise amount must be greater than zero."}
            )

        # Lock receivable and check unpromised capacity
        with transaction.atomic():
            locked_rec = Receivable.objects.select_for_update().get(pk=receivable.pk)
            existing_promises_sum = locked_rec.payment_promises.filter(
                cancelled_at__isnull=True
            )
            if self.instance:
                existing_promises_sum = existing_promises_sum.exclude(
                    pk=self.instance.pk
                )
            active_promised_total = existing_promises_sum.aggregate(
                total=Sum("amount")
            )["total"] or Decimal("0.00")

            # Payments on cancelled promises still reduce the receivable balance.
            from payments.models import Payment

            cancelled_paid = Payment.objects.filter(
                payment_promise__receivable=locked_rec,
                payment_promise__cancelled_at__isnull=False,
                voided_at__isnull=True,
            ).aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
            capacity = locked_rec.original_amount - cancelled_paid
            effective_amount = attrs.get(
                "amount", getattr(self.instance, "amount", Decimal("0.00"))
            )

            if effective_amount is not None:
                new_total = active_promised_total + effective_amount
                if new_total > capacity:
                    available = max(Decimal("0.00"), capacity - active_promised_total)
                    raise serializers.ValidationError(
                        {
                            "amount": f"Promise of ${effective_amount:.2f} exceeds receivable remaining capacity. Maximum available is ${available:.2f}."
                        }
                    )

            if self.instance and amount is not None:
                # Cannot reduce below paid amount
                from payments.models import Payment

                paid = Payment.objects.filter(
                    payment_promise=self.instance,
                    voided_at__isnull=True,
                ).aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
                if amount < paid:
                    raise serializers.ValidationError(
                        {
                            "amount": f"Cannot reduce promise below the already paid amount of ${paid:.2f}."
                        }
                    )

        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        validated_data["created_by"] = request.user
        return super().create(validated_data)


class CancelPromiseSerializer(serializers.Serializer):
    cancel_reason = serializers.CharField(required=True, min_length=3)
