import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { StoreDataProvider, useStoreData } from './context/StoreDataContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { OverviewView } from './components/dashboard/OverviewView';
import { SalesView } from './components/dashboard/SalesView';
import { InventoryView } from './components/dashboard/InventoryView';
import { ProductsView } from './components/dashboard/ProductsView';
import { CustomersView } from './components/dashboard/CustomersView';
import { OperationsView } from './components/dashboard/OperationsView';
import { MarketingView } from './components/dashboard/MarketingView';
import { DataScienceView } from './components/dashboard/DataScienceView';
import { StitchStudioView } from './components/dashboard/StitchStudioView';
import { ExportModal } from './components/common/ExportModal';
import { AlertsDrawer } from './components/common/AlertsDrawer';

const MainLayout: React.FC = () => {
  const { activeTab } = useStoreData();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);

  const renderActiveView = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewView onOpenExport={() => setIsExportOpen(true)} />;
      case 'sales':
        return <SalesView onOpenExport={() => setIsExportOpen(true)} />;
      case 'inventory':
        return <InventoryView onOpenExport={() => setIsExportOpen(true)} />;
      case 'products':
        return <ProductsView onOpenExport={() => setIsExportOpen(true)} />;
      case 'customers':
        return <CustomersView onOpenExport={() => setIsExportOpen(true)} />;
      case 'operations':
        return <OperationsView onOpenExport={() => setIsExportOpen(true)} />;
      case 'marketing':
        return <MarketingView onOpenExport={() => setIsExportOpen(true)} />;
      case 'datascience':
        return <DataScienceView onOpenExport={() => setIsExportOpen(true)} />;
      case 'stitch-studio':
        return <StitchStudioView />;
      default:
        return <OverviewView onOpenExport={() => setIsExportOpen(true)} />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-text-primary flex">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 w-64 h-full bg-surface-card shadow-2xl">
            <Sidebar collapsed={false} setCollapsed={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          collapsed ? 'md:ml-18' : 'md:ml-64'
        }`}
      >
        <Header
          onOpenExport={() => setIsExportOpen(true)}
          onOpenAlerts={() => setIsAlertsOpen(true)}
          onToggleMobileMenu={() => setMobileOpen(true)}
        />

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-16">
          {renderActiveView()}
        </main>
      </div>

      {/* Modals & Slide-overs */}
      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
      <AlertsDrawer isOpen={isAlertsOpen} onClose={() => setIsAlertsOpen(false)} />
    </div>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <StoreDataProvider>
        <MainLayout />
      </StoreDataProvider>
    </ThemeProvider>
  );
}

export default App;
