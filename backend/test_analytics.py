import pytest
from datetime import datetime, timedelta, date
from fastapi.testclient import TestClient
from main import app
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
# 1. SALES ANALYTICS: GET /api/analytics/sales
# ==============================================================

def test_sales_analytics_zero_state():
    """Zero state: empty chart frame, empty highlights all showing '–'."""
    res = client.get("/api/analytics/sales?granularity=daily")
    assert res.status_code == 200
    data = res.json()
    assert data["granularity"] == "daily"
    assert data["has_data"] is False
    assert data["total_sales"] == 0.0
    assert data["total_profit"] == 0.0
    assert data["total_transactions"] == 0
    assert data["average_bill"] == 0.0
    assert data["profit_margin_pct"] == 0.0

    # Highlights must all show "–"
    highlights = data["highlights"]
    assert highlights["best_day"] == "–"
    assert highlights["slowest_day"] == "–"
    assert highlights["busiest_hour"] == "–"

    # Heatmap should be present (7 days x 24 hours = 168 cells) with count 0
    assert len(data["heatmap"]) == 168
    assert all(c["count"] == 0 for c in data["heatmap"])


def test_sales_analytics_weekly_and_monthly_zero_state():
    """Weekly and Monthly granularities in zero state."""
    res_w = client.get("/api/analytics/sales?granularity=weekly")
    assert res_w.status_code == 200
    assert res_w.json()["granularity"] == "weekly"
    assert res_w.json()["has_data"] is False

    res_m = client.get("/api/analytics/sales?granularity=monthly")
    assert res_m.status_code == 200
    assert res_m.json()["granularity"] == "monthly"
    assert res_m.json()["has_data"] is False


def test_sales_analytics_with_data_and_highlights():
    """Calculates sales, profit, average bill, highlights (best/slowest/busiest hour) and heatmap."""
    now = datetime.utcnow()
    # Sale 1: Today at 18:30 (6:30 PM) -> 1200 sales, 300 profit
    t1 = now.replace(hour=18, minute=30, second=0, microsecond=0)
    client.post("/sales/", json={
        "total_amount": 1200.0,
        "total_profit": 300.0,
        "payment_mode": "UPI",
        "date_time": t1.isoformat(),
        "items": []
    })

    # Sale 2: Today at 18:45 (6:45 PM) -> 800 sales, 200 profit
    t2 = now.replace(hour=18, minute=45, second=0, microsecond=0)
    client.post("/sales/", json={
        "total_amount": 800.0,
        "total_profit": 200.0,
        "payment_mode": "Cash",
        "date_time": t2.isoformat(),
        "items": []
    })

    # Sale 3: Yesterday at 10:15 (10:15 AM) -> 500 sales, 100 profit
    y = (now - timedelta(days=1)).replace(hour=10, minute=15, second=0, microsecond=0)
    client.post("/sales/", json={
        "total_amount": 500.0,
        "total_profit": 100.0,
        "payment_mode": "UPI",
        "date_time": y.isoformat(),
        "items": []
    })

    res = client.get("/api/analytics/sales?granularity=daily")
    assert res.status_code == 200
    data = res.json()
    assert data["has_data"] is True
    assert data["total_sales"] == 2500.0
    assert data["total_profit"] == 600.0
    assert data["total_transactions"] == 3
    # Average bill: 2500 / 3 = 833.33
    assert data["average_bill"] == 833.33
    # Margin %: 600 / 2500 * 100 = 24.0%
    assert data["profit_margin_pct"] == 24.0

    # Highlights
    h = data["highlights"]
    assert h["best_day"] != "–"
    assert h["best_day_sales"] == 2000.0  # Today (1200 + 800)
    assert h["slowest_day"] != "–"
    assert h["slowest_day_sales"] == 500.0  # Yesterday
    assert "6 PM" in h["busiest_hour"] or "18:00" in h["busiest_hour"]
    assert h["busiest_hour_tx"] == 2

    # Heatmap check: hour 18 on today's weekday has 2 transactions
    w_today = t1.weekday()
    cell_18 = next((c for c in data["heatmap"] if c["weekday"] == w_today and c["hour"] == 18), None)
    assert cell_18 is not None
    assert cell_18["count"] == 2
    assert cell_18["sales"] == 2000.0


