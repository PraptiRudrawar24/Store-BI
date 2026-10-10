import pytest
import os
from datetime import datetime, timedelta, date
from fastapi.testclient import TestClient
from main import app
from database import Base, engine, SessionLocal
import models
from auth import COOKIE_NAME, create_access_token

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_and_teardown():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def test_recommendations_zero_state():
    """When no products or sales exist, GET /api/ai/recommendations returns has_enough_data=False with checklist."""
    res = client.get("/api/ai/recommendations")
    assert res.status_code == 200
    data = res.json()
    assert data["has_enough_data"] is False
    assert data["recommendations"] == []
    assert data["checklist"]["has_products"] is False
    assert data["checklist"]["product_count"] == 0
    assert data["checklist"]["has_sales_history"] is False
    assert data["summary"]["total"] == 0


def test_recommendations_with_data_and_all_types():
    """Verify that when products and sales exist, recommendations compute correctly backed by owner's numbers."""
    db = SessionLocal()
    try:
        today = datetime.utcnow().date()
        # 1. Product 1: Stock More (High margin, high demand, running low)
        p1 = models.Product(
            name="Amul Butter 500g",
            category="Dairy",
            cost_price=200.0,
            selling_price=275.0, # Margin: 27.3%
            stock_qty=3,
            reorder_level=10,
        )
        # 2. Product 2: Bundle partner with P1
        p2 = models.Product(
            name="Britannia Brown Bread 400g",
            category="Bakery",
            cost_price=35.0,
            selling_price=50.0,
            stock_qty=15,
            reorder_level=5,
        )
        # 3. Product 3: Discount to Clear - Near Expiry
        p3 = models.Product(
            name="Fresh Paneer 200g",
            category="Dairy",
            cost_price=70.0,
            selling_price=95.0,
            stock_qty=8,
            reorder_level=5,
            expiry_date=today + timedelta(days=5),
        )
        # 4. Product 4: Reconsider (Low margin, low volume)
        p4 = models.Product(
            name="Loose Plastic Spoons",
            category="General",
            cost_price=19.0,
            selling_price=20.0, # Margin: 5%
            stock_qty=50,
            reorder_level=5,
        )
        # 5. Product 5: Price Check (Dairy category average margin is high, but p5 is low)
        p5 = models.Product(
            name="Curd Cup 400g",
            category="Dairy",
            cost_price=38.0,
            selling_price=40.0, # Margin: 5.0% vs Dairy avg ~20%+
            stock_qty=20,
            reorder_level=5,
        )
        db.add_all([p1, p2, p3, p4, p5])
        db.commit()

        # Add 10 sales spanning across days
        for i in range(10):
            sale_dt = datetime.utcnow() - timedelta(days=i)
            # Basket with P1 and P2 bought together (Market basket bundling)
            s = models.Sale(
                date_time=sale_dt,
                total_amount=325.0,
                total_profit=90.0,
                payment_mode="UPI",
                items=[
                    models.SaleItem(product_id=p1.id, qty=2, unit_price=275.0, unit_cost=200.0),
                    models.SaleItem(product_id=p2.id, qty=1, unit_price=50.0, unit_cost=35.0),
                ]
            )
            db.add(s)
        db.commit()
    finally:
        db.close()

    res = client.get("/api/ai/recommendations")
    assert res.status_code == 200
    data = res.json()
    assert data["has_enough_data"] is True
    assert data["summary"]["total"] > 0
    rec_types = [r["type"] for r in data["recommendations"]]

    # Check for Stock More
    assert "stock_more" in rec_types
    stock_more_rec = next(r for r in data["recommendations"] if r["type"] == "stock_more")
    assert "Amul Butter" in stock_more_rec["title"]
    assert "27.3%" in stock_more_rec["reason"]
    assert "Reorder" in stock_more_rec["action"]
    assert stock_more_rec["template_explanations"]["en"] is not None
    assert stock_more_rec["template_explanations"]["hi"] is not None
    assert stock_more_rec["template_explanations"]["mr"] is not None

    # Check for Bundle
    assert "bundle" in rec_types
    bundle_rec = next(r for r in data["recommendations"] if r["type"] == "bundle")
    assert "Support:" in bundle_rec["reason"]
    assert "Confidence:" in bundle_rec["reason"]

    # Check for Discount to clear
    assert "discount_clear" in rec_types
    disc_rec = next(r for r in data["recommendations"] if r["type"] == "discount_clear")
    assert "Expires" in disc_rec["title"] or "Expires" in disc_rec["reason"]

    # Check for Reconsider
    assert "reconsider" in rec_types

    # Check for Price check
    assert "price_check" in rec_types
    price_rec = next(r for r in data["recommendations"] if r["type"] == "price_check")
    assert "below the Dairy category average" in price_rec["reason"]


