import React from 'react';
import { Menu, Activity, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  onToggleMobileMenu: () => void;
  title: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileMenu, title }) => {
  const { user } = useAuth();

  return (
    <header className="navbar">
      <button className="mobile-menu-toggle" onClick={onToggleMobileMenu} aria-label="Toggle Menu">
        <Menu size={24} />
      </button>

      <div className="navbar-logo-mobile">
        <Activity size={24} className="brand-icon" />
        <span className="brand-text">DentAI</span>
      </div>

      <h1 className="navbar-title">{title}</h1>

      <div className="navbar-actions">
        {user && (
          <div className="navbar-user">
            <span className="user-greeting">Welcome, <strong>{user.full_name.split(' ')[0]}</strong></span>
            <div className="user-avatar-badge">
              <UserIcon size={16} />
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
