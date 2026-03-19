jest.mock('../../src/api/booking');
jest.mock('../../src/api/itinerary');
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
    format: (n: number) => `€${n.toFixed(2)}`,
  }),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useFocusEffect: (cb: () => void) => {
    const React = require('react');
    React.useEffect(() => { cb(); }, []);
  },
}));

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import MyTripsScreen from '../../app/(tabs)/trips';
import { getTrips } from '../../src/api/booking';
import { getItineraries } from '../../src/api/itinerary';

const mockGetTrips = getTrips as jest.Mock;
const mockGetItineraries = getItineraries as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetItineraries.mockResolvedValue({ itineraries: [] });
});

describe('MyTripsScreen', () => {
  it('renders trip cards after loading', async () => {
    mockGetTrips.mockResolvedValue({
      trips: [
        {
          id: '1', provider: 'flixbus', booking_ref: 'FB-001',
          origin: 'LON', destination: 'PAR',
          depart_at: '2030-04-15T06:30:00Z', return_at: null,
          price_eur: '18.00', currency_display: 'EUR',
          status: 'confirmed', raw_ticket_url: null,
          created_at: '2026-03-18T10:00:00Z',
        },
      ],
    });

    const { findByText } = render(<MyTripsScreen />);
    expect(await findByText('LON → PAR')).toBeTruthy();
    expect(await findByText('FB-001')).toBeTruthy();
  });

  it('shows empty state when no trips', async () => {
    mockGetTrips.mockResolvedValue({ trips: [] });

    const { findByText } = render(<MyTripsScreen />);
    expect(await findByText('No trips yet')).toBeTruthy();
  });

  it('shows error when API fails', async () => {
    mockGetTrips.mockRejectedValue(new Error('Network error'));

    const { findByText } = render(<MyTripsScreen />);
    expect(await findByText('Network error')).toBeTruthy();
  });

  it('shows status badge', async () => {
    mockGetTrips.mockResolvedValue({
      trips: [
        {
          id: '1', provider: 'flixbus', booking_ref: 'FB-001',
          origin: 'LON', destination: 'PAR',
          depart_at: '2030-04-15T06:30:00Z', return_at: null,
          price_eur: '18.00', currency_display: 'EUR',
          status: 'confirmed', raw_ticket_url: null,
          created_at: '2026-03-18T10:00:00Z',
        },
      ],
    });

    const { findByText } = render(<MyTripsScreen />);
    expect(await findByText(/confirmed/i)).toBeTruthy();
  });

  it('renders itinerary card with booking ref', async () => {
    mockGetTrips.mockResolvedValue({ trips: [] });
    mockGetItineraries.mockResolvedValue({
      itineraries: [
        {
          id: 'iti-1',
          booking_ref: 'ITI-ABC',
          origin: 'LON',
          destination: 'BCN',
          depart_at: '2030-06-01T08:00:00Z',
          arrive_at: '2030-06-01T18:00:00Z',
          total_price_eur: '95.00',
          status: 'confirmed',
          legs: [
            {
              id: 'leg-1', provider: 'flixbus', booking_ref: 'FB-LEG-1',
              origin: 'LON', destination: 'PAR',
              depart_at: '2030-06-01T08:00:00Z', return_at: null,
              price_eur: '45.00', currency_display: 'EUR',
              status: 'confirmed', raw_ticket_url: null,
              created_at: '2026-03-18T10:00:00Z',
              itinerary_id: 'iti-1', leg_order: 0,
            },
            {
              id: 'leg-2', provider: 'rail', booking_ref: 'RL-LEG-2',
              origin: 'PAR', destination: 'BCN',
              depart_at: '2030-06-01T14:00:00Z', return_at: null,
              price_eur: '50.00', currency_display: 'EUR',
              status: 'confirmed', raw_ticket_url: null,
              created_at: '2026-03-18T10:00:00Z',
              itinerary_id: 'iti-1', leg_order: 1,
            },
          ],
        },
      ],
    });

    const { findByText } = render(<MyTripsScreen />);
    expect(await findByText('LON → BCN')).toBeTruthy();
    expect(await findByText('ITI-ABC')).toBeTruthy();
  });

  it('renders standalone trips alongside itineraries', async () => {
    mockGetTrips.mockResolvedValue({
      trips: [
        {
          id: 'trip-1', provider: 'flixbus', booking_ref: 'FB-STANDALONE',
          origin: 'AMS', destination: 'BRU',
          depart_at: '2030-05-10T09:00:00Z', return_at: null,
          price_eur: '22.00', currency_display: 'EUR',
          status: 'confirmed', raw_ticket_url: null,
          created_at: '2026-03-18T10:00:00Z',
        },
      ],
    });
    mockGetItineraries.mockResolvedValue({
      itineraries: [
        {
          id: 'iti-2',
          booking_ref: 'ITI-XYZ',
          origin: 'LON',
          destination: 'MAD',
          depart_at: '2030-07-01T07:00:00Z',
          arrive_at: '2030-07-01T17:00:00Z',
          total_price_eur: '120.00',
          status: 'confirmed',
          legs: [],
        },
      ],
    });

    const { findByText } = render(<MyTripsScreen />);
    expect(await findByText('AMS → BRU')).toBeTruthy();
    expect(await findByText('FB-STANDALONE')).toBeTruthy();
    expect(await findByText('LON → MAD')).toBeTruthy();
    expect(await findByText('ITI-XYZ')).toBeTruthy();
  });
});
