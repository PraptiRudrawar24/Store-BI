import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import {
  ArrowUpRight,
  Clock,
  Download,
  Flame,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { useStoreData } from '../../context/StoreDataContext';
import { MetricCard } from '../common/MetricCard';
import { mockHourlyTraffic, mockCategories } from '../../data/mockStoreData';

interface OverviewViewProps {
  onOpenExport: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({ onOpenExport }) => {
  const { kpis, liveTransactions, setActiveTab, searchQuery } = useStoreData();

  const filteredCategories = mockCategories.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">
              Executive Overview
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Live Registers Active
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Real-time supermarket metrics across all grocery & fresh departments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('datascience')}
            className="px-3 py-2 rounded-xl border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Sparkles size={14} />
            <span>AI Predictive Outlook</span>
          </button>
          <button
            onClick={onOpenExport}
            className="px-3.5 py-2 rounded-xl bg-primary text-white hover:bg-primary-hover text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download size={14} />
            <span>Download CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi) => (
          <MetricCard key={kpi.id} kpi={kpi} />
        ))}
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Revenue & Foot Traffic Hourly Flow */}
        <div className="lg:col-span-8 bg-surface-card border border-border-subtle rounded-2xl p-5 shadow-stitch-card glass-panel flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-text-primary">Hourly Revenue & Store Traffic</h3>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-surface-container text-text-muted">
                  8:00 AM – 10:00 PM
                </span>
              </div>
              <p className="text-xs text-text-muted">Correlating shopper volume with register revenue spikes</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-text-muted">Revenue (Rs.)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-text-muted">Shoppers (Pax)</span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockHourlyTraffic} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorPax" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="hour" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} />
                <YAxis yAxisId="left" stroke="var(--color-text-muted)" fontSize={11} tickFormatter={(v) => `$${v / 1000}k`} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface-card)',
                    borderColor: 'var(--color-border-subtle)',
                    borderRadius: '0.75rem',
                    color: 'var(--color-text-primary)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    fontSize: '12px',
                  }}
                  formatter={(value: any, name: any) => [
                    name === 'revenue' ? `$${Number(value).toLocaleString()}` : `${value} shoppers`,
                    name === 'revenue' ? 'Gross Revenue' : 'Foot Traffic',
                  ]}
                />
                <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="var(--color-primary)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
                <Area yAxisId="right" type="monotone" dataKey="visitors" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorPax)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 pt-3 border-t border-border-subtle/60 flex items-center justify-between text-xs text-text-muted">
            <span>Peak Hour Identified: <strong className="text-text-primary font-mono">18:00 – 19:00 (Rs.168.5k)</strong></span>
            <button
              onClick={() => setActiveTab('sales')}
              className="text-primary hover:underline font-semibold flex items-center gap-1"
            >
              Analyze Hourly Sales <ArrowUpRight size={14} />
            </button>
          </div>
        </div>

        {/* Category Contribution Donut */}
        <div className="lg:col-span-4 bg-surface-card border border-border-subtle rounded-2xl p-5 shadow-stitch-card glass-panel flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-base text-text-primary">Department Share</h3>
              <span className="text-xs text-emerald-600 font-semibold">+14.5% Produce</span>
            </div>
            <p className="text-xs text-text-muted mb-4">Revenue breakdown by fresh & packaged groceries</p>

            <div className="h-44 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mockCategories}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={76}
                    paddingAngle={3}
                    dataKey="revenue"
                  >
                    {mockCategories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-surface-card)',
                      borderColor: 'var(--color-border-subtle)',
                      borderRadius: '0.75rem',
                      color: 'var(--color-text-primary)',
                      fontSize: '12px',
                    }}
                    formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Revenue']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Top List */}
          <div className="space-y-2 mt-2">
            {filteredCategories.slice(0, 4).map((cat) => (
              <div key={cat.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="font-medium text-text-primary">{cat.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-text-muted">Rs.{(cat.revenue / 1000).toFixed(0)}k</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">+{cat.growth}%</span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-border-subtle/60 mt-3 text-right">
            <button
              onClick={() => setActiveTab('products')}
              className="text-xs text-primary hover:underline font-semibold inline-flex items-center gap-1"
            >
              Explore All Categories <ArrowUpRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Lower Row: Live Register Stream & Fast Moving Items */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Live Stream of Transactions */}
        <div className="lg:col-span-6 bg-surface-card border border-border-subtle rounded-2xl p-5 shadow-stitch-card glass-panel">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="font-bold text-base text-text-primary">Live Register Checkout Ticker</h3>
            </div>
            <span className="text-[11px] text-text-muted font-mono">Stream: Active</span>
          </div>

          <div className="space-y-2.5">
            {liveTransactions.map((tx) => (
              <div
                key={tx.id}
                className="p-3 rounded-xl border border-border-subtle/70 bg-surface-container/50 hover:bg-surface-container transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <ShoppingBag size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-text-primary">{tx.items}</div>
                    <div className="text-[11px] text-text-muted flex items-center gap-2">
                      <span>{tx.branch}</span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5">
                        <Clock size={11} /> {tx.time}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-sm text-text-primary font-mono">
                    ${tx.amount.toFixed(2)}
                  </div>
                  <span className="text-[10px] text-emerald-600 font-semibold">Processed</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Operations & Fast Actions */}
        <div className="lg:col-span-6 bg-surface-card border border-border-subtle rounded-2xl p-5 shadow-stitch-card glass-panel flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-base text-text-primary">Operational Readiness</h3>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                99.4% Store Score
              </span>
            </div>
            <p className="text-xs text-text-muted mb-4">
              Real-time monitoring of checkout lines, inventory reorder triggers, and cold storage units.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => setActiveTab('inventory')}
                className="p-3.5 rounded-xl border border-border-subtle bg-surface-container/60 hover:border-primary/50 cursor-pointer transition-all"
              >
                <div className="text-xs text-text-muted mb-1 flex items-center justify-between">
                  <span>Critical Reorders</span>
                  <AlertCircle size={14} className="text-rose-500" />
                </div>
                <div className="text-xl font-bold font-mono text-text-primary">2 SKUs</div>
                <div className="text-[11px] text-rose-600 font-semibold mt-1">Avocados, Sourdough</div>
              </div>

              <div
                onClick={() => setActiveTab('operations')}
                className="p-3.5 rounded-xl border border-border-subtle bg-surface-container/60 hover:border-primary/50 cursor-pointer transition-all"
              >
                <div className="text-xs text-text-muted mb-1 flex items-center justify-between">
                  <span>Lane Wait Time</span>
                  <Clock size={14} className="text-emerald-500" />
                </div>
                <div className="text-xl font-bold font-mono text-text-primary">48 sec</div>
                <div className="text-[11px] text-emerald-600 font-semibold mt-1">Within target (&lt;90s)</div>
              </div>

              <div
                onClick={() => setActiveTab('operations')}
                className="p-3.5 rounded-xl border border-border-subtle bg-surface-container/60 hover:border-primary/50 cursor-pointer transition-all"
              >
                <div className="text-xs text-text-muted mb-1 flex items-center justify-between">
                  <span>Cold Chain Units</span>
                  <Flame size={14} className="text-amber-500" />
                </div>
                <div className="text-xl font-bold font-mono text-text-primary">4 / 4 Online</div>
                <div className="text-[11px] text-amber-600 font-semibold mt-1">1 sensor warning</div>
              </div>

              <div
                onClick={() => setActiveTab('customers')}
                className="p-3.5 rounded-xl border border-border-subtle bg-surface-container/60 hover:border-primary/50 cursor-pointer transition-all"
              >
                <div className="text-xs text-text-muted mb-1 flex items-center justify-between">
                  <span>Loyalty Swipes</span>
                  <TrendingUp size={14} className="text-primary" />
                </div>
                <div className="text-xl font-bold font-mono text-text-primary">74.2%</div>
                <div className="text-[11px] text-primary font-semibold mt-1">48,920 members</div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border-subtle/60 flex items-center justify-between">
            <span className="text-xs text-text-muted">Supermarket Branch: All locations unified</span>
            <button
              onClick={() => setActiveTab('stitch-studio')}
              className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
            >
              Stitch Design Studio <ArrowUpRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
