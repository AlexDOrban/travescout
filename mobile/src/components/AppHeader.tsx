import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import type { Currency } from '../contexts/CurrencyContext';

interface Props {
  title?: string;
}

export function AppHeader({ title = 'TraveScout' }: Props) {
  const { isDark, colors, toggle } = useTheme();
  const { currency, currencies, setCurrency } = useCurrency();

  function handleCurrencyPress() {
    const idx = currencies.findIndex((c: Currency) => c.code === currency.code);
    const next = currencies[(idx + 1) % currencies.length];
    setCurrency(next);
  }

  return (
    <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <View style={styles.actions}>
        <TouchableOpacity
          testID="currency-pill"
          onPress={handleCurrencyPress}
          style={[styles.pill, { borderColor: colors.border }]}
        >
          <Text style={[styles.pillText, { color: colors.accent }]}>{currency.code}</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="theme-toggle" onPress={toggle} style={styles.themeBtn}>
          <Text style={styles.themeIcon}>{isDark ? '☀️' : '🌙'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  title:    { fontSize: 18, fontWeight: '700' },
  actions:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill:     { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 4 },
  pillText: { fontSize: 13, fontWeight: '600' },
  themeBtn: { padding: 4 },
  themeIcon:{ fontSize: 18 },
});
