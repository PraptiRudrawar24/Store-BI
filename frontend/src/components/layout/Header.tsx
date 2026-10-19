import * as React from 'react';
import {
  Search,
  Bell,
  LogOut,
  Settings,
  Store,
  ChevronDown,
  ShieldCheck,
  Sun,
  Moon,
  Menu,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { useAlerts } from '../../context/AlertsContext';
import { useTheme } from '../../context/ThemeContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { api, type InAppNotification } from '../../api/client';
import { useNavigate } from 'react-router-dom';
import { PurchaseSubscriptionModal } from '../subscription/PurchaseSubscriptionModal';

import { ProductSearchBar } from '../search/ProductSearchBar';

interface HeaderProps {
  onOpenMobileMenu?: () => void;
}

export function Header({ onOpenMobileMenu }: HeaderProps = {}) {
  const { user, logout } = useAuth();
  const { alertCount } = useAlerts();
  const { theme, toggleTheme } = useTheme();
  const { status: subStatus, openPurchaseModal, isPurchaseModalOpen, closePurchaseModal, initialModalStep } = useSubscription();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // In-App Notifications state
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState<number>(0);
  const notificationsRef = React.useRef<HTMLDivElement>(null);

  const fetchNotifications = React.useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.getInAppNotifications(20);
      setNotifications(res.notifications || []);
      setUnreadCount(res.unread_count || 0);
    } catch {
      // silent
    }
  }, [user]);

  React.useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close notifications dropdown on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    if (notificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [notificationsOpen]);

  const handleMarkAsRead = async (id: number) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silent
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // silent
    }
  };

  const trialDays = subStatus?.trial_days_left ?? user?.trial_days_left ?? 5;
  const isPaid = subStatus?.state === 'Pro Active' || !!user?.is_paid;
  const subDaysLeft = subStatus?.days_remaining ?? user?.subscription_days_left_in_month ?? 30;
  const totalMonthDays = 30;

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

      {/* Left: Mobile Brand & Desktop Search Field with STORE BI & Shop name */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        {/* Mobile Menu Button & Brand Presentation */}
        <div className="flex items-center gap-2 lg:hidden">
          {onOpenMobileMenu && (
            <button
              type="button"
              onClick={onOpenMobileMenu}
              className="w-10 h-10 -ml-1.5 rounded-[6px] border border-border bg-surface flex items-center justify-center text-text-medium hover:text-text-high hover:bg-canvas transition-colors cursor-pointer"
              aria-label="Open navigation sidebar"
              title="Open menu"
            >
              <Menu className="w-5 h-5" strokeWidth={2} />
            </button>
          )}
          <div
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={onOpenMobileMenu}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onOpenMobileMenu?.();
              }
            }}
          >
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
        </div>

        {/* Desktop Search Field & STORE BI + Shop Name on Right Side */}
        <div className="hidden lg:flex items-center gap-3.5">
          <ProductSearchBar placeholder="Search products in inventory... (⌘K)" />

          <div className="flex items-center gap-3 pl-3.5 border-l border-border/80 select-none">
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-sm text-text-high tracking-tight leading-tight uppercase font-mono sm:font-sans">
                STORE BI
              </span>
              <span className="text-[11px] font-medium text-text-medium leading-tight truncate max-w-[180px]">
                {user?.name || 'Retail store'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Notification Bell & Profile Menu */}
      <div className="flex items-center gap-2 sm:gap-3.5">
        {/* Subscription / Trial status badge in app header */}
        {subStatus?.state === 'Payment Pending Review' ? (
          <Badge
            variant="warning"
            dot
            onClick={() => openPurchaseModal('select')}
            className="text-xs font-semibold cursor-pointer hover:opacity-85 transition-opacity animate-pulse bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700"
            title="Payment claim pending admin verification"
          >
            Pending Review
          </Badge>
        ) : subStatus?.state === 'Payment Rejected' ? (
          <Badge
            variant="destructive"
            dot
            onClick={() => openPurchaseModal('qr_pay')}
            className="text-xs font-semibold cursor-pointer hover:opacity-85 transition-opacity"
            title="Payment claim rejected. Click to re-submit"
          >
            Payment Rejected
          </Badge>
        ) : subStatus?.state === 'Pro Active' ? (
          <Badge
            variant="success"
            dot
            onClick={() => openPurchaseModal('qr_pay')}
            className="text-xs font-semibold cursor-pointer hover:opacity-85 transition-opacity"
            title="Click to manage subscription"
          >
            Pro: {subStatus.days_remaining}d left
          </Badge>
        ) : subStatus?.state === 'Trial Active' ? (
          <Badge
            variant={subStatus.days_remaining <= 1 ? 'warning' : 'info'}
            dot
            onClick={() => openPurchaseModal('qr_pay')}
            className="text-xs font-semibold cursor-pointer hover:opacity-85 transition-opacity"
            title="Click to view QR payment scanner (₹1,299)"
          >
            Trial: {subStatus.days_remaining} {subStatus.days_remaining === 1 ? 'day' : 'days'} left
          </Badge>
        ) : subStatus?.state === 'Trial Expired' || subStatus?.state === 'Subscription Expired' ? (
          <Badge
            variant="destructive"
            dot
            onClick={() => openPurchaseModal('qr_pay')}
            className="text-xs font-semibold cursor-pointer hover:opacity-85 transition-opacity"
            title="Subscription expired. Click to renew for ₹1,299"
          >
            Expired (Renew)
          </Badge>
        ) : !isPaid ? (
          <Badge
            variant={trialDays <= 1 ? 'warning' : 'info'}
            dot
            onClick={() => openPurchaseModal('qr_pay')}
            className="text-xs font-semibold cursor-pointer hover:opacity-85 transition-opacity"
            title="Click to view QR payment scanner (₹1,299)"
          >
            Trial: {trialDays} {trialDays === 1 ? 'day' : 'days'} left
          </Badge>
        ) : (
          <Badge
            variant="success"
            dot
            onClick={() => openPurchaseModal('qr_pay')}
            className="text-xs font-semibold cursor-pointer hover:opacity-85 transition-opacity"
            title="Click to manage subscription"
          >
            {user?.plan_name || 'Pro'}: {subDaysLeft} of {totalMonthDays}d left
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

        {/* Notification Bell with Dropdown Menu */}
        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            title={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'Notifications'}
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="w-12 h-12 min-h-[48px] min-w-[48px] rounded-[6px] border border-border bg-surface flex items-center justify-center text-text-medium hover:text-text-high hover:bg-canvas transition-colors relative"
            aria-label={`View notifications (${unreadCount})`}
          >
            <Bell className="w-5 h-5" strokeWidth={2} />
            {unreadCount > 0 ? (
              <span
                id="header-notification-badge"
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center leading-none ring-2 ring-surface tabular-nums"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            ) : alertCount > 0 ? (
              <span
                id="header-alert-badge"
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive-solid text-white text-[10px] font-bold flex items-center justify-center leading-none ring-2 ring-surface tabular-nums"
              >
                {alertCount > 99 ? '99+' : alertCount}
              </span>
            ) : null}
          </button>

          {/* Notifications Dropdown */}
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-border bg-surface p-0 z-50 animate-in fade-in shadow-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-canvas/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-text-high uppercase tracking-wider">
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-primary hover:underline font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-border">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-text-medium">
                    No notifications right now
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => !n.is_read && handleMarkAsRead(n.id)}
                      className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 ${
                        n.is_read ? 'bg-surface hover:bg-canvas/50' : 'bg-primary/5 hover:bg-primary/10'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {n.type === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : n.type === 'error' ? (
                          <XCircle className="w-4 h-4 text-rose-500" />
                        ) : n.type === 'warning' ? (
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                        ) : (
                          <Info className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-xs ${n.is_read ? 'font-medium text-text-high' : 'font-bold text-text-high'}`}>
                            {n.title}
                          </p>
                          {!n.is_read && (
                            <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-text-medium mt-0.5 leading-relaxed">
                          {n.message}
                        </p>
                        <span className="text-[10px] text-text-low mt-1 block">
                          {new Date(n.created_at).toLocaleString('en-IN', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Quick links to alerts */}
              {alertCount > 0 && (
                <div
                  onClick={() => {
                    setNotificationsOpen(false);
                    const alertsEl = document.getElementById('dashboard-alerts-section');
                    if (alertsEl) {
                      alertsEl.scrollIntoView({ behavior: 'smooth' });
                    } else {
                      navigate('/dashboard#alerts');
                    }
                  }}
                  className="p-3 bg-destructive-subtle/10 border-t border-border flex items-center justify-between text-xs text-destructive hover:bg-destructive-subtle/20 cursor-pointer font-medium transition-colors"
                >
                  <span>⚠️ {alertCount} low/out-of-stock product alerts</span>
                  <span className="text-[11px] font-bold underline">View</span>
                </div>
              )}
            </div>
          )}
        </div>

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
            {user?.picture ? (
              <img
                src={user.picture}
                alt={user.owner_name || 'Owner avatar'}
                className="w-8 h-8 rounded-full border border-border object-cover shrink-0 select-none"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs shrink-0 select-none">
                {(user?.owner_name || user?.name || user?.email || 'S')[0].toUpperCase()}
              </div>
            )}
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
                <p className="text-[11px] text-text-medium truncate font-mono">
                  {user?.email || (user?.phone ? `+91 ${user.phone}` : 'Store BI Merchant')}
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
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    navigate('/admin');
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-[6px] text-xs font-semibold text-primary hover:bg-primary/5 transition-colors text-left"
                  role="menuitem"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-primary" strokeWidth={2} />
                    <span>Admin portal</span>
                  </div>
                  {user?.is_admin ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                      Admin
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-canvas text-text-medium border border-border">
                      Ops
                    </span>
                  )}
                </button>
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
        onClose={closePurchaseModal}
        initialStep={initialModalStep}
      />
    </header>
  );
}
