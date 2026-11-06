import uuid

import pytest
from fastapi.testclient import TestClient

import models
from auth import COOKIE_NAME, create_access_token
from database import Base, SessionLocal, engine
from main import app


@pytest.fixture
def merchant_client():
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        shop = models.Shop(
            name="Production guard test",
            phone=f"8{uuid.uuid4().int % 10**9:09d}",
            email=f"{uuid.uuid4().hex}@example.test",
        )
        db.add(shop)
        db.commit()
        db.refresh(shop)
        shop_id = shop.id
        token = create_access_token({"sub": str(shop.id)})

    client = TestClient(app)
    client.cookies.set(COOKIE_NAME, token)
    yield client

    with SessionLocal() as db:
        db.query(models.PaymentTransaction).filter(
            models.PaymentTransaction.shop_id == shop_id
        ).delete()
        db.query(models.Shop).filter(models.Shop.id == shop_id).delete()
        db.commit()


@pytest.mark.parametrize(
    ("method", "path", "payload", "expected_status"),
    [
        ("post", "/auth/send-otp", {"phone": "9876543210"}, 503),
        ("post", "/auth/verify-otp", {"phone": "9876543210", "otp": "123456"}, 503),
        ("post", "/api/admin/dev-login", {}, 404),
        ("get", "/api/subscription/qr-info", {}, 404),
    ],
)
def test_development_only_routes_are_disabled_in_production(
    method, path, payload, expected_status, monkeypatch
):
    monkeypatch.setenv("ENVIRONMENT", "production")
    response = TestClient(app).request(method, path, json=payload)
    assert response.status_code == expected_status


def test_production_checkout_requires_live_razorpay(merchant_client, monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.delenv("RAZORPAY_KEY_ID", raising=False)
    monkeypatch.delenv("RAZORPAY_KEY_SECRET", raising=False)

    response = merchant_client.post(
        "/api/subscription/create-order",
        json={"billing_cycle": "monthly", "payment_method": "upi"},
    )
    assert response.status_code == 503


def test_production_rejects_unverified_upi_payment(merchant_client, monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")

    response = merchant_client.post(
        "/api/subscription/submit-upi-ref",
        json={"order_id": "unverified-order", "utr_number": "123456789012"},
    )
    assert response.status_code == 503
