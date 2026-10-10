import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  ShieldCheck,
  Send,
  Ban,
  CheckCircle2,
  Package,
  Receipt,
  FileText,
  Users,
  User,
  Store,
  SlidersHorizontal,
  ShieldAlert,
  Plus,
  RotateCw,
  ChevronDown,
  X,
  CreditCard,
  Activity,
  History,
  AlertTriangle,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { api } from '../../api/client';
import type { BusinessDetailResponse } from '../../api/client';
import { formatINR } from '../../utils';

export function AdminBusinessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const businessId = parseInt(id || '0', 10);

  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<BusinessDetailResponse | null>(null);
  const [activeTab, setActiveTab] = React.useState<'profile' | 'payments' | 'usage' | 'audit'>('profile');

  // Action Modals State
  const [extendModalOpen, setExtendModalOpen] = React.useState(false);
  const [extendDays, setExtendDays] = React.useState(7);
  const [extendReason, setExtendReason] = React.useState('');
  const [extendLoading, setExtendLoading] = React.useState(false);

  const [resendModalOpen, setResendModalOpen] = React.useState(false);
  const [resendLoading, setResendLoading] = React.useState(false);

  const [suspendModalOpen, setSuspendModalOpen] = React.useState(false);
  const [suspendLoading, setSuspendLoading] = React.useState(false);

  const [activateModalOpen, setActivateModalOpen] = React.useState(false);
  const [activateLoading, setActivateLoading] = React.useState(false);

  // Note Editor State
  const [noteEditing, setNoteEditing] = React.useState(false);
  const [noteText, setNoteText] = React.useState('');
  const [savingNote, setSavingNote] = React.useState(false);

  // Popover for Quick Extend
  const [popoverOpen, setPopoverOpen] = React.useState(false);

  const fetchDetail = React.useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const res = await api.getAdminBusinessDetail(businessId);
      setData(res);
      setNoteText(res.admin_notes || '');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch business details';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [businessId, toast]);

  React.useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // Extend Trial Action
  const handleExtendTrial = async (days: number, reason?: string) => {
    setExtendLoading(true);
    try {
      const res = await api.adminExtendBusinessTrial(businessId, days, reason);
      toast.success(res.message);
      setExtendModalOpen(false);
      setPopoverOpen(false);
      await fetchDetail();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to extend trial';
      toast.error(msg);
    } finally {
      setExtendLoading(false);
    }
  };

  // Resend Login Action
  const handleResendLogin = async () => {
    setResendLoading(true);
    try {
      const res = await api.adminResendBusinessLogin(businessId);
      toast.success(res.message);
      setResendModalOpen(false);
      await fetchDetail();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resend credentials';
      toast.error(msg);
    } finally {
      setResendLoading(false);
    }
  };

  // Suspend Action
  const handleSuspend = async () => {
    setSuspendLoading(true);
    try {
      const res = await api.adminSuspendBusiness(businessId);
      toast.info(res.message);
      setSuspendModalOpen(false);
      await fetchDetail();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to suspend business';
      toast.error(msg);
    } finally {
      setSuspendLoading(false);
    }
  };

  // Activate Action
  const handleActivate = async () => {
    setActivateLoading(true);
    try {
      const res = await api.adminActivateBusiness(businessId);
      toast.success(res.message);
      setActivateModalOpen(false);
      await fetchDetail();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to activate business';
      toast.error(msg);
    } finally {
      setActivateLoading(false);
    }
  };

  // Save Note Action
  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    setSavingNote(true);
    try {
      const res = await api.adminUpdateBusinessNote(businessId, noteText.trim());
      toast.success(res.message);
      setNoteEditing(false);
      await fetchDetail();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save observation';
      toast.error(msg);
    } finally {
      setSavingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold text-text-medium mt-3">Loading store records...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center flex flex-col items-center">
        <h2 className="text-lg font-bold text-text-high">Business not found</h2>
        <p className="text-xs text-text-medium mt-1">The requested business account does not exist.</p>
        <Button variant="secondary" onClick={() => navigate('/admin/businesses')} className="mt-4 text-xs">
          Return to businesses
        </Button>
      </div>
    );
  }

  const { shop, stats, onboarding_steps, trial_info, admin_notes, audit_logs, payments, usage } = data;

  const getStatusBadge = () => {
    if (trial_info.is_paid || trial_info.status === 'active') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
          Active Paid License
        </span>
      );
    }
    if (trial_info.status === 'suspended') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
          Suspended
        </span>
      );
    }
    if (trial_info.status === 'expired' || trial_info.trial_days_left === 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
          Trial Expired
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
        Trial ({trial_info.trial_days_left} {trial_info.trial_days_left === 1 ? 'day' : 'days'} left)
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2 text-text-medium">
          <button
            onClick={() => navigate('/admin/businesses')}
            className="flex items-center gap-1 text-primary hover:underline font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to businesses</span>
          </button>
          <span>/</span>
          <span onClick={() => navigate('/admin/businesses')} className="hover:text-text-high cursor-pointer">
            Businesses
          </span>
          <span>/</span>
          <span className="text-text-high font-bold">
            {shop.name} ({shop.code})
          </span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-canvas border border-border text-[11px] text-text-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
          <span>Sync timestamp: Live</span>
        </div>
      </div>

      {/* Screen Header & Operational Actions Toolbar */}
      <Card className="border border-border bg-surface p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Store Identity */}
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold text-text-high tracking-tight">{shop.name}</h1>
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-canvas border border-border text-text-high">
              {shop.code}
            </span>
            {getStatusBadge()}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-text-medium">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-text-low" />
              <span>Created via Mobile Web</span>
            </span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-text-low" />
              <span>{shop.city}, {shop.state}</span>
            </span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>KYC Level 1 Verified</span>
            </span>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2 relative">
          {/* Extend Trial with dropdown popover */}
          <div className="relative">
            <Button
              variant="secondary"
              onClick={() => setPopoverOpen(!popoverOpen)}
              className="min-h-[48px] text-xs px-3.5 gap-1.5"
            >
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span>Extend trial</span>
              <ChevronDown className="w-3.5 h-3.5 text-text-medium" />
            </Button>

            {popoverOpen && (
              <div className="absolute right-0 top-12 w-64 bg-surface border border-border rounded-[8px] p-2 z-50 flex flex-col gap-1">
                <div className="px-2.5 py-1 text-[11px] font-semibold text-text-low border-b border-border">
                  Select duration grant
                </div>
                <button
                  type="button"
                  onClick={() => handleExtendTrial(3, 'Quick +3 days grant')}
                  className="w-full text-left px-2.5 py-2.5 hover:bg-canvas rounded-[6px] text-xs font-semibold text-text-high flex items-center justify-between min-h-[48px]"
                >
                  <span>+3 days extension</span>
                  <span className="text-text-medium text-[11px]">Quick grant</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExtendTrial(7, 'Standard +7 days grant')}
                  className="w-full text-left px-2.5 py-2.5 hover:bg-canvas rounded-[6px] text-xs font-semibold text-text-high flex items-center justify-between min-h-[48px]"
                >
                  <span>+7 days extension</span>
                  <span className="text-text-medium text-[11px]">Standard</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPopoverOpen(false);
                    setExtendModalOpen(true);
                  }}
                  className="w-full text-left px-2.5 py-2.5 hover:bg-canvas rounded-[6px] text-xs font-semibold text-primary flex items-center gap-1.5 min-h-[48px]"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Custom date grant...</span>
                </button>
              </div>
            )}
          </div>

          {/* Resend Login Button */}
          <Button
            variant="secondary"
            onClick={() => setResendModalOpen(true)}
            className="min-h-[48px] text-xs px-3.5 gap-1.5"
          >
            <Send className="w-3.5 h-3.5 text-emerald-600" />
            <span>Resend login</span>
          </Button>

          {/* Suspend Button */}
          {trial_info.status !== 'suspended' && (
            <Button
              variant="secondary"
              onClick={() => setSuspendModalOpen(true)}
              className="min-h-[48px] text-xs px-3.5 gap-1.5 text-destructive hover:bg-destructive/10"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Suspend</span>
            </Button>
          )}

          {/* Activate Button */}
          {!trial_info.is_paid && (
            <Button
              variant="primary"
              onClick={() => setActivateModalOpen(true)}
              className="min-h-[48px] text-xs px-4 gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Activate</span>
            </Button>
          )}

          <Button
            variant="secondary"
            onClick={fetchDetail}
            className="w-12 h-12 min-w-[48px] min-h-[48px] p-0 flex items-center justify-center text-text-medium"
            title="Refresh record"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </Card>

      {/* Quick Operational Metrics Bar (4 Key Health Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Catalogue */}
        <Card className="p-4 border border-border bg-surface flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-text-medium">Catalogue size</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold font-mono text-text-high">{stats.catalogue_size}</span>
              <span className="text-xs text-text-medium">items</span>
            </div>
            <span className="text-[11px] text-emerald-700 font-semibold block mt-1">
              Live in store database
            </span>
          </div>
          <div className="w-10 h-10 rounded-[8px] bg-canvas border border-border flex items-center justify-center text-primary">
            <Package className="w-5 h-5" />
          </div>
        </Card>

        {/* Stat 2: Monthly Sales */}
        <Card className="p-4 border border-border bg-surface flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-text-medium">Monthly sales reported</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold font-mono text-text-high">
                {formatINR(stats.monthly_sales_reported)}
              </span>
            </div>
            <span className="text-[11px] text-text-medium block mt-1">
              {usage.sales_count} ledger transactions total
            </span>
          </div>
          <div className="w-10 h-10 rounded-[8px] bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <Receipt className="w-5 h-5" />
          </div>
        </Card>

        {/* Stat 3: OCR Invoices */}
        <Card className="p-4 border border-border bg-surface flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-text-medium">Invoices scanned (OCR)</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold font-mono text-text-high">{stats.invoices_scanned}</span>
              <span className="text-xs text-text-medium">bills</span>
            </div>
            <span className="text-[11px] text-primary font-semibold block mt-1">
              Gemini OCR vision ready
            </span>
          </div>
          <div className="w-10 h-10 rounded-[8px] bg-canvas border border-border flex items-center justify-center text-amber-700">
            <FileText className="w-5 h-5" />
          </div>
        </Card>

        {/* Stat 4: Staff Users */}
        <Card className="p-4 border border-border bg-surface flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-text-medium">Staff users</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold font-mono text-text-high">{stats.staff_users}</span>
              <span className="text-xs text-text-medium">active</span>
            </div>
            <span className="text-[11px] text-text-medium block mt-1">
              Owner admin account
            </span>
          </div>
          <div className="w-10 h-10 rounded-[8px] bg-canvas border border-border flex items-center justify-center text-text-medium">
            <Users className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Primary Tab Bar Navigation */}
      <div className="border-b border-border flex items-center gap-6 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'profile'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-medium hover:text-text-high'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Profile (registration answers)</span>
          <span className="px-1.5 py-0.5 rounded bg-canvas border border-border text-[10px]">
            4 cards
          </span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'payments'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-medium hover:text-text-high'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Payments</span>
          <span className="px-1.5 py-0.5 rounded bg-canvas border border-border text-[10px]">
            {payments.length} paid
          </span>
        </button>

        <button
          onClick={() => setActiveTab('usage')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'usage'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-medium hover:text-text-high'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Usage and activity</span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            Live
          </span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'audit'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-medium hover:text-text-high'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Actions log and audit</span>
          <span className="px-1.5 py-0.5 rounded bg-canvas border border-border text-[10px]">
            {audit_logs.length} entries
          </span>
        </button>
      </div>

      {/* TAB 1: Profile (4 Onboarding Step Cards + Trial Management) */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Card 1: Owner & Contact Information */}
          <Card className="border border-border bg-surface flex flex-col justify-between overflow-hidden">
            <div>
              <div className="p-4 bg-canvas border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-[6px] bg-surface border border-border flex items-center justify-center text-primary">
                    <User className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-bold text-text-high">Owner & contact information</h2>
                </div>
                <span className="text-[10px] font-semibold text-text-medium px-2 py-0.5 rounded bg-surface border border-border">
                  Step 1 of 4
                </span>
              </div>

              <div className="p-4 flex flex-col gap-2.5 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-border">
                  <span className="text-text-medium">Owner name</span>
                  <span className="font-semibold text-text-high">{onboarding_steps[0]?.data.owner_name}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-border">
                  <span className="text-text-medium">Mobile / WhatsApp</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-text-high">{onboarding_steps[0]?.data.phone}</span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                      Verified OTP
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-border">
                  <span className="text-text-medium">Email address</span>
                  <span className="font-semibold text-text-high">{onboarding_steps[0]?.data.email}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-border">
                  <span className="text-text-medium">Preferred login delivery</span>
                  <span className="font-semibold text-text-high">{onboarding_steps[0]?.data.delivery_channel}</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-text-medium">App language</span>
                  <span className="px-2 py-0.5 rounded bg-canvas border border-border font-semibold text-text-high">
                    {onboarding_steps[0]?.data.language}
                  </span>
                </div>
              </div>
            </div>
            <div className="p-3 bg-canvas/60 border-t border-border flex items-center justify-between text-[11px] text-text-medium">
              <span>Self-registered via Web App</span>
              <span className="text-primary font-medium">WhatsApp active</span>
            </div>
          </Card>

          {/* Card 2: Store & Business Registration */}
          <Card className="border border-border bg-surface flex flex-col justify-between overflow-hidden">
            <div>
              <div className="p-4 bg-canvas border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-[6px] bg-surface border border-border flex items-center justify-center text-primary">
                    <Store className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-bold text-text-high">Store & business registration</h2>
                </div>
                <span className="text-[10px] font-semibold text-text-medium px-2 py-0.5 rounded bg-surface border border-border">
                  Step 2 of 4
                </span>
              </div>

              <div className="p-4 flex flex-col gap-2.5 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-border">
                  <span className="text-text-medium">Business name</span>
                  <span className="font-semibold text-text-high">{onboarding_steps[1]?.data.business_name}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-border">
                  <span className="text-text-medium">Store category</span>
                  <span className="font-semibold text-text-high">{onboarding_steps[1]?.data.category}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-border">
                  <span className="text-text-medium">Operating location</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-text-high">{onboarding_steps[1]?.data.location}</span>
                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-canvas border border-border text-text-medium">
                      {onboarding_steps[1]?.data.pincode}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-border">
                  <span className="text-text-medium">Physical outlets</span>
                  <span className="font-semibold text-text-high">{onboarding_steps[1]?.data.outlets}</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-text-medium">GSTIN</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-text-high">{onboarding_steps[1]?.data.gstin}</span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                      Validated
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-3 bg-canvas/60 border-t border-border flex items-center justify-between text-[11px] text-text-medium">
              <span>Jurisdiction: Maharashtra</span>
              <span className="text-emerald-700 font-semibold">B2B invoice ready</span>
            </div>
          </Card>

          {/* Card 3: Store Operational Setup */}
          <Card className="border border-border bg-surface flex flex-col justify-between overflow-hidden">
            <div>
              <div className="p-4 bg-canvas border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-[6px] bg-surface border border-border flex items-center justify-center text-primary">
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-bold text-text-high">Store operational setup</h2>
                </div>
                <span className="text-[10px] font-semibold text-text-medium px-2 py-0.5 rounded bg-surface border border-border">
                  Step 3 of 4
                </span>
              </div>

              <div className="p-4 flex flex-col gap-2.5 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-border">
                  <span className="text-text-medium">SKUs / Catalogue size</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-text-high">{onboarding_steps[2]?.data.approx_products}</span>
                    <span className="px-1.5 py-0.2 rounded bg-canvas border border-border font-mono text-[10px] text-primary">
                      {onboarding_steps[2]?.data.actual_live_catalogue}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-border">
                  <span className="text-text-medium">Estimated monthly turnover</span>
                  <span className="font-bold text-text-high font-mono">{onboarding_steps[2]?.data.monthly_turnover}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-border">
                  <span className="text-text-medium">Previous ledger method</span>
                  <span className="px-2 py-0.5 rounded bg-canvas border border-border font-medium text-text-high">
                    {onboarding_steps[2]?.data.ledger_method}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-border">
                  <span className="text-text-medium">Sells expiring goods</span>
                  <span className="font-semibold text-text-high">{onboarding_steps[2]?.data.sells_expiring_goods}</span>
                </div>
                <div className="flex flex-col py-1.5 gap-1.5">
                  <span className="text-text-medium">Core operational challenges</span>
                  <div className="flex flex-wrap gap-1.5">
                    {((onboarding_steps[2]?.data.challenges as string[]) || []).map((ch, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-canvas border border-border text-[11px] text-text-high font-medium">
                        • {ch}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-3 bg-canvas/60 border-t border-border flex items-center justify-between text-[11px] text-text-medium">
              <span>Persona: High-Frequency Kirana</span>
              <span className="text-primary font-semibold">Store BI Plan: All Features</span>
            </div>
          </Card>

          {/* Card 4: Trial Management & Overrides (Admin Controls) */}
          <Card className="border border-border bg-surface flex flex-col justify-between overflow-hidden">
            <div>
              <div className="p-4 bg-canvas border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-[6px] bg-surface border border-border flex items-center justify-center text-primary">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-bold text-text-high">Trial management & overrides</h2>
                </div>
                <span className="text-[10px] font-semibold text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                  Super admin controls
                </span>
              </div>

              <div className="p-4 flex flex-col gap-3 text-xs">
                {/* Current Expiry Banner */}
                <div className="p-3 rounded-[8px] bg-canvas border border-border flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-medium text-text-medium block">Current trial expiry</span>
                    <span className="text-xs font-bold text-text-high mt-0.5 block">
                      {trial_info.trial_end_date || 'No active expiration'}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] font-bold px-2 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200">
                    {trial_info.hours_remaining} hours remaining
                  </span>
                </div>

                {/* Manual Grant Quick Buttons */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-text-medium font-medium">Manual grant days</span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleExtendTrial(3, 'Quick +3 days override')}
                      className="h-8 rounded-[6px] bg-canvas border border-border hover:bg-surface text-text-high text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                    >
                      <Plus className="w-3 h-3 text-primary" />
                      <span>+3 days</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExtendTrial(7, 'Quick +7 days override')}
                      className="h-8 rounded-[6px] bg-canvas border border-border hover:bg-surface text-text-high text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                    >
                      <Plus className="w-3 h-3 text-primary" />
                      <span>+7 days</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setExtendModalOpen(true)}
                      className="h-8 rounded-[6px] bg-canvas border border-border hover:bg-surface text-primary text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                    >
                      <Calendar className="w-3 h-3" />
                      <span>Custom</span>
                    </button>
                  </div>
                </div>

                {/* Internal Admin Notes */}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-text-medium font-medium">Internal admin notes</span>
                    {!noteEditing && (
                      <button
                        type="button"
                        onClick={() => setNoteEditing(true)}
                        className="text-primary hover:underline text-[11px] font-semibold flex items-center gap-0.5"
                      >
                        <Plus className="w-3 h-3" />
                        <span>{admin_notes ? 'Edit note' : 'Add note'}</span>
                      </button>
                    )}
                  </div>

                  {!noteEditing ? (
                    <div className="p-2.5 rounded-[6px] bg-canvas border border-border text-xs text-text-high italic leading-relaxed min-h-[48px]">
                      {admin_notes ? `“${admin_notes}”` : 'No internal notes recorded for this store.'}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Write internal merchant observation or onboarding context..."
                        className="w-full p-2.5 rounded-[6px] bg-canvas border border-border text-xs text-text-high focus:outline-none focus:ring-1 focus:ring-primary h-20 resize-none"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => setNoteEditing(false)}
                          className="min-h-[48px] text-xs px-4"
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="primary"
                          onClick={handleSaveNote}
                          disabled={savingNote}
                          className="min-h-[48px] text-xs px-4"
                        >
                          {savingNote ? 'Saving...' : 'Save observation'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-3 bg-canvas/60 border-t border-border flex items-center justify-between text-[11px] text-text-medium">
              <span>Customer Success: Neha V.</span>
              <span className="text-emerald-700 font-semibold">Standing: Active</span>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: Payments */}
      {activeTab === 'payments' && (
        <Card className="border border-border bg-surface p-6">
          <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
            <div>
              <h2 className="text-base font-bold text-text-high">Payment requests & transactions</h2>
              <p className="text-xs text-text-medium mt-0.5">
                Merchant subscription billing lifecycle and invoice history
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => toast.info('Creating direct UPI/payment link...')}
              className="text-xs min-h-[48px] px-4 gap-1.5"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Generate payment link</span>
            </Button>
          </div>

          {payments.length === 0 ? (
            <div className="p-8 text-center bg-canvas rounded-[8px] border border-border">
              <CreditCard className="w-8 h-8 text-text-low mx-auto mb-2" />
              <p className="text-xs font-semibold text-text-medium">
                No previous completed payments found for this store.
              </p>
              <p className="text-[11px] text-text-low mt-0.5">
                Payment records will appear here as soon as the merchant converts or upgrades.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {payments.map((pmt) => (
                <div
                  key={pmt.id}
                  className="p-4 rounded-[8px] bg-canvas border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-text-high">{pmt.plan_name}</span>
                        <Badge variant="success" className="text-[10px]">{pmt.status}</Badge>
                      </div>
                      <span className="text-[11px] text-text-medium font-mono">
                        {pmt.invoice_number} • Issued {pmt.date}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold font-mono text-text-high">
                      {formatINR(pmt.amount)}
                    </span>
                    <Button
                      variant="secondary"
                      onClick={() => toast.success(`Receipt ${pmt.invoice_number} downloaded`)}
                      className="text-xs h-7 min-h-[28px] px-2.5"
                    >
                      Receipt
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* TAB 3: Usage & Activity */}
      {activeTab === 'usage' && (
        <Card className="border border-border bg-surface p-6">
          <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
            <div>
              <h2 className="text-base font-bold text-text-high">Realtime store telemetry & feature usage</h2>
              <p className="text-xs text-text-medium mt-0.5">
                Live inventory activity and sales records for {shop.code}
              </p>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Connected (Last active: {usage.last_active || 'Just now'})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-[8px] bg-canvas border border-border">
              <span className="text-xs font-semibold text-text-medium">Total sales recorded</span>
              <p className="text-2xl font-bold font-mono text-text-high mt-1">{usage.sales_count}</p>
              <span className="text-[11px] text-text-medium block mt-0.5">
                Volume: {formatINR(usage.total_sales_volume)}
              </span>
            </div>

            <div className="p-4 rounded-[8px] bg-canvas border border-border">
              <span className="text-xs font-semibold text-text-medium">Catalogue inventory items</span>
              <p className="text-2xl font-bold font-mono text-text-high mt-1">{usage.products_count}</p>
              <span className="text-[11px] text-emerald-700 font-semibold block mt-0.5">
                Synchronized with ledger
              </span>
            </div>

            <div className="p-4 rounded-[8px] bg-canvas border border-border">
              <span className="text-xs font-semibold text-text-medium">OCR bills scanned</span>
              <p className="text-2xl font-bold font-mono text-text-high mt-1">{usage.invoices_count}</p>
              <span className="text-[11px] text-text-medium block mt-0.5">
                Supplier purchases
              </span>
            </div>
          </div>

          <div className="p-4 rounded-[8px] bg-canvas border border-border">
            <h3 className="text-xs font-bold text-text-high mb-2">Device & operational session attributes</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-text-medium">
              <div>
                <span className="text-text-low text-[11px] block">Client type</span>
                <span className="font-semibold text-text-high">Mobile Web (Counter App)</span>
              </div>
              <div>
                <span className="text-text-low text-[11px] block">Platform version</span>
                <span className="font-semibold text-text-high">Store BI v2.4 (React + Vite)</span>
              </div>
              <div>
                <span className="text-text-low text-[11px] block">Storage engine</span>
                <span className="font-semibold text-text-high">SQLite + FastAPI DB</span>
              </div>
              <div>
                <span className="text-text-low text-[11px] block">Status guard</span>
                <span className="font-semibold text-emerald-700">Valid session token</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 4: Actions Log & Audit Trail */}
      {activeTab === 'audit' && (
        <Card className="border border-border bg-surface p-6">
          <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
            <div>
              <h2 className="text-base font-bold text-text-high">Operations audit trail</h2>
              <p className="text-xs text-text-medium mt-0.5">
                Immutable administrative action history recorded in database
              </p>
            </div>
            <span className="text-xs font-medium text-text-medium">
              Showing {audit_logs.length} logged entries
            </span>
          </div>

          {audit_logs.length === 0 ? (
            <div className="p-8 text-center bg-canvas rounded-[8px] border border-border">
              <History className="w-8 h-8 text-text-low mx-auto mb-2" />
              <p className="text-xs font-semibold text-text-medium">
                No administrative actions logged yet for this store.
              </p>
              <p className="text-[11px] text-text-low mt-0.5">
                Actions such as trial extension, credential dispatch, or suspension will be recorded here with timestamps.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border text-xs">
              {audit_logs.map((log) => (
                <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-text-high text-xs capitalize">
                          {log.action.replace('_', ' ')}
                        </span>
                        <span className="text-[11px] text-text-medium">• {log.admin_email}</span>
                      </div>
                      <p className="text-xs text-text-high mt-0.5 leading-relaxed">
                        {log.details || 'Action completed by operations lead'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] text-text-low font-mono whitespace-nowrap sm:text-right">
                    {log.created_at}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* MODAL 1: Extend Trial Dialog */}
      {extendModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-surface border border-border rounded-[8px] max-w-md w-full p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-bold text-text-high">Custom trial extension</h3>
              <button
                type="button"
                onClick={() => setExtendModalOpen(false)}
                className="w-7 h-7 flex items-center justify-center text-text-medium hover:text-text-high"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-medium">Days to grant</label>
              <input
                type="number"
                min="1"
                max="90"
                value={extendDays}
                onChange={(e) => setExtendDays(parseInt(e.target.value, 10) || 1)}
                className="h-9 px-3 bg-canvas border border-border rounded-[8px] text-xs font-mono font-bold text-text-high focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-medium">Reason for override</label>
              <input
                type="text"
                placeholder="e.g. Waiting for GST invoice review or distributor integration"
                value={extendReason}
                onChange={(e) => setExtendReason(e.target.value)}
                className="h-9 px-3 bg-canvas border border-border rounded-[8px] text-xs text-text-high focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="secondary"
                onClick={() => setExtendModalOpen(false)}
                className="min-h-[48px] text-xs px-4"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => handleExtendTrial(extendDays, extendReason)}
                disabled={extendLoading}
                className="min-h-[48px] text-xs px-4"
              >
                {extendLoading ? 'Applying...' : 'Apply extension'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Resend Login Confirmation */}
      {resendModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-surface border border-border rounded-[8px] max-w-md w-full p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-text-high pb-2 border-b border-border">
              <Send className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold">Resend merchant login credentials?</h3>
            </div>

            <p className="text-xs text-text-medium leading-relaxed">
              This will dispatch an active login link and OTP credentials to{' '}
              <strong className="text-text-high font-mono">+91 {shop.phone}</strong> via WhatsApp Cloud API.
              An audit entry will be recorded.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="secondary"
                onClick={() => setResendModalOpen(false)}
                className="min-h-[48px] text-xs px-4"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleResendLogin}
                disabled={resendLoading}
                className="min-h-[48px] text-xs px-4"
              >
                {resendLoading ? 'Sending...' : 'Confirm & send'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Suspend Store Confirmation */}
      {suspendModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-surface border border-border rounded-[8px] max-w-md w-full p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-destructive pb-2 border-b border-border">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-text-high">Suspend store account?</h3>
            </div>

            <p className="text-xs text-text-medium leading-relaxed">
              Suspending <strong className="text-text-high">{shop.name} ({shop.code})</strong> will immediately
              revoke Counter app access and halt OCR bill scanning. This action is recorded in the immutable audit log.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="secondary"
                onClick={() => setSuspendModalOpen(false)}
                className="min-h-[48px] text-xs px-4"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleSuspend}
                disabled={suspendLoading}
                className="min-h-[48px] text-xs px-4"
              >
                {suspendLoading ? 'Suspending...' : 'Confirm suspension'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Activate Store Confirmation */}
      {activateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-surface border border-border rounded-[8px] max-w-md w-full p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-emerald-700 pb-2 border-b border-border">
              <CheckCircle2 className="w-5 h-5" />
              <h3 className="text-sm font-bold text-text-high">Activate store license?</h3>
            </div>

            <p className="text-xs text-text-medium leading-relaxed">
              Activating <strong className="text-text-high">{shop.name} ({shop.code})</strong> will upgrade
              the merchant from trial to the <strong>Annual Pro License</strong> with unlimited access.
              An audit entry will be created.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="secondary"
                onClick={() => setActivateModalOpen(false)}
                className="min-h-[48px] text-xs px-4"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleActivate}
                disabled={activateLoading}
                className="min-h-[48px] text-xs px-4"
              >
                {activateLoading ? 'Activating...' : 'Confirm activation'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
