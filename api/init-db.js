const db = require('./db');
const fs = require('fs');
const path = require('path');

module.exports = async function handler(req, res) {
  if (!db.isConfigured) {
    return res.status(200).json({
      success: false,
      message: "Database belum terhubung. Silakan tambahkan POSTGRES_URL di Environment Variables Vercel.",
      isConfigured: false
    });
  }

  try {
    // 1. Create Tables
    await db.query(`
      CREATE TABLE IF NOT EXISTS transaksi_kas (
        id VARCHAR(50) PRIMARY KEY,
        tanggal DATE NOT NULL,
        jenis VARCHAR(20) NOT NULL,
        kategori VARCHAR(100) NOT NULL,
        uraian TEXT NOT NULL,
        nominal BIGINT NOT NULL,
        metode VARCHAR(50) DEFAULT 'Transfer Mandiri',
        pj VARCHAR(100) DEFAULT 'Bendahara (Citra L.)',
        bukti VARCHAR(100),
        status VARCHAR(30) DEFAULT 'Verified',
        catatan TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS warga_havaland (
        id VARCHAR(50) PRIMARY KEY,
        blok VARCHAR(20) NOT NULL,
        cluster VARCHAR(100) NOT NULL,
        nama_kk VARCHAR(150) NOT NULL,
        status_hunian VARCHAR(50) DEFAULT 'Tetap',
        jabatan VARCHAR(100) DEFAULT 'Warga',
        jumlah_jiwa INT DEFAULT 1,
        kontak VARCHAR(50),
        plat_kendaraan JSONB DEFAULT '[]'::jsonb,
        status_iuran VARCHAR(50) DEFAULT 'Lunas',
        iuran_bulan_ini BOOLEAN DEFAULT TRUE,
        terakhir_bayar VARCHAR(100),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS kegiatan_rutin (
        id VARCHAR(50) PRIMARY KEY,
        judul VARCHAR(200) NOT NULL,
        kategori VARCHAR(100) NOT NULL,
        tipe VARCHAR(50) DEFAULT 'Rutin',
        frekuensi VARCHAR(150),
        waktu_next VARCHAR(150),
        lokasi VARCHAR(200),
        koordinator VARCHAR(150),
        deskripsi TEXT,
        status_badge VARCHAR(50),
        jadwal_piket JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS aspirasi_warga (
        id VARCHAR(50) PRIMARY KEY,
        pelapor VARCHAR(150) NOT NULL,
        kategori VARCHAR(100) NOT NULL,
        judul TEXT NOT NULL,
        tanggal DATE DEFAULT CURRENT_DATE,
        status VARCHAR(50) DEFAULT 'Diproses',
        tanggapan TEXT DEFAULT 'Laporan telah diterima sistem dan dalam penanganan pengurus RT.',
        urgensi VARCHAR(50) DEFAULT 'Sedang',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Check if already seeded
    const countCheck = await db.query('SELECT count(*) FROM transaksi_kas');
    if (parseInt(countCheck.rows[0].count, 10) === 0) {
      // Seed default transactions
      await db.query(`
        INSERT INTO transaksi_kas (id, tanggal, jenis, kategori, uraian, nominal, metode, pj, bukti, status, catatan)
        VALUES
        ('TRX-202609-001', '2026-09-22', 'masuk', 'Iuran Warga', 'Iuran Bulanan September - Bpk. Bambang Sujarwo (Blok A-01)', 350000, 'Transfer Mandiri', 'Bendahara (Citra L.)', 'KWT-SEP-001', 'Verified', 'Iuran keamanan & kebersihan bulan September'),
        ('TRX-202609-002', '2026-09-21', 'keluar', 'Fasilitas & PJU', 'Penggantian 4 Titik Lampu LED PJU Jalan Utama Blok B & C', 680000, 'Tunai / Nota Toko', 'Koor Fasum (Rian)', 'NOTA-ELEK-882', 'Verified', 'Lampu Philips LED 40W Outdoor + ongkos pasang teknisi'),
        ('TRX-202609-003', '2026-09-20', 'masuk', 'Iuran Warga', 'Iuran Kolektif 3 Bulan (Sep-Nov) - Bpk. Hendra Wijaya (Blok C-08)', 1050000, 'Transfer BCA', 'Bendahara (Citra L.)', 'KWT-SEP-002', 'Verified', 'Dibayarkan di muka untuk 3 bulan'),
        ('TRX-202609-004', '2026-09-19', 'keluar', 'Kebersihan & Taman', 'Beli Alat Kebersihan & Obat Rumput Fasum Taman Havaland', 320000, 'Tunai', 'Koor Kebersihan (Joko S.)', 'NOTA-TANI-341', 'Verified', 'Herbisida ramah lingkungan, kantong sampah jumbo, kawat sikat'),
        ('TRX-202609-005', '2026-09-17', 'masuk', 'Sewa Fasum', 'Sewa Lapangan Badminton / Balai Warga untuk Acara Keluarga', 300000, 'Transfer Mandiri', 'Sekretaris (Rahmat H.)', 'KWT-FAS-014', 'Verified', 'Warga Blok D-02 (Keluarga dr. Alvin)'),
        ('TRX-202609-006', '2026-09-15', 'keluar', 'Keamanan & Satpam', 'Gaji & Insentif 3 Petugas Satpam Periode 1-15 September', 2400000, 'Transfer', 'Bendahara (Citra L.)', 'SLIP-SEC-SEP1', 'Verified', 'Pak Surya (Danru), Pak Herman, Pak Dedi'),
        ('TRX-202609-007', '2026-09-12', 'keluar', 'Listrik & Air', 'Token Listrik Pos Satpam & Pompa Otomatis Kolam Resapan', 450000, 'PLN Mobile', 'Bendahara (Citra L.)', 'STRUK-PLN-993', 'Verified', 'Token 500rb admin 2500'),
        ('TRX-202609-008', '2026-09-10', 'masuk', 'Donasi Warga', 'Donasi Sukarela Pengadaan Tong Sampah Terpilah dari H. Syarifudin', 1500000, 'Tunai', 'Ketua RT (Bambang S.)', 'KWT-DON-008', 'Verified', 'Dialokasikan untuk 6 titik tong sampah organik/anorganik'),
        ('TRX-202609-009', '2026-09-08', 'keluar', 'Sosial & Warga', 'Santunan Tali Kasih Warga Sakit Opname (Ibu Ratna Blok B-12)', 500000, 'Tunai', 'Seksi Sosial (Ibu Rina)', 'TANDA-TERIMA-04', 'Verified', 'Sesuai kesepakatan tata tertib dana sosial warga'),
        ('TRX-202609-010', '2026-09-05', 'keluar', 'Kebersihan & Sampah', 'Retribusi Pengangkutan Truk Sampah DLH Bulan September', 1200000, 'Transfer Rek Dishub/DLH', 'Koor Kebersihan (Joko S.)', 'RESI-DLH-8921', 'Verified', 'Pengangkutan 3x seminggu terjadwal'),
        ('TRX-202609-011', '2026-09-02', 'masuk', 'Iuran Warga', 'Iuran Kolektif Awal Bulan Warga Blok A & Blok B (28 KK)', 9800000, 'Transfer Terpadu', 'Bendahara (Citra L.)', 'KWT-REKAP-09A', 'Verified', '28 KK x Rp 350.000'),
        ('TRX-202608-012', '2026-08-28', 'keluar', 'Fasilitas & PJU', 'Maintenance Berkala Barrier Gate Otomatis & Servis 8 Titik CCTV', 1450000, 'Transfer Vendor', 'Koor Keamanan (Kapten Anton)', 'INV-CCTV-MEDAN', 'Verified', 'Pembersihan lensa dome, ganti kabel LAN pos satpam')
      `);
    }

    return res.status(200).json({
      success: true,
      message: "Database tabel & indeks berhasil diinisialisasi!",
      isConfigured: true
    });
  } catch (error) {
    console.error("Database Init Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
