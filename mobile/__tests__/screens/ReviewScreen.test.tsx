import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ReviewScreen from '../../app/checkout/review';
import {
  getCheckoutTrip,
  getCheckoutAdults,
  getPassengers,
} from '../../src/stores/checkoutStore';

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

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  router: { canGoBack: () => false, back: jest.fn() },
}));

const mockGetTrip = getCheckoutTrip as jest.Mock;
const mockGetAdults = getCheckoutAdults as jest.Mock;
const mockGetPassengers = getPassengers as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetTrip.mockReturnValue({
    id: 'a:1', provider: 'amadeus', transportType: 'flight',
    origin: 'LON', destination: 'PAR',
    departAt: '2026-04-15T08:00:00Z', arriveAt: '2026-04-15T10:15:00Z',
    durationMins: 135, priceEur: 42.5, stops: 0, deepLink: '',
    score: 0.85, tags: [],
  });
  mockGetAdults.mockReturnValue(1);
  mockGetPassengers.mockReturnValue([{ name: 'John Doe', email: 'john@test.com' }]);
});

describe('ReviewScreen', () => {
  it('displays trip route and price', () => {
    const { getByText } = render(<ReviewScreen />);
    expect(getByText('LON → PAR')).toBeTruthy();
    expect(getByText('€42.50')).toBeTruthy();
  });

  it('displays passenger info', () => {
    const { getByText } = render(<ReviewScreen />);
    expect(getByText('John Doe')).toBeTruthy();
    expect(getByText('john@test.com')).toBeTruthy();
  });

  it('displays trip price as total without multiplying by passengers', () => {
    mockGetAdults.mockReturnValue(2);
    mockGetPassengers.mockReturnValue([
      { name: 'John', email: 'j@b.com' },
      { name: 'Jane', email: 'ja@b.com' },
    ]);
    const { getByTestId, getByText } = render(<ReviewScreen />);
    // Provider price already covers the whole party — no client-side multiplication.
    expect(getByTestId('total-price').props.children).toBe('€42.50');
    expect(getByText('€42.50 for 2 travellers')).toBeTruthy();
  });

  it('navigates to payment on confirm', () => {
    const { getByTestId } = render(<ReviewScreen />);
    fireEvent.press(getByTestId('pay-btn'));
    expect(mockPush).toHaveBeenCalledWith('/checkout/payment');
  });
});
