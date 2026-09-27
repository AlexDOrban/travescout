import AsyncStorage from '@react-native-async-storage/async-storage';
import type { City } from '../data/cities';

export interface RecentSearch {
  from: City;
  to: City;
  departDate: string;
  /** Round trips only. */
  returnDate?: string;
  adults: number;
}

const MAX = 6;
// Scoped per account so a shared device doesn't show someone else's trips.
const keyFor = (user: string) => `recent:${user}`;

export async function getRecentSearches(user: string): Promise<RecentSearch[]> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(user));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function addRecentSearch(user: string, search: RecentSearch): Promise<void> {
  const existing = await getRecentSearches(user);
  const next = [
    search,
    ...existing.filter(r => !(r.from.code === search.from.code && r.to.code === search.to.code)),
  ].slice(0, MAX);
  try {
    await AsyncStorage.setItem(keyFor(user), JSON.stringify(next));
  } catch {
    // Recents are a convenience; never block a search on storage.
  }
}

export async function clearRecentSearches(user: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(keyFor(user));
  } catch {
    // ignore
  }
}
