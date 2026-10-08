# 🐎 Uma Musume Pretty Derby Companion (Gacha & Fans Gain Tracker)

Aplikasi web pendamping (*local-first companion tool*) untuk para trainer **Uma Musume: Pretty Derby (ウマ娘 プリティーダービー)** server Jepang (JP), dibangun menggunakan **Laravel 13**, **PHP 8.5**, **SQLite**, **React 19**, **Tailwind CSS v4**, **Lucide React**, dan **Recharts**.

Aplikasi ini dirancang untuk penggunaan personal di lingkungan lokal guna mempermudah pencatatan riwayat gacha per-banner (server JP 2026+), pemantauan target kuota fans bulanan Circle Club, ekstraksi hasil evaluasi karir via screenshot OCR, simulasi kompatibilitas silsilah indukan (Inheritance Affinity JP), sinkronisasi katalog dari **GameTora**, serta pencadangan data transaksional yang aman melalui sistem *Backup & Restore Schema v2.0*.

---

## 📌 Batasan & Aturan Domain Aplikasi

- **Lingkup Aplikasi**: Aplikasi personal lokal (*single-user / local-first*). Tidak memiliki fitur registrasi publik, multi-tenant, atau arsitektur SaaS.
- **Cakupan Data Gacha**: Disesuaikan untuk data **Uma Musume JP tahun 2026 dan seterusnya**.
  - **Base Rate Standar (3,00%)**: SSR 3,00%, SR 18,00%, R 79,00%.
  - **Base Rate Boosted (4,50%)**: SSR 4,50%, SR 18,00%, R 77,50% pada banner khusus seperti Anniversary atau debut tertentu.
  - **Featured Rate-Up**: 0,75% per kartu rate-up terdaftar pada banner terkait.
  - **Aturan Banner Twinkle Collection (JP Server 2026)**: Pada banner berkategori `twinkle` (*The Twinkle Collection Pretty Derby Gacha*), total rate SSR 3,00% dibagi sama rata ke 8 karakter B3 terpilih (masing-masing 0,375% per karakter) **tanpa status rate-up (`is_rate_up: false`) dan tanpa tarikan rate-off/spook**. Tarikan SSR (B3) dibatasi eksklusif pada 8 karakter lineup tersebut, sedangkan tarikan B1 (R, 1★) dan B2 (SR, 2★) tetap mencakup seluruh karakter basis 1★ dan 2★ dengan pemetaan kelangkaan resmi (`R` dan `SR`).
  - **Eksklusivitas Varian Kostum Gacha (`[...]`)**: Seluruh karakter pada sistem gacha (input Single Pull, Multi-Pull, autocomplete, rekomendasi cepat, dan banner) wajib menggunakan format nama varian kostum resmi dalam tanda kurung siku (format: `Nama Uma [Nama Kostum]`, contoh: `Daiwa Scarlet [Peak Blue]`, `Daiwa Scarlet [Nuit Étoilée de Scarlet]`, `Vodka [Wild Top Gear]`, `Orfevre [総攬]`). Nama dasar tanpa kostum (*bare names* seperti `Daiwa Scarlet`, `Vodka`) sepenuhnya dieliminasi dari sistem gacha untuk mencegah entri duplikat dan ambigu. Nama karakter dasar tanpa kurung tetap dipertahankan secara terpisah khusus untuk modul Pelatihan / Career Run.
  - **Eksklusi Banner Berbayar**: Banner dengan penanda `scam_gacha = true` atau `restriction = premium` otomatis dikecualikan dari sinkronisasi katalog.
  - **Pity & Spark Target**: Target spark standar adalah 200 tarikan. Pity counter terisolasi per banner dan dihitung ulang secara otomatis.
  - **Aturan Multi-Pull (10-Pull)**: Modal Quick 10-Pull menyediakan preset praktis `9R + 1SR`, dan form batch input menggunakan kelangkaan `SR` sebagai nilai bawaan pada slot tarikan terakhir (ke-10). Pengguna tetap memiliki keleluasaan penuh untuk menyesuaikan kelangkaan dan nama kartu secara manual.

---

## 🌟 Fitur Utama Aplikasi

