import * as React from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const token = searchParams.get('token') || '';
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  // Password validation checks
  const hasMinLength = newPassword.length >= 8;
  const hasLetters = /[a-zA-Z]/.test(newPassword);
  const hasDigits = /[0-9]/.test(newPassword);
  const isMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Password reset token is missing. Please click the full link in your email.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!hasMinLength || !hasLetters || !hasDigits) {
      setError('Password must be at least 8 characters long and contain both letters and numbers.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.resetPassword({
        token,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      setSuccess(true);
      await refreshUser();
      setTimeout(() => {
        if (!response.onboarding_completed) {
          navigate('/onboarding', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reset password. Link may have expired.';
      setError(msg);
    } finally {
      setLoading(false);
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
              Security
            </span>
          </div>
          <p className="text-xs text-text-medium">Create a strong, secure new password for your store</p>
        </div>

        <Card className="border border-border/80 shadow-card bg-surface overflow-hidden">
          <CardContent className="p-8">
            {success ? (
              <div className="py-6 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-base font-semibold text-text-high mb-1">Password Reset Successful!</h3>
                <p className="text-xs text-text-medium max-w-xs mb-3">
                  Your password has been securely updated and your merchant session is authenticated.
                </p>
                <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                  <span>Redirecting to your dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5 animate-pulse" />
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-lg font-bold text-text-high mb-1">Set New Password</h2>
                <p className="text-xs text-text-medium mb-6">
                  Please enter and confirm your new password below.
                </p>

                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-high mb-1.5">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-text-low absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-9 pr-10 py-2.5 text-xs rounded-lg border border-border bg-input-bg text-text-high placeholder:text-text-low focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-low hover:text-text-high"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-high mb-1.5">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-text-low absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-9 pr-10 py-2.5 text-xs rounded-lg border border-border bg-input-bg text-text-high placeholder:text-text-low focus:outline-none focus:ring-1 focus:ring-primary"
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
                  <div className="bg-canvas/50 p-3 rounded-lg border border-border/50 text-[11px] space-y-1.5">
                    <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-500' : 'text-text-low'}`}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>At least 8 characters</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasLetters && hasDigits ? 'text-emerald-500' : 'text-text-low'}`}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Contains both letters and numbers</span>
                    </div>
                    {confirmPassword.length > 0 && (
                      <div className={`flex items-center gap-1.5 ${isMatch ? 'text-emerald-500' : 'text-rose-500'}`}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isMatch ? 'Passwords match' : 'Passwords do not match yet'}</span>
                      </div>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || !hasMinLength || !hasLetters || !hasDigits || !isMatch}
                    className="w-full bg-primary hover:bg-primary-hover text-white text-xs font-semibold py-2.5 rounded-lg shadow-sm"
                  >
                    {loading ? 'Updating Password...' : 'Reset Password & Sign In'}
                  </Button>
                </form>

                <div className="mt-6 pt-4 border-t border-border/60 text-center">
                  <Link
                    to="/login"
                    className="text-xs text-text-medium hover:text-text-high font-medium transition-colors"
                  >
                    Remember your password? Sign In
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
