import * as React from 'react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { api, type SalesTrendResponse, type SalesTrendPoint } from '../../api/client';
import { formatINR } from '../../utils';
import { cn } from '../ui/utils';
import { TrendingUp } from 'lucide-react';

interface SalesTrendCardProps {
  onRecordSaleClick?: () => void;
}

export function SalesTrendCard({ onRecordSaleClick }: SalesTrendCardProps) {
  const [granularity, setGranularity] = React.useState<'daily' | 'weekly'>('daily');
  const [data, setData] = React.useState<SalesTrendResponse>({
    granularity: 'daily',
    has_data: false,
    total_sales: 0,
    total_profit: 0,
    points: [],
  });
  const [loading, setLoading] = React.useState(true);
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.getSalesTrend(granularity)
      .then((res) => {
        if (!cancelled) {
          setData(res);
          // Default active index to the latest data point if data exists
          if (res.has_data && res.points.length > 0) {
            setActiveIndex(res.points.length - 1);
          } else {
            setActiveIndex(null);
          }
        }
      })
      .catch(() => {
        // Fallback
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [granularity]);

  const points = data.points;
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
    <Card>
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
                <span className="w-3 h-3 rounded-[2px] bg-[#B4C5FF]" />
                <span>Sales (₹)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 rounded-full bg-[#004AC6]" />
                <span>Profit (₹)</span>
              </div>
            </div>

            {/* Daily / Weekly Toggle */}
            <div
              className="inline-flex items-center p-1 rounded-[8px] bg-canvas border border-border"
              role="group"
              aria-label="Select trend granularity"
            >
              <button
                type="button"
                onClick={() => setGranularity('daily')}
                className={cn(
                  'px-3 py-1 rounded-[6px] text-xs font-semibold transition-colors min-h-[30px]',
                  granularity === 'daily'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-text-medium hover:text-text-high hover:bg-surface'
                )}
              >
                Daily (30d)
              </button>
              <button
                type="button"
                onClick={() => setGranularity('weekly')}
                className={cn(
                  'px-3 py-1 rounded-[6px] text-xs font-semibold transition-colors min-h-[30px]',
                  granularity === 'weekly'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-text-medium hover:text-text-high hover:bg-surface'
                )}
              >
                Weekly (12w)
              </button>
            </div>
          </div>
        }
      />

      <CardContent className="p-4 sm:p-6 flex flex-col gap-4">
        {/* Totals Summary Banner */}
        <div className="flex items-center justify-between pb-3 border-b border-border text-xs">
          <div className="flex items-center gap-4 sm:gap-6">
            <div>
              <span className="text-[11px] text-text-medium block">Total sales</span>
              <span className="text-base font-bold text-text-high tabular-nums">
                {formatINR(data.total_sales)}
              </span>
            </div>
            <div className="h-7 w-[1px] bg-border" />
            <div>
              <span className="text-[11px] text-text-medium block">Total profit</span>
              <span className="text-base font-bold text-secondary tabular-nums">
                {formatINR(data.total_profit)}
              </span>
            </div>
          </div>

          <div className="text-[11px] text-text-low hidden md:block">
            {granularity === 'daily' ? 'Tap or hover any day for details' : 'Tap or hover any week for details'}
          </div>
        </div>

        {/* CHART WRAPPER (Scrollable at 360px) */}
        <div className="relative w-full overflow-x-auto pb-2">
          <div
            className="relative"
            style={{ minWidth: `${granularity === 'daily' ? 680 : 540}px`, height: '280px' }}
          >
            {/* ZERO STATE OVERLAY: FLAT ZERO BASELINE WITH MESSAGE */}
            {!data.has_data && !loading ? (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-auto">
                <div className="flex flex-col items-center text-center p-6 rounded-[8px] bg-surface/95 border border-border max-w-sm gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <TrendingUp className="w-5 h-5 stroke-[2]" />
                  </div>
                  <h4 className="text-sm font-bold text-text-high">
                    Your sales trend will appear here after your first sale
                  </h4>
                  <p className="text-xs text-text-medium leading-relaxed">
                    Once sales are recorded, daily bars and profit lines will chart your store velocity.
                  </p>
                  {onRecordSaleClick && (
                    <button
                      type="button"
                      onClick={onRecordSaleClick}
                      className="mt-1 px-4 py-1.5 rounded-[6px] text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      Record sale
                    </button>
                  )}
                </div>
              </div>
            ) : null}

            {/* INTERACTIVE TOOLTIP */}
            {data.has_data && activePoint && activeIndex !== null && (
              <div
                className="absolute z-20 pointer-events-none transform -translate-x-1/2 transition-all duration-150"
                style={{
                  left: `${chartLeft + activeIndex * stepX}px`,
                  top: '8px',
                }}
              >
                <div className="bg-[#141B2B] text-[#EDF0FF] px-3 py-2 rounded-[8px] border border-white/10 flex flex-col gap-1 min-w-[140px] text-xs">
                  <div className="font-bold border-b border-white/15 pb-1 text-white">
                    {activePoint.label}
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[#B4C5FF]">Sales:</span>
                    <span className="font-bold tabular-nums text-white">
                      {formatINR(activePoint.sales)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-emerald-300">Profit:</span>
                    <span className="font-bold tabular-nums text-emerald-300">
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

            {/* FLAT SVG CHART (Strictly no gradients, flat fills per DESIGN.md) */}
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
                      stroke={isBaseline ? '#737686' : '#E1E8FD'}
                      strokeWidth={isBaseline ? 1.5 : 1}
                      strokeDasharray={isBaseline ? undefined : '3 3'}
                    />
                    <text
                      x={chartLeft - 8}
                      y={y + 4}
                      fill="#737686"
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

              {/* Data Bars (Flat fills) */}
              {data.has_data &&
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
                        fill={isActive ? '#2563EB' : '#B4C5FF'}
                        stroke={isActive ? '#1D4ED8' : 'none'}
                        strokeWidth={isActive ? 1.5 : 0}
                      />
                    </g>
                  );
                })}

              {/* Converted Profit Line (Blue Line per Reference Screen) */}
              {data.has_data && linePoints.length > 1 && (
                <path
                  d={linePathD}
                  fill="none"
                  stroke="#004AC6"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="pointer-events-none"
                />
              )}

              {/* Data Point Circles on Line */}
              {data.has_data &&
                linePoints.map((pt, idx) => {
                  const isActive = activeIndex === idx;
                  return (
                    <g key={`pt-${idx}`} className="pointer-events-none">
                      {isActive ? (
                        <>
                          <circle cx={pt.x} cy={pt.y} r={6} fill="#004AC6" />
                          <circle cx={pt.x} cy={pt.y} r={3.5} fill="#FFFFFF" />
                        </>
                      ) : (
                        <circle cx={pt.x} cy={pt.y} r={3} fill="#004AC6" />
                      )}
                    </g>
                  );
                })}

              {/* X-Axis Labels */}
              {points.map((p, idx) => {
                const xCenter = chartLeft + idx * stepX;
                const isActive = activeIndex === idx;
                // For daily, show every 4th or 5th label on small views, or all on wide scroll
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
                    fill={isActive ? '#004AC6' : '#434655'}
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
      </CardContent>
    </Card>
  );
}
