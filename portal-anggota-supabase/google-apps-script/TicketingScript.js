/**
 * ============================================================================
 * GOOGLE APPS SCRIPT: SISTEM TIKET PEMENTASAN TEATER Q
 * Endpoint Web App untuk Pencatatan Otomatis Pemesanan Tiket ke Google Sheets
 * & Upload Otomatis Foto Bukti Transfer / Maba ke Google Drive
 * ============================================================================
 * 
 * 14 Kolom Standar:
 * 1. Timestamp
 * 2. ID Tiket
 * 3. Nama Lengkap
 * 4. Email
 * 5. Fakultas
 * 6. Jurusan / Dari Mana
 * 7. Semester
 * 8. Nomor WA
 * 9. Jumlah Tiket
 * 10. Kategori Tiket
 * 11. Total Bayar
 * 12. Link Bukti Maba (Link Google Drive)
 * 13. Link Bukti Transfer (Link Google Drive)
 * 14. Link QR Code
 */

const SHEET_TIKET_NAME = 'Tiket';
const SHEET_SETTING_NAME = 'Setting';
const FOLDER_UPLOAD_NAME = 'Bukti Upload Tiket';
const TELEGRAM_BOT_TOKEN = '8739096476:AAGGkVPC8aqFnnIwq9sKaM4R1_zMVDDil8o';
const TELEGRAM_CHAT_ID   = '7405309005';

/**
 * Menghitung Total Tiket Terjual dari Tab "Tiket"
 * Otomatis memfilter berdasarkan Nama Pementasan / Lakon yang sedang aktif,
 * sehingga riwayat tiket pementasan masa lalu tidak akan tercampur dengan pementasan baru!
 */
function getTotalTiketTerjual(filterLakon) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_TIKET_NAME);
    if (!sheet) return 0;
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return 0;

    const lastCol = Math.max(sheet.getLastColumn(), 15);
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h || '').trim().toLowerCase());

    // Cari index kolom Jumlah Tiket
    let qtyIdx = headers.findIndex(h => h.includes('jumlah') || h.includes('qty'));
    if (qtyIdx === -1) qtyIdx = 8; // fallback kolom 9 (index 8) format lama

    // Cari index kolom Nama Pementasan / Lakon
    const lakonIdx = headers.findIndex(h => h.includes('pementasan') || h.includes('lakon'));

    const values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    let total = 0;
    const targetLakon = filterLakon ? String(filterLakon).trim().toLowerCase() : '';

    for (let i = 0; i < values.length; i++) {
      const row = values[i];
      if (row[0] || row[1] || row[2] || row[3]) {
        // Jika ada filter lakon dan kolom lakon ada di sheet
        if (targetLakon && lakonIdx !== -1) {
          const rowLakon = String(row[lakonIdx] || '').trim().toLowerCase();
          // Jika baris ini memiliki nama lakon dan berbeda dari lakon aktif, lewati
          if (rowLakon && !rowLakon.includes(targetLakon) && !targetLakon.includes(rowLakon)) {
            continue;
          }
        }

        let qty = parseInt(row[qtyIdx], 10);
        if (isNaN(qty) || qty <= 0) {
          qty = 1;
        }
        total += qty;
      }
    }
    return total;
  } catch (err) {
    Logger.log('Error getTotalTiketTerjual: ' + err.toString());
    return 0;
  }
}

/**
 * Membaca Konfigurasi Pementasan Dinamis dari Tab "Setting"
 */
