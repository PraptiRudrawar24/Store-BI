import { landingContent } from '../../content/landingContent';
import { PricingCard } from './PricingCard';

export function PricingSection() {
  const { pricing } = landingContent;

  return (
    <section className="py-20 bg-canvas transition-colors" id="pricing">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-xs uppercase tracking-widest text-primary font-bold">
            {pricing.eyebrow}
          </span>
          <h2 className="text-3xl font-bold text-text-high tracking-tight">
            {pricing.headline}
          </h2>
          <p className="text-sm text-text-medium">
            {pricing.subhead}
          </p>
        </div>

        {/* Single Pricing Plan Card */}
        <div className="max-w-xl mx-auto pt-2">
          {pricing.plans.map((plan) => (
            <PricingCard key={plan.id} plan={plan} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default PricingSection;
