import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PassengersScreen from '../../app/checkout/passengers';
import {
  getCheckoutTrip,
  getCheckoutAdults,
  getPassengers,
  setPassengers,
  getCheckoutItinerary,
} from '../../src/stores/checkoutStore';

jest.mock('../../src/stores/checkoutStore');
jest.mock('../../src/contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: jest.requireActual('../../src/constants/colors').LIGHT, isDark: false }),
}));
jest.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'me@account.com' } }),
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
const mockSetPassengers = setPassengers as jest.Mock;
const mockGetItinerary = getCheckoutItinerary as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetTrip.mockReturnValue({
    id: 'a:1', origin: 'LON', destination: 'PAR', priceEur: 42.5,
  });
  mockGetAdults.mockReturnValue(1);
  (getPassengers as jest.Mock).mockReturnValue([]);
  mockGetItinerary.mockReturnValue(null);
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

  it('prefills the lead passenger email with the account email', () => {
    mockGetAdults.mockReturnValue(2);
    const { getByTestId } = render(<PassengersScreen />);
    expect(getByTestId('email-0').props.value).toBe('me@account.com');
    expect(getByTestId('email-1').props.value).toBe('');
  });

  it('keeps previously entered passengers when returning to this step', () => {
    (getPassengers as jest.Mock).mockReturnValue([{ name: 'Ada Lovelace', email: 'ada@x.com' }]);
    const { getByTestId } = render(<PassengersScreen />);
    expect(getByTestId('name-0').props.value).toBe('Ada Lovelace');
  });

  it('rejects an invalid email', () => {
    const { getByTestId } = render(<PassengersScreen />);
    fireEvent.changeText(getByTestId('name-0'), 'John Doe');
    fireEvent.changeText(getByTestId('email-0'), 'not-an-email');
    fireEvent.press(getByTestId('next-btn'));
    expect(getByTestId('error').props.children).toBe('Enter a valid email for passenger 1');
    expect(mockPush).not.toHaveBeenCalled();
  });
});

it('shows the outbound route for a round trip, not back home', () => {
  mockGetTrip.mockReturnValue(null);
  mockGetItinerary.mockReturnValue({
    legs: [
      { id: 'o', origin: 'LON', destination: 'PAR', originName: 'London', destinationName: 'Paris', direction: 'outbound' },
      { id: 'r', origin: 'PAR', destination: 'LON', originName: 'Paris', destinationName: 'London', direction: 'return' },
    ],
    connections: [], totalPriceEur: 0, adults: 1, tripType: 'round_trip',
  });
  const { getByText } = render(<PassengersScreen />);
  expect(getByText('London ⇄ Paris')).toBeTruthy();
});
