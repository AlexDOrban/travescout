import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import MyTripsScreen from '../../app/(tabs)/trips';
import { getTrips } from '../../src/api/booking';
import { getItineraries } from '../../src/api/itinerary';
import type { BookedTrip } from '../../src/types/booking';

jest.mock('../../src/api/booking');
jest.mock('../../src/api/itinerary');
jest.mock('../../src/contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: jest.requireActual('../../src/constants/colors').LIGHT, isDark: false }),
}));
jest.mock('../../src/contexts/CurrencyContext', () => ({
  useCurrency: () => ({ format: (n: number) => `€${n.toFixed(2)}` }),
}));
const mockNavigate = jest.fn();
let mockFocus: (() => void) | null = null;
jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  return {
    useRouter: () => ({ push: jest.fn(), navigate: mockNavigate }),
    useFocusEffect: (cb: () => void) => {
      mockFocus = cb;
      React.useEffect(cb, [cb]);
    },
    router: { canGoBack: () => false, back: jest.fn() },
  };
});

const mockGetTrips = getTrips as jest.Mock;
const mockGetItineraries = getItineraries as jest.Mock;

const trip = (over: Partial<BookedTrip>): BookedTrip => ({
  id: '1', provider: 'flixbus', booking_ref: 'FB-001',
  origin: 'LON', destination: 'PAR',
  depart_at: '2030-04-15T06:30:00Z', arrive_at: '2030-04-15T11:00:00Z', return_at: null,
  price_eur: '18.00', currency_display: 'EUR',
  status: 'confirmed', raw_ticket_url: null,
  created_at: '2026-03-18T10:00:00Z',
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetItineraries.mockResolvedValue({ itineraries: [] });
});

// Render and let mount-time async effects (storage reads, fetches) settle
// inside act(), so they don't update state after the test has finished.
async function renderSettled(ui: React.ReactElement) {
  const utils = render(ui);
  await act(async () => {});
  return utils;
}

