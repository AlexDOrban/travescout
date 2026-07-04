import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { AppHeader } from '../../src/components/AppHeader';
import { Stepper } from '../../src/components/Stepper';
import { TravelModeChips } from '../../src/components/TravelModeChips';
import {
  getCheckoutTrip,
  getCheckoutItinerary,
  setCheckoutTransfer,
} from '../../src/stores/checkoutStore';
import type { MapTravelMode } from '../../src/utils/maps';

// Optional checkout step: where the traveller actually starts (home, hotel…)
// and their final destination after the last leg, plus the preferred travel
// mode for the airport/station access directions on the trip's map route.
export default function TransferScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const trip = getCheckoutTrip();
  const itinerary = getCheckoutItinerary();
  const [startAddress, setStartAddress] = useState('');
  const [endAddress, setEndAddress] = useState('');
  const [mode, setMode] = useState<MapTravelMode>('transit');

  if (!trip && !itinerary) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>No trip selected</Text>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
          <Text style={{ color: colors.accent, marginTop: 12 }}>Back to Search</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const routeOrigin = trip ? trip.origin : itinerary!.legs[0].originName;
  const routeDestination = trip
    ? trip.destination
    : itinerary!.legs[itinerary!.legs.length - 1].destinationName;

  function handleContinue() {
    setCheckoutTransfer({
      startAddress: startAddress.trim(),
      endAddress: endAddress.trim(),
      travelMode: mode,
    });
    router.push('/checkout/passengers');
  }

  const inputStyle = [
    styles.input,
    { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        keyboardShouldPersistTaps="handled"
      >
        <AppHeader title="Getting There" showBack />
        <Stepper steps={['Transfer', 'Passengers', 'Review', 'Pay']} current={0} colors={colors} />
        <View style={styles.content}>
          <Text style={[styles.route, { color: colors.text }]}>
            {routeOrigin} → {routeDestination}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
            Tell us where you start and where you’re finally headed, and we’ll include
            directions to and from the airport or station on your trip’s map route. You can
            change all of this at any time from My Trips.
          </Text>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Leaving from (home, hotel, address…)
            </Text>
            <TextInput
              testID="transfer-start"
              style={inputStyle}
              value={startAddress}
              onChangeText={setStartAddress}
              placeholder="e.g. Savoy Hotel, London"
              placeholderTextColor={colors.textSecondary}
            />
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Final destination (hotel, venue, address…)
            </Text>
            <TextInput
              testID="transfer-end"
              style={inputStyle}
              value={endAddress}
              onChangeText={setEndAddress}
              placeholder="e.g. Hôtel Lutetia, Paris"
              placeholderTextColor={colors.textSecondary}
            />
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Preferred way to get there
            </Text>
            <TravelModeChips
              mode={mode}
              onChange={setMode}
              colors={colors}
              testIDPrefix="transfer-mode"
            />
          </View>

          <TouchableOpacity
            testID="transfer-continue"
            style={[styles.button, { backgroundColor: colors.accent }]}
            onPress={handleContinue}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="transfer-skip"
            style={styles.skip}
            onPress={() => router.push('/checkout/passengers')}
          >
            <Text style={{ color: colors.textSecondary }}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, gap: 12 },
  route: { fontSize: 18, fontWeight: '700' },
  card: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 8 },
  label: { fontSize: 12, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  button: { borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  skip: { alignItems: 'center', padding: 12 },
});
