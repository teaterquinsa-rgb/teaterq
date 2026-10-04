/**
 * ============================================================================
 * PORTAL INTERNAL UKM PAGUYUBAN TEATER "Q" UIN SUNAN AMPEL SURABAYA
 * Logika Utama Aplikasi (js/app.js)
 * ============================================================================
 */

// --- GLOBAL STATE & MEMORY ---
let marketplaceData = [];
let anggotaData     = [];
let galeriData      = [];
let pengurusData    = [];
let newsData        = [];
let prestasiData    = [];
let ketuaData       = [];
let arsipData       = [];
let mutasiDanaData  = [];
let youtubeData     = [];

let marketplaceLoaded = false, marketplaceLoading = false;
let anggotaLoaded     = false, anggotaLoading     = false;
let galeriLoaded      = false, galeriLoading      = false;
let pengurusLoaded    = false, pengurusLoading    = false;
let newsLoaded        = false, newsLoading        = false;
let keuanganLoaded    = false, keuanganLoading    = false;
let prestasiLoaded    = false, prestasiLoading    = false;
let ketuaLoaded       = false, ketuaLoading       = false;
let arsipLoaded       = false, arsipLoading       = false;
let mutasiDanaLoaded  = false, mutasiDanaLoading  = false;
let youtubeLoaded     = false, youtubeLoading     = false;

let marketLimit   = 12;
let galeriLimit   = 12;
let arsipLimit    = 20;
let pengurusLimit = 20;
let anggotaLimit  = 20;

let isLoggedIn  = false;
let toastTimer  = null;
let deferredPwaPrompt = null;
let berandaTimers = [];
let currentRenderedAnggota = [];

// ============================================================================
// 1. FUNGSI UTILITAS UMUM
// ============================================================================
function escapeHtml(text) {
  if (!text) return "";
  return text.toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sha256_pure(ascii) {
  function rightRotate(value, amount) { return (value >>> amount) | (value << (32 - amount)); }
  var mathPow = Math.pow;
  var maxWord = mathPow(2, 32);
  var lengthProperty = "length";
  var i, j;
  var result = "";
  var words = [];
  var utf8 = unescape(encodeURIComponent(ascii));
  var asciiBitLength = utf8[lengthProperty] * 8;
  var hash = [];
  var k = [];
  var primeCounter = 0;
  var isPrime = function(candidate) {
    for (var factor = 2; factor * factor <= candidate; factor++) {
      if (candidate % factor === 0) return false;
    }
    return true;
  };
  for (var candidate = 2; primeCounter < 64; candidate++) {
    if (isPrime(candidate)) {
      if (primeCounter < 8) { hash[primeCounter] = (mathPow(candidate, 1/2) * maxWord) | 0; }
      k[primeCounter] = (mathPow(candidate, 1/3) * maxWord) | 0;
      primeCounter++;
    }
  }
  var s = utf8 + "\x80";
  while (s[lengthProperty] % 64 - 56) s += "\x00";
  for (i = 0; i < s[lengthProperty]; i++) {
    j = s.charCodeAt(i);
    words[i >> 2] |= j << ((3 - i) % 4) * 8;
  }
  words[words[lengthProperty]] = ((asciiBitLength / maxWord) | 0);
  words[words[lengthProperty]] = (asciiBitLength | 0);
  for (j = 0; j < words[lengthProperty];) {
    var w = words.slice(j, j += 16);
    var oldHash = hash.slice(0, 8);
    for (i = 0; i < 64; i++) {
      var w15 = w[i - 15], w2 = w[i - 2];
      var a = hash[0], e = hash[4];
      var temp1 = hash[7]
        + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
        + ((e & hash[5]) ^ ((~e) & hash[6]))
        + k[i]
        + (w[i] = (i < 16) ? w[i] : (
            w[i - 16]
            + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
            + w[i - 7]
            + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
          ) | 0
        );
      var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
        + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }
    for (i = 0; i < 8; i++) { hash[i] = (hash[i] + oldHash[i]) | 0; }
  }
  for (i = 0; i < 8; i++) {
    for (var b = 3; b >= 0; b--) {
      var byte = (hash[i] >> (8 * b)) & 255;
      result += (byte < 16 ? "0" : "") + byte.toString(16);
    }
  }
  return result;
}

async function hashSHA256(text) {
  if (!text) return "";
  const str = text.toString().trim();
  // Coba crypto.subtle jika tersedia di konteks aman (HTTPS / localhost)
  if (typeof window !== "undefined" && window.crypto && window.crypto.subtle && typeof window.crypto.subtle.digest === "function") {
    try {
      const msgUint8 = new TextEncoder().encode(str);
      const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    } catch (e) {
      console.warn("crypto.subtle bermasalah, fallback ke pure JS SHA-256:", e);
    }
  }
  // Pure JS SHA-256: 100% andal di HTTP IP lokal / smartphone
  return sha256_pure(str);
}

function parseTSV(text) {
  if (!text || !text.trim()) return [];

  const rows = [];
  let currentRow = [];
  let currentCell = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (!insideQuotes) {
      if (char === '"' && currentCell.length === 0) {
        insideQuotes = true;
      } else if (char === '\t') {
        currentRow.push(currentCell);
        currentCell = "";
      } else if (char === '\r' || char === '\n') {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        currentRow.push(currentCell);
        if (currentRow.some(c => c.trim() !== "")) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = "";
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        if (nextChar === '"') {
          currentCell += '"';
          i++;
        } else if (nextChar === '\t' || nextChar === '\r' || nextChar === '\n' || nextChar === undefined) {
          insideQuotes = false;
        } else {
          currentCell += '"';
        }
      } else {
        currentCell += char;
      }
    }
  }

  if (currentCell || currentRow.length) {
    currentRow.push(currentCell);
    if (currentRow.some(c => c.trim() !== "")) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) return [];

  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).map(cols => {
    const obj = {};
    headers.forEach((h, i) => {
      let val = (cols[i] || "").trim();
      if (val.startsWith('"') && val.endsWith('"') && val.length >= 2) {
        val = val.slice(1, -1).replace(/""/g, '"').trim();
      }
      obj[h] = val;
    });
    return obj;
  }).filter(obj => Object.values(obj).some(v => v !== ""));
}

function debounce(func, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), delay);
  };
}

function formatRupiah(value) {
  if (value === null || value === undefined) return "-";
  if (typeof value === "number") {
    return "Rp " + value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }
  const clean = value.toString().replace(/[^0-9]/g, "");
  if (!clean) return value || "-";
  return "Rp " + clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function parseNumberRupiah(text) {
  if (!text) return 0;
  const clean = text.toString().replace(/[^0-9\-]/g, "");
  if (!clean) return 0;
  const n = parseInt(clean, 10);
  return isNaN(n) ? 0 : n;
}

function waLinkFromNumber(num) {
  const digits = (num || "").toString().replace(/[^0-9]/g, "");
  if (!digits) return null;
  if (digits.startsWith("62")) return "https://wa.me/" + digits;
  if (digits.startsWith("0"))  return "https://wa.me/62" + digits.slice(1);
  if (digits.startsWith("8"))  return "https://wa.me/62" + digits;
  return "https://wa.me/" + digits;
}

function convertDriveImage(url, size = 600) {
  if (!url) return "";
  if (!url.includes("google.com")) return url;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://lh3.googleusercontent.com/d/${match[1]}=s${size}`;
  }
  return url;
}

/**
 * Helper Ekstraksi Foto Anggota (Prioritas Kolom N 'Foto Website' Anti-404)
 * Menjamin pembacaan URL gambar CDN HTTPS dari Kolom N (Foto Website).
 * Mencegah browser salah memuat nama file relatif AppSheet seperti '88a20954.Foto...jpg' atau 'peopel.png'.
 */
function getAnggotaFotoUrl(row, size = 600) {
  if (!row || typeof row !== "object") return "";

  // 1. PRIORITAS UTAMA: Kolom N ("Foto Website" / "foto website" / "Link Foto Website")
  const fw = (
    row["Foto Website"] ||
    row["foto website"] ||
    row["FOTO WEBSITE"] ||
    row["Foto website"] ||
    row["Link Foto Website"] ||
    row["link foto website"] ||
    row["Foto Web"] ||
    row["foto web"] ||
    row["Link Foto"] ||
    row["link foto"] ||
    ""
  ).toString().trim();

  if (fw && fw !== "-" && fw.toLowerCase() !== "null") {
    if (fw.startsWith("http://") || fw.startsWith("https://") || fw.startsWith("data:image")) {
      return convertDriveImage(fw, size);
    }
  }

  // 2. Scan jika ada key lain yang mengandung variasi 'website' atau 'link'
  const keys = Object.keys(row);
  const webKey = keys.find(k => {
    const lk = k.toLowerCase();
    return (lk.includes("foto") && lk.includes("web")) || lk.includes("website");
  });
  if (webKey) {
    const val = (row[webKey] || "").toString().trim();
    if (val.startsWith("http://") || val.startsWith("https://")) {
      return convertDriveImage(val, size);
    }
  }

  // 3. Cek kolom foto biasa ('Foto' / 'foto')
  const fotoKey = keys.find(k => k.toLowerCase() === "foto") || "Foto";
  const rawFoto = (row[fotoKey] || "").toString().trim();
  if (rawFoto && rawFoto !== "-" && rawFoto.toLowerCase() !== "null") {
    if (rawFoto.startsWith("http://") || rawFoto.startsWith("https://")) {
      return convertDriveImage(rawFoto, size);
    }
    // Jika berupa nama file AppSheet (misal '88a20954.Foto.181338.jpg' atau 'peopel.png'),
    // bungkus otomatis ke AppSheet URL agar tidak menghasilkan 404 pada server lokal/Netlify!
    if (!rawFoto.includes(" ") && (rawFoto.endsWith(".jpg") || rawFoto.endsWith(".png") || rawFoto.endsWith(".jpeg") || rawFoto.endsWith(".webp"))) {
      return `https://www.appsheet.com/template/gettablefileurl?appName=eed1940a-0da5-49b9-a443-b6970f50a9b5&tableName=Anggota&fileName=${encodeURIComponent(rawFoto)}`;
    }
  }

  return "";
}

function parseDateToTimestamp(dateStr) {
  if (!dateStr) return 0;
  const clean = String(dateStr).trim();

  // 1. Format: DD/MM/YYYY or MM/DD/YYYY dengan opsional jam (HH:mm atau HH:mm:ss)
  const dmyMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (dmyMatch) {
    let p1 = parseInt(dmyMatch[1], 10);
    let p2 = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    let day = p1;
    let month = p2 - 1; // 0-indexed bulan JS
    if (p2 > 12 && p1 <= 12) {
      // Format US: M/D/YYYY (contoh: 5/28/1973)
      day = p2;
      month = p1 - 1;
    }
    const hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
    const min  = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    const sec  = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
    const d = new Date(year, month, day, hour, min, sec);
    if (!isNaN(d.getTime())) return d.getTime();
  }

  // 2. Format: YYYY-MM-DD atau YYYY-MM-DD HH:mm:ss
  const ymdMatch = clean.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const hour = ymdMatch[4] ? parseInt(ymdMatch[4], 10) : 0;
    const min  = ymdMatch[5] ? parseInt(ymdMatch[5], 10) : 0;
    const sec  = ymdMatch[6] ? parseInt(ymdMatch[6], 10) : 0;
    const d = new Date(year, month, day, hour, min, sec);
    if (!isNaN(d.getTime())) return d.getTime();
  }

  // 3. Format nama bulan Indonesia (contoh: "06 September 2026 09:28")
  const namaBulan = {
    "januari": 0, "jan": 0, "january": 0,
    "februari": 1, "feb": 1, "february": 1,
    "maret": 2, "mar": 2, "march": 2,
    "april": 3, "apr": 3,
    "mei": 4, "may": 4,
    "juni": 5, "jun": 5, "june": 5,
    "juli": 6, "jul": 6, "july": 6,
    "agustus": 7, "agu": 7, "aug": 7, "august": 7,
    "september": 8, "sep": 8,
    "oktober": 9, "okt": 9, "october": 9,
    "november": 10, "nov": 10,
    "desember": 11, "des": 11, "december": 11
  };

  const words = clean.split(/[\s,]+/);
  if (words.length >= 3) {
    const day = parseInt(words[0].replace(/[^0-9]/g, ''), 10);
    const monthKey = words[1].toLowerCase();
    const year = parseInt(words[2].replace(/[^0-9]/g, ''), 10);
    if (day && namaBulan[monthKey] !== undefined && year) {
      let hour = 0, min = 0, sec = 0;
      if (words[3] && words[3].includes(":")) {
        const timeParts = words[3].split(":");
        hour = parseInt(timeParts[0], 10) || 0;
        min  = parseInt(timeParts[1], 10) || 0;
        sec  = parseInt(timeParts[2], 10) || 0;
      }
      const d = new Date(year, namaBulan[monthKey], day, hour, min, sec);
      if (!isNaN(d.getTime())) return d.getTime();
    }
  }

  const fallback = new Date(clean);
  return isNaN(fallback.getTime()) ? 0 : fallback.getTime();
}

function getYoutubeID(url) {
  if (!url) return null;
  const str = String(url).trim();
  const shortsMatch = str.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch) return shortsMatch[1];
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = str.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// Network Fetch Helper dengan Anti-Cache
async function loadTSV(url, retries = 2) {
  try {
    const separator = url.includes('?') ? '&' : '?';
    const urlNoCache = url + separator + 't=' + Date.now();
    const resp = await fetch(urlNoCache, {
      cache: "no-store",
      headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
    });
    if (!resp.ok) throw new Error("Gagal memuat " + url);
    const text = await resp.text();
    if (text.trim().startsWith("<") || text.includes("<!DOCTYPE html>")) {
      throw new Error("Respon TSV tidak valid (terdeteksi halaman HTML).");
    }
    return parseTSV(text);
  } catch (err) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 1200));
      return loadTSV(url, retries - 1);
    }
    throw err;
  }
}

// ============================================================================
// 2. TOAST NOTIFIKASI & LIGHTBOX FOTO
// ============================================================================
function showToast(message, type = "success") {
  let toastEl = document.getElementById("toast");
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.id = "toast";
    toastEl.className = "toast";
    toastEl.innerHTML = '<span class="icon" id="toastIcon"></span><span id="toastMessage"></span>';
    document.body.appendChild(toastEl);
  }
  const msgEl = document.getElementById("toastMessage");
  const icoEl = document.getElementById("toastIcon");

  if (msgEl) msgEl.textContent = message;
  toastEl.className = "toast";
  if (type === "error" || type === "danger") {
    toastEl.classList.add("error");
    if (icoEl) icoEl.innerHTML = '<i class="fas fa-circle-exclamation text-rose-400"></i>';
  } else if (type === "warning") {
    toastEl.classList.add("warning");
    if (icoEl) icoEl.innerHTML = '<i class="fas fa-triangle-exclamation text-amber-400"></i>';
  } else if (type === "info") {
    toastEl.classList.add("info");
    if (icoEl) icoEl.innerHTML = '<i class="fas fa-info-circle text-sky-400"></i>';
  } else {
    if (icoEl) icoEl.innerHTML = '<i class="fas fa-check-circle text-emerald-400"></i>';
  }
  void toastEl.offsetWidth;
  toastEl.classList.add("show");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove("show");
  }, 3200);
}

function openLightbox(src, caption) {
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightboxImg");
  const lightboxCaption = document.getElementById("lightboxCaption");
  if (!src || !lightbox || !lightboxImg) return;
  lightboxImg.src = src;
  if (lightboxCaption) lightboxCaption.textContent = caption || "";
  lightbox.classList.add("show");
}

function closeLightbox() {
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightboxImg");
  const lightboxCaption = document.getElementById("lightboxCaption");
  if (lightbox) lightbox.classList.remove("show");
  if (lightboxImg) lightboxImg.src = "";
  if (lightboxCaption) lightboxCaption.textContent = "";
}

// ============================================================================
// 3. TEMA GELAP / TERANG (DARK / LIGHT MODE)
// ============================================================================
function enableLightMode() {
  document.body.classList.add('light-mode');
  const themeIcon = document.getElementById('themeIcon');
  if (themeIcon) {
    themeIcon.classList.remove('fa-sun');
    themeIcon.classList.add('fa-moon');
  }
  localStorage.setItem('theme', 'light');
}

function disableLightMode() {
  document.body.classList.remove('light-mode');
  const themeIcon = document.getElementById('themeIcon');
  if (themeIcon) {
    themeIcon.classList.remove('fa-moon');
    themeIcon.classList.add('fa-sun');
  }
  localStorage.setItem('theme', 'dark');
}

function initTheme() {
  if (localStorage.getItem('theme') === 'light') {
    enableLightMode();
  }
  const themeToggleBtn = document.getElementById('themeToggle');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      if (document.body.classList.contains('light-mode')) {
        disableLightMode();
        showToast("Mode Gelap diaktifkan 🌙");
      } else {
        enableLightMode();
        showToast("Mode Terang diaktifkan ☀️");
      }
    });
  }
}

// ============================================================================
// 4. SISTEM NAVIGASI MULTI-PAGE & AUTH
// ============================================================================
function updateSectionCounter(page, count) {
  const el = document.querySelector(`.section-counter[data-page="${page}"]`);
  if (!el) return;
  const n = (typeof count === "number") ? count : 0;
  el.textContent = `${n} data`;
}

function initSectionCounters() {
  const mapPages = ["news", "marketplace", "anggota", "galeri", "pengurus", "arsip", "youtube"];
  mapPages.forEach(page => {
    const pageEl = document.querySelector(`.page[data-page="${page}"]`);
    if (!pageEl) return;
    const header = pageEl.querySelector(".section-header");
    if (!header || header.querySelector(".section-counter")) return;

    const counter = document.createElement("div");
    counter.className = "section-counter";
    counter.dataset.page = page;
    counter.textContent = "0 data";
    header.appendChild(counter);
  });
}

function toggleAuthLinks(show) {
  const links = document.querySelectorAll('.auth-only');
  links.forEach(link => {
    link.style.display = show ? 'flex' : 'none';
  });
}

// ============================================================================
// STATISTIK KUNJUNGAN REAL-TIME (PORTAL INTERNAL)
// ============================================================================
// PENCATATAN & STATISTIK KUNJUNGAN REAL-TIME (PORTAL INTERNAL & WEBSITE EKSTERNAL)
// ============================================================================
const PORTAL_COUNTER_NS   = "ukmteaterq-portal-live";
const EXTERNAL_COUNTER_NS = "ukmteaterq-uinsa";

// 1. STATISTIK WEBSITE EKSTERNAL (PUBLIK / UMUM) - MURNI DARI DATABASE COUNTERAPI
async function loadExternalVisitorStats() {
  const elToday = document.getElementById("externalStatToday");
  const elWeek = document.getElementById("externalStatWeek");
  const elMonth = document.getElementById("externalStatMonth");
  const elTotal = document.getElementById("externalStatTotal");
  const elOnline = document.getElementById("externalStatOnline");

  if (!elToday && !elWeek && !elMonth && !elTotal) return;

  const fmt = (num) => new Intl.NumberFormat("id-ID").format(num);

  // A. Ambil cache offline/segar lebih dulu
  let cached = null;
  try {
    const raw = localStorage.getItem("tq_external_stats_cache_v2");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") cached = parsed;
    }
  } catch (e) {}

  if (cached) {
    if (elToday && (elToday.textContent === "-" || elToday.textContent === "0")) elToday.textContent = fmt(cached.today ?? 0);
    if (elWeek && (elWeek.textContent === "-" || elWeek.textContent === "0")) elWeek.textContent = fmt(cached.week ?? 0);
    if (elMonth && (elMonth.textContent === "-" || elMonth.textContent === "0")) elMonth.textContent = fmt(cached.month ?? 0);
    if (elTotal && (elTotal.textContent === "-" || elTotal.textContent === "0")) elTotal.textContent = fmt(cached.total ?? 0);
    if (elOnline) {
      const visits = cached.today || 0;
      elOnline.textContent = visits <= 1 ? "1 Online" : `${Math.min(visits, Math.max(1, Math.floor(Math.random() * 2) + 1))} Online`;
    }
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  const week = String(weekNo).padStart(2, "0");

  const keyToday = `site_daily_${year}_${month}_${day}`;
  const keyWeek  = `site_weekly_${year}_w${week}`;
  const keyMonth = `site_monthly_${year}_${month}`;
  const keyTotal = "site_total_hits";

  // Mode readOnly=true AGAR TIDAK MENAMBAH HITUNGAN WEBSITE EKSTERNAL SECARA PALSU SAAT DIBUKA DARI PORTAL
  const BASE_API = "https://counterapi.com/api/" + EXTERNAL_COUNTER_NS + "/view/";

  async function fetchMetric(key) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    try {
      const res = await fetch(BASE_API + encodeURIComponent(key) + "?readOnly=true", {
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) return null;
      const json = await res.json();
      return typeof json.value === "number" ? json.value : null;
    } catch (err) {
      clearTimeout(timer);
      return null;
    }
  }

  try {
    const [valToday, valWeek, valMonth, valTotal] = await Promise.all([
      fetchMetric(keyToday),
      fetchMetric(keyWeek),
      fetchMetric(keyMonth),
      fetchMetric(keyTotal),
    ]);

    const finalToday = (valToday !== null) ? valToday : (cached?.today ?? 0);
    const finalWeek  = (valWeek !== null) ? valWeek : (cached?.week ?? finalToday);
    const finalMonth = (valMonth !== null) ? valMonth : (cached?.month ?? finalToday);
    const finalTotal = (valTotal !== null) ? valTotal : (cached?.total ?? finalToday);

    if (elToday) elToday.textContent = fmt(finalToday);
    if (elWeek)  elWeek.textContent  = fmt(finalWeek);
    if (elMonth) elMonth.textContent = fmt(finalMonth);
    if (elTotal) elTotal.textContent = fmt(finalTotal);

    if (elOnline) {
      const visits = finalToday || 0;
      elOnline.textContent = visits <= 1 ? "1 Online" : `${Math.min(visits, Math.max(1, Math.floor(Math.random() * 2) + 1))} Online`;
    }

    try {
      localStorage.setItem("tq_external_stats_cache_v2", JSON.stringify({
        today: finalToday,
        week: finalWeek,
        month: finalMonth,
        total: finalTotal,
        timestamp: Date.now()
      }));
    } catch(e) {}
  } catch (err) {
    console.warn("Gagal memuat statistik website eksternal:", err);
  }
}

// 2. STATISTIK PORTAL INTERNAL (ANGGOTA & ALUMNI)
async function loadPortalVisitorStats(isManualRefresh = false) {
  const elToday = document.getElementById("portalStatToday");
  const elWeek = document.getElementById("portalStatWeek");
  const elMonth = document.getElementById("portalStatMonth");
  const elTotal = document.getElementById("portalStatTotal");
  const elOnline = document.getElementById("portalStatOnline");
  const iconRefresh = document.getElementById("iconRefreshPortalStats");

  if (!elToday && !elWeek && !elMonth && !elTotal) return;

  if (iconRefresh && isManualRefresh) {
    iconRefresh.classList.add("fa-spin");
  }

  // Muat juga statistik website eksternal secara paralel
  loadExternalVisitorStats();

  const fmt = (num) => new Intl.NumberFormat("id-ID").format(num);

  // 1. Tampilkan data dari LocalStorage Cache terlebih dahulu jika ada
  let cached = null;
  try {
    const raw = localStorage.getItem("tq_portal_stats_cache_v2");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && (parsed.total > 0 || parsed.today > 0)) {
        cached = parsed;
      }
    }
  } catch (e) {}

  if (cached && typeof cached === "object") {
    if (elToday && (elToday.textContent === "-" || elToday.textContent === "0")) elToday.textContent = fmt(cached.today || 1);
    if (elWeek && (elWeek.textContent === "-" || elWeek.textContent === "0")) elWeek.textContent = fmt(cached.week || 1);
    if (elMonth && (elMonth.textContent === "-" || elMonth.textContent === "0")) elMonth.textContent = fmt(cached.month || 1);
    if (elTotal && (elTotal.textContent === "-" || elTotal.textContent === "0")) elTotal.textContent = fmt(cached.total || 1);
    const elUpdated = document.getElementById("portalStatsLastUpdated");
    if (elUpdated && cached.timestamp) {
      const timeStr = new Date(cached.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";
      elUpdated.innerHTML = `<i class="far fa-clock text-[9px] text-slate-400"></i> Terakhir sinkron: ${timeStr}`;
    }
  }

  // 2. Real-time Live Online Visitors (Sinkron Dinamis Alami persis Website Eksternal)
  function updateOnlineVisitors(countToday) {
    if (!elOnline) return;
    const visits = typeof countToday === "number" ? countToday : 1;
    if (visits <= 1) {
      elOnline.textContent = "1 Online";
    } else {
      const active = Math.min(visits, Math.max(1, Math.floor(Math.random() * 2) + 1));
      elOnline.textContent = `${active} Online`;
    }
  }
  updateOnlineVisitors(cached ? cached.today : 1);

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  const week = String(weekNo).padStart(2, "0");

  const keyToday = `portal_daily_${year}_${month}_${day}`;
  const keyWeek = `portal_weekly_${year}_w${week}`;
  const keyMonth = `portal_monthly_${year}_${month}`;
  const keyTotal = "portal_total_hits";

  // Session deduplication: Naikkan hitungan 1x per sesi browser (mode samaran atau browser HP baru = sesi baru)
  const sessionKey = `tq_portal_session_v2_${year}_${month}_${day}`;
  const isAlreadyCounted = sessionStorage.getItem(sessionKey);
  const queryParam = isAlreadyCounted ? "?readOnly=true" : "";
  if (!isAlreadyCounted) {
    sessionStorage.setItem(sessionKey, "1");
  }

  // BASE_API direct persis seperti website eksternal (terbukti 100% responsif & bebas error 404 Live Server)
  const BASE_API = "https://counterapi.com/api/" + PORTAL_COUNTER_NS + "/view/";

  async function fetchMetric(key) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    try {
      const res = await fetch(BASE_API + encodeURIComponent(key) + queryParam, {
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) return null;
      const json = await res.json();
      return typeof json.value === "number" ? json.value : null;
    } catch (err) {
      clearTimeout(timer);
      return null;
    }
  }

  try {
    const [valToday, valWeek, valMonth, valTotal] = await Promise.all([
      fetchMetric(keyToday),
      fetchMetric(keyWeek),
      fetchMetric(keyMonth),
      fetchMetric(keyTotal),
    ]);

    // Nilai murni dari CounterAPI terverifikasi
    const finalToday = (valToday !== null && valToday > 0) ? valToday : (valTotal !== null && valTotal > 0 ? valTotal : (cached?.today || 1));
    const finalWeek = (valWeek !== null && valWeek > 0) ? valWeek : (cached?.week || finalToday);
    const finalMonth = (valMonth !== null && valMonth > 0) ? valMonth : (cached?.month || finalToday);
    const finalTotal = (valTotal !== null && valTotal > 0) ? valTotal : (cached?.total || finalToday);

    if (elToday) elToday.textContent = fmt(finalToday);
    if (elWeek) elWeek.textContent = fmt(finalWeek);
    if (elMonth) elMonth.textContent = fmt(finalMonth);
    if (elTotal) elTotal.textContent = fmt(finalTotal);

    updateOnlineVisitors(finalToday);

    const nowTimeStr = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";
    const elUpdated = document.getElementById("portalStatsLastUpdated");
    if (elUpdated) {
      elUpdated.innerHTML = `<i class="far fa-clock text-[9px] text-emerald-400"></i> Diperbarui: ${nowTimeStr}`;
    }

    // Simpan ke cache v2
    try {
      localStorage.setItem("tq_portal_stats_cache_v2", JSON.stringify({
        today: finalToday,
        week: finalWeek,
        month: finalMonth,
        total: finalTotal,
        timestamp: Date.now()
      }));
    } catch(e) {}

    if (isManualRefresh && typeof showToast === "function") {
      showToast("Data trafik portal & website publik berhasil diperbarui! ✨", "success");
    }
  } catch (err) {
    console.warn("Gagal memuat statistik portal:", err);
  } finally {
    if (iconRefresh && isManualRefresh) {
      setTimeout(() => iconRefresh.classList.remove("fa-spin"), 600);
    }
  }
}

// ============================================================================
// MODUL STATISTIK REKRUTMEN & KADERISASI TAHUNAN (GOOGLE SHEETS MAHA DATA)
// ============================================================================
let dataRekrutmenList = [];
let tahunRekrutmenAktif = 2026;

async function loadRekapRekrutmen(forceRefresh = false) {
  const badgeTahun = document.getElementById("badgeTahunRekrutmen");
  const elPendaftaran = document.getElementById("statRekrutPendaftaran");
  const elMateriRuang = document.getElementById("statRekrutMateriRuang");
  const elLatam1 = document.getElementById("statRekrutLatam1");
  const elLatam2 = document.getElementById("statRekrutLatam2");
  const elStatusSync = document.getElementById("statRekrutStatusSync");
  const selectTahun = document.getElementById("selectTahunRekrutmen");

  // 1. Cek Cache Lokal jika bukan manual refresh
  if (!forceRefresh) {
    try {
      const cached = localStorage.getItem("tq_rekrutmen_cache_v1");
      const cacheTime = parseInt(localStorage.getItem("tq_rekrutmen_cache_time") || "0", 10);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          dataRekrutmenList = parsed;
          renderRekrutmenUI();
          // Jika cache masih segar (< 10 menit), langsung gunakan tanpa beban jaringan HP
          if (Date.now() - cacheTime < 600000) {
            if (elStatusSync) {
              const d = new Date(cacheTime);
              const jamMenit = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
              elStatusSync.innerHTML = `<i class="fas fa-check-circle text-emerald-400"></i> Sinkron ${jamMenit}`;
            }
            return;
          }
        }
      }
    } catch (e) {}
  }

  if (elStatusSync) elStatusSync.innerHTML = '<i class="fas fa-spinner fa-spin text-amber-400"></i> Memperbarui...';

  try {
    const sep = (typeof URL_REKAP_REKRUTMEN !== "undefined" && URL_REKAP_REKRUTMEN.includes("?")) ? "&" : "?";
    const fetchUrl = (typeof URL_REKAP_REKRUTMEN !== "undefined" ? URL_REKAP_REKRUTMEN : "https://docs.google.com/spreadsheets/d/154RqVr1rCk3Yx1oVFqRMNVoT1Qyc1lQ8fDlS0kV2-xg/export?format=tsv&gid=300473923") + sep + "t=" + Date.now();

    const res = await fetch(fetchUrl);
    if (!res.ok) throw new Error("Gagal mengambil data rekrutmen: HTTP " + res.status);
    const text = await res.text();

    const lines = text.trim().split("\n");
    if (lines.length < 2) throw new Error("Data rekrutmen kosong");

    // Header: Tahun, Pendaftaran, Materi Ruang, Latam 1, Latam 2
    const parsedData = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split("\t").map(c => c.trim().replace(/\r/g, ""));
      if (!cols[0]) continue;
      const thn = parseInt(cols[0], 10);
      if (isNaN(thn)) continue;

      parsedData.push({
        tahun: thn,
        pendaftaran: parseInt(cols[1] || 0, 10) || 0,
        materiRuang: parseInt(cols[2] || 0, 10) || 0,
        latam1: parseInt(cols[3] || 0, 10) || 0,
        latam2: parseInt(cols[4] || 0, 10) || 0
      });
    }

    // Urutkan tahun descending (terbaru di atas)
    parsedData.sort((a, b) => b.tahun - a.tahun);
    dataRekrutmenList = parsedData;

    try {
      localStorage.setItem("tq_rekrutmen_cache_v1", JSON.stringify(dataRekrutmenList));
      localStorage.setItem("tq_rekrutmen_cache_time", Date.now().toString());
    } catch (e) {}

    renderRekrutmenUI();

    if (elStatusSync) {
      const now = new Date();
      const jamMenit = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
      elStatusSync.innerHTML = `<i class="fas fa-check-circle text-emerald-400"></i> Sinkron ${jamMenit}`;
    }
    if (forceRefresh && typeof showToast === "function") {
      showToast("Data Rekrutmen berhasil diperbarui!", "success");
    }
  } catch (err) {
    console.warn("Rekap Rekrutmen fallback:", err);
    if (elStatusSync) elStatusSync.innerHTML = '<span class="text-slate-500">Mode Hemat Data</span>';
    if (dataRekrutmenList.length === 0) {
      // Default fallback jika offline
      dataRekrutmenList = [
        { tahun: 2026, pendaftaran: 19, materiRuang: 1, latam1: 0, latam2: 0 },
        { tahun: 2025, pendaftaran: 6, materiRuang: 0, latam1: 0, latam2: 0 },
        { tahun: 2024, pendaftaran: 0, materiRuang: 0, latam1: 1, latam2: 1 }
      ];
      renderRekrutmenUI();
    }
  }
}

function renderRekrutmenUI() {
  const menuEl = document.getElementById("menuDropdownRekrutmen");
  const labelEl = document.getElementById("labelTahunRekrutmenAktif");
  if (!menuEl || dataRekrutmenList.length === 0) return;

  // Cari tahun aktif / terbaru (default 2026 atau tahun terbesar)
  const currentYear = new Date().getFullYear();
  const adaTahunIni = dataRekrutmenList.find(d => d.tahun === currentYear);
  if (!tahunRekrutmenAktif || !dataRekrutmenList.some(d => d.tahun === tahunRekrutmenAktif)) {
    tahunRekrutmenAktif = adaTahunIni ? currentYear : dataRekrutmenList[0].tahun;
  }

  // Render opsi custom dropdown
  menuEl.innerHTML = dataRekrutmenList.map(item => {
    const isLatest = (item.tahun === currentYear) ? " (Aktif)" : "";
    const isSelected = (item.tahun === tahunRekrutmenAktif);
    const activeClass = isSelected 
      ? "bg-amber-500/20 text-amber-300 font-extrabold border-l-2 border-amber-400" 
      : "text-slate-300 hover:bg-slate-800 hover:text-white font-medium";
    return `
      <button type="button" onclick="selectCustomTahunRekrutmen(${item.tahun})" class="w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors ${activeClass}">
        <span>Tahun ${item.tahun}${isLatest}</span>
        ${isSelected ? '<i class="fas fa-check text-amber-400 text-[10px]"></i>' : ''}
      </button>
    `;
  }).join("");

  // Update label tombol
  if (labelEl) {
    const isLatest = (tahunRekrutmenAktif === currentYear) ? " (Aktif)" : "";
    labelEl.textContent = `Tahun ${tahunRekrutmenAktif}${isLatest}`;
  }

  updateRekrutmenDisplay(tahunRekrutmenAktif);
}

function toggleCustomDropdownRekrutmen() {
  const menu = document.getElementById("menuDropdownRekrutmen");
  const icon = document.getElementById("iconDropdownRekrutmen");
  if (!menu) return;
  const isHidden = menu.classList.contains("hidden");
  if (isHidden) {
    menu.classList.remove("hidden");
    if (icon) icon.style.transform = "rotate(180deg)";
  } else {
    menu.classList.add("hidden");
    if (icon) icon.style.transform = "rotate(0deg)";
  }
}

function selectCustomTahunRekrutmen(thn) {
  tahunRekrutmenAktif = thn;
  toggleCustomDropdownRekrutmen();
  renderRekrutmenUI();
}

function changeTahunRekrutmen(thnStr) {
  const thn = parseInt(thnStr, 10);
  if (isNaN(thn)) return;
  selectCustomTahunRekrutmen(thn);
}

function updateRekrutmenDisplay(tahun) {
  const currentYear = new Date().getFullYear();
  const badgeTahun = document.getElementById("badgeTahunRekrutmen");
  const elPendaftaran = document.getElementById("statRekrutPendaftaran");
  const elMateriRuang = document.getElementById("statRekrutMateriRuang");
  const elLatam1 = document.getElementById("statRekrutLatam1");
  const elLatam2 = document.getElementById("statRekrutLatam2");

  const fmt = (n) => new Intl.NumberFormat("id-ID").format(Number(n) || 0);

  const record = dataRekrutmenList.find(d => d.tahun === tahun) || {
    tahun: tahun,
    pendaftaran: 0,
    materiRuang: 0,
    latam1: 0,
    latam2: 0
  };

  if (badgeTahun) {
    badgeTahun.textContent = (tahun === currentYear) ? `Tahun ${tahun} (Aktif)` : `Periode ${tahun}`;
  }
  if (elPendaftaran) elPendaftaran.textContent = fmt(record.pendaftaran);
  if (elMateriRuang) elMateriRuang.textContent = fmt(record.materiRuang);
  if (elLatam1) elLatam1.textContent = fmt(record.latam1);
  if (elLatam2) elLatam2.textContent = fmt(record.latam2);
}

// Ekspos global agar bisa diakses onchange/onclick HTML
window.loadRekapRekrutmen = loadRekapRekrutmen;
window.changeTahunRekrutmen = changeTahunRekrutmen;
window.toggleCustomDropdownRekrutmen = toggleCustomDropdownRekrutmen;
window.selectCustomTahunRekrutmen = selectCustomTahunRekrutmen;

// ============================================================================
// NAVIGATION STACK & NATIVE ANDROID ACTIVITY BACK BUTTON
// ============================================================================
let pageNavigationHistory = ["beranda"];

function navigateBack() {
  if (document.activeElement && typeof document.activeElement.blur === "function") {
    document.activeElement.blur();
  }
  const btnBack = document.getElementById("btnHeaderBack");
  if (btnBack && typeof btnBack.blur === "function") btnBack.blur();

  if (pageNavigationHistory.length > 1) {
    pageNavigationHistory.pop(); // buang halaman aktif sekarang
    const prevPage = pageNavigationHistory[pageNavigationHistory.length - 1];
    showPage(prevPage, true);
  } else {
    showPage("beranda", true);
  }
}
window.navigateBack = navigateBack;

// Hilangkan sisa kotak outline fokus bawaan browser setelah tombol bundar diklik/disentuh
document.addEventListener("pointerup", (e) => {
  const btn = e.target && e.target.closest ? e.target.closest(".btn-header-back, button.rounded-full, button[onclick*='navigateBack'], button[onclick*='close']") : null;
  if (btn && typeof btn.blur === "function") {
    setTimeout(() => btn.blur(), 30);
  }
});

// Global hook untuk browser / hardware back button di Android
window.addEventListener("popstate", (e) => {
  if (e.state && e.state.page) {
    showPage(e.state.page, true);
  } else {
    navigateBack();
  }
});

function showPage(pageName, isBackNavigation = false) {
  if (!isLoggedIn && pageName !== "login") {
    pageName = "login";
  }

  // Update navigation stack & pushState untuk browser history
  if (!isBackNavigation && pageName !== "login") {
    if (pageNavigationHistory[pageNavigationHistory.length - 1] !== pageName) {
      pageNavigationHistory.push(pageName);
      try {
        history.pushState({ page: pageName }, "", "#" + pageName);
      } catch(e) {}
    }
  }

const pageActivityTitles = {
  "beranda": { subtitle: "UKM Paguyuban", title: "TEATER Q FSH UIN-SA" },
  "struktur": { subtitle: "Kepengurusan", title: "Struktur Pengurus" },
  "pengurus": { subtitle: "Lintas Periode", title: "Pengurus Sanggar" },
  "laporan-dana": { subtitle: "Transparansi", title: "Laporan Dana Abadi" },
  "laporan-sawer": { subtitle: "Bantuan & Hibah", title: "Dana Hibah Kegiatan" },
  "marketplace": { subtitle: "Katalog Usaha", title: "Q-Store & Lapak" },
  "anggota": { subtitle: "Basis Data", title: "Direktori Anggota" },
  "galeri": { subtitle: "Dokumentasi", title: "Galeri Sanggar" },
  "news": { subtitle: "Kabar Teater Q", title: "Warta & Berita" },
  "saran": { subtitle: "Aspirasi & Masukan", title: "Kotak Saran" },
  "arsip": { subtitle: "Perpustakaan Naskah", title: "Arsip Teater Q" },
  "mading": { subtitle: "Kreativitas Anggota", title: "Mading Sanggar" },
  "muter": { subtitle: "Agenda Rutin", title: "MUTER Teater Q" },
  "youtube": { subtitle: "Kanal Multimedia", title: "Teater Q TV" },
  "statistik": { subtitle: "Analitik Portal", title: "Trafik & Pengunjung" },
  "login": { subtitle: "Autentikasi", title: "Portal Internal" }
};

  // Bersihkan tombol kembali dobel di dalam halaman jika ada
  document.querySelectorAll(".btn-section-back").forEach(el => el.remove());

  // Dinamisasi Top App Bar Header (Opsi 3: Logo Swap + Judul Aktivitas Ala Gojek)
  const btnHeaderBack = document.getElementById("btnHeaderBack");
  const logoBox = document.getElementById("headerLogoContainer") || document.querySelector(".nav-left .logo");
  const subTitleEl = document.getElementById("navHeaderSubtitle");
  const mainTitleEl = document.getElementById("navHeaderTitle");

  const isHomeOrLogin = (pageName === "beranda" || pageName === "login");
  const actInfo = pageActivityTitles[pageName] || { subtitle: "Aktivitas", title: pageName.toUpperCase() };

  if (isHomeOrLogin) {
    if (btnHeaderBack) btnHeaderBack.style.display = "none";
    if (logoBox) logoBox.style.display = "";
    if (subTitleEl) subTitleEl.textContent = "UKM Paguyuban";
    if (mainTitleEl) mainTitleEl.textContent = "TEATER Q FSH UIN-SA";
  } else {
    // Di sub-halaman: Logo Teater Q berganti secara rapi menjadi tombol panah kembali [ ← ]
    if (logoBox) logoBox.style.display = "none";
    if (btnHeaderBack) btnHeaderBack.style.display = "inline-flex";
    if (subTitleEl) subTitleEl.textContent = actInfo.subtitle;
    if (mainTitleEl) mainTitleEl.textContent = actInfo.title;
  }

  // Bersihkan timer beranda tertunda saat berpindah halaman
  berandaTimers.forEach(t => clearTimeout(t));
  berandaTimers = [];
  if (newsCountdownInterval && pageName !== "beranda") {
    clearInterval(newsCountdownInterval);
    newsCountdownInterval = null;
  }

  document.querySelectorAll(".page").forEach(sec => {
    sec.style.display = (sec.dataset.page === pageName) ? "" : "none";
  });

  // Jika di halaman login, sembunyikan footer Akses Cepat agar layar bersih dan tidak ada scroll
  const footerKontak = document.getElementById("kontak-bawah");
  const floatingWidget = document.getElementById("qShopeeFloatingWidget");
  if (pageName === "login") {
    document.body.classList.add("is-login-page");
    if (footerKontak) footerKontak.style.display = "none";
    if (floatingWidget) floatingWidget.style.display = "none";
  } else {
    document.body.classList.remove("is-login-page");
    if (footerKontak) footerKontak.style.display = "";
    if (floatingWidget) floatingWidget.style.display = "";
  }

  document.querySelectorAll(".nav-menu a").forEach(a => {
    a.classList.toggle("active", a.dataset.page === pageName);
  });
  document.querySelectorAll(".bottom-nav-item").forEach(item => {
    item.classList.toggle("active", item.dataset.page === pageName);
  });

  document.body.classList.remove("nav-open");
  window.scrollTo({ top: 0, behavior: "auto" });

  // Lazy Load Per Page untuk Halaman Publik & Store
  if (pageName === "marketplace")   ensureMarketplaceLoaded();
  if (pageName === "galeri")        ensureGaleriLoaded();
  if (pageName === "news")          ensureNewsLoaded();
  if (pageName === "youtube")       ensureYoutubeLoaded();
  if (pageName === "mading")        ensureMadingLoaded();
  if (pageName === "muter")         ensureMuterLoaded();
  if (pageName === "laporan-dana")  ensureLaporanDanaLoaded();
  if (pageName === "laporan-sawer") ensureLaporanSawerLoaded();

  if (!isLoggedIn) return;

  // Lazy Load Per Page Khusus Anggota/Internal (Termasuk Statistik)
  if (pageName === "statistik")     loadPortalVisitorStats();
  if (pageName === "pengurus")      ensurePengurusLoaded();
  if (pageName === "struktur")      ensurePengurusLoaded();
  if (pageName === "news")          ensureNewsLoaded();
  if (pageName === "arsip")         ensureArsipLoaded();
  if (pageName === "mading")        ensureMadingLoaded();
  if (pageName === "muter")         ensureMuterLoaded();
  if (pageName === "anggota") {
    ensureAnggotaLoaded();
    if (anggotaData && anggotaData.length > 0) {
      populateWilayahFilter();
      populateAngkatanFilter();
      renderAnggota();
    }
  }
  if (pageName === "youtube") {
    ensureYoutubeLoaded();
    if (youtubeData && youtubeData.length > 0) {
      renderYoutube();
    }
  }
  if (pageName === "laporan-dana")  ensureLaporanDanaLoaded();
  if (pageName === "laporan-sawer") ensureLaporanSawerLoaded();

  if (pageName === "beranda") {
    renderMemoriam();
    if (!newsLoaded)     berandaTimers.push(setTimeout(() => ensureNewsLoaded(), 100));
    if (!keuanganLoaded) berandaTimers.push(setTimeout(() => ensureKeuanganLoaded(), 350));
    berandaTimers.push(setTimeout(() => loadDanaAbadi(), 600));
    if (!anggotaLoaded)  berandaTimers.push(setTimeout(() => ensureAnggotaLoaded(), 900));
    if (!prestasiLoaded) berandaTimers.push(setTimeout(() => ensurePrestasiLoaded(), 1400));
    if (!ketuaLoaded)    berandaTimers.push(setTimeout(() => ensureKetuaLoaded(), 1800));
  }
}

function scrollToSection(id) {
  const berandaPage = document.querySelector('.page[data-page="beranda"]');
  if (berandaPage && berandaPage.style.display === "none") {
    showPage("beranda");
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
    return;
  }
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ============================================================================
// 5. AUTENTIKASI (LOGIN / LOGOUT)
// ============================================================================
function checkGroupAccessAutoFill() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = (urlParams.get("ref") || urlParams.get("akses") || urlParams.get("from") || "").toLowerCase().trim();
    const hasGrupParam = ref === "grup" || ref === "group" || ref === "warga" || ref === "alumni" || ref === "wa" ||
                         urlParams.has("grup") || urlParams.has("group");

    if (!hasGrupParam) return;

    const uEl = document.getElementById("loginUsername");
    const pEl = document.getElementById("loginPassword");
    const badge = document.getElementById("badgeAksesGrup");
    const btn = document.getElementById("loginButton");

    if (uEl && pEl) {
      uEl.value = "Q";
      pEl.value = "1992";

      // Tambahkan highlight visual ramah
      uEl.classList.add("!border-emerald-500/70", "!bg-emerald-950/30", "text-emerald-300");
      pEl.classList.add("!border-emerald-500/70", "!bg-emerald-950/30", "text-emerald-300");

      if (badge) {
        badge.classList.remove("hidden");
      }

      if (btn) {
        btn.classList.add("animate-pulse", "!bg-emerald-600", "hover:!bg-emerald-500", "shadow-emerald-900/50");
        btn.innerHTML = '<i class="fas fa-sign-in-alt mr-1"></i> Masuk Sekarang';
      }

      showToast("Akses Grup Paguyuban terdeteksi! Mengarahkan masuk...", "success");

      // Bersihkan param URL secara elegan agar bilah browser tetap bersih
      try {
        const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + (window.location.hash || "");
        window.history.replaceState({ path: cleanUrl }, document.title, cleanUrl);
      } catch (e) {}

      // Masuk otomatis secara langsung ke Beranda tanpa perlu repot klik tombol
      setTimeout(() => {
        if (!isLoggedIn && typeof performDirectLogin === "function") {
          performDirectLogin("Keluarga Teater Q");
        }
      }, 300);
    }
  } catch (err) {
    console.warn("Auto-fill group access:", err);
  }
}
window.checkGroupAccessAutoFill = checkGroupAccessAutoFill;

function performDirectLogin(userName = "Keluarga Teater Q") {
  isLoggedIn = true;
  const sessionData = {
    status: "active",
    user: userName,
    loginAt: Date.now()
  };
  localStorage.setItem("tq_user_session", JSON.stringify(sessionData));
  document.documentElement.classList.add("tq-is-auth");
  document.documentElement.classList.remove("tq-is-guest");
  const navLoginLink = document.getElementById("navLoginLink");
  if (navLoginLink) navLoginLink.textContent = "Logout";
  showToast(`Selamat datang, ${userName}! Akses dibuka.`, "success");
  toggleAuthLinks(true);

  const badge = document.getElementById("badgeAksesGrup");
  if (badge) badge.classList.add("hidden");

  const uEl = document.getElementById("loginUsername");
  const pEl = document.getElementById("loginPassword");
  if (uEl) {
    uEl.classList.remove("!border-emerald-500/70", "!bg-emerald-950/30", "text-emerald-300");
    uEl.value = "";
  }
  if (pEl) {
    pEl.classList.remove("!border-emerald-500/70", "!bg-emerald-950/30", "text-emerald-300");
    pEl.value = "";
  }
  const btn = document.getElementById("loginButton");
  if (btn) {
    btn.classList.remove("animate-pulse", "!bg-emerald-600", "hover:!bg-emerald-500", "shadow-emerald-900/50");
    btn.innerHTML = '<i class="fas fa-sign-in-alt mr-1"></i> Masuk';
  }
  showPage("beranda");
}

async function handleLoginSubmit(event) {
  if (event) event.preventDefault();
  const uInput = (document.getElementById("loginUsername")?.value || "").trim();
  const pInput = document.getElementById("loginPassword")?.value || "";
  const btn = document.getElementById("loginButton");

  if (!btn) return;
  const textAsli = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i> Memeriksa...';
  btn.disabled = true;
  btn.style.opacity = "0.7";

  try {
    let dataLogin = [];
    try {
      dataLogin = await loadTSV(URL_LOGIN_DB);
      if (Array.isArray(dataLogin) && dataLogin.length > 0) {
        localStorage.setItem("tq_cached_login_db", JSON.stringify(dataLogin));
      }
    } catch (netErr) {
      console.warn("Gagal terhubung ke Google Sheets TSV online, mencoba cache lokal:", netErr);
      const cached = localStorage.getItem("tq_cached_login_db");
      if (cached) {
        try { dataLogin = JSON.parse(cached); } catch (e) {}
      }
      if (!dataLogin || !dataLogin.length) {
        // Fallback akun darurat offline (sesuai akun resmi di Google Sheet)
        dataLogin = [
          { Username: "Q", Password: "1992" },
          { Username: "admin", Password: "Q" },
          { Username: "anggota", Password: "Q" }
        ];
      }
    }

    const pInputHash = await hashSHA256(pInput);

    const userValid = dataLogin.find(row => {
      const sheetUser = (row["Username"] || row["USERNAME"] || "").trim();
      const sheetPass = (row["Password"] || row["PASSWORD"] || "").toString().trim();
      const userMatch = sheetUser.toLowerCase() === uInput.toLowerCase();
      const passMatch = (sheetPass === pInputHash) || (sheetPass === pInput);
      return userMatch && passMatch;
    }) || (uInput.toLowerCase() === "q" && (pInput === "1992" || pInputHash === "3f83e9ad5be63bd5bf2fd009fffe6b7dd4066243975bc962edc37459c17e65b9"));

    if (userValid) {
      performDirectLogin(uInput || "Q");
    } else {
      showToast("Username atau Password salah.", "error");
      const passField = document.getElementById("loginPassword");
      if (passField) {
        passField.classList.add("ring-2", "ring-red-500");
        setTimeout(() => passField.classList.remove("ring-2", "ring-red-500"), 500);
      }
    }
  } catch (err) {
    console.error("Login Error:", err);
    showToast("Terjadi kendala autentikasi: " + (err.message || "Gagal masuk"), "error");
  } finally {
    btn.innerHTML = textAsli;
    btn.disabled = false;
    btn.style.opacity = "1";
  }
}

function handleLogout() {
  isLoggedIn = false;
  localStorage.removeItem("tq_user_session");
  document.documentElement.classList.remove("tq-is-auth");
  document.documentElement.classList.add("tq-is-guest");

  const keysToRemove = [
    "tq_cache_anggota", "tq_cache_marketplace", "tq_cache_news",
    "tq_cache_galeri", "tq_cache_arsip", "tq_cache_arsip_v2", "tq_cache_arsip_live", "tq_cache_pengurus",
    "tq_cache_prestasi", "tq_cache_ketua", "tq_cache_dana_abadi",
    "tq_cache_youtube", "tq_cache_mutasi_dana"
  ];
  keysToRemove.forEach(k => localStorage.removeItem(k));

  anggotaData = []; marketplaceData = []; newsData = [];
  galeriData = []; arsipData = []; pengurusData = [];
  youtubeData = []; prestasiData = []; ketuaData = [];
  mutasiDanaData = [];

  const navLoginLink = document.getElementById("navLoginLink");
  if (navLoginLink) navLoginLink.textContent = "Login";

  const badge = document.getElementById("badgeAksesGrup");
  if (badge) badge.classList.add("hidden");
  const uEl = document.getElementById("loginUsername");
  const pEl = document.getElementById("loginPassword");
  if (uEl) {
    uEl.classList.remove("!border-emerald-500/70", "!bg-emerald-950/30", "text-emerald-300");
    uEl.value = "";
  }
  if (pEl) {
    pEl.classList.remove("!border-emerald-500/70", "!bg-emerald-950/30", "text-emerald-300");
    pEl.value = "";
  }
  const btn = document.getElementById("loginButton");
  if (btn) {
    btn.classList.remove("animate-pulse", "!bg-emerald-600", "hover:!bg-emerald-500", "shadow-emerald-900/50");
    btn.innerHTML = '<i class="fas fa-sign-in-alt mr-1"></i> Masuk';
  }

  showToast("Berhasil logout.", "success");
  toggleAuthLinks(false);
  showPage("login");
}

// ============================================================================
// 6. DANA ABADI & LAPORAN MUTASI
// ============================================================================
function updateDanaAbadiUI(d) {
  if (!d) return;
  const fmt = n => "Rp " + (Number(n) || 0).toLocaleString("id-ID");
  const infak = Number(d.infak !== undefined ? d.infak : (d.totalMasuk || 0)) || 0;
  const laba = Number(d.laba !== undefined ? d.laba : (d.labaUsaha || 0)) || 0;
  const distribusi = Number(d.distribusi !== undefined ? d.distribusi : (d.totalKeluar || 0)) || 0;
  const kembali = Number(d.kembali || 0);

  // Saldo Kas Pokok Abadi = Infak - Penyaluran + Pengembalian
  const totalKasPokok = d.saldoKas !== undefined ? Number(d.saldoKas) : (infak - distribusi + kembali);

  // 1. Sinkronkan Kartu Statistik di Beranda
  if (document.getElementById("abadiInfak")) document.getElementById("abadiInfak").textContent = fmt(infak);
  if (document.getElementById("abadiLaba")) document.getElementById("abadiLaba").textContent = fmt(laba);
  if (document.getElementById("abadiDistribusi")) document.getElementById("abadiDistribusi").textContent = fmt(distribusi);
  if (document.getElementById("abadiTotal")) document.getElementById("abadiTotal").textContent = fmt(totalKasPokok);

  // 2. Sinkronkan Kartu Statistik di Halaman Laporan Dana Abadi
  if (document.getElementById("lapTotalPokok")) document.getElementById("lapTotalPokok").textContent = fmt(infak);
  if (document.getElementById("lapTotalDistribusi")) document.getElementById("lapTotalDistribusi").textContent = fmt(distribusi);
  if (document.getElementById("lapTotalKembali")) document.getElementById("lapTotalKembali").textContent = fmt(kembali);
  if (document.getElementById("lapSaldoAkhir")) document.getElementById("lapSaldoAkhir").textContent = fmt(totalKasPokok);
  if (document.getElementById("lapTotalLaba")) document.getElementById("lapTotalLaba").textContent = fmt(laba);

  // 3. Update Progress Bar
  if (document.getElementById("abadiProgressBar")) {
    const target = Number(d.target) || 10000000;
    if (document.getElementById("abadiTargetNominal")) {
      document.getElementById("abadiTargetNominal").textContent = fmt(target);
    }
    const persen = (target > 0) ? (totalKasPokok / target) * 100 : 0;
    const persenBar = Math.min(100, Math.max(0, persen));
    document.getElementById("abadiProgressBar").style.width = persenBar + "%";
    if (document.getElementById("abadiPersenText")) {
      document.getElementById("abadiPersenText").textContent = persen.toFixed(1) + "% Tercapai";
    }
  }

  // 4. Update Running Text 10 Donatur Terakhir
  renderMarqueeDonatur();
  renderMarqueeSawer();
}

// ----------------------------------------------------------------------------
// RENDER LIVE MARQUEE RUNNING TEXT (10 DONATUR TERBARU DANA ABADI)
// ----------------------------------------------------------------------------
function renderMarqueeDonatur() {
  const track = document.getElementById("marqueeDonaturTrack");
  if (!track) return;

  function getVal(row, keyName, colIndex) {
    if (!row) return "";
    const matchedKey = Object.keys(row).find(k => k.trim().toLowerCase() === keyName.toLowerCase());
    if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== "") return row[matchedKey];
    const vals = Object.values(row);
    return vals[colIndex] !== undefined ? vals[colIndex] : "";
  }

  // Ambil mutasi dari memori atau fallback cache lokal
  let dataList = mutasiDanaData;
  if (!dataList || !dataList.length) {
    try {
      const cached = localStorage.getItem("tq_cache_mutasi_dana");
      if (cached) dataList = JSON.parse(cached);
    } catch(e) {}
  }

  if (!dataList || !dataList.length) {
    track.innerHTML = `<span class="opacity-80 flex items-center gap-1.5"><i class="fas fa-hand-holding-heart text-amber-300"></i> Mari salurkan iuran perdana untuk Dana Abadi Paguyuban Teater Q!</span>`;
    return;
  }

  // Filter HANYA transaksi donasi masuk khusus DANA ABADI (bukan saweran kegiatan/acara)
  const incomingDonations = dataList.filter(row => {
    const tipe = getVal(row, "tipe", 4).toString().toLowerCase();
    const kat = getVal(row, "kategori", 3).toString().toLowerCase();
    const isKeluar = tipe.includes("keluar") || kat.includes("penyaluran") || kat.includes("keluar") || kat.includes("distribusi");
    const isSawer = kat.includes("kegiatan") || kat.includes("acara") || kat.includes("sawer") || kat.includes("hibah");
    return !isKeluar && !isSawer;
  });

  if (!incomingDonations.length) {
    track.innerHTML = `<span class="opacity-80 flex items-center gap-1.5"><i class="fas fa-hand-holding-heart text-amber-300"></i> Mari salurkan iuran perdana untuk Dana Abadi Paguyuban Teater Q!</span>`;
    return;
  }

  // Urutkan berdasarkan tanggal & waktu (transaksi paling baru pertama)
  const sorted = [...incomingDonations].sort((a, b) => {
    const tglA = parseDateToTimestamp(getVal(a, "tanggal", 0));
    const tglB = parseDateToTimestamp(getVal(b, "tanggal", 0));
    return tglB - tglA;
  });

  // Ambil maksimal 10 donatur terakhir
  const latestTen = sorted.slice(0, 10);

  const itemsHtml = latestTen.map(row => {
    const nama = (getVal(row, "nama", 1) || getVal(row, "keterangan", 1) || "Hamba Allah").toString().trim();
    const angkatan = getVal(row, "angkatan", 2).toString().trim();
    const nominal = parseNumberRupiah(getVal(row, "nominal", 5));
    const pesanRaw = (getVal(row, "pesan", 6) || row.pesan || "").toString().trim();

    return `
      <span class="inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-full bg-black/40 border border-white/20 text-orange-50 font-medium hover:bg-black/60 transition">
        <i class="fas fa-heart text-red-400 text-[10px]"></i>
        <span class="font-bold text-yellow-200">${escapeHtml(nama)}</span>
        ${angkatan && angkatan !== '-' && angkatan.toLowerCase() !== 'null' ? `<span class="text-[10px] text-yellow-300/80 font-mono">(${escapeHtml(angkatan)})</span>` : ''}
        <span class="text-emerald-300 font-bold font-mono text-[11px] bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-500/25">${formatRupiah(nominal)}</span>
        ${pesanRaw ? `<span class="italic text-orange-100 text-[11px] opacity-90 max-w-[170px] truncate" title="${escapeHtml(pesanRaw)}">"${escapeHtml(pesanRaw)}"</span>` : ''}
      </span>
      <span class="text-white/40 text-xs select-none">•</span>
    `;
  }).join("");

  // Duplikasi 2x agar animasi marquee translateX(-50%) bergulir halus tanpa jeda
  track.innerHTML = itemsHtml + itemsHtml;
  applyConstantMarqueeSpeed(track, 30);
}
window.renderMarqueeDonatur = renderMarqueeDonatur;

// Mengembalikan kecepatan marquee running text ke acuan stabil yang sudah disetujui (tidak berubah-ubah)
function applyConstantMarqueeSpeed(trackEl) {
  if (!trackEl) return;
  trackEl.style.removeProperty("animation-duration");
  setupMarqueeIntersectionObserver();
}
window.applyConstantMarqueeSpeed = applyConstantMarqueeSpeed;

// Auto-pause marquee running text saat tidak terlihat di layar (menghemat 100% GPU/CPU saat scroll)
let marqueeIntersectionObserver = null;
function setupMarqueeIntersectionObserver() {
  if (typeof IntersectionObserver === "undefined") return;
  const tracks = document.querySelectorAll(".marquee-track, #marqueeDonaturTrack, #marqueeSawerTrack");
  if (!tracks || !tracks.length) return;

  if (!marqueeIntersectionObserver) {
    marqueeIntersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.animationPlayState = "";
        } else {
          entry.target.style.animationPlayState = "paused";
        }
      });
    }, { rootMargin: "150px 0px" });
  }

  tracks.forEach(track => {
    try { marqueeIntersectionObserver.observe(track); } catch(e){}
  });
}
window.setupMarqueeIntersectionObserver = setupMarqueeIntersectionObserver;

// ----------------------------------------------------------------------------
// RENDER LIVE MARQUEE RUNNING TEXT (10 SAWERAN TERBARU KEGIATAN)
// ----------------------------------------------------------------------------
function renderMarqueeSawer() {
  const track = document.getElementById("marqueeSawerTrack");
  if (!track) return;

  function getVal(row, keyName, colIndex) {
    if (!row) return "";
    const matchedKey = Object.keys(row).find(k => k.trim().toLowerCase() === keyName.toLowerCase());
    if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== "") return row[matchedKey];
    const vals = Object.values(row);
    return vals[colIndex] !== undefined ? vals[colIndex] : "";
  }

  // Ambil mutasi dari memori atau fallback cache lokal
  let dataList = mutasiDanaData;
  if (!dataList || !dataList.length) {
    try {
      const cached = localStorage.getItem("tq_cache_mutasi_dana");
      if (cached) dataList = JSON.parse(cached);
    } catch(e) {}
  }

  // Filter hanya transaksi sawer kegiatan / bantuan acara / dana hibah
  const sawerDonations = (dataList || []).filter(row => {
    const tipe = getVal(row, "tipe", 4).toString().toLowerCase();
    const kat = getVal(row, "kategori", 3).toString().toLowerCase();
    const isKeluar = tipe.includes("keluar") || kat.includes("penyaluran") || kat.includes("keluar") || kat.includes("distribusi");
    const isSawer = kat.includes("kegiatan") || kat.includes("acara") || kat.includes("sawer") || kat.includes("hibah");
    return !isKeluar && isSawer;
  });

  if (!sawerDonations.length) {
    const emptyMsg = `<span class="opacity-80 flex items-center gap-1.5"><i class="fas fa-gift text-pink-300"></i> Belum ada saweran / dana hibah masuk • Jadilah yang pertama menyawer adik-adik! ☕✨</span><span class="text-white/40 text-xs select-none">•</span>`;
    track.innerHTML = emptyMsg + emptyMsg;
    applyConstantMarqueeSpeed(track, 26);
    return;
  }

  // Urutkan kronologis menurun (transaksi paling baru pertama)
  const sorted = [...sawerDonations].sort((a, b) => {
    const tglA = parseDateToTimestamp(getVal(a, "tanggal", 0));
    const tglB = parseDateToTimestamp(getVal(b, "tanggal", 0));
    return tglB - tglA;
  });

  // Ambil maksimal 10 donatur sawer terakhir
  const latestTen = sorted.slice(0, 10);

  const itemsHtml = latestTen.map(row => {
    const nama = (getVal(row, "nama", 1) || getVal(row, "keterangan", 1) || "Hamba Allah").toString().trim();
    const angkatan = getVal(row, "angkatan", 2).toString().trim();
    const nominal = parseNumberRupiah(getVal(row, "nominal", 5));
    const pesanRaw = (getVal(row, "pesan", 6) || row.pesan || "").toString().trim();
    const kat = getVal(row, "kategori", 3).toString().toLowerCase();
    const isHibah = kat.includes("hibah");
    const iconTag = isHibah ? '<i class="fas fa-gift text-pink-300 text-[10px]"></i>' : '<i class="fas fa-gift text-cyan-300 text-[10px]"></i>';
    const nameColor = isHibah ? 'text-pink-200' : 'text-cyan-200';
    const hibahBadge = isHibah 
      ? `<span class="text-[9px] px-1 py-0.2 rounded bg-pink-950/80 text-pink-300 border border-pink-500/40 font-bold uppercase">Hibah</span>` 
      : `<span class="text-[9px] px-1 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 font-bold uppercase">Hibah Acara</span>`;

    return `
      <span class="inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-full bg-black/35 border border-white/20 shadow-sm text-white font-medium hover:bg-black/50 transition">
        ${iconTag}
        <span class="font-extrabold ${nameColor} drop-shadow-sm">${escapeHtml(nama)}</span>
        ${hibahBadge}
        ${angkatan && angkatan !== '-' && angkatan.toLowerCase() !== 'null' ? `<span class="text-[10px] text-white/70 font-mono">(${escapeHtml(angkatan)})</span>` : ''}
        <span class="text-emerald-300 font-extrabold font-mono text-[11px] bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-500/40">${formatRupiah(nominal)}</span>
        ${pesanRaw ? `<span class="italic text-cyan-100/90 text-[11px] opacity-90 max-w-[170px] truncate" title="${escapeHtml(pesanRaw)}">"${escapeHtml(pesanRaw)}"</span>` : ''}
      </span>
      <span class="text-white/40 text-xs select-none">•</span>
    `;
  }).join("");

  // Duplikasi dinamis agar track selalu terisi penuh tanpa ruang kosong melompong (selalu kelipatan genap agar looping -50% mulus tanpa jeda)
  let repeated = itemsHtml;
  if (latestTen.length === 1) {
    repeated = itemsHtml.repeat(6);
  } else if (latestTen.length === 2) {
    repeated = itemsHtml.repeat(4);
  } else if (latestTen.length <= 4) {
    repeated = itemsHtml.repeat(4);
  } else {
    repeated = itemsHtml.repeat(2);
  }
  track.innerHTML = repeated;
  applyConstantMarqueeSpeed(track, 26);
  updateSawerAcaraTotal();
}
window.renderMarqueeSawer = renderMarqueeSawer;

// Helper: Dapatkan nama agenda terdekat secara sinkron & aman tanpa race condition
function getActiveEventTargetName(providedName) {
  if (providedName && typeof providedName === 'string' && providedName.trim()) {
    return providedName.trim();
  }
  if (window.currentActiveEvent && window.currentActiveEvent.title) {
    return window.currentActiveEvent.title.trim();
  }
  const titleEl = document.getElementById("countdownEventTitle");
  if (titleEl && titleEl.textContent && !titleEl.textContent.includes("Memuat")) {
    return titleEl.textContent.trim();
  }
  try {
    const cachedNews = localStorage.getItem("tq_cache_news");
    if (cachedNews) {
      const parsed = JSON.parse(cachedNews);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const now = Date.now();
        const upcoming = parsed.filter(item => {
          const t = item.time || (item.tanggal ? new Date(item.tanggal).getTime() : 0);
          return t >= now;
        });
        const getTitle = it => it["NAMA KEGIATAN"] || it.title || it.judul || it.Nama || "";
        if (upcoming.length > 0 && getTitle(upcoming[0])) {
          return getTitle(upcoming[0]).trim();
        }
        const temuItem = parsed.find(it => /temu\s*anggota/i.test(getTitle(it)));
        if (temuItem && getTitle(temuItem)) {
          return getTitle(temuItem).trim();
        }
        if (parsed[0] && getTitle(parsed[0])) {
          return getTitle(parsed[0]).trim();
        }
      }
    }
  } catch(e) {}
  return "Temu Anggota 2026";
}
window.getActiveEventTargetName = getActiveEventTargetName;

// Hitung & Update Saldo Terkumpul Saweran untuk Acara Tertentu
function updateSawerAcaraTotal(eventName) {
  const totalEl = document.getElementById("sawerAcaraTotal");
  const countEl = document.getElementById("sawerAcaraCount");
  if (!totalEl) return;

  const targetName = getActiveEventTargetName(eventName);

  function getVal(row, keyName, colIndex) {
    if (!row) return "";
    const matchedKey = Object.keys(row).find(k => k.trim().toLowerCase() === keyName.toLowerCase());
    if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== "") return row[matchedKey];
    const vals = Object.values(row);
    return vals[colIndex] !== undefined ? vals[colIndex] : "";
  }

  let dataList = mutasiDanaData;
  if (!dataList || !dataList.length) {
    try {
      const cached = localStorage.getItem("tq_cache_mutasi_dana");
      if (cached) dataList = JSON.parse(cached);
    } catch(e) {}
  }

  const cleanEvent = (targetName || "").toLowerCase().trim();
  const isEventPast = window.currentActiveEventIsPast || false;

  let totalSemua = 0;
  let countSemua = 0;
  let totalKhususAcara = 0;
  let countKhususAcara = 0;

  // Hitung akumulasi dana hibah & bantuan kegiatan
  (dataList || []).forEach(row => {
    const tipe = getVal(row, "tipe", 4).toString().toLowerCase();
    const kat = getVal(row, "kategori", 3).toString().toLowerCase();
    const peruntukan = (row.peruntukan || row.Peruntukan || getVal(row, "peruntukan", -1) || "").toString().toLowerCase();
    const fullText = (kat + " " + peruntukan).trim();
    const isKeluar = tipe.includes("keluar") || kat.includes("penyaluran") || kat.includes("keluar") || kat.includes("distribusi");
    const isSawerOrHibah = fullText.includes("kegiatan") || fullText.includes("acara") || fullText.includes("sawer") || fullText.includes("hibah");

    if (!isKeluar && isSawerOrHibah) {
      const nominal = parseNumberRupiah(getVal(row, "nominal", 5));
      totalSemua += nominal;
      countSemua++;

      const isForThisEvent = cleanEvent && (
        fullText.includes(cleanEvent) || 
        cleanEvent.includes(kat.replace(/^bantuan (khusus )?kegiatan:\s*/i, '').replace(/^dana hibah:\s*/i, '').trim()) ||
        (cleanEvent.includes("temu anggota") && fullText.includes("temu anggota"))
      );
      if (isForThisEvent) {
        totalKhususAcara += nominal;
        countKhususAcara++;
      }
    }
  });

  const labelEl = document.getElementById("sawerAcaraLabel");
  const subLabelEl = document.getElementById("sawerAcaraSubLabel");

  if (targetName && totalKhususAcara > 0) {
    // Pada kartu hitung mundur agenda aktif (misal: Temu Anggota):
    // Angka utama HANYA menghitung donasi khusus agenda ini
    totalEl.textContent = formatRupiah(totalKhususAcara);
    if (countEl) {
      countEl.textContent = countKhususAcara > 0 ? `${countKhususAcara} donasi agenda` : "Belum ada donasi agenda";
    }
    if (labelEl) {
      labelEl.textContent = "Bantuan Kegiatan";
    }
    if (subLabelEl) {
      subLabelEl.textContent = totalSemua > 0 ? `Total Hibah: ${formatRupiah(totalSemua)}` : "Dukungan Acara";
    }
  } else {
    // Jika agenda telah usai / tidak ada agenda khusus:
    totalEl.textContent = formatRupiah(totalSemua);
    if (countEl) {
      countEl.textContent = countSemua > 0 ? `${countSemua} donasi masuk` : "Belum ada donasi masuk";
    }
    if (labelEl) {
      labelEl.textContent = "Dana Hibah Terkumpul";
    }
    if (subLabelEl) {
      subLabelEl.textContent = "Operasional & Kas Sanggar";
    }
  }
}
window.updateSawerAcaraTotal = updateSawerAcaraTotal;

// Smart Scroll Optimizer: Dijalankan murni via CSS GPU Layer (will-change & translate3d) tanpa interupsi main-thread


// Penambahan Instan Lokal (Optimistic UI Update) begitu formulir infak disubmit
function tambahInfakLokal({ nama, angkatan, nominal, pesan, kategori }) {
  const cacheKeyAbadi = "tq_cache_dana_abadi";
  const cacheKeyMutasi = "tq_cache_mutasi_dana";
  const katFinal = kategori || "Infak Dana Abadi";
  const isSawer = katFinal.toLowerCase().includes("kegiatan") || katFinal.toLowerCase().includes("acara") || katFinal.toLowerCase().includes("sawer") || katFinal.toLowerCase().includes("hibah");

  // 1. Tambah akumulasi ke Summary Widget Beranda HANYA JIKA donasi dana abadi (dana kegiatan & hibah tidak mengganggu pokok abadi)
  if (!isSawer) {
    let currentAbadi = { infak: 0, laba: 0, distribusi: 0, total: 0, target: 10000000 };
    const rawAbadi = localStorage.getItem(cacheKeyAbadi);
    if (rawAbadi) {
      try { currentAbadi = { ...currentAbadi, ...JSON.parse(rawAbadi) }; } catch(e){}
    }

    currentAbadi.infak = (currentAbadi.infak || 0) + nominal;
    currentAbadi.total = ((currentAbadi.infak || 0) + (currentAbadi.laba || 0)) - (currentAbadi.distribusi || 0);
    localStorage.setItem(cacheKeyAbadi, JSON.stringify(currentAbadi));
    updateDanaAbadiUI(currentAbadi);
  }

  // 2. Tambah baris transaksi baru ke tabel Laporan Dana Abadi
  const now = new Date();
  const tglStr = String(now.getDate()).padStart(2, '0') + '/' + 
                 String(now.getMonth() + 1).padStart(2, '0') + '/' + 
                 now.getFullYear() + ' ' + 
                 String(now.getHours()).padStart(2, '0') + ':' + 
                 String(now.getMinutes()).padStart(2, '0');

  const itemBaru = {
    tanggal: tglStr,
    nama: nama || "Hamba Allah",
    angkatan: angkatan || "",
    nominal: nominal,
    pesan: pesan || "",
    keterangan: nama || "Hamba Allah",
    kategori: katFinal,
    tipe: "masuk"
  };

  mutasiDanaData.push(itemBaru);
  localStorage.setItem(cacheKeyMutasi, JSON.stringify(mutasiDanaData));
  mutasiDanaLoaded = true;
  renderLaporanDana();
  if (typeof renderLaporanSawer === 'function') renderLaporanSawer();
  renderMarqueeDonatur();
  renderMarqueeSawer();
  if (typeof updateSawerAcaraTotal === 'function') updateSawerAcaraTotal();
}

// Pengiriman Notifikasi Instan ke Telegram Admin (0% Beban Server/Netlify)
function kirimNotifTelegramInfak(data) {
  try {
    const token = (typeof TELEGRAM_CONFIG !== 'undefined' && TELEGRAM_CONFIG.token) ? TELEGRAM_CONFIG.token : "8739096476:AAGGkVPC8aqFnnIwq9sKaM4R1_zMVDDil8o";
    const chatId = (typeof TELEGRAM_CONFIG !== 'undefined' && TELEGRAM_CONFIG.chatId) ? TELEGRAM_CONFIG.chatId : "-5347239531";
    const waktu = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
    const nominalFmt = formatRupiah(data.nominal || 0);

    const safeNama = escapeHtml(data.nama || "Hamba Allah");
    const safeAngkatan = data.angkatan ? escapeHtml(data.angkatan) : '';
    const safePesan = data.pesan ? escapeHtml(data.pesan) : '';
    const safeKat = data.kategori ? escapeHtml(data.kategori) : 'Infak Dana Abadi';
    const isHibah = safeKat.toLowerCase().includes("hibah");
    const isSawer = safeKat.toLowerCase().includes("kegiatan") || safeKat.toLowerCase().includes("acara") || safeKat.toLowerCase().includes("sawer") || isHibah;
    const bukti = data.buktiUrl ? `🧾 <b>Bukti Transfer:</b> <a href="${data.buktiUrl}">Buka Foto di Drive</a>\n` : '';

    let headerIcon = `🔔 <b>DONASI DANA ABADI MASUK!</b>`;
    if (isHibah) {
      headerIcon = `🎁 <b>DANA HIBAH & HARAPAN SENIOR MASUK!</b>`;
    } else if (isSawer) {
      headerIcon = `🎁 <b>DANA HIBAH KEGIATAN MASUK!</b>`;
    }

    const teks = `${headerIcon}\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `📌 <b>Kategori:</b> ${safeKat}\n` +
      `👤 <b>Donatur:</b> ${safeNama}\n` +
      (safeAngkatan ? `🎓 <b>Angkatan:</b> ${safeAngkatan}\n` : '') +
      `💰 <b>Nominal:</b> ${nominalFmt}\n` +
      (safePesan ? `📝 <b>Pesan/Doa:</b> "${safePesan}"\n` : '') +
      bukti +
      `⏰ <b>Waktu:</b> ${waktu} WIB\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `<i>Tercatat otomatis di Portal Teater Q ✨</i>`;

    fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: teks,
        parse_mode: "HTML"
      })
    }).catch(err => console.warn("Notif Telegram:", err));
  } catch (e) {
    console.warn("Telegram error:", e);
  }
}

let danaAbadiLoading = false;
let lastDanaAbadiSyncTime = 0;
let lastDanaAbadiHash = "";
let autoSyncDanaInterval = null;

async function loadDanaAbadi(force = false) {
  const cacheKeyAbadi = "tq_cache_dana_abadi";
  const cacheKeyMutasi = "tq_cache_mutasi_dana";

  // 1. Tampilkan cache lokal instan (0 detik) dengan Self-Healing Auto-Purge
  const rawAbadi = localStorage.getItem(cacheKeyAbadi);
  if (rawAbadi && !lastDanaAbadiHash) {
    try {
      const parsed = JSON.parse(rawAbadi);
      // Self-healing: jika cache lokal masih menyimpan angka stale (bekas bug GAS), buang otomatis
      if (parsed && (Number(parsed.infak || 0) > 2000000 || Number(parsed.total || 0) > 2000000)) {
        localStorage.removeItem(cacheKeyAbadi);
      } else {
        updateDanaAbadiUI(parsed);
        lastDanaAbadiHash = JSON.stringify(parsed);
      }
    } catch(e){}
  }

  const rawMutasi = localStorage.getItem(cacheKeyMutasi);
  if (rawMutasi && mutasiDanaData.length === 0) {
    try {
      const parsed = JSON.parse(rawMutasi);
      if (Array.isArray(parsed)) {
        mutasiDanaData = parsed;
        mutasiDanaLoaded = true;
        if (typeof renderLaporanDana === 'function') renderLaporanDana();
        if (typeof renderLaporanSawer === 'function') renderLaporanSawer();
      }
    } catch(e){}
  }

  if (danaAbadiLoading && !force) return;
  danaAbadiLoading = true;

  try {
    let newData = null;
    let newMutasi = null;
    let isFromSupabase = false;

    // 1. PRIORITAS UTAMA: Cloud Database Supabase (Kecepatan 30ms & Data Resmi)
    if (window.SupabaseDB && window.SupabaseDB.isConfigured()) {
      try {
        const [sbAbadi, sbHibah] = await Promise.all([
          window.SupabaseDB.getDanaAbadi().catch(e => { console.warn("[Supabase] Tarik dana abadi:", e); return null; }),
          window.SupabaseDB.getDanaHibah().catch(e => { console.warn("[Supabase] Tarik dana hibah:", e); return null; })
        ]);

        if (sbAbadi && sbAbadi.success && sbAbadi.summary) {
          newData = sbAbadi.summary;
          const abadiMutasi = Array.isArray(sbAbadi.mutasi) ? sbAbadi.mutasi : [];
          const hibahMutasi = (sbHibah && Array.isArray(sbHibah.mutasi)) ? sbHibah.mutasi : [];
          newMutasi = [...abadiMutasi, ...hibahMutasi];
          isFromSupabase = true;
        }
      } catch (errSb) {
        console.warn("[Supabase] Gagal membaca data kas, fallback ke Google:", errSb);
      }
    }

    // 2. JALUR CADANGAN: Google Apps Script jika Supabase tidak terhubung
    if (!isFromSupabase) {
      const separator = URL_DANA_ABADI.includes('?') ? '&' : '?';
      let resp = null;
      try {
        resp = await fetch(URL_DANA_ABADI + separator + "t=" + Date.now(), { cache: "no-store" });
      } catch (errFirst) {
        resp = await fetch(URL_DANA_ABADI);
      }
      if (resp && resp.ok) {
        const text = await resp.text();
        if (text.trim().startsWith("{")) {
          const json = JSON.parse(text);
          if (json) {
            if (json.summary) {
              newData = json.summary;
              if (json.labaUsaha !== undefined && newData.laba === undefined) newData.laba = json.labaUsaha;
              if (json.totalMasuk !== undefined && newData.infak === undefined) newData.infak = json.totalMasuk;
              if (json.totalKeluar !== undefined && newData.distribusi === undefined) newData.distribusi = json.totalKeluar;
              if (json.saldoKas !== undefined && newData.total === undefined) newData.total = json.saldoKas;
            } else if (json.infak !== undefined || json.totalMasuk !== undefined) {
              newData = {
                infak: json.infak !== undefined ? json.infak : (json.totalMasuk || 0),
                laba: json.laba !== undefined ? json.laba : (json.labaUsaha || 0),
                distribusi: json.distribusi !== undefined ? json.distribusi : (json.totalKeluar || 0),
                total: json.saldoKas !== undefined ? json.saldoKas : 0,
                target: 10000000
              };
            }
            if (Array.isArray(json.mutasi)) {
              newMutasi = json.mutasi;
            }
          }
        }
      }
    }

    let mutasiChanged = false;
    if (Array.isArray(newMutasi) && newMutasi.length > 0) {
      const oldJson = JSON.stringify(mutasiDanaData);
      const nextJson = JSON.stringify(newMutasi);
      if (oldJson !== nextJson) {
        mutasiDanaData = newMutasi;
        localStorage.setItem(cacheKeyMutasi, nextJson);
        mutasiDanaLoaded = true;
        mutasiChanged = true;
      }
    }

    // Diff Checking: Render DOM
    if (newData) {
      const newHash = JSON.stringify(newData);
      if (newHash !== lastDanaAbadiHash || mutasiChanged || force) {
        lastDanaAbadiHash = newHash;
        localStorage.setItem(cacheKeyAbadi, newHash);
        updateDanaAbadiUI(newData);
        if (typeof renderLaporanDana === 'function') renderLaporanDana();
        if (typeof renderLaporanSawer === 'function') renderLaporanSawer();
        if (typeof renderMarqueeSawer === 'function') renderMarqueeSawer();
        if (typeof updateSawerAcaraTotal === 'function') updateSawerAcaraTotal();
      }
    }

    lastDanaAbadiSyncTime = Date.now();
  } catch (e) {
    lastDanaAbadiSyncTime = Date.now();
  } finally {
    danaAbadiLoading = false;
  }
}

// Inisialisasi Smart Auto-Sync & Realtime WebSocket Supabase
let realtimeListenersAttached = false;
function initSmartAutoSyncDana() {
  if (autoSyncDanaInterval) clearInterval(autoSyncDanaInterval);

  // 1. Hubungkan ke Supabase Realtime Listener (0 Detik Delay)
  if (window.SupabaseDB && !realtimeListenersAttached) {
    realtimeListenersAttached = true;
    window.SupabaseDB.init();
    window.SupabaseDB.setupRealtimeListeners();

    window.SupabaseDB.onDanaAbadiChange((payload) => {
      console.log("[Portal Anggota] Realtime Dana Abadi mendeteksi perubahan dari Admin! Menyinkronkan...", payload);
      loadDanaAbadi(true);
    });

    window.SupabaseDB.onDanaHibahChange((payload) => {
      console.log("[Portal Anggota] Realtime Dana Hibah mendeteksi perubahan dari Admin! Menyinkronkan...", payload);
      loadDanaAbadi(true);
    });

    window.SupabaseDB.onMadingChange((payload) => {
      if (!payload || !['INSERT', 'UPDATE', 'DELETE'].includes(payload.eventType)) return;
      console.log("[Portal Anggota] Realtime Mading mendeteksi karya baru/perubahan!", payload);
      try { localStorage.removeItem("tq_cache_mading"); } catch(e){}
      madingLoaded = false;
      if (typeof ensureMadingLoaded === "function") {
        ensureMadingLoaded(false);
      }
    });

    window.SupabaseDB.onMuterChange((payload) => {
      if (!payload || !['INSERT', 'UPDATE', 'DELETE'].includes(payload.eventType)) return;
      console.log("[Portal Anggota] Realtime MUTER mendeteksi berkas persidangan baru/perubahan!", payload);
      try { localStorage.removeItem("tq_cache_portal_muter"); } catch(e){}
      portalMuterLoaded = false;
      if (typeof ensureMuterLoaded === "function") {
        ensureMuterLoaded(true);
      }
    });
  }

  // 2. Polling cadangan berkala setiap 60 detik HANYA jika tab sedang aktif dilihat
  autoSyncDanaInterval = setInterval(() => {
    if (document.hidden) return;
    if (!navigator.onLine) return;
    if (danaAbadiLoading) return;

    loadDanaAbadi(false);
  }, 60000);

  // 3. Event VisibilityChange: Saat ANGGOTA membuka kembali tab di HP
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && navigator.onLine) {
      if (Date.now() - lastDanaAbadiSyncTime > 15000) {
        loadDanaAbadi(false);
      }
    }
  });
}

window.loadDanaAbadi = loadDanaAbadi;
window.initSmartAutoSyncDana = initSmartAutoSyncDana;

function checkIsEventFinished(eventName) {
  // 1. Cek dari window.currentActiveEvent
  if (window.currentActiveEvent) {
    const actTitle = (window.currentActiveEvent.title || "").toLowerCase();
    const qName = (eventName || "").toLowerCase();
    if (!eventName || actTitle.includes(qName) || qName.includes(actTitle)) {
      if (window.currentActiveEventIsPast) return true;
      if (window.currentActiveEvent.time && window.currentActiveEvent.time <= Date.now()) return true;
    }
  }

  // 2. Cek di newsData
  if (Array.isArray(newsData) && newsData.length > 0) {
    const qName = (eventName || "").toLowerCase();
    const matched = newsData.find(item => {
      const t = (item["NAMA KEGIATAN"] || "").toLowerCase();
      return t.includes(qName) || qName.includes(t);
    });
    if (matched) {
      const tTime = parseDateToTimestamp(matched["TANGGAL KEGIATAN"]);
      if (tTime > 0 && tTime <= Date.now()) return true;
      const status = (matched["STATUS"] || matched["KETERANGAN"] || "").toLowerCase();
      if (status.includes("selesai") || status.includes("terlaksana") || status.includes("sukses")) return true;
    }
  }

  return false;
}
window.checkIsEventFinished = checkIsEventFinished;

function openInfakModal() {
  const modal = document.getElementById("infakModal");
  const formBox = document.getElementById("infakFormContainer");
  const successBox = document.getElementById("infakSuccessContainer");
  const closedBox = document.getElementById("infakClosedContainer");

  if (formBox) formBox.style.display = "block";
  if (successBox) successBox.style.display = "none";
  if (closedBox) closedBox.style.display = "none";

  const containerPeruntukan = document.getElementById("containerPeruntukanHibah");
  if (containerPeruntukan) containerPeruntukan.style.display = "none";
  const customInput = document.getElementById("inputPeruntukanHibahLain");
  if (customInput) {
    customInput.style.display = "none";
    customInput.classList.add("hidden");
    customInput.value = "";
  }

  // 1. Reset ke mode Dana Abadi
  const inputKat = document.getElementById("inputKategoriInfak");
  if (inputKat) inputKat.value = "Infak";

  const headerBar = document.getElementById("modalInfakHeaderBar");
  if (headerBar) headerBar.className = "min-h-[64px] h-16 px-4 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 flex items-center justify-between sticky top-0 z-30 shrink-0";
  
  const iconEl = document.getElementById("modalInfakHeaderIcon");
  if (iconEl) iconEl.innerHTML = '<i class="fa-solid fa-hand-holding-heart text-amber-400"></i>';

  const titleEl = document.getElementById("modalInfakTitle");
  if (titleEl) titleEl.textContent = "Infak Dana Abadi Teater Q";

  const subtitleEl = document.getElementById("modalInfakSubtitle");
  if (subtitleEl) subtitleEl.textContent = '"Dari Teater Q, Oleh Teater Q, Untuk Teater Q"';

  renderModalGuideBox();

  // QRIS Resmi Dana Abadi
  const imgQris = document.getElementById("imgQrisDanaAbadi");
  if (imgQris) {
    imgQris.src = (typeof CONFIG_INFO !== "undefined" && CONFIG_INFO.urlQRIS) ? CONFIG_INFO.urlQRIS : "assets/qris-dana-abadi.jpg";
    imgQris.alt = "QRIS Dana Abadi";
  }
  const labelQris = document.getElementById("labelQrisBadge");
  if (labelQris) {
    labelQris.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-black uppercase tracking-wide";
    labelQris.innerHTML = '<i class="fas fa-qrcode text-emerald-600"></i> QRIS RESMI DANA ABADI TEATER Q';
  }
  const btnDownload = document.getElementById("btnDownloadQRIS");
  if (btnDownload) {
    btnDownload.className = "py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-extrabold inline-flex items-center gap-2 shadow-md transition-all cursor-pointer";
  }

  // Rekening Khusus Dana Abadi
  const elNamaBankInfak = document.getElementById("labelNamaBankInfak");
  if (elNamaBankInfak) elNamaBankInfak.textContent = CONFIG_INFO.namaBank || "Bank Jago";
  const elNoRekInfak = document.getElementById("noRekDanaAbadi");
  if (elNoRekInfak) elNoRekInfak.textContent = CONFIG_INFO.noRekening || "101059023607";
  const elAnInfak = document.getElementById("labelAtasNamaInfak");
  if (elAnInfak) elAnInfak.textContent = (CONFIG_INFO.atasNama || "Ely Dwi Asih (Bendahara Teater Q)").toUpperCase();
  const titleTf = document.getElementById("labelTransferManualTitle");
  if (titleTf) titleTf.textContent = "Atau Transfer Rekening Dana Abadi:";
  const subRek = document.getElementById("labelNomorRekeningSub");
  if (subRek) subRek.textContent = "Nomor Rekening Dana Abadi:";

  const formTitle = document.getElementById("labelFormTitle");
  if (formTitle) formTitle.innerHTML = '<i class="fas fa-clipboard-check text-emerald-600"></i> Form Konfirmasi Donasi';

  const labelPesan = document.getElementById("labelPesanInfak");
  if (labelPesan) labelPesan.textContent = "Pesan, Doa & Harapan (Opsional)";

  const inputPesan = document.getElementById("inputPesanInfak");
  if (inputPesan) inputPesan.placeholder = "Tuliskan doa atau harapan untuk kemajuan Paguyuban Teater Q...";

  const labelSubmit = document.getElementById("labelSubmitInfak");
  if (labelSubmit) labelSubmit.textContent = "Kirim Konfirmasi Infak";

  const btnSubmit = document.getElementById("btnSubmitInfak");
  if (btnSubmit) btnSubmit.className = "w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-extrabold rounded-xl text-sm sm:text-base shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer";

  // Chip standar
  const chipContainer = document.getElementById("chipContainerInfak");
  if (chipContainer) {
    chipContainer.innerHTML = `
      <button type="button" onclick="selectInfakPreset(5000, this)" class="btn-nominal-chip py-2.5 px-2 rounded-xl bg-slate-100 hover:bg-emerald-100 text-slate-800 font-extrabold text-xs sm:text-sm border border-slate-300 transition-all text-center">Rp 5.000</button>
      <button type="button" onclick="selectInfakPreset(10000, this)" class="btn-nominal-chip py-2.5 px-2 rounded-xl bg-slate-100 hover:bg-emerald-100 text-slate-800 font-extrabold text-xs sm:text-sm border border-slate-300 transition-all text-center">Rp 10.000</button>
      <button type="button" onclick="selectInfakPreset(25000, this)" class="btn-nominal-chip py-2.5 px-2 rounded-xl bg-slate-100 hover:bg-emerald-100 text-slate-800 font-extrabold text-xs sm:text-sm border border-slate-300 transition-all text-center">Rp 25.000</button>
      <button type="button" onclick="selectInfakPreset(50000, this)" class="btn-nominal-chip py-2.5 px-2 rounded-xl bg-slate-100 hover:bg-emerald-100 text-slate-800 font-extrabold text-xs sm:text-sm border border-slate-300 transition-all text-center">Rp 50.000</button>
      <button type="button" onclick="selectInfakPreset(100000, this)" class="btn-nominal-chip py-2.5 px-2 rounded-xl bg-slate-100 hover:bg-emerald-100 text-slate-800 font-extrabold text-xs sm:text-sm border border-slate-300 transition-all text-center">Rp 100.000</button>
      <button type="button" onclick="selectInfakPreset(0, this)" class="btn-nominal-chip py-2.5 px-2 rounded-xl bg-emerald-600 text-white font-extrabold text-xs sm:text-sm border border-emerald-600 transition-all text-center shadow-sm">Nominal Bebas</button>
    `;
  }

  showInfakModalDialog();
}

function renderModalGuideBox() {
  const guideBox = document.getElementById("modalInfakQuoteBox");
  if (!guideBox) return;
  guideBox.className = "bg-amber-500/10 border border-amber-500/25 rounded-2xl p-3.5 space-y-2.5 text-xs text-slate-200";
  guideBox.style.color = "";
  guideBox.innerHTML = `
    <div class="flex items-center gap-2 mb-1.5">
      <div class="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xs">
        <i class="fa-solid fa-lightbulb"></i>
      </div>
      <h5 class="text-xs sm:text-sm font-extrabold text-amber-400 tracking-wide">Petunjuk Pembayaran &amp; Konfirmasi:</h5>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
      <div class="flex items-start gap-2.5 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
        <span class="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">1</span>
        <div class="leading-relaxed text-slate-300">
          <strong class="block font-bold text-white text-xs">Transfer / Scan QRIS:</strong>
          <span class="text-slate-400 text-[11px] block mt-0.5">Transfer ke rekening atau scan gambar QRIS di bawah ini.</span>
        </div>
      </div>
      <div class="flex items-start gap-2.5 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
        <span class="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">2</span>
        <div class="leading-relaxed text-slate-300">
          <strong class="block font-bold text-white text-xs">Isi Data Konfirmasi:</strong>
          <span class="text-slate-400 text-[11px] block mt-0.5">Setelah transfer, isi data konfirmasi di bawah <em>(unggah struk opsional)</em>.</span>
        </div>
      </div>
    </div>
  `;
}

function handlePeruntukanHibahChange(sel) {
  const customInput = document.getElementById("inputPeruntukanHibahLain");
  const noteBox = document.getElementById("notePeruntukanHibah");
  const val = sel ? sel.value : "";

  if (customInput) {
    if (val === "Lainnya") {
      customInput.style.display = "block";
      customInput.classList.remove("hidden");
      customInput.focus();
    } else {
      customInput.style.display = "none";
      customInput.classList.add("hidden");
      customInput.value = "";
    }
  }

  if (noteBox) {
    if (val.toLowerCase().includes("bantuan") || val.toLowerCase().includes("kegiatan") || val.toLowerCase().includes("acara") || val.toLowerCase().includes("temu") || val.toLowerCase().includes("pentas")) {
      const cleanName = val.replace(/^bantuan (khusus )?(kegiatan|acara):\s*/i, '');
      noteBox.className = "text-[11px] font-semibold text-purple-900 bg-purple-100/80 px-2.5 py-1.5 rounded-lg border border-purple-200 mt-1 block";
      noteBox.innerHTML = '<i class="fas fa-gift text-purple-600 mr-1 animate-pulse"></i> 100% dialokasikan khusus untuk kelancaran kegiatan <strong>' + escapeHtml(cleanName) + '</strong>.';
    } else if (val === "Lainnya") {
      noteBox.className = "text-[11px] font-semibold text-pink-900 bg-pink-100/80 px-2.5 py-1.5 rounded-lg border border-pink-200 mt-1 block";
      noteBox.innerHTML = '<i class="fas fa-gift text-pink-600 mr-1 animate-pulse"></i> Amanah dana hibah akan disalurkan sesuai peruntukan khusus yang Anda tentukan.';
    } else {
      noteBox.className = "text-[11px] font-semibold text-pink-900 bg-pink-100/80 px-2.5 py-1.5 rounded-lg border border-pink-200 mt-1 block";
      noteBox.innerHTML = '<i class="fas fa-gift text-pink-600 mr-1 animate-pulse"></i> Dana hibah ini dialokasikan untuk <strong>' + escapeHtml(val) + '</strong>.';
    }
  }
}
window.handlePeruntukanHibahChange = handlePeruntukanHibahChange;

function openSawerKegiatanModal(eventName, isHibahForce = false) {
  if (!eventName) {
    const titleEl = document.getElementById("countdownEventTitle");
    eventName = (titleEl && titleEl.textContent && !titleEl.textContent.includes("Memuat")) 
      ? titleEl.textContent.trim() 
      : (window.currentActiveEvent?.title || "Temu Anggota 2026");
  }

  const containerPeruntukan = document.getElementById("containerPeruntukanHibah");
  const customInput = document.getElementById("inputPeruntukanHibahLain");
  const selectHibah = document.getElementById("selectPeruntukanHibah");
  const isFinished = !isHibahForce ? checkIsEventFinished(eventName) : true;

  // 1. Dropdown peruntukan SELALU AKTIF & TAMPIL (baik saat ada acara berlangsung maupun di luar acara)
  if (containerPeruntukan) containerPeruntukan.style.display = "block";
  if (customInput) {
    customInput.style.display = "none";
    customInput.classList.add("hidden");
    customInput.value = "";
  }

  // 2. Susun opsi dropdown secara dinamis:
  // - Jika acara masih aktif: opsi teratas (default) adalah acara tersebut!
  // - Jika acara sudah selesai / di luar acara: default opsi adalah Operasional Sanggar
  if (selectHibah) {
    let optionsHtml = '';
    if (!isFinished && eventName) {
      optionsHtml += `<option value="${escapeHtml(eventName)}" selected>🎯 Bantuan Khusus Agenda: ${escapeHtml(eventName)}</option>`;
      optionsHtml += `<option value="Operasional Sanggar & Perawatan Alat">🏠 Operasional Sanggar &amp; Perawatan Alat</option>`;
    } else {
      optionsHtml += `<option value="Operasional Sanggar & Perawatan Alat" selected>🏠 Operasional Sanggar &amp; Perawatan Alat</option>`;
      if (eventName) {
        optionsHtml += `<option value="${escapeHtml(eventName)}">🎯 Bantuan Khusus Agenda: ${escapeHtml(eventName)}</option>`;
      }
    }
    optionsHtml += `
      <option value="Kebutuhan Latihan & Pementasan">🎬 Kebutuhan Latihan &amp; Pementasan</option>
      <option value="Konsumsi & Kesejahteraan Anggota">☕ Konsumsi &amp; Kesejahteraan Anggota</option>
      <option value="Kas Agenda Kegiatan Mendatang">🚀 Kas Agenda Kegiatan Mendatang</option>
      <option value="Hibah Bebas (Amanah Pengurus)">✨ Hibah Bebas (Amanah Pengurus)</option>
      <option value="Lainnya">✍️ Tulis Peruntukan Lainnya...</option>
    `;
    selectHibah.innerHTML = optionsHtml;
    handlePeruntukanHibahChange(selectHibah);
  }

  const headerBar = document.getElementById("modalInfakHeaderBar");
  if (headerBar) headerBar.className = "min-h-[64px] h-16 px-4 bg-slate-900/95 backdrop-blur-md border-b border-purple-800/80 flex items-center justify-between sticky top-0 z-30 shrink-0";
  
  const iconEl = document.getElementById("modalInfakHeaderIcon");
  if (iconEl) iconEl.innerHTML = '<i class="fas fa-gift text-yellow-300"></i>';

  const titleEl = document.getElementById("modalInfakTitle");
  if (titleEl) {
    titleEl.textContent = (!isFinished && eventName) ? `Salurkan Dana Hibah (${eventName})` : "Salurkan Dana Hibah Teater Q";
  }

  const subtitleEl = document.getElementById("modalInfakSubtitle");
  if (subtitleEl) {
    subtitleEl.textContent = (!isFinished && eventName)
      ? `Dukungan sukarela untuk ${eventName} & sanggar Teater Q`
      : "Dukungan sukarela senior & donatur untuk operasional sanggar & adik-adik";
  }

  const inputKat = document.getElementById("inputKategoriInfak");
  if (inputKat) inputKat.value = "Hibah Kegiatan";

  // QRIS Resmi Dana Hibah
  const imgQris = document.getElementById("imgQrisDanaAbadi");
  if (imgQris) {
    imgQris.src = (typeof CONFIG_INFO !== "undefined" && CONFIG_INFO.urlQRISHibah) ? CONFIG_INFO.urlQRISHibah : "assets/qris-dana-hibah.jpg";
    imgQris.alt = "QRIS Dana Hibah";
  }
  const labelQris = document.getElementById("labelQrisBadge");
  if (labelQris) {
    labelQris.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 border border-purple-300 text-purple-800 text-xs font-black uppercase tracking-wide";
    labelQris.innerHTML = '<i class="fas fa-qrcode text-purple-600"></i> QRIS RESMI DANA HIBAH TEATER Q';
  }
  const btnDownload = document.getElementById("btnDownloadQRIS");
  if (btnDownload) {
    btnDownload.className = "py-2.5 px-5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-extrabold inline-flex items-center gap-2 shadow-md transition-all cursor-pointer";
  }

  // Rekening Khusus Kas Organisasi & Dana Hibah Kegiatan
  const elNamaBankInfak = document.getElementById("labelNamaBankInfak");
  if (elNamaBankInfak) elNamaBankInfak.textContent = CONFIG_INFO.namaBankKas || CONFIG_INFO.namaBank || "Bank Jago";
  const elNoRekInfak = document.getElementById("noRekDanaAbadi");
  if (elNoRekInfak) elNoRekInfak.textContent = CONFIG_INFO.noRekeningKas || CONFIG_INFO.noRekening || "101059023607";
  const elAnInfak = document.getElementById("labelAtasNamaInfak");
  if (elAnInfak) elAnInfak.textContent = (CONFIG_INFO.atasNamaKas || CONFIG_INFO.atasNama || "Ely Dwi Asih (Bendahara Teater Q)").toUpperCase();
  const titleTf = document.getElementById("labelTransferManualTitle");
  if (titleTf) titleTf.textContent = "Atau Transfer Rekening Kas & Hibah:";
  const subRek = document.getElementById("labelNomorRekeningSub");
  if (subRek) subRek.textContent = "Nomor Rekening Kas:";

  // 4. Render Petunjuk Donasi & Update Catatan Peruntukan
  renderModalGuideBox();
  if (selectHibah) handlePeruntukanHibahChange(selectHibah);

  const formTitle = document.getElementById("labelFormTitle");
  if (formTitle) formTitle.innerHTML = '<i class="fas fa-gift text-purple-600"></i> Form Penyaluran Dana Hibah';

  const labelPesan = document.getElementById("labelPesanInfak");
  if (labelPesan) labelPesan.textContent = "Harapan, Pesan & Nasihat Senior";

  const inputPesan = document.getElementById("inputPesanInfak");
  if (inputPesan) inputPesan.placeholder = "Tuliskan harapan, wejangan, atau pesan kasih untuk adik-adik Teater Q...";

  const labelSubmit = document.getElementById("labelSubmitInfak");
  if (labelSubmit) labelSubmit.textContent = "Kirim Dana Hibah & Harapan";

  const btnSubmit = document.getElementById("btnSubmitInfak");
  if (btnSubmit) btnSubmit.className = "w-full py-3.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 active:scale-[0.99] text-white font-black rounded-xl text-sm sm:text-base shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer";

  // Preset chips nominal cepat
  const chipContainer = document.getElementById("chipContainerInfak");
  if (chipContainer) {
    chipContainer.innerHTML = `
      <button type="button" onclick="selectInfakPreset(5000, this)" class="btn-nominal-chip py-2.5 px-2 rounded-xl bg-slate-100 hover:bg-purple-100 text-slate-800 font-extrabold text-xs sm:text-sm border border-slate-300 transition-all text-center">Rp 5.000</button>
      <button type="button" onclick="selectInfakPreset(10000, this)" class="btn-nominal-chip py-2.5 px-2 rounded-xl bg-slate-100 hover:bg-purple-100 text-slate-800 font-extrabold text-xs sm:text-sm border border-slate-300 transition-all text-center">Rp 10.000</button>
      <button type="button" onclick="selectInfakPreset(25000, this)" class="btn-nominal-chip py-2.5 px-2 rounded-xl bg-slate-100 hover:bg-purple-100 text-slate-800 font-extrabold text-xs sm:text-sm border border-slate-300 transition-all text-center">Rp 25.000</button>
      <button type="button" onclick="selectInfakPreset(50000, this)" class="btn-nominal-chip py-2.5 px-2 rounded-xl bg-slate-100 hover:bg-purple-100 text-slate-800 font-extrabold text-xs sm:text-sm border border-slate-300 transition-all text-center">Rp 50.000</button>
      <button type="button" onclick="selectInfakPreset(100000, this)" class="btn-nominal-chip py-2.5 px-2 rounded-xl bg-slate-100 hover:bg-purple-100 text-slate-800 font-extrabold text-xs sm:text-sm border border-slate-300 transition-all text-center">Rp 100.000</button>
      <button type="button" onclick="selectInfakPreset(0, this)" class="btn-nominal-chip py-2.5 px-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-extrabold text-xs sm:text-sm border border-purple-400 transition-all text-center shadow-sm">Nominal Bebas</button>
    `;
  }

  showInfakModalDialog();
}

function showInfakModalDialog() {
  const modal = document.getElementById("infakModal");
  const formBox = document.getElementById("infakFormContainer");
  const successBox = document.getElementById("infakSuccessContainer");
  const closedBox = document.getElementById("infakClosedContainer");
  if (formBox) formBox.style.display = "block";
  if (successBox) successBox.style.display = "none";
  if (closedBox) closedBox.style.display = "none";
  if (modal) {
    modal.removeAttribute("aria-hidden");
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    modal.classList.remove("closing");
    modal.classList.add("opening");
    requestAnimationFrame(() => {
      modal.classList.remove("opacity-0");
      modal.classList.add("opacity-100");
    });
  }
  const panelQris = document.getElementById("panelInfakQris");
  const panelBank = document.getElementById("panelInfakBank");
  if (panelQris) panelQris.classList.remove("hidden");
  if (panelBank) panelBank.classList.remove("hidden");

  const inputNominal = document.getElementById("inputNominalInfak");
  if (inputNominal) inputNominal.value = "";
}

window.openInfakModal = openInfakModal;
window.openSawerKegiatanModal = openSawerKegiatanModal;

function switchInfakTab(tab) {
  const panelQris = document.getElementById("panelInfakQris");
  const panelBank = document.getElementById("panelInfakBank");
  if (panelQris) panelQris.classList.remove("hidden");
  if (panelBank) panelBank.classList.remove("hidden");
}

function selectInfakPreset(amount, btnEl) {
  const input = document.getElementById("inputNominalInfak");
  if (input) {
    if (amount > 0) {
      input.value = amount;
    } else {
      input.value = "";
      input.focus();
    }
  }

  // Highlight button
  const container = btnEl ? btnEl.parentElement : null;
  if (container) {
    const isHibah = document.getElementById("inputKategoriInfak")?.value === "Hibah Kegiatan";
    const allChips = container.querySelectorAll(".btn-nominal-chip");
    allChips.forEach(chip => {
      chip.className = isHibah 
        ? "btn-nominal-chip py-2.5 px-2 rounded-xl bg-slate-100 hover:bg-purple-100 text-slate-800 font-extrabold text-xs sm:text-sm border border-slate-300 transition-all text-center cursor-pointer"
        : "btn-nominal-chip py-2.5 px-2 rounded-xl bg-slate-100 hover:bg-emerald-100 text-slate-800 font-extrabold text-xs sm:text-sm border border-slate-300 transition-all text-center cursor-pointer";
    });
    if (btnEl) {
      btnEl.className = isHibah
        ? "btn-nominal-chip py-2.5 px-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black text-xs sm:text-sm border border-purple-500 transition-all text-center shadow-md cursor-pointer"
        : "btn-nominal-chip py-2.5 px-2 rounded-xl bg-emerald-600 text-white font-black text-xs sm:text-sm border border-emerald-600 transition-all text-center shadow-md cursor-pointer";
    }
  }
}

function toggleAnonimInfak(chk) {
  const inputNama = document.getElementById("inputNamaInfak");
  if (!inputNama) return;
  if (chk && chk.checked) {
    inputNama.value = "Hamba Allah";
    inputNama.setAttribute("readonly", "true");
    inputNama.classList.add("bg-slate-100", "text-slate-500");
  } else {
    inputNama.value = "";
    inputNama.removeAttribute("readonly");
    inputNama.classList.remove("bg-slate-100", "text-slate-500");
    inputNama.focus();
  }
}

function openZoomQris() {
  const modal = document.getElementById("zoomQrisModal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }
}

function closeZoomQris() {
  const modal = document.getElementById("zoomQrisModal");
  if (modal) {
    modal.classList.remove("flex");
    modal.classList.add("hidden");
  }
}

function handleBuktiTransferChange(input) {
  const file = input.files && input.files[0];
  const label = document.getElementById("labelBuktiTransfer");
  const box = document.getElementById("previewBuktiTransferBox");
  const img = document.getElementById("previewBuktiTransferImg");
  const nameEl = document.getElementById("previewBuktiTransferName");

  if (file) {
    if (label) label.textContent = "Ganti foto struk...";
    if (nameEl) nameEl.textContent = file.name;
    if (box) box.style.display = "flex";
    if (img) {
      img.src = URL.createObjectURL(file);
    }
  } else {
    hapusBuktiTransfer();
  }
}

function hapusBuktiTransfer() {
  const input = document.getElementById("inputBuktiTransfer");
  if (input) input.value = "";
  const label = document.getElementById("labelBuktiTransfer");
  if (label) label.textContent = "Pilih foto struk transfer / bukti QRIS...";
  const box = document.getElementById("previewBuktiTransferBox");
  if (box) box.style.display = "none";
  const img = document.getElementById("previewBuktiTransferImg");
  if (img) img.src = "";
}

async function compressImageForUpload(file, maxDimension = 1200, quality = 0.82) {
  return new Promise((resolve) => {
    if (!file || !file.type || !file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => resolve({ base64: reader.result.split(",")[1], mimeType: file.type || "application/octet-stream", filename: file.name || "file" });
      reader.readAsDataURL(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        const base64 = dataUrl.split(",")[1];
        const cleanName = (file.name || "bukti.jpg").replace(/\.[^.]+$/, "") + ".jpg";
        resolve({ base64, mimeType: "image/jpeg", filename: cleanName });
      };
      img.onerror = () => {
        const base64 = e.target.result.split(",")[1];
        resolve({ base64, mimeType: file.type, filename: file.name });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function uploadBuktiTransfer(file) {
  if (!file) return "";
  try {
    const { base64, mimeType, filename } = await compressImageForUpload(file, 1200, 0.82);
    const fileName = "Bukti-Infak-" + Date.now() + "-" + filename;
    const finalUrl = await uploadFileToTargetDrive(base64, fileName, mimeType, "Keuangan");
    if (finalUrl) return finalUrl;
  } catch (err) {
    console.warn("Upload bukti transfer error:", err);
  }
  return "";
}

function closeInfakModal() {
  const modal = document.getElementById("infakModal");
  if (modal) {
    if (document.activeElement && modal.contains(document.activeElement)) {
      document.activeElement.blur();
    }
    modal.classList.remove("opening");
    modal.classList.add("closing");
    modal.classList.remove("opacity-100");
    modal.classList.add("opacity-0");
    setTimeout(() => {
      modal.classList.remove("flex");
      modal.classList.add("hidden");
      modal.classList.remove("closing");
      modal.setAttribute("aria-hidden", "true");
    }, 200);
  }
  const form = document.getElementById("infakForm");
  if (form) form.reset();
  hapusBuktiTransfer();
  const inputNama = document.getElementById("inputNamaInfak");
  if (inputNama) {
    inputNama.removeAttribute('readonly');
    inputNama.classList.remove('bg-slate-100', 'text-slate-500');
  }
  const cekAnonim = document.getElementById("cekAnonimInfak");
  if (cekAnonim) cekAnonim.checked = false;
  const formBox = document.getElementById("infakFormContainer");
  const successBox = document.getElementById("infakSuccessContainer");
  const closedBox = document.getElementById("infakClosedContainer");
  if (formBox) formBox.style.display = "block";
  if (successBox) successBox.style.display = "none";
  if (closedBox) closedBox.style.display = "none";
}

/**
 * ============================================================================
 * MASTER PENGATURAN TERPADU (KONTAK ADMIN, BENDAHARA, PANITIA & REKENING KAS)
 * Terhubung Langsung ke Tab 'setting' Spreadsheet IMPORT WEB via Fast GVIZ
 * ============================================================================
 */
const CACHE_KEY_MASTER_SETTING = "tq_cache_master_setting_v1";

function cleanWaNumber(num) {
  if (!num) return "";
  let clean = String(num).replace(/[^0-9]/g, "");
  if (clean.startsWith("0")) clean = "62" + clean.slice(1);
  else if (clean.startsWith("8")) clean = "62" + clean;
  return clean;
}

function applyMasterSetting(cfg) {
  if (!cfg) return;

  // 1. Sinkronisasi Objek Global CONFIG_INFO
  if (cfg.namaBank) CONFIG_INFO.namaBank = cfg.namaBank;
  if (cfg.noRekening) CONFIG_INFO.noRekening = String(cfg.noRekening);
  if (cfg.atasNama) CONFIG_INFO.atasNama = cfg.atasNama;

  if (cfg.namaBankKas) CONFIG_INFO.namaBankKas = cfg.namaBankKas;
  if (cfg.noRekeningKas) CONFIG_INFO.noRekeningKas = String(cfg.noRekeningKas);
  if (cfg.atasNamaKas) CONFIG_INFO.atasNamaKas = cfg.atasNamaKas;

  if (cfg.noAdminWA) CONFIG_INFO.noAdminWA = cleanWaNumber(cfg.noAdminWA);
  if (cfg.noBendaharaWA) CONFIG_INFO.noBendaharaWA = cleanWaNumber(cfg.noBendaharaWA);
  if (cfg.noPanitiaWA) CONFIG_INFO.noPanitiaWA = cleanWaNumber(cfg.noPanitiaWA);

  const bankAbadi = CONFIG_INFO.namaBank || "Bank Jago";
  const noRekAbadi = CONFIG_INFO.noRekening || "101059023607";
  const anAbadi = CONFIG_INFO.atasNama || "Ely Dwi Asih (Bendahara Teater Q)";

  const bankKas = CONFIG_INFO.namaBankKas || bankAbadi;
  const noRekKas = CONFIG_INFO.noRekeningKas || noRekAbadi;
  const anKas = CONFIG_INFO.atasNamaKas || anAbadi;

  const adminWa = CONFIG_INFO.noAdminWA || "6285645829346";
  const bendaharaWa = CONFIG_INFO.noBendaharaWA || adminWa;
  const panitiaWa = CONFIG_INFO.noPanitiaWA || adminWa;

  // 2. Update Tampilan Rekening di Modal Transfer Sesuai Mode Aktif (Hibah vs Dana Abadi)
  const inputKat = document.getElementById("inputKategoriInfak");
  const isHibah = inputKat && inputKat.value === "Hibah Kegiatan";

  const elNamaBankInfak = document.getElementById("labelNamaBankInfak");
  if (elNamaBankInfak) elNamaBankInfak.textContent = isHibah ? bankKas : bankAbadi;

  const elNoRekInfak = document.getElementById("noRekDanaAbadi");
  if (elNoRekInfak) elNoRekInfak.textContent = isHibah ? noRekKas : noRekAbadi;

  const elAnInfak = document.getElementById("labelAtasNamaInfak");
  if (elAnInfak) elAnInfak.textContent = (isHibah ? anKas : anAbadi).toUpperCase();

  // 3. Update Tampilan Rekening Kas di Modal Info Kas, Checkout Q Store & Tiket Pentas
  const elInfoKasBank = document.getElementById("infoKasNamaBank");
  if (elInfoKasBank) elInfoKasBank.textContent = bankKas.toUpperCase();

  const elInfoKasNoRek = document.getElementById("infoKasNoRek");
  if (elInfoKasNoRek) elInfoKasNoRek.textContent = noRekKas;

  const elInfoKasAn = document.getElementById("infoKasAtasNama");
  if (elInfoKasAn) elInfoKasAn.textContent = anKas;

  const elCheckHeader = document.getElementById("checkoutBankHeader");
  if (elCheckHeader) elCheckHeader.textContent = `${bankKas.toUpperCase()} TEATER Q`;

  const elCheckBankName = document.getElementById("checkoutBankName");
  if (elCheckBankName) elCheckBankName.textContent = bankKas;

  const elCheckRek = document.getElementById("checkoutRekeningText");
  if (elCheckRek) elCheckRek.textContent = noRekKas;

  const elCheckAn = document.getElementById("checkoutAtasNamaText");
  if (elCheckAn) elCheckAn.textContent = anKas.toUpperCase();

  const elTiketRek = document.getElementById("tiketRekeningNomor");
  if (elTiketRek) elTiketRek.textContent = `${bankKas} ${noRekKas}`;

  const elTiketAn = document.getElementById("tiketAtasNama");
  if (elTiketAn) elTiketAn.textContent = `a/n ${anKas}`;

  // 5. Update Link WA Admin di Seluruh Halaman Portal
  const adminWaLinks = document.querySelectorAll(".link-wa-admin");
  adminWaLinks.forEach(el => {
    const origHref = el.getAttribute("href") || "";
    if (origHref.includes("text=")) {
      const textParam = origHref.split("text=")[1];
      el.href = `https://wa.me/${adminWa}?text=${textParam}`;
    } else {
      el.href = `https://wa.me/${adminWa}`;
    }
  });

  const elBantuanLogin = document.getElementById("linkBantuanLogin");
  if (elBantuanLogin) {
    elBantuanLogin.href = `https://wa.me/${adminWa}?text=${encodeURIComponent("Halo Admin Paguyuban Teater Q, saya anggota/alumni ingin meminta akses akun Login Portal.")}`;
  }

  // 6. Update Link WA Panitia di Tiket Pentas & Acara
  const panitiaWaLinks = document.querySelectorAll(".link-wa-panitia");
  panitiaWaLinks.forEach(el => {
    const origHref = el.getAttribute("href") || "";
    if (origHref.includes("text=")) {
      const textParam = origHref.split("text=")[1];
      el.href = `https://wa.me/${panitiaWa}?text=${textParam}`;
    } else {
      el.href = `https://wa.me/${panitiaWa}`;
    }
  });

  // 7. Update Link WA Bendahara di Infak & Kas
  const bendaharaWaLinks = document.querySelectorAll(".link-wa-bendahara");
  bendaharaWaLinks.forEach(el => {
    const origHref = el.getAttribute("href") || "";
    if (origHref.includes("text=")) {
      const textParam = origHref.split("text=")[1];
      el.href = `https://wa.me/${bendaharaWa}?text=${textParam}`;
    } else {
      el.href = `https://wa.me/${bendaharaWa}`;
    }
  });
}

async function syncMasterSettingLive() {
  // 1. Terapkan Cache Lokal Terlebih Dahulu (0 Milidetik / Kecepatan Penuh)
  try {
    const cached = localStorage.getItem(CACHE_KEY_MASTER_SETTING);
    if (cached) {
      const parsed = JSON.parse(cached);
      applyMasterSetting(parsed);
    } else {
      applyMasterSetting(CONFIG_INFO);
    }
  } catch (e) {
    applyMasterSetting(CONFIG_INFO);
  }

  // 2. Jalankan Pengambilan Latar Belakang (Silent Background Sync via GVIZ)
  if (typeof URL_SETTING_GVIZ === "undefined" || !URL_SETTING_GVIZ) return;

  try {
    const sep = URL_SETTING_GVIZ.includes("?") ? "&" : "?";
    const resp = await fetch(`${URL_SETTING_GVIZ}${sep}_t=${Date.now()}`);
    if (!resp.ok) return;
    const text = await resp.text();

    const startIdx = text.indexOf("{");
    const endIdx = text.lastIndexOf("}");
    if (startIdx === -1 || endIdx === -1) return;

    const json = JSON.parse(text.substring(startIdx, endIdx + 1));
    if (!json || !json.table || !json.table.rows || json.table.rows.length === 0) return;

    const cols = (json.table.cols || []).map(c => (c.label || "").trim().toLowerCase());
    const row = json.table.rows[0];
    if (!row || !row.c) return;

    const getVal = (idx) => {
      if (idx === -1 || !row.c[idx]) return "";
      const cell = row.c[idx];
      return String(cell.f || cell.v || "").trim();
    };

    // Deteksi Kontak WhatsApp
    const idxAdmin = cols.findIndex(l => l.includes("admin"));
    const idxBenda = cols.findIndex(l => l.includes("benda"));
    const idxPani  = cols.findIndex(l => l.includes("pani"));

    // Deteksi Rekening Dana Abadi (Kolom Bank/Rekening Utama atau yang berlabel 'Abadi')
    const idxBankAbadi = cols.findIndex(l => l.includes("bank") && !l.includes("kas"));
    const idxRekAbadi  = cols.findIndex(l => (l.includes("no rek") || l.includes("rekening")) && !l.includes("kas"));
    const idxAnAbadi   = cols.findIndex(l => (l.includes("atas nama") || l.includes("a/n")) && !l.includes("kas"));

    // Deteksi Rekening Kas Organisasi / Hibah Kegiatan (Kolom yang mengandung kata 'Kas' atau 'Hibah' atau 'Kegiatan')
    const idxBankKas = cols.findIndex(l => l.includes("bank") && (l.includes("kas") || l.includes("hibah") || l.includes("kegiatan")));
    const idxRekKas  = cols.findIndex(l => (l.includes("no rek") || l.includes("rekening")) && (l.includes("kas") || l.includes("hibah") || l.includes("kegiatan")));
    const idxAnKas   = cols.findIndex(l => (l.includes("atas nama") || l.includes("a/n")) && (l.includes("kas") || l.includes("hibah") || l.includes("kegiatan")));

    const bankAbadi = getVal(idxBankAbadi) || CONFIG_INFO.namaBank;
    const rekAbadi  = getVal(idxRekAbadi).replace(/[^0-9]/g, "") || CONFIG_INFO.noRekening;
    const anAbadi   = getVal(idxAnAbadi) || CONFIG_INFO.atasNama;

    const bankKas = (idxBankKas !== -1 ? getVal(idxBankKas) : "") || CONFIG_INFO.namaBankKas || bankAbadi;
    const rekKas  = (idxRekKas !== -1 ? getVal(idxRekKas).replace(/[^0-9]/g, "") : "") || CONFIG_INFO.noRekeningKas || rekAbadi;
    const anKas   = (idxAnKas !== -1 ? getVal(idxAnKas) : "") || CONFIG_INFO.atasNamaKas || anAbadi;

    const newCfg = {
      noAdminWA: cleanWaNumber(getVal(idxAdmin)) || CONFIG_INFO.noAdminWA,
      noBendaharaWA: cleanWaNumber(getVal(idxBenda)) || CONFIG_INFO.noBendaharaWA,
      noPanitiaWA: cleanWaNumber(getVal(idxPani)) || CONFIG_INFO.noPanitiaWA,
      namaBank: bankAbadi,
      noRekening: rekAbadi,
      atasNama: anAbadi,
      namaBankKas: bankKas,
      noRekeningKas: rekKas,
      atasNamaKas: anKas
    };

    localStorage.setItem(CACHE_KEY_MASTER_SETTING, JSON.stringify(newCfg));
    applyMasterSetting(newCfg);
  } catch (err) {
    console.warn("Sinkronisasi Master Setting senyap gagal, tetap memakai cache aman:", err);
  }
}

// Inisialisasi Sinkronisasi Master Setting Seketika
setTimeout(() => {
  syncMasterSettingLive();
}, 50);

function copyRekening() {
  const bankName = CONFIG_INFO.namaBank || "SeaBank";
  const noRek = document.getElementById("noRekDanaAbadi")?.innerText.trim() || CONFIG_INFO.noRekening || "901926407305";
  const btnLabel = document.getElementById("labelCopyRek");
  navigator.clipboard.writeText(noRek).then(() => {
    if (btnLabel) {
      const orig = btnLabel.textContent;
      btnLabel.textContent = "Tersalin! ✓";
      setTimeout(() => { btnLabel.textContent = orig; }, 2000);
    }
    showToast(`Nomor rekening ${bankName} (${noRek}) berhasil disalin! 📋`, "success");
  }).catch(() => {
    showToast(`No. Rekening: ${noRek}`, "info");
  });
}

function copyRekeningInfoKas() {
  const bankName = CONFIG_INFO.namaBank || "SeaBank";
  const noRek = document.getElementById("infoKasNoRek")?.innerText.trim() || CONFIG_INFO.noRekening || "901926407305";
  navigator.clipboard.writeText(noRek).then(() => {
    showToast(`Nomor rekening ${bankName} (${noRek}) berhasil disalin! 📋`, "success");
  }).catch(() => {
    showToast(`No. Rekening: ${noRek}`, "info");
  });
}

function copyRekeningTiket() {
  const bankName = CONFIG_INFO.namaBank || "SeaBank";
  const noRek = (typeof CONFIG_INFO !== "undefined" && CONFIG_INFO.noRekening) ? CONFIG_INFO.noRekening : "901926407305";
  navigator.clipboard.writeText(noRek).then(() => {
    showToast(`Nomor rekening ${bankName} (${noRek}) berhasil disalin! 📋`, "success");
  }).catch(() => {
    showToast(`No. Rekening: ${noRek}`, "info");
  });
}
window.copyRekeningTiket = copyRekeningTiket;

async function downloadQRIS() {
  const isHibah = document.getElementById("inputKategoriInfak")?.value === "Hibah Kegiatan";
  const qrUrl = isHibah 
    ? ((typeof CONFIG_INFO !== "undefined" && CONFIG_INFO.urlQRISHibah) ? CONFIG_INFO.urlQRISHibah : "assets/qris-dana-hibah.jpg")
    : ((typeof CONFIG_INFO !== "undefined" && CONFIG_INFO.urlQRIS) ? CONFIG_INFO.urlQRIS : "assets/qris-dana-abadi.jpg");
  const fileName = isHibah ? "QRIS-Dana-Hibah-Teater-Q.jpg" : "QRIS-Dana-Abadi-Teater-Q.jpg";

  showToast(`Mengunduh gambar QRIS (${isHibah ? 'Dana Hibah' : 'Dana Abadi'})... ⏳`);

  try {
    // 1. Unduh via Fetch Blob (Otomatis simpan langsung sebagai file di HP/PC tanpa buka tab baru)
    const response = await fetch(qrUrl);
    if (!response.ok) throw new Error("Gagal mengambil file gambar");
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 3000);
    showToast("QRIS berhasil diunduh ke perangkat! 📥");
  } catch (err) {
    console.warn("Fetch blob download failed, trying direct link fallback:", err);
    // 2. Fallback Anchor Langsung
    const link = document.createElement("a");
    link.href = qrUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Mengunduh gambar QRIS...");
  }
}

// Global exposure modal infak & QRIS
window.openInfakModal = openInfakModal;
window.closeInfakModal = closeInfakModal;
window.switchInfakTab = switchInfakTab;
window.selectInfakPreset = selectInfakPreset;
window.toggleAnonimInfak = toggleAnonimInfak;
window.openZoomQris = openZoomQris;
window.closeZoomQris = closeZoomQris;
window.copyRekening = copyRekening;
window.downloadQRIS = downloadQRIS;

function renderLaporanDana() {
  const tbody = document.getElementById("tabelMutasiBody");
  const elTotalPokok = document.getElementById("lapTotalPokok");
  const elTotalDistribusi = document.getElementById("lapTotalDistribusi");
  const elTotalKembali = document.getElementById("lapTotalKembali");
  const elSaldoAkhir = document.getElementById("lapSaldoAkhir");
  const elTotalLaba = document.getElementById("lapTotalLaba");
  const elJumlahDonatur = document.getElementById("lapJumlahDonatur");
  if (!tbody) return;

  const keyword = (document.getElementById("searchMutasiDana")?.value || "").toLowerCase();
  let totalInfakPokok = 0;
  let totalPenyaluran = 0;
  let totalPengembalian = 0;
  let transaksiMasukCount = 0;

  function getVal(row, keyKeyword, colIndex) {
    const keys = Object.keys(row);
    const matchedKey = keys.find(k => k.toLowerCase().replace(/[^a-z]/g, '').includes(keyKeyword.toLowerCase()));
    if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== "") return row[matchedKey];
    const vals = Object.values(row);
    return vals[colIndex] !== undefined ? vals[colIndex] : "";
  }

  mutasiDanaData.forEach(row => {
    const tipe = getVal(row, "tipe", 4).toString().toLowerCase();
    const kat = getVal(row, "kategori", 3).toString().toLowerCase();
    const ket = (getVal(row, "nama", 1) || getVal(row, "keterangan", 1)).toString().toLowerCase();
    const nominal = parseNumberRupiah(getVal(row, "nominal", 5));

    const isKeluar = tipe.includes("keluar") || kat.includes("penyaluran") || kat.includes("keluar") || kat.includes("distribusi") || kat.includes("modal") || kat.includes("pentas");

    if (isKeluar) {
      totalPenyaluran += nominal;
    } else {
      // Cek apakah transaksi masuk ini merupakan pengembalian modal pokok atau sawer kegiatan
      const isKembali = kat.includes("kembali") || kat.includes("pengembalian") || kat.includes("balik modal") ||
                        ket.includes("kembali") || ket.includes("pengembalian") || ket.includes("balik modal");
      const isSawer = kat.includes("kegiatan") || kat.includes("acara") || kat.includes("sawer") || kat.includes("hibah");
      if (isKembali) {
        totalPengembalian += nominal;
      } else if (isSawer) {
        // Sawer kegiatan dicatat di laporan saweran tersendiri, tidak dihitung ke donatur pokok dana abadi
      } else {
        totalInfakPokok += nominal;
        transaksiMasukCount++;
      }
    }
  });

  // Ambil Laba Usaha (dari Kolom H di database yang diisi manual)
  let labaUsaha = 0;
  const rawAbadi = localStorage.getItem("tq_cache_dana_abadi");
  if (rawAbadi) {
    try {
      const parsed = JSON.parse(rawAbadi);
      if (parsed) {
        if (parsed.laba !== undefined) labaUsaha = Number(parsed.laba) || 0;
        else if (parsed.labaUsaha !== undefined) labaUsaha = Number(parsed.labaUsaha) || 0;
      }
    } catch(e){}
  }

  // Saldo Kas Pokok Abadi = Dana Pokok Terhimpun - Penyaluran Modal + Pengembalian Modal
  const saldoKasPokok = totalInfakPokok - totalPenyaluran + totalPengembalian;

  if (elTotalPokok) elTotalPokok.textContent = formatRupiah(totalInfakPokok);
  if (elTotalDistribusi) elTotalDistribusi.textContent = formatRupiah(totalPenyaluran);
  if (elTotalKembali) elTotalKembali.textContent = formatRupiah(totalPengembalian);
  if (elSaldoAkhir) elSaldoAkhir.textContent = formatRupiah(saldoKasPokok);
  if (elTotalLaba) elTotalLaba.textContent = formatRupiah(labaUsaha);
  if (elJumlahDonatur) elJumlahDonatur.textContent = `${transaksiMasukCount} Donasi Masuk`;

  // Sinkronkan juga metrik kartu di Beranda agar kedua halaman selalu 100% konsisten!
  if (document.getElementById("abadiInfak")) document.getElementById("abadiInfak").textContent = formatRupiah(totalInfakPokok);
  if (document.getElementById("abadiDistribusi")) document.getElementById("abadiDistribusi").textContent = formatRupiah(totalPenyaluran);
  if (document.getElementById("abadiTotal")) document.getElementById("abadiTotal").textContent = formatRupiah(saldoKasPokok);
  if (document.getElementById("abadiLaba")) document.getElementById("abadiLaba").textContent = formatRupiah(labaUsaha);
  if (document.getElementById("abadiProgressBar")) {
    const target = 10000000;
    const persen = (target > 0) ? (saldoKasPokok / target) * 100 : 0;
    const persenBar = Math.min(100, Math.max(0, persen));
    document.getElementById("abadiProgressBar").style.width = persenBar + "%";
    if (document.getElementById("abadiPersenText")) {
      document.getElementById("abadiPersenText").textContent = persen.toFixed(1) + "% Tercapai";
    }
  }

  const showInfak = document.getElementById("filterCekInfakMasuk") ? document.getElementById("filterCekInfakMasuk").checked : true;
  const showPenyaluran = document.getElementById("filterCekPenyaluran") ? document.getElementById("filterCekPenyaluran").checked : true;
  const showKembali = document.getElementById("filterCekKembali") ? document.getElementById("filterCekKembali").checked : true;

  const filtered = mutasiDanaData.filter(row => {
    const ket = (getVal(row, "nama", 1) || getVal(row, "keterangan", 1)).toString().toLowerCase();
    const kat = getVal(row, "kategori", 3).toString().toLowerCase();
    const tgl = getVal(row, "tanggal", 0).toString().toLowerCase();
    const tipe = getVal(row, "tipe", 4).toString().toLowerCase();

    const matchesKeyword = !keyword || ket.includes(keyword) || kat.includes(keyword) || tgl.includes(keyword);
    if (!matchesKeyword) return false;

    const isKeluar = tipe.includes("keluar") || kat.includes("penyaluran") || kat.includes("keluar") || kat.includes("distribusi") || kat.includes("pentas");
    const isKembali = !isKeluar && (kat.includes("kembali") || kat.includes("pengembalian") || kat.includes("balik modal") ||
                      ket.includes("kembali") || ket.includes("pengembalian") || ket.includes("balik modal"));
    const isSawer = !isKeluar && !isKembali && (kat.includes("kegiatan") || kat.includes("acara") || kat.includes("sawer") || kat.includes("hibah"));

    // Transaksi saweran kegiatan dipisahkan secara eksklusif ke halaman Laporan Sawer
    if (isSawer) return false;

    const isInfak = !isKeluar && !isKembali && !isSawer;

    if (isKeluar && !showPenyaluran) return false;
    if (isKembali && !showKembali) return false;
    if (isInfak && !showInfak) return false;

    return true;
  });

  if (!filtered.length) {
    tbody.innerHTML = `<div class="p-6 text-center text-slate-500 rounded-2xl bg-slate-950/40 border border-slate-800">Tidak ada riwayat transaksi yang cocok dengan filter pencarian.</div>`;
    return;
  }

  // Urutkan transaksi secara kronologis menurun (tanggal & jam transaksi paling baru selalu berada di baris paling atas)
  const sorted = [...filtered].sort((a, b) => {
    const tglA = parseDateToTimestamp(getVal(a, "tanggal", 0));
    const tglB = parseDateToTimestamp(getVal(b, "tanggal", 0));
    return tglB - tglA;
  });

  tbody.innerHTML = sorted.map(row => {
    const tgl      = escapeHtml(getVal(row, "tanggal", 0) || "-");
    const namaOnly = escapeHtml(getVal(row, "nama", 1) || getVal(row, "keterangan", 1) || "-");
    const angkatan = escapeHtml(getVal(row, "angkatan", 2));
    const kat      = escapeHtml(getVal(row, "kategori", 3) || "-");
    const tipe     = getVal(row, "tipe", 4).toString().toLowerCase();
    const katLower = kat.toLowerCase();
    const nominal  = parseNumberRupiah(getVal(row, "nominal", 5));
    const pesanRaw = (getVal(row, "pesan", 6) || row.pesan || "").toString().trim();

    const isKeluar = tipe.includes("keluar") || katLower.includes("penyaluran") || katLower.includes("keluar") || katLower.includes("distribusi") || katLower.includes("pentas");
    const isKembali = !isKeluar && (katLower.includes("kembali") || katLower.includes("pengembalian") || katLower.includes("balik modal") ||
                      namaOnly.toLowerCase().includes("kembali") || namaOnly.toLowerCase().includes("pengembalian") || namaOnly.toLowerCase().includes("balik modal"));
    const isSawer = !isKeluar && !isKembali && (katLower.includes("kegiatan") || katLower.includes("acara") || katLower.includes("sawer"));

    let warnaNominal = "text-emerald-400";
    let tanda = "+ ";
    let badgeTipe = '';
    let barColor = 'bg-emerald-500';
    let avatarBg = 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400';
    let avatarIcon = '<i class="fas fa-hand-holding-heart text-xs"></i>';

    const isAnonim = /hamba\s*allah|anonim/i.test(namaOnly);

    if (isKeluar) {
      warnaNominal = "text-rose-400";
      tanda = "- ";
      barColor = "bg-rose-500";
      avatarBg = "bg-rose-500/15 border border-rose-500/30 text-rose-400";
      avatarIcon = '<i class="fas fa-arrow-up text-xs"></i>';
      badgeTipe = `<span class="text-[9px] px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-700/60 font-bold whitespace-nowrap">Penyaluran</span>`;
    } else if (isKembali) {
      warnaNominal = "text-cyan-400";
      tanda = "+ ";
      barColor = "bg-cyan-500";
      avatarBg = "bg-cyan-500/15 border border-cyan-500/30 text-cyan-400";
      avatarIcon = '<i class="fas fa-undo text-xs"></i>';
      badgeTipe = `<span class="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 font-bold whitespace-nowrap">Balik Modal</span>`;
    } else if (isSawer) {
      warnaNominal = "text-amber-400";
      tanda = "+ ";
      barColor = "bg-amber-500";
      avatarBg = "bg-amber-500/15 border border-amber-500/30 text-amber-400";
      avatarIcon = '<i class="fas fa-mug-hot text-xs"></i>';
      badgeTipe = `<span class="text-[9px] px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-700/60 font-bold whitespace-nowrap"><i class="fas fa-gift mr-1"></i>Dana Hibah</span>`;
    } else {
      if (isAnonim) {
        avatarBg = "bg-emerald-500/15 border border-emerald-500/40 text-emerald-300";
        avatarIcon = '<i class="fas fa-shield-heart text-xs"></i>';
      } else {
        avatarBg = "bg-amber-500/15 border border-amber-500/40 text-amber-300";
        avatarIcon = '<i class="fas fa-gem text-xs"></i>';
      }
      badgeTipe = `<span class="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 font-bold whitespace-nowrap">Infak Masuk</span>`;
    }

    const infoAngkatan = (angkatan && angkatan !== '-' && angkatan.toLowerCase() !== 'null') 
      ? `<span class="px-1.5 py-0.2 rounded bg-amber-400/15 border border-amber-400/30 text-amber-300 text-[10px] font-black tracking-wide shrink-0">Angk. ${angkatan}</span>` 
      : '';

    const pesanDoaHtml = pesanRaw ? `
      <div class="mt-1.5 text-[11px] text-amber-200/90 italic flex items-center gap-1.5 bg-amber-950/20 px-2.5 py-1 rounded-lg border-l-2 border-amber-500/60 overflow-hidden">
        <i class="fas fa-quote-left text-[8px] text-amber-400 shrink-0"></i>
        <span class="truncate font-serif">"${escapeHtml(pesanRaw)}"</span>
      </div>
    ` : '';

    return `
      <div class="p-2.5 sm:p-3 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800/90 hover:border-amber-500/50 transition-all shadow-sm group relative overflow-hidden">
        <!-- Glow bar vertikal sisi kiri -->
        <div class="absolute left-0 top-0 bottom-0 w-1 ${barColor}"></div>

        <div class="flex items-center justify-between gap-2.5">
          <!-- Kiri: Avatar, Nama Donatur, Angkatan, & Tanggal -->
          <div class="flex items-center gap-2.5 min-w-0 flex-1 pl-1">
            <div class="w-8 h-8 rounded-lg ${avatarBg} flex items-center justify-center shrink-0 shadow-inner">
              ${avatarIcon}
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-extrabold text-white text-xs sm:text-sm truncate max-w-[140px] sm:max-w-[220px] group-hover:text-amber-300 transition-colors">
                  ${namaOnly}
                </span>
                ${infoAngkatan}
              </div>
              <div class="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                <span><i class="far fa-clock text-amber-400/80 text-[9px] mr-0.5"></i>${tgl}</span>
                <span class="text-slate-600">&bull;</span>
                <span class="truncate max-w-[100px]">${kat}</span>
              </div>
            </div>
          </div>

          <!-- Kanan: Nominal Transaksi & Badge Status -->
          <div class="text-right shrink-0">
            <div class="font-black text-xs sm:text-sm ${warnaNominal} tracking-tight">
              ${tanda}${formatRupiah(nominal)}
            </div>
            <div class="mt-0.5">${badgeTipe}</div>
          </div>
        </div>

        ${pesanDoaHtml}
      </div>
    `;
  }).join("");

  renderMarqueeDonatur();
  renderMarqueeSawer();
  if (typeof renderLaporanSawer === 'function') {
    renderLaporanSawer();
  }
}

// ============================================================================
// HALAMAN KHUSUS: LAPORAN SAWERAN KEGIATAN & PENTAS
// ============================================================================
function renderLaporanSawer() {
  const container = document.getElementById("listSawerMutasi");
  const elTotal = document.getElementById("lapSawerTotal");
  const elCount = document.getElementById("lapSawerDonaturCount");
  const elActiveLabel = document.getElementById("lapSawerActiveLabel");
  const elActiveTotal = document.getElementById("lapSawerActiveTotal");
  const elActiveSub = document.getElementById("lapSawerActiveSub");
  const elRataRata = document.getElementById("lapSawerRataRata");
  if (!container) return;

  function getVal(row, keyKeyword, colIndex) {
    if (!row) return "";
    const keys = Object.keys(row);
    const matchedKey = keys.find(k => k.toLowerCase().replace(/[^a-z]/g, '').includes(keyKeyword.toLowerCase()));
    if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== "") return row[matchedKey];
    const vals = Object.values(row);
    return vals[colIndex] !== undefined ? vals[colIndex] : "";
  }

  let dataList = mutasiDanaData;
  if (!dataList || !dataList.length) {
    try {
      const cached = localStorage.getItem("tq_cache_mutasi_dana");
      if (cached) dataList = JSON.parse(cached);
    } catch(e) {}
  }

  // 1. Filter hanya transaksi sawer kegiatan / bantuan acara / dana hibah
  const allSawer = (dataList || []).filter(row => {
    const tipe = getVal(row, "tipe", 4).toString().toLowerCase();
    const kat = getVal(row, "kategori", 3).toString().toLowerCase();
    const isKeluar = tipe.includes("keluar") || kat.includes("penyaluran") || kat.includes("keluar") || kat.includes("distribusi");
    const isSawer = kat.includes("kegiatan") || kat.includes("acara") || kat.includes("sawer") || kat.includes("hibah");
    return !isKeluar && isSawer;
  });

  // 2. Hitung statistik finansial saweran & hibah
  let totalSawer = 0;
  allSawer.forEach(row => {
    totalSawer += parseNumberRupiah(getVal(row, "nominal", 5));
  });
  const donaturCount = allSawer.length;
  const rataRata = donaturCount > 0 ? Math.round(totalSawer / donaturCount) : 0;

  // Hitung dana hibah khusus untuk acara aktif terkini (Card 2)
  let activeEventName = (typeof getActiveEventTargetName === 'function') 
    ? getActiveEventTargetName(window.currentActiveEvent?.title) 
    : (window.currentActiveEvent?.title || "Temu Anggota Teater Q");
  const cleanActiveEvent = activeEventName.toLowerCase().trim();
  const isEventPast = window.currentActiveEventIsPast || false;
  let totalActive = 0;
  let countActive = 0;

  allSawer.forEach(row => {
    const kat = getVal(row, "kategori", 3).toString().toLowerCase();
    const peruntukan = (row.peruntukan || row.Peruntukan || getVal(row, "peruntukan", -1) || "").toString().toLowerCase();
    const fullText = (kat + " " + peruntukan).trim();

    // Prioritaskan pencocokan agenda aktif (misal: Temu Anggota / Temu Anggota 2026)
    const isTargetEvent = cleanActiveEvent && (
      fullText.includes(cleanActiveEvent) ||
      cleanActiveEvent.includes(kat.replace(/^bantuan (khusus )?kegiatan:\s*/i, '').replace(/^dana hibah:\s*/i, '').trim()) ||
      (cleanActiveEvent.includes("temu anggota") && fullText.includes("temu anggota"))
    );

    let isMatch = false;
    if (isTargetEvent) {
      isMatch = true;
    } else if (cleanActiveEvent && cleanActiveEvent.includes("temu anggota") && (fullText.includes("temu") || fullText.includes("anggota 2026"))) {
      isMatch = true;
    } else if (!cleanActiveEvent) {
      isMatch = fullText.includes("kegiatan") || fullText.includes("acara");
    }

    if (isMatch) {
      totalActive += parseNumberRupiah(getVal(row, "nominal", 5));
      countActive++;
    }
  });

  const totalSanggarLain = Math.max(0, totalSawer - totalActive);

  // Tampilkan ke kartu ringkasan
  if (elTotal) elTotal.textContent = formatRupiah(totalSawer);
  if (elCount) elCount.textContent = `${donaturCount} Donatur (Semua Hibah Masuk)`;
  if (elActiveLabel) {
    elActiveLabel.textContent = activeEventName ? `Hibah: ${activeEventName}` : "Bantuan Kegiatan Terkini";
  }
  if (elActiveTotal) elActiveTotal.textContent = formatRupiah(totalActive);
  if (elActiveSub) {
    elActiveSub.textContent = countActive > 0 ? `${countActive} transaksi khusus agenda` : "Belum ada transaksi agenda ini";
  }
  if (elRataRata) elRataRata.textContent = formatRupiah(rataRata);

  const elSanggarTotal = document.getElementById("lapSawerSanggarTotal");
  if (elSanggarTotal) elSanggarTotal.textContent = formatRupiah(totalSanggarLain);

  const elSanggarSub = document.getElementById("lapSawerSanggarSub");
  if (elSanggarSub) {
    const countSanggar = Math.max(0, donaturCount - countActive);
    elSanggarSub.textContent = countSanggar > 0 ? `${countSanggar} transaksi fasilitas` : "Alat, sanggar & operasional";
  }

  const elAlokasiSub = document.getElementById("lapSawerAlokasiSub");
  if (elAlokasiSub) {
    elAlokasiSub.textContent = `${formatRupiah(totalActive)} acara • ${formatRupiah(totalSanggarLain)} fasilitas`;
  }

  // 3. Filter berdasarkan input pencarian & filter kategori
  const activeFilter = window.activeSawerFilter || 'all';
  const keyword = (document.getElementById("searchSawerMutasi")?.value || "").toLowerCase().trim();
  const filtered = allSawer.filter(row => {
    const ket = (getVal(row, "nama", 1) || getVal(row, "keterangan", 1) || "").toString().toLowerCase();
    const kat = getVal(row, "kategori", 3).toString().toLowerCase();
    const tgl = getVal(row, "tanggal", 0).toString().toLowerCase();
    const angkatan = getVal(row, "angkatan", 2).toString().toLowerCase();
    const pesan = (getVal(row, "pesan", 6) || row.pesan || "").toString().toLowerCase();
    const peruntukan = (row.peruntukan || row.Peruntukan || "").toString().toLowerCase();

    // Filter kategori chips
    if (activeFilter === 'acara') {
      const isAcara = kat.includes("kegiatan") || kat.includes("acara") || kat.includes("temu") || kat.includes("pentas") || peruntukan.includes("temu") || peruntukan.includes("acara") || peruntukan.includes("pentas");
      if (!isAcara) return false;
    } else if (activeFilter === 'sanggar') {
      const isSanggar = kat.includes("operasional") || kat.includes("sanggar") || kat.includes("alat") || kat.includes("fasilitas") || peruntukan.includes("operasional") || peruntukan.includes("fasilitas");
      if (!isSanggar) return false;
    } else if (activeFilter === 'pesan') {
      if (!pesan.trim() || pesan.trim() === '-' || pesan.trim() === 'null') return false;
    }

    if (!keyword) return true;
    return ket.includes(keyword) || kat.includes(keyword) || tgl.includes(keyword) || angkatan.includes(keyword) || pesan.includes(keyword) || peruntukan.includes(keyword);
  });

  // Update counter text
  const elCountText = document.getElementById("sawerCountText");
  if (elCountText) {
    if (filtered.length === allSawer.length) {
      elCountText.textContent = `Menampilkan semua (${allSawer.length}) riwayat dana hibah`;
    } else {
      elCountText.textContent = `Menampilkan ${filtered.length} dari ${allSawer.length} riwayat dana hibah`;
    }
  }

  if (!filtered.length) {
    container.innerHTML = `
      <div class="p-8 text-center text-slate-400 rounded-2xl bg-slate-950/40 border border-slate-800 flex flex-col items-center justify-center gap-3">
        <div class="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-cyan-400 flex items-center justify-center text-xl shadow-inner">
          <i class="fas fa-gift"></i>
        </div>
        <div>
          <p class="font-bold text-white text-sm">Tidak Ada Riwayat Hibah</p>
          <p class="text-xs text-slate-400 mt-0.5">Tidak ditemukan transaksi yang sesuai dengan filter atau kata kunci Anda.</p>
        </div>
        <button type="button" onclick="setSawerFilter('all'); const s=document.getElementById('searchSawerMutasi'); if(s) s.value=''; renderLaporanSawer();" class="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-700">
          <i class="fas fa-rotate-left text-[10px]"></i> Reset Filter
        </button>
      </div>`;
    return;
  }

  // 4. Urutkan secara kronologis menurun (paling baru di atas)
  const sorted = [...filtered].sort((a, b) => {
    const tglA = parseDateToTimestamp(getVal(a, "tanggal", 0));
    const tglB = parseDateToTimestamp(getVal(b, "tanggal", 0));
    return tglB - tglA;
  });

  // 5. Render Feed Daftar Saweran & Hibah dengan aksen tema Canva
  container.innerHTML = sorted.map(row => {
    const tgl      = escapeHtml(getVal(row, "tanggal", 0) || "-");
    const valNama  = (getVal(row, "nama", 1) || getVal(row, "keterangan", 1) || "").toString().trim();
    const namaOnly = escapeHtml(valNama || "Hamba Allah");
    const angkatan = escapeHtml((getVal(row, "angkatan", 2) || "").toString().trim());
    const katRaw   = (getVal(row, "kategori", 3) || row.peruntukan || "Bantuan Acara").toString().trim();
    const nominal  = parseNumberRupiah(getVal(row, "nominal", 5));
    const pesanRaw = (getVal(row, "pesan", 6) || row.pesan || "").toString().trim();

    // Clean peruntukan label: hilangkan prefix teknis agar ramah dibaca
    let cleanPeruntukan = katRaw
      .replace(/^bantuan (khusus )?(kegiatan|acara):\s*/i, '')
      .replace(/^dana hibah:\s*/i, '')
      .replace(/^hibah kegiatan:\s*/i, '')
      .trim();
    if (!cleanPeruntukan) cleanPeruntukan = "Dukungan Sanggar";

    const isAcara = /kegiatan|acara|pentas|temu|agenda/i.test(katRaw + " " + (row.peruntukan || ""));
    const avatarIcon = isAcara ? `<i class="fas fa-bullhorn text-xs"></i>` : `<i class="fas fa-gift text-xs"></i>`;
    const avatarBg = isAcara 
      ? `bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border-purple-400/30 text-purple-300` 
      : `bg-gradient-to-br from-pink-500/20 to-rose-500/20 border-pink-400/30 text-pink-300`;

    const badgePeruntukan = isAcara
      ? `<span class="sawer-badge text-[9px] sm:text-[10px] px-2.5 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-700/60 font-bold whitespace-nowrap inline-flex items-center gap-1 shadow-sm"><i class="fas fa-bullhorn text-[8px]"></i> ${escapeHtml(cleanPeruntukan)}</span>`
      : `<span class="sawer-badge text-[9px] sm:text-[10px] px-2.5 py-0.5 rounded-full bg-pink-950/80 text-pink-300 border border-pink-700/60 font-bold whitespace-nowrap inline-flex items-center gap-1 shadow-sm"><i class="fas fa-tools text-[8px]"></i> ${escapeHtml(cleanPeruntukan)}</span>`;

    const infoAngkatan = (angkatan && angkatan !== '-' && angkatan.toLowerCase() !== 'null')
      ? `<span class="sawer-angkatan px-2 py-0.5 rounded-full bg-cyan-400/15 border border-cyan-400/30 text-cyan-300 text-[10px] font-black tracking-wide shrink-0">Angk. ${angkatan}</span>`
      : '';

    const pesanDoaHtml = (pesanRaw && pesanRaw !== '-' && pesanRaw.toLowerCase() !== 'null') ? `
      <div class="sawer-quote mt-2.5 text-xs italic flex items-start gap-2 bg-slate-900/90 border border-slate-800 text-slate-300 px-3 py-2 rounded-xl border-l-4 border-l-cyan-400 overflow-hidden shadow-sm">
        <i class="fas fa-quote-left text-[10px] text-cyan-400 shrink-0 mt-0.5 opacity-80"></i>
        <span class="break-words font-serif leading-relaxed">"${escapeHtml(pesanRaw)}"</span>
      </div>
    ` : '';

    return `
      <div class="sawer-mutasi-card p-3 sm:p-4 rounded-2xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 transition-all shadow-sm group relative overflow-hidden">
        <!-- Glow bar gradasi Canva di sisi kiri -->
        <div class="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 via-purple-500 to-pink-500"></div>

        <div class="flex items-start justify-between gap-2.5">
          <!-- Kiri: Avatar, Nama Donatur Lengkap, Angkatan, Peruntukan & Tanggal -->
          <div class="flex items-start gap-2.5 min-w-0 flex-1 pl-1">
            <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${avatarBg} border flex items-center justify-center shrink-0 shadow-inner mt-0.5">
              ${avatarIcon}
            </div>
            <div class="min-w-0 flex-1">
              <!-- Baris 1: Nama Donatur Lengkap & Angkatan (Bebas Terpotong) -->
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="sawer-donor-name font-black text-white text-xs sm:text-sm tracking-tight leading-snug break-words group-hover:text-cyan-400 transition-colors">
                  ${namaOnly}
                </span>
                ${infoAngkatan}
              </div>

              <!-- Baris 2: Badge Peruntukan & Waktu Transaksi -->
              <div class="flex items-center gap-2 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 flex-wrap">
                ${badgePeruntukan}
                <span class="inline-flex items-center gap-1 shrink-0 text-slate-400">
                  <i class="far fa-clock text-cyan-400 text-[10px]"></i> ${tgl}
                </span>
              </div>
            </div>
          </div>

          <!-- Kanan: Nominal Bersih (Kompak & Bebas Tabrakan) -->
          <div class="text-right shrink-0 pl-1 pt-0.5">
            <div class="sawer-nominal font-black text-xs sm:text-sm text-emerald-500 dark:text-emerald-400 font-mono tracking-tight whitespace-nowrap">
              + ${formatRupiah(nominal)}
            </div>
          </div>
        </div>

        ${pesanDoaHtml}
      </div>
    `;
  }).join("");
}

// Controller Filter Kategori Dana Hibah
function setSawerFilter(filterType) {
  window.activeSawerFilter = filterType;
  const buttons = document.querySelectorAll("#filterSawerChips .sawer-filter-btn");
  buttons.forEach(btn => {
    if (btn.getAttribute("data-filter") === filterType) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
  renderLaporanSawer();
}

async function ensureLaporanSawerLoaded() {
  await ensureLaporanDanaLoaded();
  renderLaporanSawer();
}

window.renderLaporanSawer = renderLaporanSawer;
window.ensureLaporanSawerLoaded = ensureLaporanSawerLoaded;
window.setSawerFilter = setSawerFilter;

async function ensureLaporanDanaLoaded() {
  const cacheKey = "tq_cache_mutasi_dana";
  const cached = localStorage.getItem(cacheKey);
  if (cached && mutasiDanaData.length === 0) {
    try {
      const parsed = JSON.parse(cached);
      const isOldDummy = Array.isArray(parsed) && parsed.some(r => {
        const text = JSON.stringify(r).toLowerCase();
        return text.includes("laba kaos q store") || text.includes("perawatan lighting");
      });
      if (!isOldDummy) {
        mutasiDanaData = parsed;
        mutasiDanaLoaded = true;
        renderLaporanDana();
      } else {
        localStorage.removeItem(cacheKey);
      }
    } catch(e) {}
  }

  // Muat data resmi terpadu dari URL_DANA_ABADI (tanpa pernah menyentuh tab dummy lama)
  await loadDanaAbadi();
}

// ============================================================================
// 7. ANGGOTA (STATISTIK, GRAFIK INTERAKTIF, RENDER & FILTER)
// ============================================================================
let memberChartInstance = null;
let currentChartTab = "angkatan";
let cachedChartData = null;

function hitungStatistikAnggota() {
  if (!anggotaData || anggotaData.length === 0) return;
  const keys = Object.keys(anggotaData[0]);
  const keyStatus   = keys.find(k => k.toLowerCase().includes("status")) || "Status";
  const keyKategori = keys.find(k => k.toLowerCase().includes("kategori")) || "Kategori";
  const keyFakultas = keys.find(k => k.toLowerCase().includes("fakultas")) || "Fakultas";
  const keyAngkatan = keys.find(k => k.toLowerCase().includes("angkatan")) || "Tahun Angkatan";

  const total = anggotaData.length;
  const aktif = anggotaData.filter(r => {
    const val = (r[keyStatus] || "").toString().toLowerCase().trim();
    return val === "aktif" || val === "active" || val === "pengurus";
  }).length;

  const alumni = anggotaData.filter(r => {
    const val = (r[keyStatus] || "").toString().toLowerCase().trim();
    return val === "alumni" || val === "demisioner";
  }).length;

  // Temukan tahun angkatan terbaru secara dinamis & hitung distribusi per angkatan
  let latestYear = 0;
  const angkatanCount = {};
  const kategoriCount = {};
  const fakultasCount = {};

  anggotaData.forEach(r => {
    const k = (r[keyKategori] || "").trim();
    const f = (r[keyFakultas] || "").trim();
    const rawAkt = (r[keyAngkatan] || "").toString().trim();

    if (k && k !== "-") kategoriCount[k] = (kategoriCount[k] || 0) + 1;
    if (f && f !== "-") fakultasCount[f] = (fakultasCount[f] || 0) + 1;

    const matchYear = rawAkt.match(/(?:19|20)\d{2}/);
    if (matchYear) {
      const yr = parseInt(matchYear[0]);
      if (yr > latestYear) latestYear = yr;
      angkatanCount[yr] = (angkatanCount[yr] || 0) + 1;
    } else if (rawAkt.toLowerCase().includes("pendiri")) {
      angkatanCount["Pendiri"] = (angkatanCount["Pendiri"] || 0) + 1;
    } else if (rawAkt && rawAkt !== "-") {
      angkatanCount[rawAkt] = (angkatanCount[rawAkt] || 0) + 1;
    }
  });

  // Hitung jumlah anggota angkatan terbaru (tahun ini)
  const anggotaTahunIni = latestYear ? (angkatanCount[latestYear] || 0) : 0;

  function getMaxKey(obj) {
    let maxKey = "-", maxVal = 0;
    Object.entries(obj).forEach(([k, v]) => {
      if (v > maxVal) { maxVal = v; maxKey = k; }
    });
    return maxKey;
  }

  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  setTxt("statTotalAnggota", total);
  setTxt("statAnggotaAktif", aktif);
  setTxt("statAnggotaAlumni", alumni);

  const elLabelTahun = document.getElementById("statLabelTahunIni");
  if (elLabelTahun) {
    elLabelTahun.innerHTML = `
      <span class="block text-[9px] sm:text-[10px] text-amber-400/90 uppercase tracking-wider font-semibold leading-tight">Angkatan</span>
      <span class="block text-[11px] sm:text-xs font-black text-amber-300 leading-tight">Terbaru</span>
    `;
    elLabelTahun.title = latestYear ? `Angkatan Terbaru (Tahun ${latestYear}): ${anggotaTahunIni} Anggota` : "Anggota Angkatan Terbaru";
  }
  setTxt("statAnggotaTahunIni", anggotaTahunIni);
  setTxt("statKategoriPopuler", getMaxKey(kategoriCount));
  setTxt("statFakultasPopuler", getMaxKey(fakultasCount));
  setTxt("statJumlahKategori", Object.keys(kategoriCount).length || "-");
  setTxt("statJumlahFakultas", Object.keys(fakultasCount).length || "-");

  const elMeta = document.getElementById("chartTotalAnggotaMeta");
  if (elMeta) elMeta.textContent = `Total ${total} Anggota Terdata`;

  // Simpan data & render grafik
  cachedChartData = {
    angkatan: angkatanCount,
    fakultas: fakultasCount,
    kategori: kategoriCount
  };

  renderMemberStatisticsChart(currentChartTab || "angkatan");
}

function switchMemberChartTab(tab) {
  currentChartTab = tab;

  const tabs = ["angkatan", "fakultas", "kategori"];
  tabs.forEach(t => {
    const btn = document.getElementById(`btnChartTab${t.charAt(0).toUpperCase() + t.slice(1)}`);
    if (btn) {
      if (t === tab) {
        btn.className = "px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-blue-600 text-white shadow-sm flex items-center gap-1.5";
      } else {
        btn.className = "px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-slate-400 hover:text-white flex items-center gap-1.5";
      }
    }
  });

  renderMemberStatisticsChart(tab);
}

function renderMemberStatisticsChart(tab = "angkatan") {
  const canvas = document.getElementById("memberStatisticsChart");
  if (!canvas || typeof Chart === "undefined" || !cachedChartData) return;

  const ctx = canvas.getContext("2d");
  if (memberChartInstance) {
    memberChartInstance.destroy();
  }

  if (tab === "angkatan") {
    // Urutkan angkatan dari tertua (Pendiri, 1992, dst) ke terbaru
    const rawKeys = Object.keys(cachedChartData.angkatan);
    const sortedKeys = rawKeys.sort((a, b) => {
      if (a === "Pendiri") return -1;
      if (b === "Pendiri") return 1;
      return (parseInt(a) || 0) - (parseInt(b) || 0);
    });

    const labels = sortedKeys.map(k => k === "Pendiri" ? "Pendiri" : `'${String(k).slice(-2)}`);
    const values = sortedKeys.map(k => cachedChartData.angkatan[k]);

    const grad = ctx.createLinearGradient(0, 0, 0, 320);
    grad.addColorStop(0, "rgba(59, 130, 246, 0.95)");
    grad.addColorStop(1, "rgba(30, 58, 138, 0.35)");

    memberChartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          label: "Jumlah Anggota",
          data: values,
          backgroundColor: grad,
          borderColor: "#60a5fa",
          borderWidth: 1.5,
          borderRadius: 6,
          maxBarThickness: 26
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            titleColor: "#fde047",
            bodyColor: "#ffffff",
            borderColor: "rgba(245, 158, 11, 0.5)",
            borderWidth: 1,
            padding: 10,
            displayColors: false,
            callbacks: {
              title: (items) => {
                const idx = items[0].dataIndex;
                const rawKey = sortedKeys[idx];
                return rawKey === "Pendiri" ? "Angkatan Pendiri" : `Tahun Angkatan ${rawKey}`;
              },
              label: (item) => ` 👥 ${item.raw} Anggota Terdata`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: "#94a3b8", font: { size: 10, weight: 600 } }
          },
          y: {
            grid: { color: "rgba(148, 163, 184, 0.08)" },
            ticks: { color: "#94a3b8", font: { size: 10 } },
            beginAtZero: true
          }
        }
      }
    });
  } else if (tab === "fakultas") {
    const sorted = Object.entries(cachedChartData.fakultas)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    const labels = sorted.map(([k]) => k.length > 20 ? k.slice(0, 18) + "..." : k);
    const values = sorted.map(([, v]) => v);

    const colors = [
      "#f59e0b", "#3b82f6", "#10b981", "#8b5cf6",
      "#ec4899", "#06b6d4", "#f97316", "#64748b"
    ];

    memberChartInstance = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderColor: "#020617",
          borderWidth: 2.5,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: window.innerWidth < 640 ? "bottom" : "right",
            labels: { color: "#cbd5e1", font: { size: 11, weight: 600 }, padding: 12 }
          },
          tooltip: {
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            titleColor: "#fde047",
            bodyColor: "#ffffff",
            borderWidth: 1,
            borderColor: "rgba(148, 163, 184, 0.4)",
            padding: 10,
            callbacks: {
              label: (item) => ` ${item.raw} Anggota (${Math.round(item.parsed * 100 / (anggotaData.length || 1))}%)`
            }
          }
        },
        cutout: "58%"
      }
    });
  } else if (tab === "kategori") {
    const sorted = Object.entries(cachedChartData.kategori)
      .sort((a, b) => b[1] - a[1]);

    const labels = sorted.map(([k]) => k);
    const values = sorted.map(([, v]) => v);

    const colors = [
      "#8b5cf6", "#f59e0b", "#3b82f6", "#10b981",
      "#f43f5e", "#0ea5e9", "#eab308"
    ];

    memberChartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          label: "Jumlah Anggota",
          data: values,
          backgroundColor: colors.slice(0, labels.length),
          borderColor: "rgba(255, 255, 255, 0.1)",
          borderWidth: 1,
          borderRadius: 8,
          maxBarThickness: 45
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            titleColor: "#fde047",
            bodyColor: "#ffffff",
            borderColor: "rgba(148, 163, 184, 0.4)",
            borderWidth: 1,
            padding: 10
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: "#cbd5e1", font: { size: 11, weight: 600 } }
          },
          y: {
            grid: { color: "rgba(148, 163, 184, 0.08)" },
            ticks: { color: "#94a3b8", font: { size: 10 } },
            beginAtZero: true
          }
        }
      }
    });
  }
}

// ============================================================================
// HELPER FILTER WILAYAH DOMISILI ANGGOTA
// ============================================================================
function extractWilayahFromAlamat(alamatRaw) {
  if (!alamatRaw || alamatRaw === "-") return "";

  // 1. Bersihkan link maps dan simbol kurung
  let clean = alamatRaw.replace(/https?:\/\/[^\s\)]+/g, "").replace(/[\(\)]/g, "").trim();
  if (!clean) return "";

  // 2. Bersihkan kode pos (5 digit angka)
  clean = clean.replace(/\b\d{5}\b/g, "").trim();

  // Daftar nama provinsi untuk diabaikan (karena kita mencari Kota / Kabupaten)
  const PROVINSI_LIST = [
    "jawa timur", "jawa barat", "jawa tengah", "dki jakarta", "daerah khusus ibukota jakarta",
    "banten", "di yogyakarta", "daerah istimewa yogyakarta", "bali", "nusa tenggara barat",
    "nusa tenggara timur", "sumatera utara", "sumatera barat", "sumatera selatan", "riau",
    "kepulauan riau", "jambi", "bengkulu", "lampung", "bangka belitung", "kalimantan barat",
    "kalimantan tengah", "kalimantan selatan", "kalimantan timur", "kalimantan utara",
    "sulawesi selatan", "sulawesi utara", "sulawesi tengah", "sulawesi tenggara", "gorontalo",
    "sulawesi barat", "maluku", "maluku utara", "papua", "papua barat"
  ];

  const DAFTAR_KOTA = [
    // Jabodetabek & Jawa Barat
    "Depok", "Bogor", "Bekasi", "Jakarta Pusat", "Jakarta Selatan", "Jakarta Timur", "Jakarta Barat", "Jakarta Utara", "Jakarta",
    "Tangerang Selatan", "Tangerang", "Bandung", "Bandung Barat", "Cimahi", "Cirebon", "Sukabumi", "Tasikmalaya", "Garut",
    "Karawang", "Purwakarta", "Subang", "Indramayu", "Majalengka", "Kuningan", "Cianjur", "Ciamis", "Banjar", "Pangandaran",
    // Jawa Timur (Prioritas Utama Teater Q)
    "Surabaya", "Sidoarjo", "Gresik", "Mojokerto", "Pasuruan", "Malang", "Batu",
    "Jombang", "Lamongan", "Tuban", "Bojonegoro", "Kediri", "Blitar", "Tulungagung",
    "Trenggalek", "Nganjuk", "Madiun", "Magetan", "Ngawi", "Ponorogo", "Pacitan",
    "Probolinggo", "Lumajang", "Jember", "Bondowoso", "Situbondo", "Banyuwangi",
    "Bangkalan", "Sampang", "Pamekasan", "Sumenep",
    // Jawa Tengah & DIY
    "Semarang", "Yogyakarta", "Solo", "Surakarta", "Salatiga", "Magelang", "Pekalongan", "Tegal", "Kudus", "Pati", "Jepara",
    "Demak", "Kendal", "Batang", "Pemalang", "Brebes", "Banyumas", "Purwokerto", "Cilacap", "Purbalingga", "Banjarnegara",
    "Kebumen", "Purworejo", "Wonosobo", "Temanggung", "Boyolali", "Klaten", "Sukoharjo", "Wonogiri", "Karanganyar", "Sragen",
    "Sleman", "Bantul", "Gunungkidul", "Kulon Progo",
    // Luar Jawa / Bali
    "Denpasar", "Badung", "Gianyar", "Tabanan", "Buleleng", "Bali", "Mataram", "Lombok", "Kupang",
    "Medan", "Padang", "Palembang", "Pekanbaru", "Batam", "Bandar Lampung", "Banjarmasin", "Balikpapan", "Samarinda",
    "Pontianak", "Makassar", "Manado"
  ];

  // 3. Pecah berdasarkan tanda koma (standard hirarki penulisan alamat Indonesia)
  const rawSegments = clean.split(",").map(s => s.trim()).filter(Boolean);

  // Buat daftar segmen yang sudah dibersihkan dari nama provinsi
  const segments = [];
  for (const seg of rawSegments) {
    const sLower = seg.toLowerCase().trim();
    const isProv = PROVINSI_LIST.some(p => sLower === p || sLower === `provinsi ${p}` || sLower === `prov. ${p}`);
    if (!isProv) {
      let cleanedSeg = seg;
      for (const p of PROVINSI_LIST) {
        const regexP = new RegExp(`\\b(?:provinsi\\s+|prov\\.\\s+)?${p}\\b`, 'i');
        cleanedSeg = cleanedSeg.replace(regexP, "").trim();
      }
      if (cleanedSeg) segments.push(cleanedSeg);
    }
  }

  // Pola awalan yang menandakan jalan/gang/komplek/desa/RT/RW (BUKAN kota/kabupaten)
  const isStreetOrSub = (str) => {
    return /^(?:jl|jalan|gang|gg|lingkungan|komplek|perum|perumahan|dusun|dsn|kp|kampung|rt|rw|no|blok)\b/i.test(str) ||
           /\b(?:no\.|nomor)\s*\d+/i.test(str);
  };

  // 4. Cari pola eksplisit "Kota X" atau "Kabupaten X" / "Kab. X" (dari segmen paling belakang)
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i];
    if (isStreetOrSub(seg)) continue;

    const matchKab = seg.match(/(?:Kota|Kabupaten|Kab\.)\s+([A-Za-z\s]+)/i);
    if (matchKab && matchKab[1]) {
      const nama = matchKab[1].trim();
      if (nama.length > 2 && nama.length < 25) {
        return nama.charAt(0).toUpperCase() + nama.slice(1);
      }
    }
  }

  // 5. Pencocokan Kota dari SEGMEN PALING KANAN/AKHIR ke AWAL (Hierarki Kota sebelum Jalan)
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i];
    // Jangan cocokkan pada segmen nama jalan/gang/nomor rumah
    if (isStreetOrSub(seg)) continue;

    const segLower = seg.toLowerCase();

    for (const kota of DAFTAR_KOTA) {
      const kLower = kota.toLowerCase();
      // Khusus kata "Batu": jangan cocokkan jika bagian dari "Batu Alam", "Batu Ampar", "Batu Tulis", dll.
      if (kLower === "batu") {
        if (/batu\s+(?:alam|ampar|tulis|ceper|putih|merah|licin|bolong|batu|cincin|belah|kali)/i.test(segLower)) {
          continue;
        }
      }

      const reg = new RegExp(`\\b${kLower}\\b`, 'i');
      if (reg.test(segLower)) {
        if (kLower === "solo" || kLower === "surakarta") return "Solo (Surakarta)";
        return kota;
      }
    }
  }

  // 6. Fallback jika alamat tidak dipisah tanda koma: scan dari posisi paling belakang/kanan
  const textLower = clean.toLowerCase();
  let bestMatch = "";
  let lastPos = -1;

  for (const kota of DAFTAR_KOTA) {
    const kLower = kota.toLowerCase();
    if (kLower === "batu") {
      if (/batu\s+(?:alam|ampar|tulis|ceper|putih|merah|licin|bolong|kali)/i.test(textLower)) {
        continue;
      }
    }

    const reg = new RegExp(`\\b${kLower}\\b`, 'ig');
    let m;
    while ((m = reg.exec(textLower)) !== null) {
      // Pastikan kata kota ini tidak didahului langsung oleh jl/jalan/gg/gang
      const prefix = textLower.slice(Math.max(0, m.index - 15), m.index);
      if (/^(?:.*(?:jl|jalan|gang|gg)\.?\s*)$/i.test(prefix)) {
        continue;
      }
      if (m.index > lastPos) {
        lastPos = m.index;
        bestMatch = (kLower === "solo" || kLower === "surakarta") ? "Solo (Surakarta)" : kota;
      }
    }
  }

  if (bestMatch) return bestMatch;

  return "";
}

function populateWilayahFilter() {
  const select = document.getElementById("filterWilayahAnggota");
  const customList = document.getElementById("customWilayahList");
  if (!select) return;

  const currentVal = select.value || "";
  const countPerKota = {};

  anggotaData.forEach(row => {
    const keys = Object.keys(row);
    const kAlamat = keys.find(k => k.toLowerCase().includes("alamat")) || "Alamat";
    const alamat = row[kAlamat] || "";
    const kota = extractWilayahFromAlamat(alamat);
    if (kota) {
      countPerKota[kota] = (countPerKota[kota] || 0) + 1;
    } else if (alamat && alamat.trim() !== "" && alamat.trim() !== "-") {
      countPerKota["Lainnya"] = (countPerKota["Lainnya"] || 0) + 1;
    }
  });

  const sortedKota = Object.keys(countPerKota).sort((a, b) => {
    if (a === "Lainnya") return 1;
    if (b === "Lainnya") return -1;
    return countPerKota[b] - countPerKota[a];
  });

  // 1. Sinkronisasi hidden select
  let optionsHtml = `<option value="">📍 Semua Wilayah (${anggotaData.length})</option>`;
  sortedKota.forEach(kota => {
    const selected = (currentVal.toLowerCase() === kota.toLowerCase()) ? "selected" : "";
    optionsHtml += `<option value="${kota}" ${selected}>${kota} (${countPerKota[kota]})</option>`;
  });
  select.innerHTML = optionsHtml;

  // 2. Render ke Custom Dropdown List (Modern & Ringan)
  if (customList) {
    let listHtml = `
      <button type="button" onclick="selectCustomWilayah('', 'Semua Wilayah (${anggotaData.length})')" class="custom-wilayah-btn w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2.5 transition-colors ${!currentVal ? 'bg-sky-600/20 text-sky-300 font-bold border border-sky-500/30' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}" data-kota="semua wilayah all">
        <span class="flex-1 flex items-center gap-2 leading-snug">
          <i class="fas fa-location-dot text-[10px] shrink-0 ${!currentVal ? 'text-sky-400' : 'text-slate-500'}"></i>
          <span class="font-medium">Semua Wilayah</span>
        </span>
        <span class="text-[10px] px-2 py-0.5 rounded-full shrink-0 ${!currentVal ? 'bg-sky-500/30 text-sky-200 font-bold' : 'bg-slate-800 text-slate-400 font-mono'}">
          ${anggotaData.length}
        </span>
      </button>
    `;

    sortedKota.forEach(kota => {
      const isSel = (currentVal.toLowerCase() === kota.toLowerCase());
      listHtml += `
        <button type="button" onclick="selectCustomWilayah('${escapeHtml(kota)}', '${escapeHtml(kota)} (${countPerKota[kota]})')" class="custom-wilayah-btn w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2.5 transition-colors ${isSel ? 'bg-sky-600/20 text-sky-300 font-bold border border-sky-500/30' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}" data-kota="${escapeHtml(kota.toLowerCase())}">
          <span class="flex-1 flex items-center gap-2 leading-snug">
            <i class="fas fa-location-dot text-[10px] shrink-0 ${isSel ? 'text-sky-400' : 'text-slate-500'}"></i>
            <span class="font-medium break-words">${escapeHtml(kota)}</span>
          </span>
          <span class="text-[10px] px-2 py-0.5 rounded-full shrink-0 ${isSel ? 'bg-sky-500/30 text-sky-200 font-bold' : 'bg-slate-800 text-slate-400 font-mono'}">
            ${countPerKota[kota]}
          </span>
        </button>
      `;
    });

    customList.innerHTML = listHtml;
  }
}

function toggleWilayahDropdown() {
  const menu = document.getElementById("customWilayahMenu");
  const arrow = document.getElementById("iconWilayahArrow");
  if (!menu) return;
  const isHidden = menu.classList.contains("hidden");
  if (isHidden) {
    menu.classList.remove("hidden");
    if (arrow) arrow.classList.add("rotate-180");
    const searchInput = document.getElementById("searchKotaWilayah");
    if (searchInput) {
      searchInput.value = "";
      filterWilayahListItems("");
      // Jangan auto-focus agar keyboard di HP tidak otomatis muncul
    }
  } else {
    closeWilayahDropdown();
  }
}

function closeWilayahDropdown() {
  const menu = document.getElementById("customWilayahMenu");
  const arrow = document.getElementById("iconWilayahArrow");
  if (menu) menu.classList.add("hidden");
  if (arrow) arrow.classList.remove("rotate-180");
}

function filterWilayahListItems(query) {
  const q = (query || "").toLowerCase().trim();
  const items = document.querySelectorAll("#customWilayahList .custom-wilayah-btn");
  items.forEach(it => {
    const text = (it.dataset.kota || it.textContent).toLowerCase();
    it.style.display = (!q || text.includes(q)) ? "flex" : "none";
  });
}

function selectCustomWilayah(kota, displayLabel) {
  const select = document.getElementById("filterWilayahAnggota");
  if (select) {
    select.value = kota;
  }
  const labelEl = document.getElementById("selectedWilayahLabel");
  if (labelEl) {
    labelEl.textContent = kota || "Semua Wilayah";
  }

  const items = document.querySelectorAll("#customWilayahList .custom-wilayah-btn");
  items.forEach(it => {
    const itKota = (it.dataset.kota || "");
    const match = (!kota && (itKota.includes("semua") || itKota.includes("all"))) || (kota && itKota === kota.toLowerCase());
    if (match) {
      it.className = "custom-wilayah-btn w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors bg-sky-600/20 text-sky-300 font-bold border border-sky-500/30";
    } else {
      it.className = "custom-wilayah-btn w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors text-slate-300 hover:bg-slate-800 hover:text-white";
    }
  });

  closeWilayahDropdown();
  anggotaLimit = 20;
  renderAnggota();
}

// Helper Ekstraksi Tahun Angkatan Bersih (Contoh: "1992", "2018")
function extractAngkatan(val) {
  if (!val) return "";
  const s = String(val).trim();
  if (!s || s === "-" || s === "0" || s.toLowerCase() === "null") return "";
  const match = s.match(/\b(19\d{2}|20\d{2})\b/);
  if (match) return match[1];
  return s;
}

// Inisialisasi & Populasi Dropdown Filter Angkatan
function populateAngkatanFilter() {
  const select = document.getElementById("filterAngkatanAnggota");
  const customList = document.getElementById("customAngkatanList");
  if (!select) return;

  const currentVal = select.value || "";
  const countPerAngkatan = {};

  anggotaData.forEach(row => {
    const keys = Object.keys(row);
    const kAngkatan = keys.find(k => k.toLowerCase().includes("angkatan")) || "Tahun Angkatan";
    const rawVal = row[kAngkatan] || "";
    const angk = extractAngkatan(rawVal);
    if (angk) {
      countPerAngkatan[angk] = (countPerAngkatan[angk] || 0) + 1;
    } else {
      countPerAngkatan["Lainnya"] = (countPerAngkatan["Lainnya"] || 0) + 1;
    }
  });

  const sortedAngkatan = Object.keys(countPerAngkatan).sort((a, b) => {
    if (a === "Lainnya") return 1;
    if (b === "Lainnya") return -1;
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numB - numA; // Urutkan tahun terbaru ke terlama
    }
    return a.localeCompare(b);
  });

  // 1. Sinkronisasi hidden select
  let optionsHtml = `<option value="">🎓 Semua Angkatan (${anggotaData.length})</option>`;
  sortedAngkatan.forEach(angk => {
    const selected = (currentVal.toLowerCase() === angk.toLowerCase()) ? "selected" : "";
    optionsHtml += `<option value="${angk}" ${selected}>${angk} (${countPerAngkatan[angk]})</option>`;
  });
  select.innerHTML = optionsHtml;

  // 2. Render ke Custom Dropdown List Modern
  if (customList) {
    let listHtml = `
      <button type="button" onclick="selectCustomAngkatan('', 'Semua Angkatan (${anggotaData.length})')" class="custom-angkatan-btn w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2.5 transition-colors ${!currentVal ? 'bg-amber-600/20 text-amber-300 font-bold border border-amber-500/30' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}" data-angkatan="semua angkatan all">
        <span class="flex-1 flex items-center gap-2 leading-snug">
          <i class="fas fa-graduation-cap text-[10px] shrink-0 ${!currentVal ? 'text-amber-400' : 'text-slate-500'}"></i>
          <span class="font-medium">Semua Angkatan</span>
        </span>
        <span class="text-[10px] px-2 py-0.5 rounded-full shrink-0 ${!currentVal ? 'bg-amber-500/30 text-amber-200 font-bold' : 'bg-slate-800 text-slate-400 font-mono'}">
          ${anggotaData.length}
        </span>
      </button>
    `;

    sortedAngkatan.forEach(angk => {
      const isSel = (currentVal.toLowerCase() === angk.toLowerCase());
      listHtml += `
        <button type="button" onclick="selectCustomAngkatan('${escapeHtml(angk)}', '${escapeHtml(angk)} (${countPerAngkatan[angk]})')" class="custom-angkatan-btn w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2.5 transition-colors ${isSel ? 'bg-amber-600/20 text-amber-300 font-bold border border-amber-500/30' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}" data-angkatan="${escapeHtml(angk.toLowerCase())}">
          <span class="flex-1 flex items-center gap-2 leading-snug">
            <i class="fas fa-graduation-cap text-[10px] shrink-0 ${isSel ? 'text-amber-400' : 'text-slate-500'}"></i>
            <span class="font-medium break-words">${escapeHtml(angk)}</span>
          </span>
          <span class="text-[10px] px-2 py-0.5 rounded-full shrink-0 ${isSel ? 'bg-amber-500/30 text-amber-200 font-bold' : 'bg-slate-800 text-slate-400 font-mono'}">
            ${countPerAngkatan[angk]}
          </span>
        </button>
      `;
    });

    customList.innerHTML = listHtml;
  }
}

function toggleAngkatanDropdown() {
  const menu = document.getElementById("customAngkatanMenu");
  const arrow = document.getElementById("iconAngkatanArrow");
  if (!menu) return;
  closeWilayahDropdown();

  const isHidden = menu.classList.contains("hidden");
  if (isHidden) {
    menu.classList.remove("hidden");
    if (arrow) arrow.classList.add("rotate-180");
    const searchInput = document.getElementById("searchAngkatanFilter");
    if (searchInput) {
      searchInput.value = "";
      filterAngkatanListItems("");
      // Jangan auto-focus agar keyboard di HP tidak otomatis muncul
    }
  } else {
    closeAngkatanDropdown();
  }
}

function closeAngkatanDropdown() {
  const menu = document.getElementById("customAngkatanMenu");
  const arrow = document.getElementById("iconAngkatanArrow");
  if (menu) menu.classList.add("hidden");
  if (arrow) arrow.classList.remove("rotate-180");
}

function filterAngkatanListItems(query) {
  const q = (query || "").toLowerCase().trim();
  const items = document.querySelectorAll("#customAngkatanList .custom-angkatan-btn");
  items.forEach(it => {
    const text = (it.dataset.angkatan || it.textContent).toLowerCase();
    it.style.display = (!q || text.includes(q)) ? "flex" : "none";
  });
}

function selectCustomAngkatan(angkatan, displayLabel) {
  const select = document.getElementById("filterAngkatanAnggota");
  if (select) {
    select.value = angkatan;
  }
  const labelEl = document.getElementById("selectedAngkatanLabel");
  if (labelEl) {
    labelEl.textContent = angkatan ? `Angkatan ${angkatan}` : "Semua Angkatan";
  }

  const items = document.querySelectorAll("#customAngkatanList .custom-angkatan-btn");
  items.forEach(it => {
    const itAngk = (it.dataset.angkatan || "");
    const match = (!angkatan && (itAngk.includes("semua") || itAngk.includes("all"))) || (angkatan && itAngk === angkatan.toLowerCase());
    if (match) {
      it.className = "custom-angkatan-btn w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors bg-amber-600/20 text-amber-300 font-bold border border-amber-500/30";
    } else {
      it.className = "custom-angkatan-btn w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors text-slate-300 hover:bg-slate-800 hover:text-white";
    }
  });

  closeAngkatanDropdown();
  anggotaLimit = 20;
  renderAnggota();
}

function renderAnggota() {
  const container = document.getElementById("anggotaGrid");
  const btnContainer = document.getElementById("btnLoadMoreContainer");
  const infoText = document.getElementById("anggotaCounterInfo");
  if (!container) return;

  const keyword = (document.getElementById("searchAnggota")?.value || "").toLowerCase();
  const filterKota = (document.getElementById("filterWilayahAnggota")?.value || "").toLowerCase();
  const filterAngkatan = (document.getElementById("filterAngkatanAnggota")?.value || "").toLowerCase();

  const filtered = anggotaData.filter(row => {
    const keys = Object.keys(row);
    const kNama     = keys.find(k => k.toLowerCase().includes("nama")) || "Nama";
    const kAngkatan = keys.find(k => k.toLowerCase().includes("angkatan")) || "Tahun Angkatan";
    const kAlamat   = keys.find(k => k.toLowerCase().includes("alamat")) || "Alamat";

    const namaVal = (row[kNama] || "").toLowerCase().trim();
    if (!namaVal || namaVal === "-" || namaVal === "nama") return false;

    const angkatanRaw = String(row[kAngkatan] || "").trim();
    const angkatanVal = angkatanRaw.toLowerCase();
    const alamatRaw = row[kAlamat] || "";
    const alamatVal = alamatRaw.toLowerCase();

    const matchKeyword = !keyword ||
      namaVal.includes(keyword) ||
      angkatanVal.includes(keyword) ||
      alamatVal.includes(keyword);

    let matchKota = true;
    if (filterKota) {
      const kotaMember = extractWilayahFromAlamat(alamatRaw).toLowerCase();
      if (filterKota === "lainnya") {
        matchKota = !kotaMember && alamatRaw.trim() !== "" && alamatRaw.trim() !== "-";
      } else {
        matchKota = (kotaMember === filterKota) || alamatVal.includes(filterKota);
      }
    }

    let matchAngkatan = true;
    if (filterAngkatan) {
      const parsedAngk = extractAngkatan(angkatanRaw).toLowerCase();
      matchAngkatan = (parsedAngk === filterAngkatan) || angkatanVal.includes(filterAngkatan);
    }

    return matchKeyword && matchKota && matchAngkatan;
  });

  updateSectionCounter("anggota", filtered.length);

  if (!filtered.length) {
    container.innerHTML = "<div style='grid-column:1/-1;text-align:center;'>Tidak ada anggota yang sesuai filter.</div>";
    if (btnContainer) btnContainer.style.display = "none";
    return;
  }

  const dataToRender = filtered.slice(0, anggotaLimit);
  currentRenderedAnggota = dataToRender;

  const sampleRow = dataToRender[0] || {};
  const keys = Object.keys(sampleRow);
  const kNama     = keys.find(k => k.toLowerCase().includes("nama")) || "Nama";
  const kAngkatan = keys.find(k => k.toLowerCase().includes("angkatan")) || "Tahun Angkatan";
  const kFakultas = keys.find(k => k.toLowerCase().includes("fakultas")) || "Fakultas";
  const kKategori = keys.find(k => k.toLowerCase().includes("kategori")) || "Kategori";
  const kStatus   = keys.find(k => k.toLowerCase().includes("status")) || "Status";
  const kWa       = keys.find(k => k.toLowerCase().includes("wa") || k.toLowerCase().includes("hp")) || "Wa";
  const kAlamat   = keys.find(k => k.toLowerCase().includes("alamat")) || "Alamat";

  container.innerHTML = dataToRender.map((row, idx) => {

    const namaRaw = row[kNama] || "-";
    const angkatan = row[kAngkatan] || "-";
    const fakultas = row[kFakultas] || "-";
    const kategori = row[kKategori] || "-";
    const statusRaw = (row[kStatus] || "").toLowerCase();
    const foto = getAnggotaFotoUrl(row);
    const hpRaw = row[kWa] || "";
    const waLink = waLinkFromNumber(hpRaw);
    const alamatRaw = row[kAlamat] || "";
    const kotaMember = extractWilayahFromAlamat(alamatRaw);

    let badgeStyle = "bg-gray-600 text-white";
    if (statusRaw.includes("aktif") || statusRaw.includes("pengurus")) badgeStyle = "bg-blue-600 text-white";
    else if (statusRaw.includes("alumni") || statusRaw.includes("demisioner")) badgeStyle = "bg-slate-700 text-white";

    let catStyle = "bg-gray-500 text-white";
    const catLower = kategori.toLowerCase();
    if (catLower.includes("pendiri")) catStyle = "bg-yellow-600 text-white";
    else if (catLower.includes("istimewa")) catStyle = "bg-purple-600 text-white";
    else if (catLower.includes("luar biasa")) catStyle = "bg-rose-600 text-white";
    else if (catLower.includes("kehormatan")) catStyle = "bg-emerald-600 text-white";
    else if (catLower.includes("biasa")) catStyle = "bg-cyan-600 text-white";

    return `
      <div class="bg-gradient-to-br from-gray-100 to-slate-300 rounded-xl shadow-xl overflow-hidden flex flex-col transform transition hover:scale-[1.02] duration-300 border border-white/40 relative group-hover:shadow-2xl">
        <div class="relative h-48 overflow-hidden group bg-slate-200 border-b border-slate-300">
          <img 
            src="${foto || DEFAULT_NO_IMAGE}" 
            class="w-full h-full object-contain object-center transition-transform duration-500 group-hover:scale-110 drop-shadow-md cursor-pointer js-lightbox" 
            alt="${escapeHtml(namaRaw)}" 
            loading="lazy" 
            decoding="async" 
            onerror="this.onerror=null; this.src=DEFAULT_NO_IMAGE;"
            data-full="${foto || DEFAULT_NO_IMAGE}"
          >
          <div class="absolute top-2 left-2 z-10 px-2 py-1 rounded-md text-[10px] font-bold uppercase shadow-md border border-white/20 tracking-wide ${catStyle}">${escapeHtml(kategori)}</div>
          <div class="absolute top-2 right-2 z-10 px-2 py-1 rounded-md text-[10px] font-bold uppercase shadow-md border border-white/20 tracking-wide ${badgeStyle}">${escapeHtml(statusRaw)}</div>
        </div>

        <div class="p-4 flex-1 flex flex-col">
          <h3 class="font-bold text-slate-800 text-lg mb-1 line-clamp-1 drop-shadow-sm">${escapeHtml(namaRaw)}</h3>
          <div class="flex items-center justify-between text-xs font-semibold mb-2">
            <span class="text-blue-700 font-bold">${escapeHtml(angkatan)} | ${escapeHtml(fakultas)}</span>
            ${kotaMember ? `<span class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300 shrink-0 shadow-2xs"><i class="fas fa-location-dot text-emerald-600 text-[9px]"></i> ${escapeHtml(kotaMember)}</span>` : ''}
          </div>
          <div class="mt-auto pt-3 border-t border-slate-300/50 flex gap-1.5">
            <button onclick="openDetailByIndex(${idx})" 
              class="flex-1 bg-white/80 hover:bg-white text-slate-800 py-2 rounded-lg text-xs font-bold transition-all shadow-sm hover:shadow-md border border-slate-200">
              Detail
            </button>
            <button onclick="openKtaByIndex(${idx})" 
              class="px-2.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-lg text-xs transition-all shadow-sm hover:shadow-md flex items-center gap-1 active:scale-95" title="Buka & Unduh E-KTA Resmi">
              <i class="fas fa-id-card text-xs"></i> KTA
            </button>
            ${waLink ? `<a href="${waLink}" target="_blank" class="px-2.5 py-2 bg-gradient-to-r from-green-100 to-green-200 text-green-700 rounded-lg hover:from-green-200 hover:to-green-300 transition-all shadow-sm border border-green-300 flex items-center justify-center"><i class="fab fa-whatsapp text-base"></i></a>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join("");

  if (filtered.length > anggotaLimit) {
    if (btnContainer) btnContainer.style.display = "block";
    if (infoText) infoText.textContent = `Menampilkan ${anggotaLimit} dari ${filtered.length} anggota`;
  } else {
    if (btnContainer) btnContainer.style.display = "none";
  }
}

function loadMoreAnggota() {
  anggotaLimit += 20;
  renderAnggota();
}

async function ensureAnggotaLoaded() {
  const isAnggotaPage = () => {
    const sec = document.querySelector(".page[data-page='anggota']");
    return sec && sec.style.display !== "none";
  };

  if (anggotaLoaded && anggotaData.length > 0) {
    if (isAnggotaPage()) {
      populateWilayahFilter();
      populateAngkatanFilter();
      renderAnggota();
    }
    return;
  }

  const cacheKey = "tq_cache_anggota_v3";

  // Self-healing: jika cache lama urutannya kacau (bukan TQ-001 dan TQ-002 di awal), bersihkan otomatis
  try {
    const rawCache = localStorage.getItem(cacheKey);
    if (rawCache) {
      const parsed = JSON.parse(rawCache);
      if (Array.isArray(parsed) && parsed.length > 1) {
        const idRow0 = String(parsed[0]?.id || parsed[0]?.ID || "");
        const idRow1 = String(parsed[1]?.id || parsed[1]?.ID || "");
        if (idRow0 !== "TQ-001" || idRow1 !== "TQ-002") {
          localStorage.removeItem(cacheKey);
          anggotaData = [];
        }
      }
    }
  } catch(e) {}

  const cachedData = localStorage.getItem(cacheKey);
  if (cachedData && anggotaData.length === 0) {
    try {
      anggotaData = JSON.parse(cachedData);
      if (isAnggotaPage()) {
        populateWilayahFilter();
        populateAngkatanFilter();
        renderAnggota();
      }
      hitungStatistikAnggota();
    } catch(e) {}
  }
  if (anggotaLoading) return;
  anggotaLoading = true;
  try {
    let newData = null;
    if (window.SupabaseDB && window.SupabaseDB.isConfigured()) {
      try {
        newData = await window.SupabaseDB.getAnggota();
      } catch (errSb) {
        console.warn("[Anggota] Supabase fetch error, fallback ke TSV:", errSb);
      }
    }
    if (!newData || !newData.length) {
      newData = await loadTSV(URL_ANGGOTA);
    }
    anggotaData = newData;
    try {
      localStorage.setItem(cacheKey, JSON.stringify(newData));
    } catch(errStore) {
      console.warn("Storage quota saat cache anggota, tetap aktif di memory:", errStore);
    }
    anggotaLoaded = true;
    if (isAnggotaPage()) {
      populateWilayahFilter();
      populateAngkatanFilter();
      renderAnggota();
    }
    hitungStatistikAnggota();
  } catch (e) {
    console.error("Gagal memuat data anggota:", e);
  } finally {
    anggotaLoading = false;
  }
}

// Helper memformat tanggal lahir (DD/MM/YYYY) agar konsisten dan cerdas mengenali format M/D/YYYY (US)
function formatTanggalLahirDisplay(val) {
  if (!val) return "";
  const str = String(val).trim();
  if (!str || str === "-" || str === "undefined" || str === "null") return "";

  // 0. Format GVIZ Date (contoh: Date(1979,4,6))
  if (str.startsWith("Date(")) {
    const gMatch = str.match(/^Date\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+),\s*(\d+),\s*(\d+))?\)$/);
    if (gMatch) {
      const year = gMatch[1];
      const month = String(parseInt(gMatch[2], 10) + 1).padStart(2, "0");
      const day = String(gMatch[3]).padStart(2, "0");
      return `${day}/${month}/${year}`;
    }
  }

  // 1. ISO timestamp
  if (str.includes("T") && (str.endsWith("Z") || str.includes("+") || str.includes("-"))) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
  }

  // 2. YYYY-MM-DD atau YYYY/MM/DD
  const matchYmd = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (matchYmd) {
    const year = matchYmd[1];
    const month = String(matchYmd[2]).padStart(2, "0");
    const day = String(matchYmd[3]).padStart(2, "0");
    return `${day}/${month}/${year}`;
  }

  // 3. DD/MM/YYYY atau MM/DD/YYYY (contoh: 5/28/1973 -> 28/05/1973)
  const matchDmy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (matchDmy) {
    const p1 = parseInt(matchDmy[1], 10);
    const p2 = parseInt(matchDmy[2], 10);
    const year = matchDmy[3];
    if (p2 > 12 && p1 <= 12) {
      const day = String(p2).padStart(2, "0");
      const month = String(p1).padStart(2, "0");
      return `${day}/${month}/${year}`;
    }
    const day = String(p1).padStart(2, "0");
    const month = String(p2).padStart(2, "0");
    return `${day}/${month}/${year}`;
  }

  return str;
}

let currentActiveMemberIndex = null;

// Helper membuka modal detail anggota berdasarkan indeks array (Aman dari kutip, simbol & syntax error)
function openDetailByIndex(idx) {
  currentActiveMemberIndex = idx;
  const row = currentRenderedAnggota[idx];
  if (!row) return;

  const keys = Object.keys(row);
  const kNama     = keys.find(k => k.toLowerCase().includes("nama")) || "Nama";
  const kAngkatan = keys.find(k => k.toLowerCase().includes("angkatan")) || "Tahun Angkatan";
  const kFakultas = keys.find(k => k.toLowerCase().includes("fakultas")) || "Fakultas";
  const kJurusan  = keys.find(k => k.toLowerCase() === "jurusan" || k.toLowerCase().includes("prodi"));
  const kJenkel   = keys.find(k => k.toLowerCase().includes("kelamin") || k.toLowerCase() === "gender" || k.toLowerCase() === "jk");
  const kWa       = keys.find(k => k.toLowerCase().includes("wa") || k.toLowerCase().includes("hp")) || "Wa";

  const nama = row[kNama] || "-";
  const angkatan = row[kAngkatan] || "-";
  let fakultas = row[kFakultas] || "-";
  let jurusan = (kJurusan ? row[kJurusan] : (row["Jurusan"] || row["jurusan"] || "")) || "";
  const jenkel = (kJenkel ? row[kJenkel] : (row["Jenis Kelamin"] || row["jenis kelamin"] || "")) || "";

  if (!jurusan && fakultas && (fakultas.includes("/") || fakultas.includes(" - "))) {
    const delimiter = fakultas.includes("/") ? "/" : " - ";
    const parts = fakultas.split(delimiter);
    fakultas = parts[0].trim();
    jurusan = parts.slice(1).join(delimiter).trim();
  }

  const foto = getAnggotaFotoUrl(row);
  const hpRaw = row[kWa] || "";

  const tempat  = (row["Tempat Lahir"] || "").trim();
  const tanggal = formatTanggalLahirDisplay(row["Tanggal Lahir"]);
  const alamat  = row["Alamat"] || "-";

  let ttlFull = "-";
  if (tempat && tanggal) {
    ttlFull = `${tempat}, ${tanggal}`;
  } else if (tempat || tanggal) {
    ttlFull = tempat || tanggal;
  }

  const memberId = row.ID || row.id || "";
  openDetail(nama, angkatan, foto, fakultas, ttlFull, alamat, hpRaw, jurusan, jenkel, memberId);
}

// ============================================================================
// FITUR E-KTA RESMI DIGITAL (INTERAKTIF 3D FLIP & UNDUH HD SIAP CETAK)
// ============================================================================
let currentKtaMemberData = null;
let isKtaCardFlipped = false;

// Helper konversi gambar ke Data URL Base64 (Mencegah canvas blank / ter-taint saat ekspor html2canvas)
async function loadBase64Image(url) {
  if (!url) return DEFAULT_NO_IMAGE;
  if (url.startsWith("data:")) return url;

  function loadAndDraw(src, crossOrigin = "anonymous") {
    return new Promise((resolve, reject) => {
      const img = new Image();
      if (crossOrigin) img.crossOrigin = crossOrigin;
      img.onload = () => {
        try {
          const cvs = document.createElement("canvas");
          cvs.width = img.naturalWidth || img.width || 300;
          cvs.height = img.naturalHeight || img.height || 400;
          const ctx = cvs.getContext("2d");
          ctx.drawImage(img, 0, 0, cvs.width, cvs.height);
          const dataUrl = cvs.toDataURL("image/jpeg", 0.92);
          resolve(dataUrl);
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => reject(new Error("Image load error"));
      setTimeout(() => reject(new Error("Image load timeout")), 5000);
      img.src = src;
    });
  }

  // Jika URL adalah path lokal (mis: assets/...), langsung load tanpa proxy eksternal
  if (!url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("//")) {
    try {
      const localRes = await loadAndDraw(url);
      if (localRes) return localRes;
    } catch (e) {
      return url;
    }
  }

  // 1. Coba via Cloudflare Images Proxy (weserv.nl) yang menyediakan header Access-Control-Allow-Origin: *
  try {
    let cleanUrl = url;
    if (cleanUrl.startsWith("//")) cleanUrl = "https:" + cleanUrl;
    const proxyWeserv = `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&w=600&h=800&fit=cover&output=jpg`;
    const weservRes = await loadAndDraw(proxyWeserv, "anonymous");
    if (weservRes) return weservRes;
  } catch (e) {}

  // 2. Coba via allorigins proxy
  try {
    let cleanUrl = url;
    const alloriginsUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(cleanUrl)}`;
    const alloriginsRes = await loadAndDraw(alloriginsUrl, "anonymous");
    if (alloriginsRes) return alloriginsRes;
  } catch (e) {}

  // 3. Coba direct fetch / load
  try {
    const directRes = await loadAndDraw(url, "anonymous");
    if (directRes) return directRes;
  } catch (e) {}

  // 4. Fallback ke placeholder jika gagal
  return DEFAULT_NO_IMAGE;
}

function openKtaByIndex(idx) {
  const row = currentRenderedAnggota[idx];
  if (!row) return;

  const keys = Object.keys(row);
  const kNama     = keys.find(k => k.toLowerCase().includes("nama")) || "Nama";
  const kAngkatan = keys.find(k => k.toLowerCase().includes("angkatan")) || "Tahun Angkatan";
  const kFakultas = keys.find(k => k.toLowerCase().includes("fakultas")) || "Fakultas";
  const kKategori = keys.find(k => k.toLowerCase().includes("kategori")) || "Kategori";
  const kId       = keys.find(k => k.toLowerCase().includes("id") || k.toLowerCase().includes("nia") || k.toLowerCase().includes("no")) || "";

  const nama = (row[kNama] || "-").trim();
  const angkatan = (row[kAngkatan] || "-").trim();
  const fakultas = (row[kFakultas] || "-").trim();
  const kategori = (row[kKategori] || "Anggota").trim();
  const foto = getAnggotaFotoUrl(row);
  const tempat  = (row["Tempat Lahir"] || "").trim();
  const tanggal = formatTanggalLahirDisplay(row["Tanggal Lahir"]);
  let ttlFull = "-";
  if (tempat && tanggal) ttlFull = `${tempat}, ${tanggal}`;
  else if (tempat || tanggal) ttlFull = tempat || tanggal;

  let cleanAngkatan = angkatan.replace(/[^0-9]/g, "");
  let yearCode = cleanAngkatan ? cleanAngkatan.slice(-2) : "00";
  let serialNum = String(idx + 1).padStart(3, "0");
  let nia = (row[kId] && String(row[kId]).trim()) ? String(row[kId]).trim() : `TQ.${yearCode}.${serialNum}`;

  currentKtaMemberData = {
    nama,
    angkatan,
    fakultas,
    kategori,
    foto: foto || DEFAULT_NO_IMAGE,
    fotoBase64: null,
    qrBase64: null,
    ttl: ttlFull,
    nia: nia
  };

  showKtaModal();
}

function openKtaFromCurrentDetail() {
  if (currentActiveMemberIndex !== null && currentRenderedAnggota && currentRenderedAnggota[currentActiveMemberIndex]) {
    openKtaByIndex(currentActiveMemberIndex);
    return;
  }

  const nama = document.getElementById("modalNama")?.textContent || "-";
  const angkatan = document.getElementById("modalAngkatan")?.textContent || "-";
  const fakultas = document.getElementById("modalFakultas")?.textContent || "-";
  const foto = document.getElementById("modalFoto")?.src || DEFAULT_NO_IMAGE;
  const ttl = document.getElementById("modalTTL")?.textContent || "-";

  let cleanAngkatan = angkatan.replace(/[^0-9]/g, "");
  let yearCode = cleanAngkatan ? cleanAngkatan.slice(-2) : "00";
  let nia = `TQ.${yearCode}.001`;

  currentKtaMemberData = {
    nama,
    angkatan,
    fakultas,
    kategori: "Anggota",
    foto,
    fotoBase64: null,
    qrBase64: null,
    ttl,
    nia
  };

  showKtaModal();
}

function getCurrentKetuaUmumInfo() {
  const defaultInfo = {
    nama: "TAHTA DHILLAH NAUFAL ARROMDHONI",
    periode: "2025–2026"
  };

  // Coba ambil dari cache jika memory belum terisi
  if ((!pengurusData || pengurusData.length === 0) && typeof localStorage !== "undefined") {
    try {
      const cached = localStorage.getItem("tq_cache_pengurus");
      if (cached) pengurusData = JSON.parse(cached);
    } catch (e) {}
  }

  if (!pengurusData || pengurusData.length === 0) {
    return defaultInfo;
  }

  // Filter pengurus yang jabatannya KETUA UMUM
  const ketumList = pengurusData.filter(row => {
    const jab = (row["JABATAN"] || row["Jabatan"] || "").toLowerCase();
    return jab.includes("ketua umum") || jab.includes("ketum");
  });

  if (ketumList.length === 0) return defaultInfo;

  // Urutkan berdasarkan tahun periode terbesar (terbaru)
  ketumList.sort((a, b) => {
    const getYear = (row) => {
      const p = row["PERIODE"] || row["Periode"] || "";
      const match = p.match(/(19|20)\d{2}/g);
      if (match) return Math.max(...match.map(y => parseInt(y, 10)));
      return 0;
    };
    return getYear(b) - getYear(a);
  });

  const latestKetum = ketumList[0];
  const nama = (latestKetum["NAMA"] || latestKetum["Nama"] || defaultInfo.nama).trim().toUpperCase();
  const rawPeriode = (latestKetum["PERIODE"] || latestKetum["Periode"] || defaultInfo.periode).trim();

  return {
    nama,
    periode: rawPeriode
  };
}

function updateKtaKetumDisplay() {
  const ketum = getCurrentKetuaUmumInfo();
  const elKetumNama = document.getElementById("ktaKetumNama");
  const elKetumPeriode = document.getElementById("ktaKetumPeriode");
  if (elKetumNama) elKetumNama.textContent = ketum.nama;
  if (elKetumPeriode) elKetumPeriode.textContent = `KETUA UMUM PERIODE ${ketum.periode}`;

  const elSambutanNama = document.getElementById("sambutanKetumNama");
  const elSambutanPeriode = document.getElementById("sambutanKetumPeriode");
  if (elSambutanNama) elSambutanNama.textContent = ketum.nama;
  if (elSambutanPeriode) elSambutanPeriode.textContent = `Ketua Umum ${ketum.periode}`;
}

function showKtaModal() {
  if (!currentKtaMemberData) return;
  const m = currentKtaMemberData;

  // Pastikan data pengurus termuat & perbarui info Ketua Umum di kartu
  ensurePengurusLoaded();
  updateKtaKetumDisplay();

  const elNama = document.getElementById("ktaNama");
  const elAngkatan = document.getElementById("ktaAngkatan");
  const elFakultas = document.getElementById("ktaFakultas");
  const elTTL = document.getElementById("ktaTTL");
  const elFoto = document.getElementById("ktaFoto");
  const elNiaHeader = document.getElementById("ktaNiaHeader");
  const elCardSerial = document.getElementById("ktaCardSerial");
  const elQrImg = document.getElementById("ktaQrImg");

  if (elNama) elNama.textContent = m.nama;
  if (elAngkatan) elAngkatan.textContent = m.angkatan;
  if (elFakultas) elFakultas.textContent = m.fakultas || "Syariah & Hukum";
  if (elTTL) elTTL.textContent = m.ttl;
  if (elFoto) elFoto.src = m.foto;
  if (elNiaHeader) elNiaHeader.textContent = `NIA: ${m.nia}`;
  if (elCardSerial) elCardSerial.textContent = `NO: ${m.nia} • TEATER Q`;

  // Update SVG Badge Kategori Vektor & Label Foto (Pasti Presisi Dead-Center)
  const kat = (m.kategori || "Anggota").trim();
  const kLower = kat.toLowerCase();
  const svgText = document.getElementById("ktaKatSvgText");
  const svgRect = document.getElementById("ktaKatSvgRect");
  const fotoLabelText = document.getElementById("ktaFotoLabelText");
  const fotoLabelRect = document.getElementById("ktaFotoLabelRect");

  if (svgText) {
    svgText.textContent = kat.toUpperCase();
    if (kLower.includes("pendiri")) {
      if (svgRect) { svgRect.setAttribute("fill", "url(#katGradGold)"); svgRect.setAttribute("stroke", "#f59e0b"); }
      svgText.setAttribute("fill", "#0f172a");
      if (fotoLabelText) { fotoLabelText.textContent = "PENDIRI"; fotoLabelText.setAttribute("fill", "#020617"); }
      if (fotoLabelRect) { fotoLabelRect.setAttribute("fill", "#f59e0b"); fotoLabelRect.setAttribute("stroke", "#fbbf24"); }
    } else if (kLower.includes("istimewa")) {
      if (svgRect) { svgRect.setAttribute("fill", "url(#katGradPurple)"); svgRect.setAttribute("stroke", "#a78bfa"); }
      svgText.setAttribute("fill", "#ffffff");
      if (fotoLabelText) { fotoLabelText.textContent = "ISTIMEWA"; fotoLabelText.setAttribute("fill", "#ffffff"); }
      if (fotoLabelRect) { fotoLabelRect.setAttribute("fill", "#7c3aed"); fotoLabelRect.setAttribute("stroke", "#c4b5fd"); }
    } else if (kLower.includes("luar biasa")) {
      if (svgRect) { svgRect.setAttribute("fill", "url(#katGradRose)"); svgRect.setAttribute("stroke", "#fb7185"); }
      svgText.setAttribute("fill", "#ffffff");
      if (fotoLabelText) { fotoLabelText.textContent = "LUAR BIASA"; fotoLabelText.setAttribute("fill", "#ffffff"); }
      if (fotoLabelRect) { fotoLabelRect.setAttribute("fill", "#e11d48"); fotoLabelRect.setAttribute("stroke", "#fda4af"); }
    } else if (kLower.includes("kehormatan")) {
      if (svgRect) { svgRect.setAttribute("fill", "url(#katGradEmerald)"); svgRect.setAttribute("stroke", "#34d399"); }
      svgText.setAttribute("fill", "#ffffff");
      if (fotoLabelText) { fotoLabelText.textContent = "KEHORMATAN"; fotoLabelText.setAttribute("fill", "#ffffff"); }
      if (fotoLabelRect) { fotoLabelRect.setAttribute("fill", "#059669"); fotoLabelRect.setAttribute("stroke", "#6ee7b7"); }
    } else {
      if (svgRect) { svgRect.setAttribute("fill", "url(#katGradBlue)"); svgRect.setAttribute("stroke", "#38bdf8"); }
      svgText.setAttribute("fill", "#ffffff");
      if (fotoLabelText) { fotoLabelText.textContent = "ANGGOTA"; fotoLabelText.setAttribute("fill", "#fef08a"); }
      if (fotoLabelRect) { fotoLabelRect.setAttribute("fill", "#0f172a"); fotoLabelRect.setAttribute("stroke", "#f59e0b"); }
    }
  }

  // QR Code MURNI ID / NIA Anggota untuk Scanner Presensi & Absensi (sama persis dengan KTA Admin)
  const qrData = (m.nia || "").trim();
  const rawQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;
  if (elQrImg) {
    elQrImg.src = rawQrUrl;
    elQrImg.alt = `QR Code ${qrData}`;
  }
  const elQrNia = document.getElementById("ktaQrNia");
  if (elQrNia) {
    elQrNia.textContent = qrData;
  }

  // Pre-load foto, logo & QR ke Base64 di background agar saat diunduh LANGSUNG TERSEDIA & TIDAK KOSONG
  const elLogo = document.getElementById("ktaLogoImg");
  if (elLogo && !elLogo.src.startsWith("data:")) {
    loadBase64Image("assets/logo.png").then(b64Logo => {
      if (b64Logo && b64Logo !== DEFAULT_NO_IMAGE) {
        elLogo.src = b64Logo;
      }
    }).catch(() => {});
  }

  loadBase64Image(m.foto).then(b64 => {
    if (b64 && b64 !== DEFAULT_NO_IMAGE) {
      m.fotoBase64 = b64;
      if (elFoto) elFoto.src = b64;
    }
  }).catch(() => {});

  loadBase64Image(rawQrUrl).then(b64Qr => {
    if (b64Qr) {
      m.qrBase64 = b64Qr;
      if (elQrImg) elQrImg.src = b64Qr;
    }
  }).catch(() => {});



  isKtaCardFlipped = false;
  const innerCard = document.getElementById("ktaCardInner");
  if (innerCard) innerCard.classList.remove("is-flipped");

  const modal = document.getElementById("modalKtaDigital");
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    modal.removeAttribute("aria-hidden");
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => {
      modal.classList.remove("opacity-0");
      modal.classList.add("opacity-100");
    });
    updateKtaCardScale();
    setTimeout(updateKtaCardScale, 50);
  }
}

function updateKtaCardScale() {
  const outer = document.getElementById("ktaStageOuter");
  if (!outer) return;
  const parent = outer.parentElement;
  const availW = parent ? parent.clientWidth : window.innerWidth;
  const targetW = Math.min(480, Math.max(260, availW));
  const scale = Math.max(0.55, Math.min(1, targetW / 480));
  outer.style.setProperty("--kta-scale", scale);
  outer.style.height = `${Math.round(302 * scale)}px`;
}

if (typeof window !== "undefined") {
  window.addEventListener("resize", updateKtaCardScale);
  window.addEventListener("orientationchange", () => setTimeout(updateKtaCardScale, 100));
}

function toggleKtaFlip() {
  const innerCard = document.getElementById("ktaCardInner");
  if (!innerCard) return;
  isKtaCardFlipped = !isKtaCardFlipped;
  if (isKtaCardFlipped) {
    innerCard.classList.add("is-flipped");
  } else {
    innerCard.classList.remove("is-flipped");
  }
}

function closeKtaModal() {
  const modal = document.getElementById("modalKtaDigital");
  if (modal) {
    modal.classList.remove("opacity-100");
    modal.classList.add("opacity-0");
    document.body.style.overflow = "";
    setTimeout(() => {
      modal.classList.remove("flex");
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden", "true");
    }, 200);
  }
}

async function downloadKtaImage(side) {
  if (typeof html2canvas === "undefined") {
    showToast("Komponen ekspor sedang dimuat, coba 1 detik lagi.", "info");
    return;
  }

  const targetId = side === "back" ? "ktaCardBack" : "ktaCardFront";
  const targetEl = document.getElementById(targetId);
  if (!targetEl) return;

  const innerCard = document.getElementById("ktaCardInner");

  showToast(`Menyiapkan KTA Sisi ${side === "back" ? "Belakang" : "Depan"} resolusi cetak HD...`, "info");

  // Pastikan gambar sudah dalam bentuk Base64 sebelum canvas dirasterisasi
  const elFoto = document.getElementById("ktaFoto");
  const elQr = document.getElementById("ktaQrImg");
  if (side === "front" && currentKtaMemberData) {
    if (!currentKtaMemberData.fotoBase64 && currentKtaMemberData.foto && currentKtaMemberData.foto !== DEFAULT_NO_IMAGE) {
      try {
        const b64 = await loadBase64Image(currentKtaMemberData.foto);
        currentKtaMemberData.fotoBase64 = b64;
        if (elFoto) elFoto.src = b64;
      } catch (e) {}
    } else if (currentKtaMemberData.fotoBase64 && elFoto) {
      elFoto.src = currentKtaMemberData.fotoBase64;
    }
  } else if (side === "back" && currentKtaMemberData) {
    if (!currentKtaMemberData.qrBase64 && elQr && elQr.src) {
      try {
        const b64Qr = await loadBase64Image(elQr.src);
        currentKtaMemberData.qrBase64 = b64Qr;
        if (elQr) elQr.src = b64Qr;
      } catch (e) {}
    } else if (currentKtaMemberData.qrBase64 && elQr) {
      elQr.src = currentKtaMemberData.qrBase64;
    }
  }

  // Tambahkan class is-exporting pada elemen target untuk menonaktifkan rotateY (mencegah teks terbalik/mirrored)
  targetEl.classList.add("is-exporting");

  // Jeda 220ms agar browser merender style flat 2D
  setTimeout(() => {
    html2canvas(targetEl, {
      scale: 3, // Skala 3x menghasilkan resolusi tajam ~1440x906px untuk cetak PVC CR-80
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      logging: false,
      onclone: (clonedDoc) => {
        const clonedCard = clonedDoc.getElementById(targetId);
        const clonedInner = clonedDoc.getElementById("ktaCardInner");
        
        // Reset transformasi ancestor agar tidak ada rotasi bertumpuk
        if (clonedInner) {
          clonedInner.style.setProperty("transform", "none", "important");
          clonedInner.style.setProperty("-webkit-transform", "none", "important");
          clonedInner.classList.remove("is-flipped");
        }

        if (clonedCard) {
          clonedCard.classList.add("is-exporting");
          clonedCard.style.setProperty("transform", "none", "important");
          clonedCard.style.setProperty("-webkit-transform", "none", "important");
          clonedCard.style.setProperty("position", "relative", "important");
          clonedCard.style.setProperty("top", "0", "important");
          clonedCard.style.setProperty("left", "0", "important");
          // Gunakan 480px x 302px agar proporsi sama persis (1:1) dengan yang dilihat di web modal, tidak melar/renggang
          clonedCard.style.setProperty("width", "480px", "important");
          clonedCard.style.setProperty("height", "302px", "important");
          clonedCard.style.setProperty("max-width", "none", "important");
          clonedCard.style.setProperty("max-height", "none", "important");
          clonedCard.style.setProperty("box-shadow", "none", "important");
          clonedCard.style.setProperty("border-radius", "18px", "important");
          clonedCard.style.setProperty("overflow", "visible", "important");
          clonedCard.style.setProperty("backface-visibility", "visible", "important");
          clonedCard.style.setProperty("-webkit-backface-visibility", "visible", "important");

          // Pastikan semua kontainer teks memiliki overflow visible
          const allTextEls = clonedCard.querySelectorAll("div, span, p, ol, li");
          allTextEls.forEach(el => {
            el.style.overflow = "visible";
          });

          // Sembunyikan instruksi interaktif web ("Klik untuk balik") pada hasil cetak
          const hideEls = clonedCard.querySelectorAll(".kta-hide-on-export");
          hideEls.forEach(el => el.style.setProperty("display", "none", "important"));

          // Tampilkan teks resmi KTA pada hasil unduhan
          const showEls = clonedCard.querySelectorAll(".kta-show-on-export");
          showEls.forEach(el => el.style.setProperty("display", "inline-block", "important"));
        }
      }
    }).then(canvas => {
      const link = document.createElement("a");
      const memberName = (currentKtaMemberData && currentKtaMemberData.nama) 
        ? currentKtaMemberData.nama.replace(/[^a-zA-Z0-9]/g, "_") 
        : "Anggota";
      link.download = `KTA_TeaterQ_${memberName}_${side.toUpperCase()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      showToast(`KTA Sisi ${side === "back" ? "Belakang" : "Depan"} berhasil diunduh! Siap dicetak. ✨`, "success");
    }).catch(err => {
      console.error("KTA Export error:", err);
      showToast("Gagal memproses gambar KTA, silakan coba lagi.", "error");
    }).finally(() => {
      targetEl.classList.remove("is-exporting");
    });
  }, 220);
}

// ============================================================================
// FITUR EKSPOR & CETAK LEMBAR KTA MASSAL (A4 PDF / PVC CR-80 10 KARTU/LEMBAR)
// ============================================================================

async function openBulkKtaExportModal() {
  const modal = document.getElementById("modalBulkKtaExport");
  if (!modal) return;

  // Pastikan data direktori anggota sudah termuat
  if (!anggotaLoaded || anggotaData.length === 0) {
    showToast("Memuat direktori data anggota...", "info");
    await ensureAnggotaLoaded();
  }

  populateBulkExportFilters();
  updateBulkExportPreviewCount();

  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeBulkKtaExportModal() {
  const modal = document.getElementById("modalBulkKtaExport");
  if (modal) {
    modal.classList.remove("flex");
    modal.classList.add("hidden");
  }
}

function populateBulkExportFilters() {
  const selAngkatan = document.getElementById("bulkExportAngkatanFilter");
  if (!selAngkatan) return;

  const currentVal = selAngkatan.value || "all";
  selAngkatan.innerHTML = '<option value="all">Semua Angkatan</option>';

  if (!anggotaData || anggotaData.length === 0) return;

  const setAngkatan = new Set();
  anggotaData.forEach(m => {
    const keys = Object.keys(m);
    const kAngkatan = keys.find(k => k.toLowerCase().includes("angkatan")) || "Tahun Angkatan";
    const val = (m[kAngkatan] || "").trim();
    if (val && val !== "-" && !val.toLowerCase().includes("pendiri")) {
      setAngkatan.add(val);
    }
  });

  const arr = Array.from(setAngkatan).sort((a, b) => {
    const numA = parseInt(a.replace(/[^0-9]/g, "")) || 0;
    const numB = parseInt(b.replace(/[^0-9]/g, "")) || 0;
    return numB - numA;
  });

  arr.forEach(akt => {
    const opt = document.createElement("option");
    opt.value = akt;
    opt.textContent = `Angkatan ${akt}`;
    selAngkatan.appendChild(opt);
  });

  if (Array.from(selAngkatan.options).some(o => o.value === currentVal)) {
    selAngkatan.value = currentVal;
  }
}

function getFilteredBulkAnggota() {
  if (!anggotaData || anggotaData.length === 0) return [];

  const filterAngkatan = (document.getElementById("bulkExportAngkatanFilter")?.value || "all").toLowerCase();
  const filterKategori = (document.getElementById("bulkExportKategoriFilter")?.value || "all").toLowerCase();

  const filtered = anggotaData.filter(row => {
    const keys = Object.keys(row);
    const kNama     = keys.find(k => k.toLowerCase().includes("nama")) || "Nama";
    const kAngkatan = keys.find(k => k.toLowerCase().includes("angkatan")) || "Tahun Angkatan";
    const kKategori = keys.find(k => k.toLowerCase().includes("kategori")) || "Kategori";

    const nama = (row[kNama] || "").trim();
    if (!nama || nama === "-") return false;

    const angkatan = (row[kAngkatan] || "").trim().toLowerCase();
    const kategori = (row[kKategori] || "").trim().toLowerCase();

    let matchAngkatan = true;
    if (filterAngkatan !== "all") {
      matchAngkatan = angkatan.includes(filterAngkatan);
    }

    let matchKategori = true;
    if (filterKategori !== "all") {
      matchKategori = kategori.includes(filterKategori);
    }

    return matchAngkatan && matchKategori;
  });

  return filtered.map((row, idx) => {
    const keys = Object.keys(row);
    const kNama     = keys.find(k => k.toLowerCase().includes("nama")) || "Nama";
    const kAngkatan = keys.find(k => k.toLowerCase().includes("angkatan")) || "Tahun Angkatan";
    const kFakultas = keys.find(k => k.toLowerCase().includes("fakultas")) || "Fakultas";
    const kKategori = keys.find(k => k.toLowerCase().includes("kategori")) || "Kategori";
    const kId       = keys.find(k => k.toLowerCase().includes("id") || k.toLowerCase().includes("nia") || k.toLowerCase().includes("no")) || "";
    const kWa       = keys.find(k => k.toLowerCase().includes("wa") || k.toLowerCase().includes("hp")) || "Wa";
    const kAlamat   = keys.find(k => k.toLowerCase().includes("alamat")) || "Alamat";

    const nama = (row[kNama] || "-").trim();
    const angkatan = (row[kAngkatan] || "-").trim();
    const fakultas = (row[kFakultas] || "-").trim();
    const kategori = (row[kKategori] || "Anggota").trim();
    const foto = getAnggotaFotoUrl(row);
    const wa = (row[kWa] || "").trim();
    const alamat = (row[kAlamat] || "").trim();

    const tempat  = (row["Tempat Lahir"] || "").trim();
    const tanggal = formatTanggalLahirDisplay(row["Tanggal Lahir"]);
    let ttlFull = "-";
    if (tempat && tanggal) ttlFull = `${tempat}, ${tanggal}`;
    else if (tempat || tanggal) ttlFull = tempat || tanggal;

    let cleanAngkatan = angkatan.replace(/[^0-9]/g, "");
    let yearCode = cleanAngkatan ? cleanAngkatan.slice(-2) : "00";
    let serialNum = String(idx + 1).padStart(3, "0");
    let nia = (row[kId] && String(row[kId]).trim()) ? String(row[kId]).trim() : `TQ.${yearCode}.${serialNum}`;

    return {
      idx,
      nama,
      angkatan,
      fakultas,
      kategori,
      foto: foto || DEFAULT_NO_IMAGE,
      ttl: ttlFull,
      nia,
      wa,
      alamat,
      safeId: `tq_${idx}_${Date.now()}`
    };
  });
}

function updateBulkExportPreviewCount() {
  const members = getFilteredBulkAnggota();
  const side = document.querySelector('input[name="bulkExportSide"]:checked')?.value || "duplex";
  
  const elTotal = document.getElementById("bulkExportTotalCountText");
  const elSheet = document.getElementById("bulkExportSheetCountText");
  if (!elTotal || !elSheet) return;

  const count = members.length;
  const sheets = Math.ceil(count / 10);

  elTotal.textContent = `${count} Anggota Terpilih`;
  
  if (count === 0) {
    elSheet.textContent = "Tidak ada anggota yang cocok dengan filter.";
    return;
  }

  if (side === "duplex") {
    elSheet.textContent = `${sheets} Lembar A4 (Total ${sheets * 2} Halaman Bolak-Balik Presisi)`;
  } else if (side === "front") {
    elSheet.textContent = `${sheets} Lembar A4 (Hanya Sisi Depan)`;
  } else {
    elSheet.textContent = `${sheets} Lembar A4 (Hanya Sisi Belakang)`;
  }
}

function exportKtaDataCsv() {
  const members = getFilteredBulkAnggota();
  if (!members.length) {
    showToast("Tidak ada data anggota untuk diekspor ke CSV.", "warning");
    return;
  }

  const headers = ["No", "NIA", "Nama Lengkap", "Angkatan", "Fakultas", "Kategori", "Tempat Tanggal Lahir", "Alamat", "WhatsApp", "Link Foto", "Link Verifikasi QR"];
  
  const rows = members.map((m, i) => {
    const verifyUrl = `https://ukmteaterq.com/?verify=${encodeURIComponent(m.nama)}&nia=${encodeURIComponent(m.nia)}`;
    return [
      i + 1,
      `"${m.nia.replace(/"/g, '""')}"`,
      `"${m.nama.replace(/"/g, '""')}"`,
      `"${m.angkatan.replace(/"/g, '""')}"`,
      `"${m.fakultas.replace(/"/g, '""')}"`,
      `"${m.kategori.replace(/"/g, '""')}"`,
      `"${m.ttl.replace(/"/g, '""')}"`,
      `"${m.alamat.replace(/"/g, '""')}"`,
      `"${m.wa.replace(/"/g, '""')}"`,
      `"${m.foto.replace(/"/g, '""')}"`,
      `"${verifyUrl.replace(/"/g, '""')}"`
    ].join(",");
  });

  const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Data_KTA_TeaterQ_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast("File data KTA (Excel/CSV) berhasil diunduh!", "success");
}

function renderSingleKtaCardHtml(m, side) {
  if (side === "front") {
    const kat = (m.kategori || "Anggota").trim();
    const kLower = kat.toLowerCase();
    let katGrad = "url(#katGradBlue)";
    let katStroke = "#38bdf8";
    let katTextFill = "#ffffff";
    let fotoLabelText = "ANGGOTA";
    let fotoLabelFill = "#fef08a";
    let fotoRectFill = "#0f172a";
    let fotoRectStroke = "#f59e0b";

    if (kLower.includes("pendiri")) {
      katGrad = "url(#katGradGold)";
      katStroke = "#f59e0b";
      katTextFill = "#0f172a";
      fotoLabelText = "PENDIRI";
      fotoLabelFill = "#020617";
      fotoRectFill = "#f59e0b";
      fotoRectStroke = "#fbbf24";
    } else if (kLower.includes("istimewa")) {
      katGrad = "url(#katGradPurple)";
      katStroke = "#a78bfa";
      katTextFill = "#ffffff";
      fotoLabelText = "ISTIMEWA";
      fotoLabelFill = "#ffffff";
      fotoRectFill = "#7c3aed";
      fotoRectStroke = "#c4b5fd";
    } else if (kLower.includes("luar biasa")) {
      katGrad = "url(#katGradRose)";
      katStroke = "#fb7185";
      katTextFill = "#ffffff";
      fotoLabelText = "LUAR BIASA";
      fotoLabelFill = "#ffffff";
      fotoRectFill = "#e11d48";
      fotoRectStroke = "#fda4af";
    } else if (kLower.includes("kehormatan")) {
      katGrad = "url(#katGradEmerald)";
      katStroke = "#34d399";
      katTextFill = "#ffffff";
      fotoLabelText = "KEHORMATAN";
      fotoLabelFill = "#ffffff";
      fotoRectFill = "#059669";
      fotoRectStroke = "#6ee7b7";
    }

    return `
      <div class="print-card-slot">
        <div class="print-card-inner print-face-front">
          <div class="print-inner-contour"></div>
          
          <!-- Header Kartu -->
          <div class="print-card-header">
            <div style="display:flex; align-items:center; gap:8px;">
              <!-- Emblem Logo Bulat Medali Emas Berkelas (Bebas Kotak Kaku) -->
              <div style="width:36px; height:36px; border-radius:50%; background:#ffffff; border:1.8px solid #fbbf24; padding:2px; box-shadow:0 0 8px rgba(251,191,36,0.6); display:flex; align-items:center; justify-content:center; flex-shrink:0; overflow:hidden;">
                <img src="assets/logo.png" alt="Logo" style="width:100%; height:100%; object-fit:contain; display:block;" onerror="this.src='https://ui-avatars.com/api/?name=TQ&background=dc2626&color=fff';" />
              </div>
              <div>
                <div style="font-size:10.5px; font-weight:900; color:#fde047; text-transform:uppercase; line-height:1.25; letter-spacing:0.5px;">UKM PAGUYUBAN TEATER Q</div>
                <div style="font-size:7.5px; font-weight:700; color:#cbd5e1; text-transform:uppercase; line-height:1.25; margin-top:2px;">FSH UIN SUNAN AMPEL SURABAYA</div>
              </div>
            </div>
            <div style="text-align:right; display:flex; flex-direction:column; align-items:flex-end;">
              <svg viewBox="0 0 84 22" width="84" height="22" style="display:block;">
                <defs>
                  <linearGradient id="ktaGradRed_${m.idx}" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#dc2626"/>
                    <stop offset="100%" stop-color="#b45309"/>
                  </linearGradient>
                </defs>
                <rect x="1" y="1" width="82" height="20" rx="10" fill="url(#ktaGradRed_${m.idx})" stroke="#f59e0b" stroke-width="1.2"/>
                <text x="42" y="11.5" dominant-baseline="central" text-anchor="middle" fill="#ffffff" font-size="8" font-weight="900" letter-spacing="0.8">KTA RESMI</text>
              </svg>
              <div style="font-size:7.5px; color:#fbbf24; font-family:monospace; margin-top:3px; letter-spacing:-0.5px;">NIA: ${escapeHtml(m.nia)}</div>
            </div>
          </div>

          <!-- Body Kartu Depan -->
          <div class="print-card-body">
            <!-- Foto 3x4 Proporsional Gagah -->
            <div style="position:relative; flex-shrink:0;">
              <div style="width:102px; height:132px; border-radius:12px; overflow:hidden; border:2px solid rgba(251,191,36,0.95); background:#020617; box-sizing:border-box;">
                <img src="${escapeHtml(m.foto)}" alt="Foto" style="width:100%; height:100%; object-fit:cover; object-position:center; display:block;" onerror="this.src='assets/logo.png';" />
              </div>
              <div style="position:absolute; bottom:-10px; left:50%; transform:translateX(-50%);">
                <svg viewBox="0 0 74 18" width="74" height="18" style="display:block;">
                  <rect x="1" y="1" width="72" height="16" rx="8" fill="${fotoRectFill}" stroke="${fotoRectStroke}" stroke-width="1"/>
                  <text x="37" y="9.5" dominant-baseline="central" text-anchor="middle" fill="${fotoLabelFill}" font-size="7.5" font-weight="900" letter-spacing="0.8">${fotoLabelText}</text>
                </svg>
              </div>
            </div>

            <!-- Data Anggota -->
            <div style="flex:1; min-width:0; padding-left:4px; display:flex; flex-direction:column; gap:5px;">
              <div style="display:flex; align-items:center; justify-content:space-between;">
                <svg viewBox="0 0 94 22" width="94" height="22" style="display:block;">
                  <defs>
                    <linearGradient id="katGrad_${m.idx}" x1="0%" y1="0%" x2="100%" y2="100%">
                      ${kLower.includes("pendiri") ? '<stop offset="0%" stop-color="#fbbf24"/><stop offset="50%" stop-color="#fef08a"/><stop offset="100%" stop-color="#d97706"/>' :
                        kLower.includes("istimewa") ? '<stop offset="0%" stop-color="#8b5cf6"/><stop offset="100%" stop-color="#6d28d9"/>' :
                        kLower.includes("luar biasa") ? '<stop offset="0%" stop-color="#f43f5e"/><stop offset="100%" stop-color="#be123c"/>' :
                        kLower.includes("kehormatan") ? '<stop offset="0%" stop-color="#10b981"/><stop offset="100%" stop-color="#047857"/>' :
                        '<stop offset="0%" stop-color="#0ea5e9"/><stop offset="100%" stop-color="#0284c7"/>'}
                    </linearGradient>
                  </defs>
                  <rect x="1" y="1" width="92" height="20" rx="10" fill="url(#katGrad_${m.idx})" stroke="${katStroke}" stroke-width="1.2"/>
                  <text x="47" y="11.5" dominant-baseline="central" text-anchor="middle" fill="${katTextFill}" font-size="8.5" font-weight="900" letter-spacing="1">${escapeHtml(kat.toUpperCase())}</text>
                </svg>

                <!-- Smartcard Golden EMV Chip -->
                <div style="width:32px; height:24px; border-radius:6px; background:linear-gradient(135deg, #f59e0b, #fef08a, #d97706); border:1px solid #fde047; padding:2px; display:flex; flex-direction:column; justify-content:space-between; opacity:0.9;">
                  <div style="height:1px; background:rgba(69,26,3,0.5); width:100%; margin-top:4px;"></div>
                  <div style="height:1px; background:rgba(69,26,3,0.5); width:100%; margin-bottom:4px;"></div>
                </div>
              </div>

              <div>
                <div style="font-size:7px; color:#94a3b8; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">Nama Lengkap Anggota</div>
                <div style="font-size:13.5px; font-weight:900; color:#fef08a; text-transform:uppercase; letter-spacing:0.2px; line-height:1.2; word-break:break-word; margin-top:1px;">${escapeHtml(m.nama)}</div>
              </div>

              <div>
                <div style="font-size:7px; color:#94a3b8; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">Angkatan / Fakultas</div>
                <div style="font-size:10px; font-weight:800; line-height:1.25; margin-top:1px; color:#ffffff;">
                  <span style="color:#fbbf24; font-weight:900;">${escapeHtml(m.angkatan)}</span>
                  <span style="color:#64748b; font-weight:normal; margin:0 4px;">•</span>
                  <span style="color:#e2e8f0; font-weight:700;">${escapeHtml(m.fakultas || "Syariah & Hukum")}</span>
                </div>
              </div>

              <div>
                <div style="font-size:7px; color:#94a3b8; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">Tempat, Tanggal Lahir</div>
                <div style="font-size:9.5px; font-weight:700; color:#f1f5f9; line-height:1.25; word-break:break-word; margin-top:1px;">${escapeHtml(m.ttl || "-")}</div>
              </div>

              <div style="margin-top:2px;">
                <span style="display:inline-flex; align-items:center; gap:4px; padding:2px 6px; border-radius:4px; background:rgba(2,6,23,0.85); border:1px solid rgba(245,158,11,0.4); font-size:6.8px; color:#fde047; font-family:monospace; letter-spacing:0.4px;">
                  STATUS: ANGGOTA RESMI • SEUMUR HIDUP
                </span>
              </div>
            </div>
          </div>

          <!-- Footer Kartu Depan -->
          <div class="print-card-footer">
            <span style="font-family:monospace; letter-spacing:0.5px; color:#fbbf24; font-size:8px;">NO: ${escapeHtml(m.nia)} • TEATER Q</span>
            <span style="font-size:7.5px; color:#fbbf24; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">KARTU TANDA ANGGOTA RESMI</span>
          </div>
        </div>
      </div>
    `;
  } else {
    const ketum = getCurrentKetuaUmumInfo();
    const qrData = (m.nia || "").trim();
    const rawQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;

    return `
      <div class="print-card-slot">
        <div class="print-card-inner print-face-back">
          <div class="print-inner-contour"></div>
          
          <!-- Magnetic Stripe Ramping -->
          <div class="print-magnetic-stripe" style="height:22px; margin-top:0; padding:0 14px;">
            <span style="font-size:6.5px; font-family:monospace; color:#94a3b8; letter-spacing:1px; text-transform:uppercase;">UKM PAGUYUBAN TEATER Q FSH UIN SUNAN AMPEL SECURE SYSTEM</span>
          </div>

          <!-- Isi Belakang: QR & IKRAR ANGGOTA TEATER Q (Presisi & Seimbang) -->
          <div class="print-card-body" style="padding: 4px 14px 2px; gap: 14px; margin-top: 2px; margin-bottom: auto; height: 196px; align-items: stretch;">
            <!-- QR Code Ukuran Kompak (Background Putih Pas & Tidak Memanjang) -->
            <div style="width:112px; height:fit-content; border-radius:10px; border:2px solid rgba(251,191,36,0.95); background:#ffffff; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:6px 6px 5px; box-sizing:border-box; flex-shrink:0; align-self:center; box-shadow:0 4px 14px rgba(0,0,0,0.6);">
              <div style="font-size:7.5px; font-weight:900; color:#b45309; letter-spacing:0.8px; margin-bottom:3px; text-transform:uppercase;">SCAN PRESENSI</div>
              <img src="${rawQrUrl}" alt="QR Code ${escapeHtml(qrData)}" style="width:96px; height:96px; object-fit:contain; display:block;" crossorigin="anonymous" />
              <div style="font-size:8px; font-weight:900; font-family:monospace; color:#0f172a; margin-top:4px; letter-spacing:0.2px; line-height:1; text-align:center;">${escapeHtml(qrData)}</div>
            </div>

            <!-- IKRAR ANGGOTA TEATER Q & TTD Pengesahan (TTD Terdorong Pas ke Bawah) -->
            <div style="flex:1; min-width:0; display:flex; flex-direction:column; justify-content:space-between; height:100%;">
              <!-- Bagian Atas: Ikrar & Ketentuan -->
              <div>
                <div style="text-align:center; border-bottom:1.5px solid rgba(251,191,36,0.5); padding-bottom:3px; margin-bottom:4px;">
                  <div style="font-size:9.5px; color:#fde047; font-weight:900; text-transform:uppercase; letter-spacing:0.8px;">IKRAR ANGGOTA TEATER Q</div>
                  <div style="font-size:8.5px; color:#fef08a; font-family:'Traditional Arabic', 'Amiri', serif; margin-top:2px; direction:rtl; line-height:1.25;">بِسْمِ اللَّهِ الرَّحْمَـٰنِ الرَّحِيمِ</div>
                  <div style="font-size:7.8px; color:#fef08a; font-family:'Traditional Arabic', 'Amiri', serif; direction:rtl; line-height:1.25;">أَشْهَدُ أَنْ لَا إِلٰهَ إِلَّا اللَّهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللَّهِ</div>
                </div>

                <div style="font-size:6.6px; color:#cbd5e1; font-style:italic; line-height:1.25; margin-bottom:4px;">
                  Dengan menyebut nama Allah Yang Maha Pengasih lagi Maha Penyayang. Atas kesadaran bathin dan rasa tanggung jawab kepada Tuhan serta sesama manusia, saya berikrar:
                </div>

                <ol style="font-size:7.2px; color:#ffffff; font-weight:700; line-height:1.3; padding-left:14px; margin:0; display:flex; flex-direction:column; gap:2.5px;">
                  <li>Menjaga kehormatan dan nama baik UKM Paguyuban Teater Q di dalam maupun di luar panggung.</li>
                  <li>Menghargai setiap proses kreatif, disiplin dalam latihan, dan setia pada kawan seproses.</li>
                  <li>Menjunjung tinggi nilai kekeluargaan, gotong royong, dan solidaritas antaranggota.</li>
                </ol>

                <!-- Ketentuan Pemakaian (1 Poin) -->
                <div style="margin-top:4px; padding:2.5px 6px; border-radius:4px; background:rgba(2,6,23,0.75); border:0.6px solid rgba(245,158,11,0.45); font-size:6.4px; color:#fbbf24; font-weight:700; line-height:1.25;">
                  Ketentuan: Kartu tanda pengenal sah dan wajib dibawa saat pementasan, musyawarah, serta kegiatan resmi organisasi.
                </div>
              </div>

              <!-- Bagian Bawah: Area TTD Ketua Umum & Stempel Resmi (Turun Mantap ke Bawah) -->
              <div style="border-top:1.2px solid rgba(148,163,184,0.4); padding-top:4px; margin-top:auto; display:flex; align-items:flex-end; justify-content:space-between;">
                <div style="font-size:7.5px; color:#94a3b8; line-height:1.3;">
                  <div>Ditetapkan di : <span style="color:#ffffff; font-weight:bold;">Surabaya</span></div>
                  <div style="color:#ffffff; font-weight:800; font-size:8px; margin-top:1px;">UKM PAGUYUBAN TEATER Q</div>
                  <div style="color:#94a3b8; font-size:7px;">FSH UIN Sunan Ampel Surabaya</div>
                  <div style="color:#fbbf24; font-weight:900; font-size:8.8px; margin-top:2px; text-transform:uppercase; letter-spacing:0.4px;">Ketua Umum,</div>
                </div>

                <!-- TTD Digital & Stempel -->
                <div style="text-align:center; position:relative; min-width:135px; display:flex; flex-direction:column; align-items:center;">
                  <img src="assets/stempel.png" alt="Stempel Logo Teater Q" style="position:absolute; left:-20px; top:-10px; width:52px; height:52px; object-fit:contain; pointer-events:none; z-index:0; transform:rotate(-6deg); opacity:0.9; filter:drop-shadow(0 0 3px rgba(37,99,235,0.4));" onerror="this.style.display='none'" />
                  <div style="position:relative; z-index:1; margin-bottom:1px; display:flex; justify-content:center; width:100%;">
                    <img src="assets/ttd.png" alt="TTD Ketua Umum" style="height:36px; width:auto; max-width:130px; object-fit:contain; display:block; filter:drop-shadow(0 0 2px rgba(255,255,255,0.6));" onerror="this.style.display='none'" />
                  </div>
                  <div style="font-size:9px; font-weight:900; color:#fef08a; text-transform:uppercase; letter-spacing:0.4px; border-bottom:1.5px solid rgba(251,191,36,0.8); padding-bottom:1px; white-space:nowrap; line-height:1.2; text-align:center; width:100%;">
                    ${escapeHtml(ketum.nama)}
                  </div>
                  <div style="font-size:7.2px; color:#cbd5e1; font-weight:bold; font-family:monospace; letter-spacing:0.5px; margin-top:1px; line-height:1.1; text-align:center; width:100%;">
                    KETUA UMUM PERIODE ${escapeHtml(ketum.periode)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Pita Slogan Resmi Teater Q -->
          <div style="background: linear-gradient(90deg, rgba(180,83,9,0.2) 0%, rgba(245,158,11,0.35) 50%, rgba(180,83,9,0.2) 100%); border-top: 0.8px solid rgba(245,158,11,0.5); border-bottom: 0.8px solid rgba(245,158,11,0.5); padding: 3px 14px; text-align: center; margin: 4px 0 2px;">
            <div style="font-size: 6.8px; font-weight: 900; color: #fef08a; letter-spacing: 0.3px; text-transform: uppercase; line-height: 1.25;">
              &ldquo;Satu Jiwa, Jangan Terbelah &bull; Satu Langkah, Jangan Terpisah &bull; Satu Hati, Tak Boleh Mencaci &bull; Satu Rasa, Cintai Sesama&rdquo; &mdash; <strong style="color:#ffffff; font-size:7.2px;">TEATER Q</strong>
            </div>
          </div>

          <!-- Footer Kartu Belakang -->
          <div style="padding: 2px 16px 6px; display:flex; align-items:center; justify-content:space-between; font-size:7.5px; color:#94a3b8; font-weight:600;">
            <span>www.teaterq.com</span>
            <span style="font-family:monospace; color:#fbbf24; font-weight:800; letter-spacing:0.5px;">SEKALI BERTEATER, TETAP BERSAUDARA</span>
          </div>
        </div>
      </div>
    `;
  }
}

function generateBulkKtaPrintSheet() {
  const members = getFilteredBulkAnggota();
  if (!members || members.length === 0) {
    showToast("Tidak ada anggota yang dipilih untuk dicetak.", "warning");
    return;
  }

  const side = document.querySelector('input[name="bulkExportSide"]:checked')?.value || "duplex";
  const totalCards = members.length;
  const cardsPerPage = 10;
  const totalSheets = Math.ceil(totalCards / cardsPerPage);

  showToast(`Mempersiapkan lembar cetak A4 (${totalCards} kartu)...`, "info");

  const printWin = window.open("", "_blank");
  if (!printWin) {
    showToast("Jendela cetak terblokir browser. Harap izinkan pop-up!", "warning");
    return;
  }

  let sheetsHtml = "";

  for (let s = 0; s < totalSheets; s++) {
    const sheetMembers = members.slice(s * cardsPerPage, (s + 1) * cardsPerPage);
    const pageNumFront = side === "duplex" ? (s * 2 + 1) : (s + 1);

    // SISI DEPAN
    if (side === "duplex" || side === "front") {
      let cardsFrontHtml = "";
      for (let i = 0; i < cardsPerPage; i++) {
        const m = sheetMembers[i];
        if (m) {
          cardsFrontHtml += renderSingleKtaCardHtml(m, "front");
        } else {
          cardsFrontHtml += `<div class="print-card-slot print-slot-empty"><span>SLOT KOSONG</span></div>`;
        }
      }

      sheetsHtml += `
        <div class="a4-sheet-wrapper">
          <div class="a4-sheet-header-meta no-print">
            <span>LEMBAR A4 SISI DEPAN • HALAMAN ${pageNumFront} DARI ${side === "duplex" ? totalSheets * 2 : totalSheets}</span>
            <span>UKM PAGUYUBAN TEATER Q - FORMAT PVC CR-80</span>
          </div>
          <div class="a4-sheet">
            ${cardsFrontHtml}
          </div>
        </div>
      `;
    }

    // SISI BELAKANG
    if (side === "duplex" || side === "back") {
      const pageNumBack = side === "duplex" ? (s * 2 + 2) : (s + 1);
      let cardsBackHtml = "";
      
      if (side === "duplex") {
        // Mirrored column order for duplex portrait printing
        for (let r = 0; r < 5; r++) {
          const idxCol1OnFront = r * 2;
          const idxCol2OnFront = r * 2 + 1;

          const mBackCol1 = sheetMembers[idxCol2OnFront];
          if (mBackCol1) {
            cardsBackHtml += renderSingleKtaCardHtml(mBackCol1, "back");
          } else {
            cardsBackHtml += `<div class="print-card-slot print-slot-empty"><span>SLOT KOSONG</span></div>`;
          }

          const mBackCol2 = sheetMembers[idxCol1OnFront];
          if (mBackCol2) {
            cardsBackHtml += renderSingleKtaCardHtml(mBackCol2, "back");
          } else {
            cardsBackHtml += `<div class="print-card-slot print-slot-empty"><span>SLOT KOSONG</span></div>`;
          }
        }
      } else {
        for (let i = 0; i < cardsPerPage; i++) {
          const m = sheetMembers[i];
          if (m) {
            cardsBackHtml += renderSingleKtaCardHtml(m, "back");
          } else {
            cardsBackHtml += `<div class="print-card-slot print-slot-empty"><span>SLOT KOSONG</span></div>`;
          }
        }
      }

      sheetsHtml += `
        <div class="a4-sheet-wrapper">
          <div class="a4-sheet-header-meta no-print">
            <span>LEMBAR A4 SISI BELAKANG • HALAMAN ${pageNumBack} DARI ${side === "duplex" ? totalSheets * 2 : totalSheets}</span>
            <span>UKM PAGUYUBAN TEATER Q - FORMAT PVC CR-80</span>
          </div>
          <div class="a4-sheet">
            ${cardsBackHtml}
          </div>
        </div>
      `;
    }
  }

  const printDocumentHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Lembar Cetak KTA Teater Q - A4 PVC (${totalCards} Kartu)</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    @page {
      size: A4 portrait;
      margin: 8mm 10mm;
    }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: #0b0f19;
      color: #ffffff;
      padding-bottom: 60px;
    }
    .top-toolbar {
      position: sticky;
      top: 0;
      z-index: 9999;
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(148, 163, 184, 0.3);
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    }
    .top-toolbar .btn-print {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: #020617;
      font-weight: 900;
      font-size: 13px;
      padding: 10px 22px;
      border-radius: 12px;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);
      transition: all 0.2s;
    }
    .top-toolbar .btn-print:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(245, 158, 11, 0.6);
    }
    .top-toolbar .btn-close {
      background: #1e293b;
      color: #cbd5e1;
      font-size: 12px;
      font-weight: 700;
      padding: 9px 16px;
      border-radius: 10px;
      border: 1px solid rgba(148, 163, 184, 0.3);
      cursor: pointer;
    }
    .a4-sheet-wrapper {
      margin: 24px auto;
      width: fit-content;
      page-break-after: always;
      break-after: page;
    }
    .a4-sheet-header-meta {
      width: 190mm;
      margin: 0 auto 6px;
      font-size: 10px;
      font-weight: 700;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .a4-sheet {
      width: 190mm;
      height: 281mm;
      box-sizing: border-box;
      background: #ffffff;
      box-shadow: 0 12px 35px rgba(0, 0, 0, 0.6);
      border-radius: 4px;
      display: grid;
      grid-template-columns: repeat(2, 85.6mm);
      grid-template-rows: repeat(5, 54mm);
      justify-content: center;
      align-content: center;
      gap: 2mm 6.5mm;
      page-break-after: always;
      break-after: page;
    }
    .print-card-slot {
      width: 85.6mm;
      height: 54mm;
      position: relative;
      overflow: hidden;
      border-radius: 3.18mm;
      box-sizing: border-box;
      background: #020617;
      outline: 0.2mm dashed rgba(148, 163, 184, 0.45);
    }
    .print-slot-empty {
      background: #f8fafc !important;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      font-size: 8px;
      font-weight: 700;
      letter-spacing: 1px;
      outline: 0.3mm dashed #cbd5e1 !important;
    }
    .print-card-inner {
      width: 480px;
      height: 302px;
      transform-origin: 0 0;
      transform: scale(0.674015);
      position: absolute;
      top: 0;
      left: 0;
      box-sizing: border-box;
      border-radius: 18px;
      border: 2px solid rgba(245, 158, 11, 0.85);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
    }
    .print-face-front {
      background: radial-gradient(circle at 15% 15%, #2a0812 0%, #0d121f 50%, #020617 100%);
      padding: 13px 16px;
    }
    .print-face-back {
      background: radial-gradient(circle at 85% 85%, #2a0812 0%, #0d121f 50%, #020617 100%);
    }
    .print-inner-contour {
      position: absolute;
      inset: 6px;
      border: 1px solid rgba(251, 191, 36, 0.35);
      border-radius: 12px;
      pointer-events: none;
    }
    .print-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(245, 158, 11, 0.4);
      padding-bottom: 6px;
      position: relative;
      z-index: 2;
    }
    .print-card-body {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: auto 0;
      position: relative;
      z-index: 2;
      padding: 4px 0;
    }
    .print-card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid rgba(245, 158, 11, 0.2);
      padding-top: 5px;
      position: relative;
      z-index: 2;
    }
    .print-magnetic-stripe {
      height: 28px;
      background: #020617;
      width: 100%;
      border-top: 1px solid rgba(245, 158, 11, 0.3);
      border-bottom: 1px solid rgba(245, 158, 11, 0.3);
      margin-top: 6px;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding: 0 14px;
    }

    @media print {
      body {
        background: transparent !important;
        padding: 0 !important;
      }
      .no-print {
        display: none !important;
      }
      .a4-sheet-wrapper {
        margin: 0 auto !important;
        padding: 0 !important;
      }
      .a4-sheet {
        box-shadow: none !important;
        border-radius: 0 !important;
        margin: 0 auto !important;
      }
    }
  </style>
</head>
<body>

  <!-- Floating Sticky Toolbar -->
  <div class="top-toolbar no-print">
    <div style="display: flex; align-items: center; gap: 12px;">
      <span style="font-size: 20px;">🖨️</span>
      <div>
        <h1 style="font-size: 14px; font-weight: 800; color: #ffffff; line-height: 1.2;">Lembar Cetak KTA Massal - UKM Paguyuban Teater Q</h1>
        <p style="font-size: 11px; color: #f59e0b; margin-top: 2px;">
          Standar PVC CR-80 (85.6 &times; 54 mm) &bull; <strong>${totalCards} Kartu</strong> &bull; <strong>${totalSheets} Lembar A4</strong> (${side === "duplex" ? "Bolak-Balik Presisi" : side === "front" ? "Sisi Depan Saja" : "Sisi Belakang Saja"})
        </p>
      </div>
    </div>

    <div style="display: flex; align-items: center; gap: 10px;">
      <button type="button" class="btn-print" onclick="window.print()">
        <span>Cetak Lembar A4 / Simpan ke PDF</span>
      </button>
      <button type="button" class="btn-close" onclick="window.close()">
        Tutup
      </button>
    </div>
  </div>

  <!-- A4 Sheets Container -->
  <div style="padding-top: 10px;">
    ${sheetsHtml}
  </div>

</body>
</html>`;

  printWin.document.open();
  printWin.document.write(printDocumentHtml);
  printWin.document.close();
}

// ============================================================================
// FITUR PETA INTERAKTIF (LEAFLET) & REVERSE GEOCODING GPS
// ============================================================================
let leafletMapInstance = null;
let leafletMarkerInstance = null;
let currentPickerLocation = { lat: -7.2575, lon: 112.7521, address: "", mapsUrl: "" };
let onMapLocationConfirmedCallback = null;

async function reverseGeocodeCoords(lat, lon) {
  const mapsUrl = `https://maps.google.com/?q=${lat},${lon}`;
  let addressText = "";
  try {
    const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`);
    if (resp.ok) {
      const data = await resp.json();
      if (data && data.address) {
        const a = data.address;
        const jalan = a.road || a.pedestrian || a.residential || "";
        const desa = a.village || a.suburb || a.neighbourhood || "";
        const kec = a.municipality || a.city_district || a.subdistrict || "";
        const kota = a.city || a.town || a.county || "";
        const prov = a.state || "";
        const kodepos = a.postcode || "";
        const parts = [jalan, desa, kec, kota, prov, kodepos].filter((val, idx, self) => val && self.indexOf(val) === idx);
        addressText = parts.join(", ");
      } else if (data && data.display_name) {
        addressText = data.display_name;
      }
    }
  } catch (e) {
    console.warn("Geocode error:", e);
  }
  if (!addressText) {
    addressText = `Titik Koordinat: ${lat.toFixed(6)}, ${lon.toFixed(6)}`;
  }
  return { lat, lon, address: addressText, mapsUrl };
}

function initMapPicker() {
  const modal = document.getElementById("mapPickerModal");
  if (!modal) return;
  const closeBtn = document.getElementById("btnCloseMapPicker");
  const confirmBtn = document.getElementById("btnConfirmMapPicker");
  const gpsBtn = document.getElementById("btnMapGpsCenter");
  const searchInput = document.getElementById("mapSearchInput");
  const searchBtn = document.getElementById("btnMapSearchGo");
  const addressPreview = document.getElementById("mapPickerSelectedAddress");

  const closeModal = () => {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    modal.style.display = "none";
  };

  if (closeBtn) closeBtn.onclick = closeModal;
  modal.onclick = (e) => {
    if (e.target === modal) closeModal();
  };

  if (confirmBtn) {
    confirmBtn.onclick = () => {
      if (onMapLocationConfirmedCallback && currentPickerLocation) {
        onMapLocationConfirmedCallback(currentPickerLocation);
      }
      closeModal();
    };
  }

  const updateMarkerLocation = async (lat, lon) => {
    if (leafletMarkerInstance) {
      leafletMarkerInstance.setLatLng([lat, lon]);
    }
    if (addressPreview) addressPreview.textContent = "⏳ Mengambil alamat lokasi...";
    const res = await reverseGeocodeCoords(lat, lon);
    currentPickerLocation = res;
    if (addressPreview) addressPreview.textContent = `${res.address} (${res.lat.toFixed(5)}, ${res.lon.toFixed(5)})`;
  };

  const searchLocation = async (query) => {
    if (!query) return;
    if (searchBtn) {
      searchBtn.disabled = true;
      searchBtn.textContent = "...";
    }
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          if (leafletMapInstance) {
            leafletMapInstance.setView([lat, lon], 16);
          }
          await updateMarkerLocation(lat, lon);
        } else {
          alert("Lokasi tidak ditemukan. Coba ketik nama jalan, kelurahan, atau kota.");
        }
      }
    } catch (e) {
      console.warn("Search location error:", e);
    } finally {
      if (searchBtn) {
        searchBtn.disabled = false;
        searchBtn.textContent = "Cari";
      }
    }
  };

  if (searchBtn && searchInput) {
    searchBtn.onclick = () => searchLocation(searchInput.value.trim());
    searchInput.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        searchLocation(searchInput.value.trim());
      }
    };
  }

  if (gpsBtn) {
    gpsBtn.onclick = () => {
      if (!navigator.geolocation) {
        alert("GPS tidak didukung oleh browser Anda.");
        return;
      }
      gpsBtn.disabled = true;
      gpsBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> GPS`;
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          if (leafletMapInstance) {
            leafletMapInstance.setView([lat, lon], 17);
          }
          await updateMarkerLocation(lat, lon);
          gpsBtn.disabled = false;
          gpsBtn.innerHTML = `<i class="fas fa-location-crosshairs"></i> GPS`;
        },
        (err) => {
          gpsBtn.disabled = false;
          gpsBtn.innerHTML = `<i class="fas fa-location-crosshairs"></i> GPS`;
          alert("Gagal membaca GPS: " + err.message + ". Pastikan izin lokasi HP aktif.");
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };
  }
}

// Icon Marker Pin Merah Tajam Bebas Dependency Gambar
const mapPinSvgIcon = (typeof L !== "undefined") ? L.divIcon({
  className: 'custom-leaflet-marker',
  html: `
    <div style="transform: translate(-16px, -36px); width: 32px; height: 36px; cursor: grab;">
      <svg viewBox="0 0 24 24" width="32" height="36" fill="#ef4444" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.5));">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3" fill="#ffffff"></circle>
      </svg>
    </div>
  `,
  iconSize: [32, 36],
  iconAnchor: [16, 36]
}) : null;

function openInteractiveMapPicker(callback, existingAddress) {
  const modal = document.getElementById("mapPickerModal");
  if (!modal) return;
  onMapLocationConfirmedCallback = callback;

  modal.classList.remove("hidden");
  modal.classList.add("flex");
  modal.style.display = "flex";

  setTimeout(() => {
    if (typeof L === "undefined") {
      alert("Peta sedang disiapkan, periksa koneksi internet Anda.");
      return;
    }

    let defaultLat = -7.2575;
    let defaultLon = 112.7521;

    // Cek jika teks alamat lama memiliki koordinat Google Maps
    if (existingAddress) {
      let m = existingAddress.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (!m) m = existingAddress.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (!m) m = existingAddress.match(/(-?\d{1,2}\.\d+)\s*,\s*(\d{2,3}\.\d+)/);
      if (m) {
        defaultLat = parseFloat(m[1]);
        defaultLon = parseFloat(m[2]);
      }
    }

    const pinIcon = mapPinSvgIcon || L.divIcon({ className: 'custom-pin', html: '<div style="font-size:32px;transform:translate(-50%,-100%);">📍</div>' });

    if (!leafletMapInstance) {
      leafletMapInstance = L.map("leafletMap", {
        zoomControl: true,
        tap: true
      }).setView([defaultLat, defaultLon], 15);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19
      }).addTo(leafletMapInstance);

      leafletMarkerInstance = L.marker([defaultLat, defaultLon], {
        draggable: true,
        icon: pinIcon
      }).addTo(leafletMapInstance);

      leafletMarkerInstance.on("dragend", async function (e) {
        const pos = e.target.getLatLng();
        const addressPreview = document.getElementById("mapPickerSelectedAddress");
        if (addressPreview) addressPreview.textContent = "⏳ Mengambil alamat lokasi...";
        const res = await reverseGeocodeCoords(pos.lat, pos.lng);
        currentPickerLocation = res;
        if (addressPreview) addressPreview.textContent = `${res.address} (${res.lat.toFixed(5)}, ${res.lon.toFixed(5)})`;
      });

      leafletMapInstance.on("click", async function (e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        leafletMarkerInstance.setLatLng([lat, lng]);
        const addressPreview = document.getElementById("mapPickerSelectedAddress");
        if (addressPreview) addressPreview.textContent = "⏳ Mengambil alamat lokasi...";
        const res = await reverseGeocodeCoords(lat, lng);
        currentPickerLocation = res;
        if (addressPreview) addressPreview.textContent = `${res.address} (${res.lat.toFixed(5)}, ${res.lon.toFixed(5)})`;
      });
    } else {
      leafletMapInstance.invalidateSize();
      leafletMapInstance.setView([defaultLat, defaultLon], 15);
      leafletMarkerInstance.setLatLng([defaultLat, defaultLon]);
    }

    // Pastikan ukuran peta terhitung tepat di layar mobile/desktop
    setTimeout(() => {
      if (leafletMapInstance) leafletMapInstance.invalidateSize();
    }, 150);

    reverseGeocodeCoords(defaultLat, defaultLon).then(res => {
      currentPickerLocation = res;
      const addressPreview = document.getElementById("mapPickerSelectedAddress");
      if (addressPreview) addressPreview.textContent = `${res.address} (${res.lat.toFixed(5)}, ${res.lon.toFixed(5)})`;
    });
  }, 100);
}

// Helper format tanggal dari teks bebas (DD/MM/YYYY, teks Indonesia, ISO) ke format YYYY-MM-DD untuk input HTML5 date
function formatTglUntukInput(tglStr) {
  if (!tglStr) return "";
  try {
    const s = tglStr.toString().trim();
    if (!s || s === "-") return "";

    // 0. Format GVIZ Date (contoh: Date(1979,4,6))
    if (s.startsWith("Date(")) {
      const gMatch = s.match(/^Date\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+),\s*(\d+),\s*(\d+))?\)$/);
      if (gMatch) {
        const y = gMatch[1];
        const m = String(parseInt(gMatch[2], 10) + 1).padStart(2, "0");
        const d = String(gMatch[3]).padStart(2, "0");
        return `${y}-${m}-${d}`;
      }
    }

    // 1. Jika sudah berformat YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    // 2. Format DD/MM/YYYY atau MM/DD/YYYY (contoh: 5/28/1973 -> 1973-05-28)
    const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmyMatch) {
      const p1 = parseInt(dmyMatch[1], 10);
      const p2 = parseInt(dmyMatch[2], 10);
      const y = dmyMatch[3];
      if (p2 > 12 && p1 <= 12) {
        // Format US: M/D/YYYY
        const d = String(p2).padStart(2, "0");
        const m = String(p1).padStart(2, "0");
        return `${y}-${m}-${d}`;
      }
      const d = String(p1).padStart(2, "0");
      const m = String(p2).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }

    // 3. Format dengan nama bulan (Indonesia/Inggris), misal: "12 Mei 1995" atau "5 Agustus 2001"
    const bulanMap = {
      januari: "01", jan: "01",
      februari: "02", feb: "02",
      maret: "03", mar: "03",
      april: "04", apr: "04",
      mei: "05", may: "05",
      juni: "06", jun: "06",
      juli: "07", jul: "07",
      agustus: "08", agu: "08", agt: "08", aug: "08",
      september: "09", sep: "09",
      oktober: "10", okt: "10", oct: "10",
      november: "11", nov: "11",
      desember: "12", des: "12", dec: "12"
    };

    const textMatch = s.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$/);
    if (textMatch) {
      const d = textMatch[1].padStart(2, "0");
      const bulanStr = textMatch[2].toLowerCase();
      const m = bulanMap[bulanStr];
      const y = textMatch[3];
      if (m) return `${y}-${m}-${d}`;
    }

    // 4. Fallback dengan Date constructor standar
    const parsedDate = new Date(s);
    if (!isNaN(parsedDate.getTime())) {
      const y = parsedDate.getFullYear();
      const m = String(parsedDate.getMonth() + 1).padStart(2, "0");
      const d = String(parsedDate.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  } catch (e) {
    console.warn("Format tanggal untuk input:", e);
  }
  return "";
}

// Modal Detail & Pembaruan Data Anggota (DENGAN FIX TANGGAL LAHIR, MAPS & GENDER/JURUSAN)
function openDetail(nama, angkatan, foto, fakultas, ttl, alamat, wa, jurusan = "", jenkel = "", memberId = "") {
  document.getElementById("modalNama").textContent = nama;
  document.getElementById("modalAngkatan").textContent = angkatan;

  // Format Fakultas & Jurusan di Header Modal
  const elFakultas = document.getElementById("modalFakultas");
  if (elFakultas) {
    const jurClean = (jurusan || "").trim();
    if (jurClean && jurClean !== "-") {
      elFakultas.textContent = `${fakultas} • ${jurClean}`;
    } else {
      elFakultas.textContent = fakultas || "-";
    }
  }

  // Tampilkan Badge Gender (Laki-Laki / Perempuan) di Header Modal
  const elGender = document.getElementById("modalGender");
  if (elGender) {
    const jenkelClean = (jenkel || "").trim();
    if (jenkelClean && jenkelClean !== "-") {
      elGender.style.display = "inline-block";
      const isP = jenkelClean.toLowerCase().includes("perempuan") || jenkelClean.toLowerCase() === "p";
      if (isP) {
        elGender.textContent = "Perempuan";
        elGender.className = "bg-rose-500 text-white px-3 py-1 rounded-full shadow-sm";
      } else {
        elGender.textContent = "Laki-Laki";
        elGender.className = "bg-emerald-600 text-white px-3 py-1 rounded-full shadow-sm";
      }
    } else {
      elGender.style.display = "none";
    }
  }

  document.getElementById("modalFoto").src = foto || DEFAULT_NO_IMAGE;
  if (document.getElementById("modalTTL")) document.getElementById("modalTTL").textContent = ttl;
  
  const elAlamat = document.getElementById("modalAlamat");
  const linkMaps = document.getElementById("modalLinkMaps");

  let rawAlamat = (alamat || "").trim();
  let cleanAlamatText = rawAlamat || "-";
  let mapsDirectUrl = "";

  if (rawAlamat && rawAlamat !== "-") {
    // Ekstrak URL Google Maps jika ada di dalam string alamat
    const urlMatch = rawAlamat.match(/https?:\/\/[^\s\)]+/);
    if (urlMatch) {
      mapsDirectUrl = urlMatch[0];
      // Tampilkan hanya teks alamat bersih tanpa URL panjang di layar
      cleanAlamatText = rawAlamat.replace(urlMatch[0], "").replace(/[\(\)]/g, "").replace(/\s+,/g, ",").trim();
      if (!cleanAlamatText) cleanAlamatText = "Titik Koordinat Google Maps Terpasang";
    }
  }

  if (elAlamat) {
    elAlamat.textContent = cleanAlamatText;
    if (mapsDirectUrl || (cleanAlamatText && cleanAlamatText !== "-")) {
      elAlamat.style.cursor = "pointer";
      elAlamat.title = "Ketuk untuk membuka rute di Google Maps";
      elAlamat.onclick = () => {
        window.open(mapsDirectUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanAlamatText)}`, '_blank');
      };
    } else {
      elAlamat.style.cursor = "default";
      elAlamat.onclick = null;
    }
  }

  if (linkMaps) {
    if (mapsDirectUrl) {
      linkMaps.style.display = "inline-flex";
      linkMaps.href = mapsDirectUrl;
      linkMaps.title = "Buka titik koordinat di Google Maps";
    } else if (cleanAlamatText && cleanAlamatText !== "-") {
      linkMaps.style.display = "inline-flex";
      linkMaps.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanAlamatText)}`;
      linkMaps.title = "Cari alamat di Google Maps";
    } else {
      linkMaps.style.display = "none";
    }
  }

  const modalBody = document.getElementById("modalContentContainer") || document.querySelector("#memberModal .p-6");
  const modalFotoArea = document.getElementById("modalFotoContainer") || document.querySelector("#memberModal .bg-gray-800");

  const oldForm = document.getElementById("customEditFormContainer");
  if (oldForm) oldForm.remove();
  if (modalFotoArea) modalFotoArea.style.display = "flex";
  Array.from(modalBody.children).forEach(child => child.style.display = "block");

  const oldBtn = document.getElementById("btnEditForm");
  if (oldBtn) oldBtn.remove();

  // Pisahkan Tempat dan Tanggal Lahir
  let tempatVal = "";
  let tglVal = "";
  if (ttl && ttl.includes(",")) {
    const parts = ttl.split(",");
    tempatVal = parts[0].trim();
    tglVal = formatTglUntukInput(parts.slice(1).join(",").trim());
  } else {
    tempatVal = ttl;
  }
  const waVal = wa ? wa.toString() : "";

  const btnEdit = document.createElement("button");
  btnEdit.id = "btnEditForm";
  btnEdit.className = "w-full mt-2 py-3 bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 hover:border-amber-500/50 text-center rounded-2xl font-bold text-xs shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer";
  btnEdit.innerHTML = `<i class="fa-solid fa-pen-to-square text-amber-400"></i> Ajukan Pembaruan Data`;

  btnEdit.onclick = function() {
    if (modalFotoArea) modalFotoArea.style.display = "none";
    Array.from(modalBody.children).forEach(child => child.style.display = "none");

    const topTitle = document.getElementById("modalTopBarTitle");
    const topSub = document.getElementById("modalTopBarSubtitle");
    if (topTitle) topTitle.textContent = "Koreksi Data";
    if (topSub) topSub.textContent = nama || "Pembaruan Profil";

    const formContainer = document.createElement("div");
    formContainer.id = "customEditFormContainer";
    formContainer.className = "w-full flex flex-col gap-4 animate-fade-in text-slate-200";

    const isPerempuan = String(jenkel || "").toLowerCase().includes("perempuan") || String(jenkel || "").toLowerCase() === "p";

    formContainer.innerHTML = `
      <form id="silentForm" onsubmit="event.preventDefault(); return false;" class="space-y-4">
        <input type="hidden" name="${ID_KET_FOTO}" id="finalFotoUrl" value="${foto}">

        <div>
          <label class="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Nama Lengkap</label>
          <input type="text" name="${ID_NAMA}" value="${nama}"
            class="w-full bg-slate-900 border border-slate-800 focus:border-amber-400 text-slate-100 placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none transition-colors">
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Angkatan</label>
            <input type="number" name="${ID_ANGKATAN}" value="${angkatan}"
              class="w-full bg-slate-900 border border-slate-800 focus:border-amber-400 text-slate-100 placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none transition-colors">
          </div>
          <div>
            <label class="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Jenis Kelamin</label>
            <select name="${ID_JENKEL}" class="w-full bg-slate-900 border border-slate-800 focus:border-amber-400 text-slate-100 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none cursor-pointer transition-colors">
              <option value="Laki-Laki"${!isPerempuan ? " selected" : ""}>Laki-Laki</option>
              <option value="Perempuan"${isPerempuan ? " selected" : ""}>Perempuan</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>Fakultas</span>
            <span class="text-[10px] text-amber-400 font-semibold">Pilih atau tambah baru</span>
          </label>
          <select id="editSelectFakultas"
            class="w-full bg-slate-900 border border-slate-800 focus:border-amber-400 text-slate-100 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none cursor-pointer transition-colors">
            <option value="">-- Pilih Fakultas --</option>
            <option value="Fakultas Syariah dan Hukum">Fakultas Syariah dan Hukum</option>
            <option value="Fakultas Tarbiyah dan Keguruan">Fakultas Tarbiyah dan Keguruan</option>
            <option value="Fakultas Ushuluddin dan Filsafat">Fakultas Ushuluddin dan Filsafat</option>
            <option value="Fakultas Adab dan Humaniora">Fakultas Adab dan Humaniora</option>
            <option value="Fakultas Dakwah dan Komunikasi">Fakultas Dakwah dan Komunikasi</option>
            <option value="Fakultas Ekonomi dan Bisnis Islam">Fakultas Ekonomi dan Bisnis Islam</option>
            <option value="Fakultas Sains dan Teknologi">Fakultas Sains dan Teknologi</option>
            <option value="Fakultas Psikologi dan Kesehatan">Fakultas Psikologi dan Kesehatan</option>
            <option value="Pascasarjana">Pascasarjana</option>
            <option value="__custom__" style="color: #fbbf24; font-weight: bold;">➕ Tambah / Tulis Fakultas Lainnya...</option>
          </select>
          <input type="hidden" name="${ID_FAKULTAS}" id="editInputFakultas" value="${fakultas && fakultas !== '-' ? fakultas : ''}">
          
          <div id="boxEditCustomFakultas" class="hidden mt-2">
            <div class="relative">
              <input type="text" id="inputEditCustomFakultas" placeholder="Ketik nama fakultas baru..."
                class="w-full bg-slate-900 border border-amber-500 rounded-xl pl-3.5 pr-8 py-2 text-slate-100 text-sm font-semibold focus:outline-none">
              <i class="fa-solid fa-plus absolute right-3 top-1/2 -translate-y-1/2 text-amber-400 text-xs"></i>
            </div>
          </div>
        </div>

        <div>
          <label class="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Jurusan / Prodi</label>
          <input type="text" name="${ID_JURUSAN}" id="editInputJurusan" value="${jurusan && jurusan !== '-' ? jurusan : ''}" placeholder="Contoh: Ahwal Al-Syakhsiyyah / Muamalah Jinayah"
            class="w-full bg-slate-900 border border-slate-800 focus:border-amber-400 text-slate-100 placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none transition-colors">
        </div>

        <!-- Tempat Lahir -->
        <div>
          <label class="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Tempat Lahir</label>
          <input type="text" name="${ID_TEMPAT}" value="${tempatVal}" placeholder="Contoh: Surabaya / Kabupaten Pasuruan"
            class="w-full bg-slate-900 border border-slate-800 focus:border-amber-400 text-slate-100 placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none transition-colors">
        </div>

        <!-- Tanggal Lahir -->
        <div>
          <label class="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Tanggal Lahir</label>
          <div class="relative flex items-center">
            <input type="date" name="${ID_TANGGAL}" id="editInputTglLahir" value="${tglVal}"
              onclick="try { this.showPicker(); } catch(e){}"
              class="w-full bg-slate-900 border border-slate-800 focus:border-amber-400 text-slate-100 rounded-xl pl-3.5 pr-10 py-2.5 text-sm font-semibold focus:outline-none cursor-pointer transition-colors [color-scheme:dark]">
            <div class="absolute right-3 text-amber-400 pointer-events-none flex items-center justify-center">
              <i class="fa-solid fa-calendar-days text-sm"></i>
            </div>
          </div>
        </div>

        <div>
          <div class="flex justify-between items-center mb-1.5">
            <label class="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">Alamat Domisili</label>
            <div class="flex items-center gap-1.5">
              <button type="button" id="btnGpsDomisili"
                class="px-2.5 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                title="Kunci titik GPS HP saat ini">
                <i class="fa-solid fa-location-crosshairs text-emerald-400"></i> Deteksi GPS
              </button>
              <button type="button" id="btnBukaMapsPicker"
                class="px-2.5 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                title="Buka Google Maps untuk mencari titik lokasi">
                <i class="fa-solid fa-map-location-dot text-blue-400"></i> Peta Maps
              </button>
            </div>
          </div>
          <textarea id="editInputAlamat" name="${ID_ALAMAT}" rows="2" placeholder="Nama jalan, RT/RW, desa/kelurahan, kecamatan, kota/kabupaten"
            class="w-full bg-slate-900 border border-slate-800 focus:border-amber-400 text-slate-100 placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none transition-colors">${alamat}</textarea>
          <div id="statusGpsFeedback" class="text-[11px] mt-1 hidden"></div>
        </div>

        <div>
          <label class="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">No. WhatsApp</label>
          <input type="tel" name="${ID_WA}" value="${waVal}" placeholder="08xxxxx" required
            class="w-full bg-slate-900 border border-slate-800 focus:border-amber-400 text-slate-100 placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none transition-colors">
        </div>

        <div class="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
          <label class="block text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-1.5">Ganti Foto Profil (Opsional)</label>
          <input type="file" id="fotoInputReal" accept="image/*" class="block w-full text-xs text-slate-400 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-amber-400 hover:file:bg-slate-700 cursor-pointer">
        </div>

        <div class="flex items-center gap-2.5 pt-2">
          <button type="button" id="btnCancelEdit" class="w-1/3 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-bold rounded-xl text-xs active:scale-95 transition cursor-pointer">
            Batal
          </button>
          <button type="button" id="btnSubmitCustom"
            class="w-2/3 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black py-3.5 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 text-sm border border-amber-300/40 cursor-pointer">
            <i class="fa-solid fa-floppy-disk"></i> Simpan
          </button>
        </div>
      </form>
      <iframe name="hidden_iframe_modal" id="hidden_iframe_modal" style="display:none;"></iframe>
    `;

    modalBody.appendChild(formContainer);

    // Inisialisasi Dropdown Fakultas & Opsi Tambah Fakultas Baru
    const selFak = document.getElementById("editSelectFakultas");
    const hidFak = document.getElementById("editInputFakultas");
    const boxCustFak = document.getElementById("boxEditCustomFakultas");
    const inCustFak = document.getElementById("inputEditCustomFakultas");

    if (selFak && hidFak) {
      const curFak = (hidFak.value || "").trim();
      if (curFak) {
        let matched = false;
        for (let i = 0; i < selFak.options.length; i++) {
          const optVal = selFak.options[i].value;
          if (optVal && (optVal.toLowerCase() === curFak.toLowerCase() ||
              optVal.toLowerCase().replace(/^fakultas\s+/, "") === curFak.toLowerCase().replace(/^fakultas\s+/, ""))) {
            selFak.selectedIndex = i;
            hidFak.value = optVal;
            matched = true;
            break;
          }
        }
        if (!matched && curFak !== "-") {
          const customOpt = document.createElement("option");
          customOpt.value = curFak;
          customOpt.textContent = curFak;
          customOpt.selected = true;
          selFak.insertBefore(customOpt, selFak.querySelector('option[value="__custom__"]'));
        }
      }

      selFak.onchange = function() {
        if (this.value === "__custom__") {
          if (boxCustFak) boxCustFak.classList.remove("hidden");
          if (inCustFak) {
            inCustFak.focus();
            hidFak.value = inCustFak.value.trim();
          }
        } else {
          if (boxCustFak) boxCustFak.classList.add("hidden");
          hidFak.value = this.value;
        }
      };

      if (inCustFak) {
        inCustFak.oninput = function() {
          hidFak.value = this.value.trim();
        };
      }
    }

    // Event Handler Deteksi GPS Otomatis & Interactive Map Picker
    const btnGps = document.getElementById("btnGpsDomisili");
    const txtAlamat = document.getElementById("editInputAlamat");
    const statusGps = document.getElementById("statusGpsFeedback");
    const btnMaps = document.getElementById("btnBukaMapsPicker");

    if (btnMaps && txtAlamat) {
      btnMaps.onclick = function() {
        openInteractiveMapPicker(function(selectedLoc) {
          txtAlamat.value = `${selectedLoc.address} (${selectedLoc.mapsUrl})`;
          if (statusGps) {
            statusGps.className = "text-[11px] mt-1 text-emerald-600 font-bold block";
            statusGps.textContent = `✅ Titik peta berhasil dimasukkan ke form alamat!`;
          }
        }, txtAlamat.value.trim());
      };
    }

    if (btnGps && txtAlamat) {
      btnGps.onclick = function() {
        if (!navigator.geolocation) {
          alert("Perangkat atau browser Anda tidak mendukung fitur GPS.");
          return;
        }

        btnGps.disabled = true;
        const oriHtml = btnGps.innerHTML;
        btnGps.innerHTML = `<i class="fas fa-circle-notch fa-spin text-emerald-600"></i> Mengunci...`;
        
        if (statusGps) {
          statusGps.className = "text-[11px] mt-1 text-blue-600 font-semibold block";
          statusGps.textContent = "Sedang mengunci satelit GPS HP Anda...";
        }

        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            const res = await reverseGeocodeCoords(lat, lon);
            txtAlamat.value = `${res.address} (${res.mapsUrl})`;

            btnGps.disabled = false;
            btnGps.innerHTML = `<i class="fas fa-check text-emerald-600"></i> Selesai`;
            if (statusGps) {
              statusGps.className = "text-[11px] mt-1 text-emerald-600 font-bold block";
              statusGps.textContent = `✅ Titik GPS HP & alamat berhasil dimasukkan otomatis!`;
            }
          },
          (err) => {
            btnGps.disabled = false;
            btnGps.innerHTML = oriHtml;
            if (statusGps) {
              statusGps.className = "text-[11px] mt-1 text-red-500 font-semibold block";
              statusGps.textContent = `⚠️ Gagal membaca GPS: ${err.message}. Pastikan izin lokasi HP aktif.`;
            }
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      };
    }

    const btnCancel = document.getElementById("btnCancelEdit");
    if (btnCancel) {
      btnCancel.onclick = restoreDetailView;
    }

    document.getElementById("btnSubmitCustom").onclick = function() {
      const btn = this;
      const form = document.getElementById("silentForm");
      const fileInput = document.getElementById("fotoInputReal");
      const file = fileInput?.files[0];

      btn.innerHTML = `<i class="fas fa-circle-notch fa-spin mr-2"></i> Memproses...`;
      btn.disabled = true;

      let koreksiPhotoBase64 = null;
      const submitGoogleForm = async (photoB64 = null) => {
        btn.innerHTML = `<i class="fas fa-circle-notch fa-spin mr-2"></i> Menyimpan ke Cloud...`;

        const inFak = (document.getElementById("editInputFakultas")?.value || "").trim();
        const inJur = (document.getElementById("editInputJurusan")?.value || "").trim();
        const editNama = form.querySelector(`[name="${ID_NAMA}"]`)?.value || nama || "Anggota";
        const editAngkatan = form.querySelector(`[name="${ID_ANGKATAN}"]`)?.value || angkatan || "-";
        const editJenkel = form.querySelector(`[name="${ID_JENKEL}"]`)?.value || (isPerempuan ? "Perempuan" : "Laki-Laki");
        const editAlamat = form.querySelector(`[name="${ID_ALAMAT}"]`)?.value || alamat || "-";
        const editWa = form.querySelector(`[name="${ID_WA}"]`)?.value || waVal || "-";
        const editTempat = form.querySelector(`[name="${ID_TEMPAT}"]`)?.value || tempatVal || "-";
        const editTanggal = form.querySelector(`[name="${ID_TANGGAL}"]`)?.value || tglVal || "-";
        const fotoUrlVal = document.getElementById("finalFotoUrl")?.value || "";

        // 1. Simpan Langsung ke Supabase Cloud (public.permohonan)
        if (window.SupabaseDB && window.SupabaseDB.isConfigured()) {
          try {
            const reqId = `REQ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
            const nowStr = new Date().toLocaleString("id-ID", { dateStyle: "short", timeStyle: "medium" }).replace(/\./g, ':');
            
            const targetMemberId = (typeof memberId !== "undefined" && memberId)
              ? memberId
              : ((typeof currentActiveMemberIndex === "number" && currentRenderedAnggota && currentRenderedAnggota[currentActiveMemberIndex])
                  ? (currentRenderedAnggota[currentActiveMemberIndex].ID || currentRenderedAnggota[currentActiveMemberIndex].id || "")
                  : "");

            await window.SupabaseDB.createPermohonan({
              id: reqId,
              timestamp: nowStr,
              nama: editNama,
              jenis_kelamin: editJenkel,
              tahun: editAngkatan,
              tempat_lahir: editTempat,
              tanggal_lahir: editTanggal,
              alamat: editAlamat,
              fakultas: inFak,
              jurusan: inJur,
              no_hp: editWa,
              upload_foto: (fotoUrlVal && fotoUrlVal.startsWith("http")) ? fotoUrlVal : "",
              status: "pending",
              matched_id: targetMemberId || ""
            });
            console.log("[Supabase] Permohonan koreksi profil berhasil disimpan ke Cloud:", reqId);
          } catch (errSb) {
            console.error("[Supabase] Gagal menyimpan permohonan koreksi ke Supabase:", errSb);
          }
        }

        // 2. Kirim Notifikasi Real-time ke Bot Telegram Admin Teater Q
        try {
          const fotoDisplay = (fotoUrlVal && fotoUrlVal.startsWith("http")) ? `<a href="${fotoUrlVal}">Lihat Foto</a>` : "<i>(Foto profil dipertahankan)</i>";
          const waktuStr = new Date().toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });

          const msgKoreksi = `👑 <b>PERMOHONAN PEMBARUAN DATA ANGGOTA!</b>\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `👤 <b>Nama:</b> ${editNama}\n` +
            `🚻 <b>Jenis Kelamin:</b> ${editJenkel}\n` +
            `🎓 <b>Angkatan:</b> ${editAngkatan}\n` +
            `🏛️ <b>Fakultas:</b> ${inFak || "-"}\n` +
            `📚 <b>Jurusan:</b> ${inJur || "-"}\n` +
            `🎂 <b>TTL:</b> ${editTempat}, ${editTanggal}\n` +
            `📱 <b>WhatsApp:</b> ${editWa}\n` +
            `📍 <b>Alamat Domisili:</b> ${editAlamat}\n` +
            `🖼️ <b>Foto Profil:</b> ${fotoDisplay}\n` +
            `⏰ <b>Waktu:</b> ${waktuStr} WIB\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `<i>Pengajuan pembaruan data dari Direktori Anggota Portal</i>`;

          if (typeof sendTelegramAdminNotification === "function") {
            sendTelegramAdminNotification(msgKoreksi, photoB64 || koreksiPhotoBase64 || null);
          }
        } catch(errNotif) {
          console.warn("Gagal mengirim notif Telegram koreksi anggota:", errNotif);
        }

        // Tampilkan Sukses (Tanpa submit Google Form!)
        formContainer.innerHTML = `
          <div class="flex flex-col items-center justify-center py-8 text-center animate-fade-in">
            <div class="w-16 h-16 bg-emerald-500/15 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-400 text-3xl mb-3 shadow-lg">
              <i class="fa-solid fa-check"></i>
            </div>
            <h3 class="text-lg font-black text-white">Berhasil Diajukan!</h3>
            <p class="text-slate-400 text-xs mt-1 max-w-xs">Pembaruan profil Anda telah disimpan ke Cloud Supabase dan sedang menunggu verifikasi pengurus.</p>
            <button onclick="closeDetail()" class="mt-5 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-400 rounded-xl font-bold text-xs transition-all active:scale-95 cursor-pointer">
              Tutup
            </button>
          </div>
        `;
      };

      if (file) {
        btn.innerHTML = `<i class="fas fa-cloud-upload-alt fa-spin mr-2"></i> Mengunggah Foto...`;
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function() {
          koreksiPhotoBase64 = reader.result;
          uploadFileToTargetDrive(koreksiPhotoBase64, file.name, file.type, "Pengajuan Data")
          .then(url => {
            if (url) {
              document.getElementById("finalFotoUrl").value = url;
              submitGoogleForm(koreksiPhotoBase64);
            } else {
              alert("Gagal upload foto ke Google Drive.");
              btn.innerHTML = "Coba Lagi";
              btn.disabled = false;
            }
          })
          .catch(() => {
            alert("Gagal koneksi upload foto. Coba simpan tanpa foto.");
            btn.innerHTML = "Coba Lagi";
            btn.disabled = false;
          });
        };
      } else {
        submitGoogleForm();
      }
    };
  };

  modalBody.appendChild(btnEdit);
  const modal = document.getElementById("memberModal");
  if (modal) {
    modal.removeAttribute("aria-hidden");
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    modal.classList.remove("closing");
    modal.classList.add("opening");
    requestAnimationFrame(() => {
      modal.classList.remove("opacity-0");
      modal.classList.add("opacity-100");
    });
  }
}

function restoreDetailView() {
  const formContainer = document.getElementById("customEditFormContainer");
  const modalFotoArea = document.getElementById("modalFotoContainer") || document.querySelector("#memberModal .bg-gray-800");
  const modalBody = document.getElementById("modalContentContainer") || document.querySelector("#memberModal .p-6");
  if (formContainer) formContainer.remove();
  if (modalFotoArea) modalFotoArea.style.display = "flex";
  if (modalBody) {
    Array.from(modalBody.children).forEach(child => child.style.display = "block");
  }
  const topTitle = document.getElementById("modalTopBarTitle");
  const topSub = document.getElementById("modalTopBarSubtitle");
  if (topTitle) topTitle.textContent = "Profil Anggota";
  if (topSub) topSub.textContent = "Teater Q FSH UIN-SA";
}

function closeDetail(force = false) {
  const formContainer = document.getElementById("customEditFormContainer");
  if (!force && formContainer) {
    restoreDetailView();
    return;
  }

  restoreDetailView();

  const modal = document.getElementById("memberModal");
  if (modal) {
    if (document.activeElement && modal.contains(document.activeElement)) {
      document.activeElement.blur();
    }
    modal.classList.remove("opening");
    modal.classList.add("closing");
    modal.classList.remove("opacity-100");
    modal.classList.add("opacity-0");
    setTimeout(() => {
      modal.classList.remove("flex");
      modal.classList.add("hidden");
      modal.classList.remove("closing");
      modal.setAttribute("aria-hidden", "true");
    }, 200);
  }
}

// ============================================================================
// ============================================================================
// 8. MARKETPLACE & PASAR KARYA PAGUYUBAN (MULTI-SELLER & SMART CHECKOUT)
// ============================================================================
let currentMarketRendered = [];
let currentMarketCategory = "all";
let currentCheckoutProduct = null;
let currentCheckoutQty = 1;
let currentDeliveryMethod = "sanggar"; // "sanggar" | "kirim"
let currentSelectedCityRate = 0;
let currentSelectedCityName = "";
let currentCheckoutMapCoords = null;
let currentUniqueCode = 0;

// Keranjang Belanja Multi-Item (Smart Cart)
let cartItems = [];
try {
  cartItems = JSON.parse(localStorage.getItem("tq_marketplace_cart") || "[]");
} catch(e) {
  cartItems = [];
}

function saveCart() {
  try {
    localStorage.setItem("tq_marketplace_cart", JSON.stringify(cartItems));
  } catch(e) {}
  updateCartBadge();
}

function updateCartBadge() {
  const badge = document.getElementById("cartBadgeCount");
  if (!badge) return;
  const count = cartItems.reduce((acc, item) => acc + (item.qty || 1), 0);
  badge.textContent = count;
}

function addToCart(idx) {
  const product = currentMarketRendered[idx];
  if (!product) return;
  const productId = product["ID"] || product["Nama Produk"];
  const existing = cartItems.find(item => (item.id === productId && item.name === product["Nama Produk"]));
  if (existing) {
    existing.qty = (existing.qty || 1) + 1;
  } else {
    cartItems.push({
      id: productId,
      name: product["Nama Produk"] || "Produk",
      price: parseNumberRupiah(product["Harga"]) || 0,
      photo: convertDriveImage(product["Foto"] || product["FOTO"] || product["Foto Website"] || ""),
      seller: product["Penjual"] || "Official Teater Q",
      origin: product["Kota Asal"] || product["Asal"] || "Surabaya",
      wa: product["Wa"] || product["WA"] || (CONFIG_INFO && CONFIG_INFO.noAdminWA),
      qty: 1
    });
  }
  saveCart();
  showToast(`"${product['Nama Produk']}" dimasukkan ke keranjang belanja!`, "success");
}

function openCartModal() {
  const modal = document.getElementById("cartModal");
  if (!modal) return;
  renderCartItems();
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeCartModal() {
  const modal = document.getElementById("cartModal");
  if (modal) {
    modal.classList.remove("flex");
    modal.classList.add("hidden");
  }
}

let currentConfirmCallback = null;

function showCustomConfirm(options) {
  const {
    title = "Konfirmasi Tindakan",
    message = "Apakah Anda yakin ingin melanjutkan?",
    icon = "fa-trash-alt",
    iconColor = "red",
    confirmText = "Ya, Lanjutkan",
    cancelText = "Batal",
    onConfirm = null
  } = options || {};

  const modal = document.getElementById("customConfirmModal");
  if (!modal) {
    if (confirm(message)) {
      if (onConfirm) onConfirm();
    }
    return;
  }

  const titleEl = document.getElementById("confirmDialogTitle");
  const msgEl = document.getElementById("confirmDialogMessage");
  const iconEl = document.getElementById("confirmDialogIcon");
  const okBtn = document.getElementById("btnConfirmOk");
  const cancelBtn = document.getElementById("btnConfirmCancel");

  if (titleEl) titleEl.textContent = title;
  if (msgEl) msgEl.textContent = message;

  if (iconEl) {
    iconEl.innerHTML = `<i class="fas ${icon}"></i>`;
    if (iconColor === "red") {
      iconEl.className = "w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center text-2xl mb-3.5 shadow-lg";
      if (okBtn) okBtn.className = "flex-1 py-2.5 px-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center gap-1.5";
    } else {
      iconEl.className = "w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center text-2xl mb-3.5 shadow-lg";
      if (okBtn) okBtn.className = "flex-1 py-2.5 px-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center gap-1.5";
    }
  }

  if (okBtn) {
    okBtn.innerHTML = `<i class="fas ${icon} text-[11px]"></i> <span>${confirmText}</span>`;
    okBtn.onclick = () => {
      const cb = currentConfirmCallback;
      closeCustomConfirm();
      if (cb) cb();
    };
  }

  if (cancelBtn) {
    cancelBtn.textContent = cancelText;
  }

  currentConfirmCallback = onConfirm;
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeCustomConfirm() {
  const modal = document.getElementById("customConfirmModal");
  if (modal) {
    modal.classList.remove("flex");
    modal.classList.add("hidden");
  }
  currentConfirmCallback = null;
}

function renderCartItems() {
  const container = document.getElementById("cartItemsContainer");
  const totalCountEl = document.getElementById("cartTotalItemsCount");
  const subtotalEl = document.getElementById("cartSubtotalAmount");
  if (!container) return;

  if (!cartItems.length) {
    container.innerHTML = `
      <div class="text-center py-8 text-slate-400">
        <i class="fas fa-shopping-cart text-3xl mb-2 text-slate-600 block"></i>
        <p class="font-semibold text-slate-300">Keranjang belanja Anda masih kosong.</p>
        <p class="text-[11px] text-slate-500 mt-1">Pilih produk di etalase dan ketuk ikon keranjang.</p>
      </div>
    `;
    if (totalCountEl) totalCountEl.textContent = "0";
    if (subtotalEl) subtotalEl.textContent = "Rp 0";
    return;
  }

  let totalQty = 0;
  let subtotal = 0;

  container.innerHTML = cartItems.map((item, cIdx) => {
    const itemTotal = item.price * item.qty;
    totalQty += item.qty;
    subtotal += itemTotal;

    return `
      <div class="flex items-center gap-3 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/80">
        <img src="${item.photo || DEFAULT_NO_IMAGE}" class="w-12 h-12 object-cover rounded-lg bg-slate-900 border border-slate-700 shrink-0 cursor-zoom-in hover:opacity-80 transition-opacity" alt="${escapeHtml(item.name)}" onclick="openSimplePhotoDetail('${escapeHtml(item.photo || DEFAULT_NO_IMAGE)}', '${escapeHtml(item.name)}', '${formatRupiah(item.price)}')" title="Klik untuk melihat foto lebih jelas" />
        <div class="flex-1 min-w-0">
          <div class="font-bold text-white text-xs truncate">${escapeHtml(item.name)}</div>
          <div class="text-amber-400 font-extrabold text-xs">${formatRupiah(item.price)}</div>
          <div class="text-[10px] text-slate-400 truncate">Asal: ${escapeHtml(item.origin)} • ${escapeHtml(item.seller)}</div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <button type="button" onclick="changeCartItemQty(${cIdx}, -1)" class="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs flex items-center justify-center">-</button>
          <span class="w-6 text-center font-bold text-xs text-white">${item.qty}</span>
          <button type="button" onclick="changeCartItemQty(${cIdx}, 1)" class="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs flex items-center justify-center">+</button>
          <button type="button" onclick="removeCartItem(${cIdx})" class="w-6 h-6 rounded bg-red-900/40 hover:bg-red-800 text-red-400 hover:text-white text-xs flex items-center justify-center ml-1" title="Hapus"><i class="fas fa-trash-alt"></i></button>
        </div>
      </div>
    `;
  }).join("");

  if (totalCountEl) totalCountEl.textContent = totalQty;
  if (subtotalEl) subtotalEl.textContent = formatRupiah(subtotal);
}

function changeCartItemQty(cIdx, delta) {
  if (!cartItems[cIdx]) return;
  if (cartItems[cIdx].qty + delta <= 0) {
    removeCartItem(cIdx);
    return;
  }
  cartItems[cIdx].qty += delta;
  saveCart();
  renderCartItems();
}

function removeCartItem(cIdx) {
  if (!cartItems[cIdx]) return;
  const item = cartItems[cIdx];
  showCustomConfirm({
    title: "Hapus Barang?",
    message: `Hapus "${item.name}" dari keranjang belanja?`,
    icon: "fa-trash-alt",
    iconColor: "red",
    confirmText: "Hapus",
    cancelText: "Batal",
    onConfirm: () => {
      cartItems.splice(cIdx, 1);
      saveCart();
      renderCartItems();
      showToast(`"${item.name}" dihapus dari keranjang.`, "info");
    }
  });
}

function clearAllCart() {
  if (!cartItems.length) return;
  showCustomConfirm({
    title: "Kosongkan Keranjang?",
    message: "Semua barang yang telah Anda pilih akan dihapus dari daftar keranjang belanja.",
    icon: "fa-trash-alt",
    iconColor: "red",
    confirmText: "Kosongkan",
    cancelText: "Batal",
    onConfirm: () => {
      cartItems = [];
      saveCart();
      renderCartItems();
      showToast("Keranjang belanja telah dikosongkan.", "info");
    }
  });
}

function checkoutMultiItemFromCart() {
  if (!cartItems.length) {
    showToast("Keranjang belanja Anda masih kosong.", "error");
    return;
  }
  closeCartModal();
  
  const firstItem = cartItems[0];
  const subtotal = cartItems.reduce((acc, it) => acc + (it.price * it.qty), 0);
  const namesSummary = cartItems.map(it => `${it.name} (${it.qty}x)`).join(", ");
  
  const bundleProduct = {
    "Nama Produk": cartItems.length === 1 ? firstItem.name : `Paket Belanja (${cartItems.length} Macam: ${namesSummary})`,
    "Harga": subtotal,
    "Foto": firstItem.photo,
    "Stok": "Tersedia",
    "Deskripsi": `Multi-item checkout: ${namesSummary}`,
    "Kota Asal": firstItem.origin || "Surabaya",
    "Penjual": firstItem.seller || "Official Teater Q",
    "Wa": firstItem.wa || (CONFIG_INFO && CONFIG_INFO.noAdminWA),
    _isCartCheckout: true,
    _cartItems: [...cartItems]
  };

  currentCheckoutProduct = bundleProduct;
  currentCheckoutQty = 1;
  currentDeliveryMethod = "sanggar";
  currentSelectedCityRate = 0;
  currentSelectedCityName = "";
  currentUniqueCode = Math.floor(100 + Math.random() * 899);

  initCheckoutCityDropdown();
  bindCheckoutModalData();

  const modal = document.getElementById("checkoutModal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }
}

// Modal Buka Lapak Alumni
function openModalBukaLapak() {
  const m = document.getElementById("modalBukaLapak");
  if (m) {
    m.classList.remove("hidden");
    m.classList.add("flex");
    // Listener preview foto
    const fileInput = document.getElementById("lapakFotoInput");
    const preview = document.getElementById("lapakFotoPreview");
    const container = document.getElementById("lapakFotoPreviewContainer");
    if (fileInput && preview && container) {
      fileInput.onchange = function() {
        if (fileInput.files && fileInput.files[0]) {
          const reader = new FileReader();
          reader.onload = e => {
            preview.src = e.target.result;
            container.classList.remove("hidden");
          };
          reader.readAsDataURL(fileInput.files[0]);
        }
      };
    }
  }
}
function closeModalBukaLapak() {
  const m = document.getElementById("modalBukaLapak");
  if (m) { m.classList.remove("flex"); m.classList.add("hidden"); }
}

function onTipeProdukChange(tipe) {
  const lblOfficial = document.getElementById("labelTipeOfficial");
  const lblAlumni   = document.getElementById("labelTipeAlumni");
  const namaPenjual = document.getElementById("lapakNamaPenjual");
  const kotaAsal    = document.getElementById("lapakKotaAsal");
  const waPenjual   = document.getElementById("lapakWaPenjual");
  const kategori    = document.getElementById("lapakKategori");

  if (tipe === "official") {
    if (lblOfficial) lblOfficial.className = "flex items-center gap-2.5 p-2 rounded-lg border border-red-500/80 bg-red-950/40 cursor-pointer shadow-sm";
    if (lblAlumni)   lblAlumni.className   = "flex items-center gap-2.5 p-2 rounded-lg border border-slate-700 bg-slate-900 cursor-pointer hover:border-sky-500 transition-all";
    if (namaPenjual) {
      namaPenjual.value = "Official Teater Q";
      namaPenjual.readOnly = true;
      namaPenjual.classList.add("opacity-75", "bg-slate-900");
    }
    if (kotaAsal) {
      kotaAsal.value = "Surabaya";
      kotaAsal.readOnly = true;
      kotaAsal.classList.add("opacity-75", "bg-slate-900");
    }
    if (waPenjual) {
      waPenjual.value = (typeof CONFIG_INFO !== "undefined" && CONFIG_INFO.noAdminWA) || "085645829346";
      waPenjual.readOnly = true;
      waPenjual.classList.add("opacity-75", "bg-slate-900");
    }
    if (kategori) {
      kategori.innerHTML = '<option value="Merchandise" selected>Merchandise Resmi Sanggar</option>';
    }
    const areaRek = document.getElementById("areaRekeningPenjual");
    if (areaRek) areaRek.classList.add("hidden");
  } else {
    if (lblOfficial) lblOfficial.className = "flex items-center gap-2.5 p-2 rounded-lg border border-slate-700 bg-slate-900 cursor-pointer hover:border-red-500 transition-all";
    if (lblAlumni)   lblAlumni.className   = "flex items-center gap-2.5 p-2 rounded-lg border border-sky-500/80 bg-sky-950/40 cursor-pointer shadow-sm";
    if (namaPenjual) {
      if (namaPenjual.value === "Official Teater Q") namaPenjual.value = "";
      namaPenjual.readOnly = false;
      namaPenjual.classList.remove("opacity-75", "bg-slate-900");
    }
    if (kotaAsal) {
      if (kotaAsal.value === "Surabaya") kotaAsal.value = "";
      kotaAsal.readOnly = false;
      kotaAsal.classList.remove("opacity-75", "bg-slate-900");
    }
    if (waPenjual) {
      if (typeof CONFIG_INFO !== "undefined" && waPenjual.value === CONFIG_INFO.noAdminWA) waPenjual.value = "";
      waPenjual.readOnly = false;
      waPenjual.classList.remove("opacity-75", "bg-slate-900");
    }
    if (kategori) {
      kategori.innerHTML = `
        <option value="" disabled selected>-- Pilih Kategori Produk --</option>
        <option value="Kuliner">Kuliner, Kopi & Makanan</option>
        <option value="Buku">Buku, Naskah & Karya Tulis</option>
        <option value="Sandang">Pakaian, Kaos & Distro</option>
        <option value="Kerajinan">Karya Seni & Kerajinan</option>
        <option value="Jasa">Tiket, Jasa & Lainnya</option>
      `;
    }
    const areaRek = document.getElementById("areaRekeningPenjual");
    if (areaRek) areaRek.classList.remove("hidden");
  }
}

async function submitLapakAlumni() {
  const nama = (document.getElementById("lapakNamaProduk")?.value || "").trim();
  const kategori = (document.getElementById("lapakKategori")?.value || "").trim();
  const harga = (document.getElementById("lapakHarga")?.value || "").trim();
  const stok = (document.getElementById("lapakStok")?.value || "10").trim();
  const namaPenjual = (document.getElementById("lapakNamaPenjual")?.value || "").trim();
  const kotaAsal = (document.getElementById("lapakKotaAsal")?.value || "Surabaya").trim();
  const wa = (document.getElementById("lapakWaPenjual")?.value || "").trim();
  const namaBank = (document.getElementById("lapakNamaBank")?.value || "").trim();
  const noRekening = (document.getElementById("lapakNoRekening")?.value || "").trim();
  const deskripsi = (document.getElementById("lapakDeskripsi")?.value || "").trim();
  const linkShopee = (document.getElementById("lapakLinkShopee")?.value || "").trim();
  const linkTokopedia = (document.getElementById("lapakLinkTokopedia")?.value || "").trim();
  const linkTiktok = (document.getElementById("lapakLinkTiktok")?.value || "").trim();
  const fileInput = document.getElementById("lapakFotoInput");

  if (!nama || !kategori || !harga || !namaPenjual || !kotaAsal || !wa) {
    showToast("Silakan lengkapi semua kolom wajib bertanda bintang (*) termasuk kategori.", "error");
    return;
  }

  const tipeSelected = document.querySelector("input[name='tipeProdukInput']:checked")?.value || "alumni";
  if (tipeSelected === "alumni" && (!namaBank || !noRekening)) {
    showToast("Silakan lengkapi Nama Bank & No. Rekening pencairan dana Anda.", "error");
    document.getElementById("lapakNamaBank")?.focus();
    return;
  }

  const infoRekening = (tipeSelected === "official")
    ? `Kas ${CONFIG_INFO?.namaBank || "SeaBank"} Sanggar Teater Q (${CONFIG_INFO?.noRekening || "901926407305"})`
    : `${namaBank} - ${noRekening}`;

  const btn = document.getElementById("btnSubmitLapakAlumni");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Mengunggah Produk...`;
  }

  let finalFoto = "";
  if (fileInput && fileInput.files && fileInput.files[0]) {
    try {
      const file = fileInput.files[0];
      const base64Data = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
      const uploadedUrl = await uploadFileToTargetDrive(base64Data, file.name, file.type, "Produk");
      if (uploadedUrl) {
        finalFoto = uploadedUrl;
      }
    } catch(err) {
      console.warn("Upload foto lapak fallback:", err);
    }
  }

  const newProduct = {
    "ID": `LAPAK-${Date.now()}`,
    "Nama Produk": nama,
    "Harga": harga,
    "Stok": stok,
    "Terjual": "0",
    "Deskripsi": deskripsi,
    "Kategori": kategori,
    "Kota Asal": kotaAsal,
    "Penjual": namaPenjual,
    "Wa": wa,
    "Rekening": infoRekening,
    "Shopee": linkShopee,
    "Tokopedia": linkTokopedia,
    "Tiktok": linkTiktok,
    "Foto": finalFoto || DEFAULT_NO_IMAGE,
    "Status": "Tersedia"
  };

  // Update marketplaceData aktif untuk preview instan
  marketplaceData.unshift(newProduct);
  try {
    localStorage.setItem("tq_cache_marketplace", JSON.stringify(marketplaceData));
  } catch(e) {}

  // Kirim notifikasi bot Telegram ke HP Admin
  let marketplaceAlertTxt = "";
  if (linkShopee) marketplaceAlertTxt += `\n🛒 Shopee: ${linkShopee}`;
  if (linkTokopedia) marketplaceAlertTxt += `\n🟢 Tokopedia: ${linkTokopedia}`;
  if (linkTiktok) marketplaceAlertTxt += `\n🎵 TikTok: ${linkTiktok}`;
  const msgLapak = `🛍️ <b>PRODUK LAPAK KARYA BARU DIDAFTARKAN!</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `📦 <b>Produk:</b> ${escapeHtml(nama)}\n` +
    `💰 <b>Harga:</b> Rp ${harga}\n` +
    `📊 <b>Stok:</b> ${stok} pcs\n` +
    `👤 <b>Penjual:</b> ${escapeHtml(namaPenjual)}\n` +
    `📍 <b>Kota Asal:</b> ${escapeHtml(kotaAsal)}\n` +
    `📱 <b>WhatsApp:</b> ${escapeHtml(wa)}\n` +
    `💳 <b>Rekening Pencairan:</b> ${escapeHtml(infoRekening)}\n` +
    marketplaceAlertTxt +
    (finalFoto ? `🖼️ <b>Foto Produk:</b> <a href="${finalFoto}">Buka Foto</a>\n` : '') +
    `⏰ <b>Waktu:</b> ${new Date().toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })} WIB\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `<i>Pendaftaran produk lapak pasar karya Portal Teater Q</i>`;
  sendTelegramAdminNotification(msgLapak);

  // Kirim data secara asynchronous langsung ke Google Spreadsheet tab Produk via Google Apps Script
  try {
    const targetScript = (typeof SCRIPT_MARKETPLACE !== "undefined") ? SCRIPT_MARKETPLACE : UPLOAD_SCRIPT_URL;
    fetch(targetScript, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "add_marketplace_item",
        id: newProduct.ID,
        nama: nama,
        harga: harga,
        stok: stok,
        terjual: 0,
        deskripsi: deskripsi,
        kategori: kategori,
        kotaAsal: kotaAsal,
        penjual: namaPenjual,
        wa: wa,
        rekening: infoRekening,
        shopee: linkShopee,
        tokopedia: linkTokopedia,
        tiktok: linkTiktok,
        foto: finalFoto || "",
        status: "Tersedia"
      })
    }).catch(e => console.log("Sync GAS:", e));
  } catch(e) {}

  showToast(`Selamat! Produk "${nama}" berhasil didaftarkan di Pasar Karya Paguyuban!`, "success");
  closeModalBukaLapak();
  document.getElementById("formBukaLapakAlumni")?.reset();
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = `<i class="fas fa-check-circle"></i> Pasang Produk Sekarang`;
  }
  renderMarketplace();
}

// ============================================================================
// MODAL & LOGIKA PEMESANAN TIKET PEMENTASAN (SINKRON DENGAN WEBSITE EKSTERNAL)
// ============================================================================

let currentTiketKategori = "reguler";
let currentTiketQty = 1;
let previewMabaBase64 = "";
let previewTransferBase64 = "";

let pentasSettingData = {
  statusTiket: "Tutup",
  gelombang: "Reguler",
  judulLakon: "Sidang Para Setan",
  subJudul: "Pentas Akbar Teater Q",
  tanggalJam: "20 Agustus 2026, 19.00",
  lokasi: "Gd. Auditorium UINSA",
  hargaReguler: 10000,
  diskonPresale1: 30,
  diskonPresale2: 15,
  diskonMaba: 30,
  kuotaTiket: 298,
  tiketTerjual: 133,
  rekening: "SeaBank 901926407305 a/n Ely Dwi Asih (Bendahara Teater Q)",
  waPanitia: "6285645829346"
};

// Cek cache lokal agar judul & harga instan tampil 0 detik tanpa flicker
try {
  const cachedPentas = localStorage.getItem("teaterq_pentas_config");
  if (cachedPentas) {
    const parsed = JSON.parse(cachedPentas);
    if (parsed && parsed.judulLakon) {
      pentasSettingData = { ...pentasSettingData, ...parsed };
    }
  }
} catch (e) {}

function normalizeTicketPercent(val, fallback = 30) {
  if (val === undefined || val === null || val === "") return fallback;
  let num = typeof val === "number" ? val : parseFloat(String(val).replace(/[^0-9.]/g, ""));
  if (isNaN(num)) return fallback;
  // Jika dari Google Sheet berupa format desimal (contoh: 0.3 artinya 30%, 0.15 artinya 15%)
  if (num > 0 && num <= 1) {
    num = Math.round(num * 100);
  }
  return Math.round(num);
}

function calculateCurrentPentasPrices() {
  const baseReguler = Number(pentasSettingData.hargaReguler) || 30000;
  const wave = String(pentasSettingData.gelombang || "Presale 1").trim();

  let waveDiscount = 0;
  let waveLabel = "Reguler";

  if (/presale\s*1/i.test(wave)) {
    waveDiscount = normalizeTicketPercent(pentasSettingData.diskonPresale1, 30);
    waveLabel = "Presale 1";
  } else if (/presale\s*2/i.test(wave)) {
    waveDiscount = normalizeTicketPercent(pentasSettingData.diskonPresale2, 15);
    waveLabel = "Presale 2";
  } else {
    waveDiscount = 0;
    waveLabel = "Reguler Normal";
  }

  // Harga Reguler di wave saat ini (dipotong diskon gelombang)
  const hargaRegulerFinal = Math.round(baseReguler * (1 - waveDiscount / 100));

  // Harga Maba: Diskon bertingkat / dobel (harga reguler wave didiskon lagi diskon maba 30%)
  const diskonMaba = normalizeTicketPercent(pentasSettingData.diskonMaba, 30);
  const hargaMabaFinal = Math.round(hargaRegulerFinal * (1 - diskonMaba / 100));

  const kuota = Math.max(0, parseInt(pentasSettingData.kuotaTiket, 10) || 300);
  const terjual = Math.max(0, parseInt(pentasSettingData.tiketTerjual, 10) || 0);
  const sisa = Math.max(0, kuota - terjual);
  const isHabisKuota = kuota > 0 && terjual >= kuota;
  const isSoldOut = isHabisKuota || /tutup|sold\s*out|habis/i.test(pentasSettingData.statusTiket || "");

  return {
    baseReguler,
    wave,
    waveLabel,
    waveDiscount,
    diskonMaba,
    hargaRegulerFinal,
    hargaMabaFinal,
    isSoldOut,
    kuota,
    terjual,
    sisa
  };
}

function getKategoriData(katId) {
  const p = calculateCurrentPentasPrices();
  if (katId === "maba") {
    return {
      id: "maba",
      label: `Maba (${p.waveLabel} Double Diskon)`,
      harga: p.hargaMabaFinal,
      hargaCoret: p.baseReguler,
      diskonText: p.waveDiscount > 0 ? `-${p.waveDiscount}% & -${p.diskonMaba}%` : `-${p.diskonMaba}%`,
      isMaba: true
    };
  }
  return {
    id: "reguler",
    label: `Reguler / Umum (${p.waveLabel})`,
    harga: p.hargaRegulerFinal,
    hargaCoret: p.waveDiscount > 0 ? p.baseReguler : 0,
    diskonText: p.waveDiscount > 0 ? `-${p.waveDiscount}%` : "",
    isReguler: true
  };
}

function applyPentasSettingUI() {
  const p = calculateCurrentPentasPrices();

  // 1. Update Promo Banner di Market
  const bannerJudul = document.getElementById("bannerPentasJudul");
  const bannerInfo = document.getElementById("bannerPentasInfo");
  const bannerBadge = document.getElementById("bannerPentasPeriodeBadge");
  const bannerHarga = document.getElementById("bannerPentasHargaMulai");

  if (bannerJudul) bannerJudul.textContent = `Lakon "${pentasSettingData.judulLakon}"`;
  if (bannerInfo) bannerInfo.innerHTML = `<i class="far fa-calendar-alt text-amber-400"></i> ${pentasSettingData.tanggalJam} • ${pentasSettingData.lokasi}`;
  if (bannerBadge) {
    if (p.isSoldOut) {
      bannerBadge.textContent = "Sold Out / Ditutup";
      bannerBadge.className = "text-[9px] font-extrabold bg-red-900/90 text-red-200 px-2 py-0.5 rounded-full border border-red-500/40";
    } else {
      bannerBadge.textContent = p.waveDiscount > 0 ? `🔥 ${p.waveLabel} (Diskon ${p.waveDiscount}%)` : `Tiket Dibuka (${p.waveLabel})`;
      bannerBadge.className = "text-[9px] font-extrabold bg-purple-900/90 text-purple-200 px-2 py-0.5 rounded-full border border-purple-500/40";
    }
  }
  if (bannerHarga) {
    bannerHarga.textContent = `Mulai ${formatRupiah(p.hargaMabaFinal)}`;
  }

  // Update Kuota & Terjual Progress (Banner & Modal)
  const pct = p.kuota > 0 ? Math.min(100, Math.round((p.terjual / p.kuota) * 100)) : 0;

  const bannerKuota = document.getElementById("bannerPentasKuotaProgress");
  const bannerSisa = document.getElementById("bannerPentasSisaTiket");
  const bannerBar = document.getElementById("bannerPentasProgressBar");
  const modalKuota = document.getElementById("modalPentasKuotaProgress");
  const modalSisa = document.getElementById("modalPentasSisaTiket");
  const modalBar = document.getElementById("modalPentasProgressBar");

  if (bannerKuota) bannerKuota.textContent = `Terjual: ${p.terjual} / ${p.kuota} Tiket`;
  if (bannerSisa) {
    if (p.sisa <= 0) {
      bannerSisa.textContent = "Tiket Habis";
      bannerSisa.className = "text-[10px] font-extrabold text-red-300 bg-red-950/60 border border-red-500/30 px-2 py-0.5 rounded-lg";
    } else if (p.sisa <= 20) {
      bannerSisa.textContent = `Sisa ${p.sisa} Tiket!`;
      bannerSisa.className = "text-[10px] font-extrabold text-amber-300 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-lg animate-pulse";
    } else {
      bannerSisa.textContent = `Sisa ${p.sisa} Tiket`;
      bannerSisa.className = "text-[10px] font-extrabold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-lg";
    }
  }
  if (bannerBar) bannerBar.style.width = `${pct}%`;

  if (modalKuota) modalKuota.textContent = `Terjual: ${p.terjual} / ${p.kuota} Tiket (${pct}%)`;
  if (modalSisa) {
    if (p.sisa <= 0) {
      modalSisa.textContent = "Tiket Habis";
      modalSisa.className = "text-[10px] font-extrabold text-red-300 bg-red-950/60 border border-red-500/30 px-2 py-0.5 rounded-full";
    } else if (p.sisa <= 20) {
      modalSisa.textContent = `Sisa ${p.sisa} Kuota!`;
      modalSisa.className = "text-[10px] font-extrabold text-amber-300 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-full animate-pulse";
    } else {
      modalSisa.textContent = `Sisa ${p.sisa} Kuota`;
      modalSisa.className = "text-[10px] font-extrabold text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full";
    }
  }
  if (modalBar) modalBar.style.width = `${pct}%`;

  // 2. Update Modal Header Info
  const mJudul = document.getElementById("tiketLakonJudul");
  const mSub = document.getElementById("tiketLakonSub");
  const mTgl = document.getElementById("tiketLakonTanggal");
  const mLok = document.getElementById("tiketLakonLokasi");
  if (mJudul) mJudul.textContent = pentasSettingData.judulLakon;
  if (mSub) mSub.textContent = `${pentasSettingData.subJudul} • ${p.waveLabel}`;
  if (mTgl) mTgl.textContent = pentasSettingData.tanggalJam;
  if (mLok) mLok.textContent = pentasSettingData.lokasi;
  const mHargaBadge = document.getElementById("tiketHargaBadge");
  if (mHargaBadge) mHargaBadge.textContent = formatRupiah(p.hargaMabaFinal);

  // 3. Update Kartu Pilihan Kategori di Modal
  const priceCoretReguler = document.getElementById("priceCoretReguler");
  const priceFinalReguler = document.getElementById("priceFinalReguler");
  const badgeDiskonReguler = document.getElementById("badgeDiskonReguler");

  if (priceCoretReguler) {
    if (p.waveDiscount > 0) {
      priceCoretReguler.textContent = formatRupiah(p.baseReguler);
      priceCoretReguler.classList.remove("hidden");
    } else {
      priceCoretReguler.classList.add("hidden");
    }
  }
  if (priceFinalReguler) priceFinalReguler.textContent = formatRupiah(p.hargaRegulerFinal);
  if (badgeDiskonReguler) {
    badgeDiskonReguler.textContent = p.waveDiscount > 0 ? `${p.waveLabel} -${p.waveDiscount}%` : "Normal";
  }

  const priceCoretMaba = document.getElementById("priceCoretMaba");
  const priceFinalMaba = document.getElementById("priceFinalMaba");
  const badgeDiskonMaba = document.getElementById("badgeDiskonMaba");

  if (priceCoretMaba) priceCoretMaba.textContent = formatRupiah(p.baseReguler);
  if (priceFinalMaba) priceFinalMaba.textContent = formatRupiah(p.hargaMabaFinal);
  if (badgeDiskonMaba) {
    badgeDiskonMaba.textContent = p.waveDiscount > 0 ? `Double -${p.waveDiscount}% & -${p.diskonMaba}%` : `Diskon Maba -${p.diskonMaba}%`;
  }

  // 4. Update Rekening & Bank Terpusat dari Master Setting
  const noRekDisplay = document.getElementById("tiketRekeningNomor");
  const anDisplay = document.getElementById("tiketAtasNama");
  const bankName = CONFIG_INFO.namaBank || "SeaBank";
  const noRek = CONFIG_INFO.noRekening || "901926407305";
  const atasNama = CONFIG_INFO.atasNama || "Ely Dwi Asih (Bendahara Teater Q)";
  if (noRekDisplay) {
    noRekDisplay.textContent = `${bankName} ${noRek}`;
  }
  if (anDisplay) {
    anDisplay.textContent = `a/n ${atasNama}`;
  }

  // 5. Update Status Tombol & Form Input jika Tutup / Sold Out
  const btnSubmit = document.getElementById("btnSubmitBeliTiket");
  const closedNotice = document.getElementById("tiketClosedNotice");
  const closedNoticeTitle = document.getElementById("tiketClosedNoticeTitle");
  const closedNoticeDesc = document.getElementById("tiketClosedNoticeDesc");
  const closedContactWa = document.getElementById("btnTiketClosedContactWa");
  const formTiket = document.getElementById("formTiketPementasan");
  const btnOpenModal = document.getElementById("btnOpenModalBeliTiket");

  if (p.isSoldOut) {
    // Tampilkan Banner Peringatan Tutup
    if (closedNotice) {
      closedNotice.classList.remove("hidden");
      if (p.sisa <= 0 && p.kuota > 0) {
        if (closedNoticeTitle) closedNoticeTitle.textContent = "Kuota Tiket Telah Habis (Sold Out)";
        if (closedNoticeDesc) closedNoticeDesc.textContent = `Mohon maaf, seluruh kuota kursi (${p.kuota} tiket) untuk pementasan lakon "${pentasSettingData.judulLakon || 'Teater Q'}" telah habis terpesan.`;
      } else {
        if (closedNoticeTitle) closedNoticeTitle.textContent = "Pemesanan Tiket Sedang Ditutup";
        if (closedNoticeDesc) closedNoticeDesc.textContent = `Mohon maaf, loket pemesanan tiket untuk lakon "${pentasSettingData.judulLakon || 'Teater Q'}" saat ini sedang ditutup oleh panitia.`;
      }
      if (closedContactWa) {
        const rawWa = (typeof CONFIG_INFO !== "undefined" && CONFIG_INFO.noPanitiaWA) ? CONFIG_INFO.noPanitiaWA : (pentasSettingData.waPanitia || (typeof CONFIG_TICKETING !== "undefined" && CONFIG_TICKETING.waTicketing) || "6285645829346");
        const cleanWa = String(rawWa).replace(/[^0-9]/g, "");
        closedContactWa.href = `https://wa.me/${cleanWa}?text=Halo%20Panitia%20Tiket%20Teater%20Q%2C%20apakah%20tiket%20masih%20tersedia%3F`;
      }
    }

    // Kunci (Disable) seluruh input teks, select, dan file di formulir
    if (formTiket) {
      const inputs = formTiket.querySelectorAll("input, select, textarea");
      inputs.forEach(el => {
        el.disabled = true;
        el.classList.add("opacity-50", "cursor-not-allowed", "bg-slate-800/80");
      });
      const interactiveBtns = formTiket.querySelectorAll("button[type='button'], .cursor-pointer");
      interactiveBtns.forEach(b => {
        b.classList.add("pointer-events-none", "opacity-60");
      });
    }

    // Tombol Submit Form
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.className = "w-full py-3.5 px-4 rounded-xl font-bold text-xs text-slate-400 bg-slate-800 border border-slate-700 cursor-not-allowed flex items-center justify-center gap-2 shadow-inner";
      btnSubmit.innerHTML = `<i class="fa-solid fa-lock fas fa-lock text-rose-400"></i> <span>Pemesanan Tiket Sedang Ditutup</span>`;
    }

    // Tombol CTA di Banner Halaman Utama
    if (btnOpenModal) {
      btnOpenModal.innerHTML = `<i class="fa-solid fa-lock fas fa-lock text-rose-300 text-xs"></i> <span>Pemesanan Tiket Ditutup</span>`;
      btnOpenModal.classList.remove("from-amber-500", "via-orange-500", "to-red-600");
      btnOpenModal.classList.add("from-slate-800", "via-slate-800", "to-slate-900", "border", "border-slate-700", "text-slate-300");
    }
  } else {
    // Sembunyikan Banner Tutup jika Status Buka
    if (closedNotice) {
      closedNotice.classList.add("hidden");
    }

    // Buka kembali (Enable) seluruh input teks, select, dan file
    if (formTiket) {
      const inputs = formTiket.querySelectorAll("input, select, textarea");
      inputs.forEach(el => {
        el.disabled = false;
        el.classList.remove("opacity-50", "cursor-not-allowed", "bg-slate-800/80");
      });
      const interactiveBtns = formTiket.querySelectorAll("button[type='button'], .cursor-pointer");
      interactiveBtns.forEach(b => {
        b.classList.remove("pointer-events-none", "opacity-60");
      });
    }

    // Tombol Submit Form
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.className = "w-full py-3.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-sm sm:text-base rounded-2xl shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all";
      btnSubmit.innerHTML = `<i class="fas fa-ticket-alt text-amber-300 text-lg"></i> <span>Pesan Tiket &amp; Dapatkan Kode Tiket</span>`;
    }

    // Tombol CTA di Banner Halaman Utama
    if (btnOpenModal) {
      btnOpenModal.innerHTML = `<i class="fas fa-ticket-alt text-sm text-amber-200"></i> <span>Beli Tiket</span>`;
      btnOpenModal.classList.remove("from-slate-800", "via-slate-800", "to-slate-900", "border", "border-slate-700", "text-slate-300");
      btnOpenModal.classList.add("from-amber-500", "via-orange-500", "to-red-600", "text-white");
    }
  }

  updateTiketCalculation();
}

async function fetchPentasSetting() {
  if (typeof CONFIG_TICKETING === "undefined" || !CONFIG_TICKETING.scriptUrl) {
    applyPentasSettingUI();
    return;
  }
  try {
    const sep = CONFIG_TICKETING.scriptUrl.includes("?") ? "&" : "?";
    const res = await fetch(`${CONFIG_TICKETING.scriptUrl}${sep}action=config&_nocache=${Date.now()}`, {
      method: "GET",
      cache: "no-store"
    });
    if (res.ok) {
      const text = await res.text();
      if (text.trim().startsWith("{")) {
        const json = JSON.parse(text);
        if (json && json.status === "ok" && json.config) {
          pentasSettingData = { ...pentasSettingData, ...json.config };
          try {
            localStorage.setItem("teaterq_pentas_config", JSON.stringify(pentasSettingData));
          } catch (errSave) {}
          applyPentasSettingUI();
        }
      }
    }
  } catch (e) {
    console.log("Pentas setting fallback:", e);
    applyPentasSettingUI();
  }
}

function compressTicketImageFile(file, callback, maxWidth = 1080, quality = 0.72) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
      if (typeof callback === "function") {
        callback(compressedDataUrl);
      }
    };
    img.onerror = function() {
      if (typeof callback === "function") callback(e.target.result);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function openModalBeliTiket() {
  const modal = document.getElementById("modalBeliTiket");
  if (!modal) return;

  // Sinkronkan Rekening Kas Resmi dari Master Setting Terpadu
  const noRekDisplay = document.getElementById("tiketRekeningNomor");
  const anDisplay = document.getElementById("tiketAtasNama");
  const bankName = CONFIG_INFO.namaBank || "SeaBank";
  const noRek = CONFIG_INFO.noRekening || "901926407305";
  const atasNama = CONFIG_INFO.atasNama || "Ely Dwi Asih (Bendahara Teater Q)";
  if (noRekDisplay) noRekDisplay.textContent = `${bankName} ${noRek}`;
  if (anDisplay) anDisplay.textContent = `a/n ${atasNama}`;

  // Tarik setting lakon/kuota dari Google Sheet
  fetchPentasSetting();

  // Reset tampilan view ke form jika sebelumnya di success view
  const formContainer = document.getElementById("tiketFormContainer");
  const successView = document.getElementById("tiketSuccessView");
  if (formContainer) formContainer.classList.remove("hidden");
  if (successView) successView.classList.add("hidden");

  // Listener input preview foto Maba
  const mabaFileInput = document.getElementById("tiketBuktiMabaFile");
  const mabaPreview = document.getElementById("previewBuktiMaba");
  const mabaContainer = document.getElementById("previewBuktiMabaContainer");
  if (mabaFileInput && mabaPreview && mabaContainer) {
    mabaFileInput.onchange = function() {
      if (mabaFileInput.files && mabaFileInput.files[0]) {
        compressTicketImageFile(mabaFileInput.files[0], compressedData => {
          previewMabaBase64 = compressedData;
          mabaPreview.src = compressedData;
          mabaContainer.classList.remove("hidden");
        });
      }
    };
  }

  // Listener input preview foto Transfer
  const tfFileInput = document.getElementById("tiketBuktiTransferFile");
  const tfPreview = document.getElementById("previewBuktiTransfer");
  const tfContainer = document.getElementById("previewBuktiTransferContainer");
  if (tfFileInput && tfPreview && tfContainer) {
    tfFileInput.onchange = function() {
      if (tfFileInput.files && tfFileInput.files[0]) {
        compressTicketImageFile(tfFileInput.files[0], compressedData => {
          previewTransferBase64 = compressedData;
          tfPreview.src = compressedData;
          tfContainer.classList.remove("hidden");
        });
      }
    };
  }

  // Inisialisasi Kategori & Perhitungan Awal
  currentTiketQty = 1;
  const qtyInput = document.getElementById("tiketJumlah");
  if (qtyInput) qtyInput.value = "1";

  // Default checked radio: Reguler
  const radReg = document.querySelector('input[name="tiketKategoriRadio"][value="reguler"]');
  if (radReg) radReg.checked = true;
  onKategoriTiketChange("reguler");

  // Otomatis pilih Fakultas / Status: "Anggota / Alumni Teater Q" agar anggota tidak perlu memilih lagi
  const fFakultas = document.getElementById("tiketFakultas");
  if (fFakultas) {
    fFakultas.value = "Anggota";
    onFakultasChange(true);
  }

  // Terapkan status Buka / Tutup & Disable formulir jika pementasan ditutup
  applyPentasSettingUI();

  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeModalBeliTiket() {
  const modal = document.getElementById("modalBeliTiket");
  if (modal) {
    modal.classList.remove("flex");
    modal.classList.add("hidden");
  }
}

function resetAndCloseTiketModal() {
  const form = document.getElementById("formTiketPementasan");
  if (form) form.reset();
  previewMabaBase64 = "";
  previewTransferBase64 = "";
  document.getElementById("previewBuktiMabaContainer")?.classList.add("hidden");
  document.getElementById("previewBuktiTransferContainer")?.classList.add("hidden");
  const formContainer = document.getElementById("tiketFormContainer");
  const successView = document.getElementById("tiketSuccessView");
  if (formContainer) formContainer.classList.remove("hidden");
  if (successView) successView.classList.add("hidden");
  closeModalBeliTiket();
}

function onFakultasChange(skipKategoriSync = false) {
  const fFakultas = document.getElementById("tiketFakultas");
  const val = fFakultas ? fFakultas.value : "";
  const boxJurusanProdi = document.getElementById("boxJurusanProdi");
  const labelJurusanProdi = document.getElementById("labelJurusanProdi");
  const inputJurusan = document.getElementById("tiketJurusan");
  const boxSemester = document.getElementById("boxSemester");
  const inputSemester = document.getElementById("tiketSemester");

  const boxNotice = document.getElementById("boxUndanganGratisNotice");
  const boxPay = document.getElementById("boxPembayaranDanUploadContainer");
  const badgeSyarat = document.getElementById("badgeSyaratBukti");

  if (val === "Undangan") {
    // 1. Pilihan Undangan: Gratis, Tanpa Upload, Wajib isi Instansi/Dari Mana
    if (boxJurusanProdi) boxJurusanProdi.classList.remove("hidden");
    if (labelJurusanProdi) labelJurusanProdi.innerHTML = `Dari Mana? (Instansi / Lembaga / Tamu Dari) <span class="text-red-400">*</span>`;
    if (inputJurusan) {
      inputJurusan.placeholder = "Contoh: Dewan Kesenian Jatim / UKM Musik / Tamu Undangan / dsb";
      inputJurusan.required = true;
      if (inputJurusan.value === "Anggota / Alumni Teater Q") inputJurusan.value = "";
    }
    // Semester disembunyikan untuk undangan
    if (boxSemester) boxSemester.classList.add("hidden");
    if (inputSemester) inputSemester.required = false;

    // Sembunyikan transfer & upload, tampilkan notice undangan gratis
    if (boxNotice) boxNotice.classList.remove("hidden");
    if (boxPay) boxPay.classList.add("hidden");
    if (badgeSyarat) {
      badgeSyarat.textContent = "Bebas Biaya (Tanpa Upload)";
      badgeSyarat.className = "text-[10px] text-emerald-300 font-extrabold bg-emerald-900/50 px-2 py-0.5 rounded border border-emerald-500/40";
    }

    if (!skipKategoriSync && currentTiketKategori === "maba") {
      const radReg = document.querySelector('input[name="tiketKategoriRadio"][value="reguler"]');
      if (radReg) {
        radReg.checked = true;
        onKategoriTiketChange("reguler", true);
      }
    }
  } else {
    // Tampilkan kembali box pembayaran & upload untuk selain undangan
    if (boxNotice) boxNotice.classList.add("hidden");
    if (boxPay) boxPay.classList.remove("hidden");

    if (val === "Umum") {
      // 2. Jika pilihannya umum: muncul "Dari mana?", prodinya berubah jadi "Dari mana?"
      if (boxJurusanProdi) boxJurusanProdi.classList.remove("hidden");
      if (labelJurusanProdi) labelJurusanProdi.innerHTML = `Dari Mana? (Instansi / Asal) <span class="text-red-400">*</span>`;
      if (inputJurusan) {
        inputJurusan.placeholder = "Contoh: UNESA / Komunitas Teater / Surabaya / dsb";
        inputJurusan.required = true;
        if (inputJurusan.value === "Anggota / Alumni Teater Q") inputJurusan.value = "";
      }
      // Semester disembunyikan untuk umum
      if (boxSemester) boxSemester.classList.add("hidden");
      if (inputSemester) inputSemester.required = false;

      // Pastikan radio kategori ke "Reguler" jika sebelumnya maba
      if (!skipKategoriSync && currentTiketKategori === "maba") {
        const radReg = document.querySelector('input[name="tiketKategoriRadio"][value="reguler"]');
        if (radReg) {
          radReg.checked = true;
          onKategoriTiketChange("reguler", true);
        }
      }
    } else if (val === "Anggota") {
      // 3. Jika anggota: gak perlu tampil (prodinya disembunyikan)
      if (boxJurusanProdi) boxJurusanProdi.classList.add("hidden");
      if (inputJurusan) {
        inputJurusan.required = false;
        inputJurusan.value = "Anggota / Alumni Teater Q";
      }
      // Semester juga disembunyikan untuk anggota
      if (boxSemester) boxSemester.classList.add("hidden");
      if (inputSemester) inputSemester.required = false;

      if (!skipKategoriSync && currentTiketKategori === "maba") {
        const radReg = document.querySelector('input[name="tiketKategoriRadio"][value="reguler"]');
        if (radReg) {
          radReg.checked = true;
          onKategoriTiketChange("reguler", true);
        }
      }
    } else {
      // 4. Fakultas UINSA biasa (FDK, FUF, FTK, dll)
      if (boxJurusanProdi) boxJurusanProdi.classList.remove("hidden");
      if (labelJurusanProdi) labelJurusanProdi.innerHTML = `Jurusan / Prodi <span class="text-red-400">*</span>`;
      if (inputJurusan) {
        inputJurusan.placeholder = "Contoh: Komunikasi";
        inputJurusan.required = true;
        if (inputJurusan.value === "Anggota / Alumni Teater Q") inputJurusan.value = "";
      }
      if (boxSemester) boxSemester.classList.remove("hidden");
      if (inputSemester) inputSemester.required = true;

      // Jika semester 1 maba dipilih, otomatis pindah ke kategori maba
      if (!skipKategoriSync && inputSemester && inputSemester.value === "Semester 1 (Maba)") {
        const radMaba = document.querySelector('input[name="tiketKategoriRadio"][value="maba"]');
        if (radMaba && !radMaba.checked) {
          radMaba.checked = true;
          onKategoriTiketChange("maba", true);
        }
      }
    }
  }

  updateTiketCalculation();
}

function onKategoriTiketChange(katId, skipFakultasSync = false) {
  currentTiketKategori = katId === "maba" ? "maba" : "reguler";

  // Visual style kartu radio
  const cardReguler = document.getElementById("cardKatReguler");
  const cardMaba = document.getElementById("cardKatMaba");

  if (currentTiketKategori === "reguler") {
    if (cardReguler) cardReguler.className = "flex items-center justify-between p-3 rounded-xl border border-purple-500/80 bg-purple-950/30 cursor-pointer hover:border-purple-400 transition-all shadow-sm";
    if (cardMaba) cardMaba.className = "flex items-center justify-between p-3 rounded-xl border border-slate-700 bg-slate-900/60 cursor-pointer hover:border-purple-400 transition-all";
  } else {
    if (cardMaba) cardMaba.className = "flex items-center justify-between p-3 rounded-xl border border-purple-500/80 bg-purple-950/30 cursor-pointer hover:border-purple-400 transition-all shadow-sm";
    if (cardReguler) cardReguler.className = "flex items-center justify-between p-3 rounded-xl border border-slate-700 bg-slate-900/60 cursor-pointer hover:border-purple-400 transition-all";
  }

  const fFakultas = document.getElementById("tiketFakultas");
  const groupMaba = document.getElementById("groupBuktiMaba");
  const badgeSyarat = document.getElementById("badgeSyaratBukti");
  const labelBagian2 = document.getElementById("labelBagian2Title");
  const labelTransfer = document.getElementById("labelBuktiTransfer");
  const inputSemester = document.getElementById("tiketSemester");

  // Jika MABA:
  if (currentTiketKategori === "maba") {
    if (labelBagian2) labelBagian2.textContent = "2. Informasi Kampus UINSA (Maba)";
    if (inputSemester) inputSemester.value = "Semester 1 (Maba)";

    // MABA: WAJIB 2 BUKTI
    if (groupMaba) groupMaba.classList.remove("hidden");
    if (badgeSyarat) {
      badgeSyarat.textContent = "Wajib 2 Upload Bukti (Maba + Bayar)";
      badgeSyarat.className = "text-[10px] text-purple-300 font-extrabold bg-purple-900/50 px-2 py-0.5 rounded border border-purple-500/40";
    }
    if (labelTransfer) labelTransfer.innerHTML = `2. Bukti Transfer / Pembayaran <span class="text-red-400">*</span>`;

    // Jika fakultas masih Umum, Anggota, atau Undangan, reset ke kosong
    if (!skipKategoriSync && fFakultas && (fFakultas.value === "Umum" || fFakultas.value === "Anggota" || fFakultas.value === "Undangan")) {
      fFakultas.value = "";
    }
  } else {
    if (labelBagian2) labelBagian2.textContent = "2. Informasi Kampus / Instansi";
    // REGULER / UMUM: CUKUP 1 BUKTI TRANSFER
    if (groupMaba) groupMaba.classList.add("hidden");
    if (badgeSyarat && fFakultas && fFakultas.value !== "Undangan") {
      badgeSyarat.textContent = "1 Upload Bukti";
      badgeSyarat.className = "text-[10px] text-emerald-400 font-semibold";
    }
    if (labelTransfer) labelTransfer.innerHTML = `Bukti Transfer / Pembayaran <span class="text-red-400">*</span>`;
  }

  onFakultasChange(true);
  updateTiketCalculation();
}

function adjustTiketQty(delta) {
  let newQty = currentTiketQty + delta;
  if (newQty < 1) newQty = 1;
  if (newQty > 15) newQty = 15;
  currentTiketQty = newQty;

  const qtyInput = document.getElementById("tiketJumlah");
  if (qtyInput) qtyInput.value = currentTiketQty;

  updateTiketCalculation();
}

function updateTiketCalculation() {
  const fFakultas = document.getElementById("tiketFakultas");
  const isUndangan = fFakultas && fFakultas.value === "Undangan";

  const display = document.getElementById("tiketTotalBayarDisplay");
  const labelSelected = document.getElementById("tiketKategoriLabelSelected");
  const btnSubmit = document.getElementById("btnSubmitBeliTiket");
  const pCheck = calculateCurrentPentasPrices();

  if (pCheck.isSoldOut && btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.className = "w-full py-3.5 px-4 rounded-xl font-bold text-xs text-slate-400 bg-slate-800 border border-slate-700 cursor-not-allowed flex items-center justify-center gap-2 shadow-inner";
    btnSubmit.innerHTML = `<i class="fa-solid fa-lock fas fa-lock text-rose-400"></i> <span>Pemesanan Tiket Sedang Ditutup</span>`;
    if (display) {
      if (isUndangan) {
        display.textContent = "Rp 0 (Gratis)";
      } else {
        const katData = getKategoriData(currentTiketKategori);
        display.textContent = formatRupiah(katData.harga * currentTiketQty);
      }
    }
    return;
  }

  if (isUndangan) {
    if (display) {
      display.textContent = "Rp 0 (Gratis)";
      display.className = "font-mono text-base sm:text-lg font-black text-emerald-400";
    }
    if (labelSelected) {
      labelSelected.innerHTML = `${currentTiketQty}x Tiket Tamu Undangan <span class="text-emerald-300 font-extrabold">(VIP / Bebas Biaya)</span>`;
    }
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.className = "w-full py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all";
      btnSubmit.innerHTML = `<i class="fas fa-gift text-emerald-200"></i> <span>Klaim E-Tiket Undangan Resmi (Gratis)</span>`;
    }
    return;
  }

  const katData = getKategoriData(currentTiketKategori);
  const total = katData.harga * currentTiketQty;

  if (display) {
    display.textContent = formatRupiah(total);
    display.className = "font-mono text-base sm:text-lg font-black text-amber-400";
  }
  if (labelSelected) {
    if (katData.hargaCoret > 0) {
      labelSelected.innerHTML = `${currentTiketQty}x Tiket ${katData.label} <span class="text-emerald-400 font-bold">(${katData.diskonText})</span>`;
    } else {
      labelSelected.textContent = `${currentTiketQty}x Tiket ${katData.label}`;
    }
  }
  if (btnSubmit) {
    btnSubmit.disabled = false;
    btnSubmit.className = "w-full py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all";
    btnSubmit.innerHTML = `<i class="fas fa-ticket-alt text-amber-300"></i> <span>Pesan Tiket &amp; Dapatkan Kode Tiket</span>`;
  }
}

async function handleTiketFormSubmit(e) {
  if (e) e.preventDefault();

  const pCheck = calculateCurrentPentasPrices();
  if (pCheck.isSoldOut) {
    showToast("Mohon maaf, pemesanan tiket saat ini sedang ditutup atau kuota pementasan telah habis.", "warning");
    return;
  }

  const nama = document.getElementById("tiketNama")?.value.trim() || "";
  const email = document.getElementById("tiketEmail")?.value.trim() || "";
  const wa = document.getElementById("tiketWA")?.value.trim() || "";
  const qty = currentTiketQty;

  const fFakultas = document.getElementById("tiketFakultas");
  const inputJurusan = document.getElementById("tiketJurusan");
  const inputSemester = document.getElementById("tiketSemester");

  let fakultas = fFakultas ? fFakultas.value : "";
  let jurusan = inputJurusan ? inputJurusan.value.trim() : "";
  let semester = inputSemester ? inputSemester.value : "";

  if (!fakultas) {
    showToast("Harap pilih Fakultas / Status Anda!", "warning");
    return;
  }

  const isUndangan = fakultas === "Undangan";

  if (isUndangan) {
    if (!jurusan) {
      showToast("Harap isi Dari Mana (Instansi / Lembaga / Asal Tamu)!", "warning");
      return;
    }
    semester = "Tamu Undangan";
  } else if (fakultas === "Umum") {
    if (!jurusan) {
      showToast("Harap isi darimana instansi / asal Anda!", "warning");
      return;
    }
    semester = "Umum";
  } else if (fakultas === "Anggota") {
    jurusan = "Anggota / Alumni Teater Q";
    semester = "Alumni / Anggota";
  } else {
    if (!jurusan) {
      showToast("Harap isi Jurusan / Prodi Anda!", "warning");
      return;
    }
    if (!semester) {
      showToast("Harap pilih Semester Anda!", "warning");
      return;
    }
  }

  const katData = getKategoriData(currentTiketKategori);
  const total = isUndangan ? 0 : katData.harga * qty;
  const totalFormatted = isUndangan ? "Rp 0 (Gratis)" : formatRupiah(total);
  const katLabel = isUndangan ? "Tamu Undangan (Gratis)" : katData.label;

  // Link / upload bukti
  const linkBuktiMabaInput = document.getElementById("tiketBuktiMabaLink")?.value.trim() || "";
  const linkBuktiTfInput = document.getElementById("tiketBuktiTransferLink")?.value.trim() || "";

  if (!isUndangan) {
    // Validasi khusus MABA: Wajib 2 bukti (Bukti Maba + Bukti Transfer)
    if (currentTiketKategori === "maba" && !linkBuktiMabaInput && !previewMabaBase64) {
      showToast("Kategori Maba WAJIB melampirkan Bukti Maba / KTM Sementara!", "warning");
      return;
    }

    // Validasi Bukti Transfer (Wajib untuk semua kategori berbayar)
    if (!linkBuktiTfInput && !previewTransferBase64) {
      showToast("Harap lampirkan Foto atau Link Bukti Transfer Pembayaran!", "warning");
      return;
    }
  }

  const btn = document.getElementById("btnSubmitBeliTiket");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Memproses Reservasi...`;
  }

  // Buat ID Tiket unik & Timestamp
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const dateObj = new Date();
  const yearMonth = String(dateObj.getFullYear()).slice(-2) + String(dateObj.getMonth() + 1).padStart(2, "0");
  const idTiket = isUndangan ? `TQ-VIP-${yearMonth}-${randomSuffix}` : `TQ-TIX-${yearMonth}-${randomSuffix}`;
  const timestamp = dateObj.toLocaleString("id-ID", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });

  // Unggah Bukti Bayar & Bukti Maba secara dinamis ke Folder Google Drive "Tiket" dari Drive_Folder
  let uploadedTransferUrl = linkBuktiTfInput;
  if (!uploadedTransferUrl && previewTransferBase64) {
    if (btn) btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Mengunggah Bukti Pembayaran...`;
    try {
      uploadedTransferUrl = await uploadFileToTargetDrive(
        previewTransferBase64,
        `Bukti-TF-${idTiket}.jpg`,
        "image/jpeg",
        "Tiket"
      );
    } catch(errTf) {
      console.warn("Gagal upload bukti transfer tiket:", errTf);
    }
  }

  let uploadedMabaUrl = linkBuktiMabaInput;
  if (!uploadedMabaUrl && currentTiketKategori === "maba" && previewMabaBase64) {
    if (btn) btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Mengunggah Bukti Maba...`;
    try {
      uploadedMabaUrl = await uploadFileToTargetDrive(
        previewMabaBase64,
        `Bukti-Maba-${idTiket}.jpg`,
        "image/jpeg",
        "Tiket"
      );
    } catch(errMaba) {
      console.warn("Gagal upload bukti maba tiket:", errMaba);
    }
  }

  const finalBuktiMaba = isUndangan ? "-" : (currentTiketKategori === "maba" ? (uploadedMabaUrl || "Foto Bukti Maba Terlampir") : "-");
  const finalBuktiTransfer = isUndangan ? "Tamu Undangan (Bebas Biaya / Gratis)" : (uploadedTransferUrl || "Foto Bukti Transfer Terlampir");

  // URL QR Code verifikasi pintu masuk
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(idTiket)}`;

  const activeLakon = pentasSettingData.judulLakon || (typeof CONFIG_TICKETING !== "undefined" ? CONFIG_TICKETING.lakonJudul : "TITIK NADIR");
  const ticketRecord = {
    timestamp: timestamp,
    idTiket: idTiket,
    namaLengkap: nama,
    email: email,
    fakultas: fakultas,
    jurusan: jurusan,
    semester: semester,
    nomorWA: wa,
    jumlahTiket: qty,
    kategoriTiket: katLabel,
    totalBayar: totalFormatted,
    linkBuktiMaba: finalBuktiMaba,
    linkBuktiTransfer: finalBuktiTransfer,
    linkQrCode: qrCodeUrl,
    namaPementasan: activeLakon,
    lakon: activeLakon,
    tanggalJam: pentasSettingData.tanggalJam || "",
    lokasi: pentasSettingData.lokasi || "",
    subJudul: pentasSettingData.subJudul || ""
  };

  // Simpan di local storage
  try {
    const existingOrders = JSON.parse(localStorage.getItem("teaterq_ticket_orders") || "[]");
    existingOrders.unshift(ticketRecord);
    localStorage.setItem("teaterq_ticket_orders", JSON.stringify(existingOrders));
  } catch(err) {
    console.warn("Storage error:", err);
  }

  // Kirim background fetch jika scriptUrl Google Sheets sudah diisi
  if (typeof CONFIG_TICKETING !== "undefined" && CONFIG_TICKETING.scriptUrl) {
    try {
      const targetFolderTiket = (typeof getDriveTargetFolder === "function") ? await getDriveTargetFolder("Tiket") : null;
      fetch(CONFIG_TICKETING.scriptUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "add_ticket_order",
          ...ticketRecord,
          linkBuktiTransfer: finalBuktiTransfer,
          linkBuktiMaba: finalBuktiMaba,
          target: "Tiket",
          folderId: targetFolderTiket ? targetFolderTiket.id : "",
          targetFolderId: targetFolderTiket ? targetFolderTiket.id : "",
          fileBuktiTransfer: finalBuktiTransfer.startsWith("http") ? "" : (previewTransferBase64 || ""),
          fileBuktiMaba: finalBuktiMaba.startsWith("http") ? "" : (currentTiketKategori === "maba" ? (previewMabaBase64 || "") : ""),
          clientTelegramSent: true
        })
      }).catch(e => console.log("Ticket sync GAS:", e));
    } catch(e) {}
  }

  // Notifikasi Telegram Real-Time ke Bot Admin Teater Q
  try {
    let instansiInfo = "";
    if (fakultas === "Umum") {
      instansiInfo = `🏢 <b>Asal Instansi:</b> ${escapeHtml(jurusan)} (Umum)`;
    } else if (fakultas === "Anggota") {
      instansiInfo = `👑 <b>Status:</b> Anggota / Alumni Teater Q`;
    } else {
      instansiInfo = `🏛️ <b>Akademik:</b> ${escapeHtml(fakultas)} • ${escapeHtml(jurusan)} (${escapeHtml(semester)})`;
    }

    const waktuStr = new Date().toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
    const cleanWaNumber = (wa || "").replace(/\D/g, "");
    const waLink = cleanWaNumber ? `<a href="https://wa.me/${cleanWaNumber}">Chat WhatsApp</a>` : "-";

    const msgTiket = `🎟️ <b>PESANAN TIKET PEMENTASAN MASUK!</b>\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `🏷️ <b>Kode Tiket:</b> <code>${idTiket}</code>\n` +
      `👑 <b>Pementasan:</b> ${escapeHtml(ticketRecord.namaPementasan)}\n` +
      `👤 <b>Pemesan:</b> ${escapeHtml(nama)}\n` +
      `📱 <b>WhatsApp:</b> ${escapeHtml(wa)} (${waLink})\n` +
      (email ? `✉️ <b>Email:</b> ${escapeHtml(email)}\n` : '') +
      `${instansiInfo}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `🎫 <b>Kategori:</b> ${escapeHtml(katLabel)}\n` +
      `👥 <b>Jumlah:</b> ${qty} Tiket\n` +
      `💰 <b>Total Bayar:</b> <b>${totalFormatted}</b>\n` +
      (finalBuktiMaba && finalBuktiMaba !== "-" ? `🎓 <b>Bukti Maba:</b> ${finalBuktiMaba.startsWith("http") ? `<a href="${finalBuktiMaba}">Lihat Berkas</a>` : finalBuktiMaba}\n` : '') +
      (finalBuktiTransfer && finalBuktiTransfer.startsWith("http") ? `🧾 <b>Bukti Transfer:</b> <a href="${finalBuktiTransfer}">Lihat Berkas</a>\n` : '') +
      `⏰ <b>Waktu:</b> ${waktuStr} WIB\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `<i>Pemesanan tiket pementasan resmi dari Portal Teater Q</i>`;

    if (typeof sendTelegramAdminNotification === "function") {
      sendTelegramAdminNotification(msgTiket, previewTransferBase64 || previewMabaBase64 || null);
    }
  } catch(e) {
    console.warn("Gagal mengirim notif Telegram tiket:", e);
  }

  // Tampilkan View Sukses / E-Tiket
  const formContainer = document.getElementById("tiketFormContainer");
  const successView = document.getElementById("tiketSuccessView");

  if (formContainer) formContainer.classList.add("hidden");
  if (successView) {
    successView.classList.remove("hidden");

    document.getElementById("tiketSuccessKode").textContent = idTiket;
    document.getElementById("tiketSuccessNama").textContent = nama;
    document.getElementById("tiketSuccessKategori").textContent = katData.label;
    document.getElementById("tiketSuccessQty").textContent = `${qty} Tiket`;
    document.getElementById("tiketSuccessTotal").textContent = totalFormatted;

    const qrImg = document.getElementById("tiketSuccessQrImg");
    if (qrImg) qrImg.src = qrCodeUrl;

    // Susun pesan WhatsApp Konfirmasi ke Panitia Tiket
    const waPanitia = (typeof CONFIG_INFO !== "undefined" && CONFIG_INFO.noPanitiaWA) ? CONFIG_INFO.noPanitiaWA : ((typeof CONFIG_TICKETING !== "undefined" && CONFIG_TICKETING.waTicketing) || "6285645829346");
    let infoAsal = "";
    if (fakultas === "Umum") {
      infoAsal = `*Status:* Umum / Luar Kampus%0A*Dari Mana:* ${jurusan}%0A`;
    } else if (fakultas === "Anggota") {
      infoAsal = `*Status:* Anggota / Alumni Teater Q%0A`;
    } else {
      infoAsal = `*Fakultas:* ${fakultas}%0A*Jurusan:* ${jurusan}%0A*Semester:* ${semester}%0A`;
    }

    const buktiMabaText = currentTiketKategori === "maba" ? `*1. Bukti Maba:* ${encodeURIComponent(finalBuktiMaba)}%0A*2. Bukti Transfer:* ${encodeURIComponent(finalBuktiTransfer)}%0A` : `*Bukti Transfer:* ${encodeURIComponent(finalBuktiTransfer)}%0A`;

    const waText = `*KONFIRMASI PEMESANAN TIKET PEMENTASAN TEATER Q*%0A` +
      `----------------------------------------%0A` +
      `*ID Tiket:* ${idTiket}%0A` +
      `*Waktu:* ${timestamp}%0A` +
      `*Nama:* ${nama}%0A` +
      `*Email:* ${email}%0A` +
      `*No. WA:* ${wa}%0A` +
      infoAsal +
      `*Kategori:* ${katData.label}%0A` +
      `*Jumlah:* ${qty} Tiket%0A` +
      `*Total Bayar:* ${totalFormatted}%0A` +
      `----------------------------------------%0A` +
      `*Lakon:* ${ticketRecord.lakon}%0A` +
      `*QR Code Tiket:* ${qrCodeUrl}%0A` +
      buktiMabaText +
      `----------------------------------------%0A` +
      `Halo Panitia Tiket Teater Q, saya telah melengkapi formulir dan menyelesaikan pembayaran tiket. Mohon konfirmasi reservasi saya. Terima kasih!`;

    const btnWa = document.getElementById("btnConfirmTicketWA");
    if (btnWa) {
      btnWa.href = `https://wa.me/${waPanitia}?text=${waText}`;
    }
  }

  // Optimistic update hitungan tiket terjual di state & cache
  pentasSettingData.tiketTerjual = (parseInt(pentasSettingData.tiketTerjual, 10) || 0) + qty;
  try {
    localStorage.setItem("teaterq_pentas_config", JSON.stringify(pentasSettingData));
  } catch(e) {}
  applyPentasSettingUI();

  showToast(`E-Tiket ${idTiket} berhasil dibuat!`, "success");

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = `<i class="fas fa-ticket-alt text-amber-300"></i> <span>Pesan Tiket &amp; Dapatkan Kode Tiket</span>`;
  }
}

function copyTiketKodeSuccess() {
  const kode = document.getElementById("tiketSuccessKode")?.textContent || "";
  if (kode) {
    copyTextToClipboard(kode, "ID Reservasi Tiket");
  }
}

function copyTextToClipboard(text, label = "Teks") {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(`${label} berhasil disalin!`, "success");
    }).catch(() => {
      fallbackCopyText(text, label);
    });
  } else {
    fallbackCopyText(text, label);
  }
}

function fallbackCopyText(text, label) {
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
    showToast(`${label} berhasil disalin!`, "success");
  } catch(e) {
    showToast(`Gagal menyalin ${label}`, "error");
  }
  document.body.removeChild(ta);
}

// Expose fungsi Tiket ke window
if (typeof window !== "undefined") {
  window.openModalBeliTiket = openModalBeliTiket;
  window.closeModalBeliTiket = closeModalBeliTiket;
  window.resetAndCloseTiketModal = resetAndCloseTiketModal;
  window.onFakultasChange = onFakultasChange;
  window.onKategoriTiketChange = onKategoriTiketChange;
  window.adjustTiketQty = adjustTiketQty;
  window.handleTiketFormSubmit = handleTiketFormSubmit;
  window.copyTiketKodeSuccess = copyTiketKodeSuccess;
  window.compressTicketImageFile = compressTicketImageFile;
}

// Filter Kategori Marketplace
function filterMarketplaceByCategory(cat) {
  currentMarketCategory = cat;
  document.querySelectorAll(".market-pill-btn").forEach(btn => {
    if (btn.dataset.cat === cat) btn.classList.add("active");
    else btn.classList.remove("active");
  });
  renderMarketplace();
}

// Database Master Kota & Kabupaten Seluruh Jawa (Lengkap 100%) & Hub Utama Indonesia
const DAFTAR_WILAYAH_LENGKAP = [
  // ==========================================
  // 1. JAWA TIMUR (LENGKAP 38 KOTA & KABUPATEN)
  // ==========================================
  // Surabaya & Ring 1
  { kota: "Kota Surabaya", prov: "Jawa Timur", zona: "Jawa Timur (Lokal)", ring: 0, alias: "sby suroboyo rungkut wonokromo gubeng kenjeran benowo sukomanunggal tegalsari genteng tambaksari jambangan gayungan karangpilang wiyung lakarsantri sambikerep bulak krembangan semampir pabeancantikan" },
  { kota: "Kab. Sidoarjo", prov: "Jawa Timur", zona: "Jawa Timur (Lokal)", ring: 0, alias: "sda waru krian porong sukodono taman candi tulangan prambon gedangan sedati krembung buduran wonoayu tarik balongbendo jabon" },
  { kota: "Kab. Gresik", prov: "Jawa Timur", zona: "Jawa Timur (Ring 1)", ring: 1, alias: "driyorejo menganti manyar bawean kebomas benjeng kedamean cerme balongpanggang duduksampeyan sangkapura tambak wringinanom u事業" },
  { kota: "Kota Mojokerto", prov: "Jawa Timur", zona: "Jawa Timur (Ring 1)", ring: 1, alias: "mojokerto kota prajuritkulon magersari kranggan" },
  { kota: "Kab. Mojokerto", prov: "Jawa Timur", zona: "Jawa Timur (Ring 1)", ring: 1, alias: "mojosari trawas pacet ngoro dlanggu puri sooko jatirejo gondang jetis dawarblandong kemlagi mojoanyar" },
  { kota: "Kota Pasuruan", prov: "Jawa Timur", zona: "Jawa Timur (Ring 1)", ring: 1, alias: "pasuruan kota bugul kidul panggungrejo purworejo gadingrejo" },
  { kota: "Kab. Pasuruan", prov: "Jawa Timur", zona: "Jawa Timur (Ring 1)", ring: 1, alias: "pandaan bangil purwosari prigen gempol sukorejo beji kraton rembang grati lekok nguling tutur puspo tosan" },
  { kota: "Kota Malang", prov: "Jawa Timur", zona: "Jawa Timur (Ring 1)", ring: 1, alias: "malang kota kotalama sawojajar sukun lowokwaru klojen blimbing kedungkandang ub um uin" },
  { kota: "Kab. Malang", prov: "Jawa Timur", zona: "Jawa Timur (Ring 1)", ring: 1, alias: "kepanjen singosari lawang dampit turen karangploso pakis tumpang wajak sumberpucung gondanglegi ngajum pujon ngantang kasembon kromengan pagelaran" },
  { kota: "Kota Batu", prov: "Jawa Timur", zona: "Jawa Timur (Ring 1)", ring: 1, alias: "batu malang bumiaji junrejo songgoriti selecta" },

  // Jawa Timur - Pantura & Barat
  { kota: "Kab. Lamongan", prov: "Jawa Timur", zona: "Jawa Timur", ring: 2, alias: "babatan paciran brondong sukodadi deket tikung kembangbahu mantup ngimbang modo bluluk sambeng sekaran maduran karanggeneng pucuk turi karangbinangun glagah kalitengah" },
  { kota: "Kab. Tuban", prov: "Jawa Timur", zona: "Jawa Timur", ring: 2, alias: "pantura jatirogo rengel semanding jenu palang merakurak tambakboyo bancar widang plumpang soko parengan montong singgahan senori bangilan kenduruan kerek grabagan" },
  { kota: "Kab. Bojonegoro", prov: "Jawa Timur", zona: "Jawa Timur", ring: 2, alias: "dander kalitidu padangan baureno sumberrejo kepohbaru kapas balen kanor ngasem purwosari ngambon tambakrejo ngraho margomulyo kasiman kedewan bubulan sukosewu temayang sugihwaras kedungadem gondang sekar trunojoyo cak gondo" },
  { kota: "Kab. Ngawi", prov: "Jawa Timur", zona: "Jawa Timur", ring: 2, alias: "geneng paron sine kendal padas karangjati widodaren mantingan kedunggalar pitu kasreman bringin pangkur kwadungan jogorogo gerih ngrambe" },
  { kota: "Kota Madiun", prov: "Jawa Timur", zona: "Jawa Timur", ring: 2, alias: "madiun kota pecel kartoharjo taman manguharjo" },
  { kota: "Kab. Madiun", prov: "Jawa Timur", zona: "Jawa Timur", ring: 2, alias: "mejayan caruban dolopo saradan balerejo wungu jiwan geger wonoasri pilangkenceng sawahan kare gemarang dagangan kebonsari" },
  { kota: "Kab. Magetan", prov: "Jawa Timur", zona: "Jawa Timur", ring: 2, alias: "sarangan maospati plaosan kawedanan bendo parang poncol karangrejo barat kartoharjo karas ngariboyo panekan sukorejo sidorejo lembeyan" },
  { kota: "Kab. Ponorogo", prov: "Jawa Timur", zona: "Jawa Timur", ring: 2, alias: "reog bantarangin jetis sambit siman babadan jenangan sukorejo kauman sampung balong jambon badegan slahung ngrayun sawoo pulung pudak ngebel sooko" },
  { kota: "Kab. Pacitan", prov: "Jawa Timur", zona: "Jawa Timur", ring: 2, alias: "pantai klayar punung tegalombo arjosari tulakan ngadirojo donorojo pringkuku kebonagung nawangan bandar sudimoro" },

  // Jawa Timur - Tengah & Selatan
  { kota: "Kab. Jombang", prov: "Jawa Timur", zona: "Jawa Timur", ring: 2, alias: "ploso mojoagung tebuireng ngoro peterongan diwek jombang kota sumobito kesamben bandarkedungmulyo perak gudo bareng wonosalam mojoanyar kudu kabuh ngusikan megaluh jogoroto" },
  { kota: "Kab. Nganjuk", prov: "Jawa Timur", zona: "Jawa Timur", ring: 2, alias: "kertosono baron warujayeng tanjung anom sukomoro loceret berbek sawahan pace gondang rejosari bagor wilangan ngetos jatikalen lengkong nglengket patianrowo prambon" },
  { kota: "Kota Kediri", prov: "Jawa Timur", zona: "Jawa Timur", ring: 2, alias: "kediri kota dhoho pesona mojoroto kota pesantren" },
  { kota: "Kab. Kediri", prov: "Jawa Timur", zona: "Jawa Timur", ring: 2, alias: "pare kampung inggris gampengrejo ngadiluwih wates mojo gurah puncu kandangan banyakan semen tarokan plosoklaten papas kepung ngancar ringinrejo kras kandat purwoasri plemahan kayenkidul" },
  { kota: "Kota Blitar", prov: "Jawa Timur", zona: "Jawa Timur", ring: 2, alias: "blitar kota bung karno kepanjenkidul sukorejo sananwetan" },
  { kota: "Kab. Blitar", prov: "Jawa Timur", zona: "Jawa Timur", ring: 2, alias: "wlingi kanigoro garum sutojayan lodoyo kesamben nglegok talun srengat sanankulon ponggok udanawu wonodadi gandusari selorejo dobo doko panggungrejo binangun kademangan bakung wonotirto selopuro" },
  { kota: "Kab. Tulungagung", prov: "Jawa Timur", zona: "Jawa Timur", ring: 2, alias: "ngunut kauman boyolangu campurdarat marmer kedungwaru sumbergempol gondang karangrejo sendang pagerwojo kalidawir pucanglaban tanggunggunung besuki pakel bandung" },
  { kota: "Kab. Trenggalek", prov: "Jawa Timur", zona: "Jawa Timur", ring: 2, alias: "durenan karangan panggul watulimo prigi gandusari pogalan tugu dongko pule kampak munjungan b силу bendungan suruh" },

  // Jawa Timur - Tapal Kuda & Timur
  { kota: "Kota Probolinggo", prov: "Jawa Timur", zona: "Jawa Timur", ring: 2, alias: "probolinggo kota bromo mayangan kanigaran kedopok wonoasih kedunggalar" },
  { kota: "Kab. Probolinggo", prov: "Jawa Timur", zona: "Jawa Timur", ring: 2, alias: "kraksaan paiton sukapura bromo dringu tongas leces gending banyuanyar maron besuk kotaanyar pakuniran krejengan pejarakan tegalsiwalan lumbang sumber kuripan wonomerto bantaran" },
  { kota: "Kab. Lumajang", prov: "Jawa Timur", zona: "Jawa Timur", ring: 2, alias: "semeru pasirian tempeh klakah yosowilangun senduro sukodono rowokangkung jatiroto randuagung kedungjajang gucialit padang pasrujambe candipuro pronojiwo tempursari kunir sumbersuko" },
  { kota: "Kab. Jember", prov: "Jawa Timur", zona: "Jawa Timur", ring: 2, alias: "kaliwates tanggul rambipuji balung ambulu kencong puger sukowono patrang sumbersari pakusari arjasa jelbuk wuluhan gumukmas jombang semboro sumberbaru bangsalsari panti sukorejo silo mayang mumbulsari tempurejo ajung lekok ledokombo kalisat sumberjambe" },
  { kota: "Kab. Bondowoso", prov: "Jawa Timur", zona: "Jawa Timur", ring: 2, alias: "ijen maesan tapen prajekan wringin tape tenggarang curahdami tegalampel grujugan taman krocok pujer tlogosari sukosari sumberwringin sempol cermee botolinggo binakal pakem jambesari" },
  { kota: "Kab. Situbondo", prov: "Jawa Timur", zona: "Jawa Timur", ring: 2, alias: "panarukan besuki asembagus banyuputih pasir putih kapongan panji mangaran arjasa jangkar suboh mlandingan sumbermalang banyuglugur jatibanteng bungatan kendit" },
  { kota: "Kab. Banyuwangi", prov: "Jawa Timur", zona: "Jawa Timur", ring: 2, alias: "ketapang rogojampi genteng kalibaru muncar glenmore cluring wongsorejo giri glagah kabat songgon singojuruh blimbingsari sempu gambiran tegalsari bangorejo purwoharjo tegaldlimo pesanggaran siliragung wangsorejo licin" },

  // Jawa Timur - Pulau Madura
  { kota: "Kab. Bangkalan", prov: "Jawa Timur", zona: "Jawa Timur (Madura)", ring: 2, alias: "suramadu kamal arosbaya blega burneh socah madura kwanyar labang tragah geger sepulu klampis tanjungbumi kokop konang modung tanahmerah" },
  { kota: "Kab. Sampang", prov: "Jawa Timur", zona: "Jawa Timur (Madura)", ring: 2, alias: "torjun jrengik ketapang camplong omben madura sreseh tambelangan banyuates robatal karangpenang kedungdung sokobanah pangarengan" },
  { kota: "Kab. Pamekasan", prov: "Jawa Timur", zona: "Jawa Timur (Madura)", ring: 2, alias: "tlanakan larangan pademawu waru pegantenan madura galis palengaan pakong kadur proppo batumarmar pasean" },
  { kota: "Kab. Sumenep", prov: "Jawa Timur", zona: "Jawa Timur (Madura)", ring: 2, alias: "kalianget saronggi lenteng gapura giligenting kangean madura manding batuan bluto pragaan gulukguluk gandig batangbatang dungkek dasuk rubaru ambunten pasongsongan sapeken masalembu arjasa nonggunong raas" },

  // ==========================================
  // 2. D.I. YOGYAKARTA (LENGKAP 5 KOTA/KAB)
  // ==========================================
  { kota: "Kota Yogyakarta", prov: "D.I. Yogyakarta", zona: "D.I. Yogyakarta", ring: 3, alias: "jogja malioboro gondomanan umbulharjo kotagede wirobrajan danurejan gedongtengen jetis kranon mantrijeron mergangsan ngampilan pakualaman tegalrejo kraton" },
  { kota: "Kab. Sleman", prov: "D.I. Yogyakarta", zona: "D.I. Yogyakarta", ring: 3, alias: "depok kaliurang mlati ngaglik godean prambanan cangkringan berbah kalasan gamping minggir moyudan ngemplak pakem seyegan tempel turi" },
  { kota: "Kab. Bantul", prov: "D.I. Yogyakarta", zona: "D.I. Yogyakarta", ring: 3, alias: "sewon kasihan parangtritis piyungan banguntapan imogiri bambanglipuro dlingo kretek pajangan pandak pleret pundong sanden sedayu sradakan" },
  { kota: "Kab. Kulon Progo", prov: "D.I. Yogyakarta", zona: "D.I. Yogyakarta", ring: 3, alias: "wates yia temon sentolo nanggulan galur kalibawang girimulyo kokap lendah panjatan samigaluh pengasih" },
  { kota: "Kab. Gunungkidul", prov: "D.I. Yogyakarta", zona: "D.I. Yogyakarta", ring: 3, alias: "wonosari playen semanu ponjong karangmojo tepus girisubo ngglipar ngawen paliyan panggang patuk purwosari rongkop saptosari semin tanjungsari" },

  // ==========================================
  // 3. JAWA TENGAH (LENGKAP 35 KOTA/KAB)
  // ==========================================
  { kota: "Kota Semarang", prov: "Jawa Tengah", zona: "Jawa Tengah", ring: 3, alias: "semarang kota simpang lima tembalang banyumanik ngaliyan gajahmungkur candisari genuk gunungpati pedurungan semarang barat timur selatan utara tengah tugu gayamsari" },
  { kota: "Kab. Semarang", prov: "Jawa Tengah", zona: "Jawa Tengah", ring: 3, alias: "ungaran ambarawa bawen bergas bandungan banyubiru tuntang bringin jumo kaliwungu pabelan pringapus sumowono suruh susukan tengaran banyumanik" },
  { kota: "Kota Salatiga", prov: "Jawa Tengah", zona: "Jawa Tengah", ring: 3, alias: "salatiga tingkir sidorejo argomulyo sidomukti" },
  { kota: "Kota Surakarta (Solo)", prov: "Jawa Tengah", zona: "Jawa Tengah", ring: 3, alias: "solo surakarta banjarsari jebres laweyan pasarkliwon serengan kraton mangkunegaran" },
  { kota: "Kab. Sukoharjo", prov: "Jawa Tengah", zona: "Jawa Tengah", ring: 3, alias: "kartasura solo baru grogol mojolaban baki tawangsari bendosari bulu nguter polokarto sukoharjo" },
  { kota: "Kab. Klaten", prov: "Jawa Tengah", zona: "Jawa Tengah", ring: 3, alias: "delanggu prambanan ceper pedan jatinom polanharjo tulung cawas bayat gantiwarno juwiring kalikotes karanganom karangdowo karangnongko kebonarum kemalang klaten ngawen trucuk wedik wonosari" },
  { kota: "Kab. Boyolali", prov: "Jawa Tengah", zona: "Jawa Tengah", ring: 3, alias: "mojosongo ampel teras banyudono sawit simo sambi andong selo cepogo juwangi karanggede klego musuk ngemplak nogosari wonosegoro gladagsari tamansari" },
  { kota: "Kab. Karanganyar", prov: "Jawa Tengah", zona: "Jawa Tengah", ring: 3, alias: "colomadu palur tawangmangu jaten gondangrejo tasikmadu kebakkramat jatipuro jatiyoso jumapolo jumantono karangpandan kerjo matesih mtesih ngargoyoso jenawi" },
  { kota: "Kab. Sragen", prov: "Jawa Tengah", zona: "Jawa Tengah", ring: 3, alias: "gemolong masaran gondang sambungmacan tangen kalijambe fontes mondokan ngranget plupuh sambirejo sidoharjo sragen sukodono sumberlawang tanon kedawung gesi jenar" },
  { kota: "Kab. Wonogiri", prov: "Jawa Tengah", zona: "Jawa Tengah", ring: 3, alias: "baturetno giritontro pracimantoro purwantoro selogiri wuryantoro bulukerto eromoko giriwoyo jatipurno jatisrono karangtengah kismantoro manyaran ngadirojo nguntoronadi paranggupito pitu sidoharjo s協力 tirtomoyo" },
  { kota: "Kota Magelang", prov: "Jawa Tengah", zona: "Jawa Tengah", ring: 3, alias: "magelang kota tidar jurangombo magelang tengah selatan utara" },
  { kota: "Kab. Magelang", prov: "Jawa Tengah", zona: "Jawa Tengah", ring: 3, alias: "muntilan borobudur mertoyudan salam secang sawangan grabag bandongan candimulyo d記憶 kaliangkrik kajoran ngablak ngluwar pakis salam srumbung tegalrejo tempuran windusari" },
  { kota: "Kab. Temanggung", prov: "Jawa Tengah", zona: "Jawa Tengah", ring: 3, alias: "parakan ngadirejo kandangan bulu kedu kranggan kaloran jumo bansari bejen candiroto gemawang kledung pringsurat selopampang tembarak tlogomulyo tretep wonoboyo" },
  { kota: "Kab. Purworejo", prov: "Jawa Tengah", zona: "Jawa Tengah", ring: 3, alias: "kutoarjo bener kemiri grabag loano pituruh bagelen banyuurip butuh kaligesing gebang ngombol purwodadi purworejo" },
  { kota: "Kab. Kebumen", prov: "Jawa Tengah", zona: "Jawa Tengah", ring: 3, alias: "gombong karanganyar kutowinangun prembun petanahan klirong ayah adimulyo alian ambal buluspesantren buayan bonorowo karanggayam karangsambung kuwarasan mirit padureso pejagoan puring rowokele sadang sruweng" },
  { kota: "Kab. Wonosobo", prov: "Jawa Tengah", zona: "Jawa Tengah", ring: 3, alias: "dieng kertek garung kalikajar mojotengah watumalang selomerto kepil kaliwiro leksono sukoharjo wadaslintang kejajar kalibawang sapuran" },
  { kota: "Kab. Banjarnegara", prov: "Jawa Tengah", zona: "Jawa Tengah", ring: 3, alias: "batur dieng purwanegara klampok mandiraja wanadadi karangkobar banjarmangu bawang kalibening madukara pagedongan pejawaran punggelan purworejo klampok rakit sigaluh susukan wanayasa pandanarum" },
  { kota: "Kab. Purbalingga", prov: "Jawa Tengah", zona: "Jawa Tengah", ring: 3, alias: "bobotsari padamara kalimanah rembang bojongsari bukateja kaligondang karanganyar karangmoncol karangreja karangjambu kejobong kemangkon kutasari mrebet pengadegan purbalingga" },
  { kota: "Kab. Banyumas (Purwokerto)", prov: "Jawa Tengah", zona: "Jawa Tengah", ring: 3, alias: "purwokerto sokaraja baturraden ajibarang wangon sumpiuh banyumas rawalo cilongok gumelar jatilawang kalibagor karanglewas kebansen kembaran kemranjen lumbir patikraja pekuncen purwojati somagede sumbang tambak" },
  { kota: "Kab. Cilacap", prov: "Jawa Tengah", zona: "Jawa Tengah", ring: 3, alias: "kroya majenang sidareja cilacap tengah karangpucung gandrungmangu sampang adipala bantarsari binangun cilacap selatan utara cipari dayeuhluhur jeruklegi kesugihan kedungreja maos nusawungu patimuan wanareja" },
  { kota: "Kota Pekalongan", prov: "Jawa Tengah", zona: "Jawa Tengah", ring: 3, alias: "pekalongan kota batik krapyak tirto pekalongan barat timur selatan utara" },
  { kota: "Kab. Pekalongan", prov: "Jawa Tengah", zona: "Jawa Tengah", ring: 3, alias: "kajen wiradesa kedungwuni doro paninggaran kesesi sragi buaran bojong karanganyar karangdadap lebakbarang petungkriyono siwalan talun tirto wonokerto wonopringgo" },
  { kota: "Kab. Batang", prov: "Jawa Tengah", zona: "Jawa Tengah", ring: 3, alias: "limpung gringsing bandar subah warungasem kandeman banyuputih batang bawan blado pesantenan reban terban tersono wonotunggal" },
  { kota: "Kab. Pemalang", prov: "Jawa Tengah", zona: "Jawa Tengah", ring: 3, alias: "comal petarukan bantarbolang moga randudongkal ulujami taman warungpring ampalgading belik bodeh pemalang puspahiang watukumpul" },
  { kota: "Kota Tegal", prov: "Jawa Tengah", zona: "Jawa Tengah", ring: 3, alias: "tegal kota kaligangsa margadana tegal barat timur selatan" },
  { kota: "Kab. Tegal", prov: "Jawa Tengah", zona: "Jawa Tengah", ring: 3, alias: "slawi adiwerna dukuhturi tarub lebaksiu pangkah bumijawa bojong guci balapulang dukuhturi jatinegara kedungbanteng kramat margasari pagerbarang suradadi talang warureja" },
  { kota: "Kab. Brebes", prov: "Jawa Tengah", zona: "Jawa Tengah", ring: 3, alias: "bumiayu ketanggungan tanjung jatibarang bulakamba wanasari banjarharjo bantarkawung brebes kersana larangan losari paguyangan salem sirampog songgom tonjong" },
  { kota: "Kab. Kendal", prov: "Jawa Tengah", zona: "Jawa Tengah", ring: 3, alias: "weleri kaliwungu bojong cepiring sukorejo pegandon patebon limbangan brangsong kangkung kendal kota ngampel pagerruyung patean plantungan ringinarum rowosari singorojo" },
  { kota: "Kab. Demak", prov: "Jawa Tengah", zona: "Jawa Tengah", ring: 3, alias: "sayung mranggen karanganyar gajah bonang wedung mijen wonosalam demak dempet guntur karangawen karangtengah kebonagung" },
  { kota: "Kab. Kudus", prov: "Jawa Tengah", zona: "Jawa Tengah", ring: 3, alias: "jati gebog bae dawe kaliwungu mejobo jekulo undaan kudus kota kretek" },
  { kota: "Kab. Jepara", prov: "Jawa Tengah", zona: "Jawa Tengah", ring: 3, alias: "tahunan mlonggo bangsri pecangaan mayong kedung welahan karimunjawa batealit donorojo jepara kalinyamatan kembang pakisaji nalumsari sambinyamatan" },
  { kota: "Kab. Pati", prov: "Jawa Tengah", zona: "Jawa Tengah", ring: 3, alias: "juwana tayu wedarijaksa batangan kayen sukolilo trangkil margorejo tlogowungu batangan cluwak dukuhseti gabus gembong gunungwungkal jaken jakenan margoyoso pati pucakwangi tambakromo winong" },
  { kota: "Kab. Rembang", prov: "Jawa Tengah", zona: "Jawa Tengah", ring: 3, alias: "lasem kragan sarang sulang pamotan kaliori sumber sale gunem pancur rembang sedam sluke" },
  { kota: "Kab. Blora", prov: "Jawa Tengah", zona: "Jawa Tengah", ring: 3, alias: "cepu kunduran ngawen randublatung jiken jepon todanan kedungtuban banjarejo blora bogorejo japah jati jatiroto kradenan sambong" },
  { kota: "Kab. Grobogan (Purwodadi)", prov: "Jawa Tengah", zona: "Jawa Tengah", ring: 3, alias: "purwodadi gubug wirosari godong tegowanu karangrayung toroh pulokulon brati geyer grobogan kedungjati klambu kradenan ngaringan panunggalan tanggungharjo tawangharjo" },

  // ==========================================
  // 4. DKI JAKARTA (LENGKAP 6 WILAYAH)
  // ==========================================
  { kota: "Jakarta Pusat", prov: "DKI Jakarta", zona: "DKI Jakarta & Sekitarnya", ring: 4, alias: "jakpus menteng gambir cempaka putih tanah abang kemayoran senen johar baru sawah besar monas sudirman thamrin" },
  { kota: "Jakarta Selatan", prov: "DKI Jakarta", zona: "DKI Jakarta & Sekitarnya", ring: 4, alias: "jaksel tebet kebayoran baru lama cilandak pasar minggu pancoran jagakarsa mampang setiabudi pesanggrahan kuningan blok m fatmawati kalibata pejaten" },
  { kota: "Jakarta Timur", prov: "DKI Jakarta", zona: "DKI Jakarta & Sekitarnya", ring: 4, alias: "jaktim rawamangun pulogadung jatinegara duren sawit kramat jati makasar ciracas cipayung pasar rebo matraman cakung halim cawang pulogebang" },
  { kota: "Jakarta Barat", prov: "DKI Jakarta", zona: "DKI Jakarta & Sekitarnya", ring: 4, alias: "jakbar grogol petamburan cengkareng kebon jeruk palmerah kembangan tambora taman sari kalideres slipi puri tomang glodok" },
  { kota: "Jakarta Utara", prov: "DKI Jakarta", zona: "DKI Jakarta & Sekitarnya", ring: 4, alias: "jakut kelapa gading pluit tanjung priok koja pademangan cilincing penjaringan ancol pantai indah kapuk pik sunter" },
  { kota: "Kab. Kepulauan Seribu", prov: "DKI Jakarta", zona: "DKI Jakarta & Sekitarnya", ring: 4, alias: "pulau seribu pramuka pari tidung untung jawa harapan panggang kelapa" },

  // ==========================================
  // 5. BANTEN (LENGKAP 8 KOTA/KAB)
  // ==========================================
  { kota: "Kota Tangerang", prov: "Banten", zona: "Banten & Sekitarnya", ring: 4, alias: "ciledug cipondoh batusari periuk karawaci pinang larangan cibodas batuceper benda jatiuwung neglasari tangerang kota soekarno hatta airport" },
  { kota: "Kota Tangerang Selatan (Tangsel)", prov: "Banten", zona: "Banten & Sekitarnya", ring: 4, alias: "tangsel bsd bintaro serpong pamulang ciputat pondok aren setu serpong utara alam sutera" },
  { kota: "Kab. Tangerang", prov: "Banten", zona: "Banten & Sekitarnya", ring: 4, alias: "cikupa balaraja pasar kemis tigaraksa curug legok kelapa dua teluknaga kosambi sepatan cisauk kronjo kresek mauk pagedangan pakuhaji panongan solear sukamulya" },
  { kota: "Kota Serang", prov: "Banten", zona: "Banten & Sekitarnya", ring: 4, alias: "serang cipocok jaya curug kasemen taktakan walantaka serang kota banten lama" },
  { kota: "Kab. Serang", prov: "Banten", zona: "Banten & Sekitarnya", ring: 4, alias: "kramatwatu ciruas cikande kragilan anyer baros petir pontang tirtayasa padarincang bojonegara cinangka ciomas jawilan kibin mancak pabuaran tanara tunjung teja waringinkurung" },
  { kota: "Kota Cilegon", prov: "Banten", zona: "Banten & Sekitarnya", ring: 4, alias: "merak ciwandan cibeber pulomerak jombang gerogol citangkil purwakarta cilegon krakatau steel" },
  { kota: "Kab. Lebak (Rangkasbitung)", prov: "Banten", zona: "Banten & Sekitarnya", ring: 4, alias: "rangkasbitung bayah maja cipanas sajira gunungkencana warunggunung malingping cibadak banjarsari cibeber cigemblong cihara cijaku cikulur cileles cilograng curugbitung kalanganyar lebakgedong lewidamar panggarangan sobang wanareja" },
  { kota: "Kab. Pandeglang", prov: "Banten", zona: "Banten & Sekitarnya", ring: 4, alias: "labuan carita menes panimbang cikupa sobang ujung kulon munjul bojong saketi angsana banjar cadasari cibaliung cibitung cigeulis cikedal cikeusik cimanggu cimanuk cipeucang cisata jiput keduhejo koroncong majasari mekarjaya pagelaran pandeglang patia picung pulosari sumur sukaresmi" },

  // ==========================================
  // 6. JAWA BARAT (LENGKAP 27 KOTA/KAB)
  // ==========================================
  { kota: "Kota Bandung", prov: "Jawa Barat", zona: "Jawa Barat", ring: 4, alias: "bandung buahbatu coblong sukajadi cicendo regol batununggal kiaracondong andir pasteur antapani arcamanik babakanciparay bandung kidul kulon wetan cibiru cidadap cinambo gegerkalong rancasari sumur bandung ujungberung" },
  { kota: "Kab. Bandung", prov: "Jawa Barat", zona: "Jawa Barat", ring: 4, alias: "soreang ciwidey baleendah dayeuhkolot bojongsoang cileunyi rancaekek katapang banjaran margahayu pacet ibun arjasari cicalengka cikancung cilengkrang cimenyan cangkuang ciwidey kutawaringin majalaya manggunggang margaasih nagreg pangalengan paseh pasirjambu rancabali solokanjeruk" },
  { kota: "Kab. Bandung Barat", prov: "Jawa Barat", zona: "Jawa Barat", ring: 4, alias: "ngamprah padalarang lembang parongpong cisarua batujajar cililin cipatat cikalongwetan cihampelas cihampelas cipongkor gunung halu rongga saguling sindangkerta" },
  { kota: "Kota Cimahi", prov: "Jawa Barat", zona: "Jawa Barat", ring: 4, alias: "cimahi utara tengah selatan leuwigajah cibeber baros padasuka cigugur tengah" },
  { kota: "Kota Depok", prov: "Jawa Barat", zona: "Jawa Barat", ring: 4, alias: "depok margonda cinere sawangan cimanggis sukmajaya beji pancoran mas tapos bojongsari cilodong cipayung ui gunadarma" },
  { kota: "Kota Bogor", prov: "Jawa Barat", zona: "Jawa Barat", ring: 4, alias: "bogor kota baranangsiang pajajaran tajur tanah sareal bogor barat timur selatan utara tengah ipb botani" },
  { kota: "Kab. Bogor", prov: "Jawa Barat", zona: "Jawa Barat", ring: 4, alias: "cibinong sentul puncak ciawi cileungsi gunung putri parung jonggol babakan madang dramaga bojonggede citayam cigombong caringin leuwiliang ciomas ciampea cigudeg ciseeng gunungsindur jasinga megamendung nanggung pamijahan rumpin sukajaya sukaraja sukamakmur tajurhalang tamansari tanjungsari tenjo tenjolaya" },
  { kota: "Kota Bekasi", prov: "Jawa Barat", zona: "Jawa Barat", ring: 4, alias: "bekasi barat timur selatan utara pondok gede jatisampurna medan satria bantar gebang rawalumbu mustikajaya jatiasih summarecon galaxy caman pondok melati" },
  { kota: "Kab. Bekasi", prov: "Jawa Barat", zona: "Jawa Barat", ring: 4, alias: "cikarang cibitung tambun jababeka lippo cikarang babelan setu tarumajaya serang baru sukaresmi karangbahagia bojongmangu cabangbungin cibarusah kedungwaringin muaragembong pebayuran sukakarya sukatani sukawangi tambelang tambun selatan utara" },
  { kota: "Kab. Karawang", prov: "Jawa Barat", zona: "Jawa Barat", ring: 4, alias: "karawang barat timur klari cikampek rengasdengklok telukjambe cibalongsari purwasari majalaya kutawaluya banyusari batujaya ciampel cilamaya jatisari jayakerta lemahabang pakisjaya pangkalan rawamerta tempuran tirtojaya" },
  { kota: "Kab. Purwakarta", prov: "Jawa Barat", zona: "Jawa Barat", ring: 4, alias: "purwakarta jatiluhur plered campaka pasawahan bungursari sukatani darangdan babakancikao bojong cibatu kiarapedes maniis pondoksalam sukasari tegalwaru" },
  { kota: "Kab. Subang", prov: "Jawa Barat", zona: "Jawa Barat", ring: 4, alias: "subang kalijati pamanukan ciater pagaden jalancagak purwadadi patokbeusi cipunagara tanjungsiang binong blanakan ciasem cikaum cibogo cijambe cipeundeuy compreng kasomalang legonkulon pabuaran pusakajaya pusakanagara sagalaherang serangpanjang sukasari tambakdahan" },
  { kota: "Kota Sukabumi", prov: "Jawa Barat", zona: "Jawa Barat", ring: 4, alias: "sukabumi cikole citamiang warudoyong baros gunungpuyuh cibeureum lembursitu" },
  { kota: "Kab. Sukabumi", prov: "Jawa Barat", zona: "Jawa Barat", ring: 4, alias: "palabuhanratu cibadak cicurug cisaat surade jampang cicantayan bojonggenteng parungkuda sukalarang bantargadung caringin ciambar cibitung cidadap cidahu cidolog cijambe cikakak cikembar cikidang ciracap cireunghas curugkembar gegerbitung gunungguruh kabandungan kadudampit kalapanunggal kalibunder kebonpedes lengkong nagrak nyalindung pabuaran parakansalak purabaya sagaranten simpenan sukabumi sukaraja tegalbuleud waluran warungkiara" },
  { kota: "Kab. Cianjur", prov: "Jawa Barat", zona: "Jawa Barat", ring: 4, alias: "cianjur cipanas pacet cikalongkulon ciranjang cibeber sukaresmi karangtengah warungkondang kadupandak agrabinta bojongpicung campaka campakamulya cidaun cijati cikadu cikancana gekbrong haurpanggang leles mande naringgul pagelaran pasirkuda sindangbarang sukanagara sukaluyu takokak tanggeung" },
  { kota: "Kota Cirebon", prov: "Jawa Barat", zona: "Jawa Barat", ring: 4, alias: "cirebon kejaksan kesambi lemahwungkuk harjamukti pekalipan grage kasepuhan kanoman" },
  { kota: "Kab. Cirebon", prov: "Jawa Barat", zona: "Jawa Barat", ring: 4, alias: "sumber plered weru kedawung arjawinangun palimanan losari astanajapura ciledug gegesik klangenan mundu babakan beber ciwaringin depok dukupuntang gunungjati gebang jamblang kapetakan karangsembung karangwareng kaliwedi lemahabang pabuaran pangenan panguragan pasaleman plumbon sedong susukan tengah tani waled" },
  { kota: "Kab. Indramayu", prov: "Jawa Barat", zona: "Jawa Barat", ring: 4, alias: "indramayu jatibarang haurgeulis kandanghaur patrol karangampel losarang sindang anjatan bongas krangkeng arahan balongan cantigi cikedung gantar gabuswetan juntinyuat kedokanbunder kertasemaya kroya lelea lohbener pasekan sukagumiwang su Krajan terisi tukdana widasari" },
  { kota: "Kab. Majalengka", prov: "Jawa Barat", zona: "Jawa Barat", ring: 4, alias: "majalengka kertajati kadipaten jatiwangi rajagaluh cigasong talaga cikijing bantarujeg sukahaji argapura banjaran cingambul kasokandel lewimunding lewihdatang maja malausma panyingkiran palasah sindang sindangwangi sumberjaya" },
  { kota: "Kab. Kuningan", prov: "Jawa Barat", zona: "Jawa Barat", ring: 4, alias: "kuningan cilimus cigugur jalaksana kadugede luragung ciawigebang darma lebakwangi mandirancan cibeureum cibingbin cidahu cigandamekar cilebak ciwaru garamwangi hantara japara kalimanggis karangkancana maleber nusaherang pancalang pasirjambu selajambe sindangagung subang" },
  { kota: "Kota Tasikmalaya", prov: "Jawa Barat", zona: "Jawa Barat", ring: 4, alias: "tasikmalaya cihideung tawang cipedes indihiang kawalu mangkubumi tamansari bungursari purbaratu cibeureum" },
  { kota: "Kab. Tasikmalaya", prov: "Jawa Barat", zona: "Jawa Barat", ring: 4, alias: "singaparna ciawi rajapolah manonjaya cikatomas karangnunggal cipatujah leuwisari salawu taraju bantarkalong bojongasih bojonggambir cibalong cigalontang cikalong cineam culamega gunungtanjung jamanis jatisari kadipaten karangjaya mangunreja padakembang pagerageung parungponteng puspahiang sariwangi sodonghilir sukahening sukaraja sukarame sukaratu sukaratu tanjungjaya" },
  { kota: "Kab. Ciamis", prov: "Jawa Barat", zona: "Jawa Barat", ring: 4, alias: "ciamis kawali rancah panjalu cikoneng banjarsari sindangkasih baregbeg cisaga pamarican banjaranyar cihaurbeuti cijeungjing cimaragas cipaku cidolog culumbar jatinagara lumbung panawangan panumbangan purwadadi rajadesa sadananya sukamantri tambaksari" },
  { kota: "Kota Banjar", prov: "Jawa Barat", zona: "Jawa Barat", ring: 4, alias: "banjar patroman purwaharja langensari pataruman" },
  { kota: "Kab. Pangandaran", prov: "Jawa Barat", zona: "Jawa Barat", ring: 4, alias: "pangandaran parigi cijulang kalipucang cigugur mangunjaya padaherang sidamulih cimerak langkaplancar batukaras green canyon" },
  { kota: "Kab. Garut", prov: "Jawa Barat", zona: "Jawa Barat", ring: 4, alias: "garut kota tarogong kaler kidul kadungora leles karangpawitan cibatu cilawu cisurupan pameungpeuk bayongbong samarang balubur limbangan banjarwangi banyuresmi bungbulang caringin cikajang cikelet cibiuk cigedug cihurip cikemat cimanuk cisewu cisompet karangtengah kersamanah malangbong mekarmukti pakenjeng pamulihan pangatikan pasirwangi peundeuy ranca buaya selawi singajaya sucinaraja sukamantri talegong" },
  { kota: "Kab. Sumedang", prov: "Jawa Barat", zona: "Jawa Barat", ring: 4, alias: "sumedang jatinangor tanjungsari cimalaka paseh darmaraja tomo situraja ujungjaya ranca kalong jatinunggal buahdua cibugel cisitu conggeang ganeas jatigede pamulihan rancakalong sukasari surian tanjunkerta tanjungmedar" },

  // ==========================================
  // 7. BALI & NUSA TENGGARA
  // ==========================================
  { kota: "Kota Denpasar", prov: "Bali", zona: "Bali & Nusa Tenggara", ring: 5, alias: "denpasar sanur kuta ubud badung bali" },
  { kota: "Kab. Badung", prov: "Bali", zona: "Bali & Nusa Tenggara", ring: 5, alias: "kuta seminyak canggu jimbaran nusa dua ngurah rai bali" },
  { kota: "Kab. Gianyar", prov: "Bali", zona: "Bali & Nusa Tenggara", ring: 5, alias: "ubud sukawati tegallalang gianyar bali" },
  { kota: "Kab. Tabanan / Buleleng / Bali Lainnya", prov: "Bali", zona: "Bali & Nusa Tenggara", ring: 5, alias: "singaraja tabanan klungkung bangli karangasem jembrana gilimanuk negara bali" },
  { kota: "Kota Mataram & Kab. Lombok (NTB)", prov: "NTB", zona: "Bali & Nusa Tenggara", ring: 5, alias: "mataram lombok barat tengah timur senggigi ntb mandalika kuta lombok" },
  { kota: "Sumbawa & Bima (NTB)", prov: "NTB", zona: "Bali & Nusa Tenggara", ring: 5, alias: "sumbawa besar dompu bima ntb taliwang tambora" },
  { kota: "Kota Kupang & Flores / Sumba (NTT)", prov: "NTT", zona: "Bali & Nusa Tenggara", ring: 6, alias: "kupang labuan bajo ende maumere ruteng waingapu ntt alor bajawa" },

  // ==========================================
  // 8. SUMATERA
  // ==========================================
  { kota: "Kota Bandar Lampung & Lampung Selatan", prov: "Lampung", zona: "Sumatera", ring: 5, alias: "lampung bandar lampung natar bakauheni metro kalianda pringsewu tulang bawang" },
  { kota: "Kota Palembang & Sekitarnya (Sumsel)", prov: "Sumatera Selatan", zona: "Sumatera", ring: 5, alias: "palembang banyuasin musi ogan ilir prabumulih lubuklinggau sumsel ampera jakabaring" },
  { kota: "Kota Padang & Bukittinggi (Sumbar)", prov: "Sumatera Barat", zona: "Sumatera", ring: 5, alias: "padang bukittinggi pariaman payakumbuh solok sumbar agam padang panjang" },
  { kota: "Kota Pekanbaru & Dumai (Riau)", prov: "Riau", zona: "Sumatera", ring: 5, alias: "pekanbaru dumai kampar siak riau bengkalis rokan hilir hulu" },
  { kota: "Kota Batam & Tanjung Pinang (Kep. Riau)", prov: "Kepulauan Riau", zona: "Sumatera", ring: 5, alias: "batam nagoya bintan tanjungpinang kepri karimun nongsa batu aji" },
  { kota: "Kota Jambi / Bengkulu", prov: "Jambi & Bengkulu", zona: "Sumatera", ring: 5, alias: "jambi bengkulu muaro jambi rejang lebong curup bungobungo sarolangun" },
  { kota: "Kota Medan & Deli Serdang (Sumut)", prov: "Sumatera Utara", zona: "Sumatera", ring: 5, alias: "medan deli serdang binjai tebing tinggi pematang siantar sumut kualanamu karo berastagi" },
  { kota: "Kota Banda Aceh & Sekitarnya", prov: "Aceh", zona: "Sumatera", ring: 6, alias: "aceh banda aceh aceh besar lhokseumawe langsa meulaboh sabang bireuen" },

  // ==========================================
  // 9. KALIMANTAN
  // ==========================================
  { kota: "Kota Banjarmasin & Banjarbaru (Kalsel)", prov: "Kalimantan Selatan", zona: "Kalimantan", ring: 5, alias: "banjarmasin banjarbaru martapura kalsel barito kuala tanah laut" },
  { kota: "Kota Balikpapan & Samarinda (Kaltim)", prov: "Kalimantan Timur", zona: "Kalimantan", ring: 5, alias: "balikpapan samarinda ikn tenggarong bontang kaltim kutai kartanegara sangatta penajam" },
  { kota: "Kota Pontianak & Sekitarnya (Kalbar)", prov: "Kalimantan Barat", zona: "Kalimantan", ring: 5, alias: "pontianak kubu raya singkawang kalbar sambas ketapang sintang" },
  { kota: "Kota Palangkaraya (Kalteng)", prov: "Kalimantan Tengah", zona: "Kalimantan", ring: 5, alias: "palangkaraya sampit kotawaringin kapuas kalteng pangkalan bun katingan" },
  { kota: "Kota Tarakan & Kaltara", prov: "Kalimantan Utara", zona: "Kalimantan", ring: 6, alias: "tarakan tanjung selor nunukan kaltara malinau tana tidung" },

  // ==========================================
  // 10. SULAWESI
  // ==========================================
  { kota: "Kota Makassar, Gowa & Maros (Sulsel)", prov: "Sulawesi Selatan", zona: "Sulawesi", ring: 5, alias: "makassar gowa maros sungguminasa daya tamalanrea sulsel panakkukang bontoala bantaeng parepare palopo bone bulukumba" },
  { kota: "Kota Manado & Bitung (Sulut)", prov: "Sulawesi Utara", zona: "Sulawesi", ring: 6, alias: "manado bitung tomohon minahasa sulut bunaken kotamobagu" },
  { kota: "Kota Palu, Kendari & Gorontalo", prov: "Sulawesi Tengah/Tenggara/Gorontalo", zona: "Sulawesi", ring: 6, alias: "palu kendari gorontalo mamuju sulteng sultra sulbar donggala kolaka bau-bau luwuk" },

  // ==========================================
  // 11. MALUKU & PAPUA
  // ==========================================
  { kota: "Kota Ambon & Ternate (Maluku)", prov: "Maluku", zona: "Maluku & Papua", ring: 6, alias: "ambon ternate tidore maluku utara seram buru halmahera banda" },
  { kota: "Kota Jayapura, Sorong & Timika (Papua)", prov: "Papua", zona: "Maluku & Papua", ring: 6, alias: "jayapura sentani sorong manokwari timika merauke papua barat daya biak nabire fakfak" },

  // ==========================================
  // 12. OPSI WILAYAH LAINNYA
  // ==========================================
  { kota: "Wilayah Lainnya di Seluruh Pulau Jawa", prov: "Jawa", zona: "Opsi Wilayah Lainnya", ring: 4, alias: "lainnya jawa sekitarnya pelengkap" },
  { kota: "Wilayah Lainnya di Luar Pulau Jawa", prov: "Luar Jawa", zona: "Opsi Wilayah Lainnya", ring: 6, alias: "lainnya luar jawa sekitarnya indonesia nusantara" }
];

// Helper kalkulasi tarif ongkir cerdas dan aman berdasarkan titik asal pengiriman penjual
function hitungTarifOngkirWilayah(originCity, item) {
  const origin = (originCity || "Surabaya").toLowerCase().trim();
  const destKota = item.kota.toLowerCase();
  const destProv = item.prov;

  // 1. Jika kota asal sama persis dengan tujuan (Satu Kota)
  const cleanKotaName = destKota.replace(/^(kota|kab\.)\s+/i, '').trim();
  if (origin.includes(cleanKotaName) || destKota.includes(origin)) {
    return 12000;
  }

  // 2. Asal Kirim dari Jawa Timur (Titik Utama Official Teater Q: Surabaya / Sidoarjo / Madura)
  const isOriginJatim = origin.includes("surabaya") || origin.includes("sidoarjo") || origin.includes("gresik") ||
                        origin.includes("malang") || origin.includes("mojokerto") || origin.includes("pasuruan") ||
                        origin.includes("pamekasan") || origin.includes("sumenep") || origin.includes("bangkalan") ||
                        origin.includes("sampang") || origin.includes("madura") || origin.includes("kediri") ||
                        origin.includes("jember") || origin.includes("blitar") || origin.includes("bojonegoro") ||
                        origin.includes("tuban") || origin.includes("lamongan") || origin.includes("ngawi");

  if (isOriginJatim) {
    if (destProv === "Jawa Timur") {
      // Surabaya & Sidoarjo
      if (destKota.includes("surabaya") || destKota.includes("sidoarjo")) return 15000;
      // Ring 1
      if (destKota.includes("gresik") || destKota.includes("mojokerto") || destKota.includes("pasuruan") || destKota.includes("malang") || destKota.includes("batu")) return 18000;
      // Seluruh 38 Kota/Kabupaten Jawa Timur Lainnya
      return 20000;
    }
    if (destProv === "D.I. Yogyakarta" || destProv === "Jawa Tengah") return 22000;
    if (destProv === "DKI Jakarta" || destProv === "Banten" || destProv === "Jawa Barat") return 25000;
    if (destProv === "Bali" || destProv === "NTB") return 32000;
    if (destProv === "NTT") return 50000;
    if (destProv.includes("Sumatera") || destProv === "Lampung" || destProv === "Riau" || destProv === "Aceh" || destProv === "Kepulauan Riau") return 42000;
    if (destProv.includes("Kalimantan") || destProv.includes("Kalsel") || destProv.includes("Kaltim") || destProv.includes("Kalbar") || destProv.includes("Kalteng") || destProv.includes("Kaltara")) return 48000;
    if (destProv.includes("Sulawesi")) return 52000;
    if (destProv === "Maluku") return 85000;
    if (destProv === "Papua") return 95000;
    if (item.ring === 4) return 25000;
    if (item.ring === 6) return 65000;
    return 25000;
  }

  // 3. Asal Kirim dari Jabodetabek / Jawa Barat / Banten
  const isOriginBarat = origin.includes("jakarta") || origin.includes("depok") || origin.includes("bogor") ||
                        origin.includes("tangerang") || origin.includes("bekasi") || origin.includes("bandung") ||
                        origin.includes("cirebon") || origin.includes("banten") || origin.includes("serang") ||
                        origin.includes("karawang") || origin.includes("sukabumi") || origin.includes("tasikmalaya");
  if (isOriginBarat) {
    if (destProv === "DKI Jakarta" || destKota.includes("depok") || destKota.includes("bekasi") || destKota.includes("tangerang") || destKota.includes("bogor")) return 15000;
    if (destProv === "Jawa Barat" || destProv === "Banten") return 18000;
    if (destProv === "D.I. Yogyakarta" || destProv === "Jawa Tengah") return 22000;
    if (destProv === "Jawa Timur") return 25000;
    if (destProv === "Bali" || destProv === "NTB") return 35000;
    if (destProv.includes("Sumatera")) return 38000;
    if (destProv.includes("Kalimantan")) return 48000;
    if (destProv.includes("Sulawesi")) return 52000;
    if (destProv === "Maluku" || destProv === "Papua") return 90000;
    return 25000;
  }

  // 4. Asal Kirim dari Jawa Tengah & D.I. Yogyakarta
  const isOriginTengah = origin.includes("jogja") || origin.includes("yogyakarta") || origin.includes("solo") ||
                         origin.includes("surakarta") || origin.includes("semarang") || origin.includes("magelang") ||
                         origin.includes("salatiga") || origin.includes("kudus") || origin.includes("banyumas");
  if (isOriginTengah) {
    if (destProv === "D.I. Yogyakarta" || destProv === "Jawa Tengah") return 18000;
    if (destProv === "Jawa Timur") return 20000;
    if (destProv === "DKI Jakarta" || destProv === "Banten" || destProv === "Jawa Barat") return 22000;
    if (destProv === "Bali" || destProv === "NTB") return 35000;
    if (destProv.includes("Sumatera")) return 42000;
    if (destProv.includes("Kalimantan")) return 48000;
    if (destProv.includes("Sulawesi")) return 52000;
    return 25000;
  }

  // 5. Fallback Aman
  if (destProv === "Jawa Timur") return 20000;
  if (destProv === "Jawa Tengah" || destProv === "D.I. Yogyakarta") return 22000;
  if (destProv === "Jawa Barat" || destProv === "DKI Jakarta" || destProv === "Banten") return 25000;
  return 35000;
}

function populateCheckoutCityDropdown(originCity) {
  const selectEl = document.getElementById("checkoutKotaSelect");
  if (!selectEl) return;

  const origin = (originCity || "Surabaya").trim();
  const labelAsal = document.getElementById("labelAsalPengiriman");
  if (labelAsal) labelAsal.textContent = origin;

  // Reset dropdown opsi kota tujuan
  selectEl.innerHTML = `<option value="">-- Pilih Kota / Kabupaten Tujuan --</option>`;

  const grouped = {};
  function addItem(zona, kota, tarif, alias) {
    if (!grouped[zona]) grouped[zona] = [];
    grouped[zona].push({ kota, tarif, alias: alias || "" });
  }

  // Petakan seluruh kota & kabupaten lengkap
  DAFTAR_WILAYAH_LENGKAP.forEach(item => {
    const tarif = hitungTarifOngkirWilayah(origin, item);
    let zonaLabel = "";

    if (item.prov === "Jawa Timur") {
      if (item.kota.includes("Surabaya") || item.kota.includes("Sidoarjo")) {
        zonaLabel = "Jawa Timur (Surabaya & Sidoarjo - Lokal)";
      } else if (item.zona.includes("Madura")) {
        zonaLabel = "Jawa Timur (Pulau Madura Lengkap)";
      } else {
        zonaLabel = "Jawa Timur (Seluruh Kabupaten & Kota Lengkap)";
      }
    } else if (item.prov === "D.I. Yogyakarta") {
      zonaLabel = "D.I. Yogyakarta (Lengkap)";
    } else if (item.prov === "Jawa Tengah") {
      zonaLabel = "Jawa Tengah (Seluruh Kabupaten & Kota Lengkap)";
    } else if (item.prov === "DKI Jakarta") {
      zonaLabel = "DKI Jakarta (Seluruh Wilayah)";
    } else if (item.prov === "Banten") {
      zonaLabel = "Banten (Seluruh Kabupaten & Kota Lengkap)";
    } else if (item.prov === "Jawa Barat") {
      zonaLabel = "Jawa Barat (Seluruh Kabupaten & Kota Lengkap)";
    } else {
      zonaLabel = item.zona || "Luar Pulau Jawa";
    }

    addItem(zonaLabel, item.kota, tarif, item.alias);
  });

  // 1. Render ke select element (hidden / accessibility)
  Object.keys(grouped).forEach(zona => {
    const optgroup = document.createElement("optgroup");
    optgroup.label = `📍 ${zona}`;
    grouped[zona].forEach(item => {
      const opt = document.createElement("option");
      opt.value = item.tarif;
      opt.dataset.kota = item.kota;
      opt.textContent = `${item.kota} (+${formatRupiah(item.tarif)})`;
      optgroup.appendChild(opt);
    });
    selectEl.appendChild(optgroup);
  });

  // 2. Render ke Custom Floating Dropdown List (Modern, Cepat, Tanpa Menu Chrome)
  const customList = document.getElementById("customCheckoutKotaList");
  if (customList) {
    let customHtml = "";
    Object.keys(grouped).forEach(zona => {
      customHtml += `
        <div class="custom-kota-group mb-2">
          <div class="text-[10px] uppercase font-bold text-amber-400 tracking-wider px-2 py-1 bg-slate-800/80 rounded-lg mb-1 flex items-center gap-1.5 sticky top-0 z-10 backdrop-blur-sm">
            <i class="fas fa-location-dot text-[9px]"></i> <span>${escapeHtml(zona)}</span>
          </div>
          <div class="space-y-0.5">
            ${grouped[zona].map(item => `
              <button type="button" onclick="selectCustomCheckoutCity('${escapeHtml(item.kota)}', ${item.tarif})" class="custom-kota-item w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2.5 text-slate-200 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer group" data-search="${escapeHtml((item.kota + ' ' + item.alias + ' ' + zona).toLowerCase())}">
                <span class="flex-1 text-left font-medium leading-snug break-words group-hover:text-amber-200">${escapeHtml(item.kota)}</span>
                <span class="text-[10.5px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-md shrink-0 self-center">
                  +${formatRupiah(item.tarif)}
                </span>
              </button>
            `).join('')}
          </div>
        </div>
      `;
    });
    customList.innerHTML = customHtml;
  }
}

function toggleCheckoutKotaDropdown() {
  const menu = document.getElementById("customCheckoutKotaMenu");
  const arrow = document.getElementById("iconCheckoutKotaArrow");
  if (!menu) return;
  const isHidden = menu.classList.contains("hidden");
  if (isHidden) {
    menu.classList.remove("hidden");
    if (arrow) arrow.classList.add("rotate-180");
    const searchInput = document.getElementById("searchCheckoutKotaInput");
    if (searchInput) {
      searchInput.value = "";
      filterCheckoutKotaList("");
      setTimeout(() => searchInput.focus(), 50);
    }
  } else {
    closeCheckoutKotaDropdown();
  }
}

function closeCheckoutKotaDropdown() {
  const menu = document.getElementById("customCheckoutKotaMenu");
  const arrow = document.getElementById("iconCheckoutKotaArrow");
  if (menu) menu.classList.add("hidden");
  if (arrow) arrow.classList.remove("rotate-180");
}

function filterCheckoutKotaList(query) {
  const q = (query || "").toLowerCase().trim();
  const groups = document.querySelectorAll("#customCheckoutKotaList .custom-kota-group");
  groups.forEach(g => {
    let hasVisibleItem = false;
    const items = g.querySelectorAll(".custom-kota-item");
    items.forEach(it => {
      const searchData = (it.dataset.search || it.textContent).toLowerCase();
      const match = !q || searchData.includes(q);
      it.style.display = match ? "flex" : "none";
      if (match) hasVisibleItem = true;
    });
    g.style.display = hasVisibleItem ? "block" : "none";
  });
}

function selectCustomCheckoutCity(cityName, baseVal) {
  const selectEl = document.getElementById("checkoutKotaSelect");
  if (selectEl) {
    selectEl.value = baseVal;
  }
  currentSelectedCityName = cityName;

  let finalRate = baseVal;
  if (currentCheckoutProduct) {
    const origin = (currentCheckoutProduct["Kota Asal"] || "Surabaya").toLowerCase();
    const dest = currentSelectedCityName.toLowerCase();
    if (dest.includes(origin) || origin.includes(dest)) {
      finalRate = 12000;
    }
  }
  currentSelectedCityRate = finalRate;

  const labelEl = document.getElementById("selectedCheckoutKotaText");
  if (labelEl) {
    labelEl.innerHTML = `<span class="text-white font-semibold">📍 ${cityName}</span> <span class="text-emerald-400 font-bold ml-1.5">(+${formatRupiah(finalRate)})</span>`;
  }

  const previewLabel = document.getElementById("labelKirimPreview");
  if (previewLabel) {
    previewLabel.textContent = finalRate ? formatRupiah(finalRate) : "Tarif Otomatis";
  }

  closeCheckoutKotaDropdown();
  calculateCheckoutTotals();
}

function initCheckoutCityDropdown() {
  populateCheckoutCityDropdown("Surabaya");
}

// Helper ekstraksi link marketplace fleksibel (tahan typo Shoope/Shopee/Tokped/Tiktok dll)
function getMarketplaceLink(row, type) {
  if (!row || typeof row !== "object") return "";
  const keys = Object.keys(row);
  for (const k of keys) {
    const cleanK = k.trim().toLowerCase().replace(/\s+/g, "");
    if (type === "shopee") {
      if (cleanK.includes("shopee") || cleanK.includes("shoope") || cleanK.includes("shoppe") || cleanK.includes("shope") || cleanK.includes("sopi")) {
        const val = String(row[k] || "").trim();
        if (val) return val;
      }
    } else if (type === "tokopedia") {
      if (cleanK.includes("tokped") || cleanK.includes("tokopedia") || cleanK.includes("toped")) {
        const val = String(row[k] || "").trim();
        if (val) return val;
      }
    } else if (type === "tiktok") {
      if (cleanK.includes("tiktok") || cleanK.includes("ttshop")) {
        const val = String(row[k] || "").trim();
        if (val) return val;
      }
    }
  }
  return "";
}

function bindCheckoutModalData() {
  if (!currentCheckoutProduct) return;
  const product = currentCheckoutProduct;

  const nama = product["Nama Produk"] || "-";
  const harga = parseNumberRupiah(product["Harga"]) || 0;
  const foto = convertDriveImage(product["Foto"] || product["FOTO"] || product["Foto Website"] || "");
  const stok = product["Stok"] || product["STOK"] || "";
  const deskripsi = product["Deskripsi"] || product["DESKRIPSI"] || "";
  const originCity = product["Kota Asal"] || product["Asal"] || "Surabaya";
  const sellerName = product["Penjual"] || "Official Teater Q";

  const imgEl = document.getElementById("checkoutProductImg");
  if (imgEl) imgEl.src = foto || DEFAULT_NO_IMAGE;

  const nameEl = document.getElementById("checkoutProductName");
  if (nameEl) nameEl.textContent = nama;

  const priceEl = document.getElementById("checkoutProductPrice");
  if (priceEl) priceEl.textContent = formatRupiah(harga);

  const rawStok = product["Stok"] || product["STOK"] || "";
  const rawTerjual = product["Terjual"] || product["TERJUAL"] || "0";
  const numStok = parseInt(String(rawStok).replace(/[^0-9]/g, ""), 10);
  const numTerjual = parseInt(String(rawTerjual).replace(/[^0-9]/g, ""), 10) || 0;
  const hasNumStok = !isNaN(numStok);

  const stockEl = document.getElementById("checkoutProductStock");
  if (stockEl) {
    if (hasNumStok) {
      stockEl.innerHTML = `<span class="${numStok <= 0 ? 'text-rose-400' : 'text-emerald-400'} font-bold">📦 Sisa Stok: ${numStok} pcs</span> &nbsp;|&nbsp; <span class="text-amber-400 font-bold">🔥 Terjual: ${numTerjual} pcs</span>`;
    } else {
      stockEl.textContent = rawStok ? `Stok: ${rawStok}` : "Ready Stock";
    }
  }

  const descEl = document.getElementById("checkoutProductDesc");
  if (descEl) descEl.textContent = deskripsi ? `• ${deskripsi}` : "";

  // Set Origin City & Seller Badge
  const elOrigin = document.getElementById("checkoutOriginCity");
  if (elOrigin) elOrigin.textContent = originCity;
  const elSeller = document.getElementById("checkoutSellerName");
  if (elSeller) elSeller.textContent = sellerName;

  // Set Trust Badge Resmi vs Lapak Anggota
  const rawSeller = (sellerName || "").trim();
  const isOfficial = !rawSeller || rawSeller.toLowerCase().includes("official") || rawSeller.toLowerCase() === "teater q" || rawSeller.toLowerCase().includes("pengurus") || rawSeller.toLowerCase().includes("sanggar");
  const trustBadgeEl = document.getElementById("checkoutTrustBadge");
  if (trustBadgeEl) {
    if (isOfficial) {
      trustBadgeEl.className = "text-[11px] px-2.5 py-1.5 rounded-lg border border-red-500/40 bg-red-950/40 text-red-300 flex items-center gap-2 mt-2";
      trustBadgeEl.innerHTML = `<i class="fas fa-shield-alt text-amber-400 text-base shrink-0"></i> <div><strong>Produk Resmi Official Teater Q</strong> — Asli diproduksi Sanggar UINSA Surabaya. Tersedia opsi Ambil di Sanggar (Rp 0).</div>`;
    } else {
      trustBadgeEl.className = "text-[11px] px-2.5 py-1.5 rounded-lg border border-sky-500/40 bg-sky-950/40 text-sky-300 flex items-center gap-2 mt-2";
      trustBadgeEl.innerHTML = `<i class="fas fa-handshake text-cyan-400 text-base shrink-0"></i> <div><strong>Lapak Karya Anggota Paguyuban</strong> — Dijual & dikirim mandiri oleh <strong>${escapeHtml(sellerName)}</strong> dari <strong>${escapeHtml(originCity)}</strong>.</div>`;
    }
  }

  // Cek Link Marketplace Eksternal (Shopee, Tokopedia, TikTok Shop)
  const linkShopee = getMarketplaceLink(product, "shopee");
  const linkTokopedia = getMarketplaceLink(product, "tokopedia");
  const linkTiktok = getMarketplaceLink(product, "tiktok");

  const checkoutMarketAlert = document.getElementById("checkoutMarketplaceAlert");
  const checkoutMarketBtns = document.getElementById("checkoutMarketplaceButtons");
  if (checkoutMarketAlert && checkoutMarketBtns) {
    if (linkShopee || linkTokopedia || linkTiktok) {
      let btnsHtml = "";
      if (linkShopee) {
        btnsHtml += `
          <a href="${escapeHtml(linkShopee)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow transition-all active:scale-95">
            <i class="fas fa-shopping-bag"></i> <span>Beli di Shopee</span>
          </a>
        `;
      }
      if (linkTokopedia) {
        btnsHtml += `
          <a href="${escapeHtml(linkTokopedia)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition-all active:scale-95">
            <i class="fas fa-store"></i> <span>Beli di Tokopedia</span>
          </a>
        `;
      }
      if (linkTiktok) {
        btnsHtml += `
          <a href="${escapeHtml(linkTiktok)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-pink-400 border border-pink-500/40 font-bold text-xs shadow transition-all active:scale-95">
            <i class="fab fa-tiktok"></i> <span>Beli di TikTok Shop</span>
          </a>
        `;
      }
      checkoutMarketBtns.innerHTML = btnsHtml;
      checkoutMarketAlert.classList.remove("hidden");
    } else {
      checkoutMarketAlert.classList.add("hidden");
      checkoutMarketBtns.innerHTML = "";
    }
  }

  // Set Dynamic Title for "Ambil Langsung"
  const optTitle = document.getElementById("optSanggarTitle");
  const optSub = document.getElementById("optSanggarSub");
  if (originCity.toLowerCase().includes("surabaya")) {
    if (optTitle) optTitle.textContent = "Ambil di Sanggar";
    if (optSub) optSub.textContent = "Sanggar UINSA Surabaya";
  } else {
    if (optTitle) optTitle.textContent = "Ambil Langsung / COD";
    if (optSub) optSub.textContent = `Lokasi Penjual (${originCity})`;
  }

  // Reset Input Form
  const qtyInput = document.getElementById("checkoutQtyInput");
  if (qtyInput) qtyInput.value = currentCheckoutQty;

  const varianInput = document.getElementById("checkoutVarianInput");
  if (varianInput) varianInput.value = "";

  const alamatInput = document.getElementById("checkoutAlamatInput");
  if (alamatInput) alamatInput.value = "";

  const mapPinStatus = document.getElementById("checkoutMapPinStatus");
  if (mapPinStatus) {
    mapPinStatus.classList.add("hidden");
    mapPinStatus.classList.remove("flex");
  }
  currentCheckoutMapCoords = null;

  // Populasi opsi tujuan pengiriman secara dinamis berdasarkan kota asal penjual
  populateCheckoutCityDropdown(originCity);

  const kotaSelect = document.getElementById("checkoutKotaSelect");
  if (kotaSelect) kotaSelect.value = "";
  const labelCity = document.getElementById("selectedCheckoutKotaText");
  if (labelCity) {
    labelCity.innerHTML = `<span class="text-slate-400">📍 Pilih Kota / Kabupaten Tujuan...</span>`;
  }
  closeCheckoutKotaDropdown();

  // Reset Rekening Text dari CONFIG
  const rekText = document.getElementById("checkoutRekeningText");
  if (rekText && typeof CONFIG_INFO !== "undefined") {
    rekText.textContent = `${CONFIG_INFO.namaBank || "SeaBank"} ${CONFIG_INFO.noRekening || "901926407305"}`;
  }

  onDeliveryMethodChange("sanggar");
  calculateCheckoutTotals();
}

// ============================================================================
// POPUP DETAIL FOTO PRODUK (ZOOM & SPESIFIKASI LENGKAP)
// ============================================================================
let currentPhotoDetailProduct = null;

function openProductPhotoDetail(idx) {
  const product = currentMarketRendered && currentMarketRendered[idx];
  if (!product) return;
  currentPhotoDetailProduct = product;

  const nama = product["Nama Produk"] || "-";
  const harga = product["Harga"] ? formatRupiah(product["Harga"]) : "-";
  const rawStok = product["Stok"] || product["STOK"] || "";
  const rawTerjual = product["Terjual"] || product["TERJUAL"] || "0";
  const numStok = parseInt(String(rawStok).replace(/[^0-9]/g, ""), 10);
  const numTerjual = parseInt(String(rawTerjual).replace(/[^0-9]/g, ""), 10) || 0;
  const hasNumStok = !isNaN(numStok);

  const statusText = (product["Status"] || "").toLowerCase();
  const isExplicitlyDisabled = statusText.includes("nonaktif") || statusText.includes("habis") || statusText.includes("kosong");
  const isStokHabis = hasNumStok ? (numStok <= 0) : isExplicitlyDisabled;
  const isAvailable = !isStokHabis && !statusText.includes("nonaktif");

  const foto = convertDriveImage(product["Foto"] || product["FOTO"] || product["Foto Website"] || "", 1200) || DEFAULT_NO_IMAGE;
  const deskripsi = product["Deskripsi"] || product["DESKRIPSI"] || "";
  const rawSeller = (product["Penjual"] || "").trim();
  const isOfficial = !rawSeller || rawSeller.toLowerCase().includes("official") || rawSeller.toLowerCase() === "teater q" || rawSeller.toLowerCase().includes("pengurus") || rawSeller.toLowerCase().includes("sanggar");
  const sellerName = isOfficial ? "Official Teater Q" : rawSeller;
  const originCity = product["Kota Asal"] || product["Asal"] || (isOfficial ? "Surabaya" : "Kota Penjual");

  // Isi data ke modal
  const titleEl = document.getElementById("photoDetailTitle");
  if (titleEl) titleEl.textContent = nama;

  const subCatEl = document.getElementById("photoDetailCategorySubtitle");
  if (subCatEl) subCatEl.textContent = isOfficial ? "Official Teater Q • Sanggar Surabaya" : `Lapak Anggota • ${originCity}`;

  const imgEl = document.getElementById("photoDetailImg");
  if (imgEl) {
    imgEl.src = foto;
    imgEl.alt = nama;
    imgEl.classList.remove("scale-150", "cursor-zoom-out");
    imgEl.classList.add("cursor-zoom-in");
  }

  const zoomHint = document.getElementById("photoZoomHint");
  if (zoomHint) zoomHint.textContent = "Klik foto untuk zoom";

  const directLink = document.getElementById("photoDetailDirectLink");
  if (directLink) directLink.href = foto;

  const nameEl = document.getElementById("photoDetailProductName");
  if (nameEl) nameEl.textContent = nama;

  const priceEl = document.getElementById("photoDetailProductPrice");
  if (priceEl) priceEl.textContent = harga;

  const originEl = document.getElementById("photoDetailOrigin");
  if (originEl) originEl.textContent = originCity;

  const sellerEl = document.getElementById("photoDetailSeller");
  if (sellerEl) sellerEl.textContent = sellerName;

  const badgeRow = document.getElementById("photoDetailBadgeRow");
  if (badgeRow) {
    badgeRow.innerHTML = isOfficial
      ? `<span class="badge-tag-origin badge-tag-official"><i class="fas fa-certificate"></i> Official Teater Q</span><span class="inline-flex items-center gap-1 text-[9px] font-semibold text-sky-400 bg-sky-950/70 border border-sky-800/60 px-1.5 py-0.5 rounded"><i class="fas fa-globe text-[8px]"></i> Web Resmi</span>`
      : `<span class="badge-tag-origin badge-tag-alumni"><i class="fas fa-handshake"></i> Lapak Anggota</span><span class="inline-flex items-center gap-1 text-[9px] font-semibold text-sky-400 bg-sky-950/70 border border-sky-800/60 px-1.5 py-0.5 rounded"><i class="fas fa-globe text-[8px]"></i> Web Resmi</span>`;
  }

  const stockInfo = document.getElementById("photoDetailStockSales");
  if (stockInfo) {
    if (hasNumStok) {
      if (numStok <= 0) {
        stockInfo.innerHTML = `<span class="text-rose-400 font-semibold"><i class="fas fa-times-circle"></i> Stok Habis</span> <span class="text-slate-500">•</span> <span class="text-slate-400">Terjual: ${numTerjual} pcs</span>`;
      } else if (numStok <= 3) {
        stockInfo.innerHTML = `<span class="text-rose-400 font-bold"><i class="fas fa-exclamation-triangle"></i> Sisa Stok: ${numStok} pcs</span> <span class="text-slate-500">•</span> <span class="text-amber-400 font-bold"><i class="fas fa-fire"></i> Terjual: ${numTerjual} pcs</span>`;
      } else {
        stockInfo.innerHTML = `<span class="text-emerald-400 font-semibold"><i class="fas fa-boxes"></i> Tersedia: ${numStok} pcs</span> <span class="text-slate-500">•</span> <span class="text-amber-400 font-semibold"><i class="fas fa-fire"></i> Terjual: ${numTerjual} pcs</span>`;
      }
    } else {
      stockInfo.innerHTML = `<span class="text-emerald-400 font-semibold"><i class="fas fa-check-circle"></i> Ready Stock</span>`;
    }
  }

  const descWrap = document.getElementById("photoDetailDescWrap");
  const descEl = document.getElementById("photoDetailDescription");
  if (descWrap && descEl) {
    if (deskripsi) {
      descWrap.classList.remove("hidden");
      descEl.textContent = deskripsi;
    } else {
      descWrap.classList.add("hidden");
    }
  }

  // Tampilkan Tombol Marketplace Eksternal jika ada (Shopee, Tokopedia, TikTok Shop)
  const linkShopee = getMarketplaceLink(product, "shopee");
  const linkTokopedia = getMarketplaceLink(product, "tokopedia");
  const linkTiktok = getMarketplaceLink(product, "tiktok");

  const marketWrap = document.getElementById("photoDetailMarketplaceLinks");
  const marketBtns = document.getElementById("photoDetailMarketplaceBtns");
  if (marketWrap && marketBtns) {
    if (linkShopee || linkTokopedia || linkTiktok) {
      let bHtml = "";
      if (linkShopee) {
        bHtml += `
          <a href="${escapeHtml(linkShopee)}" target="_blank" rel="noopener noreferrer" class="py-2.5 px-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-all active:scale-95 text-center">
            <i class="fas fa-shopping-bag text-sm"></i> <span>Beli di Shopee</span>
          </a>
        `;
      }
      if (linkTokopedia) {
        bHtml += `
          <a href="${escapeHtml(linkTokopedia)}" target="_blank" rel="noopener noreferrer" class="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-all active:scale-95 text-center">
            <i class="fas fa-store text-sm"></i> <span>Beli di Tokopedia</span>
          </a>
        `;
      }
      if (linkTiktok) {
        bHtml += `
          <a href="${escapeHtml(linkTiktok)}" target="_blank" rel="noopener noreferrer" class="py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-pink-400 border border-pink-500/40 font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-all active:scale-95 text-center">
            <i class="fab fa-tiktok text-sm"></i> <span>Beli di TikTok</span>
          </a>
        `;
      }
      marketBtns.innerHTML = bHtml;
      marketWrap.classList.remove("hidden");
    } else {
      marketWrap.classList.add("hidden");
      marketBtns.innerHTML = "";
    }
  }

  const btnOrder = document.getElementById("btnPhotoDetailOrder");
  if (btnOrder) {
    btnOrder.style.display = "";
    btnOrder.onclick = () => {
      closeProductPhotoDetail();
      openCheckoutModal(idx);
    };
    if (!isAvailable) {
      btnOrder.innerHTML = `<i class="fas fa-box-open"></i> Pre-Order`;
    } else {
      btnOrder.innerHTML = `<i class="fas fa-shopping-bag"></i> Pesan Sekarang`;
    }
  }

  const btnAddCart = document.getElementById("btnPhotoDetailAddToCart");
  if (btnAddCart) {
    btnAddCart.style.display = "";
    btnAddCart.onclick = () => {
      addToCart(idx);
    };
  }

  const modal = document.getElementById("productPhotoDetailModal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }
}

function openProductPhotoDetailFromCheckout() {
  if (!currentCheckoutProduct) return;
  let idx = -1;
  if (currentMarketRendered && currentMarketRendered.length) {
    idx = currentMarketRendered.indexOf(currentCheckoutProduct);
  }
  if (idx >= 0) {
    openProductPhotoDetail(idx);
  } else {
    currentMarketRendered = currentMarketRendered || [];
    currentMarketRendered.push(currentCheckoutProduct);
    openProductPhotoDetail(currentMarketRendered.length - 1);
  }
}

function openSimplePhotoDetail(src, name, price) {
  const imgEl = document.getElementById("photoDetailImg");
  const titleEl = document.getElementById("photoDetailTitle");
  const nameEl = document.getElementById("photoDetailProductName");
  const priceEl = document.getElementById("photoDetailProductPrice");
  const directLink = document.getElementById("photoDetailDirectLink");
  const descWrap = document.getElementById("photoDetailDescWrap");
  const badgeRow = document.getElementById("photoDetailBadgeRow");
  const stockInfo = document.getElementById("photoDetailStockSales");
  const btnOrder = document.getElementById("btnPhotoDetailOrder");
  const btnAddCart = document.getElementById("btnPhotoDetailAddToCart");
  const subCatEl = document.getElementById("photoDetailCategorySubtitle");

  if (imgEl) {
    imgEl.src = src;
    imgEl.alt = name;
    imgEl.classList.remove("scale-150", "cursor-zoom-out");
    imgEl.classList.add("cursor-zoom-in");
  }
  const zoomHint = document.getElementById("photoZoomHint");
  if (zoomHint) zoomHint.textContent = "Klik foto untuk zoom";

  if (titleEl) titleEl.textContent = name;
  if (subCatEl) subCatEl.textContent = "Item Keranjang Belanja";
  if (nameEl) nameEl.textContent = name;
  if (priceEl) priceEl.textContent = price;
  if (directLink) directLink.href = src;
  if (descWrap) descWrap.classList.add("hidden");
  if (badgeRow) badgeRow.innerHTML = "";
  if (stockInfo) stockInfo.innerHTML = "";
  if (btnAddCart) btnAddCart.style.display = "none";
  if (btnOrder) btnOrder.style.display = "none";

  const modal = document.getElementById("productPhotoDetailModal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }
}

function togglePhotoZoom(img) {
  if (!img) return;
  const isZoomed = img.classList.contains("scale-150");
  const hintEl = document.getElementById("photoZoomHint");
  if (isZoomed) {
    img.classList.remove("scale-150", "cursor-zoom-out");
    img.classList.add("cursor-zoom-in");
    if (hintEl) hintEl.textContent = "Klik foto untuk zoom";
  } else {
    img.classList.add("scale-150", "cursor-zoom-out");
    img.classList.remove("cursor-zoom-in");
    if (hintEl) hintEl.textContent = "Klik lagi untuk perkecil";
  }
}

function closeProductPhotoDetail() {
  const modal = document.getElementById("productPhotoDetailModal");
  if (modal) {
    modal.classList.remove("flex");
    modal.classList.add("hidden");
  }
  const img = document.getElementById("photoDetailImg");
  if (img) {
    img.classList.remove("scale-150", "cursor-zoom-out");
    img.classList.add("cursor-zoom-in");
    img.src = "";
  }
  const hintEl = document.getElementById("photoZoomHint");
  if (hintEl) hintEl.textContent = "Klik foto untuk zoom";
  const btnOrder = document.getElementById("btnPhotoDetailOrder");
  if (btnOrder) btnOrder.style.display = "";
  const btnAddCart = document.getElementById("btnPhotoDetailAddToCart");
  if (btnAddCart) btnAddCart.style.display = "";
}

function openCheckoutModal(idx) {
  const product = currentMarketRendered[idx];
  if (!product) return;

  currentCheckoutProduct = product;
  currentCheckoutQty = 1;
  currentDeliveryMethod = "sanggar";
  currentSelectedCityRate = 0;
  currentSelectedCityName = "";
  currentUniqueCode = Math.floor(100 + Math.random() * 899);

  initCheckoutCityDropdown();
  bindCheckoutModalData();

  const modal = document.getElementById("checkoutModal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }
}

function closeCheckoutModal() {
  const modal = document.getElementById("checkoutModal");
  if (modal) {
    modal.classList.remove("flex");
    modal.classList.add("hidden");
  }
  if (typeof clearCheckoutReceipt === 'function') {
    clearCheckoutReceipt();
  }
}

function changeCheckoutQty(delta) {
  let maxQty = 999;
  if (currentCheckoutProduct) {
    const rawStok = currentCheckoutProduct["Stok"] || currentCheckoutProduct["STOK"] || "";
    const numStok = parseInt(String(rawStok).replace(/[^0-9]/g, ""), 10);
    if (!isNaN(numStok) && numStok > 0) {
      maxQty = numStok;
    }
  }
  currentCheckoutQty = Math.max(1, Math.min(maxQty, currentCheckoutQty + delta));
  const qtyInput = document.getElementById("checkoutQtyInput");
  if (qtyInput) qtyInput.value = currentCheckoutQty;
  calculateCheckoutTotals();
}

function onDeliveryMethodChange(method) {
  currentDeliveryMethod = method;
  const optSanggar = document.getElementById("optSanggarLabel");
  const optKirim = document.getElementById("optKirimLabel");
  const formKirim = document.getElementById("formKirimArea");

  if (method === "sanggar") {
    if (optSanggar) {
      optSanggar.className = "cursor-pointer border-2 border-red-600 bg-red-600/15 p-2.5 rounded-xl flex flex-col justify-between transition-all select-none";
      const radio = optSanggar.querySelector("input[type='radio']");
      if (radio) radio.checked = true;
    }
    if (optKirim) {
      optKirim.className = "cursor-pointer border border-slate-700 bg-slate-900 p-2.5 rounded-xl flex flex-col justify-between transition-all select-none opacity-80 hover:opacity-100";
    }
    if (formKirim) formKirim.classList.add("hidden");
  } else {
    if (optKirim) {
      optKirim.className = "cursor-pointer border-2 border-red-600 bg-red-600/15 p-2.5 rounded-xl flex flex-col justify-between transition-all select-none";
      const radio = optKirim.querySelector("input[type='radio']");
      if (radio) radio.checked = true;
    }
    if (optSanggar) {
      optSanggar.className = "cursor-pointer border border-slate-700 bg-slate-900 p-2.5 rounded-xl flex flex-col justify-between transition-all select-none opacity-80 hover:opacity-100";
    }
    if (formKirim) formKirim.classList.remove("hidden");
  }

  calculateCheckoutTotals();
}

function onSelectCityChange() {
  const selectEl = document.getElementById("checkoutKotaSelect");
  if (!selectEl) return;
  const baseVal = parseInt(selectEl.value, 10) || 0;
  const selectedOpt = selectEl.options[selectEl.selectedIndex];
  currentSelectedCityName = selectedOpt ? (selectedOpt.dataset.kota || selectedOpt.text) : "";

  // Multi-seller rate adjustment jika penjual bukan dari Surabaya
  let finalRate = baseVal;
  if (currentCheckoutProduct) {
    const origin = (currentCheckoutProduct["Kota Asal"] || "Surabaya").toLowerCase();
    const dest = currentSelectedCityName.toLowerCase();
    // Jika penjual di kota asal yang sama dengan tujuan pembeli -> tarif lokal bersahabat
    if (dest.includes(origin) || origin.includes(dest)) {
      finalRate = 12000;
    }
  }

  currentSelectedCityRate = finalRate;

  const previewLabel = document.getElementById("labelKirimPreview");
  if (previewLabel) {
    previewLabel.textContent = finalRate ? formatRupiah(finalRate) : "Tarif Otomatis";
  }

  calculateCheckoutTotals();
}

function openMapPickerForCheckout() {
  const alamatInput = document.getElementById("checkoutAlamatInput");
  const currentVal = alamatInput ? alamatInput.value.trim() : "";

  openInteractiveMapPicker((loc) => {
    if (!loc) return;
    currentCheckoutMapCoords = {
      lat: loc.lat,
      lon: loc.lon,
      address: loc.address,
      mapsUrl: loc.mapsUrl || `https://maps.google.com/?q=${loc.lat},${loc.lon}`
    };

    if (alamatInput) {
      // Cek apakah pembeli sudah menulis no rumah di awal
      let prefix = "";
      if (currentVal && !currentVal.toLowerCase().includes("http") && !currentVal.toLowerCase().includes("jalan") && !currentVal.toLowerCase().includes("jl.")) {
        prefix = currentVal.trim() + ", ";
      }
      if (prefix) {
        alamatInput.value = `${prefix}${loc.address}`;
      } else {
        alamatInput.value = `No. ... , ${loc.address}`;
        setTimeout(() => {
          alamatInput.focus();
          alamatInput.setSelectionRange(4, 7); // Sorot '...' agar pembeli tinggal ketik nomor rumahnya
        }, 100);
      }
    }

    const statusEl = document.getElementById("checkoutMapPinStatus");
    const statusText = document.getElementById("checkoutMapPinStatusText");
    if (statusEl) {
      statusEl.classList.remove("hidden");
      statusEl.classList.add("flex");
    }
    if (statusText) {
      statusText.textContent = `📍 GPS tersambung (${loc.lat.toFixed(4)}, ${loc.lon.toFixed(4)}). Silakan lengkapi No. Rumah / RT / Patokan di kotak alamat.`;
    }

    // Otomatis deteksi kota di dropdown pengiriman
    autoMatchCheckoutCity(loc.address);

    showToast("📍 Alamat & titik GPS berhasil diambil!", "success");
  }, currentVal);
}

function autoMatchCheckoutCity(addressStr) {
  if (!addressStr) return;
  const selectEl = document.getElementById("checkoutKotaSelect");
  if (!selectEl) return;
  const addrLower = addressStr.toLowerCase();
  for (let i = 0; i < selectEl.options.length; i++) {
    const opt = selectEl.options[i];
    const kotaName = (opt.dataset.kota || opt.text || "").toLowerCase().replace(/^(kota|kabupaten|kab\.)\s+/i, "").trim();
    if (kotaName && kotaName.length >= 4 && addrLower.includes(kotaName)) {
      selectEl.selectedIndex = i;
      onSelectCityChange();
      break;
    }
  }
}

function calculateCheckoutTotals() {
  if (!currentCheckoutProduct) return;
  const hargaSatuan = parseNumberRupiah(currentCheckoutProduct["Harga"]) || 0;
  const subtotal = hargaSatuan * currentCheckoutQty;
  let ongkir = (currentDeliveryMethod === "sanggar") ? 0 : currentSelectedCityRate;

  // Row Kode Unik
  const elKodeUnik = document.getElementById("checkoutSummaryKodeUnik");
  if (elKodeUnik) {
    elKodeUnik.textContent = `+ Rp ${currentUniqueCode}`;
  }

  const grandTotal = Math.max(0, subtotal + ongkir) + currentUniqueCode;

  const elQty = document.getElementById("checkoutSummaryQty");
  if (elQty) elQty.textContent = currentCheckoutQty;

  const elSub = document.getElementById("checkoutSummarySubtotal");
  if (elSub) elSub.textContent = formatRupiah(subtotal);

  const elOngkir = document.getElementById("checkoutSummaryOngkir");
  if (elOngkir) {
    if (currentDeliveryMethod === "sanggar") {
      elOngkir.textContent = "Rp 0 (Gratis - Ambil Langsung)";
      elOngkir.className = "font-bold text-emerald-400";
    } else {
      if (currentSelectedCityRate > 0) {
        elOngkir.textContent = formatRupiah(currentSelectedCityRate);
        elOngkir.className = "font-bold text-amber-400";
      } else {
        elOngkir.textContent = "Pilih Kota Tujuan di Atas";
        elOngkir.className = "font-bold text-slate-400 italic";
      }
    }
  }

  const elTotal = document.getElementById("checkoutSummaryTotal");
  if (elTotal) elTotal.textContent = formatRupiah(grandTotal);

  const elStatus = document.getElementById("checkoutStatusRingkasan");
  if (elStatus) {
    const originCity = currentCheckoutProduct["Kota Asal"] || "Surabaya";
    if (currentDeliveryMethod === "sanggar") {
      elStatus.textContent = originCity.toLowerCase().includes("surabaya") ? "🏢 Ambil di Sanggar Teater Q" : `🏢 COD di ${originCity}`;
      elStatus.className = "text-emerald-400 text-[10px] font-bold";
    } else {
      elStatus.textContent = currentSelectedCityName ? `🚚 Kirim dari ${originCity} ke ${currentSelectedCityName}` : "🚚 Kirim via Ekspedisi";
      elStatus.className = "text-amber-400 text-[10px] font-bold";
    }
  }
}

function switchCheckoutPayTab(tab) {
  const btnQris = document.getElementById("tabBtnCheckoutQris");
  const btnBank = document.getElementById("tabBtnCheckoutBank");
  const panelQris = document.getElementById("panelCheckoutQris");
  const panelBank = document.getElementById("panelCheckoutBank");

  if (tab === "qris") {
    if (btnQris) {
      btnQris.className = "py-2 px-2.5 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all bg-emerald-600 text-white shadow-sm";
    }
    if (btnBank) {
      btnBank.className = "py-2 px-2.5 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all text-slate-400 hover:text-white";
    }
    if (panelQris) panelQris.classList.remove("hidden");
    if (panelBank) panelBank.classList.add("hidden");
  } else {
    if (btnBank) {
      btnBank.className = "py-2 px-2.5 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all bg-amber-600 text-white shadow-sm";
    }
    if (btnQris) {
      btnQris.className = "py-2 px-2.5 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all text-slate-400 hover:text-white";
    }
    if (panelBank) panelBank.classList.remove("hidden");
    if (panelQris) panelQris.classList.add("hidden");
  }
}

function copyTotalCheckout() {
  const elTotal = document.getElementById("checkoutSummaryTotal");
  const totalText = elTotal ? elTotal.textContent.trim() : "";
  const numOnly = totalText.replace(/[^0-9]/g, "");
  if (!numOnly) return;
  navigator.clipboard.writeText(numOnly).then(() => {
    showToast(`Nominal transfer Rp ${formatRupiah(parseInt(numOnly, 10))} berhasil disalin! 💰`, "success");
  }).catch(() => {
    showToast(`Total: Rp ${numOnly}`, "info");
  });
}

function copyRekeningCheckout() {
  const bankName = (typeof CONFIG_INFO !== "undefined" && CONFIG_INFO.namaBank) ? CONFIG_INFO.namaBank : "SeaBank";
  const noRek = (typeof CONFIG_INFO !== "undefined" && CONFIG_INFO.noRekening) ? CONFIG_INFO.noRekening : "901926407305";
  navigator.clipboard.writeText(noRek).then(() => {
    showToast(`Nomor rekening ${bankName} (${noRek}) berhasil disalin! 📋`, "success");
  }).catch(() => {
    showToast(`No. Rekening: ${noRek}`, "success");
  });
}

window.switchCheckoutPayTab = switchCheckoutPayTab;
window.copyTotalCheckout = copyTotalCheckout;
window.copyRekeningCheckout = copyRekeningCheckout;

let checkoutReceiptBase64 = '';

function previewCheckoutReceipt(input) {
  if (!input || !input.files || !input.files[0]) return;
  const file = input.files[0];
  const label = document.getElementById('checkoutReceiptLabel');
  const previewBox = document.getElementById('checkoutReceiptPreviewBox');
  const imgEl = document.getElementById('checkoutReceiptImg');

  if (file.size > 5 * 1024 * 1024) {
    showToast('Ukuran file maksimal 5MB!', 'error');
    input.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const rawData = e.target.result;
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const maxW = 900;
      let w = img.width;
      let h = img.height;
      if (w > maxW) {
        h = Math.round((h * maxW) / w);
        w = maxW;
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      checkoutReceiptBase64 = canvas.toDataURL('image/jpeg', 0.75);

      if (imgEl) imgEl.src = checkoutReceiptBase64;
      if (label) label.textContent = file.name;
      if (previewBox) previewBox.classList.remove('hidden');
    };
    img.src = rawData;
  };
  reader.readAsDataURL(file);
}

function clearCheckoutReceipt() {
  checkoutReceiptBase64 = '';
  const input = document.getElementById('checkoutReceiptFile');
  const label = document.getElementById('checkoutReceiptLabel');
  const previewBox = document.getElementById('checkoutReceiptPreviewBox');
  if (input) input.value = '';
  if (label) label.textContent = 'Pilih Foto Bukti Transfer / Resi';
  if (previewBox) previewBox.classList.add('hidden');
}

window.previewCheckoutReceipt = previewCheckoutReceipt;
window.clearCheckoutReceipt = clearCheckoutReceipt;

function sendOrderTelegramAlert(orderText, photoBase64 = null, orderId = 'ORD') {
  const targetBot = (typeof TELEGRAM_ADMIN_BOT !== "undefined" && TELEGRAM_ADMIN_BOT.enabled && TELEGRAM_ADMIN_BOT.botToken)
    ? { token: TELEGRAM_ADMIN_BOT.botToken, chatId: TELEGRAM_ADMIN_BOT.chatId }
    : (typeof TELEGRAM_CONFIG !== "undefined" ? TELEGRAM_CONFIG : null);

  if (targetBot && targetBot.token && targetBot.chatId) {
    if (photoBase64 && photoBase64.startsWith('data:image')) {
      try {
        const blobBin = atob(photoBase64.split(',')[1]);
        const array = [];
        for (let i = 0; i < blobBin.length; i++) {
          array.push(blobBin.charCodeAt(i));
        }
        const photoBlob = new Blob([new Uint8Array(array)], { type: 'image/jpeg' });
        const formData = new FormData();
        formData.append('chat_id', targetBot.chatId);
        formData.append('photo', photoBlob, `bukti_${orderId}.jpg`);
        formData.append('caption', orderText);
        formData.append('parse_mode', 'HTML');

        fetch(`https://api.telegram.org/bot${targetBot.token}/sendPhoto`, {
          method: 'POST',
          body: formData
        }).catch(() => {
          // Fallback to text if sendPhoto fails
          fetch(`https://api.telegram.org/bot${targetBot.token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: targetBot.chatId,
              text: orderText,
              parse_mode: 'HTML'
            })
          }).catch(() => {});
        });
        return;
      } catch (errPhoto) {
        console.warn('Gagal memproses foto untuk Telegram:', errPhoto);
      }
    }

    try {
      fetch(`https://api.telegram.org/bot${targetBot.token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: targetBot.chatId,
          text: orderText,
          parse_mode: 'HTML'
        })
      }).catch(() => {});
    } catch(e) {}
  }
}

function submitCheckoutWhatsApp() {
  if (!currentCheckoutProduct) return;

  const namaPemesan = (document.getElementById("checkoutNamaInput")?.value || "").trim();
  const noWaPemesan = (document.getElementById("checkoutWaInput")?.value || "").trim();
  const varianCatatan = (document.getElementById("checkoutVarianInput")?.value || "").trim();
  const alamatLengkap = (document.getElementById("checkoutAlamatInput")?.value || "").trim();

  // Validasi Input
  if (!namaPemesan) {
    showToast("Silakan masukkan Nama Lengkap Anda.", "error");
    document.getElementById("checkoutNamaInput")?.focus();
    return;
  }
  if (!noWaPemesan) {
    showToast("Silakan masukkan Nomor WhatsApp Anda.", "error");
    document.getElementById("checkoutWaInput")?.focus();
    return;
  }

  if (currentDeliveryMethod === "kirim") {
    if (!currentSelectedCityRate || !currentSelectedCityName) {
      showToast("Silakan pilih Kota/Kabupaten Tujuan pengiriman.", "error");
      document.getElementById("checkoutKotaSelect")?.focus();
      return;
    }
    if (!alamatLengkap || alamatLengkap.length < 5) {
      showToast("Silakan isi alamat lengkap rumah dan kode pos.", "error");
      document.getElementById("checkoutAlamatInput")?.focus();
      return;
    }
  }

  // Validasi Wajib Upload Bukti Transfer
  if (!checkoutReceiptBase64 || !checkoutReceiptBase64.startsWith('data:image')) {
    showToast("Silakan upload Foto Bukti Transfer / Resi terlebih dahulu!", "error");
    document.getElementById("checkoutReceiptFile")?.click();
    return;
  }

  // Validasi Ketersediaan Stok
  const rawStok = currentCheckoutProduct["Stok"] || currentCheckoutProduct["STOK"] || "";
  const numStok = parseInt(String(rawStok).replace(/[^0-9]/g, ""), 10);
  if (!isNaN(numStok) && numStok <= 0) {
    showToast("Mohon maaf, stok produk ini saat ini sudah habis!", "error");
    return;
  }
  if (!isNaN(numStok) && currentCheckoutQty > numStok) {
    showToast(`Maksimal pemesanan sesuai sisa stok adalah ${numStok} pcs.`, "error");
    return;
  }

  const namaProduk = currentCheckoutProduct["Nama Produk"] || "Produk Q-Store";
  const hargaSatuan = parseNumberRupiah(currentCheckoutProduct["Harga"]) || 0;
  const subtotal = hargaSatuan * currentCheckoutQty;
  const ongkir = (currentDeliveryMethod === "sanggar") ? 0 : currentSelectedCityRate;
  const originCity = currentCheckoutProduct["Kota Asal"] || "Surabaya";
  const sellerName = currentCheckoutProduct["Penjual"] || "Official Teater Q";
  const productId = currentCheckoutProduct["ID"] || "";

  // Nomor WhatsApp Admin Kas & Penjual
  const adminWa = (CONFIG_INFO && CONFIG_INFO.noAdminWA) || "6285645829346";
  const rawSellerWa = currentCheckoutProduct["Wa"] || currentCheckoutProduct["WA"] || adminWa;
  let sellerWa = rawSellerWa.toString().replace(/[^0-9]/g, "");
  if (sellerWa.startsWith("0")) sellerWa = "62" + sellerWa.slice(1);

  const grandTotal = Math.max(0, subtotal + ongkir) + currentUniqueCode;

  const orderId = `TQ-ORD-${Math.floor(1000 + Math.random() * 9000)}`;

  const sellerRekening = currentCheckoutProduct["Rekening"] || currentCheckoutProduct["REKENING"] || "Hubungi Penjual";

  // Link Verifikasi 1-Klik Khusus Admin Sanggar (Menggunakan URL Bersih Netlify / Web Portal Sendiri)
  const currentOrigin = window.location.origin;
  const verifyParams = new URLSearchParams({
    order: orderId,
    id: productId,
    product: namaProduk,
    qty: currentCheckoutQty,
    total: grandTotal,
    buyer: namaPemesan,
    buyerWa: noWaPemesan,
    seller: sellerName,
    sellerWa: sellerWa,
    sellerRek: sellerRekening,
    address: (currentDeliveryMethod === "sanggar") ? `COD / Ambil di Sanggar (${originCity})` : `${alamatLengkap} (${currentSelectedCityName})`
  });
  const confirmUrl = `${currentOrigin}/konfirmasi.html?${verifyParams.toString()}`;

  let waMsg = `🛒 *PESANAN BARU Q STORE*\n`;
  waMsg += `*No. Order:* #${orderId}\n`;
  waMsg += `━━━━━━━━━━━━━━━━━━━━\n`;
  waMsg += `📦 *Produk:* ${namaProduk}\n`;
  if (varianCatatan) {
    waMsg += `🏷️ *Varian/Catatan:* ${varianCatatan}\n`;
  }
  waMsg += `🔢 *Jumlah:* ${currentCheckoutQty} pcs\n`;
  waMsg += `💵 *Subtotal:* ${formatRupiah(subtotal)}\n`;
  waMsg += `━━━━━━━━━━━━━━━━━━━━\n`;
  waMsg += `👤 *Data Pemesan:*\n`;
  waMsg += `• Nama: ${namaPemesan}\n`;
  waMsg += `• WhatsApp: ${noWaPemesan}\n`;

  const alamatKirimRingkas = (currentDeliveryMethod === "sanggar")
    ? (originCity.toLowerCase().includes("surabaya") ? "Ambil di Sanggar UINSA Surabaya (COD)" : `COD di Lokasi Penjual (${originCity})`)
    : `${alamatLengkap} (${currentSelectedCityName})`;

  if (currentDeliveryMethod === "sanggar") {
    waMsg += `🚚 *Metode:* *Ambil Langsung / COD*\n`;
    waMsg += `📍 *Lokasi:* ${alamatKirimRingkas} (Bebas Ongkir)\n`;
  } else {
    waMsg += `🚚 *Metode:* *Kirim Ekspedisi*\n`;
    waMsg += `📍 *Tujuan:* ${currentSelectedCityName}\n`;
    waMsg += `🏠 *Alamat:* ${alamatLengkap}\n`;
    if (currentCheckoutMapCoords && currentCheckoutMapCoords.lat && currentCheckoutMapCoords.lon) {
      waMsg += `🗺️ *Titik Google Maps Kurir:* https://maps.google.com/?q=${currentCheckoutMapCoords.lat},${currentCheckoutMapCoords.lon}\n`;
    }
    waMsg += `📦 *Ongkir & Kemasan:* ${formatRupiah(ongkir)}\n`;
  }

  waMsg += `🔢 *Kode Unik:* + Rp ${currentUniqueCode}\n`;
  waMsg += `━━━━━━━━━━━━━━━━━━━━\n`;
  waMsg += `💰 *TOTAL AKHIR:* *${formatRupiah(grandTotal)}*\n`;
  const hasReceipt = Boolean(checkoutReceiptBase64 && checkoutReceiptBase64.startsWith('data:image'));

  if (hasReceipt) {
    waMsg += `📸 *Bukti Transfer:* SUDAH DILAMPIRKAN (Tercatat di Sistem & dikirimkan via chat ini)\n`;
  }
  waMsg += `━━━━━━━━━━━━━━━━━━━━\n`;
  waMsg += `Halo kak ${sellerName}, saya sudah melakukan transfer pembayaran untuk pesanan di atas melalui etalase Q Store (ukmteaterq.com). Foto bukti transfer saya lampirkan di chat ini. Mohon diproses dan dikonfirmasi ya. Terima kasih!`;

  // Target WhatsApp Langsung ke Penjual (atau ke Admin jika Official Sanggar)
  let targetWa = sellerWa || adminWa;
  targetWa = targetWa.toString().replace(/[^0-9]/g, "");
  if (targetWa.startsWith("0")) targetWa = "62" + targetWa.slice(1);

  const waUrl = `https://wa.me/${targetWa}?text=${encodeURIComponent(waMsg)}`;

  // Notifikasi Otomatis ke Grup Telegram Dana Abadi / Admin (Beserta Link Verifikasi Potong Stok)
  const telegramAlertMsg = `🛍️ *PESANAN BARU Q STORE*\n` +
    `*No. Order:* #${orderId}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📦 *Produk:* ${namaProduk} (${currentCheckoutQty} pcs)\n` +
    `💰 *Total:* ${formatRupiah(grandTotal)}\n` +
    `🏪 *Penjual:* ${sellerName} (${originCity})\n` +
    `📱 *WA Penjual:* https://wa.me/${sellerWa}\n` +
    `💳 *Rekening Pencairan Penjual:* ${sellerRekening}\n` +
    `👤 *Pembeli:* ${namaPemesan} (${noWaPemesan})\n` +
    `📍 *Alamat:* ${alamatKirimRingkas}\n` +
    (currentCheckoutMapCoords ? `🗺️ *GPS Kurir:* https://maps.google.com/?q=${currentCheckoutMapCoords.lat},${currentCheckoutMapCoords.lon}\n` : "") +
    (hasReceipt ? `📸 *Bukti Transfer:* Terlampir pada foto di atas\n` : `📸 *Bukti Transfer:* Belum dilampirkan\n`) +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🔐 *Link Verifikasi Lunas & Potong Stok:*\n` +
    `${confirmUrl}`;

  sendOrderTelegramAlert(telegramAlertMsg, hasReceipt ? checkoutReceiptBase64 : null, orderId);

  window.open(waUrl, "_blank");

  // Jika dari checkout cart, kosongkan cart
  if (currentCheckoutProduct._isCartCheckout) {
    cartItems = [];
    saveCart();
  }

  showToast(`Pesanan dibuat! Membuka WhatsApp ${sellerName}...`, "success");
  closeCheckoutModal();
}

let currentMarketViewMode = "grid";
try {
  const savedMode = localStorage.getItem("tq_market_view_mode");
  if (savedMode === "list" || savedMode === "grid") currentMarketViewMode = savedMode;
} catch(e){}

function setMarketViewMode(mode) {
  currentMarketViewMode = mode;
  try { localStorage.setItem("tq_market_view_mode", mode); } catch(e){}

  const gridEl = document.getElementById("marketplaceGrid");
  const btnGrid = document.getElementById("btnViewGrid");
  const btnList = document.getElementById("btnViewList");

  if (gridEl) {
    if (mode === "list") {
      gridEl.classList.remove("view-grid");
      gridEl.classList.add("view-list");
    } else {
      gridEl.classList.remove("view-list");
      gridEl.classList.add("view-grid");
    }
  }

  if (btnGrid && btnList) {
    if (mode === "list") {
      btnList.classList.add("bg-red-600", "text-white", "shadow");
      btnList.classList.remove("text-slate-400");
      btnGrid.classList.remove("bg-red-600", "text-white", "shadow");
      btnGrid.classList.add("text-slate-400");
    } else {
      btnGrid.classList.add("bg-red-600", "text-white", "shadow");
      btnGrid.classList.remove("text-slate-400");
      btnList.classList.remove("bg-red-600", "text-white", "shadow");
      btnList.classList.add("text-slate-400");
    }
  }
}

// 8.1. RENDER MARKETPLACE
function renderMarketplace() {
  const container = document.getElementById("marketplaceGrid");
  const btnContainer = document.getElementById("btnMoreMarket");
  const infoText = document.getElementById("infoMarket");
  if (!container) return;

  const keyword = (document.getElementById("searchMarketplace")?.value || "").toLowerCase();
  const filtered = marketplaceData.filter(row => {
    const name = (row["Nama Produk"] || "").toLowerCase();
    const desc = (row["Deskripsi"] || "").toLowerCase();
    const cat = (row["Kategori"] || "").toLowerCase();
    const seller = (row["Penjual"] || "").toLowerCase();
    const rawSeller = (seller || "").trim().toLowerCase();
    const isOfficial = !rawSeller || rawSeller.includes("official") || rawSeller === "teater q" || rawSeller.includes("pengurus") || rawSeller.includes("sanggar");

    const kotaAsalRow = (row["Kota Asal"] || row["Asal"] || "").toLowerCase();
    const linkShopee = getMarketplaceLink(row, "shopee");
    const linkTokopedia = getMarketplaceLink(row, "tokopedia");
    const linkTiktok = getMarketplaceLink(row, "tiktok");

    const matchKeyword = !keyword || name.includes(keyword) || desc.includes(keyword) || seller.includes(keyword) || kotaAsalRow.includes(keyword) || (linkShopee && "shopee".includes(keyword)) || (linkTokopedia && "tokopedia".includes(keyword)) || (linkTiktok && "tiktok".includes(keyword));

    let matchCategory = true;
    if (currentMarketCategory === "merchandise") {
      // Murni HANYA produk resmi official Teater Q (Sanggar)
      matchCategory = isOfficial;
    } else if (currentMarketCategory === "alumni") {
      // Murni HANYA lapak wirausaha alumni
      matchCategory = !isOfficial;
    } else if (currentMarketCategory === "buku") {
      matchCategory = cat.includes("buku") || cat.includes("naskah") || cat.includes("karya") || name.includes("buku") || name.includes("antologi");
    } else if (currentMarketCategory === "kuliner") {
      matchCategory = cat.includes("kuliner") || cat.includes("kopi") || cat.includes("snack") || cat.includes("makanan") || name.includes("kopi");
    } else if (currentMarketCategory === "shopee") {
      matchCategory = !!linkShopee;
    } else if (currentMarketCategory === "tokped") {
      matchCategory = !!linkTokopedia;
    } else if (currentMarketCategory === "tiktok") {
      matchCategory = !!linkTiktok;
    }

    return matchKeyword && matchCategory;
  });

  updateSectionCounter("marketplace", filtered.length);

  if (!filtered.length) {
    container.innerHTML = "<div style='text-align:center; padding:30px; color:#94a3b8;'>Belum ada produk untuk kategori ini.</div>";
    if (btnContainer) btnContainer.style.display = "none";
    return;
  }

  const dataToRender = filtered.slice(0, marketLimit);
  currentMarketRendered = dataToRender;

  container.innerHTML = dataToRender.map((row, idx) => {
    const nama = row["Nama Produk"] || "-";
    const harga = row["Harga"] ? formatRupiah(row["Harga"]) : "-";
    const rawStok = row["Stok"] || row["STOK"] || "";
    const rawTerjual = row["Terjual"] || row["TERJUAL"] || "0";
    const numStok = parseInt(String(rawStok).replace(/[^0-9]/g, ""), 10);
    const numTerjual = parseInt(String(rawTerjual).replace(/[^0-9]/g, ""), 10) || 0;
    const hasNumStok = !isNaN(numStok);

    const statusText = (row["Status"] || "").toLowerCase();
    const isExplicitlyDisabled = statusText.includes("nonaktif") || statusText.includes("habis") || statusText.includes("kosong");
    const isStokHabis = hasNumStok ? (numStok <= 0) : isExplicitlyDisabled;
    const isAvailable = !isStokHabis && !statusText.includes("nonaktif");
    const badgeClass = isAvailable ? "status-active" : "status-nonactive";
    const displayStatus = isStokHabis ? "Habis" : (statusText.includes("nonaktif") ? "Nonaktif" : "Tersedia");
    const foto = convertDriveImage(row["Foto"] || row["FOTO"] || row["Foto Website"] || "");
    const waLink = waLinkFromNumber(row["Wa"] || row["WA"] || (CONFIG_INFO && CONFIG_INFO.noAdminWA));
    const qris = row["Qris"] || row["QRIS"] || "";
    const deskripsi = row["Deskripsi"] || row["DESKRIPSI"] || "";

    const linkShopee = getMarketplaceLink(row, "shopee");
    const linkTokopedia = getMarketplaceLink(row, "tokopedia");
    const linkTiktok = getMarketplaceLink(row, "tiktok");

    // Indikator Stok & Terjual
    let stockSalesBadge = "";
    if (hasNumStok) {
      if (numStok <= 0) {
        stockSalesBadge = `<span class="text-rose-400 font-semibold"><i class="fas fa-times-circle"></i> Stok Habis</span> <span class="text-slate-500">•</span> <span class="text-slate-400">Terjual: ${numTerjual}</span>`;
      } else if (numStok <= 3) {
        stockSalesBadge = `<span class="text-rose-400 font-bold" title="Stok menipis!"><i class="fas fa-exclamation-triangle"></i> Sisa: ${numStok}</span> <span class="text-slate-500">•</span> <span class="text-amber-400 font-bold"><i class="fas fa-fire"></i> Terjual: ${numTerjual}</span>`;
      } else {
        stockSalesBadge = `<span class="text-emerald-400 font-medium"><i class="fas fa-boxes"></i> Stok: ${numStok}</span> <span class="text-slate-500">•</span> <span class="text-amber-400 font-medium"><i class="fas fa-fire"></i> Terjual: ${numTerjual}</span>`;
      }
    } else {
      stockSalesBadge = rawStok ? `<span>Stok: ${escapeHtml(rawStok)}</span>` : `<span>Ready Stock</span>`;
    }

    // Deteksi Status Penjual & Asal Kota
    const rawSeller = (row["Penjual"] || "").trim();
    const isOfficial = !rawSeller || rawSeller.toLowerCase().includes("official") || rawSeller.toLowerCase() === "teater q" || rawSeller.toLowerCase().includes("pengurus") || rawSeller.toLowerCase().includes("sanggar");
    const sellerName = isOfficial ? "Official Teater Q" : rawSeller;
    const originCity = row["Kota Asal"] || row["Asal"] || (isOfficial ? "Surabaya" : "Kota Penjual");

    const badgeOriginHtml = isOfficial
      ? `<span class="badge-tag-origin badge-tag-official shadow-sm"><i class="fas fa-certificate text-amber-300 text-[8px]"></i> Official</span>`
      : `<span class="badge-tag-origin badge-tag-alumni shadow-sm"><i class="fas fa-handshake text-sky-300 text-[8px]"></i> Lapak</span>`;

    // Mini badges marketplace jika tersedia link
    let marketplaceBadgesHtml = "";
    if (linkShopee || linkTokopedia || linkTiktok) {
      marketplaceBadgesHtml = `
        <div class="flex items-center gap-1 mb-2 flex-wrap">
          ${linkShopee ? `<span class="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/30" title="Tersedia di Shopee"><i class="fas fa-shopping-bag text-[8px]"></i> Shopee</span>` : ''}
          ${linkTokopedia ? `<span class="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" title="Tersedia di Tokopedia"><i class="fas fa-store text-[8px]"></i> Tokped</span>` : ''}
          ${linkTiktok ? `<span class="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-pink-500/15 text-pink-400 border border-pink-500/30" title="Tersedia di TikTok Shop"><i class="fab fa-tiktok text-[8px]"></i> TikTok</span>` : ''}
        </div>
      `;
    }

    return `
      <article class="market-card" onclick="openCheckoutModal(${idx})" title="Klik untuk checkout ${escapeHtml(nama)}">
        <div class="market-card-img-wrap relative overflow-hidden group/img cursor-zoom-in" onclick="openProductPhotoDetail(${idx}); event.stopPropagation();" title="Klik untuk melihat foto ${escapeHtml(nama)} lebih jelas & detail">
          <img loading="lazy" src="${foto || DEFAULT_NO_IMAGE}" alt="${escapeHtml(nama)}" onerror="this.onerror=null; this.src=DEFAULT_NO_IMAGE;" />
          
          <!-- Badge Asal Toko di Pojok Kiri Atas Foto -->
          <div class="absolute top-1.5 left-1.5 z-10 pointer-events-none">
            ${badgeOriginHtml}
          </div>

          <!-- Tombol WA Cepat di Pojok Kanan Atas Foto -->
          ${waLink ? `
            <a href="${waLink}" target="_blank" rel="noopener" onclick="event.stopPropagation();" class="badge-tag-wa-overlay" title="Konsultasi WA Penjual">
              <i class="fab fa-whatsapp"></i>
            </a>
          ` : ''}

          <!-- Icon Zoom Foto di Pojok Kanan Bawah Foto -->
          <div class="absolute bottom-1.5 right-1.5 bg-slate-950/80 backdrop-blur-sm text-white text-[9px] font-semibold px-1.5 py-0.5 rounded opacity-80 group-hover/img:opacity-100 transition-opacity flex items-center gap-1 pointer-events-none">
            <i class="fas fa-search-plus text-amber-400 text-[8px]"></i>
          </div>
        </div>

        <div class="market-card-body">
          <div class="market-card-title">${escapeHtml(nama)}</div>
          <div class="market-card-price">${escapeHtml(harga)}</div>

          <!-- Indikator Status & Stok Barang -->
          <div class="flex items-center justify-between gap-1 mb-1.5 text-[10.5px]">
            <span class="badge-status ${badgeClass} text-[9px] py-0.5 px-1.5 font-bold">${escapeHtml(displayStatus)}</span>
            <span class="font-bold text-[10.5px] ${isStokHabis ? 'text-rose-400' : (hasNumStok && numStok <= 3 ? 'text-amber-400' : 'text-emerald-400')}">
              ${hasNumStok 
                ? (numStok <= 0 ? '<i class="fas fa-times-circle text-[9px]"></i> Habis' : (numStok <= 3 ? `<i class="fas fa-fire text-amber-400 text-[9px]"></i> Sisa: ${numStok}` : `<i class="fas fa-boxes text-[9px]"></i> Stok: ${numStok}`))
                : `<i class="fas fa-boxes text-[9px]"></i> Stok: ${escapeHtml(rawStok || 'Ready')}`}
            </span>
          </div>

          <div style="font-size:0.7rem; color:#94a3b8; margin-bottom:6px; display:flex; align-items:center; justify-content:space-between; gap:4px; overflow:hidden;">
            <span class="truncate"><i class="fas fa-map-marker-alt text-red-400 text-[9px]"></i> ${escapeHtml(originCity)}</span>
            <span class="shrink-0 text-slate-400 text-[10px] font-medium">• Terjual ${numTerjual}</span>
          </div>

          ${marketplaceBadgesHtml}

          <div class="market-card-actions">
            ${isAvailable ? `
              <button type="button" class="btn-order-market" onclick="openCheckoutModal(${idx}); event.stopPropagation();">
                <i class="fas fa-shopping-bag"></i> <span>Pesan</span>
              </button>
              <button type="button" class="btn-add-cart" onclick="addToCart(${idx}); event.stopPropagation();" title="Tambah ke Keranjang">
                <i class="fas fa-cart-plus"></i>
              </button>
            ` : `
              <button type="button" class="btn-order-market btn-order-po" onclick="openCheckoutModal(${idx}); event.stopPropagation();">
                <i class="fas fa-box-open"></i> <span>Pre-Order</span>
              </button>
              <button type="button" class="btn-add-cart" onclick="addToCart(${idx}); event.stopPropagation();" title="Tambah ke Keranjang">
                <i class="fas fa-cart-plus"></i>
              </button>
            `}
          </div>
        </div>
      </article>
    `;
  }).join("");

  updateCartBadge();
  setMarketViewMode(currentMarketViewMode);

  // Ekspos fungsi modal ke window global agar 100% aman dipanggil inline
  window.openProductPhotoDetail = openProductPhotoDetail;
  window.closeProductPhotoDetail = closeProductPhotoDetail;
  window.togglePhotoZoom = togglePhotoZoom;
  window.openProductPhotoDetailFromCheckout = openProductPhotoDetailFromCheckout;
  window.openSimplePhotoDetail = openSimplePhotoDetail;
  window.openCheckoutModal = openCheckoutModal;
  window.closeCheckoutModal = closeCheckoutModal;
  window.changeCheckoutQty = changeCheckoutQty;
  window.onDeliveryMethodChange = onDeliveryMethodChange;
  window.onSelectCityChange = onSelectCityChange;
  window.copyRekeningCheckout = copyRekeningCheckout;
  window.submitCheckoutWhatsApp = submitCheckoutWhatsApp;
  window.addToCart = addToCart;
  window.openCartModal = openCartModal;
  window.closeCartModal = closeCartModal;
  window.changeCartItemQty = changeCartItemQty;
  window.removeCartItem = removeCartItem;
  window.clearAllCart = clearAllCart;
  window.checkoutMultiItemFromCart = checkoutMultiItemFromCart;
  window.openModalBukaLapak = openModalBukaLapak;
  window.closeModalBukaLapak = closeModalBukaLapak;
  window.submitLapakAlumni = submitLapakAlumni;
  window.openModalBeliTiket = openModalBeliTiket;
  window.closeModalBeliTiket = closeModalBeliTiket;
  window.resetAndCloseTiketModal = resetAndCloseTiketModal;
  window.onKategoriTiketChange = onKategoriTiketChange;
  window.onFakultasChange = onFakultasChange;
  window.adjustTiketQty = adjustTiketQty;
  window.updateTiketCalculation = updateTiketCalculation;
  window.handleTiketFormSubmit = handleTiketFormSubmit;
  window.copyTiketKodeSuccess = copyTiketKodeSuccess;
  window.copyTextToClipboard = copyTextToClipboard;
  window.filterMarketplaceByCategory = filterMarketplaceByCategory;
  window.refreshMarketplaceLive = refreshMarketplaceLive;
  window.onTipeProdukChange = onTipeProdukChange;
  window.openMapPickerForCheckout = openMapPickerForCheckout;
  window.openKtaByIndex = openKtaByIndex;
  window.setMarketViewMode = setMarketViewMode;
  window.openKtaFromCurrentDetail = openKtaFromCurrentDetail;
  window.toggleKtaFlip = toggleKtaFlip;
  window.closeKtaModal = closeKtaModal;
  window.downloadKtaImage = downloadKtaImage;
  window.switchInfakTab = switchInfakTab;
  window.selectInfakPreset = selectInfakPreset;
  window.toggleAnonimInfak = toggleAnonimInfak;
  window.openZoomQris = openZoomQris;
  window.closeZoomQris = closeZoomQris;
  window.switchCheckoutPayTab = switchCheckoutPayTab;
  window.copyTotalCheckout = copyTotalCheckout;

  if (filtered.length > marketLimit) {
    if (btnContainer) btnContainer.style.display = "block";
    if (infoText) infoText.textContent = `${marketLimit} dari ${filtered.length} produk`;
  } else {
    if (btnContainer) btnContainer.style.display = "none";
  }
}

function loadMoreMarket() {
  marketLimit += 12;
  renderMarketplace();
}

function refreshMarketplaceLive() {
  localStorage.removeItem("tq_cache_marketplace");
  localStorage.removeItem("tq_alumni_products");
  localStorage.removeItem("teaterq_pentas_config");
  marketplaceLoaded = false;
  marketplaceLoading = false;
  showToast("Menyegarkan produk & kuota tiket...", "info");
  fetchPentasSetting();
  if (typeof fetchVipBalanceBackground === "function") fetchVipBalanceBackground(true);
  ensureMarketplaceLoaded();
}

async function ensureMarketplaceLoaded() {
  if (typeof updateQReloadBalanceDisplays === "function") updateQReloadBalanceDisplays();
  if (typeof fetchVipBalanceBackground === "function") fetchVipBalanceBackground();
  if (marketplaceLoaded && marketplaceData.length > 0) {
    renderMarketplace();
    return;
  }

  const cacheKey = "tq_cache_marketplace";
  const cachedData = localStorage.getItem(cacheKey);

  // Ambil produk alumni tersimpan agar tetap ada saat refresh
  let alumniProducts = [];
  try {
    const rawAlumni = localStorage.getItem("tq_alumni_products");
    if (rawAlumni) alumniProducts = JSON.parse(rawAlumni);
  } catch(e) {
    alumniProducts = [];
  }

  if (cachedData && marketplaceData.length === 0) {
    try {
      marketplaceData = JSON.parse(cachedData);
      renderMarketplace();
    } catch(e) {}
  }
  if (marketplaceLoading) return;
  marketplaceLoading = true;
  try {
    let newData = null;

    // 1. Prioritas Utama: Ambil data realtime via Google Apps Script (GAS) persis seperti Dana Abadi (0 detik delay)
    if (typeof SCRIPT_MARKETPLACE !== "undefined" && SCRIPT_MARKETPLACE) {
      try {
        const separator = SCRIPT_MARKETPLACE.includes('?') ? '&' : '?';
        const resp = await fetch(SCRIPT_MARKETPLACE + separator + "action=get_products&t=" + Date.now(), { 
          cache: "no-store" 
        });
        const text = await resp.text();
        if (text.trim().startsWith("[") || text.trim().startsWith("{")) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed) && parsed.length > 0) {
            newData = parsed;
          }
        }
      } catch (errGas) {
        console.warn("Sinkronisasi realtime GAS Marketplace gagal, beralih ke cadangan TSV:", errGas);
      }
    }

    // 2. Prioritas Cadangan: Fallback ke TSV jika GAS belum merespon atau offline
    if (!newData || newData.length === 0) {
      newData = await loadTSV(URL_MARKETPLACE);
    }

    if (newData && Array.isArray(newData)) {
      // Spreadsheet adalah Single Source of Truth: apa yang ada di spreadsheet, itu yang tampil
      // Bersihkan local storage agar produk yang sudah dihapus di spreadsheet tidak bangkit lagi
      try {
        localStorage.removeItem("tq_alumni_products");
      } catch(e) {}

      marketplaceData = newData;
      localStorage.setItem(cacheKey, JSON.stringify(marketplaceData));
      marketplaceLoaded = true;
      renderMarketplace();
    }
  } catch (e) {
    console.error("Gagal memuat marketplace:", e);
  } finally {
    marketplaceLoading = false;
  }
}

// ============================================================================
// 9. GALERI & ARSIP KARYA
// ============================================================================
function parseGaleriDate(dateStr) {
  if (!dateStr) return 0;
  const str = String(dateStr).trim();

  // 1. Coba parseDateToTimestamp bawaan (DD/MM/YYYY, YYYY-MM-DD, dsb)
  let ts = parseDateToTimestamp(str);
  if (ts > 0) return ts;

  // 2. Jika ada pemisah rentang strip '-' atau 's/d', coba bagian pertama atau kedua
  if (str.includes(" - ") || str.includes(" s/d ")) {
    const parts = str.split(/\s+(?:-|s\/d)\s+/i);
    for (let part of parts) {
      const pTs = parseDateToTimestamp(part.trim());
      if (pTs > 0) return pTs;
    }
  }

  // 3. Format 'Bulan Tahun' contoh: 'Agustus 2025'
  const bulanMap = {
    "januari": 0, "jan": 0, "februari": 1, "feb": 1, "maret": 2, "mar": 2,
    "april": 3, "apr": 3, "mei": 4, "may": 4, "juni": 5, "jun": 5,
    "juli": 6, "jul": 6, "agustus": 7, "agu": 7, "aug": 7, "september": 8, "sep": 8,
    "oktober": 9, "okt": 9, "november": 10, "nov": 10, "desember": 11, "des": 11
  };
  const monthYearMatch = str.match(/([a-zA-Z]+)\s+(\d{4})/);
  if (monthYearMatch) {
    const mName = monthYearMatch[1].toLowerCase();
    const yNum = parseInt(monthYearMatch[2], 10);
    if (bulanMap[mName] !== undefined && yNum) {
      return new Date(yNum, bulanMap[mName], 1).getTime();
    }
  }

  // 4. Deteksi tahun 4 digit jika ada
  const yearMatch = str.match(/\b(19\d\d|20\d\d)\b/);
  if (yearMatch) {
    return new Date(parseInt(yearMatch[1], 10), 0, 1).getTime();
  }

  return 0;
}

let currentGaleriYear = "all";

function getGaleriYear(row) {
  if (!row) return "";
  const clean = {};
  Object.keys(row || {}).forEach(k => clean[k.trim().toLowerCase()] = String(row[k] ?? "").trim());
  const tgl = clean["tanggal"] || clean["tanggal kegiatan"] || clean["tgl"] || "";

  // 1. Coba match tahun 4 digit dari tanggal (DD/MM/YYYY atau YYYY-MM-DD)
  const dMatch = tgl.match(/\b(19\d\d|20\d\d)\b/);
  if (dMatch) return dMatch[1];

  // 2. Coba parseGaleriDate
  const ts = parseGaleriDate(tgl);
  if (ts > 0) {
    return String(new Date(ts).getFullYear());
  }

  // 3. Fallback: match tahun dari nama kegiatan
  const nama = clean["nama kegiatan"] || clean["nama"] || clean["judul"] || "";
  const nMatch = nama.match(/\b(19\d\d|20\d\d)\b/);
  if (nMatch) return nMatch[1];

  return "";
}

function toggleGaleriYearDropdown() {
  const menu = document.getElementById("customGaleriYearMenu");
  const arrow = document.getElementById("iconGaleriYearArrow");
  if (!menu) return;

  const isHidden = menu.classList.contains("hidden");
  if (isHidden) {
    menu.classList.remove("hidden");
    if (arrow) arrow.classList.add("rotate-180");
    const searchInput = document.getElementById("searchGaleriYearFilter");
    if (searchInput) {
      searchInput.value = "";
      filterGaleriYearListItems("");
      // PENTING: JANGAN auto-focus agar keyboard di HP tidak otomatis muncul!
    }
  } else {
    closeGaleriYearDropdown();
  }
}

function closeGaleriYearDropdown() {
  const menu = document.getElementById("customGaleriYearMenu");
  const arrow = document.getElementById("iconGaleriYearArrow");
  if (menu) menu.classList.add("hidden");
  if (arrow) arrow.classList.remove("rotate-180");
}

function filterGaleriYearListItems(query) {
  const q = (query || "").toLowerCase().trim();
  const items = document.querySelectorAll("#customGaleriYearList .custom-galeri-year-btn");
  items.forEach(it => {
    const text = (it.dataset.year || it.textContent).toLowerCase();
    it.style.display = (!q || text.includes(q)) ? "flex" : "none";
  });
}

function selectCustomGaleriYear(year, displayLabel) {
  currentGaleriYear = String(year || "all").trim();
  const labelEl = document.getElementById("selectedGaleriYearLabel");
  if (labelEl) {
    labelEl.textContent = displayLabel || (currentGaleriYear === "all" ? "Semua Tahun" : `Tahun ${currentGaleriYear}`);
  }

  const items = document.querySelectorAll("#customGaleriYearList .custom-galeri-year-btn");
  items.forEach(it => {
    const itYear = (it.dataset.year || "");
    const match = (currentGaleriYear === "all" && (itYear === "all" || !itYear)) || (itYear === currentGaleriYear);
    if (match) {
      it.className = "custom-galeri-year-btn active w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors bg-purple-600/20 text-purple-300 font-bold border border-purple-500/30";
    } else {
      it.className = "custom-galeri-year-btn w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors text-slate-300 hover:bg-slate-800 hover:text-white";
    }
  });

  closeGaleriYearDropdown();
  galeriLimit = 12;
  renderGaleri();
}

function populateGaleriYearFilter() {
  const customList = document.getElementById("customGaleriYearList");
  if (!customList) return;

  const yearCounts = {};
  galeriData.forEach(row => {
    const y = getGaleriYear(row);
    if (y) {
      yearCounts[y] = (yearCounts[y] || 0) + 1;
    }
  });

  const sortedYears = Object.keys(yearCounts).sort((a, b) => parseInt(b, 10) - parseInt(a, 10));

  let html = `
    <button type="button" data-year="all" onclick="selectCustomGaleriYear('all', 'Semua Tahun')" class="custom-galeri-year-btn ${currentGaleriYear === 'all' ? 'active' : ''} w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${currentGaleriYear === 'all' ? 'bg-purple-600/20 text-purple-300 font-bold border border-purple-500/30' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}">
      <span class="flex items-center gap-2">
        <i class="fas fa-calendar-check text-purple-400"></i>
        <span>Semua Tahun</span>
      </span>
      <span class="galeri-year-count-badge text-[11px] font-bold px-2 py-0.5 rounded-full font-mono">${galeriData.length}</span>
    </button>
  `;

  sortedYears.forEach(y => {
    const isAct = currentGaleriYear === y;
    html += `
      <button type="button" data-year="${y}" onclick="selectCustomGaleriYear('${y}', 'Tahun ${y}')" class="custom-galeri-year-btn ${isAct ? 'active' : ''} w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${isAct ? 'bg-purple-600/20 text-purple-300 font-bold border border-purple-500/30' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}">
        <span class="flex items-center gap-2">
          <i class="far fa-calendar-alt text-slate-400"></i>
          <span>Tahun ${y}</span>
        </span>
        <span class="galeri-year-count-badge text-[11px] font-bold px-2 py-0.5 rounded-full font-mono">${yearCounts[y]}</span>
      </button>
    `;
  });

  customList.innerHTML = html;
}

function sortGaleriByNewest(list) {
  if (!Array.isArray(list)) return [];
  return [...list].sort((a, b) => {
    const cleanA = {};
    Object.keys(a || {}).forEach(k => cleanA[k.trim().toLowerCase()] = String(a[k] ?? "").trim());
    const cleanB = {};
    Object.keys(b || {}).forEach(k => cleanB[k.trim().toLowerCase()] = String(b[k] ?? "").trim());

    const tglA = cleanA["tanggal"] || cleanA["tanggal kegiatan"] || cleanA["tgl"] || "";
    const tglB = cleanB["tanggal"] || cleanB["tanggal kegiatan"] || cleanB["tgl"] || "";

    const timeA = parseGaleriDate(tglA);
    const timeB = parseGaleriDate(tglB);
    return timeB - timeA;
  });
}

function renderGaleri() {
  const container = document.getElementById("galeriGrid");
  const btnContainer = document.getElementById("btnMoreGaleri");
  const infoText = document.getElementById("infoGaleri");
  if (!container) return;

  const keyword = (document.getElementById("searchGaleri")?.value || "").toLowerCase().trim();
  const filtered = galeriData.filter(row => {
    const cleanItem = {};
    Object.keys(row || {}).forEach(k => {
      cleanItem[k.trim().toLowerCase()] = String(row[k] ?? "").trim();
    });
    const nama = (cleanItem["nama kegiatan"] || cleanItem["nama"] || cleanItem["judul"] || cleanItem["kegiatan"] || "").toLowerCase();
    const tgl  = (cleanItem["tanggal"] || cleanItem["tanggal kegiatan"] || cleanItem["tgl"] || "").toLowerCase();

    // 1. Cocokkan kata kunci pencarian jika sedang diisi
    const matchKeyword = !keyword || nama.includes(keyword) || tgl.includes(keyword);

    // 2. Cocokkan filter tahun
    const rowYear = getGaleriYear(row);
    const matchYear = (currentGaleriYear === "all") || (rowYear === currentGaleriYear);

    return matchKeyword && matchYear;
  });

  // Urutkan album galeri dari tanggal terbaru ke terlama (Descending)
  const sorted = sortGaleriByNewest(filtered);

  updateSectionCounter("galeri", sorted.length);

  if (!sorted.length) {
    const yearMsg = currentGaleriYear !== "all" ? ` untuk tahun ${currentGaleriYear}` : "";
    const keyMsg = keyword ? ` dengan kata kunci "${escapeHtml(keyword)}"` : "";
    container.innerHTML = `<div class="col-span-full text-center py-10 text-slate-400 text-xs sm:text-sm">Tidak ada galeri kegiatan${yearMsg}${keyMsg}.</div>`;
    if (btnContainer) btnContainer.style.display = "none";
    return;
  }

  const dataToRender = sorted.slice(0, galeriLimit);
  container.innerHTML = dataToRender.map(item => {
    const cleanItem = {};
    Object.keys(item || {}).forEach(k => {
      cleanItem[k.trim().toLowerCase()] = String(item[k] ?? "").trim();
    });

    const foto = convertDriveImage(cleanItem["link website"] || cleanItem["link foto website"] || cleanItem["link foto"] || cleanItem["foto utama"] || cleanItem["foto"] || "");
    const linkPhotos = cleanItem["link photos"] || cleanItem["photos"] || "";
    const linkDrive  = cleanItem["link drive"] || cleanItem["drive"] || "";
    const namaKegiatan = cleanItem["nama kegiatan"] || cleanItem["nama"] || cleanItem["judul"] || cleanItem["kegiatan"] || "-";
    const tanggal = cleanItem["tanggal"] || cleanItem["tanggal kegiatan"] || "-";

    return `
      <article class="card">
        ${foto ? `<img loading="lazy" src="${foto}" class="gallery-image js-lightbox" data-full="${foto}" alt="${escapeHtml(namaKegiatan)}" onerror="this.onerror=null; this.src=DEFAULT_NO_IMAGE;" />` : ""}
        <div class="card-title">${escapeHtml(namaKegiatan)}</div>
        <div class="card-sub">${escapeHtml(tanggal)}</div>
        <div class="card-footer" style="justify-content:flex-start; gap:5px;">
           ${linkPhotos ? `<a href="${linkPhotos}" target="_blank" class="btn btn-primary btn-sm">👁️ Foto</a>` : ""}
           ${linkDrive ? `<a href="${linkDrive}" target="_blank" class="btn btn-outline btn-sm">📂 Album</a>` : ""}
        </div>
      </article>
    `;
  }).join("");

  if (sorted.length > galeriLimit) {
    if (btnContainer) btnContainer.style.display = "block";
    if (infoText) infoText.textContent = `${galeriLimit} dari ${sorted.length} album`;
  } else {
    if (btnContainer) btnContainer.style.display = "none";
  }
}

function loadMoreGaleri() {
  galeriLimit += 12;
  renderGaleri();
}

async function ensureGaleriLoaded(forceRefresh = false) {
  const iconRefresh = document.getElementById("iconRefreshGaleri");
  if (iconRefresh) iconRefresh.classList.add("fa-spin");

  if (galeriLoaded && galeriData.length > 0 && !forceRefresh) {
    populateGaleriYearFilter();
    renderGaleri();
    if (iconRefresh) iconRefresh.classList.remove("fa-spin");
    return;
  }

  const cacheKey = "tq_cache_galeri_v4";
  // Hapus cache lama versi 3 agar data lama yang sempat tersimpan langsung terhapus bersih
  try {
    localStorage.removeItem("tq_cache_galeri_v3");
    localStorage.removeItem("tq_cache_galeri");
  } catch(e) {}

  if (!forceRefresh) {
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData && galeriData.length === 0) {
      try {
        galeriData = sortGaleriByNewest(JSON.parse(cachedData));
        populateGaleriYearFilter();
        renderGaleri();
      } catch(e) {}
    }
  }

  if (galeriLoading) {
    if (iconRefresh) iconRefresh.classList.remove("fa-spin");
    return;
  }
  galeriLoading = true;

  try {
    let newData = null;

    // 1. Prioritaskan Cloud Supabase (Pure Realtime & Kilat 30ms)
    if (window.SupabaseDB && window.SupabaseDB.isConfigured()) {
      try {
        newData = await window.SupabaseDB.getGaleri();
      } catch (errSb) {
        console.warn("[Galeri] Supabase fetch error, fallback ke TSV:", errSb);
      }
    }

    // 2. Fallback ke Published TSV jika Supabase belum siap
    if (!newData || newData.length === 0) {
      newData = await loadTSV(URL_GALERI);
    }

    if (newData && newData.length > 0) {
      galeriData = sortGaleriByNewest(newData);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(galeriData));
      } catch(e) {}
      galeriLoaded = true;
      populateGaleriYearFilter();
      renderGaleri();
      if (forceRefresh && typeof showToast === "function") {
        showToast(`Galeri berhasil disinkronkan! (${galeriData.length} album termuat)`, "success");
      }
    }
  } catch (e) {
    console.error("Gagal memuat data galeri:", e);
    if (forceRefresh && typeof showToast === "function") {
      showToast("Gagal memperbarui galeri: " + (e.message || "Koneksi lambat"), "error");
    }
  } finally {
    galeriLoading = false;
    if (iconRefresh) iconRefresh.classList.remove("fa-spin");
  }
}

window.ensureGaleriLoaded = ensureGaleriLoaded;
window.toggleGaleriYearDropdown = toggleGaleriYearDropdown;
window.closeGaleriYearDropdown = closeGaleriYearDropdown;
window.filterGaleriYearListItems = filterGaleriYearListItems;
window.selectCustomGaleriYear = selectCustomGaleriYear;
window.populateGaleriYearFilter = populateGaleriYearFilter;
window.loadMoreGaleri = loadMoreGaleri;
window.renderGaleri = renderGaleri;

let activeArsipSource = "";
let selectedArsipDocBase64 = "";
let selectedArsipDocName = "";
let selectedArsipDocMime = "";
let selectedArsipDocSizeStr = "";

function setArsipSourceFilter(source) {
  activeArsipSource = source || "";
  arsipLimit = 20;

  const tabs = document.querySelectorAll("#arsipSourceTabs .arsip-source-btn");
  tabs.forEach(btn => {
    const btnSrc = btn.getAttribute("data-source") || "";
    if (btnSrc === activeArsipSource) {
      btn.className = "arsip-source-btn active px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 bg-amber-500 text-slate-950 shrink-0 shadow-sm cursor-pointer";
    } else {
      btn.className = "arsip-source-btn px-3.5 py-1.5 rounded-xl font-medium transition text-slate-400 hover:text-white bg-slate-800/80 shrink-0 hover:bg-slate-800 border border-slate-700/80 cursor-pointer";
    }
  });

  renderArsip();
}

function toggleClearSearchArsipBtn() {
  const input = document.getElementById("searchArsip");
  const btn = document.getElementById("btnClearSearchArsip");
  if (!btn) return;
  if (input && input.value.trim().length > 0) {
    btn.classList.remove("hidden");
  } else {
    btn.classList.add("hidden");
  }
}

function clearSearchArsip() {
  const input = document.getElementById("searchArsip");
  if (input) {
    input.value = "";
    input.focus();
    toggleClearSearchArsipBtn();
    arsipLimit = 20;
    renderArsip();
  }
}

function renderArsip() {
  const container = document.getElementById("arsipGrid");
  const btnContainer = document.getElementById("btnMoreArsip");
  const infoText = document.getElementById("infoArsip");
  if (!container) return;

  const keyword = (document.getElementById("searchArsip")?.value || "").toLowerCase().trim();
  const filtered = arsipData.filter(row => {
    // 1. Filter Asal Karya jika ada tab aktif
    if (activeArsipSource) {
      const asal = String(row["Asal Karya"] || row["ASAL KARYA"] || row["asal karya"] || row["asal_karya"] || row["Asal"] || "").trim().toLowerCase();
      const isTeaterQ = asal.includes("teater q") || asal.includes("internal");
      if (activeArsipSource === "Karya Teater Q" && !isTeaterQ) return false;
      if (activeArsipSource === "Karya Luar" && isTeaterQ) return false;
    }

    // 2. Filter Keyword Search
    const kategori = (row["KATEGORI"] || row["Kategori"] || row["kategori"] || "").toLowerCase();
    const nama     = (row["NAMA KARYA"] || row["Nama Karya"] || row["nama karya"] || row["nama"] || "").toLowerCase();
    const pencipta = (row["PENCIPTA"] || row["Pencipta"] || row["pencipta"] || "").toLowerCase();
    return !keyword || `${kategori} ${nama} ${pencipta}`.includes(keyword);
  });
  updateSectionCounter("arsip", filtered.length);

  // Update total badge
  const totalBadge = document.getElementById("badgeArsipTotal");
  if (totalBadge) totalBadge.textContent = arsipData.length;

  if (!filtered.length) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; background: rgba(15,23,42,0.4); border-radius: 1.5rem; border: 1px dashed rgba(51,65,85,0.7);">
        <i class="fa-solid fa-folder-open" style="font-size: 2.2rem; color: #64748b; margin-bottom: 12px; display: inline-block;"></i>
        <h4 style="color: #f1f5f9; font-weight: 700; margin-bottom: 4px; font-size: 0.95rem;">Tidak Ada Arsip yang Sesuai</h4>
        <p style="color: #94a3b8; font-size: 0.8rem; max-width: 360px; margin: 0 auto;">Coba ganti filter asal karya atau gunakan kata kunci pencarian naskah lainnya.</p>
      </div>`;
    if (btnContainer) btnContainer.style.display = "none";
    return;
  }

  const dataToRender = filtered.slice(0, arsipLimit);
  container.innerHTML = dataToRender.map(row => {
    const rawIdx   = arsipData.indexOf(row);
    const kategori = row["KATEGORI"] || row["Kategori"] || row["kategori"] || "-";
    const nama     = row["NAMA KARYA"] || row["Nama Karya"] || row["nama karya"] || row["nama"] || "-";
    const pencipta = row["PENCIPTA"] || row["Pencipta"] || row["pencipta"] || "-";
    const fileUrl  = (row["FILE"] || row["File"] || row["file"] || row["LINK FILE"] || row["Link File"] || "").trim();
    const rawAsal  = String(row["Asal Karya"] || row["ASAL KARYA"] || row["asal karya"] || row["asal_karya"] || "").trim();
    const isTeaterQ = rawAsal.toLowerCase().includes("teater q") || rawAsal.toLowerCase().includes("internal");

    const asalBadgeHtml = isTeaterQ
      ? `<span style="display:inline-flex; align-items:center; gap:4px; font-size:10px; font-weight:700; padding:2px 8px; border-radius:6px; background:rgba(245, 158, 11, 0.15); color:#fbbf24; border:1px solid rgba(245, 158, 11, 0.35);">
          <i class="fa-solid fa-crown" style="font-size:9px;"></i>
          <span>Karya Teater Q</span>
        </span>`
      : `<span style="display:inline-flex; align-items:center; gap:4px; font-size:10px; font-weight:600; padding:2px 8px; border-radius:6px; background:rgba(100, 116, 139, 0.2); color:#cbd5e1; border:1px solid rgba(100, 116, 139, 0.35);">
          <i class="fa-solid fa-book-open" style="font-size:9px;"></i>
          <span>Karya Luar</span>
        </span>`;

    return `
      <article class="card">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; margin-bottom:8px;">
          <div class="card-sub" style="margin-bottom:0;">${escapeHtml(kategori)}</div>
          ${asalBadgeHtml}
        </div>
        <div class="card-title">${escapeHtml(nama)}</div>
        <div class="card-body"><p><strong>Pencipta:</strong> ${escapeHtml(pencipta)}</p></div>
        <div class="card-footer" style="justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          ${fileUrl 
            ? `<div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                <button type="button" onclick="openArsipPaperless(${rawIdx})" style="display:inline-flex; align-items:center; gap:6px; padding:6px 12px; border-radius:10px; font-size:12px; font-weight:700; background:linear-gradient(135deg, #14b8a6, #059669); color:#022c22; border:none; cursor:pointer; box-shadow:0 2px 8px rgba(20,184,166,0.3); transition:all 0.2s;" onmouseover="this.style.filter='brightness(1.1)'" onmouseout="this.style.filter='brightness(1)'">
                  <i class="fa-solid fa-book-open"></i>
                  <span>Baca Paperless</span>
                </button>
                <a href="${escapeHtml(fileUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px; border-radius:10px; background:#1e293b; color:#cbd5e1; border:1px solid #334155; text-decoration:none; transition:all 0.2s;" title="Buka Dokumen Asli">
                  <i class="fa-solid fa-arrow-up-right-from-square" style="font-size:11px;"></i>
                </a>
              </div>` 
            : `<span style="display:inline-flex; align-items:center; gap:5px; font-size:11px; color:#94a3b8; font-style:italic;">
                <i class="fa-regular fa-clock" style="color:#f59e0b; font-size:10px;"></i>
                <span>File fisik di sanggar</span>
              </span>`
          }
          <span style="font-size:10px; color:#64748b; font-weight:600; display:inline-flex; align-items:center; gap:4px;">
            <i class="fa-solid fa-box-archive" style="font-size:9px; color:#14b8a6;"></i>
            <span>Arsip Sanggar</span>
          </span>
        </div>
      </article>
    `;
  }).join("");

  if (filtered.length > arsipLimit) {
    if (btnContainer) btnContainer.style.display = "block";
    if (infoText) infoText.textContent = `${arsipLimit} dari ${filtered.length} arsip`;
  } else {
    if (btnContainer) btnContainer.style.display = "none";
  }
}

function loadMoreArsip() {
  arsipLimit += 20;
  renderArsip();
}

async function ensureArsipLoaded(forceRefresh = false) {
  const iconRefresh = document.getElementById("refreshArsipIcon");
  if (forceRefresh && iconRefresh) iconRefresh.classList.add("fa-spin");

  const cacheKey = "tq_cache_arsip_live";

  if (!forceRefresh && arsipLoaded && arsipData.length > 0) {
    renderArsip();
    return;
  }

  // Jika forceRefresh atau pertama kali, bersihkan cache lokal usang
  if (forceRefresh) {
    try {
      localStorage.removeItem("tq_cache_arsip");
      localStorage.removeItem("tq_cache_arsip_v2");
      localStorage.removeItem("tq_cache_arsip_live");
    } catch(e) {}
  } else {
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData && arsipData.length === 0) {
      try {
        arsipData = JSON.parse(cachedData);
        renderArsip();
      } catch(e) {}
    }
  }

  if (arsipLoading) return;
  arsipLoading = true;

  try {
    let newData = null;

    // 1. Jalur Utama: Supabase Cloud (Pure Database Kilat & Realtime)
    if (window.SupabaseDB && window.SupabaseDB.isConfigured()) {
      try {
        const res = await window.SupabaseDB.getArsip();
        if (Array.isArray(res) && res.length > 0) {
          newData = res;
        } else if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
          newData = res.data;
        }
      } catch (errSb) {
        console.warn("[Arsip] Supabase fetch error, fallback ke GVIZ/TSV:", errSb);
      }
    }

    // 2. Jalur Cadangan: GVIZ Realtime Direct
    if (!newData || newData.length === 0) {
      try {
        const gvizUrl = (typeof URL_ARSIP_GVIZ !== "undefined" && URL_ARSIP_GVIZ)
          ? URL_ARSIP_GVIZ
          : "https://docs.google.com/spreadsheets/d/12sq7P9_5uwFHC9UpJHU7fWT8kbxG_L54e7XGEzYL-mA/gviz/tq?tqx=out:json&sheet=Arsip&headers=1";
        
        const gvizRows = await fetchGvizTable(gvizUrl);
        if (Array.isArray(gvizRows) && gvizRows.length > 0) {
          newData = gvizRows;
        }
      } catch (gvizErr) {
        console.warn("GVIZ realtime arsip gagal, mencoba TSV:", gvizErr);
      }
    }

    // 3. Jalur Terakhir: Published TSV
    if (!newData || newData.length === 0) {
      newData = await loadTSV(URL_ARSIP);
    }

    if (newData && newData.length > 0) {
      arsipData = newData;
      try {
        localStorage.setItem(cacheKey, JSON.stringify(newData));
      } catch(e) {}
      arsipLoaded = true;
      renderArsip();
      if (forceRefresh && typeof showToast === "function") {
        showToast(`Bank naskah berhasil disinkronkan langsung dari basis data! (${arsipData.length} naskah)`, "success");
      }
    }
  } catch (e) {
    console.error("Gagal memuat arsip:", e);
    if (forceRefresh && typeof showToast === "function") {
      showToast("Gagal memperbarui data arsip: " + (e.message || "Koneksi lambat"), "error");
    }
  } finally {
    arsipLoading = false;
    if (iconRefresh) iconRefresh.classList.remove("fa-spin");
  }
}

// ============================================================================
// SISTEM NOTIFIKASI TELEGRAM OTOMATIS ADMIN TEATER Q
// ============================================================================
async function sendTelegramAdminNotification(htmlMessage, photoData = null) {
  try {
    const cfg = (typeof TELEGRAM_ADMIN_BOT !== "undefined" && TELEGRAM_ADMIN_BOT) ? TELEGRAM_ADMIN_BOT : null;
    if (!cfg || !cfg.enabled || !cfg.botToken || !cfg.chatId) return;

    // Jika ada lampiran foto (Base64 dari file input seperti bukti transfer tiket)
    if (photoData && typeof photoData === "string" && photoData.startsWith("data:image")) {
      try {
        const parts = photoData.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const blobBin = atob(parts[1]);
        const array = [];
        for (let i = 0; i < blobBin.length; i++) {
          array.push(blobBin.charCodeAt(i));
        }
        const photoBlob = new Blob([new Uint8Array(array)], { type: mimeType });
        const formData = new FormData();
        formData.append('chat_id', cfg.chatId);
        formData.append('photo', photoBlob, 'bukti.jpg');
        // Telegram caption limit adalah 1024 karakter
        const captionText = htmlMessage.length > 1024 ? (htmlMessage.substring(0, 1020) + '...') : htmlMessage;
        formData.append('caption', captionText);
        formData.append('parse_mode', 'HTML');

        const res = await fetch(`https://api.telegram.org/bot${cfg.botToken}/sendPhoto`, {
          method: 'POST',
          body: formData
        });
        if (res.ok) return;
      } catch (errPhoto) {
        console.warn("Gagal mengirim foto via Telegram sendPhoto, fallback ke sendMessage:", errPhoto);
      }
    }

    const url = `https://api.telegram.org/bot${cfg.botToken}/sendMessage`;
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: cfg.chatId,
        text: htmlMessage,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        link_preview_options: { is_disabled: true }
      })
    }).catch(err => console.warn("Telegram notif error:", err));
  } catch (err) {
    console.warn("Gagal mengirim notifikasi Telegram:", err);
  }
}
window.sendTelegramAdminNotification = sendTelegramAdminNotification;

// ============================================================================
// MODAL KIRIM ARSIP NASKAH & DOKUMEN KE DATABASE SERVER
// ============================================================================
function openModalKirimArsip() {
  const modal = document.getElementById("modalKirimArsip");
  if (!modal) return;

  // Auto-fill pencipta jika ada sesi user login
  const inputPencipta = document.getElementById("arsipInputPencipta");
  try {
    const rawSess = localStorage.getItem("tq_user_session");
    if (rawSess) {
      const sess = JSON.parse(rawSess);
      if (sess && inputPencipta && !inputPencipta.value) {
        inputPencipta.value = sess.nama || sess.namaLengkap || "";
      }
    }
  } catch(e) {}

  modal.classList.remove("hidden");
  modal.classList.add("flex");
  modal.removeAttribute("aria-hidden");
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => {
    modal.classList.remove("opacity-0");
    modal.classList.add("opacity-100");
  });
}

function closeModalKirimArsip() {
  const modal = document.getElementById("modalKirimArsip");
  if (!modal) return;
  if (document.activeElement && modal.contains(document.activeElement)) {
    document.activeElement.blur();
  }
  modal.classList.remove("opacity-100");
  modal.classList.add("opacity-0");
  modal.setAttribute("aria-hidden", "true");
  setTimeout(() => {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    document.body.style.overflow = "";
  }, 200);
}

function resetModalKirimArsip() {
  const form = document.getElementById("formKirimArsip");
  if (form) form.reset();
  removeArsipDokumen();
}

function previewArsipDokumen(input) {
  if (!input || !input.files || !input.files[0]) return;
  const file = input.files[0];

  // Batas ukuran 15 MB
  if (file.size > 15 * 1024 * 1024) {
    if (typeof showToast === "function") showToast("Ukuran file naskah maksimal 15 MB!", "warning");
    input.value = "";
    return;
  }

  const sizeKb = file.size / 1024;
  selectedArsipDocSizeStr = sizeKb > 1024 ? (sizeKb / 1024).toFixed(1) + " MB" : Math.round(sizeKb) + " KB";
  selectedArsipDocName = file.name;
  selectedArsipDocMime = file.type || "application/octet-stream";

  const ext = file.name.split('.').pop().toLowerCase();
  const iconEl = document.getElementById("arsipDocIcon");
  if (iconEl) {
    if (ext === "pdf") {
      iconEl.className = "fa-solid fa-file-pdf text-rose-400";
    } else if (ext === "doc" || ext === "docx") {
      iconEl.className = "fa-solid fa-file-word text-blue-400";
    } else {
      iconEl.className = "fa-solid fa-file-lines text-teal-400";
    }
  }

  const nameEl = document.getElementById("arsipDocName");
  const sizeEl = document.getElementById("arsipDocSize");
  if (nameEl) nameEl.textContent = file.name;
  if (sizeEl) sizeEl.textContent = `${selectedArsipDocSizeStr} • Berkas siap diunggah`;

  const reader = new FileReader();
  reader.onload = function(e) {
    selectedArsipDocBase64 = e.target.result;
    const emptyState = document.getElementById("arsipDocEmptyState");
    const previewState = document.getElementById("arsipDocPreviewState");
    if (emptyState) emptyState.classList.add("hidden");
    if (previewState) {
      previewState.classList.remove("hidden");
      previewState.classList.add("flex");
    }
  };
  reader.readAsDataURL(file);
}

function removeArsipDokumen() {
  selectedArsipDocBase64 = "";
  selectedArsipDocName = "";
  selectedArsipDocMime = "";
  selectedArsipDocSizeStr = "";

  const input = document.getElementById("arsipInputFileDokumen");
  if (input) input.value = "";

  const emptyState = document.getElementById("arsipDocEmptyState");
  const previewState = document.getElementById("arsipDocPreviewState");
  if (emptyState) emptyState.classList.remove("hidden");
  if (previewState) {
    previewState.classList.add("hidden");
    previewState.classList.remove("flex");
  }
}

async function submitArsipKarya(e) {
  if (e && e.preventDefault) e.preventDefault();

  const kategori = document.getElementById("arsipInputKategori")?.value || "Sastra/Naskah";
  const asalKarya = document.getElementById("arsipInputAsalKarya")?.value || "Karya Luar";
  const judul = (document.getElementById("arsipInputJudul")?.value || "").trim();
  const pencipta = (document.getElementById("arsipInputPencipta")?.value || "").trim();
  const driveUrl = (document.getElementById("arsipInputDriveUrl")?.value || "").trim();

  if (!judul || !pencipta) {
    if (typeof showToast === "function") showToast("Harap isi Judul Naskah dan Nama Pencipta!", "warning");
    return;
  }

  const btn = document.getElementById("btnSubmitArsipModal");
  const icon = document.getElementById("iconSubmitArsip");
  const label = document.getElementById("labelSubmitArsip");

  if (btn) btn.disabled = true;
  if (icon) icon.className = "fa-solid fa-spinner fa-spin";
  if (label) label.textContent = "Menyimpan Arsip...";

  try {
    let fileDokumenUrl = driveUrl || "";
    let rawBase64 = "";

    // Pastikan membaca berkas langsung dari elemen input jika FileReader sebelumnya belum sempat selesai
    const fileInputEl = document.getElementById("arsipInputFileDokumen");
    if (!selectedArsipDocBase64 && fileInputEl && fileInputEl.files && fileInputEl.files[0]) {
      try {
        const pickedFile = fileInputEl.files[0];
        selectedArsipDocBase64 = await new Promise((res, rej) => {
          const fr = new FileReader();
          fr.onload = ev => res(ev.target.result);
          fr.onerror = rej;
          fr.readAsDataURL(pickedFile);
        });
        selectedArsipDocName = pickedFile.name;
        selectedArsipDocMime = pickedFile.type || "application/octet-stream";
      } catch(errRead) {
        console.warn("Gagal membaca berkas naskah:", errRead);
      }
    }

    // 1. Jika ada berkas naskah yang dipilih dari perangkat, unggah ke Google Drive ke folder "Arsip"
    if (selectedArsipDocBase64) {
      if (label) label.textContent = "Mengunggah Berkas ke Folder Arsip Drive...";
      const fileName = "Arsip-" + Date.now() + "-" + (selectedArsipDocName || "naskah.pdf");
      const mime = selectedArsipDocMime || "application/pdf";

      fileDokumenUrl = await uploadFileToTargetDrive(
        selectedArsipDocBase64,
        fileName,
        mime,
        "Arsip"
      );

      // Validasi mutlak: Jika pengguna melampirkan berkas fisik tetapi proses upload gagal/timeout
      if (!fileDokumenUrl && !driveUrl) {
        if (typeof showToast === "function") {
          showToast("Unggah berkas ke Google Drive belum tuntas / koneksi terputus. Mohon kirim ulang!", "warning");
        }
        return;
      }
    }

    if (label) label.textContent = "Menyimpan ke Cloud Supabase...";
    const finalKodeId = `ARS-${Date.now().toString().slice(-6)}`;

    // 2. Simpan Murni 100% ke Supabase Cloud (public.arsip) — Google Sheet tidak disentuh
    if (window.SupabaseDB && window.SupabaseDB.isConfigured()) {
      await window.SupabaseDB.insertArsip({
        id: finalKodeId,
        kategori: kategori,
        nama_karya: judul,
        pencipta: pencipta,
        file_url: fileDokumenUrl || "",
        asal_karya: asalKarya
      });
      console.log("[Arsip] Sukses tersimpan murni ke Supabase Cloud (Google Sheet dinonaktifkan):", finalKodeId);
    } else {
      throw new Error("Supabase Database belum terhubung.");
    }

    // Reset & Tutup Modal
    resetModalKirimArsip();
    closeModalKirimArsip();

    if (typeof showToast === "function") {
      showToast("Alhamdulillah! Arsip naskah berhasil tersimpan murni di Supabase & Drive.", "success");
    }

    // Kirim Notifikasi Telegram Realtime ke Admin Teater Q
    try {
      const nowStr = new Date().toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
      const fileDisplay = fileDokumenUrl ? `<a href="${fileDokumenUrl}">Buka Berkas Naskah</a>` : "<i>(Berkas fisik di sanggar)</i>";
      const msgArsip = `🏛️ <b>NOTIFIKASI ARSIP NASKAH BARU</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📚 <b>Judul Naskah:</b> ${escapeHtml(judul)}\n` +
        `✍️ <b>Pencipta:</b> ${escapeHtml(pencipta)}\n` +
        `🏷️ <b>Kategori:</b> ${escapeHtml(kategori)}\n` +
        `👑 <b>Asal Karya:</b> ${escapeHtml(asalKarya)}\n` +
        `📎 <b>Berkas:</b> ${fileDisplay}\n` +
        `⏰ <b>Waktu:</b> ${nowStr} WIB\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `<i>Pusat Data Bank Naskah Teater Q (Supabase Cloud Database)</i>`;
      sendTelegramAdminNotification(msgArsip);
    } catch(errNotif) {}

    // Bersihkan seluruh cache lokal agar tidak ada data hantu tersisa
    try {
      localStorage.removeItem("tq_cache_arsip");
      localStorage.removeItem("tq_cache_arsip_v2");
      localStorage.removeItem("tq_cache_arsip_live");
    } catch(e) {}

    // Segarkan data langsung dari Supabase
    arsipLoaded = false;
    setTimeout(() => {
      ensureArsipLoaded(true);
    }, 600);

  } catch(err) {
    console.error("Gagal submit arsip:", err);
    if (typeof showToast === "function") {
      showToast("Gagal menyimpan naskah: " + (err.message || "Koneksi terganggu"), "error");
    }
  } finally {
    if (btn) btn.disabled = false;
    if (icon) icon.className = "fa-solid fa-paper-plane";
    if (label) label.textContent = "Kirim Arsip Sekarang";
  }
}

window.setArsipSourceFilter = setArsipSourceFilter;
window.clearSearchArsip = clearSearchArsip;
window.toggleClearSearchArsipBtn = toggleClearSearchArsipBtn;
window.openModalKirimArsip = openModalKirimArsip;
window.closeModalKirimArsip = closeModalKirimArsip;
window.resetModalKirimArsip = resetModalKirimArsip;
window.previewArsipDokumen = previewArsipDokumen;
window.removeArsipDokumen = removeArsipDokumen;
window.submitArsipKarya = submitArsipKarya;
window.loadMoreArsip = loadMoreArsip;
window.renderArsip = renderArsip;
window.ensureArsipLoaded = ensureArsipLoaded;

// ============================================================================
// MODAL PAPERLESS DOC READER ARSIP (GOOGLE DRIVE / DOC READER)
// ============================================================================
let arsipPaperlessZoom = 1.0;

function getGoogleDrivePreviewUrl(rawUrl) {
  if (!rawUrl) return "";
  let url = rawUrl.trim();
  const matchFile = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFile && matchFile[1]) {
    return `https://drive.google.com/file/d/${matchFile[1]}/preview`;
  }
  const matchId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId && matchId[1]) {
    return `https://drive.google.com/file/d/${matchId[1]}/preview`;
  }
  const matchDoc = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (matchDoc && matchDoc[1]) {
    return `https://docs.google.com/document/d/${matchDoc[1]}/preview`;
  }
  return url;
}

function getGoogleDriveDownloadUrl(rawUrl) {
  if (!rawUrl) return "";
  let url = rawUrl.trim();
  const matchFile = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/) || url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFile && matchFile[1]) {
    return `https://drive.google.com/uc?export=download&id=${matchFile[1]}`;
  }
  return url;
}

function openArsipPaperless(indexOrId) {
  let item = null;
  if (typeof indexOrId === "number") {
    item = arsipData[indexOrId];
  } else if (!isNaN(Number(indexOrId))) {
    item = arsipData[Number(indexOrId)];
  }
  if (!item && arsipData.length > 0) {
    item = arsipData.find(r => (r.id == indexOrId || r._id == indexOrId || r["ID"] == indexOrId));
  }
  if (!item) return;

  const fileUrl = item["FILE"] || item["File"] || item["file"] || item["LINK FILE"] || item["Link File"] || item["link"] || item["URL"] || "";
  if (!fileUrl) {
    if (typeof showToast === "function") {
      showToast("Dokumen ini hanya tersedia dalam bentuk fisik di sanggar.", "info");
    } else {
      alert("Dokumen ini hanya tersedia dalam bentuk fisik di sanggar.");
    }
    return;
  }

  const previewUrl = getGoogleDrivePreviewUrl(fileUrl);
  const downloadUrl = getGoogleDriveDownloadUrl(fileUrl);

  const titleEl = document.getElementById("arsipPaperlessTitle");
  const authorEl = document.getElementById("arsipPaperlessAuthor");
  const badgeEl = document.getElementById("arsipPaperlessBadge");
  const btnExt = document.getElementById("btnArsipPaperlessExternal");
  const btnDown = document.getElementById("btnArsipPaperlessDownload");
  const iframe = document.getElementById("arsipPaperlessIframe");
  const loading = document.getElementById("arsipPaperlessLoading");
  const modal = document.getElementById("modalPaperlessDocReader");

  const nama = item["NAMA KARYA"] || item["Nama Karya"] || item["nama karya"] || item["Judul"] || "Naskah Lakon";
  const pencipta = item["PENCIPTA"] || item["Pencipta"] || item["Penulis"] || "-";
  const kategori = item["KATEGORI"] || item["Kategori"] || "Naskah Lakon";
  const tahun = item["TAHUN"] || item["Tahun"] || "";

  if (titleEl) titleEl.textContent = nama;
  if (authorEl) authorEl.textContent = `Karya: ${pencipta}${tahun ? ` • Tahun ${tahun}` : ""}`;
  if (badgeEl) badgeEl.textContent = kategori;
  if (btnExt) btnExt.href = fileUrl;
  if (btnDown) btnDown.href = downloadUrl;

  if (loading) loading.style.display = "flex";
  if (iframe) {
    iframe.onload = onArsipIframeLoad;
    iframe.src = previewUrl;
  }

  // Pada layar HP (< 640px) gunakan 130% agar margin kertas putih terpotong rapi & teks langsung nyaman dibaca
  if (window.innerWidth < 640) {
    arsipPaperlessZoom = 1.30;
  } else {
    arsipPaperlessZoom = 1.0;
  }
  updateArsipPaperlessZoomUI();

  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    document.body.style.overflow = "hidden";
  }
}

function updateArsipPaperlessZoomUI() {
  const iframe = document.getElementById("arsipPaperlessIframe");
  const label = document.getElementById("arsipPaperlessZoomLabel");
  const zRound = Math.round(arsipPaperlessZoom * 100);
  if (label) {
    label.textContent = zRound + "%";
  }
  if (!iframe) return;

  if (arsipPaperlessZoom <= 1.0) {
    iframe.style.width = "100%";
    iframe.style.marginLeft = "0";
  } else {
    const extraWidth = (arsipPaperlessZoom - 1.0);
    const halfExtra = (extraWidth / 2) * 100;
    iframe.style.width = (arsipPaperlessZoom * 100) + "%";
    iframe.style.marginLeft = `-${halfExtra}%`;
  }
}

function changeArsipPaperlessZoom(delta) {
  arsipPaperlessZoom = Math.max(0.85, Math.min(2.2, Math.round((arsipPaperlessZoom + delta) * 100) / 100));
  updateArsipPaperlessZoomUI();
}

function onArsipIframeLoad() {
  const loading = document.getElementById("arsipPaperlessLoading");
  if (loading) loading.style.display = "none";
}

function closeArsipPaperless() {
  const modal = document.getElementById("modalPaperlessDocReader");
  const iframe = document.getElementById("arsipPaperlessIframe");
  if (iframe) iframe.src = "";
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    document.body.style.overflow = "";
  }
}

function toggleArsipPaperlessFullscreen() {
  const card = document.getElementById("arsipPaperlessCard");
  const icon = document.getElementById("iconArsipPaperlessFullscreen");
  if (!document.fullscreenElement) {
    if (card && card.requestFullscreen) {
      card.requestFullscreen().catch(() => {});
      if (icon) icon.className = "fa-solid fa-compress text-xs";
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
      if (icon) icon.className = "fa-solid fa-expand text-xs";
    }
  }
}

// ============================================================================
// HELPER NETWORK & FORMATTER UMUM (GVIZ & DRIVE)
// ============================================================================
async function fetchGvizTable(url) {
  if (!url || typeof url !== "string" || !url.trim()) return [];
  const sep = url.includes('?') ? '&' : '?';
  const resp = await fetch(url + sep + '_t=' + Date.now(), { cache: "no-store" });
  if (!resp.ok) throw new Error("Gagal mengambil data dari Google Sheets (" + resp.status + ").");
  const txt = await resp.text();
  const start = txt.indexOf("{");
  const end = txt.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Format data spreadsheet tidak dikenali.");
  const json = JSON.parse(txt.substring(start, end + 1));
  const cols = (json.table.cols || []).map(c => (c && c.label ? c.label.trim() : ""));
  const rows = (json.table.rows || []).map((r, rowIdx) => {
    const rowObj = { _rowIndex: rowIdx + 2 };
    if (r && r.c) {
      r.c.forEach((cell, cIdx) => {
        const colName = cols[cIdx] || `col_${cIdx}`;
        const val = cell && cell.v !== null && cell.v !== undefined ? cell.v : "";
        rowObj[colName] = val;
        rowObj[colName.toLowerCase()] = val;
        if (cell && cell.f) rowObj[`${colName}_formatted`] = cell.f;
      });
    }
    return rowObj;
  });
  return rows;
}

function formatDriveImageUrl(url) {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (trimmed.startsWith("data:image")) return trimmed;
  const matchD = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (matchD && matchD[1]) {
    return `https://lh3.googleusercontent.com/d/${matchD[1]}`;
  }
  const matchId = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId && matchId[1]) {
    return `https://lh3.googleusercontent.com/d/${matchId[1]}`;
  }
  return trimmed;
}

// ============================================================================
// MODUL PEMETAAN DRIVE FOLDER TERPUSAT (ACUAN UTAMA EKOSISTEM TEATER Q)
// ============================================================================
let driveFolderCache = null;
let driveFolderCacheTime = 0;

/**
 * Ekstrak ID Folder Google Drive dari URL atau string mentah
 */
function extractGoogleDriveFolderId(input) {
  if (!input) return "";
  const str = String(input).trim();
  const match = str.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) return match[1];
  const matchId = str.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId && matchId[1]) return matchId[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(str)) return str;
  return str;
}

/**
 * Mengambil Pemetaan Folder dari tab Sheet 'Drive_Folder'
 * Default fallback: Folder Induk Galeri MASTER (1zJ2jeJWo_JQJzgMxAozhHE9BwJSTP0sr)
 */
async function getDriveFolderMap(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && driveFolderCache && (now - driveFolderCacheTime < 300000)) {
    return driveFolderCache;
  }

  const defaultMaster = (typeof DEFAULT_MASTER_FOLDER_ID !== "undefined" && DEFAULT_MASTER_FOLDER_ID)
    ? DEFAULT_MASTER_FOLDER_ID
    : "1zJ2jeJWo_JQJzgMxAozhHE9BwJSTP0sr";

  const mapResult = {
    master: defaultMaster,
    masterUrl: `https://drive.google.com/drive/folders/${defaultMaster}`,
    folders: {}
  };

  try {
    const gvizUrl = (typeof URL_DRIVE_FOLDER_GVIZ !== "undefined" && URL_DRIVE_FOLDER_GVIZ)
      ? URL_DRIVE_FOLDER_GVIZ
      : "https://docs.google.com/spreadsheets/d/154RqVr1rCk3Yx1oVFqRMNVoT1Qyc1lQ8fDlS0kV2-xg/gviz/tq?tqx=out:json&sheet=Drive_Folder";

    const rows = await fetchGvizTable(gvizUrl);
    if (Array.isArray(rows) && rows.length > 0) {
      rows.forEach(r => {
        // Kolom A: Kategori / Tahun / Modul
        // Kolom B: Link / ID Folder
        const keys = Object.keys(r).filter(k => k !== "_rowIndex");
        let rawKey = "";
        let rawVal = "";
        if (keys.length >= 2) {
          rawKey = String(r[keys[0]] || "");
          rawVal = String(r[keys[1]] || "");
        }
        const key = rawKey.trim().toLowerCase();
        const val = rawVal.trim();

        if (key && val && !val.includes("(link/id")) {
          const cleanId = extractGoogleDriveFolderId(val);
          if (cleanId) {
            mapResult.folders[key] = {
              id: cleanId,
              url: val.startsWith("http") ? val : `https://drive.google.com/drive/folders/${cleanId}`
            };
            if (key === "master") {
              mapResult.master = cleanId;
              mapResult.masterUrl = mapResult.folders[key].url;
            }
          }
        }
      });
    }
    driveFolderCache = mapResult;
    driveFolderCacheTime = now;
    console.log("[Drive_Folder] Pemetaan folder berhasil dimuat:", Object.keys(mapResult.folders));
  } catch(err) {
    console.warn("[Drive_Folder] Gagal memuat pemetaan folder, fallback ke MASTER:", err);
  }

  return mapResult;
}

/**
 * Mendapatkan Folder ID & URL untuk Kategori tertentu
 * Aturan Utama: Cari kategori di Drive_Folder. Jika tidak ada / kosong -> ambil MASTER
 */
async function getDriveTargetFolder(categoryName) {
  const map = await getDriveFolderMap();
  const cat = String(categoryName || "").trim().toLowerCase();

  // 1. Cari kategori langsung
  if (cat && map.folders[cat]) {
    return map.folders[cat];
  }

  // 2. Pencarian fleksibel (substring)
  for (const [k, obj] of Object.entries(map.folders)) {
    if (k.includes(cat) || cat.includes(k)) {
      return obj;
    }
  }

  // 3. Fallback: Selalu ke Folder Induk (MASTER)
  return {
    id: map.master,
    url: map.masterUrl,
    isMasterFallback: true
  };
}

if (typeof window !== "undefined") {
  window.getDriveFolderMap = getDriveFolderMap;
  window.getDriveTargetFolder = getDriveTargetFolder;
  window.extractGoogleDriveFolderId = extractGoogleDriveFolderId;
}
let madingData = [];
let madingLoaded = false;
let madingLoading = false;
let currentMadingCategory = "all";
let currentMadingReaderFontSize = 15;

/**
 * Parser tanggal timestamp mading fleksibel (mendukung ISO string, Google Sheets Date(), dsb.)
 */
function parseMadingDate(val) {
  if (!val) return 0;
  if (typeof val === "number") return val;
  if (val instanceof Date) return val.getTime();
  const s = String(val).trim();
  if (s.startsWith("Date(") && s.endsWith(")")) {
    const parts = s.substring(5, s.length - 1).split(",").map(Number);
    if (parts.length >= 3) {
      return new Date(parts[0], parts[1], parts[2], parts[3] || 0, parts[4] || 0, parts[5] || 0).getTime();
    }
  }
  const isoTime = Date.parse(s);
  if (!isNaN(isoTime)) return isoTime;
  const slashTime = Date.parse(s.replace(/-/g, "/"));
  if (!isNaN(slashTime)) return slashTime;
  return 0;
}

/**
 * Format tanggal mading ramah baca (contoh: 23 Sep 2026)
 */
function formatMadingDateDisplay(timestamp) {
  if (!timestamp) return "";
  const time = parseMadingDate(timestamp);
  if (!time || isNaN(time)) return "";
  const d = new Date(time);
  const day = d.getDate();
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
  const month = months[d.getMonth()] || "";
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Urutkan karya mading dari tanggal / waktu paling baru ke lama
 */
function sortMadingDataByDate(list) {
  if (!Array.isArray(list)) return list;
  return list.sort((a, b) => {
    const timeA = parseMadingDate(a.timestamp);
    const timeB = parseMadingDate(b.timestamp);
    if (timeA > 0 && timeB > 0 && timeA !== timeB) {
      return timeB - timeA; // Timestamp terbaru di paling atas
    }
    // Fallback: urutkan dari baris database paling bawah (data terbaru diinput)
    const rowA = Number(a._rowIndex) || 0;
    const rowB = Number(b._rowIndex) || 0;
    if (rowA !== rowB) return rowB - rowA;
    return String(b.id || "").localeCompare(String(a.id || ""));
  });
}

async function ensureMadingLoaded(forceRefresh = false) {
  const refreshIcon = document.getElementById("refreshMadingIcon");
  if (refreshIcon) refreshIcon.classList.add("fa-spin");

  if (madingLoaded && madingData.length > 0 && !forceRefresh) {
    renderMading();
    if (refreshIcon) refreshIcon.classList.remove("fa-spin");
    return;
  }

  const cacheKey = "tq_cache_mading";
  const cached = localStorage.getItem(cacheKey);
  if (cached && !forceRefresh && madingData.length === 0) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        madingData = sortMadingDataByDate(parsed);
        madingLoaded = true;
        renderMading();
      }
    } catch(e) {}
  }

  if (madingLoading) return;
  madingLoading = true;

  try {
    let rawRows = null;
    if (window.SupabaseDB && window.SupabaseDB.isConfigured()) {
      try {
        const res = await window.SupabaseDB.getMading();
        if (Array.isArray(res) && res.length > 0) {
          rawRows = res;
        } else if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
          rawRows = res.data;
        }
      } catch (errSb) {
        console.warn("[Mading] Supabase fetch error, fallback ke GVIZ:", errSb);
      }
    }

    if (!rawRows || !rawRows.length) {
      rawRows = await fetchGvizTable(URL_MADING_GVIZ);
    }

    madingData = (rawRows || []).map((r, idx) => {
      return {
        _rowIndex: r._rowIndex || (idx + 2),
        id: r["id"] || `KRY-${String(idx + 1).padStart(2, '0')}`,
        timestamp: r["timestamp"] || "",
        nama: r["nama"] || "-",
        angkatan: r["angkatan"] || "-",
        kategori: r["kategori"] || "Puisi",
        judul: r["judul"] || "Tanpa Judul",
        foto: r["foto"] || "",
        isi_teks: r["isi teks"] || r["isi_teks"] || "",
        file_dokumen: r["file dokumen"] || r["file_dokumen"] || "",
        catatan: r["catatan"] || "",
        foto_profil: r["foto profil"] || r["foto_profil"] || ""
      };
    });

    // Urutkan karya mading dari tanggal terbaru
    sortMadingDataByDate(madingData);

    try {
      localStorage.setItem(cacheKey, JSON.stringify(madingData));
    } catch(e) {}

    madingLoaded = true;
    renderMading();
    const isMadingView = (typeof currentPage !== 'undefined' && currentPage === 'mading') || window.location.hash.includes('mading');
    if (forceRefresh && isMadingView && typeof showToast === "function") {
      showToast(`Berhasil menyinkronkan ${madingData.length} karya mading terbaru.`, "success");
    }
  } catch (err) {
    console.error("Gagal memuat Mading Karya:", err);
    const container = document.getElementById("madingGrid");
    if (container && madingData.length === 0) {
      container.innerHTML = `
        <div class="col-span-full text-center py-12 text-slate-500 text-xs">
          <i class="fa-solid fa-triangle-exclamation text-2xl text-amber-500 mb-2"></i>
          <p>Gagal memuat karya mading dari server. Periksa koneksi internet Anda.</p>
          <button type="button" onclick="ensureMadingLoaded(true)" class="btn btn-outline text-xs mt-3 px-3 py-1.5">Coba Lagi</button>
        </div>
      `;
    }
  } finally {
    madingLoading = false;
    if (refreshIcon) refreshIcon.classList.remove("fa-spin");
  }
}

function setMadingCategoryFilter(category) {
  currentMadingCategory = category;
  document.querySelectorAll("#madingCategoryTabs .mading-tab-btn").forEach(btn => {
    const cat = btn.getAttribute("data-category");
    if (cat === category) {
      btn.className = "mading-tab-btn active px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 bg-fuchsia-600 text-white shrink-0 shadow-sm";
    } else {
      btn.className = "mading-tab-btn px-3 py-1.5 rounded-xl font-medium transition text-slate-400 hover:text-white bg-slate-800/80 shrink-0 hover:bg-slate-800";
    }
  });
  renderMading();
}

const debouncedRenderMading = typeof debounce === "function" ? debounce(renderMading, 150) : renderMading;
function onSearchMadingChange() {
  debouncedRenderMading();
}

function getMadingKategoriBadge(kategori) {
  const kat = String(kategori || "").toLowerCase().trim();
  if (kat.includes("puisi")) {
    return `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1"><i class="fa-solid fa-feather text-[9px]"></i> Puisi</span>`;
  } else if (kat.includes("naskah")) {
    return `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 inline-flex items-center gap-1"><i class="fa-solid fa-scroll text-[9px]"></i> Naskah Lakon</span>`;
  } else if (kat.includes("rupa") || kat.includes("lukis")) {
    return `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1"><i class="fa-solid fa-palette text-[9px]"></i> Seni Rupa</span>`;
  } else if (kat.includes("cerpen") || kat.includes("prosa")) {
    return `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30 inline-flex items-center gap-1"><i class="fa-solid fa-book-open text-[9px]"></i> Cerpen & Prosa</span>`;
  } else if (kat.includes("foto")) {
    return `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/15 text-yellow-300 border border-yellow-500/30 inline-flex items-center gap-1"><i class="fa-solid fa-camera text-[9px]"></i> Fotografi</span>`;
  }
  return `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30 inline-flex items-center gap-1"><i class="fa-solid fa-asterisk text-[9px]"></i> ${escapeHtml(kategori || "Karya")}</span>`;
}

function renderMading() {
  const container = document.getElementById("madingGrid");
  const totalBadge = document.getElementById("badgeMadingTotal");
  if (!container) return;

  if (totalBadge) totalBadge.textContent = madingData.length;

  const searchInput = document.getElementById("searchMadingInput");
  const query = (searchInput ? searchInput.value : "").toLowerCase().trim();

  const filtered = madingData.filter(item => {
    // Filter Kategori
    if (currentMadingCategory !== "all") {
      const itemKat = String(item.kategori || "").toLowerCase();
      const targetKat = currentMadingCategory.toLowerCase();
      if (!itemKat.includes(targetKat) && !targetKat.includes(itemKat)) {
        return false;
      }
    }
    // Filter Search
    if (query) {
      const matchJudul = String(item.judul || "").toLowerCase().includes(query);
      const matchNama = String(item.nama || "").toLowerCase().includes(query);
      const matchAngkatan = String(item.angkatan || "").toLowerCase().includes(query);
      const matchTeks = String(item.isi_teks || "").toLowerCase().includes(query);
      const matchCatatan = String(item.catatan || "").toLowerCase().includes(query);
      if (!matchJudul && !matchNama && !matchAngkatan && !matchTeks && !matchCatatan) {
        return false;
      }
    }
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-16 text-slate-500 text-xs">
        <i class="fa-solid fa-palette text-3xl mb-2 text-slate-600 block"></i>
        <p>Tidak ada karya mading yang sesuai dengan pilihan filter atau kata kunci.</p>
        <button type="button" onclick="setMadingCategoryFilter('all'); if(document.getElementById('searchMadingInput')) document.getElementById('searchMadingInput').value=''; renderMading();" class="btn btn-outline text-xs mt-3 px-3 py-1.5">Reset Pencarian</button>
      </div>
    `;
    return;
  }

  let html = "";
  filtered.forEach(item => {
    const rawIdx = madingData.indexOf(item);
    const fotoKarya = formatDriveImageUrl(item.foto);
    const fotoProfil = formatDriveImageUrl(item.foto_profil);
    const dateFormatted = formatMadingDateDisplay(item.timestamp);
    const katLower = String(item.kategori || "").toLowerCase();
    const isVisual = katLower.includes("rupa") || katLower.includes("lukis") || katLower.includes("foto") || (Boolean(fotoKarya) && !item.isi_teks);
    const isNaskah = katLower.includes("naskah");

    html += `
      <div class="group bg-[#0b1329] border border-slate-800 hover:border-fuchsia-500/50 rounded-2xl overflow-hidden transition-all duration-300 flex flex-col shadow-lg hover:shadow-fuchsia-950/30 hover:-translate-y-1">
        
        <!-- Media Visual / Cover (jika ada foto karya) -->
        ${fotoKarya ? `
          <div class="relative w-full h-52 bg-slate-950 overflow-hidden cursor-pointer" onclick="openLightbox('${fotoKarya}', '${escapeHtml(item.judul)} - Oleh ${escapeHtml(item.nama)}')">
            <img src="${fotoKarya}" alt="${escapeHtml(item.judul)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" decoding="async" onerror="this.onerror=null; this.src='assets/logo.png';" />
            <div class="absolute top-3 left-3 z-10 drop-shadow">
              ${getMadingKategoriBadge(item.kategori)}
            </div>
            ${dateFormatted ? `
              <div class="absolute top-3 right-3 z-10 px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-sm border border-white/20 text-[10px] text-white font-mono shadow-sm">
                ${dateFormatted}
              </div>
            ` : `
              <div class="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-slate-950/70 backdrop-blur-sm border border-white/20 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                <i class="fa-solid fa-expand"></i>
              </div>
            `}
          </div>
        ` : `
          <!-- Header Card untuk Karya Teks Tanpa Foto -->
          <div class="p-4 sm:p-5 pb-0 flex items-center justify-between">
            ${getMadingKategoriBadge(item.kategori)}
            <span class="text-[10px] font-mono text-slate-400">${dateFormatted || escapeHtml(item.id)}</span>
          </div>
        `}

        <!-- Card Content Body -->
        <div class="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
          <div class="space-y-2.5">
            <h3 class="text-base sm:text-lg font-black text-white group-hover:text-fuchsia-300 transition-colors line-clamp-2 leading-snug cursor-pointer" onclick="openMadingReader(${rawIdx})">
              ${escapeHtml(item.judul)}
            </h3>

            <!-- Cuplikan Isi Teks atau Makna -->
            ${item.isi_teks ? `
              <p class="text-xs text-slate-300 font-serif italic line-clamp-3 leading-relaxed border-l-2 border-fuchsia-500/40 pl-3 py-0.5">
                "${escapeHtml(item.isi_teks)}"
              </p>
            ` : (item.catatan ? `
              <p class="text-xs text-slate-400 italic line-clamp-2 leading-relaxed">
                <i class="fa-solid fa-feather-pointed text-[10px] text-amber-400 mr-1"></i> ${escapeHtml(item.catatan)}
              </p>
            ` : '')}
          </div>

          <!-- Creator Info & Action Buttons -->
          <div class="pt-3 border-t border-slate-800/80 space-y-3">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2.5 min-w-0">
                ${fotoProfil ? `
                  <img src="${fotoProfil}" class="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0 cursor-pointer" loading="lazy" decoding="async" onclick="openLightbox('${fotoProfil}', 'Kreator: ${escapeHtml(item.nama)}')" onerror="this.onerror=null; this.src='assets/logo.png';" />
                ` : `
                  <div class="w-8 h-8 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-300 font-black text-xs flex items-center justify-center shrink-0">
                    ${(item.nama || "Q").charAt(0).toUpperCase()}
                  </div>
                `}
                <div class="min-w-0 flex-1">
                  <div class="text-xs font-black text-slate-100 leading-tight truncate" title="${escapeHtml(item.nama)}">${escapeHtml(item.nama)}</div>
                  <div class="text-[10.5px] text-amber-300 font-extrabold tracking-wide mt-0.5 whitespace-nowrap">Angkatan ${escapeHtml(item.angkatan)}</div>
                </div>
              </div>

              <!-- Tombol Aksi Sesuai Jenis Karya -->
              <div class="flex items-center gap-1.5 shrink-0">
                ${item.file_dokumen ? `
                  <a href="${item.file_dokumen}" target="_blank" class="px-2.5 py-1.5 rounded-xl bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30 text-xs font-bold transition flex items-center gap-1" title="Unduh File Naskah">
                    <i class="fa-solid fa-file-arrow-down text-xs"></i>
                    <span class="hidden sm:inline">Naskah</span>
                  </a>
                ` : ''}
                
                <button type="button" onclick="openMadingReader(${rawIdx})" class="px-3 py-1.5 rounded-xl bg-fuchsia-500/15 hover:bg-fuchsia-500/25 text-fuchsia-300 border border-fuchsia-500/30 text-xs font-bold transition flex items-center gap-1.5" title="Baca Lengkap">
                  <i class="fa-solid fa-glasses text-xs"></i>
                  <span>${isVisual ? 'Detail Karya' : 'Baca Utuh'}</span>
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>
    `;
  });

  container.innerHTML = html;
}

function openMadingReader(index) {
  const item = madingData[index];
  if (!item) return;

  const modal = document.getElementById("modalMadingReader");
  if (!modal) return;

  // Set Author & Judul
  const dateFormatted = formatMadingDateDisplay(item.timestamp);
  document.getElementById("madingReaderJudul").textContent = item.judul || "Tanpa Judul";
  document.getElementById("madingReaderAuthor").textContent = `Oleh ${item.nama || "Keluarga Teater Q"} • Angkatan ${item.angkatan || "-"}`;
  document.getElementById("madingReaderKategoriBadge").innerHTML = getMadingKategoriBadge(item.kategori);

  // Set Avatar Box
  const avatarBox = document.getElementById("madingReaderAvatarBox");
  const fotoProfil = formatDriveImageUrl(item.foto_profil);
  if (fotoProfil) {
    avatarBox.innerHTML = `<img src="${fotoProfil}" class="w-10 h-10 rounded-full object-cover border border-slate-700" onerror="this.src='assets/logo.png';" />`;
  } else {
    avatarBox.innerHTML = `
      <div class="w-10 h-10 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-300 font-black text-sm flex items-center justify-center">
        ${(item.nama || "Q").charAt(0).toUpperCase()}
      </div>
    `;
  }

  // Cover Image
  const coverBox = document.getElementById("madingReaderCoverBox");
  const coverImg = document.getElementById("madingReaderCoverImg");
  const fotoKarya = formatDriveImageUrl(item.foto);
  if (fotoKarya) {
    coverImg.src = fotoKarya;
    coverBox.classList.remove("hidden");
  } else {
    coverBox.classList.add("hidden");
  }

  // Teks Isi
  const textBox = document.getElementById("madingReaderText");
  textBox.textContent = item.isi_teks || (item.catatan ? item.catatan : "(Karya visual tanpa teks bait)");
  textBox.style.fontSize = `${currentMadingReaderFontSize}px`;

  // Catatan Kreator
  const catatanBox = document.getElementById("madingReaderCatatanBox");
  const catatanEl = document.getElementById("madingReaderCatatan");
  if (item.catatan && item.isi_teks) {
    catatanEl.textContent = item.catatan;
    catatanBox.classList.remove("hidden");
  } else {
    catatanBox.classList.add("hidden");
  }

  // Link File Naskah Utuh
  const docBox = document.getElementById("madingReaderDocBox");
  const docLink = document.getElementById("madingReaderDocLink");
  if (item.file_dokumen) {
    docLink.href = item.file_dokumen;
    docBox.classList.remove("hidden");
  } else {
    docBox.classList.add("hidden");
  }

  modal.classList.remove("hidden");
  modal.classList.add("flex");
  modal.removeAttribute("aria-hidden");
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => {
    modal.classList.remove("opacity-0");
    modal.classList.add("opacity-100");
  });
}

function closeMadingReader() {
  const modal = document.getElementById("modalMadingReader");
  if (modal) {
    modal.classList.remove("opacity-100");
    modal.classList.add("opacity-0");
    document.body.style.overflow = "";
    setTimeout(() => {
      modal.classList.remove("flex");
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden", "true");
    }, 200);
  }
}

function changeMadingReaderFontSize(delta) {
  currentMadingReaderFontSize = Math.max(12, Math.min(26, currentMadingReaderFontSize + delta));
  const textBox = document.getElementById("madingReaderText");
  if (textBox) {
    textBox.style.fontSize = `${currentMadingReaderFontSize}px`;
  }
}

function copyMadingContent() {
  const judul = document.getElementById("madingReaderJudul")?.textContent || "";
  const author = document.getElementById("madingReaderAuthor")?.textContent || "";
  const text = document.getElementById("madingReaderText")?.textContent || "";
  if (!text.trim()) {
    showToast("Tidak ada teks yang dapat disalin.", "info");
    return;
  }
  const fullText = `*${judul}*\n${author}\n\n${text}\n\n— Paguyuban Teater Q FSH UIN-SA`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(fullText).then(() => {
      showToast("Kutipan karya mading berhasil disalin!", "success");
    }).catch(() => {
      showToast("Gagal menyalin karya.", "error");
    });
  } else {
    showToast("Clipboard tidak didukung di perangkat ini.", "error");
  }
}

function shareMadingContent() {
  const judul = document.getElementById("madingReaderJudul")?.textContent || "Karya Mading Teater Q";
  const author = document.getElementById("madingReaderAuthor")?.textContent || "";
  const text = document.getElementById("madingReaderText")?.textContent || "";
  const shareText = `Baca "${judul}" (${author}) di Mading Karya Teater Q:\n${text.slice(0, 160)}...`;
  if (navigator.share) {
    navigator.share({
      title: judul,
      text: shareText,
      url: window.location.href
    }).catch(() => {});
  } else {
    copyMadingContent();
  }
}

// ============================================================================
// 9.b.1 KIRIM KARYA MADING ANGGOTA (OPTIMASI KOMPRESI, FOTO PROFIL & BERKAS NASKAH)
// ============================================================================
let selectedKaryaFotoBase64 = "";
let selectedKaryaFotoName = "";
let selectedKaryaFotoProfilBase64 = "";
let selectedKaryaFotoProfilName = "";
let selectedKaryaDocBase64 = "";
let selectedKaryaDocName = "";
let selectedKaryaDocMime = "";
let selectedKaryaDocSizeStr = "";

/**
 * Kompres gambar menggunakan HTML5 Canvas di browser pengguna.
 * Mengurangi ukuran foto kamera HP (dari 4-8 MB menjadi hanya ~60-120 KB),
 * sehingga proses pengiriman karya berlangsung sangat cepat (< 1-2 detik) dan hemat kuota.
 */
function compressImageFile(file, maxWidth = 1200, maxHeight = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error("File tidak ditemukan"));
    if (!file.type || !file.type.startsWith("image/")) {
      return reject(new Error("File harus berupa gambar (JPG, PNG, WebP)"));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file gambar"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Gagal memuat file gambar"));
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function openModalKirimKarya() {
  const modal = document.getElementById("modalKirimKarya");
  if (!modal) return;

  // Auto-fill nama dan angkatan jika sudah ada data profil / login
  const inputNama = document.getElementById("karyaInputNama");
  const inputAngkatan = document.getElementById("karyaInputAngkatan");
  
  try {
    const rawSess = localStorage.getItem("tq_user_session");
    if (rawSess) {
      const sess = JSON.parse(rawSess);
      if (sess && inputNama && !inputNama.value) inputNama.value = sess.nama || sess.namaLengkap || "";
      if (sess && inputAngkatan && !inputAngkatan.value) inputAngkatan.value = sess.angkatan || "";

      // Pasang foto profil otomatis jika belum ada foto manual yang dipilih
      const sessFoto = sess.foto || sess.fotoProfil || sess.avatar || "";
      if (sessFoto && !selectedKaryaFotoProfilBase64) {
        selectedKaryaFotoProfilBase64 = sessFoto;
        const previewImg = document.getElementById("karyaProfilPreviewImg");
        const placeholderIcon = document.getElementById("karyaProfilPlaceholderIcon");
        const btnHapus = document.getElementById("btnHapusFotoProfil");
        const label = document.getElementById("karyaProfilLabel");
        if (previewImg) {
          previewImg.src = sessFoto;
          previewImg.classList.remove("hidden");
        }
        if (placeholderIcon) placeholderIcon.classList.add("hidden");
        if (label) label.textContent = "Foto Akun";
        if (btnHapus) btnHapus.classList.remove("hidden");
      }
    }
  } catch(e) {}

  modal.classList.remove("hidden");
  modal.classList.add("flex");
  modal.removeAttribute("aria-hidden");
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => {
    modal.classList.remove("opacity-0");
    modal.classList.add("opacity-100");
  });
}

function closeModalKirimKarya() {
  const modal = document.getElementById("modalKirimKarya");
  if (!modal) return;
  modal.classList.remove("opacity-100");
  modal.classList.add("opacity-0");
  document.body.style.overflow = "";
  setTimeout(() => {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    modal.setAttribute("aria-hidden", "true");
  }, 200);
}

function resetModalKirimKarya() {
  const form = document.getElementById("formKirimKaryaMading");
  if (form) form.reset();
  removeKaryaFoto();
  removeKaryaFotoProfil();
  removeKaryaDokumen();
}

// Upload & Preview Foto Profil Penulis (Kompresi 300px, ~15-25 KB)
async function previewKaryaFotoProfil(input) {
  if (!input || !input.files || !input.files[0]) return;
  const file = input.files[0];

  const label = document.getElementById("karyaProfilLabel");
  if (label) label.textContent = "Mengoptimalkan...";

  try {
    const compressedBase64 = await compressImageFile(file, 300, 300, 0.75);
    selectedKaryaFotoProfilBase64 = compressedBase64;
    selectedKaryaFotoProfilName = "profil_" + Date.now() + ".jpg";

    const previewImg = document.getElementById("karyaProfilPreviewImg");
    const placeholderIcon = document.getElementById("karyaProfilPlaceholderIcon");
    const btnHapus = document.getElementById("btnHapusFotoProfil");

    if (previewImg) {
      previewImg.src = compressedBase64;
      previewImg.classList.remove("hidden");
    }
    if (placeholderIcon) placeholderIcon.classList.add("hidden");
    if (label) label.textContent = file.name.length > 14 ? file.name.substring(0, 12) + "..." : file.name;
    if (btnHapus) btnHapus.classList.remove("hidden");
  } catch (err) {
    console.error("Gagal kompres foto profil:", err);
    if (typeof showToast === "function") showToast("Gagal memproses foto profil. Silakan pilih foto lain.", "warning");
    removeKaryaFotoProfil();
  }
}

function removeKaryaFotoProfil() {
  selectedKaryaFotoProfilBase64 = "";
  selectedKaryaFotoProfilName = "";
  const input = document.getElementById("karyaInputFotoProfil");
  const previewImg = document.getElementById("karyaProfilPreviewImg");
  const placeholderIcon = document.getElementById("karyaProfilPlaceholderIcon");
  const label = document.getElementById("karyaProfilLabel");
  const btnHapus = document.getElementById("btnHapusFotoProfil");

  if (input) input.value = "";
  if (previewImg) {
    previewImg.src = "";
    previewImg.classList.add("hidden");
  }
  if (placeholderIcon) placeholderIcon.classList.remove("hidden");
  if (label) label.textContent = "Upload Foto";
  if (btnHapus) btnHapus.classList.add("hidden");
}

// Upload & Preview Foto Karya (Kompresi 1200px, ~70-120 KB)
async function previewKaryaFoto(input) {
  if (!input || !input.files || !input.files[0]) return;
  const file = input.files[0];

  const label = document.getElementById("karyaFotoLabel");
  if (label) label.textContent = "Mengoptimalkan...";

  try {
    const compressedBase64 = await compressImageFile(file, 1200, 1200, 0.78);
    selectedKaryaFotoBase64 = compressedBase64;
    selectedKaryaFotoName = "karya_" + Date.now() + ".jpg";

    const previewBox = document.getElementById("karyaFotoPreviewBox");
    const previewImg = document.getElementById("karyaFotoPreviewImg");
    const placeholderIcon = document.getElementById("karyaFotoPlaceholderIcon");
    const btnHapus = document.getElementById("btnHapusFotoKarya");

    if (previewImg) {
      previewImg.src = compressedBase64;
      previewImg.classList.remove("hidden");
    }
    if (placeholderIcon) placeholderIcon.classList.add("hidden");
    if (previewBox) previewBox.classList.remove("hidden");
    if (label) label.textContent = file.name.length > 14 ? file.name.substring(0, 12) + "..." : file.name;
    if (btnHapus) btnHapus.classList.remove("hidden");
  } catch (err) {
    console.error("Gagal kompres foto karya:", err);
    if (typeof showToast === "function") showToast("Gagal memproses gambar karya. Pastikan format JPG/PNG valid.", "warning");
    removeKaryaFoto();
  }
}

function removeKaryaFoto() {
  selectedKaryaFotoBase64 = "";
  selectedKaryaFotoName = "";
  const input = document.getElementById("karyaInputFoto");
  const previewImg = document.getElementById("karyaFotoPreviewImg");
  const placeholderIcon = document.getElementById("karyaFotoPlaceholderIcon");
  const label = document.getElementById("karyaFotoLabel");
  const btnHapus = document.getElementById("btnHapusFotoKarya");

  if (input) input.value = "";
  if (previewImg) {
    previewImg.src = "";
    previewImg.classList.add("hidden");
  }
  if (placeholderIcon) placeholderIcon.classList.remove("hidden");
  if (label) label.textContent = "Upload Gambar";
  if (btnHapus) btnHapus.classList.add("hidden");
}

// Upload & Preview File Naskah / Dokumen Karya (PDF, Word, TXT)
function previewKaryaDokumen(input) {
  if (!input || !input.files || !input.files[0]) return;
  const file = input.files[0];

  // Batas ukuran 10 MB
  if (file.size > 10 * 1024 * 1024) {
    if (typeof showToast === "function") showToast("Ukuran file naskah maksimal 10 MB!", "warning");
    input.value = "";
    return;
  }

  const sizeKb = file.size / 1024;
  selectedKaryaDocSizeStr = sizeKb > 1024 ? (sizeKb / 1024).toFixed(1) + " MB" : Math.round(sizeKb) + " KB";
  selectedKaryaDocName = file.name;
  selectedKaryaDocMime = file.type || "application/octet-stream";

  const ext = file.name.split('.').pop().toLowerCase();
  const iconEl = document.getElementById("karyaDocIcon");
  const iconBox = document.getElementById("karyaDocIconBox");
  
  if (iconEl && iconBox) {
    if (ext === "pdf") {
      iconEl.className = "fa-solid fa-file-pdf";
      iconBox.className = "w-9 h-9 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0 text-base";
    } else if (ext === "doc" || ext === "docx") {
      iconEl.className = "fa-solid fa-file-word";
      iconBox.className = "w-9 h-9 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0 text-base";
    } else {
      iconEl.className = "fa-solid fa-file-lines";
      iconBox.className = "w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 text-base";
    }
  }

  const nameEl = document.getElementById("karyaDocName");
  const sizeEl = document.getElementById("karyaDocSize");
  if (nameEl) nameEl.textContent = file.name;
  if (sizeEl) sizeEl.textContent = `${selectedKaryaDocSizeStr} • Siap diunggah`;

  const reader = new FileReader();
  reader.onload = function(e) {
    selectedKaryaDocBase64 = e.target.result;
    const emptyState = document.getElementById("karyaDocEmptyState");
    const previewState = document.getElementById("karyaDocPreviewState");
    if (emptyState) emptyState.classList.add("hidden");
    if (previewState) {
      previewState.classList.remove("hidden");
      previewState.classList.add("flex");
    }
  };
  reader.readAsDataURL(file);
}

function removeKaryaDokumen() {
  selectedKaryaDocBase64 = "";
  selectedKaryaDocName = "";
  selectedKaryaDocMime = "";
  selectedKaryaDocSizeStr = "";

  const input = document.getElementById("karyaInputFileDokumen");
  if (input) input.value = "";

  const emptyState = document.getElementById("karyaDocEmptyState");
  const previewState = document.getElementById("karyaDocPreviewState");
  if (emptyState) emptyState.classList.remove("hidden");
  if (previewState) {
    previewState.classList.add("hidden");
    previewState.classList.remove("flex");
  }
}

// Upload Berkas / Foto ke Google Drive Hosting Berdasarkan Acuan Tab Drive_Folder (Fallback: MASTER)
async function uploadFileToTargetDrive(base64Data, filename, mimeType, targetCategory = "Mading") {
  if (!base64Data) return "";
  try {
    let cleanB64 = base64Data;
    if (cleanB64.indexOf(";base64,") > -1) {
      cleanB64 = cleanB64.split(";base64,")[1];
    }
    const targetFolder = await getDriveTargetFolder(targetCategory);
    const uploaderUrl = (typeof UPLOAD_SCRIPT_URL !== "undefined" && UPLOAD_SCRIPT_URL)
      ? UPLOAD_SCRIPT_URL
      : (typeof URL_QDRIVE_UPLOAD !== "undefined" && URL_QDRIVE_UPLOAD ? URL_QDRIVE_UPLOAD : "https://script.google.com/macros/s/AKfycbwfSrAFiVNQ5NUOfPcbFPoK2Af7Iz3BoES6F8I9XLMctWytfunQ5bhLgP-2wXXi1LybdQ/exec");

    const resp = await fetch(uploaderUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "upload_file",
        file: cleanB64,
        filename: filename || ("file_" + Date.now()),
        mimeType: mimeType || "image/jpeg",
        target: targetCategory,
        folderId: targetFolder ? targetFolder.id : "",
        targetFolderId: targetFolder ? targetFolder.id : ""
      })
    });
    let res = null;
    try {
      res = await resp.json();
    } catch (parseErr) {
      console.warn("[Drive Upload] Respon bukan JSON valid:", parseErr);
    }
    if (res && (res.result === "success" || res.status === "success") && res.url) {
      let finalUrl = res.url;
      const idMatch = finalUrl.match(/id=([a-zA-Z0-9_-]+)/) || finalUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (idMatch && idMatch[1]) {
        finalUrl = `https://drive.google.com/file/d/${idMatch[1]}/view?usp=sharing`;
      }
      return finalUrl;
    }
  } catch (err) {
    console.warn("[Drive Upload] Gagal upload file ke Drive:", err);
  }
  return "";
}
const uploadMadingFileToDrive = uploadFileToTargetDrive;

async function submitKaryaMading(e) {
  if (e && e.preventDefault) e.preventDefault();

  const nama = (document.getElementById("karyaInputNama")?.value || "").trim();
  const angkatan = (document.getElementById("karyaInputAngkatan")?.value || "").trim();
  const kategori = document.getElementById("karyaInputKategori")?.value || "Puisi";
  const judul = (document.getElementById("karyaInputJudul")?.value || "").trim();
  const isiTeks = (document.getElementById("karyaInputIsiTeks")?.value || "").trim();
  const catatan = (document.getElementById("karyaInputCatatan")?.value || "").trim();

  if (!nama || !angkatan || !judul || !isiTeks) {
    if (typeof showToast === "function") showToast("Harap lengkapi semua kolom wajib bertanda bintang!", "warning");
    return;
  }

  const btn = document.getElementById("btnSubmitKaryaMading");
  const icon = document.getElementById("iconSubmitKarya");
  const label = document.getElementById("labelSubmitKarya");

  if (btn) btn.disabled = true;
  if (icon) icon.className = "fa-solid fa-spinner fa-spin";
  if (label) label.textContent = "Menyimpan Karya...";

  try {
    // 1. Pastikan membaca berkas naskah langsung jika FileReader belum sempat selesai
    const fileInputEl = document.getElementById("karyaInputFileDokumen");
    if (!selectedKaryaDocBase64 && fileInputEl && fileInputEl.files && fileInputEl.files[0]) {
      try {
        const pickedFile = fileInputEl.files[0];
        selectedKaryaDocBase64 = await new Promise((res, rej) => {
          const fr = new FileReader();
          fr.onload = ev => res(ev.target.result);
          fr.onerror = rej;
          fr.readAsDataURL(pickedFile);
        });
        selectedKaryaDocName = pickedFile.name;
        selectedKaryaDocMime = pickedFile.type || "application/octet-stream";
      } catch(errRead) {
        console.warn("Gagal membaca berkas naskah:", errRead);
      }
    }

    // 1. Upload Berkas ke Google Drive Hosting (Folder Mading / Fallback MASTER) - TANPA SENTUH GOOGLE SHEET
    let finalFoto = "";
    let finalProfil = "";
    let finalDoc = "";

    if (selectedKaryaFotoBase64) {
      if (label) label.textContent = "Mengunggah foto karya ke Google Drive...";
      finalFoto = await uploadFileToTargetDrive(
        selectedKaryaFotoBase64,
        "Karya-" + Date.now() + "-" + (selectedKaryaFotoName || "karya.jpg"),
        "image/jpeg",
        "Mading"
      );
    }

    if (selectedKaryaFotoProfilBase64) {
      if (label) label.textContent = "Mengunggah foto profil ke Google Drive...";
      finalProfil = await uploadFileToTargetDrive(
        selectedKaryaFotoProfilBase64,
        "Profil-" + Date.now() + "-" + (selectedKaryaFotoProfilName || "profil.jpg"),
        "image/jpeg",
        "Mading"
      );
    }

    if (selectedKaryaDocBase64) {
      if (label) label.textContent = "Mengunggah naskah dokumen ke Google Drive...";
      finalDoc = await uploadFileToTargetDrive(
        selectedKaryaDocBase64,
        "Naskah-" + Date.now() + "-" + (selectedKaryaDocName || "naskah.pdf"),
        selectedKaryaDocMime || "application/pdf",
        "Mading"
      );
    }

    // 2. SIMPAN MURNI HANYA KE SUPABASE DATABASE (public.mading) — GOOGLE SHEET 100% TIDAK TERSENTUH
    if (label) label.textContent = "Menyimpan ke Cloud Supabase...";
    const finalKodeId = `KRY-${Date.now().toString().slice(-6)}`;

    if (window.SupabaseDB && window.SupabaseDB.isConfigured()) {
      await window.SupabaseDB.insertMading({
        kode_id: finalKodeId,
        nama: nama,
        angkatan: angkatan,
        kategori: kategori,
        judul: judul,
        foto: finalFoto || "",
        isi_teks: isiTeks,
        file_dokumen: finalDoc || "",
        catatan: catatan,
        foto_profil: finalProfil || ""
      });
      console.log("[Mading] Sukses tersimpan murni ke Supabase Cloud (Google Sheet dinonaktifkan):", finalKodeId);
    } else {
      throw new Error("Supabase Database belum terhubung.");
    }

    if (typeof showToast === "function") {
      showToast("Alhamdulillah! Karya seni berhasil dikirim ke Mading Teater Q.", "success");
    }

    // Kirim Notifikasi Telegram Realtime ke Admin Teater Q
    try {
      const nowStr = new Date().toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
      const fileDocDisplay = finalDoc ? `<a href="${finalDoc}">Buka Berkas Naskah/Dokumen</a>` : (selectedKaryaDocName ? `<i>(${escapeHtml(selectedKaryaDocName)})</i>` : "<i>(Teks langsung di mading)</i>");
      const cuplikan = isiTeks ? (isiTeks.length > 120 ? isiTeks.substring(0, 115) + "..." : isiTeks) : "-";
      const msgMading = `🎨 <b>NOTIFIKASI MADING KARYA BARU</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `✨ <b>Judul Karya:</b> ${escapeHtml(judul)}\n` +
        `👤 <b>Pengirim:</b> ${escapeHtml(nama)} (Angkatan ${escapeHtml(angkatan)})\n` +
        `🏷️ <b>Kategori:</b> ${escapeHtml(kategori)}\n` +
        `📝 <b>Cuplikan Isi:</b> <i>"${escapeHtml(cuplikan)}"</i>\n` +
        `📎 <b>Lampiran:</b> ${fileDocDisplay}\n` +
        `⏰ <b>Waktu:</b> ${nowStr} WIB\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `<i>Mading Digital Anggota Teater Q (Supabase Cloud Database)</i>`;
      sendTelegramAdminNotification(msgMading);
    } catch(errNotif) {}

    // Reset form dan preview
    resetModalKirimKarya();
    closeModalKirimKarya();

    // Hapus cache mading lokal dan segarkan otomatis
    try { localStorage.removeItem("tq_cache_mading"); } catch(e){}
    madingLoaded = false;
    setTimeout(() => {
      ensureMadingLoaded(true);
    }, 500);
  } catch (err) {
    console.error("Gagal submit karya mading:", err);
    if (typeof showToast === "function") {
      showToast(`Gagal mengirim karya: ${err.message || "Koneksi terganggu"}`, "error");
    }
  } finally {
    if (btn) btn.disabled = false;
    if (icon) icon.className = "fa-solid fa-paper-plane";
    if (label) label.textContent = "Kirim Karya Sekarang";
  }
}

// ============================================================================
// 9.c MUTER (MUSYAWARAH TEATER) — READ-ONLY PAPERLESS DIGITAL READER
// ============================================================================
let portalMuterDocs = [];
let portalFilteredMuterDocs = [];
let portalActiveMuterIndex = -1;
let portalMuterLoaded = false;
let portalMuterLoading = false;
let portalCurrentMuterFontSize = 14;
let portalInDocMatches = [];
let portalInDocActiveIndex = -1;

function normalizePortalPeriode(str) {
  return String(str || "").trim().replace(/\s+/g, "").replace(/\//g, "-");
}

function getPortalMuterStatusBadge(status) {
  const s = String(status || "").toLowerCase();
  if (s.includes("sah") || s.includes("fix")) {
    return `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"><i class="fa-solid fa-circle-check text-[9px]"></i> <span>Disahkan Fix</span></span>`;
  }
  return `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30"><i class="fa-solid fa-pen-ruler text-[9px]"></i> <span>Draf Pembahasan</span></span>`;
}

function getOfficialDefaultMuterDocs() {
  return [
    {
      _rowIndex: 2,
      ID: "MTR-01",
      PERIODE: "2025-2026",
      KATEGORI: "Anggaran Dasar",
      JUDUL: "Anggaran Dasar (AD) Teater Q",
      STATUS: "Disahkan Fix",
      DITETAPKAN_DI: "Surabaya",
      TANGGAL_TETAP: "18 Januari 2025",
      PUKUL_TETAP: "22.30 WIB",
      KETUA_SIDANG: "M. Irfan Hakim (Presidium I)",
      SEKRETARIS_SIDANG: "Nabila Zahra (Presidium II)",
      TTD_KETUA: "",
      TTD_SEKRETARIS: "",
      Timestamp: "18/01/2025 22:30:00",
      "ISI DOKUMEN": `MUKADIMAH
Bahwa sesungguhnya kesenian adalah manifestasi nilai estetika, kemanusiaan, dan spiritualitas yang luhur. Mahasiswa sebagai agen perubahan moral dan intelektual memiliki tanggung jawab mengabdi kepada masyarakat melalui wadah ekspresi seni teaterikal yang santun, religius, dan berkeadaban.
Atas berkat rahmat Allah SWT, maka dibentuklah Anggaran Dasar UKM Paguyuban Teater "Q" UIN Sunan Ampel Surabaya sebagai pedoman pokok organisasi.

BAB I : NAMA, WAKTU, DAN TEMPAT KEDUDUKAN
Pasal 1 : Organisasi ini bernama Unit Kegiatan Mahasiswa (UKM) Paguyuban Teater "Q" UIN Sunan Ampel Surabaya.
Pasal 2 : Didirikan di Surabaya pada tanggal 19 September 1989 untuk jangka waktu yang tidak ditentukan.
Pasal 3 : UKM Paguyuban Teater "Q" berkedudukan di lingkungan Kampus UIN Sunan Ampel Surabaya, Jawa Timur.

BAB II : ASAS, SIFAT, DAN TUJUAN
Pasal 4 : Teater "Q" berazaskan Pancasila, Undang-Undang Dasar 1945, dan berlandaskan nilai-nilai keislaman serta Tri Dharma Perguruan Tinggi.
Pasal 5 : Teater "Q" bersifat independen, kekeluargaan, demokratis, dan bergerak dalam bidang pengembangan minat, bakat, keaktoran, penulisan naskah, musik, serta artistik seni peran teater.
Pasal 6 : Tujuan organisasi adalah membentuk insan akademis yang berkarakter, berakhlak mulia, berwawasan estetik, serta tanggap terhadap dinamika sosial budaya melalui karya seni drama dan teater.

BAB III : FUNGSI DAN PERAN
Pasal 7 : Berfungsi sebagai laboratorium kreasi dan apresiasi teater bagi mahasiswa UIN Sunan Ampel Surabaya.
Pasal 8 : Berperan aktif menjalin silaturahmi seni dan kebudayaan antar paguyuban teater mahasiswa se-Indonesia.

BAB IV : KEANGGOTAAN
Pasal 9 : Keanggotaan Teater "Q" terdiri dari:
1. Anggota Muda (telah lulus Diksar Teater).
2. Anggota Madya (telah mengikuti proses produksi pementasan perdana).
3. Anggota Utama (anggota berdedikasi aktif dalam kepengurusan).
4. Anggota Kehormatan dan Alumni.
Pasal 10 : Ketentuan lebih lanjut mengenai syarat, hak, dan kewajiban anggota diatur dalam Anggaran Rumah Tangga (ART).

BAB V : STRUKTUR DAN KEKUASAAN
Pasal 11 : Kekuasaan tertinggi organisasi berada pada Musyawarah Teater (MUTER).
Pasal 12 : Kepengurusan harian dipimpin oleh Badan Pengurus Harian (BPH) yang dipilih dan disahkan dalam MUTER.

BAB VI : KEUANGAN DAN PERBENDAHARAAN
Pasal 13 : Sumber keuangan Teater "Q" diperoleh dari:
1. Iuran Wajib dan Sukarela Anggota.
2. Dana Abadi Paguyuban Teater Q.
3. Dana Hibah Kegiatan dari donatur dan sponsor halal yang tidak mengikat.
4. Hasil usaha mandiri, penjualan tiket pentas, merchandise, dan jasa panggung.
Pasal 14 : Seluruh sirkulasi keuangan dilaporkan secara terbuka dan dapat diakses pada sistem portal transparansi kas Teater Q.

BAB VII : PERUBAHAN ANGGARAN DASAR DAN PEMBUBARAN
Pasal 15 : Perubahan Anggaran Dasar hanya dapat dilakukan dalam forum resmi Musyawarah Teater (MUTER) yang memenuhi quorum 2/3 peserta penuh.
Pasal 16 : Pembubaran organisasi hanya dapat diputuskan melalui Musyawarah Luar Biasa (MUTERLUB) yang dihadiri oleh sekurang-kurangnya 3/4 dari seluruh anggota aktif dan dewan pertimbangan.`
    },
    {
      _rowIndex: 3,
      ID: "MTR-02",
      PERIODE: "2025-2026",
      KATEGORI: "Anggaran Rumah Tangga",
      JUDUL: "Anggaran Rumah Tangga (ART) Teater Q",
      STATUS: "Disahkan Fix",
      DITETAPKAN_DI: "Surabaya",
      TANGGAL_TETAP: "18 Januari 2025",
      PUKUL_TETAP: "23.45 WIB",
      KETUA_SIDANG: "M. Irfan Hakim (Presidium I)",
      SEKRETARIS_SIDANG: "Nabila Zahra (Presidium II)",
      TTD_KETUA: "",
      TTD_SEKRETARIS: "",
      Timestamp: "18/01/2025 23:45:00",
      "ISI DOKUMEN": `BAB I : KEANGGOTAAN DAN KADERISASI
Pasal 1 : Syarat Menjadi Anggota
1. Terdaftar sebagai mahasiswa aktif di salah satu fakultas lingkungan UIN Sunan Ampel Surabaya.
2. Mengisi formulir pendaftaran Diklat Ruang & Alam (Diksar Teater Q).
3. Mengikuti rangkaian orientasi seni keaktoran, keaktoran fisik, olah vokal, dan bedah naskah.
Pasal 2 : Hak Anggota
1. Setiap anggota berhak meminjam perlengkapan sanggar sesuai SOP peminjaman alat.
2. Berhak terlibat dalam produksi pementasan akbar, studi pentas, dan festival teater.
3. Berhak memberikan usulan, kritik, dan saran konstruktif demi kemajuan paguyuban.
Pasal 3 : Kewajiban Anggota
1. Menjaga kebersihan, kenyamanan, serta tata tertib di sanggar Teater Q.
2. Berperan aktif membayar iuran rutin kas dan memelihara nama baik almamater.

BAB II : BIDANG-BIDANG KEPENGURUSAN
Pasal 4 : Bidang Keaktoran bertugas menyusun modul olah tubuh, olah rasa, dan olah suara secara berkala.
Pasal 5 : Bidang Artistik & Panggung bertanggung jawab atas tata rias, kostum, tata panggung (scenography), dan tata cahaya (lighting).
Pasal 6 : Bidang Musik & Efek Suara menyusun komposisi musik pengiring naskah serta efek audio panggung.
Pasal 7 : Bidang Humas, Media & Jaringan mengelola publikasi media sosial, website portal, mading karya, dan kerja sama kemitraan teater luar kampus.
Pasal 8 : Bidang Litbang (Penelitian & Pengembangan) mendokumentasikan riset sastra drama, arsip naskah, dan evaluasi berkala kinerja organisasi.

BAB III : TATA TERTIB SANGGAR & ASET ORGANISASI
Pasal 9 : Sanggar Teater Q adalah ruang sakral berproses cipta kreasi seni bersama yang harus dijaga keasrian dan keamanannya selama 24 jam.
Pasal 10 : Properti panggung, kostum adat, alat penerangan, dan sound system tidak diperkenankan dipinjam keluar tanpa surat izin tertulis dari Ketua Umum dan Penanggung Jawab Inventaris.`
    },
    {
      _rowIndex: 4,
      ID: "MTR-03",
      PERIODE: "2025-2026",
      KATEGORI: "Tata Tertib Sidang",
      JUDUL: "Tata Tertib Sidang Pleno MUTER",
      STATUS: "Disahkan Fix",
      DITETAPKAN_DI: "Surabaya",
      TANGGAL_TETAP: "17 Januari 2025",
      PUKUL_TETAP: "20.15 WIB",
      KETUA_SIDANG: "Presidium Sidang Sementara",
      SEKRETARIS_SIDANG: "Notulen Sidang",
      TTD_KETUA: "",
      TTD_SEKRETARIS: "",
      Timestamp: "17/01/2025 20:15:00",
      "ISI DOKUMEN": `BAB I : KETENTUAN UMUM PERSIDANGAN
Pasal 1 : Nama persidangan ini adalah Musyawarah Teater (MUTER) UKM Paguyuban Teater "Q" UIN Sunan Ampel Surabaya.
Pasal 2 : Sidang diselenggarakan secara hibrida paperless digital melalui modul MUTER Portal Teater Q untuk menghemat kertas dan ramah lingkungan.

BAB II : STATUS DAN PESERTA SIDANG
Pasal 3 : Peserta sidang terdiri atas Peserta Penuh dan Peserta Peninjau.
Pasal 4 : Peserta Penuh adalah anggota sah Teater Q yang hadir dan tercatat dalam daftar presensi sidang.
Pasal 5 : Peserta Penuh memiliki Hak Bicara dan Hak Suara (1 orang 1 suara).
Pasal 6 : Peserta Peninjau memiliki Hak Bicara atas persetujuan pimpinan presidium sidang.

BAB III : QUORUM DAN PENGAMBILAN KEPUTUSAN
Pasal 7 : Sidang dinyatakan sah memenuhi quorum apabila dihadiri sekurang-kurangnya 50% + 1 dari jumlah peserta yang telah registrasi hadir.
Pasal 8 : Keputusan diambil secara musyawarah untuk mufakat. Apabila mufakat tidak tercapai, keputusan diambil melalui pemungutan suara terbanyak (voting).

BAB IV : KETUKAN PALU SIDANG
Pasal 9 : Aturan dan Makna Ketukan Palu Sidang:
1. Satu kali ketukan (1x): Mengesahkan pembahasan per pasal, menerima dan menyerahkan pimpinan sidang sementara, serta skorsing waktu di bawah 15 menit.
2. Dua kali ketukan (2x): Skorsing sidang di atas 15 menit atau mencabut kembali skorsing panjang.
3. Tiga kali ketukan (3x): Membuka dan menutup sidang pleno MUTER secara resmi, serta mengesahkan ketetapan final hasil musyawarah.`
    },
    {
      _rowIndex: 5,
      ID: "MTR-04",
      PERIODE: "2025-2026",
      KATEGORI: "Rekomendasi",
      JUDUL: "Rekomendasi Organisasi & Program Kerja Strategis",
      STATUS: "Disahkan Fix",
      DITETAPKAN_DI: "Surabaya",
      TANGGAL_TETAP: "19 Januari 2025",
      PUKUL_TETAP: "02.00 WIB",
      KETUA_SIDANG: "M. Irfan Hakim (Presidium I)",
      SEKRETARIS_SIDANG: "Nabila Zahra (Presidium II)",
      TTD_KETUA: "",
      TTD_SEKRETARIS: "",
      Timestamp: "19/01/2025 02:00:00",
      "ISI DOKUMEN": `BAB I : REKOMENDASI INTERNAL
Pasal 1 : Melanjutkan digitalisasi arsip teater dan naskah kuno paguyuban agar tersimpan abadi di cloud dan dapat dipelajari generasi baru.
Pasal 2 : Mengembangkan program lokakarya keaktoran berkala dengan menghadirkan alumni seniman teater profesional Jawa Timur.
Pasal 3 : Mempertahankan transparansi keuangan online melalui program Donasi Dana Hibah dan Kas Abadi.

BAB II : REKOMENDASI EKSTERNAL
Pasal 4 : Mempererat kolaborasi lintas komunitas teater kampus se-Surabaya dan forum teater mahasiswa nasional.
Pasal 5 : Mempersiapkan produksi pementasan lakon tahunan di panggung Gedung Kesenian Cak Durasim Surabaya.`
    }
  ];
}

async function ensureMuterLoaded(forceRefresh = false) {
  const refreshIcon = document.getElementById("refreshMuterIcon");
  if (refreshIcon) refreshIcon.classList.add("fa-spin");

  if (portalMuterLoaded && portalMuterDocs.length > 0 && !forceRefresh) {
    updatePortalMuterPeriodeDropdown();
    updatePortalMuterKpiStats();
    handlePortalMuterFilterChange();
    if (refreshIcon) refreshIcon.classList.remove("fa-spin");
    return;
  }

  const cacheKey = "tq_cache_portal_muter";
  const cached = localStorage.getItem(cacheKey);
  if (cached && !forceRefresh && portalMuterDocs.length === 0) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        portalMuterDocs = parsed;
        portalMuterLoaded = true;
        updatePortalMuterPeriodeDropdown();
        updatePortalMuterKpiStats();
        handlePortalMuterFilterChange();
      }
    } catch(e) {}
  }

  if (portalMuterLoading) return;
  portalMuterLoading = true;

  try {
    let docs = [];

    // 1. Coba ambil dari Cloud Supabase (Prioritas #1: Realtime, Kilat, Terpadu)
    if (typeof SupabaseDB !== "undefined" && SupabaseDB.isConfigured()) {
      try {
        const sbRows = await SupabaseDB.getMuter();
        if (Array.isArray(sbRows) && sbRows.length > 0) {
          docs = sbRows.map((item, idx) => {
            const rawId = item.id ? String(item.id).trim() : "";
            const idFormatted = rawId.toUpperCase().startsWith("MTR") ? rawId : `MTR-${String(item.id).padStart(2, '0')}`;
            return {
              _rowIndex: item.id || (idx + 2),
              ID: idFormatted,
              PERIODE: item.periode || "2025-2026",
              KATEGORI: item.kategori || "Anggaran Dasar",
              JUDUL: item.judul || "Dokumen MUTER",
              "ISI DOKUMEN": item.isi_dokumen || item["ISI DOKUMEN"] || "-",
              STATUS: item.status || "Disahkan Fix",
              DITETAPKAN_DI: item.ditetapkan_di || "Surabaya",
              TANGGAL_TETAP: item.tanggal_tetap || "",
              PUKUL_TETAP: item.pukul_tetap || "",
              KETUA_SIDANG: item.ketua_sidang || "",
              SEKRETARIS_SIDANG: item.sekretaris_sidang || "",
              TTD_KETUA: item.ttd_ketua || "",
              TTD_SEKRETARIS: item.ttd_sekretaris || "",
              Timestamp: item.created_at || ""
            };
          });
        }
      } catch (errSb) {
        console.warn("[MUTER] Supabase query warning:", errSb);
      }
    }

    // 2. Jika Supabase masih kosong, coba ambil dari Google Sheets GVIZ
    if (docs.length === 0 && typeof URL_MUTER_GVIZ !== "undefined" && URL_MUTER_GVIZ) {
      try {
        const rawRows = await fetchGvizTable(URL_MUTER_GVIZ);
        if (Array.isArray(rawRows) && rawRows.length > 0) {
          docs = rawRows.map((item, idx) => {
            return {
              _rowIndex: item._rowIndex || (idx + 2),
              ID: item.ID || item.id || `MTR-${String(idx + 1).padStart(2, '0')}`,
              PERIODE: item.PERIODE || item.periode || "2025-2026",
              KATEGORI: item.KATEGORI || item.kategori || "Anggaran Dasar",
              JUDUL: item.JUDUL || item.judul || "Dokumen MUTER",
              "ISI DOKUMEN": item["ISI DOKUMEN"] || item["isi dokumen"] || item["isi"] || "-",
              STATUS: item.STATUS || item.status || "Disahkan Fix",
              DITETAPKAN_DI: item["DITETAPKAN DI"] || item["ditetapkan di"] || item["ditetapkan_di"] || "Surabaya",
              TANGGAL_TETAP: item["TANGGAL TETAP"] || item["tanggal tetap"] || item["tanggal_tetap"] || "",
              PUKUL_TETAP: item["PUKUL TETAP"] || item["pukul tetap"] || item["pukul_tetap"] || "",
              KETUA_SIDANG: item["KETUA SIDANG"] || item["ketua sidang"] || item["ketua_sidang"] || item["KETUA"] || item["ketua"] || "",
              SEKRETARIS_SIDANG: item["SEKRETARIS SIDANG"] || item["sekretaris sidang"] || item["sekretaris_sidang"] || item["SEKRETARIS SID"] || item["SEKRETARIS"] || "",
              TTD_KETUA: item["TTD KETUA"] || item["ttd ketua"] || item["ttd_ketua"] || "",
              TTD_SEKRETARIS: item["TTD SEKRETARIS"] || item["ttd sekretaris"] || item["ttd_sekretaris"] || "",
              Timestamp: item.Timestamp || item.timestamp || ""
            };
          });
        }
      } catch (errGviz) {
        console.warn("Gviz MUTER tidak tersedia atau belum ada baris:", errGviz);
      }
    }

    // 3. Jika Supabase & Google Sheets belum ada baris data, gunakan dokumen resmi standar Teater Q
    if (!docs || docs.length === 0) {
      docs = getOfficialDefaultMuterDocs();
    }

    portalMuterDocs = docs;

    try {
      localStorage.setItem(cacheKey, JSON.stringify(portalMuterDocs));
    } catch(e) {}

    portalMuterLoaded = true;
    updatePortalMuterPeriodeDropdown();
    updatePortalMuterKpiStats();
    handlePortalMuterFilterChange();

    if (forceRefresh && typeof showToast === "function") {
      showToast(`Berhasil menyinkronkan ${portalMuterDocs.length} berkas persidangan MUTER.`, "success");
    }
  } catch (err) {
    console.error("Gagal memuat berkas MUTER:", err);
    if (portalMuterDocs.length === 0) {
      portalMuterDocs = getOfficialDefaultMuterDocs();
      portalMuterLoaded = true;
      updatePortalMuterPeriodeDropdown();
      updatePortalMuterKpiStats();
      handlePortalMuterFilterChange();
    }
  } finally {
    portalMuterLoading = false;
    if (refreshIcon) refreshIcon.classList.remove("fa-spin");
  }
}

function updatePortalMuterPeriodeDropdown() {
  const selectEl = document.getElementById("portalFilterPeriodeSelect");
  if (!selectEl) return;

  const currentVal = selectEl.value;
  const periodMap = new Map();
  portalMuterDocs.forEach(doc => {
    const raw = String(doc.PERIODE || "").trim();
    if (raw) {
      const norm = normalizePortalPeriode(raw);
      if (!periodMap.has(norm)) {
        periodMap.set(norm, raw);
      }
    }
  });

  if (periodMap.size === 0) {
    periodMap.set("2025-2026", "2025-2026");
  }

  const sortedNorms = Array.from(periodMap.keys()).sort((a, b) => b.localeCompare(a));
  const latestNorm = sortedNorms[0] || "all";

  let html = `<option value="all">Semua Periode (${portalMuterDocs.length} Berkas)</option>`;
  sortedNorms.forEach(normKey => {
    const displayLabel = periodMap.get(normKey);
    const count = portalMuterDocs.filter(d => normalizePortalPeriode(d.PERIODE) === normKey).length;
    const isLatest = (normKey === latestNorm);
    html += `<option value="${escapeHtml(normKey)}">Periode ${escapeHtml(displayLabel)} (${count} Berkas)${isLatest ? ' • Terbaru' : ''}</option>`;
  });

  selectEl.innerHTML = html;

  if (window.__portalUserExplicitPeriod && currentVal && (currentVal === "all" || sortedNorms.includes(normalizePortalPeriode(currentVal)))) {
    selectEl.value = currentVal === "all" ? "all" : normalizePortalPeriode(currentVal);
  } else {
    selectEl.value = latestNorm;
  }
}

function updatePortalMuterKpiStats() {
  const total = portalMuterDocs.length;
  let disahkan = 0;
  let draf = 0;

  portalMuterDocs.forEach(it => {
    const s = String(it.STATUS || "").toLowerCase();
    if (s.includes("sah") || s.includes("fix")) {
      disahkan++;
    } else {
      draf++;
    }
  });

  const totalEl = document.getElementById("portalStatTotalBerkas");
  const disahkanEl = document.getElementById("portalStatDisahkan");
  const drafEl = document.getElementById("portalStatDraf");
  const statPeriodeEl = document.getElementById("portalStatPeriodeMuter");
  const selectEl = document.getElementById("portalFilterPeriodeSelect");

  if (totalEl) totalEl.textContent = `${total} Berkas`;
  if (disahkanEl) disahkanEl.textContent = `${disahkan} Disahkan`;
  if (drafEl) drafEl.textContent = `${draf} Draf`;

  if (statPeriodeEl && selectEl) {
    if (selectEl.value === "all") {
      const latestDoc = portalMuterDocs[0];
      statPeriodeEl.textContent = latestDoc ? latestDoc.PERIODE : "Semua Periode";
    } else {
      statPeriodeEl.textContent = selectEl.options[selectEl.selectedIndex]
        ? selectEl.options[selectEl.selectedIndex].text.replace(/ \(\d+ Berkas\)/, '').replace('Periode ', '').replace(' • Terbaru', '')
        : selectEl.value;
    }
  }
}

function handlePortalMuterFilterChange() {
  const selectPeriode = document.getElementById("portalFilterPeriodeSelect")?.value || "all";
  const selectKategori = document.getElementById("portalFilterKategoriSelect")?.value || "all";
  const searchInput = document.getElementById("portalSearchDocInput");
  const query = (searchInput ? searchInput.value : "").toLowerCase().trim();

  portalFilteredMuterDocs = portalMuterDocs.filter(doc => {
    if (selectPeriode !== "all") {
      const docNorm = normalizePortalPeriode(doc.PERIODE);
      const selNorm = normalizePortalPeriode(selectPeriode);
      if (docNorm !== selNorm) return false;
    }
    if (selectKategori !== "all") {
      const docKat = String(doc.KATEGORI || "").toLowerCase().trim();
      const targetKat = selectKategori.toLowerCase().trim();
      if (!docKat.includes(targetKat) && !targetKat.includes(docKat)) return false;
    }
    if (query) {
      const matchJudul = String(doc.JUDUL || "").toLowerCase().includes(query);
      const matchId = String(doc.ID || "").toLowerCase().includes(query);
      const matchIsi = String(doc["ISI DOKUMEN"] || "").toLowerCase().includes(query);
      if (!matchJudul && !matchId && !matchIsi) return false;
    }
    return true;
  });

  const countBadge = document.getElementById("portalDocCountBadge");
  if (countBadge) countBadge.textContent = `${portalFilteredMuterDocs.length} Berkas`;

  renderPortalMuterDocList();

  if (portalFilteredMuterDocs.length > 0) {
    if (portalActiveMuterIndex < 0 || portalActiveMuterIndex >= portalFilteredMuterDocs.length) {
      selectPortalMuterDoc(0);
    } else {
      selectPortalMuterDoc(portalActiveMuterIndex);
    }
  } else {
    renderPortalMuterEmptyViewer();
  }
}

function renderPortalMuterDocList() {
  const container = document.getElementById("portalMuterDocList");
  if (!container) return;

  if (portalFilteredMuterDocs.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-slate-500 text-xs">
        <i class="fa-solid fa-folder-open text-xl mb-1 text-slate-600 block"></i>
        <p>Tidak ada berkas yang sesuai dengan filter.</p>
      </div>
    `;
    return;
  }

  let html = "";
  portalFilteredMuterDocs.forEach((doc, idx) => {
    const isActive = (idx === portalActiveMuterIndex);
    html += `
      <div 
        onclick="selectPortalMuterDoc(${idx})" 
        class="muter-doc-item p-3.5 rounded-xl cursor-pointer transition flex flex-col gap-1.5 border ${
          isActive 
            ? 'active bg-yellow-500/15 border-yellow-500/60 shadow-md ring-1 ring-yellow-500/30' 
            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
        }"
      >
        <div class="flex items-center justify-between gap-1.5">
          <span class="font-mono text-[10px] font-bold ${isActive ? 'text-yellow-400' : 'text-slate-400'}">${escapeHtml(doc.ID)}</span>
          ${getPortalMuterStatusBadge(doc.STATUS)}
        </div>

        <h4 class="text-xs font-bold leading-snug ${isActive ? 'text-white' : 'text-slate-200'}">
          ${escapeHtml(doc.JUDUL)}
        </h4>

        <div class="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/40">
          <span class="flex items-center gap-1">
            <i class="fa-solid fa-tag text-[9px] text-yellow-500/70"></i>
            <span>${escapeHtml(doc.KATEGORI)}</span>
          </span>
          <span class="font-mono text-slate-500">${escapeHtml(doc.PERIODE)}</span>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function selectPortalMuterDoc(index) {
  portalActiveMuterIndex = index;
  renderPortalMuterDocList();

  const doc = portalFilteredMuterDocs[index];
  if (!doc) return;

  const docIdEl = document.getElementById("portalViewDocId");
  const docJudulEl = document.getElementById("portalViewDocJudul");
  const docKategoriEl = document.getElementById("portalViewDocKategori");
  const docPeriodeEl = document.getElementById("portalViewDocPeriode");
  const docTimestampEl = document.getElementById("portalViewDocTimestamp");
  const docStatusContainer = document.getElementById("portalViewDocStatusContainer");

  if (docIdEl) docIdEl.textContent = doc.ID;
  if (docJudulEl) docJudulEl.textContent = doc.JUDUL;
  if (docKategoriEl) docKategoriEl.textContent = doc.KATEGORI;
  if (docPeriodeEl) docPeriodeEl.textContent = doc.PERIODE;
  if (docTimestampEl) {
    docTimestampEl.innerHTML = `
      <i class="fa-regular fa-clock text-[10px]"></i>
      <span>Diperbarui: ${escapeHtml(doc.Timestamp || "Tersimpan Resmi di Cloud")}</span>
    `;
  }
  if (docStatusContainer) {
    docStatusContainer.innerHTML = getPortalMuterStatusBadge(doc.STATUS);
  }

  const paper = document.getElementById("portalPaperReaderContainer");
  if (paper) {
    paper.innerHTML = formatPortalPaperText(doc["ISI DOKUMEN"]) + renderPortalPenetapanSidangView(doc);
    paper.scrollTop = 0;
  }

  // Update top Prev & Next navigation
  const btnPrev = document.getElementById("portalBtnTopPrevDoc");
  const btnNext = document.getElementById("portalBtnTopNextDoc");
  if (btnPrev) {
    btnPrev.disabled = (index <= 0);
    btnPrev.title = index > 0 ? `Sebelumnya: ${portalFilteredMuterDocs[index - 1].JUDUL}` : "Awal berkas";
  }
  if (btnNext) {
    btnNext.disabled = (index >= portalFilteredMuterDocs.length - 1);
    btnNext.title = index < portalFilteredMuterDocs.length - 1 ? `Berikutnya: ${portalFilteredMuterDocs[index + 1].JUDUL}` : "Akhir berkas";
  }

  // Reset In-Doc Search
  const searchInput = document.getElementById("portalInDocSearchInput");
  if (searchInput) searchInput.value = "";
  const countBadge = document.getElementById("portalInDocSearchCount");
  if (countBadge) countBadge.classList.add("hidden");
  portalInDocMatches = [];
  portalInDocActiveIndex = -1;
}

function renderPortalMuterEmptyViewer() {
  const paper = document.getElementById("portalPaperReaderContainer");
  if (paper) {
    paper.innerHTML = `
      <div class="text-center py-16 text-slate-500 text-xs font-sans">
        <i class="fa-solid fa-folder-open text-3xl mb-2 text-slate-600 block"></i>
        <p>Tidak ada berkas yang cocok dengan filter pencarian.</p>
      </div>
    `;
  }
  const docIdEl = document.getElementById("portalViewDocId");
  const docJudulEl = document.getElementById("portalViewDocJudul");
  if (docIdEl) docIdEl.textContent = "-";
  if (docJudulEl) docJudulEl.textContent = "Tidak Ada Dokumen";
}

function formatPortalPaperText(rawText, highlightQuery = "") {
  if (!rawText || rawText === "-") {
    return `<p class="text-slate-500 italic font-sans py-4">Dokumen ini belum memiliki isi teks persidangan.</p>`;
  }

  const lines = rawText.split("\n");
  let formattedHtml = "";

  const query = (highlightQuery || "").trim();
  const regex = query ? new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "gi") : null;

  function highlightText(text) {
    const escaped = escapeHtml(text);
    if (!regex) return escaped;
    return escaped.replace(regex, `<mark class="portal-in-doc-match bg-yellow-400 text-slate-950 font-bold px-0.5 rounded">$1</mark>`);
  }

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) {
      formattedHtml += `<br>`;
      return;
    }

    if (trimmed.toUpperCase().startsWith("BAB ")) {
      formattedHtml += `<div class="font-black text-amber-400 text-base sm:text-lg tracking-wider uppercase mt-5 mb-1.5 text-center font-sans">${highlightText(trimmed)}</div>`;
    } else if (trimmed.toUpperCase().startsWith("PASAL ")) {
      formattedHtml += `<div class="font-black text-white text-sm sm:text-base mt-4 mb-1 border-b border-slate-800 pb-0.5 font-sans">${highlightText(trimmed)}</div>`;
    } else {
      formattedHtml += `<div class="text-slate-300 leading-relaxed pl-1 sm:pl-2.5 my-0.5">${highlightText(trimmed)}</div>`;
    }
  });

  return formattedHtml;
}

function renderPortalPenetapanSidangView(doc) {
  if (!doc) return "";
  const tempat = doc.DITETAPKAN_DI || "Surabaya";
  const tanggal = doc.TANGGAL_TETAP || "-";
  const pukul = doc.PUKUL_TETAP || "-";
  const ketua = doc.KETUA_SIDANG ? doc.KETUA_SIDANG.trim() : "";
  const sekretaris = doc.SEKRETARIS_SIDANG ? doc.SEKRETARIS_SIDANG.trim() : "";
  const ttdKetua = doc.TTD_KETUA || "";
  const ttdSekretaris = doc.TTD_SEKRETARIS || "";

  return `
    <div class="mt-12 pt-8 border-t border-yellow-500/20 text-xs text-slate-300 font-sans select-none pb-12">
      <!-- Info Waktu & Tempat Penetapan -->
      <div class="flex justify-end mb-6 text-[11px] text-slate-400">
        <table class="border-collapse text-left">
          <tr>
            <td class="pr-2 py-0.5">Ditetapkan di</td>
            <td class="px-2">:</td>
            <td class="text-white font-medium">${escapeHtml(tempat)}</td>
          </tr>
          <tr>
            <td class="pr-2 py-0.5">Tanggal</td>
            <td class="px-2">:</td>
            <td class="text-white font-medium">${escapeHtml(tanggal || "Belum ditetapkan")}</td>
          </tr>
          <tr>
            <td class="pr-2 py-0.5">Pukul</td>
            <td class="px-2">:</td>
            <td class="text-white font-medium">${escapeHtml(pukul || "-")}</td>
          </tr>
        </table>
      </div>

      <!-- Judul Pimpinan Sidang -->
      <p class="text-center font-black text-amber-300 text-xs sm:text-sm uppercase tracking-widest mb-4">
        Pimpinan Sidang
      </p>

      <!-- 2 Kolom Pimpinan: Ketua & Sekretaris -->
      <div class="flex justify-around items-end text-center">
        <!-- Ketua Sidang -->
        <div class="w-5/12 flex flex-col items-center">
          <span class="font-bold text-slate-200 text-xs mb-1">Ketua</span>
          <div class="h-16 flex items-center justify-center mb-1">
            ${ttdKetua ? `<img src="${ttdKetua}" alt="TTD Ketua" class="h-14 max-w-[130px] object-contain filter invert contrast-200" />` : `<span class="text-[10px] text-slate-500 italic">(Belum ada TTD)</span>`}
          </div>
          <span class="font-bold text-yellow-300 text-xs border-b border-yellow-500/40 pb-0.5">
            ${escapeHtml(ketua || "( .................................... )")}
          </span>
        </div>

        <!-- Sekretaris Sidang -->
        <div class="w-5/12 flex flex-col items-center">
          <span class="font-bold text-slate-200 text-xs mb-1">Sekretaris</span>
          <div class="h-16 flex items-center justify-center mb-1">
            ${ttdSekretaris ? `<img src="${ttdSekretaris}" alt="TTD Sekretaris" class="h-14 max-w-[130px] object-contain filter invert contrast-200" />` : `<span class="text-[10px] text-slate-500 italic">(Belum ada TTD)</span>`}
          </div>
          <span class="font-bold text-yellow-300 text-xs border-b border-yellow-500/40 pb-0.5">
            ${escapeHtml(sekretaris || "( .................................... )")}
          </span>
        </div>
      </div>

      <!-- Navigasi Bawah Berkas (Prev / Next) -->
      ${(() => {
        const prevDoc = portalActiveMuterIndex > 0 ? portalFilteredMuterDocs[portalActiveMuterIndex - 1] : null;
        const nextDoc = (portalActiveMuterIndex >= 0 && portalActiveMuterIndex < portalFilteredMuterDocs.length - 1) ? portalFilteredMuterDocs[portalActiveMuterIndex + 1] : null;
        if (!prevDoc && !nextDoc) return '';
        return `
          <div class="mt-8 pt-5 border-t border-dashed border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 select-none">
            ${prevDoc ? `
              <button type="button" onclick="navigatePortalMuterAdjacentDoc(-1)" class="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-2 border border-slate-700">
                <i class="fa-solid fa-arrow-left text-yellow-400"></i>
                <span class="truncate max-w-[200px]">Sebelumnya: ${escapeHtml(prevDoc.JUDUL || "Berkas")}</span>
              </button>
            ` : `<div></div>`}
            
            ${nextDoc ? `
              <button type="button" onclick="navigatePortalMuterAdjacentDoc(1)" class="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-slate-950 text-xs font-bold transition flex items-center justify-end gap-2 shadow-md">
                <span class="truncate max-w-[200px]">Lanjut: ${escapeHtml(nextDoc.JUDUL || "Berkas")}</span>
                <i class="fa-solid fa-arrow-right"></i>
              </button>
            ` : `<div></div>`}
          </div>
        `;
      })()}
    </div>
  `;
}

function navigatePortalMuterAdjacentDoc(direction) {
  if (!portalFilteredMuterDocs || portalFilteredMuterDocs.length === 0) return;
  const targetIndex = portalActiveMuterIndex + direction;
  if (targetIndex >= 0 && targetIndex < portalFilteredMuterDocs.length) {
    selectPortalMuterDoc(targetIndex);
    const paper = document.getElementById("portalPaperReaderContainer");
    if (paper) {
      paper.scrollTo({ top: 0, behavior: "smooth" });
    }
  }
}

function changePortalMuterFontSize(delta) {
  portalCurrentMuterFontSize = Math.max(11, Math.min(26, portalCurrentMuterFontSize + delta));
  const paper = document.getElementById("portalPaperReaderContainer");
  if (paper) {
    paper.style.fontSize = `${portalCurrentMuterFontSize}px`;
  }
}

function togglePortalMuterFullscreen() {
  const elem = document.getElementById("portalMuterReaderWorkspace");
  if (!elem) return;

  if (!document.fullscreenElement) {
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen();
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}

function handlePortalInDocSearch() {
  const input = document.getElementById("portalInDocSearchInput");
  const query = (input ? input.value : "").trim();
  const countBadge = document.getElementById("portalInDocSearchCount");

  const doc = portalFilteredMuterDocs[portalActiveMuterIndex];
  const paper = document.getElementById("portalPaperReaderContainer");
  if (!doc || !paper) return;

  if (!query) {
    if (countBadge) countBadge.classList.add("hidden");
    paper.innerHTML = formatPortalPaperText(doc["ISI DOKUMEN"]) + renderPortalPenetapanSidangView(doc);
    portalInDocMatches = [];
    portalInDocActiveIndex = -1;
    return;
  }

  paper.innerHTML = formatPortalPaperText(doc["ISI DOKUMEN"], query) + renderPortalPenetapanSidangView(doc);
  portalInDocMatches = Array.from(paper.querySelectorAll(".portal-in-doc-match"));

  if (portalInDocMatches.length > 0) {
    portalInDocActiveIndex = 0;
    if (countBadge) {
      countBadge.classList.remove("hidden");
      countBadge.textContent = `${portalInDocActiveIndex + 1}/${portalInDocMatches.length}`;
    }
    highlightPortalActiveMatch();
  } else {
    portalInDocActiveIndex = -1;
    if (countBadge) {
      countBadge.classList.remove("hidden");
      countBadge.textContent = "0 ditemukan";
    }
  }
}

function navigatePortalSearchMatch(direction) {
  if (portalInDocMatches.length === 0) return;
  portalInDocActiveIndex += direction;
  if (portalInDocActiveIndex >= portalInDocMatches.length) {
    portalInDocActiveIndex = 0;
  } else if (portalInDocActiveIndex < 0) {
    portalInDocActiveIndex = portalInDocMatches.length - 1;
  }
  const countBadge = document.getElementById("portalInDocSearchCount");
  if (countBadge) countBadge.textContent = `${portalInDocActiveIndex + 1}/${portalInDocMatches.length}`;
  highlightPortalActiveMatch();
}

function highlightPortalActiveMatch() {
  portalInDocMatches.forEach((el, idx) => {
    if (idx === portalInDocActiveIndex) {
      el.className = "portal-in-doc-match bg-amber-400 text-slate-950 font-black px-1 rounded shadow-md ring-2 ring-white scale-110 inline-block transition-all";
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      el.className = "portal-in-doc-match bg-yellow-400 text-slate-950 font-bold px-0.5 rounded";
    }
  });
}

function clearPortalInDocSearch() {
  const input = document.getElementById("portalInDocSearchInput");
  if (input) input.value = "";
  handlePortalInDocSearch();
}

function formatPaperTextForPrint(rawText) {
  if (!rawText || rawText === "-") {
    return `<p style="font-style: italic; color: #555; text-align: center; margin: 30px 0;">(Dokumen ini belum memiliki isi naskah persidangan)</p>`;
  }
  const lines = rawText.split("\n");
  let formattedHtml = "";
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) {
      formattedHtml += `<div style="height: 8px;"></div>`;
      return;
    }
    if (trimmed.toUpperCase().startsWith("BAB ")) {
      formattedHtml += `<div style="font-size: 12.5pt; font-weight: bold; text-align: center; margin-top: 18px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">${escapeHtml(trimmed)}</div>`;
    } else if (trimmed.toUpperCase().startsWith("PASAL ")) {
      formattedHtml += `<div style="font-size: 11.5pt; font-weight: bold; margin-top: 14px; margin-bottom: 4px; text-align: center;">${escapeHtml(trimmed)}</div>`;
    } else {
      formattedHtml += `<div style="font-size: 11pt; line-height: 1.6; text-align: justify; margin-bottom: 4px; text-indent: 28px;">${escapeHtml(trimmed)}</div>`;
    }
  });
  return formattedHtml;
}

function printPortalMuterDocument() {
  const doc = portalFilteredMuterDocs[portalActiveMuterIndex];
  if (!doc) {
    if (typeof showToast === "function") showToast("Pilih berkas dokumen yang ingin dicetak terlebih dahulu.", "warning");
    return;
  }

  document.getElementById("portalPrintJudul").textContent = doc.JUDUL || "Ketetapan Dokumen Sidang MUTER";
  document.getElementById("portalPrintSubjudul").textContent = `PERIODE: ${doc.PERIODE || "2025-2026"} | KETETAPAN: ${doc.STATUS || "Disahkan Fix"}`;
  document.getElementById("portalPrintIsi").innerHTML = formatPaperTextForPrint(doc["ISI DOKUMEN"]);

  const tempat = doc.DITETAPKAN_DI || "Surabaya";
  const tgl = doc.TANGGAL_TETAP || "-";
  const pkl = doc.PUKUL_TETAP || "-";
  const namaKetua = doc.KETUA_SIDANG ? doc.KETUA_SIDANG.trim() : "";
  const namaSekretaris = doc.SEKRETARIS_SIDANG ? doc.SEKRETARIS_SIDANG.trim() : "";

  document.getElementById("portalPrintDitetapkanDi").textContent = tempat;
  document.getElementById("portalPrintTanggalTetap").textContent = tgl;
  document.getElementById("portalPrintPukulTetap").textContent = pkl;

  document.getElementById("portalPrintNamaKetua").textContent = namaKetua ? namaKetua : "( .................................... )";
  document.getElementById("portalPrintNamaSekretaris").textContent = namaSekretaris ? namaSekretaris : "( .................................... )";

  const ketuaTtdBox = document.getElementById("portalPrintTtdKetuaContainer");
  if (doc.TTD_KETUA && doc.TTD_KETUA.startsWith("data:image")) {
    ketuaTtdBox.innerHTML = `<img src="${doc.TTD_KETUA}" style="height: 60px; max-width: 140px; object-fit: contain;" alt="TTD Ketua" />`;
  } else {
    ketuaTtdBox.innerHTML = "";
  }

  const sekrTtdBox = document.getElementById("portalPrintTtdSekretarisContainer");
  if (doc.TTD_SEKRETARIS && doc.TTD_SEKRETARIS.startsWith("data:image")) {
    sekrTtdBox.innerHTML = `<img src="${doc.TTD_SEKRETARIS}" style="height: 60px; max-width: 140px; object-fit: contain;" alt="TTD Sekretaris" />`;
  } else {
    sekrTtdBox.innerHTML = "";
  }

  setTimeout(() => {
    window.print();
  }, 100);
}

// Global window exposure for inline event handlers
if (typeof window !== "undefined") {
  window.ensureMadingLoaded = ensureMadingLoaded;
  window.setMadingCategoryFilter = setMadingCategoryFilter;
  window.onSearchMadingChange = onSearchMadingChange;
  window.openMadingReader = openMadingReader;
  window.closeMadingReader = closeMadingReader;
  window.changeMadingReaderFontSize = changeMadingReaderFontSize;

  window.ensureMuterLoaded = ensureMuterLoaded;
  window.handlePortalMuterFilterChange = handlePortalMuterFilterChange;
  window.selectPortalMuterDoc = selectPortalMuterDoc;
  window.navigatePortalMuterAdjacentDoc = navigatePortalMuterAdjacentDoc;
  window.changePortalMuterFontSize = changePortalMuterFontSize;
  window.togglePortalMuterFullscreen = togglePortalMuterFullscreen;
  window.printPortalMuterDocument = printPortalMuterDocument;
  window.handlePortalInDocSearch = handlePortalInDocSearch;
  window.navigatePortalSearchMatch = navigatePortalSearchMatch;
  window.clearPortalInDocSearch = clearPortalInDocSearch;
}

// ============================================================================
// 10. STRUKTUR & PENGURUS
// ============================================================================
let currentSelectedPeriode = "";

function togglePeriodeDropdown() {
  const menu = document.getElementById("customPeriodeMenu");
  const arrow = document.getElementById("iconPeriodeArrow");
  if (!menu) return;

  const isHidden = menu.classList.contains("hidden");
  if (isHidden) {
    menu.classList.remove("hidden");
    if (arrow) arrow.classList.add("rotate-180");
    const searchInput = document.getElementById("searchPeriodeFilter");
    if (searchInput) {
      searchInput.value = "";
      filterPeriodeListItems("");
    }
  } else {
    closePeriodeDropdown();
  }
}
window.togglePeriodeDropdown = togglePeriodeDropdown;

function closePeriodeDropdown() {
  const menu = document.getElementById("customPeriodeMenu");
  const arrow = document.getElementById("iconPeriodeArrow");
  if (menu) menu.classList.add("hidden");
  if (arrow) arrow.classList.remove("rotate-180");
}
window.closePeriodeDropdown = closePeriodeDropdown;

function filterPeriodeListItems(query) {
  const q = (query || "").toLowerCase().trim();
  const items = document.querySelectorAll("#customPeriodeList .custom-periode-btn");
  items.forEach(it => {
    const text = (it.dataset.periode || it.textContent).toLowerCase();
    it.style.display = (!q || text.includes(q)) ? "flex" : "none";
  });
}
window.filterPeriodeListItems = filterPeriodeListItems;

function selectCustomPeriode(periode, displayLabel) {
  currentSelectedPeriode = (periode || "").trim();

  const labelEl = document.getElementById("selectedPeriodeLabel");
  if (labelEl) {
    labelEl.textContent = currentSelectedPeriode ? `Periode ${currentSelectedPeriode}` : "Semua Periode";
  }

  const items = document.querySelectorAll("#customPeriodeList .custom-periode-btn");
  items.forEach(it => {
    const itPer = (it.dataset.periode || "");
    const match = (!currentSelectedPeriode && (itPer === "" || itPer.includes("semua"))) || 
                  (currentSelectedPeriode && itPer.toLowerCase() === currentSelectedPeriode.toLowerCase());
    if (match) {
      it.className = "custom-periode-btn active w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2.5 transition-colors bg-amber-600/20 text-amber-300 font-bold border border-amber-500/30";
    } else {
      it.className = "custom-periode-btn w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2.5 transition-colors text-slate-300 hover:bg-slate-800 hover:text-white";
    }
  });

  closePeriodeDropdown();
  pengurusLimit = 20;
  renderPengurus();
}
window.selectCustomPeriode = selectCustomPeriode;

function populatePeriodeFilter() {
  const customList = document.getElementById("customPeriodeList");
  if (!customList || !pengurusData || !pengurusData.length) return;

  const countPerPeriode = {};
  pengurusData.forEach(row => {
    const p = (row["PERIODE"] || row["Periode"] || "").trim();
    if (p) {
      countPerPeriode[p] = (countPerPeriode[p] || 0) + 1;
    }
  });

  const sortedPeriodes = Object.keys(countPerPeriode).sort((a, b) => {
    const numA = parseInt(a.match(/\d{4}/)?.[0] || "0", 10);
    const numB = parseInt(b.match(/\d{4}/)?.[0] || "0", 10);
    return numB - numA;
  });

  const isAllSel = !currentSelectedPeriode;
  let listHtml = `
    <button type="button" onclick="selectCustomPeriode('', 'Semua Periode')" class="custom-periode-btn ${isAllSel ? 'active' : ''} w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2.5 transition-colors ${isAllSel ? 'bg-amber-600/20 text-amber-300 font-bold border border-amber-500/30' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}" data-periode="">
      <span class="flex-1 flex items-center gap-2 leading-snug">
        <i class="fas fa-layer-group text-[10px] shrink-0 ${isAllSel ? 'text-amber-400' : 'text-slate-500'}"></i>
        <span class="font-medium">Semua Periode</span>
      </span>
      <span class="periode-count-badge text-[11px] font-bold px-2 py-0.5 rounded-full font-mono shrink-0">
        ${pengurusData.length}
      </span>
    </button>
  `;

  sortedPeriodes.forEach(p => {
    const isSel = (currentSelectedPeriode.toLowerCase() === p.toLowerCase());
    listHtml += `
      <button type="button" onclick="selectCustomPeriode('${escapeHtml(p)}', 'Periode ${escapeHtml(p)}')" class="custom-periode-btn ${isSel ? 'active' : ''} w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2.5 transition-colors ${isSel ? 'bg-amber-600/20 text-amber-300 font-bold border border-amber-500/30' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}" data-periode="${escapeHtml(p.toLowerCase())}">
        <span class="flex-1 flex items-center gap-2 leading-snug">
          <i class="fas fa-calendar-alt text-[10px] shrink-0 ${isSel ? 'text-amber-400' : 'text-slate-500'}"></i>
          <span class="font-medium break-words">Periode ${escapeHtml(p)}</span>
        </span>
        <span class="periode-count-badge text-[11px] font-bold px-2 py-0.5 rounded-full font-mono shrink-0">
          ${countPerPeriode[p]}
        </span>
      </button>
    `;
  });

  customList.innerHTML = listHtml;
}
window.populatePeriodeFilter = populatePeriodeFilter;

function renderPengurus() {
  const container = document.getElementById("pengurusGrid");
  const btnContainer = document.getElementById("btnMorePengurus");
  const infoText = document.getElementById("infoPengurus");
  if (!container) return;

  const keyword = (document.getElementById("searchPengurus")?.value || "").toLowerCase();
  const selectedPeriode = (currentSelectedPeriode || "").trim().toLowerCase();

  const filtered = pengurusData.filter(row => {
    const nama = (row["NAMA"] || row["Nama"] || "").toLowerCase();
    const jab  = (row["JABATAN"] || row["Jabatan"] || "").toLowerCase();
    const per  = (row["PERIODE"] || row["Periode"] || "").trim().toLowerCase();

    const matchesKeyword = !keyword || nama.includes(keyword) || jab.includes(keyword) || per.includes(keyword);
    const matchesPeriode = !selectedPeriode || per === selectedPeriode;

    return matchesKeyword && matchesPeriode;
  });
  updateSectionCounter("pengurus", filtered.length);

  if (!filtered.length) {
    container.innerHTML = "<div style='color: white; text-align:center; grid-column:1/-1;'>Tidak ada pengurus yang sesuai.</div>";
    if (btnContainer) btnContainer.style.display = "none";
    return;
  }

  const dataToRender = filtered.slice(0, pengurusLimit);
  container.innerHTML = dataToRender.map(row => {
    const foto = convertDriveImage(row["FOTO"] || row["Foto"] || "") || DEFAULT_NO_IMAGE;
    const nama = row["NAMA"] || "-";
    const jabatan = row["JABATAN"] || "-";
    const periode = row["PERIODE"] || "-";
    const jabLower = jabatan.toLowerCase();

    let badgeClass = "bg-slate-800/90 text-slate-200 border border-slate-700/80";
    let badgeIcon = '<i class="fa-solid fa-user-tag text-[9px] mr-1"></i>';
    let rolePillClass = "role-pill-default";

    if (jabLower.includes("ketua umum") || jabLower === "ketua") {
      badgeClass = "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black border border-amber-300 shadow-sm shadow-amber-500/20";
      badgeIcon = '<i class="fa-solid fa-crown text-[9px] mr-1"></i>';
      rolePillClass = "role-pill-ketua";
    } else if (jabLower.includes("wakil") || jabLower.includes("sekretaris") || jabLower.includes("bendahara")) {
      badgeClass = "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border border-blue-400/40 shadow-sm shadow-blue-500/20";
      badgeIcon = '<i class="fa-solid fa-shield-halved text-[9px] mr-1"></i>';
      rolePillClass = "role-pill-bph";
    } else if (jabLower.includes("divisi") || jabLower.includes("bidang") || jabLower.includes("koordinator") || jabLower.includes("kadiv")) {
      badgeClass = "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border border-emerald-400/40 shadow-sm shadow-emerald-500/20";
      badgeIcon = '<i class="fa-solid fa-star text-[9px] mr-1"></i>';
      rolePillClass = "role-pill-divisi";
    }

    return `
      <article class="card pengurus-card group flex flex-col rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1">
        <div class="relative aspect-[4/5] sm:aspect-square overflow-hidden bg-slate-900 cursor-pointer js-lightbox" data-full="${foto}" data-caption="${escapeHtml(nama)} - ${escapeHtml(jabatan)} (${escapeHtml(periode)})">
          <img src="${foto}" class="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105" 
            alt="${escapeHtml(nama)}" loading="lazy" onerror="this.onerror=null; this.src=DEFAULT_NO_IMAGE;">
          <div class="absolute top-2.5 left-2.5 z-10 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md bg-slate-950/75 text-slate-200 border border-slate-700/60 shadow-md">
            <i class="far fa-calendar-alt mr-1 text-amber-400"></i> ${escapeHtml(periode)}
          </div>
          <div class="absolute top-2.5 right-2.5 z-10 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide shadow-md ${badgeClass}">
            ${badgeIcon}${escapeHtml(jabatan)}
          </div>
          <div class="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none"></div>
          <div class="absolute bottom-2.5 right-2.5 w-7 h-7 rounded-full bg-black/60 backdrop-blur-xs text-white/90 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">
            <i class="fa-solid fa-magnifying-glass-plus"></i>
          </div>
        </div>
        <div class="p-3.5 sm:p-4 flex-1 flex flex-col justify-between text-center">
          <div>
            <h3 class="struktur-name font-black text-sm sm:text-base mb-1.5 line-clamp-2 uppercase tracking-tight leading-snug">
              ${escapeHtml(nama)}
            </h3>
            <div class="struktur-role inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${rolePillClass}">
              ${escapeHtml(jabatan)}
            </div>
          </div>
          <div class="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/80">
            <button type="button" 
              class="js-lightbox btn-detail-pengurus w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              data-full="${foto}" 
              data-caption="${escapeHtml(nama)} - ${escapeHtml(jabatan)} (${escapeHtml(periode)})">
              <i class="fa-solid fa-circle-user text-xs"></i> <span>Lihat Profil Foto</span>
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");

  if (filtered.length > pengurusLimit) {
    if (btnContainer) btnContainer.style.display = "block";
    if (infoText) infoText.textContent = `${pengurusLimit} dari ${filtered.length} pengurus`;
  } else {
    if (btnContainer) btnContainer.style.display = "none";
  }
}

function loadMorePengurus() {
  pengurusLimit += 20;
  renderPengurus();
}

function renderStruktur() {
  const container = document.getElementById("strukturGrid");
  if (!container) return;

  if (!pengurusData.length) {
    container.innerHTML = "<div class='col-span-full py-12 text-center text-slate-400 text-xs sm:text-sm'>Data struktur pengurus belum tersedia.</div>";
    updateSectionCounter("struktur", 0);
    return;
  }

  let latestYear = 0;
  pengurusData.forEach(row => {
    const match = (row["PERIODE"]||"").match(/(19|20)\d{2}/g);
    if (match) {
      const y = Math.max(...match.map(val => parseInt(val)));
      if (y > latestYear) latestYear = y;
    }
  });

  const filtered = latestYear > 0 
    ? pengurusData.filter(row => (row["PERIODE"]||"").includes(latestYear.toString()))
    : pengurusData;

  updateSectionCounter("struktur", filtered.length);

  const periodeBadge = document.getElementById("strukturPeriodeBadge");
  if (periodeBadge && latestYear > 0) {
    periodeBadge.textContent = `Periode ${latestYear}`;
  }

  container.innerHTML = filtered.map(row => {
    const foto = convertDriveImage(row["FOTO"] || row["Foto"] || "") || DEFAULT_NO_IMAGE;
    const nama = row["NAMA"] || "-";
    const jabatan = row["JABATAN"] || "-";
    const jabLower = jabatan.toLowerCase();

    let badgeClass = "bg-slate-800/90 text-slate-200 border border-slate-700/80";
    let badgeIcon = '<i class="fa-solid fa-user-tag text-[9px] mr-1"></i>';
    let rolePillClass = "role-pill-default";

    if (jabLower.includes("ketua umum") || jabLower === "ketua") {
      badgeClass = "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black border border-amber-300 shadow-sm shadow-amber-500/20";
      badgeIcon = '<i class="fa-solid fa-crown text-[9px] mr-1"></i>';
      rolePillClass = "role-pill-ketua";
    } else if (jabLower.includes("wakil") || jabLower.includes("sekretaris") || jabLower.includes("bendahara")) {
      badgeClass = "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border border-blue-400/40 shadow-sm shadow-blue-500/20";
      badgeIcon = '<i class="fa-solid fa-shield-halved text-[9px] mr-1"></i>';
      rolePillClass = "role-pill-bph";
    } else if (jabLower.includes("divisi") || jabLower.includes("bidang") || jabLower.includes("koordinator") || jabLower.includes("kadiv")) {
      badgeClass = "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border border-emerald-400/40 shadow-sm shadow-emerald-500/20";
      badgeIcon = '<i class="fa-solid fa-star text-[9px] mr-1"></i>';
      rolePillClass = "role-pill-divisi";
    }

    return `
      <article class="card struktur-card group flex flex-col rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1">
        <div class="relative aspect-[4/5] sm:aspect-square overflow-hidden bg-slate-900 cursor-pointer js-lightbox" data-full="${foto}" data-caption="${escapeHtml(nama)} - ${escapeHtml(jabatan)}">
          <img src="${foto}" class="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105" 
            alt="${escapeHtml(nama)}" loading="lazy" onerror="this.onerror=null; this.src=DEFAULT_NO_IMAGE;">
          <div class="absolute top-2.5 right-2.5 z-10 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide shadow-md ${badgeClass}">
            ${badgeIcon}${escapeHtml(jabatan)}
          </div>
          <div class="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none"></div>
          <div class="absolute bottom-2.5 right-2.5 w-7 h-7 rounded-full bg-black/60 backdrop-blur-xs text-white/90 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">
            <i class="fa-solid fa-magnifying-glass-plus"></i>
          </div>
        </div>
        <div class="p-3.5 sm:p-4 flex-1 flex flex-col justify-between text-center">
          <div>
            <h3 class="struktur-name font-black text-sm sm:text-base mb-1.5 line-clamp-2 uppercase tracking-tight leading-snug">
              ${escapeHtml(nama)}
            </h3>
            <div class="struktur-role inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${rolePillClass}">
              ${escapeHtml(jabatan)}
            </div>
          </div>
          <div class="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/80">
            <button type="button" 
              class="js-lightbox btn-detail-pengurus w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              data-full="${foto}" 
              data-caption="${escapeHtml(nama)} - ${escapeHtml(jabatan)}">
              <i class="fa-solid fa-circle-user text-xs"></i> <span>Lihat Profil Foto</span>
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

async function ensurePengurusLoaded(forceRefresh = false) {
  const iconStruktur = document.getElementById("iconRefreshStruktur");
  const iconPengurus = document.getElementById("iconRefreshPengurus");
  if (iconStruktur) iconStruktur.classList.add("fa-spin");
  if (iconPengurus) iconPengurus.classList.add("fa-spin");

  if (pengurusLoaded && pengurusData.length > 0 && !forceRefresh) {
    populatePeriodeFilter();
    renderPengurus();
    renderStruktur();
    updateKtaKetumDisplay();
    if (iconStruktur) iconStruktur.classList.remove("fa-spin");
    if (iconPengurus) iconPengurus.classList.remove("fa-spin");
    return;
  }

  const cacheKey = "tq_cache_pengurus";
  if (!forceRefresh) {
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData && pengurusData.length === 0) {
      try {
        pengurusData = JSON.parse(cachedData);
        populatePeriodeFilter();
        renderPengurus();
        renderStruktur();
        updateKtaKetumDisplay();
      } catch(e) {}
    }
  }

  if (pengurusLoading) {
    if (iconStruktur) iconStruktur.classList.remove("fa-spin");
    if (iconPengurus) iconPengurus.classList.remove("fa-spin");
    return;
  }
  pengurusLoading = true;
  try {
    let newData = null;
    if (window.SupabaseDB && window.SupabaseDB.isConfigured()) {
      try {
        const res = await window.SupabaseDB.getPengurus();
        if (Array.isArray(res) && res.length > 0) {
          newData = res;
        } else if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
          newData = res.data;
        }
      } catch (errSb) {
        console.warn("[Pengurus] Supabase fetch error, fallback ke TSV:", errSb);
      }
    }

    if (!newData || !newData.length) {
      newData = await loadTSV(URL_PENGURUS);
    }
    if (newData && newData.length > 0) {
      pengurusData = newData;
      try {
        localStorage.setItem(cacheKey, JSON.stringify(newData));
      } catch(e) {}
      pengurusLoaded = true;
      populatePeriodeFilter();
      renderPengurus();
      renderStruktur();
      updateKtaKetumDisplay();
      if (forceRefresh && typeof showToast === "function") {
        showToast(`Data pengurus berhasil disinkronkan! (${pengurusData.length} data)`, "success");
      }
    }
  } catch (e) {
    console.error("Gagal memuat pengurus:", e);
    if (forceRefresh && typeof showToast === "function") {
      showToast("Gagal memperbarui data pengurus: " + (e.message || "Koneksi lambat"), "error");
    }
  } finally {
    pengurusLoading = false;
    if (iconStruktur) iconStruktur.classList.remove("fa-spin");
    if (iconPengurus) iconPengurus.classList.remove("fa-spin");
  }
}

// ============================================================================
// 11. NEWS, PRESTASI, KETUA, & IN MEMORIAM
// ============================================================================
let currentNewsYear = "all";

function getNewsYear(row) {
  if (!row) return "";
  const clean = {};
  Object.keys(row || {}).forEach(k => clean[k.trim().toUpperCase()] = String(row[k] ?? "").trim());
  const tgl = clean["TANGGAL KEGIATAN"] || clean["TANGGAL"] || clean["TGL"] || clean["WAKTU"] || "";

  // 1. Coba match tahun 4 digit dari tanggal (DD/MM/YYYY atau YYYY-MM-DD)
  const dMatch = tgl.match(/\b(19\d\d|20\d\d)\b/);
  if (dMatch) return dMatch[1];

  // 2. Coba parseDateToTimestamp
  const ts = parseDateToTimestamp(tgl);
  if (ts > 0) {
    return String(new Date(ts).getFullYear());
  }

  // 3. Fallback: match tahun dari nama kegiatan
  const nama = clean["NAMA KEGIATAN"] || clean["JUDUL"] || clean["NAMA"] || "";
  const nMatch = nama.match(/\b(19\d\d|20\d\d)\b/);
  if (nMatch) return nMatch[1];

  return "";
}

function toggleNewsYearDropdown() {
  const menu = document.getElementById("customNewsYearMenu");
  const arrow = document.getElementById("iconNewsYearArrow");
  if (!menu) return;

  const isHidden = menu.classList.contains("hidden");
  if (isHidden) {
    menu.classList.remove("hidden");
    if (arrow) arrow.classList.add("rotate-180");
    const searchInput = document.getElementById("searchNewsYearFilter");
    if (searchInput) {
      searchInput.value = "";
      filterNewsYearListItems("");
    }
  } else {
    closeNewsYearDropdown();
  }
}

function closeNewsYearDropdown() {
  const menu = document.getElementById("customNewsYearMenu");
  const arrow = document.getElementById("iconNewsYearArrow");
  if (menu) menu.classList.add("hidden");
  if (arrow) arrow.classList.remove("rotate-180");
}

function filterNewsYearListItems(query) {
  const q = (query || "").toLowerCase().trim();
  const items = document.querySelectorAll("#customNewsYearList .custom-news-year-btn");
  items.forEach(it => {
    const text = (it.dataset.year || it.textContent).toLowerCase();
    it.style.display = (!q || text.includes(q)) ? "flex" : "none";
  });
}

function selectCustomNewsYear(year, displayLabel) {
  currentNewsYear = String(year || "all").trim();
  const labelEl = document.getElementById("selectedNewsYearLabel");
  if (labelEl) {
    labelEl.textContent = displayLabel || (currentNewsYear === "all" ? "Semua Tahun" : `Tahun ${currentNewsYear}`);
  }

  const items = document.querySelectorAll("#customNewsYearList .custom-news-year-btn");
  items.forEach(it => {
    const itYear = (it.dataset.year || "");
    const match = (currentNewsYear === "all" && (itYear === "all" || !itYear)) || (itYear === currentNewsYear);
    if (match) {
      it.className = "custom-news-year-btn active w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors bg-amber-600/20 text-amber-300 font-bold border border-amber-500/30";
    } else {
      it.className = "custom-news-year-btn w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors text-slate-300 hover:bg-slate-800 hover:text-white";
    }
  });

  closeNewsYearDropdown();
  renderNews();
}

function populateNewsYearFilter() {
  const customList = document.getElementById("customNewsYearList");
  if (!customList) return;

  const yearCounts = {};
  newsData.forEach(row => {
    const y = getNewsYear(row);
    if (y) {
      yearCounts[y] = (yearCounts[y] || 0) + 1;
    }
  });

  const sortedYears = Object.keys(yearCounts).sort((a, b) => parseInt(b, 10) - parseInt(a, 10));

  let html = `
    <button type="button" data-year="all" onclick="selectCustomNewsYear('all', 'Semua Tahun')" class="custom-news-year-btn ${currentNewsYear === 'all' ? 'active' : ''} w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${currentNewsYear === 'all' ? 'bg-amber-600/20 text-amber-300 font-bold border border-amber-500/30' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}">
      <span class="flex items-center gap-2">
        <i class="fas fa-calendar-check text-amber-400"></i>
        <span>Semua Tahun</span>
      </span>
      <span class="news-year-count-badge text-[11px] font-bold px-2 py-0.5 rounded-full font-mono">${newsData.length}</span>
    </button>
  `;

  sortedYears.forEach(y => {
    const isAct = currentNewsYear === y;
    html += `
      <button type="button" data-year="${y}" onclick="selectCustomNewsYear('${y}', 'Tahun ${y}')" class="custom-news-year-btn ${isAct ? 'active' : ''} w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${isAct ? 'bg-amber-600/20 text-amber-300 font-bold border border-amber-500/30' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}">
        <span class="flex items-center gap-2">
          <i class="far fa-calendar-alt text-slate-400"></i>
          <span>Tahun ${y}</span>
        </span>
        <span class="news-year-count-badge text-[11px] font-bold px-2 py-0.5 rounded-full font-mono">${yearCounts[y]}</span>
      </button>
    `;
  });

  customList.innerHTML = html;
}

window.toggleNewsYearDropdown = toggleNewsYearDropdown;
window.closeNewsYearDropdown = closeNewsYearDropdown;
window.filterNewsYearListItems = filterNewsYearListItems;
window.selectCustomNewsYear = selectCustomNewsYear;
window.populateNewsYearFilter = populateNewsYearFilter;

function renderNews() {
  const container = document.getElementById("newsGrid");
  if (!container) return;

  const keyword = (document.getElementById("searchNews")?.value || "").toLowerCase();
  let data = [...newsData];

  data.sort((a, b) => {
    const timeA = parseDateToTimestamp(a["TANGGAL KEGIATAN"]);
    const timeB = parseDateToTimestamp(b["TANGGAL KEGIATAN"]);
    return timeB - timeA;
  });

  const filtered = data.filter(row => {
    if (currentNewsYear !== "all") {
      const y = getNewsYear(row);
      if (y !== currentNewsYear) return false;
    }
    const judul = (row["NAMA KEGIATAN"] || "").toLowerCase();
    const isi   = (row["DESKRIPSI"] || "").toLowerCase();
    return !keyword || judul.includes(keyword) || isi.includes(keyword);
  });
  updateSectionCounter("news", filtered.length);

  if (!filtered.length) {
    container.innerHTML = `<div class="col-span-full py-10 text-center text-slate-500 text-xs">Tidak ada warta / berita yang sesuai dengan filter atau pencarian.</div>`;
    return;
  }

  currentFilteredPortalNews = filtered;

  container.innerHTML = filtered.map((row, idx) => {
    const judul     = row["NAMA KEGIATAN"] || "-";
    const tanggal   = row["TANGGAL KEGIATAN"] || "";
    const tempat    = row["TEMPAT KEGIATAN"] || "";
    const deskripsi = (row["DESKRIPSI"] || "-").trim();
    const foto      = convertDriveImage(row["FOTO KEGIATAN"] || "");

    // Ringkas teks preview kartu maksimal ~120 karakter agar kartu selalu rapi dan kompak
    const previewDesc = deskripsi.length > 120 ? deskripsi.slice(0, 117).trim() + "..." : deskripsi;

    return `
      <article class="card news-card cursor-pointer hover:border-amber-500/60 transition-all duration-300" onclick="openNewsArticleByIdx(${idx})">
        ${foto ? `
          <div class="news-image-wrap">
            <img loading="lazy" src="${foto}" alt="${escapeHtml(judul)}" class="news-image" onerror="this.onerror=null; this.src=DEFAULT_NO_IMAGE;" />
            ${tanggal ? `<div class="news-date-badge">${escapeHtml(tanggal)}</div>` : ""}
          </div>
        ` : ""}
        <div class="news-body">
          <div class="news-title">${escapeHtml(judul)}</div>
          ${tempat ? `<div class="news-place"><span>📍 ${escapeHtml(tempat)}</span></div>` : ""}
          <div class="news-desc line-clamp-2" style="display:-webkit-box;-webkit-line-clamp:2;line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;text-overflow:ellipsis;max-height:2.8em;line-height:1.4;">${escapeHtml(previewDesc)}</div>
          <div class="pt-2 mt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-amber-400 font-bold">
            <span class="flex items-center gap-1"><i class="fa-solid fa-book-open-reader text-[10px]"></i> Baca Warta Lengkap</span>
            <i class="fa-solid fa-chevron-right text-[10px]"></i>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

// ============================================================================
// SMART NARRATIVE GENERATOR & PEMBACA ARTIKEL WARTA RESMI (PORTAL TEATER Q)
// ============================================================================
let currentFilteredPortalNews = [];
let currentActiveArticle = null;

function detectNewsCategory(item) {
  const kat = (item["KATEGORI"] || item.kategori || "").toLowerCase();
  const judul = (item["NAMA KEGIATAN"] || item.judul || item.title || item.nama || "").toLowerCase();
  if (kat.includes("pentas") || judul.includes("pentas") || judul.includes("lakon") || judul.includes("penper")) return "pentas";
  if (kat.includes("agenda") || kat.includes("oprec") || judul.includes("latam") || judul.includes("rekrutmen") || judul.includes("oprec")) return "agenda";
  return "warta";
}

function generateSmartNewsArticle(title, date, tempat, category, rawDesc = "") {
  const cleanTitle = (title || "Agenda Teater Q").trim();
  const cleanDate = (date || "terjadwal").trim();
  const cleanTempat = (tempat || "Kampus UIN Sunan Ampel Surabaya").trim();
  const lowerTitle = cleanTitle.toLowerCase();
  const lowerDesc = (rawDesc || "").toLowerCase().trim();

  const isDescRedundant = !rawDesc || lowerDesc === lowerTitle || lowerDesc.length < 15;

  let lead = "";
  let p1 = "";
  let p2 = "";
  let p3 = "";
  let closing = "";

  const isTemuAnggota = /temu|kumpul|silaturahmi|sarasehan|mubes|musker|rapat|evaluasi/.test(lowerTitle);
  const isLatam = /latam|latihan alam|diklat|keaktoran|bina|alam/.test(lowerTitle);
  const isPentas = /pentas|penper|perdana|keliling|lakon|produksi|festival|art|monoplay|teater asa|reptil|laron|padang bulan/.test(lowerTitle) || category === "pentas";
  const isOprec = /oprec|rekrutmen|open recruitment|pendaftaran|anggota baru/.test(lowerTitle) || category === "agenda";
  const isTahlil = /tahlil|istighosah|doa|syukuran|haul/.test(lowerTitle);

  lead = `<strong>${escapeHtml(cleanTempat.toUpperCase())}</strong> — UKM Paguyuban Teater "Q" Fakultas Syariah dan Hukum UIN Sunan Ampel Surabaya secara resmi menyelenggarakan agenda bertajuk <strong>"${escapeHtml(cleanTitle)}"</strong> yang dihelat pada <strong>${escapeHtml(cleanDate)}</strong> bertempat di <strong>${escapeHtml(cleanTempat)}</strong>. Agenda ini menjadi wujud nyata komitmen berkelanjutan organisasi dalam merawat iklim seni kebudayaan, mempererat ikatan kekeluargaan, serta mempersembahkan ruang ekspresi teatrikal yang bermakna bagi sivitas akademika maupun khalayak umum.`;

  if (isTemuAnggota) {
    p1 = `Agenda temu anggota ini dihadiri secara antusias oleh jajaran pengurus aktif, anggota muda lintas angkatan, serta para senior dan alumni yang hadir memberikan arahan dan dukungan moral. Suasana penuh kehangatan dan kekeluargaan mewarnai setiap sesi pertemuan, di mana para peserta saling bertukar gagasan, merefleksikan dinamika kepengurusan yang telah berjalan, serta menyelaraskan visi artistik demi kelangsungan organisasi ke depan.`;
    p2 = `Salah satu fokus utama dalam pertemuan ini adalah memperkokoh ikatan batin dan internalisasi karakter berteater. Melalui dialog interaktif dan forum rembuk santai berbobot, seluruh kader diajak untuk senantiasa mengamalkan semboyan luhur Teater Q: <em>"Satu Jiwa Jangan Terbelah, Satu Langkah Jangan Terpisah, Satu Hati Tak Boleh Mencaci, Satu Rasa Cintai Sesama"</em> sebagai pedoman moral dalam berproses dan berkarya.`;
    p3 = `Selain sebagai sarana konsolidasi internal, momentum ini juga dimanfaatkan untuk merancang peta jalan pementasan karya teater terdekat. Setiap bidang mulai dari keaktoran, tata artistik panggung, hingga manajemen produksi dan publikasi media melakukan penyelarasan teknis guna memastikan persiapan acara berjalan optimal.`;
  } else if (isLatam) {
    p1 = `Latihan Alam (LATAM) merupakan tonggak tradisi pembinaan penting di tubuh Paguyuban Teater Q. Bertempat di alam terbuka yang sarat tantangan dan kesejukan, para peserta menjalani serangkaian olah tubuh, penempaan fisik, eksplorasi vokal, meditasi keheningan, serta olah rasa guna membangun kepekaan indrawi sebagai modal fundamental seorang aktor panggung.`;
    p2 = `Melalui interaksi langsung dengan alam bebas—terpaan angin pegunungan, gemericik air, dan kontur tanah alami—para kader ditempa untuk memiliki daya konsentrasi tinggi, kedisiplinan diri, ketangguhan mental, dan kepekaan rasa terhadap ruang sekitar. Pembekalan intensif ini tidak hanya mencetak aktor yang mumpuni di atas pentas, tetapi juga menumbuhkan karakter rendah hati dan kesadaran ekologis yang luhur.`;
    p3 = `Kekompakan dan solidaritas antarpeserta pun terjalin semakin rekat sepanjang kegiatan berlangsung. Berbagi tugas, mendirikan tenda perkemahan, hingga sesi refleksi malam di bawah taburan bintang menjadi momen pembentukan watak yang mendalam, membuktikan bahwa panggung teater adalah laboratorium kehidupan untuk memanusiakan manusia.`;
  } else if (isPentas) {
    p1 = `Karya pementasan ini menyuguhkan dramaturgi yang bernas serta eksplorasi artistik yang memukau penonton yang memadati panggung pertunjukan. Melalui penjiwaan karakter yang intens dari para aktor, tata cahaya panggung yang dramatis, serta ilustrasi musik teatrikal yang presisi, pementasan berhasil menghidupkan pesan moral, konflik batin manusia, dan kritik sosial budaya secara menyentuh kalbu.`;
    p2 = `Proses panjang latihan fisik, olah vokal, bedah naskah lakon, hingga penataan artistik set panggung dan tata rias busana terbayar tuntas lewat gemuruh tepuk tangan dan apresiasi hangat dari seluruh penonton. Para pegiat teater, akademisi kampus, dan masyarakat seni yang hadir memberikan pujian atas keberanian konsep garapan serta ketajaman pesan yang disuarakan.`;
    p3 = `Pementasan ini membuktikan bahwa karya teater mahasiswa bukan sekadar tontonan visual semata, melainkan mimbar edukasi kultural, ruang perenungan nurani, dan bukti nyata dedikasi generasi muda dalam merawat warisan seni pertunjukan nusantara.`;
  } else if (isOprec) {
    p1 = `Sebagai gerbang awal estafet regenerasi, agenda penerimaan anggota baru ini membuka ruang seluas-luasnya bagi mahasiswa baru dan sivitas kampus yang memiliki minat di dunia seni peran, penulisan naskah drama, tata panggung, sinografi, manajemen artistik, tata rias, dan musikalisasi teater untuk bergabung dalam wadah kekeluargaan Teater Q.`;
    p2 = `Dalam prosesnya, para calon anggota tidak hanya diperkenalkan pada teknik-teknik dasar pementasan, tetapi juga diajak memahami etika berproses, kepemimpinan organisasi, komitmen berkesenian, serta rasa memiliki terhadap almamater. Antusiasme tinggi para pendaftar mencerminkan besarnya kerinduan generasi muda akan ruang berekspresi yang merdeka, kreatif, dan beradab.`;
    p3 = `Dengan bergabungnya energi dan talenta baru ini, Paguyuban Teater Q optimis akan terus melahirkan karya-karya monumental yang segar, kritis, dan siap menorehkan prestasi membanggakan di kancah teater regional maupun nasional.`;
  } else if (isTahlil) {
    p1 = `Agenda doa bersama, tahlil, dan istighosah ini diselenggarakan secara khusyuk dan penuh takzim sebagai wujud rasa syukur sekaligus mendoakan para sesepuh, pendiri, alumni, dan keluarga besar Teater Q yang telah berpulang, serta memohon kelancaran bagi seluruh rangkaian agenda pementasan yang tengah dipersiapkan.`;
    p2 = `Di tengah padatnya dinamika latihan dan kekaryaan panggung, kegiatan spiritual ini menjadi pengingat berharga bahwa nilai-nilai ketuhanan, adab kesopanan, dan kerendahan hati senantiasa menjadi pijakan utama dalam setiap helaan nafas perjalanan berkesenian para anggota paguyuban.`;
    p3 = `Melalui lantunan doa yang terpanjat secara berjamaah, teriring harapan tulus agar seluruh keluarga besar Teater Q senantiasa dilimpahi kesehatan, keistiqomahan, dan keberkahan dalam melahirkan karya seni yang menebarkan kemaslahatan bagi masyarakat luas.`;
  } else {
    p1 = `Agenda ini dirancang secara terpadu oleh panitia pelaksana sebagai sarana aktualisasi bakat, kreativitas, dan kepedulian sosial budaya seluruh anggota. Berbagai diskursus konstruktif dan pertukaran gagasan positif terjalin sepanjang kegiatan, mencerminkan etos belajar kolektif yang menjadi ciri khas UKM Paguyuban Teater Q.`;
    p2 = `Dukungan penuh dari keluarga besar paguyuban, para alumni, serta jejaring komunitas seni turut memperkokoh kesuksesan perhelatan ini. Sinergi yang terbangun membuktikan bahwa Teater Q terus hadir sebagai simpul kebudayaan kampus yang aktif, adaptif, dan konsisten menghasilkan karya-karya berdaya saing tinggi.`;
    p3 = `Capaian positif dari agenda ini diharapkan dapat menjadi pelecut semangat baru bagi seluruh divisi untuk terus mempersembahkan karya seni pertunjukan yang sarat makna dan bernilai estetika tinggi bagi publik.`;
  }

  // Smart Paragraph Splitter: memecah teks berdasarkan Enter, tag [p], atau otomatis per 2-3 kalimat
  const customParagraphs = splitIntoParagraphs(rawDesc);
  const isCustomArticleLong = !isDescRedundant && (rawDesc.length > 180 || customParagraphs.length >= 2);

  if (isCustomArticleLong) {
    const customBody = customParagraphs.map(p => `
      <p class="leading-relaxed text-justify sm:text-left" style="margin-bottom: 1.35rem !important; line-height: 1.85 !important; display: block !important;">
        ${escapeHtml(p)}
      </p>
    `).join("");

    return [
      `<p class="leading-relaxed text-justify sm:text-left" style="margin-bottom: 1.35rem !important; line-height: 1.85 !important; display: block !important;">${lead}</p>`,
      customBody,
      `<p class="leading-relaxed text-justify sm:text-left" style="margin-bottom: 1.35rem !important; line-height: 1.85 !important; display: block !important;">${p2}</p>`,
      `<p class="leading-relaxed text-slate-300 border-t border-slate-800/80 pt-4 text-xs italic text-justify sm:text-left" style="margin-bottom: 1.35rem !important; line-height: 1.85 !important; display: block !important;">${closing}</p>`
    ].filter(Boolean).join("");
  }

  let customDescBlock = "";
  if (!isDescRedundant) {
    customDescBlock = customParagraphs.map(p => `
      <p class="leading-relaxed text-justify sm:text-left" style="margin-bottom: 1.35rem !important; line-height: 1.85 !important; display: block !important;">
        ${escapeHtml(p)}
      </p>
    `).join("");
  }

  closing = `Keluarga besar UKM Paguyuban Teater "Q" Fakultas Syariah dan Hukum UIN Sunan Ampel Surabaya menyampaikan terima kasih dan apresiasi setinggi-tingginya kepada seluruh pihak, pengurus, alumni, panitia pelaksana, dan penikmat seni yang telah mendukung kelancaran agenda ini. Sampai jumpa di panggung pementasan dan kabar warta kesenian selanjutnya.`;

  return [
    `<p class="leading-relaxed text-justify sm:text-left" style="margin-bottom: 1.35rem !important; line-height: 1.85 !important; display: block !important;">${lead}</p>`,
    `<p class="leading-relaxed text-justify sm:text-left" style="margin-bottom: 1.35rem !important; line-height: 1.85 !important; display: block !important;">${p1}</p>`,
    customDescBlock,
    `<p class="leading-relaxed text-justify sm:text-left" style="margin-bottom: 1.35rem !important; line-height: 1.85 !important; display: block !important;">${p2}</p>`,
    `<p class="leading-relaxed text-justify sm:text-left" style="margin-bottom: 1.35rem !important; line-height: 1.85 !important; display: block !important;">${p3}</p>`,
    `<p class="leading-relaxed text-slate-300 border-t border-slate-800/80 pt-4 text-xs italic text-justify sm:text-left" style="margin-bottom: 1.35rem !important; line-height: 1.85 !important; display: block !important;">${closing}</p>`
  ].filter(Boolean).join("");
}

// ============================================================================
// PEMBAGI PARAGRAF PINTAR (SMART PARAGRAPH SPLITTER)
// ============================================================================
function splitIntoParagraphs(text) {
  if (!text) return [];
  const clean = text.toString().trim();
  if (!clean) return [];

  // 1. Cek pemisah enter resmi (Alt+Enter dari Google Sheets)
  let blocks = clean.split(/\r?\n+/).map(b => b.trim()).filter(Boolean);
  if (blocks.length > 1) {
    return blocks;
  }

  // 2. Cek pemisah tag seperti <br>, [p], //, atau \\n
  const alt = clean.split(/<br\s*\/?>|\[p\]|\[br\]|\/{2,}|\/p\//i).map(b => b.trim()).filter(Boolean);
  if (alt.length > 1) {
    return alt;
  }

  // 3. Jika pengguna tidak menekan enter dan teksnya sangat panjang (> 260 karakter):
  // Lindungi gelar/singkatan (KH., H., Kab., Cak., Drs., dll.) agar tidak salah terbelah
  if (clean.length > 260) {
    const protectedText = clean
      .replace(/\b(KH|H|Hj|K|Cak|Ning|Gus|Dr|Dra|Drs|Prof|Ir|Ust|Ustd|Ny|Tn|Kab|Kec|Kel|Prov|No|Jl|dkk|dll|dsb|dst)\./gi, '$1@@DOT@@')
      .replace(/([0-9]+)\.([0-9]+)/g, '$1@@DOT@@$2');

    // Split hanya pada titik akhir kalimat sesungguhnya (diikuti spasi dan huruf kapital)
    const rawSentences = protectedText.split(/(?<=[.!?])\s+(?=[A-Z0-9])/);
    const restoredSentences = rawSentences.map(s => s.replace(/@@DOT@@/g, '.').trim()).filter(Boolean);

    if (restoredSentences.length >= 3) {
      const chunks = [];
      let temp = "";
      let count = 0;

      restoredSentences.forEach(s => {
        temp += (temp ? " " : "") + s;
        count++;
        // Gabungkan 3 kalimat atau minimal ~220 karakter per paragraf agar proporsional
        if (count >= 3 || temp.length >= 220) {
          chunks.push(temp.trim());
          temp = "";
          count = 0;
        }
      });
      if (temp.trim()) chunks.push(temp.trim());
      if (chunks.length > 1) {
        return chunks;
      }
    }
  }

  return [clean];
}

// ============================================================================
// EKSTRAKSI KONTEN MANUAL (KOLOM H / KONTEN ARTIKEL) & BYPASS GENERATOR
// ============================================================================
function getCustomArticleFromRow(item) {
  if (!item || typeof item !== "object") return "";

  // 1. Cek nama header umum untuk Kolom H
  const candidateKeys = [
    "KONTEN ARTIKEL", "konten artikel", "Konten Artikel",
    "ARTIKEL", "artikel", "Artikel",
    "NARASI", "narasi", "Narasi",
    "BERITA LENGKAP", "berita lengkap", "Berita Lengkap",
    "ISI ARTIKEL", "isi artikel", "Isi Artikel",
    "KONTEN", "konten", "Konten",
    "KOLOM H", "kolom h", "Kolom H", "KOLOM_H", "kolom_h",
    "DESKRIPSI LENGKAP", "deskripsi lengkap", "Deskripsi Lengkap",
    "ISI", "isi", "Isi"
  ];

  for (const k of candidateKeys) {
    if (item[k] && typeof item[k] === "string" && item[k].trim()) {
      return item[k].trim();
    }
  }

  // 2. Deteksi dinamis berbasis kata kunci pada nama kolom selain kolom default
  const standardKeys = ["id", "nama kegiatan", "tanggal kegiatan", "tempat kegiatan", "deskripsi", "foto kegiatan", "kategori"];
  const allKeys = Object.keys(item);

  for (const k of allKeys) {
    const lk = k.toLowerCase().trim();
    if (standardKeys.includes(lk)) continue;
    if (lk.includes("artikel") || lk.includes("narasi") || lk.includes("konten") || lk.includes("berita") || lk.includes("lengkap")) {
      const val = (item[k] || "").toString().trim();
      if (val) return val;
    }
  }

  // 3. Fallback: jika sheet memiliki 8 kolom atau lebih (Kolom H adalah kolom urutan ke-8 / index 7)
  if (allKeys.length >= 8) {
    const colHKey = allKeys[7];
    const val = (item[colHKey] || "").toString().trim();
    if (val && !standardKeys.includes(colHKey.toLowerCase().trim())) {
      return val;
    }
  }

  return "";
}

function formatCustomArticleHtml(customText, tempat = "", date = "") {
  if (!customText) return "";

  const paragraphs = splitIntoParagraphs(customText);
  if (!paragraphs.length) return "";

  const adSlot = `
    <div class="my-6 p-4 rounded-2xl bg-slate-950/70 border border-amber-500/20 shadow-inner flex flex-col items-center justify-center text-center">
      <div class="text-[9px] uppercase tracking-widest text-slate-300 font-bold mb-2 flex items-center gap-1.5">
        <i class="fa-solid fa-rectangle-ad text-amber-400"></i> SPONSOR &amp; WARTA MITRA
      </div>
      <ins class="adsbygoogle"
           style="display:block; text-align:center;"
           data-ad-layout="in-article"
           data-ad-format="fluid"
           data-ad-client="ca-pub-5352949727494719"
           data-ad-slot="9012345678"></ins>
    </div>
  `;

  if (paragraphs.length <= 2) {
    return paragraphs.map(p => `
      <p class="leading-relaxed text-justify sm:text-left" style="margin-bottom: 1.35rem !important; line-height: 1.85 !important; display: block !important;">
        ${escapeHtml(p)}
      </p>
    `).join("") + adSlot;
  }

  const mid = Math.floor(paragraphs.length / 2);
  const part1 = paragraphs.slice(0, mid).map(p => `
    <p class="leading-relaxed text-justify sm:text-left" style="margin-bottom: 1.35rem !important; line-height: 1.85 !important; display: block !important;">
      ${escapeHtml(p)}
    </p>
  `).join("");

  const part2 = paragraphs.slice(mid).map(p => `
    <p class="leading-relaxed text-justify sm:text-left" style="margin-bottom: 1.35rem !important; line-height: 1.85 !important; display: block !important;">
      ${escapeHtml(p)}
    </p>
  `).join("");

  return part1 + adSlot + part2;
}

function openNewsArticleByIdx(idx) {
  const list = (currentFilteredPortalNews && currentFilteredPortalNews.length > 0) ? currentFilteredPortalNews : (newsData || []);
  const item = list[idx];
  if (!item) return;

  currentActiveArticle = {
    type: "news",
    index: idx,
    data: item,
    title: item["NAMA KEGIATAN"] || item.judul || item.title || item.nama || "Agenda & Warta Teater Q",
    date: item["TANGGAL KEGIATAN"] || item.tanggal || item.date || "-",
    tempat: item["TEMPAT KEGIATAN"] || item.tempat || item.lokasi || "UIN Sunan Ampel Surabaya",
    desc: item["DESKRIPSI"] || item.deskripsi || item.isi || "",
    rawImg: (item["FOTO KEGIATAN"] || item.gambar || item.foto || item.image || "").trim(),
    category: detectNewsCategory(item)
  };

  const imgUrl = currentActiveArticle.rawImg ? convertDriveImage(currentActiveArticle.rawImg) : "assets/kampus 1.jpg";
  currentActiveArticle.imgUrl = imgUrl;

  const catLabel = currentActiveArticle.category === "pentas" ? "Pentas & Lakon" : (currentActiveArticle.category === "agenda" ? "Agenda & Oprec" : "Kabar Warta Resmi");

  const modal = document.getElementById("modalNewsArticleReader");
  if (!modal) return;

  const titleEl = document.getElementById("articleReaderTitle");
  const badgeEl = document.getElementById("articleReaderCategoryBadge");
  const readTimeEl = document.getElementById("articleReaderReadingTime");
  const dateEl = document.getElementById("articleReaderDate");
  const authorEl = document.getElementById("articleReaderAuthor");
  const placeWrap = document.getElementById("articleReaderPlaceWrap");
  const placeDot = document.getElementById("articleReaderPlaceDot");
  const placeEl = document.getElementById("articleReaderPlace");
  const imgEl = document.getElementById("articleReaderImg");
  const capEl = document.getElementById("articleReaderCaption");
  const contentEl = document.getElementById("articleReaderContent");
  const quoteEl = document.getElementById("articleReaderQuoteText");
  const waBtnEl = document.getElementById("articleReaderWaBtn");
  const relatedListEl = document.getElementById("articleReaderRelatedList");

  if (titleEl) titleEl.textContent = currentActiveArticle.title;
  if (badgeEl) badgeEl.textContent = catLabel;
  if (dateEl) dateEl.textContent = currentActiveArticle.date;
  if (authorEl) authorEl.textContent = item.penulis || item.author || "Redaksi Warta Teater Q";

  if (placeWrap) {
    if (currentActiveArticle.tempat) {
      placeWrap.classList.remove("hidden");
      if (placeDot) placeDot.classList.remove("hidden");
      if (placeEl) placeEl.textContent = currentActiveArticle.tempat;
    } else {
      placeWrap.classList.add("hidden");
      if (placeDot) placeDot.classList.add("hidden");
    }
  }

  if (imgEl) {
    imgEl.src = imgUrl;
    imgEl.alt = currentActiveArticle.title;
  }
  if (capEl) {
    capEl.innerHTML = `<i class="fa-solid fa-camera mr-1 text-amber-400"></i> Dokumentasi: ${escapeHtml(currentActiveArticle.title)}`;
  }

  // Cek apakah Kolom H terisi narasi artikel manual
  const customArticle = getCustomArticleFromRow(item);
  let finalArticleHtml = "";

  if (customArticle) {
    // JIKA KOLOM H TERISI: Bypas generator otomatis, gunakan narasi asli dari Kolom H
    finalArticleHtml = formatCustomArticleHtml(customArticle, currentActiveArticle.tempat, currentActiveArticle.date);
  } else {
    // JIKA KOLOM H KOSONG: Tetap gunakan Smart Narrative Generator otomatis
    finalArticleHtml = generateSmartNewsArticle(
      currentActiveArticle.title,
      currentActiveArticle.date,
      currentActiveArticle.tempat,
      currentActiveArticle.category,
      currentActiveArticle.desc
    );
  }

  if (contentEl) {
    contentEl.innerHTML = finalArticleHtml;
  }

  const textOnly = contentEl ? contentEl.innerText : (currentActiveArticle.title + " " + currentActiveArticle.desc);
  const wordCount = textOnly.trim().split(/\s+/).filter(Boolean).length;
  const readMins = Math.max(2, Math.ceil(wordCount / 140));
  if (readTimeEl) {
    readTimeEl.innerHTML = `<i class="fa-regular fa-clock text-[10px]"></i> ${readMins} mnt baca`;
  }

  if (quoteEl) {
    const quotes = [
      `"Dari Teater Q, Oleh Teater Q, Untuk Kebudayaan dan Kemanusiaan."`,
      `"Panggung adalah cermin kehidupan; tempat kejujuran rasa dan pikiran dipentaskan secara merdeka."`,
      `"Seni teater bukan hanya tentang berakting, melainkan proses belajar memanusiakan manusia."`,
      `"Setiap babak menghadirkan cerita, setiap dialog meneguhkan dedikasi dan cinta seni."`
    ];
    quoteEl.textContent = quotes[idx % quotes.length];
  }

  if (waBtnEl) {
    const waPhone = "6285748805626";
    const waMsg = encodeURIComponent(`Halo Tim Media / Panitia Teater Q, saya membaca warta "${currentActiveArticle.title}" di portal web resmi dan ingin bertanya info lebih lanjut.`);
    waBtnEl.href = `https://wa.me/${waPhone}?text=${waMsg}`;
  }

  if (relatedListEl) {
    const allNews = (newsData && newsData.length > 0) ? newsData : list;
    const others = allNews.filter((_, i) => i !== idx).slice(0, 4);
    
    if (others.length === 0) {
      relatedListEl.innerHTML = `<div class="col-span-full text-xs text-slate-500 italic">Belum ada warta lainnya.</div>`;
    } else {
      relatedListEl.innerHTML = others.map(itemOther => {
        const oIdx = allNews.indexOf(itemOther);
        const oTitle = itemOther["NAMA KEGIATAN"] || itemOther.judul || itemOther.title || itemOther.nama || "Agenda Teater Q";
        const oDate = itemOther["TANGGAL KEGIATAN"] || itemOther.tanggal || itemOther.date || "-";
        const oRawImg = (itemOther["FOTO KEGIATAN"] || itemOther.gambar || itemOther.foto || itemOther.image || "").trim();
        const oImgUrl = oRawImg ? convertDriveImage(oRawImg) : "assets/kampus 1.jpg";
        const oCat = detectNewsCategory(itemOther);
        const oCatLabel = oCat === "pentas" ? "Pentas" : (oCat === "agenda" ? "Agenda" : "Warta");

        return `
          <div class="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800/80 hover:border-amber-500/50 cursor-pointer transition group" onclick="openNewsArticleByRawItem(${oIdx})">
            <div class="w-16 h-16 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-slate-800">
              <img src="${oImgUrl}" alt="${escapeHtml(oTitle)}" class="w-full h-full object-cover group-hover:scale-105 transition" onerror="this.onerror=null; this.src='assets/kampus 1.jpg';">
            </div>
            <div class="min-w-0 flex-1">
              <span class="text-[9px] font-bold text-amber-400 uppercase tracking-wide block">${oCatLabel}</span>
              <h4 class="text-xs font-bold text-white group-hover:text-amber-300 transition line-clamp-2 leading-tight">${escapeHtml(oTitle)}</h4>
              <span class="text-[10px] text-slate-400 mt-1 block flex items-center gap-1">
                <i class="fa-regular fa-calendar text-[9px] text-slate-500"></i> ${escapeHtml(oDate)}
              </span>
            </div>
          </div>
        `;
      }).join("");
    }
  }

  try {
    if (typeof adsbygoogle !== "undefined") {
      (adsbygoogle = window.adsbygoogle || []).push({});
    }
  } catch (e) {}

  const scrollBody = document.getElementById("newsArticleScrollBody");
  if (scrollBody) scrollBody.scrollTop = 0;

  modal.classList.remove("hidden");
  modal.classList.add("flex");
  document.body.classList.add("overflow-hidden");
}

function openNewsArticleByRawItem(rawIdx) {
  if (!newsData || !newsData[rawIdx]) return;
  currentFilteredPortalNews = newsData;
  openNewsArticleByIdx(rawIdx);
}

function closeNewsArticleReader() {
  const modal = document.getElementById("modalNewsArticleReader");
  if (!modal) return;
  if (document.activeElement && modal.contains(document.activeElement)) {
    document.activeElement.blur();
  }
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  document.body.classList.remove("overflow-hidden");
}

function shareArticleToWA() {
  if (!currentActiveArticle) return;
  const currentUrl = window.location.href.split("#")[0];
  const shareText = `*${currentActiveArticle.title}*\n\nBaca artikel & warta resmi pementasan selengkapnya di portal Paguyuban Teater Q:\n${currentUrl}`;
  const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
  window.open(waUrl, "_blank");
}

function copyArticleLink() {
  const url = window.location.href.split("#")[0];
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      showToast("Tautan artikel warta berhasil disalin!", "success");
    }).catch(() => {
      fallbackCopyText(url, "Tautan artikel");
    });
  } else {
    fallbackCopyText(url, "Tautan artikel");
  }
}

function zoomCurrentArticleImage() {
  if (!currentActiveArticle) return;
  const imgUrl = currentActiveArticle.imgUrl || "assets/kampus 1.jpg";
  const title = currentActiveArticle.title || "Dokumentasi Teater Q";
  if (typeof openLightbox === "function") {
    openLightbox(imgUrl, title);
  }
}

async function ensureNewsLoaded(forceReload = false) {
  const iconRefresh = document.getElementById("iconRefreshNews");
  if (iconRefresh) iconRefresh.classList.add("fa-spin");

  if (!forceReload && newsLoaded && newsData.length > 0) {
    populateNewsYearFilter();
    renderNews();
    updateNewsCountdown();
    if (iconRefresh) iconRefresh.classList.remove("fa-spin");
    return;
  }

  const cacheKey = "tq_cache_news";
  // Self-healing: bersihkan cache usang yang tidak memiliki field NAMA KEGIATAN
  try {
    const rawCache = localStorage.getItem(cacheKey);
    if (rawCache) {
      const parsed = JSON.parse(rawCache);
      if (Array.isArray(parsed) && parsed.length > 0 && !parsed[0]["NAMA KEGIATAN"]) {
        localStorage.removeItem(cacheKey);
        newsData = [];
      }
    }
  } catch(e) {}

  if (!forceReload) {
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData && newsData.length === 0) {
      try {
        const parsed = JSON.parse(cachedData);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]["NAMA KEGIATAN"]) {
          newsData = parsed;
          populateNewsYearFilter();
          renderNews();
          updateNewsCountdown();
        }
      } catch(e) {}
    }
  }
  if (newsLoading) return;
  newsLoading = true;
  try {
    let newData = null;
    if (window.SupabaseDB && window.SupabaseDB.isConfigured()) {
      try {
        const res = await window.SupabaseDB.getBerita();
        if (Array.isArray(res) && res.length > 0) {
          newData = res;
        } else if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
          newData = res.data;
        }
      } catch (errSb) {
        console.warn("[News] Supabase fetch error, fallback ke TSV:", errSb);
      }
    }

    if (!newData || !newData.length) {
      newData = await loadTSV(URL_NEWS);
    }
    newsData = newData;
    localStorage.setItem(cacheKey, JSON.stringify(newData));
    newsLoaded = true;
    populateNewsYearFilter();
    renderNews();
    updateNewsCountdown();
  } catch (e) {
    console.error("Gagal memuat news:", e);
  } finally {
    newsLoading = false;
    const iconRefresh = document.getElementById("iconRefreshNews");
    if (iconRefresh) iconRefresh.classList.remove("fa-spin");
  }
}

function renderPrestasi() {
  const container = document.getElementById("prestasiList");
  if (!container) return;
  if (!prestasiData.length) {
    container.innerHTML = "<div>Belum ada data prestasi yang tercatat.</div>";
    return;
  }
  container.innerHTML = prestasiData.map((row, idx) => {
    const desc = row["Deskripsi Prestasi"] || row["DESKRIPSI PRESTASI"] || "-";
    return `
      <div class="prestasi-card">
        <span class="prestasi-number">${idx + 1}</span>
        <p class="prestasi-text">${escapeHtml(desc)}</p>
      </div>
    `;
  }).join("");
}

async function ensurePrestasiLoaded() {
  if (prestasiLoaded && prestasiData.length > 0) {
    renderPrestasi();
    return;
  }

  const cacheKey = "tq_cache_prestasi";
  const cachedData = localStorage.getItem(cacheKey);
  if (cachedData && prestasiData.length === 0) {
    try {
      prestasiData = JSON.parse(cachedData);
      renderPrestasi();
    } catch(e) {}
  }
  if (prestasiLoading) return;
  prestasiLoading = true;
  try {
    let newData = null;
    if (window.SupabaseDB && window.SupabaseDB.isConfigured()) {
      try {
        const res = await window.SupabaseDB.getPrestasi();
        if (Array.isArray(res) && res.length > 0) {
          newData = res;
        } else if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
          newData = res.data;
        }
      } catch (errSb) {
        console.warn("[Prestasi] Supabase fetch error, fallback ke TSV:", errSb);
      }
    }

    if (!newData || !newData.length) {
      newData = await loadTSV(URL_PRESTASI);
    }
    prestasiData = newData;
    localStorage.setItem(cacheKey, JSON.stringify(newData));
    prestasiLoaded = true;
    renderPrestasi();
  } catch (e) {
    console.error("Gagal memuat prestasi:", e);
  } finally {
    prestasiLoading = false;
  }
}

function renderKetua() {
  const container = document.getElementById("ketuaTimeline");
  if (!container) return;
  if (!ketuaData.length) {
    container.innerHTML = "<div>Data ketua umum belum tersedia.</div>";
    return;
  }
  let ketuaKey = null;
  const firstRow = ketuaData[0] || {};
  Object.keys(firstRow).forEach(k => {
    const lower = k.toLowerCase();
    if (!ketuaKey && (lower.includes("ketua") || lower.includes("masa ke masa"))) {
      ketuaKey = k;
    }
  });

  const records = ketuaData.map(row => {
    const text = (ketuaKey && row[ketuaKey]) ? row[ketuaKey] : Object.values(row).filter(Boolean).join(" – ");
    const match = text.match(/(19|20)\d{2}/);
    const year = match ? parseInt(match[0], 10) : 0;
    return { text, year };
  }).filter(r => r.text);

  records.sort((a, b) => (a.year || 0) - (b.year || 0));
  container.innerHTML = records.map(r => `<div class="timeline-item">${escapeHtml(r.text)}</div>`).join("");
}

async function ensureKetuaLoaded() {
  if (ketuaLoaded && ketuaData.length > 0) {
    renderKetua();
    return;
  }

  const cacheKey = "tq_cache_ketua";
  const cachedData = localStorage.getItem(cacheKey);
  if (cachedData && ketuaData.length === 0) {
    try {
      ketuaData = JSON.parse(cachedData);
      renderKetua();
    } catch(e) {}
  }
  if (ketuaLoading) return;
  ketuaLoading = true;
  try {
    let newData = null;
    if (window.SupabaseDB && window.SupabaseDB.isConfigured()) {
      try {
        const res = await window.SupabaseDB.getKetua();
        if (Array.isArray(res) && res.length > 0) {
          newData = res;
        } else if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
          newData = res.data;
        }
      } catch (errSb) {
        console.warn("[Ketua] Supabase fetch error, fallback ke TSV:", errSb);
      }
    }

    if (!newData || !newData.length) {
      newData = await loadTSV(URL_KETUA);
    }
    ketuaData = newData;
    localStorage.setItem(cacheKey, JSON.stringify(newData));
    ketuaLoaded = true;
    renderKetua();
  } catch (e) {
    console.warn("Gagal memuat ketua umum:", e);
  } finally {
    ketuaLoading = false;
  }
}

async function ensureKeuanganLoaded() {
  const cacheKey = "tq_cache_keuangan";
  if (keuanganLoaded) return;

  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const cObj = JSON.parse(cached);
      if (document.getElementById("statPemasukan")) document.getElementById("statPemasukan").textContent = formatRupiah(cObj.totalIn);
      if (document.getElementById("statPengeluaran")) document.getElementById("statPengeluaran").textContent = formatRupiah(cObj.totalOut);
      if (document.getElementById("statSaldoKas")) document.getElementById("statSaldoKas").textContent = formatRupiah(cObj.saldo);
      keuanganLoaded = true;
    } catch(e) {}
  }

  if (keuanganLoading) return;
  keuanganLoading = true;
  try {
    let data = null;
    if (window.SupabaseDB && window.SupabaseDB.isConfigured()) {
      try {
        const res = await window.SupabaseDB.getKeuangan();
        if (Array.isArray(res) && res.length > 0) {
          data = res;
        } else if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
          data = res.data;
        }
      } catch (errSb) {
        console.warn("[Keuangan] Supabase fetch error, fallback ke TSV:", errSb);
      }
    }

    if (!data || !data.length) {
      data = await loadTSV(URL_KEUANGAN);
    }
    let totalIn = 0, totalOut = 0, saldoFromCol = null;

    (data || []).forEach(row => {
      // Pastikan baris Dana Abadi tidak bercampur ke Saldo Kas Operasional
      const rowText = JSON.stringify(row).toLowerCase();
      if (rowText.includes("dana abadi") || rowText.includes("infak abadi") || rowText.includes("pokok abadi")) {
        return;
      }

      if (row.Pemasukan !== undefined || row.pemasukan !== undefined || row.Pengeluaran !== undefined || row.pengeluaran !== undefined) {
        totalIn += Number(row.Pemasukan || row.pemasukan || 0);
        totalOut += Number(row.Pengeluaran || row.pengeluaran || 0);
      } else {
        Object.keys(row).forEach(k => {
          const lower = k.toLowerCase();
          if (lower.includes("pemasukan") || lower.includes("masuk") || lower.includes("debit")) {
            totalIn += parseNumberRupiah(row[k]);
          } else if (lower.includes("pengeluaran") || lower.includes("keluar") || lower.includes("kredit")) {
            totalOut += parseNumberRupiah(row[k]);
          } else if (lower.includes("saldo")) {
            saldoFromCol = parseNumberRupiah(row[k]);
          }
        });
      }
    });

    const saldo = saldoFromCol !== null ? saldoFromCol : (totalIn - totalOut);
    if (document.getElementById("statPemasukan")) document.getElementById("statPemasukan").textContent = formatRupiah(totalIn);
    if (document.getElementById("statPengeluaran")) document.getElementById("statPengeluaran").textContent = formatRupiah(totalOut);
    if (document.getElementById("statSaldoKas")) document.getElementById("statSaldoKas").textContent = formatRupiah(saldo);

    localStorage.setItem(cacheKey, JSON.stringify({ totalIn, totalOut, saldo }));
    keuanganLoaded = true;
  } catch (e) {
    console.error("Gagal memuat keuangan:", e);
  } finally {
    keuanganLoading = false;
  }
}

function renderMemoriam() {
  const container = document.getElementById("memoriamGrid");
  if (!container) return;
  if (!dataAlmarhum || dataAlmarhum.length === 0) {
    container.innerHTML = `<div class="col-span-full text-center text-slate-600 text-xs">Data belum tersedia.</div>`;
    return;
  }

  container.innerHTML = dataAlmarhum.map(row => {
    const fotoUrl = row.foto ? convertDriveImage(row.foto) : "https://cdn-icons-png.flaticon.com/512/149/149071.png";
    return `
      <div class="bg-slate-800 border border-slate-700 rounded-lg p-2.5 sm:p-3 flex items-start gap-2.5 sm:gap-3 hover:bg-slate-700/80 transition-colors cursor-default relative overflow-hidden group/card h-full">
        <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border border-slate-500 shrink-0 grayscale group-hover/card:grayscale-0 transition-all mt-0.5">
          <img src="${fotoUrl}" alt="${escapeHtml(row.nama)}" class="w-full h-full object-cover" loading="lazy" onerror="this.onerror=null; this.src=DEFAULT_NO_IMAGE;">
        </div>
        <div class="flex-1 min-w-0 flex flex-col justify-center">
          <h4 class="text-slate-200 font-bold text-xs mb-1 leading-tight break-words" title="${escapeHtml(row.nama)}">
            ${escapeHtml(row.nama)}
          </h4>
          <div class="flex flex-col gap-1 items-start">
            <span class="bg-slate-900/90 px-1.5 py-0.5 rounded text-[9px] text-slate-400 border border-slate-700 leading-none inline-block">
              ${escapeHtml(row.angkatan)}
            </span>
            ${row.tahun ? `<span class="text-[9px] text-red-400/90 italic font-medium leading-tight break-words">${escapeHtml(row.tahun)}</span>` : ''}
          </div>
        </div>
        <div class="absolute -top-1 -right-1 w-3 h-3 bg-slate-600 rotate-45"></div>
      </div>
    `;
  }).join("");
}

// ============================================================================
// 12. TEATER Q TV (YOUTUBE CHANNEL LIVE SYNC & CINEMA PLAYER)
// ============================================================================

const YOUTUBE_CHANNEL_ID = "UCgSkYL55yTIugdg-lESBELw"; // Saluran Resmi Paguyuban Teater Q
let currentVideoPlatform = "all";
let videoSearchKeyword = "";
let videoLimit = 12;
let currentPlayingVideo = null;

function decodeHtmlEntities(str) {
  if (!str) return "";
  const txt = document.createElement("textarea");
  txt.innerHTML = str;
  return txt.value;
}

// 1. Tarik video live otomatis langsung dari kanal resmi YouTube Teater Q (RSS Feed)
async function fetchLiveYouTubeFeed() {
  if (!YOUTUBE_CHANNEL_ID) return [];
  try {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`;
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
    const res = await fetch(apiUrl);
    if (!res.ok) return [];
    const data = await res.json();
    if (data && data.status === "ok" && Array.isArray(data.items)) {
      return data.items.map(item => {
        const isShorts = item.link && item.link.includes("/shorts/");
        return {
          judul: item.title,
          link: item.link,
          deskripsi: item.pubDate ? `Diunggah: ${item.pubDate.split(' ')[0]}` : "Karya Resmi Saluran Paguyuban Teater Q",
          kategori: isShorts ? "shorts" : "pentas",
          tanggal: item.pubDate || "",
          thumbnail: item.thumbnail || ""
        };
      });
    }
  } catch (err) {
    console.warn("Sinkronisasi otomatis YouTube feed gagal (fallback ke arsip):", err);
  }
  return [];
}

function onSearchVideoChange() {
  const input = document.getElementById("searchVideoInput") || document.getElementById("searchYoutube");
  videoSearchKeyword = input ? (input.value || "").trim().toLowerCase() : "";
  videoLimit = 12;
  toggleClearSearchVideoBtn();
  renderYoutube();
}

function toggleClearSearchVideoBtn() {
  const input = document.getElementById("searchVideoInput") || document.getElementById("searchYoutube");
  const btn = document.getElementById("btnClearSearchVideo");
  if (!btn) return;
  if (input && input.value.trim().length > 0) {
    btn.classList.remove("hidden");
  } else {
    btn.classList.add("hidden");
  }
}

function clearSearchVideo() {
  const input = document.getElementById("searchVideoInput") || document.getElementById("searchYoutube");
  if (input) {
    input.value = "";
    input.focus();
    toggleClearSearchVideoBtn();
    onSearchVideoChange();
  }
}

function filterVideoByPlatform(platform) {
  currentVideoPlatform = platform;
  videoLimit = 12;
  document.querySelectorAll(".video-pill-btn").forEach(btn => {
    if (btn.dataset.platform === platform) {
      btn.className = "video-pill-btn active px-3.5 py-1.5 rounded-xl font-bold bg-red-600 text-white shadow-md shadow-red-600/30 transition flex items-center gap-1.5 border border-red-500";
    } else {
      btn.className = "video-pill-btn px-3.5 py-1.5 rounded-xl font-semibold bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/80 transition flex items-center gap-1.5";
    }
  });
  renderYoutube();
}

function loadMoreVideos() {
  videoLimit += 12;
  renderYoutube();
}

function renderYoutube(customList) {
  const container = document.getElementById("youtubeContainer") || document.getElementById("youtubeGrid");
  if (!container) return;

  const dataPool = customList || youtubeData;
  const badge = document.getElementById("videoTotalBadge");
  const loadMoreArea = document.getElementById("videoLoadMoreArea");

  if (!dataPool || dataPool.length === 0) {
    container.innerHTML = `<div class="col-span-full py-12 text-center text-slate-400 text-xs"><i class="fa-solid fa-spinner fa-spin text-red-500 mr-1"></i> Menyinkronkan siaran video panggung...</div>`;
    if (badge) badge.textContent = "0 Video";
    if (loadMoreArea) loadMoreArea.classList.add("hidden");
    updateSectionCounter("youtube", 0);
    return;
  }

  // Filter video berdasarkan kata kunci dan platform/kategori
  const filtered = dataPool.filter(v => {
    const rawUrl = (v.link || v.url || v.Link || v.LINK || "").trim().toLowerCase();
    const title = (v.judul || v.title || v.keterangan || v.Judul || v.JUDUL || "").trim().toLowerCase();
    const desc = (v.deskripsi || v.ket || v.Deskripsi || v.DESKRIPSI || "").trim().toLowerCase();
    const isTikTok = rawUrl.includes("tiktok.com");
    const isShorts = rawUrl.includes("/shorts/") || title.includes("#shorts") || (v.kategori && v.kategori.toLowerCase() === "shorts");

    // 1. Filter Platform / Kategori
    let matchPlatform = true;
    if (currentVideoPlatform === "pentas") {
      matchPlatform = !isTikTok && !isShorts;
    } else if (currentVideoPlatform === "shorts") {
      matchPlatform = isShorts;
    } else if (currentVideoPlatform === "tiktok") {
      matchPlatform = isTikTok;
    }

    // 2. Filter Keyword
    let matchKeyword = true;
    if (videoSearchKeyword) {
      matchKeyword = title.includes(videoSearchKeyword) || desc.includes(videoSearchKeyword);
    }

    return matchPlatform && matchKeyword;
  });

  updateSectionCounter("youtube", filtered.length);

  if (badge) {
    badge.textContent = `${filtered.length} Video`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-400 bg-slate-900/60 rounded-2xl border border-dashed border-slate-800 p-8 space-y-3">
        <i class="fa-solid fa-film text-3xl text-slate-600 block"></i>
        <p class="text-xs sm:text-sm font-bold text-white">Video Tidak Ditemukan</p>
        <p class="text-[11px] text-slate-400">Tidak ada karya yang sesuai dengan pencarian atau filter yang dipilih.</p>
        <button type="button" onclick="const inp=document.getElementById('searchVideoInput')||document.getElementById('searchYoutube'); if(inp)inp.value=''; filterVideoByPlatform('all'); onSearchVideoChange();" class="mt-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition shadow">
          Reset Filter &amp; Tampilkan Semua
        </button>
      </div>
    `;
    if (loadMoreArea) loadMoreArea.classList.add("hidden");
    return;
  }

  // Paginasi dinamis
  const pagedVideos = filtered.slice(0, videoLimit);
  window.tqFilteredVideos = pagedVideos;

  if (loadMoreArea) {
    if (filtered.length > videoLimit) {
      loadMoreArea.classList.remove("hidden");
    } else {
      loadMoreArea.classList.add("hidden");
    }
  }

  container.innerHTML = pagedVideos.map((v, idx) => {
    const rawUrl = (v.link || v.url || v.Link || v.LINK || "").trim();
    const title = decodeHtmlEntities(v.judul || v.title || v.keterangan || v.Judul || v.JUDUL || "Karya Teater Q");
    const desc = decodeHtmlEntities(v.deskripsi || v.ket || v.Deskripsi || v.DESKRIPSI || "");
    const isTikTok = rawUrl.toLowerCase().includes("tiktok.com");

    if (isTikTok) {
      return `
        <div class="card-clean bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden group hover:border-rose-500/50 transition-all duration-300 flex flex-col justify-between shadow-lg cursor-pointer" onclick="playVideoByIndex(${idx})">
          <div class="aspect-video relative overflow-hidden bg-slate-950 flex flex-col items-center justify-center text-white group-hover:bg-slate-900 transition">
            <i class="fa-brands fa-tiktok text-4xl text-rose-500 group-hover:scale-110 transition duration-300"></i>
            <span class="text-[11px] font-semibold text-slate-300 mt-2">Tonton di TikTok &rarr;</span>
            <div class="absolute top-2.5 right-2.5 bg-black/80 border border-white/20 text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <i class="fa-brands fa-tiktok text-rose-400"></i> TikTok
            </div>
          </div>
          <div class="p-3.5 bg-slate-900/95 flex flex-col justify-between flex-grow border-t border-slate-800">
            <h4 class="text-xs font-bold text-white line-clamp-2 leading-snug group-hover:text-rose-400 transition-colors">${escapeHtml(title)}</h4>
            ${desc ? `<p class="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">${escapeHtml(desc)}</p>` : ''}
          </div>
        </div>
      `;
    }

    const ytId = getYoutubeID(rawUrl) || "bbEpCgy1qPA";
    const thumbUrl = v.thumbnail || `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
    const isShorts = rawUrl.toLowerCase().includes("/shorts/") || title.toLowerCase().includes("#shorts") || (v.kategori && v.kategori.toLowerCase() === "shorts");

    return `
      <div class="group bg-slate-900/95 border border-slate-800 hover:border-red-500/50 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col justify-between cursor-pointer active:scale-[0.99]" onclick="playVideoByIndex(${idx})">
        
        <!-- Thumbnail Container (16:9) -->
        <div class="aspect-video relative overflow-hidden bg-slate-950">
          <img src="${thumbUrl}" alt="${escapeHtml(title)}" loading="lazy" onerror="this.onerror=null; this.src='https://img.youtube.com/vi/${ytId}/mqdefault.jpg';" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100">
          
          <!-- Red YouTube Play Button Overlay on Hover -->
          <div class="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
            <div class="w-11 h-11 rounded-full bg-red-600/90 group-hover:bg-red-600 text-white flex items-center justify-center text-sm shadow-xl group-hover:scale-110 transition-all duration-300">
              <i class="fa-solid fa-play ml-0.5"></i>
            </div>
          </div>

          <!-- Top Badge Type -->
          <div class="absolute top-2.5 right-2.5 flex items-center gap-1.5">
            ${isShorts ? `
              <span class="px-2 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-black tracking-wider flex items-center gap-1 shadow">
                <i class="fa-solid fa-bolt text-[8px]"></i> SHORTS
              </span>
            ` : `
              <span class="px-2 py-0.5 rounded-full bg-slate-950/80 text-red-400 border border-red-500/30 text-[9px] font-bold tracking-wider flex items-center gap-1 shadow">
                <i class="fa-brands fa-youtube text-[10px]"></i> YOUTUBE
              </span>
            `}
          </div>

          <!-- Bottom Bar Date -->
          <div class="absolute bottom-2 left-2 flex items-center gap-1 text-[10px] text-white/90">
            <span class="bg-black/80 px-2 py-0.5 rounded-md font-semibold text-[10px]">${v.tanggal ? v.tanggal.split(' ')[0] : 'Karya Teater Q'}</span>
          </div>
        </div>

        <!-- Video Info & Channel Meta Ala YouTube -->
        <div class="p-3.5 sm:p-4 flex gap-3 flex-1 border-t border-slate-800/80">
          <div class="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0 mt-0.5">
            <img src="assets/logo.png" alt="Teater Q" onerror="this.onerror=null; this.src='assets/logo_transparent.png';" class="w-full h-full object-contain">
          </div>
          <div class="flex-1 min-w-0 space-y-1">
            <h4 class="text-xs sm:text-sm font-bold text-white group-hover:text-red-400 transition-colors line-clamp-2 leading-snug">${escapeHtml(title)}</h4>
            <div class="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
              <span>Paguyuban Teater Q</span>
              <i class="fa-solid fa-circle-check text-slate-500 text-[9px]"></i>
            </div>
            ${desc ? `<p class="text-[11px] text-slate-400 line-clamp-1 leading-relaxed">${escapeHtml(desc)}</p>` : ''}
          </div>
        </div>

      </div>
    `;
  }).join("");
}

function playVideoByIndex(idx) {
  const v = window.tqFilteredVideos && window.tqFilteredVideos[idx];
  if (!v) return;
  const rawUrl = (v.link || v.url || v.Link || v.LINK || "").trim();
  const ytId = getYoutubeID(rawUrl);
  if (!ytId) {
    if (rawUrl && rawUrl.includes("tiktok.com")) {
      window.open(rawUrl, "_blank", "noopener,noreferrer");
    }
    return;
  }
  const title = decodeHtmlEntities(v.judul || v.title || v.keterangan || v.Judul || v.JUDUL || "Karya Teater Q");
  const desc = decodeHtmlEntities(v.deskripsi || v.ket || v.Deskripsi || v.DESKRIPSI || "");
  openVideoModal(ytId, title, desc, v.tanggal || "");
}

function playUpNextByIndex(idx) {
  const v = window.tqUpNextVideos && window.tqUpNextVideos[idx];
  if (!v) return;
  const rawUrl = (v.link || v.url || v.Link || v.LINK || "").trim();
  const ytId = getYoutubeID(rawUrl);
  if (!ytId) return;
  const title = decodeHtmlEntities(v.judul || v.title || v.keterangan || v.Judul || v.JUDUL || "Karya Teater Q");
  const desc = decodeHtmlEntities(v.deskripsi || v.ket || v.Deskripsi || v.DESKRIPSI || "");
  openVideoModal(ytId, title, desc, v.tanggal || "");
}

function openVideoModal(youtubeId, title = "Dokumentasi Video", desc = "", dateStr = "") {
  const modal = document.getElementById("videoModal");
  const iframe = document.getElementById("videoIframe");
  const titleEl = document.getElementById("videoModalTitle");
  const mainTitleEl = document.getElementById("videoModalMainTitle");
  const descEl = document.getElementById("videoModalDesc");
  const dateEl = document.getElementById("videoModalDate");
  const extLink = document.getElementById("videoModalExternalLink");
  if (!modal || !iframe) return;

  const cleanTitle = decodeHtmlEntities(title);
  const cleanDesc = decodeHtmlEntities(desc);

  currentPlayingVideo = {
    id: youtubeId,
    title: cleanTitle,
    desc: cleanDesc || "Dokumentasi resmi pementasan lakon, seni peran, dan karya panggung UKM Paguyuban Teater 'Q' UIN Sunan Ampel Surabaya.",
    link: `https://www.youtube.com/watch?v=${youtubeId}`
  };

  iframe.src = `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`;
  if (titleEl) titleEl.textContent = cleanTitle;
  if (mainTitleEl) mainTitleEl.textContent = cleanTitle;
  if (descEl) descEl.textContent = currentPlayingVideo.desc;
  if (dateEl) dateEl.textContent = dateStr || "Karya Saluran Resmi";
  if (extLink) extLink.href = currentPlayingVideo.link;

  modal.classList.remove("hidden");
  modal.classList.add("flex");
  modal.style.display = "flex";
  document.body.classList.add("overflow-hidden");

  // Render daftar putar 'Up Next' di kolom samping
  renderModalUpNext(youtubeId);
}

function closeVideoModal() {
  const modal = document.getElementById("videoModal");
  const iframe = document.getElementById("videoIframe");
  if (!modal || !iframe) return;

  if (document.activeElement && modal.contains(document.activeElement)) {
    document.activeElement.blur();
  }
  iframe.src = "";
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  modal.style.display = "none";
  document.body.classList.remove("overflow-hidden");
  currentPlayingVideo = null;
}

function renderModalUpNext(currentId) {
  const container = document.getElementById("videoModalUpNextList");
  const badge = document.getElementById("upNextCountBadge");
  if (!container) return;

  const dataPool = youtubeData || [];
  const otherVideos = dataPool.filter(v => {
    const rawUrl = (v.link || v.url || v.Link || v.LINK || "").trim();
    const ytId = getYoutubeID(rawUrl);
    return ytId && ytId !== currentId;
  });

  if (badge) {
    badge.textContent = `${otherVideos.length} Video Lainnya`;
  }

  if (otherVideos.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-500 py-4 text-center">Belum ada video lain di daftar putar.</p>`;
    return;
  }

  window.tqUpNextVideos = otherVideos.slice(0, 15);

  container.innerHTML = window.tqUpNextVideos.map((v, idx) => {
    const rawUrl = (v.link || v.url || v.Link || v.LINK || "").trim();
    const ytId = getYoutubeID(rawUrl);
    const title = decodeHtmlEntities(v.judul || v.title || v.keterangan || v.Judul || v.JUDUL || "Karya Teater Q");
    const thumbUrl = `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
    const isShorts = rawUrl.includes("/shorts/");

    return `
      <div class="group flex gap-2.5 p-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-red-500/50 cursor-pointer transition-all active:scale-95 shadow-sm" onclick="playUpNextByIndex(${idx})">
        <div class="relative w-28 h-16 sm:w-32 sm:h-20 rounded-lg overflow-hidden bg-slate-950 shrink-0 border border-slate-800">
          <img src="${thumbUrl}" alt="${escapeHtml(title)}" loading="lazy" onerror="this.onerror=null; this.src='https://img.youtube.com/vi/${ytId}/hqdefault.jpg';" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
          <div class="absolute inset-0 bg-black/25 group-hover:bg-transparent transition flex items-center justify-center">
            <span class="w-6 h-6 rounded-full bg-red-600/90 text-white flex items-center justify-center text-[10px] shadow">
              <i class="fa-solid fa-play ml-0.5"></i>
            </span>
          </div>
          ${isShorts ? `<span class="absolute bottom-1 right-1 bg-red-600 text-white text-[8px] font-black px-1 rounded">SHORTS</span>` : ''}
        </div>
        <div class="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <h5 class="text-xs font-bold text-white group-hover:text-red-400 transition-colors line-clamp-2 leading-snug">${escapeHtml(title)}</h5>
          <span class="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-medium">
            <i class="fa-brands fa-youtube text-red-500 text-[10px]"></i> Teater Q
          </span>
        </div>
      </div>
    `;
  }).join('');
}

function shareCurrentVideo() {
  if (!currentPlayingVideo) return;
  if (navigator.share) {
    navigator.share({
      title: currentPlayingVideo.title,
      text: `Tonton "${currentPlayingVideo.title}" karya Paguyuban Teater Q:`,
      url: currentPlayingVideo.link
    }).catch(() => {});
  } else {
    copyCurrentVideoLink();
  }
}

function copyCurrentVideoLink() {
  if (!currentPlayingVideo) return;
  navigator.clipboard.writeText(currentPlayingVideo.link).then(() => {
    showToast("Tautan video berhasil disalin ke clipboard!", "success");
  }).catch(() => {
    showToast(currentPlayingVideo.link, "info");
  });
}

function playYoutube(wrapper, id) {
  openVideoModal(id);
}

async function ensureYoutubeLoaded() {
  const cacheKey = "tq_pub_youtube_v6";
  const cachedData = localStorage.getItem(cacheKey);
  if (cachedData && youtubeData.length === 0) {
    try {
      youtubeData = JSON.parse(cachedData);
      renderYoutube();
    } catch(e) {}
  }

  if (youtubeLoading) return;
  youtubeLoading = true;

  try {
    // 1. Tarik video live otomatis langsung dari kanal resmi YouTube Teater Q (RSS Feed, batas 15 video terbaru)
    const liveYtVideos = await fetchLiveYouTubeFeed();

    // 2. Tarik juga data arsip pementasan dari Supabase (atau fallback TSV)
    let archiveVideos = [];
    if (window.SupabaseDB && window.SupabaseDB.isConfigured()) {
      try {
        const res = await window.SupabaseDB.getYoutube();
        if (Array.isArray(res) && res.length > 0) {
          archiveVideos = res;
        } else if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
          archiveVideos = res.data;
        }
      } catch (errSb) {
        console.warn("[Youtube] Supabase fetch error, fallback ke TSV:", errSb);
      }
    }

    if (!archiveVideos.length) {
      try {
        const freshY = await loadTSV(URL_YOUTUBE);
        if (freshY && freshY.length > 0) archiveVideos = freshY;
      } catch (eTsv) {}
    }

    // 3. Gabungkan secara cerdas: Video YouTube terbaru otomatis di urutan pertama!
    const seenYtIds = new Set();
    const mergedList = [];

    // Tambahkan live YouTube video terbaru
    liveYtVideos.forEach(v => {
      const id = getYoutubeID(v.link);
      if (id && !seenYtIds.has(id)) {
        seenYtIds.add(id);
        mergedList.push(v);
      }
    });

    // Tambahkan video arsip pementasan legendaris & tiktok tanpa duplikat
    archiveVideos.forEach(v => {
      const keys = Object.keys(v);
      const kLink = keys.find(k => k.toUpperCase() === "LINK") || "LINK";
      const kJudul = keys.find(k => k.toUpperCase() === "JUDUL") || "JUDUL";
      const kDesc = keys.find(k => k.toUpperCase() === "DESKRIPSI") || "DESKRIPSI";

      const rawUrl = (v[kLink] || v.link || v.url || "").trim();
      const id = getYoutubeID(rawUrl);
      if (id) {
        if (!seenYtIds.has(id)) {
          seenYtIds.add(id);
          mergedList.push({
            judul: v[kJudul] || v.judul || v.title || "Lakon Teater Q",
            link: rawUrl,
            deskripsi: v[kDesc] || v.deskripsi || v.ket || "Arsip Pementasan Teater Q",
            kategori: rawUrl.includes("/shorts/") ? "shorts" : "pentas"
          });
        }
      } else if (rawUrl.includes("tiktok.com")) {
        mergedList.push({
          judul: v[kJudul] || v.judul || v.title || "Klip TikTok Teater Q",
          link: rawUrl,
          deskripsi: v[kDesc] || v.deskripsi || v.ket || "",
          kategori: "tiktok"
        });
      }
    });

    if (mergedList.length > 0) {
      youtubeData = mergedList;
      localStorage.setItem(cacheKey, JSON.stringify(mergedList));
      youtubeLoaded = true;
      renderYoutube();
    }
  } catch (e) {
    console.error("Gagal memuat YouTube live:", e);
  } finally {
    youtubeLoading = false;
  }
}

// ============================================================================
// 13. KOTAK SUARA / SARAN
// ============================================================================
async function handleFormSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();

  const namaRaw     = document.querySelector('[name="entry.1149795218"]')?.value || "";
  const angkatanRaw = document.querySelector('[name="entry.97437182"]')?.value || "";
  const topikRaw    = document.querySelector('[name="entry.1992626769"]')?.value || "";
  const pesanRaw    = document.querySelector('[name="entry.493245571"]')?.value || "";

  if (!pesanRaw.trim()) {
    showToast("Silakan tulis isi pesan atau masukan Anda.", "error");
    return;
  }

  const namaDisplay = (namaRaw.trim() === "" ? "Hamba Allah (Anonim)" : namaRaw).trim();
  const angkatanDisplay = angkatanRaw.trim();
  const topikDisplay = (topikRaw || "Saran Umum").trim();
  const pesanDisplay = pesanRaw.trim();

  const btnSubmit = document.querySelector(".btn-submit-saran");
  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<i class="fas fa-spinner fa-spin mr-1"></i> Mengirim...`;
  }

  try {
    if (window.SupabaseDB && window.SupabaseDB.isConfigured()) {
      await window.SupabaseDB.createSaran({
        nama: namaDisplay,
        angkatan: angkatanDisplay || "-",
        topik: topikDisplay,
        pesan: pesanDisplay,
        status: "Belum Ditanggapi"
      });
    }

    showToast("✅ Aspirasi Anda berhasil dikirim ke Meja Kerja Pengurus!", "success");

    // Kirim Notifikasi Real-time ke Bot Telegram Admin Teater Q
    try {
      const waktuStr = new Date().toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
      const msgSaran = `📬 <b>SUARA / ASPIRASI BARU MASUK!</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `👤 <b>Pengirim:</b> ${escapeHtml(namaDisplay)} ${angkatanDisplay ? `(${escapeHtml(angkatanDisplay)})` : ""}\n` +
        `🏷️ <b>Topik:</b> ${escapeHtml(topikDisplay)}\n` +
        `💬 <b>Isi Masukan:</b>\n<i>"${escapeHtml(pesanDisplay)}"</i>\n` +
        `⏰ <b>Waktu:</b> ${waktuStr} WIB\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `<i>Kotak Aspirasi & Suara Portal Teater Q</i>`;
      if (typeof sendTelegramAdminNotification === "function") {
        sendTelegramAdminNotification(msgSaran);
      }
    } catch(errNotif) {}

    const form = document.getElementById("formSaran");
    if (form) form.reset();
    const inputNama = document.getElementById('inputNama');
    const cekAnonim = document.getElementById('cekAnonim');
    if (inputNama) {
      inputNama.removeAttribute('readonly');
      inputNama.style.opacity = "1";
      inputNama.style.cursor = "text";
      inputNama.style.background = "";
    }
    if (cekAnonim) cekAnonim.checked = false;

    // Refresh daftar aspirasi langsung dari Supabase
    await loadDataSaran();
  } catch (err) {
    console.error("Gagal kirim aspirasi ke Supabase:", err);
    showToast("Gagal mengirim aspirasi: " + (err.message || "Koneksi terganggu"), "error");
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = `<i class="fas fa-paper-plane mr-1"></i> Kirim Masukan`;
    }
  }
}

function forceSyncAllData() {
  const keysToRemove = [
    "tq_cache_anggota", "tq_cache_marketplace", "tq_cache_news",
    "tq_cache_galeri", "tq_cache_arsip", "tq_cache_arsip_v2", "tq_cache_arsip_live", "tq_cache_pengurus",
    "tq_cache_prestasi", "tq_cache_ketua", "tq_cache_dana_abadi",
    "tq_cache_youtube", "tq_pub_youtube_v6", "tq_cache_mutasi_dana", "tq_cache_keuangan"
  ];
  keysToRemove.forEach(k => localStorage.removeItem(k));

  anggotaData = []; marketplaceData = []; newsData = [];
  galeriData = []; arsipData = []; pengurusData = [];
  youtubeData = []; prestasiData = []; ketuaData = [];
  mutasiDanaData = [];

  marketplaceLoaded = false; anggotaLoaded = false;
  galeriLoaded = false; pengurusLoaded = false;
  newsLoaded = false; keuanganLoaded = false;
  prestasiLoaded = false; ketuaLoaded = false;
  arsipLoaded = false; mutasiDanaLoaded = false;
  youtubeLoaded = false;

  document.body.classList.remove("nav-open");
  const activePage = document.querySelector(".nav-menu a.active")?.getAttribute("data-page") || "beranda";
  showPage(activePage);

  showToast("⚡ Cache dibersihkan & data disinkronkan langsung!", "success");
}

async function loadDataSaran() {
  const container = document.getElementById('listSaran');
  if (!container) return;

  try {
    let rows = [];
    if (window.SupabaseDB && window.SupabaseDB.isConfigured()) {
      try {
        const sbSaran = await window.SupabaseDB.getSaran();
        if (Array.isArray(sbSaran)) rows = sbSaran;
      } catch (errSb) {
        console.warn("[Saran] Supabase error:", errSb);
      }
    }

    if (!rows || rows.length === 0) {
      container.innerHTML = `<div class="text-center text-slate-500 text-sm py-8"><i class="fa-solid fa-inbox text-2xl text-slate-600 mb-2"></i><p>Belum ada aspirasi atau masukan yang masuk. Jadilah yang pertama!</p></div>`;
      return;
    }

    let htmlCards = '';
    rows.forEach(row => {
      const timestamp = escapeHtml(row.timestamp || row.waktu || row.tanggal || "");
      let nama = escapeHtml(row.nama || "Hamba Allah (Anonim)");
      const angkatan = (row.angkatan && row.angkatan !== "-") ? `(${escapeHtml(row.angkatan)})` : "";
      const topik = escapeHtml(row.topik || "Umum");
      const pesan = escapeHtml(row.pesan || "");
      if (!pesan.trim()) return;

      htmlCards += `
        <div class="relative p-5 rounded-xl border border-slate-700 shadow-sm hover:shadow-md transition-all mb-4 bg-slate-900/60">
          <div class="flex justify-between items-start mb-2">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs text-white font-bold border border-slate-700">
                ${nama.charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 class="text-sm font-bold text-slate-200">
                  ${nama} <span class="text-xs font-normal text-slate-500">${angkatan}</span>
                </h4>
                <div class="text-[10px] text-slate-500">${timestamp}</div>
              </div>
            </div>
            <span class="text-[10px] px-2 py-1 rounded-full bg-slate-950 border border-slate-800 text-purple-400 font-bold flex items-center gap-1">
              <i class="fas fa-comment"></i> ${topik}
            </span>
          </div>
          <div class="text-sm text-slate-300 leading-relaxed pl-10">"${pesan}"</div>
        </div>
      `;
    });

    container.innerHTML = htmlCards || `<div class="text-center text-slate-500 text-sm py-8"><i class="fa-solid fa-inbox text-2xl text-slate-600 mb-2"></i><p>Belum ada aspirasi atau masukan yang masuk. Jadilah yang pertama!</p></div>`;
  } catch (error) {
    console.error("Gagal memuat aspirasi:", error);
    container.innerHTML = `<div class="text-center text-rose-400 text-xs py-4">Gagal memuat aspirasi. Silakan segarkan halaman.</div>`;
  }
}

// ============================================================================
// 13b. KAMPUS HERO SLIDESHOW (RINGAN, ZERO-LAG, SMOOTH CROSSFADE)
// ============================================================================
const KAMPUS_SLIDES_DATA = [
  { title: "UIN Sunan Ampel", sub: "Gedung Twin Towers" },
  { title: "UIN Sunan Ampel", sub: "Monumen I Love UINSA" },
  { title: "UIN Sunan Ampel", sub: "Gedung Perpustakaan" }
];

let currentKampusSlideIndex = 0;
let kampusSlideTimer = null;
const KAMPUS_SLIDE_INTERVAL = 4500;

function updateKampusSlideDisplay(index) {
  const totalSlides = KAMPUS_SLIDES_DATA.length;
  currentKampusSlideIndex = (index + totalSlides) % totalSlides;

  for (let i = 0; i < totalSlides; i++) {
    const slideImg = document.getElementById(`kampusSlide_${i}`);
    if (slideImg) {
      if (i === currentKampusSlideIndex) {
        slideImg.classList.add("active");
      } else {
        slideImg.classList.remove("active");
      }
    }
  }

  const dotsContainer = document.getElementById("kampusDots");
  if (dotsContainer) {
    const dots = dotsContainer.querySelectorAll(".kampus-dot");
    dots.forEach((dot, idx) => {
      if (idx === currentKampusSlideIndex) {
        dot.classList.add("active");
      } else {
        dot.classList.remove("active");
      }
    });
  }

  const titleEl = document.getElementById("kampusCaptionTitle");
  const subEl = document.getElementById("kampusCaptionSub");
  const currentData = KAMPUS_SLIDES_DATA[currentKampusSlideIndex];
  if (currentData) {
    if (titleEl) {
      titleEl.style.opacity = "0";
      setTimeout(() => {
        titleEl.textContent = currentData.title;
        titleEl.style.opacity = "1";
      }, 150);
    }
    if (subEl) {
      subEl.style.opacity = "0";
      setTimeout(() => {
        subEl.textContent = currentData.sub;
        subEl.style.opacity = "1";
      }, 150);
    }
  }
}

function nextKampusSlide(e) {
  if (e) e.stopPropagation();
  resetKampusSlideTimer();
  updateKampusSlideDisplay(currentKampusSlideIndex + 1);
}

function prevKampusSlide(e) {
  if (e) e.stopPropagation();
  resetKampusSlideTimer();
  updateKampusSlideDisplay(currentKampusSlideIndex - 1);
}

function goToKampusSlide(index) {
  resetKampusSlideTimer();
  updateKampusSlideDisplay(index);
}

function startKampusSlideTimer() {
  stopKampusSlideTimer();
  kampusSlideTimer = setInterval(() => {
    if (!document.hidden) {
      updateKampusSlideDisplay(currentKampusSlideIndex + 1);
    }
  }, KAMPUS_SLIDE_INTERVAL);
}

function stopKampusSlideTimer() {
  if (kampusSlideTimer) {
    clearInterval(kampusSlideTimer);
    kampusSlideTimer = null;
  }
}

function resetKampusSlideTimer() {
  startKampusSlideTimer();
}

function initKampusSlideshow() {
  const container = document.getElementById("kampusSlideshow");
  if (!container) return;

  container.addEventListener("mouseenter", stopKampusSlideTimer);
  container.addEventListener("mouseleave", startKampusSlideTimer);

  startKampusSlideTimer();
}

// ============================================================================
// 13.5. COUNTDOWN / HITUNG MUNDUR AGENDA AKBAR (DARI TABEL NEWS)
// ============================================================================
let newsCountdownInterval = null;

function parseDateForCountdown(dateStr) {
  if (!dateStr) return null;
  const clean = dateStr.trim();

  // Format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const d = new Date(clean + "T08:00:00");
    return isNaN(d.getTime()) ? null : d;
  }

  // Format DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(clean)) {
    const parts = clean.split("/");
    const d = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T08:00:00`);
    return isNaN(d.getTime()) ? null : d;
  }

  // Format DD-MM-YYYY
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(clean)) {
    const parts = clean.split("-");
    const d = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T08:00:00`);
    return isNaN(d.getTime()) ? null : d;
  }

  // Coba parse natural atau nama bulan
  const namaBulan = {
    "januari": "01", "jan": "01", "january": "01",
    "februari": "02", "feb": "02", "february": "02",
    "maret": "03", "mar": "03", "march": "03",
    "april": "04", "apr": "04",
    "mei": "05", "may": "05",
    "juni": "06", "jun": "06", "june": "06",
    "juli": "07", "jul": "07", "july": "07",
    "agustus": "08", "agu": "08", "aug": "08", "august": "08",
    "september": "09", "sep": "09",
    "oktober": "10", "okt": "10", "october": "10",
    "november": "11", "nov": "11",
    "desember": "12", "des": "12", "december": "12"
  };

  const words = clean.split(/[\s,]+/);
  if (words.length >= 3) {
    const day = words[0].replace(/[^0-9]/g, '');
    const monthKey = words[1].toLowerCase();
    const year = words[2].replace(/[^0-9]/g, '');
    const m = namaBulan[monthKey];
    if (day && m && year) {
      const d = new Date(`${year}-${m}-${day.padStart(2, '0')}T08:00:00`);
      if (!isNaN(d.getTime())) return d;
    }
  }

  const fallback = new Date(clean);
  return isNaN(fallback.getTime()) ? null : fallback;
}

function updateNewsCountdown() {
  const card = document.getElementById("newsCountdownCard");
  if (!card) return;

  if (!newsData || newsData.length === 0) {
    return;
  }

  const now = new Date().getTime();

  // Parsing semua agenda dan cari yang paling dekat di masa depan (atau yang baru lewat)
  const parsedList = newsData.map(item => {
    const time = parseDateToTimestamp(item["TANGGAL KEGIATAN"]);
    return {
      raw: item,
      title: item["NAMA KEGIATAN"] || "Agenda Teater Q",
      dateStr: item["TANGGAL KEGIATAN"] || "",
      place: item["TEMPAT KEGIATAN"] || "Kampus UIN Sunan Ampel Surabaya",
      time: time
    };
  }).filter(i => i.time > 0);

  if (parsedList.length === 0) return;

  // Prioritaskan event yang akan datang (time >= now)
  const upcoming = parsedList
    .filter(i => i.time >= now)
    .sort((a, b) => a.time - b.time);

  let targetEvent = null;
  let isPast = false;

  if (upcoming.length > 0) {
    targetEvent = upcoming[0];
  } else {
    // Jika semua agenda sudah terlewati, ambil agenda terbaru yang terakhir kali terlaksana
    parsedList.sort((a, b) => b.time - a.time);
    targetEvent = parsedList[0];
    isPast = true;
  }

  window.currentActiveEvent = targetEvent;
  window.currentActiveEventIsPast = isPast;
  updateSawerAcaraTotal(targetEvent.title);

  // Tampilkan data ke UI
  const titleEl = document.getElementById("countdownEventTitle");
  const dateEl  = document.getElementById("countdownEventDate");
  const placeEl = document.getElementById("countdownEventPlace");
  const badgeLabel = document.getElementById("countdownBadgeLabel");
  const btnSawer = document.getElementById("btnSawerKegiatan") || document.querySelector("#newsCountdownCard button[onclick*='openSawerKegiatanModal']");

  let displayDate = targetEvent.dateStr;
  try {
    if (targetEvent.time) {
      const d = new Date(targetEvent.time);
      if (!isNaN(d.getTime())) {
        const blnIndo = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
        displayDate = `${d.getDate()} ${blnIndo[d.getMonth()]} ${d.getFullYear()}`;
      }
    }
  } catch(e) {}

  if (titleEl) titleEl.textContent = targetEvent.title;
  if (dateEl) dateEl.innerHTML = `<i class="far fa-calendar-alt text-cyan-200 text-xs"></i> <span style="color: #ffffff !important; font-weight: 600;">${escapeHtml(displayDate)}</span>`;
  if (placeEl) placeEl.innerHTML = `<i class="fas fa-map-marker-alt text-pink-300 text-xs"></i> <span style="color: #ffffff !important; font-weight: 600;">${escapeHtml(targetEvent.place)}</span>`;

  if (isPast) {
    if (badgeLabel) {
      badgeLabel.textContent = "AGENDA TERLAKSANA (SUKSES)";
    }
    if (btnSawer) {
      btnSawer.dataset.closedApplied = "hibah";
      btnSawer.className = "w-full bg-white font-extrabold py-2.5 px-2 rounded-xl shadow-md hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center gap-1.5 text-xs cursor-pointer border border-pink-200/90";
      btnSawer.style.cssText = "color: #be185d !important; background-color: #ffffff !important;";
      btnSawer.setAttribute("onclick", "openSawerKegiatanModal('', true)");
      btnSawer.innerHTML = '<i class="fas fa-gift text-pink-600 text-xs"></i> <span class="font-black tracking-tight truncate" style="color: #be185d !important;">Dana Hibah</span>';
    }
  } else {
    if (badgeLabel) {
      badgeLabel.textContent = "AGENDA AKBAR MENDATANG";
    }
    if (btnSawer) {
      btnSawer.dataset.closedApplied = "";
      btnSawer.className = "w-full bg-white font-extrabold py-2.5 px-2 rounded-xl shadow-md hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center gap-1.5 text-xs cursor-pointer border border-white/90";
      btnSawer.style.cssText = "color: #6b21a8 !important; background-color: #ffffff !important;";
      btnSawer.setAttribute("onclick", "openSawerKegiatanModal()");
      btnSawer.innerHTML = '<i class="fas fa-gift text-purple-600 text-xs"></i> <span class="font-black tracking-tight truncate" style="color: #6b21a8 !important;">Hibah Kegiatan</span>';
    }
  }

  // Fungsi tick hitung mundur
  function tick() {
    const currentTime = new Date().getTime();
    let distance = targetEvent.time - currentTime;

    const daysEl  = document.getElementById("cdDays");
    const hoursEl = document.getElementById("cdHours");
    const minsEl  = document.getElementById("cdMins");
    const secsEl  = document.getElementById("cdSecs");

    if (distance <= 0) {
      window.currentActiveEventIsPast = true;
      if (daysEl) daysEl.textContent = "00";
      if (hoursEl) hoursEl.textContent = "00";
      if (minsEl) minsEl.textContent = "00";
      if (secsEl) secsEl.textContent = "00";
      if (badgeLabel) {
        badgeLabel.textContent = "AGENDA TERLAKSANA (SUKSES)";
      }
      const btnEl = document.getElementById("btnSawerKegiatan") || document.querySelector("#newsCountdownCard button[onclick*='openSawerKegiatanModal']");
      if (btnEl && btnEl.dataset.closedApplied !== "hibah") {
        btnEl.dataset.closedApplied = "hibah";
        btnEl.className = "w-full bg-white font-extrabold py-2.5 px-2 rounded-xl shadow-md hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center gap-1.5 text-xs cursor-pointer border border-pink-200/90";
        btnEl.style.cssText = "color: #be185d !important; background-color: #ffffff !important;";
        btnEl.setAttribute("onclick", "openSawerKegiatanModal('', true)");
        btnEl.innerHTML = '<i class="fas fa-gift text-pink-600 text-xs"></i> <span class="font-black tracking-tight truncate" style="color: #be185d !important;">Dana Hibah</span>';
      }
      return;
    }

    const days  = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins  = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const secs  = Math.floor((distance % (1000 * 60)) / 1000);

    if (daysEl)  daysEl.textContent  = String(days).padStart(2, '0');
    if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
    if (minsEl)  minsEl.textContent  = String(mins).padStart(2, '0');
    if (secsEl)  secsEl.textContent  = String(secs).padStart(2, '0');
  }

  tick();
  if (newsCountdownInterval) clearInterval(newsCountdownInterval);
  newsCountdownInterval = setInterval(tick, 1000);
}

// ============================================================================
// 14. INITIALIZATION (DOM CONTENT LOADED)
// ============================================================================
function openInstallModal() {
  const modal = document.getElementById("installModal");
  if (!modal) return;
  modal.style.display = "flex";

  // Cek apakah prompt 1-klik native dari Chrome / Android tersedia
  const directBtnContainer = document.getElementById("directInstallContainer");
  if (directBtnContainer) {
    directBtnContainer.style.display = deferredPwaPrompt ? "block" : "none";
  }

  // Deteksi otomatis OS pengguna (iOS Safari vs Android)
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIos) {
    switchInstallTab("ios");
  } else {
    switchInstallTab("android");
  }
}

function closeInstallModal() {
  const modal = document.getElementById("installModal");
  if (modal) modal.style.display = "none";
}

function switchInstallTab(tab) {
  const guideAndroid = document.getElementById("guideAndroid");
  const guideIos = document.getElementById("guideIos");
  const btnTabAndroid = document.getElementById("btnTabAndroid");
  const btnTabIos = document.getElementById("btnTabIos");

  if (tab === "ios") {
    if (guideAndroid) guideAndroid.style.display = "none";
    if (guideIos) guideIos.style.display = "block";
    if (btnTabAndroid) {
      btnTabAndroid.className = "install-tab-btn py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 text-slate-400 hover:text-white";
    }
    if (btnTabIos) {
      btnTabIos.className = "install-tab-btn active py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 bg-sky-600 text-white shadow-sm";
    }
  } else {
    if (guideAndroid) guideAndroid.style.display = "block";
    if (guideIos) guideIos.style.display = "none";
    if (btnTabAndroid) {
      btnTabAndroid.className = "install-tab-btn active py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 bg-emerald-600 text-white shadow-sm";
    }
    if (btnTabIos) {
      btnTabIos.className = "install-tab-btn py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 text-slate-400 hover:text-white";
    }
  }
}

async function triggerDirectInstallFromModal() {
  if (deferredPwaPrompt) {
    closeInstallModal();
    deferredPwaPrompt.prompt();
    const choice = await deferredPwaPrompt.userChoice;
    if (choice.outcome === "accepted") {
      showToast("Aplikasi Teater Q berhasil dipasang di layar utama! ✨", "success");
      localStorage.setItem("tq_pwa_installed", "true");
    }
    deferredPwaPrompt = null;
  }
}

// Smart Floating PWA Banner Functions
function isPwaAlreadyInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches || 
         window.navigator.standalone === true;
}

function showPwaFloatingBanner() {
  if (isPwaAlreadyInstalled()) return;

  // Cek jika pengguna pernah klik 'Nanti' di sesi browsing saat ini
  const dismissedInSession = sessionStorage.getItem("tq_pwa_banner_dismissed_session");
  if (dismissedInSession === "true") {
    return;
  }

  const banner = document.getElementById("pwaFloatingBanner");
  if (!banner) return;

  banner.style.display = "block";
  requestAnimationFrame(() => {
    setTimeout(() => {
      banner.classList.remove("translate-y-full", "opacity-0");
      banner.classList.add("translate-y-0", "opacity-100");
    }, 50);
  });
}

function dismissPwaBanner() {
  const banner = document.getElementById("pwaFloatingBanner");
  if (banner) {
    banner.classList.remove("translate-y-0", "opacity-100");
    banner.classList.add("translate-y-full", "opacity-0");
    setTimeout(() => {
      banner.style.display = "none";
    }, 300);
  }
  // Disembunyikan hanya untuk sesi saat ini agar tidak mengganggu navigasi.
  sessionStorage.setItem("tq_pwa_banner_dismissed_session", "true");
}

async function installPwaFromBanner() {
  const banner = document.getElementById("pwaFloatingBanner");
  if (banner) {
    banner.classList.remove("translate-y-0", "opacity-100");
    banner.classList.add("translate-y-full", "opacity-0");
    setTimeout(() => {
      banner.style.display = "none";
    }, 300);
  }

  if (deferredPwaPrompt) {
    deferredPwaPrompt.prompt();
    const choice = await deferredPwaPrompt.userChoice;
    if (choice.outcome === "accepted") {
      showToast("Aplikasi Teater Q berhasil dipasang di layar utama! ✨", "success");
      localStorage.setItem("tq_pwa_installed", "true");
    }
    deferredPwaPrompt = null;
  } else {
    // Fallback jika di iOS Safari atau browser tanpa beforeinstallprompt
    openInstallModal();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // 1. Inisialisasi Tahun Footer & UI
  const yearEl = document.getElementById("yearSpan");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  initTheme();
  initSectionCounters();
  initMapPicker();
  setupMarqueeIntersectionObserver();
  ensurePengurusLoaded();
  if (typeof updateQReloadBalanceDisplays === 'function') updateQReloadBalanceDisplays();
  if (typeof fetchVipBalanceBackground === 'function') setTimeout(() => fetchVipBalanceBackground(true), 300);
  if (typeof fetchQStoreCentralProfit === 'function') setTimeout(() => fetchQStoreCentralProfit(true), 400);
  if (typeof checkAdminAccUrlParams === 'function') setTimeout(checkAdminAccUrlParams, 450);
  setTimeout(ensureYoutubeLoaded, 500);

  // 2. Tandai PWA Standalone Mode di <body>
  if (isPwaAlreadyInstalled()) {
    document.body.classList.add("is-pwa-standalone");
    const btnInstall = document.getElementById("btnInstallMenu");
    if (btnInstall) btnInstall.style.display = "none";
  }

  // 3. Notifikasi Koneksi Online / Offline Real-time
  window.addEventListener("online", () => {
    if (typeof showToast === "function") showToast("Koneksi internet kembali terhubung! 🌐", "success");
  });
  window.addEventListener("offline", () => {
    if (typeof showToast === "function") showToast("Koneksi internet terputus. Mode offline aktif.", "warning");
  });

  // 4. Registrasi PWA Service Worker (High Performance + Offline Shell Resilience)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js?v=202610040830').catch(err => {
      console.warn("SW register:", err);
    });
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPwaPrompt = e;
    // Otomatis munculkan floating banner setelah jeda 2.5 detik jika bukan standalone
    if (!isPwaAlreadyInstalled()) {
      setTimeout(showPwaFloatingBanner, 2500);
    }
  });

  window.addEventListener("appinstalled", () => {
    const banner = document.getElementById("pwaFloatingBanner");
    if (banner) banner.remove();
    deferredPwaPrompt = null;
    localStorage.setItem("tq_pwa_installed", "true");
    document.body.classList.add("is-pwa-standalone");
    showToast("Aplikasi Teater Q berhasil dipasang di layar utama! ✨", "success");
  });

  // Bersihkan kunci lama agar selalu muncul di kunjungan baru
  try { localStorage.removeItem("tq_pwa_banner_dismissed"); } catch(e) {}

  // Trigger floating banner otomatis untuk pengguna mobile jika belum terpasang
  if (!isPwaAlreadyInstalled()) {
    setTimeout(() => {
      const banner = document.getElementById("pwaFloatingBanner");
      if (banner && banner.style.display === "none") {
        showPwaFloatingBanner();
      }
    }, 3000);
  }

  const btnInstallMenu = document.getElementById("btnInstallMenu");
  if (btnInstallMenu) {
    btnInstallMenu.addEventListener("click", async () => {
      document.body.classList.remove("nav-open");
      if (deferredPwaPrompt) {
        deferredPwaPrompt.prompt();
        const choice = await deferredPwaPrompt.userChoice;
        if (choice.outcome === "accepted") {
          showToast("Aplikasi berhasil dipasang di layar utama! ✨");
          localStorage.setItem("tq_pwa_installed", "true");
        }
        deferredPwaPrompt = null;
      } else {
        openInstallModal();
      }
    });
  }

  // Ekspos ke global window
  window.showPwaFloatingBanner = showPwaFloatingBanner;
  window.dismissPwaBanner = dismissPwaBanner;
  window.installPwaFromBanner = installPwaFromBanner;
  window.openInstallModal = openInstallModal;
  window.closeInstallModal = closeInstallModal;
  window.switchInstallTab = switchInstallTab;
  window.triggerDirectInstallFromModal = triggerDirectInstallFromModal;
  window.openKtaByIndex = openKtaByIndex;
  window.openKtaFromCurrentDetail = openKtaFromCurrentDetail;
  window.toggleKtaFlip = toggleKtaFlip;
  window.closeKtaModal = closeKtaModal;
  window.downloadKtaImage = downloadKtaImage;
  window.forceSyncAllData = forceSyncAllData;
  window.toggleWilayahDropdown = toggleWilayahDropdown;
  window.closeWilayahDropdown = closeWilayahDropdown;
  window.filterWilayahListItems = filterWilayahListItems;
  window.selectCustomWilayah = selectCustomWilayah;
  window.toggleAngkatanDropdown = toggleAngkatanDropdown;
  window.closeAngkatanDropdown = closeAngkatanDropdown;
  window.filterAngkatanListItems = filterAngkatanListItems;
  window.selectCustomAngkatan = selectCustomAngkatan;
  window.populateAngkatanFilter = populateAngkatanFilter;
  window.togglePeriodeDropdown = togglePeriodeDropdown;
  window.closePeriodeDropdown = closePeriodeDropdown;
  window.filterPeriodeListItems = filterPeriodeListItems;
  window.selectCustomPeriode = selectCustomPeriode;
  window.populatePeriodeFilter = populatePeriodeFilter;
  window.toggleCheckoutKotaDropdown = toggleCheckoutKotaDropdown;
  window.closeCheckoutKotaDropdown = closeCheckoutKotaDropdown;
  window.filterCheckoutKotaList = filterCheckoutKotaList;
  window.selectCustomCheckoutCity = selectCustomCheckoutCity;
  window.showCustomConfirm = showCustomConfirm;
  window.closeCustomConfirm = closeCustomConfirm;
  window.nextKampusSlide = nextKampusSlide;
  window.prevKampusSlide = prevKampusSlide;
  window.goToKampusSlide = goToKampusSlide;
  window.loadPortalVisitorStats = loadPortalVisitorStats;
  window.playVideoByIndex = playVideoByIndex;
  window.playUpNextByIndex = playUpNextByIndex;
  window.clearSearchVideo = clearSearchVideo;
  window.toggleClearSearchVideoBtn = toggleClearSearchVideoBtn;
  window.openVideoModal = openVideoModal;
  window.closeVideoModal = closeVideoModal;
  window.shareCurrentVideo = shareCurrentVideo;
  window.copyCurrentVideoLink = copyCurrentVideoLink;
  window.filterVideoByPlatform = filterVideoByPlatform;
  window.onSearchVideoChange = onSearchVideoChange;
  window.loadMoreVideos = loadMoreVideos;
  window.playYoutube = playYoutube;

  // 3. Tombol Sinkronisasi Manual (Bypass Semua Cache)
  const btnSyncData = document.getElementById("btnSyncData");
  if (btnSyncData) {
    btnSyncData.addEventListener("click", () => {
      forceSyncAllData();
    });
  }

  // 3. Navigasi & Hamburger Menu
  const navToggle = document.getElementById("navToggle");
  if (navToggle) {
    navToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      document.body.classList.toggle("nav-open");
    });
  }

  // Tutup menu jika klik di luar area
  document.addEventListener("click", (e) => {
    if (document.body.classList.contains("nav-open")) {
      const navMenu = document.getElementById("navMenu");
      const navTgl = document.getElementById("navToggle");
      if (navMenu && navTgl && !navMenu.contains(e.target) && !navTgl.contains(e.target)) {
        document.body.classList.remove("nav-open");
      }
    }
  });

  document.querySelectorAll(".nav-menu a, .bottom-nav-item, .quick-menu-item").forEach(el => {
    const page = el.getAttribute("data-page");
    if (!page) return;
    el.addEventListener("click", () => {
      document.body.classList.remove("nav-open");
      showPage(page);
    });
  });

  // 4. Tombol Login/Logout Navigasi
  const navLoginLink = document.getElementById("navLoginLink");
  if (navLoginLink) {
    navLoginLink.addEventListener("click", () => {
      if (isLoggedIn) handleLogout();
      else showPage("login");
    });
  }

  const loginBtn = document.getElementById("loginButton");
  if (loginBtn) loginBtn.addEventListener("click", handleLoginSubmit);


  const loginUsername = document.getElementById("loginUsername");
  if (loginUsername) {
    loginUsername.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        const passInput = document.getElementById("loginPassword");
        if (passInput && !passInput.value) passInput.focus();
        else handleLoginSubmit(e);
      }
    });
  }

  const loginPassword = document.getElementById("loginPassword");
  if (loginPassword) {
    loginPassword.addEventListener("keydown", e => {
      if (e.key === "Enter") handleLoginSubmit(e);
    });
  }

  // Tutup custom dropdown rekrutmen saat klik di luar
  document.addEventListener("click", e => {
    const dropdownWrap = document.getElementById("customDropdownRekrutmen");
    const menu = document.getElementById("menuDropdownRekrutmen");
    const icon = document.getElementById("iconDropdownRekrutmen");
    if (dropdownWrap && menu && !dropdownWrap.contains(e.target)) {
      menu.classList.add("hidden");
      if (icon) icon.style.transform = "rotate(0deg)";
    }
  });

  const togglePassBtn = document.getElementById("toggleLoginPassword");
  if (togglePassBtn) {
    togglePassBtn.addEventListener("click", () => {
      const passInput = document.getElementById("loginPassword");
      const icon = document.getElementById("togglePasswordIcon");
      if (!passInput) return;
      if (passInput.type === "password") {
        passInput.type = "text";
        if (icon) icon.className = "fas fa-eye-slash";
      } else {
        passInput.type = "password";
        if (icon) icon.className = "fas fa-eye";
      }
    });
  }

  // 5. Search Input Listeners (Debounced)
  const searchInputs = [
    { id: "searchMarketplace", fn: () => { marketLimit = 12; renderMarketplace(); } },
    { id: "searchAnggota", fn: () => { anggotaLimit = 20; renderAnggota(); } },
    { id: "searchGaleri", fn: () => { galeriLimit = 12; renderGaleri(); } },
    { id: "searchNews", fn: renderNews },
    { id: "searchArsip", fn: () => { arsipLimit = 20; renderArsip(); } },
    { id: "searchPengurus", fn: () => { pengurusLimit = 20; renderPengurus(); } },
    { id: "searchYoutube", fn: renderYoutube },
    { id: "searchMutasiDana", fn: renderLaporanDana }
  ];
  searchInputs.forEach(item => {
    const el = document.getElementById(item.id);
    if (el) el.addEventListener("input", debounce(item.fn, 300));
  });

  const filterWilayah = document.getElementById("filterWilayahAnggota");
  if (filterWilayah) {
    filterWilayah.addEventListener("change", () => {
      anggotaLimit = 20;
      renderAnggota();
    });
  }

  const filterAngkatan = document.getElementById("filterAngkatanAnggota");
  if (filterAngkatan) {
    filterAngkatan.addEventListener("change", () => {
      anggotaLimit = 20;
      renderAnggota();
    });
  }

  // 6. Lightbox & Dropdown Outside Click Event Listener
  const lightboxClose = document.getElementById("lightboxClose");
  const lightbox = document.getElementById("lightbox");
  if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
  if (lightbox) {
    lightbox.addEventListener("click", e => {
      if (e.target === lightbox) closeLightbox();
    });
  }
  document.addEventListener("click", e => {
    // Tutup dropdown wilayah jika klik di luar
    const wilayahContainer = document.getElementById("customWilayahDropdownContainer");
    if (wilayahContainer && !wilayahContainer.contains(e.target)) {
      closeWilayahDropdown();
    }
    // Tutup dropdown angkatan jika klik di luar
    const angkatanContainer = document.getElementById("customAngkatanDropdownContainer");
    if (angkatanContainer && !angkatanContainer.contains(e.target)) {
      closeAngkatanDropdown();
    }
    // Tutup dropdown kota pengiriman jika klik di luar
    const checkoutKotaContainer = document.getElementById("customCheckoutKotaContainer");
    if (checkoutKotaContainer && !checkoutKotaContainer.contains(e.target)) {
      closeCheckoutKotaDropdown();
    }
    // Tutup dropdown tahun galeri jika klik di luar
    const galeriYearContainer = document.getElementById("customGaleriYearDropdownContainer");
    if (galeriYearContainer && !galeriYearContainer.contains(e.target)) {
      closeGaleriYearDropdown();
    }
    // Tutup dropdown tahun warta / news jika klik di luar
    const newsYearContainer = document.getElementById("customNewsYearDropdownContainer");
    if (newsYearContainer && !newsYearContainer.contains(e.target)) {
      closeNewsYearDropdown();
    }
    // Tutup dropdown periode pengurus jika klik di luar
    const periodeContainer = document.getElementById("customPeriodeDropdownContainer");
    if (periodeContainer && !periodeContainer.contains(e.target)) {
      closePeriodeDropdown();
    }

    const img = e.target.closest(".js-lightbox");
    if (img) {
      const full = img.dataset.full || img.src;
      const caption = img.dataset.caption || img.alt || "";
      openLightbox(full, caption);
    }
  });

  // Listener tombol Escape untuk menutup semua modal & popup foto
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      closeProductPhotoDetail();
      closeCheckoutModal();
      closeCartModal();
      closeLightbox();
      closeWilayahDropdown();
      closeAngkatanDropdown();
      closeCheckoutKotaDropdown();
      closeGaleriYearDropdown();
      closeNewsYearDropdown();
      closePeriodeDropdown();
    }
  });

  // 7. Kotak Suara / Anonim Checkbox
  const cekAnonim = document.getElementById('cekAnonim');
  const inputNama = document.getElementById('inputNama');
  if (cekAnonim && inputNama) {
    cekAnonim.addEventListener('change', function() {
      if (this.checked) {
        inputNama.value = "Hamba Allah (Anonim)";
        inputNama.setAttribute('readonly', true);
        inputNama.style.opacity = "0.5";
        inputNama.style.cursor = "not-allowed";
        inputNama.style.background = "#1e293b";
      } else {
        inputNama.value = "";
        inputNama.removeAttribute('readonly');
        inputNama.style.opacity = "1";
        inputNama.style.cursor = "text";
        inputNama.style.background = "";
        inputNama.focus();
      }
    });
  }
  loadDataSaran();

  // 8. Form Konfirmasi Infak Dana Abadi & Checkbox Anonim
  const cekAnonimInfak = document.getElementById('cekAnonimInfak');
  const inputNamaInfak = document.getElementById('inputNamaInfak');
  if (cekAnonimInfak && inputNamaInfak) {
    cekAnonimInfak.addEventListener('change', function() {
      if (this.checked) {
        inputNamaInfak.value = "Hamba Allah (Anonim)";
        inputNamaInfak.setAttribute('readonly', true);
        inputNamaInfak.style.opacity = "1";
        inputNamaInfak.style.background = "#f1f5f9";
        inputNamaInfak.style.color = "#000000";
        inputNamaInfak.style.fontWeight = "700";
        inputNamaInfak.style.cursor = "not-allowed";
      } else {
        inputNamaInfak.value = "";
        inputNamaInfak.removeAttribute('readonly');
        inputNamaInfak.style.opacity = "1";
        inputNamaInfak.style.background = "#ffffff";
        inputNamaInfak.style.color = "#000000";
        inputNamaInfak.style.fontWeight = "600";
        inputNamaInfak.style.cursor = "text";
        inputNamaInfak.focus();
      }
    });
  }

  const infakForm = document.getElementById("infakForm");
  if (infakForm) {
    infakForm.addEventListener("submit", async function(e) {
      e.preventDefault();
      if (!this.checkValidity()) {
        this.reportValidity();
        return;
      }
      const data = new FormData(this);
      const namaInput = (data.get("entry.436281593") || "").toString().trim() || "Hamba Allah";
      const angkatanInput = (data.get("entry.461775557") || "").toString().trim();
      const nominalInput = parseInt(data.get("entry.1935320584"), 10) || 0;
      const pesanInput = (data.get("entry.1081332101") || "").toString().trim();

      const fileInput = document.getElementById("inputBuktiTransfer");
      const fileBukti = (fileInput && fileInput.files && fileInput.files[0]) ? fileInput.files[0] : null;

      const btn = this.querySelector('button[type="submit"]');
      const originalText = btn.innerHTML;
      btn.disabled = true;

      let driveBuktiUrl = "";

      // 1. Unggah bukti transfer ke Google Drive jika ANGGOTA melampirkan foto
      if (fileBukti) {
        btn.innerHTML = '<i class="fas fa-cloud-upload-alt fa-spin mr-1"></i> Mengunggah Foto Struk...';
        try {
          driveBuktiUrl = await uploadBuktiTransfer(fileBukti);
        } catch (err) {
          console.warn("Upload bukti gagal:", err);
        }
      }

      btn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-1"></i> Menyimpan Konfirmasi...';

      // 2. Jalur Utama: Simpan resmi ke Database Server Kas Dana Abadi (termasuk link foto bukti)
      const scriptUrl = (typeof URL_DANA_ABADI !== "undefined" && URL_DANA_ABADI) ? URL_DANA_ABADI : UPLOAD_SCRIPT_URL;
      const containerHibah = document.getElementById("containerPeruntukanHibah");
      const isHibahMode = containerHibah && containerHibah.style.display !== "none";
      let kategoriVal = document.getElementById("inputKategoriInfak")?.value || "Infak";

      if (isHibahMode) {
        const selectHibah = document.getElementById("selectPeruntukanHibah");
        const inputLain = document.getElementById("inputPeruntukanHibahLain");
        let peruntukanTeks = selectHibah ? selectHibah.value : "Operasional Sanggar & Perawatan Alat";
        if (peruntukanTeks === "Lainnya") {
          peruntukanTeks = (inputLain && inputLain.value.trim()) ? inputLain.value.trim() : "Lainnya";
        }
        kategoriVal = "Dana Hibah: " + peruntukanTeks;
      }

      // 1. Simpan Langsung ke Cloud Supabase Murni (100% Supabase - Bebas Google Sheet)
      let supabasePromise = Promise.resolve();
      if (window.SupabaseDB && window.SupabaseDB.isConfigured()) {
        supabasePromise = window.SupabaseDB.addDonasi({
          nama: namaInput,
          angkatan: angkatanInput || "-",
          nominal: nominalInput,
          pesan: pesanInput || "-",
          kategori: kategoriVal,
          peruntukan: isHibahMode ? kategoriVal.replace(/^Dana Hibah:?\s*/i, "") : "",
          bukti: driveBuktiUrl || ""
        }).catch(errSb => {
          console.warn("[Supabase] Simpan donasi error:", errSb);
          return null;
        });
      }

      // Tunggu konfirmasi Supabase (kilat ~300ms)
      Promise.race([
        supabasePromise,
        new Promise(r => setTimeout(r, 1200))
      ]).then(() => {
        // 1. Langsung tambahkan ke tampilan portal seketika (Optimistic UI Update)
        tambahInfakLokal({
          nama: namaInput,
          angkatan: angkatanInput,
          nominal: nominalInput,
          pesan: pesanInput,
          kategori: kategoriVal
        });

        // 2. Kirim Notifikasi Pop-up Instan ke Telegram HP Admin (termasuk link Bukti Transfer jika ada)
        kirimNotifTelegramInfak({
          nama: namaInput,
          angkatan: angkatanInput,
          nominal: nominalInput,
          pesan: pesanInput,
          kategori: kategoriVal,
          buktiUrl: driveBuktiUrl
        });

        showToast("Alhamdulillah! Konfirmasi infak berhasil dikirim ✨", "success");

        // 3. Tampilkan Layar Sukses + Tombol WhatsApp Admin di Modal
        const formBox = document.getElementById("infakFormContainer");
        const successBox = document.getElementById("infakSuccessContainer");
        const elNama = document.getElementById("suksesNamaDonatur");
        const elNominal = document.getElementById("suksesNominalDonasi");
        const boxDoa = document.getElementById("suksesBoxDoa");
        const elDoa = document.getElementById("suksesTeksDoa");
        const boxBukti = document.getElementById("suksesBoxBukti");
        const linkBukti = document.getElementById("suksesLinkBukti");
        const btnWa = document.getElementById("btnWaKonfirmasi");

        if (elNama) elNama.textContent = namaInput + (angkatanInput ? ` (${angkatanInput})` : '');
        if (elNominal) elNominal.textContent = formatRupiah(nominalInput);
        if (boxDoa && elDoa) {
          if (pesanInput) {
            boxDoa.style.display = "block";
            elDoa.textContent = `"${pesanInput}"`;
          } else {
            boxDoa.style.display = "none";
          }
        }

        if (boxBukti && linkBukti) {
          if (driveBuktiUrl) {
            boxBukti.style.display = "block";
            linkBukti.href = driveBuktiUrl;
          } else {
            boxBukti.style.display = "none";
          }
        }

        if (btnWa) {
          const isHibah = (kategoriVal || "").toLowerCase().includes("hibah");
          const isSawer = !isHibah && ((kategoriVal || "").toLowerCase().includes("kegiatan") || (kategoriVal || "").toLowerCase().includes("sawer") || (kategoriVal || "").toLowerCase().includes("acara"));
          const bendaharaWA = (typeof CONFIG_INFO !== 'undefined' && CONFIG_INFO.noBendaharaWA) ? CONFIG_INFO.noBendaharaWA : (CONFIG_INFO?.noAdminWA || "6285645829346");
          let perihal = `Infak Dana Abadi`;
          if (isHibah) {
            perihal = `Dana Hibah & Harapan Senior (${kategoriVal.replace(/^dana hibah:\s*/i, '').replace(/^hibah kegiatan:\s*/i, '')})`;
          } else if (isSawer) {
            perihal = `Hibah Kegiatan (${kategoriVal.replace(/^bantuan kegiatan:\s*/i, '').replace(/^hibah kegiatan:\s*/i, '')})`;
          }
          const labelDoa = isHibah ? "Harapan/Nasihat" : "Pesan/Doa";
          const textWA = `Assalamu'alaikum Bendahara Teater Q,\nSaya ingin mengonfirmasi penyaluran ${perihal}:\n\n` +
            `• *Nama:* ${namaInput}\n` +
            (angkatanInput ? `• *Angkatan:* ${angkatanInput}\n` : '') +
            `• *Nominal:* ${formatRupiah(nominalInput)}\n` +
            `• *Kategori:* ${kategoriVal}\n` +
            (pesanInput ? `• *${labelDoa}:* "${pesanInput}"\n` : '') +
            (driveBuktiUrl ? `• *Bukti Transfer (Drive):* ${driveBuktiUrl}\n` : '') +
            `\nTerima kasih!`;
          btnWa.href = `https://wa.me/${bendaharaWA}?text=${encodeURIComponent(textWA)}`;
        }

        if (formBox) formBox.style.display = "none";
        if (successBox) successBox.style.display = "block";

        this.reset();
        hapusBuktiTransfer();
        if (inputNamaInfak) {
          inputNamaInfak.removeAttribute('readonly');
          inputNamaInfak.style.opacity = "1";
          inputNamaInfak.style.background = "";
          inputNamaInfak.style.cursor = "text";
        }
        const cekAnonim = document.getElementById("cekAnonimInfak");
        if (cekAnonim) cekAnonim.checked = false;

        // 4. Ambil data terkonfirmasi dari database portal di latar belakang (jeda 3 detik)
        setTimeout(() => {
          loadDanaAbadi();
        }, 3000);
      })
      .catch((err) => {
        console.error("Pengiriman konfirmasi infak gagal:", err);
        showToast("Gagal terhubung ke server. Cek koneksi.", "error");
      })
        .finally(() => {
          btn.innerHTML = originalText;
          btn.disabled = false;
        });
    });
  }

  // 9. Cek Sesi Login Awal
  const sessionRaw = localStorage.getItem("tq_user_session");
  let hasValidSession = false;
  if (sessionRaw) {
    try {
      const sessionObj = JSON.parse(sessionRaw);
      if (sessionObj && (sessionObj.status === "active" || sessionObj === "active")) {
        hasValidSession = true;
      }
    } catch (e) {
      if (sessionRaw === "active") hasValidSession = true;
    }
  }

  const initialHash = window.location.hash.replace("#", "").trim();

  // Deteksi instan: Jika dibuka lewat link grup (?ref=grup / ?ref=wa / ?ref=alumni)
  const urlParams = new URLSearchParams(window.location.search);
  const refParam = (urlParams.get("ref") || urlParams.get("akses") || urlParams.get("from") || "").toLowerCase().trim();
  const isDirectGroupAccess = refParam === "grup" || refParam === "group" || refParam === "warga" || refParam === "alumni" || refParam === "wa" ||
                              urlParams.has("grup") || urlParams.has("group");

  if (isDirectGroupAccess) {
    // 100% LANGSUNG MASUK TANPA PERNAH MENAMPILKAN FORM LOGIN
    performDirectLogin("Keluarga Teater Q");
    if (initialHash && initialHash !== "login") {
      showPage(initialHash);
    }
    try {
      const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + (window.location.hash || "");
      window.history.replaceState({ path: cleanUrl }, document.title, cleanUrl);
    } catch (e) {}
  } else if (hasValidSession) {
    isLoggedIn = true;
    if (navLoginLink) navLoginLink.textContent = "Logout";
    toggleAuthLinks(true);
    showPage(initialHash || "beranda");
  } else {
    showPage("login");
    checkGroupAccessAutoFill();
  }

  // Handle PWA Home Screen Shortcuts (misal ?pwa_nav=qreload / ?pwa_nav=anggota)
  const pwaNav = urlParams.get("pwa_nav") || urlParams.get("action");
  if (pwaNav) {
    if (pwaNav === "qreload") {
      setTimeout(() => { if (typeof openQReloadModal === "function") openQReloadModal(); }, 600);
    } else {
      setTimeout(() => { if (typeof showPage === "function") showPage(pwaNav); }, 400);
    }
  }

  // Inisialisasi & Rekam kunjungan portal (anggota/alumni)
  loadPortalVisitorStats();
  loadRekapRekrutmen();

  // Inisialisasi badge keranjang belanja
  updateCartBadge();

  // Aktifkan Smart Auto-Sync Real-time untuk Dana Abadi
  initSmartAutoSyncDana();

  // Render Marquee Donatur & Sawer Terkini
  renderMarqueeDonatur();
  renderMarqueeSawer();
});

// ============================================================================
// MODUL Q-RELOAD DIGITAL (PULSA, KUOTA, TOKEN PLN & E-WALLET TEATER Q)
// ============================================================================
let qreloadProducts = [];
let qreloadCurrentType = 'pulsa-reguler';
// Fungsi Helper MD5 murni (Zero-Dependency) untuk DigiFlazz & Provider H2H
function calculateMD5(string) {
  function md5_RotateLeft(lValue, iShiftBits) {
    return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
  }
  function md5_AddUnsigned(lX, lY) {
    var lX4, lY4, lX8, lY8, lResult;
    lX8 = lX & 0x80000000; lY8 = lY & 0x80000000;
    lX4 = lX & 0x40000000; lY4 = lY & 0x40000000;
    lResult = (lX & 0x3fffffff) + (lY & 0x3fffffff);
    if (lX4 & lY4) return lResult ^ 0x80000000 ^ lX8 ^ lY8;
    if (lX4 | lY4) {
      if (lResult & 0x40000000) return lResult ^ 0xc0000000 ^ lX8 ^ lY8;
      else return lResult ^ 0x40000000 ^ lX8 ^ lY8;
    } else return lResult ^ lX8 ^ lY8;
  }
  function md5_F(x, y, z) { return (x & y) | ((~x) & z); }
  function md5_G(x, y, z) { return (x & z) | (y & (~z)); }
  function md5_H(x, y, z) { return x ^ y ^ z; }
  function md5_I(x, y, z) { return y ^ (x | (~z)); }
  function md5_FF(a, b, c, d, x, s, ac) {
    a = md5_AddUnsigned(a, md5_AddUnsigned(md5_AddUnsigned(md5_F(b, c, d), x), ac));
    return md5_AddUnsigned(md5_RotateLeft(a, s), b);
  }
  function md5_GG(a, b, c, d, x, s, ac) {
    a = md5_AddUnsigned(a, md5_AddUnsigned(md5_AddUnsigned(md5_G(b, c, d), x), ac));
    return md5_AddUnsigned(md5_RotateLeft(a, s), b);
  }
  function md5_HH(a, b, c, d, x, s, ac) {
    a = md5_AddUnsigned(a, md5_AddUnsigned(md5_AddUnsigned(md5_H(b, c, d), x), ac));
    return md5_AddUnsigned(md5_RotateLeft(a, s), b);
  }
  function md5_II(a, b, c, d, x, s, ac) {
    a = md5_AddUnsigned(a, md5_AddUnsigned(md5_AddUnsigned(md5_I(b, c, d), x), ac));
    return md5_AddUnsigned(md5_RotateLeft(a, s), b);
  }
  function md5_ConvertToWordArray(string) {
    var lWordCount, lMessageLength = string.length;
    var lNumberOfWords_temp1 = lMessageLength + 8;
    var lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
    var lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
    var lWordArray = Array(lNumberOfWords - 1);
    var lBytePosition = 0, lByteCount = 0;
    while (lByteCount < lMessageLength) {
      lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition));
      lByteCount++;
    }
    lWordCount = (lByteCount - (lByteCount % 4)) / 4;
    lBytePosition = (lByteCount % 4) * 8;
    lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
    lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
    lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
    return lWordArray;
  }
  function md5_WordToHex(lValue) {
    var WordToHexValue = "", WordToHexValue_temp = "", lByte, lCount;
    for (lCount = 0; lCount <= 3; lCount++) {
      lByte = (lValue >>> (lCount * 8)) & 255;
      WordToHexValue_temp = "0" + lByte.toString(16);
      WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length - 2, 2);
    }
    return WordToHexValue;
  }
  var x = Array();
  var k, AA, BB, CC, DD, a, b, c, d;
  var S11 = 7, S12 = 12, S13 = 17, S14 = 22;
  var S21 = 5, S22 = 9, S23 = 14, S24 = 20;
  var S31 = 4, S32 = 11, S33 = 16, S34 = 23;
  var S41 = 6, S42 = 10, S43 = 15, S44 = 21;
  x = md5_ConvertToWordArray(string);
  a = 0x67452301; b = 0xEFCDAB89; c = 0x98BADCFE; d = 0x10325476;
  for (k = 0; k < x.length; k += 16) {
    AA = a; BB = b; CC = c; DD = d;
    a = md5_FF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
    d = md5_FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
    c = md5_FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
    b = md5_FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
    a = md5_FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
    d = md5_FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
    c = md5_FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
    b = md5_FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
    a = md5_FF(a, b, c, d, x[k + 8], S11, 0x698098D8);
    d = md5_FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
    c = md5_FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
    b = md5_FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
    a = md5_FF(a, b, c, d, x[k + 12], S11, 0x6B901122);
    d = md5_FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
    c = md5_FF(c, d, a, b, x[k + 14], S13, 0xA679438E);
    b = md5_FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
    a = md5_GG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
    d = md5_GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
    c = md5_GG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
    b = md5_GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
    a = md5_GG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
    d = md5_GG(d, a, b, c, x[k + 10], S22, 0x2441453);
    c = md5_GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
    b = md5_GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
    a = md5_GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
    d = md5_GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
    c = md5_GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
    b = md5_GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
    a = md5_GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
    d = md5_GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
    c = md5_GG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
    b = md5_GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
    a = md5_HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
    d = md5_HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
    c = md5_HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
    b = md5_HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
    a = md5_HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
    d = md5_HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
    c = md5_HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
    b = md5_HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
    a = md5_HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
    d = md5_HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
    c = md5_HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
    b = md5_HH(b, c, d, a, x[k + 6], S34, 0x4881D05);
    a = md5_HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
    d = md5_HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
    c = md5_HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
    b = md5_HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
    a = md5_II(a, b, c, d, x[k + 0], S41, 0xF4292244);
    d = md5_II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
    c = md5_II(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
    b = md5_II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
    a = md5_II(a, b, c, d, x[k + 12], S41, 0x655B59C3);
    d = md5_II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
    c = md5_II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
    b = md5_II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
    a = md5_II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
    d = md5_II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
    c = md5_II(c, d, a, b, x[k + 6], S43, 0xA3014314);
    b = md5_II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
    a = md5_II(a, b, c, d, x[k + 4], S41, 0xF7537E82);
    d = md5_II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
    c = md5_II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
    b = md5_II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
    a = md5_AddUnsigned(a, AA);
    b = md5_AddUnsigned(b, BB);
    c = md5_AddUnsigned(c, CC);
    d = md5_AddUnsigned(d, DD);
  }
  return (md5_WordToHex(a) + md5_WordToHex(b) + md5_WordToHex(c) + md5_WordToHex(d)).toLowerCase();
}

let qreloadSelectedProduct = null;
let qreloadDetectedBrand = '';

let qreloadDigiBalance = (function() {
  try {
    const digi = localStorage.getItem('teaterq_digi_balance');
    if (digi !== null && !isNaN(parseInt(digi, 10)) && parseInt(digi, 10) > 0) {
      return parseInt(digi, 10);
    }
    return 194936; // Saldo deposit Digiflazz aktif terkini
  } catch (e) { return 194936; }
})();

function isLocalNetworkEnv() {
  const h = window.location.hostname || '';
  return (
    h === '127.0.0.1' ||
    h === 'localhost' ||
    h.startsWith('192.168.') ||
    h.startsWith('10.') ||
    h.startsWith('172.') ||
    h.includes('pinggy')
  );
}

let qreloadVipBalance = (function() {
  try {
    const vip = localStorage.getItem('teaterq_vip_balance');
    return (vip !== null && !isNaN(parseInt(vip, 10)) && parseInt(vip, 10) >= 0) ? parseInt(vip, 10) : 35871;
  } catch (e) { return 35871; }
})();

let qreloadLastBalanceFetch = 0;
const QRELOAD_BALANCE_TTL = 300000; // Cache 5 menit agar kuota request Fixie tetap hemat dan tidak jebol

function formatBalanceNum(num) {
  if (num === null || isNaN(num)) return 'Rp 0';
  return 'Rp ' + Number(num).toLocaleString('id-ID');
}

let qstoreCentralProfit = (function() {
  try {
    const cp = localStorage.getItem('teaterq_central_profit');
    return (cp !== null && !isNaN(parseInt(cp, 10)) && parseInt(cp, 10) > 0) ? parseInt(cp, 10) : 8000;
  } catch(e) { return 8000; }
})();
let qstoreCentralCount = (function() {
  try {
    const cc = localStorage.getItem('teaterq_central_count');
    return (cc !== null && !isNaN(parseInt(cc, 10)) && parseInt(cc, 10) > 0) ? parseInt(cc, 10) : 4;
  } catch(e) { return 4; }
})();

async function fetchQStoreCentralProfit(forceRefresh = false) {
  try {
    const cachedProfit = localStorage.getItem('teaterq_central_profit');
    const cachedCount = localStorage.getItem('teaterq_central_count');
    if (cachedProfit !== null && !isNaN(parseInt(cachedProfit, 10))) {
      qstoreCentralProfit = parseInt(cachedProfit, 10);
      qstoreCentralCount = (cachedCount !== null && !isNaN(parseInt(cachedCount, 10))) ? parseInt(cachedCount, 10) : 0;
      updateQReloadBalanceDisplays();
    }

    const scriptUrl = (typeof SCRIPT_MARKETPLACE !== 'undefined') ? SCRIPT_MARKETPLACE : '';
    if (!scriptUrl) return;

    const res = await fetch(`${scriptUrl}?action=get_qstore_profit&t=${Date.now()}`);
    if (res.ok) {
      const json = await res.json();
      if (json && json.result === 'success') {
        qstoreCentralProfit = Number(json.totalProfit) || 0;
        qstoreCentralCount = Number(json.count) || 0;
        try {
          localStorage.setItem('teaterq_central_profit', qstoreCentralProfit.toString());
          localStorage.setItem('teaterq_central_count', qstoreCentralCount.toString());
        } catch(e){}
        updateQReloadBalanceDisplays();
      }
    }
  } catch (err) {
    console.warn('Gagal memuat total laba pusat Q-Store:', err);
  }
}

function updateQReloadBalanceDisplays() {
  const elPortal = document.getElementById('portalQReloadBalanceText');
  const elModal = document.getElementById('modalQReloadBalanceText');
  const elModalBody = document.getElementById('modalQReloadBalanceBodyText');
  const elLabaBody = document.getElementById('modalQReloadLabaBodyText');

  const savedBal = localStorage.getItem('teaterq_vip_balance');
  const currentBal = (qreloadVipBalance !== null) ? qreloadVipBalance : (savedBal ? parseInt(savedBal, 10) : null);
  const strVip = (currentBal !== null && !isNaN(currentBal)) ? formatBalanceNum(currentBal) : 'Memuat Saldo...';

  const badgeHtml = `<span class="inline-flex items-center gap-1 text-sky-300 font-bold"><i class="fas fa-coins text-amber-400"></i> Saldo: <span class="font-mono text-white">${strVip}</span></span>`;
  const badgeBodyHtml = `Saldo: <span class="text-white font-bold">${strVip}</span>`;

  if (elPortal) elPortal.innerHTML = badgeHtml;
  if (elModal) elModal.innerHTML = badgeHtml;
  if (elModalBody) elModalBody.innerHTML = badgeBodyHtml;

  // Update badge laba kas di samping saldo: SELALU menampilkan total laba akumulasi dari seluruh transaksi (bukan per produk)
  if (elLabaBody) {
    const displayProfit = (qstoreCentralProfit > 0)
      ? qstoreCentralProfit
      : ((typeof getQReloadTotalProfit === 'function') ? getQReloadTotalProfit() : 0);
    elLabaBody.innerHTML = `Total Laba: <span class="text-white font-bold">${formatRupiah(displayProfit)}</span>`;
    if (elLabaBody.parentElement) {
      elLabaBody.parentElement.title = `Total laba terkumpul dari seluruh transaksi kas Teater Q: ${formatRupiah(displayProfit)} (${qstoreCentralCount} transaksi tercatat)`;
    }
  }

  const elShopeeHubLaba = document.getElementById('shopeeHubLabaText');
  if (elShopeeHubLaba) {
    const displayProfit = (qstoreCentralProfit > 0)
      ? qstoreCentralProfit
      : ((typeof getQReloadTotalProfit === 'function') ? getQReloadTotalProfit() : 0);
    elShopeeHubLaba.textContent = formatRupiah(displayProfit);
  }

  const elShopeeHubSaldo = document.getElementById('shopeeHubSaldoText');
  if (elShopeeHubSaldo) {
    elShopeeHubSaldo.textContent = strVip;
  }
}

async function fetchDigiBalance() {
  const isVipProvider = (typeof QRELOAD_CONFIG !== 'undefined' && QRELOAD_CONFIG.provider === 'vip');
  const isLocalHost = (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost');

  // Jika provider utama adalah VIP Reseller atau di localhost tanpa backend proxy, gunakan saldo tersimpan Rp 991 tanpa spam CORS console
  if (isVipProvider || isLocalHost) {
    if (qreloadDigiBalance === null || isNaN(qreloadDigiBalance)) {
      try {
        const saved = localStorage.getItem('teaterq_digi_balance');
        qreloadDigiBalance = (saved && !isNaN(parseInt(saved, 10))) ? parseInt(saved, 10) : 991;
      } catch(e) {
        qreloadDigiBalance = 991;
      }
    }
    updateQReloadBalanceDisplays();
    return qreloadDigiBalance;
  }

  const username = (typeof QRELOAD_CONFIG !== 'undefined' && QRELOAD_CONFIG.username) || 'hicinug9pNNW';
  const apiKey = (typeof QRELOAD_CONFIG !== 'undefined' && QRELOAD_CONFIG.apiKey) || 'd38444ae-c411-535d-b29a-53e3c6526db2';
  const sign = calculateMD5(username + apiKey + 'depo');

  const payload = JSON.stringify({
    cmd: 'deposit',
    username: username,
    sign: sign
  });

  const endpoints = isLocalHost 
    ? ['https://portalanggota.netlify.app/api-digi/cek-saldo', 'https://api.digiflazz.com/v1/cek-saldo']
    : ['/api-digi/cek-saldo', 'https://api.digiflazz.com/v1/cek-saldo', 'https://portalanggota.netlify.app/api-digi/cek-saldo'];

  for (const ep of endpoints) {
    try {
      const resp = await fetch(ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload
      });
      if (resp.ok) {
        const res = await resp.json();
        if (res && res.data && typeof res.data.deposit !== 'undefined') {
          qreloadDigiBalance = parseInt(res.data.deposit, 10);
          try { localStorage.setItem('teaterq_digi_balance', qreloadDigiBalance.toString()); } catch(e){}
          updateQReloadBalanceDisplays();
          return qreloadDigiBalance;
        }
      }
    } catch (e) {}
  }

  // Fallback sinkronisasi deposit riil jika di browser localhost terhambat CORS
  if (qreloadDigiBalance === null || isNaN(qreloadDigiBalance) || qreloadDigiBalance <= 0) {
    try {
      const saved = localStorage.getItem('teaterq_digi_balance');
      if (saved && !isNaN(parseInt(saved, 10)) && parseInt(saved, 10) > 0) {
        qreloadDigiBalance = parseInt(saved, 10);
      } else {
        qreloadDigiBalance = 991; // Sisa saldo live riil DigiFlazz Rp 991
        localStorage.setItem('teaterq_digi_balance', '991');
      }
    } catch(e) {
      qreloadDigiBalance = 991;
    }
  }
  updateQReloadBalanceDisplays();
  return qreloadDigiBalance;
}

async function fetchVipBalance() {
  const vipKey = (typeof QRELOAD_CONFIG !== 'undefined' && QRELOAD_CONFIG.vipApiKey) || 'yRVpjMIge62BmjuBL4KfpfQxF5y4ZV3dhSNtrLeB6Bpj1gN6r9Hyhs2ybUgfyiYg';
  const vipSign = (typeof QRELOAD_CONFIG !== 'undefined' && QRELOAD_CONFIG.vipSign) || '9cd98abdf2bb6f55fddeb3f1094ff6ee';

  const body = new URLSearchParams();
  body.append('key', vipKey);
  body.append('sign', vipSign);
  body.append('type', 'profile');

  const isLocal = isLocalNetworkEnv();
  const endpoints = isLocal
    ? ['/api-vip-proxy', 'https://portalanggota.netlify.app/api-vip/profile', 'https://portalanggota.netlify.app/api-vip-proxy']
    : ['/api-vip/profile', '/api-vip-proxy', '/.netlify/functions/vip-order', 'https://portalanggota.netlify.app/api-vip-proxy'];

  for (const ep of endpoints) {
    try {
      const resp = await fetch(ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body
      });
      if (resp.ok) {
        const res = await resp.json();
        if (res && res.result && res.data && typeof res.data.balance !== 'undefined') {
          qreloadVipBalance = parseInt(res.data.balance, 10);
          try { localStorage.setItem('teaterq_vip_balance', qreloadVipBalance.toString()); } catch(e){}
          updateQReloadBalanceDisplays();
          return qreloadVipBalance;
        }
      }
    } catch (e) {}
  }

  // Fallback sinkronisasi jika network HP sedang lambat/terkendala
  if (qreloadVipBalance === null || isNaN(qreloadVipBalance) || qreloadVipBalance <= 0) {
    try {
      const saved = localStorage.getItem('teaterq_vip_balance');
      if (saved && !isNaN(parseInt(saved, 10)) && parseInt(saved, 10) > 0) {
        qreloadVipBalance = parseInt(saved, 10);
      } else {
        qreloadVipBalance = 0;
      }
    } catch(e) {
      qreloadVipBalance = 0;
    }
  }
  updateQReloadBalanceDisplays();
  return qreloadVipBalance;
}

async function fetchVipBalanceBackground(force = false) {
  const now = Date.now();
  if (!force && (now - qreloadLastBalanceFetch < QRELOAD_BALANCE_TTL)) {
    updateQReloadBalanceDisplays();
    return;
  }
  qreloadLastBalanceFetch = now;

  const isDigiProvider = (typeof QRELOAD_CONFIG !== 'undefined' && QRELOAD_CONFIG.provider === 'digiflazz');
  if (isDigiProvider) {
    await Promise.allSettled([fetchDigiBalance(), fetchVipBalance()]);
  } else {
    // Mode VIP Reseller aktif (default utama)
    await fetchVipBalance();
    if (qreloadDigiBalance === null) {
      await fetchDigiBalance();
    }
  }

  updateQReloadBalanceDisplays();
  const modal = document.getElementById('qreloadModal');
  if (modal && !modal.classList.contains('hidden')) {
    renderQReloadProducts();
    updateQReloadStockUI();
  }
}

function updateQReloadStockUI() {
  if (!qreloadSelectedProduct) return;
  const rawPrice = qreloadSelectedProduct.price.basic || 0;
  
  // Stok tersedia jika provider DigiFlazz ATAU VIP Reseller memiliki saldo >= rawPrice
  const hasDigi = (qreloadDigiBalance !== null && qreloadDigiBalance >= rawPrice);
  const hasVip = (qreloadVipBalance !== null && qreloadVipBalance >= rawPrice);
  const isOutOfStock = (qreloadDigiBalance !== null || qreloadVipBalance !== null) && !hasDigi && !hasVip;

  const warnEl = document.getElementById('qreloadStockWarning');
  const paySection = document.getElementById('qreloadPaymentSection');
  const submitBtn = document.getElementById('btnSubmitQReload');

  if (isOutOfStock) {
    if (warnEl) warnEl.classList.remove('hidden');
    if (paySection) paySection.classList.add('hidden');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.className = "w-full py-3 bg-slate-800 text-slate-500 font-extrabold text-xs rounded-xl cursor-not-allowed flex items-center justify-center gap-2";
      submitBtn.innerHTML = '<i class="fas fa-ban"></i> Kuota / Saldo Habis (Tidak Dapat Membeli)';
    }
  } else {
    if (warnEl) warnEl.classList.add('hidden');
    if (paySection) paySection.classList.remove('hidden');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.className = "w-full py-3 bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all";
      submitBtn.innerHTML = '<i class="fas fa-check-circle text-sm"></i> Konfirmasi &amp; Kirim Bukti Bayar';
    }
  }
}

function getQReloadMarkup(rawPrice) {
  if (typeof QRELOAD_CONFIG !== 'undefined' && typeof QRELOAD_CONFIG.getMarkup === 'function') {
    return QRELOAD_CONFIG.getMarkup(rawPrice);
  }
  const price = Number(rawPrice) || 0;
  if (price >= 95000) return 20000;
  if (price >= 76000) return 15000;
  if (price >= 48500) return 10000;
  if (price >= 22000) return 5000;
  return 2000;
}

// ============================================================================
// SHOPEE-STYLE 1-KLIK SERVICE ROUTER
// ============================================================================
function openShopeeService(service) {
  switch (service) {
    case 'pulsa':
      openModalQReload();
      switchQReloadTab('pulsa-reguler');
      break;
    case 'data':
      openModalQReload();
      switchQReloadTab('paket-internet');
      break;
    case 'pln':
      openModalQReload();
      switchQReloadTab('token-pln');
      break;
    case 'emoney':
      openModalQReload();
      switchQReloadTab('saldo-emoney');
      break;
    case 'game':
      openModalQReload();
      switchQReloadTab('voucher-game');
      break;
    case 'streaming':
      openModalQReload();
      switchQReloadTab('streaming-tv');
      break;
    case 'tiket':
      if (typeof openModalBeliTiket === 'function') {
        openModalBeliTiket();
      } else {
        scrollToSection('target-tiket');
      }
      break;
    case 'market':
    case 'merchandise':
      showPage('marketplace');
      if (typeof filterMarketplaceByCategory === 'function') {
        setTimeout(() => filterMarketplaceByCategory('merchandise'), 150);
      }
      break;
    case 'lapak':
      showPage('marketplace');
      if (typeof openModalBukaLapak === 'function') {
        setTimeout(() => openModalBukaLapak(), 150);
      }
      break;
    case 'pasar':
      showPage('marketplace');
      if (typeof filterMarketplaceByCategory === 'function') {
        setTimeout(() => filterMarketplaceByCategory('all'), 150);
      }
      break;
    case 'dana':
      showPage('beranda');
      setTimeout(() => scrollToSection('target-dana'), 150);
      break;
    default:
      openModalQReload();
      break;
  }
}

const POPULAR_GAMES_AND_STREAMING = [
  // MOBILE LEGENDS
  { code: "ML86", brand: "MOBILE LEGENDS", name: "86 Diamonds MLBB", note: "Proses Cepat via User ID & Zone ID", price: { basic: 19500 }, status: "available", type: "voucher-game" },
  { code: "ML172", brand: "MOBILE LEGENDS", name: "172 Diamonds MLBB", note: "Proses Cepat via User ID & Zone ID", price: { basic: 39000 }, status: "available", type: "voucher-game" },
  { code: "ML257", brand: "MOBILE LEGENDS", name: "257 Diamonds MLBB", note: "Proses Cepat via User ID & Zone ID", price: { basic: 58500 }, status: "available", type: "voucher-game" },
  { code: "MLSTAR", brand: "MOBILE LEGENDS", name: "Starlight Member MLBB", note: "Aktivasi Starlight Bulanan", price: { basic: 145000 }, status: "available", type: "voucher-game" },
  
  // FREE FIRE
  { code: "FF70", brand: "FREE FIRE", name: "70 Diamonds Free Fire", note: "Cukup masukkan Player ID FF", price: { basic: 9500 }, status: "available", type: "voucher-game" },
  { code: "FF140", brand: "FREE FIRE", name: "140 Diamonds Free Fire", note: "Cukup masukkan Player ID FF", price: { basic: 19000 }, status: "available", type: "voucher-game" },
  { code: "FF355", brand: "FREE FIRE", name: "355 Diamonds Free Fire", note: "Cukup masukkan Player ID FF", price: { basic: 47500 }, status: "available", type: "voucher-game" },
  
  // PUBG MOBILE
  { code: "PUBG60", brand: "PUBG MOBILE", name: "60 UC PUBG Mobile", note: "Top-up instan via Player ID", price: { basic: 14500 }, status: "available", type: "voucher-game" },
  { code: "PUBG325", brand: "PUBG MOBILE", name: "325 UC PUBG Mobile", note: "Top-up instan via Player ID", price: { basic: 72000 }, status: "available", type: "voucher-game" },
  
  // ROBLOX & STEAM
  { code: "ROBUX80", brand: "ROBLOX", name: "80 Robux Digital Voucher", note: "Kode voucher digital", price: { basic: 16000 }, status: "available", type: "voucher-game" },
  { code: "STEAM12", brand: "STEAM WALLET", name: "Steam Wallet IDR 12.000", note: "Kode voucher Steam Indonesia", price: { basic: 13500 }, status: "available", type: "voucher-game" },
  { code: "STEAM45", brand: "STEAM WALLET", name: "Steam Wallet IDR 45.000", note: "Kode voucher Steam Indonesia", price: { basic: 49000 }, status: "available", type: "voucher-game" },
  
  // STREAMING & TV
  { code: "SPOTIFY1M", brand: "SPOTIFY", name: "Spotify Premium Individual 1 Bulan", note: "Kode voucher resmi Spotify", price: { basic: 54990 }, status: "available", type: "streaming-tv" },
  { code: "VIDIO30D", brand: "VIDIO", name: "Vidio Platinum All Screen 30 Hari", note: "Akses film & olahraga Vidio", price: { basic: 39000 }, status: "available", type: "streaming-tv" },
  { code: "NETFLIX1M", brand: "NETFLIX", name: "Netflix Premium Ultra HD 1 Bulan", note: "Voucher / Akun streaming resmi", price: { basic: 186000 }, status: "available", type: "streaming-tv" },
  { code: "YOUTUBE1M", brand: "YOUTUBE", name: "YouTube Premium 1 Bulan Bebas Iklan", note: "Bebas iklan + YouTube Music", price: { basic: 49000 }, status: "available", type: "streaming-tv" }
];

async function loadQReloadProducts() {
  if (qreloadProducts.length > 0) return qreloadProducts;
  try {
    const resp = await fetch('data/qreload_services.json?v=20260909');
    if (resp.ok) {
      qreloadProducts = await resp.json();
    }
  } catch (e) {
    console.warn('Gagal memuat produk Q-Reload:', e);
  }

  // Gabungkan voucher game dan streaming jika belum ada
  if (Array.isArray(qreloadProducts)) {
    const hasGame = qreloadProducts.some(p => p.type === 'voucher-game');
    if (!hasGame) {
      qreloadProducts = qreloadProducts.concat(POPULAR_GAMES_AND_STREAMING);
    }
  }

  return qreloadProducts;
}

function openModalQReload() {
  const modal = document.getElementById('qreloadModal');
  if (!modal) return;
  const mBody = document.getElementById('qreloadModalBody');
  const dRec = document.getElementById('qreloadDirectReceipt');
  const hView = document.getElementById('qreloadHistoryView');
  if (mBody) mBody.classList.remove('hidden');
  if (dRec) dRec.classList.add('hidden');
  if (hView) hView.classList.add('hidden');

  if (typeof switchQReloadMainView === 'function') switchQReloadMainView('shop');
  if (typeof updateQReloadHistoryBadge === 'function') updateQReloadHistoryBadge();
  if (typeof backToQReloadCatalog === 'function') backToQReloadCatalog();

  modal.removeAttribute("aria-hidden");
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  modal.classList.remove('closing');
  modal.classList.add('opening');
  requestAnimationFrame(() => {
    modal.classList.remove('opacity-0');
  });
  document.body.style.overflow = 'hidden';

  if (typeof updateQReloadBalanceDisplays === 'function') updateQReloadBalanceDisplays();

  // Enforce Maintenance Mode untuk Topup
  const phoneInput = document.getElementById('qreloadPhoneInput');
  const mBanner = document.getElementById('qreloadMaintenanceBanner');
  const isMaint = (typeof QRELOAD_CONFIG !== 'undefined' && QRELOAD_CONFIG.maintenanceMode);
  if (mBanner) {
    if (isMaint) mBanner.classList.remove('hidden');
    else mBanner.classList.add('hidden');
  }
  if (phoneInput) {
    if (isMaint) {
      phoneInput.disabled = true;
      phoneInput.readOnly = true;
      phoneInput.value = '';
      phoneInput.placeholder = 'Pengisian nomor dinonaktifkan (Kendala Teknis)';
    } else {
      phoneInput.disabled = false;
      phoneInput.readOnly = false;
      if (phoneInput.placeholder.includes('dinonaktifkan')) {
        phoneInput.placeholder = 'Contoh: 081234567890';
      }
    }
  }

  loadQReloadProducts().then(() => {
    renderQReloadProducts();
  });
  // Force fresh background balance & central profit check
  fetchVipBalanceBackground(true);
  if (typeof fetchQStoreCentralProfit === 'function') fetchQStoreCentralProfit(true);
}

function closeModalQReload() {
  const modal = document.getElementById('qreloadModal');
  if (!modal) return;
  modal.classList.add('closing');
  modal.classList.remove('opening');
  modal.classList.add('opacity-0');
  setTimeout(() => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = '';
  }, 200);
}

function switchQReloadTab(type) {
  qreloadCurrentType = type;
  const tabs = ['pulsa-reguler', 'paket-internet', 'token-pln', 'saldo-emoney', 'voucher-game', 'streaming-tv'];
  const activeClass = 'py-2 px-1 rounded-xl text-[11px] sm:text-xs font-black transition-all flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/50 ring-2 ring-emerald-400 border border-emerald-300/40 active:scale-95 select-none cursor-pointer';
  const inactiveClass = 'py-2 px-1 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 bg-slate-800/90 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/80 shadow-sm active:scale-95 active:bg-slate-700 select-none cursor-pointer';

  tabs.forEach(t => {
    const btn = document.getElementById('qtab-' + t);
    if (!btn) return;
    if (t === type) {
      btn.className = activeClass;
    } else {
      btn.className = inactiveClass;
    }
  });

  if (typeof backToQReloadCatalog === 'function') backToQReloadCatalog();
  qreloadSelectedProduct = null;

  const stickyPrice = document.getElementById('qreloadStickyPrice');
  const stickyLaba = document.getElementById('qreloadStickyLaba');
  const stickyBtn = document.getElementById('btnQReloadStickyContinue');
  if (stickyPrice) stickyPrice.textContent = 'Rp 0';
  if (stickyLaba) stickyLaba.textContent = 'Pilih nominal di atas';
  if (stickyBtn) {
    stickyBtn.disabled = true;
    stickyBtn.className = "py-2.5 px-4 bg-slate-800 text-slate-500 font-bold text-xs sm:text-sm rounded-xl flex items-center gap-1.5 cursor-not-allowed transition-all";
    stickyBtn.innerHTML = '<span>Lanjut Bayar</span> <i class="fas fa-chevron-right text-xs"></i>';
  }

  const plnHint = document.getElementById('qreloadPlnHint');
  if (plnHint) {
    if (type === 'token-pln') plnHint.classList.remove('hidden');
    else plnHint.classList.add('hidden');
  }

  const ewalletNotice = document.getElementById('qreloadEwalletNotice');
  if (ewalletNotice) {
    if (type === 'saldo-emoney') {
      ewalletNotice.classList.remove('hidden');
    } else {
      ewalletNotice.classList.add('hidden');
    }
  }

  // Sesuaikan Label Input Nomor / ID
  const inputLabel = document.getElementById('qreloadPhoneInputLabel') || document.querySelector('label[for="qreloadPhoneInput"]');
  const phoneInput = document.getElementById('qreloadPhoneInput');
  if (inputLabel) {
    if (type === 'voucher-game') {
      inputLabel.innerHTML = '<i class="fas fa-gamepad text-purple-400 text-sm"></i> User ID / Zone ID Game';
      if (phoneInput) phoneInput.placeholder = 'Contoh: 12345678 (Zone 1234)';
    } else if (type === 'token-pln') {
      inputLabel.innerHTML = '<i class="fas fa-bolt text-amber-400 text-sm"></i> Nomor Meteran / ID Pelanggan PLN';
      if (phoneInput) phoneInput.placeholder = 'Contoh: 14xxxxxxxxxx / 53xxxxxxxxxx';
    } else if (type === 'streaming-tv') {
      inputLabel.innerHTML = '<i class="fas fa-film text-rose-400 text-sm"></i> Nomor HP / ID Akun Streaming';
      if (phoneInput) phoneInput.placeholder = '08xxxxxxxxxx / Email Akun';
    } else {
      inputLabel.innerHTML = '<i class="fas fa-sim-card text-emerald-400 text-sm"></i> Nomor HP Tujuan';
      if (phoneInput) phoneInput.placeholder = '08xxxxxxxxxx';
    }
  }

  if (phoneInput && phoneInput.value && type !== 'voucher-game' && type !== 'streaming-tv') {
    handleQReloadPhoneInput(phoneInput.value);
  } else {
    renderQReloadProducts();
  }
}

function detectOperator(phone) {
  if (!phone || phone.length < 4) return '';
  let clean = phone.replace(/[^0-9]/g, '');
  if (clean.startsWith('62')) clean = '0' + clean.slice(2);
  const prefix4 = clean.slice(0, 4);

  // Telkomsel: 0811, 0812, 0813, 0821, 0822, 0823, 0852, 0853, 0851
  if (['0811', '0812', '0813', '0821', '0822', '0823', '0852', '0853', '0851'].includes(prefix4)) {
    return prefix4 === '0851' ? 'BY.U' : 'TELKOMSEL';
  }
  // Indosat: 0814, 0815, 0816, 0855, 0856, 0857, 0858
  if (['0814', '0815', '0816', '0855', '0856', '0857', '0858'].includes(prefix4)) {
    return 'INDOSAT';
  }
  // XL: 0817, 0818, 0819, 0859, 0877, 0878
  if (['0817', '0818', '0819', '0859', '0877', '0878'].includes(prefix4)) {
    return 'XL';
  }
  // AXIS: 0831, 0832, 0833, 0838
  if (['0831', '0832', '0833', '0838'].includes(prefix4)) {
    return 'AXIS';
  }
  // TRI: 0895, 0896, 0897, 0898, 0899
  if (['0895', '0896', '0897', '0898', '0899'].includes(prefix4)) {
    return 'TRI';
  }
  // SMARTFREN: 0881, 0882, 0883, 0884, 0885, 0886, 0887, 0888, 0889
  if (['0881', '0882', '0883', '0884', '0885', '0886', '0887', '0888', '0889'].includes(prefix4)) {
    return 'SMARTFREN';
  }
  return '';
}

let qreloadPhoneDebounce = null;
function handleQReloadPhoneInput(val) {
  if (typeof QRELOAD_CONFIG !== 'undefined' && QRELOAD_CONFIG.maintenanceMode) {
    return;
  }
  const brandBadge = document.getElementById('qreloadOperatorBadge');
  const brandLogo = document.getElementById('qreloadBrandLogo');

  const oldBrand = qreloadDetectedBrand;

  if (qreloadCurrentType === 'token-pln') {
    qreloadDetectedBrand = 'PLN';
    if (brandBadge) {
      brandBadge.textContent = 'PLN PRABAYAR';
      brandBadge.classList.remove('hidden');
    }
    if (brandLogo) brandLogo.textContent = '⚡ PLN';
  } else if (qreloadCurrentType === 'saldo-emoney') {
    qreloadDetectedBrand = '';
    if (brandBadge) brandBadge.classList.add('hidden');
    if (brandLogo) brandLogo.textContent = 'E-Wallet';
  } else {
    const op = detectOperator(val);
    qreloadDetectedBrand = op;
    if (op) {
      if (brandBadge) {
        brandBadge.textContent = op;
        brandBadge.classList.remove('hidden');
      }
      if (brandLogo) brandLogo.textContent = op;
    } else {
      if (brandBadge) brandBadge.classList.add('hidden');
      if (brandLogo) brandLogo.textContent = 'Auto Detect';
    }
  }

  // Jika brand sama dan panjang nomor > 4, jangan rombak DOM agar ketikan di HP mulus 60 FPS tanpa jeda
  if (oldBrand === qreloadDetectedBrand && (val || '').length > 4) {
    return;
  }

  clearTimeout(qreloadPhoneDebounce);
  qreloadPhoneDebounce = setTimeout(() => {
    renderQReloadProducts();
  }, 120);
}

function renderQReloadProducts() {
  const container = document.getElementById('qreloadProductList');
  const countEl = document.getElementById('qreloadCountProducts');
  if (!container) return;

  // Kategori E-Wallet: Server pusat VIP Reseller saat ini sedang mengalami gangguan teknis
  if (qreloadCurrentType === 'saldo-emoney') {
    if (countEl) countEl.textContent = 'Pemeliharaan Server VIP';
    container.innerHTML = `
      <div class="col-span-2 text-center py-7 px-4 bg-slate-950/80 rounded-2xl border border-amber-500/30 space-y-2.5">
        <div class="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xl shadow-inner">
          <i class="fas fa-screwdriver-wrench"></i>
        </div>
        <div>
          <h4 class="text-xs font-extrabold text-amber-300 uppercase tracking-wide">Layanan E-Wallet Sedang Pemeliharaan (Server VIP)</h4>
          <p class="text-[10px] text-slate-300 max-w-sm mx-auto mt-1 leading-relaxed">
            Jalur pengisian E-Wallet (DANA, ShopeePay, OVO, GoPay) dari server pusat VIP Reseller saat ini sedang mengalami gangguan teknis. Layanan otomatis dibuka kembali setelah server VIP pulih.
          </p>
        </div>
        <div class="pt-2 flex items-center justify-center gap-2">
          <button type="button" onclick="switchQReloadTab('pulsa-reguler')" class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md active:scale-95">
            <i class="fas fa-mobile-screen-button"></i> Beli Pulsa
          </button>
          <button type="button" onclick="switchQReloadTab('token-pln')" class="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md active:scale-95">
            <i class="fas fa-bolt"></i> Token PLN
          </button>
        </div>
      </div>
    `;
    return;
  }

  if (typeof QRELOAD_CONFIG !== 'undefined' && QRELOAD_CONFIG.maintenanceMode) {
    if (countEl) countEl.textContent = 'Nonaktif Sementara';
    container.innerHTML = `
      <div class="col-span-2 text-center py-7 text-slate-400 text-xs sm:text-sm bg-slate-950/60 rounded-2xl border border-slate-800/80 p-5 space-y-2">
        <div class="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto text-lg">
          <i class="fas fa-wrench"></i>
        </div>
        <div class="font-bold text-slate-200 text-sm">Layanan Topup Dinonaktifkan Sementara</div>
        <p class="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
          Fitur transaksi pulsa &amp; kuota sedang disiapkan tim teknis. Silakan nikmati menu <strong>Q-Drive (Arsip Naskah)</strong>, <strong>KTA Digital</strong>, dan <strong>Merchandise Anggota</strong>.
        </p>
      </div>
    `;
    return;
  }

  if (!qreloadProducts || qreloadProducts.length === 0) {
    container.innerHTML = '<div class="col-span-2 text-center py-6 text-slate-500">Memuat katalog layanan...</div>';
    return;
  }

  let filtered = qreloadProducts.filter(p => p.type === qreloadCurrentType && p.status === 'available');

  const isNoBrandRequired = (qreloadCurrentType === 'voucher-game' || qreloadCurrentType === 'streaming-tv' || qreloadCurrentType === 'token-pln');

  if (qreloadDetectedBrand && !isNoBrandRequired) {
    filtered = filtered.filter(p => p.brand.toUpperCase() === qreloadDetectedBrand.toUpperCase());
  }

  if (countEl) {
    countEl.textContent = `${filtered.length} Pilihan Tersedia`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-2 text-center py-6 text-slate-500 text-xs bg-slate-950/60 rounded-xl border border-slate-800 p-4">
        <i class="fas fa-info-circle text-amber-400 text-lg mb-1 block"></i>
        ${qreloadDetectedBrand ? `Tidak ada produk untuk ${qreloadDetectedBrand} pada kategori ini.` : 'Masukkan nomor tujuan / ID Pelanggan di atas untuk melihat pilihan.'}
      </div>
    `;
    return;
  }

  // Sort by price ascending
  filtered.sort((a, b) => (a.price.basic || 0) - (b.price.basic || 0));

  container.innerHTML = filtered.slice(0, 36).map(item => {
    const rawPrice = item.price.basic || 0;
    const markup = getQReloadMarkup(rawPrice);
    const finalPrice = rawPrice + markup;
    const isSelected = qreloadSelectedProduct && qreloadSelectedProduct.code === item.code;
    const isOutOfStock = (qreloadVipBalance !== null && qreloadVipBalance < rawPrice);

    return `
      <div onclick="selectQReloadProduct('${escapeHtml(item.code)}')" class="qreload-product-card ${isSelected ? 'qreload-product-selected' : ''} cursor-pointer p-3 sm:p-3.5 rounded-2xl border-2 transition-all text-left flex flex-col justify-between relative shadow-sm active:scale-95 active:border-emerald-500 select-none ${isSelected ? 'bg-gradient-to-br from-emerald-950/90 via-slate-900 to-slate-950 border-emerald-400 ring-2 ring-emerald-400/50 shadow-lg shadow-emerald-950/60 transform scale-[1.01]' : isOutOfStock ? 'bg-slate-900/40 border-red-900/40 opacity-70' : 'bg-slate-900/95 border-slate-800 hover:border-slate-700 active:bg-slate-850'}">
        ${isSelected ? '<span class="qreload-check-badge absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center text-[10px] font-black shadow-md"><i class="fas fa-check"></i></span>' : ''}
        <div>
          <div class="flex items-center gap-1.5 mb-1">
            <span class="qreload-brand-badge text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md ${isOutOfStock ? 'bg-red-950/80 text-red-300 border border-red-800/40' : 'bg-slate-800 text-slate-300 border border-slate-700'}">${escapeHtml(item.brand)}</span>
            ${isOutOfStock ? '<span class="text-[10px] text-red-400 font-bold">Habis</span>' : ''}
          </div>
          <h5 class="text-sm sm:text-base font-black text-white leading-tight line-clamp-2">${escapeHtml(item.name)}</h5>
          ${item.note ? `<p class="qreload-item-note text-[11px] text-slate-400 mt-1 line-clamp-1">${escapeHtml(item.note)}</p>` : ''}
        </div>
        <div class="qreload-item-footer mt-2.5 pt-2 border-t border-slate-800/70 flex items-baseline justify-between">
          <span class="text-[11px] text-slate-400 font-medium">Harga</span>
          <span class="text-sm sm:text-base font-black ${isOutOfStock ? 'text-slate-500 line-through' : 'text-amber-400'}">${formatRupiah(finalPrice)}</span>
        </div>
      </div>
    `;
  }).join('');
}

function selectQReloadProduct(code) {
  if (typeof QRELOAD_CONFIG !== 'undefined' && QRELOAD_CONFIG.maintenanceMode) {
    if (typeof showToast === 'function') {
      showToast('Fitur Topup sedang dalam kendala teknis / pemeliharaan.', 'warning');
    }
    return;
  }
  const item = qreloadProducts.find(p => p.code === code);
  if (!item) return;

  qreloadSelectedProduct = item;
  renderQReloadProducts();

  const rawPrice = item.price.basic || 0;
  const markup = getQReloadMarkup(rawPrice);
  const finalPrice = rawPrice + markup;

  const nameEl = document.getElementById('qreloadChosenName');
  const descEl = document.getElementById('qreloadChosenDesc');
  const priceEl = document.getElementById('qreloadChosenPrice');
  const labaEl = document.getElementById('qreloadChosenLaba');

  if (nameEl) nameEl.textContent = `${item.brand} - ${item.name}`;
  if (descEl) descEl.textContent = item.note || `Layanan ${item.brand} otomatis aktif`;
  if (priceEl) priceEl.textContent = formatRupiah(finalPrice);
  if (labaEl) labaEl.textContent = `+${formatRupiah(markup)}`;

  // Update Shopee Sticky Bottom Bar
  const stickyPrice = document.getElementById('qreloadStickyPrice');
  const stickyLaba = document.getElementById('qreloadStickyLaba');
  const stickyBtn = document.getElementById('btnQReloadStickyContinue');

  if (stickyPrice) stickyPrice.textContent = formatRupiah(finalPrice);
  if (stickyLaba) stickyLaba.textContent = `+Laba Kas ${formatRupiah(markup)}`;
  if (stickyBtn) {
    stickyBtn.disabled = false;
    stickyBtn.className = "py-2.5 px-5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer";
    stickyBtn.innerHTML = '<span>Lanjut Bayar</span> <i class="fas fa-chevron-right text-xs"></i>';
  }

  updateQReloadStockUI();
}

function goToQReloadCheckout() {
  const phoneInput = document.getElementById('qreloadPhoneInput');
  const targetPhone = (phoneInput ? phoneInput.value : '').trim();

  if (!targetPhone || targetPhone.length < 9) {
    showToast('Masukkan nomor HP / ID Pelanggan yang valid terlebih dahulu!', 'error');
    if (phoneInput) phoneInput.focus();
    return;
  }

  if (!qreloadSelectedProduct) {
    showToast('Pilih salah satu nominal pulsa/data terlebih dahulu!', 'error');
    return;
  }

  const catView = document.getElementById('qreloadCatalogView');
  const chkBox = document.getElementById('qreloadCheckoutBox');
  const stickyBar = document.getElementById('qreloadStickyBar');

  if (catView) catView.classList.add('hidden');
  if (stickyBar) stickyBar.classList.add('hidden');
  if (chkBox) {
    chkBox.classList.remove('hidden');
    const scrollContainer = document.getElementById('qreloadModalBody');
    if (scrollContainer) scrollContainer.scrollTop = 0;
  }
}

function backToQReloadCatalog() {
  const catView = document.getElementById('qreloadCatalogView');
  const chkBox = document.getElementById('qreloadCheckoutBox');
  const stickyBar = document.getElementById('qreloadStickyBar');

  if (chkBox) chkBox.classList.add('hidden');
  if (catView) catView.classList.remove('hidden');
  if (stickyBar) stickyBar.classList.remove('hidden');
}

function switchQReloadPayTab(method) {
  const tabQris = document.getElementById('qtab-pay-qris');
  const tabBank = document.getElementById('qtab-pay-bank');
  const panelQris = document.getElementById('qreloadPanelQris');
  const panelBank = document.getElementById('qreloadPanelBank');

  if (method === 'qris') {
    if (tabQris) tabQris.className = 'py-2 px-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white flex items-center justify-center gap-1.5 shadow-sm';
    if (tabBank) tabBank.className = 'py-2 px-2.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center gap-1.5';
    if (panelQris) panelQris.classList.remove('hidden');
    if (panelBank) panelBank.classList.add('hidden');
  } else {
    if (tabBank) tabBank.className = 'py-2 px-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white flex items-center justify-center gap-1.5 shadow-sm';
    if (tabQris) tabQris.className = 'py-2 px-2.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center gap-1.5';
    if (panelBank) panelBank.classList.remove('hidden');
    if (panelQris) panelQris.classList.add('hidden');
  }
}

let qreloadReceiptBase64 = '';

function previewQReloadReceipt(input) {
  if (!input || !input.files || !input.files[0]) return;
  const file = input.files[0];
  const label = document.getElementById('qreloadReceiptLabel');
  const previewBox = document.getElementById('qreloadReceiptPreviewBox');
  const imgEl = document.getElementById('qreloadReceiptImg');

  if (file.size > 5 * 1024 * 1024) {
    showToast('Ukuran file maksimal 5MB!', 'error');
    input.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const rawData = e.target.result;
    // Kompresi ringan gambar
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const maxW = 800;
      let w = img.width;
      let h = img.height;
      if (w > maxW) {
        h = Math.round((h * maxW) / w);
        w = maxW;
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      qreloadReceiptBase64 = canvas.toDataURL('image/jpeg', 0.7);

      if (imgEl) imgEl.src = qreloadReceiptBase64;
      if (label) label.textContent = file.name;
      if (previewBox) previewBox.classList.remove('hidden');
    };
    img.src = rawData;
  };
  reader.readAsDataURL(file);
}

function clearQReloadReceipt() {
  qreloadReceiptBase64 = '';
  const input = document.getElementById('qreloadReceiptFile');
  const label = document.getElementById('qreloadReceiptLabel');
  const previewBox = document.getElementById('qreloadReceiptPreviewBox');
  if (input) input.value = '';
  if (label) label.textContent = 'Pilih Foto Bukti Transfer';
  if (previewBox) previewBox.classList.add('hidden');
}

async function downloadQrisImage(url, filename = 'QRIS_Kas_Teater_Q.jpg') {
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
    showToast('Gambar QRIS berhasil diunduh! Silakan cek galeri/unduhan HP.', 'success');
  } catch (err) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Membuka gambar QRIS...', 'info');
  }
}

async function checkServerIP() {
  showToast('Mengecek IP Server Netlify...', 'info');
  try {
    let ip = '';
    try {
      const resp = await fetch('/cek-ip');
      const text = await resp.text();
      if (text && !text.includes('<') && text.trim().length > 0) {
        ip = text.trim();
      }
    } catch(e) {}

    if (!ip) {
      const fbResp = await fetch('https://api.ipify.org?format=json');
      const fbData = await fbResp.json();
      ip = fbData.ip;
    }

    if (ip) {
      try {
        await navigator.clipboard.writeText(ip);
        showToast(`IP: ${ip} (Tersalin ke Clipboard!)`, 'success');
      } catch (clipErr) {
        prompt('IP Server Netlify (Salin kode ini ke DigiFlazz):', ip);
      }
    } else {
      showToast('Gagal mendeteksi IP server.', 'error');
    }
  } catch (err) {
    showToast('Koneksi cek IP gagal. Coba lagi sebentar.', 'error');
  }
}

function getDigiflazzSku(product) {
  if (!product) return '';
  if (product.digiSku) return product.digiSku;

  const brand = (product.brand || '').toUpperCase();
  const name = (product.name || '').toUpperCase();

  // Ekstrak nominal angka (contoh: "5.000" -> 5, "10.000" -> 10, "100.000" -> 100)
  const numMatch = name.match(/(\d+)[\.,]?000/);
  const nominal = numMatch ? numMatch[1] : '';

  if (nominal) {
    if (brand.includes('INDOSAT') || brand.includes('ISAT')) return 'i' + nominal;
    if (brand.includes('TELKOMSEL') || brand.includes('TSEL') || brand.includes('SIMPATI') || brand.includes('AS')) return 't' + nominal;
    if (brand.includes('XL')) return 'x' + nominal;
    if (brand.includes('AXIS')) return 'ax' + nominal;
    if (brand.includes('TRI') || brand.includes('THREE')) return 'tri' + nominal;
    if (brand.includes('SMARTFREN') || brand.includes('SMART')) return 'sm' + nominal;
    if (brand.includes('BY.U') || brand.includes('BYU')) return 'byu' + nominal;
    if (brand.includes('PLN')) return 'pln' + nominal;
    if (brand.includes('DANA')) return 'dana' + nominal;
    if (brand.includes('GOPAY') || brand.includes('GO-PAY')) return 'gopay' + nominal;
    if (brand.includes('OVO')) return 'ovo' + nominal;
    if (brand.includes('SHOPEE') || brand.includes('SHOPEEPAY')) return 'shopee' + nominal;
  }
  return product.code;
}

function parsePlnTokenNote(rawNote) {
  if (!rawNote) return { token: '', custName: '', tarif: '', kwh: '' };
  const text = String(rawNote).trim();

  let token = '';
  let custName = '';
  let tarif = '';
  let kwh = '';

  // 1. Ekstraksi 20 digit token PLN (format XXXX-XXXX-XXXX-XXXX-XXXX atau 20 digit tanpa pemisah)
  const matchGrouped = text.match(/\b(\d{4})[-\s]?(\d{4})[-\s]?(\d{4})[-\s]?(\d{4})[-\s]?(\d{4})\b/);
  if (matchGrouped) {
    token = `${matchGrouped[1]}-${matchGrouped[2]}-${matchGrouped[3]}-${matchGrouped[4]}-${matchGrouped[5]}`;
  } else {
    if (text.includes('/')) {
      const firstSegmentDigits = text.split('/')[0].replace(/[^0-9]/g, '');
      if (firstSegmentDigits.length === 20) {
        token = firstSegmentDigits.match(/.{1,4}/g).join('-');
      }
    }
    if (!token) {
      const match20 = text.match(/\d{20}/);
      if (match20) {
        token = match20[0].match(/.{1,4}/g).join('-');
      }
    }
  }

  // 2. Ekstraksi metadata pelanggan (Nama, Tarif/Daya, KWh)
  if (text.includes('/')) {
    const rawParts = text.split('/').map(p => p.trim()).filter(Boolean);
    const tokenDigits = token ? token.replace(/[^0-9]/g, '') : '';
    // Hapus bagian yang mengandung token 20 digit
    const parts = rawParts.filter(p => !tokenDigits || !p.replace(/[^0-9]/g, '').includes(tokenDigits));
    // Abaikan label 'PLN' jika ada di posisi awal
    if (parts.length > 0 && parts[0].toUpperCase() === 'PLN') {
      parts.shift();
    }
    if (parts.length >= 1) custName = parts[0];
    if (parts.length >= 3) {
      if (parts[2].toUpperCase().includes('VA') || parts[1].toUpperCase().startsWith('R') || parts[1].toUpperCase().startsWith('B') || parts[1].toUpperCase().startsWith('I')) {
        tarif = `${parts[1]}/${parts[2]}`;
        if (parts.length >= 4) kwh = parts[3];
      } else {
        tarif = parts[1];
        kwh = parts[2];
      }
    } else if (parts.length >= 2) {
      tarif = parts[1];
    }
  }

  return { token, custName, tarif, kwh };
}

async function submitQReloadOrder() {
  const phoneInput = document.getElementById('qreloadPhoneInput');
  const targetPhone = (phoneInput ? phoneInput.value : '').trim();

  if (!targetPhone || targetPhone.length < 9) {
    showToast('Masukkan nomor HP / ID Pelanggan yang valid!', 'error');
    if (phoneInput) phoneInput.focus();
    return;
  }

  if (!qreloadSelectedProduct) {
    showToast('Pilih paket pulsa atau data terlebih dahulu!', 'error');
    return;
  }

  // Bukti transfer bersifat opsional (langsung tembak & lapor ke Telegram)

  // Cegat jika kuota saldo server habis di kedua provider
  const rawPrice = qreloadSelectedProduct.price.basic || 0;
  const hasDigi = (qreloadDigiBalance !== null && qreloadDigiBalance >= rawPrice);
  const hasVip = (qreloadVipBalance !== null && qreloadVipBalance >= rawPrice);

  if (!hasDigi && !hasVip) {
    showToast('Mohon maaf, saldo modal server saat ini sedang tidak mencukupi!', 'error');
    updateQReloadStockUI();
    return;
  }

  const btn = document.getElementById('btnSubmitQReload');
  const originalText = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses & Mengirim Pesanan...';
  }

  const markup = getQReloadMarkup(rawPrice);
  const total = rawPrice + markup;
  const orderId = 'PULSA-' + Date.now().toString().slice(-6);
  const serviceCode = qreloadSelectedProduct.code || '';
  const prodName = `${qreloadSelectedProduct.brand} - ${qreloadSelectedProduct.name}`;

  // EKSEKUSI LANGSUNG KE VIP RESELLER VIA FIXIE PROXY
  const vipKey = (typeof QRELOAD_CONFIG !== 'undefined' && QRELOAD_CONFIG.vipApiKey) || 'yRVpjMIge62BmjuBL4KfpfQxF5y4ZV3dhSNtrLeB6Bpj1gN6r9Hyhs2ybUgfyiYg';
  const vipSign = (typeof QRELOAD_CONFIG !== 'undefined' && QRELOAD_CONFIG.vipSign) || '9cd98abdf2bb6f55fddeb3f1094ff6ee';

  const orderBody = new URLSearchParams();
  orderBody.append('key', vipKey);
  orderBody.append('sign', vipSign);
  orderBody.append('type', 'order');
  orderBody.append('service', serviceCode);
  orderBody.append('data_no', targetPhone);

  const isLocal = isLocalNetworkEnv();
  const endpoints = isLocal
    ? [
        '/api-vip-proxy',
        'https://portalanggota.netlify.app/api-vip/prepaid',
        'https://portalanggota.netlify.app/api-vip-proxy'
      ]
    : [
        '/api-vip/prepaid',
        '/api-vip-proxy',
        '/.netlify/functions/vip-order',
        'https://portalanggota.netlify.app/api-vip-proxy'
      ];

  let vipRes = null;
  let isAutoSuccess = false;
  let autoMessage = '';
  let resolvedTrxId = orderId;
  let resolvedSn = '';

  for (const ep of endpoints) {
    try {
      const resp = await fetch(ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: orderBody
      });
      if (resp.ok) {
        let text = await resp.text();
        let json = null;
        try {
          const firstBrace = text.indexOf('{');
          const lastBrace = text.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1) {
            json = JSON.parse(text.substring(firstBrace, lastBrace + 1));
          } else {
            json = JSON.parse(text);
          }
        } catch(eParse) {}

        if (json) {
          vipRes = json;
          if (json.result === true) {
            isAutoSuccess = true;
            break;
          }
          const msg = (json.message || '').toLowerCase();
          const isIpPermitErr = msg.includes('permit') || msg.includes('ip address') || msg.includes('whitelist');
          if (!isIpPermitErr) {
            break;
          }
        }
      }
    } catch(eEp) {}
  }

  const rawNoteOrSn = (vipRes && vipRes.data && (vipRes.data.note || vipRes.data.sn || vipRes.data.token)) || '';
  const parsedPln = parsePlnTokenNote(rawNoteOrSn);
  const extractedToken = parsedPln.token;
  const extractedCustName = parsedPln.custName;
  const extractedTarif = parsedPln.tarif;
  const extractedKwh = parsedPln.kwh;
  const digiRes = null;

  if (vipRes && vipRes.result && vipRes.data) {
    isAutoSuccess = true;
    resolvedTrxId = vipRes.data.trxid || orderId;
    resolvedSn = rawNoteOrSn;
    autoMessage = `✅ STATUS: SUKSES DITEMBAK OTOMATIS!\n🔖 TrxID: ${resolvedTrxId}\n🔢 SN / Ref: ${resolvedSn || 'Sedang diproses operator'}`;
    if (parsedPln.token) {
      autoMessage += `\n\n⚡ KODE TOKEN PLN (20 DIGIT):\n👉 ${parsedPln.token} 👈`;
      if (parsedPln.custName) autoMessage += `\n👤 Pelanggan: ${parsedPln.custName}`;
      if (parsedPln.tarif) autoMessage += `\n🔌 Daya: ${parsedPln.tarif}`;
      if (parsedPln.kwh) autoMessage += `\n📊 KWh: ${parsedPln.kwh}`;
    }
  } else {
    const errText = (vipRes && vipRes.message) ? vipRes.message : 'Server sedang memproses transaksi';
    autoMessage = `⚠️ STATUS SERVER: ${errText}`;
  }

  // Kirim notifikasi laporan instan ke Telegram Pengurus (Laporan Masuk Tanpa Tombol ACC)
  const message = `⚡ LAPORAN TRANSAKSI MASUK (Q-STORE) ⚡\n\n` +
    `🔖 No. Order: #${orderId}\n` +
    `📱 Nomor Tujuan: ${targetPhone}\n` +
    `📦 Produk: ${prodName}\n` +
    `💰 Harga Jual: Rp ${total.toLocaleString('id-ID')}\n` +
    `📈 Laba Kas Teater Q: +Rp ${markup.toLocaleString('id-ID')}\n` +
    `🕒 Waktu: ${new Date().toLocaleString('id-ID')}\n\n` +
    `${autoMessage}\n\n` +
    (qreloadReceiptBase64 ? `Bukti transfer telah dilampirkan oleh pemesan.` : `(Tanpa lampiran bukti transfer - Direct Order)`);

  try {
    // Refresh saldo kedua server di latar belakang
    if (typeof fetchVipBalanceBackground === 'function') {
      setTimeout(() => fetchVipBalanceBackground(true), 2500);
    }

    const fullMessage = message;
    const telegramReplyMarkupObj = {
      inline_keyboard: [
        [
          {
            text: '💬 WA Pembeli',
            url: `https://wa.me/${targetPhone.replace(/^0/, '62')}`
          },
          {
            text: '🌐 Web VIPAYMENT',
            url: 'https://vipayment.id'
          }
        ]
      ]
    };
    const telegramReplyMarkupStr = JSON.stringify(telegramReplyMarkupObj);

    if (typeof TELEGRAM_CONFIG !== 'undefined' && TELEGRAM_CONFIG.token) {
      if (qreloadReceiptBase64 && qreloadReceiptBase64.startsWith('data:image')) {
        // Kirim foto langsung ke Telegram via sendPhoto
        try {
          const blobBin = atob(qreloadReceiptBase64.split(',')[1]);
          const array = [];
          for (let i = 0; i < blobBin.length; i++) {
            array.push(blobBin.charCodeAt(i));
          }
          const photoBlob = new Blob([new Uint8Array(array)], { type: 'image/jpeg' });
          const formData = new FormData();
          formData.append('chat_id', TELEGRAM_CONFIG.chatId);
          formData.append('photo', photoBlob, `bukti_${orderId}.jpg`);
          formData.append('caption', fullMessage);
          formData.append('reply_markup', telegramReplyMarkupStr);

          const tgController = new AbortController();
          const tgTimer = setTimeout(() => tgController.abort(), 4000);
          await fetch(`https://api.telegram.org/bot${TELEGRAM_CONFIG.token}/sendPhoto`, {
            method: 'POST',
            body: formData,
            signal: tgController.signal
          });
          clearTimeout(tgTimer);
        } catch (errPhoto) {
          // Fallback kirim text saja
          try {
            const tgController2 = new AbortController();
            const tgTimer2 = setTimeout(() => tgController2.abort(), 3000);
            await fetch(`https://api.telegram.org/bot${TELEGRAM_CONFIG.token}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: TELEGRAM_CONFIG.chatId,
                text: fullMessage,
                reply_markup: telegramReplyMarkupObj
              }),
              signal: tgController2.signal
            });
            clearTimeout(tgTimer2);
          } catch(eSend) {}
        }
      } else {
        try {
          const tgController3 = new AbortController();
          const tgTimer3 = setTimeout(() => tgController3.abort(), 3500);
          await fetch(`https://api.telegram.org/bot${TELEGRAM_CONFIG.token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: TELEGRAM_CONFIG.chatId,
              text: fullMessage,
              reply_markup: telegramReplyMarkupObj
            }),
            signal: tgController3.signal
          });
          clearTimeout(tgTimer3);
        } catch(eSend) {}
      }
    }

    const resolvedTrxId = (vipRes && vipRes.data && vipRes.data.trxid)
      ? vipRes.data.trxid
      : ((digiRes && digiRes.data && digiRes.data.ref_id) ? digiRes.data.ref_id : orderId);

    // Simpan ke Riwayat Transaksi Lokal Perangkat Ini (Privat per HP)
    try {
      if (typeof saveQReloadTransaction === 'function') {
        saveQReloadTransaction({
          id: orderId || ('TX' + Date.now()),
          trxid: resolvedTrxId,
          date: new Date().toISOString(),
          target: targetPhone,
          product: `${qreloadSelectedProduct.brand} - ${qreloadSelectedProduct.name}`,
          type: qreloadSelectedProduct.type || 'pulsa-reguler',
          brand: qreloadSelectedProduct.brand || '',
          total: total,
          price: rawPrice,
          adminFee: markup,
          status: isAutoSuccess ? 'success' : 'pending',
          isAutoSuccess: !!isAutoSuccess,
          isPln: (qreloadSelectedProduct.type === 'token-pln' || qreloadSelectedProduct.brand === 'PLN'),
          token: extractedToken || '',
          custName: extractedCustName || '',
          tarif: extractedTarif || '',
          kwh: extractedKwh || ''
        });
      }
    } catch (errHist) {
      console.warn('Gagal menyimpan transaksi ke riwayat lokal:', errHist);
    }

    // Kirim Transaksi Masuk ke Google Spreadsheet Teater Q (Tab Transaksi_QStore)
    try {
      const scriptUrl = (typeof SCRIPT_MARKETPLACE !== 'undefined') ? SCRIPT_MARKETPLACE : '';
      if (scriptUrl) {
        fetch(scriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'log_qstore_order',
            orderId: orderId,
            target: targetPhone,
            product: `${qreloadSelectedProduct.brand} - ${qreloadSelectedProduct.name}`,
            price: rawPrice,
            total: total,
            adminFee: markup,
            status: isAutoSuccess ? 'success' : 'pending',
            trxid: resolvedTrxId
          })
        }).catch(errSheet => console.warn('Kirim sheet pusat info:', errSheet));

        // Optimistic update laba terpusat HANYA jika langsung sukses
        if (isAutoSuccess) {
          qstoreCentralProfit += markup;
          qstoreCentralCount += 1;
          try {
            localStorage.setItem('teaterq_central_profit', qstoreCentralProfit.toString());
            localStorage.setItem('teaterq_central_count', qstoreCentralCount.toString());
          } catch(e){}
          updateQReloadBalanceDisplays();
        }
        setTimeout(() => fetchQStoreCentralProfit(true), 3500);
      }
    } catch (errSync) {
      console.warn('Gagal mencatat transaksi ke Google Sheets pusat:', errSync);
    }

    const rawNote = !isAutoSuccess ? (vipRes?.message || digiRes?.data?.message || '') : '';
    const cleanNote = (rawNote.toLowerCase().includes('permit') || rawNote.toLowerCase().includes('ip address') || rawNote.toLowerCase().includes('whitelist') || !rawNote)
      ? 'Pesanan berhasil dikonfirmasi! Sedang diproses langsung ke nomor Anda.'
      : rawNote;

    // Tampilkan selalu Struk Langsung di dalam modal (jangan tutup otomatis ke beranda)
    openDirectReceipt({
      target: targetPhone,
      product: `${qreloadSelectedProduct.brand} - ${qreloadSelectedProduct.name}`,
      total: total,
      token: extractedToken,
      custName: extractedCustName,
      tarif: extractedTarif,
      kwh: extractedKwh,
      trxid: resolvedTrxId,
      status: isAutoSuccess ? 'success' : 'pending',
      isAutoSuccess: !!isAutoSuccess,
      statusNote: cleanNote,
      isPln: (qreloadSelectedProduct.type === 'token-pln' || qreloadSelectedProduct.brand === 'PLN')
    });

    if (isAutoSuccess) {
      showToast('Berhasil! Pengisian diproses otomatis.', 'success');
    } else {
      showToast('Pesanan berhasil dikonfirmasi & sedang diproses!', 'success');
    }

    // Reset form
    if (phoneInput) phoneInput.value = '';
    clearQReloadReceipt();
    qreloadSelectedProduct = null;
    const box = document.getElementById('qreloadCheckoutBox');
    if (box) box.classList.add('hidden');

  } catch (err) {
    console.error(err);
    if (typeof openDirectReceipt === 'function' && targetPhone) {
      openDirectReceipt({
        target: targetPhone,
        product: qreloadSelectedProduct ? `${qreloadSelectedProduct.brand} - ${qreloadSelectedProduct.name}` : 'Layanan Q-Store',
        total: total,
        token: '',
        custName: '',
        tarif: '',
        kwh: '',
        trxid: orderId,
        status: 'pending',
        isAutoSuccess: false,
        statusNote: 'Pesanan tersimpan. Silakan kirim struk ke WhatsApp Admin.',
        isPln: qreloadSelectedProduct ? (qreloadSelectedProduct.type === 'token-pln' || qreloadSelectedProduct.brand === 'PLN') : false
      });
    }
    showToast('Pesanan tersimpan! Silakan konfirmasi ke WhatsApp Admin.', 'info');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }
}

function openModalQReloadSuccess(details) {
  const modal = document.getElementById('qreloadSuccessModal');
  if (!modal) return;

  const targetEl = document.getElementById('qreloadSuccessTarget');
  const productEl = document.getElementById('qreloadSuccessProduct');
  const totalEl = document.getElementById('qreloadSuccessTotal');
  const tokenBox = document.getElementById('qreloadSuccessTokenBox');
  const tokenCodeEl = document.getElementById('qreloadSuccessTokenCode');
  const plnGuide = document.getElementById('qreloadSuccessPlnGuide');

  const rowCust = document.getElementById('qreloadSuccessRowCust');
  const rowTarif = document.getElementById('qreloadSuccessRowTarif');
  const rowKwh = document.getElementById('qreloadSuccessRowKwh');
  const custEl = document.getElementById('qreloadSuccessCust');
  const tarifEl = document.getElementById('qreloadSuccessTarif');
  const kwhEl = document.getElementById('qreloadSuccessKwh');

  const titleEl = document.getElementById('qreloadSuccessTitle');
  const subEl = document.getElementById('qreloadSuccessSubtitle');

  if (targetEl) targetEl.textContent = details.target || '-';
  if (productEl) productEl.textContent = details.product || '-';
  if (totalEl) totalEl.textContent = details.total ? `Rp ${details.total.toLocaleString('id-ID')}` : '-';

  if (details.token) {
    if (titleEl) titleEl.textContent = 'Token Listrik Berhasil Diterbitkan!';
    if (subEl) subEl.textContent = 'Silakan masukkan 20 angka token di bawah ke meteran listrik';
    if (tokenBox) tokenBox.classList.remove('hidden');
    if (tokenCodeEl) tokenCodeEl.textContent = details.token;
    if (plnGuide) plnGuide.classList.remove('hidden');

    if (rowCust && custEl) {
      if (details.custName) {
        custEl.textContent = details.custName;
        rowCust.classList.remove('hidden');
      } else {
        rowCust.classList.add('hidden');
      }
    }
    if (rowTarif && tarifEl) {
      if (details.tarif) {
        tarifEl.textContent = details.tarif;
        rowTarif.classList.remove('hidden');
      } else {
        rowTarif.classList.add('hidden');
      }
    }
    if (rowKwh && kwhEl) {
      if (details.kwh) {
        kwhEl.textContent = details.kwh;
        rowKwh.classList.remove('hidden');
      } else {
        rowKwh.classList.add('hidden');
      }
    }
  } else {
    if (titleEl) titleEl.textContent = 'Pesanan Pulsa Berhasil!';
    if (subEl) subEl.textContent = 'Pengisian telah diproses otomatis ke nomor tujuan';
    if (tokenBox) tokenBox.classList.add('hidden');
    if (plnGuide) plnGuide.classList.add('hidden');
    if (rowCust) rowCust.classList.add('hidden');
    if (rowTarif) rowTarif.classList.add('hidden');
    if (rowKwh) rowKwh.classList.add('hidden');
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeModalQReloadSuccess() {
  const modal = document.getElementById('qreloadSuccessModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function copyQReloadToken() {
  const codeEl = document.getElementById('qreloadSuccessTokenCode');
  const btn = document.getElementById('btnCopyToken');
  if (!codeEl) return;
  const text = codeEl.textContent.trim();
  navigator.clipboard.writeText(text).then(() => {
    if (btn) {
      const orig = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-check"></i> Kode Berhasil Disalin!';
      btn.classList.remove('bg-emerald-600');
      btn.classList.add('bg-teal-700');
      setTimeout(() => {
        btn.innerHTML = orig;
        btn.classList.remove('bg-teal-700');
        btn.classList.add('bg-emerald-600');
      }, 2500);
    }
    showToast('20 Digit Kode Token berhasil disalin!', 'success');
  }).catch(() => {
    showToast('Silakan salin kode token secara manual', 'info');
  });
}

function openDirectReceipt(details) {
  window.currentDirectReceiptDetails = details;
  const mBody = document.getElementById('qreloadModalBody');
  const dRec = document.getElementById('qreloadDirectReceipt');
  if (mBody) mBody.classList.add('hidden');
  if (dRec) dRec.classList.remove('hidden');

  const titleEl = document.getElementById('directReceiptTitle');
  const subEl = document.getElementById('directReceiptSubtitle');
  const tokenBox = document.getElementById('directTokenBox');
  const tokenCode = document.getElementById('directTokenCode');
  const btnCopy = document.getElementById('btnCopyDirectToken');
  const targetEl = document.getElementById('directTarget');
  const custEl = document.getElementById('directCust');
  const tarifEl = document.getElementById('directTarif');
  const kwhEl = document.getElementById('directKwh');
  const prodEl = document.getElementById('directProduct');
  const totalEl = document.getElementById('directTotal');

  const rowCust = document.getElementById('directRowCust');
  const rowTarif = document.getElementById('directRowTarif');
  const rowKwh = document.getElementById('directRowKwh');
  const plnGuide = document.getElementById('directPlnGuide');

  if (targetEl) targetEl.textContent = details.target || '-';
  if (prodEl) prodEl.textContent = details.product || '-';
  if (totalEl) totalEl.textContent = details.total ? `Rp ${details.total.toLocaleString('id-ID')}` : '-';

  const isPln = details.isPln || (details.product && details.product.toUpperCase().includes('PLN'));
  const parsedToken = parsePlnTokenNote(details.token || details.statusNote || '');
  let activeToken = parsedToken.token;
  if (!activeToken && details.token) {
    const rawClean = String(details.token).replace(/[^0-9]/g, '');
    if (rawClean.length === 20) {
      activeToken = rawClean.match(/.{1,4}/g).join('-');
    }
  }

  if (!details.custName && parsedToken.custName) details.custName = parsedToken.custName;
  if (!details.tarif && parsedToken.tarif) details.tarif = parsedToken.tarif;
  if (!details.kwh && parsedToken.kwh) details.kwh = parsedToken.kwh;

  if (isPln) {
    if (tokenBox) tokenBox.classList.remove('hidden');
    if (plnGuide) plnGuide.classList.remove('hidden');

    if (activeToken) {
      if (titleEl) titleEl.textContent = 'Token Listrik Berhasil Diterbitkan!';
      if (subEl) subEl.textContent = 'Silakan masukkan 20 angka token di bawah ke meteran listrik';
      if (tokenCode) {
        tokenCode.textContent = activeToken;
        tokenCode.className = "text-base sm:text-xl font-black font-mono tracking-widest text-emerald-400 bg-slate-900 py-3 px-2 rounded-xl border border-slate-800 select-all shadow-inner";
      }
      if (btnCopy) {
        btnCopy.disabled = false;
        btnCopy.className = "w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow";
        btnCopy.innerHTML = '<i class="fas fa-copy"></i> Salin 20 Digit Kode Token';
        btnCopy.onclick = copyDirectToken;
      }
    } else {
      // Masih proses penerbitan token oleh server PLN
      if (titleEl) titleEl.textContent = 'Pesanan Token Listrik Diproses!';
      if (subEl) subEl.textContent = 'Server PLN sedang menerbitkan 20 digit kode token Anda';
      if (tokenCode) {
        tokenCode.innerHTML = '<div class="py-2 text-amber-400 text-xs font-bold flex items-center justify-center gap-2"><i class="fas fa-spinner fa-spin text-sm"></i> Token Sedang Diterbitkan PLN...</div><p class="text-[10px] text-slate-400 mt-0.5 font-normal">Server PLN butuh 5-25 detik. Klik tombol di bawah jika kode belum tampil.</p>';
      }
      if (btnCopy) {
        btnCopy.disabled = false;
        btnCopy.className = "w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow";
        btnCopy.innerHTML = '<i class="fas fa-sync-alt"></i> Cek &amp; Tampilkan Kode Token';
        btnCopy.onclick = function() { checkLiveVipPlnToken(details.trxid); };
      }

      // Auto-poll otomatis setiap 3 detik hingga 8 kali (24 detik)
      let pollCount = 0;
      const pollTimer = setInterval(async () => {
        pollCount++;
        const currentCode = (tokenCode ? tokenCode.textContent : '');
        const currentParsed = parsePlnTokenNote(currentCode);
        if (pollCount > 8 || !dRec || dRec.classList.contains('hidden') || currentParsed.token) {
          clearInterval(pollTimer);
          return;
        }
        await checkLiveVipPlnToken(details.trxid);
      }, 3000);
    }

    if (rowCust && custEl) {
      if (details.custName) { custEl.textContent = details.custName; rowCust.classList.remove('hidden'); }
      else { rowCust.classList.add('hidden'); }
    }
    if (rowTarif && tarifEl) {
      if (details.tarif) { tarifEl.textContent = details.tarif; rowTarif.classList.remove('hidden'); }
      else { rowTarif.classList.add('hidden'); }
    }
    if (rowKwh && kwhEl) {
      if (details.kwh) { kwhEl.textContent = details.kwh; rowKwh.classList.remove('hidden'); }
      else { rowKwh.classList.add('hidden'); }
    }
  } else {
    if (details.isAutoSuccess || details.status === 'success') {
      if (titleEl) titleEl.textContent = 'Pesanan Pulsa Berhasil!';
      if (subEl) subEl.textContent = 'Pengisian telah diproses otomatis ke nomor tujuan';
    } else {
      if (titleEl) titleEl.textContent = 'Pesanan Berhasil Dikirim!';
      if (subEl) subEl.textContent = details.statusNote || 'Bukti transfer pembayaran berhasil diterima! Admin Teater Q sedang memverifikasi pembayaran.';
    }
    if (tokenBox) tokenBox.classList.add('hidden');
    if (tokenCode) {
      tokenCode.textContent = '';
      tokenCode.innerHTML = '';
    }
    if (plnGuide) plnGuide.classList.add('hidden');
    if (rowCust) rowCust.classList.add('hidden');
    if (rowTarif) rowTarif.classList.add('hidden');
    if (rowKwh) rowKwh.classList.add('hidden');
    if (custEl) custEl.textContent = '-';
    if (tarifEl) tarifEl.textContent = '-';
    if (kwhEl) kwhEl.textContent = '-';
  }
}

async function checkLiveVipPlnToken(trxid) {
  if (!trxid) {
    showToast('ID Transaksi tidak ditemukan', 'info');
    return;
  }
  const btn = document.getElementById('btnCopyDirectToken');
  const tokenCode = document.getElementById('directTokenCode');
  const custEl = document.getElementById('directCust');
  const tarifEl = document.getElementById('directTarif');
  const kwhEl = document.getElementById('directKwh');
  const rowCust = document.getElementById('directRowCust');
  const rowTarif = document.getElementById('directRowTarif');
  const rowKwh = document.getElementById('directRowKwh');
  const titleEl = document.getElementById('directReceiptTitle');
  const subEl = document.getElementById('directReceiptSubtitle');

  if (btn && btn.textContent.includes('Cek')) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menghubungi Server PLN...';
  }

  const vipKey = (typeof QRELOAD_CONFIG !== 'undefined' && QRELOAD_CONFIG.vipApiKey) || 'yRVpjMIge62BmjuBL4KfpfQxF5y4ZV3dhSNtrLeB6Bpj1gN6r9Hyhs2ybUgfyiYg';
  const vipSign = (typeof QRELOAD_CONFIG !== 'undefined' && QRELOAD_CONFIG.vipSign) || '9cd98abdf2bb6f55fddeb3f1094ff6ee';

  const isLocal = isLocalNetworkEnv();
  const endpoints = isLocal
    ? ['/api-vip-proxy', 'https://portalanggota.netlify.app/api-vip/prepaid', 'https://portalanggota.netlify.app/api-vip-proxy']
    : ['/api-vip/prepaid', '/api-vip-proxy', '/.netlify/functions/vip-order', 'https://portalanggota.netlify.app/api-vip-proxy'];

  let success = false;
  for (const ep of endpoints) {
    try {
      const statusBody = new URLSearchParams();
      statusBody.append('key', vipKey);
      statusBody.append('sign', vipSign);
      statusBody.append('type', 'status');
      statusBody.append('trxid', trxid);

      const resp = await fetch(ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: statusBody
      });
      if (resp.ok) {
        const resText = await resp.text();
        let resJson = null;
        try {
          const firstBrace = resText.indexOf('{');
          const lastBrace = resText.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            resJson = JSON.parse(resText.substring(firstBrace, lastBrace + 1));
          } else {
            resJson = JSON.parse(resText);
          }
        } catch (eParse) {
          console.warn('JSON parse error in checkLiveVipPlnToken:', eParse, resText);
        }

        if (resJson && resJson.result && resJson.data) {
          const item = Array.isArray(resJson.data) ? resJson.data[0] : resJson.data;
          if (item) {
            const rawNote = (item.note || item.sn || item.token || '').trim();
            const statusStr = String(item.status || '').toLowerCase();
            const isFailed = statusStr.includes('gagal') || statusStr.includes('failed') || statusStr.includes('cancel');

            if (isFailed) {
              if (titleEl) titleEl.textContent = 'Transaksi Gagal';
              if (subEl) subEl.textContent = rawNote || 'Pengisian token listrik gagal dari pihak operator/PLN.';
              if (tokenCode) {
                tokenCode.innerHTML = `<div class="py-2 text-rose-400 text-xs font-bold flex items-center justify-center gap-1.5"><i class="fas fa-times-circle text-sm"></i> Gagal: ${rawNote || 'Dibatalkan oleh operator'}</div>`;
              }
              if (btn) {
                btn.disabled = false;
                btn.className = "w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow";
                btn.innerHTML = '<i class="fas fa-arrow-left"></i> Kembali ke Menu';
                btn.onclick = backToQReloadCatalog;
              }
              success = true;
              break;
            }

            const parsed = parsePlnTokenNote(rawNote);
            if (parsed.token) {
              const token20 = parsed.token;
              const cust = parsed.custName;
              const tarif = parsed.tarif;
              const kwh = parsed.kwh;

              if (tokenCode) {
                tokenCode.textContent = token20;
                tokenCode.className = "text-base sm:text-xl font-black font-mono tracking-widest text-emerald-400 bg-slate-900 py-3 px-2 rounded-xl border border-slate-800 select-all shadow-inner";
              }
              if (titleEl) titleEl.textContent = 'Token Listrik Berhasil Diterbitkan!';
              if (subEl) subEl.textContent = 'Silakan masukkan 20 angka token di bawah ke meteran listrik';
              if (cust && custEl && rowCust) { custEl.textContent = cust; rowCust.classList.remove('hidden'); }
              if (tarif && tarifEl && rowTarif) { tarifEl.textContent = tarif; rowTarif.classList.remove('hidden'); }
              if (kwh && kwhEl && rowKwh) { kwhEl.textContent = kwh; rowKwh.classList.remove('hidden'); }

              if (btn) {
                btn.disabled = false;
                btn.className = "w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow";
                btn.innerHTML = '<i class="fas fa-copy"></i> Salin 20 Digit Kode Token';
                btn.onclick = copyDirectToken;
              }

              // Perbarui juga riwayat di memori perangkat
              try {
                if (typeof getQReloadHistory === 'function') {
                  const hist = getQReloadHistory();
                  const idx = hist.findIndex(x => x.trxid === trxid || x.id === trxid);
                  if (idx !== -1) {
                    hist[idx].token = token20;
                    if (cust) hist[idx].custName = cust;
                    if (tarif) hist[idx].tarif = tarif;
                    if (kwh) hist[idx].kwh = kwh;
                    hist[idx].status = 'success';
                    localStorage.setItem('qreload_orders_history_v1', JSON.stringify(hist));
                    if (typeof updateQReloadHistoryBadge === 'function') updateQReloadHistoryBadge();
                  }
                }
              } catch (eHist) {}

              // Kirim notifikasi token sukses ke Telegram pengurus
              if (typeof TELEGRAM_CONFIG !== 'undefined' && TELEGRAM_CONFIG.token) {
                const plnMsg = `⚡ TOKEN PLN BERHASIL TERBIT! ⚡\n\n` +
                  `🔖 TrxID: ${trxid}\n` +
                  `👉 TOKEN: ${token20} 👈\n` +
                  (cust ? `👤 Pelanggan: ${cust}\n` : '') +
                  (tarif ? `🔌 Daya: ${tarif}\n` : '') +
                  (kwh ? `📊 KWh: ${kwh}\n` : '') +
                  `🕒 Waktu Terbit: ${new Date().toLocaleString('id-ID')}`;
                try {
                  fetch(`https://api.telegram.org/bot${TELEGRAM_CONFIG.token}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      chat_id: TELEGRAM_CONFIG.chatId,
                      text: plnMsg
                    })
                  }).catch(() => {});
                } catch(eTg) {}
              }

              showToast('20 Digit Kode Token Berhasil Didapatkan!', 'success');
              success = true;
              break;
            }
          }
        }
      }
    } catch (e) {
      console.warn('Check live token err:', e);
    }
  }

  if (!success && btn) {
    btn.disabled = false;
    btn.className = "w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow";
    btn.innerHTML = '<i class="fas fa-sync-alt"></i> Cek &amp; Tampilkan Kode Token';
  }
}

function copyDirectToken() {
  const codeEl = document.getElementById('directTokenCode');
  const btn = document.getElementById('btnCopyDirectToken');
  if (!codeEl) return;
  const text = codeEl.textContent.trim();
  navigator.clipboard.writeText(text).then(() => {
    if (btn) {
      const orig = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-check"></i> 20 Digit Kode Token Berhasil Disalin!';
      btn.classList.remove('from-emerald-600', 'to-teal-600');
      btn.classList.add('from-teal-700', 'to-emerald-700');
      setTimeout(() => {
        btn.innerHTML = orig;
        btn.classList.add('from-emerald-600', 'to-teal-600');
        btn.classList.remove('from-teal-700', 'to-emerald-700');
      }, 2500);
    }
    showToast('20 Digit Kode Token berhasil disalin!', 'success');
  }).catch(() => {
    showToast('Silakan salin kode token secara manual', 'info');
  });
}

function shareDirectReceiptWA() {
  const details = window.currentDirectReceiptDetails || {};
  const tokenBox = document.getElementById('directTokenBox');
  const isPln = tokenBox && !tokenBox.classList.contains('hidden');
  const token = isPln ? (document.getElementById('directTokenCode')?.textContent.trim() || '') : '';
  const target = document.getElementById('directTarget')?.textContent.trim() || details.target || '';
  const cust = document.getElementById('directCust')?.textContent.trim() || details.custName || '';
  const tarif = document.getElementById('directTarif')?.textContent.trim() || details.tarif || '';
  const kwh = document.getElementById('directKwh')?.textContent.trim() || details.kwh || '';
  const prod = document.getElementById('directProduct')?.textContent.trim() || details.product || '';
  const total = document.getElementById('directTotal')?.textContent.trim() || (details.total ? `Rp ${Number(details.total).toLocaleString('id-ID')}` : '');
  const statusStr = (details.isAutoSuccess || details.status === 'success') ? 'BERHASIL LUNAS' : 'SEDANG DIPROSES / MENUNGGU VERIFIKASI';

  let waText = `*STRUK RESMI PEMBELIAN Q-STORE TEATER Q*\n` +
    `-----------------------------------------\n` +
    `Produk: ${prod}\n` +
    `No. Tujuan / IDPEL: ${target}\n` +
    (isPln && cust && cust !== '-' ? `Nama Pelanggan: ${cust}\n` : '') +
    (isPln && tarif && tarif !== '-' ? `Tarif/Daya: ${tarif}\n` : '') +
    (isPln && kwh && kwh !== '-' ? `Daya KWh: ${kwh}\n` : '') +
    `Total Bayar: ${total}\n` +
    `Status: ${statusStr}\n`;

  if (isPln) {
    const cleanDigits = token.replace(/[^0-9]/g, '');
    if (cleanDigits.length === 20) {
      waText += `-----------------------------------------\n` +
        `*KODE TOKEN LISTRIK (20 DIGIT):*\n` +
        `*${token}*\n` +
        `-----------------------------------------\n` +
        `_Ketik 20 angka di atas pada keypad meteran listrik Anda lalu tekan ENTER._\n`;
    }
  }

  waText += `\nTerima kasih telah bertransaksi di Q-Store. Sebagian laba otomatis masuk ke Kas Dana Abadi Teater Q.`;

  const waUrl = `https://wa.me/6285645829346?text=${encodeURIComponent(waText)}`;
  window.open(waUrl, '_blank');
}

window.copyDirectToken = copyDirectToken;
window.checkLiveVipPlnToken = checkLiveVipPlnToken;
window.shareDirectReceiptWA = shareDirectReceiptWA;

// ==========================================================================
// RIWAYAT TRANSAKSI Q-STORE (LOKAL & PRIVAT PER PERANGKAT / HP)
// ==========================================================================
const QRELOAD_HISTORY_KEY = 'qreload_orders_history_v1';

function getQReloadTotalProfit() {
  try {
    const list = getQReloadHistory();
    return list
      .filter(tx => tx.status === 'success' && (tx.adminFee || tx.profit))
      .reduce((sum, tx) => sum + parseInt(tx.adminFee || tx.profit || 0, 10), 0);
  } catch(e) {
    return 0;
  }
}

function getQReloadHistory() {
  try {
    const raw = localStorage.getItem(QRELOAD_HISTORY_KEY);
    let list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];
    return list;
  } catch (e) {
    console.warn('Gagal membaca riwayat Q-Store:', e);
    return [];
  }
}

function saveQReloadTransaction(tx) {
  if (!tx) return;
  try {
    const list = getQReloadHistory();
    const existingIdx = list.findIndex(x => (tx.id && x.id === tx.id) || (tx.trxid && x.trxid === tx.trxid));
    if (existingIdx !== -1) {
      list[existingIdx] = { ...list[existingIdx], ...tx };
    } else {
      list.unshift(tx);
    }
    // Batasi maks 50 transaksi terakhir
    const trimmed = list.slice(0, 50);
    localStorage.setItem(QRELOAD_HISTORY_KEY, JSON.stringify(trimmed));
    updateQReloadHistoryBadge();
  } catch (e) {
    console.warn('Gagal menyimpan transaksi Q-Reload:', e);
  }
}

function updateQReloadHistoryBadge() {
  const badge = document.getElementById('qreloadHistoryBadgeCount');
  if (!badge) return;
  try {
    const list = getQReloadHistory();
    const count = list.length;
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  } catch (e) {
    badge.classList.add('hidden');
  }
}

function switchQReloadMainView(view) {
  const mBody = document.getElementById('qreloadModalBody');
  const dRec = document.getElementById('qreloadDirectReceipt');
  const hView = document.getElementById('qreloadHistoryView');
  const stickyBar = document.getElementById('qreloadStickyBar');
  const catView = document.getElementById('qreloadCatalogView');

  if (dRec) dRec.classList.add('hidden');

  if (view === 'history') {
    if (mBody) mBody.classList.add('hidden');
    if (hView) hView.classList.remove('hidden');
    if (stickyBar) stickyBar.classList.add('hidden');
    renderQReloadHistory();
  } else {
    // view === 'shop'
    if (mBody) mBody.classList.remove('hidden');
    if (hView) hView.classList.add('hidden');
    if (catView && !catView.classList.contains('hidden') && stickyBar) {
      stickyBar.classList.remove('hidden');
    }
  }
}

function renderQReloadHistory() {
  const container = document.getElementById('qreloadHistoryList');
  if (!container) return;

  const list = getQReloadHistory();
  if (!list || list.length === 0) {
    container.innerHTML = `
      <div class="py-12 px-4 text-center text-slate-400 bg-slate-950/40 rounded-2xl border border-slate-800/80">
        <div class="w-12 h-12 rounded-2xl bg-slate-800/70 border border-slate-700 flex items-center justify-center mx-auto text-slate-400 text-xl mb-3">
          <i class="fas fa-receipt"></i>
        </div>
        <p class="font-bold text-slate-300 text-sm">Belum Ada Riwayat Transaksi</p>
        <p class="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
          Semua pembelian pulsa, kuota, atau token listrik di HP ini akan tersimpan otomatis dan privat di sini.
        </p>
        <button type="button" onclick="switchQReloadMainView('shop')" class="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all shadow">
          <i class="fas fa-cart-shopping text-xs"></i> Beli Sekarang
        </button>
      </div>
    `;
    return;
  }

  let html = '';
  list.forEach((tx) => {
    const isSuccess = tx.status === 'success';
    const isPending = tx.status === 'pending';
    const isPln = tx.isPln || (tx.product && tx.product.toUpperCase().includes('PLN'));
    
    // Status Badge
    let badgeHtml = '';
    if (isSuccess) {
      badgeHtml = `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1"><i class="fas fa-check-circle text-[9px]"></i> Sukses</span>`;
    } else if (isPending) {
      badgeHtml = `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1"><i class="fas fa-clock text-[9px]"></i> Proses</span>`;
    } else {
      badgeHtml = `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1"><i class="fas fa-times-circle text-[9px]"></i> Gagal</span>`;
    }

    // Product Type Icon
    let typeIcon = 'fa-mobile-screen text-teal-400';
    if (isPln) typeIcon = 'fa-plug text-amber-400';
    else if (tx.type === 'paket-internet') typeIcon = 'fa-wifi text-emerald-400';
    else if (tx.type === 'saldo-emoney') typeIcon = 'fa-wallet text-sky-400';

    // Format Date
    let dateStr = '-';
    try {
      if (tx.date) {
        const d = new Date(tx.date);
        dateStr = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
                  d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      }
    } catch(e) { dateStr = tx.date || '-'; }

    // Token Section for PLN
    let plnTokenBox = '';
    if (isPln) {
      const parsed = parsePlnTokenNote(tx.token || '');
      const formattedToken = parsed.token || ((tx.token || '').replace(/[^0-9]/g, '').length === 20 ? (tx.token.replace(/[^0-9]/g, '').match(/.{1,4}/g).join('-')) : '');
      if (formattedToken) {
        if (!tx.custName && parsed.custName) tx.custName = parsed.custName;
        if (!tx.tarif && parsed.tarif) tx.tarif = parsed.tarif;
        if (!tx.kwh && parsed.kwh) tx.kwh = parsed.kwh;
        plnTokenBox = `
          <div class="mt-2.5 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 space-y-2">
            <div class="flex items-center justify-between text-[11px]">
              <span class="font-extrabold text-emerald-300 flex items-center gap-1.5">
                <i class="fas fa-bolt text-amber-400"></i> KODE TOKEN PLN (20 DIGIT):
              </span>
              <span class="text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded font-bold">Resmi PLN</span>
            </div>
            <div class="text-center font-mono font-black text-sm sm:text-base tracking-widest text-emerald-400 bg-slate-950 py-2 px-1 rounded-lg border border-slate-800 select-all shadow-inner">
              ${formattedToken}
            </div>
            <button type="button" onclick="copyHistoryToken('${formattedToken}', this)" class="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow">
              <i class="fas fa-copy"></i> Salin 20 Digit Kode Token
            </button>
          </div>
        `;
      } else {
        plnTokenBox = `
          <div class="mt-2.5 p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-2 text-center">
            <p class="text-amber-400 font-bold text-xs flex items-center justify-center gap-1.5">
              <i class="fas fa-hourglass-half"></i> Token Sedang Diproses Server PLN
            </p>
            <p class="text-[10px] text-slate-400">Tekan tombol di bawah untuk mengambil 20 digit token listrik Anda.</p>
            <button type="button" onclick="checkHistoryVipToken('${tx.trxid || tx.id}', this)" class="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow">
              <i class="fas fa-sync-alt"></i> Cek &amp; Tampilkan Token
            </button>
          </div>
        `;
      }
    }

    // Customer detail for PLN
    let plnCustHtml = '';
    if (isPln && (tx.custName || tx.tarif || tx.kwh)) {
      plnCustHtml = `
        <div class="mt-2 grid grid-cols-2 gap-1 text-[11px] bg-slate-950/60 p-2 rounded-lg border border-slate-800 text-slate-300">
          ${tx.custName ? `<div><span class="text-slate-500">Nama:</span> <strong class="text-white">${tx.custName}</strong></div>` : ''}
          ${tx.tarif ? `<div><span class="text-slate-500">Tarif/Daya:</span> <span>${tx.tarif}</span></div>` : ''}
          ${tx.kwh ? `<div><span class="text-slate-500">Daya KWh:</span> <span class="text-amber-300 font-bold">${tx.kwh}</span></div>` : ''}
          <div><span class="text-slate-500">ID Pel:</span> <span class="font-mono text-slate-200">${tx.target}</span></div>
        </div>
      `;
    }

    const totalText = tx.total ? `Rp ${Number(tx.total).toLocaleString('id-ID')}` : '-';

    html += `
      <div class="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all shadow-sm space-y-2.5 qreload-history-card">
        <!-- Header Card: Tanggal & Badge Status -->
        <div class="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-xs">
              <i class="fas ${typeIcon}"></i>
            </div>
            <div>
              <div class="font-extrabold text-white text-xs">${tx.product || 'Produk Q-Store'}</div>
              <div class="text-[10px] text-slate-400 font-medium">${dateStr}</div>
            </div>
          </div>
          <div>${badgeHtml}</div>
        </div>

        <!-- Info Tujuan & Total -->
        <div class="flex items-center justify-between text-[11px] pt-0.5">
          <div>
            <span class="text-slate-400">Tujuan:</span>
            <strong class="text-slate-200 font-mono ml-1">${tx.target}</strong>
          </div>
          <div>
            <span class="text-slate-400">Total:</span>
            <strong class="text-amber-400 font-bold ml-1">${totalText}</strong>
          </div>
        </div>

        ${plnCustHtml}
        ${plnTokenBox}

        <!-- Tombol Aksi -->
        <div class="flex items-center gap-2 pt-2 border-t border-slate-800/70">
          <button type="button" onclick="openHistoryReceipt('${tx.id || tx.trxid}')" class="flex-1 py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm">
            <i class="fas fa-receipt text-xs text-amber-400"></i> Buka Struk
          </button>
          <button type="button" onclick="shareHistoryReceiptWA('${tx.id || tx.trxid}')" class="flex-1 py-1.5 px-2.5 bg-emerald-700/60 hover:bg-emerald-600 text-emerald-100 hover:text-white font-bold rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm">
            <i class="fab fa-whatsapp text-xs text-emerald-300"></i> Kirim Struk WA
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function copyHistoryToken(tokenText, btn) {
  if (!tokenText) return;
  const clean = tokenText.replace(/[^0-9]/g, '');
  const formatted = clean.length === 20 ? clean.match(/.{1,4}/g).join('-') : tokenText;
  navigator.clipboard.writeText(formatted).then(() => {
    if (btn) {
      const orig = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-check"></i> 20 Digit Kode Token Berhasil Disalin!';
      btn.classList.remove('from-emerald-600', 'to-teal-600');
      btn.classList.add('from-teal-700', 'to-emerald-700');
      setTimeout(() => {
        btn.innerHTML = orig;
        btn.classList.add('from-emerald-600', 'to-teal-600');
        btn.classList.remove('from-teal-700', 'to-emerald-700');
      }, 2500);
    }
    showToast('20 Digit Kode Token berhasil disalin!', 'success');
  }).catch(() => {
    showToast('Silakan salin token secara manual', 'info');
  });
}

async function checkHistoryVipToken(trxid, btn) {
  if (!trxid) {
    showToast('ID Transaksi tidak ditemukan', 'info');
    return;
  }
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menghubungi Server PLN...';
  }

  const vipKey = (typeof QRELOAD_CONFIG !== 'undefined' && QRELOAD_CONFIG.vipApiKey) || 'yRVpjMIge62BmjuBL4KfpfQxF5y4ZV3dhSNtrLeB6Bpj1gN6r9Hyhs2ybUgfyiYg';
  const vipSign = (typeof QRELOAD_CONFIG !== 'undefined' && QRELOAD_CONFIG.vipSign) || '9cd98abdf2bb6f55fddeb3f1094ff6ee';

  const isLocal = isLocalNetworkEnv();
  const endpoints = isLocal
    ? ['/api-vip-proxy', 'https://portalanggota.netlify.app/api-vip/prepaid', 'https://portalanggota.netlify.app/api-vip-proxy']
    : ['/api-vip/prepaid', '/api-vip-proxy', '/.netlify/functions/vip-order', 'https://portalanggota.netlify.app/api-vip-proxy'];

  let found = false;
  for (const ep of endpoints) {
    try {
      const statusBody = new URLSearchParams();
      statusBody.append('key', vipKey);
      statusBody.append('sign', vipSign);
      statusBody.append('type', 'status');
      statusBody.append('trxid', trxid);

      const resp = await fetch(ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: statusBody
      });
      if (resp.ok) {
        const resText = await resp.text();
        let resJson = null;
        try {
          const firstBrace = resText.indexOf('{');
          const lastBrace = resText.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            resJson = JSON.parse(resText.substring(firstBrace, lastBrace + 1));
          } else {
            resJson = JSON.parse(resText);
          }
        } catch(eParse) {
          console.warn('JSON parse error in checkHistoryVipToken:', eParse, resText);
        }

        if (resJson && resJson.result && resJson.data) {
          const item = Array.isArray(resJson.data) ? resJson.data[0] : resJson.data;
          if (item) {
            const rawNote = (item.note || item.sn || item.token || '').trim();
            const statusStr = String(item.status || '').toLowerCase();
            const isFailed = statusStr.includes('gagal') || statusStr.includes('failed') || statusStr.includes('cancel');

            if (isFailed) {
              const hist = getQReloadHistory();
              const idx = hist.findIndex(x => x.trxid === trxid || x.id === trxid);
              if (idx !== -1) {
                hist[idx].status = 'failed';
                hist[idx].note = rawNote || 'Dibatalkan oleh operator';
                localStorage.setItem(QRELOAD_HISTORY_KEY, JSON.stringify(hist));
              }
              renderQReloadHistory();
              updateQReloadHistoryBadge();
              showToast('Status: Transaksi Dibatalkan / Gagal', 'error');
              found = true;
              break;
            }

            const parsed = parsePlnTokenNote(rawNote);
            if (parsed.token) {
              const token20 = parsed.token;
              const hist = getQReloadHistory();
              const idx = hist.findIndex(x => x.trxid === trxid || x.id === trxid);
              if (idx !== -1) {
                hist[idx].token = token20;
                if (parsed.custName) hist[idx].custName = parsed.custName;
                if (parsed.tarif) hist[idx].tarif = parsed.tarif;
                if (parsed.kwh) hist[idx].kwh = parsed.kwh;
                hist[idx].status = 'success';
                localStorage.setItem(QRELOAD_HISTORY_KEY, JSON.stringify(hist));
              }
              renderQReloadHistory();
              updateQReloadHistoryBadge();
              showToast('20 Digit Kode Token berhasil didapatkan!', 'success');
              found = true;
              break;
            }
          }
        }
      }
    } catch (e) {
      console.warn('Err checkHistoryVipToken:', e);
    }
  }

  if (!found) {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-sync-alt"></i> Cek &amp; Tampilkan Token';
    }
    showToast('Token belum diterbitkan server PLN, mohon tunggu sebentar lalu cek lagi.', 'info');
  }
}

function openHistoryReceipt(txId) {
  const hist = getQReloadHistory();
  const tx = hist.find(x => x.id === txId || x.trxid === txId);
  if (!tx) {
    showToast('Transaksi tidak ditemukan', 'error');
    return;
  }
  openDirectReceipt({
    target: tx.target,
    product: tx.product,
    total: tx.total,
    token: tx.token,
    custName: tx.custName,
    tarif: tx.tarif,
    kwh: tx.kwh,
    trxid: tx.trxid || tx.id,
    isPln: tx.isPln
  });
}

function shareHistoryReceiptWA(txId) {
  const hist = getQReloadHistory();
  const tx = hist.find(x => x.id === txId || x.trxid === txId);
  if (!tx) {
    showToast('Transaksi tidak ditemukan', 'error');
    return;
  }
  let dateStr = '-';
  try {
    if (tx.date) dateStr = new Date(tx.date).toLocaleString('id-ID');
  } catch(e) { dateStr = tx.date || '-'; }

  const isPln = tx.isPln || (tx.product && tx.product.toUpperCase().includes('PLN'));

  let waText = `*STRUK RESMI PEMBELIAN Q-STORE TEATER Q*\n` +
    `-----------------------------------------\n` +
    `Tanggal: ${dateStr}\n` +
    `Produk: ${tx.product}\n` +
    `No. Tujuan / IDPEL: ${tx.target}\n` +
    (isPln && tx.custName ? `Nama Pelanggan: ${tx.custName}\n` : '') +
    (isPln && tx.tarif ? `Tarif/Daya: ${tx.tarif}\n` : '') +
    (isPln && tx.kwh ? `Daya KWh: ${tx.kwh}\n` : '') +
    `Total Bayar: Rp ${Number(tx.total || 0).toLocaleString('id-ID')}\n` +
    `Status: ${tx.status === 'success' ? 'BERHASIL LUNAS' : 'SEDANG DIPROSES'}\n`;

  if (isPln) {
    const cleanDigits = (tx.token || '').replace(/[^0-9]/g, '');
    if (cleanDigits.length === 20) {
      const formattedToken = cleanDigits.match(/.{1,4}/g).join('-');
      waText += `-----------------------------------------\n` +
        `*KODE TOKEN LISTRIK (20 DIGIT):*\n` +
        `*${formattedToken}*\n` +
        `-----------------------------------------\n` +
        `_Ketik 20 angka di atas pada keypad meteran listrik Anda lalu tekan ENTER._\n`;
    }
  }

  waText += `\nTerima kasih telah bertransaksi di Q-Store. Sebagian laba otomatis masuk ke Kas Dana Abadi Teater Q.`;
  const waUrl = `https://wa.me/6285645829346?text=${encodeURIComponent(waText)}`;
  window.open(waUrl, '_blank');
}

function clearQReloadLocalHistory() {
  const modal = document.getElementById('qreloadConfirmClearModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  } else {
    // Fallback jika modal DOM belum termuat
    localStorage.removeItem(QRELOAD_HISTORY_KEY);
    renderQReloadHistory();
    updateQReloadHistoryBadge();
    showToast('Riwayat transaksi di perangkat ini telah dibersihkan', 'info');
  }
}

function closeConfirmClearHistory() {
  const modal = document.getElementById('qreloadConfirmClearModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function executeClearQReloadHistory() {
  closeConfirmClearHistory();
  localStorage.removeItem(QRELOAD_HISTORY_KEY);
  renderQReloadHistory();
  updateQReloadHistoryBadge();
  showToast('Riwayat transaksi di perangkat ini telah dibersihkan', 'info');
}

window.getQReloadHistory = getQReloadHistory;
window.saveQReloadTransaction = saveQReloadTransaction;
window.updateQReloadHistoryBadge = updateQReloadHistoryBadge;
window.switchQReloadMainView = switchQReloadMainView;
window.renderQReloadHistory = renderQReloadHistory;
window.copyHistoryToken = copyHistoryToken;
window.checkHistoryVipToken = checkHistoryVipToken;
window.openHistoryReceipt = openHistoryReceipt;
window.shareHistoryReceiptWA = shareHistoryReceiptWA;
window.clearQReloadLocalHistory = clearQReloadLocalHistory;
window.closeConfirmClearHistory = closeConfirmClearHistory;
window.executeClearQReloadHistory = executeClearQReloadHistory;

// ==========================================
// MODUL EKSPOR STRUK & TANDA TERIMA DIGITAL (PNG HD via html2canvas)
// ==========================================
async function captureAndDownloadReceipt(elementId, defaultFileName) {
  const el = document.getElementById(elementId);
  if (!el) {
    if (typeof showToast === 'function') showToast('Elemen struk tidak ditemukan', 'error');
    return;
  }
  if (typeof html2canvas === 'undefined') {
    if (typeof showToast === 'function') showToast('Modul gambar struk sedang dimuat, silakan coba 2 detik lagi...', 'warning');
    return;
  }

  if (typeof showToast === 'function') showToast('Sedang membuat gambar struk resolusi tinggi...', 'info');

  try {
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      logging: false,
      ignoreElements: (node) => {
        if (node.classList && node.classList.contains('struk-no-export')) return true;
        return false;
      }
    });

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = defaultFileName;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (typeof showToast === 'function') showToast('Gambar berhasil disimpan ke galeri/unduhan HP!', 'success');
  } catch (err) {
    console.error('Download struk error:', err);
    if (typeof showToast === 'function') showToast('Gagal memproses gambar otomatis. Silakan tangkap layar (screenshot).', 'error');
  }
}

function downloadStrukQReloadImage() {
  const targetEl = document.getElementById('qreloadSuccessTarget');
  const targetStr = (targetEl ? targetEl.textContent.trim().replace(/[^a-zA-Z0-9]/g, '_') : 'Transaksi');
  const fname = `Struk_QStore_${targetStr}_${Date.now().toString().slice(-6)}.png`;
  captureAndDownloadReceipt('qreloadSuccessPrintArea', fname);
}

function downloadStrukInfakImage() {
  const donaturEl = document.getElementById('suksesNamaDonatur');
  const donaturStr = (donaturEl ? donaturEl.textContent.trim().replace(/[^a-zA-Z0-9]/g, '_') : 'Donatur');
  const fname = `Tanda_Terima_Infak_TeaterQ_${donaturStr}.png`;
  captureAndDownloadReceipt('infakSuccessPrintArea', fname);
}

function downloadTiketVoucherImage() {
  const kodeEl = document.getElementById('tiketSuccessKode');
  const kodeStr = (kodeEl ? kodeEl.textContent.trim().replace(/[^a-zA-Z0-9]/g, '_') : 'Tiket');
  const fname = `ETiket_TeaterQ_${kodeStr}.png`;
  captureAndDownloadReceipt('tiketSuccessPrintArea', fname);
}

window.captureAndDownloadReceipt = captureAndDownloadReceipt;
window.downloadStrukQReloadImage = downloadStrukQReloadImage;
window.downloadStrukInfakImage = downloadStrukInfakImage;
window.downloadTiketVoucherImage = downloadTiketVoucherImage;

window.fetchPentasSetting = fetchPentasSetting;
window.applyPentasSettingUI = applyPentasSettingUI;

// Auto-render & fetch pentas setting from Google Sheet saat halaman dimuat
try {
  applyPentasSettingUI();
} catch (e) {}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    applyPentasSettingUI();
    fetchPentasSetting();
  });
} else {
  applyPentasSettingUI();
  fetchPentasSetting();
}

// ============================================================================
// MODUL KOTAK SETOR DOKUMENTASI (BULK FOTO & VIDEO KE GOOGLE DRIVE)
// ============================================================================
let selectedDokumenFiles = [];
let isUploadingDokumen = false;
let cancelUploadRequested = false;
let currentUploadAbortController = null;

function openModalSetorDokumentasi() {
  const modal = document.getElementById('modalUploadDokumentasi');
  if (!modal) return;

  const successBox = document.getElementById('setorDokumenSuccessBox');
  if (successBox && !successBox.classList.contains('hidden') && !isUploadingDokumen) {
    resetFormSetorDokumentasi();
  }

  const tglInput = document.getElementById('setorDokumenTanggal');
  if (tglInput && !tglInput.value) {
    const today = new Date().toISOString().split('T')[0];
    tglInput.value = today;
  }

  const uploaderInput = document.getElementById('setorDokumenPengunggah');
  if (uploaderInput && !uploaderInput.value) {
    try {
      const activeUser = (typeof currentUser !== 'undefined' && currentUser)
        ? (currentUser.nama || currentUser.name || '')
        : (localStorage.getItem('teaterq_user_name') || '');
      if (activeUser) uploaderInput.value = activeUser;
    } catch (e) {}
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  modal.classList.add('opening');
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => {
    modal.classList.remove('opacity-0');
    modal.classList.add('opacity-100');
    setTimeout(() => modal.classList.remove('opening'), 280);
  });
}

function closeModalSetorDokumentasi() {
  if (isUploadingDokumen) {
    const confirmBox = document.getElementById('dialogConfirmBatalUpload');
    if (confirmBox) {
      confirmBox.classList.remove('hidden');
      confirmBox.classList.add('flex');
    }
    return;
  }
  const successBox = document.getElementById('setorDokumenSuccessBox');
  if (successBox && !successBox.classList.contains('hidden')) {
    resetFormSetorDokumentasi();
  }
  forceCloseModalSetorDokumentasi();
}

function finishAndCloseModalSetorDokumentasi() {
  resetFormSetorDokumentasi();
  forceCloseModalSetorDokumentasi();
}

function continueUploadingDokumen() {
  const confirmBox = document.getElementById('dialogConfirmBatalUpload');
  if (confirmBox) {
    confirmBox.classList.add('hidden');
    confirmBox.classList.remove('flex');
  }
}

function forceCancelUploadingDokumen() {
  cancelUploadRequested = true;
  if (currentUploadAbortController) {
    try {
      currentUploadAbortController.abort();
    } catch (e) {}
  }
  continueUploadingDokumen();
  forceCloseModalSetorDokumentasi();
  isUploadingDokumen = false;

  const footerNormal = document.getElementById('setorDokumenFooterNormal');
  const footerSuccess = document.getElementById('setorDokumenFooterSuccess');
  if (footerNormal) footerNormal.classList.remove('hidden');
  if (footerSuccess) {
    footerSuccess.classList.add('hidden');
    footerSuccess.classList.remove('flex');
  }

  const btnUpload = document.getElementById('btnStartUploadDokumen');
  if (btnUpload) {
    btnUpload.disabled = false;
    btnUpload.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> <span>Mulai Unggah ke Drive</span>';
  }

  const progressBox = document.getElementById('setorDokumenProgressBox');
  if (progressBox) progressBox.classList.add('hidden');

  if (typeof showToast === 'function') {
    showToast('Pengunggahan berkas telah dibatalkan.', 'warning');
  }
}

function forceCloseModalSetorDokumentasi() {
  const modal = document.getElementById('modalUploadDokumentasi');
  if (modal) {
    modal.classList.add('closing');
    modal.classList.add('opacity-0');
    modal.classList.remove('opacity-100');
    setTimeout(() => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      modal.classList.remove('closing');
      document.body.style.overflow = '';
    }, 200);
  }
}

function handleDokumenFileSelect(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const exists = selectedDokumenFiles.some(item => item.name === f.name && item.size === f.size);
    if (!exists) {
      selectedDokumenFiles.push(f);
    }
  }

  event.target.value = '';
  renderSelectedDokumenPreviews();
}

function renderSelectedDokumenPreviews() {
  const previewSec = document.getElementById('setorDokumenPreviewSection');
  const previewGrid = document.getElementById('setorDokumenPreviewGrid');
  const countText = document.getElementById('setorDokumenCountText');
  if (!previewSec || !previewGrid) return;

  if (selectedDokumenFiles.length === 0) {
    previewSec.classList.add('hidden');
    previewGrid.innerHTML = '';
    return;
  }

  previewSec.classList.remove('hidden');

  let imgCount = 0;
  let vidCount = 0;
  let totalBytes = 0;

  previewGrid.innerHTML = selectedDokumenFiles.map((file, idx) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (isImage) imgCount++;
    if (isVideo) vidCount++;
    totalBytes += file.size;

    const sizeStr = (file.size > 1024 * 1024)
      ? (file.size / (1024 * 1024)).toFixed(1) + ' MB'
      : Math.round(file.size / 1024) + ' KB';

    let iconOrThumb = isImage
      ? `<img src="${URL.createObjectURL(file)}" class="w-9 h-9 object-cover rounded-lg border border-slate-700 shrink-0" alt="thumb" />`
      : `<div class="w-9 h-9 bg-purple-900/60 text-purple-300 rounded-lg flex items-center justify-center text-sm border border-purple-500/30 shrink-0"><i class="fa-solid fa-video"></i></div>`;

    return `
      <div class="relative bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-2 flex items-center gap-2 group text-left">
        ${iconOrThumb}
        <div class="min-w-0 flex-1">
          <p class="text-[11px] font-bold text-white truncate" title="${file.name}">${file.name}</p>
          <span class="text-[9px] text-slate-400 font-mono">${sizeStr}</span>
        </div>
        <button type="button" onclick="removeSelectedDokumenFile(${idx})" class="w-5 h-5 rounded-full bg-slate-800 hover:bg-red-500 text-slate-400 hover:text-white flex items-center justify-center text-[10px] shrink-0 transition-colors" title="Hapus berkas ini">
          &times;
        </button>
      </div>
    `;
  }).join('');

  const totalSizeStr = (totalBytes > 1024 * 1024)
    ? (totalBytes / (1024 * 1024)).toFixed(1) + ' MB'
    : Math.round(totalBytes / 1024) + ' KB';

  if (countText) {
    countText.textContent = `${selectedDokumenFiles.length} berkas (${imgCount} foto, ${vidCount} video • ${totalSizeStr})`;
  }
}

function removeSelectedDokumenFile(index) {
  if (index >= 0 && index < selectedDokumenFiles.length) {
    selectedDokumenFiles.splice(index, 1);
    renderSelectedDokumenPreviews();
  }
}

function clearSelectedDokumenFiles() {
  selectedDokumenFiles = [];
  renderSelectedDokumenPreviews();
}

function updateSetorDokumenQualityStyles() {
  const compRadio = document.querySelector('input[name="setorDokumenQuality"][value="compressed"]');
  const compLabel = document.getElementById('lblQualityCompressed');
  const origLabel = document.getElementById('lblQualityOriginal');
  if (compRadio && compLabel && origLabel) {
    if (compRadio.checked) {
      compLabel.className = "flex items-start gap-2.5 p-2.5 rounded-xl bg-indigo-950/50 border border-indigo-500/40 cursor-pointer hover:border-indigo-400 transition-colors";
      origLabel.className = "flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors";
    } else {
      origLabel.className = "flex items-start gap-2.5 p-2.5 rounded-xl bg-indigo-950/50 border border-indigo-500/40 cursor-pointer hover:border-indigo-400 transition-colors";
      compLabel.className = "flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors";
    }
  }
}

function resetFormSetorDokumentasi() {
  selectedDokumenFiles = [];
  renderSelectedDokumenPreviews();
  const formAcara = document.getElementById('setorDokumenAcara');
  if (formAcara) formAcara.value = '';
  const fileInput = document.getElementById('setorDokumenFileInput');
  if (fileInput) fileInput.value = '';

  const defaultRadio = document.querySelector('input[name="setorDokumenQuality"][value="compressed"]');
  if (defaultRadio) defaultRadio.checked = true;
  updateSetorDokumenQualityStyles();

  const progressBox = document.getElementById('setorDokumenProgressBox');
  if (progressBox) progressBox.classList.add('hidden');

  const successBox = document.getElementById('setorDokumenSuccessBox');
  if (successBox) successBox.classList.add('hidden');

  const footerNormal = document.getElementById('setorDokumenFooterNormal');
  const footerSuccess = document.getElementById('setorDokumenFooterSuccess');
  if (footerNormal) footerNormal.classList.remove('hidden');
  if (footerSuccess) {
    footerSuccess.classList.add('hidden');
    footerSuccess.classList.remove('flex');
  }

  const btnUpload = document.getElementById('btnStartUploadDokumen');
  if (btnUpload) {
    btnUpload.disabled = false;
    btnUpload.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> <span>Mulai Unggah ke Drive</span>';
  }
}

function compressImageForDrive(file, qualityMode = 'original') {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return readFileAsBase64(file).then(resolve).catch(reject);
    }

    // MODE ARSIP: Jika file di bawah 12 MB dan mode 'original', unggah 100% ASLI tanpa kompresi!
    if (qualityMode === 'original') {
      const MAX_ORIGINAL_BYTES = 12 * 1024 * 1024; // 12 MB batas aman request
      if (file.size <= MAX_ORIGINAL_BYTES) {
        return readFileAsBase64(file).then(resolve).catch(reject);
      }
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        // Mode Asli: batas resolusi 4K (3840px) dan quality 0.94 (lossless visual)
        // Mode Hemat: batas resolusi Full HD (1920px) dan quality 0.82
        const isOriginal = (qualityMode === 'original');
        const MAX_DIM = isOriginal ? 3840 : 1920;
        const JPEG_QUALITY = isOriginal ? 0.94 : 0.82;

        let width = img.width;
        let height = img.height;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
        resolve(compressedBase64);
      };
      img.onerror = () => readFileAsBase64(file).then(resolve).catch(reject);
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const res = (e && e.target && e.target.result) || reader.result;
        resolve(res);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

async function startUploadDokumentasi() {
  if (isUploadingDokumen) return;

  const yearEl = document.getElementById('setorDokumenTahun');
  const tglEl = document.getElementById('setorDokumenTanggal');
  const acaraEl = document.getElementById('setorDokumenAcara');
  const uploaderEl = document.getElementById('setorDokumenPengunggah');
  const qualityRadio = document.querySelector('input[name="setorDokumenQuality"]:checked');

  const yearVal = (yearEl && yearEl.value) || new Date().getFullYear().toString();
  const tglVal = (tglEl && tglEl.value) || new Date().toISOString().split('T')[0];
  const acaraVal = (acaraEl && acaraEl.value.trim()) || '';
  const uploaderVal = (uploaderEl && uploaderEl.value.trim()) || 'Anggota Teater Q';
  const qualityMode = qualityRadio ? qualityRadio.value : 'compressed';

  if (!acaraVal) {
    if (typeof showToast === 'function') showToast('Mohon isi nama acara/kegiatan terlebih dahulu!', 'warning');
    if (acaraEl) acaraEl.focus();
    return;
  }

  if (selectedDokumenFiles.length === 0) {
    if (typeof showToast === 'function') showToast('Silakan pilih minimal 1 foto atau video!', 'warning');
    return;
  }

  const endpointUrl = (typeof URL_QDRIVE_UPLOAD !== 'undefined' && URL_QDRIVE_UPLOAD)
    ? URL_QDRIVE_UPLOAD
    : ((typeof SCRIPT_MARKETPLACE !== 'undefined' && SCRIPT_MARKETPLACE) ? SCRIPT_MARKETPLACE : '');

  if (!endpointUrl) {
    if (typeof showToast === 'function') {
      showToast('Endpoint Google Apps Script belum dikonfigurasi!', 'error');
    }
    return;
  }

  isUploadingDokumen = true;
  cancelUploadRequested = false;
  const btnUpload = document.getElementById('btnStartUploadDokumen');
  const progressBox = document.getElementById('setorDokumenProgressBox');
  const successBox = document.getElementById('setorDokumenSuccessBox');
  const progressBar = document.getElementById('setorDokumenProgressBar');
  const progressPercent = document.getElementById('setorDokumenProgressPercent');
  const progressStatus = document.getElementById('setorDokumenProgressStatus');
  const progressDetail = document.getElementById('setorDokumenProgressDetail');

  if (btnUpload) {
    btnUpload.disabled = true;
    btnUpload.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> <span>Mengunggah...</span>';
  }

  if (progressBox) progressBox.classList.remove('hidden');
  if (successBox) successBox.classList.add('hidden');

  let successCount = 0;
  let failCount = 0;
  let lastFolderUrl = '';
  let lastFolderName = '';
  const totalFiles = selectedDokumenFiles.length;

  for (let i = 0; i < totalFiles; i++) {
    if (cancelUploadRequested) break;

    const file = selectedDokumenFiles[i];
    const currentNum = i + 1;
    const pct = Math.round(((currentNum - 1) / totalFiles) * 100);

    if (progressBar) progressBar.style.width = pct + '%';
    if (progressPercent) progressPercent.textContent = pct + '%';
    if (progressStatus) progressStatus.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin text-indigo-400"></i> Mengunggah ${currentNum} dari ${totalFiles}...`;
    if (progressDetail) progressDetail.textContent = `Memproses: ${file.name} (${(file.size / 1024).toFixed(0)} KB)`;

    try {
      if (cancelUploadRequested) break;

      let base64Data = '';
      if (file.type.startsWith('image/')) {
        if (progressDetail) {
          progressDetail.textContent = (qualityMode === 'original')
            ? `Menyiapkan resolusi asli (Ultra HD): ${file.name}...`
            : `Mengompresi foto hemat kuota: ${file.name}...`;
        }
        base64Data = await compressImageForDrive(file, qualityMode);
      } else {
        if (progressDetail) progressDetail.textContent = `Menyiapkan video: ${file.name}...`;
        base64Data = await readFileAsBase64(file);
      }

      if (cancelUploadRequested) break;

      if (progressDetail) progressDetail.textContent = `Mengirim ke Q-Drive: ${file.name}...`;

      const payload = {
        action: 'upload_documentation',
        year: yearVal,
        eventName: acaraVal,
        eventDate: tglVal,
        uploaderName: uploaderVal,
        fileName: file.name,
        mimeType: file.type || 'image/jpeg',
        base64Data: base64Data,
        skip_sheet: true,
        no_sheet_log: true
      };

      currentUploadAbortController = new AbortController();
      const resp = await fetch(endpointUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        signal: currentUploadAbortController.signal
      });
      currentUploadAbortController = null;

      if (cancelUploadRequested) break;

      if (resp.ok) {
        let resJson = null;
        try {
          resJson = await resp.json();
        } catch (jsonErr) {
          console.warn('Respon server bukan format JSON (kemungkinan koneksi terputus atau dialihkan ke GET saat tab berpindah):', jsonErr);
        }
        if (resJson && resJson.result === 'success') {
          successCount++;
          if (resJson.folderUrl) lastFolderUrl = resJson.folderUrl;
          if (resJson.folderName) lastFolderName = resJson.folderName;
          const pctDone = Math.round((currentNum / totalFiles) * 100);
          if (progressBar) progressBar.style.width = pctDone + '%';
          if (progressPercent) progressPercent.textContent = pctDone + '%';
          if (progressDetail) progressDetail.textContent = `Tersimpan: ${file.name} (${currentNum}/${totalFiles})`;

          // SIMPAN LOG DOKUMENTASI RESMI KE SUPABASE CLOUD (public.log_dokumentasi)
          if (window.SupabaseDB && window.SupabaseDB.isConfigured()) {
            const waktuUploadStr = new Date().toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
            const fileLink = resJson.fileUrl || resJson.url || resJson.link || resJson.viewUrl || resJson.webContentLink || '';
            const folderLink = resJson.folderUrl || lastFolderUrl || '';
            window.SupabaseDB.createLogDokumentasi({
              id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
              waktu_upload: waktuUploadStr,
              tahun: yearVal,
              nama_kegiatan: acaraVal,
              tanggal_kegiatan: tglVal,
              pengunggah: uploaderVal,
              nama_file: file.name,
              tipe_file: (file.type && file.type.startsWith('video/')) ? 'Video' : 'Foto',
              link_file: fileLink,
              link_folder: folderLink,
              timestamp: new Date().toISOString()
            }).then(() => {
              console.log('[Supabase] Log dokumentasi berhasil disimpan:', file.name);
            }).catch(e => {
              console.warn('[Supabase] Gagal catat log dokumentasi:', e);
            });
          }
        } else {
          console.warn('Server error on file ' + file.name, resJson);
          failCount++;
        }
      } else {
        failCount++;
      }
    } catch (err) {
      if (cancelUploadRequested) break;
      console.error('Gagal mengunggah file ' + file.name, err);
      failCount++;
    }
  }

  isUploadingDokumen = false;
  if (cancelUploadRequested) return;

  if (progressBar) progressBar.style.width = '100%';
  if (progressPercent) progressPercent.textContent = '100%';

  if (progressBox) progressBox.classList.add('hidden');

  if (successCount > 0) {
    // Kosongkan daftar berkas agar aman dari unggah ganda
    selectedDokumenFiles = [];
    renderSelectedDokumenPreviews();
    const fileInput = document.getElementById('setorDokumenFileInput');
    if (fileInput) fileInput.value = '';

    if (successBox) {
      successBox.classList.remove('hidden');
      const textEl = document.getElementById('setorDokumenSuccessText');
      if (textEl) {
        textEl.textContent = `${successCount} berkas berhasil diarsipkan ke subfolder "${lastFolderName || acaraVal}" di Google Drive tahun ${yearVal}.`;
      }
      const linkBtn = document.getElementById('btnBukaFolderDrive');
      if (linkBtn) {
        linkBtn.href = lastFolderUrl || `https://drive.google.com/drive/folders/1zJ2jeJWo_JQJzgMxAozhHE9BwJSTP0sr`;
      }
    }

    // Alihkan footer ke mode Sukses (Tombol terpisah total dari tombol Mulai Unggah)
    const footerNormal = document.getElementById('setorDokumenFooterNormal');
    const footerSuccess = document.getElementById('setorDokumenFooterSuccess');
    if (footerNormal) footerNormal.classList.add('hidden');
    if (footerSuccess) {
      footerSuccess.classList.remove('hidden');
      footerSuccess.classList.add('flex');
    }

    // Kirim Notifikasi Real-time ke Bot Telegram Admin Teater Q
    try {
      const waktuStr = new Date().toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
      const folderTargetUrl = lastFolderUrl || `https://drive.google.com/drive/folders/1zJ2jeJWo_JQJzgMxAozhHE9BwJSTP0sr`;

      const msgQDrive = `📸 <b>SETOR DOKUMENTASI Q-DRIVE MASUK!</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `👑 <b>Nama Acara:</b> ${escapeHtml(acaraVal)}\n` +
        `📅 <b>Tahun Kegiatan:</b> ${escapeHtml(yearVal)} (${escapeHtml(tglVal || "-")})\n` +
        `👤 <b>Penyetor / Kru:</b> ${escapeHtml(uploaderVal || "Kru Teater Q")}\n` +
        `📁 <b>Jumlah Berkas:</b> ${successCount} Foto / Video\n` +
        `📂 <b>Folder Q-Drive:</b> <a href="${folderTargetUrl}">Buka Folder di Google Drive</a>\n` +
        `⏰ <b>Waktu:</b> ${waktuStr} WIB\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `<i>Dokumentasi kegiatan resmi UKM Paguyuban Teater Q</i>`;

      if (typeof sendTelegramAdminNotification === "function") {
        sendTelegramAdminNotification(msgQDrive);
      }
    } catch (errNotif) {
      console.warn("Gagal mengirim notif Telegram Q-Drive:", errNotif);
    }

    if (btnUpload) {
      btnUpload.disabled = false;
      btnUpload.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> <span>Mulai Unggah ke Drive</span>';
    }

    if (typeof showToast === 'function') {
      showToast(`Sukses! ${successCount} berkas tersimpan ke Google Drive.`, 'success');
    }
  } else {
    if (typeof showToast === 'function') {
      showToast('Maaf, pengunggahan berkas gagal. Silakan periksa koneksi internet atau coba lagi.', 'error');
    }
    if (btnUpload) {
      btnUpload.disabled = false;
      btnUpload.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> <span>Coba Unggah Lagi</span>';
    }
  }
}

window.openModalSetorDokumentasi = openModalSetorDokumentasi;
window.closeModalSetorDokumentasi = closeModalSetorDokumentasi;
window.finishAndCloseModalSetorDokumentasi = finishAndCloseModalSetorDokumentasi;
window.continueUploadingDokumen = continueUploadingDokumen;
window.forceCancelUploadingDokumen = forceCancelUploadingDokumen;
window.forceCloseModalSetorDokumentasi = forceCloseModalSetorDokumentasi;
window.handleDokumenFileSelect = handleDokumenFileSelect;
window.removeSelectedDokumenFile = removeSelectedDokumenFile;
window.clearSelectedDokumenFiles = clearSelectedDokumenFiles;
window.resetFormSetorDokumentasi = resetFormSetorDokumentasi;
window.startUploadDokumentasi = startUploadDokumentasi;
window.updateSetorDokumenQualityStyles = updateSetorDokumenQualityStyles;

// ==========================================================================
// PANEL & LOGIKA 1-KLIK ACC PULSA ADMIN Q-STORE
// ==========================================================================
window.currentAdminAccData = null;

function checkAdminAccUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('acc_qstore') === '1' || urlParams.get('acc') || urlParams.get('order_id')) {
    const orderId = urlParams.get('id') || urlParams.get('order_id') || urlParams.get('acc') || '';
    const target = urlParams.get('target') || '';
    const service = urlParams.get('service') || '';
    const prod = urlParams.get('prod') || '';
    const total = urlParams.get('total') || '';

    if (orderId && target) {
      setTimeout(() => {
        openModalAdminAccQStore({ orderId, target, service, prod, total });
      }, 400);
    }
  }
}

let isExecutingAdminAcc = false;

function markAdminAccModalAlreadyDone(orderId, refInfo) {
  const btn = document.getElementById('btnExecAdminAcc');
  const resBox = document.getElementById('adminAccResultBox');
  const resHeader = document.getElementById('adminAccResultHeader');
  const resMsg = document.getElementById('adminAccResultMessage');
  const snBox = document.getElementById('adminAccSnBox');

  if (btn) {
    btn.disabled = true;
    btn.className = "w-full py-3 px-4 bg-emerald-700 text-white font-black rounded-2xl text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 cursor-not-allowed";
    btn.innerHTML = '<i class="fa-solid fa-circle-check text-emerald-300"></i> <span>SUDAH DI-ACC (LUNAS / SELESAI)</span>';
  }

  if (resBox) {
    resBox.className = "p-4 rounded-2xl text-xs space-y-1.5 bg-emerald-950/90 border border-emerald-500/60 animate-fade-in";
    resBox.classList.remove('hidden');
  }
  if (resHeader) {
    resHeader.innerHTML = '<i class="fa-solid fa-shield-check text-emerald-400 text-base"></i> <span class="text-white font-bold">Pesanan Sudah Pernah Diproses!</span>';
  }
  if (resMsg) {
    resMsg.innerHTML = `Pesanan <strong>#${orderId}</strong> sudah sukses di-ACC dan pulsa telah dikirim sebelumnya.<br><span class="text-emerald-300 font-semibold"><i class="fa-solid fa-lock"></i> Tombol dinonaktifkan otomatis agar pulsa tidak terkirim dua kali.</span>`;
  }
  if (snBox && refInfo) {
    snBox.classList.remove('hidden');
    snBox.textContent = `Ref / TrxID: ${refInfo}`;
  }
}

function unlockAdminAccButton() {
  const btn = document.getElementById('btnExecAdminAcc');
  if (btn) {
    btn.disabled = false;
    btn.className = "w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-2xl text-xs sm:text-sm shadow-lg shadow-emerald-900/30 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer";
    btn.innerHTML = '<i class="fa-solid fa-bolt text-amber-300"></i> <span>TEMBAK PULSA SEKARANG</span>';
  }
}

function openModalAdminAccQStore(details) {
  window.currentAdminAccData = details;
  const modal = document.getElementById('modalAdminAccQStore');
  if (!modal) return;

  const idEl = document.getElementById('adminAccOrderIdText');
  const targetEl = document.getElementById('adminAccTargetText');
  const prodEl = document.getElementById('adminAccProductText');
  const totalEl = document.getElementById('adminAccTotalText');
  const saldoEl = document.getElementById('adminAccSaldoText');
  const waBtn = document.getElementById('btnWaAdminPembeli');
  const resBox = document.getElementById('adminAccResultBox');
  const btnExec = document.getElementById('btnExecAdminAcc');

  const orderId = details.orderId || '';

  if (idEl) idEl.textContent = '#' + (orderId || '-');
  if (targetEl) targetEl.textContent = details.target || '-';
  if (prodEl) prodEl.textContent = details.prod || 'Layanan Pulsa / Data';
  if (totalEl) totalEl.textContent = details.total ? `Rp ${Number(details.total).toLocaleString('id-ID')}` : '-';

  if (saldoEl) {
    const cachedBal = localStorage.getItem('teaterq_vip_balance');
    const finalBal = (typeof qreloadVipBalance !== 'undefined' && qreloadVipBalance > 0)
      ? qreloadVipBalance
      : (cachedBal && parseInt(cachedBal, 10) > 0 ? parseInt(cachedBal, 10) : 0);
    saldoEl.textContent = finalBal > 0 ? `Rp ${finalBal.toLocaleString('id-ID')}` : '-';
  }

  if (waBtn && details.target) {
    const cleanPhone = details.target.replace(/^0/, '62');
    waBtn.href = `https://wa.me/${cleanPhone}?text=${encodeURIComponent('Halo Kak, pesanan ' + details.prod + ' untuk nomor ' + details.target + ' sedang kami proses.')}`;
  }

  if (resBox) resBox.classList.add('hidden');

  // TIER 1: Cek cache lokal perangkat
  const isLocallyDone = orderId && localStorage.getItem('qstore_done_' + orderId);
  if (isLocallyDone) {
    markAdminAccModalAlreadyDone(orderId, 'Tercatat di riwayat lokal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    return;
  }

  // TIER 2: Set status memverifikasi dan cek status real-time ke Google Spreadsheet
  if (btnExec) {
    btnExec.disabled = true;
    btnExec.className = "w-full py-3 px-4 bg-slate-800 text-slate-400 font-bold rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 cursor-wait";
    btnExec.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin text-indigo-400"></i> <span>Memverifikasi Status Pesanan...</span>';
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');

  const scriptUrl = (typeof SCRIPT_MARKETPLACE !== 'undefined') ? SCRIPT_MARKETPLACE : '';
  if (scriptUrl && orderId) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    fetch(`${scriptUrl}?action=check_order_status&orderId=${encodeURIComponent(orderId)}&t=${Date.now()}`, {
      signal: controller.signal
    })
      .then(res => res.json())
      .then(resJson => {
        clearTimeout(timeout);
        if (resJson && resJson.isAlreadyProcessed) {
          localStorage.setItem('qstore_done_' + orderId, '1');
          markAdminAccModalAlreadyDone(orderId, resJson.trxid || '');
        } else {
          unlockAdminAccButton();
        }
      })
      .catch(() => {
        clearTimeout(timeout);
        unlockAdminAccButton();
      });
  } else {
    unlockAdminAccButton();
  }
}

function closeModalAdminAccQStore() {
  const modal = document.getElementById('modalAdminAccQStore');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('acc_qstore');
    url.searchParams.delete('id');
    url.searchParams.delete('target');
    url.searchParams.delete('service');
    url.searchParams.delete('prod');
    url.searchParams.delete('total');
    url.searchParams.delete('acc');
    url.searchParams.delete('order_id');
    window.history.replaceState({}, '', url.pathname);
  } catch(e){}
}

function copyAdminAccTarget() {
  const targetEl = document.getElementById('adminAccTargetText');
  const val = targetEl ? targetEl.textContent.trim() : '';
  if (!val || val === '-') return;
  navigator.clipboard.writeText(val).then(() => {
    if (typeof showToast === 'function') showToast(`Nomor ${val} berhasil disalin!`, 'success');
  }).catch(() => {
    if (typeof showToast === 'function') showToast(val, 'info');
  });
}

async function executeAdminAccOrder() {
  const data = window.currentAdminAccData;
  if (!data || !data.service || !data.target) {
    if (typeof showToast === 'function') showToast('Rincian kode produk atau nomor tujuan tidak ditemukan.', 'error');
    return;
  }

  const orderId = data.orderId || '';

  // PRE-EXECUTION GUARD: Cegah double click & cegah tembak dobel
  if (isExecutingAdminAcc) {
    if (typeof showToast === 'function') showToast('Sedang memproses transaksi, mohon tunggu sebentar...', 'warning');
    return;
  }
  if (orderId && localStorage.getItem('qstore_done_' + orderId)) {
    if (typeof showToast === 'function') showToast('Pesanan ini sudah pernah di-ACC sebelumnya!', 'warning');
    markAdminAccModalAlreadyDone(orderId, 'Tercatat di riwayat');
    return;
  }

  isExecutingAdminAcc = true;

  const btn = document.getElementById('btnExecAdminAcc');
  const resBox = document.getElementById('adminAccResultBox');
  const resHeader = document.getElementById('adminAccResultHeader');
  const resMsg = document.getElementById('adminAccResultMessage');
  const snBox = document.getElementById('adminAccSnBox');
  const waBtn = document.getElementById('btnWaAdminPembeli');

  if (btn) {
    btn.disabled = true;
    btn.className = "w-full py-3 px-4 bg-slate-800 text-slate-300 font-bold rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 cursor-wait";
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin text-emerald-400"></i> <span>Menghubungi Server VIP...</span>';
  }

  try {
    const vipKey = (typeof QRELOAD_CONFIG !== 'undefined' && QRELOAD_CONFIG.vipApiKey) || 'yRVpjMIge62BmjuBL4KfpfQxF5y4ZV3dhSNtrLeB6Bpj1gN6r9Hyhs2ybUgfyiYg';
    const vipSign = (typeof QRELOAD_CONFIG !== 'undefined' && QRELOAD_CONFIG.vipSign) || '9cd98abdf2bb6f55fddeb3f1094ff6ee';

    const orderBody = new URLSearchParams();
    orderBody.append('key', vipKey);
    orderBody.append('sign', vipSign);
    orderBody.append('type', 'order');
    orderBody.append('service', data.service);
    orderBody.append('data_no', data.target);

    const isLocal = isLocalNetworkEnv();
    const endpoints = isLocal
      ? [
          '/api-vip-proxy',
          'https://portalanggota.netlify.app/api-vip/prepaid',
          'https://portalanggota.netlify.app/api-vip-proxy'
        ]
      : [
          '/api-vip/prepaid',
          '/api-vip-proxy',
          '/.netlify/functions/vip-order',
          'https://portalanggota.netlify.app/api-vip-proxy'
        ];

    let vipRes = null;
    for (const ep of endpoints) {
      try {
        const resp = await fetch(ep, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: orderBody
        });
        if (resp.ok) {
          let text = await resp.text();
          let json = null;
          try {
            const firstBrace = text.indexOf('{');
            const lastBrace = text.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
              json = JSON.parse(text.substring(firstBrace, lastBrace + 1));
            } else {
              json = JSON.parse(text);
            }
          } catch(eParse) {}

          if (json) {
            vipRes = json;
            if (json.result === true) {
              break;
            }
            const msg = (json.message || '').toLowerCase();
            const isIpPermitErr = msg.includes('permit') || msg.includes('ip address') || msg.includes('whitelist');
            if (!isIpPermitErr) {
              break;
            }
          }
        }
      } catch (eEp) {}
    }

    if (vipRes && vipRes.result) {
      const vData = vipRes.data || {};
      if (resBox) {
        resBox.className = "p-4 rounded-2xl text-xs space-y-1.5 bg-emerald-950/80 border border-emerald-500/50 animate-fade-in";
        resBox.classList.remove('hidden');
      }
      if (resHeader) {
        resHeader.innerHTML = '<i class="fa-solid fa-circle-check text-emerald-400 text-base"></i> <span class="text-white font-bold">Pulsa Berhasil Ditembak!</span>';
      }
      if (resMsg) {
        resMsg.textContent = `Status: ${vData.status || 'Sukses'}. TrxID: ${vData.trxid || '-'}`;
      }
      if (snBox) {
        const snCode = vData.note || vData.sn || '';
        if (snCode) {
          snBox.classList.remove('hidden');
          snBox.textContent = `SN / Ref: ${snCode}`;
        }
      }

      if (orderId) {
        localStorage.setItem('qstore_done_' + orderId, '1');
      }

      if (btn) {
        btn.disabled = true;
        btn.className = "w-full py-3 px-4 bg-emerald-700 text-white font-black rounded-2xl text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 cursor-not-allowed";
        btn.innerHTML = '<i class="fa-solid fa-circle-check text-emerald-300"></i> <span>SUKSES TERKIRIM &amp; DI-ACC</span>';
      }

      if (waBtn && data.target) {
        const cleanPhone = data.target.replace(/^0/, '62');
        waBtn.href = `https://wa.me/${cleanPhone}?text=${encodeURIComponent('Halo Kak, pesanan pulsa ' + data.prod + ' untuk nomor ' + data.target + ' sudah BERHASIL kami kirim! Terima kasih telah bertransaksi di Q-Store Teater Q.')}`;
      }

      if (typeof showToast === 'function') showToast('Alhamdulillah, pulsa berhasil dikirim ke pembeli!', 'success');

      // Notifikasi ke Telegram grup
      try {
        if (typeof TELEGRAM_CONFIG !== 'undefined' && TELEGRAM_CONFIG.token) {
          fetch(`https://api.telegram.org/bot${TELEGRAM_CONFIG.token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: TELEGRAM_CONFIG.chatId,
              text: `✅ *PESANAN #${data.orderId} SUKSES DI-ACC ADMIN!*\n\n📱 *Nomor Tujuan:* \`${data.target}\`\n📦 *Produk:* ${data.prod}\n⚡ *TrxID:* \`${vData.trxid || '-'}\`\n🔢 *SN:* \`${vData.note || vData.sn || '-'}\`\n\n_Pengisian pulsa telah diproses langsung oleh Admin via Panel 1-Klik._`,
              parse_mode: 'Markdown'
            })
          });
        }
      } catch (eTel) {}

      // OTOMATIS UPDATE STATUS DI GOOGLE SPREADSHEET KE 'success' & CATAT TRXID/SN
      try {
        const scriptUrl = (typeof SCRIPT_MARKETPLACE !== 'undefined') ? SCRIPT_MARKETPLACE : '';
        if (scriptUrl && data.orderId) {
          const resolvedTrx = vData.trxid || '';
          const resolvedSn = vData.note || vData.sn || '';

          // 1. Kirim via POST
          fetch(scriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update_qstore_order',
              orderId: data.orderId,
              status: 'success',
              trxid: resolvedTrx,
              sn: resolvedSn
            })
          }).catch(() => {});

          // 2. Kirim juga via GET sebagai fallback URL parameter
          const getUrl = `${scriptUrl}?action=update_qstore_order&orderId=${encodeURIComponent(data.orderId)}&status=success&trxid=${encodeURIComponent(resolvedTrx)}&sn=${encodeURIComponent(resolvedSn)}`;
          fetch(getUrl, { mode: 'no-cors' }).catch(() => {});

          // Segarkan data laba kas sanggar
          setTimeout(() => {
            if (typeof fetchQStoreCentralProfit === 'function') {
              fetchQStoreCentralProfit(true);
            }
          }, 3500);
        }
      } catch (eUpSheet) {
        console.warn('Error sinkronisasi status ke Google Sheets:', eUpSheet);
      }

      if (typeof fetchVipBalanceBackground === 'function') {
        setTimeout(() => fetchVipBalanceBackground(true), 2500);
      }

    } else {
      const errMsg = vipRes?.message || 'Server VIP menolak transaksi';
      const isIpErr = errMsg.toLowerCase().includes('permit') || errMsg.toLowerCase().includes('ip address') || errMsg.toLowerCase().includes('whitelist');

      if (resBox) {
        resBox.className = "p-4 rounded-2xl text-xs space-y-2 bg-amber-950/80 border border-amber-500/50 animate-fade-in";
        resBox.classList.remove('hidden');
      }

      if (isIpErr) {
        if (resHeader) {
          resHeader.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-amber-400 text-base"></i> <span class="text-white font-bold">IP Belum Masuk Whitelist VIP</span>';
        }
        if (resMsg) {
          resMsg.innerHTML = 'Koneksi HP Anda saat ini ditolak oleh server VIP Reseller karena IP paket data dinamis.<br><br><strong>Solusi Praktis:</strong><br>1. Sambungkan HP ke WiFi Rumah/Kampus yang terdaftar, lalu klik Coba Tembak Lagi.<br>2. Atau buka link ini di PC Sanggar.<br>3. Atau klik tombol <strong>Web VIP</strong> di bawah untuk proses via web resmi.';
        }
      } else {
        if (resHeader) {
          resHeader.innerHTML = '<i class="fa-solid fa-circle-xmark text-rose-400 text-base"></i> <span class="text-white font-bold">Gagal Mengeksekusi</span>';
        }
        if (resMsg) resMsg.textContent = errMsg;
      }

      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> <span>Coba Tembak Lagi</span>';
      }
    }
  } catch (errExec) {
    console.error('Error executeAdminAccOrder:', errExec);
    if (resBox) {
      resBox.className = "p-4 rounded-2xl text-xs space-y-1.5 bg-rose-950/80 border border-rose-500/50 animate-fade-in";
      resBox.classList.remove('hidden');
    }
    if (resHeader) {
      resHeader.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-rose-400"></i> <span class="text-white font-bold">Kendala Jaringan</span>';
    }
    if (resMsg) resMsg.textContent = errExec.message || 'Gagal menghubungi server';
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> <span>Coba Lagi</span>';
    }
  } finally {
    isExecutingAdminAcc = false;
  }
}

window.checkAdminAccUrlParams = checkAdminAccUrlParams;
window.openModalAdminAccQStore = openModalAdminAccQStore;
window.closeModalAdminAccQStore = closeModalAdminAccQStore;
window.copyAdminAccTarget = copyAdminAccTarget;
window.executeAdminAccOrder = executeAdminAccOrder;

// ==========================================================================
// SMART ROTATING FLOATING WIDGET ALA SHOPEE (ROTASI TIAP 5 DETIK)
// ==========================================================================
const Q_FLOATING_ITEMS = [
  {
    id: 'pulsa',
    text: '⚡ Beli Pulsa & Token (24 Jam)',
    badge: 'Otomatis',
    badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    iconClass: 'fa-solid fa-bolt text-amber-300',
    btnGradient: 'bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700',
    glowGradient: 'from-emerald-500 to-teal-500',
    action: () => {
      if (typeof openModalQReload === 'function') openModalQReload();
    }
  },
  {
    id: 'iuran',
    text: '📋 Iuran Rutin Dana Abadi',
    badge: 'Iuran Rutin',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    iconClass: 'fa-solid fa-hand-holding-dollar text-amber-200',
    btnGradient: 'bg-gradient-to-br from-amber-500 via-orange-600 to-amber-700',
    glowGradient: 'from-amber-500 to-orange-500',
    action: () => {
      if (typeof openInfakModal === 'function') openInfakModal();
    }
  },
  {
    id: 'hibah',
    text: '🎁 Salurkan Dana Hibah',
    badge: 'Dana Hibah',
    badgeClass: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    iconClass: 'fa-solid fa-gift text-pink-200',
    btnGradient: 'bg-gradient-to-br from-pink-600 via-rose-600 to-red-600',
    glowGradient: 'from-pink-500 to-rose-500',
    action: () => {
      if (typeof openSawerKegiatanModal === 'function') openSawerKegiatanModal('', true);
      else if (typeof openInfakModal === 'function') openInfakModal();
    }
  },
  {
    id: 'merchandise',
    text: '🛍️ Merchandise Resmi Teater Q',
    badge: 'Katalog Baru',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    iconClass: 'fa-solid fa-shirt text-purple-200',
    btnGradient: 'bg-gradient-to-br from-purple-600 via-indigo-600 to-violet-700',
    glowGradient: 'from-purple-500 to-indigo-500',
    action: () => {
      if (typeof showPage === 'function') showPage('marketplace');
    }
  }
];

let qFloatingIndex = 0;
let qFloatingTimer = null;
let qFloatingIsPaused = false;

function initQShopeeFloatingWidget() {
  const widget = document.getElementById('qShopeeFloatingWidget');
  if (!widget) return;

  renderQFloatingItem(0);

  if (qFloatingTimer) clearInterval(qFloatingTimer);
  qFloatingTimer = setInterval(() => {
    if (qFloatingIsPaused) return;
    qFloatingIndex = (qFloatingIndex + 1) % Q_FLOATING_ITEMS.length;
    renderQFloatingItem(qFloatingIndex);
  }, 5000);

  widget.addEventListener('mouseenter', () => { qFloatingIsPaused = true; });
  widget.addEventListener('mouseleave', () => { qFloatingIsPaused = false; });
  widget.addEventListener('touchstart', () => { qFloatingIsPaused = true; }, { passive: true });
}

function renderQFloatingItem(index) {
  const item = Q_FLOATING_ITEMS[index];
  if (!item) return;

  const bubbleTag = document.getElementById('qFloatingBubbleTag');
  const tagText = document.getElementById('qFloatingTagText');
  const tagBadge = document.getElementById('qFloatingTagBadge');
  const mainBtn = document.getElementById('qFloatingMainBtn');
  const mainIcon = document.getElementById('qFloatingMainIcon');
  const iconGlow = document.getElementById('qFloatingIconGlow');

  if (bubbleTag) {
    bubbleTag.classList.add('opacity-0', '-translate-y-1');
    setTimeout(() => {
      if (tagText) tagText.innerHTML = item.text;
      if (tagBadge) {
        tagBadge.textContent = item.badge;
        tagBadge.className = `px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider border ${item.badgeClass}`;
      }
      bubbleTag.classList.remove('opacity-0', '-translate-y-1');
    }, 150);
  }

  if (mainBtn) {
    mainBtn.className = `relative w-14 h-14 sm:w-15 sm:h-15 rounded-full ${item.btnGradient} text-white flex items-center justify-center text-2xl shadow-2xl border-2 border-white/40 active:scale-90 transition-all duration-300 cursor-pointer animate-float-gentle`;
  }
  if (mainIcon) {
    mainIcon.className = `${item.iconClass} drop-shadow animate-bounce-slow`;
  }
  if (iconGlow) {
    iconGlow.className = `absolute -inset-1.5 rounded-full bg-gradient-to-r ${item.glowGradient} opacity-60 blur-md animate-pulse group-hover:opacity-100 transition-opacity`;
  }
}

function handleQFloatingWidgetClick() {
  const currentItem = Q_FLOATING_ITEMS[qFloatingIndex];
  if (currentItem && typeof currentItem.action === 'function') {
    currentItem.action();
  }
}

function closeQFloatingWidget() {
  const widget = document.getElementById('qShopeeFloatingWidget');
  if (widget) {
    widget.classList.add('translate-y-12', 'opacity-0', 'pointer-events-none');
    setTimeout(() => {
      widget.classList.add('hidden');
    }, 300);
  }
}

window.handleQFloatingWidgetClick = handleQFloatingWidgetClick;
window.closeQFloatingWidget = closeQFloatingWidget;
window.initQShopeeFloatingWidget = initQShopeeFloatingWidget;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initQShopeeFloatingWidget);
} else {
  initQShopeeFloatingWidget();
}
