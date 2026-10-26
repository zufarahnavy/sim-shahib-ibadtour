import { motion } from "framer-motion";
import Counter from "./Counter.jsx";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.11, delayChildren: 0.12 } }
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 0.8, 0.3, 1] } }
};

export default function Hero({ user, fileAktifCount, onGoto }) {
  const title = user.jenis === "Mitra" ? `Selamat Datang, ${user.nama_lengkap}!` : "Selamat Datang, Sahabat!";
  const lead =
    user.jenis === "Mitra"
      ? `Kode Agen ${user.kode_agen || "-"} · ${user.domisili || "-"} — akses materi syiar terbaru untuk mendukung dakwah perjalanan ibadah Anda.`
      : "Jelajahi materi syiar & promosi resmi SHAHIB Ibad Tour sebagai Pengunjung Umum.";

  return (
    <section className="hero" style={{ padding: 0 }} id="home">
      <div className="ring-decor" /><div className="ring-decor b" />
      <motion.div className="container hero-inner" variants={container} initial="hidden" animate="show">
        <motion.span variants={item} className="badge-pill"><span className="badge-pulse" /> Akreditasi A Kemenag RI &amp; PPIU Resmi</motion.span>
        <motion.h1 variants={item} className="t-display-hero">{title}</motion.h1>
        <motion.p variants={item} className="lead">{lead}</motion.p>
        <motion.div variants={item} className="hero-actions">
          <motion.button className="btn btn-primary" whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }} onClick={() => onGoto("katalog")}>
            Jelajahi Materi
          </motion.button>
          <motion.button className="btn btn-outline on-dark" whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }} onClick={() => onGoto("katalog")}>
            Lihat Terbaru
          </motion.button>
        </motion.div>
        <motion.div variants={item} className="metric-float">
          <div className="m"><Counter value={13} suffix="+ Thn" /><span>Pengalaman Syiar</span></div>
          <div className="m"><Counter value={100} suffix="%" /><span>Pasti Berangkat</span></div>
          <div className="m"><Counter value={fileAktifCount} /><span>File Aktif Tersedia</span></div>
        </motion.div>
      </motion.div>
    </section>
  );
}
