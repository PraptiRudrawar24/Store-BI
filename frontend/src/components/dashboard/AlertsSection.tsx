import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  AlertCircle,
  Flame,
  CheckCircle2,
  PackagePlus,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { ReorderModal } from './ReorderModal';
import { useAlerts } from '../../context/AlertsContext';
import type { AlertItem } from '../../api/client';

export function AlertsSection() {
  const navigate = useNavigate();
  const { alerts, loading, refreshAlerts } = useAlerts();

  const [selectedItemForReorder, setSelectedItemForReorder] = React.useState<AlertItem | null>(null);
  const [isReorderOpen, setIsReorderOpen] = React.useState(false);

  const handleOpenReorder = (item: AlertItem) => {
    setSelectedItemForReorder(item);
    setIsReorderOpen(true);
  };

  const totalProducts = alerts?.total_products ?? 0;
  const totalAlerts = alerts?.total_alerts ?? 0;
  const outOfStockList = alerts?.out_of_stock ?? [];
  const lowStockList = alerts?.low_stock ?? [];

  return (
    <section id="dashboard-alerts-section" className="scroll-mt-20">
      <Card>
        <CardHeader
          title="Stock alerts"
          subtitle="Critical inventory replenishment thresholds and run-out projections"
          action={
            <div className="flex items-center gap-2">
              {totalAlerts > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-destructive-bg text-destructive border border-destructive-border tabular-nums">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                  {totalAlerts} {totalAlerts === 1 ? 'alert' : 'alerts'}
                </span>
              )}
              <button
                type="button"
                onClick={() => refreshAlerts()}
                disabled={loading}
                title="Refresh alerts"
                className="h-8 w-8 rounded-[8px] border border-border bg-surface flex items-center justify-center text-text-medium hover:text-text-high hover:bg-canvas transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          }
        />

        <CardContent className="p-4 sm:p-6 flex flex-col gap-6">
          {/* ZERO STATES */}
          {totalProducts === 0 && !loading && (
            <div className="flex flex-col items-center justify-center text-center py-10 px-4 bg-canvas/50 border border-dashed border-border rounded-[8px] gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <PackagePlus className="w-6 h-6 stroke-[1.75]" />
              </div>
              <div className="flex flex-col gap-1 max-w-sm">
                <h3 className="text-sm font-bold text-text-high">
                  Add products to start getting stock alerts
                </h3>
                <p className="text-xs text-text-medium leading-relaxed">
                  Store BI tracks inventory thresholds and flags items running low or facing high demand velocity.
                </p>
              </div>
              <div className="pt-2 flex items-center gap-2.5">
                <Button
                  variant="primary"
                  onClick={() => navigate('/products')}
                  className="h-10 text-xs font-semibold px-4"
                >
                  Add products
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => navigate('/upload')}
                  className="h-10 text-xs font-semibold px-4"
                >
                  Upload bill
                </Button>
              </div>
            </div>
          )}

          {totalProducts > 0 && totalAlerts === 0 && !loading && (
            <div className="flex items-center gap-3 p-4 rounded-[8px] bg-success-bg border border-success-border text-success">
              <CheckCircle2 className="w-5 h-5 shrink-0" strokeWidth={2} />
              <div className="flex flex-col">
                <span className="text-sm font-bold">
                  No alerts. Everything is in stock
                </span>
                <span className="text-xs opacity-90">
                  All {totalProducts} registered products are currently above their reorder safety levels.
                </span>
              </div>
            </div>
          )}

          {/* POPULATED ALERTS */}
          {totalAlerts > 0 && (
            <div className="flex flex-col gap-6">
              {/* GROUP 1: Out of Stock (stock_qty = 0, Red Chip) */}
              {outOfStockList.length > 0 && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-destructive" />
                      <h4 className="text-sm font-bold text-text-high">Out of stock</h4>
                      <span className="text-xs font-bold text-destructive px-1.5 py-0.5 rounded bg-destructive-bg border border-destructive-border tabular-nums">
                        {outOfStockList.length}
                      </span>
                    </div>
                    <span className="text-xs text-text-medium hidden sm:inline">
                      Customer purchases blocked
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {outOfStockList.map((item) => (
                      <div
                        key={item.product_id}
                        className="p-3.5 rounded-[8px] bg-surface border border-destructive-border/60 hover:border-destructive transition-colors flex flex-col justify-between gap-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold text-text-high truncate">
                              {item.name}
                            </span>
                            <span className="text-xs text-text-medium truncate">
                              Category: {item.category || 'General'} • Safety level: {item.reorder_level} units
                            </span>
                          </div>
                          {/* Red Chip: Out of stock */}
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] shrink-0 tabular-nums">
                            <AlertCircle className="w-3 h-3" strokeWidth={2.5} />
                            Out of stock
                          </span>
                        </div>

                        {/* Velocity & Reorder Row */}
                        <div className="flex items-center justify-between pt-2 border-t border-border/80 gap-2">
                          <div className="flex items-center gap-1.5 text-xs text-text-medium">
                            <span className="font-semibold text-text-high">0 units</span>
                            <span>in inventory</span>
                          </div>

                          <Button
                            variant="secondary"
                            onClick={() => handleOpenReorder(item)}
                            className="min-h-[48px] text-xs font-semibold px-3.5 border-destructive-border text-destructive hover:bg-destructive-bg"
                          >
                            <ShoppingBag className="w-3.5 h-3.5 mr-1.5" />
                            <span>Reorder</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* GROUP 2: Low Stock (stock_qty <= reorder_level, Amber Chip) */}
              {lowStockList.length > 0 && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-warning" />
                      <h4 className="text-sm font-bold text-text-high">Low stock</h4>
                      <span className="text-xs font-bold text-warning px-1.5 py-0.5 rounded bg-warning-bg border border-warning-border tabular-nums">
                        {lowStockList.length}
                      </span>
                    </div>
                    <span className="text-xs text-text-medium hidden sm:inline">
                      Below reorder threshold
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {lowStockList.map((item) => (
                      <div
                        key={item.product_id}
                        className="p-3.5 rounded-[8px] bg-surface border border-warning-border/60 hover:border-warning transition-colors flex flex-col justify-between gap-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold text-text-high truncate">
                              {item.name}
                            </span>
                            <span className="text-xs text-text-medium truncate">
                              Category: {item.category || 'General'} • Reorder at: {item.reorder_level} units
                            </span>
                          </div>
                          {/* Amber Chip: Low stock */}
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-bold bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] shrink-0 tabular-nums">
                            <AlertTriangle className="w-3 h-3" strokeWidth={2.5} />
                            Low stock
                          </span>
                        </div>

                        {/* High Demand Flag if stock runs out in <= 7 days */}
                        {item.is_high_demand && item.days_left !== null && item.days_left !== undefined && (
                          <div className="p-2 rounded-[6px] bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-between text-xs text-[#92400E]">
                            <div className="flex items-center gap-1.5 font-bold">
                              <Flame className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
                              <span>High demand</span>
                            </div>
                            <span className="font-semibold tabular-nums">
                              Runs out in ~{item.days_left} {item.days_left === 1 ? 'day' : 'days'}
                            </span>
                          </div>
                        )}

                        {/* Velocity & Reorder Action */}
                        <div className="flex items-center justify-between pt-2 border-t border-border/80 gap-2">
                          <div className="flex flex-col text-xs">
                            <div className="flex items-center gap-1 text-text-high font-bold tabular-nums">
                              <span>{item.stock_qty} units left</span>
                            </div>
                            {item.daily_sales_rate && item.daily_sales_rate > 0 ? (
                              <span className="text-[11px] text-text-medium">
                                selling ~{item.daily_sales_rate}/day
                              </span>
                            ) : (
                              <span className="text-[11px] text-text-low">
                                zero recent sales
                              </span>
                            )}
                          </div>

                          <Button
                            variant="secondary"
                            onClick={() => handleOpenReorder(item)}
                            className="min-h-[48px] text-xs font-semibold px-3.5 border-warning-border text-[#B45309] hover:bg-warning-bg"
                          >
                            <ShoppingBag className="w-3.5 h-3.5 mr-1.5" />
                            <span>Reorder</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prefilled Supplier Reorder Modal */}
      <ReorderModal
        isOpen={isReorderOpen}
        onClose={() => setIsReorderOpen(false)}
        item={selectedItemForReorder}
      />
    </section>
  );
}
