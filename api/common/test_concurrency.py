from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

from accounts.models import User
from businesses.models import Business
from common.timezone_utils import get_beirut_today
from customers.models import Customer
from django.db import connections
from django.test import TransactionTestCase, skipUnlessDBFeature
from payment_promises.models import PaymentPromise
from payments.models import Payment
from receivables.models import Receivable
from rest_framework.test import APIClient


class ConcurrentFinancialWritesTests(TransactionTestCase):
    def setUp(self):
        business = Business.objects.create(name="Isolated concurrency business")
        self.owner = User.objects.create_user(
            "concurrency@example.test",
            business=business,
            role="OWNER",
            full_name="Owner",
        )
        customer = Customer.objects.create(
            business=business,
            created_by=self.owner,
            name="Customer",
            phone_e164="+96171123456",
        )
        self.today = str(get_beirut_today())
        self.rec = Receivable.objects.create(
            business=business,
            created_by=self.owner,
            customer=customer,
            original_amount="100.00",
            due_date=self.today,
        )

    def concurrent_posts(self, path, body, key=None):
        barrier = Barrier(2)

        def post():
            client = APIClient()
            client.force_authenticate(self.owner)
            try:
                barrier.wait(timeout=10)
                response = client.post(
                    path,
                    body,
                    format="json",
                    **({"HTTP_IDEMPOTENCY_KEY": key} if key else {})
                )
                return response.status_code, response.data
            finally:
                connections.close_all()

        with ThreadPoolExecutor(max_workers=2) as pool:
            futures = [pool.submit(post) for _ in range(2)]
            return [future.result(timeout=20) for future in futures]

    @skipUnlessDBFeature("has_select_for_update")
    def test_concurrent_promises_cannot_overcommit_receivable(self):
        results = self.concurrent_posts(
            "/api/v1/promises/",
            {"receivable": self.rec.pk, "amount": "70.00", "promised_on": self.today},
        )
        self.assertEqual(sorted(status for status, _ in results), [201, 400], results)
        self.assertEqual(PaymentPromise.objects.count(), 1)

    @skipUnlessDBFeature("has_select_for_update")
    def test_concurrent_payments_cannot_overpay(self):
        promise = PaymentPromise.objects.create(
            receivable=self.rec,
            created_by=self.owner,
            amount="100.00",
            promised_on=self.today,
        )
        results = self.concurrent_posts(
            "/api/v1/payments/",
            {
                "payment_promise": promise.pk,
                "amount": "70.00",
                "paid_on": self.today,
                "method": "CASH",
            },
        )
        self.assertEqual(sorted(status for status, _ in results), [201, 400], results)
        self.assertEqual(Payment.objects.count(), 1)

    @skipUnlessDBFeature("has_select_for_update")
    def test_concurrent_same_key_records_one_payment(self):
        promise = PaymentPromise.objects.create(
            receivable=self.rec,
            created_by=self.owner,
            amount="100.00",
            promised_on=self.today,
        )
        results = self.concurrent_posts(
            "/api/v1/payments/",
            {
                "payment_promise": promise.pk,
                "amount": "40.00",
                "paid_on": self.today,
                "method": "CASH",
            },
            key="concurrent-retry",
        )
        self.assertEqual([status for status, _ in results], [201, 201], results)
        self.assertEqual(results[0][1]["id"], results[1][1]["id"])
        self.assertEqual(Payment.objects.count(), 1)