# ==============================================================
# 2. PRODUCT ANALYTICS: GET /api/analytics/products
# ==============================================================

def test_product_analytics_zero_state():
    """Zero state: no products or no sales in the period."""
    res = client.get("/api/analytics/products?period=30days&category=all")
    assert res.status_code == 200
    data = res.json()
    assert data["period"] == "30days"
    assert data["has_data"] is False
    assert data["total_products"] == 0
    assert data["demand_top"] == []
    assert data["best_selling"] == []
    assert data["slow_selling"] == []
    assert data["profit_table"] == []


def test_product_analytics_demand_ranking_abc_and_dead_stock():
    """Tests demand ranking, top/slow selling, ABC classification, and dead stock chip."""
    # 1. Product A: high volume (Atta 5kg, sales=8000)
    p_atta = client.post("/products/", json={
        "name": "Aashirvaad Atta 5kg",
        "category": "Staples",
        "cost_price": 200.0,
        "selling_price": 250.0,
        "stock_qty": 100,
        "reorder_level": 10,
    }).json()

    # 2. Product B: medium volume (Ghee 1L, sales=1500)
    p_ghee = client.post("/products/", json={
        "name": "Amul Ghee 1L",
        "category": "Dairy",
        "cost_price": 500.0,
        "selling_price": 600.0,
        "stock_qty": 50,
        "reorder_level": 5,
    }).json()

    # 3. Product C: low volume (Soap, sales=500)
    p_soap = client.post("/products/", json={
        "name": "Dettol Soap 75g",
        "category": "Personal Care",
        "cost_price": 30.0,
        "selling_price": 40.0,
        "stock_qty": 100,
        "reorder_level": 10,
    }).json()

    # 4. Product D: Dead Stock (Shampoo: in stock 10 units, 0 sales in 30 days)
    p_shampoo = client.post("/products/", json={
        "name": "Clinic Plus Shampoo 200ml",
        "category": "Personal Care",
        "cost_price": 100.0,
        "selling_price": 140.0,
        "stock_qty": 10,
        "reorder_level": 5,
    }).json()

    now = datetime.utcnow()
    # Record sales: Atta (32 units = 8000), Ghee (2.5 -> let's say 2 units = 1200 or 1500), Soap (10 units = 400)
    # Total revenue = 8000 + 1500 + 500 = 10,000.
    # Atta = 8000 (80%) -> Class A
    # Ghee = 1500 (15%) -> Class B
    # Soap = 500 (5%) -> Class C
    # Shampoo = 0 sales, stock > 0 -> no_sales_30d = True, Class C
    client.post("/sales/", json={
        "total_amount": 10000.0,
        "total_profit": 2000.0,
        "payment_mode": "UPI",
        "date_time": now.isoformat(),
        "items": [
            {"product_id": p_atta["id"], "qty": 32, "unit_price": 250.0, "unit_cost": 200.0}, # sales=8000, profit=1600
            {"product_id": p_ghee["id"], "qty": 3, "unit_price": 500.0, "unit_cost": 400.0},  # sales=1500, profit=300
            {"product_id": p_soap["id"], "qty": 12, "unit_price": 41.67, "unit_cost": 30.0}, # sales=500, profit=140
        ]
    })

    res = client.get("/api/analytics/products?period=30days&category=all")
    assert res.status_code == 200
    data = res.json()
    assert data["has_data"] is True
    assert data["total_products"] == 4
    assert len(data["categories_list"]) == 3

    # 1. Demand: Atta has highest units (32), then Soap (12), then Ghee (3)
    demand = data["demand_top"]
    assert len(demand) == 3
    assert demand[0]["name"] == "Aashirvaad Atta 5kg"
    assert demand[0]["units_sold"] == 32
    assert len(demand[0]["trend"]) == 7  # 7-day sparkline trend

    # 2. Best selling (top 10 by revenue)
    best = data["best_selling"]
    assert len(best) == 3
    assert best[0]["name"] == "Aashirvaad Atta 5kg"
    assert best[0]["sales"] == 8000.0
    assert best[0]["abc_class"] == "A"

    # 3. Slow selling
    slow = data["slow_selling"]
    assert len(slow) == 4
    # Shampoo has 0 sales and stock > 0, must be flagged no_sales_30d
    shampoo_entry = next((s for s in slow if s["product_id"] == p_shampoo["id"]), None)
    assert shampoo_entry is not None
    assert shampoo_entry["no_sales_30d"] is True
    assert shampoo_entry["sales"] == 0.0

    # 4. ABC classification in profit table
    ptable = data["profit_table"]
    atta_profit = next(p for p in ptable if p["product_id"] == p_atta["id"])
    assert atta_profit["abc_class"] == "A"
    assert atta_profit["margin_pct"] == 20.0  # 1600 / 8000 * 100 = 20%

    ghee_profit = next(p for p in ptable if p["product_id"] == p_ghee["id"])
    assert ghee_profit["abc_class"] == "B"

    soap_profit = next(p for p in ptable if p["product_id"] == p_soap["id"])
    assert soap_profit["abc_class"] == "C"

    # Category filter test: Personal Care only
    res_pc = client.get("/api/analytics/products?period=30days&category=Personal%20Care")
    assert res_pc.status_code == 200
    data_pc = res_pc.json()
    assert data_pc["total_products"] == 2
    assert all(p["category"] == "Personal Care" for p in data_pc["profit_table"])


