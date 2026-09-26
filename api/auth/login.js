/**
 * Auth API Endpoint — POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me
 */
const { authenticate, validateToken, revokeToken, issueSyncToken, setCorsHeaders, handlePreflight, safeErrorResponse } = require('../middleware/auth');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  setCorsHeaders(res);

  if (handlePreflight(req, res)) return;

  // POST /api/auth — Login
  if (req.method === 'POST') {
    const { username, password, action } = req.body || {};

    // Logout action
    if (action === 'logout') {
      const authHeader = req.headers.authorization || req.headers['Authorization'];
      revokeToken(authHeader);
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

    return res.status(200).json({
      success: true,
      message: `Selamat datang, ${session.user.nama}!`,
      token: session.token,
      // Token tulis sinkronisasi stateless (tahan pindah instance serverless).
      // Diberi hanya ke admin; dipakai client untuk POST /api/sync.
      syncToken: session.user.isAdmin ? issueSyncToken(session.user) : null,
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
