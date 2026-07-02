import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export type TransportFilter = 'all' | 'flight' | 'bus' | 'train';
export type SortMode = 'smart' | 'price' | 'duration' | 'departure';

interface Props {
  transport: TransportFilter;
  onTransportChange: (t: TransportFilter) => void;
  sort: SortMode;
  onSortChange: (s: SortMode) => void;
}

const TRANSPORT_OPTIONS: { value: TransportFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'flight', label: '✈️ Flights' },
  { value: 'train', label: '🚆 Trains' },
  { value: 'bus', label: '🚌 Buses' },
];

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'smart', label: 'Smart' },
  { value: 'price', label: 'Price' },
  { value: 'duration', label: 'Duration' },
  { value: 'departure', label: 'Departure' },
];

export function FilterChips({ transport, onTransportChange, sort, onSortChange }: Props) {
  const { colors } = useTheme();

  function Chip({
    label,
    active,
    onPress,
    testID,
  }: {
    label: string;
    active: boolean;
    onPress: () => void;
    testID: string;
  }) {
    return (
      <TouchableOpacity
        testID={testID}
        style={[
          styles.chip,
          {
            backgroundColor: active ? colors.accent : 'transparent',
            borderColor: active ? colors.accent : colors.border,
          },
        ]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
      >
        <Text
          style={{
            color: active ? '#fff' : colors.textSecondary,
            fontSize: 13,
            fontWeight: active ? '600' : '400',
          }}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View>
      <View style={styles.row}>
        {TRANSPORT_OPTIONS.map(o => (
          <Chip
            key={o.value}
            label={o.label}
            active={transport === o.value}
            onPress={() => onTransportChange(o.value)}
            testID={`filter-${o.value}`}
          />
        ))}
      </View>
      <View style={[styles.row, { marginTop: 8 }]}>
        {SORT_OPTIONS.map(o => (
          <Chip
            key={o.value}
            label={o.label}
            active={sort === o.value}
            onPress={() => onSortChange(o.value)}
            testID={`sort-${o.value}`}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
  },
});
