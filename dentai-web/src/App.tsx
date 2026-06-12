import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { DentistDashboard } from './pages/DentistDashboard';
import { Chat } from './pages/Chat';
import { Appointments } from './pages/Appointments';
import { DentistAppointments } from './pages/DentistAppointments';
import { SymptomChecker } from './pages/SymptomChecker';
import { Education } from './pages/Education';
import { AIScan } from './pages/AIScan';
import { Profile } from './pages/Profile';
import './App.css';

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <h3>Loading portal credentials...</h3>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Main App Layout Wrapper
const AppLayout: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isDentist = user?.role === 'dentist';

  const publicPaths = ['/', '/login', '/register'];
  const isPublicPath = publicPaths.includes(location.pathname);

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard': return isDentist ? 'Dentist Dashboard' : 'Patient Dashboard';
      case '/chat': return 'DentAI Assistant';
      case '/appointments': return isDentist ? 'Patient Appointments' : 'Dental Appointments';
      case '/symptom-checker': return 'Symptom Diagnostics';
      case '/education': return 'Education Library';
      case '/scan': return 'Smart AI Scan';
      case '/profile': return 'My Profile';
      default: return 'DentAI Portal';
    }
  };

  if (isAuthenticated && !isPublicPath) {
    return (
      <ProtectedRoute>
        <div className="app-container">
          <div className={mobileMenuOpen ? 'sidebar mobile-open' : 'sidebar'}>
            <Sidebar />
          </div>
          <div className="main-content">
            <Navbar title={getPageTitle()} onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)} />
            {mobileMenuOpen && (
              <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 95 }}
                onClick={() => setMobileMenuOpen(false)} />
            )}
            <Routes>
              <Route path="/dashboard" element={isDentist ? <DentistDashboard /> : <Dashboard />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/appointments" element={isDentist ? <DentistAppointments /> : <Appointments />} />
              <Route path="/symptom-checker" element={<SymptomChecker />} />
              <Route path="/education" element={<Education />} />
              <Route path="/scan" element={<AIScan />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppLayout />
      </Router>
    </AuthProvider>
  );
}
