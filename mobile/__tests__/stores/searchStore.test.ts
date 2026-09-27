import {
  setSearchResults,
  getSearchResults,
  getSearchMeta,
  getResultById,
  clearSearchResults,
  setSelectedOutbound,
  getSelectedOutbound,
} from '../../src/stores/searchStore';
import { RankedTrip, SearchMeta } from '../../src/types/trip';

const makeMeta = (overrides: Partial<SearchMeta> = {}): SearchMeta => ({
  from: 'LON',
  to: 'PAR',
  departDate: '2026-04-15',
  adults: 1,
  providersQueried: ['provider-a'],
  providersFailed: [],
  ...overrides,
});

const makeTrip = (id: string, overrides: Partial<RankedTrip> = {}): RankedTrip => ({
  id,
  provider: 'provider-a',
  transportType: 'flight',
  origin: 'LON',
  destination: 'PAR',
  departAt: '2026-04-15T08:00:00Z',
  arriveAt: '2026-04-15T10:00:00Z',
  durationMins: 120,
  priceEur: 99,
  stops: 0,
  deepLink: 'https://example.com/trip/' + id,
  score: 0.8,
  tags: ['BALANCED'],
  ...overrides,
});

afterEach(() => clearSearchResults());

describe('searchStore', () => {
  describe('set/get round-trip for results and meta', () => {
    it('returns stored results after setSearchResults', () => {
      const trips = [makeTrip('trip-1'), makeTrip('trip-2')];
      const meta = makeMeta();
      setSearchResults(trips, meta);
      expect(getSearchResults()).toEqual(trips);
    });

    it('returns stored meta after setSearchResults', () => {
      const trips = [makeTrip('trip-1')];
      const meta = makeMeta({ adults: 2 });
      setSearchResults(trips, meta);
      expect(getSearchMeta()).toEqual(meta);
    });

    it('returns empty results and null meta before any data is set', () => {
      expect(getSearchResults()).toEqual([]);
      expect(getSearchMeta()).toBeNull();
    });
  });

  describe('getResultById', () => {
    it('returns the correct trip for a known id', () => {
      const trip1 = makeTrip('trip-1');
      const trip2 = makeTrip('trip-2');
      setSearchResults([trip1, trip2], makeMeta());
      expect(getResultById('trip-2')).toEqual(trip2);
    });

    it('returns undefined for an unknown id', () => {
      setSearchResults([makeTrip('trip-1')], makeMeta());
      expect(getResultById('does-not-exist')).toBeUndefined();
    });
  });

  describe('clearSearchResults', () => {
    it('resets results to an empty array', () => {
      setSearchResults([makeTrip('trip-1')], makeMeta());
      clearSearchResults();
      expect(getSearchResults()).toEqual([]);
    });

    it('resets meta to null', () => {
      setSearchResults([makeTrip('trip-1')], makeMeta());
      clearSearchResults();
      expect(getSearchMeta()).toBeNull();
    });
  });
});

describe('search query', () => {
  it('stores the query and clears it with the results', () => {
    const { setSearchQuery, getSearchQuery } = jest.requireActual('../../src/stores/searchStore');
    const q = { from: { name: 'London', code: 'LON', country: 'UK' }, to: { name: 'Paris', code: 'PAR', country: 'FR' }, departDate: '2030-05-01', adults: 2 };
    setSearchQuery(q);
    expect(getSearchQuery()).toEqual(q);
    clearSearchResults();
    expect(getSearchQuery()).toBeNull();
  });
});

describe('searchStore — return leg', () => {
  const r = (id: string) => ({ id } as RankedTrip);

  it('keeps outbound and return results apart', () => {
    setSearchResults([r('out-1')], makeMeta({ from: 'LON' }));
    setSearchResults([r('ret-1')], makeMeta({ from: 'PAR' }), 'return');
    expect(getSearchResults().map(t => t.id)).toEqual(['out-1']);
    expect(getSearchResults('return').map(t => t.id)).toEqual(['ret-1']);
    expect(getSearchMeta('return')!.from).toBe('PAR');
    expect(getResultById('ret-1', 'return')).toBeDefined();
    expect(getResultById('ret-1')).toBeUndefined();
  });

  it('remembers the selected outbound until cleared', () => {
    setSearchResults([r('ret-1')], makeMeta(), 'return');
    setSelectedOutbound(r('out-1'));
    expect(getSelectedOutbound()!.id).toBe('out-1');
    clearSearchResults();
    expect(getSelectedOutbound()).toBeNull();
    expect(getSearchResults('return')).toEqual([]);
  });
});
