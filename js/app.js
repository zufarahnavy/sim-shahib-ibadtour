/* ============================================================
   SHAHIB Ibad Tour — situs publik (Mitra / Guest)
   SPA hash-routing · render dari cache lokal dulu (SWR) · pencarian & filter di browser
   Kontrak API: lihat js/api.js dan backend/Kode.gs
   ============================================================ */
(function () {
  'use strict';
  const $ = function (s, r) { return (r || document).querySelector(s); };
  const $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ESC[c]; }); };
  const safeUrl = function (u) { u = String(u || '').trim(); return /^https:\/\//i.test(u) ? u : ''; };
  const ls = {
    get: function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set: function (k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  };
  const ss = {
    get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) { } }
  };

  const KAT = {
    dokumen: { nama: 'Dokumen', ic: 'description', sub: 'PDF & Brosur', cls: '', judul: 'Dokumen & Brosur', ket: 'Katalog, company profile, brosur, dan dokumen resmi siap dibagikan.' },
    video: { nama: 'Video', ic: 'smart_display', sub: 'Reels & Manasik', cls: 't-vid', judul: 'Video Promosi', ket: 'Video reels, manasik, dan konten promosi siap posting.' },
    gambar: { nama: 'Gambar', ic: 'photo_library', sub: 'Flyer & Feed', cls: 't-img', judul: 'Gambar & Flyer', ket: 'Flyer, feed, story, dan banner untuk media sosial dan cetak.' }
  };
  const BARU_HARI = 7, HAL = 24;

  const S = { set: {}, konten: [], sub: [], cnt: {}, me: null, mitra: [], mitraMuat: false, sig: '', bootAt: 0, view: {}, ready: false };

  // ---------------------------------------------------------------- util
  function tgl(t) {
    const d = new Date(t); if (isNaN(d)) return '';
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function baru(t) { const d = new Date(t); return !isNaN(d) && (Date.now() - d.getTime()) < BARU_HARI * 864e5; }
  function init2(n) { const p = String(n || '?').trim().split(/\s+/); return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase(); }
  function hi(text, q) {
    text = String(text || ''); if (!q) return esc(text);
    const i = text.toLowerCase().indexOf(q); if (i < 0) return esc(text);
    return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
  }
  function tpl(s, me) {
    return String(s || '').replace(/\{nama\}/g, me ? me.nama : '').replace(/\{kode\}/g, me ? me.kode : '').replace(/\{domisili\}/g, me ? me.dom : '');
  }
  function debounce(fn, ms) { let t; return function () { const a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms); }; }
  function toast(msg, tipe) {
    const el = document.createElement('div'); el.className = 'toast ' + (tipe || '');
    el.innerHTML = '<span class="ms s18">' + (tipe === 'err' ? 'error' : tipe === 'ok' ? 'check_circle' : 'info') + '</span><span>' + esc(msg) + '</span>';
    $('#toasts').appendChild(el); setTimeout(function () { el.remove(); }, 3800);
  }
  function logo(jenis) {
    const k = jenis === 'gelap' ? 'logo_gelap_url' : 'logo_terang_url';
    return S.set[k] || ('assets/logo-' + (jenis === 'gelap' ? 'gelap' : 'terang') + '.svg');
  }
  function mobile() { return window.matchMedia('(max-width: 719px)').matches; }
  function wa(txt) { return 'https://wa.me/' + String(S.set.kontak_wa || '').replace(/\D/g, '') + (txt ? '?text=' + encodeURIComponent(txt) : ''); }
  function tel(s) { return 'tel:' + String(s || '').replace(/[^\d+]/g, ''); }

  // ---------------------------------------------------------------- merek (logo, favicon, judul)
  function brand() {
    const s = S.set;
    document.body.classList.toggle('wm-on', s.opt_watermark !== '0');
    document.body.classList.toggle('no-gold', s.opt_gradien === '0');
    const l = $('#logo-hdr'); if (l && l.getAttribute('src') !== logo('terang')) l.src = logo('terang');
    const f = $('#favicon');
    if (f && s.favicon_url && f.getAttribute('href') !== s.favicon_url) f.setAttribute('href', s.favicon_url);
    if (s.meta_judul) document.title = s.meta_judul;
    const md = $('meta[name=description]'); if (md && s.meta_deskripsi) md.setAttribute('content', s.meta_deskripsi);
  }
  function chrome() {
    const chip = $('#me-chip'), me = S.me;
    chip.hidden = !me;
    if (me) {
      const g = me.jenis === 'Guest';
      $('#me-av').textContent = g ? '' : init2(me.nama); $('#me-av').className = 'me-av' + (g ? ' g' : '');
      if (g) $('#me-av').innerHTML = '<span class="ms s18">person</span>';
      $('#me-nm').textContent = g ? 'Guest' : me.nama; $('#me-cd').textContent = g ? 'Tamu' : me.kode;
    }
    $('#btn-portal').textContent = me && me.jenis === 'Mitra' ? 'Ganti Akun' : 'Portal Mitra';
  }

  // ---------------------------------------------------------------- data
  function sigOf(b) { try { return JSON.stringify([b.konten, b.sub, b.set, b.cnt]); } catch (e) { return String(Date.now()); } }
  function applyBoot(b, simpan) {
    if (!b) return false;
    const sig = sigOf(b), ubah = sig !== S.sig;
    S.konten = b.konten || []; S.sub = b.sub || []; S.set = b.set || S.set; S.cnt = b.cnt || {}; S.sig = sig; S.bootAt = Date.now();
    if (simpan !== false) ls.set('shahib.boot', { konten: S.konten, sub: S.sub, set: S.set, cnt: S.cnt, at: S.bootAt });
    return ubah;
  }
  function jml(k) { return S.cnt[k.id] || 0; }

  let sesiP = null;
  function mulaiSesi(opsi) {
    // satu permintaan: catat akses + token + data beranda
    if (sesiP) return sesiP;
    const me = S.me || {}; opsi = opsi || {};
    const body = { jenis: me.jenis === 'Guest' ? 'Guest' : 'Mitra', id_mitra: me.id, cid: cid(), perangkat: mobile() ? 'Ponsel' : 'Desktop' };
    sesiP = API.call('session.start', body).then(function (r) {
      sesiP = null;
      if (r.success) {
        API.tok.user.set(r.data.token);
        ss.set('shahib.ses', '1');
        S.me = r.data.me; ls.set('shahib.id', S.me);
        const ubah = applyBoot(r.data.boot);
        chrome(); brand();
        if (ubah || opsi.paksa) renderAll();
      }
      return r;
    }, function (e) { sesiP = null; throw e; });
    return sesiP;
  }
  function cid() { let c = ls.get('shahib.cid'); if (!c) { c = Math.random().toString(36).slice(2, 12); ls.set('shahib.cid', c); } return c; }

  function segarkan(paksa) {
    if (!S.me || !API.tok.user.get()) return mulaiSesi();
    if (!paksa && Date.now() - S.bootAt < 300000) return Promise.resolve();
    return API.call('boot').then(function (r) {
      if (r.success) { if (applyBoot(r.data)) { brand(); renderAll(); } }
      else if (r.code === 'AUTH') return mulaiSesi();
    });
  }
  function muatPub() {
    return API.call('pub.init').then(function (r) {
      if (!r.success) return r;
      S.mitra = r.data.mitra || []; S.mitraMuat = true; ls.set('shahib.pub', { mitra: S.mitra, set: r.data.set, at: Date.now() });
      if (!S.me || !S.konten.length) { S.set = Object.assign({}, S.set, r.data.set); brand(); }
      return r;
    });
  }

  // ---------------------------------------------------------------- kartu materi
  function tipeBadge(k) {
    const f = (k.f || '').toUpperCase();
    if (f) return f;
    return k.k === 'Video' ? 'VIDEO' : k.k === 'Gambar' ? 'GAMBAR' : 'DOKUMEN';
  }
  function kartu(k) {
    const kat = KAT[k.k.toLowerCase()] || KAT.dokumen, th = safeUrl(k.th);
    const play = k.k === 'Video' ? '<span class="play"><span><span class="ms fill">play_arrow</span></span></span>' : '';
    const lihat = k.k === 'Video' ? ['play_circle', 'Putar'] : k.k === 'Gambar' ? ['zoom_in', 'Pratinjau'] : ['visibility', 'Lihat'];
    return '<article class="card" data-id="' + esc(k.id) + '">' +
      '<button class="thumb ' + kat.cls + '" data-a="lihat" aria-label="Lihat ' + esc(k.j) + '">' +
      (th ? '<span class="bg" style="background-image:url(\'' + esc(th) + '\')"></span>' : '') +
      '<span class="big"><span class="ms">' + kat.ic + '</span></span>' +
      '<span class="tl"><span class="badge ' + (k.k === 'Video' ? 'b-vid' : 'b-gold') + '" style="' + (k.k === 'Video' ? 'background:var(--violet);color:#fff' : '') + '">' + esc(tipeBadge(k)) + '</span>' + (baru(k.t) ? '<span class="badge b-new">Baru</span>' : '') + '</span>' +
      play + '<span class="tr">' + esc(tgl(k.t)) + '</span></button>' +
      '<div class="card-b"><h3>' + esc(k.j) + '</h3><p>' + esc(k.d || [k.s, k.k].filter(Boolean).join(' · ')) + '</p>' +
      '<div class="card-m"><span><span class="ms s16">download_done</span><b data-cnt="' + esc(k.id) + '">' + jml(k) + '</b>× diunduh</span>' + (k.z ? '<span><span class="ms s16">attachment</span>' + esc(k.z) + '</span>' : '') + '</div>' +
      '<div class="card-act"><button class="btn btn-soft" data-a="lihat"><span class="ms s18">' + lihat[0] + '</span>' + lihat[1] + '</button>' +
      '<button class="btn btn-dark" data-a="unduh"><span class="ms s18">download</span>Unduh</button></div></div></article>';
  }
  function kosong(msg) { return '<div class="empty"><span class="ms">search_off</span><b>Materi tidak ditemukan</b>' + esc(msg || 'Coba kata kunci atau kategori lain.') + '</div>'; }
  function skelKartu(n) { let h = ''; for (let i = 0; i < n; i++) h += '<div class="card"><div class="thumb sk"></div><div class="card-b"><div class="sk" style="height:20px;width:80%"></div><div class="sk" style="height:34px"></div><div class="sk" style="height:44px"></div></div></div>'; return h; }
  function cocok(k, q) {
    if (!q) return true;
    const h = (k.j + ' ' + k.s + ' ' + k.k + ' ' + k.d + ' ' + k.tg).toLowerCase();
    return q.split(/\s+/).every(function (w) { return h.indexOf(w) > -1; });
  }
  function urut(a, mode) {
    a = a.slice();
    if (mode === 'lama') a.sort(function (x, y) { return String(x.t).localeCompare(String(y.t)); });
    else if (mode === 'abjad') a.sort(function (x, y) { return x.j.localeCompare(y.j, 'id'); });
    else if (mode === 'populer') a.sort(function (x, y) { return jml(y) - jml(x); });
    else a.sort(function (x, y) { return String(y.t).localeCompare(String(x.t)); });
    return a;
  }

  // ---------------------------------------------------------------- halaman: beranda
  function pageBeranda() {
    const el = $('#p-beranda'), s = S.set, me = S.me, g = !me || me.jenis === 'Guest';
    const n = { Dokumen: 0, Video: 0, Gambar: 0 }; let minggu = 0;
    S.konten.forEach(function (k) { if (n[k.k] !== undefined) n[k.k]++; if (baru(k.t)) minggu++; });
    const judul = g ? s.hero_judul_guest : s.hero_judul_mitra;
    const jt = esc(tpl(judul, me)), nm = me && !g ? esc(me.nama) : '';
    const h1 = nm && jt.indexOf(nm) > -1 ? jt.replace(nm, '<em>' + nm + '</em>') : jt;
    const sub = g ? '' : '<p class="hero-sub"><span class="ms s16">business_center</span>' + esc(tpl(s.hero_sub_mitra, me)) + '</p>';
    const strip = me && !g ? '<section class="wrap" style="padding-top:14px"><div style="display:flex;align-items:center;gap:10px;justify-content:space-between" class="mobile-strip"></div></section>' : '';
    const terbaru = urut(S.konten, 'baru').slice(0, 8);
    el.innerHTML =
      '<section class="hero"><svg class="wm" viewBox="0 0 400 400" aria-hidden="true"><defs><pattern id="geo" width="80" height="80" patternUnits="userSpaceOnUse"><circle cx="40" cy="40" r="36" fill="none" stroke="#fff" stroke-width="1.2"/><circle cx="0" cy="0" r="36" fill="none" stroke="#fff" stroke-width="1.2"/><circle cx="80" cy="0" r="36" fill="none" stroke="#fff" stroke-width="1.2"/><circle cx="0" cy="80" r="36" fill="none" stroke="#fff" stroke-width="1.2"/><circle cx="80" cy="80" r="36" fill="none" stroke="#fff" stroke-width="1.2"/><path d="M40 4 76 40 40 76 4 40Z" fill="none" stroke="#CBAB2A"/></pattern></defs><rect width="100%" height="100%" fill="url(#geo)"/></svg><div class="glow"></div>' +
      '<div class="wrap hero-in"><div><span class="hero-badge"><span class="ms s16 fill">verified</span>' + esc(s.hero_badge) + '</span>' +
      '<h1>' + h1 + '</h1>' + sub +
      '<p class="hero-desc">' + esc(g ? s.hero_intro_guest : s.hero_intro_mitra) + '</p>' +
      '<div class="hero-cta"><a class="btn btn-gold" href="#kategori" data-scroll="kategori">Jelajahi Materi<span class="ms s18">arrow_forward</span></a><a class="btn btn-glass" href="#terbaru" data-scroll="terbaru"><span class="ms s18" style="color:var(--gold-l)">schedule</span>Terbaru</a></div></div>' +
      '<div class="hero-vis" aria-hidden="true"><div class="arch"><svg width="120" height="120" viewBox="0 0 64 64"><defs><linearGradient id="gk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E6D285"/><stop offset=".5" stop-color="#D9BB45"/><stop offset="1" stop-color="#A98E23"/></linearGradient></defs><path d="M32 6c-10 8-18 14-18 26h36C50 20 42 14 32 6z" fill="url(#gk)"/><rect x="10" y="36" width="44" height="9" rx="2" fill="#fff" opacity=".9"/><rect x="16" y="48" width="32" height="5" rx="2" fill="url(#gk)"/></svg></div>' +
      '<div class="hero-cap"><span><span class="ms s16" style="vertical-align:-3px;color:var(--gold-l)">mosque</span> ' + esc(s.tagline) + '</span><span>SHAHIB Ibad Tour</span></div></div></div></section>' +
      '<div class="wrap"><div class="sbox"><div style="position:relative"><span class="ms" style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--charcoal-sub)">search</span>' +
      '<input class="input" id="hq" style="padding-left:44px;padding-right:44px" type="search" placeholder="Cari katalog, video reels, brosur…" autocomplete="off" value="' + esc(S.view.hq || '') + '"><button class="clear-x" id="hq-x" aria-label="Hapus pencarian" ' + (S.view.hq ? '' : 'hidden') + '><span class="ms s16">close</span></button></div>' +
      '<div class="chips" id="hchips"><button class="chip on" data-c="">' + '<span class="ms s16">apps</span>Semua Kategori</button>' +
      Object.keys(KAT).map(function (k) { return '<button class="chip" data-c="' + k + '"><span class="ms s16">' + KAT[k].ic + '</span>' + KAT[k].nama + '</button>'; }).join('') + '</div>' +
      '<div class="stat-strip"><span class="l"><span class="pulse"></span>' + S.konten.length + ' file aktif tersedia</span>' + (minggu ? '<span class="r"><span class="ms s14">auto_awesome</span>' + minggu + ' baru minggu ini</span>' : '') + '</div></div></div>' +
      '<div class="wrap" id="hbody"></div>';
    el.querySelector('.mobile-strip') && 0;
    hbody();
  }
  function hbody() {
    const el = $('#hbody'); if (!el) return;
    const q = (S.view.hq || '').trim().toLowerCase(), c = S.view.hc || '';
    $$('#hchips .chip').forEach(function (b) { b.classList.toggle('on', b.dataset.c === c); });
    const x = $('#hq-x'); if (x) x.hidden = !S.view.hq;
    const cnt = { Dokumen: 0, Video: 0, Gambar: 0 }; S.konten.forEach(function (k) { if (cnt[k.k] !== undefined) cnt[k.k]++; });
    if (q || c) {
      const hasil = urut(S.konten.filter(function (k) { return (!c || k.k.toLowerCase() === c) && cocok(k, q); }), 'baru');
      el.innerHTML = '<section class="sec"><div class="count-line">' + hasil.length + ' materi ditemukan</div>' + (hasil.length ? '<div class="grid">' + hasil.slice(0, 60).map(kartu).join('') + '</div>' : kosong()) + '</section>';
      return;
    }
    const g = !S.me || S.me.jenis === 'Guest', s = S.set;
    const terbaru = urut(S.konten, 'baru').slice(0, 8);
    el.innerHTML =
      '<section class="sec" id="kategori"><div class="sec-h"><h2>Kategori Koleksi</h2><span class="link" style="text-transform:uppercase">3 Kategori</span></div><div class="cat-grid">' +
      Object.keys(KAT).map(function (k) { const v = KAT[k]; return '<a class="cat" href="#/' + k + '"><span class="cat-ic"><span class="ms s24">' + v.ic + '</span></span><b>' + v.nama + '</b><small>' + v.sub + '</small><span class="n">' + cnt[v.nama] + ' file</span></a>'; }).join('') + '</div></section>' +
      '<section class="sec" id="terbaru"><div class="sec-h"><h2>Materi Terbaru <span class="dot"></span></h2><a class="link" href="#/dokumen">Lihat Semua<span class="ms s16">chevron_right</span></a></div>' +
      (S.ready || S.konten.length ? (terbaru.length ? '<div class="rail">' + terbaru.map(kartu).join('') + '</div>' : kosong('Belum ada materi yang dipublikasikan.')) : '<div class="rail">' + skelKartu(3) + '</div>') + '</section>' +
      (S.me ? '<section class="sec"><div class="banner"><span class="ic"><span class="ms s20">badge</span></span><div><h3>' + (g ? 'Anda masuk sebagai Tamu (Guest)' : 'Mode Mitra Aktif (' + esc(S.me.nama) + ')') + '</h3><p>' +
        (g ? 'Mitra/Agen resmi? Pilih nama Anda untuk mendapatkan sapaan dan catatan akses atas nama Anda.' : 'Ingin meminjamkan ponsel ke calon jemaah? Beralih ke Mode Guest agar catatan akses atas nama Anda tidak bercampur.') + '</p>' +
        '<button class="btn btn-dark btn-sm" data-a="ganti"><span class="ms s16">' + (g ? 'badge' : 'visibility') + '</span>' + (g ? 'Pilih Nama Mitra' : 'Beralih ke Tamu (Guest)') + '</button></div></div></section>' : '') +
      '<section class="sec"><div class="sec-h"><h2>Legalitas &amp; Pusat Bantuan</h2></div><div class="panel"><div class="legal-row"><span class="legal-ic"><span class="ms s24">verified_user</span></span><div><b>PT Ibad Tour Jember</b><div style="font-size:12px;color:var(--charcoal-sub)">PPIU ' + esc(s.ppiu_no) + ' · PIHK ' + esc(s.pihk_info) + '</div></div></div>' +
      '<div class="quote">“' + esc(s.tagline) + '”</div><div class="act2"><a class="btn btn-wa" href="' + esc(wa('Assalamu\'alaikum Admin Ibad Tour, saya ingin bertanya.')) + '" target="_blank" rel="noopener"><span class="ms s18">chat</span>WhatsApp CS</a><a class="btn btn-soft" href="' + esc(tel(s.kontak_telp)) + '"><span class="ms s18">call</span>Telepon</a></div></div></section>';
  }

  // ---------------------------------------------------------------- halaman: kategori
  function pageKat(key) {
    const el = $('#p-' + key), v = KAT[key], st = S.view[key] = S.view[key] || { q: '', sub: '', o: 'baru', n: HAL };
    const subs = S.sub.filter(function (x) { return x.k === v.nama; });
    el.innerHTML = '<div class="wrap"><div class="cat-head"><h1>' + v.judul + '</h1><p>' + v.ket + '</p></div>' +
      '<div class="toolbar"><div style="position:relative"><span class="ms" style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--charcoal-sub)">search</span><input class="input" id="kq" style="padding-left:44px" type="search" placeholder="Cari judul materi…" autocomplete="off" value="' + esc(st.q) + '"></div>' +
      '<select class="select" id="ko" aria-label="Urutkan">' + [['baru', 'Terbaru'], ['lama', 'Terlama'], ['abjad', 'Abjad A–Z'], ['populer', 'Terbanyak diunduh']].map(function (o) { return '<option value="' + o[0] + '"' + (st.o === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' +
      (subs.length ? '<div class="chips" id="ksub"><button class="chip' + (st.sub ? '' : ' on') + '" data-s="">Semua</button>' + subs.map(function (x) { return '<button class="chip' + (st.sub === x.n ? ' on' : '') + '" data-s="' + esc(x.n) + '">' + esc(x.n) + '</button>'; }).join('') + '</div>' : '') + '</div>' +
      '<div class="count-line" id="kc"></div><div class="grid" id="kg"></div><div class="more" id="km"></div></div>';
    katList(key);
  }
  function katList(key) {
    const st = S.view[key], q = st.q.trim().toLowerCase(), v = KAT[key];
    const hasil = urut(S.konten.filter(function (k) { return k.k === v.nama && (!st.sub || k.s === st.sub) && cocok(k, q); }), st.o);
    $('#kc').textContent = hasil.length + ' materi';
    $('#kg').innerHTML = hasil.length ? hasil.slice(0, st.n).map(kartu).join('') : (S.konten.length || S.ready ? kosong() : skelKartu(6));
    $('#kg').style.display = hasil.length ? '' : 'block';
    $('#km').innerHTML = hasil.length > st.n ? '<button class="btn btn-ghost" data-a="lagi" data-k="' + key + '">Tampilkan lebih banyak (' + (hasil.length - st.n) + ')</button>' : '';
    $$('#ksub .chip').forEach(function (b) { b.classList.toggle('on', b.dataset.s === st.sub); });
  }

  // ---------------------------------------------------------------- halaman: tentang & kontak
  function pageInfo() {
    const el = $('#p-info'), s = S.set, me = S.me;
    const pil = [['policy', 'Amanah & Transparan', 'Layanan resmi, informasi jelas, dan komunikasi yang terbuka kepada mitra maupun jemaah.'], ['flight_takeoff', 'Pasti Jadwalnya', 'Kepastian jadwal dan informasi keberangkatan yang disampaikan sejak awal.'], ['hotel_class', 'Nyaman Ibadahnya', 'Perjalanan yang disiapkan agar jemaah dapat fokus beribadah dengan tenang.'], ['diversity_1', 'Penuh Cinta Keluarga', 'Pendampingan hangat layaknya keluarga, dari persiapan hingga kepulangan.']];
    const wm = '<svg class="wm" viewBox="0 0 800 800" aria-hidden="true"><circle cx="400" cy="400" r="300" fill="none" stroke="#CBAB2A" stroke-width="4"/><circle cx="400" cy="400" r="220" fill="none" stroke="#CBAB2A" stroke-width="3"/><circle cx="400" cy="400" r="140" fill="none" stroke="#CBAB2A" stroke-width="2"/></svg>';
    el.innerHTML =
      '<section class="dark-sec info-hero">' + wm + '<div class="wrap" style="position:relative"><span class="hero-badge"><span class="ms s16 fill">verified</span>Tentang Kami &amp; Kontak</span><h1>Tentang Kami &amp; Layanan Keagenan Resmi</h1>' +
      '<p><b style="color:var(--gold-b)">' + esc(s.tagline) + '</b> — pusat materi promosi resmi SHAHIB Ibad Tour untuk Mitra/Agen.</p>' +
      '<div class="pill-nav"><a href="#" data-scroll="cerita">Profil &amp; Nilai</a><a href="#" data-scroll="legalitas">Legalitas</a><a href="#" data-scroll="kantor">Kantor</a><a href="#" data-scroll="bantuan">Bantuan Mitra</a></div></div></section>' +
      '<section class="wrap" id="cerita" style="padding-top:36px"><div class="two"><div><div class="arch"><span class="ring"></span><div class="in"><div class="pic" style="display:grid;place-items:center"><svg width="130" height="130" viewBox="0 0 64 64"><defs><linearGradient id="g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#F6EFC9"/></linearGradient></defs><path d="M32 6c-10 8-18 14-18 26h36C50 20 42 14 32 6z" fill="url(#g2)"/><rect x="10" y="36" width="44" height="9" rx="2" fill="#fff" opacity=".9"/></svg></div></div></div></div>' +
      '<div class="stack"><span class="link" style="text-transform:uppercase">Komitmen &amp; Rekam Jejak</span><h2 style="font-size:26px;line-height:34px;font-weight:800">' + esc(s.about_judul) + '</h2><p style="color:var(--charcoal-m);font-size:15px;line-height:25px">' + esc(s.about_isi) + '</p>' +
      '<div class="pillars">' + pil.map(function (p) { return '<div class="pillar"><span class="ic"><span class="ms s22">' + p[0] + '</span></span><h3>' + p[1] + '</h3><p>' + p[2] + '</p></div>'; }).join('') + '</div></div></div></section>' +
      '<section class="band" id="legalitas" style="margin-top:40px"><div class="wrap"><div class="sec-h"><h2>Legalitas &amp; Perizinan</h2></div><div class="legal-grid">' +
      '<div class="lcard"><div class="t"><span class="legal-ic"><span class="ms s22">verified</span></span><span class="badge b-gray">PPIU</span></div><b>Izin Resmi Umrah (PPIU)</b><div class="v">' + esc(s.ppiu_no) + '</div><p>Penyelenggara Perjalanan Ibadah Umrah atas nama PT Ibad Tour Jember.</p></div>' +
      '<div class="lcard"><div class="t"><span class="legal-ic"><span class="ms s22">military_tech</span></span><span class="badge b-gray">PIHK</span></div><b>Izin Haji Khusus (PIHK)</b><div class="v">' + esc(s.pihk_info) + '</div><p>Penyelenggara Ibadah Haji Khusus.</p></div></div></div></section>' +
      '<section class="wrap" id="kantor" style="padding-top:40px"><div class="sec-h"><h2>Kantor Operasional &amp; Kontak</h2></div><div class="two"><div class="stack">' +
      '<div class="ctile"><span class="ic"><span class="ms s24">location_on</span></span><div><b>Alamat Kantor</b><p>' + esc(s.kontak_alamat) + '</p></div></div>' +
      '<div class="ctile"><span class="ic"><span class="ms s24">call</span></span><div><b>Telepon</b><p><a href="' + esc(tel(s.kontak_telp)) + '" style="font-weight:800;font-size:16px">' + esc(s.kontak_telp) + '</a></p></div></div>' +
      '<div class="ctile"><span class="ic"><span class="ms s24">mail</span></span><div><b>Email &amp; Website</b><p><a href="mailto:' + esc(s.kontak_email) + '">' + esc(s.kontak_email) + '</a><br>' + esc(s.kontak_web) + '</p></div></div>' +
      '<div class="hours"><div class="h"><span><span class="ms s18" style="color:var(--gold-b);vertical-align:-4px">schedule</span> Jam Operasional</span><span class="badge b-dark">WIB</span></div><div style="font-size:13px;color:#c8c6c5">' + esc(s.jam_operasional) + '</div></div></div>' +
      '<div class="mapbox"><iframe loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Peta kantor" src="https://www.google.com/maps?q=' + encodeURIComponent(s.maps_query) + '&output=embed"></iframe><div class="mapbar"><span><span class="ms s18" style="color:var(--gold-d);vertical-align:-4px">pin_drop</span> ' + esc(s.koordinat) + '</span><a class="btn btn-gold btn-sm" href="' + esc(safeUrl(s.maps_url) || '#') + '" target="_blank" rel="noopener"><span class="ms s16">directions</span>Buka di Google Maps</a></div></div></div></section>' +
      '<section class="dark-sec support" id="bantuan">' + wm + '<div class="wrap" style="position:relative"><div class="two"><div class="stack"><span class="link" style="color:var(--gold-b);text-transform:uppercase">Dukungan Mitra &amp; Jemaah</span><h2 style="font-size:26px;line-height:34px;font-weight:800">Sampaikan Kebutuhan Materi &amp; Bimbingan Anda</h2><p style="color:#c8c6c5">Butuh materi khusus, kustomisasi brosur dengan nomor agen, atau informasi kemitraan? Kirim pesan dan tim kami akan menghubungi Anda melalui WhatsApp.</p>' +
      '<div class="quick"><div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn btn-wa" href="' + esc(wa('Assalamu\'alaikum Admin Ibad Tour, saya ingin berkonsultasi.')) + '" target="_blank" rel="noopener"><span class="ms s18">chat</span>WhatsApp CS</a><a class="btn btn-glass" href="' + esc(tel(s.kontak_telp)) + '"><span class="ms s18">call</span>Telepon</a><a class="btn btn-glass" href="mailto:' + esc(s.kontak_email) + '"><span class="ms s18">mail</span>Email</a></div></div></div>' +
      '<div class="formcard"><h3>Formulir Layanan &amp; Informasi</h3><p style="color:var(--charcoal-m);font-size:12px;margin-top:2px">Lengkapi data berikut dengan benar.</p><form id="kform" novalidate>' +
      '<div class="row2"><div class="field"><label for="f-nama">Nama lengkap *</label><input class="input" id="f-nama" maxlength="100" required autocomplete="name" value="' + esc(me && me.jenis === 'Mitra' ? me.nama : '') + '"></div>' +
      '<div class="field"><label for="f-st">Status hubungan *</label><select class="select" id="f-st"><option>Mitra Agen Resmi</option><option>Calon Mitra</option><option>Jemaah / Keluarga Jemaah</option><option>Masyarakat Umum</option></select></div></div>' +
      '<div class="row2"><div class="field"><label for="f-wa">Nomor WhatsApp *</label><input class="input" id="f-wa" type="tel" inputmode="tel" maxlength="25" placeholder="0812xxxxxxx" required autocomplete="tel"></div>' +
      '<div class="field"><label for="f-tp">Topik *</label><select class="select" id="f-tp"><option>Materi promosi &amp; brosur khusus</option><option>Konfirmasi jadwal &amp; sisa seat</option><option>Pendaftaran kemitraan</option><option>Lainnya</option></select></div></div>' +
      '<div class="field"><label for="f-ps">Pesan *</label><textarea class="textarea" id="f-ps" rows="4" maxlength="1500" required placeholder="Tuliskan kebutuhan Anda dengan jelas…"></textarea></div>' +
      '<div id="f-msg"></div><button class="btn btn-gold btn-block" type="submit" style="min-height:48px"><span class="ms s18">send</span>Kirim Pesan</button></form></div></div></div></section>';
  }
  function kirimKontak(e) {
    e.preventDefault();
    const b = $('#kform button[type=submit]'), msg = $('#f-msg');
    const d = { nama: $('#f-nama').value.trim(), status: $('#f-st').value, whatsapp: $('#f-wa').value.trim(), topik: $('#f-tp').value, pesan: $('#f-ps').value.trim(), kode: S.me && S.me.jenis === 'Mitra' ? S.me.kode : '' };
    if (!d.nama || !d.whatsapp || !d.pesan) { msg.innerHTML = '<div class="alert err"><span class="ms s18">error</span>Nama, WhatsApp, dan pesan wajib diisi.</div>'; return; }
    b.classList.add('is-busy'); msg.innerHTML = '';
    API.call('kontak.kirim', d).then(function (r) {
      b.classList.remove('is-busy');
      if (r.success) { $('#kform').reset(); msg.innerHTML = '<div class="alert ok"><span class="ms s18">check_circle</span><div><b>Alhamdulillah, pesan terkirim.</b><br>Tim kami akan menghubungi Anda melalui WhatsApp.</div></div>'; }
      else msg.innerHTML = '<div class="alert err"><span class="ms s18">error</span>' + esc(r.message || 'Gagal mengirim pesan.') + '</div>';
    });
  }

  // ---------------------------------------------------------------- footer
  function footer() {
    const s = S.set;
    $('#ftr').innerHTML = '<div class="wrap"><div class="ftr-g"><div><img alt="SHAHIB Ibad Tour" src="' + esc(logo('gelap')) + '"><p style="margin-top:12px;max-width:360px">Penyedia resmi layanan umrah &amp; haji khusus. Menghubungkan mitra, agen syiar, dan jemaah dengan materi promosi berkualitas.</p><p style="margin-top:12px;color:var(--gold-b);display:flex;gap:6px;align-items:center"><span class="ms s18">verified</span>PPIU ' + esc(s.ppiu_no) + '</p></div>' +
      '<div><h5>Navigasi &amp; Materi</h5><ul><li><a href="#/beranda">Beranda</a></li><li><a href="#/dokumen">Brosur &amp; Dokumen</a></li><li><a href="#/video">Video Promosi</a></li><li><a href="#/gambar">Flyer &amp; Gambar</a></li><li><a href="#/tentang">Tentang Kami</a></li></ul></div>' +
      '<div><h5>Kantor &amp; Narahubung</h5><div class="ci"><span class="ms s20">location_on</span><span>' + esc(s.kontak_alamat) + '</span></div><div class="ci"><span class="ms s20">call</span><span>' + esc(s.kontak_telp) + '</span></div><div class="ci"><span class="ms s20">mail</span><span>' + esc(s.kontak_email) + '</span></div></div></div>' +
      '<div class="ftr-b"><span>© ' + new Date().getFullYear() + ' Ibad Tour — ' + esc(s.tagline) + '. Seluruh hak cipta dilindungi.</span><a class="adm-link" href="#/admin"><span class="ms s14">lock</span>Masuk Admin</a></div></div>';
  }

  // ---------------------------------------------------------------- router
  const PAGES = { beranda: pageBeranda, dokumen: function () { pageKat('dokumen'); }, video: function () { pageKat('video'); }, gambar: function () { pageKat('gambar'); }, tentang: pageInfo, kontak: pageInfo };
  let rutAktif = '';
  function rute() { const h = (location.hash || '').replace(/^#\/?/, '').split('?')[0]; return h || 'beranda'; }
  function renderRoute(keepScroll) {
    const r = rute();
    if (/^admin/.test(r)) return bukaAdmin(r);
    tutupAdmin();
    const nama = PAGES[r] ? r : 'beranda', pid = (nama === 'tentang' || nama === 'kontak') ? 'info' : nama;
    // hanya halaman aktif yang berisi DOM (id #kg/#kq dipakai bersama; render ulang dari memori itu murah)
    $$('.page').forEach(function (p) { const on = p.id === 'p-' + pid; p.classList.toggle('on', on); if (!on && p.firstChild) p.textContent = ''; });
    $$('#nav-top a, #nav-bot a').forEach(function (a) { a.classList.toggle('on', a.dataset.r === nama || (nama === 'kontak' && a.dataset.r === 'tentang')); });
    PAGES[nama]();
    if (nama === 'kontak') setTimeout(function () { const t = $('#kantor'); t && t.scrollIntoView(); }, 30);
    else if (!keepScroll && nama !== rutAktif) window.scrollTo(0, 0);
    rutAktif = nama; footer();
  }
  function renderAll() { if (/^admin/.test(rute())) return; renderRoute(true); chrome(); }

  // ---------------------------------------------------------------- admin (dimuat saat dibutuhkan)
  let adminP = null;
  function muatAdmin() {
    if (adminP) return adminP;
    adminP = new Promise(function (ok, gagal) {
      const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'css/admin.css'; document.head.appendChild(l);
      const s = document.createElement('script'); s.src = 'js/admin.js'; s.onload = function () { ok(window.Admin); }; s.onerror = function () { adminP = null; gagal(new Error('Gagal memuat panel admin')); };
      document.head.appendChild(s);
    });
    return adminP;
  }
  function bukaAdmin(r) {
    $('#pub').hidden = true; $('#adm').hidden = false; document.body.classList.add('is-admin');
    API.warm('admin');
    muatAdmin().then(function (A) { A.mount($('#adm'), r, window.App); }, function () { $('#adm').innerHTML = '<div class="empty" style="margin:40px 16px"><span class="ms">cloud_off</span><b>Panel admin tidak bisa dimuat</b>Periksa koneksi lalu <a class="link" href="#/admin" onclick="location.reload()">muat ulang</a>.</div>'; });
  }
  function tutupAdmin() {
    if (!$('#adm').hidden) { $('#adm').hidden = true; $('#pub').hidden = false; document.body.classList.remove('is-admin'); window.Admin && window.Admin.unmount && window.Admin.unmount(); }
  }

  // ---------------------------------------------------------------- unduh & pratinjau
  function cari(id) { return S.konten.filter(function (k) { return k.id === id; })[0]; }
  function unduh(id) {
    const k = cari(id); if (!k) return;
    const u = safeUrl(k.u || k.e); if (!u) { toast('Tautan unduh belum tersedia.', 'err'); return; }
    const a = document.createElement('a'); a.href = u; a.target = '_blank'; a.rel = 'noopener'; a.download = ''; document.body.appendChild(a); a.click(); a.remove();
    S.cnt[id] = (S.cnt[id] || 0) + 1;
    $$('[data-cnt="' + id.replace(/"/g, '') + '"]').forEach(function (b) { b.textContent = S.cnt[id]; });
    toast('Unduhan dimulai: ' + k.j, 'ok');
    catatUnduh(id, true);
  }
  function catatUnduh(id, ulang) {
    if (!API.tok.user.get()) { return mulaiSesi().then(function () { return catatUnduh(id, false); }); }
    return API.call('log.unduh', { id_konten: id }).then(function (r) {
      if (r.success && r.data && r.data.n) { S.cnt[id] = r.data.n; $$('[data-cnt="' + id.replace(/"/g, '') + '"]').forEach(function (b) { b.textContent = r.data.n; }); }
      else if (r.code === 'AUTH' && ulang) return mulaiSesi().then(function () { return catatUnduh(id, false); });
    });
  }
  let sebelumFokus = null;
  function modal(html, wide, kunci) {
    sebelumFokus = document.activeElement;
    const o = document.createElement('div'); o.className = 'ov'; o.innerHTML = '<div class="modal' + (wide ? ' wide' : '') + '" role="dialog" aria-modal="true">' + html + '</div>';
    if (!kunci) o.addEventListener('mousedown', function (e) { if (e.target === o) tutup(); });
    $('#layer').appendChild(o); document.body.style.overflow = 'hidden'; return o;
  }
  function tutup() {
    $('#layer').innerHTML = ''; document.body.style.overflow = '';
    if (sebelumFokus && sebelumFokus.focus) try { sebelumFokus.focus(); } catch (e) { }
  }
  function lihat(id) {
    const k = cari(id); if (!k) return;
    const e = safeUrl(k.e) || safeUrl(k.u), th = safeUrl(k.th);
    const o = modal('<button class="modal-x" data-a="tutup" aria-label="Tutup"><span class="ms s20">close</span></button>' +
      '<div class="pv-top"><h3>' + esc(k.j) + '</h3><div class="meta"><span class="badge b-gold">' + esc(k.k) + '</span>' + (k.s ? '<span>' + esc(k.s) + '</span>' : '') + '<span>' + esc(tgl(k.t)) + '</span></div></div>' +
      '<div class="pv-frame" id="pvf">' + (e ? '<div class="sk" style="position:absolute;inset:0" id="pvsk"></div><iframe id="pvi" title="' + esc(k.j) + '" allow="autoplay; fullscreen" allowfullscreen referrerpolicy="no-referrer" src="' + esc(e) + '"></iframe>' : '') + '</div>' +
      '<div class="pv-foot"><button class="btn btn-gold" data-a="unduh2" data-id="' + esc(k.id) + '"><span class="ms s18">download</span>Unduh</button>' + (e ? '<a class="btn btn-soft" href="' + esc(e) + '" target="_blank" rel="noopener"><span class="ms s18">open_in_new</span>Buka di tab baru</a>' : '') + '</div>', true);
    if (!e) { $('#pvf', o).innerHTML = '<div class="pv-fail alert warn"><span class="ms s18">info</span>Pratinjau belum tersedia untuk materi ini. Silakan unduh.</div>'; return; }
    const f = $('#pvi', o); let ok = false;
    f.addEventListener('load', function () { ok = true; const sk = $('#pvsk', o); sk && sk.remove(); });
    setTimeout(function () { if (!ok && $('#pvf')) { const sk = $('#pvsk'); sk && sk.remove(); $('#pvf').insertAdjacentHTML('beforeend', '<div class="pv-fail alert warn"><span class="ms s18">info</span><span>Pratinjau lambat atau tidak bisa dimuat. Gunakan tombol <b>Buka di tab baru</b>.</span></div>'); } }, 9000);
  }

  // ---------------------------------------------------------------- pencarian cepat
  function cepat() {
    const o = document.createElement('div'); o.className = 'qs';
    o.innerHTML = '<div class="qs-box"><div class="qs-in"><div class="sfield"><span class="ms">search</span><input class="input" id="qi" placeholder="Cari materi…" autocomplete="off" style="padding-right:14px"></div></div><div class="qs-res" id="qr"></div></div>';
    o.addEventListener('mousedown', function (e) { if (e.target === o) o.remove(); });
    $('#layer').appendChild(o);
    const inp = $('#qi', o), res = $('#qr', o); let hl = -1, list = [];
    function draw() {
      const q = inp.value.trim().toLowerCase();
      list = (q ? urut(S.konten.filter(function (k) { return cocok(k, q); }), 'baru') : urut(S.konten, 'baru')).slice(0, 8);
      res.innerHTML = list.length ? list.map(function (k, i) {
        const v = KAT[k.k.toLowerCase()] || KAT.dokumen;
        return '<button class="qs-r' + (i === hl ? ' hl' : '') + '" data-i="' + i + '"><span class="ti"><span class="ms s20">' + v.ic + '</span></span><span style="min-width:0"><b style="display:block;font-size:14px">' + hi(k.j, q) + '</b><small style="color:var(--charcoal-sub)">' + esc(k.k + (k.s ? ' · ' + k.s : '')) + '</small></span></button>';
      }).join('') : '<div style="padding:22px;text-align:center;color:var(--charcoal-m)">Materi tidak ditemukan.</div>';
    }
    function pilih(i) { const k = list[i]; if (!k) return; o.remove(); lihat(k.id); }
    inp.addEventListener('input', function () { hl = -1; draw(); });
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') o.remove();
      else if (e.key === 'ArrowDown') { e.preventDefault(); hl = Math.min(list.length - 1, hl + 1); draw(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); hl = Math.max(0, hl - 1); draw(); }
      else if (e.key === 'Enter') pilih(hl < 0 ? 0 : hl);
    });
    res.addEventListener('click', function (e) { const b = e.target.closest('.qs-r'); if (b) pilih(+b.dataset.i); });
    draw(); inp.focus();
  }

  // ---------------------------------------------------------------- popup masuk (Mitra / Guest)
  function popupMasuk(opsi) {
    opsi = opsi || {};
    const tertutup = !S.me;                       // belum pernah masuk → tidak bisa ditutup
    const o = modal((tertutup ? '' : '<button class="modal-x" data-a="tutup" aria-label="Tutup"><span class="ms s20">close</span></button>') +
      '<div class="modal-b"><div class="login-logo"><img alt="SHAHIB Ibad Tour" src="' + esc(logo('terang')) + '"><span class="badge b-tint">' + esc(S.set.hero_badge || 'Portal Syiar & Mitra Resmi') + '</span><h2>Masukkan nama Anda</h2><p>Pilih nama Mitra/Agen untuk membuka materi promosi, atau masuk sebagai tamu.</p></div>' +
      '<div style="margin-top:18px"><label class="sr" for="mq">Cari nama, kode agen, atau domisili</label><div class="sfield"><span class="ms">search</span><input class="input" id="mq" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Ketik nama, kode agen, atau domisili…" role="combobox" aria-expanded="true" aria-controls="ml"><span class="cnt"><button class="clear-x" id="mq-x" style="position:static;transform:none" aria-label="Hapus" hidden><span class="ms s16">close</span></button><span class="badge b-gold" id="mc"></span></span></div>' +
      '<div class="tip"><span class="ms s16">info</span>Ketik sebagian nama — daftar menyempit seketika.</div><div class="mlist" id="ml" role="listbox"></div></div>' +
      '<div class="modal-f"><button class="btn btn-gold btn-block" id="mgo" disabled style="min-height:50px">Pilih nama terlebih dahulu</button><div class="or">ATAU</div><button class="btn btn-soft btn-block" data-a="guest"><span class="ms s18">visibility</span>Jelajahi sebagai Tamu (Guest)</button></div></div>', false, tertutup);
    const inp = $('#mq', o), ml = $('#ml', o), go = $('#mgo', o), cnt = $('#mc', o), x = $('#mq-x', o);
    let tampil = [], sel = -1, hl = -1;
    function filter() {
      const q = inp.value.trim().toLowerCase();
      if (!S.mitraMuat && !S.mitra.length) { ml.innerHTML = '<div style="padding:10px">' + [1, 2, 3, 4].map(function () { return '<div class="sk" style="height:48px;margin:6px 0"></div>'; }).join('') + '</div>'; cnt.textContent = '…'; return; }
      tampil = !q ? S.mitra.slice(0, 100) : S.mitra.filter(function (m) { return (m.n + ' ' + m.k + ' ' + m.d).toLowerCase().indexOf(q) > -1; })
        .sort(function (a, b) { return (b.n.toLowerCase().indexOf(q) === 0) - (a.n.toLowerCase().indexOf(q) === 0); }).slice(0, 100);
      cnt.textContent = (q ? tampil.length + ' ditemukan' : S.mitra.length + ' mitra');
      x.hidden = !q;
      if (sel >= 0 && !tampil.some(function (m) { return m.i === sel; })) sel = -1;
      hl = tampil.length ? Math.min(Math.max(hl, 0), tampil.length - 1) : -1;
      ml.innerHTML = tampil.length ? tampil.map(function (m, i) {
        return '<button class="mrow' + (m.i === sel ? ' sel' : '') + (i === hl ? ' hl' : '') + '" role="option" data-i="' + esc(m.i) + '"><span class="mav">' + esc(init2(m.n)) + '</span><span class="t"><b>' + hi(m.n, q) + '</b><small><span class="code">' + hi(m.k, q) + '</span>· ' + hi(m.d, q) + '</small></span><span class="radio">' + (m.i === sel ? '<span class="ms s14">check</span>' : '') + '</span></button>';
      }).join('') : '<div class="empty" style="border:0;padding:26px 16px"><span class="ms">person_search</span><b>Nama tidak ditemukan</b>Periksa ejaan atau masuk sebagai Guest.</div>';
      const m = S.mitra.filter(function (z) { return z.i === sel; })[0];
      go.disabled = !m; go.innerHTML = m ? 'Lanjutkan sebagai ' + esc(m.n) + '<span class="ms s18">arrow_forward</span>' : 'Pilih nama terlebih dahulu';
      const h = $('.mrow.hl', ml); if (h && h.scrollIntoView) h.scrollIntoView({ block: 'nearest' });
    }
    function lanjut() { const m = S.mitra.filter(function (z) { return z.i === sel; })[0]; if (m) { masukMitra(m); } }
    inp.addEventListener('input', function () { hl = 0; filter(); });
    x.addEventListener('click', function () { inp.value = ''; hl = 0; filter(); inp.focus(); });
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); hl = Math.min(tampil.length - 1, hl + 1); filter(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); hl = Math.max(0, hl - 1); filter(); }
      else if (e.key === 'Enter') { e.preventDefault(); if (hl >= 0 && tampil[hl]) { sel = tampil[hl].i; lanjut(); } }
      else if (e.key === 'Escape' && !tertutup) tutup();
    });
    ml.addEventListener('click', function (e) { const b = e.target.closest('.mrow'); if (b) { sel = b.dataset.i; hl = tampil.findIndex(function (m) { return m.i === sel; }); filter(); } });
    go.addEventListener('click', lanjut);
    filter();
    if (S.me && S.me.jenis === 'Mitra') { sel = S.me.id; }
    if (!S.mitraMuat) {
      muatPub().then(function (r) {
        if (!$('#mq')) return;
        if (r && r.success) filter();
        else ml.innerHTML = '<div class="empty" style="border:0"><span class="ms">wifi_off</span><b>Daftar belum bisa dimuat</b>' + esc((r && r.message) || '') + '<div style="margin-top:12px"><button class="btn btn-ghost btn-sm" data-a="muatulang">Coba lagi</button></div></div>';
      });
    }
    setTimeout(function () { inp.focus(); }, 30);
  }
  function masukMitra(m) {
    S.me = { jenis: 'Mitra', id: m.i, nama: m.n, kode: m.k, dom: m.d }; ls.set('shahib.id', S.me); API.tok.user.set('');
    tutup(); chrome(); renderAll(); window.scrollTo(0, 0);
    mulaiSesi({ paksa: true }).then(function (r) {
      if (!r.success) { toast(r.message || 'Gagal masuk. Coba lagi.', 'err'); if (r.code === 'NOTFOUND') { S.mitra = S.mitra.filter(function (z) { return z.i !== m.i; }); } S.me = null; ls.set('shahib.id', null); chrome(); popupMasuk(); }
    });
  }
  function masukGuest() {
    S.me = { jenis: 'Guest', id: 'GUEST', nama: 'Guest', kode: '-', dom: '-' }; ls.set('shahib.id', S.me); API.tok.user.set('');
    tutup(); chrome(); renderAll(); window.scrollTo(0, 0);
    mulaiSesi({ paksa: true }).then(function (r) { if (!r.success) { toast(r.message || 'Gagal masuk sebagai Guest.', 'err'); S.me = null; ls.set('shahib.id', null); chrome(); popupMasuk(); } });
  }

  // ---------------------------------------------------------------- menu samping (ponsel)
  function drawer() {
    const o = document.createElement('div'); o.className = 'drawer';
    const L = [['beranda', 'home', 'Beranda'], ['dokumen', 'folder_shared', 'Dokumen'], ['video', 'smart_display', 'Video'], ['gambar', 'photo_library', 'Gambar'], ['tentang', 'info', 'Tentang Kami'], ['kontak', 'support_agent', 'Kontak']];
    o.innerHTML = '<div class="drawer-in"><img alt="" src="' + esc(logo('terang')) + '" style="height:40px;width:auto;max-width:180px;object-fit:contain;margin:4px 0 12px 8px">' + L.map(function (l) { return '<a href="#/' + l[0] + '" class="' + (rute() === l[0] ? 'on' : '') + '"><span class="ms">' + l[1] + '</span>' + l[2] + '</a>'; }).join('') + '</div>';
    o.addEventListener('click', function (e) { if (e.target === o || e.target.closest('a')) o.remove(); });
    $('#layer').appendChild(o);
  }

  // ---------------------------------------------------------------- event
  document.addEventListener('click', function (e) {
    const t = e.target.closest('[data-a],[data-scroll],#btn-menu,#btn-search,#btn-portal,#me-chip,#hq-x,.chip');
    if (!t) return;
    if (t.dataset.scroll) { e.preventDefault(); const z = document.getElementById(t.dataset.scroll); z && z.scrollIntoView({ behavior: 'smooth' }); return; }
    if (t.id === 'btn-menu') return drawer();
    if (t.id === 'btn-search') return cepat();
    if (t.id === 'btn-portal' || t.id === 'me-chip') return popupMasuk();
    if (t.id === 'hq-x') { S.view.hq = ''; $('#hq').value = ''; hbody(); return; }
    if (t.classList.contains('chip')) {
      if (t.parentNode.id === 'hchips') { S.view.hc = t.dataset.c; hbody(); }
      else if (t.parentNode.id === 'ksub') { const k = rute(); S.view[k].sub = t.dataset.s; S.view[k].n = HAL; katList(k); }
      return;
    }
    const a = t.dataset.a, card = t.closest('[data-id]'), id = card ? card.dataset.id : t.dataset.id;
    if (a === 'lihat') lihat(id);
    else if (a === 'unduh') unduh(id);
    else if (a === 'unduh2') unduh(id);
    else if (a === 'tutup') tutup();
    else if (a === 'guest') masukGuest();
    else if (a === 'ganti') popupMasuk();
    else if (a === 'lagi') { S.view[t.dataset.k].n += HAL; katList(t.dataset.k); }
    else if (a === 'muatulang') { S.mitraMuat = false; tutup(); popupMasuk(); }
  });
  document.addEventListener('input', debounce(function (e) {
    if (e.target.id === 'hq') { S.view.hq = e.target.value; hbody(); }
    else if (e.target.id === 'kq') { const k = rute(); S.view[k].q = e.target.value; S.view[k].n = HAL; katList(k); }
  }, 90));
  document.addEventListener('change', function (e) { if (e.target.id === 'ko') { const k = rute(); S.view[k].o = e.target.value; katList(k); } });
  document.addEventListener('submit', function (e) { if (e.target.id === 'kform') kirimKontak(e); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { const o = $('#layer .qs, #layer .drawer'); if (o) o.remove(); else if (S.me && $('#layer .modal')) tutup(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && !document.body.classList.contains('is-admin')) { e.preventDefault(); cepat(); }
  });
  window.addEventListener('hashchange', function () { renderRoute(false); });
  window.addEventListener('shahib:auth', function (e) {
    if (e.detail.realm === 'user' && S.me) mulaiSesi();
  });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && S.me && !document.body.classList.contains('is-admin')) segarkan(false); });
  window.addEventListener('online', function () { if (S.me) segarkan(true); });

  // ---------------------------------------------------------------- mulai
  function selesaiSplash() { const sp = $('#splash'); if (sp) { sp.classList.add('out'); setTimeout(function () { sp.remove(); }, 300); } }
  function start() {
    // 1) tampilkan apa yang sudah ada di perangkat — tanpa menunggu jaringan
    const pub = ls.get('shahib.pub'), boot = ls.get('shahib.boot'), id = ls.get('shahib.id');
    if (pub) { S.mitra = pub.mitra || []; S.mitraMuat = !!pub.mitra; S.set = pub.set || {}; }
    if (boot) { S.konten = boot.konten || []; S.sub = boot.sub || []; S.cnt = boot.cnt || {}; S.set = boot.set || S.set; S.bootAt = boot.at || 0; S.sig = sigOf(boot); }
    if (id && id.nama) S.me = id;
    if (!S.set.tagline) S.set = Object.assign({}, S.set, DEF);
    brand(); chrome(); renderRoute(true); selesaiSplash();

    if (API.belum) { toast('URL backend belum diisi di js/config.js.', 'err'); if (!S.me) popupMasuk(); S.ready = true; return; }
    API.warm('pub');

    // 2) sinkron di latar belakang
    if (/^admin/.test(rute())) { S.ready = true; return; }
    if (S.me) {
      const baruTab = !ss.get('shahib.ses');
      (baruTab || !API.tok.user.get() ? mulaiSesi({ paksa: true }) : segarkan(true)).then(function (r) {
        S.ready = true;
        if (r && r.success === false && r.code !== 'NET') { S.me = null; ls.set('shahib.id', null); chrome(); popupMasuk(); }
        else renderAll();
      });
      setTimeout(muatPub, 1500);          // daftar Mitra disiapkan di latar untuk "Ganti"
    } else {
      popupMasuk();
      muatPub().then(function () { S.ready = true; });
    }
    // admin diunduh saat browser menganggur
    (window.requestIdleCallback || function (f) { setTimeout(f, 4000); })(function () { muatAdmin().catch(function () { }); });
  }
  const DEF = { hero_badge: 'Portal Syiar & Mitra Resmi', tagline: 'Perjalanan Penuh Cinta', hero_judul_mitra: 'Selamat datang, {nama}!', hero_sub_mitra: 'Mitra SHAHIB Ibad Tour · Kode Agen {kode} · {domisili}', hero_intro_mitra: 'Akses cepat materi promosi resmi, brosur, video manasik & flyer digital dalam satu ketukan.', hero_judul_guest: 'Selamat datang di SHAHIB Ibad Tour', hero_intro_guest: 'Pusat materi promosi, brosur resmi, video reels & flyer digital Ibad Tour. Silakan jelajahi dan unduh.', about_judul: 'Menghubungkan Hati Menuju Baitullah', about_isi: '', ppiu_no: '', pihk_info: '', kontak_email: '', kontak_web: '', kontak_telp: '', kontak_wa: '', kontak_alamat: '', jam_operasional: '', maps_url: '', maps_query: '', koordinat: '', opt_watermark: '1', opt_gradien: '1' };

  // API publik untuk panel admin
  window.App = { esc: esc, toast: toast, tgl: tgl, init2: init2, S: S, logo: logo, ls: ls, KAT: KAT, brand: brand, modal: modal, tutup: tutup, debounce: debounce, safeUrl: safeUrl,
    setSet: function (set) { S.set = set; brand(); }, invalidate: function () { S.bootAt = 0; } };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
