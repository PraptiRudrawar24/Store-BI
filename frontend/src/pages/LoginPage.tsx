import * as React from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api, type SubscriptionExpiryWarning } from '../api/client';
import {
  ArrowLeft,
  ShieldCheck,
  Sun,
  Moon,
  Sparkles,
  ArrowRight,
  Zap,
  Store,
  CheckCircle2,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
  X,
  Clock,
  AlertTriangle,
} from 'lucide-react';

// Official Google Multi-Color SVG Icon
function GoogleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const { user, loginWithGoogle, loginWithEmail, register, forgotPassword, resendVerification } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Mode: 'signin' (log in to existing store) or 'signup' (create account & start trial)
  const isProMode = searchParams.get('plan') === 'pro' || searchParams.get('mode') === 'pro';
  const modeParam = searchParams.get('mode');
  const isSignUp = modeParam === 'signup' || modeParam === 'trial' || (!modeParam && searchParams.has('trial'));
  const [activeTab, setActiveTab] = React.useState<'signin' | 'signup'>(isSignUp ? 'signup' : 'signin');

  // Loading states
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const [authLoading, setAuthLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = React.useState<string | null>(null);
  const [resendingVerification, setResendingVerification] = React.useState(false);
  const [resendNotice, setResendNotice] = React.useState<string | null>(null);

  // Sign In form state
  const [loginEmail, setLoginEmail] = React.useState('');
  const [loginPassword, setLoginPassword] = React.useState('');
  const [showLoginPassword, setShowLoginPassword] = React.useState(false);
  const [subscriptionNotice, setSubscriptionNotice] = React.useState<SubscriptionExpiryWarning | null>(null);

  // Sign Up form state
  const [signupStoreName, setSignupStoreName] = React.useState('');
  const [signupOwnerName, setSignupOwnerName] = React.useState('');
  const [signupEmail, setSignupEmail] = React.useState('');
  const [signupPassword, setSignupPassword] = React.useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = React.useState('');
  const [showSignupPassword, setShowSignupPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [signupSuccessMsg, setSignupSuccessMsg] = React.useState<string | null>(null);

  // Forgot Password modal state
  const [showForgotModal, setShowForgotModal] = React.useState(false);
  const [forgotEmail, setForgotEmail] = React.useState('');
  const [forgotLoading, setForgotLoading] = React.useState(false);
  const [forgotSuccess, setForgotSuccess] = React.useState(false);

  // Password requirements calculation
  const hasMinLength = signupPassword.length >= 8;
  const hasLetters = /[a-zA-Z]/.test(signupPassword);
  const hasDigits = /[0-9]/.test(signupPassword);
  const passwordsMatch = signupPassword.length > 0 && signupPassword === signupConfirmPassword;

  // Synchronize activeTab with URL params and check for subscription warning query params
  React.useEffect(() => {
    if (modeParam === 'signup' || modeParam === 'trial') {
      setActiveTab('signup');
    } else if (modeParam === 'signin' || modeParam === 'login') {
      setActiveTab('signin');
    }

    const expiredParam = searchParams.get('expired') === 'true' || searchParams.get('state') === 'expired';
    const warningParam = searchParams.get('subscription_warning') === 'true' || searchParams.get('warning') === 'true';
    const daysParam = searchParams.get('days_remaining');

    if (expiredParam) {
      setSubscriptionNotice({
        has_notification: true,
        type: 'subscription',
        days_remaining: 0,
        is_expired: true,
        title: 'Subscription Period Ended',
        message: 'Your Store BI subscription or trial has ended. Please sign in to renew your plan for ₹1,299.',
        plan_name: 'Store BI Plan',
        action_label: 'Renew Subscription (₹1,299)',
      });
    } else if (warningParam || daysParam === '1') {
      setSubscriptionNotice({
        has_notification: true,
        type: 'trial',
        days_remaining: 1,
        is_expired: false,
        title: '⚠️ 1 Day Remaining on Subscription',
        message: 'Your trial or monthly subscription has 1 day remaining! Sign in to renew today and ensure uninterrupted billing and inventory access.',
        plan_name: 'Store BI Plan',
        action_label: 'Renew Subscription (₹1,299)',
      });
    }
  }, [modeParam, searchParams]);

  // Check email subscription status when user finishes typing email
  const checkEmailSubscription = React.useCallback(async (email: string) => {
    const clean = email.trim().toLowerCase();
    if (!clean || !clean.includes('@') || !clean.includes('.')) return;
    try {
      const res = await api.checkSubscriptionAlert(clean);
      if (res.has_warning && res.warning) {
        setSubscriptionNotice(res.warning);
      } else {
        // If query param isn't overriding, clear notice
        if (!searchParams.get('subscription_warning') && !searchParams.get('expired')) {
          setSubscriptionNotice(null);
        }
      }
    } catch {
      // ignore
    }
  }, [searchParams]);

  // If already authenticated, redirect to appropriate destination
  React.useEffect(() => {
    if (user) {
      if (user.is_admin) {
        navigate('/admin', { replace: true });
      } else if (!user.onboarding_completed) {
        navigate('/onboarding', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, navigate]);

  const switchTab = (tab: 'signin' | 'signup') => {
    setActiveTab(tab);
    setErrorMessage(null);
    setUnverifiedEmail(null);
    setResendNotice(null);
    setSignupSuccessMsg(null);
    setSearchParams(tab === 'signup' ? { mode: 'signup' } : { mode: 'signin' });
  };

  /**
   * Triggers the genuine Google OAuth 2.0 PKCE flow.
   */
  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    setErrorMessage(null);
    try {
      await loginWithGoogle();
    } catch (err: unknown) {
      setGoogleLoading(false);
      const msg = err instanceof Error ? err.message : 'Google authentication could not be initiated.';
      setErrorMessage(msg);
      toast.error('Google Sign In Error', msg);
    }
  };

  /**
   * Submits Email/Password login.
   */
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setUnverifiedEmail(null);
    setResendNotice(null);
    setAuthLoading(true);

    try {
      const res = await loginWithEmail({
        email: loginEmail,
        password: loginPassword,
      });

      // Show immediate notification if trial or monthly subscription is about to end (1 day left) or expired
      if (res.subscription_warning?.has_notification) {
        setSubscriptionNotice(res.subscription_warning);
        toast.warning(
          res.subscription_warning.title,
          res.subscription_warning.message
        );
      }

      toast.success('Signed in successfully', `Welcome back, ${res.shop?.owner_name || 'Merchant'}!`);
      if (res.shop?.is_admin) {
        navigate('/admin');
      } else if (res.is_new_user || !res.onboarding_completed) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }

    } catch (err: any) {
      if (err.code === 'EMAIL_NOT_VERIFIED' || err.message?.includes('verify your email')) {
        setUnverifiedEmail(err.email || loginEmail);
        setErrorMessage('Your email address has not been verified yet. Please click the link sent to your inbox.');
      } else {
        setErrorMessage(err.message || 'Invalid email or password.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  /**
   * Submits Email/Password registration.
   */
  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSignupSuccessMsg(null);

    if (signupPassword !== signupConfirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (!hasMinLength || !hasLetters || !hasDigits) {
      setErrorMessage('Password must be at least 8 characters long and contain both letters and numbers.');
      return;
    }

    setAuthLoading(true);

    try {
      const res = await register({
        email: signupEmail,
        password: signupPassword,
        confirm_password: signupConfirmPassword,
        store_name: signupStoreName.trim() || undefined,
        owner_name: signupOwnerName.trim() || undefined,
      });

      if (res.requires_verification) {
        setSignupSuccessMsg(
          `A verification link has been sent to ${signupEmail}. Please click the link in your email to activate your account.`
        );
        toast.success('Account Created', 'Please verify your email address to get started.');
      } else {
        toast.success('Welcome to Store BI', 'Your 5-day free trial is active!');
        if (res.is_new_user || !res.onboarding_completed) {
          navigate('/onboarding');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed. Please check your details.';
      setErrorMessage(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  /**
   * Resends verification email for an unverified account.
   */
  const handleResendVerification = async () => {
    const targetEmail = unverifiedEmail || loginEmail || signupEmail;
    if (!targetEmail) return;

    setResendingVerification(true);
    try {
      await resendVerification(targetEmail);
      setResendNotice(`A fresh verification link has been sent to ${targetEmail}. Please check your spam or inbox folder.`);
      toast.info('Verification Email Sent', 'Check your inbox for the activation link.');
    } catch (err: unknown) {
      setResendNotice('If an unverified account exists for that email, a verification link has been dispatched.');
    } finally {
      setResendingVerification(false);
    }
  };

  /**
   * Submits forgot password request.
   */
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;

    setForgotLoading(true);
    try {
      await forgotPassword(forgotEmail);
      setForgotSuccess(true);
      toast.success('Instructions Sent', 'Check your email for password reset instructions.');
    } catch {
      setForgotSuccess(true);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-between relative overflow-hidden transition-colors duration-200">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[850px] h-[450px] bg-gradient-to-b from-primary/10 via-primary/5 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top Navigation Bar */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-text-medium hover:text-text-high transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to Store BI</span>
        </Link>

        <div className="flex items-center gap-3">
          <Badge variant="neutral" className="text-[11px] gap-1.5 py-1 px-2.5 hidden sm:inline-flex border border-border/80">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Bank-Grade Encryption</span>
          </Badge>

          <button
            type="button"
            onClick={toggleTheme}
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-medium hover:text-text-high hover:bg-canvas transition-colors"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 z-10">
        <div className="w-full max-w-md">
          {/* Header Branding */}
          <div className="text-center mb-6">
            <Link to="/" className="inline-flex items-center gap-2.5 mb-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-primary-hover flex items-center justify-center text-white font-bold shadow-md shadow-primary/20">
                <Store className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-text-high">Store BI</span>
            </Link>

            <h1 className="text-2xl font-bold tracking-tight text-text-high mb-1.5">
              {activeTab === 'signup' ? 'Start Your 5-Day Free Trial' : 'Sign in to Your Store'}
            </h1>
            <p className="text-xs text-text-medium max-w-sm mx-auto">
              {activeTab === 'signup'
                ? 'No credit card required. Full analytics, smart inventory, and AI forecasting.'
                : 'Access your inventory intelligence, real-time sales, and operational analytics.'}
            </p>
          </div>

          {/* Auth Card */}
          <Card className="border border-border/80 shadow-card bg-surface backdrop-blur-sm overflow-hidden">
            {/* Tab Navigation */}
            <div className="grid grid-cols-2 border-b border-border p-1 bg-canvas/40">
              <button
                type="button"
                onClick={() => switchTab('signin')}
                className={`py-2 text-xs font-semibold rounded-md transition-all ${
                  activeTab === 'signin'
                    ? 'bg-surface text-text-high shadow-xs'
                    : 'text-text-medium hover:text-text-high'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchTab('signup')}
                className={`py-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'signup'
                    ? 'bg-surface text-text-high shadow-xs'
                    : 'text-text-medium hover:text-text-high'
                }`}
              >
                <span>Create Store</span>
                <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.2 rounded-full">
                  Free
                </span>
              </button>
            </div>

            <CardContent className="p-6">
              {isProMode && (
                <div className="mb-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-[6px] bg-primary/10 border border-primary/25 text-primary text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>All-Features Pro Plan • ₹1,299 / month</span>
                </div>
              )}
              {/* Primary Google OAuth Button */}
              <div className="mb-5">
                <Button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={googleLoading || authLoading}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-border/90 bg-surface hover:bg-canvas text-text-high font-semibold text-xs transition-all shadow-xs hover:border-primary/50 relative overflow-hidden group"
                >
                  {googleLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span>Connecting to Google...</span>
                    </>
                  ) : (
                    <>
                      <GoogleIcon className="w-5 h-5 shrink-0" />
                      <span>Continue with Google</span>
                    </>
                  )}
                </Button>
                <div className="flex items-center justify-center gap-1.5 mt-2 text-[11px] text-text-low">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Official OAuth 2.0 with PKCE security verification</span>
                </div>
              </div>

              {/* Elegant Divider */}
              <div className="relative my-5 flex items-center">
                <div className="flex-grow border-t border-border/80" />
                <span className="flex-shrink mx-3 text-[11px] uppercase tracking-wider font-semibold text-text-low">
                  or continue with email
                </span>
                <div className="flex-grow border-t border-border/80" />
              </div>

              {/* Error Message Alert */}
              {errorMessage && (
                <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p>{errorMessage}</p>
                    {unverifiedEmail && (
                      <div className="mt-2 pt-2 border-t border-rose-500/20">
                        <button
                          type="button"
                          onClick={handleResendVerification}
                          disabled={resendingVerification}
                          className="inline-flex items-center gap-1 font-semibold text-primary hover:underline text-[11px]"
                        >
                          {resendingVerification ? 'Sending link...' : 'Resend verification email now'}
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Resend Notice */}
              {resendNotice && (
                <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{resendNotice}</span>
                </div>
              )}

              {/* Registration Success Banner */}
              {signupSuccessMsg && (
                <div className="mb-5 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs text-left">
                  <div className="flex items-center gap-2 font-bold mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Check your email!</span>
                  </div>
                  <p className="mb-3 leading-relaxed">{signupSuccessMsg}</p>
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendingVerification}
                    className="inline-flex items-center gap-1 font-semibold text-primary hover:underline text-[11px]"
                  >
                    {resendingVerification ? 'Resending...' : 'Didn’t receive it? Resend link'}
                  </button>
                </div>
              )}

              {/* Subscription Expiration Alert Banner on Login Page */}
              {subscriptionNotice && (
                <div
                  role="alert"
                  className={`mb-5 p-3.5 rounded-xl border text-xs flex items-start gap-3 transition-all animate-in fade-in slide-in-from-top-1 ${
                    subscriptionNotice.is_expired
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200'
                      : 'bg-amber-500/12 border-amber-500/30 text-amber-950 dark:text-amber-100'
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                      subscriptionNotice.is_expired
                        ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 animate-pulse'
                        : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 animate-pulse'
                    }`}
                  >
                    {subscriptionNotice.is_expired ? (
                      <AlertCircle className="w-4 h-4" />
                    ) : subscriptionNotice.days_remaining === 1 ? (
                      <Clock className="w-4 h-4" />
                    ) : (
                      <AlertTriangle className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-bold text-xs">
                        {subscriptionNotice.title}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                          subscriptionNotice.is_expired
                            ? 'bg-rose-500 text-white'
                            : 'bg-amber-500/25 text-amber-800 dark:text-amber-200 border border-amber-500/40'
                        }`}
                      >
                        {subscriptionNotice.days_remaining === 1 ? '1 Day Left' : subscriptionNotice.is_expired ? 'Expired' : 'Ending Soon'}
                      </span>
                    </div>
                    <p className="opacity-90 leading-relaxed text-[11px]">
                      {subscriptionNotice.message}
                    </p>
                    <p className="mt-1.5 text-[11px] font-semibold text-primary flex items-center gap-1">
                      <span>Sign in below to renew your plan for ₹1,299 & prevent store disruption.</span>
                    </p>
                  </div>
                </div>
              )}

              {/* SIGN IN TAB */}
              {activeTab === 'signin' && (
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-high mb-1.5">
                      Business Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-text-low absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        onBlur={() => checkEmailSubscription(loginEmail)}
                        placeholder="owner@storename.com"
                        className="w-full pl-9 pr-3 py-2.5 text-xs rounded-lg border border-border bg-input-bg text-text-high placeholder:text-text-low focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-text-high">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setForgotEmail(loginEmail);
                          setShowForgotModal(true);
                          setForgotSuccess(false);
                        }}
                        className="text-[11px] font-medium text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-text-low absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-9 pr-10 py-2.5 text-xs rounded-lg border border-border bg-input-bg text-text-high placeholder:text-text-low focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-low hover:text-text-high"
                      >
                        {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={authLoading || !loginEmail || !loginPassword}
                    className="w-full bg-primary hover:bg-primary-hover text-white text-xs font-semibold py-2.5 rounded-lg shadow-sm mt-2"
                  >
                    {authLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Verifying credentials...
                      </span>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>
              )}

              {/* SIGN UP TAB */}
              {activeTab === 'signup' && (
                <form onSubmit={handleEmailRegister} className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-text-high mb-1">
                        Store Name <span className="text-text-low font-normal">(Optional)</span>
                      </label>
                      <div className="relative">
                        <Store className="w-3.5 h-3.5 text-text-low absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={signupStoreName}
                          onChange={(e) => setSignupStoreName(e.target.value)}
                          placeholder="e.g. Apex Mart"
                          className="w-full pl-8 pr-2.5 py-2 text-xs rounded-lg border border-border bg-input-bg text-text-high placeholder:text-text-low focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-text-high mb-1">
                        Owner Name <span className="text-text-low font-normal">(Optional)</span>
                      </label>
                      <div className="relative">
                        <User className="w-3.5 h-3.5 text-text-low absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={signupOwnerName}
                          onChange={(e) => setSignupOwnerName(e.target.value)}
                          placeholder="e.g. Rahul Sharma"
                          className="w-full pl-8 pr-2.5 py-2 text-xs rounded-lg border border-border bg-input-bg text-text-high placeholder:text-text-low focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-high mb-1">
                      Business Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-text-low absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        placeholder="owner@yourstore.com"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-border bg-input-bg text-text-high placeholder:text-text-low focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-high mb-1">
                      Create Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-text-low absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showSignupPassword ? 'text' : 'password'}
                        required
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-9 pr-10 py-2 text-xs rounded-lg border border-border bg-input-bg text-text-high placeholder:text-text-low focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-low hover:text-text-high"
                      >
                        {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-high mb-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-text-low absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={signupConfirmPassword}
                        onChange={(e) => setSignupConfirmPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-9 pr-10 py-2 text-xs rounded-lg border border-border bg-input-bg text-text-high placeholder:text-text-low focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-low hover:text-text-high"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Password Strength Checklist */}
                  <div className="bg-canvas/50 p-2.5 rounded-lg border border-border/50 text-[11px] space-y-1">
                    <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-500' : 'text-text-low'}`}>
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>At least 8 characters</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasLetters && hasDigits ? 'text-emerald-500' : 'text-text-low'}`}>
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Contains letters and numbers</span>
                    </div>
                    {signupConfirmPassword.length > 0 && (
                      <div className={`flex items-center gap-1.5 ${passwordsMatch ? 'text-emerald-500' : 'text-rose-500'}`}>
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>{passwordsMatch ? 'Passwords match' : 'Passwords do not match yet'}</span>
                      </div>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={authLoading || !signupEmail || !hasMinLength || !hasLetters || !hasDigits || !passwordsMatch}
                    className="w-full bg-primary hover:bg-primary-hover text-white text-xs font-semibold py-2.5 rounded-lg shadow-sm mt-1"
                  >
                    {authLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Creating your store...
                      </span>
                    ) : (
                      'Start 5-Day Free Trial'
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Trial Value Proposition Footer */}
          <div className="mt-6 text-center space-y-2">
            <div className="inline-flex items-center gap-4 text-[11px] text-text-medium">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                5 Days Full Access
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                Zero Setup Fee
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                Isolated Business Data
              </span>
            </div>
            <p className="text-[11px] text-text-low">
              By continuing, you agree to Store BI's Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </main>

      {/* Forgot Password Modal Dialog */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-surface border border-border rounded-xl shadow-xl max-w-sm w-full p-6 relative">
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 text-text-low hover:text-text-high transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-text-high mb-1">Reset Your Password</h3>
            <p className="text-xs text-text-medium mb-4">
              Enter the email address registered with your Store BI account. We will send a secure, 1-hour time-limited reset link.
            </p>

            {forgotSuccess ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-text-high mb-1">Check Your Inbox</h4>
                <p className="text-xs text-text-medium mb-4">
                  If an account exists for <strong className="text-text-high">{forgotEmail}</strong>, instructions to reset your password have been dispatched.
                </p>
                <Button
                  onClick={() => setShowForgotModal(false)}
                  variant="secondary"
                  className="w-full text-xs font-semibold py-2"
                >
                  Close
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text-high mb-1.5">
                    Account Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-text-low absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="owner@yourstore.com"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-border bg-input-bg text-text-high placeholder:text-text-low focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 text-xs py-2"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={forgotLoading || !forgotEmail}
                    className="flex-1 bg-primary hover:bg-primary-hover text-white text-xs font-semibold py-2"
                  >
                    {forgotLoading ? 'Sending Link...' : 'Send Reset Link'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full text-center py-4 text-[11px] text-text-low z-10">
        © {new Date().getFullYear()} Store BI Intelligence Systems. All rights reserved.
      </footer>
    </div>
  );
}
