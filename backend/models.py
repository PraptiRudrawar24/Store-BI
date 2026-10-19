from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Date, Boolean
from sqlalchemy.orm import relationship
from database import Base

class Shop(Base):
    __tablename__ = "shops"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=True)
    owner_name = Column(String, nullable=True)
    phone = Column(String, unique=True, index=True, nullable=True)
    email = Column(String, index=True, nullable=True)
    hashed_password = Column(String, nullable=True)
    google_id = Column(String, unique=True, index=True, nullable=True)
    picture = Column(String, nullable=True)
    is_email_verified = Column(Boolean, default=False)
    email_verification_token = Column(String, unique=True, index=True, nullable=True)
    email_verification_sent_at = Column(DateTime, nullable=True)
    password_reset_token = Column(String, unique=True, index=True, nullable=True)
    password_reset_sent_at = Column(DateTime, nullable=True)
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
    transaction_ref = Column(String, unique=True, index=True, nullable=True)
    shop_id = Column(Integer, ForeignKey("shops.id"), nullable=True, index=True)
    order_id = Column(String, unique=True, index=True, nullable=True)
    payment_id = Column(String, unique=True, index=True, nullable=True)
    signature = Column(String, nullable=True)
    plan_name = Column(String, default="All-Features Pro")
    billing_cycle = Column(String, default="monthly")
    amount = Column(Float, nullable=True)
    amount_paise = Column(Integer, default=0)
    currency = Column(String, default="INR")
    payment_method = Column(String, default="upi")
    gateway = Column(String, default="razorpay")
    gateway_payment_id = Column(String, unique=True, index=True, nullable=True)
    gateway_order_id = Column(String, nullable=True)
    gateway_fee_paise = Column(Integer, default=0)
    gateway_tax_paise = Column(Integer, default=0)
    net_settlement_paise = Column(Integer, default=0)
    status = Column(String, default="created", index=True)
    settlement_status = Column(String, default="pending", index=True)
    settlement_id = Column(String, nullable=True)
    refunded_amount_paise = Column(Integer, default=0)
    failure_code = Column(String, nullable=True)
    failure_reason = Column(String, nullable=True)
    customer_email = Column(String, nullable=True)
    customer_phone = Column(String, nullable=True)
    metadata_json = Column(String, nullable=True)
    is_test_mode = Column(Boolean, default=False)
    utr_number = Column(String, unique=True, index=True, nullable=True)
    error_reason = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow)
    paid_at = Column(DateTime, nullable=True)

    shop = relationship("Shop", backref="payment_transactions")
    refunds = relationship("PaymentRefund", back_populates="transaction", cascade="all, delete-orphan")
    tax_invoice = relationship("TaxInvoice", back_populates="transaction", uselist=False)

class SupportTicket(Base):
    __tablename__ = "support_tickets"
    id = Column(Integer, primary_key=True, index=True)
    ticket_number = Column(String, unique=True, index=True, nullable=False)
    shop_id = Column(Integer, ForeignKey("shops.id"), nullable=False, index=True)
    subject = Column(String, nullable=False)
    category = Column(String, nullable=False)
    description = Column(String, nullable=False)
    priority = Column(String, default="Normal")
    status = Column(String, default="Open")
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
    sender_role = Column(String, nullable=False)
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
    category = Column(String, nullable=False)
    rating = Column(Integer, nullable=False, default=5)
    subject = Column(String, nullable=True)
    comments = Column(String, nullable=False)
    status = Column(String, default="New")
    admin_notes = Column(String, nullable=True)
    converted_ticket_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    shop = relationship("Shop", backref="customer_feedbacks")

class PaymentRefund(Base):
    __tablename__ = "payment_refunds"
    id = Column(Integer, primary_key=True, index=True)
    refund_ref = Column(String, unique=True, index=True, nullable=False)
    transaction_id = Column(Integer, ForeignKey("payment_transactions.id"), nullable=False, index=True)
    shop_id = Column(Integer, ForeignKey("shops.id"), nullable=True, index=True)
    amount_paise = Column(Integer, nullable=False)
    reason = Column(String, default="customer_request")
    status = Column(String, default="processed", index=True)
    gateway_refund_id = Column(String, nullable=True)
    requested_by_admin = Column(String, nullable=True)
    admin_notes = Column(String, nullable=True)
    idempotency_key = Column(String, unique=True, index=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)

    transaction = relationship("PaymentTransaction", back_populates="refunds")
    shop = relationship("Shop")

