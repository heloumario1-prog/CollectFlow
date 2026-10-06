from django.core.validators import RegexValidator
from django.db import models


class Customer(models.Model):
    id = models.BigAutoField(primary_key=True)
    business = models.ForeignKey(
        "businesses.Business",
        on_delete=models.PROTECT,
        related_name="customers",
    )
    name = models.CharField(max_length=150)
    phone_e164 = models.CharField(
        max_length=16,
        validators=[RegexValidator(r"^\+[1-9]\d{1,14}$")],
    )
    email = models.EmailField(max_length=254, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    next_follow_up_on = models.DateField(null=True, blank=True)
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.PROTECT,
        related_name="created_customers",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    archived_at = models.DateTimeField(null=True, blank=True)
    archived_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.PROTECT,
        related_name="archived_customers",
        null=True,
        blank=True,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["business", "phone_e164"],
                name="unique_customer_phone_per_business",
            )
        ]
