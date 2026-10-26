import { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";
import { callApi, getSessionToken } from "../lib/api.js";
import { CONFIG } from "../lib/config.js";

export default function LaporanPage({ toast }) {
  const [data, setData] = useState({ rows: [], perDomisili: { labels: [], data: [] }, mitraTidakAktif: [] });
  const [dari, setDari] = useState("");
  const [sampai, setSampai] = useState("");
  const [jenis, setJenis] = useState("");
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  function load(filter = {}) {
    callApi("getLaporan", filter).then((res) => setData(res.data)).catch((e) => toast(e.message, "error"));
  }
  useEffect(() => load(), []);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: { labels: data.perDomisili.labels, datasets: [{ label: "Akses per Domisili", data: data.perDomisili.data, backgroundColor: "#CBAB2A" }] },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });
    return () => chartRef.current?.destroy();
  }, [data]);

  function exportExcel() { window.open(`${CONFIG.GAS_URL}?action=exportLaporanExcel&token=${getSessionToken()}`, "_blank"); }
  function exportPdf() { window.open(`${CONFIG.GAS_URL}?action=exportLaporanPdf&token=${getSessionToken()}`, "_blank"); }

  return (
    <div>
      <div className="toolbar">
        <input className="input" type="date" value={dari} onChange={(e) => setDari(e.target.value)} />
        <input className="input" type="date" value={sampai} onChange={(e) => setSampai(e.target.value)} />
        <select className="select" style={{ maxWidth: 160 }} value={jenis} onChange={(e) => setJenis(e.target.value)}>
          <option value="">Mitra &amp; Guest</option><option>Mitra</option><option>Guest</option>
        </select>
        <button className="btn btn-outline btn-sm" onClick={() => load({ dari, sampai, jenis })}>Terapkan</button>
        <button className="btn btn-primary btn-sm" onClick={exportExcel}>⬇ Export Excel</button>
        <button className="btn btn-outline btn-sm" onClick={exportPdf}>⬇ Export PDF</button>
      </div>
      <div className="card card-pad" style={{ marginBottom: 16 }}><canvas ref={canvasRef} height="90" /></div>
      <div className="card">
        <table className="data-table">
          <thead><tr><th>Waktu</th><th>Jenis</th><th>Nama</th><th>Kode Agen</th><th>Domisili</th><th>Aktivitas</th></tr></thead>
          <tbody>
            {data.rows.length ? data.rows.map((r, i) => (
              <tr key={i}><td>{r.timestamp}</td><td>{r.jenis}</td><td>{r.nama_lengkap}</td><td>{r.kode_agen}</td><td>{r.domisili}</td><td>{r.aktivitas}</td></tr>
            )) : <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--charcoal-300)" }}>Tidak ada data.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="card card-pad" style={{ marginTop: 16 }}>
        <b className="t-title">Mitra Tidak Aktif (30 Hari Terakhir)</b>
        <div style={{ marginTop: 10 }}>
          {data.mitraTidakAktif.length
            ? data.mitraTidakAktif.map((m) => <span className="chip" style={{ margin: 4 }} key={m.id_mitra}>{m.nama_lengkap} ({m.kode_agen})</span>)
            : <p className="t-body">Semua mitra aktif dalam 30 hari terakhir.</p>}
        </div>
      </div>
    </div>
  );
}
