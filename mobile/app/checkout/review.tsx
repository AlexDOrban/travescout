import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useCurrency } from '../../src/contexts/CurrencyContext';
import { AppHeader } from '../../src/components/AppHeader';
import { Stepper, checkoutSteps } from '../../src/components/Stepper';
import { RouteMapMenu } from '../../src/components/RouteMapMenu';
import { ModeBadge } from '../../src/components/ModeBadge';
import { Card } from '../../src/components/ui/Card';
import { BottomBar } from '../../src/components/ui/BottomBar';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { providerName } from '../../src/constants/transport';
import { formatDuration, formatStops, formatTime, formatDayLabel, toISODate } from '../../src/utils/format';
import {
  getCheckoutTrip,
  getCheckoutAdults,
  getPassengers,
  getCheckoutItinerary,
  getCheckoutTransfer,
  setCheckoutTransfer,
} from '../../src/stores/checkoutStore';
import type { Trip } from '../../src/types/trip';

type ReviewLeg = Trip & { originName?: string; destinationName?: string };

export default function ReviewScreen() {
  const { colors } = useTheme();
  const { format } = useCurrency();
  const router = useRouter();
  const itinerary = getCheckoutItinerary();
  const trip = getCheckoutTrip();
  const adults = getCheckoutAdults();
  const passengers = getPassengers();

  if (!itinerary && !trip) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState icon="alert-circle-outline" title="No trip selected" actionLabel="Back to Search" onAction={() => router.replace('/(tabs)')} />
      </View>
    );
  }

  const legs: ReviewLeg[] = itinerary ? itinerary.legs : [trip!];
  // Provider prices already cover the whole party — this is what gets charged.
  const totalEur = itinerary ? itinerary.totalPriceEur : trip!.priceEur;
  const operators = [...new Set(legs.map(l => providerName(l.provider)))];
  const first = legs[0];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title="Review booking" subtitle={formatDayLabel(toISODate(new Date(first.departAt)))} showBack />
      <Stepper steps={checkoutSteps(!!itinerary)} current={itinerary ? 3 : 2} colors={colors} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <Text testID={itinerary ? 'itinerary-header' : undefined} style={[styles.overline, { color: colors.textSecondary }]}>
            {itinerary ? `YOUR ROUTE · ${legs.length} LEGS` : 'YOUR TRIP'}
          </Text>

          {legs.map((leg, i) => (
            <React.Fragment key={i}>
              <View testID={`leg-row-${i}`} style={styles.legRow}>
                <ModeBadge mode={leg.transportType} size={34} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.legRoute, { color: colors.text }]}>
                    {leg.originName ?? leg.origin} → {leg.destinationName ?? leg.destination}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 1 }}>
                    {formatTime(leg.departAt)} – {formatTime(leg.arriveAt)} · {formatDuration(leg.durationMins)} · {formatStops(leg.stops)}
                  </Text>
                  <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 1 }}>{providerName(leg.provider)}</Text>
                </View>
                {itinerary ? (
                  <Text testID={`leg-price-${i}`} style={[styles.legPrice, { color: colors.text }]}>
                    {format(leg.priceEur)}
                  </Text>
                ) : null}
              </View>

              {itinerary && i < itinerary.connections.length && (
                <View testID={`transfer-${i}`} style={styles.transferRow}>
                  <Ionicons
                    name={itinerary.connections[i].warning ? 'warning-outline' : 'swap-horizontal'}
                    size={14}
                    color={itinerary.connections[i].warning ? colors.warning : colors.textTertiary}
                  />
                  <Text style={{ color: itinerary.connections[i].warning ? colors.warning : colors.textSecondary, fontSize: 13 }}>
                    {formatDuration(itinerary.connections[i].transferMins)} transfer
                    {itinerary.connections[i].warning ? ` · ${itinerary.connections[i].warning}` : ''}
                  </Text>
                </View>
              )}
            </React.Fragment>
          ))}

          {!itinerary && (
            <Text style={[styles.partyPrice, { color: colors.textSecondary }]}>
              {format(trip!.priceEur)} for {adults} {adults === 1 ? 'traveller' : 'travellers'}
            </Text>
          )}
        </Card>

        <RouteMapMenu
          legs={legs.map(l => ({ origin: l.origin, destination: l.destination, transportType: l.transportType }))}
          initialPrefs={getCheckoutTransfer()}
          onChange={setCheckoutTransfer}
          colors={colors}
        />

        <Card>
          <View style={styles.cardHead}>
            <Text style={[styles.overline, { color: colors.textSecondary }]}>PASSENGERS</Text>
            <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Edit passengers">
              <Text style={{ color: colors.accent, fontWeight: '700' }}>Edit</Text>
            </Pressable>
          </View>
          {passengers.map((p, i) => (
            <View key={i} style={styles.passengerRow}>
              <Ionicons name="person-circle-outline" size={22} color={colors.textSecondary} />
              <View>
                <Text style={{ color: colors.text, fontWeight: '600' }}>{p.name}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{p.email}</Text>
              </View>
            </View>
          ))}
        </Card>

        <Card>
          <Text style={[styles.overline, { color: colors.textSecondary, marginBottom: 8 }]}>PRICE DETAILS</Text>
          {legs.map((leg, i) => (
            <View key={i} style={styles.lineRow}>
              <Text style={{ color: colors.textSecondary }}>
                {providerName(leg.provider)} · {leg.origin} → {leg.destination}
              </Text>
              <Text style={{ color: colors.text, fontVariant: ['tabular-nums'] }}>{format(leg.priceEur)}</Text>
            </View>
          ))}
          <View style={styles.lineRow}>
            <Text style={{ color: colors.textSecondary }}>Booking fee</Text>
            <Text style={{ color: colors.cheapest, fontWeight: '700' }}>Free</Text>
          </View>
          <View style={[styles.lineRow, styles.totalLine, { borderTopColor: colors.border }]}>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>Total</Text>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>{format(totalEur)}</Text>
          </View>
        </Card>

        {itinerary && (
          <View style={styles.note}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textTertiary} />
            <Text style={{ color: colors.textTertiary, fontSize: 12, flex: 1 }}>
              You’ll receive {legs.length} separate tickets ({operators.join(', ')}) — all kept together in My Trips.
            </Text>
          </View>
        )}
      </ScrollView>

      <BottomBar
        caption={adults === 1 ? 'Total' : `Total · ${adults} adults`}
        amount={format(totalEur)}
        amountTestID="total-price"
        ctaTitle="Continue to payment"
        ctaTestID="pay-btn"
        onPress={() => router.push('/checkout/payment')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  overline: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  legRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  legRoute: { fontSize: 15, fontWeight: '700' },
  legPrice: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  transferRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 46, paddingBottom: 4 },
  partyPrice: { fontSize: 13, marginTop: 4 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  passengerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, gap: 12 },
  totalLine: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 6, paddingTop: 10 },
  note: { flexDirection: 'row', gap: 6, paddingHorizontal: 4 },
});