function getPentasConfig() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_SETTING_NAME);
    if (!sheet) {
      sheet = ss.getSheetByName('Sheet2');
    }
    if (!sheet) {
      return {
        status: 'default',
        statusTiket: 'Buka',
        gelombang: 'Presale 1',
        judulLakon: 'TITIK NADIR',
        subJudul: 'Pentas Akbar Paguyuban Teater Q',
        tanggalJam: '14 - 15 November 2026 • 19.00 WIB',
        lokasi: 'Gedung Kesenian Cak Durasim Surabaya',
        hargaReguler: 30000,
        diskonPresale1: 30,
        diskonPresale2: 15,
        diskonMaba: 30,
        kuotaTiket: 300,
        tiketTerjual: getTotalTiketTerjual('TITIK NADIR'),
        rekening: 'BCA 1234567890 a/n Teater Q',
        waPanitia: '6285785728066'
      };
    }

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return null;

    const headers = data[0].map(h => String(h || '').trim().toLowerCase());
    const row = data[1];

    function getVal(keywords, fallbackVal) {
      const idx = headers.findIndex(h => keywords.some(k => h.includes(k)));
      if (idx !== -1 && row[idx] !== undefined && row[idx] !== null && String(row[idx]).trim() !== '') {
        return row[idx];
      }
      return fallbackVal;
    }

    function parseNum(val, defVal) {
      if (typeof val === 'number') return val;
      const clean = String(val || '').replace(/[^0-9.]/g, '');
      const parsed = parseFloat(clean);
      return !isNaN(parsed) ? parsed : defVal;
    }

    function parsePercent(val, defVal) {
      let n = typeof val === 'number' ? val : parseFloat(String(val || '').replace(/[^0-9.]/g, ''));
      if (isNaN(n)) return defVal;
      // Jika Google Sheets mengirim format persentase desimal (0.30 = 30%, 0.15 = 15%)
      if (n > 0 && n <= 1) return Math.round(n * 100);
      return Math.round(n);
    }

    const statusTiket     = String(getVal(['status'], 'Buka')).trim();
    const gelombang       = String(getVal(['gelombang'], 'Presale 1')).trim();
    const judulLakon      = String(getVal(['judul', 'lakon'], 'TITIK NADIR')).trim();
    const subJudul        = String(getVal(['sub'], 'Pentas Akbar Teater Q')).trim();
    const tanggalJam      = String(getVal(['tanggal', 'jam', 'waktu'], '14-15 Nov 2026, 19.00')).trim();
    const lokasi          = String(getVal(['lokasi', 'gedung'], 'Gd. Cak Durasim')).trim();
    const hargaReguler    = parseNum(getVal(['harga', 'reguler'], 30000), 30000);
    const diskonPresale1  = parsePercent(getVal(['presale 1'], 30), 30);
    const diskonPresale2  = parsePercent(getVal(['presale 2'], 15), 15);
    const diskonMaba      = parsePercent(getVal(['maba'], 30), 30);
    const kuotaTiket      = parseNum(getVal(['kuota', 'quota', 'kapasitas', 'target'], 300), 300);
    const tiketTerjual    = getTotalTiketTerjual(judulLakon);
    const rekening        = String(getVal(['rekening', 'bank'], 'BCA 1234567890 a/n Teater Q')).trim();
    const waPanitia       = String(getVal(['wa', 'panitia'], '6285785728066')).trim();

    return {
      statusTiket: statusTiket,
      gelombang: gelombang,
      judulLakon: judulLakon,
      subJudul: subJudul,
      tanggalJam: tanggalJam,
      lokasi: lokasi,
      hargaReguler: hargaReguler,
      diskonPresale1: diskonPresale1,
      diskonPresale2: diskonPresale2,
      diskonMaba: diskonMaba,
      kuotaTiket: kuotaTiket,
      tiketTerjual: tiketTerjual,
      rekening: rekening,
      waPanitia: waPanitia
    };
  } catch (err) {
    Logger.log('Error getPentasConfig: ' + err.toString());
    return null;
  }
}

/**
 * FUNGSI TEST UNTUK MEMICU POPUP IZIN GOOGLE DRIVE & EMAIL & BACA SETTING:
 * Pilih fungsi ini di toolbar atas Apps Script, lalu klik tombol "Jalankan" (Run)
 */
function testDrivePermission() {
  const folder = getOrCreateUploadFolder();
  Logger.log('SUKSES! Folder Drive siap: ' + folder.getName() + ' -> ' + folder.getUrl());
  
  const sisaEmail = MailApp.getRemainingDailyQuota();
  Logger.log('SUKSES! Izin Pengiriman Email Aktif. Kuota hari ini: ' + sisaEmail + ' email.');

  const sheet = getSheetTiket();
  ensureTicketHeaders(sheet);
  Logger.log('SUKSES! Tab Tiket diverifikasi, total kolom: ' + sheet.getLastColumn());

  const cfg = getPentasConfig();
  const activeLakon = cfg ? cfg.judulLakon : 'TITIK NADIR';
  const totalTerjual = getTotalTiketTerjual(activeLakon);
  Logger.log('SUKSES! Total Tiket Terjual Lakon [' + activeLakon + ']: ' + totalTerjual);

  Logger.log('SUKSES! Konfigurasi Setting Tab Terbaca: ' + JSON.stringify(cfg));
  return folder.getUrl();
}

