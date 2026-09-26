import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TripDetailScreen from '../../app/trip/[id]';
import { getResultById, getSearchMeta } from '../../src/stores/searchStore';
import { setCheckoutTrip, setCheckoutItinerary } from '../../src/stores/checkoutStore';

jest.mock('../../src/stores/searchStore');
jest.mock('../../src/stores/checkoutStore');
jest.mock('../../src/contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: jest.requireActual('../../src/constants/colors').LIGHT, isDark: false }),
}));
jest.mock('../../src/contexts/CurrencyContext', () => ({
  useCurrency: () => ({
    currency: { code: 'EUR', symbol: '€' },
    currencies: [{ code: 'EUR', symbol: '€' }],
    setCurrency: jest.fn(),
    format: (n: number) => `€${n.toFixed(2)}`,
  }),
}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'amadeus:1' }),
  useRouter: () => ({ back: jest.fn(), push: mockPush }),
  router: { canGoBack: () => false, back: jest.fn() },
}));

const mockGetById = getResultById as jest.Mock;
const mockGetSearchMeta = getSearchMeta as jest.Mock;
const mockSetCheckoutTrip = setCheckoutTrip as jest.Mock;
const mockSetCheckoutItinerary = setCheckoutItinerary as jest.Mock;

const MOCK_TRIP = {
  id: 'amadeus:1',
  provider: 'amadeus',
  transportType: 'flight',
  origin: 'LON',
  destination: 'PAR',
  departAt: '2026-04-15T08:00:00Z',
  arriveAt: '2026-04-15T10:15:00Z',
  durationMins: 135,
  priceEur: 42.5,
  stops: 0,
  deepLink: 'https://example.com',
  score: 0.85,
  tags: ['CHEAPEST'],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSearchMeta.mockReturnValue({ adults: 1 });
});

describe('TripDetailScreen', () => {
  it('renders trip route and price', () => {
    mockGetById.mockReturnValue(MOCK_TRIP);
    const { getByText, getByTestId } = render(<TripDetailScreen />);
    expect(getByText('LON → PAR')).toBeTruthy();
    expect(getByTestId('price').props.children).toBe('€42.50');
  });

  it('renders tag badges', () => {
    mockGetById.mockReturnValue(MOCK_TRIP);
    const { getByText } = render(<TripDetailScreen />);
    expect(getByText('Cheapest')).toBeTruthy();
  });

  it('shows not found when trip is missing', () => {
    mockGetById.mockReturnValue(undefined);
    const { getByText } = render(<TripDetailScreen />);
    expect(getByText('Trip not found')).toBeTruthy();
  });

  it('shows Direct for 0 stops', () => {
    mockGetById.mockReturnValue(MOCK_TRIP);
    const { getByTestId } = render(<TripDetailScreen />);
    expect(getByTestId('detail-stops').props.children).toBe('Direct');
  });

  it('renders Book Now button', () => {
    mockGetById.mockReturnValue(MOCK_TRIP);
    const { getByTestId } = render(<TripDetailScreen />);
    expect(getByTestId('book-btn')).toBeTruthy();
  });

  it('shows provider name', () => {
    mockGetById.mockReturnValue(MOCK_TRIP);
    const { getByTestId } = render(<TripDetailScreen />);
    expect(getByTestId('detail-provider').props.children).toBe('Air partners');
  });

  it('Book Now sets checkout trip and navigates to transfer', () => {
    mockGetById.mockReturnValue(MOCK_TRIP);
    const { getByTestId } = render(<TripDetailScreen />);
    fireEvent.press(getByTestId('book-btn'));
    expect(mockSetCheckoutTrip).toHaveBeenCalledWith(MOCK_TRIP, 1);
    expect(mockPush).toHaveBeenCalledWith('/checkout/transfer');
  });

  it('shows city names from the search in the journey timeline', () => {
    mockGetById.mockReturnValue(MOCK_TRIP);
    (jest.requireMock('../../src/stores/searchStore').getSearchQuery as jest.Mock).mockReturnValue({
      from: { name: 'London', code: 'LON', country: 'UK' },
      to: { name: 'Paris', code: 'PAR', country: 'FR' },
      departDate: '2026-04-15',
      adults: 2,
    });
    mockGetSearchMeta.mockReturnValue({ adults: 2 });
    const { getByText } = render(<TripDetailScreen />);
    expect(getByText('London')).toBeTruthy();
    expect(getByText('Paris')).toBeTruthy();
    expect(getByText('Total · 2 adults')).toBeTruthy();
  });

  it('navigates to connections screen when Add Connections pressed', () => {
    mockGetById.mockReturnValue(MOCK_TRIP);
    const { getByTestId } = render(<TripDetailScreen />);
    const btn = getByTestId('add-connections-btn');
    fireEvent.press(btn);
    expect(mockSetCheckoutItinerary).toHaveBeenCalledWith(
      expect.objectContaining({
        ...MOCK_TRIP,
        originName: MOCK_TRIP.origin,
        destinationName: MOCK_TRIP.destination,
      }),
      1,
    );
    expect(mockPush).toHaveBeenCalledWith('/checkout/connections');
  });
});
