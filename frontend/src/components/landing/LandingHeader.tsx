import * as React from 'react';
import { Link } from 'react-router-dom';
import { Store, ArrowRight, Menu, X, Sun, Moon } from 'lucide-react';
import { landingContent } from '../../content/landingContent';
import { useTheme } from '../../context/ThemeContext';

import { useAuth } from '../../context/AuthContext';

export function LandingHeader() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#')) {
      e.preventDefault();
      const targetId = href.replace('#', '');
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        setMobileMenuOpen(false);
      }
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-surface/95 dark:bg-surface-low/95 backdrop-blur-md border-b border-border transition-all duration-150 shadow-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Platform Glyph */}
        <Link to="/" className="flex items-center gap-3 group select-none">
          <div className="h-9 w-9 rounded-[6px] bg-primary flex items-center justify-center text-primary-foreground shadow-card group-hover:scale-105 transition-transform">
            <Store className="w-5 h-5" strokeWidth={2} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 leading-tight">
              <span className="font-bold text-lg text-text-high tracking-tight">
                {landingContent.brand.name}
              </span>
              <span className="px-1.5 py-0.5 rounded-[4px] text-[10px] font-semibold bg-primary-light/30 text-primary border border-primary/20">
                {landingContent.brand.badge}
              </span>
            </div>
            <span className="text-[10px] font-medium text-text-medium tracking-wider uppercase">
              {landingContent.brand.tagline}
            </span>
          </div>
        </Link>

        {/* Center Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8" role="navigation" aria-label="Landing navigation">
          {landingContent.navigation.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={(e) => handleNavClick(e, item.href)}
              className="text-sm font-medium text-text-medium hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-[4px] px-1 py-0.5"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Action Buttons & Theme Toggle */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="w-10 h-10 rounded-[6px] border border-border bg-surface dark:bg-surface-high flex items-center justify-center text-text-medium hover:text-text-high hover:bg-canvas transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-warning" strokeWidth={2} />
            ) : (
              <Moon className="w-4 h-4 text-text-medium" strokeWidth={2} />
            )}
          </button>

          {user ? (
            <>
              <Link
                to="/dashboard"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-semibold text-text-high hover:bg-canvas border border-border transition-colors"
              >
                <span>🏪</span>
                <span className="truncate max-w-[120px]">{user.name || 'Dashboard'}</span>
              </Link>
              <Link
                to="/dashboard"
                className="hidden sm:inline-flex items-center justify-center h-10 min-h-[40px] px-4 text-xs font-semibold gap-1.5 rounded-[6px] bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active shadow-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
              </Link>
            </>
          ) : (
            <>
              {/* Sign In button */}
              <Link
                to="/login"
                className="hidden sm:inline-flex items-center justify-center px-3.5 py-2 rounded-[6px] text-sm font-medium text-text-medium hover:text-text-high transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Sign In
              </Link>

              {/* Start 5-day trial CTA button */}
              <Link
                to="/login?mode=trial"
                className="hidden sm:inline-flex items-center justify-center h-10 min-h-[40px] px-4 text-xs font-semibold gap-1.5 rounded-[6px] bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active shadow-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span>Start 5-day trial</span>
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
              </Link>
            </>
          )}

          {/* Mobile Menu Hamburger Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-10 h-10 rounded-[6px] border border-border flex items-center justify-center text-text-medium hover:text-text-high hover:bg-canvas transition-colors"
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-surface dark:bg-surface-low px-4 pt-3 pb-6 flex flex-col gap-3 animate-in slide-in-from-top-2">
          <nav className="flex flex-col gap-1.5">
            {landingContent.navigation.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className="px-3 py-2.5 rounded-[6px] text-sm font-semibold text-text-medium hover:text-text-high hover:bg-canvas transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="pt-3 border-t border-border flex flex-col gap-2">
            {user ? (
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full inline-flex items-center justify-center h-11 min-h-[44px] px-4 text-xs font-semibold gap-1.5 rounded-[6px] bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active shadow-card transition-colors"
              >
                <span>Open Dashboard ({user.name || 'My store'})</span>
                <ArrowRight className="w-4 h-4" strokeWidth={2} />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 text-center rounded-[6px] border border-border text-sm font-medium text-text-high hover:bg-canvas transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/login?mode=trial"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full inline-flex items-center justify-center h-11 min-h-[44px] px-4 text-xs font-semibold gap-1.5 rounded-[6px] bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active shadow-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span>Start 5-day trial</span>
                  <ArrowRight className="w-4 h-4" strokeWidth={2} />
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default LandingHeader;
