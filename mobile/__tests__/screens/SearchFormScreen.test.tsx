import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SearchScreen from '../../app/(tabs)/index';
import { search } from '../../src/api/search';
import { setSearchResults } from '../../src/stores/searchStore';

jest.mock('../../src/api/search');
jest.mock('../../src/stores/searchStore');

// Mock CityAutocomplete to make form testable without dropdown interaction
jest.mock('../../src/components/CityAutocomplete', () => ({
  CityAutocomplete: ({ onSelect, testID }: any) => {
    const { TouchableOpacity } = require('react-native');
    const city =
      testID === 'from-city'
        ? { name: 'London', code: 'LON', country: 'UK' }
        : { name: 'Paris', code: 'PAR', country: 'FR' };
    return <TouchableOpacity testID={testID} onPress={() => onSelect(city)} />;
  },
}));

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

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  router: { canGoBack: () => false, back: jest.fn() },
}));

const mockSearch = search as jest.Mock;
const mockSetResults = setSearchResults as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('SearchScreen', () => {
  it('shows validation error when no departure city selected', () => {
    const { getByTestId } = render(<SearchScreen />);
    fireEvent.press(getByTestId('search-btn'));
    expect(getByTestId('error').props.children).toBe('Select a departure city');
  });

  it('increments and decrements adults with bounds', () => {
    const { getByTestId } = render(<SearchScreen />);
    expect(getByTestId('adults-count').props.children).toBe(1);

    fireEvent.press(getByTestId('adults-plus'));
    expect(getByTestId('adults-count').props.children).toBe(2);

    fireEvent.press(getByTestId('adults-minus'));
    expect(getByTestId('adults-count').props.children).toBe(1);

    // Cannot go below 1
    fireEvent.press(getByTestId('adults-minus'));
    expect(getByTestId('adults-count').props.children).toBe(1);
  });

  it('calls search API and navigates to results on valid form', async () => {
    const response = { results: [{ id: 'a:1' }], meta: { from: 'LON', to: 'PAR' } };
    mockSearch.mockResolvedValue(response);

    const { getByTestId } = render(<SearchScreen />);

    // Select cities (mocked CityAutocomplete fires onSelect on press)
    fireEvent.press(getByTestId('from-city'));
    fireEvent.press(getByTestId('to-city'));

    // Enter departure date (must be in the future — past dates are rejected)
    fireEvent.changeText(getByTestId('depart-date'), '2030-04-15');

    // Search
    fireEvent.press(getByTestId('search-btn'));

    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalledWith({
        from: 'LON',
        to: 'PAR',
        departDate: '2030-04-15',
        returnDate: undefined,
        adults: 1,
      });
      expect(mockSetResults).toHaveBeenCalledWith(response.results, response.meta);
      expect(mockPush).toHaveBeenCalledWith('/results');
    });
  });

  it('shows error on incomplete date format', () => {
    const { getByTestId } = render(<SearchScreen />);

    fireEvent.press(getByTestId('from-city'));
    fireEvent.press(getByTestId('to-city'));
    // Input auto-formats digits; an incomplete date fails format validation
    fireEvent.changeText(getByTestId('depart-date'), '2030-04');
    fireEvent.press(getByTestId('search-btn'));

    expect(getByTestId('error').props.children).toBe('Departure date must be YYYY-MM-DD');
  });

  // Impossible calendar dates can no longer be typed: the smart input clamps
  // the day to the month's real length as you type (Feb 30 -> Feb 28).
  it('clamps an impossible calendar date while typing', () => {
    const { getByTestId } = render(<SearchScreen />);

    fireEvent.changeText(getByTestId('depart-date'), '2030-02-30');

    expect(getByTestId('depart-date').props.value).toBe('2030-02-28');
  });

  it('shows error on past departure date', () => {
    const { getByTestId } = render(<SearchScreen />);

    fireEvent.press(getByTestId('from-city'));
    fireEvent.press(getByTestId('to-city'));
    fireEvent.changeText(getByTestId('depart-date'), '2020-04-15');
    fireEvent.press(getByTestId('search-btn'));

    expect(getByTestId('error').props.children).toBe(
      'Departure date cannot be in the past',
    );
  });

  it('shows error when search API fails', async () => {
    mockSearch.mockRejectedValue(new Error('Network error'));

    const { getByTestId } = render(<SearchScreen />);

    fireEvent.press(getByTestId('from-city'));
    fireEvent.press(getByTestId('to-city'));
    fireEvent.changeText(getByTestId('depart-date'), '2030-04-15');
    fireEvent.press(getByTestId('search-btn'));

    await waitFor(() => {
      expect(getByTestId('error').props.children).toBe('Network error');
    });
  });
});