function doGet(e) {
  const p = (e && e.parameter) ? e.parameter : {};
  const action = (p.action || '').toLowerCase();

  if (action === 'config' || action === 'get_pentas_config') {
    const cfg = getPentasConfig();
    return ContentService.createTextOutput(JSON.stringify({
      status: 'ok',
      config: cfg
    })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'read' || action === 'tickets' || action === 'get_tickets') {
    return handleGetTickets(p.lakon);
  }

  if (action === 'update_status' || action === 'verify') {
    return handleUpdateTicketStatus(p.id || p.idTiket, p.status || 'Lunas', p.kehadiran || '', p.jam || '');
  }

  if (action === 'checkin') {
    return handleUpdateTicketStatus(p.id || p.idTiket, '', 'Hadir', p.jam || new Date().toLocaleTimeString('id-ID'));
  }

  if (action === 'save_config') {
    return handleSavePentasConfig(p);
  }

  if (action === 'test') {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'ok',
      message: 'Endpoint Tiket Teater Q Berhasil Terhubung!'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput('Endpoint Web App Tiket Pementasan Teater Q Aktif & Siap Menerima Data.')
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    let data = {};
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (errJson) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    const action = (data.action || '').toLowerCase();
    if (action === 'save_config') {
      return handleSavePentasConfig(data);
    }
    if (action === 'update_status' || action === 'verify') {
      return handleUpdateTicketStatus(data.id || data.idTiket, data.status || 'Lunas', data.kehadiran || '', data.jam || '');
    }
    if (action === 'checkin') {
      return handleUpdateTicketStatus(data.id || data.idTiket, '', 'Hadir', data.jam || new Date().toLocaleTimeString('id-ID'));
    }
    if (action === 'delete') {
      return handleDeleteTicket(data.id || data.idTiket);
    }

    return handleAddTicketOrder(data);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      result: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Membaca semua data tiket untuk Master Admin
 */
function handleGetTickets(filterLakon) {
  try {
    const sheet = getSheetTiket();
    ensureTicketHeaders(sheet);
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();

    if (lastRow <= 1) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        total: 0,
        data: []
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const rawData = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    const headers = rawData[0].map(h => String(h || '').trim());
    const targetLakon = filterLakon ? String(filterLakon).trim().toLowerCase() : '';

    const list = [];
    for (let r = 1; r < rawData.length; r++) {
      const row = rawData[r];
      if (!row[0] && !row[1] && !row[2]) continue;

      const item = {};
      for (let c = 0; c < headers.length; c++) {
        const key = headers[c] || ('Col_' + (c + 1));
        item[key] = row[c] !== undefined ? row[c] : '';
      }

      // Normalisasi status jika kosong
      if (!item['Status Verifikasi'] && !item['Status']) {
        item['Status Verifikasi'] = 'Pending';
      }
      if (!item['Status Kehadiran'] && !item['Kehadiran']) {
        item['Status Kehadiran'] = 'Belum Hadir';
      }

      if (targetLakon) {
        const rowLakon = String(item['Nama Pementasan'] || item['Lakon'] || '').trim().toLowerCase();
        if (rowLakon && !rowLakon.includes(targetLakon) && !targetLakon.includes(rowLakon)) {
          continue;
        }
      }

      list.push(item);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      total: list.length,
      data: list
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Memperbarui status verifikasi / kehadiran tiket
 */
function handleUpdateTicketStatus(idTiket, statusVerifikasi, statusKehadiran, jamCekIn) {
  try {
    if (!idTiket) throw new Error('ID Tiket tidak diberikan');
    const sheet = getSheetTiket();
    ensureTicketHeaders(sheet);
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow <= 1) throw new Error('Tidak ada data tiket');

    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h || '').trim().toLowerCase());
    const idIdx = headers.findIndex(h => h.includes('id tiket') || h === 'id');
    if (idIdx === -1) throw new Error('Kolom ID Tiket tidak ditemukan');

    const statusVerIdx = headers.findIndex(h => h.includes('verifikasi') || (h.includes('status') && !h.includes('kehadiran')));
    const statusHdrIdx = headers.findIndex(h => h.includes('kehadiran') || h.includes('hadir'));
    const jamIdx = headers.findIndex(h => h.includes('jam') || h.includes('cek-in') || h.includes('cekin'));

    const values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    let targetRowIndex = -1;
    const cleanTargetId = String(idTiket).trim().toLowerCase();

    for (let i = 0; i < values.length; i++) {
      const rowId = String(values[i][idIdx] || '').trim().toLowerCase();
      if (rowId === cleanTargetId) {
        targetRowIndex = i + 2;
        break;
      }
    }

    if (targetRowIndex === -1) throw new Error('Tiket dengan ID ' + idTiket + ' tidak ditemukan');

    if (statusVerifikasi && statusVerIdx !== -1) {
      sheet.getRange(targetRowIndex, statusVerIdx + 1).setValue(statusVerifikasi);
    }
    if (statusKehadiran && statusHdrIdx !== -1) {
      sheet.getRange(targetRowIndex, statusHdrIdx + 1).setValue(statusKehadiran);
    }
    if (jamCekIn && jamIdx !== -1) {
      sheet.getRange(targetRowIndex, jamIdx + 1).setValue(jamCekIn);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'Status tiket ' + idTiket + ' berhasil diperbarui',
      idTiket: idTiket,
      statusVerifikasi: statusVerifikasi,
      statusKehadiran: statusKehadiran,
      jamCekIn: jamCekIn
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Menyimpan konfigurasi pementasan ke Tab Setting
 */
function handleSavePentasConfig(cfg) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_SETTING_NAME);
    if (!sheet) sheet = ss.insertSheet(SHEET_SETTING_NAME);

    const settingHeaders = [
      'Status Tiket',
      'Gelombang Aktif',
      'Judul Lakon',
      'Sub Judul',
      'Tanggal & Jam',
      'Lokasi Gedung',
      'Reguler',
      'Presale 1',
      'Presale 2',
      'Diskon Maba',
      'Kuota'
    ];

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(settingHeaders);
    }

    const rowData = [
      cfg.statusTiket || cfg.status || 'Buka',
      cfg.gelombang || cfg.gelombangAktif || 'Reguler',
      cfg.judulLakon || cfg.lakonJudul || 'Sidang Para Setan',
      cfg.subJudul || 'Pentas Akbar Teater Q',
      cfg.tanggalJam || cfg.tanggal || '20 Agustus 2026, 19.00',
      cfg.lokasi || cfg.lokasiGedung || 'Gd. Auditorium UINSA',
      Number(cfg.hargaReguler || cfg.reguler) || 15000,
      (Number(cfg.diskonPresale1 || cfg.presale1) || 30) + '%',
      (Number(cfg.diskonPresale2 || cfg.presale2) || 15) + '%',
      (Number(cfg.diskonMaba) || 30) + '%',
      Number(cfg.kuotaTiket || cfg.kuotaKursi || cfg.kuota) || 200
    ];

    if (sheet.getLastRow() >= 2) {
      sheet.getRange(2, 1, 1, 11).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'Konfigurasi 11 kolom pementasan berhasil disimpan ke Tab Setting'
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Menghapus data tiket berdasarkan ID
 */
function handleDeleteTicket(idTiket) {
  try {
    if (!idTiket) throw new Error('ID Tiket tidak diberikan');
    const sheet = getSheetTiket();
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow <= 1) throw new Error('Tidak ada data tiket');

    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h || '').trim().toLowerCase());
    const idIdx = headers.findIndex(h => h.includes('id tiket') || h === 'id');
    if (idIdx === -1) throw new Error('Kolom ID Tiket tidak ditemukan');

    const values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    const cleanTargetId = String(idTiket).trim().toLowerCase();

    for (let i = 0; i < values.length; i++) {
      const rowId = String(values[i][idIdx] || '').trim().toLowerCase();
      if (rowId === cleanTargetId) {
        sheet.deleteRow(i + 2);
        return ContentService.createTextOutput(JSON.stringify({
          status: 'success',
          message: 'Tiket ' + idTiket + ' berhasil dihapus'
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    throw new Error('Tiket tidak ditemukan');
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getSheetTiket() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_TIKET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_TIKET_NAME);
  }
  
  ensureTicketHeaders(sheet);
  return sheet;
}

function ensureTicketHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    const headers = [
      'Timestamp',
      'ID Tiket',
      'Nama Pementasan',
      'Nama Lengkap',
      'Email',
      'Fakultas',
      'Jurusan',
      'Semester',
      'Nomor WA',
      'Jumlah Tiket',
      'Kategori Tiket',
      'Total Bayar',
      'Link Bukti Maba',
      'Link Bukti Transfer',
      'Link QR Code'
    ];
    
    sheet.appendRow(headers);
    
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#4C1D95')
               .setFontColor('#F8FAFC')
               .setFontWeight('bold')
               .setHorizontalAlignment('center')
               .setVerticalAlignment('middle');
    
    sheet.setRowHeight(1, 36);
    sheet.setFrozenRows(1);
  } else {
    // Jika sheet sudah ada header tapi belum ada kolom Nama Pementasan
    const lastCol = Math.max(sheet.getLastColumn(), 1);
    const existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h || '').trim().toLowerCase());
    const hasPementasan = existingHeaders.some(h => h.includes('pementasan') || h.includes('lakon'));
    
    if (!hasPementasan) {
      // Sisipkan di kolom 3 (setelah ID Tiket, sebelum Nama Lengkap)
      sheet.insertColumnAfter(2);
      const newCell = sheet.getRange(1, 3);
      newCell.setValue('Nama Pementasan')
             .setBackground('#4C1D95')
             .setFontColor('#F8FAFC')
             .setFontWeight('bold')
             .setHorizontalAlignment('center')
             .setVerticalAlignment('middle');
    }

    // Pastikan kolom Status Verifikasi, Status Kehadiran, dan Jam Cek-in tersedia
    const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h || '').trim().toLowerCase());
    const extraCols = [];
    if (!currentHeaders.some(h => h.includes('verifikasi') || (h.includes('status') && !h.includes('kehadiran')))) {
      extraCols.push('Status Verifikasi');
    }
    if (!currentHeaders.some(h => h.includes('kehadiran') || h.includes('hadir'))) {
      extraCols.push('Status Kehadiran');
    }
    if (!currentHeaders.some(h => h.includes('jam') || h.includes('cek-in') || h.includes('cekin'))) {
      extraCols.push('Jam Cek-in');
    }

    if (extraCols.length > 0) {
      const startCol = sheet.getLastColumn() + 1;
      for (let i = 0; i < extraCols.length; i++) {
        const c = sheet.getRange(1, startCol + i);
        c.setValue(extraCols[i])
         .setBackground('#4C1D95')
         .setFontColor('#F8FAFC')
         .setFontWeight('bold')
         .setHorizontalAlignment('center')
         .setVerticalAlignment('middle');
      }
    }
  }
}

