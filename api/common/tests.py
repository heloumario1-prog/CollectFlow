from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from accounts.models import User
from audit.models import AuditEvent
from businesses.models import Business
from common.timezone_utils import get_beirut_today
from customers.models import Customer
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from followups.models import FollowUp
from payment_promises.models import PaymentPromise
from payments.models import Payment
from receivables.models import Receivable
from rest_framework.test import APIClient


class ApplicationWorkflowTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.today = get_beirut_today()
        cls.business = Business.objects.create(
            name="Isolated business", phone_e164="+96171123456"
        )
        cls.other_business = Business.objects.create(
            name="Other business", phone_e164="+96171123457"
        )
        cls.owner = cls.user("owner", cls.business, "OWNER")
        cls.staff = cls.user("staff", cls.business, "STAFF")
        cls.other = cls.user("other", cls.other_business, "OWNER")
        cls.customer = Customer.objects.create(
            business=cls.business,
            created_by=cls.owner,
            name="Customer",
            phone_e164="+96171123456",
            next_follow_up_on=cls.today,
        )
        cls.foreign_customer = Customer.objects.create(
            business=cls.other_business,
            created_by=cls.other,
            name="Foreign",
            phone_e164="+96171123457",
        )
        cls.rec = cls.receivable(cls.customer)
        cls.foreign_rec = cls.receivable(cls.foreign_customer)
        cls.promise = cls.make_promise(cls.rec)
        cls.foreign_promise = cls.make_promise(cls.foreign_rec)

    @classmethod
    def user(cls, name, business, role):
        return User.objects.create_user(
            f"{name}@example.test",
            password="Strong!Review48",
            business=business,
            full_name=name.title(),
            role=role,
        )

    @classmethod
    def receivable(cls, customer):
        return Receivable.objects.create(
            business=customer.business,
            customer=customer,
            created_by=customer.created_by,
            original_amount="100.00",
            due_date=cls.today - timedelta(days=1),
        )

    @classmethod
    def make_promise(cls, rec):
        return PaymentPromise.objects.create(
            receivable=rec,
            created_by=rec.created_by,
            amount="100.00",
            promised_on=cls.today - timedelta(days=1),
        )

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(self.owner)

    def pay(self, amount="40.00", promise=None, method="CASH"):
        response = self.client.post(
            "/api/v1/payments/",
            {
                "payment_promise": (promise or self.promise).pk,
                "amount": amount,
                "method": method,
                "paid_on": str(self.today),
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        return response.data["id"]

    def cancel(self):
        response = self.client.post(
            f"/api/v1/promises/{self.promise.pk}/cancel/",
            {"cancel_reason": "Customer changed installment plan"},
        )
        self.assertEqual(response.status_code, 200, response.data)

    def rows(self, response):
        self.assertEqual(response.status_code, 200, response.data)
        return response.data["results"]

    def test_api_pagination_is_stable_and_preserves_all_customer_records(self):
        Customer.objects.bulk_create(
            [
                Customer(
                    business=self.business,
                    created_by=self.owner,
                    name=f"Paged {index:02}",
                    phone_e164=f"+96171{200000+index}",
                )
                for index in range(26)
            ]
        )
        first = self.client.get("/api/v1/customers/")
        self.assertEqual(first.data["count"], 27)
        self.assertEqual(len(first.data["results"]), 25)
        second = self.client.get(first.data["next"])
        ids = [row["id"] for row in first.data["results"] + second.data["results"]]
        self.assertEqual(len(set(ids)), 27)
        self.assertIsNone(second.data["next"])

    def test_staff_management_and_audit_remain_tenant_and_owner_scoped(self):
        foreign_staff = self.user("foreign_staff", self.other_business, "STAFF")
        for action in ["deactivate", "reactivate", "reset-password"]:
            self.assertEqual(
                self.client.post(
                    f"/api/v1/staff/{foreign_staff.pk}/{action}/",
                    {"new_password": "Strong!Review99"},
                ).status_code,
                404,
            )
        self.assertEqual(
            self.client.patch(
                f"/api/v1/staff/{foreign_staff.pk}/", {"full_name": "Changed"}
            ).status_code,
            404,
        )
        self.pay()
        self.assertTrue(self.rows(self.client.get("/api/v1/audit/")))
        self.client.force_authenticate(self.other)
        self.assertFalse(self.rows(self.client.get("/api/v1/audit/")))
        self.client.force_authenticate(self.staff)
        self.assertEqual(self.client.get("/api/v1/audit/").status_code, 403)

    def test_tenant_lists_and_details_are_isolated(self):
        for path, own, foreign in [
            ("customers", self.customer, self.foreign_customer),
            ("receivables", self.rec, self.foreign_rec),
            ("promises", self.promise, self.foreign_promise),
        ]:
            self.assertEqual(
                [row["id"] for row in self.rows(self.client.get(f"/api/v1/{path}/"))],
                [own.pk],
            )
            self.assertEqual(
                self.client.get(f"/api/v1/{path}/{foreign.pk}/").status_code, 404
            )
            self.assertEqual(
                self.client.patch(
                    f"/api/v1/{path}/{foreign.pk}/", {}, format="json"
                ).status_code,
                404,
            )

    def test_related_fields_do_not_accept_foreign_records(self):
        for path, body in [
            (
                "receivables",
                {
                    "customer": self.foreign_customer.pk,
                    "original_amount": "10.00",
                    "due_date": str(self.today),
                },
            ),
            (
                "promises",
                {
                    "receivable": self.foreign_rec.pk,
                    "amount": "10.00",
                    "promised_on": str(self.today),
                },
            ),
            (
                "payments",
                {
                    "payment_promise": self.foreign_promise.pk,
                    "amount": "10.00",
                    "paid_on": str(self.today),
                    "method": "CASH",
                },
            ),
            ("followups", {"customer": self.foreign_customer.pk, "note": "Call"}),
        ]:
            self.assertEqual(
                self.client.post(f"/api/v1/{path}/", body, format="json").status_code,
                400,
            )

    def test_missing_and_foreign_custom_actions_return_404(self):
        foreign_payment = Payment.objects.create(
            payment_promise=self.foreign_promise,
            amount="10.00",
            paid_on=self.today,
            method="CASH",
            recorded_by=self.other,
        )
        for path in [
            f"promises/{self.foreign_promise.pk}/cancel",
            "promises/999999/cancel",
            f"payments/{foreign_payment.pk}/void",
            "payments/999999/void",
        ]:
            self.assertEqual(
                self.client.post(
                    f"/api/v1/{path}/",
                    {"cancel_reason": "Reason", "void_reason": "Reason"},
                ).status_code,
                404,
            )

    def test_payment_replay_key_is_durable_conflict_safe_and_tenant_scoped(self):
        body = {
            "payment_promise": self.promise.pk,
            "amount": "40.00",
            "method": "CASH",
            "paid_on": str(self.today),
        }
        first = self.client.post(
            "/api/v1/payments/", body, format="json", HTTP_IDEMPOTENCY_KEY="same-key"
        )
        second = self.client.post(
            "/api/v1/payments/", body, format="json", HTTP_IDEMPOTENCY_KEY="same-key"
        )
        self.assertEqual(first.status_code, 201, first.data)
        self.assertEqual(first.data, second.data)
        self.assertEqual(Payment.objects.count(), 1)
        self.assertEqual(
            AuditEvent.objects.filter(entity_type="Payment", action="CREATE").count(), 1
        )
        self.assertEqual(
            self.client.post(
                "/api/v1/payments/",
                {**body, "amount": "30.00"},
                format="json",
                HTTP_IDEMPOTENCY_KEY="same-key",
            ).status_code,
            409,
        )
        self.client.force_authenticate(self.other)
        self.assertEqual(
            self.client.post(
                "/api/v1/payments/",
                {**body, "payment_promise": self.foreign_promise.pk},
                format="json",
                HTTP_IDEMPOTENCY_KEY="same-key",
            ).status_code,
            201,
        )

    def test_active_payment_on_cancelled_promise_can_be_corrected_without_overcommitting(
        self,
    ):
        payment = self.pay("40.00")
        self.cancel()
        response = self.client.patch(
            f"/api/v1/payments/{payment}/", {"amount": "30.00"}
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.client.post(
            "/api/v1/promises/",
            {
                "receivable": self.rec.pk,
                "amount": "70.00",
                "promised_on": str(self.today),
            },
        )
        self.assertEqual(
            self.client.patch(
                f"/api/v1/payments/{payment}/", {"amount": "40.00"}
            ).status_code,
            400,
        )

    def test_void_requires_restoring_archived_financial_chain(self):
        payment = self.pay("100.00")
        self.client.post(f"/api/v1/receivables/{self.rec.pk}/archive/")
        self.assertEqual(
            self.client.post(
                f"/api/v1/payments/{payment}/void/", {"void_reason": "Mistake"}
            ).status_code,
            400,
        )

    def test_voided_payment_cannot_be_edited_and_replacement_completes(self):
        payment = self.pay("100.00")
        self.assertEqual(
            self.client.post(
                f"/api/v1/payments/{payment}/void/", {"void_reason": "Wrong method"}
            ).status_code,
            200,
        )
        self.assertEqual(
            self.client.patch(
                f"/api/v1/payments/{payment}/", {"amount": "1.00"}
            ).status_code,
            400,
        )
        self.pay("100.00", method="WHISH")
        self.assertEqual(
            self.client.get(f"/api/v1/promises/{self.promise.pk}/").data["status"],
            "KEPT",
        )
        self.assertEqual(Payment.objects.count(), 2)
        self.assertTrue(
            AuditEvent.objects.filter(entity_type="Payment", action="VOID").exists()
        )

    def test_cancellation_preserves_payments_and_limits_new_promises(self):
        self.pay("40.00")
        self.cancel()
        rec = self.client.get(f"/api/v1/receivables/{self.rec.pk}/").data
        self.assertEqual(Decimal(rec["paid_amount"]), 40)
        self.assertEqual(Decimal(rec["remaining_amount"]), 60)
        self.assertEqual(Decimal(rec["unpromised_amount"]), 60)
        body = {
            "receivable": self.rec.pk,
            "amount": "100.00",
            "promised_on": str(self.today),
        }
        self.assertEqual(self.client.post("/api/v1/promises/", body).status_code, 400)
        body["amount"] = "60.00"
        response = self.client.post("/api/v1/promises/", body)
        self.assertEqual(response.status_code, 201, response.data)
        self.pay("60.00", PaymentPromise.objects.get(pk=response.data["id"]))
        self.assertEqual(
            self.client.get(f"/api/v1/receivables/{self.rec.pk}/").data["status"],
            "PAID",
        )

    def test_receivable_update_response_uses_saved_principal_not_validation_cache(self):
        self.pay("100.00")
        response = self.client.patch(
            f"/api/v1/receivables/{self.rec.pk}/", {"original_amount": "150.00"}
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["remaining_amount"], "50.00")
        self.assertEqual(response.data["unpromised_amount"], "50.00")
        self.assertEqual(response.data["status"], "OVERDUE")

    def test_principal_cannot_be_reduced_below_active_commitments(self):
        self.pay("40.00")
        response = self.client.patch(
            f"/api/v1/receivables/{self.rec.pk}/", {"original_amount": "60.00"}
        )
        self.assertEqual(response.status_code, 400)
        self.rec.refresh_from_db()
        self.assertEqual(self.rec.original_amount, 100)

    def test_payment_move_without_amount_validates_target_and_recalculates_both_chains(
        self,
    ):
        payment = self.pay("40.00")
        target = self.receivable(self.customer)
        target_promise = self.make_promise(target)
        target_promise.amount = Decimal("20.00")
        target_promise.save()
        response = self.client.patch(
            f"/api/v1/payments/{payment}/", {"payment_promise": target_promise.pk}
        )
        self.assertEqual(response.status_code, 400, response.data)
        target_promise.amount = Decimal("100.00")
        target_promise.save()
        response = self.client.patch(
            f"/api/v1/payments/{payment}/",
            {"payment_promise": target_promise.pk, "recorded_by": self.staff.pk},
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(
            self.client.get(f"/api/v1/receivables/{self.rec.pk}/").data[
                "remaining_amount"
            ],
            "100.00",
        )
        self.assertEqual(
            self.client.get(f"/api/v1/receivables/{target.pk}/").data[
                "remaining_amount"
            ],
            "60.00",
        )
        self.assertEqual(Payment.objects.get(pk=payment).recorded_by_id, self.owner.pk)

    def test_payment_move_within_receivable_preserves_total_balance(self):
        payment = self.pay("40.00")
        self.client.patch(f"/api/v1/promises/{self.promise.pk}/", {"amount": "50.00"})
        response = self.client.post(
            "/api/v1/promises/",
            {
                "receivable": self.rec.pk,
                "amount": "50.00",
                "promised_on": str(self.today),
            },
        )
        self.assertEqual(response.status_code, 201, response.data)
        second = response.data["id"]
        moved = self.client.patch(
            f"/api/v1/payments/{payment}/", {"payment_promise": second}
        )
        self.assertEqual(moved.status_code, 200, moved.data)
        self.assertEqual(
            self.client.get(f"/api/v1/promises/{self.promise.pk}/").data[
                "remaining_amount"
            ],
            "50.00",
        )
        self.assertEqual(
            self.client.get(f"/api/v1/promises/{second}/").data["remaining_amount"],
            "10.00",
        )
        self.assertEqual(
            self.client.get(f"/api/v1/receivables/{self.rec.pk}/").data[
                "remaining_amount"
            ],
            "60.00",
        )

    def test_records_with_financial_history_cannot_be_reparented(self):
        self.pay()
        other_customer = Customer.objects.create(
            business=self.business,
            created_by=self.owner,
            name="Second",
            phone_e164="+96171123458",
        )
        other_rec = self.receivable(other_customer)
        self.assertEqual(
            self.client.patch(
                f"/api/v1/promises/{self.promise.pk}/", {"receivable": other_rec.pk}
            ).status_code,
            400,
        )
        self.assertEqual(
            self.client.patch(
                f"/api/v1/receivables/{self.rec.pk}/", {"customer": other_customer.pk}
            ).status_code,
            400,
        )

    def test_overpayment_future_date_and_invalid_method_are_rejected(self):
        self.pay("90.00")
        for extra in [
            {"amount": "11.00"},
            {"paid_on": str(self.today + timedelta(days=1))},
            {"method": "CARD"},
            {"amount": "0.00"},
        ]:
            body = {
                "payment_promise": self.promise.pk,
                "amount": "1.00",
                "paid_on": str(self.today),
                "method": "CASH",
                **extra,
            }
            self.assertEqual(
                self.client.post("/api/v1/payments/", body).status_code, 400
            )

    def test_dashboard_matches_partial_cancelled_voided_and_archived_records(self):
        self.pay("40.00")
        voided = self.pay("10.00", method="WHISH")
        self.client.post(f"/api/v1/payments/{voided}/void/", {"void_reason": "Mistake"})
        self.cancel()
        data = self.client.get("/api/v1/dashboard/?period=today").data
        for name, expected in {
            "total_outstanding": 60,
            "total_overdue": 60,
            "cash_collected": 40,
            "whish_collected": 0,
            "total_collected": 40,
            "total_unpromised": 60,
            "broken_promises_count": 0,
            "due_followups_count": 1,
        }.items():
            self.assertEqual(Decimal(str(data["metrics"][name])), expected, name)

    def test_dashboard_invalid_periods_and_ranges_are_validation_errors(self):
        for query in [
            "period=nope",
            "period=custom",
            "from=2026-01-01",
            "from=nope&to=nope",
            "from=2026-02-01&to=2026-01-01",
        ]:
            self.assertEqual(
                self.client.get(f"/api/v1/dashboard/?{query}").status_code, 400
            )

    def test_derived_api_status_filters(self):
        self.assertEqual(
            len(self.rows(self.client.get("/api/v1/promises/?status=BROKEN"))), 1
        )
        self.assertEqual(
            len(self.rows(self.client.get("/api/v1/promises/?status=KEPT"))), 0
        )
        self.pay("100.00")
        self.assertEqual(
            len(self.rows(self.client.get("/api/v1/promises/?status=KEPT"))), 1
        )
        self.assertEqual(
            len(self.rows(self.client.get("/api/v1/receivables/?status=PAID"))), 1
        )
        self.assertEqual(
            len(self.rows(self.client.get("/api/v1/receivables/?status=OVERDUE"))), 0
        )

    def test_malformed_list_filters_are_400(self):
        for path in [
            "payments/?customer=nope",
            "promises/?promised_on_from=nope",
            "receivables/?due_date_to=nope",
            "followups/?customer=-1",
        ]:
            self.assertEqual(self.client.get(f"/api/v1/{path}").status_code, 400)

    def test_financial_lists_and_dashboard_have_bounded_query_counts(self):
        def count(path):
            with CaptureQueriesContext(connection) as queries:
                response = self.client.get(path)
                self.assertEqual(response.status_code, 200)
            return len(queries)

        paths = [
            "/api/v1/customers/",
            "/api/v1/receivables/",
            "/api/v1/promises/",
            "/api/v1/dashboard/",
        ]
        before = [count(path) for path in paths]
        for _ in range(8):
            self.make_promise(self.receivable(self.customer))
        after = [count(path) for path in paths]
        self.assertEqual(before, after)

    def test_archive_rules_restore_and_no_hard_delete(self):
        self.assertEqual(
            self.client.post(
                f"/api/v1/customers/{self.customer.pk}/archive/"
            ).status_code,
            400,
        )
        self.assertEqual(
            self.client.post(f"/api/v1/receivables/{self.rec.pk}/archive/").status_code,
            400,
        )
        self.pay("100.00")
        self.assertEqual(
            self.client.post(f"/api/v1/receivables/{self.rec.pk}/archive/").status_code,
            200,
        )
        self.assertEqual(
            self.client.get(f"/api/v1/receivables/{self.rec.pk}/").status_code, 404
        )
        self.assertEqual(
            self.client.patch(
                f"/api/v1/receivables/{self.rec.pk}/?is_archived=all",
                {"description": "No"},
            ).status_code,
            400,
        )
        self.assertEqual(
            self.client.post(
                f"/api/v1/receivables/{self.rec.pk}/restore/?is_archived=true"
            ).status_code,
            200,
        )
        for path, obj in [
            ("customers", self.customer),
            ("receivables", self.rec),
            ("promises", self.promise),
        ]:
            self.assertEqual(
                self.client.delete(f"/api/v1/{path}/{obj.pk}/").status_code, 405
            )

    def test_followup_can_clear_links_and_schedule_without_stale_relationships(self):
        followup = FollowUp.objects.create(
            customer=self.customer,
            receivable=self.rec,
            payment_promise=self.promise,
            created_by=self.owner,
            note="Call",
            occurred_at=timezone.now(),
        )
        response = self.client.patch(
            f"/api/v1/followups/{followup.pk}/",
            {"receivable": None, "payment_promise": None, "next_follow_up_on": None},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        followup.refresh_from_db()
        self.customer.refresh_from_db()
        self.assertIsNone(followup.receivable_id)
        self.assertIsNone(followup.payment_promise_id)
        self.assertIsNone(self.customer.next_follow_up_on)

    def test_audit_failure_rolls_back_payment(self):
        with patch(
            "payments.views.log_audit_event",
            side_effect=RuntimeError("Audit unavailable"),
        ):
            with self.assertRaises(RuntimeError):
                self.client.post(
                    "/api/v1/payments/",
                    {
                        "payment_promise": self.promise.pk,
                        "amount": "10.00",
                        "paid_on": str(self.today),
                        "method": "CASH",
                    },
                )
        self.assertEqual(Payment.objects.count(), 0)

    def test_inactive_users_and_businesses_cannot_access_domain_or_manage_team(self):
        for obj in [self.owner, self.business]:
            obj.is_active = False
            obj.save()
            for path in ["customers/", "payments/", "dashboard/", "staff/"]:
                self.assertEqual(self.client.get(f"/api/v1/{path}").status_code, 403)
            obj.is_active = True
            obj.save()

    def test_staff_daily_work_but_not_team_or_business_changes(self):
        self.client.force_authenticate(self.staff)
        self.pay()
        for path in ["staff/", "business/"]:
            self.assertEqual(self.client.post(f"/api/v1/{path}", {}).status_code, 403)
        self.assertEqual(
            self.client.patch("/api/v1/business/", {"name": "Changed"}).status_code, 403
        )

    def test_customer_duplicate_phone_update_is_validation_error(self):
        customer = Customer.objects.create(
            business=self.business,
            created_by=self.owner,
            name="Other",
            phone_e164="+96171123458",
        )
        response = self.client.patch(
            f"/api/v1/customers/{customer.pk}/",
            {"phone_country": "LB", "phone_national_number": "71123456"},
        )
        self.assertEqual(response.status_code, 400, response.data)


class SessionAndRegistrationTests(TestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)
        self.password = " Strong!Review48 "
        self.body = {
            "business": {"name": "Isolated registration", "phone_e164": "+96171123456"},
            "owner": {
                "full_name": "Review Manager",
                "email": "MANAGER@example.test",
                "password": self.password,
            },
        }

    def post(self, path, body):
        self.client.get("/api/v1/auth/csrf/")
        return self.client.post(
            f"/api/v1/{path}",
            body,
            format="json",
            HTTP_X_CSRFTOKEN=self.client.cookies["csrftoken"].value,
        )

    def register(self):
        response = self.post("auth/register/", self.body)
        self.assertEqual(response.status_code, 201, response.data)

    def login(self):
        response = self.post(
            "auth/login/", {"email": "manager@example.test", "password": self.password}
        )
        self.assertEqual(response.status_code, 200, response.data)

    def test_register_csrf_normalization_atomic_duplicate_and_no_session(self):
        self.assertEqual(
            self.client.post(
                "/api/v1/auth/register/", self.body, format="json"
            ).status_code,
            403,
        )
        self.register()
        self.assertEqual(User.objects.get().email, "manager@example.test")
        self.assertEqual(self.client.get("/api/v1/auth/me/").status_code, 403)
        self.assertEqual(self.post("auth/register/", self.body).status_code, 400)
        self.assertEqual(Business.objects.count(), 1)

    def test_registration_race_rolls_back_losing_business_and_returns_email_error(self):
        from accounts.serializers import RegisterSerializer
        from rest_framework.exceptions import ValidationError

        first = RegisterSerializer(data=self.body)
        second = RegisterSerializer(data=self.body)
        first.is_valid(raise_exception=True)
        second.is_valid(raise_exception=True)
        first.save()
        with self.assertRaises(ValidationError) as error:
            second.save()
        self.assertIn("email", error.exception.detail["owner"])
        self.assertEqual(Business.objects.count(), 1)
        self.assertEqual(User.objects.count(), 1)

    def test_login_password_whitespace_session_csrf_password_change_and_logout(self):
        self.register()
        self.login()
        self.assertEqual(self.client.get("/api/v1/auth/me/").status_code, 200)
        self.assertEqual(self.client.post("/api/v1/auth/logout/").status_code, 403)
        changed = self.post(
            "auth/change-password/",
            {"old_password": self.password, "new_password": "Another!Review92"},
        )
        self.assertEqual(changed.status_code, 200, changed.data)
        self.assertEqual(self.client.get("/api/v1/auth/me/").status_code, 200)
        self.assertEqual(self.post("auth/logout/", {}).status_code, 204)
        self.assertEqual(self.client.get("/api/v1/auth/me/").status_code, 403)

    def test_team_lifecycle_and_reset_invalidate_staff_session(self):
        self.register()
        self.login()
        response = self.post(
            "staff/",
            {
                "full_name": "Review Staff",
                "email": "STAFF@example.test",
                "password": "Staff!Review48",
                "role": "OWNER",
                "business": 999,
            },
        )
        self.assertEqual(response.status_code, 201, response.data)
        staff_id = response.data["id"]
        self.assertEqual(response.data["role"], "STAFF")
        staff_client = APIClient()
        self.assertTrue(
            staff_client.login(username="staff@example.test", password="Staff!Review48")
        )
        self.assertEqual(staff_client.get("/api/v1/auth/me/").status_code, 200)
        self.assertEqual(
            self.post(
                f"staff/{staff_id}/reset-password/",
                {"new_password": "New!StaffReview92"},
            ).status_code,
            200,
        )
        self.assertEqual(staff_client.get("/api/v1/auth/me/").status_code, 403)
        self.assertEqual(
            self.post(f"staff/{staff_id}/deactivate/", {}).status_code, 200
        )
        self.assertFalse(
            staff_client.login(
                username="staff@example.test", password="New!StaffReview92"
            )
        )
        self.assertEqual(
            self.post(f"staff/{staff_id}/reactivate/", {}).status_code, 200
        )
        self.assertTrue(
            staff_client.login(
                username="staff@example.test", password="New!StaffReview92"
            )
        )

    def test_inactive_business_cannot_login(self):
        self.register()
        Business.objects.update(is_active=False)
        self.assertEqual(
            self.post(
                "auth/login/",
                {"email": "manager@example.test", "password": self.password},
            ).status_code,
            400,
        )
