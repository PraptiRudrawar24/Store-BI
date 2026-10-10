import * as React from 'react';
import {
  Timer,
  Percent,
  CheckCircle2,
  Undo2,
  Layers,
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
import { formatINR } from '../../utils';

export function AdminPlansPricesPage() {
  const toast = useToast();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  // Live Configurations from DB
  const [trialPeriod, setTrialPeriod] = React.useState('5');
  const [taxInclusive, setTaxInclusive] = React.useState(true);
  const [quarterlyBonus, setQuarterlyBonus] = React.useState('15');

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
    monthly_price: 599,
    quarterly_price: 1797,
    annual_price: 5999,
    active_subscribers: 0,
  });

  const [totalSubscribers, setTotalSubscribers] = React.useState(0);

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
      }
      setTotalSubscribers(plansData.total_subscribers || 0);
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

  const handleModulePriceChange = (slug: string, field: 'monthly_price' | 'quarterly_price', value: string) => {
    const num = parseFloat(value) || 0;
    setModules(prev => prev.map(m => m.slug === slug ? { ...m, [field]: num } : m));
  };

  const handleModuleToggle = (slug: string) => {
    setModules(prev => prev.map(m => m.slug === slug ? { ...m, enabled: !m.enabled } : m));
  };

  const handleSaveAndPublish = async () => {
    setSaving(true);
    try {
      const payload = {
        default_trial_days: parseInt(trialPeriod, 10) || 5,
        modular_features: modules,
        bundle,
      };
      await api.saveAdminPlans(payload);
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

  const totalModularMonthly = modules.reduce((sum, m) => sum + (m.enabled ? m.monthly_price : 0), 0);

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
            Configure modular tier pricing, discount bundles, and trial duration across web and mobile apps for kirana and retail store partners.
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

      {/* Top Configuration Ribbon (3 Fast Control Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        {/* Card 2: Currency & Region Tax Inclusion */}
        <Card className="p-4 border border-border bg-surface flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold text-text-low">
                Tax & localization
              </span>
              <span className="text-sm font-bold text-text-high mt-0.5">
                Currency & region
              </span>
            </div>
            <div className="w-8 h-8 rounded-[8px] bg-canvas border border-border flex items-center justify-center text-primary">
              <span className="font-bold text-sm">₹</span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-text-high">INR (₹)</span>
              <span className="px-2 py-0.5 rounded bg-canvas border border-border text-[10px] font-semibold text-text-medium">
                IN-DOMESTIC
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer min-w-[48px] min-h-[48px] justify-center">
              <input
                type="checkbox"
                checked={taxInclusive}
                onChange={(e) => setTaxInclusive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
          <div className="flex items-center justify-between text-[11px] text-text-medium">
            <span>India GST 18% inclusive</span>
            <span className="text-emerald-700 font-semibold">B2B invoice active</span>
          </div>
        </Card>

        {/* Card 3: Multi-month bonus */}
        <Card className="p-4 border border-border bg-surface flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold text-text-low">
                Multi-month bonus
              </span>
              <span className="text-sm font-bold text-text-high mt-0.5">
                Quarterly incentive
              </span>
            </div>
            <div className="w-8 h-8 rounded-[8px] bg-canvas border border-border flex items-center justify-center text-primary">
              <Percent className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center bg-canvas border border-border px-3 py-1.5 rounded-[8px] flex-1">
              <input
                type="number"
                min="0"
                max="50"
                value={quarterlyBonus}
                onChange={(e) => setQuarterlyBonus(e.target.value)}
                className="w-8 text-xs font-bold text-primary font-mono bg-transparent outline-none"
              />
              <span className="text-xs font-bold text-primary font-mono">%</span>
              <span className="ml-2 text-[11px] text-text-medium">auto-applied on 3-month cycle</span>
            </div>
          </div>
          <p className="text-[11px] text-text-low">
            Improves kirana merchant 90-day retention by ~24%.
          </p>
        </Card>
      </div>

      {/* Section 1: Modular Feature Pricing Table */}
      <Card className="border border-border bg-surface overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-text-high">
                Modular feature pricing (Individual add-ons)
              </h2>
              <span className="px-2 py-0.5 rounded bg-canvas border border-border text-[11px] font-semibold text-text-medium">
                4 Modules
              </span>
            </div>
            <p className="text-xs text-text-medium mt-0.5">
              Merchants can opt into single capabilities without full-suite lock-in.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setModules(prev => prev.map(m => ({
                  ...m,
                  monthly_price: Math.round(m.monthly_price * 1.1),
                  quarterly_price: Math.round(m.quarterly_price * 1.1),
                })));
                toast.info('Adjusted module rates by +10%');
              }}
              className="min-h-[48px] text-xs px-3.5"
            >
              Bulk adjust (+10%)
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-canvas border-b border-border text-text-medium font-semibold">
              <tr>
                <th className="py-2.5 px-4">Module / Feature name</th>
                <th className="py-2.5 px-3">Feature key</th>
                <th className="py-2.5 px-3">Monthly price (₹)</th>
                <th className="py-2.5 px-3">Quarterly price (₹)</th>
                <th className="py-2.5 px-3">Active subscribers</th>
                <th className="py-2.5 px-4 text-right">Status toggle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-text-high">
              {modules.map((mod) => (
                <tr key={mod.slug} className="hover:bg-canvas/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-[6px] bg-canvas border border-border flex items-center justify-center text-primary shrink-0 mt-0.5">
                        <Layers className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-text-high text-xs">{mod.name}</span>
                        <span className="text-[11px] text-text-medium truncate max-w-xs">{mod.description}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-canvas border border-border text-text-medium">
                      {mod.slug}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="relative w-28">
                      <span className="absolute left-2.5 top-1.5 text-text-medium text-xs">₹</span>
                      <input
                        type="number"
                        value={mod.monthly_price}
                        onChange={(e) => handleModulePriceChange(mod.slug, 'monthly_price', e.target.value)}
                        className="w-full pl-6 pr-2 py-1 rounded-[6px] bg-canvas border border-border text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="relative w-28">
                      <span className="absolute left-2.5 top-1.5 text-text-medium text-xs">₹</span>
                      <input
                        type="number"
                        value={mod.quarterly_price}
                        onChange={(e) => handleModulePriceChange(mod.slug, 'quarterly_price', e.target.value)}
                        className="w-full pl-6 pr-2 py-1 rounded-[6px] bg-canvas border border-border text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                      ~10% discount
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-semibold text-text-high">
                        {mod.active_subscribers}
                      </span>
                      <span className="text-[11px] text-text-medium">stores</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <Badge variant={mod.enabled ? 'success' : 'neutral'} className="text-[10px]">
                        {mod.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={mod.enabled}
                          onChange={() => handleModuleToggle(mod.slug)}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-canvas border-t border-border px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between text-xs text-text-medium gap-2">
          <div className="flex items-center gap-3">
            <span>
              Combined standalone monthly total:{' '}
              <strong className="text-text-high font-mono">₹{totalModularMonthly}.00 / mo</strong>
            </span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>
              Total active subscriptions:{' '}
              <strong className="text-text-high font-mono">{totalSubscribers}</strong>
            </span>
          </div>
          <span className="text-[11px] text-text-low">
            Prices auto-sync to POS web app and merchant terminals
          </span>
        </div>
      </Card>

      {/* Section 2: Bundled All-Features Pack Grid */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-text-high">Bundled all-features pack</h2>
            <p className="text-xs text-text-medium mt-0.5">
              Flagship merchant plan designed for maximum adoption and retention
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Main Bundle Card (8 Cols) */}
          <Card className="lg:col-span-8 p-6 border border-border bg-surface flex flex-col justify-between gap-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-[6px] bg-primary text-white text-xs font-bold">
                  Most popular • Best value
                </span>
                <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Primary recommendation
                </span>
              </div>
              <span className="text-xs text-text-medium">
                Standalone sum: <del className="font-mono">₹{totalModularMonthly} / mo</del>
              </span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-text-high">All features pack</h3>
              <p className="text-xs text-text-medium mt-1">
                Complete Store BI digitisation kit: daily sales ledger, OCR bill entry, profit intelligence, and automated AI stock ordering recommendations.
              </p>
            </div>

            {/* Price Tier Inputs (3 Cadences) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Monthly */}
              <div className="bg-canvas border border-border p-3.5 rounded-[8px] flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-high">Monthly billing</span>
                  <span className="text-[10px] text-emerald-700 font-bold">Save ₹97/mo</span>
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-1.5 text-text-medium font-bold text-sm">₹</span>
                  <input
                    type="number"
                    value={bundle.monthly_price}
                    onChange={(e) => setBundle({ ...bundle, monthly_price: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-6 pr-2 py-1 rounded-[6px] bg-surface border border-border text-base font-bold font-mono text-text-high focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <span className="text-[10px] text-text-low">Billed monthly • 14% discount</span>
              </div>

              {/* Quarterly (Highlighted) */}
              <div className="bg-primary/5 border border-primary/20 p-3.5 rounded-[8px] flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary">Quarterly billing</span>
                  <span className="px-1.5 py-0.2 rounded bg-primary text-white text-[10px] font-bold">
                    Optimal
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-1.5 text-primary font-bold text-sm">₹</span>
                  <input
                    type="number"
                    value={bundle.quarterly_price}
                    onChange={(e) => setBundle({ ...bundle, quarterly_price: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-6 pr-2 py-1 rounded-[6px] bg-surface border border-primary/30 text-base font-bold font-mono text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <span className="text-[10px] text-text-medium">₹1,797 every 3 mo (₹599/mo)</span>
              </div>

              {/* Annual */}
              <div className="bg-canvas border border-border p-3.5 rounded-[8px] flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-high">Annual billing</span>
                  <span className="text-[10px] text-emerald-700 font-bold">2 months free</span>
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-1.5 text-text-medium font-bold text-sm">₹</span>
                  <input
                    type="number"
                    value={bundle.annual_price}
                    onChange={(e) => setBundle({ ...bundle, annual_price: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-6 pr-2 py-1 rounded-[6px] bg-surface border border-border text-base font-bold font-mono text-text-high focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <span className="text-[10px] text-text-low">Equiv. ₹500/mo • ₹1,189 save</span>
              </div>
            </div>

            {/* Inclusions Checklist */}
            <div className="pt-2 border-t border-border flex flex-col gap-2">
              <span className="text-[11px] font-semibold text-text-low">
                Features included in all-features bundle
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-text-high">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>All 4 modular features unlocked unconstrained</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Priority phone & Hindi / Marathi WhatsApp support</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Multi-device sync (Counter desktop + 2 Android phones)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Automated GST e-Way bill & Excel tally export</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Bundle Health Analytics Card (4 Cols) */}
          <Card className="lg:col-span-4 p-6 border border-border bg-surface flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-text-low">
                  Performance metrics
                </span>
                <h3 className="text-sm font-bold text-text-high mt-0.5">Pack adoption health</h3>
              </div>
              <Badge variant="neutral" className="text-xs">Live Database</Badge>
            </div>

            <div className="flex flex-col items-center justify-center py-2">
              <div className="text-center">
                <span className="text-2xl font-bold font-mono text-text-high">
                  {formatINR(totalSubscribers * bundle.monthly_price)}
                </span>
                <span className="block text-xs text-text-medium mt-0.5">
                  Monthly recurring subscription revenue
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t border-border text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                  <span className="text-text-high">All features pack</span>
                </div>
                <span className="font-mono font-semibold text-text-high">
                  {bundle.active_subscribers} stores
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  <span className="text-text-high">Total active subscribers</span>
                </div>
                <span className="font-mono font-semibold text-text-high">
                  {totalSubscribers} stores
                </span>
              </div>
            </div>

            <div className="p-3 rounded-[8px] bg-canvas border border-border text-xs text-text-medium leading-relaxed">
              Realtime subscriber metrics calculated from verified merchant ledger entries in database.
            </div>
          </Card>
        </div>
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
