import os
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from main import app
import models
from database import SessionLocal, engine, Base
from auth import create_access_token

@pytest.fixture
def clean_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    # Clean tables for test isolation
    db.query(models.AuditLog).delete()
    db.query(models.PromoCode).delete()
    db.query(models.PlanConfig).delete()
    db.query(models.SaleItem).delete()
    db.query(models.Sale).delete()
    db.query(models.Product).delete()
    db.query(models.Expense).delete()
    db.query(models.Shop).delete()
    db.commit()
    yield db
    db.close()

@pytest.fixture
def client():
    return TestClient(app)

def test_empty_database_dashboard_endpoints(clean_db, client):
    """Verify all dashboard endpoints return 0, empty lists, and null percent change on a brand-new store."""
    shop = models.Shop(
        name="Fresh Test Store",
        owner_name="Test Owner",
        phone="9988776655",
        onboarding_completed=True,
        trial_end_date=datetime.utcnow() + timedelta(days=5),
    )
    clean_db.add(shop)
    clean_db.commit()
    clean_db.refresh(shop)

    token = create_access_token(data={"sub": str(shop.id), "phone": shop.phone})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. KPIs endpoint
    for period in ["today", "7days", "30days"]:
        res = client.get(f"/api/dashboard/kpis?period={period}", headers=headers)
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["sales"] == 0
        assert data["previous_sales"] == 0
        assert data["sales_change_pct"] is None  # Never divide-by-zero!
        assert data["profit"] == 0
        assert data["previous_profit"] == 0
        assert data["profit_change_pct"] is None
        assert data["transactions"] == 0
        assert data["transactions_change_pct"] is None

    # 2. Today vs Yesterday comparison
    res_comp = client.get("/api/dashboard/today-vs-yesterday", headers=headers)
    assert res_comp.status_code == 200
    comp_data = res_comp.json()
    assert comp_data["has_data"] is False
    assert comp_data["today"]["sales"] == 0
    assert comp_data["today"]["transactions"] == 0
    assert comp_data["yesterday"]["sales"] == 0
    assert comp_data["sales_change_pct"] is None
    assert comp_data["profit_change_pct"] is None

    # 3. Category sales breakdown
    res_cat = client.get("/api/dashboard/category-sales?period=today", headers=headers)
    assert res_cat.status_code == 200
    cat_data = res_cat.json()
    assert cat_data["has_data"] is False
    assert cat_data["total_sales"] == 0
    assert cat_data["categories"] == []

    # 4. Sales trend
    res_trend = client.get("/api/dashboard/sales-trend?granularity=daily", headers=headers)
    assert res_trend.status_code == 200
    trend_data = res_trend.json()
    assert trend_data["has_data"] is False
    assert trend_data["total_sales"] == 0
    assert trend_data["total_profit"] == 0
    assert all(p["sales"] == 0 for p in trend_data["points"])

def test_empty_database_alerts_endpoint(clean_db, client):
    """Verify stock alerts summary on empty store shows 0 alerts and 0 products."""
    shop = models.Shop(
        name="Empty Alerts Store",
        phone="9876543210",
        onboarding_completed=True,
        trial_end_date=datetime.utcnow() + timedelta(days=5),
    )
    clean_db.add(shop)
    clean_db.commit()
    clean_db.refresh(shop)

    token = create_access_token(data={"sub": str(shop.id), "phone": shop.phone})
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/alerts", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total_products"] == 0
    assert data["total_alerts"] == 0
    assert data["out_of_stock"] == []
    assert data["low_stock"] == []

