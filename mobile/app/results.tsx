import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { View, FlatList, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/contexts/ThemeContext';
import { useAuth } from '../src/contexts/AuthContext';
import { useCurrency } from '../src/contexts/CurrencyContext';
import { AppHeader, HeaderIconButton } from '../src/components/AppHeader';
import { TripCard } from '../src/components/TripCard';
import { DateStrip } from '../src/components/DateStrip';
import { SegmentedControl } from '../src/components/ui/SegmentedControl';
import { TripCardSkeleton } from '../src/components/ui/Skeleton';
import { EmptyState } from '../src/components/ui/EmptyState';
import { Toast, useToast } from '../src/components/ui/Toast';
import {
  getSearchResults,
  getSearchMeta,
  getSearchQuery,
  setSearchResults,
  setSearchQuery,
  getSelectedOutbound,
  type SearchQuery,
  type SearchLeg,
} from '../src/stores/searchStore';
import { OutboundSummary } from '../src/components/OutboundSummary';
import { returnSearchQuery, returnsAfter } from '../src/utils/roundTrip';
import { search, searchPrices } from '../src/api/search';
import type { RankedTrip, SearchMeta } from '../src/types/trip';
import { addDays, formatDayLabel, toISODate, todayISO } from '../src/utils/format';
import { addAlert, findAlert, removeAlert, alertId } from '../src/utils/priceAlerts';
import { radius } from '../src/constants/theme';
import { haptic } from '../src/utils/haptics';

export type TransportFilter = 'all' | 'flight' | 'bus' | 'train';
export type SortMode = 'smart' | 'price' | 'duration' | 'departure';

const SORTS: { value: SortMode; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { value: 'smart', label: 'Best', icon: 'sparkles-outline' },
  { value: 'price', label: 'Cheapest', icon: 'pricetag-outline' },
  { value: 'duration', label: 'Fastest', icon: 'flash-outline' },
  { value: 'departure', label: 'Earliest', icon: 'time-outline' },
];

function metaMatches(meta: SearchMeta | null, q: SearchQuery | null): boolean {
  if (!q) return true; // legacy entry without a query: show what's stored
  return !!meta && meta.from === q.from.code && meta.to === q.to.code && meta.departDate === q.departDate && meta.adults === q.adults;
}

// Seven days around the selected date, never before today (or `min`) and
// never after `max` (a round trip's outbound can't go past its return).
function dateWindow(selected: string, min?: string, max?: string): string[] {
  const today = todayISO();
  const floor = min && min > today ? min : today;
  let start = addDays(selected, -3);
  if (start < floor) start = floor;
  return Array.from({ length: 7 }, (_, i) => addDays(start, i)).filter(d => !max || d <= max);
}

export default function ResultsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { format } = useCurrency();
  const router = useRouter();
  const userKey = user?.email ?? 'anon';
  const toast = useToast();

  const params = useLocalSearchParams<{ leg?: string }>();
  const phase: SearchLeg = params.leg === 'return' ? 'return' : 'outbound';
  const outbound = phase === 'return' ? getSelectedOutbound() : null;
  // The query this screen actually searches: the base query, or the way back.
  const phaseQueryFor = (q: SearchQuery | null): SearchQuery | null =>
    q && phase === 'return' ? returnSearchQuery(q, outbound) : q;

  const [query, setQuery] = useState<SearchQuery | null>(getSearchQuery());
  const [results, setResults] = useState<RankedTrip[]>(getSearchResults(phase));
  const [meta, setMeta] = useState<SearchMeta | null>(getSearchMeta(phase));
  const [loading, setLoading] = useState(!metaMatches(getSearchMeta(phase), phaseQueryFor(getSearchQuery())));
  const [error, setError] = useState('');
  const [prices, setPrices] = useState<Record<string, number | null | undefined>>({});
  const [watching, setWatching] = useState(false);
  const [transport, setTransport] = useState<TransportFilter>('all');
  const [sort, setSort] = useState<SortMode>('smart');
  const requestId = useRef(0);

  async function runSearch(q: SearchQuery) {
    const id = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const data = await search({ from: q.from.code, to: q.to.code, departDate: q.departDate, adults: q.adults });
      if (id !== requestId.current) return; // a newer date was tapped meanwhile
      setSearchResults(data.results, data.meta, phase);
      setResults(data.results);
      setMeta(data.meta);
    } catch (e: any) {
      if (id === requestId.current) setError(e.message || 'Search failed');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }

  // First load (search screen navigates here immediately and we fetch).
  useEffect(() => {
    // Only on mount; later searches are triggered explicitly. runSearch flips
    // the loading flag synchronously by design (skeletons on first paint).
    const pq = phaseQueryFor(query);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (pq && !metaMatches(getSearchMeta(phase), pq)) void runSearch(pq);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-read the store whenever this screen regains focus, so backing into an
  // older results screen after a newer search doesn't show a stale list whose
  // cards no longer resolve ("Trip not found").
  useFocusEffect(
    useCallback(() => {
      const storedQuery = getSearchQuery();
      if (storedQuery && query && storedQuery !== query) setQuery(storedQuery);
      if (metaMatches(getSearchMeta(phase), phaseQueryFor(storedQuery))) {
        setResults(getSearchResults(phase));
        setMeta(getSearchMeta(phase));
      }
    }, [query, phase]), // eslint-disable-line react-hooks/exhaustive-deps
  );

  const pq = useMemo(() => phaseQueryFor(query), [query]); // eslint-disable-line react-hooks/exhaustive-deps
  const dates = useMemo(() => {
    if (!pq) return [];
    if (phase === 'return') return dateWindow(pq.departDate, outbound ? toISODate(new Date(outbound.arriveAt)) : undefined);
    return dateWindow(pq.departDate, undefined, query?.returnDate);
  }, [pq, phase, outbound, query?.returnDate]);
  const visible = useMemo(() => (phase === 'return' ? returnsAfter(results, outbound) : results), [phase, results, outbound]);
  const alertKey = useMemo(
    () => (pq ? { from: pq.from, to: pq.to, departDate: pq.departDate, adults: pq.adults } : null),
    [pq],
  );

  // Cheapest fare per day for the strip (backend caches per day).
  useEffect(() => {
    if (!pq || dates.length === 0) return;
    let cancelled = false;
    searchPrices({ from: pq.from.code, to: pq.to.code, startDate: dates[0], days: dates.length, adults: pq.adults })
      .then(res => {
        if (cancelled) return;
        setPrices(prev => {
          const next = { ...prev };
          res.prices.forEach(p => { next[p.date] = p.minPriceEur; });
          return next;
        });
      })
      .catch(() => {
        // The strip is a nicety — leave placeholders rather than erroring.
        if (!cancelled) setPrices(prev => {
          const next = { ...prev };
          dates.forEach(d => { if (next[d] === undefined) next[d] = null; });
          return next;
        });
      });
    return () => {
      cancelled = true;
    };
  }, [pq, dates]);

  useEffect(() => {
    if (!alertKey) return;
    let cancelled = false;
    findAlert(userKey, alertKey).then(a => {
      if (!cancelled) setWatching(!!a);
    });
    return () => {
      cancelled = true;
    };
  }, [alertKey, userKey]);

  function changeDate(iso: string) {
    if (!query || !pq || iso === pq.departDate) return;
    const next = phase === 'return' ? { ...query, returnDate: iso } : { ...query, departDate: iso };
    setSearchQuery(next);
    setQuery(next);
    const nextPq = phaseQueryFor(next);
    if (nextPq) void runSearch(nextPq);
  }

  const cheapestOverall = visible.length ? Math.min(...visible.map(r => r.priceEur)) : null;

  async function toggleWatch() {
    if (!alertKey) return;
    if (watching) {
      await removeAlert(userKey, alertId(alertKey));
      setWatching(false);
      haptic.tap();
      toast.show('Price alert removed');
    } else {
      if (cheapestOverall == null) {
        toast.show('No fares to track for this date yet');
        return;
      }
      await addAlert(userKey, { ...alertKey, priceEur: cheapestOverall });
      setWatching(true);
      haptic.success();
      toast.show('We’ll track this price in Alerts');
    }
  }

  const cheapestByMode = useMemo(() => {
    const out: Record<string, number> = {};
    for (const r of visible) {
      out.all = Math.min(out.all ?? Infinity, r.priceEur);
      out[r.transportType] = Math.min(out[r.transportType] ?? Infinity, r.priceEur);
    }
    return out;
  }, [visible]);

  const filtered = useMemo(() => {
    const list = transport === 'all' ? visible : visible.filter(t => t.transportType === transport);
    switch (sort) {
      case 'price':
        return [...list].sort((a, b) => a.priceEur - b.priceEur);
      case 'duration':
        return [...list].sort((a, b) => a.durationMins - b.durationMins);
      case 'departure':
        return [...list].sort((a, b) => a.departAt.localeCompare(b.departAt));
      default:
        // Best: the backend's blended price/duration/convenience score.
        return [...list].sort((a, b) => b.score - a.score);
    }
  }, [visible, transport, sort]);

  const title = pq ? `${pq.from.name} → ${pq.to.name}` : meta ? `${meta.from} → ${meta.to}` : 'Results';
  const adults = pq?.adults ?? meta?.adults ?? 1;
  const phaseLabel = query?.returnDate ? (phase === 'return' ? 'Return · ' : 'Outbound · ') : '';
  const subtitle = pq || meta
    ? `${phaseLabel}${formatDayLabel(pq?.departDate ?? meta!.departDate)} · ${adults} ${adults === 1 ? 'adult' : 'adults'}`
    : undefined;

  const modeSegments = (['all', 'train', 'bus', 'flight'] as TransportFilter[]).map(v => ({
    value: v,
    label: { all: 'All', train: 'Train', bus: 'Bus', flight: 'Flight' }[v],
    detail: cheapestByMode[v] != null ? format(cheapestByMode[v]).replace(/\.00$/, '') : loading ? '' : '—',
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title={title}
        subtitle={subtitle}
        showBack
        right={
          pq ? (
            <HeaderIconButton
              testID="watch-price"
              icon={watching ? 'notifications' : 'notifications-outline'}
              active={watching}
              onPress={toggleWatch}
              accessibilityLabel={watching ? 'Stop tracking price' : 'Track price'}
            />
          ) : undefined
        }
      />

      {pq && (
        <View style={styles.stripWrap}>
          <DateStrip dates={dates} selected={pq.departDate} prices={prices} onSelect={changeDate} />
        </View>
      )}

      {outbound && (
        <View style={styles.pinned}>
          <OutboundSummary trip={outbound} onChange={() => router.back()} />
        </View>
      )}

      <View style={styles.filters}>
        <SegmentedControl segments={modeSegments} value={transport} onChange={setTransport} testIDPrefix="filter" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortRow}>
          {SORTS.map(s => {
            const active = sort === s.value;
            return (
              <Pressable
                key={s.value}
                testID={`sort-${s.value}`}
                onPress={() => {
                  if (!active) haptic.tap();
                  setSort(s.value);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[
                  styles.sortChip,
                  { backgroundColor: active ? colors.text : colors.card, borderColor: active ? colors.text : colors.border },
                ]}
              >
                <Ionicons name={s.icon} size={14} color={active ? colors.background : colors.textSecondary} />
                <Text style={[styles.sortText, { color: active ? colors.background : colors.text }]}>{s.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {meta && meta.providersFailed.length > 0 && !loading && (
        <View
          testID="providers-failed-banner"
          style={[styles.banner, { backgroundColor: colors.warning + '1a' }]}
        >
          <Ionicons name="information-circle" size={18} color={colors.warning} />
          <Text style={{ color: colors.text, fontSize: 13, flex: 1 }}>
            {`Some providers didn't respond (${meta.providersFailed.join(', ')}) — results may be incomplete.`}
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.list} testID="results-loading">
          {[0, 1, 2, 3].map(i => <TripCardSkeleton key={i} />)}
        </View>
      ) : error ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Couldn’t load results"
          subtitle={error}
          actionLabel="Try again"
          actionTestID="results-retry"
          onAction={() => pq && runSearch(pq)}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          testID="empty-text"
          icon="search-outline"
          title={
            visible.length === 0
              ? phase === 'return' && results.length > 0
                ? 'No returns after your outbound arrives'
                : 'No trips found'
              : `No ${transport === 'all' ? '' : `${transport} `}trips`
          }
          subtitle={visible.length === 0 ? 'Try another date from the strip above.' : 'Try another mode or clear the filter.'}
          actionLabel={visible.length > 0 ? 'Show all modes' : undefined}
          onAction={visible.length > 0 ? () => setTransport('all') : undefined}
        />
      ) : (
        <FlatList
          testID="results-list"
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={[styles.count, { color: colors.textSecondary }]}>
              {filtered.length} {filtered.length === 1 ? 'option' : 'options'}
              {cheapestOverall != null ? ` · from ${format(cheapestOverall)}` : ''}
            </Text>
          }
          renderItem={({ item }) => (
            <TripCard
              trip={item}
              testID={`trip-${item.id}`}
              onPress={() => router.push(phase === 'return' ? `/trip/${item.id}?leg=return` : `/trip/${item.id}`)}
            />
          )}
        />
      )}
      <Toast message={toast.message} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  stripWrap: { paddingTop: 12 },
  pinned: { paddingHorizontal: 16, paddingTop: 12 },
  filters: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  sortRow: { gap: 8, paddingRight: 16 },
  sortChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  sortText: { fontSize: 13, fontWeight: '600' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.md, padding: 12, marginHorizontal: 16, marginTop: 12 },
  list: { padding: 16, paddingBottom: 40 },
  count: { fontSize: 13, fontWeight: '600', marginBottom: 10 },
});
