// Palette inspired by Omio / Trainline: a navy "ink" brand, a teal primary
// action colour, soft grey canvas with white cards in light mode, and a deep
// blue-black canvas in dark mode. Keys used before the redesign (background,
// card, text, textSecondary, accent, cheapest, warning, border, error) keep
// their meaning so every screen picks up the new look automatically.

export const LIGHT = {
  background:    '#f3f5f9',
  card:          '#ffffff',
  surfaceAlt:    '#eaeef4',
  text:          '#0b1b33',
  textSecondary: '#56657b',
  textTertiary:  '#8a97ab',
  accent:        '#00796b',
  accentSoft:    '#e0f2ef',
  onAccent:      '#ffffff',
  heroStart:     '#0a1f44',
  heroEnd:       '#153a78',
  onHero:        '#ffffff',
  onHeroMuted:   '#b9c6de',
  cheapest:      '#12813f',
  fastest:       '#b25e00',
  balanced:      '#3d5afe',
  warning:       '#b26a00',
  border:        '#e1e6ee',
  error:         '#c62828',
  shadow:        '#0b1b33',
};

export const DARK: typeof LIGHT = {
  background:    '#0a101c',
  card:          '#131b2c',
  surfaceAlt:    '#1b2539',
  text:          '#eef2f8',
  textSecondary: '#9aa8bf',
  textTertiary:  '#6c7a92',
  accent:        '#2dd4bf',
  accentSoft:    '#0f3b38',
  onAccent:      '#04211d',
  heroStart:     '#0a1a38',
  heroEnd:       '#11306a',
  onHero:        '#ffffff',
  onHeroMuted:   '#a9b8d4',
  cheapest:      '#4ade80',
  fastest:       '#fbbf24',
  balanced:      '#8c9eff',
  warning:       '#fbbf24',
  border:        '#233049',
  error:         '#f87171',
  shadow:        '#000000',
};

export type ColorPalette = typeof LIGHT;
