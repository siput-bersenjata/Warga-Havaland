-- ==============================================================================
-- DATABASE SCHEMA UNTUK SISTEM INFORMASI WARGA PERUMAHAN HAVALAND (RT 04 / RW 08)
-- Kompatibel dengan: Vercel Postgres, Supabase, Neon, Railway, Aiven
-- ==============================================================================

-- 1. TABEL TRANSAKSI KAS KEUANGAN
CREATE TABLE IF NOT EXISTS transaksi_kas (
  id VARCHAR(50) PRIMARY KEY,
  tanggal DATE NOT NULL,
  jenis VARCHAR(20) NOT NULL CHECK (jenis IN ('masuk', 'keluar')),
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

-- 2. TABEL DATA WARGA & KEPENDUDUKAN
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

-- 3. TABEL JADWAL KEGIATAN RUTIN & AGENDA
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

-- 4. TABEL ASPIRASI & LAPORAN FASILITAS RUSAK
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

-- 5. TABEL PENGGUNA & HAK AKSES SISTEM
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

-- Indexing untuk kecepatan filter & live search
CREATE INDEX IF NOT EXISTS idx_transaksi_tanggal ON transaksi_kas(tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_transaksi_jenis ON transaksi_kas(jenis);
CREATE INDEX IF NOT EXISTS idx_warga_blok ON warga_havaland(blok);
CREATE INDEX IF NOT EXISTS idx_aspirasi_tanggal ON aspirasi_warga(tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_pengguna_username ON pengguna_havaland(username);

-- ==============================================================================
-- INITIAL SEED DATA (DATA AWAL)
-- ==============================================================================

-- Seed Transaksi Kas
INSERT INTO transaksi_kas (id, tanggal, jenis, kategori, uraian, nominal, metode, pj, bukti, status, catatan)
VALUES
('TRX-202609-001', '2026-09-22', 'masuk', 'Iuran Warga', 'Iuran Bulanan September - Bu Tutik (Blok D1)', 350000, 'Transfer Mandiri', 'Admin RT 04', 'KWT-SEP-001', 'Verified', 'Iuran keamanan & kebersihan bulan September'),
('TRX-202609-002', '2026-09-21', 'keluar', 'Fasilitas & PJU', 'Penggantian 4 Titik Lampu LED PJU Jalan Blok D & F', 680000, 'Tunai / Nota Toko', 'Pengurus RT', 'NOTA-ELEK-882', 'Verified', 'Lampu Philips LED 40W Outdoor + ongkos pasang teknisi'),
('TRX-202609-003', '2026-09-20', 'masuk', 'Iuran Warga', 'Iuran Kolektif 3 Bulan (Sep-Nov) - Bu Maria (Blok F7)', 1050000, 'Transfer BCA', 'Admin RT 04', 'KWT-SEP-002', 'Verified', 'Dibayarkan di muka untuk 3 bulan'),
('TRX-202609-004', '2026-09-19', 'keluar', 'Kebersihan & Taman', 'Beli Alat Kebersihan & Obat Rumput Fasum Taman Havaland', 320000, 'Tunai', 'Koor Kebersihan', 'NOTA-TANI-341', 'Verified', 'Herbisida ramah lingkungan, kantong sampah jumbo, kawat sikat'),
('TRX-202609-005', '2026-09-17', 'masuk', 'Sewa Fasum', 'Sewa Lapangan Badminton / Balai Warga untuk Acara Keluarga', 300000, 'Transfer Mandiri', 'Pengurus RT', 'KWT-FAS-014', 'Verified', 'Warga Blok D2 (Bu Wati)'),
('TRX-202609-006', '2026-09-15', 'keluar', 'Keamanan & Satpam', 'Gaji & Insentif 3 Petugas Satpam Periode 1-15 September', 2400000, 'Transfer', 'Admin RT 04', 'SLIP-SEC-SEP1', 'Verified', 'Pak Surya (Danru), Pak Herman, Pak Dedi'),
('TRX-202609-007', '2026-09-12', 'keluar', 'Listrik & Air', 'Token Listrik Pos Satpam & Pompa Otomatis Kolam Resapan', 450000, 'PLN Mobile', 'Admin RT 04', 'STRUK-PLN-993', 'Verified', 'Token 500rb admin 2500'),
('TRX-202609-008', '2026-09-10', 'masuk', 'Donasi Warga', 'Donasi Sukarela Pengadaan Tong Sampah Terpilah Fasum Havaland', 1500000, 'Tunai', 'Admin RT 04', 'KWT-DON-008', 'Verified', 'Dialokasikan untuk 6 titik tong sampah organik/anorganik'),
('TRX-202609-009', '2026-09-08', 'keluar', 'Sosial & Warga', 'Santunan Tali Kasih Warga Sakit Opname (Bu Ratna Blok F5)', 500000, 'Tunai', 'Seksi Sosial', 'TANDA-TERIMA-04', 'Verified', 'Sesuai kesepakatan tata tertib dana sosial warga'),
('TRX-202609-010', '2026-09-05', 'keluar', 'Kebersihan & Sampah', 'Retribusi Pengangkutan Truk Sampah DLH Bulan September', 1200000, 'Transfer Rek Dishub/DLH', 'Koor Kebersihan', 'RESI-DLH-8921', 'Verified', 'Pengangkutan 3x seminggu terjadwal'),
('TRX-202609-011', '2026-09-02', 'masuk', 'Iuran Warga', 'Iuran Kolektif Awal Bulan Warga Havaland (22 KK)', 7700000, 'Transfer Terpadu', 'Admin RT 04', 'KWT-REKAP-09A', 'Verified', '22 KK x Rp 350.000'),
('TRX-202608-012', '2026-08-28', 'keluar', 'Fasilitas & PJU', 'Maintenance Berkala Barrier Gate Otomatis & Servis 8 Titik CCTV', 1450000, 'Transfer Vendor', 'Koor Keamanan', 'INV-CCTV-MLG', 'Verified', 'Pembersihan lensa dome, ganti kabel LAN pos satpam')
ON CONFLICT (id) DO NOTHING;

-- Seed Warga Havaland (25 Warga)
INSERT INTO warga_havaland (id, blok, cluster, nama_kk, status_hunian, jabatan, jumlah_jiwa, kontak, plat_kendaraan, status_iuran, iuran_bulan_ini, terakhir_bayar)
VALUES
('W-D01', 'D1', 'Blok D (Jl. Havaland)', 'Bu Tutik', 'Tetap', 'Warga', 3, '-', '["-"]'::jsonb, 'Lunas', true, 'September 2026'),
('W-D02', 'D2', 'Blok D (Jl. Havaland)', 'Bu Wati', 'Tetap', 'Warga', 4, '-', '["-"]'::jsonb, 'Lunas', true, 'September 2026'),
('W-D05', 'D5', 'Blok D (Jl. Havaland)', 'Bu Ami', 'Tetap', 'Warga', 3, '-', '["-"]'::jsonb, 'Lunas', true, 'September 2026'),
('W-D06', 'D6', 'Blok D (Jl. Havaland)', 'Bu Ana', 'Tetap', 'Warga', 2, '-', '["-"]'::jsonb, 'Lunas', true, 'September 2026'),
('W-D08', 'D8', 'Blok D (Jl. Havaland)', 'Bu Diah', 'Tetap', 'Warga', 4, '-', '["-"]'::jsonb, 'Lunas', true, 'September 2026'),
('W-D09', 'D9', 'Blok D (Jl. Havaland)', 'Bu Dewi', 'Tetap', 'Warga', 3, '-', '["-"]'::jsonb, 'Lunas', true, 'September 2026'),
('W-D10', 'D10', 'Blok D (Jl. Havaland)', 'Bu Shinta', 'Tetap', 'Warga', 4, '-', '["-"]'::jsonb, 'Lunas', true, 'September 2026'),
('W-E04', 'E4', 'Blok E (Jl. Havaland)', 'Bu Gini', 'Tetap', 'Warga', 3, '-', '["-"]'::jsonb, 'Belum', false, 'Agustus 2026'),
('W-F04', 'F4', 'Blok F (Jl. Havaland)', 'Bu Tere', 'Tetap', 'Warga', 4, '-', '["-"]'::jsonb, 'Lunas', true, 'September 2026'),
('W-F05', 'F5', 'Blok F (Jl. Havaland)', 'Bu Ratna', 'Tetap', 'Warga', 3, '-', '["-"]'::jsonb, 'Lunas', true, 'September 2026'),
('W-F06', 'F6', 'Blok F (Jl. Havaland)', 'Bu Irma', 'Tetap', 'Warga', 4, '-', '["-"]'::jsonb, 'Lunas', true, 'September 2026'),
('W-F07', 'F7', 'Blok F (Jl. Havaland)', 'Bu Maria', 'Tetap', 'Warga', 3, '-', '["-"]'::jsonb, 'Lunas', true, 'September 2026'),
('W-G02', 'G2', 'Blok G (Jl. Havaland)', 'Bu Pungky', 'Tetap', 'Warga', 4, '-', '["-"]'::jsonb, 'Lunas', true, 'September 2026'),
('W-G04', 'G4', 'Blok G (Jl. Havaland)', 'Bu Aisyah', 'Tetap', 'Warga', 3, '-', '["-"]'::jsonb, 'Lunas', true, 'September 2026'),
('W-G05', 'G5', 'Blok G (Jl. Havaland)', 'Bu Mely', 'Tetap', 'Warga', 3, '-', '["-"]'::jsonb, 'Lunas', true, 'September 2026'),
('W-G06', 'G6', 'Blok G (Jl. Havaland)', 'Bu Jean', 'Tetap', 'Warga', 2, '-', '["-"]'::jsonb, 'Lunas', true, 'September 2026'),
('W-G07', 'G7', 'Blok G (Jl. Havaland)', 'Bu Melda', 'Tetap', 'Warga', 4, '-', '["-"]'::jsonb, 'Belum', false, 'Agustus 2026'),
('W-H06', 'H6', 'Blok H (Jl. Havaland)', 'Bu Lina', 'Tetap', 'Warga', 3, '-', '["-"]'::jsonb, 'Lunas', true, 'September 2026'),
('W-H10', 'H10', 'Blok H (Jl. Havaland)', 'Bu Iin', 'Tetap', 'Warga', 4, '-', '["-"]'::jsonb, 'Lunas', true, 'September 2026'),
('W-I03', 'I3', 'Blok I (Jl. Havaland)', 'Bu Nia', 'Tetap', 'Warga', 3, '-', '["-"]'::jsonb, 'Lunas', true, 'September 2026'),
('W-I08', 'I8', 'Blok I (Jl. Havaland)', 'Bu Lia', 'Tetap', 'Warga', 4, '-', '["-"]'::jsonb, 'Lunas', true, 'September 2026'),
('W-J01', 'J1', 'Blok J (Jl. Havaland)', 'Bu Sulaicha', 'Tetap', 'Warga', 3, '-', '["-"]'::jsonb, 'Lunas', true, 'September 2026'),
('W-J07', 'J7', 'Blok J (Jl. Havaland)', 'Bu Sulis', 'Tetap', 'Warga', 4, '-', '["-"]'::jsonb, 'Lunas', true, 'September 2026'),
('W-J10', 'J10', 'Blok J (Jl. Havaland)', 'Bu Tanti', 'Tetap', 'Warga', 3, '-', '["-"]'::jsonb, 'Belum', false, 'Agustus 2026'),
('W-I1011', 'I10-11', 'Blok I (Jl. Havaland)', 'Bu Natali', 'Tetap', 'Warga', 5, '-', '["-"]'::jsonb, 'Lunas', true, 'September 2026')
ON CONFLICT (id) DO NOTHING;

-- Seed Aspirasi
INSERT INTO aspirasi_warga (id, pelapor, kategori, judul, tanggal, status, tanggapan, urgensi)
VALUES
('ASP-001', 'Bu Shinta (Blok D10)', 'Penerangan Jalan (PJU)', 'Lampu PJU di dekat belokan Blok D & F agak berkedip saat hujan', '2026-09-21', 'Diproses', 'Sudah dijadwalkan teknisi untuk dicek sambungan kabelnya Sabtu ini.', 'Sedang'),
('ASP-002', 'Bu Pungky (Blok G2)', 'Taman & Lingkungan', 'Dahan pohon palem di median taman Blok G menutupi cermin cembung', '2026-09-18', 'Selesai', 'Sudah dipangkas rapi oleh petugas kebersihan dan satpam tanggal 19 Sep.', 'Penting'),
('ASP-003', 'Bu Tere (Blok F4)', 'Keamanan', 'Usul penambahan sensor barcode tamu di pos satpam depan', '2026-09-14', 'Ditinjau', 'Akan dibahas pada Rapat Pleno Triwulan 17 Oktober 2026.', 'Rendah')
ON CONFLICT (id) DO NOTHING;

-- Seed Akun Default Admin RT
INSERT INTO pengguna_havaland (id, username, password_hash, nama, role, blok, is_admin)
VALUES
('USR-ADMIN-01', 'admin', '5d34f17cb4318d6afabdd2db5296372fc55c87be9591fdd57af1771eaef123f9', 'Admin RT 04 Havaland', 'Admin RT', 'Kantor RT', TRUE)
ON CONFLICT (username) DO NOTHING;

