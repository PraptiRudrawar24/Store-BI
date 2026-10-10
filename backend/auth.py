import os
from datetime import datetime, timedelta
from typing import Optional
import jwt
from fastapi import Request, HTTPException, status, Depends
from sqlalchemy.orm import Session
import models
from database import get_db

SECRET_KEY = os.getenv("STORE_BI_SECRET_KEY", "store_bi_super_secret_jwt_key_retail_2026")
ALGORITHM = "HS256"
COOKIE_NAME = "store_bi_session"
ACCESS_TOKEN_EXPIRE_DAYS = 7

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None

def calculate_trial_days_left(trial_end_date: Optional[datetime]) -> int:
    if not trial_end_date:
        return 5
    now = datetime.utcnow()
    if now > trial_end_date:
        return 0
    delta = trial_end_date - now
    # 0 to 24h is 1 day, 24 to 48h is 2 days, etc.
    days = delta.days + (1 if delta.seconds > 0 else 0)
    return max(0, days)

def check_shop_feature_access(shop: models.Shop, feature_slug: str) -> bool:
    """
    Checks if a merchant shop has active access to a specific feature:
    - Admin always has full access
    - Suspended accounts are revoked
    - Paid accounts have access to full bundle or their subscribed modular features
    - Active trial accounts have access to all features during the trial window
    """
    if getattr(shop, "is_admin", False):
        return True

    if getattr(shop, "status", "") == "suspended":
        return False

    if getattr(shop, "is_paid", False):
        sub_features = getattr(shop, "subscribed_features", None)
        if not sub_features or sub_features == "all":
            return True
        features_list = [f.strip() for f in sub_features.split(",")]
        return feature_slug in features_list or "all" in features_list

    trial_days = calculate_trial_days_left(shop.trial_end_date)
    if trial_days > 0 and getattr(shop, "status", "trial") not in ("expired", "suspended"):
        return True

    return False

def require_feature(feature_slug: str):
    def dependency(shop: models.Shop = Depends(get_current_shop)):
        if getattr(shop, "status", "") == "suspended":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your store account has been suspended by Store BI operations. Please contact support.",
            )
        if not check_shop_feature_access(shop, feature_slug):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Subscription required. Your free trial has ended or your plan does not include '{feature_slug}'. Please upgrade your plan.",
            )
        return shop
    return dependency

def get_current_shop_optional(request: Request, db: Session = Depends(get_db)) -> Optional[models.Shop]:
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        # Fallback to Authorization: Bearer <token>
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()

    if not token:
        return None

    payload = decode_access_token(token)
    if not payload:
        return None

    shop_id = payload.get("sub")
    if not shop_id:
        return None

    try:
        shop = db.query(models.Shop).filter(models.Shop.id == int(shop_id)).first()
        return shop
    except (ValueError, TypeError):
        return None

def get_current_shop(request: Request, db: Session = Depends(get_db)) -> models.Shop:
    shop = get_current_shop_optional(request, db)
    if not shop:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in with your mobile number.",
        )
    return shop

def get_current_admin(current_shop: models.Shop = Depends(get_current_shop)) -> models.Shop:
    admin_email = os.environ.get("ADMIN_EMAIL", "").strip().lower()
    is_admin = getattr(current_shop, "is_admin", False)
    if not is_admin and admin_email and (current_shop.email or "").strip().lower() == admin_email:
        is_admin = True

    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Admin privileges required.",
        )
    return current_shop

def ensure_admin_account(db: Session):
    admin_email = os.environ.get("ADMIN_EMAIL", "").strip().lower()
    if not admin_email:
        return
    shop = db.query(models.Shop).filter(models.Shop.email.ilike(admin_email)).first()
    if shop:
        if not getattr(shop, "is_admin", False):
            shop.is_admin = True
            db.commit()
    else:
        admin_shop = models.Shop(
            name="Store BI Operations",
            owner_name="Platform Admin",
            phone="9999999999",
            email=admin_email,
            is_admin=True,
            onboarding_completed=True,
            onboarding_step=4,
            category="Operations",
            city="Headquarters",
            state="Maharashtra",
            plan_name="Enterprise Admin",
            is_paid=True,
            status="active",
        )
        db.add(admin_shop)
        db.commit()
