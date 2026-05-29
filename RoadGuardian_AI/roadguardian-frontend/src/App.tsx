import React, { Suspense, lazy, useEffect, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useUiStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { syncOfflineReports } from '@/utils/offlineSync';

import { AppLayout } from '@/components/layout/AppLayout';

const Landing = lazy(() => import('@/pages/Landing').then((module) => ({ default: module.Landing })));
const Login = lazy(() => import('@/pages/Login').then((module) => ({ default: module.Login })));
const Register = lazy(() => import('@/pages/Register').then((module) => ({ default: module.Register })));
const Dashboard = lazy(() => import('@/pages/Dashboard').then((module) => ({ default: module.Dashboard })));
const Profile = lazy(() => import('@/pages/Profile').then((module) => ({ default: module.Profile })));
const Leaderboard = lazy(() => import('@/pages/Leaderboard').then((module) => ({ default: module.Leaderboard })));
const Report = lazy(() => import('@/pages/Report').then((module) => ({ default: module.Report })));
const Heatmap = lazy(() => import('@/pages/Heatmap').then((module) => ({ default: module.Heatmap })));
const AuthorityDashboard = lazy(() => import('@/pages/AuthorityDashboard').then((module) => ({ default: module.AuthorityDashboard })));
const TendersDashboard = lazy(() => import('@/pages/TendersDashboard').then((module) => ({ default: module.TendersDashboard })));
const WhatsAppSimulator = lazy(() => import('@/pages/WhatsAppSimulator').then((module) => ({ default: module.WhatsAppSimulator })));
const WhatsAppMessages = lazy(() => import('@/pages/WhatsAppMessages').then((module) => ({ default: module.WhatsAppMessages })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: 3,
    },
  },
});

const ProtectedRoute = ({ children, requiredRole }: { children: ReactNode; requiredRole?: 'citizen' | 'authority' }) => {
  const { isAuthenticated, isInitialized, user } = useAuthStore();
  
  if (!isInitialized) return <div className="flex h-screen w-full items-center justify-center text-primary animate-pulse font-bold text-xl">Loading Session...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  if (requiredRole && user?.role !== requiredRole) {
    if (requiredRole === 'authority') {
      return <Navigate to="/dashboard" replace />;
    }
  }
  return <>{children}</>;
};

function App() {
  const theme = useUiStore((state) => state.theme);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    window.addEventListener('online', syncOfflineReports);
    return () => window.removeEventListener('online', syncOfflineReports);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-background font-sans antialiased text-foreground">
          <Suspense fallback={<div className="flex h-screen w-full items-center justify-center text-primary animate-pulse font-bold text-xl">Loading application...</div>}>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/report" element={<ProtectedRoute><Report /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
                <Route path="/heatmap" element={<ProtectedRoute><Heatmap /></ProtectedRoute>} />
                <Route path="/authority" element={<ProtectedRoute requiredRole="authority"><AuthorityDashboard /></ProtectedRoute>} />
                <Route path="/tenders" element={<ProtectedRoute requiredRole="authority"><TendersDashboard /></ProtectedRoute>} />
                <Route path="/whatsapp-demo" element={<WhatsAppSimulator />} />
                <Route path="/whatsapp-messages" element={<ProtectedRoute><WhatsAppMessages /></ProtectedRoute>} />
              </Route>
            </Routes>
          </Suspense>
          <Toaster position="top-right" />
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
