import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from main import app, calculate_days_left
from database import Base, engine
import models

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_and_teardown():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


# ==============================================================
# 1. UNIT TESTS: DAYS-LEFT CALCULATION (CRASH-PROOF & ZERO SALES)
# ==============================================================

def test_calculate_days_left_zero_sales_history():
    """Zero sales history must return None for days_left and not crash (no division by zero)."""
    days_left, rate, is_high_demand = calculate_days_left(stock_qty=50, units_sold_14d=0)
    assert days_left is None
    assert rate == 0.0
    assert is_high_demand is False

    # Negative or invalid sales units also safely handled
    days_left, rate, is_high_demand = calculate_days_left(stock_qty=10, units_sold_14d=-5)
    assert days_left is None
    assert rate == 0.0
    assert is_high_demand is False


def test_calculate_days_left_high_demand():
    """Stock will run out within 7 days at the last-14-day average sales rate."""
    # 28 units sold in 14 days => 2.0 units/day. Stock is 10 units => 5.0 days left <= 7 => high demand!
    days_left, rate, is_high_demand = calculate_days_left(stock_qty=10, units_sold_14d=28)
    assert rate == 2.0
    assert days_left == 5.0
    assert is_high_demand is True


def test_calculate_days_left_healthy_runway():
    """Stock will last > 7 days => is_high_demand is False."""
    # 14 units sold in 14 days => 1.0 unit/day. Stock is 20 units => 20.0 days left > 7
    days_left, rate, is_high_demand = calculate_days_left(stock_qty=20, units_sold_14d=14)
    assert rate == 1.0
    assert days_left == 20.0
    assert is_high_demand is False


def test_calculate_days_left_out_of_stock():
    """Stock is 0 units."""
    # With sales history: days_left is 0.0
    days_left, rate, is_high_demand = calculate_days_left(stock_qty=0, units_sold_14d=14)
    assert rate == 1.0
    assert days_left == 0.0
    assert is_high_demand is False

    # Without sales history: days_left is None
    days_left, rate, is_high_demand = calculate_days_left(stock_qty=0, units_sold_14d=0)
    assert rate == 0.0
    assert days_left is None
    assert is_high_demand is False


# ==============================================================
# 2. API TESTS: GET /api/alerts
# ==============================================================

def test_alerts_zero_state_no_products():
    """When no products exist at all, total_products=0 and alerts are empty."""
    res = client.get("/api/alerts")
    assert res.status_code == 200
    data = res.json()
    assert data["total_products"] == 0
    assert data["total_alerts"] == 0
    assert data["out_of_stock_count"] == 0
    assert data["low_stock_count"] == 0
    assert len(data["out_of_stock"]) == 0
    assert len(data["low_stock"]) == 0


def test_alerts_products_exist_all_in_stock():
    """When products exist and all have stock > reorder_level without high demand."""
    prod_res = client.post("/products/", json={
        "name": "Tata Tea Gold 500g",
        "category": "Beverages",
        "cost_price": 200.0,
        "selling_price": 240.0,
        "stock_qty": 50,
        "reorder_level": 10,
    })
    assert prod_res.status_code == 201

    res = client.get("/api/alerts")
    assert res.status_code == 200
    data = res.json()
    assert data["total_products"] == 1
    assert data["total_alerts"] == 0
    assert data["out_of_stock_count"] == 0
    assert data["low_stock_count"] == 0


