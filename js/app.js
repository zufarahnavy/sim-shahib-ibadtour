/* ==========================================================================
   SIM SHAHIB IbadTour — App Logic (Frontend)
   Pola: Client-Side SPA + Optimistic UI + localStorage session (gas-pro-api
   & gas-instant-ux-pro). Tidak ada ?page= — satu index.html, navigasi via
   hash + show/hide section.
   ========================================================================== */
(function () {
  const { callApi, cacheGet, cacheSet } = window.SIM_API;
  const CFG = window.SIM_CONFIG;

  const state = {
    user: null,            // {jenis:'Mitra'|'Guest', id_mitra, nama_lengkap, kode_agen, domisili}
    mitraList: [],
    konten: [],
    subKategori: [],
    pengaturan: {},
    activeCategory: "Semua",
    activeSub: null,
    searchTerm: "",
    visibleCount: 24,
    previewItem: null
  };

  // =====================================================================
  // TOAST
  // =====================================================================
  function toast(msg, type = "") {
    const wrap = document.getElementById("toastWrap");
    const el = document.createElement("div");
    el.className = "toast " + type;
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  // =====================================================================
  // ENTRY POPUP (F1)
  // =====================================================================
  const EntryPopup = {
    switchTab(tab) {
      document.getElementById("tabMitra").classList.toggle("active", tab === "mitra");
      document.getElementById("tabGuest").classList.toggle("active", tab === "guest");
      document.getElementById("paneMitra").classList.toggle("hidden", tab !== "mitra");
      document.getElementById("paneGuest").classList.toggle("hidden", tab !== "guest");
    },

    async init() {
      const saved = localStorage.getItem("sim_user");
      if (saved) {
        try {
          state.user = JSON.parse(saved);
          App.hideEntry();
          App.boot();
          return;
        } catch (e) { /* fall through to popup */ }
      }
      document.getElementById("entryOverlay").classList.remove("hidden");
      this.loadMitraListInBackground();
      this.bindSearch();
    },

    async loadMitraListInBackground() {
      try {
        const cached = cacheGet("mitraList");
        if (cached) state.mitraList = cached.value;
        const res = await callApi("getMitraList");
        state.mitraList = res.data || [];
        cacheSet("mitraList", state.mitraList);
      } catch (e) {
        console.warn("Gagal memuat daftar mitra:", e.message);
      }
    },

    bindSearch() {
      const input = document.getElementById("mitraSearch");
      let activeIdx = -1;
      input.addEventListener("input", () => {
        activeIdx = -1;
        this.renderResults(input.value);
      });
      input.addEventListener("keydown", (e) => {
        const items = document.querySelectorAll("#mitraResults .result-item");
        if (!items.length) return;
        if (e.key === "ArrowDown") { activeIdx = Math.min(activeIdx + 1, items.length - 1); this.highlight(items, activeIdx); e.preventDefault(); }
        else if (e.key === "ArrowUp") { activeIdx = Math.max(activeIdx - 1, 0); this.highlight(items, activeIdx); e.preventDefault(); }
        else if (e.key === "Enter" && activeIdx >= 0) { items[activeIdx].click(); }
      });
    },

    highlight(items, idx) {
      items.forEach((it, i) => it.classList.toggle("kbd-active", i === idx));
      if (items[idx]) items[idx].scrollIntoView({ block: "nearest" });
    },

    renderResults(term) {
      const box = document.getElementById("mitraResults");
      const q = term.trim().toLowerCase();
      if (!q) { box.classList.add("hidden"); box.innerHTML = ""; return; }

      const matches = state.mitraList
        .filter((m) => m.status === "aktif")
        .filter((m) =>
          m.nama_lengkap.toLowerCase().includes(q) ||
          (m.kode_agen || "").toLowerCase().includes(q) ||
          (m.domisili || "").toLowerCase().includes(q)
        )
        .sort((a, b) => a.nama_lengkap.localeCompare(b.nama_lengkap))
        .slice(0, 8);

      box.classList.remove("hidden");
      if (!matches.length) {
        box.innerHTML = `<div class="result-empty">Nama tidak ditemukan, coba kata kunci lain atau masuk sebagai Guest.</div>`;
        return;
      }
      box.innerHTML = matches.map((m) => `
        <div class="result-item" data-id="${m.id_mitra}">
          <div>
            <div style="font-weight:700;font-size:14px;">${highlightMatch(m.nama_lengkap, q)}</div>
            <div style="font-size:12px;color:var(--charcoal-300);">${highlightMatch(m.kode_agen || "", q)} · ${highlightMatch(m.domisili || "", q)}</div>
          </div>
        </div>`).join("");

      box.querySelectorAll(".result-item").forEach((el) => {
        el.addEventListener("click", () => this.selectMitra(el.dataset.id));
      });
    },

    async selectMitra(idMitra) {
      const m = state.mitraList.find((x) => String(x.id_mitra) === String(idMitra));
      if (!m) return;
      state.user = { jenis: "Mitra", id_mitra: m.id_mitra, nama_lengkap: m.nama_lengkap, kode_agen: m.kode_agen, domisili: m.domisili };
      localStorage.setItem("sim_user", JSON.stringify(state.user));
      this.logAccess();
      App.hideEntry();
      App.boot();
    },

    async enterAsGuest() {
      state.user = { jenis: "Guest", id_mitra: "GUEST", nama_lengkap: "Guest", kode_agen: "-", domisili: "-" };
      localStorage.setItem("sim_user", JSON.stringify(state.user));
      this.logAccess();
      App.hideEntry();
      App.boot();
    },

    logAccess() {
      callApi("logAkses", { jenis: state.user.jenis, id_mitra: state.user.id_mitra }).catch(() => {});
    }
  };

  function highlightMatch(text, q) {
    if (!text) return "";
    const idx = text.toLowerCase().indexOf(q);
    if (idx === -1) return escapeHtml(text);
    return escapeHtml(text.slice(0, idx)) + "<mark>" + escapeHtml(text.slice(idx, idx + q.length)) + "</mark>" + escapeHtml(text.slice(idx + q.length));
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // =====================================================================
  // MAIN APP
  // =====================================================================
  const App = {
    hideEntry() {
      document.getElementById("entryOverlay").classList.add("hidden");
    },

    openSwitchUser() {
      if (!confirm("Bukan Anda? Ganti nama pengguna sekarang?")) return;
      localStorage.removeItem("sim_user");
      location.reload();
    },

    async boot() {
      document.getElementById("siteHeader").classList.remove("hidden");
      document.getElementById("heroSection").classList.remove("hidden");
      document.getElementById("mainApp").classList.remove("hidden");
      document.getElementById("siteFooter").classList.remove("hidden");
      document.getElementById("seasonBanner").classList.remove("hidden");
      document.getElementById("footerYear").textContent = new Date().getFullYear();

      this.renderUserChip();
      this.renderHero();
      this.bindNav();
      this.initHeroCanvas();
      this.initStars();
      this.initBannerParallax();
      this.initRipple();
      this.initScrollReveal();
      this.animateCounters();

      await Promise.all([this.loadKatalog(), this.loadPengaturan()]);
      this.renderCatalog();
    },

    // ---------------- Motion: button ripple feedback ----------------
    initRipple() {
      document.addEventListener("click", (e) => {
        const btn = e.target.closest(".btn-ripple");
        if (!btn) return;
        const rect = btn.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const span = document.createElement("span");
        span.className = "ripple";
        span.style.width = span.style.height = size + "px";
        span.style.left = (e.clientX - rect.left - size / 2) + "px";
        span.style.top = (e.clientY - rect.top - size / 2) + "px";
        btn.appendChild(span);
        setTimeout(() => span.remove(), 650);
      });
    },

    // ---------------- Motion: scroll-triggered reveal (once) ----------------
    initScrollReveal() {
      const targets = document.querySelectorAll(".reveal, .reveal-group");
      if (!targets.length || !("IntersectionObserver" in window)) {
        targets.forEach((t) => t.classList.add("in-view"));
        return;
      }
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.18, rootMargin: "0px 0px -40px 0px" });
      targets.forEach((t) => io.observe(t));
    },

    // ---------------- Motion: animated counters for hero stats ----------------
    animateCounters() {
      document.querySelectorAll("[data-count]").forEach((el) => {
        const target = Number(el.dataset.count) || 0;
        const suffix = el.dataset.suffix || "";
        const dur = 1100;
        const start = performance.now();
        function tick(now) {
          const p = Math.min(1, (now - start) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * eased) + suffix;
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    },

    // ---------------- Motion: subtle parallax on the season banner art ----------------
    initBannerParallax() {
      const banner = document.getElementById("seasonBanner");
      const art = document.getElementById("seasonBannerArt");
      const photo = document.getElementById("seasonBannerPhoto");
      if (!banner || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      let raf = null;
      banner.addEventListener("mousemove", (e) => {
        const rect = banner.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const tx = px * 14, ty = py * 10;
          art.style.transform = `translate(${tx}px, ${ty}px) scale(1.04)`;
          if (photo) photo.style.transform = `translate(${tx * 0.6}px, ${ty * 0.6}px) scale(1.06)`;
        });
      });
      banner.addEventListener("mouseleave", () => {
        art.style.transform = "translate(0,0) scale(1)";
        if (photo) photo.style.transform = "translate(0,0) scale(1)";
      });
    },

    // ---------------- Decorative: scatter stars on season banner SVG ----------------
    initStars() {
      const layer = document.getElementById("starsLayer");
      if (!layer) return;
      let svg = "";
      for (let i = 0; i < 46; i++) {
        const x = Math.random() * 1600;
        const y = Math.random() * 230;
        const r = Math.random() * 1.3 + 0.4;
        const dur = (Math.random() * 3 + 2.5).toFixed(2);
        const delay = (Math.random() * 3).toFixed(2);
        svg += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(2)}" fill="#F6EFC9">
          <animate attributeName="opacity" values="0.15;1;0.15" dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/>
        </circle>`;
      }
      layer.innerHTML = svg;
    },

    renderUserChip() {
      const u = state.user;
      const initials = u.nama_lengkap.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
      document.getElementById("userAvatar").textContent = initials || "G";
      document.getElementById("userChipName").textContent = u.jenis === "Guest" ? "Guest" : `${u.nama_lengkap}`;
    },

    renderHero() {
      const u = state.user;
      if (u.jenis === "Mitra") {
        document.getElementById("heroTitle").textContent = `Selamat Datang, ${u.nama_lengkap}!`;
        document.getElementById("heroLead").textContent =
          `Kode Agen ${u.kode_agen || "-"} · ${u.domisili || "-"} — akses materi syiar terbaru untuk mendukung dakwah perjalanan ibadah Anda.`;
      } else {
        document.getElementById("heroTitle").textContent = "Selamat Datang, Sahabat!";
        document.getElementById("heroLead").textContent =
          "Jelajahi materi syiar & promosi resmi SHAHIB Ibad Tour sebagai Pengunjung Umum.";
      }
    },

    bindNav() {
      document.querySelectorAll("[data-nav]").forEach((a) => {
        a.addEventListener("click", (e) => {
          const target = a.getAttribute("href").replace("#", "");
          if (a.dataset.cat) { this.setCategory(a.dataset.cat); }
          document.querySelectorAll("[data-nav]").forEach((x) => x.classList.toggle("active", x.dataset.nav === a.dataset.nav));
        });
      });
    },

    goto(id) {
      document.getElementById(id).scrollIntoView({ behavior: "smooth" });
    },
    focusSearch() {
      this.goto("katalog");
      setTimeout(() => document.getElementById("searchInput").focus(), 400);
    },
    filterTerbaru() {
      this.goto("katalog");
    },

    // ---------------- Katalog data (F3/F4) ----------------
    async loadKatalog() {
      const cached = cacheGet("katalog");
      if (cached) {
        state.konten = cached.value.konten || [];
        state.subKategori = cached.value.subKategori || [];
      }
      try {
        const res = await callApi("getKatalog");
        state.konten = res.data.konten || [];
        state.subKategori = res.data.subKategori || [];
        cacheSet("katalog", { konten: state.konten, subKategori: state.subKategori });
        const statEl = document.getElementById("statFileAktifNum");
        statEl.dataset.count = state.konten.length;
        this.animateCounters.call(this); // re-run so the newly-known total also counts up
      } catch (e) {
        toast("Gagal memuat katalog materi. Menampilkan data tersimpan.", "error");
      }
    },

    async loadPengaturan() {
      try {
        const res = await callApi("getPengaturan");
        state.pengaturan = res.data || {};
      } catch (e) { state.pengaturan = {}; }
      const c = { ...CFG.CONTACT, ...(state.pengaturan.kontak || {}) };
      document.getElementById("contactAlamat").textContent = c.alamat;
      document.getElementById("contactTelp").textContent = c.telp;
      document.getElementById("contactEmail").textContent = c.email;
      document.getElementById("footerAlamat").textContent = c.alamat;
      document.getElementById("footerTelp").textContent = c.telp;
      document.getElementById("footerEmail").textContent = c.email;
      document.getElementById("waHelpBtn").href = `https://wa.me/${c.wa}`;
      document.getElementById("phoneHelpBtn").href = `tel:${c.telp}`;
      document.getElementById("emailHelpBtn").href = `mailto:${c.email}`;
      document.getElementById("entryHelpLink").href = `https://wa.me/${c.wa}`;

      if (state.pengaturan.logo_gelap) {
        document.getElementById("entryLogo").src = state.pengaturan.logo_gelap;
        document.getElementById("headerLogo").src = state.pengaturan.logo_terang || state.pengaturan.logo_gelap;
      }

      this.renderBanner(state.pengaturan.banner || {});
      this.renderAbout(state.pengaturan.about || {});
      this.renderLegalitas(state.pengaturan.legalitas || []);
    },

    renderBanner(b) {
      if (b.musim) document.getElementById("seasonBadgeText").textContent = b.musim;
      if (b.judul) document.getElementById("seasonTitle").textContent = b.judul;
      if (b.subjudul) document.getElementById("seasonLead").textContent = b.subjudul;
      const photo = document.getElementById("seasonBannerPhoto");
      const art = document.getElementById("seasonBannerArt");
      if (b.gambar) {
        photo.src = b.gambar;
        photo.classList.remove("hidden");
        art.style.opacity = "0.18"; // ilustrasi tetap terlihat tipis sebagai tekstur di belakang foto asli
      }
    },

    renderAbout(a) {
      if (a.story) document.getElementById("aboutStory").textContent = a.story;
      const img = document.getElementById("aboutImg");
      const wrap = document.getElementById("aboutPhotoWrap");
      if (a.gambar) { img.src = a.gambar; wrap.classList.add("has-photo"); }
      else { wrap.classList.remove("has-photo"); }

      const pilar = (a.pilar && a.pilar.length) ? a.pilar : [];
      document.getElementById("pillarGrid").innerHTML = pilar.map((p) => `
        <div class="pillar">
          <div class="ic">${p.ikon || "✓"}</div>
          <div><b>${escapeHtml(p.judul || "")}</b><p class="t-body" style="margin:4px 0 0;font-size:13px;">${escapeHtml(p.deskripsi || "")}</p></div>
        </div>`).join("");
    },

    renderLegalitas(items) {
      document.getElementById("legalGrid").innerHTML = (items || []).map((l) => `
        <div class="card card-pad"><b class="t-title">${escapeHtml(l.label || "")}</b><p class="t-body" style="font-size:13px;">${escapeHtml(l.nilai || "")}</p></div>
      `).join("");
    },

    setCategory(cat) {
      state.activeCategory = cat;
      state.activeSub = null;
      state.visibleCount = 24;
      document.querySelectorAll("#categoryTabs .chip").forEach((c) => c.classList.toggle("active", c.dataset.cat === cat));
      this.renderSubTabs();
      this.renderCatalog();
      this.goto("katalog");
    },

    renderSubTabs() {
      const wrap = document.getElementById("subCategoryTabs");
      if (state.activeCategory === "Semua") { wrap.innerHTML = ""; return; }
      const subs = state.subKategori.filter((s) => s.kategori_induk === state.activeCategory).sort((a, b) => a.urutan - b.urutan);
      if (!subs.length) { wrap.innerHTML = ""; return; }
      wrap.innerHTML = `<button class="chip ${!state.activeSub ? "active" : ""}" data-sub="">Semua ${state.activeCategory}</button>` +
        subs.map((s) => `<button class="chip ${state.activeSub === s.nama_sub ? "active" : ""}" data-sub="${s.nama_sub}">${s.nama_sub}</button>`).join("");
      wrap.querySelectorAll(".chip").forEach((c) => c.addEventListener("click", () => {
        state.activeSub = c.dataset.sub || null;
        wrap.querySelectorAll(".chip").forEach((x) => x.classList.toggle("active", x === c));
        this.renderCatalog();
      }));
    },

    onSearch(val) {
      state.searchTerm = val.trim().toLowerCase();
      state.visibleCount = 24;
      this.renderCatalog();
    },

    getFiltered() {
      return state.konten
        .filter((k) => k.status === "aktif")
        .filter((k) => state.activeCategory === "Semua" || k.kategori === state.activeCategory)
        .filter((k) => !state.activeSub || k.sub_kategori === state.activeSub)
        .filter((k) => !state.searchTerm || k.judul.toLowerCase().includes(state.searchTerm))
        .sort((a, b) => new Date(b.tgl_upload) - new Date(a.tgl_upload));
    },

    renderCatalog() {
      // Category summary (folder) cards — only on "Semua"
      const summaryGrid = document.getElementById("catSummaryGrid");
      if (state.activeCategory === "Semua" && !state.searchTerm) {
        const cats = ["Dokumen", "Video", "Gambar"];
        const icons = { Dokumen: "📄", Video: "🎬", Gambar: "🖼" };
        summaryGrid.classList.remove("hidden");
        summaryGrid.innerHTML = cats.map((c) => {
          const count = state.konten.filter((k) => k.kategori === c && k.status === "aktif").length;
          return `<div class="card cat-card" onclick="App.setCategory('${c}')">
            <div class="cat-icon">${icons[c]}</div>
            <div><b class="t-title">${c}</b><p class="t-body" style="font-size:13px;margin:2px 0 0;">${count} file</p></div>
          </div>`;
        }).join("");
      } else {
        summaryGrid.classList.add("hidden");
        summaryGrid.innerHTML = "";
      }

      const list = this.getFiltered();
      const grid = document.getElementById("contentGrid");
      const empty = document.getElementById("emptyState");
      const loadMore = document.getElementById("loadMoreBtn");

      if (!list.length) {
        grid.innerHTML = "";
        empty.classList.remove("hidden");
        loadMore.classList.add("hidden");
        return;
      }
      empty.classList.add("hidden");

      const visible = list.slice(0, state.visibleCount);
      const icons = { Dokumen: "📄", Video: "🎬", Gambar: "🖼" };
      const isNew = (d) => (Date.now() - new Date(d).getTime()) < 7 * 24 * 3600 * 1000;

      grid.innerHTML = visible.map((k, i) => `
        <div class="card content-card card-enter" style="animation-delay:${Math.min(i, 11) * 45}ms" onclick="App.openPreview('${k.id_konten}')">
          <div class="content-thumb">
            <span class="kind-badge">${k.kategori}</span>
            ${isNew(k.tgl_upload) ? '<span class="badge-new" style="position:absolute;top:10px;right:10px;">Baru</span>' : ""}
            <span>${icons[k.kategori] || "📁"}</span>
          </div>
          <div class="content-body">
            <div class="title">${escapeHtml(k.judul)}</div>
            <div class="content-meta">${k.sub_kategori || k.kategori} · ${formatDate(k.tgl_upload)}</div>
          </div>
          <div class="content-actions">
            <button class="btn btn-outline btn-sm" style="flex:1;" onclick="event.stopPropagation();App.openPreview('${k.id_konten}')">👁 Lihat</button>
            <button class="btn btn-primary btn-sm" style="flex:1;" onclick="event.stopPropagation();App.quickDownload('${k.id_konten}')">⬇ Unduh</button>
          </div>
        </div>`).join("");

      loadMore.classList.toggle("hidden", list.length <= state.visibleCount);
    },

    loadMore() {
      state.visibleCount += 24;
      this.renderCatalog();
    },

    // ---------------- Preview & Download (F5) ----------------
    openPreview(idKonten) {
      const item = state.konten.find((k) => String(k.id_konten) === String(idKonten));
      if (!item) return;
      state.previewItem = item;
      document.getElementById("previewTitle").textContent = item.judul;
      document.getElementById("previewMeta").textContent = `${item.kategori} · ${item.sub_kategori || "-"} · Diunggah ${formatDate(item.tgl_upload)}`;
      const body = document.getElementById("previewBody");
      const fallback = document.getElementById("previewFallback");
      fallback.href = item.link_embed || item.link_unduh || "#";

      if (item.kategori === "Video") {
        body.innerHTML = `<iframe src="${item.link_embed}" style="width:100%;height:480px;border:0;" allowfullscreen onerror="App.previewFallbackShow()"></iframe>`;
      } else if (item.kategori === "Gambar") {
        body.innerHTML = `<img src="${item.link_embed}" style="max-width:100%;max-height:480px;object-fit:contain;" onerror="App.previewFallbackShow()"/>`;
      } else {
        body.innerHTML = `<iframe src="${item.link_embed}" style="width:100%;height:480px;border:0;" onerror="App.previewFallbackShow()"></iframe>`;
      }
      document.getElementById("previewOverlay").classList.remove("hidden");
    },
    previewFallbackShow() {
      document.getElementById("previewBody").innerHTML =
        `<div style="padding:40px;text-align:center;"><p class="t-body">Pratinjau tidak tersedia langsung. Silakan buka di tab baru.</p></div>`;
    },
    closePreview() {
      document.getElementById("previewOverlay").classList.add("hidden");
      document.getElementById("previewBody").innerHTML = "";
    },

    downloadContent() {
      if (!state.previewItem) return;
      this.quickDownload(state.previewItem.id_konten);
    },

    quickDownload(idKonten) {
      const item = state.konten.find((k) => String(k.id_konten) === String(idKonten));
      if (!item) return;
      window.open(item.link_unduh || item.link_embed, "_blank");
      callApi("logUnduhan", {
        jenis: state.user.jenis, id_mitra: state.user.id_mitra,
        id_konten: item.id_konten, judul: item.judul, kategori: item.kategori
      }).catch(() => {});
      toast("Mengunduh: " + item.judul, "success");
    },

    submitContactForm(e) {
      e.preventDefault();
      const payload = {
        nama: document.getElementById("cfNama").value,
        status: document.getElementById("cfStatus").value,
        wa: document.getElementById("cfWa").value,
        topik: document.getElementById("cfTopik").value,
        pesan: document.getElementById("cfPesan").value
      };
      callApi("kirimPesanKontak", payload).catch(() => {});
      document.getElementById("cfSuccess").classList.remove("hidden");
      document.getElementById("contactForm").reset();
      toast("Pesan terkirim, terima kasih!", "success");
    },

    // ---------------- 3D / decorative hero canvas ----------------
    initHeroCanvas() {
      const canvas = document.getElementById("heroCanvas");
      if (!canvas || !canvas.getContext) return;
      const ctx = canvas.getContext("2d");
      let w, h, particles = [];
      function resize() {
        w = canvas.width = canvas.parentElement.offsetWidth;
        h = canvas.height = canvas.parentElement.offsetHeight;
      }
      resize();
      window.addEventListener("resize", resize);

      const COUNT = window.innerWidth < 760 ? 24 : 48;
      for (let i = 0; i < COUNT; i++) {
        particles.push({
          x: Math.random() * w, y: Math.random() * h,
          r: Math.random() * 1.6 + 0.4,
          vy: Math.random() * 0.12 + 0.03,
          o: Math.random() * 0.5 + 0.15
        });
      }
      function tick() {
        ctx.clearRect(0, 0, w, h);
        particles.forEach((p) => {
          p.y -= p.vy;
          if (p.y < -5) p.y = h + 5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(217,187,69,${p.o})`;
          ctx.fill();
        });
        requestAnimationFrame(tick);
      }
      tick();
    }
  };

  function formatDate(d) {
    try {
      return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
    } catch (e) { return d; }
  }

  window.EntryPopup = EntryPopup;
  window.App = App;

  document.addEventListener("DOMContentLoaded", () => EntryPopup.init());
})();
