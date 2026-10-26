import { useEffect, useState } from "react";
import { callApi } from "../lib/api.js";

export default function NotifikasiPage({ toast }) {
  const [globalWA, setGlobalWA] = useState(false);
  const [globalEmail, setGlobalEmail] = useState(false);
  const [matriks, setMatriks] = useState([]);
  const [tokenMasked, setTokenMasked] = useState("—");
  const [newToken, setNewToken] = useState("");

  function load() {
    callApi("getNotifSettings").then((res) => {
      const d = res.data;
      setGlobalWA(!!d.globalWA); setGlobalEmail(!!d.globalEmail);
      setMatriks(d.matriks || []); setTokenMasked(d.fonnteTokenMasked || "belum diatur");
    }).catch((e) => toast(e.message, "error"));
  }
  useEffect(load, []);

  function updateMatriks(event, field, val) {
    setMatriks((m) => m.map((row) => (row.event === event ? { ...row, [field]: val } : row)));
  }

  async function saveMatriks() {
    try {
      await callApi("saveNotifSettings", { globalWA, globalEmail, matriks });
      toast("Pengaturan notifikasi disimpan.", "success");
    } catch (e) { toast(e.message, "error"); }
  }

  async function saveToken() {
    if (!newToken) return;
    try {
      await callApi("simpanSecretAllowlist", { key: "FONNTE_TOKEN", value: newToken });
      toast("Token Fonnte disimpan dengan aman.", "success");
      setNewToken(""); load();
    } catch (e) { toast(e.message, "error"); }
  }

  return (
    <div>
      <div className="card card-pad" style={{ marginBottom: 20 }}>
        <b className="t-title">Saklar Notifikasi</b>
        <div style={{ display: "flex", gap: 28, marginTop: 16, flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={globalWA} onChange={(e) => setGlobalWA(e.target.checked)} /> Notifikasi WhatsApp (Global)</label>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={globalEmail} onChange={(e) => setGlobalEmail(e.target.checked)} /> Notifikasi Email (Global)</label>
        </div>
      </div>
      <div className="card card-pad" style={{ marginBottom: 20 }}>
        <b className="t-title">Matriks Event Notifikasi</b>
        <table className="data-table" style={{ marginTop: 14 }}>
          <thead><tr><th>Event</th><th>WhatsApp</th><th>Email</th></tr></thead>
          <tbody>
            {matriks.map((m) => (
              <tr key={m.event}>
                <td>{m.event}</td>
                <td><input type="checkbox" checked={!!m.wa} onChange={(e) => updateMatriks(m.event, "wa", e.target.checked)} /></td>
                <td><input type="checkbox" checked={!!m.email} onChange={(e) => updateMatriks(m.event, "email", e.target.checked)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="btn btn-primary btn-sm" style={{ marginTop: 14 }} onClick={saveMatriks}>Simpan Pengaturan</button>
      </div>
      <div className="card card-pad">
        <b className="t-title">Kredensial Fonnte WhatsApp API</b>
        <p className="t-body" style={{ fontSize: 13 }}>Token disimpan aman di Script Properties backend, tidak pernah ditampilkan utuh.</p>
        <div className="field" style={{ maxWidth: 360, marginTop: 10 }}>
          <input className="input" type="password" placeholder="Masukkan token Fonnte baru..." value={newToken} onChange={(e) => setNewToken(e.target.value)} />
        </div>
        <button className="btn btn-outline btn-sm" onClick={saveToken}>Simpan Token</button>
        <p style={{ fontSize: 12, color: "var(--charcoal-300)", marginTop: 8 }}>Status: {tokenMasked}</p>
      </div>
    </div>
  );
}
