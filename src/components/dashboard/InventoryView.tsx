import React, { useState } from 'react';
import {
  Package,
  AlertTriangle,
  RotateCw,
  Truck,
  PlusCircle,
  Search,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  Download,
} from 'lucide-react';
import { useStoreData } from '../../context/StoreDataContext';

interface InventoryViewProps {
  onOpenExport: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ onOpenExport }) => {
  const { inventory, reorderItem, searchQuery } = useStoreData();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [justReordered, setJustReordered] = useState<string | null>(null);

  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());

    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && item.status.toLowerCase() === statusFilter.toLowerCase();
  });

  const handleReorder = (sku: string) => {
    reorderItem(sku);
    setJustReordered(sku);
    setTimeout(() => setJustReordered(null), 2500);
  };

  const criticalCount = inventory.filter((i) => i.status === 'Critical').length;
  const lowCount = inventory.filter((i) => i.status === 'Low Stock').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">
            Inventory & Supply Replenishment
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Real-time shelf inventory, automated stockout forecast, and supplier reorder triggers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenExport}
            className="px-3.5 py-2 rounded-xl bg-primary text-white hover:bg-primary-hover text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download size={14} />
            <span>Download CSV</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-card border border-border-subtle rounded-2xl p-5 shadow-stitch-card glass-panel">
          <div className="flex items-center justify-between text-text-muted mb-1 text-xs font-semibold uppercase">
            <span>Critical Stockout Risk</span>
            <AlertTriangle size={16} className="text-rose-500" />
          </div>
          <div className="text-3xl font-black font-mono-nums text-rose-500">
            {criticalCount} SKUs
          </div>
          <div className="text-xs text-text-muted mt-2">Will stock out in &lt; 24 hours</div>
        </div>

        <div className="bg-surface-card border border-border-subtle rounded-2xl p-5 shadow-stitch-card glass-panel">
          <div className="flex items-center justify-between text-text-muted mb-1 text-xs font-semibold uppercase">
            <span>Low Stock Reorders</span>
            <Package size={16} className="text-amber-500" />
          </div>
          <div className="text-3xl font-black font-mono-nums text-amber-500">
            {lowCount} SKUs
          </div>
          <div className="text-xs text-text-muted mt-2">Below designated reorder threshold</div>
        </div>

        <div className="bg-surface-card border border-border-subtle rounded-2xl p-5 shadow-stitch-card glass-panel">
          <div className="flex items-center justify-between text-text-muted mb-1 text-xs font-semibold uppercase">
            <span>Annual Inventory Turn</span>
            <RotateCw size={16} className="text-emerald-500" />
          </div>
          <div className="text-3xl font-black font-mono-nums text-text-primary">14.2x</div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-2">
            +5.1% efficiency year-over-year
          </div>
        </div>

        <div className="bg-surface-card border border-border-subtle rounded-2xl p-5 shadow-stitch-card glass-panel">
          <div className="flex items-center justify-between text-text-muted mb-1 text-xs font-semibold uppercase">
            <span>Avg Supplier Lead Time</span>
            <Truck size={16} className="text-blue-500" />
          </div>
          <div className="text-3xl font-black font-mono-nums text-text-primary">2.4 Days</div>
          <div className="text-xs text-text-muted mt-2">98.2% on-time fulfillment</div>
        </div>
      </div>

      {/* Table Filters & Actions */}
      <div className="bg-surface-card border border-border-subtle rounded-2xl shadow-stitch-card glass-panel overflow-hidden">
        <div className="p-5 border-b border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {(['all', 'critical', 'low stock', 'in stock', 'overstocked'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                  statusFilter === s
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-surface-container text-text-muted hover:text-text-primary'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="text-xs text-text-muted font-mono">
            Showing {filteredInventory.length} of {inventory.length} items
          </div>
        </div>

        {/* Inventory Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container/70 border-b border-border-subtle text-text-muted uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-5">Product & SKU</th>
                <th className="py-3.5 px-5">Department</th>
                <th className="py-3.5 px-5">Current Stock</th>
                <th className="py-3.5 px-5">Depletion Horizon</th>
                <th className="py-3.5 px-5">Supplier & Lead</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5 text-right">Replenishment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filteredInventory.map((item) => {
                const isCritical = item.status === 'Critical';
                const isLow = item.status === 'Low Stock';
                const isOver = item.status === 'Overstocked';

                return (
                  <tr key={item.sku} className="hover:bg-surface-container/40 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-text-primary text-sm">{item.name}</div>
                      <div className="font-mono text-[11px] text-text-muted mt-0.5">{item.sku}</div>
                    </td>

                    <td className="py-3.5 px-5 font-medium text-text-muted">
                      {item.category}
                    </td>

                    <td className="py-3.5 px-5">
                      <div className="font-mono text-sm font-bold text-text-primary">
                        {item.stockLevel} units
                      </div>
                      <div className="text-[10px] text-text-muted">Reorder @ {item.reorderPoint}</div>
                    </td>

                    <td className="py-3.5 px-5">
                      <div
                        className={`font-mono font-bold ${
                          isCritical
                            ? 'text-rose-600 dark:text-rose-400'
                            : isLow
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-text-primary'
                        }`}
                      >
                        {item.daysUntilStockout} days
                      </div>
                      <div className="text-[10px] text-text-muted font-mono">Turn: {item.shelfTurnoverRate}x</div>
                    </td>

                    <td className="py-3.5 px-5">
                      <div className="font-medium text-text-primary">{item.supplier}</div>
                      <div className="text-[10px] text-text-muted flex items-center gap-1">
                        <Clock size={11} /> {item.leadTimeDays}d delivery
                      </div>
                    </td>

                    <td className="py-3.5 px-5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isCritical
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            : isLow
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : isOver
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-5 text-right">
                      {justReordered === item.sku ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-bold bg-emerald-100 dark:bg-emerald-950 px-3 py-1.5 rounded-xl">
                          <CheckCircle2 size={14} /> +150 Ordered
                        </span>
                      ) : (
                        <button
                          onClick={() => handleReorder(item.sku)}
                          className={`px-3 py-1.5 rounded-xl font-semibold text-xs transition-all inline-flex items-center gap-1.5 ${
                            isCritical || isLow
                              ? 'bg-primary text-white hover:bg-primary-hover shadow-xs active:scale-95'
                              : 'bg-surface-container text-text-muted hover:text-text-primary hover:bg-surface-container-high'
                          }`}
                        >
                          <PlusCircle size={14} />
                          <span>Reorder</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
