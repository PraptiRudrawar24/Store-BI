import httpx

BASE = "http://127.0.0.1:8000"

with httpx.Client(base_url=BASE) as client:
    # 1. Login
    r1 = client.post("/auth/verify-otp", json={"phone": "9876543210", "otp": "123456"})
    print("Login 1:", r1.status_code, r1.json()["shop"]["phone"])

    # 2. Step 1
    r2 = client.post("/auth/onboarding/step-1", json={"owner_name": "Ramesh", "phone": "9876543210", "language": "en"})
    print("Step 1:", r2.status_code, r2.json()["shop"]["owner_name"])

    # 3. Step 2
    r3 = client.post("/auth/onboarding/step-2", json={"name": "Ramesh Kirana Store", "category": "Grocery & kirana", "city": "Pune", "state": "Maharashtra", "pincode": "411001"})
    print("Step 2:", r3.status_code, r3.json()["shop"]["name"])

    # 4. Step 3
    r4 = client.post("/auth/onboarding/step-3", json={"approx_products": "100 - 500", "monthly_turnover": "₹50,000 - ₹2,00,000", "current_tracking_method": "paper khata", "sells_expiring_goods": True})
    print("Step 3:", r4.status_code)

    # 5. Step 4
    r5 = client.post("/auth/onboarding/step-4", json={"challenges": ["stock-outs"]})
    print("Step 4:", r5.status_code, r5.json()["onboarding_completed"])

    # 6. Add a product
    r_prod = client.post("/products/", json={"name": "Tata Tea Gold", "category": "Beverages", "cost_price": 120, "selling_price": 150, "stock_qty": 30, "reorder_level": 5})
    print("Add product:", r_prod.status_code, r_prod.json()["name"])

    # 7. Check Me
    r_me1 = client.get("/auth/me")
    print("Me before logout:", r_me1.json()["name"], r_me1.json()["owner_name"])

    # 8. Logout
    r_logout = client.post("/auth/logout")
    print("Logout:", r_logout.status_code, r_logout.json())

    # 9. Verify cookie is cleared
    r_me_logged_out = client.get("/auth/me")
    print("Me after logout (status):", r_me_logged_out.status_code)

    # 10. Login again with same phone
    r_login2 = client.post("/auth/verify-otp", json={"phone": "9876543210", "otp": "123456"})
    print("Login 2:", r_login2.status_code, "is_new_user:", r_login2.json()["is_new_user"], "onboarding_completed:", r_login2.json()["onboarding_completed"], "name:", r_login2.json()["shop"]["name"])

    # 11. Check Me after re-login
    r_me2 = client.get("/auth/me")
    print("Me after re-login:", r_me2.json()["name"], r_me2.json()["owner_name"])

    # 12. Check Products
    r_prods = client.get("/products/?page=1&page_size=10")
    print("Products count:", r_prods.json()["total"])
