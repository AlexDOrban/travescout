import { Platform, type ViewStyle } from 'react-native';

// 4pt spacing scale.
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 } as const;

export const type = {
  display: { fontSize: 30, fontWeight: '800' as const, letterSpacing: -0.6 },
  title:   { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  heading: { fontSize: 17, fontWeight: '700' as const },
  body:    { fontSize: 15, fontWeight: '400' as const },
  bodyStrong: { fontSize: 15, fontWeight: '600' as const },
  caption: { fontSize: 13, fontWeight: '500' as const },
  overline: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 0.8, textTransform: 'uppercase' as const },
  price:   { fontSize: 22, fontWeight: '800' as const, fontVariant: ['tabular-nums' as const] },
  time:    { fontSize: 20, fontWeight: '700' as const, fontVariant: ['tabular-nums' as const] },
};

// Soft card elevation; dark mode relies on surface contrast instead.
export function elevation(shadowColor: string, isDark: boolean, level: 1 | 2 = 1): ViewStyle {
  if (isDark) return {};
  return Platform.select<ViewStyle>({
    android: { elevation: level * 2 },
    default: {
      shadowColor,
      shadowOpacity: level === 1 ? 0.06 : 0.12,
      shadowRadius: level === 1 ? 8 : 16,
      shadowOffset: { width: 0, height: level === 1 ? 2 : 6 },
    },
  }) as ViewStyle;
}
