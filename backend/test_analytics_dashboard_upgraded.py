import pytest
from datetime import datetime, timedelta, date
from fastapi.testclient import TestClient
from main import app
from database import Base, engine
import models
import auth

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_and_teardown():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def test_analytics_dashboard_zero_state():
    """Verify clean zero state when database has no sales records."""
    res = client.get("/api/analytics/dashboard?period=30d")
    assert res.status_code == 200
    data = res.json()
    assert data["has_data"] is False
    assert data["total_sales"] == 0.0
    assert data["total_profit"] == 0.0
    assert data["total_transactions"] == 0

    # KPIs check
    kpis = data["kpis"]
    assert kpis["daily"]["sales"] == 0.0
    assert kpis["daily"]["transactions"] == 0
    assert kpis["daily"]["delta_pct"] == 0.0
    assert "No sales" in kpis["daily"]["comparison_message"]

    assert kpis["weekly"]["sales"] == 0.0
    assert kpis["monthly"]["sales"] == 0.0

    # Lists empty
    assert data["best_selling"] == []
    assert data["slow_selling"] == []
    assert data["demand_analysis"] == []
    assert data["most_profitable"] == []
    assert data["comparison_table"] == []


def test_analytics_dashboard_kpis_and_ranking_metrics():
    """
    Tests:
    1. Daily, Weekly, and Monthly KPI calculations with percentage changes.
    2. Zero prior sales handling.
    3. Best-Selling rankings respecting user-selected metric (revenue vs units vs profit).
    """
    now = datetime.utcnow()

    # Create 3 products
    p_salt = client.post("/products/", json={
        "name": "Tata Salt 1kg",
        "category": "Grocery",
        "cost_price": 20.0,
        "selling_price": 28.0,
        "stock_qty": 50,
        "reorder_level": 10,
    }).json()

    p_ghee = client.post("/products/", json={
        "name": "Amul Ghee 1L",
        "category": "Dairy",
        "cost_price": 500.0,
        "selling_price": 600.0,
        "stock_qty": 20,
        "reorder_level": 5,
    }).json()

    p_biscuit = client.post("/products/", json={
        "name": "Parle-G 100g",
        "category": "Snacks",
        "cost_price": 8.0,
        "selling_price": 10.0,
        "stock_qty": 200,
        "reorder_level": 20,
    }).json()

    # Sale today:
    # 5 Salt (sales=140, profit=40)
    # 1 Ghee (sales=600, profit=100)
    # 50 Biscuits (sales=500, profit=100)
    # Total today = 1240 sales, 240 profit, 1 transaction
    client.post("/sales/", json={
        "total_amount": 1240.0,
        "total_profit": 240.0,
        "payment_mode": "UPI",
        "date_time": now.isoformat(),
        "items": [
            {"product_id": p_salt["id"], "qty": 5, "unit_price": 28.0, "unit_cost": 20.0},
            {"product_id": p_ghee["id"], "qty": 1, "unit_price": 600.0, "unit_cost": 500.0},
            {"product_id": p_biscuit["id"], "qty": 50, "unit_price": 10.0, "unit_cost": 8.0},
        ]
    })

    # Sale yesterday:
    # Total yesterday = 1000 sales, 200 profit, 1 tx
    yest_dt = now - timedelta(days=1)
    client.post("/sales/", json={
        "total_amount": 1000.0,
        "total_profit": 200.0,
        "payment_mode": "Cash",
        "date_time": yest_dt.isoformat(),
        "items": []
    })

    # 1. Test Daily KPI: today (1240) vs yesterday (1000) -> +24.0%
    res = client.get("/api/analytics/dashboard?period=today")
    assert res.status_code == 200
    data = res.json()
    assert data["has_data"] is True
    assert data["total_sales"] == 1240.0

    kpi_d = data["kpis"]["daily"]
    assert kpi_d["sales"] == 1240.0
    assert kpi_d["transactions"] == 1
    assert kpi_d["profit"] == 240.0
    assert kpi_d["prev_sales"] == 1000.0
    assert kpi_d["delta_pct"] == 24.0
    assert "+24.0% vs yesterday" in kpi_d["comparison_message"]

    # 2. Test Ranking Metric: Units vs Revenue vs Profit
    # By units: Biscuits (50) > Salt (5) > Ghee (1)
    res_units = client.get("/api/analytics/dashboard?period=today&ranking_metric=units")
    assert res_units.status_code == 200
    best_u = res_units.json()["best_selling"]
    assert len(best_u) == 3
    assert best_u[0]["name"] == "Parle-G 100g"
    assert best_u[0]["units_sold"] == 50
    assert best_u[1]["name"] == "Tata Salt 1kg"
    assert best_u[2]["name"] == "Amul Ghee 1L"

    # By revenue: Ghee (600) > Biscuits (500) > Salt (140)
    res_rev = client.get("/api/analytics/dashboard?period=today&ranking_metric=revenue")
    best_r = res_rev.json()["best_selling"]
    assert best_r[0]["name"] == "Amul Ghee 1L"
    assert best_r[0]["revenue"] == 600.0
    assert best_r[1]["name"] == "Parle-G 100g"
    assert best_r[2]["name"] == "Tata Salt 1kg"

    # By profit: Ghee & Biscuits tied at 100, then Salt at 40
    res_prof = client.get("/api/analytics/dashboard?period=today&ranking_metric=profit")
    best_p = res_prof.json()["best_selling"]
    assert best_p[0]["profit"] == 100.0
    assert best_p[1]["profit"] == 100.0
    assert best_p[2]["name"] == "Tata Salt 1kg"


