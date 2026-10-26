# Panduan Instalasi — SIM SHAHIB IbadTour (Versi React + Framer Motion)

Aplikasi ini terdiri dari **2 bagian terpisah**:

1. **Backend** — Google Apps Script sebagai REST API murni (JSON), menyimpan data di Google Sheets & Drive. **Tidak berubah** dari versi sebelumnya.
2. **Frontend** — kini dibangun dengan **React + Vite + Framer Motion** (sebelumnya HTML/CSS/JS vanilla), di-deploy ke GitHub Pages sebagai hasil **build statis**, berkomunikasi ke backend lewat `fetch()`.

Tidak ada iframe, tidak ada `google.script.run` — keduanya berkomunikasi murni lewat HTTP (pola **gas-pro-api**).

> **Jika sebelumnya Anda sudah pernah men-deploy versi vanilla JS**: backend (file `.gs`) **tidak perlu diubah sama sekali**. Anda hanya perlu mengganti isi repository GitHub Pages dengan hasil build React yang baru (lihat Bagian 3). URL Web App GAS Anda yang sudah ada tetap dipakai.

---

## BAGIAN 1 — Setup Backend (Google Apps Script)

Jika Anda **belum pernah** men-setup backend, ikuti langkah ini. Jika sudah pernah (versi sebelumnya), **lewati ke Bagian 2** — backend tidak berubah.

