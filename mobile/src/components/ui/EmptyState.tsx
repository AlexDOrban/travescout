import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from './Button';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionTestID?: string;
  testID?: string;
}

export function EmptyState({ icon, title, subtitle, actionLabel, onAction, actionTestID, testID }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap} testID={testID}>
      <View style={[styles.iconCircle, { backgroundColor: colors.accentSoft }]}>
        <Ionicons name={icon} size={30} color={colors.accent} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} size="md" testID={actionTestID} style={{ marginTop: 16, alignSelf: 'center' }} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  iconCircle: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginTop: 6, maxWidth: 300 },
});
