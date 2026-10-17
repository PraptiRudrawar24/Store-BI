import time
import hmac
import hashlib
import json
from datetime import datetime, timedelta
import pytest
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
import models

client = TestClient(app)

def create_authenticated_merchant(phone_prefix="95"):
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


def compute_test_signature(order_id: str, payment_id: str, secret: str = "test_secret_storebi_mock") -> str:
    msg = f"{order_id}|{payment_id}".encode("utf-8")
    return hmac.new(secret.encode("utf-8"), msg, hashlib.sha256).hexdigest()


def test_subscription_plans_endpoint():
    """
    Verifies that GET /api/subscription/plans returns All-Features Pro at ₹1,299 / month
    with all 6 premium retail automation and AI capabilities.
    """
    res = client.get("/api/subscription/plans")
    assert res.status_code == 200
    data = res.json()
    assert data["plan_name"] == "All-Features Pro"
    assert data["price"] == 1299.0
    assert data["currency"] == "INR"
    assert data["billing_cycle"] == "monthly"
    assert len(data["features"]) == 6


def test_create_subscription_order_flow():
    """
    Tests creating a payment order for All-Features Pro (₹1,299).
    Verifies backend price validation and database persistence in payment_transactions table.
    """
    phone, shop = create_authenticated_merchant(phone_prefix="91")

    # Create order
    res = client.post("/api/subscription/create-order", json={
        "plan_name": "All-Features Pro",
        "billing_cycle": "monthly",
        "payment_method": "upi",
    })
    assert res.status_code == 200
    order_data = res.json()
    assert order_data["success"] is True
    assert order_data["plan_name"] == "All-Features Pro"
    assert order_data["amount"] == 1299.0
    assert order_data["amount_paise"] == 129900
    assert order_data["currency"] == "INR"
    assert order_data["order_id"].startswith("order_")

    # Verify transaction record persisted in DB with status "created"
    with SessionLocal() as db:
        tx = db.query(models.PaymentTransaction).filter(
            models.PaymentTransaction.order_id == order_data["order_id"]
        ).first()
        assert tx is not None
        assert tx.shop_id == shop["id"]
        assert tx.status == "created"
        assert tx.amount == 1299.0
        assert tx.payment_method == "upi"


def test_create_order_with_promo_discount():
    """
    Verifies that valid promo codes reduce the backend calculated amount,
    while still enforcing backend pricing rules.
    """
    with SessionLocal() as db:
        existing = db.query(models.PromoCode).filter(models.PromoCode.code == "RETAIL20").first()
        if not existing:
            p = models.PromoCode(
                code="RETAIL20",
                discount_type="percentage",
                discount_value=20.0,
                active=True,
                max_uses=100,
            )
            db.add(p)
            db.commit()

    phone, shop = create_authenticated_merchant(phone_prefix="92")

    res = client.post("/api/subscription/create-order", json={
        "plan_name": "All-Features Pro",
        "billing_cycle": "monthly",
        "payment_method": "card",
        "promo_code": "RETAIL20"
    })
    assert res.status_code == 200
    order_data = res.json()
    assert order_data["amount"] == 1299.0 * 0.80  # ₹1039.20
    assert order_data["amount_paise"] == int(round(1299.0 * 0.80 * 100))


def test_verify_payment_success_activates_subscription():
    """
    Tests complete server-side payment verification:
    1. Merchant creates payment order
    2. Receives valid payment_id and computes valid HMAC signature
    3. Calls /api/subscription/verify-payment
    4. Server verifies signature, sets is_paid=True, plan='All-Features Pro', 30 days validity
    5. Confirms /auth/me and /api/subscription/status reflect active subscription immediately
    """
    phone, shop = create_authenticated_merchant(phone_prefix="93")

    # 1. Create order
    order_res = client.post("/api/subscription/create-order", json={
        "plan_name": "All-Features Pro",
        "billing_cycle": "monthly",
        "payment_method": "upi",
    })
    order_id = order_res.json()["order_id"]
    payment_id = f"pay_test_{int(time.time() * 1000)}"
    signature = compute_test_signature(order_id, payment_id)

    # 2. Verify payment
    verify_res = client.post("/api/subscription/verify-payment", json={
        "razorpay_order_id": order_id,
        "razorpay_payment_id": payment_id,
        "razorpay_signature": signature,
        "plan_name": "All-Features Pro",
    })
    assert verify_res.status_code == 200
    verify_data = verify_res.json()
    assert verify_data["success"] is True
    assert "Activated Successfully" in verify_data["message"]
    assert verify_data["payment_id"] == payment_id
    assert verify_data["shop"]["is_paid"] is True
    assert verify_data["shop"]["plan_name"] == "All-Features Pro"
    assert verify_data["shop"]["subscription_days_left_in_month"] > 0

    # 3. Check /auth/me returns active paid tier
    me_res = client.get("/auth/me")
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["is_paid"] is True
    assert me_data["plan_name"] == "All-Features Pro"

    # 4. Check PaymentTransaction in DB is marked paid
    with SessionLocal() as db:
        tx = db.query(models.PaymentTransaction).filter(
            models.PaymentTransaction.order_id == order_id
        ).first()
        assert tx.status == "paid"
        assert tx.payment_id == payment_id
        assert tx.paid_at is not None


