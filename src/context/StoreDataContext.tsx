import React, { createContext, useContext, useState, useEffect } from 'react';
import { StoreBranch, DateRange, KPIMetric, InventoryItem } from '../types/store';
import { mockKPIs, mockInventory } from '../data/mockStoreData';

export type ActiveTab = 
  | 'overview' 
  | 'sales' 
  | 'inventory' 
  | 'products' 
  | 'customers' 
  | 'operations' 
  | 'marketing' 
  | 'datascience' 
  | 'stitch-studio';

interface LiveTransaction {
  id: string;
  time: string;
  items: string;
  amount: number;
  branch: string;
}

interface StoreDataContextType {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedBranch: StoreBranch;
  setSelectedBranch: (b: StoreBranch) => void;
  dateRange: DateRange;
  setDateRange: (d: DateRange) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  kpis: KPIMetric[];
  inventory: InventoryItem[];
  reorderItem: (sku: string) => void;
  liveTransactions: LiveTransaction[];
  alertsCount: number;
  stitchApiKey: string;
}

const StoreDataContext = createContext<StoreDataContextType | undefined>(undefined);

export const StoreDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [selectedBranch, setSelectedBranch] = useState<StoreBranch>('all');
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [inventory, setInventory] = useState<InventoryItem[]>(mockInventory);
  
  const stitchApiKey = "AQ.Ab8RN6Iu9gGrHEl5CTu4iMkkMpB7BZkZzbhp5iSNiOkCW959-w";

  const [liveTransactions, setLiveTransactions] = useState<LiveTransaction[]>([
    { id: 'tx-101', time: 'Just now', items: '2x Organic Hass Avocados, Whole Milk', amount: 13.87, branch: 'Downtown Express' },
    { id: 'tx-100', time: '1m ago', items: 'Grass-Fed Ribeye, Olive Oil 750ml', amount: 27.48, branch: 'Main Flagship' },
    { id: 'tx-99', time: '3m ago', items: 'Artisan Sourdough, Green Juice', amount: 10.48, branch: 'Westside Hypermarket' },
  ]);

  // Simulate real-time transactions stream
  useEffect(() => {
    const sampleItems = [
      { desc: 'Artisan Sourdough & San Marzano Sauce', price: 9.48 },
      { desc: 'Organic Honey & Specialty Ground Coffee', price: 18.90 },
      { desc: '4x Cold-Pressed Green Juice', price: 23.96 },
      { desc: 'Grass-Fed Ribeye Steak & Sourdough', price: 19.48 },
      { desc: 'Organic Hass Avocados & Lime Chips', price: 8.98 },
    ];
    const branches = ['Main Flagship', 'Downtown Express', 'Westside Hypermarket', 'Metro Center'];

    const interval = setInterval(() => {
      const randomItem = sampleItems[Math.floor(Math.random() * sampleItems.length)];
      const randomBranch = branches[Math.floor(Math.random() * branches.length)];
      const newTx: LiveTransaction = {
        id: `tx-${Date.now().toString().slice(-4)}`,
        time: 'Just now',
        items: randomItem.desc,
        amount: randomItem.price,
        branch: randomBranch,
      };

      setLiveTransactions((prev) => [newTx, ...prev.slice(0, 4)]);
    }, 12000);

    return () => clearInterval(interval);
  }, []);

  const reorderItem = (sku: string) => {
    setInventory((prev) =>
      prev.map((item) => {
        if (item.sku === sku) {
          return {
            ...item,
            stockLevel: item.stockLevel + 150,
            status: 'In Stock',
            daysUntilStockout: 14.0,
          };
        }
        return item;
      })
    );
  };

  const lowStockCount = inventory.filter((i) => i.status === 'Low Stock' || i.status === 'Critical').length;

  return (
    <StoreDataContext.Provider
      value={{
        activeTab,
        setActiveTab,
        selectedBranch,
        setSelectedBranch,
        dateRange,
        setDateRange,
        searchQuery,
        setSearchQuery,
        kpis: mockKPIs,
        inventory,
        reorderItem,
        liveTransactions,
        alertsCount: lowStockCount + 1, // +1 for cold chain warning
        stitchApiKey,
      }}
    >
      {children}
    </StoreDataContext.Provider>
  );
};

export const useStoreData = (): StoreDataContextType => {
  const context = useContext(StoreDataContext);
  if (!context) {
    throw new Error('useStoreData must be used within a StoreDataProvider');
  }
  return context;
};