### 1. Gacha Tracker & Pelacakan Banner JP 2026+
- **Modal Input Cepat 10-Pull (Quick 10-Pull)**: Catat 10 tarikan dalam satu formulir dengan stepper kelangkaan, preset cepat (seperti 9R+1SR), dan autocomplete item SSR.
- **Pencatatan Batch Tiket (1–10 Pulls)**: Dukungan pencatatan multi-pull fleksibel dengan slot terakhir otomatis terisi kelangkaan SR secara default.
- **Mekanisme Khusus Banner Twinkle Collection (2026 JP Server)**:
  - Pembagian rate 0,375% rata ke 8 karakter B3, penonaktifan otomatis tombol/toggle rate-up (`is_rate_up: false`), proteksi anti-spook/rate-off, serta kartu info lineup B3 interaktif dengan tombol isi cepat `+ Karakter`.
  - Akses lengkap pool tarikan B1 (1★ / R) dan B2 (2★ / SR) di banner Twinkle dengan pemetaan kelangkaan resmi.
- **Standardisasi Varian Kostum & Penyelarasan Antarmuka**:
  - Autocomplete, suggestions dropdown, dan `<datalist>` native browser disaring ketat hanya untuk karakter bervarian kostum resmi `[...]`, mencegah munculnya pilihan duplikat atau ambigu.
  - Penyelarasan tinggi kontrol formulir Single Pull (`h-10` konsisten di seluruh kolom) dan penempatan teks error banner pada header baris label.
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
- **Autorank Pintar & Auto-Lock pada Modal Edit (Hierarki E s.d. LG24)**: Skor evaluasi otomatis memetakan badge rank resmi dari Bronze E hingga Legendary Double-Crown LG24. Pada modal penyuntingan run, hasil rank evaluasi dikunci secara otomatis dari perolehan skor total sesi latihan (*auto rank*) tanpa tombol manual yang redundan, serta standarisasi notifikasi dalam Bahasa Indonesia.
- **OCR Screenshot Import (Tesseract.js Client-Side)**:
  - Ekstraksi hasil evaluasi karir dari tangkapan layar langsung via clipboard (`Ctrl + V`) atau berkas gambar langsung di browser tanpa membebani server backend.
  - Pengenalan nama karakter, rank tier, skor evaluasi, dan perolehan fans secara otomatis.
- **Ringkasan Rekor Skenario & Modal Rincian Karakter**:
  - Statistik agregat per skenario mencakup rata-rata perolehan fans, rekor tertinggi (*Max*), dan performa terendah (*Min*).
  - Setiap kartu skenario yang tercatat dapat diklik untuk memunculkan modal dialog rincian karakter apa saja yang karirnya pernah dicatat pada skenario tersebut serta total akumulasi fans yang diraih pada masing-masing skenario.
- **Modal Analitik Penggunaan Karakter Per Skenario (`CharacterScenarioDetailModal`)**:
  - Setiap kartu karakter pada daftar *Character Performance Breakdown* di Fans Tracker dapat diklik untuk membuka modal dialog statistik komprehensif.
  - Menyajikan sebaran performa karakter per skenario latihan: jumlah sesi latihan, persentase kontribusi sesi, total perolehan fans, rata-rata fans, rekor tertinggi (*Max*), rekor terendah (*Min*), dan *Best Rank* tertinggi yang diraih, dilengkapi kontrol pencarian skenario, opsi pengurutan, serta riwayat 5 sesi terakhir.
- **Normalisasi Alias Nama & Resolusi Thumbnail GameTora**:
  - Engine pencocokan gambar karakter (`resolveCharacterImage`) menormalisasi alias nama berkategori kurung siku `[...]` maupun kurung bulat `(...)` (seperti `Oguri Cap (Anime Collab)` dan `Inari One (Fall Festival)`), memastikan thumbnail avatar resmi GameTora tampil akurat tanpa fallback inisial teks.

