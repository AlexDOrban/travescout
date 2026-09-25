import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { radius } from '../../constants/theme';
import { haptic } from '../../utils/haptics';

export interface Segment<T extends string> {
  value: T;
  label: string;
  /** Optional second line (e.g. the cheapest price for that tab). */
  detail?: string;
}

interface Props<T extends string> {
  segments: Segment<T>[];
  value: T;
  onChange: (v: T) => void;
  testIDPrefix?: string;
}

export function SegmentedControl<T extends string>({ segments, value, onChange, testIDPrefix }: Props<T>) {
  const { colors, isDark } = useTheme();
  return (
    <View style={[styles.track, { backgroundColor: colors.surfaceAlt }]} accessibilityRole="tablist">
      {segments.map(s => {
        const active = s.value === value;
        return (
          <Pressable
            key={s.value}
            testID={testIDPrefix ? `${testIDPrefix}-${s.value}` : undefined}
            onPress={() => {
              if (!active) haptic.tap();
              onChange(s.value);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[
              styles.segment,
              active && { backgroundColor: colors.card },
              active && !isDark && styles.activeShadow,
            ]}
          >
            <Text
              numberOfLines={1}
              style={[styles.label, { color: active ? colors.text : colors.textSecondary }, active && styles.labelActive]}
            >
              {s.label}
            </Text>
            {s.detail ? (
              <Text numberOfLines={1} style={[styles.detail, { color: active ? colors.accent : colors.textTertiary }]}>
                {s.detail}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: radius.md, padding: 3 },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: radius.sm + 1, minHeight: 36 },
  activeShadow: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  label: { fontSize: 13, fontWeight: '500' },
  labelActive: { fontWeight: '700' },
  detail: { fontSize: 11, fontWeight: '600', marginTop: 1, fontVariant: ['tabular-nums'] },
});
