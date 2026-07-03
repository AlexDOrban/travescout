const { validateBookingBody } = require('../../src/validators/booking');

const valid = {
  trip: {
    id: 'flixbus:flixbus-LON-PAR-2026-04-15-001',
    provider: 'flixbus',
    origin: 'LON',
    destination: 'PAR',
    departAt: '2026-04-15T06:30:00Z',
    priceEur: 18,
  },
  passengers: [{ name: 'John Doe', email: 'john@example.com' }],
  paymentMethodId: 'pm_card_visa',
};

describe('validateBookingBody', () => {
  it('returns the parsed body for valid input', () => {
    const result = validateBookingBody(valid);
    expect(result.trip.provider).toBe('flixbus');
    expect(result.passengers).toHaveLength(1);
    expect(result.paymentMethodId).toBe('pm_card_visa');
  });

  it('throws 400 if trip is missing', () => {
    expect(() => validateBookingBody({ ...valid, trip: undefined })).toThrow();
  });

  it('throws 400 if trip.provider is missing', () => {
    expect(() => validateBookingBody({ ...valid, trip: { ...valid.trip, provider: undefined } })).toThrow();
  });

  it('throws 400 if trip.origin is missing', () => {
    expect(() => validateBookingBody({ ...valid, trip: { ...valid.trip, origin: undefined } })).toThrow();
  });

  it('throws 400 if trip.destination is missing', () => {
    expect(() => validateBookingBody({ ...valid, trip: { ...valid.trip, destination: undefined } })).toThrow();
  });

  it('throws 400 if trip.id is missing', () => {
    expect(() => validateBookingBody({ ...valid, trip: { ...valid.trip, id: undefined } })).toThrow();
  });

  it('throws 400 if trip.priceEur is NaN', () => {
    expect(() => validateBookingBody({ ...valid, trip: { ...valid.trip, priceEur: NaN } })).toThrow();
  });

  it('throws 400 if trip.priceEur is zero', () => {
    expect(() => validateBookingBody({ ...valid, trip: { ...valid.trip, priceEur: 0 } })).toThrow();
  });

  it('throws 400 if trip.priceEur is negative', () => {
    expect(() => validateBookingBody({ ...valid, trip: { ...valid.trip, priceEur: -5 } })).toThrow();
  });

  it('throws 400 if passengers is empty array', () => {
    expect(() => validateBookingBody({ ...valid, passengers: [] })).toThrow();
  });

  it('throws 400 if passenger name is missing', () => {
    expect(() => validateBookingBody({ ...valid, passengers: [{ email: 'john@example.com' }] })).toThrow();
  });

  it('throws 400 if passenger email is missing', () => {
    expect(() => validateBookingBody({ ...valid, passengers: [{ name: 'John Doe' }] })).toThrow();
  });

  it('throws 400 if paymentMethodId is missing', () => {
    expect(() => validateBookingBody({ ...valid, paymentMethodId: undefined })).toThrow();
  });
});
