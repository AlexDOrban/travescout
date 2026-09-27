import type { Trip } from '../types/trip';
import type { SearchQuery } from '../stores/searchStore';
import type { TransferPrefs } from './transferPrefs';
import { addDays, toISODate } from './format';

// A return must leave at least this long after the outbound arrives.
export const RETURN_BUFFER_MINS = 60;

export function defaultReturnDate(departDate: string): string {
  return addDays(departDate, 3);
}

// The return leg is a plain one-way search back. An overnight outbound can
// land after the chosen return date; then search from its arrival day.
export function returnSearchQuery(q: SearchQuery, outbound: Trip | null): SearchQuery | null {
  if (!q.returnDate) return null;
  const arrivalDay = outbound ? toISODate(new Date(outbound.arriveAt)) : q.returnDate;
  return {
    from: q.to,
    to: q.from,
    departDate: q.returnDate < arrivalDay ? arrivalDay : q.returnDate,
    adults: q.adults,
  };
}

export function returnsAfter<T extends Trip>(trips: T[], outbound: Trip | null, bufferMins = RETURN_BUFFER_MINS): T[] {
  if (!outbound) return trips;
  const earliest = new Date(outbound.arriveAt).getTime() + bufferMins * 60_000;
  return trips.filter(t => new Date(t.departAt).getTime() >= earliest);
}

// Transfer prefs are stored outbound-oriented (home → stay); the return runs backwards.
export function reversePrefs(p: TransferPrefs): TransferPrefs {
  return { startAddress: p.endAddress, endAddress: p.startAddress, travelMode: p.travelMode };
}
