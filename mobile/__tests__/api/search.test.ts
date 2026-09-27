import { search, searchPrices } from '../../src/api/search';
import { api } from '../../src/api/client';

jest.mock('../../src/api/client', () => ({
  api: { get: jest.fn() },
}));

const mockGet = api.get as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('search', () => {
  it('calls GET /search with required params', async () => {
    mockGet.mockResolvedValue({ results: [], meta: {} });
    await search({ from: 'LON', to: 'PAR', departDate: '2026-04-15' });
    expect(mockGet).toHaveBeenCalledWith(
      '/search?from=LON&to=PAR&departDate=2026-04-15&adults=1',
    );
  });

  it('includes adults (round trips are not supported)', async () => {
    mockGet.mockResolvedValue({ results: [], meta: {} });
    await search({
      from: 'LON',
      to: 'PAR',
      departDate: '2026-04-15',
      adults: 2,
    });
    expect(mockGet).toHaveBeenCalledWith(
      '/search?from=LON&to=PAR&departDate=2026-04-15&adults=2',
    );
  });

  it('always includes adults, even when value is 1 (the default)', async () => {
    mockGet.mockResolvedValue({ results: [], meta: {} });
    await search({ from: 'LON', to: 'PAR', departDate: '2026-04-15', adults: 1 });
    const url = mockGet.mock.calls[0][0] as string;
    expect(url).toContain('adults=1');
  });

  it('returns the search response', async () => {
    const response = { results: [{ id: 'a:1' }], meta: { from: 'LON' } };
    mockGet.mockResolvedValue(response);
    const result = await search({ from: 'LON', to: 'PAR', departDate: '2026-04-15' });
    expect(result).toEqual(response);
  });
});

describe('searchPrices', () => {
  it('calls GET /search/prices with the window and party', async () => {
    mockGet.mockResolvedValue({ prices: [] });
    await searchPrices({ from: 'LON', to: 'PAR', startDate: '2030-05-01', days: 7, adults: 2 });
    expect(mockGet).toHaveBeenCalledWith('/search/prices?from=LON&to=PAR&startDate=2030-05-01&days=7&adults=2');
  });
});
