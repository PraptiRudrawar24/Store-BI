import pytest
from fastapi.testclient import TestClient
from main import app
from database import Base, engine, SessionLocal
import models
from datetime import date, datetime

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_and_teardown():
    # Setup test database tables
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    # Cleanup after tests
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

def test_products_search_sort_pagination_crud():
    # 1. Zero data test
    res = client.get("/products/?page=1&page_size=10")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 0
    assert len(data["items"]) == 0
    assert data["total_pages"] == 0

    # 2. Add sample products
    p1 = client.post("/products/", json={
        "name": "Tata Tea Gold 500g",
        "category": "Grocery",
        "cost_price": 240.0,
        "selling_price": 280.0,
        "stock_qty": 5,
        "reorder_level": 10,
        "expiry_date": "2026-12-31"
    }).json()

    p2 = client.post("/products/", json={
        "name": "Aashirvaad Atta 10kg",
        "category": "Grocery",
        "cost_price": 420.0,
        "selling_price": 470.0,
        "stock_qty": 2,
        "reorder_level": 5,
        "expiry_date": "2026-11-15"
    }).json()

    p3 = client.post("/products/", json={
        "name": "Paracetamol 500mg Strip",
        "category": "Pharmacy",
        "cost_price": 15.0,
        "selling_price": 30.0,
        "stock_qty": 50,
        "reorder_level": 10,
        "expiry_date": "2027-01-01"
    }).json()

    # 3. Test Search
    search_res = client.get("/products/?search=Tea&page=1&page_size=10")
    assert search_res.status_code == 200
    search_data = search_res.json()
    assert search_data["total"] == 1
    assert search_data["items"][0]["name"] == "Tata Tea Gold 500g"

    # 4. Test Sorting (stock_qty descending)
    sort_res = client.get("/products/?sort_by=stock_qty&order=desc&page=1&page_size=10")
    assert sort_res.status_code == 200
    items = sort_res.json()["items"]
    assert items[0]["stock_qty"] == 50
    assert items[1]["stock_qty"] == 5
    assert items[2]["stock_qty"] == 2

    # 5. Test Pagination (page_size = 2)
    page1_res = client.get("/products/?sort_by=id&order=asc&page=1&page_size=2")
    assert page1_res.status_code == 200
    p1_data = page1_res.json()
    assert p1_data["total"] == 3
    assert p1_data["total_pages"] == 2
    assert len(p1_data["items"]) == 2

    page2_res = client.get("/products/?sort_by=id&order=asc&page=2&page_size=2")
    assert page2_res.status_code == 200
    p2_data = page2_res.json()
    assert len(p2_data["items"]) == 1

    # 6. Test Inline Edit / Update
    update_res = client.put(f"/products/{p1['id']}", json={
        "selling_price": 295.0,
        "stock_qty": 12
    })
    assert update_res.status_code == 200
    assert update_res.json()["selling_price"] == 295.0
    assert update_res.json()["stock_qty"] == 12

    # 7. Test Delete
    del_res = client.delete(f"/products/{p1['id']}")
    assert del_res.status_code == 204

    # Verify deleted
    get_res = client.get(f"/products/{p1['id']}")
    assert get_res.status_code == 404

def test_sales_and_expenses_crud():
    # 1. Add product first
    prod = client.post("/products/", json={
        "name": "Fortune Sunlite Oil 1L",
        "category": "Grocery",
        "cost_price": 130.0,
        "selling_price": 160.0,
        "stock_qty": 20,
        "reorder_level": 5
    }).json()

    # 2. Add Sale
    sale = client.post("/sales/", json={
        "total_amount": 320.0,
        "total_profit": 60.0,
        "payment_mode": "UPI",
        "items": [
            {
                "product_id": prod["id"],
                "qty": 2,
                "unit_price": 160.0,
                "unit_cost": 130.0
            }
        ]
    }).json()

    # Verify inventory was decremented
    updated_prod = client.get(f"/products/{prod['id']}").json()
    assert updated_prod["stock_qty"] == 18

    # Test Sales Pagination & Search
    sales_res = client.get("/sales/?search=UPI&page=1&page_size=10")
    assert sales_res.status_code == 200
    s_data = sales_res.json()
    assert s_data["total"] == 1
    assert s_data["items"][0]["payment_mode"] == "UPI"

    # Test Sales Update
    update_sale_res = client.put(f"/sales/{sale['id']}", json={
        "payment_mode": "Cash"
    })
    assert update_sale_res.status_code == 200
    assert update_sale_res.json()["payment_mode"] == "Cash"

    # 3. Add Expense
    exp = client.post("/expenses/", json={
        "date": "2026-10-07",
        "category": "Electricity",
        "amount": 1250.0,
        "note": "Shop meter bill"
    }).json()

    # Test Expense Search & Pagination
    exp_res = client.get("/expenses/?search=meter&page=1&page_size=10")
    assert exp_res.status_code == 200
    e_data = exp_res.json()
    assert e_data["total"] == 1
    assert e_data["items"][0]["category"] == "Electricity"

    # Test Expense Update
    update_exp_res = client.put(f"/expenses/{exp['id']}", json={
        "amount": 1300.0,
        "note": "Shop meter bill with late fee"
    })
    assert update_exp_res.status_code == 200
    assert update_exp_res.json()["amount"] == 1300.0

    # 4. Test /upload/counts
    counts_res = client.get("/upload/counts")
    assert counts_res.status_code == 200
    counts = counts_res.json()
    assert counts["products"] == 1
    assert counts["sales"] == 1
    assert counts["expenses"] == 1
    assert counts["total"] == 3

    # 5. Test Insufficient Stock Blocking
    bad_sale = client.post("/sales/", json={
        "total_amount": 5000.0,
        "total_profit": 500.0,
        "payment_mode": "Cash",
        "items": [
            {
                "product_id": prod["id"],
                "qty": 500,  # Only 18 in stock
                "unit_price": 160.0,
                "unit_cost": 130.0
            }
        ]
    })
    assert bad_sale.status_code == 400
    assert "Insufficient stock" in bad_sale.json()["detail"]

    # 6. Test Bulk Products
    bulk_p = client.post("/products/bulk", json=[
        {
            "name": "Britannia Good Day 100g",
            "category": "Biscuits",
            "cost_price": 18.0,
            "selling_price": 25.0,
            "stock_qty": 40,
            "reorder_level": 10
        },
        {
            "name": "Parle-G 250g",
            "category": "Biscuits",
            "cost_price": 20.0,
            "selling_price": 25.0,
            "stock_qty": 60,
            "reorder_level": 15
        }
    ])
    assert bulk_p.status_code == 201
    assert bulk_p.json()["count"] == 2

    # 7. Delete sale and expense
    del_s = client.delete(f"/sales/{sale['id']}")
    assert del_s.status_code == 204

    del_e = client.delete(f"/expenses/{exp['id']}")
    assert del_e.status_code == 204

    # Verify counts
    counts_after = client.get("/upload/counts").json()
    assert counts_after["products"] == 3

