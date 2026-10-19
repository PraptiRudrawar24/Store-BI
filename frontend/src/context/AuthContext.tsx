/**
 * ==============================================================================
 * STORE BI - PRODUCTION AUTHENTICATION CONTEXT PROVIDER (AuthContext.tsx)
 * ==============================================================================
 * Centralizes the merchant authentication lifecycle across Store BI:
 * 1. Session verification & state hydration via GET /auth/me
 * 2. Real Google OAuth 2.0 PKCE redirect flow & token handling
 * 3. Real Email & Password Registration with Password confirmation & bcrypt validation
 * 4. Email verification enforcement & resend capability
 * 5. Secure time-limited Password Reset & Recovery
 * 6. Stepwise onboarding progression (saveStep 1 -> 4)
 * 7. Secure session invalidation and httpOnly cookie clearance (logout)
 * ==============================================================================
 */

import * as React from 'react';
import { api } from '../api/client';
import type { Shop, AuthResponse } from '../api/client';

interface AuthContextType {
  user: Shop | null;
  loading: boolean;
  loginWithGoogle: (payload?: {
    credential?: string;
    email?: string;
    name?: string;
    picture?: string;
    google_id?: string;
    mode?: 'login' | 'signup';
  }) => Promise<{ is_new_user: boolean; onboarding_completed: boolean; shop: Shop } | void>;
  triggerGoogleRedirect: () => Promise<void>;
  register: (payload: {
    email: string;
    password: string;
    confirm_password: string;
    store_name?: string;
    owner_name?: string;
    phone?: string;
  }) => Promise<AuthResponse>;
  loginWithEmail: (payload: {
    email: string;
    password: string;
  }) => Promise<AuthResponse>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  resetPassword: (payload: {
    token: string;
    new_password: string;
    confirm_password: string;
  }) => Promise<AuthResponse>;
  verifyEmail: (token: string) => Promise<AuthResponse>;
  resendVerification: (email: string) => Promise<{ success: boolean; message: string }>;
  sendOTP: (phone: string) => Promise<{ dev_mode: boolean; dev_otp: string }>;
  login: (phone: string, otp: string, email?: string, store_name?: string, owner_name?: string) => Promise<{ is_new_user: boolean; onboarding_completed: boolean; shop: Shop }>;
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

  /**
   * Real Google OAuth 2.0 PKCE flow - Redirects merchant to Google's official sign-in page.
   */
  const triggerGoogleRedirect = async () => {
    const res = await api.getGoogleAuthUrl();
    if (res?.url) {
      window.location.href = res.url;
    }
  };

  /**
   * Google Identity Services (GIS) token verification or fallback.
   */
  const loginWithGoogle = async (payload?: {
    credential?: string;
    email?: string;
    name?: string;
    picture?: string;
    google_id?: string;
    mode?: 'login' | 'signup';
  }) => {
    if (!payload?.credential && !payload?.email) {
      // Trigger genuine Google OAuth redirect flow
      await triggerGoogleRedirect();
      return;
    }
    const res = await api.loginWithGoogle(payload);
    setUser(res.shop);
    return {
      is_new_user: res.is_new_user,
      onboarding_completed: res.onboarding_completed,
      shop: res.shop,
    };
  };

  /**
   * Registers a new merchant with email, password, and shop credentials.
   */
  const register = async (payload: {
    email: string;
    password: string;
    confirm_password: string;
    store_name?: string;
    owner_name?: string;
    phone?: string;
  }): Promise<AuthResponse> => {
    const res = await api.register(payload);
    if (res.shop) {
      setUser(res.shop);
    }
    return res;
  };

  /**
   * Authenticates an existing merchant with email and password.
   */
  const loginWithEmail = async (payload: {
    email: string;
    password: string;
  }): Promise<AuthResponse> => {
    const res = await api.loginWithEmail(payload);
    if (res.shop) {
      setUser(res.shop);
    }
    return res;
  };

  /**
   * Triggers a secure, time-limited password reset email.
   */
  const forgotPassword = async (email: string) => {
    return await api.forgotPassword(email);
  };

  /**
   * Submits a new password with reset token.
   */
  const resetPassword = async (payload: {
    token: string;
    new_password: string;
    confirm_password: string;
  }): Promise<AuthResponse> => {
    const res = await api.resetPassword(payload);
    if (res.shop) {
      setUser(res.shop);
    }
    return res;
  };

  /**
   * Confirms email address with token from verification email.
   */
  const verifyEmail = async (token: string): Promise<AuthResponse> => {
    const res = await api.verifyEmail(token);
    if (res.shop) {
      setUser(res.shop);
    }
    return res;
  };

  /**
   * Resends verification email for unverified accounts.
   */
  const resendVerification = async (email: string) => {
    return await api.resendVerification(email);
  };

  const sendOTP = async (phone: string) => {
    const res = await api.sendOTP(phone);
    return { dev_mode: res.dev_mode, dev_otp: res.dev_otp };
  };

  const login = async (phone: string, otp: string, email?: string, store_name?: string, owner_name?: string) => {
    const res = await api.verifyOTP(phone, otp, email, store_name, owner_name);
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
    try {
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith('storebi_')) {
          sessionStorage.removeItem(key);
        }
      });
    } catch {
      // ignore
    }
    await api.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginWithGoogle,
        triggerGoogleRedirect,
        register,
        loginWithEmail,
        forgotPassword,
        resetPassword,
        verifyEmail,
        resendVerification,
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
