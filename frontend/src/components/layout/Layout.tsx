import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BottomNav } from './BottomNav';

export function Layout() {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const location = useLocation();

  // Close mobile drawer automatically upon route changes
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-canvas text-text-high flex">
      {/* Desktop Fixed Vertical Sidebar (width 260px on the left) */}
      <div className="hidden lg:block w-[260px] fixed inset-y-0 left-0 z-40">
        <Sidebar />
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
              className="relative w-[280px] max-w-[85vw] h-full bg-surface shadow-2xl z-10"
              role="dialog"
              aria-modal="true"
              aria-label="Sidebar navigation"
            >
              <Sidebar onCloseMobile={() => setMobileDrawerOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-[260px] flex flex-col min-w-0">
        <Header onOpenMobileMenu={() => setMobileDrawerOpen(true)} />
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
