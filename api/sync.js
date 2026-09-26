/**
 * Cloud Sync Endpoint — GET/POST /api/sync
 *
 * Satu-satunya jalan agar data SAMA di semua HP/laptop admin & warga:
 * seluruh koleksi (transaksi, kegiatan, warga, aspirasi, usulan, slide,
 * kontak) disimpan sebagai snapshot penuh di SATU tabel Postgres:
 *
 *   sync_store(collection TEXT, id TEXT, data JSONB,
 *              updated_at TIMESTAMPTZ DEFAULT NOW(),
 *              PRIMARY KEY(collection, id))
 *
 * - GET  (publik, tanpa login): baca snapshot. ?collection=nama atau semua.
 * - POST (khusus admin, token stateless X-Sync-Token/Bearer): ganti SELURUH
 *   isi satu koleksi (replace-all dalam transaksi) → tambah, ubah, dan HAPUS
 *   ikut tersinkron. Kebijakan konflik: last-write-wins per koleksi.
 *
 * Tabel dibuat otomatis (CREATE TABLE IF NOT EXISTS) sehingga tidak perlu
 * menjalankan schema manual — cukup pasang POSTGRES_URL/DATABASE_URL di
 * Environment Variables Vercel. Tanpa database, endpoint menjawab
 * { connected:false } dan aplikasi berjalan murni lokal (localStorage).
 */
const db = require('./db');
const { validateSyncToken, setCorsHeaders, handlePreflight, safeErrorResponse } = require('./middleware/auth');

const COLLECTIONS = ['transaksi', 'kegiatan', 'warga', 'aspirasi', 'usulan', 'slides', 'kontak'];
const MAX_ITEMS = 2000;

async function ensureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS sync_store (
      collection TEXT NOT NULL,
      id TEXT NOT NULL,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (collection, id)
    )
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_sync_store_collection ON sync_store (collection)`);
}

function toClientItems(rows) {
  return (rows || []).map(r => {
    const data = r.data && typeof r.data === 'object' ? r.data : {};
    if (!data.id && r.id) data.id = r.id;
    return data;
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  setCorsHeaders(res);

  if (handlePreflight(req, res)) return;

  if (!db.isConfigured) {
    return res.status(200).json({
      connected: false,
      message: "Database belum dikonfigurasi. Tambahkan POSTGRES_URL/DATABASE_URL di Vercel agar sinkron antar-device aktif.",
      source: "local"
    });
  }

  // =====================================================
  // GET: baca snapshot (publik — data portal memang transparan)
  // =====================================================
  if (req.method === 'GET') {
    try {
      await ensureTable();
      const name = req.query && req.query.collection;

      if (name) {
        if (!COLLECTIONS.includes(name)) {
          return safeErrorResponse(res, 400, "Nama koleksi tidak dikenal.");
        }
        const result = await db.query(
          'SELECT id, data FROM sync_store WHERE collection = $1 ORDER BY updated_at ASC',
          [name]
        );
        return res.status(200).json({
          connected: true,
          source: 'postgres',
          collection: name,
          count: result.rows.length,
          items: toClientItems(result.rows)
        });
      }

      const result = await db.query('SELECT collection, id, data FROM sync_store ORDER BY collection ASC, updated_at ASC');
      const grouped = {};
      COLLECTIONS.forEach(c => { grouped[c] = []; });
      result.rows.forEach(r => {
        if (!grouped[r.collection]) grouped[r.collection] = [];
        const data = r.data && typeof r.data === 'object' ? r.data : {};
        if (!data.id && r.id) data.id = r.id;
        grouped[r.collection].push(data);
      });
      return res.status(200).json({ connected: true, source: 'postgres', collections: grouped });
    } catch (error) {
      return safeErrorResponse(res, 500, "Gagal membaca data cloud.", error);
    }
  }

  // =====================================================
  // POST: ganti seluruh koleksi (khusus admin)
  // =====================================================
  if (req.method === 'POST') {
    if (!db.isConfigured) {
      return res.status(200).json({
        connected: false,
        success: false,
        message: "Database belum dikonfigurasi. Data tersimpan lokal saja."
      });
    }

    const syncHeader = req.headers['x-sync-token'] || req.headers['X-Sync-Token'] ||
      req.headers.authorization || req.headers['Authorization'];
    const syncUser = validateSyncToken(syncHeader);

    if (!syncUser) {
      return safeErrorResponse(res, 401, "Sesi sinkronisasi tidak valid. Silakan login ulang sebagai admin.");
    }
    if (!syncUser.isAdmin) {
      return safeErrorResponse(res, 403, "Hanya Administrator RT yang boleh menulis data cloud.");
    }

    const { collection, items } = req.body || {};
    if (!collection || !COLLECTIONS.includes(collection)) {
      return safeErrorResponse(res, 400, "Nama koleksi tidak dikenal.");
    }
    if (!Array.isArray(items)) {
      return safeErrorResponse(res, 400, "Items harus berupa array.");
    }
    if (items.length > MAX_ITEMS) {
      return safeErrorResponse(res, 400, `Terlalu banyak item (maks ${MAX_ITEMS}).`);
    }

    // Normalisasi: setiap item wajib punya id string
    const clean = [];
    for (const it of items) {
      if (!it || typeof it !== 'object') continue;
      const id = String(it.id || '').slice(0, 120);
      if (!id) continue;
      clean.push({ id, data: it });
    }

    try {
      await ensureTable();
      await db.query('BEGIN');
      try {
        await db.query('DELETE FROM sync_store WHERE collection = $1', [collection]);
        for (const row of clean) {
          await db.query(
            'INSERT INTO sync_store (collection, id, data, updated_at) VALUES ($1, $2, $3, NOW())',
            [collection, row.id, JSON.stringify(row.data)]
          );
        }
        await db.query('COMMIT');
      } catch (e) {
        try { await db.query('ROLLBACK'); } catch (_) { /* abaikan */ }
        throw e;
      }

      return res.status(200).json({
        connected: true,
        success: true,
        collection,
        count: clean.length,
        message: `Koleksi ${collection} tersinkron (${clean.length} item) atas nama ${syncUser.username}.`
      });
    } catch (error) {
      return safeErrorResponse(res, 500, "Gagal menyimpan data cloud.", error);
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
};
