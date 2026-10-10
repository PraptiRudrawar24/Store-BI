import { useState, useEffect, useMemo } from 'react';
import {
  AlertCircle,
  RefreshCw,
  Search,
  Sparkles,
  Minus,
  Equal,
  Plus,
} from 'lucide-react';
import {
  api,
  type ProfitabilityAnalyticsResponse,
} from '../../api/client';
import { formatINR } from '../../utils';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';

// Flat curated color palette for expense categories donut
const FLAT_DONUT_COLORS = [
  '#2563EB', // Blue
  '#16A34A', // Green
  '#F59E0B', // Amber
  '#DC2626', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#64748B', // Slate
];

export function ProfitabilityAnalyticsTab() {
  const [fromDate, setFromDate] = useState<string>(() => {
    const today = new Date();
    // Default to first day of current month
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    return firstDay.toISOString().split('T')[0];
  });

  const [toDate, setToDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [activePreset, setActivePreset] = useState<string>('this_month');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<ProfitabilityAnalyticsResponse>({
    from_date: fromDate,
    to_date: toDate,
    has_data: false,
    insight: null,
    overall_gross_margin_pct: 0,
    overall_net_margin_pct: 0,
    total_sales: 0,
    total_cogs: 0,
    gross_profit: 0,
    total_expenses: 0,
    net_profit: 0,
    margin_trend: [],
    margin_by_category: [],
    lowest_margin_products: [],
    expenses_by_category: [],
    expenses_monthly_trend: [],
    expense_entries: [],
    net_profit_steps: [],
  });

  const [expenseSearch, setExpenseSearch] = useState<string>('');
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAnalyticsProfitability({
        from: fromDate,
        to: toDate,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch profitability analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fromDate, toDate]);

  const handlePresetChange = (preset: string) => {
    setActivePreset(preset);
    const today = new Date();
    const endStr = today.toISOString().split('T')[0];
    setToDate(endStr);

    if (preset === 'this_month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      setFromDate(start.toISOString().split('T')[0]);
    } else if (preset === 'last_month') {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      setFromDate(start.toISOString().split('T')[0]);
      setToDate(end.toISOString().split('T')[0]);
    } else if (preset === '30d') {
      const start = new Date();
      start.setDate(today.getDate() - 29);
      setFromDate(start.toISOString().split('T')[0]);
    } else if (preset === '90d') {
      const start = new Date();
      start.setDate(today.getDate() - 89);
      setFromDate(start.toISOString().split('T')[0]);
    } else if (preset === 'all') {
      setFromDate('2020-01-01');
    }
  };

  const isZeroState = !data.has_data;

  // Filtered expense entries
  const filteredExpenses = useMemo(() => {
    if (!expenseSearch.trim()) return data.expense_entries;
    const q = expenseSearch.toLowerCase();
    return data.expense_entries.filter(
      (e) =>
        e.category.toLowerCase().includes(q) ||
        (e.note && e.note.toLowerCase().includes(q))
    );
  }, [data.expense_entries, expenseSearch]);

  // Donut chart calculations
  const donutRadius = 54;
  const donutCircumference = 2 * Math.PI * donutRadius; // ~339.29

  const donutSlices = useMemo(() => {
    if (data.total_expenses === 0 || data.expenses_by_category.length === 0) {
      return [];
    }
    let cumulative = 0;
    return data.expenses_by_category.map((cat, idx) => {
      const share = cat.share_pct / 100;
      const strokeDasharray = `${share * donutCircumference} ${donutCircumference}`;
      const strokeDashoffset = -cumulative * donutCircumference;
      cumulative += share;
      const color = FLAT_DONUT_COLORS[idx % FLAT_DONUT_COLORS.length];
      return {
        ...cat,
        color,
        strokeDasharray,
        strokeDashoffset,
      };
    });
  }, [data.expenses_by_category, data.total_expenses]);

  // Margin trend chart dimensions
  const trendPoints = data.margin_trend;
  const maxTrendVal = Math.max(...trendPoints.map((p) => Math.max(p.sales, p.gross_profit)), 1000);
  const trendSvgWidth = 640;
  const trendSvgHeight = 220;
  const trendPadLeft = 55;
  const trendPadRight = 20;
  const trendPadTop = 20;
  const trendPadBottom = 30;
  const trendPlotW = trendSvgWidth - trendPadLeft - trendPadRight;
  const trendPlotH = trendSvgHeight - trendPadTop - trendPadBottom;

  return (
    <div className="flex flex-col gap-6">
      {/* Top Filter and Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 rounded-[8px] border border-border">
        <div>
          <h2 className="text-base font-bold text-text-high">Profitability analytics</h2>
          <p className="text-xs text-text-medium mt-0.5">
            Operating margin reconciliation, category contribution, and expense burden
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Preset Buttons */}
          <div className="flex items-center gap-1">
            {[
              { id: 'this_month', label: 'This Month' },
              { id: 'last_month', label: 'Last Month' },
              { id: '30d', label: '30D' },
              { id: '90d', label: '90D' },
              { id: 'all', label: 'All' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePresetChange(p.id)}
                className={`px-2.5 py-1 rounded-[4px] text-xs font-medium border transition-colors ${
                  activePreset === p.id
                    ? 'bg-primary/10 border-primary text-primary font-semibold'
                    : 'bg-surface border-border text-text-medium hover:text-text-high'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Date Pickers */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1">
              <span className="text-text-medium">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setActivePreset('custom');
                }}
                className="px-2 py-1 bg-surface border border-border rounded-[4px] text-xs font-medium text-text-high focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-text-medium">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setActivePreset('custom');
                }}
                className="px-2 py-1 bg-surface border border-border rounded-[4px] text-xs font-medium text-text-high focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <Button
            variant="secondary"
            onClick={fetchData}
            disabled={loading}
            className="text-xs min-h-[48px] px-3.5"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-destructive-bg border border-destructive-border rounded-[8px] text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Plain-language insight line at the top (appears ONLY when there is enough data) */}
      {!isZeroState && data.insight && (
        <div className="p-3.5 sm:p-4 bg-primary/5 border border-primary/25 rounded-[8px] flex items-start sm:items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <span className="text-[11px] font-bold text-primary block">
              Store profit insight
            </span>
            <p className="text-xs sm:text-sm font-medium text-text-high mt-0.5 leading-snug">
              {data.insight}
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards: Sales, COGS, Gross Profit & Margin, Expenses, Net Profit & Margin */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Gross Revenue */}
        <div className="p-3 sm:p-4 rounded-[8px] bg-surface border border-border border-l-4 border-l-[#2563EB]">
          <span className="text-[11px] font-semibold text-text-medium block">
            Gross sales
          </span>
          <span className="text-lg sm:text-xl font-bold text-text-high tabular-nums block mt-1">
            {isZeroState ? '₹0' : formatINR(data.total_sales)}
          </span>
          <span className="text-[11px] text-text-low mt-0.5 block">Total revenue</span>
        </div>

        {/* Cost of Goods Sold */}
        <div className="p-3 sm:p-4 rounded-[8px] bg-surface border border-border border-l-4 border-l-[#F97316]">
          <span className="text-[11px] font-semibold text-text-medium block">
            Cost of goods (COGS)
          </span>
          <span className="text-lg sm:text-xl font-bold text-text-high tabular-nums block mt-1">
            {isZeroState ? '₹0' : formatINR(data.total_cogs)}
          </span>
          <span className="text-[11px] text-text-low mt-0.5 block">Wholesale acquisition</span>
        </div>

        {/* Gross Profit & Margin % */}
        <div className="p-3 sm:p-4 rounded-[8px] bg-surface border border-border border-l-4 border-l-[#16A34A]">
          <span className="text-[11px] font-semibold text-text-medium block">
            Gross margin
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-lg sm:text-xl font-bold text-[#16A34A] tabular-nums">
              {isZeroState ? '0.0%' : `${data.overall_gross_margin_pct.toFixed(1)}%`}
            </span>
          </div>
          <span className="text-[11px] text-text-medium mt-0.5 block tabular-nums">
            {isZeroState ? '₹0' : formatINR(data.gross_profit)} gross profit
          </span>
        </div>

        {/* Operating Expenses */}
        <div className="p-3 sm:p-4 rounded-[8px] bg-surface border border-border border-l-4 border-l-[#DC2626]">
          <span className="text-[11px] font-semibold text-text-medium block">
            Expenses
          </span>
          <span className="text-lg sm:text-xl font-bold text-destructive tabular-nums block mt-1">
            {isZeroState ? '₹0' : formatINR(data.total_expenses)}
          </span>
          <span className="text-[11px] text-text-low mt-0.5 block">Operating overhead</span>
        </div>

        {/* Net Profit & Net Margin % */}
        <div
          className={`p-3 sm:p-4 rounded-[8px] bg-surface border border-border border-l-4 col-span-2 lg:col-span-1 ${
            isZeroState || data.net_profit >= 0 ? 'border-l-[#10B981]' : 'border-l-destructive'
          }`}
        >
          <span className="text-[11px] font-semibold text-text-medium block">
            Net profit
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span
              className={`text-lg sm:text-xl font-bold tabular-nums ${
                isZeroState || data.net_profit >= 0 ? 'text-[#10B981]' : 'text-destructive'
              }`}
            >
              {isZeroState ? '₹0' : formatINR(data.net_profit)}
            </span>
          </div>
          <span className="text-[11px] font-medium text-text-medium mt-0.5 block tabular-nums">
            {isZeroState ? '0.0%' : `${data.overall_net_margin_pct.toFixed(1)}%`} net margin
          </span>
        </div>
      </div>

      {/* 3. Net profit: sales - cost of goods - expenses as a simple stepped breakdown, plus net margin % */}
      <Card>
        <CardHeader
          title="Net Profit Stepped Breakdown"
          subtitle="Sales − Cost of Goods Sold − Operating Expenses = Net Profit for the chosen period"
        />
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
              {data.net_profit_steps.map((step, idx) => {
                const isRevenue = step.type === 'revenue';
                const isCogs = step.type === 'cogs';
                const isGross = step.type === 'gross_profit';
                const isExp = step.type === 'expenses';
                const isNet = step.type === 'net_profit';

                const cardBg = isNet
                  ? step.amount >= 0
                    ? 'bg-[#F0FDF4] border-[#BBF7D0]'
                    : 'bg-[#FEF2F2] border-[#FECACA]'
                  : isGross
                  ? 'bg-[#F0FDF4]/50 border-border'
                  : 'bg-surface border-border';

                const icon = isRevenue ? (
                  <Plus className="w-4 h-4 text-[#2563EB]" />
                ) : isCogs ? (
                  <Minus className="w-4 h-4 text-[#F97316]" />
                ) : isGross ? (
                  <Equal className="w-4 h-4 text-[#16A34A]" />
                ) : isExp ? (
                  <Minus className="w-4 h-4 text-[#DC2626]" />
                ) : (
                  <Equal className="w-4 h-4 text-[#10B981]" />
                );

                return (
                  <div
                    key={step.label}
                    className={`p-3.5 rounded-[8px] border flex flex-col justify-between transition-all ${cardBg}`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-text-medium">
                          Step {idx + 1}
                        </span>
                        <div className="w-6 h-6 rounded-full bg-surface border border-border flex items-center justify-center">
                          {icon}
                        </div>
                      </div>

                      <h4 className="text-xs font-bold text-text-high mt-1.5">{step.label}</h4>
                      <p className="text-[11px] text-text-low mt-0.5 line-clamp-2">
                        {step.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-2 border-t border-border/60">
                      <div className="text-base sm:text-lg font-bold text-text-high tabular-nums">
                        {isZeroState ? '₹0' : formatINR(step.amount)}
                      </div>
                      <div className="text-[11px] text-text-medium font-medium mt-0.5 tabular-nums">
                        {isRevenue
                          ? '100% (Base)'
                          : isGross
                          ? `${data.overall_gross_margin_pct.toFixed(1)}% gross margin`
                          : isNet
                          ? `${data.overall_net_margin_pct.toFixed(1)}% net margin`
                          : `${step.percentage?.toFixed(1) || 0}% of revenue`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reconciliation Formula Bar */}
            <div className="mt-2 p-3 bg-canvas border border-border rounded-[6px] flex flex-wrap items-center justify-between text-xs text-text-medium">
              <span className="font-semibold text-text-high">Accounting Equation:</span>
              <div className="flex flex-wrap items-center gap-1.5 font-medium tabular-nums text-text-high">
                <span className="text-[#2563EB]">Sales ({isZeroState ? '₹0' : formatINR(data.total_sales)})</span>
                <span>−</span>
                <span className="text-[#F97316]">COGS ({isZeroState ? '₹0' : formatINR(data.total_cogs)})</span>
                <span>−</span>
                <span className="text-[#DC2626]">Expenses ({isZeroState ? '₹0' : formatINR(data.total_expenses)})</span>
                <span>=</span>
                <span className={`font-bold ${data.net_profit >= 0 ? 'text-[#10B981]' : 'text-destructive'}`}>
                  Net Profit ({isZeroState ? '₹0' : formatINR(data.net_profit)}) [{isZeroState ? '0.0%' : `${data.overall_net_margin_pct.toFixed(1)}%`}]
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 1. Margin Section: Margin trend over time, Margin by category, Lowest-margin products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Margin Trend Over Time */}
        <Card>
          <CardHeader
            title="Gross Margin Trend Over Time"
            subtitle="Trajectory of sales revenue vs. gross margin percentage across the period"
            action={
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <span className="w-3 h-1 bg-[#2563EB] rounded-full" />
                  <span className="text-text-medium">Sales</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-1 bg-[#16A34A] rounded-full" />
                  <span className="text-text-medium">Gross Profit</span>
                </div>
              </div>
            }
          />
          <CardContent className="p-4 sm:p-6">
            <div className="relative w-full h-[220px]">
              {isZeroState || trendPoints.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/80 rounded-[6px]">
                  <p className="text-xs font-semibold text-text-high">Empty chart frame</p>
                  <p className="text-[11px] text-text-medium mt-0.5">
                    No sales recorded for this timeframe. The zero baseline is shown.
                  </p>
                </div>
              ) : null}

              <svg
                viewBox={`0 0 ${trendSvgWidth} ${trendSvgHeight}`}
                className="w-full h-full select-none overflow-visible"
              >
                {/* Horizontal Gridlines */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
                  const y = trendPadTop + trendPlotH * (1 - pct);
                  const val = maxTrendVal * pct;
                  return (
                    <g key={pct}>
                      <line
                        x1={trendPadLeft}
                        x2={trendSvgWidth - trendPadRight}
                        y1={y}
                        y2={y}
                        stroke="#E5E7EB"
                        strokeDasharray={pct === 0 ? undefined : '3 3'}
                        strokeWidth={pct === 0 ? 1.5 : 1}
                      />
                      <text
                        x={trendPadLeft - 8}
                        y={y + 4}
                        textAnchor="end"
                        fontSize="10"
                        fill="#737686"
                        className="tabular-nums"
                      >
                        {formatINR(Math.round(val))}
                      </text>
                    </g>
                  );
                })}

                {/* Flat Zero Baseline */}
                <line
                  x1={trendPadLeft}
                  x2={trendSvgWidth - trendPadRight}
                  y1={trendPadTop + trendPlotH}
                  y2={trendPadTop + trendPlotH}
                  stroke="#9CA3AF"
                  strokeWidth={1.5}
                />

                {/* Plot Data Lines */}
                {!isZeroState && trendPoints.length > 1 && (
                  <>
                    {/* Sales Line */}
                    <path
                      d={trendPoints
                        .map((p, i) => {
                          const x = trendPadLeft + (i / (trendPoints.length - 1)) * trendPlotW;
                          const y = trendPadTop + trendPlotH * (1 - (p.sales / maxTrendVal || 0));
                          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                        })
                        .join(' ')}
                      fill="none"
                      stroke="#2563EB"
                      strokeWidth="2"
                    />

                    {/* Gross Profit Line */}
                    <path
                      d={trendPoints
                        .map((p, i) => {
                          const x = trendPadLeft + (i / (trendPoints.length - 1)) * trendPlotW;
                          const y =
                            trendPadTop + trendPlotH * (1 - (Math.max(0, p.gross_profit) / maxTrendVal || 0));
                          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                        })
                        .join(' ')}
                      fill="none"
                      stroke="#16A34A"
                      strokeWidth="2"
                    />

                    {/* Data Points */}
                    {trendPoints.map((p, i) => {
                      const x = trendPadLeft + (i / (trendPoints.length - 1)) * trendPlotW;
                      const ySales = trendPadTop + trendPlotH * (1 - (p.sales / maxTrendVal || 0));
                      const yProfit =
                        trendPadTop + trendPlotH * (1 - (Math.max(0, p.gross_profit) / maxTrendVal || 0));
                      return (
                        <g key={p.date}>
                          <circle cx={x} cy={ySales} r="3" fill="#2563EB" />
                          <circle cx={x} cy={yProfit} r="3" fill="#16A34A" />
                        </g>
                      );
                    })}
                  </>
                )}
              </svg>
            </div>
          </CardContent>
        </Card>

        {/* Margin by Category */}
        <Card>
          <CardHeader
            title="Margin by Category"
            subtitle="Gross profit percentage and revenue contribution across product categories"
          />
          <CardContent className="p-4 sm:p-6">
            {isZeroState || data.margin_by_category.length === 0 ? (
              <div className="p-8 text-center text-xs text-text-medium italic">
                No category sales records found for this period.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {data.margin_by_category.map((cat) => {
                  const isHealthy = cat.margin_pct >= 25;
                  const isModerate = cat.margin_pct >= 15 && cat.margin_pct < 25;

                  const marginColor = isHealthy
                    ? 'text-[#16A34A] bg-[#F0FDF4] border-[#BBF7D0]'
                    : isModerate
                    ? 'text-[#D97706] bg-[#FFFBEB] border-[#FDE68A]'
                    : 'text-destructive bg-destructive-bg border-destructive-border';

                  return (
                    <div
                      key={cat.category}
                      className="p-3 bg-canvas/60 rounded-[6px] border border-border flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-text-high">{cat.category}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-text-low tabular-nums">
                            {cat.share_of_sales_pct.toFixed(1)}% share
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-[4px] font-bold text-xs border tabular-nums ${marginColor}`}
                          >
                            {cat.margin_pct.toFixed(1)}% margin
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar showing gross margin vs revenue */}
                      <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${Math.min(100, Math.max(5, cat.margin_pct))}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-text-medium tabular-nums mt-0.5">
                        <span>Sales: {formatINR(cat.sales)}</span>
                        <span>COGS: {formatINR(cat.cogs)}</span>
                        <span className="font-semibold text-text-high">
                          Gross Profit: {formatINR(cat.gross_profit)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lowest-Margin Products Table */}
      <Card>
        <CardHeader
          title="Lowest-Margin Products"
          subtitle="Products generating the thinnest profit margin percentage (candidates for price adjustments)"
        />
        <CardContent className="p-0">
          {isZeroState || data.lowest_margin_products.length === 0 ? (
            <div className="p-8 text-center text-xs text-text-medium italic">
              No product sales records found for this period.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-canvas border-b border-border text-text-medium font-semibold">
                    <th className="py-2.5 px-4">Product</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4 text-center">Units Sold</th>
                    <th className="py-2.5 px-4 text-right">Revenue</th>
                    <th className="py-2.5 px-4 text-right">COGS</th>
                    <th className="py-2.5 px-4 text-right">Profit</th>
                    <th className="py-2.5 px-4 text-center">Gross Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.lowest_margin_products.map((item) => {
                    const isThin = item.margin_pct < 12;
                    return (
                      <tr key={item.product_id} className="hover:bg-canvas/50">
                        <td className="py-2.5 px-4 font-semibold text-text-high">{item.name}</td>
                        <td className="py-2.5 px-4 text-text-medium">{item.category || 'General'}</td>
                        <td className="py-2.5 px-4 text-center font-medium tabular-nums">
                          {item.units_sold}
                        </td>
                        <td className="py-2.5 px-4 text-right tabular-nums">{formatINR(item.sales)}</td>
                        <td className="py-2.5 px-4 text-right tabular-nums">{formatINR(item.cogs)}</td>
                        <td className="py-2.5 px-4 text-right font-medium tabular-nums">
                          {formatINR(item.profit)}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-[4px] font-bold text-[11px] tabular-nums border ${
                              isThin
                                ? 'bg-destructive-bg text-destructive border-destructive-border'
                                : 'bg-warning-bg text-warning border-warning-border'
                            }`}
                          >
                            {item.margin_pct.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Expenses Section: Donut with flat colours, monthly trend, table of entries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expenses Totals by Category (Donut with flat colours) */}
        <Card>
          <CardHeader
            title="Expenses by Category"
            subtitle="Breakdown of operating costs by category with flat colour visualization"
          />
          <CardContent className="p-4 sm:p-6 flex flex-col md:flex-row items-center justify-around gap-6">
            {/* SVG Donut Chart */}
            <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90 select-none">
                {/* Background Ring */}
                <circle
                  cx="70"
                  cy="70"
                  r={donutRadius}
                  fill="none"
                  stroke="#F3F4F6"
                  strokeWidth="16"
                />

                {/* Slices with flat colors */}
                {donutSlices.map((slice, i) => (
                  <circle
                    key={slice.category}
                    cx="70"
                    cy="70"
                    r={donutRadius}
                    fill="none"
                    stroke={slice.color}
                    strokeWidth={hoveredSlice === i ? '19' : '16'}
                    strokeDasharray={slice.strokeDasharray}
                    strokeDashoffset={slice.strokeDashoffset}
                    className="transition-all duration-200 cursor-pointer"
                    onMouseEnter={() => setHoveredSlice(i)}
                    onMouseLeave={() => setHoveredSlice(null)}
                  />
                ))}
              </svg>

              {/* Center Rupee Display */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
                <span className="text-[10px] text-text-low font-medium">
                  Total expenses
                </span>
                <span className="text-base font-bold text-text-high tabular-nums">
                  {isZeroState ? '₹0' : formatINR(data.total_expenses)}
                </span>
              </div>
            </div>

            {/* Category Legend List */}
            <div className="flex-1 w-full flex flex-col gap-2 max-h-56 overflow-y-auto">
              {isZeroState || data.expenses_by_category.length === 0 ? (
                <p className="text-xs text-text-medium italic text-center py-4">
                  No expense categories recorded for this period.
                </p>
              ) : (
                donutSlices.map((slice, idx) => (
                  <div
                    key={slice.category}
                    className={`p-2 rounded-[6px] border flex items-center justify-between text-xs transition-colors ${
                      hoveredSlice === idx ? 'bg-canvas border-primary/40' : 'bg-surface border-border'
                    }`}
                    onMouseEnter={() => setHoveredSlice(idx)}
                    onMouseLeave={() => setHoveredSlice(null)}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-[3px] shrink-0"
                        style={{ backgroundColor: slice.color }}
                      />
                      <span className="font-semibold text-text-high">{slice.category}</span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-text-high tabular-nums">
                        {formatINR(slice.amount)}
                      </span>
                      <span className="text-[11px] text-text-medium font-medium tabular-nums w-12 text-right">
                        {slice.share_pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Expenses Monthly Trend */}
        <Card>
          <CardHeader
            title="Monthly Expense Trend"
            subtitle="Operating overhead trend across recorded months"
          />
          <CardContent className="p-4 sm:p-6">
            {isZeroState || data.expenses_monthly_trend.length === 0 ? (
              <div className="p-8 text-center text-xs text-text-medium italic">
                No monthly expense trends available.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {(() => {
                  const maxMVal = Math.max(
                    ...data.expenses_monthly_trend.map((m) => m.amount),
                    100
                  );
                  return data.expenses_monthly_trend.map((m) => {
                    const widthPct = Math.min(100, (m.amount / maxMVal) * 100);
                    return (
                      <div key={m.month} className="flex flex-col gap-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-text-high">{m.label}</span>
                          <span className="font-bold text-destructive tabular-nums">
                            {formatINR(m.amount)}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-canvas rounded-full border border-border overflow-hidden">
                          <div
                            className="h-full bg-destructive/80 rounded-full transition-all duration-300"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-text-low">{m.count} entries logged</span>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expenses Table of Entries */}
      <Card>
        <CardHeader
          title="Expense Entries"
          subtitle="Detailed audit log of operating expenditure line items"
          action={
            !isZeroState && data.expense_entries.length > 0 ? (
              <div className="relative w-48 sm:w-60">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-low" />
                <input
                  type="text"
                  placeholder="Search entries or notes..."
                  value={expenseSearch}
                  onChange={(e) => setExpenseSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 bg-surface border border-border rounded-[4px] text-xs text-text-high placeholder:text-text-low focus:outline-none focus:border-primary"
                />
              </div>
            ) : null
          }
        />
        <CardContent className="p-0">
          {isZeroState || data.expense_entries.length === 0 ? (
            <div className="p-8 text-center text-xs text-text-medium italic">
              No expenses recorded for this period. Zero state.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-canvas border-b border-border text-text-medium font-semibold">
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4">Note / Memo</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-text-medium">
                        No expense entries matched "{expenseSearch}"
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((entry) => (
                      <tr key={entry.id} className="hover:bg-canvas/50">
                        <td className="py-2.5 px-4 text-text-high font-medium tabular-nums">
                          {entry.date}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] bg-canvas border border-border font-medium text-text-high">
                            {entry.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-text-medium">
                          {entry.note || <span className="text-text-low italic">–</span>}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-destructive tabular-nums">
                          {formatINR(entry.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
