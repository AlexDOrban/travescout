import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { RankedTrip } from '../types/trip';
import { TRANSPORT_ICON } from '../constants/transport';

const TAG_COLORS: Record<string, string> = {
  CHEAPEST: '#22c55e',
  FASTEST: '#eab308',
  BALANCED: '#6366f1',
};

interface Props {
  trip: RankedTrip;
  onPress: () => void;
  testID?: string;
}

export function TripCard({ trip, onPress, testID }: Props) {
  const { colors } = useTheme();
  const { format } = useCurrency();

  const departTime = new Date(trip.departAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const arriveTime = new Date(trip.arriveAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const hours = Math.floor(trip.durationMins / 60);
  const mins = trip.durationMins % 60;
  const duration = mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;

  return (
    <TouchableOpacity
      testID={testID}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${trip.origin} to ${trip.destination}, ${format(trip.priceEur)}, ${duration}`}
    >
      {/* Price-forward top row: price left, duration centre, tag right */}
      <View style={styles.topRow}>
        <Text style={[styles.price, { color: colors.cheapest }]}>
          {format(trip.priceEur)}
        </Text>
        <Text style={[styles.duration, { color: colors.textSecondary }]}>
          {duration}
        </Text>
        <View style={styles.tags}>
          {trip.tags.map(tag => (
            <View
              key={tag}
              style={[styles.tag, { backgroundColor: TAG_COLORS[tag] + '26' }]}
            >
              <Text style={[styles.tagText, { color: TAG_COLORS[tag] }]}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.row}>
        <View style={styles.left}>
          <Text style={{ fontSize: 22 }}>
            {TRANSPORT_ICON[trip.transportType] ?? '🚐'}
          </Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.route, { color: colors.text }]}>
              {trip.origin} → {trip.destination}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
              {departTime} → {arriveTime} · {trip.provider}
            </Text>
          </View>
        </View>
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
          {trip.stops === 0
            ? 'Direct'
            : `${trip.stops} stop${trip.stops > 1 ? 's' : ''}`}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 10 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  price: { fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
  duration: { flex: 1, fontSize: 14, textAlign: 'center' },
  tags: { flexDirection: 'row', gap: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  tagText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 12 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  route: { fontSize: 16, fontWeight: '600' },
});
