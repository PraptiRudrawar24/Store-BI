'use client';

import * as React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ReceiptText,
  Package,
  BarChart3,
  Sparkles,
  Headset,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { useSubscription } from '../../context/SubscriptionContext';
import { cn } from '../ui/utils';

export interface SidebarProps {
  onCloseMobile?: () => void;
  isMobile?: boolean;
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
    { to: '/upload', label: 'Inventory Management', icon: Package },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/insights', label: 'AI Insight', icon: Sparkles },
    {
      to: '/support',
      label: 'Support & Feedback',
      icon: Headset,
      badge: unreadSupportCount > 0 ? unreadSupportCount : undefined,
    },
    ...(user?.is_admin
      ? [{ to: '/admin', label: 'Admin Portal', icon: ShieldCheck }]
      : []),
  ];

  const trialDays = user?.trial_days_left ?? 5;
  const isPaid = !!user?.is_paid;
  const subDaysLeft = user?.subscription_days_left_in_month ?? 18;

  return (
    <aside
      className="w-full h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between overflow-y-auto select-none"
      role="navigation"
      aria-label="Main sidebar navigation"
    >
      <div className="flex flex-col flex-1 min-h-0">
        {/* Top Header: Brand Presentation with Logo and Store Name */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200/90 dark:border-slate-800 shrink-0">
          <NavLink
            to="/dashboard"
            onClick={onCloseMobile}
            className="flex items-center gap-3 min-w-0 group"
            title="Store BI Dashboard"
          >
            <img
              src="/logo/store-bi-logo.jpeg"
              alt="Store BI Logo"
              className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs shrink-0 group-hover:opacity-90 transition-opacity"
            />
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-[15px] text-slate-900 dark:text-white leading-tight tracking-tight">
                Store BI
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-tight truncate max-w-[140px]">
                {user?.name || 'Retail store'}
              </span>
            </div>
          </NavLink>

          {isMobile && onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="p-3.5 space-y-1.5 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  cn(
                    'group relative flex items-center gap-3.5 pl-4 pr-3.5 py-3 rounded-xl transition-all duration-150 text-[14.5px] cursor-pointer',
                    isActive
                      ? 'bg-[#005248] text-white shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/90 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white font-medium'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Active Accent Pill on the left inside button */}
                    {isActive && (
                      <span
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 w-1 h-[22px] rounded-full bg-[#2DD4BF] shadow-xs"
                        aria-hidden="true"
                      />
                    )}
                    <Icon
                      className={cn(
                        'w-5 h-5 shrink-0 transition-colors',
                        isActive
                          ? 'text-white'
                          : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                      )}
                      strokeWidth={isActive ? 2.1 : 1.9}
                    />
                    <span className={cn('tracking-tight truncate', isActive ? 'font-bold' : 'font-medium')}>
                      {item.label}
                    </span>
                    {item.badge !== undefined && (
                      <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-red-500 text-white leading-none">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Account Status Card */}
      <div className="p-3.5 border-t border-slate-200/90 dark:border-slate-800 shrink-0">
        <div className="p-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-800/40 flex flex-col gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          {/* Status Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-tight">
                Account status
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white leading-tight mt-0.5 truncate">
                {!isPaid ? 'Full-access trial' : (user?.plan_name || 'Active Pro')}
              </span>
            </div>

            {/* Trial / Active pill badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>
                {!isPaid
                  ? `Trial: ${trialDays} ${trialDays === 1 ? 'day' : 'days'} left`
                  : `${subDaysLeft} ${subDaysLeft === 1 ? 'day' : 'days'} left`}
              </span>
            </div>
          </div>

          {/* Action Button: Purchase / Upgrade */}
          <button
            type="button"
            onClick={() => openPurchaseModal('qr_pay')}
            className="w-full py-2.5 px-3 rounded-xl bg-[#005248] hover:bg-[#00423a] active:bg-[#003630] text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-[0.98]"
            title={!isPaid ? 'Purchase subscription' : 'Manage subscription'}
          >
            <Sparkles className="w-4 h-4 text-emerald-300 shrink-0" strokeWidth={2} />
            <span>{!isPaid ? 'Purchase subscription' : 'Manage / Upgrade plan'}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
