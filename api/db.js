/**
 * Database Connection Module for PostgreSQL (Vercel Postgres, Supabase, Neon, etc.)
 */
const { Pool } = require('pg');

const connectionString = 
  process.env.POSTGRES_URL || 
  process.env.DATABASE_URL || 
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

let pool = null;

if (connectionString) {
  pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false // Required for cloud postgres like Supabase / Neon / Vercel
    },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
}

async function query(text, params) {
  if (!pool) {
    throw new Error("DATABASE_NOT_CONFIGURED: Belum ada POSTGRES_URL atau DATABASE_URL di Environment Variables Vercel.");
  }
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  // console.log('executed query', { text, duration, rows: res.rowCount });
  return res;
}

module.exports = {
  query,
  isConfigured: !!connectionString,
  pool
};
