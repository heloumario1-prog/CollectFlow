import os
import sys
import django

# Setup Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from decimal import Decimal
from datetime import timedelta
from rest_framework.test import APIClient
from accounts.models import User
from businesses.models import Business
from customers.models import Customer
from receivables.models import Receivable
from payment_promises.models import PaymentPromise
from payments.models import Payment
from audit.models import AuditEvent
from common.timezone_utils import get_beirut_today


def run_simulations():
    print("=" * 70)
    print("   COLLECTFLOW MVP BACKEND: MULTI-SCENARIO SIMULATION RUNNER")
    print("=" * 70)
    client = APIClient()
    today = get_beirut_today()
    print(f"Current Date (Asia/Beirut): {today}\n")

    # Clean up any previous test simulation records for idempotency
    from followups.models import FollowUp
    FollowUp.objects.all().delete()
    AuditEvent.objects.all().delete()
    Payment.objects.all().delete()
    PaymentPromise.objects.all().delete()
    Receivable.objects.all().delete()
    Customer.objects.all().delete()
    User.objects.filter(email__endswith="@cedar.com").delete()
    User.objects.filter(email__endswith="@tripoli.com").delete()
    Business.objects.filter(name__icontains="Cedar").delete()
    Business.objects.filter(name__icontains="Tripoli").delete()



    # SIMULATION 1: Zainab's Auth & Organization Setup
    # -------------------------------------------------------------
    print(">>> SIMULATION 1: Authentication & Staff Lifecycle")
    reg_data = {
        "business": {
            "name": "Cedar Wholesale SARL",
            "phone_e164": "+9611800900",
            "base_currency": "USD",
            "timezone": "Asia/Beirut",
        },
        "owner": {
            "full_name": "Georges Abou Rjeily",
            "email": "georges@cedar.com",
            "password": "Password123!",
        },
    }
    r = client.post("/api/v1/auth/register/", reg_data, format="json")
    assert r.status_code == 201, f"Register failed: {r.data}"
    print("  [PASS] Owner & Business registered successfully.")

    # Login
    r = client.post("/api/v1/auth/login/", {"email": "georges@cedar.com", "password": "Password123!"}, format="json")
    assert r.status_code == 200, f"Login failed: {r.data}"
    assert r.data["role"] == "OWNER"
    print("  [PASS] Session login succeeded for OWNER.")

    # Me check
    r = client.get("/api/v1/auth/me/")
    assert r.status_code == 200 and r.data["email"] == "georges@cedar.com"
    print("  [PASS] /api/v1/auth/me/ returned correct session profile.")

    # Business settings
    r = client.get("/api/v1/business/")
    assert r.status_code == 200 and r.data["name"] == "Cedar Wholesale SARL"
    r = client.patch("/api/v1/business/", {"name": "Cedar Wholesale & Cleaning Co."}, format="json")
    assert r.status_code == 200 and r.data["name"] == "Cedar Wholesale & Cleaning Co."
    print("  [PASS] /api/v1/business/ GET & PATCH verified.")

    # Staff creation
    r = client.post("/api/v1/staff/", {
        "full_name": "Zeinab Hammoud",
        "email": "zeinab.staff@cedar.com",
        "password": "StaffPassword123!"
    }, format="json")
    assert r.status_code == 201, f"Staff creation failed: {r.data}"
    staff_id = r.data["id"]
    print("  [PASS] Staff account created via /api/v1/staff/.")

    # Staff deactivation & reactivation
    r = client.post(f"/api/v1/staff/{staff_id}/deactivate/")
    assert r.status_code == 200 and not r.data["is_active"]
    r = client.post(f"/api/v1/staff/{staff_id}/reactivate/")
    assert r.status_code == 200 and r.data["is_active"]
    print("  [PASS] Staff deactivate & reactivate flow verified.")

    # -------------------------------------------------------------
    # SIMULATION 2: Customer Onboarding & Phone Normalization
    # -------------------------------------------------------------
    print("\n>>> SIMULATION 2: Customer Management & Phone Normalization")
    # Lebanese customer
    r = client.post("/api/v1/customers/", {
        "name": "Supermarket Al-Amir",
        "phone_country": "LB",
        "phone_national_number": "70 123 456",
        "notes": "Prefers WhatsApp reminders in Arabic."
    }, format="json")
    assert r.status_code == 201, f"Customer create failed: {r.data}"
    assert r.data["phone_e164"] == "+96170123456"
    assert r.data["whatsapp_url"] == "https://wa.me/96170123456"
    cust_id = r.data["id"]
    print(f"  [PASS] Lebanese customer normalized: {r.data['phone_e164']} -> {r.data['whatsapp_url']}")

    # French customer (international support)
    r = client.post("/api/v1/customers/", {
        "name": "Paris Import Partner",
        "phone_country": "FR",
        "phone_national_number": "06 12 34 56 78"
    }, format="json")
    assert r.status_code == 201
    assert r.data["phone_e164"] == "+33612345678"
    print(f"  [PASS] International French customer normalized: {r.data['phone_e164']}")

    # Invalid phone rejection
    r = client.post("/api/v1/customers/", {
        "name": "Bad Phone",
        "phone_country": "LB",
        "phone_national_number": "00000"
    }, format="json")
    assert r.status_code == 400
    print("  [PASS] Invalid phone numbers correctly rejected with 400.")

    # Duplicate phone protection
    r = client.post("/api/v1/customers/", {
        "name": "Duplicate Number",
        "phone_country": "LB",
        "phone_national_number": "70 123 456"
    }, format="json")
    assert r.status_code == 400
    print("  [PASS] Duplicate phone in same business rejected.")

    # -------------------------------------------------------------
    # SIMULATION 3: Receivables & Payment Promises
    # -------------------------------------------------------------
    print("\n>>> SIMULATION 3: Receivables & Payment Promises Engine")
    r = client.post("/api/v1/receivables/", {
        "customer": cust_id,
        "original_amount": "1000.00",
        "reference": "INV-2026-001",
        "due_date": (today + timedelta(days=30)).isoformat(),
        "notes": "50 boxes of cleaning detergents"
    }, format="json")
    assert r.status_code == 201
    rec_id = r.data["id"]
    assert r.data["status"] == "OPEN"
    assert r.data["unpromised_amount"] == "1000.00"
    print("  [PASS] $1,000 receivable created (Status: OPEN, Unpromised: $1000).")

    # Promise 1 ($400)
    r = client.post("/api/v1/promises/", {
        "receivable": rec_id,
        "amount": "400.00",
        "promised_on": (today + timedelta(days=7)).isoformat(),
        "note": "First installment"
    }, format="json")
    assert r.status_code == 201
    p1_id = r.data["id"]

    # Promise 2 ($300)
    r = client.post("/api/v1/promises/", {
        "receivable": rec_id,
        "amount": "300.00",
        "promised_on": (today + timedelta(days=14)).isoformat(),
        "note": "Second installment"
    }, format="json")
    assert r.status_code == 201
    p2_id = r.data["id"]

    # Check unpromised balance ($1000 - $700 = $300)
    r = client.get(f"/api/v1/receivables/{rec_id}/")
    assert r.data["unpromised_amount"] == "300.00"
    print("  [PASS] Promises allocated: Unpromised capacity dynamically drops to $300.")

    # Over-promising rejected ($400 exceeds $300 remaining capacity)
    r = client.post("/api/v1/promises/", {
        "receivable": rec_id,
        "amount": "400.00",
        "promised_on": (today + timedelta(days=21)).isoformat()
    }, format="json")
    assert r.status_code == 400
    print("  [PASS] Over-promising rejected by capacity guard.")

    # -------------------------------------------------------------
    # SIMULATION 4: Cash & Whish Payments Engine
    # -------------------------------------------------------------
    print("\n>>> SIMULATION 4: Cash and Whish Payment Engine")
    # Payment 1 ($150 Cash on Promise 1)
    r = client.post("/api/v1/payments/", {
        "payment_promise": p1_id,
        "amount": "150.00",
        "paid_on": today.isoformat(),
        "method": "CASH",
        "note": "Cash collected at warehouse"
    }, format="json")
    assert r.status_code == 201
    pay1_id = r.data["id"]

    # Check Promise 1 remaining ($400 - $150 = $250, PENDING)
    r = client.get(f"/api/v1/promises/{p1_id}/")
    assert r.data["remaining_amount"] == "250.00"
    assert r.data["status"] == "PENDING"
    print("  [PASS] $150 Cash payment recorded (Promise 1 remaining: $250, PENDING).")

    # Overpaying promise rejected ($300 exceeds $250 remaining)
    r = client.post("/api/v1/payments/", {
        "payment_promise": p1_id,
        "amount": "300.00",
        "paid_on": today.isoformat(),
        "method": "WHISH"
    }, format="json")
    assert r.status_code == 400
    print("  [PASS] Overpaying promise rejected.")

    # Payment 2 ($250 Whish on Promise 1 -> Fulfills Promise 1!)
    r = client.post("/api/v1/payments/", {
        "payment_promise": p1_id,
        "amount": "250.00",
        "paid_on": today.isoformat(),
        "method": "WHISH",
        "note": "Whish transfer ref WSH-449102"
    }, format="json")
    assert r.status_code == 201

    # Check Promise 1 is now KEPT
    r = client.get(f"/api/v1/promises/{p1_id}/")
    assert r.data["remaining_amount"] == "0.00"
    assert r.data["status"] == "KEPT"
    print("  [PASS] $250 Whish payment completed: Promise 1 is now KEPT ($0 remaining).")

    # Check Receivable status is PARTIALLY_PAID ($400 paid, $600 remaining)
    r = client.get(f"/api/v1/receivables/{rec_id}/")
    assert r.data["paid_amount"] == "400.00"
    assert r.data["remaining_amount"] == "600.00"
    assert r.data["status"] == "PARTIALLY_PAID"
    print("  [PASS] Receivable balance recalculated: $400 paid, $600 remaining, PARTIALLY_PAID.")

    # Future date rejected
    r = client.post("/api/v1/payments/", {
        "payment_promise": p2_id,
        "amount": "100.00",
        "paid_on": (today + timedelta(days=2)).isoformat(),
        "method": "CASH"
    }, format="json")
    assert r.status_code == 400
    print("  [PASS] Payments with future dates in Beirut correctly rejected.")

    # -------------------------------------------------------------
    # SIMULATION 5: Void-and-Replace Workflow & Audit Trail
    # -------------------------------------------------------------
    print("\n>>> SIMULATION 5: Void-and-Replace & Audit Log")
    # Record payment on Promise 2
    r = client.post("/api/v1/payments/", {
        "payment_promise": p2_id,
        "amount": "100.00",
        "paid_on": today.isoformat(),
        "method": "CASH"
    }, format="json")
    assert r.status_code == 201
    pay_mistake_id = r.data["id"]

    # Void payment
    r = client.post(f"/api/v1/payments/{pay_mistake_id}/void/", {
        "void_reason": "Customer entered wrong cash denomination"
    }, format="json")
    assert r.status_code == 200
    assert r.data["is_voided"] is True
    print("  [PASS] Payment successfully voided with mandatory reason.")

    # Verify Promise 2 balance restored
    r = client.get(f"/api/v1/promises/{p2_id}/")
    assert r.data["remaining_amount"] == "300.00"
    print("  [PASS] Promise balance dynamically restored after void.")

    # Cannot void twice
    r = client.post(f"/api/v1/payments/{pay_mistake_id}/void/", {
        "void_reason": "Attempting second void"
    }, format="json")
    assert r.status_code == 400
    print("  [PASS] Cannot void an already voided payment.")

    # Verify Audit Events
    r = client.get("/api/v1/audit/")
    assert r.status_code == 200
    actions = [ev["action"] for ev in r.data["results"]]
    assert "VOID" in actions and "CREATE" in actions
    print("  [PASS] Protected AuditEvent trail verified.")

    # -------------------------------------------------------------
    # SIMULATION 6: WhatsApp Follow-ups & Live Dashboard
    # -------------------------------------------------------------
    print("\n>>> SIMULATION 6: WhatsApp Follow-up & Live Dashboard")
    # Log manual follow-up
    r = client.post("/api/v1/followups/", {
        "customer": cust_id,
        "receivable": rec_id,
        "note": "Spoke on WhatsApp. Confirmed $400 received. Customer will pay second installment next week.",
        "next_follow_up_on": today.isoformat()
    }, format="json")
    assert r.status_code == 201
    print("  [PASS] Manual WhatsApp follow-up recorded.")

    # Live Dashboard query
    r = client.get("/api/v1/dashboard/")
    assert r.status_code == 200
    metrics = r.data["metrics"]
    queues = r.data["queues"]
    assert Decimal(metrics["total_outstanding"]) == Decimal("600.00")
    assert Decimal(metrics["cash_collected"]) == Decimal("150.00")
    assert Decimal(metrics["whish_collected"]) == Decimal("250.00")
    assert Decimal(metrics["total_collected"]) == Decimal("400.00")
    print(f"  [PASS] Live Dashboard verified: Total Outstanding = ${metrics['total_outstanding']}, Collected = ${metrics['total_collected']} (Cash: ${metrics['cash_collected']}, Whish: ${metrics['whish_collected']})")
    assert len(queues["due_followups"]) >= 1
    print(f"  [PASS] Follow-up queue contains {len(queues['due_followups'])} customers due for WhatsApp follow-up.")

    # -------------------------------------------------------------
    # SIMULATION 7: Tenant Isolation
    # -------------------------------------------------------------
    print("\n>>> SIMULATION 7: Multi-Tenant Isolation")
    # Register second independent supplier
    client2 = APIClient()
    client2.post("/api/v1/auth/register/", {
        "business": {
            "name": "Tripoli Supplies Ltd",
            "phone_e164": "+9616555666",
        },
        "owner": {
            "full_name": "Tripoli Owner",
            "email": "owner@tripoli.com",
            "password": "Password123!",
        },
    }, format="json")
    client2.post("/api/v1/auth/login/", {"email": "owner@tripoli.com", "password": "Password123!"}, format="json")

    # Tenant 2 cannot see Tenant 1 customers
    r = client2.get("/api/v1/customers/")
    assert r.data["count"] == 0
    # Tenant 2 cannot see Tenant 1 receivables
    r = client2.get("/api/v1/receivables/")
    assert r.data["count"] == 0
    print("  [PASS] Cross-tenant data isolation strictly enforced.")

    print("\n" + "=" * 70)
    print("   ALL 7 END-TO-END SIMULATIONS PASSED PERFECTLY!")
    print("=" * 70)


if __name__ == "__main__":
    run_simulations()