### 3. Visualisasi Data & Dashboard Analytics (Recharts)
- **Tab Khusus "Analytics" pada Navigasi**: Dashboard analitik interaktif berbasis pustaka grafik **Recharts**:
  - **Line Chart Akumulasi Fans Harian**: Memantau pertumbuhan akumulasi fans per hari sepanjang bulan berjalan terhadap garis target kuota bulanan circle.
  - **Bar Chart Performa Skenario**: Perbandingan rata-rata perolehan fans per run antar skenario latihan.
  - **Donut Chart Sebaran Kelangkaan Gacha**: Visualisasi proporsi aktual perolehan SSR, SR, dan R terhadap nilai ekspektasi resmi (3,00% atau 4,50%) disertai indikator deviasi (*Luck Delta*).
  - **Bar Chart Interval Pity**: Mengukur jarak jumlah tarikan antar perolehan kartu SSR berurutan.

### 4. Pemantau Kuota, Ritme Circle & Arsip Historis Club
- **Pemantauan Ritme Grinding Fans Bulanan**:
  - Mengambil target kuota bulanan circle (`monthly_circle_target`, default 30.000.000 fans) dan menghitung sisa fans serta sisa hari kalender bulan berjalan.
  - Menghitung kebutuhan ritme harian riil (`required_daily_pace`) dan estimasi jumlah run per hari (`estimated_runs_per_day`).
  - Indikator status ritme adaptif: `Ahead of Pace` (Hijau), `On Track` (Kuning), dan `Behind Schedule` (Merah).
- **Penandaan Anggota yang Sudah Keluar (*Ex-Member / Out*)**:
  - Deteksi dan visualisasi anggota circle yang telah keluar dari club dengan badge merah `Keluar (Out)`, indikator strip (`ー`) pada kolom rank dan delta fans harian/mingguan, serta penataan sorting otomatis di posisi terbawah.
- **Filter & Penelusuran Statistik Historis Bulanan (Historical Archive)**:
  - Menu dropdown popover pemilih periode bulan (`YYYY年 M月`) untuk memeriksa arsip data performa dan kontribusi fans anggota dari bulan-bulan sebelumnya via snapshot lokal `circle_snapshot_YYYY-MM.json`.
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

### 7. Inheritance Affinity & Compatibility Calculator (Server JP - 相性計算機)
- **Diagram Visual Silsilah 7 Slot Interaktif (Pedigree Tree)**:
  - Struktur silsilah 7 posisi lengkap: **Target Trainee** (atas), **Parent 1** (kiri), **Parent 2** (kanan), **Grandparent 1A & 1B** (kiri bawah), **Grandparent 2A & 2B** (kanan bawah).
  - Modal pemilihan karakter terpadu dari katalog GameTora dan koleksi lokal dengan filter bintang dan filter koleksi milik pengguna.
  - Kartu slot interaktif menampilkan avatar, nama, epithet kostum, badge subskor relasi, serta status kepemilikan.
- **Formula Resmi Kompatibilitas Server Jepang (JP Inheritance Formula)**:
  - **Base Affinity Matrix**: Nilai relasi dasar resmi antar karakter berdasarkan kedekatan historis, rute balapan bawaan, dan grup afinitas resmi.
  - **G1 Shared Victory Bonus (重賞ボーナス)**: Menghitung bonus kemenangan balapan G1 yang sama antar parent dan grandparent dengan standardisasi **+3 poin per balapan** (update resmi *2nd Anniversary* JP, Februari 2023).
  - **Triple Affinity Calculation**: Opsi kalkulasi 3-arah (*3-way compatibility*) antara Target, Parent, dan Grandparent untuk memodelkan peluang warisan faktor kakek-nenek secara akurat.
- **Klasifikasi Badge Threshold Kompatibilitas Resmi**:
  - **△ (Peluang Rendah)**: Skor < 51 poin.
  - **○ (Peluang Normal)**: Skor 51 - 150 poin.
  - **◎ (Peluang Maksimal / Double Circle)**: Skor ≥ 151 poin (disertai efek visual bersinar pelangi/emas untuk peluang keberhasilan bintang faktor tertinggi).
  - Progress bar dinamis menuju target 51 (○) dan 151 (◎), lengkap dengan accordion tabel rincian poin per relasi.
- **Validasi Ketat Anti-Duplikasi Karakter Silsilah**:
  - Mencegah pelanggaran aturan resmi game: Target Trainee dilarang sama dengan Parent 1 maupun Parent 2, dan Parent 1 dilarang sama dengan Parent 2, meskipun kostumnya berbeda.
  - Grandparent dilarang sama dengan Parent pada cabangnya, dan sesama Grandparent pada cabang yang sama dilarang duplikat.
  - Karakter duplikat otomatis dinonaktifkan (`disabled`, opacity 40%, tombol tidak dapat diklik) di modal picker disertai badge merah peringatan alasan larangan, serta penandaan visual bingkai merah dan alert banner pada diagram pohon.
