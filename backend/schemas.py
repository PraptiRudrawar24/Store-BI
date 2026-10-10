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

# --- Shop Schemas ---
class ShopBase(BaseModel):
    name: Optional[str] = None
    owner_name: Optional[str] = None
    phone: str
    email: Optional[str] = None
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
    model_config = ConfigDict(from_attributes=True)


# --- Product Schemas ---
class ProductBase(BaseModel):
    name: str
    category: str
    cost_price: float
    selling_price: float
    stock_qty: int
    reorder_level: int = 10
    expiry_date: Optional[date] = None

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

class ProductResponse(ProductBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


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

class SaleCreate(SaleBase):
    items: List[SaleItemCreate] = []

class SaleUpdate(BaseModel):
    date_time: Optional[datetime] = None
    total_amount: Optional[float] = None
    total_profit: Optional[float] = None
    payment_mode: Optional[str] = None

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
    qty: int = 1
    cost_price: Optional[float] = None
    expiry_date: Optional[str] = None
    confidence: float = 0.9
    mrp: Optional[float] = None
    line_total: Optional[float] = None

class ExtractedInvoiceResponse(BaseModel):
    supplier: Optional[str] = None
    invoice_date: Optional[str] = None
    items: List[ExtractedInvoiceItem] = []
    is_mock: bool = False
    message: Optional[str] = None
    ocr_engine: Optional[str] = None

class ConfirmInvoiceItem(BaseModel):
    name: str
    qty: int = 1
    cost_price: Optional[float] = 0.0
    selling_price: Optional[float] = 0.0
    category: Optional[str] = "Grocery"
    expiry_date: Optional[date] = None
    action: str = "create"  # "update" or "create"
    matched_product_id: Optional[int] = None

class ConfirmInvoiceRequest(BaseModel):
    supplier: Optional[str] = None
    invoice_date: Optional[str] = None
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
    code: str
    name: str
    owner_name: str
    phone: str
    email: Optional[str] = None
    city: str
    state: str
    category: str
    status: str  # "trial" | "active" | "expired"
    plan_name: str
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







