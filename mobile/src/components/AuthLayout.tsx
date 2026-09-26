import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  type TextInputProps,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { Card } from './ui/Card';

// Shared shell for login/register: brand hero on a gradient with the form
// in a card that overlaps it.
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 24 }}>
        <LinearGradient
          colors={[colors.heroStart, colors.heroEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 40 }]}
        >
          <View style={[styles.logo, { backgroundColor: colors.accent }]}>
            <Ionicons name="navigate" size={26} color={colors.onAccent} />
          </View>
          <Text style={styles.brand}>TraveScout</Text>
          <Text style={[styles.tagline, { color: colors.onHeroMuted }]}>Trains, buses and flights in one place</Text>
        </LinearGradient>
        <Card style={styles.card}>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
          {children}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

interface FieldProps extends TextInputProps {
  icon: keyof typeof Ionicons.glyphMap;
  secure?: boolean;
}

// Input with a leading icon and, for passwords, a show/hide toggle.
export function AuthField({ icon, secure = false, ...input }: FieldProps) {
  const { colors } = useTheme();
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.field, { backgroundColor: colors.surfaceAlt, borderColor: focused ? colors.accent : 'transparent' }]}>
      <Ionicons name={icon} size={18} color={colors.textSecondary} />
      <TextInput
        {...input}
        secureTextEntry={secure && hidden}
        onFocus={e => {
          setFocused(true);
          input.onFocus?.(e);
        }}
        onBlur={e => {
          setFocused(false);
          input.onBlur?.(e);
        }}
        placeholderTextColor={colors.textTertiary}
        style={[styles.input, { color: colors.text }]}
      />
      {secure ? (
        <Pressable
          testID="toggle-password"
          onPress={() => setHidden(h => !h)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
        >
          <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={19} color={colors.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function AuthError({ message }: { message: string }) {
  const { colors } = useTheme();
  if (!message) return null;
  return (
    <View style={[styles.error, { backgroundColor: colors.error + '14' }]}>
      <Ionicons name="alert-circle" size={16} color={colors.error} />
      <Text style={{ color: colors.error, flex: 1 }}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingBottom: 70, paddingHorizontal: 24 },
  logo: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  brand: { color: '#fff', fontSize: 30, fontWeight: '800', letterSpacing: -0.6 },
  tagline: { fontSize: 15, marginTop: 4 },
  card: { marginHorizontal: 16, marginTop: -44, padding: 20, gap: 12 },
  title: { fontSize: 22, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: -6, marginBottom: 4 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14 },
  input: { flex: 1, fontSize: 16, paddingVertical: 14 },
  error: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 12 },
});
