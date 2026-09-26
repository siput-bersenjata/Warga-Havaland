/**
 * Utilities & Helper Functions for Havaland Community Portal
 */

const HavalandUtils = {
  // Format angka ke format mata uang Rupiah
  formatRupiah(amount) {
    if (isNaN(amount)) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  },

  // Format tanggal lengkap Bahasa Indonesia
  formatTanggal(dateStr) {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const bulan = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    return `${date.getDate()} ${bulan[date.getMonth()]} ${date.getFullYear()}`;
  },

  // Format tanggal ringkas (misal: 22 Sep 2026)
  formatTanggalSingkat(dateStr) {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const bulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    return `${date.getDate()} ${bulan[date.getMonth()]} ${date.getFullYear()}`;
  },

  // Toast Notification System yang Elegan
  showToast(title, message, type = "success") {
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      container.className = "toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast-item toast-${type} animate-fade-in-up`;
    
    // Icon type mapping
    let iconSvg = "";
    if (type === "success") {
      iconSvg = `<svg class="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
    } else if (type === "error" || type === "danger") {
      iconSvg = `<svg class="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;
    } else {
      iconSvg = `<svg class="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
    }

    toast.innerHTML = `
      <div class="toast-icon">${iconSvg}</div>
      <div class="toast-content">
        <h4 class="toast-title">${title}</h4>
        <p class="toast-message">${message}</p>
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()" aria-label="Tutup notifikasi">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
    `;

    container.appendChild(toast);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      toast.classList.add("toast-fade-out");
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  // Simpan data ke LocalStorage
  saveStorage(key, value) {
    try {
      localStorage.setItem(`havaland_${key}`, JSON.stringify(value));
    } catch (e) {
      console.warn("Gagal menyimpan ke LocalStorage:", e);
    }
    // Beritahu mesin sinkron cloud (diabaikan bila DB belum aktif / offline)
    try {
      if (typeof HavalandSync !== "undefined") HavalandSync.markDirtyByStorageKey(key);
    } catch (_) { /* abaikan */ }
  },

  // Ambil data dari LocalStorage
  loadStorage(key, defaultValue = null) {
    try {
      const data = localStorage.getItem(`havaland_${key}`);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      console.warn("Gagal membaca LocalStorage:", e);
      return defaultValue;
    }
  },

  // Hapus data dari LocalStorage
  removeStorage(key) {
    try {
      localStorage.removeItem(`havaland_${key}`);
    } catch (e) {
      console.warn("Gagal menghapus dari LocalStorage:", e);
    }
  },

  // Hapus duplikat array objek berdasarkan `id` (pertahankan kemunculan pertama).
  // Dipakai saat migrasi cache lama yang tercampur data ganda.
  dedupeById(arr) {
    if (!Array.isArray(arr)) return [];
    const seen = new Set();
    return arr.filter(item => {
      const id = item && item.id;
      if (id === undefined || id === null) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  },

  // Ekspor Transaksi Kas ke format CSV
  exportKasCSV(transaksiList) {
    if (!transaksiList || transaksiList.length === 0) {
      HavalandUtils.showToast("Peringatan", "Tidak ada data transaksi untuk diekspor", "warning");
      return;
    }

    const headers = ["ID Transaksi", "Tanggal", "Jenis", "Kategori", "Uraian", "Nominal (Rp)", "Metode", "Penanggung Jawab", "No Bukti", "Status"];
    const rows = transaksiList.map(t => [
      `"${t.id}"`,
      `"${t.tanggal}"`,
      `"${t.jenis === 'masuk' ? 'Pemasukan' : 'Pengeluaran'}"`,
      `"${t.kategori}"`,
      `"${t.uraian.replace(/"/g, '""')}"`,
      t.nominal,
      `"${t.metode || '-'}"`,
      `"${t.pj || '-'}"`,
      `"${t.bukti || '-'}"`,
      `"${t.status || '-'}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Kas_Havaland_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    HavalandUtils.showToast("Berhasil", "Laporan Kas CSV berhasil diunduh!", "success");
  },

  // Cetak Dokumen / Kwitansi
  printKwitansi() {
    window.print();
  },

  // Escape HTML helper
  escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
};

// Export to window
if (typeof window !== "undefined") {
  window.HavalandUtils = HavalandUtils;
}
