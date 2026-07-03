import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';

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

  const s = styles(colors);
  return (
    <KeyboardAvoidingView style={s.outer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.inner}>
        <Text style={s.brand}>TraveScout ✈</Text>
        <Text style={s.sub}>Find the cheapest way to get there</Text>

        {error ? <Text style={s.error}>{error}</Text> : null}

        <TextInput
          style={s.input}
          placeholder="Email"
          placeholderTextColor={colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <TextInput
          style={s.input}
          placeholder="Password"
          placeholderTextColor={colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
        />

        <TouchableOpacity
          testID="submit-btn"
          style={[s.button, loading && s.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.buttonText}>Log in</Text>}
        </TouchableOpacity>

        <Link href="/register" style={s.link}>
          {"Don't have an account? Sign up"}
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = (c: any) =>
  StyleSheet.create({
    outer:         { flex: 1, backgroundColor: c.background },
    inner:         { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
    brand:         { fontSize: 32, fontWeight: '700', color: c.text, textAlign: 'center', marginBottom: 8 },
    sub:           { fontSize: 14, color: c.textSecondary, textAlign: 'center', marginBottom: 32 },
    error:         { color: c.error, textAlign: 'center', marginBottom: 12 },
    input:         { backgroundColor: c.card, color: c.text, borderColor: c.border, borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 12, fontSize: 16 },
    button:        { backgroundColor: c.accent, borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8 },
    buttonDisabled:{ opacity: 0.6 },
    buttonText:    { color: '#fff', fontWeight: '600', fontSize: 16 },
    link:          { color: c.accent, textAlign: 'center', marginTop: 20 },
  });
