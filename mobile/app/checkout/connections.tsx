import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useCurrency } from '../../src/contexts/CurrencyContext';
import { AppHeader } from '../../src/components/AppHeader';
import { TRANSPORT_ICON } from '../../src/constants/transport';
import {
  getCheckoutItinerary,
  setCheckoutItinerary,
} from '../../src/stores/checkoutStore';
import { getSearchMeta } from '../../src/stores/searchStore';
import { searchConnections } from '../../src/api/itinerary';
import {
  needsDepartureConnection,
  needsArrivalConnection,
} from '../../src/utils/connections';
import type { Leg } from '../../src/types/itinerary';

export default function ConnectionsScreen() {
  const { colors } = useTheme();
  const { format } = useCurrency();
  const router = useRouter();

  const itinerary = getCheckoutItinerary();
  const searchMeta = getSearchMeta();
  const mainLeg = itinerary?.legs[0] ?? null;
  const adults = itinerary?.adults ?? 1;

  const originCityCode = searchMeta?.from ?? '';
  const destCityCode = searchMeta?.to ?? '';

  const showDeparture = mainLeg
    ? needsDepartureConnection(originCityCode, mainLeg.origin)
    : false;
  const showArrival = mainLeg
    ? needsArrivalConnection(destCityCode, mainLeg.destination)
    : false;

  const [departureOptions, setDepartureOptions] = useState<Leg[]>([]);
  const [arrivalOptions, setArrivalOptions] = useState<Leg[]>([]);
  const [selectedDeparture, setSelectedDeparture] = useState<Leg | null>(null);
  const [selectedArrival, setSelectedArrival] = useState<Leg | null>(null);
  const [skipDeparture, setSkipDeparture] = useState(false);
  const [skipArrival, setSkipArrival] = useState(false);

  const [loadingDeparture, setLoadingDeparture] = useState(false);
  const [loadingArrival, setLoadingArrival] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!mainLeg) return;

    async function fetchConnections() {
      setError('');
      const promises: Promise<void>[] = [];

      if (showDeparture) {
        setLoadingDeparture(true);
        promises.push(
          searchConnections({
            hub: mainLeg!.origin,
            cityCode: originCityCode,
            direction: 'to',
            dateTime: mainLeg!.departAt,
            adults,
          })
            .then(res => {
              setDepartureOptions(res.connections);
            })
            .catch(err => {
              setError(err.message || 'Failed to load connections');
            })
            .finally(() => setLoadingDeparture(false)),
        );
      }

      if (showArrival) {
        setLoadingArrival(true);
        promises.push(
          searchConnections({
            hub: mainLeg!.destination,
            cityCode: destCityCode,
            direction: 'from',
            dateTime: mainLeg!.arriveAt,
            adults,
          })
            .then(res => {
              setArrivalOptions(res.connections);
            })
            .catch(err => {
              setError(err.message || 'Failed to load connections');
            })
            .finally(() => setLoadingArrival(false)),
        );
      }

      await Promise.all(promises);
    }

    fetchConnections();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleRetry() {
    setError('');
    setLoadingDeparture(false);
    setLoadingArrival(false);
    // Re-trigger by toggling state — simplest approach: re-mount would be ideal
    // Instead, just call fetch again inline
    if (!mainLeg) return;

    if (showDeparture) {
      setLoadingDeparture(true);
      searchConnections({
        hub: mainLeg.origin,
        cityCode: originCityCode,
        direction: 'to',
        dateTime: mainLeg.departAt,
        adults,
      })
        .then(res => setDepartureOptions(res.connections))
        .catch(err => setError(err.message || 'Failed to load connections'))
        .finally(() => setLoadingDeparture(false));
    }

    if (showArrival) {
      setLoadingArrival(true);
      searchConnections({
        hub: mainLeg.destination,
        cityCode: destCityCode,
        direction: 'from',
        dateTime: mainLeg.arriveAt,
        adults,
      })
        .then(res => setArrivalOptions(res.connections))
        .catch(err => setError(err.message || 'Failed to load connections'))
        .finally(() => setLoadingArrival(false));
    }
  }

  function handleContinue() {
    if (!mainLeg) return;
    const depLeg = skipDeparture ? undefined : (selectedDeparture ?? undefined);
    const arrLeg = skipArrival ? undefined : (selectedArrival ?? undefined);
    setCheckoutItinerary(mainLeg, adults, depLeg, arrLeg);
    router.push('/checkout/passengers');
  }

  function minutesBefore(connectionArriveAt: string, mainDepartAt: string): number {
    return Math.round(
      (new Date(mainDepartAt).getTime() - new Date(connectionArriveAt).getTime()) /
        (1000 * 60),
    );
  }

  function minutesAfter(mainArriveAt: string, connectionDepartAt: string): number {
    return Math.round(
      (new Date(connectionDepartAt).getTime() - new Date(mainArriveAt).getTime()) /
        (1000 * 60),
    );
  }

  if (!mainLeg) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>No itinerary selected</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: colors.accent, marginTop: 12 }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const needsAny = showDeparture || showArrival;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title="Add Connections" />
      <View style={styles.content}>

        {!needsAny && (
          <View testID="no-connections" style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>No connections needed</Text>
            <Text style={{ color: colors.textSecondary }}>
              Your route departs and arrives at your search cities
            </Text>
          </View>
        )}

        {error ? (
          <View testID="error-container">
            <Text testID="error" style={{ color: colors.error, marginBottom: 8 }}>{error}</Text>
            <TouchableOpacity
              testID="retry-btn"
              style={[styles.retryButton, { borderColor: colors.accent }]}
              onPress={handleRetry}
            >
              <Text style={{ color: colors.accent }}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {showDeparture && (
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Getting to {mainLeg.origin}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Bus & train options from {searchMeta?.from}
            </Text>

            {loadingDeparture ? (
              <ActivityIndicator testID="departure-loading" color={colors.accent} style={styles.spinner} />
            ) : (
              <>
                {departureOptions.map(leg => {
                  const isSelected = selectedDeparture?.id === leg.id;
                  const minsBuffer = minutesBefore(leg.arriveAt, mainLeg.departAt);
                  return (
                    <TouchableOpacity
                      key={leg.id}
                      testID={`departure-option-${leg.id}`}
                      style={[
                        styles.card,
                        {
                          backgroundColor: colors.card,
                          borderColor: isSelected ? colors.accent : colors.border,
                          borderWidth: isSelected ? 2 : 1,
                        },
                      ]}
                      onPress={() => {
                        setSelectedDeparture(isSelected ? null : leg);
                        setSkipDeparture(false);
                      }}
                    >
                      <Text style={{ fontSize: 20 }}>
                        {TRANSPORT_ICON[leg.transportType] ?? '🚐'}
                      </Text>
                      <Text style={[styles.route, { color: colors.text }]}>
                        {leg.origin} → {leg.destination}
                      </Text>
                      <Text style={{ color: colors.textSecondary }}>
                        {new Date(leg.departAt).toLocaleString()} – {new Date(leg.arriveAt).toLocaleString()}
                      </Text>
                      <Text style={{ color: colors.textSecondary }}>
                        {minsBuffer} min before main leg
                      </Text>
                      <Text style={{ color: colors.cheapest, fontWeight: '600' }}>
                        {format(leg.priceEur)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  testID="skip-departure"
                  style={[
                    styles.skipButton,
                    {
                      borderColor: skipDeparture ? colors.accent : colors.border,
                    },
                  ]}
                  onPress={() => {
                    setSkipDeparture(s => !s);
                    setSelectedDeparture(null);
                  }}
                >
                  <Text style={{ color: skipDeparture ? colors.accent : colors.textSecondary }}>
                    Skip — I&apos;ll get there myself
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {showArrival && (
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Getting from {mainLeg.destination}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Bus & train options to {searchMeta?.to}
            </Text>

            {loadingArrival ? (
              <ActivityIndicator testID="arrival-loading" color={colors.accent} style={styles.spinner} />
            ) : (
              <>
                {arrivalOptions.map(leg => {
                  const isSelected = selectedArrival?.id === leg.id;
                  const minsBuffer = minutesAfter(mainLeg.arriveAt, leg.departAt);
                  return (
                    <TouchableOpacity
                      key={leg.id}
                      testID={`arrival-option-${leg.id}`}
                      style={[
                        styles.card,
                        {
                          backgroundColor: colors.card,
                          borderColor: isSelected ? colors.accent : colors.border,
                          borderWidth: isSelected ? 2 : 1,
                        },
                      ]}
                      onPress={() => {
                        setSelectedArrival(isSelected ? null : leg);
                        setSkipArrival(false);
                      }}
                    >
                      <Text style={{ fontSize: 20 }}>
                        {TRANSPORT_ICON[leg.transportType] ?? '🚐'}
                      </Text>
                      <Text style={[styles.route, { color: colors.text }]}>
                        {leg.origin} → {leg.destination}
                      </Text>
                      <Text style={{ color: colors.textSecondary }}>
                        {new Date(leg.departAt).toLocaleString()} – {new Date(leg.arriveAt).toLocaleString()}
                      </Text>
                      <Text style={{ color: colors.textSecondary }}>
                        {minsBuffer} min after main leg
                      </Text>
                      <Text style={{ color: colors.cheapest, fontWeight: '600' }}>
                        {format(leg.priceEur)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  testID="skip-arrival"
                  style={[
                    styles.skipButton,
                    {
                      borderColor: skipArrival ? colors.accent : colors.border,
                    },
                  ]}
                  onPress={() => {
                    setSkipArrival(s => !s);
                    setSelectedArrival(null);
                  }}
                >
                  <Text style={{ color: skipArrival ? colors.accent : colors.textSecondary }}>
                    Skip — I&apos;ll get there myself
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        <TouchableOpacity
          testID="continue-btn"
          style={[styles.button, { backgroundColor: colors.accent }]}
          onPress={handleContinue}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 13, marginBottom: 8 },
  card: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 6 },
  route: { fontSize: 16, fontWeight: '600' },
  spinner: { marginVertical: 16 },
  skipButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  retryButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  button: { borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
