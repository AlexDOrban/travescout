import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { formatDayLabel, formatTime, toISODate } from '../utils/format';
import { radius } from '../constants/theme';
import type { Trip } from '../types/trip';

interface Props {
  trip: Trip;
  /** Shows a "Change" action (e.g. back to the outbound list). */
  onChange?: () => void;
  testID?: string;
}

// The already-chosen outbound, pinned while the return is being picked.
export function OutboundSummary({ trip, onChange, testID = 'outbound-summary' }: Props) {
  const { colors } = useTheme();
  const { format } = useCurrency();
  return (
    <View testID={testID} style={[styles.wrap, { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}>
      <Ionicons name="arrow-forward-circle" size={20} color={colors.accent} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.label, { color: colors.accent }]}>OUTBOUND</Text>
        <Text numberOfLines={1} style={[styles.line, { color: colors.text }]}>
          {formatDayLabel(toISODate(new Date(trip.departAt)))} · {formatTime(trip.departAt)} → {formatTime(trip.arriveAt)} · {format(trip.priceEur)}
        </Text>
      </View>
      {onChange ? (
        <Pressable testID={`${testID}-change`} onPress={onChange} hitSlop={8} accessibilityRole="button" accessibilityLabel="Change outbound">
          <Text style={{ color: colors.accent, fontWeight: '700' }}>Change</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: radius.md, padding: 12 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  line: { fontSize: 14, fontWeight: '600', marginTop: 2 },
});