# ==============================================================
# 3. INVENTORY ANALYTICS: GET /api/analytics/inventory
# ==============================================================

def test_inventory_analytics_zero_state():
    """Zero state: summary cards show ₹0 and 0, and lists empty."""
    res = client.get("/api/analytics/inventory")
    assert res.status_code == 200
    data = res.json()
    assert data["has_data"] is False
    summary = data["summary"]
    assert summary["stock_value_at_cost"] == 0.0
    assert summary["number_of_products"] == 0
    assert summary["low_stock_count"] == 0
    assert summary["inventory_turnover"] == 0.0

    assert data["out_of_stock_list"] == []
    assert len(data["expiry_groups"]) == 4

    # Check the 4 groups: expired, within_7d, within_30d, within_90d
    group_keys = [g["group_key"] for g in data["expiry_groups"]]
    assert group_keys == ["expired", "within_7d", "within_30d", "within_90d"]
    for g in data["expiry_groups"]:
        assert g["product_count"] == 0
        assert g["total_qty"] == 0
        assert g["value_at_risk"] == 0.0
        assert g["items"] == []

    # 30-day group discount to clear suggestion
    g30 = next(g for g in data["expiry_groups"] if g["group_key"] == "within_30d")
    assert "discount to clear" in g30["suggestion"].lower()


