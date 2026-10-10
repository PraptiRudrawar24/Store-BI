import pytest
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

def test_product_create_and_update():
    # 1. Add product
    res = client.post("/products/", json={
        "name": "Tata Salt 1kg",
        "category": "Grocery",
        "cost_price": 22.0,
        "selling_price": 28.0,
        "stock_qty": 50,
        "reorder_level": 10,
        "expiry_date": "2027-12-31"
    })
    assert res.status_code == 201
    prod = res.json()
    assert prod["id"] is not None
    assert prod["name"] == "Tata Salt 1kg"

    # 2. Update existing product
    update_res = client.put(f"/products/{prod['id']}", json={
        "name": "Tata Salt 1kg Vacuum Evaporated",
        "selling_price": 30.0,
        "stock_qty": 45,
    })
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["name"] == "Tata Salt 1kg Vacuum Evaporated"
    assert updated["selling_price"] == 30.0
    assert updated["stock_qty"] == 45

def test_sale_creation_reduces_stock_and_blocks_insufficient():
    # 1. Add product with initial stock = 10
    prod = client.post("/products/", json={
        "name": "Amul Butter 500g",
        "category": "Dairy & Bakery",
        "cost_price": 240.0,
        "selling_price": 275.0,
        "stock_qty": 10,
        "reorder_level": 5,
    }).json()

    # 2. Block sale if stock is insufficient
    bad_sale_res = client.post("/sales/", json={
        "total_amount": 2750.0 * 2,
        "total_profit": 350.0 * 2,
        "payment_mode": "Cash",
        "items": [
            {
                "product_id": prod["id"],
                "qty": 15,  # only 10 available!
                "unit_price": 275.0,
                "unit_cost": 240.0
            }
        ]
    })
    assert bad_sale_res.status_code == 400
    assert "Insufficient stock" in bad_sale_res.json()["detail"]

    # 3. Valid sale of 3 units
    good_sale_res = client.post("/sales/", json={
        "total_amount": 825.0,
        "total_profit": 105.0,
        "payment_mode": "UPI",
        "items": [
            {
                "product_id": prod["id"],
                "qty": 3,
                "unit_price": 275.0,
                "unit_cost": 240.0
            }
        ]
    })
    assert good_sale_res.status_code == 201

    # 4. Verify inventory was reduced to 7
    updated_prod = client.get(f"/products/{prod['id']}").json()
    assert updated_prod["stock_qty"] == 7

def test_expense_creation():
    res = client.post("/expenses/", json={
        "date": "2026-10-08",
        "category": "Electricity & Utility",
        "amount": 1450.0,
        "note": "Counter AC & lighting bill"
    })
    assert res.status_code == 201
    exp = res.json()
    assert exp["amount"] == 1450.0
    assert exp["category"] == "Electricity & Utility"

def test_bulk_products_and_bulk_sales():
    # 1. Bulk import products
    p_res = client.post("/products/bulk", json=[
        {
            "name": "Fortune Oil 1L",
            "category": "Grocery",
            "cost_price": 130.0,
            "selling_price": 155.0,
            "stock_qty": 20,
            "reorder_level": 5,
            "expiry_date": None
        },
        {
            "name": "Parle-G 1kg",
            "category": "Snacks & Beverages",
            "cost_price": 110.0,
            "selling_price": 130.0,
            "stock_qty": 30,
            "reorder_level": 10,
            "expiry_date": "2027-05-31"
        }
    ])
    assert p_res.status_code == 201
    assert p_res.json()["count"] == 2

    # Get products
    prods = client.get("/products/").json()
    oil = next(p for p in prods if p["name"] == "Fortune Oil 1L")
    parle = next(p for p in prods if p["name"] == "Parle-G 1kg")

    # 2. Bulk import sales
    s_res = client.post("/sales/bulk", json=[
        {
            "total_amount": 310.0,
            "total_profit": 50.0,
            "payment_mode": "Card",
            "items": [
                {
                    "product_id": oil["id"],
                    "qty": 2,
                    "unit_price": 155.0,
                    "unit_cost": 130.0
                }
            ]
        },
        {
            "total_amount": 260.0,
            "total_profit": 40.0,
            "payment_mode": "Credit",
            "items": [
                {
                    "product_id": parle["id"],
                    "qty": 2,
                    "unit_price": 130.0,
                    "unit_cost": 110.0
                }
            ]
        }
    ])
    assert s_res.status_code == 201
    assert s_res.json()["count"] == 2

    # Verify inventory decrements
    oil_after = client.get(f"/products/{oil['id']}").json()
    parle_after = client.get(f"/products/{parle['id']}").json()
    assert oil_after["stock_qty"] == 18
    assert parle_after["stock_qty"] == 28
