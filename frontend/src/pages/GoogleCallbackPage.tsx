import * as React from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

export function GoogleCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [status, setStatus] = React.useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = React.useState<string>('');

  React.useEffect(() => {
    let isMounted = true;

    async function handleCallback() {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (error) {
        if (isMounted) {
          setStatus('error');
          setErrorMessage(errorDescription || `Google authentication was cancelled or rejected (${error}).`);
        }
        return;
      }

      if (!code || !state) {
        if (isMounted) {
          setStatus('error');
          setErrorMessage('Missing required authorization parameters (code or state). Please try logging in again.');
        }
        return;
      }

      try {
        const response = await api.googleCallback({ code, state });
        if (isMounted) {
          setStatus('success');
          await refreshUser();
          // Brief pleasant delay before redirecting
          setTimeout(() => {
            if (response.shop?.is_admin) {
              navigate('/admin', { replace: true });
            } else if (response.is_new_user || !response.onboarding_completed) {
              navigate('/onboarding', { replace: true });
            } else {
              navigate('/dashboard', { replace: true });
            }
          }, 1200);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setStatus('error');
          const message = err instanceof Error ? err.message : 'Google authentication verification failed.';
          setErrorMessage(message);
        }
      }
    }

    handleCallback();

    return () => {
      isMounted = false;
    };
  }, [searchParams, navigate, refreshUser]);

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="text-2xl font-bold tracking-tight text-text-high">Store BI</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              OAuth 2.0
            </span>
          </div>
          <p className="text-xs text-text-medium">Verifying your Google credentials with Store BI</p>
        </div>

        <Card className="border border-border/80 shadow-card bg-surface overflow-hidden">
          <CardContent className="p-8 text-center">
            {status === 'loading' && (
              <div className="py-6 flex flex-col items-center">
                <div className="relative mb-4">
                  <div className="w-14 h-14 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" aria-hidden="true">
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
                  </div>
                </div>
                <h3 className="text-base font-semibold text-text-high mb-1">Authenticating with Google</h3>
                <p className="text-xs text-text-medium max-w-xs">
                  Validating cryptographic state and exchanging OAuth authorization code...
                </p>
              </div>
            )}

            {status === 'success' && (
              <div className="py-6 flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-base font-semibold text-text-high mb-1">Authentication Verified!</h3>
                <p className="text-xs text-text-medium max-w-xs mb-3">
                  Your secure merchant session has been established. Redirecting to your store...
                </p>
                <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                  <span>Taking you to your dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5 animate-pulse" />
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="py-6 flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-base font-semibold text-text-high mb-1">Authentication Error</h3>
                <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20 max-w-sm mb-6 text-left break-words">
                  {errorMessage}
                </p>
                <div className="flex flex-col gap-2 w-full">
                  <Button
                    onClick={() => navigate('/login')}
                    className="w-full bg-primary hover:bg-primary-hover text-white text-xs font-semibold py-2.5 rounded-lg shadow-sm"
                  >
                    Return to Login
                  </Button>
                  <Link
                    to="/"
                    className="text-xs text-text-medium hover:text-text-high font-medium text-center py-1 transition-colors"
                  >
                    Back to Homepage
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
