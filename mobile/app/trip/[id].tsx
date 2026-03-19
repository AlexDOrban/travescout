import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useCurrency } from '../../src/contexts/CurrencyContext';
import { getResultById, getSearchMeta } from '../../src/stores/searchStore';
import { setCheckoutTrip } from '../../src/stores/checkoutStore';
import { TRANSPORT_ICON } from '../../src/constants/transport';
import { ColorPalette } from '../../src/constants/colors';

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { format } = useCurrency();
  const router = useRouter();
  const trip = getResultById(id ?? '');
  const meta = getSearchMeta();

  if (!trip) {
    return (
      <View
        style={[styles.container, styles.center, { backgroundColor: colors.background }]}
      >
        <Text style={{ color: colors.textSecondary }}>Trip not found</Text>
        <TouchableOpacity testID="back-btn" onPress={() => router.back()}>
          <Text style={{ color: colors.accent, marginTop: 12 }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const departDate = new Date(trip.departAt);
  const arriveDate = new Date(trip.arriveAt);
  const hours = Math.floor(trip.durationMins / 60);
  const mins = trip.durationMins % 60;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <Text style={{ fontSize: 40 }}>
          {TRANSPORT_ICON[trip.transportType] ?? '🚐'}
        </Text>
        <Text style={[styles.route, { color: colors.text }]}>
          {trip.origin} → {trip.destination}
        </Text>
        <Text testID="price" style={[styles.price, { color: colors.cheapest }]}>
          {format(trip.priceEur)}
        </Text>
        {trip.tags.map(tag => (
          <Text key={tag} style={{ color: colors.accent, fontWeight: '600' }}>
            {tag}
          </Text>
        ))}
      </View>

      <View style={styles.details}>
        <DetailRow
          label="Departure"
          value={departDate.toLocaleString()}
          colors={colors}
        />
        <DetailRow
          label="Arrival"
          value={arriveDate.toLocaleString()}
          colors={colors}
        />
        <DetailRow label="Duration" value={`${hours}h ${mins}m`} colors={colors} />
        <DetailRow
          label="Stops"
          value={trip.stops === 0 ? 'Direct' : `${trip.stops}`}
          colors={colors}
        />
        <DetailRow label="Provider" value={trip.provider} colors={colors} />
      </View>

      <TouchableOpacity
        testID="book-btn"
        style={[styles.button, { backgroundColor: colors.accent }]}
        onPress={() => {
          setCheckoutTrip(trip, meta?.adults ?? 1);
          router.push('/checkout/passengers');
        }}
      >
        <Text style={styles.buttonText}>Book Now</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function DetailRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ColorPalette;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={{ color: colors.textSecondary }}>{label}</Text>
      <Text
        testID={`detail-${label.toLowerCase()}`}
        style={{ color: colors.text, fontWeight: '600' }}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { padding: 24, alignItems: 'center', gap: 8 },
  route: { fontSize: 22, fontWeight: '700' },
  price: { fontSize: 32, fontWeight: '700' },
  details: { padding: 16, gap: 12 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  button: { margin: 16, borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