/**
 * Mendapatkan atau membuat subfolder khusus di dalam folder tempat spreadsheet berada
 */
/**
 * Mengekstrak Folder ID dari teks murni atau link Google Drive
 */
function extractDriveFolderId(input) {
  if (!input) return '';
  const str = String(input).trim();
  const match = str.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) return match[1];
  if (!str.includes('/') && !str.includes('(')) return str;
  return '';
}

/**
 * Mendapatkan target upload folder secara dinamis:
 * 1. Mengutamakan targetFolderId dari frontend / request
 * 2. Cek tab 'Drive_Folder' pada baris 'Tiket'
 * 3. Fallback: Folder tempat spreadsheet berada
 */
function getOrCreateUploadFolder(targetFolderId) {
  // 1. Cek jika folderId dikirimkan dari frontend
  if (targetFolderId) {
    const cleanId = extractDriveFolderId(targetFolderId);
    if (cleanId) {
      try {
        return DriveApp.getFolderById(cleanId);
      } catch (errId) {
        Logger.log('Gagal membuka folder by targetFolderId: ' + cleanId + ' -> ' + errId);
      }
    }
  }

  // 2. Baca pemetaan dinamis dari tab sheet 'Drive_Folder' jika ada
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetDF = ss.getSheetByName('Drive_Folder');
    if (sheetDF) {
      const dataDF = sheetDF.getDataRange().getValues();
      for (let i = 1; i < dataDF.length; i++) {
        const rowCat = String(dataDF[i][0] || '').trim().toLowerCase();
        if (rowCat === 'tiket') {
          const rawVal = String(dataDF[i][1] || '').trim();
          const cleanId = extractDriveFolderId(rawVal);
          if (cleanId) {
            return DriveApp.getFolderById(cleanId);
          }
        }
      }
    }
  } catch (errDF) {
    Logger.log('Gagal membaca tab Drive_Folder: ' + errDF);
  }

  // 3. Fallback: Subfolder di folder tempat spreadsheet berada
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetFile = DriveApp.getFileById(ss.getId());
    const parents = sheetFile.getParents();
    let parentFolder = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
    
    const subFolders = parentFolder.getFoldersByName(FOLDER_UPLOAD_NAME);
    if (subFolders.hasNext()) {
      return subFolders.next();
    } else {
      const newFolder = parentFolder.createFolder(FOLDER_UPLOAD_NAME);
      try {
        newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch(e) {}
      return newFolder;
    }
  } catch (err) {
    const folders = DriveApp.getFoldersByName(FOLDER_UPLOAD_NAME);
    if (folders.hasNext()) return folders.next();
    return DriveApp.createFolder(FOLDER_UPLOAD_NAME);
  }
}

