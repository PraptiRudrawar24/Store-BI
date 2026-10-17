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
import { PurchaseSubscriptionModal } from '../components/subscription/PurchaseSubscriptionModal';
import { Sparkles, Clock, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';

export function SettingsPage() {
  const toast = useToast();
  const { user, refreshUser } = useAuth();
  const [shop, setShop] = React.useState<Shop | null>(user);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = React.useState(false);

  const isPaid = !!user?.is_paid;
  const trialDays = user?.trial_days_left ?? 5;
  const subDaysLeft = user?.subscription_days_left_in_month ?? 18;
  const totalMonthDays = user?.subscription_total_days_in_month ?? 30;
  const planName = user?.plan_name || 'All-Features Pro';

  const trialEndDateStr = user?.trial_end_date
    ? new Date(user.trial_end_date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  const subEndDateStr = user?.subscription_end_date
    ? new Date(user.subscription_end_date).toLocaleDateString('en-IN', {
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
              : "Current plan tier, trial validity, and license upgrade options"
          }
        />
        <CardContent>
          {!isPaid ? (
            <div className="flex flex-col gap-5">
              <div className="p-4 sm:p-5 rounded-[10px] bg-canvas dark:bg-surface border border-border flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-[4px] bg-primary/10 text-primary">
                      <Clock className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-bold text-text-medium uppercase tracking-wider">
                      Account Status
                    </span>
                  </div>
                  <Badge variant={trialDays <= 1 ? 'warning' : 'info'} dot>
                    Free Trial (Full Access)
                  </Badge>
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl sm:text-2xl font-extrabold text-text-high">
                    {trialDays} {trialDays === 1 ? 'day' : 'days'} left in your free trial
                  </h3>
                  <p className="text-xs sm:text-sm text-text-medium leading-relaxed">
                    {trialEndDateStr
                      ? `Your trial gives you unlimited access to billing, inventory management, OCR distributor bill scanning, and AI analytics until ${trialEndDateStr}. Upgrade now to ensure uninterrupted access.`
                      : 'Your trial gives you unlimited access to billing, inventory management, OCR distributor bill scanning, and AI analytics. Upgrade now to ensure uninterrupted access.'}
                  </p>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs text-text-medium font-medium">
                    <span>Trial progress</span>
                    <span className="text-text-high font-semibold">{trialDays} of 5 days remaining</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-border overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        trialDays <= 1 ? "bg-warning" : "bg-primary"
                      )}
                      style={{ width: `${Math.max(10, Math.min(100, (trialDays / 5) * 100))}%` }}
                    />
                  </div>
                </div>

                {/* Option for purchasing subscription */}
                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-border">
                  <div className="flex items-center gap-2 text-xs text-text-medium">
                    <Sparkles className="w-4 h-4 text-primary shrink-0" />
                    <span>Includes unlimited OCR imports, AI stock forecasts & POS billing</span>
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => setIsPurchaseModalOpen(true)}
                    className="flex items-center justify-center gap-2 font-bold shadow-raised"
                  >
                    <Zap className="w-4 h-4" />
                    <span>Purchase subscription</span>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="p-4 sm:p-5 rounded-[10px] bg-canvas dark:bg-surface border border-border flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-[4px] bg-secondary/10 text-secondary">
                      <ShieldCheck className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-bold text-text-medium uppercase tracking-wider">
                      License Tier: {planName}
                    </span>
                  </div>
                  <Badge variant="success" dot>
                    Active Subscription
                  </Badge>
                </div>

                {/* How many days left out of month */}
                <div className="space-y-1">
                  <h3 className="text-xl sm:text-2xl font-extrabold text-secondary tabular-nums">
                    {subDaysLeft} days left out of {totalMonthDays} days this month
                  </h3>
                  <p className="text-xs sm:text-sm text-text-medium leading-relaxed">
                    {subEndDateStr
                      ? `Your store is actively covered on the ${planName} tier. Current monthly cycle renews on ${subEndDateStr}.`
                      : `Your store is actively covered on the ${planName} tier. Enjoy continuous retail automation and intelligence.`}
                  </p>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs text-text-medium font-medium">
                    <span>Current month cycle</span>
                    <span className="text-text-high font-semibold">{subDaysLeft} / {totalMonthDays} days remaining</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full bg-secondary transition-all duration-500"
                      style={{ width: `${Math.max(10, Math.min(100, (subDaysLeft / totalMonthDays) * 100))}%` }}
                    />
                  </div>
                </div>

                {/* Manage / Upgrade action */}
                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-border">
                  <div className="flex items-center gap-2 text-xs text-text-medium">
                    <CheckCircle2 className="w-4 h-4 text-secondary shrink-0" />
                    <span>All store analytics, OCR & POS features unlocked</span>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsPurchaseModalOpen(true)}
                    className="flex items-center justify-center gap-2 font-semibold"
                  >
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span>Change plan / Renew</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
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

      <PurchaseSubscriptionModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
      />
    </div>
  );
}
