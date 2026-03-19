jest.mock('../../src/api/booking');
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
}));

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import MyTripsScreen from '../../app/(tabs)/trips';
import { getTrips } from '../../src/api/booking';

const mockGetTrips = getTrips as jest.Mock;

beforeEach(() => jest.clearAllMocks());

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
});
