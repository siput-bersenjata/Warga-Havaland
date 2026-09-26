/**
 * Auth Middleware — Validates session tokens for protected API endpoints
 * Used by: api/transaksi.js, api/aspirasi.js, api/warga.js, api/sync.js
 */

const crypto = require('crypto');

// In-memory session store (resets on cold start — acceptable for serverless)
// For production persistence, use a database or Redis
const sessions = new Map();

// Session TTL: 30 days
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// User accounts with PRE-COMPUTED SHA-256 password hashes.
// Plaintext passwords are NEVER stored in source code.
// To change a password, compute: crypto.createHash('sha256').update('new_password').digest('hex')
// Or override via ADMIN_PASSWORD_HASH / WARGA_PASSWORD_HASH env vars in Vercel.
const ADMIN_HASH = process.env.ADMIN_PASSWORD_HASH || '5d34f17cb4318d6afabdd2db5296372fc55c87be9591fdd57af1771eaef123f9';

const USERS = [
  {
    username: "admin",
    passwordHash: ADMIN_HASH,
    nama: "Admin RT 04 Havaland",
    role: "Administrator RT",
    blok: "Kantor RT",
    isAdmin: true
  }
];

const db = require('../db');

/**
 * Authenticate a user by username + password
 * Supports both PostgreSQL database (pengguna_havaland) and fallback USERS array.
 * @returns {Promise<object|null>} session object or null
 */
async function authenticate(username, password) {
  const cleanUsername = (username || '').toLowerCase().trim();
  if (!cleanUsername || !password) return null;

  const hash = crypto.createHash('sha256').update(password).digest('hex');
  let user = null;

  // 1. If PostgreSQL database is connected, check pengguna_havaland table
  if (db && db.isConfigured) {
    try {
      const result = await db.query(
        'SELECT id, username, password_hash, nama, role, blok, is_admin FROM pengguna_havaland WHERE LOWER(username) = $1 LIMIT 1',
        [cleanUsername]
      );
      if (result.rows && result.rows.length > 0) {
        const row = result.rows[0];
        if (hash === row.password_hash) {
          user = {
            id: row.id,
            username: row.username,
            nama: row.nama,
            role: row.role,
            blok: row.blok,
            isAdmin: Boolean(row.is_admin)
          };
        }
      }
    } catch (err) {
      console.error('[Auth Database Error]', err.message);
      // Fall through to memory fallback
    }
  }

  // 2. Fallback to in-memory USERS (e.g. default admin or offline mode)
  if (!user) {
    const memoryUser = USERS.find(u => u.username.toLowerCase() === cleanUsername);
    if (memoryUser && hash === memoryUser.passwordHash) {
      user = {
        username: memoryUser.username,
        nama: memoryUser.nama,
        role: memoryUser.role,
        blok: memoryUser.blok,
        isAdmin: memoryUser.isAdmin
      };
    }
  }

  if (!user) return null;

  // Create session
  const token = crypto.randomUUID();
  const session = {
    token,
    user: {
      username: user.username,
      nama: user.nama,
      role: user.role,
      blok: user.blok,
      isAdmin: user.isAdmin
    },
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS
  };

  sessions.set(token, session);
  return session;
}

/**
 * Validate a session token from Authorization header
 * @param {string} authHeader - "Bearer <token>"
 * @returns {object|null} user object or null
 */
function validateToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7).trim();
  if (!token) return null;

  const session = sessions.get(token);
  if (!session) return null;

  // Check expiration
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }

  return session.user;
}

/**
 * Remove a session (logout)
 */
function revokeToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7).trim();
  return sessions.delete(token);
}

// ============================================================================
// STATELESS SYNC TOKEN (tahan cold-start serverless Vercel)
//
// Sesi `sessions` di atas hilang saat serverless pindah instance, sehingga
// validasi token tulis antar-device sering 401. Token ini di-HMAC memakai
// secret yang sama di semua instance sehingga bisa diverifikasi di mana saja
// tanpa penyimpanan. Dipakai KHUSUS oleh POST /api/sync (tulis koleksi).
// Format: base64url(payload).base64url(hmac_sha256(payload, secret))
// payload: { u: username, a: 1|0 (admin), exp: ms epoch }
// ============================================================================
function getSyncSecret() {
  return process.env.SYNC_SECRET || ADMIN_HASH;
}

function b64urlEncode(str) {
  return Buffer.from(str, 'utf8').toString('base64url');
}

function b64urlDecode(b64) {
  return Buffer.from(b64, 'base64url').toString('utf8');
}

/**
 * Terbitkan token sinkronisasi untuk user yang baru login.
 * Hanya user admin yang diberi token tulis (a:1).
 */
function issueSyncToken(user) {
  if (!user) return null;
  const payload = {
    u: user.username || 'admin',
    a: user.isAdmin ? 1 : 0,
    exp: Date.now() + SESSION_TTL_MS
  };
  const encoded = b64urlEncode(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', getSyncSecret()).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

/**
 * Verifikasi token sinkronisasi dari header Authorization Bearer / X-Sync-Token.
 * @returns {object|null} { username, isAdmin } atau null
 */
function validateSyncToken(authHeader) {
  if (!authHeader || typeof authHeader !== 'string') return null;
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : authHeader.trim();
  if (!token || !token.includes('.')) return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;

  let expected;
  try {
    expected = crypto.createHmac('sha256', getSyncSecret()).update(encoded).digest('base64url');
  } catch (e) {
    return null;
  }
  // Perbandingan waktu-konstan agar tak bocor via timing
  const a = Buffer.from(sig, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  let payload;
  try {
    payload = JSON.parse(b64urlDecode(encoded));
  } catch (e) {
    return null;
  }
  if (!payload || !payload.u || !payload.exp || Date.now() > payload.exp) return null;

  return { username: payload.u, isAdmin: payload.a === 1 };
}

/**
 * Set standard CORS and security headers on API response
 */
function setCorsHeaders(res, allowedOrigin) {
  const origin = allowedOrigin || process.env.ALLOWED_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

/**
 * Handle OPTIONS preflight
 */
function handlePreflight(req, res) {
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    res.status(204).end();
    return true;
  }
  return false;
}

/**
 * Sanitize error messages — never leak internal details to client
 */
function safeErrorResponse(res, statusCode, userMessage, internalError) {
  if (internalError) {
    console.error(`[API Error ${statusCode}]`, internalError);
  }
  return res.status(statusCode).json({
    success: false,
    error: userMessage
  });
}

/**
 * Validate string input length
 */
function validateStringLength(value, fieldName, maxLen = 500) {
  if (typeof value !== 'string') return null;
  if (value.length > maxLen) {
    return `${fieldName} terlalu panjang (maks ${maxLen} karakter).`;
  }
  return null;
}

module.exports = {
  authenticate,
  validateToken,
  revokeToken,
  issueSyncToken,
  validateSyncToken,
  setCorsHeaders,
  handlePreflight,
  safeErrorResponse,
  validateStringLength,
  USERS
};
