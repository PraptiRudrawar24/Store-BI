import os
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from main import app
import models
from database import get_db, SessionLocal, engine, Base
from auth import create_access_token

@pytest.fixture
def client_and_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    # Clean tables for test isolation
    db.query(models.AuditLog).delete()
    db.query(models.PromoCode).delete()
    db.query(models.PlanConfig).delete()
    db.query(models.SaleItem).delete()
    db.query(models.Sale).delete()
    db.query(models.Product).delete()
    db.query(models.Shop).delete()
    db.commit()

    # Create admin
    admin_shop = models.Shop(
        name="Platform HQ",
        owner_name="Platform Admin",
        phone="9999999999",
        email="admin@storebi.com",
        is_admin=True,
        onboarding_completed=True,
        is_paid=True,
        status="active",
    )
    db.add(admin_shop)
    db.commit()
    db.refresh(admin_shop)

    # Create sample merchant shop
    now = datetime.utcnow()
    merchant = models.Shop(
        name="Ramesh Kirana Store",
        owner_name="Ramesh Patel",
        phone="9876543210",
        email="ramesh@kirana.com",
        category="Grocery & Kirana",
        city="Pune",
        state="Maharashtra",
        pincode="411038",
        gstin="27ABCDE1234F1Z5",
        approx_products="100 - 500 items",
        monthly_turnover="₹1,00,000 - ₹5,00,000",
        current_tracking_method="Paper khata / Register",
        sells_expiring_goods=True,
        challenges="Stock-outs, Overstock",
        trial_start_date=now - timedelta(days=2),
        trial_end_date=now + timedelta(days=3),
        onboarding_completed=True,
        onboarding_step=4,
        is_admin=False,
        is_paid=False,
        status="trial",
    )
    db.add(merchant)
    db.commit()
    db.refresh(merchant)

    admin_token = create_access_token({"sub": str(admin_shop.id), "phone": admin_shop.phone})
    merchant_token = create_access_token({"sub": str(merchant.id), "phone": merchant.phone})

    c = TestClient(app)
    yield c, db, admin_token, merchant_token, merchant.id
    db.close()


