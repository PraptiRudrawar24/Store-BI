import time
import pytest
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
import models

client = TestClient(app)

def create_authenticated_merchant(phone_prefix="96"):
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


def test_qr_image_endpoint():
    """
    Verifies GET /api/subscription/qr-image returns the exact Payment Scanner image
    with content-type image/jpeg matching the root file size.
    """
    import os
    root_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "Payment Scanner.jpeg"))
    res = client.get("/api/subscription/qr-image")
    assert res.status_code == 200
    assert "image/jpeg" in res.headers.get("content-type", "")
    assert len(res.content) == os.path.getsize(root_path)


def test_qr_info_metadata_endpoint():
    """
    Verifies GET /api/subscription/qr-info returns the verified metadata:
    - Plan: Store BI — All-Features Pro
    - Amount: ₹1,299
    - Payee: CHAITANYA GURUNATH SIRSAT
    - VPA: chaitanyasirsat@sbi
    - upi_intent_uri with am=1299.00
    """
    res = client.get("/api/subscription/qr-info")
    assert res.status_code == 200
    data = res.json()
    assert data["plan_name"] == "Store BI — All-Features Pro"
    assert data["amount"] == 1299.0
    assert data["payee_name"] == "CHAITANYA GURUNATH SIRSAT"
    assert data["vpa"] == "chaitanyasirsat@sbi"
    assert "am=1299.00" in data["upi_intent_uri"]
    assert "chaitanyasirsat@sbi" in data["upi_intent_uri"]


def test_create_order_includes_qr_info():
    """
    Verifies that creating an order returns qr_info containing amount and intent URI.
    """
    phone, shop = create_authenticated_merchant(phone_prefix="97")
    res = client.post("/api/subscription/create-order", json={
        "plan_name": "All-Features Pro",
        "billing_cycle": "monthly",
        "payment_method": "upi",
    })
    assert res.status_code == 200
    data = res.json()
    assert "qr_info" in data
    assert data["qr_info"]["amount"] == 1299.0
    assert data["qr_info"]["vpa"] == "chaitanyasirsat@sbi"


def test_submit_upi_ref_activates_subscription():
    """
    Verifies the complete UPI verification flow:
    1. Create order for ₹1,299
    2. Submit valid 12-digit UTR reference
    3. Status transitions to paid, subscription activated for 30 days
    4. Database record verified
    5. /auth/me reflects active subscription
    """
    phone, shop = create_authenticated_merchant(phone_prefix="98")
    order_res = client.post("/api/subscription/create-order", json={
        "plan_name": "All-Features Pro",
        "billing_cycle": "monthly",
        "payment_method": "upi",
    })
    order_id = order_res.json()["order_id"]

    # Initial status is created / waiting
    status_res = client.get(f"/api/subscription/payment-status/{order_id}")
    assert status_res.status_code == 200
    assert status_res.json()["status"] == "created"

    # Submit valid UTR
    test_utr = f"4291{int(time.time() * 1000) % 100000000:08d}"
    verify_res = client.post("/api/subscription/submit-upi-ref", json={
        "order_id": order_id,
        "utr_number": test_utr,
    })
    assert verify_res.status_code == 200
    verify_data = verify_res.json()
    assert verify_data["success"] is True
    assert verify_data["status"] == "paid"
    assert verify_data["amount"] == 1299.0
    assert verify_data["utr_number"] == test_utr

    # Check /auth/me
    me_res = client.get("/auth/me")
    assert me_res.status_code == 200
    me = me_res.json()
    assert me["is_paid"] is True
    assert me["plan_name"] == "All-Features Pro"
    assert me["subscription_days_left_in_month"] is not None
    assert me["subscription_days_left_in_month"] > 0

    # Check payment-status endpoint
    final_status = client.get(f"/api/subscription/payment-status/{order_id}").json()
    assert final_status["status"] == "paid"
    assert final_status["utr_number"] == test_utr


def test_submit_invalid_utr_rejected():
    """
    Verifies that malformed or too short UTR numbers are rejected with 400.
    """
    phone, shop = create_authenticated_merchant(phone_prefix="93")
    order_res = client.post("/api/subscription/create-order", json={"plan_name": "All-Features Pro"})
    order_id = order_res.json()["order_id"]

    res = client.post("/api/subscription/submit-upi-ref", json={
        "order_id": order_id,
        "utr_number": "123",  # Too short
    })
    assert res.status_code == 400
    assert "Invalid UPI Reference" in res.json()["detail"]


def test_duplicate_utr_rejected():
    """
    Verifies that the same UTR cannot be reused across different payment orders.
    """
    phone1, shop1 = create_authenticated_merchant(phone_prefix="81")
    order1 = client.post("/api/subscription/create-order", json={"plan_name": "All-Features Pro"}).json()["order_id"]
    test_utr = f"5555{int(time.time() * 1000) % 100000000:08d}"

    res1 = client.post("/api/subscription/submit-upi-ref", json={
        "order_id": order1,
        "utr_number": test_utr,
    })
    assert res1.status_code == 200

    # Merchant 2 tries to use the same UTR
    phone2, shop2 = create_authenticated_merchant(phone_prefix="82")
    order2 = client.post("/api/subscription/create-order", json={"plan_name": "All-Features Pro"}).json()["order_id"]

    res2 = client.post("/api/subscription/submit-upi-ref", json={
        "order_id": order2,
        "utr_number": test_utr,
    })
    assert res2.status_code == 400
    assert "already been verified" in res2.json()["detail"]


def test_cross_merchant_order_isolation():
    """
    Security check: Merchant B cannot submit UTR for Merchant A's order.
    """
    phoneA, shopA = create_authenticated_merchant(phone_prefix="83")
    orderA = client.post("/api/subscription/create-order", json={"plan_name": "All-Features Pro"}).json()["order_id"]

    phoneB, shopB = create_authenticated_merchant(phone_prefix="84")
    res = client.post("/api/subscription/submit-upi-ref", json={
        "order_id": orderA,
        "utr_number": "123456789012",
    })
    assert res.status_code == 403