def test_recommendation_explain_endpoint():
    """Test POST /api/ai/recommendations/explain in en, hi, mr with fallback when no api key."""
    # Ensure GEMINI_API_KEY is not set for test
    old_key = os.environ.get("GEMINI_API_KEY")
    if "GEMINI_API_KEY" in os.environ:
        del os.environ["GEMINI_API_KEY"]

    try:
        # Test English
        res_en = client.post("/api/ai/recommendations/explain", json={
            "rec_id": "stock_more_1",
            "title": "Stock more Amul Butter 500g",
            "reason": "High margin of 27.3% and 20 units sold recently, only 3 left in stock.",
            "action": "Reorder 25 units",
            "language": "en"
        })
        assert res_en.status_code == 200
        assert res_en.json()["language"] == "en"
        assert len(res_en.json()["explanation"]) > 20

        # Test Hindi
        res_hi = client.post("/api/ai/recommendations/explain", json={
            "rec_id": "stock_more_1",
            "title": "Stock more Amul Butter 500g",
            "reason": "High margin of 27.3%",
            "action": "Reorder 25 units",
            "language": "hi"
        })
        assert res_hi.status_code == 200
        assert res_hi.json()["language"] == "hi"
        assert "दुकान" in res_hi.json()["explanation"]

        # Test Marathi
        res_mr = client.post("/api/ai/recommendations/explain", json={
            "rec_id": "stock_more_1",
            "title": "Stock more Amul Butter 500g",
            "reason": "High margin of 27.3%",
            "action": "Reorder 25 units",
            "language": "mr"
        })
        assert res_mr.status_code == 200
        assert res_mr.json()["language"] == "mr"
        assert "दुकान" in res_mr.json()["explanation"] or "नफा" in res_mr.json()["explanation"]
    finally:
        if old_key is not None:
            os.environ["GEMINI_API_KEY"] = old_key


