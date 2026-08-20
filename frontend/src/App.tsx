import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useAuth from './hooks/useAuth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LeadsPage from './pages/LeadsPage';
import OpportunityDetail from './pages/OpportunityDetail';
import MyFollowups from './pages/MyFollowups';
import MySiteVisitsPage from './pages/MySiteVisitsPage';
import KanbanBoard from './features/pipeline/KanbanBoard';
import UsersPage from './pages/admin/UsersPage';
import ProjectsPage from './pages/admin/ProjectsPage';
import TeamsPage from './pages/admin/TeamsPage';
import ReportsPage from './pages/admin/ReportsPage';
import ImportLeadsPage from './pages/admin/ImportLeads';
import ProfilePage from './pages/ProfilePage';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import MustChangePasswordModal from './components/MustChangePasswordModal';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import { Toaster } from 'sonner';

export default function App() {
  const { user } = useAuth();

  return (
    <>
      <Toaster position="top-right" theme="dark" richColors />
      <MustChangePasswordModal />
      <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leads"
        element={
          <ProtectedRoute>
            <LeadsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leads/:id"
        element={
          <ProtectedRoute>
            <OpportunityDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/followups"
        element={
          <ProtectedRoute>
            <MyFollowups />
          </ProtectedRoute>
        }
      />
      <Route
        path="/site-visits"
        element={
          <ProtectedRoute>
            <MySiteVisitsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pipeline"
        element={
          <ProtectedRoute>
            <KanbanBoard />
          </ProtectedRoute>
        }
      />

      {/* ADMIN EXCLUSIVE ROUTES (Strictly guarded by allowedRoles) */}
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
            <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 font-sans">
              <Navbar />
              <UsersPage />
            </div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/projects"
        element={
          <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
            <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 font-sans">
              <Navbar />
              <ProjectsPage />
            </div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/teams"
        element={
          <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
            <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 font-sans">
              <Navbar />
              <TeamsPage />
            </div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/import"
        element={
          <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
            <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 font-sans">
              <Navbar />
              <ImportLeadsPage />
            </div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
            <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 font-sans">
              <Navbar />
              <ReportsPage />
            </div>
          </ProtectedRoute>
        }
      />

      <Route
        path="/"
        element={<Navigate to={user ? '/dashboard' : '/login'} replace />}
      />
      <Route
        path="*"
        element={<NotFound />}
      />
      </Routes>
    </>
  );
}
