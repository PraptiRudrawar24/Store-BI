import * as React from 'react';
import {
  Headset,
  Plus,
  Search,
  MessageSquare,
  Send,
  Paperclip,
  HelpCircle,
  Star,
  Sparkles,
  ArrowLeft,
  X,
  FileText,
  User,
  ShieldCheck,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { api, type SupportTicket, type CustomerFeedback } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

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

const FEEDBACK_CATEGORIES = [
  'Feature Suggestion',
  'User Experience',
  'Bug Report',
  'General Feedback',
];

export function SupportPage() {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = React.useState<'tickets' | 'feedback'>('tickets');
  const [tickets, setTickets] = React.useState<SupportTicket[]>([]);
  const [feedbacks, setFeedbacks] = React.useState<CustomerFeedback[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [unreadCount, setUnreadCount] = React.useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('All');
  const [categoryFilter, setCategoryFilter] = React.useState('All');

  // Create Ticket Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [createSubject, setCreateSubject] = React.useState('');
  const [createCategory, setCreateCategory] = React.useState(TICKET_CATEGORIES[0]);
  const [createPriority, setCreatePriority] = React.useState<'Low' | 'Normal' | 'High'>('Normal');
  const [createDescription, setCreateDescription] = React.useState('');
  const [createAttachmentName, setCreateAttachmentName] = React.useState<string | null>(null);
  const [createAttachmentData, setCreateAttachmentData] = React.useState<string | null>(null);
  const [submittingTicket, setSubmittingTicket] = React.useState(false);

  // Active Ticket Conversation Drawer / View
  const [selectedTicket, setSelectedTicket] = React.useState<SupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = React.useState('');
  const [replyAttachmentName, setReplyAttachmentName] = React.useState<string | null>(null);
  const [replyAttachmentData, setReplyAttachmentData] = React.useState<string | null>(null);
  const [sendingReply, setSendingReply] = React.useState(false);

  // Feedback Form State
  const [fbCategory, setFbCategory] = React.useState(FEEDBACK_CATEGORIES[0]);
  const [fbRating, setFbRating] = React.useState<number>(5);
  const [fbHoverRating, setFbHoverRating] = React.useState<number>(0);
  const [fbSubject, setFbSubject] = React.useState('');
  const [fbComments, setFbComments] = React.useState('');
  const [submittingFeedback, setSubmittingFeedback] = React.useState(false);

  // Fetch Tickets & Feedback
  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [fetchedTickets, fetchedFeedbacks, unreadRes] = await Promise.all([
        api.getCustomerTickets({
          search: searchQuery || undefined,
          status: statusFilter !== 'All' ? statusFilter : undefined,
          category: categoryFilter !== 'All' ? categoryFilter : undefined,
        }),
        api.getCustomerFeedbacks(),
        api.getCustomerSupportUnreadCount(),
      ]);
      setTickets(fetchedTickets);
      setFeedbacks(fetchedFeedbacks);
      setUnreadCount(unreadRes.unread_count);
    } catch (err: any) {
      error('Error loading support data', err.message || 'Please check your connection and retry.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, categoryFilter, error]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Open ticket details
  const handleOpenTicket = async (ticket: SupportTicket) => {
    try {
      const full = await api.getCustomerTicketDetail(ticket.id);
      setSelectedTicket(full);
      // Update local unread state
      setTickets((prev) =>
        prev.map((t) => (t.id === ticket.id ? { ...t, has_customer_unread: false } : t))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      error('Could not load ticket details', err.message);
    }
  };

  // Handle file uploads (converts to base64)
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setterName: (name: string | null) => void,
    setterData: (data: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      error('File too large', 'Attachments must be under 5MB.');
      return;
    }

    setterName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setterData(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit New Ticket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createSubject.trim()) {
      error('Validation error', 'Subject is required.');
      return;
    }
    if (!createDescription.trim()) {
      error('Validation error', 'Description is required.');
      return;
    }

    try {
      setSubmittingTicket(true);
      const newTicket = await api.createSupportTicket({
        subject: createSubject.trim(),
        category: createCategory,
        priority: createPriority,
        description: createDescription.trim(),
        attachment_name: createAttachmentName,
        attachment_data: createAttachmentData,
      });

      success('Support request created!', `Ticket ${newTicket.ticket_number} submitted to Store BI support.`);

      setIsCreateModalOpen(false);
      setCreateSubject('');
      setCreateDescription('');
      setCreatePriority('Normal');
      setCreateAttachmentName(null);
      setCreateAttachmentData(null);

      // Refresh list
      loadData();
      // Auto open created ticket
      setSelectedTicket(newTicket);
    } catch (err: any) {
      error('Failed to create request', err.message || 'Please try again.');
    } finally {
      setSubmittingTicket(false);
    }
  };

  // Customer replies to ticket
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyMessage.trim()) return;

    try {
      setSendingReply(true);
      const newMsg = await api.sendCustomerTicketMessage(selectedTicket.id, {
        message: replyMessage.trim(),
        attachment_name: replyAttachmentName,
        attachment_data: replyAttachmentData,
      });

      // Update active ticket messages
      setSelectedTicket((prev) => {
        if (!prev) return prev;
        const currentMsgs = prev.messages || [];
        return {
          ...prev,
          status: prev.status === 'Waiting for Customer' || prev.status === 'Resolved' || prev.status === 'Closed' ? 'In Progress' : prev.status,
          messages: [...currentMsgs, newMsg],
        };
      });

      setReplyMessage('');
      setReplyAttachmentName(null);
      setReplyAttachmentData(null);

      success('Reply sent', 'Our support team has been notified.');
      loadData();
    } catch (err: any) {
      error('Failed to send reply', err.message);
    } finally {
      setSendingReply(false);
    }
  };

  // Submit Feedback
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbComments.trim()) {
      error('Validation error', 'Please provide feedback comments.');
      return;
    }

    try {
      setSubmittingFeedback(true);
      await api.submitCustomerFeedback({
        category: fbCategory,
        rating: fbRating,
        subject: fbSubject.trim() || undefined,
        comments: fbComments.trim(),
      });

      success('Thank you for your feedback!', 'Your suggestions help us make Store BI better every day.');

      setFbSubject('');
      setFbComments('');
      setFbRating(5);
      loadData();
    } catch (err: any) {
      error('Submission failed', err.message);
    } finally {
      setSubmittingFeedback(false);
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

  const getFeedbackStatusBadge = (status: string) => {
    switch (status) {
      case 'New':
        return <Badge variant="info">{status}</Badge>;
      case 'Under Review':
        return <Badge variant="warning">{status}</Badge>;
      case 'Planned':
        return <Badge variant="neutral" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">{status}</Badge>;
      case 'Implemented':
        return <Badge variant="success">{status}</Badge>;
      case 'Declined':
        return <Badge variant="neutral">{status}</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
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
                Support & Feedback
              </h1>
              <p className="text-xs md:text-sm text-text-medium mt-0.5">
                Ask questions, report issues, request feature updates, or send suggestions directly to the Store BI team.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Support Request</span>
          </Button>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-2 border-b border-border">
        <button
          onClick={() => { setActiveTab('tickets'); setSelectedTicket(null); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
            activeTab === 'tickets'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-medium hover:text-text-high'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>My Support Requests</span>
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-canvas border border-border text-text-medium">
            {tickets.length}
          </span>
          {unreadCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" title="Unread updates available" />
          )}
        </button>

        <button
          onClick={() => { setActiveTab('feedback'); setSelectedTicket(null); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
            activeTab === 'feedback'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-medium hover:text-text-high'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Feedback & Suggestions</span>
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-canvas border border-border text-text-medium">
            {feedbacks.length}
          </span>
        </button>
      </div>

      {/* TAB 1: SUPPORT TICKETS */}
      {activeTab === 'tickets' && (
        <div className="space-y-4">
          {/* If a ticket is open, show conversation view */}
          {selectedTicket ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-medium hover:text-primary transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to all requests</span>
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-low font-mono">{selectedTicket.ticket_number}</span>
                  {getStatusBadge(selectedTicket.status)}
                </div>
              </div>

              {/* Ticket Details & Conversation Panel */}
              <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden flex flex-col min-h-[580px]">
                {/* Header */}
                <div className="p-4 md:p-6 bg-canvas/50 border-b border-border">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                          {selectedTicket.ticket_number}
                        </span>
                        <Badge variant="neutral">{selectedTicket.category}</Badge>
                        {getPriorityBadge(selectedTicket.priority)}
                      </div>
                      <h2 className="text-lg md:text-xl font-bold text-text-high">
                        {selectedTicket.subject}
                      </h2>
                    </div>

                    <div className="text-xs text-text-low text-left md:text-right">
                      <p>Submitted: {new Date(selectedTicket.created_at).toLocaleString()}</p>
                      <p className="mt-0.5">Updated: {new Date(selectedTicket.updated_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Messages Stream */}
                <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-5 bg-canvas/20">
                  {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                    selectedTicket.messages.map((msg, idx) => {
                      const isAdmin = msg.sender_role === 'admin';
                      return (
                        <div
                          key={msg.id || idx}
                          className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}
                        >
                          <div className="flex items-center gap-1.5 mb-1 px-1">
                            {isAdmin ? (
                              <>
                                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                                <span className="text-xs font-semibold text-primary">Store BI Support</span>
                              </>
                            ) : (
                              <>
                                <User className="w-3.5 h-3.5 text-text-low" />
                                <span className="text-xs font-medium text-text-medium">
                                  {msg.sender_name || user?.owner_name || 'You'}
                                </span>
                              </>
                            )}
                            <span className="text-[11px] text-text-low ml-1">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div
                            className={`max-w-2xl p-4 rounded-xl text-sm leading-relaxed ${
                              isAdmin
                                ? 'bg-surface border border-primary/20 text-text-high shadow-sm'
                                : 'bg-primary text-white shadow-sm'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.message}</p>

                            {/* Attachment if present */}
                            {msg.attachment_data && (
                              <div className="mt-3 pt-3 border-t border-white/20 dark:border-border">
                                {msg.attachment_data.startsWith('data:image/') ? (
                                  <div className="space-y-1">
                                    <span className="text-xs opacity-80 flex items-center gap-1">
                                      <Paperclip className="w-3 h-3" /> {msg.attachment_name || 'Attachment'}
                                    </span>
                                    <img
                                      src={msg.attachment_data}
                                      alt="Attachment preview"
                                      className="max-h-60 rounded border border-white/30 object-contain bg-black/10"
                                    />
                                  </div>
                                ) : (
                                  <a
                                    href={msg.attachment_data}
                                    download={msg.attachment_name || 'document'}
                                    className="inline-flex items-center gap-2 text-xs font-medium underline opacity-90 hover:opacity-100"
                                  >
                                    <FileText className="w-4 h-4" />
                                    <span>Download {msg.attachment_name || 'Attached File'}</span>
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-10 text-text-low text-xs">
                      No messages yet in this ticket.
                    </div>
                  )}
                </div>

                {/* Reply Composer */}
                <div className="p-4 md:p-5 border-t border-border bg-surface">
                  {selectedTicket.status === 'Closed' ? (
                    <div className="p-3 rounded-lg bg-canvas border border-border text-xs text-text-medium flex items-center justify-between">
                      <span>This ticket is currently marked as <strong>Closed</strong>. Sending a reply will automatically reopen it.</span>
                    </div>
                  ) : selectedTicket.status === 'Waiting for Customer' ? (
                    <div className="mb-3 px-3 py-2 rounded-lg bg-info-bg text-info text-xs border border-info-border flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 shrink-0" />
                      <span>Our support team is waiting for your response. Replying will update the status to <strong>In Progress</strong>.</span>
                    </div>
                  ) : null}

                  <form onSubmit={handleSendReply} className="space-y-3 mt-2">
                    <textarea
                      rows={3}
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Type your reply here..."
                      className="w-full text-sm p-3 rounded-lg bg-canvas border border-border text-text-high placeholder:text-text-low focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors resize-none"
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

                    <div className="flex items-center justify-between">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-text-medium hover:text-text-high px-2.5 py-1.5 rounded-lg border border-border hover:bg-canvas transition-colors">
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>Attach File</span>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*,.pdf,.doc,.docx,.txt"
                          onChange={(e) => handleFileChange(e, setReplyAttachmentName, setReplyAttachmentData)}
                        />
                      </label>

                      <Button
                        type="submit"
                        disabled={sendingReply || !replyMessage.trim()}
                        className="flex items-center gap-1.5 px-4"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{sendingReply ? 'Sending...' : 'Send Reply'}</span>
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            /* Ticket List View */
            <div className="space-y-4">
              {/* Filter controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-low" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by ticket # or subject..."
                    className="w-full text-xs pl-9 pr-3 py-2 rounded-lg bg-surface border border-border text-text-high placeholder:text-text-low focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg bg-surface border border-border text-text-high focus:outline-none focus:border-primary"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Waiting for Customer">Waiting for Customer</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>

                <div>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg bg-surface border border-border text-text-high focus:outline-none focus:border-primary"
                  >
                    <option value="All">All Categories</option>
                    {TICKET_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tickets List */}
              {loading ? (
                <div className="py-16 text-center text-text-medium text-xs flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                  <span>Loading support requests...</span>
                </div>
              ) : tickets.length === 0 ? (
                <div className="p-8 text-center bg-surface border border-border rounded-xl">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                    <Headset className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-text-high">No support requests found</h3>
                  <p className="text-xs text-text-medium mt-1 max-w-sm mx-auto">
                    Have a question or facing any difficulty? Our support team is ready to assist you anytime.
                  </p>
                  <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="mt-4 text-xs"
                  >
                    Create Your First Request
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {tickets.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => handleOpenTicket(t)}
                      className="group cursor-pointer p-4 md:p-5 rounded-xl bg-surface border border-border hover:border-primary/50 transition-all shadow-sm hover:shadow relative overflow-hidden"
                    >
                      {t.has_customer_unread && (
                        <div className="absolute top-0 right-0 w-3 h-3 bg-primary rounded-bl-lg" title="New reply" />
                      )}

                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                              {t.ticket_number}
                            </span>
                            {getStatusBadge(t.status)}
                            {getPriorityBadge(t.priority)}
                            <Badge variant="neutral">{t.category}</Badge>
                            {t.has_customer_unread && (
                              <span className="text-[11px] font-semibold text-primary bg-primary/15 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                New response
                              </span>
                            )}
                          </div>

                          <h3 className="text-sm md:text-base font-bold text-text-high group-hover:text-primary transition-colors truncate">
                            {t.subject}
                          </h3>
                          <p className="text-xs text-text-medium line-clamp-2 leading-relaxed">
                            {t.description}
                          </p>
                        </div>

                        <div className="flex items-center justify-between md:flex-col md:items-end gap-2 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-border">
                          <div className="text-[11px] text-text-low text-left md:text-right">
                            <div>Submitted: {new Date(t.created_at).toLocaleDateString()}</div>
                            <div>Updated: {new Date(t.updated_at).toLocaleDateString()}</div>
                          </div>

                          <div className="flex items-center gap-1 text-xs font-semibold text-primary">
                            <span>Open Conversation</span>
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: FEEDBACK & SUGGESTIONS */}
      {activeTab === 'feedback' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Submit Feedback Form */}
          <div className="lg:col-span-5 bg-surface p-5 md:p-6 rounded-xl border border-border shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold text-text-high flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>Share Feedback or Ideas</span>
              </h2>
              <p className="text-xs text-text-medium mt-1">
                Help us tailor Store BI to your business needs. We review every suggestion!
              </p>
            </div>

            <form onSubmit={handleSubmitFeedback} className="space-y-4">
              {/* Star Rating Widget */}
              <div>
                <label className="block text-xs font-semibold text-text-medium mb-1.5">
                  How would you rate your experience with Store BI?
                </label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setFbHoverRating(star)}
                      onMouseLeave={() => setFbHoverRating(0)}
                      onClick={() => setFbRating(star)}
                      className="p-1 hover:scale-110 transition-transform focus:outline-none"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          (fbHoverRating || fbRating) >= star
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-border fill-transparent'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-semibold text-text-medium ml-2">
                    {fbRating === 5 ? 'Excellent!' : fbRating === 4 ? 'Very Good' : fbRating === 3 ? 'Average' : fbRating === 2 ? 'Needs Improvement' : 'Disappointed'}
                  </span>
                </div>
              </div>

              {/* Feedback Category */}
              <div>
                <label className="block text-xs font-semibold text-text-medium mb-1">
                  Category *
                </label>
                <select
                  value={fbCategory}
                  onChange={(e) => setFbCategory(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg bg-canvas border border-border text-text-high focus:outline-none focus:border-primary"
                >
                  {FEEDBACK_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold text-text-medium mb-1">
                  Title or Topic (Optional)
                </label>
                <input
                  type="text"
                  value={fbSubject}
                  onChange={(e) => setFbSubject(e.target.value)}
                  placeholder="e.g., Quick barcode scanner shortcut"
                  className="w-full text-xs p-2.5 rounded-lg bg-canvas border border-border text-text-high placeholder:text-text-low focus:outline-none focus:border-primary"
                />
              </div>

              {/* Comments */}
              <div>
                <label className="block text-xs font-semibold text-text-medium mb-1">
                  Your Thoughts & Suggestions *
                </label>
                <textarea
                  rows={4}
                  required
                  value={fbComments}
                  onChange={(e) => setFbComments(e.target.value)}
                  placeholder="Tell us what you love, what can be improved, or features you need for your daily retail workflows..."
                  className="w-full text-xs p-2.5 rounded-lg bg-canvas border border-border text-text-high placeholder:text-text-low focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <Button
                type="submit"
                disabled={submittingFeedback || !fbComments.trim()}
                className="w-full text-xs font-semibold"
              >
                {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
              </Button>
            </form>
          </div>

          {/* Previous Feedback History */}
          <div className="lg:col-span-7 space-y-4">
            <div>
              <h2 className="text-base font-bold text-text-high">
                Your Submitted Feedback
              </h2>
              <p className="text-xs text-text-medium mt-0.5">
                Track the status of your product ideas and comments.
              </p>
            </div>

            {feedbacks.length === 0 ? (
              <div className="p-8 text-center bg-surface border border-border rounded-xl">
                <Star className="w-8 h-8 text-amber-400 mx-auto mb-2 opacity-50" />
                <p className="text-xs text-text-medium">No feedback submitted yet. Share your first thought on the left!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {feedbacks.map((fb) => (
                  <div
                    key={fb.id}
                    className="p-4 rounded-xl bg-surface border border-border shadow-sm space-y-2.5"
                  >
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
                        <span className="text-xs font-semibold text-text-medium">• {fb.category}</span>
                      </div>
                      {getFeedbackStatusBadge(fb.status)}
                    </div>

                    {fb.subject && (
                      <h4 className="text-sm font-bold text-text-high">
                        {fb.subject}
                      </h4>
                    )}

                    <p className="text-xs text-text-medium leading-relaxed whitespace-pre-wrap">
                      {fb.comments}
                    </p>

                    {fb.admin_notes && (
                      <div className="p-3 rounded-lg bg-canvas border border-border text-xs text-text-medium">
                        <span className="font-semibold text-primary">Store BI Team Note: </span>
                        {fb.admin_notes}
                      </div>
                    )}

                    <div className="text-[11px] text-text-low pt-1 border-t border-border/50">
                      Submitted on {new Date(fb.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE TICKET MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-xl rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 md:p-5 border-b border-border flex items-center justify-between bg-canvas/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Headset className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-high">
                    Create Support Request
                  </h3>
                  <p className="text-xs text-text-medium">
                    Auto-associated with store: <span className="font-medium text-text-high">{user?.name}</span> ({user?.phone})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-text-low hover:text-text-high hover:bg-canvas transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="p-4 md:p-6 overflow-y-auto space-y-4">
              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold text-text-medium mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  value={createSubject}
                  onChange={(e) => setCreateSubject(e.target.value)}
                  placeholder="e.g., Problem with daily inventory sync or POS printer"
                  className="w-full text-xs p-2.5 rounded-lg bg-canvas border border-border text-text-high placeholder:text-text-low focus:outline-none focus:border-primary"
                />
              </div>

              {/* Category & Priority Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-medium mb-1">
                    Category *
                  </label>
                  <select
                    value={createCategory}
                    onChange={(e) => setCreateCategory(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg bg-canvas border border-border text-text-high focus:outline-none focus:border-primary"
                  >
                    {TICKET_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-medium mb-1">
                    Priority
                  </label>
                  <select
                    value={createPriority}
                    onChange={(e) => setCreatePriority(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-lg bg-canvas border border-border text-text-high focus:outline-none focus:border-primary"
                  >
                    <option value="Low">Low - General query</option>
                    <option value="Normal">Normal - Standard priority</option>
                    <option value="High">High - Urgent business impact</option>
                  </select>
                </div>
              </div>

              {/* Detailed Description */}
              <div>
                <label className="block text-xs font-semibold text-text-medium mb-1">
                  Description *
                </label>
                <textarea
                  rows={5}
                  required
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  placeholder="Please describe your difficulty, questions, or steps to reproduce any issue in detail..."
                  className="w-full text-xs p-2.5 rounded-lg bg-canvas border border-border text-text-high placeholder:text-text-low focus:outline-none focus:border-primary resize-none"
                />
              </div>

              {/* Attachment */}
              <div>
                <label className="block text-xs font-semibold text-text-medium mb-1">
                  Optional Screenshot or Document (max 5MB)
                </label>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-text-medium hover:text-text-high px-3 py-2 rounded-lg border border-border hover:bg-canvas transition-colors">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Choose File</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx,.txt"
                      onChange={(e) => handleFileChange(e, setCreateAttachmentName, setCreateAttachmentData)}
                    />
                  </label>
                  {createAttachmentName && (
                    <div className="flex items-center gap-1.5 text-xs text-primary font-medium truncate">
                      <span>{createAttachmentName}</span>
                      <button
                        type="button"
                        onClick={() => { setCreateAttachmentName(null); setCreateAttachmentData(null); }}
                        className="text-text-low hover:text-destructive"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingTicket || !createSubject.trim() || !createDescription.trim()}
                >
                  {submittingTicket ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
