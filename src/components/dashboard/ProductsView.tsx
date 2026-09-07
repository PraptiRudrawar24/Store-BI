import React, { useState } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Layers,
  Star,
  DollarSign,
  HelpCircle,
  AlertOctagon,
  Clock,
  Compass,
  Download,
} from 'lucide-react';
import { mockProductMatrix } from '../../data/mockStoreData';
import { useStoreData } from '../../context/StoreDataContext';

interface ProductsViewProps {
  onOpenExport: () => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({ onOpenExport }) => {
  const { searchQuery } = useStoreData();
  const [selectedQuadrant, setSelectedQuadrant] = useState<string>('all');

  const filteredProducts = mockProductMatrix.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());

    if (selectedQuadrant === 'all') return matchesSearch;
    return matchesSearch && p.type.toLowerCase() === selectedQuadrant.toLowerCase();
  });

  const scatterData = mockProductMatrix.map((p) => ({
    name: p.name,
    volume: p.salesVolume,
    margin: p.grossMargin,
    revenue: p.revenue,
    type: p.type,
  }));

  const colorByType: Record<string, string> = {
    Star: '#10B981',
    'Cash Cow': '#3B82F6',
    'Question Mark': '#F59E0B',
    Dog: '#EF4444',
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">
            Product Portfolio & Margin Matrix
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Analyzing SKU velocity, shelf placement profitability, and perishable expiration horizons.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenExport}
            className="px-3.5 py-2 rounded-xl bg-primary text-white hover:bg-primary-hover text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download size={14} />
            <span>Export Product Catalog</span>
          </button>
        </div>
      </div>

      {/* BCG Quadrant Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setSelectedQuadrant(selectedQuadrant === 'star' ? 'all' : 'star')}
          className={`cursor-pointer bg-surface-card border rounded-2xl p-5 shadow-stitch-card glass-panel transition-all ${
            selectedQuadrant === 'star' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-border-subtle hover:border-emerald-500/50'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Stars (High Vol + High Margin)</span>
            <Star size={18} />
          </div>
          <div className="text-2xl font-black font-mono-nums text-text-primary">2 SKUs</div>
          <p className="text-[11px] text-text-muted mt-1">Avocados, Grass-Fed Milk. Primary profit drivers.</p>
        </div>

        <div
          onClick={() => setSelectedQuadrant(selectedQuadrant === 'cash cow' ? 'all' : 'cash cow')}
          className={`cursor-pointer bg-surface-card border rounded-2xl p-5 shadow-stitch-card glass-panel transition-all ${
            selectedQuadrant === 'cash cow' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-border-subtle hover:border-blue-500/50'
          }`}
        >
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Cash Cows (High Vol + Stable)</span>
            <DollarSign size={18} />
          </div>
          <div className="text-2xl font-black font-mono-nums text-text-primary">1 SKU</div>
          <p className="text-[11px] text-text-muted mt-1">Rolled Oats. High household steady demand.</p>
        </div>

        <div
          onClick={() => setSelectedQuadrant(selectedQuadrant === 'question mark' ? 'all' : 'question mark')}
          className={`cursor-pointer bg-surface-card border rounded-2xl p-5 shadow-stitch-card glass-panel transition-all ${
            selectedQuadrant === 'question mark' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-border-subtle hover:border-amber-500/50'
          }`}
        >
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Question Marks (High Margin)</span>
            <HelpCircle size={18} />
          </div>
          <div className="text-2xl font-black font-mono-nums text-text-primary">1 SKU</div>
          <p className="text-[11px] text-text-muted mt-1">Botanical Tonic. Needs promotional push.</p>
        </div>

        <div
          onClick={() => setSelectedQuadrant(selectedQuadrant === 'dog' ? 'all' : 'dog')}
          className={`cursor-pointer bg-surface-card border rounded-2xl p-5 shadow-stitch-card glass-panel transition-all ${
            selectedQuadrant === 'dog' ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-border-subtle hover:border-rose-500/50'
          }`}
        >
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Underperformers (Review Shelf)</span>
            <AlertOctagon size={18} />
          </div>
          <div className="text-2xl font-black font-mono-nums text-text-primary">1 SKU</div>
          <p className="text-[11px] text-text-muted mt-1">Linen Spray. Candidate for clearance / delisting.</p>
        </div>
      </div>

      {/* Margin vs. Volume Quadrant Scatter Chart */}
      <div className="bg-surface-card border border-border-subtle rounded-2xl p-5 shadow-stitch-card glass-panel">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-base text-text-primary">Margin % vs. Monthly Sales Volume Quadrant</h3>
            <p className="text-xs text-text-muted">Bubble size proportional to total gross revenue generated</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Star</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Cash Cow</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Question Mark</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Review/Dog</span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
              <XAxis
                type="number"
                dataKey="volume"
                name="Sales Volume"
                stroke="var(--color-text-muted)"
                fontSize={11}
                unit=" units"
                tickLine={false}
              />
              <YAxis
                type="number"
                dataKey="margin"
                name="Gross Margin"
                stroke="var(--color-text-muted)"
                fontSize={11}
                unit="%"
                tickLine={false}
              />
              <ZAxis type="number" dataKey="revenue" range={[100, 500]} name="Revenue" />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{
                  backgroundColor: 'var(--color-surface-card)',
                  borderColor: 'var(--color-border-subtle)',
                  borderRadius: '0.75rem',
                  color: 'var(--color-text-primary)',
                  fontSize: '12px',
                }}
                formatter={(value: any, name: any) => [
                  name === 'revenue' ? `$${Number(value).toLocaleString()}` : `${value}${name === 'margin' ? '%' : ' units'}`,
                  name === 'revenue' ? 'Gross Revenue' : name === 'volume' ? 'Volume' : 'Margin',
                ]}
              />
              <Scatter data={scatterData}>
                {scatterData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colorByType[entry.type] || '#3B82F6'} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Product Matrix Table with Perishable Days Remaining */}
      <div className="bg-surface-card border border-border-subtle rounded-2xl shadow-stitch-card glass-panel overflow-hidden">
        <div className="p-5 border-b border-border-subtle flex items-center justify-between">
          <h3 className="font-bold text-base text-text-primary">Shelf Placement & Expiration Horizon</h3>
          <span className="text-xs text-text-muted font-mono">{filteredProducts.length} products listed</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container/70 border-b border-border-subtle text-text-muted uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-5">SKU & Item Name</th>
                <th className="py-3.5 px-5">Department</th>
                <th className="py-3.5 px-5">Aisle / Placement</th>
                <th className="py-3.5 px-5">Volume Sold</th>
                <th className="py-3.5 px-5">Gross Margin</th>
                <th className="py-3.5 px-5">Perishable Status</th>
                <th className="py-3.5 px-5 text-right">Portfolio Class</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filteredProducts.map((p) => (
                <tr key={p.sku} className="hover:bg-surface-container/40 transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="font-semibold text-text-primary text-sm">{p.name}</div>
                    <div className="font-mono text-[11px] text-text-muted">{p.sku}</div>
                  </td>
                  <td className="py-3.5 px-5 font-medium text-text-muted">{p.category}</td>
                  <td className="py-3.5 px-5 flex items-center gap-1.5 font-medium text-text-primary">
                    <Compass size={13} className="text-primary" />
                    <span>{p.shelfAisle}</span>
                  </td>
                  <td className="py-3.5 px-5 font-mono font-bold text-text-primary">
                    {p.salesVolume.toLocaleString()} units
                  </td>
                  <td className="py-3.5 px-5 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {p.grossMargin}%
                  </td>
                  <td className="py-3.5 px-5">
                    {p.isPerishable ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-full">
                        <Clock size={12} /> {p.expirationDaysRemaining} days remaining
                      </span>
                    ) : (
                      <span className="text-[11px] text-text-muted">Stable Shelf Life</span>
                    )}
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <span
                      className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white"
                      style={{ backgroundColor: colorByType[p.type] }}
                    >
                      {p.type}
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