def test_empty_database_analytics_endpoints(clean_db, client):
    """Verify analytics endpoints on brand-new account return 0 and safe zero states."""
    shop = models.Shop(
        name="Empty Analytics Store",
        phone="9876543211",
        onboarding_completed=True,
        trial_end_date=datetime.utcnow() + timedelta(days=5),
    )
    clean_db.add(shop)
    clean_db.commit()
    clean_db.refresh(shop)

    token = create_access_token(data={"sub": str(shop.id), "phone": shop.phone})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Sales Analytics
    res_sales = client.get("/api/analytics/sales?granularity=daily", headers=headers)
    assert res_sales.status_code == 200
    s_data = res_sales.json()
    assert s_data["total_sales"] == 0
    assert s_data["total_profit"] == 0
    assert s_data["total_transactions"] == 0
    assert s_data["has_data"] is False
    assert s_data["average_bill"] == 0
    assert s_data["profit_margin_pct"] == 0
    assert s_data["highlights"]["best_day"] == "–"

    # 2. Category Analytics (Dashboard Category Sales)
    res_cats = client.get("/api/dashboard/category-sales?period=today", headers=headers)
    assert res_cats.status_code == 200
    c_data = res_cats.json()
    assert c_data["total_sales"] == 0
    assert c_data["has_data"] is False
    assert c_data["categories"] == []

    # 3. Product Analytics
    res_prods = client.get("/api/analytics/products?period=30d", headers=headers)
    assert res_prods.status_code == 200
    p_data = res_prods.json()
    assert p_data["has_data"] is False
    assert p_data["total_products"] == 0
    assert p_data["total_sales"] == 0
    assert p_data["best_selling"] == []
    assert p_data["slow_selling"] == []
    assert p_data["profit_table"] == []

    # 4. Inventory Analytics
    res_inv = client.get("/api/analytics/inventory", headers=headers)
    assert res_inv.status_code == 200
    inv_data = res_inv.json()
    assert inv_data["has_data"] is False
    assert inv_data["summary"]["stock_value_at_cost"] == 0
    assert inv_data["summary"]["number_of_products"] == 0
    assert inv_data["summary"]["low_stock_count"] == 0
    assert inv_data["out_of_stock_list"] == []
    assert all(g["product_count"] == 0 and len(g["items"]) == 0 for g in inv_data["expiry_groups"])

    # 5. Profitability Analytics
    res_prof = client.get("/api/analytics/profitability", headers=headers)
    assert res_prof.status_code == 200
    prof_data = res_prof.json()
    assert prof_data["total_sales"] == 0
    assert prof_data["gross_profit"] == 0
    assert prof_data["net_profit"] == 0
    assert prof_data["total_cogs"] == 0
    assert prof_data["total_expenses"] == 0
    assert prof_data["has_data"] is False

def test_empty_database_recommendations_endpoint(clean_db, client):
    """Verify recommendations endpoint shows has_enough_data=False and 0 counts on empty db."""
    shop = models.Shop(
        name="Empty Rec Store",
        phone="9876543212",
        onboarding_completed=True,
        trial_end_date=datetime.utcnow() + timedelta(days=5),
    )
    clean_db.add(shop)
    clean_db.commit()
    clean_db.refresh(shop)

    token = create_access_token(data={"sub": str(shop.id), "phone": shop.phone})
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/ai/recommendations", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["has_enough_data"] is False
    assert data["recommendations"] == []
    checklist = data["checklist"]
    assert checklist["has_products"] is False
    assert checklist["product_count"] == 0
    assert checklist["has_sales_history"] is False
    assert data["summary"]["total"] == 0

def test_empty_database_admin_endpoints(clean_db, client):
    """Verify all admin endpoints on a completely pristine database with 0 businesses."""
    admin_login = client.post("/api/admin/dev-login")
    assert admin_login.status_code == 200
    token = admin_login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Admin Overview
    res_ov = client.get("/api/admin/overview?period=monthly", headers=headers)
    assert res_ov.status_code == 200
    ov_data = res_ov.json()
    assert ov_data["stats"]["monthly_revenue"] == 0
    assert ov_data["stats"]["paid_businesses"] == 0
    assert ov_data["stats"]["active_trials"] == 0
    assert ov_data["trend_points"] == []
    assert ov_data["recent_conversions"] == []
    assert len(ov_data["funnel"]) == 5

    # 2. Admin Businesses Table
    res_biz = client.get("/api/admin/businesses", headers=headers)
    assert res_biz.status_code == 200
    biz_data = res_biz.json()
    assert len(biz_data["items"]) == 0
    assert biz_data["total_count"] == 0

    # 3. Admin Plans & Prices
    res_plans = client.get("/api/admin/plans", headers=headers)
    assert res_plans.status_code == 200
    plans_data = res_plans.json()
    assert plans_data["total_subscribers"] == 0
    assert len(plans_data["modular_features"]) == 4
    for mod in plans_data["modular_features"]:
        assert mod["active_subscribers"] == 0
    assert plans_data["bundle"]["active_subscribers"] == 0

    # 4. Admin Promo Codes
    res_promos = client.get("/api/admin/promo-codes", headers=headers)
    assert res_promos.status_code == 200
    assert res_promos.json() == []