- **Rekomendasi Cepat "Cari Parent Terbaik dari Koleksi Saya"**:
  - Algoritma cerdas yang menelusuri seluruh karakter milik pengguna (`user_characters`) dan menyajikan peringkat pasangan parent dengan skor kompatibilitas tertinggi secara instan.
- **Sinkronisasi Balapan dari Riwayat Karier**:
  - Opsi impor nama karakter dari tabel `career_runs` ke slot silsilah untuk memudahkan konfigurasi silsilah dari hasil pelatihan sebelumnya.

### 8. Upcoming CM/LoH Competition Planner (Official Cygames 2026–2027)
- **Integritas Data Ketat & Nol Data Spekulatif (*Zero Speculative Data*)**:
  - Sumber data resmi eksklusif dari pengumuman Cygames JP Portal ([https://umamusume.jp/news/detail?id=3483](https://umamusume.jp/news/detail?id=3483)).
  - Mengeliminasi tebakan, asumsi komunitas, wiki, atau datamining untuk seluruh parameter lomba masa depan.
  - Penanganan data tiga kondisi (*Tri-State Handling*): Terkonfirmasi (*Confirmed*), Acak (*Random*, contoh cuaca dan kondisi lintasan LoH Nov 2026), dan Belum Diumumkan (*Unknown / NULL*).
- **Struktur Tanggal & Urutan Kronologis Robust**:
  - Kolom tanggal granular: `year`, `month`, `period` (`exact`, `early`, `mid`, `late`), `date_label`, dan `start_date` (nullable, hanya diisi jika tanggal eksak diumumkan).
  - Pengurutan kronologis terjamin tanpa bergantung pada `start_date` yang bernilai NULL.
- **Antarmuka Event Planner Interaktif**:
  - Linimasa dan kartu kompetisi informatif per event (badge Champions Meeting vs League of Heroes).
  - Tampilan eksplisit "Belum diumumkan" untuk parameter yang belum dirilis dan badge kontras "Acak" untuk kondisi random resmi.
  - Filter tipe kompetisi (Semua, CM, LoH) dan filter tahun pelaksanaan.
  - Dialog modal rincian lengkap beserta tautan sumber resmi Cygames JP yang dapat diklik langsung.
- **Status Waktu Hari Ini, Deteksi Event Sedang Berlangsung & Bar Simulasi Tanggal**:
  - Menampilkan tanggal acuan saat ini (*active reference date*) dan mendeteksi secara dinamis apakah event berstatus sedang berlangsung, berlangsung nanti (disertai hitung mundur hari), atau telah selesai.
  - Event yang berstatus aktif/sedang berlangsung secara otomatis disorot dengan warna bingkai dan bayangan persis seperti saat kartu di-hover (`border-amber-400 shadow-md` untuk Champions Meeting dan `border-indigo-400 shadow-md` untuk League of Heroes) serta badge berkedip *"Event Sedang Berlangsung"*.
  - Bar simulasi tanggal interaktif dengan pemilih tanggal native (`<input type="date">`) dan preset uji instan (misal: simulasi tanggal *20 Oktober 2026* untuk Champions Meeting Classic) guna memverifikasi perilaku antarmuka secara visual dan langsung.
- **Widget Kompetisi Terdekat pada Dasbor & Navigasi Cepat**:
  - Kartu ringkasan interaktif yang disematkan langsung di bawah bagian *Banner Gacha Berlangsung Hari Ini* pada Dasbor, menampilkan kompetisi terdekat yang sedang berjalan atau akan datang, dilengkapi tombol langsung untuk membuka halaman Event Planner.
- **Modal Interaktif Aturan Khusus "No Debuff (デバフなし)"**:
  - Penanda aturan khusus dapat diklik untuk membuka modal dialog komprehensif yang memuat terjemahan resmi aturan Cygames dalam Bahasa Indonesia, penjelasan pengecualian skill unik & evolusi bawaan karakter, serta katalog 55 skill debuff (Gold, Normal, Warisan) yang dicocokkan langsung dari GameTora lengkap dengan fitur pencarian dan penelusuran formula.

### 9. Sistem Pencadangan Data Teruji (Backup Schema v2.0)
- **Integritas Data Transaksional**:
  - **Skema Versi 2.0**: Validasi whitelist versi ketat (`0.9`, `1.0`, `2.0`). Berkas cadangan tanpa versi atau versi tidak dikenal ditolak sebelum pemrosesan.
  - **Proteksi base_rate**: Atribut `base_rate` banner wajib bernilai numerik valid dan tidak boleh `NULL`.
  - **Foreign Key Safe**: Resolusi relasi foreign key katalog menggunakan identitas unik (`gametora_id` dan kombinasi nama/tipe) untuk mencegah keterikatan entitas yang salah (*cross-linking*).
  - **Atomic Transaction & Real Rollback**: Kesalahan validasi atau kegagalan impor pada baris mana pun akan membatalkan seluruh proses restorasi database tanpa meninggalkan sisa data korup.
- **Dua Mode Pemulihan**:
  - **Merge**: Menggabungkan data cadangan ke dalam database aktif dengan resolusi konflik deterministik.
  - **Overwrite**: Mengosongkan 9 entitas database sebelum memulihkan seluruh data cadangan secara utuh.
- **Antarmuka Operasional**: Dapat dijalankan via Web UI Modal atau Perintah CLI Artisan.

### 10. Progressive Web App (PWA) & Mobile Navigation
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
| `GET` | `/api/gacha/banners` | Menampilkan daftar banner gacha JP 2026+ lengkap dengan kategori banner (`standard`, `twinkle`, `select_rate_up`, `premium`, `anniversary`) dan daftar `featured_items` bervarian kostum resmi |
| `GET` | `/api/gacha/metadata` | Mengambil metadata katalog gacha: daftar karakter bervarian kostum resmi (`[...]`), kartu bantuan, serta pemetaan kelangkaan bawaan (`R`, `SR`, `SSR`) |
| `GET` | `/api/gacha/pulls` | Menampilkan riwayat gacha (filter banner, rarity, pagination) |
| `POST` | `/api/gacha/pulls` | Mencatat 1 tarikan gacha baru (otomatis memaksakan `is_rate_up = false` pada banner Twinkle dan memvalidasi pool SSR) |
| `POST` | `/api/gacha/pulls/batch` | Mencatat batch tarikan tiket (1–10 pull) dengan penegakan otomatis aturan banner Twinkle |
| `PUT` | `/api/gacha/pulls/{id}` | Memperbarui catatan gacha pull, validasi pool banner Twinkle, & rekalkulasi pity counter |
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
| `GET` | `/api/career/metadata` | Metadata nama skenario resmi, rank E–LG24, daftar nama dasar Uma (khusus modul karir tanpa kurung), dan OCR map |

### Affinity & Compatibility Endpoints
| Metode | Endpoint | Deskripsi |
|---|---|---|
| `POST` | `/api/affinity/calculate` | Menghitung kompatibilitas total, breakdown subskor, badge status, dan validasi duplikasi silsilah |
| `GET` | `/api/affinity/recommendations/{targetId}` | Mencari rekomendasi pasangan parent terbaik dari koleksi user untuk target Uma tertentu |
| `GET` | `/api/affinity/races` | Mengambil daftar balapan G1 populer JP yang dikelompokkan per kategori preset |
| `GET` | `/api/affinity/career-runs` | Mengambil riwayat sesi karir tersimpan untuk sinkronisasi balapan silsilah |

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

### Competition Planner Endpoints
| Metode | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/competition-events` | Menampilkan seluruh event kompetisi Champions Meeting & League of Heroes berurutan kronologis resmi Cygames JP |
| `GET` | `/api/competition-events/{id}` | Menampilkan detail spesifik kondisi event lomba kompetisi tertentu |

### Backup & Restore Endpoints
| Metode | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/backup/stats` | Statistik jumlah record dari 9 entitas database yang siap dicadangkan |
| `GET` | `/api/backup/export` | Mengunduh berkas cadangan JSON Schema v2.0 (`?download=1`) |
| `POST` | `/api/backup/import` | Memulihkan data dari berkas cadangan JSON (mode `merge` atau `overwrite`) |

### Circle Tracker, Planner & Settings Endpoints
| Metode | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/circle-tracker/status` | Mengambil data live circle dari API `muxueuma.com` atau arsip lokal. Mendukung query `?period=YYYY-MM` untuk penelusuran arsip statistik historis bulanan dan penanda anggota aktif vs yang telah keluar (*ex-member*) |
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
# Menjalankan seluruh pengujian (199 tests, 2.119 assertions)
php artisan test --compact

# Menjalankan pengujian spesifik
php artisan test --filter=CompetitionEventTest
php artisan test --filter=AffinityCalculatorTest
php artisan test --filter=BackupRoundTripTest
php artisan test --filter=BackupIntegrityTest
php artisan test --filter=GachaRateAuditTest
php artisan test --filter=GachaTwinkleCollectionTest

# Menjalankan pemformat kode PHP (Laravel Pint)
vendor/bin/pint
```

### Cakupan Pengujian:
- **Upcoming Competition Planner**: Integritas seeder tepat 6 event resmi Cygames 2026–2027, idempotensi seeder tanpa duplikasi, pengurutan kronologis presisi multi-prioritas (`year`, `month`, `period`, `start_date`), preservasi nilai `NULL` dan eksplisit `"random"`, isolasi aturan khusus `no_debuff` pada CM MILE Maret 2027, serta pengujian serialisasi API.
- **Inheritance Affinity & Compatibility**: Pengujian kalkulasi kompatibilitas silsilah 7 slot lengkap, penambahan bonus kemenangan G1 bersama (+3 poin/balapan), ambang batas klasifikasi badge (△, ○, ◎), validasi ketat anti-duplikasi karakter silsilah lintas kostum, dan algoritma rekomendasi indukan terbaik dari koleksi user.
- **Backup & Restore Integrity**: Pengujian pemulihan round-trip, kepatuhan skema v2.0, proteksi atomik rollback, penolakan versi tidak dikenal, integritas foreign key SQLite, dan pemulihan field JSON katalog.
- **Gacha Logic, Twinkle Collection & Rate Audit**: Verifikasi persistensi atribut `base_rate` (3,00% vs 4,50%), kalkulasi dinamis featured rate-up 0,75%, aturan khusus banner Twinkle Collection (pembagian rate 3% terbagi rata tanpa rate-up, isolasi pool B3 8 karakter, dan dukungan pool B1/B2), eksklusivitas karakter bervarian kostum resmi `[...]` pada katalog metadata gacha, eksklusi banner berbayar (`scam_gacha = true` / `restriction = premium`), dan siklus hidup pity counter.
- **Koleksi & GameTora Sync**: Proteksi batas minimum bintang karakter bawaan, matriks efek status kartu bantuan 0LB–MLB, dan integritas hash pembaruan katalog.
- **PWA & UI Routing**: Verifikasi manifest PWA, routing service worker, dan pengalihan build fallback.

---

## 📄 Lisensi, Hak Cipta & Atribusi

- **Disclaimer Aplikasi**: Aplikasi ini merupakan proyek *fan-made* non-komersial yang dikembangkan untuk membantu para trainer dalam mencatat riwayat gacha dan ritme grinding fans kuota Circle Club.
- **Hak Cipta Karakter & Aset Game**: [*Uma Musume: Pretty Derby (ウマ娘 プリティーダービー)*](https://umamusume.jp/) beserta seluruh materi dan aset terkait merupakan hak cipta eksklusif milik © [**Cygames, Inc.**](https://www.cygames.co.jp/)
- **Sumber Data Katalog Komunitas**: Seluruh data nama karakter, varian kostum, kartu bantuan, dan jadwal banner JP disinkronkan dari platform komunitas [GameTora](https://gametora.com/umamusume).
- **Pengembangan dengan Bantuan AI**: Program dan repositori ini dibuat seutuhnya (*100% full AI-generated*) dengan bantuan kecerdasan buatan (AI) yang dipandu dan diaudit melalui pengujian otomatis untuk memastikan stabilitas serta kesesuaian logika aplikasi.
