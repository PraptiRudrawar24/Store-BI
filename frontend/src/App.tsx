import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/ui/Toast';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AlertsProvider } from './context/AlertsContext';
import { Layout } from './components/layout/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { DataUploadPage } from './pages/DataUploadPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { InsightsPage } from './pages/InsightsPage';
import { ProductsPage } from './pages/ProductsPage';
import { SalesPage } from './pages/SalesPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { AdminGuard } from './components/admin/AdminGuard';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage';
import { AdminBusinessesPage } from './pages/admin/AdminBusinessesPage';
import { AdminBusinessDetailPage } from './pages/admin/AdminBusinessDetailPage';
import { AdminPlansPricesPage } from './pages/admin/AdminPlansPricesPage';
import { AdminPlaceholderPage } from './pages/admin/AdminPlaceholderPage';
import { LandingPage } from './pages/LandingPage';
import { PosBillingPage } from './pages/PosBillingPage';
import { SupportPage } from './pages/SupportPage';
import { AdminSupportPage } from './pages/admin/AdminSupportPage';

/**
 * ProtectedLayout: Guards owner app shell routes (/dashboard, /pos, /analytics, etc.)
 * Reason & Use:
 * 1. Checks if auth state is currently loading from server.
 * 2. Unauthenticated visitors are redirected to /login.
 * 3. Merchants who have not yet completed the 4-step onboarding wizard
 *    are redirected to /onboarding so all required store details are captured.
 * 4. Only fully onboarded and authenticated merchants can view the app shell.
 */
function ProtectedLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold text-text-medium mt-3">Loading Store BI...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Layout />;
}

/**
 * OnboardingGuard: Guards the 4-step store onboarding wizard (/onboarding).
 * Reason & Use:
 * 1. Unauthenticated users cannot view onboarding and are redirected to /login.
 * 2. If the user already finished onboarding, skips wizard and navigates straight to /dashboard.
 * 3. Incomplete profiles are shown the OnboardingPage wizard to collect owner and store information.
 */
function OnboardingGuard() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.onboarding_completed) {
    return <Navigate to="/dashboard" replace />;
  }

  return <OnboardingPage />;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <AlertsProvider>
            <BrowserRouter>
              <Routes>
              {/* Public Landing Page */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/landing" element={<LandingPage />} />

              {/* Public Auth */}
              <Route path="/login" element={<LoginPage />} />

              {/* 4-Step Onboarding Wizard */}
              <Route path="/onboarding" element={<OnboardingGuard />} />

              {/* Store BI Admin / Operations Portal at /admin guarded by is_admin role */}
              <Route path="/admin" element={<AdminGuard />}>
                <Route element={<AdminLayout />}>
                  <Route index element={<Navigate to="/admin/overview" replace />} />
                  <Route path="overview" element={<AdminOverviewPage />} />
                  <Route path="businesses" element={<AdminBusinessesPage />} />
                  <Route path="businesses/:id" element={<AdminBusinessDetailPage />} />
                  <Route path="support" element={<AdminSupportPage />} />
                  <Route path="plans" element={<AdminPlansPricesPage />} />
                  <Route path="plans-and-prices" element={<Navigate to="/admin/plans" replace />} />
                  <Route path="payments" element={<AdminPlaceholderPage />} />
                  <Route path="reports" element={<AdminPlaceholderPage />} />
                  <Route path="settings" element={<AdminPlaceholderPage />} />
                </Route>
              </Route>

              {/* Owner App Shell Routes */}
              <Route element={<ProtectedLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/pos" element={<PosBillingPage />} />
                <Route path="/upload" element={<DataUploadPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/insights" element={<InsightsPage />} />
                <Route path="/support" element={<SupportPage />} />
                
                {/* Secondary operational management */}
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/sales" element={<SalesPage />} />
                <Route path="/expenses" element={<ExpensesPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>

              {/* Catch-all redirect to / */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          </AlertsProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

