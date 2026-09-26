# 🐎 Uma Musume Pretty Derby Companion (Gacha & Fans Gain Tracker)

Aplikasi web pendamping (*local-first companion tool*) untuk para trainer **Uma Musume: Pretty Derby (ウマ娘 プリティーダービー)** server Jepang (JP), dibangun menggunakan **Laravel 13**, **PHP 8.5**, **SQLite**, **React 19**, **Tailwind CSS v4**, **Lucide React**, dan **Recharts**.

Aplikasi ini dirancang untuk penggunaan personal di lingkungan lokal guna mempermudah pencatatan riwayat gacha per-banner (server JP 2026+), pemantauan target kuota fans bulanan Circle Club, ekstraksi hasil evaluasi karir via screenshot OCR, sinkronisasi katalog dari **GameTora**, serta pencadangan data transaksional yang aman melalui sistem *Backup & Restore Schema v2.0*.

---

## 📌 Batasan & Aturan Domain Aplikasi

- **Lingkup Aplikasi**: Aplikasi personal lokal (*single-user / local-first*). Tidak memiliki fitur registrasi publik, multi-tenant, atau arsitektur SaaS.
- **Cakupan Data Gacha**: Disesuaikan untuk data **Uma Musume JP tahun 2026 dan seterusnya**.
  - **Base Rate Standar (3,00%)**: SSR 3,00%, SR 18,00%, R 79,00%.
  - **Base Rate Boosted (4,50%)**: SSR 4,50%, SR 18,00%, R 77,50% pada banner khusus seperti Anniversary atau debut tertentu.
  - **Featured Rate-Up**: 0,75% per kartu rate-up terdaftar pada banner terkait.
  - **Eksklusi Banner Berbayar**: Banner dengan penanda `scam_gacha = true` atau `restriction = premium` otomatis dikecualikan dari sinkronisasi katalog.
  - **Pity & Spark Target**: Target spark standar adalah 200 tarikan. Pity counter terisolasi per banner dan dihitung ulang secara otomatis.
  - **Aturan Multi-Pull (10-Pull)**: Modal Quick 10-Pull menyediakan preset praktis `9R + 1SR`, dan form batch input menggunakan kelangkaan `SR` sebagai nilai bawaan pada slot tarikan terakhir (ke-10). Pengguna tetap memiliki keleluasaan penuh untuk menyesuaikan kelangkaan dan nama kartu secara manual.

---

## 🌟 Fitur Utama Aplikasi

### 1. Gacha Tracker & Pelacakan Banner JP 2026+
- **Modal Input Cepat 10-Pull (Quick 10-Pull)**: Catat 10 tarikan dalam satu formulir dengan stepper kelangkaan, preset cepat (seperti 9R+1SR), dan autocomplete item SSR.
- **Pencatatan Batch Tiket (1–10 Pulls)**: Dukungan pencatatan multi-pull fleksibel dengan slot terakhir otomatis terisi kelangkaan SR secara default.
- **Penyaringan Lanjutan, Paginasi Dinamis, Bulk Delete & Edit Pull**:
  - Filter berdasarkan banner aktif JP 2026+, jenis pool (Karakter vs Support Card), kelangkaan (`SSR`, `SR`, `R`), status Rate-Up, rentang tanggal, dan pencarian teks.
  - Fitur edit catatan pull serta penghapusan massal (*bulk delete*) dengan konfirmasi modal.
  - **Rekalkulasi Pity Otomatis**: Setiap kali data pull ditambah, diubah, atau dihapus, urutan tarikan dan pity counter banner terkait dihitung ulang secara otomatis.
- **Dual-Pool Luck Meter & Binomial Probability**:
  - Pemisahan statistik performa antara pool standar (3,00%) dan pool boosted (4,50%).
  - Evaluasi persentil keberuntungan berbasis distribusi kumulatif binomial $P(X \le k)$ dengan 5 tier evaluasi akun (*Blessed* hingga *Cursed*).

### 2. Fans Gain & Career Tracker (Circle Quota Monitor)
- **Pencatatan Sesi Pelatihan**: Mendukung pencatatan Latihan Manual dan Latihan Mandiri (*Independent Training*).
- **Filter Riwayat Karir, Paginasi Dinamis, Bulk Delete & Edit Run**:
  - Filter berdasarkan skenario, rank evaluasi, nama Uma Musume, dan tanggal.
  - Paginasi dinamis, pemilihan massal checkbox, serta dialog penyuntingan run.
