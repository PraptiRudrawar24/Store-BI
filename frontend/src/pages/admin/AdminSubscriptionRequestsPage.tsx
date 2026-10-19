import * as React from 'react';
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  RefreshCw,
  Eye,
  Check,
  X,
  Building2,
  CreditCard,
  AlertTriangle,
  History,
  FileCheck2,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { useToast } from '../../components/ui/Toast';
import { formatINR } from '../../utils';
import { api } from '../../api/client';
import type {
  AdminSubscriptionRequestItem,
  AdminSubscriptionRequestsResponse,
  AdminSubscriptionRequestDetailResponse,
} from '../../api/client';

export function AdminSubscriptionRequestsPage() {
  const toast = useToast();

  // Filter & Search states
  const [statusFilter, setStatusFilter] = React.useState<string>('pending_review');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [planFilter, setPlanFilter] = React.useState<string>('all');
  const [page, setPage] = React.useState<number>(1);
  const [loading, setLoading] = React.useState<boolean>(true);

  // Data states
  const [data, setData] = React.useState<AdminSubscriptionRequestsResponse | null>(null);

  // Modals state
  const [detailModalOpen, setDetailModalOpen] = React.useState<boolean>(false);
  const [selectedRequestId, setSelectedRequestId] = React.useState<number | null>(null);
  const [detailLoading, setDetailLoading] = React.useState<boolean>(false);
  const [detailData, setDetailData] = React.useState<AdminSubscriptionRequestDetailResponse | null>(null);

  // Approve modal state
  const [approveModalItem, setApproveModalItem] = React.useState<AdminSubscriptionRequestItem | null>(null);
  const [confirmVerified, setConfirmVerified] = React.useState<boolean>(false);
  const [approvePaymentRef, setApprovePaymentRef] = React.useState<string>('');
  const [approveAdminNotes, setApproveAdminNotes] = React.useState<string>('');
  const [approving, setApproving] = React.useState<boolean>(false);

  // Reject modal state
  const [rejectModalItem, setRejectModalItem] = React.useState<AdminSubscriptionRequestItem | null>(null);
  const [rejectionReasonPreset, setRejectionReasonPreset] = React.useState<string>('utr_not_found');
  const [customRejectionReason, setCustomRejectionReason] = React.useState<string>('');
  const [rejectAdminNotes, setRejectAdminNotes] = React.useState<string>('');
  const [rejecting, setRejecting] = React.useState<boolean>(false);

  // Load requests
  const fetchRequests = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAdminSubscriptionRequests({
        status: statusFilter,
        search: searchQuery.trim() || undefined,
        plan: planFilter !== 'all' ? planFilter : undefined,
        page,
        page_size: 20,
      });
      setData(res);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load subscription requests');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery, planFilter, page, toast]);

  React.useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Load request detail
  const handleOpenDetail = async (requestId: number) => {
    setSelectedRequestId(requestId);
    setDetailModalOpen(true);
    setDetailLoading(true);
    try {
      const res = await api.getAdminSubscriptionRequestDetail(requestId);
      setDetailData(res);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load request details');
      setDetailModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // Open Approve Modal
  const handleOpenApprove = (item: AdminSubscriptionRequestItem) => {
    setApproveModalItem(item);
    setConfirmVerified(false);
    setApprovePaymentRef(item.utr_number || '');
    setApproveAdminNotes('');
  };

  // Submit Approval
  const handleConfirmApprove = async () => {
    if (!approveModalItem) return;
    if (!confirmVerified) {
      toast.info('You must verify the payment against bank records before approving');
      return;
    }

    setApproving(true);
    try {
      const res = await api.adminApproveSubscriptionRequest(approveModalItem.id, {
        confirm_verified: true,
        payment_reference: approvePaymentRef.trim() || undefined,
        admin_notes: approveAdminNotes.trim() || undefined,
      });
      toast.success(res.message || 'Subscription request approved successfully! Pro access active for 30 days.');
      setApproveModalItem(null);
      if (detailModalOpen && selectedRequestId === approveModalItem.id) {
        handleOpenDetail(approveModalItem.id);
      }
      fetchRequests();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve subscription request');
    } finally {
      setApproving(false);
    }
  };

  // Open Reject Modal
  const handleOpenReject = (item: AdminSubscriptionRequestItem) => {
    setRejectModalItem(item);
    setRejectionReasonPreset('utr_not_found');
    setCustomRejectionReason('');
    setRejectAdminNotes('');
  };

  // Submit Rejection
  const handleConfirmReject = async () => {
    if (!rejectModalItem) return;
    let finalReason = '';
    if (rejectionReasonPreset === 'custom') {
      finalReason = customRejectionReason.trim();
    } else if (rejectionReasonPreset === 'utr_not_found') {
      finalReason = 'Transaction UTR / Reference was not found in company bank statement.';
    } else if (rejectionReasonPreset === 'amount_mismatch') {
      finalReason = 'Received payment amount does not match the ₹1,299 plan price.';
    } else if (rejectionReasonPreset === 'duplicate_claim') {
      finalReason = 'This transaction reference has already been claimed or approved previously.';
    } else if (rejectionReasonPreset === 'incomplete_payment') {
      finalReason = 'Payment was declined or marked failed by your issuing bank.';
    }

    if (!finalReason) {
      toast.info('Please provide a specific rejection reason for the merchant');
      return;
    }

    setRejecting(true);
    try {
      const res = await api.adminRejectSubscriptionRequest(rejectModalItem.id, {
        rejection_reason: finalReason,
        admin_notes: rejectAdminNotes.trim() || undefined,
      });
      toast.info(res.message || 'Subscription request rejected. Merchant has been notified.');
      setRejectModalItem(null);
      if (detailModalOpen && selectedRequestId === rejectModalItem.id) {
        handleOpenDetail(rejectModalItem.id);
      }
      fetchRequests();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject subscription request');
    } finally {
      setRejecting(false);
    }
  };

  const counts = data?.counts || { pending: 0, approved: 0, rejected: 0, all: 0 };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-text-high">
                Subscription Access Requests
              </h1>
              <p className="text-xs sm:text-sm text-text-medium mt-0.5">
                Review and approve merchant ₹1,299 All-Features Pro QR payments with bank record verification
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchRequests}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg border border-border bg-canvas hover:bg-surface text-text-high text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Review Card */}
        <Card
          className={`p-4 border transition-all cursor-pointer ${
            statusFilter === 'pending_review'
              ? 'ring-2 ring-amber-500 bg-amber-500/5 border-amber-300 dark:border-amber-700'
              : 'hover:border-amber-300'
          }`}
          onClick={() => {
            setStatusFilter('pending_review');
            setPage(1);
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              Pending Review
            </span>
            <span className="relative flex h-2.5 w-2.5">
              {counts.pending > 0 && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              )}
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400">
              {counts.pending}
            </span>
            <span className="text-xs text-text-medium">awaiting verification</span>
          </div>
          <p className="text-[11px] text-text-medium mt-1">Requires bank transaction verification</p>
        </Card>

        {/* Approved Card */}
        <Card
          className={`p-4 border transition-all cursor-pointer ${
            statusFilter === 'approved'
              ? 'ring-2 ring-emerald-500 bg-emerald-500/5 border-emerald-300 dark:border-emerald-700'
              : 'hover:border-emerald-300'
          }`}
          onClick={() => {
            setStatusFilter('approved');
            setPage(1);
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Approved (Active)
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {counts.approved}
            </span>
            <span className="text-xs text-text-medium">granted access</span>
          </div>
          <p className="text-[11px] text-text-medium mt-1">All-Features Pro 30-day entitlements</p>
        </Card>

        {/* Rejected Card */}
        <Card
          className={`p-4 border transition-all cursor-pointer ${
            statusFilter === 'rejected'
              ? 'ring-2 ring-rose-500 bg-rose-500/5 border-rose-300 dark:border-rose-700'
              : 'hover:border-rose-300'
          }`}
          onClick={() => {
            setStatusFilter('rejected');
            setPage(1);
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
              Rejected
            </span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400">
              {counts.rejected}
            </span>
            <span className="text-xs text-text-medium">declined</span>
          </div>
          <p className="text-[11px] text-text-medium mt-1">Invalid UTR / missing deposits</p>
        </Card>

        {/* All Requests Card */}
        <Card
          className={`p-4 border transition-all cursor-pointer ${
            statusFilter === 'all'
              ? 'ring-2 ring-primary bg-primary/5 border-primary/30'
              : 'hover:border-primary/30'
          }`}
          onClick={() => {
            setStatusFilter('all');
            setPage(1);
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-medium uppercase tracking-wider">
              Total Submissions
            </span>
            <Clock className="w-4 h-4 text-text-medium" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-text-high">
              {counts.all}
            </span>
            <span className="text-xs text-text-medium">historical</span>
          </div>
          <p className="text-[11px] text-text-medium mt-1">Complete subscription lifecycle audit</p>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 border border-border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-canvas rounded-lg border border-border">
            {[
              { id: 'pending_review', label: 'Pending Review', count: counts.pending },
              { id: 'approved', label: 'Approved', count: counts.approved },
              { id: 'rejected', label: 'Rejected', count: counts.rejected },
              { id: 'all', label: 'All Requests', count: counts.all },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.id);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  statusFilter === tab.id
                    ? 'bg-surface text-primary shadow-xs font-bold border border-border'
                    : 'text-text-medium hover:text-text-high'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    statusFilter === tab.id
                      ? 'bg-primary/10 text-primary'
                      : 'bg-canvas text-text-medium'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Input & Plan Filter */}
          <div className="flex items-center gap-2 flex-1 max-w-lg">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-medium" />
              <input
                type="text"
                placeholder="Search by Ref (REQ-...), Store name, Customer, UTR..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 bg-canvas border border-border rounded-lg text-xs text-text-high placeholder:text-text-low focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-medium hover:text-text-high text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <select
              value={planFilter}
              onChange={(e) => {
                setPlanFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-canvas border border-border rounded-lg text-xs text-text-high focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Plans</option>
              <option value="All-Features Pro">All-Features Pro (₹1,299)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Main Table */}
      <Card className="border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-canvas border-b border-border text-text-medium font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Request Ref & Date</th>
                <th className="py-3 px-4">Customer & Store</th>
                <th className="py-3 px-4">Plan & Amount</th>
                <th className="py-3 px-4">Payment UTR / Mode</th>
                <th className="py-3 px-4">Store State</th>
                <th className="py-3 px-4">Review Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-text-medium">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span>Loading subscription requests...</span>
                    </div>
                  </td>
                </tr>
              ) : !data?.items || data.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-text-medium">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Clock className="w-8 h-8 text-text-low" />
                      <span className="font-semibold text-text-high">No subscription requests found</span>
                      <p className="text-xs text-text-low max-w-sm">
                        {statusFilter === 'pending_review'
                          ? 'Great job! There are currently no pending subscription access claims awaiting verification.'
                          : 'No subscription requests match the selected filters.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.items.map((item) => {
                  const isPending = item.status === 'pending_review';
                  const isApproved = item.status === 'approved';
                  const isRejected = item.status === 'rejected';

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-canvas/50 transition-colors cursor-pointer"
                      onClick={() => handleOpenDetail(item.id)}
                    >
                      {/* Request Ref & Date */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-primary flex items-center gap-1.5">
                          <span>{item.request_ref}</span>
                        </div>
                        <div className="text-[11px] text-text-medium mt-0.5">
                          {new Date(item.submitted_at).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </div>
                      </td>

                      {/* Customer & Store */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-text-high">
                          {item.store_name || `Store #${item.shop_id}`}
                        </div>
                        <div className="text-[11px] text-text-medium">
                          {item.customer_name || 'Merchant'} • {item.customer_phone || item.customer_email || 'N/A'}
                        </div>
                      </td>

                      {/* Plan & Amount */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-text-high">
                          {formatINR(item.amount)}
                        </div>
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          {item.plan_name} (30 Days)
                        </div>
                      </td>

                      {/* UTR / Mode */}
                      <td className="py-3.5 px-4">
                        {item.utr_number ? (
                          <div className="font-mono text-xs font-semibold text-text-high bg-canvas px-2 py-0.5 rounded border border-border inline-block">
                            {item.utr_number}
                          </div>
                        ) : (
                          <span className="text-[11px] text-text-low italic">No UTR entered</span>
                        )}
                        <div className="text-[11px] text-text-medium mt-0.5">
                          Via {item.payment_method?.toUpperCase() || 'UPI QR'}
                        </div>
                      </td>

                      {/* Store State */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            item.current_subscription_status === 'Pro Active'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : item.current_subscription_status === 'Trial Active'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                              : item.current_subscription_status === 'Trial Expired' ||
                                item.current_subscription_status === 'Subscription Expired'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'
                              : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300'
                          }`}
                        >
                          {item.current_subscription_status || 'Expired'}
                        </span>
                      </td>

                      {/* Request Status */}
                      <td className="py-3.5 px-4">
                        {isPending && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-300 dark:border-amber-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Pending Review
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700">
                            <Check className="w-3 h-3 text-emerald-600" />
                            Approved
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-300 dark:border-rose-700">
                            <X className="w-3 h-3 text-rose-600" />
                            Rejected
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            className="h-8 px-2 rounded hover:bg-canvas text-text-medium hover:text-text-high transition-colors"
                            onClick={() => handleOpenDetail(item.id)}
                            title="View Full Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {isPending && (
                            <>
                              <button
                                type="button"
                                className="h-8 px-2.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold transition-colors"
                                onClick={() => handleOpenReject(item)}
                              >
                                Reject
                              </button>
                              <button
                                type="button"
                                className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
                                onClick={() => handleOpenApprove(item)}
                              >
                                Approve
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {data && data.total_pages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between text-xs text-text-medium">
            <span>
              Showing {(data.page - 1) * data.page_size + 1} to{' '}
              {Math.min(data.page * data.page_size, data.total)} of {data.total} requests
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={data.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-border bg-canvas hover:bg-surface text-text-high text-xs font-semibold disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-2 font-semibold text-text-high">
                {data.page} / {data.total_pages}
              </span>
              <button
                type="button"
                disabled={data.page >= data.total_pages}
                onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-border bg-canvas hover:bg-surface text-text-high text-xs font-semibold disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* ========================================================================= */}
      {/* DETAIL MODAL */}
      {/* ========================================================================= */}
      {detailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-surface border border-border rounded-xl shadow-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-canvas/40">
              <div className="flex items-center gap-2.5">
                <FileCheck2 className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="font-bold text-base text-text-high">
                    Subscription Request Details
                  </h3>
                  <span className="text-xs text-text-medium font-mono">
                    {detailData?.request.request_ref || `Request #${selectedRequestId}`}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="p-1 rounded-lg text-text-medium hover:text-text-high hover:bg-canvas"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {detailLoading || !detailData ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-text-medium">Loading request history...</span>
                </div>
              ) : (
                <>
                  {/* Status Banner */}
                  <div
                    className={`p-4 rounded-xl border flex items-start gap-3 ${
                      detailData.request.status === 'pending_review'
                        ? 'bg-amber-500/10 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300'
                        : detailData.request.status === 'approved'
                        ? 'bg-emerald-500/10 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300'
                        : 'bg-rose-500/10 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-300'
                    }`}
                  >
                    {detailData.request.status === 'pending_review' && (
                      <AlertCircle className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
                    )}
                    {detailData.request.status === 'approved' && (
                      <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500 mt-0.5" />
                    )}
                    {detailData.request.status === 'rejected' && (
                      <XCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
                    )}
                    <div className="flex-1 text-xs">
                      <div className="font-bold text-sm capitalize">
                        Status: {detailData.request.status.replace('_', ' ')}
                      </div>
                      {detailData.request.status === 'pending_review' && (
                        <p className="mt-1">
                          This customer clicked <strong>“I Have Paid”</strong> and is awaiting admin verification against bank records.
                        </p>
                      )}
                      {detailData.request.status === 'approved' && (
                        <p className="mt-1">
                          Approved by <strong>{detailData.request.reviewed_by_admin || 'Admin'}</strong> on{' '}
                          {detailData.request.reviewed_at
                            ? new Date(detailData.request.reviewed_at).toLocaleString('en-IN')
                            : 'N/A'}
                          . Payment reference: {detailData.request.payment_reference || 'N/A'}.
                        </p>
                      )}
                      {detailData.request.status === 'rejected' && (
                        <div className="mt-1 space-y-1">
                          <p>
                            Rejected by <strong>{detailData.request.reviewed_by_admin || 'Admin'}</strong> on{' '}
                            {detailData.request.reviewed_at
                              ? new Date(detailData.request.reviewed_at).toLocaleString('en-IN')
                              : 'N/A'}
                            .
                          </p>
                          <p className="font-semibold text-rose-700 dark:text-rose-300">
                            Reason: {detailData.request.rejection_reason}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Customer and Store Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Card className="p-4 border border-border space-y-2 bg-canvas/30">
                      <span className="text-xs font-bold text-text-medium uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5" /> Store & Account Info
                      </span>
                      <div className="text-xs space-y-1">
                        <div>
                          <span className="text-text-medium">Store Name: </span>
                          <span className="font-bold text-text-high">
                            {detailData.shop.name || detailData.shop.store_name || `Shop #${detailData.shop.id}`}
                          </span>
                        </div>
                        <div>
                          <span className="text-text-medium">Owner Name: </span>
                          <span className="font-medium text-text-high">
                            {detailData.shop.owner_name || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-text-medium">Phone: </span>
                          <span className="font-medium text-text-high">
                            {detailData.shop.phone || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-text-medium">Email: </span>
                          <span className="font-medium text-text-high">
                            {detailData.shop.email || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-text-medium">Store Registered: </span>
                          <span className="font-medium text-text-high">
                            {detailData.shop.created_at
                              ? new Date(detailData.shop.created_at).toLocaleDateString('en-IN')
                              : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4 border border-border space-y-2 bg-canvas/30">
                      <span className="text-xs font-bold text-text-medium uppercase tracking-wider flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5" /> Request Information
                      </span>
                      <div className="text-xs space-y-1">
                        <div>
                          <span className="text-text-medium">Plan Requested: </span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {detailData.request.plan_name} (30 Days)
                          </span>
                        </div>
                        <div>
                          <span className="text-text-medium">Amount: </span>
                          <span className="font-extrabold text-text-high">
                            {formatINR(detailData.request.amount)}
                          </span>
                        </div>
                        <div>
                          <span className="text-text-medium">Transaction UTR: </span>
                          <span className="font-mono font-bold text-primary">
                            {detailData.request.utr_number || 'None provided'}
                          </span>
                        </div>
                        <div>
                          <span className="text-text-medium">Submitted At: </span>
                          <span className="font-medium text-text-high">
                            {new Date(detailData.request.submitted_at).toLocaleString('en-IN')}
                          </span>
                        </div>
                        {detailData.request.customer_notes && (
                          <div className="pt-1 text-[11px] text-text-medium bg-canvas p-2 rounded border border-border">
                            <strong>Merchant Note:</strong> {detailData.request.customer_notes}
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>

                  {/* Customer Subscription Audit History */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-text-medium mb-2 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5" /> Subscription Lifecycle Events
                    </h4>
                    <div className="border border-border rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-canvas border-b border-border text-text-medium">
                          <tr>
                            <th className="py-2 px-3">Date</th>
                            <th className="py-2 px-3">Event</th>
                            <th className="py-2 px-3">Plan</th>
                            <th className="py-2 px-3">Actor</th>
                            <th className="py-2 px-3">Reference / Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y border-border">
                          {detailData.history.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-3 px-3 text-center text-text-low italic">
                                No prior subscription events recorded
                              </td>
                            </tr>
                          ) : (
                            detailData.history.map((h) => (
                              <tr key={h.id} className="hover:bg-canvas/40">
                                <td className="py-2 px-3 text-[11px] text-text-medium">
                                  {h.created_at ? new Date(h.created_at).toLocaleDateString('en-IN') : 'N/A'}
                                </td>
                                <td className="py-2 px-3 font-semibold text-text-high capitalize">
                                  {h.event_type.replace('_', ' ')}
                                </td>
                                <td className="py-2 px-3 text-emerald-600 dark:text-emerald-400 font-medium">
                                  {h.plan_name}
                                </td>
                                <td className="py-2 px-3 text-text-medium">
                                  {h.actor || 'system'}
                                </td>
                                <td className="py-2 px-3 text-[11px] text-text-medium font-mono">
                                  {h.reference_id || h.notes || '—'}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Reassurance Notice */}
                  <div className="p-3 bg-emerald-500/5 border border-emerald-200 dark:border-emerald-800/40 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      <strong>Data Preservation Guarantee:</strong> Expiration or rejection never affects merchant products, sales, expenses, invoices, or business analytics.
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 border-t border-border bg-canvas/40 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-border bg-canvas hover:bg-surface text-text-high text-xs font-semibold transition-colors"
              >
                Close
              </button>

              {detailData?.request.status === 'pending_review' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="px-3.5 py-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors"
                    onClick={() => {
                      if (data?.items) {
                        const it = data.items.find((x) => x.id === detailData.request.id);
                        if (it) handleOpenReject(it);
                      }
                    }}
                  >
                    Reject Request
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
                    onClick={() => {
                      if (data?.items) {
                        const it = data.items.find((x) => x.id === detailData.request.id);
                        if (it) handleOpenApprove(it);
                      }
                    }}
                  >
                    Approve Payment
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* APPROVE PAYMENT MODAL (WITH BANK RECORD CONFIRMATION CHECKBOX) */}
      {/* ========================================================================= */}
      {approveModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-emerald-500/10">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-text-high">
                  Approve Subscription Payment
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setApproveModalItem(null)}
                className="p-1 rounded-lg text-text-medium hover:text-text-high"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Summary of Store and Plan */}
              <div className="p-3 bg-canvas border border-border rounded-lg text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-text-medium">Merchant / Store:</span>
                  <span className="font-bold text-text-high">{approveModalItem.store_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-medium">Request Ref:</span>
                  <span className="font-mono text-primary font-bold">{approveModalItem.request_ref}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-medium">Plan:</span>
                  <span className="font-bold text-emerald-600">{approveModalItem.plan_name} (30 Days)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-medium">Amount:</span>
                  <span className="font-extrabold text-text-high">{formatINR(approveModalItem.amount)}</span>
                </div>
                {approveModalItem.utr_number && (
                  <div className="flex justify-between">
                    <span className="text-text-medium">Merchant Claimed UTR:</span>
                    <span className="font-mono font-bold text-text-high">{approveModalItem.utr_number}</span>
                  </div>
                )}
              </div>

              {/* Bank Verification Notice & Checkbox */}
              <div className="p-3.5 bg-amber-500/10 border border-amber-300 dark:border-amber-700 rounded-lg space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    <strong>Mandatory Banking Verification:</strong> Store BI subscriptions are admin-approved. You must verify that ₹1,299 was actually credited to the merchant bank account before approving.
                  </p>
                </div>

                <label className="flex items-start gap-2 pt-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    id="confirm-bank-verified"
                    checked={confirmVerified}
                    onChange={(e) => setConfirmVerified(e.target.checked)}
                    className="mt-0.5 rounded border-border text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <span className="text-xs font-semibold text-text-high">
                    I confirm that the ₹1,299 payment has been verified against the company's bank account records.
                  </span>
                </label>
              </div>

              {/* Optional Bank Reference / ARN */}
              <div>
                <label className="block text-xs font-medium text-text-medium mb-1">
                  Bank Reference / ARN / Verified UTR (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 429381749281 or Axis Bank Statement Ref"
                  value={approvePaymentRef}
                  onChange={(e) => setApprovePaymentRef(e.target.value)}
                  className="w-full px-3 py-2 bg-canvas border border-border rounded-lg text-xs text-text-high placeholder:text-text-low focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>

              {/* Admin Notes */}
              <div>
                <label className="block text-xs font-medium text-text-medium mb-1">
                  Admin Internal Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Verified on HDFC netbanking ledger"
                  value={approveAdminNotes}
                  onChange={(e) => setApproveAdminNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-canvas border border-border rounded-lg text-xs text-text-high placeholder:text-text-low focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border bg-canvas/40 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setApproveModalItem(null)}
                disabled={approving}
                className="px-4 py-2 rounded-lg border border-border bg-canvas hover:bg-surface text-text-high text-xs font-semibold disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!confirmVerified || approving}
                onClick={handleConfirmApprove}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-50 transition-colors shadow-xs"
              >
                {approving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Activating Pro...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Approve & Grant 30 Days Pro</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REJECT PAYMENT MODAL (REASON REQUIRED) */}
      {/* ========================================================================= */}
      {rejectModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-rose-500/10">
              <div className="flex items-center gap-2.5">
                <XCircle className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-base text-text-high">
                  Reject Subscription Request
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRejectModalItem(null)}
                className="p-1 rounded-lg text-text-medium hover:text-text-high"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-canvas border border-border rounded-lg text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-text-medium">Store:</span>
                  <span className="font-bold text-text-high">{rejectModalItem.store_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-medium">Request Ref:</span>
                  <span className="font-mono text-primary font-bold">{rejectModalItem.request_ref}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-medium">Claimed UTR:</span>
                  <span className="font-mono text-text-high">{rejectModalItem.utr_number || 'None'}</span>
                </div>
              </div>

              {/* Data Reassurance Reminder */}
              <div className="p-3 bg-blue-500/10 border border-blue-300 dark:border-blue-800 rounded-lg text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Data Safe:</strong> Rejecting will not delete any merchant data. The customer will receive an in-app notification with your reason and can re-submit their payment.
                </span>
              </div>

              {/* Rejection Reason Selector */}
              <div>
                <label className="block text-xs font-semibold text-text-high mb-1.5">
                  Select Rejection Reason <span className="text-rose-500">*</span>
                </label>
                <select
                  value={rejectionReasonPreset}
                  onChange={(e) => setRejectionReasonPreset(e.target.value)}
                  className="w-full px-3 py-2 bg-canvas border border-border rounded-lg text-xs text-text-high focus:outline-none focus:ring-1 focus:ring-rose-500"
                >
                  <option value="utr_not_found">Transaction UTR / Reference was not found in bank statement</option>
                  <option value="amount_mismatch">Amount received does not match ₹1,299</option>
                  <option value="duplicate_claim">Duplicate transaction reference already approved</option>
                  <option value="incomplete_payment">Payment was declined or marked failed by issuing bank</option>
                  <option value="custom">Other (write custom reason below)</option>
                </select>
              </div>

              {rejectionReasonPreset === 'custom' && (
                <div>
                  <label className="block text-xs font-semibold text-text-high mb-1">
                    Custom Reason Shown to Merchant <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Reference screenshot was illegible. Please re-enter 12-digit UTR."
                    value={customRejectionReason}
                    onChange={(e) => setCustomRejectionReason(e.target.value)}
                    className="w-full px-3 py-2 bg-canvas border border-border rounded-lg text-xs text-text-high focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              )}

              {/* Internal Notes */}
              <div>
                <label className="block text-xs font-medium text-text-medium mb-1">
                  Internal Admin Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Internal notes not visible to customer"
                  value={rejectAdminNotes}
                  onChange={(e) => setRejectAdminNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-canvas border border-border rounded-lg text-xs text-text-high placeholder:text-text-low focus:outline-none focus:ring-1 focus:ring-rose-500 resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border bg-canvas/40 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setRejectModalItem(null)}
                disabled={rejecting}
                className="px-4 py-2 rounded-lg border border-border bg-canvas hover:bg-surface text-text-high text-xs font-semibold disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rejecting || (rejectionReasonPreset === 'custom' && !customRejectionReason.trim())}
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-50 transition-colors"
              >
                {rejecting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Rejecting...</span>
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4" />
                    <span>Confirm Rejection</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
