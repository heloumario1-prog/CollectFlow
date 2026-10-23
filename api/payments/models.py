from django.db import models


class Payment(models.Model):
    class Method(models.TextChoices):
        CASH = "CASH", "Cash"
        WHISH = "WHISH", "Whish"

    id = models.BigAutoField(primary_key=True)
    payment_promise = models.ForeignKey(
        "payment_promises.PaymentPromise",
        on_delete=models.PROTECT,
        related_name="payments",
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    paid_on = models.DateField()
    method = models.CharField(max_length=10, choices=Method.choices)
    note = models.TextField(null=True, blank=True)
    recorded_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.PROTECT,
        related_name="recorded_payments",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    voided_at = models.DateTimeField(null=True, blank=True)
    voided_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.PROTECT,
        related_name="voided_payments",
        null=True,
        blank=True,
    )
    void_reason = models.TextField(null=True, blank=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(amount__gt=0),
                name="payment_amount_positive",
            ),
            models.CheckConstraint(
                condition=models.Q(method__in=["CASH", "WHISH"]),
                name="payment_method_valid",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(voided_at__isnull=True)
                    | (models.Q(void_reason__isnull=False) & ~models.Q(void_reason=""))
                ),
                name="payment_void_reason_required",
            ),
        ]

    def __str__(self):
        return f"Payment {self.pk}"


class PaymentRequest(models.Model):
    """Durable replay protection for a business's payment creation requests."""

    business = models.ForeignKey("businesses.Business", on_delete=models.PROTECT)
    key = models.CharField(max_length=100)
    fingerprint = models.CharField(max_length=64)
    response_data = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["business", "key"], name="payment_request_business_key_unique"
            )
        ]
