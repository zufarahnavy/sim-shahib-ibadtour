import { useState } from "react";
import { motion } from "framer-motion";
import { callApi } from "../lib/api.js";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const childUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function Kontak({ kontak, toast }) {
  const [form, setForm] = useState({ nama: "", status: "Mitra / Agen", wa: "", topik: "Pertanyaan Umum", pesan: "" });
  const [sent, setSent] = useState(false);

  function submit(e) {
    e.preventDefault();
    callApi("kirimPesanKontak", form).catch(() => {});
    setSent(true);
    toast("Pesan terkirim, terima kasih!", "success");
    setForm({ nama: "", status: "Mitra / Agen", wa: "", topik: "Pertanyaan Umum", pesan: "" });
  }

  return (
    <section id="kontak">
      <div className="container">
        <div className="section-head"><span className="kicker">Narahubung</span><h2 className="t-headline-lg">Kantor Operasional</h2></div>
        <motion.div className="contact-tiles" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}>
          <motion.div className="card card-pad" variants={childUp}><b className="t-label-sm" style={{ color: "var(--gold-deep)" }}>Alamat</b><p className="t-body" style={{ margin: "6px 0 0" }}>{kontak.alamat}</p></motion.div>
          <motion.div className="card card-pad" variants={childUp}><b className="t-label-sm" style={{ color: "var(--gold-deep)" }}>Telepon / WA</b><p className="t-body" style={{ margin: "6px 0 0" }}>{kontak.telp}</p></motion.div>
          <motion.div className="card card-pad" variants={childUp}><b className="t-label-sm" style={{ color: "var(--gold-deep)" }}>Email</b><p className="t-body" style={{ margin: "6px 0 0" }}>{kontak.email}</p></motion.div>
        </motion.div>

        <motion.div className="help-section" initial={{ opacity: 0, y: 26 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.7 }}>
          <h3 className="t-headline" style={{ margin: "0 0 8px" }}>Bantuan Mitra</h3>
          <p style={{ color: "#C9C9C6", fontSize: 14 }}>Tim kami siap membantu kebutuhan Mitra &amp; Agen seputar materi syiar.</p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "18px 0" }}>
            <motion.a className="btn btn-primary" href={`https://wa.me/${kontak.wa}`} target="_blank" rel="noreferrer" whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}>WhatsApp CS</motion.a>
            <a className="btn btn-outline on-dark" href={`tel:${kontak.telp}`}>Hotline</a>
            <a className="btn btn-outline on-dark" href={`mailto:${kontak.email}`}>Email</a>
          </div>
          <div className="help-grid">
            <div>
              <p style={{ fontSize: 13, color: "#C9C9C6", lineHeight: 1.8 }}>
                ✓ Waktu tanggap cepat &lt; 24 jam<br />✓ Kerahasiaan data Mitra terjaga<br />✓ Verifikasi ID agen sebelum akses sensitif
              </p>
            </div>
            <form onSubmit={submit}>
              <div className="field"><input className="input" placeholder="Nama Lengkap" required value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} /></div>
              <div className="field">
                <select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option>Mitra / Agen</option><option>Calon Mitra</option><option>Jamaah</option><option>Lainnya</option>
                </select>
              </div>
              <div className="field"><input className="input" placeholder="Nomor WhatsApp" required value={form.wa} onChange={(e) => setForm({ ...form, wa: e.target.value })} /></div>
              <div className="field">
                <select className="select" value={form.topik} onChange={(e) => setForm({ ...form, topik: e.target.value })}>
                  <option>Pertanyaan Umum</option><option>Kendala Akses Materi</option><option>Pendaftaran Mitra</option><option>Lainnya</option>
                </select>
              </div>
              <div className="field"><textarea className="input" rows={3} placeholder="Pesan Anda" required value={form.pesan} onChange={(e) => setForm({ ...form, pesan: e.target.value })} /></div>
              <motion.button type="submit" className="btn btn-primary btn-block" whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>Kirim Pesan</motion.button>
              {sent && <p style={{ color: "var(--gold-bright)", fontSize: 13, marginTop: 10 }}>✓ Pesan terkirim, tim kami akan segera menghubungi Anda.</p>}
            </form>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
