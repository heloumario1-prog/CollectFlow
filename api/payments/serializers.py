from decimal import Decimal
from django.db import transaction
from django.db.models import Sum
from rest_framework import serializers

from payments.models import Payment
from payment_promises.models import PaymentPromise
from common.timezone_utils import get_beirut_today


class PaymentSerializer(serializers.ModelSerializer):
    payment_promise = serializers.PrimaryKeyRelatedField(queryset=PaymentPromise.objects.all())
    receivable_id = serializers.IntegerField(source="payment_promise.receivable.id", read_only=True)
    customer_id = serializers.IntegerField(source="payment_promise.receivable.customer.id", read_only=True)
    customer_name = serializers.CharField(source="payment_promise.receivable.customer.name", read_only=True)
    recorded_by_name = serializers.CharField(source="recorded_by.full_name", read_only=True)
    voided_by_name = serializers.CharField(source="voided_by.full_name", read_only=True, default=None)
    is_voided = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            "id",
            "payment_promise",
            "receivable_id",
            "customer_id",
            "customer_name",
            "amount",
            "paid_on",
            "method",
            "note",
            "recorded_by_name",
            "is_voided",
            "voided_at",
            "voided_by_name",
            "void_reason",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "recorded_by_name",
            "is_voided",
            "voided_at",
            "voided_by_name",
            "void_reason",
            "created_at",
        ]

    def get_is_voided(self, obj) -> bool:
        return obj.voided_at is not None

    def validate(self, attrs):
        request = self.context["request"]
        promise = attrs.get("payment_promise") or getattr(self.instance, "payment_promise", None)
        amount = attrs.get("amount")
        paid_on = attrs.get("paid_on")
        method = attrs.get("method")

        if promise.receivable.business_id != request.user.business_id:
            raise serializers.ValidationError({"payment_promise": "Promise does not belong to your business."})

        if promise.cancelled_at is not None:
            raise serializers.ValidationError({"payment_promise": "Cannot record payments against a cancelled promise."})

        if promise.receivable.archived_at is not None:
            raise serializers.ValidationError({"payment_promise": "Cannot record payments against an archived receivable."})

        # paid_on cannot be later than today in Beirut
        beirut_today = get_beirut_today()
        if paid_on and paid_on > beirut_today:
            raise serializers.ValidationError(
                {"paid_on": f"Payment date cannot be in the future (today in Beirut is {beirut_today})."}
            )

        if method and method not in [Payment.Method.CASH, Payment.Method.WHISH]:
            raise serializers.ValidationError({"method": "Payment method must be CASH or WHISH."})

        if amount is not None and amount <= Decimal("0.00"):
            raise serializers.ValidationError({"amount": "Payment amount must be greater than zero."})

        # Atomic row locking check
        with transaction.atomic():
            locked_promise = PaymentPromise.objects.select_for_update().get(pk=promise.pk)
            existing_payments = locked_promise.payments.filter(voided_at__isnull=True)
            if self.instance:
                existing_payments = existing_payments.exclude(pk=self.instance.pk)

            already_paid = existing_payments.aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
            promise_remaining = locked_promise.amount - already_paid

            if promise_remaining <= Decimal("0.00"):
                raise serializers.ValidationError(
                    {"payment_promise": "This promise is already fully kept ($0 remaining)."}
                )

            if amount is not None and amount > promise_remaining:
                raise serializers.ValidationError(
                    {
                        "amount": f"Payment of ${amount:.2f} exceeds promise remaining amount of ${promise_remaining:.2f}."
                    }
                )

        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        validated_data["recorded_by"] = request.user
        return super().create(validated_data)


class VoidPaymentSerializer(serializers.Serializer):
    void_reason = serializers.CharField(required=True, min_length=3)
