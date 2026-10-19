import * as React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Store,
  Tag,
  CreditCard,
  BarChart3,
  Settings,
  Search,
  Bell,
  ArrowLeft,
  LogOut,
  ExternalLink,
  Sun,
  Moon,
  Headset,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../ui/Button';
import { api } from '../../api/client';

export function AdminLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [globalSearch, setGlobalSearch] = React.useState('');
  const [pendingRequestsCount, setPendingRequestsCount] = React.useState<number>(0);

  React.useEffect(() => {
    let isMounted = true;
    const fetchPendingCount = async () => {
      try {
        const res = await api.getAdminSubscriptionRequests({ status: 'pending_review', page: 1, page_size: 1 });
        if (isMounted && res?.counts) {
          setPendingRequestsCount(res.counts.pending || 0);
        }
      } catch {
        // silent fail
      }
    };
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const navLinks = [
    { to: '/admin/overview', label: 'Overview', icon: LayoutDashboard },
    { to: '/admin/subscription-requests', label: 'Subscription Requests', icon: ShieldCheck, badge: pendingRequestsCount },
    { to: '/admin/portal', label: 'Operations Console (12 Modules)', icon: Layers },
    { to: '/admin/businesses', label: 'Businesses', icon: Store },
    { to: '/admin/support', label: 'Support & Tickets', icon: Headset },
    { to: '/admin/plans', label: 'Plans and prices', icon: Tag },
    { to: '/admin/payments', label: 'Payments', icon: CreditCard },
    { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-canvas flex text-text-high font-sans">
      {/* Fixed Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-[260px] bg-surface z-50 flex flex-col border-r border-border">
        {/* Header Branding */}
        <div className="h-16 px-4 flex flex-col justify-center border-b border-border">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo/store-bi-logo.jpeg"
              alt="Store BI logo"
              className="w-7 h-7 rounded-[6px] object-cover border border-border"
            />
            <span className="font-bold text-sm tracking-tight text-text-high">
              Store BI admin
            </span>
          </div>
          <span className="text-[11px] font-medium text-text-medium pl-9">
            Operations portal
          </span>
        </div>

        {/* Sidebar Nav Items */}
        <div className="flex-1 px-3 py-4 flex flex-col justify-between overflow-y-auto">
          <nav className="flex flex-col gap-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-[8px] text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-primary text-white'
                        : 'text-text-medium hover:bg-canvas hover:text-text-high'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        item.to === '/admin/subscription-requests'
                          ? 'bg-amber-500 text-white animate-pulse'
                          : 'bg-primary/20 text-primary'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Bottom Environment & Store App Link */}
          <div className="pt-4 border-t border-border flex flex-col gap-2">
            <div className="px-3 py-1 flex items-center justify-between text-xs">
              <span className="text-text-medium text-[11px]">Environment</span>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[11px] font-bold">
                Production
              </span>
            </div>

            <button
              onClick={() => navigate('/dashboard')}
              className="w-full mt-2 px-3 py-2 rounded-[8px] bg-canvas border border-border hover:bg-surface text-text-high text-xs font-medium flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2">
                <ArrowLeft className="w-3.5 h-3.5 text-text-medium" />
                <span>Store app</span>
              </div>
              <ExternalLink className="w-3 h-3 text-text-low" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="pl-[260px] flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-40 h-16 bg-surface border-b border-border px-6 flex items-center justify-between">
          {/* Header Search */}
          <div className="flex items-center gap-3 w-80 sm:w-96">
            <div className="w-full flex items-center gap-2 px-3 py-1.5 bg-canvas border border-border rounded-[8px]">
              <Search className="w-4 h-4 text-text-medium" />
              <input
                type="text"
                placeholder="Search stores, GSTIN, accounts..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="bg-transparent text-xs text-text-high placeholder:text-text-low focus:outline-none flex-1"
              />
              <kbd className="px-1.5 py-0.5 bg-surface text-text-low text-[10px] rounded border border-border font-mono">
                ⌘K
              </kbd>
            </div>
          </div>

          {/* Header Right Actions */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded text-xs font-semibold border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span>Production</span>
            </div>

            {/* Theme Toggle Button */}
            <button
              type="button"
              id="admin-theme-toggle-button"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="w-12 h-12 min-h-[48px] min-w-[48px] rounded-[6px] border border-border flex items-center justify-center text-text-medium hover:bg-canvas transition-colors"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-warning" />
              ) : (
                <Moon className="w-5 h-5 text-text-medium" />
              )}
            </button>

            <button
              type="button"
              className="w-12 h-12 min-h-[48px] min-w-[48px] rounded-[6px] border border-border flex items-center justify-center text-text-medium hover:bg-canvas transition-colors relative"
              aria-label="Admin notifications"
            >
              <Bell className="w-5 h-5" />
            </button>

            <div className="h-6 w-[1px] bg-border" />

            {/* Admin Profile Chip */}
            <div className="flex items-center gap-2.5">
              {user?.picture ? (
                <img
                  src={user.picture}
                  alt={user.owner_name || 'Admin'}
                  className="w-8 h-8 rounded-full border border-border object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs">
                  {user?.owner_name ? user.owner_name.charAt(0).toUpperCase() : 'A'}
                </div>
              )}
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-bold text-text-high leading-tight">
                  {user?.owner_name || 'Operations Lead'}
                </span>
                <span className="text-[10px] text-text-medium leading-tight">
                  Super admin ({user?.email || 'admin@storebi.com'})
                </span>
              </div>
            </div>

            <Button
              variant="secondary"
              onClick={logout}
              className="h-12 min-h-[48px] min-w-[48px] px-3 text-xs text-text-medium hover:text-destructive gap-1"
              title="Sign out of admin"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Child Page Area */}
        <main className="flex-1 p-6 bg-canvas overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
