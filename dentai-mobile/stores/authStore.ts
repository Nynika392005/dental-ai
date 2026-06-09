import { create } from 'zustand';

// In-memory storage mock to replace AsyncStorage for UI testing in Expo Go
const mockStorage: Record<string, string> = {};

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  
  login: async (token, user) => {
    mockStorage['access_token'] = token;
    mockStorage['user'] = JSON.stringify(user);
    set({ token, user, isLoading: false });
  },
  
  logout: async () => {
    delete mockStorage['access_token'];
    delete mockStorage['user'];
    set({ token: null, user: null, isLoading: false });
  },
  
  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const token = mockStorage['access_token'];
      const userStr = mockStorage['user'];
      if (token && userStr) {
        set({ token, user: JSON.parse(userStr), isLoading: false });
      } else {
        set({ token: null, user: null, isLoading: false });
      }
    } catch (e) {
      set({ token: null, user: null, isLoading: false });
    }
  }
}));
