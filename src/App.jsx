import { Routes, Route, Navigate } from "react-router-dom";

import { AdminAuthProvider, useAdminAuth } from "./context/AdminAuthContext";
import {
  FinanceAuthProvider,
  useFinanceAuth,
} from "./context/FinanceAuthContext";
import {
  SupportAuthProvider,
  useSupportAuth,
} from "./context/SupportAuthContext";
import {
  AdManagerAuthProvider,
  useAdManagerAuth,
} from "./context/AdManagerAuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import PagePermissionGuard from "./components/PagePermissionGuard";

import AdminLoginPage from "./pages/admin/LoginPage";
import AdminDashboard from "./pages/admin/DashboardPage";
import AdminLayout from "./components/layout/AdminLayout";

import SupportLoginPage from "./pages/support/LoginPage";
import SupportLayout from "./components/layout/SupportLayout";
import SupportDashboardPage from "./pages/support/DashboardPage";
import SupportTicketsPage from "./pages/support/TicketsPage";

import FinanceLoginPage from "./pages/finance/LoginPage";
import RechargeManagementPage from "./pages/finance/RechargeManagementPage";
import FinanceLayout from "./components/layout/FinanceLayout";

import AdManagerLoginPage from "./pages/admanager/LoginPage";
import AdManagerLayout from "./components/layout/AdManagerLayout";
import AdManagerDashboardPage from "./pages/admanager/DashboardPage";

import PlaceholderPage from "./pages/PlaceholderPage";

import BusinessesPage from "./pages/admin/BusinessesPage";
import CreatorsPage from "./pages/admin/CreatorsPage";
import CustomersPage from "./pages/admin/CustomersPage";
import CategoriesPage from "./pages/admin/CategoriesPage";
import CirclesPage from "./pages/admin/CirclesPage";
import TrendingEventsPage from "./pages/admin/TrendingEventsPage";
import FinancePage from "./pages/admin/FinancePage";
import SupportUsersPage from "./pages/admin/SupportUsersPage";
import FinanceUsersPage from "./pages/admin/FinanceUsersPage";
import AdManagerUsersPage from "./pages/admin/AdManagerUsersPage";
import ReportsPage from "./pages/admin/ReportsPage";
import AuditLogsPage from "./pages/admin/AuditLogsPage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";

const FINANCE_ROLES = ["FINANCE_ADMIN", "FINANCE_STAFF", "SUPER_ADMIN"];
const SUPPORT_ROLES = ["SUPPORT_LEAD", "SUPPORT_AGENT", "SUPER_ADMIN", "ADMIN"];
const ADMANAGER_ROLES = ["ADMANAGER"];

function RootRedirect() {
  const hostname = window.location.hostname;

  if (hostname === "support.jashanz.com") {
    return <Navigate to="/support/login" replace />;
  }

  if (hostname === "finance.jashanz.com") {
    return <Navigate to="/finance/login" replace />;
  }

  if (hostname === "admanager.jashanz.com") {
    return <Navigate to="/admanager/login" replace />;
  }

  return <Navigate to="/admin/login" replace />;
}

// All 4 portal subdomains (admin/support/finance/admanager) currently share
// the same EC2 Nginx dist/ build (see the repo's DEPLOYMENT.md) — the app
// itself has to decide which portal's login page to land on based on which
// hostname the browser actually loaded, since there's no separate build per
// subdomain to encode that at the server/Nginx level.
function RootRedirect() {
  const hostname = window.location.hostname

  if (hostname === 'support.jashanz.com') {
    return <Navigate to="/support/login" replace />
  }

  if (hostname === 'finance.jashanz.com') {
    return <Navigate to="/finance/login" replace />
  }

  if (hostname === 'admanager.jashanz.com') {
    return <Navigate to="/admanager/login" replace />
  }

  return <Navigate to="/admin/login" replace />
}

