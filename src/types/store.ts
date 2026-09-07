export type StitchTheme = 'professional' | 'glassmorphism' | 'claymorphism' | 'berry-glass';

export type StoreBranch = 'all' | 'flagship' | 'downtown' | 'westside' | 'metro';

export type DateRange = 'today' | '7d' | '30d' | 'ytd';

export interface KPIMetric {
  id: string;
  label: string;
  value: string;
  rawValue: number;
  changePercent: number;
  isPositive: boolean;
  periodText: string;
  icon: string;
  sparkline: number[];
}

export interface HourlyTraffic {
  hour: string;
  visitors: number;
  revenue: number;
  transactions: number;
}

export interface CategoryPerformance {
  name: string;
  revenue: number;
  percentage: number;
  margin: number;
  growth: number;
  color: string;
}

export interface InventoryItem {
  sku: string;
  name: string;
  category: string;
  stockLevel: number;
  reorderPoint: number;
  unitCost: number;
  retailPrice: number;
  supplier: string;
  leadTimeDays: number;
  status: 'In Stock' | 'Low Stock' | 'Critical' | 'Overstocked';
  daysUntilStockout: number;
  shelfTurnoverRate: number;
}

export interface ProductMatrixItem {
  sku: string;
  name: string;
  category: string;
  salesVolume: number;
  grossMargin: number;
  revenue: number;
  type: 'Star' | 'Cash Cow' | 'Question Mark' | 'Dog';
  shelfAisle: string;
  isPerishable: boolean;
  expirationDaysRemaining?: number;
}

export interface CustomerSegment {
  segment: string;
  customerCount: number;
  avgBasketSize: number;
  monthlyRevenue: number;
  retentionRate: number;
  color: string;
}

export interface BasketAffinityItem {
  primaryProduct: string;
  associatedProduct: string;
  affinityScore: number; // e.g. 78%
  liftMultiplier: number; // e.g. 2.4x
  recommendedPlacement: string;
}

export interface StoreOperationMetric {
  checkoutLane: string;
  cashierName: string;
  status: 'Open' | 'Express Only' | 'Paused' | 'Closed';
  avgWaitTimeSec: number;
  itemsPerMinute: number;
  queueLength: number;
}

export interface ColdChainSensor {
  zone: string;
  type: 'Walk-in Freezer' | 'Dairy Chiller' | 'Meat & Deli' | 'Produce Mister';
  currentTempC: number;
  targetTempC: number;
  status: 'Optimal' | 'Warning' | 'Critical';
  lastChecked: string;
}

export interface MarketingCampaign {
  id: string;
  name: string;
  channel: 'In-Store Display' | 'Mobile App Push' | 'Loyalty Email' | 'Social Ad';
  startDate: string;
  endDate: string;
  budget: number;
  revenueGenerated: number;
  roiMultiplier: number;
  redemptionRate: number;
  status: 'Active' | 'Scheduled' | 'Completed';
}

export interface PredictiveDemandPoint {
  date: string;
  actual?: number;
  predicted: number;
  lowerBound: number;
  upperBound: number;
}

export interface StitchScreenSummary {
  id: string;
  title: string;
  deviceType: string;
  width: string;
  height: string;
  category: 'Dashboard' | 'Sales' | 'Products' | 'Operations' | 'Customers' | 'Inventory' | 'Marketing' | 'Data Science';
  styleVariant: 'Professional' | 'Glassmorphism' | 'Claymorphism' | 'Berry Glass' | 'Standard';
  screenshotUrl: string;
  htmlFile: string;
}
