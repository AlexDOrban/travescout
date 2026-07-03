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
import { Stepper } from '../../src/components/Stepper';
import { TRANSPORT_ICON } from '../../src/constants/transport';
import {
  getCheckoutItinerary,
  getCheckoutMainLeg,
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
  // Never derive the main leg from legs[0]: once connections are added the
  // first leg is the departure feeder, not the main leg.
  const mainLeg = getCheckoutMainLeg();
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
  const [departureError, setDepartureError] = useState('');
  const [arrivalError, setArrivalError] = useState('');
  const [departureLoaded, setDepartureLoaded] = useState(false);
  const [arrivalLoaded, setArrivalLoaded] = useState(false);
  const [departureNote, setDepartureNote] = useState('');
  const [arrivalNote, setArrivalNote] = useState('');

  function fetchDeparture() {
    if (!mainLeg || !showDeparture) return;
    setDepartureError('');
    setDepartureNote('');
    setLoadingDeparture(true);
    searchConnections({
      hub: mainLeg.origin,
      cityCode: originCityCode,
      direction: 'to',
      dateTime: mainLeg.departAt,
      adults,
    })
      .then(res => {
        // Drop options that don't actually connect (negative buffer).
        setDepartureOptions(
          res.connections.filter(leg => minutesBefore(leg.arriveAt, mainLeg.departAt) > 0),
        );
        if (res.meta?.providersFailed?.length) {
          setDepartureNote(`Some providers didn't respond (${res.meta.providersFailed.join(', ')}).`);
        }
      })
      .catch(err => setDepartureError(err.message || 'Failed to load connections'))
      .finally(() => {
        setLoadingDeparture(false);
        setDepartureLoaded(true);
      });
  }

  function fetchArrival() {
    if (!mainLeg || !showArrival) return;
    setArrivalError('');
    setArrivalNote('');
    setLoadingArrival(true);
    searchConnections({
      hub: mainLeg.destination,
      cityCode: destCityCode,
      direction: 'from',
      dateTime: mainLeg.arriveAt,
      adults,
    })
      .then(res => {
        setArrivalOptions(
          res.connections.filter(leg => minutesAfter(mainLeg.arriveAt, leg.departAt) > 0),
        );
        if (res.meta?.providersFailed?.length) {
          setArrivalNote(`Some providers didn't respond (${res.meta.providersFailed.join(', ')}).`);
        }
      })
      .catch(err => setArrivalError(err.message || 'Failed to load connections'))
      .finally(() => {
        setLoadingArrival(false);
        setArrivalLoaded(true);
      });
  }

  useEffect(() => {
    // The loading flags flip synchronously here by design: both sections must
    // show spinners on first paint, before the network round-trips resolve.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDeparture();
    fetchArrival();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const shortTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const bufferLabel = (mins: number) =>
    mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60 ? `${mins % 60}m` : ''}`.trim() : `${mins} min`;

  const totalEur =
    mainLeg.priceEur +
    (skipDeparture ? 0 : selectedDeparture?.priceEur ?? 0) +
    (skipArrival ? 0 : selectedArrival?.priceEur ?? 0);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title="Add Connections" showBack />
      <Stepper steps={['Route', 'Connections', 'Book']} current={1} colors={colors} />
      <View style={styles.content}>

        {/* Selected main leg summary */}
        <View
          testID="selected-main-leg"
          style={[styles.selectedCard, { backgroundColor: colors.accent + '14', borderColor: colors.accent }]}
        >
          <Text style={[styles.selectedLabel, { color: colors.accent }]}>
            {TRANSPORT_ICON[mainLeg.transportType] ?? '🚐'} YOUR SELECTED{' '}
            {mainLeg.transportType === 'flight' ? 'FLIGHT' : mainLeg.transportType === 'train' ? 'TRAIN' : 'BUS'}
          </Text>
          <View style={styles.selectedRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.route, { color: colors.text }]}>
                {mainLeg.origin} → {mainLeg.destination}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                {shortTime(mainLeg.departAt)} → {shortTime(mainLeg.arriveAt)}
              </Text>
            </View>
            <Text style={{ color: colors.cheapest, fontWeight: '700', fontSize: 16 }}>
              {format(mainLeg.priceEur)}
            </Text>
          </View>
        </View>

        {!needsAny && (
          <View testID="no-connections" style={[styles.noConnCard, { borderColor: colors.border }]}>
            <Text style={{ fontSize: 32 }}>✅</Text>
            <Text style={[styles.sectionTitle, { color: colors.cheapest }]}>No connections needed</Text>
            <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
              Your route departs and arrives at your search cities
            </Text>
          </View>
        )}

        {showDeparture && (
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Getting to {mainLeg.origin}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Bus & train options from {searchMeta?.from}
            </Text>

            {departureError ? (
              <View testID="departure-error-container">
                <Text testID="departure-error" style={{ color: colors.error, marginBottom: 8 }}>
                  {departureError}
                </Text>
                <TouchableOpacity
                  testID="departure-retry-btn"
                  style={[styles.retryButton, { borderColor: colors.accent }]}
                  onPress={fetchDeparture}
                >
                  <Text style={{ color: colors.accent }}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {departureNote ? (
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 6 }}>{departureNote}</Text>
            ) : null}

            {loadingDeparture ? (
              <ActivityIndicator testID="departure-loading" color={colors.accent} style={styles.spinner} />
            ) : (
              <>
                {!departureError && departureLoaded && departureOptions.length === 0 ? (
                  <View testID="departure-empty" style={[styles.emptyCard, { borderColor: colors.border }]}>
                    <Text style={{ color: colors.textSecondary }}>
                      No connecting bus or train found for this time. You can skip and arrange your own way.
                    </Text>
                  </View>
                ) : null}
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
                      <View style={styles.optionRow}>
                        <Text style={{ fontSize: 20 }}>
                          {TRANSPORT_ICON[leg.transportType] ?? '🚐'}
                        </Text>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.route, { color: colors.text }]}>
                            {leg.originName ?? leg.origin} → {leg.destinationName ?? leg.destination}
                          </Text>
                          <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                            {shortTime(leg.departAt)} → {shortTime(leg.arriveAt)} · {leg.provider}
                          </Text>
                          <Text
                            style={{
                              color: minsBuffer < 60 ? colors.warning : colors.cheapest,
                              fontSize: 13,
                              marginTop: 2,
                            }}
                          >
                            {minsBuffer < 60 ? '⚠' : '✓'} {bufferLabel(minsBuffer)} before main leg
                          </Text>
                        </View>
                        <Text style={{ color: colors.cheapest, fontWeight: '700', fontSize: 16 }}>
                          {format(leg.priceEur)}
                        </Text>
                      </View>
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

            {arrivalError ? (
              <View testID="arrival-error-container">
                <Text testID="arrival-error" style={{ color: colors.error, marginBottom: 8 }}>
                  {arrivalError}
                </Text>
                <TouchableOpacity
                  testID="arrival-retry-btn"
                  style={[styles.retryButton, { borderColor: colors.accent }]}
                  onPress={fetchArrival}
                >
                  <Text style={{ color: colors.accent }}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {arrivalNote ? (
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 6 }}>{arrivalNote}</Text>
            ) : null}

            {loadingArrival ? (
              <ActivityIndicator testID="arrival-loading" color={colors.accent} style={styles.spinner} />
            ) : (
              <>
                {!arrivalError && arrivalLoaded && arrivalOptions.length === 0 ? (
                  <View testID="arrival-empty" style={[styles.emptyCard, { borderColor: colors.border }]}>
                    <Text style={{ color: colors.textSecondary }}>
                      No connecting bus or train found for this time. You can skip and arrange your own way.
                    </Text>
                  </View>
                ) : null}
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
                      <View style={styles.optionRow}>
                        <Text style={{ fontSize: 20 }}>
                          {TRANSPORT_ICON[leg.transportType] ?? '🚐'}
                        </Text>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.route, { color: colors.text }]}>
                            {leg.originName ?? leg.origin} → {leg.destinationName ?? leg.destination}
                          </Text>
                          <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                            {shortTime(leg.departAt)} → {shortTime(leg.arriveAt)} · {leg.provider}
                          </Text>
                          <Text
                            style={{
                              color: minsBuffer < 45 ? colors.warning : colors.cheapest,
                              fontSize: 13,
                              marginTop: 2,
                            }}
                          >
                            {minsBuffer < 45 ? '⚠' : '✓'} {bufferLabel(minsBuffer)} after main leg
                          </Text>
                        </View>
                        <Text style={{ color: colors.cheapest, fontWeight: '700', fontSize: 16 }}>
                          {format(leg.priceEur)}
                        </Text>
                      </View>
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
          <Text style={styles.buttonText}>Continue to Booking · {format(totalEur)} total</Text>
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
  card: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 6, marginBottom: 8 },
  selectedCard: { borderWidth: 1.5, borderRadius: 14, padding: 14, gap: 8 },
  selectedLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6 },
  selectedRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  noConnCard: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyCard: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  route: { fontSize: 16, fontWeight: '600' },
  spinner: { marginVertical: 16 },
  skipButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
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