function AppRoutes() {
  const { auth: adminAuth } = useAdminAuth();
  const { auth: financeAuth } = useFinanceAuth();
  const { auth: supportAuth } = useSupportAuth();
  const { auth: admanagerAuth } = useAdManagerAuth();

  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />

      {/* ── Admin Portal ── */}
      <Route path="/admin/login" element={<AdminLoginPage />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute
            auth={adminAuth}
            roles={["SUPER_ADMIN", "ADMIN"]}
            redirectTo="/admin/login"
          >
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />

        <Route
          path="dashboard"
          element={
            <PagePermissionGuard pageId="dashboard">
              <AdminDashboard />
            </PagePermissionGuard>
          }
        />

        <Route
          path="businesses"
          element={
            <PagePermissionGuard pageId="businesses">
              <BusinessesPage />
            </PagePermissionGuard>
          }
        />

        <Route
          path="creators"
          element={
            <PagePermissionGuard pageId="creators">
              <CreatorsPage />
            </PagePermissionGuard>
          }
        />

        <Route
          path="customers"
          element={
            <PagePermissionGuard pageId="customers">
              <CustomersPage />
            </PagePermissionGuard>
          }
        />

        <Route
          path="categories"
          element={
            <PagePermissionGuard pageId="categories">
              <CategoriesPage />
            </PagePermissionGuard>
          }
        />

        <Route
          path="circles"
          element={
            <PagePermissionGuard pageId="circles">
              <CirclesPage />
            </PagePermissionGuard>
          }
        />

        <Route
          path="trending-events"
          element={
            <PagePermissionGuard pageId="trendingEvents">
              <TrendingEventsPage />
            </PagePermissionGuard>
          }
        />

        <Route
          path="finance"
          element={
            <PagePermissionGuard pageId="adminFinance">
              <FinancePage />
            </PagePermissionGuard>
          }
        />

        <Route
          path="support-users"
          element={
            <PagePermissionGuard pageId="staff">
              <SupportUsersPage />
            </PagePermissionGuard>
          }
        />

        <Route
          path="finance-users"
          element={
            <PagePermissionGuard pageId="staff">
              <FinanceUsersPage />
            </PagePermissionGuard>
          }
        />

        <Route
          path="admanager-users"
          element={
            <PagePermissionGuard pageId="adManagerAccess">
              <AdManagerUsersPage />
            </PagePermissionGuard>
          }
        />

        <Route
          path="reports"
          element={
            <PagePermissionGuard pageId="reports">
              <ReportsPage />
            </PagePermissionGuard>
          }
        />

        <Route
          path="audit"
          element={
            <PagePermissionGuard pageId="auditLogs">
              <AuditLogsPage />
            </PagePermissionGuard>
          }
        />

        <Route
          path="settings"
          element={
            <PagePermissionGuard pageId="settings">
              <AdminSettingsPage />
            </PagePermissionGuard>
          }
        />
      </Route>

      {/* ── Support Portal ── */}
      <Route path="/support/login" element={<SupportLoginPage />} />

      <Route
        path="/support"
        element={
          <ProtectedRoute
            auth={supportAuth}
            roles={SUPPORT_ROLES}
            redirectTo="/support/login"
          >
            <SupportLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />

        <Route
          path="dashboard"
          element={
            <PagePermissionGuard pageId="supportDashboard">
              <SupportDashboardPage />
            </PagePermissionGuard>
          }
        />

        <Route
          path="approvals"
          element={
            <PagePermissionGuard pageId="supportApprovals">
              <PlaceholderPage title="Vendor Approvals" />
            </PagePermissionGuard>
          }
        />

        <Route
          path="tickets"
          element={
            <PagePermissionGuard pageId="tickets">
              <SupportTicketsPage />
            </PagePermissionGuard>
          }
        />

        <Route
          path="circles"
          element={
            <PagePermissionGuard pageId="supportCircles">
              <PlaceholderPage title="Event Circles" />
            </PagePermissionGuard>
          }
        />
      </Route>

      {/* ── Finance Portal ── */}
      <Route path="/finance/login" element={<FinanceLoginPage />} />

      <Route
        path="/finance"
        element={
          <ProtectedRoute
            auth={financeAuth}
            roles={FINANCE_ROLES}
            redirectTo="/finance/login"
          >
            <FinanceLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />

        <Route
          path="dashboard"
          element={
            <PagePermissionGuard pageId="financeDashboard">
              <PlaceholderPage title="Finance Dashboard" />
            </PagePermissionGuard>
          }
        />

        <Route
          path="bookings"
          element={
            <PagePermissionGuard pageId="financeBookings">
              <PlaceholderPage title="Booking Financials" />
            </PagePermissionGuard>
          }
        />

        <Route
          path="commission"
          element={
            <PagePermissionGuard pageId="financeCommission">
              <PlaceholderPage title="Commission Engine" />
            </PagePermissionGuard>
          }
        />

        <Route
          path="recharge"
          element={
            <PagePermissionGuard pageId="financeRecharge">
              <RechargeManagementPage />
            </PagePermissionGuard>
          }
        />

        <Route
          path="settlements"
          element={
            <PagePermissionGuard pageId="financeSettlements">
              <PlaceholderPage title="Settlement Management" />
            </PagePermissionGuard>
          }
        />

        <Route
          path="refunds"
          element={
            <PagePermissionGuard pageId="financeRefunds">
              <PlaceholderPage title="Refund Management" />
            </PagePermissionGuard>
          }
        />

        <Route
          path="reports"
          element={
            <PagePermissionGuard pageId="financeReports">
              <PlaceholderPage title="Finance Reports" />
            </PagePermissionGuard>
          }
        />
      </Route>

      {/* ── AdManager Portal ── */}
      <Route path="/admanager/login" element={<AdManagerLoginPage />} />

      <Route
        path="/admanager"
        element={
          <ProtectedRoute
            auth={admanagerAuth}
            roles={ADMANAGER_ROLES}
            redirectTo="/admanager/login"
          >
            <AdManagerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />

        <Route path="dashboard" element={<AdManagerDashboardPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AdminAuthProvider>
      <FinanceAuthProvider>
        <SupportAuthProvider>
          <AdManagerAuthProvider>
            <AppRoutes />
          </AdManagerAuthProvider>
        </SupportAuthProvider>
      </FinanceAuthProvider>
    </AdminAuthProvider>
  );
}