/**
 * Menyimpan base64 image langsung ke Google Drive dan mengembalikan link view
 */
function saveBase64Image(base64Data, filename, targetFolderId) {
  try {
    if (!base64Data || typeof base64Data !== 'string' || !base64Data.includes(',')) {
      return '';
    }
    const folder = getOrCreateUploadFolder(targetFolderId);
    const parts = base64Data.split(',');
    const header = parts[0];
    const rawData = parts[1];
    
    let mimeType = 'image/jpeg';
    const match = header.match(/data:(.*?);/);
    if (match && match[1]) {
      mimeType = match[1];
    }
    
    const bytes = Utilities.base64Decode(rawData);
    const blob = Utilities.newBlob(bytes, mimeType, filename);
    const newFile = folder.createFile(blob);
    
    try {
      newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (errShare) {}
    
    return newFile.getUrl();
  } catch (err) {
    Logger.log('Error saveBase64Image: ' + err.toString());
    return '';
  }
}

function handleAddTicketOrder(data) {
  const sheet = getSheetTiket();

  // Pastikan header tersedia & mutakhir
  ensureTicketHeaders(sheet);

  const cfg = getPentasConfig() || {};
  if (!cfg.tanggalJam && data.tanggalJam) cfg.tanggalJam = data.tanggalJam;
  if (!cfg.lokasi && data.lokasi) cfg.lokasi = data.lokasi;
  if (!cfg.subJudul && data.subJudul) cfg.subJudul = data.subJudul;
  const activeLakon = cfg.judulLakon || 'TITIK NADIR';

  const timestamp        = data.timestamp || new Date().toLocaleString('id-ID');
  const idTiket          = data.idTiket || ('TQ-TIX-' + Date.now().toString().slice(-6));
  const namaPementasan   = data.namaPementasan || data.lakon || activeLakon;
  const namaLengkap      = data.namaLengkap || data.nama || '-';
  const email            = data.email || '-';
  const fakultas         = data.fakultas || '-';
  const jurusan          = data.jurusan || '-';
  const semester         = data.semester || '-';
  const nomorWA          = data.nomorWA || data.wa || '-';
  const jumlahTiket      = data.jumlahTiket || data.qty || 1;
  const kategoriTiket    = data.kategoriTiket || data.kategori || 'Umum';
  const totalBayar       = data.totalBayar || data.total || '-';
  const linkQrCode       = data.linkQrCode || ('https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=' + encodeURIComponent(idTiket));
  const dynamicFolderId  = data.folderId || data.targetFolderId || '';

  // 1. Upload Bukti Transfer ke Google Drive jika ada file base64
  let finalLinkTransfer = data.linkBuktiTransfer || '-';
  if (data.fileBuktiTransfer && typeof data.fileBuktiTransfer === 'string' && data.fileBuktiTransfer.startsWith('data:')) {
    const filenameTransfer = 'TRANSFER_' + idTiket + '.jpg';
    const driveTransferUrl = saveBase64Image(data.fileBuktiTransfer, filenameTransfer, dynamicFolderId);
    if (driveTransferUrl) {
      finalLinkTransfer = driveTransferUrl;
    }
  }

  // 2. Upload Bukti Maba ke Google Drive jika ada file base64
  let finalLinkMaba = data.linkBuktiMaba || '-';
  if (data.fileBuktiMaba && typeof data.fileBuktiMaba === 'string' && data.fileBuktiMaba.startsWith('data:')) {
    const filenameMaba = 'MABA_' + idTiket + '.jpg';
    const driveMabaUrl = saveBase64Image(data.fileBuktiMaba, filenameMaba, dynamicFolderId);
    if (driveMabaUrl) {
      finalLinkMaba = driveMabaUrl;
    }
  }

  // Petakan posisi kolom berdasarkan nama header di baris 1
  const lastCol = Math.max(sheet.getLastColumn(), 15);
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h || '').trim().toLowerCase());

  function findColIdx(keywords, fallbackIdx) {
    const idx = headers.findIndex(h => keywords.some(k => h.includes(k)));
    return idx !== -1 ? idx : fallbackIdx;
  }

  const lakonColIdx = findColIdx(['pementasan', 'lakon'], 2);
  const namaColIdx = headers.findIndex(h => (h.includes('nama') && !h.includes('pementasan') && !h.includes('lakon')) || h.includes('lengkap') || h.includes('pemesan'));

  let rowValues;
  if (lakonColIdx !== -1) {
    rowValues = new Array(headers.length).fill('');
    rowValues[findColIdx(['time', 'waktu', 'tanggal', 'timestamp'], 0)] = timestamp;
    rowValues[findColIdx(['id tiket', 'id'], 1)] = idTiket;
    rowValues[lakonColIdx] = namaPementasan;
    rowValues[namaColIdx !== -1 ? namaColIdx : 3] = namaLengkap;
    rowValues[findColIdx(['email'], 4)] = email;
    rowValues[findColIdx(['fakultas'], 5)] = fakultas;
    rowValues[findColIdx(['jurusan', 'prodi', 'asal'], 6)] = jurusan;
    rowValues[findColIdx(['semester'], 7)] = semester;
    rowValues[findColIdx(['nomor wa', 'whatsapp', 'wa', 'no hp'], 8)] = "'" + nomorWA;
    rowValues[findColIdx(['jumlah', 'qty'], 9)] = jumlahTiket;
    rowValues[findColIdx(['kategori'], 10)] = kategoriTiket;
    rowValues[findColIdx(['total'], 11)] = totalBayar;
    rowValues[findColIdx(['bukti maba', 'maba'], 12)] = finalLinkMaba;
    rowValues[findColIdx(['bukti transfer', 'transfer'], 13)] = finalLinkTransfer;
    rowValues[findColIdx(['qr', 'qrcode'], 14)] = linkQrCode;

    const statusVerIdx = findColIdx(['verifikasi', 'status verifikasi'], -1);
    if (statusVerIdx !== -1) rowValues[statusVerIdx] = data.statusVerifikasi || 'Pending';

    const statusHdrIdx = findColIdx(['kehadiran', 'status kehadiran'], -1);
    if (statusHdrIdx !== -1) rowValues[statusHdrIdx] = data.statusKehadiran || 'Belum Hadir';

    const jamIdx = findColIdx(['jam cek-in', 'jam cekin', 'cek-in'], -1);
    if (jamIdx !== -1) rowValues[jamIdx] = data.jamCekIn || '-';
  } else {
    // 14 Kolom Standar Lama jika kolom lakon belum ada
    rowValues = [
      timestamp,
      idTiket,
      namaLengkap,
      email,
      fakultas,
      jurusan,
      semester,
      "'" + nomorWA,
      jumlahTiket,
      kategoriTiket,
      totalBayar,
      finalLinkMaba,
      finalLinkTransfer,
      linkQrCode,
      data.statusVerifikasi || 'Pending',
      data.statusKehadiran || 'Belum Hadir',
      data.jamCekIn || '-'
    ];
  }

  sheet.appendRow(rowValues);
  const newRowIndex = sheet.getLastRow();

  sheet.getRange(newRowIndex, 1, 1, rowValues.length).setVerticalAlignment('middle');
  const waColPos = findColIdx(['nomor wa', 'whatsapp', 'wa'], 8) + 1;
  sheet.getRange(newRowIndex, waColPos).setNumberFormat('@');

  try {
    sendTelegramTicketAlert(idTiket, namaLengkap, email, nomorWA, fakultas, jurusan, semester, kategoriTiket, jumlahTiket, totalBayar, finalLinkMaba, finalLinkTransfer, namaPementasan);
  } catch (e) {
    Logger.log('Telegram Error: ' + e.toString());
  }

  try {
    sendTicketEmailToBuyer(email, namaLengkap, idTiket, kategoriTiket, jumlahTiket, totalBayar, linkQrCode, fakultas, jurusan, semester, namaPementasan, cfg);
  } catch (errEmail) {
    Logger.log('Email Error: ' + errEmail.toString());
  }

  return ContentService.createTextOutput(JSON.stringify({
    result: 'success',
    idTiket: idTiket,
    lakon: namaPementasan,
    linkTransfer: finalLinkTransfer,
    linkMaba: finalLinkMaba,
    row: newRowIndex
  })).setMimeType(ContentService.MimeType.JSON);
}