def test_admin_zero_start_rule_and_access_control():
    """
    ZERO-START RULE: With no registered shops, every number is 0, chart is empty frame,
    funnel shows 0, table shows 'No businesses have registered yet'.
    Guarded by is_admin.
    """
    db = SessionLocal()
    try:
        # Create a non-admin shop
        user_shop = models.Shop(
            name="Local Kirana",
            phone="8888888888",
            is_admin=False
        )
        # Create an admin shop
        admin_shop = models.Shop(
            name="Store BI Operations",
            phone="9999999999",
            email="admin@storebi.com",
            is_admin=True
        )
        db.add_all([user_shop, admin_shop])
        db.commit()
        db.refresh(user_shop)
        db.refresh(admin_shop)

        user_token = create_access_token(data={"sub": str(user_shop.id), "phone": user_shop.phone})
        admin_token = create_access_token(data={"sub": str(admin_shop.id), "phone": admin_shop.phone})
    finally:
        db.close()

    # 1. Non-admin user gets 403 Forbidden
    res_forbidden = client.get("/api/admin/overview", headers={"Authorization": f"Bearer {user_token}"})
    assert res_forbidden.status_code == 403

    # Delete merchant shop to verify ZERO-START RULE with 0 registered merchant shops
    db = SessionLocal()
    try:
        db.query(models.Shop).filter(models.Shop.id == user_shop.id).delete()
        db.commit()
    finally:
        db.close()

    # 2. Admin calls GET /api/admin/overview with 0 registered shops
    res_overview = client.get("/api/admin/overview", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_overview.status_code == 200
    ov = res_overview.json()
    assert ov["has_data"] is False
    assert ov["stats"]["new_registrations"] == 0
    assert ov["stats"]["active_trials"] == 0
    assert ov["stats"]["paid_businesses"] == 0
    assert ov["stats"]["conversion_rate"] == 0.0
    assert ov["stats"]["monthly_revenue"] == 0.0
    assert ov["trend_points"] == []
    assert len(ov["funnel"]) == 5
    for f in ov["funnel"]:
        assert f["count"] == 0
        assert f["pct"] == 0.0
    assert ov["recent_conversions"] == []

    # 3. Admin calls GET /api/admin/businesses with 0 registered shops
    res_biz = client.get("/api/admin/businesses", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_biz.status_code == 200
    biz_data = res_biz.json()
    assert biz_data["total_count"] == 0
    assert biz_data["items"] == []


def test_admin_overview_and_businesses_with_data():
    """Verify that when merchant businesses register, admin KPIs, funnel, and table reflect real database values."""
    db = SessionLocal()
    try:
        admin_shop = models.Shop(
            name="Store BI Operations",
            phone="9999999999",
            email="admin@storebi.com",
            is_admin=True
        )
        # Register 3 merchant shops: 1 paid, 2 trial
        m1 = models.Shop(
            name="Sharma General Store",
            owner_name="Ramesh Sharma",
            phone="9876543210",
            email="sharma@store.in",
            city="Pune",
            state="MH",
            category="Grocery & Kirana",
            is_paid=True,
            status="active",
            plan_name="Annual Pro",
            subscription_amount=5999.0,
            onboarding_completed=True,
            onboarding_step=4,
            trial_end_date=datetime.utcnow() + timedelta(days=10),
            created_at=datetime.utcnow() - timedelta(days=5),
        )
        m2 = models.Shop(
            name="Apollo Pharmacy Express",
            owner_name="Dr. Anil Verma",
            phone="9823456789",
            email="apollo@pharma.in",
            city="Mumbai",
            state="MH",
            category="Medical & Pharmacy",
            is_paid=False,
            status="trial",
            plan_name="Trial (All features)",
            subscription_amount=0.0,
            onboarding_completed=False,
            onboarding_step=2,
            trial_end_date=datetime.utcnow() + timedelta(days=2),
            created_at=datetime.utcnow() - timedelta(days=2),
        )
        m3 = models.Shop(
            name="Balaji Provision Store",
            owner_name="Suresh Patel",
            phone="9123456780",
            email="balaji@prov.in",
            city="Pune",
            state="MH",
            category="Grocery & Kirana",
            is_paid=False,
            status="trial",
            plan_name="Trial (All features)",
            subscription_amount=0.0,
            onboarding_completed=False,
            onboarding_step=1,
            trial_end_date=datetime.utcnow() + timedelta(days=4),
            created_at=datetime.utcnow() - timedelta(days=1),
        )
        db.add_all([admin_shop, m1, m2, m3])
        db.commit()
        db.refresh(admin_shop)
        db.refresh(m1)
        db.refresh(m2)
        db.refresh(m3)
        m2_id = m2.id
        m3_id = m3.id

        admin_token = create_access_token(data={"sub": str(admin_shop.id), "phone": admin_shop.phone})
    finally:
        db.close()


    # Overview
    res = client.get("/api/admin/overview?period=monthly", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    ov = res.json()
    assert ov["has_data"] is True
    assert ov["stats"]["new_registrations"] == 3
    assert ov["stats"]["paid_businesses"] == 1
    assert ov["stats"]["active_trials"] == 2
    assert ov["stats"]["monthly_revenue"] == 5999.0
    assert ov["stats"]["conversion_rate"] == 33.3
    assert len(ov["recent_conversions"]) == 1
    assert ov["recent_conversions"][0]["business_name"] == "Sharma General Store"

    # Funnel checks
    assert ov["funnel"][0]["count"] == 3  # Registered
    assert ov["funnel"][1]["count"] == 2  # Added sale (m1 and m2)
    assert ov["funnel"][4]["count"] == 1  # Converted to paid (m1)

    # Businesses search & filter
    res_pune = client.get("/api/admin/businesses?city=Pune", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_pune.status_code == 200
    pune_data = res_pune.json()
    assert len(pune_data["items"]) == 2

    # Businesses CSV export
    res_csv = client.get("/api/admin/businesses/export-csv", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.headers["content-type"]
    assert "Sharma General Store" in res_csv.text

    # Bulk actions: extend trial
    res_bulk = client.post("/api/admin/businesses/bulk-action", headers={"Authorization": f"Bearer {admin_token}"}, json={
        "action": "extend_trial",
        "shop_ids": [m2_id, m3_id],
        "days": 7
    })
    assert res_bulk.status_code == 200
    assert res_bulk.json()["updated_count"] == 2

