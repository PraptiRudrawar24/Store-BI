'use client';

import * as React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ReceiptText,
  Package,
  ChartColumnIncreasing,
  Sparkles,
  Headset,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Dock, DockIcon, DockItem, DockLabel } from '@/components/core/dock';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { useSubscription } from '../../context/SubscriptionContext';
import { cn } from '../ui/utils';

export interface SidebarProps {
  onCloseMobile?: () => void;
  isMobile?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export function Sidebar({
  onCloseMobile,
  isMobile = false,
}: SidebarProps) {
  const { user } = useAuth();
  const { openPurchaseModal } = useSubscription();
  const [unreadSupportCount, setUnreadSupportCount] = React.useState(0);

  // Poll for unread customer support count
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
    { to: '/upload', label: 'Inventory', fullTitle: 'Inventory Management', icon: Package },
    { to: '/analytics', label: 'Analytics', fullTitle: 'Analytics & Reports', icon: ChartColumnIncreasing },
    { to: '/insights', label: 'AI Insights', fullTitle: 'AI Retail Insights', icon: Sparkles },
    {
      to: '/support',
      label: 'Support',
      fullTitle: 'Support & Feedback',
      icon: Headset,
      badge: unreadSupportCount > 0 ? unreadSupportCount : undefined,
    },
    ...(user?.is_admin
      ? [{ to: '/admin', label: 'Admin', fullTitle: 'Admin Portal', icon: ShieldCheck }]
      : []),
  ];

  const trialDays = user?.trial_days_left ?? 5;
  const isPaid = !!user?.is_paid;
  const subDaysLeft = user?.subscription_days_left_in_month ?? 18;
  const totalMonthDays = user?.subscription_total_days_in_month ?? 30;

  // ============================================================================
  // MOBILE SLIDING DRAWER LAYOUT
  // ============================================================================
  if (isMobile) {
    return (
      <aside className="w-full h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between overflow-y-auto">
        <div className="flex flex-col flex-1 min-h-0">
          {/* Mobile Header with Close Button */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <img
                src="/logo/store-bi-logo.jpeg"
                alt="Logo"
                className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
              />
            </div>
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#475569] hover:text-[#1E293B] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close navigation"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Navigation Links - Section Names Just Below Icons */}
          <nav className="p-3 flex-1 overflow-y-auto" role="navigation" aria-label="Mobile navigation">
            <div className="grid grid-cols-3 gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onCloseMobile}
                    title={item.fullTitle || item.label}
                    className={({ isActive }) =>
                      cn(
                        'flex flex-col items-center justify-center p-2 rounded-xl text-center transition-colors',
                        isActive
                          ? 'bg-[#00665F]/10 text-[#00665F] font-bold'
                          : 'text-[#475569] hover:bg-slate-100 hover:text-[#00665F]'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div
                          className={cn(
                            'w-11 h-11 rounded-full flex items-center justify-center mb-1 relative',
                            isActive
                              ? 'bg-[#00665F] text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-[#475569] dark:text-slate-300'
                          )}
                        >
                          <Icon className="w-5 h-5 shrink-0" strokeWidth={2} />
                          {item.badge !== undefined && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white animate-pulse" />
                          )}
                        </div>
                        <span className="text-[11px] font-semibold leading-tight text-center truncate max-w-full">
                          {item.label}
                        </span>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </nav>
        </div>

        {/* Mobile Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-xs font-semibold text-[#1E293B] dark:text-slate-100">
            {isPaid ? user?.plan_name || 'Pro Plan' : `Trial (${trialDays}d left)`}
          </span>
          <button
            type="button"
            onClick={() => openPurchaseModal('qr_pay')}
            className="text-xs font-bold text-[#00665F] hover:underline cursor-pointer"
          >
            Upgrade
          </button>
        </div>
      </aside>
    );
  }

  // ============================================================================
  // DESKTOP VERTICAL FLOATING APPLE-STYLE DOCK (NAMES JUST BELOW ICONS)
  // ============================================================================
  return (
    <aside
      className={cn(
        'h-full max-h-[calc(100vh-1.75rem)] flex flex-col justify-between select-none transition-all duration-300 ease-in-out',
        'rounded-[24px] border border-slate-200/90 dark:border-slate-800',
        'bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl',
        'shadow-[0_12px_40px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4)]',
        'overflow-visible z-40',
        'w-[82px] py-3.5 px-1.5 items-center'
      )}
      role="navigation"
      aria-label="Floating dock navigation"
    >
      {/* Top Section: Logo (No text in slide bar section) */}
      <div className="flex flex-col shrink-0 w-full overflow-visible items-center">
        <NavLink
          to="/dashboard"
          title="Dashboard"
          className="flex items-center justify-center w-11 h-11 rounded-full hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#00665F]"
        >
          <img
            src="/logo/store-bi-logo.jpeg"
            alt="Logo"
            className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-xs shrink-0"
          />
        </NavLink>

        {/* Minimalist Apple-style divider */}
        <div className="h-[1px] w-10 bg-slate-200/70 dark:bg-slate-800 my-2" />
      </div>

      {/* Center Section: Vertical Dock Navigation Icons with Section Names Just Below */}
      <div className="flex-1 flex flex-col justify-center min-h-0 py-1 w-full overflow-visible">
        <Dock
          orientation="vertical"
          className="w-full items-center overflow-visible gap-2"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <DockItem
                key={item.to}
                to={item.to}
                aria-label={item.fullTitle || item.label}
              >
                <DockIcon>
                  <div className="relative flex items-center justify-center">
                    <Icon className="w-5 h-5 shrink-0" strokeWidth={2} />
                    {item.badge !== undefined && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white dark:border-slate-900 animate-pulse" />
                    )}
                  </div>
                </DockIcon>
                <DockLabel>{item.label}</DockLabel>
              </DockItem>
            );
          })}
        </Dock>
      </div>

      {/* Bottom Section: Subscription Upgrade */}
      <div className="flex flex-col shrink-0 mt-auto w-full overflow-visible items-center">
        {/* Minimalist Apple-style divider */}
        <div className="h-[1px] w-10 bg-slate-200/70 dark:bg-slate-800 my-2" />

        <Dock
          orientation="vertical"
          className="w-full items-center overflow-visible"
        >
          {/* Subscription / Trial Status Trigger */}
          <DockItem
            onClick={() => openPurchaseModal('qr_pay')}
            aria-label={!isPaid ? `Trial: ${trialDays} days left` : `${user?.plan_name || 'Pro'} active: ${subDaysLeft}/${totalMonthDays}d left`}
          >
            <DockIcon>
              <div className="relative flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[#00665F] dark:text-teal-400 shrink-0" strokeWidth={2} />
                {!isPaid && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500" />
                )}
              </div>
            </DockIcon>
            <DockLabel>
              {!isPaid ? `Trial (${trialDays}d)` : (user?.plan_name || 'Pro')}
            </DockLabel>
          </DockItem>
        </Dock>
      </div>
    </aside>
  );
}

export default Sidebar;
