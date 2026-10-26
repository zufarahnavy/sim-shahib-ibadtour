const NAV = [
  { id: "dashboard", label: "📊 Dashboard" },
  { id: "konten", label: "🗂 Kelola Konten" },
  { id: "subkategori", label: "🏷 Sub-Kategori" },
  { id: "mitra", label: "🤝 Kelola Mitra" },
  { id: "crm", label: "📇 CRM & Kontak" },
  { id: "notifikasi", label: "💬 Notifikasi WA" },
  { id: "laporan", label: "📈 Riwayat & Laporan" },
  { id: "tampilan", label: "🎨 Pengaturan Tampilan" }
];

export default function Sidebar({ page, setPage, onLogout }) {
  return (
    <aside className="admin-sidebar">
      <div className="brand">
        <img src="./assets/logo-gelap.svg" style={{ height: 30 }} onError={(e) => (e.target.style.display = "none")} />
        <span className="brand-text"><b>SHAHIB IBAD TOUR</b><span style={{ color: "var(--gold-bright)" }}>Admin Panel</span></span>
      </div>
      <nav className="admin-nav">
        {NAV.map((n) => (
          <a key={n.id} className={page === n.id ? "active" : ""} onClick={() => setPage(n.id)}>{n.label}</a>
        ))}
      </nav>
      <div style={{ flex: 1 }} />
      <a href="./index.html" target="_blank" style={{ color: "#C9C9C6", fontSize: 13, padding: "10px 14px" }}>🔗 Lihat Landing Page</a>
      <a onClick={onLogout} style={{ color: "#C9C9C6", fontSize: 13, padding: "10px 14px", cursor: "pointer" }}>↩ Keluar</a>
    </aside>
  );
}

export { NAV };
