import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowRight,
  Eye,
  CheckCircle2,
  TrendingUp,
  Wallet,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { landingContent } from '../../content/landingContent';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { HeroForecastChart } from './HeroForecastChart';

export function HeroSection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hero } = landingContent;

  const handleDemoScroll = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const el = document.getElementById('demo');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative pt-12 pb-20 overflow-hidden pattern-grid-light border-b border-border bg-canvas transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Hero Content */}
          <div className="lg:col-span-6 space-y-6 text-left">
            {/* Category Status Chip */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[4px] bg-primary-light/20 border border-primary/25">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <span className="text-xs font-semibold text-primary">
                {hero.chipText}
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[52px] font-extrabold text-text-high leading-[1.14] tracking-tight">
              {hero.headlineStart}
              <span className="text-primary">{hero.headlineHighlight}</span>
            </h1>

            {/* Subheadline */}
            <p className="text-base sm:text-lg text-text-medium max-w-xl leading-relaxed">
              {hero.subheadline}
            </p>

            {/* CTA Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {user ? (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center justify-center h-12 min-h-[48px] px-6 text-sm font-semibold gap-2 rounded-[6px] bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active shadow-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span>Go to {user.name || 'Store'} Dashboard</span>
                  <ArrowRight className="w-4 h-4" strokeWidth={2} />
                </Link>
              ) : (
                <Link
                  to="/login?mode=trial"
                  className="inline-flex items-center justify-center h-12 min-h-[48px] px-6 text-sm font-semibold gap-2 rounded-[6px] bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active shadow-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span>{hero.primaryCta.label}</span>
                  <ArrowRight className="w-4 h-4" strokeWidth={2} />
                </Link>
              )}

              <a
                href="#demo"
                onClick={handleDemoScroll}
                className="inline-flex items-center justify-center gap-2 h-12 min-h-[48px] px-6 rounded-[6px] text-sm font-medium border border-border bg-surface hover:bg-canvas text-text-high transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Eye className="w-4 h-4 text-primary" strokeWidth={2} />
                <span>{hero.secondaryCta.label}</span>
              </a>
            </div>

            {/* Trust Badges */}
            <div className="pt-4 flex flex-wrap items-center gap-y-2 gap-x-6 text-text-medium text-xs font-medium">
              {hero.trustBadges.map((badge) => (
                <div key={badge} className="flex items-center gap-1.5 text-primary">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" strokeWidth={2} />
                  <span className="text-text-medium">{badge}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Hero Live Dashboard Window Preview */}
          <div className="lg:col-span-6" id="demo">
            <div className="relative rounded-[8px] bg-surface border border-border shadow-modal overflow-hidden">
              {/* Window Title Bar */}
              <div className="h-11 px-4 bg-canvas border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-700 inline-block" />
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-700 inline-block" />
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-700 inline-block" />
                  <span className="ml-2 text-xs font-medium text-text-medium">
                    {hero.liveWindow.title}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[11px] font-semibold bg-success-bg text-success border border-success-border">
                    <span className="h-1.5 w-1.5 rounded-full bg-success-solid animate-pulse" />
                    {hero.liveWindow.syncStatus}
                  </span>
                </div>
              </div>

              {/* Terminal Content Area */}
              <div className="p-4 sm:p-5 space-y-4 bg-canvas/30">
                {/* 3 KPI Cards */}
                <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                  {/* KPI 1 */}
                  <div className="bg-surface border border-border rounded-[6px] p-3 space-y-1 shadow-card">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] sm:text-[11px] text-text-medium uppercase tracking-wider font-semibold truncate">
                        30-Day Sales
                      </span>
                      <TrendingUp className="w-3.5 h-3.5 text-primary shrink-0" strokeWidth={2} />
                    </div>
                    <div className="text-base sm:text-lg font-bold text-text-high tracking-tight tabular-nums">
                      ₹14,22,219
                    </div>
                    <div className="text-[10px] sm:text-[11px] font-semibold text-success tabular-nums">
                      +12.4% MoM
                    </div>
                  </div>

                  {/* KPI 2 */}
                  <div className="bg-surface border border-border rounded-[6px] p-3 space-y-1 shadow-card">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] sm:text-[11px] text-text-medium uppercase tracking-wider font-semibold truncate">
                        Net Profit
                      </span>
                      <Wallet className="w-3.5 h-3.5 text-secondary shrink-0" strokeWidth={2} />
                    </div>
                    <div className="text-base sm:text-lg font-bold text-text-high tracking-tight tabular-nums">
                      ₹2,14,630
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-text-medium truncate">
                      15.1% Real Margin
                    </div>
                  </div>

                  {/* KPI 3 */}
                  <div className="bg-surface border border-border rounded-[6px] p-3 space-y-1 shadow-card">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] sm:text-[11px] text-text-medium uppercase tracking-wider font-semibold truncate">
                        Health Score
                      </span>
                      <ShieldCheck className="w-3.5 h-3.5 text-warning shrink-0" strokeWidth={2} />
                    </div>
                    <div className="text-base sm:text-lg font-bold text-text-high tracking-tight tabular-nums">
                      88<span className="text-xs text-text-medium font-normal">/100</span>
                    </div>
                    <div className="text-[10px] sm:text-[11px] font-medium text-success truncate">
                      Optimal Stock
                    </div>
                  </div>
                </div>

                {/* Live Forecast Recharts Chart Box */}
                <div className="bg-surface border border-border rounded-[6px] p-3.5 sm:p-4 space-y-2 shadow-card">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xs font-semibold text-text-high tracking-wide">
                        {hero.liveWindow.chart.title}
                      </h2>
                      <p className="text-[11px] text-text-medium">
                        {hero.liveWindow.chart.subtitle}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-semibold bg-primary-light/20 text-primary border border-primary/20 shrink-0">
                      {hero.liveWindow.chart.confidence}
                    </span>
                  </div>

                  {/* Real Interactive Chart Component */}
                  <HeroForecastChart />
                </div>

                {/* Critical Reorder Action Alert Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-[6px] bg-warning-bg border border-warning-border gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1 rounded-[4px] bg-warning/15 text-warning shrink-0">
                      <AlertTriangle className="w-4 h-4" strokeWidth={2} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-warning-text truncate">
                        {hero.liveWindow.alertBanner.title}
                      </div>
                      <div className="text-[11px] text-warning truncate">
                        {hero.liveWindow.alertBanner.subtitle}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => navigate('/login')}
                    className="h-8 min-h-[32px] px-3 text-[11px] font-semibold self-end sm:self-auto shrink-0 gap-1"
                  >
                    <span>{hero.liveWindow.alertBanner.buttonLabel}</span>
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
