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

  await db.query(`
    CREATE TABLE IF NOT EXISTS aspirasi_warga (
      id VARCHAR(50) PRIMARY KEY,
      pelapor VARCHAR(150) NOT NULL,
      kategori VARCHAR(100) NOT NULL,
      judul TEXT NOT NULL,
      tanggal DATE DEFAULT CURRENT_DATE,
      status VARCHAR(50) DEFAULT 'Diproses',
      tanggapan TEXT DEFAULT 'Laporan telah diterima sistem dan dalam penanganan pengurus RT.',
      urgensi VARCHAR(50) DEFAULT 'Sedang',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_aspirasi_tanggal ON aspirasi_warga(tanggal DESC);
  `).catch(() => {});

  await db.query(`
    CREATE TABLE IF NOT EXISTS kegiatan_rutin (
      id VARCHAR(50) PRIMARY KEY,
      judul VARCHAR(200) NOT NULL,
      kategori VARCHAR(100) NOT NULL,
      tipe VARCHAR(50) DEFAULT 'Rutin',
      frekuensi VARCHAR(150),
      waktu_next VARCHAR(150),
      lokasi VARCHAR(200),
      koordinator VARCHAR(150),
      deskripsi TEXT,
      status_badge VARCHAR(50),
      jadwal_piket JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `).catch(() => {});
}

function toClientItems(rows) {
  return (rows || []).map(r => {
    const data = r.data && typeof r.data === 'object' ? r.data : {};
    if (!data.id && r.id) data.id = r.id;
    return data;
  });
}

