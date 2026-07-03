const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middleware/errorHandler');
const healthRouter = require('./routes/health');
const authRouter = require('./routes/auth');
const connectionSearchRouter = require('./routes/connectionSearch');
const searchRouter = require('./routes/search');
const bookingRouter = require('./routes/booking');
const tripsRouter = require('./routes/trips');
const itineraryBookingRoutes = require('./routes/itineraryBooking');
const itinerariesRoutes = require('./routes/itineraries');

function createApp() {
  const app = express();
  // Behind a proxy/LB, honour X-Forwarded-For so rate limiters key on the real
  // client IP instead of lumping every user into one bucket.
  if (process.env.TRUST_PROXY) {
    const v = process.env.TRUST_PROXY;
    app.set('trust proxy', v === 'true' ? true : /^\d+$/.test(v) ? Number(v) : v);
  }
  app.use(helmet());
  const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:8081')
    .split(',')
    .map(o => o.trim());
  app.use(cors({ origin: corsOrigins, credentials: true }));
  app.use(express.json());

  const makeLimiter = (limit) =>
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit,
      standardHeaders: true,
      legacyHeaders: false,
      skip: () => process.env.NODE_ENV === 'test',
    });

  // Brute-force / credential-stuffing protection on auth endpoints.
  const authLimiter = makeLimiter(Number(process.env.AUTH_RATE_LIMIT || 50));
  // Search fans out to the paid Amadeus API; booking hits Stripe. Cap both.
  const searchLimiter = makeLimiter(Number(process.env.SEARCH_RATE_LIMIT || 120));
  const bookingLimiter = makeLimiter(Number(process.env.BOOKING_RATE_LIMIT || 30));

  app.use('/health', healthRouter);
  app.use('/auth', authLimiter, authRouter);
  app.use('/search/connections', searchLimiter, connectionSearchRouter);
  app.use('/search', searchLimiter, searchRouter);
  // The '/book' prefix limiter also covers '/book/itinerary'.
  app.use('/book', bookingLimiter, bookingRouter);
  app.use('/book/itinerary', itineraryBookingRoutes);
  app.use('/trips', tripsRouter);
  app.use('/itineraries', itinerariesRoutes);
  app.use(errorHandler);
  return app;
}

module.exports = createApp;
