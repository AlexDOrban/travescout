jest.mock('stripe');
const Stripe = require('stripe');
const { getOrCreateCustomer, charge } = require('../../src/services/stripe');

beforeEach(() => {
  Stripe.mockClear();
});

describe('getOrCreateCustomer', () => {
  it('returns existing customer ID without calling Stripe', async () => {
    const customerId = await getOrCreateCustomer('user-1', 'test@example.com', 'cus_existing');
    expect(customerId).toBe('cus_existing');
    expect(Stripe).not.toHaveBeenCalled();
  });

  it('creates a new Stripe customer when none exists', async () => {
    const mockCreate = jest.fn().mockResolvedValue({ id: 'cus_new_123' });
    Stripe.mockImplementation(() => ({ customers: { create: mockCreate } }));

    const customerId = await getOrCreateCustomer('user-1', 'test@example.com', null);

    expect(customerId).toBe('cus_new_123');
    expect(mockCreate).toHaveBeenCalledWith({
      email: 'test@example.com',
      metadata: { userId: 'user-1' },
    });
  });
});

describe('charge', () => {
  it('creates a PaymentIntent with the correct amount in cents', async () => {
    const mockCreate = jest.fn().mockResolvedValue({ id: 'pi_123', status: 'succeeded' });
    Stripe.mockImplementation(() => ({ paymentIntents: { create: mockCreate } }));

    await charge({
      customerId: 'cus_123',
      paymentMethodId: 'pm_visa',
      amountEur: 18.50,
      description: 'Test booking',
    });

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      amount: 1850,
      currency: 'eur',
      customer: 'cus_123',
      payment_method: 'pm_visa',
      confirm: true,
    }));
  });

  it('throws when Stripe payment fails', async () => {
    Stripe.mockImplementation(() => ({
      paymentIntents: { create: jest.fn().mockRejectedValue(new Error('Card declined')) },
    }));

    await expect(charge({
      customerId: 'cus_123',
      paymentMethodId: 'pm_bad',
      amountEur: 18,
      description: 'Test',
    })).rejects.toThrow('Card declined');
  });
});
