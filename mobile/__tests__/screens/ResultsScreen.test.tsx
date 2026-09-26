import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ResultsScreen from '../../app/results';
import {
  setSearchResults,
  setSearchQuery,
  clearSearchResults,
  getSearchResults,
} from '../../src/stores/searchStore';
import { search, searchPrices } from '../../src/api/search';
import { addDays, todayISO } from '../../src/utils/format';
import type { RankedTrip } from '../../src/types/trip';

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
jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  return {
    useRouter: () => ({ push: mockPush, back: jest.fn() }),
    useFocusEffect: (cb: () => void) => React.useEffect(cb, [cb]),
    router: { canGoBack: () => false, back: jest.fn() },
  };
});
jest.mock('../../src/components/TripCard', () => ({
  TripCard: ({ testID, onPress }: any) => {
    const { TouchableOpacity } = jest.requireActual('react-native');
    return <TouchableOpacity testID={testID} onPress={onPress} />;
  },
}));

const mockSearch = search as jest.Mock;
const mockPrices = searchPrices as jest.Mock;

const trip = (id: string, over: Partial<RankedTrip>): RankedTrip => ({
  id,
  provider: 'rail',
  transportType: 'train',
  origin: 'LON',
  destination: 'PAR',
  departAt: '2030-04-15T08:00:00Z',
  arriveAt: '2030-04-15T10:15:00Z',
  durationMins: 135,
  priceEur: 50,
  stops: 0,
  deepLink: '',
  score: 0.5,
  tags: [],
  ...over,
});

const FLIGHT = trip('amadeus:1', { provider: 'amadeus', transportType: 'flight', priceEur: 42.5, durationMins: 90, score: 0.6, departAt: '2030-04-15T12:00:00Z' });
const TRAIN = trip('rail:1', { priceEur: 65, durationMins: 150, score: 0.8, departAt: '2030-04-15T07:00:00Z' });
const BUS = trip('flixbus:1', { provider: 'flixbus', transportType: 'bus', priceEur: 19, durationMins: 300, score: 0.7, departAt: '2030-04-15T09:00:00Z' });

const LON = { name: 'London', code: 'LON', country: 'UK' };
const PAR = { name: 'Paris', code: 'PAR', country: 'FR' };
const DATE = addDays(todayISO(), 10);
const meta = (departDate = DATE, over = {}) => ({
  from: 'LON', to: 'PAR', departDate, adults: 1, providersQueried: ['amadeus', 'rail', 'flixbus'], providersFailed: [], ...over,
});

beforeEach(async () => {
  jest.clearAllMocks();
  clearSearchResults();
  await AsyncStorage.clear();
  mockPrices.mockResolvedValue({ prices: [] });
  mockSearch.mockImplementation(async (p: any) => ({ results: [FLIGHT, TRAIN, BUS], meta: meta(p.departDate) }));
});

function startQuery(departDate = DATE) {
  setSearchQuery({ from: LON, to: PAR, departDate, adults: 1 });
}

const ids = (utils: Awaited<ReturnType<typeof renderSettled>>) =>
  utils.getAllByTestId(/^trip-/).map(n => n.props.testID);

// Render and let mount-time async effects (storage reads, fetches) settle
// inside act(), so they don't update state after the test has finished.
async function renderSettled(ui: React.ReactElement) {
  const utils = render(ui);
  await act(async () => {});
  return utils;
}

