import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  ArrowLeft,
  Smartphone,
  ShieldCheck,
  RefreshCw,
  Sun,
  Moon,
  Sparkles,
  ArrowRight,
  Zap,
} from 'lucide-react';

/**
 * ==============================================================================
 * STORE BI - LOGIN & TRIAL ONBOARDING GATEWAY (LoginPage.tsx)
 * ==============================================================================
 * Purpose & Reason for this code:
 * 1. Serves as the primary entry point when a retail merchant clicks "Start 5-Day Free Trial"
 *    or "Login" from the landing page.
 * 2. Authenticates users using frictionless 10-digit Indian Mobile OTP (SMS verification).
 * 3. Enforces user routing rules:
 *    - New signups or un-onboarded merchants -> Automatically navigated to the 4-step
 *      Store Registration Wizard (/onboarding).
 *    - Existing merchants who have completed onboarding -> Directly navigated to their
 *      Store BI Retail Dashboard (/dashboard).
 * 4. Includes development auto-fill helpers to facilitate seamless rapid testing without
 *    requiring active SMS gateway credentials in local environments.
 * ==============================================================================
 */

export function LoginPage() {
  // Navigation hook to redirect between landing, onboarding, and dashboard
  const navigate = useNavigate();

  // Search parameters parser to detect if user arrived via "mode=trial" button
  const [searchParams] = useSearchParams();

  // UI Toast notification dispatcher for validation feedback and API response alerts
  const toast = useToast();

  // Authentication Context methods: login, sendOTP, and current user profile state
  const { login, sendOTP, user } = useAuth();

  // Theme Context: supports toggling between light and dark modes per user preference
  const { theme, toggleTheme } = useTheme();

  // Determine if this session was launched as a 5-day trial registration flow or Pro plan
  const isProMode = searchParams.get('plan') === 'pro' || searchParams.get('mode') === 'pro';
  const isTrialMode = !isProMode && (searchParams.get('mode') === 'trial' || !searchParams.has('mode'));

  // Local component states:
  // - step: Controls whether user is entering their phone number or typing their 6-digit OTP
  const [step, setStep] = React.useState<'phone' | 'otp'>('phone');
  // - phone: Stores sanitized 10-digit mobile number input
  const [phone, setPhone] = React.useState('');
  // - otp: Stores 6-digit numeric OTP code
  const [otp, setOtp] = React.useState('');
  // - submitting: Prevents duplicate form submissions while awaiting backend API response
  const [submitting, setSubmitting] = React.useState(false);
  // - devOtp: Displays the backend development OTP code (default: 123456) for frictionless testing
  const [devOtp, setDevOtp] = React.useState('123456');

  /**
   * Effect: Session Guard & Auto-Redirect
   * Reason: If the user is already authenticated (active token in localStorage / httpOnly cookie),
   * this immediately routes them to either /dashboard (if onboarded) or /onboarding (to finish profile).
   */
  React.useEffect(() => {
    if (user) {
      if (user.onboarding_completed) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/onboarding', { replace: true });
      }
    }
  }, [user, navigate]);

  /**
   * Helper: Fast Demo Autofill
   * Reason: Allows evaluators and testers to test the entire signup flow with one single click
   * without having to manually type out phone numbers.
   */
  const handleAutofillDemo = () => {
    setPhone('9876543210');
    toast.success('Sample phone number filled: 9876543210');
  };

  /**
   * Handler: Send OTP (Step 1)
   * Reason: Validates that the input is a valid 10-digit Indian phone number, dispatches
   * request to POST /auth/send-otp, captures the mock/dev OTP, and transitions UI to Step 2.
   */
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    setSubmitting(true);
    try {
      const res = await sendOTP(cleanPhone);
      setDevOtp(res.dev_otp || '123456');
      setStep('otp');
      toast.success('OTP sent successfully');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send OTP';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Handler: Verify OTP & Launch Trial (Step 2)
   * Reason: Calls POST /auth/verify-otp with phone and OTP. The backend validates the code,
   * creates the shop record with a 5-day trial period, and returns user status.
   * Based on onboarding_completed, user is directed to /onboarding or /dashboard.
   */
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast.error('Please enter the 6-digit OTP code');
      return;
    }

    setSubmitting(true);
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const res = await login(cleanPhone, otp);

      if (res.onboarding_completed) {
        toast.success(`Signed in successfully as ${res.shop.name || 'your store'}!`);
        navigate('/dashboard', { replace: true });
      } else {
        toast.success('Mobile verified! Please enter your store details to activate your 5-day trial.');
        navigate('/onboarding', { replace: true });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid OTP code';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-4">
      {/* Top Bar with Theme Toggle */}
      <div className="w-full max-w-md flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-medium hover:text-text-high transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Landing</span>
        </button>

        <button
          type="button"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="w-10 h-10 rounded-[6px] border border-border bg-surface flex items-center justify-center text-text-medium hover:text-text-high transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-warning" strokeWidth={2} />
          ) : (
            <Moon className="w-4 h-4 text-text-medium" strokeWidth={2} />
          )}
        </button>
      </div>

      <div className="w-full max-w-md flex flex-col gap-6">
        <Card>
          <CardContent className="p-6 sm:p-8 flex flex-col items-center text-center">
            {/* Store BI Logo */}
            <div className="relative mb-4">
              <img
                src="/logo/store-bi-logo.jpeg"
                alt="Store BI logo"
                className="w-16 h-16 rounded-[8px] object-cover border border-border"
              />
              <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-[4px] bg-primary text-primary-foreground text-[9px] font-bold tracking-wider uppercase">
                PRO
              </span>
            </div>

            {/* Trial or Pro Badge Header */}
            {isTrialMode && (
              <div className="mb-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-[4px] bg-primary-light/20 border border-primary/25 text-primary text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>5-Day Full Access Trial • Zero Card Required</span>
              </div>
            )}
            {isProMode && (
              <div className="mb-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-[4px] bg-primary-light/20 border border-primary/25 text-primary text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>All-Features Pro Plan • ₹1,299 / month</span>
              </div>
            )}

            <h1 className="text-xl font-bold text-text-high">
              {step === 'phone'
                ? isProMode
                  ? 'Get Started with Pro'
                  : isTrialMode
                  ? 'Start Your 5-Day Free Trial'
                  : 'Welcome to Store BI'
                : 'Verify Mobile Number'}
            </h1>
            <p className="text-sm text-text-medium mt-1 mb-6">
              {step === 'phone'
                ? isProMode
                  ? 'Sign in or enter your mobile number to activate your Pro subscription.'
                  : isTrialMode
                  ? 'Enter your mobile number to sign in or begin store registration.'
                  : 'Sign in to access your retail performance & POS dashboard.'
                : `Enter the 6-digit code sent to +91 ${phone}`}
            </p>

            {/* Quick Demo Autofill Notice */}
            {step === 'phone' && (
              <div className="w-full mb-4 p-3 rounded-[8px] bg-canvas border border-border flex flex-col gap-2 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary shrink-0" strokeWidth={2} />
                    <span className="text-xs font-semibold text-text-high">Quick Demo Test</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAutofillDemo}
                    className="text-[11px] font-bold text-primary hover:underline px-2 py-0.5 rounded bg-primary/10"
                  >
                    Autofill Number
                  </button>
                </div>
                <p className="text-[11px] text-text-medium">
                  Testing? Click above or enter any 10-digit number. Any 6-digit OTP is accepted in dev mode.
                </p>
              </div>
            )}

            {/* Development Mode Notice for OTP */}
            {step === 'otp' && (
              <div className="w-full mb-5 p-3 rounded-[8px] bg-canvas border border-border flex items-start justify-between gap-2.5 text-left">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" strokeWidth={2} />
                  <div className="text-xs">
                    <span className="font-semibold text-text-high">Dev mode active: </span>
                    <span className="text-text-medium">
                      Test OTP is{' '}
                      <span className="font-bold text-primary font-mono">{devOtp}</span>.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOtp(devOtp)}
                  className="text-[11px] font-bold text-primary hover:underline px-2 py-0.5 rounded bg-primary/10 shrink-0"
                >
                  Use {devOtp}
                </button>
              </div>
            )}

            {step === 'phone' ? (
              <form onSubmit={handleSendOTP} className="w-full flex flex-col gap-4 text-left">
                <Input
                  label="Mobile number"
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  prefixLabel="+91"
                  required
                  autoFocus
                />

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  disabled={submitting}
                  className="mt-2 min-h-[48px] font-bold gap-2"
                >
                  <Smartphone className="w-4 h-4" strokeWidth={2} />
                  <span>
                    {submitting
                      ? 'Sending OTP...'
                      : isTrialMode
                      ? 'Get OTP & Start Trial'
                      : 'Get OTP'}
                  </span>
                  <ArrowRight className="w-4 h-4" strokeWidth={2} />
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="w-full flex flex-col gap-4 text-left">
                <Input
                  label="6-digit verification code"
                  type="text"
                  inputMode="numeric"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  autoFocus
                />
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  disabled={submitting}
                  className="mt-2 min-h-[48px] font-bold gap-2"
                >
                  <ShieldCheck className="w-4 h-4" strokeWidth={2} />
                  <span>{submitting ? 'Verifying...' : 'Verify & Enter Store Details'}</span>
                  <ArrowRight className="w-4 h-4" strokeWidth={2} />
                </Button>
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setStep('phone')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-medium hover:text-text-high"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} />
                    <span>Change number</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSendOTP}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                  >
                    <RefreshCw className="w-3.5 h-3.5" strokeWidth={2} />
                    <span>Resend OTP</span>
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-2">
          <Badge variant="neutral">5-Day Full Access Trial</Badge>
          <span className="text-xs text-text-medium">• No credit card required</span>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
