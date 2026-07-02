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

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PassengersScreen from '../../app/checkout/passengers';
import {
  getCheckoutTrip,
  getCheckoutAdults,
  setPassengers,
} from '../../src/stores/checkoutStore';

const mockGetTrip = getCheckoutTrip as jest.Mock;
const mockGetAdults = getCheckoutAdults as jest.Mock;
const mockSetPassengers = setPassengers as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetTrip.mockReturnValue({
    id: 'a:1', origin: 'LON', destination: 'PAR', priceEur: 42.5,
  });
  mockGetAdults.mockReturnValue(1);
});

describe('PassengersScreen', () => {
  it('renders passenger form for each adult', () => {
    mockGetAdults.mockReturnValue(2);
    const { getByTestId } = render(<PassengersScreen />);
    expect(getByTestId('name-0')).toBeTruthy();
    expect(getByTestId('email-0')).toBeTruthy();
    expect(getByTestId('name-1')).toBeTruthy();
    expect(getByTestId('email-1')).toBeTruthy();
  });

  it('shows validation error when fields are empty', () => {
    const { getByTestId } = render(<PassengersScreen />);
    fireEvent.press(getByTestId('next-btn'));
    expect(getByTestId('error')).toBeTruthy();
  });

  it('saves passengers and navigates to review', () => {
    const { getByTestId } = render(<PassengersScreen />);
    fireEvent.changeText(getByTestId('name-0'), 'John Doe');
    fireEvent.changeText(getByTestId('email-0'), 'john@test.com');
    fireEvent.press(getByTestId('next-btn'));
    expect(mockSetPassengers).toHaveBeenCalledWith([
      { name: 'John Doe', email: 'john@test.com' },
    ]);
    expect(mockPush).toHaveBeenCalledWith('/checkout/review');
  });

  it('shows trip not found when checkout trip is null', () => {
    mockGetTrip.mockReturnValue(null);
    const { getByText } = render(<PassengersScreen />);
    expect(getByText('No trip selected')).toBeTruthy();
  });
});
