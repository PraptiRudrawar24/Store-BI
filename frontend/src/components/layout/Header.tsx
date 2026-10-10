import * as React from 'react';
import { Search, Bell, LogOut, Settings, Store, ChevronDown, ShieldCheck } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { useAlerts } from '../../context/AlertsContext';
import { useNavigate } from 'react-router-dom';

export function Header() {
  const { user, logout } = useAuth();
  const { alertCount } = useAlerts();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const trialDays = user?.trial_days_left ?? 5;

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

        {/* Desktop Search Field matching reference screens */}
        <div className="hidden lg:flex items-center w-full max-w-sm relative">
          <Search className="w-4 h-4 text-text-medium absolute left-3.5 pointer-events-none" strokeWidth={2} />
          <input
            type="text"
            placeholder="Search stores, bills, items..."
            className="h-10 w-full pl-9 pr-12 rounded-[8px] border border-border bg-canvas text-xs text-text-high placeholder:text-text-low focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-colors"
          />
          <kbd className="absolute right-2.5 px-1.5 py-0.5 text-[10px] font-mono text-text-medium bg-surface border border-border rounded-[4px] pointer-events-none select-none">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right: Notification Bell & Profile Menu */}
      <div className="flex items-center gap-2 sm:gap-3.5">
        {/* Trial Days Chip (Mobile and Tablet display) */}
        <Badge
          variant={trialDays <= 1 ? 'warning' : 'success'}
          dot
          className="text-xs font-semibold lg:hidden"
        >
          {trialDays}d left
        </Badge>

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
          className="w-12 h-12 min-h-[48px] min-w-[48px] rounded-[8px] border border-border bg-surface flex items-center justify-center text-text-medium hover:text-text-high hover:bg-canvas transition-colors relative"
          aria-label={`View alerts (${alertCount})`}
        >
          <Bell className="w-5 h-5" strokeWidth={2} />
          {alertCount > 0 && (
            <span
              id="header-alert-badge"
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center leading-none ring-2 ring-surface tabular-nums"
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
    </header>
  );
}
