/**
 * ============================================================================
 * SUPABASE CLIENT & REALTIME SYNC - PORTAL ANGGOTA TEATER Q
 * Menghubungkan Portal Anggota ke Cloud Database Supabase secara Real-time
 * Hemat Kuota, Bebas Delay, & Sinkron Otomatis Lintas Admin & Anggota
 * ============================================================================
 */

const SUPABASE_CONFIG = {
  url: "https://lpbnvkbwuqszcvvomods.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwYm52a2J3dXFzemN2dm9tb2RzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MDA2MzEsImV4cCI6MjA4MzA3NjYzMX0.VaNq7W3mmtruBBnJNcq0LU_JopaqWk_10WKyCNm2y3g",
  enabled: true
};

const SupabaseDB = {
  client: null,
  isInitialized: false,
  activeChannels: {},
  realtimeCallbacks: {
    danaAbadi: [],
    danaHibah: [],
    absensi: [],
    mading: [],
    muter: []
  },

  init() {
    if (this.isInitialized && this.client) return this.client;
    if (typeof supabase === "undefined") {
      console.warn("[Supabase] SDK belum termuat.");
      return null;
    }

    try {
      this.client = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
        auth: { persistSession: false },
        realtime: { params: { eventsPerSecond: 10 } }
      });
      this.isInitialized = true;
      console.log("[Supabase] Terhubung ke Cloud Teater Q!");
      return this.client;
    } catch (err) {
      console.error("[Supabase] Gagal inisialisasi:", err);
      return null;
    }
  },

  getClient() {
    if (!this.client) this.init();
    return this.client;
  },

  isConfigured() {
    return Boolean(SUPABASE_CONFIG.enabled && SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey);
  },

  // ==========================================================================
  // REALTIME SUBSCRIPTION (HEMAT LIMIT & AUTO RESUME)
  // ==========================================================================

  subscribeTable(channelKey, tableName, onEvent) {
    const sb = this.getClient();
    if (!sb) return null;

    if (this.activeChannels[channelKey]) {
      try { sb.removeChannel(this.activeChannels[channelKey]); } catch(e) {}
    }

    const channel = sb
      .channel(`rt_${channelKey}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: tableName },
        (payload) => {
          console.log(`[Supabase Realtime] Event '${tableName}':`, payload.eventType);
          if (typeof onEvent === "function") onEvent(payload);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`[Supabase Realtime] Aktif untuk tabel '${tableName}'`);
        }
      });

    this.activeChannels[channelKey] = channel;
    return channel;
  },

  setupRealtimeListeners() {
    const sb = this.getClient();
    if (!sb) return;

    // 1. Realtime Dana Abadi
    this.subscribeTable("dana_abadi", "dana_abadi", (payload) => {
      this.realtimeCallbacks.danaAbadi.forEach(cb => { try { cb(payload); } catch(e){} });
    });

    // 2. Realtime Dana Abadi Config (Target Tahunan & Laba Usaha)
    this.subscribeTable("dana_abadi_config", "dana_abadi_config", (payload) => {
      this.realtimeCallbacks.danaAbadi.forEach(cb => { try { cb(payload); } catch(e){} });
    });

    // 3. Realtime Dana Hibah
    this.subscribeTable("dana_hibah", "dana_hibah", (payload) => {
      this.realtimeCallbacks.danaHibah.forEach(cb => { try { cb(payload); } catch(e){} });
    });

    // 4. Realtime Mading Karya (0ms delay ketika ada karya baru/pembaruan)
    this.subscribeTable("mading", "mading", (payload) => {
      this.realtimeCallbacks.mading.forEach(cb => { try { cb(payload); } catch(e){} });
    });

    // 5. Realtime MUTER Persidangan (0ms sync ketika naskah disahkan/diupdate di Supabase)
    this.subscribeTable("muter", "muter", (payload) => {
      this.realtimeCallbacks.muter.forEach(cb => { try { cb(payload); } catch(e){} });
    });
  },

  onDanaAbadiChange(callback) {
    if (typeof callback === "function") {
      this.realtimeCallbacks.danaAbadi.push(callback);
    }
  },

  onDanaHibahChange(callback) {
    if (typeof callback === "function") {
      this.realtimeCallbacks.danaHibah.push(callback);
    }
  },

  onMadingChange(callback) {
    if (typeof callback === "function") {
      this.realtimeCallbacks.mading.push(callback);
    }
  },

  onMuterChange(callback) {
    if (typeof callback === "function") {
      this.realtimeCallbacks.muter.push(callback);
    }
  },

  onAbsensiChange(callback) {
    if (typeof callback === "function") {
      this.realtimeCallbacks.absensi.push(callback);
    }
  },

  // ==========================================================================
  // DATA FETCHER MUTER (MUSYAWARAH TEATER)
  // ==========================================================================

  async getMuter() {
    const sb = this.getClient();
    if (!sb) throw new Error("Supabase Client belum siap.");
    const { data, error } = await sb
      .from("muter")
      .select("*")
      .order("id", { ascending: true });
    if (error) throw error;
    return data || [];
  },

  // ==========================================================================
  // DATA FETCHER DANA ABADI (KILAT 30ms)
  // ==========================================================================

  async getDanaAbadi() {
    const sb = this.getClient();
    if (!sb) throw new Error("Supabase Client belum siap.");

    const [resMutasi, resConfig] = await Promise.all([
      sb.from("dana_abadi").select("*").order("id", { ascending: false }),
      sb.from("dana_abadi_config").select("*").eq("id", 1).limit(1)
    ]);

    if (resMutasi.error) throw resMutasi.error;

    const mutasiList = resMutasi.data || [];
    const cfg = (resConfig.data && resConfig.data[0]) ? resConfig.data[0] : { target_tahunan: 10000000, laba_usaha: 16000 };
    const targetTahunIni = parseFloat(cfg.target_tahunan || 10000000);
    const labaUsaha = parseFloat(cfg.laba_usaha || 0);

    let totalMasuk = 0;
    let totalKeluar = 0;
    let jumlahDonatur = 0;

    const abadiRows = mutasiList.filter(row => {
      const kat = String(row.kategori || "").toLowerCase();
      const psn = String(row.pesan || "").toLowerCase();
      const ang = String(row.angkatan || "").toLowerCase();
      return !kat.includes("hibah") && !psn.includes("hibah") && !ang.includes("hibah");
    });

    const formattedMutasi = abadiRows.map(row => {
      const nom = Math.abs(parseFloat(row.nominal || 0));
      const tipe = (row.tipe || "masuk").toLowerCase();
      const isKeluar = tipe === "keluar" || (row.kategori || "").toLowerCase().includes("keluar") || (row.kategori || "").toLowerCase().includes("penyaluran");

      if (isKeluar) {
        totalKeluar += nom;
      } else {
        totalMasuk += nom;
        jumlahDonatur++;
      }

      const rawNama = String(row.nama || "Hamba Allah").trim();
      const isAnon = Boolean(rawNama.toLowerCase().includes("anonim") || rawNama.toLowerCase().includes("hamba allah"));
      const idFormatted = `DNA-SB-${String(row.id).padStart(4, "0")}`;

      return {
        _rowIndex: row.id,
        _dbId: row.id,
        id: idFormatted,
        ID: idFormatted,
        tanggal: row.tanggal || "-",
        waktu: row.tanggal || "-",
        nama: rawNama,
        Nama: rawNama,
        "Nama Donatur": rawNama,
        keterangan: rawNama,
        Anonim: isAnon,
        anonim: isAnon,
        angkatan: row.angkatan || "-",
        Angkatan: row.angkatan || "-",
        nominal: nom,
        Nominal: nom,
        kategori: row.kategori || (isKeluar ? "Penyaluran" : "Infak"),
        Kategori: row.kategori || (isKeluar ? "Penyaluran" : "Infak"),
        tipe: tipe,
        Tipe: tipe,
        pesan: row.pesan || "-",
        Pesan: row.pesan || "-",
        harapan: row.pesan || "-",
        bukti: row.bukti_url || "",
        Bukti: row.bukti_url || "",
        bukti_url: row.bukti_url || ""
      };
    });

    const saldoKas = totalMasuk - totalKeluar;

    return {
      success: true,
      summary: {
        total: saldoKas,
        saldoKas: saldoKas,
        infak: totalMasuk,
        totalMasuk: totalMasuk,
        laba: labaUsaha,
        labaUsaha: labaUsaha,
        distribusi: totalKeluar,
        totalKeluar: totalKeluar,
        target: targetTahunIni,
        targetTahunan: targetTahunIni,
        donaturCount: jumlahDonatur
      },
      mutasi: formattedMutasi
    };
  },

  // ==========================================================================
  // DATA FETCHER DANA HIBAH
  // ==========================================================================

  async getDanaHibah() {
    const sb = this.getClient();
    if (!sb) throw new Error("Supabase Client belum siap.");

    let mutasiList = [];
    try {
      const { data, error } = await sb
        .from("dana_hibah")
        .select("*")
        .order("id", { ascending: false });

      if (!error && Array.isArray(data)) {
        mutasiList = data;
      }
    } catch(e) {
      console.warn("Gagal tarik dana_hibah:", e);
    }

    let totalNominal = 0;
    const formattedMutasi = mutasiList.map(row => {
      const nom = Math.abs(parseFloat(row.nominal || 0));
      totalNominal += nom;
      const rawPeruntukan = row.peruntukan || "Operasional Sanggar & Perawatan Alat";
      const isAcaraKegiatan = /temu|kegiatan|acara|pentas|agenda/i.test(rawPeruntukan);
      const rawKategori = isAcaraKegiatan ? `Bantuan Kegiatan: ${rawPeruntukan}` : `Dana Hibah: ${rawPeruntukan}`;
      return {
        _rowIndex: row.id,
        _dbId: row.id,
        id: `HBH-SB-${String(row.id).padStart(4, "0")}`,
        ID: `HBH-SB-${String(row.id).padStart(4, "0")}`,
        tanggal: row.tanggal || "-",
        waktu: row.tanggal || "-",
        nama: row.nama || "Donatur",
        Nama: row.nama || "Donatur",
        angkatan: row.angkatan || "-",
        Angkatan: row.angkatan || "-",
        peruntukan: rawPeruntukan,
        Peruntukan: rawPeruntukan,
        kategori: rawKategori,
        Kategori: rawKategori,
        nominal: nom,
        Nominal: nom,
        tipe: row.tipe || "masuk",
        Tipe: row.tipe || "masuk",
        pesan: row.pesan || "-",
        Pesan: row.pesan || "-",
        bukti: row.bukti_url || "",
        bukti_url: row.bukti_url || "",
        is_verified: row.is_verified ?? true
      };
    });

    return {
      success: true,
      total: totalNominal,
      mutasi: formattedMutasi
    };
  },

  // ==========================================================================
  // SIMPAN TRANSAKSI BARU (INFAK DANA ABADI & DANA HIBAH)
  // ==========================================================================

  async addDonasi(payload) {
    const sb = this.getClient();
    if (!sb) throw new Error("Supabase Client belum siap.");

    const nowStr = new Date().toLocaleDateString("id-ID") + " " + new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const isHibah = String(payload.kategori || "").toLowerCase().includes("hibah") || String(payload.peruntukan || "").trim() !== "";

    if (isHibah) {
      const peruntukanClean = (payload.peruntukan || payload.kategori || "Operasional Sanggar & Perawatan Alat").replace(/^Dana Hibah:?\s*/i, "").trim();
      const insertHibah = {
        tanggal: payload.tanggal || nowStr,
        nama: (payload.nama || "Hamba Allah").trim(),
        angkatan: (payload.angkatan || "-").trim(),
        peruntukan: peruntukanClean,
        nominal: Math.abs(parseFloat(payload.nominal) || 0),
        pesan: (payload.pesan || "").trim(),
        bukti_url: (payload.bukti || payload.bukti_url || "").trim(),
        tipe: (payload.tipe || "masuk").toLowerCase(),
        is_verified: true
      };
      const { data, error } = await sb.from("dana_hibah").insert([insertHibah]).select();
      if (error) throw error;
      return { success: true, table: "dana_hibah", data: data[0] };
    } else {
      const insertAbadi = {
        tanggal: payload.tanggal || nowStr,
        nama: (payload.nama || "Hamba Allah").trim(),
        angkatan: (payload.angkatan || "-").trim(),
        nominal: Math.abs(parseFloat(payload.nominal) || 0),
        kategori: (payload.kategori || "Infak").trim(),
        tipe: (payload.tipe || "masuk").toLowerCase(),
        pesan: (payload.pesan || "").trim(),
        bukti_url: (payload.bukti || payload.bukti_url || "").trim()
      };
      const { data, error } = await sb.from("dana_abadi").insert([insertAbadi]).select();
      if (error) throw error;
      return { success: true, table: "dana_abadi", data: data[0] };
    }
  },

  // ==========================================================================
  // BERITA & AGENDA (public.berita)
  // ==========================================================================
  async getBerita() {
    const sb = this.getClient();
    if (!sb) throw new Error("Supabase Client belum siap.");
    const { data, error } = await sb.from("berita").select("*").order("id", { ascending: false });
    if (error) throw error;
    return (data || []).map(row => {
      const judul = row.judul || "Tanpa Judul";
      const idCode = row.kode_id || `NEWS-${row.id}`;
      return {
        _rowIndex: row.id,
        _dbId: row.id,
        id: idCode,
        ID: idCode,
        "NAMA KEGIATAN": judul,
        "nama kegiatan": judul,
        "Nama Kegiatan": judul,
        judul: judul,
        Judul: judul,
        nama: judul,
        "TANGGAL KEGIATAN": row.tanggal || "-",
        "Tanggal Kegiatan": row.tanggal || "-",
        "tanggal kegiatan": row.tanggal || "-",
        "nggal kegiatan": row.tanggal || "-",
        tanggal: row.tanggal || "-",
        Tanggal: row.tanggal || "-",
        "TEMPAT KEGIATAN": row.tempat || "-",
        "Tempat Kegiatan": row.tempat || "-",
        "tempat kegiatan": row.tempat || "-",
        tempat: row.tempat || "-",
        Tempat: row.tempat || "-",
        "KATEGORI": row.kategori || "Kabar Kegiatan",
        "Kategori": row.kategori || "Kabar Kegiatan",
        kategori: row.kategori || "Kabar Kegiatan",
        "DESKRIPSI": row.deskripsi || "",
        "Deskripsi": row.deskripsi || "",
        deskripsi: row.deskripsi || "",
        "KONTEN ARTIKEL": row.konten || "",
        "Konten Artikel": row.konten || "",
        konten: row.konten || "",
        artikel: row.konten || "",
        "FOTO KEGIATAN": row.foto_url || "assets/logo.png",
        "Foto Kegiatan": row.foto_url || "assets/logo.png",
        "foto kegiatan": row.foto_url || "assets/logo.png",
        foto: row.foto_url || "assets/logo.png",
        foto_url: row.foto_url || "assets/logo.png",
        "PENULIS": row.penulis || "Humas Teater Q",
        "Penulis": row.penulis || "Humas Teater Q",
        penulis: row.penulis || "Humas Teater Q",
        is_published: row.is_published !== false,
        created_at: row.created_at
      };
    });
  },

  // ==========================================================================
  // KOTAK SARAN & ASPIRASI (public.saran)
  // ==========================================================================
  async getSaran() {
    const sb = this.getClient();
    if (!sb) throw new Error("Supabase Client belum siap.");
    const { data, error } = await sb
      .from("saran")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(row => ({
      _rowIndex: row.id,
      _dbId: row.id,
      id: row.id,
      ID: row.id,
      timestamp: row.timestamp || "",
      TIMESTAMP: row.timestamp || "",
      waktu: row.timestamp || "",
      tanggal: row.timestamp || "",
      nama: row.nama || "Anonim",
      "nama pengirim": row.nama || "Anonim",
      angkatan: row.angkatan || "-",
      "angkatan / komunitas": row.angkatan || "-",
      topik: row.topik || "Umum",
      pesan: row.pesan || "",
      "pesan / saran": row.pesan || "",
      status: row.status || "Belum Ditanggapi",
      created_at: row.created_at
    }));
  },

  async createSaran(payload) {
    const sb = this.getClient();
    if (!sb) throw new Error("Supabase Client belum siap.");
    const newId = payload.id || `SAR-${Date.now().toString().slice(-6)}`;
    const nowStr = new Date().toLocaleDateString("id-ID") + " " + new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const insertData = {
      id: newId,
      timestamp: String(payload.timestamp || payload.TIMESTAMP || payload.waktu || nowStr).trim(),
      nama: String(payload.nama || payload["nama pengirim"] || "Anonim").trim(),
      angkatan: String(payload.angkatan || payload["angkatan / komunitas"] || "-").trim(),
      topik: String(payload.topik || "Umum").trim(),
      pesan: String(payload.pesan || payload["pesan / saran"] || payload.saran || "").trim(),
      status: String(payload.status || payload.STATUS || "Belum Ditanggapi").trim()
    };
    const { data, error } = await sb.from("saran").insert([insertData]).select();
    if (error) throw error;
    return { success: true, status: "success", data: data && data[0] };
  },

  // ==========================================================================
  // PENGURUS ORGANISASI (public.pengurus)
  // ==========================================================================
  async getPengurus() {
    const sb = this.getClient();
    if (!sb) throw new Error("Supabase Client belum siap.");
    const { data, error } = await sb.from("pengurus").select("*").order("created_at", { ascending: true });
    if (error) throw error;
    return (data || []).map(row => ({
      ID: row.id,
      id: row.id,
      Timestamp: row.timestamp || "",
      timestamp: row.timestamp || "",
      NAMA: row.nama || "",
      nama: row.nama || "",
      Nama: row.nama || "",
      JABATAN: row.jabatan || "",
      jabatan: row.jabatan || "",
      Jabatan: row.jabatan || "",
      PERIODE: row.periode || "",
      periode: row.periode || "",
      Periode: row.periode || "",
      FOTO: row.foto || "",
      foto: row.foto || "",
      Foto: row.foto || "",
      "Foto Website": row.foto_website || row.foto || "",
      foto_website: row.foto_website || row.foto || "",
      created_at: row.created_at
    }));
  },

  // ==========================================================================
  // ARSIP NASKAH (public.arsip)
  // ==========================================================================
  async getArsip() {
    const sb = this.getClient();
    if (!sb) throw new Error("Supabase Client belum siap.");
    const { data, error } = await sb.from("arsip").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(row => ({
      _rowIndex: row.id,
      _dbId: row.id,
      id: row.id,
      ID: row.id,
      kategori: row.kategori || "Sastra/Naskah",
      Kategori: row.kategori || "Sastra/Naskah",
      KATEGORI: row.kategori || "Sastra/Naskah",
      "nama karya": row.nama_karya || "",
      "Nama Karya": row.nama_karya || "",
      "NAMA KARYA": row.nama_karya || "",
      nama_karya: row.nama_karya || "",
      judul: row.nama_karya || "",
      pencipta: row.pencipta || "-",
      Pencipta: row.pencipta || "-",
      PENCIPTA: row.pencipta || "-",
      file: row.file_url || "",
      File: row.file_url || "",
      FILE: row.file_url || "",
      file_url: row.file_url || "",
      link: row.file_url || "",
      "asal karya": row.asal_karya || "Karya Luar",
      "Asal Karya": row.asal_karya || "Karya Luar",
      "ASAL KARYA": row.asal_karya || "Karya Luar",
      asal_karya: row.asal_karya || "Karya Luar",
      created_at: row.created_at
    }));
  },

  async insertArsip(payload) {
    const sb = this.getClient();
    if (!sb) throw new Error("Supabase Client belum siap.");

    const row = {
      id: String(payload.id || payload.kode_id || `ARS-${Date.now().toString().slice(-6)}`).trim(),
      kategori: String(payload.kategori || payload.Kategori || "Sastra/Naskah").trim(),
      nama_karya: String(payload.nama_karya || payload.judul || payload["nama karya"] || "Tanpa Judul").trim(),
      pencipta: String(payload.pencipta || payload.Pencipta || "-").trim(),
      file_url: String(payload.file_url || payload.file || payload.File || "").trim(),
      asal_karya: String(payload.asal_karya || payload["asal karya"] || payload["Asal Karya"] || "Karya Luar").trim()
    };

    const { data, error } = await sb.from("arsip").insert([row]).select();
    if (error) throw error;
    return { success: true, status: "success", data: data && data[0] };
  },

  // ==========================================================================
  // MADING KARYA (public.mading)
  // ==========================================================================
  async getMading() {
    const sb = this.getClient();
    if (!sb) throw new Error("Supabase Client belum siap.");
    const { data, error } = await sb.from("mading").select("*").order("id", { ascending: false });
    if (error) throw error;
    return (data || []).map((row, idx) => ({
      _rowIndex: row.id || (idx + 2),
      id: row.kode_id || row.id || `KRY-${String(idx + 1).padStart(2, '0')}`,
      ID: row.kode_id || row.id,
      timestamp: row.created_at || "",
      nama: row.nama || "-",
      angkatan: row.angkatan || "-",
      kategori: row.kategori || "Puisi",
      judul: row.judul || "Tanpa Judul",
      foto: row.foto || "",
      "isi teks": row.isi_teks || "",
      isi_teks: row.isi_teks || "",
      "file dokumen": row.file_dokumen || "",
      file_dokumen: row.file_dokumen || "",
      catatan: row.catatan || "",
      "foto profil": row.foto_profil || "",
      foto_profil: row.foto_profil || ""
    }));
  },

  async insertMading(payload) {
    const sb = this.getClient();
    if (!sb) throw new Error("Supabase Client belum siap.");

    const row = {
      kode_id: String(payload.kode_id || payload.id || `KRY-${Date.now()}`).trim(),
      nama: String(payload.nama || "Keluarga Teater Q").trim(),
      angkatan: String(payload.angkatan || "-").trim(),
      kategori: String(payload.kategori || "Puisi").trim(),
      judul: String(payload.judul || "Tanpa Judul").trim(),
      foto: String(payload.foto || "").trim(),
      isi_teks: String(payload.isi_teks || payload["isi teks"] || "").trim(),
      file_dokumen: String(payload.file_dokumen || payload["file dokumen"] || "").trim(),
      catatan: String(payload.catatan || "").trim(),
      foto_profil: String(payload.foto_profil || payload["foto profil"] || "").trim()
    };

    const { data, error } = await sb.from("mading").insert([row]).select();
    if (error) throw error;
    return { success: true, status: "success", data: data && data[0] };
  },

  // ==========================================================================
  // PRESTASI (public.prestasi)
  // ==========================================================================
  async getPrestasi() {
    const sb = this.getClient();
    if (!sb) throw new Error("Supabase Client belum siap.");
    const { data, error } = await sb.from("prestasi").select("*").order("id", { ascending: false });
    if (error) throw error;
    return (data || []).map(row => {
      const deskripsi = row.deskripsi || "Tanpa Deskripsi";
      return {
        _rowIndex: row.id,
        _dbId: row.id,
        id: row.kode_id || `PRES-${row.id}`,
        ID: row.kode_id || `PRES-${row.id}`,
        "Deskripsi Prestasi": deskripsi,
        "deskripsi prestasi": deskripsi,
        "DESKRIPSI PRESTASI": deskripsi,
        deskripsi: deskripsi,
        prestasi: deskripsi,
        created_at: row.created_at
      };
    });
  },

  // ==========================================================================
  // KETUA UMUM DARI MASA KE MASA (public.ketua)
  // ==========================================================================
  async getKetua() {
    const sb = this.getClient();
    if (!sb) throw new Error("Supabase Client belum siap.");
    const { data, error } = await sb.from("ketua").select("*").order("id", { ascending: true });
    if (error) throw error;
    return (data || []).map(row => {
      const nama = row.nama_periode || "Tanpa Nama";
      return {
        _rowIndex: row.id,
        _dbId: row.id,
        id: row.kode_id || `KT-${row.id}`,
        ID: row.kode_id || `KT-${row.id}`,
        "Ketua Umum dari Masa ke Masa": nama,
        "ketua umum dari masa ke masa": nama,
        nama: nama,
        nama_periode: nama,
        created_at: row.created_at
      };
    });
  },

  // ==========================================================================
  // GALERI DOKUMENTASI (public.galeri)
  // ==========================================================================
  async getGaleri() {
    const sb = this.getClient();
    if (!sb) throw new Error("Supabase Client belum siap.");
    const { data, error } = await sb.from("galeri").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map((row, idx) => ({
      _rowIndex: idx + 2,
      Id: row.id,
      id: row.id,
      ID: row.id,
      "Nama Kegiatan": row.nama_kegiatan || "",
      nama_kegiatan: row.nama_kegiatan || "",
      nama: row.nama_kegiatan || "",
      Tanggal: row.tanggal || "",
      tanggal: row.tanggal || "",
      "Link Photos": row.link_photos || "",
      link_photos: row.link_photos || "",
      "Link Drive": row.link_drive || "",
      link_drive: row.link_drive || "",
      "Link Foto Website": row.link_foto_website || "",
      link_foto_website: row.link_foto_website || "",
      Timestamp: row.timestamp || "",
      timestamp: row.timestamp || "",
      created_at: row.created_at
    }));
  },

  // ==========================================================================
  // KEUANGAN & KAS ORGANISASI (public.keuangan)
  // ==========================================================================
  async getKeuangan() {
    const sb = this.getClient();
    if (!sb) throw new Error("Supabase Client belum siap.");
    const { data, error } = await sb.from("keuangan").select("*").order("created_at", { ascending: true });
    if (error) throw error;
    return (data || []).map((row, idx) => {
      const tipe = (row.tipe || "Masuk").toLowerCase();
      const nom = Number(row.jumlah) || 0;
      const isMasuk = tipe === "masuk" || tipe === "debit";
      return {
        _rowIndex: idx + 2,
        id: row.id,
        ID: row.id,
        "Nomor Transaksi": row.id,
        tanggal: row.tanggal || "",
        Tanggal: row.tanggal || "",
        tipe: row.tipe || "Masuk",
        Tipe: row.tipe || "Masuk",
        jumlah: nom,
        Jumlah: nom,
        Pemasukan: isMasuk ? nom : 0,
        pemasukan: isMasuk ? nom : 0,
        Pengeluaran: !isMasuk ? nom : 0,
        pengeluaran: !isMasuk ? nom : 0,
        deskripsi: row.deskripsi || "",
        Deskripsi: row.deskripsi || "",
        proyek: row.proyek || "Umum",
        Proyek: row.proyek || "Umum",
        bukti_url: row.bukti_url || "",
        timestamp: row.timestamp || "",
        created_at: row.created_at
      };
    });
  },

  // ==========================================================================
  // DATABASE ANGGOTA RESMI (public.anggota)
  // ==========================================================================
  async getAnggota() {
    const sb = this.getClient();
    if (!sb) throw new Error("Supabase Client belum siap.");
    const { data, error } = await sb.from("anggota").select("*").order("created_at", { ascending: true });
    if (error) throw error;
    const formatted = (data || []).map(row => ({
      _id: row.id,
      ID: row.id,
      id: row.id,
      Timestamp: row.timestamp || "",
      timestamp: row.timestamp || "",
      Nama: row.nama || "",
      nama: row.nama || "",
      "Jenis Kelamin": row.jenis_kelamin || "Laki-laki",
      jenis_kelamin: row.jenis_kelamin || "Laki-laki",
      "Tahun Angkatan": row.tahun_angkatan || "",
      tahun_angkatan: row.tahun_angkatan || "",
      "Tempat Lahir": row.tempat_lahir || "-",
      tempat_lahir: row.tempat_lahir || "-",
      "Tanggal Lahir": row.tanggal_lahir || "",
      tanggal_lahir: row.tanggal_lahir || "",
      Fakultas: row.fakultas || "-",
      fakultas: row.fakultas || "-",
      Jurusan: row.jurusan || "-",
      jurusan: row.jurusan || "-",
      Kategori: row.kategori || "Biasa",
      kategori: row.kategori || "Biasa",
      "No HP": row.no_hp || "-",
      no_hp: row.no_hp || "-",
      Wa: row.no_hp || "-",
      wa: row.no_hp || "-",
      Alamat: row.alamat || "-",
      alamat: row.alamat || "-",
      Status: row.status || "Aktif",
      status: row.status || "Aktif",
      Foto: row.foto || "",
      foto: row.foto || "",
      "Foto Website": row.foto_website || row.foto || "",
      foto_website: row.foto_website || row.foto || "",
      created_at: row.created_at
    }));

    // Urutan sakral organisasi: Pendiri (TQ-001 s/d TQ-007) selalu paling atas, lalu berurutan per angkatan
    formatted.sort((a, b) => {
      const isPendiriA = String(a.kategori || "").toLowerCase().includes("pendiri");
      const isPendiriB = String(b.kategori || "").toLowerCase().includes("pendiri");
      if (isPendiriA && !isPendiriB) return -1;
      if (!isPendiriA && isPendiriB) return 1;
      return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    });

    return formatted;
  },

  // ==========================================================================
  // TEATER Q TV / YOUTUBE (public.youtube)
  // ==========================================================================
  async getYoutube() {
    const sb = this.getClient();
    if (!sb) throw new Error("Supabase Client belum siap.");
    const { data, error } = await sb.from("youtube").select("*").order("created_at", { ascending: true });
    if (error) throw error;
    return (data || []).map((row, idx) => ({
      _rowIndex: idx + 2,
      id: row.id,
      judul: row.judul || "",
      Judul: row.judul || "",
      JUDUL: row.judul || "",
      link: row.link || "",
      Link: row.link || "",
      LINK: row.link || "",
      deskripsi: row.deskripsi || "",
      Deskripsi: row.deskripsi || "",
      created_at: row.created_at
    }));
  },

  // ==========================================================================
  // LOG DOKUMENTASI SANGGAR (public.log_dokumentasi)
  // ==========================================================================
  async getLogDokumentasi() {
    const sb = this.getClient();
    if (!sb) throw new Error("Supabase Client belum siap.");
    const { data, error } = await sb
      .from("log_dokumentasi")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map((row, idx) => ({
      _rowIndex: idx + 2,
      id: row.id,
      "Tanggal & Waktu Upload": row.waktu_upload || "",
      waktu_upload: row.waktu_upload || "",
      Tahun: row.tahun || "",
      tahun: row.tahun || "",
      "Nama Kegiatan": row.nama_kegiatan || "",
      nama_kegiatan: row.nama_kegiatan || "",
      "Tanggal Kegiatan": row.tanggal_kegiatan || "",
      tanggal_kegiatan: row.tanggal_kegiatan || "",
      Pengunggah: row.pengunggah || "",
      pengunggah: row.pengunggah || "",
      "Nama File": row.nama_file || "",
      nama_file: row.nama_file || "",
      "Tipe File": row.tipe_file || "Foto",
      tipe_file: row.tipe_file || "Foto",
      "Link File Google Drive": row.link_file || "",
      link_file: row.link_file || "",
      "Link Folder Kegiatan": row.link_folder || "",
      link_folder: row.link_folder || "",
      Timestamp: row.timestamp || "",
      timestamp: row.timestamp || "",
      created_at: row.created_at
    }));
  },

  async createLogDokumentasi(item) {
    const sb = this.getClient();
    if (!sb) throw new Error("Supabase Client belum siap.");

    const id = String(item.Id || item.id || `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`).trim();
    const row = {
      id: id,
      waktu_upload: String(item["Tanggal & Waktu Upload"] || item.waktu_upload || "").trim(),
      tahun: String(item.Tahun || item.tahun || "").trim(),
      nama_kegiatan: String(item["Nama Kegiatan"] || item.nama_kegiatan || "").trim(),
      tanggal_kegiatan: String(item["Tanggal Kegiatan"] || item.tanggal_kegiatan || "").trim(),
      pengunggah: String(item.Pengunggah || item.pengunggah || "").trim(),
      nama_file: String(item["Nama File"] || item.nama_file || "").trim(),
      tipe_file: String(item["Tipe File"] || item.tipe_file || "Foto").trim(),
      link_file: String(item["Link File Google Drive"] || item.link_file || item["Link File"] || "").trim(),
      link_folder: String(item["Link Folder Kegiatan"] || item.link_folder || item["Link Folder"] || "").trim(),
      timestamp: String(item.Timestamp || item.timestamp || new Date().toISOString()).trim(),
      created_at: new Date().toISOString()
    };

    const { data, error } = await sb.from("log_dokumentasi").insert([row]).select();
    if (error) throw error;
    return { success: true, data: data ? data[0] : row };
  },

  async batchCreateLogDokumentasi(items) {
    const sb = this.getClient();
    if (!sb) throw new Error("Supabase Client belum siap.");
    if (!items || items.length === 0) return { success: true, count: 0 };

    const rows = items.map((item, idx) => ({
      id: String(item.Id || item.id || `LOG-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`).trim(),
      waktu_upload: String(item["Tanggal & Waktu Upload"] || item.waktu_upload || "").trim(),
      tahun: String(item.Tahun || item.tahun || "").trim(),
      nama_kegiatan: String(item["Nama Kegiatan"] || item.nama_kegiatan || "").trim(),
      tanggal_kegiatan: String(item["Tanggal Kegiatan"] || item.tanggal_kegiatan || "").trim(),
      pengunggah: String(item.Pengunggah || item.pengunggah || "").trim(),
      nama_file: String(item["Nama File"] || item.nama_file || "").trim(),
      tipe_file: String(item["Tipe File"] || item.tipe_file || "Foto").trim(),
      link_file: String(item["Link File Google Drive"] || item.link_file || item["Link File"] || "").trim(),
      link_folder: String(item["Link Folder Kegiatan"] || item.link_folder || item["Link Folder"] || "").trim(),
      timestamp: String(item.Timestamp || item.timestamp || new Date().toISOString()).trim(),
      created_at: new Date(Date.now() + idx * 50).toISOString()
    }));

    const chunkSize = 50;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await sb.from("log_dokumentasi").insert(chunk);
      if (error) throw error;
    }

    return { success: true, count: rows.length };
  },

  // ==========================================================================
  // MODUL USULAN PEMBARUAN & PENDAFTARAN ANGGOTA (PERMOHONAN)
  // ==========================================================================

  async createPermohonan(payload) {
    const sb = this.getClient();
    if (!sb) throw new Error("Supabase Client belum siap.");

    const id = String(payload.id || payload.ID || `REQ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`).trim();
    const row = {
      id: id,
      timestamp: String(payload.timestamp || payload.Timestamp || new Date().toISOString()).trim(),
      nama: String(payload.nama || payload.Nama || "").trim(),
      jenis_kelamin: String(payload.jenis_kelamin || payload["Jenis Kelamin"] || "").trim(),
      tahun: String(payload.tahun || payload.Tahun || payload["Tahun Angkatan"] || "").trim(),
      tempat_lahir: String(payload.tempat_lahir || payload["Tempat Lahir"] || "").trim(),
      tanggal_lahir: String(payload.tanggal_lahir || payload["Tanggal Lahir"] || "").trim(),
      alamat: String(payload.alamat || payload.Alamat || "").trim(),
      fakultas: String(payload.fakultas || payload.Fakultas || "").trim(),
      jurusan: String(payload.jurusan || payload.Jurusan || "").trim(),
      no_hp: String(payload.no_hp || payload["No HP"] || payload.Wa || "").trim(),
      upload_foto: String(payload.upload_foto || payload["Upload Foto"] || payload.foto || "").trim(),
      status: String(payload.status || "pending").trim(),
      matched_id: String(payload.matched_id || "").trim()
    };

    const { data, error } = await sb
      .from("permohonan")
      .insert([row])
      .select();

    if (error) throw error;
    return { success: true, data: data ? data[0] : row };
  }
};

window.SupabaseDB = SupabaseDB;
