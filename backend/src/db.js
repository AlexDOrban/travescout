const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// An idle client error would otherwise be an unhandled 'error' emit and crash the process.
pool.on('error', (err) => {
  console.error('[db] idle client error', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  end: () => pool.end(),
};
