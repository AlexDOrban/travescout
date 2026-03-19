import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AppHeader } from '../../src/components/AppHeader';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title="Profile" />
      <View style={styles.body}>
        <Text style={[styles.email, { color: colors.text }]}>{user?.email}</Text>
        <TouchableOpacity
          testID="logout-btn"
          onPress={logout}
          style={[styles.button, { backgroundColor: colors.error }]}
        >
          <Text style={styles.buttonText}>Log out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1 },
  body:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  email:      { fontSize: 18, marginBottom: 24 },
  button:     { borderRadius: 10, padding: 16, width: '100%', alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
