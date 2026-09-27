import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import ConnectionsScreen from '../../app/checkout/connections';
import {
  getCheckoutItinerary,
  getCheckoutMainLeg,
  setCheckoutItinerary,
  setDirectionConnections,
  getDirectionConnections,
} from '../../src/stores/checkoutStore';
import { getSearchMeta } from '../../src/stores/searchStore';
import { searchConnections } from '../../src/api/itinerary';
import {
  needsDepartureConnection,
  needsArrivalConnection,
} from '../../src/utils/connections';

jest.mock('../../src/stores/checkoutStore');
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
    format: (n: number) => `€${n.toFixed(2)}`,
  }),
}));

const mockPush = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  router: { canGoBack: () => false, back: jest.fn() },
}));

jest.mock('../../src/api/itinerary');
jest.mock('../../src/utils/connections');

const mockGetCheckoutItinerary = getCheckoutItinerary as jest.Mock;
const mockGetCheckoutMainLeg = getCheckoutMainLeg as jest.Mock;
const mockSetCheckoutItinerary = setCheckoutItinerary as jest.Mock;
const mockGetSearchMeta = getSearchMeta as jest.Mock;
const mockSearchConnections = searchConnections as jest.Mock;
const mockNeedsDeparture = needsDepartureConnection as jest.Mock;
const mockNeedsArrival = needsArrivalConnection as jest.Mock;

const MOCK_MAIN_LEG = {
  id: 'flight:1',
  provider: 'amadeus',
  transportType: 'flight' as const,
  origin: 'CDG',
  destination: 'FCO',
  originName: 'Charles de Gaulle',
  destinationName: 'Fiumicino',
  departAt: '2026-04-15T10:00:00Z',
  arriveAt: '2026-04-15T12:00:00Z',
  durationMins: 120,
  priceEur: 80,
  stops: 0,
  deepLink: '',
};

const MOCK_ITINERARY = {
  legs: [MOCK_MAIN_LEG],
  connections: [],
  totalPriceEur: 80,
  adults: 1,
};

const MOCK_SEARCH_META = {
  from: 'PAR',
  to: 'ROM',
  departDate: '2026-04-15',
  adults: 1,
  providersQueried: ['amadeus'],
  providersFailed: [],
};

const MOCK_DEPARTURE_CONNECTION = {
  id: 'bus:dep:1',
  provider: 'flixbus',
  transportType: 'bus' as const,
  origin: 'PAR',
  destination: 'CDG',
  originName: 'Paris',
  destinationName: 'CDG',
  departAt: '2026-04-15T07:30:00Z',
  arriveAt: '2026-04-15T09:00:00Z',
  durationMins: 90,
  priceEur: 15,
  stops: 0,
  deepLink: '',
};

const MOCK_ARRIVAL_CONNECTION = {
  id: 'train:arr:1',
  provider: 'trenitalia',
  transportType: 'train' as const,
  origin: 'FCO',
  destination: 'ROM',
  originName: 'Fiumicino',
  destinationName: 'Rome',
  departAt: '2026-04-15T13:00:00Z',
  arriveAt: '2026-04-15T13:45:00Z',
  durationMins: 45,
  priceEur: 12,
  stops: 0,
  deepLink: '',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCheckoutItinerary.mockReturnValue(MOCK_ITINERARY);
  // setCheckoutItinerary records the main leg; the screen reads it back here.
  mockGetCheckoutMainLeg.mockReturnValue(MOCK_MAIN_LEG);
  mockGetSearchMeta.mockReturnValue(MOCK_SEARCH_META);
  mockNeedsDeparture.mockReturnValue(false);
  mockNeedsArrival.mockReturnValue(false);
  mockSearchConnections.mockResolvedValue({ connections: [], meta: {} });
});

