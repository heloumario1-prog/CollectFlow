from datetime import timedelta
from decimal import Decimal

from accounts.models import User
from businesses.models import Business
from common.timezone_utils import get_beirut_today
from customers.models import Customer
from django.test import TestCase
from django.utils import timezone
from payment_promises.models import PaymentPromise
from payments.models import Payment
from receivables.models import Receivable
from rest_framework.test import APIClient


class PromiseStatusWorkflowTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.today = get_beirut_today()
        cls.business = Business.objects.create(name="Status test business")
        cls.user = User.objects.create_user(
            "status@example.test",
            business=cls.business,
            role="OWNER",
            full_name="Manager",
        )
        cls.customer = Customer.objects.create(
            business=cls.business,
            created_by=cls.user,
            name="Customer",
            phone_e164="+96171123456",
        )
        cls.receivable = Receivable.objects.create(
            business=cls.business,
            customer=cls.customer,
            created_by=cls.user,
            original_amount="100.00",
            due_date=cls.today + timedelta(days=7),
        )

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.promise = PaymentPromise.objects.create(
            receivable=self.receivable,
            created_by=self.user,
            amount="100.00",
            promised_on=self.today + timedelta(days=1),
        )
        self.url = f"/api/v1/promises/{self.promise.pk}/"

    def record(self, amount):
        response = self.client.post(
            "/api/v1/payments/",
            {
                "payment_promise": self.promise.pk,
                "amount": amount,
                "paid_on": self.today.isoformat(),
                "method": "CASH",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        return response.data["id"]

    def assert_status(self, status, paid, remaining):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], status)
        self.assertEqual(Decimal(response.data["paid_amount"]), Decimal(paid))
        self.assertEqual(Decimal(response.data["remaining_amount"]), Decimal(remaining))

    def test_completion_comes_from_full_payments_and_void_reopens_balance(self):
        self.assert_status("PENDING", "0", "100")
        self.record("25.00")
        self.assert_status("PENDING", "25", "75")
        final_payment = self.record("75.00")
        self.assert_status("KEPT", "100", "0")
        response = self.client.post(
            f"/api/v1/payments/{final_payment}/void/",
            {"void_reason": "Incorrect payment"},
        )
        self.assertEqual(response.status_code, 200)
        self.assert_status("PENDING", "25", "75")
        self.promise.refresh_from_db()
        self.receivable.refresh_from_db()
        self.assertEqual(self.promise.amount, Decimal("100"))
        self.assertEqual(self.receivable.original_amount, Decimal("100"))

    def test_editing_active_payment_recalculates_completion(self):
        payment_id = self.record("100.00")
        self.assert_status("KEPT", "100", "0")
        response = self.client.patch(
            f"/api/v1/payments/{payment_id}/", {"amount": "60.00"}, format="json"
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assert_status("PENDING", "60", "40")

    def test_status_cannot_be_set_to_bypass_payments(self):
        response = self.client.patch(self.url, {"status": "KEPT"}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assert_status("PENDING", "0", "100")
        self.assertEqual(Payment.objects.count(), 0)

    def test_broken_and_cancelled_are_real_workflow_states(self):
        self.promise.promised_on = self.today - timedelta(days=1)
        self.promise.save(update_fields=["promised_on"])
        self.assert_status("BROKEN", "0", "100")
        self.record("100.00")
        self.assert_status("KEPT", "100", "0")
        self.promise.cancelled_at = timezone.now()
        self.promise.cancelled_by = self.user
        self.promise.cancel_reason = "Test cancelled-state precedence"
        self.promise.save(
            update_fields=["cancelled_at", "cancelled_by", "cancel_reason"]
        )
        self.assert_status("CANCELLED", "100", "0")
        self.assertEqual(
            set(PaymentPromise.Status.values),
            {"PENDING", "BROKEN", "KEPT", "CANCELLED"},
        )
        self.assertEqual(PaymentPromise.Status.KEPT.label, "Completed")
