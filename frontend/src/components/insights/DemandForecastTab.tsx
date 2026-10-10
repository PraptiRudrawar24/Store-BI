import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  Clock,
  Package,
  ChevronRight,
  TrendingDown,
  Info,
  Upload,
} from 'lucide-react';
import { api, type DemandForecastResponse, type AIDemandForecastItem } from '../../api/client';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useToast } from '../ui/Toast';
import { ProductDemandDrawer } from './ProductDemandDrawer';

export function DemandForecastTab() {
  const toast = useToast();
  const navigate = useNavigate();
  const [leadTimeDays, setLeadTimeDays] = useState<number>(3);
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DemandForecastResponse | null>(null);

  // Drawer state
  const [drawerProductId, setDrawerProductId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);

  // Copy state
  const [copiedList, setCopiedList] = useState<boolean>(false);

  const fetchForecast = async (leadTime: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAIDemandForecast({
        lead_time_days: leadTime,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to calculate demand forecast');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast(leadTimeDays);
  }, [leadTimeDays]);

  // Extract categories from data
  const categories = useMemo(() => {
    if (!data?.items) return [];
    const set = new Set<string>();
    data.items.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set).sort();
  }, [data?.items]);

  // Client-side filtering for immediate snappy responsiveness
  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    return data.items.filter((item) => {
      const matchesSearch =
        !search.trim() ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.category.toLowerCase().includes(search.toLowerCase());
      const matchesCat =
        selectedCategory === 'all' || item.category.toLowerCase() === selectedCategory.toLowerCase();
      return matchesSearch && matchesCat;
    });
  }, [data?.items, search, selectedCategory]);

  const handleCopyWhatsAppList = () => {
    if (!data?.whatsapp_purchase_list) {
      toast.info('No purchase list available.');
      return;
    }
    navigator.clipboard.writeText(data.whatsapp_purchase_list);
    setCopiedList(true);
    toast.success('WhatsApp purchase list copied to clipboard!');
    setTimeout(() => setCopiedList(false), 2500);
  };

  const handleRowClick = (item: AIDemandForecastItem) => {
    setDrawerProductId(item.product_id);
    setDrawerOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Drawer */}
      <ProductDemandDrawer
        productId={drawerProductId}
        leadTimeDays={leadTimeDays}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-text-high">14-day product demand & reorder</h2>
            <Badge variant="neutral">Moving average + seasonality</Badge>
          </div>
          <p className="text-xs text-text-medium mt-0.5">
            Predicts unit velocity, factors in supplier lead times, and highlights inventory at risk of stock-out.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Configurable Lead Time Stepper/Selector */}
          <div className="flex items-center gap-2 bg-surface border border-border rounded-[8px] px-3 py-1.5">
            <Clock className="w-4 h-4 text-primary shrink-0" />
            <label htmlFor="leadTimeSelect" className="text-xs font-medium text-text-medium">
              Lead time:
            </label>
            <select
              id="leadTimeSelect"
              value={leadTimeDays}
              onChange={(e) => setLeadTimeDays(Number(e.target.value))}
              className="text-xs font-bold text-text-high bg-transparent border-none focus:outline-hidden cursor-pointer"
            >
              {[1, 2, 3, 4, 5, 7, 10, 14].map((d) => (
                <option key={d} value={d}>
                  {d} {d === 1 ? 'day' : 'days'}
                </option>
              ))}
            </select>
          </div>

          {/* Copy Purchase List for WhatsApp */}
          <Button
            variant="primary"
            onClick={handleCopyWhatsAppList}
            disabled={!data || data.total_suggested_items === 0}
            className="min-h-[48px] px-3.5 text-xs gap-2"
          >
            {copiedList ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
            <span>Copy purchase list</span>
            {data && data.total_suggested_items > 0 && (
              <span className="bg-white/20 px-1.5 py-0.2 rounded-full text-[11px] font-bold">
                {data.total_suggested_items}
              </span>
            )}
          </Button>

          <Button
            variant="secondary"
            onClick={() => fetchForecast(leadTimeDays)}
            disabled={loading}
            className="h-9 px-2.5 text-xs"
            title="Refresh forecast calculation"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-surface flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-medium">Critical stockouts</span>
            <Badge variant="destructive" dot>
              Urgent
            </Badge>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-destructive tabular-nums">
              {data?.critical_count ?? 0}
            </span>
            <span className="text-xs text-text-low">products ≤ {leadTimeDays}d stock</span>
          </div>
        </Card>

        <Card className="p-4 bg-surface flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-medium">Reorder warnings</span>
            <Badge variant="warning" dot>
              Soon
            </Badge>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-warning tabular-nums">
              {data?.warning_count ?? 0}
            </span>
            <span className="text-xs text-text-low">low safety stock</span>
          </div>
        </Card>

        <Card className="p-4 bg-surface flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-medium">Total suggested orders</span>
            <Package className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary tabular-nums">
              {data?.total_suggested_items ?? 0}
            </span>
            <span className="text-xs text-text-low">items on WhatsApp list</span>
          </div>
        </Card>

        <Card className="p-4 bg-surface flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-medium">Configured lead time</span>
            <Clock className="w-4 h-4 text-text-low" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-text-high tabular-nums">
              {leadTimeDays} days
            </span>
            <span className="text-xs text-text-low">safety buffer active</span>
          </div>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-3 bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 max-w-sm relative flex items-center">
          <Search className="w-4 h-4 text-text-low absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search product or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-xs bg-canvas border border-border rounded-lg text-text-high placeholder:text-text-low focus:outline-hidden focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-text-medium shrink-0">Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-9 px-3 text-xs bg-canvas border border-border rounded-lg text-text-high focus:outline-hidden"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Demand Forecast Table */}
      <Card className="overflow-hidden bg-surface border border-border">
        {loading && !data && (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-7 h-7 text-primary animate-spin" />
            <span className="text-xs text-text-medium">Projecting per-product inventory velocity...</span>
          </div>
        )}

        {error && !loading && (
          <div className="p-6 bg-destructive-bg text-destructive text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!loading && (!filteredItems || filteredItems.length === 0) && (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <Package className="w-10 h-10 text-text-low mb-2" />
            <h3 className="text-sm font-semibold text-text-high">No products found</h3>
            <p className="text-xs text-text-medium mt-1 max-w-sm">
              {search || selectedCategory !== 'all'
                ? 'Try adjusting your search query or category filter.'
                : 'No inventory items have been loaded yet. Upload products to calculate restock runways.'}
            </p>
            {!search && selectedCategory === 'all' && (
              <Button
                variant="primary"
                onClick={() => navigate('/upload')}
                className="mt-4 text-xs gap-2"
              >
                <Upload className="w-4 h-4" />
                <span>Upload inventory</span>
              </Button>
            )}
          </div>
        )}

        {!loading && filteredItems && filteredItems.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-canvas border-b border-border text-text-medium font-semibold select-none">
                <tr>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Current stock</th>
                  <th className="py-3 px-4">14-day forecast</th>
                  <th className="py-3 px-4">Days left</th>
                  <th className="py-3 px-4">Suggested order</th>
                  <th className="py-3 px-4">Reorder by</th>
                  <th className="py-3 px-4">Risk status</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredItems.map((item) => {
                  const isCritical = item.risk_level === 'critical';
                  const isWarning = item.risk_level === 'warning';
                  const isLowData = !item.has_enough_history || item.forecast_demand_14d === null;

                  return (
                    <tr
                      key={item.product_id}
                      onClick={() => handleRowClick(item)}
                      className={`cursor-pointer transition-colors hover:bg-canvas/80 ${
                        isCritical
                          ? 'bg-destructive-bg/30'
                          : isWarning
                          ? 'bg-warning-bg/25'
                          : ''
                      }`}
                    >
                      {/* Product Name & Category */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-text-high">{item.name}</div>
                        <div className="text-[11px] text-text-medium">{item.category}</div>
                      </td>

                      {/* Current Stock */}
                      <td className="py-3 px-4">
                        <span
                          className={`font-semibold tabular-nums ${
                            item.stock_qty <= 0 ? 'text-destructive' : 'text-text-high'
                          }`}
                        >
                          {item.stock_qty}
                        </span>
                        <span className="text-[11px] text-text-low ml-1">units</span>
                      </td>

                      {/* 14-Day Demand Forecast */}
                      <td className="py-3 px-4">
                        {isLowData ? (
                          <span className="text-text-low italic text-[11px]">
                            Not enough data yet
                          </span>
                        ) : (
                          <div className="flex flex-col">
                            <span className="font-semibold text-text-high tabular-nums">
                              {item.forecast_demand_14d} units
                            </span>
                            <span className="text-[10px] text-text-low">
                              ~{item.daily_sales_rate}/day
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Days of Stock Left */}
                      <td className="py-3 px-4">
                        {typeof item.days_of_stock_left === 'number' ? (
                          <span
                            className={`font-semibold tabular-nums ${
                              item.days_of_stock_left <= leadTimeDays
                                ? 'text-destructive'
                                : item.days_of_stock_left <= leadTimeDays + 3
                                ? 'text-warning'
                                : 'text-text-high'
                            }`}
                          >
                            {item.days_of_stock_left} days
                          </span>
                        ) : (
                          <span className="text-text-low">–</span>
                        )}
                      </td>

                      {/* Suggested Reorder Qty */}
                      <td className="py-3 px-4">
                        {item.suggested_reorder_qty > 0 ? (
                          <span className="font-bold text-primary tabular-nums">
                            {item.suggested_reorder_qty} units
                          </span>
                        ) : (
                          <span className="text-text-low tabular-nums">0 units</span>
                        )}
                      </td>

                      {/* Reorder By Date */}
                      <td className="py-3 px-4">
                        {item.reorder_by_date ? (
                          <div className="flex items-center gap-1.5">
                            {isCritical && (
                              <TrendingDown className="w-3.5 h-3.5 text-destructive shrink-0" />
                            )}
                            <span
                              className={`font-medium tabular-nums ${
                                isCritical ? 'text-destructive font-semibold' : 'text-text-high'
                              }`}
                            >
                              {item.reorder_by_date}
                            </span>
                          </div>
                        ) : (
                          <span className="text-text-low">Stock adequate</span>
                        )}
                      </td>

                      {/* Risk Status Chip */}
                      <td className="py-3 px-4">
                        {isCritical ? (
                          <Badge variant="destructive" dot>
                            Critical
                          </Badge>
                        ) : isWarning ? (
                          <Badge variant="warning" dot>
                            Reorder Soon
                          </Badge>
                        ) : isLowData ? (
                          <Badge variant="neutral">Low data</Badge>
                        ) : (
                          <Badge variant="success">Adequate</Badge>
                        )}
                      </td>

                      {/* Action Chevron */}
                      <td className="py-3 px-4 text-right">
                        <span className="text-primary hover:text-primary-dark inline-flex items-center gap-1 text-[11px] font-semibold">
                          <span>Trend</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Informational table footer note */}
        <div className="p-3 bg-canvas border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-text-medium">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>
              Click any product row to view the 30-day velocity curve, lead-time math, and seasonality chart.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-destructive" /> Critical: stock ≤ lead time
            <span className="inline-block w-2 h-2 rounded-full bg-warning ml-2" /> Warning: low safety stock
          </div>
        </div>
      </Card>
    </div>
  );
}
