import * as React from 'react';
import { LandingHeader } from '../components/landing/LandingHeader';
import { HeroSection } from '../components/landing/HeroSection';
import { MetricsStrip } from '../components/landing/MetricsStrip';
import { FeaturesSection } from '../components/landing/FeaturesSection';
import { ComparisonSection } from '../components/landing/ComparisonSection';
import { PricingSection } from '../components/landing/PricingSection';
import { TrialCTA } from '../components/landing/TrialCTA';
import { LandingFooter } from '../components/landing/LandingFooter';
import { landingContent } from '../content/landingContent';

export function LandingPage() {
  React.useEffect(() => {
    document.title = landingContent.meta.title;

    // Set meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', landingContent.meta.description);
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-text-high flex flex-col font-sans selection:bg-primary selection:text-primary-foreground antialiased">
      {/* 1. Sticky Header */}
      <LandingHeader />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {/* 2. Hero Section with Live Window Preview & Interactive Forecast Chart */}
        <HeroSection />

        {/* 3. Metrics Strip */}
        <MetricsStrip />

        {/* 4. Features Bento Grid */}
        <FeaturesSection />

        {/* 5. Spreadsheet Chaos vs Store BI Comparison */}
        <ComparisonSection />

        {/* 6. Transparent Pricing Plans */}
        <PricingSection />

        {/* 7. Instant Cloud Deployment CTA Banner */}
        <TrialCTA />
      </main>

      {/* 8. Footer */}
      <LandingFooter />
    </div>
  );
}

export default LandingPage;
