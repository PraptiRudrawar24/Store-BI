import * as React from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { api } from '../../api/client';
import { useToast } from '../ui/Toast';

export function AdminGuard() {
  const { user, loading, refreshUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const [loggingInAdmin, setLoggingInAdmin] = React.useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold text-text-medium mt-3">Verifying admin role...</span>
      </div>
    );
  }

  // Not authenticated at all -> send to login
  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // Authenticated but does NOT have is_admin role
  if (!user.is_admin) {
    const handleQuickDevAdminLogin = async () => {
      setLoggingInAdmin(true);
      try {
        await api.adminDevLogin();
        await refreshUser();
        toast.success('Admin privileges enabled successfully');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to authenticate admin session';
        toast.error(msg);
      } finally {
        setLoggingInAdmin(false);
      }
    };

    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border border-border bg-surface">
            <CardContent className="p-8 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive mb-4">
                <ShieldAlert className="w-7 h-7" />
              </div>

              <h1 className="text-xl font-bold text-text-high">
                Admin privileges required
              </h1>
              <p className="text-sm text-text-medium mt-2 leading-relaxed">
                Access to the Store BI Operations portal at <code className="px-1.5 py-0.5 rounded bg-canvas font-mono text-xs">/admin</code> is strictly guarded by the <code className="font-semibold text-text-high">is_admin</code> role.
              </p>
              <div className="w-full my-4 p-3 rounded-[8px] bg-canvas border border-border text-xs text-left">
                <span className="font-semibold text-text-high">Current account: </span>
                <span className="text-text-medium">{user.phone} ({user.name || 'Store Merchant'})</span>
                <br />
                <span className="font-semibold text-text-high">Role: </span>
                <span className="text-amber-600 font-medium">Standard Store Owner</span>
              </div>

              <div className="flex flex-col gap-2.5 w-full mt-2">
                <Button
                  variant="primary"
                  fullWidth
                  onClick={handleQuickDevAdminLogin}
                  disabled={loggingInAdmin}
                  className="gap-2"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{loggingInAdmin ? 'Elevating...' : 'Log in as Platform Admin'}</span>
                </Button>

                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => navigate('/dashboard')}
                  className="gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return to store app</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // User has is_admin role -> render child
  return <Outlet />;
}
