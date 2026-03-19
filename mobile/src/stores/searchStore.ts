import { RankedTrip, SearchMeta } from '../types/trip';

let _results: RankedTrip[] = [];
let _meta: SearchMeta | null = null;

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

export function clearSearchResults(): void {
  _results = [];
  _meta = null;
}
