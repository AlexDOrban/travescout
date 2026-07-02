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
  app.use(helmet());
  const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:8081')
    .split(',')
    .map(o => o.trim());
  app.use(cors({ origin: corsOrigins, credentials: true }));
  app.use(express.json());

  // Brute-force / credential-stuffing protection on auth endpoints.
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: Number(process.env.AUTH_RATE_LIMIT || 50),
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
  });

  app.use('/health', healthRouter);
  app.use('/auth', authLimiter, authRouter);
  app.use('/search/connections', connectionSearchRouter);
  app.use('/search', searchRouter);
  app.use('/book', bookingRouter);
  app.use('/book/itinerary', itineraryBookingRoutes);
  app.use('/trips', tripsRouter);
  app.use('/itineraries', itinerariesRoutes);
  app.use(errorHandler);
  return app;
}

module.exports = createApp;
