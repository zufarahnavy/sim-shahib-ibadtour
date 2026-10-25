# Panduan Instalasi — SIM SHAHIB IbadTour

Aplikasi ini terdiri dari **2 bagian terpisah**:

1. **Backend** — Google Apps Script sebagai REST API murni (JSON), menyimpan data di Google Sheets & Drive.
2. **Frontend** — halaman statis (HTML/CSS/JS) yang di-deploy ke GitHub Pages, berkomunikasi ke backend lewat `fetch()`.

Tidak ada iframe, tidak ada `google.script.run` — keduanya berkomunikasi murni lewat HTTP (pola **gas-pro-api**).

---

## BAGIAN 1 — Setup Backend (Google Apps Script)

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
2. Save → pilih `TAMBAH_ADMIN_SEKARANG` dari dropdown → **Run**. Email ini yang akan bisa login via Google OAuth di `admin.html`.
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

## BAGIAN 2 — Konfigurasi Frontend

1. Buka file `js/config.js` di folder frontend yang sudah diekstrak.
2. Ganti baris:
   ```js
   GAS_URL: "PASTE_URL_WEBAPP_GAS_ANDA_DI_SINI",
   ```
   dengan URL Web App dari langkah 1.7, contoh:
   ```js
   GAS_URL: "https://script.google.com/macros/s/XXXXXXXXXXXX/exec",
   ```
3. Simpan file.

---

## BAGIAN 3 — Deploy Frontend ke GitHub Pages

> Panduan ini untuk pengguna yang **belum pernah** menggunakan Git/GitHub.

