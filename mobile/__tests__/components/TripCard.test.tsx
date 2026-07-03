import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TripCard } from '../../src/components/TripCard';
import { RankedTrip } from '../../src/types/trip';

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
    format: (n: number) => `€${n.toFixed(2)}`,
  }),
}));

const MOCK_TRIP: RankedTrip = {
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
  deepLink: 'https://example.com',
  score: 0.85,
  tags: ['CHEAPEST'],
};

describe('TripCard', () => {
  it('renders route and price', () => {
    const { getByText } = render(
      <TripCard trip={MOCK_TRIP} onPress={jest.fn()} />,
    );
    expect(getByText('LON → PAR')).toBeTruthy();
    expect(getByText('€42.50')).toBeTruthy();
  });

  it('renders tag badges', () => {
    const { getByText } = render(
      <TripCard trip={MOCK_TRIP} onPress={jest.fn()} />,
    );
    expect(getByText('CHEAPEST')).toBeTruthy();
  });

  it('renders transport icon for flights', () => {
    const { getByText } = render(
      <TripCard trip={MOCK_TRIP} onPress={jest.fn()} />,
    );
    expect(getByText('✈️')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <TripCard trip={MOCK_TRIP} onPress={onPress} testID="card" />,
    );
    fireEvent.press(getByTestId('card'));
    expect(onPress).toHaveBeenCalled();
  });

  it('shows Direct for 0 stops', () => {
    const { getByText } = render(
      <TripCard trip={MOCK_TRIP} onPress={jest.fn()} />,
    );
    expect(getByText(/Direct/)).toBeTruthy();
  });

  it('shows stop count for non-direct trips', () => {
    const trip = { ...MOCK_TRIP, stops: 2 };
    const { getByText } = render(
      <TripCard trip={trip} onPress={jest.fn()} />,
    );
    expect(getByText(/2 stops/)).toBeTruthy();
  });
});
