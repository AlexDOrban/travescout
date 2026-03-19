import React, { createContext, useContext, useState, useEffect } from 'react';
import { getItem } from '../api/storage';
import * as authApi from '../api/auth';

interface User {
  email: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from stored token + email
    Promise.all([getItem('accessToken'), getItem('userEmail')]).then(([token, email]) => {
      if (token && email) setUser({ email });
      setLoading(false);
    });
  }, []);

  async function login(email: string, password: string): Promise<void> {
    await authApi.login(email, password);
    setUser({ email });
  }

  async function register(email: string, password: string): Promise<void> {
    await authApi.register(email, password);
    setUser({ email });
  }

  async function logout(): Promise<void> {
    try {
      const refreshToken = (await getItem('refreshToken')) ?? '';
      await authApi.logout(refreshToken);
    } catch {
      // Server logout is best-effort; always clear local session
    }
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
