import * as React from 'react';
import { AlertTriangle, Clock, Sparkles, X, ArrowRight, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { useToast } from '../ui/Toast';

export function SubscriptionExpiryBanner() {
  const { user } = useAuth();
  const { status: subStatus, openPurchaseModal } = useSubscription();
  const toast = useToast();
  const [isDismissed, setIsDismissed] = React.useState(false);

  // Exclude platform admins
  if (!user || user.is_admin) {
    return null;
  }

  // Derive subscription warning status
  const warning = subStatus?.expiry_warning || user?.expiry_warning;
  const isPaid = subStatus?.state === 'Pro Active' || !!user?.is_paid;
  const daysLeft = subStatus?.days_remaining ?? (isPaid ? user?.subscription_days_left_in_month : user?.trial_days_left) ?? 5;
  const isExpired = subStatus?.state === 'Trial Expired' || subStatus?.state === 'Subscription Expired' || (warning?.is_expired ?? false) || daysLeft <= 0;

  // Warning applies when <= 1 day remaining or expired
  const isWarningActive = warning?.has_notification || daysLeft <= 1 || isExpired;

  // Every time user logs into their page: fire login session toast notification once per session
  React.useEffect(() => {
    if (!isWarningActive || !user) return;

    const sessionKey = `storebi_session_expiry_notified_${user.id}`;
    const alreadyNotified = sessionStorage.getItem(sessionKey);

    if (!alreadyNotified) {
      sessionStorage.setItem(sessionKey, 'true');
      const toastTitle = warning?.title || (isPaid ? 'Monthly Subscription Ending Soon' : 'Free Trial Ending Soon');
      const toastMsg = warning?.message || (daysLeft === 1
        ? 'You have 1 day remaining on your plan. Renew now to ensure uninterrupted access.'
        : 'Your trial or monthly subscription has expired. Please renew your plan.');
      
      toast.warning(toastTitle, toastMsg);
    }
  }, [isWarningActive, user, warning, isPaid, daysLeft, toast]);

  if (!isWarningActive || isDismissed) {
    return null;
  }

  const isUrgentOneDay = daysLeft === 1 && !isExpired;
  const planLabel = isPaid ? 'All-Features Pro Monthly Subscription' : '5-Day Free Trial';

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`relative w-full border-b transition-all duration-200 z-20 ${
        isExpired
          ? 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200'
          : 'bg-amber-500/12 border-amber-500/30 text-amber-950 dark:text-amber-100'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Left icon + notification description */}
        <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
          <div
            className={`p-1.5 rounded-lg shrink-0 ${
              isExpired
                ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 animate-pulse'
                : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 animate-pulse'
            }`}
          >
            {isExpired ? (
              <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : isUrgentOneDay ? (
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-xs sm:text-sm tracking-tight flex items-center gap-1.5">
                {isExpired
                  ? `Subscription Expired: ${planLabel}`
                  : `⚠️ ${isUrgentOneDay ? '1 Day Remaining' : 'About to End'}: ${planLabel}`}
              </span>
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full tracking-wider ${
                  isExpired
                    ? 'bg-rose-500 text-white'
                    : 'bg-amber-500/25 text-amber-800 dark:text-amber-200 border border-amber-500/40'
                }`}
              >
                {isExpired ? 'Action Required' : 'Urgent Reminder'}
              </span>
            </div>

            <p className="text-xs sm:text-[13px] opacity-90 mt-0.5 leading-snug">
              {warning?.message ||
                (isExpired
                  ? 'Your subscription period has ended. Renew for ₹1,299 to continue generating POS bills, managing products, and viewing reports.'
                  : `Your ${planLabel.toLowerCase()} expires tomorrow. Renew today for ₹1,299 to keep your store operating without any billing downtime.`)}
            </p>
          </div>
        </div>

        {/* Action CTA + Dismiss */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => openPurchaseModal('qr_pay')}
            className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
              isExpired
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20'
                : 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Renew Plan (₹1,299)</span>
            <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            title="Dismiss notification for this session"
            className="p-1 rounded-md text-text-medium hover:text-text-high hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
export default SubscriptionExpiryBanner;
