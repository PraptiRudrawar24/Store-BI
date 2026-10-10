import * as React from 'react';
import { Copy, Check, MessageSquare, Phone, Package, Send } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../ui/Toast';
import type { AlertItem } from '../../api/client';

interface ReorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: AlertItem | null;
}

export function ReorderModal({ isOpen, onClose, item }: ReorderModalProps) {
  const { user } = useAuth();
  const toast = useToast();

  const [quantity, setQuantity] = React.useState<number>(10);
  const [supplierPhone, setSupplierPhone] = React.useState<string>('');
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (item) {
      setQuantity(item.suggested_reorder_qty || 10);
      setCopied(false);
    }
  }, [item]);

  if (!item) return null;

  const shopName = user?.name || 'Store';
  const shopOwner = user?.owner_name || '';
  const shopPhone = user?.phone ? `+91 ${user.phone}` : '';

  const messageText = `Hello,
Please arrange a reorder for:
• Product: ${item.name}
• Quantity needed: ${quantity} units
• Current stock: ${item.stock_qty} units

Store: ${shopName}${shopOwner ? ` (${shopOwner})` : ''}
${shopPhone ? `Contact: ${shopPhone}` : ''}
Thank you!`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      toast.success('Supplier reorder message copied to clipboard');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleWhatsApp = () => {
    const encoded = encodeURIComponent(messageText);
    const cleanPhone = supplierPhone.replace(/\D/g, '');
    let url = '';
    if (cleanPhone) {
      const fullPhone = cleanPhone.startsWith('91') && cleanPhone.length === 12
        ? cleanPhone
        : `91${cleanPhone.slice(-10)}`;
      url = `https://wa.me/${fullPhone}?text=${encoded}`;
    } else {
      url = `https://wa.me/?text=${encoded}`;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reorder stock"
      description={`Generate and send a purchase order request for ${item.name}.`}
    >
      <div className="flex flex-col gap-4">
        {/* Product Quick Info Card */}
        <div className="p-3.5 rounded-[8px] bg-canvas border border-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-[8px] bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 stroke-[1.75]" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-text-high truncate">{item.name}</span>
              <span className="text-xs text-text-medium truncate">
                Category: {item.category || 'General'} • Reorder threshold: {item.reorder_level}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[11px] text-text-medium block">Current stock</span>
            <span className="text-sm font-bold tabular-nums text-text-high">
              {item.stock_qty} units
            </span>
          </div>
        </div>

        {/* Inputs: Quantity & Supplier Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-text-high block mb-1">
              Order quantity (units)
            </label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="h-10 text-sm font-bold tabular-nums"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-text-high block mb-1">
              Supplier WhatsApp (optional)
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-text-medium absolute left-3 top-3 pointer-events-none" />
              <input
                type="tel"
                placeholder="10-digit number"
                value={supplierPhone}
                onChange={(e) => setSupplierPhone(e.target.value)}
                className="h-10 w-full pl-9 pr-3 rounded-[8px] border border-border bg-surface text-sm text-text-high placeholder:text-text-low focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Prefilled Message Preview */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-text-medium flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-primary" />
              <span>Prefilled supplier message</span>
            </label>
            <span className="text-[11px] text-text-low">Ready to send</span>
          </div>
          <textarea
            readOnly
            rows={6}
            value={messageText}
            className="w-full p-3 rounded-[8px] border border-border bg-canvas font-mono text-xs text-text-high leading-relaxed resize-none focus:outline-none select-all"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2 border-t border-border">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="h-10 text-xs font-semibold"
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={handleCopy}
            className="h-10 text-xs font-semibold"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-success mr-1.5" strokeWidth={2.5} />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-1.5" strokeWidth={2} />
                <span>Copy message</span>
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={handleWhatsApp}
            className="h-10 text-xs font-semibold bg-[#16A34A] hover:bg-[#15803D] text-white border-transparent"
          >
            <Send className="w-4 h-4 mr-1.5" strokeWidth={2} />
            <span>Send via WhatsApp</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
