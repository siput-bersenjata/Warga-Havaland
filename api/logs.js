/**
 * Audit Log API Endpoint — GET /api/logs, POST /api/logs
 *
 * Catatan jejak aktivitas seluruh akun di portal Havaland.
 * KEAMANAN: HANYA Administrator RT yang diizinkan melihat data log sistem.
 */
const db = require('./db');
const { validateToken, setCorsHeaders, handlePreflight, safeErrorResponse, ensureAuditLogTable, recordAuditLog } = require('./middleware/auth');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  setCorsHeaders(res);

  if (handlePreflight(req, res)) return;

  const authHeader = req.headers.authorization || req.headers['Authorization'] || req.headers['x-sync-token'];
  const currentUser = validateToken(authHeader);

  // =========================================================================
  // GET: Ambil daftar audit log (HANYA KHUSUS ADMINISTRATOR RT)
  // =========================================================================
  if (req.method === 'GET') {
    if (!currentUser) {
      return safeErrorResponse(res, 401, "Akses ditolak. Sesi login diperlukan untuk melihat audit log sistem.");
    }

    if (!currentUser.isAdmin) {
      return safeErrorResponse(res, 403, "Akses ditolak. Halaman audit log dan riwayat aktivitas sistem hanya dapat diakses oleh Administrator RT.");
    }

    const defaultAuditLogs = [
      {
        id: "LOG-INIT-001",
        waktu: new Date(Date.now() - 3600000 * 2).toISOString(),
        username: "admin",
        nama: "Admin RT 04 Havaland",
        role: "Administrator RT",
        aksi: "LOGIN",
        kategori: "Autentikasi",
        deskripsi: "Administrator RT (@admin) berhasil masuk ke sistem dengan hak akses penuh.",
        ip_address: "127.0.0.1"
      },
      {
        id: "LOG-INIT-002",
        waktu: new Date(Date.now() - 3600000 * 4).toISOString(),
        username: "rt",
        nama: "Bpk. Bambang Sujarwo",
        role: "Pengurus RT",
        aksi: "LOGIN",
        kategori: "Autentikasi",
        deskripsi: "Ketua RT (@rt) berhasil masuk ke sistem untuk monitoring lingkungan.",
        ip_address: "127.0.0.1"
      },
      {
        id: "LOG-INIT-003",
        waktu: new Date(Date.now() - 3600000 * 12).toISOString(),
        username: "bendahara",
        nama: "Ibu Citra Lestari, S.E.",
        role: "Bendahara RT",
        aksi: "KAS_MASUK",
        kategori: "Keuangan Kas",
        deskripsi: "Mencatat kas masuk sebesar Rp 350.000 (Iuran Bulanan September - Bu Tutik Blok D1).",
        ip_address: "127.0.0.1"
      },
      {
        id: "LOG-INIT-004",
        waktu: new Date(Date.now() - 3600000 * 24).toISOString(),
        username: "admin",
        nama: "Admin RT 04 Havaland",
        role: "Administrator RT",
        aksi: "BUAT_AKUN",
        kategori: "Manajemen Akun",
        deskripsi: "Mendaftarkan akun resmi Bendahara RT (@bendahara) untuk pengelolaan kas terpadu.",
        ip_address: "127.0.0.1"
      },
      {
        id: "LOG-INIT-005",
        waktu: new Date(Date.now() - 3600000 * 48).toISOString(),
        username: "rt",
        nama: "Bpk. Bambang Sujarwo",
        role: "Pengurus RT",
        aksi: "TAMBAH_KEGIATAN",
        kategori: "Agenda Kegiatan",
        deskripsi: "Menambahkan jadwal 'Kerja Bakti Lingkungan & Pembersihan Saluran Musim Hujan'.",
        ip_address: "127.0.0.1"
      }
    ];

    if (!db.isConfigured) {
      return res.status(200).json({
        success: true,
        isConfigured: false,
        source: 'local',
        count: defaultAuditLogs.length,
        data: defaultAuditLogs
      });
    }

    try {
      await ensureAuditLogTable();
      const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
      const result = await db.query(
        'SELECT id, waktu, username, nama, role, aksi, kategori, deskripsi, ip_address FROM audit_log_havaland ORDER BY waktu DESC, created_at DESC LIMIT $1',
        [limit]
      );

      const rows = (result.rows && result.rows.length > 0) ? result.rows : defaultAuditLogs;

      return res.status(200).json({
        success: true,
        isConfigured: true,
        source: 'postgres',
        count: rows.length,
        data: rows
      });
    } catch (err) {
      return safeErrorResponse(res, 500, "Gagal mengambil audit log sistem.", err);
    }
  }

  // =========================================================================
  // POST: Catat aktivitas dari akun pengguna yang terotentikasi
  // =========================================================================
  if (req.method === 'POST') {
    if (!currentUser) {
      return safeErrorResponse(res, 401, "Akses ditolak. Sesi login diperlukan untuk mencatat log aktivitas.");
    }

    try {
      const { aksi, kategori, deskripsi } = req.body || {};
      if (!aksi || !deskripsi) {
        return safeErrorResponse(res, 400, "Aksi dan deskripsi aktivitas wajib disertakan.");
      }

      const clientIp = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '-').split(',')[0].trim();
      const logEntry = await recordAuditLog({
        username: currentUser.username,
        nama: currentUser.nama,
        role: currentUser.role,
        aksi,
        kategori,
        deskripsi,
        ip: clientIp
      });

      return res.status(201).json({
        success: true,
        message: "Log aktivitas berhasil dicatat.",
        data: logEntry
      });
    } catch (err) {
      return safeErrorResponse(res, 500, "Gagal mencatat log aktivitas.", err);
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
};
