const crypto = require('crypto');
const db = require('./db');
const { validateToken, setCorsHeaders, handlePreflight, safeErrorResponse, validateStringLength } = require('./middleware/auth');

const VALID_ROLES = ['Warga Tetap', 'Pengurus RT', 'Bendahara RT', 'Administrator RT'];

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  setCorsHeaders(res);

  if (handlePreflight(req, res)) return;

  // All /api/users endpoints require Admin authorization
  const authHeader = req.headers.authorization || req.headers['Authorization'];
  const currentUser = validateToken(authHeader);

  if (!currentUser) {
    return safeErrorResponse(res, 401, "Akses ditolak. Silakan login terlebih dahulu.");
  }

  if (!currentUser.isAdmin) {
    return safeErrorResponse(res, 403, "Akses ditolak. Hanya Administrator RT yang berhak mengelola akun pengguna.");
  }

  // ==========================================
  // GET: List all users (without password hash)
  // ==========================================
  if (req.method === 'GET') {
    if (!db.isConfigured) {
      return res.status(200).json({
        success: true,
        isConfigured: false,
        data: []
      });
    }

    try {
      const result = await db.query(`
        SELECT id, username, nama, role, blok, is_admin, created_at, updated_at 
        FROM pengguna_havaland 
        ORDER BY 
          CASE WHEN username = 'admin' THEN 0 ELSE 1 END,
          created_at ASC
      `);
      return res.status(200).json({
        success: true,
        isConfigured: true,
        data: result.rows
      });
    } catch (error) {
      return safeErrorResponse(res, 500, "Gagal mengambil daftar akun pengguna.", error);
    }
  }

  // ==========================================
  // POST: Create new user account
  // ==========================================
  if (req.method === 'POST') {
    try {
      const { username, password, nama, role, blok } = req.body || {};

      // 1. Validation
      if (!username || !password || !nama) {
        return safeErrorResponse(res, 400, "Username, password, dan nama lengkap wajib diisi.");
      }

      const cleanUsername = String(username).trim().toLowerCase();
      if (!/^[a-z0-9_]{3,30}$/.test(cleanUsername)) {
        return safeErrorResponse(res, 400, "Username harus berupa 3-30 karakter alfanumerik (huruf kecil, angka, garis bawah).");
      }

      if (typeof password !== 'string' || password.length < 6 || password.length > 100) {
        return safeErrorResponse(res, 400, "Password minimal 6 karakter dan maksimal 100 karakter.");
      }

      const cleanNama = String(nama).trim();
      if (cleanNama.length < 2 || cleanNama.length > 100) {
        return safeErrorResponse(res, 400, "Nama lengkap harus antara 2 hingga 100 karakter.");
      }

      if (!db.isConfigured) {
        return res.status(200).json({
          success: false,
          isConfigured: false,
          message: "Database belum terhubung di Vercel."
        });
      }

      const selectedRole = VALID_ROLES.includes(role) ? role : 'Warga Tetap';
      const cleanBlok = String(blok || '-').trim().slice(0, 20);
      const isAdmin = (selectedRole === 'Administrator RT' || selectedRole === 'Admin RT');

      // 2. Check if username already exists
      const existing = await db.query(
        'SELECT id FROM pengguna_havaland WHERE LOWER(username) = $1 LIMIT 1',
        [cleanUsername]
      );
      if (existing.rows && existing.rows.length > 0) {
        return safeErrorResponse(res, 409, `Username "${cleanUsername}" sudah digunakan oleh warga lain.`);
      }

      // 3. Hash password with SHA-256
      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
      const userId = `USR-${Date.now()}`;

      // 4. Insert into database
      const insertResult = await db.query(
        `INSERT INTO pengguna_havaland (id, username, password_hash, nama, role, blok, is_admin)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, username, nama, role, blok, is_admin, created_at`,
        [userId, cleanUsername, passwordHash, cleanNama, selectedRole, cleanBlok, isAdmin]
      );

      return res.status(201).json({
        success: true,
        message: `Akun untuk ${cleanNama} (${cleanUsername}) dengan role "${selectedRole}" berhasil dibuat!`,
        data: insertResult.rows[0]
      });
    } catch (error) {
      return safeErrorResponse(res, 500, "Gagal membuat akun pengguna baru.", error);
    }
  }

  // ==========================================
  // DELETE: Remove user account
  // ==========================================
  if (req.method === 'DELETE') {
    try {
      const { id, username } = req.body || req.query || {};

      if (!id && !username) {
        return safeErrorResponse(res, 400, "ID atau username pengguna yang akan dihapus wajib disertakan.");
      }

      // CRITICAL SECURITY: Never allow deleting the primary admin account
      if (username && String(username).toLowerCase() === 'admin') {
        return safeErrorResponse(res, 403, "Akun Administrator RT utama (admin) dilindungi dan tidak boleh dihapus!");
      }

      if (!db.isConfigured) {
        return res.status(200).json({
          success: false,
          isConfigured: false,
          message: "Database belum terhubung di Vercel."
        });
      }

      // Fetch user to confirm target
      const targetQuery = id 
        ? await db.query('SELECT id, username FROM pengguna_havaland WHERE id = $1', [id])
        : await db.query('SELECT id, username FROM pengguna_havaland WHERE LOWER(username) = $1', [String(username).toLowerCase()]);

      if (!targetQuery.rows || targetQuery.rows.length === 0) {
        return safeErrorResponse(res, 404, "Akun pengguna tidak ditemukan.");
      }

      const targetUser = targetQuery.rows[0];

      if (targetUser.username.toLowerCase() === 'admin') {
        return safeErrorResponse(res, 403, "Akun Administrator RT utama (admin) dilindungi dan tidak boleh dihapus!");
      }

      if (targetUser.username.toLowerCase() === currentUser.username.toLowerCase()) {
        return safeErrorResponse(res, 400, "Anda tidak dapat menghapus akun Anda sendiri saat sedang login.");
      }

      await db.query('DELETE FROM pengguna_havaland WHERE id = $1', [targetUser.id]);

      return res.status(200).json({
        success: true,
        message: `Akun "${targetUser.username}" berhasil dihapus dari sistem.`
      });
    } catch (error) {
      return safeErrorResponse(res, 500, "Gagal menghapus akun pengguna.", error);
    }
  }

  return res.status(405).json({
    success: false,
    error: `Metode ${req.method} tidak diizinkan pada endpoint ini.`
  });
};
