from decimal import Decimal
from datetime import timedelta
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import User
from businesses.models import Business
from customers.models import Customer
from receivables.models import Receivable
from payment_promises.models import PaymentPromise
from payments.models import Payment
from audit.models import AuditEvent
from common.timezone_utils import get_beirut_today


class CollectFlowBackendTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.today = get_beirut_today()

        # 1. Register a business and owner using Zainab's nested format
        reg_payload = {
            "business": {
                "name": "Al-Nour Supplies",
                "phone_e164": "+96170123456",
            },
            "owner": {
                "full_name": "Fida Abbass",
                "email": "fida@al-nour.com",
                "password": "Password123!",
            },
        }
        res = self.client.post("/api/v1/auth/register/", reg_payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["message"], "Registration successful.")
        self.assertEqual(res.data["email"], "fida@al-nour.com")

        # Login as owner using Zainab's session login
        login_res = self.client.post(
            "/api/v1/auth/login/",
            {"email": "fida@al-nour.com", "password": "Password123!"},
            format="json",
        )
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        self.assertEqual(login_res.data["email"], "fida@al-nour.com")
        self.assertEqual(login_res.data["role"], "OWNER")

        self.owner = User.objects.get(email="fida@al-nour.com")
        self.business = self.owner.business

    def test_registration_and_auth(self):
        # Current user check (Zainab's /api/v1/auth/me/)
        me_res = self.client.get("/api/v1/auth/me/")
        self.assertEqual(me_res.status_code, status.HTTP_200_OK)
        self.assertEqual(me_res.data["email"], "fida@al-nour.com")
        self.assertEqual(me_res.data["role"], "OWNER")

        # Business settings check (Zainab's /api/v1/business/)
        biz_res = self.client.get("/api/v1/business/")
        self.assertEqual(biz_res.status_code, status.HTTP_200_OK)
        self.assertEqual(biz_res.data["name"], "Al-Nour Supplies")

        # Duplicate registration fails
        dup_res = self.client.post(
            "/api/v1/auth/register/",
            {
                "business": {
                    "name": "Duplicate Business",
                    "phone_e164": "+96171999888",
                },
                "owner": {
                    "full_name": "Another User",
                    "email": "fida@al-nour.com",
                    "password": "Password123!",
                },
            },
            format="json",
        )
        self.assertEqual(dup_res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_owner_manages_staff(self):
        # Create staff via Zainab's /api/v1/staff/
        staff_res = self.client.post(
            "/api/v1/staff/",
            {
                "full_name": "Zainab Hammoud",
                "email": "zainab@al-nour.com",
                "password": "StaffPassword123!",
            },
            format="json",
        )
        self.assertEqual(staff_res.status_code, status.HTTP_201_CREATED)
        staff_id = staff_res.data["id"]

        # Deactivate staff
        deact_res = self.client.post(f"/api/v1/staff/{staff_id}/deactivate/")
        self.assertEqual(deact_res.status_code, status.HTTP_200_OK)
        staff_user = User.objects.get(pk=staff_id)
        self.assertFalse(staff_user.is_active)

        # Reactivate staff
        react_res = self.client.post(f"/api/v1/staff/{staff_id}/reactivate/")
        self.assertEqual(react_res.status_code, status.HTTP_200_OK)
        staff_user.refresh_from_db()
        self.assertTrue(staff_user.is_active)

    def test_customer_lifecycle_and_phone_normalization(self):
        # Create customer with Lebanese formatting
        cust_res = self.client.post(
            "/api/v1/customers/",
            {
                "name": "Maya Supermarket",
                "phone_country": "LB",
                "phone_national_number": "03 456 789",
                "notes": "Prefers WhatsApp reminders in Arabic",
            },
            format="json",
        )
        self.assertEqual(cust_res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(cust_res.data["phone_e164"], "+9613456789")
        self.assertEqual(cust_res.data["whatsapp_url"], "https://wa.me/9613456789")

        # Invalid phone rejection
        bad_res = self.client.post(
            "/api/v1/customers/",
            {
                "name": "Invalid Phone Customer",
                "phone_country": "LB",
                "phone_national_number": "123",
            },
            format="json",
        )
        self.assertEqual(bad_res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_receivable_promises_payments_flow(self):
        # 1. Create Customer
        cust = Customer.objects.create(
            business=self.business,
            name="Beirut Grocery",
            phone_e164="+96171000111",
            created_by=self.owner,
        )

        # 2. Create Receivable for $500
        rec_res = self.client.post(
            "/api/v1/receivables/",
            {
                "customer": cust.id,
                "original_amount": "500.00",
                "reference": "INV-2026-001",
                "due_date": (self.today + timedelta(days=14)).isoformat(),
            },
            format="json",
        )
        self.assertEqual(rec_res.status_code, status.HTTP_201_CREATED)
        rec_id = rec_res.data["id"]
        self.assertEqual(rec_res.data["remaining_amount"], "500.00")
        self.assertEqual(rec_res.data["unpromised_amount"], "500.00")
        self.assertEqual(rec_res.data["status"], "OPEN")

        # 3. Create Promise 1 ($200)
        p1_res = self.client.post(
            "/api/v1/promises/",
            {
                "receivable": rec_id,
                "amount": "200.00",
                "promised_on": (self.today + timedelta(days=3)).isoformat(),
                "note": "Agreed by WhatsApp",
            },
            format="json",
        )
        self.assertEqual(p1_res.status_code, status.HTTP_201_CREATED)
        p1_id = p1_res.data["id"]

        # Check unpromised balance on receivable
        rec_check = self.client.get(f"/api/v1/receivables/{rec_id}/")
        self.assertEqual(rec_check.data["unpromised_amount"], "300.00")

        # Over-promising rejected (trying $400 when only $300 remains)
        over_promise = self.client.post(
            "/api/v1/promises/",
            {
                "receivable": rec_id,
                "amount": "400.00",
                "promised_on": (self.today + timedelta(days=5)).isoformat(),
            },
            format="json",
        )
        self.assertEqual(over_promise.status_code, status.HTTP_400_BAD_REQUEST)

        # 4. Record Payment against Promise 1 ($50 Cash)
        pay1_res = self.client.post(
            "/api/v1/payments/",
            {
                "payment_promise": p1_id,
                "amount": "50.00",
                "paid_on": self.today.isoformat(),
                "method": "CASH",
                "note": "Delivered to store",
            },
            format="json",
        )
        self.assertEqual(pay1_res.status_code, status.HTTP_201_CREATED)
        pay1_id = pay1_res.data["id"]

        # Check Promise remaining is now $150
        p1_check = self.client.get(f"/api/v1/promises/{p1_id}/")
        self.assertEqual(p1_check.data["remaining_amount"], "150.00")
        self.assertEqual(p1_check.data["status"], "PENDING")

        # Overpaying promise rejected (trying $160 when only $150 remains)
        overpay = self.client.post(
            "/api/v1/payments/",
            {
                "payment_promise": p1_id,
                "amount": "160.00",
                "paid_on": self.today.isoformat(),
                "method": "WHISH",
            },
            format="json",
        )
        self.assertEqual(overpay.status_code, status.HTTP_400_BAD_REQUEST)

        # Record second payment ($150 Whish) -> Promise becomes KEPT
        pay2_res = self.client.post(
            "/api/v1/payments/",
            {
                "payment_promise": p1_id,
                "amount": "150.00",
                "paid_on": self.today.isoformat(),
                "method": "WHISH",
            },
            format="json",
        )
        self.assertEqual(pay2_res.status_code, status.HTTP_201_CREATED)
        p1_check2 = self.client.get(f"/api/v1/promises/{p1_id}/")
        self.assertEqual(p1_check2.data["remaining_amount"], "0.00")
        self.assertEqual(p1_check2.data["status"], "KEPT")

        # Check Receivable state: paid=200, remaining=300, status=PARTIALLY_PAID
        rec_check2 = self.client.get(f"/api/v1/receivables/{rec_id}/")
        self.assertEqual(rec_check2.data["paid_amount"], "200.00")
        self.assertEqual(rec_check2.data["remaining_amount"], "300.00")
        self.assertEqual(rec_check2.data["status"], "PARTIALLY_PAID")

        # 5. Void payment pay1 ($50)
        void_res = self.client.post(
            f"/api/v1/payments/{pay1_id}/void/",
            {"void_reason": "Customer entered wrong cash amount"},
            format="json",
        )
        self.assertEqual(void_res.status_code, status.HTTP_200_OK)

        # Check recalculation: Promise remaining goes back up to $50, status becomes PENDING
        p1_check3 = self.client.get(f"/api/v1/promises/{p1_id}/")
        self.assertEqual(p1_check3.data["remaining_amount"], "50.00")
        self.assertEqual(p1_check3.data["status"], "PENDING")

        # Receivable paid is now $150
        rec_check3 = self.client.get(f"/api/v1/receivables/{rec_id}/")
        self.assertEqual(rec_check3.data["paid_amount"], "150.00")
        self.assertEqual(rec_check3.data["remaining_amount"], "350.00")

    def test_followup_and_dashboard_metrics(self):
        cust = Customer.objects.create(
            business=self.business,
            name="Saida Traders",
            phone_e164="+96176555444",
            created_by=self.owner,
            next_follow_up_on=self.today,
        )

        # Add follow-up
        fu_res = self.client.post(
            "/api/v1/followups/",
            {
                "customer": cust.id,
                "note": "Called on WhatsApp. Customer will pay on Friday.",
                "next_follow_up_on": (self.today + timedelta(days=4)).isoformat(),
            },
            format="json",
        )
        self.assertEqual(fu_res.status_code, status.HTTP_201_CREATED)
        cust.refresh_from_db()
        self.assertEqual(cust.next_follow_up_on, self.today + timedelta(days=4))

        # Check Dashboard
        dash_res = self.client.get("/api/v1/dashboard/")
        self.assertEqual(dash_res.status_code, status.HTTP_200_OK)
        self.assertIn("metrics", dash_res.data)
        self.assertIn("queues", dash_res.data)

    def test_delete_returns_405(self):
        # DELETE on customer, receivable, promise, payment returns 405
        cust = Customer.objects.create(
            business=self.business,
            name="Zahle Mart",
            phone_e164="+96188112233",
            created_by=self.owner,
        )
        del_cust = self.client.delete(f"/api/v1/customers/{cust.id}/")
        self.assertEqual(del_cust.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
