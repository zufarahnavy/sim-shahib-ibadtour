/* ==========================================================================
   SIM SHAHIB IbadTour — Konfigurasi Frontend
   Ganti GAS_URL di bawah dengan URL Web App hasil deploy Google Apps Script
   kamu (lihat PANDUAN_INSTALASI.md). Jangan simpan API KEY/secret apa pun
   di file ini — semua credential rahasia disimpan di Script Properties
   backend (lihat skill gas-rahasia-script-properties).
   ========================================================================== */
window.SIM_CONFIG = {
  // URL Web App Google Apps Script (hasil Deploy > New deployment > Web app)
  GAS_URL: "https://script.google.com/macros/s/AKfycbydAry3O1NZaH47RaMf5yf6q0_xo9YppGczdlv63KlEf04A_nEzv1ppugQsVXE7FRS-vA/exec",

  APP_NAME: "SIM SHAHIB IbadTour",
  APP_TAGLINE: "Perjalanan Penuh Cinta",

  // Default logo fallback (dipakai jika admin belum upload logo custom)
  DEFAULT_LOGO_LIGHT: "assets/logo-terang.svg",
  DEFAULT_LOGO_DARK: "assets/logo-gelap.svg",

  // Masa berlaku cache data katalog di browser (ms) — selaras dgn cache 6 jam di server
  CLIENT_CACHE_TTL: 1000 * 60 * 30, // 30 menit di sisi klien (server tetap 6 jam)

  // Kontak bantuan (fallback jika Pengaturan backend belum terisi)
  CONTACT: {
    alamat: "Panji Laras Indah No. 83, Tegalbago, Kec. Arjasa, Kabupaten Jember, Jawa Timur 68191",
    telp: "+62 811-355-567",
    email: "Ibadtour@gmail.com",
    wa: "62811355567"
  }
};
