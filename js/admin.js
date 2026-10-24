/* ============================================================
   Panel Superadmin SHAHIB — dimuat saat #/admin dibuka
   Pola kecepatan: SWR cache per aksi · bacaan digabung 1 batch · tulis optimistis bila aman
   Semua pemeriksaan hak akses tetap di server (Kode.gs); UI ini hanya antarmuka.
   ============================================================ */
(function () {
  'use strict';
  let App, root, esc, seq = 0, rt = '', cache = {}, me = null, ui = {};
  const $ = function (s, r) { return (r || document).querySelector(s); };
  const $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  const TTL = 30000;
  const NAV = [['dashboard', 'space_dashboard', 'Dashboard'], ['konten', 'perm_media', 'Kelola Konten'], ['sub', 'account_tree', 'Sub-Kategori'], ['mitra', 'group', 'Kelola Mitra'], ['laporan', 'analytics', 'Riwayat & Laporan'], ['pesan', 'mail', 'Pesan Masuk'], ['pengaturan', 'tune', 'Pengaturan Tampilan'], ['keamanan', 'shield_lock', 'Keamanan'], ['migrasi', 'move_up', 'Migrasi Data']];
  const KATS = ['Dokumen', 'Video', 'Gambar'];
  const KICON = { Dokumen: 'description', Video: 'movie', Gambar: 'image' };

  // ------------------------------------------------------------ util
  const nf = function (n) { return Number(n || 0).toLocaleString('id-ID'); };
  function dt(ms) { const d = new Date(ms); return isNaN(d) ? '' : d.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(/\./g, ':'); }
  function rel(ms) {
    if (!ms) return 'Belum pernah'; const s = (Date.now() - ms) / 1000;
    if (s < 90) return 'Baru saja'; if (s < 3600) return Math.round(s / 60) + ' menit lalu'; if (s < 86400) return Math.round(s / 3600) + ' jam lalu';
    if (s < 86400 * 30) return Math.round(s / 86400) + ' hari lalu'; return dt(ms);
  }
  function csvCell(v) { v = String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; }
  function simpanFile(nama, teks, mime) { const b = new Blob(['﻿' + teks], { type: mime || 'text/csv;charset=utf-8' }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = nama; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000); }
  function b64(blob) {
    return blob.arrayBuffer().then(function (buf) {
      const u = new Uint8Array(buf); let s = '';
      for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
      return btoa(s);
    });
  }
  function busy(btn, on, teks) { if (!btn) return; btn.classList.toggle('is-busy', !!on); if (teks != null) { if (on) { btn._h = btn.innerHTML; btn.innerHTML = '<span class="ms s18 spin">progress_activity</span>' + teks; } else if (btn._h) { btn.innerHTML = btn._h; } } }
  function err(r, fb) { return (r && r.message) || fb || 'Terjadi kesalahan.'; }

  // ------------------------------------------------------------ cache baca
  function key(a, d) { return a + '|' + JSON.stringify(d || {}); }
  function get(action, data, cb, fresh) {
    const k = key(action, data), c = cache[k], my = seq;
    if (c && !fresh) cb(c.r, true);
    if (c && !fresh && Date.now() - c.t < TTL) return Promise.resolve(c.r);
    const dd = fresh ? Object.assign({ _fresh: true }, data || {}) : data;
    return API.q(action, dd).then(function (r) {
      if (r.success) { const same = c && JSON.stringify(c.r.data) === JSON.stringify(r.data); cache[k] = { r: r, t: Date.now() }; if (my === seq && !same) cb(r, false); else if (my === seq && !c) cb(r, false); }
      else if (my === seq && r.code !== 'AUTH') cb(r, false);
      return r;
    });
  }
  function inval(prefix) { Object.keys(cache).forEach(function (k) { if (!prefix || k.indexOf(prefix) === 0) delete cache[k]; }); }
  function tulis(action, data, btn, teks) {
    busy(btn, true, teks);
    return API.call(action, data).then(function (r) { busy(btn, false); if (!r.success && r.code !== 'AUTH') App.toast(err(r), 'err'); return r; });
  }

  // ------------------------------------------------------------ dialog
  function dlg(html, o) {
    o = o || {};
    const ov = document.createElement('div'); ov.className = 'ov'; ov.style.zIndex = o.z || 110;
    ov.innerHTML = '<div class="modal' + (o.wide ? ' wide' : '') + '" role="dialog" aria-modal="true"><button class="modal-x" data-x="x" aria-label="Tutup"><span class="ms s20">close</span></button>' + html + '</div>';
    ov.close = function () { ov.remove(); if (!$('#layer .ov')) document.body.style.overflow = ''; };
    ov.addEventListener('click', function (e) { const t = e.target.closest('[data-x="x"]'); if (t || (e.target === ov && !o.kunci)) ov.close(); });
    $('#layer').appendChild(ov); document.body.style.overflow = 'hidden';
    return ov;
  }
  function konfirm(judul, isi, oke, bahaya) {
    return new Promise(function (res) {
      const o = dlg('<div class="modal-b"><h3 style="font-size:18px;font-weight:800;padding-right:34px">' + esc(judul) + '</h3><p style="color:var(--charcoal-m);margin-top:8px">' + isi + '</p><div class="modal-f" style="flex-direction:row;justify-content:flex-end"><button class="btn btn-soft" data-x="x">Batal</button><button class="btn ' + (bahaya ? 'btn-danger' : 'btn-gold') + '" data-x="ok">' + esc(oke || 'Ya, lanjutkan') + '</button></div></div>', { z: 130 });
      let done = false;
      o.addEventListener('click', function (e) { const t = e.target.closest('[data-x]'); if (!t) return; done = true; res(t.dataset.x === 'ok'); o.close(); });
      new MutationObserver(function (m, ob) { if (!document.body.contains(o)) { ob.disconnect(); if (!done) res(false); } }).observe($('#layer'), { childList: true });
    });
  }
  function kosong(ic, judul, ket) { return '<div class="empty"><span class="ms">' + ic + '</span><b>' + esc(judul) + '</b>' + esc(ket || '') + '</div>'; }
  function skel() { return '<div class="skg"><div class="sk" style="height:96px"></div><div class="sk" style="height:260px"></div><div class="sk" style="height:180px"></div></div>'; }
  function head(judul, ket, acts) { return '<div class="ad-h"><div><h2>' + esc(judul) + '</h2>' + (ket ? '<p>' + esc(ket) + '</p>' : '') + '</div>' + (acts ? '<div class="acts">' + acts + '</div>' : '') + '</div>'; }
  function pager(total, page, size, id) {
    const n = Math.max(1, Math.ceil(total / size)); if (total <= size) return '<div class="pg"><span>Menampilkan ' + total + ' data</span></div>';
    let b = '<button data-pg="' + (page - 1) + '" ' + (page <= 1 ? 'disabled' : '') + ' aria-label="Sebelumnya"><span class="ms s18">chevron_left</span></button>';
    const s = Math.max(1, Math.min(page - 2, n - 4)), e = Math.min(n, s + 4);
    for (let i = s; i <= e; i++) b += '<button data-pg="' + i + '" class="' + (i === page ? 'on' : '') + '">' + i + '</button>';
    b += '<button data-pg="' + (page + 1) + '" ' + (page >= n ? 'disabled' : '') + ' aria-label="Berikutnya"><span class="ms s18">chevron_right</span></button>';
    return '<div class="pg" id="' + id + '"><span>' + ((page - 1) * size + 1) + '–' + Math.min(total, page * size) + ' dari ' + nf(total) + '</span><div class="b">' + b + '</div></div>';
  }
  function bind(el, ev, sel, fn) { el.addEventListener(ev, function (e) { const t = e.target.closest(sel); if (t && el.contains(t)) fn(t, e); }); }

  // ------------------------------------------------------------ login
  function loginView(pesan) {
    root.innerHTML = '<div class="login-ad"><div class="glow"></div><div class="box"><div class="login-logo"><img alt="SHAHIB Ibad Tour" src="' + esc(App.logo('terang')) + '"><span class="badge b-tint"><span class="ms s14">lock</span>Area Superadmin</span><h2>Masuk Admin</h2><p>Masuk dengan akun Google yang terdaftar sebagai admin.</p></div>' +
      (pesan ? '<div class="alert warn" style="margin-top:14px"><span class="ms s18">info</span><span>' + esc(pesan) + '</span></div>' : '') +
      '<div style="display:flex;justify-content:center;margin-top:18px;min-height:44px" id="gbtn"><div class="sk" style="width:260px;height:44px;border-radius:999px"></div></div><div id="lmsg" aria-live="polite"></div>' +
      '<details class="det" style="margin-top:14px"><summary><span class="ms s18">key</span>Masuk dengan akses darurat</summary><form id="fdar" class="stack" style="gap:10px;margin-top:6px"><div class="field"><label for="du">Nama pengguna</label><input class="input" id="du" autocomplete="username" required></div><div class="field"><label for="dp">Kata sandi</label><input class="input" id="dp" type="password" autocomplete="current-password" required></div><button class="btn btn-dark btn-block" type="submit"><span class="ms s18">login</span>Masuk</button></form></details>' +
      '<a class="link" href="#/beranda" style="margin-top:16px;justify-content:center;display:flex"><span class="ms s16">arrow_back</span>Kembali ke portal</a></div></div>';
    $('#fdar').addEventListener('submit', function (e) {
      e.preventDefault(); const b = $('#fdar button');
      tulis('auth.darurat', { username: $('#du').value.trim(), password: $('#dp').value }, b, 'Memeriksa…').then(function (r) { $('#dp').value = ''; if (r.success) berhasilLogin(r.data); else $('#lmsg').innerHTML = '<div class="alert err" style="margin-top:12px"><span class="ms s18">error</span>' + esc(err(r)) + '</div>'; });
    });
    API.call('auth.config').then(function (r) {
      const id = r.success && r.data.googleClientId, g = $('#gbtn'); if (!g) return;
      if (!id) { g.innerHTML = '<div class="alert warn"><span class="ms s18">info</span><span>Google Client ID belum diisi. Masuk dengan akses darurat, lalu isi di menu <b>Keamanan</b>.</span></div>'; return; }
      const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
      s.onload = function () {
        window.google.accounts.id.initialize({ client_id: id, callback: function (resp) {
          $('#lmsg').innerHTML = '<div class="alert" style="margin-top:12px"><span class="ms s18 spin">progress_activity</span>Memverifikasi akun…</div>';
          API.call('auth.google', { idToken: resp.credential }).then(function (x) { if (x.success) berhasilLogin(x.data); else $('#lmsg').innerHTML = '<div class="alert err" style="margin-top:12px"><span class="ms s18">error</span>' + esc(err(x)) + '</div>'; });
        } });
        g.innerHTML = ''; window.google.accounts.id.renderButton(g, { theme: 'outline', size: 'large', shape: 'pill', width: 280, text: 'signin_with', locale: 'id' });
      };
      s.onerror = function () { g.innerHTML = '<div class="alert err">Tidak bisa memuat Google Sign-In. Gunakan akses darurat.</div>'; };
      document.head.appendChild(s);
    });
  }
  function berhasilLogin(d) {
    API.tok.admin.set(d.token); me = d.me; try { sessionStorage.setItem('shahib.adm.me', JSON.stringify(me)); } catch (e) { }
    cache = {}; rt = ''; mount(root, location.hash.replace(/^#\/?/, '') || 'admin', App);
  }
  function keluar() {
    API.tok.admin.set(''); try { sessionStorage.removeItem('shahib.adm.me'); } catch (e) { } cache = {}; me = null; rt = '';
    location.hash = '#/beranda';
  }

  // ------------------------------------------------------------ shell
  function shell() {
    const nm = me && me.nama ? me.nama : 'Admin';
    root.innerHTML = '<div class="ad"><div class="ad-scrim" id="scrim" hidden></div><aside class="ad-side" id="side"><div class="ad-brand"><img alt="" src="' + esc(App.logo('gelap')) + '"><div><b>SHAHIB IBAD</b><span>Portal Mitra &amp; Admin</span></div></div><div class="ad-lbl">Menu Utama</div><nav class="ad-nav" id="adnav">' +
      NAV.map(function (n) { return '<a href="#/admin/' + n[0] + '" data-n="' + n[0] + '"><span class="ms s20">' + n[1] + '</span>' + n[2] + (n[0] === 'pesan' ? '<span class="bdg" id="bdg-pesan" hidden></span>' : '') + '</a>'; }).join('') + '</nav>' +
      '<div class="ad-foot"><a href="#/beranda"><span class="ms s20">open_in_new</span>Lihat Landing Page</a><button class="out" data-x="logout"><span class="ms s20">logout</span>Keluar (Logout)</button></div></aside>' +
      '<div class="ad-main"><header class="ad-top"><button class="icon-btn ad-menu" data-x="menu" aria-label="Menu"><span class="ms s24">menu</span></button><h1 id="adtitle">Dashboard</h1><span class="ad-sync" id="adsync"></span><button class="icon-btn" data-x="segarkan" aria-label="Segarkan data" title="Segarkan data"><span class="ms s22">refresh</span></button><div class="ad-user"><span class="me-av">' + esc(App.init2(nm)) + '</span><span>' + esc(nm.split(' ')[0]) + '<small>Super Administrator</small></span></div></header><main class="ad-view" id="adview"></main></div></div>';
    bind(root, 'click', '[data-x]', function (t) {
      const x = t.dataset.x;
      if (x === 'logout') keluar();
      else if (x === 'menu') { $('#side').classList.toggle('open'); $('#scrim').hidden = !$('#side').classList.contains('open'); }
      else if (x === 'segarkan') { ui.fresh = true; show(true); }
    });
    $('#scrim').addEventListener('click', function () { $('#side').classList.remove('open'); $('#scrim').hidden = true; });
  }
  const VIEWS = {};
  function show(fresh) {
    const r = (rt.split('/')[1] || 'dashboard'), v = VIEWS[r] ? r : 'dashboard'; seq++;
    $$('#adnav a').forEach(function (a) { a.classList.toggle('on', a.dataset.n === v); });
    const nav = NAV.filter(function (n) { return n[0] === v; })[0]; $('#adtitle').textContent = nav ? nav[2] : 'Dashboard';
    $('#side').classList.remove('open'); $('#scrim').hidden = true;
    const el = $('#adview'); el.dataset.v = v;
    VIEWS[v](el, !!fresh); window.scrollTo(0, 0);
  }
  function prefetch() {
    // semua bacaan inti dalam satu tik → penggabung batch menjadikannya 1 eksekusi server
    ['laporan.ringkasan', 'konten.admin.list', 'mitra.admin.list', 'sub.list', 'pengaturan.get', 'pesan.list'].forEach(function (a) {
      const d = {}, k = key(a, d); if (cache[k]) return;
      API.q(a, d).then(function (r) { if (r.success) { cache[k] = { r: r, t: Date.now() }; if (a === 'pesan.list') badgePesan(r.data.pesan); } });
    });
  }
  function badgePesan(p) { const n = (p || []).filter(function (x) { return !x.b; }).length, b = $('#bdg-pesan'); if (b) { b.hidden = !n; b.textContent = n; } }

  // ------------------------------------------------------------ DASHBOARD
  function chartTren(tren) {
    const W = 640, H = 220, L = 34, B = 24, T = 10, R = 8, iw = W - L - R, ih = H - T - B;
    let mx = 1; tren.forEach(function (x) { mx = Math.max(mx, x.a, x.u); });
    const step = mx <= 5 ? 1 : Math.pow(10, Math.floor(Math.log10(mx / 4))) * (mx / 4 / Math.pow(10, Math.floor(Math.log10(mx / 4))) > 5 ? 5 : mx / 4 / Math.pow(10, Math.floor(Math.log10(mx / 4))) > 2 ? 2 : 1);
    const top = Math.ceil(mx / step) * step || 1, X = function (i) { return L + (tren.length < 2 ? 0 : i * iw / (tren.length - 1)); }, Y = function (v) { return T + ih - (v / top) * ih; };
    const line = function (k) { return tren.map(function (x, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(x[k]).toFixed(1); }).join(' '); };
    let g = '';
    for (let v = 0; v <= top; v += step) g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="#EBEBEB" stroke-dasharray="3 4"/><text x="' + (L - 6) + '" y="' + (Y(v) + 3) + '" text-anchor="end">' + v + '</text>';
    tren.forEach(function (x, i) { if (i % 6 === 0 || i === tren.length - 1) g += '<text x="' + X(i) + '" y="' + (H - 6) + '" text-anchor="middle">' + x.t.slice(8, 10) + '/' + x.t.slice(5, 7) + '</text>'; });
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Tren akses dan unduhan 30 hari terakhir">' + g +
      '<path d="' + line('a') + ' L' + X(tren.length - 1) + ' ' + Y(0) + ' L' + X(0) + ' ' + Y(0) + 'Z" fill="#CBAB2A" opacity=".12"/>' +
      '<path d="' + line('a') + '" fill="none" stroke="#282828" stroke-width="2.2" stroke-linejoin="round"/><path d="' + line('u') + '" fill="none" stroke="#CBAB2A" stroke-width="2.6" stroke-linejoin="round"/></svg>';
  }
  VIEWS.dashboard = function (el, fresh) {
    const jenis = ui.dj || '';
    el.innerHTML = head('Ringkasan Eksekutif & Manajemen Portal', 'Pantau keaktifan Mitra dan distribusi materi promosi Ibad Tour.',
      '<button class="btn btn-gold" data-x="tmitra"><span class="ms s18">person_add</span>Tambah Mitra</button><button class="btn btn-dark" data-x="tkonten"><span class="ms s18">add</span>Tambah Konten</button>') + '<div id="dsh">' + skel() + '</div>';
    get('laporan.ringkasan', jenis ? { jenis: jenis } : {}, function (r) {
      if (!r.success) { $('#dsh').innerHTML = '<div class="alert err"><span class="ms s18">error</span>' + esc(err(r)) + '</div>'; return; }
      const d = r.data, mx = d.topFile.length ? d.topFile[0].n : 1;
      $('#dsh').innerHTML =
        '<div class="ad-grid4"><div class="stat"><div class="t"><span>Total Mitra Terdaftar</span><span class="ic"><span class="ms s20">groups</span></span></div><div class="v">' + nf(d.mitra.total) + ' <small>Mitra</small></div><div class="s">Aktif ' + nf(d.mitra.aktif) + ' · Nonaktif ' + nf(d.mitra.nonaktif) + '</div></div>' +
        '<div class="stat"><div class="t"><span>Akses Hari Ini</span><span class="ic"><span class="ms s20">login</span></span></div><div class="v">' + nf(d.hariIni.akses) + ' <small>Kunjungan</small></div><div class="s">Guest total: ' + nf(d.guest.akses) + ' akses</div></div>' +
        '<div class="stat"><div class="t"><span>Unduhan Hari Ini</span><span class="ic"><span class="ms s20">cloud_download</span></span></div><div class="v">' + nf(d.hariIni.unduh) + ' <small>Berkas</small></div><div class="s">Guest total: ' + nf(d.guest.unduh) + ' unduhan</div></div>' +
        '<div class="stat"><div class="t"><span>Total Materi Aktif</span><span class="ic"><span class="ms s20">folder_special</span></span></div><div class="v">' + nf(d.file.aktif) + ' <small>File</small></div><div class="s">Dok ' + (d.file.per.Dokumen || 0) + ' · Vid ' + (d.file.per.Video || 0) + ' · Gbr ' + (d.file.per.Gambar || 0) + (d.file.arsip ? ' · Arsip ' + d.file.arsip : '') + '</div></div></div>' +
        '<div class="ad-two"><div class="card-p"><div class="card-h"><div><h3>Tren Akses &amp; Unduhan</h3><div class="sub">30 hari terakhir</div></div><div class="seg" id="djs">' + [['', 'Semua'], ['Mitra', 'Mitra'], ['Guest', 'Guest']].map(function (j) { return '<button data-j="' + j[0] + '" class="' + (jenis === j[0] ? 'on' : '') + '">' + j[1] + '</button>'; }).join('') + '</div></div>' +
        '<div class="legend"><span><i style="background:#282828"></i>Akses</span><span><i style="background:#CBAB2A"></i>Unduhan</span></div>' + chartTren(d.tren) + '</div>' +
        '<div class="card-p"><div class="card-h"><div><h3>10 File Paling Sering Diunduh</h3><div class="sub">Sepanjang waktu</div></div></div>' +
        (d.topFile.length ? d.topFile.map(function (f, i) { return '<div class="bar-row"><span class="r">' + String(i + 1).padStart(2, '0') + '</span><span class="nm"><b>' + esc(f.j) + '</b><div class="bar"><i style="width:' + Math.max(4, f.n / mx * 100) + '%"></i></div></span><span class="n">' + nf(f.n) + '×</span></div>'; }).join('') : kosong('cloud_download', 'Belum ada unduhan', '')) + '</div></div>' +
        '<div class="ad-two" style="grid-template-columns:1fr"><div class="card-p"><div class="card-h"><div><h3>Mitra Paling Aktif</h3><div class="sub">Akses + unduhan</div></div></div><div class="tbl-w"><table class="tbl"><thead><tr><th>Mitra</th><th>Kode</th><th>Domisili</th><th>Akses</th><th>Unduhan</th></tr></thead><tbody>' +
        (d.topMitra.map(function (m) { return '<tr><td><b>' + esc(m.n) + '</b></td><td><span class="code">' + esc(m.k) + '</span></td><td>' + esc(m.d) + '</td><td>' + m.a + '</td><td>' + m.u + '</td></tr>'; }).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--charcoal-sub)">Belum ada aktivitas Mitra</td></tr>') + '</tbody></table></div></div>' +
        '<div class="ad-two" style="margin-top:0"><div class="card-p"><div class="card-h"><div><h3>Ringkasan per Domisili</h3><div class="sub">Akses &amp; unduhan menurut kota/kabupaten Mitra</div></div></div><div class="tbl-w"><table class="tbl"><thead><tr><th>Domisili</th><th>Akses</th><th>Unduhan</th></tr></thead><tbody>' + (d.domisili.slice(0, 12).map(function (x) { return '<tr><td>' + esc(x.d) + '</td><td>' + x.a + '</td><td>' + x.u + '</td></tr>'; }).join('') || '<tr><td colspan="3" style="text-align:center;color:var(--charcoal-sub)">Belum ada data</td></tr>') + '</tbody></table></div></div>' +
        '<div class="card-p"><div class="card-h"><div><h3>Mitra Tidak Aktif</h3><div class="sub">Belum mengakses dalam 30 hari</div></div><span class="badge ' + (d.tidakAktif.n ? 'b-warn' : 'b-ok') + '">' + d.tidakAktif.n + ' Mitra</span></div>' +
        (d.tidakAktif.daftar.length ? d.tidakAktif.daftar.slice(0, 8).map(function (m) { return '<div class="bar-row" style="grid-template-columns:1fr auto"><span class="nm"><b>' + esc(m.n) + '</b><small style="color:var(--charcoal-sub)">' + esc(m.d) + '</small></span><span class="code">' + esc(m.k) + '</span></div>'; }).join('') + (d.tidakAktif.n > 8 ? '<div class="sub" style="margin-top:6px">+ ' + (d.tidakAktif.n - 8) + ' lainnya</div>' : '') : kosong('verified', 'Semua Mitra aktif', '')) + '</div></div></div>';
      if (d.pesanBaru !== undefined) { const b = $('#bdg-pesan'); if (b) { b.hidden = !d.pesanBaru; b.textContent = d.pesanBaru; } }
      $('#adsync').innerHTML = '<span class="ms s14">schedule</span>' + rel(d.waktu);
    }, fresh);
  };

  // ------------------------------------------------------------ KONTEN
  const K = { q: '', kat: '', src: '', st: '', page: 1, sel: {}, size: 12 };
  VIEWS.konten = function (el, fresh) {
    el.innerHTML = head('Kelola & Distribusi Materi Promosi', 'Tempel tautan OneDrive atau unggah berkas langsung ke Google Drive, atur kategori, dan pantau unduhan.', '<button class="btn btn-gold" data-x="tkonten"><span class="ms s18">add_circle</span>Tambah Materi Baru</button>') + '<div id="kon">' + skel() + '</div>';
    get('konten.admin.list', {}, function (r) {
      if (!r.success) { $('#kon').innerHTML = '<div class="alert err">' + esc(err(r)) + '</div>'; return; }
      ui.konten = r.data.konten; ui.sub = r.data.sub; renderKonten();
    }, fresh);
  };
  function kFilter() {
    const q = K.q.trim().toLowerCase();
    return (ui.konten || []).filter(function (k) { return (!K.kat || k.k === K.kat) && (!K.src || k.src === K.src) && (!K.st || k.st === K.st) && (!q || (k.j + ' ' + k.s + ' ' + k.tg + ' ' + k.id).toLowerCase().indexOf(q) > -1); });
  }
  function renderKonten() {
    const el = $('#kon'); if (!el) return; const all = ui.konten || [], list = kFilter(), n = Object.keys(K.sel).length;
    const tot = { a: all.filter(function (k) { return k.st === 'aktif'; }).length, o: all.filter(function (k) { return k.src === 'onedrive'; }).length, d: all.filter(function (k) { return k.src === 'drive'; }).length };
    const pg = Math.min(K.page, Math.max(1, Math.ceil(list.length / K.size))); K.page = pg;
    const rows = list.slice((pg - 1) * K.size, pg * K.size);
    const keep = document.activeElement && document.activeElement.id === 'kq' ? document.activeElement.selectionStart : null;
    el.innerHTML =
      '<div class="ad-grid4" style="margin-bottom:16px"><div class="stat"><div class="t"><span>Total Berkas Aktif</span><span class="ic"><span class="ms s20">folder_special</span></span></div><div class="v">' + tot.a + '</div></div><div class="stat"><div class="t"><span>Tautan OneDrive</span><span class="ic"><span class="ms s20">cloud</span></span></div><div class="v">' + tot.o + '</div></div><div class="stat"><div class="t"><span>Google Drive</span><span class="ic"><span class="ms s20">add_to_drive</span></span></div><div class="v">' + tot.d + '</div></div><div class="stat"><div class="t"><span>Diarsipkan</span><span class="ic"><span class="ms s20">inventory_2</span></span></div><div class="v">' + (all.length - tot.a) + '</div></div></div>' +
      '<div class="card-p"><div class="filters"><div class="f-q"><span class="ms">search</span><input class="input" id="kq" placeholder="Cari judul, sub-kategori, tag…" value="' + esc(K.q) + '"></div>' +
      '<select class="select" id="kk"><option value="">Semua Kategori</option>' + KATS.map(function (k) { return '<option' + (K.kat === k ? ' selected' : '') + '>' + k + '</option>'; }).join('') + '</select>' +
      '<select class="select" id="ks"><option value="">Semua Sumber</option><option value="onedrive"' + (K.src === 'onedrive' ? ' selected' : '') + '>OneDrive</option><option value="drive"' + (K.src === 'drive' ? ' selected' : '') + '>Google Drive</option></select>' +
      '<select class="select" id="kt"><option value="">Semua Status</option><option value="aktif"' + (K.st === 'aktif' ? ' selected' : '') + '>Aktif</option><option value="arsip"' + (K.st === 'arsip' ? ' selected' : '') + '>Arsip</option></select>' +
      '<button class="btn btn-soft btn-sm" data-x="kreset"><span class="ms s16">filter_alt_off</span>Reset</button></div>' +
      (n ? '<div class="bulk"><span class="badge">' + n + '</span><span>materi dipilih</span><span class="sp"></span><button class="btn btn-sm" data-x="kbulk" data-b="sub"><span class="ms s16">account_tree</span>Ubah Sub-Kategori</button><button class="btn btn-sm" data-x="kbulk" data-b="arsip"><span class="ms s16">inventory_2</span>Arsipkan</button><button class="btn btn-sm" data-x="kbulk" data-b="aktif"><span class="ms s16">unarchive</span>Aktifkan</button><button class="btn btn-sm d" data-x="kbulk" data-b="hapus"><span class="ms s16">delete</span>Hapus</button></div>' : '') +
      (rows.length ? '<div class="tbl-w"><table class="tbl"><thead><tr><th style="width:36px"><input type="checkbox" id="kall" aria-label="Pilih semua"' + (rows.length && rows.every(function (k) { return K.sel[k.id]; }) ? ' checked' : '') + '></th><th>Judul &amp; Tipe</th><th>Kategori</th><th>Sumber</th><th>Diperbarui</th><th>Unduhan</th><th>Status</th><th></th></tr></thead><tbody>' +
        rows.map(function (k) {
          return '<tr class="' + (K.sel[k.id] ? 'sel' : '') + '" data-id="' + esc(k.id) + '"><td><input type="checkbox" class="ksel" aria-label="Pilih ' + esc(k.j) + '"' + (K.sel[k.id] ? ' checked' : '') + '></td>' +
            '<td><div class="nm"><span class="ti ' + (k.k === 'Video' ? 'v' : '') + '"><span class="ms s20">' + KICON[k.k] + '</span></span><span style="min-width:0"><b class="trunc">' + esc(k.j) + '</b><small>' + esc([k.f, k.z, k.id].filter(Boolean).join(' · ')) + '</small></span></div></td>' +
            '<td><b style="font-weight:700">' + esc(k.k) + '</b><br><small style="color:var(--charcoal-sub)">' + esc(k.s || '—') + '</small></td><td><span class="badge ' + (k.src === 'drive' ? 'b-gray' : 'b-info') + '">' + (k.src === 'drive' ? 'Google Drive' : 'OneDrive') + '</span></td>' +
            '<td style="white-space:nowrap">' + esc(App.tgl(k.tu || k.t)) + '</td><td>' + nf(k.n) + '×</td><td><span class="badge ' + (k.st === 'aktif' ? 'b-ok' : 'b-gray') + '">' + (k.st === 'aktif' ? 'Aktif' : 'Arsip') + '</span></td>' +
            '<td><div class="acts"><button class="icon-btn" data-x="kedit" aria-label="Ubah"><span class="ms s20">edit</span></button><button class="icon-btn" data-x="khapus" aria-label="Hapus"><span class="ms s20" style="color:var(--err)">delete</span></button></div></td></tr>';
        }).join('') + '</tbody></table></div>' + pager(list.length, pg, K.size, 'kpg') : kosong('folder_off', all.length ? 'Tidak ada materi yang cocok' : 'Belum ada materi', all.length ? 'Ubah filter pencarian.' : 'Klik “Tambah Materi Baru” untuk mulai.')) + '</div>';
    if (keep !== null) { const q = $('#kq'); if (q) { q.focus(); q.setSelectionRange(keep, keep); } }
  }
  function bindKonten() {
    bind(root, 'input', '#kq', function (t) { K.q = t.value; K.page = 1; debK(); });
    bind(root, 'change', '#kk,#ks,#kt', function (t) { K[t.id === 'kk' ? 'kat' : t.id === 'ks' ? 'src' : 'st'] = t.value; K.page = 1; renderKonten(); });
    bind(root, 'change', '.ksel', function (t) { const id = t.closest('tr').dataset.id; if (t.checked) K.sel[id] = 1; else delete K.sel[id]; renderKonten(); });
    bind(root, 'change', '#kall', function (t) { const rows = kFilter().slice((K.page - 1) * K.size, K.page * K.size); rows.forEach(function (k) { if (t.checked) K.sel[k.id] = 1; else delete K.sel[k.id]; }); renderKonten(); });
    bind(root, 'click', '#kpg [data-pg]', function (t) { K.page = +t.dataset.pg; renderKonten(); });
  }
  const debK = function () { clearTimeout(debK.t); debK.t = setTimeout(renderKonten, 120); };

  function kontenForm(k) {
    const edit = !!k; k = k || { j: '', k: 'Dokumen', s: '', src: 'onedrive', e: '', d: '', th: '', z: '', f: '', tg: '', st: 'aktif' };
    let mode = k.src === 'drive' ? 'drive' : 'onedrive', file = null, up = k.fd ? { id_file_drive: k.fd, ukuran: k.z, format: k.f } : null;
    const o = dlg('<div class="modal-b ad-form"><h3 style="font-size:20px;font-weight:800;padding-right:34px">' + (edit ? 'Ubah Materi' : 'Tambah Materi Baru') + '</h3><p style="color:var(--charcoal-m);font-size:12px;margin-top:2px">' + (edit ? esc(k.id) : 'Tanggal unggah terisi otomatis.') + '</p>' +
      '<div class="seg-tabs" style="margin:14px 0" id="fmode"><button data-m="onedrive" class="' + (mode === 'onedrive' ? 'on' : '') + '"><span class="ms s18">cloud</span>Tempel Link OneDrive</button><button data-m="drive" class="' + (mode === 'drive' ? 'on' : '') + '"><span class="ms s18">upload_file</span>Unggah ke Google Drive</button></div>' +
      '<form id="fk" class="fgrid c2" novalidate><div class="field full"><label for="fj">Judul materi *</label><input class="input" id="fj" maxlength="200" required value="' + esc(k.j) + '"></div>' +
      '<div class="field"><label for="fkat">Kategori *</label><select class="select" id="fkat">' + KATS.map(function (x) { return '<option' + (k.k === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label for="fsub">Sub-kategori</label><select class="select" id="fsub"></select></div>' +
      '<div class="field full" id="gol"><label for="fe">Tautan embed OneDrive / SharePoint *</label><div class="has-ico"><input class="input" id="fe" placeholder="https://onedrive.live.com/embed?resid=…" value="' + esc(k.src === 'onedrive' ? k.e : '') + '"></div><div class="hint" id="fehint">Domain diterima: onedrive.live.com, 1drv.ms, sharepoint.com. Tautan unduh dibuat otomatis.</div><div><button type="button" class="btn btn-soft btn-sm" data-x="cek"><span class="ms s16">link</span>Cek tautan</button></div></div>' +
      '<div class="field full" id="gdr" hidden><label>Berkas *</label><div class="drop" id="drop" tabindex="0" role="button"><span class="ms">cloud_upload</span><b id="dn">Pilih atau seret berkas ke sini</b><div class="hint">PDF, PNG, JPG, WEBP, GIF, MP4, WEBM, MOV, PPTX, DOCX · maks. 8 MB. Berkas besar (video) sebaiknya lewat tautan OneDrive.</div></div><input type="file" id="ff" hidden accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.mp4,.webm,.mov,.pptx,.docx"><div class="prog" id="pr" hidden><i></i></div></div>' +
      '<div class="field full"><label for="fd">Deskripsi singkat</label><textarea class="textarea" id="fd" rows="2" maxlength="500">' + esc(k.d) + '</textarea></div>' +
      '<div class="field"><label for="ftg">Tag (pisahkan koma)</label><input class="input" id="ftg" maxlength="200" value="' + esc(k.tg) + '"></div><div class="field"><label for="fth">URL thumbnail (opsional)</label><input class="input" id="fth" placeholder="https://…" value="' + esc(k.th) + '"></div>' +
      '<div class="field"><label for="ff2">Format</label><input class="input" id="ff2" maxlength="12" placeholder="PDF" value="' + esc(k.f) + '"></div><div class="field"><label for="fz">Ukuran</label><input class="input" id="fz" maxlength="30" placeholder="4.2 MB" value="' + esc(k.z) + '"></div>' +
      '<div class="field full"><label for="fst">Status</label><select class="select" id="fst"><option value="aktif"' + (k.st === 'aktif' ? ' selected' : '') + '>Aktif (tampil di portal)</option><option value="arsip"' + (k.st === 'arsip' ? ' selected' : '') + '>Arsip (disembunyikan)</option></select></div>' +
      '<div class="full" id="fmsg"></div><div class="full modal-f" style="flex-direction:row;justify-content:flex-end;margin:0"><button type="button" class="btn btn-soft" data-x="x">Batal</button><button type="submit" class="btn btn-gold"><span class="ms s18">check_circle</span>' + (edit ? 'Simpan Perubahan' : 'Simpan & Terbitkan') + '</button></div></form></div>', { wide: true, kunci: true });
    const sync = function () {
      $('#gol', o).hidden = mode !== 'onedrive'; $('#gdr', o).hidden = mode !== 'drive';
      $$('#fmode button', o).forEach(function (b) { b.classList.toggle('on', b.dataset.m === mode); });
    }, subs = function () {
      const kat = $('#fkat', o).value, cur = $('#fsub', o).value || k.s;
      $('#fsub', o).innerHTML = '<option value="">— tanpa sub-kategori —</option>' + (ui.sub || []).filter(function (s) { return s.k === kat; }).map(function (s) { return '<option' + (cur === s.n ? ' selected' : '') + '>' + esc(s.n) + '</option>'; }).join('');
    };
    sync(); subs();
    $('#fkat', o).addEventListener('change', function () { $('#fsub', o).value = ''; subs(); });
    $('#fmode', o).addEventListener('click', function (e) { const b = e.target.closest('button'); if (b) { mode = b.dataset.m; sync(); } });
    function pilih(f) {
      if (!f) return; if (f.size > 8 * 1024 * 1024) { $('#fmsg', o).innerHTML = '<div class="alert err"><span class="ms s18">error</span>Ukuran berkas melebihi 8 MB. Gunakan tautan OneDrive untuk berkas besar.</div>'; return; }
      file = f; up = null; $('#dn', o).textContent = f.name + ' (' + (f.size / 1048576).toFixed(2) + ' MB)'; $('#fmsg', o).innerHTML = '';
      if (!$('#fj', o).value) $('#fj', o).value = f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
      const kb = f.size / 1024; $('#fz', o).value = kb >= 1024 ? (kb / 1024).toFixed(1) + ' MB' : Math.round(kb) + ' KB'; $('#ff2', o).value = (f.name.split('.').pop() || '').toUpperCase();
      if (/^image\//.test(f.type)) $('#fkat', o).value = 'Gambar'; else if (/^video\//.test(f.type)) $('#fkat', o).value = 'Video'; else $('#fkat', o).value = 'Dokumen'; subs();
    }
    $('#drop', o).addEventListener('click', function () { $('#ff', o).click(); });
    $('#drop', o).addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#ff', o).click(); } });
    $('#drop', o).addEventListener('dragover', function (e) { e.preventDefault(); this.classList.add('over'); });
    $('#drop', o).addEventListener('dragleave', function () { this.classList.remove('over'); });
    $('#drop', o).addEventListener('drop', function (e) { e.preventDefault(); this.classList.remove('over'); pilih(e.dataTransfer.files[0]); });
    $('#ff', o).addEventListener('change', function () { pilih(this.files[0]); });
    o.addEventListener('click', function (e) {
      const b = e.target.closest('[data-x="cek"]'); if (!b) return;
      const v = $('#fe', o).value.trim(); if (!v) return;
      busy(b, true, 'Memeriksa…');
      API.call('konten.cekLink', { link: v }).then(function (r) { busy(b, false); $('#fehint', o).innerHTML = r.success ? '<span style="color:var(--ok);font-weight:700">✓ Tautan valid.</span> ' + esc(r.data.catatan || 'Pratinjau & unduhan siap dibuat.') : '<span style="color:var(--err);font-weight:700">' + esc(err(r)) + '</span>'; });
    });
    $('#fk', o).addEventListener('submit', async function (e) {
      e.preventDefault(); const btn = $('button[type=submit]', o), msg = $('#fmsg', o); msg.innerHTML = '';
      const d = { id_konten: edit ? k.id : undefined, judul: $('#fj', o).value.trim(), kategori: $('#fkat', o).value, sub_kategori: $('#fsub', o).value, deskripsi: $('#fd', o).value.trim(), tags: $('#ftg', o).value.trim(), thumbnail: $('#fth', o).value.trim(), format: $('#ff2', o).value.trim(), ukuran: $('#fz', o).value.trim(), status: $('#fst', o).value, sumber: mode };
      if (!d.judul) { msg.innerHTML = '<div class="alert err"><span class="ms s18">error</span>Judul wajib diisi.</div>'; return; }
      busy(btn, true, 'Menyimpan…');
      try {
        if (mode === 'onedrive') { d.link_embed = $('#fe', o).value.trim(); if (!d.link_embed) throw new Error('Tautan OneDrive wajib diisi.'); }
        else {
          if (!up) {
            if (!file) throw new Error('Pilih berkas yang akan diunggah.');
            up = await unggah(file, function (p) { const pr = $('#pr', o); if (pr) { pr.hidden = false; pr.firstChild.style.width = Math.round(p * 100) + '%'; } });
          }
          d.id_file_drive = up.id_file_drive; if (!d.ukuran) d.ukuran = up.ukuran; if (!d.format) d.format = up.format;
        }
        const r = await API.call('konten.simpan', d);
        if (!r.success) throw new Error(err(r));
        App.toast(r.message || 'Tersimpan.', 'ok'); inval('konten.admin.list'); inval('laporan.ringkasan'); App.invalidate(); o.close();
        if (rt.split('/')[1] === 'konten') VIEWS.konten($('#adview'), true); else if (rt.split('/')[1] === 'dashboard' || !rt.split('/')[1]) VIEWS.dashboard($('#adview'), true);
      } catch (ex) { msg.innerHTML = '<div class="alert err"><span class="ms s18">error</span>' + esc(ex.message || 'Gagal menyimpan.') + '</div>'; busy(btn, false); }
    });
  }
  async function unggah(file, prog) {
    const m = await API.call('upload.mulai', { nama: file.name, mime: file.type, ukuran: file.size });
    if (!m.success) throw new Error(err(m, 'Gagal memulai unggahan.'));
    const u = m.data;
    for (let i = 0; i < u.n; i++) {
      const data = await b64(file.slice(i * u.chunk, (i + 1) * u.chunk));
      let r = await API.call('upload.potong', { uid: u.uid, idx: i, b64: data });
      if (!r.success && r.code === 'NET') r = await API.call('upload.potong', { uid: u.uid, idx: i, b64: data });
      if (!r.success) throw new Error(err(r, 'Gagal mengunggah potongan ' + (i + 1) + '.'));
      prog((i + 1) / (u.n + 1));
    }
    const s = await API.call('upload.selesai', { uid: u.uid });
    if (!s.success) throw new Error(err(s, 'Gagal menyelesaikan unggahan.'));
    prog(1); return s.data;
  }

  // ------------------------------------------------------------ SUB-KATEGORI
  VIEWS.sub = function (el, fresh) {
    el.innerHTML = head('Sub-Kategori', 'Kelompokkan materi di dalam Dokumen, Video, dan Gambar. Sub-kategori yang masih dipakai tidak bisa dihapus.') + '<div id="sb">' + skel() + '</div>';
    get('sub.list', {}, function (r) { if (!r.success) { $('#sb').innerHTML = '<div class="alert err">' + esc(err(r)) + '</div>'; return; } ui.sub = r.data.sub; renderSub(); }, fresh);
  };
  function renderSub() {
    const el = $('#sb'); if (!el) return;
    el.innerHTML = '<div class="ad-grid4" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">' + KATS.map(function (kat) {
      const l = ui.sub.filter(function (s) { return s.k === kat; });
      return '<div class="card-p"><div class="card-h"><div style="display:flex;gap:10px;align-items:center"><span class="stat" style="padding:0;border:0;box-shadow:none"><span class="ic"><span class="ms s20">' + KICON[kat] + '</span></span></span><h3>' + kat + '</h3></div><span class="badge b-gray">' + l.length + '</span></div><div class="sub-col">' +
        (l.map(function (s, i) { return '<div class="sub-it" data-id="' + esc(s.id) + '"><span class="nm">' + esc(s.n) + '</span><button class="icon-btn" data-x="sup" aria-label="Naik"' + (i === 0 ? ' disabled style="opacity:.3"' : '') + '><span class="ms s18">arrow_upward</span></button><button class="icon-btn" data-x="sdown" aria-label="Turun"' + (i === l.length - 1 ? ' disabled style="opacity:.3"' : '') + '><span class="ms s18">arrow_downward</span></button><button class="icon-btn" data-x="sedit" aria-label="Ubah nama"><span class="ms s18">edit</span></button><button class="icon-btn" data-x="shapus" aria-label="Hapus"><span class="ms s18" style="color:var(--err)">delete</span></button></div>'; }).join('') || '<div class="hint">Belum ada sub-kategori.</div>') +
        '</div><form class="sadd" data-k="' + kat + '" style="display:flex;gap:8px;margin-top:12px"><input class="input" maxlength="80" placeholder="Tambah sub-kategori…" aria-label="Nama sub-kategori ' + kat + '"><button class="btn btn-dark" type="submit" aria-label="Tambah"><span class="ms s18">add</span></button></form></div>';
    }).join('') + '</div>';
  }
  function subSimpan(d, btn) {
    return tulis('sub.simpan', d, btn).then(function (r) { if (r.success) { ui.sub = r.data.sub; inval('sub.list'); inval('konten.admin.list'); App.invalidate(); renderSub(); App.toast(r.message, 'ok'); } return r; });
  }

  // ------------------------------------------------------------ MITRA
  const M = { q: '', dom: '', st: '', page: 1, size: 15 };
  VIEWS.mitra = function (el, fresh) {
    el.innerHTML = head('Daftar Mitra / Agen', 'Kelola hak akses, status keaktifan, dan pantau aktivitas Mitra. Kode Agen harus unik.', '<button class="btn btn-soft" data-x="mimpor"><span class="ms s18">table_view</span>Impor Massal (Excel)</button><button class="btn btn-gold" data-x="tmitra"><span class="ms s18">person_add</span>Tambah Mitra</button>') + '<div id="mt">' + skel() + '</div>';
    get('mitra.admin.list', {}, function (r) { if (!r.success) { $('#mt').innerHTML = '<div class="alert err">' + esc(err(r)) + '</div>'; return; } ui.mitra = r.data.mitra; renderMitra(); }, fresh);
  };
  function renderMitra() {
    const el = $('#mt'); if (!el) return; const all = ui.mitra || [], q = M.q.trim().toLowerCase();
    const doms = Array.from(new Set(all.map(function (m) { return m.d; }))).sort();
    const list = all.filter(function (m) { return (!M.dom || m.d === M.dom) && (!M.st || m.st === M.st) && (!q || (m.n + ' ' + m.k + ' ' + m.d).toLowerCase().indexOf(q) > -1); });
    const pg = Math.min(M.page, Math.max(1, Math.ceil(list.length / M.size))); M.page = pg;
    const keep = document.activeElement && document.activeElement.id === 'mq' ? document.activeElement.selectionStart : null;
    el.innerHTML = '<div class="card-p"><div class="filters"><div class="f-q"><span class="ms">search</span><input class="input" id="mq" placeholder="Cari nama, kode agen (SIT-xxx), atau domisili…" value="' + esc(M.q) + '"></div>' +
      '<select class="select" id="md"><option value="">Semua Domisili</option>' + doms.map(function (d) { return '<option' + (M.dom === d ? ' selected' : '') + '>' + esc(d) + '</option>'; }).join('') + '</select>' +
      '<select class="select" id="ms"><option value="">Semua Status</option><option value="aktif"' + (M.st === 'aktif' ? ' selected' : '') + '>Aktif</option><option value="nonaktif"' + (M.st === 'nonaktif' ? ' selected' : '') + '>Nonaktif</option></select></div>' +
      (list.length ? '<div class="tbl-w"><table class="tbl"><thead><tr><th>Mitra / Agen</th><th>Kode Agen</th><th>Domisili</th><th>Akses</th><th>Unduhan</th><th>Terakhir Aktif</th><th>Status</th><th></th></tr></thead><tbody>' +
        list.slice((pg - 1) * M.size, pg * M.size).map(function (m) {
          return '<tr data-id="' + esc(m.id) + '"><td><div class="nm"><span class="mav">' + esc(App.init2(m.n)) + '</span><span><b>' + esc(m.n) + '</b></span></div></td><td><span class="code">' + esc(m.k) + '</span></td><td>' + esc(m.d) + '</td><td>' + m.a + '</td><td>' + m.u + '</td><td style="white-space:nowrap;color:' + (m.l ? 'var(--charcoal)' : 'var(--charcoal-sub)') + '">' + rel(m.l) + '</td>' +
            '<td><label class="sw" title="' + (m.st === 'aktif' ? 'Aktif' : 'Nonaktif') + '"><input type="checkbox" class="mst" aria-label="Status aktif ' + esc(m.n) + '"' + (m.st === 'aktif' ? ' checked' : '') + '><i></i></label></td>' +
            '<td><div class="acts"><button class="icon-btn" data-x="medit" aria-label="Ubah"><span class="ms s20">edit</span></button></div></td></tr>';
        }).join('') + '</tbody></table></div>' + pager(list.length, pg, M.size, 'mpg') : kosong('group_off', all.length ? 'Tidak ada Mitra yang cocok' : 'Belum ada Mitra', all.length ? 'Ubah filter pencarian.' : 'Tambah Mitra atau impor dari Excel.')) + '</div>';
    if (keep !== null) { const q2 = $('#mq'); if (q2) { q2.focus(); q2.setSelectionRange(keep, keep); } }
  }
  const debM = function () { clearTimeout(debM.t); debM.t = setTimeout(renderMitra, 120); };
  function mitraForm(m) {
    const edit = !!m; m = m || { n: '', k: '', d: '' };
    const o = dlg('<div class="modal-b ad-form"><h3 style="font-size:20px;font-weight:800;padding-right:34px">' + (edit ? 'Ubah Mitra' : 'Tambah Mitra') + '</h3><form id="fm" class="stack" style="gap:14px;margin-top:14px" novalidate><div class="field"><label for="mn">Nama lengkap *</label><input class="input" id="mn" maxlength="120" required value="' + esc(m.n) + '"></div><div class="field"><label for="mk">Kode agen * (unik)</label><input class="input" id="mk" maxlength="30" placeholder="SIT-017" style="text-transform:uppercase" required value="' + esc(m.k) + '"></div><div class="field"><label for="md2">Domisili * (kota/kabupaten)</label><input class="input" id="md2" maxlength="80" required value="' + esc(m.d) + '"></div><div id="mmsg"></div><div class="modal-f" style="flex-direction:row;justify-content:flex-end;margin:0"><button type="button" class="btn btn-soft" data-x="x">Batal</button><button class="btn btn-gold" type="submit">Simpan</button></div></form></div>', { kunci: true });
    $('#fm', o).addEventListener('submit', function (e) {
      e.preventDefault(); const b = $('button[type=submit]', o);
      tulis('mitra.simpan', { id_mitra: edit ? m.id : undefined, nama_lengkap: $('#mn', o).value, kode_agen: $('#mk', o).value, domisili: $('#md2', o).value }, b, 'Menyimpan…').then(function (r) {
        if (r.success) { inval('mitra.admin.list'); inval('laporan.ringkasan'); o.close(); App.toast('Mitra tersimpan.', 'ok'); if (rt.split('/')[1] === 'mitra') VIEWS.mitra($('#adview'), true); }
        else $('#mmsg', o).innerHTML = '<div class="alert err"><span class="ms s18">error</span>' + esc(err(r)) + '</div>';
      });
    });
    setTimeout(function () { $('#mn', o).focus(); }, 30);
  }
  function imporForm() {
    const o = dlg('<div class="modal-b ad-form"><h3 style="font-size:20px;font-weight:800;padding-right:34px">Impor Massal Mitra</h3><p style="color:var(--charcoal-m);font-size:13px;margin-top:4px">Salin 3 kolom dari Excel (<b>Nama Lengkap · Kode Agen · Domisili</b>) lalu tempel di bawah. Baris judul dilewati otomatis.</p><textarea class="textarea" id="it" rows="9" style="margin-top:12px;font-family:ui-monospace,Menlo,monospace;font-size:12px" placeholder="Ahmad Fauzi&#9;SIT-017&#9;Jember"></textarea><div id="ir" style="margin-top:12px"></div><div class="modal-f" style="flex-direction:row;justify-content:space-between;flex-wrap:wrap"><button class="btn btn-soft" data-x="tpl"><span class="ms s18">download</span>Unduh Templat</button><span style="display:flex;gap:8px"><button class="btn btn-ghost" data-x="pindai"><span class="ms s18">fact_check</span>Pindai</button><button class="btn btn-gold" data-x="simpan" disabled><span class="ms s18">save</span>Simpan</button></span></div></div>', { wide: false, kunci: true });
    let ok = false;
    const jalan = function (dry, btn) {
      const teks = $('#it', o).value; if (!teks.trim()) { $('#ir', o).innerHTML = '<div class="alert warn">Tempel data terlebih dahulu.</div>'; return; }
      tulis('mitra.impor', { teks: teks, dryRun: dry }, btn, dry ? 'Memindai…' : 'Menyimpan…').then(function (r) {
        if (!r.success) { $('#ir', o).innerHTML = '<div class="alert err">' + esc(err(r)) + '</div>'; return; }
        const d = r.data; ok = dry && d.berhasil > 0; $('[data-x=simpan]', o).disabled = !ok;
        $('#ir', o).innerHTML = '<div class="alert ' + (d.gagal.length ? 'warn' : 'ok') + '"><span class="ms s18">' + (d.dryRun ? 'fact_check' : 'check_circle') + '</span><div><b>' + d.berhasil + ' baris ' + (d.dryRun ? 'siap disimpan' : 'berhasil disimpan') + ', ' + d.gagal.length + ' gagal.</b>' + (d.gagal.length ? '<ul style="margin:6px 0 0;padding-left:18px">' + d.gagal.slice(0, 8).map(function (g) { return '<li>Baris ' + g.baris + ': ' + esc(g.alasan) + '</li>'; }).join('') + (d.gagal.length > 8 ? '<li>…dan ' + (d.gagal.length - 8) + ' lainnya</li>' : '') + '</ul>' : '') + '</div></div>';
        if (!dry) { inval('mitra.admin.list'); inval('laporan.ringkasan'); App.toast(d.berhasil + ' Mitra disimpan.', 'ok'); if (rt.split('/')[1] === 'mitra') VIEWS.mitra($('#adview'), true); $('[data-x=simpan]', o).disabled = true; }
      });
    };
    o.addEventListener('click', function (e) {
      const t = e.target.closest('[data-x]'); if (!t) return;
      if (t.dataset.x === 'pindai') jalan(true, t);
      else if (t.dataset.x === 'simpan') jalan(false, t);
      else if (t.dataset.x === 'tpl') simpanFile('templat-mitra.csv', 'Nama Lengkap;Kode Agen;Domisili\r\nAhmad Fauzi;SIT-017;Jember\r\n');
    });
    $('#it', o).addEventListener('input', function () { ok = false; $('[data-x=simpan]', o).disabled = true; });
  }

  // ------------------------------------------------------------ LAPORAN
  const L = { tipe: 'akses', jenis: '', q: '', dari: '', sampai: '', dom: '', kode: '', page: 1, size: 20 };
  VIEWS.laporan = function (el) {
    el.innerHTML = head('Riwayat Akses & Unduhan', 'Telusuri aktivitas Mitra dan Guest, lalu ekspor sesuai filter.', '<button class="btn btn-soft" data-x="lcsv"><span class="ms s18">table_view</span>Ekspor Excel (CSV)</button><button class="btn btn-dark" data-x="lpdf"><span class="ms s18">picture_as_pdf</span>Cetak / PDF</button>') +
      '<div class="card-p"><div class="tabbar" style="box-shadow:none;padding:0;margin-bottom:12px" id="ltab"><button data-t="akses" class="' + (L.tipe === 'akses' ? 'on' : '') + '"><span class="ms">login</span>Riwayat Akses</button><button data-t="unduh" class="' + (L.tipe === 'unduh' ? 'on' : '') + '"><span class="ms">cloud_download</span>Riwayat Unduhan</button></div>' +
      '<div class="filters" style="grid-template-columns:1fr 1fr"><div class="f-q" style="grid-column:1/-1"><span class="ms">search</span><input class="input" id="lq" placeholder="Cari nama, kode agen, domisili, judul…" value="' + esc(L.q) + '"></div>' +
      '<select class="select" id="lj"><option value="">Mitra &amp; Guest</option><option' + (L.jenis === 'Mitra' ? ' selected' : '') + '>Mitra</option><option' + (L.jenis === 'Guest' ? ' selected' : '') + '>Guest</option></select><input class="input" id="ldom" placeholder="Domisili (persis)" value="' + esc(L.dom) + '"><input class="input" id="lkode" placeholder="Kode agen (persis)" value="' + esc(L.kode) + '">' +
      '<input class="input" id="ld1" type="date" aria-label="Dari tanggal" value="' + esc(L.dari) + '"><input class="input" id="ld2" type="date" aria-label="Sampai tanggal" value="' + esc(L.sampai) + '"></div><div id="lt">' + '<div class="sk" style="height:300px"></div></div></div>';
    muatLog();
  };
  let logSeq = 0;
  function muatLog() {
    const my = ++logSeq, f = { tipe: L.tipe, jenis: L.jenis, q: L.q, dari: L.dari, sampai: L.sampai, dom: L.dom, kode: L.kode, page: L.page, size: L.size };
    API.call('laporan.log', f).then(function (r) {
      if (my !== logSeq || !$('#lt')) return;
      if (!r.success) { $('#lt').innerHTML = '<div class="alert err">' + esc(err(r)) + '</div>'; return; }
      const d = r.data, u = L.tipe === 'unduh';
      $('#lt').innerHTML = d.rows.length ? '<div class="tbl-w"><table class="tbl"><thead><tr><th>Waktu (WIB)</th><th>Jenis</th><th>Nama</th><th>Kode</th><th>Domisili</th>' + (u ? '<th>Materi</th><th>Kategori</th>' : '<th>Perangkat</th>') + '</tr></thead><tbody>' +
        d.rows.map(function (x) { return '<tr><td style="white-space:nowrap">' + dt(x.t) + '</td><td><span class="badge ' + (x.j === 'Guest' ? 'b-gray' : 'b-gold') + '">' + esc(x.j) + '</span></td><td><b>' + esc(x.n) + '</b></td><td><span class="code">' + esc(x.k) + '</span></td><td>' + esc(x.d) + '</td>' + (u ? '<td><span class="trunc">' + esc(x.jd) + '</span></td><td>' + esc(x.kt) + '</td>' : '<td>' + esc(x.p || '-') + '</td>') + '</tr>'; }).join('') + '</tbody></table></div>' + pager(d.total, d.page, d.size, 'lpg') : kosong('history', 'Tidak ada data', 'Ubah filter atau rentang tanggal.');
    });
  }
  const debL = function () { clearTimeout(debL.t); debL.t = setTimeout(function () { L.page = 1; muatLog(); }, 250); };
  function ekspor(mode, btn) {
    busy(btn, true, 'Menyiapkan…');
    API.call('laporan.export', { tipe: L.tipe, jenis: L.jenis, q: L.q, dari: L.dari, sampai: L.sampai, dom: L.dom, kode: L.kode }).then(function (r) {
      busy(btn, false); if (!r.success) { App.toast(err(r), 'err'); return; }
      const d = r.data, nama = 'riwayat-' + L.tipe + '-' + new Date().toISOString().slice(0, 10);
      if (mode === 'csv') { simpanFile(nama + '.csv', [d.head].concat(d.rows).map(function (rw) { return rw.map(csvCell).join(';'); }).join('\r\n')); App.toast(d.total + ' baris diekspor.', 'ok'); return; }
      const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0';
      f.srcdoc = '<!doctype html><meta charset="utf-8"><title>' + esc(nama) + '</title><style>body{font:11px Arial,sans-serif;margin:16px}h1{font-size:15px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:4px 6px;text-align:left}th{background:#f4f4f2}</style><h1>SHAHIB Ibad Tour — Riwayat ' + (L.tipe === 'unduh' ? 'Unduhan' : 'Akses') + '</h1><p>' + d.total + ' baris · dicetak ' + dt(Date.now()) + '</p><table><thead><tr>' + d.head.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' + d.rows.map(function (rw) { return '<tr>' + rw.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
      f.onload = function () { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { App.toast('Gagal membuka dialog cetak.', 'err'); } setTimeout(function () { f.remove(); }, 60000); };
      document.body.appendChild(f);
    });
  }

  // ------------------------------------------------------------ PESAN
  VIEWS.pesan = function (el, fresh) {
    el.innerHTML = head('Pesan Masuk', 'Pesan dari formulir kontak di halaman Tentang Kami.') + '<div id="ps" class="stack">' + skel() + '</div>';
    get('pesan.list', {}, function (r) {
      if (!r.success) { $('#ps').innerHTML = '<div class="alert err">' + esc(err(r)) + '</div>'; return; }
      ui.pesan = r.data.pesan; badgePesan(ui.pesan);
      $('#ps').innerHTML = ui.pesan.length ? ui.pesan.map(function (p) {
        let w = String(p.w || '').replace(/\D/g, ''); if (/^0/.test(w)) w = '62' + w.slice(1);
        return '<div class="pesan-it ' + (p.b ? '' : 'un') + '" data-r="' + p.r + '"><div class="h"><b>' + esc(p.n) + (p.k ? ' <span class="code">' + esc(p.k) + '</span>' : '') + '</b><span style="font-size:11px;color:var(--charcoal-sub)">' + dt(new Date(p.t).getTime()) + '</span></div><div style="display:flex;gap:6px;flex-wrap:wrap"><span class="badge b-gray">' + esc(p.s) + '</span><span class="badge b-tint">' + esc(p.tp) + '</span>' + (p.b ? '' : '<span class="badge b-new">Baru</span>') + '</div><p>' + esc(p.p) + '</p><div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="https://wa.me/' + w + '"><span class="ms s16">chat</span>Balas via WhatsApp</a>' + (p.b ? '' : '<button class="btn btn-soft btn-sm" data-x="baca"><span class="ms s16">done</span>Tandai dibaca</button>') + '</div></div>';
      }).join('') : kosong('mail', 'Belum ada pesan', 'Pesan dari formulir kontak akan tampil di sini.');
    }, fresh);
  };

  // ------------------------------------------------------------ PENGATURAN
  const TAB = { hero: ['title', 'Teks Hero & Sambutan'], about: ['auto_stories', 'Tentang Kami'], kontak: ['contact_support', 'Kontak & Narahubung'], meta: ['troubleshoot', 'Metadata & Opsi'] };
  const FLD = {
    hero: [['hero_badge', 'Lencana hero', 1, 1], ['tagline', 'Tagline brand', 1, 1], ['hero_judul_mitra', 'Judul sambutan Mitra — gunakan {nama}', 1, 0], ['hero_sub_mitra', 'Sub-judul Mitra — {kode} {domisili}', 1, 0], ['hero_intro_mitra', 'Teks pengantar Mitra', 3, 0], ['hero_judul_guest', 'Judul sambutan Guest', 1, 0], ['hero_intro_guest', 'Teks pengantar Guest', 3, 0]],
    about: [['about_judul', 'Judul cerita brand', 1, 0], ['about_isi', 'Isi cerita brand', 6, 0], ['ppiu_no', 'Nomor izin PPIU', 1, 1], ['pihk_info', 'Informasi PIHK / akreditasi', 1, 1]],
    kontak: [['kontak_telp', 'Telepon', 1, 1], ['kontak_wa', 'WhatsApp (format 62…)', 1, 1], ['kontak_email', 'Email', 1, 1], ['kontak_web', 'Website', 1, 1], ['kontak_alamat', 'Alamat', 2, 0], ['jam_operasional', 'Jam operasional', 1, 0], ['maps_url', 'Tautan Google Maps', 1, 0], ['maps_query', 'Kata kunci peta (untuk tampilan peta)', 1, 0], ['koordinat', 'Koordinat', 1, 1]],
    meta: [['meta_judul', 'Judul halaman (SEO)', 1, 0], ['meta_deskripsi', 'Deskripsi (SEO)', 3, 0]]
  };
  const dr = {}; let ptab = 'logo', pset = null;
  VIEWS.pengaturan = function (el, fresh) {
    el.innerHTML = head('Pengaturan Tampilan & Identitas Brand', 'Kelola logo, teks hero, narasi Tentang Kami, dan informasi narahubung tanpa mengubah kode program.', '<button class="btn btn-soft" data-x="pbatal"><span class="ms s18">restart_alt</span>Batalkan Perubahan</button><button class="btn btn-gold" data-x="psimpan"><span class="ms s18">check_circle</span>Simpan Semua Perubahan</button>') + '<div id="pgs">' + skel() + '</div>';
    get('pengaturan.get', {}, function (r) { if (!r.success) { $('#pgs').innerHTML = '<div class="alert err">' + esc(err(r)) + '</div>'; return; } pset = r.data.set; renderPeng(); }, fresh);
  };
  function nilai(k) { return k in dr ? dr[k] : (pset[k] == null ? '' : pset[k]); }
  function renderPeng() {
    const el = $('#pgs'); if (!el) return; const nd = Object.keys(dr).length;
    const tabs = '<div class="tabbar" id="ptab"><button data-t="logo" class="' + (ptab === 'logo' ? 'on' : '') + '"><span class="ms">interests</span>Logo &amp; Favicon</button>' + Object.keys(TAB).map(function (t) { return '<button data-t="' + t + '" class="' + (ptab === t ? 'on' : '') + '"><span class="ms">' + TAB[t][0] + '</span>' + TAB[t][1] + '</button>'; }).join('') + '</div>';
    let body = '';
    if (ptab === 'logo') {
      const S = [['logo_terang', 'Slot 01 · Latar Terang', 'Logo Versi Terang', 'Header, popup masuk, panel admin. Untuk latar putih/abu muda.', 0], ['logo_gelap', 'Slot 02 · Latar Gelap', 'Logo Versi Gelap', 'Footer dan sidebar admin. Untuk latar charcoal.', 1], ['favicon', 'Slot 03 · Tab Peramban', 'Favicon', 'Ikon persegi untuk tab peramban dan bookmark.', 0]];
      body = '<div class="alert warn" style="margin-bottom:16px"><span class="ms s18">verified</span><span>Format <b>SVG</b> transparan atau <b>PNG/WebP</b> resolusi tinggi, maksimal <b>2 MB</b>. Favicon juga menerima ICO. Jaga proporsi asli logo.</span></div><div class="logos">' + S.map(function (s) {
        const url = pset[s[0] + '_url'], def = s[0] === 'favicon' ? '' : 'assets/' + (s[0] === 'logo_gelap' ? 'logo-gelap' : 'logo-terang') + '.svg';
        return '<div class="card-p lgc"><div><span class="link" style="text-transform:uppercase">' + s[1] + '</span><h3>' + s[2] + '</h3><p class="sub">' + s[3] + '</p></div><div class="stage ' + (s[4] ? 'dk' : '') + '">' + ((url || def) ? '<img alt="' + s[2] + '" src="' + esc(url || def) + '">' : '<span class="hint">Belum ada favicon</span>') + '</div><div class="meta"><div><span>Status</span><b>' + (url ? 'Unggahan Anda' : 'Bawaan') + '</b></div>' + (pset[s[0] + '_tgl'] ? '<div><span>Diperbarui</span><b>' + esc(App.tgl(pset[s[0] + '_tgl'])) + '</b></div>' : '') + '</div><label class="btn btn-dark btn-block" style="cursor:pointer"><span class="ms s18">cloud_upload</span>Ganti ' + s[2] + '<input type="file" hidden class="lgf" data-s="' + s[0] + '" accept="' + (s[0] === 'favicon' ? '.png,.svg,.webp,.ico' : '.png,.svg,.webp') + '"></label><button class="btn btn-soft btn-block" data-x="lreset" data-s="' + s[0] + '"' + (url ? '' : ' disabled') + '><span class="ms s18">restart_alt</span>Kembalikan ke bawaan</button></div>';
      }).join('') + '</div><div class="ad-two" style="margin-top:16px;grid-template-columns:1fr"><div class="card-p"><div class="card-h"><h3>Pratinjau Penerapan</h3></div><div class="logos" style="grid-template-columns:1fr 1fr"><div style="background:#fff;border:1px solid var(--line);border-radius:14px;padding:16px;display:flex;align-items:center;justify-content:center"><img alt="" style="height:36px;width:auto;max-width:100%" src="' + esc(pset.logo_terang_url || 'assets/logo-terang.svg') + '"></div><div style="background:var(--charcoal);border-radius:14px;padding:16px;display:flex;align-items:center;justify-content:center"><img alt="" style="height:36px;width:auto;max-width:100%" src="' + esc(pset.logo_gelap_url || 'assets/logo-gelap.svg') + '"></div></div></div></div>';
    } else if (ptab === 'meta') {
      body = '<div class="card-p ad-form"><div class="fgrid">' + FLD.meta.map(fld).join('') + '</div><h3 style="margin:22px 0 10px">Opsi Tampilan</h3>' +
        [['opt_watermark', 'Watermark geometris Islami', 'Pola samar pada latar hero.'], ['opt_gradien', 'Gradien foil emas pada tombol utama', 'Tiga lapis #E6D285 → #D9BB45 → #A98E23.']].map(function (o) { return '<div class="optrow"><span><b>' + o[1] + '</b><small>' + o[2] + '</small></span><label class="sw"><input type="checkbox" class="opt" data-k="' + o[0] + '"' + (nilai(o[0]) !== '0' ? ' checked' : '') + '><i></i></label></div>'; }).join('') +
        '<div class="optrow"><span><b>Sinkronisasi cache</b><small>Jika perubahan belum terlihat di perangkat Mitra, bersihkan cache server.</small></span><button class="btn btn-soft" data-x="cache"><span class="ms s18">bolt</span>Bersihkan Cache</button></div></div>';
    } else body = '<div class="card-p ad-form"><div class="fgrid ' + (ptab === 'kontak' ? 'c2' : '') + '">' + FLD[ptab].map(fld).join('') + '</div></div>';
    el.innerHTML = tabs + body;
    $('[data-x=psimpan]') && ($('[data-x=psimpan]').disabled = !nd); $('[data-x=pbatal]') && ($('[data-x=pbatal]').disabled = !nd);
    $('[data-x=psimpan]') && ($('[data-x=psimpan]').innerHTML = '<span class="ms s18">check_circle</span>Simpan Semua Perubahan' + (nd ? ' (' + nd + ')' : ''));
  }
  function fld(f) { const k = f[0], v = nilai(k), full = f[3] ? '' : 'full'; return '<div class="field ' + full + '"><label for="p_' + k + '">' + esc(f[1]) + '</label>' + (f[2] > 1 ? '<textarea class="textarea" id="p_' + k + '" data-k="' + k + '" rows="' + f[2] + '" maxlength="2000">' + esc(v) + '</textarea>' : '<input class="input" id="p_' + k + '" data-k="' + k + '" maxlength="2000" value="' + esc(v) + '">') + '</div>'; }
  function logoUnggah(slot, file, input) {
    const ok = slot === 'favicon' ? /^image\/(png|svg\+xml|webp|x-icon|vnd\.microsoft\.icon)$/ : /^image\/(png|svg\+xml|webp)$/;
    const mime = file.type || (/\.ico$/i.test(file.name) ? 'image/x-icon' : '');
    if (!ok.test(mime)) { App.toast('Format tidak didukung. Gunakan ' + (slot === 'favicon' ? 'PNG, SVG, WebP, atau ICO.' : 'PNG, SVG, atau WebP.'), 'err'); input.value = ''; return; }
    if (file.size > 2 * 1024 * 1024) { App.toast('Ukuran berkas melebihi 2 MB.', 'err'); input.value = ''; return; }
    const lbl = input.parentNode; lbl.classList.add('is-busy');
    b64(file).then(function (data) { return API.call('logo.unggah', { slot: slot, mime: mime, b64: data }); }).then(function (r) {
      lbl.classList.remove('is-busy'); input.value = '';
      if (!r.success) { App.toast(err(r), 'err'); return; }
      pset = r.data.set; inval('pengaturan.get'); App.setSet(r.data.set); renderPeng(); App.toast('Logo diperbarui & langsung dipakai di seluruh portal.', 'ok');
    });
  }

  // ------------------------------------------------------------ KEAMANAN
  VIEWS.keamanan = function (el, fresh) {
    el.innerHTML = head('Keamanan & Sistem', 'Rahasia disimpan di Script Properties server — tidak pernah dikirim ke browser.') + '<div id="kem">' + skel() + '</div>';
    Promise.all([get('rahasia.status', {}, function () { }, true), get('admin.list', {}, function () { }, true), get('sistem.status', {}, function () { }, true)]).then(function (rs) {
      if (!$('#kem')) return; const a = rs[0], b = rs[1], c = rs[2];
      if (!a.success) { $('#kem').innerHTML = '<div class="alert err">' + esc(err(a)) + '</div>'; return; }
      const s = a.data, adm = b.success ? b.data.admin : [], sy = c.success ? c.data : {};
      $('#kem').innerHTML = '<div class="ad-two" style="margin-top:0;grid-template-columns:1fr 1fr">' +
        '<div class="card-p ad-form"><div class="card-h"><div><h3>Login Google</h3><div class="sub">OAuth Client ID (bukan rahasia, tetapi disimpan di server)</div></div><span class="badge ' + (s.googleClientIdAda ? 'b-ok' : 'b-warn') + '">' + (s.googleClientIdAda ? 'Terpasang' : 'Belum diisi') + '</span></div><form id="fcid" class="stack" style="gap:10px"><div class="field"><label for="cid">Google Client ID</label><input class="input" id="cid" placeholder="xxxx.apps.googleusercontent.com" value="' + esc(s.googleClientId || '') + '" autocomplete="off"></div><button class="btn btn-dark" type="submit"><span class="ms s18">save</span>Simpan Client ID</button></form></div>' +
        '<div class="card-p ad-form"><div class="card-h"><div><h3>Sandi Akses Darurat</h3><div class="sub">Pengguna: <b>' + esc(s.daruratUser || '-') + '</b> · disimpan sebagai hash + salt</div></div><span class="badge ' + (s.daruratDikunci ? 'b-err' : 'b-ok') + '">' + (s.daruratDikunci ? 'Terkunci' : 'Siaga') + '</span></div><form id="fdr" class="stack" style="gap:10px"><div class="field"><label for="ns">Sandi baru (min. 12 karakter, huruf + angka)</label><input class="input" id="ns" type="password" autocomplete="new-password" minlength="12"></div><button class="btn btn-dark" type="submit"><span class="ms s18">key</span>Ganti Sandi Darurat</button></form></div></div>' +
        '<div class="ad-two" style="grid-template-columns:1fr 1fr"><div class="card-p"><div class="card-h"><div><h3>Admin Terdaftar</h3><div class="sub">Email Google yang boleh masuk</div></div></div><div id="adl">' + adminList(adm) + '</div><form id="fad" style="display:flex;gap:8px;margin-top:12px"><input class="input" id="ae" type="email" placeholder="email@gmail.com" aria-label="Email admin" required><button class="btn btn-dark" type="submit" aria-label="Tambah"><span class="ms s18">add</span></button></form></div>' +
        '<div class="card-p"><div class="card-h"><div><h3>Sesi & Sistem</h3></div></div><div class="kv"><div><span>Versi server</span><b>' + esc(sy.versi || '-') + '</b></div><div><span>Secret sesi</span><b>' + (s.secretSesiAda ? 'Terpasang' : 'Belum ada') + '</b></div><div><span>Keep-warm</span><b>' + (sy.keepWarm ? 'Aktif' : 'Mati') + '</b></div><div><span>Cadangan terakhir</span><b>' + esc(sy.cadanganTerakhir || '—') + '</b></div></div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><button class="btn btn-danger" data-x="cabut"><span class="ms s18">logout</span>Keluar dari Semua Perangkat</button><button class="btn btn-soft" data-x="cache"><span class="ms s18">bolt</span>Bersihkan Cache</button>' + (sy.spreadsheetUrl ? '<a class="btn btn-soft" target="_blank" rel="noopener" href="' + esc(sy.spreadsheetUrl) + '"><span class="ms s18">table_chart</span>Spreadsheet</a>' : '') + (sy.folderUrl ? '<a class="btn btn-soft" target="_blank" rel="noopener" href="' + esc(sy.folderUrl) + '"><span class="ms s18">folder</span>Folder Drive</a>' : '') + '</div></div></div>';
    });
  };
  function adminList(l) { return l.length ? l.map(function (a) { return '<div class="bar-row" style="grid-template-columns:1fr auto auto" data-e="' + esc(a.email) + '"><span class="nm"><b>' + esc(a.email) + '</b><small style="color:var(--charcoal-sub)">' + esc(a.nama || '') + '</small></span><span class="badge ' + (a.status === 'aktif' ? 'b-ok' : 'b-gray') + '">' + esc(a.status) + '</span><button class="icon-btn" data-x="adel" aria-label="Hapus admin"><span class="ms s18" style="color:var(--err)">delete</span></button></div>'; }).join('') : '<div class="hint">Belum ada admin Google. Tambahkan email Anda.</div>'; }

  // ------------------------------------------------------------ MIGRASI
  const MG = { src: '', sheets: { Sub_Kategori: 1, Mitra: 1, Konten: 1, Log_Akses: 0, Log_Unduhan: 0 }, timpa: 0 };
  VIEWS.migrasi = function (el) {
    el.innerHTML = head('Migrasi Data dari Aplikasi Lama', 'Spreadsheet lama hanya DIBACA, tidak pernah diubah. Aman diulang — data yang sama tidak akan dobel.') +
      '<div class="ad-two" style="grid-template-columns:1fr"><div class="card-p ad-form"><div class="alert warn" style="margin-bottom:14px"><span class="ms s18">info</span><span>Gunakan <b>akun Google yang sama</b> dengan pemilik spreadsheet lama agar berkas Drive tetap terbaca. Sesi lama tidak ikut pindah.</span></div>' +
      '<div class="field"><label for="mgs">URL atau ID spreadsheet lama</label><input class="input" id="mgs" placeholder="https://docs.google.com/spreadsheets/d/…" value="' + esc(MG.src) + '" autocomplete="off"></div><div style="margin:14px 0 6px;font-weight:800;font-size:12px;letter-spacing:.05em;text-transform:uppercase">Sheet yang dipindah</div><div style="display:flex;gap:8px;flex-wrap:wrap" id="mgc">' +
      Object.keys(MG.sheets).map(function (s) { return '<label class="btn ' + (MG.sheets[s] ? 'btn-ghost' : 'btn-soft') + ' btn-sm" style="cursor:pointer"><input type="checkbox" data-s="' + s + '" ' + (MG.sheets[s] ? 'checked' : '') + ' style="accent-color:var(--gold-d)"> ' + s.replace('_', ' ') + (/Log/.test(s) ? ' <small>(besar)</small>' : '') + '</label>'; }).join('') + '</div>' +
      '<div class="optrow" style="margin-top:14px"><span><b>Timpa data yang sudah ada</b><small>Mati (disarankan): keputusan yang sudah dibuat di aplikasi baru tidak diubah.</small></span><label class="sw"><input type="checkbox" id="mgt"' + (MG.timpa ? ' checked' : '') + '><i></i></label></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px"><button class="btn btn-ghost" data-x="mpindai"><span class="ms s18">fact_check</span>Pindai (Dry-run)</button><button class="btn btn-gold" data-x="mjalan"><span class="ms s18">move_up</span>Jalankan Migrasi</button></div><div id="mgr" style="margin-top:16px"></div></div>' +
      '<div class="card-p"><h3>Urutan cutover</h3><ol style="color:var(--charcoal-m);line-height:24px;padding-left:20px"><li>Pindai lalu jalankan migrasi, cek Mitra dan konten.</li><li>Uji dengan satu akun Mitra.</li><li>Tepat sebelum pindah, jalankan migrasi sekali lagi (delta).</li><li>Umumkan alamat baru; arsipkan deployment lama.</li></ol></div></div>';
  };
  function migrasi(dry, btn) {
    MG.src = $('#mgs').value.trim(); if (!MG.src) { App.toast('Isi URL/ID spreadsheet lama.', 'err'); return; }
    const sh = Object.keys(MG.sheets).filter(function (s) { return MG.sheets[s]; }); if (!sh.length) { App.toast('Pilih minimal satu sheet.', 'err'); return; }
    const go = function () {
      tulis(dry ? 'migrasi.pindai' : 'migrasi.jalankan', { source: MG.src, sheets: sh, timpa: !!MG.timpa }, btn, dry ? 'Memindai…' : 'Memigrasi…').then(function (r) {
        const o = $('#mgr'); if (!o) return;
        if (!r.success) { o.innerHTML = '<div class="alert err"><span class="ms s18">error</span>' + esc(err(r)) + '</div>'; return; }
        const d = r.data;
        o.innerHTML = '<div class="alert ok" style="margin-bottom:12px"><span class="ms s18">' + (d.dryRun ? 'fact_check' : 'check_circle') + '</span><div><b>' + esc(r.message) + '</b><br>Sumber: ' + esc(d.source.nama) + '</div></div><div class="tbl-w"><table class="rep"><thead><tr><th>Data</th><th>Di sumber</th><th>Ditambah</th><th>Diperbarui</th><th>Dilewati</th></tr></thead><tbody>' +
          Object.keys(d.laporan).map(function (k) { const x = d.laporan[k]; return '<tr><td><b>' + k.replace('_', ' ') + '</b></td>' + (x.ada === false ? '<td colspan="4" style="color:var(--charcoal-sub)">Sheet tidak ditemukan di sumber</td>' : '<td>' + x.sumber + '</td><td><b>' + x.ditambah + '</b></td><td>' + x.diperbarui + '</td><td>' + x.dilewati + '</td>') + '</tr>'; }).join('') + '</tbody></table></div>' +
          (d.peringatan.length ? '<div class="alert warn" style="margin-top:12px"><span class="ms s18">warning</span><ul style="margin:0;padding-left:18px">' + d.peringatan.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul></div>' : '');
        if (!dry) { cache = {}; App.invalidate(); App.toast('Migrasi selesai.', 'ok'); }
      });
    };
    if (dry) go(); else konfirm('Jalankan migrasi?', 'Data dari spreadsheet lama akan <b>ditambahkan</b> ke aplikasi ini. Spreadsheet lama tidak diubah. Disarankan memindai dulu.', 'Ya, jalankan').then(function (y) { if (y) go(); });
  }

  // ------------------------------------------------------------ event global
  function events() {
    if (root._ev) return; root._ev = 1;
    bindKonten();
    bind(root, 'click', '[data-x]', function (t) {
      const x = t.dataset.x, row = t.closest('[data-id]'), id = row ? row.dataset.id : '';
      if (x === 'tkonten') kontenForm();
      else if (x === 'tmitra') mitraForm();
      else if (x === 'mimpor') imporForm();
      else if (x === 'kreset') { K.q = K.kat = K.src = K.st = ''; K.page = 1; renderKonten(); }
      else if (x === 'kedit') kontenForm((ui.konten || []).filter(function (k) { return k.id === id; })[0]);
      else if (x === 'khapus') { const k = (ui.konten || []).filter(function (z) { return z.id === id; })[0]; konfirm('Hapus materi?', '“' + esc(k.j) + '” akan dihapus permanen' + (k.fd ? ' beserta berkas di Drive' : '') + '. Gunakan <b>Arsipkan</b> bila hanya ingin menyembunyikan.', 'Hapus', true).then(function (y) { if (y) tulis('konten.hapus', { ids: [id] }).then(function (r) { if (r.success) { ui.konten = ui.konten.filter(function (z) { return z.id !== id; }); delete K.sel[id]; inval('konten.admin.list'); inval('laporan.ringkasan'); App.invalidate(); renderKonten(); App.toast(r.message, 'ok'); } }); }); }
      else if (x === 'kbulk') {
        const ids = Object.keys(K.sel), b = t.dataset.b;
        const sesudah = function (r) { if (r.success) { K.sel = {}; inval('konten.admin.list'); inval('laporan.ringkasan'); App.invalidate(); VIEWS.konten($('#adview'), true); App.toast(r.message, 'ok'); } };
        if (b === 'hapus') konfirm('Hapus ' + ids.length + ' materi?', 'Tindakan ini tidak bisa dibatalkan.', 'Hapus', true).then(function (y) { if (y) tulis('konten.hapus', { ids: ids }).then(sesudah); });
        else if (b === 'sub') {
          const kats = Array.from(new Set(ids.map(function (i) { return ui.konten.filter(function (k) { return k.id === i; })[0].k; })));
          if (kats.length > 1) { App.toast('Pilih materi dari satu kategori saja untuk mengubah sub-kategori.', 'err'); return; }
          const opts = ui.sub.filter(function (s) { return s.k === kats[0]; });
          const o = dlg('<div class="modal-b"><h3 style="font-size:18px;font-weight:800;padding-right:34px">Ubah sub-kategori (' + ids.length + ' materi)</h3><div class="field" style="margin-top:12px"><label for="bs">Sub-kategori ' + kats[0] + '</label><select class="select" id="bs"><option value="">— tanpa sub-kategori —</option>' + opts.map(function (s) { return '<option>' + esc(s.n) + '</option>'; }).join('') + '</select></div><div class="modal-f" style="flex-direction:row;justify-content:flex-end"><button class="btn btn-soft" data-x="x">Batal</button><button class="btn btn-gold" data-x="ok">Terapkan</button></div></div>', { z: 130 });
          o.addEventListener('click', function (e) { if (e.target.closest('[data-x=ok]')) tulis('konten.massal', { ids: ids, aksi: 'sub', sub: $('#bs', o).value }).then(function (r) { if (r.success) { o.close(); sesudah(r); } }); });
        } else tulis('konten.massal', { ids: ids, aksi: b }).then(sesudah);
      }
      else if (x === 'medit') mitraForm((ui.mitra || []).filter(function (m) { return m.id === id; })[0]);
      else if (x === 'sedit') { const s = ui.sub.filter(function (z) { return z.id === id; })[0]; const o = dlg('<div class="modal-b"><h3 style="font-size:18px;font-weight:800;padding-right:34px">Ubah nama sub-kategori</h3><div class="field" style="margin-top:12px"><label for="sn">Nama</label><input class="input" id="sn" maxlength="80" value="' + esc(s.n) + '"></div><p class="hint" style="margin-top:8px">Materi yang memakai sub-kategori ini ikut diperbarui.</p><div class="modal-f" style="flex-direction:row;justify-content:flex-end"><button class="btn btn-soft" data-x="x">Batal</button><button class="btn btn-gold" data-x="ok">Simpan</button></div></div>', { z: 130 }); o.addEventListener('click', function (e) { const b = e.target.closest('[data-x=ok]'); if (b) subSimpan({ id_sub: s.id, nama_sub: $('#sn', o).value, kategori_induk: s.k }, b).then(function (r) { if (r.success) o.close(); }); }); setTimeout(function () { $('#sn', o).select(); }, 30); }
      else if (x === 'shapus') { const s = ui.sub.filter(function (z) { return z.id === id; })[0]; konfirm('Hapus sub-kategori?', '“' + esc(s.n) + '” akan dihapus. Hanya bisa jika tidak dipakai materi.', 'Hapus', true).then(function (y) { if (y) tulis('sub.hapus', { id_sub: id }).then(function (r) { if (r.success) { ui.sub = r.data.sub; inval('sub.list'); App.invalidate(); renderSub(); App.toast(r.message, 'ok'); } }); }); }
      else if (x === 'sup' || x === 'sdown') {
        const s = ui.sub.filter(function (z) { return z.id === id; })[0], idx = ui.sub.indexOf(s), dir = x === 'sup' ? -1 : 1; let j = idx + dir;
        while (ui.sub[j] && ui.sub[j].k !== s.k) j += dir; if (!ui.sub[j]) return;
        const arr = ui.sub.slice(); arr[idx] = ui.sub[j]; arr[j] = s; ui.sub = arr; renderSub();                       // optimistis
        API.call('sub.urut', { ids: arr.map(function (z) { return z.id; }) }).then(function (r) { if (r.success) { ui.sub = r.data.sub; inval('sub.list'); App.invalidate(); } else { App.toast(err(r), 'err'); VIEWS.sub($('#adview'), true); } });
      }
      else if (x === 'lcsv') ekspor('csv', t);
      else if (x === 'lpdf') ekspor('pdf', t);
      else if (x === 'baca') { const r = +t.closest('[data-r]').dataset.r; API.call('pesan.baca', { r: r }).then(function () { inval('pesan.list'); VIEWS.pesan($('#adview'), true); }); }
      else if (x === 'psimpan') { const kv = Object.assign({}, dr); tulis('pengaturan.simpan', { kv: kv }, t, 'Menyimpan…').then(function (r) { if (r.success) { pset = r.data.set; Object.keys(dr).forEach(function (k) { delete dr[k]; }); inval('pengaturan.get'); App.setSet(pset); App.invalidate(); renderPeng(); App.toast('Pengaturan tersimpan & langsung tayang.', 'ok'); } }); }
      else if (x === 'pbatal') { Object.keys(dr).forEach(function (k) { delete dr[k]; }); renderPeng(); }
      else if (x === 'lreset') konfirm('Kembalikan logo bawaan?', 'Berkas unggahan Anda akan dihapus.', 'Kembalikan').then(function (y) { if (y) tulis('logo.reset', { slot: t.dataset.s }).then(function (r) { if (r.success) { pset = r.data.set; inval('pengaturan.get'); App.setSet(pset); renderPeng(); App.toast(r.message, 'ok'); } }); });
      else if (x === 'cache') tulis('sistem.bersihCache', {}, t, 'Membersihkan…').then(function (r) { if (r.success) { cache = {}; App.invalidate(); App.toast(r.message, 'ok'); } });
      else if (x === 'cabut') konfirm('Keluar dari semua perangkat?', 'Semua sesi akun ini dicabut, termasuk perangkat ini.', 'Ya, keluar').then(function (y) { if (y) API.call('sesi.cabutSemua', {}).then(function () { keluar(); }); });
      else if (x === 'adel') { const em = t.closest('[data-e]').dataset.e; konfirm('Hapus admin?', esc(em) + ' tidak bisa masuk lagi.', 'Hapus', true).then(function (y) { if (y) tulis('admin.hapus', { email: em }).then(function (r) { if (r.success) { inval('admin.list'); $('#adl').innerHTML = adminList(r.data.admin); App.toast('Admin dihapus.', 'ok'); } }); }); }
      else if (x === 'mpindai') migrasi(true, t);
      else if (x === 'mjalan') migrasi(false, t);
    });
    bind(root, 'click', '[data-pg]', function (t) {
      const v = $('#adview').dataset.v, p = +t.dataset.pg;
      if (v === 'konten') { K.page = p; renderKonten(); } else if (v === 'mitra') { M.page = p; renderMitra(); } else if (v === 'laporan') { L.page = p; muatLog(); }
    });
    bind(root, 'input', '#mq', function (t) { M.q = t.value; M.page = 1; debM(); });
    bind(root, 'change', '#md,#ms', function (t) { M[t.id === 'md' ? 'dom' : 'st'] = t.value; M.page = 1; renderMitra(); });
    bind(root, 'change', '.mst', function (t) {
      const id = t.closest('tr').dataset.id, m = ui.mitra.filter(function (z) { return z.id === id; })[0], st = t.checked ? 'aktif' : 'nonaktif', lama = m.st;
      m.st = st; API.call('mitra.status', { id: id, status: st }).then(function (r) { if (r.success) { inval('mitra.admin.list'); inval('laporan.ringkasan'); App.toast(m.n + ' ' + st + '.', 'ok'); } else { m.st = lama; renderMitra(); App.toast(err(r), 'err'); } });
    });
    bind(root, 'click', '#ltab [data-t]', function (t) { L.tipe = t.dataset.t; L.page = 1; VIEWS.laporan($('#adview')); });
    bind(root, 'input', '#lq,#ldom,#lkode', function (t) { L[t.id === 'lq' ? 'q' : t.id === 'ldom' ? 'dom' : 'kode'] = t.value; debL(); });
    bind(root, 'change', '#lj,#ld1,#ld2', function (t) { L[t.id === 'lj' ? 'jenis' : t.id === 'ld1' ? 'dari' : 'sampai'] = t.value; L.page = 1; muatLog(); });
    bind(root, 'click', '#ptab [data-t]', function (t) { ptab = t.dataset.t; renderPeng(); });
    bind(root, 'input', '#pgs [data-k]', function (t) { dr[t.dataset.k] = t.value; if (pset && pset[t.dataset.k] === t.value) delete dr[t.dataset.k]; const n = Object.keys(dr).length, b = $('[data-x=psimpan]'); if (b) { b.disabled = !n; b.innerHTML = '<span class="ms s18">check_circle</span>Simpan Semua Perubahan' + (n ? ' (' + n + ')' : ''); } const c = $('[data-x=pbatal]'); if (c) c.disabled = !n; });
    bind(root, 'change', '.opt', function (t) { dr[t.dataset.k] = t.checked ? '1' : '0'; if (pset[t.dataset.k] === dr[t.dataset.k]) delete dr[t.dataset.k]; renderPeng(); });
    bind(root, 'change', '.lgf', function (t) { if (t.files[0]) logoUnggah(t.dataset.s, t.files[0], t); });
    bind(root, 'change', '#mgc input', function (t) { MG.sheets[t.dataset.s] = t.checked ? 1 : 0; t.parentNode.className = 'btn ' + (t.checked ? 'btn-ghost' : 'btn-soft') + ' btn-sm'; });
    bind(root, 'change', '#mgt', function (t) { MG.timpa = t.checked ? 1 : 0; });
    root.addEventListener('submit', function (e) {
      const f = e.target; e.preventDefault();
      if (f.classList.contains('sadd')) { const i = f.querySelector('input'), v = i.value.trim(); if (!v) return; subSimpan({ nama_sub: v, kategori_induk: f.dataset.k }, f.querySelector('button')).then(function (r) { if (r.success) i.value = ''; }); }
      else if (f.id === 'fcid') tulis('rahasia.simpan', { kunci: 'GOOGLE_CLIENT_ID', nilai: $('#cid').value.trim() || '__HAPUS__' }, f.querySelector('button'), 'Menyimpan…').then(function (r) { if (r.success) App.toast('Client ID tersimpan.', 'ok'); });
      else if (f.id === 'fdr') tulis('darurat.rotasi', { sandiBaru: $('#ns').value }, f.querySelector('button'), 'Menyimpan…').then(function (r) { $('#ns').value = ''; if (r.success) App.toast(r.message, 'ok'); });
      else if (f.id === 'fad') tulis('admin.simpan', { email: $('#ae').value, status: 'aktif' }, f.querySelector('button')).then(function (r) { if (r.success) { $('#ae').value = ''; inval('admin.list'); $('#adl').innerHTML = adminList(r.data.admin); App.toast('Admin ditambahkan.', 'ok'); } });
    });
    window.addEventListener('shahib:auth', function (e) { if (e.detail.realm === 'admin' && !$('#adm').hidden) { cache = {}; loginView('Sesi berakhir. Silakan masuk kembali.'); root._ev = 0; } });
  }

  // ------------------------------------------------------------ API modul
  function mount(el, route, app) {
    App = app; esc = App.esc; root = el; const ada = !!API.tok.admin.get();
    if (!ada) { rt = ''; return loginView(); }
    if (!me) { try { me = JSON.parse(sessionStorage.getItem('shahib.adm.me')); } catch (e) { me = null; } }
    const baru = route !== rt; rt = route.indexOf('/') > -1 ? route : 'admin/dashboard';
    if (!$('#adview', root)) { shell(); events(); prefetch(); }
    if (baru || !$('#adview').dataset.v) show(false);
  }
  function unmount() { logSeq++; seq++; }
  window.Admin = { mount: mount, unmount: unmount };
})();
