import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ColorPalette } from '../constants/colors';

export type CheckoutStep = 'Connections' | 'Getting there' | 'Passengers' | 'Review' | 'Pay';

// Itineraries get a Connections step first; the rest of checkout is shared,
// so every screen shows a consistent "Step n of N".
export function checkoutSteps(isItinerary: boolean): CheckoutStep[] {
  const base: CheckoutStep[] = ['Getting there', 'Passengers', 'Review', 'Pay'];
  return isItinerary ? ['Connections', ...base] : base;
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
