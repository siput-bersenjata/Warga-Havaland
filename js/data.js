/**
 * Data Terpusat Warga Perumahan Havaland
 * Lingkungan RT 04 / RW 12, Kelurahan Havaland Asri
 */

const HavalandData = {
  profile: {
    namaPerumahan: "Perumahan Havaland",
    lingkungan: "RT 04 / RW 12",
    kelurahan: "Havaland Asri",
    kecamatan: "Medan Sunggal",
    kota: "Medan",
    provinsi: "Sumatera Utara",
    kodePos: "20128",
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
      { nama: "Polsek Medan Sunggal", nomor: "061-8451110", wa: "", role: "Kepolisian", icon: "phone-call" },
      { nama: "Pemadam Kebakaran (Damkar)", nomor: "113 / 061-4515356", wa: "", role: "Darurat Api", icon: "flame" },
      { nama: "Ambulans & IGD RS Terdekat", nomor: "118 / 061-8212111", wa: "", role: "Medis Darurat", icon: "activity" }
    ]
  },

  // DATA KAS KEUANGAN
  kasSummary: {
    saldoSaatIni: 48750000,
    pemasukanBulanIni: 14650000,
    pengeluaranBulanIni: 9800000,
    targetIuranBulanIni: 15750000,
    wargaSudahBayar: 41,
    totalKK: 45,
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
      uraian: "Iuran Bulanan September - Bpk. Bambang Sujarwo (Blok A-01)",
      nominal: 350000,
      metode: "Transfer Mandiri",
      pj: "Bendahara (Citra L.)",
      bukti: "KWT-SEP-001",
      status: "Verified",
      catatan: "Iuran keamanan & kebersihan bulan September"
    },
    {
      id: "TRX-202609-002",
      tanggal: "2026-09-21",
      jenis: "keluar",
      kategori: "Fasilitas & PJU",
      uraian: "Penggantian 4 Titik Lampu LED PJU Jalan Utama Blok B & C",
      nominal: 680000,
      metode: "Tunai / Nota Toko",
      pj: "Koor Fasum (Rian)",
      bukti: "NOTA-ELEK-882",
      status: "Verified",
      catatan: "Lampu Philips LED 40W Outdoor + ongkos pasang teknisi"
    },
    {
      id: "TRX-202609-003",
      tanggal: "2026-09-20",
      jenis: "masuk",
      kategori: "Iuran Warga",
      uraian: "Iuran Kolektif 3 Bulan (Sep-Nov) - Bpk. Hendra Wijaya (Blok C-08)",
      nominal: 1050000,
      metode: "Transfer BCA",
      pj: "Bendahara (Citra L.)",
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
      pj: "Koor Kebersihan (Joko S.)",
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
      catatan: "Warga Blok D-02 (Keluarga dr. Alvin)"
    },
    {
      id: "TRX-202609-006",
      tanggal: "2026-09-15",
      jenis: "keluar",
      kategori: "Keamanan & Satpam",
      uraian: "Gaji & Insentif 3 Petugas Satpam Periode 1-15 September",
      nominal: 2400000,
      metode: "Transfer",
      pj: "Bendahara (Citra L.)",
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
      pj: "Bendahara (Citra L.)",
      bukti: "STRUK-PLN-993",
      status: "Verified",
      catatan: "Token 500rb admin 2500"
    },
    {
      id: "TRX-202609-008",
      tanggal: "2026-09-10",
      jenis: "masuk",
      kategori: "Donasi Warga",
      uraian: "Donasi Sukarela Pengadaan Tong Sampah Terpilah dari H. Syarifudin",
      nominal: 1500000,
      metode: "Tunai",
      pj: "Ketua RT (Bambang S.)",
      bukti: "KWT-DON-008",
      status: "Verified",
      catatan: "Dialokasikan untuk 6 titik tong sampah organik/anorganik"
    },
    {
      id: "TRX-202609-009",
      tanggal: "2026-09-08",
      jenis: "keluar",
      kategori: "Sosial & Warga",
      uraian: "Santunan Tali Kasih Warga Sakit Opname (Ibu Ratna Blok B-12)",
      nominal: 500000,
      metode: "Tunai",
      pj: "Seksi Sosial (Ibu Rina)",
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
      pj: "Koor Kebersihan (Joko S.)",
      bukti: "RESI-DLH-8921",
      status: "Verified",
      catatan: "Pengangkutan 3x seminggu terjadwal"
    },
    {
      id: "TRX-202609-011",
      tanggal: "2026-09-02",
      jenis: "masuk",
      kategori: "Iuran Warga",
      uraian: "Iuran Kolektif Awal Bulan Warga Blok A & Blok B (28 KK)",
      nominal: 9800000,
      metode: "Transfer Terpadu",
      pj: "Bendahara (Citra L.)",
      bukti: "KWT-REKAP-09A",
      status: "Verified",
      catatan: "28 KK x Rp 350.000"
    },
    {
      id: "TRX-202608-012",
      tanggal: "2026-08-28",
      jenis: "keluar",
      kategori: "Fasilitas & PJU",
      uraian: "Maintenance Berkala Barrier Gate Otomatis & Servis 8 Titik CCTV",
      nominal: 1450000,
      metode: "Transfer Vendor",
      pj: "Koor Keamanan (Kapten Anton)",
      bukti: "INV-CCTV-MEDAN",
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
      koordinator: "Bpk. Kapten Anton (Koor Keamanan)",
      jadwalPiket: [
        { hari: "Senin", blok: "Warga Blok A (No. 01 - 06)", petugas: "Bambang S., dr. Kevin, Hendra" },
        { hari: "Selasa", blok: "Warga Blok A (No. 07 - 12)", petugas: "Firman, Agus P., Ridwan" },
        { hari: "Rabu", blok: "Warga Blok B (No. 01 - 07)", petugas: "Ferry, Budi K., Arif" },
        { hari: "Kamis", blok: "Warga Blok B (No. 08 - 14)", petugas: "Doni, Gunawan, Denny" },
        { hari: "Jumat", blok: "Warga Blok C (No. 01 - 08)", petugas: "Rian, Daniel, Taufik" },
        { hari: "Sabtu", blok: "Warga Blok C (No. 09 - 15)", petugas: "Wisnu, Andre, Teguh" },
        { hari: "Minggu", blok: "Warga Blok D (Seluruh Blok D)", petugas: "dr. Alvin, Zulkifli, Eko" }
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
      id: "W-A01",
      blok: "A-01",
      cluster: "Blok A (Jl. Havaland Utama)",
      namaKK: "Bambang Sujarwo, S.T.",
      statusHunian: "Tetap",
      jabatan: "Ketua RT 04",
      jumlahJiwa: 4,
      kontak: "0813-7544-2211",
      platKendaraan: ["BK 1234 HAV (Fortuner Hitam)", "BK 5678 BS (Vario Putih)"],
      statusIuran: "Lunas",
      iuranBulanIni: true,
      terakhirBayar: "September 2026"
    },
    {
      id: "W-A02",
      blok: "A-02",
      cluster: "Blok A (Jl. Havaland Utama)",
      namaKK: "dr. Kevin Pratama, Sp.A",
      statusHunian: "Tetap",
      jabatan: "Warga",
      jumlahJiwa: 3,
      kontak: "0812-9900-1122",
      platKendaraan: ["BK 1099 KP (CR-V Putih)"],
      statusIuran: "Lunas",
      iuranBulanIni: true,
      terakhirBayar: "September 2026"
    },
    {
      id: "W-A03",
      blok: "A-03",
      cluster: "Blok A (Jl. Havaland Utama)",
      namaKK: "Hendra Gunawan",
      statusHunian: "Tetap",
      jabatan: "Warga",
      jumlahJiwa: 5,
      kontak: "0822-4433-2211",
      platKendaraan: ["BK 1888 HG (Innova Zenix)", "BK 3321 AA (NMax Hitam)"],
      statusIuran: "Lunas",
      iuranBulanIni: true,
      terakhirBayar: "September 2026"
    },
    {
      id: "W-A04",
      blok: "A-04",
      cluster: "Blok A (Jl. Havaland Utama)",
      namaKK: "Firman Syahputra",
      statusHunian: "Tetap",
      jabatan: "Warga",
      jumlahJiwa: 4,
      kontak: "0852-7711-8899",
      platKendaraan: ["BK 1455 FS (HR-V Abu)"],
      statusIuran: "Lunas",
      iuranBulanIni: true,
      terakhirBayar: "September 2026"
    },
    {
      id: "W-A05",
      blok: "A-05",
      cluster: "Blok A (Jl. Havaland Utama)",
      namaKK: "H. Syarifudin Lubis",
      statusHunian: "Tetap",
      jabatan: "Tokoh Warga / Penasihat",
      jumlahJiwa: 2,
      kontak: "0811-6330-990",
      platKendaraan: ["BK 1111 SL (Camry Hitam)"],
      statusIuran: "Lunas",
      iuranBulanIni: true,
      terakhirBayar: "September 2026"
    },
    {
      id: "W-A06",
      blok: "A-06",
      cluster: "Blok A (Jl. Havaland Utama)",
      namaKK: "Agus Priyono",
      statusHunian: "Tetap",
      jabatan: "Warga",
      jumlahJiwa: 3,
      kontak: "0813-8822-4411",
      platKendaraan: ["BK 1723 AP (Xpander Silver)"],
      statusIuran: "Lunas",
      iuranBulanIni: true,
      terakhirBayar: "September 2026"
    },
    {
      id: "W-A07",
      blok: "A-07",
      cluster: "Blok A (Jl. Havaland Utama)",
      namaKK: "Michael Tanuwijaya",
      statusHunian: "Tetap",
      jabatan: "Warga",
      jumlahJiwa: 4,
      kontak: "0819-3322-1100",
      platKendaraan: ["BK 1555 MT (Mazda CX-5)", "BK 6712 BB (PCX Merah)"],
      statusIuran: "Lunas",
      iuranBulanIni: true,
      terakhirBayar: "September 2026"
    },
    {
      id: "W-A08",
      blok: "A-08",
      cluster: "Blok A (Jl. Havaland Utama)",
      namaKK: "Rumah Kosong (Dalam Renovasi)",
      statusHunian: "Kosong",
      jabatan: "-",
      jumlahJiwa: 0,
      kontak: "0812-7000-8800 (Pemilik: Bpk. Gunawan)",
      platKendaraan: ["-"],
      statusIuran: "Lunas",
      iuranBulanIni: true,
      terakhirBayar: "September 2026 (Iuran Maintenance)"
    },
    {
      id: "W-B01",
      blok: "B-01",
      cluster: "Blok B (Jl. Havaland Asri 1)",
      namaKK: "Citra Lestari, S.E., Ak.",
      statusHunian: "Tetap",
      jabatan: "Bendahara RT 04",
      jumlahJiwa: 3,
      kontak: "0821-6577-8899",
      platKendaraan: ["BK 1204 CL (Yaris Putih)", "BK 4412 KL (Scoopy)"],
      statusIuran: "Lunas",
      iuranBulanIni: true,
      terakhirBayar: "September 2026"
    },
    {
      id: "W-B02",
      blok: "B-02",
      cluster: "Blok B (Jl. Havaland Asri 1)",
      namaKK: "Rahmat Hidayat",
      statusHunian: "Tetap",
      jabatan: "Sekretaris RT 04",
      jumlahJiwa: 4,
      kontak: "0852-9811-3456",
      platKendaraan: ["BK 1399 RH (Ertiga Abu)", "BK 2290 YY (Beat Hitam)"],
      statusIuran: "Lunas",
      iuranBulanIni: true,
      terakhirBayar: "September 2026"
    },
    {
      id: "W-B03",
      blok: "B-03",
      cluster: "Blok B (Jl. Havaland Asri 1)",
      namaKK: "Ferry Irawan",
      statusHunian: "Kontrak",
      jabatan: "Warga",
      jumlahJiwa: 2,
      kontak: "0821-5500-4499",
      platKendaraan: ["BK 1902 FI (Raize Kuning)"],
      statusIuran: "Lunas",
      iuranBulanIni: true,
      terakhirBayar: "September 2026"
    },
    {
      id: "W-B04",
      blok: "B-04",
      cluster: "Blok B (Jl. Havaland Asri 1)",
      namaKK: "Budi Kusumo",
      statusHunian: "Tetap",
      jabatan: "Warga",
      jumlahJiwa: 5,
      kontak: "0812-8877-6655",
      platKendaraan: ["BK 1765 BK (Avanza Putih)"],
      statusIuran: "Belum",
      iuranBulanIni: false,
      terakhirBayar: "Agustus 2026"
    },
    {
      id: "W-B05",
      blok: "B-05",
      cluster: "Blok B (Jl. Havaland Asri 1)",
      namaKK: "Arif Budiman",
      statusHunian: "Tetap",
      jabatan: "Warga",
      jumlahJiwa: 3,
      kontak: "0813-1122-3344",
      platKendaraan: ["BK 1432 AB (Rush Hitam)"],
      statusIuran: "Lunas",
      iuranBulanIni: true,
      terakhirBayar: "September 2026"
    },
    {
      id: "W-B06",
      blok: "B-06",
      cluster: "Blok B (Jl. Havaland Asri 1)",
      namaKK: "Doni Prasetyo",
      statusHunian: "Tetap",
      jabatan: "Warga",
      jumlahJiwa: 4,
      kontak: "0853-6622-1199",
      platKendaraan: ["BK 1689 DP (Brio Merah)", "BK 3391 OP (Aerox)"],
      statusIuran: "Lunas",
      iuranBulanIni: true,
      terakhirBayar: "September 2026"
    },
    {
      id: "W-B07",
      blok: "B-07",
      cluster: "Blok B (Jl. Havaland Asri 1)",
      namaKK: "Gunawan Wibowo",
      statusHunian: "Tetap",
      jabatan: "Warga",
      jumlahJiwa: 3,
      kontak: "0812-4455-6677",
      platKendaraan: ["BK 1022 GW (Stargazer Abu)"],
      statusIuran: "Lunas",
      iuranBulanIni: true,
      terakhirBayar: "September 2026"
    },
    {
      id: "W-B08",
      blok: "B-08",
      cluster: "Blok B (Jl. Havaland Asri 1)",
      namaKK: "Denny Setiawan",
      statusHunian: "Kontrak",
      jabatan: "Warga",
      jumlahJiwa: 2,
      kontak: "0823-9988-7711",
      platKendaraan: ["BK 1544 DS (S-Presso Putih)"],
      statusIuran: "Belum",
      iuranBulanIni: false,
      terakhirBayar: "Agustus 2026"
    },
    {
      id: "W-C01",
      blok: "C-01",
      cluster: "Blok C (Jl. Havaland Asri 2)",
      namaKK: "Kapten Anton Subianto",
      statusHunian: "Tetap",
      jabatan: "Koordinator Keamanan",
      jumlahJiwa: 4,
      kontak: "0812-7711-2299",
      platKendaraan: ["BK 1988 AS (Pajero Sport)", "BK 4410 KL (KLX Hijau)"],
      statusIuran: "Lunas",
      iuranBulanIni: true,
      terakhirBayar: "September 2026"
    },
    {
      id: "W-C02",
      blok: "C-02",
      cluster: "Blok C (Jl. Havaland Asri 2)",
      namaKK: "Joko Santoso",
      statusHunian: "Tetap",
      jabatan: "Koordinator Kebersihan",
      jumlahJiwa: 4,
      kontak: "0812-6543-7722",
      platKendaraan: ["BK 1332 JS (Carry Pickup)", "BK 5521 OP (Supra)"],
      statusIuran: "Lunas",
      iuranBulanIni: true,
      terakhirBayar: "September 2026"
    },
    {
      id: "W-C03",
      blok: "C-03",
      cluster: "Blok C (Jl. Havaland Asri 2)",
      namaKK: "Rian Firmansyah",
      statusHunian: "Tetap",
      jabatan: "Koordinator Fasilitas Umum",
      jumlahJiwa: 3,
      kontak: "0852-6633-9911",
      platKendaraan: ["BK 1801 RF (WR-V Putih)"],
      statusIuran: "Lunas",
      iuranBulanIni: true,
      terakhirBayar: "September 2026"
    },
    {
      id: "W-C04",
      blok: "C-04",
      cluster: "Blok C (Jl. Havaland Asri 2)",
      namaKK: "Daniel Hutapea",
      statusHunian: "Tetap",
      jabatan: "Warga",
      jumlahJiwa: 4,
      kontak: "0813-7099-2211",
      platKendaraan: ["BK 1490 DH (Tucson Hitam)"],
      statusIuran: "Lunas",
      iuranBulanIni: true,
      terakhirBayar: "September 2026"
    },
    {
      id: "W-C05",
      blok: "C-05",
      cluster: "Blok C (Jl. Havaland Asri 2)",
      namaKK: "Taufik Rahman",
      statusHunian: "Tetap",
      jabatan: "Warga",
      jumlahJiwa: 5,
      kontak: "0821-9988-1234",
      platKendaraan: ["BK 1729 TR (Mobilio Abu)"],
      statusIuran: "Lunas",
      iuranBulanIni: true,
      terakhirBayar: "September 2026"
    },
    {
      id: "W-C06",
      blok: "C-06",
      cluster: "Blok C (Jl. Havaland Asri 2)",
      namaKK: "Wisnu Wardhana",
      statusHunian: "Tetap",
      jabatan: "Warga",
      jumlahJiwa: 3,
      kontak: "0812-3344-5566",
      platKendaraan: ["BK 1599 WW (Civic Hitam)"],
      statusIuran: "Lunas",
      iuranBulanIni: true,
      terakhirBayar: "September 2026"
    },
    {
      id: "W-C07",
      blok: "C-07",
      cluster: "Blok C (Jl. Havaland Asri 2)",
      namaKK: "Andre Siregar",
      statusHunian: "Kontrak",
      jabatan: "Warga",
      jumlahJiwa: 2,
      kontak: "0853-1122-8877",
      platKendaraan: ["BK 1188 AS (Ignis Biru)"],
      statusIuran: "Belum",
      iuranBulanIni: false,
      terakhirBayar: "Agustus 2026"
    },
    {
      id: "W-C08",
      blok: "C-08",
      cluster: "Blok C (Jl. Havaland Asri 2)",
      namaKK: "Hendra Wijaya",
      statusHunian: "Tetap",
      jabatan: "Warga",
      jumlahJiwa: 4,
      kontak: "0812-9988-4422",
      platKendaraan: ["BK 1621 HW (Almaz Hitam)"],
      statusIuran: "Lunas (Advance)",
      iuranBulanIni: true,
      terakhirBayar: "November 2026 (Lunas s/d Nov)"
    },
    {
      id: "W-D01",
      blok: "D-01",
      cluster: "Blok D (Jl. Havaland Boulevard)",
      namaKK: "dr. Alvin Nugraha, Sp.PD",
      statusHunian: "Tetap",
      jabatan: "Warga",
      jumlahJiwa: 4,
      kontak: "0811-9988-7766",
      platKendaraan: ["BK 1800 AN (Mercy C200)", "BK 1290 AN (Vespa Sprint)"],
      statusIuran: "Lunas",
      iuranBulanIni: true,
      terakhirBayar: "September 2026"
    },
    {
      id: "W-D02",
      blok: "D-02",
      cluster: "Blok D (Jl. Havaland Boulevard)",
      namaKK: "Zulkifli Harahap",
      statusHunian: "Tetap",
      jabatan: "Warga",
      jumlahJiwa: 4,
      kontak: "0813-6655-4433",
      platKendaraan: ["BK 1402 ZH (Palisade Hitam)"],
      statusIuran: "Lunas",
      iuranBulanIni: true,
      terakhirBayar: "September 2026"
    },
    {
      id: "W-D03",
      blok: "D-03",
      cluster: "Blok D (Jl. Havaland Boulevard)",
      namaKK: "Eko Wahyudi",
      statusHunian: "Tetap",
      jabatan: "Warga",
      jumlahJiwa: 3,
      kontak: "0822-8899-0011",
      platKendaraan: ["BK 1711 EW (Creta Merah)"],
      statusIuran: "Lunas",
      iuranBulanIni: true,
      terakhirBayar: "September 2026"
    },
    {
      id: "W-D04",
      blok: "D-04",
      cluster: "Blok D (Jl. Havaland Boulevard)",
      namaKK: "Rumah Singgah / Luar Kota",
      statusHunian: "Kosong",
      jabatan: "-",
      jumlahJiwa: 0,
      kontak: "0812-5500-1122 (Bpk. Surya)",
      platKendaraan: ["-"],
      statusIuran: "Belum",
      iuranBulanIni: false,
      terakhirBayar: "Juli 2026"
    }
  ],

  // LAPORAN & ASPIRASI FASILITAS WARGA
  aspirasi: [
    {
      id: "ASP-001",
      pelapor: "Michael Tanuwijaya (Blok A-07)",
      kategori: "Penerangan Jalan (PJU)",
      judul: "Lampu PJU di dekat belokan Blok A-07 agak berkedip saat hujan",
      tanggal: "2026-09-21",
      status: "Diproses",
      tanggapan: "Sudah dijadwalkan teknisi untuk dicek sambungan kabelnya Sabtu ini.",
      urgensi: "Sedang"
    },
    {
      id: "ASP-002",
      pelapor: "Ibu Citra Lestari (Blok B-01)",
      kategori: "Taman & Lingkungan",
      judul: "Dahan pohon palem di median jalan utama menutupi cermin cembung",
      tanggal: "2026-09-18",
      status: "Selesai",
      tanggapan: "Sudah dipangkas rapi oleh petugas kebersihan dan satpam tanggal 19 Sep.",
      urgensi: "Penting"
    },
    {
      id: "ASP-003",
      pelapor: "Wisnu Wardhana (Blok C-06)",
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
      deskripsi: "Mengadakan kompetisi olahraga santai antar blok A, B, C, D di lapangan fasum setiap Sabtu malam untuk mempererat keakraban antar warga.",
      pengusul: "dr. Kevin Sanjaya",
      blok: "A-03",
      tanggal: "2026-09-20",
      dukungan: 31,
      status: "Disetujui"
    },
    {
      id: "IDE-002",
      judul: "Pemasangan Karet Speed Bump (Polisi Tidur) Blok C",
      kategori: "Keamanan Lingkungan",
      deskripsi: "Pemasangan 2 titik speed bump karet ramah kendaraan di depan taman Blok C agar kendaraan kurir paket melambat saat anak-anak bermain.",
      pengusul: "Wisnu Wardhana",
      blok: "C-06",
      tanggal: "2026-09-17",
      dukungan: 24,
      status: "Masuk Anggaran"
    },
    {
      id: "IDE-003",
      judul: "Penanaman Pohon Tabebuya Bunga Kuning di Boulevard",
      kategori: "Estetika & Taman",
      deskripsi: "Penghijauan tepi jalan boulevard utama dengan bibit pohon tabebuya kuning agar lingkungan perumahan lebih teduh, asri, dan indah saat mekar.",
      pengusul: "Ibu Citra Lestari",
      blok: "B-01",
      tanggal: "2026-09-15",
      dukungan: 28,
      status: "Disetujui"
    },
    {
      id: "IDE-004",
      judul: "Pengadaan Tabung APAR (Pemadam Api) Tiap Sudut Blok",
      kategori: "Tanggap Darurat",
      deskripsi: "Menempatkan 1 tabung pemadam api powder 6kg di tiang utama setiap blok lengkap dengan kotak pelindung untuk antisipasi dini kebakaran.",
      pengusul: "Kapten Anton",
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
      pengusul: "Ir. Bambang Sujarwo",
      blok: "A-01",
      tanggal: "2026-09-08",
      dukungan: 19,
      status: "Dalam Diskusi"
    }
  ],

  // AKUN PENGGUNA DEMO UNTUK LOGIN & AUDIT TRAIL CRUD
  akunPengguna: [
    {
      username: "admin",
      password: "havaland2026",
      nama: "Citra Lestari, S.E.",
      role: "Bendahara RT 04",
      blok: "B-01",
      kontak: "0812-6001-9983",
      isAdmin: true
    },
    {
      username: "ketua_rt",
      password: "havaland2026",
      nama: "Ir. Bambang Sujarwo",
      role: "Ketua RT 04",
      blok: "A-01",
      kontak: "0812-6001-9982",
      isAdmin: true
    },
    {
      username: "bambang_a01",
      password: "123",
      nama: "Ir. Bambang Sujarwo",
      role: "Warga Tetap",
      blok: "A-01",
      kontak: "0812-6001-9982",
      isAdmin: false
    },
    {
      username: "kevin_a03",
      password: "123",
      nama: "dr. Kevin Sanjaya, Sp.A",
      role: "Warga Tetap",
      blok: "A-03",
      kontak: "0811-2233-4455",
      isAdmin: false
    },
    {
      username: "wisnu_c06",
      password: "123",
      nama: "Wisnu Wardhana",
      role: "Warga Tetap",
      blok: "C-06",
      kontak: "0812-3344-5566",
      isAdmin: false
    }
  ]
};

// Export to window object
if (typeof window !== "undefined") {
  window.HavalandData = HavalandData;
}
