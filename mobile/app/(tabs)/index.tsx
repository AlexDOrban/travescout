import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Animated } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { useCurrency } from '../../src/contexts/CurrencyContext';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { CityPickerSheet } from '../../src/components/CityPickerSheet';
import { CalendarSheet } from '../../src/components/CalendarSheet';
import { setSearchQuery } from '../../src/stores/searchStore';
import { CITIES, type City } from '../../src/data/cities';
import { countryFlag } from '../../src/data/cityMatch';
import { addDays, formatDayLabel, todayISO } from '../../src/utils/format';
import { addRecentSearch, getRecentSearches, type RecentSearch } from '../../src/utils/recentSearches';
import { haptic } from '../../src/utils/haptics';
import { radius } from '../../src/constants/theme';

const byCode = (code: string) => CITIES.find(c => c.code === code)!;
const POPULAR_ROUTES: [string, string][] = [
  ['LON', 'PAR'], ['BER', 'PRG'], ['AMS', 'BRU'], ['VIE', 'BUD'], ['BCN', 'MAD'], ['MUC', 'ZRH'],
];

function greetingName(email?: string): string {
  const local = email?.split('@')[0]?.split(/[._-]/)[0] ?? '';
  return local ? local[0].toUpperCase() + local.slice(1) : 'traveller';
}

