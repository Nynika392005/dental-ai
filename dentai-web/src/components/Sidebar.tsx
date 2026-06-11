import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Calendar, 
  Activity, 
  BookOpen, 
  LogOut, 
  User as UserIcon,
  ShieldAlert
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Activity size={28} className="brand-icon" />
        <span className="brand-text">DentAI</span>
      </div>

      <nav className="sidebar-menu">
        <NavLink 
          to="/dashboard" 
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink 
          to="/chat" 
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <MessageSquare size={20} />
          <span>Chat with AI</span>
        </NavLink>

        <NavLink 
          to="/appointments" 
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <Calendar size={20} />
          <span>Book Visit</span>
        </NavLink>

        <NavLink 
          to="/symptom-checker" 
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <ShieldAlert size={20} />
          <span>Symptom Checker</span>
        </NavLink>

        <NavLink 
          to="/education" 
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <BookOpen size={20} />
          <span>Learn Hub</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-profile">
          <div className="profile-avatar">
            <UserIcon size={18} />
          </div>
          <div className="profile-info">
            <span className="profile-name" title={user.full_name}>{user.full_name}</span>
            <span className="profile-role">{user.role}</span>
          </div>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
