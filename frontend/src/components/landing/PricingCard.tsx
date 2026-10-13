import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import type { PricingPlan } from '../../content/landingContent';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../ui/utils';

interface PricingCardProps {
  plan: PricingPlan;
}

export function PricingCard({ plan }: PricingCardProps) {
  const { user } = useAuth();
  const targetHref = user
    ? '/dashboard'
    : plan.ctaHref === '/login'
    ? '/login?mode=trial'
    : plan.ctaHref;

  return (
    <div
      className={cn(
        'p-8 rounded-[8px] bg-surface flex flex-col justify-between space-y-6 shadow-card transition-all duration-200 relative',
        plan.isPopular
          ? 'border-2 border-primary shadow-raised'
          : 'border border-border'
      )}
    >
      {/* Most Popular Badge */}
      {plan.isPopular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-[4px] bg-primary text-primary-foreground text-[10px] uppercase tracking-wider font-bold shadow-card">
          Most Popular
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
        <ul className="space-y-2.5 pt-4 text-xs font-medium text-text-high border-t border-border">
          {plan.features.map((feature, idx) => (
            <li key={idx} className="flex items-center gap-2.5">
              <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-primary" strokeWidth={3} />
              </span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Action Button */}
      <Link
        to={targetHref}
        className={cn(
          'w-full inline-flex items-center justify-center h-11 min-h-[44px] text-xs font-bold rounded-[6px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring select-none',
          plan.isPopular
            ? 'bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active shadow-card'
            : 'border border-border bg-surface hover:bg-canvas text-text-high'
        )}
      >
        {user ? 'Open Dashboard' : plan.ctaLabel}
      </Link>
    </div>
  );
}

export default PricingCard;
