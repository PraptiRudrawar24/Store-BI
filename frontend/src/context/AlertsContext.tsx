import * as React from 'react';
import { api, type AlertsResponse } from '../api/client';
import { useAuth } from './AuthContext';

interface AlertsContextType {
  alerts: AlertsResponse | null;
  alertCount: number;
  loading: boolean;
  refreshAlerts: () => Promise<void>;
}

const AlertsContext = React.createContext<AlertsContextType | undefined>(undefined);

export function AlertsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [alerts, setAlerts] = React.useState<AlertsResponse | null>(null);
  const [loading, setLoading] = React.useState(false);

  const refreshAlerts = React.useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await api.getAlerts();
      setAlerts(data);
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    if (user?.onboarding_completed) {
      refreshAlerts();
    }
  }, [user?.onboarding_completed, refreshAlerts]);

  const alertCount = alerts?.total_alerts ?? 0;

  return (
    <AlertsContext.Provider value={{ alerts, alertCount, loading, refreshAlerts }}>
      {children}
    </AlertsContext.Provider>
  );
}

export function useAlerts() {
  const context = React.useContext(AlertsContext);
  if (!context) {
    throw new Error('useAlerts must be used within an AlertsProvider');
  }
  return context;
}
