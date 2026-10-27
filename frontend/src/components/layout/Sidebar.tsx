'use client';

import * as React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ReceiptText,
  Package,
  BarChart3,
  Sparkles,
  Headset,
  ShieldCheck,
  FileUp,
  ArrowLeftRight,
  TrendingUp,
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
  const navigate = useNavigate();
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
    { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { to: '/pos', label: 'POS Billing', icon: ReceiptText },
    { to: '/sales', label: 'Sales', icon: TrendingUp },
    { to: '/upload', label: 'Inventory', icon: Package },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/insights', label: 'Predictions', icon: Sparkles },
    {
      to: '/support',
      label: 'Help & Support',
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

  // Extract initials for the profile avatar
  const initials = React.useMemo(() => {
    const name = user?.owner_name || user?.name || 'Store Director';
    return name
      .split(' ')
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'SD';
  }, [user]);

  return (
    <aside
      className="w-full h-full bg-white dark:bg-slate-900 border-r border-[#E2E8F0] dark:border-slate-800 flex flex-col justify-between overflow-y-auto select-none p-3.5"
      role="navigation"
      aria-label="Main sidebar navigation"
    >
      <div className="flex flex-col flex-1 min-h-0 gap-3">
        {/* Top Brand Presentation with Logo and Division */}
        <div className="flex items-center justify-between px-1 py-1">
          <NavLink
            to="/dashboard"
            onClick={onCloseMobile}
            className="flex items-center gap-3 min-w-0 group"
            title="Store BI"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#136DEC] flex items-center justify-center text-white font-extrabold text-base shadow-sm shrink-0">
              S
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm text-[#0F172A] dark:text-white leading-tight tracking-tight">
                Store BI
              </span>
              <span className="text-[11px] font-medium text-[#64748B] dark:text-slate-400 leading-tight truncate">
                {user?.store_name || user?.name || 'Retail Intelligence'}
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

        {/* Stitch Slogan Pill */}
        <div className="px-0.5">
          <div className="text-[11px] font-medium text-[#475569] dark:text-slate-300 leading-relaxed bg-[#F8FAFC] dark:bg-slate-800/60 px-3 py-2 rounded-xl border border-[#E2E8F0] dark:border-slate-700/60">
            Understanding your business. Predict what comes next.
          </div>
        </div>

        {/* Prominent "+ Upload Invoice" CTA Button */}
        <div className="px-0.5 pt-0.5">
          <button
            type="button"
            onClick={() => {
              navigate('/upload');
              onCloseMobile?.();
            }}
            className="w-full flex items-center justify-center gap-2 text-white h-10 px-4 rounded-xl font-semibold text-xs bg-[#136DEC] hover:bg-[#0E5ACC] transition-all shadow-sm active:scale-[0.99] cursor-pointer"
            title="Upload invoice or receipt"
          >
            <FileUp className="w-4 h-4 text-white" strokeWidth={2.2} />
            <span>+ Upload Invoice</span>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1.5 mt-1 overflow-y-auto pr-0.5 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-colors duration-150 cursor-pointer',
                    isActive
                      ? 'bg-[#EBF3FE] text-[#136DEC] border border-[#136DEC]/20 shadow-xs dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800'
                      : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/60'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={cn(
                        'w-4 h-4 shrink-0 transition-colors',
                        isActive
                          ? 'text-[#136DEC] dark:text-blue-400'
                          : 'text-[#64748B] dark:text-slate-400 group-hover:text-[#0F172A] dark:group-hover:text-white'
                      )}
                      strokeWidth={isActive ? 2.3 : 1.9}
                    />
                    <span className="flex-1 truncate tracking-tight">{item.label}</span>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#136DEC] dark:bg-blue-400 shrink-0" />
                    )}
                    {item.badge !== undefined && (
                      <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[#EF4444] text-white leading-none">
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

      {/* Footer Controls & Profiles */}
      <div className="flex flex-col gap-2 pt-3 border-t border-[#E2E8F0] dark:border-slate-800 shrink-0">
        {/* Branch Switcher Strip */}
        <div className="p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-slate-800/60 border border-[#E2E8F0] dark:border-slate-700/60 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="w-2 h-2 rounded-full bg-[#10B981] shrink-0 ring-2 ring-emerald-100 dark:ring-emerald-900/40" />
            <span className="text-[11px] font-semibold text-[#0F172A] dark:text-slate-200 truncate">
              Store: {user?.store_name || user?.name || 'Main Counter'}
            </span>
          </div>
          <button
            type="button"
            className="w-6 h-6 rounded-lg flex items-center justify-center text-[#64748B] hover:text-[#0F172A] hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title="Switch Branch"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Profile Cluster */}
        <div className="p-2 rounded-xl bg-white dark:bg-slate-800/40 border border-[#E2E8F0] dark:border-slate-700/60 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-[#0F172A] text-white font-bold text-xs flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div className="flex flex-col truncate">
              <span className="text-xs font-bold truncate text-[#0F172A] dark:text-white leading-tight">
                {user?.owner_name || user?.name || 'Store Director'}
              </span>
              <span className="text-[10px] text-[#64748B] dark:text-slate-400 font-medium truncate leading-tight">
                {!isPaid ? `Trial: ${trialDays}d left` : `${user?.plan_name || 'Pro'}: ${subDaysLeft}d left`}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openPurchaseModal('qr_pay')}
            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-[#EBF3FE] text-[#136DEC] hover:bg-[#136DEC] hover:text-white border border-[#136DEC]/20 transition-all cursor-pointer"
            title={!isPaid ? 'Purchase subscription' : 'Manage subscription'}
          >
            {!isPaid ? 'Upgrade' : 'Pro'}
          </button>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;

