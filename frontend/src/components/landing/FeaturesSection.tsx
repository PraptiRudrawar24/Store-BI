import { landingContent } from '../../content/landingContent';
import { FeatureCard } from './FeatureCard';

export function FeaturesSection() {
  const { features } = landingContent;

  return (
    <section className="py-20 bg-canvas transition-colors" id="features">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">
            {features.eyebrow}
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-text-high tracking-tight">
            {features.headline}
          </h2>
          <p className="text-sm sm:text-base text-text-medium leading-relaxed">
            {features.subhead}
          </p>
        </div>

        {/* Feature Cards Grid (4 Features in 2x2 layout) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto" id="capabilities">
          {features.items.map((feature) => (
            <FeatureCard key={feature.id} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default FeaturesSection;
