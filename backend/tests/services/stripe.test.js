jest.mock('stripe');
const Stripe = require('stripe');

// The service caches a single Stripe client, so expose one shared mock client.
const mockCustomersCreate = jest.fn();
const mockIntentsCreate = jest.fn();
const mockIntentsCapture = jest.fn();
const mockIntentsCancel = jest.fn();
Stripe.mockImplementation(() => ({
  customers: { create: mockCustomersCreate },
  paymentIntents: {
    create: mockIntentsCreate,
    capture: mockIntentsCapture,
    cancel: mockIntentsCancel,
  },
}));

const { getOrCreateCustomer, authorize, capture, cancel } = require('../../src/services/stripe');

beforeEach(() => {
  mockCustomersCreate.mockReset();
  mockIntentsCreate.mockReset();
  mockIntentsCapture.mockReset();
  mockIntentsCancel.mockReset();
});

describe('getOrCreateCustomer', () => {
  it('returns existing customer ID without calling Stripe', async () => {
    const customerId = await getOrCreateCustomer('user-1', 'test@example.com', 'cus_existing');
    expect(customerId).toBe('cus_existing');
    expect(mockCustomersCreate).not.toHaveBeenCalled();
  });

  it('creates a new Stripe customer when none exists', async () => {
    mockCustomersCreate.mockResolvedValue({ id: 'cus_new_123' });

    const customerId = await getOrCreateCustomer('user-1', 'test@example.com', null);

    expect(customerId).toBe('cus_new_123');
    expect(mockCustomersCreate).toHaveBeenCalledWith({
      email: 'test@example.com',
      metadata: { userId: 'user-1' },
    });
  });
});

describe('authorize', () => {
  it('creates a manual-capture PaymentIntent with the correct amount in cents', async () => {
    mockIntentsCreate.mockResolvedValue({ id: 'pi_123', status: 'requires_capture' });

    await authorize({
      customerId: 'cus_123',
      paymentMethodId: 'pm_visa',
      amountEur: 18.50,
      description: 'Test booking',
    });

    expect(mockIntentsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 1850,
        currency: 'eur',
        customer: 'cus_123',
        payment_method: 'pm_visa',
        confirm: true,
        capture_method: 'manual',
      }),
      undefined
    );
  });

  it('passes an idempotency key when provided', async () => {
    mockIntentsCreate.mockResolvedValue({ id: 'pi_123', status: 'requires_capture' });

    await authorize({
      customerId: 'cus_123',
      paymentMethodId: 'pm_visa',
      amountEur: 10,
      description: 'Test',
      idempotencyKey: 'idem-abc',
    });

    expect(mockIntentsCreate).toHaveBeenCalledWith(
      expect.any(Object),
      { idempotencyKey: 'idem-abc' }
    );
  });

  it('throws when Stripe payment fails', async () => {
    mockIntentsCreate.mockRejectedValue(new Error('Card declined'));

    await expect(authorize({
      customerId: 'cus_123',
      paymentMethodId: 'pm_bad',
      amountEur: 18,
      description: 'Test',
    })).rejects.toThrow('Card declined');
  });
});

describe('capture', () => {
  it('captures the full amount when no amount is given', async () => {
    mockIntentsCapture.mockResolvedValue({ id: 'pi_123', status: 'succeeded' });

    await capture('pi_123');
    expect(mockIntentsCapture).toHaveBeenCalledWith('pi_123', {});
  });

  it('captures a partial amount in cents when given', async () => {
    mockIntentsCapture.mockResolvedValue({ id: 'pi_123', status: 'succeeded' });

    await capture('pi_123', 12.5);
    expect(mockIntentsCapture).toHaveBeenCalledWith('pi_123', { amount_to_capture: 1250 });
  });
});

describe('cancel', () => {
  it('cancels the payment intent', async () => {
    mockIntentsCancel.mockResolvedValue({ id: 'pi_123', status: 'canceled' });

    await cancel('pi_123');
    expect(mockIntentsCancel).toHaveBeenCalledWith('pi_123');
  });
});
