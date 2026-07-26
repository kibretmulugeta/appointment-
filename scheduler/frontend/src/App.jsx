import { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import CreateAppointmentModal from './components/Appointments/CreateAppointmentModal';

import Dashboard from './pages/Dashboard';
import CalendarPage from './pages/CalendarPage';
import AppointmentsPage from './pages/AppointmentsPage';
import AppointmentDetailPage from './pages/AppointmentDetailPage';
import ContactsPage from './pages/ContactsPage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        Loading Scheduler...
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function MainLayout() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const location = useLocation();

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  if (isAuthPage) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white">
        <Navbar onOpenCreateModal={() => setIsModalOpen(true)} />
        <div className="flex-1 flex">
          <Sidebar />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            <Routes>
              <Route path="/" element={<Dashboard onOpenCreateModal={() => setIsModalOpen(true)} />} />
              <Route path="/calendar" element={<CalendarPage onOpenCreateModal={() => setIsModalOpen(true)} />} />
              <Route path="/appointments" element={<AppointmentsPage onOpenCreateModal={() => setIsModalOpen(true)} />} />
              <Route path="/appointments/:id" element={<AppointmentDetailPage />} />
              <Route path="/contacts" element={<ContactsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>

        <CreateAppointmentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            // Trigger refresh if needed
          }}
        />
      </div>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
