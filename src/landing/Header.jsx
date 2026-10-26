import { motion } from "framer-motion";

export default function Header({ user, pengaturan, activeSection, onNav, onSearchFocus, onSwitchUser }) {
  const initials = user.nama_lengkap.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const logo = pengaturan.logo_terang || pengaturan.logo_gelap || "./assets/logo-terang.svg";

  const navItems = [
    { id: "home", label: "Beranda" },
    { id: "katalog", label: "Dokumen", cat: "Dokumen" },
    { id: "katalog", label: "Video", cat: "Video" },
    { id: "katalog", label: "Gambar", cat: "Gambar" },
    { id: "tentang", label: "Tentang Kami" },
    { id: "kontak", label: "Kontak" }
  ];

  return (
    <motion.header className="site-header" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }}>
      <div className="container">
        <a href="#home" className="brand" onClick={(e) => { e.preventDefault(); onNav("home"); }}>
          <img src={logo} alt="Logo" onError={(e) => (e.target.style.display = "none")} />
          <span className="brand-text"><b>SHAHIB IBAD TOUR</b><span>Perjalanan Penuh Cinta</span></span>
        </a>
        <nav className="main-nav">
          {navItems.map((item, i) => (
            <a
              key={item.label}
              className={activeSection === item.id && (!item.cat || true) ? (item.id === activeSection ? "active" : "") : ""}
              onClick={() => onNav(item.id, item.cat)}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="header-actions">
          <button className="btn btn-ghost" onClick={onSearchFocus} title="Cari materi" aria-label="Cari">🔎</button>
          <motion.div className="user-chip" onClick={onSwitchUser} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <span className="user-avatar">{initials || "G"}</span>
            <span>{user.jenis === "Guest" ? "Guest" : user.nama_lengkap}</span>
            <span style={{ color: "var(--charcoal-300)", fontSize: 11 }}>⇄</span>
          </motion.div>
        </div>
      </div>
    </motion.header>
  );
}
