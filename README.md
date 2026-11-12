# Uma Musume Pretty Derby Companion

Aplikasi lokal untuk penggunaan personal di server Jepang (JP). Catat tarikan gacha dan hasil karier, pantau kuota fans Circle, serta rencanakan tabungan Jewel, dek support card, dan persiapan kompetisi.

## Fitur per menu

| Menu | Kegunaan |
| --- | --- |
| Dasbor | Ringkasan karier, pity banner aktif, progres Circle, dan kompetisi terdekat. |
| Analitik | Tren fans, performa per skenario, distribusi kelangkaan, dan interval perolehan SSR. |
| Gacha | Riwayat tarikan karakter dan support card, pity per banner, dan simulator probabilitas. Persentil gabungan memakai konvolusi dua distribusi binomial untuk pool standar 3,0% dan boosted 4,5%. |
| Karier | Catat hasil latihan, impor tangkapan layar dengan OCR, dan proyeksikan rating JP. Skill Optimizer menggunakan optimasi berbasis *grouped knapsack* untuk memilih skill berdasarkan anggaran, prasyarat, dan diskon. |
| Afinitas | Hitung kompatibilitas silsilah tujuh slot dengan mode tiga arah, bonus kemenangan G1 bersama, dan rekomendasi pasangan induk. |
| Koleksi | Catat kepemilikan dan limit break, bandingkan kartu, cari sumber skill, dan simpan preset dek enam support card. |
| Circle | Pantau ritme perolehan fans, estimasi jumlah sesi latihan, dan arsip bulanan dari Muxueuma. |
| Perencana | Proyeksikan saldo Jewel dan tiket menuju target Spark serta simulasikan pengeluaran untuk farming. |
| Event | Lihat jadwal CM dan LoH dari Cygames, rincian sirkuit dan skill dari GameTora, serta panduan atribut dan pemulihan dari GameWith. |

Aplikasi mendukung instalasi sebagai PWA dan navigasi ponsel.

## Mulai cepat

Gunakan PHP 8.4.1 atau lebih baru sesuai dependensi terkunci, ekstensi PDO SQLite, Composer, dan Node.js 24 beserta npm.

Untuk instalasi baru, jalankan dari direktori proyek di PowerShell.

```powershell
composer install
npm ci
Copy-Item .env.example .env
php artisan key:generate
if (-not (Test-Path database/database.sqlite)) {
    New-Item -ItemType File database/database.sqlite
}
php artisan migrate
```

**Khusus database demo baru:** buat berkas SQLite kosong yang terpisah, atur `DB_DATABASE` di `.env` ke path absolut berkas tersebut, lalu jalankan `php artisan migrate --seed`. Perintah itu menjalankan `UmaCompanionSeeder` untuk mengisi contoh riwayat gacha dan karier serta mengatur nilai pity awal. Jangan jalankan perintah tersebut pada database dengan data aktif.

Jalankan `php artisan serve` dan `npm run dev` di terminal terpisah, lalu buka alamat yang ditampilkan oleh server Laravel. Untuk memakai aset hasil build, jalankan `npm run build` dan gunakan server Laravel untuk menyajikannya.

## Sinkronisasi

Pada instalasi baru, jalankan `php artisan db:seed --class=CompetitionEventSeeder` untuk mengisi jadwal awal sebelum menyinkronkan Event.

```powershell
php artisan uma:sync-catalog
php artisan uma:sync-competitions
```

Perintah pertama memperbarui katalog GameTora. Perintah kedua menyegarkan jadwal resmi Cygames dan panduan GameWith. Tambahkan `--force` pada perintah yang ingin dijalankan ulang tanpa pemeriksaan pembaruan normal.

## Cadangan dan pemulihan

Backup Schema v2.0 menyimpan sembilan entitas SQLite dalam berkas JSON. Cakupannya meliputi `gacha_banners`, `gacha_pulls`, `gacha_pities`, `career_runs`, `circle_snapshots`, `app_settings`, `uma_catalog_items`, `user_characters`, dan `user_support_cards`. Jadwal resmi `competition_events` dilindungi secara terpisah saat pemulihan.

Preset dek di `storage/app/support_deck_presets.json`, cache sinkronisasi Event di `storage/app/competition_events_live_sync.json`, dan sesi Kalkulator Rating serta Skill Optimizer di `localStorage` berada di luar cakupan backup.

```powershell
php artisan uma:backup
php artisan uma:restore storage/app/backups/nama-backup.json --mode=merge
```

Cadangan secara bawaan tersimpan di `storage/app/backups/`. Mode `merge` menggabungkan data. Mode `overwrite` mengosongkan sembilan entitas sebelum memulihkan isinya. Lihat [spesifikasi backup](docs/backup_specification.md) untuk kompatibilitas format dan perilaku pemulihan.

## Pengujian

PHPUnit menggunakan SQLite `:memory:` melalui konfigurasi proyek.

```powershell
php artisan test --compact
php artisan test --filter=BackupVerificationTest
node --test tests/Unit/skillOptimizerHelper.test.js
vendor/bin/pint
```

## Atribusi

Proyek buatan penggemar dan nonkomersial ini dikembangkan dengan bantuan AI. Hak cipta Uma Musume: Pretty Derby dan aset gim dimiliki oleh Cygames, Inc. [Uma Musume JP](https://umamusume.jp/) · [Cygames](https://www.cygames.co.jp/)

Rujukan data dan mekanik mencakup GameTora, UmaTools, GameWith, portal berita Cygames JP, dan Muxueuma. [GameTora](https://gametora.com/umamusume) · [UmaTools](https://daftuyda.moe/) · [GameWith](https://gamewith.jp/uma-musume/) · [Berita Cygames JP](https://umamusume.jp/news/) · [Muxueuma](https://muxueuma.com/ja)

Lihat [riwayat rilis](CHANGELOG.md) untuk perubahan tiap versi.
