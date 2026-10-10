import pytest
from fastapi.testclient import TestClient
from main import app
import models
from database import engine, SessionLocal

@pytest.fixture(autouse=True)
def clean_test_db():
    # Ensure clean tables before every test
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        db.query(models.SaleItem).delete()
        db.query(models.Sale).delete()
        db.query(models.Product).delete()
        db.query(models.Expense).delete()
        db.query(models.Shop).delete()
        db.commit()
    finally:
        db.close()
    yield

def test_send_otp():
    client = TestClient(app)
    # Valid 10-digit phone
    response = client.post("/auth/send-otp", json={"phone": "9876543210"})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["phone"] == "9876543210"
    assert data["dev_mode"] is True
    assert data["dev_otp"] == "123456"

def test_send_otp_invalid_phone():
    client = TestClient(app)
    response = client.post("/auth/send-otp", json={"phone": "12345"})
    assert response.status_code == 422  # validation error

def test_signup_and_verify_otp():
    client = TestClient(app)
    test_phone = "9823012345"
    response = client.post("/auth/verify-otp", json={
        "phone": test_phone,
        "otp": "123456",
        "email": "test@kirana.in"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["is_new_user"] is True
    assert data["onboarding_completed"] is False
    assert data["onboarding_step"] == 1
    assert data["shop"]["trial_days_left"] == 5
    assert "store_bi_session" in response.cookies

def test_login_existing_user():
    client = TestClient(app)
    phone = "9876500000"
    # 1. Sign up first time
    res1 = client.post("/auth/verify-otp", json={"phone": phone, "otp": "123456"})
    assert res1.status_code == 200
    assert res1.json()["is_new_user"] is True

    # 2. Login second time
    res2 = client.post("/auth/verify-otp", json={"phone": phone, "otp": "123456"})
    assert res2.status_code == 200
    assert res2.json()["is_new_user"] is False

def test_get_me_unauthorized():
    # Calling /auth/me with fresh client (no cookies) returns 401
    fresh_client = TestClient(app)
    response = fresh_client.get("/auth/me")
    assert response.status_code == 401

def test_onboarding_four_steps_flow():
    client = TestClient(app)
    phone = "9988776655"
    # 1. Sign up new user
    signup_res = client.post("/auth/verify-otp", json={"phone": phone, "otp": "123456"})
    assert signup_res.status_code == 200

    # Check /auth/me works with session cookie
    me_res = client.get("/auth/me")
    assert me_res.status_code == 200
    assert me_res.json()["phone"] == phone
    assert me_res.json()["trial_days_left"] == 5
    assert me_res.json()["onboarding_completed"] is False

    # 2. Step 1: Owner and contact
    step1_res = client.post("/auth/onboarding/step-1", json={
        "owner_name": "Ramesh Kumar",
        "phone": phone,
        "email": "ramesh@kirana.in",
        "language": "hi"
    })
    assert step1_res.status_code == 200
    assert step1_res.json()["shop"]["owner_name"] == "Ramesh Kumar"
    assert step1_res.json()["shop"]["language"] == "hi"
    assert step1_res.json()["shop"]["onboarding_step"] == 2

    # 3. Step 2 GSTIN validation test (invalid GSTIN)
    invalid_gstin_res = client.post("/auth/onboarding/step-2", json={
        "name": "Shree Ganesh Kirana",
        "category": "Grocery & kirana",
        "city": "Pune",
        "state": "Maharashtra",
        "pincode": "411038",
        "gstin": "INVALID123"
    })
    assert invalid_gstin_res.status_code == 422

    # Step 2 with valid details and valid GSTIN
    step2_res = client.post("/auth/onboarding/step-2", json={
        "name": "Shree Ganesh Kirana",
        "category": "Grocery & kirana",
        "city": "Pune",
        "state": "Maharashtra",
        "pincode": "411038",
        "gstin": "27ABCDE1234F1Z5"
    })
    assert step2_res.status_code == 200
    assert step2_res.json()["shop"]["name"] == "Shree Ganesh Kirana"
    assert step2_res.json()["shop"]["gstin"] == "27ABCDE1234F1Z5"
    assert step2_res.json()["shop"]["onboarding_step"] == 3

    # 4. Step 3: Operational setup
    step3_res = client.post("/auth/onboarding/step-3", json={
        "approx_products": "500 - 2,000",
        "monthly_turnover": "₹2,00,000 - ₹5,00,000",
        "current_tracking_method": "paper khata",
        "sells_expiring_goods": True
    })
    assert step3_res.status_code == 200
    assert step3_res.json()["shop"]["current_tracking_method"] == "paper khata"
    assert step3_res.json()["shop"]["sells_expiring_goods"] is True
    assert step3_res.json()["shop"]["onboarding_step"] == 4

    # 5. Step 4: Biggest problems to solve
    step4_res = client.post("/auth/onboarding/step-4", json={
        "challenges": ["stock-outs", "expiry waste", "profit unknown"]
    })
    assert step4_res.status_code == 200
    assert step4_res.json()["onboarding_completed"] is True
    assert step4_res.json()["shop"]["onboarding_completed"] is True

    # Check /auth/me reflects completed onboarding
    final_me = client.get("/auth/me")
    assert final_me.status_code == 200
    assert final_me.json()["onboarding_completed"] is True

    # 6. Verify ZERO-START RULE: Landing on dashboard has NO demo data created!
    products_res = client.get("/products/")
    assert len(products_res.json()) == 0
    sales_res = client.get("/sales/")
    assert len(sales_res.json()) == 0
    expenses_res = client.get("/expenses/")
    assert len(expenses_res.json()) == 0

    # 7. Test Logout
    logout_res = client.post("/auth/logout")
    assert logout_res.status_code == 200
    # After logout, /auth/me should fail
    unauthed_res = client.get("/auth/me")
    assert unauthed_res.status_code == 401