describe('ConnectionsScreen', () => {
  it('shows loading while fetching connections', async () => {
    mockNeedsDeparture.mockReturnValue(true);
    // Keep the promise pending
    let resolve: (val: any) => void;
    mockSearchConnections.mockReturnValue(new Promise(r => { resolve = r; }));

    const { getByTestId } = render(<ConnectionsScreen />);
    expect(getByTestId('departure-loading')).toBeTruthy();

    // Clean up pending promise
    await act(async () => {
      resolve!({ connections: [], meta: {} });
    });
  });

  it('shows departure connections when needsDepartureConnection returns true', async () => {
    mockNeedsDeparture.mockReturnValue(true);
    mockSearchConnections.mockResolvedValue({
      connections: [MOCK_DEPARTURE_CONNECTION],
      meta: {},
    });

    const { getByText, getByTestId } = render(<ConnectionsScreen />);

    await waitFor(() => {
      expect(getByText('Getting to CDG')).toBeTruthy();
      expect(getByText(/Bus & train options from PAR/)).toBeTruthy();
      expect(getByTestId(`departure-option-${MOCK_DEPARTURE_CONNECTION.id}`)).toBeTruthy();
    });
  });

  it('shows "No connections needed" when neither is needed', () => {
    mockNeedsDeparture.mockReturnValue(false);
    mockNeedsArrival.mockReturnValue(false);

    const { getByTestId, getByText } = render(<ConnectionsScreen />);
    expect(getByTestId('no-connections')).toBeTruthy();
    expect(getByText('No connections needed')).toBeTruthy();
    expect(getByText('Your route departs and arrives at your search cities')).toBeTruthy();
  });

  it('navigates to transfer on continue press', async () => {
    mockNeedsDeparture.mockReturnValue(false);
    mockNeedsArrival.mockReturnValue(false);

    const { getByTestId } = render(<ConnectionsScreen />);
    fireEvent.press(getByTestId('continue-btn'));

    expect(mockSetCheckoutItinerary).toHaveBeenCalledWith(
      MOCK_MAIN_LEG,
      1,
      undefined,
      undefined,
    );
    expect(mockPush).toHaveBeenCalledWith('/checkout/transfer');
  });

  it('shows per-section error on API failure with retry button', async () => {
    mockNeedsDeparture.mockReturnValue(true);
    mockSearchConnections.mockRejectedValue(new Error('Network error'));

    const { getByTestId, getByText } = render(<ConnectionsScreen />);

    await waitFor(() => {
      expect(getByTestId('departure-error')).toBeTruthy();
      expect(getByText('Network error')).toBeTruthy();
      expect(getByTestId('departure-retry-btn')).toBeTruthy();
    });
  });

  it('shows arrival-section error when arrival fetch fails', async () => {
    mockNeedsArrival.mockReturnValue(true);
    mockSearchConnections.mockRejectedValue(new Error('Network error'));

    const { getByTestId } = render(<ConnectionsScreen />);

    await waitFor(() => {
      expect(getByTestId('arrival-error')).toBeTruthy();
      expect(getByTestId('arrival-retry-btn')).toBeTruthy();
    });
  });

  it('selects a departure connection when tapped', async () => {
    mockNeedsDeparture.mockReturnValue(true);
    mockSearchConnections.mockResolvedValue({
      connections: [MOCK_DEPARTURE_CONNECTION],
      meta: {},
    });

    const { getByTestId } = render(<ConnectionsScreen />);

    await waitFor(() => {
      expect(getByTestId(`departure-option-${MOCK_DEPARTURE_CONNECTION.id}`)).toBeTruthy();
    });

    fireEvent.press(getByTestId(`departure-option-${MOCK_DEPARTURE_CONNECTION.id}`));

    fireEvent.press(getByTestId('continue-btn'));
    expect(mockSetCheckoutItinerary).toHaveBeenCalledWith(
      MOCK_MAIN_LEG,
      1,
      MOCK_DEPARTURE_CONNECTION,
      undefined,
    );
  });

  it('skips departure connection when skip button pressed', async () => {
    mockNeedsDeparture.mockReturnValue(true);
    mockSearchConnections.mockResolvedValue({
      connections: [MOCK_DEPARTURE_CONNECTION],
      meta: {},
    });

    const { getByTestId } = render(<ConnectionsScreen />);

    await waitFor(() => {
      expect(getByTestId('skip-departure')).toBeTruthy();
    });

    fireEvent.press(getByTestId('skip-departure'));
    fireEvent.press(getByTestId('continue-btn'));

    expect(mockSetCheckoutItinerary).toHaveBeenCalledWith(
      MOCK_MAIN_LEG,
      1,
      undefined,
      undefined,
    );
  });

  it('shows arrival connections when needsArrivalConnection returns true', async () => {
    mockNeedsArrival.mockReturnValue(true);
    mockSearchConnections.mockResolvedValue({
      connections: [MOCK_ARRIVAL_CONNECTION],
      meta: {},
    });

    const { getByText, getByTestId } = render(<ConnectionsScreen />);

    await waitFor(() => {
      expect(getByText('Getting from FCO')).toBeTruthy();
      expect(getByText(/Bus & train options to ROM/)).toBeTruthy();
      expect(getByTestId(`arrival-option-${MOCK_ARRIVAL_CONNECTION.id}`)).toBeTruthy();
    });
  });

  it('retries fetching when retry button is pressed', async () => {
    mockNeedsDeparture.mockReturnValue(true);
    mockSearchConnections.mockRejectedValueOnce(new Error('Timeout'));
    mockSearchConnections.mockResolvedValue({
      connections: [MOCK_DEPARTURE_CONNECTION],
      meta: {},
    });

    const { getByTestId } = render(<ConnectionsScreen />);

    await waitFor(() => {
      expect(getByTestId('departure-retry-btn')).toBeTruthy();
    });

    fireEvent.press(getByTestId('departure-retry-btn'));

    await waitFor(() => {
      expect(getByTestId(`departure-option-${MOCK_DEPARTURE_CONNECTION.id}`)).toBeTruthy();
    });
  });

  it('filters out departure options that arrive after the main leg departs', async () => {
    mockNeedsDeparture.mockReturnValue(true);
    const tooLate = {
      ...MOCK_DEPARTURE_CONNECTION,
      id: 'bus:dep:late',
      departAt: '2026-04-15T10:30:00Z',
      arriveAt: '2026-04-15T11:00:00Z', // after main leg departs at 10:00
    };
    mockSearchConnections.mockResolvedValue({
      connections: [MOCK_DEPARTURE_CONNECTION, tooLate],
      meta: {},
    });

    const { getByTestId, queryByTestId } = render(<ConnectionsScreen />);

    await waitFor(() => {
      expect(getByTestId(`departure-option-${MOCK_DEPARTURE_CONNECTION.id}`)).toBeTruthy();
    });
    expect(queryByTestId('departure-option-bus:dep:late')).toBeNull();
  });
});

