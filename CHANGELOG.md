# 📋 Log Riwayat Pembaruan (Changelog)

Seluruh perubahan penting, penambahan fitur baru, perbaikan bug, dan penyempurnaan antarmuka pada aplikasi **Uma Musume Pretty Derby Companion** didokumentasikan dalam file ini. Format penomoran versi mengikuti prinsip [Semantic Versioning](https://semver.org/).

## [Versi 2.6.3] - 8 Oktober 2026

### 🏁 Layout Sirkuit & Fase Balapan Resmi (Official Racetrack Layout & Phases)
- **Integrasi Diagram Sirkuit & Fase Balapan GameTora**:
  - Menampilkan layout diagram sirkuit resmi dan pembagian fase perlombaan pada halaman rincian detail event ([`CompetitionEventDetailView.jsx`](file:///c:/Projects/uma-tracker/resources/js/components/CompetitionEventDetailView.jsx)) untuk gelaran balap yang kondisinya telah terkonfirmasi resmi:
    - **Event #1 (CM Classic Oktober 2026)**: Kyoto 2200m Turf Outer (`https://gametora.com/umamusume/racetracks/kyoto#2200-turf-outer`, Course ID `10808`).
    - **Event #2 (LoH November 2026)**: Kyoto 3000m Turf Outer (`https://gametora.com/umamusume/racetracks/kyoto#3000-turf-outer`, Course ID `10810`).
    - **Event #3 (CM Long Desember 2026)**: Nakayama 2500m Turf Inner (`https://gametora.com/umamusume/racetracks/nakayama#2500-turf-inner`, Course ID `10506`).
- **Prinsip Bebas Spekulasi (Zero Speculative Data)**:
  - Event masa depan yang informasi resminya belum diumumkan oleh Cygames (seperti Event #4, #5, dan #6) secara ketat dikecualikan dan tidak menampilkan layout lintasan hingga data resmi diumumkan.
- **Lokalisasi Lengkap Bahasa Indonesia**:
  - Seluruh fase lomba, label legenda, dan penanda sirkuit diterjemahkan ke Bahasa Indonesia dengan terminologi resmi:
    - **Fase Balapan**: *Fase Awal (Early-Race)*, *Fase Tengah (Mid-Race)*, *Fase Akhir (Late-Race)*, dan *Spurt Terakhir (Last Spurt)*.
    - **Legenda & Simbol Lintasan**: *Trek Lurus (Straights)*, *Tikungan (Corners)*, *Tanjakan (Slope Up)*, *Turunan (Slope Down)*, *Datar (Flat)*, *Posisi Tetap Berakhir (Position Keep End)*, dan *Mulai Memacu (Spurt Start)*.
    - **Tabel Metrik**: Rincian jarak dan elevasi per fase, tikungan, kemiringan, trek lurus, penanda khusus (seperti batas akselerasi dan threshold stat lintasan).
- **Interaktivitas Visual & Navigasi**:
  - **Tab Pilihan Putaran (Laps)**: Menampilkan tab *Semua Putaran (All Laps)*, *Putaran 1*, dan *Putaran 2* untuk sirkuit multi-lap dengan diagram khusus tiap lap.
  - **Modal Pratinjau & Unduh Resolusi Tinggi**: Tombol buka modal zoom resolusi tinggi dan tautan langsung untuk mengunduh diagram penuh dari GameTora.
  - **Tautan Resmi GameTora**: Tautan langsung ke halaman sirkuit terkait dengan format standar `https://gametora.com/umamusume/racetracks/{region}#{jarak}-{turf/dirt}-{inner/outer}`.
- **Dataset & Sinkronisasi Otomatis**:
  - Membuat basis data sirkuit lokal di [`racetracksCatalog.json`](file:///c:/Projects/uma-tracker/resources/js/data/racetracksCatalog.json) mencakup 17 sirkuit pacuan kuda Jepang.
  - Mengintegrasikan sinkronisasi berkala dataset `racetracks` dan `racetracks_extended` pada [`GameToraSyncService.php`](file:///c:/Projects/uma-tracker/app/Services/GameToraSyncService.php) dan [`CompetitionRacetrackHelper.php`](file:///c:/Projects/uma-tracker/app/Support/CompetitionRacetrackHelper.php).
  - Melengkapi rangkaian uji otomatis di [`CompetitionEventTest.php`](file:///c:/Projects/uma-tracker/tests/Feature/CompetitionEventTest.php) (seluruh 210 tests lolos dengan 2.846 assertions).

### 📚 Sinkronisasi Dokumentasi & Spesifikasi Proyek (`README.md`)
- **Dokumentasi Fitur Layout Sirkuit & Fase Lomba**:
  - Mendokumentasikan fitur visual diagram layout sirkuit resmi, fase balapan, legenda, tabel metrik 5 kolom, dan prinsip Zero Speculative Data pada Bagian 8 `README.md`.
- **Pembaruan Endpoint REST API & Perintah Artisan**:
  - Memperbarui tabel endpoint `GET /api/competition-events` dan `GET /api/competition-events/{id}` terkait objek `racetrack_course`.
  - Menyelaraskan deskripsi perintah CLI `php artisan uma:sync-catalog` terkait sinkronisasi dataset sirkuit balap.
- **Pembaruan Statistik Test Suite**:
  - Memperbarui catatan statistik pengujian otomatis menjadi **210 tests, 2.846 assertions**.

## [Versi 2.6.2] - 8 Oktober 2026

### 🔍 Indikator Tingkat Keyakinan OCR & Validasi Input Visual
- **Deteksi Confidence Score Per Kolom Form**:
  - Mengkalkulasi tingkat keyakinan (*confidence percentage*) pengenalan teks dari Tesseract.js secara individual untuk setiap kolom hasil ekstraksi: `uma_name`, `final_rank`, `evaluation_score`, `fans_gained`, dan `scenario` pada [`CareerOcrZone.jsx`](file:///c:/Projects/uma-tracker/resources/js/components/CareerOcrZone.jsx).
  - Menampilkan lencana persentase akurasi di setiap tag hasil pemindaian OCR.
  - Menambahkan banner peringatan otomatis jika ada salah satu kolom yang terdeteksi dengan keyakinan di bawah 75%.
- **Highlighting & Penanda Peringatan pada Form Input**:
  - Pada formulir input fans ([`FansView.jsx`](file:///c:/Projects/uma-tracker/resources/js/components/FansView.jsx)), kolom yang memiliki keyakinan rendah (< 75%) otomatis diberi garis tepi (*border*) berwarna amber/kuning menyala serta lencana peringatan *"Cek Ulang (< 75%)"*.
  - Peringatan otomatis dihapus secara reaktif saat pelatih mengedit/memperbaiki nilai kolom, memilih saran karakter, atau menekan tombol skor cepat (*Quick Score*).

### 🚀 Optimasi PWA Offline Caching & Fallback Visual Anggun
- **Pre-caching Aset GameTora via Workbox**:
  - Menambahkan konfigurasi Workbox `runtimeCaching` pada [`vite.config.js`](file:///c:/Projects/uma-tracker/vite.config.js) untuk domain CDN `https://gametora.com/.*`.
  - Menggunakan strategi `CacheFirst` dengan masa kedaluwarsa 30 hari dan kapasitas hingga 1.500 aset (`gametora-cdn-cache`), memungkinkan ikon karakter, support card, dan skill tetap diakses dengan cepat saat offline atau koneksi lambat.
- **Fallback Avatar Lokal saat Offline**:
  - Menambahkan penanganan `onError` pada gambar avatar karakter di [`FansView.jsx`](file:///c:/Projects/uma-tracker/resources/js/components/FansView.jsx).
  - Menghasilkan avatar inisial vektor SVG lokal secara instan tanpa ketergantungan jaringan eksternal apabila gambar CDN gagal dimuat saat mode luring.

### 📚 Sinkronisasi Dokumentasi & Spesifikasi Proyek (`README.md`)
- **Pembaruan Hierarki Rank Resmi**:
  - Memperbarui dokumentasi rentang hierarki rank evaluasi dari `LG24` menjadi `LF24` (mencakup Legend F: `LF` s.d. `LF24` hingga $\ge 104.800$ pts).
- **Pembaruan Statistik Test Suite**:
  - Menyelaraskan catatan jumlah pengujian otomatis menjadi **208 tests, 2.810 assertions**.
- **Dokumentasi Fitur Komprehensif v2.6.0 & v2.6.1**:
  - Mendokumentasikan fitur Rekomendasi Green Skills Resmi (GameTora & Zero Speculative Data) dan Dedicated Page Navigation (`?event=<id>`) pada Bagian 8.
  - Mendokumentasikan kartu Riwayat Akumulasi Fans Bulan-Bulan Lampau dan Target Kuota Circle Kontekstual pada Bagian 2.
- **Pembaruan Tabel REST API**:
  - Menambahkan dokumentasi endpoint baru: `GET /api/collection/skill-detail`, `POST /api/gacha/pulls/bulk-update`, dan `GET /api/changelog`.

## [Versi 2.6.1] - 8 Oktober 2026

### 🌐 Terjemahan Bahasa Indonesia Rincian Lomba & Green Skills
- **Lokalisasi Lengkap Deskripsi Panduan Green Skills**:
  - Menerjemahkan panduan pemanfaatan parameter lomba pada menu rincian event ([`CompetitionEventDetailView.jsx`](file:///c:/Projects/uma-tracker/resources/js/components/CompetitionEventDetailView.jsx)) ke dalam Bahasa Indonesia:
    *"Dengan mengetahui parameter lintasan, Anda dapat memanfaatkannya saat mempersiapkan Uma Musume untuk mengincar green skill spesifik (contoh: untuk syarat aktivasi Groundwork / 地固め maupun tambahan stat murni)."*

### 📊 Sinkronisasi Akurat Jumlah Data Katalog pada Footer
- **Pembaruan Statistik Katalog Terkini**:
  - Menyesuaikan angka total aset pada footer aplikasi ([`AppMain.jsx`](file:///c:/Projects/uma-tracker/resources/js/AppMain.jsx)) agar selaras dengan data basis data saat ini:
    - **Support Cards**: Diperbarui menjadi **563 kartu** (316 SSR, 101 SR, 146 R).
    - **Varian Karakter**: Diperbarui menjadi **271 pilihan** (249 bintang 3★, 13 bintang 2★, 9 bintang 1★).

### 📈 Peningkatan Analisis Pelacakan Karir & Fans
- **Visibilitas Target Kuota Circle Sesuai Tab**:
  - Garis referensi target kuota (`ReferenceLine`) serta label perbandingan target kuota pada grafik tren akumulasi fans harian kini hanya dimunculkan saat tab **"Bulan Berjalan"** aktif (`careerRange === 'this_month'`).
  - Menyembunyikan target kuota pada tab **"30 Hari"** dan **"7 Hari"** di halaman Analisis ([`AnalyticsView.jsx`](file:///c:/Projects/uma-tracker/resources/js/components/AnalyticsView.jsx)) dan Dasbor ([`DashboardView.jsx`](file:///c:/Projects/uma-tracker/resources/js/components/DashboardView.jsx)) agar tampilan fokus pada rentang hari yang dipilih.
- **Card Baru: Trek Akumulasi Fans Bulan-Bulan Sebelumnya**:
  - Menambahkan kartu arsip riwayat akumulasi fans per bulan lampau pada halaman Analisis Karir & Fans.
  - **Pemilih Bulan Lampau (Historical Month Selector)**: Memungkinkan pelatih memilih dan meninjau performa tiap bulan sebelumnya (misal: *September 2026* dengan total 83,11M fans dan 120 run) beserta status pencapaian target kuota bulanan.
  - **4 Metrik Ringkasan Utama**: Menampilkan Total Fans, Total Karir Run, Rata-Rata Fans/Run, serta Persentase dan Lencana Status Kuota (*Kuota Tercapai 🎉*).
  - **Grafik Akumulasi Harian Interaktif**: Menampilkan kurva akumulasi fans harian dari awal hingga akhir bulan lampau terhadap garis target kuota circle dalam satuan Jutaan (M).
  - **Backend Support & Database Portability**: Menghitung data historis bulanan secara efisien dan portabel di [`CareerController.php`](file:///c:/Projects/uma-tracker/app/Http/Controllers/Api/CareerController.php) serta menambahkan pengujian fitur terintegrasi di [`UmaTrackerApiTest.php`](file:///c:/Projects/uma-tracker/tests/Feature/UmaTrackerApiTest.php).

## [Versi 2.6.0] - 8 Oktober 2026

### 🏁 Halaman Khusus Rincian Event CM & LoH (Dedicated Page Navigation)
- **Transisi Tampilan Penuh di Tab yang Sama**:
  - Tombol **"Lihat Rincian Lengkap"** pada kartu event maupun pintasan kartu event pada Dasbor kini langsung membuka halaman rincian lengkap balapan di tab yang sama melalui komponen baru [`CompetitionEventDetailView.jsx`](file:///c:/Projects/uma-tracker/resources/js/components/CompetitionEventDetailView.jsx).
  - Mengeliminasi popup modal dialog sebelumnya demi kenyamanan analisis rincian trek dan strategi balapan.
  - Menyediakan tombol navigasi **"← Kembali ke Daftar Event"** serta breadcrumb untuk beralih kembali ke daftar event kapan saja.
- **Dukungan URL Deep-Linking & Browser History**:
  - Sinkronisasi state event terpilih dengan query parameter URL (`?event=<id>`) dan `window.history.pushState`.
  - Tombol Back/Forward pada browser serta refresh halaman bekerja secara mulus untuk langsung membuka rincian event terkait.

### 🌿 Rekomendasi Green Skills Resmi (Standar GameTora & Zero Speculative Data)
- **Mesin Pencocokan Green Skills Deterministik**:
  - Mengimplementasikan modul recommender pada backend [`CompetitionGreenSkillRecommender.php`](file:///c:/Projects/uma-tracker/app/Support/CompetitionGreenSkillRecommender.php) dan utilitas frontend [`greenSkillHelper.js`](file:///c:/Projects/uma-tracker/resources/js/utils/greenSkillHelper.js).
  - Menghimpun 26 katalog green skills GameTora lengkap dengan data kondisi aktivasi dan efeknya pada [`greenSkillsCatalog.json`](file:///c:/Projects/uma-tracker/resources/js/data/greenSkillsCatalog.json).
  - Mencocokkan kondisi resmi balapan terkonfirmasi:
    - **Arah Putaran**: *Right-Handed ○ (右回り○)* atau *Left-Handed ○ (左回り○)* (+40 Speed).
    - **Sirkuit / Venue**: *Kyoto Racecourse ○ (京都レース場○)*, *Nakayama Racecourse ○ (中山レース場○)*, *Tokyo*, *Hanshin*, dll. (+40 Stamina).
    - **Jarak Lintasan**: *Standard Distance ○ (根幹距離○)* untuk kelipatan 400m atau *Non-Standard Distance ○ (非根幹距離○)* untuk non-kelipatan 400m (+40 Stamina).
    - **Musim**: *Fall Runner ○ (秋ウマ娘○)*, *Winter Runner ○ (冬ウマ娘○)*, *Spring*, *Summer* (+40 Speed).
    - **Cuaca & Kondisi Trek** (pada gelaran CM dengan kondisi pasti): *Sunny Days ○*, *Cloudy Days ○*, *Good Track Condition ○*, dll.
  - Setiap kartu green skill dilengkapi ikon resmi CDN GameTora, nama dwibahasa, lencana status stat (+40 Speed / Stamina / Power / Guts), deskripsi dwibahasa, lencana rekomendasi, serta tombol **"More"** untuk memeriksa formula aktivasi lengkap melalui modal [`SkillDetailModal.jsx`](file:///c:/Projects/uma-tracker/resources/js/components/SkillDetailModal.jsx).
- **Proteksi Integritas Data (Event Belum Lengkap)**:
  - Pada gelaran kompetisi yang parameter sirkuit dan musimnya belum diumumkan secara resmi (seperti CM Classic Jan 2027, LoH Feb 2027, CM Mile Mar 2027), sistem secara tegas menampilkan kartu disclaimer:
    *"Rekomendasi green skill belum tersedia karena informasi balapan resmi belum memadai (Zero Speculative Data)"*.

### 🎲 Penanganan Cuaca & Kondisi Lintasan Acak pada League of Heroes
- **Disclaimer Khusus League of Heroes**:
  - Menyematkan kartu peringatan khusus yang menjelaskan bahwa cuaca dan kondisi lintasan berganti secara acak pada setiap ronde balapan LoH.
- **Lencana "Dapat Diambil (Situasional)"**:
  - Secara eksplisit menandai 6 green skill terkait cuaca dan kondisi lintasan acak sebagai **"Dapat Diambil (Situasional)"** (lencana kuning/amber), bukan direkomendasikan utama:
    1. *Good Track Condition ○ (良バ場○)*
    2. *Bad Track Condition ○ (道悪○)*
    3. *Sunny Days ○ (晴れの日○)*
    4. *Cloudy Days ○ (曇りの日○)*
    5. *Rainy Days ○ (雨の日○)*
    6. *Snowy Days ○ (雪の日○)*
  - Sementara skill yang berbasis parameter pasti (*Right-Handed ○*, *Kyoto Racecourse ○*, *Non-Standard Distance ○*, dan *Fall Runner ○*) tetap berstatus **"Direkomendasikan (Pasti Aktif)"** (lencana hijau/emerald).

### 🧪 Rangkaian Pengujian Otomatis
- Menambahkan 5 metode pengujian baru pada [`CompetitionEventTest.php`](file:///c:/Projects/uma-tracker/tests/Feature/CompetitionEventTest.php) untuk menguji rekomendasi CM Classic Okt 2026, LoH acak Nov 2026, CM Long Des 2026, event belum diumumkan, serta integritas katalog JSON green skills.
- Memperbarui pengujian [`ChangelogApiTest.php`](file:///c:/Projects/uma-tracker/tests/Feature/ChangelogApiTest.php) untuk memverifikasi versi terbaru 2.6.0.

## [Versi 2.5.1] - 8 Oktober 2026

### 🎯 Perbaikan Format Efek Debuff Skill, Target Sasaran & Durasi Dasar (Standar GameTora)
- **Koreksi Tipe & Nilai Numerik Efek Debuff**:
  - Mengatasi masalah tampilan efek skill yang sebelumnya jatuh ke fallback `Effect (-300)`, `Effect (-2500)`, atau `Effect (50000)`.
  - Memetakan kode tipe efek skill secara presisi sesuai standar GameTora:
    - Tipe `9`: Nilai negatif menjadi `Stamina Drain` (misal: `-300` $\to$ `-0.03`), nilai positif menjadi `Stamina Recovery`.
    - Tipe `21` & `22`: Nilai negatif menjadi `Decrease Current Speed` (misal: `-2500` $\to$ `-0.25`), nilai positif menjadi `Increase Current Speed`.
    - Tipe `13`: Menjadi `Increase Rush Time` berdurasi detik (misal: `50000` $\to$ `5 s`).
    - Tipe `8`: Menjadi `Decrease Field of View` (misal: `-100000` $\to$ `-10`).
    - Tipe `27`: `Decrease Target Speed` / `Increase Target Speed`.
    - Tipe `31`: `Decrease Acceleration` / `Increase Acceleration`.
    - Tipe `37`: `Use Random Rare Skills`.
  - Mengimplementasikan helper terdedikasi `resources/js/utils/skillEffectFormatter.js` untuk resolusi runtime di seluruh antarmuka modal skill.
- **Resolusi Target Balapan (*Target Efek*) & Terjemahan Bahasa Indonesia**:
  - Menampilkan secara eksplisit pihak sasaran efek balapan pada kartu efek (`Target Efek: [Target EN] ([Terjemahan ID])`):
    - `All enemy girls ahead of you` (*Semua Uma Musume lawan di depan*).
    - `All enemy girls behind you` (*Semua Uma Musume lawan di belakang*).
    - `All enemies within the field of view` (*Semua lawan dalam bidang pandang*).
    - `All enemy [Front Runners/Pace Chasers/Late Surgers/End Closers]` (*Semua [Front Runner/Pace Chaser/Late Surger/End Closer] lawan*).
    - `Rushing enemy [Front Runners/Pace Chasers/Late Surgers/End Closers]` (*[Front Runner/Pace Chaser/Late Surger/End Closer] lawan yang sedang panik / kakari*).
- **Tampilan Durasi Dasar (*Base Duration*)**:
  - Memperbaiki pembacaan durasi dasar pada komponen `SkillDetailModal.jsx` sehingga menampilkan `Instant effect` untuk durasi seketika (`base_time == 0`) dan `X s` (misal `3 s`) untuk durasi berbasis waktu.
- **Pengayaan Katalog 55 Skill No Debuff**:
  - Memperkaya berkas `resources/js/data/noDebuffSkills.json` dengan data `base_duration`, `effects` terformat, `target_name`, dan `target_name_id`.
  - Menambahkan dukungan `getTargetName()` pada backend `app/Services/GameToraSyncService.php`.

### ⚡ Penerjemahan Kondisi Aktivasi Tergesa-gesa / Kakari (*Temptation*)
- **Dukungan Kondisi Lawan Tergesa-gesa Per Strategi Lari**:
  - Menerjemahkan 4 parameter kondisi jumlah lawan yang sedang tergesa-gesa/panik (*kakari*) ke dalam Bahasa Indonesia yang alami dan informatif pada `skillConditionTranslator.js` dan `SkillConditionTranslator.php`:
    - `running_style_temptation_opponent_count_nige>=1`: *"Terdapat minimal 1 pelari Front Runner (pelari depan / 逃げ) lawan yang sedang panik / tergesa-gesa (kakari)"*.
    - `running_style_temptation_opponent_count_senko>=1`: *"Terdapat minimal 1 pelari Pace Chaser (pelari penguntit / 先行) lawan yang sedang panik / tergesa-gesa (kakari)"*.
    - `running_style_temptation_opponent_count_sashi>=1`: *"Terdapat minimal 1 pelari Late Surger (pelari penyalip / 差し) lawan yang sedang panik / tergesa-gesa (kakari)"*.
    - `running_style_temptation_opponent_count_oikomi>=1`: *"Terdapat minimal 1 pelari End Closer (pelari penutup / 追込) lawan yang sedang panik / tergesa-gesa (kakari)"*.
  - Melengkapi penerjemahan kondisi status panik diri sendiri: `is_temptation==0` (*"Tidak sedang panik / tergesa-gesa (kakari)"*) dan `is_temptation==1` (*"Sedang mengalami panik / tergesa-gesa (kakari)"*).

### 🧪 Pengujian Otomatis & Pembaruan Rangkaian Tes
- Menambahkan skenario uji baru pada `SkillConditionTranslatorTest.php` untuk memvalidasi penerjemahan seluruh kondisi `running_style_temptation_opponent_count_*` dan `is_temptation`.
- Menambahkan pengujian assertion integritas efek, target sasaran, dan durasi dasar pada `CompetitionEventTest.php`.
- Memperbarui pengujian API changelog pada `ChangelogApiTest.php` untuk verifikasi versi terbaru 2.5.1.

## [Versi 2.5.0] - 7 Oktober 2026

### 🏆 Modul Perencana Kompetisi CM/LoH Resmi (Upcoming Competition Planner V1)
- **Integritas Data Ketat & Nol Data Spekulatif (*Zero Speculative Data*)**:
  - Mengimplementasikan modul perencana kompetisi Champions Meeting (CM) dan League of Heroes (LoH) periode 2026–2027 bersumber langsung dari pengumuman resmi Cygames JP Portal (`https://umamusume.jp/news/detail?id=3483`).
  - Menolak seluruh asumsi spekulatif dari wiki, GameWith, Kamigame, maupun datamining komunitas.
  - Penanganan data tiga kondisi (*Tri-State Handling*):
    - **Confirmed (Terkonfirmasi)**: Nilai resmi yang diumumkan Cygames.
    - **Random (Acak)**: Nilai acak eksplisit seperti cuaca dan kondisi lintasan pada LoH November 2026.
    - **Unknown / Not Announced (Belum Diumumkan)**: Tersimpan sebagai `NULL` di basis data dan ditampilkan jelas sebagai "Belum diumumkan" di antarmuka pengguna tanpa nilai default atau tebakan.
- **Struktur Tanggal & Urutan Kronologis Multi-Prioritas**:
  - Menggunakan skema granular: `year`, `month`, `period` (`exact`, `early`, `mid`, `late`), `date_label`, dan `start_date` (nullable).
  - Pengurutan kronologis terjamin melalui query kustom: `year ASC, month ASC, CASE period WHEN 'exact' THEN 1 WHEN 'early' THEN 2 WHEN 'mid' THEN 3 WHEN 'late' THEN 4 ELSE 5 END, start_date ASC NULLS LAST, id ASC`.
- **Basis Data & Seeder Idempoten**:
  - Migrasi `create_competition_events_table.php` dengan indeks teroptimasi pada urutan kronologis.
  - Seeder `CompetitionEventSeeder.php` yang bersifat idempoten (`updateOrCreate`) memuat tepat 6 event resmi Cygames (Okt 2026 s.d. Mar 2027) tanpa duplikasi saat dijalankan berulang.
  - Aturan khusus `no_debuff` dipastikan terikat secara presisi hanya pada Champions Meeting MILE Akhir Maret 2027.
- **Backend REST API**:
  - Endpoint `GET /api/competition-events`: Mengembalikan daftar event mendatang berurutan kronologis dengan nilai `null` dan `"random"` terpreservasi murni.
  - Endpoint `GET /api/competition-events/{id}`: Mengembalikan detail satu event kompetisi.
- **Antarmuka Pengguna & Navigasi (Event Planner)**:
  - Tab navigasi baru **"Event Planner"** (`CalendarDays` icon) pada `Navbar.jsx` dan routing tampilan utama di `AppMain.jsx`.
  - Komponen `CompetitionEventsView.jsx` dengan linimasa kartu responsif, filter tipe event (Semua, Champions Meeting, League of Heroes), filter tahun, dan kartu statistik ringkasan.
  - Badge visual berstatus tegas: "Acak" (*amber badge*) yang kontras dengan "Belum diumumkan" (*slate neutral badge*), serta tautan sumber resmi Cygames JP yang dapat diklik langsung.
  - Modal rincian lengkap (`CompetitionEventDetailModal`) untuk penelusuran seluruh parameter kondisi lomba.
- **Otomasi Pengujian (PHPUnit Feature Tests)**:
  - Rangkaian pengujian komprehensif pada `tests/Feature/CompetitionEventTest.php` (8 skenario tes, 92 assertion) mencakup integritas seeder, idempotensi, pengurutan kronologis, preservasi nilai `null` dan `random`, isolasi aturan khusus `no_debuff`, serta penanganan respon 404.

### 📊 Statistik Karakter Per Skenario & Resolusi Avatar Karakter
- **Modal Analitik Penggunaan Karakter Per Skenario (`CharacterScenarioDetailModal`)**:
  - Setiap kartu pada daftar *Character Performance Breakdown* di halaman Fans Tracker kini interaktif dan dapat diklik.
  - Membuka modal dialog komprehensif yang menampilkan statistik rinci penggunaan karakter tersebut di setiap skenario latihan: jumlah sesi latihan (*runs count*), persentase terhadap total sesi, total perolehan fans, rata-rata fans per run, performa rekor tertinggi (*Max*) dan terendah (*Min*), serta *Best Rank* tertinggi yang diraih.
  - Dilengkapi fitur pencarian skenario, kontrol pengurutan multi-kriteria (berdasarkan sesi, total fans, rata-rata fans, dan nama skenario), serta ringkasan metrik global dan 5 sesi latihan terakhir.
- **Normalisasi Alias Nama & Perbaikan Ikon Avatar Karakter**:
  - Memperbaiki kegagalan pemuatan thumbnail avatar karakter pada alias nama seperti `Oguri Cap (Anime Collab)` dan `Inari One (Fall Festival)` yang sebelumnya jatuh ke fallback inisial teks ("OG", "IN").
  - Mengimplementasikan resolver gambar cerdas `resolveCharacterImage` pada backend (`CareerController.php`) yang membersihkan kurung alias baik format kurung siku `[...]` maupun kurung bulat `(...)` via regex multi-format, serta mendukung fallback bertahap (exact, case-insensitive, base-name matching, dan prefix matching) ke katalog GameTora.

### ⏱️ Indikator Waktu Hari Ini, Deteksi Status Event & Simulasi Tanggal Kompetisi
- **Deteksi Otomatis Event Sedang Berlangsung vs Berlangsung Nanti**:
  - Memperbarui komponen `CompetitionEventsView.jsx` dengan kalkulasi rentang jadwal adaptif (`getEventScheduleRange` & `getEventStatus`) berbasis tanggal acuan aktif (`activeDate`).
  - Menandai event yang sedang berlangsung dengan warna bingkai dan bayangan yang persis seperti saat kartu di-hover (`border-amber-400 shadow-md` untuk Champions Meeting dan `border-indigo-400 shadow-md` untuk League of Heroes), aksen ring bercahaya, serta badge berkedip tegas: **"Event Sedang Berlangsung"**.
  - Menampilkan badge **"Berlangsung Nanti"** disertai hitung mundur selisih hari untuk event di masa depan, serta penanda **"Telah Selesai"** untuk event masa lalu.
- **Bar Simulasi Tanggal Interaktif**:
  - Menampilkan tanggal acuan saat ini (misal: *8 Oktober 2026*) lengkap dengan input pemilih tanggal (`<input type="date">`) dan preset uji cepat:
    - *Uji 20 Okt 2026 (CM Classic)*: Menguji aktivasi langsung status sedang berlangsung pada Champions Meeting CLASSIC Kyoto 2200m.
    - *Uji Akhir Nov 2026 (LoH)*: Menguji aktivasi periode League of Heroes Kyoto 3000m.
    - *Uji Akhir Des 2026*: Menguji aktivasi periode Champions Meeting LONG Nakayama 2500m.
    - *Reset Hari Ini*: Mengembalikan tanggal acuan ke waktu asli secara instan.

### ⚡ Widget Event Terdekat pada Dasbor & Modal Khusus "Aturan Khusus: No Debuff"
- **Widget Event Kompetisi Terdekat pada Halaman Dasbor (`DashboardView.jsx`)**:
  - Menampilkan satu event kompetisi terdekat (memprioritaskan event berstatus *Sedang Berlangsung*, atau event *Berlangsung Nanti* paling awal) yang diletakkan tepat di bawah kartu *Banner Gacha Berlangsung Hari Ini*.
  - Menyajikan informasi komprehensif: badge tipe kompetisi (Champions Meeting vs League of Heroes), nama event, status aktif berkedip / hitung mundur hari, tanggal pelaksanaan, serta cuplikan kondisi lintasan (venue, tipe lintasan, jarak, arah putaran).
  - Dilengkapi tombol interaktif **"Lihat di Event Planner"** untuk navigasi langsung ke halaman jadwal kompetisi.
- **Modal Interaktif Aturan Khusus No Debuff (`NoDebuffSkillsModal.jsx`)**:
  - Badge *Aturan Khusus: No Debuff (デバフなし)* pada kartu event dan modal rincian kompetisi kini interaktif dan dapat diklik.
  - Membuka modal dialog komprehensif berisi terjemahan resmi aturan Cygames dalam Bahasa Indonesia lengkap dengan opsi melihat teks asli bahasa Jepang:
    - Terjemahan: *"Pada Aturan Khusus: No Debuff (Tanpa Debuff), seluruh skill dalam daftar berikut ini TIDAK AKAN AKTIF/TERPICU selama balapan. ※ Catatan Pengecualian: Skill Unik (Unique Skills) dan Skill Evolusi (Evolved Skills) dikecualikan dari larangan ini, sehingga tetap akan aktif meskipun memiliki efek debuff yang mengurangi kecepatan atau membuat lelah (menguras stamina) Uma Musume lawan."*
  - Menampilkan daftar 55 skill yang terpengaruh dan dicocokkan 100% dengan katalog GameTora lokal (15 Skill Gold/Rare, 35 Skill Normal/White, dan 5 Skill Unik Warisan/Inherited).
  - Dilengkapi ikon resmi GameTora, label kelangkaan, deskripsi efek debuff, filter kategori (Semua, Gold, Normal, Warisan), fitur pencarian instan nama skill (JP/EN), serta integrasi langsung ke modal rincian formula (`SkillDetailModal`).

## [Versi 2.4.1] - 5 Oktober 2026

### 👗 Standardisasi Varian Kostum Gacha & Pembersihan Karakter Tanpa Kostum
- **Pembersihan & Eliminasi Karakter Tanpa Varian Kostum (*Bare Names*) pada Sistem Gacha**:
  - Menghapus seluruh nama karakter dasar tanpa varian kostum / kurung siku `[...]` (seperti `Daiwa Scarlet`, `Vodka`, `Orfevre`, `Gentildonna`, dll.) dari katalog gacha (`UmaCatalog.php` & endpoint `/api/gacha/metadata`).
  - Memastikan seluruh tarikan karakter gacha secara konsisten hanya menampilkan entri dengan epithet varian kostum resmi (misal: `Daiwa Scarlet [Peak Blue]`, `Daiwa Scarlet [Nuit Étoilée de Scarlet]`, `Vodka [Wild Top Gear]`, `Orfevre [総攬]`).
  - Mengeliminasi duplikasi opsi pada autocomplete, suggestions dropdown, datalist native browser, dan chip featured banner di mana sebelumnya nama dasar tanpa kostum muncul ganda bersama varian berkostumnya.
  - Memperbarui record database `gacha_banners` dan file migrasi agar kolom `featured_items` hanya menyimpan nama karakter bervarian kostum resmi.
  - Menambahkan filter pengaman pada frontend (`GachaView.jsx`, `EditGachaPullModal.jsx`, `Quick10PullModal.jsx`) dan pengujian otomatis pada `GachaTwinkleCollectionTest.php` serta `UmaTrackerApiTest.php`.

### 📐 Penyelarasan Ketinggian Kontrol & Perbaikan Pool B1/B2 Banner Twinkle Collection
- **Penyelarasan Ketinggian & Keseimbangan Kontrol Form Single Pull (`GachaView.jsx`)**:
  - Mengatasi masalah layout pada baris kontrol Single Pull di mana select box Banner terdorong naik saat belum ada banner yang dipilih.
  - Memindahkan teks error `* Wajib dipilih` dari bagian bawah select box ke baris label header (`flex items-center justify-between mb-1.5 h-4 leading-4`), menjaga ketinggian container tetap rata di semua kolom.
  - Menyamakan ketinggian seluruh elemen interaktif kontrol (select box, input tanggal, tombol switch Rarity, badge Pool B3 / tombol UP, serta tombol `Log Pull`) secara konsisten menjadi `h-10` (40px).
  - Menambahkan label header kolom yang selaras pada kolom terakhir (`Pool & Aksi` / `Status & Aksi`), sehingga tidak ada lagi ruang kosong di atas tombol dan badge.
- **Dukungan Penuh Pool Karakter B1 (1★) & B2 (2★) pada Banner Twinkle Collection**:
  - Memperbaiki batasan pool gacha Twinkle Collection agar hanya berlaku eksklusif untuk tarikan B3 (SSR, 3★) ke 8 karakter terpilih, sementara tarikan B1 (R, 1★) dan B2 (SR, 2★) tetap mencakup seluruh karakter catalog 1★ dan 2★ (Vodka, Daiwa Scarlet, Gold Ship, Agnes Tachyon, Sakura Bakushin O, dll.).
  - Memperbaiki pemetaan rarity katalog dasar (`UmaCatalog.php`) sehingga karakter basis 1★ dan 2★ secara akurat mengembalikan rarity `R` dan `SR` alih-alih salah defaulting ke `SSR`.
  - Memperbarui sistem autocomplete, suggestions dropdown, dan validasi submit pada Single Pull, Multi-Pull (10x), serta Edit Gacha Pull Modal agar karakter B1 dan B2 dapat diketik, disarankan, dan disimpan tanpa validasi error.

## [Versi 2.4.0] - 5 Oktober 2026

### 🎰 Penyesuaian Mekanisme & Pool Banner Twinkle Collection (2026 JP Server)
- **Pencabutan Status Featured Rate-Up Khusus Twinkle Collection**:
  - Mengimplementasikan aturan resmi gacha *The Twinkle Collection Pretty Derby Gacha* di mana rate SSR 3.00% dibagi sama rata ke 8 karakter B3 terpilih (masing-masing 0.375% per karakter) tanpa adanya sistem *rate-up* maupun *spook* (*off-rate*).
  - Method `GachaBanner::isTwinkle()` secara otomatis mengenali kategori `twinkle` dan nama banner bertema Twinkle Collection.
  - Menetapkan `isItemRateUp()` selalu bernilai `false`, `getRateUpPerItem() = 0.0%`, dan `getTotalRateUpRate() = 0.0%` pada Twinkle banner.
  - Backend Form Requests (`StoreGachaPullRequest`, `BatchGachaPullRequest`, `UpdateGachaPullRequest`) serta `GachaController` secara otomatis menjamin atribut `is_rate_up` tersimpan sebagai `false`.
- **Eksklusivitas Pool Karakter B3 pada Input Tarikan (Autocomplete & Suggestions)**:
  - Dropdown saran pencarian dan `<datalist>` native browser pada Single Pull, Multi-Pull (10x), Quick 10-Pull Modal, serta Edit Gacha Pull Modal dibatasi secara eksklusif hanya menampilkan 8 karakter B3 dari banner Twinkle yang sedang dipilih.
  - Validasi submit memastikan seluruh tarikan SSR (B3) pada banner Twinkle wajib berasal dari 8 karakter lineup tersebut.
- **Penyempurnaan Antarmuka & Visual (UI/UX)**:
  - Kotak *"Featured Rate-Up"* pada form Single Pull, Multi-Pull, dan Quick 10-Pull digantikan dengan kartu gradien Sky/Indigo berlabel: `Lineup Karakter B3 Twinkle Collection (8 Karakter • Rate Rata 0.375% per Karakter)` dilengkapi tombol isi cepat `+ Karakter`.
  - Tombol centang/toggle `UP` diganti dengan badge informatif `Pool B3 (Tanpa UP)`.
  - Kartu ringkasan banner aktif pada Dashboard View menampilkan label `Lineup Karakter B3 (Rate Rata 0.375% • Tanpa Rate-Up):`.
- **Pengujian & Otomasi (Feature Test)**:
  - Penambahan rangkaian tes otomatis pada `tests/Feature/GachaTwinkleCollectionTest.php` untuk memverifikasi atribut model, kalkulasi distribusi rate, serta penegakan `is_rate_up: false` pada API single, batch, dan update pull.

## [Versi 2.3.0] - 3 Oktober 2026

### 🏛️ Penandaan Anggota Keluar (*Ex-Member*) & Statistik Historis Bulanan Fans Club Circle
- **Penandaan Anggota yang Sudah Keluar (*Out*) dari Club (`CircleClubView.jsx`)**:
  - Secara akurat menandai anggota yang tidak memiliki ranking (`rank: null`, `isVoided: true`, atau memiliki atribut tanggal keluar `leftOn`) sesuai visualisasi direktori Muxueuma.
  - Kolom **Rank** menampilkan badge bulat muted bertanda strip (`ー`) alih-alih kosong.
  - Kolom **Nama Anggota** dilengkapi badge merah kontras `Keluar (Out)` serta subteks tanggal keluar dan status resmi berbahasa Jepang: `MM-DD 脱退、貢献は除外済み (Sudah Keluar dari Club)`.
  - Nilai delta pertambahan fans harian dan mingguan (`todayDelta`, `day3Delta`, `weekDelta`) yang bernilai `null` ditampilkan dengan tanda strip `ー` alih-alih angka `+0`.
  - Logika sorting tabel otomatis menempatkan anggota yang keluar di urutan paling bawah ketika disortir berdasarkan Rank (mencegah nilai `null` terindeks di peringkat paling atas).
  - Tampilan sub-bar jumlah anggota diperjelas dengan rincian status keanggotaan aktif dan keluar: `Pertambahan fans seluruh anggota circle (X aktif, Y keluar)`.
  - Memberikan latar belakang aksen halus kemerahan (`bg-rose-500/5`) pada baris tabel anggota yang telah keluar.

- **Filter & Penelusuran Statistik Periode Bulan Sebelumnya (Historical Archive)**:
  - Menyediakan menu dropdown popover pemilih periode bulan historis bergaya Muxueuma (`YYYY年 M月`) dengan pengelompokan tahun dan penanda aktif (*active pill indicator*).
  - Judul tabel, kolom kontribusi, dan widget secara otomatis menyesuaikan label periode yang sedang aktif (misal: `2026年 9月 (September 2026)`).
  - Widget *Pace Target Bulanan* mendukung mode arsip historis dengan indikator status arsip masa lalu alih-alih proyeksi hari berjalan.
  - Backend API (`CircleTrackerController.php` & `CircleTrackerService.php`) mendukung parameter `?period=YYYY-MM` dan menyimpan data snapshot per bulan (`circle_snapshot_YYYY-MM.json`) sehingga riwayat tetap tersimpan rapi dan dapat diakses cepat secara offline.

- **Perbaikan Kestabilan Komponen React (`CircleClubView.jsx`)**:
  - Mengatasi bug *Minified React error #310 (Rendered fewer hooks than expected)* dengan memposisikan seluruh hooks (`useMemo`, state, effects) di tingkat atas sebelum kondisi *early return* loading.

### 🏃 Penyempurnaan Manajemen Riwayat Karir & Analisis Skenario Pelatihan
- **Penetapan Hasil Auto Rank Otomatis pada Modal Edit Sesi (`EditCareerRunModal.jsx`)**:
  - Menghapus input tombol rank manual dan langsung menetapkan nilai Auto Rank yang dihitung secara presisi dari akumulasi skor total poin sesi pelatihan.
  - Menerjemahkan seluruh notifikasi perubahan catatan karir ke dalam bahasa Indonesia baku (`Catatan sesi karir berhasil diperbarui`, dll.).
- **Modal Interaktif Rincian Karakter per Skenario Pelatihan (`ScenarioDetailModal.jsx` & `FansView.jsx`)**:
  - Kartu statistik skenario pada riwayat karir kini dapat diklik untuk memunculkan modal pop-up detail per skenario.
  - Menampilkan daftar karakter yang pernah dilatih pada skenario tersebut lengkap dengan avatar, nama, epithet, jumlah sesi pelatihan yang diselesaikan, dan akumulasi total perolehan fans pada skenario terkait.

---

## [Versi 2.2.0] - 3 Oktober 2026

### 🧬 Modul Baru: Inheritance Affinity & Compatibility Calculator Server Jepang (相性計算機)
- **Implementasi Formula Kompatibilitas Silsilah Resmi Server Jepang (JP Server)**:
  - Menyediakan kalkulator afinitas pewarisan faktor (Blue, Red, Green, White) berbasis matriks kompatibilitas game Umamusume Pretty Derby Jepang dan relasi dunia nyata.
  - Struktur bagan silsilah interaktif 7 slot:
    - **Target Trainee**: Uma yang dilatih (Slot Pusat Atas).
    - **Parent 1 & Parent 2**: Indukan kiri dan kanan.
    - **Grandparent 1A, 1B, 2A, 2B**: Kakek-nenek pendukung masing-masing cabang.
  - Mengkalkulasi skor relasi dasar (Target ↔ P1, Target ↔ P2, P1 ↔ P2, P1 ↔ GP1A/B, P2 ↔ GP2A/B) serta opsi kalkulasi 3-arah (*triple affinity*).
  - Klasifikasi Badge Kompatibilitas dinamis:
    - **△ (Peluang Rendah)**: Skor < 51 poin.
    - **○ (Peluang Normal)**: Skor 51 - 150 poin.
    - **◎ (Peluang Maksimal / Double Circle)**: Skor ≥ 151 poin (efek visual pelangi/emas bersinar).
  - Menyediakan progress bar interaktif menuju target threshold 51 (○) dan 151 (◎), lengkap dengan tabel rincian poin per cabang silsilah.
  - **Fitur Rekomendasi Cepat "Cari Parent Terbaik"**: Algoritma cerdas yang secara otomatis menguji kombinasi karakter milik pengguna (`user_characters`) dan menyajikan pasangan parent dengan base score tertinggi.
  - **Sinkronisasi Riwayat Karier**: Mengimpor nama karakter dari tabel `career_runs` ke dalam slot silsilah.

### 🚫 Validasi Ketat Anti-Duplikasi Karakter Silsilah (Aturan Game JP)
- **Pelarangan Duplikasi Karakter Lintas Kostum/Epithet**:
  - Menerapkan aturan resmi game JP di mana Target Trainee tidak boleh sama dengan Parent 1 maupun Parent 2, dan Parent 1 tidak boleh sama dengan Parent 2, meskipun kostumnya berbeda (misal: Tokai Teio *Beyond the Horizon* dilarang berpasangan dengan Tokai Teio *Top of Joyful*, dan Mejiro McQueen *End of the Sky* dilarang dengan Mejiro McQueen *Fair Lady*).
  - Memvalidasi agar Parent tidak sama dengan Grandparent pada jalurnya, dan sesama Grandparent pada cabang yang sama dilarang merupakan karakter yang sama.
- **Indikator Visual & Proteksi Pemilihan Karakter**:
  - Pada modal pemilihan karakter (*Character Picker Modal*), karakter yang melanggar aturan dinonaktifkan (`disabled`, opacity 40%, tombol tidak dapat diklik) dan dilengkapi badge peringatan merah: `⛔ Sama dengan Target Trainee (Aturan JP: Dilarang sama)` atau `⛔ Sama dengan Parent 2 (Aturan JP: Dilarang sama)`.
  - Pada diagram visual silsilah, slot yang berkonflik disorot dengan bingkai merah terang (`ring-2 ring-rose-500 bg-rose-50`), badge peringatan error, dan banner penjelasan aturan resmi di atas diagram.
  - Konektor tengah Parent 1 dan 2 menampilkan status `⛔ P1 = P2 (Dilarang)` jika terdeteksi duplikat karakter.

### 🏆 Standardisasi Bonus Kemenangan G1 ke +3 Poin (Update 2nd Anniversary JP)
- **Pembaruan Nilai Default Bonus G1 Bersama**:
  - Menetapkan nilai default bonus kemenangan balapan G1 yang cocok antar parent dan grandparent menjadi **+3 poin per balapan** sesuai update besar *2nd Anniversary* JP (Februari 2023).
  - Menambahkan highlight visual khusus `+3 Poin (Standar 2nd Anni)` pada selector preset serta catatan informatif aturan 2nd Anniversary.
  - Memperbaiki komputasi potensi bonus silsilah pada modal seleksi G1 menjadi `Jumlah Balapan × 5 × Poin per Balapan` (maksimal potensi bonus silsilah 7 slot).

### 🐛 Perbaikan Bug Kalkulasi Skor 0 Poin (`CollectionController.php` & `AffinityView.jsx`)
- **Penyelarasan Canonical Character ID**:
  - Mengatasi bug di mana skor kompatibilitas silsilah tidak terhitung sama sekali (menampilkan 0 Poin pada seluruh slot) ketika memilih karakter dari katalog koleksi.
  - Menambahkan properti canonical `char_id` dan `catalog_item_id` pada output API `CollectionController::getCharacters()`.
  - Memperbarui helper ekstraksi identitas slot di frontend (`getSlotId`) agar dapat mengenali ID numerik karakter secara andal dari berbagai sumber data.

### 🖥️ Penyesuaian Responsivitas Navbar pada Resolusi Layar 1366x768p (`Navbar.jsx`)
- **Pencegahan Pemotongan Kontrol Kanan & Tombol Dark Mode**:
  - Mengoptimalkan padding horizontal kontainer, jarak antar tab navigasi (`gap-0.5 xl:gap-1.5`), serta padding tombol menu pada resolusi layar 1366x768p.
  - Mengompres tampilan badge Kuota Circle menjadi format angka ringkas pada layar laptop standar, sehingga tombol riwayat Changelog, Backup & Restore, serta tombol toggle Dark Mode tidak lagi terpotong atau terdorong keluar layar.

---

## [Versi 2.1.2] - 2 Oktober 2026

### 📅 Standardisasi Format Tanggal Bahasa Indonesia & Kolom Pelatihan Karir
- **Format Tanggal Baku Indonesia pada Tabel & Input Form**:
  - Mengubah kolom tabel `Date` menjadi **`Tanggal`** pada riwayat pelatihan karir (`FansView.jsx`), dan memformat tampilan tanggal dari ISO (`2026-10-02`) menjadi format standar bahasa Indonesia yang jelas dan tidak ambigu (`02 Okt 2026`).
  - Menetapkan atribut `lang="id-ID"` dan konfigurasi aplikasi `app.locale = id` sehingga input HTML date picker secara bawaan mengenali format lokal Indonesia (`hh/bb/tttt` / `dd/mm/yyyy`) alih-alih format Amerika Serikat (`mm/dd/yyyy`).
  - Menambahkan pratinjau teks tanggal real-time berbahasa Indonesia (misal: `02 Oktober 2026`) pada formulir pencatatan karir (`FansView.jsx`) dan modal ubah data sesi (`EditCareerRunModal.jsx`).
  - Menyelaraskan tampilan tanggal sesi terkini pada dasbor (`DashboardView.jsx`).

### 🌓 Penyempurnaan Dark Mode & Lokalisasi Penuh Modal Database GameTora (`GachaView.jsx`)
- **Perbaikan Keterbacaan Kotak Sinkronisasi GameTora pada Dark Mode**:
  - Mengatasi masalah teks putih/terang yang sebelumnya tidak terbaca pada kotak status `Database GameTora JP` di tema gelap akibat konflik background krem cerah dengan style override dark mode.
  - Menerapkan latar belakang gelap terpadu (`dark:bg-slate-800/90` dan `dark:border-slate-700/90`) dengan kontras teks terang berdaya baca tinggi (`dark:text-white` dan `dark:text-slate-300`).
- **Penerjemahan Lengkap Antarmuka Modal Database**:
  - Mengubah judul menjadi **Database Game Uma Musume (GameTora / Kamigame)** dan menerjemahkan deskripsi alur kerja.
  - Menerjemahkan tab kategori menjadi **`Karakter / Uma`** dan **`Kartu Bantuan`**.
  - Menerjemahkan placeholder pencarian karakter dan kartu bantuan.
  - Mengubah tombol aksi kartu dari `Select` menjadi **`Pilih`**.
  - Mengubah teks ringkasan footer dan tombol `Close` menjadi **`Tutup`**.

---

## [Versi 2.1.1] - 27 September 2026

### 🎯 Dropdown Interaktif Target Karir Alternatif (`CharacterDetailModal.jsx`)
- **Penyatuan Target Karir Bernomor Urut Sama (Duplikat Order)**:
  - Mengelompokkan target karir karakter yang memiliki nomor urutan sama (misalnya Matikanefukukitaru dengan 3 pilihan balapan alternatif pada urutan 2, atau Agnes Tachyon dengan 2 balapan pada urutan 4).
  - Target pertama ditampilkan sebagai target utama, sementara opsi balapan pengganti disatukan secara rapi di dalam dropdown/accordion interaktif bergaya GameTora.
- **Komponen Accordion Dropdown Target Alternatif**:
  - Menyediakan tombol pemicu dropdown interaktif bertuliskan *"Target alternatif dapat terjadi sebagai pengganti [N alternatif] ▾"*.
  - Menampilkan badge jumlah alternatif yang tersedia dan ikon panah chevron beranimasi saat dibuka/tutup.
  - Saat diperluas, menampilkan kartu rincian balapan alternatif dengan indentasi elegan, badge khusus `[Alternatif]`, banner nama balapan, giliran (turn text), periode kelas balap, dan kondisi trek lengkap berbahasa Indonesia.

### 📊 Perbaikan Konsistensi Label Bar Chart Pity Interval Karakter B3 (`AnalyticsView.jsx` & `GachaController.php`)
- **Penyelarasan Label Sumbu X & Tooltip Bar Chart Pity Karakter B3**:
  - Memperbaiki bug di mana bar chart interval pity pada kategori Gacha Karakter masih menampilkan label `SSR #1`, `SSR #2`, dst. padahal kategori gacha karakter dan judul grafik bertuliskan *"Interval Tarikan per Karakter B3 (Pity Intervals)"*.
  - Pada backend `GachaController.php`, response data interval tarikan (`ssr_intervals`) kini secara cerdas mendeteksi banner karakter dan memberikan prefix dinamis `B3 #1`, `B3 #2`, dst. alih-alih hardcoded `SSR #`.
  - Pada frontend `AnalyticsView.jsx`, visualisasi grafik batang (X-Axis bar label dan Tooltip popover) kini secara konsisten menampilkan penamaan `B3 #1`, `B3 #2`, dst. saat kategori Gacha Karakter aktif.

### 🐛 Perbaikan Bug React Hook Crash Error #310 pada Modal Karakter (`CharacterDetailModal.jsx`)
- **Pembersihan Pelanggaran Aturan React Hooks (Rules of Hooks)**:
  - Memperbaiki `Minified React error #310` yang terjadi saat pengguna mengeklik karakter untuk membuka modal detail.
  - Mengubah komputasi pengelompokan `groupedObjectives` dari `useMemo` kondisional (yang sebelumnya berada setelah klausa `if (!isOpen || !character) return null;`) menjadi kalkulasi langsung (*immediate execution*).
  - Merapikan pemanggilan hook pada komponen modal lainnya (`BulkEditGachaPullModal.jsx` dan `Quick10PullModal.jsx`) untuk memastikan seluruh hook dideklarasikan tanpa terhalang *early return*, mencegah ketidaksinkronan urutan hook (*hook call mismatch*).

---

## [Versi 2.1.0] - 26 September 2026

### 🌸 Penyesuaian Analisis Gacha Karakter (Terminologi B3) & Perbaikan Visual Pie Chart (`AnalyticsView.jsx`)
- **Adaptasi Dinamis Terminologi Karakter B3 (3★) pada Analitik Gacha**:
  - Mengubah seluruh penyebutan istilah "SSR" menjadi **"Karakter B3"** atau **"3★ (Rainbow)"** secara dinamis saat kategori analisis memilih **Gacha Karakter** (`gachaCategory === 'character'`).
  - Menyesuaikan info filter aktif (`~{n} pull/Karakter B3`), kartu ringkasan gacha karakter (`~{n} Tarikan / Karakter B3`, kolom jumlah `Karakter B3`, persentase `Rate B3`), legenda pie chart, indikator hoki (`Indikator Hoki Karakter B3:`), serta grafik interval pity (`Interval Tarikan per Karakter B3 (Pity Intervals)`, badge `{n} Karakter B3`, tooltip rincian `Karakter: [Nama]`, dan pesan keterangan saat belum ada data karakter B3).
- **Perbaikan Bug Overlap pada Grafik Distribusi Rarity (Pie / Donut Chart)**:
  - Memperbaiki masalah tumpang-tindih visual di mana teks persentase tengah `0.0%` dan `SSR Rate (3.0%)` sebelumnya menimpa pesan keterangan *"Belum ada tarikan gacha tercatat..."* ketika data kategori/pool masih kosong (`totalPulls === 0`).
  - Overlay angka dan rate di lubang donut kini hanya dirender ketika terdapat data tarikan (`totalPulls > 0`). Saat kosong, kontainer menampilkan ikon pie chart melingkar dengan pesan status yang bersih dan rapi tanpa tubrukan teks.

### 👑 Pembaruan Palet Warna & Visual Prestise Badge Peringkat LF (`RankBadge.jsx`)
- **Harmonisasi Estetika Tingkat Tertinggi LF dengan LG Bertema Biru Elektrik**:
  - Mengubah skema visual lencana peringkat **LF (Legend F)** agar mengadopsi struktur prestisius seperti tier **LG** (`Crown` icon, efek `animate-rainbow`, `font-black`, `tracking-wider`, dan `text-white`), namun berbalut gradien warna biru safir dan cyan bercahaya:
    - Gradien & Border: `bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 text-white border-cyan-300 ring-1 ring-cyan-300 shadow-md shadow-blue-500/40`.
    - Ikon Mahkota: Menggunakan mahkota kaisar (*Crown*) berwarna cyan berkilau (`text-cyan-200 fill-cyan-300`).

### 🇮🇩 Penerjemahan Penuh Target Karir Karakter ke Bahasa Indonesia (`CharacterDetailModal.jsx`)
- **Lokalisasi Lengkap Tab Target Karir (Objectives)**:
  - Menerjemahkan tab dan judul modal menjadi **"Target Karir (Objectives)"**.
  - Mengintegrasikan fungsi penerjemah dinamis untuk seluruh variasi target karir pelatihan URA:
    - **Target Balapan & Fans**:
      - *"Participate in the [Race]"* &rarr; `Ikuti balapan [Race]`
      - *"Place 1st in the [Race]"* &rarr; `Raih Juara 1 di [Race]`
      - *"Place [N]th or better in the [Race]"* &rarr; `Raih posisi [N] besar atau lebih baik di [Race]`
      - *"Have at least [N] fans"* &rarr; `Kumpulkan minimal [N] fans`
      - *"Participate / Place in [N] G1 / graded races"* &rarr; `Ikuti / Raih posisi di [N] balapan tingkat G1 / berperingkat (graded) atau lebih tinggi`
    - **Waktu Giliran (Turn Text)**:
      - *"Turn 12"* &rarr; `Giliran 12`
      - *"Turn 25 (previous + 13)"* &rarr; `Giliran 25 (jeda +13 giliran)`
    - **Periode & Waktu Pelatihan**:
      - *"Junior / Classic / Senior Class"* &rarr; `Tahun Junior / Klasik / Senior`
      - *"Finals"* &rarr; `Final (URA)`
      - *"Early / Late"* &rarr; `Awal / Akhir`
      - Nama-nama bulan: Januari s/d Desember.
    - **Kondisi Trek Balapan**:
      - *"Turf / Dirt"* &rarr; `Rumput / Pasir`
      - *"Short / Mile / Medium / Long"* &rarr; `Jarak Pendek / Mil / Jarak Menengah / Jarak Jauh` (misal: `G1 - Rumput - 2400m - Jarak Menengah`).

---

## [Versi 2.0.9] - 26 September 2026

### 🌸🃏 Pemisahan Analisis Gacha Karakter vs Support Card pada Menu Analitik
- **Pemisahan Kategori Gacha Mandiri (`AnalyticsView.jsx` & `GachaController.php`)**:
  - Memisahkan visualisasi data, metrik, dan grafik antara **🌸 Gacha Karakter (Pretty Derby)** dengan **🃏 Gacha Support Card**.
  - Menyediakan toggle pill kategori di header analitik (*🌸 Karakter*, *🃏 Support Card*, dan *🌐 Semua*) serta sub-filter konteks aktif.
  - Menghadirkan 3 kartu ringkasan kategori interaktif di atas grafik yang dapat diklik untuk langsung mengisolasi analisis:
    - **Card 1 (🌸 Gacha Karakter)**: Menampilkan total tarikan, jumlah SSR, persentase rate aktual, target patokan (4.5% / 3.0%), interval rata-rata (~22.2 / ~33.3 pull), dan status hoki.
    - **Card 2 (🃏 Gacha Support Card)**: Menampilkan total tarikan, jumlah SSR, persentase rate aktual, target patokan 3.0%, interval rata-rata (~33.3 pull), dan status hoki.
    - **Card 3 (🌐 Semua Gacha Gabungan)**: Menampilkan akumulasi seluruh tarikan dari kedua kategori (Karakter + Support Card).
- **Dinamika Grafik Rarity & Interval Pity Berdasarkan Kategori & Pool**:
  - **Distribusi Rarity (Donut Chart)**: Persentase perolehan SSR, baseline patokan resmi (3.0% vs 4.5%), dan indikator hoki delta otomatis beradaptasi dengan kategori dan pool yang aktif.
  - **Interval Tarikan SSR (Pity Intervals)**: Kartu SSR yang ditampilkan terisolasi sesuai kategori/pool, garis referensi patokan bergeser ke `33.3 pull` (3.0%) atau `22.2 pull` (4.5%), serta ambang batas warna hoki hijau ($\le 33$ atau $\le 22$) menyesuaikan probabilitas resmi banner.
- **Dukungan API Backend `/api/gacha/stats`**:
  - Menambahkan parameter `banner_type` (`all`, `character`, `support_card`) yang mengisolasi perhitungan query, breakdown rarity, dan riwayat interval perolehan SSR (`ssr_intervals`).
  - Menambahkan metadata `categories` (`character`, `support_card`, `all`) dan deteksi otomatis patokan rate efektif banner.

### 🔒 Proteksi Input Gacha & Rarity Selector Read-Only (`GachaView.jsx`)
- **Rarity Selector Non-Interaktif pada Form 10x Pull**:
  - Mengubah selector badge `[ R | SR | SSR ]` pada formulir tarikan 10-pull menjadi read-only (`pointer-events-none select-none`).
  - Rarity kini sepenuhnya terisi otomatis dari nama karakter/kartu atau template *Quick Fill* untuk mencegah ketidaksengajaan Trainer mengubah rarity kartu.

### 🌐 Lokalisasi Bahasa Indonesia Lanjutan (Menu Karir & Gacha)
- **Penerjemahan Header Pelacakan Karir**:
  - Menerjemahkan *"Career & Fans Tracking Analytics"* menjadi **"Analisis Pelacakan Karir & Fans"** pada `AnalyticsView.jsx`.
- **Penerjemahan Komprehensif Menu Hoki & Pity Gacha**:
  - *"Gacha Pull Luck & Rarity Analytics"* &rarr; **"Analisis Hoki & Distribusi Rarity Gacha"**.
  - *"Scenario Performance"* &rarr; **"Performa Skenario"**.
  - *"Gacha Luck & Pity Exchange"* &rarr; **"Hoki Gacha & Penukaran Pity"**.
  - *"Record single pulls and 10x multi-pulls, track spark progression towards 200 pulls, and verify your real SSR hit rate."* &rarr; **"Catat tarikan tunggal dan 10x multi-pull, pantau progres spark menuju 200 tarikan, dan verifikasi rasio perolehan SSR aktual Anda."**.
  - *"Active Pity"* &rarr; **"Pity Aktif"**.
  - Penerjemahan seluruh 4 kartu ringkasan metrik gacha: **TOTAL TARIKAN**, **SSR DIDAPAT**, **RATE SSR AKTUAL**, dan **HOKI VS PATOKAN**.

### 🔍 Perluasan Kamus Alias Karakter & Akurasi OCR (`UmaCatalog::getOcrLookupMap()`)
- **Ekspansi Masif Array `$staticAliases` untuk Pengenalan Teks OCR**:
  - Memperluas pemetaan kamus alias statis berprioritas tinggi pada `UmaCatalog::getOcrLookupMap()` hingga mencakup lebih dari 1.200 baris entri nama karakter, varian kostum resmi, dan penulisan teks asli bahasa Jepang.
  - **Dukungan Nama Romaji & Alias Panggilan Komunitas**: Menambahkan alias panggilan populer yang sering muncul pada screenshot dan komunitas seperti `ayabe`, `digitan`, `tachy`, `tachyon`, `spe`, `teio`, dll.
  - **Dukungan Varian & Gelar Kostum Resmi (Global & JP)**: Memetakan judul/kostum unik karakter langsung ke nama karakter utamanya untuk akurasi pencocokan otomatis:
    - `starlight beat` &rarr; `Oguri Cap`
    - `fate choosen star` / `fate chosen star` &rarr; `Epiphaneia`
    - `glacial queen` &rarr; `Admire Groove`, `starry nocturne` &rarr; `Admire Vega`, `fanatic jiangshi` &rarr; `Agnes Digital`, `lunatic lab` &rarr; `Agnes Tachyon`, `quercus civilis` &rarr; `Air Groove`, `heroic author` &rarr; `Zenno Rob Roy`, dan varian kostum lainnya.
  - **Dukungan Aksara Jepang Lengkap (Kanji, Katakana, Hiragana)**: Menambahkan teks nama karakter dalam aksara Jepang asli (seperti `アドマイヤグルーヴ`, `アドマイヤベガ`, `アグネスデジタル`, `ゼンノロブロイ`, `めんこいめんこいむつのはな`, `茶の子雪ん子`, dll.) agar pembacaan OCR dari screenshot client game server Jepang (JP) dapat dikenali secara instan dan presisi.
  - **Peningkatan Toleransi Format OCR**: Menangani variasi tanda baca, simbol khusus (`♡`), tanda petik (`'`), serta variasi spasi dan hyphen untuk meminimalkan kegagalan pencocokan akibat artefak kompresi screenshot.

### 👑 Dukungan Peringkat Legendaris LF (LF s/d LF24) & Perhitungan Rating Otomatis Karier
- **Integrasi Penuh Tier LF Berdasarkan Verifikasi GameWith & Datamine Komunitas JP**:
  - Mengonfirmasi catatan kalkulator penilaian resmi GameWith (*評価点シミュレーター*): *"現在 LF20の2230までのステータス入力に対応しています"* (Mendukung stat input hingga patokan LF20 di nilai 2.230 stat).
  - Menambahkan tier legendaris tertinggi baru di atas LG24, yaitu **LF (Legend F)** yang memiliki 25 sub-tingkatan (**`LF`**, serta **`LF1` s/d `LF24`**) yang merupakan batas teoritis skenario ulang tahun ke-5 (*Beyond Dreams*).
- **Pemetaan Ambang Nilai Skor Evaluasi Resmi (`UmaCatalog.php`)**:
  - `LF` : $\ge 91.400$
  - `LF1` s/d `LF5`: $92.000$ – $94.400$
  - `LF6` s/d `LF9`: $95.000$ – $96.900$
  - `LF10` s/d `LF19`: $97.500$ – $102.200$
  - `LF20`: $\ge 102.700$ (Patokan Simulator GameWith)
  - `LF21` s/d `LF23`: $103.200$ – $104.300$
  - `LF24`: $\ge 104.800$ (Maksimal Teoritis Skenario 5th Anniv)
- **Otomatisasi Penentuan Rank pada Input Skor Evaluasi (`FansView.jsx` & `EditCareerRunModal.jsx`)**:
  - Input skor evaluasi secara real-time langsung mengalkulasikan dan menentukan peringkat LF secara otomatis saat skor mencapai $\ge 91.400$.
  - Menambahkan tombol *"💡 Isi Cepat Skor Evaluasi"* baru: **91.400 (LF)** dan **102.700 (LF20)**.
  - Menambahkan grup tab pemilih manual **`LEGEND (LF)`** pada formulir penambahan dan penyuntingan sesi latihan karier.
- **Peningkatan OCR Screenshot Hasil Lari (`CareerOcrZone.jsx`)**:
  - Mendukung pengenalan pola teks rank `LF` serta memperluas batas deteksi angka skor evaluasi hingga 6 digit ($100.000$ s/d $200.000$).
- **Visualisasi Lencana Prestise Baru (`RankBadge.jsx`)**:
  - Menghadirkan lencana visual khusus tier LF bertema *celestial emerald-teal-cyan* bercahaya dengan ikon mahkota kaisar (*Crown*), cincin halo, dan animasi pelangi ultra-prestisius.

### 📋 Sinkronisasi Modal Changelog Navbar (`ChangelogModal.jsx` & `/api/changelog`)
- **Penyajian Pembaruan Real-Time**:
  - Memastikan seluruh catatan pembaruan versi 2.0.9 langsung terindeks dan tersaji pada modal interaktif *Riwayat Pembaruan (Changelog)* yang diakses melalui tombol **Changelog** pada bilah navigasi (Navbar).

---

## [Versi 2.0.8] - 26 September 2026

### 💡 Penerjemah Kondisi Skill Matematis ke Kalimat Alami (GameTora Condition Translator)
- **Terjemahan Kondisi Skill Otomatis & Mudah Dipahami**:
  - Mengintegrasikan mesin penerjemah kondisi skill pada modal detail skill (`SkillDetailModal.jsx`) di tab **🌸 Koleksi Karakter (Uma Musume)** dan **🃏 Koleksi Support Card**.
  - Mengubah formula matematis teknis yang rumit menjadi kalimat deskriptif bahasa Indonesia yang mengalir dan mudah dipahami oleh Trainer:
    - **Trigger 1**: *"Skill aktif saat berada di Fase Akhir (Late-Race) DAN berada di lintasan lurus seberang penonton (backstretch) DAN peringkat ke-1 s/d 2 (posisi 1–2 terdepan)."*
    - **Trigger 2**: *"Skill aktif saat sedang berada di tikungan ke-3 DAN telah melewati separuh jarak balapan (progres >= 50%) DAN peringkat ke-1 s/d 2 (posisi 1–2 terdepan)."*
- **Penyempurnaan Formula Khusus & Catatan Geometri Lintasan GameTora**:
  - `near_count`: Diterjemahkan sebagai *"Jumlah pelari lain yang berada di dekat Anda"*, dilengkapi catatan teknis GameTora: *"Dekat = tidak lebih dari 3 meter di depan/belakang dan maksimal 3 lajur lintasan ke sisi kiri/kanan. 1 lajur = 1/18 lebar lintasan"*. Contoh: `near_count==4` diterjemahkan menjadi *"Ada tepat 4 pelari lain di dekat Anda"*.
  - `always == 1`: Disederhanakan menjadi *"Skill akan selalu aktif secara otomatis"* tanpa menampilkan formula angka `== 1` yang membingungkan.
  - `infront_near_lane_time`: Diterjemahkan sebagai *"Durasi (detik) saat ada pelari lain tepat berada di depan Anda"*, dilengkapi catatan teknis GameTora: *"Tepat di depan = tidak lebih dari 2.5 meter di depan dan maksimal 1 lajur ke samping (1/18 lebar lintasan). Tidak harus Uma yang sama (selama minimal ada satu), namun jika posisi lajur Anda berubah, timer akan direset"*. Contoh: `infront_near_lane_time>=3` diterjemahkan menjadi *"Pelari lain berada tepat di depan Anda selama minimal 3 detik"*.
  - Menambahkan penanganan formula pelari dan lintasan lainnya: `near_infront_count`, `behind_near_lane_time`, `blocked_all_continuetime`, `lastspurt`, `is_move_lane`, `is_tight_track`, `rotation`, `corner_count`, `furlong`, dll.
- **Komponen Catatan Kontekstual Interaktif (`item.note`)**:
  - Memperbarui `SkillDetailModal.jsx` untuk merender kotak catatan teknis tematik di bawah setiap butir klausul formula kondisi dan prakondisi.
- **Daftar Butir Kriteria dengan Ikon Tematik**:
  - Menampilkan setiap klausul kondisi dalam baris terstruktur lengkap dengan ikon kategori (🚩 Fase Balapan, 🧭 Lintasan/Straight, 🏆 Peringkat, ⏱️ Waktu & Jarak, ⚡ Manuver/Aksi Balap, 🛡️ Status Pelari, dll.).
  - Menyertakan badge formula singkat di samping penjelasan (misal: `[phase==2]`, `[straight_front_type==2]`, `[order<=2]`).
- **Pemisahan Jelas Percabangan Alternatif (`@`)**:
  - Menampilkan pemisah visual yang tegas (`⚡ ATAU (Pilihan Alternatif) ⚡`) ketika skill memiliki beberapa alternatif syarat aktivasi.
- **Terjemahan Syarat Awal (Precondition)**:
  - Menerjemahkan syarat awal skill seperti strategi pelari (`running_style==2` -> *Menggunakan strategi Leader / 先行*) atau jarak balapan secara otomatis.
- **Opsi Toggle Formula Matematis Asli**:
  - Menyediakan tombol interaktif `[Formula Teknis]` pada sudut kartu kondisi sehingga Trainer tetap dapat melihat dan menyalin rumus formula asli GameTora kapan saja sesuai kebutuhan min-maxing.

### 🌐 Lokalisasi Bahasa Indonesia Menyeluruh (Dashboard & Navigasi)
- **Penerjemahan Penuh Halaman Dashboard (`DashboardView.jsx`)**:
  - Hero banner selamat datang dan navigasi cepat aksi utama (Simulasi Gacha, Catat Run Karir, Log Snapshot Circle, dll.).
  - 4 Kartu KPI Utama: *Total Tarikan*, *Pity Aktif*, *Hit Rate SSR*, dan *Fans Circle Bulanan*.
  - Distribusi perolehan rarity tarikan banner, riwayat feed aktivitas terkini, serta widget ritme harian (*Ritme Harian & Estimasi Run Circle*).
- **Penerjemahan Komponen Navigasi (`Navbar.jsx` & `MobileBottomNav.jsx`)**:
  - Seluruh menu tab navigasi desktop dan mobile: *Beranda*, *Pulls*, *Karir*, *Circle*, *Katalog Karakter*, *Koleksi Support Card*, *Perencana Jewel*.
  - Badge kuota circle (*"Circle Penuh (30/30)"* / *"Kuota Tersisa X Anggota"*), serta tombol switch tema tampilan (*Mode Terang* / *Mode Gelap*).

### 🃏 Integrasi Penuh Koleksi Support Card & Event Reward Skills
- **Perbaikan Pop-up Skill Event Support Card**:
  - Memperbaiki penanganan klik reward skill event pada `SupportCardDetailModal.jsx` (seperti saat menekan skill *Tail Nine Lv +2 / 尻尾の滝登り* atau *Uncharted Heights* pada pilihan Ikusei Event) yang sebelumnya hanya menampilkan nama dan deskripsi tanpa kondisi aktivasi maupun efek.
  - Menggabungkan data reward event secara komprehensif dengan `event_skills` dan `hints.skills`, melestarikan seluruh properti teknis (`condition_groups`, `condition`, `precondition`, `effects`, `base_duration`, `rarity`, `activation`, `base_cost`).
- **Endpoint API Detail Skill Dinamis (`/api/collection/skill-detail`)**:
  - Menyediakan endpoint RESTful baru `GET /api/collection/skill-detail` untuk memuat data detail lengkap skill secara instan berdasarkan ID atau nama jika data skill reward belum tersimpan di cache lokal modal.
- **Penyempurnaan Parser Training Events GameTora**:
  - Memperbarui `GameToraSyncService::fetchSupportCardTrainingEvents` agar reward skill jenis `sk` otomatis diperkaya dengan metadata kondisi lengkap (`enrichSkillData`).
- **Pengayaan Skala Penuh Database Katalog**:
  - Memperluas perintah `php artisan uma:enrich-skills` untuk memproses seluruh data support card (`hints.skills`, `event_skills`, serta rewards pada `training_events` dan `dates`), berhasil memperkaya **6.477 skill** pada seluruh 268 karakter dan 559 support card.

### 🏆 Klarifikasi Peringkat Turnamen: CM & LoH
- **Penjelasan Eksplisit Singkatan Turnamen**:
  - Mengintegrasikan nama turnamen lengkap pada formula `order_rate` di backend (`SkillConditionTranslator.php`) dan frontend (`skillConditionTranslator.js` & `SkillDetailModal.jsx`):
    - **CM**: Dijelaskan sebagai **Champions Meetings** (format balapan 9 Uma).
    - **LoH**: Dijelaskan sebagai **League of Heroes** (format balapan 12 Uma).
  - Teks terjemahan kondisi `order_rate` kini langsung menampilkan: `Peringkat di 40% pelari terdepan (CM [Champions Meetings] <= 4 | LoH [League of Heroes] <= 5)`.
  - Menambahkan banner informatif khusus konteks turnamen di dalam `SkillDetailModal` setiap kali klausul `order_rate` hadir pada syarat aktivasi skill.

### 📚 Kamus 144+ Kondisi Skill Otentik GameTora
- **Mesin Penerjemah Dwibahasa Komprehensif (Backend & Frontend)**:
  - Menyediakan pustaka penerjemah `App\Support\SkillConditionTranslator` (PHP) dan `resources/js/utils/skillConditionTranslator.js` (JavaScript) yang mengadopsi 144 definisi kondisi resmi dari [GameTora Skill Condition Viewer](https://gametora.com/umamusume/skill-condition-viewer).
  - Perintah Artisan Baru `php artisan uma:enrich-skills` untuk memindai dan menyuntikkan terjemahan kondisi ke seluruh 970+ item katalog karakter dan support card secara instan.
  - Sinkronisasi otomatis GameTora (`GameToraSyncService`) yang kini langsung memformat metadata `condition_translated` dan `precondition_translated` pada setiap proses sinkronisasi katalog.

### 💾 Penyempurnaan Fitur Backup & Restore
- **Pembaruan Spesifikasi Skema v2.0 (`docs/backup_specification.md`)**:
  - Mencatat dan meresmikan kolom skema `objectives` (`array|null` / JSON) pada entitas `uma_catalog_items` untuk menyimpan target turnamen/objektif balapan skenario URA & Aoharu karakter.
  - Memastikan seluruh operasi ekspor, impor, dan resolusi merge (`updateOrCreate`) pada `BackupService` memperbarui dan memvalidasi `objectives` dengan integritas 100%.
- **Preservasi Data Terjemahan & Katalog Utuh**:
  - Memastikan seluruh data katalog `uma_catalog_items` beserta metadata skill dan terjemahan kondisi tercadangkan dan terpulihkan dengan integritas 100%.
  - Mengoptimalkan alokasi memori proses CLI (`ini_set('memory_limit', '512M')`) pada `BackupService`, `BackupUmaDataCommand` (`uma:backup`), dan `RestoreUmaDataCommand` (`uma:restore`) sehingga ekspor dan impor file cadangan katalog skala besar berjalan mulus tanpa kendala batas memori (*memory exhausted*).
- **Penyempurnaan Antarmuka Pratinjau Pemulihan (Restore Preview)**:
  - Memperkaya grid kartu pratinjau file pada `BackupRestoreModal.jsx` menjadi 6 kolom statistik lengkap:
    - 🎟️ Pulls
    - 🏆 Career Runs
    - 📑 Banner 2026
    - 📖 Katalog GameTora
    - 🌸 Koleksi Uma
    - 🃏 Koleksi Support Card
  - Memperbarui teks panduan cadangan agar mencantumkan jaminan perlindungan katalog GameTora dan terjemahan kondisi skill.

### 🧪 Pengujian Otomatis (Test Suite)
- **Feature Test `SkillConditionTranslatorTest`**:
  - Menguji keakuratan terjemahan Trigger 1 (`phase==2&straight_front_type==2&order<=2`).
  - Menguji keakuratan terjemahan Trigger 2 (`distance_rate>=50&corner==3&order<=2`).
  - Menguji percabangan alternatif kondisi `@` (ATAU).
  - Menguji formula `order_rate` dengan kalkulasi Champions Meeting (CM) dan League of Heroes (LoH).
  - Menguji formula khusus `near_count`, `always==1`, dan `infront_near_lane_time` beserta catatan geometrinya.
  - Menguji perintah artisan `uma:enrich-skills`.
- **Pengujian Penuh Backup & Restore**:
  - 59 skenario uji pada `BackupApiTest`, `BackupRoundTripTest`, dan `BackupVerificationTest` lulus 100% (784 assertions).
  - Pengujian round-trip 100% semantik untuk seluruh 9 entitas termasuk kolom `objectives` pada katalog.
  - Pengujian penolakan ketat untuk format JSON rusak pada `objectives` (`Format JSON tidak valid pada uma_catalog_items[0].objectives`).
- **Verifikasi Global Test Suite**:
  - Seluruh 171 test cases pada aplikasi lulus tanpa error (1.769 assertions).

---

## [Versi 2.0.7] - 23 September 2026

### 🎯 Detail Skill Komprehensif (Rarity, Activation, Condition, Duration & Scaling)
- **Modal Detail Skill Otentik GameTora**:
  - Menghadirkan modal interaktif `SkillDetailModal.jsx` yang menampilkan data teknis mendalam saat skill diklik, baik pada Character Collection maupun Support Card Collection:
    - **Rarity**: Indikator rarity (Normal, Rare, Unique, Evolved) dengan visual dot penanda warna.
    - **Activation**: Mekanisme aktivasi skill (Guaranteed, Wit check, dll.).
    - **Base Cost**: Biaya skill point (pt).
    - **Conditions**: Formula kondisi teknis lengkap (misal: `activate_count_middle>=3`, dll.).
    - **Base Duration**: Durasi dasar efek skill (dalam detik, instant effect, atau none).
    - **Effect**: Formula kalkulasi efek (Target Speed, Acceleration, Stamina Recovery, dll.).
- **Pemisahan Grup Trigger (Trigger 1 & Trigger 2) & Dukungan Precondition**:
  - Memisahkan visualisasi kondisi dan efek per pemicu (*trigger*) saat skill memiliki lebih dari satu grup kondisi (misal: skill unik *Victoria por plancha ☆* milik El Condor Pasa):
    - **Header Pemicu Mandiri**: Menampilkan sub-judul *Trigger 1*, *Trigger 2*, dst. lengkap dengan durasi dasar dan daftar efek masing-masing.
    - **Dukungan Precondition**: Menampilkan blok khusus teks kondisi awal (*precondition*) seperti `running_style` atau `course_distance` jika tersedia pada data skill.
    - **Anotasi Otomatis Posisi Balapan**: Menganotasi `order_rate` secara cerdas dengan rentang posisi balapan kompetitif *Champions Meeting* (9 Uma) dan *League of Heroes* (12 Uma) (misal: `order_rate<=40 (CM <= 4 | LoH <= 5)`).
    - **Pemisahan Baris Bersih**: Menata operator kondisi `&` dan `@` ke baris baru (*clean line breaks*) dengan font monospaced yang mudah dibaca.
- **Penyempurnaan Tampilan Mode Gelap (Dark Mode)**:
  - Memperbaiki warna latar belakang kartu pemicu trigger pada `SkillDetailModal.jsx` di Mode Gelap menjadi `dark:bg-slate-800/90` dengan border ungu halus `dark:border-purple-900/70` dan kotak kondisi/efek berlatar `dark:bg-slate-900/90`, mengeliminasi tampilan kontras pudar (*washed-out*).
- **Tabel Penskalaan Efek Khusus (Special Scaling Table)**:
  - Menyediakan visualisasi kotak dan tabel 3 kolom presisi (`[ Header | Mult | Total ]`) untuk skill dengan penskalaan dinamis (*special scaling*):
    - Penjelasan pengantar nilai dasar (e.g. `The base value for this effect is 0.15`).
    - Penjelasan metrik penskalaan (e.g. `The multiplier scales with your fan count`, stat tim, kemenangan balapan, dsb.).
    - Tabel berjenjang yang menghitung nilai akhir (*total*) secara instan berdasarkan pengganda (*multiplier*).
- **Enrichment Data Sinkronisasi GameTora**:
  - Memperkaya *parser* pada `GameToraSyncService` untuk mengekstrak dan memformat metadata skill (activation type, condition, base duration, dan rumus formula efek) serta 35+ variasi aturan *special scaling* GameTora.

### 🏁 Tab Target Karir (Career Objectives) pada Detail Karakter
- **Visualisasi Kalender Karir Pelatihan Otentik**:
  - Menambahkan tab baru **Target Karir (Objectives)** pada `CharacterDetailModal.jsx` yang menampilkan seluruh target balapan dan tantangan pelatihan Uma Musume:
    - **Banner Balapan Resmi**: Menampilkan grafis spanduk resmi balapan GameTora (`banners/{icon_id}.png`).
    - **Ribbon Badge Kategori**: Menampilkan lencana pita (*blue ribbon badge*) berujung segitiga khas untuk target non-balapan spesifik (misal: `G I` untuk target kelolosan balapan G1 atau akumulasi fans).
    - **Urutan & Judul Target**: Nomor urut dan nama balapan (e.g. `1. Participate in the Junior Make Debut`, `2. Place 3rd or better in the Hyacinth Stakes`).
    - **Turn Timing**: Nomor putaran turn beserta selisih turn dari target sebelumnya (e.g. `Turn 12`, `Turn 28 (previous + 15)`).
    - **Periode Kelas**: Klasifikasi waktu balapan (e.g. `Junior Class, Late June`, `Classic Class, Late February`).
    - **Kondisi Trek**: Rincian permukaan, jarak, dan kategori balapan (e.g. `Dirt - 1600m - Mile`, `G1 - Turf - 1600m - Mile`).
  - Tampilan baris bergantian (*alternating rows*) yang elegan (`bg-[#e8f4f8]` dan `bg-white`) dengan adaptasi penuh di Mode Terang maupun Gelap (*Dark Mode*).
- **Penyederhanaan Label Tombol**:
  - Mengubah teks tombol pemicu pada `CollectionView.jsx` dari sebelumnya `"Detail & Pohon Skill"` menjadi `"Detail Karakter"`.
- **Perbaikan Duplikasi Nomor Urut Target**:
  - Memperbaiki duplikasi prefix nomor urut pada daftar target karir (e.g. `9. 9. Place 3rd...` menjadi `9. Place 3rd...`) dengan pembersihan otomatis pada parser, normalisasi data di database lokal, serta *regex stripping* pada komponen antarmuka.

### 📱 Pengoptimalan Navigasi Mobile (Scrollable Drawer)
- **Menu Navigasi Mobile Dapat Digulir (*Scrollable*)**:
  - Menambahkan pembatas tinggi adaptif `max-h-[calc(100dvh-4.5rem)]` dan `overflow-y-auto` dengan `overscroll-contain` pada menu navigasi mobile (`Navbar.jsx`).
  - Memberikan *bottom padding* memadai (`pb-28`) sehingga tombol *Changelog*, *Backup & Restore*, dan bilah *Circle Fans Quota* dapat digulir dan diakses penuh tanpa tertutup oleh bilah navigasi bawah (*Mobile Bottom Nav*).
  - Mengunci pengguliran latar belakang (*body scroll lock*) saat menu mobile terbuka untuk interaksi sentuh yang nyaman di perangkat layar kecil.

### 💾 Integrasi Backup & Restore Komprehensif
- **Dukungan Kolom `objectives` & Metadata Skill**:
  - Menambahkan kolom `objectives` (JSON) pada skema tabel `uma_catalog_items`.
  - Memperbarui `BackupService.php` untuk memvalidasi, mengekspor, dan memulihkan data `objectives` serta seluruh metadata skill yang diperkaya tanpa kehilangan detail apapun.

---

## [Versi 2.0.6] - 23 September 2026

### 🏆 Penyesuaian Hadiah Kompetitif Bulanan Champions Meeting (Grade League)
- **Kalibrasi Hadiah Resmi In-Game pada Jewel Planner**:
  - Memperbarui daftar opsi dan data hadiah Champions Meeting (Grade League) di `JewelPlannerView.jsx` agar 100% presisi sesuai tampilan resmi in-game:
    - **Final Group A - Juara 1**: **3.000 Carat + 10 Tiket** (5 Tiket Uma Musume + 5 Tiket Support Card).
    - **Final Group A - Juara 2**: **2.400 Carat + 8 Tiket** (4 Tiket Uma Musume + 4 Tiket Support Card).
    - **Final Group A - Juara 3**: **1.800 Carat + 6 Tiket** (3 Tiket Uma Musume + 3 Tiket Support Card).
    - **Final Group B - Juara 1**: **1.800 Carat + 6 Tiket** (3 Tiket Uma Musume + 3 Tiket Support Card).
    - **Final Group B - Juara 2**: **1.500 Carat + 4 Tiket** (2 Tiket Uma Musume + 2 Tiket Support Card).
    - **Final Group B - Juara 3**: **1.200 Carat + 2 Tiket** (1 Tiket Uma Musume + 1 Tiket Support Card).
- **Proyeksi Tiket Gacha Cerdas & Proporsional**:
  - Menyesuaikan kalkulasi proyeksi tiket pada planner agar tiket hadiah kompetitif didistribusikan secara proporsional sesuai target banner yang dipilih Trainer:
    - Target Banner Karakter: mengambil jatah Tiket Karakter (`charTickets`).
    - Target Banner Support Card: mengambil jatah Tiket Support Card (`suppTickets`).
    - Target Semua Banner: menggabungkan total keseluruhan tiket (`tickets`).
  - Menampilkan ringkasan perolehan tiket bulanan langsung pada bilah rincian akordion hadiah kompetitif (`+X Carat + Y Tiket`).

### 🔄 Perbaikan Bug Pity Counter Macet (#0) Pasca Reset Spark
- **Resolusi Akar Masalah (Root Cause Fix)**:
  - Memperbaiki cacat logika pada `GachaPity::recalculate` di mana tanggal gameplay (`pulled_at`) sebelumnya dibandingkan langsung dengan timestamp sistem (`last_reset_at`). Hal tersebut sebelumnya menyebabkan seluruh tarikan baru yang menggunakan tanggal rilis banner (tanggal lampau) keliru diabaikan (*skipped*) dan bernilai `#0`.
- **Pemisahan Siklus Spark Andal & Presisi**:
  - Menerapkan pemisahan siklus berbasis kuota spark terakumulasi (`sparkedQuota = total_sparks * 200`) dikombinasikan dengan perbandingan timestamp sistem (`created_at > last_reset_at`) dan tanggal gameplay (`pulled_at > last_reset_at`).
  - Memastikan seluruh tarikan baik pada siklus sebelumnya maupun siklus baru setelah reset mendapatkan nomor urut kronologis yang valid (`#1` s/d `#200`) dan tidak pernah bernilai `#0`.
  - Pity counter aktif otomatis berlanjut secara konsisten pada siklus berikutnya setelah reset dilakukan.
- **Normalisasi Data Riil Banner Pengguna**:
  - Menjalankan sinkronisasi data riil pada banner aktif pengguna (*Banner 72: Select Pick Up Support Card Sep 2026*).
  - Sebanyak 40 tarikan yang sebelumnya tertahan pada `#0` kini telah berhasil dinormalisasi menjadi `#1` s/d `#40`, dan *active pity counter* pada widget langsung pulih ke **40 / 200**.
- **Pengujian Otomatis Komprehensif**:
  - Menambahkan pengujian fitur baru di `tests/Feature/UmaTrackerApiTest.php` (`test_pity_continues_counting_properly_after_reset_spark_even_with_past_banner_date`) untuk memvalidasi alur 200 tarikan -> reset spark -> 10 tarikan bertanggal banner lampau -> verifikasi nomor urut `#1` s/d `#10` dan counter pity aktif 10.

---

## [Versi 2.0.5] - 23 September 2026

### 🌈 Efek Latar Belakang Pelangi (Rainbow Iridescent) Kartu SSR pada Input Gacha
- **Diferensiasi Visual SSR vs SR yang Jelas & Estetis**:
  - Menambahkan styling animasi gradien pelangi berkilau (*rainbow iridescent shimmer*) `.ssr-slot-rainbow` pada slot input multi-pull di `GachaView.jsx` ketika kartu ber-rarity SSR dipilih.
  - Efek ini menghadirkan transisi warna halus pelangi (magenta/rose, emas/amber, zamrud, biru muda, dan ungu) dengan pendaran cahaya (*glow effect*) yang membedakan kartu SSR secara instan dan tegas dari kartu SR (yang mempertahankan warna kuning emas).
  - Teks nomor urut slot (`#1`, `#2`, dst.) otomatis diberi efek tipografi gradien pelangi berkilau saat opsi kartu SSR aktif.
  - Mendukung adaptasi penuh di Mode Terang maupun Mode Gelap (*Dark Mode*) dengan rasio kontras tinggi dan pencahayaan latar yang elegan.

### ⚡ Fitur Edit Massal (Bulk Edit) & Penggantian Tipe Gacha Serentak
- **Penggantian Tipe Gacha Sekali Klik pada Baris Terpilih**:
  - Menambahkan bilah kontrol aksi massal interaktif pada tabel riwayat gacha (`GachaView.jsx`) ketika Trainer mencentang satu atau beberapa baris data (misal: 15 baris sekaligus).
  - Menyediakan dropdown **Ganti Tipe Pull** instan di bilah aksi dengan pilihan:
    - 🎟️ **Tiket Kustom** (`custom_ticket`)
    - ⚡ **10x Multi-Pull** (`multi_10`)
    - 🎯 **Single Pull (1x)** (`single`)
    - 🎫 **Ticket Pull** (`ticket`)
  - Tombol **Terapkan** memungkinkan Trainer menerapkan tipe gacha yang dipilih secara serentak ke seluruh baris yang dicentang hanya dengan sekali klik tanpa perlu mengedit satu per satu.
- **Modal Edit Massal Lanjutan (Bulk Edit Modal)**:
  - Menyediakan tombol dan popup modal baru `BulkEditGachaPullModal.jsx` untuk pengubahan data gacha massal yang lebih mendalam, termasuk opsi memindahkan banner JP 2026 serta menyamakan tanggal penarikan kartu bersamaan.
- **Backend Endpoint & Validasi Atomik**:
  - Menambahkan endpoint REST API `POST /api/gacha/pulls/bulk-update` pada `GachaController::bulkUpdate`.
  - Menerapkan form request validator `BulkUpdateGachaPullRequest` untuk validasi tipe gacha, format tanggal, dan keberadaan ID banner.
  - Menghitung ulang (*auto-recalculate*) counter pity secara akurat pada banner-banner yang terdampak.
- **Pengujian Otomatis Komprehensif**:
  - Membuat unit & feature test baru di `tests/Feature/GachaBulkUpdateTest.php` yang memverifikasi perubahan tipe gacha massal pada 15 baris data sekaligus, penolakan tipe tidak valid, serta keharusan pemilihan ID (100% lolos).

---

## [Versi 2.0.4] - 23 September 2026

### 🛡️ Validasi Ketat Integritas Rate-Up Gacha (Backend & Database)
- **Pencegahan Penyimpanan Kartu Non-Rate-Up**:
  - Menambahkan validasi ketat pada backend (`StoreGachaPullRequest`, `BatchGachaPullRequest`, dan `UpdateGachaPullRequest`) untuk memastikan bahwa kartu yang ditandai `is_rate_up: true` benar-benar terdaftar dalam `featured_items` pada banner yang dipilih.
  - Kartu dengan rarity `R` secara absolut ditolak jika ditandai sebagai rate-up (`Kartu dengan rarity R tidak dapat dijadikan rate-up.`).
  - Permintaan yang tidak valid akan langsung ditolak dengan respon `422 Unprocessable Entity` disertai pesan kesalahan yang jelas dan spesifik.
  - Memperkuat controller (`GachaController`) dengan pengaman berlapis (*defense-in-depth*) sehingga status rate-up otomatis dipaksa menjadi `false` jika kartu bukan merupakan bagian dari rate-up banner terkait.
- **Sanitasi Basis Data Lokal**:
  - Menyediakan perintah artisan `php artisan gacha:sanitize-rateup` untuk memindai dan menormalisasi seluruh catatan gacha historis di database lokal yang sebelumnya sempat tersimpan keliru sebagai rate-up.

### 🔄 Otomatisasi Uncheck & Kontrol Manual Select Pick Up (Frontend)
- **Auto-Uncheck saat Pilihan Diganti ke Non-Rate-Up**:
  - Pada formulir input tarikan multi-pull (`multiPulls`) dan single-pull (`singleForm`) di `GachaView.jsx`, ketika pengguna mengganti kartu pilihan ke kartu yang bukan merupakan rate-up banner (misal kartu R, SR, atau kartu lain di luar kandidat), centang `[UP]` kini **otomatis hilang / tidak tercentang**.
  - Mengubah rarity kartu menjadi `R` atau non-SSR pada mode Select Pick Up secara otomatis membatalkan centang status rate-up.
- **Proteksi Centang Manual di Mode Select Pick Up**:
  - Mempertahankan fleksibilitas tombol centang manual `UP` pada banner kategori *Select Pick Up* agar Trainer bebas memilih 2 kartu SSR unggulannya di dalam game.
  - Menerapkan pembatasan protektif: tombol centang manual `UP` hanya dapat diaktifkan jika kartu pada slot tersebut merupakan salah satu dari **10 kandidat SSR resmi** pada banner Select Pick Up terkait.
  - Menampilkan notifikasi peringatan (*toast warning*) jika Trainer mencoba mencentang `UP` pada slot kosong atau kartu yang bukan kandidat sah.
- **Sinkronisasi Validasi Modal Edit & Quick 10-Pull**:
  - Menerapkan auto-uncheck dan validasi yang sama pada modal penyuntingan riwayat gacha (`EditGachaPullModal.jsx`) dan modal penarikan cepat (`Quick10PullModal.jsx`).

---

## [Versi 2.0.3] - 23 September 2026

### ⚠️ Disclaimer Otomatisasi OCR Career Run
- **Peringatan Deteksi Hasil Training**:
  - Menambahkan banner disclaimer visual di bawah judul formulir *OCR Screenshot Import (Auto-Fill Form)* pada menu Career (`CareerOcrZone.jsx`).
  - Memberikan notifikasi jelas kepada Trainer bahwa pemrosesan OCR gambar otomatis dapat berpotensi menghasilkan kesalahan deteksi angka, nama karakter, atau teks akibat variasi resolusi screenshot. Trainer diingatkan untuk memverifikasi isian sebelum menyimpan riwayat karir.

### 🌓 Perbaikan Kontras Ikon Log Gacha Dashboard (Dark Mode)
- **Tombol Log Gacha Tetap Jelas di Mode Gelap**:
  - Memperbaiki masalah visual di mana ikon `Sparkles` pada tombol "Log Gacha" di Dashboard lenyap/tidak terlihat saat mengaktifkan Dark Mode.
  - Masalah terjadi karena penimpaan aturan CSS global `html.dark .text-amber-900` menjadi warna amber terang (`#fbbf24`), yang persis sama dengan latar belakang tombol `bg-amber-400`.
  - Menambahkan class `.btn-log-gacha` di `app.css` dengan aturan kontras tinggi (`color: #0f172a !important`) untuk teks dan ikon SVG, menjamin keterbacaan tajam dan kontras solid di tema terang maupun gelap.

### 🎴 Filter Non-MLB Support Card (0LB hingga 3LB)
- **Kemudahan Pelacakan Kartu Belum Maksimal**:
  - Menambahkan tombol filter baru `Non-MLB` pada baris penyaringan `Limit Break:` di menu Koleksi Kartu Bantuan (`CollectionView.jsx`).
  - Pilihan limit break kini mencakup: `Semua LB`, `★ MLB`, `Non-MLB`, `3LB`, `2LB`, `1LB`, dan `0LB`.
  - Filter `Non-MLB` secara akurat menampilkan seluruh kartu bantuan yang belum mencapai limit break maksimal (0LB s.d. 3LB), mempermudah Trainer mengecek kartu yang masih memerlukan uncap atau salinan tambahan.

### 📊 Base Stats & Stat Bonuses Karakter (GameTora JP)
- **Integrasi Status Dasar & Persentase Bonus Pertumbuhan**:
  - Mengintegrasikan data statistik resmi GameTora ke dalam katalog dan respons API karakter (`/api/collection/characters` dan `/api/collection/characters/detail`).
  - Menambahkan tab khusus **`Status & Bonus (Base Stats)`** pada popup modal detail karakter (`CharacterDetailModal.jsx`):
    - **Base stats**: Menampilkan 2 baris kartu statistik dengan ikon resmi GameTora (Speed, Stamina, Power, Guts, Wit) untuk bintang asal (★/★★/★★★) dan bintang 5 (★★★★★).
    - **Stat bonuses**: Menampilkan persentase bonus latihan (misal: Speed 20%, Guts 10%, Wit 10%, dll.) atau tanda `-` jika bonus 0%.
  - Menyimpan aset 5 ikon status resmi GameTora secara lokal di `/images/icons/` untuk akses cepat tanpa latensi eksternal.

### 🌟 Dukungan Dual Unique Skills untuk Karakter Bintang 1 & 2
- **Visualisasi Varian Unique Skill (☆ and ☆☆ vs ☆☆☆+)**:
  - Memperbarui parser skill backend `GameToraSyncService::parseCharacterSkills()` untuk mengekstrak kedua versi kemampuan unik bagi 22 karakter bawaan 1★ dan 2★ dari dataset GameTora:
    1. Versi awal bawaan: `☆ and ☆☆` (misal: *Introduction to Physiology* untuk Agnes Tachyon).
    2. Versi upgrade setelah mencapai 3★+: `☆☆☆+` (misal: *U=ma2* untuk Agnes Tachyon).
  - Menyediakan atribut `unique_versions`, `unique_low`, dan `unique_high` pada objek data skill.
  - Memperbarui modal detail karakter untuk menampilkan kartu ganda dengan bilah bintang dan kotak judul gradasi warna-warni (rainbow badge) sesuai tampilan visual resmi GameTora.

### 🔒 Integritas Sinkronisasi, Backup & Restore
- **Perlindungan Data Utuh**:
  - Memverifikasi bahwa seluruh data baru (`base_stats`, `five_star_stats`, `stat_bonus`, dan `unique_versions`) tersimpan aman dalam berkas cadangan (backup JSON) dan dapat dipulihkan secara utuh tanpa kehilangan data (*lossless*).
  - Sinkronisasi GameTora di masa mendatang akan otomatis memproses dan memperbarui data statistik serta varian unique skills secara konsisten.

---

## [Versi 2.0.2] - 23 September 2026

### 🍩 Perbaikan Teks Tertimpa pada Donut/Pie Chart (Dashboard & Analytics)
- **Hover Auto-Fade pada Angka Tengah Chart**:
  - Memperbaiki masalah visual di mana teks angka atau persentase di tengah Donut Chart bertabrakan dan tertimpa oleh kartu `<Tooltip />` saat pengguna mengarahkan kursor (*hover*) pada irisan pie (`DashboardView.jsx` dan `AnalyticsView.jsx`).
  - Menambahkan event listener `onMouseEnter` dan `onMouseLeave` pada komponen `<Pie>` sehingga teks di tengah lingkaran memudar secara halus (`opacity-0 transition-opacity`) saat tooltip aktif, dan kembali muncul normal saat kursor keluar.
  - Mengatur elevasi CSS `zIndex: 40` pada container `<Tooltip />` agar selalu berada di lapisan visual teratas tanpa terpotong chart.

### 🚫 Penyaringan Ketat Kategori Select Pick Up pada Gacha Character
- **Pembersihan Dropdown Pilihan Banner Karakter**:
  - Menyelaraskan logika formulir di `GachaView.jsx` agar kategori `Select Pick Up` dibatasi secara ketat hanya muncul pada gacha Support Card (karena format pemilihan 2 dari 10 SSR resmi hanya berlaku untuk kartu bantuan).
  - Menghilangkan opsi kategori Select Pick Up dari dropdown pilihan gacha Karakter, memastikan hanya kategori yang valid (Twinkle Collection, Anniversary / Skenario, dan Standard) yang tampil bagi Trainer.

### 📜 Katalog Resmi 10 SSR Select Pick Up 2026 & Scraper Umapyoi News
- **Penyelarasan 9 Banner Resmi 2026 Sesuai Dokumen Referensi PDF**:
  - Menyelaraskan seluruh 9 banner resmi Select Pick Up tahun 2026 (Januari s.d. September 2026) dengan daftar 10 kartu SSR kandidat resmi (`UmaCatalog.php` & `GameToraSyncService.php`).
  - Menghapus banner duplikat Februari 2026 serta entri banner character select pickup yang salah tipe.
  - Menstandarkan penamaan banner menjadi format ringkas dan bersih: `Select Pick Up (Mmm YYYY)`.
- **Integrasi Web Scraper Dinamis Umapyoi News**:
  - Membangun scraper dinamis terintegrasi ke Umapyoi News (`https://umapyoi.net/news?search=select`) untuk memindai artikel berita bertajuk *"Select Pickup Support Card Gacha"*.
  - Scraper mengekstrak daftar entitas dari bagian *"Featured Support Card Candidates"* secara otomatis untuk mempersiapkan dan memperbarui kandidat rate-up pada rilis banner mendatang.

### 💌 Tab "Dates" Khusus Support Card Tipe Friend & Group
- **Visualisasi Kencan Berantai (Chain Outings)**:
  - Mengganti tab "Training Events" menjadi **"Dates"** khusus untuk kartu bantuan bertipe Friend dan Group pada modal detail kartu (`SupportCardDetailModal.jsx`).
  - Menampilkan ikon hati (`Heart`) dan label jumlah total kencan (*Outings*).
  - Mengekstrak data kencan berantai dari GameTora (`en['dates']` / `ja['dates']`) dengan simbol tahapan bertingkat: `(>)`, `(>>)`, `(>>>)`, `(>>>>)`, `(>>>>>)` serta label terstruktur `Outing Stage 1..5`.
  - Menambahkan badge visual baru untuk perolehan poin skill (*Skill Pt +X*) dan penyembuh status (*Cure Condition / Mood Up*).

### 💡 Popup Detail Efek Skill Interaktif pada Training Events & Dates
- **Modal Interaktif Penjelasan Efek Skill**:
  - Seluruh badge skill hint pada daftar event training dan kencan berantai kini dapat diklik langsung oleh Trainer.
  - Membuka modal popup interaktif (`SkillDetailPopup`) yang menyajikan:
    - Ikon resmi skill berdasarkan kategori (Speed, Stamina, Recovery, Debuff, Acceleration, dll.).
    - Nama skill lengkap dalam Bahasa Inggris dan Kanji Jepang.
    - Level bonus hint yang didapatkan (`Lv +1` s.d. `Lv +5`).
    - Deskripsi efek skill mendalam dari basis data GameTora JP dengan fallback cerdas ke event skills kartu bantuan.
  - Mendukung penutupan fleksibel melalui tombol Tutup, silang (X), klik di luar backdrop, atau tombol Escape keyboard.

---

## [Versi 2.0.1] - 20 September 2026

### 🐎 Fallback Sinkronisasi Banner Baru GameTora (Rose Kingdom JP 2026)
- **Ekstraksi Cerdas via `pickups` & `lineup['7500']`**:
  - Mengimplementasikan mekanisme fallback cerdas pada `GameToraSyncService` ketika berkas indeks relasi balik GameTora (`char_banners.json` atau `support_banners.json`) terlambat diperbarui untuk banner yang baru saja dirilis.
  - Sistem kini otomatis mengekstrak daftar entitas banner dan kartu rate-up langsung dari array `pickups` dan entri `lineup['7500']` (probabilitas rate-up standar 0,75%) pada dataset `char-standard.json` dan `support-standard.json`.
  - Berhasil menyinkronkan banner baru **`Pickup Pretty Derby Gacha: Rose Kingdom [Éclat de Roseraie]`** (Banner ID 30470, periode rilis 18–30 September 2026) beserta kartu rate-up karakter ★3 `Rose Kingdom [Éclat de Roseraie]` ke dalam katalog dan dropdown pilihan banner aplikasi.

### 🎴 Standardisasi Judul & Mode Manual Rate-Up Select Pick Up
- **Format Judul Bersih Berdasarkan Bulan & Tahun**:
  - Menetapkan ketentuan penamaan banner kategori `select_rate_up` menjadi **`Select Pick Up (Mmm YYYY)`** (contoh: `Select Pick Up (Sep 2026)`), menghilangkan penempelan 2 nama kartu acak dari pool kartu pilihan pada judul banner.
  - Menormalisasi seluruh judul banner Select Pick Up historis yang tersimpan di basis data SQLite lokal agar konsisten dan seragam.
- **Buka Kunci Status Read-Only Tombol "UP" (Manual Rate-Up Toggle)**:
  - Membuka status `readOnly` dan `disabled` pada tombol centang `UP` di antarmuka `GachaView.jsx` khusus untuk banner bertipe Select Pick Up.
  - Trainer kini dapat menandai atau membatalkan status `UP` secara manual dan bebas pada form **Single Pull** maupun baris slot **Quick 10-Pull / Batch Pull** sesuai dengan 2 kartu SSR yang dipilih sendiri oleh trainer di dalam game.
  - Mengunci status centang manual agar tidak tertimpa otomatis saat pengguna memilih atau mengetik nama kartu dari autocomplete.
- **Panduan Visual & Penyempurnaan UX**:
  - Menambahkan kartu informasi visual (*Notice Card*) di atas formulir input gacha ketika banner Select Pick Up dipilih: **`Mode Select Pick Up (Pilihan 2 dari 10 SSR) - Manual UP Aktif`**.
  - Menyesuaikan label informasi featured rate-up pada kartu banner aktif di `DashboardView.jsx` menjadi **`Featured Rate-Up (Pilihan 2 dari 10 SSR):`**.

### 🧪 Pengujian Otomatis & Verifikasi Suite (132 Tests / 1.288 Assertions)
- **Ekspansi Suite Pengujian Fitur**:
  - Menambahkan pengujian di `tests/Feature/GachaRateAuditTest.php`:
    - `test_select_pickup_banner_naming_and_manual_rate_up_pull_recording`: Memverifikasi format judul `Select Pick Up (Sep 2026)` dan integritas penyimpanan data tarikan gacha berstatus rate-up manual untuk kartu bebas pilihan trainer.
    - `test_select_pickup_titles_are_normalized_to_month_and_year_only`: Memverifikasi normalisasi judul seluruh banner Select Pick Up pada basis data lokal.
  - Seluruh 132 tests dengan 1.288 assertions lulus 100% tanpa kegagalan (`php artisan test --compact`).

---

## [Versi 2.0.0] - 19 September 2026

### 🛡️ Penguatan Integritas Backup & Restore (Schema Version 2.0)
- **Skema Cadangan Versi 2.0 & Validasi Whitelist Ketat**:
  - Format cadangan data resmi ditingkatkan ke **Schema Version 2.0** (`schema_version: "2.0"`).
  - Validasi whitelist ketat hanya mengizinkan versi terverifikasi: `0.9`, `1.0`, dan `2.0`. Berkas cadangan tanpa versi, versi malformed, atau versi masa depan yang belum didukung otomatis ditolak dengan pesan error yang jelas sebelum proses restorasi dimulai.
- **Proteksi Integritas `base_rate` Non-Nullable**:
  - Atribut `base_rate` pada setiap banner gacha diwajibkan bernilai numerik valid dan tidak boleh `NULL`.
  - Berkas cadangan dengan `base_rate` bernilai null atau hilang otomatis ditolak pada tahap validasi untuk mencegah data probabilitas gacha menjadi korup atau ambigu.
- **Transaksi Atomik & Rollback Riil (Fault-Tolerant)**:
  - Proses restorasi (baik mode `merge` maupun `overwrite`) dieksekusi di dalam transaksi database atomik penuh.
  - Pengujian fault injection membuktikan bahwa kegagalan di tengah proses pemulihan (pada baris atau entitas mana pun) memicu rollback penuh, menjaga database tetap pada kondisi snapshot awal tanpa residu atau data korup.
- **Resolusi Relasi Foreign Key Tanpa Keterikatan ID Keras (Decoupled FK Resolution)**:
  - Resolusi relasi foreign key pada katalog koleksi dan riwayat gacha menggunakan identitas unik (`gametora_id` serta kombinasi nama dan tipe) daripada auto-increment ID mentah, mencegah kegagalan relasi foreign key dan kontaminasi silang (*cross-linking*).
  - Menjamin pemulihan atribut JSON katalog (`details`, `aptitudes`, `skills`) secara utuh tanpa kehilangan data (*lossless restoration*).
- **Penegakan SQLite Foreign Key & Independensi Event Dispatcher**:
  - Memverifikasi penegakan foreign key SQLite secara aktif melalui direct invalid foreign key insert test (`PRAGMA foreign_keys = ON`).
  - Mengisolasi event dispatcher selama proses impor menggunakan clone `Illuminate\Events\Dispatcher` yang terbukti independen, mencegah terhapusnya event listener pada dispatcher aplikasi induk.

### 🎯 Audit & Standardisasi Logika Gacha Rate (Uma Musume JP 2026+)
- **Persistensi Atribut `base_rate` per Banner**:
  - `base_rate` kini tersimpan secara persisten sebagai atribut pada setiap banner di database, bukan dihitung atau ditebak saat pemulihan.
  - Mendukung banner standar dengan base rate 3,00% (`0.0300`: SSR 3,00%, SR 18,00%, R 79,00%) serta banner khusus boosted 4,50% (`0.0450`: SSR 4,50%, SR 18,00%, R 77,50% seperti Anniversary atau debut tertentu).
- **Featured Rate-Up 0,75% per Item**:
  - Memvalidasi secara matematis bahwa setiap kartu atau karakter rate-up memiliki rate tetap 0,75% (`0.0075`) per item, baik pada banner standar 3,00% maupun banner boosted 4,50%.
- **Penyaringan Otomatis Banner Berbayar (Paid-Only Banner Exclusion)**:
  - Banner berbayar dengan atribut `scam_gacha = true` atau `restriction = premium` (termasuk banner garansi 1.500 Paid Carat dan step-up berbayar) otomatis dikecualikan dari sinkronisasi katalog untuk memelihara integritas pelacakan gacha personal.
- **Isolasi Pity Counter & Target Spark 200 Pull**:
  - Rekalkulasi otomatis pity counter per banner dengan kuota spark standar 200 tarikan saat pull ditambahkan, diperbarui, atau dihapus secara massal.

### 🧪 Rangkaian Pengujian Otomatis Komprehensif (130 Tests / 1.280 Assertions)
- **Ekspansi Suite Pengujian**:
  - Suite pengujian bertambah hingga **130 tests** dan **1.280 assertions** (100% lulus) yang berjalan pada basis data memori terisolasi (`:memory:`) tanpa menyentuh basis data produksi.
- **Suite Pengujian Baru**:
  - `tests/Feature/BackupRoundTripTest.php`: Memverifikasi round-trip export-import semantik identik, rollback transaksi saat kegagalan, independensi event dispatcher, penolakan skema tidak valid/tidak dikenal, penegakan foreign key SQLite, serta pembedaan eksplisit antara fixture historis aktual dan fixture sintetis.
  - `tests/Feature/GachaRateAuditTest.php`: Memverifikasi persistensi `base_rate` 3,00% vs 4,50%, kalkulasi rate-up 0,75%, validasi batas nilai rate, penolakan base_rate null, dan eksklusi banner berbayar.

### 📖 Dokumentasi & Sinkronisasi Setup Windows (README.md)
- **Sinkronisasi Tech Stack Terverifikasi**:
  - Memperbarui dokumentasi stack teknis sesuai repository aktual: Laravel Framework 13.31.0, PHP 8.5.10, React 19.3.0, Tailwind CSS 4.3.3, Vite 8.3.0, Node.js v24.21.0, PHPUnit 12.5.35, dan Laravel Pint 1.32.1.
- **Panduan Instalasi Ramah Lingkungan Windows**:
  - Memperbarui panduan instalasi `.env` menggunakan command PowerShell native (`Copy-Item .env.example .env`) dan menghapus perintah Unix (`cp`, `touch`).
  - Menyederhanakan panduan perintah formatting kode menjadi `vendor/bin/pint`.
- **Dokumentasi REST API & CLI Commands**:
  - Memperbarui dokumentasi perintah artisan (`uma:sync-catalog`, `uma:backup`, `uma:restore`) dan tabel referensi REST API endpoints.

### 🔍 Audit Arsitektur & Evaluasi Komponen
- **Audit Read-Only Kode & Dokumentasi**:
  - Melakukan audit arsitektur menyeluruh untuk memastikan tidak ada code bloat atau kompleksitas berlebih pada aplikasi local-first.
- **Evaluasi Komponen `GachaView.jsx`**:
  - Melakukan analisis mendalam terhadap 2.445 baris `GachaView.jsx` dan mengonfirmasi kestabilan arsitektur komponen dengan rekomendasi minimalis (mempertahankan struktur utama dan hanya memisahkan modal presentasional terisolasi jika diperlukan di masa depan).

---

## [Versi 1.9.0] - 17 September 2026

### 🌸 Pohon Skill Evolved & Syarat Upgrade Evolusi (GameTora JP)
- **Badge Teks Evolved**:
  - Mengganti teks badge dari `Evolved ★6` menjadi **`Evolved`** pada `CharacterDetailModal.jsx`.
- **Syarat Upgrade Evolusi Berbahasa Inggris Kanonik**:
  - Mengonversi matriks kondisi `evo_cond` GameTora dan kamus balapan resmi (`races.json`) ke Bahasa Inggris kanonik resmi GameTora (contoh Kitasan Black: *"Win the Arima Kinen twice or Have at least 600 Stamina"* dan *"Get at least 2 skills for Long aptitude"*), menggantikan teks bahasa Jepang mentah sebelumnya.
  - Memperbarui pemisah opsi alternatif antar-syarat menjadi badge **`or`**.

### 🎴 Modal Detail Support Card & Sinkronisasi GameTora 0LB s.d. MLB
- **Matriks Efek 0LB s.d. MLB Lengkap (Level 30 s.d. Level 50)**:
  - Mengimplementasikan algoritma interpolasi efek 51-level GameTora untuk menghitung nilai pasti status kartu pada 0LB (Lv 30/25/20), 1LB, 2LB, 3LB, hingga 4LB/MLB (Lv 50/45/40).
  - Penamaan efek ID 32 kini terlabel resmi sebagai **`Initial Skill Points Up`** (mendukung field `name_en_eon` GameTora).
  - Kolom database `details` (JSON) pada tabel `uma_catalog_items` dan sinkronisasi 559 support card resmi via `php artisan uma:sync-catalog --force`.
- **Pemisah "Randomly either" & "or" pada Pilihan Training Event**:
  - Mendeteksi pembagi acak `{t: 'di'}` pada hadiah pilihan event continuous (seperti pada event pilihan 3 Efforia).
  - Menyajikan hadiah ke dalam grup terpisah dengan header badge `"Randomly either"` dan pembatas horizontal `"or"`.
- **Modal Interaktif Support Card (`SupportCardDetailModal.jsx`)**:
  - **Tab Tabel Efek**: Tabel komparasi nilai efek kartu dari 0LB hingga MLB dengan sorotan kolom limit break aktif milik trainer, badge efek unik, dan formula bonus.
  - **Tab Skill Hints & Event Skills**: Daftar skill hint (dengan level diskon hint) dan skill yang didapat dari event kartu.
  - **Tab Training Events (Continuous Chain)**: Mengambil alur continuous event kartu dari GameTora Next.js props (`_next/data/{buildId}/umamusume/supports/{url_name}.json`) dengan rincian cabang pilihan (Choices) dan reward status/skill (Speed, Stamina, Power, Guts, Wit, Energy, Mood, Bond, Skill Lv).
- **Endpoint API On-Demand**: `GET /api/collection/support-cards/detail` dengan caching otomatis ke basis data lokal.

### 🔍 Modal Zoom Ilustrasi Penuh Karakter (Full Stand Zoom)
- **Klik Avatar Karakter untuk Pratinjau Full Stand**:
  - Mengklik ikon/avatar karakter pada grid koleksi kini membuka modal zoom beresolusi tinggi dengan gambar ilustrasi utuh berdiri (*chara stand illustration*) berlatar backdrop blur.
  - Menampilkan bintang bawaan, bintang saat ini, nama karakter, dan tombol pintas *"Lihat Detail & Pohon Skill"*.

### ✏️ Fitur Edit Riwayat Gacha Pulls & Career Run Logs
- **Edit Riwayat Gacha Pull (`EditGachaPullModal.jsx`)**:
  - Tombol edit (ikon `Pencil`) pada setiap baris tabel riwayat gacha.
  - Modal pengeditan: ubah kategori pool, banner JP 2026, tipe pull, nama item (dengan autocomplete GameTora), rarity, status rate-up, dan tanggal pull.
  - Endpoint `PUT /api/gacha/pulls/{id}` (`UpdateGachaPullRequest`) otomatis memicu rekalkulasi pity counter (`GachaPity::recalculate()`) pada banner lama maupun banner baru.
- **Edit Catatan Career Run (`EditCareerRunModal.jsx`)**:
  - Tombol edit (ikon `Edit3`) pada setiap baris tabel career run.
  - Modal pengeditan: ubah nama Uma Musume (dengan autocomplete), skenario, mode latihan (manual/mandiri), fans gained, skor evaluasi (dengan auto-rank), rank hasil breeding, catatan, dan tanggal run.
  - Menggunakan endpoint `PUT /api/career/runs/{id}` (`UpdateCareerRunRequest`).

### 📚 Penyederhanaan Dokumentasi & Pembersihan Tabel
- **Pembersihan README.md**:
  - Menghapus tabel perbandingan 3.0% vs 4.5% (`## 🎯 Mekanisme Gacha Cygames & Standar Pool Premium 4.5%`).
  - Meringkas seluruh deskripsi fitur aplikasi agar lebih ringkas, padat, dan mudah dipahami.
  - Memperbarui daftar REST API endpoints dan metrik pengujian otomatis (84 test suites, 670 assertions).

---

## [Versi 1.8.0] - 17 September 2026

### 🎲 Gacha Luck Percentile & Binomial Probability Simulator
- **Account Luck Percentile (Distribusi Binomial Kumulatif)**:
  - Modul analisis probabilitas gacha tingkat lanjut menggunakan Cumulative Binomial Distribution $P(X \le k)$ dengan aproksimasi Lanczos `logGamma()` untuk mencegah *integer overflow* pada tarikan besar ($n$).
  - Perhitungan terpisah dan terisolasi antara pool gacha standar ($p = 0.03$ / 3.0%), pool spesial boosted ($p = 0.045$ / 4.5% Anniv, Epiphaneia, Movie Debut), serta komposit gabungan.
  - Visualisasi 5 tingkat keberuntungan akun (Luck Tiers):
    - $\ge 85\%$: **Blessed / Ultra Lucky** (Badge Emas/Pelangi)
    - $60\% - 84\%$: **Above Average / Lucky** (Badge Hijau Emerald)
    - $40\% - 59\%$: **Average / On-Rate** (Badge Biru Langit)
    - $15\% - 39\%$: **Unlucky** (Badge Jingga/Kuning)
    - $< 15\%$: **Cursed / Extreme Salty** (Badge Merah Mawar)
  - Mode sandbox interaktif kustom untuk menguji kombinasi jumlah tarikan ($n$), perolehan SSR ($k$), dan base rate ($p$) bebas.
- **Interactive Pull Chance Simulator**:
  - Konversi otomatis Carats dan Tiket Gacha menjadi total tarikan $N$ ($150 \text{ Carats} = 1 \text{ Pull}$).
  - Pilihan target banner: Rate-Up Karakter/Kartu ($0.75\%$), Sembarang Kartu SSR Standar ($3.0\%$), SSR Boosted ($4.5\%$), atau Custom Target.
  - Perhitungan peluang $P(\ge 1) = 1 - (1 - p)^N$ dan $P(\ge 2)$ dilengkapi visual gauge progress bar dan tabel *Confidence Milestones* (target pull untuk peluang 50%, 80%, 90%, 95%, dan 99%).
  - Tab navigasi terdedikasi pada menu Gacha serta kartu metrik interaktif yang langsung membuka simulator dari ringkasan luck.

### 🌟 Sinkronisasi Detail Karakter: Aptitude & Pohon Skill (GameTora JP)
- **Database & Sync API**:
  - Kolom `aptitudes` dan `skills` berformat JSON ditambahkan ke tabel `uma_catalog_items`.
  - `GameToraSyncService` kini otomatis mengunduh manifest `skills.json` GameTora, menyimpannya dalam cache lokal, dan memetakan 10 aptitude grade serta pohon skill lengkap.
  - Berhasil menyinkronkan data aptitude dan skill lengkap untuk seluruh 267 karakter Uma Musume.
- **Tampilan Badges Aptitude Ringkas di Kartu Koleksi**:
  - Setiap kartu karakter pada daftar koleksi kini menyajikan 10 grade kesesuaian lari:
    - Trek: `Turf: A`, `Dirt: G`
    - Jarak: `Short: G`, `Mile: B`, `Medium: A`, `Long: A`
    - Gaya Lari: `Runner: A`, `Leader: B`, `Betweener: C`, `Chaser: G`
  - Pewarnaan grade resmi kanonik Uma Musume (S: Fuchsia, A: Emerald, B: Sky, C: Amber, D: Slate, E-G: Rose).
  - Avatar dan nama karakter dapat diklik langsung untuk membuka modal detail.
- **Modal Interaktif Detail & Pohon Skill Karakter (`CharacterDetailModal`)**:
  - Tab **Pohon Skill**: Skill Unik Emas bawaan (beserta deskripsi & syarat aktivasi), Skill Innate, Skill Awakening Lv 2–5, dan Skill Evolusi eksklusif server Jepang beserta penanda skill yang digantikan (*Replaces*).
  - Tab **Kesesuaian Lari**: Grid visual kesesuaian trek, jarak, dan taktik beserta panduan penalti statistik dan anjuran inheritance/warisan genetik.

### 🥕 Ikon PWA Wortel (Carrot Icon)
- Memperbarui seluruh ikon PWA (`pwa-512x512.png`, `pwa-192x192.png`, dan `favicon.ico`) menjadi ikon wortel khas Uma Musume beresolusi tinggi dengan squircle emerald, border emas, sayap dedaunan hijau, bayangan realistis, dan kilauan bintang.

---

## [Versi 1.7.1] - 17 September 2026

### 🔍 Peningkatan OCR Screenshot Import (Auto-Fill Form) & Perbaikan Tampilan Dark Mode
- **Pembacaan Skenario Otomatis (EN / ID / JP)**:
  - Deteksi skenario latihan kini mengenali nama skenario dalam bahasa Inggris, Indonesia, maupun Jepang (seperti: *Make a new track!! ~Pembukaan Seri Climax~* / *～クライマックス開幕～*, *URA Finals*, *Aoharu Hai*, *Grand Live*, *Grand Masters*, *Project L'Arc*, *U.A.F. Ready GO!*, *Great Food Festival / 大豊食祭*, *Mecha Uma Musume / メカウマ娘*, *The Twinkle Legends*, *Beyond Dreams*, *Tracen-ken*, *Yukoma Onsen*, *Design Your Island*).
  - Mengisi otomatis pilihan dropdown skenario pada form pencatatan fans dan menampilkan badge indikator skenario hasil deteksi.
- **Deteksi Rating Skor Evaluasi yang Lebih Akurat**:
  - Memperluas jangkauan skor evaluasi dari 1.000 hingga 99.999 (misal skor 7.750 pada layar Detail Umamusume).
  - Menyaring dan mengabaikan poin skill berakhiran `pt` (misal 2.483pt) serta angka balapan agar tidak tertukar dengan skor evaluasi.
  - Perhitungan rank otomatis dari skor evaluasi (autorank) mencegah false positive dari huruf grade aptitude (misal Turf A, Dirt S, Speed A) sehingga rank karakter terbaca sesuai evaluasi sebenarnya (misal Rank B untuk skor 7.750).
- **Pengenalan Nama Karakter Bilingual (Inggris & Jepang) & Judul Kostum**:
  - Mendukung pengenalan nama karakter baik dalam alfabet Inggris (*Oguri Cap*, *Special Week*) maupun huruf Jepang/Katakana (*オグリキャップ*, *スペシャルウィーク*).
  - Mendukung pengenalan judul kostum dalam tanda kurung siku `[...]` atau `「...」` (misal `[Starlight Beat]`, `[スターライトビート]`, `[Ashen Miracle]`, `[キセキの白星]`) dan memetakannya langsung ke karakter yang sesuai.
  - Backend API metadata kini menyertakan `uma_ocr_map` dengan 800+ pasangan nama & kostum EN-JP untuk akurasi OCR maksimal.
- **Perbaikan Kontras Badge Fans Gained pada Dark Mode**:
  - Memperbaiki class typo `dark:teal-950` menjadi `dark:bg-teal-950` dengan border penegas `dark:border-teal-800/60` dan teks `dark:text-teal-300`, sehingga angka penambahan fans (misal `+812.531 Fans`) tampil kontras, tajam, dan jelas terbaca pada dark mode.
- **Prapemrosesan Gambar Berbasis Canvas**:
  - Mengimplementasikan prapemrosesan canvas (kontras adaptif dan upscaling) sebelum pemindaian Tesseract untuk mempertajam tepian teks pada tangkapan layar desktop maupun ponsel.

### 📱 Perbaikan Konfigurasi PWA (Progressive Web App) & Mengatasi Error 404 /build/
- **Kalibrasi Root `start_url` dan `scope`**:
  - Memperbaiki konfigurasi `VitePWA` pada `vite.config.js` dengan menyetel `start_url: '/'`, `scope: '/'`, dan `id: '/'`.
  - Mengatasi masalah ketika PWA diinstal di Microsoft Edge/Chrome, di mana aplikasi sebelumnya mencoba membuka `http://127.0.0.1:8000/build/` dan menghasilkan pesan error `404 Not Found: The requested resource /build/ was not found on this server`.
- **Registrasi Service Worker Global & Header Izin Scope**:
  - Menambahkan endpoint `/sw.js` dan `/build/sw.js` pada `routes/web.php` yang menyertakan header resmi `Service-Worker-Allowed: /` sehingga Service Worker memiliki hak mengontrol seluruh halaman aplikasi.
  - Mendaftarkan Service Worker secara otomatis melalui `virtual:pwa-register` pada `resources/js/app.jsx` dengan mode `autoUpdate`.
- **Fallback Otomatis Permintaan `/build/`**:
  - Menambahkan plugin build Vite (`pwa-build-fallback`) yang otomatis menghasilkan `public/build/index.php` untuk mengalihkan (HTTP 302 Redirect) setiap permintaan yang mengarah ke direktori `/build/` kembali ke halaman utama `/`.
  - Menambahkan rute fallback `/build` pada Laravel agar instalasi PWA sebelumnya langsung teralihkan secara mulus tanpa error.
- **Pengujian PWA Komprehensif**:
  - Menambahkan test suite `PwaTest.php` (6 pengujian baru) untuk memverifikasi struktur manifest, ketersediaan ikon, header service worker, dan redirect fallback.

## [Versi 1.7.0] - 17 September 2026

### 🖼️ Visualisasi Gambar Koleksi & Sinkronisasi Gambar GameTora JP
- **Gambar Karakter Uma Musume**:
  - Setiap item karakter pada katalog koleksi kini menampilkan foto thumbnail karakter resmi beresolusi tinggi yang terhubung langsung dengan GameTora server Jepang: `https://gametora.com/images/umamusume/characters/thumb/chara_stand_{char_id}_{card_id}.png`.
  - Dilengkapi lazy loading, fallback otomatis ke ikon `User` bila gambar gagal dimuat, serta frame avatar bundar dengan indikator bintang dinamis.
- **Gambar Penuh Kartu Bantuan (Support Card) Tanpa Terpotong**:
  - Mengganti thumbnail icon crop persegi dengan **ilustrasi kartu vertikal penuh resmi beresolusi tinggi (Full Art)**:
    - Resolusi standar kartu: `https://media.gametora.com/umamusume/supports/full/small/{support_id}.png` (300x400, aspect ratio 3:4).
    - Resolusi ultra-tinggi original: `https://media.gametora.com/umamusume/supports/full/{support_id}.png` (1536x2048).
  - Tampilan kartu pada daftar koleksi kini mempertahankan proporsi 3:4 penuh tanpa terpotong (menampilkan keseluruhan karakter pendukung dan latar belakang adegan seperti Zenno Rob Roy bersama Rice Shower & Haru Urara di gua berkilau atau gaun pesta Blast Onepiece).
  - **Modal Pratinjau Ilustrasi Penuh (Full Card Art Modal)**: Mengklik gambar kartu kini membuka modal pratinjau resolusi tinggi untuk menikmati artwork kartu secara utuh beserta informasi karakter, tipe kartu, dan tingkat kelangkaan.
  - Fallback cerdas: Jika ilustrasi penuh belum termuat atau terkendala koneksi, sistem otomatis melakukan fallback ke ikon in-game square resmi.
- **Sinkronisasi Otomatis Gambar GameTora**:
  - `GameToraSyncService` dan `CollectionController` kini otomatis menyelesaikan URL gambar kartu bantuan ke CDN media resolusi penuh (`image_url`, `image_full`, `thumb`).
  - Seluruh 559 support card yang tersimpan pada katalog basis data telah diperbarui ke URL ilustrasi penuh.

### 💎 Perombakan Jewel & Spark Planner: Tiket Gacha & Toko Bulanan (Friendship & Cleat Shop)
- **Spesialisasi Saldo Tiket Gacha**:
  - Menghapus input generik *Single Ticket (1x)* dan *10-Pull Ticket (10x)* dari panel Saldo Aset Saat Ini.
  - Menggantinya dengan dua jenis tiket gacha terpisah sesuai server JP: **Tiket Gacha Karakter** (`character_tickets`) dan **Tiket Gacha Support Card** (`support_tickets`).
- **Pemisahan Target Banner Gacha (Karakter vs Support Card)**:
  - Menambahkan selektor target banner: **Banner Karakter** (🏇) vs **Banner Support Card** (🃏).
  - Kapasitas spark dan jumlah tarikan aktif dihitung secara akurat: tiket karakter hanya digunakan saat menarget banner karakter, sedangkan tiket support hanya digunakan saat menarget banner support card.
- **Akordion Baru: B. Tiket Toko Bulanan (Friendship & Cleat / Horseshoe Shop)**:
  - **Friendship Point Shop (フレンドPtショップ)**: Penukaran 1 Tiket Karakter dan 1 Tiket Support Card per bulan seharga masing-masing 20.000 FP (total 40.000 FP/bulan).
  - **Silver Horseshoe Shop (銀の蹄鉄)**: Penukaran 2 Tiket Karakter dan 2 Tiket Support Card per bulan dari daur ulang kartu R/SR.
  - **Gold Horseshoe Shop (金の蹄鉄)**: Penukaran 2 Tiket Karakter dan 2 Tiket Support Card per bulan dari daur ulang kartu SR.
  - **Rainbow Horseshoe Shop (虹の蹄鉄) [Opsional]**: Penukaran 2 Tiket Karakter dan 2 Tiket Support Card per bulan dari pelepasan kartu SSR gacha (dengan label opsional dan peringatan bahwa kartu SSR sangat berharga).
- **Proyeksi Tarikan Komprehensif**:
  - Menampilkan perbandingan berapa pull yang dapat dilakukan dari aset saat ini saja vs total pull dengan tambahan prediksi planner hingga tanggal target.
- **Pengujian & Backend**:
  - Menambahkan pengujian otomatis `PlannerApiTest.php` (73 tests passed, 585 assertions).
  - Validasi dan konfigurasi tersimpan persisten di basis data (`AppSetting`).

---

## [Versi 1.6.0] - 17 September 2026

### 🌸 Modul Koleksi Karakter & Support Card (Server JP)
- **Koleksi Karakter (Uma Musume)**:
  - Menambahkan antarmuka katalog koleksi karakter Uma Musume lengkap yang terhubung dengan basis data GameTora server Jepang.
  - **Tanda Kepemilikan Interaktif**: Memilih dan menandai karakter yang telah dimiliki atau belum dimiliki ke dalam akun.
  - **Kustomisasi Bintang (Star Rating) dengan Validasi Ketat**:
    - Bintang karakter dapat ditingkatkan hingga **5★** (maksimal).
    - **Proteksi Bintang Minimum**: Bintang karakter **tidak dapat diturunkan di bawah bintang bawaannya** (contoh: *Epiphaneia*, *Silence Suzuka*, dan *Tokai Teio* yang merupakan karakter bawaan 3★ hanya dapat diatur ke 3★, 4★, atau 5★; pilihan 1★ dan 2★ terkunci dan ditolak validasi baik di frontend maupun backend).
    - Tombol cepat *"Miliki Semua 1★ & 2★"* untuk menandai otomatis seluruh karakter umum bintang 1★ dan 2★ ke dalam koleksi.
  - Ringkasan statistik kepemilikan dan kelengkapan: Total Dimiliki, Persentase Kelengkapan, dan rincian jumlah karakter 5★, 4★, 3★, 2★, dan 1★.

- **Koleksi Support Card**:
  - Menghadirkan katalog kartu bantuan (Support Cards) dengan filter rarity lengkap (**SSR**, **SR**, **R**) serta tipe kartu (*Speed*, *Stamina*, *Power*, *Guts*, *Wit/Intelligence*, *Friend*, *Group*).
  - **Kustomisasi Limit Break (LB) Interaktif**:
    - Menggunakan visual kristal diamond interaktif (0LB, 1LB, 2LB, 3LB, hingga 4LB / MLB).
    - Visual khusus efek glow emas/pelangi saat mencapai **4LB (MLB - Max Limit Break)**.
  - Ringkasan statistik kartu bantuan: Total Kartu Dimiliki, Jumlah MLB, rincian SSR, SR, R, dan distribusi per tipe kartu.

- **Sinkronisasi Otomatis GameTora JP**:
  - Tombol sinkronisasi langsung *"Sinkronkan GameTora JP"* di bagian atas halaman Koleksi dengan indikator status real-time, memastikan daftar karakter varian kostum baru dan kartu bantuan selalu mutakhir sesuai perilisan server Jepang.

- **Integrasi Penuh Backup & Restore**:
  - Tabel `user_characters` dan `user_support_cards` kini otomatis disertakan dalam proses ekspor-impor cadangan data (`BackupService`), mencegah hilangnya konfigurasi koleksi saat berpindah perangkat.

---

### 🌙 Perbaikan Kontras Tooltip Dark Mode Analytics
- **Grafik Pity Intervals (Interval Tarikan per Kartu SSR)**:
  - Mengganti Recharts tooltip bawaan dengan komponen custom `CustomPityTooltip` yang responsif mode gelap (`bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700`).
  - Teks informasi jarak tarikan, nama kartu, badge *Rate Up*, serta indikator hoki/pity kini tampil tajam dengan kontras tinggi (`text-slate-900 dark:text-white`).
- **Komponen Tooltip Lainnya di Analytics**:
  - Menerapkan custom tooltip terstandardisasi untuk *Rarity Breakdown Donut Chart* (`CustomDonutTooltip`), *Scenario Performance* (`CustomScenarioTooltip`), dan *Akumulasi Fans Harian* (`CustomCumulativeFansTooltip`).

---

## [Versi 1.5.1] - 17 September 2026

### 💎 Kalibrasi & Akurasi Jewel & Spark Planner (Server JP)
- **Opsi Training Pass Berjenjang**:
  - Penambahan opsi **Free Training Pass** (+500 Carat / bulan) pada bagian Rutinitas F2P bulanan.
  - Rekalibrasi **Premium Training Pass**: Disesuaikan dengan nilai in-game resmi server JP yaitu +1.700 Carat (350 Paid + 1.350 Free) serta 4 Tiket Gacha (2 Karakter + 2 Kartu Support) per bulan. Kombinasi Free + Premium Pass memberikan total 2.200 Carat dan 4 Tiket Gacha setiap bulannya.
- **Pilihan Reward Turnamen Komprehensif (CM & LoH)**:
  - **Champions Meeting**: Penambahan opsi penempatan Final Grup B Juara 2 (900 Carat) dan Juara 3 (700 Carat) melengkapi pilihan Juara 1 Grup A/B.
  - **League of Heroes (LoH)**: Penambahan opsi 12 tier lengkap (Silver 1–4, Gold 1–4, dan Platinum 1–4) dengan akumulasi Carat dan Tiket Gacha yang presisi sesuai distribusi reward in-game JP. Seluruh opsi dirapikan dalam `<optgroup>` agar mudah dipilih.
- **Rekalibrasi Nilai Event PvE Bulanan & PakaLive**:
  - Menghapus event *Masters Challenge* dari daftar pendapatan rutin bulanan karena bukan merupakan event bulanan berkala (hanya hadir per beberapa bulan sekali).
  - Mengkalibrasi nilai reward event PvE agar lebih realistis dan mencegah over-estimasi: Story Event (1.000 Carat), Legend Race (150 Carat), dan G1 Commemorative Campaign (~300 Carat/bulan).

### 📊 Integrasi Visualisasi Analytics ke Dashboard
- **Grafik Tren Akumulasi Fans Harian vs Target Kuota Circle**:
  - Menggantikan grafik lama *"Career Fan Gain Activity"* pada halaman Dashboard dengan visualisasi area interaktif dari menu Analytics.
  - Dilengkapi pemilih rentang waktu dinamis (*Bulan Berjalan*, *30 Hari Terakhir*, *7 Hari Terakhir*).
  - Menampilkan garis panduan target kuota circle oranye putus-putus (`ReferenceLine`) untuk memudahkan pemantauan progres kuota bulanan langsung dari ringkasan utama.

### 🎨 Peningkatan Kontras & Keterbacaan Dark Mode
- **Circle Club**: Penajaman warna teks dan kontras badge pada baris akun yang sedang dipantau ("Akun Saya" / "Terpilih"), deltas harian/mingguan, ID pemain (viewer ID), dan total fans pada mode gelap.
- **Quick 10-Pull Modal**: Memperbaiki kontras latar belakang modal (mengganti kelas non-standar `slate-850` menjadi `slate-800/80` dan `slate-900`), penajaman kontras header, chips featured rate-up, kartu SSR detail, dan teks catatan footer.
- **Gacha Tracker**: Peningkatan kontras teks tombol preset tarikan (`1 SSR + 1 SR` dan `2 SSR (Jackpot)`), chips featured rate-up, serta teks keterangan banner saat tema gelap aktif.
- **Career Run Multi-Delete Selection**: Penyesuaian skema warna baris terseleksi saat memilih riwayat karier yang akan dihapus (`bg-rose-50/80 dark:bg-rose-950/50 border-l-4 border-rose-500`) dengan teks kontras tinggi untuk tanggal, nama karakter, skenario, skor rating, dan fans gained.

### 🐛 Perbaikan Bug & Stabilitas
- **Jewel & Spark Planner Crash Fix**: Memperbaiki runtime exception `ReferenceError: Target is not defined` saat membuka tab Jewel Planner dengan melengkapi impor ikon `Target` dari `lucide-react`.

## [Versi 1.5.0] - 17 September 2026

### 🎯 Daily Circle Pace & Run Estimator (Circle Manager)
- **Pemantauan Ritme Grinding Fans Harian Terintegrasi**:
  - Membangun sistem estimasi ritme harian berbasis beban kuota bulanan circle (`monthly_circle_target`, default: 30.000.000 fans) di `app/Services/CircleTrackerService.php` dan `CircleTrackerController.php`.
  - **Kalkulasi Metrik Dinamis Real-Time**:
    - `remaining_fans`: Sisa kuota fans yang harus dikejar bulan ini.
    - `days_remaining`: Sisa hari kalender bulan berjalan.
    - `required_daily_pace`: Kebutuhan rata-rata fans per hari untuk mencapai kuota tepat waktu.
    - `current_daily_pace`: Rata-rata perolehan fans riil harian trainer sejak tanggal 1 bulan berjalan.
    - `avg_fans_per_run`: Rata-rata fans riil per run dari riwayat `CareerRun` 30 hari terakhir (default fallback: 450.000 fans).
    - `estimated_runs_per_day`: Estimasi beban jumlah run pelatihan yang harus diselesaikan tiap hari (`ceil(required_daily_pace / avg_fans_per_run)`).
    - **Status Ritme Adaptif**:
      - `Ahead of Pace` (Hijau): Ritme harian melampaui target atau kuota telah terpenuhi 100%.
      - `On Track` (Kuning): Ritme harian stabil di atas 85% kebutuhan ritme.
      - `Behind Schedule` (Merah): Ritme berada di bawah 85%, perlu meningkatkan frekuensi pelatihan.
- **Komponen Visual Widget (`CirclePaceWidget.jsx`)**:
  - Ditempatkan secara serasi di halaman **Circle Club** dan **Dashboard** utama.
  - Progress bar bulanan interaktif dengan kemampuan ubah target kuota instan (inline edit).
  - Kotak metrik utama bernuansa hero: *"Target: X Run / Hari"*, rincian rata-rata fans, dan 4 kartu metrik komprehensif.

### 💎 Advanced Jewel & Spark Planner (Khusus Server Jepang / JP Server)
- **Kalkulator Budgeting Gacha Resmi Khusus JP Server**:
  - Mengadopsi formula, jadwal, dan nilai reward murni dari server Jepang (berdasarkan referensi Gamewith, Kamigame, Game8, Wikiru) tanpa distorsi jadwal Global.
  - **Input Saldo Aset**: Free Carat, Paid Carat, Tiket Single (1x), dan Tiket 10-Pull (10x).
  - **Target Tanggal & Pilihan Spark**: Date picker target tanggal banner impian dengan pilihan target spark 0.5x (100 pulls), 1x (200 pulls / 30.000 Carat), dan 2x (400 pulls / 60.000 Carat).
  - **Konfigurasi Pendapatan Rutin Server JP (Accordion)**:
    - *Rutinitas F2P*: Daily Missions (30/hari), Login Bonus siklus 8 hari (~13,75/hari), dan Team Stadium mingguan (Class 1–6: Class 6 = 250/mgg).
    - *Hadiah Kompetitif*: Circle Ranking (Rank S 2000, A+ 1200, A 1000, B+ 800, B 600 cair tiap tgl 1), Champions Meeting Group A/B & LoH Platinum.
    - *Event PvE Berulang*: Story Event (1500), Masters Challenge (1200), Legend Race (450), G1 Commemorative Bonus (150/mgg), siaran PakaLive TV Live Stream Gift (1500).
    - *Langganan Berbayar*: Daily Jewel Pack (500 Paid + 50 Free/hari) dan Trainer Pass (+500 + tiket).
  - **Output Kalkulasi Interaktif**:
    - *Total Pull Capacity*: Kapasitas total tarikan gabungan Carat dan Tiket.
    - *Spark Readiness Bar*: Persentase kesiapan menuju spark, status *"✨ SPARK GUARANTEED!"* atau *"⚠️ DEFISIT X PULL"*, serta kalkulasi beban harian *"Sisa X Carat / hari"*.
  - **Persistensi State ke Database**:
    - Terhubung ke endpoint API `GET /api/planner/config` dan `POST /api/planner/config` (`PlannerController.php`), tersimpan aman di tabel `app_settings` dan otomatis ter-backup pada fitur Backup & Restore.

### 📷 OCR Screenshot Import untuk Career Run (Auto-Fill Form)
- **Ekstraksi Hasil Pelatihan Berbasis Client-Side OCR (`tesseract.js`)**:
  - Memproses screenshot hasil akhir training langsung di peramban pengguna tanpa membebani server backend.
  - **Dukungan Clipboard Paste (`Ctrl + V`) & Drag-and-Drop**:
    - Pengguna cukup menekan pintasan screenshot Windows (`Win + Shift + S`) di layar evaluasi karier, lalu menekan `Ctrl + V` langsung di halaman Career Run.
    - Mendukung unggah berkas manual via drag-and-drop atau klik pemilih berkas.
  - **Parser Cerdas Berbasis Heuristik & Regex**:
    - Deteksi Final Rank tier resmi: LG, US, UA, UB, UC, UD, UE, UF, UG, SS+, SS, S+, S, A+, A, dst.
    - Deteksi Skor Evaluasi / Rating Points (5–6 digit).
    - Deteksi Perolehan Fans Gained (100.000 – 2.500.000+).
    - Pencocokan nama karakter Uma Musume secara cerdas terhadap ribuan entri katalog GameTora (`metadata.uma_presets`).
  - **Pengisian Form Otomatis (Auto-Fill)**:
    - Mengisi field nama, fans gained, skor evaluasi, dan auto-select rank secara otomatis dengan indikator progres pemindaian real-time.

### 📱 PWA (Progressive Web App) & Mobile Optimization
- **Instalasi PWA Penuh (`vite-plugin-pwa`)**:
  - Konfigurasi Web App Manifest di `vite.config.js` (`name: 'Uma Musume Companion'`, `short_name: 'UmaTracker'`, `theme_color: '#10b981'`, `display: 'standalone'`).
  - Service worker caching otomatis untuk kinerja offline dan pemuatan cepat.
  - Asset ikon resmi PWA resolusi tinggi (`pwa-192x192.png` dan `pwa-512x512.png`).
  - Meta tags PWA lengkap pada layout Blade (`app.blade.php`).
- **Sticky Bottom Navigation Bar (`MobileBottomNav.jsx`)**:
  - Bilah navigasi bawah tetap khusus layar ponsel (`sm:hidden`) dengan 5 tombol utama: **Dashboard**, **Career**, **Gacha**, **Circle**, dan **Planner**.
  - Touch target ramah sentuhan (&ge; 48px) dioptimalkan untuk pengoperasian satu tangan (*one-handed thumb navigation*).
  - Penyesuaian padding bawah dinamis (`pb-24 sm:pb-8`) dan `overflow-x-hidden` pada `<main>` untuk mencegah konten tertutup navigasi serta meniadakan scrollbar horizontal pada ponsel berlayar sempit (320px–390px).

## [Versi 1.4.0] - 17 September 2026

### ⚡ Quick 10-Pull Input Modal (Gacha Tracker)
- **Dialog Modal Input Cepat 10x Tarikan**:
  - Menambahkan tombol interaktif **"⚡ Quick 10-Pull"** di halaman Gacha Tracker yang membuka dialog modal terdedikasi untuk mencatat hasil tarikan 10x secara instan tanpa perlu mengisi form slot satu per satu.
  - **Header Seleksi**: Terintegrasi langsung dengan pemilihan Banner JP 2026 aktif dan pemilih tanggal tarikan (*Pull Date*).
  - **Stepper & Counter Cepat (R, SR, SSR)**: Tombol stepper `+` dan `-` yang responsif untuk menentukan kuota tiap kelangkaan dengan validasi *live* otomatis yang mengunci submit hingga total kartu pas berjumlah 10 (`R + SR + SSR === 10`).
  - **Preset Cepat Populer**: Tombol preset 1-klik untuk skenario umum: *9R + 1SR* (Minimal Garansi), *8R + 1SR + 1SSR* (1 SSR Hoki), *7R + 1SR + 2SSR* (Double Jackpot!), dan *All R* (10 R).
  - **Detail Kartu SSR Dinamis**: Untuk setiap SSR yang ditambahkan pada counter, form secara dinamis memunculkan baris input khusus:
    - Dropdown/combobox autocomplete untuk nama karakter/kartu bersumber dari katalog GameTora JP (`UmaCatalogItem`).
    - Chip 1-klik untuk memilih karakter/kartu *Rate-Up* dari banner aktif secara instan.
    - Sakelar toggle switch *Rate-Up Hit* (`is_rate_up`).
  - **Kartu SR & R Instan**: Otomatis diberi penamaan default generik (*Generic SR Support/Uma* dan *Generic R Support/Uma*) sehingga pengguna tidak terbebani mengisi nama kartu sampah.
  - **Penyimpanan Batch & Sinkronisasi Pity**: Terhubung langsung ke endpoint `/api/gacha/pulls/batch`, otomatis memperbarui counter pity banner terkait, dan menyegarkan tabel riwayat tarikan secara instan.

### 📊 Visualisasi Data & Dashboard Analytics Interaktif (Recharts)
- **Tab Navigasi Baru "Analytics"**:
  - Menambahkan item menu **Analytics** (`BarChart3`) pada top navigasi bar desktop dan mobile dengan filter seksi tampilan (*Semua Analytics*, *Career & Fans*, *Gacha Luck*).
- **Career & Fans Gain Analytics**:
  - **Line Chart Akumulasi Fans Harian**: Memvisualisasikan kurva pertumbuhan akumulasi fans per hari sepanjang bulan berjalan dilengkapi garis referensi target kuota Circle Club (`monthly_circle_target`).
  - **Filter Rentang Waktu Interaktif**: Sakelar filter 3 mode: *Bulan Ini (Default)*, *30 Hari Terakhir*, dan *7 Hari Terakhir*.
  - **Bar Chart Performa Skenario Pelatihan**: Membandingkan rata-rata perolehan fans (`fans_gained`) lintas skenario pelatihan (*The Twinkle Legends*, *Mecha Uma Musume*, *Great Food Festival*, dst.) dengan gradien warna tematik dan garis benchmark target kuota circle.
- **Gacha Luck & Pity Analytics**:
  - **Donut/Pie Chart Distribusi Kelangkaan (Rarity Distribution)**: Memvisualisasikan persentase perolehan SSR, SR, dan R aktual dibandingkan dengan patokan resmi Cygames (*Official Baseline* 3.0% standar / 4.5% premium), lengkap dengan metrik *SSR Rate* di tengah donut dan indikator deviasi hoki (*Luck Delta*).
  - **Bar Chart Interval Pity (Pity Intervals)**: Menampilkan jumlah tarikan yang dibutuhkan untuk memperoleh setiap kartu SSR berurutan (*SSR #1*, *SSR #2*, dst.) dengan garis batas rata-rata ekspektasi ~33.3 tarikan serta pembedaan visual warna hijau (hoki &le; 33 pull) vs oranye (pity &gt; 33 pull).

### 🔍 Penyaringan Lanjutan, Paginasi Dinamis & Hapus Massal (Bulk Delete)
- **Toolbar Filter Multi-Kriteria untuk Riwayat Karir (Career Run Logs)**:
  - Filter rentang tanggal fleksibel (`date_from` dan `date_to`).
  - Filter skenario pelatihan (*All Scenarios* atau skenario spesifik).
  - Filter batas peringkat evaluasi (`rank_min` dan `rank_max`) yang didukung konversi ambang batas skor resmi.
  - Filter jenis mode latihan (*Semua Mode*, *Manual*, atau *Mandiri 自主練*).
  - Kolom pencarian teks instan nama Uma Musume atau catatan strategi.
  - Tombol **"Reset"** 1-klik untuk mengembalikan seluruh filter ke kondisi default.
- **Toolbar Filter Multi-Kriteria untuk Riwayat Gacha (Gacha Pull Logs)**:
  - Filter rentang tanggal (`date_from` dan `date_to`).
  - Filter banner spesifik JP 2026 (`gacha_banner_id`).
  - Filter pool (*Karakter* atau *Support Card*).
  - Filter kelangkaan (*SSR*, *SR*, *R*).
  - Filter status Rate-Up (*Semua*, *Hanya Rate-Up*, *Non Rate-Up*).
  - Kolom pencarian nama karakter/kartu atau catatan.
  - Tombol **"Reset"** 1-klik.
- **Paginasi Dinamis Fleksibel**:
  - Dropdown pemilih jumlah entri per halaman: **10**, **25**, atau **50** entri per halaman pada tabel Career dan Gacha.
  - Indikator informatif: *Menampilkan X-Y dari Z entri (Hal C dari L)* dilengkapi tombol navigasi *Prev* dan *Next*.
- **Seleksi Massal (Bulk Selection) & Action Bar**:
  - Checkbox *Select All* pada header tabel untuk memilih seluruh baris di halaman aktif secara simultan.
  - Checkbox independen pada setiap baris data untuk seleksi kustom.
  - Banner peringatan *Bulk Actions Alert Bar* bernuansa rose yang muncul dinamis saat ada data terpilih, menampilkan jumlah data terseleksi, tombol *Batal*, dan tombol *Hapus Data Terpilih*.
- **Modal Konfirmasi Penghapusan Terpadu (`DeleteConfirmModal`)**:
  - Menghilangkan `window.confirm` bawaan peramban dan menggantinya dengan dialog modal modern Tailwind CSS dengan animasi fade-in, ikon peringatan bahaya, dan rincian jumlah data yang akan dihapus.
  - Beroperasi dalam 2 mode: mode penghapusan tunggal (*single delete*) dan mode penghapusan massal (*bulk delete*).
- **Endpoint Backend Hapus Massal & Rekalkulasi Pity Otomatis**:
  - `POST /api/career/bulk-delete`: Menghapus sekumpulan ID `career_runs` sekaligus secara aman dan tervalidasi (`BulkDeleteRequest`).
  - `POST /api/gacha/bulk-delete`: Menghapus sekumpulan ID `gacha_pulls` dan secara otomatis memicu `GachaPity::recalculate()` pada setiap pasangan `(banner_type, gacha_banner_id)` yang terpengaruh, sehingga nomor urut pity dan poin spark aktif tetap 100% konsisten dan akurat secara kronologis.

### 🧪 Pengujian Otomatis & Standar Kode
- Menambahkan 6 feature test baru di `tests/Feature/UmaTrackerApiTest.php` mencakup penyaringan riwayat karir, paginasi dinamis, bulk delete karir, penyaringan gacha, bulk delete gacha beserta rekalkulasi pity, dan endpoint statistik analitik harian.
- Seluruh 48 feature test suite berhasil lulus 100% (395 assertions).
- Kode PHP terformat rapi sesuai standar resmi Laravel Pint.
- Bundel frontend terkompilasi optimal menggunakan Vite.

---

## [Versi 1.3.1] - 16 September 2026

### 🛡️ Validasi Wajib Pemilihan Banner JP 2026 pada Gacha Pull
- **Pencegahan Tarikan Tanpa Banner (*Unassigned Pulls*)**:
  - Mewajibkan pemilihan banner JP 2026 yang valid pada form pencatatan tarikan gacha single (`/api/gacha/pulls`) maupun batch multi/tiket (`/api/gacha/pulls/batch`).
  - Menghilangkan opsi default bebas banner (*-- Tanpa Banner Khusus / Custom --*) dan menggantinya dengan pilihan `-- Pilih Banner JP 2026 (Wajib) --`.
  - Menambahkan proteksi validasi backend HTTP 422 (`StoreGachaPullRequest` dan `BatchGachaPullRequest`) dengan pesan error ramah pengguna: *"Kolom Banner JP 2026 wajib dipilih. Tarikan tanpa banner tidak dapat diinput."*.
  - Menambahkan visual error highlight pada form frontend (`GachaView.jsx`): border merah menyala, latar lembut kemerahan, peringatan `* Wajib dipilih`, serta notifikasi toast interaktif yang menghentikan form submit jika banner belum ditentukan.
  - Memperbaiki pengujian otomatis (*feature tests*) pity tracker agar selalu menargetkan `GachaPity` dari banner ID spesifik yang dipilih.

### 🌓 Penyempurnaan Tampilan Mode Gelap (Dark Mode) di Dashboard
- **Kontras Teks Rentang Tanggal Banner**:
  - Memperbaiki warna teks periode aktif banner (`YYYY-MM-DD s/d YYYY-MM-DD`) pada kartu banner gacha dashboard di mode gelap menjadi font semibold cerah berbobot kontras tinggi (`text-slate-600 dark:text-slate-200`) dilengkapi ikon kalender beraksen amber.
- **Kontras Header Featured Rate-Up**:
  - Mengubah label `Featured Rate-Up:` yang sebelumnya redup di dark mode menjadi teks tebal bernuansa emas/amber cerah (`text-slate-600 dark:text-amber-300`) disertai ikon kilau `Sparkles`, menghasilkan keterbacaan yang tajam dan nyaman dipandang.

---

## [Versi 1.3.0] - 16 September 2026

### 📅 Penyempurnaan Banner Gacha Berlangsung Hari Ini di Dashboard
- **Filter Roadmap Server Jepang (JP) Rilis 2026 yang Akurat**:
  - Menyaring dan hanya menampilkan banner gacha resmi yang sedang aktif pada hari ini berdasarkan roadmap resmi server Jepang rilis 2026 (*Anniversary*, *Scenario Release*, *Twinkle Collection*, *Select Pick Up*, dan *Standard Gacha* resmi).
  - Menghapus banner placeholder dummy tanpa item pickup (*Pretty Derby Gacha: Pickup Character* dan *Support Card Gacha: Pickup Support Card*).
  - Memperbaiki data tanggal berakhir banner gacha agar akurat sesuai jadwal rilis server Jepang (memperbaiki banner 5.5th Anniv Epiphaneia berakhir pada 26 September 2026 dan banner Februari tidak tercatat hingga 2050).
  - Untuk tanggal hari ini (16 September 2026), 5 banner aktif yang disajikan adalah:
    1. **5.5th Anniv. Premium Pretty Derby Gacha (Epiphaneia)** (Rate 4.5%, 24 Agu – 26 Sep 2026, Pickup: *Epiphaneia [Fate's Chosen Star]*). Menghapus Cesario dari banner ini agar murni solo pickup Epiphaneia sesuai data resmi GameTora.
    2. **Pickup Pretty Derby Gacha: Phalaenopsis [Noble Fleur]** (Rate 3.0%, 11 Sep – 18 Sep 2026, Pickup: *Phalaenopsis [Noble Fleur]* dengan translasi nama epithet resmi Bahasa Inggris dari *絶佳の暁闇*).
    3. **The Twinkle Collection Pretty Derby Gacha (Sep 2026)** (Rate 3.0%, 1 Sep – 1 Okt 2026, Pickup: 8 karakter eligible resmi).
    4. **5.5th Half Anniversary Support: SSR [As if Guided] Efforia & SSR [時に交わる海と空] Mr. C.B.** (Rate 3.0%, 24 Agu – 26 Sep 2026).
    5. **Pickup Support Card Gacha: SSR [行き先はあたたかな場所] Matikanetannhauser & SR [清く、やわらかな夜] Zenno Rob Roy** (Rate 3.0%, 11 Sep – 18 Sep 2026).
- **Integrasi Web Scraper Twinkle Collection Umapyoi & Fallback GameTora / Kamigame / GameWith**:
  - Mengintegrasikan scraper otomatis berita pengumuman gacha Umapyoi (`https://umapyoi.net/news?search=twinkle`) untuk mendeteksi *The Twinkle Collection Pretty Derby Gacha* setiap bulannya.
  - Mengekstrak 8 karakter eligible rate-up dari seksi *■ Eligible Umamusume* di artikel rilis (*Hishi Akebono [Magic Night Garland]*, *Sakura Chiyono O [Fleur Enneigée]*, *Daiichi Ruby [Flowing Blue]*, *Mejiro Ramonu [Untouchable Eden]*, *Verxina [Le beau sommet]*, *Buena Vista [Heroína Inocente]*, *Durandal [Chevalier fidèle]*, *Gran Alegria [sMile My Way!]*) dan memasukkannya ke dalam fitur sinkronisasi katalog.
  - Mengimplementasikan mekanisme **Fallback Berlapis (Resilient Fallback)**: Jika Umapyoi mengalami gangguan jaringan atau batasan koneksi, sistem secara otomatis mengambil 8 karakter pickup dari dataset GameTora JP `gacha/special` pada slot `rateKey: '3750'` (0.375% x 8 = 3.00%) atau data Kamigame / GameWith, menjamin kelangsungan sinkronisasi tanpa henti.
- **Eliminasi Lineup Pool Bloat pada Featured Rate-Up**:
  - Memperbaiki integrasi sinkronisasi GameTora pada banner khusus (*Twinkle Collection* dan *Select Pick Up*) sehingga tidak lagi memasukkan seluruh gacha pool (30 karakter atau ratusan kartu) ke dalam item rate-up.
  - Membatasi item featured murni pada karakter pickup aktual (1 item untuk solo rate-up, 2 item untuk dual pickup, dan 8 karakter resmi untuk Twinkle Collection).
- **Akurasi Rating Bintang Karakter Base (B1, B2, B3) & Deteksi Varian Kostum**:
  - Menghapus tampilan hardcode `★★★` pada semua karakter banner di antarmuka Dashboard.
  - Menerapkan resolver rating bintang dinamis presisi yang membedakan karakter versi base dari varian kostum alternatif:
    - **1 Bintang / B1 (★)**: *Agnes Tachyon [tach-nology]*, *Haru Urara [Bestest Prize ♪]*, *King Halo [King of Emeralds]*, *Matikanefukukitaru [Rising☆Fortune]*, *Mejiro Ryan [Down the Line]*, *Nice Nature [Poinsettia Ribbon]*, *Sakura Bakushin O [Blossom in Learning]*, *Twin Turbo [Turbo Engine! Full Throttle!]*, *Winning Ticket [Get to Winning!]*.
    - **2 Bintang / B2 (★★)**: *Air Groove [Empress Road]*, *Biko Pegasus [疾風ペガサス・零式]*, *Daiwa Scarlet [Peak Blue]*, *El Condor Pasa [El☆Número 1]*, *Gold Ship [Red Strife]*, *Grass Wonder [Stone-Piercing Blue]*, *Ikuno Dictus [Mantle of Steel]*, *Matikanetannhauser [Clippety-Tippety-Clop]*, *Mayano Top Gun [Scramble☆Zone]*, *Royce and Royce [Inspiring Genius]*, *Super Creek [Murmuring Stream]*, *Tsurumaru Tsuyoshi [志、高し、強し！]*, *Vodka [Wild Top Gear]*.
    - **3 Bintang / B3 (★★★)**: Karakter base bintang 3 (*Sakura Chiyono O [Fleur Enneigée]*, *Daiichi Ruby [Flowing Blue]*, *Durandal [Chevalier fidèle]*, *Epiphaneia [Fate's Chosen Star]*, *Cesario [Twinbell Queen]*, dll.) serta seluruh varian kostum alternatif (seperti *Grass Wonder [Saintly Jade Cleric]*, *Vodka [Fiery Aqua Vitae]*, *Agnes Tachyon [Lunatic Lab]*).
    - **Kartu Support**: Menampilkan badge kelangkaan resmi `SSR`, `SR`, atau `R` dengan aksen gradien warna khas.
- **Layout Featured Rate-Up Satu Kotak Penuh per Baris**:
  - Mendesain ulang tata letak daftar item rate-up dari semula `flex-wrap` (yang memecah item pendek seperti Gold Ship dan Vodka berdampingan menjadi 2 kolom terbelah) menjadi layout vertikal satu kotak penuh (`w-full`) satu baris per item.
  - Setiap baris dilengkapi padding lega, latar elegan (`bg-white dark:bg-slate-800`), teks nama karakter/kartu tebal proporsional di sisi kiri, dan badge kelangkaan dinamis tersemat rapi di sisi kanan.

### 🧪 Pengujian Otomatis & Kualitas Kode
- Menambahkan feature test komprehensif memvalidasi respon endpoint `GET /api/dashboard/summary` terhadap keakuratan 5 banner aktif hari ini, rating bintang B1/B2/B3, filtrasi banner dummy kosong, dan perhitungan sisa hari banner.
- Seluruh 40 feature test suite berhasil lulus 100% (321 assertions).
- Kode terformat rapi sesuai standar resmi Laravel Pint.

---

## [Versi 1.2.0] - 16 September 2026

### 🐎 Katalog Roster & Karakter Playable
- **Penyaringan Non-Playable Characters (NPCs / Staff / Trainers / Rivals)**:
  - Membersihkan 22 karakter non-playable (*Tazuna Hayakawa*, *Yayoi Akikawa*, *Aoi Kiryuin*, *Light Hello*, *Godolphin Barb*, *Darley Arabian*, *Happy Meek*, dll.) dari database dan daftar pemilihan karakter pada menu *Career & Fans Gain*.
  - Menambahkan filter otomatis pada `GameToraSyncService` untuk mencegah entitas ber-ID `>= 9000` atau yang terdaftar dalam `NON_PLAYABLE_NAMES` masuk kembali ke katalog base Uma Musume saat sinkronisasi ulang.
- **Katalog Varian Karakter Alternatif Resmi GameTora**:
  - Mempertahankan nama versi original dengan badge bintang dinamis sesuai kelangkaan awal karakter.
  - Menambahkan seluruh varian kostum alternatif resmi (format `Nama (Tema)` seperti `Shinko Windy (5.5th Anni)`, `Fine Motion (Tracen-ken)`, `Manhattan Cafe (Wedding)`, `Seiun Sky (Summer)`, dll. dengan 34 kode tema resmi GameTora) sehingga total katalog playable terverifikasi menjadi 277 karakter.
- **Indikator Kelangkaan Bintang Karakter Base Asli (1★, 2★, 3★)**:
  - Memperbaiki badge bintang pada modal *Browse Roster* dan dropdown autocomplete agar menampilkan rating bintang awal karakter:
    - **1 Bintang (★)**: *Agnes Tachyon*, *Haru Urara*, *King Halo*, *Matikanefukukitaru*, *Mejiro Ryan*, *Nice Nature*, *Sakura Bakushin O*, *Twin Turbo*, *Winning Ticket*.
    - **2 Bintang (★★)**: *Air Groove*, *Biko Pegasus*, *Daiwa Scarlet*, *El Condor Pasa*, *Gold Ship*, *Grass Wonder*, *Ikuno Dictus*, *Matikanetannhauser*, *Mayano Top Gun*, *Royce and Royce*, *Super Creek*, *Tsurumaru Tsuyoshi*, *Vodka*.
    - **3 Bintang (★★★)**: Seluruh karakter base original lainnya (*Admire Vega*, *Agnes Digital*, *Oguri Cap*, *Silence Suzuka*, dll.).

### 🏃 Career & Fans Gain Tracker
- **Metrik Min Record pada Kartu Ringkasan Performa**:
  - Menambahkan kolom **Min Record** (perolehan fans terendah) di samping *Avg Fans* dan *Max Record* pada kartu ringkasan *Scenario Performance Breakdown* dan *Character Performance Breakdown* dengan pemisah ribuan titik.
- **Tombol Isi Cepat Notes / Strategy Summary**:
  - Menambahkan 8 tombol preset instan di bawah input catatan strategi karir untuk pengisian cepat:
    - *Fans Gain Run*
    - *Sprint Ace Run*
    - *Mile Ace Run*
    - *Medium Ace Run*
    - *Long Ace Run*
    - *Mile (Dirt) Ace Run*
    - *Sprint (Dirt) Ace Run*
    - *Medium (Dirt) Ace Run*
- **Kartu Statistik Performa Karakter (Character Performance Breakdown)**:
  - Menambahkan visualisasi seksi *Character Performance Breakdown* tepat di bawah *Scenario Performance Breakdown*.
  - Menampilkan ringkasan metrik 3 kolom per karakter: total run selesai (*runs completed*), rekor terendah (*Min Record*), rata-rata fans (*Avg Fans*), dan rekor tertinggi (*Max Record*).
  - Menjamin kalkulasi karakter versi original dan varian kostum alternatif (misalnya `Shinko Windy` dengan `Shinko Windy (5.5th Anni)`) terhitung di kartu terpisah secara independen.
- **Penyesuaian Urutan Kronologis Skenario Pelatihan**:
  - Menyelaraskan urutan opsi skenario pada formulir dan filter agar sesuai timeline rilis resmi game dari yang terbaru hingga terlama: *Tracen-ken*, *Beyond Dreams*, *Yukoma Onsen*, *Design Your Island*, *The Twinkle Legends*, *Mecha Uma Musume*, *Great Food Festival*, *U.A.F. Ready GO!*, *Project L'Arc*, *Grand Masters*, *Grand Live*, *Make a New Track*, *Aoharu Hai*, dan *URA Finals*.
- **Mode Pelatihan Karir (Training Mode)**:
  - Menambahkan opsi input jenis mode latihan:
    - **Latihan Manual** (*Manual Training*): Skenario karir penuh turn-by-turn manual dengan rotasi balapan dan stat.
    - **Latihan Mandiri** (*Independent Training / 自主練*): Mode auto / latihan mandiri cepat untuk panen fans harian.
  - Menampilkan badge visual `自主練` dan menyediakan filter riwayat berdasarkan mode latihan.
- **Validasi Formulir Career Run & Auto-Rank Read-Only**:
  - Menghapus nilai default fans 35 juta dan mewajibkan pengisian angka perolehan fans > 0.
  - Mewajibkan pengisian *Skor Evaluasi / Rating Points* (> 0) sebelum formulir run dapat disimpan.
  - Badge Final Rank kini berstatus **read-only** dan otomatis ditentukan secara matematis dari skor evaluasi sesuai tabel batas skor resmi game.
- **Sinkronisasi Otomatis Kuota Circle Real-Time**:
  - Widget *Monthly Circle Progress* di top navbar terbarui secara langsung (*real-time*) setiap kali catatan run ditambah atau dihapus tanpa perlu memuat ulang (refresh) halaman.

### 🎲 Gacha Tracker & Banners
- **Urutan Kronologis Pity Count per-Banner**:
  - Menghitung kolom nomor urut pity (`pity_count_at_pull`) secara sekuensial kronologis per-banner berdasarkan tanggal tarikan (`pulled_at` dan ID tarikan).
  - Tarikan dengan tanggal lebih awal secara konsisten mendapatkan nomor urut pity lebih kecil, mencegah ketidakteraturan nomor ketika pengguna menambahkan tarikan lampau di kemudian hari.
- **Validasi Ketat Slot Gacha Tracker & Checkbox Rate-Up Read-Only**:
  - Slot gacha dimulai dalam keadaan kosong dengan placeholder yang jelas, dan memvalidasi bahwa karakter/kartu wajib dipilih dari katalog yang valid sebelum multi-pull atau tiket dapat disimpan (disertai feedback visual border merah jika kosong).
  - Checkbox *Rate Up* dibuat **read-only** dan otomatis tercentang jika item yang dipilih sesuai dengan banner pickup rate-up aktif, mencegah ketidaksinkronan centang manual.
  - Memperbaiki bug di mana status centang rate-up tidak tereset dengan benar saat mengganti pilihan karakter.
- **Active Pity Spark per-Banner & Presisi Penghapusan Pull**:
  - Pity spark counter kini terisolasi per-banner aktif (terpisah untuk pool *Character* dan *Support Card*).
  - Memperbaiki kalkulasi penghapusan pull agar jumlah tarikan dan riwayat pity berkurang secara presisi tanpa meninggalkan sisa.
- **Dual-Pool Luck Meter (3.0% Standar vs 4.5% Premium)**:
  - Memisahkan rasio keberuntungan SSR aktual secara terpisah antara pool gacha Standar (3.0%) dan Premium Pretty Derby (4.5% untuk 8 banner rilis resmi Cygames).

### 🔄 Integrasi Sinkronisasi GameTora & Backup/Restore Roster
- **Tombol Sinkronisasi GameTora di Menu Pelatihan & Modal Roster**:
  - Menambahkan tombol interaktif **"Sinkronkan GameTora"** pada modal *Browse Roster* dan tombol quick sync di samping label input karakter pada formulir karir.
  - Memungkinkan trainer memperbarui daftar karakter playable, varian kostum resmi, dan rating bintang awal (1★, 2★, 3★) secara instan dari database GameTora tanpa me-reload aplikasi.
- **Dukungan Perintah Artisan CLI**:
  - Menambahkan alias perintah `php artisan uma:sync-gametora` (selain `php artisan uma:sync-catalog`) untuk sinkronisasi otomatis via CLI atau cron job server.
- **Integrasi Backup & Restore untuk Roster Karakter & Banner**:
  - Memperbarui `BackupService` agar mengekspor dan mengimpor seluruh data katalog karakter `uma_catalog_items` (termasuk kolom `gametora_id` dan `raw_data`) serta data `gacha_banners`.
  - Memanggil invalidasi cache otomatis `UmaCatalog::clearCache()` pasca pemulihan data (restore), sehingga pembaruan katalog langsung aktif di antarmuka tanpa perlu restart server atau cache clearing manual.

### 📅 Widget Banner Gacha Berlangsung Hari Ini (Dashboard)
- **Seksi Kartu Banner Aktif Real-Time pada Dashboard**:
  - Menambahkan seksi visual **"Banner Gacha Berlangsung Hari Ini"** pada halaman utama Trainer Dashboard yang menghitung dan menampilkan banner gacha resmi Uma Musume yang aktif pada hari ini.
  - Setiap kartu banner menampilkan:
    - Badge jenis banner: *🌸 Pretty Derby Gacha (Karakter)* vs *🃏 Support Card Gacha*.
    - Badge tingkat rate: *4.5% Rate-Up Premium* (untuk banner anniversary/film spesial) vs *3.0% Standar*.
    - Tanggal periode mulai hingga berakhir, serta indikator sisa hari (*Hari Terakhir!*, *X hari lagi*).
    - Daftar chip karakter pickup 3★ atau kartu pickup SSR yang sedang rate-up.
    - Tombol aksi cepat *"Tarik di Gacha Tracker"* untuk langsung beralih ke tab gacha.
- **Tombol Sinkronisasi GameTora di Dashboard**:
  - Menyediakan tombol pembaruan GameTora langsung pada header seksi banner di dashboard yang memperbarui metadata gacha banner dan katalog karakter secara langsung.

### 🏛️ Formulir Pra-Scraping Circle Club & Regulasi Muxueuma
- **Formulir Input ID Circle (Pre-Scraping View)**:
  - Mengubah alur antarmuka menu *Circle Club* agar tidak langsung menampilkan data klub secara hardcoded saat pertama kali dibuka, melainkan menyajikan kartu setup formulir pengisian **ID Circle Club (Muxueuma)**.
  - Menyediakan tombol **"Ganti ID Club"** pada header tampilan utama circle untuk memudahkan trainer mengganti atau menghubungkan circle lain kapan saja.
- **Tautan Eksternal Resmi Direktori & Registrasi Muxueuma**:
  - Menyediakan tautan cepat ke direktori circle terdaftar: `https://muxueuma.com/ja`.
  - Menyediakan tautan cepat ke formulir pendaftaran circle baru: `https://muxueuma.com/ja/apply`.
- **Panduan & Kebijakan Data Resmi Muxueuma (サークル収録申請)**:
  - Menampilkan instruksi komprehensif dalam Bahasa Indonesia serta kotak teks asli Bahasa Jepang (dapat dilipat / collapsible):
    - Syarat pengajuan registrasi circle memerlukan pengisian **Trainer ID** pada formulir Muxueuma.
    - Penjelasan teknis bahwa pengambilan data riwayat perolehan fans baru dimulai *setelah* circle terdaftar (tidak dapat ditarik secara retroaktif).
    - Kebijakan transparansi data di mana jumlah fans dan kontribusi bulanan seluruh anggota circle dipublikasikan secara terbuka.
    - Kebijakan penyamaran privasi nama circle dengan tanda bintang `*` (contoh: `「ヴィブロス～☆！」→「ヴィ**ス～☆！」`) melalui permohonan email ke `ruijiergadena@gmail.com` disertai bukti tangkapan layar (screenshot) keanggotaan dalam game.

### 🎨 UI/UX & Aksesibilitas Dark Mode
- **Badge Navbar "Trainer Hub"**:
  - Diformat menggunakan kelas khusus `.badge-trainer-hub` agar teks selalu hitam pekat (`#090d16`) di atas background amber (`#fbbf24`) baik pada mode terang maupun gelap.
- **Kartu Opsi Mode Pelatihan di Dark Mode**:
  - Memiliki kontras optimal saat dipilih di dark mode dengan kartu berlatar gelap elegan dan teks aksen terang (`dark:text-purple-300` / `dark:text-emerald-300`).
- **Modal Directory & Autocomplete**:
  - Modal Browse Roster dan dropdown autocomplete kini mendukung penuh tema gelap dengan tata letak kartu yang rapi.

---

## [Versi 1.1.0] - 15 September 2026

### 🎲 Peluncuran Modul Gacha Tracker
- **Pencatatan Riwayat Tarikan Multi-Banner**:
  - Dukungan pencatatan pull untuk kategori *Character Banner* dan *Support Card Banner*.
  - Input batch tarikan *10x Multi-Pull* dengan preview kartu individual dan *Single Pull / Ticket*.
  - Deteksi otomatis tingkat kelangkaan kartu: SSR (Rainbow Gradient), SR (Gold Amber), dan R (Silver Slate).
  - Deteksi otomatis status *Rate-Up Pickup* berdasarkan metadata banner yang sedang aktif.
- **Pity Counter & Spark Monitoring**:
  - Pemantauan batas spark 200 pull per siklus banner aktif dengan indikator progres visual.
  - Pencatatan nomor urut pull menuju pity spark.
- **Kalkulasi Luck Meter & SSR Hit Rate**:
  - Menghitung persentase SSR aktual yang diperoleh pemain dibandingkan dengan base rate teoretis.
  - Label status keberuntungan dinamis (*Above Average*, *On Rate*, *Below Average*).

### 🌐 Integrasi Data & Katalog
- **Sinkronisasi Katalog GameTora**:
  - Implementasi `GameToraSyncService` untuk mengimpor dan menyinkronkan seluruh database karakter playable dan support card dari platform GameTora.
  - Penyimpanan data pada basis data lokal SQLite (`uma_catalog_items`) untuk mendukung pencarian autocomplete instan tanpa latensi jaringan.
  - Perintah Artisan `php artisan uma:sync-gametora` untuk otomasi pembaruan katalog.
- **Katalog 60 Banner Resmi Cygames 2026**:
  - Pre-seeding daftar banner resmi game Uma Musume Pretty Derby server Jepang untuk periode 2026.

### 💄 Penyempurnaan Visual
- Efek animasi *Rainbow Shimmer* pada kartu SSR.
- Tata letak responsif penuh untuk input gacha pada layar smartphone dan desktop.

---

## [Versi 1.0.0] - 15 September 2026

### 🚀 Rilis Perdana Uma Musume Pretty Derby Companion
- **Pelacak Perolehan Fans Karir (Career Runs Tracker)**:
  - Pencatatan log pelatihan Uma Musume mencakup nama karakter, tanggal lari, skenario latihan, skor evaluasi, perolehan fans, dan rank akhir.
  - Ringkasan statistik performa karir trainer:
    - Total run diselesaikan.
    - Total perolehan fans sepanjang masa (*All-Time Total Fans*).
    - Perolehan fans pada bulan berjalan (*Monthly Circle Fans*).
    - Rata-rata fans per run (*Average Fans per Run*).
    - Rekor run tertinggi dengan perolehan fans terbesar (*Personal Best Record*).
  - Visualisasi ringkasan **Scenario Performance Breakdown** untuk menganalisis skenario pelatihan paling optimal (*URA Finals*, *Aoharu Hai*, *Make a New Track*, *Grand Live*, *Grand Masters*, *Project L'Arc*, *U.A.F. Ready GO!*).
  - Riwayat log run dengan tabel data, filter skenario, filter rank, dan paginasi sekuensial.
- **Pemantau Target Kuota Circle Bulanan**:
  - Fitur penentuan target kuota fans bulanan Circle Club (default 20.000.000 fans) yang disimpan di tabel `app_settings`.
  - Widget *Monthly Circle Progress* dengan progress bar interaktif, persentase ketercapaian, dan kalkulasi sisa fans yang dibutuhkan.
- **Sistem Cadangan & Pemulihan Basis Data (Backup & Restore)**:
  - Ekspor seluruh basis data ke file JSON terenkapsulasi dengan timestamp.
  - Impor data cadangan dengan 2 pilihan mode:
    - **Merge Mode**: Menggabungkan data baru tanpa menghapus data yang sudah ada.
    - **Overwrite Mode**: Mengosongkan data dan memulihkan basis data secara menyeluruh.
  - Perintah Artisan CLI `uma:backup` dan `uma:restore` untuk pencadangan via terminal/cron.
- **Fondasi Antarmuka & Tema**:
  - Antarmuka modern yang dibangun dengan Laravel, Inertia.js / React, dan Tailwind CSS.
  - Skema warna khas Uma Musume: *Turf Green*, *Uma Pink*, dan *Gold*.
  - Dukungan tema Gelap (*Dark Mode*) dan Terang (*Light Mode*) dengan persistensi preferensi di browser.
