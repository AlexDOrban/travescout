import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppHeader } from '../../src/components/AppHeader';
import { useTheme } from '../../src/contexts/ThemeContext';

export default function AlertsScreen() {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title="Alerts" />
      <View style={styles.body}>
        <Text style={{ fontSize: 40 }}>🔔</Text>
        <Text style={[styles.title, { color: colors.text }]}>Price alerts coming soon</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {"We'll notify you when prices drop on routes you follow."}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  title:     { fontSize: 18, fontWeight: '600' },
  subtitle:  { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
