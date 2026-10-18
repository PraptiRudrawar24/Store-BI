import os
import sys
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

# Set test environment
os.environ["REQUIRE_EMAIL_VERIFICATION"] = "true"
os.environ["SECRET_KEY"] = "test-secret-key-for-unit-testing-32-chars"
os.environ["FRONTEND_URL"] = "http://localhost:5173"

from main import app
from database import Base, engine, get_db, SessionLocal
import models
import security

client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


# ==============================================================================
# 1. EMAIL & PASSWORD REGISTRATION TESTS
# ==============================================================================

def test_register_merchant_weak_password():
    """Rejects passwords shorter than 8 characters or lacking letters/digits."""
    res = client.post("/auth/register", json={
        "email": "merchant@storebi.com",
        "password": "short",
        "confirm_password": "short",
        "store_name": "Quick Mart",
        "owner_name": "Alice"
    })
    assert res.status_code == 400
    assert "at least 8 characters" in res.json()["detail"]


def test_register_merchant_password_mismatch():
    """Rejects registration when password and confirm_password do not match."""
    res = client.post("/auth/register", json={
        "email": "merchant@storebi.com",
        "password": "Password123!",
        "confirm_password": "Password999!",
        "store_name": "Quick Mart",
        "owner_name": "Alice"
    })
    assert res.status_code == 400
    assert "Passwords do not match" in res.json()["detail"]


