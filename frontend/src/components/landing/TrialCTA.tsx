import { Link } from 'react-router-dom';
import { Zap, ArrowRight, Calendar } from 'lucide-react';
import { landingContent } from '../../content/landingContent';
import { useAuth } from '../../context/AuthContext';

export function TrialCTA() {
  const { trial } = landingContent;
  const { user } = useAuth();

  return (
    <section className="py-20 bg-surface border-t border-border relative overflow-hidden transition-colors" id="trial">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 relative z-10">
        {/* Instant Cloud Deployment Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[4px] bg-primary-light/20 border border-primary/25 text-primary text-xs font-semibold">
          <Zap className="w-4 h-4 text-primary" strokeWidth={2.5} />
          <span>{trial.badge}</span>
        </div>

        {/* Main Headline */}
        <h2 className="text-3xl sm:text-5xl font-extrabold text-text-high tracking-tight leading-tight">
          {trial.headline}
        </h2>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-text-medium max-w-2xl mx-auto leading-relaxed">
          {trial.subhead}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          {user ? (
            <Link
              to="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 h-12 min-h-[48px] text-sm font-bold gap-2 rounded-[6px] bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active shadow-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span>Go to {user.name || 'Store'} Dashboard</span>
              <ArrowRight className="w-4 h-4" strokeWidth={2} />
            </Link>
          ) : (
            <Link
              to="/login?mode=trial"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 h-12 min-h-[48px] text-sm font-bold gap-2 rounded-[6px] bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active shadow-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span>{trial.primaryCta}</span>
              <ArrowRight className="w-4 h-4" strokeWidth={2} />
            </Link>
          )}

          <Link
            to="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 h-12 min-h-[48px] text-sm font-medium gap-2 rounded-[6px] border border-border bg-surface hover:bg-canvas text-text-high transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Calendar className="w-4 h-4 text-primary" strokeWidth={2} />
            <span>{trial.secondaryCta}</span>
          </Link>
        </div>

        {/* Guarantees */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-text-medium pt-2">
          {trial.guarantees.map((item, idx) => (
            <div key={idx} className="flex items-center gap-4">
              <span>{item}</span>
              {idx < trial.guarantees.length - 1 && <span>•</span>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default TrialCTA;
