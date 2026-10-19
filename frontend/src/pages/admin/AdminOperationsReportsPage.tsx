import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  MapPin,
  Users,
  TrendingUp,
  Layers,
  FileSpreadsheet,
  CalendarClock,
  AlertTriangle,
  RotateCw,
  Download,
  Printer,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Play,
  Pause,
  Trash2,
  ExternalLink,
  Info,
  Store,
  DollarSign,
  Package,
  ShoppingBag,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { api } from '../../api/client';
import type {
  OperationsOverviewResponse,
  GeographicAnalyticsResponse,
  CohortRetentionResponse,
  SalesGmvResponse,
  CategoryBenchmarkingResponse,
  ReportBuilderResponse,
  ScheduledReportItem,
  ReportExecutionLogItem,
  OperationalAlertsResponse,
  ScheduledReportCreateRequest,
} from '../../api/client';
import { formatINR } from '../../utils';

type ReportTab =
  | 'overview'
  | 'geographic'
  | 'retention'
  | 'sales_gmv'
  | 'benchmarks'
  | 'builder'
  | 'schedules'
  | 'alerts';

export function AdminOperationsReportsPage() {
  const navigate = useNavigate();
  const toast = useToast();

  // Active Tab
  const [activeTab, setActiveTab] = React.useState<ReportTab>('overview');

  // Global Date Range & Filters
  const [preset, setPreset] = React.useState<string>('30d');
  const [startDate, setStartDate] = React.useState<string>('');
  const [endDate, setEndDate] = React.useState<string>('');
  const [categoryFilter, setCategoryFilter] = React.useState<string>('All');
  const [stateFilter, setStateFilter] = React.useState<string>('All');

  // Loading States
  const [loading, setLoading] = React.useState<boolean>(true);
  const [refreshing, setRefreshing] = React.useState<boolean>(false);

  // Tab Data States
  const [overviewData, setOverviewData] = React.useState<OperationsOverviewResponse | null>(null);
  const [geoData, setGeoData] = React.useState<GeographicAnalyticsResponse | null>(null);
  const [cohortData, setCohortData] = React.useState<CohortRetentionResponse | null>(null);
  const [salesGmvData, setSalesGmvData] = React.useState<SalesGmvResponse | null>(null);
  const [benchmarkData, setBenchmarkData] = React.useState<CategoryBenchmarkingResponse | null>(null);
  const [alertsData, setAlertsData] = React.useState<OperationalAlertsResponse | null>(null);

  // Report Builder State
  const [builderType, setBuilderType] = React.useState<string>('sales_gmv');
  const [builderPage, setBuilderPage] = React.useState<number>(1);
  const [builderStatus, setBuilderStatus] = React.useState<string>('All');
  const [builderCity, setBuilderCity] = React.useState<string>('');
  const [builderData, setBuilderData] = React.useState<ReportBuilderResponse | null>(null);
  const [builderLoading, setBuilderLoading] = React.useState<boolean>(false);

  // Scheduled Reports State
  const [schedules, setSchedules] = React.useState<ScheduledReportItem[]>([]);
  const [scheduleLogs, setScheduleLogs] = React.useState<ReportExecutionLogItem[]>([]);
  const [schedulerStatus, setSchedulerStatus] = React.useState<{ is_email_live: boolean; provider: string; description: string } | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = React.useState<boolean>(false);
  const [newSchedule, setNewSchedule] = React.useState<ScheduledReportCreateRequest>({
    name: '',
    report_type: 'sales_gmv',
    frequency: 'weekly',
    recipients: '',
    format: 'csv',
  });
  const [actionLoadingId, setActionLoadingId] = React.useState<number | null>(null);

  // Search & Filters within tabs
  const [citySearch, setCitySearch] = React.useState<string>('');
  const [inactiveSearch, setInactiveSearch] = React.useState<string>('');

  // ---------------------------------------------------------------------------
  // Data Fetching
  // ---------------------------------------------------------------------------

  const loadData = React.useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const params = {
      preset,
      start_date: preset === 'custom' ? startDate : undefined,
      end_date: preset === 'custom' ? endDate : undefined,
      category: categoryFilter !== 'All' ? categoryFilter : undefined,
      state: stateFilter !== 'All' ? stateFilter : undefined,
    };

    try {
      if (activeTab === 'overview') {
        const res = await api.getOperationsOverview(params);
        setOverviewData(res);
      } else if (activeTab === 'geographic') {
        const res = await api.getGeographicAnalytics(params);
        setGeoData(res);
      } else if (activeTab === 'retention') {
        const res = await api.getCohortRetention();
        setCohortData(res);
      } else if (activeTab === 'sales_gmv') {
        const res = await api.getSalesGmvAnalytics(params);
        setSalesGmvData(res);
      } else if (activeTab === 'benchmarks') {
        const res = await api.getCategoryBenchmarks(params);
        setBenchmarkData(res);
      } else if (activeTab === 'alerts') {
        const res = await api.getOperationalAlerts();
        setAlertsData(res);
      } else if (activeTab === 'schedules') {
        const [schedList, logsList, st] = await Promise.all([
          api.getScheduledReports(),
          api.getScheduledReportLogs(20),
          api.getSchedulerStatus(),
        ]);
        setSchedules(schedList);
        setScheduleLogs(logsList);
        setSchedulerStatus(st);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load reporting data';
      toast.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, preset, startDate, endDate, categoryFilter, stateFilter, toast]);

  // Load Report Builder data
  const loadBuilderData = React.useCallback(async () => {
    setBuilderLoading(true);
    try {
      const res = await api.getReportBuilderData({
        report_type: builderType,
        preset,
        start_date: preset === 'custom' ? startDate : undefined,
        end_date: preset === 'custom' ? endDate : undefined,
        category: categoryFilter !== 'All' ? categoryFilter : undefined,
        state: stateFilter !== 'All' ? stateFilter : undefined,
        city: builderCity.trim() || undefined,
        status: builderStatus !== 'All' ? builderStatus : undefined,
        page: builderPage,
        page_size: 20,
      });
      setBuilderData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to build report';
      toast.error(msg);
    } finally {
      setBuilderLoading(false);
    }
  }, [builderType, preset, startDate, endDate, categoryFilter, stateFilter, builderCity, builderStatus, builderPage, toast]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  React.useEffect(() => {
    if (activeTab === 'builder') {
      loadBuilderData();
    }
  }, [activeTab, loadBuilderData]);

  // ---------------------------------------------------------------------------
  // Action Handlers
  // ---------------------------------------------------------------------------

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchedule.name.trim() || !newSchedule.recipients.trim()) {
      toast.error('Please enter a schedule name and at least one recipient email.');
      return;
    }
    try {
      await api.createScheduledReport(newSchedule);
      toast.success('Report schedule created successfully.');
      setIsScheduleModalOpen(false);
      setNewSchedule({
        name: '',
        report_type: 'sales_gmv',
        frequency: 'weekly',
        recipients: '',
        format: 'csv',
      });
      loadData(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create schedule';
      toast.error(msg);
    }
  };

  const handleToggleSchedule = async (sched: ScheduledReportItem) => {
    const nextStatus = sched.status === 'active' ? 'paused' : 'active';
    setActionLoadingId(sched.id);
    try {
      await api.updateScheduledReport(sched.id, { status: nextStatus });
      toast.success(`Schedule ${nextStatus === 'active' ? 'resumed' : 'paused'}.`);
      loadData(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update schedule';
      toast.error(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRunScheduleNow = async (schedId: number) => {
    setActionLoadingId(schedId);
    try {
      const log = await api.runScheduledReportNow(schedId);
      toast.success(`Report executed successfully (${log.delivered_via}).`);
      loadData(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to execute report';
      toast.error(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteSchedule = async (schedId: number) => {
    if (!window.confirm('Are you sure you want to delete this scheduled report?')) return;
    setActionLoadingId(schedId);
    try {
      await api.deleteScheduledReport(schedId);
      toast.success('Schedule deleted.');
      loadData(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete schedule';
      toast.error(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const getCsvExportUrl = () => {
    return api.getReportExportCsvUrl({
      report_type: activeTab === 'builder' ? builderType : 'sales_gmv',
      preset,
      start_date: preset === 'custom' ? startDate : undefined,
      end_date: preset === 'custom' ? endDate : undefined,
      category: categoryFilter !== 'All' ? categoryFilter : undefined,
      state: stateFilter !== 'All' ? stateFilter : undefined,
    });
  };

  const getPdfExportUrl = () => {
    return api.getReportExportPdfHtmlUrl({
      report_type: activeTab === 'builder' ? builderType : 'platform_summary',
      preset,
      start_date: preset === 'custom' ? startDate : undefined,
      end_date: preset === 'custom' ? endDate : undefined,
      category: categoryFilter !== 'All' ? categoryFilter : undefined,
      state: stateFilter !== 'All' ? stateFilter : undefined,
    });
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const tabs: { id: ReportTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: 'Overview & Growth', icon: BarChart3 },
    { id: 'geographic', label: 'Geographic Adoption', icon: MapPin },
    { id: 'retention', label: 'Cohort Retention', icon: Users },
    { id: 'sales_gmv', label: 'Sales & GMV', icon: TrendingUp },
    { id: 'benchmarks', label: 'Category Benchmarks', icon: Layers },
    { id: 'builder', label: 'Report Builder & Exports', icon: FileSpreadsheet },
    { id: 'schedules', label: 'Scheduled Reports', icon: CalendarClock },
    { id: 'alerts', label: 'Operational Alerts', icon: AlertTriangle },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-7xl pb-16">
      {/* Top Header & Context Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-text-high">
              Operations & Platform Intelligence
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5 animate-pulse" />
              Live DB Sync
            </span>
          </div>
          <p className="text-xs text-text-medium">
            Super-admin platform overview, geographic store density, cohort retention, GMV, category benchmarks, and scheduled reports.
          </p>
        </div>

        {/* Global Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={getCsvExportUrl()}
            download
            className="min-h-[48px] px-3.5 bg-surface text-text-high border border-border rounded-[8px] hover:bg-canvas transition-colors flex items-center gap-2 text-xs font-semibold"
          >
            <Download className="w-4 h-4 text-text-medium" />
            <span>Export CSV</span>
          </a>

          <a
            href={getPdfExportUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[48px] px-3.5 bg-surface text-text-high border border-border rounded-[8px] hover:bg-canvas transition-colors flex items-center gap-2 text-xs font-semibold"
          >
            <Printer className="w-4 h-4 text-text-medium" />
            <span>Print PDF</span>
          </a>

          <Button
            variant="primary"
            onClick={() => loadData(true)}
            className="min-h-[48px] text-xs px-4 gap-2"
          >
            <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Global Filter Toolbar */}
      <Card className="p-3.5 border border-border bg-surface flex flex-col md:flex-row md:items-center justify-between gap-3 flex-wrap">
        {/* Preset Range Selector */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-text-medium mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Period:</span>
          </span>
          {[
            { id: 'today', label: 'Today' },
            { id: '7d', label: '7 Days' },
            { id: '30d', label: '30 Days' },
            { id: '90d', label: '90 Days' },
            { id: 'custom', label: 'Custom' },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setPreset(p.id);
                setBuilderPage(1);
              }}
              className={`min-h-[48px] px-3.5 rounded-[8px] text-xs font-semibold transition-colors border ${
                preset === p.id
                  ? 'bg-primary text-white border-primary'
                  : 'bg-canvas text-text-high border-border hover:bg-surface'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom Date Pickers (if Custom selected) */}
        {preset === 'custom' && (
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="min-h-[48px] px-3 bg-canvas border border-border rounded-[8px] text-xs text-text-high focus:outline-none focus:border-primary"
            />
            <span className="text-xs text-text-medium">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="min-h-[48px] px-3 bg-canvas border border-border rounded-[8px] text-xs text-text-high focus:outline-none focus:border-primary"
            />
          </div>
        )}

        {/* Region & Category Dropdown Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-text-medium" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="min-h-[48px] px-3 bg-canvas border border-border rounded-[8px] text-xs font-medium text-text-high focus:outline-none focus:border-primary"
            >
              <option value="All">All Categories</option>
              <option value="Grocery">Grocery & Kirana</option>
              <option value="Medical">Medical & Pharmacy</option>
              <option value="Stationery">Stationery & Books</option>
              <option value="General">General Store</option>
              <option value="Footwear">Footwear & Apparel</option>
            </select>
          </div>

          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="min-h-[48px] px-3 bg-canvas border border-border rounded-[8px] text-xs font-medium text-text-high focus:outline-none focus:border-primary"
          >
            <option value="All">All States</option>
            <option value="Maharashtra">Maharashtra</option>
            <option value="Gujarat">Gujarat</option>
            <option value="Karnataka">Karnataka</option>
            <option value="Delhi">Delhi</option>
          </select>
        </div>
      </Card>

      {/* Primary Sub-Nav Tabs */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto pb-1 scrollbar-none">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setActiveTab(t.id);
                setBuilderPage(1);
              }}
              className={`min-h-[48px] px-4 py-2 rounded-[8px] text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-text-medium hover:bg-surface hover:text-text-high'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{t.label}</span>
              {t.id === 'alerts' && alertsData && alertsData.alerts.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold">
                  {alertsData.alerts.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-28 bg-surface border border-border rounded-[8px]" />
          ))}
        </div>
      )}

      {/* ------------------------------------------------------------------------ */}
      {/* TAB 1: OVERVIEW & PLATFORM GROWTH                                        */}
      {/* ------------------------------------------------------------------------ */}
      {!loading && activeTab === 'overview' && overviewData && (
        <div className="flex flex-col gap-6">
          {/* Important GMV vs SaaS Revenue Distinction Banner */}
          <div className="p-4 rounded-[8px] bg-blue-50/70 border border-blue-200 flex items-start gap-3">
            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="text-xs text-text-high space-y-1 leading-relaxed">
              <span className="font-bold text-primary block">
                Store BI SaaS Revenue vs Retailer GMV Distinction Notice
              </span>
              <p>
                <strong>Retailer Sales Volume / GMV</strong> represents consumer purchases processed at merchant checkout counters across India.
                <strong> Store BI SaaS Revenue</strong> strictly measures cloud subscription fees collected from merchants by Store BI.
                Retailer sales volumes are never credited as Store BI platform revenue.
              </p>
            </div>
          </div>

          {/* 8 Platform Overview KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: Registered Stores */}
            <Card className="p-4 border border-border bg-surface flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-text-medium">Total Registered Stores</span>
                <Store className="w-4 h-4 text-primary" />
              </div>
              <div className="text-2xl font-bold text-text-high">
                {overviewData.kpis.total_registered_businesses}
              </div>
              <span className="text-[11px] text-text-medium mt-1">
                {overviewData.kpis.trial_businesses} in free trial
              </span>
            </Card>

            {/* Card 2: Active Businesses */}
            <Card className="p-4 border border-border bg-surface flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-text-medium">Active Stores in Period</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-emerald-700">
                {overviewData.kpis.active_businesses}
              </div>
              <span className="text-[11px] text-text-medium mt-1">
                Confirmed POS or stock activity
              </span>
            </Card>

            {/* Card 3: New Registrations */}
            <Card className="p-4 border border-border bg-surface flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-text-medium">New Registrations</span>
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div className="text-2xl font-bold text-text-high">
                +{overviewData.kpis.new_registrations}
              </div>
              <span className="text-[11px] text-text-medium mt-1">
                During selected {overviewData.date_range.preset.toUpperCase()}
              </span>
            </Card>

            {/* Card 4: Inactive Businesses */}
            <Card className="p-4 border border-border bg-surface flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-text-medium">Inactive Stores (&gt;30d)</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-bold text-amber-700">
                {overviewData.kpis.inactive_businesses}
              </div>
              <span className="text-[11px] text-text-medium mt-1">
                Require operational re-engagement
              </span>
            </Card>

            {/* Card 5: Platform Retailer GMV */}
            <Card className="p-4 border border-border bg-surface flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-text-medium">Retailer GMV (Sales Volume)</span>
                <ShoppingBag className="w-4 h-4 text-primary" />
              </div>
              <div className="text-2xl font-bold text-text-high">
                {formatINR(overviewData.kpis.platform_sales_volume)}
              </div>
              <span className="text-[11px] text-text-medium mt-1">
                Consumer spend at merchant counters
              </span>
            </Card>

            {/* Card 6: Total Recorded Orders */}
            <Card className="p-4 border border-border bg-surface flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-text-medium">Total Recorded Orders</span>
                <Package className="w-4 h-4 text-primary" />
              </div>
              <div className="text-2xl font-bold text-text-high">
                {overviewData.kpis.total_recorded_orders}
              </div>
              <span className="text-[11px] text-text-medium mt-1">
                Completed customer checkouts
              </span>
            </Card>

            {/* Card 7: Average Order Value */}
            <Card className="p-4 border border-border bg-surface flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-text-medium">Average Order Value (AOV)</span>
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <div className="text-2xl font-bold text-text-high">
                {formatINR(overviewData.kpis.average_order_value)}
              </div>
              <span className="text-[11px] text-text-medium mt-1">
                Mean checkout ticket size
              </span>
            </Card>

            {/* Card 8: Store BI SaaS Revenue */}
            <Card className="p-4 border border-border bg-surface flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-text-medium">Store BI SaaS Revenue</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-emerald-700">
                {formatINR(overviewData.kpis.storebi_saas_revenue)}
              </div>
              <span className="text-[11px] text-emerald-700 font-semibold mt-1">
                Paid platform subscription fees
              </span>
            </Card>
          </div>

          {/* Growth Trends Chart */}
          <Card className="p-5 border border-border bg-surface">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-text-high">Platform Growth & Daily Transaction Curves</h3>
                <p className="text-xs text-text-medium">
                  Daily recorded merchant sales volume and store activity over time
                </p>
              </div>
              <Badge variant="neutral">Real-time DB aggregate</Badge>
            </div>

            {overviewData.growth_trend.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-xs text-text-medium">
                No activity recorded in this period.
              </div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={overviewData.growth_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e1e8fd" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#434655' }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#434655' }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#434655' }} />
                    <Tooltip
                      formatter={(val: any, name: any) => {
                        const num = Number(val || 0);
                        return name?.includes('Volume') ? [formatINR(num), name] : [num, name];
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="sales_volume"
                      name="Sales Volume (₹)"
                      stroke="#004ac6"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="active_businesses"
                      name="Active Stores"
                      stroke="#006e2d"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="orders_count"
                      name="Orders Count"
                      stroke="#824500"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          {/* Breakdown Grids: Categories & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category Distribution */}
            <Card className="p-4 border border-border bg-surface">
              <h3 className="text-xs font-bold text-text-high mb-3 uppercase tracking-wider">
                Store Distribution by Retail Category
              </h3>
              <div className="flex flex-col gap-2.5">
                {overviewData.category_distribution.map((cat) => (
                  <div key={cat.category} className="p-2.5 rounded-[8px] bg-canvas border border-border flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-text-high block">{cat.category}</span>
                      <span className="text-[11px] text-text-medium">
                        {cat.active_count} active | Sales: {formatINR(cat.total_sales)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-text-high">{cat.count} stores</span>
                      <span className="text-[11px] text-text-medium block">{cat.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Lifecycle Status Distribution */}
            <Card className="p-4 border border-border bg-surface">
              <h3 className="text-xs font-bold text-text-high mb-3 uppercase tracking-wider">
                Store Lifecycle Status
              </h3>
              <div className="flex flex-col gap-2.5">
                {overviewData.status_distribution.map((st) => (
                  <div key={st.status} className="p-2.5 rounded-[8px] bg-canvas border border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          st.status === 'Active'
                            ? 'bg-emerald-600'
                            : st.status === 'Trial'
                            ? 'bg-blue-600'
                            : 'bg-amber-600'
                        }`}
                      />
                      <span className="text-xs font-semibold text-text-high">{st.status}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-text-high">{st.count} accounts</span>
                      <span className="text-[11px] text-text-medium block">{st.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------ */}
      {/* TAB 2: GEOGRAPHIC ANALYTICS                                              */}
      {/* ------------------------------------------------------------------------ */}
      {!loading && activeTab === 'geographic' && geoData && (
        <div className="flex flex-col gap-6">
          {/* Top Regional Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <Card className="p-4 border border-border bg-surface">
              <span className="text-xs text-text-medium block mb-1">Top Adoption State</span>
              <div className="text-xl font-bold text-text-high">
                {geoData.top_adoption_regions[0] || 'Maharashtra'}
              </div>
              <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
                Primary growth cluster
              </span>
            </Card>

            <Card className="p-4 border border-border bg-surface">
              <span className="text-xs text-text-medium block mb-1">Total States Covered</span>
              <div className="text-xl font-bold text-text-high">
                {geoData.states.length}
              </div>
              <span className="text-[11px] text-text-medium mt-1 block">
                Maharashtra &amp; Gujarat prioritized
              </span>
            </Card>

            <Card className="p-4 border border-border bg-surface">
              <span className="text-xs text-text-medium block mb-1">Cities / Hubs Active</span>
              <div className="text-xl font-bold text-text-high">
                {geoData.cities.length}
              </div>
              <span className="text-[11px] text-text-medium mt-1 block">
                Tier-1, 2 &amp; 3 retail centres
              </span>
            </Card>

            <Card className="p-4 border border-border bg-surface">
              <span className="text-xs text-text-medium block mb-1">Unspecified Addresses</span>
              <div className="text-xl font-bold text-amber-700">
                {geoData.unspecified_location_count}
              </div>
              <span className="text-[11px] text-text-medium mt-1 block">
                Not inferred (standing rule)
              </span>
            </Card>
          </div>

          {/* State Distribution Table */}
          <Card className="p-5 border border-border bg-surface">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-text-high">State-wise Store Density &amp; GMV Volume</h3>
                <p className="text-xs text-text-medium">
                  Aggregated merchant adoption metrics across Indian states
                </p>
              </div>
              <Badge variant="neutral">{geoData.states.length} States</Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-canvas text-text-medium font-semibold">
                    <th className="py-2.5 px-3">State</th>
                    <th className="py-2.5 px-3 text-right">Registered Stores</th>
                    <th className="py-2.5 px-3 text-right">Active Stores</th>
                    <th className="py-2.5 px-3 text-right">Orders</th>
                    <th className="py-2.5 px-3 text-right">Sales GMV (₹)</th>
                    <th className="py-2.5 px-3 text-center">Adoption Level</th>
                    <th className="py-2.5 px-3">Dominant Categories</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {geoData.states.map((st) => (
                    <tr key={st.state} className="hover:bg-canvas/50">
                      <td className="py-3 px-3 font-semibold text-text-high">{st.state}</td>
                      <td className="py-3 px-3 text-right font-medium">{st.business_count}</td>
                      <td className="py-3 px-3 text-right text-emerald-700 font-semibold">{st.active_count}</td>
                      <td className="py-3 px-3 text-right">{st.orders_count}</td>
                      <td className="py-3 px-3 text-right font-bold text-text-high">{formatINR(st.total_sales)}</td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            st.adoption_level === 'high'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : st.adoption_level === 'moderate'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {st.adoption_level}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-text-medium">
                        {st.top_categories.join(', ') || '–'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* City Distribution with Instant Search */}
          <Card className="p-5 border border-border bg-surface">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-text-high">City &amp; District Store Adoption</h3>
                <p className="text-xs text-text-medium">
                  Detailed distribution across Pune, Mumbai, Nagpur, Parbhani, Ahmedabad, and other hubs
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-text-medium absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by city name..."
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                  className="w-full min-h-[48px] pl-9 pr-3 bg-canvas border border-border rounded-[8px] text-xs text-text-high focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-canvas text-text-medium font-semibold">
                    <th className="py-2.5 px-3">City</th>
                    <th className="py-2.5 px-3">State</th>
                    <th className="py-2.5 px-3 text-right">Stores</th>
                    <th className="py-2.5 px-3 text-right">Active Stores</th>
                    <th className="py-2.5 px-3 text-right">Orders</th>
                    <th className="py-2.5 px-3 text-right">Sales GMV (₹)</th>
                    <th className="py-2.5 px-3">Primary Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {geoData.cities
                    .filter((c) =>
                      citySearch ? c.city.toLowerCase().includes(citySearch.toLowerCase()) : true
                    )
                    .map((ct) => (
                      <tr key={`${ct.city}-${ct.state}`} className="hover:bg-canvas/50">
                        <td className="py-3 px-3 font-semibold text-text-high">{ct.city}</td>
                        <td className="py-3 px-3 text-text-medium">{ct.state}</td>
                        <td className="py-3 px-3 text-right font-medium">{ct.business_count}</td>
                        <td className="py-3 px-3 text-right text-emerald-700 font-semibold">{ct.active_count}</td>
                        <td className="py-3 px-3 text-right">{ct.orders_count}</td>
                        <td className="py-3 px-3 text-right font-bold text-text-high">{formatINR(ct.total_sales)}</td>
                        <td className="py-3 px-3 text-text-medium">{ct.dominant_category}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ------------------------------------------------------------------------ */}
      {/* TAB 3: COHORT RETENTION & INACTIVE STORES                                */}
      {/* ------------------------------------------------------------------------ */}
      {!loading && activeTab === 'retention' && cohortData && (
        <div className="flex flex-col gap-6">
          {/* Meaningful Activity Callout */}
          <div className="p-4 rounded-[8px] bg-emerald-50/70 border border-emerald-200 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-xs text-text-high space-y-1">
              <span className="font-bold text-emerald-800 block">
                Strict Meaningful Activity Standard
              </span>
              <p>{cohortData.activity_definition}</p>
            </div>
          </div>

          {/* Retention Cohort Heatmap Table */}
          <Card className="p-5 border border-border bg-surface">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-text-high">Monthly Store Registration Cohort Matrix</h3>
                <p className="text-xs text-text-medium">
                  Percentage of stores returning to record sales, inward stock, or invoices after signup
                </p>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                Overall 30-Day Retention: {cohortData.overall_retention_30d}%
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-canvas text-text-medium font-semibold">
                    <th className="py-2.5 px-3">Cohort Month</th>
                    <th className="py-2.5 px-3 text-right">Size (N)</th>
                    <th className="py-2.5 px-3 text-center">Day 1 Retention</th>
                    <th className="py-2.5 px-3 text-center">Day 7 Retention</th>
                    <th className="py-2.5 px-3 text-center">Day 30 Retention</th>
                    <th className="py-2.5 px-3 text-center">Day 90 Retention</th>
                    <th className="py-2.5 px-3 text-right">Currently Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cohortData.cohorts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-text-medium">
                        No cohorts available yet.
                      </td>
                    </tr>
                  ) : (
                    cohortData.cohorts.map((c) => (
                      <tr key={c.cohort_label} className="hover:bg-canvas/50">
                        <td className="py-3 px-3 font-bold text-text-high">{c.cohort_label}</td>
                        <td className="py-3 px-3 text-right font-medium">{c.cohort_size}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2.5 py-1 rounded font-bold ${c.day_1_pct >= 50 ? 'bg-emerald-100 text-emerald-800' : 'bg-canvas text-text-medium'}`}>
                            {c.day_1_pct}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2.5 py-1 rounded font-bold ${c.day_7_pct >= 40 ? 'bg-emerald-100 text-emerald-800' : 'bg-canvas text-text-medium'}`}>
                            {c.day_7_pct}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2.5 py-1 rounded font-bold ${c.day_30_pct >= 30 ? 'bg-emerald-100 text-emerald-800' : 'bg-canvas text-text-medium'}`}>
                            {c.day_30_pct}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2.5 py-1 rounded font-bold ${c.day_90_pct >= 25 ? 'bg-emerald-100 text-emerald-800' : 'bg-canvas text-text-medium'}`}>
                            {c.day_90_pct}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-emerald-700">
                          {c.current_active} ({c.current_active_pct}%)
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Inactive Businesses Inspector */}
          <Card className="p-5 border border-border bg-surface">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-text-high">Inactive Merchants Inspector</h3>
                <p className="text-xs text-text-medium">
                  Stores requiring operational outreach (confirmed inactive or no activity recorded since registration)
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-text-medium absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search inactive stores..."
                  value={inactiveSearch}
                  onChange={(e) => setInactiveSearch(e.target.value)}
                  className="w-full min-h-[48px] pl-9 pr-3 bg-canvas border border-border rounded-[8px] text-xs text-text-high focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-canvas text-text-medium font-semibold">
                    <th className="py-2.5 px-3">Store Name</th>
                    <th className="py-2.5 px-3">Owner / Contact</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Registered On</th>
                    <th className="py-2.5 px-3">Last Active</th>
                    <th className="py-2.5 px-3 text-right">Days Inactive</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cohortData.inactive_businesses
                    .filter((b) =>
                      inactiveSearch
                        ? b.name.toLowerCase().includes(inactiveSearch.toLowerCase()) ||
                          b.owner_name.toLowerCase().includes(inactiveSearch.toLowerCase())
                        : true
                    )
                    .map((item) => (
                      <tr key={item.shop_id} className="hover:bg-canvas/50">
                        <td className="py-3 px-3 font-bold text-text-high">{item.name}</td>
                        <td className="py-3 px-3">
                          <span className="font-medium text-text-high block">{item.owner_name}</span>
                          <span className="text-[11px] text-text-medium">{item.phone}</span>
                        </td>
                        <td className="py-3 px-3 text-text-medium">
                          {item.city}, {item.state}
                        </td>
                        <td className="py-3 px-3 text-text-medium">{item.category}</td>
                        <td className="py-3 px-3 text-text-medium">{item.registered_at}</td>
                        <td className="py-3 px-3 text-text-medium">{item.last_active_at || 'Never'}</td>
                        <td className="py-3 px-3 text-right font-bold text-amber-700">
                          {item.days_inactive}d
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              item.inactivity_status === 'confirmed_inactive'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-red-50 text-red-800 border border-red-200'
                            }`}
                          >
                            {item.inactivity_status === 'confirmed_inactive' ? 'Dormant' : 'Unactivated'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => navigate(`/admin/businesses/${item.shop_id}`)}
                            className="min-h-[48px] px-3 py-1.5 rounded-[8px] bg-canvas border border-border hover:bg-surface text-xs font-semibold text-primary transition-colors inline-flex items-center gap-1"
                          >
                            <span>Inspect</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ------------------------------------------------------------------------ */}
      {/* TAB 4: SALES & GMV ANALYTICS                                             */}
      {/* ------------------------------------------------------------------------ */}
      {!loading && activeTab === 'sales_gmv' && salesGmvData && (
        <div className="flex flex-col gap-6">
          {/* Key GMV KPI Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <Card className="p-4 border border-border bg-surface">
              <span className="text-xs text-text-medium block mb-1">Total Retailer GMV</span>
              <div className="text-2xl font-bold text-text-high">
                {formatINR(salesGmvData.total_sales_gmv)}
              </div>
              <span className="text-[11px] text-text-medium mt-1 block">
                Participating merchant counter sales
              </span>
            </Card>

            <Card className="p-4 border border-border bg-surface">
              <span className="text-xs text-text-medium block mb-1">Completed Retail Orders</span>
              <div className="text-2xl font-bold text-text-high">
                {salesGmvData.completed_orders}
              </div>
              <span className="text-[11px] text-text-medium mt-1 block">
                Counter checkouts processed
              </span>
            </Card>

            <Card className="p-4 border border-border bg-surface">
              <span className="text-xs text-text-medium block mb-1">Average Order Value (AOV)</span>
              <div className="text-2xl font-bold text-text-high">
                {formatINR(salesGmvData.average_order_value)}
              </div>
              <span className="text-[11px] text-text-medium mt-1 block">
                Average checkout size
              </span>
            </Card>

            <Card className="p-4 border border-border bg-surface">
              <span className="text-xs text-text-medium block mb-1">Store BI SaaS Revenue</span>
              <div className="text-2xl font-bold text-emerald-700">
                {formatINR(salesGmvData.storebi_saas_revenue)}
              </div>
              <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
                Store BI platform subscription fees
              </span>
            </Card>
          </div>

          {/* Payment Modes & Regional Sales Side-by-Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Payment Modes */}
            <Card className="p-5 border border-border bg-surface">
              <h3 className="text-xs font-bold text-text-high mb-3 uppercase tracking-wider">
                Transaction Volume by Payment Mode
              </h3>
              <div className="flex flex-col gap-3">
                {salesGmvData.payment_modes.map((pm) => (
                  <div key={pm.mode} className="p-3 rounded-[8px] bg-canvas border border-border flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-text-high block">{pm.mode}</span>
                      <span className="text-[11px] text-text-medium">{pm.orders_count} orders</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-text-high">{formatINR(pm.amount)}</span>
                      <span className="text-[11px] text-emerald-700 font-semibold block">{pm.share_pct}% share</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Regional Sales */}
            <Card className="p-5 border border-border bg-surface">
              <h3 className="text-xs font-bold text-text-high mb-3 uppercase tracking-wider">
                Regional Sales Volume Comparison
              </h3>
              <div className="flex flex-col gap-3">
                {salesGmvData.regional_sales.map((reg) => (
                  <div key={reg.region} className="p-3 rounded-[8px] bg-canvas border border-border flex items-center justify-between">
                    <span className="text-xs font-bold text-text-high">{reg.region}</span>
                    <div className="text-right">
                      <span className="text-xs font-bold text-text-high">{formatINR(reg.sales_volume)}</span>
                      <span className="text-[11px] text-text-medium block">{reg.share_pct}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Top Performing Stores Leaderboard */}
          <Card className="p-5 border border-border bg-surface">
            <h3 className="text-sm font-bold text-text-high mb-1">Top-Performing Merchant Stores</h3>
            <p className="text-xs text-text-medium mb-4">
              Leaderboard by sales volume processed through Store BI
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-canvas text-text-medium font-semibold">
                    <th className="py-2.5 px-3">Store Name</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-right">Orders</th>
                    <th className="py-2.5 px-3 text-right">Total Sales GMV (₹)</th>
                    <th className="py-2.5 px-3 text-right">AOV (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {salesGmvData.top_stores.map((st) => (
                    <tr key={st.shop_id} className="hover:bg-canvas/50">
                      <td className="py-3 px-3 font-bold text-text-high">{st.name}</td>
                      <td className="py-3 px-3 text-text-medium">{st.city}, {st.state}</td>
                      <td className="py-3 px-3 text-text-medium">{st.category}</td>
                      <td className="py-3 px-3 text-right">{st.orders_count}</td>
                      <td className="py-3 px-3 text-right font-bold text-text-high">{formatINR(st.sales_volume)}</td>
                      <td className="py-3 px-3 text-right">{formatINR(st.aov)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ------------------------------------------------------------------------ */}
      {/* TAB 5: CATEGORY BENCHMARKING                                             */}
      {/* ------------------------------------------------------------------------ */}
      {!loading && activeTab === 'benchmarks' && benchmarkData && (
        <div className="flex flex-col gap-6">
          {/* Privacy Guarantee Banner */}
          <div className="p-4 rounded-[8px] bg-canvas border border-border flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-text-high space-y-1">
              <span className="font-bold text-text-high block">
                Confidential Benchmarking Architecture
              </span>
              <p className="text-text-medium">{benchmarkData.privacy_statement}</p>
            </div>
          </div>

          {/* Benchmark Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {benchmarkData.categories.map((b) => (
              <Card key={b.category} className="p-5 border border-border bg-surface flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-text-high">{b.category}</h4>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        b.sample_size_status === 'sufficient'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {b.sample_size_status === 'sufficient' ? `N = ${b.sample_size}` : `N = ${b.sample_size} (Low Sample)`}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 mt-4 pt-3 border-t border-border text-xs">
                    <div>
                      <span className="text-[11px] text-text-medium block">Average Sales</span>
                      <span className="font-bold text-text-high">{formatINR(b.avg_sales)}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-text-medium block">Median Sales</span>
                      <span className="font-bold text-text-high">{formatINR(b.median_sales)}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-text-medium block">Avg Orders / Store</span>
                      <span className="font-bold text-text-high">{b.avg_orders}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-text-medium block">Avg Ticket (AOV)</span>
                      <span className="font-bold text-text-high">{formatINR(b.avg_order_value)}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-text-medium block">Inventory Value</span>
                      <span className="font-bold text-text-high">{formatINR(b.total_inventory_value)}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-text-medium block">Avg Catalog SKUs</span>
                      <span className="font-bold text-text-high">{b.avg_products_count}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px]">
                  <span className="text-text-medium">
                    Low Stock: <strong className="text-amber-700">{b.low_stock_frequency_pct}%</strong>
                  </span>
                  <span className="text-text-medium">
                    Active Rate: <strong className="text-emerald-700">{b.active_retention_pct}%</strong>
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------ */}
      {/* TAB 6: REPORT BUILDER & EXPORTS                                          */}
      {/* ------------------------------------------------------------------------ */}
      {!loading && activeTab === 'builder' && (
        <div className="flex flex-col gap-6">
          {/* Builder Controls */}
          <Card className="p-5 border border-border bg-surface">
            <h3 className="text-sm font-bold text-text-high mb-3">Custom Report Query Builder</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-text-medium block mb-1">Report Dataset</label>
                <select
                  value={builderType}
                  onChange={(e) => {
                    setBuilderType(e.target.value);
                    setBuilderPage(1);
                  }}
                  className="w-full min-h-[48px] px-3 bg-canvas border border-border rounded-[8px] text-xs font-medium text-text-high focus:outline-none focus:border-primary"
                >
                  <option value="sales_gmv">Retailer Sales &amp; GMV Ledger</option>
                  <option value="geographic">Geographic Adoption Ledger</option>
                  <option value="retention_cohorts">Cohort Retention Breakdown</option>
                  <option value="category_benchmarks">Retail Category Benchmarks</option>
                  <option value="platform_summary">Platform Executive Summary</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-text-medium block mb-1">Business Status</label>
                <select
                  value={builderStatus}
                  onChange={(e) => {
                    setBuilderStatus(e.target.value);
                    setBuilderPage(1);
                  }}
                  className="w-full min-h-[48px] px-3 bg-canvas border border-border rounded-[8px] text-xs font-medium text-text-high focus:outline-none focus:border-primary"
                >
                  <option value="All">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="expired">Expired</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-text-medium block mb-1">City Filter</label>
                <input
                  type="text"
                  placeholder="e.g. Pune, Mumbai, Ahmedabad"
                  value={builderCity}
                  onChange={(e) => {
                    setBuilderCity(e.target.value);
                    setBuilderPage(1);
                  }}
                  className="w-full min-h-[48px] px-3 bg-canvas border border-border rounded-[8px] text-xs text-text-high focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-end">
                <Button
                  variant="primary"
                  onClick={loadBuilderData}
                  className="w-full min-h-[48px] text-xs font-semibold gap-2"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${builderLoading ? 'animate-spin' : ''}`} />
                  <span>Execute Query</span>
                </Button>
              </div>
            </div>
          </Card>

          {/* Builder Results Table */}
          <Card className="p-5 border border-border bg-surface">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-text-high">
                  {builderData?.title || 'Report Results'}
                </h3>
                <span className="text-xs text-text-medium">
                  Showing {builderData?.rows.length || 0} of {builderData?.total_rows || 0} total records
                </span>
              </div>

              {/* Export Buttons */}
              <div className="flex items-center gap-2">
                <a
                  href={getCsvExportUrl()}
                  download
                  className="min-h-[48px] px-3.5 bg-canvas text-text-high border border-border rounded-[8px] hover:bg-surface text-xs font-semibold flex items-center gap-2"
                >
                  <Download className="w-3.5 h-3.5 text-text-medium" />
                  <span>Download CSV (Formula-Protected)</span>
                </a>
              </div>
            </div>

            {builderLoading ? (
              <div className="h-64 flex items-center justify-center text-xs text-text-medium animate-pulse">
                Running analytics query across platform databases...
              </div>
            ) : !builderData || builderData.rows.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-xs text-text-medium">
                No matching records found for the applied filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border bg-canvas text-text-medium font-semibold">
                      {builderData.columns.map((c) => (
                        <th
                          key={c.key}
                          className={`py-2.5 px-3 ${c.align === 'right' ? 'text-right' : 'text-left'}`}
                        >
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {builderData.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-canvas/50">
                        {builderData.columns.map((col) => {
                          const val = row[col.key];
                          return (
                            <td
                              key={col.key}
                              className={`py-3 px-3 ${col.align === 'right' ? 'text-right font-medium' : 'text-left'}`}
                            >
                              {typeof val === 'number' && col.key.includes('sales')
                                ? formatINR(val)
                                : String(val ?? '–')}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {builderData && builderData.total_pages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
                <span className="text-xs text-text-medium">
                  Page {builderData.page} of {builderData.total_pages}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    disabled={builderPage <= 1}
                    onClick={() => setBuilderPage((p) => Math.max(1, p - 1))}
                    className="min-h-[48px] px-3 text-xs"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={builderPage >= builderData.total_pages}
                    onClick={() => setBuilderPage((p) => p + 1)}
                    className="min-h-[48px] px-3 text-xs"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ------------------------------------------------------------------------ */}
      {/* TAB 7: SCHEDULED REPORTS MANAGEMENT                                      */}
      {/* ------------------------------------------------------------------------ */}
      {!loading && activeTab === 'schedules' && (
        <div className="flex flex-col gap-6">
          {/* Email Delivery Service Status Banner */}
          <div className="p-4 rounded-[8px] bg-canvas border border-border flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <CalendarClock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-text-high text-xs">
                    Automated Delivery Gateway Status:
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      schedulerStatus?.is_email_live
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {schedulerStatus?.provider || 'Development Audit Console'}
                  </span>
                </div>
                <p className="text-xs text-text-medium">
                  {schedulerStatus?.description}
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              onClick={() => setIsScheduleModalOpen(true)}
              className="min-h-[48px] text-xs px-4 gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>New Schedule</span>
            </Button>
          </div>

          {/* Active Schedules Table */}
          <Card className="p-5 border border-border bg-surface">
            <h3 className="text-sm font-bold text-text-high mb-1">Active Automated Schedules</h3>
            <p className="text-xs text-text-medium mb-4">
              Configured recurring deliveries dispatched to operations leads
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-canvas text-text-medium font-semibold">
                    <th className="py-2.5 px-3">Schedule Name</th>
                    <th className="py-2.5 px-3">Report Type</th>
                    <th className="py-2.5 px-3">Cadence</th>
                    <th className="py-2.5 px-3">Recipients</th>
                    <th className="py-2.5 px-3">Format</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Last Run</th>
                    <th className="py-2.5 px-3">Next Run</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {schedules.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-text-medium">
                        No recurring report schedules configured. Click "New Schedule" to create one.
                      </td>
                    </tr>
                  ) : (
                    schedules.map((sched) => (
                      <tr key={sched.id} className="hover:bg-canvas/50">
                        <td className="py-3 px-3 font-bold text-text-high">{sched.name}</td>
                        <td className="py-3 px-3 capitalize text-text-medium">
                          {sched.report_type.replace('_', ' ')}
                        </td>
                        <td className="py-3 px-3 font-semibold uppercase text-primary">
                          {sched.frequency}
                        </td>
                        <td className="py-3 px-3 text-text-medium max-w-[180px] truncate">
                          {sched.recipients}
                        </td>
                        <td className="py-3 px-3 uppercase text-text-medium">{sched.format}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              sched.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-canvas text-text-medium border border-border'
                            }`}
                          >
                            {sched.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-text-medium">{sched.last_run_at || 'Never'}</td>
                        <td className="py-3 px-3 text-text-medium">{sched.next_run_at || '–'}</td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              title="Run Now"
                              disabled={actionLoadingId === sched.id}
                              onClick={() => handleRunScheduleNow(sched.id)}
                              className="min-h-[48px] px-3 py-1 bg-canvas border border-border rounded-[8px] hover:bg-surface text-primary transition-colors flex items-center gap-1 text-xs font-semibold"
                            >
                              <Play className="w-3.5 h-3.5" />
                              <span>Run</span>
                            </button>
                            <button
                              title={sched.status === 'active' ? 'Pause' : 'Resume'}
                              disabled={actionLoadingId === sched.id}
                              onClick={() => handleToggleSchedule(sched)}
                              className="min-h-[48px] px-2.5 py-1 bg-canvas border border-border rounded-[8px] hover:bg-surface text-text-medium transition-colors"
                            >
                              {sched.status === 'active' ? (
                                <Pause className="w-3.5 h-3.5" />
                              ) : (
                                <Play className="w-3.5 h-3.5 text-emerald-600" />
                              )}
                            </button>
                            <button
                              title="Delete"
                              disabled={actionLoadingId === sched.id}
                              onClick={() => handleDeleteSchedule(sched.id)}
                              className="min-h-[48px] px-2.5 py-1 bg-canvas border border-border rounded-[8px] hover:bg-red-50 text-red-600 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Delivery & Execution Audit History */}
          <Card className="p-5 border border-border bg-surface">
            <h3 className="text-sm font-bold text-text-high mb-1">Execution &amp; Delivery Audit Logs</h3>
            <p className="text-xs text-text-medium mb-4">
              Historical record of dispatched automated reports and delivery statuses
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-canvas text-text-medium font-semibold">
                    <th className="py-2.5 px-3">Executed At</th>
                    <th className="py-2.5 px-3">Report Name</th>
                    <th className="py-2.5 px-3">Cadence</th>
                    <th className="py-2.5 px-3">Recipients</th>
                    <th className="py-2.5 px-3">Delivered Via</th>
                    <th className="py-2.5 px-3">Duration</th>
                    <th className="py-2.5 px-3 text-right">Delivery Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {scheduleLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-text-medium">
                        No delivery logs recorded yet.
                      </td>
                    </tr>
                  ) : (
                    scheduleLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-canvas/50">
                        <td className="py-3 px-3 font-medium text-text-high">{log.executed_at}</td>
                        <td className="py-3 px-3 font-semibold text-text-high">{log.report_name}</td>
                        <td className="py-3 px-3 capitalize text-text-medium">{log.frequency}</td>
                        <td className="py-3 px-3 text-text-medium">{log.recipients}</td>
                        <td className="py-3 px-3 uppercase text-text-medium">{log.delivered_via}</td>
                        <td className="py-3 px-3 text-text-medium">{log.duration_ms} ms</td>
                        <td className="py-3 px-3 text-right">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              log.status === 'success'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ------------------------------------------------------------------------ */}
      {/* TAB 8: OPERATIONAL MONITORING & ALERTS                                   */}
      {/* ------------------------------------------------------------------------ */}
      {!loading && activeTab === 'alerts' && alertsData && (
        <div className="flex flex-col gap-6">
          {/* Summary Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <Card className="p-4 border border-border bg-surface flex items-center justify-between">
              <div>
                <span className="text-xs text-text-medium block mb-1">Critical Alerts</span>
                <span className="text-2xl font-bold text-red-700">{alertsData.critical_count}</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-700 flex items-center justify-center font-bold">
                !
              </div>
            </Card>

            <Card className="p-4 border border-border bg-surface flex items-center justify-between">
              <div>
                <span className="text-xs text-text-medium block mb-1">Operational Warnings</span>
                <span className="text-2xl font-bold text-amber-700">{alertsData.warning_count}</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                ⚠
              </div>
            </Card>

            <Card className="p-4 border border-border bg-surface flex items-center justify-between">
              <div>
                <span className="text-xs text-text-medium block mb-1">Informational Notices</span>
                <span className="text-2xl font-bold text-blue-700">{alertsData.info_count}</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                i
              </div>
            </Card>
          </div>

          {/* Alerts List */}
          <div className="flex flex-col gap-3">
            {alertsData.alerts.length === 0 ? (
              <Card className="p-8 text-center border border-border bg-surface">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-text-high mb-1">All Operational Signals Healthy</h4>
                <p className="text-xs text-text-medium">
                  No abnormal sales drops, dormant merchant surges, or inventory discrepancies detected.
                </p>
              </Card>
            ) : (
              alertsData.alerts.map((alert) => (
                <Card
                  key={alert.id}
                  className={`p-4 border rounded-[8px] flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    alert.severity === 'critical'
                      ? 'border-red-200 bg-red-50/30'
                      : alert.severity === 'warning'
                      ? 'border-amber-200 bg-amber-50/30'
                      : 'border-border bg-surface'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle
                      className={`w-5 h-5 shrink-0 mt-0.5 ${
                        alert.severity === 'critical'
                          ? 'text-red-600'
                          : alert.severity === 'warning'
                          ? 'text-amber-600'
                          : 'text-primary'
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-xs text-text-high">{alert.title}</span>
                        <span
                          className={`px-2 py-0.2 rounded text-[10px] font-bold uppercase ${
                            alert.severity === 'critical'
                              ? 'bg-red-100 text-red-800'
                              : alert.severity === 'warning'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-xs text-text-medium mb-2">{alert.description}</p>
                      <div className="text-[11px] text-text-medium bg-canvas p-2 rounded border border-border">
                        <strong>Recommended Human Investigation:</strong> {alert.recommended_action}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 border-t md:border-t-0 md:border-l border-border pt-3 md:pt-0 md:pl-4">
                    <span className="text-xs font-bold text-text-high block">{alert.metric_value}</span>
                    <span className="text-[11px] text-text-medium block">Threshold: {alert.threshold}</span>
                    <span className="text-[10px] text-text-medium mt-1 block">{alert.created_at}</span>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------ */}
      {/* CREATE REPORT SCHEDULE MODAL                                             */}
      {/* ------------------------------------------------------------------------ */}
      <Modal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        title="Schedule New Operations Report"
      >
        <form onSubmit={handleCreateSchedule} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-text-medium block mb-1">
              Schedule Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Weekly GMV & Store Density Digest"
              value={newSchedule.name}
              onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })}
              className="w-full min-h-[48px] px-3 bg-canvas border border-border rounded-[8px] text-xs text-text-high focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-text-medium block mb-1">
                Report Dataset *
              </label>
              <select
                value={newSchedule.report_type}
                onChange={(e) => setNewSchedule({ ...newSchedule, report_type: e.target.value })}
                className="w-full min-h-[48px] px-3 bg-canvas border border-border rounded-[8px] text-xs font-medium text-text-high focus:outline-none focus:border-primary"
              >
                <option value="sales_gmv">Retailer Sales &amp; GMV</option>
                <option value="platform_summary">Platform Overview Summary</option>
                <option value="geographic">Geographic Store Adoption</option>
                <option value="retention_cohorts">Cohort Retention Matrix</option>
                <option value="category_benchmarks">Retail Category Benchmarks</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-text-medium block mb-1">
                Delivery Cadence *
              </label>
              <select
                value={newSchedule.frequency}
                onChange={(e) => setNewSchedule({ ...newSchedule, frequency: e.target.value })}
                className="w-full min-h-[48px] px-3 bg-canvas border border-border rounded-[8px] text-xs font-medium text-text-high focus:outline-none focus:border-primary"
              >
                <option value="daily">Daily (Every 24h)</option>
                <option value="weekly">Weekly (Every Monday)</option>
                <option value="monthly">Monthly (1st of month)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-text-medium block mb-1">
              Authorized Recipients (Comma-separated emails) *
            </label>
            <input
              type="text"
              required
              placeholder="operations@storebi.com, lead@storebi.com"
              value={newSchedule.recipients}
              onChange={(e) => setNewSchedule({ ...newSchedule, recipients: e.target.value })}
              className="w-full min-h-[48px] px-3 bg-canvas border border-border rounded-[8px] text-xs text-text-high focus:outline-none focus:border-primary"
            />
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsScheduleModalOpen(false)}
              className="min-h-[48px] text-xs px-4"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="min-h-[48px] text-xs px-4 font-semibold"
            >
              Save Schedule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
