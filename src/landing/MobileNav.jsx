export default function MobileNav({ onNav, onSwitchUser }) {
  return (
    <div className="mobile-nav">
      <a onClick={() => onNav("home")}>🏠<span>Beranda</span></a>
      <a onClick={() => onNav("katalog", "Dokumen")}>📄<span>Dokumen</span></a>
      <a onClick={() => onNav("katalog", "Video")}>🎬<span>Video</span></a>
      <a onClick={() => onNav("katalog", "Gambar")}>🖼<span>Gambar</span></a>
      <a onClick={onSwitchUser}>👤<span>Akun</span></a>
    </div>
  );
}
