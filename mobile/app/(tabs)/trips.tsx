import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useCurrency } from '../../src/contexts/CurrencyContext';
import { AppHeader } from '../../src/components/AppHeader';
import { ExpandableLeg } from '../../src/components/ExpandableLeg';
import { RouteMapMenu } from '../../src/components/RouteMapMenu';
import { Card } from '../../src/components/ui/Card';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { SegmentedControl } from '../../src/components/ui/SegmentedControl';
import { TripCardSkeleton } from '../../src/components/ui/Skeleton';
import { PROVIDER_TRANSPORT } from '../../src/constants/transport';
import { getTrips } from '../../src/api/booking';
import { getItineraries } from '../../src/api/itinerary';
import type { BookedTrip } from '../../src/types/booking';
import type { BookedItinerary, Direction } from '../../src/types/itinerary';
import { formatDateTime, formatDayLabel, toISODate } from '../../src/utils/format';
import { legsByDirection } from '../../src/utils/itinerary';
import { radius } from '../../src/constants/theme';

type Booking =
  | { kind: 'itinerary'; data: BookedItinerary; departAt: string; endAt: string }
  | { kind: 'trip'; data: BookedTrip; departAt: string; endAt: string };

type Tab = 'upcoming' | 'past';

function countdown(departIso: string, now: number): string {
  const mins = Math.round((new Date(departIso).getTime() - now) / 60000);
  if (mins <= 0) return 'Travelling now';
  if (mins < 60) return `Departs in ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `Departs in ${hours} h`;
  const days = Math.round(hours / 24);
  return `Departs in ${days} ${days === 1 ? 'day' : 'days'}`;
}

export default function MyTripsScreen() {
  const { colors } = useTheme();
  const { format } = useCurrency();
  const router = useRouter();
  const [trips, setTrips] = useState<BookedTrip[]>([]);
  const [itineraries, setItineraries] = useState<BookedItinerary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('upcoming');
  // Captured per load so upcoming/past and countdowns are stable across renders.
  const [now, setNow] = useState(() => Date.now());
  const alive = useRef(true);

  // Refocusing refreshes in the background: the list stays on screen (and
  // opened tickets stay open) instead of flashing a full-screen spinner.
  const load = useCallback(async () => {
    setError('');
    try {
      const [tripsRes, itiRes] = await Promise.all([getTrips(), getItineraries()]);
      if (!alive.current) return;
      setNow(Date.now());
      setTrips(tripsRes.trips);
      setItineraries(itiRes.itineraries);
    } catch (e: any) {
      if (alive.current) setError(e.message || 'Failed to load trips');
    } finally {
      if (alive.current) setLoaded(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      alive.current = true;
      void load();
      return () => {
        alive.current = false;
      };
    }, [load]),
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const { upcoming, past } = useMemo(() => {
    const all: Booking[] = [
      ...itineraries.map(i => ({ kind: 'itinerary' as const, data: i, departAt: i.depart_at, endAt: i.arrive_at ?? i.depart_at })),
      ...trips.map(t => ({ kind: 'trip' as const, data: t, departAt: t.depart_at, endAt: t.arrive_at ?? t.depart_at })),
    ];
    return {
      upcoming: all.filter(b => new Date(b.endAt).getTime() >= now).sort((a, b) => a.departAt.localeCompare(b.departAt)),
      past: all.filter(b => new Date(b.endAt).getTime() < now).sort((a, b) => b.departAt.localeCompare(a.departAt)),
    };
  }, [trips, itineraries, now]);

  const list = tab === 'upcoming' ? upcoming : past;
  const isEmpty = trips.length === 0 && itineraries.length === 0;

  function renderBooking({ item, index }: { item: Booking; index: number }) {
    const isNext = tab === 'upcoming' && index === 0;
    const iti = item.kind === 'itinerary' ? item.data : null;
    const legs: BookedTrip[] = iti ? iti.legs ?? [] : [item.data as BookedTrip];
    const origin = item.data.origin;
    const destination = item.data.destination;
    const status = item.data.status;
    const price = parseFloat(iti ? iti.total_price_eur : (item.data as BookedTrip).price_eur);
    const ok = status === 'confirmed';
    const roundTrip = iti?.trip_type === 'round_trip';
    const groups = legsByDirection(legs);
    const firstReturn = groups.return[0];
    const mapLegs = (ls: BookedTrip[]) =>
      ls.map(l => ({ origin: l.origin, destination: l.destination, transportType: PROVIDER_TRANSPORT[l.provider] }));

    return (
      <Card testID={iti ? 'itinerary-card' : 'trip-card'} style={styles.card}>
        {isNext && (
          <View style={[styles.nextBanner, { backgroundColor: colors.accentSoft }]}>
            <Ionicons name="time" size={14} color={colors.accent} />
            <Text testID="next-countdown" style={{ color: colors.accent, fontWeight: '700', fontSize: 13 }}>
              {countdown(item.departAt, now)}
            </Text>
          </View>
        )}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.when, { color: colors.textSecondary }]}>{formatDateTime(item.departAt)}</Text>
            <Text style={[styles.route, { color: colors.text }]}>
              {origin} {roundTrip ? '⇄' : '→'} {destination}
            </Text>
            {iti ? (
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                {roundTrip && firstReturn
                  ? `${iti.booking_ref} · Round trip · ${formatDayLabel(toISODate(new Date(iti.depart_at)))} – ${formatDayLabel(toISODate(new Date(firstReturn.depart_at)))}`
                  : `${iti.booking_ref} · ${legs.length} ${legs.length === 1 ? 'leg' : 'legs'}`}
              </Text>
            ) : null}
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <View style={[styles.statusPill, { backgroundColor: (ok ? colors.cheapest : colors.warning) + '1f' }]}>
              <Text style={[styles.statusText, { color: ok ? colors.cheapest : colors.warning }]}>
                {status.replace('_', ' ')}
              </Text>
            </View>
            <Text style={[styles.price, { color: colors.text }]}>{format(price)}</Text>
          </View>
        </View>

        {/* Perforation, like a paper ticket */}
        <View style={styles.perfRow}>
          <View style={[styles.notch, styles.notchLeft, { backgroundColor: colors.background }]} />
          <View style={[styles.perf, { borderColor: colors.border }]} />
          <View style={[styles.notch, styles.notchRight, { backgroundColor: colors.background }]} />
        </View>

        {roundTrip ? (
          (['outbound', 'return'] as Direction[]).map(dir => (
            <View key={dir} testID={`trips-section-${dir}`}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                {dir === 'outbound' ? 'OUTBOUND' : 'RETURN'}
              </Text>
              {groups[dir].map((leg, idx) => (
                <ExpandableLeg key={`${leg.id}-${idx}`} leg={leg} colors={colors} format={format} />
              ))}
              {tab === 'upcoming' && groups[dir].length > 0 && (
                <View style={{ marginTop: 8 }}>
                  <RouteMapMenu
                    legs={mapLegs(groups[dir])}
                    storageKey={item.data.booking_ref}
                    reversed={dir === 'return'}
                    colors={colors}
                  />
                </View>
              )}
            </View>
          ))
        ) : (
          <>
            {legs.map((leg, idx) => (
              <ExpandableLeg key={`${leg.id}-${idx}`} leg={leg} colors={colors} format={format} />
            ))}
            {tab === 'upcoming' && (
              <View style={{ marginTop: 12 }}>
                <RouteMapMenu
                  legs={legs.length ? mapLegs(legs) : [{ origin, destination }]}
                  storageKey={item.data.booking_ref}
                  colors={colors}
                />
              </View>
            )}
          </>
        )}
      </Card>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title="My trips" large />
      {!loaded ? (
        <View style={styles.list} testID="trips-loading">
          <TripCardSkeleton />
          <TripCardSkeleton />
        </View>
      ) : error && isEmpty ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Couldn’t load your trips"
          subtitle={error}
          actionLabel="Try again"
          actionTestID="trips-retry"
          onAction={() => void load()}
        />
      ) : isEmpty ? (
        <EmptyState
          testID="trips-empty"
          icon="ticket-outline"
          title="No trips yet"
          subtitle="Book a train, bus or flight and your tickets will live here — even offline."
          actionLabel="Find a trip"
          onAction={() => router.navigate('/(tabs)')}
        />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(b, i) => `${b.kind}-${b.data.id}-${i}`}
          renderItem={renderBooking}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          ListHeaderComponent={
            <View style={{ marginBottom: 12 }}>
              <SegmentedControl<Tab>
                testIDPrefix="trips"
                value={tab}
                onChange={setTab}
                segments={[
                  { value: 'upcoming', label: `Upcoming${upcoming.length ? ` (${upcoming.length})` : ''}` },
                  { value: 'past', label: `Past${past.length ? ` (${past.length})` : ''}` },
                ]}
              />
              {error ? (
                <Text testID="trips-error" style={{ color: colors.error, marginTop: 10, fontSize: 13 }}>
                  {error} — pull down to retry.
                </Text>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <Text style={[styles.emptyTab, { color: colors.textSecondary }]}>
              {tab === 'upcoming' ? 'No upcoming trips — time to plan one?' : 'No past trips yet.'}
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, paddingTop: 8, paddingBottom: 40 },
  card: { marginBottom: 14 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginTop: 10, marginBottom: 4 },
  nextBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', gap: 12 },
  when: { fontSize: 13, fontWeight: '600' },
  route: { fontSize: 20, fontWeight: '800', marginTop: 2, letterSpacing: -0.3 },
  statusPill: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  price: { fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'] },
  perfRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 12, marginHorizontal: -16 },
  perf: { flex: 1, borderTopWidth: 1.5, borderStyle: 'dashed' },
  notch: { width: 16, height: 16, borderRadius: 8 },
  notchLeft: { marginLeft: -8 },
  notchRight: { marginRight: -8 },
  emptyTab: { textAlign: 'center', marginTop: 32, fontSize: 15 },
});
