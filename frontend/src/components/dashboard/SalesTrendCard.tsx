import * as React from 'react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { api, type SalesTrendResponse, type SalesTrendPoint } from '../../api/client';
import { formatINR } from '../../utils';
import { cn } from '../ui/utils';
import { TrendingUp, Loader2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { CHART_COLORS } from '../../utils/chartColors';
import { TransitionPanel } from '@/components/core/transition-panel';

interface SalesTrendCardProps {
  onRecordSaleClick?: () => void;
}

interface TrendViewProps {
  data: SalesTrendResponse | null;
  granularity: 'daily' | 'weekly';
  loading: boolean;
  activeIndex: number | null;
  setActiveIndex: (idx: number | null) => void;
  isDark: boolean;
  onRecordSaleClick?: () => void;
}

function TrendView({
  data,
  granularity,
  loading,
  activeIndex,
  setActiveIndex,
  isDark,
  onRecordSaleClick,
}: TrendViewProps) {
  const gridStroke = isDark ? '#263650' : '#E2E8F0';
  const baselineStroke = isDark ? '#334155' : '#CBD5E1';
  const axisFill = isDark ? '#94A3B8' : '#64748B';

  const barFillInactive = isDark ? '#4338CA' : CHART_COLORS.sales;
  const barFillActive = CHART_COLORS.salesHover;
  const barStrokeInactive = isDark ? '#6366F1' : 'none';
  const barStrokeActive = '#818CF8';

  const profitLineStroke = CHART_COLORS.profit;
  const profitCircleInner = isDark ? '#0F172A' : '#ffffff';

  const points = data?.points || [];
  const maxSales = Math.max(...points.map((p) => p.sales), 100);
  const maxProfit = Math.max(...points.map((p) => p.profit), 100);
  const maxValue = Math.max(maxSales, maxProfit * 1.5, 100);

  // SVG Chart Geometry
  const svgWidth = granularity === 'daily' ? 780 : 640;
  const svgHeight = 260;
  const chartTop = 25;
  const chartBottom = 210;
  const chartHeight = chartBottom - chartTop;
  const chartLeft = 55;
  const chartRight = svgWidth - 25;
  const plotWidth = chartRight - chartLeft;

  const numPoints = points.length;
  const stepX = numPoints > 1 ? plotWidth / (numPoints - 1) : plotWidth;
  const barWidth = granularity === 'daily' ? 14 : 26;

  // Compute coordinates for line path
  const linePoints = points.map((p, idx) => {
    const x = chartLeft + idx * stepX;
    const yVal = p.profit;
    const y = chartBottom - (yVal / maxValue) * chartHeight;
    return { x, y, point: p };
  });

  const linePathD = linePoints.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x},${curr.y}` : `${acc} L ${curr.x},${curr.y}`;
  }, '');

  const activePoint: SalesTrendPoint | null =
    activeIndex !== null && points[activeIndex] ? points[activeIndex] : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Totals Summary Banner */}
      <div className="flex items-center justify-between pb-3 border-b border-border text-xs min-h-[46px]">
        <div className="flex items-center gap-4 sm:gap-6">
          <div>
            <span className="text-[11px] text-text-medium block">Total sales</span>
            <span className="text-base font-bold text-text-high tabular-nums">
              {data ? formatINR(data.total_sales) : '—'}
            </span>
          </div>
          <div className="h-7 w-[1px] bg-border" />
          <div>
            <span className="text-[11px] text-text-medium block">Total profit</span>
            <span className="text-base font-bold text-secondary tabular-nums">
              {data ? formatINR(data.total_profit) : '—'}
            </span>
          </div>
        </div>

        <div className="text-[11px] text-text-low hidden md:block">
          {granularity === 'daily'
            ? 'Tap or hover any day for details'
            : 'Tap or hover any week for details'}
        </div>
      </div>

      {/* CHART WRAPPER (Scrollable at 360px) */}
      <div className="relative w-full overflow-x-auto pb-2">
        <div
          className="relative"
          style={{ minWidth: `${granularity === 'daily' ? 680 : 540}px`, height: '280px' }}
        >
          {/* Loading Indicator if waiting for initial data */}
          {loading && !data && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-surface/60 backdrop-blur-xs rounded-[8px]">
              <div className="flex items-center gap-2 text-xs text-text-medium">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>Loading {granularity} sales trend...</span>
              </div>
            </div>
          )}

          {/* ZERO STATE OVERLAY: FLAT ZERO BASELINE WITH MESSAGE */}
          {data && !data.has_data && !loading ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-auto">
              <div className="flex flex-col items-center text-center p-6 rounded-[8px] bg-surface/95 border border-border max-w-sm gap-2.5">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <TrendingUp className="w-5 h-5 stroke-[2]" />
                </div>
                <h4 className="text-sm font-bold text-text-high">
                  Your sales trend will appear here after your first sale
                </h4>
                <p className="text-xs text-text-medium leading-relaxed">
                  Once sales are recorded, {granularity} bars and profit lines will chart your store velocity.
                </p>
                {onRecordSaleClick && (
                  <button
                    type="button"
                    onClick={onRecordSaleClick}
                    className="mt-1 px-4 py-1.5 rounded-[6px] text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
                  >
                    Record sale
                  </button>
                )}
              </div>
            </div>
          ) : null}

          {/* INTERACTIVE TOOLTIP */}
          {data?.has_data && activePoint && activeIndex !== null && (
            <div
              className="absolute z-20 pointer-events-none transform -translate-x-1/2 transition-all duration-150"
              style={{
                left: `${chartLeft + activeIndex * stepX}px`,
                top: '8px',
              }}
            >
              <div className="bg-[#141B2B] text-[#EDF0FF] px-3 py-2 rounded-[8px] border border-white/10 flex flex-col gap-1 min-w-[140px] text-xs shadow-lg">
                <div className="font-bold border-b border-white/15 pb-1 text-white">
                  {activePoint.label}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#A5B4FC] font-medium">Sales:</span>
                  <span className="font-bold tabular-nums text-white">
                    {formatINR(activePoint.sales)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#34D399] font-medium">Profit:</span>
                  <span className="font-bold tabular-nums text-[#34D399]">
                    {formatINR(activePoint.profit)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-text-low text-[11px]">Orders:</span>
                  <span className="tabular-nums text-white text-[11px]">
                    {activePoint.transactions} bills
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* FLAT SVG CHART */}
          <svg
            className="w-full h-full overflow-visible select-none"
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            preserveAspectRatio="none"
          >
            {/* Horizontal Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
              const y = chartBottom - pct * chartHeight;
              const gridVal = Math.round(pct * maxValue);
              const isBaseline = pct === 0;

              return (
                <g key={i}>
                  <line
                    x1={chartLeft}
                    x2={chartRight}
                    y1={y}
                    y2={y}
                    stroke={isBaseline ? baselineStroke : gridStroke}
                    strokeWidth={isBaseline ? 1.5 : 1}
                    strokeDasharray={isBaseline ? undefined : '3 3'}
                  />
                  <text
                    x={chartLeft - 8}
                    y={y + 4}
                    fill={axisFill}
                    fontFamily="Inter"
                    fontSize="10"
                    textAnchor="end"
                    className="tabular-nums select-none"
                  >
                    {isBaseline ? '₹0' : `₹${gridVal >= 1000 ? `${Math.round(gridVal / 1000)}k` : gridVal}`}
                  </text>
                </g>
              );
            })}

            {/* Data Bars */}
            {data?.has_data &&
              points.map((p, idx) => {
                const xCenter = chartLeft + idx * stepX;
                const barH = (p.sales / maxValue) * chartHeight;
                const barY = chartBottom - barH;
                const isActive = activeIndex === idx;

                return (
                  <g
                    key={`bar-${idx}`}
                    className="cursor-pointer"
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => setActiveIndex(idx)}
                    onTouchStart={() => setActiveIndex(idx)}
                  >
                    {/* Transparent touch hit area */}
                    <rect
                      x={xCenter - stepX / 2}
                      y={chartTop}
                      width={stepX}
                      height={chartHeight + 25}
                      fill="transparent"
                    />

                    {/* Flat Filled Bar */}
                    <rect
                      x={xCenter - barWidth / 2}
                      y={barH > 0 ? barY : chartBottom - 1}
                      width={barWidth}
                      height={barH > 0 ? barH : 1}
                      rx={2}
                      fill={isActive ? barFillActive : barFillInactive}
                      stroke={isActive ? barStrokeActive : barStrokeInactive}
                      strokeWidth={isActive ? 1.5 : (isDark ? 1 : 0)}
                    />
                  </g>
                );
              })}

            {/* Converted Profit Line */}
            {data?.has_data && linePoints.length > 1 && (
              <path
                d={linePathD}
                fill="none"
                stroke={profitLineStroke}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="pointer-events-none"
              />
            )}

            {/* Data Point Circles on Line */}
            {data?.has_data &&
              linePoints.map((pt, idx) => {
                const isActive = activeIndex === idx;
                return (
                  <g key={`pt-${idx}`} className="pointer-events-none">
                    {isActive ? (
                      <>
                        <circle cx={pt.x} cy={pt.y} r={6} fill={profitLineStroke} />
                        <circle cx={pt.x} cy={pt.y} r={3.5} fill={profitCircleInner} />
                      </>
                    ) : (
                      <circle cx={pt.x} cy={pt.y} r={3} fill={profitLineStroke} />
                    )}
                  </g>
                );
              })}

            {/* X-Axis Labels */}
            {points.map((p, idx) => {
              const xCenter = chartLeft + idx * stepX;
              const isActive = activeIndex === idx;
              const showLabel =
                granularity === 'weekly' ||
                idx === 0 ||
                idx === points.length - 1 ||
                idx % (granularity === 'daily' ? 4 : 2) === 0 ||
                isActive;

              if (!showLabel) return null;

              return (
                <text
                  key={`label-${idx}`}
                  x={xCenter}
                  y={chartBottom + 20}
                  fill={isActive ? (isDark ? '#e6edf7' : '#0b1c30') : axisFill}
                  fontFamily="Inter"
                  fontSize="10"
                  fontWeight={isActive ? '700' : '500'}
                  textAnchor="middle"
                  className="select-none"
                >
                  {p.label}
                </text>
              );
            })}
          </svg>
        </div>
      </div>

      {/* 360px mobile view hint */}
      <div className="flex sm:hidden items-center justify-between text-[11px] text-text-low pt-1">
        <span>← Swipe horizontally to view full range →</span>
        <span>Tap bar for values</span>
      </div>
    </div>
  );
}

export function SalesTrendCard({ onRecordSaleClick }: SalesTrendCardProps) {
  const { isDark } = useTheme();
  const [granularity, setGranularity] = React.useState<'daily' | 'weekly'>('daily');
  const [dailyData, setDailyData] = React.useState<SalesTrendResponse | null>(null);
  const [weeklyData, setWeeklyData] = React.useState<SalesTrendResponse | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);

  const [dailyActiveIndex, setDailyActiveIndex] = React.useState<number | null>(null);
  const [weeklyActiveIndex, setWeeklyActiveIndex] = React.useState<number | null>(null);

  const PERIOD_TABS = [
    { id: 'daily' as const, label: 'Daily (30d)' },
    { id: 'weekly' as const, label: 'Weekly' },
  ];

  const activeIndex = granularity === 'daily' ? 0 : 1;

  // Fetch trend data per granularity
  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);

    api.getSalesTrend(granularity)
      .then((res) => {
        if (!cancelled) {
          if (granularity === 'daily') {
            setDailyData(res);
            if (res.has_data && res.points.length > 0) {
              setDailyActiveIndex(res.points.length - 1);
            }
          } else {
            setWeeklyData(res);
            if (res.has_data && res.points.length > 0) {
              setWeeklyActiveIndex(res.points.length - 1);
            }
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load sales trend:', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [granularity]);

  // Pre-load weekly data in the background after initial mount for instantaneous tab switching
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (!weeklyData) {
        api.getSalesTrend('weekly')
          .then((res) => {
            setWeeklyData(res);
            if (res.has_data && res.points.length > 0) {
              setWeeklyActiveIndex(res.points.length - 1);
            }
          })
          .catch(() => {});
      }
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Card showTrail trailColor="indigo" trailSize={100} className="shadow-sm">
      <CardHeader
        title="Sales trend"
        subtitle={
          granularity === 'daily'
            ? 'Daily revenue velocity over the last 30 days'
            : 'Weekly revenue velocity over the last 12 weeks'
        }
        action={
          <div className="flex items-center gap-3">
            {/* Legend */}
            <div className="hidden sm:flex items-center gap-3 text-xs text-text-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-[3px] bg-[#6366F1] border border-border" />
                <span>Sales (₹)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded-full bg-[#10B981]" />
                <span>Profit (₹)</span>
              </div>
            </div>

            {/* Animated Period Tabs */}
            <div
              className="inline-flex items-center p-1 rounded-lg bg-canvas border border-border gap-1"
              role="tablist"
              aria-label="Sales trend period tabs"
            >
              {PERIOD_TABS.map((tab, index) => {
                const isActive = activeIndex === index;
                return (
                  <button
                    key={tab.id}
                    id={`sales-trend-tab-${tab.id}`}
                    role="tab"
                    type="button"
                    aria-selected={isActive}
                    aria-controls={`sales-trend-panel-${tab.id}`}
                    onClick={() => setGranularity(tab.id)}
                    className={cn(
                      'px-3 py-1 rounded-md text-xs font-semibold transition-all duration-150 min-h-[30px] flex items-center justify-center cursor-pointer',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-text-medium hover:text-text-high hover:bg-surface/80'
                    )}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        }
      />

      <CardContent className="p-4 sm:p-6">
        <div className="overflow-hidden">
          <TransitionPanel
            activeIndex={activeIndex}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            variants={{
              enter: { opacity: 0, y: -20, filter: 'blur(4px)' },
              center: { opacity: 1, y: 0, filter: 'blur(0px)' },
              exit: { opacity: 0, y: 20, filter: 'blur(4px)' },
            }}
            className="w-full"
          >
            <div
              id="sales-trend-panel-daily"
              role="tabpanel"
              aria-labelledby="sales-trend-tab-daily"
              className="w-full"
            >
              <TrendView
                data={dailyData}
                granularity="daily"
                loading={loading && !dailyData}
                activeIndex={dailyActiveIndex}
                setActiveIndex={setDailyActiveIndex}
                isDark={isDark}
                onRecordSaleClick={onRecordSaleClick}
              />
            </div>

            <div
              id="sales-trend-panel-weekly"
              role="tabpanel"
              aria-labelledby="sales-trend-tab-weekly"
              className="w-full"
            >
              <TrendView
                data={weeklyData}
                granularity="weekly"
                loading={loading && !weeklyData}
                activeIndex={weeklyActiveIndex}
                setActiveIndex={setWeeklyActiveIndex}
                isDark={isDark}
                onRecordSaleClick={onRecordSaleClick}
              />
            </div>
          </TransitionPanel>
        </div>
      </CardContent>
    </Card>
  );
}

