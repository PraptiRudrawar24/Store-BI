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

def test_manual_product_duplicate_name_increments_stock():
    """When a product with the same name is added manually, stock is incremented."""
    # 1. Add initial product with stock = 15
    res1 = client.post("/products/", json={
        "name": "Basmati Rice 5kg",
        "category": "Grocery",
        "cost_price": 400.0,
        "selling_price": 490.0,
        "stock_qty": 15,
        "reorder_level": 5,
    })
    assert res1.status_code == 201
    prod1 = res1.json()
    assert prod1["stock_qty"] == 15
    initial_id = prod1["id"]

    # 2. Add same product name with stock = 10 (case-insensitive with extra spaces)
    res2 = client.post("/products/", json={
        "name": "  basmati rice 5kg  ",
        "category": "Grocery",
        "cost_price": 410.0,
        "selling_price": 500.0,
        "stock_qty": 10,
        "reorder_level": 5,
    })
    assert res2.status_code == 201
    prod2 = res2.json()
    assert prod2["id"] == initial_id
    assert prod2["stock_qty"] == 25  # 15 + 10
    assert prod2["cost_price"] == 410.0
    assert prod2["selling_price"] == 500.0

    # 3. Ensure no duplicate was created in inventory
    all_prods = client.get("/products/").json()
    assert len(all_prods) == 1
    assert all_prods[0]["stock_qty"] == 25

def test_bulk_product_duplicate_name_increments_stock():
    """When products are added in bulk, items with existing names increment stock."""
    # 1. Add initial product
    res1 = client.post("/products/", json={
        "name": "Aashirvaad Atta 5kg",
        "category": "Grocery",
        "cost_price": 220.0,
        "selling_price": 260.0,
        "stock_qty": 20,
        "reorder_level": 5,
    })
    assert res1.status_code == 201
    initial_id = res1.json()["id"]

    # 2. Bulk upload containing Aashirvaad Atta (+15) and a brand new item (+30)
    bulk_res = client.post("/products/bulk", json=[
        {
            "name": "aashirvaad atta 5kg",
            "category": "Grocery",
            "cost_price": 225.0,
            "selling_price": 265.0,
            "stock_qty": 15,
            "reorder_level": 5,
        },
        {
            "name": "Sunfeast Dark Fantasy 300g",
            "category": "Snacks & Beverages",
            "cost_price": 90.0,
            "selling_price": 120.0,
            "stock_qty": 30,
            "reorder_level": 10,
        }
    ])
    assert bulk_res.status_code == 201
    assert bulk_res.json()["count"] == 2

    # 3. Verify total products is 2, and Aashirvaad Atta has 20 + 15 = 35 stock
    all_prods = client.get("/products/").json()
    assert len(all_prods) == 2
    atta = next(p for p in all_prods if p["id"] == initial_id)
    assert atta["stock_qty"] == 35
    assert atta["cost_price"] == 225.0

    cookies = next(p for p in all_prods if "Dark Fantasy" in p["name"])
    assert cookies["stock_qty"] == 30

def test_invoice_confirm_duplicate_name_increments_stock():
    """When confirming invoice items, matching names automatically increment stock even if action='create'."""
    # 1. Add existing product
    res1 = client.post("/products/", json={
        "name": "Dettol Soap 125g",
        "category": "Personal Care",
        "cost_price": 45.0,
        "selling_price": 55.0,
        "stock_qty": 50,
        "reorder_level": 10,
    })
    assert res1.status_code == 201
    existing_id = res1.json()["id"]

    # 2. Confirm invoice with Dettol Soap marked as action='create' (unlinked) +25
    invoice_payload = {
        "supplier": "HUL Wholesale",
        "invoice_date": "2026-10-12",
        "items": [
            {
                "name": "dettol soap 125g",
                "qty": 25,
                "cost_price": 46.0,
                "selling_price": 58.0,
                "category": "Personal Care",
                "expiry_date": "2028-06-30",
                "action": "create",
                "matched_product_id": None,
            }
        ]
    }
    confirm_res = client.post("/api/confirm-extracted-invoice", json=invoice_payload)
    assert confirm_res.status_code == 200
    res_data = confirm_res.json()
    assert res_data["updated_count"] == 1
    assert res_data["created_count"] == 0

    # 3. Verify stock is 50 + 25 = 75
    prod = client.get(f"/products/{existing_id}").json()
    assert prod["stock_qty"] == 75
    assert prod["cost_price"] == 46.0
    assert prod["selling_price"] == 58.0
