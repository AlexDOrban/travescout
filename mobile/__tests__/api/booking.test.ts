import { book, getTrips } from '../../src/api/booking';
import { api } from '../../src/api/client';

jest.mock('../../src/api/client', () => ({
  api: { post: jest.fn(), get: jest.fn() },
}));

const mockPost = api.post as jest.Mock;
const mockGet = api.get as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('book', () => {
  it('calls POST /book with booking request', async () => {
    const request = {
      trip: {
        id: 'flixbus:leg-1',
        provider: 'flixbus',
        origin: 'LON',
        destination: 'PAR',
        departAt: '2026-04-15T06:30:00Z',
        arriveAt: '2026-04-15T11:00:00Z',
        priceEur: 18,
        deepLink: 'https://example.com',
      },
      passengers: [{ name: 'John', email: 'j@b.com' }],
      paymentMethodId: 'pm_card_visa',
    };
    const response = { bookingRef: 'FB-123', status: 'confirmed', trip: {} };
    mockPost.mockResolvedValue(response);

    const result = await book(request);

    expect(mockPost).toHaveBeenCalledWith('/book', request);
    expect(result).toEqual(response);
  });
});

describe('getTrips', () => {
  it('calls GET /trips and returns trips', async () => {
    const response = { trips: [{ id: '1', origin: 'LON' }] };
    mockGet.mockResolvedValue(response);

    const result = await getTrips();

    expect(mockGet).toHaveBeenCalledWith('/trips');
    expect(result).toEqual(response);
  });
});