class SettlementBatch(Base):
    __tablename__ = "settlement_batches"
    id = Column(Integer, primary_key=True, index=True)
    batch_reference = Column(String, unique=True, index=True, nullable=False)
    gateway = Column(String, default="razorpay")
    provider_settlement_id = Column(String, nullable=True)
    total_gross_paise = Column(Integer, default=0)
    total_fee_paise = Column(Integer, default=0)
    total_tax_paise = Column(Integer, default=0)
    total_net_paise = Column(Integer, default=0)
    entry_count = Column(Integer, default=0)
    matched_count = Column(Integer, default=0)
    unmatched_count = Column(Integer, default=0)
    discrepant_count = Column(Integer, default=0)
    status = Column(String, default="uploaded")
    file_name = Column(String, nullable=True)
    uploaded_by = Column(String, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    reconciled_at = Column(DateTime, nullable=True)

    entries = relationship("SettlementEntry", back_populates="batch", cascade="all, delete-orphan")

class SettlementEntry(Base):
    __tablename__ = "settlement_entries"
    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("settlement_batches.id"), nullable=False, index=True)
    transaction_id = Column(Integer, ForeignKey("payment_transactions.id"), nullable=True, index=True)
    provider_payment_id = Column(String, index=True, nullable=False)
    provider_arn_utr = Column(String, nullable=True)
    gross_amount_paise = Column(Integer, nullable=False)
    fee_amount_paise = Column(Integer, default=0)
    tax_amount_paise = Column(Integer, default=0)
    net_amount_paise = Column(Integer, default=0)
    settlement_date = Column(Date, nullable=True)
    status = Column(String, default="unmatched")
    discrepancy_reason = Column(String, nullable=True)
    resolution_notes = Column(String, nullable=True)
    resolved_by = Column(String, nullable=True)
    resolved_at = Column(DateTime, nullable=True)

    batch = relationship("SettlementBatch", back_populates="entries")
    transaction = relationship("PaymentTransaction")

class TaxInvoice(Base):
    __tablename__ = "tax_invoices"
    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String, unique=True, index=True, nullable=False)
    transaction_id = Column(Integer, ForeignKey("payment_transactions.id"), nullable=True, unique=True)
    shop_id = Column(Integer, ForeignKey("shops.id"), nullable=True, index=True)
    invoice_date = Column(Date, nullable=False)
    supplier_legal_name = Column(String, default="Store BI Technologies Pvt Ltd")
    supplier_gstin = Column(String, default="27AABCS1429B1Z")
    supplier_address = Column(String, default="Baner Tech Park, Pune, Maharashtra 411045")
    supplier_state = Column(String, default="Maharashtra")
    supplier_state_code = Column(String, default="27")
    customer_business_name = Column(String, nullable=False)
    customer_owner_name = Column(String, nullable=True)
    customer_gstin = Column(String, nullable=True)
    customer_state = Column(String, default="Maharashtra")
    customer_state_code = Column(String, default="27")
    place_of_supply = Column(String, default="Maharashtra (27)")
    sac_code = Column(String, default="998314")
    description_of_service = Column(String, default="Store BI Cloud SaaS Subscription")
    taxable_amount_paise = Column(Integer, nullable=False)
    is_interstate = Column(Boolean, default=False)
    cgst_rate = Column(Float, default=9.0)
    cgst_amount_paise = Column(Integer, default=0)
    sgst_rate = Column(Float, default=9.0)
    sgst_amount_paise = Column(Integer, default=0)
    igst_rate = Column(Float, default=18.0)
    igst_amount_paise = Column(Integer, default=0)
    total_invoice_paise = Column(Integer, nullable=False)
    invoice_type = Column(String, default="tax_invoice")
    original_invoice_id = Column(Integer, nullable=True)
    status = Column(String, default="issued")
    created_at = Column(DateTime, default=datetime.utcnow)

    transaction = relationship("PaymentTransaction", back_populates="tax_invoice")
    shop = relationship("Shop")

