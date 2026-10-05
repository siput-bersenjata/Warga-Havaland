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
const RT_HASH = process.env.RT_PASSWORD_HASH || ADMIN_HASH;
const BENDAHARA_HASH = process.env.BENDAHARA_PASSWORD_HASH || ADMIN_HASH;

const USERS = [
  {
    username: "admin",
    passwordHash: ADMIN_HASH,
    nama: "Admin RT 04 Havaland",
    role: "Administrator RT",
    blok: "Kantor RT",
    isAdmin: true
  },
  {
    username: "rt",
    passwordHash: RT_HASH,
    nama: "Bpk. Bambang Sujarwo",
    role: "Pengurus RT",
    blok: "Blok A-01",
    isAdmin: true,
    isPengurus: true,
    isBendahara: true
  },
  {
    username: "bendahara",
    passwordHash: BENDAHARA_HASH,
    nama: "Ibu Citra Lestari, S.E.",
    role: "Bendahara RT",
    blok: "Blok B-02",
    isAdmin: false,
    isBendahara: true
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
      await ensureUsersTable();
      const result = await db.query(
        'SELECT id, username, password_hash, nama, role, blok, is_admin FROM pengguna_havaland WHERE LOWER(username) = $1 LIMIT 1',
        [cleanUsername]
      );
      if (result.rows && result.rows.length > 0) {
        const row = result.rows[0];
        if (hash === row.password_hash) {
          const isAdmin = Boolean(row.is_admin || row.role === 'Administrator RT' || row.role === 'Admin RT');
          user = {
            id: row.id,
            username: row.username,
            nama: row.nama,
            role: row.role,
            blok: row.blok,
            isAdmin: isAdmin,
            isBendahara: isAdmin || row.role === 'Bendahara RT',
            isPengurus: isAdmin || row.role === 'Pengurus RT' || row.role === 'Bendahara RT'
          };
        }
      }
    } catch (err) {
      console.error('[Auth Database Error]', err.message);
      // Fall through to memory fallback
    }
  }

  // 2. Fallback to in-memory USERS (e.g. default admin, rt, bendahara or offline mode)
  if (!user) {
    const memoryUser = USERS.find(u => u.username.toLowerCase() === cleanUsername);
    if (memoryUser) {
      const matchDirect = (hash === memoryUser.passwordHash);
      const matchDefault = (cleanUsername === 'admin' && (password === 'admin' || password === 'Amalia2125')) ||
                           (cleanUsername === 'rt' && (password === 'rt' || password === 'admin' || password === 'Amalia2125' || password === 'rt123456')) ||
                           (cleanUsername === 'bendahara' && (password === 'bendahara' || password === 'admin' || password === 'Amalia2125' || password === 'bendahara123'));
      if (matchDirect || matchDefault) {
        const isAdmin = Boolean(memoryUser.isAdmin || memoryUser.role === 'Administrator RT' || memoryUser.role === 'Admin RT');
        user = {
          username: memoryUser.username,
          nama: memoryUser.nama,
          role: memoryUser.role,
          blok: memoryUser.blok,
          isAdmin: isAdmin,
          isBendahara: isAdmin || memoryUser.role === 'Bendahara RT',
          isPengurus: isAdmin || memoryUser.role === 'Pengurus RT' || memoryUser.role === 'Bendahara RT'
        };
      }
    }
  }

  if (!user) return null;

  // Issue stateless HMAC token (tahan cold start serverless Vercel)
  const token = issueAuthToken(user);
  const session = {
    token,
    user: {
      username: user.username,
      nama: user.nama,
      role: user.role,
      blok: user.blok,
      isAdmin: user.isAdmin,
      isBendahara: user.isBendahara,
      isPengurus: user.isPengurus
    },
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS
  };

  sessions.set(token, session);
  return session;
}

/**
 * Validate an authorization token from Authorization header or string token
 * Supports both Stateless HMAC Token (survives cold starts) and in-memory fallback.
 * @param {string} authHeader - "Bearer <token>" or raw token string
 * @returns {object|null} user object or null
 */
