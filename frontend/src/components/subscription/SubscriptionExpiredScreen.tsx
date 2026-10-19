import * as React from 'react';
import {
  ShieldCheck,
  Clock,
  XCircle,
  Lock,
  ArrowRight,
  RefreshCw,
  LogOut,
  BarChart3,
  ScanLine,
  FileText,
  Boxes,
  Headphones,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { CustomerSubscriptionStatus } from '../../api/client';
import { Card } from '../ui/Card';
import { useToast } from '../ui/Toast';
import { PurchaseSubscriptionModal } from './PurchaseSubscriptionModal';
import { formatINR } from '../../utils';

interface SubscriptionExpiredScreenProps {
  subscriptionStatus: CustomerSubscriptionStatus | null;
  onRefreshStatus: () => Promise<void>;
}

export function SubscriptionExpiredScreen({
  subscriptionStatus,
  onRefreshStatus,
}: SubscriptionExpiredScreenProps) {
  const { user, logout } = useAuth();
  const toast = useToast();
  const [purchaseModalOpen, setPurchaseModalOpen] = React.useState(false);
  const [checking, setChecking] = React.useState(false);

  const state = subscriptionStatus?.state || 'Subscription Expired';
  const latestReq = subscriptionStatus?.latest_request;

  const isPendingReview = state === 'Payment Pending Review';
  const isRejected = state === 'Payment Rejected';
  const isTrialExpired = state === 'Trial Expired';

  const handleManualCheck = async () => {
    setChecking(true);
    try {
      await onRefreshStatus();
      toast.info('Subscription status refreshed');
    } catch {
      toast.error('Failed to refresh status');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-text-high flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="h-16 px-6 bg-surface border-b border-border flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <img
            src="/logo/store-bi-logo.jpeg"
            alt="Store BI"
            className="w-8 h-8 rounded-lg object-cover border border-border shadow-xs"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-text-high">
                Store BI
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700">
                Subscription Required
              </span>
            </div>
            <span className="text-[11px] text-text-medium">
              {user?.name || 'My Store'} • {user?.owner_name || 'Merchant'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleManualCheck}
            disabled={checking}
            className="px-3 py-1.5 rounded-lg border border-border bg-canvas hover:bg-surface text-text-high text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
            <span>Check Status</span>
          </button>

          <button
            type="button"
            onClick={() => logout()}
            className="px-2.5 py-1.5 rounded-lg text-text-medium hover:text-rose-600 hover:bg-canvas text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6 justify-center">
        {/* Dynamic Status Banner Card */}
        <Card className="p-6 sm:p-8 border border-border bg-surface shadow-xl rounded-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 relative z-10">
            <div
              className={`p-4 rounded-2xl shrink-0 ${
                isPendingReview
                  ? 'bg-amber-500/10 text-amber-600 border border-amber-300 dark:border-amber-700'
                  : isRejected
                  ? 'bg-rose-500/10 text-rose-600 border border-rose-300 dark:border-rose-700'
                  : 'bg-primary/10 text-primary border border-primary/20'
              }`}
            >
              {isPendingReview ? (
                <Clock className="w-10 h-10 animate-pulse text-amber-500" />
              ) : isRejected ? (
                <XCircle className="w-10 h-10 text-rose-500" />
              ) : (
                <Lock className="w-10 h-10 text-primary" />
              )}
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    isPendingReview
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                      : isRejected
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300'
                      : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200'
                  }`}
                >
                  {state}
                </span>

                {latestReq && (
                  <span className="text-xs font-mono text-text-medium">
                    Ref: {latestReq.request_ref}
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-extrabold text-text-high mt-2">
                {isPendingReview
                  ? 'Payment Under Review by Store BI Admin'
                  : isRejected
                  ? 'Subscription Request Needs Correction'
                  : isTrialExpired
                  ? 'Your 5-Day Free Trial Has Ended'
                  : 'Your All-Features Pro Subscription Has Expired'}
              </h1>

              <p className="text-xs sm:text-sm text-text-medium mt-1 leading-relaxed">
                {isPendingReview
                  ? 'We received your "I Have Paid" submission. Our admin team verifies payments directly against company bank account statements. You will receive active access as soon as approved.'
                  : isRejected
                  ? `Your request was not approved: "${latestReq?.rejection_reason || 'Bank reference could not be verified'}". Please verify your transaction details and re-submit below.`
                  : isTrialExpired
                  ? 'We hope you enjoyed exploring Store BI! To continue accessing all store management tools, analytics, POS billing, and AI OCR, please activate your monthly Pro subscription.'
                  : 'Your 30-day Pro plan has elapsed. Renew today to restore uninterrupted access to your POS billing, real-time inventory, and financial reports.'}
              </p>
            </div>
          </div>

          {/* Pending Request Details Pill */}
          {isPendingReview && latestReq && (
            <div className="mt-6 p-4 rounded-xl bg-amber-500/5 border border-amber-300 dark:border-amber-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <div className="font-semibold text-amber-900 dark:text-amber-200">
                  Request Reference: <span className="font-mono">{latestReq.request_ref}</span>
                </div>
                <div className="text-[11px] text-text-medium">
                  Submitted on {new Date(latestReq.submitted_at).toLocaleString('en-IN')} • Amount: {formatINR(latestReq.amount)}
                  {latestReq.utr_number && ` • UTR: ${latestReq.utr_number}`}
                </div>
              </div>
              <button
                type="button"
                onClick={handleManualCheck}
                disabled={checking}
                className="shrink-0 px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
                <span>Check Status</span>
              </button>
            </div>
          )}

          {/* Action Row */}
          <div className="mt-6 pt-6 border-t border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-text-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Admin approval guarantees bank verification & security</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPurchaseModalOpen(true)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
                <span>
                  {isPendingReview
                    ? 'View Payment Claim'
                    : isRejected
                    ? 'Re-submit Payment (₹1,299)'
                    : 'Subscribe to All-Features Pro (₹1,299)'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </Card>

        {/* DATA PRESERVATION GUARANTEE (MANDATORY REQUIREMENT) */}
        <Card className="p-5 border border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl">
          <div className="flex items-start gap-3.5">
            <div className="p-2 bg-emerald-500 text-white rounded-lg shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
                Data Preservation Guarantee — Your Store Records Are Safe
              </h2>
              <p className="text-xs text-emerald-900/80 dark:text-emerald-300/80 leading-relaxed">
                Your business data is <strong>never deleted, reset, or overwritten</strong> due to an expired trial or subscription. All your uploaded products, sales history, expenses, invoices, and analytics remain securely saved in your account. As soon as your renewal is approved, you will immediately resume with all your existing store data intact.
              </p>
            </div>
          </div>
        </Card>

        {/* Plan Overview Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5 border border-border bg-surface md:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  All-In-One Merchant Plan
                </span>
                <h3 className="text-base font-bold text-text-high">
                  All-Features Pro (30 Days)
                </h3>
              </div>
              <div className="text-right">
                <div className="text-2xl font-extrabold text-text-high">
                  {formatINR(1299)}
                </div>
                <span className="text-[10px] text-text-medium">per month (30 days)</span>
              </div>
            </div>

            <p className="text-xs text-text-medium">
              Everything required to run a high-efficiency retail counter, automate bookkeeping, and predict stockouts.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-xs">
              <div className="flex items-center gap-2 text-text-high">
                <BarChart3 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>AI Revenue & Profit Analytics</span>
              </div>
              <div className="flex items-center gap-2 text-text-high">
                <ScanLine className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Fast POS Billing & Barcode Counter</span>
              </div>
              <div className="flex items-center gap-2 text-text-high">
                <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>AI Multimodal Invoice OCR Scanning</span>
              </div>
              <div className="flex items-center gap-2 text-text-high">
                <Boxes className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Real-Time Inventory & Low-Stock Alerts</span>
              </div>
              <div className="flex items-center gap-2 text-text-high">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Unlimited Sales, Products & Expenses</span>
              </div>
              <div className="flex items-center gap-2 text-text-high">
                <Headphones className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Priority WhatsApp & Email Support</span>
              </div>
            </div>
          </Card>

          {/* Quick Help & Payment Steps Card */}
          <Card className="p-5 border border-border bg-surface flex flex-col justify-between space-y-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-medium">
                How Renewal Works
              </span>
              <ol className="mt-2 space-y-2 text-xs text-text-medium list-decimal list-inside">
                <li>Click <strong>Subscribe (₹1,299)</strong></li>
                <li>Scan the official Store BI UPI QR code</li>
                <li>Enter UTR & click <strong>“I Have Paid”</strong></li>
                <li>Admin verifies bank records & activates 30 days</li>
              </ol>
            </div>

            <div className="pt-3 border-t border-border">
              <span className="text-[11px] text-text-medium block mb-1">
                Need urgent activation or assistance?
              </span>
              <a
                href="mailto:support@storebi.in"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <Headphones className="w-3.5 h-3.5" />
                <span>support@storebi.in</span>
              </a>
            </div>
          </Card>
        </div>
      </main>

      {/* Subscription / QR Purchase Modal */}
      <PurchaseSubscriptionModal
        isOpen={purchaseModalOpen}
        onClose={() => {
          setPurchaseModalOpen(false);
          onRefreshStatus();
        }}
      />
    </div>
  );
}
