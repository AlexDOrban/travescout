import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '../../src/components/AppHeader';
import { RouteMapMenu } from '../../src/components/RouteMapMenu';
import { ModeBadge } from '../../src/components/ModeBadge';
import { Card } from '../../src/components/ui/Card';
import { BottomBar } from '../../src/components/ui/BottomBar';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useCurrency } from '../../src/contexts/CurrencyContext';
import {
  getResultById,
  getSearchMeta,
  getSearchQuery,
  getSelectedOutbound,
  setSelectedOutbound,
  type SearchLeg,
} from '../../src/stores/searchStore';
import { setCheckoutTrip, setCheckoutItinerary, setCheckoutRoundTrip } from '../../src/stores/checkoutStore';
import { OutboundSummary } from '../../src/components/OutboundSummary';
import { toLeg } from '../../src/utils/itinerary';
import { providerName, TRANSPORT_LABEL } from '../../src/constants/transport';
import { ColorPalette } from '../../src/constants/colors';
import { dayOffset, formatDayLabel, formatDuration, formatStops, formatTime, toISODate } from '../../src/utils/format';

const TAG_LABEL: Record<string, string> = { CHEAPEST: 'Cheapest', FASTEST: 'Fastest', BALANCED: 'Best value' };

export default function TripDetailScreen() {
  const { id, leg } = useLocalSearchParams<{ id: string; leg?: string }>();
  const phase: SearchLeg = leg === 'return' ? 'return' : 'outbound';
  const { colors } = useTheme();
  const { format } = useCurrency();
  const router = useRouter();
  const trip = getResultById(id ?? '', phase);
  const meta = getSearchMeta();
  const query = getSearchQuery();
  const roundTrip = !!query?.returnDate;
  const outbound = phase === 'return' ? getSelectedOutbound() : null;

  if (!trip || (phase === 'return' && !outbound)) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <AppHeader title="Trip details" showBack />
        <EmptyState
          icon="alert-circle-outline"
          title="Trip not found"
          subtitle="This fare is no longer in your results. Search again for up-to-date prices."
          actionLabel="Go back"
          actionTestID="back-btn"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  const adults = meta?.adults ?? 1;
  const plusDays = dayOffset(trip.departAt, trip.arriveAt);
  // Prefer city names from the search; flights carry airport codes.
  const cityName = (code: string) => [query?.from, query?.to].find(c => c?.code === code)?.name ?? code;
  const originName = cityName(trip.origin);
  const destName = cityName(trip.destination);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title={`${trip.origin} → ${trip.destination}`} subtitle={formatDayLabel(toISODate(new Date(trip.departAt)))} showBack />
      <ScrollView contentContainerStyle={styles.body}>
        {outbound && (
          <View style={{ marginBottom: 12 }}>
            <OutboundSummary trip={outbound} />
          </View>
        )}
        <Card>
          <View style={styles.topRow}>
            <ModeBadge mode={trip.transportType} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.operator, { color: colors.text }]}>{providerName(trip.provider)}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                {TRANSPORT_LABEL[trip.transportType]} · {formatStops(trip.stops)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text testID="price" style={[styles.price, { color: colors.text }]}>{format(trip.priceEur)}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                {adults === 1 ? '1 adult' : `${adults} adults · total`}
              </Text>
            </View>
          </View>

          {trip.tags.length > 0 && (
            <View style={styles.tags}>
              {trip.tags.map(tag => (
                <View key={tag} style={[styles.tag, { backgroundColor: colors.accentSoft }]}>
                  <Ionicons name="ribbon-outline" size={12} color={colors.accent} />
                  <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 12 }}>{TAG_LABEL[tag] ?? tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Vertical journey timeline */}
          <View style={styles.journey}>
            <TimelineStop time={formatTime(trip.departAt)} place={originName} code={trip.origin} colors={colors} first />
            <View style={styles.middleRow}>
              <View style={[styles.rail, { backgroundColor: colors.accent }]} />
              <Text style={[styles.middleText, { color: colors.textSecondary }]}>
                {formatDuration(trip.durationMins)} · {formatStops(trip.stops).toLowerCase()}
              </Text>
            </View>
            <TimelineStop
              time={formatTime(trip.arriveAt)}
              place={destName}
              code={trip.destination}
              colors={colors}
              plusDays={plusDays}
            />
          </View>
        </Card>

        <Card style={{ marginTop: 12 }}>
          <DetailRow label="Date" value={formatDayLabel(toISODate(new Date(trip.departAt)))} colors={colors} />
          <DetailRow label="Duration" value={formatDuration(trip.durationMins)} colors={colors} />
          <DetailRow label="Stops" value={formatStops(trip.stops)} colors={colors} />
          <DetailRow label="Provider" value={providerName(trip.provider)} colors={colors} />
          <DetailRow label="Passengers" value={`${adults}`} colors={colors} last />
        </Card>

        <View style={{ marginTop: 12 }}>
          <RouteMapMenu
            legs={[{ origin: trip.origin, destination: trip.destination, transportType: trip.transportType }]}
            colors={colors}
          />
        </View>

        {!(roundTrip && phase === 'outbound') && (
          <Pressable
            testID="add-connections-btn"
            onPress={() => {
              if (outbound) {
                setCheckoutRoundTrip(toLeg(outbound, 'outbound'), toLeg(trip, 'return'), adults, true);
                router.push('/checkout/connections?direction=outbound');
                return;
              }
              setCheckoutItinerary(toLeg(trip), adults);
              router.push('/checkout/connections');
            }}
            accessibilityRole="button"
            style={({ pressed }) => [styles.connect, { backgroundColor: colors.card, borderColor: colors.border }, pressed && { opacity: 0.7 }]}
          >
            <View style={[styles.connectIcon, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="git-merge-outline" size={18} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>Add Connections</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 1 }}>
                Book a bus or train to and from the station or airport too
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </Pressable>
        )}
      </ScrollView>

      {roundTrip && phase === 'outbound' ? (
        <BottomBar
          caption="Outbound"
          amount={format(trip.priceEur)}
          ctaTitle="Choose return"
          ctaTestID="choose-return-btn"
          onPress={() => {
            setSelectedOutbound(trip);
            router.push('/results?leg=return');
          }}
        />
      ) : outbound ? (
        <BottomBar
          caption={adults === 1 ? 'Total · round trip' : `Total · round trip · ${adults} adults`}
          amount={format(outbound.priceEur + trip.priceEur)}
          ctaTitle="Book round trip"
          ctaTestID="book-round-trip-btn"
          onPress={() => {
            setCheckoutRoundTrip(toLeg(outbound, 'outbound'), toLeg(trip, 'return'), adults, false);
            router.push('/checkout/transfer');
          }}
        />
      ) : (
        <BottomBar
          caption={adults === 1 ? 'Total' : `Total · ${adults} adults`}
          amount={format(trip.priceEur)}
          ctaTitle="Book Now"
          ctaTestID="book-btn"
          onPress={() => {
            setCheckoutTrip(trip, adults);
            router.push('/checkout/transfer');
          }}
        />
      )}
    </View>
  );
}

function TimelineStop({
  time, place, code, colors, first = false, plusDays = 0,
}: { time: string; place: string; code: string; colors: ColorPalette; first?: boolean; plusDays?: number }) {
  return (
    <View style={styles.stopRow}>
      <View style={styles.timeCol}>
        <Text style={[styles.stopTime, { color: colors.text }]}>{time}</Text>
        {plusDays > 0 ? <Text style={{ color: colors.warning, fontSize: 11, fontWeight: '800' }}>+{plusDays} day</Text> : null}
      </View>
      <View style={[styles.node, first ? { borderColor: colors.accent } : { backgroundColor: colors.accent, borderColor: colors.accent }]} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.stopPlace, { color: colors.text }]}>{place}</Text>
        {place !== code ? <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{code}</Text> : null}
      </View>
    </View>
  );
}

function DetailRow({
  label, value, colors, last = false,
}: { label: string; value: string; colors: ColorPalette; last?: boolean }) {
  return (
    <View style={[styles.detailRow, !last && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{label}</Text>
      <Text testID={`detail-${label.toLowerCase()}`} style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { padding: 16, paddingBottom: 32 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  operator: { fontSize: 16, fontWeight: '700' },
  price: { fontSize: 24, fontWeight: '800', fontVariant: ['tabular-nums'] },
  tags: { flexDirection: 'row', gap: 6, marginTop: 12 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  journey: { marginTop: 18 },
  stopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timeCol: { width: 56 },
  stopTime: { fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
  node: { width: 14, height: 14, borderRadius: 7, borderWidth: 3 },
  stopPlace: { fontSize: 16, fontWeight: '700' },
  middleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  rail: { width: 3, alignSelf: 'stretch', marginLeft: 56 + 12 + 5.5, borderRadius: 2 },
  middleText: { fontSize: 13, fontWeight: '600', marginLeft: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11 },
  connect: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 12 },
  connectIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
