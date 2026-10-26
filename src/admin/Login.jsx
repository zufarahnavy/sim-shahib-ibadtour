import { useState } from "react";
import { motion } from "framer-motion";
import { callApi, setSessionToken } from "../lib/api.js";

export default function Login({ onSuccess, toast }) {
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");

  async function loginEmergency(e) {
    e.preventDefault();
    setError("");
    try {
      const res = await callApi("loginEmergency", { password: pass });
      setSessionToken(res.data.token);
      onSuccess(res.data.admin);
    } catch (err) {
      setError(err.message || "Password salah.");
    }
  }

  function loginGoogle() {
    toast("Hubungkan Google Client ID Anda di src/lib/config.js untuk login OAuth penuh.", "");
  }

  return (
    <div className="overlay" style={{ position: "fixed", background: "var(--charcoal-900)" }}>
      <motion.div
        className="modal"
        style={{ textAlign: "center" }}
        initial={{ opacity: 0, scale: 0.94, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
      >
        <div className="entry-logo"><img src="./assets/logo-gelap.svg" style={{ height: 46 }} onError={(e) => (e.target.style.display = "none")} /></div>
        <h2 className="t-headline" style={{ marginBottom: 4 }}>Login Superadmin</h2>
        <p className="t-body" style={{ marginBottom: 22 }}>Khusus pengelola SIM SHAHIB IbadTour.</p>

        <motion.button className="btn btn-dark btn-block" whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={loginGoogle}>
          🔑 Masuk dengan Google
        </motion.button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0", color: "var(--charcoal-300)", fontSize: 12 }}>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />ATAU<div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>

        <form onSubmit={loginEmergency}>
          <div className="field" style={{ textAlign: "left" }}>
            <label className="field-label">Password Darurat</label>
            <input type="password" className="input" placeholder="Masukkan password darurat" required value={pass} onChange={(e) => setPass(e.target.value)} />
          </div>
          <motion.button className="btn btn-outline btn-block" type="submit" whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
            Masuk dengan Password Darurat
          </motion.button>
        </form>
        {error && <p style={{ color: "var(--error)", fontSize: 13, marginTop: 14 }}>{error}</p>}
        <a href="./index.html" style={{ display: "block", marginTop: 20, fontSize: 12, color: "var(--charcoal-300)" }}>← Kembali ke Landing Page</a>
      </motion.div>
    </div>
  );
}
