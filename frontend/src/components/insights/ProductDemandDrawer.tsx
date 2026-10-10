import { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  AlertTriangle,
  Calendar,
  Layers,
  TrendingUp,
  Share2,
  Check,
} from 'lucide-react';
import { api, type ProductDemandDetailResponse } from '../../api/client';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';

interface ProductDemandDrawerProps {
  productId: number | null;
  leadTimeDays: number;
  isOpen: boolean;
  onClose: () => void;
}

export function ProductDemandDrawer({
  productId,
  leadTimeDays,
  isOpen,
  onClose,
}: ProductDemandDrawerProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProductDemandDetailResponse | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !productId) {
      setDetail(null);
      return;
    }

    const loadDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getAIProductDemandDetail(productId, leadTimeDays);
        setDetail(res);
      } catch (err: any) {
        setError(err?.message || 'Failed to fetch product forecast detail');
      } finally {
        setLoading(false);
      }
    };

    loadDetail();
  }, [isOpen, productId, leadTimeDays]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const product = detail?.product;
  const historyPoints = detail?.history_points || [];
  const forecastPoints = detail?.forecast_points || [];

  const handleCopySingleOrder = () => {
    if (!product) return;
    const text = `*PURCHASE ITEM REQUIREMENT*\nProduct: *${product.name}*\nCurrent Stock: ${product.stock_qty} units\nSuggested Order: *${product.suggested_reorder_qty} units*\nReorder By: ${product.reorder_by_date || 'Immediate'}\nLead Time: ${leadTimeDays} days`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Product order details copied for WhatsApp!');
    setTimeout(() => setCopied(false), 2500);
  };

  // SVG chart dimensions for drawer
  const svgWidth = 560;
  const svgHeight = 180;
  const padLeft = 40;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 35;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  const maxVal = Math.max(
    5,
    ...historyPoints.map((p) => p.actual || 0),
    ...forecastPoints.map((p) => p.forecast || 0)
  ) * 1.2;

  const totalPoints = historyPoints.length + forecastPoints.length;
  const stepX = totalPoints > 1 ? plotWidth / (totalPoints - 1) : plotWidth;

  const histCoords = historyPoints.map((p, i) => ({
    x: padLeft + i * stepX,
    y: padTop + plotHeight - ((p.actual || 0) / maxVal) * plotHeight,
    val: p.actual || 0,
    date: p.date,
    day: p.day_name,
  }));

  const foreCoords = forecastPoints.map((p, i) => ({
    x: padLeft + (historyPoints.length + i) * stepX,
    y: padTop + plotHeight - ((p.forecast || 0) / maxVal) * plotHeight,
    val: p.forecast || 0,
    date: p.date,
    day: p.day_name,
  }));

  const histLineD = histCoords.reduce(
    (acc, c, i) => (i === 0 ? `M ${c.x} ${c.y}` : `${acc} L ${c.x} ${c.y}`),
    ''
  );

  const bridgeD =
    histCoords.length > 0 && foreCoords.length > 0
      ? `M ${histCoords[histCoords.length - 1].x} ${histCoords[histCoords.length - 1].y} L ${foreCoords[0].x} ${foreCoords[0].y}`
      : '';

  const foreLineD = foreCoords.reduce(
    (acc, c, i) => (i === 0 ? `M ${c.x} ${c.y}` : `${acc} L ${c.x} ${c.y}`),
    ''
  );

  const dividerX =
    histCoords.length > 0 && foreCoords.length > 0
      ? (histCoords[histCoords.length - 1].x + foreCoords[0].x) / 2
      : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#111827]/40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div className="relative w-full max-w-xl bg-surface border-l border-border h-full flex flex-col z-10 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0 bg-canvas/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-high">
                {product ? product.name : 'Demand forecast details'}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-text-medium">
                  {product?.category || 'General'}
                </span>
                {product && (
                  <Badge
                    variant={
                      product.risk_level === 'critical'
                        ? 'destructive'
                        : product.risk_level === 'warning'
                        ? 'warning'
                        : product.risk_level === 'healthy'
                        ? 'success'
                        : 'neutral'
                    }
                    dot={product.risk_level === 'critical' || product.risk_level === 'warning'}
                  >
                    {product.risk_level === 'critical'
                      ? 'Critical'
                      : product.risk_level === 'warning'
                      ? 'Reorder Soon'
                      : product.risk_level === 'healthy'
                      ? 'Adequate'
                      : 'Low data'}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-md text-text-medium hover:text-text-high hover:bg-canvas transition-colors"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <RefreshCw className="w-7 h-7 text-primary animate-spin" />
              <span className="text-xs text-text-medium">Calculating replenishment velocity...</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-lg bg-destructive-bg border border-destructive-border flex items-start gap-2 text-xs text-destructive">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!loading && product && (
            <>
              {/* Quick Stat Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-lg border border-border bg-canvas">
                  <span className="text-[11px] font-medium text-text-low">Current Stock</span>
                  <div className="text-lg font-bold text-text-high mt-0.5 tabular-nums">
                    {product.stock_qty}
                    <span className="text-xs font-normal text-text-low ml-1">units</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-canvas">
                  <span className="text-[11px] font-medium text-text-low">Daily Sales Velocity</span>
                  <div className="text-lg font-bold text-text-high mt-0.5 tabular-nums">
                    {product.daily_sales_rate}
                    <span className="text-xs font-normal text-text-low ml-1">/ day</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-canvas">
                  <span className="text-[11px] font-medium text-text-low">14d Demand Forecast</span>
                  <div className="text-lg font-bold text-text-high mt-0.5 tabular-nums">
                    {product.has_enough_history && product.forecast_demand_14d !== null
                      ? product.forecast_demand_14d
                      : '–'}
                    {product.has_enough_history && (
                      <span className="text-xs font-normal text-text-low ml-1">units</span>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-canvas">
                  <span className="text-[11px] font-medium text-text-low">Days of Stock Left</span>
                  <div
                    className={`text-lg font-bold mt-0.5 tabular-nums ${
                      typeof product.days_of_stock_left === 'number' && product.days_of_stock_left <= leadTimeDays
                        ? 'text-destructive'
                        : 'text-text-high'
                    }`}
                  >
                    {typeof product.days_of_stock_left === 'number' ? `${product.days_of_stock_left}d` : '–'}
                  </div>
                </div>
              </div>

              {/* Status Note or Data Quality Banner */}
              {product.status_note && (
                <div className="px-3.5 py-2.5 rounded-lg border border-border bg-canvas/60 flex items-center justify-between text-xs">
                  <span className="text-text-medium">Forecast modeling method:</span>
                  <span className="font-semibold text-text-high">{product.status_note}</span>
                </div>
              )}

              {/* Demand Velocity Chart */}
              <div className="border border-border rounded-lg p-4 bg-surface">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-text-medium">
                    Sales velocity & demand projection (units)
                  </h3>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1 text-text-medium">
                      <span className="w-2.5 h-0.5 bg-primary rounded-full inline-block" /> Past 30d
                    </span>
                    <span className="flex items-center gap-1 text-text-medium">
                      <span className="w-2.5 h-0.5 border-t border-dashed border-primary inline-block" /> Next 14d
                    </span>
                  </div>
                </div>

                <div className="w-full overflow-x-auto">
                  <svg
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    className="w-full h-auto min-w-[480px]"
                  >
                    {/* Y-axis guidelines */}
                    {[0, 0.5, 1].map((pct, i) => {
                      const y = padTop + plotHeight - pct * plotHeight;
                      return (
                        <g key={i}>
                          <line
                            x1={padLeft}
                            y1={y}
                            x2={svgWidth - padRight}
                            y2={y}
                            stroke="#E5E7EB"
                            strokeDasharray="2 2"
                          />
                          <text
                            x={padLeft - 6}
                            y={y + 3}
                            textAnchor="end"
                            fontSize="9"
                            fill="#6B7280"
                          >
                            {Math.round(maxVal * pct)}
                          </text>
                        </g>
                      );
                    })}

                    {/* Historical sales curve */}
                    {histLineD && (
                      <path
                        d={histLineD}
                        fill="none"
                        stroke="#2563EB"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    )}

                    {/* Bridge */}
                    {bridgeD && (
                      <path
                        d={bridgeD}
                        fill="none"
                        stroke="#2563EB"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                      />
                    )}

                    {/* Forecast curve */}
                    {foreLineD && (
                      <path
                        d={foreLineD}
                        fill="none"
                        stroke="#2563EB"
                        strokeWidth="2"
                        strokeDasharray="4 3"
                        strokeLinecap="round"
                      />
                    )}

                    {/* Separator */}
                    {dividerX !== null && (
                      <line
                        x1={dividerX}
                        y1={padTop}
                        x2={dividerX}
                        y2={padTop + plotHeight}
                        stroke="#9CA3AF"
                        strokeDasharray="3 3"
                        strokeWidth="1"
                      />
                    )}

                    {/* Dots for forecast points */}
                    {foreCoords.map((c, i) => (
                      <circle
                        key={i}
                        cx={c.x}
                        cy={c.y}
                        r="2.5"
                        fill="#FFFFFF"
                        stroke="#2563EB"
                        strokeWidth="1.5"
                      />
                    ))}

                    {/* X-axis labels */}
                    {histCoords.length > 0 && (
                      <text
                        x={padLeft}
                        y={padTop + plotHeight + 16}
                        fontSize="9"
                        fill="#6B7280"
                      >
                        -30d
                      </text>
                    )}
                    {dividerX !== null && (
                      <text
                        x={dividerX}
                        y={padTop + plotHeight + 16}
                        textAnchor="middle"
                        fontSize="9"
                        fontWeight="600"
                        fill="#111827"
                      >
                        Today
                      </text>
                    )}
                    {foreCoords.length > 0 && (
                      <text
                        x={svgWidth - padRight}
                        y={padTop + plotHeight + 16}
                        textAnchor="end"
                        fontSize="9"
                        fill="#2563EB"
                        fontWeight="600"
                      >
                        +14d
                      </text>
                    )}
                  </svg>
                </div>
              </div>

              {/* Replenishment Math Calculation Card */}
              <div className="border border-border rounded-lg p-4 bg-canvas/40 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-text-high">
                  <Layers className="w-4 h-4 text-primary" />
                  <span>Reorder recommendation math</span>
                </div>

                <div className="flex flex-col gap-2 text-xs text-text-medium">
                  <div className="flex items-center justify-between py-1 border-b border-border">
                    <span>1. Supplier lead time requirement:</span>
                    <span className="font-semibold text-text-high">
                      {leadTimeDays} days (at {product.daily_sales_rate} units/day ={' '}
                      {Math.round(product.daily_sales_rate * leadTimeDays)} units)
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-border">
                    <span>2. 14-day cycle demand target:</span>
                    <span className="font-semibold text-text-high">
                      {product.forecast_demand_14d ?? Math.round(product.daily_sales_rate * 14)} units
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-border">
                    <span>3. Available on-hand stock:</span>
                    <span className="font-semibold text-text-high">
                      {product.stock_qty} units
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 bg-surface p-2.5 rounded-md border border-border">
                    <span className="font-semibold text-text-high">
                      Suggested reorder quantity:
                    </span>
                    <span className="text-base font-bold text-primary tabular-nums">
                      {product.suggested_reorder_qty} units
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <div className="flex items-center gap-1.5 text-text-medium">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>Reorder By Deadline:</span>
                  </div>
                  <span
                    className={`font-bold ${
                      product.risk_level === 'critical' ? 'text-destructive' : 'text-text-high'
                    }`}
                  >
                    {product.reorder_by_date
                      ? `${product.reorder_by_date} (${
                          product.risk_level === 'critical' ? 'Immediate' : 'Before stockout'
                        })`
                      : 'Stock adequate'}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {product && (
          <div className="px-5 py-3.5 border-t border-border bg-canvas/60 flex items-center justify-between gap-3 shrink-0">
            <Button variant="secondary" onClick={onClose} className="h-9 px-4 text-xs">
              Close
            </Button>

            <Button
              variant="primary"
              onClick={handleCopySingleOrder}
              className="h-9 px-4 text-xs gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Share on WhatsApp'}</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
