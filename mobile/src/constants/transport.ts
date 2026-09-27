import type { Ionicons } from '@expo/vector-icons';

export const TRANSPORT_ICON: Record<string, string> = {
  flight: '✈️',
  bus: '🚌',
  train: '🚆',
};

// Vector icons for the redesigned UI (emoji kept for plain-text contexts).
export const TRANSPORT_GLYPH: Record<string, keyof typeof Ionicons.glyphMap> = {
  flight: 'airplane',
  bus: 'bus',
  train: 'train',
};

export const TRANSPORT_LABEL: Record<string, string> = {
  flight: 'Flight',
  bus: 'Bus',
  train: 'Train',
};

// Booked trips only persist the provider, so transport type is derived.
export const PROVIDER_TRANSPORT: Record<string, string> = {
  amadeus: 'flight',
  flixbus: 'bus',
  rail: 'train',
};

// Human-facing operator names (Amadeus is a booking system, not an airline).
export const PROVIDER_NAME: Record<string, string> = {
  amadeus: 'Air partners',
  flixbus: 'FlixBus',
  rail: 'Rail Europe',
};

export function providerName(provider: string): string {
  return PROVIDER_NAME[provider] ?? provider;
}
