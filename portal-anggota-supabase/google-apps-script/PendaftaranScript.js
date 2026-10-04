/**
 * ============================================================================
 * GOOGLE APPS SCRIPT: PENDAFTARAN & OPREC TEATER Q (STANDALONE)
 * ============================================================================
 * Fitur:
 * 1. Menerima data pendaftaran 1 pintu dari Website Eksternal
 * 2. Mengunggah Foto Calon Anggota & Bukti Transfer ke Google Drive
 * 3. Otomatis membuat ID unik: TQ-MEMBER-XXXXXX
 * 4. Mencatat 23 kolom lengkap ke tab sheet 'Pendaftaran'
 * 5. Membaca baris acuan 'TQ-CONFIG' (Biaya Pendaftaran, Status Buka/Tutup, Angkatan)
 * ============================================================================
 */

const SPREADSHEET_ID = '154RqVr1rCk3Yx1oVFqRMNVoT1Qyc1lQ8fDlS0kV2-xg';
const SHEET_NAME     = 'Pendaftaran';
const ROOT_FOLDER_NAME = 'Berkas_Pendaftaran_TeaterQ';
const PANITIA_EMAIL    = 'teaterq.uinsa@gmail.com';

/**
 * Endpoint GET: Membaca status & biaya pendaftaran dari baris acuan TQ-CONFIG
 */
