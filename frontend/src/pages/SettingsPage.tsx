import * as React from 'react';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import { api } from '../api/client';
import type { Shop } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { cn } from '../components/ui/utils';
import { Sparkles, Clock, ShieldCheck, Zap, AlertCircle, XCircle, RefreshCw, QrCode } from 'lucide-react';
import { useSubscription } from '../context/SubscriptionContext';

export function SettingsPage() {
  const toast = useToast();
  const { user, refreshUser } = useAuth();
  const { status: subStatus, refreshStatus: refreshSubStatus, openPurchaseModal } = useSubscription();
  const [shop, setShop] = React.useState<Shop | null>(user);
  const [checkingSub, setCheckingSub] = React.useState(false);

  const state = subStatus?.state || (user?.is_paid ? 'Pro Active' : 'Trial Active');
  const isPaid = state === 'Pro Active';
  const isPendingReview = state === 'Payment Pending Review';
  const isRejected = state === 'Payment Rejected';
  const isExpired = state === 'Trial Expired' || state === 'Subscription Expired';
  const trialDays = subStatus?.trial_days_left ?? user?.trial_days_left ?? 5;
  const subDaysLeft = subStatus?.days_remaining ?? user?.subscription_days_left_in_month ?? 30;
  const planName = subStatus?.plan_name || user?.plan_name || 'All-Features Pro';

  const trialEndDateStr = (subStatus?.trial_end_date || user?.trial_end_date)
    ? new Date(subStatus?.trial_end_date || user?.trial_end_date!).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  const subEndDateStr = (subStatus?.subscription_end_date || user?.subscription_end_date)
    ? new Date(subStatus?.subscription_end_date || user?.subscription_end_date!).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  const [form, setForm] = React.useState({
    name: user?.name || '',
    owner_name: user?.owner_name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    category: user?.category || 'Grocery & kirana',
    city: user?.city || '',
    state: user?.state || '',
    pincode: user?.pincode || '',
    gstin: user?.gstin || '',
    language: user?.language || 'en',
  });

  React.useEffect(() => {
    if (user) {
      setShop(user);
      setForm({
        name: user.name || '',
        owner_name: user.owner_name || '',
        phone: user.phone || '',
        email: user.email || '',
        category: user.category || 'Grocery & kirana',
        city: user.city || '',
        state: user.state || '',
        pincode: user.pincode || '',
        gstin: user.gstin || '',
        language: user.language || 'en',
      });
    } else {
      api.getMe().then((me) => {
        if (me) {
          setShop(me);
          setForm({
            name: me.name || '',
            owner_name: me.owner_name || '',
            phone: me.phone || '',
            email: me.email || '',
            category: me.category || 'Grocery & kirana',
            city: me.city || '',
            state: me.state || '',
            pincode: me.pincode || '',
            gstin: me.gstin || '',
            language: me.language || 'en',
          });
        }
      }).catch(() => {
        // Unauthenticated or guest mode
      });
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const activeShopId = user?.id || shop?.id;
      if (activeShopId) {
        const updated = await api.updateShop(activeShopId, form);
        setShop(updated);
        await refreshUser();
      } else {
        const created = await api.createShop(form);
        setShop(created);
        await refreshUser();
      }
      toast.success('Shop details saved successfully');
    } catch {
      toast.error('Failed to update shop details');
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-text-high">Shop settings</h1>
        <p className="text-sm text-text-medium mt-0.5">
          Configure your retail store profile, subscription license, GSTIN, and business location.
        </p>
      </div>

      {/* Subscription & License Card */}
      <Card>
        <CardHeader
          title="Subscription & Store License"
          subtitle={
            isPaid
              ? "Your active Store BI license and monthly billing cycle status"
              : isPendingReview
              ? "Your subscription payment is being verified by admin"
              : isExpired
              ? "Your store license has expired. Renew to resume operations"
              : "Current plan tier, trial validity, and license upgrade options"
          }
        />
        <CardContent>
          <div className="flex flex-col gap-5">
            <div className="p-4 sm:p-5 rounded-[10px] bg-canvas dark:bg-surface border border-border flex flex-col gap-4">
              {/* Header status bar */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`p-1 rounded-[4px] ${
                      isPendingReview
                        ? 'bg-amber-500/10 text-amber-600'
                        : isRejected
                        ? 'bg-rose-500/10 text-rose-600'
                        : isPaid
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : isExpired
                        ? 'bg-rose-500/10 text-rose-600'
                        : 'bg-primary/10 text-primary'
                    }`}
                  >
                    {isPendingReview ? (
                      <Clock className="w-4 h-4 animate-pulse" />
                    ) : isRejected ? (
                      <XCircle className="w-4 h-4" />
                    ) : isPaid ? (
                      <ShieldCheck className="w-4 h-4" />
                    ) : isExpired ? (
                      <AlertCircle className="w-4 h-4" />
                    ) : (
                      <Clock className="w-4 h-4" />
                    )}
                  </span>
                  <span className="text-xs font-bold text-text-medium uppercase tracking-wider">
                    {state}
                  </span>
                </div>

                <Badge
                  variant={
                    isPendingReview
                      ? 'warning'
                      : isRejected || isExpired
                      ? 'destructive'
                      : isPaid
                      ? 'success'
                      : trialDays <= 1
                      ? 'warning'
                      : 'info'
                  }
                  dot
                >
                  {state}
                </Badge>
              </div>

              {/* State-specific Body */}
              {isPendingReview ? (
                <div className="space-y-2">
                  <h3 className="text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                    Payment Under Review by Store BI Admin
                  </h3>
                  <p className="text-xs sm:text-sm text-text-medium leading-relaxed">
                    We received your payment claim (Ref: <span className="font-mono font-bold text-text-high">{subStatus?.latest_request?.request_ref}</span>). Our admin team verifies all QR payments directly against merchant bank account records. Access will be activated as soon as it is verified.
                  </p>
                  {subStatus?.latest_request?.utr_number && (
                    <div className="text-xs text-text-medium">
                      Submitted UTR: <span className="font-mono font-semibold text-text-high">{subStatus.latest_request.utr_number}</span>
                    </div>
                  )}
                </div>
              ) : isRejected ? (
                <div className="space-y-2">
                  <h3 className="text-xl sm:text-2xl font-extrabold text-rose-600 dark:text-rose-400">
                    Payment Request Declined
                  </h3>
                  <p className="text-xs sm:text-sm text-text-medium leading-relaxed">
                    Your previous payment submission was not approved: <strong>"{subStatus?.latest_request?.rejection_reason || 'Transaction could not be verified'}"</strong>. Your store data remains completely safe. Please re-submit your payment with the correct reference.
                  </p>
                </div>
              ) : isExpired ? (
                <div className="space-y-2">
                  <h3 className="text-xl sm:text-2xl font-extrabold text-rose-600 dark:text-rose-400">
                    {state === 'Trial Expired' ? '5-Day Free Trial Ended' : 'Subscription Expired'}
                  </h3>
                  <p className="text-xs sm:text-sm text-text-medium leading-relaxed">
                    Your store license has expired. Renew your All-Features Pro plan for ₹1,299 (30 days) to regain instant access to billing, inventory, and AI forecasting.
                  </p>
                </div>
              ) : isPaid ? (
                <div className="space-y-1">
                  <h3 className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {subDaysLeft} days left out of 30 days
                  </h3>
                  <p className="text-xs sm:text-sm text-text-medium leading-relaxed">
                    {subEndDateStr
                      ? `Your store is actively covered on the ${planName} tier until ${subEndDateStr}. Enjoy continuous retail automation.`
                      : `Your store is actively covered on the ${planName} tier.`}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <h3 className="text-xl sm:text-2xl font-extrabold text-text-high">
                    {trialDays} {trialDays === 1 ? 'day' : 'days'} left in your free trial
                  </h3>
                  <p className="text-xs sm:text-sm text-text-medium leading-relaxed">
                    {trialEndDateStr
                      ? `Your trial gives you unlimited access to billing, inventory management, OCR bill scanning, and AI analytics until ${trialEndDateStr}. Upgrade now to ensure uninterrupted access.`
                      : 'Your trial gives you unlimited access to billing, inventory management, OCR bill scanning, and AI analytics.'}
                  </p>
                </div>
              )}

              {/* Progress bar for active states */}
              {(isPaid || (!isExpired && !isPendingReview && !isRejected)) && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs text-text-medium font-medium">
                    <span>{isPaid ? 'Monthly billing cycle' : 'Trial progress'}</span>
                    <span className="text-text-high font-semibold">
                      {isPaid
                        ? `${subDaysLeft} / 30 days remaining`
                        : `${trialDays} of 5 days remaining`}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-border overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        isPaid ? "bg-emerald-500" : trialDays <= 1 ? "bg-warning" : "bg-primary"
                      )}
                      style={{
                        width: `${Math.max(
                          10,
                          Math.min(100, isPaid ? (subDaysLeft / 30) * 100 : (trialDays / 5) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-border">
                <div className="flex items-center gap-2 text-xs text-text-medium">
                  <Sparkles className="w-4 h-4 text-primary shrink-0" />
                  <span>₹1,299 / 30 days — Unlimited OCR, POS billing, AI forecasts</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {isPendingReview && (
                    <button
                      type="button"
                      onClick={async () => {
                        setCheckingSub(true);
                        try {
                          await refreshSubStatus();
                          toast.info('Subscription status refreshed');
                        } finally {
                          setCheckingSub(false);
                        }
                      }}
                      disabled={checkingSub}
                      className="px-3 py-2 rounded-lg border border-border bg-canvas hover:bg-surface text-text-high text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${checkingSub ? 'animate-spin' : ''}`} />
                      <span>Check Status</span>
                    </button>
                  )}

                  {/* Direct Online Pay via Payment Scanner QR */}
                  <button
                    type="button"
                    onClick={() => openPurchaseModal('qr_pay')}
                    className="px-4 py-2 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 bg-secondary hover:bg-secondary-hover text-white shadow-sm transition-colors cursor-pointer"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Pay ₹1,299 via QR Scanner</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openPurchaseModal('select')}
                    className="px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border border-border bg-canvas hover:bg-surface text-text-high transition-colors cursor-pointer"
                  >
                    <Zap className="w-4 h-4 text-primary" />
                    <span>
                      {isPendingReview
                        ? 'View Payment Submission'
                        : isRejected
                        ? 'Re-submit Payment (₹1,299)'
                        : isPaid
                        ? 'Renew / Extend (₹1,299)'
                        : 'All Payment Options'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Permanent Data Preservation Guarantee Banner */}
            <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-lg flex items-start gap-2.5 text-xs text-emerald-900 dark:text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Data Preservation Guarantee:</strong> Expiration or pending approval never deletes, wipes, or resets your store records. All your products, sales history, expenses, invoices, and analytics remain permanently saved.
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title="Business profile"
          subtitle="Details displayed on receipts and ledger exports"
        />
        <CardContent>
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Store name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <Input
                label="Owner name"
                value={form.owner_name}
                onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Phone number"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="10-digit number"
              />
              <Input
                label="Email address"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="owner@store.in"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
              <Input
                label="City"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
              <Input
                label="Pincode"
                value={form.pincode}
                onChange={(e) => setForm({ ...form, pincode: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="GSTIN (optional)"
                value={form.gstin}
                onChange={(e) => setForm({ ...form, gstin: e.target.value })}
                placeholder="27AAAAA0000A1Z5"
              />
              <Input
                label="Language"
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
              />
            </div>
            <div className="pt-2 flex justify-end">
              <Button type="submit" variant="primary">
                Save settings
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