def test_register_merchant_success_requires_verification():
    """Creates account with bcrypt hash and dispatches verification token."""
    res = client.post("/auth/register", json={
        "email": "alice@storebi.com",
        "password": "SecurePassword123",
        "confirm_password": "SecurePassword123",
        "store_name": "Alice Groceries",
        "owner_name": "Alice Sharma"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["requires_verification"] is True

    # Check database state
    with SessionLocal() as db:
        shop = db.query(models.Shop).filter(models.Shop.email == "alice@storebi.com").first()
        assert shop is not None
        assert shop.is_email_verified is False
        assert shop.email_verification_token is not None
        assert security.verify_password("SecurePassword123", shop.hashed_password) is True


def test_register_duplicate_email():
    """Rejects registering an email that is already registered."""
    payload = {
        "email": "duplicate@storebi.com",
        "password": "SecurePassword123",
        "confirm_password": "SecurePassword123",
    }
    res1 = client.post("/auth/register", json=payload)
    assert res1.status_code == 200

    res2 = client.post("/auth/register", json=payload)
    assert res2.status_code == 409
    assert "already exists" in res2.json()["detail"]


# ==============================================================================
# 2. EMAIL VERIFICATION TESTS
# ==============================================================================

def test_verify_email_flow():
    """Verifies email with token, activates account, and creates session."""
    # Register
    client.post("/auth/register", json={
        "email": "verify_me@storebi.com",
        "password": "SecurePassword123",
        "confirm_password": "SecurePassword123",
    })

    # Retrieve token from DB
    token = None
    with SessionLocal() as db:
        shop = db.query(models.Shop).filter(models.Shop.email == "verify_me@storebi.com").first()
        token = shop.email_verification_token

    assert token is not None

    # Call verify-email endpoint
    verify_res = client.post("/auth/verify-email", json={"token": token})
    assert verify_res.status_code == 200
    assert verify_res.json()["success"] is True
    assert "store_bi_session" in verify_res.cookies

    # Verify database state
    with SessionLocal() as db:
        shop = db.query(models.Shop).filter(models.Shop.email == "verify_me@storebi.com").first()
        assert shop.is_email_verified is True
        assert shop.email_verification_token is None


def test_verify_email_invalid_token():
    """Rejects verification attempts with forged or nonexistent tokens."""
    res = client.post("/auth/verify-email", json={"token": "invalid_bogus_token_12345"})
    assert res.status_code == 400
    assert "Invalid or expired" in res.json()["detail"]


def test_resend_verification_email():
    """Issues fresh verification token for unverified account."""
    client.post("/auth/register", json={
        "email": "resend@storebi.com",
        "password": "SecurePassword123",
        "confirm_password": "SecurePassword123",
    })

    old_token = None
    with SessionLocal() as db:
        shop = db.query(models.Shop).filter(models.Shop.email == "resend@storebi.com").first()
        old_token = shop.email_verification_token

    res = client.post("/auth/resend-verification", json={"email": "resend@storebi.com"})
    assert res.status_code == 200
    assert res.json()["success"] is True

    with SessionLocal() as db:
        shop = db.query(models.Shop).filter(models.Shop.email == "resend@storebi.com").first()
        assert shop.email_verification_token is not None
        assert shop.email_verification_token != old_token


# ==============================================================================
# 3. LOGIN & CREDENTIAL VERIFICATION TESTS
# ==============================================================================

def test_login_invalid_credentials():
    """Rejects wrong email or incorrect password."""
    res1 = client.post("/auth/login", json={"email": "nonexistent@storebi.com", "password": "WrongPassword123"})
    assert res1.status_code == 401

    # Create account
    client.post("/auth/register", json={
        "email": "user@storebi.com",
        "password": "CorrectPassword123",
        "confirm_password": "CorrectPassword123",
    })

    # Wrong password
    res2 = client.post("/auth/login", json={"email": "user@storebi.com", "password": "WrongPassword123"})
    assert res2.status_code == 401


def test_login_unverified_account_rejected():
    """Blocks unverified accounts from logging in when email verification is required."""
    client.post("/auth/register", json={
        "email": "unverified@storebi.com",
        "password": "SecurePassword123",
        "confirm_password": "SecurePassword123",
    })

    res = client.post("/auth/login", json={"email": "unverified@storebi.com", "password": "SecurePassword123"})
    assert res.status_code == 403
    assert res.json()["detail"]["code"] == "EMAIL_NOT_VERIFIED"


def test_login_verified_account_success():
    """Allows verified account to log in and sets session cookie."""
    client.post("/auth/register", json={
        "email": "verified@storebi.com",
        "password": "SecurePassword123",
        "confirm_password": "SecurePassword123",
    })

    with SessionLocal() as db:
        shop = db.query(models.Shop).filter(models.Shop.email == "verified@storebi.com").first()
        shop.is_email_verified = True
        db.commit()

    login_res = client.post("/auth/login", json={"email": "verified@storebi.com", "password": "SecurePassword123"})
    assert login_res.status_code == 200
    assert login_res.json()["success"] is True
    assert "store_bi_session" in login_res.cookies


# ==============================================================================
# 4. FORGOT PASSWORD & PASSWORD RESET TESTS
# ==============================================================================

def test_password_reset_flow():
    """Tests password recovery end-to-end, validating token and password change."""
    # Register and verify account
    client.post("/auth/register", json={
        "email": "reset_user@storebi.com",
        "password": "OldPassword123",
        "confirm_password": "OldPassword123",
    })
    with SessionLocal() as db:
        shop = db.query(models.Shop).filter(models.Shop.email == "reset_user@storebi.com").first()
        shop.is_email_verified = True
        db.commit()

    # Request forgot password
    forgot_res = client.post("/auth/forgot-password", json={"email": "reset_user@storebi.com"})
    assert forgot_res.status_code == 200

    # Retrieve reset token
    reset_token = None
    with SessionLocal() as db:
        shop = db.query(models.Shop).filter(models.Shop.email == "reset_user@storebi.com").first()
        reset_token = shop.password_reset_token

    assert reset_token is not None

    # Reset password
    reset_res = client.post("/auth/reset-password", json={
        "token": reset_token,
        "new_password": "NewSecurePassword456",
        "confirm_password": "NewSecurePassword456",
    })
    assert reset_res.status_code == 200
    assert reset_res.json()["success"] is True

    # Verify old password no longer works
    old_login = client.post("/auth/login", json={"email": "reset_user@storebi.com", "password": "OldPassword123"})
    assert old_login.status_code == 401

    # Verify new password works
    new_login = client.post("/auth/login", json={"email": "reset_user@storebi.com", "password": "NewSecurePassword456"})
    assert new_login.status_code == 200


# ==============================================================================
# 5. REAL GOOGLE OAUTH SECURITY TESTS
# ==============================================================================

def test_google_auth_url_construction():
    """Validates that Google OAuth URL endpoint configures PKCE and state protection."""
    os.environ["GOOGLE_CLIENT_ID"] = "test-client-id-12345.apps.googleusercontent.com"
    os.environ["GOOGLE_CLIENT_SECRET"] = "test-client-secret"

    res = client.get("/auth/google/url")
    assert res.status_code == 200
    data = res.json()
    assert "accounts.google.com/o/oauth2/v2/auth" in data["url"]
    assert "code_challenge=" in data["url"]
    assert "code_challenge_method=S256" in data["url"]
    assert "state=" in data["url"]
    assert security.OAUTH_STATE_COOKIE in res.cookies
    assert security.OAUTH_VERIFIER_COOKIE in res.cookies


def test_google_callback_csrf_state_validation():
    """Rejects callback requests if state cookie does not match callback state."""
    res = client.post("/auth/google/callback", json={
        "code": "test_auth_code_123",
        "state": "unmatched_fraudulent_state"
    })
    assert res.status_code == 400
    assert "OAuth state validation failed" in res.json()["detail"]


# ==============================================================================
# 6. MULTI-TENANT BUSINESS DATA ISOLATION TESTS
# ==============================================================================

def test_multi_tenant_data_isolation():
    """
    Guarantees cross-tenant isolation:
    Merchant 1 cannot access, update, or delete records belonging to Merchant 2.
    """
    with SessionLocal() as db:
        now = datetime.utcnow()
        # Create Shop 1
        shop1 = models.Shop(
            name="Shop One",
            email="shop1@storebi.com",
            hashed_password=security.hash_password("Password123!"),
            is_email_verified=True,
            trial_end_date=now + timedelta(days=5),
            onboarding_completed=True,
        )
        # Create Shop 2
        shop2 = models.Shop(
            name="Shop Two",
            email="shop2@storebi.com",
            hashed_password=security.hash_password("Password123!"),
            is_email_verified=True,
            trial_end_date=now + timedelta(days=5),
            onboarding_completed=True,
        )
        db.add_all([shop1, shop2])
        db.commit()
        db.refresh(shop1)
        db.refresh(shop2)

        # Create Product for Shop 2
        prod2 = models.Product(
            shop_id=shop2.id,
            name="Confidential Wholesale Item",
            category="Beverages",
            cost_price=50.0,
            selling_price=100.0,
            stock_qty=500,
            reorder_level=50,
        )
        # Create Sale for Shop 2
        sale2 = models.Sale(
            shop_id=shop2.id,
            date_time=now,
            total_amount=500.0,
            total_profit=250.0,
            payment_mode="Cash",
        )
        # Create Expense for Shop 2
        exp2 = models.Expense(
            shop_id=shop2.id,
            date=now.date(),
            category="Rent",
            amount=15000.0,
            note="Shop 2 Secret Lease",
        )
        db.add_all([prod2, sale2, exp2])
        db.commit()
        db.refresh(prod2)
        db.refresh(sale2)
        db.refresh(exp2)

        shop1_id = shop1.id
        shop2_id = shop2.id
        prod2_id = prod2.id
        sale2_id = sale2.id
        exp2_id = exp2.id

    # Log in as Shop 1
    client1 = TestClient(app)
    login_res = client1.post("/auth/login", json={"email": "shop1@storebi.com", "password": "Password123!"})
    assert login_res.status_code == 200

    # 1. Shop 1 attempts to view Shop 2's profile -> 403 Forbidden
    res_shop = client1.get(f"/shops/{shop2_id}")
    assert res_shop.status_code == 403

    # 2. Shop 1 attempts to view Shop 2's confidential product -> 403 Forbidden
    res_prod = client1.get(f"/products/{prod2_id}")
    assert res_prod.status_code == 403

    # 3. Shop 1 attempts to update Shop 2's product -> 403 Forbidden
    res_upd_prod = client1.put(f"/products/{prod2_id}", json={"stock_qty": 0})
    assert res_upd_prod.status_code == 403

    # 4. Shop 1 attempts to delete Shop 2's product -> 403 Forbidden
    res_del_prod = client1.delete(f"/products/{prod2_id}")
    assert res_del_prod.status_code == 403

    # 5. Shop 1 attempts to view Shop 2's sale -> 403 Forbidden
    res_sale = client1.get(f"/sales/{sale2_id}")
    assert res_sale.status_code == 403

    # 6. Shop 1 attempts to view Shop 2's expense -> 403 Forbidden
    res_exp = client1.get(f"/expenses/{exp2_id}")
    assert res_exp.status_code == 403

    # 7. Unauthenticated visitor cannot list all shops -> 401 Unauthorized
    anon_client = TestClient(app)
    res_shops_anon = anon_client.get("/shops/")
    assert res_shops_anon.status_code == 401


# ==============================================================================
# 7. LOGOUT & SESSION TERMINATION TESTS
# ==============================================================================

def test_logout_session_invalidation():
    """Logging out clears session cookies and prevents access to /auth/me."""
    client.post("/auth/register", json={
        "email": "logout_test@storebi.com",
        "password": "Password123!",
        "confirm_password": "Password123!",
    })
    with SessionLocal() as db:
        shop = db.query(models.Shop).filter(models.Shop.email == "logout_test@storebi.com").first()
        shop.is_email_verified = True
        db.commit()

    login_res = client.post("/auth/login", json={"email": "logout_test@storebi.com", "password": "Password123!"})
    assert login_res.status_code == 200

    # /auth/me works
    me1 = client.get("/auth/me")
    assert me1.status_code == 200

    # Logout
    logout_res = client.post("/auth/logout")
    assert logout_res.status_code == 200

    # /auth/me fails
    me2 = client.get("/auth/me")
    assert me2.status_code == 401
