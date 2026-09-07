import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Users,
  Award,
  Link2,
  TrendingUp,
  HeartHandshake,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  Download,
  Compass,
} from 'lucide-react';
import { mockCustomerSegments, mockBasketAffinity } from '../../data/mockStoreData';
import { useStoreData } from '../../context/StoreDataContext';

interface CustomersViewProps {
  onOpenExport: () => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({ onOpenExport }) => {
  const { searchQuery } = useStoreData();

  const filteredAffinity = mockBasketAffinity.filter(
    (a) =>
      a.primaryProduct.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.associatedProduct.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">
            Customer Demographics & Basket Affinity
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Analyzing shopper segments, loyalty program engagement, and cross-merchandising affinities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenExport}
            className="px-3.5 py-2 rounded-xl bg-primary text-white hover:bg-primary-hover text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download size={14} />
            <span>Export Customer Report</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-card border border-border-subtle rounded-2xl p-5 shadow-stitch-card glass-panel">
          <div className="flex items-center justify-between text-text-muted mb-1 text-xs font-semibold uppercase">
            <span>Total Active Shoppers</span>
            <Users size={16} className="text-primary" />
          </div>
          <div className="text-3xl font-black font-mono-nums text-text-primary">48,920</div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-2">
            +8.5% active monthly visitors
          </div>
        </div>

        <div className="bg-surface-card border border-border-subtle rounded-2xl p-5 shadow-stitch-card glass-panel">
          <div className="flex items-center justify-between text-text-muted mb-1 text-xs font-semibold uppercase">
            <span>Loyalty Member Share</span>
            <Award size={16} className="text-amber-500" />
          </div>
          <div className="text-3xl font-black font-mono-nums text-text-primary">74.2%</div>
          <div className="text-xs text-text-muted mt-2">36,300 loyalty program members</div>
        </div>

        <div className="bg-surface-card border border-border-subtle rounded-2xl p-5 shadow-stitch-card glass-panel">
          <div className="flex items-center justify-between text-text-muted mb-1 text-xs font-semibold uppercase">
            <span>Average Retention Rate</span>
            <HeartHandshake size={16} className="text-emerald-500" />
          </div>
          <div className="text-3xl font-black font-mono-nums text-text-primary">83.6%</div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-2">
            Highest in Family Shoppers (91.4%)
          </div>
        </div>

        <div className="bg-surface-card border border-border-subtle rounded-2xl p-5 shadow-stitch-card glass-panel">
          <div className="flex items-center justify-between text-text-muted mb-1 text-xs font-semibold uppercase">
            <span>Avg Items per Basket</span>
            <ShoppingBag size={16} className="text-purple-500" />
          </div>
          <div className="text-3xl font-black font-mono-nums text-text-primary">8.4 Items</div>
          <div className="text-xs text-text-muted mt-2">+0.6 items via bundle recommendations</div>
        </div>
      </div>

      {/* Segments Revenue Bar Chart & Loyalty Tiers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-surface-card border border-border-subtle rounded-2xl p-5 shadow-stitch-card glass-panel">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-text-primary">Monthly Revenue Contribution by Segment</h3>
              <p className="text-xs text-text-muted">Comparing buyer personas by gross store spend</p>
            </div>
            <span className="text-xs font-mono text-text-muted">Rs.1.24M Monthly Cohort</span>
          </div>

          <div className="h-68 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={mockCustomerSegments}
                layout="vertical"
                margin={{ top: 10, right: 20, left: 30, bottom: 0 }}
              >
                <XAxis
                  type="number"
                  stroke="var(--color-text-muted)"
                  fontSize={11}
                  tickFormatter={(v) => `Rs.${v / 1000}k`}
                  tickLine={false}
                />
                <YAxis
                  dataKey="segment"
                  type="category"
                  stroke="var(--color-text-muted)"
                  fontSize={11}
                  width={140}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface-card)',
                    borderColor: 'var(--color-border-subtle)',
                    borderRadius: '0.75rem',
                    color: 'var(--color-text-primary)',
                    fontSize: '12px',
                  }}
                  formatter={(value: any) => [`Rs.${Number(value).toLocaleString()}`, 'Monthly Spend']}
                />
                <Bar dataKey="monthlyRevenue" radius={[0, 6, 6, 0]}>
                  {mockCustomerSegments.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Loyalty Program Membership Tiers */}
        <div className="lg:col-span-4 bg-surface-card border border-border-subtle rounded-2xl p-5 shadow-stitch-card glass-panel flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-base text-text-primary mb-1">Lumina Rewards Tiers</h3>
            <p className="text-xs text-text-muted mb-4">Tier distribution & repeat visit velocity</p>

            <div className="space-y-3">
              <div className="p-3 rounded-xl border border-border-subtle bg-surface-container/60">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-800 dark:text-slate-200">Platinum VIP</span>
                  <span className="font-mono font-semibold text-text-primary">2,410 (6.6%)</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-surface-container overflow-hidden">
                  <div className="h-full bg-slate-400 rounded-full" style={{ width: '6.6%' }} />
                </div>
                <div className="text-[10px] text-text-muted mt-1">Avg 4.2 visits/week • Rs.142 basket</div>
              </div>

              <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-amber-600 dark:text-amber-400">Gold Club</span>
                  <span className="font-mono font-semibold text-text-primary">8,950 (24.7%)</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-surface-container overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: '24.7%' }} />
                </div>
                <div className="text-[10px] text-text-muted mt-1">Avg 2.6 visits/week •  Rs.84 basket</div>
              </div>

              <div className="p-3 rounded-xl border border-border-subtle bg-surface-container/60">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-blue-600 dark:text-blue-400">Silver Members</span>
                  <span className="font-mono font-semibold text-text-primary">15,400 (42.4%)</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-surface-container overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '42.4%' }} />
                </div>
                <div className="text-[10px] text-text-muted mt-1">Avg 1.5 visits/week •  Rs.48 basket</div>
              </div>

              <div className="p-3 rounded-xl border border-border-subtle bg-surface-container/60">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Bronze Starters</span>
                  <span className="font-mono font-semibold text-text-primary">9,540 (26.3%)</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-surface-container overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '26.3%' }} />
                </div>
                <div className="text-[10px] text-text-muted mt-1">New or casual store shoppers</div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-border-subtle/60 mt-3 text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <Sparkles size={13} />
            <span>AI recommendation engine active</span>
          </div>
        </div>
      </div>

      {/* Market Basket Affinity & Cross-Merchandising Recommendations */}
      <div className="bg-surface-card border border-border-subtle rounded-2xl shadow-stitch-card glass-panel overflow-hidden">
        <div className="p-5 border-b border-border-subtle flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-text-primary">
                Market Basket Affinity Rules (Association Analysis)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-primary/10 text-primary">
                A Priori Model
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              High confidence product pairs bought together and recommended aisle cross-placement
            </p>
          </div>
          <span className="text-xs text-text-muted font-mono">{filteredAffinity.length} rule pairs</span>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAffinity.map((pair, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-border-subtle bg-surface-container/40 hover:bg-surface-container/70 transition-all flex flex-col justify-between space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Link2 size={16} className="text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                    Basket Pair #{idx + 1}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-mono">
                    {pair.affinityScore}% Affinity
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-mono">
                    {pair.liftMultiplier}x Lift
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-text-primary gap-2 bg-surface-card p-3 rounded-lg border border-border-subtle/50">
                <span className="truncate">{pair.primaryProduct}</span>
                <ArrowRight size={16} className="text-text-muted shrink-0" />
                <span className="truncate text-primary">{pair.associatedProduct}</span>
              </div>

              <div className="text-xs text-text-muted flex items-start gap-1.5 pt-1">
                <Compass size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Merchandising Action:</strong> {pair.recommendedPlacement}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
