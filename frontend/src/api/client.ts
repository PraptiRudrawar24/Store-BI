const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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
  last_active_at?: string | null;
  status?: string | null;
  created_at?: string | null;
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
  total: number;
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
    email?: string
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
      body: JSON.stringify({ phone, otp, email }),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Verification failed' }));
      throw new Error(err.detail || 'Verification failed');
    }
    return await res.json();
  },

  getMe: async (): Promise<Shop | null> => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        credentials: 'include',
      });
      if (!res.ok) return null;
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
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
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

  // --- Counts Helper ---
  getUploadCounts: async (): Promise<UploadCounts> => {
    try {
      const res = await fetch(`${API_BASE_URL}/upload/counts`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch counts');
      return await res.json();
    } catch {
      return { products: 0, sales: 0, expenses: 0, total: 0 };
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
    const key = apiKey || localStorage.getItem('gemini_api_key') || '';
    if (key.trim()) {
      headers['X-Gemini-API-Key'] = key.trim();
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
};


export interface ExtractedInvoiceItem {
  name: string;
  qty: number;
  cost_price?: number | null;
  mrp?: number | null;
  line_total?: number | null;
  expiry_date?: string | null;
  confidence: number;
}

export interface ExtractedInvoiceResponse {
  supplier?: string | null;
  invoice_date?: string | null;
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
  invoice_date?: string | null;
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


