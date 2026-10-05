/**
 * Auth API Endpoint — POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me
 */
const { authenticate, validateToken, revokeToken, issueSyncToken, ensureUsersTable, setCorsHeaders, handlePreflight, safeErrorResponse, recordAuditLog } = require('../middleware/auth');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  setCorsHeaders(res);

  if (handlePreflight(req, res)) return;

  // Pastikan tabel pengguna siap
  await ensureUsersTable();

  // POST /api/auth — Login
  if (req.method === 'POST') {
    const { username, password, action } = req.body || {};

    // Logout action
    if (action === 'logout') {
      const authHeader = req.headers.authorization || req.headers['Authorization'];
      const currentUser = validateToken(authHeader);
      revokeToken(authHeader);
      if (currentUser) {
        await recordAuditLog({
          username: currentUser.username,
          nama: currentUser.nama,
          role: currentUser.role,
          aksi: 'LOGOUT',
          kategori: 'Autentikasi',
          deskripsi: `Akun ${currentUser.nama} (@${currentUser.username}) keluar dari sistem (Logout).`,
          ip: (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '-').split(',')[0].trim()
        });
      }
      return res.status(200).json({ success: true, message: "Berhasil keluar." });
    }

    // Login action
    if (!username || !password) {
      return safeErrorResponse(res, 400, "Nama pengguna dan kata sandi wajib diisi.");
    }

    if (typeof username !== 'string' || username.length > 50) {
      return safeErrorResponse(res, 400, "Format nama pengguna tidak valid.");
    }

    if (typeof password !== 'string' || password.length > 100) {
      return safeErrorResponse(res, 400, "Format kata sandi tidak valid.");
    }

    const session = await authenticate(username, password);

    if (!session) {
      // Intentionally vague error — don't reveal if username or password is wrong
      return safeErrorResponse(res, 401, "Nama pengguna atau kata sandi tidak cocok.");
    }

    // Token stateless HMAC tahan cold-start serverless Vercel
    const canSync = Boolean(session.user.isAdmin || session.user.isBendahara || session.user.isPengurus);

    // Catat aktivitas login ke dalam audit log
    const clientIp = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '-').split(',')[0].trim();
    await recordAuditLog({
      username: session.user.username,
      nama: session.user.nama,
      role: session.user.role,
      aksi: 'LOGIN',
      kategori: 'Autentikasi',
      deskripsi: `Akun ${session.user.nama} (@${session.user.username}) berhasil masuk ke portal sistem dengan peran "${session.user.role}".`,
      ip: clientIp
    });

    return res.status(200).json({
      success: true,
      message: `Selamat datang, ${session.user.nama}!`,
      token: session.token,
      syncToken: session.token,
      user: session.user,
      expiresAt: session.expiresAt
    });
  }

  // GET /api/auth — Validate current session (check "me")
  if (req.method === 'GET') {
    const authHeader = req.headers.authorization || req.headers['Authorization'];
    const user = validateToken(authHeader);

    if (!user) {
      return res.status(200).json({ success: false, authenticated: false });
    }

    return res.status(200).json({
      success: true,
      authenticated: true,
      user
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
};