function doGet(e) {
  try {
    const p = (e && e.parameter) ? e.parameter : {};
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      return jsonResponse({ success: false, error: 'Sheet Pendaftaran tidak ditemukan' });
    }

    // Ambil baris ke-2 (Baris acuan TQ-CONFIG)
    const configData = getConfigFromSheet(sheet);

    return jsonResponse({
      success: true,
      config: configData
    });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

/**
 * Endpoint POST: Menerima pengiriman formulir pendaftaran dari Website
 */
function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (ex) {
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      return jsonResponse({ success: false, error: 'Sheet Pendaftaran tidak ditemukan' });
    }

    // 1. Baca Konfigurasi dari baris acuan (Row 2 / TQ-CONFIG)
    const config = getConfigFromSheet(sheet);

    // Cek jika pendaftaran sedang ditutup
    if (config.status && config.status.toUpperCase() === 'TUTUP') {
      return jsonResponse({
        success: false,
        error: 'Pendaftaran saat ini sedang ditutup oleh panitia.'
      });
    }

    // 2. Buat Folder Penyimpanan Berkas di Google Drive
    const targetFolder = getOrCreateUploadFolder();

    // 3. Simpan File Foto Calon Anggota (jika ada data base64)
    let fotoUrl = '';
    if (payload.fotoBase64) {
      const namaFileFoto = 'FOTO_' + sanitizeFileName(payload.nama || 'Anggota') + '_' + Date.now();
      fotoUrl = saveBase64File(targetFolder, payload.fotoBase64, payload.fotoMimeType || 'image/jpeg', namaFileFoto);
    } else if (payload.fotoUrl) {
      fotoUrl = payload.fotoUrl;
    }

    // 4. Simpan File Bukti Transfer (jika ada data base64)
    let buktiTransferUrl = '';
    if (payload.buktiTransferBase64) {
      const namaFileBukti = 'BUKTI_BAYAR_' + sanitizeFileName(payload.nama || 'Anggota') + '_' + Date.now();
      buktiTransferUrl = saveBase64File(targetFolder, payload.buktiTransferBase64, payload.buktiTransferMimeType || 'image/jpeg', namaFileBukti);
    } else if (payload.buktiTransferUrl) {
      buktiTransferUrl = payload.buktiTransferUrl;
    }

    // 5. Simpan Bukti Screenshot Follow Instagram (Kolom 18)
    let buktiIgUrl = '';
    if (payload.buktiIgBase64) {
      const namaFileIg = 'BUKTI_IG_' + sanitizeFileName(payload.nama || 'Anggota') + '_' + Date.now();
      buktiIgUrl = saveBase64File(targetFolder, payload.buktiIgBase64, payload.buktiIgMimeType || 'image/jpeg', namaFileIg);
    } else if (payload.instagram) {
      buktiIgUrl = payload.instagram;
    }

    // 6. Simpan Bukti Screenshot Subscribe YouTube (Kolom 19)
    let buktiYtUrl = '';
    if (payload.buktiYtBase64) {
      const namaFileYt = 'BUKTI_YT_' + sanitizeFileName(payload.nama || 'Anggota') + '_' + Date.now();
      buktiYtUrl = saveBase64File(targetFolder, payload.buktiYtBase64, payload.buktiYtMimeType || 'image/jpeg', namaFileYt);
    } else if (payload.youtube) {
      buktiYtUrl = payload.youtube;
    }

    // 7. Simpan Bukti Screenshot Follow TikTok (Kolom 20)
    let buktiTiktokUrl = '';
    if (payload.buktiTiktokBase64) {
      const namaFileTiktok = 'BUKTI_TIKTOK_' + sanitizeFileName(payload.nama || 'Anggota') + '_' + Date.now();
      buktiTiktokUrl = saveBase64File(targetFolder, payload.buktiTiktokBase64, payload.buktiTiktokMimeType || 'image/jpeg', namaFileTiktok);
    } else if (payload.tiktok) {
      buktiTiktokUrl = payload.tiktok;
    }

    // 8. Simpan Bukti Screenshot Gabung Saluran WA (Kolom 21)
    let buktiSaluranWaUrl = '';
    if (payload.buktiSaluranWaBase64) {
      const namaFileWa = 'BUKTI_WA_' + sanitizeFileName(payload.nama || 'Anggota') + '_' + Date.now();
      buktiSaluranWaUrl = saveBase64File(targetFolder, payload.buktiSaluranWaBase64, payload.buktiSaluranWaMimeType || 'image/jpeg', namaFileWa);
    } else if (payload.saluranWa) {
      buktiSaluranWaUrl = payload.saluranWa;
    }

    // 9. Generate ID Unik Peserta (TQ-MEMBER-XXXXXX)
    const memberId = generateUniqueMemberId(sheet);

    // 10. Tanggal & Waktu Timestamp
    const timestampStr = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');

    // 11. Tahun Angkatan & Total Bayar (Mengacu pada baris TQ-CONFIG)
    const tahunAngkatan = payload.tahunAngkatan || config.tahunAngkatan || '2026';
    const totalBayar    = payload.totalBayar || config.totalBayar || 'Rp10.000';
    const statusAwal    = 'Pending';

    // 12. Susun 23 Kolom Sesuai Urutan Baku di Spreadsheet
    const newRow = [
      memberId,                                 // 1. ID
      String(payload.nama || '').trim(),        // 2. Nama
      String(payload.jenisKelamin || '').trim(),// 3. Jenis Kelamin
      tahunAngkatan,                            // 4. Tahun Angkatan
      String(payload.tempatLahir || '').trim(), // 5. Tempat Lahir
      String(payload.tanggalLahir || '').trim(),// 6. Tanggal Lahir
      String(payload.alamat || '').trim(),      // 7. Alamat
      String(payload.semester || '1').trim(),   // 8. Semester
      String(payload.fakultas || '').trim(),    // 9. Fakultas
      String(payload.jurusan || '').trim(),     // 10. Jurusan
      String(payload.noHp || '').trim(),        // 11. No HP
      String(payload.kategori || '').trim(),    // 12. Kategori (Drama/Tari/Musik/Seni Rupa)
      String(payload.alasan || '').trim(),      // 13. Alasan / Motivasi
      totalBayar,                               // 14. Total Bayar
      statusAwal,                               // 15. Status
      fotoUrl,                                  // 16. Foto Calon Anggota
      buktiTransferUrl,                          // 17. Bukti Transfer
      buktiIgUrl,                               // 18. Instagram (Screenshot Bukti Follow)
      buktiYtUrl,                               // 19. Youtube (Screenshot Bukti Subscribe)
      buktiTiktokUrl,                           // 20. Tiktok (Screenshot Bukti Follow)
      buktiSaluranWaUrl,                         // 21. Saluran Wa (Screenshot Bukti Gabung)
      String(payload.email || '').trim(),       // 22. Email
      timestampStr                              // 23. Timestamp
    ];

    // Simpan baris baru ke sheet
    sheet.appendRow(newRow);

    // 13. Kirim Konfirmasi Email 2 Arah (Ke Peserta & Panitia)
    try {
      sendConfirmationEmails(payload, memberId, timestampStr, totalBayar, statusAwal, fotoUrl, buktiTransferUrl);
    } catch (errEmail) {
      Logger.log('Warning gagal kirim email: ' + errEmail);
    }

    return jsonResponse({
      success: true,
      message: 'Pendaftaran berhasil dikirim!',
      data: {
        id: memberId,
        nama: payload.nama,
        totalBayar: totalBayar,
        status: statusAwal,
        timestamp: timestampStr
      }
    });

  } catch (err) {
    return jsonResponse({
      success: false,
      error: 'Gagal memproses pendaftaran: ' + err.toString()
    });
  }
}

