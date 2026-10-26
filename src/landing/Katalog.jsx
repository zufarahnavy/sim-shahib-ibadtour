import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ICONS = { Dokumen: "📄", Video: "🎬", Gambar: "🖼" };

function formatDate(d) {
  try { return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }); }
  catch (e) { return d; }
}

export default function Katalog({
  konten, subKategori, searchInputRef, onOpenPreview, onDownload,
  category, setCategory, sub, setSub, term, setTerm, visible, setVisible
}) {
  function selectCategory(cat) {
    setCategory(cat); setSub(null); setVisible(24);
  }

  const activeSubs = subKategori.filter((s) => s.kategori_induk === category).sort((a, b) => a.urutan - b.urutan);

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    return konten
      .filter((k) => k.status === "aktif")
      .filter((k) => category === "Semua" || k.kategori === category)
      .filter((k) => !sub || k.sub_kategori === sub)
      .filter((k) => !q || k.judul.toLowerCase().includes(q))
      .sort((a, b) => new Date(b.tgl_upload) - new Date(a.tgl_upload));
  }, [konten, category, sub, term]);

  const list = filtered.slice(0, visible);
  const isNew = (d) => Date.now() - new Date(d).getTime() < 7 * 24 * 3600 * 1000;

  const categorySummary =
    category === "Semua" && !term
      ? ["Dokumen", "Video", "Gambar"].map((c) => ({
          cat: c,
          count: konten.filter((k) => k.kategori === c && k.status === "aktif").length
        }))
      : null;

  return (
    <section id="katalog">
      <div className="container">
        <div className="section-head">
          <span className="kicker">Materi Syiar</span>
          <h2 className="t-headline-lg">Jelajahi Katalog</h2>
        </div>

        <div className="field" style={{ maxWidth: 480, marginBottom: 18 }}>
          <input
            ref={searchInputRef}
            type="text"
            className="input"
            placeholder="Cari judul materi..."
            value={term}
            onChange={(e) => { setTerm(e.target.value); setVisible(24); }}
          />
        </div>

        <div className="chip-row" style={{ marginBottom: 10 }}>
          {["Semua", "Dokumen", "Video", "Gambar"].map((c) => (
            <motion.button key={c} className={`chip ${category === c ? "active" : ""}`} whileTap={{ scale: 0.95 }} onClick={() => selectCategory(c)}>
              {c === "Semua" ? "Semua Kategori" : c}
            </motion.button>
          ))}
        </div>

        {activeSubs.length > 0 && (
          <div className="chip-row" style={{ marginBottom: 24 }}>
            <motion.button className={`chip ${!sub ? "active" : ""}`} whileTap={{ scale: 0.95 }} onClick={() => setSub(null)}>Semua {category}</motion.button>
            {activeSubs.map((s) => (
              <motion.button key={s.id_sub} className={`chip ${sub === s.nama_sub ? "active" : ""}`} whileTap={{ scale: 0.95 }} onClick={() => setSub(s.nama_sub)}>
                {s.nama_sub}
              </motion.button>
            ))}
          </div>
        )}

        {categorySummary && (
          <motion.div
            className="cat-grid"
            style={{ marginBottom: 28 }}
            initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
          >
            {categorySummary.map((c) => (
              <motion.div
                key={c.cat}
                className="card cat-card"
                variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }}
                whileHover={{ y: -3, boxShadow: "var(--shadow-2)" }}
                onClick={() => selectCategory(c.cat)}
              >
                <motion.div className="cat-icon" whileHover={{ rotate: -8, scale: 1.08 }}>{ICONS[c.cat]}</motion.div>
                <div><b className="t-title">{c.cat}</b><p className="t-body" style={{ fontSize: 13, margin: "2px 0 0" }}>{c.count} file</p></div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {list.length ? (
          <motion.div className="content-grid" layout>
            <AnimatePresence mode="popLayout">
              {list.map((k, i) => (
                <motion.div
                  key={k.id_konten}
                  layout
                  className="card content-card"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, delay: Math.min(i, 11) * 0.04 }}
                  whileHover="hover"
                  onClick={() => onOpenPreview(k)}
                >
                  <div className="content-thumb">
                    <span className="kind-badge">{k.kategori}</span>
                    {isNew(k.tgl_upload) && <span className="badge-new" style={{ position: "absolute", top: 10, right: 10 }}>Baru</span>}
                    <motion.span variants={{ hover: { scale: 1.08 } }}>{ICONS[k.kategori] || "📁"}</motion.span>
                  </div>
                  <div className="content-body">
                    <div className="title">{k.judul}</div>
                    <div className="content-meta">{k.sub_kategori || k.kategori} · {formatDate(k.tgl_upload)}</div>
                  </div>
                  <div className="content-actions">
                    <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={(e) => { e.stopPropagation(); onOpenPreview(k); }}>👁 Lihat</button>
                    <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={(e) => { e.stopPropagation(); onDownload(k); }}>⬇ Unduh</button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <p className="result-empty" style={{ padding: 40 }}>Materi tidak ditemukan. Coba ubah kata kunci atau filter kategori.</p>
        )}

        {filtered.length > visible && (
          <div style={{ textAlign: "center", marginTop: 24 }}>
            <button className="btn btn-outline" onClick={() => setVisible((v) => v + 24)}>Muat Lebih Banyak</button>
          </div>
        )}
      </div>
    </section>
  );
}
