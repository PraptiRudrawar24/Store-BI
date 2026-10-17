import * as React from 'react';
import { Search, Bell, LogOut, Settings, Store, ChevronDown, ShieldCheck, Sun, Moon } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { useAlerts } from '../../context/AlertsContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { PurchaseSubscriptionModal } from '../subscription/PurchaseSubscriptionModal';

import { ProductSearchBar } from '../search/ProductSearchBar';

export function Header() {
  const { user, logout } = useAuth();
  const { alertCount } = useAlerts();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const trialDays = user?.trial_days_left ?? 5;
  const isPaid = !!user?.is_paid;
  const subDaysLeft = user?.subscription_days_left_in_month ?? 18;
  const totalMonthDays = user?.subscription_total_days_in_month ?? 30;
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = React.useState(false);

  // Close dropdown on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    if (profileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-surface border-b border-border px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Mobile Search Overlay */}
      {mobileSearchOpen && (
        <div className="lg:hidden fixed inset-x-0 top-0 h-16 bg-surface border-b border-border z-50 px-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex-1">
            <ProductSearchBar
              autoFocus
              isMobileModal
              onCloseMobile={() => setMobileSearchOpen(false)}
              placeholder="Search products in inventory..."
            />
          </div>
          <button
            type="button"
            onClick={() => setMobileSearchOpen(false)}
            className="px-3 py-1.5 rounded-[6px] text-xs font-semibold text-text-medium hover:text-text-high bg-canvas border border-border shrink-0"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Left: Mobile Brand & Desktop Search Field */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        {/* Mobile Logo Presentation */}
        <div className="flex items-center gap-2.5 lg:hidden">
          <img
            src="/logo/store-bi-logo.jpeg"
            alt="Store BI logo"
            className="w-8 h-8 rounded-[8px] object-cover border border-border"
          />
          <div className="flex flex-col">
            <span className="font-bold text-base text-text-high leading-tight">Store BI</span>
            <span className="text-[11px] text-text-medium leading-tight truncate max-w-[120px]">
              {user?.name || 'Retail store'}
            </span>
          </div>
        </div>

        {/* Desktop Search Field with Live Autocomplete */}
        <div className="hidden lg:flex items-center w-full max-w-sm">
          <ProductSearchBar placeholder="Search products in inventory... (⌘K)" />
        </div>
      </div>

      {/* Right: Notification Bell & Profile Menu */}
      <div className="flex items-center gap-2 sm:gap-3.5">
        {/* Trial or Subscription chip in app header */}
        {!isPaid ? (
          <Badge
            variant={trialDays <= 1 ? 'warning' : 'success'}
            dot
            onClick={() => setIsPurchaseModalOpen(true)}
            className="text-xs font-semibold cursor-pointer hover:opacity-85 transition-opacity"
            title="Click to view subscription options"
          >
            Trial: {trialDays} {trialDays === 1 ? 'day' : 'days'} left
          </Badge>
        ) : (
          <Badge
            variant="success"
            dot
            onClick={() => setIsPurchaseModalOpen(true)}
            className="text-xs font-semibold cursor-pointer hover:opacity-85 transition-opacity"
            title="Click to manage subscription"
          >
            {user?.plan_name || 'Pro'}: {subDaysLeft} of {totalMonthDays}d left this month
          </Badge>
        )}

        {/* Mobile Search Button */}
        <button
          type="button"
          onClick={() => setMobileSearchOpen(true)}
          title="Search inventory products"
          className="lg:hidden w-12 h-12 min-h-[48px] min-w-[48px] rounded-[6px] border border-border bg-surface flex items-center justify-center text-text-medium hover:text-text-high hover:bg-canvas transition-colors"
          aria-label="Open search"
        >
          <Search className="w-5 h-5" strokeWidth={2} />
        </button>

        {/* Theme Toggle Button (Sun / Moon) */}
        <button
          type="button"
          id="theme-toggle-button"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="w-12 h-12 min-h-[48px] min-w-[48px] rounded-[6px] border border-border bg-surface flex items-center justify-center text-text-medium hover:text-text-high hover:bg-canvas transition-colors"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-warning" strokeWidth={2} />
          ) : (
            <Moon className="w-5 h-5 text-text-medium" strokeWidth={2} />
          )}
        </button>

        {/* Notification Bell with alert count */}
        <button
          type="button"
          title={alertCount > 0 ? `${alertCount} stock alert${alertCount > 1 ? 's' : ''}` : 'No stock alerts'}
          onClick={() => {
            const alertsEl = document.getElementById('dashboard-alerts-section');
            if (alertsEl) {
              alertsEl.scrollIntoView({ behavior: 'smooth' });
            } else {
              navigate('/dashboard#alerts');
            }
          }}
          className="w-12 h-12 min-h-[48px] min-w-[48px] rounded-[6px] border border-border bg-surface flex items-center justify-center text-text-medium hover:text-text-high hover:bg-canvas transition-colors relative"
          aria-label={`View alerts (${alertCount})`}
        >
          <Bell className="w-5 h-5" strokeWidth={2} />
          {alertCount > 0 && (
            <span
              id="header-alert-badge"
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive-solid text-white text-[10px] font-bold flex items-center justify-center leading-none ring-2 ring-surface tabular-nums"
            >
              {alertCount > 99 ? '99+' : alertCount}
            </span>
          )}
        </button>

        <div className="h-6 w-[1px] bg-border hidden sm:block" />

        {/* Profile Menu with Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2.5 min-h-[48px] px-2 sm:px-2.5 py-1.5 rounded-[8px] hover:bg-canvas border border-transparent hover:border-border transition-colors text-left"
            aria-expanded={profileOpen}
            aria-haspopup="true"
          >
            {/* Store / Owner Avatar */}
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs shrink-0 select-none">
              {(user?.owner_name || user?.name || 'S')[0].toUpperCase()}
            </div>
            <div className="hidden sm:flex flex-col min-w-0">
              <span className="text-xs font-semibold text-text-high leading-tight truncate max-w-[130px]">
                {user?.owner_name || 'Store owner'}
              </span>
              <span className="text-[11px] text-text-medium leading-tight truncate max-w-[130px]">
                {user?.name || 'My store'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-text-medium hidden sm:block" strokeWidth={2} />
          </button>

          {/* Profile Dropdown Menu */}
          {profileOpen && (
            <div
              className="absolute right-0 mt-2 w-56 rounded-[8px] border border-border bg-surface p-1 z-50 animate-in fade-in select-none shadow-none"
              role="menu"
            >
              <div className="px-3 py-2 border-b border-border">
                <p className="text-xs font-bold text-text-high truncate">
                  {user?.name || 'My store'}
                </p>
                <p className="text-[11px] text-text-medium truncate">
                  +91 {user?.phone || '0000000000'}
                </p>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    navigate('/settings');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-xs font-medium text-text-high hover:bg-canvas transition-colors text-left"
                  role="menuitem"
                >
                  <Settings className="w-4 h-4 text-text-medium" strokeWidth={2} />
                  <span>Shop settings</span>
                </button>
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    navigate('/dashboard');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-xs font-medium text-text-high hover:bg-canvas transition-colors text-left"
                  role="menuitem"
                >
                  <Store className="w-4 h-4 text-text-medium" strokeWidth={2} />
                  <span>Store overview</span>
                </button>
                {user?.is_admin && (
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      navigate('/admin');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-xs font-semibold text-primary hover:bg-primary/5 transition-colors text-left"
                    role="menuitem"
                  >
                    <ShieldCheck className="w-4 h-4 text-primary" strokeWidth={2} />
                    <span>Admin portal</span>
                  </button>
                )}
              </div>

              <div className="border-t border-border pt-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-xs font-medium text-destructive hover:bg-destructive-bg transition-colors text-left"
                  role="menuitem"
                >
                  <LogOut className="w-4 h-4" strokeWidth={2} />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <PurchaseSubscriptionModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
      />
    </header>
  );
}
