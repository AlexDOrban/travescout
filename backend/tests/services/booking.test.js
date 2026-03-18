jest.mock('../../src/models/user');
jest.mock('../../src/models/trip');
jest.mock('../../src/services/stripe');
jest.mock('../../src/providers/flixbus');
jest.mock('../../src/providers/rail');
jest.mock('../../src/providers/amadeus');

const User = require('../../src/models/user');
const Trip = require('../../src/models/trip');
const StripeService = require('../../src/services/stripe');
const flixbus = require('../../src/providers/flixbus');
const { book } = require('../../src/services/booking');

const tripPayload = {
  provider: 'flixbus',
  origin: 'LON',
  destination: 'PAR',
  departAt: '2026-04-15T06:30:00Z',
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
  User.findById.mockResolvedValue({ id: 'user-1', email: 'test@example.com', stripe_customer_id: null });
  User.setStripeCustomerId.mockResolvedValue();
  StripeService.getOrCreateCustomer.mockResolvedValue('cus_123');
  StripeService.charge.mockResolvedValue({ id: 'pi_123', status: 'succeeded' });
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

  it('charges Stripe with the correct amount', async () => {
    await book(bookParams);
    expect(StripeService.charge).toHaveBeenCalledWith(expect.objectContaining({
      customerId: 'cus_123',
      paymentMethodId: 'pm_card_visa',
      amountEur: 18,
    }));
  });

  it('calls provider book()', async () => {
    await book(bookParams);
    expect(flixbus.book).toHaveBeenCalledWith({ trip: tripPayload, passengers: bookParams.passengers });
  });

  it('saves the trip to the DB', async () => {
    await book(bookParams);
    expect(Trip.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      provider: 'flixbus',
      bookingRef: 'FB-001',
      priceEur: 18,
    }));
  });

  it('throws 404 if user is not found', async () => {
    User.findById.mockResolvedValue(null);
    await expect(book(bookParams)).rejects.toMatchObject({ status: 404 });
  });

  it('throws 400 for an unknown provider', async () => {
    await expect(book({ ...bookParams, trip: { ...tripPayload, provider: 'unknown' } }))
      .rejects.toMatchObject({ status: 400 });
  });

  it('throws 402 if payment intent status is not succeeded', async () => {
    StripeService.charge.mockResolvedValue({ id: 'pi_123', status: 'requires_action' });
    await expect(book(bookParams)).rejects.toMatchObject({ status: 402 });
  });
});
