const Stripe = require('stripe');

// Single client: avoids per-request client construction.
let client;
function getClient() {
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

async function getOrCreateCustomer(userId, email, existingStripeCustomerId) {
  if (existingStripeCustomerId) return existingStripeCustomerId;

  const customer = await getClient().customers.create({
    email,
    metadata: { userId },
  });
  return customer.id;
}

// Manual capture: funds are only authorized here; capture() takes them after
// the booking is persisted, cancel() releases them if it fails.
// idempotencyKey is namespaced per user by the caller so one user's key can
// never collide with another's account-scoped Stripe key.
async function authorize({ customerId, paymentMethodId, amountEur, description, idempotencyKey }) {
  const intent = await getClient().paymentIntents.create(
    {
      amount: Math.round(amountEur * 100), // cents
      currency: 'eur',
      customer: customerId,
      payment_method: paymentMethodId,
      description,
      confirm: true,
      capture_method: 'manual',
      return_url: process.env.STRIPE_RETURN_URL || 'https://travescout.app/booking/confirm',
    },
    idempotencyKey ? { idempotencyKey } : undefined
  );
  return intent;
}

async function capture(intentId, amountEur) {
  const params = amountEur != null ? { amount_to_capture: Math.round(amountEur * 100) } : {};
  return getClient().paymentIntents.capture(intentId, params);
}

async function cancel(intentId) {
  return getClient().paymentIntents.cancel(intentId);
}

async function refund(intentId, amountEur) {
  const params = { payment_intent: intentId };
  if (amountEur != null) params.amount = Math.round(amountEur * 100);
  return getClient().refunds.create(params);
}

module.exports = { getOrCreateCustomer, authorize, capture, cancel, refund };
