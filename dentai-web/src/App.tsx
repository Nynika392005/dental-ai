import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Chat } from './pages/Chat';
import { Appointments } from './pages/Appointments';
import { SymptomChecker } from './pages/SymptomChecker';
import { Education } from './pages/Education';
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
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Define public paths where sidebar/navbar should be hidden
  const publicPaths = ['/', '/login', '/register'];
  const isPublicPath = publicPaths.includes(location.pathname);

  // Dynamically set navbar header title
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard': return 'Patient Dashboard';
      case '/chat': return 'DentAI Assistant';
      case '/appointments': return 'Dental Appointments';
      case '/symptom-checker': return 'Symptom Diagnostics';
      case '/education': return 'Education Library';
      default: return 'DentAI Portal';
    }
  };

  if (isAuthenticated && !isPublicPath) {
    return (
      <ProtectedRoute>
        <div className="app-container">
          {/* Sidebar */}
          <div className={mobileMenuOpen ? 'sidebar mobile-open' : 'sidebar'}>
            <Sidebar />
          </div>

          {/* Main Content Pane */}
          <div className="main-content">
            <Navbar 
              title={getPageTitle()} 
              onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)} 
            />
            
            {/* Overlay to close sidebar on mobile click */}
            {mobileMenuOpen && (
              <div 
                style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 95 }}
                onClick={() => setMobileMenuOpen(false)}
              />
            )}
            
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/appointments" element={<Appointments />} />
              <Route path="/symptom-checker" element={<SymptomChecker />} />
              <Route path="/education" element={<Education />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Fallback structure for public pages
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