### 3.1 Install Git
- **Windows:** unduh dari [git-scm.com](https://git-scm.com/download/win), install dengan opsi default.
- **Mac:** buka Terminal, jalankan `git --version` — jika belum ada, ikuti instruksi instalasi yang muncul.

### 3.2 Buat Akun & Repository GitHub
1. Buat akun di [github.com](https://github.com) jika belum punya.
2. Klik **New repository** → beri nama misalnya `sim-shahib-ibadtour` → pilih **Public** → **JANGAN** centang "Add a README file" → **Create repository**.

### 3.3 Atur Identitas Git (sekali saja per komputer)
Buka Terminal/Command Prompt:
```bash
git config --global user.name "Nama Anda"
git config --global user.email "email@anda.com"
```

### 3.4 Siapkan Folder Project
Ekstrak ZIP frontend yang dikirimkan ke lokasi pilihan Anda, misalnya ke Desktop, sehingga Anda mendapat folder bernama **`sim-shahib-frontend`**. Pastikan isi folder tersebut, **tepat di dalamnya**, adalah:
```
sim-shahib-frontend/
├── index.html
├── admin.html
├── css/style.css
├── js/config.js, api.js, app.js, admin.js
└── assets/...
```
`index.html` harus berada **langsung** di dalam folder ini (tidak di dalam subfolder lain), karena inilah yang akan menjadi root repository GitHub Pages.

### 3.5 Push ke GitHub
Buka Terminal, arahkan ke folder tersebut — **ganti path di bawah dengan lokasi folder `sim-shahib-frontend` Anda yang sebenarnya**:
```bash
cd /lokasi/folder/sim-shahib-frontend
git init
git add .
git commit -m "Upload pertama"
git branch -M main
git remote add origin https://github.com/USERNAME-ANDA/sim-shahib-ibadtour.git
git push -u origin main
```
Saat diminta login, masukkan username GitHub Anda, dan untuk password **gunakan Personal Access Token** (bukan password akun), karena GitHub tidak lagi menerima password biasa untuk operasi Git via HTTPS:
- Buat token di: GitHub → **Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token** (centang scope `repo`).
- Salin token tersebut dan tempel sebagai password saat diminta.

### 3.6 Aktifkan GitHub Pages
1. Di halaman repository, buka **Settings → Pages**.
2. Pada **Branch**, pilih `main` dan folder `/ (root)` → **Save**.
3. Centang **Enforce HTTPS**.
4. Tunggu 1–2 menit, lalu buka URL yang muncul (format `https://USERNAME-ANDA.github.io/sim-shahib-ibadtour/`).

### 3.7 Redeploy Setelah Update
Setiap kali mengubah file frontend:
```bash
cd /lokasi/folder/sim-shahib-frontend
git add .
git commit -m "Update tampilan"
git push
```
GitHub Pages otomatis memperbarui situs dalam 1–2 menit.

---

## BAGIAN 4 — Masuk ke Aplikasi

- **Landing Page Mitra/Guest:** `https://USERNAME-ANDA.github.io/sim-shahib-ibadtour/`
- **Panel Admin:** `https://USERNAME-ANDA.github.io/sim-shahib-ibadtour/admin.html`
  - Login dengan **Password Darurat** yang sudah Anda ganti di langkah 1.5, atau
  - Login dengan **Google** menggunakan email yang didaftarkan di langkah 1.6 (perlu `GOOGLE_CLIENT_ID` di Script Properties + integrasi Google Identity Services tambahan di `admin.html` — lihat catatan di bawah).

### Catatan Login Google OAuth
Untuk mengaktifkan tombol "Masuk dengan Google" secara penuh:
1. Buat OAuth Client ID di [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (tipe *Web application*), tambahkan domain GitHub Pages Anda ke *Authorized JavaScript origins*.
2. Simpan Client ID tersebut ke Script Property `GOOGLE_CLIENT_ID`.
3. Tambahkan skrip Google Identity Services (`https://accounts.google.com/gsi/client`) ke `admin.html` dan hubungkan callback-nya untuk memanggil `loginGoogle_` dengan `id_token` yang diterima — lihat komentar pada fungsi `Admin.loginGoogle()` di `js/admin.js`.

Sebelum itu dikonfigurasi, gunakan **Password Darurat** untuk mengelola aplikasi.

---

## BAGIAN 5 — Modul Tambahan: CRM & Notifikasi WhatsApp

1. Daftar di [fonnte.com](https://fonnte.com), hubungkan WhatsApp Anda, dan ambil **Token API**.
2. Di Panel Admin → **Notifikasi WA**, masukkan token tersebut pada kolom "Kredensial Fonnte WhatsApp API" → **Simpan Token**. Token akan tersimpan aman di Script Properties, tidak pernah tampil utuh di layar.
3. Aktifkan saklar **Notifikasi WhatsApp (Global)** dan atur matriks event mana yang mengirim notifikasi.
4. Buka menu **CRM & Kontak** untuk melihat kontak yang otomatis tersinkron dari data Mitra & pesan kontak masuk, lalu gunakan **Kirim Blast WA** untuk mengirim pesan massal (dengan jeda otomatis antar pesan untuk mencegah pemblokiran nomor).

---

## BAGIAN 6 — Update Backend Setelah Revisi (Pengaturan.gs & Konten.gs berubah)

Karena ada penambahan fitur "Pengaturan Tampilan lengkap" (banner, about, legalitas) dan pemisahan Link Embed/Link Unduh OneDrive, **dua file backend berubah**: `Pengaturan.gs` dan `Konten.gs`.

1. Buka project Apps Script Anda → buka file `Pengaturan.gs` di editor → **hapus semua isinya** → tempel isi file `Pengaturan.gs` yang baru dikirimkan → Save.
2. Lakukan hal yang sama untuk `Konten.gs`.
3. **Deploy → Manage deployments → Edit (ikon pensil) → New version → Deploy** agar perubahan backend ini terbit (URL Web App tetap sama, tidak perlu ganti `GAS_URL` di frontend).

## BAGIAN 7 — Cara Pakai Pengaturan Tampilan (Admin)

Di Panel Admin → **Pengaturan Tampilan**, sekarang tersedia kontrol penuh untuk:
- **Banner Musim** — unggah gambar banner + ubah label musim/judul/subjudul. Jika gambar tidak diunggah, tampil ilustrasi siluet masjid bawaan.
- **Section Tentang Kami** — unggah foto + ubah cerita singkat + ubah 4 kartu nilai/pilar (ikon emoji, judul, deskripsi).
- **Legalitas Kemenag** — ubah label & nilai dari 4 kartu legalitas.
- **Kontak** — alamat, telepon, email, WhatsApp (seperti sebelumnya).

Setiap bagian punya tombol **Simpan** sendiri — perubahan langsung tampil di landing page begitu disimpan (cache otomatis diperbarui).

## BAGIAN 8 — Link OneDrive: Embed vs Unduh Langsung

Di form **Kelola Konten**, saat memilih sumber "Link OneDrive", sekarang ada 2 kolom:
- **Link Embed** — untuk pratinjau di dalam aplikasi. Ambil dari OneDrive: klik kanan file → **Share** → **Embed** → salin URL di dalam `src="..."`.
- **Link Unduh Langsung** — untuk tombol Unduh. Ambil dari OneDrive: **Share** → **Copy Link** (akses "Anyone with the link"). Sistem otomatis menambahkan parameter `download=1` supaya file langsung terunduh, tidak membuka halaman pratinjau OneDrive dulu (inilah penyebab proses "download lama" sebelumnya).

Isi minimal salah satu kolom; isi keduanya untuk hasil terbaik.

## Troubleshooting

| Masalah | Solusi |
|---|---|
| Situs 404 di GitHub Pages | Pastikan `index.html` ada **langsung** di root repo, bukan di dalam subfolder `frontend/`. |
| "Gagal memuat katalog materi" | Cek `GAS_URL` di `config.js` sudah benar & deployment GAS statusnya "Anyone" bisa akses. |
| CORS error di console browser | Pastikan Anda tidak mengubah header `Content-Type` POST di `js/api.js` — harus `text/plain;charset=utf-8`. |
| Error "Sheet tidak ditemukan" | Jalankan ulang `setupAppEnvironment()` di Apps Script. |
| Lupa password darurat | Jalankan ulang `setEmergencyPassword_("password_baru")` dari editor Apps Script. |
| Login terkunci 15 menit | Tunggu, atau jalankan `PropertiesService.getScriptProperties().deleteProperty('LOCK_emergency')` dari editor untuk reset manual. |
