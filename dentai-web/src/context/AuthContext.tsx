import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, phone: string, password: string, role?: string, dentistDetails?: Record<string, string>) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Load stored credentials
    const storedToken = localStorage.getItem('dentai_token');
    const storedUser = localStorage.getItem('dentai_user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { access_token } = response.data;
      
      localStorage.setItem('dentai_token', access_token);
      setToken(access_token);

      // Fetch user profile info
      const profileResponse = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      
      const userData = profileResponse.data;
      localStorage.setItem('dentai_user', JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error('Login error', error);
      throw error;
    }
  };

  const register = async (fullName: string, email: string, phone: string, password: string, role = 'patient', dentistDetails?: Record<string, string>) => {
    try {
      await api.post('/auth/register', {
        full_name: fullName,
        email,
        phone,
        password,
        role,
        ...dentistDetails
      });
      // Auto-login after registration
      await login(email, password);
    } catch (error: any) {
      console.error('Registration error', error.response?.data);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('dentai_token');
    localStorage.removeItem('dentai_user');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
