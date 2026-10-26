import { useEffect, useRef, useState } from "react";
import { callApi, cacheGet, cacheSet } from "../lib/api.js";
import { CONFIG } from "../lib/config.js";
import { useToast } from "../lib/useToast.js";

import EntryPopup from "./EntryPopup.jsx";
import Header from "./Header.jsx";
import SeasonBanner from "./SeasonBanner.jsx";
import Hero from "./Hero.jsx";
import Katalog from "./Katalog.jsx";
import About from "./About.jsx";
import Kontak from "./Kontak.jsx";
import Footer from "./Footer.jsx";
import PreviewModal from "./PreviewModal.jsx";
import ToastStack from "./ToastStack.jsx";
import MobileNav from "./MobileNav.jsx";

const DEFAULT_PENGATURAN = {
  logo_terang: "", logo_gelap: "",
  banner: { judul: "Materi Syiar Terbaru, Siap Disebarkan", subjudul: "Satu portal untuk seluruh Mitra & Agen — dokumen, video, dan flyer resmi musim ini, diperbarui setiap pekan.", musim: "Musim Umrah & Haji 1446–1447 H", gambar: "" },
  about: { story: "Lebih dari 13 tahun, kami hadir membimbing jamaah dengan penuh keikhlasan dan kekeluargaan.", gambar: "", pilar: [] },
  legalitas: [],
  kontak: CONFIG.CONTACT
};

export default function App() {
  const { toasts, toast } = useToast();
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sim_user")); } catch (e) { return null; }
  });
  const [konten, setKonten] = useState([]);
  const [subKategori, setSubKategori] = useState([]);
  const [pengaturan, setPengaturan] = useState(DEFAULT_PENGATURAN);
  const [previewItem, setPreviewItem] = useState(null);
  const [activeSection, setActiveSection] = useState("home");

  // Katalog filter state lives here so header/mobile-nav can drive it too
  const [category, setCategory] = useState("Semua");
  const [sub, setSub] = useState(null);
  const [term, setTerm] = useState("");
  const [visible, setVisible] = useState(24);

  const searchInputRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const cachedK = cacheGet("katalog");
    if (cachedK) { setKonten(cachedK.value.konten || []); setSubKategori(cachedK.value.subKategori || []); }

    callApi("getKatalog")
      .then((res) => {
        setKonten(res.data.konten || []);
        setSubKategori(res.data.subKategori || []);
        cacheSet("katalog", res.data);
      })
      .catch(() => toast("Gagal memuat katalog materi. Menampilkan data tersimpan.", "error"));

    callApi("getPengaturan")
      .then((res) => setPengaturan({ ...DEFAULT_PENGATURAN, ...res.data }))
      .catch(() => {});
  }, [user]);

  function handleEnter(u) {
    setUser(u);
    localStorage.setItem("sim_user", JSON.stringify(u));
  }

  function handleSwitchUser() {
    if (!confirm("Bukan Anda? Ganti nama pengguna sekarang?")) return;
    localStorage.removeItem("sim_user");
    setUser(null);
  }

  function goto(id, cat) {
    if (cat) { setCategory(cat); setSub(null); setVisible(24); }
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  function focusSearch() {
    goto("katalog");
    setTimeout(() => searchInputRef.current?.focus(), 400);
  }

  function handleDownload(item) {
    window.open(item.link_unduh || item.link_embed, "_blank");
    callApi("logUnduhan", { jenis: user.jenis, id_mitra: user.id_mitra, id_konten: item.id_konten, judul: item.judul, kategori: item.kategori }).catch(() => {});
    toast("Mengunduh: " + item.judul, "success");
  }

  if (!user) {
    return (
      <>
        <EntryPopup pengaturan={pengaturan} onEnter={handleEnter} />
        <ToastStack toasts={toasts} />
      </>
    );
  }

  const kontak = { ...CONFIG.CONTACT, ...pengaturan.kontak };

  return (
    <>
      <Header user={user} pengaturan={pengaturan} activeSection={activeSection} onNav={goto} onSearchFocus={focusSearch} onSwitchUser={handleSwitchUser} />
      <SeasonBanner banner={pengaturan.banner} onCta={() => goto("katalog")} />
      <Hero user={user} fileAktifCount={konten.filter((k) => k.status === "aktif").length} onGoto={goto} />

      <main>
        <Katalog
          konten={konten} subKategori={subKategori} searchInputRef={searchInputRef}
          onOpenPreview={setPreviewItem} onDownload={handleDownload}
          category={category} setCategory={setCategory} sub={sub} setSub={setSub}
          term={term} setTerm={setTerm} visible={visible} setVisible={setVisible}
        />
        <About about={pengaturan.about} legalitas={pengaturan.legalitas} />
        <Kontak kontak={kontak} toast={toast} />
      </main>

      <Footer kontak={kontak} pengaturan={pengaturan} />
      <MobileNav onNav={goto} onSwitchUser={handleSwitchUser} />
      <PreviewModal item={previewItem} onClose={() => setPreviewItem(null)} onDownload={handleDownload} />
      <ToastStack toasts={toasts} />
    </>
  );
}
