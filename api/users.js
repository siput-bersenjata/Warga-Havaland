const crypto = require('crypto');
const db = require('./db');
const { validateToken, ensureUsersTable, setCorsHeaders, handlePreflight, safeErrorResponse, validateStringLength, recordAuditLog } = require('./middleware/auth');

const VALID_ROLES = ['Warga Tetap', 'Pengurus RT', 'Bendahara RT', 'Administrator RT'];

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  setCorsHeaders(res);

  if (handlePreflight(req, res)) return;

  // Pastikan tabel pengguna_havaland tersedia di Postgres
  await ensureUsersTable();

  // All /api/users endpoints require Admin authorization
  const authHeader = req.headers.authorization || req.headers['Authorization'] || req.headers['x-sync-token'];
  const currentUser = validateToken(authHeader);

  if (!currentUser) {
    return safeErrorResponse(res, 401, "Akses ditolak. Sesi login tidak ditemukan atau telah kedaluwarsa. Silakan login kembali.");
  }

  const isManager = Boolean(currentUser.isAdmin || currentUser.isPengurus);
  if (!isManager) {
    return safeErrorResponse(res, 403, "Akses ditolak. Hanya Administrator RT atau Pengurus RT yang berhak mengelola akun pengguna.");
  }

  // ==========================================
  // GET: List all users (without password hash)
  // ==========================================
  if (req.method === 'GET') {
    const defaultAccounts = [
      {
        id: "USR-ADMIN-01",
        username: "admin",
        nama: "Admin RT 04 Havaland",
        role: "Administrator RT",
        blok: "Kantor RT",
        is_admin: true,
        created_at: "2026-09-01T00:00:00Z"
      },
      {
        id: "USR-RT-01",
        username: "rt",
        nama: "Bpk. Bambang Sujarwo",
        role: "Pengurus RT",
        blok: "Blok A-01",
        is_admin: true,
        created_at: "2026-09-01T00:00:00Z"
      },
      {
        id: "USR-BENDAHARA-01",
        username: "bendahara",
        nama: "Ibu Citra Lestari, S.E.",
        role: "Bendahara RT",
        blok: "Blok B-02",
        is_admin: false,
        created_at: "2026-09-01T00:00:00Z"
      },
      {
        id: "USR-WARGA-01",
        username: "warga",
        nama: "Warga Havaland",
        role: "Warga Tetap",
        blok: "Perum Havaland",
        is_admin: false,
        created_at: "2026-09-01T00:00:00Z"
      }
    ];

    if (!db.isConfigured) {
      return res.status(200).json({
        success: true,
        isConfigured: false,
        data: defaultAccounts
      });
    }

    try {
      const result = await db.query(`
        SELECT id, username, nama, role, blok, is_admin, created_at, updated_at 
        FROM pengguna_havaland 
        ORDER BY 
          CASE WHEN username = 'admin' THEN 0 WHEN username = 'rt' THEN 1 WHEN username = 'bendahara' THEN 2 WHEN username = 'warga' THEN 3 ELSE 4 END,
          created_at ASC
      `);

      const rows = (result.rows && result.rows.length > 0) ? result.rows : defaultAccounts;
      return res.status(200).json({
        success: true,
        isConfigured: true,
        data: rows
      });
    } catch (error) {
      return safeErrorResponse(res, 500, "Gagal mengambil daftar akun pengguna.", error);
    }
  }

  // ==========================================
  // POST: Create or Update user account
  // ==========================================
  if (req.method === 'POST') {
    try {
      const { username, password, nama, role, blok } = req.body || {};

      // 1. Validation
      if (!username || !password || !nama) {
        return safeErrorResponse(res, 400, "Username, password, dan nama lengkap wajib diisi.");
      }

      const cleanUsername = String(username).trim().toLowerCase();
      if (!/^[a-z0-9_]{2,30}$/.test(cleanUsername)) {
        return safeErrorResponse(res, 400, "Username harus berupa 2-30 karakter alfanumerik (huruf kecil, angka, garis bawah).");
      }

      if (typeof password !== 'string' || password.length < 6 || password.length > 100) {
        return safeErrorResponse(res, 400, "Password minimal 6 karakter dan maksimal 100 karakter.");
      }

      const cleanNama = String(nama).trim();
      if (cleanNama.length < 2 || cleanNama.length > 100) {
        return safeErrorResponse(res, 400, "Nama lengkap harus antara 2 hingga 100 karakter.");
      }

      const selectedRole = VALID_ROLES.includes(role) ? role : 'Warga Tetap';
      const cleanBlok = String(blok || '-').trim().slice(0, 20);
      const isAdmin = (selectedRole === 'Administrator RT' || selectedRole === 'Admin RT');
      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

      if (!db.isConfigured) {
        return res.status(200).json({
          success: true,
          isConfigured: false,
          message: `Akun untuk ${cleanNama} (${cleanUsername}) berhasil didaftarkan secara lokal.`,
          data: {
            id: `USR-${Date.now()}`,
            username: cleanUsername,
            nama: cleanNama,
            role: selectedRole,
            blok: cleanBlok,
            is_admin: isAdmin,
            created_at: new Date().toISOString()
          }
        });
      }

      // 2. Check if username already exists
      const existing = await db.query(
        'SELECT id, username FROM pengguna_havaland WHERE LOWER(username) = $1 LIMIT 1',
        [cleanUsername]
      );

      if (existing.rows && existing.rows.length > 0) {
        if (cleanUsername === 'admin') {
          return safeErrorResponse(res, 409, `Username "admin" adalah akun induk sistem yang dilindungi.`);
        }
        // Jika akun sudah ada (misal akun rt atau bendahara bawaan), perbarui data & kata sandinya
        const existingId = existing.rows[0].id;
        const updateResult = await db.query(
          `UPDATE pengguna_havaland 
           SET password_hash = $1, nama = $2, role = $3, blok = $4, is_admin = $5, updated_at = NOW()
           WHERE id = $6
           RETURNING id, username, nama, role, blok, is_admin, created_at, updated_at`,
          [passwordHash, cleanNama, selectedRole, cleanBlok, isAdmin, existingId]
        );
        const clientIp = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '-').split(',')[0].trim();
        await recordAuditLog({
          username: currentUser.username,
          nama: currentUser.nama,
          role: currentUser.role,
          aksi: 'EDIT_AKUN',
          kategori: 'Manajemen Akun',
          deskripsi: `Memperbarui data & kata sandi akun @${cleanUsername} (${cleanNama}) menjadi role "${selectedRole}".`,
          ip: clientIp
        });

        return res.status(200).json({
          success: true,
          message: `Akun "${cleanUsername}" (${cleanNama}) berhasil diperbarui dan kata sandi baru disimpan!`,
          data: updateResult.rows[0]
        });
      }

      // 3. Insert into database
      const userId = `USR-${Date.now()}`;
      const insertResult = await db.query(
        `INSERT INTO pengguna_havaland (id, username, password_hash, nama, role, blok, is_admin)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, username, nama, role, blok, is_admin, created_at`,
        [userId, cleanUsername, passwordHash, cleanNama, selectedRole, cleanBlok, isAdmin]
      );

      const clientIp = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '-').split(',')[0].trim();
      await recordAuditLog({
        username: currentUser.username,
        nama: currentUser.nama,
        role: currentUser.role,
        aksi: 'BUAT_AKUN',
        kategori: 'Manajemen Akun',
        deskripsi: `Mendaftarkan akun baru: @${cleanUsername} (${cleanNama}) dengan role "${selectedRole}" dan blok "${cleanBlok}".`,
        ip: clientIp
      });

      return res.status(201).json({
        success: true,
        message: `Akun untuk ${cleanNama} (${cleanUsername}) dengan role "${selectedRole}" berhasil dibuat dan disimpan permanen ke database cloud!`,
        data: insertResult.rows[0]
      });
    } catch (error) {
      return safeErrorResponse(res, 500, "Gagal membuat akun pengguna baru.", error);
    }
  }

  // ==========================================
  // PUT: Update user account (role, blok, nama, optional password)
  // ==========================================
  if (req.method === 'PUT') {
    try {
      const { id, username, nama, role, blok, password } = req.body || {};

      if (!id && !username) {
        return safeErrorResponse(res, 400, "ID atau username pengguna yang akan diperbarui wajib disertakan.");
      }

      if (!db.isConfigured) {
        return res.status(200).json({
          success: false,
          isConfigured: false,
          message: "Database belum terhubung di Vercel."
        });
      }

      // 1. Fetch existing user
      const targetQuery = id 
        ? await db.query('SELECT * FROM pengguna_havaland WHERE id = $1', [id])
        : await db.query('SELECT * FROM pengguna_havaland WHERE LOWER(username) = $1', [String(username).toLowerCase()]);

      if (!targetQuery.rows || targetQuery.rows.length === 0) {
        return safeErrorResponse(res, 404, "Akun pengguna tidak ditemukan.");
      }

      const existingUser = targetQuery.rows[0];
      const isTargetPrimaryAdmin = (existingUser.username.toLowerCase() === 'admin');

      // 2. Prepare updated fields
      let cleanNama = existingUser.nama;
      if (nama && typeof nama === 'string' && nama.trim().length >= 2) {
        cleanNama = nama.trim().slice(0, 100);
      }

      let cleanBlok = existingUser.blok;
      if (typeof blok === 'string') {
        cleanBlok = blok.trim().slice(0, 20) || '-';
      }

      let selectedRole = existingUser.role;
      let isAdmin = existingUser.is_admin;
      if (role && VALID_ROLES.includes(role)) {
        if (isTargetPrimaryAdmin && role !== 'Administrator RT' && role !== 'Admin RT') {
          return safeErrorResponse(res, 403, "Peran akun admin utama tidak dapat diturunkan demi keamanan sistem.");
        }
        selectedRole = role;
        isAdmin = (role === 'Administrator RT' || role === 'Admin RT');
      }

      let passwordHash = existingUser.password_hash;
      if (password && typeof password === 'string' && password.trim().length >= 6) {
        passwordHash = crypto.createHash('sha256').update(password.trim()).digest('hex');
      }

      // 3. Update query
      const updateResult = await db.query(
        `UPDATE pengguna_havaland 
         SET nama = $1, role = $2, blok = $3, is_admin = $4, password_hash = $5, updated_at = NOW()
         WHERE id = $6
         RETURNING id, username, nama, role, blok, is_admin, created_at, updated_at`,
        [cleanNama, selectedRole, cleanBlok, isAdmin, passwordHash, existingUser.id]
      );

      return res.status(200).json({
        success: true,
        message: `Data dan hak akses akun "${existingUser.username}" berhasil diperbarui.`,
        data: updateResult.rows[0]
      });
    } catch (error) {
      return safeErrorResponse(res, 500, "Gagal memperbarui akun pengguna.", error);
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

      const clientIp = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '-').split(',')[0].trim();
      await recordAuditLog({
        username: currentUser.username,
        nama: currentUser.nama,
        role: currentUser.role,
        aksi: 'HAPUS_AKUN',
        kategori: 'Manajemen Akun',
        deskripsi: `Menghapus akun pengguna @${targetUser.username} (${targetUser.nama || targetUser.username}) dari database sistem.`,
        ip: clientIp
      });

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
