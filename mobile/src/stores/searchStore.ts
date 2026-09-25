import { RankedTrip, SearchMeta } from '../types/trip';
import type { City } from '../data/cities';

// The query behind the current results, with full city objects so the results
// screen can show names and re-run the search for another date.
export interface SearchQuery {
  from: City;
  to: City;
  departDate: string;
  adults: number;
}

let _results: RankedTrip[] = [];
let _meta: SearchMeta | null = null;
let _query: SearchQuery | null = null;

export function setSearchResults(results: RankedTrip[], meta: SearchMeta): void {
  _results = results;
  _meta = meta;
}

export function getSearchResults(): RankedTrip[] {
  return _results;
}

export function getSearchMeta(): SearchMeta | null {
  return _meta;
}

export function getResultById(id: string): RankedTrip | undefined {
  return _results.find(t => t.id === id);
}

export function setSearchQuery(query: SearchQuery): void {
  _query = query;
}

export function getSearchQuery(): SearchQuery | null {
  return _query;
}

export function clearSearchResults(): void {
  _results = [];
  _meta = null;
  _query = null;
}
