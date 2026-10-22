from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from followups.models import FollowUp
from customers.models import Customer
from receivables.models import Receivable
from payment_promises.models import PaymentPromise
from audit.services import log_audit_event


class FollowUpSerializer(serializers.ModelSerializer):
    customer = serializers.PrimaryKeyRelatedField(queryset=Customer.objects.all())
    receivable = serializers.PrimaryKeyRelatedField(queryset=Receivable.objects.all(), required=False, allow_null=True)
    payment_promise = serializers.PrimaryKeyRelatedField(
        queryset=PaymentPromise.objects.all(), required=False, allow_null=True
    )
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)
    occurred_at = serializers.DateTimeField(required=False, default=timezone.now)
    next_follow_up_on = serializers.DateField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = FollowUp
        fields = [
            "id",
            "customer",
            "customer_name",
            "receivable",
            "payment_promise",
            "occurred_at",
            "note",
            "next_follow_up_on",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "customer_name", "created_by_name", "created_at", "updated_at"]

    def validate(self, attrs):
        request = self.context["request"]
        customer = attrs.get("customer") or getattr(self.instance, "customer", None)
        receivable = attrs.get("receivable") or getattr(self.instance, "receivable", None)
        promise = attrs.get("payment_promise") or getattr(self.instance, "payment_promise", None)

        if customer.business_id != request.user.business_id:
            raise serializers.ValidationError({"customer": "Customer does not belong to your business."})

        if receivable:
            if receivable.business_id != request.user.business_id:
                raise serializers.ValidationError({"receivable": "Receivable does not belong to your business."})
            if receivable.customer_id != customer.id:
                raise serializers.ValidationError({"receivable": "Receivable does not belong to the selected customer."})

        if promise:
            if promise.receivable.business_id != request.user.business_id:
                raise serializers.ValidationError({"payment_promise": "Promise does not belong to your business."})
            if promise.receivable.customer_id != customer.id:
                raise serializers.ValidationError(
                    {"payment_promise": "Promise does not belong to the selected customer."}
                )
            if receivable and promise.receivable_id != receivable.id:
                raise serializers.ValidationError(
                    {"payment_promise": "Promise does not belong to the selected receivable."}
                )

        if not attrs.get("occurred_at") and not getattr(self.instance, "occurred_at", None):
            attrs["occurred_at"] = timezone.now()

        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        next_follow_up = validated_data.pop("next_follow_up_on", None)
        validated_data["created_by"] = request.user

        with transaction.atomic():
            followup = super().create(validated_data)

            # Update customer's next_follow_up_on if specified
            if next_follow_up is not None:
                customer = followup.customer
                customer.next_follow_up_on = next_follow_up
                customer.save(update_fields=["next_follow_up_on", "updated_at"])

            log_audit_event(
                business=request.user.business,
                actor_user=request.user,
                action="CREATE",
                entity_type="FollowUp",
                entity_id=followup.id,
                after_data={
                    "customer_id": followup.customer_id,
                    "receivable_id": followup.receivable_id,
                    "payment_promise_id": followup.payment_promise_id,
                    "note": followup.note,
                },
                request=request,
            )

        return followup
