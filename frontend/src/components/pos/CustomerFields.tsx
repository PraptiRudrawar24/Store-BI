import type { CustomerInfo } from '../../types/pos';

interface CustomerFieldsProps {
  customer: CustomerInfo;
  onChange: (customer: CustomerInfo) => void;
}

export function CustomerFields({ customer, onChange }: CustomerFieldsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
      {/* Customer Name */}
      <div>
        <label
          htmlFor="pos-customer-name"
          className="block text-[11px] font-bold uppercase tracking-wider text-text-medium mb-1"
        >
          Customer Name (Optional)
        </label>
        <input
          id="pos-customer-name"
          type="text"
          value={customer.name}
          onChange={(e) => onChange({ ...customer, name: e.target.value })}
          placeholder="Enter customer name"
          className="w-full h-8 px-2.5 bg-surface dark:bg-surface-low rounded-[6px] border border-border text-xs text-text-high placeholder:text-text-low focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-colors"
        />
      </div>

      {/* WhatsApp / Mobile Number */}
      <div>
        <label
          htmlFor="pos-customer-phone"
          className="block text-[11px] font-bold uppercase tracking-wider text-text-medium mb-1"
        >
          WhatsApp / Mobile
        </label>
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-text-medium font-mono font-medium pointer-events-none select-none">
            +91
          </span>
          <input
            id="pos-customer-phone"
            type="tel"
            value={customer.phone}
            onChange={(e) => {
              // Strip non-digits and limit to 10 digits
              const clean = e.target.value.replace(/\D/g, '').slice(0, 10);
              onChange({ ...customer, phone: clean });
            }}
            placeholder="Enter 10-digit mobile number"
            className="w-full h-8 pl-10 pr-2 bg-surface dark:bg-surface-low rounded-[6px] border border-border text-xs text-text-high font-mono placeholder:text-text-low focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-colors"
          />
        </div>
      </div>
    </div>
  );
}

export default CustomerFields;
