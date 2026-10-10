import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Package,
  Boxes,
  DollarSign,
  Upload,
} from 'lucide-react';
import { Tabs, type TabItem } from '../components/ui/Tabs';
import { Button } from '../components/ui/Button';
import { SalesAnalyticsTab } from '../components/analytics/SalesAnalyticsTab';
import { ProductAnalyticsTab } from '../components/analytics/ProductAnalyticsTab';
import { InventoryAnalyticsTab } from '../components/analytics/InventoryAnalyticsTab';
import { ProfitabilityAnalyticsTab } from '../components/analytics/ProfitabilityAnalyticsTab';

const ANALYTICS_TABS: TabItem[] = [
  {
    id: 'sales',
    label: 'Sales',
    icon: <TrendingUp className="w-4 h-4" />,
  },
  {
    id: 'product',
    label: 'Product',
    icon: <Package className="w-4 h-4" />,
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: <Boxes className="w-4 h-4" />,
  },
  {
    id: 'profitability',
    label: 'Profitability',
    icon: <DollarSign className="w-4 h-4" />,
  },
];

export function AnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const currentTab = searchParams.get('tab') || 'sales';
  const validTab = ['sales', 'product', 'inventory', 'profitability'].includes(currentTab)
    ? currentTab
    : 'sales';

  const handleTabChange = (newTab: string) => {
    setSearchParams({ tab: newTab });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-high">Analytics</h1>
          <p className="text-sm text-text-medium mt-0.5">
            Store performance insights, demand velocity, inventory health, and profitability breakdowns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate('/upload')}
            className="text-xs min-h-[48px] px-4 gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload data</span>
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-border">
        <Tabs
          tabs={ANALYTICS_TABS}
          activeTab={validTab}
          onChange={handleTabChange}
        />
      </div>

      {/* Tab Content Panels */}
      {validTab === 'sales' && <SalesAnalyticsTab />}

      {validTab === 'product' && <ProductAnalyticsTab />}

      {validTab === 'inventory' && <InventoryAnalyticsTab />}

      {validTab === 'profitability' && <ProfitabilityAnalyticsTab />}
    </div>
  );
}
