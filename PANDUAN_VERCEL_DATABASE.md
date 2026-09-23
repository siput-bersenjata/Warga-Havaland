# 🚀 Panduan Deploy Website Havaland & Setup Database di Vercel

Sistem ini telah dilengkapi dengan arsitektur **Serverless API (`/api/*`)** dan dukungan database **PostgreSQL Cloud** yang aman, cepat, dan siap diunggah ke Vercel.

---

## 🔒 Keamanan Database yang Diterapkan:
1. **Garansi Data Lama Aman (Non-Destructive)**: Jika database Anda sudah memiliki data di Vercel, sistem **TIDAK AKAN MENGHAPUS ATAU MENIMPA DATA LAMA**. Seluruh query menggunakan sintaks `CREATE TABLE IF NOT EXISTS` dan `ON CONFLICT DO NOTHING`.
2. **Zero Secret Exposure**: URL & password database disimpan di *Environment Variables* Vercel (di sisi server), **tidak pernah terlihat** oleh pengunjung di browser.
3. **Proteksi Akun Admin Utama**: Akun admin utama (`admin`) dilindungi di level API backend dan database sehingga **tidak dapat dihapus** oleh siapapun.
4. **Role-Based Access Control (RBAC)**: Pembagian hak akses ketat antara Tamu (Hanya Lihat), Warga Tetap, Pengurus RT, Bendahara RT, dan Administrator RT.
5. **Proteksi SQL Injection & XSS**: Seluruh *query* menggunakan *Parameterized Queries* (`$1, $2, ...`) dan password warga dienkripsi dengan standar **SHA-256**.
6. **Graceful Fallback**: Jika database offline atau belum terhubung, website otomatis berjalan lancar dengan data lokal + LocalStorage tanpa error.
7. **Security Headers**: Dilengkapi *XSS Protection*, *Anti-Clickjacking (X-Frame-Options: DENY)*, *Content Security Policy (CSP)*, dan *MIME-Type Sniffing Prevention* di `vercel.json`.

---

## 👥 Manajemen Akun & Hak Akses Warga (Baru)

Administrator RT dapat menambahkan akun baru agar warga perumahan dapat login dan berpartisipasi aktif:

### 1. Akses Akun Administrator Utama:
* **Username**: `admin`
* **Password**: `Amalia2125`
* **Keamanan**: Password dienkripsi dengan SHA-256 hash. Akun ini dilindungi dan tidak dapat dihapus.

### 2. Cara Admin Menambah Akun Warga Baru:
1. Login ke website menggunakan akun `admin`.
2. Di bagian header atas (atau menu Pengaturan), klik tombol **"👥 Kelola Akun"**.
3. Klik tombol **"+ Buat Akun Warga Baru"**.
4. Pilih nama warga dari dropdown (sudah tersedia daftar 25 kepala keluarga Havaland: Bu Tutik D1, Bu Wati D2, Bu Maria F7, Bu Natali I10-11, dll.). Nama, Blok, dan saran Username akan terisi otomatis.
5. Masukkan password baru (minimal 6 karakter) dan pilih peran akses:
   - **Warga Tetap**: Berpartisipasi kirim usulan ide/inovasi, voting usulan, lapor fasilitas rusak/aspirasi, dan cek iuran rumah sendiri.
   - **Pengurus RT**: Hak warga + menambah/mengelola jadwal kegiatan & siskamling ronda malam, serta memberikan tanggapan status aspirasi warga.
   - **Bendahara RT**: Hak warga + mencatat transaksi kas masuk/keluar serta verifikasi status pembayaran iuran warga.
   - **Administrator RT**: Akses penuh sistem, kelola akun pengguna lain, dan backup/restore data.
6. Klik **"Simpan Akun Baru"**. Akun langsung aktif dan dapat langsung digunakan oleh warga!

---

## 🛠️ Langkah-Langkah Deploy ke Vercel

### LANGKAH 1: Upload Project ke GitHub
1. Buat repositori baru di GitHub Anda (misal namanya: `warga-havaland`).
2. Di folder project ini (`d:\koding\Warga Havaland`), jalankan perintah git berikut:
   ```bash
   git init
   git add .
   git commit -m "Portal Warga Havaland lengkap dengan Manajemen Akun RBAC dan Database Postgres"
   git branch -M main
   git remote add origin https://github.com/USERNAME-ANDA/warga-havaland.git
   git push -u origin main
   ```

---

### LANGKAH 2: Hubungkan Project ke Vercel
1. Buka [https://vercel.com](https://vercel.com) dan login dengan akun GitHub Anda.
2. Klik tombol **"Add New..."** lalu pilih **"Project"**.
3. Pilih repositori `warga-havaland` yang baru saja Anda upload, lalu klik **"Import"**.
4. Biarkan pengaturan default, lalu klik tombol **"Deploy"**.
5. Tunggu sekitar 1 menit hingga website selesai dideploy dan mendapatkan link resmi (misal: `https://warga-havaland.vercel.app`).

---

### LANGKAH 3: Hubungkan Database PostgreSQL di Vercel

* **Jika Database SUDAH ADA**:
  Cukup pastikan Environment Variable `POSTGRES_URL` atau `DATABASE_URL` sudah terpasang di menu **Settings -> Environment Variables** Vercel Anda. **Data lama Anda dijamin aman dan tidak akan dihapus**.

* **Jika BELUM ADA Database (Buat Baru dalam 1 Menit)**:
  1. Di dashboard proyek Anda di Vercel, klik tab **"Storage"** di menu atas.
  2. Klik tombol **"Create Database"** lalu pilih **"Postgres"**.
  3. Beri nama database Anda (misal: `havaland-db`) dan pilih region terdekat (misal: *Singapore - sin1*).
  4. Klik **"Create"**. Environment variable `POSTGRES_URL` akan otomatis terhubung ke website Anda!
  5. Lakukan *Redeploy* sekali (di menu Deployments -> Redeploy) agar variabel database aktif.

---

### LANGKAH 4: Inisialisasi Tabel & Data Awal (Aman)
Jika database Anda baru:
* Buka browser dan login sebagai `admin` di website Anda, lalu inisialisasi tabel via endpoint:
  👉 **`https://<nama-web-anda>.vercel.app/api/init-db`**
* Atau jalankan isi file `schema.sql` di tab **Storage -> Data / Query** Vercel Anda.
* **Catatan**: Jika tabel atau data sudah ada sebelumnya, perintah ini otomatis dilewati (`DO NOTHING`), sehingga data yang sudah ada tetap aman 100%.

---

## 🎯 Hasil Akhir & Verifikasi
Setelah terhubung:
- Indikator di pojok kanan atas website akan otomatis mendeteksi koneksi cloud.
- Admin dapat menambah akun warga kapan saja dari website.
- Pengunjung tanpa login hanya dapat melihat data (Mode Tamu / Read-Only).
- Transaksi kas, agenda kegiatan, usulan ide, dan aspirasi tersimpan secara terpusat, aman, dan transparan.

