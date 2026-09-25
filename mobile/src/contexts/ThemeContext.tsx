import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { DARK, LIGHT, ColorPalette } from '../constants/colors';
import { getItem, setItem } from '../api/storage';

export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeContextValue {
  isDark: boolean;
  colors: ColorPalette;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  /** Flips between light and dark, pinning an explicit choice. */
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Follow the OS appearance until the user picks one; the choice persists.
  const scheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    getItem('themePreference')
      .then(stored => {
        if (stored === 'dark' || stored === 'light' || stored === 'system') setModeState(stored);
      })
      .catch(() => {});
  }, []);

  const isDark = mode === 'system' ? scheme === 'dark' : mode === 'dark';
  const colors = isDark ? DARK : LIGHT;

  function setMode(next: ThemeMode) {
    setModeState(next);
    setItem('themePreference', next).catch(() => {});
  }

  const toggle = () => setMode(isDark ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ isDark, colors, mode, setMode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
