import type { CartTotals } from '../../types/pos';
import { formatPaiseToRupee } from '../../utils/money';

interface TotalsSummaryProps {
  totals: CartTotals;
  onApplyDiscountClick?: () => void;
}

export function TotalsSummary({
  totals,
  onApplyDiscountClick,
}: TotalsSummaryProps) {
  return (
    <div className="flex flex-col gap-1.5 text-xs">
      {/* Subtotal */}
      <div className="flex items-center justify-between text-text-medium">
        <span>Subtotal</span>
        <span className="font-mono font-semibold text-text-high">
          {formatPaiseToRupee(totals.subtotalPaise)}
        </span>
      </div>

      {/* Discount */}
      <div className="flex items-center justify-between text-text-medium">
        <div className="flex items-center gap-1.5">
          <span>Discount</span>
          <button
            type="button"
            onClick={onApplyDiscountClick}
            title="Apply discount or coupon [F4]"
            className="text-[10px] px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-[4px] font-mono font-semibold hover:underline"
          >
            Coupon / Inst.
          </button>
        </div>
        <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
          -{formatPaiseToRupee(totals.discountPaise)}
        </span>
      </div>

      {/* GST / Tax (5%) */}
      <div className="flex items-center justify-between text-text-medium">
        <div className="flex items-center gap-1">
          <span>GST / Tax (5%)</span>
          <span className="text-[10px] text-text-low font-mono">
            (CGST 2.5% + SGST 2.5%)
          </span>
        </div>
        <span className="font-mono font-semibold text-text-high">
          {formatPaiseToRupee(totals.gstPaise)}
        </span>
      </div>

      {/* Round-off Difference (shown whenever round-off occurs) */}
      {totals.roundOffPaise !== 0 && (
        <div className="flex items-center justify-between text-text-medium text-[11px]">
          <span>Round-off</span>
          <span className="font-mono font-medium text-text-medium">
            {totals.roundOffPaise > 0 ? '+' : ''}
            {formatPaiseToRupee(totals.roundOffPaise)}
          </span>
        </div>
      )}

      {/* Grand Total Row */}
      <div className="pt-2 mt-1 border-t border-dashed border-border flex items-baseline justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-text-medium">
            Grand Total
          </span>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
            Rounded off to nearest rupee
          </p>
        </div>
        <div className="text-right">
          <span className="font-mono text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
            {formatPaiseToRupee(totals.grandTotalPaise)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default TotalsSummary;
