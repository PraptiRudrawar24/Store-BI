import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))

# Isolate test database during pytest execution so real user storebi.db is never wiped
if "pytest" in sys.modules or os.environ.get("TESTING") == "1" or os.environ.get("PYTEST_CURRENT_TEST"):
    test_db_path = os.path.join(BACKEND_DIR, "test_storebi.db").replace("\\", "/")
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{test_db_path}"
else:
    prod_db_path = os.path.join(BACKEND_DIR, "storebi.db").replace("\\", "/")
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{prod_db_path}"

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
                if "subscription_start_date" not in cols:
                    conn.execute(text("ALTER TABLE shops ADD COLUMN subscription_start_date DATETIME"))
                if "subscription_end_date" not in cols:
                    conn.execute(text("ALTER TABLE shops ADD COLUMN subscription_end_date DATETIME"))
                if "last_active_at" not in cols:
                    conn.execute(text("ALTER TABLE shops ADD COLUMN last_active_at DATETIME"))
                if "status" not in cols:
                    conn.execute(text("ALTER TABLE shops ADD COLUMN status VARCHAR DEFAULT 'trial'"))
                if "admin_notes" not in cols:
                    conn.execute(text("ALTER TABLE shops ADD COLUMN admin_notes TEXT"))
                if "subscribed_features" not in cols:
                    conn.execute(text("ALTER TABLE shops ADD COLUMN subscribed_features VARCHAR"))

            # Ensure shop_id exists on products for per-user data isolation
            res_p = conn.execute(text("PRAGMA table_info(products)")).fetchall()
            cols_p = [r[1] for r in res_p]
            if cols_p and "shop_id" not in cols_p:
                conn.execute(text("ALTER TABLE products ADD COLUMN shop_id INTEGER"))

            # Ensure shop_id exists on sales for per-user data isolation
            res_s = conn.execute(text("PRAGMA table_info(sales)")).fetchall()
            cols_s = [r[1] for r in res_s]
            if cols_s:
                if "shop_id" not in cols_s:
                    conn.execute(text("ALTER TABLE sales ADD COLUMN shop_id INTEGER"))
                if "customer_name" not in cols_s:
                    conn.execute(text("ALTER TABLE sales ADD COLUMN customer_name VARCHAR"))
                if "customer_phone" not in cols_s:
                    conn.execute(text("ALTER TABLE sales ADD COLUMN customer_phone VARCHAR"))

            # Ensure shop_id exists on expenses for per-user data isolation
            res_e = conn.execute(text("PRAGMA table_info(expenses)")).fetchall()
            cols_e = [r[1] for r in res_e]
            if cols_e and "shop_id" not in cols_e:
                conn.execute(text("ALTER TABLE expenses ADD COLUMN shop_id INTEGER"))

            # Ensure invoices table exists for storing purchase invoices and OCR records
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS invoices (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    shop_id INTEGER,
                    invoice_number VARCHAR,
                    supplier_name VARCHAR,
                    invoice_date DATE,
                    created_at DATETIME,
                    currency VARCHAR DEFAULT 'INR',
                    subtotal FLOAT,
                    tax_amount FLOAT,
                    total_amount FLOAT,
                    items_count INTEGER DEFAULT 0,
                    notes VARCHAR,
                    ocr_engine VARCHAR,
                    status VARCHAR DEFAULT 'confirmed',
                    items_json TEXT,
                    FOREIGN KEY(shop_id) REFERENCES shops(id)
                )
            """))
            # Ensure items_count and notes exist if table already existed
            res_inv = conn.execute(text("PRAGMA table_info(invoices)")).fetchall()
            inv_cols = [r[1] for r in res_inv]
            if "items_count" not in inv_cols:
                conn.execute(text("ALTER TABLE invoices ADD COLUMN items_count INTEGER DEFAULT 0"))
            if "notes" not in inv_cols:
                conn.execute(text("ALTER TABLE invoices ADD COLUMN notes VARCHAR"))

            # Ensure payment_transactions table exists for tracking subscription payments
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS payment_transactions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    shop_id INTEGER NOT NULL,
                    order_id VARCHAR NOT NULL UNIQUE,
                    payment_id VARCHAR UNIQUE,
                    signature VARCHAR,
                    plan_name VARCHAR DEFAULT 'All-Features Pro',
                    billing_cycle VARCHAR DEFAULT 'monthly',
                    amount FLOAT NOT NULL,
                    currency VARCHAR DEFAULT 'INR',
                    payment_method VARCHAR,
                    status VARCHAR DEFAULT 'created',
                    error_reason VARCHAR,
                    is_test_mode BOOLEAN DEFAULT 0,
                    utr_number VARCHAR UNIQUE,
                    created_at DATETIME,
                    updated_at DATETIME,
                    paid_at DATETIME,
                    FOREIGN KEY(shop_id) REFERENCES shops(id)
                )
            """))
            # Ensure utr_number column exists if payment_transactions table already existed
            res_pt = conn.execute(text("PRAGMA table_info(payment_transactions)")).fetchall()
            pt_cols = [r[1] for r in res_pt]
            if "utr_number" not in pt_cols:
                conn.execute(text("ALTER TABLE payment_transactions ADD COLUMN utr_number VARCHAR"))


            # Ensure support_tickets, ticket_messages, and customer_feedback tables exist
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS support_tickets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ticket_number VARCHAR NOT NULL UNIQUE,
                    shop_id INTEGER NOT NULL,
                    subject VARCHAR NOT NULL,
                    category VARCHAR NOT NULL,
                    description TEXT NOT NULL,
                    priority VARCHAR DEFAULT 'Normal',
                    status VARCHAR DEFAULT 'Open',
                    assigned_admin VARCHAR,
                    attachment_name VARCHAR,
                    attachment_data TEXT,
                    has_customer_unread BOOLEAN DEFAULT 0,
                    has_admin_unread BOOLEAN DEFAULT 1,
                    created_at DATETIME,
                    updated_at DATETIME,
                    FOREIGN KEY(shop_id) REFERENCES shops(id)
                )
            """))

            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS ticket_messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ticket_id INTEGER NOT NULL,
                    sender_id INTEGER,
                    sender_role VARCHAR NOT NULL,
                    sender_name VARCHAR NOT NULL,
                    message TEXT NOT NULL,
                    attachment_name VARCHAR,
                    attachment_data TEXT,
                    created_at DATETIME,
                    FOREIGN KEY(ticket_id) REFERENCES support_tickets(id),
                    FOREIGN KEY(sender_id) REFERENCES shops(id)
                )
            """))

            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS customer_feedback (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    shop_id INTEGER NOT NULL,
                    category VARCHAR NOT NULL,
                    rating INTEGER DEFAULT 5,
                    subject VARCHAR,
                    comments TEXT NOT NULL,
                    status VARCHAR DEFAULT 'New',
                    admin_notes TEXT,
                    converted_ticket_id INTEGER,
                    created_at DATETIME,
                    updated_at DATETIME,
                    FOREIGN KEY(shop_id) REFERENCES shops(id)
                )
            """))

            conn.commit()
        except Exception:
            pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