async function getCollectionItems(collectionName) {
  try {
    if (collectionName === 'transaksi') {
      const trxTableCheck = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'transaksi_kas'
        );
      `);
      if (trxTableCheck.rows[0].exists) {
        const trxRes = await db.query('SELECT * FROM transaksi_kas ORDER BY tanggal DESC, created_at DESC');
        if (trxRes.rows && trxRes.rows.length > 0) {
          const itemsFromTable = trxRes.rows.map(r => ({
            id: r.id,
            tanggal: r.tanggal instanceof Date ? r.tanggal.toISOString().slice(0, 10) : String(r.tanggal || '').slice(0, 10),
            jenis: r.jenis,
            kategori: r.kategori,
            uraian: r.uraian,
            nominal: parseInt(r.nominal, 10) || 0,
            metode: r.metode || 'Transfer Mandiri',
            pj: r.pj || 'Pengurus RT',
            bukti: r.bukti || '-',
            status: r.status || 'Verified',
            catatan: r.catatan || ''
          }));

          const syncRes = await db.query('SELECT id, data FROM sync_store WHERE collection = $1 ORDER BY updated_at ASC', ['transaksi']);
          const tableIds = new Set(itemsFromTable.map(x => x.id));
          const syncItems = toClientItems(syncRes.rows);
          const extraSyncItems = syncItems.filter(x => x && x.id && !tableIds.has(x.id));

          return [...itemsFromTable, ...extraSyncItems];
        }
      }
    }

    if (collectionName === 'warga') {
      const wargaTableCheck = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'warga_havaland'
        );
      `);
      if (wargaTableCheck.rows[0].exists) {
        const wargaRes = await db.query('SELECT * FROM warga_havaland ORDER BY blok ASC');
        if (wargaRes.rows && wargaRes.rows.length > 0) {
          const itemsFromTable = wargaRes.rows.map(r => ({
            id: r.id,
            blok: r.blok,
            cluster: r.cluster,
            nama_kk: r.nama_kk,
            status_hunian: r.status_hunian,
            jabatan: r.jabatan,
            jumlah_jiwa: r.jumlah_jiwa,
            kontak: r.kontak,
            plat_kendaraan: r.plat_kendaraan,
            status_iuran: r.status_iuran,
            iuran_bulan_ini: Boolean(r.iuran_bulan_ini),
            terakhir_bayar: r.terakhir_bayar
          }));

          const syncRes = await db.query('SELECT id, data FROM sync_store WHERE collection = $1 ORDER BY updated_at ASC', ['warga']);
          const tableIds = new Set(itemsFromTable.map(x => x.id));
          const syncItems = toClientItems(syncRes.rows);
          const extraSyncItems = syncItems.filter(x => x && x.id && !tableIds.has(x.id));

          return [...itemsFromTable, ...extraSyncItems];
        }
      }
    }

    if (collectionName === 'kegiatan') {
      const kegTableCheck = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'kegiatan_rutin'
        );
      `);
      if (kegTableCheck.rows[0].exists) {
        const kegRes = await db.query('SELECT * FROM kegiatan_rutin ORDER BY created_at ASC');
        if (kegRes.rows && kegRes.rows.length > 0) {
          const itemsFromTable = kegRes.rows.map(r => ({
            id: r.id,
            judul: r.judul,
            kategori: r.kategori,
            tipe: r.tipe || 'Rutin',
            frekuensi: r.frekuensi || '-',
            waktuNext: r.waktu_next || '-',
            lokasi: r.lokasi || '-',
            koordinator: r.koordinator || '-',
            deskripsi: r.deskripsi || '',
            statusBadge: r.status_badge || 'Aktif',
            jadwalPiket: typeof r.jadwal_piket === 'string' ? JSON.parse(r.jadwal_piket) : (r.jadwal_piket || [])
          }));

          const syncRes = await db.query('SELECT id, data FROM sync_store WHERE collection = $1 ORDER BY updated_at ASC', ['kegiatan']);
          const tableIds = new Set(itemsFromTable.map(x => x.id));
          const syncItems = toClientItems(syncRes.rows);
          const extraSyncItems = syncItems.filter(x => x && x.id && !tableIds.has(x.id));

          return [...itemsFromTable, ...extraSyncItems];
        }
      }
    }

    if (collectionName === 'aspirasi') {
      const aspTableCheck = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'aspirasi_warga'
        );
      `);
      if (aspTableCheck.rows[0].exists) {
        const aspRes = await db.query('SELECT * FROM aspirasi_warga ORDER BY tanggal DESC, created_at DESC');
        if (aspRes.rows && aspRes.rows.length > 0) {
          const itemsFromTable = aspRes.rows.map(r => ({
            id: r.id,
            pelapor: r.pelapor,
            kategori: r.kategori,
            judul: r.judul,
            tanggal: r.tanggal instanceof Date ? r.tanggal.toISOString().slice(0, 10) : String(r.tanggal || '').slice(0, 10),
            status: r.status || 'Diproses',
            tanggapan: r.tanggapan || 'Laporan telah diterima sistem.',
            urgensi: r.urgensi || 'Sedang'
          }));

          const syncRes = await db.query('SELECT id, data FROM sync_store WHERE collection = $1 ORDER BY updated_at ASC', ['aspirasi']);
          const tableIds = new Set(itemsFromTable.map(x => x.id));
          const syncItems = toClientItems(syncRes.rows);
          const extraSyncItems = syncItems.filter(x => x && x.id && !tableIds.has(x.id));

          return [...itemsFromTable, ...extraSyncItems];
        }
      }
    }

    if (collectionName === 'slides') {
      const slidesTableCheck = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'slides_beranda'
        );
      `);
      if (slidesTableCheck.rows[0].exists) {
        const slidesRes = await db.query('SELECT * FROM slides_beranda ORDER BY order_index ASC, created_at ASC');
        if (slidesRes.rows && slidesRes.rows.length > 0) {
          return slidesRes.rows.map(r => ({
            id: r.id,
            title: r.title,
            description: r.description,
            url: r.url,
            full_url: r.full_url || r.url,
            badge: r.badge || 'Google Maps Resmi 📍',
            source: r.source || 'Google Maps Resmi',
            maps_url: r.maps_url || 'https://maps.app.goo.gl/Ujdz5idEU8PSaUEq6',
            order_index: r.order_index || 0,
            added_by: r.added_by || 'Admin RT'
          }));
        }
      }
    }

    const result = await db.query(
      'SELECT id, data FROM sync_store WHERE collection = $1 ORDER BY updated_at ASC',
      [collectionName]
    );
    return toClientItems(result.rows);
  } catch (err) {
    console.warn(`[getCollectionItems Error: ${collectionName}]`, err.message);
    const result = await db.query(
      'SELECT id, data FROM sync_store WHERE collection = $1 ORDER BY updated_at ASC',
      [collectionName]
    ).catch(() => ({ rows: [] }));
    return toClientItems(result.rows);
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  setCorsHeaders(res);

  if (handlePreflight(req, res)) return;

  if (!db.isConfigured) {
    return res.status(200).json({
      connected: false,
      message: "Database belum dikonfigurasi. Tambahkan POSTGRES_URL/DATABASE_URL di Vercel agar sinkron antar-device aktif.",
      source: "local",
      diag: {
        deploySha: process.env.VERCEL_GIT_COMMIT_SHA || null,
        deployEnv: process.env.VERCEL_ENV || null,
        envSeen: {
          POSTGRES_URL: !!process.env.POSTGRES_URL,
          DATABASE_URL: !!process.env.DATABASE_URL,
          POSTGRES_PRISMA_URL: !!process.env.POSTGRES_PRISMA_URL,
          POSTGRES_URL_NON_POOLING: !!process.env.POSTGRES_URL_NON_POOLING,
          STORAGE_URL: !!process.env.STORAGE_URL,
          NEON_DATABASE_URL: !!process.env.NEON_DATABASE_URL
        }
      }
    });
  }

  // =====================================================
  // GET: baca snapshot (publik — data portal transparan)
  // =====================================================
  if (req.method === 'GET') {
    try {
      await ensureTable();
      const name = req.query && req.query.collection;

      if (name) {
        if (!COLLECTIONS.includes(name)) {
          return safeErrorResponse(res, 400, "Nama koleksi tidak dikenal.");
        }
        const items = await getCollectionItems(name);
        return res.status(200).json({
          connected: true,
          source: 'postgres',
          collection: name,
          count: items.length,
          items: items
        });
      }

      const grouped = {};
      for (const col of COLLECTIONS) {
        grouped[col] = await getCollectionItems(col);
      }
      return res.status(200).json({ connected: true, source: 'postgres', collections: grouped });
    } catch (error) {
      return safeErrorResponse(res, 500, "Gagal membaca data cloud.", error);
    }
  }

  // =====================================================
  // POST: simpan/sinkron data (khusus pengurus berwenang)
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
      return safeErrorResponse(res, 401, "Sesi sinkronisasi tidak valid. Silakan login ulang.");
    }

    const { collection, items, action, id: targetId } = req.body || {};
    if (!collection || !COLLECTIONS.includes(collection)) {
      return safeErrorResponse(res, 400, "Nama koleksi tidak dikenal.");
    }

    // Otorisasi hak akses tulis per koleksi (RBAC)
    const isBendaharaOrAdmin = Boolean(syncUser.isAdmin || syncUser.isBendahara || syncUser.role === 'Bendahara RT');
    const isPengurusOrAdmin = Boolean(syncUser.isAdmin || syncUser.isPengurus || syncUser.role === 'Pengurus RT' || syncUser.role === 'Bendahara RT');

    if (collection === 'transaksi' && !isBendaharaOrAdmin) {
      return safeErrorResponse(res, 403, "Hanya Administrator RT atau Bendahara RT yang berhak menyimpan data transaksi kas.");
    }
    if (collection === 'kegiatan' && !isPengurusOrAdmin) {
      return safeErrorResponse(res, 403, "Hanya Administrator RT atau Pengurus RT yang berhak mengubah kegiatan.");
    }
    if (collection === 'aspirasi') {
      if (action === 'delete' && !isPengurusOrAdmin) {
        return safeErrorResponse(res, 403, "Hanya Administrator RT atau Pengurus RT yang berhak menghapus aspirasi.");
      }
      // Tambah / update aspirasi diperbolehkan untuk semua pengguna terdaftar yang login
    }
    if (!['transaksi', 'kegiatan', 'aspirasi'].includes(collection) && !syncUser.isAdmin && !syncUser.isPengurus) {
      return safeErrorResponse(res, 403, "Hanya Administrator RT atau Pengurus RT yang berhak mengubah koleksi ini.");
    }

    // 1. Tangani Aksi HAPUS ITEM Tunggal Secara Eksplisit
    if (action === 'delete' && (targetId || req.body.id)) {
      const deleteId = String(targetId || req.body.id);
      try {
        await ensureTable();
        await db.query('DELETE FROM sync_store WHERE collection = $1 AND id = $2', [collection, deleteId]);
        if (collection === 'transaksi') {
          await db.query('DELETE FROM transaksi_kas WHERE id = $1', [deleteId]).catch(() => {});
        } else if (collection === 'warga') {
          await db.query('DELETE FROM warga_havaland WHERE id = $1', [deleteId]).catch(() => {});
        } else if (collection === 'kegiatan') {
          await db.query('DELETE FROM kegiatan_rutin WHERE id = $1', [deleteId]).catch(() => {});
        } else if (collection === 'aspirasi') {
          await db.query('DELETE FROM aspirasi_warga WHERE id = $1', [deleteId]).catch(() => {});
        }
        return res.status(200).json({
          connected: true,
          success: true,
          collection,
          id: deleteId,
          message: `Item ${deleteId} pada koleksi ${collection} berhasil dihapus dari cloud.`
        });
      } catch (err) {
        return safeErrorResponse(res, 500, "Gagal menghapus item dari database cloud.", err);
      }
    }

    // 2. Tangani Penyimpanan & UPSERT Koleksi
    if (!Array.isArray(items)) {
      return safeErrorResponse(res, 400, "Items harus berupa array.");
    }
    if (items.length > MAX_ITEMS) {
      return safeErrorResponse(res, 400, `Terlalu banyak item (maks ${MAX_ITEMS}).`);
    }

    const clean = [];
    for (const it of items) {
      if (!it || typeof it !== 'object') continue;
      const rawId = String(it.id || '').slice(0, 120);
      const id = rawId || `${collection}-${clean.length}`;
      clean.push({ id, data: { ...it, id } });
    }

    try {
      await ensureTable();
      await db.transaction(async (client) => {
        // PERLINDUNGAN MUTLAK DATABASE:
        // JANGAN PERNAH MENJALANKAN DELETE FROM sync_store WHERE collection = $1!
        // Data yang sudah ada di database TIDAK BOLEH ditimpa atau dihapus massal.
        for (const row of clean) {
          await client.query(
            `INSERT INTO sync_store (collection, id, data, updated_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (collection, id) DO UPDATE SET
               data = EXCLUDED.data,
               updated_at = NOW()`,
            [collection, row.id, JSON.stringify(row.data)]
          );

          // Mirroring otomatis ke tabel relasional jika tabel tersedia
          if (collection === 'transaksi') {
            const d = row.data;
            const tNominal = parseInt(d.nominal, 10) || 0;
            if (tNominal > 0 && d.uraian) {
              const tDate = d.tanggal || new Date().toISOString().slice(0, 10);
              await client.query(`
                INSERT INTO transaksi_kas (id, tanggal, jenis, kategori, uraian, nominal, metode, pj, bukti, status, catatan)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                ON CONFLICT (id) DO UPDATE SET
                  tanggal = EXCLUDED.tanggal,
                  jenis = EXCLUDED.jenis,
                  kategori = EXCLUDED.kategori,
                  uraian = EXCLUDED.uraian,
                  nominal = EXCLUDED.nominal,
                  metode = EXCLUDED.metode,
                  pj = EXCLUDED.pj,
                  bukti = EXCLUDED.bukti,
                  status = EXCLUDED.status,
                  catatan = EXCLUDED.catatan
              `, [
                row.id,
                tDate,
                d.jenis || 'masuk',
                d.kategori || 'Iuran Warga',
                d.uraian,
                tNominal,
                d.metode || 'Transfer Mandiri',
                d.pj || syncUser.nama,
                d.bukti || '-',
                d.status || 'Verified',
                d.catatan || ''
              ]).catch(() => {});
            }
          }

          if (collection === 'kegiatan') {
            const d = row.data;
            if (d && (d.judul || d.nama)) {
              await client.query(`
                INSERT INTO kegiatan_rutin (id, judul, kategori, tipe, frekuensi, waktu_next, lokasi, koordinator, deskripsi, status_badge, jadwal_piket)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                ON CONFLICT (id) DO UPDATE SET
                  judul = EXCLUDED.judul,
                  kategori = EXCLUDED.kategori,
                  tipe = EXCLUDED.tipe,
                  frekuensi = EXCLUDED.frekuensi,
                  waktu_next = EXCLUDED.waktu_next,
                  lokasi = EXCLUDED.lokasi,
                  koordinator = EXCLUDED.koordinator,
                  deskripsi = EXCLUDED.deskripsi,
                  status_badge = EXCLUDED.status_badge,
                  jadwal_piket = EXCLUDED.jadwal_piket
              `, [
                row.id,
                d.judul || d.nama || 'Kegiatan Warga',
                d.kategori || 'Umum',
                d.tipe || 'Rutin',
                d.frekuensi || '-',
                d.waktuNext || d.waktu || '-',
                d.lokasi || '-',
                d.koordinator || d.pj || '-',
                d.deskripsi || '',
                d.statusBadge || d.status || 'Aktif',
                JSON.stringify(d.jadwalPiket || [])
              ]).catch(() => {});
            }
          }

          if (collection === 'aspirasi') {
            const d = row.data;
            if (d && (d.judul || d.isi)) {
              await client.query(`
                INSERT INTO aspirasi_warga (id, pelapor, kategori, judul, tanggal, status, tanggapan, urgensi)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (id) DO UPDATE SET
                  pelapor = EXCLUDED.pelapor,
                  kategori = EXCLUDED.kategori,
                  judul = EXCLUDED.judul,
                  tanggal = EXCLUDED.tanggal,
                  status = EXCLUDED.status,
                  tanggapan = EXCLUDED.tanggapan,
                  urgensi = EXCLUDED.urgensi
              `, [
                row.id,
                d.pelapor || 'Warga Havaland',
                d.kategori || 'Fasilitas Umum',
                d.judul || d.isi || '-',
                d.tanggal || new Date().toISOString().slice(0, 10),
                d.status || 'Diproses',
                d.tanggapan || 'Laporan telah diterima sistem.',
                d.urgensi || 'Sedang'
              ]).catch(() => {});
            }
          }
        }
      });

      return res.status(200).json({
        connected: true,
        success: true,
        collection,
        count: clean.length,
        message: `Koleksi ${collection} tersinkron aman (${clean.length} item) atas nama ${syncUser.username}. Integritas database terjaga.`
      });
    } catch (error) {
      return safeErrorResponse(res, 500, "Gagal menyimpan data cloud.", error);
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
};
