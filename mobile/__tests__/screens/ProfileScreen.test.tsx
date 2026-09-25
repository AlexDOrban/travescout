import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProfileScreen from '../../app/(tabs)/profile';

const mockLogout = jest.fn().mockResolvedValue(undefined);
const mockSetMode = jest.fn();
const mockSetCurrency = jest.fn();
const mockNavigate = jest.fn();

jest.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'alex@example.com' }, logout: mockLogout }),
}));
jest.mock('../../src/contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: jest.requireActual('../../src/constants/colors').LIGHT, isDark: false, mode: 'system', setMode: mockSetMode }),
}));
jest.mock('../../src/contexts/CurrencyContext', () => ({
  useCurrency: () => ({
    currency: { code: 'EUR', symbol: '€' },
    currencies: [{ code: 'EUR', symbol: '€' }, { code: 'USD', symbol: '$' }, { code: 'GBP', symbol: '£' }],
    setCurrency: mockSetCurrency,
  }),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ navigate: mockNavigate }),
  router: { canGoBack: () => false, back: jest.fn() },
}));

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

describe('ProfileScreen', () => {
  it('shows the signed-in email', () => {
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('alex@example.com')).toBeTruthy();
  });

  it('switches appearance', () => {
    const { getByTestId } = render(<ProfileScreen />);
    expect(getByTestId('theme-system').props.accessibilityState.selected).toBe(true);
    fireEvent.press(getByTestId('theme-dark'));
    expect(mockSetMode).toHaveBeenCalledWith('dark');
  });

  it('switches currency', () => {
    const { getByTestId } = render(<ProfileScreen />);
    fireEvent.press(getByTestId('currency-GBP'));
    expect(mockSetCurrency).toHaveBeenCalledWith({ code: 'GBP', symbol: '£' });
  });

  it('asks before logging out', () => {
    const spy = jest.spyOn(Alert, 'alert');
    const { getByTestId } = render(<ProfileScreen />);
    fireEvent.press(getByTestId('logout-btn'));
    expect(mockLogout).not.toHaveBeenCalled();
    const buttons = spy.mock.calls[0][2]!;
    act(() => buttons.find(b => b.text === 'Log out')!.onPress!());
    expect(mockLogout).toHaveBeenCalled();
  });

  it('clears recent searches for this account', async () => {
    await AsyncStorage.setItem('recent:alex@example.com', '[{"x":1}]');
    const { getByTestId } = render(<ProfileScreen />);
    await act(async () => {
      fireEvent.press(getByTestId('clear-recents'));
    });
    await waitFor(async () => expect(await AsyncStorage.getItem('recent:alex@example.com')).toBeNull());
    expect(getByTestId('toast')).toBeTruthy();
  });

  it('links to trips and alerts', () => {
    const { getByTestId } = render(<ProfileScreen />);
    fireEvent.press(getByTestId('row-alerts'));
    expect(mockNavigate).toHaveBeenCalledWith('/(tabs)/alerts');
  });
});