def test_business_detail_endpoint(client_and_db):
    client, db, admin_token, _, merchant_id = client_and_db

    res = client.get(
        f"/api/admin/businesses/{merchant_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["shop"]["name"] == "Ramesh Kirana Store"
    assert data["shop"]["code"] == f"SBI-{merchant_id:04d}"
    assert len(data["onboarding_steps"]) == 4
    assert data["trial_info"]["status"] == "trial"
    assert data["trial_info"]["trial_days_left"] > 0
    assert data["stats"]["catalogue_size"] == 0
    assert data["stats"]["monthly_sales_reported"] == 0.0


def test_business_actions_and_audit_trail(client_and_db):
    client, db, admin_token, _, merchant_id = client_and_db

    # 1. Extend trial
    extend_res = client.post(
        f"/api/admin/businesses/{merchant_id}/extend-trial",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"days": 7, "reason": "Festive promo"}
    )
    assert extend_res.status_code == 200
    assert extend_res.json()["success"] is True

    # 2. Resend login
    resend_res = client.post(
        f"/api/admin/businesses/{merchant_id}/resend-login",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert resend_res.status_code == 200

    # 3. Save admin observation note
    note_res = client.post(
        f"/api/admin/businesses/{merchant_id}/note",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"note": "Merchant wants assistance setting up thermal printer."}
    )
    assert note_res.status_code == 200

    # 4. Check business detail returns all 3 audit logs
    detail_res = client.get(
        f"/api/admin/businesses/{merchant_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert detail_res.status_code == 200
    logs = detail_res.json()["audit_logs"]
    assert len(logs) == 3
    actions = [l["action"] for l in logs]
    assert "extend_trial" in actions
    assert "resend_login" in actions
    assert "update_note" in actions

    # 5. Suspend store
    suspend_res = client.post(
        f"/api/admin/businesses/{merchant_id}/suspend",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert suspend_res.status_code == 200
    assert suspend_res.json()["status"] == "suspended"

    # 6. Activate store
    activate_res = client.post(
        f"/api/admin/businesses/{merchant_id}/activate",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert activate_res.status_code == 200
    assert activate_res.json()["status"] == "active"
    assert activate_res.json()["is_paid"] is True


def test_plans_and_pricing_crud(client_and_db):
    client, db, admin_token, _, _ = client_and_db

    # Get plans - starts with sensible defaults & 0 subscribers
    res = client.get(
        "/api/admin/plans",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    plans = res.json()
    assert plans["default_trial_days"] == 5
    assert len(plans["modular_features"]) == 4
    assert plans["total_subscribers"] == 0

    # Update plans
    plans["default_trial_days"] = 7
    plans["modular_features"][0]["monthly_price"] = 199.0
    save_res = client.post(
        "/api/admin/plans",
        headers={"Authorization": f"Bearer {admin_token}"},
        json=plans
    )
    assert save_res.status_code == 200
    assert save_res.json()["default_trial_days"] == 7
    assert save_res.json()["modular_features"][0]["monthly_price"] == 199.0


def test_promo_codes_crud(client_and_db):
    client, db, admin_token, _, _ = client_and_db

    # 1. Starts empty
    res = client.get(
        "/api/admin/promo-codes",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    assert res.json() == []

    # 2. Create promo code
    create_res = client.post(
        "/api/admin/promo-codes",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "code": "DIWALI50",
            "discount_type": "percentage",
            "discount_value": 50.0,
            "validity": "15 Nov 2026",
            "max_uses": 200
        }
    )
    assert create_res.status_code == 200
    promo_id = create_res.json()["id"]
    assert create_res.json()["code"] == "DIWALI50"

    # 3. Update promo code
    update_res = client.put(
        f"/api/admin/promo-codes/{promo_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"discount_value": 40.0}
    )
    assert update_res.status_code == 200
    assert update_res.json()["discount_value"] == 40.0

    # 4. Delete promo code
    del_res = client.delete(
        f"/api/admin/promo-codes/{promo_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # Check empty again
    list_res = client.get(
        "/api/admin/promo-codes",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert list_res.json() == []


def test_feature_gating_by_trial_and_plan(client_and_db):
    client, db, admin_token, merchant_token, merchant_id = client_and_db

    # Active trial merchant -> feature access allowed
    kpi_res = client.get(
        "/api/dashboard/kpis",
        headers={"Authorization": f"Bearer {merchant_token}"}
    )
    assert kpi_res.status_code == 200

    # Now expire the merchant's trial and set status expired
    merchant = db.query(models.Shop).filter(models.Shop.id == merchant_id).first()
    merchant.trial_end_date = datetime.utcnow() - timedelta(days=5)
    merchant.status = "expired"
    merchant.is_paid = False
    db.commit()

    # Expired merchant -> feature access gated (403 Forbidden)
    kpi_expired = client.get(
        "/api/dashboard/kpis",
        headers={"Authorization": f"Bearer {merchant_token}"}
    )
    assert kpi_expired.status_code == 403
    assert "trial has ended" in kpi_expired.json()["detail"]

    # Now suspend the merchant
    merchant.status = "suspended"
    db.commit()
    kpi_suspended = client.get(
        "/api/dashboard/kpis",
        headers={"Authorization": f"Bearer {merchant_token}"}
    )
    assert kpi_suspended.status_code == 403
    assert "suspended" in kpi_suspended.json()["detail"]

    # Now upgrade merchant to paid Active
    merchant.status = "active"
    merchant.is_paid = True
    db.commit()
    kpi_active = client.get(
        "/api/dashboard/kpis",
        headers={"Authorization": f"Bearer {merchant_token}"}
    )
    assert kpi_active.status_code == 200