def test_inventory_analytics_with_data():
    """Calculates stock value at cost, low stock, turnover, out-of-stock lost sales, and expiry groups."""
    today = datetime.utcnow().date()

    # Product 1: Initial stock = 15, will become out of stock (stock_qty = 0) after selling 15
    p_oos = client.post("/products/", json={
        "name": "Tata Tea Gold 250g",
        "category": "Beverages",
        "cost_price": 100.0,
        "selling_price": 140.0,
        "stock_qty": 15,
        "reorder_level": 10,
    }).json()

    # Product 2: Expired 5 days ago (stock_qty = 10, cost = 50 -> risk = 500)
    p_exp = client.post("/products/", json={
        "name": "Amul Milk 500ml",
        "category": "Dairy",
        "cost_price": 30.0,
        "selling_price": 34.0,
        "stock_qty": 10,
        "reorder_level": 5,
        "expiry_date": (today - timedelta(days=5)).isoformat(),
    }).json()

    # Product 3: Expires in 4 days (within 7 days) (stock = 20, cost = 25 -> risk = 500)
    p_7d = client.post("/products/", json={
        "name": "Brown Bread 400g",
        "category": "Bakery",
        "cost_price": 25.0,
        "selling_price": 40.0,
        "stock_qty": 20,
        "reorder_level": 5,
        "expiry_date": (today + timedelta(days=4)).isoformat(),
    }).json()

    # Product 4: Expires in 20 days (within 30 days) (stock = 15, cost = 80 -> risk = 1200)
    p_30d = client.post("/products/", json={
        "name": "Paneer 200g",
        "category": "Dairy",
        "cost_price": 80.0,
        "selling_price": 100.0,
        "stock_qty": 15,
        "reorder_level": 5,
        "expiry_date": (today + timedelta(days=20)).isoformat(),
    }).json()

    # Product 5: Expires in 60 days (within 90 days) (stock = 40, cost = 50 -> risk = 2000)
    p_90d = client.post("/products/", json={
        "name": "Basmati Rice 1kg",
        "category": "Staples",
        "cost_price": 50.0,
        "selling_price": 80.0,
        "stock_qty": 40,
        "reorder_level": 10,
        "expiry_date": (today + timedelta(days=60)).isoformat(),
    }).json()

    # Product 6: In stock, low stock (stock = 4 <= reorder_level 10)
    p_low = client.post("/products/", json={
        "name": "Surf Excel 500g",
        "category": "Cleaning",
        "cost_price": 60.0,
        "selling_price": 75.0,
        "stock_qty": 4,
        "reorder_level": 10,
    }).json()

    # Sale 1: Sold 15 units of Tata Tea 3 days ago before it went out of stock
    sale_date = (datetime.utcnow() - timedelta(days=3)).replace(hour=14, minute=0, second=0)
    client.post("/sales/", json={
        "total_amount": 2100.0,
        "total_profit": 600.0,
        "payment_mode": "UPI",
        "date_time": sale_date.isoformat(),
        "items": [
            {
                "product_id": p_oos["id"],
                "qty": 15,
                "unit_price": 140.0,
                "unit_cost": 100.0
            }
        ]
    })

    res = client.get("/api/analytics/inventory")
    assert res.status_code == 200
    data = res.json()
    assert data["has_data"] is True

    # Summary:
    # Products = 6
    # Total stock value at cost = (10*30) + (20*25) + (15*80) + (40*50) + (4*60) = 300 + 500 + 1200 + 2000 + 240 = 4240
    # Low stock count = Product 6 (qty 4 <= 10) -> 1
    # Turnover = COGS (15 * 100 = 1500) / 4240 = 0.35
    s = data["summary"]
    assert s["number_of_products"] == 6
    assert s["stock_value_at_cost"] == 4240.0
    assert s["low_stock_count"] == 1
    assert s["inventory_turnover"] == 0.35

    # Out of stock list
    oos_list = data["out_of_stock_list"]
    assert len(oos_list) == 1
    oos_item = oos_list[0]
    assert oos_item["product_id"] == p_oos["id"]
    assert oos_item["last_sold_date"] is not None
    assert oos_item["estimated_lost_sales"] > 0

    # Expiry groups
    eg_map = {g["group_key"]: g for g in data["expiry_groups"]}
    assert eg_map["expired"]["product_count"] == 1
    assert eg_map["expired"]["value_at_risk"] == 300.0

    assert eg_map["within_7d"]["product_count"] == 1
    assert eg_map["within_7d"]["value_at_risk"] == 500.0

    assert eg_map["within_30d"]["product_count"] == 1
    assert eg_map["within_30d"]["value_at_risk"] == 1200.0
    assert "discount to clear" in eg_map["within_30d"]["suggestion"].lower()

    assert eg_map["within_90d"]["product_count"] == 1
    assert eg_map["within_90d"]["value_at_risk"] == 2000.0


# ==============================================================
# 4. PROFITABILITY ANALYTICS: GET /api/analytics/profitability
# ==============================================================

def test_profitability_analytics_zero_state():
    """Zero state: zero amounts, no insight line, empty collections."""
    res = client.get("/api/analytics/profitability")
    assert res.status_code == 200
    data = res.json()
    assert data["has_data"] is False
    assert data["insight"] is None
    assert data["overall_gross_margin_pct"] == 0.0
    assert data["overall_net_margin_pct"] == 0.0
    assert data["total_sales"] == 0.0
    assert data["total_cogs"] == 0.0
    assert data["gross_profit"] == 0.0
    assert data["total_expenses"] == 0.0
    assert data["net_profit"] == 0.0
    assert data["margin_trend"] == []
    assert data["margin_by_category"] == []
    assert data["lowest_margin_products"] == []
    assert data["expenses_by_category"] == []
    assert data["expenses_monthly_trend"] == []
    assert data["expense_entries"] == []

    # Net profit breakdown steps must all show 0
    assert len(data["net_profit_steps"]) == 5
    assert all(step["amount"] == 0.0 for step in data["net_profit_steps"])


