from datetime import datetime, timedelta
import calendar
import time
import pytest
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
import models
from auth import calculate_subscription_days_left, calculate_trial_days_left

client = TestClient(app)

def test_calculate_subscription_days_left_trial_vs_paid():
    """
    Unit test for calculate_subscription_days_left and calculate_trial_days_left.
    """
    now = datetime.utcnow()
    _, days_in_month = calendar.monthrange(now.year, now.month)

    # 1. Unpaid trial shop
    trial_shop = models.Shop(
        phone="9999900001",
        is_paid=False,
        trial_end_date=now + timedelta(days=4),
    )
    assert calculate_trial_days_left(trial_shop.trial_end_date) == 4

    # 2. Paid monthly shop (30 days)
    paid_monthly_shop = models.Shop(
        phone="9999900002",
        is_paid=True,
        plan_name="All-Features Pro",
        subscription_start_date=now,
        subscription_end_date=now + timedelta(days=20),
    )
    days_left, total_days = calculate_subscription_days_left(paid_monthly_shop)
    assert days_left == 20
    assert total_days == days_in_month

    # 3. Paid annual shop (365 days)
    paid_annual_shop = models.Shop(
        phone="9999900003",
        is_paid=True,
        plan_name="Annual Pro",
        subscription_start_date=now,
        subscription_end_date=now + timedelta(days=365),
    )
    days_left_ann, total_days_ann = calculate_subscription_days_left(paid_annual_shop)
    expected_days_in_month = max(1, days_in_month - now.day + 1)
    assert days_left_ann == expected_days_in_month
    assert total_days_ann == days_in_month


def test_merchant_purchase_subscription_flow():
    """
    Integration test:
    - User signs up with trial
    - Checks initial trial days left
    - Calls POST /api/subscription/purchase
    - Verifies is_paid becomes True, trial_days_left becomes 0, and subscription_days_left_in_month is returned
    - Verifies GET /auth/me reflects the purchased subscription and days left out of month
    """
    import time
    phone = f"97{int(time.time() * 1000) % 100000000:08d}"
    login_res = client.post("/auth/verify-otp", json={"phone": phone, "otp": "123456"})
    assert login_res.status_code == 200
    shop = login_res.json()["shop"]
    assert shop["is_paid"] is False
    assert shop["trial_days_left"] == 5
    assert shop["subscription_days_left_in_month"] is None

    # Complete onboarding step 1
    client.post("/auth/onboarding/step-1", json={
        "owner_name": "Suresh Kirana",
        "phone": phone,
        "email": "suresh@kirana.in",
        "language": "en"
    })

    # Purchase All-Features Pro Monthly subscription
    purchase_res = client.post("/api/subscription/purchase", json={
        "plan_name": "All-Features Pro",
        "billing_cycle": "monthly",
        "amount": 1299.0,
        "features": "all"
    })
    assert purchase_res.status_code == 200
    data = purchase_res.json()
    assert data["success"] is True
    assert "All-Features Pro" in data["message"]

    purchased_shop = data["shop"]
    assert purchased_shop["is_paid"] is True
    assert purchased_shop["plan_name"] == "All-Features Pro"
    assert purchased_shop["trial_days_left"] == 0
    assert purchased_shop["subscription_days_left_in_month"] is not None
    assert purchased_shop["subscription_days_left_in_month"] > 0
    assert purchased_shop["subscription_total_days_in_month"] >= 28

    # Verify GET /auth/me reflects the active subscription and days left out of month
    me_res = client.get("/auth/me")
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["is_paid"] is True
    assert me_data["plan_name"] == "All-Features Pro"
    assert me_data["subscription_days_left_in_month"] == purchased_shop["subscription_days_left_in_month"]

    # Verify GET /api/subscription/status
    status_res = client.get("/api/subscription/status")
    assert status_res.status_code == 200
    assert status_res.json()["is_paid"] is True


def test_purchase_subscription_with_promo_code():
    """
    Verifies that applying a promo code reduces the payable amount
    and logs the discount.
    """
    # Create promo code
    with SessionLocal() as db:
        existing = db.query(models.PromoCode).filter(models.PromoCode.code == "RETAIL20").first()
        if not existing:
            p = models.PromoCode(
                code="RETAIL20",
                discount_type="percentage",
                discount_value=20.0,
                active=True,
                max_uses=50,
            )
            db.add(p)
            db.commit()

    phone = f"96{int(time.time() * 1000) % 100000000:08d}"
    client.post("/auth/verify-otp", json={"phone": phone, "otp": "123456"})

    purchase_res = client.post("/api/subscription/purchase", json={
        "plan_name": "Annual Pro",
        "billing_cycle": "annual",
        "amount": 5999.0,
        "promo_code": "RETAIL20"
    })
    assert purchase_res.status_code == 200
    shop_data = purchase_res.json()["shop"]
    assert shop_data["is_paid"] is True
    assert shop_data["plan_name"] == "Annual Pro"
    assert shop_data["subscription_amount"] == 5999.0 * 0.80  # 20% off
