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
            backgroundColor: active ? colors.accent : colors.card,
            borderColor: colors.border,
          },
        ]}
        onPress={onPress}
      >
        <Text style={{ color: active ? '#fff' : colors.text, fontSize: 13 }}>{label}</Text>
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
});
