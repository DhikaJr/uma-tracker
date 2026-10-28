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
- **Pencatatan Fleksibel (Single, Quick 10-Pull & Batch)**: Mendukung pencatatan tarikan tunggal, modal cepat 10-pull dengan stepper kelangkaan dan preset praktis (seperti `9R + 1SR`), serta batch tiket (1–10 pulls) dengan pengisian otomatis kelangkaan SR pada slot terakhir.
- **Pengelompokan Kategori Banner Otentik (Anniversary, Skenario Baru & Twinkle)**: Mengelompokkan banner gacha ke dalam grup yang tepat (*Anniversary & Skenario Baru 2026*, *Twinkle Collection 2026*, *Select Pick Up*, dan *Standard Gacha*), termasuk klasifikasi otomatis rilis skenario baru (seperti *The Shuntaisai Festival* per 26 Oktober 2026) dengan lencana visual ungu *Scenario Release*.
- **Mekanisme Khusus Banner Twinkle Collection**: Implementasi aturan resmi server JP 2026: pembagian rate 3,00% dibagi rata ke 8 karakter B3 (masing-masing 0,375%), penonaktifan otomatis status rate-up (`is_rate_up: false`), proteksi anti-spook/rate-off, serta akses penuh ke pool B1 (1★) dan B2 (2★).
- **Standarisasi Varian Kostum Resmi (`[...]`)**: Autocomplete dan filter input disaring ketat hanya untuk format nama bervarian kostum resmi dalam tanda kurung siku (contoh: `Daiwa Scarlet [Peak Blue]`), mengeliminasi entri duplikat atau ambigu.
- **Penyaringan Lanjutan, Paginasi & Rekalkulasi Pity Otomatis**: Filter komprehensif berdasarkan banner, jenis pool, kelangkaan, status rate-up, dan rentang tanggal. Pity counter (target spark 200) terisolasi per banner dan dihitung ulang secara otomatis saat penambahan, penyuntingan, atau penghapusan tarikan.
- **Dual-Pool Luck Meter & Binomial Probability**: Pemisahan metrik performa antara pool standar (3,00%) dan pool boosted (4,50%), dilengkapi evaluasi persentil keberuntungan berbasis distribusi kumulatif binomial $P(X \le k)$ dengan 5 tingkatan status akun (*Blessed* hingga *Cursed*).

### 2. Fans Gain & Career Tracker (Circle Quota Monitor)
- **Pencatatan Karir & Autorank Pintar (G s.d. LS24)**: Pencatatan sesi latihan mandiri maupun manual dengan pemetaan otomatis badge rank evaluasi 298-tier dari Pemula G hingga Legendary Cosmic Prism LS24 ($\ge 190.400$ pts) berdasarkan total skor perolehan, dengan kalibrasi presisi batas US–LG pada 76.000 pts mengikuti benchmark resmi server JP (`beta.daftuyda.moe`).
- **Dukungan Skenario Linimasa Terkini & Opsi Default Teratas**: Mendukung seluruh skenario resmi game dari yang terbaru hingga terlama, dipimpin oleh **The Shuntaisai Festival** (旬菜祭 / Shuntaisai) sebagai opsi bawaan teratas, *Tracen-ken*, *Beyond Dreams*, *Yukoma Onsen*, *Design Your Island*, *The Twinkle Legends*, dsb., dengan pengurutan kronologis presisi.
- **Ekstraksi OCR Screenshot Sisi Klien Dinamis (Tesseract.js On-Demand)**: Ekstraksi data hasil evaluasi karir langsung dari clipboard (`Ctrl + V`) atau berkas tangkapan layar di browser tanpa beban server. Menggunakan pemuatan pustaka dinamis (*dynamic import* `await import('tesseract.js')`) yang hanya diunduh saat dibutuhkan, menghemat ~1 MB bundel awal. Dilengkapi deteksi OCR multibahasa (EN, JP, ID) termasuk skenario *The Shuntaisai Festival*, kalkulasi tingkat keyakinan (*confidence score*) per kolom, dan penanda peringatan jika akurasi $< 75\%$.
- **Analitik Skenario & Penggunaan Karakter**: Agregasi performa per skenario latihan (rata-rata, rekor Max/Min fans, serta modal rincian karakter per skenario) dan modal statistik performa karakter komprehensif (kontribusi sesi, rata-rata fans, rekor rank, dan riwayat 5 sesi terakhir).
- **Riwayat Akumulasi Fans Bulanan Lampau**: Kartu rekam jejak performa bulanan historis dengan pemilih periode bulan (*Historical Month Selector*), menyajikan 4 metrik ringkasan (Total Fans, Sesi Run, Rata-rata Fans, Status Kuota) dan grafik kurva harian interaktif.
- **Target Kuota Kontekstual & Normalisasi Gambar GameTora**: Garis target kuota circle ditampilkan kontekstual pada tab bulan berjalan, serta integrasi engine normalisasi nama yang memastikan avatar resmi GameTora tampil akurat tanpa fallback inisial teks.