def test_alerts_out_of_stock_and_low_stock_groups():
    """Correctly groups out of stock (stock_qty = 0) and low stock (stock_qty <= reorder_level)."""
    # 1. Out of stock item
    p1 = client.post("/products/", json={
        "name": "Amul Butter 500g",
        "category": "Dairy",
        "cost_price": 240.0,
        "selling_price": 275.0,
        "stock_qty": 0,
        "reorder_level": 5,
    }).json()

    # 2. Low stock item
    p2 = client.post("/products/", json={
        "name": "Aashirvaad Atta 5kg",
        "category": "Staples",
        "cost_price": 210.0,
        "selling_price": 250.0,
        "stock_qty": 3,
        "reorder_level": 5,
    }).json()

    # 3. Healthy stock item with no sales
    p3 = client.post("/products/", json={
        "name": "Maggi Noodles 12-pack",
        "category": "Snacks",
        "cost_price": 140.0,
        "selling_price": 168.0,
        "stock_qty": 40,
        "reorder_level": 10,
    }).json()

    res = client.get("/api/alerts")
    assert res.status_code == 200
    data = res.json()
    assert data["total_products"] == 3
    assert data["total_alerts"] == 2
    assert data["out_of_stock_count"] == 1
    assert data["low_stock_count"] == 1

    assert data["out_of_stock"][0]["product_id"] == p1["id"]
    assert data["out_of_stock"][0]["status"] == "out_of_stock"
    assert data["out_of_stock"][0]["stock_qty"] == 0

    assert data["low_stock"][0]["product_id"] == p2["id"]
    assert data["low_stock"][0]["status"] == "low_stock"
    assert data["low_stock"][0]["stock_qty"] == 3
    # No sales history -> days_left is None, no crash
    assert data["low_stock"][0]["days_left"] is None
    assert data["low_stock"][0]["is_high_demand"] is False


def test_alerts_high_demand_with_recent_sales():
    """Flags high demand when sales velocity causes stock to run out in <= 7 days."""
    p = client.post("/products/", json={
        "name": "Fortune Sunflower Oil 1L",
        "category": "Oil",
        "cost_price": 120.0,
        "selling_price": 145.0,
        "stock_qty": 6,
        "reorder_level": 10,
    }).json()

    # Record sales of 28 units over last 14 days (e.g. today)
    # 28 units / 14 days = 2.0 units/day. Stock of 6 => 3.0 days left <= 7 days!
    now = datetime.utcnow()
    # Note: Stock in product was 6; to record sale of 28 without insufficient stock error, we adjust stock or sale
    # Wait, createSale checks product stock: product.stock_qty < item.qty raises error!
    # Let's give product stock of 50, sell 28, remaining stock will be 22.
    # To test low_stock and high demand: set reorder_level=25, initial stock=34, sell 28 -> remaining stock = 6!
    p_hd = client.post("/products/", json={
        "name": "Tata Salt 1kg",
        "category": "Staples",
        "cost_price": 20.0,
        "selling_price": 28.0,
        "stock_qty": 34,
        "reorder_level": 25,
    }).json()

    client.post("/sales/", json={
        "total_amount": 784.0,
        "total_profit": 224.0,
        "payment_mode": "UPI",
        "date_time": now.isoformat(),
        "items": [{
            "product_id": p_hd["id"],
            "qty": 28,
            "unit_price": 28.0,
            "unit_cost": 20.0,
        }]
    })

    res = client.get("/api/alerts")
    assert res.status_code == 200
    data = res.json()
    tata_salt = next((item for item in data["low_stock"] if item["product_id"] == p_hd["id"]), None)
    assert tata_salt is not None
    assert tata_salt["stock_qty"] == 6  # 34 - 28
    assert tata_salt["daily_sales_rate"] == 2.0
    assert tata_salt["days_left"] == 3.0
    assert tata_salt["is_high_demand"] is True


# ==============================================================
# 3. API TESTS: GET /api/dashboard/sales-trend
# ==============================================================

def test_sales_trend_zero_state():
    """Sales trend returns empty trend points and has_data=False when no sales exist."""
    res_daily = client.get("/api/dashboard/sales-trend?granularity=daily")
    assert res_daily.status_code == 200
    daily_data = res_daily.json()
    assert daily_data["granularity"] == "daily"
    assert daily_data["has_data"] is False
    assert daily_data["total_sales"] == 0.0
    assert len(daily_data["points"]) == 30

    res_weekly = client.get("/api/dashboard/sales-trend?granularity=weekly")
    assert res_weekly.status_code == 200
    weekly_data = res_weekly.json()
    assert weekly_data["granularity"] == "weekly"
    assert weekly_data["has_data"] is False
    assert weekly_data["total_sales"] == 0.0
    assert len(weekly_data["points"]) == 12


