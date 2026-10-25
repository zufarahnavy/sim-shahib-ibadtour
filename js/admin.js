/* ==========================================================================
   SIM SHAHIB IbadTour — Admin Panel Logic
   RBAC: Superadmin only. Semua otorisasi tetap divalidasi server-side di
   Kode.gs — UI ini hanya kontrol tampilan.
   ========================================================================== */
(function () {
  const { callApi, setSessionToken, getSessionToken } = window.SIM_API;

  const state = {
    konten: [], subKategori: [], mitra: [], crm: [], laporan: [],
    kontenFilter: { q: "", kategori: "" }, mitraFilter: "", crmFilter: { q: "", segmen: "" },
    editingKontenSource: "onedrive"
  };

  function toast(msg, type = "") {
    const wrap = document.getElementById("toastWrap");
    const el = document.createElement("div");
    el.className = "toast " + type;
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  // =====================================================================
  // AUTH (F7)
  // =====================================================================
  const Admin = {
    async init() {
      const token = getSessionToken();
      if (token) {
        try {
          const res = await callApi("verifySession");
          this.onLoginSuccess(res.data);
          return;
        } catch (e) { setSessionToken(null); }
      }
      document.getElementById("loginScreen").classList.remove("hidden");
    },

    loginGoogle() {
      // Integrasi penuh: redirect ke Google Identity Services OAuth, lalu
      // backend Kode.gs memverifikasi id_token terhadap sheet Admin.
      toast("Hubungkan Google Client ID Anda di config.js untuk login OAuth penuh.", "");
      // Placeholder flow — lihat PANDUAN_INSTALASI.md bagian "Login Google Admin".
    },

    async loginEmergency(e) {
      e.preventDefault();
      const pass = document.getElementById("emergencyPass").value;
      try {
        const res = await callApi("loginEmergency", { password: pass });
        setSessionToken(res.data.token);
        this.onLoginSuccess(res.data.admin);
      } catch (err) {
        const errEl = document.getElementById("loginError");
        errEl.textContent = err.message || "Password salah.";
        errEl.classList.remove("hidden");
      }
    },

    onLoginSuccess(admin) {
      document.getElementById("loginScreen").classList.add("hidden");
      document.getElementById("adminShell").classList.remove("hidden");
      document.getElementById("adminEmail").textContent = (admin && admin.email) || "Superadmin";
      this.bindNav();
      Dashboard.load();
    },

    logout() {
      setSessionToken(null);
      location.reload();
    },

    bindNav() {
      document.querySelectorAll("#adminNav a").forEach((a) => {
        a.addEventListener("click", (e) => {
          e.preventDefault();
          const page = a.dataset.page;
          document.querySelectorAll("#adminNav a").forEach((x) => x.classList.toggle("active", x === a));
          document.querySelectorAll(".admin-page").forEach((p) => p.classList.add("hidden"));
          document.getElementById("page-" + page).classList.remove("hidden");
          document.getElementById("pageTitle").textContent = a.textContent.trim();
          Admin.loadPage(page);
        });
      });
    },

    loadPage(page) {
      const loaders = {
        dashboard: () => Dashboard.load(),
        konten: () => AdminKonten.load(),
        subkategori: () => AdminSub.load(),
        mitra: () => AdminMitra.load(),
        crm: () => AdminCRM.load(),
        notifikasi: () => AdminNotif.load(),
        laporan: () => AdminLaporan.load(),
        tampilan: () => AdminTampilan.load()
      };
      (loaders[page] || (() => {}))();
    }
  };

  // =====================================================================
  // DASHBOARD (F10 summary)
  // =====================================================================
  const Dashboard = {
    async load() {
      try {
        const res = await callApi("getDashboardSummary");
        const d = res.data;
        document.getElementById("statMitra").textContent = d.totalMitra;
        document.getElementById("statAksesHariIni").textContent = d.aksesHariIni;
        document.getElementById("statUnduhanHariIni").textContent = d.unduhanHariIni;
        document.getElementById("statMateriAktif").textContent = d.materiAktif;
        this.renderTopFiles(d.topFiles || []);
        this.renderChart(d.tren || { labels: [], akses: [], unduhan: [] });
      } catch (e) { toast("Gagal memuat dashboard: " + e.message, "error"); }
    },
    renderTopFiles(files) {
      const max = Math.max(1, ...files.map((f) => f.total));
      document.getElementById("topFilesList").innerHTML = files.map((f) => `
        <div style="margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
            <span>${f.judul}</span><b>${f.total}</b>
          </div>
          <div style="background:var(--border);border-radius:99px;height:6px;overflow:hidden;">
            <div style="background:var(--gold-gradient);height:100%;width:${(f.total / max) * 100}%;"></div>
          </div>
        </div>`).join("") || `<p class="t-body">Belum ada data unduhan.</p>`;
    },
    renderChart(tren) {
      const ctx = document.getElementById("chartTren");
      if (window._chartTren) window._chartTren.destroy();
      window._chartTren = new Chart(ctx, {
        type: "line",
        data: {
          labels: tren.labels,
          datasets: [
            { label: "Akses", data: tren.akses, borderColor: "#CBAB2A", backgroundColor: "rgba(203,171,42,0.12)", fill: true, tension: 0.35 },
            { label: "Unduhan", data: tren.unduhan, borderColor: "#282828", backgroundColor: "rgba(40,40,40,0.06)", fill: true, tension: 0.35 }
          ]
        },
        options: { responsive: true, plugins: { legend: { position: "bottom" } } }
      });
    }
  };

  // =====================================================================
  // KELOLA KONTEN (F8)
  // =====================================================================
  const AdminKonten = {
    setSource(src) {
      state.editingKontenSource = src;
      document.getElementById("srcOnedriveBtn").classList.toggle("active", src === "onedrive");
      document.getElementById("srcUploadBtn").classList.toggle("active", src === "drive");
      document.getElementById("fieldOnedrive").classList.toggle("hidden", src !== "onedrive");
      document.getElementById("fieldUpload").classList.toggle("hidden", src !== "drive");
    },
    refreshSubOptions() {
      const kat = document.getElementById("kKategori").value;
      const subs = state.subKategori.filter((s) => s.kategori_induk === kat);
      document.getElementById("kSubKategori").innerHTML =
        `<option value="">— Tanpa Sub-Kategori —</option>` + subs.map((s) => `<option>${s.nama_sub}</option>`).join("");
    },
    async load() {
      try {
        const [k, s] = await Promise.all([callApi("getKontenAdmin"), callApi("getSubKategori")]);
        state.konten = k.data; state.subKategori = s.data;
        this.refreshSubOptions();
        this.render();
      } catch (e) { toast("Gagal memuat konten: " + e.message, "error"); }
    },
    search(q) { state.kontenFilter.q = q.toLowerCase(); this.render(); },
    filterKategori(k) { state.kontenFilter.kategori = k; this.render(); },
    render() {
      const list = state.konten.filter((k) =>
        (!state.kontenFilter.q || k.judul.toLowerCase().includes(state.kontenFilter.q)) &&
        (!state.kontenFilter.kategori || k.kategori === state.kontenFilter.kategori));
      document.getElementById("tblKonten").innerHTML = list.map((k) => `
        <tr>
          <td><input type="checkbox" class="rowchk" value="${k.id_konten}"/></td>
          <td>${k.judul}</td><td>${k.kategori}</td><td>${k.sumber}</td>
          <td><span class="status-dot ${k.status !== "aktif" ? "off" : ""}">${k.status}</span></td>
          <td>${k.tgl_upload}</td>
          <td>
            <button class="btn btn-ghost btn-sm" onclick="AdminKonten.toggleArsip('${k.id_konten}')">${k.status === "aktif" ? "Arsipkan" : "Aktifkan"}</button>
            <button class="btn btn-ghost btn-sm" onclick="AdminKonten.hapus('${k.id_konten}')" style="color:var(--error);">Hapus</button>
          </td>
        </tr>`).join("") || `<tr><td colspan="7" style="text-align:center;color:var(--charcoal-300);">Belum ada konten.</td></tr>`;
    },
    async submit(e) {
      e.preventDefault();
      const payload = {
        judul: document.getElementById("kJudul").value,
        kategori: document.getElementById("kKategori").value,
        sub_kategori: document.getElementById("kSubKategori").value,
        sumber: state.editingKontenSource,
        link_embed: document.getElementById("kLinkEmbed").value,
        link_unduh: document.getElementById("kLinkUnduh").value
      };
      try {
        await callApi("tambahKonten", payload);
        toast("Konten berhasil ditambahkan.", "success");
        document.getElementById("formKonten").reset();
        this.load();
      } catch (err) { toast(err.message, "error"); }
    },
    async toggleArsip(id) {
      try { await callApi("toggleArsipKonten", { id_konten: id }); this.load(); } catch (e) { toast(e.message, "error"); }
    },
    async hapus(id) {
      if (!confirm("Hapus konten ini secara permanen?")) return;
      try { await callApi("hapusKonten", { id_konten: id }); toast("Konten dihapus.", "success"); this.load(); }
      catch (e) { toast(e.message, "error"); }
    }
  };

  // =====================================================================
  // SUB-KATEGORI (F9)
  // =====================================================================
  const AdminSub = {
    async load() {
      try {
        const res = await callApi("getSubKategori");
        state.subKategori = res.data;
        document.getElementById("tblSub").innerHTML = state.subKategori.map((s) => `
          <tr><td>${s.nama_sub}</td><td>${s.kategori_induk}</td><td>${s.urutan}</td>
          <td><button class="btn btn-ghost btn-sm" style="color:var(--error);" onclick="AdminSub.hapus('${s.id_sub}')">Hapus</button></td></tr>`
        ).join("") || `<tr><td colspan="4" style="text-align:center;color:var(--charcoal-300);">Belum ada sub-kategori.</td></tr>`;
      } catch (e) { toast(e.message, "error"); }
    },
    async submit(e) {
      e.preventDefault();
      try {
        await callApi("tambahSubKategori", {
          nama_sub: document.getElementById("sNama").value,
          kategori_induk: document.getElementById("sKategoriInduk").value,
          urutan: document.getElementById("sUrutan").value
        });
        toast("Sub-kategori ditambahkan.", "success");
        e.target.reset();
        this.load();
      } catch (err) { toast(err.message, "error"); }
    },
    async hapus(id) {
      if (!confirm("Hapus sub-kategori ini? (gagal jika masih dipakai konten)")) return;
      try { await callApi("hapusSubKategori", { id_sub: id }); this.load(); } catch (e) { toast(e.message, "error"); }
    }
  };

  // =====================================================================
  // KELOLA MITRA (F9)
  // =====================================================================
  const AdminMitra = {
    async load() {
      try {
        const res = await callApi("getMitraAdmin");
        state.mitra = res.data;
        this.render();
      } catch (e) { toast(e.message, "error"); }
    },
    search(q) { state.mitraFilter = q.toLowerCase(); this.render(); },
    render() {
      const q = state.mitraFilter;
      const list = state.mitra.filter((m) => !q || m.nama_lengkap.toLowerCase().includes(q) ||
        (m.kode_agen || "").toLowerCase().includes(q) || (m.domisili || "").toLowerCase().includes(q));
      document.getElementById("tblMitra").innerHTML = list.map((m) => `
        <tr>
          <td>${m.nama_lengkap}</td><td>${m.kode_agen}</td><td>${m.domisili}</td>
          <td><span class="status-dot ${m.status !== "aktif" ? "off" : ""}">${m.status}</span></td>
          <td>${m.tgl_daftar}</td>
          <td>
            <button class="btn btn-ghost btn-sm" onclick='AdminMitra.openEditModal(${JSON.stringify(m).replace(/'/g, "&#39;")})'>Edit</button>
            <button class="btn btn-ghost btn-sm" style="color:var(--error);" onclick="AdminMitra.hapus('${m.id_mitra}')">Hapus</button>
          </td>
        </tr>`).join("") || `<tr><td colspan="6" style="text-align:center;color:var(--charcoal-300);">Belum ada mitra.</td></tr>`;
    },
    openAddModal() {
      document.getElementById("mitraModalTitle").textContent = "Tambah Mitra";
      ["mId", "mNama", "mKode", "mDomisili"].forEach((id) => document.getElementById(id).value = "");
      document.getElementById("mStatus").value = "aktif";
      document.getElementById("mitraModal").classList.remove("hidden");
    },
    openEditModal(m) {
      document.getElementById("mitraModalTitle").textContent = "Edit Mitra";
      document.getElementById("mId").value = m.id_mitra;
      document.getElementById("mNama").value = m.nama_lengkap;
      document.getElementById("mKode").value = m.kode_agen;
      document.getElementById("mDomisili").value = m.domisili;
      document.getElementById("mStatus").value = m.status;
      document.getElementById("mitraModal").classList.remove("hidden");
    },
    closeModal() { document.getElementById("mitraModal").classList.add("hidden"); },
    async submit(e) {
      e.preventDefault();
      const payload = {
        id_mitra: document.getElementById("mId").value,
        nama_lengkap: document.getElementById("mNama").value,
        kode_agen: document.getElementById("mKode").value,
        domisili: document.getElementById("mDomisili").value,
        status: document.getElementById("mStatus").value
      };
      try {
        await callApi("simpanMitra", payload);
        toast("Data mitra disimpan.", "success");
        this.closeModal();
        this.load();
      } catch (err) { toast(err.message, "error"); }
    },
    async hapus(id) {
      if (!confirm("Hapus mitra ini?")) return;
      try { await callApi("hapusMitra", { id_mitra: id }); this.load(); } catch (e) { toast(e.message, "error"); }
    },
    openBulkModal() {
      document.getElementById("bulkResult").innerHTML = "";
      document.getElementById("bulkModal").classList.remove("hidden");
    },
    closeBulkModal() { document.getElementById("bulkModal").classList.add("hidden"); },
    async submitBulk() {
      const raw = document.getElementById("bulkData").value.trim();
      const rows = raw.split("\n").map((l) => l.split("\t").map((c) => c.trim())).filter((r) => r.length >= 3 && r[0]);
      try {
        const res = await callApi("importBulkMitra", { rows });
        const d = res.data;
        document.getElementById("bulkResult").innerHTML =
          `<p style="color:var(--success);font-weight:700;">✓ ${d.sukses} berhasil ditambahkan</p>` +
          (d.gagal.length ? `<p style="color:var(--error);font-weight:700;">✕ ${d.gagal.length} gagal:</p><ul style="font-size:13px;">${d.gagal.map((g) => `<li>Baris ${g.baris}: ${g.alasan}</li>`).join("")}</ul>` : "");
        this.load();
      } catch (e) { toast(e.message, "error"); }
    }
  };

  // =====================================================================
  // CRM (gas-notifikasi-wa-crm)
  // =====================================================================
  const AdminCRM = {
    async load() {
      try {
        const res = await callApi("getCrmKontak");
        state.crm = res.data.kontak;
        document.getElementById("crmTotal").textContent = state.crm.length;
        document.getElementById("crmValid").textContent = state.crm.filter((c) => c.wa_valid).length;
        document.getElementById("crmOptout").textContent = state.crm.filter((c) => c.optout).length;
        document.getElementById("crmSumberMitra").textContent = state.crm.filter((c) => c.sumber === "Mitra").length;
        this.render();
      } catch (e) { toast(e.message, "error"); }
    },
    search(q) { state.crmFilter.q = q.toLowerCase(); this.render(); },
    filterSegmen(s) { state.crmFilter.segmen = s; this.render(); },
    render() {
      const { q, segmen } = state.crmFilter;
      const list = state.crm.filter((c) =>
        (!q || c.nama.toLowerCase().includes(q) || (c.wa || "").includes(q)) &&
        (!segmen || c.sumber === segmen));
      document.getElementById("tblCrm").innerHTML = list.map((c) => `
        <tr>
          <td><input type="checkbox" class="crmchk" value="${c.id}"/></td>
          <td>${c.nama}</td><td>${c.wa}</td><td>${c.sumber}</td><td>${c.tag || "-"}</td>
          <td>${c.optout ? "Ya" : "Tidak"}</td>
          <td><button class="btn btn-ghost btn-sm" onclick="AdminCRM.toggleOptout('${c.id}')">${c.optout ? "Aktifkan" : "Opt-out"}</button></td>
        </tr>`).join("") || `<tr><td colspan="7" style="text-align:center;color:var(--charcoal-300);">Belum ada kontak CRM.</td></tr>`;
    },
    async syncNow() {
      try { await callApi("syncCrmKontak"); toast("Kontak CRM disinkronkan.", "success"); this.load(); }
      catch (e) { toast(e.message, "error"); }
    },
    async toggleOptout(id) {
      try { await callApi("toggleOptoutCrm", { id }); this.load(); } catch (e) { toast(e.message, "error"); }
    },
    openBlastModal() {
      const n = document.querySelectorAll(".crmchk:checked").length;
      document.getElementById("blastTargetCount").textContent = n;
      document.getElementById("blastModal").classList.remove("hidden");
    },
    closeBlastModal() { document.getElementById("blastModal").classList.add("hidden"); },
    async submitBlast(e) {
      e.preventDefault();
      const ids = [...document.querySelectorAll(".crmchk:checked")].map((c) => c.value);
      try {
        await callApi("kirimBlastWA", {
          ids, pesan: document.getElementById("blastMsg").value,
          batchSize: document.getElementById("blastBatch").value
        });
        toast("Blast WA dimasukkan ke antrean pengiriman.", "success");
        this.closeBlastModal();
      } catch (err) { toast(err.message, "error"); }
    }
  };

  // =====================================================================
  // NOTIFIKASI WA (gas-notifikasi-wa-crm)
  // =====================================================================
  const AdminNotif = {
    async load() {
      try {
        const res = await callApi("getNotifSettings");
        const d = res.data;
        document.getElementById("notifGlobalWA").checked = !!d.globalWA;
        document.getElementById("notifGlobalEmail").checked = !!d.globalEmail;
        document.getElementById("tblNotifMatriks").innerHTML = (d.matriks || []).map((m) => `
          <tr><td>${m.event}</td>
          <td><input type="checkbox" data-event="${m.event}" data-ch="wa" ${m.wa ? "checked" : ""}/></td>
          <td><input type="checkbox" data-event="${m.event}" data-ch="email" ${m.email ? "checked" : ""}/></td></tr>`
        ).join("");
        document.getElementById("fonnteTokenMasked").textContent = "Status: " + (d.fonnteTokenMasked || "belum diatur");
      } catch (e) { toast(e.message, "error"); }
    },
    async saveMatriks() {
      const rows = [...document.querySelectorAll("#tblNotifMatriks tr")].map((tr) => ({
        event: tr.querySelector("[data-ch='wa']").dataset.event,
        wa: tr.querySelector("[data-ch='wa']").checked,
        email: tr.querySelector("[data-ch='email']").checked
      }));
      try {
        await callApi("saveNotifSettings", {
          globalWA: document.getElementById("notifGlobalWA").checked,
          globalEmail: document.getElementById("notifGlobalEmail").checked,
          matriks: rows
        });
        toast("Pengaturan notifikasi disimpan.", "success");
      } catch (e) { toast(e.message, "error"); }
    },
    async saveFonnteToken() {
      const token = document.getElementById("fonnteToken").value;
      if (!token) return;
      try {
        await callApi("simpanSecretAllowlist", { key: "FONNTE_TOKEN", value: token });
        toast("Token Fonnte disimpan dengan aman.", "success");
        document.getElementById("fonnteToken").value = "";
        this.load();
      } catch (e) { toast(e.message, "error"); }
    }
  };

  // =====================================================================
  // LAPORAN & PEMANTAUAN (F10)
  // =====================================================================
  const AdminLaporan = {
    async load() {
      try {
        const res = await callApi("getLaporan", {});
        this.render(res.data);
      } catch (e) { toast(e.message, "error"); }
    },
    applyFilter() {
      callApi("getLaporan", {
        dari: document.getElementById("lapDari").value,
        sampai: document.getElementById("lapSampai").value,
        jenis: document.getElementById("lapJenis").value
      }).then((res) => this.render(res.data)).catch((e) => toast(e.message, "error"));
    },
    render(d) {
      document.getElementById("tblLaporan").innerHTML = (d.rows || []).map((r) => `
        <tr><td>${r.timestamp}</td><td>${r.jenis}</td><td>${r.nama_lengkap}</td><td>${r.kode_agen}</td>
        <td>${r.domisili}</td><td>${r.aktivitas}</td></tr>`).join("") ||
        `<tr><td colspan="6" style="text-align:center;color:var(--charcoal-300);">Tidak ada data.</td></tr>`;
      document.getElementById("mitraTidakAktif").innerHTML = (d.mitraTidakAktif || []).map((m) =>
        `<span class="chip" style="margin:4px;">${m.nama_lengkap} (${m.kode_agen})</span>`).join("") ||
        `<p class="t-body">Semua mitra aktif dalam 30 hari terakhir.</p>`;
      this.renderChart(d.perDomisili || { labels: [], data: [] });
    },
    renderChart(agg) {
      const ctx = document.getElementById("chartDomisili");
      if (window._chartDom) window._chartDom.destroy();
      window._chartDom = new Chart(ctx, {
        type: "bar",
        data: { labels: agg.labels, datasets: [{ label: "Akses per Domisili", data: agg.data, backgroundColor: "#CBAB2A" }] },
        options: { responsive: true, plugins: { legend: { display: false } } }
      });
    },
    exportExcel() { window.open(`${window.SIM_CONFIG.GAS_URL}?action=exportLaporanExcel&token=${window.SIM_API.getSessionToken()}`, "_blank"); },
    exportPdf() { window.open(`${window.SIM_CONFIG.GAS_URL}?action=exportLaporanPdf&token=${window.SIM_API.getSessionToken()}`, "_blank"); }
  };

  // =====================================================================
  // PENGATURAN TAMPILAN / LOGO (F11)
  // =====================================================================
  const AdminTampilan = {
    pending: {},
    current: {},
    async load() {
      try {
        const res = await callApi("getPengaturan");
        const d = res.data || {};
        this.current = d;

        // Banner
        document.getElementById("bnMusim").value = (d.banner && d.banner.musim) || "";
        document.getElementById("bnJudul").value = (d.banner && d.banner.judul) || "";
        document.getElementById("bnSubjudul").value = (d.banner && d.banner.subjudul) || "";
        this.showImgOrEmpty("prevBannerImg", "prevBannerImgEmpty", d.banner && d.banner.gambar);

        // About
        document.getElementById("tpStory").value = (d.about && d.about.story) || "";
        this.showImgOrEmpty("prevAboutImg", "prevAboutImgEmpty", d.about && d.about.gambar);
        this.renderPilarEditor((d.about && d.about.pilar) || []);

        // Legalitas
        this.renderLegalitasEditor(d.legalitas || []);

        // Kontak
        const c = d.kontak || {};
        document.getElementById("tpAlamat").value = c.alamat || "";
        document.getElementById("tpTelp").value = c.telp || "";
        document.getElementById("tpEmail").value = c.email || "";
        document.getElementById("tpWa").value = c.wa || "";
      } catch (e) { toast(e.message, "error"); }
    },

    showImgOrEmpty(imgId, emptyId, url) {
      const img = document.getElementById(imgId);
      const empty = document.getElementById(emptyId);
      if (url) { img.src = url; img.style.display = "block"; if (empty) empty.style.display = "none"; }
      else { img.style.display = "none"; if (empty) empty.style.display = "block"; }
    },

    renderPilarEditor(pilar) {
      const list = pilar.length ? pilar : [{}, {}, {}, {}];
      document.getElementById("pilarEditor").innerHTML = list.map((p, i) => `
        <div class="card card-pad" style="background:var(--bg);">
          <div style="display:flex;gap:8px;">
            <input class="input" style="max-width:56px;text-align:center;" data-pilar="${i}" data-f="ikon" value="${p.ikon || ""}" placeholder="✓"/>
            <input class="input" data-pilar="${i}" data-f="judul" value="${(p.judul || "").replace(/"/g, "&quot;")}" placeholder="Judul pilar"/>
          </div>
          <textarea class="input" style="margin-top:8px;" rows="2" data-pilar="${i}" data-f="deskripsi" placeholder="Deskripsi singkat">${p.deskripsi || ""}</textarea>
        </div>`).join("");
    },

    renderLegalitasEditor(items) {
      const list = items.length ? items : [{}, {}, {}, {}];
      document.getElementById("legalitasEditor").innerHTML = list.map((l, i) => `
        <div class="card card-pad" style="background:var(--bg);">
          <input class="input" data-legal="${i}" data-f="label" value="${(l.label || "").replace(/"/g, "&quot;")}" placeholder="Label (mis. PPIU)"/>
          <input class="input" style="margin-top:8px;" data-legal="${i}" data-f="nilai" value="${(l.nilai || "").replace(/"/g, "&quot;")}" placeholder="Nilai (mis. No. U.419 Th. 2021)"/>
        </div>`).join("");
    },

    preview(input, imgId) {
      const file = input.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) { toast("Ukuran file melebihi 2MB.", "error"); input.value = ""; return; }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.getElementById(imgId);
        img.src = e.target.result;
        img.style.display = "block";
        const emptyEl = document.getElementById(imgId + "Empty");
        if (emptyEl) emptyEl.style.display = "none";
        this.pending[imgId] = { name: file.name, base64: e.target.result.split(",")[1], mime: file.type };
      };
      reader.readAsDataURL(file);
    },

    async saveLogo() {
      try {
        await callApi("simpanLogo", { files: this.pending });
        toast("Logo berhasil diterapkan ke seluruh situs.", "success");
        this.pending = {};
      } catch (e) { toast(e.message, "error"); }
    },
    async revertDefault() {
      if (!confirm("Kembalikan ke logo bawaan IbadTour?")) return;
      try { await callApi("revertLogoDefault"); toast("Logo dikembalikan ke bawaan.", "success"); location.reload(); }
      catch (e) { toast(e.message, "error"); }
    },

    async flushPendingImages() {
      // Kirim gambar banner/about yang baru dipilih (jika ada) sebelum menyimpan teks,
      // supaya gambar & teks tersimpan dalam satu alur yang sama bagi admin.
      const imgKeys = ["prevBannerImg", "prevAboutImg"].filter((k) => this.pending[k]);
      if (!imgKeys.length) return;
      const payload = {};
      imgKeys.forEach((k) => (payload[k] = this.pending[k]));
      await callApi("simpanLogo", { files: payload });
      imgKeys.forEach((k) => delete this.pending[k]);
    },

    async saveBanner() {
      try {
        await this.flushPendingImages();
        await callApi("simpanPengaturanTeks", {
          banner: {
            musim: document.getElementById("bnMusim").value,
            judul: document.getElementById("bnJudul").value,
            subjudul: document.getElementById("bnSubjudul").value
          }
        });
        toast("Banner musim disimpan & diterapkan.", "success");
      } catch (e) { toast(e.message, "error"); }
    },

    collectPilar() {
      const inputs = document.querySelectorAll("[data-pilar]");
      const map = {};
      inputs.forEach((el) => {
        const i = el.dataset.pilar;
        map[i] = map[i] || {};
        map[i][el.dataset.f] = el.value;
      });
      return Object.keys(map).sort().map((i) => map[i]);
    },

    async saveAbout() {
      try {
        await this.flushPendingImages();
        await callApi("simpanPengaturanTeks", {
          about: { story: document.getElementById("tpStory").value, pilar: this.collectPilar() }
        });
        toast("Section Tentang Kami disimpan & diterapkan.", "success");
      } catch (e) { toast(e.message, "error"); }
    },

    collectLegalitas() {
      const inputs = document.querySelectorAll("[data-legal]");
      const map = {};
      inputs.forEach((el) => {
        const i = el.dataset.legal;
        map[i] = map[i] || {};
        map[i][el.dataset.f] = el.value;
      });
      return Object.keys(map).sort().map((i) => map[i]);
    },

    async saveLegalitas() {
      try {
        await callApi("simpanPengaturanTeks", { legalitas: this.collectLegalitas() });
        toast("Legalitas disimpan & diterapkan.", "success");
      } catch (e) { toast(e.message, "error"); }
    },

    async saveKontak() {
      try {
        await callApi("simpanPengaturanTeks", {
          kontak: {
            alamat: document.getElementById("tpAlamat").value,
            telp: document.getElementById("tpTelp").value,
            email: document.getElementById("tpEmail").value,
            wa: document.getElementById("tpWa").value
          }
        });
        toast("Kontak disimpan & diterapkan.", "success");
      } catch (e) { toast(e.message, "error"); }
    }
  };

  window.Admin = Admin;
  window.AdminKonten = AdminKonten;
  window.AdminSub = AdminSub;
  window.AdminMitra = AdminMitra;
  window.AdminCRM = AdminCRM;
  window.AdminNotif = AdminNotif;
  window.AdminLaporan = AdminLaporan;
  window.AdminTampilan = AdminTampilan;

  document.addEventListener("DOMContentLoaded", () => Admin.init());
})();
