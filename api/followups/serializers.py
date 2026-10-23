from audit.services import log_audit_event
from customers.models import Customer
from django.db import transaction
from django.utils import timezone
from followups.models import FollowUp
from payment_promises.models import PaymentPromise
from receivables.models import Receivable
from rest_framework import serializers


class FollowUpSerializer(serializers.ModelSerializer):
    customer = serializers.PrimaryKeyRelatedField(queryset=Customer.objects.all())
    receivable = serializers.PrimaryKeyRelatedField(
        queryset=Receivable.objects.all(), required=False, allow_null=True
    )
    payment_promise = serializers.PrimaryKeyRelatedField(
        queryset=PaymentPromise.objects.all(), required=False, allow_null=True
    )
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    created_by_name = serializers.CharField(
        source="created_by.full_name", read_only=True
    )
    occurred_at = serializers.DateTimeField(required=False, default=timezone.now)
    next_follow_up_on = serializers.DateField(
        write_only=True, required=False, allow_null=True
    )

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
            "completed_at",
        ]
        read_only_fields = [
            "id",
            "customer_name",
            "created_by_name",
            "created_at",
            "updated_at",
            "completed_at",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            self.fields["customer"].queryset = self.fields["customer"].queryset.filter(
                business=request.user.business
            )
            self.fields["receivable"].queryset = self.fields[
                "receivable"
            ].queryset.filter(business=request.user.business)
            self.fields["payment_promise"].queryset = self.fields[
                "payment_promise"
            ].queryset.filter(receivable__business=request.user.business)

    def validate(self, attrs):
        request = self.context["request"]
        customer = attrs.get("customer") or getattr(self.instance, "customer", None)
        receivable = attrs.get("receivable", getattr(self.instance, "receivable", None))
        promise = attrs.get(
            "payment_promise", getattr(self.instance, "payment_promise", None)
        )

        if customer.archived_at is not None:
            raise serializers.ValidationError(
                {"customer": "Restore the customer before adding activity."}
            )
        if customer.business_id != request.user.business_id:
            raise serializers.ValidationError(
                {"customer": "Customer does not belong to your business."}
            )

        if receivable:
            if receivable.archived_at is not None:
                raise serializers.ValidationError(
                    {"receivable": "Restore the receivable before recording activity."}
                )
            if receivable.business_id != request.user.business_id:
                raise serializers.ValidationError(
                    {"receivable": "Receivable does not belong to your business."}
                )
            if receivable.customer_id != customer.id:
                raise serializers.ValidationError(
                    {
                        "receivable": "Receivable does not belong to the selected customer."
                    }
                )

        if promise:
            if promise.receivable.business_id != request.user.business_id:
                raise serializers.ValidationError(
                    {"payment_promise": "Promise does not belong to your business."}
                )
            if promise.receivable.customer_id != customer.id:
                raise serializers.ValidationError(
                    {
                        "payment_promise": "Promise does not belong to the selected customer."
                    }
                )
            if receivable and promise.receivable_id != receivable.id:
                raise serializers.ValidationError(
                    {
                        "payment_promise": "Promise does not belong to the selected receivable."
                    }
                )

        if not attrs.get("occurred_at") and not getattr(
            self.instance, "occurred_at", None
        ):
            attrs["occurred_at"] = timezone.now()

        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        has_schedule = "next_follow_up_on" in validated_data
        next_follow_up = validated_data.pop("next_follow_up_on", None)
        validated_data["created_by"] = request.user

        with transaction.atomic():
            followup = super().create(validated_data)

            # Update customer's next_follow_up_on if specified
            if has_schedule:
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

    @transaction.atomic
    def update(self, instance, validated_data):
        has_schedule = "next_follow_up_on" in validated_data
        schedule = validated_data.pop("next_follow_up_on", None)
        result = super().update(instance, validated_data)
        if has_schedule:
            result.customer.next_follow_up_on = schedule
            result.customer.save(update_fields=["next_follow_up_on", "updated_at"])
        return result
