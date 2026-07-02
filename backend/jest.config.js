module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  // Suites share one test database and truncate tables in setup/teardown;
  // parallel workers clobber each other's data.
  maxWorkers: 1,
  setupFiles: ['<rootDir>/tests/setup.js'],
  // Each suite leaves its pg pool open (module-scoped, no lifecycle hook owns it).
  forceExit: true,
};
