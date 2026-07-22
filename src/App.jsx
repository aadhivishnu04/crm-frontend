import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ROLES } from './utils/permissions';

import Login from './pages/Login';
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
import { ErrorBoundary } from 'react-error-boundary';

// 👇 1. Define a Fallback UI to show when AccountsDashboard crashes
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
        {/* Public Route */}
        <Route path="/login" element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Protected Routes wrapped in Layout (Sidebar) */}
        <Route element={<Layout />}>

          {/* Accessible to ALL Logged-in Users (Added MARKETING) */}
          <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SALES, ROLES.OPERATION, ROLES.MARKETING, ROLES.EMPLOYEE]} />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>

          {/* ADMIN ONLY Routes */}
          <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
            <Route path="/employees" element={<EmployeeManagement />} />
            
            {/* 👇 2. Wrapped AccountsDashboard in the ErrorBoundary */}
            <Route 
              path="/accounts" 
              element={
                <ErrorBoundary FallbackComponent={ErrorFallback}>
                  <AccountsDashboard />
                </ErrorBoundary>
              } 
            />
          </Route>

          {/* ADMIN + MARKETING Routes */}
          <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.MARKETING]} />}>
             <Route path="/campaigns" element={<Campaigns />} />
          </Route>

          {/* ADMIN + SALES + MARKETING Routes */}
          <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SALES, ROLES.MARKETING]} />}>
            <Route path="/leads" element={<LeadsManager />} />
          </Route>

          {/* ADMIN + SALES Routes */}
          <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SALES]} />}>
            <Route path="/sales" element={<SalesDashboard />} />
            <Route path="/jobs" element={<SalesDashboard />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/follow-up" element={<PlaceholderPage title="Follow-up" />} />
            <Route path="/move-to-operation" element={<PlaceholderPage title="Move to Operation" />} />
          </Route>

          {/* ADMIN + OPERATION Routes */}
          <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.OPERATION]} />}>
            <Route path="/operations" element={<OperationsDashboard />} />
            <Route path="/fulfillment" element={<Fulfillment />} />
          </Route>

          {/* OPERATION ONLY Routes */}
          <Route element={<ProtectedRoute allowedRoles={[ROLES.OPERATION]} />}>
            <Route path="/my-jobs" element={<PlaceholderPage title="My Jobs" />} />
          </Route>

        </Route>

        {/* Catch-all 404 */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;