import * as React from 'react';
import {
  Headset,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
  Send,
  Paperclip,
  Star,
  Sparkles,
  ArrowRight,
  X,
  FileText,
  User,
  ShieldCheck,
  Store,
  Phone,
  Mail,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';
import {
  api,
  type SupportTicket,
  type SupportOverview,
  type CustomerFeedback,
} from '../../api/client';
import { useToast } from '../../components/ui/Toast';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';

const TICKET_CATEGORIES = [
  'Business Question',
  'Analytics & Reports',
  'Inventory Management',
  'POS Billing',
  'Invoice OCR',
  'Subscription & Payment',
  'Technical Issue',
  'Feature Request',
  'Other',
];

const FEEDBACK_STATUSES = ['New', 'Under Review', 'Planned', 'Implemented', 'Declined'];
const TICKET_STATUSES = ['Open', 'In Progress', 'Waiting for Customer', 'Resolved', 'Closed'];

export function AdminSupportPage() {
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = React.useState<'tickets' | 'feedback'>('tickets');
  const [overview, setOverview] = React.useState<SupportOverview | null>(null);

  // Tickets Table State
  const [tickets, setTickets] = React.useState<SupportTicket[]>([]);
  const [totalTickets, setTotalTickets] = React.useState(0);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [loadingTickets, setLoadingTickets] = React.useState(true);

  // Ticket Filters
  const [ticketSearch, setTicketSearch] = React.useState('');
  const [ticketStatus, setTicketStatus] = React.useState('All');
  const [ticketCategory, setTicketCategory] = React.useState('All');
  const [ticketPriority, setTicketPriority] = React.useState('All');

  // Selected Ticket Modal / Drawer
  const [selectedTicket, setSelectedTicket] = React.useState<SupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = React.useState('');
  const [replyStatus, setReplyStatus] = React.useState<string>('Waiting for Customer');
  const [replyAttachmentName, setReplyAttachmentName] = React.useState<string | null>(null);
  const [replyAttachmentData, setReplyAttachmentData] = React.useState<string | null>(null);
  const [sendingReply, setSendingReply] = React.useState(false);

  // Quick ticket updater
  const [quickStatus, setQuickStatus] = React.useState('');
  const [quickPriority, setQuickPriority] = React.useState('');
  const [quickAdmin, setQuickAdmin] = React.useState('');
  const [updatingTicket, setUpdatingTicket] = React.useState(false);

  // Feedback State
  const [feedbacks, setFeedbacks] = React.useState<CustomerFeedback[]>([]);
  const [loadingFeedback, setLoadingFeedback] = React.useState(false);
  const [fbSearch, setFbSearch] = React.useState('');
  const [fbStatus, setFbStatus] = React.useState('All');
  const [fbRating, setFbRating] = React.useState<number | 0>(0);
  const [convertingFbId, setConvertingFbId] = React.useState<number | null>(null);
  const [editingNotesId, setEditingNotesId] = React.useState<number | null>(null);
  const [notesText, setNotesText] = React.useState('');

  // Fetch KPI Overview
  const loadOverview = React.useCallback(async () => {
    try {
      const data = await api.getAdminSupportOverview();
      setOverview(data);
    } catch (err: any) {
      console.error(err);
    }
  }, []);

  // Fetch Tickets List
  const loadTickets = React.useCallback(async (page: number = 1) => {
    try {
      setLoadingTickets(true);
      const res = await api.getAdminTickets({
        search: ticketSearch || undefined,
        status: ticketStatus !== 'All' ? ticketStatus : undefined,
        category: ticketCategory !== 'All' ? ticketCategory : undefined,
        priority: ticketPriority !== 'All' ? ticketPriority : undefined,
        page,
        page_size: 15,
      });
      setTickets(res.tickets);
      setTotalTickets(res.total);
      setCurrentPage(res.page);
      setTotalPages(res.total_pages);
    } catch (err: any) {
      error('Error loading tickets', err.message);
    } finally {
      setLoadingTickets(false);
    }
  }, [ticketSearch, ticketStatus, ticketCategory, ticketPriority, error]);

  // Fetch Feedback List
  const loadFeedback = React.useCallback(async () => {
    try {
      setLoadingFeedback(true);
      const data = await api.getAdminFeedbacks({
        search: fbSearch || undefined,
        status: fbStatus !== 'All' ? fbStatus : undefined,
        rating: fbRating > 0 ? fbRating : undefined,
      });
      setFeedbacks(data);
    } catch (err: any) {
      error('Error loading feedback', err.message);
    } finally {
      setLoadingFeedback(false);
    }
  }, [fbSearch, fbStatus, fbRating, error]);

  React.useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  React.useEffect(() => {
    if (activeTab === 'tickets') {
      loadTickets(1);
    } else {
      loadFeedback();
    }
  }, [activeTab, loadTickets, loadFeedback]);

  // Open ticket detail modal
  const handleOpenTicket = async (ticket: SupportTicket) => {
    try {
      const full = await api.getAdminTicketDetail(ticket.id);
      setSelectedTicket(full);
      setQuickStatus(full.status);
      setQuickPriority(full.priority);
      setQuickAdmin(full.assigned_admin || '');
      setReplyStatus(full.status === 'Open' ? 'Waiting for Customer' : full.status);

      // Clear unread dot in list
      setTickets((prev) =>
        prev.map((t) => (t.id === ticket.id ? { ...t, has_admin_unread: false } : t))
      );
      loadOverview();
    } catch (err: any) {
      error('Failed to open ticket', err.message);
    }
  };

  // Handle file uploads (converts to base64)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      error('File too large', 'Attachments must be under 5MB.');
      return;
    }

    setReplyAttachmentName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setReplyAttachmentData(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Admin Send Reply
  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyMessage.trim()) return;

    try {
      setSendingReply(true);
      const newMsg = await api.sendAdminTicketMessage(selectedTicket.id, {
        message: replyMessage.trim(),
        attachment_name: replyAttachmentName,
        attachment_data: replyAttachmentData,
        status: replyStatus,
      });

      setSelectedTicket((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: replyStatus,
          has_admin_unread: false,
          messages: [...(prev.messages || []), newMsg],
        };
      });

      setReplyMessage('');
      setReplyAttachmentName(null);
      setReplyAttachmentData(null);

      success('Reply sent to merchant', `Ticket status set to ${replyStatus}.`);
      loadTickets(currentPage);
      loadOverview();
    } catch (err: any) {
      error('Failed to send reply', err.message);
    } finally {
      setSendingReply(false);
    }
  };

  // Quick ticket property updater
  const handleUpdateTicketProperties = async () => {
    if (!selectedTicket) return;
    try {
      setUpdatingTicket(true);
      const updated = await api.updateAdminTicket(selectedTicket.id, {
        status: quickStatus || undefined,
        priority: quickPriority || undefined,
        assigned_admin: quickAdmin || undefined,
      });
      setSelectedTicket(updated);
      success('Ticket updated', 'Changes saved successfully.');
      loadTickets(currentPage);
      loadOverview();
    } catch (err: any) {
      error('Update failed', err.message);
    } finally {
      setUpdatingTicket(false);
    }
  };

  // Update Feedback Status
  const handleUpdateFeedbackStatus = async (feedbackId: number, status: string) => {
    try {
      await api.updateAdminFeedback(feedbackId, { status });
      setFeedbacks((prev) =>
        prev.map((f) => (f.id === feedbackId ? { ...f, status } : f))
      );
      success('Status updated', `Feedback marked as ${status}.`);
    } catch (err: any) {
      error('Failed to update', err.message);
    }
  };

  // Save Feedback Admin Notes
  const handleSaveFeedbackNotes = async (feedbackId: number) => {
    try {
      await api.updateAdminFeedback(feedbackId, { admin_notes: notesText });
      setFeedbacks((prev) =>
        prev.map((f) => (f.id === feedbackId ? { ...f, admin_notes: notesText } : f))
      );
      setEditingNotesId(null);
      success('Notes saved', 'Admin note attached to feedback.');
    } catch (err: any) {
      error('Failed to save notes', err.message);
    }
  };

  // Convert Feedback to Support Ticket
  const handleConvertFeedbackToTicket = async (feedbackId: number) => {
    try {
      setConvertingFbId(feedbackId);
      const ticket = await api.convertFeedbackToTicket(feedbackId);
      setFeedbacks((prev) =>
        prev.map((f) => (f.id === feedbackId ? { ...f, status: 'Under Review', converted_ticket_id: ticket.id } : f))
      );
      success('Converted to Ticket!', `Created ticket ${ticket.ticket_number}.`);
      loadOverview();
    } catch (err: any) {
      error('Conversion failed', err.message);
    } finally {
      setConvertingFbId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Open':
        return <Badge variant="info" dot>{status}</Badge>;
      case 'In Progress':
        return <Badge variant="warning" dot>{status}</Badge>;
      case 'Waiting for Customer':
        return <Badge variant="info" dot>{status}</Badge>;
      case 'Resolved':
        return <Badge variant="success" dot>{status}</Badge>;
      case 'Closed':
        return <Badge variant="neutral">{status}</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'High':
        return <Badge variant="destructive">{priority}</Badge>;
      case 'Normal':
        return <Badge variant="neutral">{priority}</Badge>;
      case 'Low':
        return <Badge variant="neutral">{priority}</Badge>;
      default:
        return <Badge variant="neutral">{priority}</Badge>;
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Headset className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-text-high tracking-tight">
                Support & Feedback Management
              </h1>
              <p className="text-xs md:text-sm text-text-medium mt-0.5">
                Centralized operations desk: respond to store inquiries, resolve customer tickets, and track product feedback.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => { loadOverview(); if (activeTab === 'tickets') loadTickets(currentPage); else loadFeedback(); }}
            className="flex items-center gap-1.5 text-xs h-9 min-h-[36px] min-w-0 px-3"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          label="Total Tickets"
          value={overview?.total_tickets ?? 0}
          numericValue={overview?.total_tickets ?? 0}
          icon={<Headset className="w-4 h-4 text-text-medium" />}
          trailColor="indigo"
        />
        <StatCard
          label="Open Tickets"
          value={overview?.open_tickets ?? 0}
          numericValue={overview?.open_tickets ?? 0}
          icon={<AlertCircle className="w-4 h-4 text-blue-500" />}
          trailColor="blue"
        />
        <StatCard
          label="In Progress"
          value={overview?.in_progress_tickets ?? 0}
          numericValue={overview?.in_progress_tickets ?? 0}
          icon={<Clock className="w-4 h-4 text-amber-500" />}
          trailColor="amber"
        />
        <StatCard
          label="Waiting on Merchant"
          value={overview?.waiting_for_customer_tickets ?? 0}
          numericValue={overview?.waiting_for_customer_tickets ?? 0}
          icon={<HelpCircle className="w-4 h-4 text-sky-500" />}
          trailColor="cyan"
        />
        <StatCard
          label="Resolved"
          value={overview?.resolved_tickets ?? 0}
          numericValue={overview?.resolved_tickets ?? 0}
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          trailColor="emerald"
        />
        <StatCard
          label="Unanswered"
          value={overview?.unanswered_tickets ?? 0}
          numericValue={overview?.unanswered_tickets ?? 0}
          icon={<MessageSquare className="w-4 h-4 text-rose-500" />}
          trailColor="rose"
        />
      </div>

      {/* Main Tabs */}
      <div className="flex items-center gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('tickets')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
            activeTab === 'tickets'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-medium hover:text-text-high'
          }`}
        >
          <Headset className="w-4 h-4" />
          <span>Support Tickets</span>
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-canvas border border-border text-text-medium">
            {overview?.total_tickets ?? 0}
          </span>
          {(overview?.unanswered_tickets ?? 0) > 0 && (
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="Unanswered tickets waiting" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('feedback')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
            activeTab === 'feedback'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-medium hover:text-text-high'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Customer Feedback & Ideas</span>
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-canvas border border-border text-text-medium">
            {overview?.total_feedback ?? 0}
          </span>
          {overview?.average_rating && (
            <span className="text-xs font-semibold text-amber-500 flex items-center gap-0.5">
              ★ {overview.average_rating}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: ALL SUPPORT TICKETS */}
      {activeTab === 'tickets' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-surface p-3.5 rounded-xl border border-border">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-low" />
              <input
                type="text"
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
                placeholder="Search ticket #, subject, store, phone..."
                className="w-full text-xs pl-9 pr-3 py-2 rounded-lg bg-canvas border border-border text-text-high placeholder:text-text-low focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <select
                value={ticketStatus}
                onChange={(e) => setTicketStatus(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg bg-canvas border border-border text-text-high focus:outline-none focus:border-primary"
              >
                <option value="All">All Statuses</option>
                {TICKET_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={ticketCategory}
                onChange={(e) => setTicketCategory(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg bg-canvas border border-border text-text-high focus:outline-none focus:border-primary"
              >
                <option value="All">All Categories</option>
                {TICKET_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={ticketPriority}
                onChange={(e) => setTicketPriority(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg bg-canvas border border-border text-text-high focus:outline-none focus:border-primary"
              >
                <option value="All">All Priorities</option>
                <option value="High">High Priority</option>
                <option value="Normal">Normal Priority</option>
                <option value="Low">Low Priority</option>
              </select>
            </div>
          </div>

          {/* Tickets Table */}
          <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-canvas/60 text-text-medium font-semibold">
                    <th className="py-3 px-4">Ticket ID</th>
                    <th className="py-3 px-4">Customer & Store</th>
                    <th className="py-3 px-4">Subject & Category</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Updated</th>
                    <th className="py-3 px-4">Assigned</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loadingTickets ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-text-medium">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                        <span>Loading tickets...</span>
                      </td>
                    </tr>
                  ) : tickets.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-text-medium">
                        No support tickets found matching the criteria.
                      </td>
                    </tr>
                  ) : (
                    tickets.map((t) => (
                      <tr
                        key={t.id}
                        className="hover:bg-canvas/40 transition-colors group cursor-pointer"
                        onClick={() => handleOpenTicket(t)}
                      >
                        <td className="py-3 px-4 font-mono font-semibold text-primary whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {t.has_admin_unread && (
                              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="Customer sent a new message" />
                            )}
                            <span>{t.ticket_number}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-text-high truncate max-w-[160px]">
                            {t.store_name || 'Retail Store'}
                          </div>
                          <div className="text-[11px] text-text-medium truncate max-w-[160px]">
                            {t.customer_name || 'Owner'} • {t.customer_phone || ''}
                          </div>
                        </td>

                        <td className="py-3 px-4 max-w-[220px]">
                          <div className="font-semibold text-text-high truncate group-hover:text-primary transition-colors">
                            {t.subject}
                          </div>
                          <div className="text-[11px] text-text-low truncate">
                            {t.category}
                          </div>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {getPriorityBadge(t.priority)}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {getStatusBadge(t.status)}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap text-text-medium">
                          {new Date(t.updated_at).toLocaleDateString()}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap text-text-low">
                          {t.assigned_admin || 'Unassigned'}
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="secondary"
                            onClick={() => handleOpenTicket(t)}
                            className="text-[11px] h-7 min-h-[28px] min-w-0 px-2.5"
                          >
                            <span>View & Reply</span>
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-3.5 border-t border-border flex items-center justify-between text-xs text-text-medium bg-canvas/30">
                <span>
                  Showing {tickets.length} of {totalTickets} tickets
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    disabled={currentPage <= 1}
                    onClick={() => loadTickets(currentPage - 1)}
                    className="h-7 min-h-[28px] min-w-0 px-2"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  <span className="font-medium">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    disabled={currentPage >= totalPages}
                    onClick={() => loadTickets(currentPage + 1)}
                    className="h-7 min-h-[28px] min-w-0 px-2"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: FEEDBACK MANAGEMENT */}
      {activeTab === 'feedback' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-surface p-3.5 rounded-xl border border-border">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-low" />
              <input
                type="text"
                value={fbSearch}
                onChange={(e) => setFbSearch(e.target.value)}
                placeholder="Search feedback comments, subject, store..."
                className="w-full text-xs pl-9 pr-3 py-2 rounded-lg bg-canvas border border-border text-text-high placeholder:text-text-low focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <select
                value={fbStatus}
                onChange={(e) => setFbStatus(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg bg-canvas border border-border text-text-high focus:outline-none focus:border-primary"
              >
                <option value="All">All Review Statuses</option>
                {FEEDBACK_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={fbRating}
                onChange={(e) => setFbRating(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 rounded-lg bg-canvas border border-border text-text-high focus:outline-none focus:border-primary"
              >
                <option value={0}>All Ratings (1 - 5 Stars)</option>
                <option value={5}>5 Stars only</option>
                <option value={4}>4 Stars</option>
                <option value={3}>3 Stars</option>
                <option value={2}>2 Stars</option>
                <option value={1}>1 Star</option>
              </select>
            </div>
          </div>

          {/* Feedback Cards Grid */}
          {loadingFeedback ? (
            <div className="py-16 text-center text-text-medium text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
              <span>Loading customer feedback...</span>
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="p-8 text-center bg-surface border border-border rounded-xl">
              <Star className="w-8 h-8 text-amber-400 mx-auto mb-2 opacity-50" />
              <p className="text-xs text-text-medium">No feedback items match your current filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {feedbacks.map((fb) => (
                <div
                  key={fb.id}
                  className="p-5 rounded-xl bg-surface border border-border shadow-sm flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${
                                fb.rating >= s ? 'fill-amber-400 text-amber-400' : 'text-border fill-transparent'
                              }`}
                            />
                          ))}
                        </div>
                        <Badge variant="neutral">{fb.category}</Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={fb.status}
                          onChange={(e) => handleUpdateFeedbackStatus(fb.id, e.target.value)}
                          className="text-[11px] font-semibold px-2 py-0.5 rounded border border-border bg-canvas text-text-high focus:outline-none focus:border-primary"
                        >
                          {FEEDBACK_STATUSES.map((st) => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Customer Context */}
                    <div className="flex items-center gap-2 text-xs text-text-medium pt-1">
                      <Store className="w-3.5 h-3.5 text-text-low" />
                      <span className="font-semibold text-text-high">{fb.store_name || 'Retail Store'}</span>
                      <span>•</span>
                      <span>{fb.customer_name} ({fb.customer_phone})</span>
                    </div>

                    {fb.subject && (
                      <h4 className="text-sm font-bold text-text-high pt-1">
                        {fb.subject}
                      </h4>
                    )}

                    <p className="text-xs text-text-medium leading-relaxed whitespace-pre-wrap bg-canvas/40 p-3 rounded-lg border border-border">
                      {fb.comments}
                    </p>

                    {/* Admin Notes */}
                    {editingNotesId === fb.id ? (
                      <div className="space-y-2 pt-2">
                        <textarea
                          rows={2}
                          value={notesText}
                          onChange={(e) => setNotesText(e.target.value)}
                          placeholder="Internal admin note or planned release tag..."
                          className="w-full text-xs p-2 rounded bg-canvas border border-border text-text-high resize-none focus:outline-none focus:border-primary"
                        />
                        <div className="flex items-center justify-end gap-1.5">
                          <Button variant="secondary" onClick={() => setEditingNotesId(null)} className="h-6 min-h-[24px] min-w-0 text-[11px] px-2">Cancel</Button>
                          <Button onClick={() => handleSaveFeedbackNotes(fb.id)} className="h-6 min-h-[24px] min-w-0 text-[11px] px-2">Save Note</Button>
                        </div>
                      </div>
                    ) : fb.admin_notes ? (
                      <div className="p-2.5 rounded bg-primary/5 border border-primary/20 text-xs text-text-medium flex items-start justify-between gap-2">
                        <div>
                          <span className="font-semibold text-primary">Admin Note: </span>
                          <span>{fb.admin_notes}</span>
                        </div>
                        <button
                          onClick={() => { setEditingNotesId(fb.id); setNotesText(fb.admin_notes || ''); }}
                          className="text-[11px] text-text-low hover:text-primary shrink-0 underline"
                        >
                          Edit
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-text-low">
                    <span>{new Date(fb.created_at).toLocaleDateString()}</span>

                    <div className="flex items-center gap-2">
                      {!fb.admin_notes && editingNotesId !== fb.id && (
                        <button
                          onClick={() => { setEditingNotesId(fb.id); setNotesText(''); }}
                          className="text-xs text-text-medium hover:text-primary font-medium"
                        >
                          + Add Note
                        </button>
                      )}

                      {fb.converted_ticket_id ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Ticket #{fb.converted_ticket_id}</span>
                        </span>
                      ) : (
                        <Button
                          variant="secondary"
                          disabled={convertingFbId === fb.id}
                          onClick={() => handleConvertFeedbackToTicket(fb.id)}
                          className="text-[11px] h-7 min-h-[28px] min-w-0 px-2"
                        >
                          <ArrowRight className="w-3 h-3 mr-1" />
                          <span>{convertingFbId === fb.id ? 'Converting...' : 'Convert to Ticket'}</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TICKET DETAIL & REPLY MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-4xl h-[92vh] rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-4 md:p-5 border-b border-border flex items-center justify-between bg-canvas/40 shrink-0">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold text-primary bg-primary/10 px-2.5 py-1 rounded">
                  {selectedTicket.ticket_number}
                </span>
                <div>
                  <h3 className="text-base font-bold text-text-high truncate max-w-xl">
                    {selectedTicket.subject}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-text-medium mt-0.5">
                    <span>{selectedTicket.category}</span>
                    <span>•</span>
                    <span>Submitted: {new Date(selectedTicket.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedTicket(null)}
                className="p-1.5 rounded-lg text-text-low hover:text-text-high hover:bg-canvas transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Status & Properties Bar */}
            <div className="px-4 py-2.5 border-b border-border bg-canvas/30 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
              <div className="flex flex-wrap items-center gap-4">
                {/* Store Context */}
                <div className="flex items-center gap-1.5 text-text-medium">
                  <Store className="w-3.5 h-3.5 text-primary" />
                  <span className="font-semibold text-text-high">{selectedTicket.store_name}</span>
                </div>
                <div className="flex items-center gap-1.5 text-text-medium">
                  <Phone className="w-3.5 h-3.5 text-text-low" />
                  <span>{selectedTicket.customer_phone || 'No phone'}</span>
                </div>
                {selectedTicket.customer_email && (
                  <div className="flex items-center gap-1.5 text-text-medium">
                    <Mail className="w-3.5 h-3.5 text-text-low" />
                    <span>{selectedTicket.customer_email}</span>
                  </div>
                )}
              </div>

              {/* Status and Priority Quick Change */}
              <div className="flex items-center gap-2">
                <select
                  value={quickStatus}
                  onChange={(e) => setQuickStatus(e.target.value)}
                  className="text-xs px-2 py-1 rounded border border-border bg-surface text-text-high focus:outline-none focus:border-primary"
                >
                  {TICKET_STATUSES.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>

                <select
                  value={quickPriority}
                  onChange={(e) => setQuickPriority(e.target.value)}
                  className="text-xs px-2 py-1 rounded border border-border bg-surface text-text-high focus:outline-none focus:border-primary"
                >
                  <option value="Low">Low</option>
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                </select>

                <input
                  type="text"
                  placeholder="Assign agent"
                  value={quickAdmin}
                  onChange={(e) => setQuickAdmin(e.target.value)}
                  className="text-xs px-2 py-1 rounded border border-border bg-surface text-text-high w-28 focus:outline-none focus:border-primary"
                />

                <Button
                  variant="secondary"
                  disabled={updatingTicket}
                  onClick={handleUpdateTicketProperties}
                  className="h-7 min-h-[28px] min-w-0 text-xs px-2.5"
                >
                  {updatingTicket ? 'Saving...' : 'Update'}
                </Button>
              </div>
            </div>

            {/* Conversation Messages Container */}
            <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 bg-canvas/10">
              {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                selectedTicket.messages.map((m, idx) => {
                  const isAdmin = m.sender_role === 'admin';
                  return (
                    <div
                      key={m.id || idx}
                      className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        {isAdmin ? (
                          <>
                            <span className="text-xs font-semibold text-primary">Store BI Support</span>
                            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                          </>
                        ) : (
                          <>
                            <User className="w-3.5 h-3.5 text-text-low" />
                            <span className="text-xs font-medium text-text-medium">
                              {m.sender_name || selectedTicket.customer_name || 'Merchant'}
                            </span>
                          </>
                        )}
                        <span className="text-[11px] text-text-low ml-1">
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(m.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <div
                        className={`max-w-2xl p-4 rounded-xl text-sm leading-relaxed ${
                          isAdmin
                            ? 'bg-primary text-white shadow-sm'
                            : 'bg-surface border border-border text-text-high shadow-sm'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{m.message}</p>

                        {/* File Attachment */}
                        {m.attachment_data && (
                          <div className="mt-3 pt-3 border-t border-white/20 dark:border-border">
                            {m.attachment_data.startsWith('data:image/') ? (
                              <div className="space-y-1">
                                <span className="text-xs opacity-80 flex items-center gap-1">
                                  <Paperclip className="w-3 h-3" /> {m.attachment_name || 'Screenshot'}
                                </span>
                                <img
                                  src={m.attachment_data}
                                  alt="Attachment"
                                  className="max-h-64 rounded border border-white/30 object-contain bg-black/10"
                                />
                              </div>
                            ) : (
                              <a
                                href={m.attachment_data}
                                download={m.attachment_name || 'document'}
                                className="inline-flex items-center gap-1.5 text-xs font-medium underline opacity-90 hover:opacity-100"
                              >
                                <FileText className="w-4 h-4" />
                                <span>Download {m.attachment_name || 'Attachment'}</span>
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 text-xs text-text-low">
                  No messages found.
                </div>
              )}
            </div>

            {/* Admin Reply Composer Form */}
            <div className="p-4 md:p-5 border-t border-border bg-surface shrink-0">
              <form onSubmit={handleSendAdminReply} className="space-y-3">
                <textarea
                  rows={3}
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type official reply to the merchant..."
                  className="w-full text-xs md:text-sm p-3 rounded-lg bg-canvas border border-border text-text-high placeholder:text-text-low focus:outline-none focus:border-primary resize-none"
                />

                {replyAttachmentName && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-canvas border border-border rounded-lg text-xs text-text-medium w-fit">
                    <Paperclip className="w-3.5 h-3.5 text-primary" />
                    <span className="truncate max-w-[200px]">{replyAttachmentName}</span>
                    <button
                      type="button"
                      onClick={() => { setReplyAttachmentName(null); setReplyAttachmentData(null); }}
                      className="text-text-low hover:text-destructive"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-text-medium hover:text-text-high px-2.5 py-1.5 rounded-lg border border-border hover:bg-canvas transition-colors">
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>Attach File / Screenshot</span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx,.txt"
                        onChange={handleFileChange}
                      />
                    </label>

                    <div className="flex items-center gap-1.5 text-xs text-text-medium">
                      <span>Set Status:</span>
                      <select
                        value={replyStatus}
                        onChange={(e) => setReplyStatus(e.target.value)}
                        className="text-xs px-2 py-1 rounded border border-border bg-canvas text-text-high focus:outline-none focus:border-primary"
                      >
                        <option value="Waiting for Customer">Waiting for Customer</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={sendingReply || !replyMessage.trim()}
                    className="flex items-center justify-center gap-2 px-5 text-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{sendingReply ? 'Sending Reply...' : 'Send Reply'}</span>
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
