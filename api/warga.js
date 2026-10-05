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
      const rows = (result.rows || []).map(r => {
        let plat = [];
        try {
          if (Array.isArray(r.plat_kendaraan)) plat = r.plat_kendaraan;
          else if (typeof r.plat_kendaraan === 'string') plat = r.plat_kendaraan.startsWith('[') ? JSON.parse(r.plat_kendaraan) : [r.plat_kendaraan];
          else plat = ['-'];
        } catch (_) {
          plat = ['-'];
        }
        const isLunas = Boolean(r.iuran_bulan_ini);
        return {
          id: r.id,
          blok: r.blok || '',
          cluster: r.cluster || 'Havaland',
          namaKK: r.nama_kk || '-',
          nama_kk: r.nama_kk || '-',
          statusHunian: r.status_hunian || 'Tetap',
          status_hunian: r.status_hunian || 'Tetap',
          jabatan: r.jabatan || 'Warga',
          jumlahJiwa: parseInt(r.jumlah_jiwa, 10) || 1,
          jumlah_jiwa: parseInt(r.jumlah_jiwa, 10) || 1,
          kontak: r.kontak || '-',
          platKendaraan: plat,
          plat_kendaraan: plat,
          statusIuran: isLunas ? 'Lunas' : 'Belum',
          status_iuran: isLunas ? 'Lunas' : 'Belum',
          iuranBulanIni: isLunas,
          iuran_bulan_ini: isLunas,
          terakhirBayar: r.terakhir_bayar || '-',
          terakhir_bayar: r.terakhir_bayar || '-'
        };
      });
      return res.status(200).json({ success: true, isConfigured: true, data: rows });
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