/**
 * Membaca baris acuan TQ-CONFIG (Baris ke-2)
 */
function getConfigFromSheet(sheet) {
  const row2 = sheet.getRange(2, 1, 1, 23).getValues()[0];
  return {
    id: String(row2[0] || 'TQ-CONFIG').trim(),
    nama: String(row2[1] || 'PENGATURAN_OPREC').trim(),
    tahunAngkatan: String(row2[3] || '2026').trim(),
    totalBayar: String(row2[13] || 'Rp10.000').trim(),
    status: String(row2[14] || 'BUKA').trim().toUpperCase()
  };
}

/**
 * Generator ID Unik Anggota (TQ-MEMBER-XXXXXX)
 */
function generateUniqueMemberId(sheet) {
  const lastRow = sheet.getLastRow();
  const existingIds = new Set();

  if (lastRow >= 2) {
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let r = 0; r < ids.length; r++) {
      existingIds.add(String(ids[r][0]).trim());
    }
  }

  let uniqueId = '';
  do {
    const randNum = Math.floor(100000 + Math.random() * 900000);
    uniqueId = 'TQ-MEMBER-' + randNum;
  } while (existingIds.has(uniqueId));

  return uniqueId;
}

/**
 * Simpan file Base64 ke Google Drive dan kembalikan URL langsung
 */
function saveBase64File(folder, base64Data, mimeType, fileName) {
  if (!base64Data) return '';
  
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      let cleanBase64 = base64Data;
      if (cleanBase64.indexOf('base64,') !== -1) {
        cleanBase64 = cleanBase64.split('base64,')[1];
      }

      const decoded = Utilities.base64Decode(cleanBase64);
      const blob = Utilities.newBlob(decoded, mimeType, fileName);
      const file = folder.createFile(blob);

      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (errShare) {
        Logger.log('Peringatan setSharing: ' + errShare);
      }

      const fileId = file.getId();
      return 'https://lh3.googleusercontent.com/d/' + fileId + '=s1000';
    } catch (e) {
      Logger.log('Gagal upload attempt ' + attempt + ' (' + fileName + '): ' + e);
      if (attempt < 3) {
        Utilities.sleep(500); // Jeda 500ms sebelum mencoba ulang
      }
    }
  }
  return '';
}

/**
 * Mendapatkan atau membuat folder penyimpanan di Google Drive
 */
function getOrCreateUploadFolder() {
  const folders = DriveApp.getFoldersByName(ROOT_FOLDER_NAME);
  if (folders.hasNext()) {
    return folders.next();
  }
  const newFolder = DriveApp.createFolder(ROOT_FOLDER_NAME);
  newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return newFolder;
}

/**
 * Helper Spreadsheet
 */
