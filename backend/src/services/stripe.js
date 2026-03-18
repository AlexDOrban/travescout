const Stripe = require('stripe');

async function getOrCreateCustomer(userId, email, existingStripeCustomerId) {
  if (existingStripeCustomerId) return existingStripeCustomerId;

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  });
  return customer.id;
}

async function charge({ customerId, paymentMethodId, amountEur, description }) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const intent = await stripe.paymentIntents.create({
    amount: Math.round(amountEur * 100), // cents
    currency: 'eur',
    customer: customerId,
    payment_method: paymentMethodId,
    description,
    confirm: true,
    return_url: process.env.STRIPE_RETURN_URL || 'https://travescout.app/booking/confirm',
  });
  return intent;
}

module.exports = { getOrCreateCustomer, charge };
