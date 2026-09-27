import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TransferScreen from '../../app/checkout/transfer';
import {
  getCheckoutTrip,
  getCheckoutItinerary,
  getCheckoutTransfer,
  setCheckoutTransfer,
} from '../../src/stores/checkoutStore';

jest.mock('../../src/stores/checkoutStore');
jest.mock('../../src/contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: jest.requireActual('../../src/constants/colors').LIGHT, isDark: false }),
}));
jest.mock('../../src/contexts/CurrencyContext', () => ({
  useCurrency: () => ({
    currency: { code: 'EUR', symbol: '€' },
    currencies: [{ code: 'EUR', symbol: '€' }],
    setCurrency: jest.fn(),
    convert: (n: number) => n,
    format: (n: number) => `€${n.toFixed(2)}`,
  }),
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  router: { canGoBack: () => false, back: jest.fn() },
}));

const mockGetTrip = getCheckoutTrip as jest.Mock;
const mockGetItinerary = getCheckoutItinerary as jest.Mock;
const mockSetTransfer = setCheckoutTransfer as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetTrip.mockReturnValue({
    id: 'a:1', origin: 'LON', destination: 'PAR', priceEur: 42.5,
  });
  mockGetItinerary.mockReturnValue(null);
  (getCheckoutTransfer as jest.Mock).mockReturnValue({ startAddress: '', endAddress: '', travelMode: 'transit' });
});

describe('TransferScreen', () => {
  it('saves typed addresses and mode, then continues to passengers', () => {
    const { getByTestId } = render(<TransferScreen />);
    fireEvent.changeText(getByTestId('transfer-start'), 'Savoy Hotel, London');
    fireEvent.changeText(getByTestId('transfer-end'), 'Hôtel Lutetia, Paris');
    fireEvent.press(getByTestId('transfer-mode-walking'));
    fireEvent.press(getByTestId('transfer-continue'));

    expect(mockSetTransfer).toHaveBeenCalledWith({
      startAddress: 'Savoy Hotel, London',
      endAddress: 'Hôtel Lutetia, Paris',
      travelMode: 'walking',
    });
    expect(mockPush).toHaveBeenCalledWith('/checkout/passengers');
  });

  it('skips straight to passengers without saving', () => {
    const { getByTestId } = render(<TransferScreen />);
    fireEvent.press(getByTestId('transfer-skip'));
    expect(mockSetTransfer).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/checkout/passengers');
  });

  it('shows a fallback when no trip is selected', () => {
    mockGetTrip.mockReturnValue(null);
    const { getByText } = render(<TransferScreen />);
    expect(getByText('No trip selected')).toBeTruthy();
  });

  it('keeps what was entered when coming back to this step', () => {
    (getCheckoutTransfer as jest.Mock).mockReturnValue({ startAddress: 'Savoy Hotel', endAddress: 'Lutetia', travelMode: 'walking' });
    const { getByTestId } = render(<TransferScreen />);
    expect(getByTestId('transfer-start').props.value).toBe('Savoy Hotel');
    expect(getByTestId('transfer-end').props.value).toBe('Lutetia');
  });
});
