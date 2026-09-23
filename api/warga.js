const db = require('./db');
const { validateToken, setCorsHeaders, handlePreflight, safeErrorResponse } = require('./middleware/auth');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  setCorsHeaders(res);

  if (handlePreflight(req, res)) return;

  if (req.method === 'GET') {
    // GET is public — read-only access for all visitors
    if (!db.isConfigured) {
      return res.status(200).json({ success: true, isConfigured: false, data: [] });
    }
    try {
      const result = await db.query('SELECT * FROM warga_havaland ORDER BY blok ASC');
      return res.status(200).json({ success: true, isConfigured: true, data: result.rows });
    } catch (error) {
      return safeErrorResponse(res, 500, "Gagal mengambil data warga.", error);
    }
  }

  if (req.method === 'PUT') {
    // Require admin authentication for data modification
    const authHeader = req.headers.authorization || req.headers['Authorization'];
    const user = validateToken(authHeader);
    if (!user) {
      return safeErrorResponse(res, 401, "Akses ditolak. Silakan login terlebih dahulu.");
    }

    if (!user.isAdmin) {
      return safeErrorResponse(res, 403, "Akses ditolak. Hanya Administrator RT yang berhak mengubah data warga.");
    }

    if (!db.isConfigured) {
      return res.status(200).json({
        success: false,
        isConfigured: false,
        message: "Database belum terhubung di Vercel."
      });
    }

    try {
      const { id, iuran_bulan_ini, status_iuran, terakhir_bayar } = req.body;

      if (!id) {
        return safeErrorResponse(res, 400, "ID warga wajib disertakan.");
      }

      if (typeof id !== 'string' || id.length > 50) {
        return safeErrorResponse(res, 400, "Format ID warga tidak valid.");
      }

      const updateQuery = `
        UPDATE warga_havaland
        SET iuran_bulan_ini = COALESCE($2, iuran_bulan_ini),
            status_iuran = COALESCE($3, status_iuran),
            terakhir_bayar = COALESCE($4, terakhir_bayar),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *;
      `;

      const values = [id, iuran_bulan_ini, status_iuran, terakhir_bayar];
      const result = await db.query(updateQuery, values);

      if (result.rowCount === 0) {
        return safeErrorResponse(res, 404, "Data warga tidak ditemukan.");
      }

      return res.status(200).json({
        success: true,
        message: "Status iuran warga berhasil diperbarui!",
        data: result.rows[0]
      });
    } catch (error) {
      return safeErrorResponse(res, 500, "Gagal memperbarui data warga.", error);
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
};