def test_sales_trend_with_sales():
    """Sales trend returns has_data=True and aggregates sales, profit, and transactions."""
    now = datetime.utcnow()
    client.post("/sales/", json={
        "total_amount": 1250.0,
        "total_profit": 350.0,
        "payment_mode": "UPI",
        "date_time": now.isoformat(),
        "items": []
    })

    res = client.get("/api/dashboard/sales-trend?granularity=daily")
    assert res.status_code == 200
    data = res.json()
    assert data["has_data"] is True
    assert data["total_sales"] == 1250.0
    assert data["total_profit"] == 350.0
    # Last point is today
    last_point = data["points"][-1]
    assert last_point["sales"] == 1250.0
    assert last_point["profit"] == 350.0
    assert last_point["transactions"] == 1


# ==============================================================
# 4. API TESTS: GET /api/dashboard/category-sales
# ==============================================================

def test_category_sales_zero_state():
    """Category sales returns has_data=False and empty categories when no sales exist."""
    for period in ["today", "7days", "30days"]:
        res = client.get(f"/api/dashboard/category-sales?period={period}")
        assert res.status_code == 200
        data = res.json()
        assert data["period"] == period
        assert data["has_data"] is False
        assert data["total_sales"] == 0.0
        assert data["categories"] == []


def test_category_sales_with_products_and_shares():
    """Category sales aggregates by product category and computes share percentages & top products."""
    # 1. Create 2 products in Grocery, 1 in Dairy
    p_rice = client.post("/products/", json={
        "name": "Basmati Rice 5kg",
        "category": "Grocery",
        "cost_price": 300.0,
        "selling_price": 400.0,
        "stock_qty": 20,
        "reorder_level": 5,
    }).json()

    p_dal = client.post("/products/", json={
        "name": "Toor Dal 1kg",
        "category": "Grocery",
        "cost_price": 100.0,
        "selling_price": 150.0,
        "stock_qty": 30,
        "reorder_level": 5,
    }).json()

    p_milk = client.post("/products/", json={
        "name": "Amul Taaza 1L",
        "category": "Dairy",
        "cost_price": 50.0,
        "selling_price": 60.0,
        "stock_qty": 50,
        "reorder_level": 10,
    }).json()

    now = datetime.utcnow()
    # Grocery sale: 2 * 400 = 800 (Rice) + 2 * 150 = 300 (Dal) = 1100
    # Dairy sale: 5 * 60 = 300 (Milk)
    # Total = 1400. Grocery = 1100 (78.6%), Dairy = 300 (21.4%)
    client.post("/sales/", json={
        "total_amount": 1400.0,
        "total_profit": 350.0,
        "payment_mode": "UPI",
        "date_time": now.isoformat(),
        "items": [
            {"product_id": p_rice["id"], "qty": 2, "unit_price": 400.0, "unit_cost": 300.0},
            {"product_id": p_dal["id"], "qty": 2, "unit_price": 150.0, "unit_cost": 100.0},
            {"product_id": p_milk["id"], "qty": 5, "unit_price": 60.0, "unit_cost": 50.0},
        ]
    })

    res = client.get("/api/dashboard/category-sales?period=today")
    assert res.status_code == 200
    data = res.json()
    assert data["has_data"] is True
    assert data["total_sales"] == 1400.0
    assert len(data["categories"]) == 2

    grocery = data["categories"][0]
    assert grocery["category"] == "Grocery"
    assert grocery["sales"] == 1100.0
    assert grocery["share_pct"] == 78.6
    assert grocery["units_sold"] == 4
    assert len(grocery["top_products"]) == 2
    assert grocery["top_products"][0]["name"] == "Basmati Rice 5kg"
    assert grocery["top_products"][0]["sales"] == 800.0

    dairy = data["categories"][1]
    assert dairy["category"] == "Dairy"
    assert dairy["sales"] == 300.0
    assert dairy["share_pct"] == 21.4
    assert dairy["units_sold"] == 5
