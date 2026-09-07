import React from 'react';
import { AlertTriangle, Thermometer, ShoppingCart, CheckCircle2, X } from 'lucide-react';
import { useStoreData } from '../../context/StoreDataContext';

interface AlertsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AlertsDrawer: React.FC<AlertsDrawerProps> = ({ isOpen, onClose }) => {
  const { inventory, reorderItem, setActiveTab } = useStoreData();

  if (!isOpen) return null;

  const lowStockItems = inventory.filter((i) => i.status === 'Critical' || i.status === 'Low Stock');

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
      <div className="bg-surface-card border-l border-border-subtle w-full max-w-md h-full p-6 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-text-primary">Operational Alerts</h3>
              <p className="text-xs text-text-muted">{lowStockItems.length + 1} active notices require review</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-container"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-3.5">
          {/* Cold Chain Alert */}
          <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 text-xs">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 font-semibold text-amber-600 dark:text-amber-400">
                <Thermometer size={16} />
                <span>Cold-Chain Sensor Warning</span>
              </div>
              <span className="text-[10px] text-text-muted">3 mins ago</span>
            </div>
            <p className="mt-1.5 text-text-primary leading-relaxed">
              <strong>Produce Mist Island #2:</strong> Reading at <span className="font-mono text-rose-500 font-bold">7.2°C</span> (target: 6.0°C). Humidity valve adjusted automatically.
            </p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => {
                  setActiveTab('operations');
                  onClose();
                }}
                className="px-2.5 py-1 rounded bg-amber-500 text-white font-medium hover:bg-amber-600 text-[11px]"
              >
                Inspect IoT Sensors
              </button>
            </div>
          </div>

          {/* Low Stock Alerts */}
          {lowStockItems.map((item) => (
            <div
              key={item.sku}
              className="p-3.5 rounded-xl border border-border-subtle bg-surface-container/60 text-xs"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-text-primary">
                  <ShoppingCart size={15} className="text-rose-500" />
                  <span>{item.name}</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                  {item.status}
                </span>
              </div>
              <div className="mt-1.5 flex justify-between text-text-muted">
                <span>Stock: <strong className="text-text-primary font-mono">{item.stockLevel} units</strong></span>
                <span>Depletion: <strong className="text-rose-600 dark:text-rose-400">{item.daysUntilStockout} days</strong></span>
              </div>
              <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-border-subtle/50">
                <span className="text-[11px] text-text-muted">Supplier: {item.supplier}</span>
                <button
                  onClick={() => reorderItem(item.sku)}
                  className="px-2.5 py-1 rounded bg-primary text-white font-medium hover:bg-primary-hover flex items-center gap-1 text-[11px]"
                >
                  <CheckCircle2 size={12} />
                  Auto-Reorder (+150)
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-border-subtle">
          <button
            onClick={() => {
              setActiveTab('inventory');
              onClose();
            }}
            className="w-full py-2.5 rounded-xl bg-surface-container text-text-primary font-semibold text-xs hover:bg-surface-container-high transition-colors"
          >
            View Full Inventory Matrix
          </button>
        </div>
      </div>
    </div>
  );
};
