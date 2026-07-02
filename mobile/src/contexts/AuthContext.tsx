import React, { createContext, useContext, useState, useEffect } from 'react';
import { getItem } from '../api/storage';
import { setOnSessionExpired } from '../api/client';
import * as authApi from '../api/auth';
import { clearCheckout } from '../stores/checkoutStore';
import { clearSearchResults } from '../stores/searchStore';

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
    Promise.all([getItem('accessToken'), getItem('userEmail')])
      .then(([token, email]) => {
        if (token && email) setUser({ email });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // When a refresh fails mid-session the tokens are already gone;
    // reflect that in the UI instead of staying "logged in".
    setOnSessionExpired(() => setUser(null));
    return () => setOnSessionExpired(null);
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
    // Don't leak the previous user's searches, passengers, or bookings
    // to the next account on this device.
    clearCheckout();
    clearSearchResults();
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
