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
  ],

  // DATA RESMI GOOGLE MAPS PERUMAHAN HAVALAND KARANGPLOSO
  googleMaps: {
    placeName: "Perum Havaland Karangploso",
    address: "4J58+37W, Babaan, Ngenep, Kec. Karang Ploso, Kabupaten Malang, Jawa Timur 65152",
    mapsUrl: "https://maps.app.goo.gl/Ujdz5idEU8PSaUEq6",
    embedUrl: "https://maps.google.com/maps?q=Perum+Havaland+Karangploso&t=&z=17&ie=UTF8&iwloc=&output=embed",
    totalPhotos: 20
  },

  // KOLEKSI 20 FOTO RIIL DARI GOOGLE MAPS (https://maps.app.goo.gl/Ujdz5idEU8PSaUEq6)
  googleMapsPhotos: [
    {
      id: "gmap-p1",
      title: "Gerbang Utama & Pos Keamanan Havaland",
      desc: "Akses gerbang utama perumahan Havaland Karangploso dengan sistem keamanan one gate.",
      url: "https://lh3.googleusercontent.com/grass-cs/ACvplmOOOe0QwbrowNxUKa57D-D94coBICWQ-YTBd-EtLaw9QQ1CZDeOQDzd2xZyhuRurKPrLPE-qklvcuPc0jsub5dGlZuCwsWkQMag1JkLcugdWo4YFa5ufpBwwc9PRvFai1Fi8H3w",
      badge: "Gerbang Utama"
    },
    {
      id: "gmap-p2",
      title: "Jalan Lingkungan & Deretan Rumah Asri",
      desc: "Pemandangan jalan lingkungan paving rapi dan deretan perumahan yang tertata apik.",
      url: "https://lh3.googleusercontent.com/grass-cs/ACvplmOEGaHXjXBEyjHMft1OGBn7H42aLQCyVWWedzXjFXX7aDrdwrozygG4qkKMu4wSfIKBX3TN7UIufstCKDz5FVHkIZMpNMnnjO28lAYGj7gs4MzsUd4C2H_Th52Wi57hxQlLQhS1Ug",
      badge: "Lingkungan Asri"
    },
    {
      id: "gmap-p3",
      title: "Kawasan Hunian Modern Minimalis",
      desc: "Arsitektur hunian minimalis modern warga Havaland di udara sejuk lereng pegunungan.",
      url: "https://lh3.googleusercontent.com/grass-cs/ACvplmMHVrnTuxmpXhc394_GpHpjsxcK-xZhXxLKg4olPc4zjj-TGypt4coQM9RQibrUO6Vnu_h2Q1yw8900UTkRpSzygpmFRVMBb819UR_T6j1OY91nwVhrMSLWdsAAMC_zX4viM2pYTsOlUAK-",
      badge: "Hunian Warga"
    },
    {
      id: "gmap-p4",
      title: "Panorama Udara & Lanskap Hijau Kawasan",
      desc: "Lanskap lingkungan hijau dan view alam pegunungan di sekitar Perum Havaland.",
      url: "https://lh3.googleusercontent.com/grass-cs/ACvplmNUfMR3ivsR2QoOVEqN9fIMJEDo_vt4rOJe13U65s_ZYT510K-pgyZuLlCjSAey6mdB9yKVgD_zEfXPojnRBerhN7AapFH4-2d13O3emXULwEHO3hHPkurYsBp1llUeuQp8IjsJ",
      badge: "Panorama Alam"
    },
    {
      id: "gmap-p5",
      title: "Sudut Cluster & Penataan Blok Perumahan",
      desc: "Penataan hunian blok warga yang rapi, bersih, dan bebas genangan air.",
      url: "https://lh3.googleusercontent.com/grass-cs/ACvplmNCKqHhx-GoAhiobfrU42ooW9kIMk_e5DlJmQQqzLQIKRvHvOQv7bPH2SRDfSno_WRtUaR2pwfqNqBZGcY94Bqki42eXNAqzwwWAyGQxxYXeqmF73Oix8cEL8MK_eKjhd2dDiulW2k0OBUN",
      badge: "Blok Cluster"
    },
    {
      id: "gmap-p6",
      title: "Fasilitas Lingkungan & Ruang Terbuka Hijau",
      desc: "Area taman fasum perumahan untuk sosialisasi, olahraga ringan, dan bermain anak.",
      url: "https://lh3.googleusercontent.com/grass-cs/ACvplmM4Bo-GsmT-q69AMy-F6B21_vGddv1eDkhdW5KELBHF5SsX2I_h6giH6COV1mTwBDxSjSO7FQBtDjFxCaYBao9I80uKG2FkeGb0GfY2sETRAkF2_Og61Ry8MwAWCVE5zjAAQ_LC6g",
      badge: "Fasilitas Umum"
    },
    {
      id: "gmap-p7",
      title: "Paving Jalan Blok D & F Bebas Polusi",
      desc: "Akses jalan lebar antarrumah dengan sirkulasi udara bersih dan tenang.",
      url: "https://lh3.googleusercontent.com/grass-cs/ACvplmO_vVcnN1ONvRXrB7IVG2LViMqovswVI81ffMGdM-xXB24LUC0TcPwexAcQc191lafOPao1gHYFEtSSM4FGyEjW_SRYi3SwE65Nr97wIQqP1BwksLVuJ4mMlQTMEIcR8b6rIPjp",
      badge: "Jalan Warga"
    },
    {
      id: "gmap-p8",
      title: "Suasana Siang Hari yang Teduh di Havaland",
      desc: "Ketenangan suasana siang perumahan dengan hembusan angin sejuk Karangploso.",
      url: "https://lh3.googleusercontent.com/grass-cs/ACvplmOmZKlpbRuDANoZ_rZVaPD0WALBc3D0l5XKjmnwyBarXCPNsDFE-AqWrUICYrebasygXyuXNOQh04_BL5_GBzVlvS_9m7FrdyX-nGGnTtN-Fpv2zqvlgp7EcE3BE1vMMhFGqvrTIA",
      badge: "Suasana Teduh"
    },
    {
      id: "gmap-p9",
      title: "Pemandangan Lembah & Pegunungan Malang",
      desc: "Pesona alam pegunungan yang tampak jelas dari area barat perumahan.",
      url: "https://lh3.googleusercontent.com/grass-cs/ACvplmOFyFY5QzRYhbGy3OlCKTCjEvnb6KORniZmMQsOnN_Ikl11qlY2OuH883Ew-atpuFMFTQfYDtGJGnszSB5UuU53leFu1OqQsDvzO1bC7eLbLbM40vQmMfVTguLZuy66wqrrtz_k",
      badge: "View Gunung"
    },
    {
      id: "gmap-p10",
      title: "Tata Kelola Instalasi & Penerangan Jalan",
      desc: "Jaringan penerangan jalan umum (PJU) terawat dan tertib di sepanjang jalan blok.",
      url: "https://lh3.googleusercontent.com/grass-cs/ACvplmNqtTYUUa25l8kyRMd2KDQF7DMou6ICZxd_Q_0W0asOWuDrOWkZqRDlObt0pIdjx0Eus-VGMyyn7CZjD-KtRjYpqr5aLVC658CdvhE6bfKX4qcA5owXBDFAsIInSOI1TM3e2M3QRA",
      badge: "Infrastruktur"
    },
    {
      id: "gmap-p11",
      title: "Sudut Pintu Gerbang Depan Perumahan",
      desc: "Pos pantau dan barrier portal keamanan bagi tamu dan warga Havaland.",
      url: "https://lh3.googleusercontent.com/grass-cs/ACvplmOTVeoDs-9pKUkaCXUziKjjUC_YWNuhvTTXwwglNEdrtiK0pK1xsCXKvSgR7s-G4Xf4wkxnFX7yNjNd2I627Ft1piPciksk-0hKmcPsBvspEj3EQmKM_WPxYQSkiRRV-jbH4sLt",
      badge: "Pos Satpam"
    },
    {
      id: "gmap-p12",
      title: "Jalan Lingkungan Bersih & Ramah Anak",
      desc: "Kawasan perumahan yang aman untuk aktivitas bermain anak-anak dan jalan pagi.",
      url: "https://lh3.googleusercontent.com/grass-cs/ACvplmMw24kjdhQU6gj_-StqHuWohY9xvW3Cks33RNCwtQcZDNJm0-Svu3IFrXMTADvnadubMopHFwYRTWCc5Lgn-2nvup9kjVc55doHYBYjldKYtkd343q0sVWRUBIX2EWU7mVL_KBwXA",
      badge: "Ramah Anak"
    },
    {
      id: "gmap-p13",
      title: "Drainase Rapi & Bebas Genangan",
      desc: "Sistem saluran pembuangan dan got tertutup rapi untuk menjaga higienitas lingkungan.",
      url: "https://lh3.googleusercontent.com/grass-cs/ACvplmMwRiYfUs8FASsyC0ST2R_qF1qBZGjCtS3F9HjxtA-78ToLCus-osvmIc3AmiDoJYY11OD1CqcZ_x5DLAQVd0BO4sahtc_O0pUuovqm4U7vncSyb-By3p0-uOqPbqeMVHwj2Syh2w",
      badge: "Drainase Rapi"
    },
    {
      id: "gmap-p14",
      title: "Titik Kumpul Warga & Area Bersama",
      desc: "Ruang temu warga untuk kegiatan musyawarah RT, kerja bakti, dan senam pagi.",
      url: "https://lh3.googleusercontent.com/grass-cs/ACvplmPlqHrT0v1xQtM-7gUm9ww49omDFgbBRBxX8dfIXO4SPNx9l98YRT1smp0zCnq_MGvj3JJUOfjtpC8_sf0lpHKCuFVhPuw8RtAD4ULJrGZ1CYeRkVDF0ObhB9z2VvhoLg60ZJmR",
      badge: "Titik Kumpul"
    },
    {
      id: "gmap-p15",
      title: "Penghijauan Median Jalan & Tanaman Hias",
      desc: "Semak hias dan tanaman peneduh yang dirawat secara berkala oleh pengurus kebersihan.",
      url: "https://lh3.googleusercontent.com/grass-cs/ACvplmMTu9RrzsDBps3BYB-TnuPst8dMW9wUhK2Lt8HxLDs9fakEXSt-P3tlAvFuSiqMA9mtrOamVIVIpxD43yyOIlzxzl3DD_Ffe37gnbMmqu5q59YIceNUQw9vrmzdsY5Ic_Ckpt7b",
      badge: "Penghijauan"
    },
    {
      id: "gmap-p16",
      title: "Deretan Unit Hunian Tipe 36 & 45",
      desc: "Desain fasad rumah tropis minimalis modern dengan pencahayaan alami optimal.",
      url: "https://lh3.googleusercontent.com/grass-cs/ACvplmO0llCc29Uj6r8f3UvQO3by8zUaqohr6eakpF1BI4Z_WM2EILLdYt7nBGJH1YubouVnKYY_eadtMzPvoiHNkWOYiRw5m5jpb4Hfm_iipTrFZLgX4G2jcPMhoP0L3UUNps7BCIgbSQ",
      badge: "Tipe Hunian"
    },
    {
      id: "gmap-p17",
      title: "Kawasan Tenang Jauh dari Kebisingan",
      desc: "Lingkungan perumahan yang tenang untuk istirahat optimal keluarga tercinta.",
      url: "https://lh3.googleusercontent.com/grass-cs/ACvplmN_Fu0t_3QifqTLpEOtX3kGwe4DRjiX6zD4XFn1u40Z5S2B3wP5MRlABWrywXHotGzxyFIa3j2Ps5SK4yn036NdnQG-l2xhDfVdOaVDlXxs4VYYwrTWDhvUOEycUocSPFhFE_pt",
      badge: "Lingkungan Nyaman"
    },
    {
      id: "gmap-p18",
      title: "Boulevard Akses Masuk Havaland Residence",
      desc: "Akses jalan boulevard masuk perumahan yang representatif dan mudah dijangkau.",
      url: "https://lh3.googleusercontent.com/grass-cs/ACvplmP-LUR-011G37vm893fnt3qbReuTutSaZZnjYHzwrPWS-Oc4ZtqgiaYHnV0B5ce-uWhUKIDpcFEmx4lP5qi5kZ8rOgvQn_KsR9VXelhxTNCRzacU_-6fZ_avlRa3srbDjc1x8ofSQ",
      badge: "Boulevard"
    },
    {
      id: "gmap-p19",
      title: "Panorama Sore Hari Kawasan Karangploso",
      desc: "Suasana syahdu senja hari di Perumahan Havaland Malang.",
      url: "https://lh3.googleusercontent.com/grass-cs/ACvplmP1sNvjnCO93f_BTL9Gyc6ocAGnCnBAkI8iHDFbGR_ZKEJMUSTbUjx_bH9aZ-wTTFzrbYWe2Ig38DES6Nv4oT-l7oUv3IAaoFs91dNvETfvE-rYsSozdh8FSNhTZdCBu4BbHUd5",
      badge: "Suasana Senja"
    },
    {
      id: "gmap-p20",
      title: "Keamanan Lingkungan Havaland 24 Jam",
      desc: "Patroli ronda malam siskamling rutin menjaga keamanan dan ketentraman seluruh warga.",
      url: "https://lh3.googleusercontent.com/grass-cs/ACvplmPGkOT2dcZfM777e6mzJsP8j8mXgXuMAFtNHLo1kT4iqr7Fl6E8J8hpzVn3u61zcponJUB3waP1ESQBn3HZPkDMwgg-imbibnV4EwnugVhGiEu4FTNC3bL1sGH8mBhMg3O4ReFSng",
      badge: "Keamanan 24 Jam"
    }
  ],

  // SLIDE TAMPILAN AWAL UNTUK BERANDA (6 FOTO TERPILIH GOOGLE MAPS)
  defaultSlides: [
    {
      id: "slide-gmap-1",
      title: "Gerbang Utama & Pos Keamanan Havaland",
      desc: "Akses gerbang utama perumahan Havaland Karangploso dengan sistem keamanan terpadu satu pintu (One Gate System).",
      url: "https://lh3.googleusercontent.com/grass-cs/ACvplmOOOe0QwbrowNxUKa57D-D94coBICWQ-YTBd-EtLaw9QQ1CZDeOQDzd2xZyhuRurKPrLPE-qklvcuPc0jsub5dGlZuCwsWkQMag1JkLcugdWo4YFa5ufpBwwc9PRvFai1Fi8H3w=w1200-h675-k-no",
      fullUrl: "https://lh3.googleusercontent.com/grass-cs/ACvplmOOOe0QwbrowNxUKa57D-D94coBICWQ-YTBd-EtLaw9QQ1CZDeOQDzd2xZyhuRurKPrLPE-qklvcuPc0jsub5dGlZuCwsWkQMag1JkLcugdWo4YFa5ufpBwwc9PRvFai1Fi8H3w=w1600-h1200",
      badge: "Gerbang Utama 📍",
      source: "Google Maps Resmi",
      mapsUrl: "https://maps.app.goo.gl/Ujdz5idEU8PSaUEq6",
      addedBy: "Sistem (Google Maps)",
      createdAt: "2026-09-20"
    },
    {
      id: "slide-gmap-2",
      title: "Jalan Lingkungan & Deretan Rumah Asri",
      desc: "Tata letak perumahan dengan jalan paving lebar, bersih, bebas debu, dan saluran drainase tertutup rapi.",
      url: "https://lh3.googleusercontent.com/grass-cs/ACvplmOEGaHXjXBEyjHMft1OGBn7H42aLQCyVWWedzXjFXX7aDrdwrozygG4qkKMu4wSfIKBX3TN7UIufstCKDz5FVHkIZMpNMnnjO28lAYGj7gs4MzsUd4C2H_Th52Wi57hxQlLQhS1Ug=w1200-h675-k-no",
      fullUrl: "https://lh3.googleusercontent.com/grass-cs/ACvplmOEGaHXjXBEyjHMft1OGBn7H42aLQCyVWWedzXjFXX7aDrdwrozygG4qkKMu4wSfIKBX3TN7UIufstCKDz5FVHkIZMpNMnnjO28lAYGj7gs4MzsUd4C2H_Th52Wi57hxQlLQhS1Ug=w1600-h900",
      badge: "Lingkungan Asri 🌿",
      source: "Google Maps Resmi",
      mapsUrl: "https://maps.app.goo.gl/Ujdz5idEU8PSaUEq6",
      addedBy: "Sistem (Google Maps)",
      createdAt: "2026-09-20"
    },
    {
      id: "slide-gmap-3",
      title: "Deretan Hunian Modern Minimalis Warga",
      desc: "Hunian tertata rapi dengan desain minimalis elegan, menciptakan suasana perumahan yang nyaman dan harmonis.",
      url: "https://lh3.googleusercontent.com/grass-cs/ACvplmMHVrnTuxmpXhc394_GpHpjsxcK-xZhXxLKg4olPc4zjj-TGypt4coQM9RQibrUO6Vnu_h2Q1yw8900UTkRpSzygpmFRVMBb819UR_T6j1OY91nwVhrMSLWdsAAMC_zX4viM2pYTsOlUAK-=w1200-h675-k-no",
      fullUrl: "https://lh3.googleusercontent.com/grass-cs/ACvplmMHVrnTuxmpXhc394_GpHpjsxcK-xZhXxLKg4olPc4zjj-TGypt4coQM9RQibrUO6Vnu_h2Q1yw8900UTkRpSzygpmFRVMBb819UR_T6j1OY91nwVhrMSLWdsAAMC_zX4viM2pYTsOlUAK-=w1600-h900",
      badge: "Hunian Warga 🏘️",
      source: "Google Maps Resmi",
      mapsUrl: "https://maps.app.goo.gl/Ujdz5idEU8PSaUEq6",
      addedBy: "Sistem (Google Maps)",
      createdAt: "2026-09-20"
    },
    {
      id: "slide-gmap-4",
      title: "Panorama Udara & Lanskap Hijau Karangploso",
      desc: "Kawasan perumahan yang dikelilingi pemandangan alam perbukitan dan udara segar pegunungan Malang Raya.",
      url: "https://lh3.googleusercontent.com/grass-cs/ACvplmNUfMR3ivsR2QoOVEqN9fIMJEDo_vt4rOJe13U65s_ZYT510K-pgyZuLlCjSAey6mdB9yKVgD_zEfXPojnRBerhN7AapFH4-2d13O3emXULwEHO3hHPkurYsBp1llUeuQp8IjsJ=w1200-h675-k-no",
      fullUrl: "https://lh3.googleusercontent.com/grass-cs/ACvplmNUfMR3ivsR2QoOVEqN9fIMJEDo_vt4rOJe13U65s_ZYT510K-pgyZuLlCjSAey6mdB9yKVgD_zEfXPojnRBerhN7AapFH4-2d13O3emXULwEHO3hHPkurYsBp1llUeuQp8IjsJ=w1600-h1200",
      badge: "Panorama Alam 🌄",
      source: "Google Maps Resmi",
      mapsUrl: "https://maps.app.goo.gl/Ujdz5idEU8PSaUEq6",
      addedBy: "Sistem (Google Maps)",
      createdAt: "2026-09-20"
    },
    {
      id: "slide-gmap-5",
      title: "Fasilitas Lingkungan & Ruang Terbuka Hijau",
      desc: "Area taman dan fasum perumahan untuk berinteraksi antarwarga, olahraga pagi, dan ruang bermain anak-anak.",
      url: "https://lh3.googleusercontent.com/grass-cs/ACvplmM4Bo-GsmT-q69AMy-F6B21_vGddv1eDkhdW5KELBHF5SsX2I_h6giH6COV1mTwBDxSjSO7FQBtDjFxCaYBao9I80uKG2FkeGb0GfY2sETRAkF2_Og61Ry8MwAWCVE5zjAAQ_LC6g=w1200-h675-k-no",
      fullUrl: "https://lh3.googleusercontent.com/grass-cs/ACvplmM4Bo-GsmT-q69AMy-F6B21_vGddv1eDkhdW5KELBHF5SsX2I_h6giH6COV1mTwBDxSjSO7FQBtDjFxCaYBao9I80uKG2FkeGb0GfY2sETRAkF2_Og61Ry8MwAWCVE5zjAAQ_LC6g=w1600-h1200",
      badge: "Fasilitas Umum 🌳",
      source: "Google Maps Resmi",
      mapsUrl: "https://maps.app.goo.gl/Ujdz5idEU8PSaUEq6",
      addedBy: "Sistem (Google Maps)",
      createdAt: "2026-09-20"
    },
    {
      id: "slide-gmap-6",
      title: "Kenyamanan & Kebersihan Blok Havaland",
      desc: "Komitmen bersama seluruh warga RT 04 / RW 08 dalam menjaga lingkungan tetap asri, aman, dan guyub rukun.",
      url: "https://lh3.googleusercontent.com/grass-cs/ACvplmO_vVcnN1ONvRXrB7IVG2LViMqovswVI81ffMGdM-xXB24LUC0TcPwexAcQc191lafOPao1gHYFEtSSM4FGyEjW_SRYi3SwE65Nr97wIQqP1BwksLVuJ4mMlQTMEIcR8b6rIPjp=w1200-h675-k-no",
      fullUrl: "https://lh3.googleusercontent.com/grass-cs/ACvplmO_vVcnN1ONvRXrB7IVG2LViMqovswVI81ffMGdM-xXB24LUC0TcPwexAcQc191lafOPao1gHYFEtSSM4FGyEjW_SRYi3SwE65Nr97wIQqP1BwksLVuJ4mMlQTMEIcR8b6rIPjp=w1600-h1200",
      badge: "Guyub Rukun 🤝",
      source: "Google Maps Resmi",
      mapsUrl: "https://maps.app.goo.gl/Ujdz5idEU8PSaUEq6",
      addedBy: "Sistem (Google Maps)",
      createdAt: "2026-09-20"
    }
  ]
};

// Export to window object
if (typeof window !== "undefined") {
  window.HavalandData = HavalandData;
}

