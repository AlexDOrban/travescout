import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { RankedTrip } from '../types/trip';
import { TRANSPORT_ICON } from '../constants/transport';

const TAG_COLORS: Record<string, string> = {
  CHEAPEST: '#22c55e',
  FASTEST: '#3b82f6',
  BALANCED: '#eab308',
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
  const duration = `${hours}h ${mins}m`;

  return (
    <TouchableOpacity
      testID={testID}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
    >
      {trip.tags.length > 0 && (
        <View style={styles.tags}>
          {trip.tags.map(tag => (
            <View
              key={tag}
              style={[styles.tag, { backgroundColor: TAG_COLORS[tag] + '22' }]}
            >
              <Text style={[styles.tagText, { color: TAG_COLORS[tag] }]}>{tag}</Text>
            </View>
          ))}
        </View>
      )}
      <View style={styles.row}>
        <View style={styles.left}>
          <Text style={{ fontSize: 24 }}>
            {TRANSPORT_ICON[trip.transportType] ?? '🚐'}
          </Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.route, { color: colors.text }]}>
              {trip.origin} → {trip.destination}
            </Text>
            <Text style={{ color: colors.textSecondary }}>
              {departTime} – {arriveTime}
            </Text>
            <Text style={{ color: colors.textSecondary }}>
              {duration} ·{' '}
              {trip.stops === 0
                ? 'Direct'
                : `${trip.stops} stop${trip.stops > 1 ? 's' : ''}`}
            </Text>
          </View>
        </View>
        <Text style={[styles.price, { color: colors.cheapest }]}>
          {format(trip.priceEur)}
        </Text>
      </View>
      <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>
        {trip.provider}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  tags: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  tagText: { fontSize: 11, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  route: { fontSize: 16, fontWeight: '600' },
  price: { fontSize: 20, fontWeight: '700' },
});
