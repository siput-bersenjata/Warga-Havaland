const db = require('./db');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'GET') {
    if (!db.isConfigured) {
      return res.status(200).json({ success: true, isConfigured: false, data: [] });
    }
    try {
      const result = await db.query('SELECT * FROM aspirasi_warga ORDER BY tanggal DESC, created_at DESC');
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
      const { pelapor, kategori, judul, urgensi } = req.body;

      if (!pelapor || !judul) {
        return res.status(400).json({ success: false, error: "Nama pelapor dan rincian laporan wajib diisi." });
      }

      const generatedId = `ASP-${Date.now().toString().slice(-4)}`;

      const insertQuery = `
        INSERT INTO aspirasi_warga (id, pelapor, kategori, judul, tanggal, status, tanggapan, urgensi)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
      `;

      const values = [
        generatedId,
        pelapor,
        kategori || 'Fasilitas Umum',
        judul,
        new Date().toISOString().slice(0, 10),
        'Diproses',
        'Laporan telah diterima sistem dan dalam penanganan pengurus RT.',
        urgensi || 'Sedang'
      ];

      const result = await db.query(insertQuery, values);

      return res.status(201).json({
        success: true,
        message: "Laporan fasilitas berhasil dikirim ke pengurus RT!",
        data: result.rows[0]
      });
    } catch (error) {
      console.error("POST /api/aspirasi error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
};
