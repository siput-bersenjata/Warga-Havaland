/**
 * Havaland Community Portal - Main Application Logic
 * RT 04 / RW 08, Babaan, Ngenep, Kec. Karang Ploso, Kabupaten Malang, Jawa Timur 65152
 */

const HavalandApp = {
  activeTab: "beranda",
  currentTheme: "dark",
  filteredTransaksi: [],
  filteredWarga: [],
  selectedWargaIuran: null,
  currentBlokFilter: "semua",
  activeAutocompleteIndex: -1,
  currentMatchingWarga: [],
  currentFilterPeriode: "bulan-ini",
  filterCustomStartDate: "",
  filterCustomEndDate: "",

  // Inisialisasi Aplikasi
  init() {
    this.initTheme();
    HavalandSettings.init();
    HavalandAuth.init();
    HavalandProposals.init();
    HavalandUserManagement.init();
    HavalandSlider.init();
    if (typeof HavalandHero !== "undefined") HavalandHero.init();
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

    const initialHash = window.location.hash.replace("#", "");
    if (initialHash && ["beranda", "kas", "rincian", "kegiatan", "warga", "kontak"].includes(initialHash)) {
      this.navigate(initialHash, false);
    }
    this.initialized = true;
    HavalandAuth.updateUI();
  },

  // Sinkronisasi data dari Vercel Cloud Database (mode sinkron antar-device).
  // Jika database belum dikonfigurasi di Vercel, otomatis berjalan murni
  // lokal (localStorage) tanpa error — lihat HavalandSync di bawah.
  async fetchCloudData() {
    try {
      if (typeof HavalandSync !== "undefined") {
        await HavalandSync.init();
      }
    } catch (e) {
      console.log("Berjalan dalam mode lokal / offline (Database Vercel belum aktif).");
    }
  },

  // Inisialisasi Tema (Dark / AMOLED / Light Mode - Default: Gelap)
  initTheme() {
    const savedTheme = localStorage.getItem("havaland_theme") || "dark";
    this.setTheme(savedTheme, false);
  },

  toggleTheme() {
    // Siklus: dark -> amoled -> light -> dark
    let nextTheme = "dark";
    if (this.currentTheme === "dark") nextTheme = "amoled";
    else if (this.currentTheme === "amoled") nextTheme = "light";
    else nextTheme = "dark";

    this.setTheme(nextTheme, true);
  },

  setTheme(theme, notify = false) {
    if (!["light", "dark", "amoled"].includes(theme)) theme = "dark";
    this.currentTheme = theme;
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("havaland_theme", theme);

    // Update meta theme-color peramban mobile
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      if (theme === "amoled") metaThemeColor.setAttribute("content", "#000000");
      else if (theme === "dark") metaThemeColor.setAttribute("content", "#0B1120");
      else metaThemeColor.setAttribute("content", "#065F46");
    }

    // Update active button state di Modal Pengaturan
    document.querySelectorAll(".theme-mode-btn").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-theme-mode") === theme);
    });

    const themeLabels = {
      light: "Mode Terang ☀️",
      dark: "Mode Gelap (Modern) 🌙",
      amoled: "Mode Gelap AMOLED (Pure Black) 🖤"
    };

    const lbl = document.getElementById("settings-theme-label");
    if (lbl) {
      lbl.textContent = themeLabels[theme] || theme;
    }

    const sunIcon = document.getElementById("theme-icon-sun");
    const moonIcon = document.getElementById("theme-icon-moon");
    if (theme === "dark" || theme === "amoled") {
      sunIcon?.classList.remove("hidden");
      moonIcon?.classList.add("hidden");
    } else {
      sunIcon?.classList.add("hidden");
      moonIcon?.classList.remove("hidden");
    }

    if (notify) {
      HavalandUtils.showToast("Tema Diubah", `${themeLabels[theme]} aktif`, "info");
    }
  },

  // Gabungkan cache lama dengan data bawaan sambil menghormati item bawaan
  // yang sempat dihapus user SEBELUM update ini. Deteksi: bila cache memuat
  // ID bawaan lain (= snapshot penuh), maka ID bawaan yang tak ada di cache
  // dianggap sudah dihapus dan tidak dimunculkan lagi. Bila cache murni
  // delta (tak ada ID bawaan sama sekali), semua bawaan dipertahankan.
  mergeWithDeletions(legacy, builtin) {
    const leg = Array.isArray(legacy) ? legacy : [];
    const base = Array.isArray(builtin) ? builtin : [];
    const builtinIds = base.map(x => x && x.id).filter(id => id !== undefined && id !== null);
    const legacyIds = new Set(leg.map(x => x && x.id));
    const looksFull = builtinIds.some(id => legacyIds.has(id));
    let result = leg;
    if (looksFull) {
      const deleted = new Set(builtinIds.filter(id => !legacyIds.has(id)));
      result = [...leg, ...base.filter(x => !deleted.has(x.id))];
    } else {
      result = [...leg, ...base];
    }
    return HavalandUtils.dedupeById(result);
  },

  // Muat data lokal tambahan (full-snapshot per koleksi).
  //
  // ATURAN PENTING (anti data-bangkit-lagi & anti ganda):
  // - Setiap koleksi punya SATU kunci snapshot penuh (…_v2 / …_full).
  // - Jika snapshot ada → dipakai apa adanya (ditambah hapus/tambah tetap utuh).
  // - Jika TIDAK ada → pakai data bawaan, JANGAN pernah digabung dengan parsial.
  // - Kunci delta lama (custom_kegiatan, custom_usulan, custom_transaksi)
  //   dimigrasikan sekali: digabung + dedupe berdasarkan ID, lalu dihapus.
  loadPersistedData() {
    // ---- TRANSAKSI (snapshot penuh) ----
    const fullTrx = HavalandUtils.loadStorage("custom_transaksi_full", null);
    if (fullTrx && Array.isArray(fullTrx) && fullTrx.length > 0) {
      HavalandData.transaksi = HavalandUtils.dedupeById(fullTrx);
      this.recalculateSummary();
    } else {
      const deltaTrx = HavalandUtils.loadStorage("custom_transaksi", []);
      if (deltaTrx && deltaTrx.length > 0) {
        HavalandData.transaksi = this.mergeWithDeletions(deltaTrx, HavalandData.transaksi);
        this.recalculateSummary();
        HavalandUtils.saveStorage("custom_transaksi_full", HavalandData.transaksi);
        HavalandUtils.removeStorage("custom_transaksi");
      }
    }

    // ---- KEGIATAN (snapshot penuh) ----
    const snapKeg = HavalandUtils.loadStorage("custom_kegiatan_v2", null);
    if (snapKeg && Array.isArray(snapKeg) && snapKeg.length > 0) {
      HavalandData.kegiatan = HavalandUtils.dedupeById(snapKeg);
    } else {
      const legacyKeg = HavalandUtils.loadStorage("custom_kegiatan", []);
      if (legacyKeg && legacyKeg.length > 0) {
        HavalandData.kegiatan = this.mergeWithDeletions(legacyKeg, HavalandData.kegiatan);
        HavalandUtils.saveStorage("custom_kegiatan_v2", HavalandData.kegiatan);
        HavalandUtils.removeStorage("custom_kegiatan");
      }
    }

    // ---- USULAN IDE (snapshot penuh) ----
    const snapUsulan = HavalandUtils.loadStorage("custom_usulan_v2", null);
    if (snapUsulan && Array.isArray(snapUsulan) && snapUsulan.length > 0) {
      HavalandData.usulanIde = HavalandUtils.dedupeById(snapUsulan);
    } else {
      const legacyUsulan = HavalandUtils.loadStorage("custom_usulan", []);
      if (legacyUsulan && legacyUsulan.length > 0) {
        HavalandData.usulanIde = this.mergeWithDeletions(legacyUsulan, HavalandData.usulanIde);
        HavalandUtils.saveStorage("custom_usulan_v2", HavalandData.usulanIde);
        HavalandUtils.removeStorage("custom_usulan");
      }
    }

    const customAspV2 = HavalandUtils.loadStorage("custom_aspirasi_v2", null);
    if (customAspV2 && Array.isArray(customAspV2) && customAspV2.length > 0) {
      HavalandData.aspirasi = HavalandUtils.dedupeById(customAspV2);
    } else {
      const customAsp = HavalandUtils.loadStorage("custom_aspirasi", null);
      if (customAsp && Array.isArray(customAsp) && customAsp.length > 0) {
        HavalandData.aspirasi = HavalandUtils.dedupeById(customAsp);
      }
    }

    const customKontak = HavalandUtils.loadStorage("custom_kontak_v1", null);
    if (customKontak && Array.isArray(customKontak) && customKontak.length > 0) {
      HavalandData.profile.kontakDarurat = customKontak;
    }

    // Purge outdated custom_warga cache from previous version
    if (HavalandUtils.loadStorage("custom_warga", null)) {
      HavalandUtils.removeStorage("custom_warga");
    }
    const customWarga = HavalandUtils.loadStorage("custom_warga_v2", null);
    if (customWarga && Array.isArray(customWarga) && customWarga.length > 0) {
      HavalandData.warga = HavalandUtils.dedupeById(customWarga);
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
  getEffectiveDate() {
    const now = new Date();
    if (now.getFullYear() >= 2026) return now;
    if (HavalandData.transaksi && HavalandData.transaksi.length > 0) {
      const dates = HavalandData.transaksi
        .map(t => new Date(t.tanggal).getTime())
        .filter(t => !isNaN(t));
      if (dates.length > 0) {
        return new Date(Math.max(...dates));
      }
    }
    return now;
  },

  getDateRangeForPreset(preset) {
    const ref = this.getEffectiveDate();
    const y = ref.getFullYear();
    const m = ref.getMonth(); // 0 - 11

    const toISO = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    if (preset === "bulan-ini") {
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0); // hari terakhir bulan ini
      return { start: toISO(start), end: toISO(end), label: "Bulan Ini" };
    }
    if (preset === "bulan-kemarin") {
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0); // hari terakhir bulan kemarin
      return { start: toISO(start), end: toISO(end), label: "Bulan Kemarin" };
    }
    if (preset === "7-hari") {
      const end = ref;
      const start = new Date(ref.getTime() - 6 * 24 * 60 * 60 * 1000);
      return { start: toISO(start), end: toISO(end), label: "7 Hari Terakhir" };
    }
    if (preset === "30-hari") {
      const end = ref;
      const start = new Date(ref.getTime() - 29 * 24 * 60 * 60 * 1000);
      return { start: toISO(start), end: toISO(end), label: "30 Hari Terakhir" };
    }
    if (preset === "kustom") {
      const start = document.getElementById("trx-date-start")?.value || this.filterCustomStartDate || "";
      const end = document.getElementById("trx-date-end")?.value || this.filterCustomEndDate || "";
      let label = "Rentang Tertentu";
      if (start && end) {
        label = `${HavalandUtils.formatTanggalSingkat(start)} s/d ${HavalandUtils.formatTanggalSingkat(end)}`;
      } else if (start) {
        label = `Sejak ${HavalandUtils.formatTanggalSingkat(start)}`;
      } else if (end) {
        label = `Hingga ${HavalandUtils.formatTanggalSingkat(end)}`;
      }
      return { start, end, label };
    }
    // "semua"
    return { start: null, end: null, label: "Semua Waktu" };
  },

  setDatePreset(preset) {
    this.currentFilterPeriode = preset;

    // Sinkronisasi status active tombol pill
    const pills = document.querySelectorAll("#trx-date-pills .pill-btn");
    pills.forEach(btn => {
      if (btn.getAttribute("data-preset") === preset) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Sinkronisasi select dropdown periode
    const selectPeriode = document.getElementById("trx-filter-periode");
    if (selectPeriode && selectPeriode.value !== preset) {
      selectPeriode.value = preset;
    }

    // Tampilkan / sembunyikan bar input tanggal kustom
    const customContainer = document.getElementById("trx-custom-date-container");
    if (customContainer) {
      if (preset === "kustom") {
        customContainer.style.display = "flex";
        const startInput = document.getElementById("trx-date-start");
        const endInput = document.getElementById("trx-date-end");
        if (startInput && !startInput.value) {
          const range = this.getDateRangeForPreset("bulan-ini");
          startInput.value = range.start;
          if (endInput && !endInput.value) endInput.value = range.end;
        }
      } else {
        customContainer.style.display = "none";
      }
    }

    // Sinkronkan nilai input tanggal jika preset bukan kustom
    if (preset !== "kustom") {
      const range = this.getDateRangeForPreset(preset);
      const startInput = document.getElementById("trx-date-start");
      const endInput = document.getElementById("trx-date-end");
      if (startInput && range.start) startInput.value = range.start;
      if (endInput && range.end) endInput.value = range.end;
    }

    this.filterTransaksi();
  },

  onCustomDateChange() {
    this.currentFilterPeriode = "kustom";
    const pills = document.querySelectorAll("#trx-date-pills .pill-btn");
    pills.forEach(btn => {
      if (btn.getAttribute("data-preset") === "kustom") {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
    const selectPeriode = document.getElementById("trx-filter-periode");
    if (selectPeriode) selectPeriode.value = "kustom";
    this.filterTransaksi();
  },

  applyCustomDateRange() {
    this.setDatePreset("kustom");
  },

  renderTransaksi() {
    this.filterTransaksi();
  },

  filterTransaksi() {
    const q = (document.getElementById("trx-search")?.value || "").toLowerCase().trim();
    const filterJenis = document.getElementById("trx-filter-jenis")?.value || "keluar";
    const filterKategori = document.getElementById("trx-filter-kategori")?.value || "semua";
    const dateRange = this.getDateRangeForPreset(this.currentFilterPeriode || "bulan-ini");

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

      // Filter Rentang Tanggal
      let matchTanggal = true;
      if (dateRange.start && dateRange.end) {
        matchTanggal = t.tanggal >= dateRange.start && t.tanggal <= dateRange.end;
      } else if (dateRange.start) {
        matchTanggal = t.tanggal >= dateRange.start;
      } else if (dateRange.end) {
        matchTanggal = t.tanggal <= dateRange.end;
      }

      return matchSearch && matchJenis && matchKategori && matchTanggal;
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

    const elBadge = document.getElementById("trx-filter-info-badge");
    if (elBadge) {
      let jenisText = "Semua Aliran Kas";
      if (filterJenis === "keluar") jenisText = "Pengeluaran";
      else if (filterJenis === "masuk") jenisText = "Pemasukan";

      elBadge.textContent = `${dateRange.label} • ${jenisText}`;
      if (filterJenis === "keluar") {
        elBadge.className = "badge badge-danger";
      } else if (filterJenis === "masuk") {
        elBadge.className = "badge badge-success";
      } else {
        elBadge.className = "badge badge-info";
      }
    }

    // Render ke Desktop Table Body
    const tbody = document.getElementById("trx-table-body");
    if (tbody) {
      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">Tidak ditemukan transaksi yang cocok dengan kriteria pencarian.</td></tr>`;
      } else {
        let tHtml = "";
        const e = HavalandUtils.escapeHtml.bind(HavalandUtils);
        filtered.forEach(t => {
          const isMasuk = t.jenis === "masuk";
          tHtml += `
            <tr>
              <td style="white-space: nowrap; font-size: 0.82rem; color: var(--text-muted);">${HavalandUtils.formatTanggalSingkat(t.tanggal)}</td>
              <td>
                <span class="badge ${isMasuk ? 'badge-success' : 'badge-danger'}">${e(t.id)}</span>
                <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">Ref: ${e(t.bukti || '-')}</div>
              </td>
              <td>
                <div style="font-weight: 700; color: var(--text-primary);">${e(t.uraian)}</div>
                <div style="display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap; margin-top: 3px;">
                  <span style="font-size: 0.75rem; color: var(--primary-light); font-weight: 600;">${e(t.kategori)}</span>
                  <span class="audit-badge" title="Pencatat Transaksi">👤 ${e(t.createdBy || t.pj)}</span>
                </div>
              </td>
              <td>
                <div style="font-size: 0.82rem;">${e(t.metode)}</div>
                <div style="font-size: 0.72rem; color: var(--text-muted);">PJ: ${e(t.pj)}</div>
              </td>
              <td style="text-align: right; white-space: nowrap;">
                <span style="font-family: var(--font-heading); font-size: 1rem; font-weight: 800; color: ${isMasuk ? 'var(--accent)' : 'var(--danger)'};">
                  ${isMasuk ? '+' : '-'} ${HavalandUtils.formatRupiah(t.nominal)}
                </span>
              </td>
              <td style="text-align: center; white-space: nowrap;">
                <div style="display: inline-flex; gap: 4px; align-items: center;">
                  <button class="btn btn-secondary btn-sm" onclick="HavalandApp.openKwitansi('${e(t.id)}')" title="Buka Struk Kwitansi Digital">
                    <svg class="w-4 h-4 mr-1 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    Kwitansi
                  </button>
                  ${(typeof HavalandAuth !== 'undefined' && (HavalandAuth.isAdmin() || HavalandAuth.isBendahara())) ? `
                  <button class="btn btn-secondary btn-sm" style="padding: 4px 6px;" onclick="HavalandApp.openEditTransaksiModal('${e(t.id)}', event)" title="Edit Transaksi">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                  </button>
                  ` : ''}
                  ${(typeof HavalandAuth !== 'undefined' && HavalandAuth.isLoggedIn()) ? `
                  <button class="btn btn-sm" style="color: var(--danger); padding: 4px 6px; border: 1px solid rgba(239, 68, 68, 0.25); background: transparent;" onclick="HavalandApp.hapusTransaksi('${e(t.id)}', event)" title="Hapus Transaksi (Pengguna Login)">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                  ` : ''}
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
        const e2 = HavalandUtils.escapeHtml.bind(HavalandUtils);
        filtered.forEach(t => {
          const isMasuk = t.jenis === "masuk";
          mHtml += `
            <div class="trx-mobile-card" onclick="HavalandApp.openKwitansi('${e2(t.id)}')">
              <div class="trx-left">
                <div class="trx-icon-circle ${isMasuk ? 'icon-emerald' : 'icon-rose'}">
                  ${isMasuk ? 
                    `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12"/></svg>` : 
                    `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 13l-5 5m0 0l-5-5m5 5V6"/></svg>`
                  }
                </div>
                <div class="trx-info">
                  <h4>${e2(t.uraian)}</h4>
                  <p>${HavalandUtils.formatTanggalSingkat(t.tanggal)} • ${e2(t.kategori)}</p>
                  <div style="margin-top: 3px;"><span class="audit-badge">👤 ${e2(t.createdBy || t.pj)}</span></div>
                </div>
              </div>
              <div class="trx-right">
                <div class="trx-amount ${isMasuk ? 'masuk' : 'keluar'}">
                  ${isMasuk ? '+' : '-'} ${HavalandUtils.formatRupiah(t.nominal)}
                </div>
                <div style="display: flex; gap: 4px; align-items: center; justify-content: flex-end; margin-top: 4px;">
                  <span class="badge ${isMasuk ? 'badge-success' : 'badge-danger'}">Kwitansi →</span>
                  ${(typeof HavalandAuth !== 'undefined' && (HavalandAuth.isAdmin() || HavalandAuth.isBendahara())) ? `
                  <button class="btn btn-secondary btn-sm" style="padding: 2px 6px;" onclick="HavalandApp.openEditTransaksiModal('${e2(t.id)}', event)" title="Edit Transaksi">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                  </button>
                  ` : ''}
                  ${(typeof HavalandAuth !== 'undefined' && HavalandAuth.isLoggedIn()) ? `
                  <button class="btn btn-sm" style="color: var(--danger); padding: 2px 6px; border: 1px solid rgba(239, 68, 68, 0.25); background: transparent;" onclick="HavalandApp.hapusTransaksi('${e2(t.id)}', event)" title="Hapus Transaksi (Pengguna Login)">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                  ` : ''}
                </div>
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
        const ek = HavalandUtils.escapeHtml.bind(HavalandUtils);
        k.jadwalPiket.forEach(p => {
          rows += `
            <tr>
              <td><strong>${ek(p.hari)}</strong></td>
              <td><span class="badge badge-info">${ek(p.blok)}</span></td>
              <td style="font-size: 0.8rem; color: var(--text-secondary);">${ek(p.petugas)}</td>
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

      const ek2 = HavalandUtils.escapeHtml.bind(HavalandUtils);
      html += `
        <div class="activity-card">
          <div class="activity-main" style="flex: 1;">
            <div class="activity-date-badge">
              <div class="activity-date-day">${k.tipe === 'Rutin' ? 'RUTIN' : 'AGENDA'}</div>
              <div class="activity-date-month">${ek2(k.kategori)}</div>
            </div>
            <div class="activity-details" style="flex: 1;">
              <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 4px; flex-wrap: wrap;">
                <span class="badge badge-success">${ek2(k.statusBadge || 'Aktif')}</span>
                <span style="font-size: 0.78rem; font-weight: 700; color: var(--primary);">⏱ ${ek2(k.waktuNext)}</span>
              </div>
              <h3 style="font-size: 1.15rem; font-weight: 800;">${ek2(k.judul)}</h3>
              <p style="font-size: 0.85rem; color: var(--text-secondary);">${ek2(k.deskripsi)}</p>
              
              <div class="activity-meta-tags">
                <span>📍 Lokasi: <strong>${ek2(k.lokasi)}</strong></span>
                <span>👤 Koordinator: <strong>${ek2(k.koordinator)}</strong></span>
                <span>🔄 Frekuensi: ${ek2(k.frekuensi)}</span>
                <span class="audit-badge">📝 Pencatat: ${ek2(k.createdBy || k.koordinator)}</span>
              </div>

              ${piketTableHtml}
            </div>
          </div>
          <div class="activity-actions" style="flex-direction: column; align-self: flex-start;">
            <button class="btn btn-whatsapp btn-sm" onclick="HavalandApp.shareKegiatanWA('${ek2(k.id)}')">
              <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.54 1.764.819 2.791.819h.005c3.18 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.765-5.773-5.765zm3.364 8.163c-.144.405-.837.774-1.17.824-.312.045-.634.055-1.921-.479-1.503-.623-2.47-2.148-2.545-2.247-.075-.1-1.01-1.344-1.01-2.564 0-1.22.639-1.82.866-2.066.227-.247.498-.309.664-.309.166 0 .332.002.477.01.155.008.363-.058.567.433.21.505.719 1.752.782 1.88.063.128.105.279.021.446-.084.167-.126.27-.25.417-.125.148-.263.33-.375.443-.125.125-.255.261-.11.51.145.249.645 1.066 1.385 1.725.952.848 1.755 1.111 2.004 1.236.249.125.395.104.541-.063.146-.167.625-.729.791-.979.166-.25.332-.208.562-.125.229.083 1.458.687 1.708.812.25.125.417.188.479.292.062.104.062.604-.082 1.009z"/></svg>
              Bagikan ke Grup WA
            </button>
            <button class="btn btn-secondary btn-sm" onclick="HavalandApp.simpanKalender('${ek2(k.id)}')">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              Simpan ke Kalender
            </button>
            ${(typeof HavalandAuth !== 'undefined' && (HavalandAuth.isAdmin() || HavalandAuth.isPengurus())) ? `
            <button class="btn btn-secondary btn-sm" style="font-size: 0.75rem;" onclick="HavalandApp.openEditKegiatanModal('${ek2(k.id)}')" title="Edit Jadwal Kegiatan">
              <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              Edit Jadwal
            </button>
            <button class="btn btn-sm" style="color: var(--danger); border: 1px solid rgba(239, 68, 68, 0.25); background: transparent; font-size: 0.75rem;" onclick="HavalandApp.hapusKegiatan('${ek2(k.id)}')" title="Hapus Jadwal Kegiatan">
              <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              Hapus
            </button>
            ` : ''}
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

            ${(typeof HavalandAuth !== 'undefined' && HavalandAuth.isAdmin()) ? `
              <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--surface-border); display: flex; justify-content: flex-end; gap: 0.4rem;" onclick="event.stopPropagation()">
                <button type="button" class="btn btn-secondary btn-sm" style="padding: 2px 8px; font-size: 0.72rem; height: 26px;" onclick="HavalandApp.openFormWargaModal('${w.id}')" title="Edit Data Warga">
                  ✏️ Edit
                </button>
                <button type="button" class="btn btn-sm" style="color: var(--danger); padding: 2px 8px; font-size: 0.72rem; height: 26px; border: 1px solid rgba(239, 68, 68, 0.25); background: transparent;" onclick="HavalandApp.hapusWarga('${w.id}')" title="Hapus Warga">
                  🗑️ Hapus
                </button>
              </div>
            ` : `
              <div style="margin-top: 8px; text-align: right;">
                <span style="font-size: 0.78rem; font-weight: 700; color: var(--primary);">Lihat Profil & Kontak →</span>
              </div>
            `}
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

      <div style="margin-top: 1.25rem; display: flex; gap: 0.75rem; flex-wrap: wrap;">
        <a href="https://wa.me/${w.kontak.replace(/[^0-9]/g, '')}" target="_blank" rel="noopener" class="btn btn-whatsapp" style="flex: 1; min-width: 140px;">
          <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.54 1.764.819 2.791.819h.005c3.18 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.765-5.773-5.765zm3.364 8.163c-.144.405-.837.774-1.17.824-.312.045-.634.055-1.921-.479-1.503-.623-2.47-2.148-2.545-2.247-.075-.1-1.01-1.344-1.01-2.564 0-1.22.639-1.82.866-2.066.227-.247.498-.309.664-.309.166 0 .332.002.477.01.155.008.363-.058.567.433.21.505.719 1.752.782 1.88.063.128.105.279.021.446-.084.167-.126.27-.25.417-.125.148-.263.33-.375.443-.125.125-.255.261-.11.51.145.249.645 1.066 1.385 1.725.952.848 1.755 1.111 2.004 1.236.249.125.395.104.541-.063.146-.167.625-.729.791-.979.166-.25.332-.208.562-.125.229.083 1.458.687 1.708.812.25.125.417.188.479.292.062.104.062.604-.082 1.009z"/></svg>
          Chat WhatsApp
        </a>
        ${(typeof HavalandAuth !== 'undefined' && HavalandAuth.isAdmin()) ? `
          <button type="button" class="btn btn-secondary" style="flex: 1; min-width: 110px;" onclick="HavalandApp.closeModal('modal-detail-warga'); HavalandApp.openFormWargaModal('${w.id}')">
            ✏️ Edit Data
          </button>
          <button type="button" class="btn btn-danger" style="flex: 0 0 auto;" onclick="HavalandApp.closeModal('modal-detail-warga'); HavalandApp.hapusWarga('${w.id}')">
            🗑️ Hapus
          </button>
        ` : ''}
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
    HavalandData.profile.kontakDarurat.forEach((c, index) => {
      html += `
        <div class="kontak-card-item">
          <div style="display: flex; align-items: center; gap: 0.85rem; min-width: 0; flex: 1 1 auto;">
            <div style="width: 42px; height: 42px; min-width: 42px; border-radius: var(--radius-full); background: rgba(6, 95, 70, 0.1); color: var(--primary); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
            </div>
            <div style="min-width: 0; flex: 1;">
              <div style="font-weight: 700; color: var(--text-primary); font-size: 0.92rem; line-height: 1.3;">${c.nama}</div>
              <div style="font-size: 0.76rem; color: var(--primary-light); font-weight: 600; margin-top: 2px;">${c.role} • ${c.nomor}</div>
            </div>
          </div>
          <div style="display: flex; gap: 0.45rem; flex-shrink: 0; align-items: center; flex-wrap: wrap;">
            <a href="tel:${c.nomor.replace(/[^0-9]/g, '')}" class="btn btn-secondary btn-sm" style="white-space: nowrap; height: 34px; padding: 0 12px; display: inline-flex; align-items: center; gap: 6px;" title="Telepon Langsung">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
              <span>Panggil</span>
            </a>
            ${c.wa ? `
              <a href="https://wa.me/${c.wa}?text=Halo%20${encodeURIComponent(c.nama)},%20saya%20warga%20Havaland" target="_blank" rel="noopener" class="btn btn-whatsapp btn-sm" style="white-space: nowrap; height: 34px; padding: 0 12px; display: inline-flex; align-items: center; gap: 6px;" title="Chat WhatsApp">
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.54 1.764.819 2.791.819h.005c3.18 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.765-5.773-5.765zm3.364 8.163c-.144.405-.837.774-1.17.824-.312.045-.634.055-1.921-.479-1.503-.623-2.47-2.148-2.545-2.247-.075-.1-1.01-1.344-1.01-2.564 0-1.22.639-1.82.866-2.066.227-.247.498-.309.664-.309.166 0 .332.002.477.01.155.008.363-.058.567.433.21.505.719 1.752.782 1.88.063.128.105.279.021.446-.084.167-.126.27-.25.417-.125.148-.263.33-.375.443-.125.125-.255.261-.11.51.145.249.645 1.066 1.385 1.725.952.848 1.755 1.111 2.004 1.236.249.125.395.104.541-.063.146-.167.625-.729.791-.979.166-.25.332-.208.562-.125.229.083 1.458.687 1.708.812.25.125.417.188.479.292.062.104.062.604-.082 1.009z"/></svg>
                <span>WA</span>
              </a>
            ` : ''}
            ${(typeof HavalandAuth !== 'undefined' && HavalandAuth.isAdmin()) ? `
              <button type="button" class="btn btn-secondary btn-sm" style="white-space: nowrap; height: 34px; padding: 0 9px; font-size: 0.72rem; display: inline-flex; align-items: center; gap: 4px;" onclick="HavalandApp.openFormKontakModal(${index})" title="Edit Kontak">
                <span>✏️ Edit</span>
              </button>
              <button type="button" class="btn btn-sm" style="white-space: nowrap; height: 34px; padding: 0 8px; font-size: 0.72rem; color: var(--danger); border: 1px solid rgba(239, 68, 68, 0.25); background: transparent; display: inline-flex; align-items: center;" onclick="HavalandApp.hapusKontak(${index})" title="Hapus Kontak">
                <span>🗑️</span>
              </button>
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
    const ea = HavalandUtils.escapeHtml.bind(HavalandUtils);
    list.forEach(a => {
      let badgeStatus = "badge-warning";
      if (a.status === "Selesai") badgeStatus = "badge-success";
      else if (a.status === "Diproses") badgeStatus = "badge-info";

      html += `
        <div style="background: var(--bg-subtle); border: 1px solid var(--surface-border); border-radius: var(--radius-md); padding: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.4rem;">
            <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
              <span class="badge ${badgeStatus}">${ea(a.status)}</span>
              <span class="badge badge-purple">${ea(a.kategori)}</span>
              <span style="font-size: 0.75rem; color: var(--text-muted);">${HavalandUtils.formatTanggalSingkat(a.tanggal)}</span>
            </div>
            <div style="display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap;">
              <span style="font-size: 0.75rem; font-weight: 700; color: var(--danger);">Urgensi: ${ea(a.urgensi)}</span>
              ${(typeof HavalandAuth !== 'undefined' && HavalandAuth.isAdmin()) ? `
              <button type="button" class="btn btn-secondary btn-sm" style="padding: 1px 7px; font-size: 0.7rem; height: 24px;" onclick="HavalandApp.openEditAspirasiModal('${ea(a.id)}')" title="Edit / Tanggapi Laporan">
                ✏️ Edit & Tanggapi
              </button>
              <button type="button" class="btn btn-sm" style="color: var(--danger); padding: 1px 6px; border: 1px solid rgba(239, 68, 68, 0.25); background: transparent; font-size: 0.7rem; height: 24px;" onclick="HavalandApp.hapusAspirasi('${ea(a.id)}')" title="Hapus Aspirasi (Admin RT)">
                Hapus
              </button>
              ` : ''}
            </div>
          </div>

          <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.35rem; color: var(--text-primary);">${ea(a.judul)}</h4>
          <div style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 0.6rem;">Oleh: <strong>${ea(a.pelapor)}</strong></div>

          <div style="background: var(--surface); padding: 0.6rem 0.85rem; border-radius: var(--radius-sm); border-left: 3px solid var(--primary); font-size: 0.8rem; color: var(--text-secondary);">
            <strong>Tanggapan Pengurus RT:</strong> ${ea(a.tanggapan)}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  },

  async handleKirimAspirasi(event) {
    event.preventDefault();
    if (!HavalandAuth.isLoggedIn()) {
      HavalandUtils.showToast("Akses Masuk Diperlukan", "Anda dalam Mode Tamu. Silakan masuk akun warga terlebih dahulu untuk mengirim aspirasi.", "warning");
      HavalandAuth.openLoginModal();
      return;
    }

    const user = HavalandAuth.getCurrentUser();
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
      urgensi: urgensi,
      createdBy: `${user.nama} (${user.role})`
    };

    HavalandData.aspirasi.unshift(newAspirasi);

    // Simpan snapshot penuh sebagai backup
    HavalandUtils.saveStorage("custom_aspirasi_v2", HavalandData.aspirasi);

    this.renderAspirasi();
    this.closeModal("modal-aspirasi");
    document.getElementById("form-aspirasi").reset();

    if (typeof HavalandBackup !== "undefined") HavalandBackup.autoSnapshot();
    HavalandUtils.showToast("Laporan Terkirim", "Terima kasih, aspirasi fasilitas Anda telah dicatat pengurus RT!", "success");

    // Kirim ke Vercel Cloud Database jika API tersedia
    try {
      const authHeaders = { "Content-Type": "application/json" };
      if (HavalandAuth.serverToken) {
        authHeaders["Authorization"] = `Bearer ${HavalandAuth.serverToken}`;
      }
      fetch("/api/aspirasi", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(newAspirasi)
      });
    } catch (e) {
      console.log("Cloud sync aspirasi dilewati (mode offline).");
    }
  },

  hapusAspirasi(aspId) {
    if (!HavalandAuth.isAdmin()) {
      HavalandUtils.showToast("Akses Terbatas", "Hanya Administrator RT yang dapat menghapus catatan aspirasi.", "error");
      return;
    }
    const user = HavalandAuth.getCurrentUser();
    if (!confirm(`Hapus catatan aspirasi ${aspId}? Tindakan ini akan dicatat atas nama ${user.nama}.`)) return;

    HavalandUtils.saveStorage("custom_aspirasi_v2", HavalandData.aspirasi);
    HavalandUtils.saveStorage("custom_aspirasi", HavalandData.aspirasi);
    this.renderAspirasi();
    if (typeof HavalandBackup !== "undefined") HavalandBackup.autoSnapshot();
    HavalandUtils.showToast("Aspirasi Dihapus", `Laporan ${aspId} berhasil dihapus oleh ${user.nama}`, "info");
  },

  // =========================================================================
  // CRUD LENGKAP ADMINISTRATOR RT: DATA WARGA
  // =========================================================================
  openFormWargaModal(wargaId = null) {
    if (!HavalandAuth.isAdmin()) {
      HavalandUtils.showToast("Akses Terbatas", "Hanya Administrator RT yang dapat mengelola data kependudukan warga.", "error");
      return;
    }
    const modalTitle = document.getElementById("modal-form-warga-title");
    const idInput = document.getElementById("form-warga-id");
    const blokInput = document.getElementById("form-warga-blok");
    const namaInput = document.getElementById("form-warga-nama");
    const clusterInput = document.getElementById("form-warga-cluster");
    const hunianInput = document.getElementById("form-warga-hunian");
    const jabatanInput = document.getElementById("form-warga-jabatan");
    const jiwaInput = document.getElementById("form-warga-jiwa");
    const kontakInput = document.getElementById("form-warga-kontak");
    const platInput = document.getElementById("form-warga-plat");
    const iuranInput = document.getElementById("form-warga-iuran");
    const terakhirInput = document.getElementById("form-warga-terakhir");

    if (wargaId) {
      const w = HavalandData.warga.find(item => item.id === wargaId);
      if (!w) return;
      if (modalTitle) modalTitle.textContent = `Edit Data Warga: ${w.blok} - ${w.namaKK}`;
      if (idInput) idInput.value = w.id;
      if (blokInput) blokInput.value = w.blok;
      if (namaInput) namaInput.value = w.namaKK;
      if (clusterInput) clusterInput.value = w.cluster || `Blok ${w.blok.charAt(0)} (Jl. Havaland)`;
      if (hunianInput) hunianInput.value = w.statusHunian || "Tetap";
      if (jabatanInput) jabatanInput.value = w.jabatan || "Warga";
      if (jiwaInput) jiwaInput.value = w.jumlahJiwa || 3;
      if (kontakInput) kontakInput.value = w.kontak || "-";
      if (platInput) platInput.value = Array.isArray(w.platKendaraan) ? w.platKendaraan.filter(p => p !== "-").join(", ") : "";
      if (iuranInput) iuranInput.value = w.iuranBulanIni ? "Lunas" : "Belum";
      if (terakhirInput) terakhirInput.value = HavalandUtils.parseBulanID(w.terakhirBayar || "") || new Date().toISOString().slice(0, 7);
    } else {
      if (modalTitle) modalTitle.textContent = "Tambah Data Warga Baru";
      if (idInput) idInput.value = "";
      document.getElementById("form-data-warga").reset();
      if (clusterInput) clusterInput.value = "Blok D (Jl. Havaland)";
      if (jabatanInput) jabatanInput.value = "Warga";
      if (jiwaInput) jiwaInput.value = "3";
      if (terakhirInput) terakhirInput.value = "September 2026";
    }

    this.openModal("modal-form-warga");
  },

  simpanDataWarga(event) {
    event.preventDefault();
    if (!HavalandAuth.isAdmin()) {
      HavalandUtils.showToast("Akses Terbatas", "Hanya Administrator RT yang dapat menyimpan perubahan data warga.", "error");
      return;
    }

    const idVal = document.getElementById("form-warga-id").value.trim();
    const blokVal = document.getElementById("form-warga-blok").value.trim().toUpperCase();
    const namaVal = document.getElementById("form-warga-nama").value.trim();
    const clusterVal = document.getElementById("form-warga-cluster").value.trim() || `Blok ${blokVal.charAt(0)} (Jl. Havaland)`;
    const hunianVal = document.getElementById("form-warga-hunian").value;
    const jabatanVal = document.getElementById("form-warga-jabatan").value.trim() || "Warga";
    const jiwaVal = parseInt(document.getElementById("form-warga-jiwa").value, 10) || 1;
    const kontakVal = document.getElementById("form-warga-kontak").value.trim() || "-";
    const platRaw = document.getElementById("form-warga-plat").value.trim();
    const platArray = platRaw ? platRaw.split(",").map(p => p.trim()).filter(p => p.length > 0) : ["-"];
    const iuranVal = document.getElementById("form-warga-iuran").value;
    const terakhirRaw = document.getElementById("form-warga-terakhir").value;
    const terakhirFmt = HavalandUtils.formatBulanID(terakhirRaw);
    const terakhirVal = terakhirFmt === "-"
      ? HavalandUtils.formatBulanID(new Date().toISOString().slice(0, 7))
      : terakhirFmt;

    const isLunas = iuranVal === "Lunas";

    if (idVal) {
      // Edit data yang sudah ada
      const idx = HavalandData.warga.findIndex(w => w.id === idVal);
      if (idx !== -1) {
        HavalandData.warga[idx] = {
          ...HavalandData.warga[idx],
          blok: blokVal,
          namaKK: namaVal,
          cluster: clusterVal,
          statusHunian: hunianVal,
          jabatan: jabatanVal,
          jumlahJiwa: jiwaVal,
          kontak: kontakVal,
          platKendaraan: platArray,
          statusIuran: iuranVal,
          iuranBulanIni: isLunas,
          terakhirBayar: terakhirVal
        };
      }
      HavalandUtils.showToast("Data Diperbarui", `Data warga ${blokVal} (${namaVal}) berhasil diperbarui!`, "success");
    } else {
      // Tambah warga baru
      const newId = `W-${blokVal.replace(/[^a-zA-Z0-9]/g, '') || Date.now().toString(36)}`;
      const newWarga = {
        id: newId,
        blok: blokVal,
        cluster: clusterVal,
        namaKK: namaVal,
        statusHunian: hunianVal,
        jabatan: jabatanVal,
        jumlahJiwa: jiwaVal,
        kontak: kontakVal,
        platKendaraan: platArray,
        statusIuran: iuranVal,
        iuranBulanIni: isLunas,
        terakhirBayar: terakhirVal
      };
      HavalandData.warga.push(newWarga);
      HavalandUtils.showToast("Warga Ditambahkan", `Warga baru ${blokVal} (${namaVal}) berhasil ditambahkan ke direktori!`, "success");
    }

    // Perbarui statistik kas summary
    if (HavalandData.kasSummary) {
      HavalandData.kasSummary.totalKK = HavalandData.warga.length;
      HavalandData.kasSummary.wargaSudahBayar = HavalandData.warga.filter(w => w.iuranBulanIni).length;
    }

    HavalandUtils.saveStorage("custom_warga_v2", HavalandData.warga);
    this.closeModal("modal-form-warga");
    this.filterWarga();
    this.renderKPIs();
    if (typeof HavalandBackup !== "undefined") HavalandBackup.autoSnapshot();
  },

  hapusWarga(wargaId) {
    if (!HavalandAuth.isAdmin()) {
      HavalandUtils.showToast("Akses Terbatas", "Hanya Administrator RT yang dapat menghapus data warga.", "error");
      return;
    }
    const w = HavalandData.warga.find(item => item.id === wargaId);
    if (!w) return;

    if (!confirm(`Yakin ingin menghapus data warga ${w.blok} - ${w.namaKK}? Data akan dihapus dari direktori perumahan.`)) return;

    HavalandData.warga = HavalandData.warga.filter(item => item.id !== wargaId);
    if (HavalandData.kasSummary) {
      HavalandData.kasSummary.totalKK = HavalandData.warga.length;
      HavalandData.kasSummary.wargaSudahBayar = HavalandData.warga.filter(w => w.iuranBulanIni).length;
    }

    HavalandUtils.saveStorage("custom_warga_v2", HavalandData.warga);
    this.filterWarga();
    this.renderKPIs();
    if (typeof HavalandBackup !== "undefined") HavalandBackup.autoSnapshot();
    HavalandUtils.showToast("Warga Dihapus", `Data warga ${w.blok} (${w.namaKK}) berhasil dihapus.`, "info");
  },

  // =========================================================================
  // CRUD LENGKAP ADMINISTRATOR RT: DIREKTORI KONTAK DARURAT & PENTING
  // =========================================================================
  openFormKontakModal(index = -1) {
    if (!HavalandAuth.isAdmin()) {
      HavalandUtils.showToast("Akses Terbatas", "Hanya Administrator RT yang dapat mengelola direktori kontak darurat.", "error");
      return;
    }
    const modalTitle = document.getElementById("modal-form-kontak-title");
    const idxInput = document.getElementById("form-kontak-index");
    const namaInput = document.getElementById("form-kontak-nama");
    const roleInput = document.getElementById("form-kontak-role");
    const nomorInput = document.getElementById("form-kontak-nomor");
    const waInput = document.getElementById("form-kontak-wa");

    if (index >= 0 && HavalandData.profile.kontakDarurat[index]) {
      const c = HavalandData.profile.kontakDarurat[index];
      if (modalTitle) modalTitle.textContent = `Edit Kontak: ${c.nama}`;
      if (idxInput) idxInput.value = index;
      if (namaInput) namaInput.value = c.nama;
      if (roleInput) roleInput.value = c.role;
      if (nomorInput) nomorInput.value = c.nomor;
      if (waInput) waInput.value = c.wa || "";
    } else {
      if (modalTitle) modalTitle.textContent = "Tambah Kontak Darurat Baru";
      if (idxInput) idxInput.value = "";
      document.getElementById("form-data-kontak").reset();
    }

    this.openModal("modal-form-kontak");
  },

  simpanKontak(event) {
    event.preventDefault();
    if (!HavalandAuth.isAdmin()) {
      HavalandUtils.showToast("Akses Terbatas", "Hanya Administrator RT yang dapat menyimpan kontak.", "error");
      return;
    }

    const idxVal = document.getElementById("form-kontak-index").value;
    const namaVal = document.getElementById("form-kontak-nama").value.trim();
    const roleVal = document.getElementById("form-kontak-role").value.trim();
    const nomorVal = document.getElementById("form-kontak-nomor").value.trim();
    const waVal = document.getElementById("form-kontak-wa").value.trim().replace(/[^0-9]/g, '');

    const contactObj = {
      nama: namaVal,
      role: roleVal,
      nomor: nomorVal,
      wa: waVal,
      icon: "phone"
    };

    if (idxVal !== "" && !isNaN(parseInt(idxVal, 10))) {
      const idx = parseInt(idxVal, 10);
      HavalandData.profile.kontakDarurat[idx] = contactObj;
      HavalandUtils.showToast("Kontak Diperbarui", `Kontak "${namaVal}" berhasil diperbarui!`, "success");
    } else {
      HavalandData.profile.kontakDarurat.push(contactObj);
      HavalandUtils.showToast("Kontak Ditambahkan", `Kontak baru "${namaVal}" berhasil ditambahkan!`, "success");
    }

    HavalandUtils.saveStorage("custom_kontak_v1", HavalandData.profile.kontakDarurat);
    this.closeModal("modal-form-kontak");
    this.renderKontak();
    if (typeof HavalandBackup !== "undefined") HavalandBackup.autoSnapshot();
  },

  hapusKontak(index) {
    if (!HavalandAuth.isAdmin()) {
      HavalandUtils.showToast("Akses Terbatas", "Hanya Administrator RT yang dapat menghapus kontak.", "error");
      return;
    }
    const c = HavalandData.profile.kontakDarurat[index];
    if (!c) return;

    if (!confirm(`Hapus kontak "${c.nama}" (${c.role}) dari daftar nomor penting Havaland?`)) return;

    HavalandData.profile.kontakDarurat.splice(index, 1);
    HavalandUtils.saveStorage("custom_kontak_v1", HavalandData.profile.kontakDarurat);
    this.renderKontak();
    if (typeof HavalandBackup !== "undefined") HavalandBackup.autoSnapshot();
    HavalandUtils.showToast("Kontak Dihapus", `Kontak "${c.nama}" telah dihapus.`, "info");
  },

  // =========================================================================
  // CRUD LENGKAP ADMINISTRATOR RT & PENGURUS: EDIT & TANGGAPI ASPIRASI
  // =========================================================================
  openEditAspirasiModal(aspId) {
    if (!HavalandAuth.isAdmin() && !HavalandAuth.isPengurus()) {
      HavalandUtils.showToast("Akses Terbatas", "Hanya Administrator atau Pengurus RT yang dapat mengedit/menanggapi laporan.", "error");
      return;
    }
    const a = HavalandData.aspirasi.find(item => item.id === aspId);
    if (!a) return;

    document.getElementById("edit-asp-id").value = a.id;
    document.getElementById("edit-asp-pelapor").value = a.pelapor;
    document.getElementById("edit-asp-kategori").value = a.kategori;
    document.getElementById("edit-asp-judul").value = a.judul;
    document.getElementById("edit-asp-status").value = a.status;
    document.getElementById("edit-asp-urgensi").value = a.urgensi;
    document.getElementById("edit-asp-tanggapan").value = a.tanggapan || "";

    this.openModal("modal-edit-aspirasi");
  },

  simpanEditAspirasi(event) {
    event.preventDefault();
    if (!HavalandAuth.isAdmin() && !HavalandAuth.isPengurus()) {
      HavalandUtils.showToast("Akses Terbatas", "Hanya Administrator atau Pengurus RT yang dapat menyimpan tanggapan aspirasi.", "error");
      return;
    }

    const aspId = document.getElementById("edit-asp-id").value;
    const a = HavalandData.aspirasi.find(item => item.id === aspId);
    if (!a) return;

    a.pelapor = document.getElementById("edit-asp-pelapor").value.trim();
    a.kategori = document.getElementById("edit-asp-kategori").value;
    a.judul = document.getElementById("edit-asp-judul").value.trim();
    a.status = document.getElementById("edit-asp-status").value;
    a.urgensi = document.getElementById("edit-asp-urgensi").value;
    a.tanggapan = document.getElementById("edit-asp-tanggapan").value.trim();

    HavalandUtils.saveStorage("custom_aspirasi_v2", HavalandData.aspirasi);
    HavalandUtils.saveStorage("custom_aspirasi", HavalandData.aspirasi);
    this.closeModal("modal-edit-aspirasi");
    this.renderAspirasi();
    if (typeof HavalandBackup !== "undefined") HavalandBackup.autoSnapshot();
    HavalandUtils.showToast("Laporan Diperbarui", `Status laporan "${a.judul.slice(0, 30)}..." berhasil diperbarui ke "${a.status}"!`, "success");
  },

  // Centang "sampai acara selesai": kunci input jam selesai
  toggleSampaiSelesai(timeId, checkId) {
    const timeInput = document.getElementById(timeId);
    const check = document.getElementById(checkId);
    if (!timeInput || !check) return;
    timeInput.disabled = check.checked;
    if (check.checked) timeInput.value = "";
  },

  // =========================================================================
  // CRUD LENGKAP ADMINISTRATOR RT & PENGURUS: EDIT JADWAL KEGIATAN
  // =========================================================================
  openEditKegiatanModal(kegId) {
    if (!HavalandAuth.isAdmin() && !HavalandAuth.isPengurus()) {
      HavalandUtils.showToast("Akses Terbatas", "Hanya Administrator atau Pengurus RT yang dapat mengedit jadwal kegiatan.", "error");
      return;
    }
    const k = HavalandData.kegiatan.find(item => item.id === kegId);
    if (!k) return;

    document.getElementById("edit-keg-id").value = k.id;
    document.getElementById("edit-keg-judul").value = k.judul;
    document.getElementById("edit-keg-kategori").value = k.kategori;
    document.getElementById("edit-keg-tipe").value = k.tipe || "Rutin";
    // Isi kalender dari teks lama bila bisa dibaca ("27 Sep 2026", "07.30", ...)
    const parsed = HavalandUtils.parseWaktuNext(k.waktuNext || k.frekuensi || "");
    const origTeks = k.waktuNext || k.frekuensi || "";
    document.getElementById("edit-keg-tanggal").value = parsed.date || "";
    document.getElementById("edit-keg-waktu-mulai").value = parsed.start || "";
    document.getElementById("edit-keg-waktu-selesai").value = parsed.end || "";
    document.getElementById("edit-keg-waktu-orig").value = origTeks;
    // Tandai centang bila jadwal lamanya sampai selesai ("s.d. selesai")
    const sampaiCheck = document.getElementById("edit-keg-sampai-selesai");
    const sampaiAktif = /s\.d\.|selesai/i.test(origTeks);
    if (sampaiCheck) sampaiCheck.checked = sampaiAktif;
    const selesaiInput = document.getElementById("edit-keg-waktu-selesai");
    if (selesaiInput) selesaiInput.disabled = sampaiAktif;
    document.getElementById("edit-keg-lokasi").value = k.lokasi;
    document.getElementById("edit-keg-koordinator").value = k.koordinator;
    document.getElementById("edit-keg-badge").value = k.statusBadge || "";
    document.getElementById("edit-keg-deskripsi").value = k.deskripsi;

    this.openModal("modal-edit-kegiatan");
  },

  handleEditKegiatan(event) {
    event.preventDefault();
    if (!HavalandAuth.isAdmin() && !HavalandAuth.isPengurus()) {
      HavalandUtils.showToast("Akses Terbatas", "Hanya Administrator atau Pengurus RT yang dapat mengedit jadwal kegiatan.", "error");
      return;
    }

    const kegId = document.getElementById("edit-keg-id").value;
    const k = HavalandData.kegiatan.find(item => item.id === kegId);
    if (!k) return;

    k.judul = document.getElementById("edit-keg-judul").value.trim();
    k.kategori = document.getElementById("edit-keg-kategori").value;
    k.tipe = document.getElementById("edit-keg-tipe").value;
    // Bila tanggal dipilih ulang via kalender → susun ulang teks jadwal;
    // bila dikosongkan → pertahankan teks lama (cocok untuk jadwal rutin).
    const editTgl = document.getElementById("edit-keg-tanggal").value;
    const editMulai = document.getElementById("edit-keg-waktu-mulai").value;
    const editSelesai = document.getElementById("edit-keg-waktu-selesai").value;
    const editSampai = document.getElementById("edit-keg-sampai-selesai")?.checked;
    if (editTgl) {
      const tglTeks = HavalandUtils.formatHariTanggal(editTgl);
      const mulaiTeks = HavalandUtils.formatJamID(editMulai);
      const selesaiTeks = HavalandUtils.formatJamID(editSelesai);
      k.waktuNext = editSampai && mulaiTeks
        ? `${tglTeks} • ${mulaiTeks} WIB s.d. selesai`
        : (mulaiTeks
          ? (selesaiTeks ? `${tglTeks} • ${mulaiTeks} - ${selesaiTeks} WIB` : `${tglTeks} • ${mulaiTeks} WIB`)
          : tglTeks);
    } else {
      k.waktuNext = document.getElementById("edit-keg-waktu-orig").value.trim() || k.waktuNext;
    }
    k.lokasi = document.getElementById("edit-keg-lokasi").value.trim();
    k.koordinator = document.getElementById("edit-keg-koordinator").value.trim() || "Belum ditentukan";
    k.statusBadge = document.getElementById("edit-keg-badge").value.trim();
    k.deskripsi = document.getElementById("edit-keg-deskripsi").value.trim();

    HavalandUtils.saveStorage("custom_kegiatan_v2", HavalandData.kegiatan);
    this.closeModal("modal-edit-kegiatan");
    this.renderKegiatan("semua");
    if (typeof HavalandBackup !== "undefined") HavalandBackup.autoSnapshot();
    HavalandUtils.showToast("Kegiatan Diperbarui", `Jadwal "${k.judul}" berhasil diperbarui!`, "success");
  },

  // =========================================================================
  // CRUD LENGKAP ADMINISTRATOR RT & BENDAHARA: EDIT TRANSAKSI KAS
  // =========================================================================
  openEditTransaksiModal(trxId, e) {
    if (e) e.stopPropagation();
    if (!HavalandAuth.isAdmin() && !HavalandAuth.isBendahara()) {
      HavalandUtils.showToast("Akses Terbatas", "Hanya Administrator atau Bendahara RT yang dapat mengedit transaksi kas.", "error");
      return;
    }
    const t = HavalandData.transaksi.find(item => item.id === trxId);
    if (!t) return;

    document.getElementById("edit-trx-id").value = t.id;
    document.getElementById("edit-trx-tanggal").value = t.tanggal;
    document.getElementById("edit-trx-jenis").value = t.jenis;
    document.getElementById("edit-trx-kategori").value = t.kategori;
    document.getElementById("edit-trx-nominal").value = t.nominal;
    document.getElementById("edit-trx-uraian").value = t.uraian;
    document.getElementById("edit-trx-metode").value = t.metode;
    document.getElementById("edit-trx-pj").value = t.pj;
    document.getElementById("edit-trx-catatan").value = t.catatan || "";

    this.openModal("modal-edit-transaksi");
  },

  handleEditTransaksi(event) {
    event.preventDefault();
    if (!HavalandAuth.isAdmin() && !HavalandAuth.isBendahara()) {
      HavalandUtils.showToast("Akses Terbatas", "Hanya Administrator atau Bendahara RT yang dapat mengedit transaksi kas.", "error");
      return;
    }

    const trxId = document.getElementById("edit-trx-id").value;
    const t = HavalandData.transaksi.find(item => item.id === trxId);
    if (!t) return;

    t.tanggal = document.getElementById("edit-trx-tanggal").value;
    t.jenis = document.getElementById("edit-trx-jenis").value;
    t.kategori = document.getElementById("edit-trx-kategori").value.trim();
    t.nominal = parseInt(document.getElementById("edit-trx-nominal").value, 10) || 0;
    t.uraian = document.getElementById("edit-trx-uraian").value.trim();
    t.metode = document.getElementById("edit-trx-metode").value.trim();
    t.pj = document.getElementById("edit-trx-pj").value.trim();
    t.catatan = document.getElementById("edit-trx-catatan").value.trim();

    HavalandUtils.saveStorage("custom_transaksi_full", HavalandData.transaksi);
    this.recalculateSummary();
    this.closeModal("modal-edit-transaksi");
    this.filterTransaksi();
    this.renderKPIs();
    if (typeof HavalandBackup !== "undefined") HavalandBackup.autoSnapshot();
    HavalandUtils.showToast("Transaksi Diperbarui", `Catatan transaksi ${t.id} berhasil diperbarui!`, "success");
  },

  // =========================================================================
  // TAMBAH & KELOLA TRANSAKSI KAS (CRUD WARGA & PENGURUS DENGAN AUDIT PENCATAT)
  // =========================================================================
  openTambahTransaksiModal() {
    if (!HavalandAuth.isLoggedIn()) {
      HavalandUtils.showToast("Akses Diperlukan", "Silakan masuk akun terlebih dahulu untuk mencatat transaksi buku kas.", "info");
      HavalandAuth.openLoginModal();
      return;
    }
    if (!HavalandAuth.isBendahara() && !HavalandAuth.isAdmin()) {
      HavalandUtils.showToast("Akses Terbatas", "Pencatatan buku kas hanya dapat dilakukan oleh Bendahara RT atau Administrator RT.", "warning");
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
    if (!HavalandAuth.isLoggedIn()) {
      HavalandUtils.showToast("Akses Masuk Diperlukan", "Anda dalam Mode Tamu. Silakan masuk akun terlebih dahulu untuk mencatat transaksi.", "warning");
      HavalandAuth.openLoginModal();
      return;
    }
    if (!HavalandAuth.isBendahara() && !HavalandAuth.isAdmin()) {
      HavalandUtils.showToast("Akses Terbatas", "Pencatatan buku kas hanya dapat dilakukan oleh Bendahara RT atau Administrator RT.", "warning");
      return;
    }
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

    // Simpan snapshot penuh sebagai cadangan instan
    HavalandUtils.saveStorage("custom_transaksi_full", HavalandData.transaksi);

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
      const authHeaders = { "Content-Type": "application/json" };
      if (HavalandAuth.serverToken) {
        authHeaders["Authorization"] = `Bearer ${HavalandAuth.serverToken}`;
      }
      fetch("/api/transaksi", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(newTrx)
      });
    } catch (e) {
      console.log("Cloud sync transaksi dilewati (mode offline).");
    }
  },

  hapusTransaksi(trxId, e) {
    if (e) e.stopPropagation();
    if (!HavalandAuth.isLoggedIn()) {
      HavalandUtils.showToast("Akses Terbatas", "Anda dalam Mode Tamu (Hanya Lihat). Silakan masuk akun terlebih dahulu untuk menghapus transaksi kas.", "warning");
      HavalandAuth.openLoginModal();
      return;
    }
    const user = HavalandAuth.getCurrentUser();
    if (!confirm(`Hapus catatan transaksi ${trxId}? Tindakan ini akan dicatat atas nama ${user.nama}.`)) return;

    HavalandData.transaksi = HavalandData.transaksi.filter(t => t.id !== trxId);
    HavalandUtils.saveStorage("custom_transaksi_full", HavalandData.transaksi);
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
      HavalandUtils.showToast("Akses Masuk Diperlukan", "Anda dalam Mode Tamu (Hanya Lihat). Silakan masuk akun terlebih dahulu untuk menambah jadwal kegiatan.", "info");
      HavalandAuth.openLoginModal();
      return;
    }
    if (!HavalandAuth.isPengurus() && !HavalandAuth.isAdmin()) {
      HavalandUtils.showToast("Akses Terbatas", "Penambahan jadwal kegiatan lingkungan dilakukan oleh Pengurus RT atau Administrator RT.", "warning");
      return;
    }
    const user = HavalandAuth.getCurrentUser();
    const pjInput = document.getElementById("keg-pj");
    if (pjInput && user) {
      pjInput.value = `${user.nama} (${user.role})`;
    }
    // Default tanggal = hari ini agar kalender langsung siap dipilih
    const tglInput = document.getElementById("keg-jadwal");
    if (tglInput && !tglInput.value) {
      tglInput.value = new Date().toISOString().slice(0, 10);
    }
    // Reset centang sampai-selesai
    const sampaiCheck = document.getElementById("keg-sampai-selesai");
    if (sampaiCheck) sampaiCheck.checked = false;
    const selesaiInput = document.getElementById("keg-waktu-selesai");
    if (selesaiInput) selesaiInput.disabled = false;
    this.openModal("modal-tambah-kegiatan");
  },

  handleTambahKegiatan(event) {
    event.preventDefault();
    if (!HavalandAuth.isLoggedIn()) {
      HavalandUtils.showToast("Akses Masuk Diperlukan", "Anda dalam Mode Tamu. Silakan masuk akun terlebih dahulu untuk menambah jadwal kegiatan.", "warning");
      HavalandAuth.openLoginModal();
      return;
    }
    if (!HavalandAuth.isPengurus() && !HavalandAuth.isAdmin()) {
      HavalandUtils.showToast("Akses Terbatas", "Penambahan jadwal kegiatan lingkungan dilakukan oleh Pengurus RT atau Administrator RT.", "warning");
      return;
    }
    const user = HavalandAuth.getCurrentUser();
    const nama = document.getElementById("keg-nama").value.trim();
    const kategori = document.getElementById("keg-kategori").value;
    const status = document.getElementById("keg-status").value;
    const jadwalISO = document.getElementById("keg-jadwal").value;
    const mulai = document.getElementById("keg-waktu-mulai").value;
    const selesai = document.getElementById("keg-waktu-selesai").value;
    const sampaiSelesai = document.getElementById("keg-sampai-selesai")?.checked;
    const lokasi = document.getElementById("keg-lokasi").value.trim();
    const pj = document.getElementById("keg-pj").value.trim() || "Belum ditentukan";
    const deskripsi = document.getElementById("keg-deskripsi").value.trim();

    if (!jadwalISO || !mulai) {
      HavalandUtils.showToast("Tanggal Belum Lengkap", "Pilih tanggal dan jam mulai kegiatan via kalender.", "warning");
      return;
    }

    // Susun tampilan "Minggu, 27 Sep 2026 • 07.30 - 10.00 WIB" otomatis
    // (atau "... • 07.30 WIB s.d. selesai" bila dicentang sampai selesai)
    const jadwalTeks = HavalandUtils.formatHariTanggal(jadwalISO);
    const mulaiTeks = HavalandUtils.formatJamID(mulai);
    const selesaiTeks = HavalandUtils.formatJamID(selesai);
    const waktu = sampaiSelesai
      ? `${jadwalTeks} • ${mulaiTeks} WIB s.d. selesai`
      : (selesaiTeks ? `${jadwalTeks} • ${mulaiTeks} - ${selesaiTeks} WIB` : `${jadwalTeks} • ${mulaiTeks} WIB`);

    const pencatatInfo = `${user.nama} (${user.role})`;

    const newKeg = {
      id: `ACT-${Date.now().toString().slice(-4)}`,
      tipe: "Agenda Khusus",
      kategori: kategori,
      judul: nama,
      waktuNext: waktu,
      lokasi: lokasi,
      koordinator: pj,
      frekuensi: status,
      statusBadge: status,
      deskripsi: deskripsi,
      createdBy: pencatatInfo,
      createdAt: new Date().toISOString()
    };

    HavalandData.kegiatan.unshift(newKeg);
    HavalandUtils.saveStorage("custom_kegiatan_v2", HavalandData.kegiatan);

    this.renderKegiatan("semua");
    this.renderBerandaHighlights();
    this.closeModal("modal-tambah-kegiatan");
    document.getElementById("form-tambah-kegiatan").reset();

    if (typeof HavalandBackup !== "undefined") HavalandBackup.autoSnapshot();
    HavalandUtils.showToast("Jadwal Ditambahkan", `Agenda '${nama}' dicatat oleh ${user.nama}!`, "success");
  },

  hapusKegiatan(kegId) {
    if (!HavalandAuth.isLoggedIn()) {
      HavalandUtils.showToast("Akses Terbatas", "Anda dalam Mode Tamu (Hanya Lihat). Silakan masuk akun untuk menghapus jadwal kegiatan.", "warning");
      HavalandAuth.openLoginModal();
      return;
    }
    const user = HavalandAuth.getCurrentUser();
    if (!confirm(`Hapus jadwal kegiatan ini? Tindakan ini akan dicatat atas nama ${user.nama}.`)) return;

    HavalandData.kegiatan = HavalandData.kegiatan.filter(k => k.id !== kegId);
    HavalandUtils.saveStorage("custom_kegiatan_v2", HavalandData.kegiatan);
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
      searchInput.value = "";
      if (clearBtn) clearBtn.style.display = "none";
    }

    // Auto-select first house if none currently selected, so user immediately sees rich data!
    if (!this.selectedWargaIuran && HavalandData.warga.length > 0) {
      this.selectedWargaIuran = HavalandData.warga[0];
      const select = document.getElementById("select-rumah-iuran");
      if (select) select.value = this.selectedWargaIuran.id;
    }

    this.renderBlokRecommendations("", "semua");
    this.updateCekIuranDetail();

    if (searchInput) {
      setTimeout(() => {
        searchInput.focus();
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
    if (query.includes(" - ")) {
      query = "";
      if (input) input.value = "";
      const clearBtn = document.getElementById("btn-clear-cari-blok");
      if (clearBtn) clearBtn.style.display = "none";
    }

    this.renderBlokRecommendations(query, blok);
  },

  handleCariBlokInput(e) {
    const query = e.target.value;
    const clearBtn = document.getElementById("btn-clear-cari-blok");
    if (clearBtn) {
      clearBtn.style.display = query.trim().length > 0 ? "flex" : "none";
    }
    this.renderBlokRecommendations(query, this.currentBlokFilter);
  },

  clearCariBlok() {
    const input = document.getElementById("input-cari-blok");
    const clearBtn = document.getElementById("btn-clear-cari-blok");
    if (input) {
      input.value = "";
      input.focus();
    }
    if (clearBtn) clearBtn.style.display = "none";

    this.renderBlokRecommendations("", this.currentBlokFilter);
  },

  showBlokDropdown() {
    const dropdown = document.getElementById("autocomplete-dropdown-blok");
    if (dropdown) dropdown.style.display = "flex";
  },

  hideBlokDropdown(delay = 180) {
    // In-line house list stays visible; no auto-hide needed
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
        const b = w.blok.toUpperCase();
        const f = filterBlok.toUpperCase();
        if (!b.startsWith(f) && !b.startsWith(f + "-")) {
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
          <div style="font-size: 0.72rem; margin-top: 0.35rem; color: var(--text-muted);">Coba ketik nomor blok lain (misal: D1, F7) atau klik tombol tab blok di atas.</div>
        </div>
      `;
      return;
    }

    let html = `
      <div class="autocomplete-header-tip" style="position: sticky; top: 0; background: var(--surface); z-index: 1;">
        <span>Daftar Rumah (${matches.length})</span>
        <span style="font-size: 0.65rem; color: var(--text-muted);">Pilih untuk lihat status</span>
      </div>
    `;

    matches.slice(0, 30).forEach((w, index) => {
      const blokHighlighted = this.highlightMatch(w.blok, rawQ);
      const namaHighlighted = this.highlightMatch(w.namaKK, rawQ);
      const isLunas = w.iuranBulanIni;
      const isSelected = this.selectedWargaIuran && this.selectedWargaIuran.id === w.id;
      const statusBadge = isLunas
        ? `<span class="badge badge-success autocomplete-item-badge">Lunas</span>`
        : `<span class="badge badge-danger autocomplete-item-badge">Belum Bayar</span>`;

      html += `
        <div class="autocomplete-item ${isSelected ? 'selected' : ''} ${index === 0 && rawQ ? 'active' : ''}" 
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
    }
  },

  pilihRumahFromAutocomplete(wargaId) {
    const w = HavalandData.warga.find(x => x.id === wargaId);
    if (!w) return;

    this.selectedWargaIuran = w;

    const select = document.getElementById("select-rumah-iuran");
    if (select) {
      select.value = w.id;
    }

    // Highlight selected card in the in-line list
    const items = document.querySelectorAll("#autocomplete-dropdown-blok .autocomplete-item");
    items.forEach(el => {
      if (el.getAttribute("data-id") === w.id) {
        el.classList.add("selected");
      } else {
        el.classList.remove("selected");
      }
    });

    this.updateCekIuranDetail();
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
    const emptyState = document.getElementById("cek-iuran-empty-state");
    let wargaId = select ? select.value : null;

    if (!wargaId && this.selectedWargaIuran) {
      wargaId = this.selectedWargaIuran.id;
      if (select) select.value = wargaId;
    }

    if (!wargaId) {
      if (resultBox) resultBox.style.display = "none";
      if (emptyState) emptyState.style.display = "flex";
      this.selectedWargaIuran = null;
      return;
    }

    const w = HavalandData.warga.find(item => item.id === wargaId);
    if (!w) {
      if (resultBox) resultBox.style.display = "none";
      if (emptyState) emptyState.style.display = "flex";
      return;
    }

    this.selectedWargaIuran = w;
    if (emptyState) emptyState.style.display = "none";
    if (resultBox) resultBox.style.display = "block";

    const blokLabel = document.getElementById("cek-blok-label");
    const namaKKLabel = document.getElementById("cek-nama-kk");
    const clusterLabel = document.getElementById("cek-cluster-label");
    const terakhirBayarLabel = document.getElementById("cek-terakhir-bayar");

    if (blokLabel) blokLabel.textContent = `Blok ${w.blok}`;
    if (namaKKLabel) namaKKLabel.textContent = w.namaKK;
    if (clusterLabel) clusterLabel.textContent = `${w.cluster} (${w.statusHunian})`;
    if (terakhirBayarLabel) terakhirBayarLabel.textContent = w.terakhirBayar || "Belum ada riwayat";

    const isLunas = w.iuranBulanIni;
    const badgeContainer = document.getElementById("cek-status-badge");
    const statusText = document.getElementById("cek-bulan-status");

    if (badgeContainer && statusText) {
      if (isLunas) {
        badgeContainer.innerHTML = `<span class="badge badge-success" style="font-size: 0.85rem;">Lunas Terverifikasi</span>`;
        statusText.innerHTML = `<span style="color: var(--accent); font-weight: 700;">Lunas (September 2026)</span>`;
      } else {
        badgeContainer.innerHTML = `<span class="badge badge-danger" style="font-size: 0.85rem;">Belum Terbayar</span>`;
        statusText.innerHTML = `<span style="color: var(--danger); font-weight: 700;">Menunggu Pembayaran (Rp 350.000)</span>`;
      }
    }

    // Render area aksi otentikasi iuran (Mode Tamu vs Pengguna Login)
    const actionArea = document.getElementById("iuran-auth-action-area");
    if (actionArea) {
      if (typeof HavalandAuth !== "undefined" && HavalandAuth.isLoggedIn()) {
        const user = HavalandAuth.getCurrentUser();
        if (isLunas) {
          actionArea.innerHTML = `
            <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: var(--radius-md); padding: 0.75rem 0.9rem; font-size: 0.8rem; color: var(--accent); display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 0.4rem;">
                <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
                <span>Status: <strong>Lunas Terverifikasi</strong></span>
              </div>
              ${HavalandAuth.isAdmin() ? `
              <button type="button" class="btn btn-sm" style="color: var(--danger); background: transparent; border: 1px solid rgba(239, 68, 68, 0.3); font-size: 0.72rem; padding: 3px 8px;" onclick="HavalandApp.batalkanIuranRumahIni('${w.id}')" title="Batalkan status lunas (Admin/Pengurus)">
                Batalkan Lunas
              </button>
              ` : ''}
            </div>
          `;
        } else {
          actionArea.innerHTML = `
            <button type="button" class="btn btn-primary" onclick="HavalandApp.catatIuranRumahIni('${w.id}')" style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; width: 100%; font-weight: 700;">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              Verifikasi & Catat Masuk ke Buku Kas (Rp 350.000)
            </button>
            <div style="font-size: 0.72rem; color: var(--text-muted); text-align: center;">
              Pencatat: <strong>${user.nama} (${user.role})</strong> • Otomatis masuk ke Buku Kas
            </div>
          `;
        }
      } else {
        actionArea.innerHTML = `
          <div style="background: var(--bg-subtle); border: 1px dashed var(--surface-border); border-radius: var(--radius-md); padding: 0.75rem 0.9rem; font-size: 0.8rem; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;">
            <div>
              <div style="font-weight: 700; color: var(--text-primary); font-size: 0.82rem; display: flex; align-items: center; gap: 0.35rem;">
                <span>🔒</span> Mode Tamu (Hanya Lihat Data)
              </div>
              <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">
                Untuk mengubah status iuran atau verifikasi mutasi kas, silakan masuk ke akun warga/pengurus.
              </div>
            </div>
            <button type="button" class="btn btn-secondary btn-sm" style="font-size: 0.75rem; white-space: nowrap;" onclick="HavalandAuth.openLoginModal()">
              Masuk Akun
            </button>
          </div>
        `;
      }
    }

    if (resultBox) resultBox.style.display = "block";
  },

  catatIuranRumahIni(wargaId) {
    if (!HavalandAuth.isLoggedIn()) {
      HavalandUtils.showToast("Akses Terbatas", "Anda dalam Mode Tamu. Silakan masuk akun warga terlebih dahulu untuk mencatat pembayaran iuran.", "warning");
      HavalandAuth.openLoginModal();
      return;
    }

    const w = HavalandData.warga.find(item => item.id === wargaId);
    if (!w) return;

    const user = HavalandAuth.getCurrentUser();
    const nominal = 350000;
    const tanggal = new Date().toISOString().slice(0, 10);
    const pencatatInfo = `${user.nama} (${user.role})`;

    const newTrx = {
      id: `TRX-${tanggal.replace(/-/g, '').slice(0, 6)}-${(HavalandData.transaksi.length + 1).toString().padStart(3, '0')}`,
      tanggal: tanggal,
      jenis: "masuk",
      kategori: "Iuran Bulanan",
      uraian: `Iuran Kas September 2026 - ${w.namaKK} (${w.blok})`,
      nominal: nominal,
      metode: "Transfer Bank",
      pj: pencatatInfo,
      bukti: `IUR-${w.blok.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString().slice(-4)}`,
      status: "Verified",
      createdBy: pencatatInfo,
      createdAt: new Date().toISOString(),
      catatan: `Pembayaran iuran dikonfirmasi oleh ${pencatatInfo}`
    };

    // Update status warga
    w.iuranBulanIni = true;
    w.terakhirBayar = "September 2026";

    // Simpan data transaksi (snapshot penuh)
    HavalandData.transaksi.unshift(newTrx);
    HavalandUtils.saveStorage("custom_transaksi_full", HavalandData.transaksi);

    // Simpan data warga
    HavalandUtils.saveStorage("custom_warga_v2", HavalandData.warga);

    this.recalculateSummary();
    this.renderKPIs();
    this.filterTransaksi();
    this.filterWarga();
    this.renderBerandaHighlights();
    this.updateCekIuranDetail();

    if (typeof HavalandBackup !== "undefined") {
      HavalandBackup.autoSnapshot();
    }

    HavalandUtils.showToast(
      "Iuran Berhasil Dicatat",
      `Iuran ${w.blok} (${w.namaKK}) Rp 350.000 telah diverifikasi dan masuk Buku Kas atas nama ${user.nama}!`,
      "success"
    );
  },

  batalkanIuranRumahIni(wargaId) {
    if (!HavalandAuth.isLoggedIn()) {
      HavalandUtils.showToast("Akses Terbatas", "Silakan masuk akun terlebih dahulu.", "warning");
      HavalandAuth.openLoginModal();
      return;
    }
    const w = HavalandData.warga.find(item => item.id === wargaId);
    if (!w) return;
    if (!confirm(`Batalkan status lunas iuran untuk rumah ${w.blok} (${w.namaKK})?`)) return;

    w.iuranBulanIni = false;
    HavalandUtils.saveStorage("custom_warga_v2", HavalandData.warga);
    this.filterWarga();
    this.updateCekIuranDetail();
    HavalandUtils.showToast("Dibatalkan", `Status iuran ${w.blok} diubah menjadi Belum Terbayar.`, "info");
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
    if (!HavalandAuth.isLoggedIn()) {
      HavalandUtils.showToast(
        "Akses Masuk Diperlukan",
        "Anda dalam Mode Tamu (Hanya Lihat). Silakan masuk akun warga terlebih dahulu untuk mengirim aspirasi dan keluhan.",
        "info"
      );
      HavalandAuth.openLoginModal();
      return;
    }
    const user = HavalandAuth.getCurrentUser();
    const namaInput = document.getElementById("asp-nama");
    if (namaInput && user) {
      namaInput.value = `${user.nama} (${user.blok ? 'Blok ' + user.blok : user.role})`;
    }
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

    // Inisialisasi rentang tanggal filter transaksi ke Bulan Ini
    const range = this.getDateRangeForPreset("bulan-ini");
    const startInput = document.getElementById("trx-date-start");
    const endInput = document.getElementById("trx-date-end");
    if (startInput) startInput.value = range.start;
    if (endInput) endInput.value = range.end;
  }
};

// =============================================================================
// MODUL 1: AUTENTIKASI PENGGUNA (WARGA & PENGURUS RT) DENGAN REMEMBER ME 30 HARI
// =============================================================================
const HavalandAuth = {
  currentUser: null,
  currentSession: null,
  THIRTY_DAYS_MS: 30 * 24 * 60 * 60 * 1000, // 30 hari dalam milidetik (2.592.000.000 ms)

  init() {
    try {
      const sessionStr = localStorage.getItem("havaland_auth_session") || sessionStorage.getItem("havaland_auth_session");
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        const now = Date.now();

        // 1. Cek apakah sesi dibatasi 30 hari dan sudah kedaluwarsa (> 30 hari)
        if (session.expiresAt && now > session.expiresAt) {
          console.warn("Masa aktif login 30 hari telah berakhir. Pengguna diminta login kembali.");
          this.clearSession();
          this.currentUser = null;
          this.currentSession = null;
          this.updateUI();

          setTimeout(() => {
            HavalandUtils.showToast(
              "Sesi Berakhir (30 Hari)",
              "Masa aktif login 30 hari Anda telah berakhir demi keamanan. Silakan masuk kembali.",
              "warning"
            );
            this.openLoginModal();
          }, 800);
          return;
        }

        // 2. Sesi masih sah dan berlaku dalam 30 hari
        if (session.user) {
          this.currentUser = session.user;
          this.currentSession = session;
          // Kembalikan token server & sinkronisasi agar tulis cloud tetap jalan
          this.serverToken = session.serverToken || null;
          this.syncToken = session.syncToken || null;
          const sisaHari = session.expiresAt
            ? Math.max(1, Math.ceil((session.expiresAt - now) / (24 * 60 * 60 * 1000)))
            : null;
          console.log(`Pengguna otomatis masuk via Remember Me: ${this.currentUser.nama} (Sisa masa aktif: ${sisaHari || 'Sesi Tab'} hari)`);
        }
      } else {
        // Fallback backward compatibility untuk data lama
        const savedUser = localStorage.getItem("havaland_auth_user");
        if (savedUser) {
          const userObj = JSON.parse(savedUser);
          this.saveSession(userObj, true);
        }
      }
    } catch (e) {
      this.clearSession();
      this.currentUser = null;
      this.currentSession = null;
    }
    this.updateUI();
  },

  saveSession(user, rememberMe = true, serverToken = null, syncToken = null) {
    this.currentUser = user;
    const now = Date.now();
    const expiresAt = rememberMe ? now + this.THIRTY_DAYS_MS : null;

    // Use crypto.randomUUID for secure client-side token, or server token if available
    const clientToken = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : 'havaland_' + Date.now().toString(36) + Math.random().toString(36).slice(2);

    const session = {
      user: user,
      rememberMe: !!rememberMe,
      loginAt: now,
      expiresAt: expiresAt,
      token: serverToken || clientToken,
      serverToken: serverToken || null,
      syncToken: syncToken || null
    };

    this.currentSession = session;
    this.serverToken = serverToken || null;
    this.syncToken = syncToken || null;

    if (rememberMe) {
      localStorage.setItem("havaland_auth_session", JSON.stringify(session));
      localStorage.setItem("havaland_auth_user", JSON.stringify(user));
      sessionStorage.removeItem("havaland_auth_session");
    } else {
      sessionStorage.setItem("havaland_auth_session", JSON.stringify(session));
      localStorage.removeItem("havaland_auth_session");
      localStorage.removeItem("havaland_auth_user");
    }
  },

  clearSession() {
    this.currentUser = null;
    this.currentSession = null;
    localStorage.removeItem("havaland_auth_session");
    localStorage.removeItem("havaland_auth_user");
    sessionStorage.removeItem("havaland_auth_session");
  },

  isLoggedIn() {
    return !!this.currentUser;
  },

  isAdmin() {
    return !!(this.currentUser && (this.currentUser.isAdmin || this.currentUser.role === 'Administrator RT' || this.currentUser.role === 'Admin RT'));
  },

  isBendahara() {
    if (!this.currentUser) return false;
    return this.isAdmin() || this.currentUser.role === 'Bendahara RT';
  },

  isPengurus() {
    if (!this.currentUser) return false;
    return this.isAdmin() || this.currentUser.role === 'Pengurus RT' || this.currentUser.role === 'Bendahara RT';
  },

  getCurrentUser() {
    return this.currentUser;
  },

  openLoginModal(targetRole = null) {
    const userInput = document.getElementById("login-username");
    const passInput = document.getElementById("login-password");
    const errMsg = document.getElementById("login-error-msg");
    const rememberCheckbox = document.getElementById("login-remember-me");

    if (userInput) userInput.value = "";
    if (passInput) passInput.value = "";
    if (errMsg) errMsg.style.display = "none";
    if (rememberCheckbox) rememberCheckbox.checked = true;

    HavalandApp.openModal("modal-login");
  },

  async handleFormLogin(event) {
    event.preventDefault();
    const userVal = document.getElementById("login-username").value.trim().toLowerCase();
    const passVal = document.getElementById("login-password").value.trim();
    const errMsg = document.getElementById("login-error-msg");
    const rememberCheckbox = document.getElementById("login-remember-me");
    const rememberMe = rememberCheckbox ? rememberCheckbox.checked : true;
    const loginBtn = event.target.querySelector('button[type="submit"]');

    if (!userVal || !passVal) {
      if (errMsg) { errMsg.textContent = "Nama pengguna dan kata sandi wajib diisi."; errMsg.style.display = "block"; }
      return;
    }

    // Disable button during request
    if (loginBtn) { loginBtn.disabled = true; loginBtn.textContent = "Memproses..."; }

    try {
      // Try server-side authentication first
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: userVal, password: passVal })
      });

      const result = await response.json();

      if (result.success && result.user) {
        // Server auth succeeded — save session with server token
        const serverUser = result.user;
        this.serverToken = result.token;
        this.syncToken = result.syncToken || null;
        this.saveSession(serverUser, rememberMe, result.token, result.syncToken || null);
        this.updateUI();
        HavalandApp.closeModal("modal-login");
        // Tarik data cloud terbaru agar tidak menimpa cloud dengan lokal yang basi
        if (result.syncToken && typeof HavalandSync !== "undefined") {
          HavalandSync.pullOnLogin();
        }

        const durasiMsg = rememberMe ? " (Ingat Saya: Tetap masuk 30 hari)" : " (Sesi sementara)";
        HavalandUtils.showToast(
          "Berhasil Masuk",
          `Selamat datang, ${serverUser.nama}! Anda masuk sebagai ${serverUser.role}.${durasiMsg}`,
          "success"
        );
        if (typeof HavalandSettings !== "undefined") {
          HavalandSettings.renderBackupSection();
        }
        return;
      }
    } catch (fetchErr) {
      // Server not available — fallback to local-only mode (demo/offline)
      console.warn("Server auth unavailable, trying local fallback:", fetchErr.message);
    }

    // Fallback: local authentication for offline mode
    if (userVal === "admin" && passVal === "Amalia2125") {
      const adminUser = HavalandData.akunPengguna.find(u => u.username === "admin") || {
        username: "admin",
        nama: "Admin RT 04 Havaland",
        role: "Administrator RT",
        blok: "Kantor RT",
        isAdmin: true
      };
      this.saveSession(adminUser, rememberMe);
      this.updateUI();
      HavalandApp.closeModal("modal-login");
      const durasiMsg = rememberMe ? " (Ingat Saya: 30 hari aktif)" : "";
      HavalandUtils.showToast(
        "Berhasil Masuk",
        `Selamat datang, ${adminUser.nama}! Anda masuk sebagai Administrator RT.${durasiMsg}`,
        "success"
      );
      if (typeof HavalandSettings !== "undefined") {
        HavalandSettings.renderBackupSection();
      }
    } else {
      // Check custom users created in localStorage
      let foundUser = null;
      const local = localStorage.getItem("havaland_custom_users");
      if (local) {
        try {
          const list = JSON.parse(local);
          foundUser = list.find(u => u.username.toLowerCase() === userVal && u.password === passVal);
        } catch (e) {}
      }

      if (foundUser) {
        const sessionUser = {
          username: foundUser.username,
          nama: foundUser.nama,
          role: foundUser.role,
          blok: foundUser.blok,
          isAdmin: Boolean(foundUser.is_admin)
        };
        this.saveSession(sessionUser, rememberMe);
        this.updateUI();
        HavalandApp.closeModal("modal-login");
        const durasiMsg = rememberMe ? " (Ingat Saya: 30 hari aktif)" : "";
        HavalandUtils.showToast(
          "Berhasil Masuk",
          `Selamat datang, ${sessionUser.nama}! Anda masuk sebagai ${sessionUser.role}.${durasiMsg}`,
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
    }

    if (loginBtn) { loginBtn.disabled = false; loginBtn.textContent = "Masuk"; }
  },

  quickLogin(accountKey) {
    if (accountKey === "admin") {
      const target = HavalandData.akunPengguna.find(u => u.username === "admin");
      if (target) {
        const rememberCheckbox = document.getElementById("login-remember-me");
        const rememberMe = rememberCheckbox ? rememberCheckbox.checked : true;

        this.saveSession(target, rememberMe);
        this.updateUI();
        HavalandApp.closeModal("modal-login");
        HavalandUtils.showToast(
          "Masuk Berhasil",
          `Masuk sebagai ${target.nama} (${target.role})`,
          "success"
        );
        if (typeof HavalandSettings !== "undefined") {
          HavalandSettings.renderBackupSection();
        }
      }
    }
  },

  logout() {
    // Notify server to revoke token (fire-and-forget)
    if (this.serverToken) {
      try {
        fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.serverToken}`
          },
          body: JSON.stringify({ action: "logout" })
        }).catch(() => {});
      } catch (e) { /* ignore */ }
    }
    this.serverToken = null;
    this.syncToken = null;
    this.clearSession();
    this.updateUI();
    if (typeof HavalandSettings !== "undefined") {
      HavalandSettings.renderBackupSection();
    }
    HavalandUtils.showToast("Keluar Akun", "Anda telah keluar dari akun. Berjalan dalam mode pengunjung.", "info");
  },

  handleClickAuth() {
    if (this.currentUser) {
      let infoSesi = "";
      if (this.currentSession && this.currentSession.expiresAt) {
        const sisaHari = Math.max(1, Math.ceil((this.currentSession.expiresAt - Date.now()) / (24 * 60 * 60 * 1000)));
        infoSesi = `\n🔒 Status Sesi: Ingat Saya aktif (Sisa masa berlaku: ${sisaHari} hari lagi)\n`;
      } else if (this.currentSession && !this.currentSession.rememberMe) {
        infoSesi = `\n🔒 Status Sesi: Sementara (akan keluar saat tab ditutup)\n`;
      }

      const msg = `Halo ${this.currentUser.nama} (${this.currentUser.role})!${infoSesi}\nApakah Anda ingin keluar (Logout) atau mengganti akun?`;
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
    const btnKelola = document.getElementById("btn-kelola-akun");
    if (!btn || !nameLabel) return;

    if (this.currentUser) {
      let roleIcon = "👤";
      let roleBadge = "Warga";
      if (this.isAdmin()) {
        roleIcon = "👑";
        roleBadge = "Admin";
      } else if (this.currentUser.role === "Bendahara RT") {
        roleIcon = "💰";
        roleBadge = "Bendahara";
      } else if (this.currentUser.role === "Pengurus RT") {
        roleIcon = "📋";
        roleBadge = "Pengurus";
      }

      const rawName = this.currentUser.nama.split(",")[0].trim();
      const parts = rawName.split(" ").filter(p => !["Ir.", "dr.", "H.", "Hj.", "Drs.", "Dr.", "ST", "S.T."].includes(p));
      const shortName = parts[0] || rawName.split(" ")[0];
      nameLabel.innerHTML = `${roleIcon} ${shortName} <span style="font-size: 0.7rem; opacity: 0.85;">(${roleBadge})</span>`;
      btn.classList.add("logged-in");
      btn.classList.remove("guest-mode");
      document.body.setAttribute("data-auth-state", "logged-in");

      let sisaText = "";
      if (this.currentSession && this.currentSession.expiresAt) {
        const sisaHari = Math.max(1, Math.ceil((this.currentSession.expiresAt - Date.now()) / (24 * 60 * 60 * 1000)));
        sisaText = ` • Sesi aktif 30 hari (${sisaHari} hari lagi)`;
      }

      btn.setAttribute("title", `Masuk sebagai: ${this.currentUser.nama} (${this.currentUser.role})${sisaText} • Klik untuk keluar`);
    } else {
      nameLabel.innerHTML = `<span>Mode Tamu</span> <span style="font-size: 0.7rem; opacity: 0.75;">(Hanya Lihat)</span>`;
      btn.classList.remove("logged-in");
      btn.classList.add("guest-mode");
      btn.setAttribute("title", "Anda dalam Mode Tamu (Hanya Lihat Data). Klik untuk Masuk Akun Warga/Pengurus.");
      document.body.setAttribute("data-auth-state", "guest");
    }

    // Toggle Kelola Akun button visibility for Administrator RT only
    if (btnKelola) {
      btnKelola.style.display = this.isAdmin() ? "inline-flex" : "none";
    }

    // Toggle tombol khusus admin (Tambah Warga, Tambah Kontak, dll.)
    document.querySelectorAll(".admin-only-btn").forEach(el => {
      el.style.display = this.isAdmin() ? "inline-flex" : "none";
    });

    // Refresh antarmuka dinamis sesuai status hak akses (CRUD/Hapus/Vote/Iuran)
    if (typeof HavalandApp !== "undefined" && HavalandApp.initialized) {
      HavalandApp.filterWarga();
      HavalandApp.renderKontak();
      HavalandApp.filterTransaksi();
      HavalandApp.renderKegiatan();
      HavalandApp.renderAspirasi();
      HavalandApp.updateCekIuranDetail();
    }
    if (typeof HavalandProposals !== "undefined") {
      HavalandProposals.renderSlider();
    }
    if (typeof HavalandSlider !== "undefined") {
      HavalandSlider.updateAdminUI();
      HavalandSlider.render(); // refresh to show/hide delete buttons on slides
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
  fontSize: "normal",
  btnSize: "normal",

  init() {
    const savedPalette = localStorage.getItem("havaland_palette") || "emerald";
    const savedShadow = localStorage.getItem("havaland_card_shadow") || "medium";
    const savedLite = localStorage.getItem("havaland_litemode") === "true";
    const savedFontSize = localStorage.getItem("havaland_font_size") || "normal";
    const savedBtnSize = localStorage.getItem("havaland_btn_size") || "normal";

    this.setPalette(savedPalette, false);
    this.setShadow(savedShadow, false);
    this.toggleLiteMode(savedLite, false);
    this.setFontSize(savedFontSize, false);
    this.setBtnSize(savedBtnSize, false);
    this.updateThemeLabel();
  },

  setFontSize(size, notify = true) {
    this.fontSize = size;
    document.documentElement.setAttribute("data-font-size", size);
    localStorage.setItem("havaland_font_size", size);

    document.querySelectorAll(".font-size-btn").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-font-size") === size);
    });

    if (notify) {
      const labels = {
        small: "Kecil (90%)",
        normal: "Standar (100%)",
        large: "Besar (112%)",
        xlarge: "Ekstra Besar (125%)"
      };
      HavalandUtils.showToast(
        "Ukuran Tulisan Diubah",
        `Ukuran huruf sekarang: ${labels[size] || size}`,
        "info"
      );
    }
  },

  setBtnSize(size, notify = true) {
    this.btnSize = size;
    document.documentElement.setAttribute("data-btn-size", size);
    localStorage.setItem("havaland_btn_size", size);

    document.querySelectorAll(".btn-size-btn").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-btn-size") === size);
    });

    if (notify) {
      const labels = {
        compact: "Kompak (Hemat Ruang)",
        normal: "Standar (100%)",
        large: "Besar (Mudah Diklik)",
        xlarge: "Ekstra Luas (Aksesibilitas)"
      };
      HavalandUtils.showToast(
        "Ukuran Tombol & Ikon Diubah",
        `Ukuran tombol & ikon: ${labels[size] || size}`,
        "info"
      );
    }
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
    const themeLabels = {
      light: "Mode Terang ☀️",
      dark: "Mode Gelap (Modern) 🌙",
      amoled: "Mode Gelap AMOLED 🖤"
    };
    const lbl = document.getElementById("settings-theme-label");
    if (lbl) {
      lbl.textContent = themeLabels[HavalandApp.currentTheme] || "Mode Gelap (Modern) 🌙";
    }

    document.querySelectorAll(".theme-mode-btn").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-theme-mode") === HavalandApp.currentTheme);
    });
  },

  openModal() {
    this.renderBackupSection();
    this.updateThemeLabel();

    // Sync active button states with current values
    document.querySelectorAll(".font-size-btn").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-font-size") === this.fontSize);
    });
    document.querySelectorAll(".btn-size-btn").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-btn-size") === this.btnSize);
    });
    document.querySelectorAll(".palette-item").forEach(item => {
      item.classList.toggle("active", item.getAttribute("data-palette") === this.palette);
    });
    document.querySelectorAll(".shadow-btn").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-shadow") === this.shadow);
    });

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
      this.renderSlideSection();
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

        <!-- Tombol Manajemen Akun Warga & Akses -->
        <button type="button" class="btn btn-outline-primary btn-sm" onclick="HavalandApp.closeModal('modal-pengaturan'); HavalandUserManagement.openModal();" style="justify-content: center; width: 100%; padding: 0.5rem 0.85rem; font-weight: 600;">
          <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
          👥 Buka Manajemen Akun & Hak Akses Warga
        </button>

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
    this.renderSlideSection();
  },

  // Section Pengaturan → Kelola Slide (khusus admin, dirender bersama backup)
  renderSlideSection() {
    const container = document.getElementById("slide-controls-container");
    if (!container) return;

    const isAdmin = typeof HavalandAuth !== "undefined" && HavalandAuth.isAdmin();
    if (!isAdmin) {
      container.innerHTML = `
        <div class="admin-locked-box">
          <svg class="w-5 h-5" style="color: var(--accent-gold); flex-shrink: 0; margin-top: 2px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
          <div style="flex: 1;">
            <div style="font-weight: 700; color: var(--text-primary); margin-bottom: 2px;">Kelola slide khusus Administrator RT</div>
            <div style="line-height: 1.4;">Masuk sebagai admin untuk menambah foto dari HP/PC atau Google Drive ke slide beranda.</div>
          </div>
        </div>
      `;
      return;
    }

    const count = (typeof HavalandSlider !== "undefined" && HavalandSlider.slides)
      ? HavalandSlider.slides.length
      : 0;
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 0.6rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(16, 185, 129, 0.1); border: 1px solid var(--accent); padding: 0.6rem 0.85rem; border-radius: var(--radius-md); font-size: 0.82rem; font-weight: 700; color: var(--primary);">
          <span>🖼️ ${count} foto aktif di slide beranda & hero</span>
          <span class="badge badge-success" style="font-size: 0.7rem;">Admin</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem;">
          <button type="button" class="btn btn-primary btn-sm" onclick="HavalandApp.closeModal('modal-pengaturan'); HavalandSlider.openAddModal('upload');" style="justify-content: center;">
            📱 Tambah dari HP / PC
          </button>
          <button type="button" class="btn btn-primary btn-sm" onclick="HavalandApp.closeModal('modal-pengaturan'); HavalandSlider.openAddModal('drive');" style="justify-content: center;">
            📁 Tambah via Drive
          </button>
        </div>
        <button type="button" class="btn btn-outline-primary btn-sm" onclick="HavalandApp.closeModal('modal-pengaturan'); HavalandSlider.openManageModal();" style="justify-content: center; width: 100%; padding: 0.5rem 0.85rem; font-weight: 600;">
          ⚙️ Kelola Urutan & Hapus Slide
        </button>
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
          HavalandData.transaksi = HavalandUtils.dedupeById(dataSrc.transaksi);
          HavalandUtils.saveStorage("custom_transaksi_full", HavalandData.transaksi);
          HavalandUtils.removeStorage("custom_transaksi");
        }
        if (dataSrc.kegiatan && Array.isArray(dataSrc.kegiatan)) {
          HavalandData.kegiatan = HavalandUtils.dedupeById(dataSrc.kegiatan);
          HavalandUtils.saveStorage("custom_kegiatan_v2", HavalandData.kegiatan);
          HavalandUtils.removeStorage("custom_kegiatan");
        }
        if (dataSrc.usulanIde && Array.isArray(dataSrc.usulanIde)) {
          HavalandData.usulanIde = HavalandUtils.dedupeById(dataSrc.usulanIde);
          HavalandUtils.saveStorage("custom_usulan_v2", HavalandData.usulanIde);
          HavalandUtils.removeStorage("custom_usulan");
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
              <div style="display: flex; gap: 4px; align-items: center;">
                <button type="button" class="btn btn-sm" style="font-size: 0.72rem; color: var(--primary); background: transparent; padding: 0;" onclick="HavalandProposals.shareIdeaWA('${item.id}')">
                  Bagikan WA →
                </button>
                ${(typeof HavalandAuth !== 'undefined' && HavalandAuth.isAdmin()) ? `
                <button type="button" class="btn btn-sm" style="font-size: 0.7rem; color: var(--danger); background: transparent; border: 1px solid rgba(239, 68, 68, 0.25); padding: 1px 6px; margin-left: 4px;" onclick="HavalandProposals.hapusIde('${item.id}')" title="Hapus Usulan (Admin RT)">
                  Hapus
                </button>
                ` : ''}
              </div>
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
    if (!HavalandAuth.isLoggedIn()) {
      HavalandUtils.showToast(
        "Akses Masuk Diperlukan",
        "Anda dalam Mode Tamu (Hanya Lihat). Silakan masuk akun warga terlebih dahulu untuk memberikan dukungan usulan ide.",
        "info"
      );
      HavalandAuth.openLoginModal();
      return;
    }

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

    HavalandUtils.saveStorage("custom_usulan_v2", HavalandData.usulanIde);
    this.renderSlider();
  },

  hapusIde(ideaId) {
    if (!HavalandAuth.isAdmin()) {
      HavalandUtils.showToast("Akses Ditolak", "Hanya Administrator RT yang dapat menghapus usulan ide warga.", "error");
      return;
    }
    const user = HavalandAuth.getCurrentUser();
    if (!confirm(`Hapus usulan ide warga ini? Tindakan ini akan dicatat atas nama ${user.nama}.`)) return;

    HavalandData.usulanIde = HavalandData.usulanIde.filter(u => u.id !== ideaId);
    HavalandUtils.saveStorage("custom_usulan_v2", HavalandData.usulanIde);
    this.renderSlider();
    if (typeof HavalandBackup !== "undefined") HavalandBackup.autoSnapshot();
    HavalandUtils.showToast("Usulan Dihapus", `Usulan ide berhasil dihapus oleh ${user.nama}.`, "info");
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
        "Anda dalam Mode Tamu (Hanya Lihat). Silakan masuk akun warga terlebih dahulu untuk mengajukan usulan ide.",
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
      HavalandUtils.showToast("Akses Masuk Diperlukan", "Anda dalam Mode Tamu. Silakan masuk akun warga terlebih dahulu untuk mengajukan usulan ide.", "warning");
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
    HavalandUtils.saveStorage("custom_usulan_v2", HavalandData.usulanIde);

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

// =============================================================================
// MODUL 5: MANAJEMEN AKUN & HAK AKSES WARGA (ROLE-BASED ACCESS CONTROL)
// =============================================================================
const HavalandUserManagement = {
  users: [],
  isLoading: false,

  init() {
    this.loadUsers();
  },

  async loadUsers() {
    this.isLoading = true;
    this.render();

    try {
      const token = HavalandAuth.serverToken || (HavalandAuth.currentSession ? HavalandAuth.currentSession.token : null);
      if (token) {
        const res = await fetch("/api/users", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const result = await res.json();
          if (result.success && Array.isArray(result.data) && result.data.length > 0) {
            this.users = result.data;
            this.isLoading = false;
            this.render();
            return;
          }
        }
      }
    } catch (e) {
      console.warn("Gagal memuat akun dari server API, menggunakan data lokal:", e.message);
    }

    // Fallback: Local storage custom users + default admin
    const local = localStorage.getItem("havaland_custom_users");
    let customUsers = [];
    if (local) {
      try { customUsers = JSON.parse(local); } catch (e) {}
    }

    const defaultAdmin = {
      id: "USR-ADMIN-01",
      username: "admin",
      nama: "Admin RT 04 Havaland",
      role: "Administrator RT",
      blok: "Kantor RT",
      is_admin: true,
      created_at: "2026-09-01T00:00:00Z"
    };

    // Ensure admin is always present and first
    this.users = [defaultAdmin, ...customUsers.filter(u => u.username !== "admin")];
    this.isLoading = false;
    this.render();
  },

  openModal() {
    if (!HavalandAuth.isAdmin()) {
      HavalandUtils.showToast("Akses Ditolak", "Hanya Administrator RT yang dapat mengelola akun warga.", "danger");
      return;
    }
    this.loadUsers();
    HavalandApp.openModal("modal-kelola-akun");
  },

  openTambahModal() {
    this.populateWargaDropdown();
    const form = document.getElementById("form-tambah-akun");
    if (form) form.reset();
    const err = document.getElementById("tambah-akun-error-msg");
    if (err) err.style.display = "none";
    HavalandApp.openModal("modal-tambah-akun");
  },

  populateWargaDropdown() {
    const sel = document.getElementById("akun-select-warga");
    if (!sel) return;

    let optionsHtml = '<option value="">-- Pilih Warga dari Direktori (Otomatis Isi) --</option>';
    if (HavalandData && HavalandData.warga) {
      HavalandData.warga.forEach(w => {
        optionsHtml += `<option value="${w.id}" data-nama="${HavalandUtils.escapeHtml(w.nama_kk)}" data-blok="${HavalandUtils.escapeHtml(w.blok)}">${HavalandUtils.escapeHtml(w.nama_kk)} (Blok ${HavalandUtils.escapeHtml(w.blok)})</option>`;
      });
    }
    optionsHtml += '<option value="manual">+ Input Manual (Warga Lain / Baru)</option>';
    sel.innerHTML = optionsHtml;
  },

  onWargaSelected() {
    const sel = document.getElementById("akun-select-warga");
    const namaInput = document.getElementById("akun-nama");
    const blokInput = document.getElementById("akun-blok");
    const userInput = document.getElementById("akun-username");
    if (!sel) return;

    const opt = sel.options[sel.selectedIndex];
    if (!opt || !opt.value) return;

    if (opt.value === "manual") {
      if (namaInput) { namaInput.value = ""; namaInput.focus(); }
      if (blokInput) blokInput.value = "";
      if (userInput) userInput.value = "";
      return;
    }

    const nama = opt.dataset.nama || "";
    const blok = opt.dataset.blok || "";

    if (namaInput) namaInput.value = nama;
    if (blokInput) blokInput.value = blok;

    if (userInput && nama) {
      // Suggest clean username from name & blok
      let clean = nama.toLowerCase().replace(/^(bu|pak|bapak|ibu|mbak|mas)\s+/i, "").trim();
      clean = clean.replace(/[^a-z0-9]/g, "");
      const blokClean = blok.toLowerCase().replace(/[^a-z0-9]/g, "");
      userInput.value = `${clean}_${blokClean}`.slice(0, 25);
    }
  },

  async handleFormSubmit(event) {
    event.preventDefault();
    const nama = document.getElementById("akun-nama").value.trim();
    const blok = document.getElementById("akun-blok").value.trim() || "-";
    const username = document.getElementById("akun-username").value.trim().toLowerCase();
    const password = document.getElementById("akun-password").value;
    const role = document.getElementById("akun-role").value;
    const errEl = document.getElementById("tambah-akun-error-msg");
    const submitBtn = event.target.querySelector('button[type="submit"]');

    if (!username || !password || !nama) {
      if (errEl) { errEl.textContent = "Semua bidang wajib diisi."; errEl.style.display = "block"; }
      return;
    }

    if (password.length < 6) {
      if (errEl) { errEl.textContent = "Kata sandi minimal 6 karakter."; errEl.style.display = "block"; }
      return;
    }

    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Menyimpan..."; }

    let createdOnServer = false;
    try {
      const token = HavalandAuth.serverToken || (HavalandAuth.currentSession ? HavalandAuth.currentSession.token : null);
      if (token) {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ username, password, nama, role, blok })
        });
        const result = await res.json();
        if (!result.success) {
          throw new Error(result.error || result.message || "Gagal membuat akun di server.");
        }
        createdOnServer = true;
      }
    } catch (e) {
      console.warn("API server call:", e.message);
      // If error is 409 Conflict (username already used), show it
      if (e.message && e.message.toLowerCase().includes("sudah digunakan")) {
        if (errEl) { errEl.textContent = e.message; errEl.style.display = "block"; }
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Simpan Akun Baru"; }
        return;
      }
    }

    // Always mirror to local storage for instant offline functionality
    const local = localStorage.getItem("havaland_custom_users");
    let customUsers = [];
    if (local) {
      try { customUsers = JSON.parse(local); } catch (err) {}
    }

    if (username === "admin" || customUsers.some(u => u.username === username)) {
      if (!createdOnServer) {
        if (errEl) { errEl.textContent = `Username "${username}" sudah digunakan.`; errEl.style.display = "block"; }
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Simpan Akun Baru"; }
        return;
      }
    }

    const newUser = {
      id: `USR-${Date.now()}`,
      username: username,
      password: password,
      nama: nama,
      role: role,
      blok: blok,
      is_admin: (role === "Administrator RT" || role === "Admin RT"),
      created_at: new Date().toISOString()
    };

    customUsers.push(newUser);
    localStorage.setItem("havaland_custom_users", JSON.stringify(customUsers));

    HavalandUtils.showToast("Akun Berhasil Dibuat", `Akun warga "${nama}" (${role}) berhasil didaftarkan dan siap login!`, "success");
    HavalandApp.closeModal("modal-tambah-akun");
    this.loadUsers();
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Simpan Akun Baru"; }
  },

  async deleteUser(userId, username) {
    if (username === "admin") {
      HavalandUtils.showToast("Proteksi Keamanan", "Akun admin utama tidak boleh dihapus demi keamanan sistem.", "danger");
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus akun "${username}"? Akses login warga ini akan dicabut.`)) {
      return;
    }

    try {
      const token = HavalandAuth.serverToken || (HavalandAuth.currentSession ? HavalandAuth.currentSession.token : null);
      if (token) {
        await fetch("/api/users", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ id: userId, username })
        });
      }
    } catch (e) {
      console.warn("API delete error:", e.message);
    }

    // Remove from local storage
    const local = localStorage.getItem("havaland_custom_users");
    if (local) {
      try {
        let customUsers = JSON.parse(local);
        customUsers = customUsers.filter(u => u.id !== userId && u.username !== username);
        localStorage.setItem("havaland_custom_users", JSON.stringify(customUsers));
      } catch (err) {}
    }

    HavalandUtils.showToast("Akun Dihapus", `Akun "${username}" telah berhasil dihapus dari sistem.`, "info");
    this.loadUsers();
  },

  render() {
    const container = document.getElementById("daftar-pengguna-container");
    if (!container) return;

    if (this.isLoading) {
      container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);">Memuat daftar akun warga...</div>';
      return;
    }

    if (!this.users || this.users.length === 0) {
      container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);">Belum ada akun terdaftar.</div>';
      return;
    }

    let html = `<div style="display: flex; flex-direction: column; gap: 0.75rem;">`;

    this.users.forEach(u => {
      const isPrimaryAdmin = (u.username === "admin");
      let roleBadgeClass = "badge-secondary";
      let roleIcon = "👤";
      if (u.role === "Administrator RT" || u.role === "Admin RT") {
        roleBadgeClass = "badge-danger";
        roleIcon = "👑";
      } else if (u.role === "Bendahara RT") {
        roleBadgeClass = "badge-warning";
        roleIcon = "💰";
      } else if (u.role === "Pengurus RT") {
        roleBadgeClass = "badge-info";
        roleIcon = "📋";
      } else if (u.role === "Warga Tetap") {
        roleBadgeClass = "badge-success";
        roleIcon = "👤";
      }

      html += `
        <div class="card" style="padding: 0.85rem 1rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; border: 1px solid var(--surface-border); border-radius: var(--radius-md);">
          <div style="display: flex; align-items: center; gap: 0.85rem; min-width: 0;">
            <div style="width: 40px; height: 40px; border-radius: 50%; background: ${isPrimaryAdmin ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-subtle)'}; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0;">
              ${roleIcon}
            </div>
            <div style="min-width: 0;">
              <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <span style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary);">${HavalandUtils.escapeHtml(u.nama)}</span>
                <span class="badge ${roleBadgeClass}" style="font-size: 0.7rem;">${HavalandUtils.escapeHtml(u.role)}</span>
                ${isPrimaryAdmin ? '<span class="badge badge-primary" style="font-size: 0.65rem;">Utama</span>' : ''}
              </div>
              <div style="font-size: 0.78rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.6rem; margin-top: 0.2rem; flex-wrap: wrap;">
                <span>Username: <code style="font-size: 0.75rem; background: var(--surface); padding: 1px 4px; border-radius: 3px;">${HavalandUtils.escapeHtml(u.username)}</code></span>
                <span>•</span>
                <span>Blok: <strong>${HavalandUtils.escapeHtml(u.blok || '-')}</strong></span>
              </div>
            </div>
          </div>
          <div>
            ${isPrimaryAdmin ? `
              <span class="badge" style="background: rgba(16, 185, 129, 0.1); color: var(--primary); font-size: 0.72rem; padding: 0.35rem 0.65rem; border-radius: var(--radius-full); font-weight: 600;">
                Dilindungi
              </span>
            ` : `
              <button type="button" class="btn btn-outline-danger btn-sm" style="font-size: 0.72rem; padding: 0.3rem 0.6rem; display: inline-flex; align-items: center; gap: 0.3rem;" onclick="HavalandUserManagement.deleteUser('${u.id}', '${HavalandUtils.escapeHtml(u.username)}')">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                Hapus
              </button>
            `}
          </div>
        </div>
      `;
    });

    html += `</div>`;
    container.innerHTML = html;
  }
};

// =============================================================================
// MODUL 7: GOOGLE MAPS PHOTO SLIDER & CAROUSEL BERANDA (DENGAN CRUD ADMIN)
// =============================================================================
const HavalandSlider = {
  slides: [],
  currentIndex: 0,
  autoplayInterval: null,
  autoplayDuration: 5000,
  isPaused: false,
  activeSourceTab: "gmap",
  selectedLibraryIndex: -1,
  lightboxCurrentIndex: 0,
  touchStartX: 0,
  touchEndX: 0,

  init() {
    this.loadSlides();
    this.render();
    this.setupEvents();
    this.startAutoPlay();
    this.updateAdminUI();
  },

  loadSlides() {
    const OLD_MAPS = "https://maps.app.goo.gl/Ujdz5idEU8PSaUEq6";
    const NEW_MAPS = "https://maps.app.goo.gl/9G6s1233qLd68a8A7";
    const defaults = (typeof HavalandData !== "undefined" && HavalandData.defaultSlides)
      ? JSON.parse(JSON.stringify(HavalandData.defaultSlides))
      : [];

    let saved = [];
    try {
      const raw = localStorage.getItem("havaland_slides_v2");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Migrasi cache lama: ganti link Maps lama ke link baru
          saved = parsed.map(s => ({
            ...s,
            mapsUrl: s.mapsUrl === OLD_MAPS ? NEW_MAPS : (s.mapsUrl || NEW_MAPS),
            takenAt: s.takenAt || null
          }));
        }
      }
    } catch (e) {
      console.warn("Gagal membaca slide tersimpan:", e);
    }

    // Gabungkan: slide simpanan warga dipertahankan urutannya, sedangkan foto
    // bawaan Google Maps yang belum ada (mis. foto 7–20) ditambahkan di
    // belakang tanpa duplikat (cocokkan ID dulu, lalu URL).
    // Foto yang pernah DIHAPUS admin (daftar havaland_slides_deleted_ids)
    // TIDAK dimunculkan lagi — ini yang dulu bikin "hapus lalu muncul lagi".
    const deletedIds = this.loadDeletedIds();
    const seenIds = new Set(saved.map(s => s.id));
    const seenUrls = new Set(saved.map(s => s.url));
    // Inferensi maksud hapus PRA-UPDATE: ID lama 1..6 yang hilang dari simpanan
    // (padahal simpanan ada isinya) dianggap pernah dihapus admin — catat agar
    // tidak bangkit lagi. Pengguna baru (tanpa simpanan) tidak terpengaruh.
    if (saved.length > 0) {
      ["slide-gmap-1", "slide-gmap-2", "slide-gmap-3", "slide-gmap-4", "slide-gmap-5", "slide-gmap-6"].forEach(id => {
        if (seenIds.has(id) || deletedIds.has(id)) return;
        const def = defaults.find(d => d.id === id);
        if (!def || seenUrls.has(def.url)) return;
        deletedIds.add(id);
        this.markSlideDeleted(id);
      });
    }
    const missing = defaults.filter(d => !deletedIds.has(d.id) && !seenIds.has(d.id) && !seenUrls.has(d.url));
    this.slides = HavalandUtils.dedupeById([...saved, ...missing]).filter(s => !deletedIds.has(s.id));
    if (this.slides.length === 0) {
      // Fallback default foto Google Maps
      this.slides = defaults.filter(d => !deletedIds.has(d.id));
    } else if (missing.length > 0) {
      this.saveSlides();
    }
  },

  loadDeletedIds() {
    try {
      const raw = localStorage.getItem("havaland_slides_deleted_ids");
      const parsed = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch (e) {
      return new Set();
    }
  },

  markSlideDeleted(slideId) {
    try {
      const ids = Array.from(this.loadDeletedIds());
      if (!ids.includes(slideId)) ids.push(slideId);
      localStorage.setItem("havaland_slides_deleted_ids", JSON.stringify(ids));
    } catch (e) {
      console.warn("Gagal mencatat slide terhapus:", e);
    }
  },

  clearDeletedIds() {
    try {
      localStorage.removeItem("havaland_slides_deleted_ids");
    } catch (e) {
      console.warn("Gagal membersihkan daftar slide terhapus:", e);
    }
  },

  saveSlides() {
    let ok = true;
    try {
      localStorage.setItem("havaland_slides_v2", JSON.stringify(this.slides));
    } catch (e) {
      console.warn("Gagal menyimpan slide ke localStorage:", e);
      ok = false;
    }
    // Beritahu mesin sinkron cloud (diabaikan bila DB belum aktif / offline)
    try {
      if (typeof HavalandSync !== "undefined") HavalandSync.markDirty("slides");
    } catch (_) { /* abaikan */ }
    return ok;
  },

  render() {
    if (this.slides.length === 0) {
      this.slides = JSON.parse(JSON.stringify(HavalandData.defaultSlides || []));
    }

    if (this.currentIndex >= this.slides.length) {
      this.currentIndex = 0;
    }

    // Sinkronkan hero beranda + panel Pengaturan (tetap jalan walau
    // section slider galeri sudah dihapus dari beranda)
    if (typeof HavalandHero !== "undefined" && HavalandHero.syncFromSlider) {
      HavalandHero.syncFromSlider(this.slides);
    }
    if (typeof HavalandSettings !== "undefined" && HavalandSettings.renderSlideSection) {
      HavalandSettings.renderSlideSection();
    }

    // Section slider galeri opsional: lewati render track bila sudah dihapus
    const track = document.getElementById("slider-track");
    const dotsContainer = document.getElementById("slider-dots");
    const counter = document.getElementById("slider-counter");
    const countBadge = document.getElementById("slider-count-badge");
    if (!track) {
      if (countBadge) countBadge.textContent = this.slides.length;
      return;
    }

    const isAdmin = typeof HavalandAuth !== "undefined" && HavalandAuth.isAdmin();

    // 1. Render Slides ke Track Carousel
    track.innerHTML = this.slides.map((s, idx) => `
      <div class="slider-slide" data-slide-index="${idx}" onclick="HavalandSlider.openLightbox(${idx})" title="Klik untuk memperbesar foto ${HavalandUtils.escapeHtml(s.title)}">
        <img src="${s.url}" alt="${HavalandUtils.escapeHtml(s.title)}" class="slide-bg-img" loading="lazy" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200'">
        <div class="slide-gradient-overlay"></div>
        <div class="slide-content-overlay">
          <div class="slide-badge-row">
            <span class="slide-badge">${HavalandUtils.escapeHtml(s.badge || 'Havaland 📍')}</span>
            <span class="slide-source-tag">
              <svg class="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
              <span>${HavalandUtils.escapeHtml(s.source || 'Google Maps')}</span>
            </span>
            ${isAdmin ? `
              <button type="button" class="btn btn-xs btn-outline-danger" style="padding: 2px 7px; font-size: 0.68rem; z-index: 5;" onclick="event.stopPropagation(); HavalandSlider.deleteSlide('${s.id}')">
                🗑️ Hapus
              </button>
            ` : ''}
          </div>
          <h3 class="slide-title">${HavalandUtils.escapeHtml(s.title)}</h3>
          <p class="slide-desc">${HavalandUtils.escapeHtml(s.desc)}</p>
        </div>
      </div>
    `).join("");

    // 2. Render Indicator Dots
    if (dotsContainer) {
      dotsContainer.innerHTML = this.slides.map((_, idx) => `
        <button type="button" class="slider-dot ${idx === this.currentIndex ? 'active' : ''}" onclick="HavalandSlider.goTo(${idx})" aria-label="Lompat ke slide ${idx + 1}" title="Slide ${idx + 1}"></button>
      `).join("");
    }

    // 3. Update Text Counter & Badges
    if (counter) {
      counter.textContent = `${this.currentIndex + 1} / ${this.slides.length}`;
    }
    if (countBadge) {
      countBadge.textContent = this.slides.length;
    }

    // 4. Update Posisi Transform
    this.goTo(this.currentIndex, false);
  },

  goTo(index, smooth = true) {
    if (this.slides.length === 0) return;
    if (index < 0) index = this.slides.length - 1;
    if (index >= this.slides.length) index = 0;

    this.currentIndex = index;
    const track = document.getElementById("slider-track");
    if (track) {
      track.style.transition = smooth ? "transform 0.5s cubic-bezier(0.2, 1, 0.3, 1)" : "none";
      track.style.transform = `translateX(-${this.currentIndex * 100}%)`;
    }

    // Update active dot
    const dots = document.querySelectorAll(".slider-dot");
    dots.forEach((dot, idx) => {
      dot.classList.toggle("active", idx === this.currentIndex);
    });

    // Update Counter
    const counter = document.getElementById("slider-counter");
    if (counter) {
      counter.textContent = `${this.currentIndex + 1} / ${this.slides.length}`;
    }
  },

  next() {
    this.goTo(this.currentIndex + 1);
    this.restartAutoPlay();
  },

  prev() {
    this.goTo(this.currentIndex - 1);
    this.restartAutoPlay();
  },

  startAutoPlay() {
    this.stopAutoPlay();
    if (this.isPaused) return;
    this.autoplayInterval = setInterval(() => {
      this.goTo(this.currentIndex + 1);
    }, this.autoplayDuration);
    this.updateAutoPlayIcon(true);
  },

  stopAutoPlay() {
    if (this.autoplayInterval) {
      clearInterval(this.autoplayInterval);
      this.autoplayInterval = null;
    }
  },

  restartAutoPlay() {
    if (!this.isPaused) {
      this.startAutoPlay();
    }
  },

  toggleAutoPlay() {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.stopAutoPlay();
      this.updateAutoPlayIcon(false);
      HavalandUtils.showToast("Slider Dijeda", "Pemutaran otomatis slide beranda dihentikan sementara.", "info");
    } else {
      this.startAutoPlay();
      this.updateAutoPlayIcon(true);
      HavalandUtils.showToast("Slider Diputar", "Pemutaran otomatis slide beranda diaktifkan kembali.", "success");
    }
  },

  updateAutoPlayIcon(isPlaying) {
    const icon = document.getElementById("slider-autoplay-icon");
    if (!icon) return;
    if (isPlaying) {
      icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"/>`;
    } else {
      icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>`;
    }
  },

  handleMouseEnter() {
    this.stopAutoPlay();
  },

  handleMouseLeave() {
    if (!this.isPaused) {
      this.startAutoPlay();
    }
  },

  setupEvents() {
    const box = document.getElementById("havaland-slider-box");
    if (box) {
      box.addEventListener("touchstart", (e) => {
        this.touchStartX = e.changedTouches[0].screenX;
        this.stopAutoPlay();
      }, { passive: true });

      box.addEventListener("touchend", (e) => {
        this.touchEndX = e.changedTouches[0].screenX;
        const diff = this.touchStartX - this.touchEndX;
        if (Math.abs(diff) > 40) {
          if (diff > 0) this.next();
          else this.prev();
        }
        if (!this.isPaused) this.startAutoPlay();
      }, { passive: true });
    }

    // Keyboard navigation when user is on beranda
    document.addEventListener("keydown", (e) => {
      const lightbox = document.getElementById("modal-lightbox-slide");
      if (lightbox && lightbox.classList.contains("active")) {
        if (e.key === "ArrowLeft") this.lightboxPrev();
        else if (e.key === "ArrowRight") this.lightboxNext();
        else if (e.key === "Escape") this.closeLightbox();
        return;
      }

      if (HavalandApp.activeTab === "beranda") {
        if (e.key === "ArrowLeft") this.prev();
        else if (e.key === "ArrowRight") this.next();
      }
    });
  },

  updateAdminUI() {
    const adminBox = document.getElementById("slider-admin-actions");
    const countBadge = document.getElementById("slider-count-badge");
    const isAdmin = typeof HavalandAuth !== "undefined" && HavalandAuth.isAdmin();

    if (adminBox) {
      adminBox.style.display = isAdmin ? "inline-flex" : "none";
    }
    if (countBadge) {
      countBadge.textContent = this.slides.length;
    }
  },

  // -------------------------------------------------------------
  // ADMIN ACTIONS: TAMBAH SLIDE
  // -------------------------------------------------------------
  openAddModal(tabKey = "gmap") {
    if (typeof HavalandAuth !== "undefined" && !HavalandAuth.isAdmin()) {
      HavalandUtils.showToast("Akses Ditolak", "Hanya Administrator RT yang dapat menambahkan gambar slide.", "warning");
      return;
    }

    const allowedTabs = ["gmap", "url", "drive", "upload"];
    const startTab = allowedTabs.includes(tabKey) ? tabKey : "gmap";

    const form = document.getElementById("form-tambah-slide");
    if (form) form.reset();

    // Reset state pilihan sebelumnya agar tidak tercampur antar sumber
    this.selectedLibraryIndex = -1;
    this.pendingUploads = [];
    this.renderPendingUploads();
    const hiddenUrl = document.getElementById("slide-selected-image-url");
    if (hiddenUrl) hiddenUrl.value = "";
    const driveInput = document.getElementById("slide-input-drive");
    if (driveInput) driveInput.value = "";
    const drivePreview = document.getElementById("drive-preview-img");
    if (drivePreview) drivePreview.style.display = "none";
    const driveStatus = document.getElementById("drive-convert-status");
    if (driveStatus) {
      driveStatus.className = "";
      driveStatus.textContent = "Tempel link berbagi Google Drive, sistem mengubahnya menjadi gambar slide otomatis.";
    }

    this.switchSourceTab(startTab);
    if (startTab === "gmap") {
      this.renderGmapLibrary();
      // Default select photo index 0
      this.selectLibraryPhoto(0);
    } else {
      this.renderGmapLibrary();
    }
    // Batasi tanggal ambil maksimal hari ini
    const takenDateMax = document.getElementById("slide-add-takendate");
    if (takenDateMax) takenDateMax.max = new Date().toISOString().split("T")[0];
    this.updateLivePreview();

    HavalandApp.openModal("modal-tambah-slide");
  },

  switchSourceTab(tabKey) {
    this.activeSourceTab = tabKey;
    document.querySelectorAll(".slide-tab-btn").forEach(btn => btn.classList.remove("active"));
    document.querySelectorAll(".slide-source-panel").forEach(p => p.classList.remove("active"));

    const btn = document.getElementById(`tab-src-${tabKey}`);
    const panel = document.getElementById(`panel-src-${tabKey}`);
    if (btn) btn.classList.add("active");
    if (panel) panel.classList.add("active");

    const srcInput = document.getElementById("slide-selected-source");
    if (srcInput) {
      const labels = { gmap: "Google Maps Resmi", upload: "Upload Admin", drive: "Google Drive" };
      srcInput.value = labels[tabKey] || "Link Online";
    }
  },

  renderGmapLibrary() {
    const grid = document.getElementById("gmap-library-grid");
    if (!grid || typeof HavalandData === "undefined" || !HavalandData.googleMapsPhotos) return;

    grid.innerHTML = HavalandData.googleMapsPhotos.map((p, idx) => `
      <div class="gmap-library-card ${idx === this.selectedLibraryIndex ? 'selected' : ''}" onclick="HavalandSlider.selectLibraryPhoto(${idx})">
        <img src="${p.url}=w300-h200-k-no" alt="${HavalandUtils.escapeHtml(p.title)}" loading="lazy">
        <div class="gmap-card-check">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
        </div>
        <div class="gmap-card-badge">${HavalandUtils.escapeHtml(p.badge || `Foto #${idx+1}`)}</div>
      </div>
    `).join("");
  },

  selectLibraryPhoto(index) {
    if (!HavalandData.googleMapsPhotos || !HavalandData.googleMapsPhotos[index]) return;
    this.selectedLibraryIndex = index;
    const photo = HavalandData.googleMapsPhotos[index];

    // Update active UI cards
    const cards = document.querySelectorAll(".gmap-library-card");
    cards.forEach((c, i) => c.classList.toggle("selected", i === index));

    // Set hidden image URL (high resolution)
    const hiddenUrl = document.getElementById("slide-selected-image-url");
    const hiddenSrc = document.getElementById("slide-selected-source");
    if (hiddenUrl) hiddenUrl.value = photo.url + "=w1200-h675-k-no";
    if (hiddenSrc) hiddenSrc.value = "Google Maps Resmi";

    // Auto fill title & desc if empty or matching previous gmap selections
    const titleInput = document.getElementById("slide-add-title");
    const descInput = document.getElementById("slide-add-desc");
    const badgeSelect = document.getElementById("slide-add-badge");

    if (titleInput && (!titleInput.value || titleInput.value.length < 50)) {
      titleInput.value = photo.title;
    }
    if (descInput && (!descInput.value || descInput.value.length < 80)) {
      descInput.value = photo.desc;
    }
    if (badgeSelect && photo.badge) {
      badgeSelect.value = "Google Maps Resmi 📍";
    }
    // Foto pustaka Maps belum memiliki tanggal ambil — admin bisa isi manual
    const takenDateInput = document.getElementById("slide-add-takendate");
    if (takenDateInput) takenDateInput.value = "";

    this.updateLivePreview();
  },

  handleUrlInput() {
    const input = document.getElementById("slide-input-url");
    const hiddenUrl = document.getElementById("slide-selected-image-url");
    const hiddenSrc = document.getElementById("slide-selected-source");
    if (!input || !input.value.trim()) return;

    const url = input.value.trim();

    // Link Google Drive yang ditempel di kolom URL umum ikut dikonversi otomatis
    if (this.parseDriveFileId(url)) {
      const driveInput = document.getElementById("slide-input-drive");
      if (driveInput) driveInput.value = url;
      this.switchSourceTab("drive");
      this.handleDriveInput();
      return;
    }

    if (hiddenUrl) hiddenUrl.value = url;
    if (hiddenSrc) hiddenSrc.value = "Link Online";
    this.updateLivePreview();
  },

  // -------------------------------------------------------------
  // GOOGLE DRIVE: ubah link berbagi menjadi URL gambar langsung.
  // Format didukung: /file/d/ID, ?id=ID, /uc?id=ID, thumbnail?id=ID.
  // Syarat: file di Drive dibagikan "Siapa saja yang memiliki link".
  // -------------------------------------------------------------
  parseDriveFileId(url) {
    if (!url || typeof url !== "string") return null;
    const text = url.trim();
    let m = text.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/);
    if (m) return m[1];
    m = text.match(/[?&]id=([A-Za-z0-9_-]+)/);
    if (m && text.includes("drive.google.com")) return m[1];
    m = text.match(/lh3\.googleusercontent\.com\/d\/([A-Za-z0-9_-]+)/);
    if (m) return m[1];
    return null;
  },

  toDriveDirectUrl(fileId, width = 1200) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${width}`;
  },

  handleDriveInput() {
    const input = document.getElementById("slide-input-drive");
    const hiddenUrl = document.getElementById("slide-selected-image-url");
    const hiddenSrc = document.getElementById("slide-selected-source");
    const status = document.getElementById("drive-convert-status");
    const preview = document.getElementById("drive-preview-img");
    if (!input || !input.value.trim()) return;

    const raw = input.value.trim();
    const fileId = this.parseDriveFileId(raw);

    const setStatus = (msg, cls) => {
      if (!status) return;
      status.textContent = msg;
      status.className = cls || "";
    };

    if (!fileId) {
      setStatus("Link tidak dikenali. Gunakan link berbagi file Google Drive (contoh: drive.google.com/file/d/.../view).", "drive-err");
      HavalandUtils.showToast("Link Drive Tidak Valid", "Salin link via Bagikan → Salin link pada file foto di Drive.", "warning");
      return;
    }

    const directUrl = this.toDriveDirectUrl(fileId, 1200);
    if (hiddenUrl) hiddenUrl.value = directUrl;
    if (hiddenSrc) hiddenSrc.value = "Google Drive";

    setStatus("Link valid ✓ — memeriksa akses berbagi file...", "");
    if (preview) {
      preview.style.display = "none";
      preview.src = directUrl;
      preview.onload = () => {
        preview.style.display = "block";
        setStatus("Gambar Drive termuat ✓ — pastikan mode berbagi tetap “Siapa saja yang memiliki link”.", "drive-ok");
      };
      preview.onerror = () => {
        preview.style.display = "none";
        setStatus("Gambar belum bisa dibuka — ubah berbagi file ke “Siapa saja yang memiliki link” (Viewer), lalu Terapkan ulang.", "drive-err");
      };
    }

    this.updateLivePreview();
  },

  // Daftar file lokal yang antre ditambahkan (mendukung pilih banyak foto)
  pendingUploads: [],

  handleFileUpload(event) {
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (files.length === 0) return;

    const images = files.filter(f => f.type.startsWith("image/"));
    if (images.length === 0) {
      HavalandUtils.showToast("File Tidak Valid", "Harap pilih file berformat gambar (JPG, PNG, atau WebP).", "warning");
      return;
    }
    if (images.length < files.length) {
      HavalandUtils.showToast("Sebagian Dilewati", `${files.length - images.length} file bukan gambar sehingga dilewati.`, "info");
    }

    const MAX_FILES = 5;
    const room = MAX_FILES - this.pendingUploads.length;
    if (room <= 0) {
      HavalandUtils.showToast("Batas Tercapai", `Maksimal ${MAX_FILES} foto per sekali tambah. Simpan dulu, lalu tambah lagi.`, "warning");
      return;
    }
    const batch = images.slice(0, room);

    let done = 0;
    batch.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Compress & scale to max 1280px to save storage
          const canvas = document.createElement("canvas");
          const maxW = 1280;
          const maxH = 720;
          let w = img.width;
          let h = img.height;
          if (w > maxW || h > maxH) {
            const ratio = Math.min(maxW / w, maxH / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.82);

          this.pendingUploads.push({ name: file.name, size: file.size, dataUrl });
          done += 1;

          if (done === batch.length) {
            const hiddenUrl = document.getElementById("slide-selected-image-url");
            const hiddenSrc = document.getElementById("slide-selected-source");
            if (hiddenUrl && this.pendingUploads.length > 0) hiddenUrl.value = this.pendingUploads[0].dataUrl;
            if (hiddenSrc) hiddenSrc.value = "Upload Admin";
            this.renderPendingUploads();
            this.updateLivePreview();
            HavalandUtils.showToast(
              "Foto Dimuat",
              `${this.pendingUploads.length} foto dari perangkat siap ditambahkan saat Simpan.`,
              "success"
            );
          }
        };
        img.onerror = () => {
          done += 1;
          HavalandUtils.showToast("Gagal Dibaca", `File "${file.name}" rusak dan dilewati.`, "warning");
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });

    // Reset input agar file yang sama bisa dipilih ulang bila perlu
    event.target.value = "";
  },

  removePendingUpload(index) {
    if (index < 0 || index >= this.pendingUploads.length) return;
    this.pendingUploads.splice(index, 1);
    const hiddenUrl = document.getElementById("slide-selected-image-url");
    if (hiddenUrl) hiddenUrl.value = this.pendingUploads.length > 0 ? this.pendingUploads[0].dataUrl : "";
    this.renderPendingUploads();
    this.updateLivePreview();
  },

  renderPendingUploads() {
    const list = document.getElementById("upload-pending-list");
    if (!list) return;
    if (!this.pendingUploads || this.pendingUploads.length === 0) {
      list.innerHTML = "";
      return;
    }
    const fmtKB = (b) => b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
    list.innerHTML = this.pendingUploads.map((p, idx) => `
      <div class="upload-pending-item">
        <img src="${p.dataUrl}" alt="" class="upload-pending-thumb">
        <div class="upload-pending-info">
          <div class="upload-pending-name">${HavalandUtils.escapeHtml(p.name)}</div>
          <div class="upload-pending-size">Foto ${idx + 1} • asli ${fmtKB(p.size)} • dioptimalkan otomatis</div>
        </div>
        <button type="button" class="upload-pending-remove" onclick="HavalandSlider.removePendingUpload(${idx})" title="Batalkan foto ini">Hapus</button>
      </div>
    `).join("");
  },

  updateLivePreview() {
    const titleVal = document.getElementById("slide-add-title")?.value || "Judul Foto Slide";
    const descVal = document.getElementById("slide-add-desc")?.value || "Keterangan foto akan muncul di sini...";
    const badgeVal = document.getElementById("slide-add-badge")?.value || "Dokumentasi Warga 📸";
    const imgUrl = document.getElementById("slide-selected-image-url")?.value || "";

    const previewTitle = document.getElementById("slide-preview-title");
    const previewDesc = document.getElementById("slide-preview-desc");
    const previewBadge = document.getElementById("slide-preview-badge");
    const previewBg = document.getElementById("slide-preview-img-bg");

    if (previewTitle) previewTitle.textContent = titleVal;
    if (previewDesc) previewDesc.textContent = descVal;
    if (previewBadge) previewBadge.textContent = badgeVal;
    if (previewBg && imgUrl) {
      previewBg.style.backgroundImage = `url('${imgUrl}')`;
    }
  },

  handleFormAddSlide(event) {
    event.preventDefault();
    if (typeof HavalandAuth !== "undefined" && !HavalandAuth.isAdmin()) {
      HavalandUtils.showToast("Akses Ditolak", "Hanya Administrator RT yang dapat menambahkan gambar slide.", "warning");
      return;
    }

    const titleVal = document.getElementById("slide-add-title")?.value.trim();
    const descVal = document.getElementById("slide-add-desc")?.value.trim();
    const badgeVal = document.getElementById("slide-add-badge")?.value.trim();
    const takenAtVal = document.getElementById("slide-add-takendate")?.value || null;
    const imgUrl = document.getElementById("slide-selected-image-url")?.value.trim();
    const sourceVal = document.getElementById("slide-selected-source")?.value.trim() || "Google Maps Resmi";

    if (!titleVal || !descVal || !imgUrl) {
      HavalandUtils.showToast("Data Belum Lengkap", "Pastikan Judul, Keterangan, dan Gambar foto telah dipilih.", "warning");
      return;
    }

    const newSlide = {
      id: "slide-custom-" + Date.now(),
      title: titleVal,
      desc: descVal,
      url: imgUrl,
      fullUrl: imgUrl,
      badge: badgeVal,
      source: sourceVal,
      takenAt: takenAtVal,
      mapsUrl: "https://maps.app.goo.gl/9G6s1233qLd68a8A7",
      addedBy: HavalandAuth.getCurrentUser()?.nama || "Admin RT",
      createdAt: new Date().toISOString().split("T")[0]
    };

    // Foto Google Drive: sediakan versi resolusi lebih besar untuk lightbox
    if (sourceVal === "Google Drive") {
      const fileId = this.parseDriveFileId(document.getElementById("slide-input-drive")?.value || "") || this.parseDriveFileId(imgUrl);
      if (fileId) {
        newSlide.url = this.toDriveDirectUrl(fileId, 1200);
        newSlide.fullUrl = this.toDriveDirectUrl(fileId, 1600);
      }
    }

    // Upload lokal multi-foto: tambahkan semua antrean sekaligus
    let addedSlides = [newSlide];
    if (this.activeSourceTab === "upload" && this.pendingUploads && this.pendingUploads.length > 1) {
      addedSlides = this.pendingUploads.map((p, i) => ({
        id: "slide-custom-" + Date.now() + "-" + i,
        title: i === 0 ? titleVal : `${titleVal} (${i + 1})`,
        desc: descVal,
        url: p.dataUrl,
        fullUrl: p.dataUrl,
        badge: badgeVal,
        source: "Upload Admin",
        takenAt: takenAtVal,
        mapsUrl: "https://maps.app.goo.gl/9G6s1233qLd68a8A7",
        addedBy: HavalandAuth.getCurrentUser()?.nama || "Admin RT",
        createdAt: new Date().toISOString().split("T")[0]
      }));
    }

    // Tambahkan slide ke urutan pertama (paling depan)
    this.slides.unshift(...addedSlides);
    if (!this.saveSlides()) {
      // Kapasitas peramban penuh (umumnya karena foto upload lokal) → kembalikan
      this.slides.splice(0, addedSlides.length);
      HavalandUtils.showToast(
        "Penyimpanan Penuh",
        "Foto gagal disimpan: kapasitas peramban penuh. Hapus slide lama atau pakai link Google Drive untuk foto besar.",
        "error"
      );
      return;
    }
    this.pendingUploads = [];
    this.renderPendingUploads();
    this.render();
    this.goTo(0, true);

    HavalandApp.closeModal("modal-tambah-slide");
    HavalandUtils.showToast(
      addedSlides.length > 1 ? "Slide Ditambahkan!" : "Slide Ditambahkan!",
      addedSlides.length > 1
        ? `${addedSlides.length} foto berhasil dipublikasikan di slide beranda.`
        : `Foto "${newSlide.title}" berhasil dipublikasikan di slide beranda.`,
      "success"
    );
  },

  // -------------------------------------------------------------
  // ADMIN ACTIONS: KELOLA SLIDES
  // -------------------------------------------------------------
  openManageModal() {
    if (typeof HavalandAuth !== "undefined" && !HavalandAuth.isAdmin()) {
      HavalandUtils.showToast("Akses Ditolak", "Hanya Administrator RT yang dapat mengelola slide.", "warning");
      return;
    }

    this.renderManageList();
    HavalandApp.openModal("modal-kelola-slides");
  },

  renderManageList() {
    const list = document.getElementById("manage-slides-list");
    const countLabel = document.getElementById("manage-slide-count");
    if (!list) return;

    if (countLabel) countLabel.textContent = this.slides.length;

    if (this.slides.length === 0) {
      list.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
          Belum ada foto slide. Silakan klik tombol Tambah Foto Baru di atas.
        </div>
      `;
      return;
    }

    list.innerHTML = this.slides.map((s, idx) => `
      <div class="manage-slide-item">
        <img src="${s.url}" alt="${HavalandUtils.escapeHtml(s.title)}" class="manage-slide-thumb" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=200'">
        <div class="manage-slide-info">
          <div style="display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.2rem;">
            <span class="badge" style="font-size: 0.65rem; background: rgba(16, 185, 129, 0.15); color: var(--primary);">#${idx + 1}</span>
            <span class="badge" style="font-size: 0.65rem; background: var(--surface-hover); color: var(--text-secondary);">${HavalandUtils.escapeHtml(s.badge || 'Foto')}</span>
            <span style="font-size: 0.68rem; color: var(--text-muted);">${HavalandUtils.escapeHtml(s.source || 'Google Maps')}</span>
          </div>
          <div class="manage-slide-title">${HavalandUtils.escapeHtml(s.title)}</div>
          <div class="manage-slide-desc">${HavalandUtils.escapeHtml(s.desc)}</div>
        </div>
        <div class="manage-slide-actions">
          <button type="button" class="manage-btn-icon" title="Geser ke Atas" onclick="HavalandSlider.moveSlide(${idx}, -1)" ${idx === 0 ? 'disabled style="opacity: 0.35; cursor: not-allowed;"' : ''}>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/></svg>
          </button>
          <button type="button" class="manage-btn-icon" title="Geser ke Bawah" onclick="HavalandSlider.moveSlide(${idx}, 1)" ${idx === this.slides.length - 1 ? 'disabled style="opacity: 0.35; cursor: not-allowed;"' : ''}>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          </button>
          <button type="button" class="manage-btn-icon btn-del" title="Hapus Slide Ini" onclick="HavalandSlider.deleteSlide('${s.id}')">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </div>
    `).join("");
  },

  moveSlide(index, direction) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= this.slides.length) return;

    const temp = this.slides[index];
    this.slides[index] = this.slides[targetIndex];
    this.slides[targetIndex] = temp;

    this.saveSlides();
    this.render();
    this.renderManageList();
  },

  deleteSlide(slideId) {
    if (typeof HavalandAuth !== "undefined" && !HavalandAuth.isAdmin()) {
      HavalandUtils.showToast("Akses Ditolak", "Hanya Administrator RT yang dapat menghapus slide.", "warning");
      return;
    }

    const slide = this.slides.find(s => s.id === slideId);
    const title = slide ? slide.title : "slide ini";

    if (confirm(`Apakah Anda yakin ingin menghapus "${title}" dari slide beranda?`)) {
      this.slides = this.slides.filter(s => s.id !== slideId);
      this.markSlideDeleted(slideId);
      this.saveSlides();
      this.render();
      this.renderManageList();
      HavalandUtils.showToast("Slide Dihapus", `Foto "${title}" telah dihapus dari slide beranda.`, "info");
    }
  },

  resetToDefault() {
    if (typeof HavalandAuth !== "undefined" && !HavalandAuth.isAdmin()) {
      HavalandUtils.showToast("Akses Ditolak", "Hanya Administrator RT yang dapat mengatur ulang slide.", "warning");
      return;
    }

    if (confirm("Kembalikan slide ke 20 foto awal Google Maps resmi Havaland Residence?")) {
      this.slides = JSON.parse(JSON.stringify(HavalandData.defaultSlides));
      this.clearDeletedIds();
      this.saveSlides();
      this.render();
      this.renderManageList();
      HavalandUtils.showToast("Slide Direset", "Slide beranda telah dikembalikan ke foto resmi Google Maps.", "success");
    }
  },

  // -------------------------------------------------------------
  // LIGHTBOX FULLSCREEN VIEW
  // -------------------------------------------------------------
  openLightbox(index) {
    if (index < 0 || index >= this.slides.length) return;
    this.lightboxCurrentIndex = index;
    const slide = this.slides[index];

    const modal = document.getElementById("modal-lightbox-slide");
    const img = document.getElementById("lightbox-image");
    const title = document.getElementById("lightbox-title");
    const desc = document.getElementById("lightbox-desc");
    const badge = document.getElementById("lightbox-badge");
    const dateEl = document.getElementById("lightbox-date");
    const counterEl = document.getElementById("lightbox-counter");
    const mapsLink = document.getElementById("lightbox-gmaps-link");

    if (!modal || !img) return;

    img.src = slide.fullUrl || slide.url;
    if (title) title.textContent = slide.title;
    if (desc) desc.textContent = slide.desc;
    if (badge) badge.textContent = slide.badge || "Google Maps 📍";
    if (dateEl) dateEl.textContent = this.formatTakenAt(slide.takenAt);
    if (counterEl) counterEl.textContent = `${index + 1} / ${this.slides.length}`;
    if (mapsLink) mapsLink.href = slide.mapsUrl || "https://maps.app.goo.gl/9G6s1233qLd68a8A7";

    modal.classList.add("active");
    document.body.style.overflow = "hidden";
    this.stopAutoPlay();
  },

  openLightboxCurrent() {
    this.openLightbox(this.currentIndex);
  },

  // Format tanggal pengambilan foto (YYYY-MM-DD) ke Bahasa Indonesia.
  // Tanggal asli foto Maps hanya tampil di halaman Google Maps dan tidak bisa
  // ditarik otomatis — slide tanpa tanggal menampilkan "belum tercatat".
  formatTakenAt(takenAt) {
    if (!takenAt) return "📅 Tanggal ambil: belum tercatat (lihat di Google Maps)";
    const d = new Date(takenAt + (takenAt.length === 10 ? "T00:00:00" : ""));
    if (isNaN(d.getTime())) return "📅 Tanggal ambil: " + takenAt;
    try {
      return "📅 Foto diambil: " + d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    } catch (e) {
      return "📅 Foto diambil: " + takenAt;
    }
  },

  closeLightbox() {
    const modal = document.getElementById("modal-lightbox-slide");
    if (modal) modal.classList.remove("active");
    document.body.style.overflow = "";
    if (!this.isPaused) this.startAutoPlay();
    // Lanjutkan kembali autoplay hero yang dijeda saat full-view dibuka
    if (typeof HavalandHero !== "undefined" && HavalandHero.startAutoPlay) {
      HavalandHero.startAutoPlay();
    }
  },

  closeLightboxOnBackdrop(event) {
    if (event.target.id === "modal-lightbox-slide") {
      this.closeLightbox();
    }
  },

  lightboxNext() {
    let nextIdx = this.lightboxCurrentIndex + 1;
    if (nextIdx >= this.slides.length) nextIdx = 0;
    this.openLightbox(nextIdx);
  },

  lightboxPrev() {
    let prevIdx = this.lightboxCurrentIndex - 1;
    if (prevIdx < 0) prevIdx = this.slides.length - 1;
    this.openLightbox(prevIdx);
  }
};

// =============================================================================
// MODUL 7A: SINKRONISASI CLOUD ANTAR-DEVICE (via POST/GET /api/sync)
// -----------------------------------------------------------------------------
// Cara kerja:
// - Saat halaman dibuka: tarik snapshot cloud (jika DB terkonfigurasi).
//   Koleksi cloud yang BERISI menimpa lokal; koleksi cloud yang KOSONG dibiarkan
//   (lalu lokal diunggah sebagai seed bila yang membuka adalah admin).
// - Setiap ada tambah/ubah/hapus: simpan lokal seperti biasa + otomatis unggah
//   koleksi tersebut (debounce 2 detik, hanya bila login sebagai admin).
// - Kebijakan konflik: last-write-wins per koleksi (wajar untuk skala RT).
// - Tanpa database / offline: semua no-op aman → murni localStorage.
// =============================================================================
const HavalandSync = {
  enabled: false,
  suspended: false,
  timers: {},
  badgeNotified: false,

  // Kunci storage lokal (tanpa prefix havaland_) -> nama koleksi cloud
  KEYMAP: {
    custom_transaksi_full: "transaksi",
    custom_kegiatan_v2: "kegiatan",
    custom_usulan_v2: "usulan",
    custom_aspirasi_v2: "aspirasi",
    custom_warga_v2: "warga",
    custom_kontak_v1: "kontak"
  },

  canPush() {
    return this.enabled &&
      typeof HavalandAuth !== "undefined" &&
      HavalandAuth.isAdmin() &&
      !!HavalandAuth.syncToken;
  },

  authHeaders() {
    return {
      "Content-Type": "application/json",
      "X-Sync-Token": HavalandAuth.syncToken
    };
  },

  collect(name) {
    try {
      switch (name) {
        case "transaksi": return Array.isArray(HavalandData.transaksi) ? HavalandData.transaksi : [];
        case "kegiatan": return Array.isArray(HavalandData.kegiatan) ? HavalandData.kegiatan : [];
        case "warga": return Array.isArray(HavalandData.warga) ? HavalandData.warga : [];
        case "aspirasi": return Array.isArray(HavalandData.aspirasi) ? HavalandData.aspirasi : [];
        case "usulan": return Array.isArray(HavalandData.usulanIde) ? HavalandData.usulanIde : [];
        case "kontak": return (HavalandData.profile && Array.isArray(HavalandData.profile.kontakDarurat))
          ? HavalandData.profile.kontakDarurat : [];
        case "slides":
          return (typeof HavalandSlider !== "undefined" && Array.isArray(HavalandSlider.slides))
            ? HavalandSlider.slides : [];
        default: return [];
      }
    } catch (e) {
      return [];
    }
  },

  saveLocal(name, items) {
    const clean = HavalandUtils.dedupeById(items);
    switch (name) {
      case "transaksi":
        HavalandData.transaksi = clean;
        HavalandUtils.saveStorage("custom_transaksi_full", clean);
        break;
      case "kegiatan":
        HavalandData.kegiatan = clean;
        HavalandUtils.saveStorage("custom_kegiatan_v2", clean);
        break;
      case "warga":
        HavalandData.warga = clean;
        HavalandUtils.saveStorage("custom_warga_v2", clean);
        break;
      case "aspirasi":
        HavalandData.aspirasi = clean;
        HavalandUtils.saveStorage("custom_aspirasi_v2", clean);
        break;
      case "usulan":
        HavalandData.usulanIde = clean;
        HavalandUtils.saveStorage("custom_usulan_v2", clean);
        break;
      case "kontak":
        HavalandData.profile.kontakDarurat = clean;
        HavalandUtils.saveStorage("custom_kontak_v1", clean);
        break;
      case "slides":
        if (typeof HavalandSlider !== "undefined") {
          HavalandSlider.slides = clean;
          HavalandSlider.saveSlides();
        }
        break;
      default: break;
    }
  },

  rerender(name) {
    try {
      switch (name) {
        case "transaksi":
          HavalandApp.recalculateSummary();
          HavalandApp.renderKPIs();
          HavalandApp.renderMiniChart();
          HavalandApp.renderExpenseAllocations();
          HavalandApp.renderBerandaHighlights();
          HavalandApp.renderTransaksi();
          break;
        case "kegiatan":
          HavalandApp.renderKegiatan("semua");
          HavalandApp.renderBerandaHighlights();
          break;
        case "warga":
          HavalandApp.filterWarga();
          HavalandApp.renderKPIs();
          break;
        case "aspirasi":
          HavalandApp.renderAspirasi();
          break;
        case "usulan":
          if (typeof HavalandProposals !== "undefined") HavalandProposals.renderSlider();
          break;
        case "kontak":
          HavalandApp.renderKontak();
          break;
        case "slides":
          if (typeof HavalandSlider !== "undefined") HavalandSlider.render();
          break;
        default: break;
      }
    } catch (e) {
      console.warn("Gagal me-render ulang koleksi sinkron:", name, e);
    }
  },

  apply(name, items) {
    if (!Array.isArray(items)) return;
    this.saveLocal(name, items);
    this.rerender(name);
  },

  // Inti sinkron dipakai init() & pullOnLogin(): tarik yang ada di cloud,
  // unggah lokal sebagai seed untuk koleksi cloud yang masih kosong.
  // Mengembalikan { pulled, seeded, seededItems } untuk umpan balik.
  async syncAllCollections(status) {
    const result = { pulled: 0, seeded: 0, seededItems: 0 };
    const cols = (status && status.collections) || {};
    const names = Object.keys(this.KEYMAP).map(k => this.KEYMAP[k]).concat(["slides"]);
    for (const name of names) {
      const cloud = Array.isArray(cols[name]) ? cols[name] : [];
      if (cloud.length > 0) {
        this.apply(name, cloud);
        result.pulled += 1;
      } else {
        const local = this.collect(name);
        if (local.length > 0 && this.canPush()) {
          const ok = await this.pushImmediate(name);
          if (ok) {
            result.seeded += 1;
            result.seededItems += local.length;
          }
        }
      }
    }
    return result;
  },

  async init() {
    let status = null;
    try {
      const res = await fetch("/api/sync");
      if (!res.ok) return;
      status = await res.json();
    } catch (e) {
      return; // offline / API belum ter-deploy → mode lokal
    }
    if (!status || !status.connected) return; // DB belum dikonfigurasi

    this.enabled = true;
    this.suspended = true; // jangan memicu push balik selama pull awal
    let summary = { pulled: 0, seeded: 0, seededItems: 0 };
    try {
      summary = await this.syncAllCollections(status);
    } finally {
      this.suspended = false;
    }

    console.log("Terhubung ke Vercel Cloud Database! Sinkron antar-device aktif.");
    const badge = document.querySelector(".live-badge");
    if (badge) {
      badge.innerHTML = `<span class="pulse-dot" style="background:#10B981;"></span><span>Cloud DB Aktif</span>`;
      badge.setAttribute("title", "Terhubung ke Database Cloud — data sinkron antar-device");
    }
    if (!this.badgeNotified) {
      this.badgeNotified = true;
      HavalandUtils.showToast("Cloud DB Aktif", "Data tersinkron antar-device via database cloud.", "success");
    }
    if (summary.seeded > 0) {
      HavalandUtils.showToast(
        "Data Diunggah ke Cloud",
        `${summary.seededItems} data dari ${summary.seeded} koleksi berhasil disimpan ke database cloud.`,
        "success"
      );
    }
  },

  // Dipanggil ulang setelah admin login: tarik versi cloud terbaru, sekaligus
  // unggah data lokal untuk koleksi cloud yang masih kosong (seed awal).
  async pullOnLogin() {
    if (!this.enabled) {
      await this.init();
      return;
    }
    this.suspended = true;
    try {
      const res = await fetch("/api/sync");
      if (!res.ok) return;
      const status = await res.json();
      if (!status || !status.connected) return;
      const summary = await this.syncAllCollections(status);
      if (summary.seeded > 0) {
        HavalandUtils.showToast(
          "Data Diunggah ke Cloud",
          `${summary.seededItems} data dari ${summary.seeded} koleksi berhasil disimpan ke database cloud.`,
          "success"
        );
      }
    } catch (e) {
      console.warn("Gagal menarik data cloud saat login:", e);
    } finally {
      this.suspended = false;
    }
  },

  markDirtyByStorageKey(key) {
    const name = this.KEYMAP[key];
    if (name) this.markDirty(name);
  },

  markDirty(name) {
    if (this.suspended || !this.enabled) return;
    if (this.timers[name]) clearTimeout(this.timers[name]);
    this.timers[name] = setTimeout(() => {
      this.timers[name] = null;
      this.pushImmediate(name);
    }, 2000);
  },

  async pushImmediate(name) {
    if (!this.canPush()) return false;
    const items = this.collect(name);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: this.authHeaders(),
        body: JSON.stringify({ collection: name, items })
      });
      if (!res.ok) {
        console.warn("Sinkron cloud ditolak/gagal:", name, res.status);
        return false;
      }
      return true;
    } catch (e) {
      console.warn("Sinkron cloud offline, dicoba lagi saat ada perubahan:", name);
      return false;
    }
  }
};

// =============================================================================
// MODUL 7B: HERO SLIDER FOTO GOOGLE MAPS (background card biru/hijau beranda)
// Sumber: https://maps.app.goo.gl/9G6s1233qLd68a8A7 (Perum Havaland Karangploso)
// Foto diambil dari HavalandData.defaultSlides / HavalandSlider.slides agar
// selalu sinkron dengan foto yang dikelola admin. Tidak mengunduh ulang dari
// Google (menghormati ToS Google Maps): admin tambah foto via URL/upload.
// =============================================================================
const HavalandHero = {
  slides: [],
  currentIndex: 0,
  autoplayTimer: null,
  autoplayDelay: 6000,

  init() {
    this.syncFromSlider(
      (typeof HavalandSlider !== "undefined" && HavalandSlider.slides) ||
      (typeof HavalandData !== "undefined" && HavalandData.defaultSlides) ||
      []
    );
    this.startAutoPlay();
    const banner = document.getElementById("hero-banner");
    if (banner) {
      banner.addEventListener("mouseenter", () => this.stopAutoPlay(), { passive: true });
      banner.addEventListener("mouseleave", () => this.startAutoPlay(), { passive: true });
    }
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      this.stopAutoPlay();
    }
  },

  getSourceSlides() {
    if (typeof HavalandSlider !== "undefined" && Array.isArray(HavalandSlider.slides) && HavalandSlider.slides.length > 0) {
      return HavalandSlider.slides;
    }
    if (typeof HavalandData !== "undefined" && Array.isArray(HavalandData.defaultSlides)) {
      return HavalandData.defaultSlides;
    }
    return [];
  },

  syncFromSlider(slides) {
    const src = Array.isArray(slides) && slides.length > 0 ? slides : this.getSourceSlides();
    // Tampilkan SEMUA foto (tidak dibatasi 6) — selaras dengan slide Google Maps.
    this.slides = src.slice();
    if (this.currentIndex >= this.slides.length) this.currentIndex = 0;
    this.renderBg();
    this.renderDots();
    this.updateCaption();
  },

  renderBg() {
    const box = document.getElementById("hero-bg-slides");
    if (!box) return;
    box.innerHTML = this.slides.map((s, idx) => `
      <img src="${s.url}" alt="" aria-hidden="true" loading="${idx === 0 ? "eager" : "lazy"}"
        class="${idx === this.currentIndex ? "active" : ""}"
        onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200'">
    `).join("");
  },

  renderDots() {
    const dots = document.getElementById("hero-dots");
    if (!dots) return;
    dots.innerHTML = this.slides.map((_, idx) => `
      <button type="button" class="hero-dot ${idx === this.currentIndex ? "active" : ""}"
        onclick="HavalandHero.goTo(${idx})" aria-label="Foto hero ${idx + 1}"></button>
    `).join("");
  },

  updateCaption() {
    const cap = document.getElementById("hero-photo-caption");
    if (!cap) return;
    const s = this.slides[this.currentIndex];
    const title = s && s.title ? ` • ${s.title}` : "";
    cap.textContent = `Foto Google Maps • ${this.slides.length > 0 ? this.currentIndex + 1 : 0} / ${this.slides.length}${title}`;
  },

  goTo(index) {
    if (this.slides.length === 0) return;
    if (index < 0) index = this.slides.length - 1;
    if (index >= this.slides.length) index = 0;
    this.currentIndex = index;
    const imgs = document.querySelectorAll("#hero-bg-slides img");
    imgs.forEach((img, i) => img.classList.toggle("active", i === this.currentIndex));
    const dots = document.querySelectorAll("#hero-dots .hero-dot");
    dots.forEach((d, i) => d.classList.toggle("active", i === this.currentIndex));
    this.updateCaption();
  },

  next() {
    this.goTo(this.currentIndex + 1);
    this.restartAutoPlay();
  },

  prev() {
    this.goTo(this.currentIndex - 1);
    this.restartAutoPlay();
  },

  // Buka foto hero yang sedang tampil dalam lightbox ukuran penuh (selayar).
  // Dicocokkan via ID slide (bukan posisi) agar tetap tepat walau urutan berubah.
  // Autoplay hero dijeda selama lightbox terbuka, dilanjutkan saat ditutup.
  openFullscreen() {
    try {
      if (typeof HavalandSlider === "undefined" || !HavalandSlider.openLightbox) return;
      const current = this.slides[this.currentIndex];
      let idx = 0;
      if (current) {
        const found = HavalandSlider.slides.findIndex(s => s.id === current.id || s.url === current.url);
        idx = found >= 0 ? found : 0;
      }
      this.stopAutoPlay();
      HavalandSlider.openLightbox(idx);
    } catch (e) {
      console.warn("Gagal membuka full-view:", e);
      if (typeof HavalandUtils !== "undefined") {
        HavalandUtils.showToast("Full-view Gagal", "Foto tidak dapat dibuka ukuran penuh. Coba muat ulang halaman.", "error");
      }
    }
  },

  startAutoPlay() {
    this.stopAutoPlay();
    if (this.slides.length <= 1) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    this.autoplayTimer = setInterval(() => this.goTo(this.currentIndex + 1), this.autoplayDelay);
  },

  stopAutoPlay() {
    if (this.autoplayTimer) {
      clearInterval(this.autoplayTimer);
      this.autoplayTimer = null;
    }
  },

  restartAutoPlay() {
    this.startAutoPlay();
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
  window.HavalandUserManagement = HavalandUserManagement;
  window.HavalandSlider = HavalandSlider;
  window.HavalandSync = HavalandSync;
  window.HavalandHero = HavalandHero;
}


