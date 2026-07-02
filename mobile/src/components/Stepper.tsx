import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ColorPalette } from '../constants/colors';

interface Props {
  steps: string[];
  /** 0-based index of the active step; steps before it render as completed. */
  current: number;
  colors: ColorPalette;
}

export function Stepper({ steps, current, colors }: Props) {
  return (
    <View style={styles.row} accessibilityRole="progressbar" accessibilityLabel={`Step ${current + 1} of ${steps.length}: ${steps[current]}`}>
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={label}>
            {i > 0 && (
              <View
                style={[
                  styles.connector,
                  { backgroundColor: done || active ? colors.cheapest : colors.border },
                ]}
              />
            )}
            <View style={styles.step}>
              <View
                style={[
                  styles.circle,
                  {
                    backgroundColor: done
                      ? colors.cheapest + '33'
                      : active
                        ? colors.accent
                        : colors.card,
                    borderColor: done ? colors.cheapest : active ? colors.accent : colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: done ? colors.cheapest : active ? '#fff' : colors.textSecondary,
                    fontWeight: '700',
                    fontSize: 13,
                  }}
                >
                  {done ? '✓' : i + 1}
                </Text>
              </View>
              <Text
                style={[
                  styles.label,
                  { color: active ? colors.accent : colors.textSecondary },
                  active && { fontWeight: '600' },
                ]}
              >
                {label}
              </Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  step: { alignItems: 'center', gap: 4 },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connector: {
    height: 2,
    flex: 1,
    maxWidth: 48,
    marginTop: 15,
    marginHorizontal: 8,
    borderRadius: 1,
  },
  label: { fontSize: 12 },
});
