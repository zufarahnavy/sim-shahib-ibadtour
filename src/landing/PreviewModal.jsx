import { motion, AnimatePresence } from "framer-motion";

function formatDate(d) {
  try { return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }); }
  catch (e) { return d; }
}

export default function PreviewModal({ item, onClose, onDownload }) {
  return (
    <AnimatePresence>
      {item && (
        <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            className="modal modal-xl"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
          >
            <button className="modal-close" onClick={onClose}>✕</button>
            <h3 className="t-title">{item.judul}</h3>
            <p className="t-body" style={{ marginBottom: 16 }}>{item.kategori} · {item.sub_kategori || "-"} · Diunggah {formatDate(item.tgl_upload)}</p>
            <div style={{ background: "var(--bg)", borderRadius: "var(--r-input)", minHeight: 360, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {item.kategori === "Gambar" ? (
                <img src={item.link_embed} style={{ maxWidth: "100%", maxHeight: 480, objectFit: "contain" }} alt={item.judul} />
              ) : (
                <iframe src={item.link_embed} style={{ width: "100%", height: 480, border: 0 }} title={item.judul} allowFullScreen />
              )}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
              <motion.button className="btn btn-primary" whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }} onClick={() => onDownload(item)}>⬇ Unduh Materi</motion.button>
              <a className="btn btn-outline" href={item.link_embed || item.link_unduh} target="_blank" rel="noreferrer">Buka di Tab Baru</a>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
