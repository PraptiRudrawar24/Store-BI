import { Store, ShieldCheck, MapPin } from 'lucide-react';
import { landingContent } from '../../content/landingContent';

export function LandingFooter() {
  const { footer, brand } = landingContent;

  return (
    <footer className="bg-surface border-t border-border py-12 text-text-medium transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Column */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-[6px] bg-primary flex items-center justify-center text-primary-foreground">
                <Store className="w-4 h-4" strokeWidth={2} />
              </div>
              <span className="font-bold text-text-high tracking-tight text-base">
                {brand.name} {brand.tagline}
              </span>
            </div>
            <p className="text-xs text-text-medium leading-relaxed">
              {footer.description}
            </p>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="text-xs uppercase text-text-high tracking-wider mb-3 font-bold">
              Platform
            </h4>
            <ul className="space-y-2 text-xs">
              {footer.platformLinks.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className="hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Regional Hubs */}
          <div>
            <h4 className="text-xs uppercase text-text-high tracking-wider mb-3 font-bold">
              Regional Hubs
            </h4>
            <ul className="space-y-2 text-xs">
              {footer.regionalHubs.map((hub, idx) => (
                <li
                  key={idx}
                  className={idx === 0 ? 'text-text-high font-semibold' : 'text-text-medium'}
                >
                  {hub}
                </li>
              ))}
            </ul>
          </div>

          {/* Support & Legal */}
          <div>
            <h4 className="text-xs uppercase text-text-high tracking-wider mb-3 font-bold">
              Support & Legal
            </h4>
            <ul className="space-y-2 text-xs">
              {footer.supportLegal.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className="hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer Bottom Note */}
        <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between text-xs text-text-medium gap-4">
          <div>{footer.copyright}</div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" strokeWidth={2} />
              <span>{footer.sslNote}</span>
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-text-medium" strokeWidth={2} />
              <span>{footer.locationNote}</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default LandingFooter;
