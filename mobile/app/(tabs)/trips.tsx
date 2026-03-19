import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useCurrency } from '../../src/contexts/CurrencyContext';
import { AppHeader } from '../../src/components/AppHeader';
import { TRANSPORT_ICON } from '../../src/constants/transport';
import { getTrips } from '../../src/api/booking';
import type { BookedTrip } from '../../src/types/booking';

const PROVIDER_TRANSPORT: Record<string, string> = {
  amadeus: 'flight',
  flixbus: 'bus',
  rail: 'train',
};

export default function MyTripsScreen() {
  const { colors } = useTheme();
  const { format } = useCurrency();
  const [trips, setTrips] = useState<BookedTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getTrips()
      .then(data => setTrips(data.trips))
      .catch(e => setError(e.message || 'Failed to load trips'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title="My Trips" />
      {error ? (
        <View style={[styles.center, { flex: 1 }]}>
          <Text style={{ color: colors.error }}>{error}</Text>
        </View>
      ) : trips.length === 0 ? (
        <View style={[styles.center, { flex: 1 }]}>
          <Text style={{ color: colors.textSecondary, fontSize: 16 }}>No trips yet</Text>
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const transport = PROVIDER_TRANSPORT[item.provider] ?? 'bus';
            return (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.cardHeader}>
                  <Text style={{ fontSize: 20 }}>
                    {TRANSPORT_ICON[transport] ?? '🚐'}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.route, { color: colors.text }]}>
                      {item.origin} → {item.destination}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                      {new Date(item.depart_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={[styles.price, { color: colors.cheapest }]}>
                    {format(parseFloat(item.price_eur))}
                  </Text>
                </View>
                <View style={styles.cardFooter}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {item.booking_ref}
                  </Text>
                  <Text style={[
                    styles.status,
                    { color: item.status === 'confirmed' ? colors.cheapest : colors.textSecondary },
                  ]}>
                    {item.status}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  card: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  route: { fontSize: 16, fontWeight: '600' },
  price: { fontSize: 18, fontWeight: '700' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  status: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
});
