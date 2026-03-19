import React from 'react';
import { Stack } from 'expo-router';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { CurrencyProvider } from '../src/contexts/CurrencyContext';
import { AuthProvider } from '../src/contexts/AuthContext';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <CurrencyProvider>
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </AuthProvider>
      </CurrencyProvider>
    </ThemeProvider>
  );
}
