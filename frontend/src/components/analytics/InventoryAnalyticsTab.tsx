import { useState, useEffect } from 'react';
import {
  Boxes,
  Package,
  AlertTriangle,
  RotateCw,
  Calendar,
  Tag,
  Search,
  RefreshCw,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Percent,
} from 'lucide-react';
import { api, type InventoryAnalyticsResponse } from '../../api/client';
import { formatINR } from '../../utils';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';

export function InventoryAnalyticsTab() {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InventoryAnalyticsResponse>({
    has_data: false,
    summary: {
      stock_value_at_cost: 0,
      number_of_products: 0,
      low_stock_count: 0,
      inventory_turnover: 0,
    },
    out_of_stock_list: [],
    expiry_groups: [],
  });

  const [oosSearch, setOosSearch] = useState<string>('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    expired: true,
    within_7d: true,
    within_30d: true,
    within_90d: false,
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAnalyticsInventory();
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch inventory analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Filtered out of stock items
  const filteredOos = data.out_of_stock_list.filter((item) => {
    if (!oosSearch.trim()) return true;
    const q = oosSearch.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      (item.category && item.category.toLowerCase().includes(q))
    );
  });

  const isZeroState = !data.has_data || data.summary.number_of_products === 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header & Refresh Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 rounded-[8px] border border-border">
        <div>
          <h2 className="text-base font-bold text-text-high">Inventory analytics</h2>
          <p className="text-xs text-text-medium mt-0.5">
            Holding valuation, stockout loss estimates, and expiry liquidation pipeline
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={fetchData}
            disabled={loading}
            className="text-xs min-h-[48px] px-3 gap-1.5"
            title="Refresh inventory analytics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-destructive-bg border border-destructive-border rounded-[8px] text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 3. Summary Cards: stock value at cost, number of products, low-stock count, inventory turnover */}
      {/* Zero state: summary cards show ₹0 and 0 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stock Value at Cost */}
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4 flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold text-text-medium block">
                Stock value (at cost)
              </span>
              <div className="text-xl sm:text-2xl font-bold text-text-high mt-1 tabular-nums">
                {isZeroState ? '₹0' : formatINR(data.summary.stock_value_at_cost)}
              </div>
              <p className="text-[11px] text-text-low mt-0.5">Total wholesale holding value</p>
            </div>
            <div className="w-9 h-9 rounded-[6px] bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Boxes className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Number of Products */}
        <Card className="border-l-4 border-l-[#3B82F6]">
          <CardContent className="p-4 flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold text-text-medium block">
                Total products
              </span>
              <div className="text-xl sm:text-2xl font-bold text-text-high mt-1 tabular-nums">
                {isZeroState ? 0 : data.summary.number_of_products}
              </div>
              <p className="text-[11px] text-text-low mt-0.5">Active catalog SKU items</p>
            </div>
            <div className="w-9 h-9 rounded-[6px] bg-[#3B82F6]/10 flex items-center justify-center text-[#3B82F6] shrink-0">
              <Package className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Low-Stock Count */}
        <Card className="border-l-4 border-l-warning">
          <CardContent className="p-4 flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold text-text-medium block">
                Low-stock items
              </span>
              <div className="text-xl sm:text-2xl font-bold text-text-high mt-1 tabular-nums">
                {isZeroState ? 0 : data.summary.low_stock_count}
              </div>
              <p className="text-[11px] text-text-low mt-0.5">At or below reorder threshold</p>
            </div>
            <div className="w-9 h-9 rounded-[6px] bg-warning-bg flex items-center justify-center text-warning shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Inventory Turnover */}
        <Card className="border-l-4 border-l-[#10B981]">
          <CardContent className="p-4 flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold text-text-medium block">
                Inventory turnover
              </span>
              <div className="text-xl sm:text-2xl font-bold text-text-high mt-1 tabular-nums">
                {isZeroState ? '0x' : `${data.summary.inventory_turnover.toFixed(2)}x`}
              </div>
              <p className="text-[11px] text-text-low mt-0.5">COGS divided by current stock</p>
            </div>
            <div className="w-9 h-9 rounded-[6px] bg-[#10B981]/10 flex items-center justify-center text-[#10B981] shrink-0">
              <RotateCw className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 1. Out of Stock List with last sold date and estimated lost sales */}
      <Card>
        <CardHeader
          title="Out of stock list"
          subtitle="Depleted inventory items with historical sales rate and estimated lost revenue"
          action={
            !isZeroState && data.out_of_stock_list.length > 0 ? (
              <div className="relative w-48 sm:w-60">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-low" />
                <input
                  type="text"
                  placeholder="Filter out of stock..."
                  value={oosSearch}
                  onChange={(e) => setOosSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 bg-surface border border-border rounded-[4px] text-xs text-text-high placeholder:text-text-low focus:outline-none focus:border-primary"
                />
              </div>
            ) : null
          }
        />
        <CardContent className="p-0">
          {isZeroState ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center text-text-low mb-3">
                <Boxes className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-text-high">No products added yet</h4>
              <p className="text-xs text-text-medium mt-1 max-w-sm">
                Add products to your catalog to track out of stock items, stockouts, and lost revenue potential.
              </p>
            </div>
          ) : data.out_of_stock_list.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center bg-success-bg/40">
              <div className="w-10 h-10 rounded-full bg-success-bg border border-success-border flex items-center justify-center text-success mb-2">
                <Package className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold text-text-high">All products currently in stock</h4>
              <p className="text-xs text-text-medium mt-0.5">
                No items have reached 0 inventory. Your store is fully stocked!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-canvas border-b border-border text-text-medium font-semibold">
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Selling price</th>
                    <th className="py-3 px-4">Last sold date</th>
                    <th className="py-3 px-4 text-right">Estimated lost sales</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredOos.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-text-medium">
                        No out of stock products matched "{oosSearch}"
                      </td>
                    </tr>
                  ) : (
                    filteredOos.map((item) => (
                      <tr key={item.product_id} className="hover:bg-canvas/60 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-semibold text-text-high block">{item.name}</span>
                          <span className="text-[11px] text-text-low">Reorder level: {item.reorder_level}</span>
                        </td>
                        <td className="py-3 px-4 text-text-medium">{item.category || 'General'}</td>
                        <td className="py-3 px-4 text-text-high font-medium tabular-nums">
                          {formatINR(item.selling_price)}
                        </td>
                        <td className="py-3 px-4">
                          {item.last_sold_date ? (
                            <div className="flex items-center gap-1.5 text-text-medium">
                              <Clock className="w-3.5 h-3.5 text-text-low" />
                              <span>{item.last_sold_date}</span>
                            </div>
                          ) : (
                            <span className="text-text-low italic">No sales recorded</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-bold text-destructive tabular-nums block">
                            {formatINR(item.estimated_lost_sales)}
                          </span>
                          <span className="text-[10px] text-text-low">
                            {item.estimated_lost_sales > 0 ? 'Based on 30d velocity' : 'Zero sales velocity'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-semibold bg-destructive-bg text-destructive border border-destructive-border">
                            0 in stock
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Expiry groups: Expired, within 7 days, 30 days, 90 days */}
      {/* with quantity and ₹ value at risk (cost x qty), and a "discount to clear" suggestion for the 30-day group */}
      <Card>
        <CardHeader
          title="Expiry risk groups"
          subtitle="Monitors perishable stock with quantity, rupee value at risk (cost × qty), and clearance suggestions"
        />
        <CardContent className="p-4 sm:p-6 flex flex-col gap-6">
          {isZeroState ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center text-text-low mb-3">
                <Calendar className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-text-high">No products added yet</h4>
              <p className="text-xs text-text-medium mt-1 max-w-sm">
                Add products with expiry dates to track at-risk inventory groups and clearance promotions.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Expiry Group Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {data.expiry_groups.map((group) => {
                  const is30d = group.group_key === 'within_30d';
                  const isExpired = group.group_key === 'expired';
                  const is7d = group.group_key === 'within_7d';

                  const badgeColor = isExpired
                    ? 'border-l-destructive bg-destructive-bg/30 text-destructive'
                    : is7d
                    ? 'border-l-warning bg-warning-bg/30 text-warning'
                    : is30d
                    ? 'border-l-[#F59E0B] bg-[#FFFBEB] text-[#D97706]'
                    : 'border-l-[#3B82F6] bg-[#EFF6FF] text-[#2563EB]';

                  return (
                    <div
                      key={group.group_key}
                      className={`p-4 rounded-[8px] border border-border border-l-4 transition-all ${badgeColor}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{group.title}</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface border border-border text-text-high">
                          {group.product_count} {group.product_count === 1 ? 'item' : 'items'}
                        </span>
                      </div>

                      <div className="mt-3">
                        <span className="text-[11px] text-text-medium block">Value at risk (cost × qty)</span>
                        <div className="text-xl font-bold text-text-high tabular-nums mt-0.5">
                          {formatINR(group.value_at_risk)}
                        </div>
                        <div className="text-xs text-text-medium mt-1 font-medium">
                          {group.total_qty} units in stock
                        </div>
                      </div>

                      {/* Suggestion pill */}
                      {group.suggestion && (
                        <div className="mt-3 pt-2.5 border-t border-border/80 flex items-start gap-1.5">
                          <Tag className="w-3.5 h-3.5 shrink-0 mt-0.5 text-text-medium" />
                          <p className="text-[11px] text-text-high font-medium leading-tight">
                            {group.suggestion}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Detailed Lists by Expiry Group with Accordion or Table */}
              <div className="mt-2 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-text-high">Expiry group product breakdown</h3>
                  <span className="text-xs text-text-medium">
                    Showing products grouped by proximity to expiry
                  </span>
                </div>

                {data.expiry_groups.map((group) => {
                  const isExpanded = !!expandedGroups[group.group_key];
                  const is30d = group.group_key === 'within_30d';

                  return (
                    <div
                      key={group.group_key}
                      className="border border-border rounded-[8px] bg-surface overflow-hidden"
                    >
                      {/* Accordion header */}
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.group_key)}
                        className="w-full min-h-[48px] p-3.5 bg-canvas/40 hover:bg-canvas transition-colors flex items-center justify-between text-left"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-bold text-text-high">{group.title}</span>
                          <span className="text-[11px] px-2 py-0.5 rounded-[4px] bg-surface border border-border text-text-medium font-medium">
                            {group.product_count} products ({group.total_qty} units)
                          </span>
                          <span className="text-xs font-bold text-text-high tabular-nums">
                            Risk: {formatINR(group.value_at_risk)}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          {is30d && (
                            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-[#D97706] bg-[#FEF3C7] px-2 py-0.5 rounded-[4px]">
                              <Percent className="w-3 h-3" />
                              <span>Discount to clear suggested</span>
                            </span>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-text-low" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-text-low" />
                          )}
                        </div>
                      </button>

                      {/* Accordion content */}
                      {isExpanded && (
                        <div className="p-0 border-t border-border">
                          {/* Special clearance advice banner for 30-day group */}
                          {is30d && (
                            <div className="p-3 bg-[#FFFBEB] border-b border-[#FDE68A] flex items-center gap-2 text-xs text-[#92400E]">
                              <Tag className="w-4 h-4 text-[#D97706] shrink-0" />
                              <div>
                                <span className="font-bold">Discount to clear recommendation: </span>
                                <span>
                                  Offer 20% to 30% markdown on these items this week to clear stock before reaching critical 7-day expiry and avoid {formatINR(group.value_at_risk)} write-off.
                                </span>
                              </div>
                            </div>
                          )}

                          {group.items.length === 0 ? (
                            <div className="p-4 text-center text-xs text-text-medium italic">
                              No products found in this expiry group.
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="bg-canvas border-b border-border text-text-medium font-semibold">
                                    <th className="py-2.5 px-4">Product</th>
                                    <th className="py-2.5 px-4">Category</th>
                                    <th className="py-2.5 px-4">Stock qty</th>
                                    <th className="py-2.5 px-4">Cost price</th>
                                    <th className="py-2.5 px-4">Expiry date</th>
                                    <th className="py-2.5 px-4">Days left</th>
                                    <th className="py-2.5 px-4 text-right">Value at risk</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                  {group.items.map((item) => (
                                    <tr key={item.product_id} className="hover:bg-canvas/50">
                                      <td className="py-2.5 px-4 font-semibold text-text-high">
                                        {item.name}
                                      </td>
                                      <td className="py-2.5 px-4 text-text-medium">
                                        {item.category || 'General'}
                                      </td>
                                      <td className="py-2.5 px-4 font-medium text-text-high tabular-nums">
                                        {item.stock_qty}
                                      </td>
                                      <td className="py-2.5 px-4 text-text-medium tabular-nums">
                                        {formatINR(item.cost_price)}
                                      </td>
                                      <td className="py-2.5 px-4 text-text-high font-medium">
                                        {item.expiry_date}
                                      </td>
                                      <td className="py-2.5 px-4">
                                        {item.days_until_expiry < 0 ? (
                                          <span className="text-destructive font-bold">
                                            Expired {Math.abs(item.days_until_expiry)}d ago
                                          </span>
                                        ) : item.days_until_expiry === 0 ? (
                                          <span className="text-destructive font-bold">Expires today</span>
                                        ) : (
                                          <span className="text-warning font-semibold">
                                            {item.days_until_expiry} days left
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-4 text-right font-bold text-text-high tabular-nums">
                                        {formatINR(item.value_at_risk)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
