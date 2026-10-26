import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { callApi } from "../lib/api.js";

export default function CrmPage({ toast }) {
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [segmen, setSegmen] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [blastOpen, setBlastOpen] = useState(false);
  const [blastMsg, setBlastMsg] = useState("");
  const [batchSize, setBatchSize] = useState("20");

  function load() { callApi("getCrmKontak").then((res) => setList(res.data.kontak)).catch((e) => toast(e.message, "error")); }
  useEffect(load, []);

  const filtered = list.filter((c) => (!q || c.nama.toLowerCase().includes(q.toLowerCase()) || (c.wa || "").includes(q)) && (!segmen || c.sumber === segmen));

  async function syncNow() { try { await callApi("syncCrmKontak"); toast("Kontak CRM disinkronkan.", "success"); load(); } catch (e) { toast(e.message, "error"); } }
  async function toggleOptout(id) { try { await callApi("toggleOptoutCrm", { id }); load(); } catch (e) { toast(e.message, "error"); } }

  function toggleSelect(id) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  async function submitBlast(e) {
    e.preventDefault();
    try {
      await callApi("kirimBlastWA", { ids: [...selected], pesan: blastMsg, batchSize });
      toast("Blast WA dimasukkan ke antrean pengiriman.", "success");
      setBlastOpen(false); setBlastMsg(""); setSelected(new Set());
    } catch (err) { toast(err.message, "error"); }
  }

  const stats = [
    ["Total Kontak", list.length],
    ["Kontak Aktif (WA Valid)", list.filter((c) => c.wa_valid).length],
    ["Opt-Out", list.filter((c) => c.optout).length],
    ["Sumber: Mitra", list.filter((c) => c.sumber === "Mitra").length]
  ];

  return (
    <div>
      <div className="stat-grid">
        {stats.map(([label, val]) => <div className="card stat-card" key={label}><span className="t-label">{label}</span><b>{val}</b></div>)}
      </div>
      <div className="toolbar">
        <input className="input" placeholder="Cari nama/no. WA..." value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="select" style={{ maxWidth: 160 }} value={segmen} onChange={(e) => setSegmen(e.target.value)}>
          <option value="">Semua Segmen</option><option>Mitra</option><option>Guest</option><option>Kontak Form</option>
        </select>
        <button className="btn btn-outline btn-sm" onClick={syncNow}>🔄 Sinkronkan Kontak</button>
      </div>
      <div className="card">
        <table className="data-table">
          <thead><tr><th></th><th>Nama</th><th>WA</th><th>Sumber</th><th>Tag</th><th>Opt-Out</th><th>Aksi</th></tr></thead>
          <tbody>
            {filtered.length ? filtered.map((c) => (
              <tr key={c.id}>
                <td><input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} /></td>
                <td>{c.nama}</td><td>{c.wa}</td><td>{c.sumber}</td><td>{c.tag || "-"}</td>
                <td>{c.optout ? "Ya" : "Tidak"}</td>
                <td><button className="btn btn-ghost btn-sm" onClick={() => toggleOptout(c.id)}>{c.optout ? "Aktifkan" : "Opt-out"}</button></td>
              </tr>
            )) : <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--charcoal-300)" }}>Belum ada kontak CRM.</td></tr>}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 16 }}>
        <button className="btn btn-primary btn-sm" onClick={() => setBlastOpen(true)}>📣 Kirim Blast WA ke Terpilih ({selected.size})</button>
      </div>

      <AnimatePresence>
        {blastOpen && (
          <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setBlastOpen(false)}>
            <motion.div className="modal" onClick={(e) => e.stopPropagation()} initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}>
              <button className="modal-close" onClick={() => setBlastOpen(false)}>✕</button>
              <h3 className="t-title">Kirim Blast WhatsApp</h3>
              <form onSubmit={submitBlast} style={{ marginTop: 16 }}>
                <div className="field"><label className="field-label">Isi Pesan</label><textarea className="input" rows={4} required value={blastMsg} onChange={(e) => setBlastMsg(e.target.value)} /></div>
                <div className="field"><label className="field-label">Ukuran Batch</label>
                  <select className="select" value={batchSize} onChange={(e) => setBatchSize(e.target.value)}>
                    <option value="10">10 / batch</option><option value="20">20 / batch</option><option value="50">50 / batch</option>
                  </select>
                </div>
                <p style={{ fontSize: 12, color: "var(--charcoal-300)" }}>Terkirim ke {selected.size} kontak terpilih (opt-out otomatis dikecualikan).</p>
                <motion.button className="btn btn-primary btn-block" type="submit" whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>Kirim ke Antrean</motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
