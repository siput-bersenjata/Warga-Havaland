const db = require('./db');
const { setCorsHeaders, handlePreflight, safeErrorResponse } = require('./middleware/auth');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  setCorsHeaders(res);

  if (handlePreflight(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!db.isConfigured) {
    return res.status(200).json({
      connected: false,
      message: "Database belum terhubung ke Vercel Postgres/Supabase. Menggunakan data lokal.",
      source: "local"
    });
  }

  try {
    // 1. Ambil transaksi dari database
    const trxRes = await db.query('SELECT * FROM transaksi_kas ORDER BY tanggal DESC, created_at DESC');
    
    // 2. Ambil aspirasi dari database
    const aspRes = await db.query('SELECT * FROM aspirasi_warga ORDER BY tanggal DESC, created_at DESC');

    // 3. Hitung saldo dan rekap kas terkini
    let totalMasuk = 0;
    let totalKeluar = 0;
    trxRes.rows.forEach(t => {
      const nom = parseInt(t.nominal, 10) || 0;
      if (t.jenis === 'masuk') totalMasuk += nom;
      else totalKeluar += nom;
    });

    const saldo = 43900000 + (totalMasuk - totalKeluar);

    return res.status(200).json({
      connected: true,
      source: "postgres",
      transaksi: trxRes.rows,
      aspirasi: aspRes.rows,
      kasSummary: {
        saldoSaatIni: saldo,
        pemasukanBulanIni: totalMasuk,
        pengeluaranBulanIni: totalKeluar,
        targetIuranBulanIni: 15750000,
        wargaSudahBayar: 41,
        totalKK: 45
      }
    });
  } catch (error) {
    return safeErrorResponse(res, 500, "Gagal mengambil data.", error);
  }
};
