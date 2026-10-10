import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Download,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { api, type SalesAnalyticsResponse } from '../../api/client';
import { formatINR } from '../../utils';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { WeekdayHourHeatmap } from './WeekdayHourHeatmap';

export function SalesAnalyticsTab() {
  const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [activePreset, setActivePreset] = useState<string>('30d');

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SalesAnalyticsResponse>({
    granularity: 'daily',
    from_date: fromDate,
    to_date: toDate,
    has_data: false,
    total_sales: 0,
    total_profit: 0,
    total_transactions: 0,
    average_bill: 0,
    profit_margin_pct: 0,
    highlights: {
      best_day: '–',
      best_day_sales: 0,
      slowest_day: '–',
      slowest_day_sales: 0,
      busiest_hour: '–',
      busiest_hour_tx: 0,
    },
    points: [],
    heatmap: [],
  });

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAnalyticsSales({
        granularity,
        from: fromDate,
        to: toDate,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch sales analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [granularity, fromDate, toDate]);

  const handlePresetChange = (preset: string) => {
    setActivePreset(preset);
    const today = new Date();
    const endStr = today.toISOString().split('T')[0];
    setToDate(endStr);

    if (preset === '7d') {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      setFromDate(d.toISOString().split('T')[0]);
    } else if (preset === '30d') {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      setFromDate(d.toISOString().split('T')[0]);
    } else if (preset === '90d') {
      const d = new Date();
      d.setDate(d.getDate() - 89);
      setFromDate(d.toISOString().split('T')[0]);
    } else if (preset === 'mtd') {
      const d = new Date(today.getFullYear(), today.getMonth(), 1);
      setFromDate(d.toISOString().split('T')[0]);
    } else if (preset === 'all') {
      setFromDate('');
      setToDate('');
    }
  };

  const exportCSV = () => {
    if (!data.points || data.points.length === 0) return;

    const headers = ['Period', 'Date', 'Sales (₹)', 'Profit (₹)', 'Transactions', 'Average Bill (₹)', 'Margin (%)'];
    const rows = data.points.map((pt) => [
      `"${pt.period.replace(/"/g, '""')}"`,
      `"${pt.date}"`,
      pt.sales.toFixed(2),
      pt.profit.toFixed(2),
      pt.transactions,
      pt.average_bill.toFixed(2),
      pt.profit_margin_pct.toFixed(2),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `sales_analytics_${granularity}_${fromDate || 'all'}_to_${toDate || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // SVG Chart Geometry
  const chartPoints = data.points || [];
  const svgWidth = 760;
  const svgHeight = 260;
  const padLeft = 60;
  const padRight = 24;
  const padTop = 20;
  const padBottom = 40;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  const maxVal = useMemo(() => {
    if (!data.has_data || chartPoints.length === 0) return 10000;
    const peak = Math.max(...chartPoints.map((p) => Math.max(p.sales, p.profit)));
    return peak > 0 ? peak * 1.15 : 10000;
  }, [data.has_data, chartPoints]);

  const stepX = chartPoints.length > 1 ? plotWidth / (chartPoints.length - 1) : plotWidth;

  const salesCoordinates = chartPoints.map((pt, idx) => {
    const x = padLeft + idx * stepX;
    const y = data.has_data ? padTop + plotHeight - (pt.sales / maxVal) * plotHeight : padTop + plotHeight;
    return { x, y, pt };
  });

  const profitCoordinates = chartPoints.map((pt, idx) => {
    const x = padLeft + idx * stepX;
    const y = data.has_data ? padTop + plotHeight - (pt.profit / maxVal) * plotHeight : padTop + plotHeight;
    return { x, y, pt };
  });

  const salesPath = salesCoordinates.reduce(
    (acc, c, idx) => (idx === 0 ? `M ${c.x},${c.y}` : `${acc} L ${c.x},${c.y}`),
    ''
  );

  const profitPath = profitCoordinates.reduce(
    (acc, c, idx) => (idx === 0 ? `M ${c.x},${c.y}` : `${acc} L ${c.x},${c.y}`),
    ''
  );

  const activePoint = hoverIndex !== null && chartPoints[hoverIndex] ? chartPoints[hoverIndex] : null;

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div className="p-3 rounded-[6px] bg-red-50 border border-red-200 text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {/* Filter and Granularity Controls Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Granularity Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-text-medium mr-1">View:</span>
            <div
              className="inline-flex items-center p-1 rounded-[8px] bg-canvas border border-border"
              role="group"
              aria-label="Granularity"
            >
              {(['daily', 'weekly', 'monthly'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGranularity(g)}
                  className={`px-3 py-2 rounded-[6px] text-xs font-semibold capitalize transition-colors min-h-[48px] flex items-center justify-center ${
                    granularity === g
                      ? 'bg-primary text-primary-foreground'
                      : 'text-text-medium hover:text-text-high hover:bg-surface'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range Presets & Date Inputs */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              {[
                { id: '7d', label: '7D' },
                { id: '30d', label: '30D' },
                { id: '90d', label: '90D' },
                { id: 'mtd', label: 'Month' },
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
        </CardContent>
      </Card>

      {/* Highlights Cards (Best day, Slowest day, Busiest hour) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Best Day Card */}
        <Card className="border-l-4 border-l-secondary">
          <CardContent className="p-4 flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-text-medium block">
                Best day
              </span>
              <div className="text-xl font-bold text-text-high mt-1">
                {data.has_data ? data.highlights.best_day : '–'}
              </div>
              <div className="text-xs font-medium text-secondary mt-0.5">
                {data.has_data && data.highlights.best_day_sales > 0
                  ? `${formatINR(data.highlights.best_day_sales)} revenue`
                  : '–'}
              </div>
            </div>
            <div className="w-9 h-9 rounded-[6px] bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Slowest Day Card */}
        <Card className="border-l-4 border-l-border">
          <CardContent className="p-4 flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-text-medium block">
                Slowest day
              </span>
              <div className="text-xl font-bold text-text-high mt-1">
                {data.has_data ? data.highlights.slowest_day : '–'}
              </div>
              <div className="text-xs font-medium text-text-medium mt-0.5">
                {data.has_data && data.highlights.slowest_day_sales > 0
                  ? `${formatINR(data.highlights.slowest_day_sales)} revenue`
                  : '–'}
              </div>
            </div>
            <div className="w-9 h-9 rounded-[6px] bg-canvas flex items-center justify-center text-text-medium shrink-0 border border-border">
              <TrendingDown className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Busiest Hour Card */}
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4 flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-text-medium block">
                Busiest hour
              </span>
              <div className="text-xl font-bold text-text-high mt-1">
                {data.has_data ? data.highlights.busiest_hour : '–'}
              </div>
              <div className="text-xs font-medium text-primary mt-0.5">
                {data.has_data && data.highlights.busiest_hour_tx > 0
                  ? `${data.highlights.busiest_hour_tx} transactions`
                  : '–'}
              </div>
            </div>
            <div className="w-9 h-9 rounded-[6px] bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary KPI Band */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3 rounded-[8px] bg-surface border border-border">
          <span className="text-[11px] text-text-medium block font-medium">Total sales</span>
          <span className="text-lg font-bold text-text-high tabular-nums block mt-0.5">
            {formatINR(data.total_sales)}
          </span>
        </div>
        <div className="p-3 rounded-[8px] bg-surface border border-border">
          <span className="text-[11px] text-text-medium block font-medium">Total profit</span>
          <span className="text-lg font-bold text-secondary tabular-nums block mt-0.5">
            {formatINR(data.total_profit)}
          </span>
        </div>
        <div className="p-3 rounded-[8px] bg-surface border border-border">
          <span className="text-[11px] text-text-medium block font-medium">Transactions</span>
          <span className="text-lg font-bold text-text-high tabular-nums block mt-0.5">
            {data.total_transactions}
          </span>
        </div>
        <div className="p-3 rounded-[8px] bg-surface border border-border">
          <span className="text-[11px] text-text-medium block font-medium">Average bill</span>
          <span className="text-lg font-bold text-text-high tabular-nums block mt-0.5">
            {formatINR(data.average_bill)}
          </span>
        </div>
        <div className="p-3 rounded-[8px] bg-surface border border-border col-span-2 sm:col-span-1">
          <span className="text-[11px] text-text-medium block font-medium">Profit margin</span>
          <span className="text-lg font-bold text-text-high tabular-nums block mt-0.5">
            {data.profit_margin_pct.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Line Chart of Sales and Profit */}
      <Card>
        <CardHeader
          title="Sales & profit trend"
          subtitle={`Dual-metric trajectory across ${granularity} periods`}
          action={
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-1 bg-[#2563EB] rounded-full" />
                <span className="font-semibold text-text-high">Sales (₹)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-1 bg-[#16A34A] rounded-full" />
                <span className="font-semibold text-text-high">Profit (₹)</span>
              </div>
            </div>
          }
        />
        <CardContent className="p-4 sm:p-6 flex flex-col gap-4">
          {/* Chart Frame */}
          <div className="relative w-full overflow-x-auto pb-2">
            <div className="relative min-w-[540px] h-[280px]">
              {/* Zero State Frame Message when no sales */}
              {!data.has_data && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-surface/80 rounded-[6px]">
                  <div className="text-center p-4 max-w-xs">
                    <p className="text-sm font-semibold text-text-high">Empty chart frame</p>
                    <p className="text-xs text-text-medium mt-1">
                      No sales in this period. The zero baseline is shown below.
                    </p>
                  </div>
                </div>
              )}

              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-full select-none overflow-visible"
              >
                {/* Y-axis horizontal gridlines */}
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
                        fontFamily="inherit"
                        className="tabular-nums"
                      >
                        {formatINR(Math.round(val))}
                      </text>
                    </g>
                  );
                })}

                {/* Flat Zero Baseline Highlight */}
                <line
                  x1={padLeft}
                  x2={svgWidth - padRight}
                  y1={padTop + plotHeight}
                  y2={padTop + plotHeight}
                  stroke="#9CA3AF"
                  strokeWidth={1.5}
                />

                {/* Data lines when data exists */}
                {data.has_data && chartPoints.length > 0 && (
                  <>
                    {/* Sales Path (Store BI Blue) */}
                    <path
                      d={salesPath}
                      fill="none"
                      stroke="#2563EB"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Profit Path (Success Green) */}
                    <path
                      d={profitPath}
                      fill="none"
                      stroke="#16A34A"
                      strokeWidth={2.2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Interactive Circles & Hit Areas */}
                    {chartPoints.map((_pt, idx) => {
                      const sx = salesCoordinates[idx].x;
                      const sy = salesCoordinates[idx].y;
                      const py = profitCoordinates[idx].y;
                      const isHovered = hoverIndex === idx;

                      return (
                        <g key={idx}>
                          {/* Active vertical guide line */}
                          {isHovered && (
                            <line
                              x1={sx}
                              x2={sx}
                              y1={padTop}
                              y2={padTop + plotHeight}
                              stroke="#64748B"
                              strokeDasharray="2 2"
                              strokeWidth={1}
                            />
                          )}

                          {/* Sales point circle */}
                          <circle
                            cx={sx}
                            cy={sy}
                            r={isHovered ? 5 : 3}
                            fill="#2563EB"
                            stroke="#FFFFFF"
                            strokeWidth={1.5}
                          />

                          {/* Profit point circle */}
                          <circle
                            cx={sx}
                            cy={py}
                            r={isHovered ? 4.5 : 2.5}
                            fill="#16A34A"
                            stroke="#FFFFFF"
                            strokeWidth={1.5}
                          />

                          {/* Wide invisible hit target for easier hover */}
                          <rect
                            x={sx - stepX / 2}
                            y={padTop}
                            width={stepX}
                            height={plotHeight}
                            fill="transparent"
                            className="cursor-pointer"
                            onMouseEnter={() => setHoverIndex(idx)}
                            onClick={() => setHoverIndex(idx)}
                          />
                        </g>
                      );
                    })}
                  </>
                )}

                {/* X-axis date labels */}
                {chartPoints.map((pt, idx) => {
                  // Show max 8 labels to prevent overlap
                  const showLabel =
                    chartPoints.length <= 8 ||
                    idx === 0 ||
                    idx === chartPoints.length - 1 ||
                    idx % Math.ceil(chartPoints.length / 7) === 0;

                  if (!showLabel) return null;
                  const x = padLeft + idx * stepX;
                  return (
                    <text
                      key={idx}
                      x={x}
                      y={svgHeight - 12}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#737686"
                      fontFamily="inherit"
                    >
                      {pt.period}
                    </text>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Interactive Tooltip Callout */}
          <div className="p-3 rounded-[6px] bg-canvas border border-border text-xs flex flex-wrap items-center justify-between min-h-[44px]">
            {activePoint ? (
              <div className="flex flex-wrap items-center gap-4">
                <span className="font-bold text-text-high">
                  {activePoint.period} ({activePoint.date})
                </span>
                <span className="text-text-medium">
                  Sales: <strong className="text-[#2563EB]">{formatINR(activePoint.sales)}</strong>
                </span>
                <span className="text-text-medium">
                  Profit: <strong className="text-[#16A34A]">{formatINR(activePoint.profit)}</strong>
                </span>
                <span className="text-text-medium">
                  Bills: <strong className="text-text-high">{activePoint.transactions}</strong>
                </span>
                <span className="text-text-medium">
                  Avg Bill: <strong className="text-text-high">{formatINR(activePoint.average_bill)}</strong>
                </span>
                <span className="text-text-medium">
                  Margin: <strong className="text-text-high">{activePoint.profit_margin_pct.toFixed(1)}%</strong>
                </span>
              </div>
            ) : (
              <span className="text-text-low text-[11px]">
                Hover or tap on points along the line chart to view granular metrics.
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Weekday x Hour Footfall Heatmap */}
      <Card>
        <CardHeader
          title="Busiest hours & shopping patterns"
          subtitle="Hourly transaction density to plan staffing and stock readiness"
        />
        <CardContent className="p-4 sm:p-6">
          <WeekdayHourHeatmap cells={data.heatmap || []} />
        </CardContent>
      </Card>

      {/* Data Table with Export CSV */}
      <Card>
        <CardHeader
          title="Periodic sales & profit breakdown"
          subtitle="Tabular summary for the selected date range"
          action={
            <Button
              variant="secondary"
              onClick={exportCSV}
              disabled={!data.has_data || data.points.length === 0}
              className="text-xs h-9 min-h-[36px] px-3 gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export table as CSV</span>
            </Button>
          }
        />
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-canvas text-text-medium font-semibold">
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4 text-right">Sales</th>
                  <th className="py-3 px-4 text-right">Profit</th>
                  <th className="py-3 px-4 text-right">Transactions</th>
                  <th className="py-3 px-4 text-right">Average bill</th>
                  <th className="py-3 px-4 text-right">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {!data.has_data || data.points.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center text-text-medium font-medium bg-surface"
                    >
                      No sales in this period
                    </td>
                  </tr>
                ) : (
                  data.points.map((pt, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-canvas/50 transition-colors tabular-nums"
                    >
                      <td className="py-3 px-4 font-semibold text-text-high">
                        {pt.period}
                        <span className="block text-[10px] text-text-low font-normal">
                          {pt.date}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-text-high">
                        {formatINR(pt.sales)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-secondary">
                        {formatINR(pt.profit)}
                      </td>
                      <td className="py-3 px-4 text-right text-text-medium">
                        {pt.transactions}
                      </td>
                      <td className="py-3 px-4 text-right text-text-medium">
                        {formatINR(pt.average_bill)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-text-high">
                        {pt.profit_margin_pct.toFixed(1)}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