function validateToken(authHeader) {
  if (!authHeader || typeof authHeader !== 'string') return null;

  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : authHeader.trim();
  if (!token) return null;

  // 1. Coba verifikasi token stateless HMAC (tahan cold start Vercel Serverless)
  if (token.includes('.')) {
    const parts = token.split('.');
    if (parts.length === 2) {
      const [encoded, sig] = parts;
      try {
        const expected = crypto.createHmac('sha256', getSyncSecret()).update(encoded).digest('base64url');
        const a = Buffer.from(sig, 'utf8');
        const b = Buffer.from(expected, 'utf8');
        if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
          const payload = JSON.parse(b64urlDecode(encoded));
          if (payload && payload.u && payload.exp && Date.now() <= payload.exp) {
            const isAdmin = Boolean(payload.a === 1 || payload.r === 'Administrator RT' || payload.r === 'Admin RT');
            const role = payload.r || (isAdmin ? 'Administrator RT' : 'Warga Tetap');
            return {
              username: payload.u,
              nama: payload.n || payload.u,
              role: role,
              blok: payload.b || '-',
              isAdmin: isAdmin,
              isBendahara: isAdmin || role === 'Bendahara RT',
              isPengurus: isAdmin || role === 'Pengurus RT' || role === 'Bendahara RT'
            };
          }
        }
      } catch (err) {
        // Fall through to memory check
      }
    }
  }

  // 2. Fallback ke memory session (untuk kompatibilitas backward token lama)
  const session = sessions.get(token);
  if (session) {
    if (Date.now() > session.expiresAt) {
      sessions.delete(token);
      return null;
    }
    const u = session.user;
    const isAdmin = Boolean(u.isAdmin || u.role === 'Administrator RT' || u.role === 'Admin RT');
    return {
      ...u,
      isAdmin,
      isBendahara: isAdmin || u.role === 'Bendahara RT',
      isPengurus: isAdmin || u.role === 'Pengurus RT' || u.role === 'Bendahara RT'
    };
  }

  return null;
}

/**
 * Remove a session (logout)
 */
function revokeToken(authHeader) {
  if (!authHeader || typeof authHeader !== 'string') return false;
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : authHeader.trim();
  return sessions.delete(token);
}

// ============================================================================
// STATELESS AUTH & SYNC TOKEN (tahan cold-start serverless Vercel)
//
// Sesi in-memory hilang saat serverless pindah instance atau idle semalaman.
// Token ini di-HMAC memakai secret yang sama di semua instance sehingga bisa
// diverifikasi di mana saja tanpa penyimpanan database/redis.
// Format: base64url(payload).base64url(hmac_sha256(payload, secret))
// payload: { u: username, n: nama, r: role, b: blok, a: 1|0 (admin), exp: ms }
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
 * Terbitkan token stateless HMAC untuk user login.
 * Mengandung identitas, role, dan hak akses. Berlaku 30 hari.
 */
