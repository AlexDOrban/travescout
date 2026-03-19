import {
  setCheckoutTrip,
  getCheckoutTrip,
  getCheckoutAdults,
  setPassengers,
  getPassengers,
  setBookingResult,
  getBookingResult,
  clearCheckout,
} from '../../src/stores/checkoutStore';

const MOCK_TRIP: any = {
  id: 'amadeus:1',
  provider: 'amadeus',
  origin: 'LON',
  destination: 'PAR',
  priceEur: 42.5,
};

afterEach(() => clearCheckout());

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
