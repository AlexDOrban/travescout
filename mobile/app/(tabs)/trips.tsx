import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useCurrency } from '../../src/contexts/CurrencyContext';
import { AppHeader } from '../../src/components/AppHeader';
import { ExpandableLeg } from '../../src/components/ExpandableLeg';
import { TRANSPORT_ICON } from '../../src/constants/transport';
import { getTrips } from '../../src/api/booking';
import { getItineraries } from '../../src/api/itinerary';
import type { BookedTrip } from '../../src/types/booking';
import type { BookedItinerary } from '../../src/types/itinerary';

const PROVIDER_TRANSPORT: Record<string, string> = {
  amadeus: 'flight',
  flixbus: 'bus',
  rail: 'train',
};

type SectionItem =
  | { kind: 'itinerary'; data: BookedItinerary }
  | { kind: 'trip'; data: BookedTrip };

export default function MyTripsScreen() {
  const { colors } = useTheme();
  const { format } = useCurrency();
  const [trips, setTrips] = useState<BookedTrip[]>([]);
  const [itineraries, setItineraries] = useState<BookedItinerary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      setError('');
      Promise.all([getTrips(), getItineraries()])
        .then(([tripsRes, itiRes]) => {
          if (cancelled) return;
          setTrips(tripsRes.trips);
          setItineraries(itiRes.itineraries);
        })
        .catch(e => {
          if (!cancelled) setError(e.message || 'Failed to load trips');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const isEmpty = trips.length === 0 && itineraries.length === 0;

  // Build combined sections for SectionList
  const sections: Array<{ title: string; data: SectionItem[] }> = [];

  if (itineraries.length > 0) {
    sections.push({
      title: 'Itineraries',
      data: itineraries.map(iti => ({ kind: 'itinerary' as const, data: iti })),
    });
  }

  if (trips.length > 0) {
    sections.push({
      title: 'Trips',
      data: trips.map(trip => ({ kind: 'trip' as const, data: trip })),
    });
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title="My Trips" />
      {error ? (
        <View style={[styles.center, { flex: 1 }]}>
          <Text style={{ color: colors.error }}>{error}</Text>
        </View>
      ) : isEmpty ? (
        <View style={[styles.center, { flex: 1 }]}>
          <Text style={{ color: colors.textSecondary, fontSize: 16 }}>No trips yet</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => `${item.kind}-${item.data.id}-${index}`}
          contentContainerStyle={styles.list}
          renderSectionHeader={({ section }) =>
            sections.length > 1 ? (
              <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
                {section.title}
              </Text>
            ) : null
          }
          renderItem={({ item }) => {
            if (item.kind === 'itinerary') {
              const iti = item.data;
              return (
                <View
                  testID="itinerary-card"
                  style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  {/* Itinerary header */}
                  <View style={styles.cardHeader}>
                    <Text style={{ fontSize: 20 }}>🗺️</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.route, { color: colors.text }]}>
                        {iti.origin} → {iti.destination}
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                        {new Date(iti.depart_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={[styles.price, { color: colors.cheapest }]}>
                      {format(parseFloat(iti.total_price_eur))}
                    </Text>
                  </View>

                  {/* Itinerary footer with booking ref and status */}
                  <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                      {iti.booking_ref}
                    </Text>
                    <Text
                      style={[
                        styles.status,
                        { color: iti.status === 'confirmed' ? colors.cheapest : colors.textSecondary },
                      ]}
                    >
                      {iti.status}
                    </Text>
                  </View>

                  {/* Expandable legs */}
                  {iti.legs && iti.legs.length > 0 && (
                    <View style={{ marginTop: 8 }}>
                      {iti.legs.map((leg, idx) => (
                        <ExpandableLeg
                          key={`${leg.id}-${idx}`}
                          leg={leg}
                          colors={colors}
                          format={format}
                        />
                      ))}
                    </View>
                  )}
                </View>
              );
            }

            // Standalone trip
            const trip = item.data;
            const transport = PROVIDER_TRANSPORT[trip.provider] ?? 'bus';
            return (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.cardHeader}>
                  <Text style={{ fontSize: 20 }}>
                    {TRANSPORT_ICON[transport] ?? '🚐'}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.route, { color: colors.text }]}>
                      {trip.origin} → {trip.destination}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                      {new Date(trip.depart_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={[styles.price, { color: colors.cheapest }]}>
                    {format(parseFloat(trip.price_eur))}
                  </Text>
                </View>
                <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {trip.booking_ref}
                  </Text>
                  <Text style={[
                    styles.status,
                    { color: trip.status === 'confirmed' ? colors.cheapest : colors.textSecondary },
                  ]}>
                    {trip.status}
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
  sectionHeader: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4, marginTop: 8 },
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
  },
  status: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
});
