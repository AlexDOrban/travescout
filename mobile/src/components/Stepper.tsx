import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ColorPalette } from '../constants/colors';
import type { CheckoutItinerary } from '../types/itinerary';

export type CheckoutStep =
  | 'Connections'
  | 'Outbound connections'
  | 'Return connections'
  | 'Getting there'
  | 'Passengers'
  | 'Review'
  | 'Pay';

export type CheckoutFlow = 'one_way' | 'one_way_connections' | 'round_trip' | 'round_trip_connections';

// A one-way itinerary only exists via "Add Connections"; a round trip is always
// an itinerary and remembers whether the user asked for connections.
export function checkoutFlow(itinerary: CheckoutItinerary | null | undefined): CheckoutFlow {
  if (!itinerary) return 'one_way';
  if (itinerary.tripType === 'round_trip') {
    return itinerary.viaConnections ? 'round_trip_connections' : 'round_trip';
  }
  return 'one_way_connections';
}

const BASE_STEPS: CheckoutStep[] = ['Getting there', 'Passengers', 'Review', 'Pay'];

// Every screen shows a consistent "Step n of N" for its flow.
export function checkoutSteps(flow: CheckoutFlow): CheckoutStep[] {
  switch (flow) {
    case 'one_way_connections':
      return ['Connections', ...BASE_STEPS];
    case 'round_trip_connections':
      return ['Outbound connections', 'Return connections', ...BASE_STEPS];
    default:
      return BASE_STEPS;
  }
}

export function stepIndex(flow: CheckoutFlow, step: CheckoutStep): number {
  return checkoutSteps(flow).indexOf(step);
}

interface Props {
  steps: string[];
  /** 0-based index of the active step; steps before it render as completed. */
  current: number;
  colors: ColorPalette;
}

// Slim segmented progress bar (Trainline-style) with a "Step n of N" caption.
export function Stepper({ steps, current, colors }: Props) {
  return (
    <View
      style={[styles.wrap, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${current + 1} of ${steps.length}: ${steps[current]}`}
    >
      <View style={styles.bars}>
        {steps.map((label, i) => (
          <View
            key={label}
            testID={`step-${i}`}
            style={[styles.bar, { backgroundColor: i <= current ? colors.accent : colors.border }]}
          />
        ))}
      </View>
      <Text style={[styles.caption, { color: colors.textSecondary }]}>
        Step {current + 1} of {steps.length} ·{' '}
        <Text style={{ color: colors.text, fontWeight: '700' }}>{steps[current]}</Text>
        {current + 1 < steps.length ? `  ›  ${steps[current + 1]}` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  bars: { flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 4, borderRadius: 2 },
  caption: { fontSize: 12, marginTop: 8 },
});
