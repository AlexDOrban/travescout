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
