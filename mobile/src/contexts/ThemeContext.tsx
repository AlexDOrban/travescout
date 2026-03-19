import React, { createContext, useContext, useState } from 'react';
import { DARK, LIGHT, ColorPalette } from '../constants/colors';

interface ThemeContextValue {
  isDark: boolean;
  colors: ColorPalette;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true); // dark by default per spec
  const colors = isDark ? DARK : LIGHT;
  const toggle = () => setIsDark(v => !v);

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
