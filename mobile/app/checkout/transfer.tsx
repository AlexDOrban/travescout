import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { AppHeader } from '../../src/components/AppHeader';
import { Stepper, checkoutSteps } from '../../src/components/Stepper';
import { Card } from '../../src/components/ui/Card';
import { BottomBar } from '../../src/components/ui/BottomBar';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { TravelModeChips } from '../../src/components/TravelModeChips';
import {
  getCheckoutTrip,
  getCheckoutItinerary,
  setCheckoutTransfer,
  getCheckoutTransfer,
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
  // Seed from the store so backing into this step keeps what was typed.
  const saved = getCheckoutTransfer();
  const [startAddress, setStartAddress] = useState(saved.startAddress);
  const [endAddress, setEndAddress] = useState(saved.endAddress);
  const [mode, setMode] = useState<MapTravelMode>(saved.travelMode);

  if (!trip && !itinerary) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState icon="alert-circle-outline" title="No trip selected" actionLabel="Back to Search" onAction={() => router.replace('/(tabs)')} />
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
    { color: colors.text, backgroundColor: colors.surfaceAlt },
  ];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppHeader title="Getting there" subtitle={`${routeOrigin} → ${routeDestination}`} showBack />
      <Stepper steps={checkoutSteps(!!itinerary)} current={itinerary ? 1 : 0} colors={colors} />
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View style={[styles.intro, { backgroundColor: colors.accentSoft }]}>
          <Ionicons name="navigate-circle" size={22} color={colors.accent} />
          <Text style={{ color: colors.text, fontSize: 14, flex: 1, lineHeight: 20 }}>
            Add where you start and where you’re finally headed — we’ll add door-to-door
            directions to your trip. Optional, and editable any time from My Trips.
          </Text>
        </View>

        <Card style={{ gap: 10 }}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Leaving from</Text>
          <View style={styles.inputRow}>
            <View style={[styles.dot, { borderColor: colors.textSecondary }]} />
            <TextInput
              testID="transfer-start"
              style={inputStyle}
              value={startAddress}
              onChangeText={setStartAddress}
              placeholder="Home, hotel or address"
              placeholderTextColor={colors.textTertiary}
              textContentType="fullStreetAddress"
            />
          </View>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Final destination</Text>
          <View style={styles.inputRow}>
            <Ionicons name="location" size={16} color={colors.accent} style={{ width: 12 }} />
            <TextInput
              testID="transfer-end"
              style={inputStyle}
              value={endAddress}
              onChangeText={setEndAddress}
              placeholder="Hotel, venue or address"
              placeholderTextColor={colors.textTertiary}
              textContentType="fullStreetAddress"
            />
          </View>
          <Text style={[styles.label, { color: colors.textSecondary, marginTop: 6 }]}>Preferred way to get there</Text>
          <TravelModeChips mode={mode} onChange={setMode} colors={colors} testIDPrefix="transfer-mode" />
        </Card>

        <Pressable testID="transfer-skip" style={styles.skip} onPress={() => router.push('/checkout/passengers')} accessibilityRole="button">
          <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Skip for now</Text>
        </Pressable>
      </ScrollView>
      <BottomBar ctaTitle="Continue" ctaTestID="transfer-continue" onPress={handleContinue} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  intro: { flexDirection: 'row', gap: 10, borderRadius: 14, padding: 14, alignItems: 'flex-start' },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2.5 },
  input: { flex: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  skip: { alignItems: 'center', padding: 12 },
});
