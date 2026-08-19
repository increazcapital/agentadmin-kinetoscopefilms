/* ============================================================
   Component: App.jsx
   Description: Root app with all routes for Agent Portal
   PRD Section 21: Route Structure
   ============================================================ */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/ui/Toast';
import MainLayout from './components/layout/MainLayout';

// ── Auth Pages ───────────────────────
import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';

// ── Dashboard ───────────────────────
import DashboardHome from './pages/dashboard/DashboardHome';

// ── Profile ───────────────────────
import Profile from './pages/profile/Profile';

// ── Clients ───────────────────────
import MyClients from './pages/clients/MyClients';
import ClientDetail from './pages/clients/ClientDetail';
import AddClient from './pages/clients/AddClient';

// ── Commission ───────────────────────
import CommissionOverview from './pages/commission/CommissionOverview';

// ── Rewards ───────────────────────
import RewardsAndRedemption from './pages/rewards/RewardsAndRedemption';

// ── Grow with KFPL ───────────────────────
import GrowWithKFPL from './pages/grow/GrowWithKFPL';
import GrowDetail from './pages/grow/GrowDetail';

// ── Withdrawal ───────────────────────
import Withdrawal from './pages/withdrawal/Withdrawal';

// ── Service Requests ───────────────────────
import ServiceRequests from './pages/service-requests/ServiceRequests';

// ── Support ───────────────────────
import Support from './pages/support/Support';

// ── Settings ───────────────────────
import Settings from './pages/settings/Settings';

// ── FAQ ───────────────────────
import FAQPage from './pages/faq/FAQPage';

// ── Protected Route Wrapper ───────────────────────
function ProtectedRoute({ children }) {
  const auth = localStorage.getItem('kfpl_agent_auth');
  if (!auth) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected routes inside MainLayout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardHome />} />
            <Route path="profile" element={<Profile />} />
            <Route path="clients" element={<MyClients />} />
            <Route path="clients/add" element={<AddClient />} />
            <Route path="clients/new" element={<AddClient />} />
            <Route path="clients/:id" element={<ClientDetail />} />
            <Route path="commission" element={<CommissionOverview />} />
            <Route path="rewards" element={<RewardsAndRedemption />} />
            <Route path="grow" element={<GrowWithKFPL />} />
            <Route path="grow/:id" element={<GrowDetail />} />
            <Route path="withdrawal" element={<Withdrawal />} />
            <Route path="service-requests" element={<ServiceRequests />} />
            <Route path="support" element={<Support />} />
            <Route path="settings" element={<Settings />} />
            <Route path="faq" element={<FAQPage />} />

            {/* 404 */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}

/* ============ END: App.jsx ============ */