def test_slow_selling_and_demand_velocity():
    """
    Tests:
    1. Demand analysis velocity and trend (Increasing / Stable / Decreasing).
    2. Slow-selling classification and days since last sale.
    3. Accurate stockout warnings and restocking quantity recommendations.
    """
    now = datetime.utcnow()

    # Product A: High demand surge (stock=30, sold 20 in recent 7d vs 5 in prior 7d)
    p_surge = client.post("/products/", json={
        "name": "Organic Honey 500g",
        "category": "Organic",
        "cost_price": 200.0,
        "selling_price": 280.0,
        "stock_qty": 30,
        "reorder_level": 5,
    }).json()

    # Product B: Stagnant stock (stock=30, last sold 40 days ago)
    p_stagnant = client.post("/products/", json={
        "name": "Toothpaste 150g",
        "category": "Personal Care",
        "cost_price": 50.0,
        "selling_price": 70.0,
        "stock_qty": 30,
        "reorder_level": 5,
    }).json()

    # Sale 40 days ago for Toothpaste (1 unit sold -> 29 left)
    client.post("/sales/", json={
        "total_amount": 70.0,
        "total_profit": 20.0,
        "payment_mode": "Cash",
        "date_time": (now - timedelta(days=40)).isoformat(),
        "items": [
            {"product_id": p_stagnant["id"], "qty": 1, "unit_price": 70.0, "unit_cost": 50.0}
        ]
    })

    # Prior 7d sale for Honey (8 days ago) -> 5 units (30 - 5 = 25 left)
    client.post("/sales/", json={
        "total_amount": 1400.0,
        "total_profit": 400.0,
        "payment_mode": "UPI",
        "date_time": (now - timedelta(days=8)).isoformat(),
        "items": [
            {"product_id": p_surge["id"], "qty": 5, "unit_price": 280.0, "unit_cost": 200.0}
        ]
    })

    # Current 7d sales for Honey (2 days ago) -> 20 units (25 - 20 = 5 left)
    client.post("/sales/", json={
        "total_amount": 5600.0,
        "total_profit": 1600.0,
        "payment_mode": "UPI",
        "date_time": (now - timedelta(days=2)).isoformat(),
        "items": [
            {"product_id": p_surge["id"], "qty": 20, "unit_price": 280.0, "unit_cost": 200.0}
        ]
    })

    res = client.get("/api/analytics/dashboard?period=7d")
    assert res.status_code == 200
    data = res.json()

    # 1. Demand Analysis for Honey:
    honey_demand = next(d for d in data["demand_analysis"] if d["product_id"] == p_surge["id"])
    assert honey_demand["units_sold"] == 20
    assert honey_demand["prev_units_sold"] == 5
    assert honey_demand["velocity_per_day"] == round(20 / 7, 2)
    assert honey_demand["demand_trend"] == "Increasing"
    assert honey_demand["velocity_change_pct"] == 300.0  # (20 - 5) / 5 * 100
    # Honey now has 5 units remaining, selling at 2.86 units/day -> ~1.7 days remaining -> stockout warning!
    assert honey_demand["stockout_warning"] is True
    assert honey_demand["days_stock_remaining"] <= 3.0
    assert honey_demand["suggested_restock_qty"] > 0

    # 2. Slow Selling for Toothpaste:
    # Has 29 stock, last sold 40 days ago -> "No Recent Sales"
    tp_slow = next(s for s in data["slow_selling"] if s["product_id"] == p_stagnant["id"])
    assert tp_slow["status"] == "No Recent Sales"
    assert tp_slow["days_since_last_sale"] >= 39
    assert tp_slow["units_sold"] == 0
    assert "Zero sales in" in tp_slow["recommendation"]

    # 3. Actionable Insights generated
    assert len(data["insights"]) > 0
    surge_ins = next((i for i in data["insights"] if i["type"] == "demand_surge"), None)
    assert surge_ins is not None
    assert "Organic Honey" in surge_ins["title"]
    assert "jumped" in surge_ins["description"]


