import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, MessageSquare, Calendar, Activity,
  BookOpen, LogOut, User as UserIcon, ShieldAlert,
  ScanSearch, CalendarCheck, Users
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isDentist = user?.role === 'dentist';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  const patientLinks = [
    { to: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/chat', icon: <MessageSquare size={20} />, label: 'Chat with AI' },
    { to: '/appointments', icon: <Calendar size={20} />, label: 'Book Visit' },
    { to: '/symptom-checker', icon: <ShieldAlert size={20} />, label: 'Symptom Checker' },
    { to: '/education', icon: <BookOpen size={20} />, label: 'Learn Hub' },
    { to: '/scan', icon: <ScanSearch size={20} />, label: 'AI Scan' },
  ];

  const dentistLinks = [
    { to: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/appointments', icon: <CalendarCheck size={20} />, label: 'Appointments' },
    { to: '/chat', icon: <MessageSquare size={20} />, label: 'AI Assistant' },
    { to: '/scan', icon: <ScanSearch size={20} />, label: 'AI Scan' },
    { to: '/education', icon: <BookOpen size={20} />, label: 'Learn Hub' },
    { to: '/profile', icon: <Users size={20} />, label: 'My Profile' },
  ];

  const links = isDentist ? dentistLinks : patientLinks;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Activity size={28} className="brand-icon" />
        <span className="brand-text">DentAI</span>
      </div>

      {isDentist && (
        <div style={{ margin: '0 16px 12px', padding: '8px 12px', backgroundColor: '#dbeafe', borderRadius: '10px', fontSize: '11px', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
          Dentist Portal
        </div>
      )}

      <nav className="sidebar-menu">
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            {link.icon}
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <NavLink to="/profile" className={({ isActive }) => `sidebar-profile ${isActive ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
          <div className="profile-avatar">
            <UserIcon size={18} />
          </div>
          <div className="profile-info">
            <span className="profile-name" title={user.full_name}>{user.full_name}</span>
            <span className="profile-role" style={{ textTransform: 'capitalize' }}>{user.role}</span>
          </div>
        </NavLink>
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
