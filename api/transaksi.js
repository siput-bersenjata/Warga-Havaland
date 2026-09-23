const db = require('./db');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'GET') {
    if (!db.isConfigured) {
      return res.status(200).json({ success: true, isConfigured: false, data: [] });
    }
    try {
      const result = await db.query('SELECT * FROM transaksi_kas ORDER BY tanggal DESC, created_at DESC');
      return res.status(200).json({ success: true, isConfigured: true, data: result.rows });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'POST') {
    if (!db.isConfigured) {
      return res.status(200).json({
        success: false,
        isConfigured: false,
        message: "Database belum terhubung di Vercel. Data disimpan di localStorage browser."
      });
    }

    try {
      const { id, tanggal, jenis, kategori, uraian, nominal, metode, pj, bukti, catatan } = req.body;

      if (!uraian || !nominal || isNaN(nominal)) {
        return res.status(400).json({ success: false, error: "Uraian dan nominal wajib diisi." });
      }

      const generatedId = id || `TRX-${tanggal.replace(/-/g, '').slice(0, 6)}-${Date.now().toString().slice(-3)}`;

      // Parameterized query untuk proteksi SQL Injection
      const insertQuery = `
        INSERT INTO transaksi_kas (id, tanggal, jenis, kategori, uraian, nominal, metode, pj, bukti, status, catatan)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *;
      `;

      const values = [
        generatedId,
        tanggal || new Date().toISOString().slice(0, 10),
        jenis || 'masuk',
        kategori || 'Iuran Warga',
        uraian,
        parseInt(nominal, 10),
        metode || 'Transfer Mandiri',
        pj || 'Bendahara (Citra L.)',
        bukti || `KWT-${Date.now().toString().slice(-4)}`,
        'Verified',
        catatan || 'Dicatat via Portal Havaland'
      ];

      const result = await db.query(insertQuery, values);

      return res.status(201).json({
        success: true,
        message: "Transaksi kas berhasil disimpan ke database!",
        data: result.rows[0]
      });
    } catch (error) {
      console.error("POST /api/transaksi error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
};
