import httpx

BASE = "http://127.0.0.1:8000"

with httpx.Client(base_url=BASE) as client:
    # User 2 logs in
    r = client.post("/auth/verify-otp", json={"phone": "9999111122", "otp": "123456"})
    print("User 2 Login:", r.json()["is_new_user"], r.json()["shop"]["phone"])

    # User 2 checks products
    r_prods = client.get("/products/?page=1&page_size=10")
    print("User 2 sees products:", [p["name"] for p in r_prods.json()["items"]])
