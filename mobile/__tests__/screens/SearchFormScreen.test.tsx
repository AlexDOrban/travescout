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
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SearchScreen from '../../app/(tabs)/index';
import { search } from '../../src/api/search';
import { setSearchResults } from '../../src/stores/searchStore';

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

    // Enter departure date
    fireEvent.changeText(getByTestId('depart-date'), '2026-04-15');

    // Search
    fireEvent.press(getByTestId('search-btn'));

    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalledWith({
        from: 'LON',
        to: 'PAR',
        departDate: '2026-04-15',
        returnDate: undefined,
        adults: 1,
      });
      expect(mockSetResults).toHaveBeenCalledWith(response.results, response.meta);
      expect(mockPush).toHaveBeenCalledWith('/results');
    });
  });

  it('shows error on invalid date format', () => {
    const { getByTestId } = render(<SearchScreen />);

    fireEvent.press(getByTestId('from-city'));
    fireEvent.press(getByTestId('to-city'));
    fireEvent.changeText(getByTestId('depart-date'), 'not-a-date');
    fireEvent.press(getByTestId('search-btn'));

    expect(getByTestId('error').props.children).toBe('Date must be YYYY-MM-DD');
  });

  it('shows error when search API fails', async () => {
    mockSearch.mockRejectedValue(new Error('Network error'));

    const { getByTestId } = render(<SearchScreen />);

    fireEvent.press(getByTestId('from-city'));
    fireEvent.press(getByTestId('to-city'));
    fireEvent.changeText(getByTestId('depart-date'), '2026-04-15');
    fireEvent.press(getByTestId('search-btn'));

    await waitFor(() => {
      expect(getByTestId('error').props.children).toBe('Network error');
    });
  });
});
