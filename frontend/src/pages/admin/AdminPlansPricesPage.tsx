import * as React from 'react';
import {
  Timer,
  Percent,
  CheckCircle2,
  Undo2,
  Plus,
  Copy,
  Check,
  Edit2,
  Trash2,
  X,
  RotateCw,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { api } from '../../api/client';
import type {
  ModularFeatureItem,
  BundlePricingItem,
  PromoCodeItem,
} from '../../api/client';

export function AdminPlansPricesPage() {
  const toast = useToast();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  // Live Configurations from DB
  const [trialPeriod, setTrialPeriod] = React.useState('5');
  const [monthlyPrice, setMonthlyPrice] = React.useState('1299');

  const [modules, setModules] = React.useState<ModularFeatureItem[]>([
    {
      id: 'daily_dashboard',
      name: 'Daily dashboard',
      slug: 'daily_dashboard',
      description: 'Sales ledger, cash vs UPI, WhatsApp daily business summaries',
      monthly_price: 149,
      quarterly_price: 399,
      active_subscribers: 0,
      enabled: true,
    },
    {
      id: 'data_upload',
      name: 'Data upload & OCR',
      slug: 'data_upload',
      description: 'Unlimited supplier bill scanning, camera capture & Excel import',
      monthly_price: 149,
      quarterly_price: 399,
      active_subscribers: 0,
      enabled: true,
    },
    {
      id: 'analytics_pro',
      name: 'Analytics & reporting',
      slug: 'analytics_pro',
      description: 'Profit margin analysis, category mix, slow-moving stock alerts',
      monthly_price: 199,
      quarterly_price: 539,
      active_subscribers: 0,
      enabled: true,
    },
    {
      id: 'ai_insights',
      name: 'AI insights & forecast',
      slug: 'ai_insights',
      description: '7-day demand predictions, market basket bundling & smart restock list',
      monthly_price: 199,
      quarterly_price: 539,
      active_subscribers: 0,
      enabled: true,
    },
  ]);

  const [bundle, setBundle] = React.useState<BundlePricingItem>({
    monthly_price: 1299,
    quarterly_price: 3897,
    annual_price: 12990,
    active_subscribers: 0,
  });

  // Promo Codes from DB (starts empty)
  const [promoCodes, setPromoCodes] = React.useState<PromoCodeItem[]>([]);
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null);

  // Promo Code Modal State
  const [promoModalOpen, setPromoModalOpen] = React.useState(false);
  const [editingPromoId, setEditingPromoId] = React.useState<number | null>(null);
  const [promoCodeInput, setPromoCodeInput] = React.useState('');
  const [promoTypeInput, setPromoTypeInput] = React.useState<'percentage' | 'fixed'>('percentage');
  const [promoValueInput, setPromoValueInput] = React.useState(20);
  const [promoValidityInput, setPromoValidityInput] = React.useState('31 Dec 2026');
  const [promoMaxUsesInput, setPromoMaxUsesInput] = React.useState(100);
  const [promoActiveInput, setPromoActiveInput] = React.useState(true);
  const [savingPromo, setSavingPromo] = React.useState(false);

  const fetchPlansAndPromos = React.useCallback(async () => {
    setLoading(true);
    try {
      const [plansData, promosData] = await Promise.all([
        api.getAdminPlans(),
        api.getAdminPromoCodes(),
      ]);

      setTrialPeriod(String(plansData.default_trial_days || 5));
      if (plansData.modular_features && plansData.modular_features.length > 0) {
        setModules(plansData.modular_features);
      }
      if (plansData.bundle) {
        setBundle(plansData.bundle);
        setMonthlyPrice(String(plansData.bundle.monthly_price ?? 1299));
      } else {
        setMonthlyPrice('1299');
      }
      setPromoCodes(promosData || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch pricing and coupon settings';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchPlansAndPromos();
  }, [fetchPlansAndPromos]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Copied coupon code ${code}`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleSaveAndPublish = async () => {
    setSaving(true);
    try {
      const parsedPrice = parseFloat(monthlyPrice) || 1299;
      const updatedBundle: BundlePricingItem = {
        ...bundle,
        monthly_price: parsedPrice,
      };
      const payload = {
        default_trial_days: parseInt(trialPeriod, 10) || 5,
        modular_features: modules,
        bundle: updatedBundle,
      };
      await api.saveAdminPlans(payload);
      setBundle(updatedBundle);
      toast.success('Pricing changes saved and synchronized across store portals');
      await fetchPlansAndPromos();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save pricing changes';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = async () => {
    await fetchPlansAndPromos();
    toast.info('Reverted unsaved changes to active database settings');
  };

  // Promo Code Modal Handlers
  const handleOpenCreatePromo = () => {
    setEditingPromoId(null);
    setPromoCodeInput('');
    setPromoTypeInput('percentage');
    setPromoValueInput(20);
    setPromoValidityInput('31 Dec 2026');
    setPromoMaxUsesInput(100);
    setPromoActiveInput(true);
    setPromoModalOpen(true);
  };

  const handleOpenEditPromo = (promo: PromoCodeItem) => {
    setEditingPromoId(promo.id);
    setPromoCodeInput(promo.code);
    setPromoTypeInput(promo.discount_type === 'fixed' ? 'fixed' : 'percentage');
    setPromoValueInput(promo.discount_value);
    setPromoValidityInput(promo.validity || '');
    setPromoMaxUsesInput(promo.max_uses);
    setPromoActiveInput(promo.active);
    setPromoModalOpen(true);
  };

  const handleSavePromo = async () => {
    if (!promoCodeInput.trim()) {
      toast.error('Promo code name cannot be empty');
      return;
    }
    setSavingPromo(true);
    try {
      if (editingPromoId) {
        await api.updateAdminPromoCode(editingPromoId, {
          discount_type: promoTypeInput,
          discount_value: promoValueInput,
          validity: promoValidityInput.trim() || undefined,
          max_uses: promoMaxUsesInput,
          active: promoActiveInput,
        });
        toast.success(`Updated promo code ${promoCodeInput.toUpperCase()}`);
      } else {
        await api.createAdminPromoCode({
          code: promoCodeInput.trim().toUpperCase(),
          discount_type: promoTypeInput,
          discount_value: promoValueInput,
          validity: promoValidityInput.trim() || undefined,
          max_uses: promoMaxUsesInput,
          active: promoActiveInput,
        });
        toast.success(`Created promo code ${promoCodeInput.toUpperCase()}`);
      }
      setPromoModalOpen(false);
      await fetchPlansAndPromos();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save promo code';
      toast.error(msg);
    } finally {
      setSavingPromo(false);
    }
  };

  const handleDeletePromo = async (promoId: number, code: string) => {
    try {
      await api.deleteAdminPromoCode(promoId);
      toast.info(`Deleted coupon code ${code}`);
      await fetchPlansAndPromos();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete promo code';
      toast.error(msg);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header & Control Actions */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-2xl font-bold text-text-high">Plans and prices</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Live version v2.4 (Active in production)
            </span>
          </div>
          <p className="text-xs text-text-medium max-w-3xl">
            Configure merchant trial periods, monthly subscription plan pricing, and promotional discount coupon codes for kirana store partners.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start xl:self-auto">
          <Button
            variant="secondary"
            onClick={handleDiscard}
            disabled={saving}
            className="min-h-[48px] text-xs px-3.5 gap-1.5"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Discard changes</span>
          </Button>

          <Button
            variant="primary"
            onClick={handleSaveAndPublish}
            disabled={saving}
            className="min-h-[48px] text-xs px-4 gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{saving ? 'Publishing...' : 'Save & publish pricing changes'}</span>
          </Button>

          <Button
            variant="secondary"
            onClick={fetchPlansAndPromos}
            disabled={loading}
            className="w-12 h-12 min-w-[48px] min-h-[48px] p-0 flex items-center justify-center text-text-medium"
            title="Refresh records"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Top Configuration Ribbon (Fast Control Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Default trial period */}
        <Card className="p-4 border border-border bg-surface flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold text-text-low">
                Onboarding trial
              </span>
              <span className="text-sm font-bold text-text-high mt-0.5">
                Default trial period
              </span>
            </div>
            <div className="w-8 h-8 rounded-[8px] bg-canvas border border-border flex items-center justify-center text-primary">
              <Timer className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <select
              value={trialPeriod}
              onChange={(e) => setTrialPeriod(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-[8px] bg-canvas border border-border text-xs font-semibold text-text-high focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer min-h-[48px]"
            >
              <option value="3">3 days access</option>
              <option value="5">5 days full access (Standard)</option>
              <option value="7">7 days access</option>
              <option value="14">14 days access</option>
            </select>
            <span className="px-2 py-1 rounded bg-canvas border border-border text-[11px] font-semibold text-text-medium whitespace-nowrap">
              Kirana default
            </span>
          </div>
          <p className="text-[11px] text-text-low">
            Zero payment card required during the active trial window.
          </p>
        </Card>

        {/* Card 2: Monthly plan */}
        <Card className="p-4 border border-border bg-surface flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold text-text-low">
                Store subscription
              </span>
              <span className="text-sm font-bold text-text-high mt-0.5">
                Monthly plan
              </span>
            </div>
            <div className="w-8 h-8 rounded-[8px] bg-canvas border border-border flex items-center justify-center text-primary font-bold text-sm">
              <span>₹</span>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center bg-canvas border border-border px-3 rounded-[8px] flex-1 min-h-[48px] focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-colors">
              <span className="text-sm font-bold text-primary font-mono mr-1">₹</span>
              <input
                id="monthly-plan-price-input"
                type="number"
                min="0"
                step="1"
                value={monthlyPrice}
                onChange={(e) => {
                  const val = e.target.value;
                  setMonthlyPrice(val);
                  const numVal = parseFloat(val);
                  setBundle((prev) => ({
                    ...prev,
                    monthly_price: isNaN(numVal) ? 0 : numVal,
                  }));
                }}
                className="w-full text-xs font-bold text-text-high font-mono bg-transparent outline-none"
                placeholder="1299"
              />
              <span className="text-[11px] text-text-medium whitespace-nowrap ml-2">
                / month
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setMonthlyPrice('1299');
                setBundle((prev) => ({ ...prev, monthly_price: 1299 }));
              }}
              className="px-3 py-1.5 rounded-[8px] bg-canvas border border-border text-[11px] font-semibold text-text-medium hover:text-text-high hover:border-primary transition-colors whitespace-nowrap min-h-[48px]"
              title="Reset to default Rs 1299"
            >
              Default ₹1299
            </button>
          </div>
          <div className="flex items-center justify-between text-[11px] text-text-low">
            <span>All-Features Pro plan for kirana store partners.</span>
            <span className="text-emerald-700 font-semibold">Active in store checkout</span>
          </div>
        </Card>
      </div>

      {/* Section 3: Promotional Coupon Codes */}
      <Card className="border border-border bg-surface p-5 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-text-high">Special kirana promo codes</h2>
              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold">
                Marketing campaign
              </span>
            </div>
            <p className="text-xs text-text-medium mt-0.5">
              Coupons applied during counter self-checkout or field agent onboarding visits.
            </p>
          </div>

          <Button
            variant="secondary"
            onClick={handleOpenCreatePromo}
            className="min-h-[48px] text-xs px-4 gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create promo code</span>
          </Button>
        </div>

        {promoCodes.length === 0 ? (
          <div className="p-8 text-center bg-canvas rounded-[8px] border border-border">
            <Percent className="w-8 h-8 text-text-low mx-auto mb-2" />
            <p className="text-xs font-semibold text-text-medium">
              No promotional coupon codes created yet.
            </p>
            <p className="text-[11px] text-text-low mt-0.5">
              Click &quot;Create promo code&quot; above to issue targeted discounts for field agents or Kirana merchants.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-canvas border-y border-border text-text-medium font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Coupon code</th>
                  <th className="py-2.5 px-3">Discount rule</th>
                  <th className="py-2.5 px-3">Redemptions</th>
                  <th className="py-2.5 px-3">Validity</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-text-high">
                {promoCodes.map((promo) => (
                  <tr key={promo.id} className="hover:bg-canvas/50 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-xs bg-canvas px-2 py-1 rounded border border-border text-primary">
                        {promo.code}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-text-high">
                        {promo.discount_type === 'percentage' ? `${promo.discount_value}% OFF` : `₹${promo.discount_value} FLAT OFF`}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono font-medium text-text-high">
                        {promo.used_count} / {promo.max_uses}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-text-medium">
                      {promo.validity || 'Permanent'}
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant={promo.active ? 'success' : 'neutral'} className="text-[10px]">
                        {promo.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyCode(promo.code)}
                          className="px-2 py-1 rounded-[6px] border border-border bg-canvas hover:bg-surface text-text-medium text-xs font-medium inline-flex items-center gap-1 transition-colors"
                          title="Copy code"
                        >
                          {copiedCode === promo.code ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditPromo(promo)}
                          className="px-2 py-1 rounded-[6px] border border-border bg-canvas hover:bg-surface text-text-medium text-xs font-medium inline-flex items-center gap-1 transition-colors"
                          title="Edit code"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePromo(promo.id, promo.code)}
                          className="px-2 py-1 rounded-[6px] border border-border bg-canvas hover:bg-rose-50 text-destructive text-xs font-medium inline-flex items-center gap-1 transition-colors"
                          title="Delete code"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* MODAL: Create / Edit Promo Code Dialog */}
      {promoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-surface border border-border rounded-[8px] max-w-md w-full p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-bold text-text-high">
                {editingPromoId ? 'Edit promo code' : 'Create new promo code'}
              </h3>
              <button
                type="button"
                onClick={() => setPromoModalOpen(false)}
                className="w-12 h-12 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-[8px] text-text-medium hover:text-text-high"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-medium">Coupon code</label>
              <input
                type="text"
                disabled={!!editingPromoId}
                placeholder="e.g. KIRANA100"
                value={promoCodeInput}
                onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                className="min-h-[48px] px-3 bg-canvas border border-border rounded-[8px] text-xs font-mono font-bold text-text-high uppercase focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-medium">Discount type</label>
                <select
                  value={promoTypeInput}
                  onChange={(e) => setPromoTypeInput(e.target.value as 'percentage' | 'fixed')}
                  className="min-h-[48px] px-2.5 bg-canvas border border-border rounded-[8px] text-xs text-text-high focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="percentage">Percentage (% OFF)</option>
                  <option value="fixed">Fixed amount (₹ OFF)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-medium">
                  {promoTypeInput === 'percentage' ? 'Discount %' : 'Discount ₹'}
                </label>
                <input
                  type="number"
                  min="1"
                  value={promoValueInput}
                  onChange={(e) => setPromoValueInput(parseFloat(e.target.value) || 0)}
                  className="min-h-[48px] px-3 bg-canvas border border-border rounded-[8px] text-xs font-mono font-bold text-text-high focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-medium">Validity date</label>
                <input
                  type="text"
                  placeholder="e.g. 31 Dec 2026"
                  value={promoValidityInput}
                  onChange={(e) => setPromoValidityInput(e.target.value)}
                  className="min-h-[48px] px-3 bg-canvas border border-border rounded-[8px] text-xs text-text-high focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-medium">Maximum redemptions</label>
                <input
                  type="number"
                  min="1"
                  value={promoMaxUsesInput}
                  onChange={(e) => setPromoMaxUsesInput(parseInt(e.target.value, 10) || 1)}
                  className="min-h-[48px] px-3 bg-canvas border border-border rounded-[8px] text-xs font-mono text-text-high focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex items-center justify-between py-1 border-t border-border text-xs">
              <span className="font-semibold text-text-medium">Active coupon</span>
              <label className="relative inline-flex items-center cursor-pointer min-h-[48px] min-w-[48px] justify-center">
                <input
                  type="checkbox"
                  checked={promoActiveInput}
                  onChange={(e) => setPromoActiveInput(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="secondary"
                onClick={() => setPromoModalOpen(false)}
                className="min-h-[48px] text-xs px-4"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSavePromo}
                disabled={savingPromo}
                className="min-h-[48px] text-xs px-4"
              >
                {savingPromo ? 'Saving...' : (editingPromoId ? 'Update promo' : 'Create promo')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
