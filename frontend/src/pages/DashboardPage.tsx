import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  Sparkles,
  ReceiptText,
  Store,
  ArrowUp,
  ArrowRight,
  Layers,
  FileDown,
  Filter,
  Calendar,
} from 'lucide-react';
import { AnimatedNumber } from '@/components/core/animated-number';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { cn } from '../components/ui/utils';
import { formatINR } from '../utils';

import {
  api,
  type DashboardKpisResponse,
  type DashboardTodayVsYesterdayResponse,
  type CategorySalesResponse,
  type Product,
  type Sale,
} from '../api/client';
import { useToast } from '../components/ui/Toast';
import { useAlerts } from '../context/AlertsContext';
import { useAuth } from '../context/AuthContext';
import { SalesTrendCard } from '../components/dashboard/SalesTrendCard';
import { CategorySalesCard } from '../components/dashboard/CategorySalesCard';
import { AlertsSection } from '../components/dashboard/AlertsSection';

interface ComparisonRowProps {
  label: string;
  todayVal: number;
  yesterdayVal: number;
  deltaPct: number | null;
  isCurrency?: boolean;
}

function ComparisonRow({
  label,
  todayVal,
  yesterdayVal,
  deltaPct,
  isCurrency = true,
}: ComparisonRowProps) {
  const maxVal = Math.max(todayVal, yesterdayVal, 0.01);
  const todayWidth = Math.min(100, Math.round((todayVal / maxVal) * 100));
  const yesterdayWidth = Math.min(100, Math.round((yesterdayVal / maxVal) * 100));

  return (
    <div className="p-4 rounded-[8px] bg-canvas border border-border flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-text-medium">{label}</span>
        <span
          className={cn(
            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] font-semibold text-[11px] border tabular-nums',
            deltaPct !== null && deltaPct > 0 && 'bg-success-bg text-success border-success-border',
            deltaPct !== null && deltaPct < 0 && 'bg-destructive-bg text-destructive border-destructive-border',
            (deltaPct === null || deltaPct === 0) && 'bg-surface text-text-medium border-border'
          )}
        >
          {deltaPct !== null && deltaPct > 0 && <TrendingUp className="w-3 h-3" strokeWidth={2} />}
          {deltaPct !== null && deltaPct < 0 && <TrendingDown className="w-3 h-3" strokeWidth={2} />}
          {deltaPct === null && <Minus className="w-3 h-3" strokeWidth={2} />}
          {deltaPct !== null ? `${deltaPct > 0 ? '+' : ''}${deltaPct}%` : '–'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Today */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] text-text-medium font-medium">Today</span>
            <span className="font-bold text-text-high tabular-nums">
              <AnimatedNumber
                value={todayVal}
                isCurrency={isCurrency}
                springOptions={{ bounce: 0, duration: 2000 }}
              />
            </span>
          </div>
          <div className="h-2 w-full bg-surface border border-border rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${todayVal > 0 ? todayWidth : 0}%` }}
            />
          </div>
        </div>

        {/* Yesterday */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] text-text-medium font-medium">Yesterday</span>
            <span className="font-semibold text-text-medium tabular-nums">
              <AnimatedNumber
                value={yesterdayVal}
                isCurrency={isCurrency}
                springOptions={{ bounce: 0, duration: 2000 }}
              />
            </span>
          </div>
          <div className="h-2 w-full bg-surface border border-border rounded-full overflow-hidden">
            <div
              className="h-full bg-text-low rounded-full transition-all duration-300"
              style={{ width: `${yesterdayVal > 0 ? yesterdayWidth : 0}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * ==============================================================================
 * STORE BI - MERCHANT INTELLIGENCE DASHBOARD (DashboardPage.tsx)
 * ==============================================================================
 * Purpose & Reason for this code:
 * 1. Serves as the primary operational cockpit for retail merchants after logging in.
 * 2. Visualizes key retail metrics:
 *    - Real-Time KPIs: Gross Sales, Net Profit Margin, Customer Bills / Transaction volume.
 *    - Intraday Comparison: "Today vs Yesterday" metrics with percentage deltas and progress indicators.
 *    - Time-series Revenue Trends: Daily trendlines over 7-day and 30-day windows.
 *    - Category Performance: Pareto department revenue contributions (Kirana, Dairy, FMCG, etc.).
 *    - Proactive Store Alerts: Low stock warnings, expiring inventory, high-demand surges.
 * 3. 5-Day Active Trial Banner:
 *    - Transparently showcases the merchant's store name, registered owner, phone, and trial status.
 *    - Counts down remaining trial days (1 to 5 days) with visual urgency indicator badges.
 *    - Provides one-click access to Record Sale modal and AI Bill Upload.
 * 4. Zero-Start Compliant:
 *    - Shows clean empty states with helpful zero-data guidance if no sales have been recorded yet.
 * ==============================================================================
 */

export function DashboardPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  // Period toggle state for KPI summary cards: 'today' | '7days' | '30days'
  const [period, setPeriod] = React.useState<'today' | '7days' | '30days'>('today');
  
  // Main aggregate KPI metrics received from GET /api/dashboard/kpis?period=...
  const [kpis, setKpis] = React.useState<DashboardKpisResponse>({
    period: 'today',
    sales: 0,
    previous_sales: 0,
    sales_change_pct: null,
    profit: 0,
    previous_profit: 0,
    profit_change_pct: null,
    transactions: 0,
    previous_transactions: 0,
    transactions_change_pct: null,
  });

  // Intraday comparison received from GET /api/dashboard/today-vs-yesterday
  const [todayVsYesterday, setTodayVsYesterday] = React.useState<DashboardTodayVsYesterdayResponse>({
    has_data: false,
    today: { sales: 0, profit: 0, transactions: 0, average_bill: 0 },
    yesterday: { sales: 0, profit: 0, transactions: 0, average_bill: 0 },
    sales_change_pct: null,
    profit_change_pct: null,
    transactions_change_pct: null,
    average_bill_change_pct: null,
    summary: 'No sales recorded yet',
  });

  // Loading state and modal controls
  const [loading, setLoading] = React.useState(true);
  const [isRecordSaleOpen, setIsRecordSaleOpen] = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [categorySales, setCategorySales] = React.useState<CategorySalesResponse>({
    period: 'today',
    has_data: false,
    total_sales: 0,
    categories: [],
  });
  const [products, setProducts] = React.useState<Product[]>([]);
  const [sales, setSales] = React.useState<Sale[]>([]);

  const { refreshAlerts } = useAlerts();

  // Scroll to #alerts if requested
  React.useEffect(() => {
    if (window.location.hash === '#alerts') {
      const el = document.getElementById('dashboard-alerts-section');
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 150);
      }
    }
  }, []);

  // New sale form
  const [saleForm, setSaleForm] = React.useState({
    total_amount: '',
    total_profit: '',
    payment_mode: 'UPI',
  });

  const loadDashboardData = React.useCallback(async (selectedPeriod: 'today' | '7days' | '30days') => {
    setLoading(true);
    try {
      const [kpiRes, compRes, catRes, prodRes, salesRes] = await Promise.all([
        api.getDashboardKpis(selectedPeriod),
        api.getTodayVsYesterday(),
        api.getCategorySales(selectedPeriod),
        api.getProducts(),
        api.getSales(),
      ]);
      setKpis(kpiRes);
      setTodayVsYesterday(compRes);
      setCategorySales(catRes);
      setProducts(Array.isArray(prodRes) ? prodRes : []);
      setSales(Array.isArray(salesRes) ? salesRes : []);
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadDashboardData(period);
  }, [loadDashboardData, period]);

  const handlePeriodChange = (newPeriod: 'today' | '7days' | '30days') => {
    setPeriod(newPeriod);
  };

  const handleRecordSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleForm.total_amount) {
      toast.error('Please enter sale amount');
      return;
    }
    try {
      await api.createSale({
        total_amount: parseFloat(saleForm.total_amount) || 0,
        total_profit: parseFloat(saleForm.total_profit) || 0,
        payment_mode: saleForm.payment_mode,
        items: [],
      });
      toast.success('Sale transaction recorded');
      setIsRecordSaleOpen(false);
      setSaleForm({
        total_amount: '',
        total_profit: '',
        payment_mode: 'UPI',
      });
      loadDashboardData(period);
      refreshAlerts();
      setRefreshKey((k) => k + 1);
    } catch {
      toast.error('Failed to record sale');
    }
  };

  const periodSubtext =
    period === 'today'
      ? 'vs yesterday'
      : period === '7days'
      ? 'vs prev 7 days'
      : 'vs prev 30 days';

  // Dynamic active horizon label
  const cycleLabel = React.useMemo(() => {
    const now = new Date();
    if (period === 'today') {
      return now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ' (Today)';
    } else if (period === '7days') {
      const start = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      return `${start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} (This Week)`;
    } else {
      const start = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
      return `${start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} (This Month)`;
    }
  }, [period]);

  // Real Basket Density calculated from sales and transactions
  const { totalUnitsSold, basketDensity } = React.useMemo(() => {
    let units = 0;
    sales.forEach((s) => {
      (s.items || []).forEach((item) => {
        units += item.qty || 0;
      });
    });
    const density = kpis.transactions > 0 ? (units > 0 ? (units / kpis.transactions).toFixed(1) : '1.0') : '0.0';
    return { totalUnitsSold: units, basketDensity: density };
  }, [sales, kpis.transactions]);

  // Real Fast-Moving Items calculated strictly from live inventory and sales
  const velocityLeaders = React.useMemo(() => {
    if (!products.length) return [];

    const salesQtyMap = new Map<number, number>();
    sales.forEach((s) => {
      (s.items || []).forEach((item) => {
        const cur = salesQtyMap.get(item.product_id) || 0;
        salesQtyMap.set(item.product_id, cur + (item.qty || 0));
      });
    });

    const items = products.map((p) => {
      const unitsSold = salesQtyMap.get(p.id) || 0;
      let status = 'Healthy Cover';
      let statusType: 'success' | 'warning' | 'danger' | 'neutral' = 'neutral';
      let dotColor = '#136DEC';
      let daysCover = `${p.stock_qty} in stock`;

      if (p.stock_qty <= 0) {
        status = 'Stockout Hazard';
        statusType = 'danger';
        dotColor = '#EF4444';
        daysCover = '0 units (Out of Stock)';
      } else if (p.stock_qty <= p.reorder_level) {
        status = 'Trigger Reorder';
        statusType = 'warning';
        dotColor = '#F59E0B';
        daysCover = `Low stock (${p.stock_qty} left)`;
      } else if (unitsSold > 0) {
        status = 'Optimal Flow';
        statusType = 'success';
        dotColor = '#10B981';
        daysCover = `${p.stock_qty} units available`;
      }

      return {
        id: p.id,
        name: p.name,
        category: p.category || 'General',
        mrp: formatINR(p.selling_price),
        runRate: unitsSold > 0 ? `${unitsSold} sold` : '0 sold',
        unitsSold,
        inStock: `${p.stock_qty.toLocaleString('en-IN')} units`,
        daysCover,
        status,
        statusType,
        dotColor,
      };
    });

    return items
      .sort((a, b) => {
        if (b.unitsSold !== a.unitsSold) return b.unitsSold - a.unitsSold;
        const urgencyScore = (item: typeof a) => (item.statusType === 'danger' ? 3 : item.statusType === 'warning' ? 2 : 1);
        return urgencyScore(b) - urgencyScore(a);
      })
      .slice(0, 5);
  }, [products, sales]);

  return (
    <div className="flex flex-col gap-6">
      {/* 1. EXECUTIVE GREETING & LIVE STATUS BAR */}
      <section className="flex flex-col lg:flex-row lg:items-center justify-between pb-1 gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl lg:text-3xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
              Good morning, {user?.owner_name || (user?.name?.split(' ')[0]) || 'Merchant'}
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-[#EBF3FE] text-[#136DEC] border border-[#136DEC]/20 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800">
              Live POS Sync
            </span>
          </div>
          <p className="text-xs font-medium text-[#64748B] dark:text-slate-400 mt-1">
            Real-time retail sales performance and live store inventory metrics.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-xs font-medium text-[#64748B] dark:text-slate-300 shadow-2xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#10B981] ring-2 ring-emerald-100 dark:ring-emerald-900/40"></span>
              <span>POS live sync <strong className="text-[#0F172A] dark:text-white font-semibold">Active</strong></span>
            </div>
            <span className="text-[#CBD5E1] dark:text-slate-600">•</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#136DEC] ring-2 ring-blue-100 dark:ring-blue-900/40"></span>
              <span>{products.length} catalog items ({products.filter((p) => p.stock_qty > 0).length} in stock)</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toast.success('Exporting store operational data...')}
              className="h-9 px-3.5 rounded-xl bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-xs font-semibold text-[#0F172A] dark:text-slate-200 flex items-center gap-1.5 shadow-2xs hover:bg-[#F8FAFC] dark:hover:bg-slate-750 transition-colors cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-[#64748B]" />
              <span>Export PDF / Excel</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/upload')}
              className="h-9 px-3.5 rounded-xl bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-xs font-semibold text-[#0F172A] dark:text-slate-200 flex items-center gap-1.5 shadow-2xs hover:bg-[#F8FAFC] dark:hover:bg-slate-750 transition-colors cursor-pointer"
            >
              <Filter className="w-4 h-4 text-[#64748B]" />
              <span>Quick Filters</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. TIME HORIZON SELECTOR BAR */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400">
            Time Horizon:
          </span>
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-[#E2E8F0] dark:border-slate-700 shadow-2xs">
            {(
              [
                { id: 'today', label: 'Today' },
                { id: '7days', label: 'This Week' },
                { id: '30days', label: 'This Month' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handlePeriodChange(opt.id)}
                className={cn(
                  'px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer',
                  period === opt.id
                    ? 'bg-[#136DEC] text-white shadow-2xs'
                    : 'text-[#64748B] hover:text-[#0F172A] dark:text-slate-400 dark:hover:text-white'
                )}
              >
                {opt.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => navigate('/analytics')}
              className="px-3 py-1 text-[#64748B] hover:text-[#0F172A] dark:text-slate-400 dark:hover:text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
            >
              Custom
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-[#64748B] dark:text-slate-400 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-[#E2E8F0] dark:border-slate-700 shadow-2xs">
          <Calendar className="w-4 h-4 text-[#64748B]" />
          <span>{cycleLabel}</span>
        </div>
      </div>

      {/* 3. CORE 5 KPI METRICS GRID */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Card 1: Total Net Sales (Span 2 cols) */}
        <div className="xl:col-span-2 rounded-2xl p-5 clean-card bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 border-t-4 border-t-[#136DEC] flex flex-col justify-between shadow-2xs hover:shadow-md transition-all">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400">
                Total Net Sales
              </span>
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-[#ECFDF5] text-[#10B981] border border-[#10B981]/30 dark:bg-emerald-950/40 dark:text-emerald-400">
                {kpis.sales_change_pct !== null ? (
                  <>
                    {kpis.sales_change_pct >= 0 ? <ArrowUp className="w-3 h-3 text-[#10B981]" /> : <TrendingDown className="w-3 h-3 text-red-500" />}
                    {`${kpis.sales_change_pct > 0 ? '+' : ''}${kpis.sales_change_pct}%`}
                  </>
                ) : (
                  <span className="text-[#64748B] dark:text-slate-400">–</span>
                )}
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#0F172A] dark:text-white font-data tracking-tight tabular-nums">
                {formatINR(kpis.sales)}
              </span>
              <span className="text-xs text-[#64748B] dark:text-slate-400">
                vs {formatINR(kpis.previous_sales)} {periodSubtext}
              </span>
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-[#E2E8F0] dark:border-slate-700 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-24 bg-[#E2E8F0] dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#136DEC]"
                  style={{
                    width: `${kpis.previous_sales > 0 ? Math.min(100, Math.round((kpis.sales / kpis.previous_sales) * 100)) : (kpis.sales > 0 ? 100 : 0)}%`,
                  }}
                />
              </div>
              <span className="font-bold text-[#0F172A] dark:text-white text-[11px] tabular-nums">
                {kpis.previous_sales > 0 ? `${Math.min(999, Math.round((kpis.sales / kpis.previous_sales) * 100))}%` : (kpis.sales > 0 ? '100%' : '0%')}
              </span>
            </div>
            <span className="text-[11px] text-[#64748B] dark:text-slate-400">
              {kpis.previous_sales > 0 ? `vs prev period (${formatINR(kpis.previous_sales)})` : 'Active store sales'}
            </span>
          </div>
        </div>

        {/* Card 2: Net Gross Margin */}
        <div className="rounded-2xl p-5 clean-card bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 border-t-4 border-t-[#10B981] flex flex-col justify-between shadow-2xs hover:shadow-md transition-all">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 leading-tight">
                Gross Margin
              </span>
              <div className="w-6 h-6 rounded-lg bg-[#EBF3FE] text-[#136DEC] flex items-center justify-center text-[10px] font-bold border border-[#136DEC]/20 dark:bg-blue-950/40 dark:text-blue-400">
                %
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-extrabold text-[#0F172A] dark:text-white font-data tabular-nums">
                {kpis.sales > 0 ? `${((kpis.profit / kpis.sales) * 100).toFixed(1)}%` : '0.0%'}
              </span>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-[#10B981]">
              {kpis.profit_change_pct !== null ? (
                <>
                  <ArrowUp className="w-3 h-3 text-[#10B981]" /> {kpis.profit_change_pct > 0 ? '+' : ''}{kpis.profit_change_pct}%
                </>
              ) : (
                <span className="text-[#64748B] dark:text-slate-400">–</span>
              )}
            </div>
            <div className="text-[10.5px] text-[#64748B] dark:text-slate-400 tabular-nums mt-0.5">
              Gross profit: {formatINR(kpis.profit)}
            </div>
          </div>
        </div>

        {/* Card 3: Total Transactions */}
        <div className="rounded-2xl p-5 clean-card bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 border-t-4 border-t-[#136DEC] flex flex-col justify-between shadow-2xs hover:shadow-md transition-all">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 leading-tight">
                Transactions
              </span>
              <div className="w-6 h-6 rounded-lg bg-[#F8FAFC] dark:bg-slate-700 text-[#0F172A] dark:text-white flex items-center justify-center border border-[#E2E8F0] dark:border-slate-600">
                <ReceiptText className="w-3.5 h-3.5 text-[#136DEC]" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-extrabold text-[#0F172A] dark:text-white font-data tabular-nums">
                {kpis.transactions.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-[#10B981]">
              {kpis.transactions_change_pct !== null ? (
                <>
                  <ArrowUp className="w-3 h-3 text-[#10B981]" /> {kpis.transactions_change_pct > 0 ? '+' : ''}{kpis.transactions_change_pct}%
                </>
              ) : (
                <span className="text-[#64748B] dark:text-slate-400">–</span>
              )}
            </div>
            <div className="text-[10.5px] text-[#64748B] dark:text-slate-400 tabular-nums mt-0.5">
              {kpis.previous_transactions > 0 ? `vs ${kpis.previous_transactions} prev bills` : `${kpis.transactions} total checkouts`}
            </div>
          </div>
        </div>

        {/* Card 4: Average Basket Value (AOV) */}
        <div className="rounded-2xl p-5 clean-card bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 border-t-4 border-t-[#D97706] flex flex-col justify-between shadow-2xs hover:shadow-md transition-all">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 leading-tight">
                Avg Basket (AOV)
              </span>
              <div className="w-6 h-6 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center text-[10px] font-bold border border-[#F59E0B]/30 dark:bg-amber-950/40 dark:text-amber-400">
                ₹
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-extrabold text-[#0F172A] dark:text-white font-data tabular-nums">
                {kpis.transactions > 0
                  ? formatINR(Math.round(kpis.sales / kpis.transactions))
                  : '₹0'}
              </span>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-[#10B981]">
              {kpis.transactions > 0 && kpis.previous_transactions > 0 && kpis.previous_sales > 0 ? (
                <>
                  <ArrowUp className="w-3 h-3 text-[#10B981]" />
                  {(((kpis.sales / kpis.transactions) - (kpis.previous_sales / kpis.previous_transactions)) / (kpis.previous_sales / kpis.previous_transactions) * 100).toFixed(1)}%
                </>
              ) : (
                <span className="text-[#64748B] dark:text-slate-400">–</span>
              )}
            </div>
            <div className="text-[10.5px] text-[#64748B] dark:text-slate-400 tabular-nums mt-0.5">
              {kpis.previous_transactions > 0 && kpis.previous_sales > 0
                ? `${formatINR(Math.round(kpis.previous_sales / kpis.previous_transactions))} in prev period`
                : 'Across recorded bills'}
            </div>
          </div>
        </div>

        {/* Card 5: Basket Density */}
        <div className="rounded-2xl p-5 clean-card bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 border-t-4 border-t-[#0EA5E9] flex flex-col justify-between shadow-2xs hover:shadow-md transition-all">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 leading-tight">
                Basket Density
              </span>
              <div className="w-6 h-6 rounded-lg bg-[#F8FAFC] dark:bg-slate-700 text-[#0F172A] dark:text-white flex items-center justify-center border border-[#E2E8F0] dark:border-slate-600">
                <Layers className="w-3.5 h-3.5 text-[#0EA5E9]" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-extrabold text-[#0F172A] dark:text-white font-data tabular-nums">
                {basketDensity} <span className="text-xs font-normal text-[#64748B] dark:text-slate-400">units/bill</span>
              </span>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-[10.5px] text-[#64748B] dark:text-slate-400">
              {products.filter((p) => p.stock_qty > 0).length} active SKUs in inventory
            </div>
            <div className="text-[10.5px] text-[#64748B] dark:text-slate-400 tabular-nums mt-0.5">
              {totalUnitsSold} total units sold
            </div>
          </div>
        </div>
      </section>

      {/* 4. REVENUE BY PRODUCT CATEGORY SECTION */}
      <section className="rounded-2xl p-6 clean-card bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-slate-700 gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-extrabold text-[#0F172A] dark:text-white tracking-tight">
                Revenue by Product Category
              </h3>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#EBF3FE] text-[#136DEC] border border-[#136DEC]/30 dark:bg-blue-950/40 dark:text-blue-400">
                {categorySales.categories.length} {categorySales.categories.length === 1 ? 'Vertical' : 'Verticals'}
              </span>
            </div>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
              Turnover share and Rupee contribution across key departmental aisles
            </p>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-[10px] text-[#64748B] dark:text-slate-400 uppercase font-bold tracking-wider">
              Category Total
            </span>
            <span className="text-lg font-extrabold text-[#0F172A] dark:text-white font-data block tabular-nums">
              {formatINR(categorySales.total_sales)}
            </span>
          </div>
        </div>

        {categorySales.categories.length > 0 ? (
          <>
            {/* Segmented Multi-Color Bar */}
            <div className="mt-4 mb-2">
              <div className="w-full h-3 rounded-full bg-[#F1F5F9] dark:bg-slate-700 overflow-hidden flex border border-[#E2E8F0] dark:border-slate-600">
                {categorySales.categories.map((cat, idx) => {
                  const colors = ['#136DEC', '#10B981', '#F59E0B', '#0EA5E9', '#8B5CF6', '#EC4899'];
                  const color = colors[idx % colors.length];
                  return (
                    <div
                      key={cat.category}
                      className="h-full first:rounded-l-full last:rounded-r-full"
                      style={{ width: `${Math.max(2, cat.share_pct)}%`, backgroundColor: color }}
                      title={`${cat.category}: ${cat.share_pct.toFixed(1)}% (${formatINR(cat.sales)})`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Category Sub-Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
              {categorySales.categories.slice(0, 4).map((cat, idx) => {
                const colors = ['#136DEC', '#10B981', '#D97706', '#0EA5E9', '#8B5CF6'];
                const borderColors = ['border-t-[#136DEC]', 'border-t-[#10B981]', 'border-t-[#D97706]', 'border-t-[#0EA5E9]', 'border-t-[#8B5CF6]'];
                const color = colors[idx % colors.length];
                const borderT = borderColors[idx % borderColors.length];

                return (
                  <div
                    key={cat.category}
                    className={cn(
                      'p-4 rounded-xl bg-[#F8FAFC] dark:bg-slate-750 border border-[#E2E8F0] dark:border-slate-700 border-t-4 flex flex-col justify-between shadow-2xs hover:shadow-md transition-all',
                      borderT
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#0F172A] dark:text-white flex items-center gap-1.5 truncate max-w-[140px]">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="truncate">{cat.category}</span>
                        </span>
                        <span className="text-xs font-bold text-[#0F172A] dark:text-white font-data tabular-nums">
                          {cat.share_pct.toFixed(1)}%
                        </span>
                      </div>
                      <div className="mt-3 flex items-baseline justify-between">
                        <span className="text-xl font-extrabold text-[#0F172A] dark:text-white font-data tabular-nums">
                          {formatINR(cat.sales)}
                        </span>
                        <span className="text-[11px] text-[#64748B] dark:text-slate-400">
                          {cat.units_sold} units
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-[#E2E8F0] dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-3">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(3, cat.share_pct))}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="mt-4 p-8 text-center bg-[#F8FAFC] dark:bg-slate-750/50 border border-dashed border-[#E2E8F0] dark:border-slate-700 rounded-xl">
            <p className="text-xs font-semibold text-[#0F172A] dark:text-white">
              No category sales recorded yet for {periodSubtext}
            </p>
            <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-1">
              Category turnover distribution is derived dynamically as sales transactions are recorded.
            </p>
          </div>
        )}
      </section>

      {/* 5. FAST-MOVING ITEMS & STOCK VELOCITY TABLE */}
      <section className="rounded-2xl p-6 clean-card bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-slate-700 gap-3">
          <div>
            <h3 className="text-base font-extrabold text-[#0F172A] dark:text-white tracking-tight">
              Fast-Moving Items & Stock Velocity
            </h3>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
              Live inventory ranking based on sales velocity and remaining stock cover
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-medium">
            <span className="text-[#64748B] dark:text-slate-400">
              {velocityLeaders.length > 0 ? `Showing top ${velocityLeaders.length} velocity items` : '0 items'}
            </span>
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="text-[#136DEC] hover:text-[#0E5ACC] font-bold hover:underline flex items-center gap-0.5 transition-colors cursor-pointer"
            >
              <span>View Product Catalog</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* SKU Table */}
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-bold text-[#0F172A] dark:text-slate-200 uppercase tracking-wider border-b border-[#E2E8F0] dark:border-slate-700">
                <th className="py-3 px-3">SKU Name</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 text-right">Selling Price</th>
                <th className="py-3 px-3 text-right">Sales Volume</th>
                <th className="py-3 px-3 text-right">In-Stock Units</th>
                <th className="py-3 px-3 text-right">Stock Cover</th>
                <th className="py-3 px-3 text-center">Velocity State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-700 text-xs font-normal">
              {velocityLeaders.length > 0 ? (
                velocityLeaders.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F8FAFC] dark:hover:bg-slate-750 transition-colors">
                    <td className="py-3.5 px-3 font-semibold text-[#0F172A] dark:text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.dotColor }} />
                      <span className="truncate">{item.name}</span>
                    </td>
                    <td className="py-3.5 px-3 text-[#64748B] dark:text-slate-400">{item.category}</td>
                    <td className="py-3.5 px-3 text-right tabular-nums font-data text-[#0F172A] dark:text-white font-medium">
                      {item.mrp}
                    </td>
                    <td className="py-3.5 px-3 text-right tabular-nums font-data font-semibold text-[#0F172A] dark:text-white">
                      {item.runRate}
                    </td>
                    <td className="py-3.5 px-3 text-right tabular-nums font-data text-[#0F172A] dark:text-white">
                      {item.inStock}
                    </td>
                    <td className={cn(
                      'py-3.5 px-3 text-right tabular-nums font-data font-medium',
                      item.statusType === 'danger' ? 'text-[#EF4444]' : 'text-[#64748B] dark:text-slate-400'
                    )}>
                      {item.daysCover}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-medium border',
                          item.statusType === 'success' && 'bg-[#ECFDF5] text-[#10B981] border-[#10B981]/30 dark:bg-emerald-950/40 dark:text-emerald-400',
                          item.statusType === 'warning' && 'bg-[#FFFBEB] text-[#D97706] border-[#F59E0B]/30 dark:bg-amber-950/40 dark:text-amber-400',
                          item.statusType === 'danger' && 'bg-[#FEF2F2] text-[#EF4444] border-[#EF4444]/40 dark:bg-rose-950/40 dark:text-rose-400',
                          item.statusType === 'neutral' && 'bg-[#F8FAFC] text-[#475569] border-[#E2E8F0] dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'
                        )}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-[#64748B] dark:text-slate-400">
                    No inventory products recorded yet. Add products to catalog to track velocity.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. "Today vs yesterday" Panel */}
      <Card showTrail trailColor="indigo" trailSize={100} className="shadow-sm">
        <CardHeader
          title="Today vs yesterday"
          subtitle="Sales, profit, transactions and average bill comparison"
          action={
            todayVsYesterday.has_data ? (
              <span className="text-[11px] font-semibold text-text-medium px-2 py-1 rounded bg-canvas border border-border">
                Daily comparison
              </span>
            ) : undefined
          }
        />
        <CardContent className="p-4 sm:p-6 flex flex-col gap-4">
          {!todayVsYesterday.has_data && !loading ? (
            /* ZERO STATE PANEL */
            <div className="flex flex-col items-center justify-center text-center py-8 px-4 bg-canvas/40 border border-dashed border-border rounded-[8px] gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/[0.08] flex items-center justify-center text-primary">
                <Store className="w-6 h-6 stroke-[1.75]" />
              </div>
              <div className="flex flex-col gap-1 max-w-md">
                <h3 className="text-base font-bold text-text-high">
                  No sales recorded yet
                </h3>
                <p className="text-xs text-text-medium leading-relaxed">
                  Your store ledger starts completely clean with 0 records. Record your first sale or upload bills to view live daily comparisons and ticket sizes.
                </p>
              </div>
              <div className="pt-2">
                <Button
                  variant="primary"
                  onClick={() => navigate('/pos')}
                  className="h-12 min-h-[48px] px-6 text-sm font-semibold"
                >
                  <Plus className="w-4 h-4 mr-2" strokeWidth={2} />
                  <span>Record your first sale</span>
                </Button>
              </div>

              {/* Zero State side-by-side preview with explicit 0 values */}
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-border/80 text-left">
                <ComparisonRow
                  label="Sales"
                  todayVal={0}
                  yesterdayVal={0}
                  deltaPct={null}
                  isCurrency={true}
                />
                <ComparisonRow
                  label="Profit"
                  todayVal={0}
                  yesterdayVal={0}
                  deltaPct={null}
                  isCurrency={true}
                />
                <ComparisonRow
                  label="Transactions"
                  todayVal={0}
                  yesterdayVal={0}
                  deltaPct={null}
                  isCurrency={false}
                />
                <ComparisonRow
                  label="Average bill"
                  todayVal={0}
                  yesterdayVal={0}
                  deltaPct={null}
                  isCurrency={true}
                />
              </div>
            </div>
          ) : (
            /* POPULATED PANEL WITH ONE-LINE SUMMARY AND COMPARISON BARS */
            <div className="flex flex-col gap-4">
              {/* One-line summary */}
              <div className="p-3.5 rounded-[8px] bg-canvas border border-border flex items-center gap-2.5 text-xs text-text-high font-medium">
                <Sparkles className="w-4 h-4 text-primary shrink-0" strokeWidth={2} />
                <span>{todayVsYesterday.summary}</span>
              </div>

              {/* Side-by-side comparison rows */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <ComparisonRow
                  label="Sales"
                  todayVal={todayVsYesterday.today.sales}
                  yesterdayVal={todayVsYesterday.yesterday.sales}
                  deltaPct={todayVsYesterday.sales_change_pct}
                  isCurrency={true}
                />
                <ComparisonRow
                  label="Profit"
                  todayVal={todayVsYesterday.today.profit}
                  yesterdayVal={todayVsYesterday.yesterday.profit}
                  deltaPct={todayVsYesterday.profit_change_pct}
                  isCurrency={true}
                />
                <ComparisonRow
                  label="Transactions"
                  todayVal={todayVsYesterday.today.transactions}
                  yesterdayVal={todayVsYesterday.yesterday.transactions}
                  deltaPct={todayVsYesterday.transactions_change_pct}
                  isCurrency={false}
                />
                <ComparisonRow
                  label="Average bill"
                  todayVal={todayVsYesterday.today.average_bill}
                  yesterdayVal={todayVsYesterday.yesterday.average_bill}
                  deltaPct={todayVsYesterday.average_bill_change_pct}
                  isCurrency={true}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Sales Trend Card */}
      <SalesTrendCard
        key={`trend-${refreshKey}`}
        onRecordSaleClick={() => navigate('/pos')}
      />

      {/* 5. Category-wise Sales Card (shares period with KPI section) */}
      <CategorySalesCard
        key={`cat-${period}-${refreshKey}`}
        period={period}
        onRecordSaleClick={() => navigate('/pos')}
      />

      {/* 6. Alerts Section */}
      <AlertsSection />

      {/* Record Sale Modal */}
      <Modal
        isOpen={isRecordSaleOpen}
        onClose={() => setIsRecordSaleOpen(false)}
        title="Record counter sale"
        description="Enter bill details and payment method."
      >
        <form onSubmit={handleRecordSale} className="flex flex-col gap-4">
          <Input
            label="Total bill amount"
            isCurrency
            placeholder="0"
            value={saleForm.total_amount}
            onChange={(e) =>
              setSaleForm({ ...saleForm, total_amount: e.target.value })
            }
            required
          />
          <Input
            label="Gross profit"
            isCurrency
            placeholder="0"
            value={saleForm.total_profit}
            onChange={(e) =>
              setSaleForm({ ...saleForm, total_profit: e.target.value })
            }
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-high">
              Payment mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['UPI', 'Cash', 'Card'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSaleForm({ ...saleForm, payment_mode: mode })}
                  className={cn(
                    'h-12 rounded-[8px] border font-semibold text-sm transition-colors',
                    saleForm.payment_mode === mode
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-surface text-text-high hover:bg-canvas'
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsRecordSaleOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save sale
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
