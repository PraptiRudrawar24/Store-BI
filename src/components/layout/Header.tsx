import React, { useState } from 'react';
import {
  Search,
  Bell,
  Download,
  Palette,
  Store,
  Calendar,
  Check,
  Menu,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useStoreData } from '../../context/StoreDataContext';
import { StitchTheme, StoreBranch, DateRange } from '../../types/store';

interface HeaderProps {
  onOpenExport: () => void;
  onOpenAlerts: () => void;
  onToggleMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenExport,
  onOpenAlerts,
  onToggleMobileMenu,
}) => {
  const { theme, setTheme, themeMeta } = useTheme();
  const {
    selectedBranch,
    setSelectedBranch,
    dateRange,
    setDateRange,
    searchQuery,
    setSearchQuery,
    alertsCount,
  } = useStoreData();

  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);

  const themeOptions: { id: StitchTheme; name: string; tag: string }[] = [
    { id: 'professional', name: 'Professional', tag: 'Corporate Clean' },
    { id: 'glassmorphism', name: 'Glassmorphism', tag: 'Luminous Dark Glass' },
    { id: 'claymorphism', name: 'Claymorphism', tag: 'Tactile 3D Neumorph' },
    { id: 'berry-glass', name: 'Berry Glass', tag: 'Vibrant Amethyst' },
  ];

  return (
    <header className="sticky top-0 z-20 h-16 bg-surface-card/95 backdrop-blur-md border-b border-border-subtle px-4 md:px-6 flex items-center justify-between gap-4">
      {/* Left: Mobile Toggle & Search */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <button
          onClick={onToggleMobileMenu}
          className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-container md:hidden"
        >
          <Menu size={20} />
        </button>

        <div className="relative w-full">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search SKUs, categories, sales alerts..."
            className="w-full h-9 pl-9 pr-4 rounded-xl text-xs bg-surface-container/70 border border-border-subtle focus:border-primary focus:bg-surface-card focus:outline-none transition-all placeholder:text-text-muted"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-text-primary"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Right Controls: Branch, Date, Theme Switcher, Alerts, Export */}
      <div className="flex items-center gap-2.5">
        {/* Store Branch Selector */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-subtle bg-surface-container/60 text-xs">
          <Store size={14} className="text-text-muted" />
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value as StoreBranch)}
            className="bg-transparent text-text-primary font-medium focus:outline-none cursor-pointer"
          >
            <option value="all" className="bg-surface-card text-text-primary">All Stores (4 Branches)</option>
            <option value="flagship" className="bg-surface-card text-text-primary">Store #01 - Main Flagship</option>
            <option value="downtown" className="bg-surface-card text-text-primary">Store #04 - Downtown Express</option>
            <option value="westside" className="bg-surface-card text-text-primary">Store #12 - Westside Hyper</option>
            <option value="metro" className="bg-surface-card text-text-primary">Store #07 - Metro Center</option>
          </select>
        </div>

        {/* Date Range Selector */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-subtle bg-surface-container/60 text-xs">
          <Calendar size={14} className="text-text-muted" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRange)}
            className="bg-transparent text-text-primary font-medium focus:outline-none cursor-pointer"
          >
            <option value="today" className="bg-surface-card text-text-primary">Today</option>
            <option value="7d" className="bg-surface-card text-text-primary">Last 7 Days</option>
            <option value="30d" className="bg-surface-card text-text-primary">Last 30 Days</option>
            <option value="ytd" className="bg-surface-card text-text-primary">Year to Date (2026)</option>
          </select>
        </div>

        {/* Stitch Theme Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border-subtle bg-surface-container/80 hover:bg-surface-container-high transition-colors text-xs font-semibold text-text-primary"
            title="Switch Stitch Design Theme"
          >
            <Palette size={15} className="text-primary" />
            <span className="hidden sm:inline">{themeMeta.name}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/10 text-primary font-mono">
              Theme
            </span>
          </button>

          {isThemeMenuOpen && (
            <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-surface-card border border-border-subtle shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 text-[11px] font-bold uppercase text-text-muted border-b border-border-subtle/50 mb-1">
                Stitch Design System Styles
              </div>
              {themeOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setTheme(opt.id);
                    setIsThemeMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors text-left ${
                    theme === opt.id
                      ? 'bg-primary text-white font-semibold'
                      : 'text-text-primary hover:bg-surface-container'
                  }`}
                >
                  <div>
                    <div className="font-semibold">{opt.name}</div>
                    <div className={`text-[10px] ${theme === opt.id ? 'text-white/80' : 'text-text-muted'}`}>
                      {opt.tag}
                    </div>
                  </div>
                  {theme === opt.id && <Check size={14} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Alerts Bell */}
        <button
          onClick={onOpenAlerts}
          className="relative p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-container transition-colors"
          title="Operational Alerts"
        >
          <Bell size={18} />
          {alertsCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
              {alertsCount}
            </span>
          )}
        </button>

        {/* Export Data Button */}
        <button
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white hover:bg-primary-hover font-semibold text-xs transition-all shadow-sm active:scale-95"
        >
          <Download size={14} />
          <span className="hidden md:inline">Export</span>
        </button>
      </div>
    </header>
  );
};