- **Autorank Pintar (Hierarki E s.d. LG24)**: Skor evaluasi otomatis memetakan badge rank resmi dari Bronze E hingga Legendary Double-Crown LG24.
- **OCR Screenshot Import (Tesseract.js Client-Side)**:
  - Ekstraksi hasil evaluasi karir dari tangkapan layar langsung via clipboard (`Ctrl + V`) atau berkas gambar langsung di browser tanpa membebani server backend.
  - Pengenalan nama karakter, rank tier, skor evaluasi, dan perolehan fans secara otomatis.
- **Ringkasan Rekor Skenario**: Statistik agregat per skenario mencakup rata-rata perolehan fans, rekor tertinggi (*Max*), dan performa terendah (*Min*).

### 3. Visualisasi Data & Dashboard Analytics (Recharts)
- **Tab Khusus "Analytics" pada Navigasi**: Dashboard analitik interaktif berbasis pustaka grafik **Recharts**:
  - **Line Chart Akumulasi Fans Harian**: Memantau pertumbuhan akumulasi fans per hari sepanjang bulan berjalan terhadap garis target kuota bulanan circle.
  - **Bar Chart Performa Skenario**: Perbandingan rata-rata perolehan fans per run antar skenario latihan.
  - **Donut Chart Sebaran Kelangkaan Gacha**: Visualisasi proporsi aktual perolehan SSR, SR, dan R terhadap nilai ekspektasi resmi (3,00% atau 4,50%) disertai indikator deviasi (*Luck Delta*).
  - **Bar Chart Interval Pity**: Mengukur jarak jumlah tarikan antar perolehan kartu SSR berurutan.

### 4. Pemantau Kuota & Ritme Circle (Circle Pace Widget)
- **Pemantauan Ritme Grinding Fans Bulanan**:
  - Mengambil target kuota bulanan circle (`monthly_circle_target`, default 30.000.000 fans) dan menghitung sisa fans serta sisa hari kalender bulan berjalan.
  - Menghitung kebutuhan ritme harian riil (`required_daily_pace`) dan estimasi jumlah run per hari (`estimated_runs_per_day`).
  - Indikator status ritme adaptif: `Ahead of Pace` (Hijau), `On Track` (Kuning), dan `Behind Schedule` (Merah).
- **Widget Visual Terpadu (`CirclePaceWidget`)**: Hadir di halaman Dashboard dan Circle Club dengan fasilitas inline update target kuota bulanan.

### 5. Jewel & Spark Planner (Server JP)
- **Kalkulator Tabungan Carat & Tiket**:
  - Pencatatan saldo terpisah: Free Carat, Paid Carat, Tiket Gacha Karakter, dan Tiket Gacha Support Card.
  - Penargetan banner terpisah (Karakter vs Support Card) dengan pilihan kuota spark 0.5x (100 pulls), 1.0x (200 pulls), dan 2.0x (400 pulls).
  - Proyeksi tabungan hingga target tanggal banner tercapai berdasarkan rutinitas misi harian, login bonus, arena mingguan, dan reward kompetitif.
  - Konfigurasi tersimpan persisten di basis data melalui endpoint `/api/planner/config`.

### 6. Koleksi Karakter & Support Card (Server JP)
- **Katalog Koleksi Karakter**:
  - Pelacakan kepemilikan karakter dan varian kostum yang disinkronkan dari GameTora JP, dilengkapi modal tampilan ilustrasi berdiri penuh (*Stand Zoom*).
  - Pengaturan level bintang (1★ s.d. 5★ dengan proteksi bintang dasar), pohon skill (Innate, Awakening Lv 2–5, Evolved), dan grade *Aptitudes*.
- **Katalog Koleksi Support Card**:
  - Pelacakan kartu bantuan lengkap per kelangkaan (SSR, SR, R) dan tipe atribut.
  - Matriks efek status limit break 0LB hingga 4LB/MLB (Lv 30–50), efek unik kartu, support hints, dan alur event latihan (*Continuous Events*).

