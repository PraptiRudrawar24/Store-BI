import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Isolate test database during pytest execution so real user storebi.db is never wiped
if "pytest" in sys.modules or os.environ.get("TESTING") == "1" or os.environ.get("PYTEST_CURRENT_TEST"):
    SQLALCHEMY_DATABASE_URL = "sqlite:///./test_storebi.db"
else:
    SQLALCHEMY_DATABASE_URL = "sqlite:///./storebi.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def migrate_db():
    from sqlalchemy import text
    with engine.connect() as conn:
        try:
            # Check existing columns in shops table
            res = conn.execute(text("PRAGMA table_info(shops)")).fetchall()
            cols = [r[1] for r in res]
            if cols:
                if "is_admin" not in cols:
                    conn.execute(text("ALTER TABLE shops ADD COLUMN is_admin BOOLEAN DEFAULT 0"))
                if "is_paid" not in cols:
                    conn.execute(text("ALTER TABLE shops ADD COLUMN is_paid BOOLEAN DEFAULT 0"))
                if "plan_name" not in cols:
                    conn.execute(text("ALTER TABLE shops ADD COLUMN plan_name VARCHAR DEFAULT 'Free Trial'"))
                if "subscription_amount" not in cols:
                    conn.execute(text("ALTER TABLE shops ADD COLUMN subscription_amount FLOAT DEFAULT 0.0"))
                if "last_active_at" not in cols:
                    conn.execute(text("ALTER TABLE shops ADD COLUMN last_active_at DATETIME"))
                if "status" not in cols:
                    conn.execute(text("ALTER TABLE shops ADD COLUMN status VARCHAR DEFAULT 'trial'"))
                if "admin_notes" not in cols:
                    conn.execute(text("ALTER TABLE shops ADD COLUMN admin_notes TEXT"))
                if "subscribed_features" not in cols:
                    conn.execute(text("ALTER TABLE shops ADD COLUMN subscribed_features VARCHAR"))
                if "google_id" not in cols:
                    conn.execute(text("ALTER TABLE shops ADD COLUMN google_id VARCHAR"))
                if "picture" not in cols:
                    conn.execute(text("ALTER TABLE shops ADD COLUMN picture VARCHAR"))
                if "hashed_password" not in cols:
                    conn.execute(text("ALTER TABLE shops ADD COLUMN hashed_password VARCHAR"))
                if "is_email_verified" not in cols:
                    conn.execute(text("ALTER TABLE shops ADD COLUMN is_email_verified BOOLEAN DEFAULT 0"))
                if "email_verification_token" not in cols:
                    conn.execute(text("ALTER TABLE shops ADD COLUMN email_verification_token VARCHAR"))
                if "email_verification_sent_at" not in cols:
                    conn.execute(text("ALTER TABLE shops ADD COLUMN email_verification_sent_at DATETIME"))
                if "password_reset_token" not in cols:
                    conn.execute(text("ALTER TABLE shops ADD COLUMN password_reset_token VARCHAR"))
                if "password_reset_sent_at" not in cols:
                    conn.execute(text("ALTER TABLE shops ADD COLUMN password_reset_sent_at DATETIME"))

            # Ensure shop_id exists on products for per-user data isolation
            res_p = conn.execute(text("PRAGMA table_info(products)")).fetchall()
            cols_p = [r[1] for r in res_p]
            if cols_p and "shop_id" not in cols_p:
                conn.execute(text("ALTER TABLE products ADD COLUMN shop_id INTEGER"))

            # Ensure shop_id exists on sales for per-user data isolation
            res_s = conn.execute(text("PRAGMA table_info(sales)")).fetchall()
            cols_s = [r[1] for r in res_s]
            if cols_s and "shop_id" not in cols_s:
                conn.execute(text("ALTER TABLE sales ADD COLUMN shop_id INTEGER"))

            # Ensure shop_id exists on expenses for per-user data isolation
            res_e = conn.execute(text("PRAGMA table_info(expenses)")).fetchall()
            cols_e = [r[1] for r in res_e]
            if cols_e and "shop_id" not in cols_e:
                conn.execute(text("ALTER TABLE expenses ADD COLUMN shop_id INTEGER"))

            # Ensure all tables in metadata are created
            Base.metadata.create_all(bind=conn)

            conn.commit()
        except Exception:
            pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