### 3. Visualisasi Data & Dashboard Analytics (Recharts)
- **Line Chart Akumulasi Fans Harian**: Memantau tren pertumbuhan akumulasi fans per hari sepanjang bulan berjalan terhadap garis target kuota bulanan circle.
- **Bar Chart Performa Skenario Latihan**: Komparasi rata-rata perolehan fans per run antar berbagai skenario pelatihan untuk evaluasi efisiensi rute grinding.
- **Donut Chart Sebaran Kelangkaan Gacha**: Visualisasi proporsi aktual perolehan SSR, SR, dan R terhadap nilai ekspektasi resmi (3,00% atau 4,50%) disertai indikator deviasi (*Luck Delta*).
- **Bar Chart Interval Pity**: Mengukur jarak sebaran jumlah tarikan antar perolehan kartu SSR berurutan untuk menganalisis frekuensi tarikan sukses.

### 4. Pemantau Kuota, Ritme Circle & Arsip Historis Club
- **Pemantauan Ritme Grinding Fans Bulanan**: Menghitung sisa kebutuhan fans terhadap target kuota bulanan (default 30M fans), sisa hari kalender, kebutuhan ritme harian riil (*required daily pace*), serta estimasi sesi run harian dengan indikator adaptif (*Ahead of Pace*, *On Track*, *Behind Schedule*).
- **Penandaan Anggota Nonaktif / Keluar (*Ex-Member*)**: Deteksi dan visualisasi otomatis anggota circle yang telah keluar dari club dengan label status khusus, strip indikator pada delta fans harian/mingguan, dan penataan posisi di bagian bawah tabel.
- **Penelusuran Arsip Historis Bulanan**: Pemilih periode bulan (`YYYY年 M月`) untuk memeriksa arsip data performa dan kontribusi fans seluruh anggota circle dari bulan-bulan lampau via snapshot lokal.
- **Widget Ritme Terpadu (`CirclePaceWidget`)**: Tampilan ringkasan ritme kuota di Dashboard dan menu Circle Club dengan fasilitas pembaruan target kuota bulanan secara langsung (*inline update*).

