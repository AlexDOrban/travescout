#!/usr/bin/env node
// Minimal forward-only migration runner. Applies every migrations/*.sql not yet
// recorded in schema_migrations, in filename order, each in its own transaction.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function main() {
  const dir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         filename TEXT PRIMARY KEY,
         applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
       )`
    );
    const { rows } = await pool.query('SELECT filename FROM schema_migrations');
    const applied = new Set(rows.map(r => r.filename));

    let count = 0;
    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`applied ${file}`);
        count++;
      } catch (e) {
        await client.query('ROLLBACK').catch(() => {});
        throw new Error(`migration ${file} failed: ${e.message}`);
      } finally {
        client.release();
      }
    }
    console.log(count === 0 ? 'no pending migrations' : `applied ${count} migration(s)`);
  } finally {
    await pool.end();
  }
}

main().catch(e => {
  console.error(e.message);
  process.exit(1);
});
