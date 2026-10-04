/**
 * ============================================================================
 * PORTAL INTERNAL UKM PAGUYUBAN TEATER "Q" UIN SUNAN AMPEL SURABAYA
 * File Konfigurasi Terpusat (js/config.js)
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// 1. DATABASE GOOGLE SHEETS (PUBLISHED TSV)
// ----------------------------------------------------------------------------
const URL_MARKETPLACE   = "https://docs.google.com/spreadsheets/d/154RqVr1rCk3Yx1oVFqRMNVoT1Qyc1lQ8fDlS0kV2-xg/export?format=tsv&gid=1026734951";
const URL_ANGGOTA       = "https://docs.google.com/spreadsheets/d/154RqVr1rCk3Yx1oVFqRMNVoT1Qyc1lQ8fDlS0kV2-xg/export?format=tsv&gid=0";
const URL_GALERI        = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRqou0D87dcRhSkoC-uB3CWd62HXYZUyQc2X17j9jcO3FvGTJN7CAWlA1lqwA_2vHIBfkzpRGvgN_-z/pub?gid=1995777955&single=true&output=tsv";
const URL_PENGURUS      = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRqou0D87dcRhSkoC-uB3CWd62HXYZUyQc2X17j9jcO3FvGTJN7CAWlA1lqwA_2vHIBfkzpRGvgN_-z/pub?gid=2008546234&single=true&output=tsv";
const URL_NEWS          = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRqou0D87dcRhSkoC-uB3CWd62HXYZUyQc2X17j9jcO3FvGTJN7CAWlA1lqwA_2vHIBfkzpRGvgN_-z/pub?gid=1206384600&single=true&output=tsv";
const URL_KEUANGAN      = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRqou0D87dcRhSkoC-uB3CWd62HXYZUyQc2X17j9jcO3FvGTJN7CAWlA1lqwA_2vHIBfkzpRGvgN_-z/pub?gid=183870367&single=true&output=tsv";
const URL_PRESTASI      = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRqou0D87dcRhSkoC-uB3CWd62HXYZUyQc2X17j9jcO3FvGTJN7CAWlA1lqwA_2vHIBfkzpRGvgN_-z/pub?gid=70154254&single=true&output=tsv";
const URL_KETUA         = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRqou0D87dcRhSkoC-uB3CWd62HXYZUyQc2X17j9jcO3FvGTJN7CAWlA1lqwA_2vHIBfkzpRGvgN_-z/pub?gid=1346160133&single=true&output=tsv";
const URL_ARSIP         = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRqou0D87dcRhSkoC-uB3CWd62HXYZUyQc2X17j9jcO3FvGTJN7CAWlA1lqwA_2vHIBfkzpRGvgN_-z/pub?gid=75537221&single=true&output=tsv";
const URL_MUTASI_DANA   = ""; // Dinonaktifkan: Data mutasi dan ringkasan dana abadi terpusat melalui URL_DANA_ABADI resmi
const URL_YOUTUBE       = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRqou0D87dcRhSkoC-uB3CWd62HXYZUyQc2X17j9jcO3FvGTJN7CAWlA1lqwA_2vHIBfkzpRGvgN_-z/pub?gid=548887838&single=true&output=tsv";
const URL_LOGIN_DB      = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRqou0D87dcRhSkoC-uB3CWd62HXYZUyQc2X17j9jcO3FvGTJN7CAWlA1lqwA_2vHIBfkzpRGvgN_-z/pub?gid=514170258&single=true&output=tsv";
const URL_DATA_SARAN    = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRqou0D87dcRhSkoC-uB3CWd62HXYZUyQc2X17j9jcO3FvGTJN7CAWlA1lqwA_2vHIBfkzpRGvgN_-z/pub?gid=449996826&single=true&output=tsv";
const URL_REKAP_REKRUTMEN = "https://docs.google.com/spreadsheets/d/154RqVr1rCk3Yx1oVFqRMNVoT1Qyc1lQ8fDlS0kV2-xg/export?format=tsv&gid=300473923";
// URL Database Google Sheets GVIZ untuk Mading Karya Anggota
const URL_MADING_GVIZ     = "https://docs.google.com/spreadsheets/d/12sq7P9_5uwFHC9UpJHU7fWT8kbxG_L54e7XGEzYL-mA/gviz/tq?tqx=out:json&sheet=Mading%20Karya";
// URL Database Google Sheets GVIZ untuk Bank Naskah & Arsip Karya (Realtime Langsung Tanpa Delay CDN)
const URL_ARSIP_GVIZ      = "https://docs.google.com/spreadsheets/d/12sq7P9_5uwFHC9UpJHU7fWT8kbxG_L54e7XGEzYL-mA/gviz/tq?tqx=out:json&sheet=Arsip&headers=1";
// URL Database Google Sheets GVIZ untuk Berkas Sidang MUTER (Musyawarah Teater)
const URL_MUTER_GVIZ      = "https://docs.google.com/spreadsheets/d/154RqVr1rCk3Yx1oVFqRMNVoT1Qyc1lQ8fDlS0kV2-xg/gviz/tq?tqx=out:json&sheet=MUTER&headers=1";
// URL Database Google Sheets GVIZ untuk Pemetaan Master Drive Folder (Acuan Utama Penyimpanan Ekosistem Teater Q)
const URL_DRIVE_FOLDER_GVIZ = "https://docs.google.com/spreadsheets/d/154RqVr1rCk3Yx1oVFqRMNVoT1Qyc1lQ8fDlS0kV2-xg/gviz/tq?tqx=out:json&sheet=Drive_Folder";
const DEFAULT_MASTER_FOLDER_ID = "1zJ2jeJWo_JQJzgMxAozhHE9BwJSTP0sr"; // Folder Induk Galeri Teater Q (Default Fallback)

// Endpoint Dana Abadi berbasis Google Apps Script (GAS) JSON
const URL_DANA_ABADI    = "https://script.google.com/macros/s/AKfycbyENCpu6N7_FOViXkB3H_UxZ95cq3DRj7wNKy9CQgOum6BTH0sMXHlSRBcUCRUD5c4z/exec";

// ----------------------------------------------------------------------------
// 2. ENDPOINTS FORM & UPLOAD GOOGLE APPS SCRIPT
// ----------------------------------------------------------------------------
const FORM_SARAN_ACTION  = "https://docs.google.com/forms/d/e/1FAIpQLSeLQN7zElOxkaCFNxX4MPH9NNvh-4zdNQjG82ZWbhZphkhjmQ/formResponse";
const FORM_INFAK_ACTION  = "https://docs.google.com/forms/d/e/1FAIpQLSfyEnDNu95H_XuJtmIIRVfwl22evyq5klvNyUbt58yXEUy87g/formResponse";
const FORM_MEMBER_ACTION = "https://docs.google.com/forms/d/e/1FAIpQLSfgSXxNxydM7xfeOr1Wtl9FmGnCNfoWiohxKQBHy3jnS-NT4A/formResponse";

// Google Apps Script Web App khusus untuk Q-Drive Dokumentasi & Universal Uploader (Upload Foto, Video & Berkas)
const URL_QDRIVE_UPLOAD  = "https://script.google.com/macros/s/AKfycbwfSrAFiVNQ5NUOfPcbFPoK2Af7Iz3BoES6F8I9XLMctWytfunQ5bhLgP-2wXXi1LybdQ/exec";

// Google Apps Script Web App Terpusat untuk Upload Berkas Drive (Q-Drive Teater Q Universal)
const UPLOAD_SCRIPT_URL  = URL_QDRIVE_UPLOAD;

// Google Apps Script Web App khusus untuk Database Tab "Produk" (Marketplace)
const SCRIPT_MARKETPLACE = "https://script.google.com/macros/s/AKfycbwvu4rmZbkeeUzmyq9-Ce70cXKcZinG5EVLHBeQyBZQ3TrHjDlMMDcBWwrGZ_-LioX4CA/exec";

// Google Apps Script Master API khusus untuk Database Mading Karya Anggota
const SCRIPT_MADING      = "https://script.google.com/macros/s/AKfycbybBsA5QQwpjBawBaMe0gv91xqU8nwHmTeb8osMiWYi8OhZkXlOBeays9bgmAOfjTn8/exec";

// Mapping Entry ID Google Form Anggota
const ID_NAMA       = "entry.1747218008";
const ID_JENKEL     = "entry.1744041269"; 
const ID_ANGKATAN   = "entry.504848523";
const ID_TEMPAT     = "entry.636950297";
const ID_TANGGAL    = "entry.656925623"; 
const ID_ALAMAT     = "entry.91474338";
const ID_FAKULTAS   = "entry.579421901";
const ID_JURUSAN    = "entry.993849935";
const ID_WA         = "entry.2025447080"; 
const ID_KET_FOTO   = "entry.437791456";

// URL Database Google Sheets GVIZ untuk Pengaturan Master Kontak & Rekening Kas Terpadu
const URL_SETTING_GVIZ    = "https://docs.google.com/spreadsheets/d/12sq7P9_5uwFHC9UpJHU7fWT8kbxG_L54e7XGEzYL-mA/gviz/tq?tqx=out:json&sheet=setting";

// ----------------------------------------------------------------------------
// 3. PENGATURAN INFORMASI UMUM, KONTAK & REKENING KAS TERPADU
// ----------------------------------------------------------------------------
const CONFIG_INFO = {
  // Rekening Dana Abadi (Khusus Infak Pokok Abadi)
  namaBank: "Bank Jago",
  noRekening: "101059023607",
  atasNama: "Ely Dwi Asih (Bendahara Teater Q)",

  // Rekening Kas Organisasi (Khusus Dana Hibah Kegiatan, Operasional, Tiket & Q Store)
  namaBankKas: "Bank Jago",
  noRekeningKas: "101059023607",
  atasNamaKas: "Ely Dwi Asih (Bendahara Teater Q)",

  noAdminWA: "6285645829346",      // Kontak Admin Umum (Bantuan Login, Info Portal, Hubungi Kami)
  noBendaharaWA: "6285645829346",  // Kontak Bendahara Kas (Konfirmasi Infak Dana Abadi & Keuangan)
  noPanitiaWA: "6285645829346",    // Kontak Panitia Kegiatan (Tiket Pentas & Info Acara)
  linkQStore: "https://wa.me/6285645829346?text=Halo%20Admin%20Q%20Store",
  urlQRIS: "assets/qris-dana-abadi.jpg",
  urlQRISHibah: "assets/qris-dana-hibah.jpg"
};

// Konfigurasi Q-Store (PPOB & Pulsa UKM Paguyuban Teater Q via VIP Reseller Utama + Fallback DigiFlazz)
const QRELOAD_CONFIG = {
  provider: "vip",
  username: "hIcinug9pNNW",
  apiKey: "d38444ae-c411-535d-b29a-53e3c6526db2",
  vipApiId: "okQ0JJMk",
  vipApiKey: "yRVpjMIge62BmjuBL4KfpfQxF5y4ZV3dhSNtrLeB6Bpj1gN6r9Hyhs2ybUgfyiYg",
  vipSign: "9cd98abdf2bb6f55fddeb3f1094ff6ee",
  fixieProxy: "http://fixie:UCtY46v5xSWlqFA@criterium.usefixie.com:80",
  fixieIps: ["52.87.82.133", "52.5.155.132"],
  // Margin Keuntungan Kas Bertingkat Sesuai Skema Teater Q:
  // - Produk 100rb ke atas (modal provider ~95k+): untung Rp 20.000
  // - Produk 80rb s/d 90rb (modal provider ~76k - 94k): untung Rp 15.000
  // - Produk 50rb s/d 75rb (modal provider ~48.5k - 75k): untung Rp 10.000
  // - Produk 25rb s/d 45rb (modal provider ~22k - 48k): untung Rp 5.000
  // - Produk 5rb s/d 20rb (modal provider di bawah 22k): untung Rp 2.000
  getMarkup: function(rawPrice) {
    const price = Number(rawPrice) || 0;
    if (price >= 95000) {
      return 20000;
    } else if (price >= 76000) {
      return 15000;
    } else if (price >= 48500) {
      return 10000;
    } else if (price >= 22000) {
      return 5000;
    } else {
      return 2000;
    }
  },
  markupKas: 2000, // Fallback default
  productsUrl: "data/qreload_services.json",
  // Status Pemeliharaan Fitur Topup (false = AKTIF):
  maintenanceMode: false,
  maintenanceMessage: "Fitur Topup sedang dalam kendala teknis / pemeliharaan server menjelang launching resmi."
};

// Konfigurasi Notifikasi Telegram ke Grup Admin & Pengurus (Instan, 100% Gratis, 0 Byte Netlify)
const TELEGRAM_CONFIG = {
  token: "8739096476:AAGGkVPC8aqFnnIwq9sKaM4R1_zMVDDil8o",
  chatId: "-5347239531" // Grup Telegram: Admin Dana Abadi Teater Q
};

// SVG Placeholder Offline Bebas Error
const DEFAULT_NO_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'%3E%3Crect width='300' height='300' fill='%231e293b'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-family='sans-serif' font-size='20' font-weight='bold'%3ETeater Q%3C/text%3E%3C/svg%3E";

// ----------------------------------------------------------------------------
// 4. DATA ANGGOTA IN MEMORIAM (STATIS)
// ----------------------------------------------------------------------------
const dataAlmarhum = [
  {
    nama: "CAK TONI",
    angkatan: "Pendiri",
    foto: "",
    tahun: "Wafat 20.."
  },
  {
    nama: "IZZUL HUDAN",
    angkatan: "Angkatan 1996",
    foto: "",
    tahun: "Wafat 20.."
  },
  {
    nama: "FATTAHUL ANJAB",
    angkatan: "Angkatan 1999",
    foto: "",
    tahun: "Wafat 2026"
  },
  {
    nama: "ROBITH WAJDI",
    angkatan: "Angkatan 2000",
    foto: "",
    tahun: "Wafat 2025"
  },
  {
    nama: "FITRI FATMAWATI",
    angkatan: "Angkatan 2001",
    foto: "",
    tahun: "Wafat 20.."
  },
  {
    nama: "MOH. ALI SHODIQIN",
    angkatan: "Angkatan 2005",
    foto: "",
    tahun: "Wafat 20.."
  },
  {
    nama: "SITTI NUR JANNAH",
    angkatan: "Angkatan 2011",
    foto: "",
    tahun: "Wafat 2013"
  },
  {
    nama: "BINTANG PUTRI RAHAYU",
    angkatan: "Angkatan 2013",
    foto: "",
    tahun: "Wafat 2015"
  },
  {
    nama: "KHOIRUL ANAM",
    angkatan: "Angkatan 2013",
    foto: "",
    tahun: "Wafat 20.."
  },
  {
    nama: "JAMALUDDIN LATIF (BETA)",
    angkatan: "Angkatan 2016",
    foto: "",
    tahun: "Wafat 2021"
  },
  {
    nama: "DICKI ALIEF WAHYUDI",
    angkatan: "Angkatan 2017",
    foto: "",
    tahun: "Wafat 20.."
  },
  {
    nama: "EMA",
    angkatan: "Angkatan 2019",
    foto: "",
    tahun: "Wafat 20.."
  }
];

// ----------------------------------------------------------------------------
// 7. INFORMASI TIKET PEMENTASAN (SINKRON DENGAN WEBSITE EKSTERNAL)
// ----------------------------------------------------------------------------
const CONFIG_TICKETING = {
  isAvailable: true,
  lakonJudul: "TITIK NADIR",
  subJudul: "Pentas Akbar UKM Paguyuban Teater Q",
  tanggal: "14 - 15 November 2026",
  pukul: "19.00 WIB - Selesai",
  lokasi: "Gedung Kesenian Cak Durasim Surabaya",
  hargaTiket: 25000,
  waTicketing: "6285645829346",
  rekeningBank: "SeaBank 901926407305 a/n Ely Dwi Asih (Bendahara Teater Q)",
  rekeningBankNomor: "901926407305",
  rekeningBankNama: "Ely Dwi Asih (Bendahara Teater Q)",
  namaBank: "SeaBank",
  qrisImg: "assets/qris-dana-abadi.jpg",
  kategoriList: [
    { id: "umum", label: "Umum", harga: 30000, desc: "Masyarakat umum & penikmat seni", isUmum: true },
    { id: "mahasiswa_uinsa", label: "Mahasiswa UINSA", harga: 25000, desc: "Mahasiswa aktif UIN Sunan Ampel" },
    { id: "alumni_tq", label: "Anggota / Alumni TQ", harga: 25000, desc: "Keluarga besar Paguyuban Teater Q", isAlumni: true },
    { id: "maba", label: "Maba", harga: 20000, desc: "Khusus Mahasiswa Baru UINSA", isMaba: true }
  ],
  // URL Webhook (dapat diisi nanti saat dibuat)
  scriptUrl: "https://script.google.com/macros/s/AKfycbwR1yEcru38E3LzrztirVeG2PcR2SFt_0jVisSA2E9V6uNrpwD38FvnsQw-Q9ex5LHZ/exec"
};

// ----------------------------------------------------------------------------
// 8. KONFIGURASI BOT TELEGRAM NOTIFIKASI ADMIN TEATER Q
// ----------------------------------------------------------------------------
const TELEGRAM_ADMIN_BOT = {
  botToken: "8830765447:AAESnXuTLliceNls42tp4pigYyGTJgWtmqw",
  chatId: "7405309005",
  botUsername: "teaterq_admin_bot",
  enabled: true
};

if (typeof window !== "undefined") {
  window.URL_QDRIVE_UPLOAD = URL_QDRIVE_UPLOAD;
  window.UPLOAD_SCRIPT_URL = UPLOAD_SCRIPT_URL;
  window.URL_DRIVE_FOLDER_GVIZ = URL_DRIVE_FOLDER_GVIZ;
  window.DEFAULT_MASTER_FOLDER_ID = DEFAULT_MASTER_FOLDER_ID;
  window.CONFIG_TICKETING = CONFIG_TICKETING;
  window.URL_MADING_GVIZ = URL_MADING_GVIZ;
  window.URL_ARSIP_GVIZ = URL_ARSIP_GVIZ;
  window.URL_MUTER_GVIZ = (typeof URL_MUTER_GVIZ !== "undefined") ? URL_MUTER_GVIZ : "";
  window.SCRIPT_MADING = SCRIPT_MADING;
  window.TELEGRAM_CONFIG = TELEGRAM_CONFIG;
  window.TELEGRAM_ADMIN_BOT = TELEGRAM_ADMIN_BOT;
}

