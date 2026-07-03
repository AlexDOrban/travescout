import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import PaymentScreen from '../../app/checkout/payment';
import {
  getCheckoutTrip,
  getCheckoutAdults,
  getPassengers,
  setBookingResult,
} from '../../src/stores/checkoutStore';
import { book } from '../../src/api/booking';

jest.mock('../../src/stores/checkoutStore');
jest.mock('../../src/stores/searchStore');
jest.mock('../../src/api/booking');
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
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
  router: { canGoBack: () => false, back: jest.fn() },
}));

const mockGetTrip = getCheckoutTrip as jest.Mock;
const mockGetAdults = getCheckoutAdults as jest.Mock;
const mockGetPassengers = getPassengers as jest.Mock;
const mockSetBookingResult = setBookingResult as jest.Mock;
const mockBook = book as jest.Mock;

function fillValidCard(getByTestId: (id: string) => any) {
  fireEvent.changeText(getByTestId('card-number'), '4242424242424242');
  fireEvent.changeText(getByTestId('card-expiry'), '12/30');
  fireEvent.changeText(getByTestId('card-cvc'), '123');
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetTrip.mockReturnValue({
    id: 'a:1', provider: 'amadeus', transportType: 'flight',
    origin: 'LON', destination: 'PAR',
    departAt: '2026-04-15T08:00:00Z', arriveAt: '2026-04-15T10:15:00Z',
    durationMins: 135, priceEur: 42.5, stops: 0, deepLink: 'https://example.com',
    score: 0.85, tags: [],
  });
  mockGetAdults.mockReturnValue(1);
  mockGetPassengers.mockReturnValue([{ name: 'John Doe', email: 'john@test.com' }]);
});

describe('PaymentScreen', () => {
  it('renders card input fields and pay button', () => {
    const { getByTestId } = render(<PaymentScreen />);
    expect(getByTestId('card-number')).toBeTruthy();
    expect(getByTestId('card-expiry')).toBeTruthy();
    expect(getByTestId('card-cvc')).toBeTruthy();
    expect(getByTestId('pay-btn')).toBeTruthy();
  });

  it('displays total amount on pay button', () => {
    const { getByText } = render(<PaymentScreen />);
    expect(getByText(/€42\.50/)).toBeTruthy();
  });

  it('calls book API and navigates to confirmation on success', async () => {
    const bookingResponse = {
      bookingRef: 'FB-123',
      status: 'confirmed',
      trip: { id: 'uuid', provider: 'amadeus' },
    };
    mockBook.mockResolvedValue(bookingResponse);

    const { getByTestId } = render(<PaymentScreen />);
    fillValidCard(getByTestId);
    fireEvent.press(getByTestId('pay-btn'));

    await waitFor(() => {
      expect(mockBook).toHaveBeenCalledWith(
        expect.objectContaining({
          trip: {
            provider: 'amadeus',
            origin: 'LON',
            destination: 'PAR',
            departAt: '2026-04-15T08:00:00Z',
            arriveAt: '2026-04-15T10:15:00Z',
            priceEur: 42.5,
            deepLink: 'https://example.com',
          },
          passengers: [{ name: 'John Doe', email: 'john@test.com' }],
          paymentMethodId: 'pm_card_visa',
          idempotencyKey: expect.any(String),
        }),
      );
      expect(mockSetBookingResult).toHaveBeenCalledWith(bookingResponse);
      expect(mockReplace).toHaveBeenCalledWith('/confirmation');
    });
  });

  it('shows validation error and skips booking when card details are invalid', () => {
    const { getByTestId } = render(<PaymentScreen />);
    fireEvent.press(getByTestId('pay-btn'));

    expect(getByTestId('error').props.children).toBe('Enter a valid card number');
    expect(mockBook).not.toHaveBeenCalled();
  });

  it('shows error when booking fails', async () => {
    mockBook.mockRejectedValue(new Error('Payment failed'));

    const { getByTestId } = render(<PaymentScreen />);
    fillValidCard(getByTestId);
    fireEvent.press(getByTestId('pay-btn'));

    await waitFor(() => {
      expect(getByTestId('error').props.children).toBe('Payment failed');
    });
  });
});
