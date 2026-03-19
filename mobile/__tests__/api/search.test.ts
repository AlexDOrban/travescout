jest.mock('../../src/api/client', () => ({
  api: { get: jest.fn() },
}));

import { search } from '../../src/api/search';
import { api } from '../../src/api/client';

const mockGet = api.get as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('search', () => {
  it('calls GET /search with required params', async () => {
    mockGet.mockResolvedValue({ results: [], meta: {} });
    await search({ from: 'LON', to: 'PAR', departDate: '2026-04-15' });
    expect(mockGet).toHaveBeenCalledWith(
      '/search?from=LON&to=PAR&departDate=2026-04-15',
    );
  });

  it('includes optional returnDate and adults', async () => {
    mockGet.mockResolvedValue({ results: [], meta: {} });
    await search({
      from: 'LON',
      to: 'PAR',
      departDate: '2026-04-15',
      returnDate: '2026-04-20',
      adults: 2,
    });
    expect(mockGet).toHaveBeenCalledWith(
      '/search?from=LON&to=PAR&departDate=2026-04-15&returnDate=2026-04-20&adults=2',
    );
  });

  it('omits adults when value is 1 (the default)', async () => {
    mockGet.mockResolvedValue({ results: [], meta: {} });
    await search({ from: 'LON', to: 'PAR', departDate: '2026-04-15', adults: 1 });
    const url = mockGet.mock.calls[0][0] as string;
    expect(url).not.toContain('adults');
  });

  it('returns the search response', async () => {
    const response = { results: [{ id: 'a:1' }], meta: { from: 'LON' } };
    mockGet.mockResolvedValue(response);
    const result = await search({ from: 'LON', to: 'PAR', departDate: '2026-04-15' });
    expect(result).toEqual(response);
  });
});
