import { CITIES, type City } from './cities';

export const POPULAR_CODES = ['LON', 'PAR', 'AMS', 'BER', 'BCN', 'ROM', 'VIE', 'PRG'];

export function popularCities(): City[] {
  return POPULAR_CODES.map(code => CITIES.find(c => c.code === code)!).filter(Boolean);
}

// Prefix matches on name/code rank first, then substring matches on the name
// or country ("burg" → Hamburg, "de" → German cities).
export function matchCities(query: string, limit = 8): City[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const prefix: City[] = [];
  const contains: City[] = [];
  for (const c of CITIES) {
    const name = c.name.toLowerCase();
    if (name.startsWith(q) || c.code.toLowerCase().startsWith(q)) prefix.push(c);
    else if (name.includes(q) || c.country.toLowerCase() === q) contains.push(c);
  }
  return [...prefix, ...contains].slice(0, limit);
}

// ISO-3166 alpha-2 → regional-indicator flag emoji (UK is GB).
export function countryFlag(country: string): string {
  const cc = country.toUpperCase() === 'UK' ? 'GB' : country.toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return '🌍';
  return String.fromCodePoint(...[...cc].map(ch => 0x1f1e6 + ch.charCodeAt(0) - 65));
}
