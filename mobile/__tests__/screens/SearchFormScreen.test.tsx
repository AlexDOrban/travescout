import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
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

function pickCity(utils: Awaited<ReturnType<typeof renderSettled>>, side: 'from' | 'to', text: string, code: string) {
  fireEvent.press(utils.getByTestId(`${side}-city`));
  fireEvent.changeText(utils.getByTestId(`${side}-picker-input`), text);
  fireEvent.press(utils.getByTestId(`${side}-picker-option-${code}`));
}

// Render and let mount-time async effects (storage reads, fetches) settle
// inside act(), so they don't update state after the test has finished.
async function renderSettled(ui: React.ReactElement) {
  const utils = render(ui);
  await act(async () => {});
  return utils;
}

describe('SearchScreen', () => {
  it('greets the user by name', async () => {
    const { getByText } = await renderSettled(<SearchScreen />);
    expect(getByText('Hi Alex 👋')).toBeTruthy();
  });

  it('defaults the departure date to tomorrow', async () => {
    const { getByTestId } = await renderSettled(<SearchScreen />);
    expect(getByTestId('depart-date-value').props.children).toBe(formatDayLabel(addDays(todayISO(), 1)));
  });

  it('asks for a departure city first', async () => {
    const { getByTestId } = await renderSettled(<SearchScreen />);
    fireEvent.press(getByTestId('search-btn'));
    expect(getByTestId('error').props.children).toBe('Choose where you’re leaving from');
  });

  it('asks for a destination once the origin is set', async () => {
    const utils = await renderSettled(<SearchScreen />);
    pickCity(utils, 'from', 'Lon', 'LON');
    // Picking the origin flows straight on to the destination picker; close it.
    fireEvent.press(utils.getByTestId('to-picker-close'));
    fireEvent.press(utils.getByTestId('search-btn'));
    expect(utils.getByTestId('error').props.children).toBe('Choose your destination');
  });

  it('flows from origin straight to destination and searches', async () => {
    const utils = await renderSettled(<SearchScreen />);
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

  it('does not offer the origin city as destination', async () => {
    const utils = await renderSettled(<SearchScreen />);
    pickCity(utils, 'from', 'Lon', 'LON');
    fireEvent.changeText(utils.getByTestId('to-picker-input'), 'Lon');
    expect(utils.queryByTestId('to-picker-option-LON')).toBeNull();
  });

  it('swaps origin and destination', async () => {
    const utils = await renderSettled(<SearchScreen />);
    pickCity(utils, 'from', 'Lon', 'LON');
    fireEvent.changeText(utils.getByTestId('to-picker-input'), 'Par');
    fireEvent.press(utils.getByTestId('to-picker-option-PAR'));
    fireEvent.press(utils.getByTestId('swap-cities'));
    fireEvent.press(utils.getByTestId('search-btn'));
    expect(mockSetQuery).toHaveBeenCalledWith(
      expect.objectContaining({ from: expect.objectContaining({ code: 'PAR' }), to: expect.objectContaining({ code: 'LON' }) }),
    );
  });

  it('picks a date from the calendar', async () => {
    const utils = await renderSettled(<SearchScreen />);
    const inAWeek = addDays(todayISO(), 7);
    fireEvent.press(utils.getByTestId('depart-date'));
    fireEvent.press(utils.getByTestId('calendar-week'));
    expect(utils.getByTestId('depart-date-value').props.children).toBe(formatDayLabel(inAWeek));
  });

  it('disables past days in the calendar', async () => {
    const utils = await renderSettled(<SearchScreen />);
    fireEvent.press(utils.getByTestId('depart-date'));
    const yesterday = addDays(todayISO(), -1);
    const cell = utils.queryByTestId(`calendar-day-${yesterday}`);
    // Yesterday may sit in the previous month (not rendered) — otherwise it must be disabled.
    if (cell) expect(cell.props.accessibilityState.disabled).toBe(true);
    expect(utils.getByTestId(`calendar-day-${todayISO()}`).props.accessibilityState.disabled).toBe(false);
  });

  it('increments and decrements adults within 1–9', async () => {
    const { getByTestId } = await renderSettled(<SearchScreen />);
    fireEvent.press(getByTestId('adults-minus'));
    expect(getByTestId('adults-count').props.children).toBe(1);
    for (let i = 0; i < 12; i++) fireEvent.press(getByTestId('adults-plus'));
    expect(getByTestId('adults-count').props.children).toBe(9);
  });

  it('prefills from a popular route', async () => {
    const utils = await renderSettled(<SearchScreen />);
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
    const utils = await renderSettled(<SearchScreen />);
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

  it('cycles currency from the hero pill', async () => {
    const { getByTestId } = await renderSettled(<SearchScreen />);
    fireEvent.press(getByTestId('currency-pill'));
    expect(mockSetCurrency).toHaveBeenCalledWith({ code: 'USD', symbol: '$' });
  });
});

describe('round trips', () => {
  async function londonParis() {
    const utils = await renderSettled(<SearchScreen />);
    pickCity(utils, 'from', 'Lon', 'LON');
    fireEvent.changeText(utils.getByTestId('to-picker-input'), 'Par');
    fireEvent.press(utils.getByTestId('to-picker-option-PAR'));
    return utils;
  }

  it('hides the return date for one-way searches', async () => {
    const utils = await renderSettled(<SearchScreen />);
    expect(utils.queryByTestId('return-date')).toBeNull();
  });

  it('searches with a return date three days after departure by default', async () => {
    const utils = await londonParis();
    fireEvent.press(utils.getByTestId('trip-type-return'));
    expect(utils.getByTestId('return-date-value').props.children).toBe(formatDayLabel(addDays(todayISO(), 4)));
    fireEvent.press(utils.getByTestId('search-btn'));
    expect(mockSetQuery).toHaveBeenCalledWith(
      expect.objectContaining({ departDate: addDays(todayISO(), 1), returnDate: addDays(todayISO(), 4) }),
    );
  });

  it('drops the return date when switched back to one-way', async () => {
    const utils = await londonParis();
    fireEvent.press(utils.getByTestId('trip-type-return'));
    fireEvent.press(utils.getByTestId('trip-type-one_way'));
    fireEvent.press(utils.getByTestId('search-btn'));
    expect(mockSetQuery.mock.calls.at(-1)[0].returnDate).toBeUndefined();
  });

  it('moves the return date when departure moves past it', async () => {
    const utils = await renderSettled(<SearchScreen />);
    fireEvent.press(utils.getByTestId('trip-type-return'));
    fireEvent.press(utils.getByTestId('depart-date'));
    // "In a week" = today + 7, past the default return (today + 4).
    fireEvent.press(utils.getByTestId('calendar-week'));
    expect(utils.getByTestId('return-date-value').props.children).toBe(formatDayLabel(addDays(todayISO(), 10)));
  });

  it('titles the return picker and never offers days before departure', async () => {
    const utils = await renderSettled(<SearchScreen />);
    fireEvent.press(utils.getByTestId('trip-type-return'));
    fireEvent.press(utils.getByTestId('return-date'));
    expect(utils.getByText('Return date')).toBeTruthy();
    // departure defaults to tomorrow; today must not be selectable for the return
    const today = utils.queryByTestId(`return-calendar-day-${todayISO()}`);
    expect(today === null || today.props.accessibilityState?.disabled).toBeTruthy();
  });

  it('restores a recent round trip without a return before departure', async () => {
    const depart = addDays(todayISO(), 5);
    await AsyncStorage.setItem('recent:alex.orban@example.com', JSON.stringify([
      {
        from: { name: 'London', code: 'LON', country: 'GB' },
        to: { name: 'Paris', code: 'PAR', country: 'FR' },
        departDate: depart,
        returnDate: addDays(todayISO(), 2), // before its departure
        adults: 1,
      },
    ]));
    const utils = await renderSettled(<SearchScreen />);
    fireEvent.press(await utils.findByTestId('recent-LON-PAR'));
    expect(utils.getByTestId('return-date-value').props.children).toBe(formatDayLabel(addDays(depart, 3)));
  });
});
