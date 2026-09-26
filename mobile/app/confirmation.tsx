import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Animated, Share, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '../src/contexts/ThemeContext';
import { useCurrency } from '../src/contexts/CurrencyContext';
import { RouteMapMenu } from '../src/components/RouteMapMenu';
import { ModeBadge } from '../src/components/ModeBadge';
import { Card } from '../src/components/ui/Card';
import { Button } from '../src/components/ui/Button';
import { EmptyState } from '../src/components/ui/EmptyState';
import { PROVIDER_TRANSPORT, providerName } from '../src/constants/transport';
import { getBookingResult, clearCheckout } from '../src/stores/checkoutStore';
import { formatDateTime } from '../src/utils/format';
import type { ItineraryBookingResponse } from '../src/types/itinerary';
import type { BookedTrip } from '../src/types/booking';

export default function ConfirmationScreen() {
  const { colors } = useTheme();
  const { format } = useCurrency();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const booking = getBookingResult();
  const [pop] = useState(() => new Animated.Value(0.6));

  useEffect(() => {
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }).start();
  }, [pop]);

  if (!booking) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState icon="receipt-outline" title="No booking found" actionLabel="Back to Search" onAction={() => router.replace('/(tabs)')} />
      </View>
    );
  }

  const isItinerary = 'itinerary' in booking;
  const itineraryBooking = isItinerary ? (booking as ItineraryBookingResponse) : null;
  const partiallyFailed = itineraryBooking?.status === 'partially_failed';
  const legs: BookedTrip[] = itineraryBooking ? itineraryBooking.itinerary.legs : [(booking as { trip: BookedTrip }).trip];
  const origin = itineraryBooking ? itineraryBooking.itinerary.origin : legs[0].origin;
  const destination = itineraryBooking ? itineraryBooking.itinerary.destination : legs[0].destination;
  const total = itineraryBooking ? parseFloat(itineraryBooking.itinerary.total_price_eur) : parseFloat(legs[0].price_eur);
  const departAt = itineraryBooking ? itineraryBooking.itinerary.depart_at : legs[0].depart_at;
  const singleQr = !itineraryBooking ? legs[0].ticket_qr_data : undefined;

  const handleViewTrips = () => {
    clearCheckout();
    router.replace('/(tabs)/trips');
  };

  const handleBackToSearch = () => {
    clearCheckout();
    router.replace('/(tabs)');
  };

  async function share() {
    try {
      await Share.share({
        message: `I'm travelling ${origin} → ${destination} on ${formatDateTime(departAt)}. Booking ref ${booking!.bookingRef} (TraveScout).`,
      });
    } catch {
      // user dismissed / unsupported — nothing to do
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.hero}>
          <Animated.View
            style={[
              styles.badge,
              { backgroundColor: (partiallyFailed ? colors.warning : colors.cheapest) + '22', transform: [{ scale: pop }] },
            ]}
          >
            <Ionicons
              name={partiallyFailed ? 'alert-circle' : 'checkmark-circle'}
              size={64}
              color={partiallyFailed ? colors.warning : colors.cheapest}
            />
          </Animated.View>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
            {partiallyFailed ? 'Partly booked' : 'You’re all set!'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {partiallyFailed
              ? 'Some legs could not be booked. Please review the details below.'
              : `Tickets sent to your email and saved in My Trips.`}
          </Text>
        </View>

        <Card style={{ gap: 4 }}>
          <View style={styles.refRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>BOOKING REFERENCE</Text>
              <Text selectable style={[styles.bookingRef, { color: colors.text }]}>{booking.bookingRef}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: (partiallyFailed ? colors.warning : colors.cheapest) + '1f' }]}>
              <Text style={{ color: partiallyFailed ? colors.warning : colors.cheapest, fontWeight: '700', textTransform: 'capitalize', fontSize: 12 }}>
                {booking.status.replace('_', ' ')}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.route, { color: colors.text }]}>{origin} → {destination}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{formatDateTime(departAt)}</Text>
          <Text style={[styles.price, { color: colors.text }]}>{format(total)}</Text>

          {singleQr ? (
            <View testID="confirmation-qr" style={styles.qr}>
              <QRCode value={singleQr} size={140} />
              <Text style={styles.qrHint}>Show this code when boarding</Text>
            </View>
          ) : null}

          {itineraryBooking && (
            <View style={{ marginTop: 8 }}>
              <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 4 }]}>LEGS</Text>
              {legs.map((leg, index) => {
                const legConfirmed = leg.status === 'confirmed';
                const failure = itineraryBooking.failedLegs?.find(f => f.legOrder === index);
                return (
                  <View key={leg.id} style={[styles.legRow, { borderTopColor: colors.border }]}>
                    <ModeBadge mode={PROVIDER_TRANSPORT[leg.provider] ?? 'bus'} size={30} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.legRoute, { color: colors.text }]}>
                        {leg.origin} → {leg.destination}
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                        {legConfirmed
                          ? `${providerName(leg.provider)} · ${leg.booking_ref}`
                          : `${providerName(leg.provider)} · not booked${failure ? ` — ${failure.error}` : ''}`}
                      </Text>
                      {!legConfirmed ? (
                        <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                          You were not charged for this leg.
                        </Text>
                      ) : null}
                    </View>
                    <Ionicons
                      name={legConfirmed ? 'checkmark-circle' : 'close-circle'}
                      size={20}
                      color={legConfirmed ? colors.cheapest : colors.error}
                    />
                  </View>
                );
              })}
            </View>
          )}
        </Card>

        <RouteMapMenu
          legs={legs.map(leg => ({
            origin: leg.origin,
            destination: leg.destination,
            transportType: PROVIDER_TRANSPORT[leg.provider],
          }))}
          storageKey={booking.bookingRef}
          colors={colors}
        />

        <Button testID="view-trips-btn" title="View my tickets" icon="ticket-outline" onPress={handleViewTrips} style={{ marginTop: 4 }} />
        <View style={styles.secondaryRow}>
          <Pressable testID="share-btn" onPress={share} accessibilityRole="button" style={[styles.secondary, { backgroundColor: colors.surfaceAlt }]}>
            <Ionicons name="share-outline" size={18} color={colors.text} />
            <Text style={{ color: colors.text, fontWeight: '700' }}>Share trip</Text>
          </Pressable>
          <Pressable testID="search-btn" onPress={handleBackToSearch} accessibilityRole="button" style={[styles.secondary, { backgroundColor: colors.surfaceAlt }]}>
            <Ionicons name="search" size={18} color={colors.text} />
            <Text style={{ color: colors.text, fontWeight: '700' }}>New search</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 14 },
  hero: { alignItems: 'center', gap: 6, marginBottom: 6 },
  badge: { width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, textAlign: 'center', maxWidth: 320, lineHeight: 21 },
  refRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  bookingRef: { fontSize: 22, fontWeight: '800', letterSpacing: 1, marginTop: 2 },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 10 },
  route: { fontSize: 20, fontWeight: '800' },
  price: { fontSize: 18, fontWeight: '800', marginTop: 6, fontVariant: ['tabular-nums'] },
  qr: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 16, marginTop: 12 },
  qrHint: { color: '#56657b', fontSize: 12, marginTop: 8 },
  legRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  legRoute: { fontSize: 14, fontWeight: '700' },
  secondaryRow: { flexDirection: 'row', gap: 10 },
  secondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, minHeight: 50 },
});
