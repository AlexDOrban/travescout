import {
  setCheckoutTrip,
  getCheckoutTrip,
  getCheckoutAdults,
  setPassengers,
  getPassengers,
  setBookingResult,
  getBookingResult,
  clearCheckout,
  setCheckoutItinerary,
  getCheckoutItinerary,
  setCheckoutTransfer,
  getCheckoutTransfer,
  setCheckoutRoundTrip,
  setDirectionConnections,
  getDirectionConnections,
  getCheckoutMainLeg,
  getCheckoutIdempotencyKey,
} from '../../src/stores/checkoutStore';
import type { Leg } from '../../src/types/itinerary';

const MOCK_TRIP: any = {
  id: 'amadeus:1',
  provider: 'amadeus',
  origin: 'LON',
  destination: 'PAR',
  priceEur: 42.5,
};

const makeLeg = (overrides: Partial<Leg> = {}): Leg => ({
  id: 'test:1', provider: 'flixbus', transportType: 'bus',
  origin: 'BUD', destination: 'VIE', originName: 'Budapest', destinationName: 'Vienna',
  departAt: '2030-06-15T08:00:00Z', arriveAt: '2030-06-15T10:30:00Z',
  durationMins: 150, priceEur: 15, stops: 0, deepLink: '',
  ...overrides,
});

beforeEach(() => clearCheckout());

describe('checkoutStore', () => {
  it('stores and retrieves checkout trip and adults', () => {
    setCheckoutTrip(MOCK_TRIP, 2);
    expect(getCheckoutTrip()).toBe(MOCK_TRIP);
    expect(getCheckoutAdults()).toBe(2);
  });

  it('resets passengers and booking result when setting new trip', () => {
    setPassengers([{ name: 'John', email: 'j@b.com' }]);
    setCheckoutTrip(MOCK_TRIP, 1);
    expect(getPassengers()).toEqual([]);
    expect(getBookingResult()).toBeNull();
  });

  it('stores and retrieves passengers', () => {
    const passengers = [{ name: 'John', email: 'j@b.com' }];
    setPassengers(passengers);
    expect(getPassengers()).toEqual(passengers);
  });

  it('stores and retrieves booking result', () => {
    const result = { bookingRef: 'FB-123', status: 'confirmed', trip: {} as any };
    setBookingResult(result);
    expect(getBookingResult()).toBe(result);
  });

  it('clears all state', () => {
    setCheckoutTrip(MOCK_TRIP, 3);
    setPassengers([{ name: 'A', email: 'a@b.com' }]);
    clearCheckout();
    expect(getCheckoutTrip()).toBeNull();
    expect(getCheckoutAdults()).toBe(1);
    expect(getPassengers()).toEqual([]);
    expect(getBookingResult()).toBeNull();
  });
});

describe('Checkout Store - Itinerary', () => {
  it('returns null when no itinerary set', () => {
    expect(getCheckoutItinerary()).toBeNull();
  });

  it('stores single main leg itinerary', () => {
    const main = makeLeg({ priceEur: 62 });
    setCheckoutItinerary(main, 1);
    const itin = getCheckoutItinerary();
    expect(itin).not.toBeNull();
    expect(itin!.legs).toHaveLength(1);
    expect(itin!.totalPriceEur).toBe(62);
    expect(itin!.connections).toHaveLength(0);
  });

  it('stores 3-leg itinerary with connections', () => {
    const departure = makeLeg({ priceEur: 15, arriveAt: '2030-06-15T10:30:00Z' });
    const main = makeLeg({ priceEur: 62, departAt: '2030-06-15T14:00:00Z', arriveAt: '2030-06-15T16:10:00Z', transportType: 'flight' });
    const arrival = makeLeg({ priceEur: 4, departAt: '2030-06-15T16:45:00Z' });

    setCheckoutItinerary(main, 1, departure, arrival);
    const itin = getCheckoutItinerary();
    expect(itin!.legs).toHaveLength(3);
    expect(itin!.legs[0].priceEur).toBe(15);
    expect(itin!.legs[1].priceEur).toBe(62);
    expect(itin!.legs[2].priceEur).toBe(4);
    expect(itin!.totalPriceEur).toBe(81);
    expect(itin!.connections).toHaveLength(2);
    expect(itin!.adults).toBe(1);
  });

  it('clearCheckout clears itinerary', () => {
    setCheckoutItinerary(makeLeg(), 1);
    clearCheckout();
    expect(getCheckoutItinerary()).toBeNull();
  });

  it('stores and retrieves ground-transfer details', () => {
    setCheckoutTransfer({ startAddress: 'Savoy Hotel', endAddress: 'Lutetia', travelMode: 'walking' });
    expect(getCheckoutTransfer()).toEqual({
      startAddress: 'Savoy Hotel',
      endAddress: 'Lutetia',
      travelMode: 'walking',
    });
  });

  it('defaults transfer to empty addresses with transit mode', () => {
    expect(getCheckoutTransfer()).toEqual({ startAddress: '', endAddress: '', travelMode: 'transit' });
  });

  it('resets transfer when a new trip or itinerary starts checkout', () => {
    setCheckoutTransfer({ startAddress: 'X', endAddress: 'Y', travelMode: 'driving' });
    setCheckoutTrip(MOCK_TRIP, 1);
    expect(getCheckoutTransfer()).toEqual({ startAddress: '', endAddress: '', travelMode: 'transit' });

    setCheckoutTransfer({ startAddress: 'X', endAddress: 'Y', travelMode: 'driving' });
    setCheckoutItinerary(makeLeg(), 1);
    expect(getCheckoutTransfer()).toEqual({ startAddress: '', endAddress: '', travelMode: 'transit' });
  });
});

