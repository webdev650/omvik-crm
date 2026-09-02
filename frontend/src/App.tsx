import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useAuth from './hooks/useAuth';
import GlowCursor from './components/GlowCursor';
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
import LeadBatchesPage from './pages/admin/LeadBatchesPage';
import DataQualityPage from './pages/admin/DataQualityPage';
import DuplicateMonitorPage from './pages/admin/DuplicateMonitorPage';
import ProfilePage from './pages/ProfilePage';
import MyPerformance from './pages/MyPerformance';
import CustomersPage from './pages/CustomersPage';
import CustomerDetail from './pages/CustomerDetail';
import DailyReportPage from './pages/DailyReport';
import FlaggedReportsPage from './pages/admin/FlaggedReportsPage';
import AdminEmployeeHistory from './pages/admin/AdminEmployeeHistory';
import LoginActivityPage from './pages/admin/LoginActivityPage';
import LeavePage from './pages/LeavePage';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ForceChangePassword from './pages/ForceChangePassword';
import MustChangePasswordModal from './components/MustChangePasswordModal';
import NudgeMascot from './components/NudgeMascot';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import { Toaster } from 'sonner';

export default function App() {
  const { user } = useAuth();

  return (
    <div className="w-full min-h-screen bg-[#0b0f19] relative">
      <GlowCursor
        color="#15B0F8"
        secondaryColor="#0131B9"
        trailLength={40}
        trailWidth={8}
        trailTaper={0.8}
        followSpeed={0.16}
        glowIntensity={1.9}
        glowSpread={1.2}
        hotspot={0.65}
        brightness={1.25}
        opacity={1}
        pulseSpeed={1.1}
        noiseStrength={0.035}
        idleFade
        idleTimeout={700}
        fadeDuration={900}
        blendMode="screen"
      >
        <Toaster position="top-right" theme="dark" richColors />
        <MustChangePasswordModal />
        <NudgeMascot />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<Navigate to="/login" replace />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/force-change-password"
            element={
              <ProtectedRoute>
                <ForceChangePassword />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers"
            element={
              <ProtectedRoute>
                <CustomersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers/:id"
            element={
              <ProtectedRoute>
                <CustomerDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/performance"
            element={
              <ProtectedRoute>
                <MyPerformance />
              </ProtectedRoute>
            }
          />
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
            path="/admin/data-quality"
            element={
              <ProtectedRoute allowedRoles={['admin', 'super_admin', 'director']}>
                <DataQualityPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/duplicates"
            element={
              <ProtectedRoute allowedRoles={['admin', 'super_admin', 'director']}>
                <DuplicateMonitorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['admin', 'super_admin', 'director', 'team_lead']}>
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/projects"
            element={
              <ProtectedRoute allowedRoles={['admin', 'super_admin', 'director']}>
                <ProjectsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/teams"
            element={
              <ProtectedRoute allowedRoles={['admin', 'super_admin', 'director']}>
                <TeamsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/import"
            element={
              <ProtectedRoute allowedRoles={['admin', 'super_admin', 'director', 'team_lead']}>
                <ImportLeadsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/lead-batches"
            element={
              <ProtectedRoute allowedRoles={['admin', 'super_admin', 'director', 'team_lead']}>
                <LeadBatchesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute allowedRoles={['admin', 'super_admin', 'director', 'team_lead']}>
                <ReportsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/daily-report"
            element={
              <ProtectedRoute>
                <DailyReportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/flagged-reports"
            element={
              <ProtectedRoute allowedRoles={['admin', 'super_admin', 'director']}>
                <FlaggedReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/employee-history"
            element={
              <ProtectedRoute allowedRoles={['admin', 'super_admin', 'director', 'team_lead']}>
                <AdminEmployeeHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/employee-history/:userId"
            element={
              <ProtectedRoute allowedRoles={['admin', 'super_admin', 'director', 'team_lead']}>
                <AdminEmployeeHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/login-activity"
            element={
              <ProtectedRoute allowedRoles={['admin', 'super_admin', 'director', 'team_lead']}>
                <LoginActivityPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leave"
            element={
              <ProtectedRoute>
                <LeavePage />
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
      </GlowCursor>
    </div>
  );
}
