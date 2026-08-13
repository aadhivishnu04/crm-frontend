import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ROLES } from './utils/permissions';

import Login from './pages/Login';
import ResetPassword from './pages/Resetpassword';
import Dashboard from './pages/Dashboard';
import Unauthorized from './pages/Unauthorized';
import Layout from './components/Layout';
import ProtectedRoute from './routes/ProtectedRoute';
import PlaceholderPage from './pages/PlaceholderPage';

// Imported components
import LeadsManager from './pages/LeadsManager';
import EmployeeManagement from './pages/EmployeeManagement';
import SalesDashboard from './pages/SalesDashboard';
import OperationsDashboard from './pages/OperationsDashboard';
import Fulfillment from './pages/Fulfillment';
import Reports from './pages/Reports';
import Campaigns from './pages/Campaigns'; 
import AccountsDashboard from './pages/AccountsDashboard';
// 👇 Add the FinanceDashboard import
import FinanceDashboard from './pages/FinanceDashboard'; 
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error }) {
  return (
    <div role="alert" style={{ padding: '20px', border: '1px solid red', borderRadius: '8px', margin: '20px' }}>
      <h2 style={{ color: 'red' }}>⚠️ Something went wrong in Accounts!</h2>
      <pre style={{ whiteSpace: 'pre-wrap' }}>{error.message}</pre>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        <Route element={<Layout />}>
          {/* Home — every role */}
          <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DIRECTOR, ROLES.SALES, ROLES.OPERATION, ROLES.ACCOUNTS, ROLES.MARKETING]} />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>

          {/* ADMIN + DIRECTOR Routes (Employee, Accounts, Finance) */}
          <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DIRECTOR]} />}>
            <Route path="/employees" element={<EmployeeManagement />} />
          </Route>

          {/* ADMIN + DIRECTOR + ACCOUNTS Routes */}
          <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DIRECTOR, ROLES.ACCOUNTS]} />}>
            <Route 
              path="/accounts" 
              element={
                <ErrorBoundary FallbackComponent={ErrorFallback}>
                  <AccountsDashboard />
                </ErrorBoundary>
              } 
            />
            <Route path="/finance" element={<FinanceDashboard />} />
          </Route>

          {/* ADMIN + DIRECTOR + MARKETING Routes */}
          <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DIRECTOR, ROLES.MARKETING]} />}>
             <Route path="/campaigns" element={<Campaigns />} />
          </Route>

          {/* Common for ALL roles — Leads Manager */}
<Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DIRECTOR, ROLES.SALES, ROLES.OPERATION, ROLES.ACCOUNTS, ROLES.MARKETING]} />}>
  <Route path="/leads" element={<LeadsManager />} />
</Route>

          {/* ADMIN + DIRECTOR + SALES Routes */}
          <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DIRECTOR, ROLES.SALES]} />}>
            <Route path="/sales" element={<SalesDashboard />} />
            <Route path="/jobs" element={<SalesDashboard />} />
            <Route path="/follow-up" element={<PlaceholderPage title="Follow-up" />} />
            <Route path="/move-to-operation" element={<PlaceholderPage title="Move to Operation" />} />
          </Route>

          {/* ADMIN + DIRECTOR + SALES + OPERATION + ACCOUNTS Routes (Reports) */}
          <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DIRECTOR, ROLES.SALES, ROLES.OPERATION, ROLES.ACCOUNTS]} />}>
            <Route path="/reports" element={<Reports />} />
          </Route>

          {/* ADMIN + DIRECTOR + OPERATION Routes */}
          <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DIRECTOR, ROLES.OPERATION]} />}>
            <Route path="/operations" element={<OperationsDashboard />} />
          </Route>

          {/* ADMIN + DIRECTOR + SALES + OPERATION + ACCOUNTS Routes (Fulfillment) */}
          <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DIRECTOR, ROLES.SALES, ROLES.OPERATION, ROLES.ACCOUNTS]} />}>
            <Route path="/fulfillment" element={<Fulfillment />} />
          </Route>
          
          {/* OPERATION ONLY Routes */}
          <Route element={<ProtectedRoute allowedRoles={[ROLES.OPERATION]} />}>
            <Route path="/my-jobs" element={<PlaceholderPage title="My Jobs" />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;