describe('checkoutStore — round trips', () => {
  const out = makeLeg({ id: 'out', origin: 'LON', destination: 'PAR', priceEur: 50, arriveAt: '2030-06-15T10:30:00Z' });
  const ret = makeLeg({ id: 'ret', origin: 'PAR', destination: 'LON', priceEur: 40, departAt: '2030-06-18T17:00:00Z', arriveAt: '2030-06-18T19:30:00Z' });
  const feeder = (id: string) => makeLeg({ id, priceEur: 5 });

  it('builds a two-leg round-trip itinerary', () => {
    setCheckoutRoundTrip(out, ret, 2, false);
    const it = getCheckoutItinerary()!;
    expect(it.tripType).toBe('round_trip');
    expect(it.viaConnections).toBe(false);
    expect(it.legs.map(l => [l.id, l.direction])).toEqual([['out', 'outbound'], ['ret', 'return']]);
    expect(it.totalPriceEur).toBe(90);
    expect(it.adults).toBe(2);
    expect(it.connections[0].stay).toBe(true);
    expect(getCheckoutMainLeg('return')!.id).toBe('ret');
    expect(getCheckoutMainLeg()!.id).toBe('out');
  });

  it('orders feeders per direction and keeps the idempotency key', () => {
    setCheckoutRoundTrip(out, ret, 1, true);
    const key = getCheckoutIdempotencyKey();
    setDirectionConnections('outbound', feeder('out-dep'), undefined);
    setDirectionConnections('return', undefined, feeder('ret-arr'));
    const ids = getCheckoutItinerary()!.legs.map(l => l.id);
    expect(ids).toEqual(['out-dep', 'out', 'ret', 'ret-arr']);
    expect(getCheckoutItinerary()!.totalPriceEur).toBe(100);
    expect(getCheckoutIdempotencyKey()).toBe(key);
  });

  it('keeps the return feeders when the outbound feeders change (back navigation)', () => {
    setCheckoutRoundTrip(out, ret, 1, true);
    setDirectionConnections('outbound', feeder('dep-1'), undefined);
    setDirectionConnections('return', feeder('ret-dep'), undefined);
    setDirectionConnections('outbound', feeder('dep-2'), undefined);
    expect(getCheckoutItinerary()!.legs.map(l => l.id)).toEqual(['dep-2', 'out', 'ret-dep', 'ret']);
    expect(getDirectionConnections('return').departure!.id).toBe('ret-dep');
  });

  it('one-way itineraries stay one-way and tag outbound', () => {
    setCheckoutItinerary(out, 1);
    const it = getCheckoutItinerary()!;
    expect(it.tripType).toBe('one_way');
    expect(it.legs[0].direction).toBe('outbound');
    expect(getCheckoutMainLeg('return')).toBeNull();
  });

  it('clearCheckout forgets both directions', () => {
    setCheckoutRoundTrip(out, ret, 1, false);
    clearCheckout();
    expect(getCheckoutMainLeg()).toBeNull();
    expect(getCheckoutMainLeg('return')).toBeNull();
    expect(getDirectionConnections('outbound')).toEqual({});
  });
});
