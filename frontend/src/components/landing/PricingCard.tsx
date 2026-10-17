import { Link } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import type { PricingPlan } from '../../content/landingContent';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../ui/utils';

interface PricingCardProps {
  plan: PricingPlan;
}

export function PricingCard({ plan }: PricingCardProps) {
  const { user } = useAuth();
  const targetHref = user ? '/dashboard' : plan.ctaHref || '/login';
  const badgeLabel = plan.badge || (plan.isPopular ? 'Most Popular' : null);

  return (
    <div
      className={cn(
        'p-8 rounded-[8px] bg-surface flex flex-col justify-between space-y-6 shadow-card transition-all duration-200 relative',
        plan.isPopular
          ? 'border-2 border-primary shadow-raised ring-1 ring-primary/20'
          : 'border border-border'
      )}
    >
      {/* Plan Badge */}
      {badgeLabel && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-[4px] bg-primary text-primary-foreground text-[10px] uppercase tracking-wider font-bold shadow-card">
          {badgeLabel}
        </div>
      )}

      <div className="space-y-4">
        {/* Plan Title */}
        <div className="font-bold text-base text-text-high">
          {plan.name}
        </div>

        {/* Pricing Amount */}
        <div className="text-3xl font-extrabold text-text-high tabular-nums">
          <span className={plan.isPopular ? 'text-primary' : undefined}>
            {plan.price}
          </span>
          {plan.period && (
            <span className="text-sm font-normal text-text-medium">
              {plan.period}
            </span>
          )}
        </div>

        {/* Plan Description */}
        <p className="text-sm text-text-medium leading-relaxed">
          {plan.description}
        </p>

        {/* Feature Checklist */}
        <ul className="space-y-3 pt-4 text-xs font-medium border-t border-border">
          {plan.features.map((feature, idx) => {
            const isExcluded =
              typeof feature === 'object'
                ? feature.included === false
                : feature.toLowerCase().startsWith('no ');
            const label = typeof feature === 'object' ? feature.text : feature;

            return (
              <li
                key={idx}
                className={cn(
                  'flex items-center gap-2.5',
                  isExcluded ? 'text-text-muted' : 'text-text-high'
                )}
              >
                {isExcluded ? (
                  <span className="w-4 h-4 rounded-full bg-border/70 text-text-muted flex items-center justify-center shrink-0">
                    <X className="w-3 h-3 text-text-muted" strokeWidth={2.5} />
                  </span>
                ) : (
                  <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-primary" strokeWidth={3} />
                  </span>
                )}
                <span className={cn(isExcluded && 'opacity-75 font-normal')}>
                  {label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
        <Link
          to={targetHref}
          className="flex-1 w-full inline-flex items-center justify-center h-11 min-h-[44px] text-xs font-bold rounded-[6px] bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active shadow-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring select-none"
        >
          {user ? 'Open Dashboard' : 'Subscribe Now'}
        </Link>
        <a
          href="#features"
          className="w-full sm:w-auto px-5 inline-flex items-center justify-center h-11 min-h-[44px] text-xs font-semibold rounded-[6px] border border-border bg-surface hover:bg-canvas text-text-high transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring select-none"
        >
          View Features
        </a>
      </div>
    </div>
  );
}

export default PricingCard;
