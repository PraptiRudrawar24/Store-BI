import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Upload,
  BarChart3,
  Sparkles,
  Store,
  LogOut,
  Settings,
} from 'lucide-react';
import { cn } from '../ui/utils';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  onCloseMobile?: () => void;
}

export function Sidebar({ onCloseMobile }: SidebarProps) {
  const { user, logout } = useAuth();

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/upload', label: 'Data upload', icon: Upload },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/insights', label: 'AI insight', icon: Sparkles },
  ];

  const trialDays = user?.trial_days_left ?? 5;

  return (
    <aside className="w-full h-full bg-surface border-r border-border flex flex-col justify-between">
      <div>
        {/* Brand Header */}
        <div className="h-20 px-4 flex flex-col justify-center border-b border-border">
          <div className="flex items-center gap-3">
            <img
              src="/logo/store-bi-logo.jpeg"
              alt="Store BI logo"
              className="w-8 h-8 rounded-[8px] object-cover border border-border shrink-0"
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

        {/* Navigation Links: Active item is a solid #2563EB pill with white text */}
        <nav className="p-3 flex flex-col gap-1.5" role="navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3.5 h-12 min-h-[48px] rounded-[8px] text-sm font-semibold transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-text-medium hover:text-text-high hover:bg-canvas'
                  )
                }
              >
                <Icon className="w-5 h-5 shrink-0" strokeWidth={2} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer Area: Trial chip near the bottom + Shop info */}
      <div className="p-3 border-t border-border flex flex-col gap-2.5">
        {/* Trial Chip near the bottom */}
        <div className="px-3 py-2.5 rounded-[8px] bg-canvas border border-border flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] text-text-medium font-medium">Account status</span>
            <span className="text-xs font-semibold text-text-high">Full-access trial</span>
          </div>
          <Badge
            variant={trialDays <= 1 ? 'warning' : 'success'}
            dot
            className="text-xs font-semibold"
          >
            Trial: {trialDays} {trialDays === 1 ? 'day' : 'days'} left
          </Badge>
        </div>

        {/* Store Profile & Quick Actions */}
        <div className="px-3 py-2 rounded-[8px] bg-surface border border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-[6px] bg-canvas border border-border flex items-center justify-center shrink-0">
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
              className="w-12 h-12 min-h-[48px] min-w-[48px] flex items-center justify-center rounded-[8px] text-text-medium hover:text-text-high hover:bg-canvas transition-colors"
            >
              <Settings className="w-5 h-5" strokeWidth={2} />
            </NavLink>
            <button
              onClick={logout}
              title="Sign out"
              className="w-12 h-12 min-h-[48px] min-w-[48px] flex items-center justify-center rounded-[8px] text-text-medium hover:text-destructive hover:bg-canvas transition-colors"
            >
              <LogOut className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
