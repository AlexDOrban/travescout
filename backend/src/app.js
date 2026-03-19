const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');
const healthRouter = require('./routes/health');
const authRouter = require('./routes/auth');
const connectionSearchRouter = require('./routes/connectionSearch');
const searchRouter = require('./routes/search');
const bookingRouter = require('./routes/booking');
const tripsRouter = require('./routes/trips');

function createApp() {
  const app = express();
  app.use(cors({ origin: 'http://localhost:8081', credentials: true }));
  app.use(express.json());
  app.use('/health', healthRouter);
  app.use('/auth', authRouter);
  app.use('/search/connections', connectionSearchRouter);
  app.use('/search', searchRouter);
  app.use('/book', bookingRouter);
  app.use('/trips', tripsRouter);
  app.use(errorHandler);
  return app;
}

module.exports = createApp;
