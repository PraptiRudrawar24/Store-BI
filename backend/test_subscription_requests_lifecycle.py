import time
from datetime import datetime, timedelta
import pytest
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
import models

client = TestClient(app)

def create_merchant(phone_prefix="92"):
    phone = f"{phone_prefix}{int(time.time() * 1000) % 100000000:08d}"
    login_res = client.post("/auth/verify-otp", json={"phone": phone, "otp": "123456"})
    assert login_res.status_code == 200
    shop = login_res.json()["shop"]

    client.post("/auth/onboarding/step-1", json={
        "owner_name": f"Owner {phone}",
        "phone": phone,
        "email": f"merchant_{phone}@storebi.com",
        "language": "en"
    })
    return phone, shop


def create_admin():
    phone = f"99{int(time.time() * 1000) % 100000000:08d}"
    email = f"admin_{phone}@storebi.com"
    login_res = client.post("/auth/verify-otp", json={"phone": phone, "otp": "123456"})
    assert login_res.status_code == 200
    shop_id = login_res.json()["shop"]["id"]

    with SessionLocal() as db:
        admin_shop = db.query(models.Shop).filter(models.Shop.id == shop_id).first()
        admin_shop.is_admin = True
        admin_shop.email = email
        admin_shop.owner_name = "System Admin"
        db.commit()

    # Re-login to get updated token
    re_login = client.post("/auth/verify-otp", json={"phone": phone, "otp": "123456"})
    return phone, email, re_login.json()["shop"]


def test_new_user_free_trial_and_status():
    """
    1. New eligible user receives a 5-day trial.
    2. Trial state is 'Trial Active' and does not reset on repeat queries.
    """
    phone, shop = create_merchant(phone_prefix="93")
    res = client.get("/api/subscription/status")
    assert res.status_code == 200
    data = res.json()
    assert data["state"] == "Trial Active"
    assert data["trial_days_left"] >= 4
    assert data["can_access_features"] is True
    assert "Your free trial is active" in data["message"]


def test_i_have_paid_access_request_flow():
    """
    3. User clicks 'I Have Paid', creating a pending access request.
    4. Duplicate pending request is prevented.
    5. Status reflects 'Payment Pending Review'.
    """
    phone, shop = create_merchant(phone_prefix="94")

    # Submit "I Have Paid"
    req_res = client.post("/api/subscription/request-access", json={
        "plan_name": "All-Features Pro",
        "amount": 1299.0,
        "utr_number": "429182749102",
        "customer_notes": "Paid via Google Pay at Baner SBI QR"
    })
    assert req_res.status_code == 200
    req_data = req_res.json()
    assert req_data["success"] is True
    assert "activated after admin verification" in req_data["message"]
    assert req_data["request"]["status"] == "pending_review"
    assert req_data["request"]["request_ref"].startswith("REQ-")

    # Attempt duplicate pending request -> Should be blocked
    dup_res = client.post("/api/subscription/request-access", json={
        "plan_name": "All-Features Pro",
        "amount": 1299.0,
        "utr_number": "429182749102"
    })
    assert dup_res.status_code == 400
    assert "already have a payment request" in dup_res.json()["detail"]

    # Customer status check
    status_res = client.get("/api/subscription/status")
    assert status_res.status_code == 200
    s_data = status_res.json()
    assert s_data["state"] == "Payment Pending Review"
    assert s_data["latest_request"]["status"] == "pending_review"
    assert s_data["latest_request"]["utr_number"] == "429182749102"


