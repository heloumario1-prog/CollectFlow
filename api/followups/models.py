from django.db import models


class FollowUp(models.Model):
    id = models.BigAutoField(primary_key=True)
    customer = models.ForeignKey(
        "customers.Customer",
        on_delete=models.PROTECT,
        related_name="followups",
    )
    receivable = models.ForeignKey(
        "receivables.Receivable",
        on_delete=models.PROTECT,
        related_name="followups",
        null=True,
        blank=True,
    )
    payment_promise = models.ForeignKey(
        "payment_promises.PaymentPromise",
        on_delete=models.PROTECT,
        related_name="followups",
        null=True,
        blank=True,
    )
    occurred_at = models.DateTimeField()
    note = models.TextField()
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.PROTECT,
        related_name="created_followups",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
