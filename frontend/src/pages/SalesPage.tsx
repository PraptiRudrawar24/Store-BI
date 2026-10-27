import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download,
  Plus,
  ArrowRight,
  Receipt,
  Wallet,
  ShoppingBasket,
  Lightbulb,
  CreditCard,
  TrendingUp,
} from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { formatINR } from '../utils';
import {
  api,
  type Sale,
  type SalesTrendResponse,
  type CategorySalesResponse,
} from '../api/client';
import { useToast } from '../components/ui/Toast';

export function SalesPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [sales, setSales] = React.useState<Sale[]>([]);
  const [categorySales, setCategorySales] = React.useState<CategorySalesResponse | null>(null);
  const [salesTrend, setSalesTrend] = React.useState<SalesTrendResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [activePeriod, setActivePeriod] = React.useState<'today' | 'week' | 'month' | 'custom'>('month');
  const [trendAggregation, setTrendAggregation] = React.useState<'daily' | 'weekly' | 'monthly'>('daily');

  const [form, setForm] = React.useState({
    total_amount: '',
    total_profit: '',
    payment_mode: 'UPI',
  });

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const catPeriod = activePeriod === 'today' ? 'today' : activePeriod === 'week' ? '7days' : '30days';
      const trendGranularity = trendAggregation === 'weekly' ? 'weekly' : 'daily';

      const [salesList, catData, trendData] = await Promise.all([
        api.getSales(),
        api.getCategorySales(catPeriod),
        api.getSalesTrend(trendGranularity),
      ]);

      setSales(salesList);
      setCategorySales(catData);
      setSalesTrend(trendData);
    } catch {
      toast.error('Failed to load sales data');
    } finally {
      setLoading(false);
    }
  }, [activePeriod, trendAggregation, toast]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.total_amount) {
      toast.error('Bill amount is required');
      return;
    }
    try {
      await api.createSale({
        total_amount: parseFloat(form.total_amount) || 0,
        total_profit: parseFloat(form.total_profit) || 0,
        payment_mode: form.payment_mode,
        items: [],
      });
      toast.success('Sale transaction recorded');
      setIsAddOpen(false);
      setForm({
        total_amount: '',
        total_profit: '',
        payment_mode: 'UPI',
      });
      loadData();
    } catch {
      toast.error('Failed to record sale');
    }
  };

  // 100% dynamic calculations derived strictly from live database sales records
  const calculatedTotals = React.useMemo(() => {
    if (!sales.length) {
      return {
        totalSales: '₹0',
        totalProfit: '₹0',
        transactions: '0',
        avgTicket: '₹0',
        rawSales: 0,
        rawProfit: 0,
        rawCount: 0,
        marginPct: '0.0',
      };
    }
    const sumSales = sales.reduce((acc, s) => acc + (s.total_amount || 0), 0);
    const sumProfit = sales.reduce((acc, s) => acc + (s.total_profit || 0), 0);
    const count = sales.length;
    const avg = count > 0 ? sumSales / count : 0;
    const margin = sumSales > 0 ? ((sumProfit / sumSales) * 100).toFixed(1) : '0.0';

    return {
      totalSales: formatINR(sumSales),
      totalProfit: formatINR(sumProfit),
      transactions: count.toLocaleString(),
      avgTicket: formatINR(avg),
      rawSales: sumSales,
      rawProfit: sumProfit,
      rawCount: count,
      marginPct: margin,
    };
  }, [sales]);

  // Dynamic payment breakdown strictly from recorded sales
  const paymentBreakdown = React.useMemo(() => {
    if (!sales.length) return [];
    const map: Record<string, { mode: string; count: number; total: number }> = {};
    sales.forEach((s) => {
      const mode = (s.payment_mode || 'Cash').toUpperCase();
      if (!map[mode]) map[mode] = { mode, count: 0, total: 0 };
      map[mode].count += 1;
      map[mode].total += (s.total_amount || 0);
    });
    const totalAll = sales.reduce((a, b) => a + (b.total_amount || 0), 0);
    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .map((p) => ({
        ...p,
        pct: totalAll > 0 ? (p.total / totalAll) * 100 : 0,
      }));
  }, [sales]);

  // SVG Trend Chart Geometry
  const trendPoints = salesTrend?.points || [];
  const maxVal = React.useMemo(() => {
    if (!trendPoints.length) return 1000;
    const peak = Math.max(...trendPoints.map((p) => p.sales), 0);
    return peak > 0 ? Math.ceil(peak * 1.25) : 1000;
  }, [trendPoints]);

  const hasTrendData = trendPoints.length > 0 && trendPoints.some((p) => p.sales > 0);

  const { pathD, areaD, peakPoint, peakCoord } = React.useMemo(() => {
    if (!trendPoints.length || !hasTrendData) {
      return { pathD: '', areaD: '', peakPoint: null, peakCoord: null };
    }
    const width = 1000;
    const height = 180;
    const topPad = 15;
    const bottomPad = 15;
    const plotHeight = height - topPad - bottomPad;

    const coords = trendPoints.map((pt, idx) => {
      const x = trendPoints.length === 1 ? width / 2 : (idx / (trendPoints.length - 1)) * width;
      const y = topPad + plotHeight - (Math.min(pt.sales, maxVal) / maxVal) * plotHeight;
      return { x, y, pt };
    });

    const dArr: string[] = [];
    coords.forEach((c, idx) => {
      if (idx === 0) dArr.push(`M ${c.x.toFixed(1)},${c.y.toFixed(1)}`);
      else dArr.push(`L ${c.x.toFixed(1)},${c.y.toFixed(1)}`);
    });

    const pD = dArr.join(' ');
    const aD = `${pD} L ${coords[coords.length - 1].x.toFixed(1)},${height} L ${coords[0].x.toFixed(1)},${height} Z`;

    let maxPt = coords[0];
    coords.forEach((c) => {
      if (c.pt.sales > maxPt.pt.sales) maxPt = c;
    });

    return {
      pathD: pD,
      areaD: aD,
      peakPoint: maxPt.pt,
      peakCoord: { x: maxPt.x, y: maxPt.y },
    };
  }, [trendPoints, hasTrendData, maxVal]);

  const categoryList = categorySales?.categories || [];

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Page Header with Title, Period Filter & Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-[#E2E8F0] dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-white tracking-tight">Sales</h1>
          <p className="text-[13px] text-[#475569] dark:text-slate-400 mt-0.5">
            Real-time telemetry and revenue analytics computed from live register transactions.
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
          {/* Time Filter Segment */}
          <div className="flex items-center bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 p-1 rounded-lg shadow-2xs">
            <button
              type="button"
              onClick={() => setActivePeriod('today')}
              className={`px-3 py-1 text-[13px] rounded-md transition-colors font-medium cursor-pointer ${
                activePeriod === 'today'
                  ? 'bg-[#136DEC] text-white shadow-2xs font-semibold'
                  : 'text-[#475569] dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setActivePeriod('week')}
              className={`px-3 py-1 text-[13px] rounded-md transition-colors font-medium cursor-pointer ${
                activePeriod === 'week'
                  ? 'bg-[#136DEC] text-white shadow-2xs font-semibold'
                  : 'text-[#475569] dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              This Week
            </button>
            <button
              type="button"
              onClick={() => setActivePeriod('month')}
              className={`px-3 py-1 text-[13px] rounded-md transition-colors font-medium cursor-pointer ${
                activePeriod === 'month'
                  ? 'bg-[#136DEC] text-white shadow-2xs font-semibold'
                  : 'text-[#475569] dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setActivePeriod('custom')}
              className={`px-3 py-1 text-[13px] rounded-md transition-colors font-medium cursor-pointer ${
                activePeriod === 'custom'
                  ? 'bg-[#136DEC] text-white shadow-2xs font-semibold'
                  : 'text-[#475569] dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              Custom
            </button>
          </div>

          {/* Export Action */}
          <button
            type="button"
            onClick={() => {
              if (sales.length === 0) {
                toast.info('No sales data to export yet');
                return;
              }
              toast.success(`Exporting ${sales.length} sales transactions to CSV...`);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 hover:bg-[#F8FAFC] dark:hover:bg-slate-750 text-[#334155] dark:text-slate-200 text-[13px] font-medium rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#64748B]" />
            <span>Export</span>
          </button>

          {/* Record Sale Action */}
          <button
            type="button"
            onClick={() => navigate('/pos')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#136DEC] hover:bg-[#0E5BCA] text-white text-[13px] font-semibold rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Record Sale</span>
          </button>
        </div>
      </div>

      {/* 2. Key Sales Metrics (Single row of 4 clean metric blocks) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Sales */}
        <div className="bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#64748B] dark:text-slate-400 tracking-wider uppercase">
              TOTAL SALES
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#EBF3FF] dark:bg-blue-950/40 text-[#136DEC] flex items-center justify-center font-bold">
              ₹
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#0F172A] dark:text-white font-data tabular-nums">
              {calculatedTotals.totalSales}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                calculatedTotals.rawSales > 0
                  ? 'bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0] dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
              }`}>
                {calculatedTotals.rawSales > 0 ? `${calculatedTotals.transactions} bills` : '0 bills'}
              </span>
              <span className="text-[11px] text-[#64748B] dark:text-slate-400">
                {calculatedTotals.rawSales > 0 ? 'completed' : 'recorded'}
              </span>
            </div>
          </div>
        </div>

        {/* Metric 2: Total Profit */}
        <div className="bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#64748B] dark:text-slate-400 tracking-wider uppercase">
              TOTAL PROFIT
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#D1FAE5] dark:bg-emerald-950/40 text-[#065F46] dark:text-emerald-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#0F172A] dark:text-white font-data tabular-nums">
              {calculatedTotals.totalProfit}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                calculatedTotals.rawProfit > 0
                  ? 'bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0] dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
              }`}>
                {calculatedTotals.marginPct}% margin
              </span>
              <span className="text-[11px] text-[#64748B] dark:text-slate-400">gross return</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Transactions */}
        <div className="bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#64748B] dark:text-slate-400 tracking-wider uppercase">
              TRANSACTIONS
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-[#6366F1] flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#0F172A] dark:text-white font-data tabular-nums">
              {calculatedTotals.transactions}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                calculatedTotals.rawCount > 0
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
              }`}>
                {calculatedTotals.rawCount > 0 ? 'Live Registers' : 'Idle'}
              </span>
              <span className="text-[11px] text-[#64748B] dark:text-slate-400">settled orders</span>
            </div>
          </div>
        </div>

        {/* Metric 4: Average Transaction */}
        <div className="bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#64748B] dark:text-slate-400 tracking-wider uppercase">
              AVERAGE TRANSACTION
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] dark:bg-amber-950/40 text-[#D97706] flex items-center justify-center">
              <ShoppingBasket className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#0F172A] dark:text-white font-data tabular-nums">
              {calculatedTotals.avgTicket}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                Avg Basket
              </span>
              <span className="text-[11px] text-[#64748B] dark:text-slate-400">per invoice</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Sales Trend Chart Section */}
      <section className="bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-xl p-5 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#0F172A] dark:text-white">Sales Trend</h2>
              <span className="text-[11px] px-2 py-0.5 bg-[#EBF3FF] dark:bg-blue-950/40 text-[#136DEC] font-semibold rounded-full border border-[#BFDBFE] dark:border-blue-800">
                {activePeriod === 'today' ? 'Today' : activePeriod === 'week' ? '7-Day Window' : '30-Day Window'}
              </span>
            </div>
            <p className="text-[13px] text-[#64748B] dark:text-slate-400 mt-0.5">
              Gross sales progression computed directly from recorded transactions.
            </p>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            {/* Legend */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-1 bg-[#136DEC] rounded-full" />
                <span className="text-[#334155] dark:text-slate-300 font-medium">Actual Sales</span>
              </div>
            </div>
            {/* Aggregation Toggle */}
            <div className="flex items-center bg-[#F8FAFC] dark:bg-slate-750 border border-[#E2E8F0] dark:border-slate-700 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setTrendAggregation('daily')}
                className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                  trendAggregation === 'daily'
                    ? 'bg-white dark:bg-slate-800 text-[#136DEC] font-semibold shadow-2xs'
                    : 'text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
                }`}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => setTrendAggregation('weekly')}
                className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                  trendAggregation === 'weekly'
                    ? 'bg-white dark:bg-slate-800 text-[#136DEC] font-semibold shadow-2xs'
                    : 'text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
                }`}
              >
                Weekly
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic SVG Line Chart Canvas */}
        <div className="relative w-full h-72 pt-3">
          {/* Background Gridlines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-7">
            <div className="w-full border-b border-[#E2E8F0]/70 dark:border-slate-700/60 flex justify-between text-[11px] text-[#94A3B8] font-mono">
              <span>{formatINR(maxVal)}</span>
            </div>
            <div className="w-full border-b border-[#E2E8F0]/70 dark:border-slate-700/60 flex justify-between text-[11px] text-[#94A3B8] font-mono">
              <span>{formatINR(Math.round(maxVal * 0.75))}</span>
            </div>
            <div className="w-full border-b border-[#E2E8F0]/70 dark:border-slate-700/60 flex justify-between text-[11px] text-[#94A3B8] font-mono">
              <span>{formatINR(Math.round(maxVal * 0.5))}</span>
            </div>
            <div className="w-full border-b border-[#E2E8F0]/70 dark:border-slate-700/60 flex justify-between text-[11px] text-[#94A3B8] font-mono">
              <span>{formatINR(Math.round(maxVal * 0.25))}</span>
            </div>
            <div className="w-full border-b border-[#CBD5E1] dark:border-slate-600 flex justify-between text-[11px] text-[#94A3B8] font-mono">
              <span>₹0</span>
            </div>
          </div>

          {/* SVG Chart Layer */}
          {hasTrendData && pathD ? (
            <svg className="absolute inset-0 w-full h-[calc(100%-28px)] overflow-visible" preserveAspectRatio="none" viewBox="0 0 1000 180">
              <defs>
                <linearGradient id="currentArea" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#136DEC" stopOpacity="0.22" />
                  <stop offset="85%" stopColor="#136DEC" stopOpacity="0.02" />
                  <stop offset="100%" stopColor="#136DEC" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Area Fill for Current Period */}
              <path d={areaD} fill="url(#currentArea)" />

              {/* Current Period Stroke */}
              <path d={pathD} fill="none" stroke="#136DEC" strokeWidth="2.75" />

              {/* Peak Target Pin */}
              {peakCoord && peakPoint && peakPoint.sales > 0 && (
                <>
                  <circle cx={peakCoord.x} cy={peakCoord.y} fill="#136DEC" r="5.5" stroke="#FFFFFF" strokeWidth="2.5" />
                  <line
                    opacity="0.6"
                    stroke="#136DEC"
                    strokeDasharray="2 2"
                    strokeWidth="1.5"
                    x1={peakCoord.x}
                    x2={peakCoord.x}
                    y1={peakCoord.y}
                    y2="180"
                  />
                </>
              )}
            </svg>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pb-7">
              <TrendingUp className="w-9 h-9 text-slate-300 dark:text-slate-600 mb-2 opacity-60" />
              <p className="text-sm font-semibold text-[#475569] dark:text-slate-400">
                {loading ? 'Loading sales trend...' : 'No sales transactions recorded in this period'}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mt-0.5">
                Complete checkouts at POS or upload transaction spreadsheets to visualize daily demand progression.
              </p>
            </div>
          )}

          {/* Peak Tooltip Callout */}
          {hasTrendData && peakPoint && peakCoord && peakPoint.sales > 0 && (
            <div
              className="absolute bg-[#0F172A] text-white px-3 py-1.5 rounded-lg shadow-xl border border-slate-700 pointer-events-none text-left z-20"
              style={{
                top: Math.max(10, peakCoord.y - 25),
                left: `${Math.min(85, Math.max(15, (peakCoord.x / 1000) * 100))}%`,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <div className="text-[10px] font-semibold text-slate-300 border-b border-slate-700/80 pb-0.5 mb-0.5">
                {peakPoint.label} • Peak Day
              </div>
              <div className="text-xs font-bold text-emerald-400 font-mono">
                {formatINR(peakPoint.sales)}
              </div>
            </div>
          )}

          {/* Bottom Date Ticks */}
          <div className="absolute bottom-0 inset-x-0 flex justify-between text-[11px] text-[#94A3B8] pt-2">
            {trendPoints.length > 0 ? (
              trendPoints
                .filter((_, idx, arr) => {
                  if (arr.length <= 6) return true;
                  const step = Math.ceil(arr.length / 6);
                  return idx % step === 0 || idx === arr.length - 1;
                })
                .map((p, idx) => (
                  <span key={idx} className={p.label === peakPoint?.label ? 'text-[#136DEC] font-bold' : ''}>
                    {p.label}
                  </span>
                ))
            ) : (
              <>
                <span>Start</span>
                <span>Mid Period</span>
                <span>End</span>
              </>
            )}
          </div>
        </div>

        {/* Dynamic Sales Insight Callout */}
        <div className="flex items-start gap-3 p-3.5 bg-[#EBF3FF]/70 dark:bg-blue-950/20 border border-[#BFDBFE] dark:border-blue-900/60 rounded-lg">
          <Lightbulb className="w-5 h-5 text-[#136DEC] shrink-0 mt-0.5" />
          <div className="text-[13px] text-[#334155] dark:text-slate-300">
            {calculatedTotals.rawSales > 0 ? (
              <>
                <span className="font-semibold text-[#0F172A] dark:text-white">
                  Total revenue of {calculatedTotals.totalSales}
                </span>{' '}
                recorded across {calculatedTotals.transactions} customer checkout transactions, yielding{' '}
                {calculatedTotals.totalProfit} gross margin ({calculatedTotals.marginPct}% return). Average order basket is{' '}
                {calculatedTotals.avgTicket}.
              </>
            ) : (
              <>
                <span className="font-semibold text-[#0F172A] dark:text-white">
                  Zero sales transactions recorded yet.
                </span>{' '}
                Ring up customer bills at the POS Billing Counter or upload transaction records to track revenue velocity and department contributions.
              </>
            )}
          </div>
        </div>
      </section>

      {/* 4. Sales Breakdown (Two balanced 50/50 columns) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Sales by Category */}
        <div className="bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-xl p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">Sales by Category</h3>
              <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-0.5">Live departmental performance from inventory sales</p>
            </div>
            <span className="text-xs text-[#64748B] dark:text-slate-400 font-medium">
              {formatINR(categorySales?.total_sales || 0)} Total
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {categoryList.length > 0 ? (
              categoryList.map((cat, idx) => {
                const colors = ['#136DEC', '#10B981', '#0EA5E9', '#F59E0B', '#8B5CF6', '#EC4899'];
                const color = colors[idx % colors.length];
                const widthPct = Math.min(100, Math.max(3, cat.share_pct));

                return (
                  <div key={cat.category}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-[#334155] dark:text-slate-300 font-medium">{cat.category}</span>
                      <span className="text-[#0F172A] dark:text-white font-data font-semibold">
                        {formatINR(cat.sales)}{' '}
                        <span className="text-[#94A3B8] font-normal text-[11px]">
                          ({cat.share_pct.toFixed(1)}%)
                        </span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${widthPct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                <ShoppingBasket className="w-6 h-6 mx-auto mb-1.5 opacity-40" />
                No category sales recorded yet. Completed sales will organize by product department here.
              </div>
            )}
          </div>
        </div>

        {/* Right: Sales by Payment Mode */}
        <div className="bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-xl p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">Sales by Payment Mode</h3>
              <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-0.5">Distribution across checkout tender types</p>
            </div>
            <span className="text-xs text-[#64748B] dark:text-slate-400 font-medium">
              {paymentBreakdown.length} Methods
            </span>
          </div>

          <div className="space-y-2.5 pt-1">
            {paymentBreakdown.length > 0 ? (
              paymentBreakdown.map((pm, idx) => {
                const colors = ['#136DEC', '#10B981', '#0EA5E9', '#F59E0B'];
                const color = colors[idx % colors.length];

                return (
                  <div key={pm.mode} className="p-2.5 bg-[#F8FAFC] dark:bg-slate-750 rounded-lg border border-[#E2E8F0] dark:border-slate-700">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                        <span className="font-semibold text-[#0F172A] dark:text-white">{pm.mode}</span>
                        <span className="text-[11px] text-[#94A3B8]">{pm.count} bills</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[#0F172A] dark:text-white font-data font-bold">
                          {formatINR(pm.total)}
                        </span>
                        <span className="text-[10px] font-semibold text-[#065F46] bg-[#D1FAE5] px-1.5 py-0.2 rounded border border-[#A7F3D0] dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                          {pm.pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-200/80 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(3, pm.pct))}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                <CreditCard className="w-6 h-6 mx-auto mb-1.5 opacity-40" />
                No payment transactions recorded yet. Tender breakdown will appear as checkouts occur.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 5. Recent Transactions Table */}
      <section className="bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 flex items-center justify-between border-b border-[#E2E8F0] dark:border-slate-700">
          <div>
            <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">Recent Transactions</h3>
            <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-0.5">Real-time ledger of completed register checkouts</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/upload?tab=entered&sub=sales')}
            className="text-[#136DEC] hover:text-[#0E5BCA] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>View All Transactions</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="h-9 bg-[#F8FAFC] dark:bg-slate-750 border-b border-[#E2E8F0] dark:border-slate-700 text-[11px] font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
                <th className="px-4 py-2">INVOICE ID</th>
                <th className="px-4 py-2">DATE & TIME</th>
                <th className="px-4 py-2">PAYMENT MODE</th>
                <th className="px-4 py-2">LINE ITEMS</th>
                <th className="px-4 py-2 text-right">SALES</th>
                <th className="px-4 py-2 text-right">PROFIT</th>
                <th className="px-4 py-2 text-center">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] dark:divide-slate-700/60 text-xs">
              {sales.length > 0 ? (
                sales.slice(0, 10).map((s) => (
                  <tr key={s.id} className="h-11 hover:bg-[#F8FAFC] dark:hover:bg-slate-750 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-[#136DEC] font-medium hover:underline cursor-pointer">
                      #INV-{s.id.toString().padStart(5, '0')}
                    </td>
                    <td className="px-4 py-2.5 text-[#334155] dark:text-slate-300">
                      {s.date_time ? new Date(s.date_time).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Recent'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                        {s.payment_mode || 'Cash'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[#64748B] dark:text-slate-400">
                      {s.items && s.items.length > 0 ? `${s.items.length} line item${s.items.length > 1 ? 's' : ''}` : 'Direct billing'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-data text-[#0F172A] dark:text-white font-semibold">
                      {formatINR(s.total_amount)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-data text-[#10B981] font-semibold">
                      {formatINR(s.total_profit)}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="inline-block px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0] dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                        Completed
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-[#64748B] dark:text-slate-400">
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="font-semibold text-sm text-[#0F172A] dark:text-white">No sales transactions recorded yet</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Transactions rung up at the POS counter or uploaded from sales records will appear here immediately.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/pos')}
                      className="mt-3 px-3.5 py-1.5 bg-[#136DEC] hover:bg-[#0E5BCA] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Record First Sale
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Record Sale Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Record sale transaction"
        description="Enter bill details and payment method."
      >
        <form onSubmit={handleAdd} className="flex flex-col gap-4">
          <Input
            label="Total amount"
            isCurrency
            placeholder="0"
            value={form.total_amount}
            onChange={(e) => setForm({ ...form, total_amount: e.target.value })}
            required
          />
          <Input
            label="Gross profit"
            isCurrency
            placeholder="0"
            value={form.total_profit}
            onChange={(e) => setForm({ ...form, total_profit: e.target.value })}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-high">Payment mode</label>
            <div className="grid grid-cols-3 gap-2">
              {['UPI', 'Cash', 'Card'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setForm({ ...form, payment_mode: mode })}
                  className={`h-11 rounded-lg border font-semibold text-xs transition-colors cursor-pointer ${
                    form.payment_mode === mode
                      ? 'border-[#136DEC] bg-[#136DEC] text-white'
                      : 'border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#334155] dark:text-slate-200 hover:bg-[#F8FAFC]'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsAddOpen(false)}>
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
export default SalesPage;