def test_empty_database_admin_export_and_detail(clean_db, client):
    """Verify admin CSV export and business detail on an empty database."""
    admin_login = client.post("/api/admin/dev-login")
    assert admin_login.status_code == 200
    token = admin_login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # CSV Export returns 200 with headers only
    res_csv = client.get("/api/admin/businesses/export-csv", headers=headers)
    assert res_csv.status_code == 200
    csv_text = res_csv.text.strip()
    lines = csv_text.splitlines()
    assert len(lines) == 1  # Only CSV header line, no data rows
    assert "Store Code" in lines[0] or "Store Name" in lines[0] or "Business Name" in lines[0] or "ID" in lines[0]

    # Business detail for non-existent ID returns 404
    res_404 = client.get("/api/admin/businesses/9999", headers=headers)
    assert res_404.status_code == 404

def test_empty_database_weekly_trend_and_category_sales(clean_db, client):
    """Verify weekly sales trend and category breakdowns return 0 and safe empty state on clean store."""
    shop = models.Shop(
        name="Clean Store Weekly Test",
        phone="9876543299",
        onboarding_completed=True,
        trial_end_date=datetime.utcnow() + timedelta(days=5),
    )
    clean_db.add(shop)
    clean_db.commit()
    clean_db.refresh(shop)

    token = create_access_token(data={"sub": str(shop.id), "phone": shop.phone})
    headers = {"Authorization": f"Bearer {token}"}

    # Weekly trend
    res_trend_w = client.get("/api/dashboard/sales-trend?granularity=weekly", headers=headers)
    assert res_trend_w.status_code == 200
    w_data = res_trend_w.json()
    assert w_data["has_data"] is False
    assert w_data["total_sales"] == 0
    assert w_data["total_profit"] == 0
    assert len(w_data["points"]) == 12
    assert all(p["sales"] == 0 and p["profit"] == 0 for p in w_data["points"])

    # Category sales for 7days and 30days
    for period in ["7days", "30days"]:
        res_cat = client.get(f"/api/dashboard/category-sales?period={period}", headers=headers)
        assert res_cat.status_code == 200
        cat_data = res_cat.json()
        assert cat_data["has_data"] is False
        assert cat_data["total_sales"] == 0
        assert cat_data["categories"] == []

def test_alerts_with_stockout_and_lowstock(clean_db, client):
    """Verify alerts endpoint accurately categorizes out of stock and low stock products."""
    shop = models.Shop(
        name="Stock Alert Test Kirana",
        phone="9876543288",
        onboarding_completed=True,
        trial_end_date=datetime.utcnow() + timedelta(days=5),
    )
    clean_db.add(shop)
    clean_db.commit()
    clean_db.refresh(shop)

    # 1 out of stock product
    p_oos = models.Product(
        name="Tata Salt 1kg",
        category="Groceries",
        cost_price=20.0,
        selling_price=28.0,
        stock_qty=0,
        reorder_level=10,
    )
    # 1 low stock product
    p_low = models.Product(
        name="Fortune Sunflower Oil 1L",
        category="Groceries",
        cost_price=110.0,
        selling_price=140.0,
        stock_qty=3,
        reorder_level=8,
    )
    # 1 normal stock product
    p_ok = models.Product(
        name="Aashirvaad Atta 5kg",
        category="Flour",
        cost_price=220.0,
        selling_price=260.0,
        stock_qty=25,
        reorder_level=5,
    )
    clean_db.add_all([p_oos, p_low, p_ok])
    clean_db.commit()

    token = create_access_token(data={"sub": str(shop.id), "phone": shop.phone})
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/alerts", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total_products"] == 3
    assert data["total_alerts"] == 2
    assert len(data["out_of_stock"]) == 1
    assert data["out_of_stock"][0]["name"] == "Tata Salt 1kg"
    assert data["out_of_stock"][0]["stock_qty"] == 0
    assert len(data["low_stock"]) == 1
    assert data["low_stock"][0]["name"] == "Fortune Sunflower Oil 1L"
    assert data["low_stock"][0]["stock_qty"] == 3

