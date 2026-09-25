import AsyncStorage from '@react-native-async-storage/async-storage';
import type { City } from '../data/cities';

// On-device price watches: the user follows a route + date from the results
// screen; the Alerts tab re-quotes the cheapest fare and shows the movement
// against the price when they started watching.
export interface PriceAlert {
  id: string;
  from: City;
  to: City;
  departDate: string;
  adults: number;
  baselinePriceEur: number;
  lastPriceEur: number | null;
  lastCheckedAt: string | null;
  createdAt: string;
}

interface AlertKey {
  from: City;
  to: City;
  departDate: string;
  adults: number;
}

const keyFor = (user: string) => `alerts:${user}`;

export function alertId(k: AlertKey): string {
  return `${k.from.code}-${k.to.code}-${k.departDate}-${k.adults}`;
}

export async function getAlerts(user: string): Promise<PriceAlert[]> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(user));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function save(user: string, alerts: PriceAlert[]): Promise<void> {
  try {
    await AsyncStorage.setItem(keyFor(user), JSON.stringify(alerts));
  } catch {
    // ignore — the toggle simply won't persist
  }
}

export async function addAlert(user: string, k: AlertKey & { priceEur: number }): Promise<void> {
  const alerts = await getAlerts(user);
  const id = alertId(k);
  if (alerts.some(a => a.id === id)) return;
  const now = new Date().toISOString();
  alerts.unshift({
    id,
    from: k.from,
    to: k.to,
    departDate: k.departDate,
    adults: k.adults,
    baselinePriceEur: k.priceEur,
    lastPriceEur: k.priceEur,
    lastCheckedAt: now,
    createdAt: now,
  });
  await save(user, alerts);
}

export async function removeAlert(user: string, id: string): Promise<void> {
  await save(user, (await getAlerts(user)).filter(a => a.id !== id));
}

export async function findAlert(user: string, k: AlertKey): Promise<PriceAlert | null> {
  const id = alertId(k);
  return (await getAlerts(user)).find(a => a.id === id) ?? null;
}

export async function updateAlertPrice(user: string, id: string, priceEur: number | null): Promise<void> {
  const alerts = await getAlerts(user);
  await save(
    user,
    alerts.map(a => (a.id === id ? { ...a, lastPriceEur: priceEur, lastCheckedAt: new Date().toISOString() } : a)),
  );
}

export function priceChange(
  baseline: number,
  latest: number | null,
): { direction: 'down' | 'up' | 'same' | 'unknown'; amount: number } {
  if (latest == null) return { direction: 'unknown', amount: 0 };
  const diff = Math.round((latest - baseline) * 100) / 100;
  if (diff < 0) return { direction: 'down', amount: -diff };
  if (diff > 0) return { direction: 'up', amount: diff };
  return { direction: 'same', amount: 0 };
}