export default function SearchScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { currency, currencies, setCurrency } = useCurrency();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userKey = user?.email ?? 'anon';

  const [fromCity, setFromCity] = useState<City | null>(null);
  const [toCity, setToCity] = useState<City | null>(null);
  const [departDate, setDepartDate] = useState(() => addDays(todayISO(), 1));
  const [adults, setAdults] = useState(1);
  const [error, setError] = useState('');
  const [picker, setPicker] = useState<'from' | 'to' | 'date' | null>(null);
  const [recent, setRecent] = useState<RecentSearch[]>([]);
  const [spin] = useState(() => new Animated.Value(0));

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getRecentSearches(userKey).then(r => {
        if (!cancelled) setRecent(r);
      });
      return () => {
        cancelled = true;
      };
    }, [userKey]),
  );

  function swap() {
    haptic.light();
    Animated.timing(spin, { toValue: 1, duration: 260, useNativeDriver: true }).start(() => spin.setValue(0));
    setFromCity(toCity);
    setToCity(fromCity);
    setError('');
  }

  function cycleCurrency() {
    const idx = currencies.findIndex(c => c.code === currency.code);
    setCurrency(currencies[(idx + 1) % currencies.length]);
  }

  function fill(from: City, to: City, date?: string, pax?: number) {
    haptic.tap();
    setFromCity(from);
    setToCity(to);
    // A recent search's date may have passed; fall back to tomorrow.
    if (date && date >= todayISO()) setDepartDate(date);
    if (pax) setAdults(pax);
    setError('');
  }

  function handleSearch() {
    setError('');
    if (!fromCity) return setError('Choose where you’re leaving from');
    if (!toCity) return setError('Choose your destination');
    if (fromCity.code === toCity.code) return setError('Departure and destination must differ');
    if (departDate < todayISO()) return setError('Departure date cannot be in the past');

    const query = { from: fromCity, to: toCity, departDate, adults };
    void addRecentSearch(userKey, query);
    setSearchQuery(query);
    router.push('/results');
  }

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const recentCities = [...new Map(recent.flatMap(r => [r.from, r.to]).map(c => [c.code, c])).values()];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
        <LinearGradient
          colors={[colors.heroStart, colors.heroEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 16 }]}
        >
          <View style={styles.heroTop}>
            <View style={styles.brandRow}>
              <View style={[styles.logo, { backgroundColor: colors.accent }]}>
                <Ionicons name="navigate" size={15} color={colors.onAccent} />
              </View>
              <Text style={[styles.brand, { color: colors.onHero }]}>TraveScout</Text>
            </View>
            <Pressable
              testID="currency-pill"
              onPress={cycleCurrency}
              accessibilityRole="button"
              accessibilityLabel={`Currency ${currency.code}, tap to change`}
              style={styles.heroPill}
            >
              <Text style={styles.heroPillText}>{currency.symbol} {currency.code}</Text>
            </Pressable>
          </View>
          <Text style={[styles.hello, { color: colors.onHeroMuted }]}>Hi {greetingName(user?.email)} 👋</Text>
          <Text style={[styles.heroTitle, { color: colors.onHero }]}>Where to next?</Text>
          <Text style={[styles.heroSub, { color: colors.onHeroMuted }]}>Trains, buses and flights — compared in one search.</Text>
        </LinearGradient>

        <Card style={styles.searchCard}>
          <View style={styles.odWrap}>
            <Pressable
              testID="from-city"
              onPress={() => setPicker('from')}
              accessibilityRole="button"
              accessibilityLabel={fromCity ? `From ${fromCity.name}` : 'Choose departure city'}
              style={styles.field}
            >
              <View style={[styles.dotHollow, { borderColor: colors.textSecondary }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>From</Text>
                <Text numberOfLines={1} style={[styles.fieldValue, { color: fromCity ? colors.text : colors.textTertiary }]}>
                  {fromCity ? `${fromCity.name}` : 'Leaving from'}
                </Text>
              </View>
            </Pressable>
            <View style={[styles.odDivider, { backgroundColor: colors.border }]} />
            <Pressable
              testID="to-city"
              onPress={() => setPicker('to')}
              accessibilityRole="button"
              accessibilityLabel={toCity ? `To ${toCity.name}` : 'Choose destination city'}
              style={styles.field}
            >
              <Ionicons name="location" size={16} color={colors.accent} style={{ width: 14, marginLeft: -1 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>To</Text>
                <Text numberOfLines={1} style={[styles.fieldValue, { color: toCity ? colors.text : colors.textTertiary }]}>
                  {toCity ? `${toCity.name}` : 'Going to'}
                </Text>
              </View>
            </Pressable>
            <Pressable
              testID="swap-cities"
              onPress={swap}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Swap departure and destination"
              style={[styles.swap, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Animated.View style={{ transform: [{ rotate }] }}>
                <Ionicons name="swap-vertical" size={20} color={colors.accent} />
              </Animated.View>
            </Pressable>
          </View>

          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

          <View style={styles.bottomRow}>
            <Pressable
              testID="depart-date"
              onPress={() => setPicker('date')}
              accessibilityRole="button"
              accessibilityLabel={`Departure date ${formatDayLabel(departDate)}`}
              style={[styles.field, { flex: 1.3 }]}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
              <View>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Depart</Text>
                <Text testID="depart-date-value" style={[styles.fieldValue, { color: colors.text }]}>
                  {formatDayLabel(departDate)}
                </Text>
              </View>
            </Pressable>
            <View style={[styles.vDivider, { backgroundColor: colors.border }]} />
            <View style={[styles.field, { flex: 1, justifyContent: 'space-between' }]}>
              <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
              <Pressable
                testID="adults-minus"
                onPress={() => {
                  haptic.tap();
                  setAdults(a => Math.max(1, a - 1));
                }}
                disabled={adults <= 1}
                hitSlop={6}
                accessibilityLabel="Fewer passengers"
                style={[styles.step, { borderColor: colors.border, opacity: adults <= 1 ? 0.4 : 1 }]}
              >
                <Ionicons name="remove" size={16} color={colors.text} />
              </Pressable>
              <Text testID="adults-count" accessibilityLabel={`${adults} adults`} style={[styles.stepValue, { color: colors.text }]}>
                {adults}
              </Text>
              <Pressable
                testID="adults-plus"
                onPress={() => {
                  haptic.tap();
                  setAdults(a => Math.min(9, a + 1));
                }}
                disabled={adults >= 9}
                hitSlop={6}
                accessibilityLabel="More passengers"
                style={[styles.step, { borderColor: colors.border, opacity: adults >= 9 ? 0.4 : 1 }]}
              >
                <Ionicons name="add" size={16} color={colors.text} />
              </Pressable>
            </View>
          </View>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.error + '14' }]}>
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Text testID="error" style={{ color: colors.error, flex: 1, fontSize: 13 }}>{error}</Text>
            </View>
          ) : null}

          <Button testID="search-btn" title="Search" icon="search" onPress={handleSearch} style={{ marginTop: 14 }} />
        </Card>

        {recent.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent searches</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}>
              {recent.map(r => (
                <Card
                  key={`${r.from.code}-${r.to.code}`}
                  testID={`recent-${r.from.code}-${r.to.code}`}
                  onPress={() => fill(r.from, r.to, r.departDate, r.adults)}
                  style={styles.recentCard}
                  accessibilityLabel={`Search again ${r.from.name} to ${r.to.name}`}
                >
                  <View style={styles.recentRoute}>
                    <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                    <Text numberOfLines={1} style={[styles.recentText, { color: colors.text }]}>
                      {r.from.name} → {r.to.name}
                    </Text>
                  </View>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>
                    {formatDayLabel(r.departDate)} · {r.adults} {r.adults === 1 ? 'adult' : 'adults'}
                  </Text>
                </Card>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Popular routes</Text>
          <View style={styles.popularGrid}>
            {POPULAR_ROUTES.map(([a, b]) => {
              const from = byCode(a);
              const to = byCode(b);
              return (
                <Card
                  key={`${a}-${b}`}
                  testID={`popular-${a}-${b}`}
                  onPress={() => fill(from, to)}
                  style={styles.popularCard}
                  accessibilityLabel={`${from.name} to ${to.name}`}
                >
                  <Text style={styles.flags}>{countryFlag(from.country)} → {countryFlag(to.country)}</Text>
                  <Text numberOfLines={1} style={[styles.popularText, { color: colors.text }]}>{from.name}</Text>
                  <Text numberOfLines={1} style={{ color: colors.textSecondary, fontSize: 13 }}>to {to.name}</Text>
                </Card>
              );
            })}
          </View>
        </View>

        <View style={styles.usps}>
          {[
            ['pricetag-outline', 'Compare every mode'],
            ['shield-checkmark-outline', 'Secure checkout'],
            ['qr-code-outline', 'Tickets in one place'],
          ].map(([icon, label]) => (
            <View key={label} style={styles.usp}>
              <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={18} color={colors.accent} />
              <Text style={[styles.uspText, { color: colors.textSecondary }]}>{label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* One sheet for both ends: iOS can't dismiss one Modal and present
          another in the same frame, so From → To flows by switching mode. */}
      <CityPickerSheet
        visible={picker === 'from' || picker === 'to'}
        title={picker === 'to' ? 'Going to' : 'Leaving from'}
        testID={picker === 'to' ? 'to-picker' : 'from-picker'}
        recent={recentCities}
        excludeCode={picker === 'to' ? fromCity?.code : toCity?.code}
        onClose={() => setPicker(null)}
        onSelect={c => {
          setError('');
          if (picker === 'to') {
            setToCity(c);
            setPicker(null);
          } else {
            setFromCity(c);
            // Flow straight on to the destination like Omio/Trainline.
            setPicker(toCity ? null : 'to');
          }
        }}
      />
      <CalendarSheet
        visible={picker === 'date'}
        testID="calendar"
        value={departDate}
        onClose={() => setPicker(null)}
        onSelect={iso => {
          setDepartDate(iso);
          setError('');
          setPicker(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingBottom: 72 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  brand: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  heroPill: { backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  heroPillText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  hello: { fontSize: 15, fontWeight: '500' },
  heroTitle: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8, marginTop: 2 },
  heroSub: { fontSize: 15, marginTop: 6, lineHeight: 21 },
  searchCard: { marginHorizontal: 16, marginTop: -52, padding: 8, paddingBottom: 14 },
  odWrap: { position: 'relative' },
  field: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 10, paddingVertical: 10, minHeight: 56 },
  fieldLabel: { fontSize: 12, fontWeight: '600' },
  fieldValue: { fontSize: 17, fontWeight: '700', marginTop: 1 },
  dotHollow: { width: 12, height: 12, borderRadius: 6, borderWidth: 2.5 },
  odDivider: { height: StyleSheet.hairlineWidth, marginLeft: 36, marginRight: 64 },
  swap: {
    position: 'absolute', right: 10, top: '50%', marginTop: -21,
    width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  rowDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 10 },
  bottomRow: { flexDirection: 'row', alignItems: 'center' },
  vDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginVertical: 8 },
  step: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontSize: 17, fontWeight: '700', minWidth: 16, textAlign: 'center', fontVariant: ['tabular-nums'] },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.sm, padding: 10, marginHorizontal: 8, marginTop: 8 },
  section: { marginTop: 28 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12, paddingHorizontal: 16, letterSpacing: -0.2 },
  recentCard: { width: 210, padding: 14 },
  recentRoute: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recentText: { fontSize: 15, fontWeight: '700', flex: 1 },
  popularGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16 },
  popularCard: { width: '48%', flexGrow: 1, flexBasis: '45%', padding: 14 },
  flags: { fontSize: 18, marginBottom: 8 },
  popularText: { fontSize: 16, fontWeight: '700' },
  usps: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 28, paddingHorizontal: 16 },
  usp: { alignItems: 'center', gap: 6, flex: 1 },
  uspText: { fontSize: 12, textAlign: 'center', fontWeight: '500' },
});
