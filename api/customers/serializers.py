from decimal import Decimal

from common.phone_utils import get_whatsapp_url, normalize_phone_number
from customers.models import Customer
from django.db.models import Q, Sum
from rest_framework import serializers


class CustomerSerializer(serializers.ModelSerializer):
    total_paid = serializers.SerializerMethodField()
    total_remaining = serializers.SerializerMethodField()
    total_receivables = serializers.SerializerMethodField()
    has_outstanding = serializers.SerializerMethodField()
    whatsapp_url = serializers.SerializerMethodField()
    phone_country = serializers.CharField(
        max_length=5, required=False, write_only=True, default="LB"
    )
    phone_national_number = serializers.CharField(
        max_length=30, required=False, write_only=True
    )

    class Meta:
        model = Customer
        fields = [
            "id",
            "name",
            "phone_e164",
            "phone_country",
            "phone_national_number",
            "email",
            "notes",
            "next_follow_up_on",
            "total_receivables",
            "total_paid",
            "total_remaining",
            "has_outstanding",
            "whatsapp_url",
            "archived_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "phone_e164",
            "archived_at",
            "created_at",
            "updated_at",
        ]

    def get_whatsapp_url(self, obj) -> str:
        return get_whatsapp_url(obj.phone_e164)

    def _get_customer_financials(self, obj):
        if hasattr(obj, "_cached_financials"):
            return obj._cached_financials

        receivables = getattr(obj, "_active_receivables", None)
        if receivables is None:
            from common.financials import receivable_balances

            receivables = list(
                receivable_balances(obj.receivables.filter(archived_at__isnull=True))
            )
        total_orig = sum((r.original_amount for r in receivables), Decimal("0.00"))
        paid = sum((r._paid_total for r in receivables), Decimal("0.00"))

        remaining = max(Decimal("0.00"), total_orig - paid)
        data = {
            "count": len(receivables),
            "paid": f"{paid:.2f}",
            "remaining": f"{remaining:.2f}",
            "has_outstanding": remaining > Decimal("0.00"),
        }
        obj._cached_financials = data
        return data

    def get_total_receivables(self, obj) -> int:
        return self._get_customer_financials(obj)["count"]

    def get_total_paid(self, obj) -> str:
        return self._get_customer_financials(obj)["paid"]

    def get_total_remaining(self, obj) -> str:
        return self._get_customer_financials(obj)["remaining"]

    def get_has_outstanding(self, obj) -> bool:
        return self._get_customer_financials(obj)["has_outstanding"]

    def validate(self, attrs):
        if self.instance and self.instance.archived_at is not None:
            raise serializers.ValidationError(
                {"detail": "Restore this record before editing it."}
            )
        raw_phone = attrs.get("phone_national_number") or attrs.get("phone_e164")
        country = attrs.get("phone_country", "LB")

        if self.instance is None and not raw_phone:
            raise serializers.ValidationError({"phone": "Phone number is required."})

        if raw_phone:
            e164 = normalize_phone_number(raw_phone, country)
            attrs["phone_e164"] = e164

        if self.instance and "phone_e164" in attrs:
            if (
                Customer.objects.filter(
                    business=self.context["request"].user.business,
                    phone_e164=attrs["phone_e164"],
                )
                .exclude(pk=self.instance.pk)
                .exists()
            ):
                raise serializers.ValidationError(
                    {"phone": "A customer with this phone number already exists."}
                )
        return attrs

    def create(self, validated_data):
        validated_data.pop("phone_country", None)
        validated_data.pop("phone_national_number", None)

        request = self.context["request"]
        business = request.user.business
        phone_e164 = validated_data["phone_e164"]

        # Check if active customer exists with this number
        existing = Customer.objects.filter(
            business=business, phone_e164=phone_e164
        ).first()
        if existing:
            if existing.archived_at is not None:
                # Per spec: restore archived customer instead of creating duplicate
                existing.archived_at = None
                existing.archived_by = None
                existing.name = validated_data.get("name", existing.name)
                existing.email = validated_data.get("email", existing.email)
                existing.notes = validated_data.get("notes", existing.notes)
                if "next_follow_up_on" in validated_data:
                    existing.next_follow_up_on = validated_data["next_follow_up_on"]
                existing.save()
                return existing
            else:
                raise serializers.ValidationError(
                    {"phone_e164": "A customer with this phone number already exists."}
                )

        validated_data["business"] = business
        validated_data["created_by"] = request.user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("phone_country", None)
        validated_data.pop("phone_national_number", None)
        return super().update(instance, validated_data)
