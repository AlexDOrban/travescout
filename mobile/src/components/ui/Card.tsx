import React from 'react';
import { View, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { radius, elevation } from '../../constants/theme';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  testID?: string;
  padded?: boolean;
  accessibilityLabel?: string;
}

// White card on the grey canvas (light) / raised surface (dark).
export function Card({ children, style, onPress, testID, padded = true, accessibilityLabel }: Props) {
  const { colors, isDark } = useTheme();
  const base = [
    styles.card,
    padded && styles.padded,
    { backgroundColor: colors.card, borderColor: isDark ? colors.border : 'transparent' },
    elevation(colors.shadow, isDark),
  ];

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [...base, pressed && styles.pressed, style]}
      >
        {children}
      </Pressable>
    );
  }
  return (
    <View testID={testID} style={[...base, style]} accessibilityLabel={accessibilityLabel}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1 },
  padded: { padding: 16 },
  pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
});