def test_profitability_analytics_with_data_and_insight():
    """Calculates gross & net margin, trend, category margin, expenses donut/trend/entries, stepped breakdown, and insight."""
    now = datetime.utcnow()
    d_today = now.date()

    # 1. Create products
    p_oil = client.post("/products/", json={
        "name": "Fortune Sunflower Oil 1L",
        "category": "Staples",
        "cost_price": 120.0,
        "selling_price": 140.0,
        "stock_qty": 50,
        "reorder_level": 10,
    }).json()

    p_chips = client.post("/products/", json={
        "name": "Lays Chips 50g",
        "category": "Snacks",
        "cost_price": 10.0,
        "selling_price": 20.0,
        "stock_qty": 100,
        "reorder_level": 20,
    }).json()

    # 2. Add sales for today
    # Sale 1: 10 Oil (sales=1400, cogs=1200, profit=200, margin=14.3%)
    client.post("/sales/", json={
        "total_amount": 1400.0,
        "total_profit": 200.0,
        "payment_mode": "UPI",
        "date_time": now.isoformat(),
        "items": [
            {
                "product_id": p_oil["id"],
                "qty": 10,
                "unit_price": 140.0,
                "unit_cost": 120.0
            }
        ]
    })

    # Sale 2: 20 Chips (sales=400, cogs=200, profit=200, margin=50.0%)
    client.post("/sales/", json={
        "total_amount": 400.0,
        "total_profit": 200.0,
        "payment_mode": "Cash",
        "date_time": now.isoformat(),
        "items": [
            {
                "product_id": p_chips["id"],
                "qty": 20,
                "unit_price": 20.0,
                "unit_cost": 10.0
            }
        ]
    })

    # 3. Add expenses for today
    client.post("/expenses/", json={
        "date": d_today.isoformat(),
        "category": "Electricity",
        "amount": 150.0,
        "note": "Shop meter daily share"
    })
    client.post("/expenses/", json={
        "date": d_today.isoformat(),
        "category": "Rent",
        "amount": 100.0,
        "note": "Daily rent allocation"
    })

    # Query profitability for current month
    from_date = date(d_today.year, d_today.month, 1).isoformat()
    to_date = d_today.isoformat()
    res = client.get(f"/api/analytics/profitability?from={from_date}&to={to_date}")
    assert res.status_code == 200
    data = res.json()
    assert data["has_data"] is True

    # Total Sales = 1400 + 400 = 1800
    # Total COGS = 1200 + 200 = 1400
    # Gross Profit = 400
    # Gross Margin % = 400 / 1800 * 100 = 22.2%
    # Total Expenses = 150 + 100 = 250
    # Net Profit = 400 - 250 = 150
    # Net Margin % = 150 / 1800 * 100 = 8.3%
    assert data["total_sales"] == 1800.0
    assert data["total_cogs"] == 1400.0
    assert data["gross_profit"] == 400.0
    assert data["overall_gross_margin_pct"] == 22.2
    assert data["total_expenses"] == 250.0
    assert data["net_profit"] == 150.0
    assert data["overall_net_margin_pct"] == 8.3

    # Plain language insight line must be present
    assert data["insight"] is not None
    assert len(data["insight"]) > 10

    # Stepped Breakdown: 5 steps
    steps = data["net_profit_steps"]
    assert len(steps) == 5
    rev_step = next(s for s in steps if s["type"] == "revenue")
    assert rev_step["amount"] == 1800.0
    cogs_step = next(s for s in steps if s["type"] == "cogs")
    assert cogs_step["amount"] == 1400.0
    gp_step = next(s for s in steps if s["type"] == "gross_profit")
    assert gp_step["amount"] == 400.0
    exp_step = next(s for s in steps if s["type"] == "expenses")
    assert exp_step["amount"] == 250.0
    np_step = next(s for s in steps if s["type"] == "net_profit")
    assert np_step["amount"] == 150.0

    # Margin by Category
    cats = {c["category"]: c for c in data["margin_by_category"]}
    assert "Staples" in cats
    assert cats["Staples"]["sales"] == 1400.0
    assert cats["Staples"]["margin_pct"] == 14.3
    assert "Snacks" in cats
    assert cats["Snacks"]["sales"] == 400.0
    assert cats["Snacks"]["margin_pct"] == 50.0

    # Lowest margin products: Oil (14.3%) should be ranked lower than Chips (50.0%)
    lowest = data["lowest_margin_products"]
    assert len(lowest) == 2
    assert lowest[0]["product_id"] == p_oil["id"]
    assert lowest[0]["margin_pct"] == 14.3

    # Expenses totals by category
    exp_cats = {e["category"]: e for e in data["expenses_by_category"]}
    assert "Electricity" in exp_cats
    assert exp_cats["Electricity"]["amount"] == 150.0
    assert "Rent" in exp_cats
    assert exp_cats["Rent"]["amount"] == 100.0

    # Expenses monthly trend
    assert len(data["expenses_monthly_trend"]) > 0

    # Expense entries table
    assert len(data["expense_entries"]) == 2
    assert data["expense_entries"][0]["category"] in ("Electricity", "Rent")


