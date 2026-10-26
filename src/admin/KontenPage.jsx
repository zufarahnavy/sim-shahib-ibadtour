import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { callApi } from "../lib/api.js";

export default function KontenPage({ toast }) {
  const [list, setList] = useState([]);
  const [subKategori, setSubKategori] = useState([]);
  const [source, setSource] = useState("onedrive");
  const [form, setForm] = useState({ judul: "", kategori: "Dokumen", sub_kategori: "", link_embed: "", link_unduh: "" });
  const [q, setQ] = useState("");
  const [filterKat, setFilterKat] = useState("");

  function load() {
    Promise.all([callApi("getKontenAdmin"), callApi("getSubKategori")])
      .then(([k, s]) => { setList(k.data); setSubKategori(s.data); })
      .catch((e) => toast(e.message, "error"));
  }
  useEffect(load, []);

  async function submit(e) {
    e.preventDefault();
    try {
      await callApi("tambahKonten", { ...form, sumber: source });
      toast("Konten berhasil ditambahkan.", "success");
      setForm({ judul: "", kategori: "Dokumen", sub_kategori: "", link_embed: "", link_unduh: "" });
      load();
    } catch (err) { toast(err.message, "error"); }
  }
  async function toggleArsip(id) { try { await callApi("toggleArsipKonten", { id_konten: id }); load(); } catch (e) { toast(e.message, "error"); } }
  async function hapus(id) { if (!confirm("Hapus konten ini secara permanen?")) return; try { await callApi("hapusKonten", { id_konten: id }); toast("Konten dihapus.", "success"); load(); } catch (e) { toast(e.message, "error"); } }

  const subsForKategori = subKategori.filter((s) => s.kategori_induk === form.kategori);
  const filtered = list.filter((k) => (!q || k.judul.toLowerCase().includes(q.toLowerCase())) && (!filterKat || k.kategori === filterKat));

  return (
    <div>
      <div className="card card-pad" style={{ marginBottom: 20 }}>
        <b className="t-title">Tambah Konten Baru</b>
        <div className="entry-toggle" style={{ maxWidth: 360, margin: "14px 0" }}>
          <button className={source === "onedrive" ? "active" : ""} onClick={() => setSource("onedrive")} type="button">Link OneDrive</button>
          <button className={source === "drive" ? "active" : ""} onClick={() => setSource("drive")} type="button">Unggah Berkas</button>
        </div>
        <form onSubmit={submit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="field"><label className="field-label">Judul Materi</label><input className="input" required value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} /></div>
            <div className="field"><label className="field-label">Kategori</label>
              <select className="select" value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value, sub_kategori: "" })}>
                <option>Dokumen</option><option>Video</option><option>Gambar</option>
              </select>
            </div>
            <div className="field"><label className="field-label">Sub-Kategori</label>
              <select className="select" value={form.sub_kategori} onChange={(e) => setForm({ ...form, sub_kategori: e.target.value })}>
                <option value="">— Tanpa Sub-Kategori —</option>
                {subsForKategori.map((s) => <option key={s.id_sub}>{s.nama_sub}</option>)}
              </select>
            </div>
          </div>

          {source === "onedrive" ? (
            <div className="field" style={{ gridColumn: "1/-1" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div><label className="field-label">Link Embed (untuk Pratinjau)</label>
                  <input className="input" placeholder="Tempel src dari OneDrive > Share > Embed" value={form.link_embed} onChange={(e) => setForm({ ...form, link_embed: e.target.value })} /></div>
                <div><label className="field-label">Link Unduh Langsung</label>
                  <input className="input" placeholder="Tempel link dari OneDrive > Share > Copy Link" value={form.link_unduh} onChange={(e) => setForm({ ...form, link_unduh: e.target.value })} /></div>
              </div>
              <details style={{ marginTop: 8 }}>
                <summary style={{ fontSize: 12, color: "var(--gold-deep)", cursor: "pointer", fontWeight: 700 }}>Cara ambil kedua link ini dari OneDrive</summary>
                <ol style={{ fontSize: 12, color: "var(--charcoal-500)", margin: "8px 0 0", paddingLeft: 18, lineHeight: 1.7 }}>
                  <li>Klik kanan file di OneDrive → <b>Share</b> → <b>Embed</b> → salin URL di dalam atribut <code>src="..."</code> → tempel ke kolom Link Embed.</li>
                  <li>Masih di menu Share, pilih <b>Copy Link</b> (akses "Anyone with the link") → tempel ke kolom Link Unduh Langsung.</li>
                  <li>Isi minimal salah satu kolom — idealnya isi keduanya.</li>
                </ol>
              </details>
            </div>
          ) : (
            <div className="field" style={{ gridColumn: "1/-1" }}><label className="field-label">Pilih Berkas</label><input className="input" type="file" /></div>
          )}
          <motion.button className="btn btn-primary" type="submit" whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>+ Simpan Konten</motion.button>
        </form>
      </div>

      <div className="card">
        <div className="toolbar card-pad" style={{ paddingBottom: 0 }}>
          <input className="input" placeholder="Cari judul..." value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="select" style={{ maxWidth: 160 }} value={filterKat} onChange={(e) => setFilterKat(e.target.value)}>
            <option value="">Semua Kategori</option><option>Dokumen</option><option>Video</option><option>Gambar</option>
          </select>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead><tr><th>Judul</th><th>Kategori</th><th>Sumber</th><th>Status</th><th>Tgl Upload</th><th>Aksi</th></tr></thead>
            <tbody>
              {filtered.length ? filtered.map((k) => (
                <tr key={k.id_konten}>
                  <td>{k.judul}</td><td>{k.kategori}</td><td>{k.sumber}</td>
                  <td><span className={`status-dot ${k.status !== "aktif" ? "off" : ""}`}>{k.status}</span></td>
                  <td>{k.tgl_upload}</td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => toggleArsip(k.id_konten)}>{k.status === "aktif" ? "Arsipkan" : "Aktifkan"}</button>
                    <button className="btn btn-ghost btn-sm" style={{ color: "var(--error)" }} onClick={() => hapus(k.id_konten)}>Hapus</button>
                  </td>
                </tr>
              )) : <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--charcoal-300)" }}>Belum ada konten.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