def test_admin_promo_codes_crud_and_plans_update(clean_db, client):
    """Verify admin promo code lifecycle and plan price adjustments."""
    admin_login = client.post("/api/admin/dev-login")
    assert admin_login.status_code == 200
    token = admin_login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create promo code
    promo_payload = {
        "code": "DIWALI100",
        "discount_type": "fixed",
        "discount_value": 100.0,
        "valid_until": "31 Dec 2026",
        "max_uses": 50,
        "is_active": True,
    }
    create_res = client.post("/api/admin/promo-codes", json=promo_payload, headers=headers)
    assert create_res.status_code in [200, 201]
    promo_id = create_res.json().get("id") or 1

    # Verify promo listed
    list_res = client.get("/api/admin/promo-codes", headers=headers)
    assert list_res.status_code == 200
    promos = list_res.json()
    assert any(p["code"] == "DIWALI100" for p in promos)

    # 2. Update promo code
    update_res = client.put(f"/api/admin/promo-codes/{promo_id}", json={
        "code": "DIWALI100",
        "discount_type": "percentage",
        "discount_value": 25.0,
        "valid_until": "31 Dec 2026",
        "max_uses": 100,
        "is_active": True,
    }, headers=headers)
    assert update_res.status_code == 200
    assert update_res.json()["discount_type"] == "percentage"
    assert update_res.json()["discount_value"] == 25.0

    # 3. Update modular plans
    plans_res = client.get("/api/admin/plans", headers=headers)
    assert plans_res.status_code == 200
    plans_payload = plans_res.json()
    # Modify first module
    plans_payload["modular_features"][0]["monthly_price"] = 299
    update_plans = client.post("/api/admin/plans", json=plans_payload, headers=headers)
    assert update_plans.status_code == 200

    # 4. Delete promo code
    del_res = client.delete(f"/api/admin/promo-codes/{promo_id}", headers=headers)
    assert del_res.status_code == 200

def test_admin_bulk_actions_and_business_detail(clean_db, client):
    """Verify admin business detail, bulk extend trial, activate, and suspend actions."""
    # Create 2 shops
    shop1 = models.Shop(
        name="Om Kirana Store",
        owner_name="Ramesh Patel",
        phone="9876540001",
        onboarding_completed=True,
        trial_end_date=datetime.utcnow() + timedelta(days=3),
    )
    shop2 = models.Shop(
        name="Jai Hind Traders",
        owner_name="Suresh Kumar",
        phone="9876540002",
        onboarding_completed=True,
        trial_end_date=datetime.utcnow() + timedelta(days=1),
    )
    clean_db.add_all([shop1, shop2])
    clean_db.commit()
    clean_db.refresh(shop1)
    clean_db.refresh(shop2)

    admin_login = client.post("/api/admin/dev-login")
    assert admin_login.status_code == 200
    token = admin_login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Get Business Detail
    detail_res = client.get(f"/api/admin/businesses/{shop1.id}", headers=headers)
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert detail_data["shop"]["name"] == "Om Kirana Store"
    assert detail_data["shop"]["phone"] == "9876540001"
    assert "trial_info" in detail_data

    # 2. Bulk Extend Trial (+7 days)
    bulk_extend = client.post("/api/admin/businesses/bulk-action", json={
        "action": "extend_trial",
        "shop_ids": [shop1.id, shop2.id],
        "days": 7
    }, headers=headers)
    assert bulk_extend.status_code == 200
    assert bulk_extend.json()["success"] is True

    # 3. Bulk Activate
    bulk_act = client.post("/api/admin/businesses/bulk-action", json={
        "action": "activate",
        "shop_ids": [shop1.id],
    }, headers=headers)
    assert bulk_act.status_code == 200
    assert bulk_act.json()["success"] is True

    # 4. Bulk Suspend
    bulk_susp = client.post("/api/admin/businesses/bulk-action", json={
        "action": "suspend",
        "shop_ids": [shop2.id],
    }, headers=headers)
    assert bulk_susp.status_code == 200
    assert bulk_susp.json()["success"] is True


