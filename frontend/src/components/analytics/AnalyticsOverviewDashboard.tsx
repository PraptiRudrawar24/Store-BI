import { useState, useEffect, useMemo, useRef } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  IndianRupee,
  ReceiptText,
  AlertTriangle,
  Package,
  Layers,
  ArrowUpDown,
  Search,
  RefreshCw,
  Sparkles,
  AlertCircle,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import {
  api,
  type AnalyticsDashboardResponse,
  type TrendChartPoint,
  type ProductPerformanceRow,
} from '../../api/client';
import { formatINR } from '../../utils';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { CHART_COLORS } from '../../utils/chartColors';
import { cn } from '../ui/utils';
import { TransitionPanel } from '@/components/core/transition-panel';

export const PERIOD_TABS = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 Days' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: '30d', label: 'Last 30 Days' },
  { id: 'custom', label: 'Custom' },
] as const;

interface TrajectoryChartPanelProps {
  panelData: AnalyticsDashboardResponse | null;
  activeChartMode: 'sales_profit' | 'daily' | 'weekly' | 'monthly' | 'transactions';
  loading: boolean;
}

function TrajectoryChartPanel({
  panelData,
  activeChartMode,
  loading,
}: TrajectoryChartPanelProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const chartPoints: TrendChartPoint[] = useMemo(() => {
    if (!panelData?.trends) return [];
    if (activeChartMode === 'weekly') return panelData.trends.weekly_trend || [];
    if (activeChartMode === 'monthly') return panelData.trends.monthly_trend || [];
    return panelData.trends.daily_trend || [];
  }, [panelData, activeChartMode]);

  const svgWidth = 740;
  const svgHeight = 250;
  const padLeft = 60;
  const padRight = 24;
  const padTop = 20;
  const padBottom = 35;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  const maxVal = useMemo(() => {
    if (!chartPoints.length) return 1000;
    if (activeChartMode === 'transactions') {
      return Math.max(...chartPoints.map((p) => p.transactions), 10) * 1.2;
    }
    const peak = Math.max(...chartPoints.map((p) => Math.max(p.sales, p.profit)), 100);
    return peak * 1.15;
  }, [chartPoints, activeChartMode]);

  const stepX = chartPoints.length > 1 ? plotWidth / (chartPoints.length - 1) : plotWidth;

  const salesPoints = chartPoints.map((p, idx) => {
    const x = padLeft + idx * stepX;
    const y = padTop + plotHeight - (p.sales / maxVal) * plotHeight;
    return { x, y, p };
  });

  const profitPoints = chartPoints.map((p, idx) => {
    const x = padLeft + idx * stepX;
    const y = padTop + plotHeight - (Math.max(0, p.profit) / maxVal) * plotHeight;
    return { x, y, p };
  });

  const txPoints = chartPoints.map((p, idx) => {
    const x = padLeft + idx * stepX;
    const y = padTop + plotHeight - (p.transactions / maxVal) * plotHeight;
    return { x, y, p };
  });

  const salesPath = salesPoints.reduce(
    (acc, pt, idx) => (idx === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`),
    ''
  );

  const profitPath = profitPoints.reduce(
    (acc, pt, idx) => (idx === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`),
    ''
  );

  const txPath = txPoints.reduce(
    (acc, pt, idx) => (idx === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`),
    ''
  );

  const activePoint = hoverIndex !== null && chartPoints[hoverIndex] ? chartPoints[hoverIndex] : null;

  return (
    <div className="flex flex-col gap-2">
      {/* Dynamic timeframe subtitle showing metrics for this panel */}
      <div className="text-xs text-text-medium min-h-[20px]">
        {panelData ? (
          <span>
            {panelData.from_date} to {panelData.to_date} · Total Revenue:{' '}
            <strong className="text-text-high font-semibold">{formatINR(panelData.total_sales || 0)}</strong> · Profit:{' '}
            <strong className="text-[#10B981] font-semibold">{formatINR(panelData.total_profit || 0)}</strong>
          </span>
        ) : (
          <span>Loading timeframe metrics...</span>
        )}
      </div>

      {/* Interactive Multi-Series Chart Container */}
      <div className="relative w-full h-[250px] select-none">
        {loading && !panelData && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/80 rounded-[8px] z-10">
            <Loader2 className="w-7 h-7 animate-spin text-primary mb-2" />
            <p className="text-xs font-semibold text-text-high">Loading period trajectory...</p>
          </div>
        )}

        {(!panelData?.has_data || chartPoints.length === 0) && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/80 rounded-[8px] z-10">
            <Package className="w-8 h-8 text-text-low mb-2" />
            <p className="text-xs font-bold text-text-high">No sales recorded for this timeframe</p>
            <p className="text-[11px] text-text-medium mt-0.5">
              Try selecting a wider date range or logging billing transactions.
            </p>
          </div>
        )}

        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full overflow-visible"
          onMouseLeave={() => setHoverIndex(null)}
        >
          {/* Horizontal Gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const y = padTop + plotHeight * (1 - pct);
            const val = maxVal * pct;
            return (
              <g key={pct}>
                <line
                  x1={padLeft}
                  x2={svgWidth - padRight}
                  y1={y}
                  y2={y}
                  stroke="#E5E7EB"
                  strokeDasharray={pct === 0 ? undefined : '3 3'}
                  strokeWidth={pct === 0 ? 1.5 : 1}
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="#737686"
                  className="tabular-nums"
                >
                  {activeChartMode === 'transactions'
                    ? Math.round(val)
                    : formatINR(Math.round(val))}
                </text>
              </g>
            );
          })}

          {/* Zero baseline */}
          <line
            x1={padLeft}
            x2={svgWidth - padRight}
            y1={padTop + plotHeight}
            y2={padTop + plotHeight}
            stroke="#9CA3AF"
            strokeWidth={1.5}
          />

          {/* Lines & Data */}
          {panelData?.has_data && chartPoints.length > 1 && (
            <>
              {/* Sales Line */}
              {activeChartMode !== 'transactions' && (
                <path
                  d={salesPath}
                  fill="none"
                  stroke={CHART_COLORS.sales}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              )}

              {/* Profit Line */}
              {(activeChartMode === 'sales_profit' || activeChartMode === 'daily') && (
                <path
                  d={profitPath}
                  fill="none"
                  stroke={CHART_COLORS.profit}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              )}

              {/* Transaction Line */}
              {activeChartMode === 'transactions' && (
                <path
                  d={txPath}
                  fill="none"
                  stroke={CHART_COLORS.inventory}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              )}

              {/* Hover Crosshair */}
              {hoverIndex !== null && chartPoints[hoverIndex] && (
                <line
                  x1={padLeft + hoverIndex * stepX}
                  x2={padLeft + hoverIndex * stepX}
                  y1={padTop}
                  y2={padTop + plotHeight}
                  stroke="#6366F1"
                  strokeDasharray="2 2"
                  strokeWidth="1.5"
                />
              )}

              {/* Hitboxes for Hover */}
              {chartPoints.map((pt, idx) => {
                const x = padLeft + idx * stepX;
                return (
                  <g
                    key={idx}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoverIndex(idx)}
                  >
                    <rect
                      x={x - stepX / 2}
                      y={padTop}
                      width={stepX}
                      height={plotHeight}
                      fill="transparent"
                    />
                    {/* Circle markers */}
                    {hoverIndex === idx && (
                      <>
                        {activeChartMode !== 'transactions' && (
                          <circle
                            cx={x}
                            cy={padTop + plotHeight - (pt.sales / maxVal) * plotHeight}
                            r="4"
                            fill={CHART_COLORS.sales}
                            stroke="#FFFFFF"
                            strokeWidth="2"
                          />
                        )}
                        {(activeChartMode === 'sales_profit' || activeChartMode === 'daily') && (
                          <circle
                            cx={x}
                            cy={padTop + plotHeight - (Math.max(0, pt.profit) / maxVal) * plotHeight}
                            r="4"
                            fill={CHART_COLORS.profit}
                            stroke="#FFFFFF"
                            strokeWidth="2"
                          />
                        )}
                        {activeChartMode === 'transactions' && (
                          <circle
                            cx={x}
                            cy={padTop + plotHeight - (pt.transactions / maxVal) * plotHeight}
                            r="4"
                            fill={CHART_COLORS.inventory}
                            stroke="#FFFFFF"
                            strokeWidth="2"
                          />
                        )}
                      </>
                    )}
                    {/* X-axis labels (sampled) */}
                    {(idx === 0 ||
                      idx === chartPoints.length - 1 ||
                      idx % Math.ceil(chartPoints.length / 7) === 0) && (
                      <text
                        x={x}
                        y={padTop + plotHeight + 18}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#737686"
                      >
                        {pt.label.split('(')[0].trim()}
                      </text>
                    )}
                  </g>
                );
              })}
            </>
          )}
        </svg>

        {/* Hover Tooltip Overlay */}
        {activePoint && hoverIndex !== null && (
          <div
            className="absolute top-3 bg-surface/95 border border-border shadow-lg rounded-[8px] p-2.5 text-xs pointer-events-none z-20 backdrop-blur-xs min-w-[170px]"
            style={{
              left: `${Math.min(
                80,
                Math.max(10, ((padLeft + hoverIndex * stepX) / svgWidth) * 100)
              )}%`,
            }}
          >
            <div className="font-bold text-text-high border-b border-border/80 pb-1 mb-1.5">
              {activePoint.label}
            </div>
            <div className="flex flex-col gap-1 tabular-nums">
              <div className="flex items-center justify-between gap-3 text-text-medium">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#6366F1]" />
                  <span>Sales:</span>
                </span>
                <span className="font-bold text-text-high">{formatINR(activePoint.sales)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-text-medium">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                  <span>Profit:</span>
                </span>
                <span className="font-bold text-[#10B981]">{formatINR(activePoint.profit)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-text-medium">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#06B6D4]" />
                  <span>Bills:</span>
                </span>
                <span className="font-bold text-text-high">{activePoint.transactions}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend Bar */}
      <div className="flex items-center justify-center gap-6 pt-2 border-t border-border/60 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-[3px] bg-[#6366F1]" />
          <span className="font-medium text-text-medium">Sales Revenue</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-[3px] bg-[#10B981]" />
          <span className="font-medium text-text-medium">Gross Profit</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-[3px] bg-[#06B6D4]" />
          <span className="font-medium text-text-medium">Transaction Bills</span>
        </div>
      </div>
    </div>
  );
}

export function AnalyticsOverviewDashboard() {
  const [period, setPeriod] = useState<string>('30d');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [category, setCategory] = useState<string>('all');
  const [rankingMetric, setRankingMetric] = useState<'revenue' | 'units' | 'profit'>('revenue');

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsDashboardResponse | null>(null);
  const [periodCache, setPeriodCache] = useState<Record<string, AnalyticsDashboardResponse>>({});
  const activeRequestRef = useRef(0);

  // Active chart view toggle: 'sales_profit' | 'daily' | 'weekly' | 'monthly' | 'transactions'
  const [activeChartMode, setActiveChartMode] = useState<
    'sales_profit' | 'daily' | 'weekly' | 'monthly' | 'transactions'
  >('sales_profit');

  // Comparison table state
  const [tableSearch, setTableSearch] = useState<string>('');
  const [tableCategory, setTableCategory] = useState<string>('all');
  const [sortCol, setSortCol] = useState<keyof ProductPerformanceRow>('sales_revenue');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;

  const fetchData = async () => {
    const currentReq = ++activeRequestRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAnalyticsDashboard({
        period,
        from: period === 'custom' ? fromDate : undefined,
        to: period === 'custom' ? toDate : undefined,
        ranking_metric: rankingMetric,
        category: category === 'all' ? undefined : category,
      });
      if (activeRequestRef.current === currentReq) {
        setData(res);
        setPeriodCache((prev) => ({ ...prev, [period]: res }));
      }
    } catch (err: any) {
      if (activeRequestRef.current === currentReq) {
        setError(err?.message || 'Failed to load analytics dashboard');
      }
    } finally {
      if (activeRequestRef.current === currentReq) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, [period, fromDate, toDate, rankingMetric, category]);

  useEffect(() => {
    setPeriodCache({});
  }, [category, rankingMetric]);

  // Handle Preset changes
  const handlePresetSelect = (preset: string) => {
    setPeriod(preset);
    const now = new Date();
    const endStr = now.toISOString().split('T')[0];
    setToDate(endStr);

    if (preset === 'today') {
      setFromDate(endStr);
    } else if (preset === '7d') {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      setFromDate(d.toISOString().split('T')[0]);
    } else if (preset === 'week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(now.setDate(diff));
      setFromDate(mon.toISOString().split('T')[0]);
    } else if (preset === 'month') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      setFromDate(first.toISOString().split('T')[0]);
    } else if (preset === '30d') {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      setFromDate(d.toISOString().split('T')[0]);
    }
  };


  // Comparison Table Filtering & Sorting
  const filteredTableRows = useMemo(() => {
    if (!data?.comparison_table) return [];
    let list = [...data.comparison_table];

    if (tableCategory !== 'all') {
      list = list.filter((r) => r.category.toLowerCase() === tableCategory.toLowerCase());
    }

    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          r.product_id.toString().includes(q)
      );
    }

    list.sort((a, b) => {
      let aVal = a[sortCol];
      let bVal = b[sortCol];
      if (typeof aVal === 'string') {
        return sortAsc
          ? (aVal as string).localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal as string);
      }
      return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

    return list;
  }, [data?.comparison_table, tableCategory, tableSearch, sortCol, sortAsc]);

  const totalTablePages = Math.ceil(filteredTableRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTableRows.slice(start, start + pageSize);
  }, [filteredTableRows, page]);

  const handleTableSort = (col: keyof ProductPerformanceRow) => {
    if (sortCol === col) {
      setSortAsc((prev) => !prev);
    } else {
      setSortCol(col);
      setSortAsc(false);
    }
    setPage(1);
  };

  const activePeriodIndex = Math.max(
    0,
    PERIOD_TABS.findIndex((p) => p.id === period)
  );

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div className="p-3.5 rounded-[8px] bg-destructive-bg border border-destructive-border text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 1. SALES KPI CARDS (Daily, Weekly, Monthly with % changes)     */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Daily Sales Card */}
        {(() => {
          const kpi = data?.kpis.daily;
          const delta = kpi?.delta_pct;
          const isUp = delta !== null && delta !== undefined && delta > 0;
          const isDown = delta !== null && delta !== undefined && delta < 0;

          return (
            <Card showTrail trailColor="indigo" className="border-l-4 border-l-[#6366F1] shadow-sm">
              <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-medium uppercase tracking-wider">
                    Daily Sales
                  </span>
                  <div className="w-8 h-8 rounded-full bg-[#6366F1]/10 flex items-center justify-center text-[#6366F1]">
                    <IndianRupee className="w-4 h-4" />
                  </div>
                </div>

                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-text-high tabular-nums">
                    {formatINR(kpi?.sales || 0)}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-xs font-bold tabular-nums border ${
                        isUp
                          ? 'bg-[#F0FDF4] text-[#10B981] border-[#BBF7D0]'
                          : isDown
                          ? 'bg-[#FEF2F2] text-[#F43F5E] border-[#FECACA]'
                          : 'bg-canvas text-text-medium border-border'
                      }`}
                    >
                      {isUp && <TrendingUp className="w-3.5 h-3.5" />}
                      {isDown && <TrendingDown className="w-3.5 h-3.5" />}
                      {!isUp && !isDown && <Minus className="w-3.5 h-3.5" />}
                      {kpi?.comparison_message || 'No sales recorded'}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/80 flex items-center justify-between text-xs text-text-medium tabular-nums">
                  <span className="flex items-center gap-1">
                    <ReceiptText className="w-3.5 h-3.5 text-text-low" />
                    <span>{kpi?.transactions || 0} bills today</span>
                  </span>
                  <span className="font-semibold text-[#10B981]">
                    {formatINR(kpi?.profit || 0)} profit
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Weekly Sales Card */}
        {(() => {
          const kpi = data?.kpis.weekly;
          const delta = kpi?.delta_pct;
          const isUp = delta !== null && delta !== undefined && delta > 0;
          const isDown = delta !== null && delta !== undefined && delta < 0;

          return (
            <Card showTrail trailColor="emerald" className="border-l-4 border-l-[#10B981] shadow-sm">
              <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-medium uppercase tracking-wider">
                    Weekly Sales
                  </span>
                  <div className="w-8 h-8 rounded-full bg-[#10B981]/10 flex items-center justify-center text-[#10B981]">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>

                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-text-high tabular-nums">
                    {formatINR(kpi?.sales || 0)}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-xs font-bold tabular-nums border ${
                        isUp
                          ? 'bg-[#F0FDF4] text-[#10B981] border-[#BBF7D0]'
                          : isDown
                          ? 'bg-[#FEF2F2] text-[#F43F5E] border-[#FECACA]'
                          : 'bg-canvas text-text-medium border-border'
                      }`}
                    >
                      {isUp && <TrendingUp className="w-3.5 h-3.5" />}
                      {isDown && <TrendingDown className="w-3.5 h-3.5" />}
                      {!isUp && !isDown && <Minus className="w-3.5 h-3.5" />}
                      {kpi?.comparison_message || 'No sales recorded'}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/80 flex items-center justify-between text-xs text-text-medium tabular-nums">
                  <span className="flex items-center gap-1">
                    <ReceiptText className="w-3.5 h-3.5 text-text-low" />
                    <span>{kpi?.transactions || 0} bills this week</span>
                  </span>
                  <span className="font-semibold text-[#10B981]">
                    {formatINR(kpi?.profit || 0)} profit
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Monthly Sales Card */}
        {(() => {
          const kpi = data?.kpis.monthly;
          const delta = kpi?.delta_pct;
          const isUp = delta !== null && delta !== undefined && delta > 0;
          const isDown = delta !== null && delta !== undefined && delta < 0;

          return (
            <Card showTrail trailColor="violet" className="border-l-4 border-l-[#8B5CF6] shadow-sm">
              <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-medium uppercase tracking-wider">
                    Monthly Sales
                  </span>
                  <div className="w-8 h-8 rounded-full bg-[#8B5CF6]/10 flex items-center justify-center text-[#8B5CF6]">
                    <Layers className="w-4 h-4" />
                  </div>
                </div>

                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-text-high tabular-nums">
                    {formatINR(kpi?.sales || 0)}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-xs font-bold tabular-nums border ${
                        isUp
                          ? 'bg-[#F0FDF4] text-[#10B981] border-[#BBF7D0]'
                          : isDown
                          ? 'bg-[#FEF2F2] text-[#F43F5E] border-[#FECACA]'
                          : 'bg-canvas text-text-medium border-border'
                      }`}
                    >
                      {isUp && <TrendingUp className="w-3.5 h-3.5" />}
                      {isDown && <TrendingDown className="w-3.5 h-3.5" />}
                      {!isUp && !isDown && <Minus className="w-3.5 h-3.5" />}
                      {kpi?.comparison_message || 'No sales recorded'}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/80 flex items-center justify-between text-xs text-text-medium tabular-nums">
                  <span className="flex items-center gap-1">
                    <ReceiptText className="w-3.5 h-3.5 text-text-low" />
                    <span>{kpi?.transactions || 0} bills this month</span>
                  </span>
                  <span className="font-semibold text-[#10B981]">
                    {formatINR(kpi?.profit || 0)} profit
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })()}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. SALES TRENDS & CONTROLS BAR                                */}
      {/* ------------------------------------------------------------- */}
      <Card showTrail trailColor="indigo" trailSize={105} className="shadow-sm">
        <CardContent className="p-4 flex flex-col gap-4">
          {/* Top Filter and Controls Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-border">
            {/* Period Filter Animated Tabs */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-text-medium mr-1 flex items-center gap-1">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Period:</span>
              </span>
              <div
                className="inline-flex items-center p-1 rounded-lg bg-canvas border border-border gap-1 flex-wrap"
                role="tablist"
                aria-label="Sales and performance period tabs"
              >
                {PERIOD_TABS.map((tab) => {
                  const isActive = period === tab.id;
                  return (
                    <button
                      key={tab.id}
                      id={`analytics-period-tab-${tab.id}`}
                      role="tab"
                      type="button"
                      aria-selected={isActive}
                      aria-controls={`analytics-period-panel-${tab.id}`}
                      onClick={() => handlePresetSelect(tab.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 min-h-[32px] flex items-center justify-center cursor-pointer',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-xs font-bold'
                          : 'text-text-medium hover:text-text-high hover:bg-surface/80'
                      )}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Date Pickers (if custom) & Quick Refresh */}
            <div className="flex items-center gap-2 flex-wrap">
              {period === 'custom' && (
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-text-medium font-medium">From:</span>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="px-2 py-1 bg-surface border border-border rounded-[4px] text-xs font-medium text-text-high focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-text-medium font-medium">To:</span>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="px-2 py-1 bg-surface border border-border rounded-[4px] text-xs font-medium text-text-high focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              )}

              {/* Category Filter */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-text-medium font-medium">Category:</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="px-2.5 py-1.5 bg-surface border border-border rounded-[6px] text-xs font-medium text-text-high focus:outline-none focus:border-primary"
                >
                  <option value="all">All Categories</option>
                  {(data?.categories_list || []).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                variant="secondary"
                onClick={() => {
                  setPeriodCache({});
                  fetchData();
                }}
                disabled={loading}
                className="text-xs min-h-[36px] px-3 gap-1 cursor-pointer"
                title="Refresh analytics data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
            </div>
          </div>

          {/* Chart Mode Selector & Visual Representation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-text-high">Sales & Performance Trajectory</h3>
            </div>

            {/* View Mode Buttons */}
            <div className="flex items-center gap-1 p-1 bg-canvas border border-border rounded-[6px] text-xs">
              {[
                { id: 'sales_profit', label: 'Sales vs. Profit' },
                { id: 'daily', label: 'Daily / Hourly' },
                { id: 'weekly', label: 'Weekly' },
                { id: 'monthly', label: 'Monthly' },
                { id: 'transactions', label: 'Transactions' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setActiveChartMode(m.id as any)}
                  className={`px-2.5 py-1 rounded-[4px] font-semibold transition-colors cursor-pointer ${
                    activeChartMode === m.id
                      ? 'bg-surface text-primary shadow-xs font-bold border border-border'
                      : 'text-text-medium hover:text-text-high'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Animated Period Content with TransitionPanel */}
          <div className="overflow-hidden">
            <TransitionPanel
              activeIndex={activePeriodIndex}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              variants={{
                enter: { opacity: 0, y: -20, filter: 'blur(4px)' },
                center: { opacity: 1, y: 0, filter: 'blur(0px)' },
                exit: { opacity: 0, y: 20, filter: 'blur(4px)' },
              }}
              className="w-full"
            >
              {PERIOD_TABS.map((tab) => {
                const panelData = period === tab.id ? data : (periodCache[tab.id] || null);
                return (
                  <div
                    key={tab.id}
                    id={`analytics-period-panel-${tab.id}`}
                    role="tabpanel"
                    aria-labelledby={`analytics-period-tab-${tab.id}`}
                    className="w-full"
                  >
                    <TrajectoryChartPanel
                      panelData={panelData}
                      activeChartMode={activeChartMode}
                      loading={loading && period === tab.id && !panelData}
                    />
                  </div>
                );
              })}
            </TransitionPanel>
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------- */}
      {/* 8. ACTIONABLE INSIGHTS & AI RECOMMENDATIONS                   */}
      {/* ------------------------------------------------------------- */}
      {data?.insights && data.insights.length > 0 && (
        <Card showTrail trailColor="violet" trailSize={95} className="bg-canvas/50 shadow-sm">
          <CardHeader
            title="Actionable Analytics Insights"
            subtitle="Rule-based, verifiable business observations traced to real store transaction history"
            action={
              <div className="flex items-center gap-1.5 text-xs text-primary font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Verified Insights</span>
              </div>
            }
          />
          <CardContent className="p-4 sm:p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.insights.map((ins, idx) => {
                const borderCls =
                  ins.severity === 'positive'
                    ? 'border-l-4 border-l-[#10B981] bg-[#F0FDF4]/60'
                    : ins.severity === 'danger'
                    ? 'border-l-4 border-l-[#F43F5E] bg-[#FEF2F2]/60'
                    : 'border-l-4 border-l-[#F59E0B] bg-[#FFFBEB]/60';

                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-[8px] border border-border flex flex-col justify-between gap-2 transition-all ${borderCls}`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-text-high line-clamp-1">{ins.title}</span>
                      </div>
                      <p className="text-xs text-text-medium leading-relaxed">{ins.description}</p>
                    </div>

                    <div className="pt-2 border-t border-border/60 text-[10px] text-text-low font-medium truncate">
                      Trace: {ins.trace}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3 & 6. BEST-SELLING & MOST PROFITABLE PRODUCTS GRID           */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3. BEST-SELLING PRODUCTS (with metric switcher) */}
        <Card showTrail trailColor="indigo" trailSize={95} className="shadow-sm">
          <CardHeader
            title="Best-Selling Products"
            subtitle="Top performing items ranked by actual sales records"
            action={
              <div className="flex items-center gap-1 p-0.5 bg-canvas border border-border rounded-[6px] text-[11px]">
                <button
                  type="button"
                  onClick={() => setRankingMetric('revenue')}
                  className={`px-2 py-0.5 rounded-[4px] font-semibold transition-colors ${
                    rankingMetric === 'revenue'
                      ? 'bg-primary text-primary-foreground font-bold'
                      : 'text-text-medium hover:text-text-high'
                  }`}
                >
                  Revenue
                </button>
                <button
                  type="button"
                  onClick={() => setRankingMetric('units')}
                  className={`px-2 py-0.5 rounded-[4px] font-semibold transition-colors ${
                    rankingMetric === 'units'
                      ? 'bg-primary text-primary-foreground font-bold'
                      : 'text-text-medium hover:text-text-high'
                  }`}
                >
                  Units
                </button>
                <button
                  type="button"
                  onClick={() => setRankingMetric('profit')}
                  className={`px-2 py-0.5 rounded-[4px] font-semibold transition-colors ${
                    rankingMetric === 'profit'
                      ? 'bg-primary text-primary-foreground font-bold'
                      : 'text-text-medium hover:text-text-high'
                  }`}
                >
                  Profit
                </button>
              </div>
            }
          />
          <CardContent className="p-4 sm:p-5">
            {(!data?.best_selling || data.best_selling.length === 0) ? (
              <div className="p-8 text-center text-xs text-text-medium italic">
                No product sales records recorded for this timeframe.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {(() => {
                  const maxMetric = Math.max(
                    ...data.best_selling.map((b) =>
                      rankingMetric === 'units'
                        ? b.units_sold
                        : rankingMetric === 'profit'
                        ? b.profit
                        : b.revenue
                    ),
                    1
                  );

                  return data.best_selling.map((item, idx) => {
                    const currentVal =
                      rankingMetric === 'units'
                        ? item.units_sold
                        : rankingMetric === 'profit'
                        ? item.profit
                        : item.revenue;
                    const barWidth = Math.min(100, Math.max(6, (currentVal / maxMetric) * 100));

                    return (
                      <div
                        key={item.product_id}
                        className="p-3 rounded-[6px] bg-surface border border-border flex flex-col gap-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-canvas border border-border flex items-center justify-center font-bold text-[11px] text-text-medium">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-text-high">{item.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 bg-canvas border border-border rounded text-text-medium">
                              {item.category}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 tabular-nums">
                            <span className="font-extrabold text-text-high">
                              {rankingMetric === 'units'
                                ? `${item.units_sold} units`
                                : formatINR(currentVal)}
                            </span>
                            <span className="text-[11px] text-text-low font-medium">
                              ({item.sales_contribution_pct}% share)
                            </span>
                          </div>
                        </div>

                        {/* Relative Comparison Bar */}
                        <div className="w-full h-1.5 bg-canvas rounded-full overflow-hidden border border-border/50">
                          <div
                            className="h-full bg-[#6366F1] rounded-full transition-all duration-300"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-text-medium tabular-nums mt-0.5">
                          <span>{item.units_sold} units sold</span>
                          <span>Rev: {formatINR(item.revenue)}</span>
                          <span className="font-semibold text-[#10B981]">
                            Profit: {formatINR(item.profit)} ({item.margin_pct}%)
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 6. MOST PROFITABLE PRODUCTS */}
        <Card showTrail trailColor="emerald" trailSize={95} className="shadow-sm">
          <CardHeader
            title="Most Profitable Products"
            subtitle="Highest gross profit contributors (Net Sales − COGS)"
          />
          <CardContent className="p-4 sm:p-5">
            {(!data?.most_profitable || data.most_profitable.length === 0) ? (
              <div className="p-8 text-center text-xs text-text-medium italic">
                No profitability metrics recorded for this timeframe.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {(() => {
                  const maxProfit = Math.max(
                    ...data.most_profitable.map((m) => m.gross_profit),
                    1
                  );

                  return data.most_profitable.map((item, idx) => {
                    const barWidth = Math.min(100, Math.max(6, (item.gross_profit / maxProfit) * 100));

                    return (
                      <div
                        key={item.product_id}
                        className="p-3 rounded-[6px] bg-surface border border-border flex flex-col gap-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#10B981]/15 text-[#10B981] flex items-center justify-center font-bold text-[11px]">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-text-high">{item.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 bg-canvas border border-border rounded text-text-medium">
                              {item.category}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 tabular-nums">
                            <span className="font-extrabold text-[#10B981]">
                              +{formatINR(item.gross_profit)}
                            </span>
                            <span className="text-[11px] font-bold px-1.5 py-0.2 rounded bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30">
                              {item.gross_margin_pct}% margin
                            </span>
                          </div>
                        </div>

                        {/* Relative Comparison Bar (Emerald) */}
                        <div className="w-full h-1.5 bg-canvas rounded-full overflow-hidden border border-border/50">
                          <div
                            className="h-full bg-[#10B981] rounded-full transition-all duration-300"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-text-medium tabular-nums mt-0.5">
                          <span>Sales: {formatINR(item.revenue)}</span>
                          <span>COGS: {formatINR(item.cogs)}</span>
                          <span className="text-text-low font-medium">
                            {item.profit_contribution_pct}% of total profit
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Low Margin High Sales Alerts (if any) */}
      {data?.low_margin_alerts && data.low_margin_alerts.length > 0 && (
        <div className="p-4 bg-[#FFFBEB] border border-[#FDE68A] rounded-[8px] flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-[#F59E0B]/20 text-[#D97706] flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold text-[#92400E]">
              High Sales Volume with Thin Profit Margin Detected
            </h4>
            <div className="mt-1 flex flex-col gap-1 text-xs text-[#78350F]">
              {data.low_margin_alerts.map((al) => (
                <div key={al.product_id} className="flex items-center justify-between gap-4">
                  <span>
                    <strong className="text-text-high">{al.name}</strong>: {al.insight}
                  </span>
                  <span className="font-bold tabular-nums shrink-0">
                    {al.gross_margin_pct}% margin ({formatINR(al.revenue)})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4 & 5. PRODUCT DEMAND ANALYSIS & SLOW-SELLING PRODUCTS        */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 5. PRODUCT DEMAND ANALYSIS */}
        <Card showTrail trailColor="cyan" trailSize={95} className="shadow-sm">
          <CardHeader
            title="Product Demand Analysis"
            subtitle="Recent velocity (units/day), demand trends, and replenishment forecasting"
          />
          <CardContent className="p-4 sm:p-5">
            {(!data?.demand_analysis || data.demand_analysis.length === 0) ? (
              <div className="p-8 text-center text-xs text-text-medium italic">
                No product demand velocity records found for this period.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {data.demand_analysis.slice(0, 8).map((item) => {
                  const isInc = item.demand_trend === 'Increasing';
                  const isDec = item.demand_trend === 'Decreasing';
                  const isStable = item.demand_trend === 'Stable';

                  return (
                    <div
                      key={item.product_id}
                      className={`p-3.5 rounded-[8px] border flex flex-col gap-2 ${
                        item.stockout_warning
                          ? 'bg-[#FEF2F2]/60 border-[#FECACA]'
                          : 'bg-surface border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-text-high">{item.name}</span>
                          <span className="text-[10px] text-text-low ml-2">({item.category})</span>
                        </div>

                        {/* Demand Trend Badge */}
                        <div className="flex items-center gap-1.5">
                          {isInc && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-[#F0FDF4] text-[#10B981] border border-[#BBF7D0]">
                              <TrendingUp className="w-3 h-3" />
                              <span>Increasing</span>
                              {item.velocity_change_pct !== null && (
                                <span className="tabular-nums">+{item.velocity_change_pct}%</span>
                              )}
                            </span>
                          )}
                          {isDec && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-[#FEF2F2] text-[#F43F5E] border border-[#FECACA]">
                              <TrendingDown className="w-3 h-3" />
                              <span>Decreasing</span>
                              {item.velocity_change_pct !== null && (
                                <span className="tabular-nums">{item.velocity_change_pct}%</span>
                              )}
                            </span>
                          )}
                          {isStable && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                              <Minus className="w-3 h-3" />
                              <span>Stable Demand</span>
                            </span>
                          )}
                          {!isInc && !isDec && !isStable && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-canvas text-text-medium border border-border">
                              <span>Insufficient Data</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/60 text-xs tabular-nums">
                        <div>
                          <span className="text-[10px] text-text-low block">Velocity</span>
                          <span className="font-bold text-text-high">
                            {item.velocity_per_day} units/day
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-text-low block">Current Stock</span>
                          <span className="font-bold text-text-high">{item.current_stock} units</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-text-low block">Stock Coverage</span>
                          <span
                            className={`font-bold ${
                              item.stockout_warning ? 'text-[#F43F5E]' : 'text-text-high'
                            }`}
                          >
                            {item.days_stock_remaining !== null
                              ? `${item.days_stock_remaining} days`
                              : '–'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-text-low block">Restock Suggestion</span>
                          <span className="font-bold text-[#6366F1]">
                            {item.suggested_restock_qty > 0
                              ? `+${item.suggested_restock_qty} units`
                              : 'Adequate'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 4. SLOW-SELLING PRODUCTS */}
        <Card showTrail trailColor="amber" trailSize={95} className="shadow-sm">
          <CardHeader
            title="Slow-Selling Products"
            subtitle="Products with dormant turnover or no recent transactions"
          />
          <CardContent className="p-4 sm:p-5">
            {(!data?.slow_selling || data.slow_selling.length === 0) ? (
              <div className="p-8 text-center text-xs text-text-medium italic">
                No slow-selling or dormant stock identified.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {data.slow_selling.slice(0, 8).map((item) => {
                  const isDormant = item.status === 'No Recent Sales';
                  const isSlow = item.status === 'Slow Selling';

                  const badgeCls = isDormant
                    ? 'bg-[#FEF2F2] text-[#F43F5E] border-[#FECACA]'
                    : isSlow
                    ? 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]'
                    : 'bg-canvas text-text-medium border-border';

                  return (
                    <div
                      key={item.product_id}
                      className="p-3.5 rounded-[8px] border border-border bg-surface flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-text-high">{item.name}</span>
                          <span className="text-[10px] text-text-low">({item.category})</span>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold border tabular-nums ${badgeCls}`}
                        >
                          {item.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60 text-xs tabular-nums">
                        <div>
                          <span className="text-[10px] text-text-low block">Current Stock</span>
                          <span className="font-bold text-text-high">{item.current_stock} units</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-text-low block">Units Sold (Period)</span>
                          <span className="font-bold text-text-high">{item.units_sold} units</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-text-low block">Last Sale Date</span>
                          <span className="font-medium text-text-high">
                            {item.last_sale_date || 'No sales recorded'}
                          </span>
                        </div>
                      </div>

                      <div className="p-2 bg-canvas rounded-[4px] border border-border/70 text-[11px] text-text-medium flex items-start gap-1.5">
                        <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                        <span>{item.recommendation}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 7. PRODUCT PERFORMANCE COMPARISON TABLE                       */}
      {/* ------------------------------------------------------------- */}
      <Card showTrail trailColor="indigo" trailSize={105} className="shadow-sm">
        <CardHeader
          title="Product Performance Comparison Table"
          subtitle="Search, filter, and sort catalog products across volume, revenue, gross profit, and stock health"
          action={
            <div className="flex flex-wrap items-center gap-2">
              {/* Table Search */}
              <div className="relative w-48 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-low" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={tableSearch}
                  onChange={(e) => {
                    setTableSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-8 pr-3 py-1 bg-surface border border-border rounded-[4px] text-xs text-text-high focus:outline-none focus:border-primary"
                />
              </div>

              {/* Table Category */}
              <select
                value={tableCategory}
                onChange={(e) => {
                  setTableCategory(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1 bg-surface border border-border rounded-[4px] text-xs text-text-high focus:outline-none focus:border-primary"
              >
                <option value="all">All Categories</option>
                {(data?.categories_list || []).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          }
        />
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-canvas border-b border-border text-text-medium font-semibold select-none">
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-text-high"
                    onClick={() => handleTableSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Product</span>
                      <ArrowUpDown className="w-3 h-3 text-text-low" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 text-center cursor-pointer hover:text-text-high"
                    onClick={() => handleTableSort('units_sold')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Units Sold</span>
                      <ArrowUpDown className="w-3 h-3 text-text-low" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 text-right cursor-pointer hover:text-text-high"
                    onClick={() => handleTableSort('sales_revenue')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Sales Revenue</span>
                      <ArrowUpDown className="w-3 h-3 text-text-low" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 text-right cursor-pointer hover:text-text-high"
                    onClick={() => handleTableSort('gross_profit')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Gross Profit</span>
                      <ArrowUpDown className="w-3 h-3 text-text-low" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 text-center cursor-pointer hover:text-text-high"
                    onClick={() => handleTableSort('profit_margin_pct')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Margin</span>
                      <ArrowUpDown className="w-3 h-3 text-text-low" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 text-center cursor-pointer hover:text-text-high"
                    onClick={() => handleTableSort('current_stock')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Stock</span>
                      <ArrowUpDown className="w-3 h-3 text-text-low" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-center">Demand Trend</th>
                  <th className="py-3 px-4 text-center">Sales Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-text-medium italic">
                      No products match your search and filter criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row) => (
                    <tr key={row.product_id} className="hover:bg-canvas/50 transition-colors">
                      <td className="py-2.5 px-4">
                        <span className="font-semibold text-text-high block">{row.name}</span>
                        <span className="text-[10px] text-text-low">
                          ID: #{row.product_id} · {row.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center font-bold text-text-high tabular-nums">
                        {row.units_sold}
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold text-text-high tabular-nums">
                        {formatINR(row.sales_revenue)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-[#10B981] tabular-nums">
                        {formatINR(row.gross_profit)}
                      </td>
                      <td className="py-2.5 px-4 text-center tabular-nums">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[11px] font-bold border ${
                            row.profit_margin_pct >= 20
                              ? 'bg-[#F0FDF4] text-[#10B981] border-[#BBF7D0]'
                              : row.profit_margin_pct >= 10
                              ? 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]'
                              : 'bg-[#FEF2F2] text-[#F43F5E] border-[#FECACA]'
                          }`}
                        >
                          {row.profit_margin_pct}%
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center font-bold text-text-high tabular-nums">
                        {row.current_stock}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                            row.demand_trend === 'Increasing'
                              ? 'bg-[#F0FDF4] text-[#10B981] border-[#BBF7D0]'
                              : row.demand_trend === 'Decreasing'
                              ? 'bg-[#FEF2F2] text-[#F43F5E] border-[#FECACA]'
                              : 'bg-canvas text-text-medium border-border'
                          }`}
                        >
                          {row.demand_trend}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            row.sales_status === 'Best Selling'
                              ? 'bg-[#EEF2FF] text-[#6366F1] border-[#C7D2FE] font-bold'
                              : row.sales_status === 'Slow Selling'
                              ? 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]'
                              : row.sales_status === 'No Recent Sales'
                              ? 'bg-[#FEF2F2] text-[#F43F5E] border-[#FECACA]'
                              : 'bg-canvas text-text-medium border-border'
                          }`}
                        >
                          {row.sales_status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Bar */}
          {totalTablePages > 1 && (
            <div className="p-3 border-t border-border flex items-center justify-between text-xs text-text-medium">
              <span>
                Showing {(page - 1) * pageSize + 1} to{' '}
                {Math.min(page * pageSize, filteredTableRows.length)} of {filteredTableRows.length}{' '}
                products
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="secondary"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="h-7 px-2 text-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </Button>
                <span className="font-bold text-text-high px-2 tabular-nums">
                  {page} / {totalTablePages}
                </span>
                <Button
                  variant="secondary"
                  onClick={() => setPage((p) => Math.min(totalTablePages, p + 1))}
                  disabled={page >= totalTablePages}
                  className="h-7 px-2 text-xs"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
