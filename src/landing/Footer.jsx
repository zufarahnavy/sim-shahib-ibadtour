export default function Footer({ kontak, pengaturan }) {
  const logo = pengaturan.logo_gelap || "./assets/logo-gelap.svg";
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="brand" style={{ color: "#fff", marginBottom: 10 }}>
              <img src={logo} alt="Logo" style={{ height: 34 }} onError={(e) => (e.target.style.display = "none")} />
              <span className="brand-text"><b style={{ color: "#fff" }}>SHAHIB IBAD TOUR</b><span style={{ color: "var(--gold-bright)" }}>Perjalanan Penuh Cinta</span></span>
            </div>
            <p style={{ fontSize: 13, maxWidth: 320 }}>Portal syiar digital resmi untuk Mitra &amp; Agen SHAHIB Ibad Tour.</p>
          </div>
          <div>
            <b style={{ color: "#fff", fontSize: 13 }}>Navigasi</b>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12, fontSize: 13 }}>
              <a href="#home">Beranda</a><a href="#katalog">Katalog Materi</a><a href="#tentang">Tentang Kami</a><a href="#kontak">Kontak</a>
            </div>
          </div>
          <div>
            <b style={{ color: "#fff", fontSize: 13 }}>Kontak</b>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12, fontSize: 13 }}>
              <span>{kontak.alamat}</span><span>{kontak.telp}</span><span>{kontak.email}</span>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} SHAHIB Ibad Tour. Seluruh hak cipta dilindungi.</span>
          <a href="./admin.html" style={{ opacity: 0.7 }}>🔒 Masuk Admin</a>
        </div>
      </div>
    </footer>
  );
}
