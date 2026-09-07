import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileJson, Printer, Check, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useStoreData } from '../../context/StoreDataContext';
import { mockCategories, mockHourlyTraffic } from '../../data/mockStoreData';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const { inventory, kpis } = useStoreData();
  const [downloading, setDownloading] = useState<string | null>(null);

  if (!isOpen) return null;

  const triggerConfetti = () => {
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#004ac6', '#10b981', '#f59e0b', '#8b5cf6'],
    });
  };

  const exportInventoryCSV = () => {
    setDownloading('csv');
    setTimeout(() => {
      const headers = ['SKU,Name,Category,StockLevel,ReorderPoint,UnitCost,RetailPrice,Supplier,Status,DaysToStockout\n'];
      const rows = inventory.map(
        (i) =>
          `"${i.sku}","${i.name}","${i.category}",${i.stockLevel},${i.reorderPoint},${i.unitCost},${i.retailPrice},"${i.supplier}","${i.status}",${i.daysUntilStockout}`
      );
      const blob = new Blob([headers.concat(rows.join('\n')).join('')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Store_BI_Inventory_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setDownloading(null);
      triggerConfetti();
    }, 600);
  };

  const exportJSONDump = () => {
    setDownloading('json');
    setTimeout(() => {
      const data = {
        exportedAt: new Date().toISOString(),
        kpis,
        categories: mockCategories,
        hourlyTraffic: mockHourlyTraffic,
        inventory,
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Store_BI_FullData_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setDownloading(null);
      triggerConfetti();
    }, 600);
  };

  const printReport = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface-card border border-border-subtle rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-surface-container"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Download size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-text-primary">Export Store BI Data</h3>
            <p className="text-xs text-text-muted">Download fresh snapshots of metrics and datasets</p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={exportInventoryCSV}
            disabled={downloading !== null}
            className="w-full flex items-center justify-between p-3.5 rounded-xl border border-border-subtle bg-surface-container hover:bg-surface-container-high transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="text-emerald-500" size={24} />
              <div>
                <div className="font-semibold text-sm text-text-primary">Inventory & Stockouts (CSV)</div>
                <div className="text-xs text-text-muted">SKU levels, turnover, supplier reorders</div>
              </div>
            </div>
            {downloading === 'csv' ? (
              <span className="text-xs text-primary font-medium">Exporting...</span>
            ) : (
              <Download size={18} className="text-text-muted" />
            )}
          </button>

          <button
            onClick={exportJSONDump}
            disabled={downloading !== null}
            className="w-full flex items-center justify-between p-3.5 rounded-xl border border-border-subtle bg-surface-container hover:bg-surface-container-high transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <FileJson className="text-amber-500" size={24} />
              <div>
                <div className="font-semibold text-sm text-text-primary">Full Business Intelligence Dump (JSON)</div>
                <div className="text-xs text-text-muted">KPIs, category shares, hourly traffic</div>
              </div>
            </div>
            {downloading === 'json' ? (
              <span className="text-xs text-primary font-medium">Exporting...</span>
            ) : (
              <Download size={18} className="text-text-muted" />
            )}
          </button>

          <button
            onClick={printReport}
            className="w-full flex items-center justify-between p-3.5 rounded-xl border border-border-subtle bg-surface-container hover:bg-surface-container-high transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <Printer className="text-blue-500" size={24} />
              <div>
                <div className="font-semibold text-sm text-text-primary">Print / Save as Executive PDF</div>
                <div className="text-xs text-text-muted">Formatted for presentation or hardcopy briefing</div>
              </div>
            </div>
            <Printer size={18} className="text-text-muted" />
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-border-subtle flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text-primary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
