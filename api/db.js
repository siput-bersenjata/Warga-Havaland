/**
 * Database Connection Module for PostgreSQL (Vercel Postgres, Supabase, Neon, etc.)
 */
let Pool = null;
try {
  Pool = require('pg').Pool;
} catch (e) {
  // pg is listed in package.json and automatically installed during Vercel deployment
}

const connectionString = 
  process.env.POSTGRES_URL || 
  process.env.DATABASE_URL || 
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

let pool = null;

if (connectionString && Pool) {
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

// Jalankan fungsi dalam SATU transaksi pada SATU koneksi khusus.
// WAJIB dipakai untuk rangkaian multi-statement (mis. DELETE + INSERT di
// /api/sync) karena pool.query() biasa bisa memakai koneksi berbeda-beda.
// Aman untuk PgBouncer/Supavisor mode transaksi (Supabase pooler).
async function transaction(fn) {
  if (!pool) {
    throw new Error("DATABASE_NOT_CONFIGURED: Belum ada POSTGRES_URL atau DATABASE_URL di Environment Variables Vercel.");
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch (_) { /* abaikan */ }
    throw e;
  } finally {
    client.release();
  }
}

module.exports = {
  query,
  transaction,
  isConfigured: !!connectionString,
  pool
};