### 7. Sistem Pencadangan Data Teruji (Backup Schema v2.0)
- **Integritas Data Transaksional**:
  - **Skema Versi 2.0**: Validasi whitelist versi ketat (`0.9`, `1.0`, `2.0`). Berkas cadangan tanpa versi atau versi tidak dikenal ditolak sebelum pemrosesan.
  - **Proteksi base_rate**: Atribut `base_rate` banner wajib bernilai numerik valid dan tidak boleh `NULL`.
  - **Foreign Key Safe**: Resolusi relasi foreign key katalog menggunakan identitas unik (`gametora_id` dan kombinasi nama/tipe) untuk mencegah keterikatan entitas yang salah (*cross-linking*).
  - **Atomic Transaction & Real Rollback**: Kesalahan validasi atau kegagalan impor pada baris mana pun akan membatalkan seluruh proses restorasi database tanpa meninggalkan sisa data korup.
- **Dua Mode Pemulihan**:
  - **Merge**: Menggabungkan data cadangan ke dalam database aktif dengan resolusi konflik deterministik.
  - **Overwrite**: Mengosongkan 9 entitas database sebelum memulihkan seluruh data cadangan secara utuh.
- **Antarmuka Operasional**: Dapat dijalankan via Web UI Modal atau Perintah CLI Artisan.

### 8. Progressive Web App (PWA) & Mobile Navigation
- **PWA Siap Pasang (`vite-plugin-pwa`)**: Web App Manifest terkalibrasi dengan root path resmi, ikon 192x192 & 512x512, tema warna `#10b981`, serta mode standalone.
- **Sticky Bottom Navigation**: Navigasi khusus layar ponsel dengan touch target ramah jari (&ge; 48px) dan layout tanpa scrollbar horizontal liar.

---

## 🛠️ Tech Stack Terverifikasi

- **Backend**:
  - **Framework**: Laravel Framework 13.31.0
  - **Runtime**: PHP 8.5.10 (CLI)
  - **Basis Data**: SQLite 3 (`database/database.sqlite`)
  - **Testing**: PHPUnit 12.5.35
  - **Code Formatter**: Laravel Pint 1.32.1
- **Frontend**:
  - **Library UI**: React 19.3.0 & React DOM 19.3.0
  - **Styling**: Tailwind CSS 4.3.3 (via `@tailwindcss/vite: ^4.0.0`)
  - **Asset Bundler**: Vite 8.3.0
  - **PWA**: vite-plugin-pwa 1.3.0
  - **Icons**: Lucide React 1.46.0
  - **Charts**: Recharts 3.10.1
  - **Client OCR**: Tesseract.js 7.0.0
- **Runtime Environment**:
  - Node.js v24.21.0

---

## 🚀 Panduan Menjalankan Aplikasi

### 1. Prasyarat Sistem
- PHP 8.3 atau lebih baru (lingkungan terverifikasi: **PHP 8.5.10**)
- SQLite3 PDO Extension aktif
- Composer
- Node.js (lingkungan terverifikasi: **Node.js v24.21.0**) & npm

### 2. Instalasi & Setup Basis Data
```bash
# 1. Instal dependensi PHP dan Node.js
composer install
npm install

# 2. Salin environment dan generate application key
Copy-Item .env.example .env
php artisan key:generate

# 3. Jalankan migrasi database beserta data awal
php artisan migrate --seed
```

### 3. Menjalankan Frontend
```bash
# Mode pengembangan dengan Hot Module Replacement (HMR)
npm run dev

# Kompilasi aset untuk produksi lokal
npm run build
```

### 4. Menjalankan Server Backend
```bash
php artisan serve
```
Akses aplikasi melalui peramban di: **`http://127.0.0.1:8000`**

---

## ⚡ Perintah Artisan Terverifikasi (CLI Commands)

### 1. Sinkronisasi Data Katalog dari GameTora
Mengunduh dan menyinkronkan data katalog karakter, support card, dan banner JP 2026+:
```bash
# Sinkronisasi data katalog standar (hanya jalan jika terdapat pembaruan hash)
php artisan uma:sync-catalog

# Paksa sinkronisasi ulang seluruh entri katalog
php artisan uma:sync-catalog --force

# Alias resmi yang juga tersedia:
php artisan uma:sync-gametora
```

