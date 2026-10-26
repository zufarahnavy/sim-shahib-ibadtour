import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Chart from "chart.js/auto";
import { callApi } from "../lib/api.js";

export default function Dashboard({ toast }) {
  const [d, setD] = useState(null);
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    callApi("getDashboardSummary").then((res) => setD(res.data)).catch((e) => toast(e.message, "error"));
  }, []);

  useEffect(() => {
    if (!d || !canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels: d.tren.labels,
        datasets: [
          { label: "Akses", data: d.tren.akses, borderColor: "#CBAB2A", backgroundColor: "rgba(203,171,42,0.12)", fill: true, tension: 0.35 },
          { label: "Unduhan", data: d.tren.unduhan, borderColor: "#282828", backgroundColor: "rgba(40,40,40,0.06)", fill: true, tension: 0.35 }
        ]
      },
      options: { responsive: true, plugins: { legend: { position: "bottom" } } }
    });
    return () => chartRef.current?.destroy();
  }, [d]);

  if (!d) return <p className="t-body">Memuat dashboard...</p>;
  const maxFile = Math.max(1, ...d.topFiles.map((f) => f.total));
  const cards = [
    ["Total Mitra Terdaftar", d.totalMitra], ["Akses Hari Ini", d.aksesHariIni],
    ["Unduhan Hari Ini", d.unduhanHariIni], ["Total Materi Aktif", d.materiAktif]
  ];

  return (
    <div>
      <motion.div className="stat-grid" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}>
        {cards.map(([label, val]) => (
          <motion.div className="card stat-card" key={label} variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}>
            <span className="t-label">{label}</span><b>{val}</b>
          </motion.div>
        ))}
      </motion.div>
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <b className="t-title">Tren Aktivitas Akses &amp; Unduhan (30 Hari)</b>
        <canvas ref={canvasRef} height="90" />
      </div>
      <div className="card card-pad">
        <b className="t-title">10 File Paling Sering Diunduh</b>
        <div style={{ marginTop: 14 }}>
          {d.topFiles.length ? d.topFiles.map((f) => (
            <div key={f.judul} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}><span>{f.judul}</span><b>{f.total}</b></div>
              <div style={{ background: "var(--border)", borderRadius: 99, height: 6, overflow: "hidden" }}>
                <motion.div style={{ background: "var(--gold-gradient)", height: "100%" }} initial={{ width: 0 }} animate={{ width: `${(f.total / maxFile) * 100}%` }} transition={{ duration: 0.6 }} />
              </div>
            </div>
          )) : <p className="t-body">Belum ada data unduhan.</p>}
        </div>
      </div>
    </div>
  );
}