describe('MyTripsScreen', () => {
  it('renders an upcoming trip as a ticket with its reference', async () => {
    mockGetTrips.mockResolvedValue({ trips: [trip({})] });
    const utils = await renderSettled(<MyTripsScreen />);
    expect(await utils.findByTestId('trip-card')).toBeTruthy();
    expect(utils.getAllByText('LON → PAR').length).toBeGreaterThan(0);
    expect(utils.getByText('FB-001')).toBeTruthy();
    expect(utils.getAllByText(/confirmed/i).length).toBeGreaterThan(0);
    expect(utils.getByTestId('next-countdown')).toBeTruthy();
  });

  it('splits upcoming and past trips', async () => {
    mockGetTrips.mockResolvedValue({
      trips: [
        trip({ id: 'a', booking_ref: 'FUTURE', depart_at: '2030-04-15T06:30:00Z', arrive_at: '2030-04-15T11:00:00Z' }),
        trip({ id: 'b', booking_ref: 'OLD', origin: 'AMS', destination: 'BRU', depart_at: '2020-01-01T06:30:00Z', arrive_at: '2020-01-01T09:00:00Z' }),
      ],
    });
    const utils = await renderSettled(<MyTripsScreen />);
    expect(await utils.findByText('FUTURE')).toBeTruthy();
    expect(utils.queryByText('OLD')).toBeNull();
    fireEvent.press(utils.getByTestId('trips-past'));
    expect(utils.getByText('OLD')).toBeTruthy();
    expect(utils.queryByText('FUTURE')).toBeNull();
  });

  it('shows the empty state with a way to search', async () => {
    mockGetTrips.mockResolvedValue({ trips: [] });
    const utils = await renderSettled(<MyTripsScreen />);
    expect(await utils.findByText('No trips yet')).toBeTruthy();
    fireEvent.press(utils.getByText('Find a trip'));
    expect(mockNavigate).toHaveBeenCalledWith('/(tabs)');
  });

  it('shows an error with retry when nothing is loaded', async () => {
    mockGetTrips.mockRejectedValueOnce(new Error('Network error'));
    const utils = await renderSettled(<MyTripsScreen />);
    expect(await utils.findByText('Network error')).toBeTruthy();
    mockGetTrips.mockResolvedValue({ trips: [trip({})] });
    await act(async () => {
      fireEvent.press(utils.getByTestId('trips-retry'));
    });
    expect(await utils.findByText('FB-001')).toBeTruthy();
  });

  it('keeps showing trips (no spinner) when a refocus refresh fails', async () => {
    mockGetTrips.mockResolvedValue({ trips: [trip({})] });
    const utils = await renderSettled(<MyTripsScreen />);
    expect(await utils.findByText('FB-001')).toBeTruthy();
    mockGetTrips.mockRejectedValueOnce(new Error('offline'));
    await act(async () => {
      mockFocus?.();
    });
    expect(utils.getByText('FB-001')).toBeTruthy();
    expect(utils.queryByTestId('trips-loading')).toBeNull();
    expect(utils.getByTestId('trips-error')).toBeTruthy();
  });

  it('renders itineraries with their legs and reference', async () => {
    mockGetTrips.mockResolvedValue({ trips: [] });
    mockGetItineraries.mockResolvedValue({
      itineraries: [
        {
          id: 'iti-1', booking_ref: 'ITI-ABC', origin: 'LON', destination: 'BCN',
          depart_at: '2030-06-01T08:00:00Z', arrive_at: '2030-06-01T18:00:00Z',
          total_price_eur: '95.00', status: 'confirmed',
          legs: [
            trip({ id: 'leg-1', booking_ref: 'FB-LEG-1', origin: 'LON', destination: 'PAR', depart_at: '2030-06-01T08:00:00Z' }),
            trip({ id: 'leg-2', provider: 'rail', booking_ref: 'RL-LEG-2', origin: 'PAR', destination: 'BCN', depart_at: '2030-06-01T14:00:00Z' }),
          ],
        },
      ],
    });
    const utils = await renderSettled(<MyTripsScreen />);
    expect(await utils.findByText('LON → BCN')).toBeTruthy();
    expect(utils.getByText(/ITI-ABC/)).toBeTruthy();
    expect(utils.getAllByTestId('expandable-leg')).toHaveLength(2);
  });

  it('orders upcoming bookings soonest first across trips and itineraries', async () => {
    mockGetTrips.mockResolvedValue({ trips: [trip({ id: 't', booking_ref: 'LATER', depart_at: '2030-08-01T09:00:00Z', arrive_at: '2030-08-01T12:00:00Z' })] });
    mockGetItineraries.mockResolvedValue({
      itineraries: [{
        id: 'i', booking_ref: 'SOONER', origin: 'LON', destination: 'MAD',
        depart_at: '2030-07-01T07:00:00Z', arrive_at: '2030-07-01T17:00:00Z',
        total_price_eur: '120.00', status: 'confirmed', legs: [],
      }],
    });
    const utils = await renderSettled(<MyTripsScreen />);
    await utils.findByText(/SOONER/);
    const cards = utils.getAllByTestId(/^(itinerary|trip)-card$/).map(c => c.props.testID);
    expect(cards).toEqual(['itinerary-card', 'trip-card']);
  });

  it('reveals the QR code when a ticket is expanded', async () => {
    mockGetTrips.mockResolvedValue({ trips: [trip({ ticket_qr_data: 'QR-DATA' })] });
    const utils = await renderSettled(<MyTripsScreen />);
    await utils.findByText('FB-001');
    expect(utils.queryByTestId('qr-code')).toBeNull();
    fireEvent.press(utils.getByTestId('expandable-leg'));
    expect(utils.getByTestId('qr-code')).toBeTruthy();
  });

  it('renders a round trip with outbound and return sections', async () => {
    const future = (days: number, h = 8) => new Date(Date.now() + days * 86_400_000 + h * 3_600_000).toISOString();
    const leg = (id: string, order: number, direction: 'outbound' | 'return', status = 'confirmed') =>
      trip({
        id, provider: 'rail', booking_ref: status === 'confirmed' ? `R-${id}` : (null as any),
        origin: direction === 'outbound' ? 'LON' : 'PAR', destination: direction === 'outbound' ? 'PAR' : 'LON',
        depart_at: future(direction === 'outbound' ? 5 : 8), arrive_at: future(direction === 'outbound' ? 5 : 8, 11),
        status, leg_order: order, direction,
      });
    mockGetTrips.mockResolvedValue({ trips: [] });
    mockGetItineraries.mockResolvedValue({
      itineraries: [{
        id: 'rt', booking_ref: 'TS-RT', origin: 'LON', destination: 'PAR', depart_at: future(5), arrive_at: future(8, 11),
        total_price_eur: '40.00', status: 'partially_failed', trip_type: 'round_trip',
        legs: [leg('o', 0, 'outbound'), leg('r', 1, 'return', 'failed')],
      }],
    });

    const utils = await renderSettled(<MyTripsScreen />);
    expect(await utils.findByText('LON ⇄ PAR')).toBeTruthy();
    expect(utils.getByTestId('trips-section-outbound')).toBeTruthy();
    expect(utils.getByTestId('trips-section-return')).toBeTruthy();
    expect(utils.getByText('Not booked · not charged')).toBeTruthy();
  });
});
