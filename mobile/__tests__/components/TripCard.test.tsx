import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TripCard } from '../../src/components/TripCard';
import { RankedTrip } from '../../src/types/trip';
import { formatTime } from '../../src/utils/format';

jest.mock('../../src/contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: jest.requireActual('../../src/constants/colors').LIGHT, isDark: false }),
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
  it('renders times, codes, duration and price', () => {
    const { getByText } = render(<TripCard trip={MOCK_TRIP} onPress={jest.fn()} />);
    expect(getByText(formatTime(MOCK_TRIP.departAt))).toBeTruthy();
    expect(getByText(formatTime(MOCK_TRIP.arriveAt))).toBeTruthy();
    expect(getByText('LON')).toBeTruthy();
    expect(getByText('PAR')).toBeTruthy();
    expect(getByText('2h 15m')).toBeTruthy();
    expect(getByText('€42.50')).toBeTruthy();
  });

  it('renders friendly tag badges', () => {
    const { getByText } = render(
      <TripCard trip={{ ...MOCK_TRIP, tags: ['CHEAPEST', 'BALANCED'] }} onPress={jest.fn()} />,
    );
    expect(getByText('Cheapest')).toBeTruthy();
    expect(getByText('Best value')).toBeTruthy();
  });

  it('shows the operator name rather than the booking system', () => {
    const { getByText } = render(<TripCard trip={MOCK_TRIP} onPress={jest.fn()} />);
    expect(getByText('Air partners')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<TripCard trip={MOCK_TRIP} onPress={onPress} testID="card" />);
    fireEvent.press(getByTestId('card'));
    expect(onPress).toHaveBeenCalled();
  });

  it('shows Direct for 0 stops', () => {
    const { getByText } = render(<TripCard trip={MOCK_TRIP} onPress={jest.fn()} />);
    expect(getByText('Direct')).toBeTruthy();
  });

  it('pluralises stops correctly', () => {
    const one = render(<TripCard trip={{ ...MOCK_TRIP, stops: 1 }} onPress={jest.fn()} />);
    expect(one.getByText('1 stop')).toBeTruthy();
    const two = render(<TripCard trip={{ ...MOCK_TRIP, stops: 2 }} onPress={jest.fn()} />);
    expect(two.getByText('2 stops')).toBeTruthy();
  });

  it('flags an overnight arrival with +1', () => {
    const depart = new Date(2030, 0, 1, 22, 0).toISOString();
    const arrive = new Date(2030, 0, 2, 6, 30).toISOString();
    const { getByTestId } = render(
      <TripCard trip={{ ...MOCK_TRIP, departAt: depart, arriveAt: arrive, durationMins: 510 }} onPress={jest.fn()} />,
    );
    expect(getByTestId('plus-days').props.children).toEqual(['+', 1]);
  });

  it('has no +1 badge for a same-day arrival', () => {
    const depart = new Date(2030, 0, 1, 8, 0).toISOString();
    const arrive = new Date(2030, 0, 1, 10, 0).toISOString();
    const { queryByTestId } = render(
      <TripCard trip={{ ...MOCK_TRIP, departAt: depart, arriveAt: arrive }} onPress={jest.fn()} />,
    );
    expect(queryByTestId('plus-days')).toBeNull();
  });
});
