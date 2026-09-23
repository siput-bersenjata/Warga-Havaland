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
      const result = await db.query('SELECT * FROM transaksi_kas ORDER BY tanggal DESC, created_at DESC');
      return res.status(200).json({ success: true, isConfigured: true, data: result.rows });
    } catch (error) {
      return safeErrorResponse(res, 500, "Gagal mengambil data transaksi.", error);
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

      // Parameterized query for SQL Injection protection
      const insertQuery = `
        INSERT INTO transaksi_kas (id, tanggal, jenis, kategori, uraian, nominal, metode, pj, bukti, status, catatan)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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

      return res.status(201).json({
        success: true,
        message: "Transaksi kas berhasil disimpan ke database!",
        data: result.rows[0]
      });
    } catch (error) {
      return safeErrorResponse(res, 500, "Gagal menyimpan transaksi.", error);
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
};
