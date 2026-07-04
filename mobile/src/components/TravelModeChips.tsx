import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { ColorPalette } from '../constants/colors';
import type { MapTravelMode } from '../utils/maps';

export const TRAVEL_MODES: { key: MapTravelMode; label: string }[] = [
  { key: 'transit', label: '🚇 Transit' },
  { key: 'walking', label: '🚶 Walk' },
  { key: 'bicycling', label: '🚲 Bike' },
  { key: 'driving', label: '🚗 Car' },
];

interface Props {
  mode: MapTravelMode;
  onChange: (mode: MapTravelMode) => void;
  colors: ColorPalette;
  /** testID prefix, e.g. "route-mode" -> "route-mode-transit". */
  testIDPrefix: string;
}

export function TravelModeChips({ mode, onChange, colors, testIDPrefix }: Props) {
  return (
    <View style={styles.row}>
      {TRAVEL_MODES.map(m => (
        <TouchableOpacity
          key={m.key}
          testID={`${testIDPrefix}-${m.key}`}
          onPress={() => onChange(m.key)}
          style={[
            styles.chip,
            { borderColor: mode === m.key ? colors.accent : colors.border },
            mode === m.key && { backgroundColor: colors.background },
          ]}
          accessibilityRole="button"
          accessibilityState={{ selected: mode === m.key }}
        >
          <Text
            style={{
              color: mode === m.key ? colors.accent : colors.textSecondary,
              fontSize: 12,
              fontWeight: mode === m.key ? '700' : '400',
            }}
          >
            {m.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  chip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
