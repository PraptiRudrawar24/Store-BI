import * as React from 'react';
import {
  CreditCard,
  Search,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  FileText,
  Printer,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Layers,
  Banknote,
  Receipt,
  Copy,
  Check,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { formatINR } from '../../utils';
import { api } from '../../api/client';
import type {
  PaymentOverviewResponse,
  PaymentTransactionItem,
  SettlementBatchItem,
  SettlementEntryItem,
  SettlementDetailResponse,
  RefundItem,
  TaxInvoiceItem,
  GatewayConfigStatusResponse,
} from '../../api/client';

export function AdminPaymentsPage() {
  const toast = useToast();

  // Active Tab: 'overview' | 'transactions' | 'settlements' | 'refunds' | 'invoices' | 'gateway'
  const [activeTab, setActiveTab] = React.useState<
    'overview' | 'transactions' | 'settlements' | 'refunds' | 'invoices' | 'gateway'
  >('overview');

  // Overview State
  const [overviewRange, setOverviewRange] = React.useState<string>('30d');
  const [overviewLoading, setOverviewLoading] = React.useState<boolean>(true);
  const [overview, setOverview] = React.useState<PaymentOverviewResponse | null>(null);

  // Transactions State
  const [txnsLoading, setTxnsLoading] = React.useState<boolean>(false);
  const [transactions, setTransactions] = React.useState<PaymentTransactionItem[]>([]);
  const [totalTxns, setTotalTxns] = React.useState<number>(0);
  const [txnPage, setTxnPage] = React.useState<number>(1);
  const [txnTotalPages, setTxnTotalPages] = React.useState<number>(1);
  const [txnSearch, setTxnSearch] = React.useState<string>('');
  const [txnStatus, setTxnStatus] = React.useState<string>('all');
  const [txnMethod, setTxnMethod] = React.useState<string>('all');
  const [selectedTxn, setSelectedTxn] = React.useState<PaymentTransactionItem | null>(null);

  // Settlements State
  const [settlementsLoading, setSettlementsLoading] = React.useState<boolean>(false);
  const [settlementBatches, setSettlementBatches] = React.useState<SettlementBatchItem[]>([]);
  const [selectedBatch, setSelectedBatch] = React.useState<SettlementDetailResponse | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = React.useState<boolean>(false);
  const [uploading, setUploading] = React.useState<boolean>(false);
  const [resolveModalEntry, setResolveModalEntry] = React.useState<SettlementEntryItem | null>(null);
  const [resolutionNote, setResolutionNote] = React.useState<string>('');
  const [resolving, setResolving] = React.useState<boolean>(false);

  // Refunds State
  const [refundsLoading, setRefundsLoading] = React.useState<boolean>(false);
  const [refunds, setRefunds] = React.useState<RefundItem[]>([]);
  const [refundModalTxn, setRefundModalTxn] = React.useState<PaymentTransactionItem | null>(null);
  const [refundAmount, setRefundAmount] = React.useState<string>('');
  const [refundReason, setRefundReason] = React.useState<string>('customer_request');
  const [refundNotes, setRefundNotes] = React.useState<string>('');
  const [processingRefund, setProcessingRefund] = React.useState<boolean>(false);

  // Tax Invoices State
  const [invoicesLoading, setInvoicesLoading] = React.useState<boolean>(false);
  const [invoices, setInvoices] = React.useState<TaxInvoiceItem[]>([]);
  const [viewInvoiceModal, setViewInvoiceModal] = React.useState<TaxInvoiceItem | null>(null);

  // Gateway Config State
  const [gatewayConfig, setGatewayConfig] = React.useState<GatewayConfigStatusResponse | null>(null);
  const [copiedWebhook, setCopiedWebhook] = React.useState<boolean>(false);

  // 1. Fetch Overview Data
  const fetchOverview = React.useCallback(async () => {
    setOverviewLoading(true);
    try {
      const res = await api.getAdminPaymentsOverview(overviewRange);
      setOverview(res);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to fetch overview data');
    } finally {
      setOverviewLoading(false);
    }
  }, [overviewRange, toast]);

  // 2. Fetch Transactions
  const fetchTransactions = React.useCallback(async () => {
    setTxnsLoading(true);
    try {
      const res = await api.getAdminPaymentsTransactions({
        page: txnPage,
        limit: 15,
        search: txnSearch.trim() || undefined,
        status: txnStatus !== 'all' ? txnStatus : undefined,
        method: txnMethod !== 'all' ? txnMethod : undefined,
      });
      setTransactions(res.items);
      setTotalTxns(res.total_count);
      setTxnTotalPages(res.total_pages);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to fetch transactions');
    } finally {
      setTxnsLoading(false);
    }
  }, [txnPage, txnSearch, txnStatus, txnMethod, toast]);

  // 3. Fetch Settlements
  const fetchSettlements = React.useCallback(async () => {
    setSettlementsLoading(true);
    try {
      const res = await api.getAdminSettlementBatches();
      setSettlementBatches(res);
      if (res.length > 0 && !selectedBatch) {
        const detail = await api.getAdminSettlementBatchDetail(res[0].id);
        setSelectedBatch(detail);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to fetch settlements');
    } finally {
      setSettlementsLoading(false);
    }
  }, [selectedBatch, toast]);

  // 4. Fetch Refunds
  const fetchRefunds = React.useCallback(async () => {
    setRefundsLoading(true);
    try {
      const res = await api.getAdminPaymentsRefunds();
      setRefunds(res);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to fetch refunds');
    } finally {
      setRefundsLoading(false);
    }
  }, [toast]);

  // 5. Fetch Tax Invoices
  const fetchInvoices = React.useCallback(async () => {
    setInvoicesLoading(true);
    try {
      const res = await api.getAdminTaxInvoices();
      setInvoices(res);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to fetch invoices');
    } finally {
      setInvoicesLoading(false);
    }
  }, [toast]);

  // 6. Fetch Gateway Status
  const fetchGatewayStatus = React.useCallback(async () => {
    try {
      const res = await api.getAdminGatewayStatus();
      setGatewayConfig(res);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to fetch gateway status');
    }
  }, [toast]);

  // Initial and reactive effects
  React.useEffect(() => {
    if (activeTab === 'overview') {
      fetchOverview();
    } else if (activeTab === 'transactions') {
      fetchTransactions();
    } else if (activeTab === 'settlements') {
      fetchSettlements();
    } else if (activeTab === 'refunds') {
      fetchRefunds();
    } else if (activeTab === 'invoices') {
      fetchInvoices();
    } else if (activeTab === 'gateway') {
      fetchGatewayStatus();
    }
  }, [activeTab, fetchOverview, fetchTransactions, fetchSettlements, fetchRefunds, fetchInvoices, fetchGatewayStatus]);

  // Handle Export CSV
  const handleExportTransactionsCSV = () => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    window.open(`${apiBase}/api/admin/payments/transactions/export-csv?status=${txnStatus}`, '_blank');
    toast.success('Transactions CSV export initiated');
  };

  // Handle Settlement CSV Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const batch = await api.uploadAdminSettlementCsv(file);
      toast.success(`Settlement ${batch.batch_reference} imported & reconciled!`);
      setUploadModalOpen(false);
      fetchSettlements();
      const detail = await api.getAdminSettlementBatchDetail(batch.id);
      setSelectedBatch(detail);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload settlement file');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // Handle Resolve Discrepancy
  const handleResolveDiscrepancy = async () => {
    if (!resolveModalEntry) return;
    if (!resolutionNote.trim()) {
      toast.error('Please enter an investigation note explaining the resolution.');
      return;
    }
    setResolving(true);
    try {
      await api.resolveAdminSettlementDiscrepancy(resolveModalEntry.id, {
        resolution_notes: resolutionNote.trim(),
        mark_as: 'resolved',
      });
      toast.success(`Entry ${resolveModalEntry.provider_payment_id} marked as resolved!`);
      setResolveModalEntry(null);
      setResolutionNote('');
      if (selectedBatch) {
        const updated = await api.getAdminSettlementBatchDetail(selectedBatch.batch.id);
        setSelectedBatch(updated);
      }
      fetchSettlements();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to resolve discrepancy');
    } finally {
      setResolving(false);
    }
  };

  // Handle Process Refund
  const handleProcessRefund = async () => {
    if (!refundModalTxn) return;
    const amountVal = parseFloat(refundAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      toast.error('Please enter a valid refund amount in ₹.');
      return;
    }

    setProcessingRefund(true);
    try {
      const res = await api.processAdminTransactionRefund(refundModalTxn.id, {
        amount: amountVal,
        reason: refundReason,
        admin_notes: refundNotes.trim() || undefined,
      });
      toast.success(res.message);
      setRefundModalTxn(null);
      setRefundAmount('');
      setRefundNotes('');
      fetchTransactions();
      fetchOverview();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Refund failed');
    } finally {
      setProcessingRefund(false);
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'captured':
      case 'settled':
      case 'matched':
      case 'processed':
      case 'issued':
        return (
          <Badge variant="success" dot className="capitalize">
            {status.replace('_', ' ')}
          </Badge>
        );
      case 'failed':
      case 'cancelled':
      case 'discrepant':
        return (
          <Badge variant="destructive" dot className="capitalize">
            {status.replace('_', ' ')}
          </Badge>
        );
      case 'pending':
      case 'uploaded':
      case 'unmatched':
        return (
          <Badge variant="warning" dot className="capitalize">
            {status.replace('_', ' ')}
          </Badge>
        );
      case 'partially_refunded':
      case 'refunded':
      case 'partially_matched':
        return (
          <Badge variant="info" dot className="capitalize">
            {status.replace('_', ' ')}
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" className="capitalize">
            {status.replace('_', ' ')}
          </Badge>
        );
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-text-high tracking-tight">Payments & payouts</h1>
            <Badge variant="success" className="text-xs">
              Live Production
            </Badge>
          </div>
          <p className="text-xs text-text-medium">
            Settlement reconciliation, UPI/Razorpay processing fees, B2B GST tax invoices, and refund dispute controls.
          </p>
        </div>

        {/* Global Action Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleExportTransactionsCSV}
            className="min-h-[40px] text-xs px-3.5 gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </Button>

          <Button
            variant="primary"
            onClick={() => setUploadModalOpen(true)}
            className="min-h-[40px] text-xs px-3.5 gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload settlement</span>
          </Button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 border-b border-border overflow-x-auto pb-1">
        {[
          { key: 'overview', label: 'Payments overview', icon: CreditCard },
          { key: 'transactions', label: 'Transactions', count: totalTxns || overview?.total_transactions_count, icon: Receipt },
          { key: 'settlements', label: 'Settlements & reconciliation', icon: Layers },
          { key: 'refunds', label: 'Refunds & disputes', icon: Banknote },
          { key: 'invoices', label: 'GST tax invoices', icon: FileText },
          { key: 'gateway', label: 'Gateway settings & webhooks', icon: SlidersHorizontal },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-[8px] text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-medium hover:text-text-high hover:bg-canvas'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-surface-high text-text-medium'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PAYMENTS OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="flex flex-col gap-6">
          {/* Filter Bar with Range Selector */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-surface p-3 rounded-[8px] border border-border">
            <div className="flex items-center gap-2 text-xs text-text-medium">
              <span className="font-semibold text-text-high">Reporting Range:</span>
              <div className="flex items-center gap-1 bg-canvas p-1 rounded-[6px] border border-border">
                {[
                  { key: 'today', label: 'Today' },
                  { key: '7d', label: 'Last 7 days' },
                  { key: '30d', label: 'Last 30 days' },
                  { key: 'this_month', label: 'This month' },
                  { key: 'all', label: 'All time' },
                ].map((r) => (
                  <button
                    key={r.key}
                    onClick={() => setOverviewRange(r.key)}
                    className={`px-2.5 py-1 text-xs rounded-[4px] font-medium transition-colors ${
                      overviewRange === r.key
                        ? 'bg-surface text-primary font-bold shadow-xs'
                        : 'text-text-medium hover:text-text-high'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <Button
              variant="secondary"
              onClick={fetchOverview}
              className="text-xs gap-1.5 h-8 text-text-medium hover:text-text-high"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${overviewLoading ? 'animate-spin' : ''}`} />
              <span>Refresh numbers</span>
            </Button>
          </div>

          {/* Reconciliation Discrepancy Banner (Conditional) */}
          {overview && overview.discrepancy_count > 0 && (
            <div className="p-4 rounded-[8px] bg-amber-500/10 border border-amber-500/30 flex items-start justify-between gap-3 text-xs">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-amber-900 dark:text-amber-300">
                    {overview.discrepancy_count} Settlement Reconciliation Discrepanc{overview.discrepancy_count === 1 ? 'y' : 'ies'} Detected
                  </div>
                  <p className="text-amber-800 dark:text-amber-400 mt-0.5">
                    Provider reported settlement transactions differ from internal ledger estimates. Please review and investigate.
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={() => setActiveTab('settlements')}
                className="shrink-0 text-xs h-8 border-amber-300 text-amber-900 bg-white hover:bg-amber-50"
              >
                Inspect discrepancies
              </Button>
            </div>
          )}

          {/* 8 Financial KPI Cards (Exact integer paise math) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Card 1: Gross Payments */}
            <Card className="p-4 bg-surface border border-border">
              <div className="text-xs font-semibold text-text-medium">Gross eligible payments</div>
              <div className="text-2xl font-bold text-text-high mt-1.5">
                {overview ? formatINR(overview.gross_amount) : '₹0'}
              </div>
              <div className="text-[11px] text-text-medium mt-1">
                {overview?.total_transactions_count || 0} total transactions
              </div>
            </Card>

            {/* Card 2: Successful Payments */}
            <Card className="p-4 bg-surface border border-border">
              <div className="text-xs font-semibold text-text-medium">Successful payments</div>
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1.5">
                {overview ? formatINR(overview.successful_amount) : '₹0'}
              </div>
              <div className="text-[11px] text-emerald-600 mt-1">
                {overview?.successful_count || 0} captured charges
              </div>
            </Card>

            {/* Card 3: Net Bank Settlement */}
            <Card className="p-4 bg-surface border border-border">
              <div className="text-xs font-semibold text-text-medium">Net bank settlement</div>
              <div className="text-2xl font-bold text-primary mt-1.5">
                {overview ? formatINR(overview.net_settlement_amount) : '₹0'}
              </div>
              <div className="text-[11px] text-text-medium mt-1">
                After fee deductions (Gross − Fees − Tax)
              </div>
            </Card>

            {/* Card 4: Awaiting Settlement */}
            <Card className="p-4 bg-surface border border-border">
              <div className="text-xs font-semibold text-text-medium">Awaiting settlement</div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1.5">
                {overview ? formatINR(overview.awaiting_settlement_amount) : '₹0'}
              </div>
              <div className="text-[11px] text-text-medium mt-1">
                Clearing window (T+1 / T+2)
              </div>
            </Card>

            {/* Card 5: Gateway Fees */}
            <Card className="p-4 bg-surface border border-border">
              <div className="text-xs font-semibold text-text-medium">Gateway processing fees</div>
              <div className="text-xl font-bold text-text-high mt-1.5">
                {overview ? formatINR(overview.gateway_fees_amount, true) : '₹0'}
              </div>
              <div className="text-[11px] text-text-medium mt-1">
                2% rate + 18% GST on fee
              </div>
            </Card>

            {/* Card 6: Refunds Issued */}
            <Card className="p-4 bg-surface border border-border">
              <div className="text-xs font-semibold text-text-medium">Refunds & adjustments</div>
              <div className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1.5">
                {overview ? formatINR(overview.refunds_amount) : '₹0'}
              </div>
              <div className="text-[11px] text-text-medium mt-1">
                {overview?.refunds_count || 0} refunds processed
              </div>
            </Card>

            {/* Card 7: Failed Payments */}
            <Card className="p-4 bg-surface border border-border">
              <div className="text-xs font-semibold text-text-medium">Failed payment charges</div>
              <div className="text-xl font-bold text-destructive mt-1.5">
                {overview ? formatINR(overview.failed_amount) : '₹0'}
              </div>
              <div className="text-[11px] text-destructive mt-1">
                {overview?.failed_count || 0} bank/user declines
              </div>
            </Card>

            {/* Card 8: Pending Incomplete */}
            <Card className="p-4 bg-surface border border-border">
              <div className="text-xs font-semibold text-text-medium">Pending authorizations</div>
              <div className="text-xl font-bold text-text-high mt-1.5">
                {overview ? formatINR(overview.pending_amount) : '₹0'}
              </div>
              <div className="text-[11px] text-text-medium mt-1">
                {overview?.pending_count || 0} in payment gateway
              </div>
            </Card>
          </div>

          {/* Payment Method Distribution & Gateway Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Method Breakdown */}
            <Card className="p-5 bg-surface border border-border">
              <h3 className="text-sm font-bold text-text-high mb-3">Payment method distribution</h3>
              <div className="flex flex-col gap-3">
                {overview?.payment_methods_breakdown.map((m, idx) => (
                  <div key={idx} className="flex flex-col gap-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-text-high">{m.method}</span>
                      <span className="font-mono text-text-medium">
                        {formatINR(m.amount)} ({m.share_pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-canvas h-2 rounded-full overflow-hidden border border-border">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-500"
                        style={{ width: `${m.share_pct}%` }}
                      />
                    </div>
                  </div>
                ))}
                {(!overview || overview.payment_methods_breakdown.length === 0) && (
                  <div className="text-xs text-text-medium py-4 text-center">No transactions in this period</div>
                )}
              </div>
            </Card>

            {/* Settlement Status Breakdown */}
            <Card className="p-5 bg-surface border border-border">
              <h3 className="text-sm font-bold text-text-high mb-3">Settlement reconciliation status</h3>
              <div className="flex flex-col gap-3">
                {overview?.settlement_status_breakdown.map((s, idx) => (
                  <div key={idx} className="p-3 rounded-[6px] bg-canvas border border-border flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-text-high">{s.status}</div>
                      <div className="text-[11px] text-text-medium">{s.count} transactions</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-text-high">{formatINR(s.amount)}</div>
                      <span className="text-[10px] text-text-medium">Net settlement</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Failed Payment Alerts List */}
          {overview && overview.failed_alerts.length > 0 && (
            <Card className="p-5 bg-surface border border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-destructive" />
                  <h3 className="text-sm font-bold text-text-high">Recent failed payment alerts</h3>
                </div>
                <span className="text-xs text-text-medium">Auto-retry cadence active</span>
              </div>
              <div className="divide-y divide-border">
                {overview.failed_alerts.map((alert) => (
                  <div key={alert.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-text-high">
                        {alert.shop_name} — {formatINR(alert.amount)} ({alert.method})
                      </div>
                      <p className="text-destructive mt-0.5">
                        Code: <span className="font-mono">{alert.failure_code}</span> — {alert.failure_reason}
                      </p>
                    </div>
                    <span className="text-text-medium text-[11px] shrink-0">{alert.created_at}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Recent Transactions Preview */}
          <Card className="p-5 bg-surface border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-text-high">Recent payment ledger entries</h3>
              <button
                type="button"
                onClick={() => setActiveTab('transactions')}
                className="text-xs text-primary flex items-center gap-1 font-semibold hover:underline"
              >
                <span>View all {overview?.total_transactions_count || 0} transactions</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border text-text-medium">
                    <th className="pb-2 font-semibold">Transaction ID</th>
                    <th className="pb-2 font-semibold">Store / Owner</th>
                    <th className="pb-2 font-semibold">Plan</th>
                    <th className="pb-2 font-semibold text-right">Gross amount</th>
                    <th className="pb-2 font-semibold">Method</th>
                    <th className="pb-2 font-semibold">Status</th>
                    <th className="pb-2 font-semibold">Settlement</th>
                    <th className="pb-2 font-semibold text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {overview?.recent_transactions.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTxn(t)}
                      className="hover:bg-canvas cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 font-mono text-[11px] font-bold text-text-high">
                        {t.transaction_ref}
                      </td>
                      <td className="py-2.5 font-medium text-text-high">{t.shop_name}</td>
                      <td className="py-2.5 text-text-medium">{t.plan_name}</td>
                      <td className="py-2.5 font-bold text-text-high text-right">{formatINR(t.amount)}</td>
                      <td className="py-2.5 text-text-medium uppercase">{t.payment_method}</td>
                      <td className="py-2.5">{renderStatusBadge(t.status)}</td>
                      <td className="py-2.5">{renderStatusBadge(t.settlement_status)}</td>
                      <td className="py-2.5 text-text-medium text-right">{t.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TRANSACTIONS LEDGER */}
      {/* ========================================================================= */}
      {activeTab === 'transactions' && (
        <div className="flex flex-col gap-4">
          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface p-3.5 rounded-[8px] border border-border">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-text-medium absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by Store, Transaction ID (TXN-...), Gateway ID (pay_...), phone..."
                value={txnSearch}
                onChange={(e) => {
                  setTxnSearch(e.target.value);
                  setTxnPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 bg-canvas border border-border rounded-[6px] text-xs text-text-high focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex items-center gap-2">
              <select
                value={txnStatus}
                onChange={(e) => {
                  setTxnStatus(e.target.value);
                  setTxnPage(1);
                }}
                className="px-3 py-2 bg-canvas border border-border rounded-[6px] text-xs text-text-high focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="captured">Captured (Paid)</option>
                <option value="failed">Failed</option>
                <option value="partially_refunded">Partially Refunded</option>
                <option value="refunded">Refunded</option>
                <option value="pending">Pending</option>
              </select>

              <select
                value={txnMethod}
                onChange={(e) => {
                  setTxnMethod(e.target.value);
                  setTxnPage(1);
                }}
                className="px-3 py-2 bg-canvas border border-border rounded-[6px] text-xs text-text-high focus:outline-none"
              >
                <option value="all">All Methods</option>
                <option value="upi">UPI Autopay</option>
                <option value="netbanking">Netbanking</option>
                <option value="card">Card</option>
                <option value="nach_mandate">e-NACH</option>
              </select>

              <Button
                variant="secondary"
                onClick={fetchTransactions}
                className="text-xs h-9 px-3 gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${txnsLoading ? 'animate-spin' : ''}`} />
                <span>Filter</span>
              </Button>
            </div>
          </div>

          {/* Table */}
          <Card className="bg-surface border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-canvas border-b border-border text-text-medium font-semibold">
                    <th className="py-3 px-4">Transaction ID</th>
                    <th className="py-3 px-4">Business / Owner</th>
                    <th className="py-3 px-4">Plan & Cycle</th>
                    <th className="py-3 px-4 text-right">Gross (INR)</th>
                    <th className="py-3 px-4 text-right">Fee (INR)</th>
                    <th className="py-3 px-4 text-right">Net credit</th>
                    <th className="py-3 px-4">Payment method</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Settlement</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transactions.map((t) => (
                    <tr
                      key={t.id}
                      className="hover:bg-canvas transition-colors cursor-pointer"
                      onClick={() => setSelectedTxn(t)}
                    >
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-text-high text-[11px]">{t.transaction_ref}</div>
                        {t.gateway_payment_id && (
                          <div className="font-mono text-[10px] text-text-medium">{t.gateway_payment_id}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-text-high">{t.shop_name}</div>
                        <div className="text-[11px] text-text-medium">{t.owner_name}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-text-high">{t.plan_name}</div>
                        <div className="text-[11px] text-text-medium capitalize">{t.billing_cycle}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-text-high">
                        {formatINR(t.amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-text-medium">
                        {formatINR(t.gateway_fee + t.gateway_tax, true)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-primary">
                        {formatINR(t.net_settlement)}
                      </td>
                      <td className="py-3 px-4 uppercase text-text-medium font-medium">
                        {t.payment_method}
                      </td>
                      <td className="py-3 px-4">{renderStatusBadge(t.status)}</td>
                      <td className="py-3 px-4">{renderStatusBadge(t.settlement_status)}</td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {t.status === 'captured' && (
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setRefundModalTxn(t);
                                setRefundAmount(String(t.amount - t.refunded_amount));
                              }}
                              className="text-[11px] h-7 px-2 border-border hover:bg-destructive/10 hover:text-destructive"
                            >
                              Refund
                            </Button>
                          )}
                          <Button
                            variant="secondary"
                            onClick={() => setSelectedTxn(t)}
                            className="text-[11px] h-7 px-2"
                          >
                            Details
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-xs text-text-medium">
                        No transactions found matching the filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between p-3.5 border-t border-border bg-canvas text-xs text-text-medium">
              <div>
                Showing page <span className="font-bold text-text-high">{txnPage}</span> of{' '}
                <span className="font-bold text-text-high">{txnTotalPages}</span> ({totalTxns} total)
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="secondary"
                  disabled={txnPage <= 1}
                  onClick={() => setTxnPage((p) => Math.max(1, p - 1))}
                  className="h-8 text-xs px-2.5 gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </Button>
                <Button
                  variant="secondary"
                  disabled={txnPage >= txnTotalPages}
                  onClick={() => setTxnPage((p) => Math.min(txnTotalPages, p + 1))}
                  className="h-8 text-xs px-2.5 gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SETTLEMENTS & RECONCILIATION */}
      {/* ========================================================================= */}
      {activeTab === 'settlements' && (
        <div className="flex flex-col gap-6">
          {/* Header Action Card */}
          <Card className="p-5 bg-surface border border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                <h2 className="text-base font-bold text-text-high">Automated settlement reconciliation engine</h2>
              </div>
              <p className="text-xs text-text-medium mt-1">
                Upload bank UTR and payment gateway settlement files (CSV). Store BI cross-checks provider amounts against internal transaction ledger to identify discrepancies.
              </p>
            </div>

            <Button
              variant="primary"
              onClick={() => setUploadModalOpen(true)}
              className="text-xs min-h-[40px] px-4 gap-1.5 shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import settlement CSV</span>
            </Button>
          </Card>

          {/* Batches Overview List */}
          {settlementsLoading && (
            <div className="flex items-center gap-2 text-xs text-text-medium py-1">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
              <span>Refreshing settlement batches...</span>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {settlementBatches.map((b) => (
              <Card
                key={b.id}
                onClick={async () => {
                  const detail = await api.getAdminSettlementBatchDetail(b.id);
                  setSelectedBatch(detail);
                }}
                className={`p-4 cursor-pointer transition-all border ${
                  selectedBatch?.batch.id === b.id
                    ? 'border-primary ring-1 ring-primary bg-primary/5'
                    : 'border-border bg-surface hover:bg-canvas'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-text-high">{b.batch_reference}</span>
                  {renderStatusBadge(b.status)}
                </div>
                <div className="text-lg font-bold text-text-high">{formatINR(b.total_net)}</div>
                <div className="text-[11px] text-text-medium mt-1 flex items-center justify-between">
                  <span>{b.entry_count} entries</span>
                  <span className="text-emerald-700 font-semibold">{b.matched_count} matched</span>
                  {b.discrepant_count > 0 && (
                    <span className="text-destructive font-semibold">{b.discrepant_count} discrepancies</span>
                  )}
                </div>
                <div className="text-[10px] text-text-low mt-2 border-t border-border pt-1.5">
                  Uploaded: {b.uploaded_at}
                </div>
              </Card>
            ))}
            {settlementBatches.length === 0 && (
              <div className="col-span-3 text-center py-8 text-xs text-text-medium bg-surface rounded-[8px] border border-border">
                No settlement batches uploaded yet. Click "Import settlement CSV" to begin.
              </div>
            )}
          </div>

          {/* Detailed Batch Reconciliation Table */}
          {selectedBatch && (
            <Card className="p-5 bg-surface border border-border flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-text-high">
                      Reconciliation ledger: {selectedBatch.batch.batch_reference}
                    </h3>
                    {renderStatusBadge(selectedBatch.batch.status)}
                  </div>
                  <div className="text-xs text-text-medium mt-0.5">
                    Total Gross: {formatINR(selectedBatch.batch.total_gross)} | Gateway Fees: {formatINR(selectedBatch.batch.total_fee + selectedBatch.batch.total_tax, true)} | Net Bank Payout: {formatINR(selectedBatch.batch.total_net)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
                      window.open(`${apiBase}/api/admin/payments/settlements/${selectedBatch.batch.id}/export-csv`, '_blank');
                    }}
                    className="text-xs h-8 px-3 gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download audit report</span>
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={async () => {
                      try {
                        const updated = await api.reconcileAdminSettlementBatch(selectedBatch.batch.id);
                        toast.success(`Batch ${updated.batch_reference} re-reconciled!`);
                        const detail = await api.getAdminSettlementBatchDetail(selectedBatch.batch.id);
                        setSelectedBatch(detail);
                      } catch (err: unknown) {
                        toast.error(err instanceof Error ? err.message : 'Re-reconciliation failed');
                      }
                    }}
                    className="text-xs h-8 px-3 gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Re-check</span>
                  </Button>
                </div>
              </div>

              {/* Entries Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border text-text-medium font-semibold bg-canvas">
                      <th className="py-2.5 px-3">Provider Payment ID</th>
                      <th className="py-2.5 px-3">Bank UTR / ARN</th>
                      <th className="py-2.5 px-3 text-right">Gross (INR)</th>
                      <th className="py-2.5 px-3 text-right">Fee & GST</th>
                      <th className="py-2.5 px-3 text-right">Net payout</th>
                      <th className="py-2.5 px-3">Internal match</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Discrepancy / Resolution note</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedBatch.entries.map((e) => (
                      <tr key={e.id} className="hover:bg-canvas">
                        <td className="py-2.5 px-3 font-mono font-bold text-text-high">{e.provider_payment_id}</td>
                        <td className="py-2.5 px-3 font-mono text-text-medium">{e.provider_arn_utr || '—'}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-text-high">{formatINR(e.gross_amount)}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-text-medium">
                          {formatINR(e.fee_amount + e.tax_amount, true)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-primary">
                          {formatINR(e.net_amount)}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-text-medium">
                          {e.transaction_ref || <span className="text-amber-600 font-sans italic">Not matched</span>}
                        </td>
                        <td className="py-2.5 px-3">{renderStatusBadge(e.status)}</td>
                        <td className="py-2.5 px-3 text-[11px] text-text-medium max-w-xs">
                          {e.discrepancy_reason ? (
                            <span className="text-destructive font-medium">{e.discrepancy_reason}</span>
                          ) : e.resolution_notes ? (
                            <span className="text-emerald-700 italic">Resolved: {e.resolution_notes}</span>
                          ) : (
                            <span className="text-emerald-600">Reconciled</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {e.status !== 'matched' && (
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setResolveModalEntry(e);
                                setResolutionNote('');
                              }}
                              className="text-[10px] h-6 px-2 text-primary border-primary/30 hover:bg-primary/10"
                            >
                              Resolve
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: REFUNDS & DISPUTES */}
      {/* ========================================================================= */}
      {activeTab === 'refunds' && (
        <Card className="p-5 bg-surface border border-border flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="text-base font-bold text-text-high">Processed refunds & dispute records</h2>
              <p className="text-xs text-text-medium mt-0.5">
                Every refund requires authorization, amount boundary checks, and logs an immutable audit event.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-text-medium">
              {refunds.length} total refund records
            </span>
          </div>

          {refundsLoading && (
            <div className="flex items-center gap-2 text-xs text-text-medium py-1">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
              <span>Refreshing refund records...</span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-canvas border-b border-border text-text-medium font-semibold">
                  <th className="py-3 px-4">Refund Ref</th>
                  <th className="py-3 px-4">Original Transaction</th>
                  <th className="py-3 px-4">Business</th>
                  <th className="py-3 px-4 text-right">Amount (INR)</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Admin Notes</th>
                  <th className="py-3 px-4 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {refunds.map((r) => (
                  <tr key={r.id} className="hover:bg-canvas">
                    <td className="py-3 px-4 font-mono font-bold text-text-high">{r.refund_ref}</td>
                    <td className="py-3 px-4 font-mono text-text-medium">{r.transaction_ref}</td>
                    <td className="py-3 px-4 font-medium text-text-high">{r.shop_name}</td>
                    <td className="py-3 px-4 text-right font-bold text-rose-600">{formatINR(r.amount)}</td>
                    <td className="py-3 px-4 capitalize text-text-medium">{r.reason.replace('_', ' ')}</td>
                    <td className="py-3 px-4">{renderStatusBadge(r.status)}</td>
                    <td className="py-3 px-4 text-[11px] text-text-medium italic">{r.admin_notes || '—'}</td>
                    <td className="py-3 px-4 text-right text-text-medium">{r.created_at}</td>
                  </tr>
                ))}
                {refunds.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs text-text-medium">
                      No refunds have been issued.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: GST TAX INVOICES */}
      {/* ========================================================================= */}
      {activeTab === 'invoices' && (
        <Card className="p-5 bg-surface border border-border flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="text-base font-bold text-text-high">B2B GST tax invoices & credit notes</h2>
              <p className="text-xs text-text-medium mt-0.5">
                Compliant with Indian GST rules: SAC 998314 (Information Technology Software Services). Intra-state: CGST 9% + SGST 9%; Inter-state: IGST 18%.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-text-medium">
              {invoices.length} issued invoices
            </span>
          </div>

          {invoicesLoading && (
            <div className="flex items-center gap-2 text-xs text-text-medium py-1">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
              <span>Refreshing GST tax invoices...</span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-canvas border-b border-border text-text-medium font-semibold">
                  <th className="py-3 px-4">Invoice Number</th>
                  <th className="py-3 px-4">Customer Business</th>
                  <th className="py-3 px-4">Place of Supply</th>
                  <th className="py-3 px-4 text-right">Taxable value</th>
                  <th className="py-3 px-4 text-right">CGST</th>
                  <th className="py-3 px-4 text-right">SGST</th>
                  <th className="py-3 px-4 text-right">IGST</th>
                  <th className="py-3 px-4 text-right">Total Invoice</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-canvas">
                    <td className="py-3 px-4 font-mono font-bold text-text-high">{inv.invoice_number}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-text-high">{inv.shop_name}</div>
                      <div className="text-[10px] text-text-medium font-mono">{inv.customer_gstin || 'Unregistered B2B'}</div>
                    </td>
                    <td className="py-3 px-4 text-text-medium">{inv.place_of_supply}</td>
                    <td className="py-3 px-4 text-right font-mono">{formatINR(inv.taxable_amount)}</td>
                    <td className="py-3 px-4 text-right font-mono text-text-medium">{formatINR(inv.cgst_amount)}</td>
                    <td className="py-3 px-4 text-right font-mono text-text-medium">{formatINR(inv.sgst_amount)}</td>
                    <td className="py-3 px-4 text-right font-mono text-text-medium">{formatINR(inv.igst_amount)}</td>
                    <td className="py-3 px-4 text-right font-bold text-primary">{formatINR(inv.total_invoice_amount)}</td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="secondary"
                        onClick={() => setViewInvoiceModal(inv)}
                        className="text-[11px] h-7 px-2.5 gap-1"
                      >
                        <Printer className="w-3 h-3" />
                        <span>Print</span>
                      </Button>
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-xs text-text-medium">
                      No tax invoices generated yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: GATEWAY SETTINGS & WEBHOOKS */}
      {/* ========================================================================= */}
      {activeTab === 'gateway' && gatewayConfig && (
        <div className="flex flex-col gap-6 max-w-4xl">
          <Card className="p-6 bg-surface border border-border flex flex-col gap-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-text-high">{gatewayConfig.gateway_name} Configuration</h2>
                <p className="text-xs text-text-medium mt-0.5">
                  Server-side gateway adapter status and security credential verification. Secrets are never sent to the browser.
                </p>
              </div>
              {gatewayConfig.is_live_configured ? (
                <Badge variant="success" dot>Live Production Credentials</Badge>
              ) : (
                <Badge variant="warning" dot>Sandbox / Demo Mode</Badge>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-[8px] bg-canvas border border-border">
                <span className="text-text-medium">API Key ID</span>
                <div className="font-mono font-bold text-text-high mt-1 text-sm">{gatewayConfig.key_id_preview}</div>
              </div>

              <div className="p-3.5 rounded-[8px] bg-canvas border border-border">
                <span className="text-text-medium">Webhook HMAC-SHA256 Status</span>
                <div className="font-bold text-text-high mt-1 text-sm flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{gatewayConfig.webhook_configured ? 'Active & Signature Verified' : 'Standard Sandbox Verification'}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-[8px] bg-canvas border border-border">
                <span className="text-text-medium">Store BI Billing Legal Entity GSTIN</span>
                <div className="font-mono font-bold text-text-high mt-1 text-sm">{gatewayConfig.supplier_gstin}</div>
              </div>

              <div className="p-3.5 rounded-[8px] bg-canvas border border-border">
                <span className="text-text-medium">Place of Supply (Supplier State)</span>
                <div className="font-bold text-text-high mt-1 text-sm">{gatewayConfig.supplier_state}</div>
              </div>
            </div>

            {/* Webhook Endpoint Box */}
            <div className="p-4 rounded-[8px] bg-canvas border border-border flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-high">Public Webhook Ingestion URL:</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(gatewayConfig.webhook_endpoint_url);
                    setCopiedWebhook(true);
                    setTimeout(() => setCopiedWebhook(false), 2000);
                  }}
                  className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline"
                >
                  {copiedWebhook ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedWebhook ? 'Copied!' : 'Copy URL'}</span>
                </button>
              </div>
              <div className="font-mono text-xs p-2.5 bg-surface border border-border rounded text-text-high break-all select-all">
                {gatewayConfig.webhook_endpoint_url}
              </div>
              <p className="text-[11px] text-text-medium">
                Configure this URL in your Razorpay Dashboard &rarr; Settings &rarr; Webhooks. Supported events:{' '}
                <span className="font-mono">payment.captured</span>, <span className="font-mono">payment.failed</span>,{' '}
                <span className="font-mono">refund.processed</span>, <span className="font-mono">settlement.processed</span>.
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: TRANSACTION DETAIL DRAWER */}
      {/* ========================================================================= */}
      {selectedTxn && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-[12px] max-w-2xl w-full p-6 shadow-xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-text-high">{selectedTxn.transaction_ref}</h3>
                  {renderStatusBadge(selectedTxn.status)}
                </div>
                <p className="text-xs text-text-medium mt-0.5">{selectedTxn.shop_name} — {selectedTxn.plan_name}</p>
              </div>
              <button
                onClick={() => setSelectedTxn(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-text-medium hover:bg-canvas hover:text-text-high"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-canvas rounded-[6px] border border-border">
                <span className="text-text-medium">Gross Amount</span>
                <div className="text-base font-bold text-text-high mt-1">{formatINR(selectedTxn.amount)}</div>
              </div>
              <div className="p-3 bg-canvas rounded-[6px] border border-border">
                <span className="text-text-medium">Gateway Processing Fee</span>
                <div className="text-base font-bold text-text-high mt-1">{formatINR(selectedTxn.gateway_fee, true)}</div>
              </div>
              <div className="p-3 bg-canvas rounded-[6px] border border-border">
                <span className="text-text-medium">Net Settlement Payout</span>
                <div className="text-base font-bold text-primary mt-1">{formatINR(selectedTxn.net_settlement)}</div>
              </div>
            </div>

            <div className="flex flex-col gap-2 text-xs border border-border rounded-[8px] p-3.5 bg-canvas">
              <div className="flex items-center justify-between py-1 border-b border-border">
                <span className="text-text-medium">Gateway Payment Reference</span>
                <span className="font-mono font-bold text-text-high">{selectedTxn.gateway_payment_id || '—'}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border">
                <span className="text-text-medium">Order ID</span>
                <span className="font-mono text-text-high">{selectedTxn.gateway_order_id || '—'}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border">
                <span className="text-text-medium">Payment Method</span>
                <span className="font-semibold text-text-high uppercase">{selectedTxn.payment_method}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border">
                <span className="text-text-medium">Settlement Status</span>
                <span>{renderStatusBadge(selectedTxn.settlement_status)}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border">
                <span className="text-text-medium">Date & Time</span>
                <span className="text-text-high">{selectedTxn.created_at}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-text-medium">GST Tax Invoice</span>
                <span className="font-mono font-bold text-primary">{selectedTxn.invoice_number || 'Auto-generated'}</span>
              </div>
            </div>

            {selectedTxn.failure_code && (
              <div className="p-3 rounded-[6px] bg-destructive/10 border border-destructive/30 text-xs text-destructive">
                <div className="font-bold">Failure Diagnostics: {selectedTxn.failure_code}</div>
                <p className="mt-0.5">{selectedTxn.failure_reason}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-border">
              {selectedTxn.status === 'captured' ? (
                <Button
                  variant="destructive"
                  onClick={() => {
                    setRefundModalTxn(selectedTxn);
                    setRefundAmount(String(selectedTxn.amount - selectedTxn.refunded_amount));
                    setSelectedTxn(null);
                  }}
                  className="text-xs h-9 px-4"
                >
                  Issue refund
                </Button>
              ) : (
                <div />
              )}

              <Button
                variant="secondary"
                onClick={() => setSelectedTxn(null)}
                className="text-xs h-9 px-4"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ISSUE REFUND MODAL */}
      {/* ========================================================================= */}
      {refundModalTxn && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-[12px] max-w-md w-full p-6 shadow-xl flex flex-col gap-4">
            <div>
              <h3 className="text-base font-bold text-text-high">Issue refund for {refundModalTxn.transaction_ref}</h3>
              <p className="text-xs text-text-medium mt-1">
                Total Transaction: <span className="font-bold text-text-high">{formatINR(refundModalTxn.amount)}</span> | Remaining Refundable: <span className="font-bold text-emerald-700">{formatINR(refundModalTxn.amount - refundModalTxn.refunded_amount)}</span>
              </p>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div>
                <label className="font-semibold text-text-high block mb-1">Refund Amount in INR (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  max={refundModalTxn.amount - refundModalTxn.refunded_amount}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-canvas border border-border rounded-[6px] text-text-high text-sm font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="font-semibold text-text-high block mb-1">Reason for Refund</label>
                <select
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-3 py-2 bg-canvas border border-border rounded-[6px] text-text-high"
                >
                  <option value="customer_request">Customer Cancellation / Request</option>
                  <option value="accidental_duplicate">Accidental Duplicate Charge</option>
                  <option value="billing_error">Billing Rate / Plan Adjustment</option>
                  <option value="store_closure">Kirana Store Closure / Inactivity</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-text-high block mb-1">Admin Investigation Notes</label>
                <textarea
                  rows={2}
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                  placeholder="Reasoning, phone confirmation with merchant, or promo code concession note..."
                  className="w-full px-3 py-2 bg-canvas border border-border rounded-[6px] text-text-high text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                variant="secondary"
                onClick={() => setRefundModalTxn(null)}
                disabled={processingRefund}
                className="text-xs h-9 px-4"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleProcessRefund}
                disabled={processingRefund}
                className="text-xs h-9 px-4"
              >
                {processingRefund ? 'Processing...' : `Authorize refund (${formatINR(parseFloat(refundAmount) || 0)})`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: UPLOAD SETTLEMENT CSV MODAL */}
      {/* ========================================================================= */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-[12px] max-w-lg w-full p-6 shadow-xl flex flex-col gap-4">
            <div>
              <h3 className="text-base font-bold text-text-high">Import provider settlement file</h3>
              <p className="text-xs text-text-medium mt-1">
                Upload CSV file from Razorpay, Pine Labs, or Bank Settlement statement. The system validates entries and reconciles with internal transactions automatically.
              </p>
            </div>

            <div className="border-2 border-dashed border-border rounded-[8px] p-6 text-center bg-canvas flex flex-col items-center justify-center gap-2">
              <Upload className="w-8 h-8 text-primary" />
              <div className="text-xs font-semibold text-text-high">
                {uploading ? 'Parsing and reconciling entries...' : 'Choose or drag & drop settlement CSV file'}
              </div>
              <input
                type="file"
                accept=".csv"
                disabled={uploading}
                onChange={handleFileUpload}
                className="text-xs text-text-medium mt-2"
              />
            </div>

            <div className="p-3 rounded-[6px] bg-canvas border border-border text-[11px] text-text-medium flex flex-col gap-1">
              <div className="font-bold text-text-high">Supported CSV format columns:</div>
              <div>• <span className="font-mono">payment_id</span>: Razorpay or provider payment ID (pay_...)</div>
              <div>• <span className="font-mono">amount</span>: Gross settled amount</div>
              <div>• <span className="font-mono">fee, tax, net</span>: Processing charges and bank credit</div>
              <div>• <span className="font-mono">utr</span>: Bank Unique Transaction Reference (optional)</div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="secondary"
                onClick={() => setUploadModalOpen(false)}
                disabled={uploading}
                className="text-xs h-9 px-4"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: RESOLVE DISCREPANCY MODAL */}
      {/* ========================================================================= */}
      {resolveModalEntry && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-[12px] max-w-md w-full p-6 shadow-xl flex flex-col gap-4">
            <div>
              <h3 className="text-base font-bold text-text-high">Resolve settlement discrepancy</h3>
              <p className="text-xs text-destructive mt-1 font-semibold">
                Reason: {resolveModalEntry.discrepancy_reason}
              </p>
            </div>

            <div className="text-xs flex flex-col gap-2">
              <div className="p-3 bg-canvas rounded-[6px] border border-border flex justify-between">
                <span className="text-text-medium">Provider ID:</span>
                <span className="font-mono font-bold text-text-high">{resolveModalEntry.provider_payment_id}</span>
              </div>
              <div className="p-3 bg-canvas rounded-[6px] border border-border flex justify-between">
                <span className="text-text-medium">Provider Net Amount:</span>
                <span className="font-mono font-bold text-primary">{formatINR(resolveModalEntry.net_amount)}</span>
              </div>

              <div>
                <label className="font-semibold text-text-high block mb-1">
                  Investigation & Resolution Note (Required)
                </label>
                <textarea
                  rows={3}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Explained fee difference, verified bank statement manually, or marked as manual wholesale adjustment..."
                  className="w-full px-3 py-2 bg-canvas border border-border rounded-[6px] text-text-high text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                variant="secondary"
                onClick={() => setResolveModalEntry(null)}
                disabled={resolving}
                className="text-xs h-9 px-4"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleResolveDiscrepancy}
                disabled={resolving}
                className="text-xs h-9 px-4"
              >
                {resolving ? 'Saving...' : 'Mark as resolved'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: PRINTABLE GST TAX INVOICE MODAL */}
      {/* ========================================================================= */}
      {viewInvoiceModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-[12px] max-w-2xl w-full p-8 shadow-2xl flex flex-col gap-6 max-h-[92vh] overflow-y-auto">
            {/* Header Controls */}
            <div className="flex items-center justify-between border-b border-border pb-4 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <span className="text-base font-bold text-text-high">GST Tax Invoice Preview</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  onClick={() => window.print()}
                  className="text-xs h-8 px-3 gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print invoice</span>
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setViewInvoiceModal(null)}
                  className="text-xs h-8 px-3"
                >
                  Close
                </Button>
              </div>
            </div>

            {/* Printable Document Sheet */}
            <div className="p-6 bg-white text-slate-900 border border-slate-300 rounded-[6px] shadow-sm flex flex-col gap-5 text-xs font-sans">
              {/* Document Title */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                <div>
                  <h1 className="text-lg font-black tracking-tight text-slate-950 uppercase">TAX INVOICE</h1>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    Original for Recipient | B2B Software Subscription
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-bold text-slate-900">{viewInvoiceModal.invoice_number}</div>
                  <div className="text-[11px] text-slate-600">Date: {viewInvoiceModal.invoice_date}</div>
                </div>
              </div>

              {/* Supplier & Customer Details Grid */}
              <div className="grid grid-cols-2 gap-6 border-b border-slate-200 pb-4">
                {/* Supplier */}
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Sold By (Supplier):</div>
                  <div className="font-bold text-slate-900 text-sm">{viewInvoiceModal.supplier_legal_name}</div>
                  <div className="text-slate-700 mt-1">{viewInvoiceModal.supplier_address}</div>
                  <div className="mt-2 font-mono text-[11px]">
                    <span className="font-bold">GSTIN:</span> {viewInvoiceModal.supplier_gstin}
                  </div>
                  <div className="text-slate-700">State: {viewInvoiceModal.supplier_state || 'Maharashtra (MH-27)'}</div>
                </div>

                {/* Customer */}
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Billed To (Customer):</div>
                  <div className="font-bold text-slate-900 text-sm">{viewInvoiceModal.shop_name}</div>
                  <div className="text-slate-700 mt-0.5">{viewInvoiceModal.customer_owner_name || 'Store Owner'}</div>
                  <div className="mt-2 font-mono text-[11px]">
                    <span className="font-bold">GSTIN:</span> {viewInvoiceModal.customer_gstin || 'Unregistered Retail Kirana'}
                  </div>
                  <div className="text-slate-700">Place of Supply: {viewInvoiceModal.place_of_supply}</div>
                </div>
              </div>

              {/* Line Items Table */}
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-y border-slate-300 font-bold text-slate-800">
                    <th className="py-2 px-2">Description</th>
                    <th className="py-2 px-2">SAC</th>
                    <th className="py-2 px-2 text-right">Taxable value</th>
                    {viewInvoiceModal.is_interstate ? (
                      <th className="py-2 px-2 text-right">IGST (18%)</th>
                    ) : (
                      <>
                        <th className="py-2 px-2 text-right">CGST (9%)</th>
                        <th className="py-2 px-2 text-right">SGST (9%)</th>
                      </>
                    )}
                    <th className="py-2 px-2 text-right">Total (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="py-3 px-2 font-medium">{viewInvoiceModal.description_of_service}</td>
                    <td className="py-3 px-2 font-mono">{viewInvoiceModal.sac_code}</td>
                    <td className="py-3 px-2 text-right font-mono">{formatINR(viewInvoiceModal.taxable_amount)}</td>
                    {viewInvoiceModal.is_interstate ? (
                      <td className="py-3 px-2 text-right font-mono">{formatINR(viewInvoiceModal.igst_amount)}</td>
                    ) : (
                      <>
                        <td className="py-3 px-2 text-right font-mono">{formatINR(viewInvoiceModal.cgst_amount)}</td>
                        <td className="py-3 px-2 text-right font-mono">{formatINR(viewInvoiceModal.sgst_amount)}</td>
                      </>
                    )}
                    <td className="py-3 px-2 text-right font-mono font-bold text-slate-950">
                      {formatINR(viewInvoiceModal.total_invoice_amount)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Total Calculation Summary */}
              <div className="flex justify-end pt-2 border-t-2 border-slate-900">
                <div className="w-64 flex flex-col gap-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Taxable Value:</span>
                    <span className="font-mono font-medium">{formatINR(viewInvoiceModal.taxable_amount)}</span>
                  </div>
                  {viewInvoiceModal.is_interstate ? (
                    <div className="flex justify-between">
                      <span className="text-slate-600">IGST (18%):</span>
                      <span className="font-mono">{formatINR(viewInvoiceModal.igst_amount)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-600">CGST (9%):</span>
                        <span className="font-mono">{formatINR(viewInvoiceModal.cgst_amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">SGST (9%):</span>
                        <span className="font-mono">{formatINR(viewInvoiceModal.sgst_amount)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between pt-2 border-t border-slate-300 font-bold text-sm text-slate-950">
                    <span>Total Amount:</span>
                    <span className="font-mono">{formatINR(viewInvoiceModal.total_invoice_amount)}</span>
                  </div>
                </div>
              </div>

              {/* Signatory Footer */}
              <div className="flex items-end justify-between pt-6 mt-4 border-t border-slate-200">
                <div className="text-[10px] text-slate-500 max-w-xs">
                  This is a computer-generated tax invoice. Registered under the Central Goods and Services Tax Act, 2017.
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-700 uppercase">For Store BI Technologies Pvt Ltd</div>
                  <div className="mt-6 text-[11px] font-medium text-slate-800">Authorized Signatory</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