### 2. Pencadangan Data (Backup Data)
Mengekspor 9 entitas database ke berkas JSON terstruktur (Schema v2.0):
```bash
# Simpan cadangan ke storage/app/backups/ (nama berkas otomatis berstempel waktu)
php artisan uma:backup

# Simpan cadangan dengan indentasi JSON rapi (pretty-print)
php artisan uma:backup --pretty

# Simpan cadangan ke jalur berkas spesifik
php artisan uma:backup --output=C:/path/ke/backup-saya.json --pretty
```

### 3. Pemulihan Data (Restore Data)
Memulihkan database dari berkas cadangan JSON dengan validasi skema ketat:
```bash
# Mode GABUNGKAN (Merge - data lokal yang tidak berkonflik tetap dipertahankan)
php artisan uma:restore storage/app/backups/nama-backup.json --mode=merge

# Mode GANTI SEMUA (Overwrite - mengosongkan 9 entitas database sebelum memulihkan)
php artisan uma:restore storage/app/backups/nama-backup.json --mode=overwrite

# Lewati konfirmasi interaktif saat menggunakan mode overwrite (cocok untuk skrip otomatis)
php artisan uma:restore storage/app/backups/nama-backup.json --mode=overwrite --force
```

---

## 📡 Dokumentasi Endpoint REST API

### Gacha Endpoints
| Metode | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/gacha/banners` | Menampilkan daftar banner gacha JP 2026+ |
| `GET` | `/api/gacha/pulls` | Menampilkan riwayat gacha (filter banner, rarity, pagination) |
| `POST` | `/api/gacha/pulls` | Mencatat 1 tarikan gacha baru |
| `POST` | `/api/gacha/pulls/batch` | Mencatat batch tarikan tiket (1–10 pull) |
| `PUT` | `/api/gacha/pulls/{id}` | Memperbarui catatan gacha pull & rekalkulasi pity counter |
| `DELETE` | `/api/gacha/pulls/{id}` | Menghapus 1 catatan pull gacha & rekalkulasi pity |
| `POST` | `/api/gacha/bulk-delete` | Menghapus catatan pull secara massal |
| `GET` | `/api/gacha/stats` | Statistik gacha, breakdown per-pool (3,00% vs 4,50%), dan pity aktif |
| `GET` | `/api/gacha/luck-percentile` | Analisis distribusi probabilitas binomial kumulatif & luck tier |
| `POST` | `/api/gacha/reset-pity` | Mereset pity counter ke 0 setelah klaim spark |
| `GET` | `/api/gacha/sync-status` | Memeriksa status versi hash katalog lokal GameTora |
| `POST` | `/api/gacha/sync-catalog` | Memulai sinkronisasi katalog GameTora (alias: `/api/gacha/sync-gametora`) |

### Career & Fans Gain Endpoints
| Metode | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/career/runs` | Menampilkan riwayat karir pelatihan |
| `POST` | `/api/career/runs` | Mencatat sesi lari karir baru |
| `PUT` | `/api/career/runs/{id}` | Memperbarui catatan sesi karir |
| `DELETE` | `/api/career/runs/{id}` | Menghapus catatan sesi karir |
| `POST` | `/api/career/bulk-delete` | Menghapus riwayat karir secara massal |
| `GET` | `/api/career/stats` | Statistik akumulasi fans, target kuota circle, dan rata-rata per run |
| `GET` | `/api/career/metadata` | Metadata nama skenario resmi, rank E–LG24, nama Uma, dan OCR map |

