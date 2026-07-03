jest.mock('amadeus');
const Amadeus = require('amadeus');

// The provider caches a single Amadeus client, so expose one shared mock.
const mockGet = jest.fn();
Amadeus.mockImplementation(() => ({
  shopping: {
    flightOffersSearch: { get: mockGet },
  },
}));

// Real credentials present → provider must call the API, not the stub.
process.env.AMADEUS_CLIENT_ID = 'real_client_id_for_tests';
process.env.AMADEUS_CLIENT_SECRET = 'real_secret';

const { search } = require('../../src/providers/amadeus');

describe('Amadeus provider (configured credentials)', () => {
  const params = { from: 'LON', to: 'PAR', departDate: '2026-04-15', adults: 1 };

  beforeEach(() => {
    mockGet.mockReset();
  });

  it('calls the Amadeus flight offers API with correct params', async () => {
    mockGet.mockResolvedValue({
      data: [
        {
          id: 'offer-1',
          itineraries: [
            {
              duration: 'PT1H15M',
              segments: [
                {
                  departure: { iataCode: 'LHR', at: '2026-04-15T06:30:00' },
                  arrival: { iataCode: 'CDG', at: '2026-04-15T08:45:00' },
                  numberOfStops: 0,
                },
              ],
            },
          ],
          price: { grandTotal: '54.00', currency: 'EUR' },
          travelerPricings: [{ fareDetailsBySegment: [] }],
        },
      ],
    });

    const results = await search(params);

    expect(mockGet).toHaveBeenCalledWith({
      originLocationCode: 'LON',
      destinationLocationCode: 'PAR',
      departureDate: '2026-04-15',
      adults: 1,
      currencyCode: 'EUR',
      max: 10,
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toHaveProperty('id');
    expect(results[0]).toHaveProperty('price.grandTotal');
  });

  it('passes returnDate through for round-trip searches', async () => {
    mockGet.mockResolvedValue({ data: [] });

    await search({ ...params, returnDate: '2026-04-20' });

    expect(mockGet).toHaveBeenCalledWith(expect.objectContaining({
      returnDate: '2026-04-20',
    }));
  });

  it('returns an empty array when Amadeus returns no data', async () => {
    mockGet.mockResolvedValue({ data: [] });

    const results = await search(params);
    expect(results).toEqual([]);
  });

  it('throws when Amadeus API call fails with a non-auth error', async () => {
    mockGet.mockRejectedValue(new Error('API error'));

    await expect(search(params)).rejects.toThrow('API error');
  });
});

describe('Amadeus provider stub fallback', () => {
  const params = { from: 'LON', to: 'PAR', departDate: '2026-07-20', adults: 2 };

  function loadWithEnv(clientId) {
    let provider;
    jest.isolateModules(() => {
      if (clientId === undefined) delete process.env.AMADEUS_CLIENT_ID;
      else process.env.AMADEUS_CLIENT_ID = clientId;
      provider = require('../../src/providers/amadeus');
    });
    return provider;
  }

  afterAll(() => {
    process.env.AMADEUS_CLIENT_ID = 'real_client_id_for_tests';
  });

  it('serves normalizer-compatible stub offers when credentials are missing', async () => {
    const provider = loadWithEnv(undefined);
    const results = await provider.search(params);

    expect(results.length).toBeGreaterThanOrEqual(3);
    for (const offer of results) {
      expect(offer).toHaveProperty('id');
      expect(offer.itineraries[0].segments[0].departure).toHaveProperty('iataCode');
      expect(offer.itineraries[0].segments[0].departure).toHaveProperty('at');
      expect(offer.itineraries[0].duration).toMatch(/^PT\d+H\d+M$/);
      expect(parseFloat(offer.price.grandTotal)).toBeGreaterThan(0);
    }
    // City codes are mapped to real airport hubs.
    expect(results[0].itineraries[0].segments[0].departure.iataCode).toBe('LHR');
    expect(results[0].itineraries[0].segments[0].arrival.iataCode).toBe('CDG');
  });

  it('serves stub offers for placeholder credentials without calling the API', async () => {
    mockGet.mockReset();
    const provider = loadWithEnv('sandbox_client_id');
    const results = await provider.search(params);

    expect(results.length).toBeGreaterThanOrEqual(3);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('falls back to stub offers after the API rejects credentials', async () => {
    const provider = loadWithEnv('real_looking_but_invalid');
    const authError = new Error('invalid_client');
    authError.response = { statusCode: 401 };
    mockGet.mockReset();
    mockGet.mockRejectedValue(authError);

    const results = await provider.search(params);
    expect(results.length).toBeGreaterThanOrEqual(3);

    // Subsequent searches skip the API during the backoff window.
    mockGet.mockClear();
    await provider.search(params);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('never serves stub flights in production', async () => {
    const prevEnv = process.env.NODE_ENV;
    const prevMock = process.env.MOCK_PROVIDERS;
    process.env.NODE_ENV = 'production';
    delete process.env.MOCK_PROVIDERS;
    try {
      const provider = loadWithEnv(undefined);
      await expect(provider.search(params)).rejects.toThrow('Amadeus credentials are not configured');

      // Auth rejection in production also fails closed instead of stubbing.
      const rejecting = loadWithEnv('real_looking_but_invalid');
      const authError = new Error('invalid_client');
      authError.response = { statusCode: 401 };
      mockGet.mockReset();
      mockGet.mockRejectedValue(authError);
      await expect(rejecting.search(params)).rejects.toThrow('invalid_client');
    } finally {
      process.env.NODE_ENV = prevEnv;
      if (prevMock !== undefined) process.env.MOCK_PROVIDERS = prevMock;
    }
  });
});

describe('Amadeus provider book stub', () => {
  const params = {
    trip: { provider: 'amadeus', origin: 'LHR', destination: 'CDG' },
    passengers: [{ name: 'Alice Smith', email: 'alice@example.com' }],
  };

  it('returns a booking reference starting with AM-', async () => {
    // No mock needed — book() is a pure stub with no external calls
    const { book } = require('../../src/providers/amadeus');
    const result = await book(params);
    expect(result.bookingRef).toMatch(/^AM-/);
  });

  it('returns confirmed status', async () => {
    const { book } = require('../../src/providers/amadeus');
    const result = await book(params);
    expect(result.status).toBe('confirmed');
  });
});
