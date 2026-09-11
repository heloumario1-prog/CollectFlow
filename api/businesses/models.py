from django.db import models
from django.core.validators import RegexValidator


class Business(models.Model):
    class Currency(models.TextChoices):
        USD = "USD", "USD"
    class Timezone(models.TextChoices):
        ASIA_BEIRUT = "Asia/Beirut", "Asia/Beirut"
        
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=150)
    phone_e164 = models.CharField(
        max_length=16,
        null=True,
        blank=True,
        validators=[RegexValidator(r"^\+[1-9]\d{1,14}$")],
    )
    base_currency = models.CharField(
        max_length=3,
        choices=Currency.choices,
        default=Currency.USD,
    )
    timezone = models.CharField(
        max_length=50,
        choices=Timezone.choices,
        default=Timezone.ASIA_BEIRUT,
    )
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    archived_at = models.DateTimeField(null=True, blank=True)
