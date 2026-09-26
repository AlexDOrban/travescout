import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ConfirmationScreen from '../../app/confirmation';
import { getBookingResult, clearCheckout } from '../../src/stores/checkoutStore';

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

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

const mockGetBookingResult = getBookingResult as jest.Mock;
const mockClearCheckout = clearCheckout as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetBookingResult.mockReturnValue({
    bookingRef: 'FB-1234567890',
    status: 'confirmed',
    trip: {
      id: 'uuid',
      provider: 'flixbus',
      origin: 'LON',
      destination: 'PAR',
      depart_at: '2026-04-15T06:30:00Z',
      price_eur: '18.00',
      status: 'confirmed',
    },
  });
});

describe('ConfirmationScreen', () => {
  it('displays booking reference', () => {
    const { getByText } = render(<ConfirmationScreen />);
    expect(getByText('FB-1234567890')).toBeTruthy();
  });

  it('displays confirmed status', () => {
    const { getByText } = render(<ConfirmationScreen />);
    expect(getByText(/confirmed/i)).toBeTruthy();
  });

  it('displays trip route', () => {
    const { getByText } = render(<ConfirmationScreen />);
    expect(getByText('LON → PAR')).toBeTruthy();
  });

  it('navigates to trips tab and clears checkout', () => {
    const { getByTestId } = render(<ConfirmationScreen />);
    fireEvent.press(getByTestId('view-trips-btn'));
    expect(mockClearCheckout).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/trips');
  });

  it('shows fallback when no booking result', () => {
    mockGetBookingResult.mockReturnValue(null);
    const { getByText } = render(<ConfirmationScreen />);
    expect(getByText('No booking found')).toBeTruthy();
  });

  it('offers airport directions via the route-on-map menu', () => {
    const { getByTestId, getByText } = render(<ConfirmationScreen />);
    fireEvent.press(getByTestId('route-map-toggle'));
    expect(getByText(/London, UK → Paris, FR/)).toBeTruthy();
    expect(getByTestId('route-start-address')).toBeTruthy();
  });

  it('shows per-leg status for itinerary booking', () => {
    mockGetBookingResult.mockReturnValue({
      bookingRef: 'TS-123',
      status: 'confirmed',
      itinerary: {
        id: 'uuid', booking_ref: 'TS-123', origin: 'BUD', destination: 'NCE',
        depart_at: '2030-06-15T08:00:00Z', arrive_at: '2030-06-15T17:05:00Z',
        total_price_eur: '81.00', status: 'confirmed',
        legs: [
          { id: '1', provider: 'flixbus', booking_ref: 'FB-1', origin: 'BUD', destination: 'VIE', depart_at: '2030-06-15T08:00:00Z', return_at: null, price_eur: '15.00', currency_display: 'EUR', status: 'confirmed', raw_ticket_url: null, created_at: '2026-03-18T10:00:00Z' },
          { id: '2', provider: 'amadeus', booking_ref: 'AM-2', origin: 'VIE', destination: 'NCE', depart_at: '2030-06-15T12:00:00Z', return_at: null, price_eur: '62.00', currency_display: 'EUR', status: 'confirmed', raw_ticket_url: null, created_at: '2026-03-18T10:00:00Z' },
        ],
      },
    });

    const { getByText } = render(<ConfirmationScreen />);
    expect(getByText('BUD → VIE')).toBeTruthy();
    expect(getByText('VIE → NCE')).toBeTruthy();
    expect(getByText('TS-123')).toBeTruthy();
  });
});
