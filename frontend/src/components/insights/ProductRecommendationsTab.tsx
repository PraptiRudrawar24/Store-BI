import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  PackagePlus,
  Boxes,
  Percent,
  AlertTriangle,
  ArrowUpDown,
  Upload,
  PlusCircle,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Languages,
  Bot,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { api } from '../../api/client';
import type {
  RecommendationItem,
  RecommendationsResponse,
} from '../../api/client';
import { formatINR } from '../../utils';

export function ProductRecommendationsTab() {
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<RecommendationsResponse | null>(null);
  const [activeFilter, setActiveFilter] = React.useState<string>('all');
  
  // Explanation state per card: { [recId]: { open: boolean, lang: 'en' | 'hi' | 'mr', loading: boolean, text: string, isLLM: boolean } }
  const [explanations, setExplanations] = React.useState<
    Record<
      string,
      {
        open: boolean;
        lang: 'en' | 'hi' | 'mr';
        loading: boolean;
        text: string;
        isLLM: boolean;
      }
    >
  >({});

  const fetchRecommendations = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getRecommendations();
      setData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load recommendations';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const handleToggleExplain = async (
    rec: RecommendationItem,
    targetLang?: 'en' | 'hi' | 'mr'
  ) => {
    const current = explanations[rec.id];
    const newLang = targetLang || current?.lang || 'en';

    // If already open and clicked the same language button or toggle button without changing lang
    if (current?.open && !targetLang) {
      setExplanations((prev) => ({
        ...prev,
        [rec.id]: { ...prev[rec.id], open: false },
      }));
      return;
    }

    // Check if we already have the text in template_explanations as quick default
    const fallbackTemplate = rec.template_explanations?.[newLang] || rec.reason;

    setExplanations((prev) => ({
      ...prev,
      [rec.id]: {
        open: true,
        lang: newLang,
        loading: true,
        text: fallbackTemplate,
        isLLM: false,
      },
    }));

    try {
      const res = await api.explainRecommendation({
        rec_id: rec.id,
        title: rec.title,
        reason: rec.reason,
        action: rec.action,
        language: newLang,
        rec_type: rec.type,
        product_name: rec.product_name || undefined,
        numbers: rec.numbers,
      });

      setExplanations((prev) => ({
        ...prev,
        [rec.id]: {
          open: true,
          lang: newLang,
          loading: false,
          text: res.explanation,
          isLLM: res.is_llm,
        },
      }));
    } catch {
      // Fallback to pre-calculated template explanation if API fails
      setExplanations((prev) => ({
        ...prev,
        [rec.id]: {
          open: true,
          lang: newLang,
          loading: false,
          text: fallbackTemplate,
          isLLM: false,
        },
      }));
    }
  };

  const filteredRecommendations = React.useMemo(() => {
    if (!data?.recommendations) return [];
    if (activeFilter === 'all') return data.recommendations;
    return data.recommendations.filter((r) => r.type === activeFilter);
  }, [data, activeFilter]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 bg-surface border border-border rounded-[8px] min-h-[360px]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-sm font-semibold text-text-high">Analyzing store ledger and purchase baskets...</span>
        <span className="text-xs text-text-medium mt-1">Calculating association rules, stockouts, and margin gaps</span>
      </div>
    );
  }

  // ZERO STATE
  if (!data?.has_enough_data) {
    const cl = data?.checklist;
    return (
      <div className="flex flex-col gap-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-text-high">Product recommendations</h2>
            <Badge variant="neutral">Data required</Badge>
          </div>
          <p className="text-xs text-text-medium mt-0.5">
            Real-time margin optimization, market-basket combo discovery, and clearance insights.
          </p>
        </div>

        <Card className="border border-border bg-surface p-8 sm:p-10">
          <div className="max-w-xl mx-auto flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4 border border-primary/20">
              <Sparkles className="w-7 h-7" />
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-text-high">
              Recommendations appear once you have sales and stock data
            </h3>
            <p className="text-sm text-text-medium mt-2 leading-relaxed">
              Store BI analyzes your actual checkout transactions and product purchase costs to find
              high-margin reorders, fast-selling combos, and dead inventory.
            </p>

            {/* Missing Data Checklist */}
            <div className="w-full mt-6 p-5 rounded-[8px] bg-canvas border border-border text-left">
              <span className="text-xs font-semibold text-text-medium block mb-3">
                Setup checklist to unlock recommendations
              </span>
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-2.5 text-xs">
                  {cl?.has_products ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-4 h-4 text-text-low shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className={cl?.has_products ? 'font-semibold text-text-high' : 'text-text-medium'}>
                      Product inventory added ({cl?.product_count || 0} of {cl?.required_products || 5} minimum items)
                    </span>
                    <p className="text-[11px] text-text-medium mt-0.5">
                      Need products with cost and selling prices to compute profit margins.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-xs">
                  {cl?.has_cost_margins ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-4 h-4 text-text-low shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className={cl?.has_cost_margins ? 'font-semibold text-text-high' : 'text-text-medium'}>
                      Cost prices configured
                    </span>
                    <p className="text-[11px] text-text-medium mt-0.5">
                      Required to distinguish high-margin goods from low-margin staples.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-xs">
                  {cl?.has_sales_history ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-4 h-4 text-text-low shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className={cl?.has_sales_history ? 'font-semibold text-text-high' : 'text-text-medium'}>
                      Sales history recorded ({cl?.sales_days || 0} of {cl?.required_sales_days || 7} days)
                    </span>
                    <p className="text-[11px] text-text-medium mt-0.5">
                      Multi-day checkout bills reveal customer purchasing velocity and frequent pairs.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action CTAs */}
            <div className="flex flex-col sm:flex-row items-center gap-3 mt-6 w-full sm:w-auto">
              <Button
                variant="primary"
                onClick={() => navigate('/upload')}
                className="w-full sm:w-auto gap-2"
              >
                <Upload className="w-4 h-4" />
                <span>Upload sales data or bill</span>
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate('/products')}
                className="w-full sm:w-auto gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Manage products</span>
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // POPULATED STATE
  return (
    <div className="flex flex-col gap-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-text-high">Product recommendations</h2>
            <Badge variant="neutral" dot>
              {data.summary.total} active insights
            </Badge>
          </div>
          <p className="text-xs text-text-medium mt-0.5">
            Automated recommendations calculated directly from your sales velocity and inventory costs.
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={fetchRecommendations}
          className="text-xs min-h-[48px] px-3 gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh analysis</span>
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 rounded-[8px] font-semibold transition-colors shrink-0 ${
            activeFilter === 'all'
              ? 'bg-primary text-white'
              : 'bg-surface text-text-medium border border-border hover:bg-canvas'
          }`}
        >
          All ({data.summary.total})
        </button>

        <button
          onClick={() => setActiveFilter('stock_more')}
          className={`px-3 py-1.5 rounded-[8px] font-semibold transition-colors shrink-0 flex items-center gap-1.5 ${
            activeFilter === 'stock_more'
              ? 'bg-emerald-600 text-white'
              : 'bg-surface text-text-medium border border-border hover:bg-canvas'
          }`}
        >
          <PackagePlus className="w-3.5 h-3.5" />
          <span>Stock more ({data.summary.stock_more})</span>
        </button>

        <button
          onClick={() => setActiveFilter('bundle')}
          className={`px-3 py-1.5 rounded-[8px] font-semibold transition-colors shrink-0 flex items-center gap-1.5 ${
            activeFilter === 'bundle'
              ? 'bg-primary text-white'
              : 'bg-surface text-text-medium border border-border hover:bg-canvas'
          }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>Bundle ({data.summary.bundle})</span>
        </button>

        <button
          onClick={() => setActiveFilter('discount_clear')}
          className={`px-3 py-1.5 rounded-[8px] font-semibold transition-colors shrink-0 flex items-center gap-1.5 ${
            activeFilter === 'discount_clear'
              ? 'bg-amber-600 text-white'
              : 'bg-surface text-text-medium border border-border hover:bg-canvas'
          }`}
        >
          <Percent className="w-3.5 h-3.5" />
          <span>Discount to clear ({data.summary.discount_clear})</span>
        </button>

        <button
          onClick={() => setActiveFilter('reconsider')}
          className={`px-3 py-1.5 rounded-[8px] font-semibold transition-colors shrink-0 flex items-center gap-1.5 ${
            activeFilter === 'reconsider'
              ? 'bg-rose-600 text-white'
              : 'bg-surface text-text-medium border border-border hover:bg-canvas'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Reconsider ({data.summary.reconsider})</span>
        </button>

        <button
          onClick={() => setActiveFilter('price_check')}
          className={`px-3 py-1.5 rounded-[8px] font-semibold transition-colors shrink-0 flex items-center gap-1.5 ${
            activeFilter === 'price_check'
              ? 'bg-purple-600 text-white'
              : 'bg-surface text-text-medium border border-border hover:bg-canvas'
          }`}
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          <span>Price check ({data.summary.price_check})</span>
        </button>
      </div>

      {/* Recommendations Cards Grid */}
      {filteredRecommendations.length === 0 ? (
        <Card className="p-12 text-center border border-border bg-surface">
          <p className="text-sm text-text-medium">
            No recommendations currently matching the selected filter.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredRecommendations.map((rec) => {
            const exp = explanations[rec.id];
            const isExpanded = !!exp?.open;

            // Icon and styling config per recommendation type
            let badgeVariant: 'success' | 'warning' | 'destructive' | 'neutral' = 'neutral';
            let iconEl = <Sparkles className="w-4 h-4" />;
            let borderStyle = 'border-border';

            if (rec.type === 'stock_more') {
              badgeVariant = 'success';
              iconEl = <PackagePlus className="w-4 h-4 text-emerald-600" />;
              borderStyle = 'border-emerald-200/80';
            } else if (rec.type === 'bundle') {
              badgeVariant = 'neutral';
              iconEl = <Boxes className="w-4 h-4 text-primary" />;
              borderStyle = 'border-primary/30';
            } else if (rec.type === 'discount_clear') {
              badgeVariant = 'warning';
              iconEl = <Percent className="w-4 h-4 text-amber-600" />;
              borderStyle = 'border-amber-200/80';
            } else if (rec.type === 'reconsider') {
              badgeVariant = 'destructive';
              iconEl = <AlertTriangle className="w-4 h-4 text-destructive" />;
              borderStyle = 'border-destructive/30';
            } else if (rec.type === 'price_check') {
              badgeVariant = 'neutral';
              iconEl = <ArrowUpDown className="w-4 h-4 text-purple-600" />;
              borderStyle = 'border-purple-200/80';
            }

            return (
              <Card
                key={rec.id}
                className={`border bg-surface transition-all overflow-hidden ${borderStyle}`}
              >
                <CardContent className="p-5 flex flex-col gap-4">
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-[8px] bg-canvas border border-border flex items-center justify-center shrink-0 mt-0.5">
                        {iconEl}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-bold text-text-high">
                            {rec.title}
                          </span>
                          <Badge variant={badgeVariant}>{rec.type_label}</Badge>
                          {rec.category && (
                            <span className="text-xs text-text-medium px-2 py-0.5 rounded bg-canvas border border-border font-medium">
                              {rec.category}
                            </span>
                          )}
                        </div>
                        {/* Numbers Reason Paragraph */}
                        <p className="text-sm text-text-medium mt-1.5 leading-relaxed">
                          {rec.reason}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Metrics Pills / Numbers Grid */}
                  {rec.numbers && Object.keys(rec.numbers).length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-border/60">
                      {rec.numbers.margin_pct !== undefined && (
                        <div className="px-2.5 py-1 rounded-[6px] bg-canvas border border-border text-xs flex items-center gap-1.5 tabular-nums">
                          <span className="text-text-medium">Margin:</span>
                          <span className="font-bold text-text-high">{rec.numbers.margin_pct}%</span>
                        </div>
                      )}
                      {rec.numbers.stock_qty !== undefined && (
                        <div className="px-2.5 py-1 rounded-[6px] bg-canvas border border-border text-xs flex items-center gap-1.5 tabular-nums">
                          <span className="text-text-medium">Current stock:</span>
                          <span className="font-bold text-text-high">{rec.numbers.stock_qty} units</span>
                        </div>
                      )}
                      {rec.numbers.daily_velocity !== undefined && (
                        <div className="px-2.5 py-1 rounded-[6px] bg-canvas border border-border text-xs flex items-center gap-1.5 tabular-nums">
                          <span className="text-text-medium">Run rate:</span>
                          <span className="font-bold text-text-high">~{rec.numbers.daily_velocity} /day</span>
                        </div>
                      )}
                      {rec.numbers.support_pct !== undefined && rec.numbers.confidence_pct !== undefined && (
                        <>
                          <div className="px-2.5 py-1 rounded-[6px] bg-blue-50 border border-blue-200 text-xs flex items-center gap-1.5 tabular-nums text-blue-900">
                            <span>Support:</span>
                            <span className="font-bold">{rec.numbers.support_pct}%</span>
                          </div>
                          <div className="px-2.5 py-1 rounded-[6px] bg-blue-50 border border-blue-200 text-xs flex items-center gap-1.5 tabular-nums text-blue-900">
                            <span>Confidence:</span>
                            <span className="font-bold">{rec.numbers.confidence_pct}%</span>
                          </div>
                          {rec.numbers.pair_count && (
                            <div className="px-2.5 py-1 rounded-[6px] bg-canvas border border-border text-xs flex items-center gap-1.5 tabular-nums">
                              <span className="text-text-medium">Bought together:</span>
                              <span className="font-bold text-text-high">{rec.numbers.pair_count} bills</span>
                            </div>
                          )}
                        </>
                      )}
                      {rec.numbers.days_to_expiry !== undefined && (
                        <div className="px-2.5 py-1 rounded-[6px] bg-amber-50 border border-amber-200 text-xs flex items-center gap-1.5 tabular-nums text-amber-900">
                          <span>Expiry:</span>
                          <span className="font-bold">{rec.numbers.days_to_expiry} days left</span>
                        </div>
                      )}
                      {rec.numbers.at_risk_amount !== undefined && (
                        <div className="px-2.5 py-1 rounded-[6px] bg-canvas border border-border text-xs flex items-center gap-1.5 tabular-nums">
                          <span className="text-text-medium">Capital at risk:</span>
                          <span className="font-bold text-destructive">{formatINR(rec.numbers.at_risk_amount, true)}</span>
                        </div>
                      )}
                      {rec.numbers.locked_capital !== undefined && (
                        <div className="px-2.5 py-1 rounded-[6px] bg-canvas border border-border text-xs flex items-center gap-1.5 tabular-nums">
                          <span className="text-text-medium">Idle capital:</span>
                          <span className="font-bold text-amber-700">{formatINR(rec.numbers.locked_capital, true)}</span>
                        </div>
                      )}
                      {rec.numbers.category_avg_margin !== undefined && (
                        <div className="px-2.5 py-1 rounded-[6px] bg-purple-50 border border-purple-200 text-xs flex items-center gap-1.5 tabular-nums text-purple-900">
                          <span>Category avg:</span>
                          <span className="font-bold">{rec.numbers.category_avg_margin}%</span>
                        </div>
                      )}
                      {rec.numbers.suggested_price !== undefined && (
                        <div className="px-2.5 py-1 rounded-[6px] bg-canvas border border-border text-xs flex items-center gap-1.5 tabular-nums">
                          <span className="text-text-medium">Target price:</span>
                          <span className="font-bold text-primary">{formatINR(rec.numbers.suggested_price)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Bar & Explain Trigger */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="primary"
                        onClick={() => {
                          toast.success(`Action initiated: ${rec.action}`);
                          if (rec.action_type === 'reorder') {
                            navigate('/products');
                          }
                        }}
                        className="text-xs h-9 min-h-[36px] px-3.5"
                      >
                        <span>{rec.action}</span>
                      </Button>
                    </div>

                    {/* Optional "Explain in simple words" Button */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => handleToggleExplain(rec)}
                        className={`text-xs h-9 min-h-[36px] px-3 gap-1.5 transition-colors ${
                          isExpanded ? 'bg-primary/10 text-primary border-primary/30' : ''
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                        <span>Explain in simple words</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Expandable "Explain in simple words" Panel */}
                  {isExpanded && (
                    <div className="mt-2 p-4 rounded-[8px] bg-canvas border border-primary/20 flex flex-col gap-3 transition-all">
                      {/* Language Selector Bar */}
                      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-border/60">
                        <div className="flex items-center gap-1.5 text-xs text-text-medium">
                          <Languages className="w-3.5 h-3.5 text-primary" />
                          <span className="font-semibold">Explanation Language:</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleExplain(rec, 'en')}
                            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                              exp.lang === 'en'
                                ? 'bg-primary text-white'
                                : 'bg-surface text-text-medium border border-border hover:bg-canvas'
                            }`}
                          >
                            English
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleExplain(rec, 'hi')}
                            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                              exp.lang === 'hi'
                                ? 'bg-primary text-white'
                                : 'bg-surface text-text-medium border border-border hover:bg-canvas'
                            }`}
                          >
                            हिन्दी (Hindi)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleExplain(rec, 'mr')}
                            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                              exp.lang === 'mr'
                                ? 'bg-primary text-white'
                                : 'bg-surface text-text-medium border border-border hover:bg-canvas'
                            }`}
                          >
                            मराठी (Marathi)
                          </button>
                        </div>
                      </div>

                      {/* Explanation Content */}
                      <div className="text-xs sm:text-sm text-text-high leading-relaxed pt-1">
                        {exp.loading ? (
                          <div className="flex items-center gap-2 text-text-medium py-2">
                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <span>Generating easy explanation for store owner...</span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <p className="font-medium text-text-high">{exp.text}</p>
                            <div className="flex items-center gap-2 pt-1 text-[11px] text-text-medium">
                              {exp.isLLM ? (
                                <span className="inline-flex items-center gap-1 text-primary font-semibold">
                                  <Bot className="w-3.5 h-3.5" />
                                  <span>Explained by Gemini AI</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-text-medium">
                                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Store BI Retail Rule (Template explanation)</span>
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
