import time
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_full_user_persistence_lifecycle():
    ts = str(int(time.time()))[-6:]
    phone1 = f"98{ts}01"
    phone2 = f"98{ts}02"

    print(f"--- 1. User 1 (Ramesh, phone={phone1}) Sign Up & Setup ---")
    r_otp1 = client.post("/auth/send-otp", json={"phone": phone1})
    assert r_otp1.status_code == 200
    otp1 = r_otp1.json()["dev_otp"]

    r_login1 = client.post("/auth/verify-otp", json={"phone": phone1, "otp": otp1})
    assert r_login1.status_code == 200
    shop1_id = r_login1.json()["shop"]["id"]

    # Complete Onboarding for User 1
    client.post("/auth/onboarding/step-1", json={"owner_name": "Ramesh Patel", "phone": phone1, "language": "en"})
    client.post("/auth/onboarding/step-2", json={"name": "Shree Ganesh Kirana", "category": "Grocery & kirana", "city": "Pune", "state": "Maharashtra", "pincode": "411038", "gstin": "27ABCDE1234F1Z5"})
    client.post("/auth/onboarding/step-3", json={"approx_products": "100 - 500 items", "monthly_turnover": "₹50,000 - ₹2,00,000", "current_tracking_method": "paper khata", "sells_expiring_goods": True})
    client.post("/auth/onboarding/step-4", json={"challenges": ["stock-outs", "profit unknown"]})

    # User 1 creates products
    r_p1 = client.post("/products/", json={
        "name": "Ramesh Premium Basmati 5kg",
        "category": "Dairy & Staples",
        "cost_price": 350.0,
        "selling_price": 450.0,
        "stock_qty": 50,
        "reorder_level": 5
    })
    assert r_p1.status_code == 201
    p1_id = r_p1.json()["id"]

    r_p2 = client.post("/products/", json={
        "name": "Ramesh Gir Cow Ghee 1L",
        "category": "Dairy & Staples",
        "cost_price": 600.0,
        "selling_price": 750.0,
        "stock_qty": 20,
        "reorder_level": 3
    })
    assert r_p2.status_code == 201
    p2_id = r_p2.json()["id"]

    # User 1 creates a sale
    r_s1 = client.post("/sales/", json={
        "total_amount": 1200.0,
        "total_profit": 250.0,
        "payment_mode": "UPI",
        "items": [
            {"product_id": p1_id, "qty": 1, "unit_price": 450.0, "unit_cost": 350.0},
            {"product_id": p2_id, "qty": 1, "unit_price": 750.0, "unit_cost": 600.0}
        ]
    })
    assert r_s1.status_code == 201

    # Verify User 1 sees 2 products and 1 sale
    u1_prods = client.get("/products/").json()
    u1_sales = client.get("/sales/").json()
    assert len(u1_prods) == 2
    assert len(u1_sales) == 1
    print(f"User 1 configured: Shop ID={shop1_id}, Products={len(u1_prods)}, Sales={len(u1_sales)}")

    # User 1 Logout
    client.post("/auth/logout")
    r_me_logged_out = client.get("/auth/me")
    assert r_me_logged_out.status_code == 401
    print("User 1 successfully logged out (verified 401 unauthenticated)")

    print(f"\n--- 2. User 2 (Sunita, phone={phone2}) Sign Up & Setup ---")
    r_otp2 = client.post("/auth/send-otp", json={"phone": phone2})
    otp2 = r_otp2.json()["dev_otp"]
    r_login2 = client.post("/auth/verify-otp", json={"phone": phone2, "otp": otp2})
    assert r_login2.status_code == 200
    shop2_id = r_login2.json()["shop"]["id"]
    assert shop1_id != shop2_id

    # Verify User 2 sees 0 products and 0 sales (ZERO-START / isolation)
    u2_initial_prods = client.get("/products/").json()
    u2_initial_sales = client.get("/sales/").json()
    assert len(u2_initial_prods) == 0, f"Expected 0 products for new user, got {len(u2_initial_prods)}"
    assert len(u2_initial_sales) == 0, f"Expected 0 sales for new user, got {len(u2_initial_sales)}"
    print("User 2 confirmed 0 products, 0 sales (isolation preserved)")

    # Complete Onboarding for User 2
    client.post("/auth/onboarding/step-1", json={"owner_name": "Sunita Sharma", "phone": phone2, "language": "hi"})
    client.post("/auth/onboarding/step-2", json={"name": "Sunita Organic Stores", "category": "General store", "city": "Mumbai", "state": "Maharashtra", "pincode": "400001"})
    client.post("/auth/onboarding/step-3", json={"approx_products": "< 100 items", "monthly_turnover": "Under ₹50,000", "current_tracking_method": "Excel", "sells_expiring_goods": False})
    client.post("/auth/onboarding/step-4", json={"challenges": ["overstock"]})

    # User 2 creates her own product
    r_p3 = client.post("/products/", json={
        "name": "Sunita Organic Haldi 200g",
        "category": "Snacks & Sweets",
        "cost_price": 40.0,
        "selling_price": 60.0,
        "stock_qty": 30,
        "reorder_level": 5
    })
    assert r_p3.status_code == 201

    u2_prods = client.get("/products/").json()
    assert len(u2_prods) == 1
    assert u2_prods[0]["name"] == "Sunita Organic Haldi 200g"
    print(f"User 2 configured: Shop ID={shop2_id}, Products={len(u2_prods)}")

    # User 2 Logout
    client.post("/auth/logout")
    assert client.get("/auth/me").status_code == 401
    print("User 2 successfully logged out")

    print("\n--- 3. User 1 Logs In Again & Data Integrity Verification ---")
    r_otp1_again = client.post("/auth/send-otp", json={"phone": phone1})
    otp1_again = r_otp1_again.json()["dev_otp"]
    r_login1_again = client.post("/auth/verify-otp", json={"phone": phone1, "otp": otp1_again})
    assert r_login1_again.status_code == 200
    user1_rehydrated = r_login1_again.json()["shop"]

    # Verify original profile data is 100% intact
    assert user1_rehydrated["id"] == shop1_id
    assert user1_rehydrated["name"] == "Shree Ganesh Kirana"
    assert user1_rehydrated["owner_name"] == "Ramesh Patel"
    assert user1_rehydrated["city"] == "Pune"
    assert user1_rehydrated["state"] == "Maharashtra"
    assert user1_rehydrated["pincode"] == "411038"
    assert user1_rehydrated["gstin"] == "27ABCDE1234F1Z5"
    assert user1_rehydrated["approx_products"] == "100 - 500 items"
    assert user1_rehydrated["monthly_turnover"] == "₹50,000 - ₹2,00,000"
    assert user1_rehydrated["current_tracking_method"] == "paper khata"
    assert user1_rehydrated["sells_expiring_goods"] is True
    print("User 1 profile completely unchanged after logout & login!")

    # Verify original products are 100% intact
    u1_re_prods = client.get("/products/").json()
    assert len(u1_re_prods) == 2
    u1_prod_names = [p["name"] for p in u1_re_prods]
    assert "Ramesh Premium Basmati 5kg" in u1_prod_names
    assert "Ramesh Gir Cow Ghee 1L" in u1_prod_names
    assert "Sunita Organic Haldi 200g" not in u1_prod_names
    print("User 1 inventory intact: 2 original products found, 0 leaked from User 2")

    # Verify original sales are 100% intact
    u1_re_sales = client.get("/sales/").json()
    assert len(u1_re_sales) == 1
    assert u1_re_sales[0]["total_amount"] == 1200.0
    print("User 1 sales intact: 1 original sale found")

    # Verify dashboard KPIs are intact
    kpis = client.get("/api/dashboard/kpis").json()
    assert kpis["sales"] == 1200.0
    print(f"User 1 dashboard KPIs intact: Sales={kpis['sales']}")

    # User 1 Logout
    client.post("/auth/logout")

    print("\n--- 4. User 2 Logs In Again & Data Integrity Verification ---")
    r_otp2_again = client.post("/auth/send-otp", json={"phone": phone2})
    otp2_again = r_otp2_again.json()["dev_otp"]
    r_login2_again = client.post("/auth/verify-otp", json={"phone": phone2, "otp": otp2_again})
    assert r_login2_again.status_code == 200
    user2_rehydrated = r_login2_again.json()["shop"]

    assert user2_rehydrated["id"] == shop2_id
    assert user2_rehydrated["name"] == "Sunita Organic Stores"
    assert user2_rehydrated["owner_name"] == "Sunita Sharma"

    u2_re_prods = client.get("/products/").json()
    assert len(u2_re_prods) == 1
    assert u2_re_prods[0]["name"] == "Sunita Organic Haldi 200g"
    print("User 2 inventory intact: 1 original product found, 0 leaked from User 1")

    print("\nSUCCESS: Complete user data persistence and isolation confirmed!")

if __name__ == "__main__":
    test_full_user_persistence_lifecycle()
