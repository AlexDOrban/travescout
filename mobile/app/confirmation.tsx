import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/contexts/ThemeContext';
import { useCurrency } from '../src/contexts/CurrencyContext';
import { AppHeader } from '../src/components/AppHeader';
import { getBookingResult, clearCheckout } from '../src/stores/checkoutStore';
import type { ItineraryBookingResponse } from '../src/types/itinerary';

export default function ConfirmationScreen() {
  const { colors } = useTheme();
  const { format } = useCurrency();
  const router = useRouter();
  const booking = getBookingResult();

  if (!booking) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>No booking found</Text>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
          <Text style={{ color: colors.accent, marginTop: 12 }}>Back to Search</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isItinerary = 'itinerary' in booking;

  const handleViewTrips = () => {
    clearCheckout();
    router.replace('/(tabs)/trips');
  };

  const handleBackToSearch = () => {
    clearCheckout();
    router.replace('/(tabs)');
  };

  if (isItinerary) {
    const itineraryBooking = booking as ItineraryBookingResponse;
    const { itinerary } = itineraryBooking;
    const partiallyFailed = itineraryBooking.status === 'partially_failed';

    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <AppHeader title="Booking Complete" />
        <View style={styles.content}>
          <View style={styles.successIcon}>
            <Text style={{ fontSize: 48 }}>{partiallyFailed ? '⚠️' : '✅'}</Text>
          </View>

          {partiallyFailed && (
            <View style={[styles.warningBanner, { backgroundColor: colors.error + '22', borderColor: colors.error }]}>
              <Text style={{ color: colors.error, fontWeight: '600' }}>
                Some legs could not be booked. Please review the details below.
              </Text>
            </View>
          )}

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Booking Reference
            </Text>
            <Text style={[styles.bookingRef, { color: colors.accent }]}>
              {itineraryBooking.bookingRef}
            </Text>

            <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>
              Route
            </Text>
            <Text style={[styles.route, { color: colors.text }]}>
              {itinerary.origin} → {itinerary.destination}
            </Text>

            <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>
              Total Price
            </Text>
            <Text style={[styles.price, { color: colors.cheapest }]}>
              {format(parseFloat(itinerary.total_price_eur))}
            </Text>

            <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>
              Legs
            </Text>
            {itinerary.legs.map((leg, index) => {
              const legConfirmed = leg.status === 'confirmed';
              return (
                <View
                  key={leg.id}
                  style={[styles.legRow, { borderColor: colors.border }]}
                >
                  <Text style={{ fontSize: 20, marginRight: 8 }}>
                    {legConfirmed ? '✅' : '❌'}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.legRoute, { color: colors.text }]}>
                      {leg.origin} → {leg.destination}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                      {leg.provider} · {leg.booking_ref}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          <TouchableOpacity
            testID="view-trips-btn"
            style={[styles.button, { backgroundColor: colors.accent }]}
            onPress={handleViewTrips}
          >
            <Text style={styles.buttonText}>View My Trips</Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="search-btn"
            style={[styles.secondaryButton, { borderColor: colors.accent }]}
            onPress={handleBackToSearch}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.accent }]}>
              Back to Search
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Single-trip booking (existing behavior)
  const { trip } = booking;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title="Booking Complete" />
      <View style={styles.content}>
        <View style={styles.successIcon}>
          <Text style={{ fontSize: 48 }}>✅</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Booking Reference
          </Text>
          <Text style={[styles.bookingRef, { color: colors.accent }]}>
            {booking.bookingRef}
          </Text>

          <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>
            Route
          </Text>
          <Text style={[styles.route, { color: colors.text }]}>
            {trip.origin} → {trip.destination}
          </Text>

          <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>
            Departure
          </Text>
          <Text style={{ color: colors.text }}>
            {new Date(trip.depart_at).toLocaleString()}
          </Text>

          <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>
            Price
          </Text>
          <Text style={[styles.price, { color: colors.cheapest }]}>
            {format(parseFloat(trip.price_eur))}
          </Text>

          <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>
            Status
          </Text>
          <Text style={{ color: colors.cheapest, fontWeight: '600', textTransform: 'capitalize' }}>
            {booking.status}
          </Text>
        </View>

        <TouchableOpacity
          testID="view-trips-btn"
          style={[styles.button, { backgroundColor: colors.accent }]}
          onPress={handleViewTrips}
        >
          <Text style={styles.buttonText}>View My Trips</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="search-btn"
          style={[styles.secondaryButton, { borderColor: colors.accent }]}
          onPress={handleBackToSearch}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.accent }]}>
            Back to Search
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, gap: 12 },
  successIcon: { alignItems: 'center', marginVertical: 8 },
  card: { borderWidth: 1, borderRadius: 12, padding: 16 },
  label: { fontSize: 12, fontWeight: '600' },
  bookingRef: { fontSize: 20, fontWeight: '700' },
  route: { fontSize: 18, fontWeight: '600' },
  price: { fontSize: 18, fontWeight: '700' },
  button: { borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryButton: { borderRadius: 8, padding: 16, alignItems: 'center', borderWidth: 1 },
  secondaryButtonText: { fontSize: 16, fontWeight: '600' },
  legRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, marginTop: 8 },
  legRoute: { fontSize: 14, fontWeight: '600' },
  warningBanner: { borderWidth: 1, borderRadius: 8, padding: 12 },
});
