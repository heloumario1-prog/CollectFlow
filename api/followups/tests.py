from unittest.mock import patch

from accounts.models import User
from audit.models import AuditEvent
from businesses.models import Business
from customers.models import Customer
from django.test import TestCase
from django.utils import timezone
from followups.models import FollowUp
from followups.services import change_lifecycle
from rest_framework.test import APIClient


class FollowUpLifecycleTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.business = Business.objects.create(name="Test business")
        cls.other_business = Business.objects.create(name="Other business")
        cls.owner = User.objects.create_user(
            "owner@example.test", business=cls.business, role="OWNER", full_name="Owner"
        )
        cls.staff = User.objects.create_user(
            "staff@example.test", business=cls.business, role="STAFF", full_name="Staff"
        )
        cls.other_owner = User.objects.create_user(
            "other@example.test",
            business=cls.other_business,
            role="OWNER",
            full_name="Other",
        )
        cls.customer = Customer.objects.create(
            business=cls.business,
            created_by=cls.owner,
            name="Customer",
            phone_e164="+96171123456",
            next_follow_up_on=timezone.localdate(),
        )
        cls.other_customer = Customer.objects.create(
            business=cls.other_business,
            created_by=cls.other_owner,
            name="Other",
            phone_e164="+96171123457",
        )

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(self.owner)
        self.followup = self.create_followup()

    def create_followup(self, customer=None):
        customer = customer or self.customer
        return FollowUp.objects.create(
            customer=customer,
            created_by=customer.created_by,
            occurred_at=timezone.now(),
            note="Call about invoice.",
        )

    def url(self, action, followup=None, prefix="followups"):
        return f"/api/v1/{prefix}/{(followup or self.followup).pk}/{action}/"

    def test_owner_and_staff_can_remove_without_deleting_history(self):
        for user in (self.owner, self.staff):
            with self.subTest(role=user.role):
                followup = self.create_followup()
                self.client.force_authenticate(user)
                response = self.client.post(
                    self.url("archive", followup), {"archived_by": self.other_owner.pk}
                )
                self.assertEqual(response.status_code, 204)
                followup.refresh_from_db()
                self.assertIsNotNone(followup.archived_at)
                self.assertEqual(followup.archived_by, user)
                self.assertTrue(
                    AuditEvent.objects.filter(
                        entity_type="FollowUp",
                        entity_id=followup.pk,
                        action="ARCHIVE",
                        actor_user=user,
                    ).exists()
                )
                response = self.client.get("/api/v1/followups/")
                rows = (
                    response.data.get("results", [])
                    if isinstance(response.data, dict)
                    else response.data
                )
                self.assertNotIn(followup.pk, [row["id"] for row in rows])
                self.assertEqual(
                    self.client.post(self.url("archive", followup)).status_code, 404
                )

    def test_completion_is_separate_idempotent_and_retained_after_removal(self):
        response = self.client.post(self.url("complete"))
        self.assertEqual(response.status_code, 200)
        self.assertIsNotNone(response.data["completed_at"])
        self.followup.refresh_from_db()
        completed_at = self.followup.completed_at
        self.assertEqual(self.followup.completed_by, self.owner)
        self.assertIsNone(self.followup.archived_at)
        self.assertEqual(self.client.post(self.url("complete")).status_code, 200)
        self.followup.refresh_from_db()
        self.assertEqual(self.followup.completed_at, completed_at)
        self.assertEqual(
            AuditEvent.objects.filter(
                entity_id=self.followup.pk, entity_type="FollowUp"
            ).count(),
            1,
        )
        self.assertEqual(self.client.post(self.url("archive")).status_code, 204)
        self.followup.refresh_from_db()
        self.assertEqual(self.followup.completed_at, completed_at)
        self.customer.refresh_from_db()
        self.assertIsNotNone(self.customer.next_follow_up_on)

    def test_foreign_tenant_and_missing_records_cannot_be_changed(self):
        foreign = self.create_followup(self.other_customer)
        for action in ("archive", "complete"):
            self.assertEqual(
                self.client.post(self.url(action, foreign)).status_code, 404
            )
            self.assertEqual(
                self.client.post(f"/api/v1/followups/999999/{action}/").status_code, 404
            )
        foreign.refresh_from_db()
        self.assertIsNone(foreign.archived_at)
        self.assertIsNone(foreign.completed_at)
        self.assertEqual(AuditEvent.objects.count(), 0)

    def test_authentication_business_permissions_and_csrf(self):
        self.client.force_authenticate(None)
        for action in ("archive", "complete"):
            self.assertEqual(self.client.post(self.url(action)).status_code, 403)
        self.client.force_authenticate(self.owner)
        self.business.is_active = False
        self.business.save(update_fields=["is_active"])
        for action in ("archive", "complete"):
            self.assertEqual(self.client.post(self.url(action)).status_code, 403)
        self.business.is_active = True
        self.business.save(update_fields=["is_active"])
        session_client = APIClient(enforce_csrf_checks=True)
        session_client.force_login(self.owner)
        self.assertEqual(session_client.post(self.url("archive")).status_code, 403)
        self.followup.refresh_from_db()
        self.assertIsNone(self.followup.archived_at)

    def test_audit_failure_rolls_back_removal(self):
        with patch(
            "followups.services.log_audit_event",
            side_effect=RuntimeError("Audit unavailable"),
        ):
            with self.assertRaises(RuntimeError):
                change_lifecycle(
                    followup_id=self.followup.pk, actor=self.owner, archive=True
                )
        self.followup.refresh_from_db()
        self.assertIsNone(self.followup.archived_at)
        self.assertIsNone(self.followup.archived_by)

    def test_lifecycle_fields_not_client_editable_and_delete_disabled(self):
        detail = f"/api/v1/followups/{self.followup.pk}/"
        response = self.client.patch(
            detail,
            {
                "completed_at": timezone.now().isoformat(),
                "archived_at": timezone.now().isoformat(),
                "completed_by": self.other_owner.pk,
                "archived_by": self.other_owner.pk,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.followup.refresh_from_db()
        self.assertIsNone(self.followup.completed_at)
        self.assertIsNone(self.followup.archived_at)
        self.assertEqual(self.client.delete(detail).status_code, 405)
        self.assertTrue(FollowUp.objects.filter(pk=self.followup.pk).exists())

    def test_hyphenated_alias_has_same_actions(self):
        self.assertEqual(
            self.client.post(self.url("complete", prefix="follow-ups")).status_code, 200
        )
        self.assertEqual(
            self.client.post(self.url("archive", prefix="follow-ups")).status_code, 204
        )