# ==============================================================
# 5. AI INSIGHTS: SALES PREDICTION & DEMAND FORECAST
# ==============================================================

def test_ai_sales_forecast_zero_and_low_data():
    """Below 14 days of history, model refuses to forecast and returns progress counts."""
    # 0 sales
    res0 = client.get("/api/ai/sales-forecast?days=7")
    assert res0.status_code == 200
    data0 = res0.json()
    assert data0["has_enough_data"] is False
    assert data0["days_of_history"] == 0
    assert data0["required_days"] == 14
    assert data0["forecast_points"] == []
    assert data0["headline"] is None

    # Add 5 days of sales (e.g. Days 1 to 5)
    now = datetime.utcnow()
    for d in range(5):
        s_date = now - timedelta(days=5 - d)
        client.post("/sales/", json={
            "total_amount": 500.0 + d * 50,
            "total_profit": 100.0,
            "payment_mode": "Cash",
            "date_time": s_date.isoformat(),
            "items": []
        })

    res_low = client.get("/api/ai/sales-forecast?days=7")
    assert res_low.status_code == 200
    data_low = res_low.json()
    assert data_low["has_enough_data"] is False
    assert data_low["days_of_history"] == 5
    assert data_low["required_days"] == 14
    assert data_low["forecast_points"] == []
    assert data_low["headline"] is None
    assert len(data_low["historical_points"]) == 5


def test_ai_sales_forecast_with_14_days():
    """Unlocks forecast at >= 14 days with Holt-Winters forecast, bounds, headline, and accuracy note."""
    now = datetime.utcnow()
    # Add 15 consecutive days of sales
    for d in range(15):
        s_date = now - timedelta(days=15 - d)
        # Add varying sales with weekend uplift
        day_of_week = s_date.weekday()
        base = 1000.0 + (300.0 if day_of_week in (5, 6) else 0.0) + (d * 20.0)
        client.post("/sales/", json={
            "total_amount": base,
            "total_profit": base * 0.25,
            "payment_mode": "UPI",
            "date_time": s_date.isoformat(),
            "items": []
        })

    # Test 7 days forecast
    res7 = client.get("/api/ai/sales-forecast?days=7")
    assert res7.status_code == 200
    data7 = res7.json()
    assert data7["has_enough_data"] is True
    assert data7["days_of_history"] >= 14
    assert len(data7["forecast_points"]) == 7
    assert data7["forecast_days"] == 7
    assert "Expected sales next 7 days: ₹" in data7["headline"]
    assert data7["expected_sales_total"] > 0
    assert data7["expected_lower_total"] <= data7["expected_sales_total"] <= data7["expected_upper_total"]
    assert data7["model_accuracy_note"] is not None
    assert "Holt-Winters" in data7["model_accuracy_note"]
    assert len(data7["disclaimer"]) > 10

    for pt in data7["forecast_points"]:
        assert pt["lower_bound"] <= pt["predicted_sales"] <= pt["upper_bound"]

    # Test 14 and 30 days toggles
    res14 = client.get("/api/ai/sales-forecast?days=14")
    assert res14.status_code == 200
    assert len(res14.json()["forecast_points"]) == 14

    res30 = client.get("/api/ai/sales-forecast?days=30")
    assert res30.status_code == 200
    assert len(res30.json()["forecast_points"]) == 30


