---
name: uma-tracker-domain
description: "Aturan domain dan panduan teknis proyek Uma Musume Pretty Derby Companion (Server JP 2026+). Wajib diaktifkan saat mengembangkan fitur atau memodifikasi modul Kalkulator Proyeksi Rating & Skill Optimizer, Evaluasi Rank 298-tier (G s.d. LS24), Simulasi Deck 6 Support Card (SupportDeckBuilder), Gacha Pull Tracker & validasi banner JP 2026+, dan Perencana Turnamen Resmi Cygames (Champions Meeting & League of Heroes)."
license: MIT
metadata:
  author: uma-tracker
---

# Uma Musume Tracker Domain Rules (Server JP 2026+)

Panduan domain resmi dan standar teknis untuk aplikasi pendamping **Uma Musume Pretty Derby Companion** server Jepang (JP 2026+).

---

## 1. Proteksi Keselamatan Database (CRITICAL)
- **`database/database.sqlite`**: Dilarang keras menyentuh, memodifikasi, mengosongkan, atau menjalankan seeder destruktif pada berkas basis data SQLite fisik.
- Wajib memeriksa hash SHA-256 berkas `database/database.sqlite` sebelum memulai dan setelah menyelesaikan setiap pekerjaan menggunakan `Get-FileHash -Algorithm SHA256 database/database.sqlite`.
- Seluruh pengujian otomatis PHPUnit wajib berjalan di memori terisolasi (`:memory:`), sebagaimana dikonfigurasi di `phpunit.xml`.
- Simpan seluruh pembaruan data dinamis atau sinkronisasi runtime secara terpisah di `storage/app/` (misal: `storage/app/competition_events_live_sync.json` atau `storage/app/support_deck_presets.json`).

---

## 2. Sistem Evaluasi Rank 298-Tier (`G` s.d. `LS24`)
Aplikasi mengadopsi kalibrasi sistem 298 tingkat evaluasi resmi GameTora dan UmaTools (`daftuyda.moe`):
- **Rentang Rank Pra-Legendary**:
  - `G` s.d. `SS+` (`0` – `19.599` pts)
  - `UG` s.d. `UG9` (`19.600` – `23.899` pts)
  - `UF` s.d. `UF9` (`23.900` – `28.799` pts)
  - `UE` s.d. `UE9` (`28.800` – `34.399` pts)
  - `UD` s.d. `UD9` (`34.400` – `40.699` pts)
  - `UC` s.d. `UC9` (`40.700` – `47.599` pts)
  - `UB` s.d. `UB9` (`47.600` – `55.199` pts)
  - `UA` s.d. `UA9` (`55.200` – `63.399` pts)
  - `US` s.d. `US9` (`63.400` – `75.999` pts)
- **Kasta Legendary (`L`)**:
  - `LG` dimulai tepat pada **`76.000 pts`** (`LG`..`LG24`: `76.000` – `91.399` pts)
  - `LF` dimulai tepat pada **`91.400 pts`** (`LF`..`LF24`: `91.400` – `105.399` pts)
  - Setiap huruf kasta `L` (`LG`, `LF`, `LE`, `LD`, `LC`, `LB`, `LA`, `LS`) memiliki **25 sub-tier** (nama dasar + sub-level `1` s.d. `24`).
  - Rank tertinggi tercapai pada **`LS24`** ($\ge 190.400$ pts).
- **Validasi Cap Skor Evaluasi**:
  - Batas maksimal input skor evaluasi karier pada backend (`StoreCareerRunRequest`, `UpdateCareerRunRequest`) dan formulir frontend adalah **`200.000 pts`** (HTTP 422 jika melebihi batas).

---

## 3. Kalkulator Proyeksi Rating & Skill Optimizer Server JP
Modul kalkulator rating (`RatingCalculatorView.jsx`) dan pembantu optimasi (`skillOptimizerHelper.js`):
- **Kurva Stat Server JP**: Mendukung nilai 5 atribut dasar (Speed, Stamina, Power, Guts, Wisdom) hingga `3000+` poin dengan formula resmi skala stat `calculateStatRating(value)`.
- **Skor Unique Skill**:
  - Karakter Bintang 1–2 (`★1–★2`): `120 * UniqueLevel` (maksimal Lv4).
  - Karakter Bintang 3–5 (`★3–★5`): `170 * UniqueLevel` (maksimal Lv6).
- **Pengali Aptitude Skill**:
  - Grade `A` & `S`: `1.0x`
  - Grade `B` & `C`: `0.9x`
  - Grade `D` s.d. `G`: `0.5x`
