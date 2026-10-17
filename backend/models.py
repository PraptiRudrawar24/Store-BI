from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Date, Boolean
from sqlalchemy.orm import relationship
from database import Base

class Shop(Base):
    __tablename__ = "shops"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=True)
    owner_name = Column(String, nullable=True)
    phone = Column(String, unique=True, index=True)
    email = Column(String, nullable=True)
    category = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    pincode = Column(String, nullable=True)
    gstin = Column(String, nullable=True)
    language = Column(String, default="en")

    # Step 3: Operational Setup
    approx_products = Column(String, nullable=True)
    monthly_turnover = Column(String, nullable=True)
    current_tracking_method = Column(String, nullable=True)
    sells_expiring_goods = Column(Boolean, default=False)

    # Step 4: Biggest problems to solve
    challenges = Column(String, nullable=True)

    # Trial & Onboarding Tracking
    trial_start_date = Column(DateTime, nullable=True)
    trial_end_date = Column(DateTime, nullable=True)
    onboarding_completed = Column(Boolean, default=False)
    onboarding_step = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Admin & Subscription Status
    is_admin = Column(Boolean, default=False)
    is_paid = Column(Boolean, default=False)
    plan_name = Column(String, default="Free Trial")
    subscription_amount = Column(Float, default=0.0)
    subscription_start_date = Column(DateTime, nullable=True)
    subscription_end_date = Column(DateTime, nullable=True)
    last_active_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="trial")  # "trial", "active", "expired", "suspended"
    admin_notes = Column(String, nullable=True)
    subscribed_features = Column(String, nullable=True)  # Comma-separated or 'all'

    audit_logs = relationship("AuditLog", back_populates="shop", cascade="all, delete-orphan")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    shop_id = Column(Integer, ForeignKey("shops.id"), nullable=True)
    admin_email = Column(String, nullable=False)
    action = Column(String, nullable=False)  # "extend_trial", "resend_login", "suspend", "activate", "update_note"
    details = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    shop = relationship("Shop", back_populates="audit_logs")

class PromoCode(Base):
    __tablename__ = "promo_codes"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    discount_type = Column(String, default="percentage")  # "percentage" or "fixed"
    discount_value = Column(Float, nullable=False)
    validity = Column(String, nullable=True)
    max_uses = Column(Integer, default=100)
    used_count = Column(Integer, default=0)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class PlanConfig(Base):
    __tablename__ = "plan_configs"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True, nullable=False)
    value = Column(String, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow)

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    shop_id = Column(Integer, ForeignKey("shops.id"), nullable=True, index=True)
    name = Column(String, index=True)
    category = Column(String)
    cost_price = Column(Float)
    selling_price = Column(Float)
    stock_qty = Column(Integer)
    reorder_level = Column(Integer)
    expiry_date = Column(Date, nullable=True)

class Sale(Base):
    __tablename__ = "sales"
    id = Column(Integer, primary_key=True, index=True)
    shop_id = Column(Integer, ForeignKey("shops.id"), nullable=True, index=True)
    date_time = Column(DateTime)
    total_amount = Column(Float)
    total_profit = Column(Float)
    payment_mode = Column(String)
    customer_name = Column(String, nullable=True)
    customer_phone = Column(String, nullable=True)
    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")

class SaleItem(Base):
    __tablename__ = "sale_items"
    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    qty = Column(Integer)
    unit_price = Column(Float)
    unit_cost = Column(Float)
    sale = relationship("Sale", back_populates="items")
    product = relationship("Product")

class Expense(Base):
    __tablename__ = "expenses"
    id = Column(Integer, primary_key=True, index=True)
    shop_id = Column(Integer, ForeignKey("shops.id"), nullable=True, index=True)
    date = Column(Date)
    category = Column(String)
    amount = Column(Float)
    note = Column(String)

