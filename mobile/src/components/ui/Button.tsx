import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { radius } from '../../constants/theme';
import { haptic } from '../../utils/haptics';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  size?: 'md' | 'lg';
  testID?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  size = 'lg',
  testID,
  style,
  accessibilityLabel,
}: Props) {
  const { colors } = useTheme();
  const inactive = disabled || loading;

  const palette = {
    primary:   { bg: colors.accent, fg: colors.onAccent, border: colors.accent },
    secondary: { bg: 'transparent', fg: colors.accent, border: colors.accent },
    ghost:     { bg: colors.surfaceAlt, fg: colors.text, border: colors.surfaceAlt },
    danger:    { bg: 'transparent', fg: colors.error, border: colors.error },
  }[variant];

  return (
    <Pressable
      testID={testID}
      onPress={() => {
        haptic.light();
        onPress();
      }}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' ? styles.lg : styles.md,
        { backgroundColor: palette.bg, borderColor: palette.border },
        inactive && !loading && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <Ionicons name={icon} size={size === 'lg' ? 19 : 16} color={palette.fg} /> : null}
          <Text style={[styles.label, size === 'md' && styles.labelMd, { color: palette.fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  lg: { minHeight: 54, paddingHorizontal: 20 },
  md: { minHeight: 42, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 16, fontWeight: '700' },
  labelMd: { fontSize: 14 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
});
