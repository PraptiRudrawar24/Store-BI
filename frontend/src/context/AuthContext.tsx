import * as React from 'react';
import { api } from '../api/client';
import type { Shop } from '../api/client';

interface AuthContextType {
  user: Shop | null;
  loading: boolean;
  sendOTP: (phone: string) => Promise<{ dev_mode: boolean; dev_otp: string }>;
  login: (phone: string, otp: string, email?: string) => Promise<{ is_new_user: boolean; onboarding_completed: boolean; shop: Shop }>;
  saveStep: (step: number, data: Record<string, unknown>) => Promise<Shop>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<Shop | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refreshUser = React.useCallback(async () => {
    try {
      const current = await api.getMe();
      setUser(current);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const sendOTP = async (phone: string) => {
    const res = await api.sendOTP(phone);
    return { dev_mode: res.dev_mode, dev_otp: res.dev_otp };
  };

  const login = async (phone: string, otp: string, email?: string) => {
    const res = await api.verifyOTP(phone, otp, email);
    setUser(res.shop);
    return {
      is_new_user: res.is_new_user,
      onboarding_completed: res.onboarding_completed,
      shop: res.shop,
    };
  };

  const saveStep = async (step: number, data: Record<string, unknown>) => {
    const res = await api.saveOnboardingStep(step, data);
    setUser(res.shop);
    return res.shop;
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        sendOTP,
        login,
        saveStep,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
