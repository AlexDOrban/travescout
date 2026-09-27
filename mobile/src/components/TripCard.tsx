import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { RankedTrip } from '../types/trip';
import { providerName, TRANSPORT_LABEL } from '../constants/transport';
import { formatDuration, formatStops, formatTime, dayOffset } from '../utils/format';
import { Card } from './ui/Card';
import { ModeBadge } from './ModeBadge';
import type { ColorPalette } from '../constants/colors';

const TAG_LABEL: Record<string, string> = {
  CHEAPEST: 'Cheapest',
  FASTEST: 'Fastest',
  BALANCED: 'Best value',
};

function tagColor(tag: string, colors: ColorPalette): string {
  if (tag === 'CHEAPEST') return colors.cheapest;
  if (tag === 'FASTEST') return colors.fastest;
  return colors.balanced;
}

interface Props {
  trip: RankedTrip;
  onPress: () => void;
  testID?: string;
}

export function TripCard({ trip, onPress, testID }: Props) {
  const { colors } = useTheme();
  const { format } = useCurrency();

  const duration = formatDuration(trip.durationMins);
  const stops = formatStops(trip.stops);
  const plusDays = dayOffset(trip.departAt, trip.arriveAt);

  return (
    <Card
      testID={testID}
      onPress={onPress}
      style={styles.card}
      accessibilityLabel={`${TRANSPORT_LABEL[trip.transportType] ?? ''} ${trip.origin} to ${trip.destination}, departs ${formatTime(trip.departAt)}, ${duration}, ${stops}, ${format(trip.priceEur)}`}
    >
      {trip.tags.length > 0 && (
        <View style={styles.tags}>
          {trip.tags.map(tag => (
            <View key={tag} style={[styles.tag, { backgroundColor: tagColor(tag, colors) + '1f' }]}>
              <Text style={[styles.tagText, { color: tagColor(tag, colors) }]}>{TAG_LABEL[tag] ?? tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Timeline: depart ——— duration ——— arrive */}
      <View style={styles.timeline}>
        <View>
          <Text style={[styles.time, { color: colors.text }]}>{formatTime(trip.departAt)}</Text>
          <Text style={[styles.code, { color: colors.textSecondary }]}>{trip.origin}</Text>
        </View>
        <View style={styles.middle}>
          <Text style={[styles.duration, { color: colors.textSecondary }]}>{duration}</Text>
          <View style={styles.lineRow}>
            <View style={[styles.dot, { borderColor: colors.textTertiary }]} />
            <View style={[styles.line, { backgroundColor: colors.border }]} />
            {trip.stops > 0 && <View style={[styles.stopDot, { backgroundColor: colors.warning }]} />}
            {trip.stops > 0 && <View style={[styles.line, { backgroundColor: colors.border }]} />}
            <View style={[styles.dot, { backgroundColor: colors.textTertiary, borderColor: colors.textTertiary }]} />
          </View>
          <Text style={[styles.stops, { color: trip.stops === 0 ? colors.cheapest : colors.textSecondary }]}>{stops}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <View style={styles.arriveRow}>
            <Text style={[styles.time, { color: colors.text }]}>{formatTime(trip.arriveAt)}</Text>
            {plusDays > 0 && (
              <Text testID="plus-days" style={[styles.plus, { color: colors.warning }]}>+{plusDays}</Text>
            )}
          </View>
          <Text style={[styles.code, { color: colors.textSecondary }]}>{trip.destination}</Text>
        </View>
      </View>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <View style={styles.operator}>
          <ModeBadge mode={trip.transportType} size={28} />
          <Text numberOfLines={1} style={[styles.provider, { color: colors.textSecondary }]}>
            {providerName(trip.provider)}
          </Text>
        </View>
        <Text style={[styles.price, { color: colors.text }]}>{format(trip.priceEur)}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  tags: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.2 },
  timeline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  time: { fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  code: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  middle: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  duration: { fontSize: 12, fontWeight: '600' },
  lineRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginVertical: 4 },
  line: { flex: 1, height: 2, borderRadius: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, borderWidth: 2 },
  stopDot: { width: 7, height: 7, borderRadius: 4, marginHorizontal: 2 },
  stops: { fontSize: 12, fontWeight: '600' },
  arriveRow: { flexDirection: 'row', alignItems: 'flex-start' },
  plus: { fontSize: 11, fontWeight: '800', marginLeft: 2, marginTop: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, marginTop: 14, paddingTop: 12 },
  operator: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  provider: { fontSize: 13, fontWeight: '600', flex: 1 },
  price: { fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
