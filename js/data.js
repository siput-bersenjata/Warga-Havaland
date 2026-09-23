/**
 * Data Terpusat Warga Perumahan Havaland
 * Lingkungan RT 04 / RW 08
 * Alamat: 4J58+37W, Babaan, Ngenep, Kec. Karang Ploso, Kabupaten Malang, Jawa Timur 65152
 */

const HavalandData = {
  profile: {
    namaPerumahan: "Perumahan Havaland",
    lingkungan: "RT 04 / RW 08",
    alamatLengkap: "4J58+37W, Babaan, Ngenep, Kec. Karang Ploso, Kabupaten Malang, Jawa Timur 65152",
    plusCode: "4J58+37W",
    dusun: "Babaan",
    desa: "Ngenep",
    kecamatan: "Karang Ploso",
    kabupaten: "Malang",
    kota: "Kabupaten Malang",
    provinsi: "Jawa Timur",
    kodePos: "65152",
    rekeningKas: {
      bank: "Bank Mandiri",
      nomorRekening: "106-00-9823412-1",
      atasNama: "KAS RT 04 WARGA HAVALAND"
    },
    kontakDarurat: [
      { nama: "Pos Keamanan / Satpam 24 Jam", nomor: "0812-6001-9981", wa: "6281260019981", role: "Keamanan Utama", icon: "shield" },
      { nama: "Ketua RT (Bpk. Bambang Sujarwo)", nomor: "0813-7544-2211", wa: "6281375442211", role: "Ketua RT 04", icon: "user-check" },
      { nama: "Bendahara Kas (Ibu Citra Lestari)", nomor: "0821-6577-8899", wa: "6282165778899", role: "Bendahara Kas", icon: "wallet" },
      { nama: "Sekretaris RT (Bpk. Rahmat Hidayat)", nomor: "0852-9811-3456", wa: "6285298113456", role: "Sekretaris", icon: "file-text" },
      { nama: "Koordinator Kebersihan (Bpk. Joko Santoso)", nomor: "0812-6543-7722", wa: "6281265437722", role: "Koor Kebersihan", icon: "trash-2" },
      { nama: "Polsek Karang Ploso", nomor: "0341-461110", wa: "", role: "Kepolisian (Polsek Karang Ploso)", icon: "phone-call" },
      { nama: "Pemadam Kebakaran (Damkar Kab. Malang)", nomor: "113 / 0341-366113", wa: "", role: "Darurat Api (Damkar)", icon: "flame" },
      { nama: "Puskesmas & IGD Karang Ploso", nomor: "118 / 0341-461320", wa: "", role: "Medis Darurat (Karang Ploso)", icon: "activity" }
    ]
  },

  // DATA KAS KEUANGAN
  kasSummary: {
    saldoSaatIni: 48750000,
    pemasukanBulanIni: 7700000,
    pengeluaranBulanIni: 5800000,
    targetIuranBulanIni: 8750000,
    wargaSudahBayar: 22,
    totalKK: 25,
    iuranPerBulan: 350000,
    chartMonthly: [
      { bulan: "Apr 2026", masuk: 14200000, keluar: 8900000, saldo: 41400000 },
      { bulan: "Mei 2026", masuk: 15100000, keluar: 11200000, saldo: 45300000 },
      { bulan: "Jun 2026", masuk: 14850000, keluar: 9450000, saldo: 50700000 },
      { bulan: "Jul 2026", masuk: 16500000, keluar: 14300000, saldo: 52900000 },
      { bulan: "Agu 2026", masuk: 15400000, keluar: 10200000, saldo: 58100000 },
      { bulan: "Sep 2026", masuk: 14650000, keluar: 9800000, saldo: 48750000 }
    ],
    kategoriPengeluaranPersen: [
      { kategori: "Honor Satpam (3 Personel)", persen: 48, nominal: 4700000, warna: "#0D9488" },
      { kategori: "Kebersihan & Retribusi Sampah", persen: 24, nominal: 2350000, warna: "#10B981" },
      { kategori: "Listrik PJU & Pompa Fasum", persen: 12, nominal: 1175000, warna: "#F59E0B" },
      { kategori: "Perawatan CCTV & Portal Otomatis", persen: 9, nominal: 885000, warna: "#6366F1" },
      { kategori: "Dana Sosial & Konsumsi Kegiatan", persen: 7, nominal: 690000, warna: "#EC4899" }
    ]
  },

  // DETAIL TRANSAKSI KAS
  transaksi: [
    {
      id: "TRX-202609-001",
      tanggal: "2026-09-22",
      jenis: "masuk",
      kategori: "Iuran Warga",
      uraian: "Iuran Bulanan September - Bu Tutik (Blok D1)",
      nominal: 350000,
      metode: "Transfer Mandiri",
      pj: "Admin RT 04",
      bukti: "KWT-SEP-001",
      status: "Verified",
      catatan: "Iuran keamanan & kebersihan bulan September"
    },
    {
      id: "TRX-202609-002",
      tanggal: "2026-09-21",
      jenis: "keluar",
      kategori: "Fasilitas & PJU",
      uraian: "Penggantian 4 Titik Lampu LED PJU Jalan Blok D & F",
      nominal: 680000,
      metode: "Tunai / Nota Toko",
      pj: "Pengurus RT",
      bukti: "NOTA-ELEK-882",
      status: "Verified",
      catatan: "Lampu Philips LED 40W Outdoor + ongkos pasang teknisi"
    },
    {
      id: "TRX-202609-003",
      tanggal: "2026-09-20",
      jenis: "masuk",
      kategori: "Iuran Warga",
      uraian: "Iuran Kolektif 3 Bulan (Sep-Nov) - Bu Maria (Blok F7)",
      nominal: 1050000,
      metode: "Transfer BCA",
      pj: "Admin RT 04",
      bukti: "KWT-SEP-002",
      status: "Verified",
      catatan: "Dibayarkan di muka untuk 3 bulan"
    },
    {
      id: "TRX-202609-004",
      tanggal: "2026-09-19",
      jenis: "keluar",
      kategori: "Kebersihan & Taman",
      uraian: "Beli Alat Kebersihan & Obat Rumput Fasum Taman Havaland",
      nominal: 320000,
      metode: "Tunai",
      pj: "Koor Kebersihan",
      bukti: "NOTA-TANI-341",
      status: "Verified",
      catatan: "Herbisida ramah lingkungan, kantong sampah jumbo, kawat sikat"
    },
    {
      id: "TRX-202609-005",
      tanggal: "2026-09-17",
      jenis: "masuk",
      kategori: "Sewa Fasum",
      uraian: "Sewa Lapangan Badminton / Balai Warga untuk Acara Keluarga",
      nominal: 300000,
      metode: "Transfer Mandiri",
      pj: "Sekretaris (Rahmat H.)",
      bukti: "KWT-FAS-014",
      status: "Verified",
      catatan: "Warga Blok D2 (Bu Wati)"
    },
    {
      id: "TRX-202609-006",
      tanggal: "2026-09-15",
      jenis: "keluar",
      kategori: "Keamanan & Satpam",
      uraian: "Gaji & Insentif 3 Petugas Satpam Periode 1-15 September",
      nominal: 2400000,
      metode: "Transfer",
      pj: "Admin RT 04",
      bukti: "SLIP-SEC-SEP1",
      status: "Verified",
      catatan: "Pak Surya (Danru), Pak Herman, Pak Dedi"
    },
    {
      id: "TRX-202609-007",
      tanggal: "2026-09-12",
      jenis: "keluar",
      kategori: "Listrik & Air",
      uraian: "Token Listrik Pos Satpam & Pompa Otomatis Kolam Resapan",
      nominal: 450000,
      metode: "PLN Mobile",
      pj: "Admin RT 04",
      bukti: "STRUK-PLN-993",
      status: "Verified",
      catatan: "Token 500rb admin 2500"
    },
    {
      id: "TRX-202609-008",
      tanggal: "2026-09-10",
      jenis: "masuk",
      kategori: "Donasi Warga",
      uraian: "Donasi Sukarela Pengadaan Tong Sampah Terpilah Fasum Havaland",
      nominal: 1500000,
      metode: "Tunai",
      pj: "Admin RT 04",
      bukti: "KWT-DON-008",
      status: "Verified",
      catatan: "Dialokasikan untuk 6 titik tong sampah organik/anorganik"
    },
    {
      id: "TRX-202609-009",
      tanggal: "2026-09-08",
      jenis: "keluar",
      kategori: "Sosial & Warga",
      uraian: "Santunan Tali Kasih Warga Sakit Opname (Bu Ratna Blok F5)",
      nominal: 500000,
      metode: "Tunai",
      pj: "Seksi Sosial",
      bukti: "TANDA-TERIMA-04",
      status: "Verified",
      catatan: "Sesuai kesepakatan tata tertib dana sosial warga"
    },
    {
      id: "TRX-202609-010",
      tanggal: "2026-09-05",
      jenis: "keluar",
      kategori: "Kebersihan & Sampah",
      uraian: "Retribusi Pengangkutan Truk Sampah DLH Bulan September",
      nominal: 1200000,
      metode: "Transfer Rek Dishub/DLH",
      pj: "Koor Kebersihan",
      bukti: "RESI-DLH-8921",
      status: "Verified",
      catatan: "Pengangkutan 3x seminggu terjadwal"
    },
    {
      id: "TRX-202609-011",
      tanggal: "2026-09-02",
      jenis: "masuk",
      kategori: "Iuran Warga",
      uraian: "Iuran Kolektif Awal Bulan Warga Havaland (22 KK)",
      nominal: 7700000,
      metode: "Transfer Terpadu",
      pj: "Admin RT 04",
      bukti: "KWT-REKAP-09A",
      status: "Verified",
      catatan: "22 KK x Rp 350.000"
    },
    {
      id: "TRX-202608-012",
      tanggal: "2026-08-28",
      jenis: "keluar",
      kategori: "Fasilitas & PJU",
      uraian: "Maintenance Berkala Barrier Gate Otomatis & Servis 8 Titik CCTV",
      nominal: 1450000,
      metode: "Transfer Vendor",
      pj: "Koor Keamanan",
      bukti: "INV-CCTV-MLG",
      status: "Verified",
      catatan: "Pembersihan lensa dome, ganti kabel LAN pos satpam"
    }
  ],

  // JADWAL KEGIATAN RUTIN & AGENDA
  kegiatan: [
    {
      id: "ACT-001",
      judul: "Ronda Malam / Siskamling Bergilir",
      kategori: "Keamanan",
      tipe: "Rutin",
      frekuensi: "Setiap Malam (23.00 - 04.00 WIB)",
      waktuNext: "Malam ini, 23.00 WIB",
      lokasi: "Pos Satpam Utama & Keliling Kompleks",
      koordinator: "Pos Keamanan RT 04",
      jadwalPiket: [
        { hari: "Senin", blok: "Warga Blok D (D1 - D10)", petugas: "Bu Tutik, Bu Wati, Bu Ami" },
        { hari: "Selasa", blok: "Warga Blok E & F (E4, F4 - F5)", petugas: "Bu Gini, Bu Tere, Bu Ratna" },
        { hari: "Rabu", blok: "Warga Blok F (F6 - F7)", petugas: "Bu Irma, Bu Maria" },
        { hari: "Kamis", blok: "Warga Blok G (G2 - G7)", petugas: "Bu Pungky, Bu Aisyah, Bu Mely, Bu Jean" },
        { hari: "Jumat", blok: "Warga Blok H (H6 - H10)", petugas: "Bu Lina, Bu Iin" },
        { hari: "Sabtu", blok: "Warga Blok I (I3, I8, I10-11)", petugas: "Bu Nia, Bu Lia, Bu Natali" },
        { hari: "Minggu", blok: "Warga Blok J (J1 - J10)", petugas: "Bu Sulaicha, Bu Sulis, Bu Tanti" }
      ],
      deskripsi: "Patroli bersama anggota satpam bertugas menjaga ketertiban, cek gembok portal samping, dan monitoring pantauan CCTV.",
      statusBadge: "Wajib Tiap Blok"
    },
    {
      id: "ACT-002",
      judul: "Senam Sehat Bugar Bersama Instruktur",
      kategori: "Olahraga",
      tipe: "Rutin",
      frekuensi: "Setiap Minggu Pagi (06.30 - 08.00 WIB)",
      waktuNext: "Minggu, 27 Sep 2026 - 06.30 WIB",
      lokasi: "Taman Utama & Lapangan Fasum Havaland",
      koordinator: "Ibu Maya & Ibu Rina (Seksi Kesehatan)",
      deskripsi: "Senam aerobik dan zumba sehat untuk seluruh bapak, ibu, serta anak-anak. Disediakan infused water dan bubur kacang hijau bersama.",
      statusBadge: "Gratis untuk Warga"
    },
    {
      id: "ACT-003",
      judul: "Kerja Bakti Lingkungan & Fogging Nyamuk DBD",
      kategori: "Kebersihan",
      tipe: "Bulanan",
      frekuensi: "Minggu Pertama Awal Bulan (07.00 - 10.30 WIB)",
      waktuNext: "Minggu, 04 Okt 2026 - 07.00 WIB",
      lokasi: "Saluran Drainase Utama Blok A s/d D & Taman",
      koordinator: "Bpk. Joko Santoso (Koor Lingkungan)",
      deskripsi: "Pembersihan selokan dari endapan lumpur menjelang musim hujan dan fogging dari Puskesmas. Dimohon membawa cangkul/sekop kecil.",
      statusBadge: "Agenda Terjadwal"
    },
    {
      id: "ACT-004",
      judul: "Pengangkutan Sampah Rumah Tangga",
      kategori: "Kebersihan",
      tipe: "Rutin",
      frekuensi: "3x Seminggu (Senin, Rabu, Sabtu pukul 08.00 - 11.00 WIB)",
      waktuNext: "Sabtu, 26 Sep 2026 - Pagi",
      lokasi: "Depan Pagar Rumah Masing-Masing",
      koordinator: "Petugas Kebersihan Kelurahan & Satpam",
      deskripsi: "Mohon sampah sudah diikat rapi dalam kantong plastik dan diletakkan di dalam tong sampah depan pagar.",
      statusBadge: "Layanan Rutin"
    },
    {
      id: "ACT-005",
      judul: "Pengajian & Doa Bersama Warga Havaland",
      kategori: "Keagamaan",
      tipe: "Rutin",
      frekuensi: "Malam Jumat ke-2 & ke-4 (19.45 WIB Ba'da Isya)",
      waktuNext: "Kamis, 08 Okt 2026 - 19.45 WIB",
      lokasi: "Musholla Al-Ikhlas Havaland",
      koordinator: "Bpk. H. Syarifudin",
      deskripsi: "Tadarus, tausiyah singkat, dan doa keselamatan bersama warga perumahan dilanjutkan ramah tamah hangat.",
      statusBadge: "Terbuka untuk Umum"
    },
    {
      id: "ACT-006",
      judul: "Rapat Pleno Triwulan & Laporan Pertanggungjawaban Kas",
      kategori: "Pertemuan",
      tipe: "Triwulanan",
      frekuensi: "Akhir Triwulan (Sabtu Malam 20.00 WIB)",
      waktuNext: "Sabtu, 17 Okt 2026 - 20.00 WIB",
      lokasi: "Balai Warga / Gazebo Fasum Havaland",
      koordinator: "Pengurus RT 04 (Bpk. Bambang S.)",
      deskripsi: "Pemaparan transparansi keuangan kas, evaluasi keamanan portal, serta pembahasan rencana kanopi lapangan olahraga.",
      statusBadge: "Penting"
    }
  ],

  // DATA DAFTAR WARGA PERUMAHAN HAVALAND
  warga: [
    {
      id: "W-D01",
      blok: "D1",
      cluster: "Blok D (Jl. Havaland)",
      namaKK: "Bu Tutik",
      statusHunian: "Tetap",
      jabatan: "Warga",
      jumlahJiwa: 3,
      kontak: "-",
      platKendaraan: ["-"],
      statusIuran: "Lunas",
      iuranBulanIni: true,
      terakhirBayar: "September 2026"
    },
    {
      id: "W-D02",
      blok: "D2",
      cluster: "Blok D (Jl. Havaland)",
      namaKK: "Bu Wati",
      statusHunian: "Tetap",
      jabatan: "Warga",
      jumlahJiwa: 4,
      kontak: "-",
      platKendaraan: ["-"],
      statusIuran: "Lunas",
      iuranBulanIni: true,
      terakhirBayar: "September 2026"
    },
    {
      id: "W-D05",
      blok: "D5",
      cluster: "Blok D (Jl. Havaland)",
      namaKK: "Bu Ami",
      statusHunian: "Tetap",
      jabatan: "Warga",
      jumlahJiwa: 3,
      kontak: "-",
      platKendaraan: ["-"],
      statusIuran: "Lunas",
      iuranBulanIni: true,
      terakhirBayar: "September 2026"
    },
    {
      id: "W-D06",
      blok: "D6",
      cluster: "Blok D (Jl. Havaland)",
      namaKK: "Bu Ana",
      statusHunian: "Tetap",
      jabatan: "Warga",
      jumlahJiwa: 2,
      kontak: "-",
      platKendaraan: ["-"],
      statusIuran: "Lunas",
      iuranBulanIni: true,
      terakhirBayar: "September 2026"
    },
    {
      id: "W-D08",
      blok: "D8",
      cluster: "Blok D (Jl. Havaland)",
      namaKK: "Bu Diah",
      statusHunian: "Tetap",
      jabatan: "Warga",
      jumlahJiwa: 4,
      kontak: "-",
      platKendaraan: ["-"],
      statusIuran: "Lunas",
      iuranBulanIni: true,
      terakhirBayar: "September 2026"
    },
    {
      id: "W-D09",
      blok: "D9",
      cluster: "Blok D (Jl. Havaland)",
      namaKK: "Bu Dewi",
      statusHunian: "Tetap",
      jabatan: "Warga",
      jumlahJiwa: 3,
      kontak: "-",
      platKendaraan: ["-"],
      statusIuran: "Lunas",
      iuranBulanIni: true,
      terakhirBayar: "September 2026"
    },
    {
      id: "W-D10",
      blok: "D10",
      cluster: "Blok D (Jl. Havaland)",
      namaKK: "Bu Shinta",
      statusHunian: "Tetap",
      jabatan: "Warga",
      jumlahJiwa: 4,
      kontak: "-",
      platKendaraan: ["-"],
      statusIuran: "Lunas",
      iuranBulanIni: true,
      terakhirBayar: "September 2026"
    },
    {
      id: "W-E04",
      blok: "E4",
      cluster: "Blok E (Jl. Havaland)",
      namaKK: "Bu Gini",
      statusHunian: "Tetap",
      jabatan: "Warga",
      jumlahJiwa: 3,
      kontak: "-",
      platKendaraan: ["-"],
      statusIuran: "Belum",
      iuranBulanIni: false,
      terakhirBayar: "Agustus 2026"
    },
    {
      id: "W-F04",
      blok: "F4",
      cluster: "Blok F (Jl. Havaland)",
      namaKK: "Bu Tere",
      statusHunian: "Tetap",
      jabatan: "Warga",
      jumlahJiwa: 4,
      kontak: "-",
      platKendaraan: ["-"],
      statusIuran: "Lunas",
      iuranBulanIni: true,
      terakhirBayar: "September 2026"
    },
    {
      id: "W-F05",
      blok: "F5",
      cluster: "Blok F (Jl. Havaland)",
      namaKK: "Bu Ratna",
      statusHunian: "Tetap",
      jabatan: "Warga",
      jumlahJiwa: 3,
      kontak: "-",
      platKendaraan: ["-"],
      statusIuran: "Lunas",
      iuranBulanIni: true,
      terakhirBayar: "September 2026"
    },
    {
      id: "W-F06",
      blok: "F6",
      cluster: "Blok F (Jl. Havaland)",
      namaKK: "Bu Irma",
      statusHunian: "Tetap",
      jabatan: "Warga",
      jumlahJiwa: 4,
      kontak: "-",
      platKendaraan: ["-"],
      statusIuran: "Lunas",
      iuranBulanIni: true,
      terakhirBayar: "September 2026"
    },
    {
      id: "W-F07",
      blok: "F7",
      cluster: "Blok F (Jl. Havaland)",
      namaKK: "Bu Maria",
      statusHunian: "Tetap",
      jabatan: "Warga",
      jumlahJiwa: 3,
      kontak: "-",
      platKendaraan: ["-"],
      statusIuran: "Lunas",
      iuranBulanIni: true,
      terakhirBayar: "September 2026"
    },
    {
      id: "W-G02",
      blok: "G2",
      cluster: "Blok G (Jl. Havaland)",
      namaKK: "Bu Pungky",
      statusHunian: "Tetap",
      jabatan: "Warga",
      jumlahJiwa: 4,
      kontak: "-",
      platKendaraan: ["-"],
      statusIuran: "Lunas",
      iuranBulanIni: true,
      terakhirBayar: "September 2026"
    },
    {
      id: "W-G04",
      blok: "G4",
      cluster: "Blok G (Jl. Havaland)",
      namaKK: "Bu Aisyah",
      statusHunian: "Tetap",
      jabatan: "Warga",
      jumlahJiwa: 3,
      kontak: "-",
      platKendaraan: ["-"],
      statusIuran: "Lunas",
      iuranBulanIni: true,
      terakhirBayar: "September 2026"
    },
    {
      id: "W-G05",
      blok: "G5",
      cluster: "Blok G (Jl. Havaland)",
      namaKK: "Bu Mely",
      statusHunian: "Tetap",
      jabatan: "Warga",
      jumlahJiwa: 3,
      kontak: "-",
      platKendaraan: ["-"],
      statusIuran: "Lunas",
      iuranBulanIni: true,
      terakhirBayar: "September 2026"
    },
    {
      id: "W-G06",
      blok: "G6",
      cluster: "Blok G (Jl. Havaland)",
      namaKK: "Bu Jean",
      statusHunian: "Tetap",
      jabatan: "Warga",
      jumlahJiwa: 2,
      kontak: "-",
      platKendaraan: ["-"],
      statusIuran: "Lunas",
      iuranBulanIni: true,
      terakhirBayar: "September 2026"
    },
    {
      id: "W-G07",
      blok: "G7",
      cluster: "Blok G (Jl. Havaland)",
      namaKK: "Bu Melda",
      statusHunian: "Tetap",
      jabatan: "Warga",
      jumlahJiwa: 4,
      kontak: "-",
      platKendaraan: ["-"],
      statusIuran: "Belum",
      iuranBulanIni: false,
      terakhirBayar: "Agustus 2026"
    },
    {
      id: "W-H06",
      blok: "H6",
      cluster: "Blok H (Jl. Havaland)",
      namaKK: "Bu Lina",
      statusHunian: "Tetap",
      jabatan: "Warga",
      jumlahJiwa: 3,
      kontak: "-",
      platKendaraan: ["-"],
      statusIuran: "Lunas",
      iuranBulanIni: true,
      terakhirBayar: "September 2026"
    },
    {
      id: "W-H10",
      blok: "H10",
      cluster: "Blok H (Jl. Havaland)",
      namaKK: "Bu Iin",
      statusHunian: "Tetap",
      jabatan: "Warga",
      jumlahJiwa: 4,
      kontak: "-",
      platKendaraan: ["-"],
      statusIuran: "Lunas",
      iuranBulanIni: true,
      terakhirBayar: "September 2026"
    },
    {
      id: "W-I03",
      blok: "I3",
      cluster: "Blok I (Jl. Havaland)",
      namaKK: "Bu Nia",
      statusHunian: "Tetap",
      jabatan: "Warga",
      jumlahJiwa: 3,
      kontak: "-",
      platKendaraan: ["-"],
      statusIuran: "Lunas",
      iuranBulanIni: true,
      terakhirBayar: "September 2026"
    },
    {
      id: "W-I08",
      blok: "I8",
      cluster: "Blok I (Jl. Havaland)",
      namaKK: "Bu Lia",
      statusHunian: "Tetap",
      jabatan: "Warga",
      jumlahJiwa: 4,
      kontak: "-",
      platKendaraan: ["-"],
      statusIuran: "Lunas",
      iuranBulanIni: true,
      terakhirBayar: "September 2026"
    },
    {
      id: "W-J01",
      blok: "J1",
      cluster: "Blok J (Jl. Havaland)",
      namaKK: "Bu Sulaicha",
      statusHunian: "Tetap",
      jabatan: "Warga",
      jumlahJiwa: 3,
      kontak: "-",
      platKendaraan: ["-"],
      statusIuran: "Lunas",
      iuranBulanIni: true,
      terakhirBayar: "September 2026"
    },
    {
      id: "W-J07",
      blok: "J7",
      cluster: "Blok J (Jl. Havaland)",
      namaKK: "Bu Sulis",
      statusHunian: "Tetap",
      jabatan: "Warga",
      jumlahJiwa: 4,
      kontak: "-",
      platKendaraan: ["-"],
      statusIuran: "Lunas",
      iuranBulanIni: true,
      terakhirBayar: "September 2026"
    },
    {
      id: "W-J10",
      blok: "J10",
      cluster: "Blok J (Jl. Havaland)",
      namaKK: "Bu Tanti",
      statusHunian: "Tetap",
      jabatan: "Warga",
      jumlahJiwa: 3,
      kontak: "-",
      platKendaraan: ["-"],
      statusIuran: "Belum",
      iuranBulanIni: false,
      terakhirBayar: "Agustus 2026"
    },
    {
      id: "W-I1011",
      blok: "I10-11",
      cluster: "Blok I (Jl. Havaland)",
      namaKK: "Bu Natali",
      statusHunian: "Tetap",
      jabatan: "Warga",
      jumlahJiwa: 5,
      kontak: "-",
      platKendaraan: ["-"],
      statusIuran: "Lunas",
      iuranBulanIni: true,
      terakhirBayar: "September 2026"
    }
  ],

  // LAPORAN & ASPIRASI FASILITAS WARGA
  aspirasi: [
    {
      id: "ASP-001",
      pelapor: "Bu Shinta (Blok D10)",
      kategori: "Penerangan Jalan (PJU)",
      judul: "Lampu PJU di dekat belokan Blok D & F agak berkedip saat hujan",
      tanggal: "2026-09-21",
      status: "Diproses",
      tanggapan: "Sudah dijadwalkan teknisi untuk dicek sambungan kabelnya Sabtu ini.",
      urgensi: "Sedang"
    },
    {
      id: "ASP-002",
      pelapor: "Bu Pungky (Blok G2)",
      kategori: "Taman & Lingkungan",
      judul: "Dahan pohon palem di median taman Blok G menutupi cermin cembung",
      tanggal: "2026-09-18",
      status: "Selesai",
      tanggapan: "Sudah dipangkas rapi oleh petugas kebersihan dan satpam tanggal 19 Sep.",
      urgensi: "Penting"
    },
    {
      id: "ASP-003",
      pelapor: "Bu Tere (Blok F4)",
      kategori: "Keamanan",
      judul: "Usul penambahan sensor barcode tamu di pos satpam depan",
      tanggal: "2026-09-14",
      status: "Ditinjau",
      tanggapan: "Akan dibahas pada Rapat Pleno Triwulan 17 Oktober 2026.",
      urgensi: "Rendah"
    }
  ],

  // USULAN & IDE INISIATIF WARGA (SLIDER CAROUSEL BERANDA)
  usulanIde: [
    {
      id: "IDE-001",
      judul: "Turnamen Badminton & Tenis Meja Havaland Cup 2026",
      kategori: "Olahraga & Guyub",
      deskripsi: "Mengadakan kompetisi olahraga santai antar blok D, E, F, G, H, I, J di lapangan fasum setiap Sabtu malam untuk mempererat keakraban antar warga.",
      pengusul: "Bu Tere",
      blok: "F4",
      tanggal: "2026-09-20",
      dukungan: 31,
      status: "Disetujui"
    },
    {
      id: "IDE-002",
      judul: "Pemasangan Karet Speed Bump (Polisi Tidur) Blok D & F",
      kategori: "Keamanan Lingkungan",
      deskripsi: "Pemasangan 2 titik speed bump karet ramah kendaraan di depan jalan Blok D agar kendaraan kurir paket melambat saat anak-anak bermain.",
      pengusul: "Bu Tutik",
      blok: "D1",
      tanggal: "2026-09-17",
      dukungan: 24,
      status: "Masuk Anggaran"
    },
    {
      id: "IDE-003",
      judul: "Penanaman Pohon Tabebuya Bunga Kuning di Boulevard",
      kategori: "Estetika & Taman",
      deskripsi: "Penghijauan tepi jalan boulevard utama dengan bibit pohon tabebuya kuning agar lingkungan perumahan lebih teduh, asri, dan indah saat mekar.",
      pengusul: "Bu Pungky",
      blok: "G2",
      tanggal: "2026-09-15",
      dukungan: 28,
      status: "Disetujui"
    },
    {
      id: "IDE-004",
      judul: "Pengadaan Tabung APAR (Pemadam Api) Tiap Sudut Blok",
      kategori: "Tanggap Darurat",
      deskripsi: "Menempatkan 1 tabung pemadam api powder 6kg di tiang utama setiap blok lengkap dengan kotak pelindung untuk antisipasi dini kebakaran.",
      pengusul: "Pos Keamanan Havaland",
      blok: "Pos Satpam",
      tanggal: "2026-09-11",
      dukungan: 22,
      status: "Dalam Diskusi"
    },
    {
      id: "IDE-005",
      judul: "Filter Air Sumur Resapan & Pembuatan 30 Lubang Biopori",
      kategori: "Fasilitas Warga",
      deskripsi: "Optimalisasi resapan air hujan di area taman barat guna mengantisipasi genangan saat musim penghujan dan menjaga kejernihan air tanah.",
      pengusul: "Bu Sulaicha",
      blok: "J1",
      tanggal: "2026-09-08",
      dukungan: 19,
      status: "Dalam Diskusi"
    }
  ],

  // AKUN PENGGUNA — Hanya metadata untuk simulasi UI.
  // Validasi login sebenarnya dilakukan di server (/api/auth/login).
  // Password TIDAK disimpan di sisi klien.
  akunPengguna: [
    {
      username: "admin",
      nama: "Admin RT 04 Havaland",
      role: "Administrator RT",
      blok: "Kantor RT",
      isAdmin: true
    }
  ]
};

// Export to window object
if (typeof window !== "undefined") {
  window.HavalandData = HavalandData;
}

