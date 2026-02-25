/**
 * App.jsx — Root component with React Router and auth-gated routes.
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import IncomePage from './pages/IncomePage';
import ExpensesPage from './pages/ExpensesPage';
import SavingsPage from './pages/SavingsPage';

// Protect routes that require authentication
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  return user ? children : <Navigate to="/login" replace />;
};

// Redirect authenticated users away from auth pages
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  return user ? <Navigate to="/dashboard" replace /> : children;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
    <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
    <Route
      path="/"
      element={<ProtectedRoute><Layout /></ProtectedRoute>}
    >
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="income" element={<IncomePage />} />
      <Route path="expenses" element={<ExpensesPage />} />
      <Route path="savings" element={<SavingsPage />} />
    </Route>
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
);

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1a1f2e',
              color: '#e8e4d9',
              border: '1px solid rgba(139,168,120,0.3)',
              borderRadius: '12px',
              fontFamily: "'DM Sans', sans-serif",
            },
            success: { iconTheme: { primary: '#8ba878', secondary: '#1a1f2e' } },
            error: { iconTheme: { primary: '#e07a5f', secondary: '#1a1f2e' } },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
