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

// Run fn inside a single transaction. fn receives an executor ({ query })
// bound to the same client, so every write commits or rolls back together.
async function withTransaction(fn) {
  const client = await pool.connect();
  const executor = { query: (text, params) => client.query(text, params) };
  try {
    await client.query('BEGIN');
    const result = await fn(executor);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  withTransaction,
  end: () => pool.end(),
};
