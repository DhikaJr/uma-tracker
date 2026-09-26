# 📦 Uma Musume Companion - Backup & Restore Specification (Version 2.0)

Dokumentasi resmi arsitektur pencadangan, format skema JSON, dan aturan kompatibilitas (backward compatibility) data untuk aplikasi **Uma Musume Pretty Derby Companion**.

---

## 1. Ikhtisar Versi Skema (Schema Versioning)

Aplikasi menggunakan skema versioning semantik dua tingkat:
- **Versi 2.0 (Aktif/Terkini)**:
  - Format backup modern yang mendukung 9 entitas lengkap.
  - Memulihkan seluruh atribut JSON terstruktur pada `uma_catalog_items` (`aptitudes`, `skills`, `objectives`, `details`, `raw_data`).
  - Mendukung skema aktif `circle_snapshots` (`circle_id`, `circle_name`, `rank`, `point`, `member_count`, `active_total`, `period`, `payload`, `last_refreshed_at`).
  - Menggunakan resolusi Foreign Key cerdas berbasis nama kartu/karakter untuk relasi katalog.
- **Versi 1.0 (Kompatibel)**:
  - Format backup awal tanpa field `aptitudes`/`skills`/`objectives`/`details` terpisah.
- **Versi 0.9 (Legacy)**:
  - Format warisan fans club dengan `snapshot_date`, `total_fans`, dan `members_data`.

> [!IMPORTANT]
> Sistem memvalidasi atribut `version` menggunakan whitelist ketat `self::SUPPORTED_SCHEMA_VERSIONS = ['0.9', '1.0', '2.0']`. Versi yang hilang, tidak dikenal, malformed, atau tidak persis cocok akan ditolak secara eksplisit dengan `InvalidArgumentException` sebelum operasi data apa pun dijalankan.

---

## 2. Struktur Payload JSON (Format File Backup)

Struktur file JSON backup standar:

```json
{
  "version": "2.0",
  "app": "Uma Musume Companion",
  "exported_at": "2026-09-18T05:30:00+00:00",
  "summary": {
    "gacha_pulls": 200,
    "gacha_pities": 4,
    "career_runs": 66,
    "circle_snapshots": 7,
    "app_settings": 6,
    "uma_catalog_items": 970,
    "gacha_banners": 69,
    "user_characters": 42,
    "user_support_cards": 142
  },
  "data": {
    "app_settings": [ ... ],
    "gacha_banners": [ ... ],
    "gacha_pities": [ ... ],
    "gacha_pulls": [ ... ],
    "career_runs": [ ... ],
    "circle_snapshots": [ ... ],
    "uma_catalog_items": [ ... ],
    "user_characters": [ ... ],
    "user_support_cards": [ ... ]
  }
}
```

---

## 3. Spesifikasi Skema Setiap Entitas

### 1. `app_settings`
| Kolom | Tipe Data | Keterangan |
|---|---|---|
| `key` | `string` (Wajib) | Kunci konfigurasi unik (misal: `circle_id`, `jewel_planner_config`) |
| `value` | `string|null` | Nilai pengaturan (teks atau JSON string) |

### 2. `gacha_banners`
| Kolom | Tipe Data | Keterangan |
|---|---|---|
| `id` | `integer` (Wajib) | Primary key banner gacha |
| `name` | `string` (Wajib) | Nama banner (misal: `5th Anniversary Pretty Derby Gacha`) |
| `gametora_id` | `integer|null` | ID referensi GameTora |
| `banner_type` | `string` | `'character'` atau `'support'` (default: `'character'`) |
| `category` | `string` | `'standard'`, `'premium'`, atau `'anniversary'` |
| `base_rate` | `float` (Wajib) | Persentase rate dasar SSR (0.0 - 100.0, non-nullable, wajib ada tanpa nilai tebakan) |
| `featured_items` | `array` | Daftar nama kartu/karakter rate-up |
| `start_date` | `date|null` | Tanggal mulai banner |
| `end_date` | `date|null` | Tanggal berakhir banner |
| `is_active` | `boolean` | Status banner aktif saat ini |

### 3. `gacha_pities`
| Kolom | Tipe Data | Keterangan |
|---|---|---|
| `banner_type` | `string` (Wajib) | `'character'` atau `'support'` |
| `gacha_banner_id` | `integer|null` | Foreign key ke `gacha_banners.id` (nullable) |
| `current_pity` | `integer` | Jumlah pull sejak SSR terakhir (0–200) |
| `total_sparks` | `integer` | Akumulasi spark yang telah ditukar |
| `last_reset_at` | `timestamp|null` | Waktu reset spark/pity terakhir |