function sendTelegramTicketAlert(idTiket, nama, email, wa, fakultas, jurusan, semester, kategori, qty, total, maba, tf, lakon) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

  let asal = '';
  if (fakultas === 'Undangan') {
    asal = 'Status: Tamu Undangan (VIP / Bebas Biaya)\n• *Asal / Instansi:* ' + (jurusan || '-');
  } else if (fakultas === 'Umum') {
    asal = 'Dari Mana: ' + jurusan + ' (Umum)';
  } else if (fakultas === 'Anggota') {
    asal = 'Status: Anggota / Alumni TQ';
  } else {
    asal = 'Kampus: ' + fakultas + ' / ' + jurusan + ' (' + semester + ')';
  }

  const msg = '🎟️ *PEMESANAN TIKET PEMENTASAN TEATER Q!*\n' +
    '----------------------------------------\n' +
    '• *Lakon / Pementasan:* ' + (lakon || 'Pentas Akbar') + '\n' +
    '• *ID Tiket:* `' + idTiket + '`\n' +
    '• *Nama:* ' + nama + '\n' +
    '• *Email:* ' + email + '\n' +
    '• *WA:* ' + wa + '\n' +
    '• *' + asal + '*\n' +
    '• *Kategori:* ' + kategori + '\n' +
    '• *Jumlah:* ' + qty + ' Tiket\n' +
    '• *Total:* ' + total + '\n' +
    '----------------------------------------\n' +
    (maba && maba !== '-' ? '• *Bukti Maba:* ' + maba + '\n' : '') +
    '• *Bukti Transfer:* ' + tf;

  const url = 'https://api.telegram.org/bot' + TELEGRAM_BOT_TOKEN + '/sendMessage';
  UrlFetchApp.fetch(url, {
    method: 'post',
    payload: {
      chat_id: TELEGRAM_CHAT_ID,
      text: msg,
      parse_mode: 'Markdown'
    },
    muteHttpExceptions: true
  });
}

