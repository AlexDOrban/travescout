import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AppHeader } from '../../src/components/AppHeader';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { colors } = useTheme();

  const initial = user?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title="Profile" />
      <View style={styles.body}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.accent + '26' }]}>
            <Text style={[styles.avatarText, { color: colors.accent }]}>{initial}</Text>
          </View>
          <Text style={[styles.label, { color: colors.textSecondary }]}>SIGNED IN AS</Text>
          <Text style={[styles.email, { color: colors.text }]}>{user?.email}</Text>
        </View>

        <TouchableOpacity
          testID="logout-btn"
          onPress={logout}
          style={[styles.button, { borderColor: colors.error }]}
          accessibilityRole="button"
        >
          <Text style={[styles.buttonText, { color: colors.error }]}>Log out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1 },
  body:       { flex: 1, padding: 24, gap: 16 },
  card:       { borderWidth: 1, borderRadius: 16, padding: 24, alignItems: 'center', gap: 6 },
  avatar:     { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  avatarText: { fontSize: 26, fontWeight: '700' },
  label:      { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  email:      { fontSize: 17, fontWeight: '600' },
  button:     { borderWidth: 1, borderRadius: 10, padding: 16, alignItems: 'center' },
  buttonText: { fontWeight: '600', fontSize: 16 },
});
