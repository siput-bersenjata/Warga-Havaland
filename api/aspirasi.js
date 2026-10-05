const db = require('./db');
const { validateToken, setCorsHeaders, handlePreflight, safeErrorResponse, validateStringLength } = require('./middleware/auth');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  setCorsHeaders(res);

  if (handlePreflight(req, res)) return;

  if (req.method === 'GET') {
    if (!db.isConfigured) {
      return res.status(200).json({ success: true, isConfigured: false, data: [] });
    }
    try {
      const result = await db.query('SELECT * FROM aspirasi_warga ORDER BY tanggal DESC, created_at DESC');
      return res.status(200).json({ success: true, isConfigured: true, data: result.rows });
    } catch (error) {
      return safeErrorResponse(res, 500, "Gagal mengambil data aspirasi.", error);
    }
  }

  if (req.method === 'POST') {
    // Require authentication for write operations
    const authHeader = req.headers.authorization || req.headers['Authorization'];
    const user = validateToken(authHeader);
    if (!user) {
      return safeErrorResponse(res, 401, "Akses ditolak. Silakan login terlebih dahulu.");
    }

    if (!db.isConfigured) {
      return res.status(200).json({
        success: false,
        isConfigured: false,
        message: "Database belum terhubung di Vercel. Data disimpan di localStorage browser."
      });
    }

    try {
      const { pelapor, kategori, judul, urgensi } = req.body;

      if (!pelapor || !judul) {
        return safeErrorResponse(res, 400, "Nama pelapor dan rincian laporan wajib diisi.");
      }

      // Length validations
      const lengthErrors = [
        validateStringLength(pelapor, 'Nama Pelapor', 150),
        validateStringLength(kategori, 'Kategori', 100),
        validateStringLength(judul, 'Rincian Laporan', 1000),
        validateStringLength(urgensi, 'Urgensi', 50),
      ].filter(Boolean);

      if (lengthErrors.length > 0) {
        return safeErrorResponse(res, 400, lengthErrors[0]);
      }

      const generatedId = (req.body.id && String(req.body.id).trim()) || `ASP-${Date.now().toString().slice(-4)}`;

      const insertQuery = `
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
        RETURNING *;
      `;

      const values = [
        generatedId,
        pelapor,
        kategori || 'Fasilitas Umum',
        judul,
        req.body.tanggal || new Date().toISOString().slice(0, 10),
        req.body.status || 'Diproses',
        req.body.tanggapan || 'Laporan telah diterima sistem dan dalam penanganan pengurus RT.',
        urgensi || 'Sedang'
      ];

      const result = await db.query(insertQuery, values);
      const row = result.rows[0];

      // Mirror otomatis ke sync_store agar sinkron penuh dengan GET /api/sync
      await db.query(`
        INSERT INTO sync_store (collection, id, data, updated_at)
        VALUES ('aspirasi', $1, $2, NOW())
        ON CONFLICT (collection, id) DO UPDATE SET
          data = EXCLUDED.data,
          updated_at = NOW()
      `, [generatedId, JSON.stringify(row)]).catch(() => {});

      return res.status(201).json({
        success: true,
        message: "Laporan fasilitas berhasil dikirim ke pengurus RT!",
        data: row
      });
    } catch (error) {
      return safeErrorResponse(res, 500, "Gagal mengirim aspirasi.", error);
    }
  }

  // DELETE /api/aspirasi — Hapus aspirasi (Pengurus RT & Admin)
  if (req.method === 'DELETE') {
    const authHeader = req.headers.authorization || req.headers['Authorization'];
    const user = validateToken(authHeader);
    if (!user || (!user.isAdmin && !user.isPengurus)) {
      return safeErrorResponse(res, 403, "Hanya Administrator RT atau Pengurus RT yang berhak menghapus aspirasi.");
    }

    const deleteId = req.query?.id || req.body?.id;
    if (!deleteId) {
      return safeErrorResponse(res, 400, "ID aspirasi yang akan dihapus wajib disertakan.");
    }

    if (!db.isConfigured) {
      return res.status(200).json({ success: true, message: "Dihapus secara lokal." });
    }

    try {
      await db.query('DELETE FROM aspirasi_warga WHERE id = $1', [deleteId]);
      await db.query('DELETE FROM sync_store WHERE collection = $1 AND id = $2', ['aspirasi', deleteId]).catch(() => {});
      return res.status(200).json({ success: true, message: `Laporan ${deleteId} berhasil dihapus dari cloud.` });
    } catch (err) {
      return safeErrorResponse(res, 500, "Gagal menghapus aspirasi dari database.", err);
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
};