### 4. `gacha_pulls`
| Kolom | Tipe Data | Keterangan |
|---|---|---|
| `banner_type` | `string` (Wajib) | `'character'` atau `'support'` |
| `gacha_banner_id` | `integer|null` | Foreign key ke `gacha_banners.id` (nullable) |
| `pull_type` | `string` | `'single'`, `'multi'`, atau `'ticket'` |
| `item_name` | `string` (Wajib) | Nama karakter atau support card yang didapat |
| `rarity` | `string` (Wajib) | `'SSR'`, `'SR'`, atau `'R'` |
| `is_rate_up` | `boolean` | Apakah tarikan merupakan kartu rate-up |
| `pity_count_at_pull`| `integer` | Angka pity saat kartu ditarik |
| `pulled_at` | `datetime` | Tanggal & waktu tarikan dilakukan |

### 5. `career_runs`
| Kolom | Tipe Data | Keterangan |
|---|---|---|
| `uma_name` | `string` (Wajib) | Nama Uma Musume (dukungan alias: `character_name`) |
| `scenario` | `string` (Wajib) | Nama skenario pelatihan (misal: `The Twinkle Legends`) |
| `training_type` | `string` | `'manual'` atau `'independent'` (mandiri) |
| `starting_fans` | `integer` | Jumlah fans sebelum karir dimulai |
| `ending_fans` | `integer` | Jumlah fans akhir setelah URA/Twinkle |
| `fans_gained` | `integer` | Pertambahan fans selama run |
| `final_rank` | `string` | Peringkat evaluasi (misal: `UE1`, `UC5`) |
| `evaluation_score` | `integer|null` | Skor evaluasi numerik |
| `notes` | `string|null` | Catatan strategi trainer |
| `run_date` | `date` | Tanggal run diselesaikan |

### 6. `circle_snapshots`
| Kolom | Tipe Data | Keterangan |
|---|---|---|
| `circle_id` | `string` (Wajib) | ID Club Fans (misal: `'441730573'`) |
| `circle_name` | `string|null` | Nama Fans Club |
| `rank` | `integer|null` | Peringkat nasional Fans Club |
| `point` | `integer|null` | Total fans/poin club terkini (legacy: `total_fans`) |
| `member_count` | `integer|null` | Jumlah anggota club (0–30) |
| `active_total` | `integer|null` | Total kontribusi aktif anggota |
| `period` | `string|null` | Periode bulan observasi (format: `YYYY-MM-DD`) |
| `payload` | `array` (Wajib) | Data lengkap observasi (contributions, rank trend 7d) |
| `last_refreshed_at` | `datetime` (Wajib)| Waktu observasi snapshot (legacy: `snapshot_date`) |

### 7. `uma_catalog_items`
| Kolom | Tipe Data | Keterangan |
|---|---|---|
| `type` | `string` (Wajib) | `'character'`, `'support_card'`, atau `'base_uma'` |
| `name` | `string` (Wajib) | Nama unik kartu/karakter |
| `rarity` | `string|null` | Rarity bawaan (`'SSR'`, `'SR'`, `'R'`, atau `'3'`) |
| `gametora_id` | `integer|null` | ID resmi GameTora |
| `raw_data` | `array|null` | JSON payload GameTora mentah |
| `aptitudes` | `array|null` | Aptitude track (`turf`, `dirt`), distance, dan style |
| `skills` | `array|null` | Tree skill (`innate`, `awakening`, `evolved` + conditions & translations) |
| `objectives` | `array|null` | Target objektif balapan/turnamen skenario URA & Aoharu karakter |
| `details` | `array|null` | Matriks efek 0LB–MLB kartu, training events, choices |

### 8. `user_characters`
| Kolom | Tipe Data | Keterangan |
|---|---|---|
| `name` | `string` (Wajib) | Nama karakter yang dimiliki |
| `uma_catalog_item_id` | `integer|null`| Foreign key ke `uma_catalog_items.id` |
| `base_stars` | `integer` | Bintang bawaan (1–3) |
| `current_stars` | `integer` | Bintang saat ini (1–5) |
| `is_owned` | `boolean` | Status kepemilikan |
| `obtained_at` | `date|null` | Tanggal perolehan karakter |
| `notes` | `string|null` | Catatan trainer |

### 9. `user_support_cards`
| Kolom | Tipe Data | Keterangan |
|---|---|---|
| `name` | `string` (Wajib) | Nama support card |
| `uma_catalog_item_id` | `integer|null`| Foreign key ke `uma_catalog_items.id` |
| `char_name` | `string|null` | Nama karakter pada kartu |
| `rarity` | `string` | `'SSR'`, `'SR'`, `'R'` |
| `card_type` | `string|null` | Tipe kartu (`'Speed'`, `'Stamina'`, `'Power'`, dst.) |
| `limit_break` | `integer` | Level Limit Break (0=0LB, 1=1LB, 2=2LB, 3=3LB, 4=MLB)|
| `is_owned` | `boolean` | Status kepemilikan |
| `obtained_at` | `date|null` | Tanggal perolehan kartu |
| `notes` | `string|null` | Catatan trainer |

