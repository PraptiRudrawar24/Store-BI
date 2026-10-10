import * as React from 'react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { api, type CategorySalesResponse, type CategorySalesItem } from '../../api/client';
import { formatINR } from '../../utils';
import { cn } from '../ui/utils';
import { Layers, Package, AlertCircle, AlertTriangle } from 'lucide-react';

interface CategorySalesCardProps {
  period: 'today' | '7days' | '30days';
  onRecordSaleClick?: () => void;
}

export function CategorySalesCard({ period, onRecordSaleClick }: CategorySalesCardProps) {
  const [data, setData] = React.useState<CategorySalesResponse>({
    period: 'today',
    has_data: false,
    total_sales: 0,
    categories: [],
  });
  const [loading, setLoading] = React.useState(true);
  const [selectedCategoryName, setSelectedCategoryName] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);

    api.getCategorySales(period)
      .then((res) => {
        if (!cancelled) {
          setData(res);
          if (res.categories.length > 0) {
            // Keep selected category if it still exists in the new period, otherwise default to first
            setSelectedCategoryName((prev) => {
              const exists = res.categories.some((c) => c.category === prev);
              return exists ? prev : res.categories[0].category;
            });
          } else {
            setSelectedCategoryName(null);
          }
        }
      })
      .catch(() => {
        // Fallback
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [period]);

  const selectedCategory: CategorySalesItem | undefined = data.categories.find(
    (c) => c.category === selectedCategoryName
  ) || data.categories[0];

  const periodLabel =
    period === 'today' ? 'Today' : period === '7days' ? 'Last 7 days' : 'Last 30 days';

  return (
    <Card>
      <CardHeader
        title="Category-wise sales"
        subtitle={`Department distribution and top selling merchandise for ${periodLabel}`}
        action={
          data.has_data && (
            <span className="text-xs font-semibold text-text-medium px-2.5 py-1 rounded-[6px] bg-canvas border border-border tabular-nums">
              {data.categories.length} {data.categories.length === 1 ? 'category' : 'categories'}
            </span>
          )
        }
      />

      <CardContent className="p-4 sm:p-6 flex flex-col gap-6">
        {/* ZERO STATE: Category card shows "No categories yet" */}
        {!data.has_data && !loading ? (
          <div className="flex flex-col items-center justify-center text-center py-10 px-4 bg-canvas/50 border border-dashed border-border rounded-[8px] gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Layers className="w-6 h-6 stroke-[1.75]" />
            </div>
            <div className="flex flex-col gap-1 max-w-sm">
              <h3 className="text-sm font-bold text-text-high">No categories yet</h3>
              <p className="text-xs text-text-medium leading-relaxed">
                Category revenue shares and top product lists will generate once sales are recorded in {periodLabel.toLowerCase()}.
              </p>
            </div>
            {onRecordSaleClick && (
              <button
                type="button"
                onClick={onRecordSaleClick}
                className="mt-1 px-4 py-2 rounded-[8px] text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Record a sale
              </button>
            )}
          </div>
        ) : (
          /* POPULATED STATE: Horizontal bars & Top 5 products side-by-side */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Horizontal Category Bars (7 cols on desktop) */}
            <div className="lg:col-span-7 flex flex-col gap-3">
              <div className="flex items-center justify-between pb-1 text-xs text-text-medium font-semibold">
                <span>Category</span>
                <div className="flex items-center gap-4">
                  <span>Share %</span>
                  <span className="w-20 text-right">Sales</span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                {data.categories.map((cat) => {
                  const isSelected = selectedCategory?.category === cat.category;

                  return (
                    <button
                      key={cat.category}
                      type="button"
                      onClick={() => setSelectedCategoryName(cat.category)}
                      className={cn(
                        'w-full text-left p-3 rounded-[8px] border transition-all flex flex-col gap-2',
                        isSelected
                          ? 'border-primary bg-primary/[0.03] ring-1 ring-primary/20'
                          : 'border-border bg-surface hover:bg-canvas'
                      )}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'font-bold truncate max-w-[150px] sm:max-w-[220px]',
                              isSelected ? 'text-primary' : 'text-text-high'
                            )}
                          >
                            {cat.category}
                          </span>
                          <span className="text-[11px] text-text-medium tabular-nums">
                            ({cat.units_sold} units)
                          </span>
                        </div>

                        <div className="flex items-center gap-4 tabular-nums">
                          <span className="font-semibold text-text-medium">
                            {cat.share_pct}%
                          </span>
                          <span className="font-bold text-text-high w-20 text-right">
                            {formatINR(cat.sales)}
                          </span>
                        </div>
                      </div>

                      {/* Flat Horizontal Bar (No gradients per DESIGN.md) */}
                      <div className="w-full h-2 rounded-full bg-canvas border border-border/80 overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-300',
                            isSelected ? 'bg-primary' : 'bg-primary/70'
                          )}
                          style={{ width: `${Math.min(100, Math.max(2, cat.share_pct))}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Top 5 Products List for Selected Category (5 cols on desktop) */}
            <div className="lg:col-span-5 flex flex-col p-4 rounded-[8px] bg-canvas border border-border gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex flex-col min-w-0">
                  <h4 className="text-xs font-bold text-text-high truncate">
                    Top 5 products: {selectedCategory?.category || 'Selected'}
                  </h4>
                  <span className="text-[11px] text-text-medium">
                    Highest revenue contributors
                  </span>
                </div>
                <span className="text-[11px] text-text-medium bg-surface px-2 py-0.5 rounded border border-border shrink-0">
                  {periodLabel}
                </span>
              </div>

              {selectedCategory && selectedCategory.top_products.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {selectedCategory.top_products.map((prod, idx) => (
                    <div
                      key={prod.product_id}
                      className="p-2.5 rounded-[6px] bg-surface border border-border/80 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Rank Badge */}
                        <span className="w-5 h-5 rounded-full bg-canvas text-text-medium text-[11px] font-bold flex items-center justify-center shrink-0 border border-border">
                          {idx + 1}
                        </span>

                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-text-high truncate max-w-[130px] sm:max-w-[160px]">
                            {prod.name}
                          </span>
                          <span className="text-[11px] text-text-medium">
                            {prod.units_sold} {prod.units_sold === 1 ? 'unit' : 'units'} sold
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end shrink-0">
                        <span className="font-bold text-text-high tabular-nums">
                          {formatINR(prod.sales)}
                        </span>
                        {/* Stock indicator */}
                        {prod.stock_qty === 0 ? (
                          <span className="text-[10px] font-bold text-destructive flex items-center gap-0.5">
                            <AlertCircle className="w-2.5 h-2.5" /> 0 stock
                          </span>
                        ) : prod.stock_qty <= 5 ? (
                          <span className="text-[10px] font-bold text-warning flex items-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" /> {prod.stock_qty} left
                          </span>
                        ) : (
                          <span className="text-[10px] text-text-low">
                            {prod.stock_qty} in stock
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center text-xs text-text-medium gap-1">
                  <Package className="w-5 h-5 text-text-low" />
                  <span>No itemized products recorded for this category yet.</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
