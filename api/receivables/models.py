from django.db import models


class Receivable(models.Model):
    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        PARTIALLY_PAID = "PARTIALLY_PAID", "Partially paid"
        OVERDUE = "OVERDUE", "Overdue"
        PAID = "PAID", "Paid"

    id = models.BigAutoField(primary_key=True)
    business = models.ForeignKey(
        "businesses.Business",
        on_delete=models.PROTECT,
        related_name="receivables",
    )
    customer = models.ForeignKey(
        "customers.Customer",
        on_delete=models.PROTECT,
        related_name="receivables",
    )
    original_amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="USD", editable=False)
    reference = models.CharField(max_length=100, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    issue_date = models.DateField(null=True, blank=True)
    due_date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
    )
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.PROTECT,
        related_name="created_receivables",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    archived_at = models.DateTimeField(null=True, blank=True)
    archived_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.PROTECT,
        related_name="archived_receivables",
        null=True,
        blank=True,
    )

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(original_amount__gt=0),
                name="receivable_original_amount_positive",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(issue_date__isnull=True)
                    | models.Q(due_date__gte=models.F("issue_date"))
                ),
                name="receivable_due_date_not_before_issue_date",
            ),
        ]

    def __str__(self):
        return self.reference or f"Receivable {self.pk}"
