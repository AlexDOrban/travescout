const express = require('express');
const errorHandler = require('./middleware/errorHandler');
const healthRouter = require('./routes/health');
const authRouter = require('./routes/auth');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/health', healthRouter);
  app.use('/auth', authRouter);
  app.use(errorHandler);
  return app;
}

module.exports = createApp;
