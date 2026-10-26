import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { callApi } from "../lib/api.js";

export default function SubKategoriPage({ toast }) {
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ nama_sub: "", kategori_induk: "Dokumen", urutan: 1 });

  function load() { callApi("getSubKategori").then((res) => setList(res.data)).catch((e) => toast(e.message, "error")); }
  useEffect(load, []);

  async function submit(e) {
    e.preventDefault();
    try {
      await callApi("tambahSubKategori", form);
      toast("Sub-kategori ditambahkan.", "success");
      setForm({ nama_sub: "", kategori_induk: "Dokumen", urutan: 1 });
      load();
    } catch (err) { toast(err.message, "error"); }
  }
  async function hapus(id) {
    if (!confirm("Hapus sub-kategori ini? (gagal jika masih dipakai konten)")) return;
    try { await callApi("hapusSubKategori", { id_sub: id }); load(); } catch (e) { toast(e.message, "error"); }
  }

  return (
    <div>
      <div className="card card-pad" style={{ marginBottom: 20, maxWidth: 480 }}>
        <b className="t-title">Tambah Sub-Kategori</b>
        <form onSubmit={submit} style={{ marginTop: 14 }}>
          <div className="field"><input className="input" placeholder="Nama Sub-Kategori" required value={form.nama_sub} onChange={(e) => setForm({ ...form, nama_sub: e.target.value })} /></div>
          <div className="field">
            <select className="select" value={form.kategori_induk} onChange={(e) => setForm({ ...form, kategori_induk: e.target.value })}>
              <option>Dokumen</option><option>Video</option><option>Gambar</option>
            </select>
          </div>
          <div className="field"><input className="input" type="number" placeholder="Urutan tampil" value={form.urutan} onChange={(e) => setForm({ ...form, urutan: e.target.value })} /></div>
          <motion.button className="btn btn-primary" type="submit" whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>+ Tambah</motion.button>
        </form>
      </div>
      <div className="card">
        <table className="data-table">
          <thead><tr><th>Nama</th><th>Kategori Induk</th><th>Urutan</th><th>Aksi</th></tr></thead>
          <tbody>
            {list.length ? list.map((s) => (
              <tr key={s.id_sub}><td>{s.nama_sub}</td><td>{s.kategori_induk}</td><td>{s.urutan}</td>
                <td><button className="btn btn-ghost btn-sm" style={{ color: "var(--error)" }} onClick={() => hapus(s.id_sub)}>Hapus</button></td></tr>
            )) : <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--charcoal-300)" }}>Belum ada sub-kategori.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
