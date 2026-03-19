jest.mock('../../src/stores/checkoutStore');
jest.mock('../../src/contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      text: '#fff', textSecondary: '#aaa', card: '#111',
      border: '#333', background: '#000', accent: '#66f',
      cheapest: '#0f0', error: '#f00',
    },
  }),
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

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ConfirmationScreen from '../../app/confirmation';
import { getBookingResult, clearCheckout } from '../../src/stores/checkoutStore';

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
});
