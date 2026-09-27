const { validateItineraryBookingBody } = require('../../src/validators/itineraryBooking');

const leg = (id, over = {}) => ({
  id, provider: 'flixbus', origin: 'BUD', destination: 'VIE', priceEur: 10, ...over,
});

const base = {
  legs: [leg('a')],
  passengers: [{ name: 'Ann', email: 'ann@example.com' }],
  paymentMethodId: 'pm_card_visa',
  origin: 'BUD',
  destination: 'VIE',
};

const status400 = fn => {
  try {
    fn();
  } catch (e) {
    return e.status;
  }
  return 'no error';
};

describe('validateItineraryBookingBody — trip type and direction', () => {
  it('defaults to one_way with outbound legs', () => {
    const out = validateItineraryBookingBody(base);
    expect(out.tripType).toBe('one_way');
    expect(out.legs[0].direction).toBe('outbound');
  });

  it('rejects an unknown tripType', () => {
    expect(status400(() => validateItineraryBookingBody({ ...base, tripType: 'multi_city' }))).toBe(400);
  });

  it('rejects an unknown leg direction', () => {
    expect(status400(() => validateItineraryBookingBody({ ...base, legs: [leg('a', { direction: 'sideways' })] }))).toBe(400);
  });

  it('rejects return legs on a one-way itinerary', () => {
    const legs = [leg('a'), leg('b', { direction: 'return' })];
    expect(status400(() => validateItineraryBookingBody({ ...base, legs }))).toBe(400);
  });

  it('accepts a round trip with outbound then return legs', () => {
    const legs = [leg('a'), leg('b', { direction: 'return' })];
    const out = validateItineraryBookingBody({ ...base, legs, tripType: 'round_trip' });
    expect(out.tripType).toBe('round_trip');
    expect(out.legs.map(l => l.direction)).toEqual(['outbound', 'return']);
  });

  it('rejects a round trip without return legs', () => {
    expect(status400(() => validateItineraryBookingBody({ ...base, legs: [leg('a')], tripType: 'round_trip' }))).toBe(400);
  });

  it('rejects a round trip that starts with a return leg', () => {
    const legs = [leg('a', { direction: 'return' }), leg('b')];
    expect(status400(() => validateItineraryBookingBody({ ...base, legs, tripType: 'round_trip' }))).toBe(400);
  });

  it('rejects an outbound leg after a return leg', () => {
    const legs = [leg('a'), leg('b', { direction: 'return' }), leg('c')];
    expect(status400(() => validateItineraryBookingBody({ ...base, legs, tripType: 'round_trip' }))).toBe(400);
  });

  it('allows 6 legs on a round trip (3 per direction)', () => {
    const legs = [leg('a'), leg('b'), leg('c'), leg('d', { direction: 'return' }), leg('e', { direction: 'return' }), leg('f', { direction: 'return' })];
    expect(validateItineraryBookingBody({ ...base, legs, tripType: 'round_trip' }).legs).toHaveLength(6);
  });

  it('rejects more than 3 legs in one direction', () => {
    const legs = [leg('a'), leg('b'), leg('c'), leg('d'), leg('e', { direction: 'return' })];
    expect(status400(() => validateItineraryBookingBody({ ...base, legs, tripType: 'round_trip' }))).toBe(400);
  });

  it('still caps one-way itineraries at 3 legs', () => {
    const legs = [leg('a'), leg('b'), leg('c'), leg('d')];
    expect(status400(() => validateItineraryBookingBody({ ...base, legs }))).toBe(400);
  });
});