### 5. Jewel & Spark Planner (Server JP)
- **Kalkulator Tabungan Carat & Tiket**: Pencatatan saldo terpisah untuk Free Carat, Paid Carat, Tiket Karakter, dan Tiket Support Card, dengan target spark (0.5x, 1.0x, 2.0x) dan proyeksi perolehan hingga tanggal target dari rutinitas harian, mingguan, dan reward kompetitif.
- **Kalkulator Pengorbanan Jewel (Farming vs Gacha)**: Modul simulasi interaktif berbasis text box untuk menghitung dampak pengeluaran Jewel pada aktivitas kompetitif—seperti Reroll Faktor (30 Jewel/reroll), Spark Selection (100 Jewel/penggunaan), dan pembelian Ability Pt (1 Jewel/Pt)—terhadap sisa modal gacha impian.
- **Auto-Fill Saldo Modal Awal**: Nilai Jewel yang tersedia terisi 100% otomatis dari total saldo aset saat ini (`Free Carats + Paid Carats`) tanpa perlu input manual, disertai konversi ekuivalensi tarikan gacha yang terkorbankan (150 Jewel/pull).
- **Kalibrasi Resmi Cygames (Durasi 12 Menit & Biaya Pt Turun 80%)**: Menyerap pembaruan resmi Cygames (News #3497 per 14 Oktober 2026) mengenai penyesuaian durasi Trainer Ability menjadi 12 menit dan pemotongan biaya Ability Pt hingga 80% untuk 8 jenis buff latihan.
- **Penanganan Cerdas Tanggal Target & Daily Jewel Pack**: Penyesuaian reward Daily Missions ke 50 Carats/hari, formula Daily Jewel Pack yang menghitung penuh 50 Free Carats harian (total 2.000 Carat / 30 hari pack), tombol cepat rentang waktu (+30, +60, +90 Hari), dan proteksi auto-advance jika tanggal target telah lampau.
- **Dukungan Penuh Hadiah Turnamen League of Heroes & Bonus Platinum 4**: Tabel hadiah kumulatif lengkap League of Heroes mulai dari Bronze 2 hingga Platinum 4 (30 s.d. 3.290 Carat + 4 Tiket dengan pemetaan presisi Tiket Karakter/Support pada tier Gold 1–4) serta milestone **Platinum 4 Score Rewards (+100 Carat per 2.000pt)** hingga skor liga +20.000pt (total 4.290 Carat) untuk proyeksi tabungan kompetitif yang akurat.

### 6. Koleksi Karakter, Support Card, Reverse Finder, Komparator & Simulasi Deck 6 Kartu (Server JP)
- **Katalog Koleksi Karakter**: Pelacakan status kepemilikan karakter dan varian kostum resmi yang disinkronkan dari GameTora JP, lengkap dengan modal tampilan ilustrasi berdiri (*Stand Zoom*).
- **Konfigurasi Karakter Mendalam**: Pengaturan level bintang (1★ s.d. 5★ dengan proteksi bintang dasar), pohon status skill (Innate, Awakening Lv 2–5, Evolved), dan grade adaptasi lintasan (*Aptitudes*).
- **Katalog Koleksi Support Card**: Pelacakan kartu bantuan berdasarkan kelangkaan (SSR, SR, R) dan tipe atribut, lengkap dengan matriks limit break (0LB s.d. 4LB/MLB), efek unik kartu, support hints, dan alur event latihan (*Continuous Events*).
- **Parser & Formatter Efek Unik Support Card Otentik GameTora**: Mengeliminasi kode placeholder internal mentah seperti `"Type 101: +80%"` atau `"Type 103: +4%"`, menyajikan deskripsi bilingual (Bahasa Indonesia & Bahasa Inggris resmi GameTora), lencana kondisi pemicu aktivasi (*Gauge Ikatan ≥ 80*, *≥ 4 Jenis Kartu di Dek*, *Batas Energi > 100*), serta rincian lencana bonus status individual pada modal detail kartu dan komparator.
- **Pencari Sumber Skill Global (*Reverse Skill Finder* / 逆引きスキル検索) & Modal Katalog Seluruh Skill**: Tab pencarian terbalik untuk menemukan Support Card dan karakter Uma Musume yang menyediakan skill tertentu (via Hints, Event Skills, Innate, Awakening Lv 2–5, Unique, atau Evolved Skills) lengkap dengan filter kelangkaan, jenis sumber, status kepemilikan, 3 preset pencarian meta cepat (*Groundwork*, *Maestro*, *Curvature*) yang sejajar rapi dengan tombol *"Lihat Semua Skill"*, penempatan nama skill di antara badge kelangkaan dan jumlah sumber, layout kartu pemberi satu baris penuh (`grid-cols-1`) bebas teks terpotong, interaktivitas klik kartu dan karakter langsung ke modal detail, pemilihan langsung kartu komparasi `⚖️ Banding` / `✓ Dipilih`, tombol pintasan global *"🔎 Cari Kartu & Karakter Pemberi Skill Ini"* pada modal formula dengan penutupan modal bertingkat otomatis (*Cascading Modal Dismissal*), filter taktis multi-dimensi (Jarak, Gaya Lari, Kategori Efek) pada modal katalog seluruh skill, deteksi tautan pasangan skill terkait (*Gold $\leftrightarrow$ White*, *Evolved*, `○` $\leftrightarrow$ `◎`), serta integrasi modal detail formula matematis skill yang presisi.
- **Komparator Side-by-Side 2 Support Card (0LB–MLB)**: Alat perbandingan langsung dua kartu bantuan secara berdampingan dengan pemilih level Limit Break independen (0LB s.d. MLB) yang secara cerdas mendeteksi level kepemilikan riil, tabel perbandingan efek support terpadu dengan penandaan keunggulan otomatis (*Delta Highlight* hijau lembut), komparasi efek unik (*Unique Effects*), serta perbandingan *Hint Skills* dan *Event Skills*.
- **Simulasi Deck 6 Support Card (*6-Card Support Deck Builder* / 編成シミュレーター) & Manajemen Preset Formasi**:
  Tab ke-4 pada menu Koleksi yang memungkinkan pelatih merancang formasi 6 kartu bantuan (5 slot koleksi sendiri + 1 slot pinjaman teman *Friend Borrow* dari katalog penuh berstatus default 4LB/MLB), pengaturan level Limit Break interaktif (0LB..MLB), deteksi proteksi duplikasi karakter yang sama di dalam satu dek, kalkulasi efek latihan dengan pemisahan ketat 2 bagian (Bagian A: HANYA 4 efek yang dijumlahkan—*Race Bonus*, *Fan Bonus*, *Initial Stats*, *Initial Skill Pt*; Bagian B: rincian efek latihan lainnya yang dicantumkan berurutan per kartu tanpa dijumlahkan), validator kondisi efek unik dek (*Deck Unique Effect Validator* untuk Tipe 103 keragaman jenis kartu di dek dan Tipe 105), agregator perolehan skill dek (*Deck Skills Aggregator* dari Hint, Event, dan Gold/Rare dengan deduplikasi badge kartu di dek serta integrasi modal formula skill), dan sistem penyimpanan/pengelolaan preset formasi taktis ke backend API (`/api/collection/deck-presets`) dengan tag skenario latihan (default *The Shuntaisai Festival*).
- **Pemuatan Modular Asinkron (*Lazy Loaded Modals*)**: Seluruh modal detail karakter, detail support card, komparator kartu, simulasi formasi dek, dan formula skill dimuat secara dinamis (*lazy loading*) via `React.lazy()` guna menjaga performa rendering antarmuka tetap ringan dan responsif.
- **Formula & Efek Skill Terintegrasi**: Akses rujukan formula skill GameTora mencakup tipe efek, target balapan dinamis, durasi dasar, dan kondisi pemicu aktivasi.

### 7. Inheritance Affinity & Compatibility Calculator (Server JP - 相性計算機)
- **Diagram Silsilah 7 Slot Interaktif (Pedigree Tree)**: Struktur silsilah 7 posisi lengkap (Target Trainee, Parent 1 & 2, Grandparent 1A, 1B, 2A, 2B) dengan modal pemilih karakter terpadu dari katalog GameTora dan koleksi lokal pengguna.
- **Formula Kompatibilitas Resmi Server JP**: Menghitung Base Affinity Matrix berdasarkan afinitas historis dan rute balap bawaan, bonus kemenangan balapan G1 bersama (*G1 Shared Victory Bonus* standar resmi +3 poin/balapan sejak 2nd Anniversary), serta kalkulasi kompatibilitas 3-arah (*Triple Affinity*).
- **Klasifikasi Badge Ambang Batas Resmi**: Pengelompokan skor resmi game: △ (Rendah: < 51 pts), ○ (Normal: 51–150 pts), dan ◎ (Maksimal / Double Circle: $\ge 151$ pts) dengan progress bar dinamis dan accordion rincian subskor per relasi.
- **Validasi Anti-Duplikasi Karakter Silsilah**: Penegakan aturan resmi game untuk mencegah duplikasi karakter pada cabang keluarga yang sama (termasuk varian kostum berbeda) dengan penonaktifan otomatis pada pemilih dan peringatan visual diagram.
- **Rekomendasi Cepat & Sinkronisasi Balapan**: Algoritma cerdas pencarian pasangan parent terbaik dari koleksi lokal pengguna, serta opsi impor balapan langsung dari riwayat karir pelatihan sebelumnya.

### 8. Upcoming CM/LoH Competition Planner (Official Cygames 2026–2027)
- **Prinsip Nol Data Spekulatif (*Zero Speculative Data*)**: Seluruh parameter kompetisi bersumber eksklusif dari portal resmi Cygames JP (News #3483). Kondisi belum dirilis ditandai eksplisit "Belum diumumkan" dan kondisi acak (seperti cuaca LoH) ditandai "Acak", mengeliminasi asumsi atau datamining.
- **Linimasa Kronologis & Deteksi Event Real-Time**: Jadwal kompetisi terurut kronologis presisi (`year`, `month`, `period`, `start_date`) dengan indikator status aktif, hitung mundur hari, widget terdekat pada dasbor, bar simulasi tanggal interaktif, dan navigasi halaman rincian deep-linking (`?event=<id>`).
- **Modal Aturan Khusus "No Debuff" & Terjemahan Kondisi**: Rujukan resmi aturan khusus larangan debuff (CM MILE Maret 2027) mencakup katalog 55 skill debuff GameTora, serta mesin penerjemah kondisi balapan (termasuk status tergesa-gesa / *kakari*, panik, dan jarak relatif *distance_diff_rate*) ke Bahasa Indonesia.
- **Rekomendasi Green Skills Resmi**: Rekomendasi otomatis pasif skill hijau berdasarkan kondisi resmi balapan (jarak, sirkuit, putaran, musim, cuaca, dan kondisi trek) bersumber dari katalog GameTora, dengan penanganan khusus untuk kondisi acak sebagai rekomendasi situasional.
- **Diagram Layout Sirkuit & Fase Balapan Resmi**: Menampilkan visualisasi diagram lintasan sirkuit dan tahapan 4 fase balapan resmi (Early, Mid, Late, Last Spurt) GameTora untuk event yang terkonfirmasi resmi (misal: Kyoto 2200m Turf Outer, Kyoto 3000m Turf Outer, Nakayama 2500m Turf Inner), lengkap dengan tabel metrik 5-kolom, tab putaran (*All Laps, Lap 1, Lap 2*), dan modal pratinjau resolusi tinggi.
- **Target Stats & Panduan Recovery Komunitas JP (GameWith)**: Integrasi benchmark target 5-atribut stats dan kebutuhan recovery event berbasis komunitas terverifikasi (GameWith) untuk turnamen yang telah diumumkan resmi. Turnamen tanpa konfirmasi lintasan lengkap tetap dilindungi dengan disclaimer transparan tanpa spekulasi.
- **Katalog Skill Recovery & Pemisahan Multi-Efek**: Menampilkan 257 skill pemulihan stamina dari data GameTora lokal dengan klasifikasi terpisah antara *Recovery Utama* (murni efek Type 9) dan *Skill Multi-Efek dengan Recovery* (recovery + speed/akselerasi pendamping), lengkap dengan badge visual `Multi-Efek`, label atribusi karakter unik original/warisan, serta modal detail rincian formula.
- **Penyaringan Rentang Jarak Otomatis Sesuai Turnamen**: Penyelarasan dinamis yang secara otomatis menampilkan skill recovery yang kompatibel dengan kategori jarak turnamen yang dipilih (Medium, Long, Mile, Sprint) berdampingan dengan skill untuk semua jarak, serta mengeksklusikan skill jarak lain yang tidak kompatibel.

### 9. Sistem Pencadangan Data Teruji & Manajemen Retensi (Backup Schema v2.0)
- **Integritas Transaksional & Skema Versi 2.0**: Validasi skema ketat dengan whitelist versi (`0.9`, `1.0`, `2.0`), proteksi nilai numerik `base_rate`, resolusi aman relasi foreign key via identitas unik katalog, dan transaksi atomik dengan rollback penuh jika terjadi kegagalan impor.
- **Dua Mode Pemulihan Fleksibel**: Mode *Merge* (menggabungkan data cadangan ke basis data aktif dengan resolusi konflik deterministik) dan Mode *Overwrite* (mengosongkan 9 entitas database sebelum memulihkan data secara utuh).
- **Manajemen Retensi Arsip & Pembersihan Berkas Usang**: Dukungan retensi pembersihan berkas cadangan lama pada `storage/app/backups/` via tombol antarmuka web *"Bersihkan Arsip Lama (Simpan 1)"*, endpoint REST `POST /api/backup/prune`, serta opsi baris perintah `php artisan uma:backup --keep=N`.
- **Akses Web UI & Perintah CLI Artisan**: Pencadangan dan pemulihan data dapat dijalankan melalui antarmuka web interaktif maupun perintah command-line `php artisan uma:backup` dan `php artisan uma:restore`.

### 10. Progressive Web App (PWA) & Mobile Navigation
- **PWA Siap Pasang (*Standalone*)**: Konfigurasi Web App Manifest terkalibrasi (`vite-plugin-pwa`) dengan root path resmi, tema warna, ikon multi-resolusi, dan dukungan pemasangan aplikasi pada desktop maupun perangkat seluler.
- **Pre-Caching Aset CDN & Fallback Luring**: Strategi Workbox `CacheFirst` dengan masa simpan 30 hari untuk aset CDN GameTora (`gametora-cdn-cache`), dilengkapi fallback grafis vektor SVG inisial lokal saat koneksi terputus/luring.
- **Navigasi Mobile Ramah Sentuhan**: Menu navigasi bilah bawah (*Sticky Bottom Navigation*) yang dioptimalkan khusus untuk layar ponsel dengan target sentuh ergonomis dan bebas scrollbar horizontal liar.

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
Mengunduh dan menyinkronkan data katalog karakter, support card, banner JP 2026+, serta katalog sirkuit pacuan kuda resmi:
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

# Simpan cadangan sekaligus bersihkan arsip lama (simpan 1 file terbaru)
php artisan uma:backup --keep=1

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

| Grup Modul / Prefix | Endpoint Utama | Ringkasan Fungsi & Kapabilitas |
|---|---|---|
| **Gacha Tracker** (`/api/gacha/*`) | `banners`, `pulls`, `stats`, `luck-percentile`, `sync-catalog` | Manajemen riwayat tarikan (single, 10-pull, batch), rekalkulasi pity counter otomatis (target 200), audit rate banner standar/boosted, evaluasi keberuntungan binomial kumulatif, sinkronisasi katalog banner JP 2026+, serta sinkronisasi otomatis berita pengumuman resmi Cygames JP (`CygamesNewsService`) untuk lineup 10 kartu *Select Pickup*. |
| **Career & Fans** (`/api/career/*`) | `runs`, `stats`, `metadata`, `bulk-delete` | Pencatatan sesi latihan karir, pemetaan autorank resmi (G hingga LS24), pelacakan kuota fans circle, analisis agregat performa skenario, dan metadata OCR. |
| **Affinity Calculator** (`/api/affinity/*`) | `calculate`, `recommendations/{targetId}`, `races`, `career-runs` | Perhitungan kompatibilitas silsilah 7-slot (Base Affinity + G1 Shared Victory + Triple Affinity), penegakan aturan anti-duplikasi, serta rekomendasi pasangan parent terbaik dari koleksi lokal. |
| **Koleksi** (`/api/collection/*`) | `characters`, `support-cards`, `skill-detail`, `skill-sources`, `deck-presets` | Pelacakan kepemilikan karakter (1★–5★, skill tree) dan support card (0LB–MLB, hint/event effect), perincian formula & efek skill GameTora, pencarian terbalik sumber skill global (*Reverse Skill Finder*), serta penyimpanan dan pengelolaan formasi dek 6 kartu (*Deck Presets*). |
| **Competition Events** (`/api/competition-events/*`) | `competition-events`, `{id}` | Linimasa kronologis resmi CM & LoH (Zero Speculative Data), aturan khusus (misal No Debuff), rekomendasi green skills resmi, objek diagram layout sirkuit & fase balapan GameTora, serta penyajian `recommended_build_guide` (referensi rekomendasi benchmark target stats GameWith dan katalog skill recovery terklasifikasi sesuai jarak balapan). |
| **Backup & Restore** (`/api/backup/*`) | `stats`, `export`, `import`, `prune` | Ekspor dan impor data 9 entitas basis data terstruktur (Schema v2.0) dengan validasi whitelist versi, mode `merge` / `overwrite`, isolasi proteksi event resmi, pembersihan retensi berkas lama server (`prune`), dan atomic rollback transaksional. |
| **Circle Tracker** (`/api/circle-tracker/*`) | `status`, `refresh`, `track-player` | Pemantauan ritme kuota bulanan circle, indikator status pacing harian riil, arsip data historis bulanan, dan deteksi otomatis anggota yang telah keluar (*ex-member*). |
| **Planner & Settings** (`/api/planner/*`, `/api/settings`, `/api/changelog`, `/api/dashboard/summary`) | `config`, `settings`, `changelog`, `summary` | Konfigurasi target tabungan Jewel/Carat, simulasi pengorbanan Jewel (farming vs gacha), pengaturan kuota circle, parsing berkas riwayat pembaruan Markdown ke JSON/HTML terstruktur (`/api/changelog`), dan ringkasan metrik dashboard utama. |

---

## 🧪 Pengujian Otomatis & Pemformatan Kode

Aplikasi dilengkapi rangkaian pengujian otomatis berbasis **PHPUnit** pada database memori terisolasi (`:memory:`):

```bash
# Menjalankan seluruh pengujian (241 tests, 8.574 assertions)
php artisan test --compact

# Menjalankan pengujian spesifik
php artisan test --filter=CompetitionEventTest
php artisan test --filter=SkillConditionTranslatorTest
php artisan test --filter=CygamesNewsSyncTest
php artisan test --filter=AffinityCalculatorTest
php artisan test --filter=BackupRoundTripTest
php artisan test --filter=BackupIntegrityTest
php artisan test --filter=GachaRateAuditTest
php artisan test --filter=GachaTwinkleCollectionTest

# Menjalankan pemformat kode PHP (Laravel Pint)
vendor/bin/pint
```

### Cakupan Pengujian:
- **Upcoming Competition Planner**: Integritas seeder tepat 6 event resmi Cygames 2026–2027, idempotensi seeder tanpa duplikasi, pengurutan kronologis presisi multi-prioritas (`year`, `month`, `period`, `start_date`), preservasi nilai `NULL` dan eksplisit `"random"` pada LoH, isolasi aturan khusus `no_debuff` pada CM MILE Maret 2027, integritas dataset 17 sirkuit pada `racetracksCatalog.json`, lampiran objek layout sirkuit resmi `racetrack_course` untuk event terkonfirmasi, isolasi nilai `NULL` untuk event yang belum diumumkan (Zero Speculative Data), referensi target stats & panduan recovery komunitas GameWith, pemisahan klasifikasi recovery stamina murni (`recovery_only`) vs skill multi-efek (`mixed_effect_recovery`), penyaringan dinamis rentang jarak yang kompatibel (`middle`/`medium`, `long`, multi-distance), serta pengujian serialisasi API.
- **Inheritance Affinity & Compatibility**: Pengujian kalkulasi kompatibilitas silsilah 7 slot lengkap, penambahan bonus kemenangan G1 bersama (+3 poin/balapan), ambang batas klasifikasi badge (△, ○, ◎), validasi ketat anti-duplikasi karakter silsilah lintas kostum, dan algoritma rekomendasi indukan terbaik dari koleksi user.
- **Backup & Restore Integrity**: Pengujian pemulihan round-trip, kepatuhan skema v2.0, proteksi atomik rollback, penolakan versi tidak dikenal, integritas foreign key SQLite, isolasi dan proteksi mutlak tabel `competition_events` dari manipulasi payload impor backup, validasi `validateStructuredJson` pada 7 kolom JSON katalog, dan pemulihan field JSON katalog.
- **Gacha Logic, Twinkle Collection & Rate Audit**: Verifikasi persistensi atribut `base_rate` (3,00% vs 4,50%), kalkulasi dinamis featured rate-up 0,75%, aturan khusus banner Twinkle Collection (pembagian rate 3% terbagi rata tanpa rate-up, isolasi pool B3 8 karakter, dan dukungan pool B1/B2), eksklusivitas karakter bervarian kostum resmi `[...]` pada katalog metadata gacha, ekstraksi otomatis dan provenance berita pengumuman resmi Cygames JP untuk *Select Pickup* (`CygamesNewsSyncTest`), eksklusi banner berbayar (`scam_gacha = true` / `restriction = premium`), dan siklus hidup pity counter.
- **Koleksi & GameTora Sync**: Proteksi batas minimum bintang karakter bawaan, matriks efek status kartu bantuan 0LB–MLB, integritas hash pembaruan katalog, serta sinkronisasi dataset sirkuit balap.
- **PWA & UI Routing**: Verifikasi manifest PWA, routing service worker, dan pengalihan build fallback.

---

## 📄 Lisensi, Hak Cipta & Atribusi

- **Disclaimer Aplikasi**: Aplikasi ini merupakan proyek *fan-made* non-komersial yang dikembangkan untuk membantu para trainer dalam mencatat riwayat gacha dan ritme grinding fans kuota Circle Club.
- **Hak Cipta Karakter & Aset Game**: [*Uma Musume: Pretty Derby (ウマ娘 プリティーダービー)*](https://umamusume.jp/) beserta seluruh materi dan aset terkait merupakan hak cipta eksklusif milik © [**Cygames, Inc.**](https://www.cygames.co.jp/)
- **Sumber Data Katalog Komunitas**: Seluruh data nama karakter, varian kostum, kartu bantuan, dan jadwal banner JP disinkronkan dari platform komunitas [GameTora](https://gametora.com/umamusume). Rujukan benchmark target stats kompetisi mengacu pada panduan komunitas terverifikasi [GameWith JP](https://gamewith.jp/uma-musume/), serta rujukan jadwal pengumuman dan lineup resmi bersumber langsung dari portal berita resmi [Cygames JP](https://umamusume.jp/news/).
- **Pengembangan dengan Bantuan AI**: Program dan repositori ini dibuat seutuhnya (*100% full AI-generated*) dengan bantuan kecerdasan buatan (AI) yang dipandu dan diaudit melalui pengujian otomatis untuk memastikan stabilitas serta kesesuaian logika aplikasi.