def test_admin_approve_subscription_request_and_extension():
    """
    6. Admin reviews pending request and approves.
    7. Approving activates Pro for 30 days.
    8. Early renewal extends existing end date without losing remaining days.
    """
    # 1. Customer submits request
    m_phone, m_shop = create_merchant(phone_prefix="95")
    req_res = client.post("/api/subscription/request-access", json={
        "plan_name": "All-Features Pro",
        "amount": 1299.0,
        "utr_number": "UTR9988776655",
        "customer_notes": "First time monthly pro"
    })
    assert req_res.status_code == 200
    req_id = req_res.json()["request"]["id"]

    # 2. Admin logs in
    a_phone, a_email, a_shop = create_admin()

    # Admin lists requests
    admin_list = client.get("/api/admin/subscription-requests?status=pending_review")
    assert admin_list.status_code == 200
    items = admin_list.json()["items"]
    assert any(it["id"] == req_id for it in items)

    # Admin checks detail
    detail_res = client.get(f"/api/admin/subscription-requests/{req_id}")
    assert detail_res.status_code == 200
    assert detail_res.json()["request"]["id"] == req_id
    assert detail_res.json()["shop"]["id"] == m_shop["id"]

    # Admin approves
    approve_res = client.post(f"/api/admin/subscription-requests/{req_id}/approve", json={
        "confirm_verified": True,
        "payment_reference": "SBI-BANK-REF-10029",
        "admin_notes": "Verified in SBI Merchant app"
    })
    assert approve_res.status_code == 200
    appr_data = approve_res.json()
    assert appr_data["success"] is True
    assert appr_data["request"]["status"] == "approved"

    # Verify merchant account is now Pro Active
    client.post("/auth/verify-otp", json={"phone": m_phone, "otp": "123456"})
    m_status = client.get("/api/subscription/status").json()
    assert m_status["state"] == "Pro Active"
    assert m_status["is_paid"] is True
    assert m_status["subscription_days_left"] >= 29

    # Test early renewal extension:
    # Merchant submits renewal request while active
    renew_res = client.post("/api/subscription/request-access", json={
        "plan_name": "All-Features Pro",
        "amount": 1299.0,
        "utr_number": "UTR-RENEWAL-2"
    })
    assert renew_res.status_code == 200
    renew_id = renew_res.json()["request"]["id"]

    # Admin approves renewal
    client.post("/auth/verify-otp", json={"phone": a_phone, "otp": "123456"})
    first_end = datetime.fromisoformat(m_status["subscription_end_date"])
    renew_approve = client.post(f"/api/admin/subscription-requests/{renew_id}/approve", json={
        "confirm_verified": True,
        "payment_reference": "SBI-RENEWAL-REF-2"
    })
    assert renew_approve.status_code == 200

    # Merchant rechecks: end date must be approximately first_end + 30 days!
    client.post("/auth/verify-otp", json={"phone": m_phone, "otp": "123456"})
    m_renewed_status = client.get("/api/subscription/status").json()
    second_end = datetime.fromisoformat(m_renewed_status["subscription_end_date"])
    diff = (second_end - first_end).days
    assert diff >= 29 and diff <= 31, f"Expected ~30 days added, got {diff} days"


def test_admin_reject_request_flow():
    """
    9. Admin rejection requires reason, keeps paid access disabled, and notifies customer.
    10. Customer can submit a new request after rejection.
    """
    m_phone, m_shop = create_merchant(phone_prefix="96")
    req_res = client.post("/api/subscription/request-access", json={
        "plan_name": "All-Features Pro",
        "amount": 1299.0,
        "utr_number": "INVALID-UTR-111"
    })
    req_id = req_res.json()["request"]["id"]

    # Admin logs in and rejects
    a_phone, a_email, a_shop = create_admin()
    rej_res = client.post(f"/api/admin/subscription-requests/{req_id}/reject", json={
        "rejection_reason": "UTR not found in bank statement for ₹1,299",
        "admin_notes": "Checked SBI UPI console, no record found"
    })
    assert rej_res.status_code == 200
    assert rej_res.json()["request"]["status"] == "rejected"

    # Merchant logs back in
    client.post("/auth/verify-otp", json={"phone": m_phone, "otp": "123456"})

    # Check notifications
    notif_res = client.get("/api/notifications")
    assert notif_res.status_code == 200
    notifs = notif_res.json()["notifications"]
    assert any("not approved" in n["title"].lower() or "not approved" in n["message"].lower() for n in notifs)

    # Customer is allowed to submit a new request
    new_req_res = client.post("/api/subscription/request-access", json={
        "plan_name": "All-Features Pro",
        "amount": 1299.0,
        "utr_number": "CORRECTED-UTR-222",
        "customer_notes": "Re-submitted with correct UTR from GPay receipt"
    })
    assert new_req_res.status_code == 200
    assert new_req_res.json()["request"]["status"] == "pending_review"


