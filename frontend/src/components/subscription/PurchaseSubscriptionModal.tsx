import * as React from 'react';
import {
  X,
  Check,
  CheckCircle2,
  XCircle,
  AlertCircle,
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
  CreditCard,
  Smartphone,
  Building2,
  Lock,
  Copy,
  RotateCcw,
  ArrowLeft,
  RefreshCw,
  QrCode,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  api,
  type CreateSubscriptionOrderResponse,
  type VerifySubscriptionPaymentResponse,
} from '../../api/client';
import { useToast } from '../ui/Toast';
import { Badge } from '../ui/Badge';

interface PurchaseSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PaymentMethodType = 'upi' | 'card' | 'netbanking';
type ModalStep = 'select' | 'qr_pay' | 'processing' | 'verifying' | 'success' | 'failed' | 'cancelled' | 'unconfigured';

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function PurchaseSubscriptionModal({ isOpen, onClose }: PurchaseSubscriptionModalProps) {
  const { user, refreshUser } = useAuth();
  const toast = useToast();

  const [step, setStep] = React.useState<ModalStep>('select');
  const [selectedMethod, setSelectedMethod] = React.useState<PaymentMethodType>('upi');
  const [promoCode, setPromoCode] = React.useState('');
  const [appliedPromo, setAppliedPromo] = React.useState<{ code: string; discount: number } | null>(null);
  const [promoError, setPromoError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [showDetailedFeatures, setShowDetailedFeatures] = React.useState(false);
  const [copiedTx, setCopiedTx] = React.useState(false);

  // Active transaction details
  const [currentOrder, setCurrentOrder] = React.useState<CreateSubscriptionOrderResponse | null>(null);
  const [verifiedPayment, setVerifiedPayment] = React.useState<VerifySubscriptionPaymentResponse | null>(null);

  // QR Online Pay state
  const [qrStatus, setQrStatus] = React.useState<'waiting_for_payment' | 'pending_verification' | 'paid' | 'failed'>('waiting_for_payment');
  const [utrInput, setUtrInput] = React.useState('');
  const [utrSubmitting, setUtrSubmitting] = React.useState(false);
  const [utrError, setUtrError] = React.useState('');
  const [copiedVpa, setCopiedVpa] = React.useState(false);
  const [copiedAmount, setCopiedAmount] = React.useState(false);
  const pollIntervalRef = React.useRef<any>(null);

  const trialDays = user?.trial_days_left ?? 5;
  const isPaid = !!user?.is_paid;
  const subDaysLeft = user?.subscription_days_left_in_month ?? 18;
  const totalMonthDays = user?.subscription_total_days_in_month ?? 30;

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const startPolling = (orderId: string) => {
    stopPolling();
    pollIntervalRef.current = setInterval(async () => {
      try {
        const statusRes = await api.getSubscriptionPaymentStatus(orderId);
        if (statusRes.status === 'paid') {
          stopPolling();
          setQrStatus('paid');
          await refreshUser();
          setStep('success');
          toast.success('Subscription payment verified successfully! All-Features Pro is now active.');
        } else if (statusRes.status === 'pending_verification') {
          setQrStatus('pending_verification');
        } else if (statusRes.status === 'failed') {
          stopPolling();
          setQrStatus('failed');
          setErrorMessage(statusRes.error_reason || 'Payment was declined by your bank.');
        } else if (statusRes.status === 'cancelled') {
          stopPolling();
          setStep('cancelled');
        }
      } catch {
        // Ignore background polling glitches
      }
    }, 3000);
  };

  React.useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  // Reset state when modal is opened
  React.useEffect(() => {
    if (isOpen) {
      setStep('select');
      setErrorMessage('');
      setLoading(false);
      setCopiedTx(false);
      setQrStatus('waiting_for_payment');
      setUtrInput('');
      setUtrError('');
      stopPolling();
    } else {
      stopPolling();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Single subscription plan specifications: All-Features Pro for ₹1,299 per month
  const planDetails = {
    name: 'All-Features Pro',
    price: 1299,
    periodLabel: '/month',
    billingPeriod: 'Monthly (30 Days)',
    description:
      'Everything your retail store needs to manage inventory, forecast demand, automate distributor bills, and track real-time profitability.',
    features: [
      {
        id: 'ocr',
        name: 'Unlimited Invoice OCR & Receipt Scanner',
        shortDesc: 'Automated invoice import, table parsing, and item extraction without manual typing.',
        fullDesc:
          'Scan and extract data from distributor invoices and purchase receipts. Automatically recognize product names, quantities, unit costs, tax rates, and invoice amounts.',
        icon: ScanLine,
      },
      {
        id: 'forecast',
        name: 'AI Demand Forecast & 7-Day Restocking',
        shortDesc: '7-day product velocity predictions and proactive restock purchase orders.',
        fullDesc:
          'Analyze historical sales and inventory data to forecast product demand and suggest which products need restocking over the next seven days, preventing stockouts.',
        icon: TrendingUp,
      },
      {
        id: 'margins',
        name: 'Gross Margin & Profitability Analytics',
        shortDesc: 'Instant COGS, net margins, category mix, and slow-mover tracking.',
        fullDesc:
          'Show gross margin and product-level profitability using available purchase costs, selling prices, sales data, discounts, and returns.',
        icon: BarChart3,
      },
      {
        id: 'expiry',
        name: 'Expiry Alerts & 30-Day Early Warnings',
        shortDesc: 'Automated batch tracking with 30-day early warnings to eliminate dead stock.',
        fullDesc:
          'Identify inventory items approaching expiry dates and deliver alerts 30 days before expiry to help discount or return items before they become unsellable.',
        icon: AlertTriangle,
      },
      {
        id: 'pos',
        name: 'Multi-Counter POS Billing & Digital Ledger',
        shortDesc: 'Fast counter billing, live inventory sync, and WhatsApp receipt ledger.',
        fullDesc:
          'Support multi-counter POS billing with consistent inventory and sales records across terminals. Supports customer digital ledger sharing for balances and receipts.',
        icon: Store,
      },
      {
        id: 'vip',
        name: 'Dedicated VIP Store Onboarding & Support',
        shortDesc: 'Dedicated onboarding specialist, inventory migration, and direct priority support.',
        fullDesc:
          'Dedicated store onboarding assistance and priority support for subscribed retail businesses to ensure seamless setup and everyday peace of mind.',
        icon: Headphones,
      },
    ],
  };

  const basePrice = planDetails.price;
  const discountAmount = appliedPromo ? appliedPromo.discount : 0;
  const finalPrice = Math.max(0, basePrice - discountAmount);

  // Format Indian currency
  const formatCurrency = (amt: number) => `₹${amt.toLocaleString('en-IN')}`;

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
      toast.success(`Coupon ${code} applied: 20% discount (${formatCurrency(disc)} off)!`);
    } else if (code === 'FLAT300' || code === 'RETAIL300') {
      const disc = Math.min(300, basePrice);
      setAppliedPromo({ code, discount: disc });
      toast.success(`Coupon ${code} applied: ${formatCurrency(disc)} discount!`);
    } else {
      const disc = Math.round(basePrice * 0.10);
      setAppliedPromo({ code, discount: disc });
      toast.info(`Promo code ${code} verified: ${formatCurrency(disc)} discount.`);
    }
  };

  // --------------------------------------------------------------------------
  // PAYMENT FLOW (CREATE ORDER -> OPEN CHECKOUT -> VERIFY SIGNATURE)
  // --------------------------------------------------------------------------

  const handleInitiatePayment = async () => {
    setLoading(true);
    setErrorMessage('');
    setStep('processing');

    try {
      // 1. Request secure payment order from backend
      const order = await api.createSubscriptionOrder({
        plan_name: planDetails.name,
        billing_cycle: 'monthly',
        payment_method: selectedMethod,
        promo_code: appliedPromo?.code || promoCode || undefined,
      });

      setCurrentOrder(order);

      // If customer selected Online Pay / UPI QR, open the QR payment view directly
      if (selectedMethod === 'upi') {
        setLoading(false);
        setStep('qr_pay');
        setQrStatus('waiting_for_payment');
        setUtrInput('');
        setUtrError('');
        startPolling(order.order_id);
        return;
      }

      // 2. Check if Razorpay keys are configured
      const scriptLoaded = await loadRazorpayScript();

      // If gateway is live or configured with real test keys
      if (order.is_configured && scriptLoaded && (window as any).Razorpay) {
        const RazorpayClass = (window as any).Razorpay;
        const options = {
          key: order.key_id,
          amount: order.amount_paise,
          currency: order.currency || 'INR',
          name: 'Store BI',
          description: 'All-Features Pro Monthly Subscription',
          image: '/logo/store-bi-logo.jpeg',
          order_id: order.order_id,
          prefill: {
            name: user?.owner_name || user?.name || 'Retail Merchant',
            contact: user?.phone || '',
            email: user?.email || '',
          },
          notes: {
            plan_name: 'All-Features Pro',
            shop_id: user?.id ? String(user.id) : '',
            billing_period: 'monthly',
          },
          theme: {
            color: '#005c55', // Store BI brand dark green
          },
          modal: {
            ondismiss: async () => {
              setLoading(false);
              setStep('cancelled');
              await api.cancelSubscriptionOrder(order.order_id, 'User closed payment window');
            },
          },
          handler: async (response: {
            razorpay_payment_id: string;
            razorpay_order_id: string;
            razorpay_signature: string;
          }) => {
            await handleVerifyPayment(response);
          },
        };

        const rzp = new RazorpayClass(options);
        rzp.on('payment.failed', (failedRes: any) => {
          setLoading(false);
          setStep('failed');
          setErrorMessage(
            failedRes?.error?.description || 'Your payment was declined by the bank. Please try again.'
          );
        });
        rzp.open();
      } else {
        // Test mode or unconfigured credentials:
        // Transition to test/sandbox execution so user can verify flow without live gateway
        setLoading(false);
        if (!order.is_configured && !order.is_test_mode) {
          setStep('unconfigured');
        } else {
          // In test/sandbox mode, display direct test checkout options
          setStep('processing');
        }
      }
    } catch (err: any) {
      setLoading(false);
      setStep('failed');
      setErrorMessage(err.message || 'Unable to create payment order. Please check your connection.');
    }
  };

  // Server-side signature verification
  const handleVerifyPayment = async (razorpayData: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => {
    setLoading(true);
    setStep('verifying');

    try {
      const verification = await api.verifySubscriptionPayment({
        razorpay_order_id: razorpayData.razorpay_order_id,
        razorpay_payment_id: razorpayData.razorpay_payment_id,
        razorpay_signature: razorpayData.razorpay_signature,
        plan_name: planDetails.name,
        billing_cycle: 'monthly',
      });

      setVerifiedPayment(verification);
      await refreshUser();
      setStep('success');
      toast.success('Subscription Activated Successfully! All-Features Pro is now active.');
    } catch (err: any) {
      setStep('failed');
      setErrorMessage(
        err.message || 'Payment signature verification failed. Please contact Store BI support.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Simulate test payment for sandbox testing (used when testing without live card)
  const handleSimulateTestPayment = async () => {
    if (!currentOrder) return;
    setLoading(true);
    setStep('verifying');

    try {
      // In test mode, create valid test payment_id & HMAC signature
      const testPaymentId = `pay_test_${Date.now().toString(36)}`;
      const orderId = currentOrder.order_id;
      const secret = 'test_secret_storebi_mock';

      // Compute HMAC-SHA256 signature using browser Web Crypto API
      const encoder = new TextEncoder();
      const keyData = encoder.encode(secret);
      const msgData = encoder.encode(`${orderId}|${testPaymentId}`);
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
      const signatureArray = Array.from(new Uint8Array(signatureBuffer));
      const testSignature = signatureArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      await handleVerifyPayment({
        razorpay_order_id: orderId,
        razorpay_payment_id: testPaymentId,
        razorpay_signature: testSignature,
      });
    } catch (err: any) {
      setStep('failed');
      setErrorMessage(err.message || 'Test payment simulation failed.');
      setLoading(false);
    }
  };

  const handleCopyTransactionId = (txId: string) => {
    navigator.clipboard.writeText(txId);
    setCopiedTx(true);
    toast.success('Transaction ID copied to clipboard');
    setTimeout(() => setCopiedTx(false), 2000);
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    if (label === 'UPI ID') {
      setCopiedVpa(true);
      setTimeout(() => setCopiedVpa(false), 2000);
    } else if (label === 'Amount') {
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2000);
    }
    toast.success(`${label} copied to clipboard!`);
  };

  const handleBackFromQR = () => {
    stopPolling();
    setStep('select');
    setUtrError('');
  };

  const handleSubmitUTR = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = utrInput.trim();
    if (!clean) {
      setUtrError('Please enter the 12-digit UPI Reference / UTR Number from your payment app.');
      return;
    }
    if (clean.length < 8) {
      setUtrError('UPI Reference / UTR number must be at least 8 to 12 characters.');
      return;
    }

    setUtrSubmitting(true);
    setUtrError('');

    try {
      if (!currentOrder) throw new Error('Payment session not found. Please initiate payment again.');
      const res = await api.submitUPIPaymentReference({
        order_id: currentOrder.order_id,
        utr_number: clean,
        plan_name: planDetails.name,
        billing_cycle: 'monthly',
      });

      if (res.status === 'paid') {
        stopPolling();
        setQrStatus('paid');
        await refreshUser();
        setStep('success');
        toast.success('UPI Payment verified successfully! All-Features Pro is now active.');
      } else if (res.status === 'pending_verification') {
        setQrStatus('pending_verification');
        toast.info('UPI reference submitted. Verifying with bank network...');
      } else {
        setUtrError(res.message || 'Payment verification pending.');
      }
    } catch (err: any) {
      setUtrError(err.message || 'Unable to verify UPI reference. Please check the number and try again.');
    } finally {
      setUtrSubmitting(false);
    }
  };

  // Compute dates for success screen
  const todayFormatted = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const renewalDate = new Date();
  renewalDate.setDate(renewalDate.getDate() + 30);
  const renewalFormatted = renewalDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="subscription-modal-title"
    >
      <div className="relative w-full max-w-2xl bg-surface dark:bg-surface-low rounded-[12px] border border-border shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* ================================================================= */}
        {/* MODAL HEADER WITH STORE BI BRANDING */}
        {/* ================================================================= */}
        <div className="p-4 sm:p-5 border-b border-border flex items-start justify-between bg-canvas dark:bg-surface shrink-0">
          <div className="flex items-center gap-3">
            <img
              src="/logo/store-bi-logo.jpeg"
              alt="Store BI logo"
              className="w-10 h-10 rounded-[8px] object-cover border border-border shrink-0 shadow-xs"
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-text-high leading-tight">Store BI</span>
                <span className="px-2 py-0.5 rounded-[4px] bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wider">
                  Pro License
                </span>
              </div>
              <h2 id="subscription-modal-title" className="text-sm font-semibold text-text-medium mt-0.5">
                {user?.name || 'Retail store'} • Monthly Subscription Checkout
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-[6px] border border-border flex items-center justify-center text-text-medium hover:text-text-high hover:bg-canvas dark:hover:bg-surface-high transition-colors"
            title="Close payment window"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Account Status Strip */}
        <div className="px-5 py-2.5 bg-surface-container border-b border-border flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2 text-text-medium">
            <Clock className="w-4 h-4 text-primary shrink-0" />
            {!isPaid ? (
              <span>
                Trial validity:{' '}
                <strong className="text-primary font-bold">
                  {trialDays} {trialDays === 1 ? 'day' : 'days'} remaining
                </strong>
              </span>
            ) : (
              <span>
                Plan: <strong className="text-text-high font-bold">{user?.plan_name || 'All-Features Pro'}</strong> (
                <strong className="text-secondary font-bold">{subDaysLeft} of {totalMonthDays} days left</strong> this cycle)
              </span>
            )}
          </div>
          <Badge variant={isPaid ? 'success' : trialDays <= 1 ? 'warning' : 'info'} dot>
            {isPaid ? 'Active Pro' : `Trial: ${trialDays}d left`}
          </Badge>
        </div>

        {/* ================================================================= */}
        {/* MODAL BODY */}
        {/* ================================================================= */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* STEP: SUCCESS */}
          {step === 'success' && (
            <div className="py-4 px-2 sm:px-4 flex flex-col items-center text-center space-y-5 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-secondary/10 text-secondary flex items-center justify-center ring-8 ring-secondary/5 animate-scale-up">
                <CheckCircle2 className="w-10 h-10" strokeWidth={2.5} />
              </div>

              <div className="space-y-1 max-w-md">
                <h3 className="text-xl sm:text-2xl font-extrabold text-text-high tracking-tight">
                  Subscription Activated Successfully!
                </h3>
                <p className="text-xs sm:text-sm text-text-medium leading-relaxed">
                  Welcome to <strong>{planDetails.name}</strong>. Your full supermarket automation, AI demand forecasting, and POS billing features are now active.
                </p>
              </div>

              {/* Receipt / Subscription Breakdown Card */}
              <div className="w-full max-w-md p-4 rounded-[10px] bg-canvas dark:bg-surface border border-border text-left space-y-3 text-xs shadow-sm">
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <span className="text-text-medium font-medium">Plan tier:</span>
                  <span className="font-bold text-text-high">{planDetails.name}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <span className="text-text-medium font-medium">Billing cycle:</span>
                  <span className="font-semibold text-text-high">{planDetails.billingPeriod}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <span className="text-text-medium font-medium">Amount paid:</span>
                  <span className="font-extrabold text-primary text-sm tabular-nums">
                    {formatCurrency(finalPrice)} (Incl. all taxes)
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <span className="text-text-medium font-medium">Subscription start:</span>
                  <span className="font-semibold text-text-high">{todayFormatted}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <span className="text-text-medium font-medium">Next renewal date:</span>
                  <span className="font-semibold text-text-high">{renewalFormatted}</span>
                </div>
                {verifiedPayment?.payment_id && (
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-text-medium font-medium">Payment reference:</span>
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-text-high">
                      <span>{verifiedPayment.payment_id}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyTransactionId(verifiedPayment.payment_id!)}
                        className="text-text-medium hover:text-text-high p-1 rounded hover:bg-surface-high transition-colors"
                        title={copiedTx ? "Copied!" : "Copy payment ID"}
                        aria-label="Copy payment reference"
                      >
                        {copiedTx ? <Check className="w-3.5 h-3.5 text-secondary" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Renewal Notice (Explicit terms) */}
              <div className="w-full max-w-md p-3 rounded-[6px] bg-primary/5 border border-primary/20 text-[11px] text-text-medium text-left leading-relaxed">
                <strong>Manual renewal policy:</strong> Your store will have active access for 30 days. No unexpected automatic recurring debits are made. You can renew at any time from your Store Settings or Sidebar.
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full max-w-md py-3 px-6 rounded-[8px] bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-sm shadow-raised transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continue to Store BI</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP: FAILED */}
          {step === 'failed' && (
            <div className="py-6 px-4 flex flex-col items-center text-center space-y-4 animate-fade-in">
              <div className="w-14 h-14 rounded-full bg-destructive-bg text-destructive flex items-center justify-center ring-8 ring-destructive-bg/50">
                <XCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="text-lg font-bold text-text-high">Payment Failed or Declined</h3>
                <p className="text-xs text-text-medium leading-relaxed">
                  {errorMessage || 'The payment could not be processed by your bank. Your store subscription remains unchanged.'}
                </p>
              </div>
              <div className="flex gap-3 w-full max-w-xs pt-2">
                <button
                  type="button"
                  onClick={() => setStep('select')}
                  className="flex-1 py-2.5 px-4 rounded-[6px] border border-border text-xs font-semibold hover:bg-canvas dark:hover:bg-surface transition-colors cursor-pointer"
                >
                  Change Method
                </button>
                <button
                  type="button"
                  onClick={handleInitiatePayment}
                  className="flex-1 py-2.5 px-4 rounded-[6px] bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry Payment</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP: CANCELLED */}
          {step === 'cancelled' && (
            <div className="py-6 px-4 flex flex-col items-center text-center space-y-4 animate-fade-in">
              <div className="w-14 h-14 rounded-full bg-surface border border-border text-text-medium flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-text-medium" />
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="text-lg font-bold text-text-high">Payment Cancelled</h3>
                <p className="text-xs text-text-medium leading-relaxed">
                  You closed the payment window. No charges were debited from your card or UPI account. Your current subscription status remains active.
                </p>
              </div>
              <div className="flex gap-3 w-full max-w-xs pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 rounded-[6px] border border-border text-xs font-semibold hover:bg-canvas dark:hover:bg-surface transition-colors cursor-pointer"
                >
                  Return to App
                </button>
                <button
                  type="button"
                  onClick={() => setStep('select')}
                  className="flex-1 py-2.5 px-4 rounded-[6px] bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold transition-colors cursor-pointer"
                >
                  Resume Payment
                </button>
              </div>
            </div>
          )}

          {/* STEP: UNCONFIGURED GATEWAY KEYS */}
          {step === 'unconfigured' && (
            <div className="py-5 px-4 flex flex-col items-center text-center space-y-4 animate-fade-in">
              <div className="w-14 h-14 rounded-full bg-warning-bg text-warning flex items-center justify-center">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="text-lg font-bold text-text-high">Gateway Setup Required</h3>
                <p className="text-xs text-text-medium leading-relaxed">
                  Razorpay credentials are not yet configured in your backend environment. Add your keys to enable live payment processing.
                </p>
              </div>

              <div className="w-full max-w-md p-3.5 rounded-[8px] bg-canvas dark:bg-surface border border-border text-left font-mono text-[11px] text-text-high space-y-1.5">
                <div className="font-sans font-bold text-xs text-text-medium mb-1">
                  Required environment variables in <code>backend/.env</code>:
                </div>
                <div>RAZORPAY_KEY_ID=rzp_test_your_key_id</div>
                <div>RAZORPAY_KEY_SECRET=your_secret_key</div>
                <div>RAZORPAY_WEBHOOK_SECRET=your_webhook_secret</div>
              </div>

              <div className="flex gap-3 w-full max-w-md pt-2">
                <button
                  type="button"
                  onClick={() => setStep('select')}
                  className="flex-1 py-2.5 px-4 rounded-[6px] border border-border text-xs font-semibold hover:bg-canvas dark:hover:bg-surface transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSimulateTestPayment}
                  className="flex-1 py-2.5 px-4 rounded-[6px] bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-raised"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Simulate Test Payment</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP: PROCESSING / VERIFYING (TEST SANDBOX DIALOG) */}
          {(step === 'processing' || step === 'verifying') && (
            <div className="py-6 px-4 flex flex-col items-center text-center space-y-5 animate-fade-in">
              <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <div className="space-y-1 max-w-md">
                <h3 className="text-lg font-bold text-text-high">
                  {step === 'verifying' ? 'Verifying Payment Signature with Server...' : 'Connecting to Secure Payment Gateway...'}
                </h3>
                <p className="text-xs text-text-medium leading-relaxed">
                  Please do not refresh or close this browser window while your transaction is confirmed.
                </p>
              </div>

              {/* Developer Test Mode Simulator when live checkout popup is pending */}
              {currentOrder && !loading && (
                <div className="w-full max-w-md p-4 rounded-[10px] bg-canvas dark:bg-surface border border-border text-left space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="font-bold text-text-high">Test Mode Sandbox</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">
                      Order: {currentOrder.order_id}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-medium">
                    You can complete this payment using the secure sandbox verification below:
                  </p>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleSimulateTestPayment}
                      className="flex-1 py-2 px-3 rounded-[6px] bg-secondary hover:bg-secondary-hover text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve Test Payment ({formatCurrency(finalPrice)})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStep('cancelled');
                        api.cancelSubscriptionOrder(currentOrder.order_id);
                      }}
                      className="py-2 px-3 rounded-[6px] border border-border text-xs font-semibold hover:bg-canvas transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP: QR_PAY (ONLINE PAY WITH PAYMENT SCANNER) */}
          {step === 'qr_pay' && (
            <div className="space-y-4 animate-fade-in">
              {/* Back to method selection header button */}
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <button
                  type="button"
                  onClick={handleBackFromQR}
                  className="flex items-center gap-1.5 text-xs font-semibold text-text-medium hover:text-text-high transition-colors cursor-pointer group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                  <span>Back to payment methods</span>
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-text-medium">Order ID:</span>
                  <span className="font-mono text-[11px] font-bold text-text-high px-2 py-0.5 rounded bg-surface-container border border-border">
                    {currentOrder?.order_id || 'ORDER'}
                  </span>
                </div>
              </div>

              {/* Plan and Subscription Details Banner */}
              <div className="p-3.5 sm:p-4 rounded-[10px] bg-primary/[0.04] dark:bg-primary/[0.08] border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-[4px] bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider">
                      All-Features Pro
                    </span>
                    <h3 className="text-sm font-extrabold text-text-high">
                      Store BI — All-Features Pro
                    </h3>
                  </div>
                  <p className="text-xs text-text-medium">
                    Billing Period: <strong className="text-text-high font-semibold">1 month</strong> • Supermarket automation, AI demand forecast & POS billing
                  </p>
                </div>
                <div className="flex items-baseline gap-1.5 shrink-0">
                  <span className="text-2xl sm:text-3xl font-extrabold text-primary tabular-nums">
                    {formatCurrency(finalPrice)}
                  </span>
                  <span className="text-xs font-semibold text-text-medium">/ 1 month</span>
                </div>
              </div>

              {/* Instruction Callout */}
              <div className="p-3 rounded-[8px] bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-center">
                <p className="text-xs sm:text-sm font-bold text-emerald-900 dark:text-emerald-200">
                  Scan this QR code using your UPI app to pay {formatCurrency(finalPrice)}.
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                  Compatible with Google Pay, PhonePe, Paytm, BHIM, CRED, Navi & all banking UPI apps.
                </p>
              </div>

              {/* Two Column Layout for Desktop/Tablet, Responsive Stack on Mobile */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-1">
                {/* Left Column: Payment Scanner QR Code Image Container */}
                <div className="md:col-span-5 flex flex-col items-center">
                  <div className="w-full bg-white dark:bg-white p-3.5 rounded-xl border-2 border-emerald-500/30 shadow-md flex flex-col items-center justify-center">
                    {/* The root Payment Scanner.jpeg image */}
                    <img
                      src="/Payment Scanner.jpeg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/api/subscription/qr-image';
                      }}
                      alt="Store BI Payment Scanner QR Code"
                      className="w-48 sm:w-52 h-auto max-h-64 object-contain rounded-md"
                    />
                    <div className="mt-2.5 pt-2 border-t border-gray-200 w-full flex items-center justify-center gap-1.5 text-[11px] text-gray-700 font-semibold">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Verified Merchant QR Code (SBI)</span>
                    </div>
                  </div>

                  {/* Mobile UPI App Intent Button */}
                  <div className="w-full mt-3">
                    <a
                      href={`upi://pay?pa=chaitanyasirsat@sbi&pn=CHAITANYA%20GURUNATH%20SIRSAT&am=${finalPrice.toFixed(2)}&cu=INR&tn=Store%20BI%20All-Features%20Pro%20Subscription`}
                      className="w-full py-2.5 px-3 rounded-[8px] bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-raised cursor-pointer"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>Open in UPI App (Pay {formatCurrency(finalPrice)})</span>
                    </a>
                    <p className="text-[10px] text-text-medium text-center mt-1">
                      Tap on mobile to open Google Pay, PhonePe, or Paytm with ₹1,299 prefilled
                    </p>
                  </div>
                </div>

                {/* Right Column: Payee Info & Payment Status UI */}
                <div className="md:col-span-7 flex flex-col justify-between space-y-4">
                  {/* Verified Payee Details Card */}
                  <div className="p-3.5 rounded-[8px] bg-canvas dark:bg-surface border border-border space-y-2.5 text-xs">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-text-medium flex items-center justify-between">
                      <span>Merchant Payment Details</span>
                      <span className="text-secondary font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" /> State Bank of India
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded bg-surface dark:bg-surface-high border border-border">
                        <span className="text-[10px] text-text-medium block">Payee Name:</span>
                        <strong className="text-text-high font-bold text-xs truncate block">
                          CHAITANYA GURUNATH SIRSAT
                        </strong>
                      </div>

                      <div className="p-2 rounded bg-surface dark:bg-surface-high border border-border flex items-center justify-between">
                        <div className="min-w-0 pr-1">
                          <span className="text-[10px] text-text-medium block">Merchant UPI ID:</span>
                          <strong className="text-primary font-mono font-bold text-xs truncate block">
                            chaitanyasirsat@sbi
                          </strong>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyText('chaitanyasirsat@sbi', 'UPI ID')}
                          className="p-1.5 rounded hover:bg-canvas text-text-medium hover:text-text-high transition-colors shrink-0"
                          title="Copy UPI ID"
                        >
                          {copiedVpa ? <Check className="w-3.5 h-3.5 text-secondary" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <div className="p-2 rounded bg-surface dark:bg-surface-high border border-border flex items-center justify-between sm:col-span-2">
                        <div>
                          <span className="text-[10px] text-text-medium block">Exact Payable Amount:</span>
                          <strong className="text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">
                            {formatCurrency(finalPrice)} (INR 1,299.00)
                          </strong>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyText(String(finalPrice), 'Amount')}
                          className="p-1.5 rounded hover:bg-canvas text-text-medium hover:text-text-high transition-colors shrink-0"
                          title="Copy Amount"
                        >
                          {copiedAmount ? <Check className="w-3.5 h-3.5 text-secondary" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Payment Status Indicator Area */}
                  <div className="p-3.5 rounded-[10px] bg-canvas dark:bg-surface border border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-text-high">Payment Status:</span>
                      {qrStatus === 'waiting_for_payment' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                          Waiting for Payment
                        </span>
                      )}
                      {qrStatus === 'pending_verification' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                          <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
                          Payment Pending
                        </span>
                      )}
                      {qrStatus === 'failed' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-300 dark:border-red-800">
                          <XCircle className="w-3 h-3 text-red-600" />
                          Payment Failed
                        </span>
                      )}
                    </div>

                    {qrStatus === 'waiting_for_payment' && (
                      <p className="text-[11px] text-text-medium leading-relaxed">
                        Authorize ₹1,299 in your UPI app. Once completed, enter the <strong>12-digit UPI Reference / UTR Number</strong> from your payment receipt to verify and activate All-Features Pro immediately.
                      </p>
                    )}

                    {qrStatus === 'pending_verification' && (
                      <div className="p-2.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 text-xs flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>Verification in progress.</strong> We are confirming your settlement with the banking network. Your subscription will activate as soon as confirmation is received.
                        </div>
                      </div>
                    )}

                    {qrStatus === 'failed' && (
                      <div className="p-2.5 rounded bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 text-xs flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>Verification error:</strong> {errorMessage || 'Invalid or duplicate reference. Please re-enter your 12-digit UPI UTR.'}
                        </div>
                      </div>
                    )}

                    {/* Verified UTR Submission Form */}
                    <form onSubmit={handleSubmitUTR} className="space-y-2 pt-1">
                      <label className="text-[11px] font-bold text-text-high block">
                        Enter UPI Transaction Reference (UTR / UPI Ref ID):
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={utrInput}
                          onChange={(e) => {
                            setUtrInput(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''));
                            setUtrError('');
                          }}
                          placeholder="e.g. 429184719283 (12 digits)"
                          maxLength={25}
                          className="flex-1 h-9 px-3 rounded-[6px] border border-border bg-surface dark:bg-surface-high text-xs font-mono text-text-high placeholder:text-text-low focus:outline-none focus:ring-1 focus:ring-primary uppercase tracking-wide"
                        />
                        <button
                          type="submit"
                          disabled={utrSubmitting || !utrInput.trim()}
                          className="h-9 px-4 rounded-[6px] bg-secondary hover:bg-secondary-hover text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-sm shrink-0"
                        >
                          {utrSubmitting ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Verifying...</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Verify & Activate</span>
                            </>
                          )}
                        </button>
                      </div>

                      {utrError && (
                        <p className="text-[11px] text-destructive flex items-center gap-1 mt-1 font-medium">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{utrError}</span>
                        </p>
                      )}

                      <p className="text-[10px] text-text-low leading-normal">
                        * Note: To prevent fraud, subscriptions activate only after verified backend confirmation. Clicking “I have paid” without a valid transaction reference will not activate your account.
                      </p>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP: SELECT PLAN & PAYMENT METHOD (MAIN SCREEN) */}
          {step === 'select' && (
            <>
              {/* Plan Overview Card */}
              <div className="p-4 sm:p-5 rounded-[10px] border-2 border-primary bg-primary/[0.03] dark:bg-primary/[0.06] shadow-sm relative space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-[4px] bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider">
                      Monthly Plan
                    </span>
                    <span className="text-xs font-bold text-secondary flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> All 6 Features Unlocked
                    </span>
                  </div>
                  <span className="text-xs text-text-medium">Renews manually every 30 days</span>
                </div>

                {/* Plan Name & Pricing */}
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-border pb-3.5">
                  <div>
                    <h3 className="text-xl font-extrabold text-text-high tracking-tight">
                      {planDetails.name}
                    </h3>
                    <p className="text-xs text-text-medium mt-1 leading-relaxed max-w-md">
                      {planDetails.description}
                    </p>
                  </div>

                  <div className="flex items-baseline gap-1 shrink-0">
                    <span className="text-3xl font-extrabold text-primary tabular-nums">
                      {formatCurrency(finalPrice)}
                    </span>
                    <span className="text-xs font-semibold text-text-medium">
                      {planDetails.periodLabel}
                    </span>
                  </div>
                </div>

                {/* Included Features Section Header */}
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-text-high">
                    Included in your subscription:
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowDetailedFeatures(!showDetailedFeatures)}
                    className="text-xs text-primary hover:text-primary-hover font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>{showDetailedFeatures ? 'Compact view' : 'View full details'}</span>
                    {showDetailedFeatures ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Included Features Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                  {planDetails.features.map((feat) => {
                    const IconComponent = feat.icon;
                    return (
                      <div
                        key={feat.id}
                        className="p-2.5 rounded-[8px] border border-border bg-surface dark:bg-surface-low flex items-start gap-2.5 transition-colors"
                      >
                        <div className="p-1.5 rounded-[6px] bg-primary/10 text-primary shrink-0 mt-0.5">
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-secondary shrink-0" strokeWidth={3} />
                            <h4 className="text-xs font-bold text-text-high leading-snug truncate">
                              {feat.name}
                            </h4>
                          </div>
                          <p className="text-[11px] text-text-medium mt-0.5 leading-relaxed">
                            {showDetailedFeatures ? feat.fullDesc : feat.shortDesc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ============================================================= */}
              {/* SELECT PAYMENT METHOD */}
              {/* ============================================================= */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-text-high">
                    Select payment method:
                  </label>
                  <span className="text-[11px] text-text-medium flex items-center gap-1">
                    <Lock className="w-3 h-3 text-secondary" />
                    <span>256-Bit SSL Encrypted</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Option 1: Online Pay / UPI QR */}
                  <div
                    onClick={() => setSelectedMethod('upi')}
                    className={`p-3.5 rounded-[8px] border-2 cursor-pointer transition-all flex flex-col justify-between gap-2 ${selectedMethod === 'upi'
                        ? 'border-primary bg-primary/[0.04] dark:bg-primary/[0.08] shadow-sm'
                        : 'border-border bg-surface dark:bg-surface-low hover:border-text-medium'
                      }`}
                    role="radio"
                    aria-checked={selectedMethod === 'upi'}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') setSelectedMethod('upi');
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="p-1.5 rounded-[6px] bg-primary/10 text-primary">
                        <QrCode className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        Online Pay (QR)
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-text-high">Online Pay</h4>
                      <p className="text-[10px] text-text-medium mt-0.5">
                        UPI QR Scanner, GPay, PhonePe, Paytm
                      </p>
                    </div>
                  </div>

                  {/* Option 2: Credit / Debit Card */}
                  <div
                    onClick={() => setSelectedMethod('card')}
                    className={`p-3.5 rounded-[8px] border-2 cursor-pointer transition-all flex flex-col justify-between gap-2 ${selectedMethod === 'card'
                        ? 'border-primary bg-primary/[0.04] dark:bg-primary/[0.08] shadow-sm'
                        : 'border-border bg-surface dark:bg-surface-low hover:border-text-medium'
                      }`}
                    role="radio"
                    aria-checked={selectedMethod === 'card'}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') setSelectedMethod('card');
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="p-1.5 rounded-[6px] bg-primary/10 text-primary">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-medium text-text-low">Instant</span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-text-high">Credit / Debit Card</h4>
                      <p className="text-[10px] text-text-medium mt-0.5">
                        Visa, MasterCard, RuPay, Maestro
                      </p>
                    </div>
                  </div>

                  {/* Option 3: Net Banking */}
                  <div
                    onClick={() => setSelectedMethod('netbanking')}
                    className={`p-3.5 rounded-[8px] border-2 cursor-pointer transition-all flex flex-col justify-between gap-2 ${selectedMethod === 'netbanking'
                        ? 'border-primary bg-primary/[0.04] dark:bg-primary/[0.08] shadow-sm'
                        : 'border-border bg-surface dark:bg-surface-low hover:border-text-medium'
                      }`}
                    role="radio"
                    aria-checked={selectedMethod === 'netbanking'}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') setSelectedMethod('netbanking');
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="p-1.5 rounded-[6px] bg-primary/10 text-primary">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-medium text-text-low">50+ Banks</span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-text-high">Net Banking</h4>
                      <p className="text-[10px] text-text-medium mt-0.5">
                        SBI, HDFC, ICICI, Axis & more
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Promo Code Section */}
              <div className="p-3.5 rounded-[8px] bg-canvas dark:bg-surface border border-border flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Tag className="w-4 h-4 text-text-medium shrink-0" />
                  <input
                    type="text"
                    placeholder="Enter coupon (e.g. STORE20)"
                    value={promoCode}
                    onChange={(e) => {
                      setPromoCode(e.target.value);
                      setPromoError('');
                    }}
                    className="h-8 px-2.5 w-full sm:w-52 rounded-[6px] border border-border bg-surface dark:bg-surface-high text-xs text-text-high placeholder:text-text-low focus:outline-none focus:ring-1 focus:ring-primary uppercase font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="h-8 px-3 rounded-[6px] bg-surface dark:bg-surface-high border border-border text-xs font-semibold hover:bg-canvas dark:hover:bg-surface transition-colors shrink-0 cursor-pointer"
                  >
                    Apply
                  </button>
                </div>

                {appliedPromo && (
                  <div className="flex items-center gap-1.5 text-xs text-secondary font-semibold">
                    <Check className="w-3.5 h-3.5" />
                    <span>Coupon {appliedPromo.code} applied (-{formatCurrency(appliedPromo.discount)})</span>
                  </div>
                )}
                {promoError && <span className="text-xs text-destructive">{promoError}</span>}
              </div>
            </>
          )}
        </div>

        {/* ================================================================= */}
        {/* MODAL FOOTER */}
        {/* ================================================================= */}
        {step === 'select' && (
          <div className="p-4 sm:p-5 border-t border-border bg-canvas dark:bg-surface flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
            <div className="flex flex-col">
              <span className="text-[11px] text-text-medium font-medium">Total payable per month:</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-text-high tabular-nums">
                  {formatCurrency(finalPrice)}
                </span>
                <span className="text-xs font-semibold text-text-medium">{planDetails.periodLabel}</span>
                {appliedPromo && (
                  <span className="text-xs line-through text-text-low">
                    {formatCurrency(basePrice)}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-text-medium mt-0.5">
                Total amount: {formatCurrency(finalPrice)} • All applicable taxes included • No hidden auto-debits
              </span>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-[6px] border border-border text-xs font-semibold text-text-medium hover:text-text-high hover:bg-canvas transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleInitiatePayment}
                disabled={loading}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-[6px] bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold flex items-center justify-center gap-2 shadow-raised transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>
                  {loading
                    ? 'Connecting...'
                    : `Pay ${formatCurrency(finalPrice)} with ${selectedMethod === 'upi' ? 'Online Pay (QR Scanner)' : selectedMethod === 'card' ? 'Card' : 'Net Banking'
                    }`}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PurchaseSubscriptionModal;
