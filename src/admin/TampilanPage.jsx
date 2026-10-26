import { useEffect, useState } from "react";
import { callApi } from "../lib/api.js";

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function TampilanPage({ toast }) {
  const [logoTerang, setLogoTerang] = useState("./assets/logo-terang.svg");
  const [logoGelap, setLogoGelap] = useState("./assets/logo-gelap.svg");
  const [favicon, setFavicon] = useState("./assets/favicon.png");
  const [bannerImg, setBannerImg] = useState("");
  const [aboutImg, setAboutImg] = useState("");
  const [pending, setPending] = useState({});

  const [banner, setBanner] = useState({ musim: "", judul: "", subjudul: "" });
  const [story, setStory] = useState("");
  const [pilar, setPilar] = useState([{}, {}, {}, {}]);
  const [legalitas, setLegalitas] = useState([{}, {}, {}, {}]);
  const [kontak, setKontak] = useState({ alamat: "", telp: "", email: "", wa: "" });

  function load() {
    callApi("getPengaturan").then((res) => {
      const d = res.data || {};
      if (d.logo_terang) setLogoTerang(d.logo_terang);
      if (d.logo_gelap) setLogoGelap(d.logo_gelap);
      if (d.favicon) setFavicon(d.favicon);
      setBannerImg((d.banner && d.banner.gambar) || "");
      setAboutImg((d.about && d.about.gambar) || "");
      setBanner({ musim: (d.banner && d.banner.musim) || "", judul: (d.banner && d.banner.judul) || "", subjudul: (d.banner && d.banner.subjudul) || "" });
      setStory((d.about && d.about.story) || "");
      setPilar((d.about && d.about.pilar && d.about.pilar.length) ? d.about.pilar : [{}, {}, {}, {}]);
      setLegalitas((d.legalitas && d.legalitas.length) ? d.legalitas : [{}, {}, {}, {}]);
      setKontak(d.kontak || {});
    }).catch((e) => toast(e.message, "error"));
  }
  useEffect(load, []);

  async function onPick(e, key, setter) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast("Ukuran file melebihi 2MB.", "error"); return; }
    const dataUrl = await fileToBase64(file);
    setter(dataUrl);
    setPending((p) => ({ ...p, [key]: { name: file.name, base64: dataUrl.split(",")[1], mime: file.type } }));
  }

  async function flushImages(keys) {
    const files = {};
    keys.forEach((k) => { if (pending[k]) files[k] = pending[k]; });
    if (!Object.keys(files).length) return;
    await callApi("simpanLogo", { files });
    setPending((p) => { const n = { ...p }; keys.forEach((k) => delete n[k]); return n; });
  }

  async function saveLogo() {
    try { await flushImages(["prevLogoTerang", "prevLogoGelap", "prevFavicon"]); toast("Logo berhasil diterapkan ke seluruh situs.", "success"); }
    catch (e) { toast(e.message, "error"); }
  }
  async function revertDefault() {
    if (!confirm("Kembalikan ke logo bawaan IbadTour?")) return;
    try { await callApi("revertLogoDefault"); toast("Logo dikembalikan ke bawaan.", "success"); location.reload(); }
    catch (e) { toast(e.message, "error"); }
  }
  async function saveBanner() {
    try { await flushImages(["prevBannerImg"]); await callApi("simpanPengaturanTeks", { banner }); toast("Banner musim disimpan & diterapkan.", "success"); }
    catch (e) { toast(e.message, "error"); }
  }
  async function saveAbout() {
    try { await flushImages(["prevAboutImg"]); await callApi("simpanPengaturanTeks", { about: { story, pilar } }); toast("Section Tentang Kami disimpan & diterapkan.", "success"); }
    catch (e) { toast(e.message, "error"); }
  }
  async function saveLegalitas() {
    try { await callApi("simpanPengaturanTeks", { legalitas }); toast("Legalitas disimpan & diterapkan.", "success"); }
    catch (e) { toast(e.message, "error"); }
  }
  async function saveKontak() {
    try { await callApi("simpanPengaturanTeks", { kontak }); toast("Kontak disimpan & diterapkan.", "success"); }
    catch (e) { toast(e.message, "error"); }
  }

  function updatePilar(i, field, val) { setPilar((p) => p.map((x, idx) => (idx === i ? { ...x, [field]: val } : x))); }
  function updateLegal(i, field, val) { setLegalitas((l) => l.map((x, idx) => (idx === i ? { ...x, [field]: val } : x))); }

  return (
    <div>
      {/* Logo & Favicon */}
      <div className="card card-pad" style={{ marginBottom: 20 }}>
        <b className="t-title">Logo &amp; Favicon</b>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginTop: 16 }}>
          <div>
            <label className="field-label">Logo Versi Terang</label>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, textAlign: "center", marginBottom: 8 }}>
              <img src={logoTerang} style={{ height: 40 }} onError={(e) => (e.target.style.opacity = 0.2)} />
            </div>
            <input className="input" type="file" accept=".png,.svg,.webp" onChange={(e) => onPick(e, "prevLogoTerang", setLogoTerang)} />
          </div>
          <div>
            <label className="field-label">Logo Versi Gelap</label>
            <div style={{ background: "var(--charcoal-900)", borderRadius: 12, padding: 16, textAlign: "center", marginBottom: 8 }}>
              <img src={logoGelap} style={{ height: 40 }} onError={(e) => (e.target.style.opacity = 0.2)} />
            </div>
            <input className="input" type="file" accept=".png,.svg,.webp" onChange={(e) => onPick(e, "prevLogoGelap", setLogoGelap)} />
          </div>
          <div>
            <label className="field-label">Favicon</label>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, textAlign: "center", marginBottom: 8 }}>
              <img src={favicon} style={{ height: 32 }} onError={(e) => (e.target.style.opacity = 0.2)} />
            </div>
            <input className="input" type="file" accept=".png,.ico" onChange={(e) => onPick(e, "prevFavicon", setFavicon)} />
          </div>
        </div>
        <p style={{ fontSize: 12, color: "var(--charcoal-300)", marginTop: 10 }}>Maks. 2MB per berkas. Format PNG/SVG/WebP. Rasio asli dipertahankan.</p>
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button className="btn btn-primary" onClick={saveLogo}>Simpan &amp; Terapkan</button>
          <button className="btn btn-outline" onClick={revertDefault}>↩ Kembalikan ke Logo Bawaan</button>
        </div>
      </div>

      {/* Banner */}
      <div className="card card-pad" style={{ marginBottom: 20 }}>
        <b className="t-title">Banner Musim (Section Paling Atas)</b>
        <p className="t-body" style={{ fontSize: 13, marginTop: 4 }}>Gambar ini tampil sebagai banner utama. Jika tidak diunggah, sistem memakai ilustrasi siluet masjid bawaan.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 20, marginTop: 14, alignItems: "start" }}>
          <div>
            <div style={{ background: "var(--charcoal-900)", borderRadius: 12, padding: 10, textAlign: "center", marginBottom: 8, aspectRatio: "16/9", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {bannerImg ? <img src={bannerImg} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }} /> : <span style={{ color: "#8a8a86", fontSize: 12 }}>Belum ada gambar banner</span>}
            </div>
            <input className="input" type="file" accept=".png,.jpg,.jpeg,.webp" onChange={(e) => onPick(e, "prevBannerImg", setBannerImg)} />
          </div>
          <div>
            <div className="field"><label className="field-label">Label Musim</label><input className="input" value={banner.musim} onChange={(e) => setBanner({ ...banner, musim: e.target.value })} /></div>
            <div className="field"><label className="field-label">Judul Banner</label><input className="input" value={banner.judul} onChange={(e) => setBanner({ ...banner, judul: e.target.value })} /></div>
            <div className="field"><label className="field-label">Sub-judul Banner</label><textarea className="input" rows={2} value={banner.subjudul} onChange={(e) => setBanner({ ...banner, subjudul: e.target.value })} /></div>
          </div>
        </div>
        <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={saveBanner}>Simpan Banner</button>
      </div>

      {/* About */}
      <div className="card card-pad" style={{ marginBottom: 20 }}>
        <b className="t-title">Section Tentang Kami</b>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 20, marginTop: 14, alignItems: "start" }}>
          <div>
            <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 12, padding: 10, textAlign: "center", marginBottom: 8, aspectRatio: "3/4", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {aboutImg ? <img src={aboutImg} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }} /> : <span style={{ color: "var(--charcoal-300)", fontSize: 12 }}>Belum ada foto</span>}
            </div>
            <input className="input" type="file" accept=".png,.jpg,.jpeg,.webp" onChange={(e) => onPick(e, "prevAboutImg", setAboutImg)} />
          </div>
          <div className="field"><label className="field-label">Cerita Singkat</label><textarea className="input" rows={5} value={story} onChange={(e) => setStory(e.target.value)} /></div>
        </div>
        <b className="t-label" style={{ display: "block", marginTop: 18 }}>4 Nilai / Pilar</b>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
          {pilar.map((p, i) => (
            <div className="card card-pad" style={{ background: "var(--bg)" }} key={i}>
              <div style={{ display: "flex", gap: 8 }}>
                <input className="input" style={{ maxWidth: 56, textAlign: "center" }} value={p.ikon || ""} placeholder="✓" onChange={(e) => updatePilar(i, "ikon", e.target.value)} />
                <input className="input" value={p.judul || ""} placeholder="Judul pilar" onChange={(e) => updatePilar(i, "judul", e.target.value)} />
              </div>
              <textarea className="input" style={{ marginTop: 8 }} rows={2} value={p.deskripsi || ""} placeholder="Deskripsi singkat" onChange={(e) => updatePilar(i, "deskripsi", e.target.value)} />
            </div>
          ))}
        </div>
        <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={saveAbout}>Simpan Section Tentang Kami</button>
      </div>

      {/* Legalitas */}
      <div className="card card-pad" style={{ marginBottom: 20 }}>
        <b className="t-title">Legalitas Kemenag</b>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
          {legalitas.map((l, i) => (
            <div className="card card-pad" style={{ background: "var(--bg)" }} key={i}>
              <input className="input" value={l.label || ""} placeholder="Label (mis. PPIU)" onChange={(e) => updateLegal(i, "label", e.target.value)} />
              <input className="input" style={{ marginTop: 8 }} value={l.nilai || ""} placeholder="Nilai (mis. No. U.419 Th. 2021)" onChange={(e) => updateLegal(i, "nilai", e.target.value)} />
            </div>
          ))}
        </div>
        <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={saveLegalitas}>Simpan Legalitas</button>
      </div>

      {/* Kontak */}
      <div className="card card-pad">
        <b className="t-title">Kontak</b>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
          <div className="field"><label className="field-label">Alamat Kantor</label><input className="input" value={kontak.alamat || ""} onChange={(e) => setKontak({ ...kontak, alamat: e.target.value })} /></div>
          <div className="field"><label className="field-label">Telepon / WA</label><input className="input" value={kontak.telp || ""} onChange={(e) => setKontak({ ...kontak, telp: e.target.value })} /></div>
          <div className="field"><label className="field-label">Email</label><input className="input" value={kontak.email || ""} onChange={(e) => setKontak({ ...kontak, email: e.target.value })} /></div>
          <div className="field"><label className="field-label">Nomor WA (format 62...)</label><input className="input" value={kontak.wa || ""} onChange={(e) => setKontak({ ...kontak, wa: e.target.value })} /></div>
        </div>
        <button className="btn btn-primary" onClick={saveKontak}>Simpan Kontak</button>
      </div>
    </div>
  );
}
