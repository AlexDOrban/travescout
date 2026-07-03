const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // In tests, let the process exit once connections go idle — no test file
  // owns the pool's lifecycle, so nothing else can close it deterministically.
  ...(process.env.NODE_ENV === 'test' ? { allowExitOnIdle: true, idleTimeoutMillis: 300 } : {}),
});

// An idle client error would otherwise be an unhandled 'error' emit and crash the process.
pool.on('error', (err) => {
  console.error('[db] idle client error', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  end: () => pool.end(),
};
