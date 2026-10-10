import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Upload, BarChart3, Sparkles } from 'lucide-react';
import { cn } from '../ui/utils';

export function BottomNav() {
  const tabs = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/upload', label: 'Data upload', icon: Upload },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/insights', label: 'AI insight', icon: Sparkles },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border flex items-center justify-around h-16 min-h-[48px] px-2 select-none"
      role="navigation"
      aria-label="Mobile navigation"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center flex-1 h-full min-h-[48px] min-w-[48px] py-1 transition-colors',
                isActive
                  ? 'text-primary font-semibold'
                  : 'text-text-medium hover:text-text-high'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative flex items-center justify-center w-6 h-6">
                  <Icon className="w-5 h-5 shrink-0" strokeWidth={2} />
                  {isActive && (
                    <span className="absolute -top-1 w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </div>
                <span className="text-[11px] leading-tight mt-1 tracking-tight truncate max-w-[80px]">
                  {tab.label}
                </span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
