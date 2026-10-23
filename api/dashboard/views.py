from datetime import date, timedelta
from decimal import Decimal

from common.financials import promise_balances, receivable_balances
from common.permissions import IsBusinessMember
from common.timezone_utils import get_beirut_today
from customers.models import Customer
from django.db.models import Sum
from payment_promises.models import PaymentPromise
from payments.models import Payment
from receivables.models import Receivable
from rest_framework import permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView


class DashboardView(APIView):
    """
    Computes dashboard summary and queues in real time from source records.
    Filters by period: 'today', 'this_week', 'this_month' (default), or custom 'from' and 'to'.
    Uses Asia/Beirut timezone for all date thresholds.
    """

    permission_classes = [permissions.IsAuthenticated, IsBusinessMember]

    def get(self, request):
        business = request.user.business
        today = get_beirut_today()

        # Date range for collections
        period = request.query_params.get("period", "this_month").lower()
        date_from_param = request.query_params.get("from")
        date_to_param = request.query_params.get("to")

        if bool(date_from_param) != bool(date_to_param):
            raise ValidationError({"from": "Provide both start and end dates."})
        if period not in ("today", "this_week", "this_month", "custom"):
            raise ValidationError(
                {"period": "Choose today, this_week, this_month, or custom."}
            )
        if period == "custom" and not date_from_param:
            raise ValidationError({"from": "Choose a start and end date."})
        if date_from_param and date_to_param:
            try:
                range_start = date.fromisoformat(date_from_param)
                range_end = date.fromisoformat(date_to_param)
            except ValueError:
                raise ValidationError({"from": "Use valid YYYY-MM-DD dates."})
            if range_end < range_start:
                raise ValidationError(
                    {"to": "End date must be on or after the start date."}
                )
            period = "custom"
        elif period == "today":
            range_start = today
            range_end = today
        elif period == "this_week":
            # Monday of current week
            range_start = today - timedelta(days=today.weekday())
            range_end = today
        else:  # this_month
            range_start = today.replace(day=1)
            range_end = today

        # 1. Total Outstanding & Total Overdue & Total Unpromised
        active_receivables = Receivable.objects.filter(
            business=business,
            archived_at__isnull=True,
        ).select_related("customer")

        total_outstanding = Decimal("0.00")
        total_overdue = Decimal("0.00")
        total_unpromised = Decimal("0.00")

        for rec in receivable_balances(active_receivables):
            paid = rec._paid_total

            remaining = max(Decimal("0.00"), rec.original_amount - paid)
            total_outstanding += remaining

            if remaining > Decimal("0.00") and rec.due_date < today:
                total_overdue += remaining

            active_promised_remaining = max(
                Decimal("0.00"), rec._active_total - rec._active_paid
            )

            unpromised = max(Decimal("0.00"), remaining - active_promised_remaining)
            total_unpromised += unpromised

        # 2. Collected amounts in selected date range
        payments_in_period = Payment.objects.filter(
            payment_promise__receivable__business=business,
            voided_at__isnull=True,
            paid_on__gte=range_start,
            paid_on__lte=range_end,
        )

        cash_collected = payments_in_period.filter(
            method=Payment.Method.CASH
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
        whish_collected = payments_in_period.filter(
            method=Payment.Method.WHISH
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
        total_collected = cash_collected + whish_collected

        # 3. Broken promises: non-cancelled, promised_on < today, remaining > 0
        all_active_promises = PaymentPromise.objects.filter(
            receivable__business=business,
            receivable__archived_at__isnull=True,
            cancelled_at__isnull=True,
        ).select_related("receivable", "receivable__customer")

        broken_promises = []
        upcoming_promises = []
        seven_days_later = today + timedelta(days=7)

        for prom in promise_balances(all_active_promises):
            p_paid = prom._paid_total
            p_rem = max(Decimal("0.00"), prom.amount - p_paid)

            if p_rem > Decimal("0.00"):
                prom_data = {
                    "id": prom.id,
                    "receivable_id": prom.receivable_id,
                    "customer_name": prom.receivable.customer.name,
                    "customer_phone": prom.receivable.customer.phone_e164,
                    "amount": str(prom.amount),
                    "remaining_amount": str(p_rem),
                    "promised_on": prom.promised_on.isoformat(),
                    "note": prom.note,
                }
                if prom.promised_on < today:
                    broken_promises.append(prom_data)
                elif today <= prom.promised_on <= seven_days_later:
                    upcoming_promises.append(prom_data)

        # Sort queues
        broken_promises.sort(key=lambda x: x["promised_on"])
        upcoming_promises.sort(key=lambda x: x["promised_on"])

        # 4. Due follow-ups: active customers whose next_follow_up_on is today or earlier
        due_customers = Customer.objects.filter(
            business=business,
            archived_at__isnull=True,
            next_follow_up_on__isnull=False,
            next_follow_up_on__lte=today,
        ).order_by("next_follow_up_on")

        due_followups = [
            {
                "id": c.id,
                "name": c.name,
                "phone_e164": c.phone_e164,
                "next_follow_up_on": c.next_follow_up_on.isoformat(),
                "notes": c.notes,
            }
            for c in due_customers
        ]

        response_data = {
            "period": {
                "name": period,
                "start": str(range_start),
                "end": str(range_end),
                "today_in_beirut": str(today),
            },
            "metrics": {
                "total_outstanding": str(total_outstanding),
                "total_overdue": str(total_overdue),
                "cash_collected": str(cash_collected),
                "whish_collected": str(whish_collected),
                "total_collected": str(total_collected),
                "total_unpromised": str(total_unpromised),
                "broken_promises_count": len(broken_promises),
                "upcoming_promises_count": len(upcoming_promises),
                "due_followups_count": len(due_followups),
            },
            "queues": {
                "broken_promises": broken_promises,
                "upcoming_promises": upcoming_promises,
                "due_followups": due_followups,
            },
        }

        return Response(response_data, status=status.HTTP_200_OK)
