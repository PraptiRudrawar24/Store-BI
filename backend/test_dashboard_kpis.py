import pytest
from datetime import datetime, timedelta
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


def test_dashboard_kpis_zero_state():
    """With no data, kpi endpoint returns explicit 0s and None for deltas."""
    for period in ["today", "7days", "30days"]:
        res = client.get(f"/api/dashboard/kpis?period={period}")
        assert res.status_code == 200
        data = res.json()
        assert data["period"] == period
        assert data["sales"] == 0.0
        assert data["previous_sales"] == 0.0
        assert data["sales_change_pct"] is None
        assert data["profit"] == 0.0
        assert data["previous_profit"] == 0.0
        assert data["profit_change_pct"] is None
        assert data["transactions"] == 0
        assert data["previous_transactions"] == 0
        assert data["transactions_change_pct"] is None


def test_today_vs_yesterday_zero_state():
    """With no data, today-vs-yesterday returns explicit zeros and 'No sales recorded yet'."""
    res = client.get("/api/dashboard/today-vs-yesterday")
    assert res.status_code == 200
    data = res.json()
    assert data["has_data"] is False
    assert data["today"]["sales"] == 0.0
    assert data["today"]["profit"] == 0.0
    assert data["today"]["transactions"] == 0
    assert data["today"]["average_bill"] == 0.0
    assert data["yesterday"]["sales"] == 0.0
    assert data["yesterday"]["profit"] == 0.0
    assert data["yesterday"]["transactions"] == 0
    assert data["yesterday"]["average_bill"] == 0.0
    assert data["sales_change_pct"] is None
    assert data["summary"] == "No sales recorded yet"


def test_dashboard_kpis_and_comparison_with_data():
    """Tests KPI calculations and today-vs-yesterday summary when sales are recorded."""
    now = datetime.utcnow()
    yesterday = now - timedelta(days=1)

    # 1. Record yesterday's sale: ₹1000 total, ₹200 profit
    res_y = client.post("/sales/", json={
        "total_amount": 1000.0,
        "total_profit": 200.0,
        "payment_mode": "Cash",
        "date_time": yesterday.isoformat(),
        "items": []
    })
    assert res_y.status_code == 201

    # 2. Record today's sale: ₹1500 total, ₹350 profit
    res_t1 = client.post("/sales/", json={
        "total_amount": 1000.0,
        "total_profit": 250.0,
        "payment_mode": "UPI",
        "date_time": now.isoformat(),
        "items": []
    })
    assert res_t1.status_code == 201

    res_t2 = client.post("/sales/", json={
        "total_amount": 500.0,
        "total_profit": 100.0,
        "payment_mode": "Cash",
        "date_time": now.isoformat(),
        "items": []
    })
    assert res_t2.status_code == 201

    # Check KPIs for today
    kpi_res = client.get("/api/dashboard/kpis?period=today")
    assert kpi_res.status_code == 200
    kpi_data = kpi_res.json()
    assert kpi_data["sales"] == 1500.0
    assert kpi_data["previous_sales"] == 1000.0
    # Sales change: (1500 - 1000) / 1000 * 100 = +50.0%
    assert kpi_data["sales_change_pct"] == 50.0
    assert kpi_data["profit"] == 350.0
    assert kpi_data["previous_profit"] == 200.0
    # Profit change: (350 - 200) / 200 * 100 = +75.0%
    assert kpi_data["profit_change_pct"] == 75.0
    assert kpi_data["transactions"] == 2
    assert kpi_data["previous_transactions"] == 1
    assert kpi_data["transactions_change_pct"] == 100.0

    # Check Today vs Yesterday
    tv_res = client.get("/api/dashboard/today-vs-yesterday")
    assert tv_res.status_code == 200
    tv_data = tv_res.json()
    assert tv_data["has_data"] is True
    assert tv_data["today"]["sales"] == 1500.0
    assert tv_data["today"]["transactions"] == 2
    assert tv_data["today"]["average_bill"] == 750.0  # 1500 / 2
    assert tv_data["yesterday"]["sales"] == 1000.0
    assert tv_data["yesterday"]["transactions"] == 1
    assert tv_data["yesterday"]["average_bill"] == 1000.0
    assert tv_data["sales_change_pct"] == 50.0
    assert "up 50" in tv_data["summary"]
