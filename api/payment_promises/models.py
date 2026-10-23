from datetime import date
from decimal import Decimal
from zoneinfo import ZoneInfo

from django.db import models
from django.utils import timezone


class PaymentPromise(models.Model):
    class Status(models.TextChoices):
        CANCELLED = "CANCELLED", "Cancelled"
        KEPT = "KEPT", "Completed"
        BROKEN = "BROKEN", "Broken"
        PENDING = "PENDING", "Pending"

    id = models.BigAutoField(primary_key=True)
    receivable = models.ForeignKey(
        "receivables.Receivable",
        on_delete=models.PROTECT,
        related_name="payment_promises",
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    promised_on = models.DateField()
    note = models.TextField(null=True, blank=True)
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.PROTECT,
        related_name="created_payment_promises",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.PROTECT,
        related_name="cancelled_payment_promises",
        null=True,
        blank=True,
    )
    cancel_reason = models.TextField(null=True, blank=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(amount__gt=0),
                name="payment_promise_amount_positive",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(cancelled_at__isnull=True)
                    | (
                        models.Q(cancel_reason__isnull=False)
                        & ~models.Q(cancel_reason="")
                    )
                ),
                name="payment_promise_cancel_reason_required",
            ),
        ]

    def status_for(
        self,
        promise_remaining: Decimal,
        *,
        today: date | None = None,
    ) -> str:
        """Return the current status without persisting it."""
        if self.cancelled_at is not None:
            return self.Status.CANCELLED
        if promise_remaining == Decimal("0"):
            return self.Status.KEPT

        beirut_today = today or timezone.localdate(timezone=ZoneInfo("Asia/Beirut"))

        if self.promised_on < beirut_today:
            return self.Status.BROKEN

        return self.Status.PENDING

    def __str__(self):
        return f"Payment promise {self.pk}"
