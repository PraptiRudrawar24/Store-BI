import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus,
  Clock,
  ShieldCheck,
  TrendingUp,
  RotateCw,
  Calendar,
  Layers,
  ArrowRight,
  Lightbulb,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { api } from '../../api/client';
import type { AdminOverviewResponse } from '../../api/client';
import { formatINR } from '../../utils';

export function AdminOverviewPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<AdminOverviewResponse | null>(null);
  const [period, setPeriod] = React.useState<'monthly' | 'weekly' | 'daily'>('monthly');

  const fetchOverview = React.useCallback(async (selectedPeriod: 'monthly' | 'weekly' | 'daily') => {
    setLoading(true);
    try {
      const res = await api.getAdminOverview(selectedPeriod);
      setData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch admin overview';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchOverview(period);
  }, [fetchOverview, period]);

  const stats = data?.stats;
  const funnel = data?.funnel || [];
  const trendPoints = data?.trend_points || [];
  const recentConversions = data?.recent_conversions || [];

  return (
    <div className="flex flex-col gap-6">
      {/* Sub-header & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-text-high">Overview</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5 animate-pulse" />
              Live sync
            </span>
          </div>
          <p className="text-xs text-text-medium">
            Live product metrics, merchant growth, and conversion funnel across India
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="h-10 px-3.5 bg-surface text-text-high border border-border rounded-[8px] hover:bg-canvas transition-colors flex items-center gap-2 text-xs font-medium"
          >
            <Calendar className="w-3.5 h-3.5 text-text-medium" />
            <span>Last 30 days</span>
          </button>

          <Button
            variant="primary"
            onClick={() => fetchOverview(period)}
            className="h-10 text-xs px-4 gap-2"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh live data</span>
          </Button>
        </div>
      </div>

      {/* Top KPI Stat Cards (5 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: New registrations */}
        <Card className="p-4 border border-border bg-surface flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-text-medium">New registrations</span>
            <div className="w-8 h-8 rounded-[8px] bg-canvas border border-border flex items-center justify-center text-primary">
              <UserPlus className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-text-high tracking-tight mb-1 tabular-nums">
              {stats ? stats.new_registrations.toLocaleString('en-IN') : '0'}
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              {stats && stats.registrations_change_pct !== null ? (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[11px]">
                  +{stats.registrations_change_pct}%
                </span>
              ) : (
                <span className="text-text-low text-[11px]">–</span>
              )}
              <span className="text-text-medium text-[11px]">registered stores</span>
            </div>
          </div>
        </Card>

        {/* Card 2: Active trials */}
        <Card className="p-4 border border-border bg-surface flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-text-medium">Active trials</span>
            <div className="w-8 h-8 rounded-[8px] bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-text-high tracking-tight mb-1 tabular-nums">
              {stats ? stats.active_trials.toLocaleString('en-IN') : '0'}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-amber-700 font-medium">
              <span className="text-[11px]">
                {stats ? stats.trials_ending_soon : 0} ending in next 48h
              </span>
            </div>
          </div>
        </Card>

        {/* Card 3: Paid businesses */}
        <Card className="p-4 border border-border bg-surface flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-text-medium">Paid businesses</span>
            <div className="w-8 h-8 rounded-[8px] bg-canvas border border-border flex items-center justify-center text-primary">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-text-high tracking-tight mb-1 tabular-nums">
              {stats ? stats.paid_businesses.toLocaleString('en-IN') : '0'}
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-emerald-700 font-bold text-[11px]">
                +{stats ? stats.paid_change_count : 0} this mo
              </span>
              <span className="text-text-low">•</span>
              <span className="text-text-medium text-[11px]">Annual/Pro</span>
            </div>
          </div>
        </Card>

        {/* Card 4: Conversion rate */}
        <Card className="p-4 border border-border bg-surface flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-text-medium">Conversion rate</span>
            <div className="w-8 h-8 rounded-[8px] bg-canvas border border-border flex items-center justify-center text-primary">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-text-high tracking-tight mb-1 tabular-nums">
              {stats ? stats.conversion_rate.toFixed(1) : '0.0'}%
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              {stats && stats.conversion_rate_change_pct !== null ? (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[11px]">
                  +{stats.conversion_rate_change_pct}%
                </span>
              ) : (
                <span className="text-text-low text-[11px]">–</span>
              )}
              <span className="text-text-medium text-[11px]">trial to paid</span>
            </div>
          </div>
        </Card>

        {/* Card 5: Monthly revenue (MRR) */}
        <Card className="p-4 border border-border bg-surface flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-text-medium">Monthly revenue</span>
            <div className="w-8 h-8 rounded-[8px] bg-canvas border border-border flex items-center justify-center text-primary font-bold text-sm">
              ₹
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-text-high tracking-tight mb-1 tabular-nums">
              {stats ? formatINR(stats.monthly_revenue) : '₹0'}
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              {stats && stats.revenue_change_pct !== null ? (
                <span className="text-emerald-700 font-bold text-[11px]">
                  +{stats.revenue_change_pct}% MoM
                </span>
              ) : (
                <span className="text-text-low text-[11px]">–</span>
              )}
              <span className="text-text-low">•</span>
              <span className="text-text-medium text-[11px]">recurring</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Registrations vs Paid Conversion Trend Chart */}
      <Card className="border border-border bg-surface p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-border">
          <div>
            <h2 className="text-sm font-bold text-text-high">
              Registrations vs Paid conversion trend ({period.charAt(0).toUpperCase() + period.slice(1)})
            </h2>
            <p className="text-xs text-text-medium mt-0.5">
              Signup velocity vs actual paid tier conversion computed from store registrations
            </p>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {/* Legend */}
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-[3px] bg-primary/30 border border-primary/50" />
                <span className="text-text-medium">New registrations</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-2 rounded-full bg-primary" />
                <span className="text-text-medium">Paid converted</span>
              </div>
            </div>

            {/* Period Toggle */}
            <div className="flex bg-canvas p-0.5 rounded-[8px] border border-border text-xs">
              {(['monthly', 'weekly', 'daily'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 rounded-[6px] font-semibold transition-colors ${
                    period === p
                      ? 'bg-surface text-primary border border-border'
                      : 'text-text-medium hover:text-text-high'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chart Area */}
        <div className="relative w-full overflow-x-auto">
          {/* ZERO-START RULE: Empty frame when no data or 0 registrations */}
          {!data?.has_data || trendPoints.every((pt) => pt.registrations === 0 && pt.paid_converted === 0) ? (
            <div className="min-w-[700px] h-[260px] flex flex-col items-center justify-center border border-dashed border-border rounded-[8px] bg-canvas/60 text-center p-6">
              <Layers className="w-8 h-8 text-text-low mb-2" />
              <span className="text-xs font-bold text-text-high">
                No registration or conversion data recorded yet
              </span>
              <p className="text-[11px] text-text-medium max-w-sm mt-1">
                Chart frame is active. As kirana and retail stores register and activate subscriptions, monthly trend curves will be plotted automatically.
              </p>
            </div>
          ) : (
            <div className="min-w-[720px] h-[260px] relative">
              <svg className="w-full h-full" viewBox="0 0 800 240" preserveAspectRatio="none">
                {/* Horizontal Grid lines */}
                <line x1="40" y1="30" x2="780" y2="30" stroke="#E5E7EB" strokeDasharray="3 3" />
                <line x1="40" y1="90" x2="780" y2="90" stroke="#E5E7EB" strokeDasharray="3 3" />
                <line x1="40" y1="150" x2="780" y2="150" stroke="#E5E7EB" strokeDasharray="3 3" />
                <line x1="40" y1="210" x2="780" y2="210" stroke="#E5E7EB" />

                {/* Bars & Points */}
                {(() => {
                  const maxVal = Math.max(
                    1,
                    ...trendPoints.map((pt) => Math.max(pt.registrations, pt.paid_converted))
                  );
                  const stepX = 720 / Math.max(1, trendPoints.length);

                  // Compute line points for paid conversions
                  const linePts = trendPoints.map((pt, i) => {
                    const x = 50 + i * stepX + stepX / 2;
                    const y = 210 - (pt.paid_converted / maxVal) * 160;
                    return `${x},${y}`;
                  }).join(' ');

                  return (
                    <>
                      {/* Bars for registrations */}
                      {trendPoints.map((pt, i) => {
                        const barWidth = Math.min(28, stepX * 0.5);
                        const x = 50 + i * stepX + (stepX - barWidth) / 2;
                        const barHeight = Math.max(2, (pt.registrations / maxVal) * 160);
                        const y = 210 - barHeight;

                        return (
                          <g key={i}>
                            <rect
                              x={x}
                              y={y}
                              width={barWidth}
                              height={barHeight}
                              rx="3"
                              fill="#DBE1FF"
                              stroke="#2563EB"
                              strokeWidth="1"
                            />
                            <text
                              x={x + barWidth / 2}
                              y="228"
                              fontSize="10"
                              textAnchor="middle"
                              fill="#4B5563"
                              fontFamily="Inter"
                            >
                              {pt.period}
                            </text>
                            {pt.registrations > 0 && (
                              <text
                                x={x + barWidth / 2}
                                y={y - 4}
                                fontSize="9"
                                textAnchor="middle"
                                fill="#2563EB"
                                fontWeight="bold"
                                fontFamily="Inter"
                              >
                                {pt.registrations}
                              </text>
                            )}
                          </g>
                        );
                      })}

                      {/* Line for conversions */}
                      {trendPoints.length > 1 && (
                        <polyline
                          fill="none"
                          stroke="#16A34A"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={linePts}
                        />
                      )}

                      {/* Conversion Dots */}
                      {trendPoints.map((pt, i) => {
                        const x = 50 + i * stepX + stepX / 2;
                        const y = 210 - (pt.paid_converted / maxVal) * 160;
                        return (
                          <circle
                            key={i}
                            cx={x}
                            cy={y}
                            r="3.5"
                            fill="#16A34A"
                            stroke="#FFFFFF"
                            strokeWidth="1.5"
                          />
                        );
                      })}
                    </>
                  );
                })()}
              </svg>
            </div>
          )}
        </div>
      </Card>

      {/* 2-Column Section: Funnel & Recent Conversions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Col 1: Top Drop-Off Funnel */}
        <Card className="p-5 border border-border bg-surface flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-bold text-text-high">
                  Top drop-off points in 5-day trial
                </h3>
                <p className="text-xs text-text-medium mt-0.5">
                  Merchant progression from initial registration to paid unlock
                </p>
              </div>
            </div>

            {/* Funnel Stages Bars */}
            <div className="flex flex-col gap-4 mt-5">
              {funnel.map((step) => {
                const isPaidStep = step.step_number === 5;
                const barColor = isPaidStep ? 'bg-emerald-600' : 'bg-primary';

                return (
                  <div key={step.step_number} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${isPaidStep ? 'text-primary font-bold' : 'text-text-high'}`}>
                          {step.title}
                        </span>
                        {step.drop_pct !== null && step.drop_pct !== undefined && step.drop_pct > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-bold">
                            -{step.drop_pct}% drop
                          </span>
                        )}
                      </div>
                      <span className="font-bold tabular-nums text-text-high">
                        {step.pct.toFixed(1)}% ({step.count})
                      </span>
                    </div>

                    <div className="w-full h-2.5 bg-canvas border border-border/80 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${barColor} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.min(100, Math.max(0, step.pct))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 mt-6 border-t border-border flex items-center justify-between text-xs text-text-medium">
            <div className="flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Conversion calculated live from store registrations</span>
            </div>
            <button
              onClick={() => navigate('/admin/businesses')}
              className="text-primary font-semibold hover:underline flex items-center gap-1"
            >
              <span>View businesses</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </Card>

        {/* Col 2: Recent High-Value Conversions */}
        <Card className="p-5 border border-border bg-surface flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-bold text-text-high">
                  Recent conversions
                </h3>
                <p className="text-xs text-text-medium mt-0.5">
                  Live feed of verified store merchants upgraded to paid plans
                </p>
              </div>
              <button
                onClick={() => navigate('/admin/businesses?status=active')}
                className="text-xs text-primary font-semibold hover:underline"
              >
                View all
              </button>
            </div>

            {/* Conversions Table */}
            <div className="overflow-x-auto mt-3">
              {recentConversions.length === 0 ? (
                <div className="p-8 text-center bg-canvas rounded-[8px] border border-border my-2">
                  <span className="text-xs text-text-medium">
                    No converted businesses yet
                  </span>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-text-medium">
                      <th className="py-2.5 font-semibold">Merchant & city</th>
                      <th className="py-2.5 font-semibold">Plan</th>
                      <th className="py-2.5 font-semibold text-right">Payment</th>
                      <th className="py-2.5 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {recentConversions.map((conv) => (
                      <tr key={conv.id} className="hover:bg-canvas/60 transition-colors">
                        <td className="py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-[11px]">
                              {conv.business_name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-text-high">{conv.business_name}</div>
                              <div className="text-[11px] text-text-medium">{conv.city}, {conv.state}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5">
                          <span className="px-2 py-0.5 rounded bg-canvas border border-border font-medium text-text-high">
                            {conv.plan}
                          </span>
                        </td>
                        <td className="py-2.5 text-right tabular-nums">
                          <div className="font-semibold text-text-high">{formatINR(conv.amount, true)}</div>
                          <div className="text-[10px] text-text-medium">{conv.payment_method}</div>
                        </td>
                        <td className="py-2.5 text-right">
                          <span className="inline-flex px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                            Paid
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="pt-3 mt-4 border-t border-border flex items-center justify-between text-xs text-text-medium">
            <span>Verified GST & retail subscriptions</span>
            <span className="tabular-nums font-semibold text-text-high">
              {recentConversions.length} recorded
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}
