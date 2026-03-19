import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppHeader } from '../../src/components/AppHeader';
import { useTheme } from '../../src/contexts/ThemeContext';

export default function TripsScreen() {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title="My Trips" />
      <View style={styles.body}>
        <Text style={{ color: colors.textSecondary }}>Your bookings will appear here</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
