import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BottomNav } from './BottomNav';

export function Layout() {
  return (
    <div className="min-h-screen bg-canvas text-text-high flex">
      {/* Desktop Fixed Sidebar (width 260px) */}
      <div className="hidden lg:block w-[260px] fixed inset-y-0 left-0 z-40">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-[260px] flex flex-col min-w-0">
        <Header />
        {/* pb-20 on mobile prevents content clipping behind the 4-tab BottomNav */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Tab Bar (360px viewport support) */}
      <BottomNav />
    </div>
  );
}
