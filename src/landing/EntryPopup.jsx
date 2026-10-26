import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { callApi, cacheGet, cacheSet } from "../lib/api.js";

function highlightMatch(text, q) {
  if (!text) return "";
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

export default function EntryPopup({ pengaturan, onEnter }) {
  const [tab, setTab] = useState("mitra");
  const [mitraList, setMitraList] = useState([]);
  const [term, setTerm] = useState("");
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef(null);

  useEffect(() => {
    const cached = cacheGet("mitraList");
    if (cached) setMitraList(cached.value);
    callApi("getMitraList")
      .then((res) => {
        setMitraList(res.data || []);
        cacheSet("mitraList", res.data || []);
      })
      .catch(() => {});
  }, []);

  const q = term.trim().toLowerCase();
  const matches = q
    ? mitraList
        .filter((m) => m.status === "aktif")
        .filter(
          (m) =>
            m.nama_lengkap.toLowerCase().includes(q) ||
            (m.kode_agen || "").toLowerCase().includes(q) ||
            (m.domisili || "").toLowerCase().includes(q)
        )
        .sort((a, b) => a.nama_lengkap.localeCompare(b.nama_lengkap))
        .slice(0, 8)
    : [];

  function selectMitra(m) {
    const user = { jenis: "Mitra", id_mitra: m.id_mitra, nama_lengkap: m.nama_lengkap, kode_agen: m.kode_agen, domisili: m.domisili };
    callApi("logAkses", { jenis: "Mitra", id_mitra: m.id_mitra }).catch(() => {});
    onEnter(user);
  }
  function enterGuest() {
    const user = { jenis: "Guest", id_mitra: "GUEST", nama_lengkap: "Guest", kode_agen: "-", domisili: "-" };
    callApi("logAkses", { jenis: "Guest", id_mitra: "GUEST" }).catch(() => {});
    onEnter(user);
  }

  function onKeyDown(e) {
    if (!matches.length) return;
    if (e.key === "ArrowDown") { setActiveIdx((i) => Math.min(i + 1, matches.length - 1)); e.preventDefault(); }
    else if (e.key === "ArrowUp") { setActiveIdx((i) => Math.max(i - 1, 0)); e.preventDefault(); }
    else if (e.key === "Enter" && activeIdx >= 0) { selectMitra(matches[activeIdx]); }
  }

  const waLink = `https://wa.me/${(pengaturan.kontak && pengaturan.kontak.wa) || "62811355567"}`;
  const logo = (pengaturan.logo_gelap) || "./assets/logo-gelap.svg";

  return (
    <div className="overlay" style={{ position: "fixed" }}>
      <motion.div
        className="modal"
        style={{ textAlign: "center" }}
        initial={{ opacity: 0, scale: 0.94, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
      >
        <div className="entry-logo"><img src={logo} alt="Logo SHAHIB Ibad Tour" onError={(e) => (e.target.style.display = "none")} /></div>
        <span className="badge-pill" style={{ background: "var(--gold-tint)", borderColor: "var(--gold)", color: "var(--gold-deep)" }}>
          PERJALANAN PENUH CINTA
        </span>
        <h2 className="t-headline" style={{ margin: "14px 0 6px" }}>Selamat Datang di Portal Syiar Digital</h2>
        <p className="t-body" style={{ marginBottom: 20 }}>Masuk sebagai Mitra/Agen untuk pengalaman personal, atau lanjut sebagai Pengunjung Umum.</p>

        <div className="entry-toggle">
          <button className={tab === "mitra" ? "active" : ""} onClick={() => setTab("mitra")}>Mitra / Agen</button>
          <button className={tab === "guest" ? "active" : ""} onClick={() => setTab("guest")}>Pengunjung Umum</button>
        </div>

        {tab === "mitra" ? (
          <div>
            <div className="field" style={{ textAlign: "left" }}>
              <input
                ref={inputRef}
                type="text"
                className="input"
                placeholder="Cari nama, kode agen, atau domisili..."
                autoComplete="off"
                value={term}
                onChange={(e) => { setTerm(e.target.value); setActiveIdx(-1); }}
                onKeyDown={onKeyDown}
              />
            </div>
            <AnimatePresence>
              {q && (
                <motion.div
                  className="search-results"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  {matches.length ? (
                    matches.map((m, i) => (
                      <div
                        key={m.id_mitra}
                        className={`result-item ${i === activeIdx ? "kbd-active" : ""}`}
                        onClick={() => selectMitra(m)}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{highlightMatch(m.nama_lengkap, q)}</div>
                          <div style={{ fontSize: 12, color: "var(--charcoal-300)" }}>
                            {highlightMatch(m.kode_agen || "", q)} · {highlightMatch(m.domisili || "", q)}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="result-empty">Nama tidak ditemukan, coba kata kunci lain atau masuk sebagai Guest.</div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            <p style={{ fontSize: 11, color: "var(--charcoal-300)", marginTop: 8 }}>Gunakan ↑ ↓ untuk navigasi, Enter untuk memilih.</p>
          </div>
        ) : (
          <div>
            <p className="t-body" style={{ marginBottom: 18 }}>
              Anda akan masuk sebagai <b>Pengunjung Umum (Guest)</b> dengan akses materi yang sama seperti Mitra.
            </p>
            <motion.button className="btn btn-primary btn-block" whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={enterGuest}>
              Masuk sebagai Guest
            </motion.button>
          </div>
        )}

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)", fontSize: 12, color: "var(--charcoal-300)" }}>
          Butuh bantuan masuk? <a href={waLink} style={{ color: "var(--gold-deep)", fontWeight: 700 }}>Hubungi CS Kami</a>
          &nbsp;·&nbsp; <a href="./admin.html" style={{ color: "var(--charcoal-300)" }}>Login Khusus Admin</a>
        </div>
      </motion.div>
    </div>
  );
}