- **Tingkat Diskon Biaya Skill (Skill Points / Pt)**:
  - Diskon Hint resmi server JP: `Lv0`: 0%, `Lv1`: 10%, `Lv2`: 20%, `Lv3`: 30%, `Lv4`: 35%, `Lv5`: 40%.
  - Diskon Fast Learner (`切れ者` / `isFastLearner`): Tambahan diskon 10% yang diakumulasikan.
  - Formula biaya: `floor(baseCost * max(0, 1 - hintDiscount - fastLearnerDiscount) + 1e-9)`.
- **Solver Knapsack Dynamic Programming**:
  - Mengelompokkan pilihan mutually exclusive (*Grouped Knapsack Choices*):
    - Rantai *White $\rightarrow$ Gold*: Gold menggantikan skor evaluasi White.
    - Rantai `○` $\rightarrow$ `◎`: Double Circle menggantikan Circle.
    - Skill Evolved: Menggantikan skill Gold dasar.
  - Menghitung efisiensi `Rating Gain / Net Cost` (`pts/Pt`) dan mendukung penguncian prioritas (*Locked skills*).

---

## 4. Simulasi Deck 6 Support Card (`SupportDeckBuilder.jsx`)
- **Pemisahan Efek Latihan Ketat**:
  - **Bagian A (HANYA 4 Efek Dijumlahkan)**:
    1. *Race Bonus* (`Efek 15` / `race_bonus`)
    2. *Fan Bonus* (`Efek 16` / `fan_bonus`)
    3. *Total Initial Stats* (`Efek 17-21` / `initial_stats`)
    4. *Initial Skill Points Up* (`Efek 32` / `initial_skill_pt`)
  - **Bagian B (Efek Individual Tanpa Penjumlahan)**:
    Seluruh efek latihan lainnya (seperti *Friendship Bonus*, *Specialty Rate*, *Training Effectiveness*, *Motivation Up*, dll.) dicantumkan per kartu secara berurutan dan **DILARANG** dijumlahkan secara naif karena mekanik perkalian di in-game.
- **Penyimpanan Preset Formasi**:
  - Disimpan pada backend via endpoint `/api/collection/deck-presets` yang mengelola berkas `storage/app/support_deck_presets.json`.
- **Jembatan Transfer Skill**:
  - Menyediakan tombol pintasan *"🧮 Uji Skill Deck Ini di Kalkulator / Optimizer"* yang mentransfer kartu deck aktif ke kalkulator via custom event `uma:open-rating-calculator-with-skills` dan `sessionStorage`.

---

## 5. Aturan Gacha Server JP 2026+
- **Format Penamaan Karakter**:
  - Seluruh karakter pada sistem gacha (input, autocomplete, banner, pencatatan tarikan) **wajib** menggunakan format nama kostum resmi dalam kurung siku `[...]` (contoh: `Daiwa Scarlet [Peak Blue]`, `Air Groove [Eternal Hekateia]`).
  - Nama dasar tanpa kurung (*bare name*) hanya digunakan untuk modul Pelatihan / Career Run.
- **Aturan Banner Twinkle Collection**:
  - Kategori `twinkle` membagi rata rate total SSR 3,00% ke 8 karakter B3 yang terdaftar (masing-masing 0,375%).
  - Status rate-up wajib dimatikan (`is_rate_up = false`) dan tidak memiliki tarikan rate-off/spook.
- **Validasi Silang Pool & Proteksi Tipe**:
  - Pergantian antara tipe Karakter dan Support Card otomatis mengosongkan banner yang tidak sesuai.
  - Backend menolak form submission (HTTP 422) jika terjadi ketidaksesuaian tipe banner atau item lintas-pool (karakter pada banner support card atau sebaliknya).

---

## 6. Perencana Turnamen Kompetisi CM & LoH (*Zero Speculative Data*)
- **Prinsip Nol Data Spekulatif**:
  - Hanya mengintegrasikan data yang diumumkan resmi oleh Cygames JP (portal berita resmi) dan panduan target stats GameWith JP.
  - Parameter yang belum dirilis wajib berstatus `NULL` atau ditandai jelas `"Belum diumumkan"`.
  - Kondisi cuaca acak pada LoH ditandai eksplisit `"random"` / `"Acak"`.
- **Live Sync Terisolasi**:
  - Hasil sinkronisasi turnamen dinamis (`POST /api/competition-events/sync` / `php artisan uma:sync-competitions`) disimpan secara terpisah di `storage/app/competition_events_live_sync.json` dan digabungkan secara dinamis saat runtime pada model `CompetitionEvent` dan `CompetitionStatRecoveryRecommender` tanpa mengubah berkas fisik database.
