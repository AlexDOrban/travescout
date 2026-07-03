import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ResultsScreen from '../../app/results';
import {
  getSearchResults,
  getSearchMeta,
} from '../../src/stores/searchStore';

jest.mock('../../src/stores/searchStore');
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
    convert: (n: number) => n,
    format: (n: number) => `€${n.toFixed(2)}`,
  }),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useFocusEffect: (cb: () => void) => {
    const React = require('react');
    React.useEffect(() => { cb(); }, []);
  },
  router: { canGoBack: () => false, back: jest.fn() },
}));
jest.mock('../../src/components/TripCard', () => ({
  TripCard: ({ testID, onPress }: any) => {
    const { TouchableOpacity } = require('react-native');
    return <TouchableOpacity testID={testID} onPress={onPress} />;
  },
}));

const mockGetResults = getSearchResults as jest.Mock;
const mockGetMeta = getSearchMeta as jest.Mock;

const MOCK_RESULTS = [
  {
    id: 'amadeus:1',
    provider: 'amadeus',
    transportType: 'flight',
    origin: 'LON',
    destination: 'PAR',
    departAt: '2026-04-15T08:00:00Z',
    arriveAt: '2026-04-15T10:15:00Z',
    durationMins: 135,
    priceEur: 42.5,
    stops: 0,
    deepLink: '',
    score: 0.85,
    tags: ['CHEAPEST'],
  },
  {
    id: 'rail:1',
    provider: 'rail',
    transportType: 'train',
    origin: 'LON',
    destination: 'PAR',
    departAt: '2026-04-15T07:00:00Z',
    arriveAt: '2026-04-15T09:30:00Z',
    durationMins: 150,
    priceEur: 65,
    stops: 0,
    deepLink: '',
    score: 0.75,
    tags: ['FASTEST'],
  },
];

const MOCK_META = {
  from: 'LON',
  to: 'PAR',
  departDate: '2026-04-15',
  adults: 1,
  providersQueried: ['amadeus', 'rail'],
  providersFailed: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetResults.mockReturnValue(MOCK_RESULTS);
  mockGetMeta.mockReturnValue(MOCK_META);
});

describe('ResultsScreen', () => {
  it('renders trip cards for all results', () => {
    const { getByTestId } = render(<ResultsScreen />);
    expect(getByTestId('trip-amadeus:1')).toBeTruthy();
    expect(getByTestId('trip-rail:1')).toBeTruthy();
  });

  it('shows empty state when no results', () => {
    mockGetResults.mockReturnValue([]);
    const { getByTestId } = render(<ResultsScreen />);
    expect(getByTestId('empty-text')).toBeTruthy();
  });

  it('filters by transport type', () => {
    const { getByTestId, queryByTestId } = render(<ResultsScreen />);
    fireEvent.press(getByTestId('filter-train'));
    expect(getByTestId('trip-rail:1')).toBeTruthy();
    expect(queryByTestId('trip-amadeus:1')).toBeNull();
  });

  it('shows all when All filter selected', () => {
    const { getByTestId } = render(<ResultsScreen />);
    fireEvent.press(getByTestId('filter-train'));
    fireEvent.press(getByTestId('filter-all'));
    expect(getByTestId('trip-amadeus:1')).toBeTruthy();
    expect(getByTestId('trip-rail:1')).toBeTruthy();
  });

  it('displays route in header from meta', () => {
    const { getByText } = render(<ResultsScreen />);
    expect(getByText('LON → PAR')).toBeTruthy();
  });

  it('shows a banner when some providers failed', () => {
    mockGetMeta.mockReturnValue({ ...MOCK_META, providersFailed: ['rail'] });
    const { getByTestId } = render(<ResultsScreen />);
    expect(getByTestId('providers-failed-banner')).toBeTruthy();
  });

  it('hides the providers-failed banner when all providers responded', () => {
    const { queryByTestId } = render(<ResultsScreen />);
    expect(queryByTestId('providers-failed-banner')).toBeNull();
  });
});
