import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  /** Trailing actions (icon buttons). */
  right?: React.ReactNode;
  /** Large title for tab roots (iOS-style). */
  large?: boolean;
}

export function AppHeader({ title = 'TraveScout', subtitle, showBack = false, right, large = false }: Props) {
  const { colors } = useTheme();
  // Keep the header clear of the status bar (signal/battery/carrier).
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.header,
        large && styles.headerLarge,
        {
          backgroundColor: large ? colors.background : colors.card,
          borderBottomColor: large ? 'transparent' : colors.border,
          paddingTop: insets.top + (large ? 16 : 8),
        },
      ]}
    >
      <View style={styles.leading}>
        {showBack && router.canGoBack() && (
          <Pressable
            testID="header-back"
            onPress={() => router.back()}
            hitSlop={10}
            style={({ pressed }) => [styles.backBtn, { backgroundColor: colors.surfaceAlt }, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
        )}
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            accessibilityRole="header"
            style={[large ? styles.titleLarge : styles.title, { color: colors.text }]}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text numberOfLines={1} style={[styles.subtitle, { color: colors.textSecondary }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {right ? <View style={styles.actions}>{right}</View> : null}
    </View>
  );
}

// Round icon button for header trailing actions.
export function HeaderIconButton({
  icon,
  onPress,
  testID,
  accessibilityLabel,
  active = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  testID?: string;
  accessibilityLabel: string;
  active?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.iconBtn,
        { backgroundColor: active ? colors.accentSoft : colors.surfaceAlt },
        pressed && { opacity: 0.6 },
      ]}
    >
      <Ionicons name={icon} size={19} color={active ? colors.accent : colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  headerLarge: { paddingBottom: 8 },
  leading: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '700' },
  titleLarge: { fontSize: 30, fontWeight: '800', letterSpacing: -0.6 },
  subtitle: { fontSize: 13, marginTop: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
