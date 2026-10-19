from datetime import date, datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, field_validator
import re

# --- Auth & OTP Schemas ---
class SendOTPRequest(BaseModel):
    phone: str

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v: str) -> str:
        clean = re.sub(r'[\s\-\+\(\)]', '', v)
        if clean.startswith('91') and len(clean) == 12:
            clean = clean[2:]
        if len(clean) != 10 or not clean.isdigit():
            raise ValueError('Please enter a valid 10-digit mobile number')
        return clean

class VerifyOTPRequest(BaseModel):
    phone: str
    otp: str
    email: Optional[str] = None
    store_name: Optional[str] = None
    owner_name: Optional[str] = None

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v: str) -> str:
        clean = re.sub(r'[\s\-\+\(\)]', '', v)
        if clean.startswith('91') and len(clean) == 12:
            clean = clean[2:]
        if len(clean) != 10 or not clean.isdigit():
            raise ValueError('Please enter a valid 10-digit mobile number')
        return clean

# --- Onboarding Steps Schemas ---
class OnboardingStep1Request(BaseModel):
    owner_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    language: str = "en"

class OnboardingStep2Request(BaseModel):
    name: str  # Shop name
    category: str
    city: str
    state: str
    pincode: str
    gstin: Optional[str] = None

    @field_validator('gstin')
    @classmethod
    def validate_gstin(cls, v: Optional[str]) -> Optional[str]:
        if not v or v.strip() == "":
            return None
        cleaned = v.strip().upper()
        # 15 character Indian GST format: 2 digits state code + 5 letters PAN + 4 digits + 1 letter + 1 char + Z + 1 char
        gstin_regex = r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
        if not re.match(gstin_regex, cleaned):
            raise ValueError('Invalid GSTIN format. Expected 15-character Indian GST format (e.g., 27ABCDE1234F1Z5)')
        return cleaned

    @field_validator('pincode')
    @classmethod
    def validate_pincode(cls, v: str) -> str:
        clean = v.strip()
        if len(clean) != 6 or not clean.isdigit():
            raise ValueError('Invalid pincode. Expected 6-digit postal code')
        return clean

class OnboardingStep3Request(BaseModel):
    approx_products: str
    monthly_turnover: str
    current_tracking_method: str
    sells_expiring_goods: bool = False

class OnboardingStep4Request(BaseModel):
    challenges: List[str]

class GoogleAuthRequest(BaseModel):
    credential: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    picture: Optional[str] = None
    google_id: Optional[str] = None
    mode: Optional[str] = "login"

# --- Production Auth Schemas ---
class RegisterRequest(BaseModel):
    email: str
    password: str
    confirm_password: str
    owner_name: Optional[str] = None
    store_name: Optional[str] = None

    @field_validator('email')
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        clean = v.strip().lower()
        if not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', clean):
            raise ValueError('Please enter a valid email address')
        return clean

class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator('email')
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        clean = v.strip().lower()
        if not clean or '@' not in clean:
            raise ValueError('Please enter a valid email address')
        return clean

class ForgotPasswordRequest(BaseModel):
    email: str

    @field_validator('email')
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        clean = v.strip().lower()
        if not clean or '@' not in clean:
            raise ValueError('Please enter a valid email address')
        return clean

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    confirm_password: str

class VerifyEmailRequest(BaseModel):
    token: str

class ResendVerificationRequest(BaseModel):
    email: str

class GoogleAuthUrlResponse(BaseModel):
    url: str

class GoogleCallbackRequest(BaseModel):
    code: str
    state: str
    code_verifier: Optional[str] = None

class GoogleTokenRequest(BaseModel):
    credential: str

# --- Shop Schemas ---
class ShopBase(BaseModel):
    name: Optional[str] = None
    owner_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    google_id: Optional[str] = None
    picture: Optional[str] = None
    is_email_verified: bool = False
    category: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    gstin: Optional[str] = None
    language: str = "en"
    approx_products: Optional[str] = None
    monthly_turnover: Optional[str] = None
    current_tracking_method: Optional[str] = None
    sells_expiring_goods: bool = False
    challenges: Optional[str] = None
    trial_start_date: Optional[datetime] = None
    trial_end_date: Optional[datetime] = None
    onboarding_completed: bool = False
    onboarding_step: int = 1
    is_admin: bool = False
    is_paid: bool = False
    plan_name: Optional[str] = "Free Trial"
    status: Optional[str] = "trial"
    subscription_amount: Optional[float] = 0.0
    subscription_start_date: Optional[datetime] = None
    subscription_end_date: Optional[datetime] = None
    subscribed_features: Optional[str] = "all"

class ShopCreate(ShopBase):
    pass

class ShopUpdate(BaseModel):
    name: Optional[str] = None
    owner_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    category: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    gstin: Optional[str] = None
    language: Optional[str] = None
    approx_products: Optional[str] = None
    monthly_turnover: Optional[str] = None
    current_tracking_method: Optional[str] = None
    sells_expiring_goods: Optional[bool] = None
    challenges: Optional[str] = None

class ShopResponse(ShopBase):
    id: int
    trial_days_left: Optional[int] = None
    subscription_days_left_in_month: Optional[int] = None
    subscription_total_days_in_month: Optional[int] = None
    expiry_warning: Optional[Dict[str, Any]] = None
    model_config = ConfigDict(from_attributes=True)

class PurchaseSubscriptionRequest(BaseModel):
    plan_name: str
    billing_cycle: str = "monthly"  # "monthly", "quarterly", "annual"
    amount: Optional[float] = None
    features: Optional[str] = "all"
    promo_code: Optional[str] = None
    payment_reference: Optional[str] = None

class PurchaseSubscriptionResponse(BaseModel):
    success: bool
    message: str
    shop: ShopResponse

class InitiateCheckoutRequest(BaseModel):
    plan_name: str = "All-in-One Retail Pro"
    billing_cycle: str = "monthly"
    promo_code: Optional[str] = None

class InitiateCheckoutResponse(BaseModel):
    success: bool
    order_id: str
    plan_name: str
    amount: float
    currency: str = "INR"
    billing_cycle: str = "monthly"
    payment_status: str  # "ready"
    payment_gateway: str  # "standard_upi_card"
    message: str

class CreateOrderRequest(BaseModel):
    plan_name: str = "All-Features Pro"
    billing_cycle: str = "monthly"
    payment_method: Optional[str] = "upi"  # "upi", "card", "netbanking"
    promo_code: Optional[str] = None

