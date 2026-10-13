import { landingContent } from '../../content/landingContent';
import { cn } from '../ui/utils';

export function MetricsStrip() {
  const { metrics } = landingContent;

  return (
    <section className="py-10 bg-canvas border-b border-border transition-colors" id="metrics">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-y md:divide-y-0 md:divide-x divide-border">
          {metrics.map((item, index) => (
            <div key={item.label} className={cn('pt-4 md:pt-0', index > 0 && 'md:pl-6')}>
              <div
                className={cn(
                  'text-3xl lg:text-4xl font-extrabold tracking-tight tabular-nums',
                  item.highlight ? 'text-primary' : 'text-text-high'
                )}
              >
                {item.value}
              </div>
              <p className="text-xs text-text-medium uppercase tracking-wider mt-1.5 font-semibold">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default MetricsStrip;
