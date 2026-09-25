import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AlertsScreen from '../../app/(tabs)/alerts';
import { searchPrices } from '../../src/api/search';
import { addAlert, alertId } from '../../src/utils/priceAlerts';
import { getSearchQuery, clearSearchResults } from '../../src/stores/searchStore';
import { addDays, todayISO } from '../../src/utils/format';

jest.mock('../../src/api/search');
jest.mock('../../src/contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: jest.requireActual('../../src/constants/colors').LIGHT, isDark: false }),
}));
jest.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'u@x.com' } }),
}));
jest.mock('../../src/contexts/CurrencyContext', () => ({
  useCurrency: () => ({ format: (n: number) => `€${n.toFixed(2)}` }),
}));
const mockPush = jest.fn();
const mockNavigate = jest.fn();
jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  return {
    useRouter: () => ({ push: mockPush, navigate: mockNavigate }),
    useFocusEffect: (cb: () => void) => React.useEffect(cb, [cb]),
    router: { canGoBack: () => false, back: jest.fn() },
  };
});

const mockPrices = searchPrices as jest.Mock;
const LON = { name: 'London', code: 'LON', country: 'UK' };
const PAR = { name: 'Paris', code: 'PAR', country: 'FR' };
const BER = { name: 'Berlin', code: 'BER', country: 'DE' };
const DATE = addDays(todayISO(), 14);
const key = { from: LON, to: PAR, departDate: DATE, adults: 1 };

beforeEach(async () => {
  jest.clearAllMocks();
  clearSearchResults();
  await AsyncStorage.clear();
});

describe('AlertsScreen', () => {
  it('shows an empty state that leads to search', async () => {
    const utils = render(<AlertsScreen />);
    await waitFor(() => expect(utils.getByTestId('alerts-empty')).toBeTruthy());
    fireEvent.press(utils.getByText('Search trips'));
    expect(mockNavigate).toHaveBeenCalledWith('/(tabs)');
  });

  it('re-quotes each alert and shows a price drop', async () => {
    await addAlert('u@x.com', { ...key, priceEur: 40 });
    mockPrices.mockResolvedValue({ prices: [{ date: DATE, minPriceEur: 32 }] });
    const utils = render(<AlertsScreen />);
    const id = alertId(key);
    await waitFor(() => expect(utils.getByTestId(`alert-price-${id}`).props.children).toBe('€32.00'));
    expect(utils.getByText('−€8.00')).toBeTruthy();
    expect(utils.getByText(/1 fare has dropped/)).toBeTruthy();
    expect(mockPrices).toHaveBeenCalledWith({ from: 'LON', to: 'PAR', startDate: DATE, days: 1, adults: 1 });
  });

  it('shows a rise', async () => {
    await addAlert('u@x.com', { ...key, priceEur: 40 });
    mockPrices.mockResolvedValue({ prices: [{ date: DATE, minPriceEur: 45 }] });
    const utils = render(<AlertsScreen />);
    await waitFor(() => expect(utils.getByText('+€5.00')).toBeTruthy());
  });

  it('keeps the last known price when the check fails', async () => {
    await addAlert('u@x.com', { ...key, priceEur: 40 });
    mockPrices.mockRejectedValue(new Error('offline'));
    const utils = render(<AlertsScreen />);
    const id = alertId(key);
    await waitFor(() => expect(utils.getByTestId(`alert-price-${id}`).props.children).toBe('€40.00'));
    expect(utils.getByText('No change')).toBeTruthy();
  });

  it('does not re-quote departed trips', async () => {
    const past = { ...key, to: BER, departDate: addDays(todayISO(), -2) };
    await addAlert('u@x.com', { ...past, priceEur: 20 });
    const utils = render(<AlertsScreen />);
    await waitFor(() => expect(utils.getByText(/Departed/)).toBeTruthy());
    expect(mockPrices).not.toHaveBeenCalled();
  });

  it('removes an alert', async () => {
    await addAlert('u@x.com', { ...key, priceEur: 40 });
    mockPrices.mockResolvedValue({ prices: [{ date: DATE, minPriceEur: 40 }] });
    const utils = render(<AlertsScreen />);
    const id = alertId(key);
    await waitFor(() => expect(utils.getByTestId(`remove-alert-${id}`)).toBeTruthy());
    await act(async () => {
      fireEvent.press(utils.getByTestId(`remove-alert-${id}`));
    });
    expect(utils.queryByTestId(`alert-${id}`)).toBeNull();
    expect(JSON.parse((await AsyncStorage.getItem('alerts:u@x.com'))!)).toEqual([]);
  });

  it('opens results for an alert', async () => {
    await addAlert('u@x.com', { ...key, priceEur: 40 });
    mockPrices.mockResolvedValue({ prices: [{ date: DATE, minPriceEur: 40 }] });
    const utils = render(<AlertsScreen />);
    const id = alertId(key);
    await waitFor(() => expect(utils.getByTestId(`alert-price-${id}`)).toBeTruthy());
    fireEvent.press(utils.getByTestId(`alert-${id}`));
    expect(getSearchQuery()).toEqual(key);
    expect(mockPush).toHaveBeenCalledWith('/results');
  });
});
