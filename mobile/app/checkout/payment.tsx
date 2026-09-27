import React, { useState, useEffect } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useCurrency } from '../../src/contexts/CurrencyContext';
import { AppHeader } from '../../src/components/AppHeader';
import { itineraryEndpoints } from '../../src/utils/itinerary';
import { Stepper, checkoutFlow, checkoutSteps, stepIndex } from '../../src/components/Stepper';
import { Card } from '../../src/components/ui/Card';
import { BottomBar } from '../../src/components/ui/BottomBar';
import { EmptyState } from '../../src/components/ui/EmptyState';
import {
  getCheckoutTrip,
  getCheckoutItinerary,
  getPassengers,
  getBookingResult,
  getCheckoutIdempotencyKey,
  getCheckoutTransfer,
  setBookingResult,
} from '../../src/stores/checkoutStore';
import { getSearchMeta } from '../../src/stores/searchStore';
import { saveTransferPrefs } from '../../src/utils/transferPrefs';
import { cardToPaymentMethod, cardBrand, formatCardNumber, formatExpiry, formatCvc } from '../../src/utils/payment';
import { haptic } from '../../src/utils/haptics';
import { book } from '../../src/api/booking';
import { bookItinerary } from '../../src/api/itinerary';

const BRAND_LABEL = { visa: 'VISA', mastercard: 'Mastercard', amex: 'AMEX', discover: 'Discover' } as const;

