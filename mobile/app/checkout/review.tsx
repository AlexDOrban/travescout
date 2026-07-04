import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useCurrency } from '../../src/contexts/CurrencyContext';
import { AppHeader } from '../../src/components/AppHeader';
import { Stepper } from '../../src/components/Stepper';
import { TRANSPORT_ICON } from '../../src/constants/transport';
import {
  getCheckoutTrip,
  getCheckoutAdults,
  getPassengers,
  getCheckoutItinerary,
} from '../../src/stores/checkoutStore';

export default function ReviewScreen() {
  const { colors } = useTheme();
  const { format } = useCurrency();
  const router = useRouter();
  const itinerary = getCheckoutItinerary();
  const trip = getCheckoutTrip();
  const adults = getCheckoutAdults();
  const passengers = getPassengers();

  // Multi-leg itinerary view
  if (itinerary) {
    // Leg prices already cover the whole party — this is what gets charged.
    const totalEur = itinerary.totalPriceEur;

    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <AppHeader title="Review Booking" showBack />
        <Stepper steps={['Transfer', 'Passengers', 'Review', 'Pay']} current={2} colors={colors} />
        <View style={styles.content}>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text testID="itinerary-header" style={[styles.cardTitle, { color: colors.text }]}>
              Your Route · {itinerary.legs.length} legs
            </Text>

            {itinerary.legs.map((leg, i) => (
              <React.Fragment key={i}>
                <View testID={`leg-row-${i}`} style={styles.legRow}>
                  <Text style={styles.legIcon}>{TRANSPORT_ICON[leg.transportType] ?? '🚐'}</Text>
                  <Text style={[styles.legRoute, { color: colors.text }]}>
                    {leg.originName} → {leg.destinationName}
                  </Text>
                  <Text testID={`leg-price-${i}`} style={[styles.legPrice, { color: colors.cheapest }]}>
                    {format(leg.priceEur)}
                  </Text>
                </View>

                {i < itinerary.connections.length && (
                  <View testID={`transfer-${i}`} style={styles.transferRow}>
                    <Text style={{ color: colors.textSecondary }}>
                      {'   '}⏳{' '}
                      {itinerary.connections[i].transferMins >= 60
                        ? `${Math.floor(itinerary.connections[i].transferMins / 60)}h ${itinerary.connections[i].transferMins % 60}m`
                        : `${itinerary.connections[i].transferMins} min`}{' '}
                      transfer
                      {itinerary.connections[i].warning
                        ? ` ⚠️ ${itinerary.connections[i].warning}`
                        : ''}
                    </Text>
                  </View>
                )}
              </React.Fragment>
            ))}
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Passengers</Text>
            {passengers.map((p, i) => (
              <View key={i} style={styles.passengerRow}>
                <Text style={{ color: colors.text }}>{p.name}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{p.email}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
            <Text testID="total-price" style={[styles.totalPrice, { color: colors.cheapest }]}>
              {format(totalEur)}
            </Text>
          </View>

          <TouchableOpacity
            testID="pay-btn"
            style={[styles.button, { backgroundColor: colors.accent }]}
            onPress={() => router.push('/checkout/payment')}
          >
            <Text style={styles.buttonText}>Proceed to Payment</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Single-trip fallback view
  if (!trip) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>No trip selected</Text>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
          <Text style={{ color: colors.accent, marginTop: 12 }}>Back to Search</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // The provider price already covers all travellers from the search.
  const totalEur = trip.priceEur;
  const hours = Math.floor(trip.durationMins / 60);
  const mins = trip.durationMins % 60;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title="Review Booking" showBack />
      <Stepper steps={['Transfer', 'Passengers', 'Review', 'Pay']} current={2} colors={colors} />
      <View style={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={{ fontSize: 24 }}>{TRANSPORT_ICON[trip.transportType] ?? '🚐'}</Text>
          <Text style={[styles.route, { color: colors.text }]}>
            {trip.origin} → {trip.destination}
          </Text>
          <Text style={{ color: colors.textSecondary }}>
            {new Date(trip.departAt).toLocaleString()}
          </Text>
          <Text style={{ color: colors.textSecondary }}>
            {hours}h {mins}m · {trip.stops === 0 ? 'Direct' : `${trip.stops} stops`}
          </Text>
          <Text style={{ color: colors.textSecondary }}>
            {trip.provider}
          </Text>
          <Text style={[styles.price, { color: colors.cheapest }]}>
            {format(trip.priceEur)} for {adults} {adults === 1 ? 'traveller' : 'travellers'}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Passengers</Text>
          {passengers.map((p, i) => (
            <View key={i} style={styles.passengerRow}>
              <Text style={{ color: colors.text }}>{p.name}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{p.email}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
          <Text testID="total-price" style={[styles.totalPrice, { color: colors.cheapest }]}>
            {format(totalEur)}
          </Text>
        </View>

        <TouchableOpacity
          testID="pay-btn"
          style={[styles.button, { backgroundColor: colors.accent }]}
          onPress={() => router.push('/checkout/payment')}
        >
          <Text style={styles.buttonText}>Proceed to Payment</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, gap: 12 },
  step: { fontSize: 12, fontWeight: '600' },
  card: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 6 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  route: { fontSize: 18, fontWeight: '700' },
  price: { fontSize: 18, fontWeight: '600', marginTop: 4 },
  passengerRow: { paddingVertical: 4 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 16 },
  totalLabel: { fontSize: 18, fontWeight: '600' },
  totalPrice: { fontSize: 24, fontWeight: '700' },
  button: { borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  // Multi-leg styles
  legRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  legIcon: { fontSize: 20 },
  legRoute: { flex: 1, fontSize: 15, fontWeight: '600' },
  legPrice: { fontSize: 15, fontWeight: '600' },
  transferRow: { paddingLeft: 8, paddingVertical: 2 },
});
