jest.mock('../../src/api/client', () => ({
  api: { get: jest.fn(), post: jest.fn() },
}));

import { api } from '../../src/api/client';
import { searchConnections, bookItinerary, getItineraries } from '../../src/api/itinerary';

const mockGet = api.get as jest.Mock;
const mockPost = api.post as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('searchConnections', () => {
  it('calls GET /search/connections with correct params', async () => {
    mockGet.mockResolvedValue({ connections: [], meta: {} });
    await searchConnections({
      hub: 'VIE-APT', cityCode: 'BUD', direction: 'to',
      dateTime: '2030-06-15T14:00:00Z', adults: 1,
    });
    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining('/search/connections?')
    );
    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining('hub=VIE-APT')
    );
  });
});

describe('bookItinerary', () => {
  it('calls POST /book/itinerary', async () => {
    mockPost.mockResolvedValue({ bookingRef: 'TS-123', status: 'confirmed' });
    const request = {
      legs: [], passengers: [], paymentMethodId: 'pm_card_visa',
      origin: 'BUD', destination: 'NCE',
    };
    await bookItinerary(request);
    expect(mockPost).toHaveBeenCalledWith('/book/itinerary', request);
  });
});

describe('getItineraries', () => {
  it('calls GET /itineraries', async () => {
    mockGet.mockResolvedValue({ itineraries: [] });
    await getItineraries();
    expect(mockGet).toHaveBeenCalledWith('/itineraries');
  });
});
