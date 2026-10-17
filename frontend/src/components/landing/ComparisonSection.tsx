import { XCircle, CheckCircle2, X, Check } from 'lucide-react';
import { landingContent } from '../../content/landingContent';

export function ComparisonSection() {
  const { comparison } = landingContent;

  return (
    <section className="py-16 bg-surface border-t border-b border-border transition-colors">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-[8px] bg-canvas border border-border p-6 sm:p-10 shadow-card space-y-8">
          {/* Header Row with Recovered Profit Callout */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border pb-6">
            <div>
              <span className="text-xs uppercase tracking-widest text-primary font-bold">
                {comparison.eyebrow}
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-text-high mt-1 tracking-tight">
                {comparison.headline}
              </h2>
            </div>
            <div className="text-left md:text-right">
              <div className="text-2xl font-extrabold text-primary tabular-nums">
                {comparison.stat}
              </div>
              <span className="text-xs text-text-medium">
                {comparison.statSub}
              </span>
            </div>
          </div>

          {/* 2-Column Side-by-Side Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {/* Traditional Method: Manual Spreadsheets */}
            <div className="space-y-4 p-5 rounded-[6px] bg-destructive-bg border border-destructive-border">
              <div className="flex items-center gap-2 text-destructive font-bold text-sm">
                <XCircle className="w-5 h-5 shrink-0" strokeWidth={2} />
                <span>{comparison.traditional.title}</span>
              </div>
              <ul className="space-y-3 text-sm text-text-medium">
                {comparison.traditional.points.map((pt, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <X className="w-4 h-4 text-destructive shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* With Store BI Automation */}
            <div className="space-y-4 p-5 rounded-[6px] bg-primary-light/15 border border-primary/25">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-primary" strokeWidth={2} />
                <span>{comparison.storeBi.title}</span>
              </div>
              <ul className="space-y-3 text-sm text-text-high">
                {comparison.storeBi.points.map((pt, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ComparisonSection;
