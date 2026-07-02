function errorHandler(err, _req, res, _next) {
  // Stripe SDK errors carry statusCode/type instead of status.
  if (err.type === 'StripeCardError') {
    return res.status(402).json({ error: err.message || 'Your card was declined' });
  }
  if (err.type && err.type.startsWith('Stripe') && err.statusCode && err.statusCode < 500) {
    return res.status(402).json({ error: 'Payment could not be processed' });
  }

  const status = err.status || err.statusCode || 500;
  if (status >= 500) {
    console.error('[error]', err);
    return res.status(status).json({ error: 'Internal server error' });
  }
  res.status(status).json({ error: err.message || 'An error occurred' });
}

module.exports = errorHandler;
