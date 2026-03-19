import React, { useState, useMemo } from 'react';
import { View, FlatList, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/contexts/ThemeContext';
import { AppHeader } from '../src/components/AppHeader';
import { TripCard } from '../src/components/TripCard';
import {
  FilterChips,
  TransportFilter,
  SortMode,
} from '../src/components/FilterChips';
import { getSearchResults, getSearchMeta } from '../src/stores/searchStore';

export default function ResultsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const results = getSearchResults();
  const meta = getSearchMeta();
  const [transport, setTransport] = useState<TransportFilter>('all');
  const [sort, setSort] = useState<SortMode>('smart');

  const filtered = useMemo(() => {
    let list =
      transport === 'all'
        ? results
        : results.filter(t => t.transportType === transport);

    switch (sort) {
      case 'price':
        return [...list].sort((a, b) => a.priceEur - b.priceEur);
      case 'duration':
        return [...list].sort((a, b) => a.durationMins - b.durationMins);
      case 'departure':
        return [...list].sort((a, b) => a.departAt.localeCompare(b.departAt));
      default: // smart — sort by composite score descending
        return [...list].sort((a, b) => b.score - a.score);
    }
  }, [results, transport, sort]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title={meta ? `${meta.from} → ${meta.to}` : 'Results'} />
      <View style={styles.filters}>
        <FilterChips
          transport={transport}
          onTransportChange={setTransport}
          sort={sort}
          onSortChange={setSort}
        />
      </View>
      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text
            testID="empty-text"
            style={{ color: colors.textSecondary, fontSize: 16 }}
          >
            No results found
          </Text>
        </View>
      ) : (
        <FlatList
          testID="results-list"
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TripCard
              trip={item}
              testID={`trip-${item.id}`}
              onPress={() => router.push(`/trip/${item.id}`)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filters: { padding: 16 },
  list: { padding: 16, paddingTop: 0 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
