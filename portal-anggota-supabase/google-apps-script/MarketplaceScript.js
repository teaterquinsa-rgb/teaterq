/**
 * ============================================================================
 * GOOGLE APPS SCRIPT: MARKETPLACE & STOK OTOMATIS TEATER Q
 * Endpoint Web App untuk Tab Produk, Pesanan, & Rekap Transaksi Q-Store
 * ============================================================================
 */

function doGet(e) {
  const p = (e && e.parameter) ? e.parameter : {};
  const action = p.action || '';

  if (action === 'confirm_order') {
    return handleConfirmOrder(p);
  }

  // Update Status Transaksi Q-Store (ACC Admin)
  if (action === 'update_qstore_order' || action === 'update_qstore_status') {
    return handleUpdateQStoreOrder(p);
  }

  // Cek Status Pesanan Q-Store (Anti-Tembak Pulsa Ganda)
  if (action === 'check_order_status' || action === 'get_order_status') {
    return handleCheckOrderStatus(p);
  }

  // Rekap Laba Terpusat Q-Store (Diakses oleh Portal Web)
  if (action === 'get_qstore_profit' || action === 'get_qstore_summary') {
    return handleGetQStoreProfit();
  }

  // Konfigurasi Folder Drive Dokumentasi (Dibaca dari sheet Drive_Folder)
  if (action === 'get_drive_folders') {
    return handleGetDriveFolderList();
  }

  // Realtime JSON endpoint: kembalikan data produk langsung dari spreadsheet (0 delay)
  if (action === 'get_products' || action === 'get_marketplace' || !action) {
    return handleGetProducts();
  }

  return ContentService.createTextOutput('Marketplace & Q-Store API Teater Q Siap dan Aktif.')
    .setMimeType(ContentService.MimeType.TEXT);
}

const SPREADSHEET_ID = '154RqVr1rCk3Yx1oVFqRMNVoT1Qyc1lQ8fDlS0kV2-xg';

function getSpreadsheet() {
  let ss = null;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {}
  if (!ss) {
    try {
      ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    } catch (e) {}
  }
  return ss;
}

function getSheetProduk() {
  const ss = getSpreadsheet();
  let sheet = null;
  if (ss) {
    sheet = ss.getSheetByName('Produk') || ss.getSheets()[0];
  }
  return sheet;
}

