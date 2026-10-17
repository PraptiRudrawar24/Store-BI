import * as React from 'react';
import type { CompletedSale } from '../../types/pos';
import { formatPaiseToRupee } from '../../utils/money';
import { downloadReceiptImage, getWhatsAppBillUrl } from '../../utils/receiptImage';
import { Printer, Download, MessageSquare, PlusCircle, X } from 'lucide-react';

interface ReceiptModalProps {
  sale: CompletedSale | null;
  isOpen: boolean;
  onClose: () => void;
  onNewSale: () => void;
}

export function ReceiptModal({
  sale,
  isOpen,
  onClose,
  onNewSale,
}: ReceiptModalProps) {
  const modalRef = React.useRef<HTMLDivElement>(null);
  const printButtonRef = React.useRef<HTMLButtonElement>(null);

  // Focus management & Escape key trap
  React.useEffect(() => {
    if (isOpen) {
      printButtonRef.current?.focus();

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        } else if (e.ctrlKey && (e.key === 'p' || e.key === 'P')) {
          e.preventDefault();
          window.print();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadImage = () => {
    downloadReceiptImage(sale);
  };

  const handleWhatsApp = () => {
    const url = getWhatsAppBillUrl(sale);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-dialog-title"
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto animate-in fade-in duration-150 select-none print:p-0 print:bg-transparent print:static"
    >
      <div
        ref={modalRef}
        className="max-w-md w-full flex flex-col my-auto relative print:w-full print:max-w-none"
      >
        {/* Printable Thermal Receipt Paper Card (Always White Paper styling) */}
        <div
          id="thermal-receipt-printable"
          className="bg-white text-slate-900 rounded-2xl p-6 shadow-2xl relative font-mono text-xs border border-slate-200 select-text"
        >
          {/* Close button (Hidden during print) */}
          <button
            type="button"
            onClick={onClose}
            title="Close Receipt [Esc]"
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 p-1.5 rounded-lg transition-colors print:hidden"
            aria-label="Close receipt"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center pt-1">
            <h2
              id="receipt-dialog-title"
              className="text-base font-bold tracking-tight text-slate-900 uppercase"
            >
              {sale.storeName}
            </h2>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
              {sale.storeDivision}
            </p>

            <div className="mt-2.5">
              <p className="text-xs font-bold text-slate-800 tracking-wider">
                TAX INVOICE / CASH RECEIPT
              </p>
              <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                Bill: {sale.billNumber} | {sale.timestamp}
              </p>
              {(sale.customer.name || sale.customer.phone) && (
                <p className="text-[11px] text-slate-700 font-medium mt-0.5">
                  Customer: {sale.customer.name || 'Walk-in'}
                  {sale.customer.phone && ` (+91 ${sale.customer.phone})`}
                </p>
              )}
            </div>
          </div>

          {/* Dashed Separator */}
          <div className="border-t border-dashed border-slate-400 my-3" />

          {/* Itemized Table */}
          <div className="text-xs">
            <div className="flex items-center justify-between font-bold border-b border-slate-300 pb-1 mb-2 text-[11px] text-slate-600 uppercase">
              <span className="flex-1">Item</span>
              <span className="w-10 text-center">Qty</span>
              <span className="w-16 text-right">Price</span>
              <span className="w-16 text-right">Total</span>
            </div>

            <div className="flex flex-col gap-2">
              {sale.items.map((item) => {
                const lineTotal = item.product.pricePaise * item.quantity;
                return (
                  <div
                    key={item.product.id}
                    className="flex items-start justify-between font-medium text-slate-900 leading-tight"
                  >
                    <span className="flex-1 pr-2 truncate">
                      {item.product.name}
                    </span>
                    <span className="w-10 text-center font-bold text-slate-800">
                      {item.quantity}
                    </span>
                    <span className="w-16 text-right text-slate-600 font-mono">
                      {formatPaiseToRupee(item.product.pricePaise)}
                    </span>
                    <span className="w-16 text-right font-bold text-slate-900 font-mono">
                      {formatPaiseToRupee(lineTotal)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dashed Separator */}
          <div className="border-t border-dashed border-slate-400 my-3" />

          {/* Breakdown Calculation */}
          <div className="flex flex-col gap-1 text-xs text-slate-800">
            <div className="flex justify-between">
              <span className="text-slate-600">Subtotal:</span>
              <span className="font-bold">
                {formatPaiseToRupee(sale.totals.subtotalPaise)}
              </span>
            </div>

            {sale.totals.discountPaise > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount:</span>
                <span className="font-bold">
                  -{formatPaiseToRupee(sale.totals.discountPaise)}
                </span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-slate-600">
                GST (5%) [CGST 2.5% + SGST 2.5%]:
              </span>
              <span className="font-bold">
                {formatPaiseToRupee(sale.totals.gstPaise)}
              </span>
            </div>

            {sale.totals.roundOffPaise !== 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Round-off to nearest rupee:</span>
                <span className="font-medium">
                  {sale.totals.roundOffPaise > 0 ? '+' : ''}
                  {formatPaiseToRupee(sale.totals.roundOffPaise)}
                </span>
              </div>
            )}
          </div>

          {/* Double Separator Line */}
          <div className="border-t-2 border-slate-900 my-2.5" />

          {/* Grand Total */}
          <div className="flex justify-between items-baseline text-slate-900">
            <span className="font-bold text-sm tracking-wide">GRAND TOTAL:</span>
            <span className="font-extrabold text-xl font-mono">
              {formatPaiseToRupee(sale.totals.grandTotalPaise)}
            </span>
          </div>

          {/* Payment Method */}
          <div className="flex justify-between text-xs text-slate-700 mt-1">
            <span>Payment Method:</span>
            <span className="font-bold text-slate-900">
              {sale.paymentMethod}
            </span>
          </div>

          {/* Thermal Receipt Footer */}
          <div className="text-center mt-5 pt-3 border-t border-dashed border-slate-300">
            <p className="text-xs text-slate-700 font-medium">
              Thank you for shopping with us!
            </p>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              Powered by Store BI • Retail Intelligence
            </p>
          </div>
        </div>

        {/* Action Buttons Bar (Hidden in Print) */}
        <div className="mt-3.5 flex flex-col gap-2 print:hidden">
          <div className="grid grid-cols-2 gap-2">
            {/* Download Image Button */}
            <button
              type="button"
              onClick={handleDownloadImage}
              className="h-10 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-[8px] text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-[0.98]"
              title="Download Receipt as PNG image"
            >
              <Download className="w-4 h-4 text-emerald-400" strokeWidth={2.5} />
              <span>Download Image</span>
            </button>

            {/* Print Receipt Button */}
            <button
              ref={printButtonRef}
              type="button"
              onClick={handlePrint}
              className="h-10 px-3 bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-foreground rounded-[8px] text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-[0.98]"
              title="Print 80mm thermal receipt [Ctrl+P]"
            >
              <Printer className="w-4 h-4" strokeWidth={2} />
              <span>Print [Ctrl+P]</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* WhatsApp Bill Button */}
            <button
              type="button"
              onClick={handleWhatsApp}
              className="h-10 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[8px] text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-[0.98]"
              title="Send bill summary via WhatsApp"
            >
              <MessageSquare className="w-4 h-4" strokeWidth={2} />
              <span>WhatsApp Bill</span>
            </button>

            {/* New Sale Button */}
            <button
              type="button"
              onClick={onNewSale}
              className="h-10 px-3 bg-surface dark:bg-surface-high hover:bg-canvas border border-border text-text-high rounded-[8px] text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
              title="Start new transaction"
            >
              <PlusCircle className="w-4 h-4 text-primary" strokeWidth={2} />
              <span>New Sale</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReceiptModal;
