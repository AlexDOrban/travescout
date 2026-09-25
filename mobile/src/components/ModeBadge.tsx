import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { TRANSPORT_GLYPH, TRANSPORT_LABEL } from '../constants/transport';

// Round tinted icon for a transport mode.
export function ModeBadge({ mode, size = 34 }: { mode: string; size?: number }) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityLabel={TRANSPORT_LABEL[mode] ?? 'Transport'}
      style={[styles.badge, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.accentSoft }]}
    >
      <Ionicons name={TRANSPORT_GLYPH[mode] ?? 'car'} size={size * 0.5} color={colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center' },
});