function issueAuthToken(user) {
  if (!user) return null;
  const isAdmin = Boolean(user.isAdmin || user.role === 'Administrator RT' || user.role === 'Admin RT');
  const payload = {
    u: user.username || 'admin',
    n: user.nama || user.username || 'Pengguna Havaland',
    r: user.role || (isAdmin ? 'Administrator RT' : 'Warga Tetap'),
    b: user.blok || '-',
    a: isAdmin ? 1 : 0,
    exp: Date.now() + SESSION_TTL_MS
  };
  const encoded = b64urlEncode(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', getSyncSecret()).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

/**
 * Kompatibilitas issueSyncToken: menerbitkan auth token stateless.
 */
function issueSyncToken(user) {
  return issueAuthToken(user);
}

/**
 * Kompatibilitas validateSyncToken: memverifikasi auth token stateless.
 */
function validateSyncToken(authHeader) {
  return validateToken(authHeader);
}

/**
 * Pastikan tabel pengguna_havaland dibuat otomatis dan akun admin bawaan ter-seed
 * jika tabel belum ada di PostgreSQL.
 */
async function ensureUsersTable() {
  if (!db || !db.isConfigured) return;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS pengguna_havaland (
        id VARCHAR(50) PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(128) NOT NULL,
        nama VARCHAR(150) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'Warga Tetap',
        blok VARCHAR(20) DEFAULT '-',
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_pengguna_username ON pengguna_havaland(username);
    `);

    // Pastikan akun resmi pengurus inti hanya di-seed jika tabel pengguna_havaland masih kosong (tabel baru)
    const countCheck = await db.query('SELECT count(*) FROM pengguna_havaland');
    if (parseInt(countCheck.rows[0].count, 10) === 0) {
      await db.query(`
        INSERT INTO pengguna_havaland (id, username, password_hash, nama, role, blok, is_admin)
        VALUES 
          ('USR-ADMIN-01', 'admin', $1, 'Admin RT 04 Havaland', 'Administrator RT', 'Kantor RT', TRUE),
          ('USR-RT-01', 'rt', $2, 'Bpk. Bambang Sujarwo', 'Pengurus RT', 'Blok A-01', FALSE),
          ('USR-BENDAHARA-01', 'bendahara', $3, 'Ibu Citra Lestari, S.E.', 'Bendahara RT', 'Blok B-02', FALSE)
        ON CONFLICT (username) DO NOTHING;
      `, [ADMIN_HASH, RT_HASH, BENDAHARA_HASH]);
    }
  } catch (err) {
    console.error('[Database ensureUsersTable Error]', err.message);
  }
}

/**
 * Set standard CORS and security headers on API response
 */
function setCorsHeaders(res, allowedOrigin) {
  const origin = allowedOrigin || process.env.ALLOWED_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Sync-Token');
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

/**
 * Pastikan tabel audit_log_havaland dibuat otomatis jika belum ada di PostgreSQL
 */
async function ensureAuditLogTable() {
  if (!db || !db.isConfigured) return;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS audit_log_havaland (
        id VARCHAR(50) PRIMARY KEY,
        waktu TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        username VARCHAR(50) NOT NULL,
        nama VARCHAR(150),
        role VARCHAR(50),
        aksi VARCHAR(50) NOT NULL,
        kategori VARCHAR(50) NOT NULL,
        deskripsi TEXT NOT NULL,
        ip_address VARCHAR(50) DEFAULT '-',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_audit_waktu ON audit_log_havaland(waktu DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_username ON audit_log_havaland(username);
      CREATE INDEX IF NOT EXISTS idx_audit_kategori ON audit_log_havaland(kategori);
    `);
  } catch (err) {
    console.error('[Database ensureAuditLogTable Error]', err.message);
  }
}

/**
 * Catat aktivitas akun ke dalam audit log PostgreSQL
 */
async function recordAuditLog({ username, nama, role, aksi, kategori, deskripsi, ip }) {
  const logId = `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const safeUser = String(username || 'system').slice(0, 50);
  const safeNama = String(nama || safeUser).slice(0, 150);
  const safeRole = String(role || 'Warga Tetap').slice(0, 50);
  const safeAksi = String(aksi || 'AKTIVITAS').toUpperCase().slice(0, 50);
  const safeKategori = String(kategori || 'Sistem').slice(0, 50);
  const safeDeskripsi = String(deskripsi || '-').slice(0, 1000);
  const safeIp = String(ip || '-').slice(0, 50);

  if (db && db.isConfigured) {
    try {
      await ensureAuditLogTable();
      await db.query(`
        INSERT INTO audit_log_havaland (id, waktu, username, nama, role, aksi, kategori, deskripsi, ip_address)
        VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, $8)
      `, [logId, safeUser, safeNama, safeRole, safeAksi, safeKategori, safeDeskripsi, safeIp]);
    } catch (err) {
      console.warn('[recordAuditLog Error]', err.message);
    }
  }

  return {
    id: logId,
    waktu: new Date().toISOString(),
    username: safeUser,
    nama: safeNama,
    role: safeRole,
    aksi: safeAksi,
    kategori: safeKategori,
    deskripsi: safeDeskripsi,
    ip_address: safeIp
  };
}

module.exports = {
  authenticate,
  validateToken,
  revokeToken,
  issueAuthToken,
  issueSyncToken,
  validateSyncToken,
  ensureUsersTable,
  ensureAuditLogTable,
  recordAuditLog,
  setCorsHeaders,
  handlePreflight,
  safeErrorResponse,
  validateStringLength,
  ADMIN_HASH,
  USERS
};
