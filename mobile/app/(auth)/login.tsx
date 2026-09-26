import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { AuthLayout, AuthField, AuthError } from '../../src/components/AuthLayout';
import { Button } from '../../src/components/ui/Button';

export default function LoginScreen() {
  const { login } = useAuth();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!email.trim() || !password) {
      setError('Email and password are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(email.trim(), password);
      // Expo Router auth gate in (tabs)/_layout.tsx handles the redirect
    } catch (err: any) {
      setError(err.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to see your tickets and price alerts.">
      <AuthError message={error} />
      <AuthField
        icon="mail-outline"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <AuthField
        icon="lock-closed-outline"
        secure
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        autoComplete="current-password"
        textContentType="password"
        onSubmitEditing={handleSubmit}
        returnKeyType="go"
      />
      <Button testID="submit-btn" title="Log in" onPress={handleSubmit} loading={loading} style={{ marginTop: 4 }} />
      <Link href="/register" style={[styles.link, { color: colors.accent }]}>
        {"Don't have an account? Sign up"}
      </Link>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  link: { textAlign: 'center', marginTop: 8, fontWeight: '600', fontSize: 15 },
});
