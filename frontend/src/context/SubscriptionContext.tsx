import * as React from 'react';
import { api, type CustomerSubscriptionStatus } from '../api/client';
import { useAuth } from './AuthContext';

interface SubscriptionContextType {
  status: CustomerSubscriptionStatus | null;
  loading: boolean;
  refreshStatus: () => Promise<void>;
  isPurchaseModalOpen: boolean;
  initialModalStep: 'select' | 'qr_pay';
  openPurchaseModal: (step?: 'select' | 'qr_pay' | any) => void;
  closePurchaseModal: () => void;
}

const SubscriptionContext = React.createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [status, setStatus] = React.useState<CustomerSubscriptionStatus | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = React.useState<boolean>(false);
  const [initialModalStep, setInitialModalStep] = React.useState<'select' | 'qr_pay'>('select');

  const refreshStatus = React.useCallback(async () => {
    if (!user) {
      setStatus(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.getSubscriptionStatus();
      setStatus(res);
    } catch (err) {
      console.error('Failed to fetch subscription status:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    if (user) {
      setLoading(true);
      refreshStatus();
    } else {
      setStatus(null);
      setLoading(false);
    }
  }, [user, refreshStatus]);

  const openPurchaseModal = (step?: 'select' | 'qr_pay' | any) => {
    const validStep = step === 'qr_pay' ? 'qr_pay' : 'select';
    setInitialModalStep(validStep);
    setIsPurchaseModalOpen(true);
  };
  const closePurchaseModal = () => {
    setIsPurchaseModalOpen(false);
    refreshStatus();
  };

  return (
    <SubscriptionContext.Provider
      value={{
        status,
        loading,
        refreshStatus,
        isPurchaseModalOpen,
        initialModalStep,
        openPurchaseModal,
        closePurchaseModal,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextType {
  const context = React.useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