export default function PaymentScreen() {
  const { colors } = useTheme();
  const { format, currency } = useCurrency();
  const router = useRouter();
  const trip = getCheckoutTrip();
  const passengers = getPassengers();
  const itinerary = getCheckoutItinerary();
  const flow = checkoutFlow(itinerary);
  const searchMeta = getSearchMeta();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [focused, setFocused] = useState<string | null>(null);

  // If this checkout already produced a booking (e.g. user swiped back from
  // confirmation), never show a live Pay button — bounce to the result.
  useEffect(() => {
    if (getBookingResult()) router.replace('/confirmation');
  }, [router]);

  if (!trip && !itinerary) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState icon="alert-circle-outline" title="No trip selected" actionLabel="Back to Search" onAction={() => router.replace('/(tabs)')} />
      </View>
    );
  }

  // Provider prices already cover the whole party (adults were part of the
  // search), so no client-side multiplication.
  const totalEur = itinerary ? itinerary.totalPriceEur : trip!.priceEur;
  const brand = cardBrand(cardNumber);
  const holder = passengers[0]?.name || 'CARDHOLDER';
  const ends = itinerary ? itineraryEndpoints(itinerary) : null;
  const roundTrip = itinerary?.tripType === 'round_trip';
  const routeLabel = ends
    ? `${ends.origin} ${roundTrip ? '⇄' : '→'} ${ends.destination}`
    : `${trip!.origin} → ${trip!.destination}`;

  function validateExpiryAndCvc(): string {
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
    if (loading) return; // guard double taps within the same frame
    setError('');
    // The entered card determines the (test) payment method actually used.
    const card = cardToPaymentMethod(cardNumber);
    if (card.error) {
      haptic.error();
      setError(card.error);
      return;
    }
    const cardError = validateExpiryAndCvc();
    if (cardError) {
      haptic.error();
      setError(cardError);
      return;
    }
    const paymentMethodId = card.paymentMethodId!;
    // Stable across re-entry into this screen within one checkout attempt.
    const idempotencyKey = getCheckoutIdempotencyKey() ?? undefined;

    setLoading(true);
    try {
      let result;
      if (itinerary) {
        result = await bookItinerary({
          legs: itinerary.legs,
          passengers,
          paymentMethodId,
          origin: searchMeta?.from ?? ends!.origin,
          destination: searchMeta?.to ?? ends!.destination,
          ...(roundTrip ? { tripType: 'round_trip' as const } : {}),
          idempotencyKey,
        });
      } else {
        result = await book({
          trip: {
            id: trip!.id,
            provider: trip!.provider,
            origin: trip!.origin,
            destination: trip!.destination,
            departAt: trip!.departAt,
            arriveAt: trip!.arriveAt,
            priceEur: trip!.priceEur,
            deepLink: trip!.deepLink,
          },
          passengers,
          paymentMethodId,
          idempotencyKey,
        });
      }
      setBookingResult(result);
      haptic.success();
      // Keep the "getting there" details reachable from My Trips, keyed by
      // the booking ref. Fire-and-forget: a failed write must not block the
      // confirmation screen.
      const transfer = getCheckoutTransfer();
      if (transfer.startAddress || transfer.endAddress || transfer.travelMode !== 'transit') {
        void saveTransferPrefs(result.bookingRef, transfer);
      }
      // replace: back-swiping from confirmation must not land on a live Pay button
      router.replace('/confirmation');
    } catch (e: any) {
      haptic.error();
      setError(e.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  }

  const field = (name: string) => [
    styles.input,
    { color: colors.text, backgroundColor: colors.surfaceAlt, borderColor: focused === name ? colors.accent : 'transparent' },
  ];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppHeader title="Payment" subtitle={routeLabel} showBack />
      <Stepper steps={checkoutSteps(flow)} current={stepIndex(flow, 'Pay')} colors={colors} />
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        {/* Live card preview */}
        <LinearGradient colors={[colors.heroStart, colors.heroEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.preview}>
          <View style={styles.previewTop}>
            <Ionicons name="hardware-chip-outline" size={28} color="#e5c07b" />
            <Text testID="card-brand" style={styles.brand}>{brand ? BRAND_LABEL[brand] : ''}</Text>
          </View>
          <Text style={styles.previewNumber}>{cardNumber || '•••• •••• •••• ••••'}</Text>
          <View style={styles.previewBottom}>
            <View style={{ flex: 1 }}>
              <Text style={styles.previewCaption}>CARDHOLDER</Text>
              <Text numberOfLines={1} style={styles.previewValue}>{holder.toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.previewCaption}>EXPIRES</Text>
              <Text style={styles.previewValue}>{expiry || 'MM/YY'}</Text>
            </View>
          </View>
        </LinearGradient>

        <Card style={{ gap: 8 }}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Card number</Text>
          <TextInput
            testID="card-number"
            style={field('number')}
            value={cardNumber}
            onFocus={() => setFocused('number')}
            onBlur={() => setFocused(null)}
            onChangeText={t => setCardNumber(formatCardNumber(t))}
            placeholder="1234 5678 9012 3456"
            placeholderTextColor={colors.textTertiary}
            keyboardType="number-pad"
            maxLength={23}
            autoComplete="cc-number"
            textContentType="creditCardNumber"
          />
          <View style={styles.row}>
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Expiry</Text>
              <TextInput
                testID="card-expiry"
                style={field('expiry')}
                value={expiry}
                onFocus={() => setFocused('expiry')}
                onBlur={() => setFocused(null)}
                onChangeText={t => setExpiry(formatExpiry(t, expiry))}
                placeholder="MM/YY"
                placeholderTextColor={colors.textTertiary}
                keyboardType="number-pad"
                maxLength={5}
                autoComplete="cc-exp"
              />
            </View>
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>CVC</Text>
              <TextInput
                testID="card-cvc"
                style={field('cvc')}
                value={cvc}
                onFocus={() => setFocused('cvc')}
                onBlur={() => setFocused(null)}
                onChangeText={t => setCvc(formatCvc(t))}
                placeholder={brand === 'amex' ? '1234' : '123'}
                placeholderTextColor={colors.textTertiary}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
                autoComplete="cc-csc"
              />
            </View>
          </View>
        </Card>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: colors.error + '14' }]}>
            <Ionicons name="alert-circle" size={16} color={colors.error} />
            <Text testID="error" style={{ color: colors.error, flex: 1 }}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.trust}>
          <Ionicons name="shield-checkmark" size={16} color={colors.cheapest} />
          <Text style={[styles.trustText, { color: colors.textSecondary }]}>
            Secured by Stripe · Test mode — try 4242 4242 4242 4242. No real charge is made.
          </Text>
        </View>
        {currency.code !== 'EUR' ? (
          <Text style={[styles.trustText, { color: colors.textTertiary, paddingHorizontal: 4 }]}>
            You will be charged €{totalEur.toFixed(2)}. Other currencies shown are estimates.
          </Text>
        ) : null}
      </ScrollView>

      <BottomBar
        icon="lock-closed"
        ctaTitle={`Pay ${format(totalEur)}${currency.code !== 'EUR' ? ' (est.)' : ''}`}
        ctaTestID="pay-btn"
        onPress={handlePay}
        loading={loading}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  preview: { borderRadius: 18, padding: 20, minHeight: 190, justifyContent: 'space-between' },
  previewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { color: '#fff', fontSize: 18, fontWeight: '900', fontStyle: 'italic', letterSpacing: 1 },
  previewNumber: { color: '#fff', fontSize: 21, fontWeight: '600', letterSpacing: 2, fontVariant: ['tabular-nums'], marginVertical: 18 },
  previewBottom: { flexDirection: 'row', gap: 16 },
  previewCaption: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  previewValue: { color: '#fff', fontSize: 14, fontWeight: '700', marginTop: 2, letterSpacing: 0.5 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  input: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 17, fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', gap: 12, marginTop: 4 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 12 },
  trust: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingHorizontal: 4 },
  trustText: { fontSize: 12, lineHeight: 17, flex: 1 },
});
