import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/ui/Card';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { useCurrency } from '../../src/contexts/CurrencyContext';
import { searchPrices } from '../../src/api/search';
import { setSearchQuery } from '../../src/stores/searchStore';
import { getAlerts, removeAlert, updateAlertPrice, priceChange, type PriceAlert } from '../../src/utils/priceAlerts';
import { formatDayLabel, todayISO } from '../../src/utils/format';
import { haptic } from '../../src/utils/haptics';
import { radius } from '../../src/constants/theme';

export default function AlertsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { format } = useCurrency();
  const router = useRouter();
  const userKey = user?.email ?? 'anon';

  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [checking, setChecking] = useState<Record<string, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    const list = await getAlerts(userKey);
    if (!alive.current) return;
    setAlerts(list);
    setLoaded(true);

    const upcoming = list.filter(a => a.departDate >= todayISO());
    setChecking(Object.fromEntries(upcoming.map(a => [a.id, true])));
    await Promise.all(
      upcoming.map(async a => {
        try {
          const res = await searchPrices({ from: a.from.code, to: a.to.code, startDate: a.departDate, days: 1, adults: a.adults });
          await updateAlertPrice(userKey, a.id, res.prices[0]?.minPriceEur ?? null);
        } catch {
          // Keep the last known price when offline.
        } finally {
          if (alive.current) setChecking(c => ({ ...c, [a.id]: false }));
        }
      }),
    );
    if (alive.current) setAlerts(await getAlerts(userKey));
  }, [userKey]);

  useFocusEffect(
    useCallback(() => {
      alive.current = true;
      void refresh();
      return () => {
        alive.current = false;
      };
    }, [refresh]),
  );

  async function onPullRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  async function remove(id: string) {
    haptic.medium();
    await removeAlert(userKey, id);
    setAlerts(list => list.filter(a => a.id !== id));
  }

  function open(a: PriceAlert) {
    setSearchQuery({ from: a.from, to: a.to, departDate: a.departDate, adults: a.adults });
    router.push('/results');
  }

  const drops = alerts.filter(a => priceChange(a.baselinePriceEur, a.lastPriceEur).direction === 'down').length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title="Price alerts" large />
      {loaded && alerts.length === 0 ? (
        <EmptyState
          testID="alerts-empty"
          icon="notifications-outline"
          title="No price alerts yet"
          subtitle="Tap the bell on any search results page and we’ll keep an eye on the fare for you."
          actionLabel="Search trips"
          onAction={() => router.navigate('/(tabs)')}
        />
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={a => a.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onPullRefresh} tintColor={colors.accent} />}
          ListHeaderComponent={
            alerts.length > 0 ? (
              <Text style={[styles.summary, { color: colors.textSecondary }]}>
                {drops > 0 ? `🎉 ${drops} ${drops === 1 ? 'fare has' : 'fares have'} dropped since you started tracking` : 'Pull down to check the latest fares'}
              </Text>
            ) : null
          }
          renderItem={({ item: a }) => {
            const past = a.departDate < todayISO();
            const change = priceChange(a.baselinePriceEur, a.lastPriceEur);
            const tone = change.direction === 'down' ? colors.cheapest : change.direction === 'up' ? colors.error : colors.textSecondary;
            return (
              <Card testID={`alert-${a.id}`} onPress={past ? undefined : () => open(a)} style={[styles.card, past && { opacity: 0.6 }]}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.route, { color: colors.text }]}>{a.from.name} → {a.to.name}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                      {formatDayLabel(a.departDate)} · {a.adults} {a.adults === 1 ? 'adult' : 'adults'}
                      {past ? ' · Departed' : ''}
                    </Text>
                  </View>
                  <Pressable
                    testID={`remove-alert-${a.id}`}
                    onPress={() => remove(a.id)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={`Stop tracking ${a.from.name} to ${a.to.name}`}
                    style={[styles.remove, { backgroundColor: colors.surfaceAlt }]}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
                  </Pressable>
                </View>
                <View style={[styles.priceRow, { borderTopColor: colors.border }]}>
                  <View>
                    <Text style={[styles.caption, { color: colors.textTertiary }]}>NOW FROM</Text>
                    {checking[a.id] ? (
                      <ActivityIndicator testID={`alert-checking-${a.id}`} color={colors.accent} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
                    ) : (
                      <Text testID={`alert-price-${a.id}`} style={[styles.price, { color: colors.text }]}>
                        {a.lastPriceEur == null ? '—' : format(a.lastPriceEur)}
                      </Text>
                    )}
                  </View>
                  {!checking[a.id] && change.direction !== 'unknown' && (
                    <View testID={`alert-change-${a.id}`} style={[styles.badge, { backgroundColor: tone + '1f' }]}>
                      <Ionicons
                        name={change.direction === 'down' ? 'trending-down' : change.direction === 'up' ? 'trending-up' : 'remove'}
                        size={15}
                        color={tone}
                      />
                      <Text style={[styles.badgeText, { color: tone }]}>
                        {change.direction === 'same' ? 'No change' : `${change.direction === 'down' ? '−' : '+'}${format(change.amount)}`}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 8 }}>
                  Tracking since {format(a.baselinePriceEur)}
                </Text>
              </Card>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, paddingTop: 8, paddingBottom: 40 },
  summary: { fontSize: 13, fontWeight: '600', marginBottom: 12 },
  card: { marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  route: { fontSize: 17, fontWeight: '700' },
  remove: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, marginTop: 12, paddingTop: 12 },
  caption: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  price: { fontSize: 22, fontWeight: '800', marginTop: 2, fontVariant: ['tabular-nums'] },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 13, fontWeight: '700' },
});
