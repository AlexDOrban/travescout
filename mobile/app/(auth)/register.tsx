import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { AuthLayout, AuthField, AuthError } from '../../src/components/AuthLayout';
import { Button } from '../../src/components/ui/Button';

export default function RegisterScreen() {
  const { register } = useAuth();
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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await register(email.trim(), password);
      // Expo Router auth gate in (tabs)/_layout.tsx handles the redirect
    } catch (err: any) {
      setError(err.message ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="Compare every way to travel and keep your tickets in one place.">
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
        placeholder="Password (min 8 chars)"
        value={password}
        onChangeText={setPassword}
        autoComplete="new-password"
        textContentType="newPassword"
        onSubmitEditing={handleSubmit}
        returnKeyType="go"
      />
      <Button testID="submit-btn" title="Create account" onPress={handleSubmit} loading={loading} style={{ marginTop: 4 }} />
      <Link href="/login" style={[styles.link, { color: colors.accent }]}>
        {"Already have an account? Log in"}
      </Link>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  link: { textAlign: 'center', marginTop: 8, fontWeight: '600', fontSize: 15 },
});
