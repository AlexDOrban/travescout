jest.mock('amadeus');
const Amadeus = require('amadeus');
const { search } = require('../../src/providers/amadeus');

describe('Amadeus provider', () => {
  const params = { from: 'LON', to: 'PAR', departDate: '2026-04-15', adults: 1 };

  beforeEach(() => {
    Amadeus.mockClear();
  });

  it('calls the Amadeus flight offers API with correct params', async () => {
    const mockGet = jest.fn().mockResolvedValue({
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

    Amadeus.mockImplementation(() => ({
      shopping: {
        flightOffersSearch: { get: mockGet },
      },
    }));

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

  it('returns an empty array when Amadeus returns no data', async () => {
    Amadeus.mockImplementation(() => ({
      shopping: {
        flightOffersSearch: { get: jest.fn().mockResolvedValue({ data: [] }) },
      },
    }));

    const results = await search(params);
    expect(results).toEqual([]);
  });

  it('throws when Amadeus API call fails', async () => {
    Amadeus.mockImplementation(() => ({
      shopping: {
        flightOffersSearch: {
          get: jest.fn().mockRejectedValue(new Error('API error')),
        },
      },
    }));

    await expect(search(params)).rejects.toThrow('API error');
  });
});
