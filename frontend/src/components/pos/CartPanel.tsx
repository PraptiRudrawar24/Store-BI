import type { CartItem, CartTotals, CustomerInfo, PaymentMethod } from '../../types/pos';
import { CustomerFields } from './CustomerFields';
import { CartItemRow } from './CartItemRow';
import { TotalsSummary } from './TotalsSummary';
import { PaymentSelector } from './PaymentSelector';
import { Receipt, Trash2, ShoppingBasket } from 'lucide-react';

interface CartPanelProps {
  items: CartItem[];
  totals: CartTotals;
  customer: CustomerInfo;
  paymentMethod: PaymentMethod;
  onCustomerChange: (customer: CustomerInfo) => void;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onCompleteSale: () => void;
  onApplyDiscountClick?: () => void;
}

export function CartPanel({
  items,
  totals,
  customer,
  paymentMethod,
  onCustomerChange,
  onPaymentMethodChange,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCompleteSale,
  onApplyDiscountClick,
}: CartPanelProps) {
  const hasItems = items.length > 0;

  return (
    <section className="w-full xl:w-[460px] 2xl:w-[480px] bg-surface dark:bg-surface-low flex flex-col justify-between shrink-0 border-l border-border shadow-card z-10 min-h-0 h-full">
      {/* 1. Header & Fast Clear */}
      <div className="p-4 border-b border-border bg-surface dark:bg-surface-low">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary shrink-0" strokeWidth={2} />
            <h2 className="text-base font-bold text-text-high">Current Bill</h2>
            <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-bold">
              {totals.totalQuantity} {totals.totalQuantity === 1 ? 'item' : 'items'}
            </span>
          </div>

          <button
            type="button"
            onClick={onClearCart}
            disabled={!hasItems}
            title="Clear current cart"
            className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2 py-1 rounded-[4px] transition-colors flex items-center gap-1 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
            <span>Clear Cart</span>
          </button>
        </div>

        {/* Customer Information (Name & Mobile) */}
        <CustomerFields customer={customer} onChange={onCustomerChange} />
      </div>

      {/* 2. Scrollable Line Items */}
      <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-2 min-h-[160px]">
        {!hasItems ? (
          <div className="h-48 flex flex-col items-center justify-center text-text-medium gap-2 select-none">
            <ShoppingBasket className="w-10 h-10 text-text-low" strokeWidth={1.5} />
            <p className="text-xs font-medium text-text-medium text-center">
              Cart is empty. Scan barcodes or select fast pick items.
            </p>
          </div>
        ) : (
          items.map((item) => (
            <CartItemRow
              key={item.product.id}
              item={item}
              onUpdateQuantity={onUpdateQuantity}
              onRemoveItem={onRemoveItem}
            />
          ))
        )}
      </div>

      {/* 3. Totals Breakdown, Payment Mode & Complete Sale Button */}
      <div className="p-4 border-t border-border bg-surface dark:bg-surface-low flex flex-col gap-3">
        <TotalsSummary
          totals={totals}
          onApplyDiscountClick={onApplyDiscountClick}
        />

        <PaymentSelector
          selectedMethod={paymentMethod}
          onSelectMethod={onPaymentMethodChange}
        />

        {/* Primary Action Button: Complete Sale */}
        <button
          type="button"
          onClick={onCompleteSale}
          disabled={!hasItems}
          className="w-full h-12 min-h-[48px] bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-foreground rounded-[8px] text-sm font-bold flex items-center justify-center gap-2 shadow-card transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed select-none"
        >
          <Receipt className="w-4 h-4" strokeWidth={2.5} />
          <span>Complete Sale &amp; Generate Bill</span>
          <span className="text-[11px] px-2 py-0.5 rounded bg-white/20 font-mono font-medium ml-1">
            [Enter]
          </span>
        </button>
      </div>
    </section>
  );
}

export default CartPanel;