class CreateOrderResponse(BaseModel):
    success: bool
    order_id: str
    key_id: str
    amount: float  # In INR
    amount_paise: int  # In paise for Razorpay SDK
    currency: str = "INR"
    plan_name: str
    billing_cycle: str
    is_test_mode: bool = False
    is_configured: bool = True
    payment_method: Optional[str] = "upi"
    message: str
    qr_info: Optional[Dict[str, Any]] = None

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan_name: Optional[str] = "All-Features Pro"
    billing_cycle: Optional[str] = "monthly"

class VerifyPaymentResponse(BaseModel):
    success: bool
    message: str
    payment_id: Optional[str] = None
    order_id: Optional[str] = None
    plan_name: Optional[str] = None
    amount: Optional[float] = None
    currency: str = "INR"
    subscription_start_date: Optional[datetime] = None
    subscription_end_date: Optional[datetime] = None
    shop: Optional[ShopResponse] = None

class PaymentStatusResponse(BaseModel):
    order_id: str
    status: str  # "created", "waiting_for_payment", "pending_verification", "paid", "failed", "cancelled"
    payment_id: Optional[str] = None
    amount: float
    currency: str = "INR"
    plan_name: str
    created_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    is_test_mode: bool = False
    utr_number: Optional[str] = None
    error_reason: Optional[str] = None

class PaymentCancelRequest(BaseModel):
    order_id: str
    reason: Optional[str] = "User cancelled payment"

class SubmitUPIPaymentRequest(BaseModel):
    order_id: str
    utr_number: str
    plan_name: Optional[str] = "All-Features Pro"
    billing_cycle: Optional[str] = "monthly"

class SubmitUPIPaymentResponse(BaseModel):
    success: bool
    status: str
    message: str
    order_id: str
    utr_number: Optional[str] = None
    amount: float
    currency: str = "INR"
    plan_name: str
    subscription_start_date: Optional[datetime] = None
    subscription_end_date: Optional[datetime] = None
    shop: Optional[ShopResponse] = None



# --- Product Schemas ---
class ProductBase(BaseModel):
    name: str
    category: str
    cost_price: float
    selling_price: float
    stock_qty: int
    reorder_level: int = 10
    expiry_date: Optional[date] = None
    shop_id: Optional[int] = None

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    cost_price: Optional[float] = None
    selling_price: Optional[float] = None
    stock_qty: Optional[int] = None
    reorder_level: Optional[int] = None
    expiry_date: Optional[date] = None
    shop_id: Optional[int] = None

