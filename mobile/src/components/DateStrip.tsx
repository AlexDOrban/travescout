import React, { useEffect, useRef } from 'react';
import { ScrollView, Pressable, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { formatDayLabel } from '../utils/format';
import { radius } from '../constants/theme';
import { haptic } from '../utils/haptics';

interface Props {
  dates: string[];
  selected: string;
  /** Cheapest fare per day; undefined = still loading, null = no fares. */
  prices: Record<string, number | null | undefined>;
  onSelect: (iso: string) => void;
}

const DAY_WIDTH = 78;

// Omio/Skyscanner-style strip of neighbouring days with their cheapest fare;
// the cheapest day in view is highlighted.
export function DateStrip({ dates, selected, prices, onSelect }: Props) {
  const { colors } = useTheme();
  const { format } = useCurrency();
  const scroller = useRef<ScrollView>(null);

  const known = dates.map(d => prices[d]).filter((p): p is number => typeof p === 'number');
  const cheapest = known.length ? Math.min(...known) : null;

  useEffect(() => {
    const idx = dates.indexOf(selected);
    if (idx > 1) scroller.current?.scrollTo?.({ x: (idx - 1) * (DAY_WIDTH + 8), animated: false });
  }, [dates, selected]);

  return (
    <ScrollView
      ref={scroller}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      testID="date-strip"
    >
      {dates.map(iso => {
        const active = iso === selected;
        const price = prices[iso];
        const isCheapest = typeof price === 'number' && price === cheapest;
        const [weekday, ...rest] = formatDayLabel(iso).split(' ');
        return (
          <Pressable
            key={iso}
            testID={`date-${iso}`}
            onPress={() => {
              if (!active) haptic.tap();
              onSelect(iso);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${formatDayLabel(iso)}${typeof price === 'number' ? `, from ${format(price)}` : ''}`}
            style={[
              styles.day,
              {
                backgroundColor: active ? colors.accent : colors.card,
                borderColor: active ? colors.accent : colors.border,
              },
            ]}
          >
            <Text style={[styles.weekday, { color: active ? colors.onAccent : colors.textSecondary }]}>{weekday}</Text>
            <Text style={[styles.date, { color: active ? colors.onAccent : colors.text }]}>{rest.join(' ')}</Text>
            <View style={styles.priceWrap}>
              {price === undefined ? (
                <View style={[styles.pricePlaceholder, { backgroundColor: active ? colors.onAccent + '55' : colors.surfaceAlt }]} />
              ) : (
                <Text
                  testID={`date-price-${iso}`}
                  style={[
                    styles.price,
                    { color: active ? colors.onAccent : isCheapest ? colors.cheapest : colors.textSecondary },
                  ]}
                >
                  {price === null ? '—' : format(price).replace(/\.00$/, '')}
                </Text>
              )}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 16, gap: 8 },
  day: { width: DAY_WIDTH, borderRadius: radius.md, borderWidth: 1, paddingVertical: 8, alignItems: 'center' },
  weekday: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  date: { fontSize: 14, fontWeight: '700', marginTop: 1 },
  priceWrap: { height: 18, justifyContent: 'center', marginTop: 2 },
  price: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  pricePlaceholder: { width: 34, height: 8, borderRadius: 4 },
});