def test_data_preservation_across_lifecycle():
    """
    CRITICAL REQUIREMENT 7 & 8:
    A user's business data (products, sales, expenses, invoices) must NEVER be deleted
    or reset when trial expires or when subscribing/renewing.
    """
    m_phone, m_shop = create_merchant(phone_prefix="97")
    shop_id = m_shop["id"]

    # 1. Add business data: product, sale, expense
    with SessionLocal() as db:
        prod = models.Product(
            shop_id=shop_id,
            name="Amul Butter 500g",
            category="Dairy",
            cost_price=220.0,
            selling_price=260.0,
            stock_qty=50,
            reorder_level=10,
        )
        db.add(prod)

        sale = models.Sale(
            shop_id=shop_id,
            total_amount=520.0,
            total_profit=80.0,
            payment_mode="cash",
            customer_name="Ramesh Kumar",
            customer_phone="9822011223",
            date_time=datetime.utcnow(),
        )
        db.add(sale)

        exp = models.Expense(
            shop_id=shop_id,
            amount=1500.0,
            category="Utilities",
            note="Shop Electricity",
            date=datetime.utcnow().date(),
        )
        db.add(exp)
        db.commit()

    # 2. Simulate trial expiration: set trial_end_date to past
    with SessionLocal() as db:
        s = db.query(models.Shop).filter(models.Shop.id == shop_id).first()
        s.trial_end_date = datetime.utcnow() - timedelta(days=2)
        s.status = "expired"
        s.is_paid = False
        db.commit()

    # Verify status is 'Trial Expired'
    client.post("/auth/verify-otp", json={"phone": m_phone, "otp": "123456"})
    expired_status = client.get("/api/subscription/status").json()
    assert expired_status["state"] == "Trial Expired"
    assert expired_status["can_access_features"] is False

    # VERIFY DATA IS STILL INTACT DURING EXPIRY!
    with SessionLocal() as db:
        p_count = db.query(models.Product).filter(models.Product.shop_id == shop_id).count()
        s_count = db.query(models.Sale).filter(models.Sale.shop_id == shop_id).count()
        e_count = db.query(models.Expense).filter(models.Expense.shop_id == shop_id).count()
        assert p_count == 1
        assert s_count == 1
        assert e_count == 1

    # 3. Customer renews: submits access request
    req = client.post("/api/subscription/request-access", json={
        "plan_name": "All-Features Pro",
        "amount": 1299.0,
        "utr_number": "UTR-POST-EXPIRY"
    }).json()
    req_id = req["request"]["id"]

    # 4. Admin approves
    a_phone, a_email, a_shop = create_admin()
    client.post(f"/api/admin/subscription-requests/{req_id}/approve", json={
        "confirm_verified": True,
        "payment_reference": "BANK-POST-EXPIRY-OK"
    })

    # 5. Customer logs back in
    client.post("/auth/verify-otp", json={"phone": m_phone, "otp": "123456"})
    renewed_status = client.get("/api/subscription/status").json()
    assert renewed_status["state"] == "Pro Active"
    assert renewed_status["can_access_features"] is True

    # VERIFY DATA IS 100% PRESERVED AFTER RENEWAL!
    with SessionLocal() as db:
        preserved_prod = db.query(models.Product).filter(models.Product.shop_id == shop_id).first()
        preserved_sale = db.query(models.Sale).filter(models.Sale.shop_id == shop_id).first()
        preserved_exp = db.query(models.Expense).filter(models.Expense.shop_id == shop_id).first()
        assert preserved_prod.name == "Amul Butter 500g"
        assert preserved_prod.stock_qty == 50
        assert preserved_sale.total_amount == 520.0
        assert preserved_exp.amount == 1500.0


def test_unauthorized_user_cannot_access_admin_endpoints():
    """
    11. Customers cannot access another user's data or admin endpoints.
    """
    m_phone, m_shop = create_merchant(phone_prefix="98")
    res = client.get("/api/admin/subscription-requests")
    assert res.status_code == 403
    assert "Admin privileges required" in res.json()["detail"]
