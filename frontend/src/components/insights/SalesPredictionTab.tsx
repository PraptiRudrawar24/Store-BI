import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Info,
  Calendar,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { api, type SalesForecastResponse } from '../../api/client';
import { formatINR } from '../../utils';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useNavigate } from 'react-router-dom';

export function SalesPredictionTab() {
  const navigate = useNavigate();
  const [horizonDays, setHorizonDays] = useState<7 | 14 | 30>(7);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SalesForecastResponse | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const fetchForecast = async (days: 7 | 14 | 30) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAISalesForecast(days);
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate sales forecast');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast(horizonDays);
  }, [horizonDays]);

  // Calculations for chart geometry
  const histPoints = data?.historical_points || [];
  const forePoints = data?.forecast_points || [];

  const totalPointsCount = (histPoints.length || 0) + (forePoints.length || 0);

  // SVG dimensions
  const svgWidth = 860;
  const svgHeight = 320;
  const padLeft = 70;
  const padRight = 30;
  const padTop = 30;
  const padBottom = 50;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  const maxVal = useMemo(() => {
    let peak = 1000;
    histPoints.forEach((p) => {
      if (p.actual_sales > peak) peak = p.actual_sales;
    });
    forePoints.forEach((p) => {
      if (p.upper_bound > peak) peak = p.upper_bound;
      if (p.predicted_sales > peak) peak = p.predicted_sales;
    });
    return Math.ceil(peak * 1.15);
  }, [histPoints, forePoints]);

  const stepX = totalPointsCount > 1 ? plotWidth / (totalPointsCount - 1) : plotWidth;

  // Coordinate arrays
  const histCoordinates = useMemo(() => {
    return histPoints.map((pt, idx) => {
      const x = padLeft + idx * stepX;
      const y = padTop + plotHeight - (pt.actual_sales / (maxVal || 1)) * plotHeight;
      return { x, y, pt, idx, isForecast: false };
    });
  }, [histPoints, stepX, maxVal, plotHeight]);

  const foreCoordinates = useMemo(() => {
    const startIndex = histPoints.length;
    return forePoints.map((pt, idx) => {
      const overallIdx = startIndex + idx;
      const x = padLeft + overallIdx * stepX;
      const yPred = padTop + plotHeight - (pt.predicted_sales / (maxVal || 1)) * plotHeight;
      const yUpper = padTop + plotHeight - (pt.upper_bound / (maxVal || 1)) * plotHeight;
      const yLower = padTop + plotHeight - (pt.lower_bound / (maxVal || 1)) * plotHeight;
      return { x, yPred, yUpper, yLower, pt, idx: overallIdx, isForecast: true };
    });
  }, [forePoints, histPoints.length, stepX, maxVal, plotHeight]);

  // SVG paths
  const histPathD = useMemo(() => {
    if (histCoordinates.length === 0) return '';
    return histCoordinates.reduce(
      (acc, c, i) => (i === 0 ? `M ${c.x} ${c.y}` : `${acc} L ${c.x} ${c.y}`),
      ''
    );
  }, [histCoordinates]);

  // Bridge path connecting last actual point to first forecast point
  const bridgeD = useMemo(() => {
    if (histCoordinates.length === 0 || foreCoordinates.length === 0) return '';
    const lastHist = histCoordinates[histCoordinates.length - 1];
    const firstFore = foreCoordinates[0];
    return `M ${lastHist.x} ${lastHist.y} L ${firstFore.x} ${firstFore.yPred}`;
  }, [histCoordinates, foreCoordinates]);

  const forePathD = useMemo(() => {
    if (foreCoordinates.length === 0) return '';
    return foreCoordinates.reduce(
      (acc, c, i) => (i === 0 ? `M ${c.x} ${c.yPred}` : `${acc} L ${c.x} ${c.yPred}`),
      ''
    );
  }, [foreCoordinates]);

  // Confidence band (Flat tint, strictly NO gradient per requirement)
  const confidenceBandD = useMemo(() => {
    if (foreCoordinates.length === 0 || histCoordinates.length === 0) return '';
    const lastHist = histCoordinates[histCoordinates.length - 1];

    // Upper line from anchor to end of forecast
    let path = `M ${lastHist.x} ${lastHist.y}`;
    foreCoordinates.forEach((c) => {
      path += ` L ${c.x} ${c.yUpper}`;
    });

    // Lower line backwards to anchor
    for (let i = foreCoordinates.length - 1; i >= 0; i--) {
      path += ` L ${foreCoordinates[i].x} ${foreCoordinates[i].yLower}`;
    }
    path += ` Z`;
    return path;
  }, [foreCoordinates, histCoordinates]);

  // Boundary separator line X
  const separatorX = useMemo(() => {
    if (histCoordinates.length === 0 || foreCoordinates.length === 0) return null;
    const lastHist = histCoordinates[histCoordinates.length - 1];
    const firstFore = foreCoordinates[0];
    return (lastHist.x + firstFore.x) / 2;
  }, [histCoordinates, foreCoordinates]);

  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((pct) => ({
    val: maxVal * pct,
    y: padTop + plotHeight - pct * plotHeight,
  }));

  // X-axis label sampling
  const allPoints = useMemo(() => {
    const list: Array<{
      x: number;
      date: string;
      dayName: string;
      isForecast: boolean;
      val: number;
      lower?: number;
      upper?: number;
    }> = [];
    histCoordinates.forEach((h) => {
      list.push({
        x: h.x,
        date: h.pt.date,
        dayName: h.pt.day_name,
        isForecast: false,
        val: h.pt.actual_sales,
      });
    });
    foreCoordinates.forEach((f) => {
      list.push({
        x: f.x,
        date: f.pt.date,
        dayName: f.pt.day_name,
        isForecast: true,
        val: f.pt.predicted_sales,
        lower: f.pt.lower_bound,
        upper: f.pt.upper_bound,
      });
    });
    return list;
  }, [histCoordinates, foreCoordinates]);

  // Peak projected day
  const peakForecastDay = useMemo(() => {
    if (!forePoints || forePoints.length === 0) return null;
    let peak = forePoints[0];
    forePoints.forEach((p) => {
      if (p.predicted_sales > peak.predicted_sales) peak = p;
    });
    return peak;
  }, [forePoints]);

  return (
    <div className="flex flex-col gap-6">
      {/* Loading State */}
      {loading && !data && (
        <Card className="p-8 flex flex-col items-center justify-center min-h-[360px] gap-3">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm font-medium text-text-medium">
            Running Holt-Winters time-series forecast...
          </p>
        </Card>
      )}

      {/* Error State */}
      {error && !loading && (
        <Card className="p-6 border-destructive-border bg-destructive-bg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-destructive">Forecast calculation error</h4>
            <p className="text-xs text-text-medium mt-1">{error}</p>
            <Button
              variant="secondary"
              className="mt-3 text-xs h-8 px-3"
              onClick={() => fetchForecast(horizonDays)}
            >
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* ZERO / LOW DATA GATE */}
      {data && !data.has_enough_data && (
        <div className="flex flex-col gap-6">
          <Card className="p-6 sm:p-8 border border-border bg-surface">
            <div className="max-w-xl mx-auto flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
                <Sparkles className="w-7 h-7" />
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-text-high">
                Forecasts unlock after 14 days of sales
              </h2>
              <p className="text-sm text-text-medium mt-2">
                You have{' '}
                <span className="font-semibold text-text-high">
                  {data.days_of_history} of {data.required_days} days
                </span>{' '}
                of sales history recorded.
              </p>

              {/* Progress Card & Bar */}
              <div className="w-full bg-canvas border border-border rounded-lg p-5 mt-6 text-left">
                <div className="flex items-center justify-between text-xs font-semibold text-text-high mb-2">
                  <span>Model training progress</span>
                  <span className="tabular-nums">
                    {Math.min(100, Math.round((data.days_of_history / data.required_days) * 100))}%
                  </span>
                </div>

                <div className="w-full bg-border rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${Math.min(100, Math.max(7, Math.round((data.days_of_history / data.required_days) * 100)))}%`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-text-low mt-2">
                  <span>Day 1</span>
                  <span>7 days (1 week)</span>
                  <span>14 days (Unlocked)</span>
                </div>

                <div className="mt-4 pt-4 border-t border-border flex items-start gap-2.5 text-xs text-text-medium">
                  <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p>
                    Store BI uses the <strong>Holt-Winters additive time-series algorithm</strong>{' '}
                    with weekly seasonality to capture day-of-week surges (like weekend spikes). It
                    requires at least two full 7-day cycles (14 days) to generate mathematically
                    sound projections without guesswork.
                  </p>
                </div>
              </div>

              {/* Call to Actions */}
              <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                <Button
                  variant="primary"
                  onClick={() => navigate('/upload')}
                  className="min-h-[48px] px-4 text-xs gap-1.5"
                >
                  <span>Upload sales records</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => navigate('/sales')}
                  className="min-h-[48px] px-4 text-xs"
                >
                  View sales
                </Button>
              </div>
            </div>
          </Card>

          {/* Fallback preview of what's been logged so far */}
          {data.historical_points && data.historical_points.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-text-high">
                    Available sales timeline ({data.historical_points.length} days recorded)
                  </h3>
                  <p className="text-xs text-text-medium">
                    Actual revenue recorded so far before reaching model unlock threshold.
                  </p>
                </div>
                <Badge variant="neutral">Collecting data</Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {data.historical_points.map((pt) => (
                  <div
                    key={pt.date}
                    className="p-2.5 rounded-md border border-border bg-canvas flex flex-col"
                  >
                    <span className="text-[11px] font-medium text-text-low">
                      {pt.day_name}, {pt.date.slice(5)}
                    </span>
                    <span className="text-sm font-bold text-text-high mt-1 tabular-nums">
                      {formatINR(pt.actual_sales)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* UNLOCKED FORECAST VIEW */}
      {data && data.has_enough_data && (
        <div className="flex flex-col gap-6">
          {/* Top Control Bar & Horizon Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-text-high">Daily sales prediction</h2>
                <Badge variant="success" dot>
                  Model ready
                </Badge>
              </div>
              <p className="text-xs text-text-medium mt-0.5">
                Additive Holt-Winters time-series forecast with weekly seasonal smoothing.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-border bg-canvas p-0.5">
                {([7, 14, 30] as const).map((days) => (
                  <button
                    key={days}
                    onClick={() => setHorizonDays(days)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      horizonDays === days
                        ? 'bg-surface text-primary border border-border'
                        : 'text-text-medium hover:text-text-high'
                    }`}
                  >
                    {days} days
                  </button>
                ))}
              </div>

              <Button
                variant="secondary"
                onClick={() => fetchForecast(horizonDays)}
                disabled={loading}
                className="h-8 px-2.5 text-xs gap-1.5"
                title="Retrain model with latest sales"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>

          {/* Headline Card */}
          <Card className="p-5 sm:p-6 bg-surface border border-border">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-primary">
                  Projected revenue
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-text-high mt-1 tabular-nums">
                  {data.headline || `Expected sales next ${data.forecast_days} days: ${formatINR(data.expected_sales_total)}`}
                </h1>
                <p className="text-xs text-text-medium mt-1.5 flex items-center gap-1.5">
                  <span>Confidence interval:</span>
                  <span className="font-semibold text-text-high tabular-nums">
                    {formatINR(data.expected_lower_total)} – {formatINR(data.expected_upper_total)}
                  </span>
                  <span className="text-text-low">•</span>
                  <span>Daily run rate:</span>
                  <span className="font-semibold text-text-high tabular-nums">
                    {formatINR(Math.round(data.expected_sales_total / data.forecast_days))} / day
                  </span>
                </p>
              </div>

              {/* Model Accuracy Badge & Meta */}
              <div className="flex flex-col md:items-end gap-1.5 shrink-0 bg-surface/80 backdrop-blur-xs p-3 rounded-lg border border-blue-100">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-text-high">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>{data.model_name}</span>
                </div>
                {data.model_accuracy_note && (
                  <p className="text-[11px] text-text-medium">
                    {data.model_accuracy_note}
                  </p>
                )}
                <span className="text-[10px] text-text-low">
                  Trained on {data.days_of_history} days of transactions
                </span>
              </div>
            </div>
          </Card>

          {/* Interactive Forecast Chart */}
          <Card className="p-5 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
              <div>
                <h3 className="text-sm font-semibold text-text-high">
                  Sales trajectory: last 30 days actuals + next {data.forecast_days} days forecast
                </h3>
                <p className="text-xs text-text-medium">
                  Solid line denotes recorded receipts; dashed line is the seasonal expectation with shaded confidence band.
                </p>
              </div>

              {/* Chart Legend */}
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-0.5 bg-primary rounded-full inline-block" />
                  <span className="text-text-medium">Actuals</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-0.5 border-t-2 border-dashed border-primary inline-block" />
                  <span className="text-text-medium">Forecast</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {/* Flat tint legend marker per DESIGN requirements */}
                  <span className="w-3.5 h-2.5 bg-[#93C5FD]/40 border border-[#93C5FD] rounded-xs inline-block" />
                  <span className="text-text-medium">Confidence band</span>
                </div>
              </div>
            </div>

            {/* SVG Chart */}
            <div className="relative mt-4 w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-auto min-w-[700px] select-none"
                style={{ overflow: 'visible' }}
                onMouseLeave={() => setHoverIndex(null)}
              >
                {/* Horizontal Grid lines and Y-axis labels */}
                {yTicks.map((tick, i) => (
                  <g key={i}>
                    <line
                      x1={padLeft}
                      y1={tick.y}
                      x2={svgWidth - padRight}
                      y2={tick.y}
                      stroke="#E5E7EB"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={padLeft - 10}
                      y={tick.y + 4}
                      textAnchor="end"
                      fontSize="10"
                      fill="#6B7280"
                      className="tabular-nums"
                    >
                      {formatINR(tick.val)}
                    </text>
                  </g>
                ))}

                {/* Shaded Band for Forecast Confidence Interval (Flat tint, strictly NO gradient) */}
                {confidenceBandD && (
                  <path
                    d={confidenceBandD}
                    fill="#93C5FD"
                    fillOpacity="0.30"
                    stroke="none"
                  />
                )}

                {/* Vertical Separator Line between Actuals and Forecast */}
                {separatorX !== null && (
                  <g>
                    <line
                      x1={separatorX}
                      y1={padTop - 5}
                      x2={separatorX}
                      y2={padTop + plotHeight}
                      stroke="#9CA3AF"
                      strokeDasharray="4 4"
                      strokeWidth="1.5"
                    />
                    <text
                      x={separatorX - 6}
                      y={padTop + 12}
                      textAnchor="end"
                      fontSize="10"
                      fontWeight="600"
                      fill="#4B5563"
                    >
                      Actuals
                    </text>
                    <text
                      x={separatorX + 6}
                      y={padTop + 12}
                      textAnchor="start"
                      fontSize="10"
                      fontWeight="600"
                      fill="#2563EB"
                    >
                      AI Forecast →
                    </text>
                  </g>
                )}

                {/* Actual Sales Path (Solid line) */}
                {histPathD && (
                  <path
                    d={histPathD}
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Bridge line connecting actuals to forecast */}
                {bridgeD && (
                  <path
                    d={bridgeD}
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="2"
                    strokeDasharray="3 3"
                  />
                )}

                {/* Forecast Sales Path (Dashed line) */}
                {forePathD && (
                  <path
                    d={forePathD}
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="2.5"
                    strokeDasharray="5 4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Points & Hover Target Areas */}
                {allPoints.map((pt, idx) => {
                  const isHovered = hoverIndex === idx;
                  const ptY =
                    pt.isForecast && pt.val !== undefined
                      ? padTop + plotHeight - (pt.val / (maxVal || 1)) * plotHeight
                      : histCoordinates.find((h) => h.idx === idx)?.y ?? padTop + plotHeight;

                  return (
                    <g key={idx} onMouseEnter={() => setHoverIndex(idx)}>
                      {/* Invisible wider hover hit target */}
                      <rect
                        x={pt.x - stepX / 2}
                        y={padTop}
                        width={stepX}
                        height={plotHeight + 30}
                        fill="transparent"
                        className="cursor-pointer"
                      />

                      {/* Hover cursor vertical guideline */}
                      {isHovered && (
                        <line
                          x1={pt.x}
                          y1={padTop}
                          x2={pt.x}
                          y2={padTop + plotHeight}
                          stroke="#2563EB"
                          strokeWidth="1.5"
                          strokeDasharray="2 2"
                        />
                      )}

                      {/* Small point dots */}
                      <circle
                        cx={pt.x}
                        cy={ptY}
                        r={isHovered ? 5.5 : pt.isForecast ? 3.5 : 2.5}
                        fill={pt.isForecast ? '#FFFFFF' : '#2563EB'}
                        stroke="#2563EB"
                        strokeWidth={pt.isForecast ? 2 : 1}
                      />
                    </g>
                  );
                })}

                {/* X-axis date labels */}
                {allPoints.map((pt, idx) => {
                  // Show sampled labels to avoid crowding
                  const total = allPoints.length;
                  const stepModulo = total > 28 ? 4 : total > 14 ? 2 : 1;
                  const isLast = idx === total - 1;
                  const isFirst = idx === 0;
                  const isBoundary =
                    separatorX !== null &&
                    Math.abs(pt.x - separatorX) < stepX * 0.6;

                  if (idx % stepModulo !== 0 && !isLast && !isFirst && !isBoundary) {
                    return null;
                  }

                  return (
                    <g key={`lbl-${idx}`}>
                      <text
                        x={pt.x}
                        y={padTop + plotHeight + 18}
                        textAnchor="middle"
                        fontSize="9.5"
                        fill={pt.isForecast ? '#2563EB' : '#4B5563'}
                        fontWeight={pt.isForecast ? '600' : '400'}
                      >
                        {pt.dayName}
                      </text>
                      <text
                        x={pt.x}
                        y={padTop + plotHeight + 30}
                        textAnchor="middle"
                        fontSize="8.5"
                        fill="#9CA3AF"
                      >
                        {pt.date.slice(5)}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Floating Tooltip Card */}
              {hoverIndex !== null && allPoints[hoverIndex] && (
                <div
                  className="absolute pointer-events-none z-20 bg-surface border border-border rounded-[8px] p-2.5 text-xs"
                  style={{
                    left: `${Math.min(
                      Math.max(10, ((allPoints[hoverIndex].x) / svgWidth) * 100),
                      85
                    )}%`,
                    top: '15px',
                    transform: 'translateX(-50%)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-text-high">
                      {allPoints[hoverIndex].dayName}, {allPoints[hoverIndex].date}
                    </span>
                    <Badge
                      variant={allPoints[hoverIndex].isForecast ? 'primary' as any : 'neutral'}
                      className="text-[10px] h-5"
                    >
                      {allPoints[hoverIndex].isForecast ? 'Projected' : 'Actual'}
                    </Badge>
                  </div>

                  <div className="text-sm font-bold text-text-high tabular-nums">
                    {formatINR(allPoints[hoverIndex].val)}
                  </div>

                  {allPoints[hoverIndex].isForecast && (
                    <div className="text-[11px] text-text-medium mt-1 flex flex-col gap-0.5 border-t border-border pt-1">
                      <span>
                        Lower bound:{' '}
                        <strong className="text-text-high">
                          {formatINR(allPoints[hoverIndex].lower ?? 0)}
                        </strong>
                      </span>
                      <span>
                        Upper bound:{' '}
                        <strong className="text-text-high">
                          {formatINR(allPoints[hoverIndex].upper ?? 0)}
                        </strong>
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Model Accuracy Note and Disclaimer */}
            <div className="mt-6 pt-4 border-t border-border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-text-medium">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p>
                  <strong>Disclaimer:</strong> {data.disclaimer}
                </p>
              </div>

              {peakForecastDay && (
                <div className="shrink-0 flex items-center gap-1.5 bg-canvas px-3 py-1.5 rounded-md border border-border">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  <span>
                    Highest expected sales:{' '}
                    <strong>
                      {peakForecastDay.day_name}, {peakForecastDay.date} (
                      {formatINR(peakForecastDay.predicted_sales)})
                    </strong>
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Quick Metrics Breakdown Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 bg-surface">
              <span className="text-xs font-medium text-text-medium">Forecast horizon</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-bold text-text-high">
                  {data.forecast_days} Days
                </span>
                <span className="text-xs text-text-low">
                  through {forePoints[forePoints.length - 1]?.date}
                </span>
              </div>
            </Card>

            <Card className="p-4 bg-surface">
              <span className="text-xs font-medium text-text-medium">Average expected daily run</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-bold text-text-high tabular-nums">
                  {formatINR(Math.round(data.expected_sales_total / data.forecast_days))}
                </span>
                <span className="text-xs text-text-low">/ day</span>
              </div>
            </Card>

            <Card className="p-4 bg-surface">
              <span className="text-xs font-medium text-text-medium">Historical baseline</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-bold text-text-high tabular-nums">
                  {data.days_of_history} Days
                </span>
                <span className="text-xs text-success flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" /> Seasonality calibrated
                </span>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
