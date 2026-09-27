import React, { useEffect, useState } from 'react';
import { Animated, View, StyleSheet, type DimensionValue } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { radius } from '../../constants/theme';

export function Skeleton({ width = '100%', height = 14, round = false }: { width?: DimensionValue; height?: number; round?: boolean }) {
  const { colors } = useTheme();
  const [pulse] = useState(() => new Animated.Value(0.5));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={{
        width,
        height,
        borderRadius: round ? height / 2 : 6,
        backgroundColor: colors.surfaceAlt,
        opacity: pulse,
      }}
    />
  );
}

// Placeholder shaped like a result card, shown while a search is in flight.
export function TripCardSkeleton() {
  const { colors } = useTheme();
  return (
    <View testID="trip-skeleton" style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.row}>
        <Skeleton width={56} height={22} />
        <View style={{ flex: 1, marginHorizontal: 12 }}><Skeleton height={8} /></View>
        <Skeleton width={56} height={22} />
      </View>
      <View style={[styles.row, { marginTop: 14 }]}>
        <Skeleton width={120} height={12} />
        <Skeleton width={70} height={20} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, padding: 16, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
