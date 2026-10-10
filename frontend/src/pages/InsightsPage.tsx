import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Package,
  Sparkles,
  Upload,
} from 'lucide-react';
import { Tabs, type TabItem } from '../components/ui/Tabs';
import { Button } from '../components/ui/Button';
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-high">AI insights & forecasting</h1>
          <p className="text-sm text-text-medium mt-0.5">
            Statistical time-series forecasting, 14-day stock-out mitigation, and automated replenishment recommendations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate('/upload')}
            className="text-xs min-h-[48px] px-3 gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload sales data</span>
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-border">
        <Tabs
          tabs={INSIGHTS_TABS}
          activeTab={activeTab}
          onChange={handleTabChange}
        />
      </div>

      {/* Active Tab Panel */}
      {activeTab === 'sales-prediction' && <SalesPredictionTab />}
      {activeTab === 'demand-forecast' && <DemandForecastTab />}
      {activeTab === 'product-recommendations' && <ProductRecommendationsTab />}
    </div>
  );
}
