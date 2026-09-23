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
      return safeErrorResponse(res, 500, "Gagal mengirim aspirasi.", error);
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
};
