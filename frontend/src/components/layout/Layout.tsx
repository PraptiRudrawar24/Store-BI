import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { SubscriptionExpiryBanner } from '../subscription/SubscriptionExpiryBanner';
import { cn } from '../ui/utils';

export function Layout() {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const location = useLocation();

  // Dock expansion state (persisted to localStorage)
  const [sidebarExpanded, setSidebarExpanded] = useState<boolean>(() => {
    try {
      return localStorage.getItem('storebi_dock_expanded') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setSidebarExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('storebi_dock_expanded', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Global keyboard shortcut: Command/Ctrl + B to toggle dock expansion
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close mobile drawer automatically upon route changes
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-canvas text-text-high flex">
      {/* Desktop Floating Vertical Apple-Style Dock on the left */}
      <div className="hidden lg:flex fixed inset-y-0 left-0 z-40 p-3 sm:p-3.5 items-center pointer-events-none overflow-visible">
        <div className="pointer-events-auto h-full flex flex-col justify-center overflow-visible">
          <Sidebar
            isExpanded={sidebarExpanded}
            onToggleExpand={toggleSidebar}
          />
        </div>
      </div>

      {/* Mobile / Tablet Collapsible Sidebar Drawer */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileDrawerOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
              aria-hidden="true"
            />

            {/* Sliding Drawer Sidebar */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-[280px] max-w-[85vw] h-full bg-white dark:bg-slate-900 shadow-2xl z-10"
              role="dialog"
              aria-modal="true"
              aria-label="Sidebar navigation"
            >
              <Sidebar
                isMobile
                onCloseMobile={() => setMobileDrawerOpen(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area - dynamically adjusted padding to prevent overlapping dock */}
      <div
        className={cn(
          'flex-1 flex flex-col min-w-0 transition-[padding] duration-300 ease-in-out',
          sidebarExpanded ? 'lg:pl-[262px]' : 'lg:pl-[106px]'
        )}
      >
        <Header onOpenMobileMenu={() => setMobileDrawerOpen(true)} />
        <SubscriptionExpiryBanner />
        {/* pb-24 on mobile prevents content clipping behind the bottom navigation */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Tab Bar (360px viewport support) */}
      <BottomNav />
    </div>
  );
}

export default Layout;
