import React from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  Package,
  Layers,
  Users,
  Store,
  Megaphone,
  BrainCircuit,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { useStoreData, ActiveTab } from '../../context/StoreDataContext';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, setCollapsed }) => {
  const { activeTab, setActiveTab, alertsCount } = useStoreData();

  const navItems: { id: ActiveTab; label: string; icon: React.ElementType; badge?: string }[] = [
    { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'sales', label: 'Sales Analytics', icon: TrendingUp },
    { id: 'inventory', label: 'Inventory & Supply', icon: Package, badge: alertsCount > 0 ? `${alertsCount}` : undefined },
    { id: 'products', label: 'Product Matrix', icon: Layers },
    { id: 'customers', label: 'Customer Insights', icon: Users },
    { id: 'operations', label: 'Store Operations', icon: Store },
    { id: 'marketing', label: 'Marketing ROI', icon: Megaphone },
    { id: 'datascience', label: 'AI Demand Forecast', icon: BrainCircuit },
    { id: 'stitch-studio', label: 'Stitch Studio & API', icon: Sparkles, badge: 'API' },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 h-screen z-30 bg-surface-card border-r border-border-subtle flex flex-col transition-all duration-300 ${
        collapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-border-subtle">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-primary-container text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0">
            L
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-base text-text-primary tracking-tight truncate">
                Lumina Store BI
              </span>
              <span className="text-[11px] text-text-muted font-mono truncate">
                Supermarket Intelligence
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-container transition-colors hidden md:flex items-center justify-center shrink-0"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${
                isActive
                  ? 'bg-primary text-white shadow-sm font-semibold'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-container'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                size={20}
                className={`shrink-0 transition-transform group-hover:scale-105 ${
                  isActive ? 'text-white' : 'text-text-muted group-hover:text-primary'
                }`}
              />

              {!collapsed && (
                <span className="truncate text-left flex-1">{item.label}</span>
              )}

              {!collapsed && item.badge && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : item.id === 'inventory'
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 font-mono'
                      : 'bg-primary/10 text-primary'
                  }`}
                >
                  {item.badge}
                </span>
              )}

              {/* Collapsed Active Indicator */}
              {collapsed && isActive && (
                <div className="absolute right-1 w-1.5 h-6 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Stitch Status Pill */}
      <div className="p-3 border-t border-border-subtle">
        <div
          onClick={() => setActiveTab('stitch-studio')}
          className={`p-2.5 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 cursor-pointer transition-colors flex items-center gap-2.5 ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-text-primary flex items-center justify-between">
                <span>Stitch Connected</span>
                <ExternalLink size={12} className="text-text-muted" />
              </div>
              <div className="text-[10px] text-text-muted truncate font-mono">
                Key: AQ.Ab8RN...959-w
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
