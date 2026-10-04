/**
 * ============================================================================
 * GOOGLE APPS SCRIPT: DOKUMENTASI DRIVE UPLOADER TEATER Q
 * ============================================================================
 * Fitur:
 * 1. Membaca Folder Induk (MASTER) dan Folder Tahun dari tab sheet 'Drive_Folder'
 * 2. Otomatis membuat subfolder kegiatan: '[Nama Acara] ([Tanggal]) - [Pengunggah]'
 * 3. Menyimpan banyak file foto & video langsung ke dalam subfolder tersebut
 * 4. Mencatat log riwayat unggahan ke tab sheet 'Log_Dokumentasi'
 * ============================================================================
 */

const DEFAULT_MASTER_FOLDER_ID = '1zJ2jeJWo_JQJzgMxAozhHE9BwJSTP0sr'; // Folder 'Galeri' di Drive Teater Q

/**
 * Mendapatkan Spreadsheet Database Teater Q
 */
function getDocumentationSpreadsheet() {
  let ss = null;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {}
  if (!ss && typeof SPREADSHEET_ID !== 'undefined') {
    try {
      ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    } catch (e) {}
  }
  return ss;
}

/**
 * Mendapatkan atau membuat sheet 'Drive_Folder' untuk konfigurasi folder per tahun
 */
