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
import {
  getCheckoutTrip,
  getCheckoutAdults,
  getCheckoutItinerary,
  setPassengers,
} from '../../src/stores/checkoutStore';
import type { Passenger } from '../../src/types/booking';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function PassengersScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const trip = getCheckoutTrip();
  const itinerary = getCheckoutItinerary();
  const adults = getCheckoutAdults();
  const [forms, setForms] = useState<Passenger[]>(
    Array.from({ length: adults }, () => ({ name: '', email: '' })),
  );
  const [error, setError] = useState('');

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

  function updateForm(index: number, field: keyof Passenger, value: string) {
    setForms(prev => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  }

  function handleNext() {
    setError('');
    for (let i = 0; i < forms.length; i++) {
      if (!forms[i].name.trim()) return setError(`Enter name for passenger ${i + 1}`);
      if (!forms[i].email.trim()) return setError(`Enter email for passenger ${i + 1}`);
      if (!EMAIL_RE.test(forms[i].email.trim())) {
        return setError(`Enter a valid email for passenger ${i + 1}`);
      }
    }
    setPassengers(forms.map(f => ({ name: f.name.trim(), email: f.email.trim() })));
    router.push('/checkout/review');
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        keyboardShouldPersistTaps="handled"
      >
        <AppHeader title="Passenger Details" showBack />
        <Stepper steps={['Passengers', 'Review', 'Pay']} current={0} colors={colors} />
        <View style={styles.content}>
          <Text style={[styles.route, { color: colors.text }]}>
            {routeOrigin} → {routeDestination}
          </Text>

          {forms.map((passenger, i) => (
            <View key={i} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                Passenger {i + 1}
              </Text>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Full name</Text>
              <TextInput
                testID={`name-${i}`}
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={passenger.name}
                onChangeText={v => updateForm(i, 'name', v)}
                placeholder="John Doe"
                placeholderTextColor={colors.textSecondary}
              />
              <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
              <TextInput
                testID={`email-${i}`}
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={passenger.email}
                onChangeText={v => updateForm(i, 'email', v)}
                placeholder="john@example.com"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          ))}

          {error ? (
            <Text testID="error" style={{ color: colors.error, marginTop: 8 }}>{error}</Text>
          ) : null}

          <TouchableOpacity
            testID="next-btn"
            style={[styles.button, { backgroundColor: colors.accent }]}
            onPress={handleNext}
          >
            <Text style={styles.buttonText}>Continue to Review</Text>
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
  step: { fontSize: 12, fontWeight: '600' },
  route: { fontSize: 18, fontWeight: '700' },
  card: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  label: { fontSize: 12, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  button: { borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
