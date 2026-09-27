import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, Role } from '../types';
import { getToken, getCachedUser, clearAuth, login as authLogin, saveUser } from '../lib/auth';
import api from '../lib/api';

interface AuthContextValue {
  user: User | null;
  role: Role | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) { setIsLoading(false); return; }
    const cached = getCachedUser();
    if (cached) {
      setUser(cached);
      setIsLoading(false);
      // Re-validate in background
      api.get<User>('/api/users/me').then(u => { setUser(u); saveUser(u); }).catch(() => {});
    } else {
      api.get<User>('/api/users/me')
        .then(u => { setUser(u); saveUser(u); })
        .catch(() => { clearAuth(); })
        .finally(() => setIsLoading(false));
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    const u = await authLogin({ email, password });
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const u = await api.get<User>('/api/users/me');
    setUser(u);
    saveUser(u);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      role: user?.role ?? null,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
