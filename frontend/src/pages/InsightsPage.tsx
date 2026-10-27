import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Package,
  Sparkles,
  Upload,
} from 'lucide-react';
import { type TabItem } from '../components/ui/Tabs';
import { SalesPredictionTab } from '../components/insights/SalesPredictionTab';
import { DemandForecastTab } from '../components/insights/DemandForecastTab';
import { ProductRecommendationsTab } from '../components/insights/ProductRecommendationsTab';

const INSIGHTS_TABS: TabItem[] = [
  {
    id: 'sales-prediction',
    label: 'Sales prediction',
    icon: <TrendingUp className="w-4 h-4" />,
  },
  {
    id: 'demand-forecast',
    label: 'Demand forecast',
    icon: <Package className="w-4 h-4" />,
  },
  {
    id: 'product-recommendations',
    label: 'Product recommendations',
    icon: <Sparkles className="w-4 h-4" />,
  },
];

export function InsightsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const rawTab = searchParams.get('tab') || 'sales-prediction';

  // Normalize tab ID if short aliases were used
  let activeTab = 'sales-prediction';
  if (rawTab === 'sales' || rawTab === 'sales-prediction') {
    activeTab = 'sales-prediction';
  } else if (rawTab === 'demand' || rawTab === 'demand-forecast') {
    activeTab = 'demand-forecast';
  } else if (rawTab === 'recommendations' || rawTab === 'product-recommendations') {
    activeTab = 'product-recommendations';
  }

  const handleTabChange = (newTab: string) => {
    setSearchParams({ tab: newTab });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-white tracking-tight">AI Insights & Forecasting</h1>
          <p className="text-[13px] text-[#64748B] dark:text-slate-400 mt-0.5">
            Statistical time-series forecasting, 14-day stock-out mitigation, and automated replenishment recommendations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/upload')}
            className="h-9 px-4 bg-[#136DEC] hover:bg-[#0D5CC9] text-white text-[13px] font-semibold rounded-lg flex items-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload sales data</span>
          </button>
        </div>
      </div>

      {/* Primary Sub-nav Tabs (Stitch Underline Style) */}
      <div className="flex items-center border-b border-[#E2E8F0] dark:border-slate-700 gap-6 sm:gap-8 pt-1 overflow-x-auto no-scrollbar">
        {INSIGHTS_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 pb-3 border-b-2 text-[13px] transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                isActive
                  ? 'border-[#136DEC] text-[#136DEC] font-semibold'
                  : 'border-transparent text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white font-medium'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab Panel */}
      {activeTab === 'sales-prediction' && <SalesPredictionTab />}
      {activeTab === 'demand-forecast' && <DemandForecastTab />}
      {activeTab === 'product-recommendations' && <ProductRecommendationsTab />}
    </div>
  );
}
