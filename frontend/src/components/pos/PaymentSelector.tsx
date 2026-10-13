import type { PaymentMethod } from '../../types/pos';
import { Banknote, QrCode, CreditCard, Wallet } from 'lucide-react';
import { cn } from '../ui/utils';

interface PaymentSelectorProps {
  selectedMethod: PaymentMethod;
  onSelectMethod: (method: PaymentMethod) => void;
}

export function PaymentSelector({
  selectedMethod,
  onSelectMethod,
}: PaymentSelectorProps) {
  const methods: { id: PaymentMethod; label: string; icon: typeof Banknote }[] = [
    { id: 'Cash', label: 'Cash', icon: Banknote },
    { id: 'UPI / QR', label: 'UPI / QR', icon: QrCode },
    { id: 'Card', label: 'Card', icon: CreditCard },
    { id: 'Store Credit', label: 'Credit', icon: Wallet },
  ];

  return (
    <div className="pt-1">
      <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Payment method">
        {methods.map(({ id, label, icon: Icon }) => {
          const isSelected = selectedMethod === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelectMethod(id)}
              className={cn(
                'py-2 px-1 rounded-[8px] flex flex-col items-center justify-center gap-1 transition-all text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                isSelected
                  ? 'bg-primary text-primary-foreground border border-primary shadow-card font-semibold'
                  : 'bg-surface dark:bg-surface-low hover:bg-canvas dark:hover:bg-surface-high text-text-high border border-border font-medium'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />
              <span className="text-[11px] leading-tight truncate">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default PaymentSelector;