### 1.1 Buat Project Apps Script
1. Buka [script.google.com](https://script.google.com) → **New Project**.
2. Ganti nama project menjadi `SIM SHAHIB IbadTour - Backend`.

### 1.2 Salin Semua File Backend
Di panel kiri editor, buat file baru untuk setiap berkas berikut (klik ikon **+** → *Script*), lalu salin isi dari file yang sudah dikirimkan satu per satu ke Anda:

| Nama file di Apps Script | Isi dari |
|---|---|
| `Kode.gs` (file default) | `Kode.gs` |
| `Setup.gs` | `Setup.gs` |
| `Auth.gs` | `Auth.gs` |
| `Konten.gs` | `Konten.gs` |
| `Mitra.gs` | `Mitra.gs` |
| `Laporan.gs` | `Laporan.gs` |
| `Pengaturan.gs` | `Pengaturan.gs` |
| `Notifikasi_CRM.gs` | `Notifikasi_CRM.gs` |

Lalu buka **Project Settings (⚙) → Show "appsscript.json" manifest file**, dan timpa isinya dengan isi file `appsscript.json` yang dikirimkan.

### 1.3 Jalankan Setup Otomatis (idempotent — aman dijalankan ulang)
1. Di toolbar atas, pilih fungsi `setupAppEnvironment` dari dropdown.
2. Klik **Run** (▶). Saat diminta izin, klik **Review permissions** → pilih akun Google Anda → **Allow**.
3. Buka tab **Executions** (ikon jam) untuk memastikan tidak ada error. Log akan menunjukkan Spreadsheet & Folder Drive baru telah dibuat.
4. Fungsi ini membuat:
   - Spreadsheet `SIM_SHAHIB_IbadTour_Database` berisi semua sheet (Konten, Mitra, Log_Akses, dst).
   - Folder Drive `SIM_SHAHIB_IbadTour_Data` untuk upload materi & logo.
   - Semua ID tersebut otomatis disimpan ke **Script Properties** (lihat 1.4).
   - Password darurat default: `ubah-password-ini-123` — **WAJIB diganti**, lihat 1.5.

### 1.4 Verifikasi Script Properties
Buka **Project Settings (⚙) → Script Properties**. Pastikan key berikut terisi otomatis:
- `SPREADSHEET_ID`, `FOLDER_UPLOAD_ID`, `FOLDER_LOGO_ID`
- `SESSION_SECRET`, `EMERGENCY_PASS_HASH`, `EMERGENCY_PASS_SALT`

Tambahkan manual (opsional, sesuai kebutuhan):
- `GOOGLE_CLIENT_ID` — jika akan mengaktifkan login Google OAuth untuk admin.
- `FONNTE_TOKEN` — token API WhatsApp dari [fonnte.com](https://fonnte.com) (atau isi lewat panel Admin → Notifikasi WA, lebih aman karena tidak perlu buka editor).

> Semua credential ini **tidak pernah** ditulis di kode atau dikirim ke frontend — hanya dibaca di sisi server. Lihat `Kode.gs` fungsi `CONFIG_()`.

### 1.5 Ganti Password Darurat
> Catatan: fungsi yang namanya diakhiri garis bawah (`_`) seperti `setEmergencyPassword_` adalah fungsi "privat" — **tidak akan muncul** di dropdown "Select function" pada toolbar Apps Script. Untuk menjalankannya, bungkus dulu dengan fungsi biasa (tanpa garis bawah di akhir) seperti berikut.

1. Buka file `Setup.gs`, scroll ke paling bawah, tambahkan sementara:
   ```js
   function GANTI_PASSWORD_SEKARANG() {
     setEmergencyPassword_("PASSWORD_BARU_ANDA");
   }
   ```
2. **Save** (Ctrl+S), lalu pilih `GANTI_PASSWORD_SEKARANG` dari dropdown toolbar → klik **Run** (▶).
3. Cek tab **Executions** — pastikan tidak ada error.
4. Hapus kembali 3 baris kode di atas dari `Setup.gs` dan Save ulang, agar password baru tidak tertinggal di kode.

### 1.6 Tambahkan Email Admin
1. Dengan cara yang sama, tambahkan sementara di `Setup.gs`:
   ```js
   function TAMBAH_ADMIN_SEKARANG() {
     tambahAdmin_("email-admin-anda@gmail.com");
   }
   ```
2. Save → pilih `TAMBAH_ADMIN_SEKARANG` dari dropdown → **Run**. Email ini yang akan bisa login via Google OAuth di panel admin.
3. Hapus kembali 3 baris kode tersebut setelah berhasil, lalu Save ulang.

### 1.7 Deploy sebagai Web App
1. Klik **Deploy → New deployment**.
2. Pilih tipe **Web app**.
3. Isi:
   - **Execute as:** `Me` (akun Anda)
   - **Who has access:** `Anyone`
4. Klik **Deploy**, salin **Web app URL** yang muncul (formatnya `https://script.google.com/macros/s/XXXXX/exec`).
5. Setiap kali Anda mengubah kode backend, lakukan **Deploy → Manage deployments → Edit (ikon pensil) → New version → Deploy** agar perubahan terbit tanpa mengganti URL.

---

## BAGIAN 2 — Build Frontend React (Perlu Node.js)

Berbeda dari versi vanilla, frontend React **harus di-"build"** dulu menjadi file statis sebelum bisa di-deploy. Proses ini dilakukan **sekali di komputer Anda**, hasilnya berupa folder `dist/` yang siap diupload.

### 2.1 Install Node.js (jika belum ada)
1. Unduh dan install dari [nodejs.org](https://nodejs.org) — pilih versi **LTS**.
2. Cek dengan membuka Terminal/Command Prompt: `node --version` (harus muncul versi, misal `v20.x.x`).

### 2.2 Ekstrak Project & Install Dependencies
1. Ekstrak ZIP project React yang dikirimkan ke lokasi pilihan Anda, misalnya ke Desktop, sehingga Anda mendapat folder **`sim-shahib-react`**.
2. Buka Terminal/Command Prompt, arahkan ke folder tersebut:
   ```bash
   cd /lokasi/folder/sim-shahib-react
   npm install
   ```
   Tunggu sampai proses selesai (mengunduh React, Framer Motion, Chart.js, Vite, dll — sekali saja, butuh koneksi internet).

### 2.3 Atur URL Backend
1. Buka file `src/lib/config.js` dengan text editor (Notepad, VS Code, dll).
2. Ganti baris:
   ```js
   GAS_URL: "PASTE_URL_WEBAPP_GAS_ANDA_DI_SINI",
   ```
   dengan URL Web App dari langkah 1.7 (atau URL GAS yang sudah Anda pakai sebelumnya), contoh:
   ```js
   GAS_URL: "https://script.google.com/macros/s/XXXXXXXXXXXX/exec",
   ```
3. Simpan file.

### 2.4 Build Project
Masih di Terminal, folder yang sama:
```bash
npm run build
```
Jika berhasil, akan muncul ringkasan ukuran file dan folder baru bernama **`dist/`** akan muncul di dalam folder project. **Folder `dist/` inilah yang di-deploy ke GitHub Pages**, bukan folder `src/`.

> Mau melihat tampilan dulu sebelum deploy? Jalankan `npm run dev`, lalu buka URL `http://localhost:5173` yang muncul di Terminal (tekan Ctrl+C untuk berhenti).

---

## BAGIAN 3 — Deploy Hasil Build ke GitHub Pages

> Panduan ini untuk pengguna yang **belum pernah** menggunakan Git/GitHub. Jika repository GitHub Anda sudah ada dari deploy versi sebelumnya, langsung ke langkah 3.5.

### 3.1 Install Git
- **Windows:** unduh dari [git-scm.com](https://git-scm.com/download/win), install dengan opsi default.
- **Mac:** buka Terminal, jalankan `git --version` — jika belum ada, ikuti instruksi instalasi yang muncul.

### 3.2 Buat Akun & Repository GitHub (lewati jika sudah ada)
1. Buat akun di [github.com](https://github.com) jika belum punya.
2. Klik **New repository** → beri nama misalnya `sim-shahib-ibadtour` → pilih **Public** → **JANGAN** centang "Add a README file" → **Create repository**.

### 3.3 Atur Identitas Git (sekali saja per komputer)
```bash
git config --global user.name "Nama Anda"
git config --global user.email "email@anda.com"
```

### 3.4 Pastikan `index.html` Ada di Root Folder `dist/`
Setelah `npm run build` (Bagian 2.4), isi folder `dist/` harus seperti ini:
```
dist/
├── index.html      ← landing page, root repo
├── admin.html      ← panel admin
└── assets/...      ← CSS, JS, gambar hasil build
```
`index.html` harus berada **langsung** di dalam folder `dist/` (bukan di dalam subfolder lain), karena inilah yang akan menjadi root repository GitHub Pages.

### 3.5 Push Isi Folder `dist/` ke GitHub

**Jika ini adalah deploy pertama kali (belum ada repo git):**
```bash
cd /lokasi/folder/sim-shahib-react/dist
git init
git add .
git commit -m "Deploy React v2"
git branch -M main
git remote add origin https://github.com/USERNAME-ANDA/sim-shahib-ibadtour.git
git push -u origin main
```

**Jika sebelumnya sudah pernah deploy versi vanilla JS ke repo yang sama** (repo sudah ada isinya), cara paling aman adalah mengganti isi repo lokal Anda dengan isi `dist/` yang baru, lalu push ulang:
```bash
cd /lokasi/folder/sim-shahib-react
rm -rf deploy-tmp && mkdir deploy-tmp && cd deploy-tmp
git clone https://github.com/USERNAME-ANDA/sim-shahib-ibadtour.git .
# Hapus semua file lama (kecuali .git), lalu salin isi dist/ ke sini
# (di Windows gunakan File Explorer; di Mac/Linux: )
find . -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
cp -r ../dist/. .
git add .
git commit -m "Upgrade ke React + Framer Motion"
git push
```

Saat diminta login, masukkan username GitHub Anda, dan untuk password **gunakan Personal Access Token** (bukan password akun), karena GitHub tidak lagi menerima password biasa untuk operasi Git via HTTPS:
- Buat token di: GitHub → **Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token** (centang scope `repo`).
- Salin token tersebut dan tempel sebagai password saat diminta.

### 3.6 Aktifkan GitHub Pages (lewati jika sudah aktif sebelumnya)
1. Di halaman repository, buka **Settings → Pages**.
2. Pada **Branch**, pilih `main` dan folder `/ (root)` → **Save**.
3. Centang **Enforce HTTPS**.
4. Tunggu 1–2 menit, lalu buka URL yang muncul (format `https://USERNAME-ANDA.github.io/sim-shahib-ibadtour/`).

### 3.7 Redeploy Setelah Update Tampilan
Setiap kali Anda (atau developer Anda) mengubah file di folder `src/`, ulangi urutan ini:
```bash
cd /lokasi/folder/sim-shahib-react
npm run build
cd dist
git add .
git commit -m "Update tampilan"
git push
```
GitHub Pages otomatis memperbarui situs dalam 1–2 menit.

> **Catatan teknis:** folder `dist/` bukan folder git yang terhubung otomatis ke repo kecuali Anda sudah pernah `git init` + `git remote add` di dalamnya (seperti langkah 3.5 skenario pertama). Jika `dist/` dibuat ulang dari nol oleh `npm run build` setelah sebelumnya dihapus, folder `.git` di dalamnya ikut terhapus — jika itu terjadi, ulangi langkah 3.5.

---

## BAGIAN 4 — Masuk ke Aplikasi

- **Landing Page Mitra/Guest:** `https://USERNAME-ANDA.github.io/sim-shahib-ibadtour/`
- **Panel Admin:** `https://USERNAME-ANDA.github.io/sim-shahib-ibadtour/admin.html`
  - Login dengan **Password Darurat** yang sudah Anda ganti di langkah 1.5, atau
  - Login dengan **Google** menggunakan email yang didaftarkan di langkah 1.6 (perlu `GOOGLE_CLIENT_ID` di Script Properties + integrasi Google Identity Services tambahan — lihat catatan di bawah).

### Catatan Login Google OAuth
Tombol "Masuk dengan Google" di versi React saat ini masih berupa placeholder yang mengarahkan Anda untuk melengkapi konfigurasi. Untuk mengaktifkannya secara penuh:
1. Buat OAuth Client ID di [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (tipe *Web application*), tambahkan domain GitHub Pages Anda ke *Authorized JavaScript origins*.
2. Simpan Client ID tersebut ke Script Property `GOOGLE_CLIENT_ID`.
3. Tambahkan skrip Google Identity Services (`https://accounts.google.com/gsi/client`) ke `admin.html` dan hubungkan callback-nya di `src/admin/Login.jsx` (fungsi `loginGoogle`) untuk memanggil action `loginGoogle` dengan `id_token` yang diterima.

Sebelum itu dikonfigurasi, gunakan **Password Darurat** untuk mengelola aplikasi.

---

## BAGIAN 5 — Modul Tambahan: CRM & Notifikasi WhatsApp

1. Daftar di [fonnte.com](https://fonnte.com), hubungkan WhatsApp Anda, dan ambil **Token API**.
2. Di Panel Admin → **Notifikasi WA**, masukkan token tersebut pada kolom "Kredensial Fonnte WhatsApp API" → **Simpan Token**. Token akan tersimpan aman di Script Properties, tidak pernah tampil utuh di layar.
3. Aktifkan saklar **Notifikasi WhatsApp (Global)** dan atur matriks event mana yang mengirim notifikasi.
4. Buka menu **CRM & Kontak** untuk melihat kontak yang otomatis tersinkron dari data Mitra & pesan kontak masuk, lalu gunakan **Kirim Blast WA** untuk mengirim pesan massal (dengan jeda otomatis antar pesan untuk mencegah pemblokiran nomor).

---

## BAGIAN 6 — Cara Pakai Pengaturan Tampilan (Admin)

Di Panel Admin → **Pengaturan Tampilan**, tersedia kontrol penuh untuk:
- **Logo & Favicon** — unggah logo versi terang, versi gelap, dan favicon. Bisa dikembalikan ke bawaan kapan saja.
- **Banner Musim** — unggah gambar banner + ubah label musim/judul/subjudul. Jika gambar tidak diunggah, tampil ilustrasi siluet masjid bawaan beranimasi.
- **Section Tentang Kami** — unggah foto + ubah cerita singkat + ubah 4 kartu nilai/pilar (ikon emoji, judul, deskripsi).
- **Legalitas Kemenag** — ubah label & nilai dari 4 kartu legalitas.
- **Kontak** — alamat, telepon, email, WhatsApp.

Setiap bagian punya tombol **Simpan** sendiri — perubahan langsung tampil di landing page begitu disimpan (cache otomatis diperbarui), **tanpa perlu build/deploy ulang** karena konten ini disimpan di backend (Google Sheets), bukan di kode frontend.

## BAGIAN 7 — Link OneDrive: Embed vs Unduh Langsung

Di form **Kelola Konten**, saat memilih sumber "Link OneDrive", ada 2 kolom:
- **Link Embed** — untuk pratinjau di dalam aplikasi. Ambil dari OneDrive: klik kanan file → **Share** → **Embed** → salin URL di dalam `src="..."`.
- **Link Unduh Langsung** — untuk tombol Unduh. Ambil dari OneDrive: **Share** → **Copy Link** (akses "Anyone with the link"). Sistem otomatis menambahkan parameter `download=1` supaya file langsung terunduh, tidak membuka halaman pratinjau OneDrive dulu.

Isi minimal salah satu kolom; isi keduanya untuk hasil terbaik.

---

## Troubleshooting

| Masalah | Solusi |
|---|---|
| `npm install` atau `npm run build` gagal dengan error | Pastikan Node.js versi LTS terbaru terinstall (`node --version`). Hapus folder `node_modules` dan file `package-lock.json`, lalu jalankan `npm install` ulang. |
| Situs 404 di GitHub Pages | Pastikan `index.html` ada **langsung** di root repo (hasil `dist/`), bukan di dalam subfolder `src/` atau `sim-shahib-react/`. |
| Tampilan putih kosong / blank page | Buka Console browser (F12). Jika ada error path asset, pastikan Anda meng-upload isi folder `dist/` (bukan folder project React mentah) dan GitHub Pages diarahkan ke folder `/ (root)`. |
| "Gagal memuat katalog materi" | Cek `GAS_URL` di `src/lib/config.js` sudah benar **sebelum** `npm run build`, lalu build ulang & push ulang. Pastikan juga deployment GAS statusnya "Anyone" bisa akses. |
| CORS error di console browser | Jangan ubah header `Content-Type` POST di `src/lib/api.js` — harus `text/plain;charset=utf-8`. |
| Error "Sheet tidak ditemukan" | Jalankan ulang `setupAppEnvironment()` di Apps Script. |
| Lupa password darurat | Jalankan ulang `setEmergencyPassword_("password_baru")` dari editor Apps Script (bungkus dengan fungsi wrapper seperti Bagian 1.5). |
| Login terkunci 15 menit | Tunggu, atau jalankan `PropertiesService.getScriptProperties().deleteProperty('LOCK_emergency')` dari editor untuk reset manual. |
| Perubahan kode tidak muncul di situs | Pastikan Anda menjalankan `npm run build` **setelah** mengubah file di `src/`, lalu push ulang isi folder `dist/` yang baru — bukan folder `src/`. |