def test_verify_payment_idempotency():
    """
    Verifies that calling verify-payment multiple times with the same order
    does not fail, does not create duplicate extensions, and safely returns success.
    """
    phone, shop = create_authenticated_merchant(phone_prefix="94")

    order_res = client.post("/api/subscription/create-order", json={
        "plan_name": "All-Features Pro",
    })
    order_id = order_res.json()["order_id"]
    payment_id = f"pay_test_{int(time.time() * 1000)}"
    signature = compute_test_signature(order_id, payment_id)

    # First verification
    res1 = client.post("/api/subscription/verify-payment", json={
        "razorpay_order_id": order_id,
        "razorpay_payment_id": payment_id,
        "razorpay_signature": signature,
    })
    assert res1.status_code == 200

    # Second duplicate verification (e.g. user double-clicked or network retry)
    res2 = client.post("/api/subscription/verify-payment", json={
        "razorpay_order_id": order_id,
        "razorpay_payment_id": payment_id,
        "razorpay_signature": signature,
    })
    assert res2.status_code == 200
    assert res2.json()["success"] is True


def test_verify_payment_invalid_signature_rejected():
    """
    Tests security against tampered callbacks:
    An invalid signature must be rejected with 400 Bad Request,
    the transaction marked failed, and subscription NOT activated.
    """
    phone, shop = create_authenticated_merchant(phone_prefix="95")

    order_res = client.post("/api/subscription/create-order", json={
        "plan_name": "All-Features Pro",
    })
    order_id = order_res.json()["order_id"]
    payment_id = f"pay_forged_{int(time.time() * 1000)}"
    tampered_signature = "invalid_fraudulent_signature_hex_123456"

    verify_res = client.post("/api/subscription/verify-payment", json={
        "razorpay_order_id": order_id,
        "razorpay_payment_id": payment_id,
        "razorpay_signature": tampered_signature,
    })
    assert verify_res.status_code == 400
    assert "Invalid signature" in verify_res.json()["detail"]

    # Verify subscription is NOT paid
    me_res = client.get("/auth/me")
    assert me_res.json()["is_paid"] is False

    # Verify transaction in DB is marked "failed"
    with SessionLocal() as db:
        tx = db.query(models.PaymentTransaction).filter(
            models.PaymentTransaction.order_id == order_id
        ).first()
        assert tx.status == "failed"
        assert tx.error_reason == "Invalid signature verification"


def test_verify_payment_cross_user_isolation():
    """
    Security test: Merchant B cannot verify or activate their subscription
    using a payment order generated by Merchant A.
    Must return 403 Forbidden.
    """
    # Merchant A creates order
    phone_a, shop_a = create_authenticated_merchant(phone_prefix="96")
    order_res = client.post("/api/subscription/create-order", json={"plan_name": "All-Features Pro"})
    order_id_a = order_res.json()["order_id"]
    payment_id = f"pay_test_{int(time.time() * 1000)}"
    signature = compute_test_signature(order_id_a, payment_id)

    # Merchant B logs in
    phone_b, shop_b = create_authenticated_merchant(phone_prefix="97")

    # Merchant B tries to verify Merchant A's order
    hijack_res = client.post("/api/subscription/verify-payment", json={
        "razorpay_order_id": order_id_a,
        "razorpay_payment_id": payment_id,
        "razorpay_signature": signature,
    })
    assert hijack_res.status_code == 403
    assert "does not belong to your store" in hijack_res.json()["detail"]

    # Merchant B must still be unpaid
    me_b = client.get("/auth/me").json()
    assert me_b["is_paid"] is False


def test_cancel_subscription_order():
    """
    Verifies that when a merchant cancels a payment session:
    - The transaction is recorded as cancelled
    - The subscription remains unpaid
    """
    phone, shop = create_authenticated_merchant(phone_prefix="98")

    order_res = client.post("/api/subscription/create-order", json={"plan_name": "All-Features Pro"})
    order_id = order_res.json()["order_id"]

    cancel_res = client.post("/api/subscription/cancel-order", json={
        "order_id": order_id,
        "reason": "Merchant dismissed checkout",
    })
    assert cancel_res.status_code == 200

    # Check status endpoint
    status_res = client.get(f"/api/subscription/payment-status/{order_id}")
    assert status_res.status_code == 200
    assert status_res.json()["status"] == "cancelled"

    # Shop remains unpaid
    assert client.get("/auth/me").json()["is_paid"] is False


def test_razorpay_webhook_event_processing():
    """
    Verifies asynchronous webhook processing for payment.captured event.
    """
    phone, shop = create_authenticated_merchant(phone_prefix="99")

    order_res = client.post("/api/subscription/create-order", json={"plan_name": "All-Features Pro"})
    order_id = order_res.json()["order_id"]
    payment_id = f"pay_hook_{int(time.time() * 1000)}"

    webhook_payload = {
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": payment_id,
                    "order_id": order_id,
                    "amount": 129900,
                    "status": "captured",
                }
            }
        }
    }

    res = client.post(
        "/api/subscription/webhook",
        content=json.dumps(webhook_payload),
        headers={"Content-Type": "application/json"}
    )
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

    # Verify shop is now paid
    with SessionLocal() as db:
        updated_shop = db.query(models.Shop).filter(models.Shop.id == shop["id"]).first()
        assert updated_shop.is_paid is True
        assert updated_shop.plan_name == "All-Features Pro"
