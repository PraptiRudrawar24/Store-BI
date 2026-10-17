/**
 * ==============================================================================
 * STORE BI - API CLIENT & DUAL-TRANSPORT AUTH INTERCEPTOR (client.ts)
 * ==============================================================================
 * Purpose & Reason for this code:
 * 1. Serves as the centralized HTTP gateway communicating between the React/TypeScript
 *    frontend and the FastAPI Python backend.
 * 2. Implements a resilient Dual-Transport Authentication Pattern:
 *    - Transport 1: httpOnly session cookies (`storebi_session`) sent automatically via `credentials: 'include'`.
 *    - Transport 2: JWT `Authorization: Bearer <token>` stored in localStorage as a bulletproof fallback.
 * 3. Patches the browser's global `window.fetch` via an interceptor to guarantee that EVERY
 *    outgoing API request automatically carries authentication headers and credentials.
 * 4. Provides strongly typed API methods for all retail operations:
 *    - Auth & Onboarding (sendOTP, verifyOTP, saveOnboardingStep, getMe)
 *    - Products & Inventory CRUD
 *    - POS Billing & Counter Sales
 *    - AI Multimodal Invoice OCR & Extraction
 *    - Analytics, Forecasters & Recommendations
 *    - Super Admin Platform Controls
 * ==============================================================================
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Retrieves the stored JWT token from localStorage.
 */
export function getAuthToken(): string | null {
  try {
    return localStorage.getItem('storebi_token');
  } catch {
    return null;
  }
}

/**
 * Persists the active session token into localStorage upon login.
 */
export function setAuthToken(token: string) {
  try {
    localStorage.setItem('storebi_token', token);
  } catch {
    // ignore
  }
}

/**
 * Removes the session token upon user logout.
 */
export function removeAuthToken() {
  try {
    localStorage.removeItem('storebi_token');
  } catch {
    // ignore
  }
}

/**
 * Global fetch interceptor to guarantee Authorization Bearer token & credentials on all requests.
 * Rationale: Ensures seamless multi-tab authentication persistence and prevents 401 Unauthorized errors.
 */
if (typeof window !== 'undefined' && window.fetch) {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const token = getAuthToken();
    const initObj: RequestInit = init ? { ...init } : {};
    initObj.credentials = 'include';

    if (token) {
      const headers = new Headers(initObj.headers || {});
      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      initObj.headers = headers;
    }
    return originalFetch(input, initObj);
  };
}

export interface Shop {
  id: number;
  name?: string | null;
  owner_name?: string | null;
  phone: string;
  email?: string | null;
  category?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  gstin?: string | null;
  language: string;
  approx_products?: string | null;
  monthly_turnover?: string | null;
  current_tracking_method?: string | null;
  sells_expiring_goods: boolean;
  challenges?: string | null;
  trial_start_date?: string | null;
  trial_end_date?: string | null;
  trial_days_left?: number;
  onboarding_completed: boolean;
  onboarding_step: number;
  is_admin?: boolean;
  is_paid?: boolean;
  plan_name?: string | null;
  subscription_amount?: number;
  subscription_days_left_in_month?: number;
  subscription_total_days_in_month?: number;
  subscription_start_date?: string | null;
  subscription_end_date?: string | null;
  last_active_at?: string | null;
  status?: string | null;
  created_at?: string | null;
}

export interface PurchaseSubscriptionPayload {
  plan_name: string;
  billing_cycle?: 'monthly' | 'quarterly' | 'annual';
  amount?: number;
  features?: string;
  promo_code?: string;
  payment_reference?: string;
}

export interface InitiateCheckoutPayload {
  plan_name?: string;
  billing_cycle?: string;
  promo_code?: string;
}

export interface InitiateCheckoutResponse {
  success: boolean;
  order_id: string;
  plan_name: string;
  amount: number;
  currency: string;
  billing_cycle: string;
  payment_status: string;
  payment_gateway: string;
  message: string;
}

export interface PurchaseSubscriptionResponse {
  success: boolean;
  message: string;
  shop: Shop;
}

export interface CreateSubscriptionOrderPayload {
  plan_name?: string;
  billing_cycle?: string;
  payment_method?: 'upi' | 'card' | 'netbanking' | string;
  promo_code?: string;
}

export interface CreateSubscriptionOrderResponse {
  success: boolean;
  order_id: string;
  key_id: string;
  amount: number;
  amount_paise: number;
  currency: string;
  plan_name: string;
  billing_cycle: string;
  is_test_mode: boolean;
  is_configured: boolean;
  payment_method?: string;
  message: string;
  qr_info?: {
    image_url: string;
    api_image_url: string;
    vpa: string;
    payee_name: string;
    amount: number;
    amount_formatted: string;
    currency: string;
    plan_name: string;
    billing_period: string;
    upi_intent_uri: string;
    instructions: string;
  };
}

export interface VerifySubscriptionPaymentPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  plan_name?: string;
  billing_cycle?: string;
}

export interface VerifySubscriptionPaymentResponse {
  success: boolean;
  message: string;
  payment_id?: string;
  order_id?: string;
  plan_name?: string;
  amount?: number;
  currency?: string;
  subscription_start_date?: string;
  subscription_end_date?: string;
  shop?: Shop;
}

export interface SubmitUPIPaymentPayload {
  order_id: string;
  utr_number: string;
  plan_name?: string;
  billing_cycle?: string;
}

export interface SubmitUPIPaymentResponse {
  success: boolean;
  status: string;
  message: string;
  order_id: string;
  utr_number?: string;
  amount: number;
  currency: string;
  plan_name: string;
  subscription_start_date?: string;
  subscription_end_date?: string;
  shop?: Shop;
}

export interface SubscriptionPaymentStatusResponse {
  order_id: string;
  status: 'created' | 'waiting_for_payment' | 'pending_verification' | 'paid' | 'failed' | 'cancelled' | string;
  payment_id?: string;
  amount: number;
  currency: string;
  plan_name: string;
  created_at?: string;
  paid_at?: string;
  is_test_mode?: boolean;
  utr_number?: string;
  error_reason?: string;
}


export interface Product {
  id: number;
  name: string;
  category: string;
  cost_price: number;
  selling_price: number;
  stock_qty: number;
  reorder_level: number;
  expiry_date?: string | null;
}

export interface SaleItem {
  id?: number;
  sale_id?: number;
  product_id: number;
  qty: number;
  unit_price: number;
  unit_cost: number;
}

export interface Sale {
  id: number;
  date_time: string;
  total_amount: number;
  total_profit: number;
  payment_mode: string;
  customer_name?: string;
  customer_phone?: string;
  items?: SaleItem[];
}

export interface Expense {
  id: number;
  date: string;
  category: string;
  amount: number;
  note?: string;
}