function getSpreadsheet() {
  let ss = null;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {}
  if (!ss && SPREADSHEET_ID) {
    ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return ss;
}

/**
 * Helper Sanitasi Nama File
 */
function sanitizeFileName(name) {
  return String(name).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
}

/**
 * Helper Output JSON
 */
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Mengirim Konfirmasi Email 2 Arah (Peserta & Panitia)
 */
function sendConfirmationEmails(payload, memberId, timestampStr, totalBayar, statusAwal, fotoUrl, buktiTransferUrl) {
  const applicantEmail = String(payload.email || '').trim();
  const nama = String(payload.nama || '').trim();
  const kategori = String(payload.kategori || '').trim();
  const fakultas = String(payload.fakultas || '').trim();
  const jurusan = String(payload.jurusan || '').trim();
  const noHp = String(payload.noHp || '').trim();

  // 1. EMAIL KONFIRMASI KE CALON ANGGOTA (PESERTA)
  if (applicantEmail && applicantEmail.indexOf('@') !== -1) {
    const subjectPeserta = `[Teater Q] Bukti Pendaftaran Calon Anggota - ${memberId}`;
    const htmlPeserta = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; color: #f8fafc; border-radius: 16px; overflow: hidden; border: 1px solid #334155;">
        <div style="background: linear-gradient(135deg, #1e3a8a, #0f172a); padding: 24px; text-align: center; border-bottom: 2px solid #3b82f6;">
          <h2 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: 0.5px;">UKM PAGUYUBAN TEATER "Q"</h2>
          <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 11px;">Fakultas Syariah & Hukum - UIN Sunan Ampel Surabaya</p>
        </div>
        
        <div style="padding: 24px;">
          <h3 style="color: #60a5fa; margin-top: 0; font-size: 16px;">Halo, ${nama}!</h3>
          <p style="font-size: 13px; line-height: 1.6; color: #cbd5e1; margin-bottom: 20px;">
            Terima kasih telah mendaftar sebagai Calon Anggota Baru UKM Paguyuban Teater Q. Formulir dan berkas persyaratan Anda telah resmi kami terima di sistem.
          </p>

          <div style="background-color: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 18px; margin-bottom: 20px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
              <tr>
                <td style="padding: 6px 0; color: #94a3b8; width: 40%;">ID Pendaftaran:</td>
                <td style="padding: 6px 0; color: #fbbf24; font-weight: bold; font-family: monospace; font-size: 14px;">${memberId}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #94a3b8;">Nama Lengkap:</td>
                <td style="padding: 6px 0; color: #ffffff; font-weight: 600;">${nama}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #94a3b8;">Fakultas / Prodi:</td>
                <td style="padding: 6px 0; color: #ffffff;">${fakultas} / ${jurusan}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #94a3b8;">Peminatan Seni:</td>
                <td style="padding: 6px 0; color: #93c5fd; font-weight: bold;">${kategori}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #94a3b8;">Biaya Pendaftaran:</td>
                <td style="padding: 6px 0; color: #34d399; font-weight: bold;">${totalBayar}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #94a3b8;">Status Saat Ini:</td>
                <td style="padding: 6px 0;"><span style="background-color: rgba(245, 158, 11, 0.2); color: #fbbf24; padding: 3px 10px; border-radius: 9999px; font-weight: bold; font-size: 11px; border: 1px solid rgba(245, 158, 11, 0.3);">${statusAwal} (Menunggu Verifikasi)</span></td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #94a3b8;">Waktu Daftar:</td>
                <td style="padding: 6px 0; color: #94a3b8;">${timestampStr} WIB</td>
              </tr>
            </table>
          </div>

          <div style="background-color: rgba(59, 130, 246, 0.1); border-left: 4px solid #3b82f6; padding: 12px; border-radius: 6px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 11px; color: #93c5fd; line-height: 1.5;">
              <strong>Langkah Selanjutnya:</strong> Panitia akan memverifikasi bukti pembayaran dan berkas persyaratan yang Anda unggah. Informasi jadwal diklat dan grup peserta akan disampaikan berkala.
            </p>
          </div>

          <div style="text-align: center;">
            <a href="https://wa.me/6285785728066?text=Halo%20Panitia%20Teater%20Q,%20saya%20telah%20mendaftar%20dengan%20ID%20${memberId}%20a.n%20${encodeURIComponent(nama)}" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 12px; font-weight: bold;">
              Konfirmasi ke WhatsApp Panitia
            </a>
          </div>
        </div>

        <div style="background-color: #0b1120; padding: 14px; text-align: center; font-size: 10px; color: #64748b; border-top: 1px solid #1e293b;">
          Sekretariat UKM Paguyuban Teater "Q" | Gedung B FSH UIN Sunan Ampel Surabaya<br/>
          Surel Resmi: teaterq.uinsa@gmail.com
        </div>
      </div>
    `;

    try {
      MailApp.sendEmail({
        to: applicantEmail,
        subject: subjectPeserta,
        htmlBody: htmlPeserta,
        name: 'UKM Paguyuban Teater Q'
      });
    } catch (e) {
      Logger.log('Gagal kirim email ke peserta: ' + e);
    }
  }

  // 2. EMAIL NOTIFIKASI KE PANITIA (OFFICIAL EMAIL)
  if (PANITIA_EMAIL && PANITIA_EMAIL.indexOf('@') !== -1) {
    const subjectPanitia = `[Pendaftar Baru] ${nama} - ${kategori} (${memberId})`;
    const htmlPanitia = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; color: #1e293b;">
        <div style="background-color: #1e3a8a; color: white; padding: 16px 20px;">
          <h3 style="margin: 0; font-size: 16px;">Pemberitahuan Pendaftar Baru Masuk</h3>
          <p style="margin: 4px 0 0 0; font-size: 11px; opacity: 0.85;">Website Rekrutmen UKM Paguyuban Teater Q</p>
        </div>
        <div style="padding: 20px; font-size: 12px; line-height: 1.6;">
          <p style="margin-top: 0;">Ada pendaftar baru yang telah mengisi formulir 1 pintu:</p>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; color: #64748b; width: 35%;">ID Pendaftar:</td><td style="padding: 6px 0; font-weight: bold; color: #0284c7;">${memberId}</td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; color: #64748b;">Nama:</td><td style="padding: 6px 0; font-weight: bold;">${nama}</td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; color: #64748b;">WhatsApp:</td><td style="padding: 6px 0;"><a href="https://wa.me/${noHp.replace(/[^0-9]/g, '')}">${noHp}</a></td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; color: #64748b;">Email:</td><td style="padding: 6px 0;">${applicantEmail}</td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; color: #64748b;">Fakultas / Prodi:</td><td style="padding: 6px 0;">${fakultas} / ${jurusan}</td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; color: #64748b;">Peminatan:</td><td style="padding: 6px 0; font-weight: bold; color: #2563eb;">${kategori}</td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; color: #64748b;">Biaya Bayar:</td><td style="padding: 6px 0; font-weight: bold; color: #059669;">${totalBayar}</td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; color: #64748b;">Waktu:</td><td style="padding: 6px 0;">${timestampStr}</td></tr>
          </table>

          <div style="background-color: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 16px; border: 1px solid #e2e8f0;">
            <strong>Tautan Cek Berkas di Google Drive:</strong><br/>
            ${buktiTransferUrl ? `<a href="${buktiTransferUrl}" target="_blank" style="color: #2563eb; display: inline-block; margin-top: 4px;">Lihat Bukti Transfer</a> &bull; ` : ''}
            ${fotoUrl ? `<a href="${fotoUrl}" target="_blank" style="color: #2563eb; display: inline-block; margin-top: 4px;">Lihat Pas Foto</a>` : ''}
          </div>

          <p style="margin-bottom: 0; font-size: 11px; color: #64748b;">Silakan buka Google Spreadsheet tab <em>Pendaftaran</em> untuk memvalidasi dan mengubah status dari Pending ke ACC jika pembayaran sudah sah.</p>
        </div>
      </div>
    `;

    try {
      MailApp.sendEmail({
        to: PANITIA_EMAIL,
        subject: subjectPanitia,
        htmlBody: htmlPanitia,
        name: 'Sistem Oprec Teater Q'
      });
    } catch (e) {
      Logger.log('Gagal kirim email ke panitia: ' + e);
    }
  }
}

/**
 * Fungsi Pengujian: Menjalankan Otorisasi Izin Akses Email dari Google
 * (Jalankan fungsi ini sekali di editor Apps Script agar Google memunculkan pop-up 'Review permissions')
 */
function tesKirimEmail() {
  const emailTujuan = Session.getActiveUser().getEmail() || PANITIA_EMAIL;
  MailApp.sendEmail({
    to: emailTujuan,
    subject: "Tes Otorisasi Email Teater Q Berhasil!",
    htmlBody: `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f1f5f9; border-radius: 12px;">
        <h2 style="color: #1e3a8a;">Otorisasi Email Berhasil Aktif!</h2>
        <p>Halo Panitia Teater Q, izin pengiriman email otomatis dari Google Apps Script sudah resmi diizinkan.</p>
        <p>Mulai sekarang, setiap pendaftar baru akan otomatis menerima email bukti pendaftaran dan panitia akan menerima notifikasi.</p>
      </div>
    `,
    name: 'UKM Paguyuban Teater Q'
  });
  Logger.log('Email pengujian berhasil dikirim ke: ' + emailTujuan);
}
