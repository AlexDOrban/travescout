import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import { CurrencyProvider } from '../src/contexts/CurrencyContext';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

// Redirect to login whenever the session ends — including a forced sign-out
// that happens on a root-level checkout screen (which is outside the tabs auth
// gate). Prevents the "live Pay button after session expiry" dead end.
function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    }
  }, [user, loading, segments, router]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ThemeProvider>
        <CurrencyProvider>
          <AuthProvider>
            <ThemedStatusBar />
            <AuthGate>
              <Stack screenOptions={{ headerShown: false }} />
            </AuthGate>
          </AuthProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
