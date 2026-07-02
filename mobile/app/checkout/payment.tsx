import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useCurrency } from '../../src/contexts/CurrencyContext';
import { AppHeader } from '../../src/components/AppHeader';
import {
  getCheckoutTrip,
  getCheckoutAdults,
  getCheckoutItinerary,
  getPassengers,
  setBookingResult,
} from '../../src/stores/checkoutStore';
import { getSearchMeta } from '../../src/stores/searchStore';
import { book } from '../../src/api/booking';
import { bookItinerary } from '../../src/api/itinerary';

function makeIdempotencyKey(): string {
  return `bk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export default function PaymentScreen() {
  const { colors } = useTheme();
  const { format } = useCurrency();
  const router = useRouter();
  const trip = getCheckoutTrip();
  const adults = getCheckoutAdults();
  const passengers = getPassengers();
  const itinerary = getCheckoutItinerary();
  const searchMeta = getSearchMeta();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  // One key per payment attempt series: a retry after a network timeout
  // must not double-charge.
  const idempotencyKey = useRef(makeIdempotencyKey()).current;

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

  // Provider prices already cover the whole party (adults were part of the
  // search), so no client-side multiplication.
  const totalEur = itinerary ? itinerary.totalPriceEur : trip!.priceEur;

  function validateCard(): string {
    const digits = cardNumber.replace(/\s/g, '');
    if (!/^\d{13,19}$/.test(digits)) return 'Enter a valid card number';
    const m = expiry.match(/^(\d{2})\/(\d{2})$/);
    if (!m) return 'Enter expiry as MM/YY';
    const month = parseInt(m[1], 10);
    if (month < 1 || month > 12) return 'Enter a valid expiry month';
    const year = 2000 + parseInt(m[2], 10);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);
    if (endOfMonth < new Date()) return 'Card has expired';
    if (!/^\d{3,4}$/.test(cvc)) return 'Enter a valid CVC';
    return '';
  }

  async function handlePay() {
    setError('');
    const cardError = validateCard();
    if (cardError) {
      setError(cardError);
      return;
    }
    setLoading(true);
    try {
      let result;
      if (itinerary) {
        result = await bookItinerary({
          legs: itinerary.legs,
          passengers,
          paymentMethodId: 'pm_card_visa', // Stripe test token
          origin: searchMeta?.from ?? itinerary.legs[0].origin,
          destination: searchMeta?.to ?? itinerary.legs[itinerary.legs.length - 1].destination,
          idempotencyKey,
        });
      } else {
        result = await book({
          trip: {
            provider: trip!.provider,
            origin: trip!.origin,
            destination: trip!.destination,
            departAt: trip!.departAt,
            arriveAt: trip!.arriveAt,
            priceEur: trip!.priceEur,
            deepLink: trip!.deepLink,
          },
          passengers,
          paymentMethodId: 'pm_card_visa', // Stripe test token
          idempotencyKey,
        });
      }
      setBookingResult(result);
      // replace: back-swiping from confirmation must not land on a live Pay button
      router.replace('/confirmation');
    } catch (e: any) {
      setError(e.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
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
        <AppHeader title="Payment" showBack />
        <View style={styles.content}>
          <Text style={[styles.step, { color: colors.textSecondary }]}>Step 3 of 3</Text>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Card Details</Text>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Card number</Text>
            <TextInput
              testID="card-number"
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              value={cardNumber}
              onChangeText={setCardNumber}
              placeholder="4242 4242 4242 4242"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
            />
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Expiry</Text>
                <TextInput
                  testID="card-expiry"
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={expiry}
                  onChangeText={setExpiry}
                  placeholder="MM/YY"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>CVC</Text>
                <TextInput
                  testID="card-cvc"
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={cvc}
                  onChangeText={setCvc}
                  placeholder="123"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                />
              </View>
            </View>
          </View>

          <Text style={[styles.testNote, { color: colors.textSecondary }]}>
            Test mode — no real charge will be made
          </Text>

          {error ? (
            <Text testID="error" style={{ color: colors.error }}>{error}</Text>
          ) : null}

          <TouchableOpacity
            testID="pay-btn"
            style={[styles.button, { backgroundColor: colors.accent }]}
            onPress={handlePay}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Pay {format(totalEur)}</Text>
            )}
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
  card: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  label: { fontSize: 12, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  row: { flexDirection: 'row', gap: 12 },
  testNote: { fontSize: 11, fontStyle: 'italic', textAlign: 'center', marginTop: 4 },
  button: { borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
