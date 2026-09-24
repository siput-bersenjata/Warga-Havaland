const db = require('./db');
const { validateToken, setCorsHeaders, handlePreflight, safeErrorResponse } = require('./middleware/auth');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  setCorsHeaders(res);

  if (handlePreflight(req, res)) return;

  // ==========================================
  // GET: List slides
  // ==========================================
  if (req.method === 'GET') {
    if (!db.isConfigured) {
      return res.status(200).json({
        success: true,
        source: 'local',
        data: []
      });
    }

    try {
      const result = await db.query(`
        SELECT * FROM slides_beranda ORDER BY order_index ASC, created_at DESC
      `);
      return res.status(200).json({
        success: true,
        source: 'postgres',
        data: result.rows
      });
    } catch (error) {
      return safeErrorResponse(res, 500, "Gagal mengambil data slide.", error);
    }
  }

  // POST & DELETE require admin authorization
  const authHeader = req.headers.authorization || req.headers['Authorization'];
  const currentUser = validateToken(authHeader);

  if (!currentUser) {
    return safeErrorResponse(res, 401, "Akses ditolak. Silakan login terlebih dahulu.");
  }

  if (!currentUser.isAdmin) {
    return safeErrorResponse(res, 403, "Akses ditolak. Hanya Administrator RT yang berhak mengelola slide.");
  }

  // ==========================================
  // POST: Add new slide
  // ==========================================
  if (req.method === 'POST') {
    const { title, desc, url, fullUrl, badge, source, mapsUrl } = req.body || {};

    if (!title || !url) {
      return safeErrorResponse(res, 400, "Judul dan URL gambar slide wajib diisi.");
    }

    if (!db.isConfigured) {
      return res.status(200).json({
        success: true,
        source: 'local',
        message: 'Slide berhasil disimpan di penyimpanan lokal.',
        slide: { id: 'slide-' + Date.now(), title, desc, url, badge, source }
      });
    }

    try {
      const id = 'slide-' + Date.now();
      await db.query(`
        INSERT INTO slides_beranda (id, title, description, url, full_url, badge, source, maps_url, added_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        id,
        title,
        desc || '',
        url,
        fullUrl || url,
        badge || 'Dokumentasi Warga 📸',
        source || 'Google Maps Resmi',
        mapsUrl || 'https://maps.app.goo.gl/Ujdz5idEU8PSaUEq6',
        currentUser.nama || 'Admin RT'
      ]);

      return res.status(201).json({
        success: true,
        message: `Slide "${title}" berhasil disimpan ke database.`,
        id
      });
    } catch (error) {
      return safeErrorResponse(res, 500, "Gagal menyimpan slide ke database.", error);
    }
  }

  // ==========================================
  // DELETE: Remove slide
  // ==========================================
  if (req.method === 'DELETE') {
    const slideId = req.query?.id || req.body?.id;
    if (!slideId) {
      return safeErrorResponse(res, 400, "ID slide wajib disertakan.");
    }

    if (!db.isConfigured) {
      return res.status(200).json({
        success: true,
        source: 'local',
        message: 'Slide dihapus dari penyimpanan lokal.'
      });
    }

    try {
      await db.query('DELETE FROM slides_beranda WHERE id = $1', [slideId]);
      return res.status(200).json({
        success: true,
        message: "Slide berhasil dihapus dari database."
      });
    } catch (error) {
      return safeErrorResponse(res, 500, "Gagal menghapus slide dari database.", error);
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
};