export interface AnalyticsSummary {
  total_revenue: number;
  total_profit: number;
  total_expenses: number;
  net_income: number;
  total_sales_count: number;
  total_products_count: number;
  low_stock_count: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface UploadCounts {
  products: number;
  sales: number;
  expenses: number;
  invoices?: number;
  total: number;
}

export interface InvoiceItemDetail {
  name: string;
  qty: number;
  cost_price: number;
  selling_price: number;
  category?: string | null;
  expiry_date?: string | null;
  action?: string;
  matched_product_id?: number | null;
}

export interface InvoiceRecord {
  id: number;
  invoice_number?: string | null;
  supplier_name?: string | null;
  invoice_date?: string | null;
  total_amount: number;
  tax_amount: number;
  items_count: number;
  notes?: string | null;
  created_at?: string | null;
  shop_id?: number | null;
}

export interface InvoiceDetailResponse extends InvoiceRecord {
  items: InvoiceItemDetail[];
}

export interface CustomerSummary {
  customer_name: string;
  customer_phone?: string | null;
  total_spent: number;
  total_orders: number;
  last_purchase_date?: string | null;
}

export interface ProductAutocompleteItem {
  id: number;
  name: string;
  category?: string | null;
  stock_qty: number;
  reorder_level: number;
  cost_price: number;
  selling_price: number;
  expiry_date?: string | null;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
}

export interface ProductLocationResponse {
  found: boolean;
  product_id: number;
  page: number;
  page_size: number;
  total: number;
  product?: Product | null;
  message?: string | null;
}

export interface DashboardKpisResponse {
  period: string;
  sales: number;
  previous_sales: number;
  sales_change_pct: number | null;
  profit: number;
  previous_profit: number;
  profit_change_pct: number | null;
  transactions: number;
  previous_transactions: number;
  transactions_change_pct: number | null;
}

export interface DayMetrics {
  sales: number;
  profit: number;
  transactions: number;
  average_bill: number;
}

export interface DashboardTodayVsYesterdayResponse {
  has_data: boolean;
  today: DayMetrics;
  yesterday: DayMetrics;
  sales_change_pct: number | null;
  profit_change_pct: number | null;
  transactions_change_pct: number | null;
  average_bill_change_pct: number | null;
  summary: string;
}

export interface SalesTrendPoint {
  date: string;
  label: string;
  sales: number;
  profit: number;
  transactions: number;
}

export interface SalesTrendResponse {
  granularity: string;
  has_data: boolean;
  total_sales: number;
  total_profit: number;
  points: SalesTrendPoint[];
}

export interface TopProductItem {
  product_id: number;
  name: string;
  sales: number;
  units_sold: number;
  stock_qty: number;
}

export interface CategorySalesItem {
  category: string;
  sales: number;
  share_pct: number;
  units_sold: number;
  top_products: TopProductItem[];
}

export interface CategorySalesResponse {
  period: string;
  has_data: boolean;
  total_sales: number;
  categories: CategorySalesItem[];
}

export interface AlertItem {
  product_id: number;
  name: string;
  category?: string | null;
  stock_qty: number;
  reorder_level: number;
  status: 'out_of_stock' | 'low_stock';
  is_high_demand: boolean;
  daily_sales_rate?: number | null;
  days_left?: number | null;
  suggested_reorder_qty: number;
}

export interface AlertsResponse {
  total_products: number;
  total_alerts: number;
  out_of_stock_count: number;
  low_stock_count: number;
  high_demand_count: number;
  out_of_stock: AlertItem[];
  low_stock: AlertItem[];
}

// --- Sales Analytics Interfaces ---
export interface SalesAnalyticsPoint {
  period: string;
  date: string;
  sales: number;
  profit: number;
  transactions: number;
  average_bill: number;
  profit_margin_pct: number;
}

export interface HeatmapCell {
  weekday: number;
  hour: number;
  count: number;
  sales: number;
}

export interface SalesHighlights {
  best_day: string;
  best_day_sales: number;
  slowest_day: string;
  slowest_day_sales: number;
  busiest_hour: string;
  busiest_hour_tx: number;
}

export interface SalesAnalyticsResponse {
  granularity: string;
  from_date: string;
  to_date: string;
  has_data: boolean;
  total_sales: number;
  total_profit: number;
  total_transactions: number;
  average_bill: number;
  profit_margin_pct: number;
  highlights: SalesHighlights;
  points: SalesAnalyticsPoint[];
  heatmap: HeatmapCell[];
}

// --- Product Analytics Interfaces ---
export interface ProductTrendPoint {
  date: string;
  units: number;
}

export interface ProductDemandItem {
  product_id: number;
  name: string;
  category?: string | null;
  units_sold: number;
  sales: number;
  profit: number;
  stock_qty: number;
  trend: ProductTrendPoint[];
}

export interface ProductProfitItem {
  product_id: number;
  name: string;
  category?: string | null;
  sales: number;
  cost: number;
  profit: number;
  margin_pct: number;
  units_sold: number;
  stock_qty: number;
  abc_class: 'A' | 'B' | 'C';
  no_sales_30d: boolean;
}

export interface ProductRankedItem {
  product_id: number;
  name: string;
  category?: string | null;
  sales: number;
  units_sold: number;
  stock_qty: number;
  no_sales_30d: boolean;
  abc_class: 'A' | 'B' | 'C';
}

export interface ProductAnalyticsResponse {
  period: string;
  category: string;
  has_data: boolean;
  total_products: number;
  total_sales: number;
  total_units: number;
  categories_list: string[];
  demand_top: ProductDemandItem[];
  best_selling: ProductRankedItem[];
  slow_selling: ProductRankedItem[];
  profit_table: ProductProfitItem[];
}

// --- Inventory Analytics Interfaces ---
export interface OutOfStockItem {
  product_id: number;
  name: string;
  category?: string;
  cost_price: number;
  selling_price: number;
  stock_qty: number;
  reorder_level: number;
  last_sold_date?: string | null;
  estimated_lost_sales: number;
}

export interface ExpiryItem {
  product_id: number;
  name: string;
  category?: string;
  cost_price: number;
  selling_price: number;
  stock_qty: number;
  expiry_date: string;
  days_until_expiry: number;
  value_at_risk: number;
}

export interface ExpiryGroup {
  group_key: 'expired' | 'within_7d' | 'within_30d' | 'within_90d' | string;
  title: string;
  product_count: number;
  total_qty: number;
  value_at_risk: number;
  suggestion?: string | null;
  items: ExpiryItem[];
}

export interface InventorySummary {
  stock_value_at_cost: number;
  number_of_products: number;
  low_stock_count: number;
  inventory_turnover: number;
}

export interface InventoryAnalyticsResponse {
  has_data: boolean;
  summary: InventorySummary;
  out_of_stock_list: OutOfStockItem[];
  expiry_groups: ExpiryGroup[];
}

// --- Profitability Analytics Interfaces ---
export interface MarginTrendPoint {
  period: string;
  date: string;
  sales: number;
  cogs: number;
  gross_profit: number;
  gross_margin_pct: number;
}

export interface CategoryMarginItem {
  category: string;
  sales: number;
  cogs: number;
  gross_profit: number;
  margin_pct: number;
  share_of_sales_pct: number;
}

export interface LowestMarginProductItem {
  product_id: number;
  name: string;
  category?: string;
  sales: number;
  cogs: number;
  profit: number;
  margin_pct: number;
  units_sold: number;
}

export interface ExpenseCategoryItem {
  category: string;
  amount: number;
  share_pct: number;
  count: number;
}

export interface MonthlyExpenseTrendPoint {
  month: string;
  label: string;
  amount: number;
  count: number;
}

export interface ExpenseEntryItem {
  id: number;
  date: string;
  category: string;
  amount: number;
  note?: string | null;
}

export interface BreakdownStep {
  label: string;
  amount: number;
  type: 'revenue' | 'cogs' | 'gross_profit' | 'expenses' | 'net_profit';
  percentage?: number | null;
  description: string;
}

export interface ProfitabilityAnalyticsResponse {
  from_date: string;
  to_date: string;
  has_data: boolean;
  insight?: string | null;
  overall_gross_margin_pct: number;
  overall_net_margin_pct: number;
  total_sales: number;
  total_cogs: number;
  gross_profit: number;
  total_expenses: number;
  net_profit: number;
  margin_trend: MarginTrendPoint[];
  margin_by_category: CategoryMarginItem[];
  lowest_margin_products: LowestMarginProductItem[];
  expenses_by_category: ExpenseCategoryItem[];
  expenses_monthly_trend: MonthlyExpenseTrendPoint[];
  expense_entries: ExpenseEntryItem[];
  net_profit_steps: BreakdownStep[];
}

// --- Upgraded Analytics Dashboard Interfaces ---
export interface SalesPeriodKPI {
  title: string;
  period_key: string;
  sales: number;
  transactions: number;
  profit: number;
  prev_sales: number;
  prev_transactions: number;
  prev_profit: number;
  delta_pct: number | null;
  comparison_message: string;
}

export interface AnalyticsKPISet {
  daily: SalesPeriodKPI;
  weekly: SalesPeriodKPI;
  monthly: SalesPeriodKPI;
}

export interface TrendChartPoint {
  label: string;
  date_or_hour: string;
  sales: number;
  profit: number;
  transactions: number;
}

export interface AnalyticsTrends {
  daily_trend: TrendChartPoint[];
  weekly_trend: TrendChartPoint[];
  monthly_trend: TrendChartPoint[];
  sales_vs_profit: TrendChartPoint[];
  transaction_trend: TrendChartPoint[];
}

export interface BestSellingItem {
  product_id: number;
  name: string;
  category: string;
  units_sold: number;
  revenue: number;
  profit: number;
  margin_pct: number;
  sales_contribution_pct: number;
}

export interface SlowSellingItem {
  product_id: number;
  name: string;
  category: string;
  current_stock: number;
  units_sold: number;
  last_sale_date: string | null;
  days_since_last_sale: number | null;
  estimated_stock_days: number | null;
  status: string;
  recommendation: string;
}

export interface DemandAnalysisItem {
  product_id: number;
  name: string;
  category: string;
  units_sold: number;
  velocity_per_day: number;
  demand_trend: string;
  current_stock: number;
  days_stock_remaining: number | null;
  stockout_warning: boolean;
  suggested_restock_qty: number;
  prev_units_sold: number;
  velocity_change_pct: number | null;
}

export interface MostProfitableItem {
  product_id: number;
  name: string;
  category: string;
  units_sold: number;
  revenue: number;
  cogs: number;
  gross_profit: number;
  gross_margin_pct: number;
  profit_contribution_pct: number;
}

export interface LowMarginHighSalesItem {
  product_id: number;
  name: string;
  category: string;
  revenue: number;
  units_sold: number;
  gross_margin_pct: number;
  gross_profit: number;
  insight: string;
}

export interface ProductPerformanceRow {
  product_id: number;
  name: string;
  category: string;
  units_sold: number;
  sales_revenue: number;
  gross_profit: number;
  profit_margin_pct: number;
  current_stock: number;
  demand_trend: string;
  sales_status: string;
}

export interface AnalyticsInsightItem {
  type: string;
  title: string;
  description: string;
  severity: string;
  trace: string;
}

export interface AnalyticsDashboardResponse {
  kpis: AnalyticsKPISet;
  period: string;
  from_date: string;
  to_date: string;
  has_data: boolean;
  total_sales: number;
  total_profit: number;
  total_transactions: number;
  categories_list: string[];
  trends: AnalyticsTrends;
  best_selling: BestSellingItem[];
  slow_selling: SlowSellingItem[];
  demand_analysis: DemandAnalysisItem[];
  most_profitable: MostProfitableItem[];
  low_margin_alerts: LowMarginHighSalesItem[];
  comparison_table: ProductPerformanceRow[];
  insights: AnalyticsInsightItem[];
}

// --- AI Sales Forecast & Demand Forecast Interfaces ---
export interface SalesHistoryPoint {
  date: string;
  day_name: string;
  actual_sales: number;
}

export interface SalesForecastPoint {
  date: string;
  day_name: string;
  predicted_sales: number;
  lower_bound: number;
  upper_bound: number;
}

export interface SalesForecastResponse {
  has_enough_data: boolean;
  days_of_history: number;
  required_days: number;
  forecast_days: number;
  headline?: string | null;
  expected_sales_total: number;
  expected_lower_total: number;
  expected_upper_total: number;
  model_name: string;
  model_accuracy_note?: string | null;
  disclaimer: string;
  historical_points: SalesHistoryPoint[];
  forecast_points: SalesForecastPoint[];
}

export interface AIDemandForecastItem {
  product_id: number;
  name: string;
  category: string;
  stock_qty: number;
  reorder_level: number;
  daily_sales_rate: number;
  forecast_demand_14d?: number | null;
  days_of_stock_left?: number | null;
  suggested_reorder_qty: number;
  reorder_by_date?: string | null;
  risk_level: 'critical' | 'warning' | 'healthy' | 'insufficient_data';
  has_enough_history: boolean;
  status_note?: string | null;
}

export interface DemandForecastResponse {
  lead_time_days: number;
  critical_count: number;
  warning_count: number;
  total_suggested_items: number;
  whatsapp_purchase_list: string;
  items: AIDemandForecastItem[];
}

export interface ProductDemandDetailPoint {
  date: string;
  day_name: string;
  actual?: number | null;
  forecast?: number | null;
}

export interface ProductDemandDetailResponse {
  product: AIDemandForecastItem;
  lead_time_days: number;
  history_points: ProductDemandDetailPoint[];
  forecast_points: ProductDemandDetailPoint[];
  calculation_summary: {
    daily_sales_rate?: number;
    lead_time_days?: number;
    lead_time_demand?: number;
    buffer_cycle_demand?: number;
    total_required_units?: number;
    current_stock?: number;
    suggested_order?: number;
  };
}

export const api = {
  // --- Auth & Session ---
  sendOTP: async (phone: string): Promise<{ success: boolean; message: string; dev_mode: boolean; dev_otp: string }> => {
    const res = await fetch(`${API_BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to send OTP' }));
      throw new Error(err.detail || 'Failed to send OTP');
    }
    return await res.json();
  },

  verifyOTP: async (
    phone: string,
    otp: string,
    email?: string,
    store_name?: string,
    owner_name?: string
  ): Promise<{
    success: boolean;
    token: string;
    is_new_user: boolean;
    onboarding_completed: boolean;
    onboarding_step: number;
    shop: Shop;
  }> => {
    const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp, email, store_name, owner_name }),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Verification failed' }));
      throw new Error(err.detail || 'Verification failed');
    }
    const data = await res.json();
    if (data.token) {
      setAuthToken(data.token);
    }
    return data;
  },

  getMe: async (): Promise<Shop | null> => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        credentials: 'include',
      });
      if (!res.ok) {
        if (res.status === 401) {
          removeAuthToken();
        }
        return null;
      }
      return await res.json();
    } catch {
      return null;
    }
  },

  saveOnboardingStep: async (
    step: number,
    data: Record<string, unknown>
  ): Promise<{ success: boolean; step_completed: number; onboarding_completed: boolean; shop: Shop }> => {
    const res = await fetch(`${API_BASE_URL}/auth/onboarding/step-${step}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to save step' }));
      const msg = typeof err.detail === 'string' ? err.detail : (err.detail?.[0]?.msg || 'Validation error');
      throw new Error(msg);
    }
    return await res.json();
  },

  logout: async (): Promise<void> => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      removeAuthToken();
    }
  },

  // --- Subscriptions ---
  purchaseSubscription: async (
    payload: PurchaseSubscriptionPayload
  ): Promise<PurchaseSubscriptionResponse> => {
    const res = await fetch(`${API_BASE_URL}/api/subscription/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to purchase subscription' }));
      const msg = typeof err.detail === 'string' ? err.detail : (err.detail?.[0]?.msg || 'Subscription failed');
      throw new Error(msg);
    }
    return await res.json();
  },

  initiateCheckout: async (
    payload: InitiateCheckoutPayload = {}
  ): Promise<InitiateCheckoutResponse> => {
    const res = await fetch(`${API_BASE_URL}/api/subscription/checkout/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to initiate checkout' }));
      const msg = typeof err.detail === 'string' ? err.detail : (err.detail?.[0]?.msg || 'Checkout failed');
      throw new Error(msg);
    }
    return await res.json();
  },

  createSubscriptionOrder: async (
    payload: CreateSubscriptionOrderPayload = {}
  ): Promise<CreateSubscriptionOrderResponse> => {
    const res = await fetch(`${API_BASE_URL}/api/subscription/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to create payment order' }));
      const msg = typeof err.detail === 'string' ? err.detail : (err.detail?.[0]?.msg || 'Order creation failed');
      throw new Error(msg);
    }
    return await res.json();
  },

  verifySubscriptionPayment: async (
    payload: VerifySubscriptionPaymentPayload
  ): Promise<VerifySubscriptionPaymentResponse> => {
    const res = await fetch(`${API_BASE_URL}/api/subscription/verify-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to verify payment' }));
      const msg = typeof err.detail === 'string' ? err.detail : (err.detail?.[0]?.msg || 'Payment verification failed');
      throw new Error(msg);
    }
    return await res.json();
  },

  cancelSubscriptionOrder: async (
    order_id: string,
    reason?: string
  ): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_BASE_URL}/api/subscription/cancel-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id, reason }),
      credentials: 'include',
    });
    return await res.json().catch(() => ({ success: true, message: 'Cancelled' }));
  },

  getSubscriptionPaymentStatus: async (
    order_id: string
  ): Promise<SubscriptionPaymentStatusResponse> => {
    const res = await fetch(`${API_BASE_URL}/api/subscription/payment-status/${order_id}`, {
      method: 'GET',
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to fetch payment status' }));
      throw new Error(err.detail || 'Status check failed');
    }
    return await res.json();
  },

  submitUPIPaymentReference: async (
    payload: SubmitUPIPaymentPayload
  ): Promise<SubmitUPIPaymentResponse> => {
    const res = await fetch(`${API_BASE_URL}/api/subscription/submit-upi-ref`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to submit UPI reference' }));
      const msg = typeof err.detail === 'string' ? err.detail : (err.detail?.[0]?.msg || 'UPI verification failed');
      throw new Error(msg);
    }
    return await res.json();
  },

  getSubscriptionQRInfo: async (): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/api/subscription/qr-info`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to fetch QR payment info');
    return await res.json();
  },

  getSubscriptionPlans: async (): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/api/subscription/plans`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to fetch subscription plans');
    return await res.json();
  },

  getSubscriptionStatus: async (): Promise<Shop> => {
    const res = await fetch(`${API_BASE_URL}/api/subscription/status`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to fetch subscription status');
    return await res.json();
  },

  // --- Summary ---
  getSummary: async (): Promise<AnalyticsSummary> => {
    try {
      const res = await fetch(`${API_BASE_URL}/analytics/summary`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch analytics summary');
      return await res.json();
    } catch {
      return {
        total_revenue: 0,
        total_profit: 0,
        total_expenses: 0,
        net_income: 0,
        total_sales_count: 0,
        total_products_count: 0,
        low_stock_count: 0,
      };
    }
  },

  getDashboardKpis: async (period: 'today' | '7days' | '30days' = 'today'): Promise<DashboardKpisResponse> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/dashboard/kpis?period=${period}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch dashboard KPIs');
      return await res.json();
    } catch {
      return {
        period,
        sales: 0,
        previous_sales: 0,
        sales_change_pct: null,
        profit: 0,
        previous_profit: 0,
        profit_change_pct: null,
        transactions: 0,
        previous_transactions: 0,
        transactions_change_pct: null,
      };
    }
  },

  getTodayVsYesterday: async (): Promise<DashboardTodayVsYesterdayResponse> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/dashboard/today-vs-yesterday`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch today vs yesterday comparison');
      return await res.json();
    } catch {
      return {
        has_data: false,
        today: { sales: 0, profit: 0, transactions: 0, average_bill: 0 },
        yesterday: { sales: 0, profit: 0, transactions: 0, average_bill: 0 },
        sales_change_pct: null,
        profit_change_pct: null,
        transactions_change_pct: null,
        average_bill_change_pct: null,
        summary: 'No sales recorded yet',
      };
    }
  },

  getSalesTrend: async (granularity: 'daily' | 'weekly' = 'daily'): Promise<SalesTrendResponse> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/dashboard/sales-trend?granularity=${granularity}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch sales trend');
      return await res.json();
    } catch {
      return {
        granularity,
        has_data: false,
        total_sales: 0,
        total_profit: 0,
        points: [],
      };
    }
  },

  getCategorySales: async (period: 'today' | '7days' | '30days' = 'today'): Promise<CategorySalesResponse> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/dashboard/category-sales?period=${period}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch category sales');
      return await res.json();
    } catch {
      return {
        period,
        has_data: false,
        total_sales: 0,
        categories: [],
      };
    }
  },

  getAlerts: async (): Promise<AlertsResponse> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/alerts`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch stock alerts');
      return await res.json();
    } catch {
      return {
        total_products: 0,
        total_alerts: 0,
        out_of_stock_count: 0,
        low_stock_count: 0,
        high_demand_count: 0,
        out_of_stock: [],
        low_stock: [],
      };
    }
  },

  getAnalyticsSales: async (params: {
    granularity?: 'daily' | 'weekly' | 'monthly';
    from?: string;
    to?: string;
  } = {}): Promise<SalesAnalyticsResponse> => {
    const q = new URLSearchParams();
    if (params.granularity) q.append('granularity', params.granularity);
    if (params.from) q.append('from', params.from);
    if (params.to) q.append('to', params.to);
    const res = await fetch(`${API_BASE_URL}/api/analytics/sales?${q.toString()}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch sales analytics');
    return await res.json();
  },

  getAnalyticsProducts: async (params: {
    period?: string;
    category?: string;
  } = {}): Promise<ProductAnalyticsResponse> => {
    const q = new URLSearchParams();
    if (params.period) q.append('period', params.period);
    if (params.category) q.append('category', params.category);
    const res = await fetch(`${API_BASE_URL}/api/analytics/products?${q.toString()}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch product analytics');
    return await res.json();
  },

  getAnalyticsInventory: async (): Promise<InventoryAnalyticsResponse> => {
    const res = await fetch(`${API_BASE_URL}/api/analytics/inventory`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch inventory analytics');
    return await res.json();
  },

  getAnalyticsProfitability: async (params: {
    from?: string;
    to?: string;
  } = {}): Promise<ProfitabilityAnalyticsResponse> => {
    const q = new URLSearchParams();
    if (params.from) q.append('from', params.from);
    if (params.to) q.append('to', params.to);
    const res = await fetch(`${API_BASE_URL}/api/analytics/profitability?${q.toString()}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch profitability analytics');
    return await res.json();
  },

  getAnalyticsDashboard: async (params: {
    period?: string;
    from?: string;
    to?: string;
    ranking_metric?: 'revenue' | 'units' | 'profit';
    category?: string;
  } = {}): Promise<AnalyticsDashboardResponse> => {
    const q = new URLSearchParams();
    if (params.period) q.append('period', params.period);
    if (params.from) q.append('from', params.from);
    if (params.to) q.append('to', params.to);
    if (params.ranking_metric) q.append('ranking_metric', params.ranking_metric);
    if (params.category) q.append('category', params.category);
    const res = await fetch(`${API_BASE_URL}/api/analytics/dashboard?${q.toString()}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch analytics dashboard');
    return await res.json();
  },

  // --- Counts Helper ---
  getUploadCounts: async (): Promise<UploadCounts> => {
    try {
      const res = await fetch(`${API_BASE_URL}/upload/counts`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch counts');
      return await res.json();
    } catch {
      return { products: 0, sales: 0, expenses: 0, invoices: 0, total: 0 };
    }
  },

  // --- Products ---
  getProducts: async (): Promise<Product[]> => {
    try {
      const res = await fetch(`${API_BASE_URL}/products/`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch products');
      return await res.json();
    } catch {
      return [];
    }
  },

  getProductsPaginated: async (params: {
    search?: string;
    category?: string;
    sort_by?: string;
    order?: 'asc' | 'desc';
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResult<Product>> => {
    const q = new URLSearchParams();
    if (params.search) q.append('search', params.search);
    if (params.category) q.append('category', params.category);
    if (params.sort_by) q.append('sort_by', params.sort_by);
    if (params.order) q.append('order', params.order);
    q.append('page', String(params.page || 1));
    q.append('page_size', String(params.page_size || 10));

    const res = await fetch(`${API_BASE_URL}/products/?${q.toString()}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch products');
    return await res.json();
  },

  autocompleteProducts: async (q: string, limit = 10): Promise<ProductAutocompleteItem[]> => {
    try {
      const params = new URLSearchParams();
      if (q) params.append('q', q);
      params.append('limit', String(limit));
      const res = await fetch(`${API_BASE_URL}/api/products/autocomplete?${params.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to autocomplete products');
      return await res.json();
    } catch {
      return [];
    }
  },

  getProductLocation: async (productId: number, pageSize = 10, sortBy = 'id', order = 'desc'): Promise<ProductLocationResponse> => {
    try {
      const params = new URLSearchParams({
        page_size: String(pageSize),
        sort_by: sortBy,
        order: order,
      });
      const res = await fetch(`${API_BASE_URL}/api/products/${productId}/location?${params.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        return { found: false, product_id: productId, page: 1, page_size: pageSize, total: 0, message: 'Failed to fetch location' };
      }
      return await res.json();
    } catch {
      return { found: false, product_id: productId, page: 1, page_size: pageSize, total: 0, message: 'Network error locating product' };
    }
  },

  createProduct: async (data: Omit<Product, 'id'>): Promise<Product> => {
    const res = await fetch(`${API_BASE_URL}/products/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to create product' }));
      const msg = typeof err.detail === 'string' ? err.detail : (err.detail?.[0]?.msg || 'Failed to create product');
      throw new Error(msg);
    }
    return await res.json();
  },

  updateProduct: async (id: number, data: Partial<Product>): Promise<Product> => {
    const res = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update product' }));
      const msg = typeof err.detail === 'string' ? err.detail : (err.detail?.[0]?.msg || 'Failed to update product');
      throw new Error(msg);
    }
    return await res.json();
  },

  deleteProduct: async (id: number): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to delete product');
  },

  bulkCreateProducts: async (products: Omit<Product, 'id'>[]): Promise<{ success: boolean; count: number }> => {
    const res = await fetch(`${API_BASE_URL}/products/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(products),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to bulk import products' }));
      const msg = typeof err.detail === 'string' ? err.detail : (err.detail?.[0]?.msg || 'Failed to bulk import products');
      throw new Error(msg);
    }
    return await res.json();
  },

  // --- Sales ---
  getSales: async (): Promise<Sale[]> => {
    try {
      const res = await fetch(`${API_BASE_URL}/sales/`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch sales');
      return await res.json();
    } catch {
      return [];
    }
  },

  getSalesPaginated: async (params: {
    search?: string;
    sort_by?: string;
    order?: 'asc' | 'desc';
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResult<Sale>> => {
    const q = new URLSearchParams();
    if (params.search) q.append('search', params.search);
    if (params.sort_by) q.append('sort_by', params.sort_by);
    if (params.order) q.append('order', params.order);
    q.append('page', String(params.page || 1));
    q.append('page_size', String(params.page_size || 10));

    const res = await fetch(`${API_BASE_URL}/sales/?${q.toString()}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch sales');
    return await res.json();
  },

  createSale: async (data: {
    total_amount: number;
    total_profit: number;
    payment_mode: string;
    date_time?: string;
    customer_name?: string;
    customer_phone?: string;
    items?: {
      product_id: number;
      qty: number;
      unit_price: number;
      unit_cost: number;
    }[];
  }): Promise<Sale> => {
    const res = await fetch(`${API_BASE_URL}/sales/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to create sale' }));
      const msg = typeof err.detail === 'string' ? err.detail : (err.detail?.[0]?.msg || 'Failed to create sale');
      throw new Error(msg);
    }
    return await res.json();
  },

  updateSale: async (id: number, data: Partial<Sale>): Promise<Sale> => {
    const res = await fetch(`${API_BASE_URL}/sales/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update sale' }));
      const msg = typeof err.detail === 'string' ? err.detail : (err.detail?.[0]?.msg || 'Failed to update sale');
      throw new Error(msg);
    }
    return await res.json();
  },

  deleteSale: async (id: number): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/sales/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to delete sale');
  },

  bulkCreateSales: async (
    sales: {
      total_amount: number;
      total_profit: number;
      payment_mode: string;
      date_time?: string;
      items: {
        product_id: number;
        qty: number;
        unit_price: number;
        unit_cost: number;
      }[];
    }[]
  ): Promise<{ success: boolean; count: number }> => {
    const res = await fetch(`${API_BASE_URL}/sales/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sales),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to bulk import sales' }));
      const msg = typeof err.detail === 'string' ? err.detail : (err.detail?.[0]?.msg || 'Failed to bulk import sales');
      throw new Error(msg);
    }
    return await res.json();
  },

  // --- Expenses ---
  getExpenses: async (): Promise<Expense[]> => {
    try {
      const res = await fetch(`${API_BASE_URL}/expenses/`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch expenses');
      return await res.json();
    } catch {
      return [];
    }
  },

  getExpensesPaginated: async (params: {
    search?: string;
    category?: string;
    sort_by?: string;
    order?: 'asc' | 'desc';
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResult<Expense>> => {
    const q = new URLSearchParams();
    if (params.search) q.append('search', params.search);
    if (params.category) q.append('category', params.category);
    if (params.sort_by) q.append('sort_by', params.sort_by);
    if (params.order) q.append('order', params.order);
    q.append('page', String(params.page || 1));
    q.append('page_size', String(params.page_size || 10));

    const res = await fetch(`${API_BASE_URL}/expenses/?${q.toString()}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch expenses');
    return await res.json();
  },

  createExpense: async (data: Omit<Expense, 'id'>): Promise<Expense> => {
    const res = await fetch(`${API_BASE_URL}/expenses/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to create expense' }));
      const msg = typeof err.detail === 'string' ? err.detail : (err.detail?.[0]?.msg || 'Failed to create expense');
      throw new Error(msg);
    }
    return await res.json();
  },

  updateExpense: async (id: number, data: Partial<Expense>): Promise<Expense> => {
    const res = await fetch(`${API_BASE_URL}/expenses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to update expense');
    return await res.json();
  },

  deleteExpense: async (id: number): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/expenses/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to delete expense');
  },

  // --- Invoices & OCR Records ---
  getInvoices: async (params?: { search?: string; limit?: number; offset?: number }): Promise<InvoiceRecord[]> => {
    try {
      const q = new URLSearchParams();
      if (params?.search) q.append('search', params.search);
      if (params?.limit) q.append('limit', String(params.limit));
      if (params?.offset) q.append('offset', String(params.offset));
      const res = await fetch(`${API_BASE_URL}/invoices/?${q.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch invoices');
      return await res.json();
    } catch {
      return [];
    }
  },

  getInvoice: async (invoiceId: number): Promise<InvoiceDetailResponse> => {
    const res = await fetch(`${API_BASE_URL}/invoices/${invoiceId}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch invoice details');
    return await res.json();
  },

  deleteInvoice: async (invoiceId: number): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_BASE_URL}/invoices/${invoiceId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to delete invoice');
    return await res.json();
  },

  // --- Customers ---
  getCustomers: async (params?: { search?: string; limit?: number }): Promise<CustomerSummary[]> => {
    try {
      const q = new URLSearchParams();
      if (params?.search) q.append('search', params.search);
      if (params?.limit) q.append('limit', String(params.limit));
      const res = await fetch(`${API_BASE_URL}/customers/?${q.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch customers');
      return await res.json();
    } catch {
      return [];
    }
  },

  // --- Shops ---
  getShops: async (): Promise<Shop[]> => {
    try {
      const res = await fetch(`${API_BASE_URL}/shops/`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch shops');
      return await res.json();
    } catch {
      return [];
    }
  },

  createShop: async (data: Partial<Shop>): Promise<Shop> => {
    const res = await fetch(`${API_BASE_URL}/shops/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to create shop');
    return await res.json();
  },

  updateShop: async (id: number, data: Partial<Shop>): Promise<Shop> => {
    const res = await fetch(`${API_BASE_URL}/shops/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to update shop');
    return await res.json();
  },

  // --- Invoice Extraction ---
  getOcrStatus: async (): Promise<{ gemini_configured: boolean; active_engine: string; windows_native_available: boolean }> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/ocr-status`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch OCR status');
      return await res.json();
    } catch {
      return { gemini_configured: false, active_engine: 'Demo Mode', windows_native_available: false };
    }
  },

  saveGeminiKey: async (apiKey: string): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_BASE_URL}/api/save-gemini-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey }),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to save Gemini key' }));
      throw new Error(err.detail || 'Failed to save Gemini key');
    }
    return await res.json();
  },

  extractInvoice: async (file: File, apiKey?: string): Promise<ExtractedInvoiceResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    const rawKey = (apiKey || localStorage.getItem('gemini_api_key') || localStorage.getItem('anthropic_api_key') || '').trim();
    const key = ['undefined', 'null', 'none', ''].includes(rawKey.toLowerCase()) ? '' : rawKey;
    if (key) {
      if (key.startsWith('sk-ant-')) {
        headers['X-Anthropic-API-Key'] = key;
      } else {
        headers['X-Gemini-API-Key'] = key;
      }
    }

    const res = await fetch(`${API_BASE_URL}/api/extract-invoice`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to extract invoice' }));
      const msg = typeof err.detail === 'string' ? err.detail : (err.detail?.[0]?.msg || 'Failed to extract invoice');
      throw new Error(msg);
    }
    return await res.json();
  },

  confirmExtractedInvoice: async (
    payload: ConfirmInvoiceRequestPayload
  ): Promise<{ success: boolean; created_count: number; updated_count: number; total_items: number }> => {
    const res = await fetch(`${API_BASE_URL}/api/confirm-extracted-invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to confirm extracted invoice' }));
      const msg = typeof err.detail === 'string' ? err.detail : (err.detail?.[0]?.msg || 'Failed to confirm extracted invoice');
      throw new Error(msg);
    }
    return await res.json();
  },

  // --- AI Insights & Forecasts ---
  getAISalesForecast: async (days: 7 | 14 | 30 = 7): Promise<SalesForecastResponse> => {
    const res = await fetch(`${API_BASE_URL}/api/ai/sales-forecast?days=${days}`, {
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to fetch sales forecast' }));
      throw new Error(err.detail || 'Failed to fetch sales forecast');
    }
    return await res.json();
  },

  getAIDemandForecast: async (params?: { lead_time_days?: number; search?: string; category?: string }): Promise<DemandForecastResponse> => {
    const query = new URLSearchParams();
    if (params?.lead_time_days !== undefined) query.set('lead_time_days', params.lead_time_days.toString());
    if (params?.search) query.set('search', params.search);
    if (params?.category) query.set('category', params.category);
    const queryString = query.toString() ? `?${query.toString()}` : '';

    const res = await fetch(`${API_BASE_URL}/api/ai/demand-forecast${queryString}`, {
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to fetch demand forecast' }));
      throw new Error(err.detail || 'Failed to fetch demand forecast');
    }
    return await res.json();
  },

  getAIProductDemandDetail: async (productId: number, leadTimeDays: number = 3): Promise<ProductDemandDetailResponse> => {
    const res = await fetch(`${API_BASE_URL}/api/ai/demand-forecast/${productId}?lead_time_days=${leadTimeDays}`, {
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to fetch product demand forecast details' }));
      throw new Error(err.detail || 'Failed to fetch product demand forecast details');
    }
    return await res.json();
  },

  // --- AI Product Recommendations ---
  getRecommendations: async (): Promise<RecommendationsResponse> => {
    const res = await fetch(`${API_BASE_URL}/api/ai/recommendations`, {
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to fetch product recommendations' }));
      throw new Error(err.detail || 'Failed to fetch product recommendations');
    }
    return await res.json();
  },

  explainRecommendation: async (payload: ExplainRecommendationRequest): Promise<ExplainRecommendationResponse> => {
    const res = await fetch(`${API_BASE_URL}/api/ai/recommendations/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to explain recommendation' }));
      throw new Error(err.detail || 'Failed to explain recommendation');
    }
    return await res.json();
  },

  // --- Admin Portal Operations ---
  getAdminOverview: async (period: 'monthly' | 'weekly' | 'daily' = 'monthly'): Promise<AdminOverviewResponse> => {
    const res = await fetch(`${API_BASE_URL}/api/admin/overview?period=${period}`, {
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to fetch admin overview metrics' }));
      throw new Error(err.detail || 'Failed to fetch admin overview metrics');
    }
    return await res.json();
  },

  getAdminBusinesses: async (params?: {
    search?: string;
    status?: string;
    category?: string;
    city?: string;
    page?: number;
    page_size?: number;
  }): Promise<AdminBusinessesResponse> => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.category && !params.category.startsWith('All')) query.set('category', params.category);
    if (params?.city && !params.city.startsWith('All')) query.set('city', params.city);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.page_size) query.set('page_size', params.page_size.toString());
    const queryString = query.toString() ? `?${query.toString()}` : '';

    const res = await fetch(`${API_BASE_URL}/api/admin/businesses${queryString}`, {
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to fetch admin businesses' }));
      throw new Error(err.detail || 'Failed to fetch admin businesses');
    }
    return await res.json();
  },

  adminBulkAction: async (action: string, shop_ids: number[], days: number = 7): Promise<{ success: boolean; updated_count: number; message: string }> => {
    const res = await fetch(`${API_BASE_URL}/api/admin/businesses/bulk-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action, shop_ids, days }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to execute bulk action' }));
      throw new Error(err.detail || 'Failed to execute bulk action');
    }
    return await res.json();
  },

  exportBusinessesCSVUrl: (params?: { search?: string; status?: string; category?: string; city?: string }): string => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.category && !params.category.startsWith('All')) query.set('category', params.category);
    if (params?.city && !params.city.startsWith('All')) query.set('city', params.city);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return `${API_BASE_URL}/api/admin/businesses/export-csv${queryString}`;
  },

  checkAdmin: async (): Promise<{ is_admin: boolean; authenticated: boolean; admin_email?: string }> => {
    const res = await fetch(`${API_BASE_URL}/api/admin/check`, {
      credentials: 'include',
    });
    if (!res.ok) {
      return { is_admin: false, authenticated: false };
    }
    return await res.json();
  },

  adminDevLogin: async (): Promise<{ success: boolean; token: string; shop: Shop }> => {
    const res = await fetch(`${API_BASE_URL}/api/admin/dev-login`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to authenticate admin session' }));
      throw new Error(err.detail || 'Failed to authenticate admin session');
    }
    return await res.json();
  },

  getAdminBusinessDetail: async (businessId: number): Promise<BusinessDetailResponse> => {
    const res = await fetch(`${API_BASE_URL}/api/admin/businesses/${businessId}`, {
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to fetch business detail' }));
      throw new Error(err.detail || 'Failed to fetch business detail');
    }
    return await res.json();
  },

  adminExtendBusinessTrial: async (businessId: number, days: number, reason?: string): Promise<{ success: boolean; message: string; new_trial_end_date: string; trial_days_left: number }> => {
    const res = await fetch(`${API_BASE_URL}/api/admin/businesses/${businessId}/extend-trial`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ days, reason }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to extend trial' }));
      throw new Error(err.detail || 'Failed to extend trial');
    }
    return await res.json();
  },

  adminResendBusinessLogin: async (businessId: number): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_BASE_URL}/api/admin/businesses/${businessId}/resend-login`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to resend credentials' }));
      throw new Error(err.detail || 'Failed to resend credentials');
    }
    return await res.json();
  },

  adminSuspendBusiness: async (businessId: number): Promise<{ success: boolean; status: string; message: string }> => {
    const res = await fetch(`${API_BASE_URL}/api/admin/businesses/${businessId}/suspend`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to suspend store' }));
      throw new Error(err.detail || 'Failed to suspend store');
    }
    return await res.json();
  },

  adminActivateBusiness: async (businessId: number): Promise<{ success: boolean; status: string; is_paid: boolean; message: string }> => {
    const res = await fetch(`${API_BASE_URL}/api/admin/businesses/${businessId}/activate`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to activate store' }));
      throw new Error(err.detail || 'Failed to activate store');
    }
    return await res.json();
  },

  adminUpdateBusinessNote: async (businessId: number, note: string): Promise<{ success: boolean; admin_notes: string; message: string }> => {
    const res = await fetch(`${API_BASE_URL}/api/admin/businesses/${businessId}/note`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ note }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to save admin observation' }));
      throw new Error(err.detail || 'Failed to save admin observation');
    }
    return await res.json();
  },

  getAdminPlans: async (): Promise<PlansResponse> => {
    const res = await fetch(`${API_BASE_URL}/api/admin/plans`, {
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to fetch plans' }));
      throw new Error(err.detail || 'Failed to fetch plans');
    }
    return await res.json();
  },

  saveAdminPlans: async (payload: { default_trial_days: number; modular_features: ModularFeatureItem[]; bundle: BundlePricingItem }): Promise<PlansResponse> => {
    const res = await fetch(`${API_BASE_URL}/api/admin/plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to save plans' }));
      throw new Error(err.detail || 'Failed to save plans');
    }
    return await res.json();
  },

  getAdminPromoCodes: async (): Promise<PromoCodeItem[]> => {
    const res = await fetch(`${API_BASE_URL}/api/admin/promo-codes`, {
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to fetch promo codes' }));
      throw new Error(err.detail || 'Failed to fetch promo codes');
    }
    return await res.json();
  },

  createAdminPromoCode: async (payload: { code: string; discount_type: string; discount_value: number; validity?: string; max_uses?: number; active?: boolean }): Promise<PromoCodeItem> => {
    const res = await fetch(`${API_BASE_URL}/api/admin/promo-codes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to create promo code' }));
      throw new Error(err.detail || 'Failed to create promo code');
    }
    return await res.json();
  },

  updateAdminPromoCode: async (promoId: number, payload: Partial<PromoCodeItem>): Promise<PromoCodeItem> => {
    const res = await fetch(`${API_BASE_URL}/api/admin/promo-codes/${promoId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update promo code' }));
      throw new Error(err.detail || 'Failed to update promo code');
    }
    return await res.json();
  },

  deleteAdminPromoCode: async (promoId: number): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_BASE_URL}/api/admin/promo-codes/${promoId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to delete promo code' }));
      throw new Error(err.detail || 'Failed to delete promo code');
    }
    return await res.json();
  },

  // --- Support & Feedback System (Customer) ---
  createSupportTicket: async (payload: CreateTicketPayload): Promise<SupportTicket> => {
    const res = await fetch(`${API_BASE_URL}/api/support/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to create support ticket' }));
      throw new Error(err.detail || 'Failed to create support ticket');
    }
    return await res.json();
  },

  getCustomerTickets: async (filters?: { search?: string; status?: string; category?: string; priority?: string }): Promise<SupportTicket[]> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.priority) params.append('priority', filters.priority);
    const qs = params.toString() ? `?${params.toString()}` : '';

    const res = await fetch(`${API_BASE_URL}/api/support/tickets${qs}`, {
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to fetch support tickets' }));
      throw new Error(err.detail || 'Failed to fetch support tickets');
    }
    return await res.json();
  },

  getCustomerTicketDetail: async (ticketId: number): Promise<SupportTicket> => {
    const res = await fetch(`${API_BASE_URL}/api/support/tickets/${ticketId}`, {
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to fetch ticket details' }));
      throw new Error(err.detail || 'Failed to fetch ticket details');
    }
    return await res.json();
  },

  sendCustomerTicketMessage: async (ticketId: number, payload: SendTicketMessagePayload): Promise<TicketMessage> => {
    const res = await fetch(`${API_BASE_URL}/api/support/tickets/${ticketId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to send message' }));
      throw new Error(err.detail || 'Failed to send message');
    }
    return await res.json();
  },

  getCustomerSupportUnreadCount: async (): Promise<{ unread_count: number }> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/support/unread-count`, {
        credentials: 'include',
      });
      if (!res.ok) return { unread_count: 0 };
      return await res.json();
    } catch {
      return { unread_count: 0 };
    }
  },

  submitCustomerFeedback: async (payload: CreateFeedbackPayload): Promise<CustomerFeedback> => {
    const res = await fetch(`${API_BASE_URL}/api/support/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to submit feedback' }));
      throw new Error(err.detail || 'Failed to submit feedback');
    }
    return await res.json();
  },

  getCustomerFeedbacks: async (): Promise<CustomerFeedback[]> => {
    const res = await fetch(`${API_BASE_URL}/api/support/feedback`, {
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to fetch feedback' }));
      throw new Error(err.detail || 'Failed to fetch feedback');
    }
    return await res.json();
  },

  // --- Support & Feedback System (Admin) ---
  getAdminSupportOverview: async (): Promise<SupportOverview> => {
    const res = await fetch(`${API_BASE_URL}/api/admin/support/overview`, {
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to fetch support overview' }));
      throw new Error(err.detail || 'Failed to fetch support overview');
    }
    return await res.json();
  },

  getAdminTickets: async (params?: { search?: string; status?: string; category?: string; priority?: string; page?: number; page_size?: number }): Promise<AdminTicketsResponse> => {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.status) q.append('status', params.status);
    if (params?.category) q.append('category', params.category);
    if (params?.priority) q.append('priority', params.priority);
    if (params?.page) q.append('page', String(params.page));
    if (params?.page_size) q.append('page_size', String(params.page_size));
    const qs = q.toString() ? `?${q.toString()}` : '';

    const res = await fetch(`${API_BASE_URL}/api/admin/support/tickets${qs}`, {
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to fetch admin support tickets' }));
      throw new Error(err.detail || 'Failed to fetch admin support tickets');
    }
    return await res.json();
  },

  getAdminTicketDetail: async (ticketId: number): Promise<SupportTicket> => {
    const res = await fetch(`${API_BASE_URL}/api/admin/support/tickets/${ticketId}`, {
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to fetch ticket detail' }));
      throw new Error(err.detail || 'Failed to fetch ticket detail');
    }
    return await res.json();
  },

  sendAdminTicketMessage: async (ticketId: number, payload: SendTicketMessagePayload): Promise<TicketMessage> => {
    const res = await fetch(`${API_BASE_URL}/api/admin/support/tickets/${ticketId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to send admin message' }));
      throw new Error(err.detail || 'Failed to send admin message');
    }
    return await res.json();
  },

  updateAdminTicket: async (ticketId: number, payload: { status?: string; priority?: string; assigned_admin?: string }): Promise<SupportTicket> => {
    const res = await fetch(`${API_BASE_URL}/api/admin/support/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update ticket' }));
      throw new Error(err.detail || 'Failed to update ticket');
    }
    return await res.json();
  },

  getAdminFeedbacks: async (params?: { search?: string; status?: string; category?: string; rating?: number }): Promise<CustomerFeedback[]> => {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.status) q.append('status', params.status);
    if (params?.category) q.append('category', params.category);
    if (params?.rating) q.append('rating', String(params.rating));
    const qs = q.toString() ? `?${q.toString()}` : '';

    const res = await fetch(`${API_BASE_URL}/api/admin/support/feedback${qs}`, {
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to fetch feedback' }));
      throw new Error(err.detail || 'Failed to fetch feedback');
    }
    return await res.json();
  },

  updateAdminFeedback: async (feedbackId: number, payload: { status?: string; admin_notes?: string }): Promise<CustomerFeedback> => {
    const res = await fetch(`${API_BASE_URL}/api/admin/support/feedback/${feedbackId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update feedback' }));
      throw new Error(err.detail || 'Failed to update feedback');
    }
    return await res.json();
  },

  convertFeedbackToTicket: async (feedbackId: number): Promise<SupportTicket> => {
    const res = await fetch(`${API_BASE_URL}/api/admin/support/feedback/${feedbackId}/convert-to-ticket`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to convert feedback to ticket' }));
      throw new Error(err.detail || 'Failed to convert feedback to ticket');
    }
    return await res.json();
  },
};


export interface ExtractedInvoiceItem {
  name: string;
  description?: string;
  qty: number;
  quantity?: number;
  cost_price?: number | null;
  unit_price?: number | null;
  tax_rate?: number | null;
  tax_percent?: string | null;
  tax_amount?: number | null;
  base_amount?: number | null;
  is_tax_inclusive?: boolean;
  mrp?: number | null;
  line_total?: number | null;
  amount?: number | null;
  expiry_date?: string | null;
  confidence: number;
  field_confidence?: Record<string, number>;
  needs_review?: boolean;
  taxable_amount?: number | null;
  page?: number;
  raw_text?: string | null;
}

export interface ExtractedInvoiceResponse {
  supplier?: string | null;
  vendor?: string | null;
  invoice_number?: string | null;
  invoice_date?: string | null;
  date?: string | null;
  currency?: string | null;
  subtotal?: number | null;
  tax?: number | null;
  total?: number | null;
  total_amount_for_invoice?: number | null;
  invoice_grand_total?: number | null;
  page_count?: number;
  document_type?: string;
  items: ExtractedInvoiceItem[];
  is_mock: boolean;
  message?: string | null;
  ocr_engine?: string | null;
}

export interface ConfirmInvoiceItemPayload {
  name: string;
  qty: number;
  cost_price?: number | null;
  selling_price?: number | null;
  category?: string;
  expiry_date?: string | null;
  action: 'update' | 'create';
  matched_product_id?: number | null;
}

export interface ConfirmInvoiceRequestPayload {
  supplier?: string | null;
  vendor?: string | null;
  invoice_number?: string | null;
  invoice_date?: string | null;
  currency?: string | null;
  items: ConfirmInvoiceItemPayload[];
}

// --- Recommendations Interfaces ---
export interface RecommendationItem {
  id: string;
  type: 'stock_more' | 'bundle' | 'discount_clear' | 'reconsider' | 'price_check' | string;
  type_label: string;
  title: string;
  product_id?: number | null;
  product_name?: string | null;
  secondary_product_id?: number | null;
  secondary_product_name?: string | null;
  category?: string | null;
  reason: string;
  action: string;
  action_type: string;
  numbers: Record<string, any>;
  template_explanations: Record<string, string>;
}

export interface RecommendationsChecklist {
  has_products: boolean;
  product_count: number;
  required_products: number;
  has_sales_history: boolean;
  sales_days: number;
  required_sales_days: number;
  has_cost_margins: boolean;
}

export interface RecommendationsSummary {
  total: number;
  stock_more: number;
  bundle: number;
  discount_clear: number;
  reconsider: number;
  price_check: number;
}

export interface RecommendationsResponse {
  has_enough_data: boolean;
  checklist: RecommendationsChecklist;
  summary: RecommendationsSummary;
  recommendations: RecommendationItem[];
}

export interface ExplainRecommendationRequest {
  rec_id: string;
  title: string;
  reason: string;
  action: string;
  language: 'en' | 'hi' | 'mr';
  rec_type?: string;
  product_name?: string;
  numbers?: Record<string, any>;
}

export interface ExplainRecommendationResponse {
  explanation: string;
  language: string;
  is_llm: boolean;
}

// --- Admin Portal Interfaces ---
export interface AdminOverviewStat {
  new_registrations: number;
  registrations_change_pct?: number | null;
  active_trials: number;
  trials_ending_soon: number;
  paid_businesses: number;
  paid_change_count: number;
  conversion_rate: number;
  conversion_rate_change_pct?: number | null;
  monthly_revenue: number;
  revenue_change_pct?: number | null;
}

export interface AdminChartPoint {
  period: string;
  date: string;
  registrations: number;
  paid_converted: number;
  conversion_pct: number;
}

export interface FunnelStep {
  step_number: number;
  title: string;
  count: number;
  pct: number;
  drop_pct?: number | null;
}

export interface RecentConversionItem {
  id: number;
  business_name: string;
  owner_name: string;
  city: string;
  state: string;
  plan: string;
  amount: number;
  payment_method: string;
  date: string;
  status: string;
}

export interface AdminOverviewResponse {
  has_data: boolean;
  stats: AdminOverviewStat;
  trend_points: AdminChartPoint[];
  funnel: FunnelStep[];
  recent_conversions: RecentConversionItem[];
}

export interface AdminBusinessItem {
  id: number;
  code: string;
  name: string;
  owner_name: string;
  phone: string;
  email?: string | null;
  city: string;
  state: string;
  category: string;
  status: 'trial' | 'active' | 'expired' | 'suspended' | string;
  plan_name: string;
  trial_end_date?: string | null;
  last_active?: string | null;
  products_count: number;
  sales_count: number;
}

export interface AdminBusinessesResponse {
  total_count: number;
  trial_count: number;
  active_count: number;
  expired_count: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: AdminBusinessItem[];
}

// --- Admin Business Detail Interfaces ---
export interface AuditLogItem {
  id: number;
  shop_id?: number | null;
  admin_email: string;
  action: string;
  details?: string | null;
  created_at: string;
}

export interface BusinessDetailStats {
  catalogue_size: number;
  monthly_sales_reported: number;
  invoices_scanned: number;
  staff_users: number;
}

export interface OnboardingStepInfo {
  step_number: number;
  title: string;
  description: string;
  data: Record<string, any>;
}

export interface TrialInfo {
  status: string;
  trial_start_date?: string | null;
  trial_end_date?: string | null;
  trial_days_left: number;
  hours_remaining: number;
  is_paid: boolean;
  plan_name: string;
}

export interface BusinessPaymentItem {
  id: string;
  plan_name: string;
  amount: number;
  status: string;
  invoice_number: string;
  date: string;
  payment_method: string;
}

export interface BusinessUsageTelemetry {
  products_count: number;
  sales_count: number;
  total_sales_volume: number;
  invoices_count: number;
  last_active?: string | null;
}

export interface BusinessDetailResponse {
  shop: AdminBusinessItem;
  stats: BusinessDetailStats;
  onboarding_steps: OnboardingStepInfo[];
  trial_info: TrialInfo;
  admin_notes?: string | null;
  audit_logs: AuditLogItem[];
  payments: BusinessPaymentItem[];
  usage: BusinessUsageTelemetry;
}

// --- Admin Plans & Promo Code Interfaces ---
export interface ModularFeatureItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  monthly_price: number;
  quarterly_price: number;
  active_subscribers: number;
  enabled: boolean;
}

export interface BundlePricingItem {
  monthly_price: number;
  quarterly_price: number;
  annual_price: number;
  active_subscribers: number;
}

export interface PlansResponse {
  default_trial_days: number;
  modular_features: ModularFeatureItem[];
  bundle: BundlePricingItem;
  total_subscribers: number;
}

export interface PromoCodeItem {
  id: number;
  code: string;
  discount_type: 'percentage' | 'fixed' | string;
  discount_value: number;
  validity?: string | null;
  max_uses: number;
  used_count: number;
  active: boolean;
  created_at: string;
}

// --- Support & Feedback System Interfaces ---
export interface TicketMessage {
  id: number;
  ticket_id: number;
  sender_id?: number | null;
  sender_role: 'customer' | 'admin' | string;
  sender_name: string;
  message: string;
  attachment_name?: string | null;
  attachment_data?: string | null;
  created_at: string;
}

export interface SupportTicket {
  id: number;
  ticket_number: string;
  shop_id: number;
  store_name?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  subject: string;
  category: string;
  description: string;
  priority: 'Low' | 'Normal' | 'High' | string;
  status: 'Open' | 'In Progress' | 'Waiting for Customer' | 'Resolved' | 'Closed' | string;
  assigned_admin?: string | null;
  attachment_name?: string | null;
  has_customer_unread: boolean;
  has_admin_unread: boolean;
  created_at: string;
  updated_at: string;
  messages_count?: number;
  latest_reply_by?: string | null;
  latest_reply_at?: string | null;
  messages?: TicketMessage[];
}

export interface CreateTicketPayload {
  subject: string;
  category: string;
  description: string;
  priority?: string;
  attachment_name?: string | null;
  attachment_data?: string | null;
}

export interface SendTicketMessagePayload {
  message: string;
  attachment_name?: string | null;
  attachment_data?: string | null;
  status?: string | null;
}

export interface CustomerFeedback {
  id: number;
  shop_id: number;
  store_name?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  category: 'Feature Suggestion' | 'User Experience' | 'Bug Report' | 'General Feedback' | string;
  rating: number; // 1 to 5
  subject?: string | null;
  comments: string;
  status: 'New' | 'Under Review' | 'Planned' | 'Implemented' | 'Declined' | string;
  admin_notes?: string | null;
  converted_ticket_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateFeedbackPayload {
  category: string;
  rating: number;
  subject?: string | null;
  comments: string;
}

export interface SupportOverview {
  total_tickets: number;
  open_tickets: number;
  in_progress_tickets: number;
  waiting_for_customer_tickets: number;
  resolved_tickets: number;
  closed_tickets: number;
  unanswered_tickets: number;
  total_feedback: number;
  average_rating: number;
}

export interface AdminTicketsResponse {
  tickets: SupportTicket[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}



