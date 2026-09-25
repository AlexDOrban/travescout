import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SearchScreen from '../../app/(tabs)/index';
import { setSearchQuery } from '../../src/stores/searchStore';
import { addDays, todayISO, formatDayLabel } from '../../src/utils/format';

jest.mock('../../src/stores/searchStore', () => ({ setSearchQuery: jest.fn() }));

jest.mock('../../src/contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: jest.requireActual('../../src/constants/colors').LIGHT, isDark: false }),
}));
jest.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'alex.orban@example.com' } }),
}));
const mockSetCurrency = jest.fn();
jest.mock('../../src/contexts/CurrencyContext', () => ({
  useCurrency: () => ({
    currency: { code: 'EUR', symbol: '€' },
    currencies: [{ code: 'EUR', symbol: '€' }, { code: 'USD', symbol: '$' }],
    setCurrency: mockSetCurrency,
  }),
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  return {
    useRouter: () => ({ push: mockPush }),
    useFocusEffect: (cb: () => void) => React.useEffect(cb, [cb]),
    router: { canGoBack: () => false, back: jest.fn() },
  };
});

const mockSetQuery = setSearchQuery as jest.Mock;

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

function pickCity(utils: ReturnType<typeof render>, side: 'from' | 'to', text: string, code: string) {
  fireEvent.press(utils.getByTestId(`${side}-city`));
  fireEvent.changeText(utils.getByTestId(`${side}-picker-input`), text);
  fireEvent.press(utils.getByTestId(`${side}-picker-option-${code}`));
}

describe('SearchScreen', () => {
  it('greets the user by name', () => {
    const { getByText } = render(<SearchScreen />);
    expect(getByText('Hi Alex 👋')).toBeTruthy();
  });

  it('defaults the departure date to tomorrow', () => {
    const { getByTestId } = render(<SearchScreen />);
    expect(getByTestId('depart-date-value').props.children).toBe(formatDayLabel(addDays(todayISO(), 1)));
  });

  it('asks for a departure city first', () => {
    const { getByTestId } = render(<SearchScreen />);
    fireEvent.press(getByTestId('search-btn'));
    expect(getByTestId('error').props.children).toBe('Choose where you’re leaving from');
  });

  it('asks for a destination once the origin is set', () => {
    const utils = render(<SearchScreen />);
    pickCity(utils, 'from', 'Lon', 'LON');
    // Picking the origin flows straight on to the destination picker; close it.
    fireEvent.press(utils.getByTestId('to-picker-close'));
    fireEvent.press(utils.getByTestId('search-btn'));
    expect(utils.getByTestId('error').props.children).toBe('Choose your destination');
  });

  it('flows from origin straight to destination and searches', async () => {
    const utils = render(<SearchScreen />);
    pickCity(utils, 'from', 'Lon', 'LON');
    fireEvent.changeText(utils.getByTestId('to-picker-input'), 'Par');
    fireEvent.press(utils.getByTestId('to-picker-option-PAR'));
    fireEvent.press(utils.getByTestId('search-btn'));

    expect(mockSetQuery).toHaveBeenCalledWith({
      from: expect.objectContaining({ code: 'LON' }),
      to: expect.objectContaining({ code: 'PAR' }),
      departDate: addDays(todayISO(), 1),
      adults: 1,
    });
    expect(mockPush).toHaveBeenCalledWith('/results');
    // Saved as a recent search for next time.
    await waitFor(async () => {
      expect(await AsyncStorage.getItem('recent:alex.orban@example.com')).toContain('"LON"');
    });
  });

  it('does not offer the origin city as destination', () => {
    const utils = render(<SearchScreen />);
    pickCity(utils, 'from', 'Lon', 'LON');
    fireEvent.changeText(utils.getByTestId('to-picker-input'), 'Lon');
    expect(utils.queryByTestId('to-picker-option-LON')).toBeNull();
  });

  it('swaps origin and destination', () => {
    const utils = render(<SearchScreen />);
    pickCity(utils, 'from', 'Lon', 'LON');
    fireEvent.changeText(utils.getByTestId('to-picker-input'), 'Par');
    fireEvent.press(utils.getByTestId('to-picker-option-PAR'));
    fireEvent.press(utils.getByTestId('swap-cities'));
    fireEvent.press(utils.getByTestId('search-btn'));
    expect(mockSetQuery).toHaveBeenCalledWith(
      expect.objectContaining({ from: expect.objectContaining({ code: 'PAR' }), to: expect.objectContaining({ code: 'LON' }) }),
    );
  });

  it('picks a date from the calendar', () => {
    const utils = render(<SearchScreen />);
    const inAWeek = addDays(todayISO(), 7);
    fireEvent.press(utils.getByTestId('depart-date'));
    fireEvent.press(utils.getByTestId('calendar-week'));
    expect(utils.getByTestId('depart-date-value').props.children).toBe(formatDayLabel(inAWeek));
  });

  it('disables past days in the calendar', () => {
    const utils = render(<SearchScreen />);
    fireEvent.press(utils.getByTestId('depart-date'));
    const yesterday = addDays(todayISO(), -1);
    const cell = utils.queryByTestId(`calendar-day-${yesterday}`);
    // Yesterday may sit in the previous month (not rendered) — otherwise it must be disabled.
    if (cell) expect(cell.props.accessibilityState.disabled).toBe(true);
    expect(utils.getByTestId(`calendar-day-${todayISO()}`).props.accessibilityState.disabled).toBe(false);
  });

  it('increments and decrements adults within 1–9', () => {
    const { getByTestId } = render(<SearchScreen />);
    fireEvent.press(getByTestId('adults-minus'));
    expect(getByTestId('adults-count').props.children).toBe(1);
    for (let i = 0; i < 12; i++) fireEvent.press(getByTestId('adults-plus'));
    expect(getByTestId('adults-count').props.children).toBe(9);
  });

  it('prefills from a popular route', () => {
    const utils = render(<SearchScreen />);
    fireEvent.press(utils.getByTestId('popular-LON-PAR'));
    fireEvent.press(utils.getByTestId('search-btn'));
    expect(mockSetQuery).toHaveBeenCalledWith(
      expect.objectContaining({ from: expect.objectContaining({ code: 'LON' }), to: expect.objectContaining({ code: 'PAR' }) }),
    );
  });

  it('shows recent searches and refills from one', async () => {
    const future = addDays(todayISO(), 20);
    await AsyncStorage.setItem(
      'recent:alex.orban@example.com',
      JSON.stringify([{ from: { name: 'Berlin', code: 'BER', country: 'DE' }, to: { name: 'Prague', code: 'PRG', country: 'CZ' }, departDate: future, adults: 2 }]),
    );
    const utils = render(<SearchScreen />);
    const card = await utils.findByTestId('recent-BER-PRG');
    fireEvent.press(card);
    fireEvent.press(utils.getByTestId('search-btn'));
    expect(mockSetQuery).toHaveBeenCalledWith({
      from: expect.objectContaining({ code: 'BER' }),
      to: expect.objectContaining({ code: 'PRG' }),
      departDate: future,
      adults: 2,
    });
  });

  it('cycles currency from the hero pill', () => {
    const { getByTestId } = render(<SearchScreen />);
    fireEvent.press(getByTestId('currency-pill'));
    expect(mockSetCurrency).toHaveBeenCalledWith({ code: 'USD', symbol: '$' });
  });
});