describe('round trips', () => {
  const RT_ITIN = { legs: [], connections: [], totalPriceEur: 0, adults: 1, tripType: 'round_trip', viaConnections: true };

  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
    mockGetCheckoutItinerary.mockReturnValue(RT_ITIN);
    mockGetSearchMeta.mockReturnValue({ from: 'BUD', to: 'NCE', adults: 1 });
    (getDirectionConnections as jest.Mock).mockReturnValue({});
    mockNeedsDeparture.mockReturnValue(false);
    mockNeedsArrival.mockReturnValue(false);
  });

  it('outbound pass continues to the return pass', () => {
    mockGetCheckoutMainLeg.mockImplementation((dir = 'outbound') => ({ ...MOCK_MAIN_LEG, id: dir }));
    const { getByTestId } = render(<ConnectionsScreen />);
    fireEvent.press(getByTestId('continue-btn'));
    expect(setDirectionConnections).toHaveBeenCalledWith('outbound', undefined, undefined);
    expect(mockPush).toHaveBeenCalledWith('/checkout/connections?direction=return');
  });

  it('return pass uses the return main leg with the cities swapped', () => {
    mockParams = { direction: 'return' };
    mockGetCheckoutMainLeg.mockImplementation((dir = 'outbound') => ({ ...MOCK_MAIN_LEG, id: dir, origin: 'NCE', destination: 'VIE' }));
    const { getByTestId } = render(<ConnectionsScreen />);
    expect(mockGetCheckoutMainLeg).toHaveBeenCalledWith('return');
    // departure feeder is checked from the destination city (NCE) to the return's hub
    expect(mockNeedsDeparture).toHaveBeenCalledWith('NCE', 'NCE');
    expect(mockNeedsArrival).toHaveBeenCalledWith('BUD', 'VIE');
    fireEvent.press(getByTestId('continue-btn'));
    expect(setDirectionConnections).toHaveBeenCalledWith('return', undefined, undefined);
    expect(mockPush).toHaveBeenCalledWith('/checkout/transfer');
  });
});
