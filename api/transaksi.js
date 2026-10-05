const db = require('./db');
const { validateToken, setCorsHeaders, handlePreflight, safeErrorResponse, validateStringLength, recordAuditLog } = require('./middleware/auth');

async function ensureTransaksiTable() {
  if (!db || !db.isConfigured) return;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS transaksi_kas (
        id VARCHAR(50) PRIMARY KEY,
        tanggal DATE NOT NULL,
        jenis VARCHAR(20) NOT NULL,
        kategori VARCHAR(100) NOT NULL,
        uraian TEXT NOT NULL,
        nominal BIGINT NOT NULL,
        metode VARCHAR(50) DEFAULT 'Transfer Mandiri',
        pj VARCHAR(100) DEFAULT 'Bendahara (Citra L.)',
        bukti VARCHAR(100),
        status VARCHAR(30) DEFAULT 'Verified',
        catatan TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_transaksi_tanggal ON transaksi_kas(tanggal DESC);
    `);
  } catch (err) {
    console.error('[Database ensureTransaksiTable Error]', err.message);
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  setCorsHeaders(res);

  if (handlePreflight(req, res)) return;

  await ensureTransaksiTable();

  if (req.method === 'GET') {
    if (!db.isConfigured) {
      return res.status(200).json({ success: true, isConfigured: false, data: [] });
    }
    try {
      const result = await db.query('SELECT * FROM transaksi_kas ORDER BY tanggal DESC, created_at DESC');
      return res.status(200).json({ success: true, isConfigured: true, data: result.rows });
    } catch (error) {
      return safeErrorResponse(res, 500, "Gagal mengambil data transaksi.", error);
    }
  }

  if (req.method === 'POST') {
    // Require authentication for write operations
    const authHeader = req.headers.authorization || req.headers['Authorization'] || req.headers['x-sync-token'];
    const user = validateToken(authHeader);
    if (!user) {
      return safeErrorResponse(res, 401, "Akses ditolak. Sesi login tidak ditemukan atau kedaluwarsa. Silakan login kembali.");
    }

    const isBendaharaOrAdmin = Boolean(user.isAdmin || user.isBendahara || user.role === 'Bendahara RT');
    if (!isBendaharaOrAdmin) {
      return safeErrorResponse(res, 403, "Akses ditolak. Hanya Administrator RT atau Bendahara RT yang berhak mencatat transaksi kas.");
    }

    if (!db.isConfigured) {
      return res.status(200).json({
        success: false,
        isConfigured: false,
        message: "Database belum terhubung di Vercel. Data disimpan di localStorage browser."
      });
    }

    try {
      const { id, tanggal, jenis, kategori, uraian, nominal, metode, pj, bukti, catatan } = req.body;

      // Input validation
      if (!uraian || !nominal || isNaN(nominal)) {
        return safeErrorResponse(res, 400, "Uraian dan nominal wajib diisi dengan benar.");
      }

      const nominalNum = parseInt(nominal, 10);
      if (nominalNum <= 0 || nominalNum > 999999999999) {
        return safeErrorResponse(res, 400, "Nominal tidak valid (harus antara 1 - 999.999.999.999).");
      }

      // Length validations
      const lengthErrors = [
        validateStringLength(uraian, 'Uraian', 500),
        validateStringLength(kategori, 'Kategori', 100),
        validateStringLength(metode, 'Metode', 50),
        validateStringLength(pj, 'Penanggung Jawab', 100),
        validateStringLength(bukti, 'Bukti', 100),
        validateStringLength(catatan, 'Catatan', 500),
      ].filter(Boolean);

      if (lengthErrors.length > 0) {
        return safeErrorResponse(res, 400, lengthErrors[0]);
      }

      // Validate jenis
      if (jenis && !['masuk', 'keluar'].includes(jenis)) {
        return safeErrorResponse(res, 400, "Jenis transaksi harus 'masuk' atau 'keluar'.");
      }

      const safeTanggal = tanggal || new Date().toISOString().slice(0, 10);
      const generatedId = id || `TRX-${safeTanggal.replace(/-/g, '').slice(0, 6)}-${Date.now().toString().slice(-3)}`;

      // Parameterized query for SQL Injection protection with UPSERT (idempotent)
      const insertQuery = `
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
        RETURNING *;
      `;

      const values = [
        generatedId,
        safeTanggal,
        jenis || 'masuk',
        kategori || 'Iuran Warga',
        uraian,
        nominalNum,
        metode || 'Transfer Mandiri',
        pj || user.nama,
        bukti || `KWT-${Date.now().toString().slice(-4)}`,
        'Verified',
        catatan || `Dicatat oleh ${user.nama} via Portal Havaland`
      ];

      const result = await db.query(insertQuery, values);
      const insertedRow = result.rows[0];

      // Mirror ke sync_store agar GET /api/sync selalu konsisten
      try {
        const syncItem = {
          id: generatedId,
          tanggal: safeTanggal,
          jenis: jenis || 'masuk',
          kategori: kategori || 'Iuran Warga',
          uraian,
          nominal: nominalNum,
          metode: metode || 'Transfer Mandiri',
          pj: pj || user.nama,
          bukti: bukti || `KWT-${Date.now().toString().slice(-4)}`,
          status: 'Verified',
          catatan: catatan || `Dicatat oleh ${user.nama} via Portal Havaland`
        };
        await db.query(`
          INSERT INTO sync_store (collection, id, data, updated_at)
          VALUES ('transaksi', $1, $2, NOW())
          ON CONFLICT (collection, id) DO UPDATE SET
            data = EXCLUDED.data,
            updated_at = NOW();
        `, [generatedId, JSON.stringify(syncItem)]);
      } catch (e) {
        // non-blocking
      }

      // Catat log aktivitas keuangan kas
      const clientIp = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '-').split(',')[0].trim();
      await recordAuditLog({
        username: user.username,
        nama: user.nama,
        role: user.role,
        aksi: (jenis === 'keluar' ? 'KAS_KELUAR' : 'KAS_MASUK'),
        kategori: 'Keuangan Kas',
        deskripsi: `Mencatat kas ${(jenis || 'masuk')}: "${uraian}" sebesar Rp ${nominalNum.toLocaleString('id-ID')} (Metode: ${metode || 'Transfer Mandiri'}).`,
        ip: clientIp
      });

      return res.status(201).json({
        success: true,
        message: "Transaksi kas berhasil disimpan ke database!",
        data: insertedRow
      });
    } catch (error) {
      return safeErrorResponse(res, 500, "Gagal menyimpan transaksi.", error);
    }
  }

  // DELETE: Hapus catatan transaksi kas
  if (req.method === 'DELETE') {
    const authHeader = req.headers.authorization || req.headers['Authorization'] || req.headers['x-sync-token'];
    const user = validateToken(authHeader);
    if (!user) {
      return safeErrorResponse(res, 401, "Akses ditolak. Sesi login tidak ditemukan atau kedaluwarsa.");
    }

    const isBendaharaOrAdmin = Boolean(user.isAdmin || user.isBendahara || user.role === 'Bendahara RT');
    if (!isBendaharaOrAdmin) {
      return safeErrorResponse(res, 403, "Akses ditolak. Hanya Administrator RT atau Bendahara RT yang berhak menghapus transaksi kas.");
    }

    const { id } = req.body || req.query || {};
    if (!id) {
      return safeErrorResponse(res, 400, "ID transaksi kas wajib disertakan.");
    }

    if (!db.isConfigured) {
      return res.status(200).json({ success: true, message: "Transaksi dihapus secara lokal." });
    }

    try {
      await db.query('DELETE FROM transaksi_kas WHERE id = $1', [id]);
      await db.query('DELETE FROM sync_store WHERE collection = $1 AND id = $2', ['transaksi', id]).catch(() => {});

      const clientIp = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '-').split(',')[0].trim();
      await recordAuditLog({
        username: user.username,
        nama: user.nama,
        role: user.role,
        aksi: 'HAPUS_KAS',
        kategori: 'Keuangan Kas',
        deskripsi: `Menghapus catatan transaksi kas nomor "${id}".`,
        ip: clientIp
      });

      return res.status(200).json({
        success: true,
        message: `Transaksi kas ${id} berhasil dihapus dari database.`
      });
    } catch (error) {
      return safeErrorResponse(res, 500, "Gagal menghapus transaksi dari database.", error);
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
};
