/* ============================================================
   API client — fetch ke Google Apps Script (REST API murni)
   Kontrak mengikuti backend/Kode.gs:
     POST  {action, token, data}  →  {success, data, message, code, ms, v, tokenBaru?}
   - POST memakai text/plain (menghindari CORS preflight GAS)
   - Dua token terpisah: sesi Mitra/Guest (localStorage, 12 jam) dan admin (sessionStorage, 60 mnt idle)
   - Dedupe baca in-flight + epoch tulis, penggabung batch admin (gas-scale-turbo 4.2/4.3)
   - Tidak pernah melempar galat: selalu mengembalikan {success:false, code, message}
   ============================================================ */
(function () {
  'use strict';
  const CFG = window.APP_CONFIG || {};
  const BELUM = !CFG.GAS_URL || /GANTI|XXXX/.test(CFG.GAS_URL);
  const ADMIN_RE = /^(batch$|konten\.(admin|simpan|hapus|massal|cekLink)|upload\.|sub\.|mitra\.(admin|simpan|status|impor)|laporan\.|pesan\.|pengaturan\.|logo\.|rahasia\.|darurat\.|sesi\.|admin\.|sistem\.|migrasi\.)/;
  const BACA = /^(boot|pub\.init|pub\.config|mitra\.list|auth\.config|konten\.admin\.list|sub\.list|mitra\.admin\.list|laporan\.ringkasan|pengaturan\.get|pesan\.list|sistem\.status|rahasia\.status|admin\.list)$/;
  const BATCHABLE = /^(konten\.admin\.list|sub\.list|mitra\.admin\.list|laporan\.ringkasan|pengaturan\.get|pesan\.list|sistem\.status|rahasia\.status|admin\.list)$/;
  const inflight = {}; let epoch = 0;
  const perf = [];

  function store(kind) { try { return window[kind]; } catch (e) { return null; } }
  function mk(kind, key) {
    return {
      get: function () { try { return store(kind).getItem(key) || ''; } catch (e) { return ''; } },
      set: function (v) { try { v ? store(kind).setItem(key, v) : store(kind).removeItem(key); } catch (e) { } }
    };
  }
  const Tok = { user: mk('localStorage', 'shahib.tok'), admin: mk('sessionStorage', 'shahib.adm') };

  function net(body, timeout) {
    const ac = new AbortController(), t = setTimeout(function () { ac.abort(); }, timeout || 30000);
    return fetch(CFG.GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), signal: ac.signal, redirect: 'follow' })
      .then(function (r) { clearTimeout(t); return r.json(); })
      .catch(function (e) {
        clearTimeout(t);
        return { success: false, code: 'NET', message: e && e.name === 'AbortError' ? 'Server terlalu lama merespons. Periksa koneksi lalu coba lagi.' : 'Tidak bisa terhubung ke server. Periksa koneksi internet.' };
      });
  }

  async function run(action, data, retry) {
    if (BELUM) return { success: false, code: 'CONFIG', message: 'URL backend belum diisi di js/config.js.' };
    const admin = ADMIN_RE.test(action), t0 = performance.now();
    const token = admin ? Tok.admin.get() : Tok.user.get();
    let res = await net({ action: action, token: token, data: data || {} });
    if (res.code === 'NET' && retry) res = await net({ action: action, token: token, data: data || {} });
    if (res.tokenBaru) { (admin ? Tok.admin : Tok.user).set(res.tokenBaru); }
    if (res.code === 'AUTH') {
      (admin ? Tok.admin : Tok.user).set('');
      window.dispatchEvent(new CustomEvent('shahib:auth', { detail: { realm: admin ? 'admin' : 'user' } }));
    }
    perf.push({ aksi: action, total: Math.round(performance.now() - t0), server: res.ms, cache: !!res.cached });
    if (perf.length > 100) perf.shift();
    return res;
  }

  function call(action, data) {
    if (!BACA.test(action) && action !== 'batch') { epoch++; return run(action, data, false); }
    const k = epoch + '|' + action + '|' + JSON.stringify(data || {});
    if (inflight[k]) return inflight[k];
    const p = run(action, data, true); inflight[k] = p;
    const done = function () { delete inflight[k]; };
    p.then(done, done);
    return p;
  }

  // Penggabung batch: bacaan admin yang dipanggil pada tik yang sama → 1 eksekusi server
  const Batcher = {
    q: null,
    add: function (action, data) {
      const self = this;
      return new Promise(function (resolve) {
        if (!self.q) { self.q = []; setTimeout(function () { self.flush(); }, 0); }
        self.q.push({ action: action, data: data || {}, resolve: resolve });
      });
    },
    flush: function () {
      const q = this.q; this.q = null; if (!q || !q.length) return;
      if (q.length === 1) { call(q[0].action, q[0].data).then(q[0].resolve); return; }
      const uniq = [], map = {};
      q.forEach(function (c) { const k = c.action + JSON.stringify(c.data); if (map[k] === undefined) { map[k] = uniq.length; uniq.push({ action: c.action, data: c.data }); } c.i = map[k]; });
      call('batch', { calls: uniq.slice(0, 10) }).then(function (r) {
        if (!r || !r.success) { q.forEach(function (c) { c.resolve(r || { success: false, message: 'Gagal memuat.' }); }); return; }
        q.forEach(function (c) { c.resolve(r.data.results[c.i] || { success: false, message: 'Tidak ada hasil.' }); });
      });
    }
  };
  function q(action, data) { return BATCHABLE.test(action) ? Batcher.add(action, data) : call(action, data); }

  // Pemanasan server (tidak mengembalikan data) — maks. 1× / 4 menit per sesi tab
  function warm(scope) {
    if (BELUM) return;
    try {
      const k = 'shahib.warm.' + scope, last = Number(sessionStorage.getItem(k) || 0);
      if (Date.now() - last < 240000) return;
      sessionStorage.setItem(k, String(Date.now()));
    } catch (e) { }
    try { fetch(CFG.GAS_URL + '?w=' + encodeURIComponent(scope), { mode: 'no-cors' }).catch(function () { }); } catch (e) { }
  }

  window.API = { call: call, q: q, tok: Tok, warm: warm, belum: BELUM, url: CFG.GAS_URL };
  window.Perf = {
    table: function () { console.table(perf); },
    summary: function () {
      const g = {}; perf.forEach(function (p) { (g[p.aksi] = g[p.aksi] || []).push(p.total); });
      const o = {}; Object.keys(g).forEach(function (k) { o[k] = Math.round(g[k].reduce(function (a, b) { return a + b; }, 0) / g[k].length) + ' ms (' + g[k].length + '×)'; });
      console.table(o);
    }
  };
})();