### Collection Endpoints
| Metode | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/collection/characters` | Daftar karakter koleksi beserta status kepemilikan dan level bintang |
| `POST` | `/api/collection/characters/toggle` | Mengubah status kepemilikan karakter |
| `POST` | `/api/collection/characters/stars` | Memperbarui level bintang karakter (1★ s.d. 5★) |
| `GET` | `/api/collection/support-cards` | Daftar support card koleksi beserta limit break (0LB s.d. 4LB) |
| `GET` | `/api/collection/support-cards/detail` | Detail kartu: status 0LB–MLB, efek unik, hint, dan alur event latihan |
| `POST` | `/api/collection/support-cards/toggle` | Mengubah status kepemilikan support card |
| `POST` | `/api/collection/support-cards/limit-break` | Memperbarui tingkat limit break kartu |

### Backup & Restore Endpoints
| Metode | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/backup/stats` | Statistik jumlah record dari 9 entitas database yang siap dicadangkan |
| `GET` | `/api/backup/export` | Mengunduh berkas cadangan JSON Schema v2.0 (`?download=1`) |
| `POST` | `/api/backup/import` | Memulihkan data dari berkas cadangan JSON (mode `merge` atau `overwrite`) |

### Circle Tracker, Planner & Settings Endpoints
| Metode | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/circle-tracker/status` | Mengambil data live circle dari API `muxueuma.com` |
| `POST` | `/api/circle-tracker/refresh` | Memperbarui data circle club (cooldown 3 jam) |
| `POST` | `/api/circle-tracker/track-player` | Menyimpan nama trainer yang dipantau di dalam circle |
| `GET` | `/api/planner/config` | Mengambil konfigurasi target tabungan Carat & tiket JP |
| `POST` | `/api/planner/config` | Menyimpan konfigurasi Jewel & Spark Planner |
| `GET` | `/api/settings` | Mengambil pengaturan umum aplikasi (kuota circle bulanan, dll.) |
| `POST` | `/api/settings` | Menyimpan pengaturan umum aplikasi |
| `GET` | `/api/dashboard/summary` | Ringkasan metrik untuk KPI cards dan grafik dashboard utama |

---

## 🧪 Pengujian Otomatis & Pemformatan Kode

Aplikasi dilengkapi rangkaian pengujian otomatis berbasis **PHPUnit** pada database memori terisolasi (`:memory:`):

```bash
# Menjalankan seluruh pengujian (132 tests, 1.288 assertions)
php artisan test --compact

# Menjalankan pengujian spesifik
php artisan test --filter=BackupRoundTripTest
php artisan test --filter=BackupIntegrityTest
php artisan test --filter=GachaRateAuditTest

# Menjalankan pemformat kode PHP (Laravel Pint)
vendor/bin/pint
```

### Cakupan Pengujian:
- **Backup & Restore Integrity**: Pengujian pemulihan round-trip, kepatuhan skema v2.0, proteksi atomik rollback, penolakan versi tidak dikenal, integritas foreign key SQLite, dan pemulihan field JSON katalog.
- **Gacha Logic & Rate Audit**: Verifikasi persistensi atribut `base_rate` (3,00% vs 4,50%), kalkulasi dinamis featured rate-up 0,75%, eksklusi banner berbayar (`scam_gacha = true` / `restriction = premium`), dan siklus hidup pity counter.
- **Koleksi & GameTora Sync**: Proteksi batas minimum bintang karakter bawaan, matriks efek status kartu bantuan 0LB–MLB, dan integritas hash pembaruan katalog.
- **PWA & UI Routing**: Verifikasi manifest PWA, routing service worker, dan pengalihan build fallback.

---

## 📄 Lisensi, Hak Cipta & Atribusi

- **Disclaimer Aplikasi**: Aplikasi ini merupakan proyek *fan-made* non-komersial yang dikembangkan untuk membantu para trainer dalam mencatat riwayat gacha dan ritme grinding fans kuota Circle Club.
- **Hak Cipta Karakter & Aset Game**: [*Uma Musume: Pretty Derby (ウマ娘 プリティーダービー)*](https://umamusume.jp/) beserta seluruh materi dan aset terkait merupakan hak cipta eksklusif milik © [**Cygames, Inc.**](https://www.cygames.co.jp/)
- **Sumber Data Katalog Komunitas**: Seluruh data nama karakter, varian kostum, kartu bantuan, dan jadwal banner JP disinkronkan dari platform komunitas [GameTora](https://gametora.com/umamusume).
- **Pengembangan dengan Bantuan AI**: Program dan repositori ini dibuat seutuhnya (*100% full AI-generated*) dengan bantuan kecerdasan buatan (AI) yang dipandu dan diaudit melalui pengujian otomatis untuk memastikan stabilitas serta kesesuaian logika aplikasi.
