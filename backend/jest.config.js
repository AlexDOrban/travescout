module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  // Suites share one test database and truncate tables in setup/teardown;
  // parallel workers clobber each other's data.
  maxWorkers: 1,
  setupFiles: ['<rootDir>/tests/setup.js'],
};
