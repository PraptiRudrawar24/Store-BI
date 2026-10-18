import * as React from 'react';
import { RefreshCw, Maximize2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export function AdminConsolePage() {
  const [iframeKey, setIframeKey] = React.useState(0);

  const handleRefresh = () => {
    setIframeKey((prev) => prev + 1);
  };

  const handleOpenStandalone = () => {
    window.open('/admin-portal/', '_blank');
  };

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-100px)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-high">Platform Operations Console</h1>
          <p className="text-xs text-text-medium">
            12-module multi-tenant oversight engine (POS telemetry, AI OCR, billing ledger, health & audit logs)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Reload Console
          </Button>
          <Button variant="primary" onClick={handleOpenStandalone}>
            <Maximize2 className="w-4 h-4 mr-1.5" />
            Open Standalone Window
          </Button>
        </div>
      </div>

      <div className="flex-1 w-full rounded-xl border border-border overflow-hidden bg-surface shadow-sm">
        <iframe
          key={iframeKey}
          src="/admin-portal/"
          title="Store BI Operations Portal"
          className="w-full h-full border-0"
        />
      </div>
    </div>
  );
}
