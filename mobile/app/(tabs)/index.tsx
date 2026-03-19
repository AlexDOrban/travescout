import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppHeader } from '../../src/components/AppHeader';
import { useTheme } from '../../src/contexts/ThemeContext';

export default function SearchScreen() {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title="TraveScout" />
      <View style={styles.body}>
        <Text style={[styles.placeholder, { color: colors.textSecondary }]}>
          Search coming in next plan
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholder: { fontSize: 16 },
});