---

## 4. Aturan Mode Pemulihan & Resolusi Konflik (Conflict Resolution)

### Tabel Business Keys & Strategi Merge per Entitas

| Entitas | Business Key (Identitas Unik) | Strategi Merge | Penanganan Konflik & Duplikasi |
|---|---|---|---|
| `app_settings` | `key` | `updateOrCreate` | Memperbarui `value` jika key sudah ada; insert jika key baru. |
| `gacha_banners` | `id`, fallback `name` | `updateOrCreate` | Memperbarui metadata banner jika ID/nama cocok; insert jika baru. |
| `gacha_pities` | `[banner_type, gacha_banner_id]` | `firstOrNew` + update | Memperbarui `current_pity`, `total_sparks`, `last_reset_at`. |
| `gacha_pulls` | `id` atau `[banner_type, item_name, rarity, pity_count_at_pull, pulled_at, gacha_banner_id]` | Deduplikasi idempotensi | Jika tarikan identik sudah ada pada waktu dan pity yang sama, dilewati untuk mencegah inflasi pull; jika baru, ditambahkan. |
| `career_runs` | `id` atau `[uma_name, run_date, scenario, fans_gained, evaluation_score, final_rank]` | Deduplikasi idempotensi | Jika run identik sudah ada, catatan (`notes`) diperbarui; jika baru, ditambahkan. |
| `circle_snapshots` | `id` atau `[circle_id, last_refreshed_at]` | `updateOrCreate` | Memperbarui poin, rank, dan payload snapshot; jika baru, ditambahkan. |
| `uma_catalog_items` | `[type, name]` (Database Unique) | `updateOrCreate` | Memperbarui `skills`, `aptitudes`, `objectives`, `details`, `raw_data`, dan `rarity`. |
| `user_characters` | `name` (Database Unique) | `updateOrCreate` | Memperbarui bintang, status kepemilikan, tanggal perolehan, dan relasi katalog. |
| `user_support_cards` | `name` (Database Unique) | `updateOrCreate` | Memperbarui limit break, kepemilikan, tipe kartu, dan relasi katalog. |

### Penolakan Duplikasi dalam Payload Tunggal (In-Payload Duplicate Rejection)
Jika dalam satu file backup terdapat record duplikat dengan primary key yang sama (misal: dua entri `gacha_banners` dengan ID sama, atau dua `app_settings` dengan key sama), validasi `validate()` akan menolak file backup secara eksplisit dengan exception:
> *"Duplikasi ID 'X' terdeteksi pada gacha_banners dalam payload backup (index Y)."*

Hal ini mencegah record terakhir menimpa record pertama secara diam-diam (*silent overwrite data loss*).

---

## 5. Resolusi Foreign Key & Pelaporan Unresolved References

Sistem menerapkan protokol identitas relasional yang ketat:
1. **Prioritas Identitas Stabil**: Pencarian relasi katalog (`uma_catalog_item_id`) mengutamakan `gametora_id` dan nama varian unik persis (`['type', 'name']`).
2. **Pencegahan Cross-Linking Palsu**: Jika file backup memuat ID integer katalog dari database luar (`uma_catalog_item_id`), sistem **tidak akan** langsung mempercayai ID tersebut kecuali nama item pada ID tersebut terbukti identik.
3. **Tanpa Fuzzy Matching Liar**: Jika karakter/kartu tidak ditemukan di katalog, sistem **tidak** melakukan pencocokan parsial sembarangan (misal: mencocokkan outfit berbeda). Relasi diset ke `null` secara aman.
4. **Pelaporan Unresolved References**: Setiap foreign key yang tidak dapat dipetakan dicatat secara terstruktur dalam hasil import:
   ```json
   {
     "unresolved_references": [
       {
         "entity": "user_characters",
         "record_name": "Unknown Uma",
         "field": "uma_catalog_item_id",
         "provided_id": 999999,
         "reason": "Tidak dapat memverifikasi identitas katalog untuk 'Unknown Uma'. Relasi diset null untuk mencegah cross-linking."
       }
     ]
   }
   ```

---

## 6. Validasi Integritas & Anti Silent-Skip

Metode `validate()` dieksekusi secara ketat sebelum `DB::transaction`:
- Setiap tanggal diverifikasi parseability-nya via `Carbon::parse()` (mencegah string `'invalid-date'`).
- Tipe enum diverifikasi (`rarity` in `['SSR', 'SR', 'R']`, `training_type` in `['manual', 'independent']`, dll.).
- Nilai numerik diperiksa batasnya (`limit_break` 0–4, `base_stars` 1–5, `member_count` 0–30, rate 0.0–100.0).
- Seluruh perubahan database dijamin atomik melalui `DB::transaction` (rollback 100% jika terjadi kesalahan).

