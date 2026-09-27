import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import PaymentScreen from '../../app/checkout/payment';
import {
  getCheckoutTrip,
  getCheckoutAdults,
  getPassengers,
  getCheckoutIdempotencyKey,
  getCheckoutTransfer,
  setBookingResult,
  getCheckoutItinerary,
} from '../../src/stores/checkoutStore';
import { book } from '../../src/api/booking';
import { bookItinerary } from '../../src/api/itinerary';
import { saveTransferPrefs } from '../../src/utils/transferPrefs';

jest.mock('../../src/stores/checkoutStore');
jest.mock('../../src/utils/transferPrefs');
jest.mock('../../src/stores/searchStore');
jest.mock('../../src/api/booking');
jest.mock('../../src/api/itinerary');
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
const mockGetItinerary = getCheckoutItinerary as jest.Mock;
const mockBookItinerary = bookItinerary as jest.Mock;

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
  mockGetItinerary.mockReturnValue(null);
  mockGetPassengers.mockReturnValue([{ name: 'John Doe', email: 'john@test.com' }]);
  (getCheckoutIdempotencyKey as jest.Mock).mockReturnValue('bk_test_key');
  (getCheckoutTransfer as jest.Mock).mockReturnValue({
    startAddress: '', endAddress: '', travelMode: 'transit',
  });
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
    expect(getByText('Pay €42.50')).toBeTruthy();
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
            id: 'a:1',
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
          idempotencyKey: 'bk_test_key',
        }),
      );
      expect(mockSetBookingResult).toHaveBeenCalledWith(bookingResponse);
      expect(mockReplace).toHaveBeenCalledWith('/confirmation');
    });
  });

  it('persists ground-transfer prefs under the booking ref on success', async () => {
    (getCheckoutTransfer as jest.Mock).mockReturnValue({
      startAddress: 'Savoy Hotel, London', endAddress: '', travelMode: 'transit',
    });
    mockBook.mockResolvedValue({ bookingRef: 'FB-123', status: 'confirmed', trip: {} });

    const { getByTestId } = render(<PaymentScreen />);
    fillValidCard(getByTestId);
    fireEvent.press(getByTestId('pay-btn'));

    await waitFor(() => {
      expect(saveTransferPrefs).toHaveBeenCalledWith('FB-123', {
        startAddress: 'Savoy Hotel, London', endAddress: '', travelMode: 'transit',
      });
    });
  });

  it('does not persist transfer prefs when nothing was entered', async () => {
    mockBook.mockResolvedValue({ bookingRef: 'FB-123', status: 'confirmed', trip: {} });

    const { getByTestId } = render(<PaymentScreen />);
    fillValidCard(getByTestId);
    fireEvent.press(getByTestId('pay-btn'));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/confirmation'));
    expect(saveTransferPrefs).not.toHaveBeenCalled();
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

  it('previews the card brand and holder as the user types', () => {
    const { getByTestId, getByText } = render(<PaymentScreen />);
    fireEvent.changeText(getByTestId('card-number'), '5555');
    expect(getByTestId('card-brand').props.children).toBe('Mastercard');
    expect(getByText('JOHN DOE')).toBeTruthy();
  });
});

it('books a round trip with tripType and the outbound endpoints', async () => {
  const base = {
    provider: 'rail', transportType: 'train', durationMins: 120, priceEur: 45, stops: 0, deepLink: '',
    departAt: '2030-06-15T08:00:00Z', arriveAt: '2030-06-15T10:00:00Z',
  };
  const legs = [
    { ...base, id: 'out', origin: 'LON', destination: 'PAR', originName: 'LON', destinationName: 'PAR', direction: 'outbound' },
    { ...base, id: 'ret', origin: 'PAR', destination: 'LON', originName: 'PAR', destinationName: 'LON', direction: 'return' },
  ];
  mockGetTrip.mockReturnValue(null);
  mockGetItinerary.mockReturnValue({
    legs, connections: [{ transferMins: 4000, stay: true }], totalPriceEur: 90, adults: 1,
    tripType: 'round_trip', viaConnections: false,
  });
  mockBookItinerary.mockResolvedValue({ bookingRef: 'TS-RT', status: 'confirmed', itinerary: { legs: [] } });

  const { getByTestId, getByText } = render(<PaymentScreen />);
  expect(getByText('LON ⇄ PAR')).toBeTruthy();
  fillValidCard(getByTestId);
  fireEvent.press(getByTestId('pay-btn'));

  await waitFor(() =>
    expect(mockBookItinerary).toHaveBeenCalledWith(
      expect.objectContaining({ tripType: 'round_trip', origin: 'LON', destination: 'PAR', idempotencyKey: 'bk_test_key' }),
    ),
  );
});
