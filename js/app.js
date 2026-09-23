/**
 * Havaland Community Portal - Main Application Logic
 * RT 04 / RW 12, Kelurahan Havaland Asri
 */

const HavalandApp = {
  activeTab: "beranda",
  currentTheme: "light",
  filteredTransaksi: [],
  filteredWarga: [],
  selectedWargaIuran: null,

  // Inisialisasi Aplikasi
  init() {
    this.initTheme();
    this.loadPersistedData();
    this.renderKPIs();
    this.renderMiniChart();
    this.renderExpenseAllocations();
    this.renderBerandaHighlights();
    this.renderTransaksi();
    this.renderKegiatan("semua");
    this.renderWarga();
    this.renderKontak();
    this.renderAspirasi();
    this.populateRumahDropdown();
    this.initDateInputs();

    // Coba hubungkan ke Cloud Database Vercel Postgres jika aktif
    this.fetchCloudData();

    // Listener URL hash & popstate
    window.addEventListener("hashchange", () => {
      const hash = window.location.hash.replace("#", "");
      if (hash && ["beranda", "kas", "rincian", "kegiatan", "warga", "kontak"].includes(hash)) {
        this.navigate(hash, false);
      }
    });

    // Keyboard ESC to close modals
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        document.querySelectorAll(".modal-overlay.active").forEach(m => m.classList.remove("active"));
        document.body.style.overflow = "";
      }
    });

    // Check initial hash
    const initialHash = window.location.hash.replace("#", "");
    if (initialHash && ["beranda", "kas", "rincian", "kegiatan", "warga", "kontak"].includes(initialHash)) {
      this.navigate(initialHash, false);
    }
  },

  // Sinkronisasi data dari Vercel Cloud Database
  async fetchCloudData() {
    try {
      const res = await fetch("/api/data");
      if (res.ok) {
        const data = await res.json();
        if (data.connected && data.transaksi && data.transaksi.length > 0) {
          console.log("Terhubung ke Vercel Cloud Database!");
          HavalandData.transaksi = data.transaksi;
          if (data.aspirasi) HavalandData.aspirasi = data.aspirasi;
          if (data.kasSummary) HavalandData.kasSummary = { ...HavalandData.kasSummary, ...data.kasSummary };
          
          this.renderKPIs();
          this.renderMiniChart();
          this.renderExpenseAllocations();
          this.renderBerandaHighlights();
          this.renderTransaksi();
          this.renderAspirasi();

          const badge = document.querySelector(".live-badge");
          if (badge) {
            badge.innerHTML = `<span class="pulse-dot" style="background:#10B981;"></span><span>Cloud DB Aktif</span>`;
            badge.setAttribute("title", "Terhubung ke Database Cloud Vercel");
          }
        }
      }
    } catch (e) {
      console.log("Berjalan dalam mode lokal / offline (Database Vercel belum aktif).");
    }
  },

  // Inisialisasi Tema (Dark/Light Mode)
  initTheme() {
    const savedTheme = localStorage.getItem("havaland_theme") || "light";
    this.setTheme(savedTheme);
  },

  toggleTheme() {
    const newTheme = this.currentTheme === "light" ? "dark" : "light";
    this.setTheme(newTheme);
    HavalandUtils.showToast("Tema Diubah", `Mode ${newTheme === 'dark' ? 'Gelap' : 'Terang'} diaktifkan`, "info");
  },

  setTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("havaland_theme", theme);

    const sunIcon = document.getElementById("theme-icon-sun");
    const moonIcon = document.getElementById("theme-icon-moon");
    if (theme === "dark") {
      sunIcon?.classList.remove("hidden");
      moonIcon?.classList.add("hidden");
    } else {
      sunIcon?.classList.add("hidden");
      moonIcon?.classList.remove("hidden");
    }
  },

  // Muat data lokal tambahan (jika ada transaksi/aspirasi baru di localStorage)
  loadPersistedData() {
    const customTrx = HavalandUtils.loadStorage("custom_transaksi", []);
    if (customTrx && customTrx.length > 0) {
      HavalandData.transaksi = [...customTrx, ...HavalandData.transaksi];
      // Recalculate summary
      this.recalculateSummary();
    }

    const customAsp = HavalandUtils.loadStorage("custom_aspirasi", []);
    if (customAsp && customAsp.length > 0) {
      HavalandData.aspirasi = [...customAsp, ...HavalandData.aspirasi];
    }
  },

  recalculateSummary() {
    let masukTotal = 0;
    let keluarTotal = 0;
    HavalandData.transaksi.forEach(t => {
      if (t.jenis === "masuk") masukTotal += t.nominal;
      else keluarTotal += t.nominal;
    });
    HavalandData.kasSummary.pemasukanBulanIni = masukTotal;
    HavalandData.kasSummary.pengeluaranBulanIni = keluarTotal;
    HavalandData.kasSummary.saldoSaatIni = 43900000 + (masukTotal - keluarTotal);
  },

  // Router Navigasi Tab
  navigate(tabName, updateHash = true) {
    if (!["beranda", "kas", "rincian", "kegiatan", "warga", "kontak"].includes(tabName)) return;

    this.activeTab = tabName;
    if (updateHash) window.location.hash = tabName;

    // Sembunyikan semua tab & tampilkan yang aktif
    document.querySelectorAll(".tab-view").forEach(view => {
      view.classList.remove("active");
    });
    const targetView = document.getElementById(`view-${tabName}`);
    if (targetView) targetView.classList.add("active");

    // Update Desktop Nav Active
    document.querySelectorAll(".desktop-nav .nav-link").forEach(btn => {
      if (btn.getAttribute("data-nav") === tabName) btn.classList.add("active");
      else btn.classList.remove("active");
    });

    // Update Mobile Bottom Nav Active
    document.querySelectorAll(".bottom-nav .bottom-nav-item").forEach(btn => {
      if (btn.getAttribute("data-bottom-nav") === tabName) btn.classList.add("active");
      else btn.classList.remove("active");
    });

    // Scroll ke atas halaman secara halus
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  // Render KPI Card Ringkasan
  renderKPIs() {
    const s = HavalandData.kasSummary;
    const elSaldo = document.getElementById("kpi-saldo");
    const elMasuk = document.getElementById("kpi-masuk");
    const elKeluar = document.getElementById("kpi-keluar");
    const elPartisipasi = document.getElementById("kpi-partisipasi");
    const elKKCount = document.getElementById("kpi-kk-count");

    if (elSaldo) elSaldo.textContent = HavalandUtils.formatRupiah(s.saldoSaatIni);
    if (elMasuk) elMasuk.textContent = HavalandUtils.formatRupiah(s.pemasukanBulanIni);
    if (elKeluar) elKeluar.textContent = HavalandUtils.formatRupiah(s.pengeluaranBulanIni);
    
    const pct = ((s.wargaSudahBayar / s.totalKK) * 100).toFixed(1);
    if (elPartisipasi) elPartisipasi.textContent = `${pct}%`;
    if (elKKCount) elKKCount.textContent = `${s.wargaSudahBayar} dari ${s.totalKK} KK`;
  },

  // Render Grafik Batang Mini Arus Kas (CSS Bars)
  renderMiniChart() {
    const container = document.getElementById("chart-bars-container");
    if (!container) return;

    const months = HavalandData.kasSummary.chartMonthly;
    // Cari nilai tertinggi untuk skala persentase tinggi batang (maks 100%)
    let maxVal = 0;
    months.forEach(m => {
      if (m.masuk > maxVal) maxVal = m.masuk;
      if (m.keluar > maxVal) maxVal = m.keluar;
    });

    let html = "";
    months.forEach(m => {
      const hIn = Math.round((m.masuk / maxVal) * 100);
      const hOut = Math.round((m.keluar / maxVal) * 100);
      html += `
        <div class="bar-col">
          <div class="bar-pair">
            <div class="bar-in" style="height: ${hIn}%;" data-tooltip="Masuk: ${HavalandUtils.formatRupiah(m.masuk)}"></div>
            <div class="bar-out" style="height: ${hOut}%;" data-tooltip="Keluar: ${HavalandUtils.formatRupiah(m.keluar)}"></div>
          </div>
          <span class="bar-month">${m.bulan.split(" ")[0]}</span>
        </div>
      `;
    });

    container.innerHTML = html;
  },

  // Render Proporsi Pengeluaran Kas
  renderExpenseAllocations() {
    const container = document.getElementById("expense-allocation-container");
    if (!container) return;

    const list = HavalandData.kasSummary.kategoriPengeluaranPersen;
    let html = "";
    list.forEach(item => {
      html += `
        <div class="alloc-item">
          <div class="alloc-header">
            <span style="color: var(--text-primary);">${item.kategori}</span>
            <span><strong>${item.persen}%</strong> (${HavalandUtils.formatRupiah(item.nominal)})</span>
          </div>
          <div class="alloc-bar-track">
            <div class="alloc-bar-fill" style="width: ${item.persen}%; background: ${item.warna};"></div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  },

  // Render Beranda Previews (Agenda Terdekat & 3 Transaksi Terbaru)
  renderBerandaHighlights() {
    // 2 Agenda terdekat
    const agendaContainer = document.getElementById("beranda-agenda-preview");
    if (agendaContainer) {
      const topKegiatan = HavalandData.kegiatan.slice(0, 2);
      let html = "";
      topKegiatan.forEach(k => {
        html += `
          <div class="activity-card" style="padding: 1rem;">
            <div class="activity-main">
              <div class="activity-date-badge">
                <div class="activity-date-day">${k.kategori === 'Keamanan' ? 'SETIAP' : 'MINGGU'}</div>
                <div class="activity-date-month">${k.kategori === 'Keamanan' ? 'MALAM' : 'PAGI'}</div>
              </div>
              <div class="activity-details">
                <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 2px;">
                  <span class="badge badge-info">${k.kategori}</span>
                  <span style="font-size: 0.75rem; color: var(--primary); font-weight: 700;">${k.waktuNext}</span>
                </div>
                <h3>${k.judul}</h3>
                <p>${k.deskripsi}</p>
                <div class="activity-meta-tags">
                  <span>📍 ${k.lokasi}</span>
                  <span>👤 ${k.koordinator}</span>
                </div>
              </div>
            </div>
            <div class="activity-actions">
              <button class="btn btn-secondary btn-sm" onclick="HavalandApp.shareKegiatanWA('${k.id}')">
                <svg class="w-4 h-4 mr-1 text-emerald-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.54 1.764.819 2.791.819h.005c3.18 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.765-5.773-5.765zm3.364 8.163c-.144.405-.837.774-1.17.824-.312.045-.634.055-1.921-.479-1.503-.623-2.47-2.148-2.545-2.247-.075-.1-1.01-1.344-1.01-2.564 0-1.22.639-1.82.866-2.066.227-.247.498-.309.664-.309.166 0 .332.002.477.01.155.008.363-.058.567.433.21.505.719 1.752.782 1.88.063.128.105.279.021.446-.084.167-.126.27-.25.417-.125.148-.263.33-.375.443-.125.125-.255.261-.11.51.145.249.645 1.066 1.385 1.725.952.848 1.755 1.111 2.004 1.236.249.125.395.104.541-.063.146-.167.625-.729.791-.979.166-.25.332-.208.562-.125.229.083 1.458.687 1.708.812.25.125.417.188.479.292.062.104.062.604-.082 1.009z"/></svg>
                Bagikan ke WA
              </button>
            </div>
          </div>
        `;
      });
      agendaContainer.innerHTML = html;
    }

    // 3 Transaksi Terbaru
    const trxContainer = document.getElementById("beranda-trx-preview");
    if (trxContainer) {
      const topTrx = HavalandData.transaksi.slice(0, 3);
      let html = "";
      topTrx.forEach(t => {
        const isMasuk = t.jenis === "masuk";
        html += `
          <div class="trx-mobile-card" onclick="HavalandApp.openKwitansi('${t.id}')">
            <div class="trx-left">
              <div class="trx-icon-circle ${isMasuk ? 'icon-emerald' : 'icon-rose'}">
                ${isMasuk ? 
                  `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12"/></svg>` : 
                  `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 13l-5 5m0 0l-5-5m5 5V6"/></svg>`
                }
              </div>
              <div class="trx-info">
                <h4>${t.uraian}</h4>
                <p>${HavalandUtils.formatTanggalSingkat(t.tanggal)} • ${t.kategori}</p>
              </div>
            </div>
            <div class="trx-right">
              <div class="trx-amount ${isMasuk ? 'masuk' : 'keluar'}">
                ${isMasuk ? '+' : '-'} ${HavalandUtils.formatRupiah(t.nominal)}
              </div>
              <span class="badge ${isMasuk ? 'badge-success' : 'badge-danger'}">Kwitansi →</span>
            </div>
          </div>
        `;
      });
      trxContainer.innerHTML = html;
    }
  },

  // =========================================================================
  // DETAIL RINCIAN KAS (FILTER, SEARCH, & RENDERING)
  // =========================================================================
  renderTransaksi() {
    this.filterTransaksi();
  },

  filterTransaksi() {
    const q = (document.getElementById("trx-search")?.value || "").toLowerCase().trim();
    const filterJenis = document.getElementById("trx-filter-jenis")?.value || "semua";
    const filterKategori = document.getElementById("trx-filter-kategori")?.value || "semua";

    const filtered = HavalandData.transaksi.filter(t => {
      // Keyword search
      const matchSearch = !q || 
        t.uraian.toLowerCase().includes(q) || 
        t.kategori.toLowerCase().includes(q) || 
        t.id.toLowerCase().includes(q) || 
        (t.bukti && t.bukti.toLowerCase().includes(q)) || 
        (t.pj && t.pj.toLowerCase().includes(q));

      // Filter Jenis
      const matchJenis = filterJenis === "semua" || t.jenis === filterJenis;

      // Filter Kategori
      const matchKategori = filterKategori === "semua" || t.kategori.includes(filterKategori);

      return matchSearch && matchJenis && matchKategori;
    });

    this.filteredTransaksi = filtered;

    // Hitung Subtotal
    let subtotalIn = 0;
    let subtotalOut = 0;
    filtered.forEach(t => {
      if (t.jenis === "masuk") subtotalIn += t.nominal;
      else subtotalOut += t.nominal;
    });

    const elCount = document.getElementById("trx-count-display");
    const elSubIn = document.getElementById("trx-subtotal-in");
    const elSubOut = document.getElementById("trx-subtotal-out");
    if (elCount) elCount.textContent = filtered.length;
    if (elSubIn) elSubIn.textContent = HavalandUtils.formatRupiah(subtotalIn);
    if (elSubOut) elSubOut.textContent = HavalandUtils.formatRupiah(subtotalOut);

    // Render ke Desktop Table Body
    const tbody = document.getElementById("trx-table-body");
    if (tbody) {
      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">Tidak ditemukan transaksi yang cocok dengan kriteria pencarian.</td></tr>`;
      } else {
        let tHtml = "";
        filtered.forEach(t => {
          const isMasuk = t.jenis === "masuk";
          tHtml += `
            <tr>
              <td style="white-space: nowrap; font-size: 0.82rem; color: var(--text-muted);">${HavalandUtils.formatTanggalSingkat(t.tanggal)}</td>
              <td>
                <span class="badge ${isMasuk ? 'badge-success' : 'badge-danger'}">${t.id}</span>
                <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">Ref: ${t.bukti || '-'}</div>
              </td>
              <td>
                <div style="font-weight: 700; color: var(--text-primary);">${t.uraian}</div>
                <div style="font-size: 0.75rem; color: var(--primary-light); font-weight: 600;">${t.kategori}</div>
              </td>
              <td>
                <div style="font-size: 0.82rem;">${t.metode}</div>
                <div style="font-size: 0.72rem; color: var(--text-muted);">PJ: ${t.pj}</div>
              </td>
              <td style="text-align: right; white-space: nowrap;">
                <span style="font-family: var(--font-heading); font-size: 1rem; font-weight: 800; color: ${isMasuk ? 'var(--accent)' : 'var(--danger)'};">
                  ${isMasuk ? '+' : '-'} ${HavalandUtils.formatRupiah(t.nominal)}
                </span>
              </td>
              <td style="text-align: center;">
                <button class="btn btn-secondary btn-sm" onclick="HavalandApp.openKwitansi('${t.id}')" title="Buka Struk Kwitansi Digital">
                  <svg class="w-4 h-4 mr-1 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  Kwitansi
                </button>
              </td>
            </tr>
          `;
        });
        tbody.innerHTML = tHtml;
      }
    }

    // Render ke Mobile Card Stream
    const mobileStream = document.getElementById("trx-mobile-stream");
    if (mobileStream) {
      if (filtered.length === 0) {
        mobileStream.innerHTML = `<div class="card" style="text-align: center; padding: 2rem; color: var(--text-muted);">Tidak ditemukan transaksi.</div>`;
      } else {
        let mHtml = "";
        filtered.forEach(t => {
          const isMasuk = t.jenis === "masuk";
          mHtml += `
            <div class="trx-mobile-card" onclick="HavalandApp.openKwitansi('${t.id}')">
              <div class="trx-left">
                <div class="trx-icon-circle ${isMasuk ? 'icon-emerald' : 'icon-rose'}">
                  ${isMasuk ? 
                    `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12"/></svg>` : 
                    `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 13l-5 5m0 0l-5-5m5 5V6"/></svg>`
                  }
                </div>
                <div class="trx-info">
                  <h4>${t.uraian}</h4>
                  <p>${HavalandUtils.formatTanggalSingkat(t.tanggal)} • ${t.kategori}</p>
                </div>
              </div>
              <div class="trx-right">
                <div class="trx-amount ${isMasuk ? 'masuk' : 'keluar'}">
                  ${isMasuk ? '+' : '-'} ${HavalandUtils.formatRupiah(t.nominal)}
                </div>
                <span class="badge ${isMasuk ? 'badge-success' : 'badge-danger'}">Kwitansi →</span>
              </div>
            </div>
          `;
        });
        mobileStream.innerHTML = mHtml;
      }
    }
  },

  // Buka Modal Kwitansi Digital Resmi RT Havaland
  openKwitansi(trxId) {
    const trx = HavalandData.transaksi.find(t => t.id === trxId);
    if (!trx) return;

    const isMasuk = trx.jenis === "masuk";

    document.getElementById("modal-kwitansi-title").textContent = `Kwitansi Transaksi: ${trx.id}`;
    document.getElementById("kwt-nomor-id").textContent = `No. Resi: ${trx.id}`;
    document.getElementById("kwt-jenis-title").textContent = isMasuk ? "TANDA BUKTI PENERIMAAN KAS" : "TANDA BUKTI PENGELUARAN KAS";
    document.getElementById("kwt-tanggal").textContent = HavalandUtils.formatTanggal(trx.tanggal);
    document.getElementById("kwt-kategori").textContent = trx.kategori;
    document.getElementById("kwt-uraian").textContent = trx.uraian;
    document.getElementById("kwt-metode").textContent = trx.metode || "Transfer";
    document.getElementById("kwt-pj").textContent = trx.pj || "Bendahara Kas RT 04";
    document.getElementById("kwt-bukti").textContent = trx.bukti || "-";
    document.getElementById("kwt-nominal").textContent = HavalandUtils.formatRupiah(trx.nominal);
    document.getElementById("kwt-terbilang").textContent = isMasuk ? "Lunas Diverifikasi Masuk ke Kas RT 04" : "Disetujui & Dikeluarkan untuk Keperluan Warga";
    document.getElementById("kwt-tgl-ttd").textContent = HavalandUtils.formatTanggal(trx.tanggal);

    this.openModal("modal-kwitansi");
  },

  // =========================================================================
  // JADWAL KEGIATAN RUTIN
  // =========================================================================
  filterKegiatan(kategori, btnEl) {
    // Update active pill
    if (btnEl) {
      document.querySelectorAll("#kegiatan-filter-pills .pill-btn").forEach(p => p.classList.remove("active"));
      btnEl.classList.add("active");
    }

    this.renderKegiatan(kategori);
  },

  renderKegiatan(kategoriFilter = "semua") {
    const container = document.getElementById("kegiatan-cards-stream");
    if (!container) return;

    const list = HavalandData.kegiatan.filter(k => {
      if (kategoriFilter === "semua") return true;
      return k.kategori === kategoriFilter;
    });

    let html = "";
    list.forEach(k => {
      // Piket siskamling table if exists
      let piketTableHtml = "";
      if (k.jadwalPiket) {
        let rows = "";
        k.jadwalPiket.forEach(p => {
          rows += `
            <tr>
              <td><strong>${p.hari}</strong></td>
              <td><span class="badge badge-info">${p.blok}</span></td>
              <td style="font-size: 0.8rem; color: var(--text-secondary);">${p.petugas}</td>
            </tr>
          `;
        });
        piketTableHtml = `
          <div style="margin-top: 0.85rem; border-top: 1px dashed var(--surface-border); padding-top: 0.75rem;">
            <div style="font-size: 0.82rem; font-weight: 700; margin-bottom: 0.4rem; color: var(--primary);">Jadwal Giliran Ronda Tiap Malam:</div>
            <div class="table-responsive">
              <table class="piket-table">
                <thead>
                  <tr>
                    <th>Hari</th>
                    <th>Giliran Blok</th>
                    <th>Warga Piket Pendamping</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          </div>
        `;
      }

      html += `
        <div class="activity-card">
          <div class="activity-main" style="flex: 1;">
            <div class="activity-date-badge">
              <div class="activity-date-day">${k.tipe === 'Rutin' ? 'RUTIN' : 'AGENDA'}</div>
              <div class="activity-date-month">${k.kategori}</div>
            </div>
            <div class="activity-details" style="flex: 1;">
              <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 4px; flex-wrap: wrap;">
                <span class="badge badge-success">${k.statusBadge || 'Aktif'}</span>
                <span style="font-size: 0.78rem; font-weight: 700; color: var(--primary);">⏱ ${k.waktuNext}</span>
              </div>
              <h3 style="font-size: 1.15rem; font-weight: 800;">${k.judul}</h3>
              <p style="font-size: 0.85rem; color: var(--text-secondary);">${k.deskripsi}</p>
              
              <div class="activity-meta-tags">
                <span>📍 Lokasi: <strong>${k.lokasi}</strong></span>
                <span>👤 Koordinator: <strong>${k.koordinator}</strong></span>
                <span>🔄 Frekuensi: ${k.frekuensi}</span>
              </div>

              ${piketTableHtml}
            </div>
          </div>
          <div class="activity-actions" style="flex-direction: column; align-self: flex-start;">
            <button class="btn btn-whatsapp btn-sm" onclick="HavalandApp.shareKegiatanWA('${k.id}')">
              <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.54 1.764.819 2.791.819h.005c3.18 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.765-5.773-5.765zm3.364 8.163c-.144.405-.837.774-1.17.824-.312.045-.634.055-1.921-.479-1.503-.623-2.47-2.148-2.545-2.247-.075-.1-1.01-1.344-1.01-2.564 0-1.22.639-1.82.866-2.066.227-.247.498-.309.664-.309.166 0 .332.002.477.01.155.008.363-.058.567.433.21.505.719 1.752.782 1.88.063.128.105.279.021.446-.084.167-.126.27-.25.417-.125.148-.263.33-.375.443-.125.125-.255.261-.11.51.145.249.645 1.066 1.385 1.725.952.848 1.755 1.111 2.004 1.236.249.125.395.104.541-.063.146-.167.625-.729.791-.979.166-.25.332-.208.562-.125.229.083 1.458.687 1.708.812.25.125.417.188.479.292.062.104.062.604-.082 1.009z"/></svg>
              Bagikan ke Grup WA
            </button>
            <button class="btn btn-secondary btn-sm" onclick="HavalandApp.simpanKalender('${k.id}')">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              Simpan ke Kalender
            </button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  },

  shareKegiatanWA(actId) {
    const k = HavalandData.kegiatan.find(item => item.id === actId);
    if (!k) return;

    const pesan = `*PENGUMUMAN WARGA HAVALAND (RT 04 / RW 12)*%0A%0A*Kegiatan:* ${k.judul}%0A*Waktu:* ${k.waktuNext}%0A*Lokasi:* ${k.lokasi}%0A*Koordinator:* ${k.koordinator}%0A%0A${k.deskripsi}%0A%0ASalam kompak & guyub warga Havaland! 🏡🌿`;
    window.open(`https://api.whatsapp.com/send?text=${pesan}`, "_blank");
  },

  simpanKalender(actId) {
    const k = HavalandData.kegiatan.find(item => item.id === actId);
    if (!k) return;

    // Simple ICS file download
    const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Havaland Residential//Citizen Portal//ID
BEGIN:VEVENT
SUMMARY:${k.judul} - Warga Havaland
DESCRIPTION:${k.deskripsi} (Koor: ${k.koordinator})
LOCATION:${k.lokasi}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsData], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute("download", `${k.judul.replace(/\s+/g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    HavalandUtils.showToast("Kalender Siap", "Jadwal kegiatan berhasil disimpan ke file kalender!", "success");
  },

  // =========================================================================
  // DATA WARGA HAVALAND (DIREKTORI WARGA)
  // =========================================================================
  renderWarga() {
    this.filterWarga();
  },

  filterWarga() {
    const q = (document.getElementById("warga-search")?.value || "").toLowerCase().trim();
    const filterBlok = document.getElementById("warga-filter-blok")?.value || "semua";
    const filterStatus = document.getElementById("warga-filter-status")?.value || "semua";

    const filtered = HavalandData.warga.filter(w => {
      // Search by name, block, or car plates
      const matchSearch = !q ||
        w.namaKK.toLowerCase().includes(q) ||
        w.blok.toLowerCase().includes(q) ||
        w.platKendaraan.some(p => p.toLowerCase().includes(q));

      // Filter Blok
      const matchBlok = filterBlok === "semua" || w.blok.startsWith(filterBlok);

      // Filter Status
      let matchStatus = true;
      if (filterStatus === "belum_bayar") {
        matchStatus = !w.iuranBulanIni;
      } else if (filterStatus !== "semua") {
        matchStatus = w.statusHunian === filterStatus;
      }

      return matchSearch && matchBlok && matchStatus;
    });

    this.filteredWarga = filtered;

    const elTotalKK = document.getElementById("warga-total-kk");
    if (elTotalKK) elTotalKK.textContent = `${filtered.length} KK`;

    const grid = document.getElementById("warga-grid-container");
    if (!grid) return;

    if (filtered.length === 0) {
      grid.innerHTML = `<div class="card" style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-muted);">Tidak ada warga yang sesuai pencarian.</div>`;
      return;
    }

    let html = "";
    filtered.forEach(w => {
      const isLunas = w.iuranBulanIni;
      let badgeHunian = "badge-info";
      if (w.statusHunian === "Tetap") badgeHunian = "badge-success";
      else if (w.statusHunian === "Kontrak") badgeHunian = "badge-warning";
      else if (w.statusHunian === "Kosong") badgeHunian = "badge-purple";

      let vehiclesHtml = "";
      w.platKendaraan.forEach(plat => {
        if (plat !== "-") {
          vehiclesHtml += `<span class="vehicle-pill">🚗 ${plat}</span> `;
        }
      });

      html += `
        <div class="resident-card" onclick="HavalandApp.openDetailWarga('${w.id}')">
          <div>
            <div class="resident-top">
              <div class="house-badge">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
                ${w.blok}
              </div>
              <span class="badge ${badgeHunian}">${w.statusHunian}</span>
            </div>

            <h3 class="resident-name">${w.namaKK}</h3>
            <div class="resident-role">${w.jabatan || 'Warga Havaland'}</div>
          </div>

          <div class="resident-meta">
            <div class="meta-row" style="justify-content: space-between;">
              <span>Jumlah Jiwa: <strong>${w.jumlahJiwa} orang</strong></span>
              <span class="badge ${isLunas ? 'badge-success' : 'badge-danger'}">
                ${isLunas ? 'Iuran Lunas' : 'Belum Lunas'}
              </span>
            </div>

            ${vehiclesHtml ? `
              <div style="margin-top: 4px;">
                <div style="font-size: 0.72rem; color: var(--text-muted); margin-bottom: 2px;">Kendaraan Terdaftar:</div>
                <div style="display: flex; flex-wrap: wrap; gap: 4px;">${vehiclesHtml}</div>
              </div>
            ` : ''}

            <div style="margin-top: 8px; text-align: right;">
              <span style="font-size: 0.78rem; font-weight: 700; color: var(--primary);">Lihat Profil & Kontak →</span>
            </div>
          </div>
        </div>
      `;
    });

    grid.innerHTML = html;
  },

  openDetailWarga(wargaId) {
    const w = HavalandData.warga.find(item => item.id === wargaId);
    if (!w) return;

    document.getElementById("modal-warga-title").textContent = `Profil Warga: ${w.blok} - ${w.namaKK}`;

    let vehicleList = "";
    w.platKendaraan.forEach(v => {
      vehicleList += `<li style="margin-bottom: 3px;">${v}</li>`;
    });

    const isLunas = w.iuranBulanIni;
    const bodyHtml = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
        <div>
          <div class="house-badge" style="display: inline-flex; margin-bottom: 4px;">${w.blok}</div>
          <h3 style="font-size: 1.25rem; font-weight: 800;">${w.namaKK}</h3>
          <div style="font-size: 0.85rem; color: var(--primary); font-weight: 600;">${w.cluster}</div>
        </div>
        <span class="badge ${isLunas ? 'badge-success' : 'badge-danger'}" style="font-size: 0.85rem; padding: 0.35rem 0.75rem;">
          ${isLunas ? 'Iuran Lunas' : 'Belum Lunas'}
        </span>
      </div>

      <div style="display: flex; flex-direction: column; gap: 0.85rem; font-size: 0.9rem; border-top: 1px solid var(--surface-border); padding-top: 1rem;">
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--text-muted);">Status Hunian:</span>
          <strong>${w.statusHunian}</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--text-muted);">Peran / Jabatan:</span>
          <strong>${w.jabatan || 'Warga'}</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--text-muted);">Jumlah Anggota Keluarga:</span>
          <strong>${w.jumlahJiwa} Jiwa</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--text-muted);">Iuran Terakhir Bayar:</span>
          <strong>${w.terakhirBayar}</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--text-muted);">No. Kontak / WA:</span>
          <strong>${w.kontak}</strong>
        </div>
      </div>

      <div style="margin-top: 1.25rem; background: var(--bg-subtle); padding: 1rem; border-radius: var(--radius-md);">
        <div style="font-size: 0.85rem; font-weight: 700; margin-bottom: 0.35rem; color: var(--primary);">Kendaraan Terdata untuk Keamanan Satpam:</div>
        <ul style="padding-left: 1.25rem; font-size: 0.82rem; color: var(--text-secondary);">
          ${vehicleList}
        </ul>
      </div>

      <div style="margin-top: 1.25rem; display: flex; gap: 0.75rem;">
        <a href="https://wa.me/${w.kontak.replace(/[^0-9]/g, '')}" target="_blank" rel="noopener" class="btn btn-whatsapp" style="flex: 1;">
          <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.54 1.764.819 2.791.819h.005c3.18 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.765-5.773-5.765zm3.364 8.163c-.144.405-.837.774-1.17.824-.312.045-.634.055-1.921-.479-1.503-.623-2.47-2.148-2.545-2.247-.075-.1-1.01-1.344-1.01-2.564 0-1.22.639-1.82.866-2.066.227-.247.498-.309.664-.309.166 0 .332.002.477.01.155.008.363-.058.567.433.21.505.719 1.752.782 1.88.063.128.105.279.021.446-.084.167-.126.27-.25.417-.125.148-.263.33-.375.443-.125.125-.255.261-.11.51.145.249.645 1.066 1.385 1.725.952.848 1.755 1.111 2.004 1.236.249.125.395.104.541-.063.146-.167.625-.729.791-.979.166-.25.332-.208.562-.125.229.083 1.458.687 1.708.812.25.125.417.188.479.292.062.104.062.604-.082 1.009z"/></svg>
          Chat WhatsApp
        </a>
      </div>
    `;

    document.getElementById("modal-warga-body").innerHTML = bodyHtml;
    this.openModal("modal-detail-warga");
  },

  // =========================================================================
  // KONTAK DARURAT & ASPIRASI FASILITAS
  // =========================================================================
  renderKontak() {
    const container = document.getElementById("kontak-list-container");
    if (!container) return;

    let html = "";
    HavalandData.profile.kontakDarurat.forEach(c => {
      html += `
        <div style="background: var(--bg-subtle); border: 1px solid var(--surface-border); border-radius: var(--radius-md); padding: 0.9rem 1.1rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="width: 40px; height: 40px; border-radius: var(--radius-full); background: rgba(6, 95, 70, 0.1); color: var(--primary); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
            </div>
            <div>
              <div style="font-weight: 700; color: var(--text-primary);">${c.nama}</div>
              <div style="font-size: 0.75rem; color: var(--primary-light); font-weight: 600;">${c.role} • ${c.nomor}</div>
            </div>
          </div>
          <div style="display: flex; gap: 0.4rem;">
            <a href="tel:${c.nomor.replace(/[^0-9]/g, '')}" class="btn btn-secondary btn-sm" title="Telepon Langsung">
              📞 Panggil
            </a>
            ${c.wa ? `
              <a href="https://wa.me/${c.wa}?text=Halo%20${encodeURIComponent(c.nama)},%20saya%20warga%20Havaland" target="_blank" rel="noopener" class="btn btn-whatsapp btn-sm" title="Chat WhatsApp">
                💬 WA
              </a>
            ` : ''}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  },

  renderAspirasi() {
    const container = document.getElementById("aspirasi-list-container");
    if (!container) return;

    const list = HavalandData.aspirasi;
    const badgeCount = document.getElementById("aspirasi-count-badge");
    if (badgeCount) badgeCount.textContent = `${list.length} Laporan`;

    let html = "";
    list.forEach(a => {
      let badgeStatus = "badge-warning";
      if (a.status === "Selesai") badgeStatus = "badge-success";
      else if (a.status === "Diproses") badgeStatus = "badge-info";

      html += `
        <div style="background: var(--bg-subtle); border: 1px solid var(--surface-border); border-radius: var(--radius-md); padding: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.4rem;">
            <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
              <span class="badge ${badgeStatus}">${a.status}</span>
              <span class="badge badge-purple">${a.kategori}</span>
              <span style="font-size: 0.75rem; color: var(--text-muted);">${HavalandUtils.formatTanggalSingkat(a.tanggal)}</span>
            </div>
            <span style="font-size: 0.75rem; font-weight: 700; color: var(--danger);">Urgensi: ${a.urgensi}</span>
          </div>

          <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.35rem; color: var(--text-primary);">${a.judul}</h4>
          <div style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 0.6rem;">Oleh: <strong>${a.pelapor}</strong></div>

          <div style="background: var(--surface); padding: 0.6rem 0.85rem; border-radius: var(--radius-sm); border-left: 3px solid var(--primary); font-size: 0.8rem; color: var(--text-secondary);">
            <strong>Tanggapan Pengurus RT:</strong> ${a.tanggapan}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  },

  async handleKirimAspirasi(event) {
    event.preventDefault();
    const nama = document.getElementById("asp-nama").value.trim();
    const kategori = document.getElementById("asp-kategori").value;
    const urgensi = document.getElementById("asp-urgensi").value;
    const isi = document.getElementById("asp-isi").value.trim();

    if (!nama || !isi) return;

    const newAspirasi = {
      id: `ASP-00${HavalandData.aspirasi.length + 1}`,
      pelapor: nama,
      kategori: kategori,
      judul: isi,
      tanggal: new Date().toISOString().slice(0, 10),
      status: "Diproses",
      tanggapan: "Laporan telah diterima sistem dan segera diteruskan ke Seksi terkait.",
      urgensi: urgensi
    };

    HavalandData.aspirasi.unshift(newAspirasi);

    // Simpan ke LocalStorage sebagai backup
    const saved = HavalandUtils.loadStorage("custom_aspirasi", []);
    saved.unshift(newAspirasi);
    HavalandUtils.saveStorage("custom_aspirasi", saved);

    this.renderAspirasi();
    this.closeModal("modal-aspirasi");
    document.getElementById("form-aspirasi").reset();

    HavalandUtils.showToast("Laporan Terkirim", "Terima kasih, aspirasi fasilitas Anda telah dicatat pengurus RT!", "success");

    // Kirim ke Vercel Cloud Database jika API tersedia
    try {
      fetch("/api/aspirasi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAspirasi)
      });
    } catch (e) {
      console.log("Cloud sync aspirasi dilewati (mode offline).");
    }
  },

  // =========================================================================
  // TAMBAH TRANSAKSI KAS BARU (SIMULASI PENGURUS)
  // =========================================================================
  openTambahTransaksiModal() {
    document.getElementById("new-trx-tanggal").value = new Date().toISOString().slice(0, 10);
    this.openModal("modal-tambah-trx");
  },

  async handleTambahTransaksi(event) {
    event.preventDefault();
    const jenis = document.getElementById("new-trx-jenis").value;
    const tanggal = document.getElementById("new-trx-tanggal").value;
    const kategori = document.getElementById("new-trx-kategori").value;
    const uraian = document.getElementById("new-trx-uraian").value.trim();
    const nominal = parseInt(document.getElementById("new-trx-nominal").value, 10);
    const metode = document.getElementById("new-trx-metode").value;
    const pj = document.getElementById("new-trx-pj").value.trim();
    const bukti = document.getElementById("new-trx-bukti").value.trim() || `KWT-${Date.now().toString().slice(-4)}`;

    if (!uraian || isNaN(nominal) || nominal <= 0) {
      HavalandUtils.showToast("Gagal", "Mohon isi uraian dan nominal yang valid", "error");
      return;
    }

    const newTrx = {
      id: `TRX-${tanggal.replace(/-/g, '').slice(0, 6)}-${(HavalandData.transaksi.length + 1).toString().padStart(3, '0')}`,
      tanggal: tanggal,
      jenis: jenis,
      kategori: kategori,
      uraian: uraian,
      nominal: nominal,
      metode: metode,
      pj: pj,
      bukti: bukti,
      status: "Verified",
      catatan: "Dicatat oleh pengurus RT 04"
    };

    HavalandData.transaksi.unshift(newTrx);

    // Simpan ke LocalStorage sebagai cadangan instan
    const saved = HavalandUtils.loadStorage("custom_transaksi", []);
    saved.unshift(newTrx);
    HavalandUtils.saveStorage("custom_transaksi", saved);

    this.recalculateSummary();
    this.renderKPIs();
    this.filterTransaksi();
    this.renderBerandaHighlights();

    this.closeModal("modal-tambah-trx");
    document.getElementById("form-tambah-trx").reset();

    HavalandUtils.showToast("Berhasil Dicatat", `Transaksi ${newTrx.id} senilai ${HavalandUtils.formatRupiah(nominal)} berhasil masuk buku kas!`, "success");

    // Kirim ke Vercel Cloud Database jika API tersedia
    try {
      fetch("/api/transaksi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTrx)
      });
    } catch (e) {
      console.log("Cloud sync transaksi dilewati (mode offline).");
    }
  },

  // =========================================================================
  // CEK IURAN RUMAH SAYA & KONFIRMASI WA
  // =========================================================================
  populateRumahDropdown() {
    const select = document.getElementById("select-rumah-iuran");
    if (!select) return;

    let options = `<option value="">-- Pilih Nomor Blok Rumah Anda --</option>`;
    HavalandData.warga.forEach(w => {
      options += `<option value="${w.id}">${w.blok} - ${w.namaKK} (${w.statusHunian})</option>`;
    });
    select.innerHTML = options;
  },

  openCekIuranModal() {
    this.openModal("modal-cek-iuran");
  },

  updateCekIuranDetail() {
    const select = document.getElementById("select-rumah-iuran");
    const resultBox = document.getElementById("cek-iuran-result");
    const wargaId = select.value;

    if (!wargaId) {
      resultBox.style.display = "none";
      this.selectedWargaIuran = null;
      return;
    }

    const w = HavalandData.warga.find(item => item.id === wargaId);
    if (!w) return;

    this.selectedWargaIuran = w;

    document.getElementById("cek-blok-label").textContent = w.blok;
    document.getElementById("cek-nama-kk").textContent = w.namaKK;
    document.getElementById("cek-cluster-label").textContent = w.cluster;
    document.getElementById("cek-terakhir-bayar").textContent = w.terakhirBayar;

    const isLunas = w.iuranBulanIni;
    const badgeContainer = document.getElementById("cek-status-badge");
    const statusText = document.getElementById("cek-bulan-status");

    if (isLunas) {
      badgeContainer.innerHTML = `<span class="badge badge-success" style="font-size: 0.85rem;">Lunas Terverifikasi</span>`;
      statusText.innerHTML = `<span style="color: var(--accent); font-weight: 700;">Lunas (September 2026)</span>`;
    } else {
      badgeContainer.innerHTML = `<span class="badge badge-danger" style="font-size: 0.85rem;">Belum Terbayar</span>`;
      statusText.innerHTML = `<span style="color: var(--danger); font-weight: 700;">Menunggu Pembayaran (Rp 350.000)</span>`;
    }

    resultBox.style.display = "block";
  },

  kirimWAKonfirmasi() {
    if (!this.selectedWargaIuran) {
      HavalandUtils.showToast("Pilih Rumah", "Silakan pilih nomor rumah terlebih dahulu", "warning");
      return;
    }

    const w = this.selectedWargaIuran;
    const pesan = `Halo Ibu Citra Lestari (Bendahara RT 04 Havaland),%0A%0ASaya ingin konfirmasi pembayaran iuran kas bulanan:%0A*Nama KK:* ${encodeURIComponent(w.namaKK)}%0A*Blok/No. Rumah:* ${w.blok}%0A*Nominal:* Rp 350.000 (September 2026)%0A%0ABerikut saya lampirkan bukti transfer terlampir. Terima kasih.`;
    window.open(`https://wa.me/6282165778899?text=${pesan}`, "_blank");
  },

  openKonfirmasiWAPopup() {
    const pesan = `Halo Ibu Citra (Bendahara RT 04 Havaland), saya ingin konfirmasi pembayaran iuran kas bulanan warga Havaland. Berikut saya lampirkan bukti transfer.`;
    window.open(`https://wa.me/6282165778899?text=${encodeURIComponent(pesan)}`, "_blank");
  },

  salinRekening(norek) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(norek).then(() => {
        HavalandUtils.showToast("Disalin", `Nomor Rekening ${norek} berhasil disalin ke clipboard!`, "success");
      });
    } else {
      HavalandUtils.showToast("Nomor Rekening", norek, "info");
    }
  },

  openAspirasiModal() {
    this.openModal("modal-aspirasi");
  },

  // Modal Helpers
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add("active");
      document.body.style.overflow = "hidden"; // Prevent background scroll
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove("active");
      document.body.style.overflow = "";
    }
  },

  handleBackdropClick(event, modalId) {
    if (event.target.id === modalId) {
      this.closeModal(modalId);
    }
  },

  initDateInputs() {
    const today = new Date().toISOString().slice(0, 10);
    const dateInput = document.getElementById("new-trx-tanggal");
    if (dateInput) dateInput.value = today;
  }
};

// Start application when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  HavalandApp.init();
});

// Export to window
if (typeof window !== "undefined") {
  window.HavalandApp = HavalandApp;
}
