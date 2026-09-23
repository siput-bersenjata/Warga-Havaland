const db = require('./db');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'GET') {
    if (!db.isConfigured) {
      return res.status(200).json({ success: true, isConfigured: false, data: [] });
    }
    try {
      const result = await db.query('SELECT * FROM warga_havaland ORDER BY blok ASC');
      return res.status(200).json({ success: true, isConfigured: true, data: result.rows });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'PUT') {
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
        return res.status(400).json({ success: false, error: "ID warga wajib disertakan." });
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
        return res.status(404).json({ success: false, error: "Data warga tidak ditemukan." });
      }

      return res.status(200).json({
        success: true,
        message: "Status iuran warga berhasil diperbarui!",
        data: result.rows[0]
      });
    } catch (error) {
      console.error("PUT /api/warga error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
};
