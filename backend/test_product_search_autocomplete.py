import pytest
from fastapi.testclient import TestClient
from main import app
from database import Base, engine, SessionLocal
import models
from auth import create_access_token

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    # Clean products and shops for a clean test harness
    db.query(models.SaleItem).delete()
    db.query(models.Sale).delete()
    db.query(models.Product).delete()
    db.query(models.Shop).delete()
    db.commit()

    # Create test shop A
    shop_a = models.Shop(
        id=101,
        name="Shop Alpha",
        phone="9988776655",
        onboarding_completed=True,
    )
    # Create test shop B
    shop_b = models.Shop(
        id=102,
        name="Shop Beta",
        phone="9988776644",
        onboarding_completed=True,
    )
    db.add_all([shop_a, shop_b])
    db.commit()

    # Products for Shop A:
    # Notice: Dettol (prefix D), Detergent (prefix D), Dove Soap (prefix D),
    # Star Bright Detergent (contains Detergent), Tata Salt (starts with T)
    p1 = models.Product(name="Dettol Antiseptic Liquid 550ml", category="Health & OTC", cost_price=120.0, selling_price=160.0, stock_qty=25, reorder_level=5, shop_id=101)
    p2 = models.Product(name="Detergent Bar 200g", category="Household", cost_price=20.0, selling_price=28.0, stock_qty=15, reorder_level=5, shop_id=101)
    p3 = models.Product(name="Dove Moisturizing Cream 100g", category="Personal Care", cost_price=80.0, selling_price=110.0, stock_qty=0, reorder_level=5, shop_id=101) # Out of stock
    p4 = models.Product(name="Star Bright Detergent Powder 1kg", category="Household", cost_price=90.0, selling_price=125.0, stock_qty=12, reorder_level=5, shop_id=101)
    p5 = models.Product(name="Tata Salt 1kg", category="Grocery", cost_price=20.0, selling_price=28.0, stock_qty=50, reorder_level=10, shop_id=101)
    
    # 15 additional filler products for pagination testing in Shop A
    filler_products = [
        models.Product(name=f"Grocery Item {i:02d}", category="Grocery", cost_price=10.0 + i, selling_price=15.0 + i, stock_qty=10, reorder_level=5, shop_id=101)
        for i in range(1, 16)
    ]

    # Product for Shop B (should NEVER leak to Shop A)
    p_b = models.Product(name="Dettol Handwash ShopB Only", category="Health", cost_price=60.0, selling_price=85.0, stock_qty=10, shop_id=102)

    db.add_all([p1, p2, p3, p4, p5, *filler_products, p_b])
    db.commit()
    db.close()
    yield

def get_auth_headers(shop_id=101, phone="9988776655"):
    token = create_access_token(data={"sub": str(shop_id), "phone": phone})
    return {"Authorization": f"Bearer {token}"}

def test_autocomplete_live_query_d_ranking():
    """Typing 'D' returns matching products with prefixes first and in-stock preferred."""
    headers = get_auth_headers(101)
    res = client.get("/api/products/autocomplete?q=D", headers=headers)
    assert res.status_code == 200
    items = res.json()
    assert len(items) >= 4

    names = [it["name"] for it in items]
    # Dettol, Detergent Bar, Dove, and Star Bright Detergent should all match
    assert "Dettol Antiseptic Liquid 550ml" in names
    assert "Detergent Bar 200g" in names
    assert "Dove Moisturizing Cream 100g" in names
    assert "Star Bright Detergent Powder 1kg" in names
    # Tata Salt should NOT match 'D'
    assert "Tata Salt 1kg" not in names
    # Shop B product should NEVER appear
    assert "Dettol Handwash ShopB Only" not in names

    # Prefix matches ('Dettol', 'Detergent Bar') must appear before internal word match ('Star Bright Detergent')
    idx_dettol = names.index("Dettol Antiseptic Liquid 550ml")
    idx_star_bright = names.index("Star Bright Detergent Powder 1kg")
    assert idx_dettol < idx_star_bright

def test_autocomplete_narrows_with_det():
    """Typing 'Det' narrows to Dettol and Detergents, excluding Dove."""
    headers = get_auth_headers(101)
    res = client.get("/api/products/autocomplete?q=Det", headers=headers)
    assert res.status_code == 200
    items = res.json()
    names = [it["name"] for it in items]

    assert "Dettol Antiseptic Liquid 550ml" in names
    assert "Detergent Bar 200g" in names
    assert "Star Bright Detergent Powder 1kg" in names
    assert "Dove Moisturizing Cream 100g" not in names

def test_autocomplete_case_insensitivity():
    """Autocomplete is completely case-insensitive (d, D, dEtToL)."""
    headers = get_auth_headers(101)
    res_lower = client.get("/api/products/autocomplete?q=dettol", headers=headers).json()
    res_upper = client.get("/api/products/autocomplete?q=DETTOL", headers=headers).json()
    assert len(res_lower) == 1
    assert len(res_upper) == 1
    assert res_lower[0]["id"] == res_upper[0]["id"]

def test_autocomplete_no_matches_returns_empty():
    """Searching for a non-existent product returns an empty list cleanly."""
    headers = get_auth_headers(101)
    res = client.get("/api/products/autocomplete?q=xyznonexistent123", headers=headers)
    assert res.status_code == 200
    assert res.json() == []

def test_product_location_pagination_calculation():
    """Tests calculating the exact page number for a product across pagination."""
    headers = get_auth_headers(101)
    # Find ID of the 15th filler product
    db = SessionLocal()
    target = db.query(models.Product).filter(models.Product.name == "Grocery Item 15", models.Product.shop_id == 101).first()
    target_id = target.id
    db.close()

    # With page_size=10, check which page target is on
    res = client.get(f"/api/products/{target_id}/location?page_size=10&sort_by=id&order=asc", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["found"] is True
    assert data["product_id"] == target_id
    assert data["page"] >= 2  # Product 15+ is beyond page 1

def test_product_location_deleted_or_missing_product():
    """Requesting location for a non-existent product returns found=False with friendly message."""
    headers = get_auth_headers(101)
    res = client.get("/api/products/999999/location?page_size=10", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["found"] is False
    assert "deleted" in data["message"].lower() or "not found" in data["message"].lower()
