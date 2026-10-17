import * as React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ReceiptText,
  Package,
  ChartColumnIncreasing,
  Sparkles,
  Store,
  LogOut,
  Settings,
  Headset,
} from 'lucide-react';
import { Dock, DockIcon, DockItem, DockLabel } from '@/components/core/dock';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { PurchaseSubscriptionModal } from '../subscription/PurchaseSubscriptionModal';

interface SidebarProps {
  onCloseMobile?: () => void;
}

export function Sidebar({ onCloseMobile }: SidebarProps) {
  const { user, logout } = useAuth();
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = React.useState(false);
  const [unreadSupportCount, setUnreadSupportCount] = React.useState(0);

  React.useEffect(() => {
    let mounted = true;
    const checkUnread = async () => {
      try {
        const res = await api.getCustomerSupportUnreadCount();
        if (mounted) setUnreadSupportCount(res.unread_count);
      } catch {
        // ignore
      }
    };
    checkUnread();
    const interval = setInterval(checkUnread, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/pos', label: 'POS Billing', icon: ReceiptText },
    { to: '/upload', label: 'Inventory Management', icon: Package },
    { to: '/analytics', label: 'Analytics', icon: ChartColumnIncreasing },
    { to: '/insights', label: 'AI Insight', icon: Sparkles },
    {
      to: '/support',
      label: 'Support & Feedback',
      icon: Headset,
      badge: unreadSupportCount > 0 ? unreadSupportCount : undefined,
    },
  ];

  const trialDays = user?.trial_days_left ?? 5;
  const isPaid = !!user?.is_paid;
  const subDaysLeft = user?.subscription_days_left_in_month ?? 18;
  const totalMonthDays = user?.subscription_total_days_in_month ?? 30;

  return (
    <aside className="w-full h-full bg-surface dark:bg-surface-low border-r border-border flex flex-col justify-between overflow-y-auto">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Brand Header */}
        <div className="h-20 px-4 flex flex-col justify-center border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <img
              src="/logo/store-bi-logo.jpeg"
              alt="Store BI logo"
              className="w-8 h-8 rounded-[6px] object-cover border border-border shrink-0"
            />
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-base text-text-high leading-tight">
                Store BI
              </span>
              {/* Shop name under the logo */}
              <span className="text-xs text-text-medium leading-tight truncate mt-0.5">
                {user?.name || 'Retail store'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Links with Animated Vertical Dock */}
        <nav className="p-3 flex-1 overflow-y-auto" role="navigation" aria-label="Sidebar navigation">
          <Dock orientation="vertical" className="w-full gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <DockItem
                  key={item.to}
                  to={item.to}
                  onClick={onCloseMobile}
                  aria-label={item.label}
                >
                  <DockIcon>
                    <div className="relative flex items-center justify-center">
                      <Icon className="w-5 h-5 shrink-0" strokeWidth={2} />
                      {item.badge !== undefined && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-surface animate-pulse" />
                      )}
                    </div>
                  </DockIcon>
                  <DockLabel>{item.label}</DockLabel>
                </DockItem>
              );
            })}
          </Dock>
        </nav>
      </div>

      {/* Footer Area: Trial / Subscription chip near the bottom + Shop info */}
      <div className="p-3 border-t border-border flex flex-col gap-2.5 shrink-0">
        {/* Status card in left down corner */}
        {!isPaid ? (
          <div className="p-3 rounded-[8px] bg-canvas dark:bg-surface border border-border flex flex-col gap-2 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[11px] text-text-medium font-medium">Account status</span>
                <span className="text-xs font-semibold text-text-high">Full-access trial</span>
              </div>
              <Badge
                variant={trialDays <= 1 ? 'warning' : 'success'}
                dot
              >
                Trial: {trialDays} {trialDays === 1 ? 'day' : 'days'} left
              </Badge>
            </div>
            {/* Option for purchasing subscription */}
            <button
              type="button"
              onClick={() => setIsPurchaseModalOpen(true)}
              className="w-full py-2 px-2.5 rounded-[6px] bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              title="Purchase Store BI subscription"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>Purchase subscription</span>
            </button>
          </div>
        ) : (
          <div className="p-3 rounded-[8px] bg-canvas dark:bg-surface border border-border flex flex-col gap-2 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[11px] text-text-medium font-medium">Account status</span>
                <span className="text-xs font-semibold text-text-high truncate max-w-[120px]">{user?.plan_name || 'Active Pro'}</span>
              </div>
              <Badge variant="success" dot>
                {subDaysLeft} {subDaysLeft === 1 ? 'day' : 'days'} left
              </Badge>
            </div>
            {/* How many days left out of month */}
            <div className="flex items-center justify-between text-[11px] text-text-medium pt-0.5">
              <span>Days left out of month:</span>
              <span className="font-bold text-text-high">{subDaysLeft} / {totalMonthDays} days</span>
            </div>
            <button
              type="button"
              onClick={() => setIsPurchaseModalOpen(true)}
              className="w-full py-1.5 px-2.5 rounded-[6px] border border-border hover:bg-canvas dark:hover:bg-surface-high text-text-high text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Manage or upgrade subscription"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Manage / Upgrade plan</span>
            </button>
          </div>
        )}

        {/* Store Profile & Quick Actions */}
        <div className="px-3 py-2 rounded-[6px] bg-surface dark:bg-surface-low border border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-[6px] bg-canvas dark:bg-surface border border-border flex items-center justify-center shrink-0">
              <Store className="w-4 h-4 text-text-medium" strokeWidth={2} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-text-high truncate">
                {user?.owner_name || 'Store owner'}
              </span>
              <span className="text-[11px] text-text-medium truncate">
                +91 {user?.phone || '0000000000'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <NavLink
              to="/settings"
              title="Store settings"
              className="w-12 h-12 min-h-[48px] min-w-[48px] flex items-center justify-center rounded-[6px] text-text-medium hover:text-text-high hover:bg-canvas dark:hover:bg-surface-high transition-colors"
            >
              <Settings className="w-5 h-5" strokeWidth={2} />
            </NavLink>
            <button
              onClick={logout}
              title="Sign out"
              className="w-12 h-12 min-h-[48px] min-w-[48px] flex items-center justify-center rounded-[6px] text-text-medium hover:text-destructive hover:bg-canvas dark:hover:bg-surface-high transition-colors cursor-pointer"
            >
              <LogOut className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      <PurchaseSubscriptionModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
      />
    </aside>
  );
}
