jest.mock('../../src/models/user');
jest.mock('../../src/models/trip');
jest.mock('../../src/services/stripe');
jest.mock('../../src/services/offerStore');
jest.mock('../../src/db', () => ({
  // Run the transaction body immediately with a fake executor.
  withTransaction: (fn) => fn({ query: jest.fn() }),
  query: jest.fn(),
}));
jest.mock('../../src/providers/flixbus');
jest.mock('../../src/providers/rail');
jest.mock('../../src/providers/amadeus');

const User = require('../../src/models/user');
const Trip = require('../../src/models/trip');
const StripeService = require('../../src/services/stripe');
const offerStore = require('../../src/services/offerStore');
const flixbus = require('../../src/providers/flixbus');
const { book } = require('../../src/services/booking');

const tripPayload = {
  id: 'flixbus:leg-1',
  provider: 'flixbus',
  origin: 'LON',
  destination: 'PAR',
  departAt: '2026-04-15T06:30:00Z',
  priceEur: 18,
};

// Authoritative offer the server re-quotes against.
const offer = {
  id: 'flixbus:leg-1',
  provider: 'flixbus',
  origin: 'LON',
  destination: 'PAR',
  departAt: '2026-04-15T06:30:00Z',
  arriveAt: '2026-04-15T11:00:00Z',
  priceEur: 18,
};

const bookParams = {
  userId: 'user-1',
  trip: tripPayload,
  passengers: [{ name: 'John Doe', email: 'john@example.com' }],
  paymentMethodId: 'pm_card_visa',
};

beforeEach(() => {
  jest.clearAllMocks();
  offerStore.get.mockReturnValue(offer);
  User.findById.mockResolvedValue({ id: 'user-1', email: 'test@example.com', stripe_customer_id: null });
  User.setStripeCustomerId.mockResolvedValue();
  StripeService.getOrCreateCustomer.mockResolvedValue('cus_123');
  StripeService.authorize.mockResolvedValue({ id: 'pi_123', status: 'requires_capture' });
  StripeService.capture.mockResolvedValue({ id: 'pi_123', status: 'succeeded' });
  StripeService.cancel.mockResolvedValue({ id: 'pi_123', status: 'canceled' });
  flixbus.book.mockResolvedValue({ bookingRef: 'FB-001', status: 'confirmed', ticketUrl: null });
  Trip.create.mockResolvedValue({
    id: 'trip-uuid',
    provider: 'flixbus',
    booking_ref: 'FB-001',
    status: 'confirmed',
  });
});

describe('BookingService.book', () => {
  it('returns bookingRef, status, and trip', async () => {
    const result = await book(bookParams);
    expect(result.bookingRef).toBe('FB-001');
    expect(result.status).toBe('confirmed');
    expect(result.trip.id).toBe('trip-uuid');
  });

  it('rejects with 409 when the offer is no longer in the store', async () => {
    offerStore.get.mockReturnValue(null);
    await expect(book(bookParams)).rejects.toMatchObject({ status: 409 });
    expect(StripeService.authorize).not.toHaveBeenCalled();
  });

  it('charges the authoritative offer price, not the client price', async () => {
    offerStore.get.mockReturnValue({ ...offer, priceEur: 18 });
    await book({ ...bookParams, trip: { ...tripPayload, priceEur: 0.01 } });
    expect(StripeService.authorize).toHaveBeenCalledWith(expect.objectContaining({ amountEur: 18 }));
  });

  it('calls getOrCreateCustomer with user info', async () => {
    await book(bookParams);
    expect(StripeService.getOrCreateCustomer).toHaveBeenCalledWith('user-1', 'test@example.com', null);
  });

  it('persists new stripe_customer_id if one was created', async () => {
    await book(bookParams);
    expect(User.setStripeCustomerId).toHaveBeenCalledWith('user-1', 'cus_123');
  });

  it('does not update stripe_customer_id when it already existed', async () => {
    User.findById.mockResolvedValue({ id: 'user-1', email: 'test@example.com', stripe_customer_id: 'cus_existing' });
    StripeService.getOrCreateCustomer.mockResolvedValue('cus_existing');
    await book(bookParams);
    expect(User.setStripeCustomerId).not.toHaveBeenCalled();
  });

  it('authorizes Stripe with the correct amount', async () => {
    await book(bookParams);
    expect(StripeService.authorize).toHaveBeenCalledWith(expect.objectContaining({
      customerId: 'cus_123',
      paymentMethodId: 'pm_card_visa',
      amountEur: 18,
    }));
  });

  it('captures the payment after the trip is saved', async () => {
    await book(bookParams);
    expect(StripeService.capture).toHaveBeenCalledWith('pi_123');
    // Capture happens after the DB write.
    const captureOrder = StripeService.capture.mock.invocationCallOrder[0];
    const createOrder = Trip.create.mock.invocationCallOrder[0];
    expect(captureOrder).toBeGreaterThan(createOrder);
  });

  it('calls provider book()', async () => {
    await book(bookParams);
    expect(flixbus.book).toHaveBeenCalledWith({ trip: tripPayload, passengers: bookParams.passengers });
  });

  it('saves the trip to the DB', async () => {
    await book(bookParams);
    expect(Trip.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        provider: 'flixbus',
        bookingRef: 'FB-001',
        priceEur: 18,
      }),
      expect.anything()
    );
  });

  it('throws 404 if user is not found', async () => {
    User.findById.mockResolvedValue(null);
    await expect(book(bookParams)).rejects.toMatchObject({ status: 404 });
  });

  it('throws 400 for an unknown provider before charging', async () => {
    await expect(book({ ...bookParams, trip: { ...tripPayload, provider: 'unknown' } }))
      .rejects.toMatchObject({ status: 400 });
    expect(StripeService.authorize).not.toHaveBeenCalled();
  });

  it('throws 402 if the payment cannot be authorized', async () => {
    StripeService.authorize.mockResolvedValue({ id: 'pi_123', status: 'requires_action' });
    await expect(book(bookParams)).rejects.toMatchObject({ status: 402 });
    expect(StripeService.capture).not.toHaveBeenCalled();
  });

  it('cancels the authorization and throws 502 when the provider booking fails', async () => {
    flixbus.book.mockRejectedValue(new Error('provider down'));
    await expect(book(bookParams)).rejects.toMatchObject({ status: 502 });
    expect(StripeService.cancel).toHaveBeenCalledWith('pi_123');
    expect(StripeService.capture).not.toHaveBeenCalled();
    expect(Trip.create).not.toHaveBeenCalled();
  });

  it('cancels the authorization if the DB write fails (never charged without a record)', async () => {
    Trip.create.mockRejectedValue(new Error('db down'));
    await expect(book(bookParams)).rejects.toThrow('db down');
    expect(StripeService.cancel).toHaveBeenCalledWith('pi_123');
    expect(StripeService.capture).not.toHaveBeenCalled();
  });
});
