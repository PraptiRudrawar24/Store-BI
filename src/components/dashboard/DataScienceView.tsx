import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Line,
} from 'recharts';
import {
  BrainCircuit,
  Sparkles,
  AlertTriangle,
  TrendingUp,
  Cpu,
  Target,
  SunMedium,
  CheckCircle2,
  Download,
} from 'lucide-react';
import { mockDemandForecast } from '../../data/mockStoreData';

interface DataScienceViewProps {
  onOpenExport: () => void;
}

export const DataScienceView: React.FC<DataScienceViewProps> = ({ onOpenExport }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">
              AI Demand Forecasting & Data Science
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary flex items-center gap-1 font-mono">
              <Cpu size={13} />
              Prophet-ML Engine
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Machine learning predictive store demand modeling, anomaly detection, and automated grocery intelligence.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenExport}
            className="px-3.5 py-2 rounded-xl bg-primary text-white hover:bg-primary-hover text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download size={14} />
            <span>Export AI Predictions</span>
          </button>
        </div>
      </div>

      {/* AI Automated Executive Insights */}
      <div className="bg-gradient-to-r from-primary/15 via-primary-container/10 to-transparent border border-primary/30 rounded-2xl p-5 shadow-stitch-card">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={18} className="text-primary" />
          <h3 className="font-bold text-base text-text-primary">Executive Machine Learning Synthesizer</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-surface-card/80 border border-border-subtle text-xs">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold mb-1">
              <SunMedium size={15} />
              <span>Weather-Driven Fresh Surge (+18%)</span>
            </div>
            <p className="text-text-primary leading-relaxed">
              Upcoming weekend forecast (28°C sunny) is predicted to boost Fresh Produce and Chilled Beverages by <strong>18.4%</strong>. Auto-increase avocado and melon orders.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-card/80 border border-border-subtle text-xs">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold mb-1">
              <TrendingUp size={15} />
              <span>Bakery Velocity Velocity Shift</span>
            </div>
            <p className="text-text-primary leading-relaxed">
              Artisan sourdough turnover accelerated to <strong>32.0x</strong>. Current shelf batches sell out by 16:30. Recommend morning bake replenishment increase by +40 loaves.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-card/80 border border-border-subtle text-xs">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold mb-1">
              <Target size={15} />
              <span>Affinity Basket Cross-Sale (+2.8x)</span>
            </div>
            <p className="text-text-primary leading-relaxed">
              Pairing Grass-Fed Milk with Organic Rolled Oats yielded a <strong>91.2%</strong> cart co-occurrence. Endcap placement in Aisle 4 validated.
            </p>
          </div>
        </div>
      </div>

      {/* Predictive Demand Graph with Confidence Interval */}
      <div className="bg-surface-card border border-border-subtle rounded-2xl p-5 shadow-stitch-card glass-panel">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-bold text-base text-text-primary">
              15-Day Revenue Trajectory & 95% Confidence Interval
            </h3>
            <p className="text-xs text-text-muted">
              Historical actual sales vs. machine learning estimated demand trajectory
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-primary" /> Actual Revenue
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-emerald-500 border-dashed" /> ML Forecast
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-2 bg-emerald-500/20 rounded-xs" /> 95% CI Interval
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockDemandForecast} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--color-text-muted)" fontSize={11} tickFormatter={(v) => `$${v / 1000}k`} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-surface-card)',
                  borderColor: 'var(--color-border-subtle)',
                  borderRadius: '0.75rem',
                  color: 'var(--color-text-primary)',
                  fontSize: '12px',
                }}
                formatter={(v: any, name: any) => [
                  v ? `$${Number(v).toLocaleString()}` : '—',
                  name === 'actual' ? 'Actual Revenue' : name === 'predicted' ? 'ML Forecast' : name,
                ]}
              />
              <Area type="monotone" dataKey="upperBound" stroke="transparent" fill="url(#colorBand)" />
              <Area type="monotone" dataKey="lowerBound" stroke="transparent" fill="transparent" />
              <Line type="monotone" dataKey="predicted" stroke="#10B981" strokeWidth={2.5} strokeDasharray="4 4" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="actual" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 pt-3 border-t border-border-subtle/60 flex items-center justify-between text-xs text-text-muted">
          <span>Model Accuracy: <strong className="text-emerald-600 font-mono">98.2% (MAPE 1.8%)</strong></span>
          <span>Forecast Horizon: Next 5 days estimated through Sep 09</span>
        </div>
      </div>

      {/* Real-time Anomaly Detection Ledger */}
      <div className="bg-surface-card border border-border-subtle rounded-2xl p-5 shadow-stitch-card glass-panel">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            <h3 className="font-bold text-base text-text-primary">Statistical Anomaly Radar</h3>
          </div>
          <span className="text-xs text-emerald-600 font-semibold bg-emerald-100 dark:bg-emerald-950 px-2.5 py-1 rounded-full">
            No Critical Fraud Detected
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl border border-border-subtle bg-surface-container/60">
            <div className="flex items-center justify-between font-bold text-text-primary mb-1">
              <span>Produce Weight Deviation Anomaly</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Warning
              </span>
            </div>
            <p className="text-text-muted mt-1 leading-relaxed">
              Self-checkout Lane 4 reported 3 tare scale weight mismatches on organic bananas within 10 minutes. POS attendant notified.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-border-subtle bg-surface-container/60">
            <div className="flex items-center justify-between font-bold text-text-primary mb-1">
              <span>Beverage Stock Drop Rate Alert</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                Informational
              </span>
            </div>
            <p className="text-text-muted mt-1 leading-relaxed">
              Sparkling Botanical Tonic sales rate increased 340% following promotional display placement. Recommended shelf restock before 17:00.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
