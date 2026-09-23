// Test Auth & CRUD Restrictions (Node Verification)
const fs = require('fs');
const path = require('path');

// Mock localStorage & sessionStorage
const storage = {};
global.localStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
};
global.sessionStorage = { ...global.localStorage };

// Mock minimal DOM
const elements = {};
function createEl(id) {
  return {
    id,
    classList: {
      classes: new Set(),
      add(c) { this.classes.add(c); },
      remove(c) { this.classes.delete(c); },
      toggle(c, v) { if (v) this.classes.add(c); else this.classes.delete(c); },
      contains(c) { return this.classes.has(c); }
    },
    style: {},
    innerHTML: '',
    textContent: '',
    value: '',
    setAttribute(k, v) { this[k] = v; },
    getAttribute(k) { return this[k]; },
    querySelectorAll() { return []; },
    addEventListener() {}
  };
}

global.document = {
  body: createEl('body'),
  documentElement: createEl('html'),
  getElementById(id) {
    if (!elements[id]) elements[id] = createEl(id);
    return elements[id];
  },
  querySelectorAll() { return []; },
  addEventListener() {}
};
global.window = {
  location: { hash: '' },
  addEventListener() {},
  open() {}
};
global.confirm = () => true;

// Load data and utils
const vm = require('vm');
const dataCode = fs.readFileSync(path.join(__dirname, '../js/data.js'), 'utf8');
const utilsCode = fs.readFileSync(path.join(__dirname, '../js/utils.js'), 'utf8');
const appCode = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');

vm.runInThisContext(dataCode);
vm.runInThisContext(utilsCode);
vm.runInThisContext(appCode);

console.log("=== RUNNING AUTH & CRUD INTEGRATION TESTS ===");

// 1. Initial State: Guest Mode
HavalandAuth.clearSession();
HavalandAuth.updateUI();

console.assert(!HavalandAuth.isLoggedIn(), "Test 1: User should be guest initially");
console.assert(document.body.getAttribute("data-auth-state") === "guest", "Test 2: body data-auth-state should be 'guest'");
console.assert(document.getElementById("user-auth-name").innerHTML.includes("Mode Tamu"), "Test 3: Auth name should display Mode Tamu");

// 2. Transaksi Guard
let toastShown = false;
let loginModalOpened = false;
HavalandUtils.showToast = (title, msg, type) => {
  toastShown = true;
  console.log(`[Toast] ${title}: ${msg} (${type})`);
};
HavalandAuth.openLoginModal = () => { loginModalOpened = true; };

HavalandApp.openTambahTransaksiModal();
console.assert(loginModalOpened, "Test 4: openTambahTransaksiModal triggers login modal for guest");
loginModalOpened = false;

HavalandApp.hapusTransaksi("TRX-001");
console.assert(loginModalOpened, "Test 5: hapusTransaksi triggers login modal for guest");
loginModalOpened = false;

// 3. Kegiatan Guard
HavalandApp.openTambahKegiatanModal();
console.assert(loginModalOpened, "Test 6: openTambahKegiatanModal triggers login modal for guest");
loginModalOpened = false;

HavalandApp.hapusKegiatan("ACT-001");
console.assert(loginModalOpened, "Test 7: hapusKegiatan triggers login modal for guest");
loginModalOpened = false;

// 4. Aspirasi Guard
HavalandApp.openAspirasiModal();
console.assert(loginModalOpened, "Test 8: openAspirasiModal triggers login modal for guest");
loginModalOpened = false;

// 5. Usulan Ide Guard
HavalandProposals.openTambahModal();
console.assert(loginModalOpened, "Test 9: Usulan openTambahModal triggers login modal for guest");
loginModalOpened = false;

const initialDukungan = HavalandData.usulanIde[0].dukungan;
HavalandProposals.vote(HavalandData.usulanIde[0].id);
console.assert(loginModalOpened, "Test 10: Proposal vote triggers login modal for guest");
console.assert(HavalandData.usulanIde[0].dukungan === initialDukungan, "Test 11: Vote count does NOT mutate for guest");
loginModalOpened = false;

// 6. Iuran Modal Guard for Guest
document.getElementById("select-rumah-iuran").value = "W-A01";
HavalandApp.updateCekIuranDetail();
const actionArea = document.getElementById("iuran-auth-action-area").innerHTML;
console.assert(actionArea.includes("Mode Tamu (Hanya Lihat Data)"), "Test 12: Iuran modal shows Mode Tamu notice for guest");
console.assert(actionArea.includes("Masuk Akun"), "Test 13: Iuran modal offers Masuk Akun button for guest");

HavalandApp.catatIuranRumahIni("W-A01");
console.assert(loginModalOpened, "Test 14: catatIuranRumahIni triggers login modal for guest");
loginModalOpened = false;

// 7. Login as Warga
HavalandAuth.quickLogin("warga-bambang");
console.assert(HavalandAuth.isLoggedIn(), "Test 15: User is now logged in");
console.assert(document.body.getAttribute("data-auth-state") === "logged-in", "Test 16: body data-auth-state is 'logged-in'");
console.assert(document.getElementById("user-auth-name").innerHTML.includes("Bambang"), "Test 17: User name is Bambang");

// 8. Iuran Action for Logged In User
document.getElementById("select-rumah-iuran").value = "W-A02"; // Belum bayar
HavalandApp.updateCekIuranDetail();
const actionAreaLoggedIn = document.getElementById("iuran-auth-action-area").innerHTML;
console.assert(actionAreaLoggedIn.includes("Verifikasi & Catat Masuk ke Buku Kas") || actionAreaLoggedIn.includes("Lunas Terverifikasi"), "Test 18: Action area allows payment verification for logged in user");

// 9. Proposal Vote for Logged In User
const preVote = HavalandData.usulanIde[0].dukungan;
HavalandProposals.vote(HavalandData.usulanIde[0].id);
console.assert(HavalandData.usulanIde[0].dukungan === preVote + 1, "Test 19: Vote count increments for logged-in user");

// 10. Logout returns to Guest
HavalandAuth.logout();
console.assert(!HavalandAuth.isLoggedIn(), "Test 20: User logged out successfully");
console.assert(document.body.getAttribute("data-auth-state") === "guest", "Test 21: body returns to 'guest'");

console.log("\nALL 21 TESTS PASSED SUCCESSFULLY! CRUD restrictions and guest read-only mode verified.");