class WebhookEvent(Base):
    __tablename__ = "webhook_events"
    id = Column(Integer, primary_key=True, index=True)
    gateway = Column(String, default="razorpay")
    event_id = Column(String, unique=True, index=True, nullable=False)
    event_type = Column(String, index=True, nullable=False)
    payload_json = Column(String, nullable=False)
    status = Column(String, default="processed")
    error_message = Column(String, nullable=True)
    received_at = Column(DateTime, default=datetime.utcnow)

class ScheduledReport(Base):
    __tablename__ = "scheduled_reports"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    report_type = Column(String, nullable=False, default="platform_summary")
    frequency = Column(String, nullable=False, default="weekly")  # "daily", "weekly", "monthly"
    filters_json = Column(String, default="{}")
    recipients = Column(String, nullable=False)  # Comma-separated emails
    format = Column(String, default="csv")  # "csv", "pdf", "both"
    status = Column(String, default="active", index=True)  # "active", "paused"
    last_run_at = Column(DateTime, nullable=True)
    next_run_at = Column(DateTime, nullable=True)
    last_status = Column(String, default="idle")  # "idle", "success", "failed"
    last_error = Column(String, nullable=True)
    retry_count = Column(Integer, default=0)
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    execution_logs = relationship("ReportExecutionLog", back_populates="scheduled_report", cascade="all, delete-orphan")

class ReportExecutionLog(Base):
    __tablename__ = "report_execution_logs"
    id = Column(Integer, primary_key=True, index=True)
    schedule_id = Column(Integer, ForeignKey("scheduled_reports.id", ondelete="CASCADE"), nullable=True, index=True)
    report_name = Column(String, nullable=False)
    report_type = Column(String, nullable=False)
    frequency = Column(String, nullable=False)
    recipients = Column(String, nullable=False)
    format = Column(String, default="csv")
    status = Column(String, default="success", index=True)  # "success", "failed"
    error_message = Column(String, nullable=True)
    duration_ms = Column(Integer, default=0)
    delivered_via = Column(String, default="dev_console")  # "resend", "smtp", "dev_console"
    executed_at = Column(DateTime, default=datetime.utcnow, index=True)

    scheduled_report = relationship("ScheduledReport", back_populates="execution_logs")


class SubscriptionAccessRequest(Base):
    __tablename__ = "subscription_access_requests"
    id = Column(Integer, primary_key=True, index=True)
    request_ref = Column(String, unique=True, index=True, nullable=False)
    shop_id = Column(Integer, ForeignKey("shops.id"), nullable=False, index=True)
    plan_name = Column(String, default="All-Features Pro")
    amount = Column(Float, default=1299.0)
    currency = Column(String, default="INR")
    payment_method = Column(String, default="upi_qr")
    utr_number = Column(String, nullable=True, index=True)
    customer_notes = Column(String, nullable=True)
    status = Column(String, default="pending_review", index=True)  # "pending_review", "approved", "rejected"
    submitted_at = Column(DateTime, default=datetime.utcnow, index=True)
    reviewed_at = Column(DateTime, nullable=True)
    reviewed_by_admin = Column(String, nullable=True)
    rejection_reason = Column(String, nullable=True)
    admin_notes = Column(String, nullable=True)
    payment_reference = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    shop = relationship("Shop", backref="subscription_access_requests")


class SubscriptionHistory(Base):
    __tablename__ = "subscription_history"
    id = Column(Integer, primary_key=True, index=True)
    shop_id = Column(Integer, ForeignKey("shops.id"), nullable=False, index=True)
    event_type = Column(String, nullable=False, index=True)  # "trial_started", "request_submitted", "payment_approved", "payment_rejected", "subscription_renewed", "subscription_expired"
    plan_name = Column(String, default="All-Features Pro")
    amount = Column(Float, nullable=True)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    actor = Column(String, nullable=True)  # admin email, customer, or "system"
    reference_id = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    shop = relationship("Shop", backref="subscription_history_entries")


class InAppNotification(Base):
    __tablename__ = "in_app_notifications"
    id = Column(Integer, primary_key=True, index=True)
    shop_id = Column(Integer, ForeignKey("shops.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    type = Column(String, default="info")  # "info", "success", "warning", "error"
    is_read = Column(Boolean, default=False, index=True)
    link = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    shop = relationship("Shop", backref="in_app_notifications")



