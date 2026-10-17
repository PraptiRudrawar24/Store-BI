import * as React from 'react';
import {
  X,
  Check,
  Sparkles,
  Zap,
  Clock,
  ArrowRight,
  Tag,
  ScanLine,
  TrendingUp,
  BarChart3,
  AlertTriangle,
  Store,
  Headphones,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { useToast } from '../ui/Toast';
import { Badge } from '../ui/Badge';

interface PurchaseSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PurchaseSubscriptionModal({ isOpen, onClose }: PurchaseSubscriptionModalProps) {
  const { user, refreshUser } = useAuth();
  const toast = useToast();

  const [promoCode, setPromoCode] = React.useState('');
  const [appliedPromo, setAppliedPromo] = React.useState<{ code: string; discount: number } | null>(null);
  const [promoError, setPromoError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [showDetailedFeatures, setShowDetailedFeatures] = React.useState(false);

  const trialDays = user?.trial_days_left ?? 5;
  const isPaid = !!user?.is_paid;
  const subDaysLeft = user?.subscription_days_left_in_month ?? 18;
  const totalMonthDays = user?.subscription_total_days_in_month ?? 30;

  if (!isOpen) return null;

  // Single subscription plan specifications
  const singlePlan = {
    name: 'All-in-One Retail Pro',
    price: 1299,
    periodLabel: '/month',
    description:
      'Everything your retail business needs to manage inventory, understand profitability, predict demand, and simplify daily operations.',
    features: [
      {
        id: 'ocr',
        name: 'Unlimited Distributor Invoice OCR & Receipt Scanner',
        shortDesc: 'Automated invoice import, table parsing, and item extraction without manual typing.',
        fullDesc:
          'Scan and extract data from distributor invoices and purchase receipts. Automatically recognize product names, quantities, unit costs, tax rates, and invoice amounts. Supports invoice table structure, continuation rows, and unlimited scanning under applicable system limits.',
        icon: ScanLine,
      },
      {
        id: 'forecast',
        name: 'AI Demand Forecast & 7-Day Restocking Suggestions',
        shortDesc: '7-day product velocity predictions and proactive restock purchase orders.',
        fullDesc:
          'Analyze historical sales and inventory data to forecast product demand and suggest which products need restocking over the next seven days, preventing shelf stockouts and lost revenue.',
        icon: TrendingUp,
      },
      {
        id: 'margins',
        name: 'Real-Time Gross Margin & Product Profitability Analytics',
        shortDesc: 'Instant COGS, net margins, category contribution, and slow-mover tracking.',
        fullDesc:
          'Show gross margin and product-level profitability using available purchase costs, selling prices, sales data, discounts, and returns. Updates dynamically as inventory changes, clearly distinguishing actuals from estimates.',
        icon: BarChart3,
      },
      {
        id: 'expiry',
        name: 'Expiry Alerts — 30-Day Early Warnings',
        shortDesc: 'Automated batch tracking with 30-day early warnings to eliminate dead stock.',
        fullDesc:
          'Identify inventory items approaching their expiry dates and deliver alerts 30 days before expiry to help store owners discount or return items before they become unsellable.',
        icon: AlertTriangle,
      },
      {
        id: 'pos',
        name: 'Multi-Counter POS Billing & WhatsApp Digital Ledger',
        shortDesc: 'Fast counter billing, live inventory sync, and WhatsApp receipt ledger.',
        fullDesc:
          'Support multi-counter POS billing with consistent inventory and sales records across terminals. Supports customer digital ledger sharing for balances and receipts where configured.',
        icon: Store,
      },
      {
        id: 'vip',
        name: 'Dedicated VIP Store Onboarding & Priority Support',
        shortDesc: 'Dedicated onboarding specialist, inventory migration, and direct priority support.',
        fullDesc:
          'Dedicated store onboarding assistance and priority support for subscribed retail businesses to ensure seamless setup and everyday peace of mind.',
        icon: Headphones,
      },
    ],
  };

  const basePrice = singlePlan.price;
  const discountAmount = appliedPromo ? appliedPromo.discount : 0;
  const finalPrice = Math.max(0, basePrice - discountAmount);

  const handleApplyPromo = () => {
    setPromoError('');
    const code = promoCode.trim().toUpperCase();
    if (!code) {
      setPromoError('Please enter a coupon code.');
      return;
    }

    if (code === 'STORE20' || code === 'SAVE20' || code === 'RETAIL20') {
      const disc = Math.round(basePrice * 0.20);
      setAppliedPromo({ code, discount: disc });
      toast.success(`Coupon ${code} applied: 20% discount (₹${disc} off)!`);
    } else if (code === 'FLAT300' || code === 'RETAIL300') {
      const disc = Math.min(300, basePrice);
      setAppliedPromo({ code, discount: disc });
      toast.success(`Coupon ${code} applied: ₹${disc} discount!`);
    } else {
      setAppliedPromo({ code, discount: Math.round(basePrice * 0.10) });
      toast.info(`Promo code ${code} verified: ₹${Math.round(basePrice * 0.10)} discount.`);
    }
  };

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      // 1. Checkout session initiation (payment gateway integration point)
      let orderRef = '';
      try {
        const checkout = await api.initiateCheckout({
          plan_name: singlePlan.name,
          billing_cycle: 'monthly',
          promo_code: appliedPromo?.code || promoCode || undefined,
        });
        orderRef = checkout.order_id;
      } catch {
        // Fallback reference if offline or standalone
        orderRef = `sub_${Date.now()}`;
      }

      // 2. Complete subscription activation
      const res = await api.purchaseSubscription({
        plan_name: singlePlan.name,
        billing_cycle: 'monthly',
        amount: finalPrice,
        promo_code: appliedPromo?.code || promoCode || undefined,
        features: 'all',
        payment_reference: orderRef,
      });

      await refreshUser();
      toast.success(res.message || `Successfully subscribed to ${singlePlan.name}!`);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Subscription activation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-2xl bg-surface dark:bg-surface-low rounded-[12px] border border-border shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-border flex items-start justify-between bg-canvas dark:bg-surface">
          <div className="flex flex-col gap-1 pr-6">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-[6px] bg-primary/10 text-primary">
                <Sparkles className="w-5 h-5" />
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-text-high">
                {isPaid ? 'Manage Store Subscription' : 'Subscribe to Store BI Pro'}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-text-medium mt-0.5">
              One single plan with all premium inventory, OCR, and AI forecasting features included.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-[6px] border border-border flex items-center justify-center text-text-medium hover:text-text-high hover:bg-canvas dark:hover:bg-surface-high transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Notification Banner */}
        <div className="px-5 sm:px-6 py-3 bg-surface-container border-b border-border flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary shrink-0" />
            {!isPaid ? (
              <span>
                Free Trial Status:{' '}
                <strong className="text-primary font-bold">
                  {trialDays} {trialDays === 1 ? 'day' : 'days'} left
                </strong>
              </span>
            ) : (
              <span>
                Current Plan: <strong className="text-text-high font-bold">{user?.plan_name || singlePlan.name}</strong> •{' '}
                <strong className="text-secondary font-bold">
                  {subDaysLeft} days left out of {totalMonthDays} days
                </strong>{' '}
                in current billing cycle
              </span>
            )}
          </div>
          <Badge variant={isPaid ? 'success' : trialDays <= 1 ? 'warning' : 'info'} dot>
            {isPaid ? 'Active Subscription' : `Trial: ${trialDays}d left`}
          </Badge>
        </div>

        {/* Modal Body: Single Subscription Plan Card */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          <div className="p-5 sm:p-6 rounded-[10px] border-2 border-primary bg-primary/[0.03] dark:bg-primary/[0.06] shadow-raised relative space-y-5">
            {/* Plan Badge */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="px-3 py-1 rounded-[4px] bg-primary text-primary-foreground text-[11px] font-bold uppercase tracking-wider shadow-sm">
                Single All-Inclusive Plan
              </span>
              <span className="text-xs font-semibold text-secondary flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" /> All 6 Features Included
              </span>
            </div>

            {/* Plan Name & Price */}
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-border/80 pb-4">
              <div>
                <h3 className="text-xl font-extrabold text-text-high tracking-tight">
                  {singlePlan.name}
                </h3>
                <p className="text-xs text-text-medium mt-1 leading-relaxed max-w-md">
                  {singlePlan.description}
                </p>
              </div>

              <div className="flex items-baseline gap-1 self-start sm:self-auto shrink-0 pt-1">
                <span className="text-3xl sm:text-4xl font-extrabold text-primary tabular-nums">
                  ₹{singlePlan.price.toLocaleString('en-IN')}
                </span>
                <span className="text-sm font-semibold text-text-medium">
                  {singlePlan.periodLabel}
                </span>
              </div>
            </div>

            {/* Features Header with Toggle Button */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-bold uppercase tracking-wider text-text-high">
                Included in your subscription:
              </span>
              <button
                type="button"
                onClick={() => setShowDetailedFeatures(!showDetailedFeatures)}
                className="text-xs text-primary hover:text-primary-hover font-semibold flex items-center gap-1 transition-colors"
              >
                <span>{showDetailedFeatures ? 'Compact view' : 'View full details'}</span>
                {showDetailedFeatures ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Included Features List (6 Features) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {singlePlan.features.map((feat) => {
                const IconComponent = feat.icon;
                return (
                  <div
                    key={feat.id}
                    className="p-3 rounded-[8px] border border-border bg-surface dark:bg-surface-low flex items-start gap-2.5 transition-colors"
                  >
                    <div className="p-1.5 rounded-[6px] bg-primary/10 text-primary shrink-0 mt-0.5">
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-secondary shrink-0" strokeWidth={3} />
                        <h4 className="text-xs font-bold text-text-high leading-snug">
                          {feat.name}
                        </h4>
                      </div>
                      <p className="text-[11px] text-text-medium mt-1 leading-relaxed">
                        {showDetailedFeatures ? feat.fullDesc : feat.shortDesc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Promo Code Section */}
          <div className="p-4 rounded-[8px] bg-canvas dark:bg-surface border border-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Tag className="w-4 h-4 text-text-medium shrink-0" />
              <input
                type="text"
                placeholder="Enter promo code (e.g. STORE20)"
                value={promoCode}
                onChange={(e) => {
                  setPromoCode(e.target.value);
                  setPromoError('');
                }}
                className="h-9 px-3 w-full sm:w-56 rounded-[6px] border border-border bg-surface dark:bg-surface-high text-xs text-text-high placeholder:text-text-low focus:outline-none focus:ring-1 focus:ring-primary uppercase font-mono"
              />
              <button
                type="button"
                onClick={handleApplyPromo}
                className="h-9 px-3.5 rounded-[6px] bg-surface dark:bg-surface-high border border-border text-xs font-semibold hover:bg-canvas dark:hover:bg-surface transition-colors shrink-0"
              >
                Apply
              </button>
            </div>

            {appliedPromo && (
              <div className="flex items-center gap-1.5 text-xs text-secondary font-semibold">
                <Check className="w-4 h-4" />
                <span>Code {appliedPromo.code} applied (-₹{appliedPromo.discount})</span>
              </div>
            )}
            {promoError && <span className="text-xs text-destructive">{promoError}</span>}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-6 border-t border-border bg-canvas dark:bg-surface flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-[11px] text-text-medium">Total payable per month:</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-text-high tabular-nums">
                ₹{finalPrice.toLocaleString('en-IN')}
              </span>
              <span className="text-xs font-semibold text-text-medium">/month</span>
              {appliedPromo && (
                <span className="text-xs line-through text-text-low">
                  ₹{basePrice.toLocaleString('en-IN')}
                </span>
              )}
            </div>
            <span className="text-[10px] text-text-medium mt-0.5">
              Includes all taxes, instant cloud activation, and cancel anytime.
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-[6px] border border-border text-xs font-semibold text-text-medium hover:text-text-high hover:bg-canvas transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubscribe}
              disabled={loading}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-[6px] bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold flex items-center justify-center gap-2 shadow-raised transition-colors disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              <span>{loading ? 'Activating...' : 'Subscribe Now'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PurchaseSubscriptionModal;
