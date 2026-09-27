import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from './Button';
import type { Ionicons } from '@expo/vector-icons';

interface Props {
  /** Small caption above the amount, e.g. "Total · 2 adults". */
  caption?: string;
  amount?: string;
  amountTestID?: string;
  ctaTitle: string;
  onPress: () => void;
  ctaTestID?: string;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  children?: React.ReactNode;
}

// Sticky checkout footer: price on the left, primary action on the right.
export function BottomBar({ caption, amount, amountTestID, ctaTitle, onPress, ctaTestID, loading, disabled, icon, children }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 12 }]}>
      {children}
      <View style={styles.row}>
        {amount ? (
          <View style={{ flexShrink: 1 }}>
            {caption ? <Text style={[styles.caption, { color: colors.textSecondary }]}>{caption}</Text> : null}
            <Text testID={amountTestID} style={[styles.amount, { color: colors.text }]}>{amount}</Text>
          </View>
        ) : null}
        <Button
          title={ctaTitle}
          onPress={onPress}
          testID={ctaTestID}
          loading={loading}
          disabled={disabled}
          icon={icon}
          style={amount ? styles.ctaSide : styles.ctaFull}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, paddingTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  caption: { fontSize: 12, fontWeight: '600' },
  amount: { fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  ctaSide: { flex: 1, maxWidth: 240, marginLeft: 'auto' },
  ctaFull: { flex: 1 },
});
