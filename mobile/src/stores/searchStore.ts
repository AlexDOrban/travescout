import { RankedTrip, SearchMeta } from '../types/trip';
import type { City } from '../data/cities';

// The query behind the current results, with full city objects so the results
// screen can show names and re-run the search for another date.
export interface SearchQuery {
  from: City;
  to: City;
  departDate: string;
  /** Set for round trips; the return leg is searched as a one-way back. */
  returnDate?: string;
  adults: number;
}

export type SearchLeg = 'outbound' | 'return';

interface LegResults {
  results: RankedTrip[];
  meta: SearchMeta | null;
}

const empty = (): LegResults => ({ results: [], meta: null });

let _legs: Record<SearchLeg, LegResults> = { outbound: empty(), return: empty() };
let _query: SearchQuery | null = null;
let _selectedOutbound: RankedTrip | null = null;

export function setSearchResults(results: RankedTrip[], meta: SearchMeta, leg: SearchLeg = 'outbound'): void {
  _legs = { ..._legs, [leg]: { results, meta } };
}

export function getSearchResults(leg: SearchLeg = 'outbound'): RankedTrip[] {
  return _legs[leg].results;
}

export function getSearchMeta(leg: SearchLeg = 'outbound'): SearchMeta | null {
  return _legs[leg].meta;
}

export function getResultById(id: string, leg: SearchLeg = 'outbound'): RankedTrip | undefined {
  return _legs[leg].results.find(t => t.id === id);
}

export function setSearchQuery(query: SearchQuery): void {
  _query = query;
}

export function getSearchQuery(): SearchQuery | null {
  return _query;
}

export function setSelectedOutbound(trip: RankedTrip | null): void {
  _selectedOutbound = trip;
}

export function getSelectedOutbound(): RankedTrip | null {
  return _selectedOutbound;
}

export function clearSearchResults(): void {
  _legs = { outbound: empty(), return: empty() };
  _query = null;
  _selectedOutbound = null;
}
