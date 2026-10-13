import type { CartItem } from '../../types/pos';
import { formatPaiseToRupee } from '../../utils/money';
import { Minus, Plus, X } from 'lucide-react';

interface CartItemRowProps {
  item: CartItem;
  onUpdateQuantity: (productId: string, newQuantity: number) => void;
  onRemoveItem: (productId: string) => void;
}

export function CartItemRow({
  item,
  onUpdateQuantity,
  onRemoveItem,
}: CartItemRowProps) {
  const lineTotalPaise = item.product.pricePaise * item.quantity;

  return (
    <div className="p-2.5 rounded-[8px] border border-border bg-surface dark:bg-surface-low hover:bg-canvas dark:hover:bg-surface-high transition-colors flex items-center justify-between gap-2">
      {/* Title & Unit Price */}
      <div className="flex-1 min-w-0 pr-1">
        <h4 className="text-xs font-semibold text-text-high truncate leading-tight">
          {item.product.name}
        </h4>
        <p className="text-[11px] text-text-medium font-mono mt-0.5">
          {formatPaiseToRupee(item.product.pricePaise)} / unit
          {item.product.batchInfo && ` • ${item.product.batchInfo}`}
        </p>
      </div>

      {/* Stepper, Total, and Delete Button */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Quantity Stepper */}
        <div className="flex items-center border border-border bg-canvas dark:bg-surface rounded-[6px]">
          <button
            type="button"
            onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
            disabled={item.quantity <= 1}
            title="Decrease quantity"
            className="w-6 h-6 flex items-center justify-center text-text-medium hover:text-text-high hover:bg-surface dark:hover:bg-surface-high rounded-l-[5px] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Minus className="w-3 h-3" strokeWidth={2.5} />
          </button>
          <span className="w-6 text-center text-xs font-mono font-bold text-text-high select-none">
            {item.quantity}
          </span>
          <button
            type="button"
            onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
            disabled={item.quantity >= item.product.stock}
            title="Increase quantity"
            className="w-6 h-6 flex items-center justify-center text-text-medium hover:text-text-high hover:bg-surface dark:hover:bg-surface-high rounded-r-[5px] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Plus className="w-3 h-3" strokeWidth={2.5} />
          </button>
        </div>

        {/* Item Total */}
        <div className="w-16 sm:w-20 text-right font-bold text-xs sm:text-sm text-text-high font-mono tabular-nums">
          {formatPaiseToRupee(lineTotalPaise)}
        </div>

        {/* Delete Action */}
        <button
          type="button"
          onClick={() => onRemoveItem(item.product.id)}
          title="Remove item"
          className="text-text-medium hover:text-destructive hover:bg-destructive/10 p-1 rounded-[4px] transition-colors"
          aria-label={`Remove ${item.product.name}`}
        >
          <X className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

export default CartItemRow;
