import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import { CurrencyProvider } from '../src/contexts/CurrencyContext';
import { AuthProvider } from '../src/contexts/AuthContext';

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ThemeProvider>
        <CurrencyProvider>
          <AuthProvider>
            <ThemedStatusBar />
            <Stack screenOptions={{ headerShown: false }} />
          </AuthProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