describe('ResultsScreen', () => {
  it('fetches on arrival, showing skeletons until results land', async () => {
    startQuery();
    const utils = render(<ResultsScreen />);
    expect(utils.getByTestId('results-loading')).toBeTruthy();
    await waitFor(() => expect(utils.getByTestId('trip-rail:1')).toBeTruthy());
    expect(mockSearch).toHaveBeenCalledWith({ from: 'LON', to: 'PAR', departDate: DATE, adults: 1 });
    // Stored so trip detail can resolve the card.
    expect(getSearchResults()).toHaveLength(3);
  });

  it('does not refetch when the store already holds this search', async () => {
    startQuery();
    setSearchResults([FLIGHT], meta());
    const utils = await renderSettled(<ResultsScreen />);
    expect(utils.getByTestId('trip-amadeus:1')).toBeTruthy();
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('shows the route with city names and date', async () => {
    startQuery();
    const utils = await renderSettled(<ResultsScreen />);
    expect(utils.getByText('London → Paris')).toBeTruthy();
    await waitFor(() => expect(utils.getByTestId('trip-rail:1')).toBeTruthy());
  });

  it('sorts by Best (score) by default and by price, duration and time on demand', async () => {
    startQuery();
    const utils = await renderSettled(<ResultsScreen />);
    await waitFor(() => expect(utils.getByTestId('trip-rail:1')).toBeTruthy());
    expect(ids(utils)).toEqual(['trip-rail:1', 'trip-flixbus:1', 'trip-amadeus:1']);
    fireEvent.press(utils.getByTestId('sort-price'));
    expect(ids(utils)).toEqual(['trip-flixbus:1', 'trip-amadeus:1', 'trip-rail:1']);
    fireEvent.press(utils.getByTestId('sort-duration'));
    expect(ids(utils)).toEqual(['trip-amadeus:1', 'trip-rail:1', 'trip-flixbus:1']);
    fireEvent.press(utils.getByTestId('sort-departure'));
    expect(ids(utils)).toEqual(['trip-rail:1', 'trip-flixbus:1', 'trip-amadeus:1']);
  });

  it('filters by mode and shows the cheapest fare on each mode tab', async () => {
    startQuery();
    const utils = await renderSettled(<ResultsScreen />);
    await waitFor(() => expect(utils.getByTestId('trip-rail:1')).toBeTruthy());
    expect(utils.getAllByText('€19')).toHaveLength(2); // All + Bus tabs
    expect(utils.getByText('€42.50')).toBeTruthy(); // Flight tab
    fireEvent.press(utils.getByTestId('filter-train'));
    expect(ids(utils)).toEqual(['trip-rail:1']);
    fireEvent.press(utils.getByTestId('filter-all'));
    expect(ids(utils)).toHaveLength(3);
  });

  it('offers to clear an empty mode filter', async () => {
    mockSearch.mockResolvedValue({ results: [TRAIN], meta: meta() });
    startQuery();
    const utils = await renderSettled(<ResultsScreen />);
    await waitFor(() => expect(utils.getByTestId('trip-rail:1')).toBeTruthy());
    fireEvent.press(utils.getByTestId('filter-bus'));
    expect(utils.getByTestId('empty-text')).toBeTruthy();
    fireEvent.press(utils.getByText('Show all modes'));
    expect(utils.getByTestId('trip-rail:1')).toBeTruthy();
  });

  it('shows cheapest fares per day and re-searches when a day is tapped', async () => {
    const next = addDays(DATE, 1);
    mockPrices.mockResolvedValue({
      prices: [{ date: DATE, minPriceEur: 19 }, { date: next, minPriceEur: 15 }],
    });
    startQuery();
    const utils = await renderSettled(<ResultsScreen />);
    await waitFor(() => expect(utils.getByTestId(`date-price-${next}`)).toBeTruthy());
    expect(utils.getByTestId(`date-price-${next}`).props.children).toBe('€15');
    expect(mockPrices).toHaveBeenCalledWith(expect.objectContaining({ from: 'LON', to: 'PAR', startDate: addDays(DATE, -3), days: 7 }));

    await act(async () => {
      fireEvent.press(utils.getByTestId(`date-${next}`));
    });
    await waitFor(() => expect(mockSearch).toHaveBeenLastCalledWith(expect.objectContaining({ departDate: next })));
  });

  it('never offers days before today in the strip', async () => {
    const tomorrow = addDays(todayISO(), 1);
    startQuery(tomorrow);
    const utils = await renderSettled(<ResultsScreen />);
    await waitFor(() => expect(utils.getByTestId('trip-rail:1')).toBeTruthy());
    expect(utils.queryByTestId(`date-${addDays(todayISO(), -1)}`)).toBeNull();
    expect(utils.getByTestId(`date-${todayISO()}`)).toBeTruthy();
  });

  it('tracks and untracks the price as an alert', async () => {
    startQuery();
    const utils = await renderSettled(<ResultsScreen />);
    await waitFor(() => expect(utils.getByTestId('trip-rail:1')).toBeTruthy());
    await act(async () => {
      fireEvent.press(utils.getByTestId('watch-price'));
    });
    const stored = JSON.parse((await AsyncStorage.getItem('alerts:u@x.com'))!);
    expect(stored[0]).toMatchObject({ baselinePriceEur: 19, departDate: DATE });
    expect(utils.getByTestId('toast')).toBeTruthy();
    await act(async () => {
      fireEvent.press(utils.getByTestId('watch-price'));
    });
    expect(JSON.parse((await AsyncStorage.getItem('alerts:u@x.com'))!)).toEqual([]);
  });

  it('shows an error with retry', async () => {
    mockSearch.mockRejectedValueOnce(new Error('Network error'));
    startQuery();
    const utils = await renderSettled(<ResultsScreen />);
    await waitFor(() => expect(utils.getByText('Network error')).toBeTruthy());
    await act(async () => {
      fireEvent.press(utils.getByTestId('results-retry'));
    });
    await waitFor(() => expect(utils.getByTestId('trip-rail:1')).toBeTruthy());
  });

  it('shows a banner when some providers failed', async () => {
    mockSearch.mockResolvedValue({ results: [TRAIN], meta: meta(DATE, { providersFailed: ['amadeus'] }) });
    startQuery();
    const utils = await renderSettled(<ResultsScreen />);
    await waitFor(() => expect(utils.getByTestId('providers-failed-banner')).toBeTruthy());
  });

  it('opens trip detail from a card', async () => {
    startQuery();
    const utils = await renderSettled(<ResultsScreen />);
    await waitFor(() => expect(utils.getByTestId('trip-rail:1')).toBeTruthy());
    fireEvent.press(utils.getByTestId('trip-rail:1'));
    expect(mockPush).toHaveBeenCalledWith('/trip/rail:1');
  });

  it('still renders stored results without a query (legacy entry)', async () => {
    setSearchResults([FLIGHT, TRAIN], meta());
    const utils = await renderSettled(<ResultsScreen />);
    expect(utils.getByTestId('trip-amadeus:1')).toBeTruthy();
    expect(utils.getByText('LON → PAR')).toBeTruthy();
  });
});
