import React, { createContext, useContext, useState, useEffect } from 'react';
import { DARK, LIGHT, ColorPalette } from '../constants/colors';
import { getItem, setItem } from '../api/storage';

interface ThemeContextValue {
  isDark: boolean;
  colors: ColorPalette;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Dark by default per spec; an explicit choice persists across launches.
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    getItem('themePreference')
      .then(stored => {
        if (stored === 'dark' || stored === 'light') setIsDark(stored === 'dark');
      })
      .catch(() => {});
  }, []);

  const colors = isDark ? DARK : LIGHT;
  const toggle = () =>
    setIsDark(v => {
      const next = !v;
      setItem('themePreference', next ? 'dark' : 'light').catch(() => {});
      return next;
    });

  return (
    <ThemeContext.Provider value={{ isDark, colors, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
