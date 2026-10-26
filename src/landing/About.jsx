import { motion } from "framer-motion";

const fadeIn = (dir = "up") => ({
  hidden: { opacity: 0, x: dir === "left" ? -26 : dir === "right" ? 26 : 0, y: dir === "up" ? 26 : 0 },
  show: { opacity: 1, x: 0, y: 0, transition: { duration: 0.7, ease: [0.22, 0.8, 0.3, 1] } }
});
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const childUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function About({ about, legalitas }) {
  const pilar = about.pilar || [];

  return (
    <section id="tentang" style={{ background: "var(--surface)" }}>
      <div className="container">
        <div className="section-head"><span className="kicker">Cerita &amp; Nilai</span><h2 className="t-headline-lg">Tentang SHAHIB Ibad Tour</h2></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 36, alignItems: "center" }}>
          <motion.div className="arch-photo" variants={fadeIn("left")} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}>
            {about.gambar ? <img src={about.gambar} alt="SHAHIB Ibad Tour" /> : <div className="arch-photo-pattern" />}
          </motion.div>
          <motion.div variants={fadeIn("right")} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}>
            <p className="t-body" style={{ fontSize: 16 }}>{about.story}</p>
            <motion.div className="pillar-grid" style={{ marginTop: 20 }} variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
              {pilar.map((p, i) => (
                <motion.div className="pillar" key={i} variants={childUp}>
                  <div className="ic">{p.ikon || "✓"}</div>
                  <div><b>{p.judul}</b><p className="t-body" style={{ margin: "4px 0 0", fontSize: 13 }}>{p.deskripsi}</p></div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>

        <div style={{ marginTop: 56 }}>
          <span className="kicker">Legalitas</span><h3 className="t-headline" style={{ margin: "4px 0 16px" }}>Legalitas Kemenag</h3>
          <motion.div className="legal-grid" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
            {legalitas.map((l, i) => (
              <motion.div className="card card-pad" key={i} variants={childUp} whileHover={{ y: -3 }}>
                <b className="t-title">{l.label}</b><p className="t-body" style={{ fontSize: 13 }}>{l.nilai}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
