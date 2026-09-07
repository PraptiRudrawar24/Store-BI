import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Megaphone,
  TrendingUp,
  Percent,
  DollarSign,
  Calendar,
  Sparkles,
  Download,
} from 'lucide-react';
import { mockMarketingCampaigns } from '../../data/mockStoreData';
import { useStoreData } from '../../context/StoreDataContext';

interface MarketingViewProps {
  onOpenExport: () => void;
}

export const MarketingView: React.FC<MarketingViewProps> = ({ onOpenExport }) => {
  const { searchQuery } = useStoreData();

  const filteredCampaigns = mockMarketingCampaigns.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.channel.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">
            Marketing Performance & Campaign ROI
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Tracking discount promotions, omnichannel push campaigns, and coupon redemption velocities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenExport}
            className="px-3.5 py-2 rounded-xl bg-primary text-white hover:bg-primary-hover text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download size={14} />
            <span>Export Campaign Data</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-card border border-border-subtle rounded-2xl p-5 shadow-stitch-card glass-panel">
          <div className="flex items-center justify-between text-text-muted mb-1 text-xs font-semibold uppercase">
            <span>Blended Campaign ROI</span>
            <TrendingUp size={16} className="text-emerald-500" />
          </div>
          <div className="text-3xl font-black font-mono-nums text-text-primary">8.4x</div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-2">
            $8.40 return for every $1 spent
          </div>
        </div>

        <div className="bg-surface-card border border-border-subtle rounded-2xl p-5 shadow-stitch-card glass-panel">
          <div className="flex items-center justify-between text-text-muted mb-1 text-xs font-semibold uppercase">
            <span>Promotion Revenue</span>
            <DollarSign size={16} className="text-primary" />
          </div>
          <div className="text-3xl font-black font-mono-nums text-text-primary">$82,700</div>
          <div className="text-xs text-text-muted mt-2">From active & recent campaigns</div>
        </div>

        <div className="bg-surface-card border border-border-subtle rounded-2xl p-5 shadow-stitch-card glass-panel">
          <div className="flex items-center justify-between text-text-muted mb-1 text-xs font-semibold uppercase">
            <span>Avg Coupon Redemption</span>
            <Percent size={16} className="text-amber-500" />
          </div>
          <div className="text-3xl font-black font-mono-nums text-text-primary">28.3%</div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-2">
            +6.2% higher via App Push notifications
          </div>
        </div>

        <div className="bg-surface-card border border-border-subtle rounded-2xl p-5 shadow-stitch-card glass-panel">
          <div className="flex items-center justify-between text-text-muted mb-1 text-xs font-semibold uppercase">
            <span>Active Campaigns</span>
            <Megaphone size={16} className="text-purple-500" />
          </div>
          <div className="text-3xl font-black font-mono-nums text-text-primary">2 Live</div>
          <div className="text-xs text-text-muted mt-2">Weekend Harvest + Dairy Bonus</div>
        </div>
      </div>

      {/* Campaign Cards Ledger */}
      <div className="space-y-4">
        {filteredCampaigns.map((camp) => (
          <div
            key={camp.id}
            className="bg-surface-card border border-border-subtle rounded-2xl p-5 shadow-stitch-card glass-panel flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-text-primary">{camp.name}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    camp.status === 'Active'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {camp.status}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-text-muted">
                <span className="font-medium text-primary">{camp.channel}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar size={12} /> {camp.startDate} to {camp.endDate}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-2.5 rounded-xl bg-surface-container/60">
                <div className="text-text-muted">Budget Spent</div>
                <div className="font-mono font-bold text-text-primary mt-0.5">${camp.budget.toLocaleString()}</div>
              </div>

              <div className="p-2.5 rounded-xl bg-surface-container/60">
                <div className="text-text-muted">Revenue Generated</div>
                <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  ${camp.revenueGenerated.toLocaleString()}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-surface-container/60">
                <div className="text-text-muted">ROI Multiplier</div>
                <div className="font-mono font-bold text-primary mt-0.5">{camp.roiMultiplier}x</div>
              </div>

              <div className="p-2.5 rounded-xl bg-surface-container/60">
                <div className="text-text-muted">Redemption Rate</div>
                <div className="font-mono font-bold text-text-primary mt-0.5">{camp.redemptionRate}%</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
