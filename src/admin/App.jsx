import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Login from "./Login.jsx";
import Sidebar, { NAV } from "./Sidebar.jsx";
import Dashboard from "./Dashboard.jsx";
import KontenPage from "./KontenPage.jsx";
import SubKategoriPage from "./SubKategoriPage.jsx";
import MitraPage from "./MitraPage.jsx";
import CrmPage from "./CrmPage.jsx";
import NotifikasiPage from "./NotifikasiPage.jsx";
import LaporanPage from "./LaporanPage.jsx";
import TampilanPage from "./TampilanPage.jsx";
import ToastStack from "../landing/ToastStack.jsx";
import { useToast } from "../lib/useToast.js";
import { getSessionToken, setSessionToken } from "../lib/api.js";

const PAGES = {
  dashboard: Dashboard,
  konten: KontenPage,
  subkategori: SubKategoriPage,
  mitra: MitraPage,
  crm: CrmPage,
  notifikasi: NotifikasiPage,
  laporan: LaporanPage,
  tampilan: TampilanPage
};

export default function App() {
  const [authed, setAuthed] = useState(!!getSessionToken());
  const [page, setPage] = useState("dashboard");
  const { toasts, toast } = useToast();

  useEffect(() => {
    document.title = "Admin — SIM SHAHIB IbadTour";
  }, []);

  function handleLogout() {
    setSessionToken("");
    setAuthed(false);
  }

  if (!authed) {
    return (
      <>
        <ToastStack toasts={toasts} />
        <Login onSuccess={() => setAuthed(true)} toast={toast} />
      </>
    );
  }

  const ActivePage = PAGES[page] || Dashboard;
  const label = (NAV.find((n) => n.id === page) || {}).label || "";

  return (
    <div className="admin-shell">
      <ToastStack toasts={toasts} />
      <Sidebar page={page} setPage={setPage} onLogout={handleLogout} />
      <main className="admin-main">
        <header className="admin-topbar">
          <h1 className="t-title">{label}</h1>
        </header>
        <div className="admin-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <ActivePage toast={toast} />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
