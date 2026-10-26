import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { callApi } from "../lib/api.js";

const emptyForm = { id_mitra: "", nama_lengkap: "", kode_agen: "", domisili: "", status: "aktif" };

export default function MitraPage({ toast }) {
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkData, setBulkData] = useState("");
  const [bulkResult, setBulkResult] = useState(null);

  function load() { callApi("getMitraAdmin").then((res) => setList(res.data)).catch((e) => toast(e.message, "error")); }
  useEffect(load, []);

  const filtered = list.filter((m) => !q || m.nama_lengkap.toLowerCase().includes(q.toLowerCase()) || (m.kode_agen || "").toLowerCase().includes(q.toLowerCase()) || (m.domisili || "").toLowerCase().includes(q.toLowerCase()));

  function openAdd() { setForm(emptyForm); setModalOpen(true); }
  function openEdit(m) { setForm(m); setModalOpen(true); }

  async function submit(e) {
    e.preventDefault();
    try {
      await callApi("simpanMitra", form);
      toast("Data mitra disimpan.", "success");
      setModalOpen(false);
      load();
    } catch (err) { toast(err.message, "error"); }
  }
  async function hapus(id) { if (!confirm("Hapus mitra ini?")) return; try { await callApi("hapusMitra", { id_mitra: id }); load(); } catch (e) { toast(e.message, "error"); } }

  async function submitBulk() {
    const rows = bulkData.trim().split("\n").map((l) => l.split("\t").map((c) => c.trim())).filter((r) => r.length >= 3 && r[0]);
    try {
      const res = await callApi("importBulkMitra", { rows });
      setBulkResult(res.data);
      load();
    } catch (e) { toast(e.message, "error"); }
  }

  return (
    <div>
      <div className="toolbar">
        <input className="input" placeholder="Cari nama/kode/domisili..." value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Tambah Mitra</button>
        <button className="btn btn-outline btn-sm" onClick={() => { setBulkResult(null); setBulkData(""); setBulkOpen(true); }}>⇪ Import Massal</button>
      </div>
      <div className="card">
        <table className="data-table">
          <thead><tr><th>Nama Lengkap</th><th>Kode Agen</th><th>Domisili</th><th>Status</th><th>Tgl Daftar</th><th>Aksi</th></tr></thead>
          <tbody>
            {filtered.length ? filtered.map((m) => (
              <tr key={m.id_mitra}>
                <td>{m.nama_lengkap}</td><td>{m.kode_agen}</td><td>{m.domisili}</td>
                <td><span className={`status-dot ${m.status !== "aktif" ? "off" : ""}`}>{m.status}</span></td>
                <td>{m.tgl_daftar}</td>
                <td>
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(m)}>Edit</button>
                  <button className="btn btn-ghost btn-sm" style={{ color: "var(--error)" }} onClick={() => hapus(m.id_mitra)}>Hapus</button>
                </td>
              </tr>
            )) : <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--charcoal-300)" }}>Belum ada mitra.</td></tr>}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {modalOpen && (
          <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModalOpen(false)}>
            <motion.div className="modal" onClick={(e) => e.stopPropagation()} initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}>
              <button className="modal-close" onClick={() => setModalOpen(false)}>✕</button>
              <h3 className="t-title">{form.id_mitra ? "Edit Mitra" : "Tambah Mitra"}</h3>
              <form onSubmit={submit} style={{ marginTop: 16 }}>
                <div className="field"><label className="field-label">Nama Lengkap</label><input className="input" required value={form.nama_lengkap} onChange={(e) => setForm({ ...form, nama_lengkap: e.target.value })} /></div>
                <div className="field"><label className="field-label">Kode Agen (unik)</label><input className="input" required value={form.kode_agen} onChange={(e) => setForm({ ...form, kode_agen: e.target.value })} /></div>
                <div className="field"><label className="field-label">Domisili</label><input className="input" required value={form.domisili} onChange={(e) => setForm({ ...form, domisili: e.target.value })} /></div>
                <div className="field"><label className="field-label">Status</label>
                  <select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="aktif">Aktif</option><option value="nonaktif">Non-aktif</option>
                  </select>
                </div>
                <motion.button className="btn btn-primary btn-block" type="submit" whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>Simpan</motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {bulkOpen && (
          <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setBulkOpen(false)}>
            <motion.div className="modal modal-lg" onClick={(e) => e.stopPropagation()} initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}>
              <button className="modal-close" onClick={() => setBulkOpen(false)}>✕</button>
              <h3 className="t-title">Import Massal Mitra</h3>
              <p className="t-body" style={{ fontSize: 13, margin: "8px 0 14px" }}>Tempel data 3 kolom (Nama Lengkap, Kode Agen, Domisili) dipisah TAB — salin langsung dari Excel.</p>
              <textarea className="input" rows={10} value={bulkData} onChange={(e) => setBulkData(e.target.value)} placeholder={"Ahmad Fauzi\tSIT-017\tJember\nSiti Aminah\tSIT-018\tSurabaya"} />
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={submitBulk}>Proses Import</button>
              {bulkResult && (
                <div style={{ marginTop: 16 }}>
                  <p style={{ color: "var(--success)", fontWeight: 700 }}>✓ {bulkResult.sukses} berhasil ditambahkan</p>
                  {bulkResult.gagal.length > 0 && (
                    <>
                      <p style={{ color: "var(--error)", fontWeight: 700 }}>✕ {bulkResult.gagal.length} gagal:</p>
                      <ul style={{ fontSize: 13 }}>{bulkResult.gagal.map((g, i) => <li key={i}>Baris {g.baris}: {g.alasan}</li>)}</ul>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
