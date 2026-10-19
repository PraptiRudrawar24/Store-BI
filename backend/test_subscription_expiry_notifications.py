from datetime import datetime, timedelta
import pytest
from fastapi.testclient import TestClient
from main import app, compute_subscription_expiry_warning, check_and_create_subscription_expiry_notification
from database import SessionLocal
import models
import security

client = TestClient(app)

def test_compute_subscription_expiry_warning_trial():
    now = datetime.utcnow()

    # 1. Trial with 5 days left -> No warning
    shop_safe = models.Shop(
        id=101,
        is_paid=False,
        is_admin=False,
        status="trial",
        trial_end_date=now + timedelta(days=5),
    )
    assert compute_subscription_expiry_warning(shop_safe) is None

    # 2. Trial with 1 day left -> Warning triggered
    shop_1day = models.Shop(
        id=102,
        is_paid=False,
        is_admin=False,
        status="trial",
        trial_end_date=now + timedelta(hours=20),
    )
    warn_1day = compute_subscription_expiry_warning(shop_1day)
    assert warn_1day is not None
    assert warn_1day["has_notification"] is True
    assert warn_1day["type"] == "trial"
    assert warn_1day["days_remaining"] == 1
    assert warn_1day["is_expired"] is False
    assert "Free Trial Ending in 1 Day" in warn_1day["title"]

    # 3. Trial with 0 days left / expired -> Expired warning
    shop_expired = models.Shop(
        id=103,
        is_paid=False,
        is_admin=False,
        status="expired",
        trial_end_date=now - timedelta(days=1),
    )
    warn_exp = compute_subscription_expiry_warning(shop_expired)
    assert warn_exp is not None
    assert warn_exp["has_notification"] is True
    assert warn_exp["type"] == "trial"
    assert warn_exp["days_remaining"] == 0
    assert warn_exp["is_expired"] is True
    assert "Expired" in warn_exp["title"]


def test_compute_subscription_expiry_warning_subscription():
    now = datetime.utcnow()

    # 1. Paid Monthly Subscription with 20 days left -> No warning
    shop_paid_safe = models.Shop(
        id=201,
        is_paid=True,
        is_admin=False,
        plan_name="All-Features Pro",
        status="active",
        subscription_start_date=now - timedelta(days=10),
        subscription_end_date=now + timedelta(days=20),
    )
    assert compute_subscription_expiry_warning(shop_paid_safe) is None

    # 2. Paid Monthly Subscription with 1 day left -> Warning triggered
    shop_paid_1day = models.Shop(
        id=202,
        is_paid=True,
        is_admin=False,
        plan_name="All-Features Pro",
        status="active",
        subscription_start_date=now - timedelta(days=29),
        subscription_end_date=now + timedelta(hours=18),
    )
    warn_paid = compute_subscription_expiry_warning(shop_paid_1day)
    assert warn_paid is not None
    assert warn_paid["has_notification"] is True
    assert warn_paid["type"] == "subscription"
    assert warn_paid["days_remaining"] == 1
    assert warn_paid["is_expired"] is False
    assert "Monthly Subscription Ending in 1 Day" in warn_paid["title"]

    # 3. Admin Account -> Never receives expiration warning
    admin_shop = models.Shop(
        id=203,
        is_paid=True,
        is_admin=True,
        plan_name="Enterprise Admin",
        subscription_end_date=now + timedelta(days=1),
    )
    assert compute_subscription_expiry_warning(admin_shop) is None


def test_api_check_subscription_alert_endpoint():
    now = datetime.utcnow()
    unique_email = f"warn_test_{int(now.timestamp())}@teststore.com"

    with SessionLocal() as db:
        shop = models.Shop(
            email=unique_email,
            owner_name="Alert Test Owner",
            is_email_verified=True,
            hashed_password=security.hash_password("Password123!"),
            is_paid=False,
            status="trial",
            trial_end_date=now + timedelta(hours=14), # 1 day left
        )
        db.add(shop)
        db.commit()

    # Call GET /auth/subscription-alert
    res = client.get(f"/auth/subscription-alert?email={unique_email}")
    assert res.status_code == 200
    data = res.json()
    assert data["has_warning"] is True
    assert data["warning"]["type"] == "trial"
    assert data["warning"]["days_remaining"] == 1
    assert "1 Day" in data["warning"]["title"]

    # Call with nonexistent email
    res2 = client.get("/auth/subscription-alert?email=nonexistent_email@teststore.com")
    assert res2.status_code == 200
    assert res2.json()["has_warning"] is False


def test_login_returns_subscription_warning_and_creates_inapp_notification():
    now = datetime.utcnow()
    login_email = f"login_warn_{int(now.timestamp())}@teststore.com"
    pwd = "SecurePassword123!"

    with SessionLocal() as db:
        shop = models.Shop(
            email=login_email,
            owner_name="Login Notice Merchant",
            is_email_verified=True,
            hashed_password=security.hash_password(pwd),
            is_paid=True,
            plan_name="All-Features Pro",
            status="active",
            subscription_start_date=now - timedelta(days=29),
            subscription_end_date=now + timedelta(hours=10), # 1 day left
        )
        db.add(shop)
        db.commit()
        db.refresh(shop)
        shop_id = shop.id

    # POST /auth/login
    res = client.post("/auth/login", json={"email": login_email, "password": pwd})
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["success"] is True

    # Verify subscription_warning is included in login response
    warning = res_data.get("subscription_warning")
    assert warning is not None
    assert warning["has_notification"] is True
    assert warning["type"] == "subscription"
    assert warning["days_remaining"] == 1
    assert "Ending in 1 Day" in warning["title"]

    # Verify serialize_shop included expiry_warning
    assert res_data["shop"]["expiry_warning"] is not None
    assert res_data["shop"]["expiry_warning"]["days_remaining"] == 1

    # Verify InAppNotification was created in DB for this shop
    with SessionLocal() as db:
        notif = db.query(models.InAppNotification).filter(
            models.InAppNotification.shop_id == shop_id,
            models.InAppNotification.title == warning["title"]
        ).first()
        assert notif is not None
        assert notif.type == "warning"
        assert notif.is_read is False