function getSheetTransaksiQStore() {
  const ss = getSpreadsheet();
  if (!ss) return null;
  let sheet = ss.getSheetByName('Transaksi_QStore');
  if (!sheet) {
    sheet = ss.insertSheet('Transaksi_QStore');
    sheet.appendRow([
      'Tanggal & Waktu',
      'No Order',
      'No HP / ID Tujuan',
      'Produk',
      'Harga Modal',
      'Harga Jual',
      'Laba Kas',
      'Status',
      'Trx ID Server'
    ]);
    sheet.getRange(1, 1, 1, 9).setBackground('#047857').setFontColor('#FFFFFF').setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function handleGetProducts() {
  try {
    let sheet = getSheetProduk();
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ error: 'Sheet Produk tidak ditemukan' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    ensureProductHeaders(sheet);

    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();

    if (lastRow < 2) {
      return ContentService.createTextOutput(JSON.stringify([]))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    const headers = values[0].map(h => String(h || '').trim());
    const products = [];

    for (let r = 1; r < values.length; r++) {
      const row = values[r];
      const hasData = row.some(cell => String(cell !== undefined && cell !== null ? cell : '').trim() !== '');
      if (!hasData) continue;

      const item = {};
      headers.forEach((h, colIdx) => {
        if (h) {
          const val = row[colIdx];
          item[h] = (val !== undefined && val !== null) ? String(val).trim() : '';
        }
      });
      products.push(item);
    }

    return ContentService.createTextOutput(JSON.stringify(products))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
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

    if (!data.action && e && e.parameter && e.parameter.action) {
      data = Object.assign({}, e.parameter, data);
    }

    const action = data.action || '';
    if (action === 'add_marketplace_item') {
      return handleAddProduct(data);
    }

    // Catat Transaksi Masuk Q-Store ke Google Sheets
    if (action === 'log_qstore_order') {
      return handleLogQStoreOrder(data);
    }

    // Update Status Transaksi Q-Store (ACC Admin)
    if (action === 'update_qstore_order' || action === 'update_qstore_status') {
      return handleUpdateQStoreOrder(data);
    }

    // Cek Status Pesanan Q-Store (Anti-Tembak Pulsa Ganda)
    if (action === 'check_order_status' || action === 'get_order_status') {
      return handleCheckOrderStatus(data);
    }

    // Proxy Gerbang VIP Reseller (Bebas Blokir IP Whitelist)
    if (action === 'vip_order_proxy') {
      return handleVipOrderProxy(data);
    }

    // Unggah Foto / Video Dokumentasi ke Google Drive
    if (action === 'upload_documentation') {
      return handleUploadDocumentation(data);
    }

    return ContentService.createTextOutput(JSON.stringify({ result: 'error', message: 'Aksi tidak dikenal' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ result: 'error', error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ----------------------------------------------------------------------------
// HANDLER PROXY VIP RESELLER (BYPASS WHITELIST DENGAN IP GERBANG RESMI)
// ----------------------------------------------------------------------------
function handleVipOrderProxy(data) {
  try {
    const vipKey = data.key || 'yRVpjMIge62BmjuBL4KfpfQxF5y4ZV3dhSNtrLeB6Bpj1gN6r9Hyhs2ybUgfyiYg';
    const vipSign = data.sign || '01e0619be74da94d77a1d1f39fcb72d0';
    const type = data.type || 'order';
    const service = data.service || '';
    const dataNo = data.data_no || '';

    const payload = {
      key: vipKey,
      sign: vipSign,
      type: type,
      service: service,
      data_no: dataNo
    };

    if (data.trxid) payload.trxid = data.trxid;

    const WHITELIST_IP = '182.8.98.93';

    const options = {
      method: 'post',
      headers: {
        'X-Forwarded-For': WHITELIST_IP,
        'Client-IP': WHITELIST_IP
      },
      payload: payload,
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch('https://vip-reseller.co.id/api/prepaid', options);
    const respText = response.getContentText();

    return ContentService.createTextOutput(respText)
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      result: false,
      message: 'Proxy Error: ' + err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ----------------------------------------------------------------------------
// HANDLER Q-STORE: LOG TRANSAKSI & HITUNG TOTAL LABA (SMART AUTO MAPPING)
// ----------------------------------------------------------------------------
function handleLogQStoreOrder(data) {
  try {
    const sheet = getSheetTransaksiQStore();
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ result: 'error', message: 'Gagal membuka sheet Transaksi_QStore' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const lastCol = Math.max(sheet.getLastColumn(), 8);
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h || '').trim().toLowerCase());

    const timestamp = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy HH:mm:ss');
    const orderId = data.orderId || ('TX' + new Date().getTime());
    const target = data.target || '';
    const product = data.product || '';
    const modal = Number(data.price || data.modal || 0);
    const jual = Number(data.total || data.jual || 0);
    const laba = Number(data.adminFee || data.laba || (jual > modal ? (jual - modal) : 0));
    const status = data.status || 'success';
    const trxid = data.trxid || '';

    // Pemetaan fleksibel menyesuaikan posisi kolom di spreadsheet pengguna
    const rowData = new Array(lastCol).fill('');
    headers.forEach((h, idx) => {
      if (h.includes('tanggal') || h.includes('waktu')) rowData[idx] = timestamp;
      else if (h.includes('order')) rowData[idx] = orderId;
      else if (h.includes('hp') || h.includes('tujuan') || h.includes('nomor')) rowData[idx] = "'" + target;
      else if (h.includes('produk') || h.includes('layanan')) rowData[idx] = product;
      else if (h.includes('modal')) rowData[idx] = modal;
      else if (h.includes('jual') || h.includes('bayar') || h.includes('total') || h.includes('harga')) {
        if (!h.includes('modal')) rowData[idx] = jual;
      }
      else if (h.includes('laba') || h.includes('untung')) rowData[idx] = laba;
      else if (h.includes('status')) rowData[idx] = status;
      else if (h.includes('trx') || h.includes('server') || h.includes('ref')) rowData[idx] = "'" + trxid;
    });

    // Fallback jika baris 1 masih kosong tanpa header
    if (rowData.every(cell => cell === '')) {
      sheet.appendRow([timestamp, orderId, "'" + target, product, modal, jual, laba, status, "'" + trxid]);
    } else {
      sheet.appendRow(rowData);
    }

    return ContentService.createTextOutput(JSON.stringify({ result: 'success', message: 'Transaksi berhasil dicatat ke spreadsheet' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ result: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ----------------------------------------------------------------------------
// HANDLER Q-STORE: UPDATE STATUS ACC ADMIN (PENDING -> SUCCESS) & ISI SN/TRXID
// ----------------------------------------------------------------------------
function handleUpdateQStoreOrder(data) {
  try {
    const sheet = getSheetTransaksiQStore();
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ result: 'error', message: 'Gagal membuka sheet Transaksi_QStore' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const orderId = String(data.orderId || data.order || data.id || '').trim();
    if (!orderId) {
      return ContentService.createTextOutput(JSON.stringify({ result: 'error', message: 'Order ID wajib diisi' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return ContentService.createTextOutput(JSON.stringify({ result: 'error', message: 'Sheet masih kosong' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const lastCol = Math.max(sheet.getLastColumn(), 9);
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h || '').trim().toLowerCase());

    let orderIdx = headers.findIndex(h => h.includes('order'));
    if (orderIdx === -1) orderIdx = 1; // Kolom B

    let statusIdx = headers.findIndex(h => h.includes('status'));
    if (statusIdx === -1) statusIdx = 7; // Kolom H

    let trxIdx = headers.findIndex(h => h.includes('trx') || h.includes('server') || h.includes('ref') || h.includes('sn'));
    if (trxIdx === -1) trxIdx = 8; // Kolom I

    const orderColumnValues = sheet.getRange(2, orderIdx + 1, lastRow - 1, 1).getValues();
    let targetRow = -1;

    for (let i = orderColumnValues.length - 1; i >= 0; i--) {
      const cellVal = String(orderColumnValues[i][0] || '').trim();
      if (cellVal === orderId || cellVal.includes(orderId) || orderId.includes(cellVal)) {
        targetRow = i + 2;
        break;
      }
    }

    if (targetRow > 1) {
      const newStatus = data.status || 'success';
      const newTrxId = data.trxid || data.sn || '';

      sheet.getRange(targetRow, statusIdx + 1).setValue(newStatus);
      if (newTrxId) {
        sheet.getRange(targetRow, trxIdx + 1).setValue("'" + newTrxId);
      }

      return ContentService.createTextOutput(JSON.stringify({
        result: 'success',
        message: 'Status order ' + orderId + ' berhasil diubah menjadi ' + newStatus,
        row: targetRow
      })).setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({
        result: 'not_found',
        message: 'Order ID ' + orderId + ' tidak ditemukan di sheet'
      })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ result: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ----------------------------------------------------------------------------
// HANDLER Q-STORE: CEK STATUS PESANAN (ANTI-DOUBLE TEMBAK PULSA OLEH ADMIN LAIN)
// ----------------------------------------------------------------------------
function handleCheckOrderStatus(p) {
  try {
    const sheet = getSheetTransaksiQStore();
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ result: 'error', isAlreadyProcessed: false }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const orderId = String(p.orderId || p.order || p.id || '').trim();
    if (!orderId) {
      return ContentService.createTextOutput(JSON.stringify({ result: 'error', isAlreadyProcessed: false }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return ContentService.createTextOutput(JSON.stringify({ result: 'not_found', isAlreadyProcessed: false }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const lastCol = Math.max(sheet.getLastColumn(), 9);
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h || '').trim().toLowerCase());

    let orderIdx = headers.findIndex(h => h.includes('order'));
    if (orderIdx === -1) orderIdx = 1;

    let statusIdx = headers.findIndex(h => h.includes('status'));
    if (statusIdx === -1) statusIdx = 7;

    let trxIdx = headers.findIndex(h => h.includes('trx') || h.includes('server') || h.includes('ref') || h.includes('sn'));
    if (trxIdx === -1) trxIdx = 8;

    const data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    for (let i = data.length - 1; i >= 0; i--) {
      const row = data[i];
      const rowOrder = String(row[orderIdx] || '').trim();
      if (rowOrder === orderId || rowOrder.includes(orderId) || orderId.includes(rowOrder)) {
        const st = String(row[statusIdx] || '').trim().toLowerCase();
        const trx = String(row[trxIdx] || '').trim();
        const isSuccess = (st === 'success' || st === 'berhasil' || st === 'lunas');
        return ContentService.createTextOutput(JSON.stringify({
          result: 'success',
          orderId: orderId,
          status: st,
          isAlreadyProcessed: isSuccess,
          trxid: trx
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ result: 'not_found', isAlreadyProcessed: false }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ result: 'error', isAlreadyProcessed: false, message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleGetQStoreProfit() {
  try {
    const sheet = getSheetTransaksiQStore();
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ result: 'success', totalProfit: 0, count: 0 }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return ContentService.createTextOutput(JSON.stringify({ result: 'success', totalProfit: 0, count: 0 }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const lastCol = Math.max(sheet.getLastColumn(), 8);
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h || '').trim().toLowerCase());
    
    let labaIdx = headers.findIndex(h => h.includes('laba') || h.includes('untung'));
    if (labaIdx === -1) labaIdx = 6; // fallback index kolom laba

    let statusIdx = headers.findIndex(h => h.includes('status'));
    if (statusIdx === -1) statusIdx = 7;

    const data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    let totalLaba = 0;
    let count = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const laba = parseInt(String(row[labaIdx]).replace(/[^0-9]/g, '') || '0', 10);
      const status = String(row[statusIdx] || '').toLowerCase();
      
      // Hitung semua transaksi yang berhasil
      if (status.includes('success') || status.includes('berhasil') || status.includes('lunas') || !status) {
        totalLaba += laba;
        count++;
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      result: 'success',
      totalProfit: totalLaba,
      count: count
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ result: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ----------------------------------------------------------------------------
// HANDLER PASAR KARYA / PRODUK
// ----------------------------------------------------------------------------
function handleAddProduct(data) {
  let sheet = getSheetProduk();
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ result: 'error', message: 'Sheet Produk tidak ditemukan' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const id = data.id || 'LAPAK-' + new Date().getTime();
  const nama = data.nama || '';
  const harga = data.harga || '0';
  const stok = data.stok || '10';
  const terjual = data.terjual || 0;
  const deskripsi = data.deskripsi || '';
  const wa = data.wa || '';
  const rekening = data.rekening || '';
  const shopee = data.shopee || data.linkShopee || '';
  const tokopedia = data.tokopedia || data.linkTokopedia || '';
  const tiktok = data.tiktok || data.linkTiktok || '';
  const foto = data.foto || '';
  const numStok = parseInt(String(stok).replace(/[^0-9]/g, '') || '0', 10);
  const status = (numStok > 0) ? (data.status || 'Tersedia') : 'Habis';
  const kategori = data.kategori || 'Lainnya';
  const penjual = data.penjual || 'Official Teater Q';
  const kotaAsal = data.kotaAsal || 'Surabaya';

  ensureProductHeaders(sheet);

  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim().toLowerCase());
  
  const rowData = new Array(lastCol).fill('');
  const mapField = {
    'id': id,
    'nama produk': nama,
    'harga': harga,
    'stok': stok,
    'terjual': terjual,
    'deskripsi': deskripsi,
    'wa': wa,
    'foto': foto,
    'status': status,
    'kategori': kategori,
    'penjual': penjual,
    'kota asal': kotaAsal,
    'rekening': rekening,
    'rek': rekening,
    'shopee': shopee,
    'shoope': shopee,
    'shoppe': shopee,
    'shope': shopee,
    'link shopee': shopee,
    'link shoope': shopee,
    'tokopedia': tokopedia,
    'link tokopedia': tokopedia,
    'tokped': tokopedia,
    'link tokped': tokopedia,
    'tiktok': tiktok,
    'link tiktok': tiktok,
    'tiktok shop': tiktok
  };

  headers.forEach((h, idx) => {
    if (mapField.hasOwnProperty(h)) {
      rowData[idx] = mapField[h];
    }
  });

  sheet.appendRow(rowData);

  return ContentService.createTextOutput(JSON.stringify({ result: 'success', id: id }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleConfirmOrder(p) {
  let sheetProduk = getSheetProduk();
  if (!sheetProduk) {
    return ContentService.createTextOutput(JSON.stringify({ result: 'error', message: 'Sheet Produk tidak ditemukan' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  ensureProductHeaders(sheetProduk);

  const idTarget = (p.id || '').trim();
  const namaTarget = (p.product || '').trim();
  const qty = Math.max(1, parseInt(p.qty || '1', 10));
  const orderId = (p.order || 'TQ-ORD-' + Math.floor(1000 + Math.random() * 9000)).trim();
  const buyerName = (p.buyer || 'Pembeli').trim();
  const buyerWa = (p.buyerWa || '').trim();
  const sellerName = (p.seller || 'Penjual').trim();
  const sellerWa = (p.sellerWa || '').replace(/[^0-9]/g, '');
  const totalBayar = p.total || '0';
  const alamatKirim = (p.address || '').trim();

  const lastCol = sheetProduk.getLastColumn();
  const headers = sheetProduk.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim().toLowerCase());

  const colId = headers.indexOf('id') + 1;
  const colNama = headers.indexOf('nama produk') + 1;
  const colStok = headers.indexOf('stok') + 1;
  const colTerjual = headers.indexOf('terjual') + 1;
  const colStatus = headers.indexOf('status') + 1;

  const lastRow = sheetProduk.getLastRow();
  let targetRow = -1;
  let produkNameFound = namaTarget;

  if (lastRow > 1) {
    const data = sheetProduk.getRange(2, 1, lastRow - 1, lastCol).getValues();
    for (let i = 0; i < data.length; i++) {
      const rowId = String(data[i][colId - 1] || '').trim();
      const rowName = String(data[i][colNama - 1] || '').trim();
      if ((idTarget && rowId === idTarget) || (namaTarget && rowName.toLowerCase() === namaTarget.toLowerCase())) {
        targetRow = i + 2;
        produkNameFound = rowName || namaTarget;
        break;
      }
    }
  }

  const ss = getSpreadsheet();
  let sheetPesanan = ss ? ss.getSheetByName('Pesanan') : null;

  // 1. CEK ANTI-DUPLIKASI: Jika order ini sudah pernah diverifikasi, jangan potong stok lagi!
  if (sheetPesanan && sheetPesanan.getLastRow() > 1) {
    const lastRowPesanan = sheetPesanan.getLastRow();
    const dataOrders = sheetPesanan.getRange(2, 2, lastRowPesanan - 1, 1).getValues(); // Kolom B: No Order
    for (let o = 0; o < dataOrders.length; o++) {
      if (String(dataOrders[o][0] || '').trim().toLowerCase() === orderId.toLowerCase()) {
        return renderAlreadyConfirmedHtml(orderId, namaTarget, buyerName, sellerName, sellerWa);
      }
    }
  }

  let sisaStok = 0;
  let totalTerjual = qty;

  if (targetRow > 0) {
    const curStokRaw = sheetProduk.getRange(targetRow, colStok).getValue();
    const curStok = parseInt(String(curStokRaw).replace(/[^0-9]/g, '') || '0', 10);

    const curTerjualRaw = colTerjual > 0 ? sheetProduk.getRange(targetRow, colTerjual).getValue() : 0;
    const curTerjual = parseInt(String(curTerjualRaw).replace(/[^0-9]/g, '') || '0', 10);

    sisaStok = Math.max(0, curStok - qty);
    totalTerjual = curTerjual + qty;

    sheetProduk.getRange(targetRow, colStok).setValue(sisaStok);
    if (colTerjual > 0) {
      sheetProduk.getRange(targetRow, colTerjual).setValue(totalTerjual);
    }

    if (colStatus > 0) {
      sheetProduk.getRange(targetRow, colStatus).setValue(sisaStok > 0 ? 'Tersedia' : 'Habis');
    }
  }

  if (ss && !sheetPesanan) {
    sheetPesanan = ss.insertSheet('Pesanan');
    sheetPesanan.appendRow([
      'Tanggal & Waktu',
      'No Order',
      'ID Produk',
      'Nama Produk',
      'Qty',
      'Total Bayar',
      'Nama Pembeli',
      'WhatsApp Pembeli',
      'Alamat Pengiriman',
      'Penjual',
      'Status'
    ]);
    sheetPesanan.getRange(1, 1, 1, 11).setBackground('#047857').setFontColor('#FFFFFF').setFontWeight('bold');
  }

  const timestamp = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy HH:mm:ss');
  if (sheetPesanan) {
    sheetPesanan.appendRow([
      timestamp,
      orderId,
      idTarget,
      produkNameFound,
      qty,
      totalBayar,
      buyerName,
      buyerWa,
      alamatKirim,
      sellerName,
      'LUNAS (Admin Verified)'
    ]);
  }

  let cleanSellerWa = sellerWa;
  if (cleanSellerWa.startsWith('0')) cleanSellerWa = '62' + cleanSellerWa.slice(1);

  const forwardMsg = 'Halo ' + sellerName + ', dana pesanan Q Store Teater Q dengan rincian berikut sudah *LUNAS & DIVERIFIKASI* oleh Admin:\n\n' +
    '*No. Order:* #' + orderId + '\n' +
    '*Produk:* ' + produkNameFound + ' (' + qty + ' pcs)\n' +
    '*Nama Pembeli:* ' + buyerName + '\n' +
    (alamatKirim ? '*Alamat Kirim:* ' + alamatKirim + '\n' : '*Pengambilan:* Langsung di Sanggar / COD\n') +
    '\nPembeli sudah melampirkan bukti transfer. Mohon segera dipacking dan dikirim ke pembeli ya. Terima kasih!';

  const linkWaForward = cleanSellerWa ? 'https://wa.me/' + cleanSellerWa + '?text=' + encodeURIComponent(forwardMsg) : '';

  const html = '<!DOCTYPE html>' +
    '<html lang="id">' +
    '<head>' +
    '<meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>Pesanan Lunas</title>' +
    '<style>' +
    'body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; background: #0b1329; color: #f8fafc; padding: 24px 16px; margin: 0; display: flex; justify-content: center; align-items: center; min-height: 90vh; }' +
    '.card { background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 28px 24px; max-width: 440px; width: 100%; box-shadow: 0 16px 36px rgba(0,0,0,0.6); text-align: center; }' +
    '.icon-success { width: 64px; height: 64px; background: #065f46; color: #34d399; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 0 auto 16px auto; font-weight: bold; }' +
    'h2 { margin: 0 0 8px 0; color: #ffffff; font-size: 20px; }' +
    '.order-badge { background: #0284c7; color: #ffffff; font-size: 13px; font-weight: bold; padding: 4px 12px; border-radius: 9999px; display: inline-block; margin-bottom: 16px; }' +
    'p { color: #94a3b8; font-size: 13px; line-height: 1.5; margin: 0 0 16px 0; }' +
    '.box-info { background: #0f172a; border-radius: 12px; padding: 14px 16px; margin-bottom: 16px; text-align: left; font-size: 13px; border: 1px solid #334155; }' +
    '.row-info { display: flex; justify-content: space-between; margin-bottom: 8px; }' +
    '.row-info:last-child { margin-bottom: 0; }' +
    '.val-bold { color: #38bdf8; font-weight: bold; }' +
    '.stock-box { background: #047857; border: 1px solid #10b981; border-radius: 12px; padding: 14px; margin-bottom: 18px; color: #ffffff; font-weight: bold; font-size: 14px; text-align: center; }' +
    '.btn-wa { display: block; background: #25D366; color: #ffffff; text-decoration: none; padding: 14px; border-radius: 12px; font-weight: bold; font-size: 14px; box-shadow: 0 6px 16px rgba(37,211,102,0.35); }' +
    '.hint { font-size: 11px; color: #64748b; margin-top: 14px; }' +
    '</style>' +
    '</head>' +
    '<body>' +
    '<div class="card">' +
    '<div class="icon-success">&#10003;</div>' +
    '<div class="order-badge">STATUS: LUNAS & DIVERIFIKASI</div>' +
    '<h2>Pesanan #' + orderId + '</h2>' +
    '<p>Stok produk dan data penjualan di Google Spreadsheet berhasil diperbarui secara otomatis.</p>' +
    '<div class="box-info">' +
    '<div class="row-info"><span>Produk:</span> <span class="val-bold">' + produkNameFound + '</span></div>' +
    '<div class="row-info"><span>Jumlah Terjual:</span> <span>' + qty + ' pcs</span></div>' +
    '<div class="row-info"><span>Total Bayar:</span> <span class="val-bold">Rp ' + Number(totalBayar).toLocaleString('id-ID') + '</span></div>' +
    '<div class="row-info"><span>Pembeli:</span> <span>' + buyerName + '</span></div>' +
    '<div class="row-info"><span>Penjual:</span> <span>' + sellerName + '</span></div>' +
    '</div>' +
    '<div class="stock-box">' +
    '&#128230; Sisa Stok: ' + sisaStok + ' pcs &nbsp;&bull;&nbsp; &#128293; Total Terjual: ' + totalTerjual + ' pcs' +
    '</div>' +
    (linkWaForward ? '<a href="' + linkWaForward + '" target="_blank" class="btn-wa">&#128242; Teruskan Pesanan ke Penjual (' + sellerName + ')</a>' : '') +
    '<div class="hint">Portal Pasar Karya UKM Paguyuban Teater Q &bull; Auto-Sync Google Sheets</div>' +
    '</div>' +
    '</body>' +
    '</html>';

  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .setTitle('Pesanan Lunas - Teater Q');
}

function renderAlreadyConfirmedHtml(orderId, produkName, buyerName, sellerName, sellerWa) {
  let cleanSellerWa = sellerWa;
  if (cleanSellerWa.startsWith('0')) cleanSellerWa = '62' + cleanSellerWa.slice(1);
  const forwardMsg = 'Halo ' + sellerName + ', pesanan #' + orderId + ' (' + produkName + ') sudah berstatus LUNAS dan diverifikasi oleh admin Teater Q.';
  const linkWaForward = cleanSellerWa ? 'https://wa.me/' + cleanSellerWa + '?text=' + encodeURIComponent(forwardMsg) : '';

  const html = '<!DOCTYPE html>' +
    '<html lang="id">' +
    '<head>' +
    '<meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>Pesanan Sudah Diverifikasi</title>' +
    '<style>' +
    'body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; background: #0b1329; color: #f8fafc; padding: 24px 16px; margin: 0; display: flex; justify-content: center; align-items: center; min-height: 90vh; }' +
    '.card { background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 28px 24px; max-width: 440px; width: 100%; box-shadow: 0 16px 36px rgba(0,0,0,0.6); text-align: center; }' +
    '.icon-info { width: 64px; height: 64px; background: #075985; color: #38bdf8; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 0 auto 16px auto; font-weight: bold; }' +
    'h2 { margin: 0 0 8px 0; color: #ffffff; font-size: 20px; }' +
    '.order-badge { background: #0284c7; color: #ffffff; font-size: 13px; font-weight: bold; padding: 4px 14px; border-radius: 9999px; display: inline-block; margin-bottom: 16px; }' +
    'p { color: #94a3b8; font-size: 13px; line-height: 1.5; margin: 0 0 16px 0; }' +
    '.alert-box { background: #0c4a6e; border: 1px solid #0284c7; border-radius: 12px; padding: 14px; margin-bottom: 18px; color: #e0f2fe; font-size: 13px; text-align: center; }' +
    '.btn-wa { display: block; background: #25D366; color: #ffffff; text-decoration: none; padding: 14px; border-radius: 12px; font-weight: bold; font-size: 14px; box-shadow: 0 6px 16px rgba(37,211,102,0.35); margin-top: 12px; }' +
    '.hint { font-size: 11px; color: #64748b; margin-top: 14px; }' +
    '</style>' +
    '</head>' +
    '<body>' +
    '<div class="card">' +
    '<div class="icon-info">&#10003;</div>' +
    '<div class="order-badge">SUDAH DIVERIFIKASI</div>' +
    '<h2>Pesanan #' + orderId + '</h2>' +
    '<div class="alert-box"><strong>Perhatian Admin:</strong> Pesanan ini <u>sudah pernah diverifikasi sebelumnya</u>.<br>Stok produk <strong>TIDAK dipotong ganda</strong> untuk menjaga keamanan data.</div>' +
    '<p>Produk: <strong>' + produkName + '</strong><br>Pembeli: ' + buyerName + '</p>' +
    (linkWaForward ? '<a href="' + linkWaForward + '" target="_blank" class="btn-wa">&#128242; Hubungi Penjual (' + sellerName + ')</a>' : '') +
    '<div class="hint">Portal Pasar Karya UKM Paguyuban Teater Q &bull; Anti-Duplikasi Stok</div>' +
    '</div>' +
    '</body>' +
    '</html>';

  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .setTitle('Pesanan Sudah Diverifikasi - Teater Q');
}

function ensureProductHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['ID', 'Nama Produk', 'Harga', 'Stok', 'Terjual', 'Deskripsi', 'Wa', 'Rekening', 'Foto', 'Status', 'Kategori', 'Penjual', 'Kota Asal']);
    sheet.getRange(1, 1, 1, 13).setBackground('#1e293b').setFontColor('#FFFFFF').setFontWeight('bold');
    return;
  }

  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim().toLowerCase());
  
  if (headers.indexOf('terjual') === -1) {
    const stokIdx = headers.indexOf('stok');
    const insertAfterCol = stokIdx !== -1 ? stokIdx + 1 : lastCol;
    sheet.insertColumnAfter(insertAfterCol);
    sheet.getRange(1, insertAfterCol + 1).setValue('Terjual').setBackground('#1e293b').setFontColor('#FFFFFF').setFontWeight('bold');
  }

  const updatedHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim().toLowerCase());
  if (updatedHeaders.indexOf('rekening') === -1) {
    const waIdx = updatedHeaders.indexOf('wa');
    const insertAfterCol = waIdx !== -1 ? waIdx + 1 : sheet.getLastColumn();
    sheet.insertColumnAfter(insertAfterCol);
    sheet.getRange(1, insertAfterCol + 1).setValue('Rekening').setBackground('#1e293b').setFontColor('#FFFFFF').setFontWeight('bold');
  }

  const curHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim().toLowerCase());
  if (curHeaders.indexOf('shopee') === -1 && curHeaders.indexOf('link shopee') === -1) {
    const col = sheet.getLastColumn() + 1;
    sheet.getRange(1, col).setValue('Shopee').setBackground('#ea580c').setFontColor('#FFFFFF').setFontWeight('bold');
  }
  const curHeaders2 = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim().toLowerCase());
  if (curHeaders2.indexOf('tokopedia') === -1 && curHeaders2.indexOf('link tokopedia') === -1 && curHeaders2.indexOf('tokped') === -1) {
    const col = sheet.getLastColumn() + 1;
    sheet.getRange(1, col).setValue('Tokopedia').setBackground('#059669').setFontColor('#FFFFFF').setFontWeight('bold');
  }
  const curHeaders3 = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim().toLowerCase());
  if (curHeaders3.indexOf('tiktok') === -1 && curHeaders3.indexOf('link tiktok') === -1 && curHeaders3.indexOf('tiktok shop') === -1) {
    const col = sheet.getLastColumn() + 1;
    sheet.getRange(1, col).setValue('Tiktok').setBackground('#0f172a').setFontColor('#FFFFFF').setFontWeight('bold');
  }
}

// ============================================================================
// MODUL DOKUMENTASI DRIVE UPLOADER TEATER Q
// ============================================================================
const DEFAULT_MASTER_FOLDER_ID = '1zJ2jeJWo_JQJzgMxAozhHE9BwJSTP0sr';

function getSheetDriveFolder() {
  const ss = getSpreadsheet();
  if (!ss) return null;
  let sheet = ss.getSheetByName('Drive_Folder');
  if (!sheet) {
    sheet = ss.insertSheet('Drive_Folder');
    sheet.appendRow(['Tahun', 'Folder ID / Link Drive', 'Keterangan']);
    sheet.getRange(1, 1, 1, 3).setBackground('#4338ca').setFontColor('#FFFFFF').setFontWeight('bold');
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

function getSheetLogDokumentasi() {
  const ss = getSpreadsheet();
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

function extractDriveFolderId(input) {
  if (!input) return '';
  const str = String(input).trim();
  const match = str.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) return match[1];
  return str;
}

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

function handleGetDriveFolderList() {
  const map = getDriveFolderMap();
  const yearsList = Object.keys(map.years);
  const currentYear = new Date().getFullYear().toString();
  if (yearsList.indexOf(currentYear) === -1) yearsList.unshift(currentYear);

  return ContentService.createTextOutput(JSON.stringify({
    result: 'success',
    masterFolderId: map.masterFolderId,
    years: yearsList,
    folderMap: map.years
  })).setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateYearFolder(year, map) {
  const targetYear = String(year || new Date().getFullYear()).trim();
  if (map.years[targetYear]) {
    try {
      return DriveApp.getFolderById(map.years[targetYear]);
    } catch (e) {
      Logger.log('Folder tahun ' + targetYear + ' invalid, fallback to master...');
    }
  }

  let masterFolder = null;
  try {
    masterFolder = DriveApp.getFolderById(map.masterFolderId);
  } catch (e) {
    masterFolder = DriveApp.getRootFolder();
  }

  const yearFolders = masterFolder.getFoldersByName(targetYear);
  if (yearFolders.hasNext()) {
    return yearFolders.next();
  }

  const newYearFolder = masterFolder.createFolder(targetYear);
  try {
    newYearFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const sheet = getSheetDriveFolder();
    if (sheet) {
      sheet.appendRow([targetYear, newYearFolder.getId(), 'Otomatis dibuat oleh sistem']);
    }
  } catch (e) {}
  return newYearFolder;
}

function getOrCreateEventFolder(yearFolder, eventName, eventDate, uploaderName) {
  const cleanEvent = (eventName || 'Kegiatan Teater Q').trim().replace(/[\/\\:*?"<>|]/g, '-');
  const cleanDate = (eventDate || Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd')).trim();
  const cleanUploader = (uploaderName || 'Anggota Sanggar').trim().replace(/[\/\\:*?"<>|]/g, '-');
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

    if (!base64Data) throw new Error('Data berkas base64 kosong');

    if (base64Data.indexOf(',') > -1) {
      const parts = base64Data.split(',');
      const header = parts[0];
      base64Data = parts[1];
      const matchMime = header.match(/data:(.*?);/);
      if (matchMime && matchMime[1]) mimeType = matchMime[1];
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