def test_ai_demand_forecast_and_product_drawer():
    """Tests per-product 14-day demand forecast, reorder calculation, category fallback, and WhatsApp text."""
    now = datetime.utcnow()

    # Product 1: Out of stock (stock_qty = 0) with active sales
    p1 = client.post("/products/", json={
        "name": "Tata Tea Gold 250g",
        "category": "Beverages",
        "cost_price": 100.0,
        "selling_price": 140.0,
        "stock_qty": 20,
        "reorder_level": 10
    }).json()

    # Product 2: In stock (stock = 100), low sales velocity
    p2 = client.post("/products/", json={
        "name": "Aashirvaad Atta 10kg",
        "category": "Staples",
        "cost_price": 400.0,
        "selling_price": 480.0,
        "stock_qty": 100,
        "reorder_level": 10
    }).json()

    # Product 3: Brand new product with 0 sales and category has no sales
    p3 = client.post("/products/", json={
        "name": "Organic Honey 500g",
        "category": "Organic",
        "cost_price": 250.0,
        "selling_price": 320.0,
        "stock_qty": 5,
        "reorder_level": 5
    }).json()

    # Sell 20 units of Tata Tea to reduce stock to 0
    client.post("/sales/", json={
        "total_amount": 2800.0,
        "total_profit": 800.0,
        "payment_mode": "UPI",
        "date_time": (now - timedelta(days=2)).isoformat(),
        "items": [
            {"product_id": p1["id"], "qty": 20, "unit_price": 140.0, "unit_cost": 100.0}
        ]
    })

    # Sell 10 units of Atta across 2 sales
    client.post("/sales/", json={
        "total_amount": 4800.0,
        "total_profit": 800.0,
        "payment_mode": "Cash",
        "date_time": (now - timedelta(days=1)).isoformat(),
        "items": [
            {"product_id": p2["id"], "qty": 10, "unit_price": 480.0, "unit_cost": 400.0}
        ]
    })

    # 1. Test GET /api/ai/demand-forecast
    res = client.get("/api/ai/demand-forecast?lead_time_days=3")
    assert res.status_code == 200
    data = res.json()
    assert data["lead_time_days"] == 3
    assert len(data["items"]) == 3

    # Product 1 should be critical (stock = 0) with suggested reorder qty
    item_p1 = next(i for i in data["items"] if i["product_id"] == p1["id"])
    assert item_p1["stock_qty"] == 0
    assert item_p1["risk_level"] == "critical"
    assert item_p1["suggested_reorder_qty"] > 0
    assert item_p1["reorder_by_date"] is not None

    # Product 3 has no sales ever, should show "Not enough data yet"
    item_p3 = next(i for i in data["items"] if i["product_id"] == p3["id"])
    assert item_p3["has_enough_history"] is False
    assert item_p3["forecast_demand_14d"] is None
    assert item_p3["status_note"] == "Not enough data yet"

    # WhatsApp purchase list should contain purchase order header and items
    wa_text = data["whatsapp_purchase_list"]
    assert "STORE PURCHASE ORDER" in wa_text
    assert "Tata Tea Gold" in wa_text
    assert "Supplier Lead Time: 3 days" in wa_text

    # 2. Test GET /api/ai/demand-forecast/{product_id}
    res_det = client.get(f"/api/ai/demand-forecast/{p1['id']}?lead_time_days=3")
    assert res_det.status_code == 200
    det_data = res_det.json()
    assert det_data["product"]["product_id"] == p1["id"]
    assert len(det_data["history_points"]) == 30
    assert len(det_data["forecast_points"]) == 14
    assert det_data["calculation_summary"]["lead_time_days"] == 3