/**
 * Mengirim E-Tiket Resmi Berformat HTML Indah Langsung ke Email Pembeli
 */
function sendTicketEmailToBuyer(email, nama, idTiket, kategori, qty, total, linkQrCode, fakultas, jurusan, semester, lakon, cfg) {
  if (!email || !email.includes('@') || email === '-') return;

  const currentCfg = cfg || getPentasConfig() || {};
  const lakonText = lakon || currentCfg.judulLakon || 'TITIK NADIR';
  const subJudulText = currentCfg.subJudul || 'Pentas Akbar Teater Q';
  const waktuText = currentCfg.tanggalJam || 'Sesuai Jadwal Pementasan';
  const lokasiText = currentCfg.lokasi || 'Venue Pementasan Teater Q';

  const rawWa = currentCfg.waPanitia || '6285785728066';
  const waClean = String(rawWa).replace(/[^0-9]/g, '');
  const waPanitiaUrl = waClean.startsWith('0') ? ('62' + waClean.slice(1)) : (waClean.startsWith('62') ? waClean : ('62' + waClean));

  const subject = '[E-TIKET] Reservasi Tiket Pementasan ' + lakonText + ' - ' + idTiket;
  
  let infoAsalHtml = '';
  if (fakultas === 'Undangan') {
    infoAsalHtml = '<tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">Status Tiket:</td><td style="padding: 6px 0; font-weight: 700; color: #9333ea; text-align: right; font-size: 13px;">Tamu Undangan Khusus (VIP)</td></tr>' +
                   '<tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">Asal / Instansi:</td><td style="padding: 6px 0; font-weight: 600; color: #0f172a; text-align: right; font-size: 13px;">' + (jurusan || '-') + '</td></tr>';
  } else if (fakultas === 'Umum') {
    infoAsalHtml = '<tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">Asal / Instansi:</td><td style="padding: 6px 0; font-weight: 600; color: #0f172a; text-align: right; font-size: 13px;">' + jurusan + ' (Umum)</td></tr>';
  } else if (fakultas === 'Anggota') {
    infoAsalHtml = '<tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">Status:</td><td style="padding: 6px 0; font-weight: 600; color: #0f172a; text-align: right; font-size: 13px;">Anggota / Alumni Teater Q</td></tr>';
  } else {
    infoAsalHtml = '<tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">Kampus UINSA:</td><td style="padding: 6px 0; font-weight: 600; color: #0f172a; text-align: right; font-size: 13px;">' + fakultas + ' / ' + jurusan + ' (' + semester + ')</td></tr>';
  }

  const htmlBody = '<!DOCTYPE html>' +
  '<html>' +
  '<head>' +
    '<meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<title>E-Tiket Teater Q</title>' +
  '</head>' +
  '<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; padding: 24px 12px;">' +
      '<tr>' +
        '<td align="center">' +
          '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 540px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">' +
            '<tr>' +
              '<td style="background: linear-gradient(135deg, #3b0764 0%, #6b21a8 50%, #9333ea 100%); padding: 32px 24px; text-align: center; color: #ffffff;">' +
                '<div style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; font-weight: 700; color: #facc15; margin-bottom: 6px;">E-TIKET RESMI PEMENTASAN</div>' +
                '<h1 style="margin: 0; font-size: 26px; font-weight: 900; letter-spacing: 1px; color: #ffffff;">TEATER "Q" UINSA</h1>' +
                '<div style="font-size: 13px; color: #e9d5ff; margin-top: 6px; font-weight: 500;">' + subJudulText + ' • Lakon "' + lakonText + '"</div>' +
              '</td>' +
            '</tr>' +
            '<tr>' +
              '<td style="padding: 28px 24px;">' +
                '<div style="text-align: center; margin-bottom: 24px;">' +
                  '<span style="display: inline-block; background-color: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; font-size: 12px; font-weight: 700; padding: 4px 14px; border-radius: 9999px;">' +
                    '✓ RESERVASI BERHASIL TERCATAT' +
                  '</span>' +
                  '<p style="margin: 12px 0 0 0; font-size: 14px; color: #475569;">' +
                    'Halo <strong style="color: #0f172a;">' + nama + '</strong>, terima kasih telah memesan tiket pementasan Teater Q. Simpan email ini sebagai bukti reservasi resmi Anda.' +
                  '</p>' +
                '</div>' +
                '<div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 16px; padding: 20px; margin-bottom: 24px;">' +
                  '<div style="text-align: center; margin-bottom: 16px;">' +
                    '<div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: 600;">KODE / ID TIKET</div>' +
                    '<div style="font-size: 22px; font-weight: 900; color: #7e22ce; letter-spacing: 2px; margin-top: 4px;">' + idTiket + '</div>' +
                  '</div>' +
                  '<div style="text-align: center; margin: 16px 0;">' +
                    '<img src="' + linkQrCode + '" alt="QR Code Tiket" width="160" height="160" style="display: inline-block; border-radius: 12px; border: 4px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.08);" />' +
                    '<div style="font-size: 11px; color: #64748b; margin-top: 8px;">Tunjukkan QR Code ini kepada panitia saat registrasi di venue.</div>' +
                  '</div>' +
                  '<table width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top: 1px solid #e2e8f0; margin-top: 16px; padding-top: 12px;">' +
                    '<tr>' +
                      '<td style="padding: 6px 0; color: #64748b; font-size: 13px;">Kategori Tiket:</td>' +
                      '<td style="padding: 6px 0; font-weight: 600; color: #0f172a; text-align: right; font-size: 13px;">' + kategori + '</td>' +
                    '</tr>' +
                    '<tr>' +
                      '<td style="padding: 6px 0; color: #64748b; font-size: 13px;">Jumlah Tiket:</td>' +
                      '<td style="padding: 6px 0; font-weight: 600; color: #0f172a; text-align: right; font-size: 13px;">' + qty + ' Orang</td>' +
                    '</tr>' +
                    infoAsalHtml +
                    '<tr style="border-top: 1px solid #e2e8f0;">' +
                      '<td style="padding: 10px 0 4px 0; color: #0f172a; font-weight: 700; font-size: 14px;">Total Bayar:</td>' +
                      '<td style="padding: 10px 0 4px 0; font-weight: 900; color: #7e22ce; text-align: right; font-size: 16px;">' + total + '</td>' +
                    '</tr>' +
                  '</table>' +
                '</div>' +
                '<div style="background-color: #faf5ff; border: 1px solid #f3e8ff; border-radius: 14px; padding: 16px; margin-bottom: 24px;">' +
                  '<div style="font-size: 12px; font-weight: 700; color: #6b21a8; margin-bottom: 8px;">🗓️ JADWAL & LOKASI PEMENTASAN:</div>' +
                  '<div style="font-size: 13px; color: #334155; line-height: 1.6;">' +
                    '• <strong>Lakon:</strong> ' + lakonText + '<br>' +
                    '• <strong>Waktu:</strong> ' + waktuText + '<br>' +
                    '• <strong>Tempat:</strong> ' + lokasiText +
                  '</div>' +
                '</div>' +
                '<div style="font-size: 12px; color: #64748b; line-height: 1.6; margin-bottom: 20px;">' +
                  '<strong style="color: #334155;">Catatan Penting:</strong>' +
                  '<ul style="margin: 6px 0 0 0; padding-left: 18px;">' +
                    '<li>Pintu masuk dibuka 30 menit sebelum pertunjukan dimulai.</li>' +
                    '<li>Tunjukkan QR Code di atas kepada petugas tiket di lokasi.</li>' +
                    '<li>Simpan email ini sebagai bukti reservasi resmi.</li>' +
                  '</ul>' +
                '</div>' +
                '<div style="text-align: center; padding-top: 8px;">' +
                  '<a href="https://wa.me/' + waPanitiaUrl + '?text=Halo%20Panitia%20Tiket%20Teater%20Q,%20saya%20konfirmasi%20tiket%20' + encodeURIComponent(idTiket) + '" style="display: inline-block; background-color: #22c55e; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13px; padding: 12px 24px; border-radius: 12px; box-shadow: 0 4px 12px rgba(34,197,94,0.3);">' +
                    'Hubungi Panitia via WhatsApp' +
                  '</a>' +
                '</div>' +
              '</td>' +
            '</tr>' +
            '<tr>' +
              '<td style="background-color: #0f172a; padding: 20px 24px; text-align: center; color: #94a3b8; font-size: 11px; line-height: 1.5;">' +
                'UKM Paguyuban Teater "Q"<br>' +
                'UIN Sunan Ampel Surabaya • Gedung SAC Lt. 2 Kampus A Yani<br>' +
                'Email otomatis dari Sistem Tiket Teater Q. Harap tidak membalas langsung email ini.' +
              '</td>' +
            '</tr>' +
          '</table>' +
        '</td>' +
      '</tr>' +
    '</table>' +
  '</body>' +
  '</html>';

  try {
    MailApp.sendEmail({
      to: email,
      subject: subject,
      htmlBody: htmlBody,
      name: 'Panitia Tiket Teater Q UINSA'
    });
    Logger.log('Email E-Tiket berhasil dikirim ke: ' + email);
  } catch (errMail) {
    Logger.log('Error kirim email tiket: ' + errMail.toString());
  }
}

