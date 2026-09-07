import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Smartphone,
  Coins,
  Download,
  Filter,
  ArrowUpRight,
} from 'lucide-react';
import { mockCategories, mockHourlyTraffic, mockPaymentMethods } from '../../data/mockStoreData';
import { useStoreData } from '../../context/StoreDataContext';

interface SalesViewProps {
  onOpenExport: () => void;
}

export const SalesView: React.FC<SalesViewProps> = ({ onOpenExport }) => {
  const { searchQuery, dateRange, setDateRange } = useStoreData();
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);

  const filteredCategories = mockCategories.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">
            Sales & Revenue Analytics
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Comprehensive register transactions, payment methods, and margin profit distribution.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-surface-container rounded-xl p-1 text-xs border border-border-subtle">
            {(['today', '7d', '30d', 'ytd'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  dateRange === r
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={onOpenExport}
            className="px-3.5 py-2 rounded-xl bg-primary text-white hover:bg-primary-hover text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download size={14} />
            <span>Export Sales CSV</span>
          </button>
        </div>
      </div>

      {/* Top Banner KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-card border border-border-subtle rounded-2xl p-5 shadow-stitch-card glass-panel">
          <div className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">
            Total Gross Revenue
          </div>
          <div className="text-3xl font-black font-mono-nums text-text-primary">Rs.1,245,890.50</div>
          <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-2">
            <TrendingUp size={14} />
            <span>+12.4% vs previous month</span>
          </div>
        </div>

        <div className="bg-surface-card border border-border-subtle rounded-2xl p-5 shadow-stitch-card glass-panel">
          <div className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">
            Average Basket Value
          </div>
          <div className="text-3xl font-black font-mono-nums text-text-primary">Rs.42.80</div>
          <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-2">
            <TrendingUp size={14} />
            <span>+Rs.1.48 per customer trip</span>
          </div>
        </div>

        <div className="bg-surface-card border border-border-subtle rounded-2xl p-5 shadow-stitch-card glass-panel">
          <div className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">
            Total Transactions
          </div>
          <div className="text-3xl font-black font-mono-nums text-text-primary">29,110</div>
          <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-2">
            <TrendingUp size={14} />
            <span>+8.9% checkout volume</span>
          </div>
        </div>

        <div className="bg-surface-card border border-border-subtle rounded-2xl p-5 shadow-stitch-card glass-panel">
          <div className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">
            Blended Profit Margin
          </div>
          <div className="text-3xl font-black font-mono-nums text-text-primary">28.4%</div>
          <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-2">
            <TrendingUp size={14} />
            <span>Highest in Bakery (42.0%)</span>
          </div>
        </div>
      </div>

      {/* Main Revenue Chart & Payment Methods Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Hourly/Daily Revenue Progression */}
        <div className="lg:col-span-8 bg-surface-card border border-border-subtle rounded-2xl p-5 shadow-stitch-card glass-panel">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-text-primary">Hourly Revenue Distribution</h3>
              <p className="text-xs text-text-muted">Tracking store peak income times throughout the day</p>
            </div>
            <span className="text-xs font-mono text-primary font-semibold bg-primary/10 px-2.5 py-1 rounded-lg">
              Avg Rs.88.9k / Hour
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockHourlyTraffic} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <XAxis dataKey="hour" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--color-text-muted)" fontSize={11} tickFormatter={(v) => `$${v / 1000}k`} tickLine={false} />
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
                <Bar dataKey="revenue" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Breakdown */}
        <div className="lg:col-span-4 bg-surface-card border border-border-subtle rounded-2xl p-5 shadow-stitch-card glass-panel flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-base text-text-primary mb-1">Payment Tender Types</h3>
            <p className="text-xs text-text-muted mb-3">Card vs. contactless vs. cash</p>

            <div className="h-44 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mockPaymentMethods}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {mockPaymentMethods.map((entry, index) => (
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
                    formatter={(v: any) => [`${v}%`, 'Share']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-2 mt-3">
            <div className="flex items-center justify-between p-2 rounded-xl bg-surface-container/60 text-xs">
              <div className="flex items-center gap-2">
                <CreditCard size={16} className="text-blue-500" />
                <span className="font-medium text-text-primary">Cards (Chip/Swipe)</span>
              </div>
              <span className="font-mono font-bold text-text-primary">68%</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-surface-container/60 text-xs">
              <div className="flex items-center gap-2">
                <Smartphone size={16} className="text-emerald-500" />
                <span className="font-medium text-text-primary">Apple/Google Pay</span>
              </div>
              <span className="font-mono font-bold text-text-primary">20%</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-surface-container/60 text-xs">
              <div className="flex items-center gap-2">
                <Coins size={16} className="text-amber-500" />
                <span className="font-medium text-text-primary">Cash Register</span>
              </div>
              <span className="font-mono font-bold text-text-primary">12%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Department Breakdown Data Table */}
      <div className="bg-surface-card border border-border-subtle rounded-2xl shadow-stitch-card glass-panel overflow-hidden">
        <div className="p-5 border-b border-border-subtle flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-text-primary">Department Performance Ledger</h3>
            <p className="text-xs text-text-muted">Revenue contribution, gross margin %, and growth vs target</p>
          </div>
          <span className="text-xs text-text-muted font-mono">{filteredCategories.length} categories tracked</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container/70 border-b border-border-subtle text-text-muted uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-5">Department</th>
                <th className="py-3.5 px-5">Total Sales</th>
                <th className="py-3.5 px-5">Share of Store</th>
                <th className="py-3.5 px-5">Profit Margin</th>
                <th className="py-3.5 px-5">Growth Rate</th>
                <th className="py-3.5 px-5 text-right">Trend Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filteredCategories.map((cat) => (
                <tr key={cat.name} className="hover:bg-surface-container/40 transition-colors">
                  <td className="py-3.5 px-5 font-semibold text-text-primary flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span>{cat.name}</span>
                  </td>
                  <td className="py-3.5 px-5 font-mono text-text-primary font-bold">
                    ${cat.revenue.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-5 font-mono text-text-muted">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 rounded-full bg-surface-container overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${cat.percentage * 2}%`, backgroundColor: cat.color }}
                        />
                      </div>
                      <span>{cat.percentage}%</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-5 font-mono font-semibold text-text-primary">
                    {cat.margin}%
                  </td>
                  <td className="py-3.5 px-5 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    +{cat.growth}%
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      Top Performer
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
