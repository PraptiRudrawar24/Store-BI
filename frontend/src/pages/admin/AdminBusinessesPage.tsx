import * as React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  Download,
  RotateCcw,
  Store,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { api } from '../../api/client';
import type {
  AdminBusinessesResponse,
} from '../../api/client';

export function AdminBusinessesPage() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<AdminBusinessesResponse | null>(null);

  // Filter States
  const [search, setSearch] = React.useState(searchParams.get('search') || '');
  const [status, setStatus] = React.useState<string>(searchParams.get('status') || 'all');
  const [category, setCategory] = React.useState<string>(searchParams.get('category') || 'All');
  const [city, setCity] = React.useState<string>(searchParams.get('city') || 'All');
  const [page, setPage] = React.useState<number>(1);
  const [selectedIds, setSelectedIds] = React.useState<number[]>([]);
  const [bulkProcessing, setBulkProcessing] = React.useState(false);

  const fetchBusinesses = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAdminBusinesses({
        search: search.trim() || undefined,
        status: status !== 'all' ? status : undefined,
        category: category !== 'All' ? category : undefined,
        city: city !== 'All' ? city : undefined,
        page,
        page_size: 10,
      });
      setData(res);
      setSelectedIds([]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch businesses';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [search, status, category, city, page, toast]);

  React.useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  // Bulk actions handler
  const handleBulkAction = async (action: string, days?: number) => {
    if (selectedIds.length === 0) return;
    setBulkProcessing(true);
    try {
      const res = await api.adminBulkAction(action, selectedIds, days);
      toast.success(res.message || `Performed ${action} on ${res.updated_count} businesses`);
      await fetchBusinesses();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Bulk action failed';
      toast.error(msg);
    } finally {
      setBulkProcessing(false);
    }
  };

  // CSV Export handler
  const handleExportCSV = () => {
    const url = api.exportBusinessesCSVUrl({
      search: search.trim() || undefined,
      status: status !== 'all' ? status : undefined,
      category: category !== 'All' ? category : undefined,
      city: city !== 'All' ? city : undefined,
    });
    window.open(url, '_blank');
    toast.success('Downloading businesses CSV...');
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatus('all');
    setCategory('All');
    setCity('All');
    setPage(1);
    setSearchParams({});
  };

  const allItems = data?.items || [];
  const totalCount = data?.total_count || 0;
  const trialCount = data?.trial_count || 0;
  const activeCount = data?.active_count || 0;
  const expiredCount = data?.expired_count || 0;

  const isAllSelected = allItems.length > 0 && allItems.every((item) => selectedIds.includes(item.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allItems.map((item) => item.id));
    }
  };

  const toggleSelectItem = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-high">Businesses</h1>
          <p className="text-xs text-text-medium mt-0.5">
            Monitor merchant trials, active annual subscriptions, and operational accounts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleExportCSV}
            className="text-xs min-h-[48px] px-4 gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Filter Control Card */}
      <Card className="p-4 border border-border bg-surface flex flex-col gap-3.5">
        {/* Global Search Bar */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-text-medium absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by business name, owner name, phone, or store code..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full h-10 pl-10 pr-4 bg-canvas border border-border rounded-[8px] text-xs text-text-high placeholder:text-text-low focus:border-primary focus:outline-none"
          />
        </div>

        {/* Filter Row: Status Tabs & Select Dropdowns */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border/60">
          {/* Status Tabs Pill Group */}
          <div className="flex items-center gap-1 p-0.5 bg-canvas border border-border rounded-[8px] text-xs">
            <button
              type="button"
              onClick={() => { setStatus('all'); setPage(1); }}
              className={`px-3 py-1.5 rounded-[6px] font-semibold transition-colors ${
                status === 'all'
                  ? 'bg-surface text-text-high border border-border'
                  : 'text-text-medium hover:text-text-high'
              }`}
            >
              All ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => { setStatus('trial'); setPage(1); }}
              className={`px-3 py-1.5 rounded-[6px] font-semibold transition-colors ${
                status === 'trial'
                  ? 'bg-surface text-amber-700 border border-border'
                  : 'text-text-medium hover:text-text-high'
              }`}
            >
              Trial ({trialCount})
            </button>
            <button
              type="button"
              onClick={() => { setStatus('active'); setPage(1); }}
              className={`px-3 py-1.5 rounded-[6px] font-semibold transition-colors ${
                status === 'active'
                  ? 'bg-surface text-emerald-700 border border-border'
                  : 'text-text-medium hover:text-text-high'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => { setStatus('expired'); setPage(1); }}
              className={`px-3 py-1.5 rounded-[6px] font-semibold transition-colors ${
                status === 'expired'
                  ? 'bg-surface text-destructive border border-border'
                  : 'text-text-medium hover:text-text-high'
              }`}
            >
              Expired ({expiredCount})
            </button>
          </div>

          {/* Dropdown Selects */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Category Select */}
            <select
              aria-label="Category"
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              className="h-9 px-3 bg-canvas border border-border rounded-[8px] text-xs text-text-high focus:outline-none cursor-pointer"
            >
              <option value="All">All types (Grocery, Pharmacy, etc.)</option>
              <option value="Grocery">Grocery & Kirana</option>
              <option value="Pharmacy">Medical & Pharmacy</option>
              <option value="Electronics">Electronics & Mobile</option>
              <option value="General">General store</option>
            </select>

            {/* City Select */}
            <select
              aria-label="City"
              value={city}
              onChange={(e) => { setCity(e.target.value); setPage(1); }}
              className="h-9 px-3 bg-canvas border border-border rounded-[8px] text-xs text-text-high focus:outline-none cursor-pointer"
            >
              <option value="All">All cities</option>
              <option value="Pune">Pune, MH</option>
              <option value="Mumbai">Mumbai, MH</option>
              <option value="Bengaluru">Bengaluru, KA</option>
              <option value="Delhi">Delhi, DL</option>
              <option value="Nagpur">Nagpur, MH</option>
              <option value="Nashik">Nashik, MH</option>
            </select>

            {/* Reset Filters */}
            <button
              type="button"
              onClick={handleResetFilters}
              className="h-9 px-2.5 text-xs text-primary font-semibold hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </Card>

      {/* Active Selection Quick Bar (appears when 1+ checkboxes selected) */}
      {selectedIds.length > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-[8px] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-xs font-semibold text-text-high">
            <span>{selectedIds.length} {selectedIds.length === 1 ? 'business' : 'businesses'} selected</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              onClick={() => handleBulkAction('extend_trial', 7)}
              disabled={bulkProcessing}
              className="text-xs min-h-[48px] px-3.5 bg-surface"
            >
              Extend trial (7 days)
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleBulkAction('activate')}
              disabled={bulkProcessing}
              className="text-xs min-h-[48px] px-3.5 bg-surface text-emerald-700"
            >
              Upgrade to active
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleBulkAction('suspend')}
              disabled={bulkProcessing}
              className="text-xs min-h-[48px] px-3.5"
            >
              Suspend access
            </Button>
          </div>
        </div>
      )}

      {/* Businesses Data Table */}
      <Card className="border border-border bg-surface overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs border-collapse min-w-[980px]">
            {/* Table Header */}
            <thead>
              <tr className="bg-canvas border-b border-border text-text-medium text-[11px] font-semibold">
                <th className="py-3 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    aria-label="Select all businesses"
                    className="w-4 h-4 rounded border-border text-primary cursor-pointer accent-[#2563eb]"
                  />
                </th>
                <th className="py-3 px-4">Business name</th>
                <th className="py-3 px-4">Owner name</th>
                <th className="py-3 px-4">City & state</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4">Trial end date</th>
                <th className="py-3 px-4">Last active</th>
                <th className="py-3 px-4 text-right pr-6">Actions</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-text-medium">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span>Loading registered stores...</span>
                    </div>
                  </td>
                </tr>
              ) : allItems.length === 0 ? (
                // ZERO-START RULE: Table shows "No businesses have registered yet"
                <tr>
                  <td colSpan={10} className="py-16 text-center text-text-medium">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-[8px] bg-canvas border border-border flex items-center justify-center text-text-low mb-3">
                        <Store className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-bold text-text-high">
                        No businesses have registered yet
                      </span>
                      <p className="text-xs text-text-medium mt-1">
                        When retail merchants sign up via mobile OTP and onboard their stores, their profiles, trial countdowns, and plan status will populate here automatically.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                allItems.map((item) => {
                  const isChecked = selectedIds.includes(item.id);

                  // Status badge format
                  let statusBadge = (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                      Trial
                    </span>
                  );

                  if (item.status === 'active') {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        Active
                      </span>
                    );
                  } else if (item.status === 'expired') {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-canvas text-text-low border border-border text-[11px] font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-text-low" />
                        Expired
                      </span>
                    );
                  } else if (item.status === 'suspended') {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 text-[11px] font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                        Suspended
                      </span>
                    );
                  }

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-canvas/60 transition-colors ${isChecked ? 'bg-primary/5' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectItem(item.id)}
                          aria-label={`Select ${item.name}`}
                          className="w-4 h-4 rounded border-border text-primary cursor-pointer accent-[#2563eb]"
                        />
                      </td>

                      {/* Business Name & Store Code */}
                      <td className="py-3 px-4">
                        <Link
                          to={`/admin/businesses/${item.id}`}
                          className="flex flex-col group hover:opacity-80 transition-opacity"
                        >
                          <span className="font-semibold text-text-high group-hover:text-primary transition-colors">
                            {item.name}
                          </span>
                          <span className="text-[11px] text-text-medium font-mono group-hover:underline">
                            {item.code}
                          </span>
                        </Link>
                      </td>

                      {/* Owner Name & Phone */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-text-high">{item.owner_name}</span>
                          <span className="text-[11px] text-text-medium">{item.phone}</span>
                        </div>
                      </td>

                      {/* City & State */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="text-text-high">{item.city}, {item.state}</span>
                      </td>

                      {/* Category Type */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="text-text-medium">{item.category}</span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {statusBadge}
                      </td>

                      {/* Plan */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-medium text-text-high">{item.plan_name}</span>
                      </td>

                      {/* Trial End Date */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="text-text-medium">{item.trial_end_date || '–'}</span>
                      </td>

                      {/* Last Active */}
                      <td className="py-3 px-4 whitespace-nowrap text-text-medium">
                        {item.last_active || 'Just now'}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right pr-6 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/admin/businesses/${item.id}`}
                            className="inline-flex items-center justify-center min-h-[48px] px-3 rounded-[6px] border border-border bg-canvas hover:bg-surface text-text-high text-xs font-semibold transition-colors"
                          >
                            Manage
                          </Link>
                          <Button
                            variant="secondary"
                            onClick={() => {
                              api.adminBulkAction('extend_trial', [item.id], 7)
                                .then(() => {
                                  toast.success(`Extended trial for ${item.name}`);
                                  fetchBusinesses();
                                });
                            }}
                            className="min-h-[48px] px-3 text-xs"
                          >
                            +7d trial
                          </Button>

                          {item.status !== 'active' ? (
                            <Button
                              variant="primary"
                              onClick={() => {
                                api.adminBulkAction('activate', [item.id])
                                  .then(() => {
                                    toast.success(`Activated ${item.name}`);
                                    fetchBusinesses();
                                  });
                              }}
                              className="min-h-[48px] px-3 text-xs"
                            >
                              Activate
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              onClick={() => {
                                api.adminBulkAction('suspend', [item.id])
                                  .then(() => {
                                    toast.info(`Suspended ${item.name}`);
                                    fetchBusinesses();
                                  });
                              }}
                              className="min-h-[48px] px-3 text-xs text-destructive hover:bg-destructive/10"
                            >
                              Suspend
                            </Button>
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
          <div className="px-5 py-3 border-t border-border flex items-center justify-between text-xs text-text-medium">
            <span>
              Page {data.page} of {data.total_pages}
            </span>

            <div className="flex items-center gap-1.5">
              <Button
                variant="secondary"
                disabled={data.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="min-h-[48px] px-3 text-xs gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </Button>
              <Button
                variant="secondary"
                disabled={data.page >= data.total_pages}
                onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                className="min-h-[48px] px-3 text-xs gap-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
