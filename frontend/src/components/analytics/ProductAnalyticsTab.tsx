import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  BarChart3,
  List,
  RefreshCw,
  Package,
  AlertCircle,
} from 'lucide-react';
import {
  api,
  type ProductAnalyticsResponse,
} from '../../api/client';
import { formatINR } from '../../utils';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Sparkline } from './Sparkline';

type SortField = 'profit' | 'margin_pct' | 'sales' | 'units_sold' | 'name' | 'stock_qty';
type SortOrder = 'asc' | 'desc';

export function ProductAnalyticsTab() {
  const [period, setPeriod] = useState<string>('30d');
  const [category, setCategory] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<ProductAnalyticsResponse>({
    period: '30d',
    category: 'all',
    has_data: false,
    total_products: 0,
    total_sales: 0,
    total_units: 0,
    categories_list: [],
    demand_top: [],
    best_selling: [],
    slow_selling: [],
    profit_table: [],
  });

  // Profit table view & sorting state
  const [viewMode, setViewMode] = useState<'table' | 'barchart'>('table');
  const [sortField, setSortField] = useState<SortField>('profit');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAnalyticsProducts({
        period,
        category: category === 'all' ? undefined : category,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch product analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period, category]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Filtered and sorted profit items
  const sortedProfitItems = useMemo(() => {
    let items = [...data.profit_table];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.category && p.category.toLowerCase().includes(q))
      );
    }

    items.sort((a, b) => {
      let aVal = (a as any)[sortField];
      let bVal = (b as any)[sortField];
      if (typeof aVal === 'string') {
        return sortOrder === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return items;
  }, [data.profit_table, sortField, sortOrder, searchQuery]);

  // ABC statistics breakdown
  const abcStats = useMemo(() => {
    const list = data.profit_table;
    const countA = list.filter((p) => p.abc_class === 'A').length;
    const countB = list.filter((p) => p.abc_class === 'B').length;
    const countC = list.filter((p) => p.abc_class === 'C').length;

    const salesA = list
      .filter((p) => p.abc_class === 'A')
      .reduce((sum, p) => sum + p.sales, 0);
    const salesB = list
      .filter((p) => p.abc_class === 'B')
      .reduce((sum, p) => sum + p.sales, 0);
    const salesC = list
      .filter((p) => p.abc_class === 'C')
      .reduce((sum, p) => sum + p.sales, 0);

    const total = data.total_sales || 1;

    return {
      countA,
      countB,
      countC,
      salesA,
      salesB,
      salesC,
      shareA: ((salesA / total) * 100).toFixed(1),
      shareB: ((salesB / total) * 100).toFixed(1),
      shareC: ((salesC / total) * 100).toFixed(1),
    };
  }, [data.profit_table, data.total_sales]);

  const renderAbcBadge = (abc: 'A' | 'B' | 'C') => {
    if (abc === 'A') {
      return (
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-bold bg-[#DBEAFE] text-[#1D4ED8] border border-[#93C5FD]"
          title="Class A: Top 80% revenue driver"
        >
          Class A
        </span>
      );
    }
    if (abc === 'B') {
      return (
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-bold bg-[#FEF3C7] text-[#B45309] border border-[#FCD34D]"
          title="Class B: Next 15% revenue driver"
        >
          Class B
        </span>
      );
    }
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-bold bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB]"
        title="Class C: Last 5% revenue driver"
      >
        Class C
      </span>
    );
  };

  const maxProfitVal = useMemo(() => {
    const peak = Math.max(...data.profit_table.map((p) => p.profit), 1);
    return peak;
  }, [data.profit_table]);

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div className="p-3 rounded-[6px] bg-red-50 border border-red-200 text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {/* Category and Period Filters Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Period Filter Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-text-medium mr-1">Period:</span>
            <div
              className="inline-flex items-center p-1 rounded-[8px] bg-canvas border border-border overflow-x-auto"
              role="group"
              aria-label="Period"
            >
              {[
                { id: 'today', label: 'Today' },
                { id: '7d', label: '7 days' },
                { id: '30d', label: '30 days' },
                { id: '90d', label: '90 days' },
                { id: 'all', label: 'All time' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriod(p.id)}
                  className={`px-3 py-2 rounded-[6px] text-xs font-semibold transition-colors min-h-[48px] whitespace-nowrap flex items-center justify-center ${
                    period === p.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-text-medium hover:text-text-high hover:bg-surface'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category Dropdown & Quick Refresh */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-text-medium">Category:</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-3 py-1.5 bg-surface border border-border rounded-[6px] text-xs font-medium text-text-high focus:outline-none focus:border-primary min-h-[48px]"
              >
                <option value="all">All categories</option>
                {data.categories_list.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <Button
              variant="secondary"
              onClick={fetchData}
              disabled={loading}
              className="text-xs min-h-[48px] px-3.5"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-[8px] bg-surface border border-border flex items-center justify-between">
          <div>
            <span className="text-[11px] text-text-medium block font-medium">Catalog items</span>
            <span className="text-xl font-bold text-text-high tabular-nums block mt-0.5">
              {data.total_products} products
            </span>
          </div>
          <div className="w-9 h-9 rounded-[6px] bg-canvas border border-border flex items-center justify-center text-text-medium">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3.5 rounded-[8px] bg-surface border border-border flex items-center justify-between">
          <div>
            <span className="text-[11px] text-text-medium block font-medium">Units sold in period</span>
            <span className="text-xl font-bold text-primary tabular-nums block mt-0.5">
              {data.total_units} units
            </span>
          </div>
          <div className="w-9 h-9 rounded-[6px] bg-primary/10 flex items-center justify-center text-primary">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3.5 rounded-[8px] bg-surface border border-border flex items-center justify-between">
          <div>
            <span className="text-[11px] text-text-medium block font-medium">Product revenue</span>
            <span className="text-xl font-bold text-secondary tabular-nums block mt-0.5">
              {formatINR(data.total_sales)}
            </span>
          </div>
          <div className="w-9 h-9 rounded-[6px] bg-secondary/10 flex items-center justify-center text-secondary">
            <BarChart3 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 1. Demand: Top products by units sold with trend line */}
      <Card>
        <CardHeader
          title="Demand: Top products by units sold"
          subtitle="Highest sales volume items with recent 7-day velocity trajectory"
        />
        <CardContent className="p-0">
          {data.demand_top.length === 0 ? (
            <div className="p-8 text-center bg-surface">
              <Package className="w-8 h-8 text-text-low mx-auto mb-2" />
              <p className="text-sm font-semibold text-text-high">No demand data in this period</p>
              <p className="text-xs text-text-medium mt-1">
                Products will rank here by unit velocity once sales are recorded.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-canvas text-text-medium font-semibold">
                    <th className="py-3 px-4 w-12 text-center">Rank</th>
                    <th className="py-3 px-4">Product name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Units sold</th>
                    <th className="py-3 px-4 text-center">7-day trend</th>
                    <th className="py-3 px-4 text-right">Revenue</th>
                    <th className="py-3 px-4 text-right">Profit</th>
                    <th className="py-3 px-4 text-right">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.demand_top.map((item, idx) => (
                    <tr key={item.product_id} className="hover:bg-canvas/50 transition-colors">
                      <td className="py-3 px-4 text-center font-bold text-text-medium">
                        #{idx + 1}
                      </td>
                      <td className="py-3 px-4 font-semibold text-text-high">
                        {item.name}
                      </td>
                      <td className="py-3 px-4 text-text-medium">
                        <span className="px-2 py-0.5 rounded-[4px] bg-canvas border border-border text-[11px]">
                          {item.category || 'General'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-text-high tabular-nums">
                        {item.units_sold} units
                      </td>
                      <td className="py-3 px-4 flex items-center justify-center">
                        <Sparkline data={item.trend} width={80} height={22} color="#2563EB" />
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-text-high tabular-nums">
                        {formatINR(item.sales)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-secondary tabular-nums">
                        {formatINR(item.profit)}
                      </td>
                      <td className="py-3 px-4 text-right text-text-medium tabular-nums">
                        {item.stock_qty}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Best selling vs Slow selling (Ranked lists top 10 & bottom 10) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 Best Selling */}
        <Card>
          <CardHeader
            title="Best selling (Top 10)"
            subtitle="Products generating highest revenue velocity"
          />
          <CardContent className="p-0">
            {data.best_selling.length === 0 ? (
              <div className="p-8 text-center bg-surface">
                <p className="text-sm font-semibold text-text-high">No best selling products</p>
                <p className="text-xs text-text-medium mt-1">
                  Sales records will populate this leaderboard.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data.best_selling.map((item, idx) => (
                  <div
                    key={item.product_id}
                    className="p-3.5 flex items-center justify-between hover:bg-canvas/50 transition-colors gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 text-center text-xs font-bold text-text-medium shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-text-high truncate">
                            {item.name}
                          </span>
                          {renderAbcBadge(item.abc_class)}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-text-medium mt-0.5">
                          <span>{item.category || 'General'}</span>
                          <span>•</span>
                          <span>Stock: {item.stock_qty}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-text-high block tabular-nums">
                        {formatINR(item.sales)}
                      </span>
                      <span className="text-[11px] text-text-medium tabular-nums">
                        {item.units_sold} sold
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bottom 10 Slow Selling with "No sales in 30 days" Chip */}
        <Card>
          <CardHeader
            title="Slow selling (Bottom 10)"
            subtitle="Sluggish or stagnant items with potential capital tie-up"
          />
          <CardContent className="p-0">
            {data.slow_selling.length === 0 ? (
              <div className="p-8 text-center bg-surface">
                <p className="text-sm font-semibold text-text-high">No slow selling products</p>
                <p className="text-xs text-text-medium mt-1">
                  All active items are moving adequately.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data.slow_selling.map((item, idx) => (
                  <div
                    key={item.product_id}
                    className="p-3.5 flex items-center justify-between hover:bg-canvas/50 transition-colors gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 text-center text-xs font-bold text-text-medium shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-text-high truncate">
                            {item.name}
                          </span>
                          {renderAbcBadge(item.abc_class)}
                          {item.no_sales_30d && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] text-[10px] font-semibold">
                              <AlertTriangle className="w-3 h-3" />
                              No sales in 30 days
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-text-medium mt-0.5">
                          <span>{item.category || 'General'}</span>
                          <span>•</span>
                          <span className={item.stock_qty > 0 && item.no_sales_30d ? 'font-semibold text-[#D97706]' : ''}>
                            Stock: {item.stock_qty}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-text-high block tabular-nums">
                        {formatINR(item.sales)}
                      </span>
                      <span className="text-[11px] text-text-medium tabular-nums">
                        {item.units_sold} sold
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 3. Product Profit: Table and Bar Chart, Sortable */}
      <Card>
        <CardHeader
          title="Product profit & margin"
          subtitle="Gross profit contribution, margin percentage, and profitability rank"
          action={
            <div className="flex items-center gap-3">
              {/* Search filter */}
              <input
                type="text"
                placeholder="Filter products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-2.5 py-1 text-xs bg-surface border border-border rounded-[4px] text-text-high focus:outline-none focus:border-primary w-36 sm:w-48"
              />

              {/* View Switch: Table vs Bar Chart */}
              <div className="inline-flex items-center p-1 rounded-[6px] bg-canvas border border-border">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-[4px] text-xs font-medium transition-colors ${
                    viewMode === 'table'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-text-medium hover:text-text-high'
                  }`}
                  title="Table view"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('barchart')}
                  className={`p-1.5 rounded-[4px] text-xs font-medium transition-colors ${
                    viewMode === 'barchart'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-text-medium hover:text-text-high'
                  }`}
                  title="Bar chart view"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          }
        />
        <CardContent className="p-0">
          {sortedProfitItems.length === 0 ? (
            <div className="p-8 text-center bg-surface">
              <p className="text-sm font-semibold text-text-high">No product profit data</p>
              <p className="text-xs text-text-medium mt-1">
                No products match the selected criteria or timeframe.
              </p>
            </div>
          ) : viewMode === 'table' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-canvas text-text-medium font-semibold select-none">
                    <th
                      className="py-3 px-4 cursor-pointer hover:text-text-high"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Product name</span>
                        {sortField === 'name' && (
                          <span>{sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}</span>
                        )}
                      </div>
                    </th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-center">ABC Class</th>
                    <th
                      className="py-3 px-4 text-right cursor-pointer hover:text-text-high"
                      onClick={() => handleSort('units_sold')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Units</span>
                        {sortField === 'units_sold' && (
                          <span>{sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}</span>
                        )}
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 text-right cursor-pointer hover:text-text-high"
                      onClick={() => handleSort('sales')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Sales</span>
                        {sortField === 'sales' && (
                          <span>{sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}</span>
                        )}
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 text-right cursor-pointer hover:text-text-high"
                      onClick={() => handleSort('profit')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Profit</span>
                        {sortField === 'profit' && (
                          <span>{sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}</span>
                        )}
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 text-right cursor-pointer hover:text-text-high"
                      onClick={() => handleSort('margin_pct')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Margin %</span>
                        {sortField === 'margin_pct' && (
                          <span>{sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}</span>
                        )}
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 text-right cursor-pointer hover:text-text-high"
                      onClick={() => handleSort('stock_qty')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Stock</span>
                        {sortField === 'stock_qty' && (
                          <span>{sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}</span>
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedProfitItems.map((p) => (
                    <tr key={p.product_id} className="hover:bg-canvas/50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-text-high">
                        {p.name}
                        {p.no_sales_30d && (
                          <span className="block text-[10px] text-[#D97706] font-medium">
                            No sales in 30 days
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-text-medium">{p.category || 'General'}</td>
                      <td className="py-3 px-4 text-center">{renderAbcBadge(p.abc_class)}</td>
                      <td className="py-3 px-4 text-right tabular-nums text-text-medium">
                        {p.units_sold}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums font-semibold text-text-high">
                        {formatINR(p.sales)}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums font-bold text-secondary">
                        {formatINR(p.profit)}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums font-bold text-text-high">
                        {p.margin_pct.toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-text-medium">
                        {p.stock_qty}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Bar Chart View of Profit & Margin */
            <div className="p-4 sm:p-6 flex flex-col gap-4">
              <div className="text-xs text-text-medium flex items-center justify-between pb-2 border-b border-border">
                <span>Displaying profit contribution and gross margin per product</span>
                <span className="tabular-nums font-semibold text-text-high">
                  {sortedProfitItems.length} products
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {sortedProfitItems.slice(0, 15).map((p) => {
                  const profitRatio = Math.max(p.profit / maxProfitVal, 0);
                  const profitWidthPct = Math.min(Math.max(profitRatio * 100, 2), 100);

                  return (
                    <div
                      key={p.product_id}
                      className="p-3 rounded-[6px] bg-canvas border border-border flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-bold text-text-high truncate">{p.name}</span>
                          {renderAbcBadge(p.abc_class)}
                        </div>
                        <div className="flex items-center gap-3 shrink-0 tabular-nums">
                          <span className="font-bold text-secondary">
                            Profit: {formatINR(p.profit)}
                          </span>
                          <span className="font-semibold text-text-high px-1.5 py-0.5 rounded-[4px] bg-surface border border-border">
                            Margin: {p.margin_pct.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* Bar Visualization */}
                      <div className="w-full h-3 rounded-[4px] bg-surface overflow-hidden flex items-center">
                        <div
                          className="h-full bg-secondary rounded-[4px] transition-all"
                          style={{ width: `${profitWidthPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. ABC Classification Tags and Breakdown */}
      <Card>
        <CardHeader
          title="ABC classification tags"
          subtitle="Prioritize inventory focus by Pareto revenue contribution (80 / 15 / 5 Rule)"
        />
        <CardContent className="p-4 sm:p-6 flex flex-col gap-4">
          {data.total_products === 0 ? (
            <div className="p-6 text-center bg-surface rounded-[6px]">
              <p className="text-sm font-semibold text-text-high">No products to classify</p>
              <p className="text-xs text-text-medium mt-1">
                Add products and transactions to compute ABC inventory tiers.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Class A Card */}
              <div className="p-4 rounded-[8px] bg-surface border-2 border-[#93C5FD] flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-[4px] text-xs font-bold bg-[#DBEAFE] text-[#1D4ED8]">
                      Class A
                    </span>
                    <span className="text-xs font-bold text-primary">Top 80% Revenue</span>
                  </div>
                  <div className="mt-3">
                    <span className="text-2xl font-bold text-text-high block tabular-nums">
                      {abcStats.countA} <span className="text-xs text-text-medium font-normal">items</span>
                    </span>
                    <span className="text-xs font-semibold text-text-high block mt-1 tabular-nums">
                      {formatINR(abcStats.salesA)} ({abcStats.shareA}% of revenue)
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-text-medium border-t border-border pt-2 leading-relaxed">
                  Your core revenue drivers. Review daily, monitor reorder points strictly, and avoid stockouts at all costs.
                </p>
              </div>

              {/* Class B Card */}
              <div className="p-4 rounded-[8px] bg-surface border-2 border-[#FCD34D] flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-[4px] text-xs font-bold bg-[#FEF3C7] text-[#B45309]">
                      Class B
                    </span>
                    <span className="text-xs font-bold text-[#B45309]">Next 15% Revenue</span>
                  </div>
                  <div className="mt-3">
                    <span className="text-2xl font-bold text-text-high block tabular-nums">
                      {abcStats.countB} <span className="text-xs text-text-medium font-normal">items</span>
                    </span>
                    <span className="text-xs font-semibold text-text-high block mt-1 tabular-nums">
                      {formatINR(abcStats.salesB)} ({abcStats.shareB}% of revenue)
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-text-medium border-t border-border pt-2 leading-relaxed">
                  Steady mid-tier movers. Review weekly, set automated reorder triggers, and balance working capital.
                </p>
              </div>

              {/* Class C Card */}
              <div className="p-4 rounded-[8px] bg-surface border-2 border-border flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-[4px] text-xs font-bold bg-[#F3F4F6] text-[#4B5563]">
                      Class C
                    </span>
                    <span className="text-xs font-bold text-text-medium">Last 5% Revenue</span>
                  </div>
                  <div className="mt-3">
                    <span className="text-2xl font-bold text-text-high block tabular-nums">
                      {abcStats.countC} <span className="text-xs text-text-medium font-normal">items</span>
                    </span>
                    <span className="text-xs font-semibold text-text-high block mt-1 tabular-nums">
                      {formatINR(abcStats.salesC)} ({abcStats.shareC}% of revenue)
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-text-medium border-t border-border pt-2 leading-relaxed">
                  Tail items generating minimal income. Keep minimum buffer stock; review regularly for obsolescence or dead stock clearance.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
