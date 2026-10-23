"""Read-only integrity counts. Never repairs, removes, or prints record contents."""

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django

django.setup()

from businesses.models import Business
from common.financials import promise_balances, receivable_balances
from customers.models import Customer
from django.db.models import Count, F, Q
from followups.models import FollowUp
from payment_promises.models import PaymentPromise
from payments.models import Payment
from receivables.models import Receivable

receivables = receivable_balances(Receivable.objects.all())
report = {
    "businesses_without_exactly_one_owner": Business.objects.annotate(
        owners=Count("users", filter=Q(users__role="OWNER"))
    )
    .exclude(owners=1)
    .count(),
    "businesses_without_phone": Business.objects.filter(
        Q(phone_e164__isnull=True) | Q(phone_e164="")
    ).count(),
    "customer_creator_tenant_mismatches": Customer.objects.exclude(
        business=F("created_by__business")
    ).count(),
    "receivable_tenant_mismatches": Receivable.objects.exclude(
        business=F("customer__business"), business_id=F("created_by__business_id")
    ).count(),
    "promise_creator_tenant_mismatches": PaymentPromise.objects.exclude(
        receivable__business=F("created_by__business")
    ).count(),
    "payment_actor_tenant_mismatches": Payment.objects.exclude(
        payment_promise__receivable__business=F("recorded_by__business")
    ).count(),
    "overpaid_receivables": receivables.filter(
        _paid_total__gt=F("original_amount")
    ).count(),
    "overcommitted_receivables": receivables.annotate(
        committed=F("_active_total") + F("_paid_total") - F("_active_paid")
    )
    .filter(committed__gt=F("original_amount"))
    .count(),
    "overpaid_promises": promise_balances(PaymentPromise.objects.all())
    .filter(_paid_total__gt=F("amount"))
    .count(),
    "followup_relationship_mismatches": FollowUp.objects.filter(
        Q(receivable__isnull=False) & ~Q(receivable__customer=F("customer"))
        | Q(payment_promise__isnull=False)
        & ~Q(payment_promise__receivable__customer=F("customer"))
        | Q(receivable__isnull=False, payment_promise__isnull=False)
        & ~Q(receivable=F("payment_promise__receivable"))
    ).count(),
}
print(json.dumps(report, indent=2))
