import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { AppHeader } from '../../src/components/AppHeader';
import { Stepper, checkoutSteps } from '../../src/components/Stepper';
import { Card } from '../../src/components/ui/Card';
import { BottomBar } from '../../src/components/ui/BottomBar';
import { EmptyState } from '../../src/components/ui/EmptyState';
import {
  getCheckoutTrip,
  getCheckoutAdults,
  getCheckoutItinerary,
  getPassengers,
  setPassengers,
} from '../../src/stores/checkoutStore';
import type { Passenger } from '../../src/types/booking';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function PassengersScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const trip = getCheckoutTrip();
  const itinerary = getCheckoutItinerary();
  const adults = getCheckoutAdults();
  const [forms, setForms] = useState<Passenger[]>(() => {
    // Returning to this step keeps what was entered; otherwise the lead
    // passenger's email defaults to the account email (tickets go there).
    const saved = getPassengers();
    if (saved.length === adults) return saved;
    return Array.from({ length: adults }, (_, i) => ({ name: '', email: i === 0 ? user?.email ?? '' : '' }));
  });
  const [error, setError] = useState('');
  const [invalid, setInvalid] = useState<string | null>(null);

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

  function updateForm(index: number, field: keyof Passenger, value: string) {
    setForms(prev => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
    if (invalid === `${field}-${index}`) setInvalid(null);
  }

  function fail(field: string, message: string) {
    setInvalid(field);
    setError(message);
  }

  function handleNext() {
    setError('');
    setInvalid(null);
    for (let i = 0; i < forms.length; i++) {
      if (!forms[i].name.trim()) return fail(`name-${i}`, `Enter name for passenger ${i + 1}`);
      if (!forms[i].email.trim()) return fail(`email-${i}`, `Enter email for passenger ${i + 1}`);
      if (!EMAIL_RE.test(forms[i].email.trim())) {
        return fail(`email-${i}`, `Enter a valid email for passenger ${i + 1}`);
      }
    }
    setPassengers(forms.map(f => ({ name: f.name.trim(), email: f.email.trim() })));
    router.push('/checkout/review');
  }

  const input = (id: string) => [
    styles.input,
    {
      color: colors.text,
      backgroundColor: colors.surfaceAlt,
      borderColor: invalid === id ? colors.error : 'transparent',
    },
  ];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppHeader title="Passengers" subtitle={`${routeOrigin} → ${routeDestination}`} showBack />
      <Stepper steps={checkoutSteps(!!itinerary)} current={itinerary ? 2 : 1} colors={colors} />
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        {forms.map((passenger, i) => (
          <Card key={i} style={{ gap: 8 }}>
            <View style={styles.cardHead}>
              <View style={[styles.avatar, { backgroundColor: colors.accentSoft }]}>
                <Ionicons name="person" size={16} color={colors.accent} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                Passenger {i + 1}{i === 0 ? ' · lead' : ''}
              </Text>
              <Text style={{ color: colors.textTertiary, fontSize: 12 }}>Adult</Text>
            </View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Full name (as on ID)</Text>
            <TextInput
              testID={`name-${i}`}
              style={input(`name-${i}`)}
              value={passenger.name}
              onChangeText={v => updateForm(i, 'name', v)}
              placeholder="First and last name"
              placeholderTextColor={colors.textTertiary}
              autoComplete={i === 0 ? 'name' : 'off'}
              textContentType={i === 0 ? 'name' : 'none'}
              autoCapitalize="words"
            />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Email for e-tickets</Text>
            <TextInput
              testID={`email-${i}`}
              style={input(`email-${i}`)}
              value={passenger.email}
              onChangeText={v => updateForm(i, 'email', v)}
              placeholder="name@example.com"
              placeholderTextColor={colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </Card>
        ))}

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: colors.error + '14' }]}>
            <Ionicons name="alert-circle" size={16} color={colors.error} />
            <Text testID="error" style={{ color: colors.error, flex: 1 }}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.privacy}>
          <Ionicons name="lock-closed-outline" size={14} color={colors.textTertiary} />
          <Text style={{ color: colors.textTertiary, fontSize: 12, flex: 1 }}>
            Details are only shared with the operators you book with.
          </Text>
        </View>
      </ScrollView>
      <BottomBar ctaTitle="Continue to review" ctaTestID="next-btn" onPress={handleNext} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3, marginTop: 4 },
  input: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 12 },
  privacy: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
});
