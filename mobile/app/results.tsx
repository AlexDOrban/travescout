import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { View, FlatList, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
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
  type SearchQuery,
} from '../src/stores/searchStore';
import { search, searchPrices } from '../src/api/search';
import type { RankedTrip, SearchMeta } from '../src/types/trip';
import { addDays, formatDayLabel, todayISO } from '../src/utils/format';
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

// Seven days around the selected date, never before today.
function dateWindow(selected: string): string[] {
  const today = todayISO();
  let start = addDays(selected, -3);
  if (start < today) start = today;
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export default function ResultsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { format } = useCurrency();
  const router = useRouter();
  const userKey = user?.email ?? 'anon';
  const toast = useToast();

  const [query, setQuery] = useState<SearchQuery | null>(getSearchQuery());
  const [results, setResults] = useState<RankedTrip[]>(getSearchResults());
  const [meta, setMeta] = useState<SearchMeta | null>(getSearchMeta());
  const [loading, setLoading] = useState(!metaMatches(getSearchMeta(), getSearchQuery()));
  const [error, setError] = useState('');
  const [prices, setPrices] = useState<Record<string, number | null | undefined>>({});
  const [watching, setWatching] = useState(false);
  const [transport, setTransport] = useState<TransportFilter>('all');
  const [sort, setSort] = useState<SortMode>('smart');
  const requestId = useRef(0);

  const runSearch = useCallback(async (q: SearchQuery) => {
    const id = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const data = await search({ from: q.from.code, to: q.to.code, departDate: q.departDate, adults: q.adults });
      if (id !== requestId.current) return; // a newer date was tapped meanwhile
      setSearchResults(data.results, data.meta);
      setResults(data.results);
      setMeta(data.meta);
    } catch (e: any) {
      if (id === requestId.current) setError(e.message || 'Search failed');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  // First load (search screen navigates here immediately and we fetch).
  useEffect(() => {
    // Only on mount; later searches are triggered explicitly. runSearch flips
    // the loading flag synchronously by design (skeletons on first paint).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (query && !metaMatches(getSearchMeta(), query)) void runSearch(query);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-read the store whenever this screen regains focus, so backing into an
  // older results screen after a newer search doesn't show a stale list whose
  // cards no longer resolve ("Trip not found").
  useFocusEffect(
    useCallback(() => {
      const storedQuery = getSearchQuery();
      if (storedQuery && query && storedQuery !== query) setQuery(storedQuery);
      if (metaMatches(getSearchMeta(), storedQuery)) {
        setResults(getSearchResults());
        setMeta(getSearchMeta());
      }
    }, [query]),
  );

  const dates = useMemo(() => (query ? dateWindow(query.departDate) : []), [query]);

  // Cheapest fare per day for the strip (backend caches per day).
  useEffect(() => {
    if (!query || dates.length === 0) return;
    let cancelled = false;
    searchPrices({ from: query.from.code, to: query.to.code, startDate: dates[0], days: dates.length, adults: query.adults })
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
  }, [query, dates]);

  useEffect(() => {
    if (!query) return;
    let cancelled = false;
    findAlert(userKey, query).then(a => {
      if (!cancelled) setWatching(!!a);
    });
    return () => {
      cancelled = true;
    };
  }, [query, userKey]);

  function changeDate(iso: string) {
    if (!query || iso === query.departDate) return;
    const next = { ...query, departDate: iso };
    setSearchQuery(next);
    setQuery(next);
    void runSearch(next);
  }

  const cheapestOverall = results.length ? Math.min(...results.map(r => r.priceEur)) : null;

  async function toggleWatch() {
    if (!query) return;
    if (watching) {
      await removeAlert(userKey, alertId(query));
      setWatching(false);
      haptic.tap();
      toast.show('Price alert removed');
    } else {
      if (cheapestOverall == null) {
        toast.show('No fares to track for this date yet');
        return;
      }
      await addAlert(userKey, { ...query, priceEur: cheapestOverall });
      setWatching(true);
      haptic.success();
      toast.show('We’ll track this price in Alerts');
    }
  }

  const cheapestByMode = useMemo(() => {
    const out: Record<string, number> = {};
    for (const r of results) {
      out.all = Math.min(out.all ?? Infinity, r.priceEur);
      out[r.transportType] = Math.min(out[r.transportType] ?? Infinity, r.priceEur);
    }
    return out;
  }, [results]);

  const filtered = useMemo(() => {
    const list = transport === 'all' ? results : results.filter(t => t.transportType === transport);
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
  }, [results, transport, sort]);

  const title = query ? `${query.from.name} → ${query.to.name}` : meta ? `${meta.from} → ${meta.to}` : 'Results';
  const adults = query?.adults ?? meta?.adults ?? 1;
  const subtitle = query || meta
    ? `${formatDayLabel(query?.departDate ?? meta!.departDate)} · ${adults} ${adults === 1 ? 'adult' : 'adults'}`
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
          query ? (
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

      {query && (
        <View style={styles.stripWrap}>
          <DateStrip dates={dates} selected={query.departDate} prices={prices} onSelect={changeDate} />
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
          onAction={() => query && runSearch(query)}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          testID="empty-text"
          icon="search-outline"
          title={results.length === 0 ? 'No trips found' : `No ${transport === 'all' ? '' : `${transport} `}trips`}
          subtitle={results.length === 0 ? 'Try another date from the strip above.' : 'Try another mode or clear the filter.'}
          actionLabel={results.length > 0 ? 'Show all modes' : undefined}
          onAction={results.length > 0 ? () => setTransport('all') : undefined}
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
            <TripCard trip={item} testID={`trip-${item.id}`} onPress={() => router.push(`/trip/${item.id}`)} />
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
  filters: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  sortRow: { gap: 8, paddingRight: 16 },
  sortChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  sortText: { fontSize: 13, fontWeight: '600' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.md, padding: 12, marginHorizontal: 16, marginTop: 12 },
  list: { padding: 16, paddingBottom: 40 },
  count: { fontSize: 13, fontWeight: '600', marginBottom: 10 },
});