class Invoice(Base):
    __tablename__ = "invoices"
    id = Column(Integer, primary_key=True, index=True)
    shop_id = Column(Integer, ForeignKey("shops.id"), nullable=True, index=True)
    invoice_number = Column(String, nullable=True, index=True)
    supplier_name = Column(String, nullable=True, index=True)
    invoice_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    currency = Column(String, default="INR")
    subtotal = Column(Float, nullable=True)
    tax_amount = Column(Float, nullable=True)
    total_amount = Column(Float, nullable=True)
    items_count = Column(Integer, default=0)
    notes = Column(String, nullable=True)
    ocr_engine = Column(String, nullable=True)
    status = Column(String, default="confirmed")
    items_json = Column(String, nullable=True)

class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"
    id = Column(Integer, primary_key=True, index=True)
    shop_id = Column(Integer, ForeignKey("shops.id"), nullable=False, index=True)
    order_id = Column(String, unique=True, index=True, nullable=False)
    payment_id = Column(String, unique=True, index=True, nullable=True)
    signature = Column(String, nullable=True)
    plan_name = Column(String, default="All-Features Pro")
    billing_cycle = Column(String, default="monthly")
    amount = Column(Float, nullable=False)
    currency = Column(String, default="INR")
    payment_method = Column(String, nullable=True)
    status = Column(String, default="created")  # "created", "waiting_for_payment", "pending_verification", "paid", "failed", "cancelled"
    error_reason = Column(String, nullable=True)
    is_test_mode = Column(Boolean, default=False)
    utr_number = Column(String, unique=True, index=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    paid_at = Column(DateTime, nullable=True)

    shop = relationship("Shop", backref="payment_transactions")

class SupportTicket(Base):
    __tablename__ = "support_tickets"
    id = Column(Integer, primary_key=True, index=True)
    ticket_number = Column(String, unique=True, index=True, nullable=False)
    shop_id = Column(Integer, ForeignKey("shops.id"), nullable=False, index=True)
    subject = Column(String, nullable=False)
    category = Column(String, nullable=False)
    description = Column(String, nullable=False)
    priority = Column(String, default="Normal")  # "Low", "Normal", "High"
    status = Column(String, default="Open")  # "Open", "In Progress", "Waiting for Customer", "Resolved", "Closed"
    assigned_admin = Column(String, nullable=True)
    attachment_name = Column(String, nullable=True)
    attachment_data = Column(String, nullable=True)
    has_customer_unread = Column(Boolean, default=False)
    has_admin_unread = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    shop = relationship("Shop", backref="support_tickets")
    messages = relationship("TicketMessage", back_populates="ticket", cascade="all, delete-orphan", order_by="TicketMessage.created_at.asc()")

class TicketMessage(Base):
    __tablename__ = "ticket_messages"
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("support_tickets.id"), nullable=False, index=True)
    sender_id = Column(Integer, ForeignKey("shops.id"), nullable=True)
    sender_role = Column(String, nullable=False)  # "customer" or "admin"
    sender_name = Column(String, nullable=False)
    message = Column(String, nullable=False)
    attachment_name = Column(String, nullable=True)
    attachment_data = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    ticket = relationship("SupportTicket", back_populates="messages")

class CustomerFeedback(Base):
    __tablename__ = "customer_feedback"
    id = Column(Integer, primary_key=True, index=True)
    shop_id = Column(Integer, ForeignKey("shops.id"), nullable=False, index=True)
    category = Column(String, nullable=False)  # "Feature Suggestion", "User Experience", "Bug Report", "General Feedback"
    rating = Column(Integer, nullable=False, default=5)  # 1 to 5
    subject = Column(String, nullable=True)
    comments = Column(String, nullable=False)
    status = Column(String, default="New")  # "New", "Under Review", "Planned", "Implemented", "Declined"
    admin_notes = Column(String, nullable=True)
    converted_ticket_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    shop = relationship("Shop", backref="customer_feedbacks")