class ProductResponse(ProductBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class ProductAutocompleteItem(BaseModel):
    id: int
    name: str
    category: Optional[str] = None
    stock_qty: int = 0
    reorder_level: int = 10
    cost_price: float = 0.0
    selling_price: float = 0.0
    expiry_date: Optional[date] = None
    status: str = "in_stock"
    model_config = ConfigDict(from_attributes=True)


class ProductLocationResponse(BaseModel):
    found: bool
    product_id: int
    page: int = 1
    page_size: int = 10
    total: int = 0
    product: Optional[ProductResponse] = None
    message: Optional[str] = None


# --- Sale Item Schemas ---
class SaleItemBase(BaseModel):
    product_id: int
    qty: int
    unit_price: float
    unit_cost: float

class SaleItemCreate(SaleItemBase):
    pass

class SaleItemResponse(SaleItemBase):
    id: int
    sale_id: int
    model_config = ConfigDict(from_attributes=True)


# --- Sale Schemas ---
class SaleBase(BaseModel):
    date_time: Optional[datetime] = None
    total_amount: float
    total_profit: float
    payment_mode: str = "Cash"
    shop_id: Optional[int] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None

class SaleCreate(SaleBase):
    items: List[SaleItemCreate] = []

class SaleUpdate(BaseModel):
    date_time: Optional[datetime] = None
    total_amount: Optional[float] = None
    total_profit: Optional[float] = None
    payment_mode: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None

class SaleResponse(SaleBase):
    id: int
    items: List[SaleItemResponse] = []
    model_config = ConfigDict(from_attributes=True)


# --- Expense Schemas ---
class ExpenseBase(BaseModel):
    date: date
    category: str
    amount: float
    note: Optional[str] = ""
    shop_id: Optional[int] = None

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseUpdate(BaseModel):
    date: Optional[date] = None
    category: Optional[str] = None
    amount: Optional[float] = None
    note: Optional[str] = None

class ExpenseResponse(ExpenseBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


# --- Paginated Response Schemas ---
class ProductPaginatedResponse(BaseModel):
    items: List[ProductResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

class SalePaginatedResponse(BaseModel):
    items: List[SaleResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

class ExpensePaginatedResponse(BaseModel):
    items: List[ExpenseResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# --- Invoice Extraction Schemas ---
class ExtractedInvoiceItem(BaseModel):
    name: str
    description: Optional[str] = None
    qty: float = 1.0
    quantity: Optional[float] = None
    cost_price: Optional[float] = None
    unit_price: Optional[float] = None
    tax_rate: Optional[float] = None
    tax_percent: Optional[str] = None
    tax_amount: Optional[float] = None
    base_amount: Optional[float] = None
    is_tax_inclusive: bool = False
    expiry_date: Optional[str] = None
    confidence: float = 0.90
    field_confidence: Optional[Dict[str, float]] = None
    needs_review: bool = False
    mrp: Optional[float] = None
    line_total: Optional[float] = None
    amount: Optional[float] = None
    taxable_amount: Optional[float] = None
    page: Optional[int] = 1
    raw_text: Optional[str] = None

class ExtractedInvoiceResponse(BaseModel):
    supplier: Optional[str] = None
    vendor: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_date: Optional[str] = None
    date: Optional[str] = None
    currency: Optional[str] = "INR"
    subtotal: Optional[float] = None
    tax: Optional[float] = None
    total: Optional[float] = None
    total_amount_for_invoice: Optional[float] = None
    invoice_grand_total: Optional[float] = None
    page_count: Optional[int] = 1
    document_type: Optional[str] = "image"
    items: List[ExtractedInvoiceItem] = []
    is_mock: bool = False
    message: Optional[str] = None
    ocr_engine: Optional[str] = None

class ConfirmInvoiceItem(BaseModel):
    name: str
    qty: float = 1.0
    cost_price: Optional[float] = 0.0
    selling_price: Optional[float] = 0.0
    category: Optional[str] = "Grocery"
    expiry_date: Optional[date] = None
    action: str = "create"  # "update" or "create"
    matched_product_id: Optional[int] = None

class ConfirmInvoiceRequest(BaseModel):
    supplier: Optional[str] = None
    vendor: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_date: Optional[str] = None
    date: Optional[str] = None
    currency: Optional[str] = "INR"
    items: List[ConfirmInvoiceItem]


# --- Dashboard KPIs & Today vs Yesterday Schemas ---
class DashboardKpisResponse(BaseModel):
    period: str
    sales: float = 0.0
    previous_sales: float = 0.0
    sales_change_pct: Optional[float] = None
    profit: float = 0.0
    previous_profit: float = 0.0
    profit_change_pct: Optional[float] = None
    transactions: int = 0
    previous_transactions: int = 0
    transactions_change_pct: Optional[float] = None


class DayMetrics(BaseModel):
    sales: float = 0.0
    profit: float = 0.0
    transactions: int = 0
    average_bill: float = 0.0


class DashboardTodayVsYesterdayResponse(BaseModel):
    has_data: bool = False
    today: DayMetrics
    yesterday: DayMetrics
    sales_change_pct: Optional[float] = None
    profit_change_pct: Optional[float] = None
    transactions_change_pct: Optional[float] = None
    average_bill_change_pct: Optional[float] = None
    summary: str = "No sales recorded yet"


# --- Sales Trend Schemas ---
class SalesTrendPoint(BaseModel):
    date: str
    label: str
    sales: float = 0.0
    profit: float = 0.0
    transactions: int = 0


class SalesTrendResponse(BaseModel):
    granularity: str
    has_data: bool = False
    total_sales: float = 0.0
    total_profit: float = 0.0
    points: List[SalesTrendPoint] = []


# --- Category Sales Schemas ---
class TopProductItem(BaseModel):
    product_id: int
    name: str
    sales: float = 0.0
    units_sold: int = 0
    stock_qty: int = 0


class CategorySalesItem(BaseModel):
    category: str
    sales: float = 0.0
    share_pct: float = 0.0
    units_sold: int = 0
    top_products: List[TopProductItem] = []


class CategorySalesResponse(BaseModel):
    period: str
    has_data: bool = False
    total_sales: float = 0.0
    categories: List[CategorySalesItem] = []


# --- Stock Alerts Schemas ---
class AlertItem(BaseModel):
    product_id: int
    name: str
    category: Optional[str] = None
    stock_qty: int
    reorder_level: int
    status: str  # "out_of_stock" or "low_stock"
    is_high_demand: bool = False
    daily_sales_rate: Optional[float] = None
    days_left: Optional[float] = None
    suggested_reorder_qty: int = 10


class AlertsResponse(BaseModel):
    total_products: int = 0
    total_alerts: int = 0
    out_of_stock_count: int = 0
    low_stock_count: int = 0
    high_demand_count: int = 0
    out_of_stock: List[AlertItem] = []
    low_stock: List[AlertItem] = []


# --- Sales Analytics Schemas ---
class SalesAnalyticsPoint(BaseModel):
    period: str
    date: str
    sales: float = 0.0
    profit: float = 0.0
    transactions: int = 0
    average_bill: float = 0.0
    profit_margin_pct: float = 0.0


class HeatmapCell(BaseModel):
    weekday: int  # 0 = Monday .. 6 = Sunday
    hour: int     # 0 .. 23
    count: int = 0
    sales: float = 0.0


class SalesHighlights(BaseModel):
    best_day: Optional[str] = "–"
    best_day_sales: float = 0.0
    slowest_day: Optional[str] = "–"
    slowest_day_sales: float = 0.0
    busiest_hour: Optional[str] = "–"
    busiest_hour_tx: int = 0


class SalesAnalyticsResponse(BaseModel):
    granularity: str
    from_date: str
    to_date: str
    has_data: bool = False
    total_sales: float = 0.0
    total_profit: float = 0.0
    total_transactions: int = 0
    average_bill: float = 0.0
    profit_margin_pct: float = 0.0
    highlights: SalesHighlights
    points: List[SalesAnalyticsPoint] = []
    heatmap: List[HeatmapCell] = []


# --- Product Analytics Schemas ---
class ProductTrendPoint(BaseModel):
    date: str
    units: int = 0


class ProductDemandItem(BaseModel):
    product_id: int
    name: str
    category: Optional[str] = None
    units_sold: int = 0
    sales: float = 0.0
    profit: float = 0.0
    stock_qty: int = 0
    trend: List[ProductTrendPoint] = []


class ProductProfitItem(BaseModel):
    product_id: int
    name: str
    category: Optional[str] = None
    sales: float = 0.0
    cost: float = 0.0
    profit: float = 0.0
    margin_pct: float = 0.0
    units_sold: int = 0
    stock_qty: int = 0
    abc_class: str = "C"  # "A", "B", "C"
    no_sales_30d: bool = False


class ProductRankedItem(BaseModel):
    product_id: int
    name: str
    category: Optional[str] = None
    sales: float = 0.0
    units_sold: int = 0
    stock_qty: int = 0
    no_sales_30d: bool = False
    abc_class: str = "C"


class ProductAnalyticsResponse(BaseModel):
    period: str
    category: str
    has_data: bool = False
    total_products: int = 0
    total_sales: float = 0.0
    total_units: int = 0
    categories_list: List[str] = []
    demand_top: List[ProductDemandItem] = []
    best_selling: List[ProductRankedItem] = []
    slow_selling: List[ProductRankedItem] = []
    profit_table: List[ProductProfitItem] = []


# --- Inventory Analytics Schemas ---
class OutOfStockItem(BaseModel):
    product_id: int
    name: str
    category: Optional[str] = "General"
    cost_price: float = 0.0
    selling_price: float = 0.0
    stock_qty: int = 0
    reorder_level: int = 0
    last_sold_date: Optional[str] = None
    estimated_lost_sales: float = 0.0


class ExpiryItem(BaseModel):
    product_id: int
    name: str
    category: Optional[str] = "General"
    cost_price: float = 0.0
    selling_price: float = 0.0
    stock_qty: int = 0
    expiry_date: str
    days_until_expiry: int
    value_at_risk: float = 0.0


class ExpiryGroup(BaseModel):
    group_key: str  # "expired", "within_7d", "within_30d", "within_90d"
    title: str
    product_count: int = 0
    total_qty: int = 0
    value_at_risk: float = 0.0
    suggestion: Optional[str] = None
    items: List[ExpiryItem] = []


class InventorySummary(BaseModel):
    stock_value_at_cost: float = 0.0
    number_of_products: int = 0
    low_stock_count: int = 0
    inventory_turnover: float = 0.0


class InventoryAnalyticsResponse(BaseModel):
    has_data: bool = False
    summary: InventorySummary
    out_of_stock_list: List[OutOfStockItem] = []
    expiry_groups: List[ExpiryGroup] = []


# --- Profitability Analytics Schemas ---
class MarginTrendPoint(BaseModel):
    period: str
    date: str
    sales: float = 0.0
    cogs: float = 0.0
    gross_profit: float = 0.0
    gross_margin_pct: float = 0.0


class CategoryMarginItem(BaseModel):
    category: str
    sales: float = 0.0
    cogs: float = 0.0
    gross_profit: float = 0.0
    margin_pct: float = 0.0
    share_of_sales_pct: float = 0.0


class LowestMarginProductItem(BaseModel):
    product_id: int
    name: str
    category: Optional[str] = "General"
    sales: float = 0.0
    cogs: float = 0.0
    profit: float = 0.0
    margin_pct: float = 0.0
    units_sold: int = 0


class ExpenseCategoryItem(BaseModel):
    category: str
    amount: float = 0.0
    share_pct: float = 0.0
    count: int = 0


class MonthlyExpenseTrendPoint(BaseModel):
    month: str  # "YYYY-MM"
    label: str  # "Oct 2026"
    amount: float = 0.0
    count: int = 0


class ExpenseEntryItem(BaseModel):
    id: int
    date: str
    category: str
    amount: float = 0.0
    note: Optional[str] = None


class BreakdownStep(BaseModel):
    label: str
    amount: float = 0.0
    type: str  # "revenue" | "cogs" | "gross_profit" | "expenses" | "net_profit"
    percentage: Optional[float] = None
    description: str


class ProfitabilityAnalyticsResponse(BaseModel):
    from_date: str
    to_date: str
    has_data: bool = False
    insight: Optional[str] = None
    overall_gross_margin_pct: float = 0.0
    overall_net_margin_pct: float = 0.0
    total_sales: float = 0.0
    total_cogs: float = 0.0
    gross_profit: float = 0.0
    total_expenses: float = 0.0
    net_profit: float = 0.0
    margin_trend: List[MarginTrendPoint] = []
    margin_by_category: List[CategoryMarginItem] = []
    lowest_margin_products: List[LowestMarginProductItem] = []
    expenses_by_category: List[ExpenseCategoryItem] = []
    expenses_monthly_trend: List[MonthlyExpenseTrendPoint] = []
    expense_entries: List[ExpenseEntryItem] = []
    net_profit_steps: List[BreakdownStep] = []


# --- Upgraded Comprehensive Analytics Dashboard Schemas ---
class SalesPeriodKPI(BaseModel):
    title: str
    period_key: str
    sales: float = 0.0
    transactions: int = 0
    profit: float = 0.0
    prev_sales: float = 0.0
    prev_transactions: int = 0
    prev_profit: float = 0.0
    delta_pct: Optional[float] = None
    comparison_message: str

class AnalyticsKPISet(BaseModel):
    daily: SalesPeriodKPI
    weekly: SalesPeriodKPI
    monthly: SalesPeriodKPI

class TrendChartPoint(BaseModel):
    label: str
    date_or_hour: str
    sales: float = 0.0
    profit: float = 0.0
    transactions: int = 0

class AnalyticsTrends(BaseModel):
    daily_trend: List[TrendChartPoint] = []
    weekly_trend: List[TrendChartPoint] = []
    monthly_trend: List[TrendChartPoint] = []
    sales_vs_profit: List[TrendChartPoint] = []
    transaction_trend: List[TrendChartPoint] = []

class BestSellingItem(BaseModel):
    product_id: int
    name: str
    category: Optional[str] = "General"
    units_sold: int = 0
    revenue: float = 0.0
    profit: float = 0.0
    margin_pct: float = 0.0
    sales_contribution_pct: float = 0.0

class SlowSellingItem(BaseModel):
    product_id: int
    name: str
    category: Optional[str] = "General"
    current_stock: int = 0
    units_sold: int = 0
    last_sale_date: Optional[str] = None
    days_since_last_sale: Optional[int] = None
    estimated_stock_days: Optional[float] = None
    status: str
    recommendation: str

class DemandAnalysisItem(BaseModel):
    product_id: int
    name: str
    category: Optional[str] = "General"
    units_sold: int = 0
    velocity_per_day: float = 0.0
    demand_trend: str
    current_stock: int = 0
    days_stock_remaining: Optional[float] = None
    stockout_warning: bool = False
    suggested_restock_qty: int = 0
    prev_units_sold: int = 0
    velocity_change_pct: Optional[float] = None

class MostProfitableItem(BaseModel):
    product_id: int
    name: str
    category: Optional[str] = "General"
    units_sold: int = 0
    revenue: float = 0.0
    cogs: float = 0.0
    gross_profit: float = 0.0
    gross_margin_pct: float = 0.0
    profit_contribution_pct: float = 0.0

class LowMarginHighSalesItem(BaseModel):
    product_id: int
    name: str
    category: Optional[str] = "General"
    revenue: float = 0.0
    units_sold: int = 0
    gross_margin_pct: float = 0.0
    gross_profit: float = 0.0
    insight: str

class ProductPerformanceRow(BaseModel):
    product_id: int
    name: str
    category: Optional[str] = "General"
    units_sold: int = 0
    sales_revenue: float = 0.0
    gross_profit: float = 0.0
    profit_margin_pct: float = 0.0
    current_stock: int = 0
    demand_trend: str
    sales_status: str

class AnalyticsInsightItem(BaseModel):
    type: str
    title: str
    description: str
    severity: str
    trace: str

class AnalyticsDashboardResponse(BaseModel):
    kpis: AnalyticsKPISet
    period: str
    from_date: str
    to_date: str
    has_data: bool = False
    total_sales: float = 0.0
    total_profit: float = 0.0
    total_transactions: int = 0
    categories_list: List[str] = []
    trends: AnalyticsTrends
    best_selling: List[BestSellingItem] = []
    slow_selling: List[SlowSellingItem] = []
    demand_analysis: List[DemandAnalysisItem] = []
    most_profitable: List[MostProfitableItem] = []
    low_margin_alerts: List[LowMarginHighSalesItem] = []
    comparison_table: List[ProductPerformanceRow] = []
    insights: List[AnalyticsInsightItem] = []



# --- AI Sales Forecast & Demand Forecast Schemas ---
class SalesHistoryPoint(BaseModel):
    date: str
    day_name: str
    actual_sales: float = 0.0


class SalesForecastPoint(BaseModel):
    date: str
    day_name: str
    predicted_sales: float = 0.0
    lower_bound: float = 0.0
    upper_bound: float = 0.0


class SalesForecastResponse(BaseModel):
    has_enough_data: bool = False
    days_of_history: int = 0
    required_days: int = 14
    forecast_days: int = 7
    headline: Optional[str] = None
    expected_sales_total: float = 0.0
    expected_lower_total: float = 0.0
    expected_upper_total: float = 0.0
    model_name: str = "Holt-Winters (Weekly Seasonality)"
    model_accuracy_note: Optional[str] = None
    disclaimer: str = "Forecasts are statistical projections based on past transaction patterns and weekly seasonality. Actual sales may vary due to stockouts, market conditions, or unforeseen events."
    historical_points: List[SalesHistoryPoint] = []
    forecast_points: List[SalesForecastPoint] = []


class ProductDemandItem(BaseModel):
    product_id: int
    name: str
    category: str = "General"
    stock_qty: int = 0
    reorder_level: int = 10
    daily_sales_rate: float = 0.0
    forecast_demand_14d: Optional[float] = None
    days_of_stock_left: Optional[float] = None
    suggested_reorder_qty: int = 0
    reorder_by_date: Optional[str] = None
    risk_level: str = "healthy"  # "critical" | "warning" | "healthy" | "insufficient_data"
    has_enough_history: bool = True
    status_note: Optional[str] = None


class DemandForecastResponse(BaseModel):
    lead_time_days: int = 3
    critical_count: int = 0
    warning_count: int = 0
    total_suggested_items: int = 0
    whatsapp_purchase_list: str = ""
    items: List[ProductDemandItem] = []


class ProductDemandDetailPoint(BaseModel):
    date: str
    day_name: str
    actual: Optional[float] = None
    forecast: Optional[float] = None


class ProductDemandDetailResponse(BaseModel):
    product: ProductDemandItem
    lead_time_days: int = 3
    history_points: List[ProductDemandDetailPoint] = []
    forecast_points: List[ProductDemandDetailPoint] = []
    calculation_summary: dict = {}


# --- AI Product Recommendations Schemas ---
class RecommendationItem(BaseModel):
    id: str
    type: str  # "stock_more" | "bundle" | "discount_clear" | "reconsider" | "price_check"
    type_label: str
    title: str
    product_id: Optional[int] = None
    product_name: Optional[str] = None
    secondary_product_id: Optional[int] = None
    secondary_product_name: Optional[str] = None
    category: Optional[str] = None
    reason: str
    action: str
    action_type: str = "general"
    numbers: dict = {}
    template_explanations: dict = {}


class RecommendationsChecklist(BaseModel):
    has_products: bool = False
    product_count: int = 0
    required_products: int = 5
    has_sales_history: bool = False
    sales_days: int = 0
    required_sales_days: int = 7
    has_cost_margins: bool = False


class RecommendationsSummary(BaseModel):
    total: int = 0
    stock_more: int = 0
    bundle: int = 0
    discount_clear: int = 0
    reconsider: int = 0
    price_check: int = 0


class RecommendationsResponse(BaseModel):
    has_enough_data: bool = False
    checklist: RecommendationsChecklist
    summary: RecommendationsSummary
    recommendations: List[RecommendationItem] = []


class ExplainRecommendationRequest(BaseModel):
    rec_id: str
    title: str
    reason: str
    action: str
    language: str = "en"  # "en" | "hi" | "mr"
    rec_type: Optional[str] = None
    product_name: Optional[str] = None
    numbers: Optional[dict] = None


class ExplainRecommendationResponse(BaseModel):
    explanation: str
    language: str
    is_llm: bool = False


# --- Admin Portal Schemas ---
class AdminOverviewStat(BaseModel):
    new_registrations: int = 0
    registrations_change_pct: Optional[float] = None
    active_trials: int = 0
    trials_ending_soon: int = 0
    paid_businesses: int = 0
    paid_change_count: int = 0
    conversion_rate: float = 0.0
    conversion_rate_change_pct: Optional[float] = None
    monthly_revenue: float = 0.0
    revenue_change_pct: Optional[float] = None


class AdminChartPoint(BaseModel):
    period: str
    date: str
    registrations: int = 0
    paid_converted: int = 0
    conversion_pct: float = 0.0


class FunnelStep(BaseModel):
    step_number: int
    title: str
    count: int = 0
    pct: float = 0.0
    drop_pct: Optional[float] = None


class RecentConversionItem(BaseModel):
    id: int
    business_name: str
    owner_name: str
    city: str
    state: str
    plan: str
    amount: float = 0.0
    payment_method: str = "UPI Autopay"
    date: str
    status: str = "Paid"


class AdminOverviewResponse(BaseModel):
    has_data: bool = False
    stats: AdminOverviewStat
    trend_points: List[AdminChartPoint] = []
    funnel: List[FunnelStep] = []
    recent_conversions: List[RecentConversionItem] = []


class AdminBusinessItem(BaseModel):
    id: int
    code: Optional[str] = ""
    name: Optional[str] = "Unnamed Business"
    owner_name: Optional[str] = "Shop Owner"
    phone: Optional[str] = ""
    email: Optional[str] = None
    city: Optional[str] = "Pune"
    state: Optional[str] = "MH"
    category: Optional[str] = "Grocery & Kirana"
    status: Optional[str] = "trial"  # "trial" | "active" | "expired"
    plan_name: Optional[str] = "Free Trial"
    trial_end_date: Optional[str] = None
    last_active: Optional[str] = None
    products_count: int = 0
    sales_count: int = 0



class AdminBusinessesResponse(BaseModel):
    total_count: int = 0
    trial_count: int = 0
    active_count: int = 0
    expired_count: int = 0
    page: int = 1
    page_size: int = 10
    total_pages: int = 1
    items: List[AdminBusinessItem] = []


class AdminBulkActionRequest(BaseModel):
    action: str  # "extend_trial" | "suspend" | "activate"
    shop_ids: List[int]
    days: Optional[int] = 7


# --- Business Detail Schemas ---
class AuditLogItem(BaseModel):
    id: int
    shop_id: Optional[int] = None
    admin_email: str
    action: str
    details: Optional[str] = None
    created_at: str


class BusinessDetailStats(BaseModel):
    catalogue_size: int = 0
    monthly_sales_reported: float = 0.0
    invoices_scanned: int = 0
    staff_users: int = 1


class OnboardingStepInfo(BaseModel):
    step_number: int
    title: str
    description: str
    data: Dict[str, Any]


class TrialInfo(BaseModel):
    status: str
    trial_start_date: Optional[str] = None
    trial_end_date: Optional[str] = None
    trial_days_left: int = 0
    hours_remaining: int = 0
    is_paid: bool = False
    plan_name: str = "Free Trial"


class BusinessPaymentItem(BaseModel):
    id: str
    plan_name: str
    amount: float
    status: str
    invoice_number: str
    date: str
    payment_method: str


class BusinessUsageTelemetry(BaseModel):
    products_count: int = 0
    sales_count: int = 0
    total_sales_volume: float = 0.0
    invoices_count: int = 0
    last_active: Optional[str] = None


class BusinessDetailResponse(BaseModel):
    shop: AdminBusinessItem
    stats: BusinessDetailStats
    onboarding_steps: List[OnboardingStepInfo]
    trial_info: TrialInfo
    admin_notes: Optional[str] = None
    audit_logs: List[AuditLogItem] = []
    payments: List[BusinessPaymentItem] = []
    usage: BusinessUsageTelemetry


class ExtendTrialRequest(BaseModel):
    days: int = 7
    reason: Optional[str] = None


class UpdateNoteRequest(BaseModel):
    note: str


# --- Plans & Pricing Schemas ---
class ModularFeatureItem(BaseModel):
    id: str
    name: str
    slug: str
    description: str
    monthly_price: float
    quarterly_price: float
    active_subscribers: int = 0
    enabled: bool = True


class BundlePricingItem(BaseModel):
    monthly_price: float
    quarterly_price: float
    annual_price: float
    active_subscribers: int = 0


class PlansResponse(BaseModel):
    default_trial_days: int = 5
    modular_features: List[ModularFeatureItem]
    bundle: BundlePricingItem
    total_subscribers: int = 0


class SavePlansRequest(BaseModel):
    default_trial_days: int
    modular_features: List[ModularFeatureItem]
    bundle: BundlePricingItem


# --- Promo Codes Schemas ---
class PromoCodeItem(BaseModel):
    id: int
    code: str
    discount_type: str  # "percentage" or "fixed"
    discount_value: float
    validity: Optional[str] = None
    max_uses: int = 100
    used_count: int = 0
    active: bool = True
    created_at: str


class CreatePromoCodeRequest(BaseModel):
    code: str
    discount_type: str = "percentage"
    discount_value: float
    validity: Optional[str] = None
    max_uses: Optional[int] = 100
    active: Optional[bool] = True


class UpdatePromoCodeRequest(BaseModel):
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    validity: Optional[str] = None
    max_uses: Optional[int] = None
    active: Optional[bool] = None


# --- Invoices & Purchases Schemas ---
class InvoiceItemDetail(BaseModel):
    name: str
    qty: float = 1.0
    cost_price: Optional[float] = 0.0
    selling_price: Optional[float] = 0.0
    category: Optional[str] = "Grocery"
    expiry_date: Optional[str] = None
    tax_rate: Optional[float] = None
    tax_amount: Optional[float] = None
    line_total: Optional[float] = None
    action: Optional[str] = "create"


class InvoiceResponse(BaseModel):
    id: int
    shop_id: Optional[int] = None
    invoice_number: Optional[str] = None
    supplier_name: Optional[str] = None
    invoice_date: Optional[str] = None
    created_at: Optional[str] = None
    currency: Optional[str] = "INR"
    subtotal: Optional[float] = None
    tax_amount: Optional[float] = None
    total_amount: Optional[float] = None
    ocr_engine: Optional[str] = None
    status: Optional[str] = "confirmed"
    items_count: int = 0
    model_config = ConfigDict(from_attributes=True)


class InvoiceDetailResponse(InvoiceResponse):
    items: List[InvoiceItemDetail] = []


class CustomerSummaryResponse(BaseModel):
    customer_name: str
    customer_phone: Optional[str] = None
    total_spent: float = 0.0
    total_profit: float = 0.0
    visit_count: int = 0
    last_visit: Optional[str] = None


# --- Support & Feedback Schemas ---
class CreateTicketRequest(BaseModel):
    subject: str
    category: str
    description: str
    priority: Optional[str] = "Normal"
    attachment_name: Optional[str] = None
    attachment_data: Optional[str] = None

class CreateMessageRequest(BaseModel):
    message: str
    attachment_name: Optional[str] = None
    attachment_data: Optional[str] = None
    status: Optional[str] = None

class TicketMessageResponse(BaseModel):
    id: int
    ticket_id: int
    sender_id: Optional[int] = None
    sender_role: str
    sender_name: str
    message: str
    attachment_name: Optional[str] = None
    attachment_data: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class SupportTicketResponse(BaseModel):
    id: int
    ticket_number: str
    shop_id: int
    store_name: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    subject: str
    category: str
    description: str
    priority: str
    status: str
    assigned_admin: Optional[str] = None
    attachment_name: Optional[str] = None
    has_customer_unread: bool = False
    has_admin_unread: bool = False
    created_at: datetime
    updated_at: datetime
    messages_count: Optional[int] = 0
    latest_reply_by: Optional[str] = None
    latest_reply_at: Optional[datetime] = None
    messages: Optional[List[TicketMessageResponse]] = None
    model_config = ConfigDict(from_attributes=True)

class AdminUpdateTicketRequest(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_admin: Optional[str] = None

class CreateFeedbackRequest(BaseModel):
    category: str
    rating: int = 5
    subject: Optional[str] = None
    comments: str

class CustomerFeedbackResponse(BaseModel):
    id: int
    shop_id: int
    store_name: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    category: str
    rating: int
    subject: Optional[str] = None
    comments: str
    status: str
    admin_notes: Optional[str] = None
    converted_ticket_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class AdminUpdateFeedbackRequest(BaseModel):
    status: Optional[str] = None
    admin_notes: Optional[str] = None

class SupportOverviewResponse(BaseModel):
    total_tickets: int
    open_tickets: int
    in_progress_tickets: int
    waiting_for_customer_tickets: int
    resolved_tickets: int
    closed_tickets: int
    unanswered_tickets: int
    total_feedback: int
    average_rating: float

# --- Payments & Payouts Module Schemas ---

class PaymentTransactionItem(BaseModel):
    id: int
    transaction_ref: str
    shop_id: Optional[int] = None
    shop_name: Optional[str] = "Unknown Store"
    owner_name: Optional[str] = "Store Owner"
    plan_name: str
    billing_cycle: str
    amount: float  # INR float converted from amount_paise
    currency: str = "INR"
    status: str
    payment_method: str
    gateway: str
    gateway_payment_id: Optional[str] = None
    gateway_order_id: Optional[str] = None
    gateway_fee: float
    gateway_tax: float
    net_settlement: float
    settlement_status: str
    settlement_id: Optional[str] = None
    refunded_amount: float
    failure_code: Optional[str] = None
    failure_reason: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    created_at: str
    invoice_number: Optional[str] = None

class PaymentTransactionsListResponse(BaseModel):
    total_count: int
    page: int
    page_size: int
    total_pages: int
    items: List[PaymentTransactionItem]

class PaymentOverviewResponse(BaseModel):
    date_range: str
    gross_amount: float
    successful_amount: float
    failed_amount: float
    pending_amount: float
    refunds_amount: float
    gateway_fees_amount: float
    net_settlement_amount: float
    awaiting_settlement_amount: float
    total_transactions_count: int
    successful_count: int
    failed_count: int
    pending_count: int
    refunds_count: int
    payment_methods_breakdown: List[Dict[str, Any]]
    gateways_breakdown: List[Dict[str, Any]]
    settlement_status_breakdown: List[Dict[str, Any]]
    daily_trends: List[Dict[str, Any]]
    recent_transactions: List[PaymentTransactionItem]
    discrepancy_count: int
    failed_alerts: List[Dict[str, Any]]

class RefundRequest(BaseModel):
    amount: float
    reason: str = "customer_request"
    admin_notes: Optional[str] = None

class RefundItem(BaseModel):
    id: int
    refund_ref: str
    transaction_id: int
    transaction_ref: str
    shop_id: Optional[int] = None
    shop_name: str
    amount: float
    reason: str
    status: str
    gateway_refund_id: Optional[str] = None
    requested_by_admin: Optional[str] = None
    admin_notes: Optional[str] = None
    created_at: str
    processed_at: Optional[str] = None

class SettlementBatchItem(BaseModel):
    id: int
    batch_reference: str
    gateway: str
    provider_settlement_id: Optional[str] = None
    total_gross: float
    total_fee: float
    total_tax: float
    total_net: float
    entry_count: int
    matched_count: int
    unmatched_count: int
    discrepant_count: int
    status: str
    file_name: Optional[str] = None
    uploaded_by: Optional[str] = None
    uploaded_at: str
    reconciled_at: Optional[str] = None

class SettlementEntryItem(BaseModel):
    id: int
    batch_id: int
    transaction_id: Optional[int] = None
    transaction_ref: Optional[str] = None
    provider_payment_id: str
    provider_arn_utr: Optional[str] = None
    gross_amount: float
    fee_amount: float
    tax_amount: float
    net_amount: float
    settlement_date: Optional[str] = None
    status: str
    discrepancy_reason: Optional[str] = None
    resolution_notes: Optional[str] = None
    resolved_by: Optional[str] = None
    resolved_at: Optional[str] = None

class SettlementDetailResponse(BaseModel):
    batch: SettlementBatchItem
    entries: List[SettlementEntryItem]

class TaxInvoiceItem(BaseModel):
    id: int
    invoice_number: str
    transaction_id: Optional[int] = None
    transaction_ref: Optional[str] = None
    shop_id: Optional[int] = None
    shop_name: str
    customer_owner_name: Optional[str] = None
    customer_gstin: Optional[str] = None
    customer_state: str
    place_of_supply: str
    invoice_date: str
    supplier_legal_name: str
    supplier_gstin: str
    supplier_address: str
    sac_code: str
    description_of_service: str
    taxable_amount: float
    is_interstate: bool
    cgst_rate: float
    cgst_amount: float
    sgst_rate: float
    sgst_amount: float
    igst_rate: float
    igst_amount: float
    total_invoice_amount: float
    status: str
    created_at: str

class ResolveDiscrepancyRequest(BaseModel):
    resolution_notes: str
    mark_as: str = "resolved"  # "resolved" or "waived"

class GatewayConfigStatusResponse(BaseModel):
    gateway_name: str
    is_live_configured: bool
    key_id_preview: str
    webhook_configured: bool
    environment: str
    supported_methods: List[str]
    currency: str
    supplier_gstin: str
    supplier_state: str
    webhook_endpoint_url: str


# ==============================================================================
# OPERATIONS & PLATFORM ANALYTICS SCHEMAS
# ==============================================================================

class MetricDefinition(BaseModel):
    label: str
    definition: str
    calculation: str
    distinction_note: Optional[str] = None


class DateRangeInfo(BaseModel):
    preset: str
    start_date: str
    end_date: str
    days: int


class PlatformKPISummary(BaseModel):
    total_registered_businesses: int = 0
    active_businesses: int = 0
    new_registrations: int = 0
    inactive_businesses: int = 0
    active_subscriptions: int = 0
    trial_businesses: int = 0
    platform_sales_volume: float = 0.0
    total_recorded_orders: int = 0
    average_order_value: float = 0.0
    storebi_saas_revenue: float = 0.0


class PlatformGrowthPoint(BaseModel):
    date: str
    label: str
    new_registrations: int = 0
    active_businesses: int = 0
    orders_count: int = 0
    sales_volume: float = 0.0
    saas_revenue: float = 0.0


class CategoryDistributionItem(BaseModel):
    category: str
    count: int = 0
    percentage: float = 0.0
    active_count: int = 0
    total_sales: float = 0.0


class BusinessStatusDistributionItem(BaseModel):
    status: str
    count: int = 0
    percentage: float = 0.0


class OperationsOverviewResponse(BaseModel):
    date_range: DateRangeInfo
    kpis: PlatformKPISummary
    growth_trend: List[PlatformGrowthPoint] = []
    category_distribution: List[CategoryDistributionItem] = []
    status_distribution: List[BusinessStatusDistributionItem] = []
    metric_definitions: List[MetricDefinition] = []


class GeographicStateItem(BaseModel):
    state: str
    business_count: int = 0
    active_count: int = 0
    orders_count: int = 0
    total_sales: float = 0.0
    adoption_level: str = "nascent"
    top_categories: List[str] = []


class GeographicCityItem(BaseModel):
    city: str
    state: str
    business_count: int = 0
    active_count: int = 0
    orders_count: int = 0
    total_sales: float = 0.0
    dominant_category: str = "General"


class GeographicAnalyticsResponse(BaseModel):
    states: List[GeographicStateItem] = []
    cities: List[GeographicCityItem] = []
    category_by_region: List[Dict[str, Any]] = []
    top_adoption_regions: List[str] = []
    low_adoption_regions: List[str] = []
    unspecified_location_count: int = 0


class CohortItem(BaseModel):
    cohort_label: str
    cohort_size: int = 0
    day_1_active: int = 0
    day_1_pct: float = 0.0
    day_7_active: int = 0
    day_7_pct: float = 0.0
    day_30_active: int = 0
    day_30_pct: float = 0.0
    day_90_active: int = 0
    day_90_pct: float = 0.0
    current_active: int = 0
    current_active_pct: float = 0.0


class InactiveBusinessItem(BaseModel):
    shop_id: int
    name: str
    owner_name: str
    phone: str
    city: str
    state: str
    category: str
    registered_at: str
    last_active_at: Optional[str] = None
    days_inactive: int = 0
    has_any_activity: bool = False
    inactivity_status: str = "confirmed_inactive"


class CohortRetentionResponse(BaseModel):
    cohorts: List[CohortItem] = []
    inactive_businesses: List[InactiveBusinessItem] = []
    activity_definition: str
    total_tracked: int = 0
    overall_retention_30d: float = 0.0


class SalesGmvResponse(BaseModel):
    total_sales_gmv: float = 0.0
    completed_orders: int = 0
    average_order_value: float = 0.0
    storebi_saas_revenue: float = 0.0
    sales_trend: List[PlatformGrowthPoint] = []
    payment_modes: List[Dict[str, Any]] = []
    product_categories: List[Dict[str, Any]] = []
    top_stores: List[Dict[str, Any]] = []
    regional_sales: List[Dict[str, Any]] = []
    gmv_vs_revenue_note: str


class CategoryBenchmarkItem(BaseModel):
    category: str
    sample_size: int = 0
    sample_size_status: str = "sufficient"
    avg_sales: float = 0.0
    median_sales: float = 0.0
    avg_orders: float = 0.0
    avg_order_value: float = 0.0
    total_inventory_value: float = 0.0
    avg_products_count: float = 0.0
    low_stock_frequency_pct: float = 0.0
    inventory_turnover_proxy: float = 0.0
    active_retention_pct: float = 0.0


class CategoryBenchmarkingResponse(BaseModel):
    categories: List[CategoryBenchmarkItem] = []
    privacy_statement: str


class ReportColumn(BaseModel):
    key: str
    label: str
    align: Optional[str] = "left"


class ReportBuilderResponse(BaseModel):
    report_type: str
    title: str
    total_rows: int = 0
    columns: List[ReportColumn] = []
    rows: List[Dict[str, Any]] = []
    summary: Dict[str, Any] = {}
    page: int = 1
    page_size: int = 25
    total_pages: int = 1


class ScheduledReportCreateRequest(BaseModel):
    name: str
    report_type: str
    frequency: str = "weekly"
    filters: Dict[str, Any] = {}
    recipients: str
    format: str = "csv"


class ScheduledReportUpdateRequest(BaseModel):
    name: Optional[str] = None
    frequency: Optional[str] = None
    recipients: Optional[str] = None
    format: Optional[str] = None
    status: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None


class ScheduledReportItem(BaseModel):
    id: int
    name: str
    report_type: str
    frequency: str
    filters_json: str
    recipients: str
    format: str
    status: str
    last_run_at: Optional[str] = None
    next_run_at: Optional[str] = None
    last_status: str
    last_error: Optional[str] = None
    created_at: str


class ReportExecutionLogItem(BaseModel):
    id: int
    schedule_id: Optional[int] = None
    report_name: str
    report_type: str
    frequency: str
    recipients: str
    format: str
    status: str
    error_message: Optional[str] = None
    duration_ms: int = 0
    delivered_via: str = "dev_console"
    executed_at: str


class OperationalAlertItem(BaseModel):
    id: str
    alert_type: str
    severity: str
    title: str
    description: str
    metric_value: str
    threshold: str
    affected_count: int = 0
    recommended_action: str
    created_at: str


class OperationalAlertsResponse(BaseModel):
    critical_count: int = 0
    warning_count: int = 0
    info_count: int = 0
    alerts: List[OperationalAlertItem] = []


# ==============================================================
# Subscription Requests & Lifecycle Schemas
# ==============================================================

class SubscriptionRequestCreate(BaseModel):
    plan_name: str = "All-Features Pro"
    amount: float = 1299.0
    utr_number: Optional[str] = None
    customer_notes: Optional[str] = None


class SubscriptionRequestItem(BaseModel):
    id: int
    request_ref: str
    shop_id: int
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    store_name: Optional[str] = None
    plan_name: str = "All-Features Pro"
    amount: float = 1299.0
    currency: str = "INR"
    payment_method: str = "upi_qr"
    utr_number: Optional[str] = None
    customer_notes: Optional[str] = None
    status: str = "pending_review"  # "pending_review", "approved", "rejected"
    submitted_at: str
    reviewed_at: Optional[str] = None
    reviewed_by_admin: Optional[str] = None
    rejection_reason: Optional[str] = None
    admin_notes: Optional[str] = None
    payment_reference: Optional[str] = None
    current_subscription_status: Optional[str] = None
    trial_days_left: Optional[int] = 0
    subscription_days_left: Optional[int] = 0


class AdminApproveSubscriptionRequest(BaseModel):
    payment_reference: Optional[str] = None
    admin_notes: Optional[str] = None
    confirm_verified: bool = True


class AdminRejectSubscriptionRequest(BaseModel):
    rejection_reason: str
    admin_notes: Optional[str] = None


class CustomerSubscriptionStatusResponse(BaseModel):
    state: str  # "Trial Active" | "Trial Expired" | "Payment Pending Review" | "Pro Active" | "Subscription Expired" | "Payment Rejected"
    plan_name: str
    is_paid: bool
    is_admin: bool
    trial_start_date: Optional[str] = None
    trial_end_date: Optional[str] = None
    trial_days_left: int = 0
    subscription_start_date: Optional[str] = None
    subscription_end_date: Optional[str] = None
    subscription_days_left: int = 0
    days_remaining: int = 0
    message: str
    can_access_features: bool = False
    latest_request: Optional[dict] = None
    subscription_history: Optional[List[dict]] = []
    expiry_warning: Optional[Dict[str, Any]] = None


class InAppNotificationItem(BaseModel):
    id: int
    title: str
    message: str
    type: str = "info"
    is_read: bool = False
    link: Optional[str] = None
    created_at: str










