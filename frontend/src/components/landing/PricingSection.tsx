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

        {/* 3 Pricing Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch pt-2">
          {pricing.plans.map((plan) => (
            <PricingCard key={plan.id} plan={plan} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default PricingSection;
