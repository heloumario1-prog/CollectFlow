"""Live balances without multiplying payment rows or issuing per-row queries."""

from decimal import Decimal

from django.db.models import DecimalField, OuterRef, Subquery, Sum, Value
from django.db.models.functions import Coalesce
from payment_promises.models import PaymentPromise
from payments.models import Payment


def total(query, group):
    return Coalesce(
        Subquery(
            query.order_by()
            .values(group)
            .annotate(value=Sum("amount"))
            .values("value")[:1]
        ),
        Value(Decimal("0.00")),
        output_field=DecimalField(max_digits=18, decimal_places=2),
    )


def promise_balances(queryset):
    return queryset.annotate(
        _paid_total=total(
            Payment.objects.filter(
                payment_promise_id=OuterRef("pk"), voided_at__isnull=True
            ),
            "payment_promise_id",
        )
    )


def receivable_balances(queryset):
    payments = Payment.objects.filter(
        payment_promise__receivable_id=OuterRef("pk"), voided_at__isnull=True
    )
    return queryset.annotate(
        _paid_total=total(payments, "payment_promise__receivable_id"),
        _active_total=total(
            PaymentPromise.objects.filter(
                receivable_id=OuterRef("pk"), cancelled_at__isnull=True
            ),
            "receivable_id",
        ),
        _active_paid=total(
            payments.filter(payment_promise__cancelled_at__isnull=True),
            "payment_promise__receivable_id",
        ),
    )
