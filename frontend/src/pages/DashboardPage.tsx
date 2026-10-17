import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  Upload,
  Sparkles,
  ReceiptText,
  Store,
} from 'lucide-react';
import { StatCard } from '../components/ui/StatCard';
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
} from '../api/client';
import { useToast } from '../components/ui/Toast';
import { useAlerts } from '../context/AlertsContext';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/ui/Badge';
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
  
  // Calculate remaining days on merchant's active 5-day trial period
  const trialDays = user?.trial_days_left ?? 5;

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
      const [kpiRes, compRes] = await Promise.all([
        api.getDashboardKpis(selectedPeriod),
        api.getTodayVsYesterday(),
      ]);
      setKpis(kpiRes);
      setTodayVsYesterday(compRes);
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

  return (
    <div className="flex flex-col gap-6">
      {/* 0. Merchant User 5-Day Trial Status Banner */}
      <div className="p-4 sm:p-5 rounded-[8px] bg-surface border border-primary/25 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-[8px] bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shrink-0 shadow-card">
            <Store className="w-6 h-6" strokeWidth={2} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-text-high">
                {user?.name || 'My Store'}
              </h2>
              <Badge
                variant={trialDays <= 1 ? 'warning' : 'success'}
                dot
                className="text-xs font-semibold"
              >
                5-Day Trial Active ({trialDays} {trialDays === 1 ? 'day' : 'days'} left)
              </Badge>
              {user?.owner_name && (
                <span className="text-xs text-text-medium font-medium">
                  • Owner: {user.owner_name}
                </span>
              )}
              {user?.phone && (
                <span className="text-xs text-text-medium font-mono">
                  • +91 {user.phone}
                </span>
              )}
            </div>
            <p className="text-xs text-text-medium mt-1">
              Full enterprise access active. Manage POS billing, AI invoice OCR extraction, SKU net margins, and inventory health.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="secondary"
            onClick={() => navigate('/upload')}
            className="text-xs min-h-[44px] h-11 px-3.5"
          >
            <Upload className="w-4 h-4" strokeWidth={2} />
            <span>Upload Bills</span>
          </Button>
          <Button
            variant="primary"
            onClick={() => navigate('/pos')}
            className="text-xs min-h-[44px] h-11 px-3.5"
          >
            <ReceiptText className="w-4 h-4" strokeWidth={2} />
            <span>POS Counter</span>
          </Button>
        </div>
      </div>

      {/* 1. Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-high">Store Performance Dashboard</h1>
          <p className="text-sm text-text-medium mt-0.5">
            Real-time business performance and retail health indicators.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate('/upload')}
            className="text-xs min-h-[48px] px-4"
          >
            <Upload className="w-4 h-4" strokeWidth={2} />
            <span>Inventory management</span>
          </Button>
          <Button
            variant="primary"
            onClick={() => navigate('/pos')}
            className="text-xs min-h-[48px] px-4"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            <span>Record sale</span>
          </Button>
        </div>
      </div>

      {/* 2. Top KPI Cards Section with Period Toggle */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-text-high">Business metrics</span>
            <span className="text-xs text-text-medium">• {periodSubtext}</span>
          </div>

          {/* Period Toggle: Today | 7 days | 30 days */}
          <div
            className="inline-flex items-center p-1 rounded-[8px] bg-canvas border border-border self-start sm:self-auto"
            role="group"
            aria-label="Select KPI period"
          >
            {(
              [
                { id: 'today', label: 'Today' },
                { id: '7days', label: '7 days' },
                { id: '30days', label: '30 days' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handlePeriodChange(opt.id)}
                className={cn(
                  'px-3.5 py-2.5 rounded-[6px] text-xs font-semibold transition-colors min-h-[48px] flex items-center justify-center',
                  period === opt.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-text-medium hover:text-text-high hover:bg-surface'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Three KPI Cards (Sales, Profit, Number of transactions) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Sales */}
          <StatCard
            label="Sales"
            value={formatINR(kpis.sales)}
            numericValue={kpis.sales}
            isCurrency
            trendText={
              kpis.sales_change_pct !== null
                ? `${kpis.sales_change_pct > 0 ? '+' : ''}${kpis.sales_change_pct}%`
                : '–'
            }
            subtext={periodSubtext}
            icon={<IndianRupee className="w-4 h-4 text-primary" strokeWidth={2} />}
          />

          {/* Card 2: Profit */}
          <StatCard
            label="Profit"
            value={formatINR(kpis.profit)}
            numericValue={kpis.profit}
            isCurrency
            trendText={
              kpis.profit_change_pct !== null
                ? `${kpis.profit_change_pct > 0 ? '+' : ''}${kpis.profit_change_pct}%`
                : '–'
            }
            subtext={periodSubtext}
            icon={<TrendingUp className="w-4 h-4 text-secondary" strokeWidth={2} />}
          />

          {/* Card 3: Number of transactions */}
          <StatCard
            label="Number of transactions"
            value={kpis.transactions.toLocaleString('en-IN')}
            numericValue={kpis.transactions}
            trendText={
              kpis.transactions_change_pct !== null
                ? `${kpis.transactions_change_pct > 0 ? '+' : ''}${kpis.transactions_change_pct}%`
                : '–'
            }
            subtext={periodSubtext}
            icon={<ReceiptText className="w-4 h-4 text-text-medium" strokeWidth={2} />}
          />
        </div>
      </div>

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