function getSheetDriveFolder() {
  const ss = getDocumentationSpreadsheet();
  if (!ss) return null;
  let sheet = ss.getSheetByName('Drive_Folder');
  if (!sheet) {
    sheet = ss.insertSheet('Drive_Folder');
    sheet.appendRow(['Tahun', 'Folder ID / Link Drive', 'Keterangan']);
    sheet.getRange(1, 1, 1, 3).setBackground('#4338ca').setFontColor('#FFFFFF').setFontWeight('bold');
    
    // Baris default awal
    sheet.appendRow(['MASTER', DEFAULT_MASTER_FOLDER_ID, 'Folder Induk Galeri Teater Q (Default / Fallback jika ganti akun)']);
    sheet.appendRow(['2026', '', 'Folder Dokumentasi Tahun 2026']);
    sheet.appendRow(['2025', '', 'Folder Dokumentasi Tahun 2025']);
    sheet.appendRow(['2024', '', 'Folder Dokumentasi Tahun 2024']);
    sheet.appendRow(['2023', '', 'Folder Dokumentasi Tahun 2023']);
    sheet.appendRow(['2022', '', 'Folder Dokumentasi Tahun 2022']);
    sheet.appendRow(['2021', '', 'Folder Dokumentasi Tahun 2021']);
    sheet.appendRow(['2020', '', 'Folder Dokumentasi Tahun 2020']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Mendapatkan atau membuat sheet 'Log_Dokumentasi' untuk audit trail riwayat file yang diupload
 */
function getSheetLogDokumentasi() {
  const ss = getDocumentationSpreadsheet();
  if (!ss) return null;
  let sheet = ss.getSheetByName('Log_Dokumentasi');
  if (!sheet) {
    sheet = ss.insertSheet('Log_Dokumentasi');
    sheet.appendRow([
      'Tanggal & Waktu Upload',
      'Tahun',
      'Nama Kegiatan',
      'Tanggal Kegiatan',
      'Pengunggah',
      'Nama File',
      'Tipe File',
      'Link File Google Drive',
      'Link Folder Kegiatan'
    ]);
    sheet.getRange(1, 1, 1, 9).setBackground('#0f172a').setFontColor('#FFFFFF').setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Mengekstrak Folder ID dari teks murni atau URL Google Drive lengkap
 */
function extractDriveFolderId(input) {
  if (!input) return '';
  const str = String(input).trim();
  const match = str.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return str;
}

/**
 * Membaca pemetaan folder tahun dari sheet 'Drive_Folder'
 */
function getDriveFolderMap() {
  const result = {
    masterFolderId: DEFAULT_MASTER_FOLDER_ID,
    years: {}
  };

  try {
    const sheet = getSheetDriveFolder();
    if (!sheet) return result;

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return result;

    const values = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
    for (let i = 0; i < values.length; i++) {
      const rowTahun = String(values[i][0] || '').trim().toUpperCase();
      const rawFolder = String(values[i][1] || '').trim();
      const cleanId = extractDriveFolderId(rawFolder);

      if (rowTahun === 'MASTER') {
        if (cleanId) result.masterFolderId = cleanId;
      } else if (rowTahun) {
        if (cleanId) result.years[rowTahun] = cleanId;
      }
    }
  } catch (err) {
    Logger.log('Error getDriveFolderMap: ' + err.toString());
  }

  return result;
}

/**
 * Endpoint GET: Mengembalikan daftar folder tahun untuk dropdown portal web
 */
function handleGetDriveFolderList() {
  const map = getDriveFolderMap();
  const yearsList = Object.keys(map.years);
  
  // Pastikan tahun terkini selalu ada
  const currentYear = new Date().getFullYear().toString();
  if (yearsList.indexOf(currentYear) === -1) yearsList.unshift(currentYear);

  return ContentService.createTextOutput(JSON.stringify({
    result: 'success',
    masterFolderId: map.masterFolderId,
    years: yearsList,
    folderMap: map.years
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Menemukan atau membuat Folder Tahun di dalam Master Folder
 */
function getOrCreateYearFolder(year, map) {
  const targetYear = String(year || new Date().getFullYear()).trim();
  
  // 1. Jika sudah ada ID spesifik di Google Sheet, coba buka langsung
  if (map.years[targetYear]) {
    try {
      return DriveApp.getFolderById(map.years[targetYear]);
    } catch (e) {
      Logger.log('Folder tahun ' + targetYear + ' ID tidak valid, mencari di master...');
    }
  }

  // 2. Buka Master Folder (Folder Induk)
  let masterFolder = null;
  try {
    masterFolder = DriveApp.getFolderById(map.masterFolderId);
  } catch (e) {
    masterFolder = DriveApp.getRootFolder();
  }

  // 3. Cari subfolder bernama tahun tersebut di dalam Master Folder
  const yearFolders = masterFolder.getFoldersByName(targetYear);
  if (yearFolders.hasNext()) {
    const yFolder = yearFolders.next();
    return yFolder;
  }

  // 4. Jika belum ada, buat folder tahun baru di dalam Master Folder
  const newYearFolder = masterFolder.createFolder(targetYear);
  try {
    newYearFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {}
  return newYearFolder;
}

/**
 * Menemukan atau membuat subfolder kegiatan di dalam Folder Tahun
 */
function getOrCreateEventFolder(yearFolder, eventName, eventDate, uploaderName) {
  const cleanEvent = (eventName || 'Kegiatan Teater Q').trim().replace(/[\/\\:*?"<>|]/g, '-');
  const cleanDate = (eventDate || Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd')).trim();
  const cleanUploader = (uploaderName || 'Anggota Sanggar').trim().replace(/[\/\\:*?"<>|]/g, '-');

  // Format Nama Subfolder: "[Nama Acara] ([Tanggal]) - [Pengunggah]"
  const subFolderName = `${cleanEvent} (${cleanDate}) - ${cleanUploader}`;

  const existingFolders = yearFolder.getFoldersByName(subFolderName);
  if (existingFolders.hasNext()) {
    return { folder: existingFolders.next(), name: subFolderName };
  }

  const newSubFolder = yearFolder.createFolder(subFolderName);
  try {
    newSubFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {}

  return { folder: newSubFolder, name: subFolderName };
}

/**
 * Endpoint POST: Menerima unggahan foto/video dokumentasi satu per satu
 */
function handleUploadDocumentation(data) {
  try {
    if (!data) throw new Error('Data payload tidak ditemukan');

    const year = data.year || new Date().getFullYear().toString();
    const eventName = data.eventName || 'Dokumentasi Teater Q';
    const eventDate = data.eventDate || Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');
    const uploaderName = data.uploaderName || 'Anggota';
    const fileName = data.fileName || ('File_' + Date.now() + '.jpg');
    let mimeType = data.mimeType || 'image/jpeg';
    let base64Data = data.base64Data || '';

    if (!base64Data) {
      throw new Error('Data berkas base64 kosong');
    }

    if (base64Data.indexOf(',') > -1) {
      const parts = base64Data.split(',');
      const header = parts[0];
      base64Data = parts[1];
      const matchMime = header.match(/data:(.*?);/);
      if (matchMime && matchMime[1]) {
        mimeType = matchMime[1];
      }
    }

    const map = getDriveFolderMap();
    const yearFolder = getOrCreateYearFolder(year, map);
    const eventObj = getOrCreateEventFolder(yearFolder, eventName, eventDate, uploaderName);
    const targetFolder = eventObj.folder;

    const bytes = Utilities.base64Decode(base64Data);
    const blob = Utilities.newBlob(bytes, mimeType, fileName);
    const newFile = targetFolder.createFile(blob);
    try {
      newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {}

    const fileUrl = newFile.getUrl();
    const folderUrl = targetFolder.getUrl();

    try {
      const sheetLog = getSheetLogDokumentasi();
      if (sheetLog) {
        const nowStr = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
        const fileType = mimeType.indexOf('video') > -1 ? 'Video' : 'Foto';
        sheetLog.appendRow([
          nowStr,
          year,
          eventName,
          eventDate,
          uploaderName,
          fileName,
          fileType,
          fileUrl,
          folderUrl
        ]);
      }
    } catch (errLog) {
      Logger.log('Gagal mencatat log dokumentasi: ' + errLog.toString());
    }

    return ContentService.createTextOutput(JSON.stringify({
      result: 'success',
      message: 'Berkas berhasil disimpan ke Google Drive',
      fileId: newFile.getId(),
      fileName: fileName,
      fileUrl: fileUrl,
      folderName: eventObj.name,
      folderUrl: folderUrl,
      year: year
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log('Error handleUploadDocumentation: ' + err.toString());
    return ContentService.createTextOutput(JSON.stringify({
      result: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
