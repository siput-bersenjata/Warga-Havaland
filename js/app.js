/**
 * Havaland Community Portal - Main Application Logic
 * RT 04 / RW 08, Kelurahan Havaland Asri
 */

const HavalandApp = {
  activeTab: "beranda",
  currentTheme: "light",
  filteredTransaksi: [],
  filteredWarga: [],
  selectedWargaIuran: null,
  currentBlokFilter: "semua",
  activeAutocompleteIndex: -1,
  currentMatchingWarga: [],

  // Inisialisasi Aplikasi
  init() {
    this.initTheme();
    HavalandSettings.init();
    HavalandAuth.init();
    HavalandProposals.init();
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
    this.initAutocomplete();
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

  // Muat data lokal tambahan (jika ada transaksi/aspirasi/kegiatan/usulan baru di localStorage)
  loadPersistedData() {
    const customTrx = HavalandUtils.loadStorage("custom_transaksi", []);
    if (customTrx && customTrx.length > 0) {
      HavalandData.transaksi = [...customTrx, ...HavalandData.transaksi];
      this.recalculateSummary();
    }

    const customKeg = HavalandUtils.loadStorage("custom_kegiatan", []);
    if (customKeg && customKeg.length > 0) {
      HavalandData.kegiatan = [...customKeg, ...HavalandData.kegiatan];
    }

    const customUsulan = HavalandUtils.loadStorage("custom_usulan", []);
    if (customUsulan && customUsulan.length > 0) {
      HavalandData.usulanIde = [...customUsulan, ...HavalandData.usulanIde];
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
                <div style="display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap; margin-top: 3px;">
                  <span style="font-size: 0.75rem; color: var(--primary-light); font-weight: 600;">${t.kategori}</span>
                  <span class="audit-badge" title="Pencatat Transaksi">👤 ${t.createdBy || t.pj}</span>
                </div>
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
              <td style="text-align: center; white-space: nowrap;">
                <div style="display: inline-flex; gap: 4px; align-items: center;">
                  <button class="btn btn-secondary btn-sm" onclick="HavalandApp.openKwitansi('${t.id}')" title="Buka Struk Kwitansi Digital">
                    <svg class="w-4 h-4 mr-1 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    Kwitansi
                  </button>
                  <button class="btn btn-sm" style="color: var(--danger); padding: 4px 6px; border: 1px solid rgba(239, 68, 68, 0.25); background: transparent;" onclick="HavalandApp.hapusTransaksi('${t.id}', event)" title="Hapus Transaksi (Khusus Warga/Admin Login)">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                </div>
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
                  <div style="margin-top: 3px;"><span class="audit-badge">👤 ${t.createdBy || t.pj}</span></div>
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
                <span class="audit-badge">📝 Pencatat: ${k.createdBy || k.koordinator}</span>
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
            <button class="btn btn-sm" style="color: var(--danger); border: 1px solid rgba(239, 68, 68, 0.25); background: transparent; font-size: 0.75rem;" onclick="HavalandApp.hapusKegiatan('${k.id}')" title="Hapus Jadwal Kegiatan">
              <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              Hapus
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

    const pesan = `*PENGUMUMAN WARGA HAVALAND (RT 04 / RW 08)*%0A%0A*Kegiatan:* ${k.judul}%0A*Waktu:* ${k.waktuNext}%0A*Lokasi:* ${k.lokasi}%0A*Koordinator:* ${k.koordinator}%0A%0A${k.deskripsi}%0A%0ASalam kompak & guyub warga Havaland! 🏡🌿`;
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
  // TAMBAH & KELOLA TRANSAKSI KAS (CRUD WARGA & PENGURUS DENGAN AUDIT PENCATAT)
  // =========================================================================
  openTambahTransaksiModal() {
    if (!HavalandAuth.isLoggedIn()) {
      HavalandUtils.showToast("Akses Diperlukan", "Silakan masuk akun terlebih dahulu untuk mencatat transaksi dan menyertakan nama pencatat", "info");
      HavalandAuth.openLoginModal();
      return;
    }
    const user = HavalandAuth.getCurrentUser();
    const pjInput = document.getElementById("new-trx-pj");
    if (pjInput && user) {
      pjInput.value = `${user.nama} (${user.role})`;
    }
    document.getElementById("new-trx-tanggal").value = new Date().toISOString().slice(0, 10);
    this.openModal("modal-tambah-trx");
  },

  async handleTambahTransaksi(event) {
    event.preventDefault();
    const user = HavalandAuth.getCurrentUser();
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

    const pencatatInfo = user ? `${user.nama} (${user.role})` : "Pengurus RT 04";

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
      createdBy: pencatatInfo,
      createdAt: new Date().toISOString(),
      catatan: `Dicatat oleh ${pencatatInfo}`
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

    // Trigger auto snapshot backup jika aktif
    if (typeof HavalandBackup !== "undefined") {
      HavalandBackup.autoSnapshot();
    }

    HavalandUtils.showToast("Berhasil Dicatat", `Transaksi ${newTrx.id} dicatat oleh ${pencatatInfo}!`, "success");

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

  hapusTransaksi(trxId, e) {
    if (e) e.stopPropagation();
    if (!HavalandAuth.isLoggedIn()) {
      HavalandUtils.showToast("Akses Terbatas", "Silakan masuk akun terlebih dahulu untuk menghapus transaksi kas", "warning");
      HavalandAuth.openLoginModal();
      return;
    }
    const user = HavalandAuth.getCurrentUser();
    if (!confirm(`Hapus catatan transaksi ${trxId}? Tindakan ini akan dicatat atas nama ${user.nama}.`)) return;

    HavalandData.transaksi = HavalandData.transaksi.filter(t => t.id !== trxId);
    HavalandUtils.saveStorage("custom_transaksi", HavalandData.transaksi);
    this.recalculateSummary();
    this.renderKPIs();
    this.filterTransaksi();
    this.renderBerandaHighlights();
    if (typeof HavalandBackup !== "undefined") HavalandBackup.autoSnapshot();
    HavalandUtils.showToast("Dihapus", `Transaksi ${trxId} berhasil dihapus oleh ${user.nama}`, "info");
  },

  // =========================================================================
  // TAMBAH & KELOLA JADWAL KEGIATAN (CRUD)
  // =========================================================================
  openTambahKegiatanModal() {
    if (!HavalandAuth.isLoggedIn()) {
      HavalandUtils.showToast("Akses Diperlukan", "Silakan masuk akun terlebih dahulu untuk menambah jadwal kegiatan", "info");
      HavalandAuth.openLoginModal();
      return;
    }
    const user = HavalandAuth.getCurrentUser();
    const pjInput = document.getElementById("keg-pj");
    if (pjInput && user) {
      pjInput.value = `${user.nama} (${user.role})`;
    }
    this.openModal("modal-tambah-kegiatan");
  },

  handleTambahKegiatan(event) {
    event.preventDefault();
    if (!HavalandAuth.isLoggedIn()) {
      HavalandAuth.openLoginModal();
      return;
    }
    const user = HavalandAuth.getCurrentUser();
    const nama = document.getElementById("keg-nama").value.trim();
    const kategori = document.getElementById("keg-kategori").value;
    const status = document.getElementById("keg-status").value;
    const jadwal = document.getElementById("keg-jadwal").value.trim();
    const waktu = document.getElementById("keg-waktu").value.trim();
    const lokasi = document.getElementById("keg-lokasi").value.trim();
    const pj = document.getElementById("keg-pj").value.trim();
    const deskripsi = document.getElementById("keg-deskripsi").value.trim();

    const pencatatInfo = `${user.nama} (${user.role})`;

    const newKeg = {
      id: `ACT-${Date.now().toString().slice(-4)}`,
      tipe: "Agenda Khusus",
      kategori: kategori,
      judul: nama,
      waktuNext: `${jadwal} • ${waktu}`,
      lokasi: lokasi,
      koordinator: pj,
      frekuensi: status,
      statusBadge: status,
      deskripsi: deskripsi,
      createdBy: pencatatInfo,
      createdAt: new Date().toISOString()
    };

    HavalandData.kegiatan.unshift(newKeg);
    const saved = HavalandUtils.loadStorage("custom_kegiatan", []);
    saved.unshift(newKeg);
    HavalandUtils.saveStorage("custom_kegiatan", saved);

    this.renderKegiatan("semua");
    this.renderBerandaHighlights();
    this.closeModal("modal-tambah-kegiatan");
    document.getElementById("form-tambah-kegiatan").reset();

    if (typeof HavalandBackup !== "undefined") HavalandBackup.autoSnapshot();
    HavalandUtils.showToast("Jadwal Ditambahkan", `Agenda '${nama}' dicatat oleh ${user.nama}!`, "success");
  },

  hapusKegiatan(kegId) {
    if (!HavalandAuth.isLoggedIn()) {
      HavalandUtils.showToast("Akses Terbatas", "Silakan login untuk menghapus jadwal kegiatan", "warning");
      HavalandAuth.openLoginModal();
      return;
    }
    const user = HavalandAuth.getCurrentUser();
    if (!confirm(`Hapus jadwal kegiatan ini? Tindakan ini akan dicatat atas nama ${user.nama}.`)) return;

    HavalandData.kegiatan = HavalandData.kegiatan.filter(k => k.id !== kegId);
    HavalandUtils.saveStorage("custom_kegiatan", HavalandData.kegiatan);
    this.renderKegiatan("semua");
    this.renderBerandaHighlights();
    if (typeof HavalandBackup !== "undefined") HavalandBackup.autoSnapshot();
    HavalandUtils.showToast("Agenda Dihapus", `Kegiatan berhasil dihapus oleh ${user.nama}`, "info");
  },

  openSettingsModal() {
    if (typeof HavalandSettings !== "undefined") {
      HavalandSettings.openModal();
    } else {
      this.openModal("modal-pengaturan");
    }
  },

  // =========================================================================
  // CEK IURAN RUMAH SAYA & AUTOCOMPLETE REKOMENDASI BLOK
  // =========================================================================
  initAutocomplete() {
    // Populate datalist for transaction description suggestions
    const datalistTrx = document.getElementById("datalist-warga-trx");
    if (datalistTrx && HavalandData.warga) {
      datalistTrx.innerHTML = HavalandData.warga.map(w => 
        `<option value="Iuran Kas September - ${w.namaKK} (${w.blok})"></option>`
      ).join("");
    }

    // Close autocomplete dropdowns when clicking outside
    document.addEventListener("click", (e) => {
      const blokWrapper = document.getElementById("autocomplete-blok-wrapper");
      const dropBlok = document.getElementById("autocomplete-dropdown-blok");
      if (dropBlok && blokWrapper && !blokWrapper.contains(e.target)) {
        dropBlok.style.display = "none";
      }

      const aspWrapper = document.getElementById("autocomplete-asp-wrapper");
      const dropAsp = document.getElementById("autocomplete-dropdown-aspirasi");
      if (dropAsp && aspWrapper && !aspWrapper.contains(e.target)) {
        dropAsp.style.display = "none";
      }
    });
  },

  populateRumahDropdown() {
    const select = document.getElementById("select-rumah-iuran");
    if (select) {
      let options = `<option value="">-- Pilih Nomor Blok Rumah Anda --</option>`;
      HavalandData.warga.forEach(w => {
        options += `<option value="${w.id}">${w.blok} - ${w.namaKK} (${w.statusHunian})</option>`;
      });
      select.innerHTML = options;
    }

    this.renderBlokRecommendations("", "semua");
  },

  openCekIuranModal() {
    this.openModal("modal-cek-iuran");
    this.currentBlokFilter = "semua";
    this.activeAutocompleteIndex = -1;

    // Reset filter pills
    const pills = document.querySelectorAll("#blok-filter-pills .pill-btn");
    pills.forEach(p => {
      if (p.getAttribute("data-blok") === "semua") p.classList.add("active");
      else p.classList.remove("active");
    });

    const searchInput = document.getElementById("input-cari-blok");
    const clearBtn = document.getElementById("btn-clear-cari-blok");

    if (searchInput) {
      if (!this.selectedWargaIuran) {
        searchInput.value = "";
        if (clearBtn) clearBtn.style.display = "none";
      } else {
        searchInput.value = `${this.selectedWargaIuran.blok} - ${this.selectedWargaIuran.namaKK} (${this.selectedWargaIuran.statusHunian})`;
        if (clearBtn) clearBtn.style.display = "flex";
      }

      setTimeout(() => {
        searchInput.focus();
        this.renderBlokRecommendations(searchInput.value, this.currentBlokFilter);
        this.showBlokDropdown();
      }, 150);
    }
  },

  setBlokQuickFilter(blok, btn) {
    this.currentBlokFilter = blok;
    const pills = document.querySelectorAll("#blok-filter-pills .pill-btn");
    pills.forEach(p => p.classList.remove("active"));
    if (btn) btn.classList.add("active");

    const input = document.getElementById("input-cari-blok");
    let query = input ? input.value : "";
    // If input already has a full selection string, clear it so all houses in this block appear
    if (query.includes(" - ")) {
      query = "";
      if (input) input.value = "";
      const clearBtn = document.getElementById("btn-clear-cari-blok");
      if (clearBtn) clearBtn.style.display = "none";
    }

    this.renderBlokRecommendations(query, blok);
    this.showBlokDropdown();
  },

  handleCariBlokInput(e) {
    const query = e.target.value;
    const clearBtn = document.getElementById("btn-clear-cari-blok");
    if (clearBtn) {
      clearBtn.style.display = query.trim().length > 0 ? "flex" : "none";
    }
    this.renderBlokRecommendations(query, this.currentBlokFilter);
    this.showBlokDropdown();
  },

  clearCariBlok() {
    const input = document.getElementById("input-cari-blok");
    const clearBtn = document.getElementById("btn-clear-cari-blok");
    if (input) {
      input.value = "";
      input.focus();
    }
    if (clearBtn) clearBtn.style.display = "none";

    const select = document.getElementById("select-rumah-iuran");
    if (select) select.value = "";
    this.updateCekIuranDetail();

    this.renderBlokRecommendations("", this.currentBlokFilter);
    this.showBlokDropdown();
  },

  showBlokDropdown() {
    const dropdown = document.getElementById("autocomplete-dropdown-blok");
    if (dropdown) dropdown.style.display = "block";
  },

  hideBlokDropdown(delay = 180) {
    setTimeout(() => {
      const dropdown = document.getElementById("autocomplete-dropdown-blok");
      if (dropdown) dropdown.style.display = "none";
    }, delay);
  },

  highlightMatch(text, query) {
    if (!query || !query.trim()) return HavalandUtils.escapeHtml(text);
    const q = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const safeText = HavalandUtils.escapeHtml(text);
    const regex = new RegExp(`(${q})`, "gi");
    return safeText.replace(regex, '<span class="autocomplete-highlight">$1</span>');
  },

  renderBlokRecommendations(query = "", filterBlok = "semua") {
    const dropdown = document.getElementById("autocomplete-dropdown-blok");
    if (!dropdown) return;

    const rawQ = (query || "").trim();
    const qLower = rawQ.toLowerCase();
    const qClean = qLower.replace(/[\s\-]/g, "");

    let matches = HavalandData.warga.filter(w => {
      // 1. Filter by Blok Cluster if active
      if (filterBlok && filterBlok !== "semua") {
        if (!w.blok.toUpperCase().startsWith(filterBlok.toUpperCase() + "-")) {
          return false;
        }
      }

      // If no query string, keep all for this cluster
      if (!rawQ) return true;

      const blokLower = w.blok.toLowerCase();
      const blokClean = blokLower.replace(/[\s\-]/g, "");
      const namaLower = w.namaKK.toLowerCase();
      const clusterLower = w.cluster.toLowerCase();
      const hunianLower = (w.statusHunian || "").toLowerCase();

      return (
        blokLower.includes(qLower) ||
        blokClean.includes(qClean) ||
        namaLower.includes(qLower) ||
        clusterLower.includes(qLower) ||
        hunianLower.includes(qLower)
      );
    });

    // Sort: exact/prefix match on blok or nama first
    if (rawQ) {
      matches.sort((a, b) => {
        const aBlokMatch = a.blok.toLowerCase().startsWith(qLower) || a.blok.toLowerCase().replace(/[\s\-]/g, "").startsWith(qClean);
        const bBlokMatch = b.blok.toLowerCase().startsWith(qLower) || b.blok.toLowerCase().replace(/[\s\-]/g, "").startsWith(qClean);
        if (aBlokMatch && !bBlokMatch) return -1;
        if (!aBlokMatch && bBlokMatch) return 1;

        const aNamaMatch = a.namaKK.toLowerCase().startsWith(qLower);
        const bNamaMatch = b.namaKK.toLowerCase().startsWith(qLower);
        if (aNamaMatch && !bNamaMatch) return -1;
        if (!aNamaMatch && bNamaMatch) return 1;

        return a.blok.localeCompare(b.blok);
      });
    }

    this.currentMatchingWarga = matches;
    this.activeAutocompleteIndex = -1;

    if (matches.length === 0) {
      dropdown.innerHTML = `
        <div class="autocomplete-empty">
          <svg class="w-8 h-8" style="margin: 0 auto 0.5rem; opacity: 0.5; stroke: var(--text-muted);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <div>Tidak ada data rumah terdaftar yang cocok dengan <strong>"${HavalandUtils.escapeHtml(rawQ)}"</strong></div>
          <div style="font-size: 0.72rem; margin-top: 0.35rem; color: var(--text-muted);">Coba ketik nomor blok lain (misal: A-01, B-08) atau klik tombol tab blok di atas.</div>
        </div>
      `;
      return;
    }

    let html = `
      <div class="autocomplete-header-tip">
        <span>Rekomendasi Rumah (${matches.length})</span>
        <span style="font-size: 0.65rem; color: var(--text-muted);">Klik atau Tekan Enter ↵</span>
      </div>
    `;

    matches.slice(0, 30).forEach((w, index) => {
      const blokHighlighted = this.highlightMatch(w.blok, rawQ);
      const namaHighlighted = this.highlightMatch(w.namaKK, rawQ);
      const isLunas = w.iuranBulanIni;
      const statusBadge = isLunas
        ? `<span class="badge badge-success autocomplete-item-badge">Lunas</span>`
        : `<span class="badge badge-danger autocomplete-item-badge">Belum Bayar</span>`;

      html += `
        <div class="autocomplete-item ${index === 0 && rawQ ? 'active' : ''}" 
             data-index="${index}" 
             data-id="${w.id}" 
             onclick="HavalandApp.pilihRumahFromAutocomplete('${w.id}')"
             onmouseenter="HavalandApp.highlightAutocompleteItem(${index})">
          <div class="autocomplete-item-left">
            <span class="autocomplete-item-blok">${blokHighlighted}</span>
            <div class="autocomplete-item-info">
              <span class="autocomplete-item-name">${namaHighlighted}</span>
              <span class="autocomplete-item-sub">${w.cluster} • <em>${w.statusHunian}</em></span>
            </div>
          </div>
          <div>
            ${statusBadge}
          </div>
        </div>
      `;
    });

    if (matches.length > 30) {
      html += `<div style="text-align: center; padding: 0.4rem; font-size: 0.72rem; color: var(--text-muted);">Menampilkan 30 dari ${matches.length} rumah. Ketik lebih spesifik untuk menyaring.</div>`;
    }

    dropdown.innerHTML = html;
    if (rawQ && matches.length > 0) {
      this.activeAutocompleteIndex = 0;
    }
  },

  highlightAutocompleteItem(index) {
    this.activeAutocompleteIndex = index;
    const items = document.querySelectorAll("#autocomplete-dropdown-blok .autocomplete-item");
    items.forEach((item, i) => {
      if (i === index) item.classList.add("active");
      else item.classList.remove("active");
    });
  },

  handleCariBlokKeydown(e) {
    const dropdown = document.getElementById("autocomplete-dropdown-blok");
    const items = dropdown ? dropdown.querySelectorAll(".autocomplete-item") : [];
    if (!items.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      this.activeAutocompleteIndex = (this.activeAutocompleteIndex + 1) % items.length;
      this.highlightAutocompleteItem(this.activeAutocompleteIndex);
      if (items[this.activeAutocompleteIndex]) {
        items[this.activeAutocompleteIndex].scrollIntoView({ block: "nearest" });
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      this.activeAutocompleteIndex = (this.activeAutocompleteIndex - 1 + items.length) % items.length;
      this.highlightAutocompleteItem(this.activeAutocompleteIndex);
      if (items[this.activeAutocompleteIndex]) {
        items[this.activeAutocompleteIndex].scrollIntoView({ block: "nearest" });
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (this.activeAutocompleteIndex >= 0 && this.currentMatchingWarga[this.activeAutocompleteIndex]) {
        const selected = this.currentMatchingWarga[this.activeAutocompleteIndex];
        this.pilihRumahFromAutocomplete(selected.id);
      }
    } else if (e.key === "Escape") {
      dropdown.style.display = "none";
    }
  },

  pilihRumahFromAutocomplete(wargaId) {
    const w = HavalandData.warga.find(x => x.id === wargaId);
    if (!w) return;

    const input = document.getElementById("input-cari-blok");
    if (input) {
      input.value = `${w.blok} - ${w.namaKK} (${w.statusHunian})`;
    }

    const clearBtn = document.getElementById("btn-clear-cari-blok");
    if (clearBtn) clearBtn.style.display = "flex";

    const select = document.getElementById("select-rumah-iuran");
    if (select) {
      select.value = w.id;
    }

    this.updateCekIuranDetail();

    const dropdown = document.getElementById("autocomplete-dropdown-blok");
    if (dropdown) dropdown.style.display = "none";
  },

  // =========================================================================
  // AUTOCOMPLETE ASPIRASI PELAPOR & BLOK
  // =========================================================================
  handleAspirasiPelaporInput(e) {
    const query = e.target.value;
    const dropdown = document.getElementById("autocomplete-dropdown-aspirasi");
    if (!dropdown) return;

    if (!query || query.trim().length === 0) {
      dropdown.style.display = "none";
      return;
    }

    const qLower = query.trim().toLowerCase();
    const qClean = qLower.replace(/[\s\-]/g, "");

    const matches = HavalandData.warga.filter(w => {
      const blokLower = w.blok.toLowerCase();
      const blokClean = blokLower.replace(/[\s\-]/g, "");
      const namaLower = w.namaKK.toLowerCase();
      return (
        blokLower.includes(qLower) ||
        blokClean.includes(qClean) ||
        namaLower.includes(qLower)
      );
    });

    if (matches.length === 0) {
      dropdown.style.display = "none";
      return;
    }

    let html = `
      <div class="autocomplete-header-tip">
        <span>Rekomendasi Warga Havaland</span>
        <span style="font-size: 0.65rem; color: var(--text-muted);">Pilih untuk isi otomatis</span>
      </div>
    `;

    matches.slice(0, 8).forEach(w => {
      const blokHighlighted = this.highlightMatch(w.blok, query);
      const namaHighlighted = this.highlightMatch(w.namaKK, query);
      html += `
        <div class="autocomplete-item" onclick="HavalandApp.pilihAspirasiPelapor('${HavalandUtils.escapeHtml(w.namaKK)}', '${w.blok}')">
          <div class="autocomplete-item-left">
            <span class="autocomplete-item-blok">${blokHighlighted}</span>
            <div class="autocomplete-item-info">
              <span class="autocomplete-item-name">${namaHighlighted}</span>
              <span class="autocomplete-item-sub">${w.cluster}</span>
            </div>
          </div>
          <span class="badge badge-info" style="font-size: 0.65rem;">Pilih</span>
        </div>
      `;
    });

    dropdown.innerHTML = html;
    dropdown.style.display = "block";
  },

  showAspirasiDropdown() {
    const input = document.getElementById("asp-nama");
    if (input && input.value.trim().length > 0) {
      this.handleAspirasiPelaporInput({ target: input });
    }
  },

  pilihAspirasiPelapor(nama, blok) {
    const input = document.getElementById("asp-nama");
    if (input) {
      input.value = `${nama} (Blok ${blok})`;
    }
    const dropdown = document.getElementById("autocomplete-dropdown-aspirasi");
    if (dropdown) dropdown.style.display = "none";
  },

  updateCekIuranDetail() {
    const select = document.getElementById("select-rumah-iuran");
    const resultBox = document.getElementById("cek-iuran-result");
    const wargaId = select ? select.value : null;

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

// =============================================================================
// MODUL 1: AUTENTIKASI PENGGUNA (WARGA & PENGURUS RT)
// =============================================================================
const HavalandAuth = {
  currentUser: null,

  init() {
    try {
      const savedUser = localStorage.getItem("havaland_auth_user");
      if (savedUser) {
        this.currentUser = JSON.parse(savedUser);
      }
    } catch (e) {
      this.currentUser = null;
    }
    this.updateUI();
  },

  isLoggedIn() {
    return !!this.currentUser;
  },

  isAdmin() {
    return !!(this.currentUser && this.currentUser.isAdmin);
  },

  getCurrentUser() {
    return this.currentUser;
  },

  openLoginModal(targetRole = null) {
    const userInput = document.getElementById("login-username");
    const passInput = document.getElementById("login-password");
    const errMsg = document.getElementById("login-error-msg");

    if (userInput) userInput.value = targetRole === 'admin' ? "admin" : "";
    if (passInput) passInput.value = targetRole === 'admin' ? "havaland2026" : "";
    if (errMsg) errMsg.style.display = "none";

    HavalandApp.openModal("modal-login");
  },

  handleFormLogin(event) {
    event.preventDefault();
    const userVal = document.getElementById("login-username").value.trim().toLowerCase();
    const passVal = document.getElementById("login-password").value.trim();
    const errMsg = document.getElementById("login-error-msg");

    const matched = HavalandData.akunPengguna.find(u => 
      u.username.toLowerCase() === userVal && u.password === passVal
    );

    if (matched) {
      this.currentUser = matched;
      localStorage.setItem("havaland_auth_user", JSON.stringify(matched));
      this.updateUI();
      HavalandApp.closeModal("modal-login");
      HavalandUtils.showToast(
        "Berhasil Masuk",
        `Selamat datang, ${matched.nama}! Anda masuk sebagai ${matched.role}.`,
        "success"
      );
      if (typeof HavalandSettings !== "undefined") {
        HavalandSettings.renderBackupSection();
      }
    } else {
      if (errMsg) {
        errMsg.textContent = "Nama pengguna atau kata sandi tidak cocok. Silakan coba lagi.";
        errMsg.style.display = "block";
      }
    }
  },

  quickLogin(accountKey) {
    let target = null;
    if (accountKey === "admin") {
      target = HavalandData.akunPengguna.find(u => u.isAdmin && (u.username === "ketua_rt" || u.username === "admin"));
    } else if (accountKey === "bendahara") {
      target = HavalandData.akunPengguna.find(u => u.username === "admin");
    } else if (accountKey === "warga-bambang") {
      target = HavalandData.akunPengguna.find(u => u.username === "bambang_a01");
    } else if (accountKey === "warga-michael") {
      target = HavalandData.akunPengguna.find(u => u.username === "kevin_a03" || u.username === "wisnu_c06");
    } else {
      target = HavalandData.akunPengguna.find(u => u.username === accountKey);
    }

    if (target) {
      this.currentUser = target;
      localStorage.setItem("havaland_auth_user", JSON.stringify(target));
      this.updateUI();
      HavalandApp.closeModal("modal-login");
      HavalandUtils.showToast(
        "Simulasi Masuk Berhasil",
        `Masuk sebagai ${target.nama} (${target.role})`,
        "success"
      );
      if (typeof HavalandSettings !== "undefined") {
        HavalandSettings.renderBackupSection();
      }
    }
  },

  logout() {
    this.currentUser = null;
    localStorage.removeItem("havaland_auth_user");
    this.updateUI();
    if (typeof HavalandSettings !== "undefined") {
      HavalandSettings.renderBackupSection();
    }
    HavalandUtils.showToast("Keluar Akun", "Anda telah keluar dari akun. Berjalan dalam mode pengunjung.", "info");
  },

  handleClickAuth() {
    if (this.currentUser) {
      const msg = `Halo ${this.currentUser.nama} (${this.currentUser.role})!\n\nApakah Anda ingin keluar (Logout) atau mengganti akun?`;
      if (confirm(msg)) {
        this.logout();
      }
    } else {
      this.openLoginModal();
    }
  },

  updateUI() {
    const btn = document.getElementById("user-auth-indicator");
    const nameLabel = document.getElementById("user-auth-name");
    if (!btn || !nameLabel) return;

    if (this.currentUser) {
      const roleIcon = this.currentUser.isAdmin ? "👑" : "👤";
      const shortName = this.currentUser.nama.split(",")[0].split(" ")[0];
      const roleBadge = this.currentUser.isAdmin ? "Admin" : "Warga";
      nameLabel.innerHTML = `${roleIcon} ${shortName} <span style="font-size: 0.7rem; opacity: 0.85;">(${roleBadge})</span>`;
      btn.classList.add("logged-in");
      btn.setAttribute("title", `Masuk sebagai: ${this.currentUser.nama} (${this.currentUser.role}) • Klik untuk keluar`);
    } else {
      nameLabel.textContent = "Masuk Akun";
      btn.classList.remove("logged-in");
      btn.setAttribute("title", "Klik untuk masuk akun warga / pengurus RT");
    }
  }
};

// =============================================================================
// MODUL 2: PENGATURAN TAMPILAN, MODEL TEMA, BAYANGAN & MODE RINGAN
// =============================================================================
const HavalandSettings = {
  palette: "emerald",
  shadow: "medium",
  liteMode: false,

  init() {
    const savedPalette = localStorage.getItem("havaland_palette") || "emerald";
    const savedShadow = localStorage.getItem("havaland_card_shadow") || "medium";
    const savedLite = localStorage.getItem("havaland_litemode") === "true";

    this.setPalette(savedPalette, false);
    this.setShadow(savedShadow, false);
    this.toggleLiteMode(savedLite, false);
    this.updateThemeLabel();
  },

  setPalette(paletteName, notify = true) {
    this.palette = paletteName;
    document.documentElement.setAttribute("data-theme-palette", paletteName);
    localStorage.setItem("havaland_palette", paletteName);

    document.querySelectorAll(".palette-item").forEach(item => {
      item.classList.toggle("active", item.getAttribute("data-palette") === paletteName);
    });

    if (notify) {
      HavalandUtils.showToast(
        "Nuansa Tema Diubah",
        `Model tema ${paletteName.toUpperCase()} aktif`,
        "info"
      );
    }
  },

  setShadow(shadowLevel, notify = true) {
    this.shadow = shadowLevel;
    document.documentElement.setAttribute("data-card-shadow", shadowLevel);
    localStorage.setItem("havaland_card_shadow", shadowLevel);

    document.querySelectorAll(".shadow-btn").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-shadow") === shadowLevel);
    });

    if (notify) {
      HavalandUtils.showToast(
        "Bayangan Kartu Diubah",
        `Tingkat bayangan kartu: ${shadowLevel.toUpperCase()}`,
        "info"
      );
    }
  },

  toggleLiteMode(forceVal = null, notify = true) {
    if (forceVal !== null) {
      this.liteMode = !!forceVal;
    } else {
      this.liteMode = !this.liteMode;
    }

    localStorage.setItem("havaland_litemode", this.liteMode ? "true" : "false");
    document.body.classList.toggle("lite-mode", this.liteMode);

    const switchEl = document.getElementById("switch-lite-mode");
    if (switchEl) {
      switchEl.classList.toggle("active", this.liteMode);
    }

    if (notify) {
      if (this.liteMode) {
        HavalandUtils.showToast(
          "Mode Ringan Aktif",
          "Semua animasi scroll, efek hover, dan transisi dimatikan untuk performa hemat daya.",
          "info"
        );
      } else {
        HavalandUtils.showToast(
          "Mode Ringan Dinonaktifkan",
          "Website kembali menampilkan animasi visual penuh.",
          "info"
        );
      }
    }
  },

  updateThemeLabel() {
    const lbl = document.getElementById("settings-theme-label");
    if (lbl) {
      lbl.textContent = HavalandApp.currentTheme === "dark" ? "Mode Gelap: Aktif 🌙" : "Mode Gelap: Nonaktif ☀️";
    }
  },

  openModal() {
    this.renderBackupSection();
    this.updateThemeLabel();
    HavalandApp.openModal("modal-pengaturan");
  },

  renderBackupSection() {
    const container = document.getElementById("backup-controls-container");
    if (!container) return;

    const isAdmin = HavalandAuth.isAdmin();
    const folder = localStorage.getItem("havaland_backup_folder") || "D:\\koding\\Warga Havaland\\backups";
    const autoBackup = localStorage.getItem("havaland_auto_backup") === "true";
    const lastSnapshot = localStorage.getItem("havaland_last_snapshot_time") || "Belum ada snapshot";

    if (!isAdmin) {
      container.innerHTML = `
        <div class="admin-locked-box">
          <svg class="w-5 h-5" style="color: var(--accent-gold); flex-shrink: 0; margin-top: 2px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
          <div style="flex: 1;">
            <div style="font-weight: 700; color: var(--text-primary); margin-bottom: 2px;">Fitur Khusus Administrator / Pengurus RT</div>
            <div style="margin-bottom: 0.6rem; line-height: 1.4;">Pengaturan cadangan (backup), pemulihan data (restore), dan penunjukan folder otomatis hanya dapat diakses oleh Admin RT / Bendahara demi keamanan data warga.</div>
            <button type="button" class="btn btn-secondary btn-sm" onclick="HavalandAuth.openLoginModal('admin')" style="font-size: 0.75rem;">
              🔐 Masuk Sebagai Admin RT (Pak RT / Bendahara)
            </button>
          </div>
        </div>
      `;
      return;
    }

    // Tampilan Admin Terverifikasi
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 0.85rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(16, 185, 129, 0.1); border: 1px solid var(--accent); padding: 0.6rem 0.85rem; border-radius: var(--radius-md);">
          <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.82rem; font-weight: 700; color: var(--primary);">
            <span>🛡️ Akses Terverifikasi:</span>
            <span>${HavalandAuth.getCurrentUser()?.nama} (${HavalandAuth.getCurrentUser()?.role})</span>
          </div>
          <span class="badge badge-success" style="font-size: 0.7rem;">Akses Penuh</span>
        </div>

        <!-- Tombol Backup Manual & Restore -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem;">
          <button type="button" class="btn btn-primary btn-sm" onclick="HavalandBackup.exportJSON()" style="justify-content: center;">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Unduh Backup JSON
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="HavalandBackup.triggerFileInput()" style="justify-content: center;">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12"/></svg>
            Pulihkan Data JSON
          </button>
        </div>

        <!-- Folder Penunjukan & Auto Backup -->
        <div class="card" style="background: var(--bg-subtle); padding: 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--surface-border);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
            <div>
              <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-primary);">📁 Lokasi Folder Penyimpanan Cadangan:</div>
              <div style="font-size: 0.75rem; color: var(--text-muted); word-break: break-all;" id="backup-folder-display">${folder}</div>
            </div>
            <button type="button" class="btn btn-secondary btn-sm" onclick="HavalandBackup.selectFolder()" style="font-size: 0.72rem; padding: 3px 8px; flex-shrink: 0;">
              Ganti Folder
            </button>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px dashed var(--surface-border); padding-top: 0.6rem; margin-top: 0.6rem;">
            <div>
              <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-primary);">Otomatis Cadangkan Setiap Ada CRUD</div>
              <div style="font-size: 0.72rem; color: var(--text-muted);">Simpan snapshot lokal otomatis saat ada transaksi, kegiatan, atau usulan baru</div>
            </div>
            <div class="switch-input ${autoBackup ? 'active' : ''}" style="cursor: pointer;" onclick="HavalandBackup.toggleAutoBackup()"></div>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px dashed var(--surface-border); padding-top: 0.6rem; margin-top: 0.6rem; font-size: 0.75rem;">
            <span style="color: var(--text-muted);">Snapshot Terakhir: <strong style="color: var(--text-primary);">${lastSnapshot}</strong></span>
            <button type="button" class="btn btn-sm" style="font-size: 0.72rem; color: var(--primary); text-decoration: underline; background: transparent; padding: 0;" onclick="HavalandBackup.restoreLastSnapshot()">
              Pulihkan dari Snapshot
            </button>
          </div>
        </div>
      </div>
    `;
  }
};

// =============================================================================
// MODUL 3: CADANGAN & PEMULIHAN DATA (BACKUP & RESTORE DENGAN HAK ADMIN)
// =============================================================================
const HavalandBackup = {
  directoryHandle: null,

  exportJSON() {
    if (!HavalandAuth.isAdmin()) {
      HavalandUtils.showToast("Akses Ditolak", "Hanya Administrator RT yang berhak mengunduh cadangan data.", "error");
      return;
    }

    const payload = {
      havalandMeta: {
        portal: "Pusat Informasi Warga Havaland RT 04 / RW 08",
        versi: "2.1",
        diexportPada: new Date().toISOString(),
        diexportOleh: HavalandAuth.getCurrentUser()?.nama || "Admin RT"
      },
      transaksi: HavalandData.transaksi,
      kegiatan: HavalandData.kegiatan,
      warga: HavalandData.warga,
      aspirasi: HavalandData.aspirasi,
      usulanIde: HavalandData.usulanIde,
      kasSummary: HavalandData.kasSummary
    };

    const jsonString = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
    const filename = `havaland_backup_${new Date().toISOString().slice(0, 10)}.json`;

    // Download trigger
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Save as latest snapshot
    localStorage.setItem("havaland_latest_snapshot", jsonString);
    localStorage.setItem("havaland_last_snapshot_time", new Date().toLocaleString("id-ID"));
    if (typeof HavalandSettings !== "undefined") {
      HavalandSettings.renderBackupSection();
    }

    HavalandUtils.showToast("Backup Berhasil", `Berkas cadangan ${filename} berhasil diunduh!`, "success");
  },

  triggerFileInput() {
    if (!HavalandAuth.isAdmin()) {
      HavalandUtils.showToast("Akses Ditolak", "Hanya Administrator RT yang berhak memulihkan data.", "error");
      return;
    }
    const input = document.getElementById("backup-file-input");
    if (input) {
      input.value = "";
      input.click();
    }
  },

  handleFileSelected(event) {
    if (!HavalandAuth.isAdmin()) {
      HavalandUtils.showToast("Akses Ditolak", "Hanya Administrator RT yang berhak memulihkan data.", "error");
      return;
    }

    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);

        // Validasi struktur data
        if (!parsed.transaksi && !parsed.kegiatan && !parsed.data) {
          throw new Error("Format berkas backup tidak valid.");
        }

        const dataSrc = parsed.data ? parsed.data : parsed;

        if (dataSrc.transaksi && Array.isArray(dataSrc.transaksi)) {
          HavalandData.transaksi = dataSrc.transaksi;
          HavalandUtils.saveStorage("custom_transaksi", dataSrc.transaksi);
        }
        if (dataSrc.kegiatan && Array.isArray(dataSrc.kegiatan)) {
          HavalandData.kegiatan = dataSrc.kegiatan;
          HavalandUtils.saveStorage("custom_kegiatan", dataSrc.kegiatan);
        }
        if (dataSrc.usulanIde && Array.isArray(dataSrc.usulanIde)) {
          HavalandData.usulanIde = dataSrc.usulanIde;
          HavalandUtils.saveStorage("custom_usulan", dataSrc.usulanIde);
        }
        if (dataSrc.warga && Array.isArray(dataSrc.warga)) {
          HavalandData.warga = dataSrc.warga;
        }
        if (dataSrc.aspirasi && Array.isArray(dataSrc.aspirasi)) {
          HavalandData.aspirasi = dataSrc.aspirasi;
          HavalandUtils.saveStorage("custom_aspirasi", dataSrc.aspirasi);
        }

        // Re-render semua antarmuka
        HavalandApp.recalculateSummary();
        HavalandApp.renderKPIs();
        HavalandApp.renderMiniChart();
        HavalandApp.renderExpenseAllocations();
        HavalandApp.renderBerandaHighlights();
        HavalandApp.renderTransaksi();
        HavalandApp.renderKegiatan("semua");
        HavalandApp.renderWarga();
        HavalandProposals.renderSlider();

        HavalandUtils.showToast(
          "Pemulihan Berhasil",
          "Seluruh data transaksi, kegiatan, dan usulan berhasil dipulihkan dari berkas backup!",
          "success"
        );
      } catch (err) {
        alert("Gagal membaca file backup: " + err.message);
      }
    };
    reader.readAsText(file);
  },

  async selectFolder() {
    if (!HavalandAuth.isAdmin()) {
      HavalandUtils.showToast("Akses Ditolak", "Hanya Administrator RT yang berhak mengatur lokasi folder backup.", "error");
      return;
    }

    if ("showDirectoryPicker" in window) {
      try {
        const dirHandle = await window.showDirectoryPicker({ mode: "readwrite" });
        this.directoryHandle = dirHandle;
        localStorage.setItem("havaland_backup_folder", dirHandle.name);
        HavalandUtils.showToast(
          "Folder Ditunjuk",
          `Folder '${dirHandle.name}' berhasil ditetapkan sebagai lokasi backup otomatis.`,
          "success"
        );
        HavalandSettings.renderBackupSection();
      } catch (e) {
        // User cancelled picker
      }
    } else {
      const cur = localStorage.getItem("havaland_backup_folder") || "D:\\koding\\Warga Havaland\\backups";
      const manual = prompt("Tentukan path folder lokasi pencadangan otomatis di komputer Anda:", cur);
      if (manual && manual.trim()) {
        localStorage.setItem("havaland_backup_folder", manual.trim());
        HavalandUtils.showToast("Lokasi Disimpan", `Lokasi folder disetel ke: ${manual.trim()}`, "info");
        HavalandSettings.renderBackupSection();
      }
    }
  },

  toggleAutoBackup() {
    if (!HavalandAuth.isAdmin()) {
      HavalandUtils.showToast("Akses Ditolak", "Hanya Administrator RT yang dapat mengubah pengaturan backup otomatis.", "error");
      return;
    }

    const current = localStorage.getItem("havaland_auto_backup") === "true";
    const nextVal = !current;
    localStorage.setItem("havaland_auto_backup", nextVal ? "true" : "false");
    HavalandSettings.renderBackupSection();
    HavalandUtils.showToast(
      "Backup Otomatis",
      nextVal ? "Pencadangan otomatis setiap operasi CRUD diaktifkan!" : "Pencadangan otomatis dinonaktifkan.",
      "info"
    );
  },

  autoSnapshot() {
    const isAuto = localStorage.getItem("havaland_auto_backup") === "true";
    if (!isAuto) return;

    const payload = {
      timestamp: new Date().toISOString(),
      transaksi: HavalandData.transaksi,
      kegiatan: HavalandData.kegiatan,
      usulanIde: HavalandData.usulanIde,
      kasSummary: HavalandData.kasSummary
    };

    localStorage.setItem("havaland_latest_snapshot", JSON.stringify(payload));
    localStorage.setItem("havaland_last_snapshot_time", new Date().toLocaleString("id-ID"));
    console.log("Auto-snapshot data Havaland berhasil disimpan.");
  },

  restoreLastSnapshot() {
    if (!HavalandAuth.isAdmin()) {
      HavalandUtils.showToast("Akses Ditolak", "Hanya Administrator RT yang dapat memulihkan snapshot.", "error");
      return;
    }

    const snap = localStorage.getItem("havaland_latest_snapshot");
    if (!snap) {
      HavalandUtils.showToast("Snapshot Kosong", "Belum ada snapshot cadangan yang tersimpan.", "warning");
      return;
    }

    if (!confirm("Pulihkan data dari snapshot terakhir yang tersimpan secara lokal?")) return;

    try {
      const parsed = JSON.parse(snap);
      if (parsed.transaksi) HavalandData.transaksi = parsed.transaksi;
      if (parsed.kegiatan) HavalandData.kegiatan = parsed.kegiatan;
      if (parsed.usulanIde) HavalandData.usulanIde = parsed.usulanIde;

      HavalandApp.recalculateSummary();
      HavalandApp.renderKPIs();
      HavalandApp.renderTransaksi();
      HavalandApp.renderKegiatan("semua");
      HavalandProposals.renderSlider();

      HavalandUtils.showToast("Dipulihkan", "Data berhasil dikembalikan dari snapshot terakhir!", "success");
    } catch (e) {
      HavalandUtils.showToast("Gagal", "Format snapshot rusak.", "error");
    }
  }
};

// =============================================================================
// MODUL 4: KOTAK SUARA & USULAN IDE WARGA (SLIDER DI BERANDA)
// =============================================================================
const HavalandProposals = {
  init() {
    this.renderSlider();
  },

  renderSlider() {
    const track = document.getElementById("ideas-track");
    if (!track) return;

    const list = HavalandData.usulanIde || [];
    if (list.length === 0) {
      track.innerHTML = `<div style="padding: 1.5rem; color: var(--text-muted); font-size: 0.85rem;">Belum ada usulan ide warga yang terdaftar. Jadilah yang pertama mengajukan ide!</div>`;
      return;
    }

    const votedIds = JSON.parse(localStorage.getItem("havaland_voted_ideas") || "[]");

    let html = "";
    list.forEach(item => {
      const hasVoted = votedIds.includes(item.id);
      let statusBadgeClass = "badge-info";
      if (item.status === "Disetujui") statusBadgeClass = "badge-success";
      if (item.status === "Masuk Anggaran") statusBadgeClass = "badge-warning";

      html += `
        <div class="idea-card">
          <div>
            <div class="idea-top">
              <span class="badge" style="background: var(--bg-subtle); color: var(--primary); font-size: 0.72rem;">${item.kategori}</span>
              <span class="badge ${statusBadgeClass}" style="font-size: 0.7rem;">${item.status}</span>
            </div>
            <h4 class="idea-title">${item.judul}</h4>
            <p class="idea-desc">${item.deskripsi}</p>
          </div>

          <div>
            <div class="idea-author">
              <div class="quick-action-icon icon-emerald" style="width: 26px; height: 26px; min-width: 26px; min-height: 26px; border-radius: 50%;">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
              </div>
              <div style="flex: 1;">
                <div>Pengusul: <strong>${item.pengusul}</strong> (${item.blok})</div>
                <div style="font-size: 0.7rem; color: var(--text-muted);">${HavalandUtils.formatTanggalSingkat(item.tanggal)}</div>
              </div>
            </div>

            <div class="idea-footer">
              <button type="button" class="btn-vote ${hasVoted ? 'voted' : ''}" onclick="HavalandProposals.vote('${item.id}')" title="Beri dukungan untuk usulan ini">
                <span>👍</span>
                <span>${hasVoted ? 'Didukung' : 'Dukung'}</span>
                <strong>(${item.dukungan || 0})</strong>
              </button>
              <button type="button" class="btn btn-sm" style="font-size: 0.72rem; color: var(--primary); background: transparent; padding: 0;" onclick="HavalandProposals.shareIdeaWA('${item.id}')">
                Bagikan WA →
              </button>
            </div>
          </div>
        </div>
      `;
    });

    track.innerHTML = html;
  },

  slide(direction) {
    const track = document.getElementById("ideas-track");
    if (!track) return;
    track.scrollBy({ left: direction * 350, behavior: "smooth" });
  },

  vote(ideaId) {
    const votedIds = JSON.parse(localStorage.getItem("havaland_voted_ideas") || "[]");
    const item = HavalandData.usulanIde.find(u => u.id === ideaId);
    if (!item) return;

    if (votedIds.includes(ideaId)) {
      // Batal vote
      item.dukungan = Math.max(0, (item.dukungan || 1) - 1);
      const idx = votedIds.indexOf(ideaId);
      votedIds.splice(idx, 1);
      localStorage.setItem("havaland_voted_ideas", JSON.stringify(votedIds));
      HavalandUtils.showToast("Dukungan Dibatalkan", `Dukungan untuk '${item.judul}' dibatalkan.`, "info");
    } else {
      // Tambah vote
      item.dukungan = (item.dukungan || 0) + 1;
      votedIds.push(ideaId);
      localStorage.setItem("havaland_voted_ideas", JSON.stringify(votedIds));
      HavalandUtils.showToast("Terima Kasih", `Dukungan Anda untuk '${item.judul}' berhasil dicatat!`, "success");
    }

    HavalandUtils.saveStorage("custom_usulan", HavalandData.usulanIde);
    this.renderSlider();
  },

  shareIdeaWA(ideaId) {
    const item = HavalandData.usulanIde.find(u => u.id === ideaId);
    if (!item) return;
    const pesan = `*USULAN IDE WARGA HAVALAND*%0A%0A*Judul:* ${item.judul}%0A*Kategori:* ${item.kategori}%0A*Pengusul:* ${item.pengusul} (${item.blok})%0A*Status:* ${item.status}%0A%0A"${item.deskripsi}"%0A%0AMari berikan dukungan di portal warga Havaland! 🏡🌿`;
    window.open(`https://api.whatsapp.com/send?text=${pesan}`, "_blank");
  },

  openTambahModal() {
    if (!HavalandAuth.isLoggedIn()) {
      HavalandUtils.showToast(
        "Akses Masuk Diperlukan",
        "Silakan masuk akun warga terlebih dahulu untuk mengajukan usulan ide.",
        "info"
      );
      HavalandAuth.openLoginModal();
      return;
    }

    const user = HavalandAuth.getCurrentUser();
    const nameEl = document.getElementById("usulan-pengusul-name");
    const blokEl = document.getElementById("usulan-pengusul-blok");
    if (nameEl) nameEl.textContent = user.nama;
    if (blokEl) blokEl.textContent = `Blok ${user.blok || "Havaland"}`;

    HavalandApp.openModal("modal-tambah-usulan");
  },

  handleSubmit(event) {
    event.preventDefault();
    if (!HavalandAuth.isLoggedIn()) {
      HavalandAuth.openLoginModal();
      return;
    }

    const user = HavalandAuth.getCurrentUser();
    const judul = document.getElementById("usulan-judul").value.trim();
    const kategori = document.getElementById("usulan-kategori").value;
    const deskripsi = document.getElementById("usulan-deskripsi").value.trim();
    const manfaat = document.getElementById("usulan-manfaat").value.trim();

    if (!judul || !deskripsi) {
      HavalandUtils.showToast("Gagal", "Mohon lengkapi judul dan deskripsi usulan ide Anda", "error");
      return;
    }

    const newIdea = {
      id: `IDE-${Date.now().toString().slice(-4)}`,
      judul: judul,
      kategori: kategori,
      deskripsi: `${deskripsi} (Manfaat: ${manfaat})`,
      pengusul: user.nama,
      blok: user.blok || "Warga",
      tanggal: new Date().toISOString().slice(0, 10),
      dukungan: 1,
      status: "Dalam Diskusi"
    };

    HavalandData.usulanIde.unshift(newIdea);
    const saved = HavalandUtils.loadStorage("custom_usulan", []);
    saved.unshift(newIdea);
    HavalandUtils.saveStorage("custom_usulan", saved);

    this.renderSlider();
    HavalandApp.closeModal("modal-tambah-usulan");
    document.getElementById("form-tambah-usulan").reset();

    if (typeof HavalandBackup !== "undefined") {
      HavalandBackup.autoSnapshot();
    }

    HavalandUtils.showToast(
      "Usulan Terkirim",
      `Gagasan '${judul}' dari ${user.nama} berhasil dicatat dan masuk ke kotak suara warga!`,
      "success"
    );
  }
};

// Start application when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  HavalandApp.init();
});

// Export to window
if (typeof window !== "undefined") {
  window.HavalandApp = HavalandApp;
  window.HavalandAuth = HavalandAuth;
  window.HavalandSettings = HavalandSettings;
  window.HavalandBackup = HavalandBackup;
  window.HavalandProposals = HavalandProposals;
}

