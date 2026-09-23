# 🚀 Panduan Deploy Website Havaland & Setup Database di Vercel

Sistem ini telah dilengkapi dengan arsitektur **Serverless API (`/api/*`)** dan dukungan database **PostgreSQL Cloud** yang aman, cepat, dan siap diunggah ke Vercel.

---

## 🔒 Keamanan Database yang Diterapkan:
1. **Zero Secret Exposure**: URL & password database disimpan di *Environment Variables* Vercel (di sisi server), **tidak pernah terlihat** oleh pengunjung di browser.
2. **Proteksi SQL Injection**: Seluruh *query* penambahan transaksi dan aspirasi menggunakan *Parameterized Queries* (`$1, $2, ...`), mencegah manipulasi database berbahaya.
3. **Graceful Fallback**: Jika database belum disambungkan atau sedang offline, website akan tetap berjalan lancar dengan data lokal + LocalStorage tanpa error.
4. **Security Headers**: Dilengkapi *XSS Protection*, *Anti-Clickjacking (X-Frame-Options: DENY)*, dan *MIME-Type Sniffing Prevention* di `vercel.json`.

---

## 🛠️ Langkah-Langkah Deploy ke Vercel

### LANGKAH 1: Upload Project ke GitHub
1. Buat repositori baru di GitHub Anda (misal namanya: `warga-havaland`).
2. Di folder project ini (`d:\koding\Warga Havaland`), jalankan perintah git berikut:
   ```bash
   git init
   git add .
   git commit -m "Inisialisasi Website Warga Havaland lengkap dengan API Database"
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
5. Tunggu sekitar 1 menit hingga website selesai dideploy dan mendapatkan link gratis (misal: `https://warga-havaland.vercel.app`).

---

### LANGKAH 3: Buat Database PostgreSQL Gratis di Vercel (1 Menit)
Vercel menyediakan database PostgreSQL bawaan yang sangat mudah dibuat:

1. Di dashboard proyek Anda di Vercel, klik tab **"Storage"** di menu atas.
2. Klik tombol **"Create Database"** lalu pilih **"Postgres"** (didukung oleh Neon).
3. Beri nama database Anda (misal: `havaland-db`) dan pilih lokasi terdekat (misal: *Singapore - sin1*).
4. Klik **"Create"**.
5. Setelah database terbuat, klik tab **".env.local"** atau pilih opsi **"Connect to Project"** agar environment variable `POSTGRES_URL` otomatis terpasang ke website Anda!
6. Lakukan *Redeploy* sekali (di menu Deployments -> Redeploy) agar variabel database baru aktif.

> 💡 **Alternatif**: Jika Anda lebih menyukai **Supabase** atau **Neon**, cukup buat database gratis di sana, lalu copy *Connection String* URI dan masukkan ke Vercel di menu **Settings -> Environment Variables** dengan nama `POSTGRES_URL` atau `DATABASE_URL`.

---

### LANGKAH 4: Inisialisasi Tabel & Data Awal (Sekali Saja)
Setelah database terhubung ke proyek Vercel Anda, buat tabel otomatis dengan salah satu cara berikut:

* **Cara Termudah (Via Browser)**:
  Buka link berikut di browser Anda:
  👉 **`https://<nama-web-anda>.vercel.app/api/init-db`**
  
  Maka sistem akan otomatis:
  - Membuat tabel `transaksi_kas`
  - Membuat tabel `warga_havaland`
  - Membuat tabel `kegiatan_rutin`
  - Membuat tabel `aspirasi_warga`
  - Mengisi data awal kas dan warga Havaland

* **Cara Manual (Via SQL Editor Vercel)**:
  Buka tab **Storage -> Data / Query** di Vercel, copy isi file `schema.sql`, lalu klik **Run Query**.

---

## 🎯 Hasil Akhir
Setelah terhubung:
- Indikator di pojok kanan atas website akan berubah menjadi **🟢 Cloud DB Aktif**.
- Setiap kali Bendahara menambah transaksi kas melalui modal *"+ Catat Transaksi Baru"*, data langsung masuk ke PostgreSQL cloud permanen.
- Setiap kali warga mengirim laporan di *"Lapor Fasilitas"*, laporan tersebut langsung masuk ke database pengurus RT.