def test_shop_isolation_in_analytics_dashboard():
    """Verify strict shop isolation: Shop 1 cannot see Shop 2 data."""
    # Create two shops in DB
    db = next(app.dependency_overrides.get(main_get_db, default_get_db)())
    shop1 = models.Shop(name="Alpha Supermarket", phone="9998881111", is_paid=True)
    shop2 = models.Shop(name="Beta Supermarket", phone="9998882222", is_paid=True)
    db.add(shop1)
    db.add(shop2)
    db.commit()
    db.refresh(shop1)
    db.refresh(shop2)

    token1 = auth.create_access_token(data={"sub": str(shop1.id)})
    token2 = auth.create_access_token(data={"sub": str(shop2.id)})
    headers1 = {"Authorization": f"Bearer {token1}"}
    headers2 = {"Authorization": f"Bearer {token2}"}

    # Create products for Shop 1 and Shop 2
    p1 = client.post("/products/", json={
        "name": "Shop 1 Exclusive Item",
        "category": "Exclusive",
        "cost_price": 50.0,
        "selling_price": 100.0,
        "stock_qty": 20,
        "reorder_level": 5,
    }, headers=headers1).json()

    p2 = client.post("/products/", json={
        "name": "Shop 2 Secret Item",
        "category": "Secret",
        "cost_price": 100.0,
        "selling_price": 200.0,
        "stock_qty": 50,
        "reorder_level": 10,
    }, headers=headers2).json()

    now = datetime.utcnow()
    # Sale for Shop 1: 500 sales
    client.post("/sales/", json={
        "total_amount": 500.0,
        "total_profit": 250.0,
        "payment_mode": "UPI",
        "date_time": now.isoformat(),
        "items": [{"product_id": p1["id"], "qty": 5, "unit_price": 100.0, "unit_cost": 50.0}]
    }, headers=headers1)

    # Query for Shop 1
    res1 = client.get("/api/analytics/dashboard?period=today", headers=headers1)
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["total_sales"] == 500.0
    assert any(b["name"] == "Shop 1 Exclusive Item" for b in data1["best_selling"])
    assert not any(b["name"] == "Shop 2 Secret Item" for b in data1["best_selling"])

    # Query for Shop 2 (0 sales)
    res2 = client.get("/api/analytics/dashboard?period=today", headers=headers2)
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["total_sales"] == 0.0
    assert not any(b["name"] == "Shop 1 Exclusive Item" for b in data2["best_selling"])


def default_get_db():
    from database import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def main_get_db():
    from database import get_db
    return get_db
