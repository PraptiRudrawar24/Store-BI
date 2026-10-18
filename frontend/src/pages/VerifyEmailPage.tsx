import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { CheckCircle2, AlertCircle, ArrowRight, Mail, RefreshCw } from 'lucide-react';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const token = searchParams.get('token') || '';
  const [status, setStatus] = React.useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = React.useState('');
  const [resendEmail, setResendEmail] = React.useState('');
  const [resendSuccess, setResendSuccess] = React.useState(false);
  const [resending, setResending] = React.useState(false);

  React.useEffect(() => {
    let isMounted = true;

    async function verify() {
      if (!token) {
        if (isMounted) {
          setStatus('error');
          setMessage('No verification token was provided in the link. Please check your email and click the full link.');
        }
        return;
      }

      try {
        const response = await api.verifyEmail(token);
        if (isMounted) {
          setStatus('success');
          setMessage(response.message || 'Your email address has been successfully verified!');
          await refreshUser();
          setTimeout(() => {
            if (response.is_new_user || !response.onboarding_completed) {
              navigate('/onboarding', { replace: true });
            } else {
              navigate('/dashboard', { replace: true });
            }
          }, 1500);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setStatus('error');
          const errMsg = err instanceof Error ? err.message : 'Invalid or expired email verification link.';
          setMessage(errMsg);
        }
      }
    }

    verify();

    return () => {
      isMounted = false;
    };
  }, [token, navigate, refreshUser]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail) return;
    setResending(true);
    try {
      await api.resendVerification(resendEmail);
      setResendSuccess(true);
    } catch {
      // Intentionally show success to protect user enumeration
      setResendSuccess(true);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="text-2xl font-bold tracking-tight text-text-high">Store BI</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              Account Verification
            </span>
          </div>
          <p className="text-xs text-text-medium">Securing your merchant store identity</p>
        </div>

        <Card className="border border-border/80 shadow-card bg-surface overflow-hidden">
          <CardContent className="p-8 text-center">
            {status === 'verifying' && (
              <div className="py-6 flex flex-col items-center">
                <div className="w-14 h-14 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4" />
                <h3 className="text-base font-semibold text-text-high mb-1">Verifying Email Address</h3>
                <p className="text-xs text-text-medium max-w-xs">
                  Confirming your cryptographic token with Store BI security servers...
                </p>
              </div>
            )}

            {status === 'success' && (
              <div className="py-6 flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-base font-semibold text-text-high mb-1">Email Verified Successfully!</h3>
                <p className="text-xs text-text-medium max-w-xs mb-3">
                  {message} Your account is fully activated.
                </p>
                <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                  <span>Launching your store...</span>
                  <ArrowRight className="w-3.5 h-3.5 animate-pulse" />
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="py-4 flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-base font-semibold text-text-high mb-1">Verification Link Expired or Invalid</h3>
                <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20 max-w-sm mb-6 text-left break-words">
                  {message}
                </p>

                {resendSuccess ? (
                  <div className="w-full p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs mb-4">
                    <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
                    If an unverified account exists for that email, a fresh link has been dispatched to your inbox.
                  </div>
                ) : (
                  <form onSubmit={handleResend} className="w-full space-y-3 mb-6 text-left">
                    <label className="block text-xs font-medium text-text-medium">
                      Enter your email address to receive a fresh verification link:
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-text-low absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={resendEmail}
                        onChange={(e) => setResendEmail(e.target.value)}
                        placeholder="merchant@example.com"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-border bg-input-bg text-text-high placeholder:text-text-low focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={resending || !resendEmail}
                      className="w-full bg-primary hover:bg-primary-hover text-white text-xs font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2"
                    >
                      {resending ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Sending Link...</span>
                        </>
                      ) : (
                        <span>Resend Verification Link</span>
                      )}
                    </Button>
                  </form>
                )}

                <div className="flex flex-col gap-2 w-full pt-2 border-t border-border/60">
                  <Button
                    onClick={() => navigate('/login')}
                    variant="secondary"
                    className="w-full text-xs font-semibold py-2 rounded-lg"
                  >
                    Back to Sign In
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
