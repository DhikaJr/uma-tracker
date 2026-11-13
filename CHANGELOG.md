# 📋 Log Riwayat Pembaruan (Changelog)

Seluruh perubahan penting, penambahan fitur baru, perbaikan bug, dan penyempurnaan antarmuka pada aplikasi **Uma Musume Pretty Derby Companion** didokumentasikan dalam file ini. Format penomoran versi mengikuti prinsip [Semantic Versioning](https://semver.org/).

## [Versi 3.3.6] - 13 November 2026

### Pemulihan backup dan akurasi Perencana Jewel

- Mode overwrite skema v2.0 memerlukan kesembilan kelompok data. Mode merge memakai ID lokal dan memetakan relasi agar ID sumber yang sama tidak menimpa data lain.
- Batas unggah aplikasi naik ke 100 MiB. Gunakan `php artisan uma:restore <file>` jika arsip melebihi batas server HTTP.
- Perencana Jewel menghitung kekurangan Carat secara eksak dan membatasi klaim paket harian sesuai tanggal target.

## [Versi 3.3.5] - 13 November 2026

### Kalibrasi Perencana Jewel dan biaya farming

- Perencana Jewel memakai estimasi login 7 hari, retensi Class 5 sebesar 150 Carat per pekan, dan tiket Standard Training Pass sesuai banner. Hadiah Circle dan reset toko dihitung saat melewati tanggal 1.
- Kalkulator farming membandingkan jumlah tarikan sebelum dan sesudah biaya untuk aset saat ini serta proyeksi target.
- Indikator menampilkan persentase penuh dan membedakan target yang sudah tercapai dari target yang baru tercapai dalam proyeksi.

## [Versi 3.3.4] - 12 November 2026

### Modal Koleksi dan kondisi skill

- Modal detail karakter, detail kartu, komparator, dan katalog skill tampil di atas navbar. Saat detail skill terbuka, Escape menutupnya terlebih dahulu.
- Terjemahan dan formula teknis `order_rate` memakai pembulatan ke bilangan bulat terdekat sebelum menerapkan operator. Koleksi memperbarui teks turunan dari katalog saat data dibaca.
- Syarat evolusi untuk status 7 menampilkan Fast Learner (切れ者). Alternatif dan syarat wajib tetap berada di grup masing-masing.

## [Versi 3.3.3] - 12 November 2026

### Persentil gacha eksak dan afinitas tiga arah

- Persentil gacha gabungan memakai konvolusi binomial eksak untuk pool 3,0% dan 4,5%. Simulator menampilkan persentil teoretis dari rate banner dan menjelaskan jaminan penukaran Spark.
- Kalkulator Afinitas memakai mode 3 arah secara bawaan dengan mode berpasangan sebagai pembanding. Tampilan menghitung kebutuhan poin ke ambang ○ dan ◎, serta menjelaskan simulasi kemenangan G1 bersama dan pengisian slot dari riwayat karier.
- API Afinitas menolak ID balapan G1 di luar katalog. Service mengabaikan ID tersebut saat menghitung bonus.

## [Versi 3.3.2] - 12 November 2026

### Prasyarat Skill Optimizer dan cakupan cadangan

- Skill Optimizer menghitung biaya seluruh prasyarat yang belum dimiliki untuk kandidat biasa dan terkunci. Skill yang melampaui anggaran diberi alasan, dan evaluasi setiap rantai memakai skor skill terakhir.
- Tes integrasi memakai respons HTTP palsu untuk sinkronisasi GameTora, Cygames, GameWith, Muxueuma, dan Umapyoi. Laravel memblokir permintaan tanpa respons palsu.
- Dokumentasi merinci sembilan entitas Backup Schema v2.0 dan penyimpanan terpisah, serta menjelaskan pengali Aptitude untuk skor evaluasi skill dan performa balapan.

## [Versi 3.3.1] - 11 November 2026

### Modal No Debuff dan lokalisasi Circle

- Modal No Debuff dan detail skill tampil di atas navbar.
- Menu Circle menampilkan periode, kontribusi, dan status anggota keluar dalam Bahasa Indonesia.

## [Versi 3.3.0] - 8 November 2026

### Skill Optimizer dan impor skill dari dek

- Optimasi berbasis *grouped knapsack* memilih kombinasi skill berdasarkan anggaran, prasyarat, dan diskon Hint atau Fast Learner.
- Impor skill dari karakter dan preset dek enam kartu ke Kalkulator Rating atau Skill Optimizer. Hint yang muncul di beberapa kartu mendapat saran level.

## [Versi 3.2.0] - 8 November 2026

### Sinkronisasi jadwal dan panduan kompetisi

- Perencana Event menyegarkan jadwal resmi Cygames dan panduan GameWith. Perintah `php artisan uma:sync-competitions` mendukung opsi `--force`.
- Hasil sinkronisasi disimpan di `storage/app/competition_events_live_sync.json`. Rincian lomba diperbarui setelah ada konfirmasi resmi.
- Panduan CM Classic Januari 2027 menambahkan target atribut dan rekomendasi pemulihan stamina.

## [Versi 3.1.6] - 5 November 2026

### Detail skill, koleksi, dan tren Circle

- Detail skill menjelaskan penskalaan khusus, dan detail karakter menunjukkan dampak Aptitude terhadap performa balapan.
- Koleksi menyaring entri karakter duplikat tanpa varian kostum. Grafik Circle berhenti pada akhir periode untuk menghindari penurunan semu.

## [Versi 3.1.5] - 4 November 2026

### Pity di Dasbor dan batas skor karier

- Dasbor menyediakan pemilih banner dengan pity aktif dan menyaring banner yang sudah berakhir lebih dari sebulan.
- Ringkasan Karier memakai Bahasa Indonesia dan membatasi skor evaluasi hingga 200.000 poin.
- Jadwal kompetisi diperbarui mengikuti pengumuman Cygames.

## [Versi 3.1.4] - 30 Oktober 2026

### Rekap banner dan panduan Event

- Rekap pity dan nama banner gacha diperjelas. Kalkulator Rating kembali menampilkan ikon skill GameTora.
- Perencana Event memakai tanggal saat ini, menandai arsip kompetisi selesai, dan memperbarui target atribut GameWith untuk skenario baru.

## [Versi 3.1.3] - 30 Oktober 2026

### Validasi banner dan interval refresh Circle

- Gacha menolak tarikan yang tipe banner atau itemnya tidak cocok dengan pool.
- Penyegaran data Circle dibatasi satu kali per jam. Ringkasan pity di header Gacha disederhanakan.

## [Versi 3.1.2] - 29 Oktober 2026

### Tata letak dan perbaikan Kalkulator Rating

- Filter Karier dan Gacha lebih rapi pada layar yang sempit, dan dialog konfirmasi gacha memakai Bahasa Indonesia.
- Kalkulator Rating memperbaiki pengisian otomatis karakter dan menjaga saran skill tetap terlihat. Jumlah katalog di footer mengikuti hasil sinkronisasi.

## [Versi 3.1.1] - 29 Oktober 2026

### Konsistensi lencana rank di Dasbor

- Dasbor menyelaraskan tampilan lencana rank sesi karier dengan Kalkulator Rating.

## [Versi 3.1.0] - 28 Oktober 2026

### Kalkulator Proyeksi Rating JP

- Karier mendapat kalkulator yang memproyeksikan skor dan rank dari atribut, unique skill, dan skill pilihan.
- Pemilih karakter mengisi Aptitude bawaan, dan hasil proyeksi dapat diterapkan ke formulir karier.

## [Versi 3.0.1] - 28 Oktober 2026

### Kalibrasi ambang rank evaluasi JP

- Ambang rank G hingga LS24 dikalibrasi, termasuk transisi US ke LG. Karier dan OCR menggunakan pemetaan yang sama.

## [Versi 3.0.0] - 27 Oktober 2026

### Simulasi dek enam support card

- Susun dek dengan lima kartu koleksi dan satu kartu pinjaman. Atur limit break dan periksa syarat efek unik dek.
- Lihat efek latihan dan daftar skill gabungan beserta sumbernya. Simpan preset formasi di `storage/app/support_deck_presets.json`.

## [Versi 2.9.2] - 27 Oktober 2026

### Skenario Shuntaisai dan navigasi pencari skill

- Pencarian sumber dari detail skill menutup modal terkait dan membuka Reverse Skill Finder.
- The Shuntaisai Festival tersedia sebagai skenario Karier, dan banner rilisnya dikelompokkan bersama banner anniversary serta skenario baru.

## [Versi 2.9.0] - 19 Oktober 2026

### Pencari skill, komparator kartu, dan retensi cadangan

- Reverse Skill Finder dan katalog skill menambahkan filter taktis serta tautan ke sumber skill dari kartu dan karakter.
- Komparator membandingkan dua support card pada level 0LB–MLB dan menjelaskan efek uniknya.
- Arsip tersimpan di `storage/app/backups/`. Gunakan `php artisan uma:backup --keep=N` untuk menyimpan N cadangan terbaru.

## [Versi 2.8.0] - 15 Oktober 2026

### Target atribut dan rekomendasi pemulihan stamina

- Perencana Event menampilkan target atribut GameWith dan rekomendasi skill pemulihan sesuai jarak lomba, dengan pemisahan skill pemulihan utama dan skill multi-efek.
- Perhitungan hadiah kumulatif League of Heroes, termasuk Platinum 4, dikalibrasi pada Jewel Planner.
- Sesi dan cache aplikasi memakai penyimpanan berkas lokal.

## [Versi 2.7.4] - 13 Oktober 2026

### Lineup Select Pickup dari Cygames

- Sinkronisasi katalog memakai pengumuman resmi Cygames JP untuk memperbarui lineup Select Pickup dan menampilkan sumbernya.

## [Versi 2.7.3] - 13 Oktober 2026

### Identitas event dan perlindungan data saat restore

- Migrasi memberi jadwal kompetisi kunci unik, sehingga sinkronisasi memperbarui event yang sama tanpa menggandakan jadwal.
- Restore mengecualikan jadwal resmi dari impor dan membatalkan seluruh transaksi jika pengisian jadwal gagal. Validasi JSON diperketat dengan tetap mendukung snapshot Circle v0.9.
- Diagram lintasan hanya tampil jika sirkuit dan konfigurasi lomba dapat diidentifikasi.

## [Versi 2.7.2] - 13 Oktober 2026

### Validasi backup dan pemindahan tarikan Twinkle

- Edit massal menghapus status rate-up dari tarikan yang dipindah ke banner Twinkle Collection.
- Restore memvalidasi data target karier, menjaga jadwal resmi saat overwrite, dan mengisi jadwal saat tabelnya kosong.

## [Versi 2.7.1] - 11 Oktober 2026

### Kalibrasi proyeksi Jewel

- Kalkulator Pengorbanan Jewel mengambil saldo awal dari Free dan Paid Carats. Proyeksi memasukkan 50 Carat dari misi harian serta komponen gratis dan berbayar dari Daily Jewel Pack.
- Perencana memperbarui tanggal target yang sudah lewat dan menyediakan pilihan rentang waktu cepat.

## [Versi 2.7.0] - 11 Oktober 2026

### Simulasi pengeluaran Jewel untuk farming

- Kalkulator memperkirakan biaya reroll faktor, Spark Selection, dan Ability Pt, lalu menunjukkan saldo gacha dan kapasitas tarikan yang tersisa.
- Panduan Trainer Ability mengikuti perubahan durasi dan biaya yang diumumkan Cygames.

## [Versi 2.6.3] - 8 Oktober 2026

### Diagram sirkuit dan fase balapan

- Detail kompetisi menampilkan diagram GameTora dan fase balapan untuk lintasan terkonfirmasi, termasuk pilihan putaran dan pratinjau resolusi tinggi.
- Dataset sirkuit ikut diperbarui melalui `php artisan uma:sync-catalog`.

## [Versi 2.6.2] - 8 Oktober 2026

### Penanda keyakinan OCR dan dukungan offline

- Formulir Karier menandai isian OCR dengan keyakinan rendah agar pengguna dapat memeriksanya sebelum menyimpan.
- PWA menyimpan aset GameTora dalam cache dan menampilkan avatar pengganti ketika gambar tidak tersedia saat offline.

## [Versi 2.6.1] - 8 Oktober 2026

### Arsip fans bulanan dan lokalisasi rekomendasi

- Karier menambahkan pemilih bulan sebelumnya, ringkasan performa, dan grafik akumulasi fans terhadap target Circle.
- Deskripsi green skill diterjemahkan ke Bahasa Indonesia, dan jumlah katalog di footer mengikuti data yang tersedia.

## [Versi 2.6.0] - 8 Oktober 2026

### Halaman detail Event dan rekomendasi green skill

- Detail CM dan LoH menjadi halaman tersendiri dengan tautan langsung dan navigasi kembali melalui riwayat browser.
- Rekomendasi green skill mengikuti kondisi lomba resmi. Skill yang bergantung pada cuaca atau kondisi trek acak di LoH ditandai situasional.

## [Versi 2.5.1] - 8 Oktober 2026

### Efek debuff dan kondisi skill

- Detail No Debuff memperjelas nilai, sasaran, dan durasi dasar efek skill.
- Penerjemah kondisi menjelaskan efek lawan yang tergesa-gesa sesuai strategi larinya.

## [Versi 2.5.0] - 7 Oktober 2026

### Perencana Champions Meeting dan League of Heroes

- Perencana menampilkan jadwal resmi Cygames, rincian lomba yang telah diumumkan, dan aturan No Debuff. Dasbor menyorot event terdekat.
- Status event mengikuti tanggal, dan simulasi waktu membantu meninjau jadwal mendatang.
- Analitik Karier menampilkan rincian penggunaan karakter per skenario dan memperbaiki pencocokan avatar.

## [Versi 2.4.1] - 5 Oktober 2026

### Varian karakter dan pool Twinkle

- Gacha memakai nama karakter dengan varian kostum dan menyaring nama dasar dari pilihan tarikan.
- Twinkle Collection mendukung karakter 1★ dan 2★ jika tersedia di pool banner.

## [Versi 2.4.0] - 5 Oktober 2026

### Aturan tarikan Twinkle Collection

- Banner Twinkle Collection membagi rate SSR secara merata di antara karakter 3★ dalam lineup dan menonaktifkan status rate-up.

## [Versi 2.3.0] - 3 Oktober 2026

### Arsip Circle dan analisis Karier

- Circle menandai anggota yang telah keluar dan memungkinkan pengguna melihat statistik bulan sebelumnya.
- Karier menyelaraskan rank otomatis saat sesi diedit dan menampilkan rincian karakter per skenario.

## [Versi 2.2.0] - 3 Oktober 2026

### Kalkulator afinitas silsilah JP

- Susun silsilah tujuh slot, isi slot dari riwayat karier, dan cari pasangan induk dari koleksi.
- Perhitungan memberi bonus +3 poin per kemenangan G1 bersama. Validasi mencegah duplikasi karakter lintas kostum pada slot yang terkait, dan pencocokan ID memperbaiki skor yang sebelumnya nol.

## [Versi 2.1.2] - 2 Oktober 2026

### Format tanggal dan lokalisasi dialog GameTora

- Tabel dan formulir Karier memakai format tanggal Indonesia. Dialog sinkronisasi GameTora diterjemahkan dan lebih mudah dibaca dalam mode gelap.

## [Versi 2.1.1] - 27 September 2026

### Target alternatif dan stabilitas detail karakter

- Detail karakter mengelompokkan target karier alternatif dan kembali dapat dibuka tanpa crash.
- Label sumbu dan tooltip grafik interval pity karakter 3★ diselaraskan.

## [Versi 2.1.0] - 26 September 2026

### Analitik karakter dan terjemahan target karier

- Analitik memperjelas istilah 3★ untuk gacha karakter dan mencegah label bertumpuk pada grafik distribusi kelangkaan.
- Lencana rank LF diperbarui, dan target karier di detail karakter diterjemahkan ke Bahasa Indonesia.

## [Versi 2.0.9] - 26 September 2026

### Analitik gacha terpisah dan rank LF

- Analitik memisahkan gacha karakter dan support card serta menyesuaikan acuan rate dan interval pity dengan pool yang dipilih.
- Karier menambahkan pemetaan rank hingga LF24, pengisian rank dari skor, dan pencocokan alias Jepang serta romaji pada OCR.
- Riwayat pembaruan dapat dibuka dari navbar.

## [Versi 2.0.8] - 26 September 2026

### Terjemahan kondisi skill dan pemulihan metadata

- Detail skill menerjemahkan syarat awal, kondisi aktivasi, dan alternatif, dengan opsi melihat formula asli.
- Perintah `php artisan uma:enrich-skills` memperbarui terjemahan katalog, termasuk skill hadiah dari event dan Dates support card.
- Backup Schema v2.0 menyertakan terjemahan dan target karier. Pratinjau restore menampilkan cakupan data.

## [Versi 2.0.7] - 23 September 2026

### Detail skill dan target karier

- Detail skill menampilkan pemicu terpisah, prasyarat, durasi, dan penskalaan efek. Detail karakter menampilkan kalender target karier.
- Backup mencakup target karier dan metadata skill. Menu navigasi ponsel dapat digulir.

## [Versi 2.0.6] - 23 September 2026

### Hadiah Champions Meeting dan pity setelah Spark

- Jewel Planner menyesuaikan hadiah Grade League dan memisahkan jatah tiket sesuai target banner.
- Pity berlanjut setelah reset Spark, termasuk untuk tarikan baru yang dicatat dengan tanggal banner lampau.

## [Versi 2.0.5] - 23 September 2026

### Edit massal tarikan gacha

- Tarikan terpilih dapat diedit atau dipindahkan ke tipe gacha lain sekaligus. Input gacha membedakan kartu SSR secara visual.

## [Versi 2.0.4] - 23 September 2026

### Validasi status rate-up

- Input dan edit gacha memvalidasi status rate-up terhadap lineup banner, dengan pilihan manual pada Select Pickup.
- Gunakan `php artisan gacha:sanitize-rateup` untuk memperbaiki penandaan rate-up pada riwayat yang sudah tersimpan.

## [Versi 2.0.3] - 23 September 2026

### Statistik karakter, filter kartu, dan verifikasi OCR

- Detail karakter menampilkan atribut dasar, bonus pertumbuhan, dan varian unique skill untuk karakter bawaan 1★ atau 2★. Data ini ikut dicadangkan.
- Koleksi dapat memfilter support card yang belum MLB. Formulir OCR mengingatkan pengguna untuk memeriksa hasil sebelum menyimpan.
- Tombol Log Gacha di Dasbor lebih mudah dibaca dalam mode gelap.

## [Versi 2.0.2] - 23 September 2026

### Lineup Select Pickup dan detail event kartu

- Pilihan banner karakter menyaring kategori Select Pickup yang khusus support card. Lineup Select Pickup diperbarui dari Umapyoi News.
- Support card tipe Friend dan Group menampilkan tab Dates. Skill hadiah event dan Dates dapat dibuka untuk melihat detail efek.
- Grafik distribusi kelangkaan mengurangi tumpang tindih angka tengah dan tooltip.

## [Versi 2.0.1] - 20 September 2026

### Sinkronisasi banner baru dan kontrol Select Pickup

- Sinkronisasi GameTora menambahkan cara cadangan untuk mengambil lineup banner baru, termasuk debut Rose Kingdom.
- Judul Select Pickup memakai bulan dan tahun. Pengguna dapat mencatat status rate-up secara manual untuk banner tersebut.

## [Versi 2.0.0] - 19 September 2026

### Backup Schema v2.0 dan rate per banner

- Backup Schema v2.0 mendukung pemulihan transaksional dan pencocokan relasi katalog. Import menerima versi 0.9, 1.0, dan 2.0 serta menolak data banner tanpa rate dasar yang valid.
- Gacha menyimpan rate dasar per banner, membedakan pool 3,0% dan 4,5%, menyaring banner berbayar, dan menghitung pity per banner.

## [Versi 1.9.0] - 17 September 2026

### Skill evolusi dan detail kartu GameTora

- Detail karakter menampilkan syarat evolusi dan pratinjau ilustrasi penuh. Detail support card menampilkan efek 0LB–MLB dan pilihan hadiah event.
- Gunakan `php artisan uma:sync-catalog --force` untuk memuat ulang detail katalog. Riwayat gacha dan karier dapat diedit.

## [Versi 1.8.0] - 17 September 2026

### Simulator probabilitas gacha dan pohon skill

- Simulator menampilkan persentil gacha dan peluang mendapatkan item target berdasarkan rate dan jumlah tarikan.
- Sinkronisasi GameTora memuat Aptitude dan pohon skill karakter. PWA mendapat ikon wortel.

## [Versi 1.7.1] - 17 September 2026

### Perbaikan pengisian OCR dan peluncuran PWA

- Impor screenshot mengisi formulir Karier dengan lebih andal dan lebih mudah dibaca dalam mode gelap.
- PWA yang dipasang dari peramban kembali membuka halaman utama saat diluncurkan.

## [Versi 1.7.0] - 17 September 2026

### Gambar koleksi dan perencanaan Carat serta tiket

- Koleksi menampilkan gambar karakter dan support card dari GameTora JP.
- Jewel Planner memisahkan tiket karakter dan support card serta menambahkan perolehan dari Friendship Shop dan Cleat Shop.

## [Versi 1.6.0] - 17 September 2026

### Koleksi karakter dan support card JP

- Menu Koleksi mencatat kepemilikan karakter, tingkat bintang, serta limit break support card dan mendukung sinkronisasi GameTora.
- Tooltip Analitik lebih mudah dibaca dalam mode gelap.

## [Versi 1.5.1] - 17 September 2026

### Kalibrasi hadiah dan tren fans di Dasbor

- Jewel Planner menyesuaikan Training Pass dan pilihan hadiah Champions Meeting, League of Heroes, serta event rutin. Tab Perencana kembali dapat dibuka tanpa crash.
- Dasbor menampilkan tren akumulasi fans dengan filter periode. Kontras mode gelap diperbaiki di beberapa menu.

## [Versi 1.5.0] - 17 September 2026

### Ritme Circle, Jewel Planner, dan impor screenshot

- Circle menampilkan kebutuhan fans dan estimasi jumlah sesi karier per hari. Jewel Planner memproyeksikan kesiapan Spark dari saldo, tiket, dan pendapatan JP.
- OCR screenshot mengisi formulir Karier di peramban.
- Aplikasi dapat dipasang sebagai PWA dan menyediakan navigasi bawah di ponsel.

## [Versi 1.4.0] - 17 September 2026

### Input 10 tarikan dan analitik interaktif

- Input cepat mencatat 10 tarikan sekaligus dan memperbarui pity per banner.
- Menu Analitik menampilkan tren fans, perbandingan skenario, distribusi kelangkaan, dan interval SSR. Riwayat Karier dan Gacha mendapat filter, paginasi, dan hapus massal.

## [Versi 1.3.1] - 16 September 2026

### Banner wajib dan keterbacaan Dasbor

- Gacha mewajibkan pemilihan banner JP untuk setiap tarikan. Tanggal dan label rate-up di Dasbor lebih mudah dibaca dalam mode gelap.

## [Versi 1.3.0] - 16 September 2026

### Banner aktif dan lineup Twinkle

- Dasbor memperbaiki pemilihan banner JP yang sedang berlangsung dan menyelaraskan lineup Twinkle Collection serta bintang dasar karakter dari sumber katalog.

## [Versi 1.2.0] - 16 September 2026

### Roster GameTora, Karier, dan pelacakan Circle

- Roster menyaring NPC dan menampilkan varian karakter serta bintang dasar. Sinkronisasi tersedia lewat `php artisan uma:sync-catalog` atau `php artisan uma:sync-gametora`, dan roster ikut dalam cadangan.
- Karier menambahkan ringkasan performa karakter, mode pelatihan, dan sinkronisasi target Circle.
- Gacha memperbaiki pity per banner dan menampilkan banner aktif di Dasbor. Circle mendukung pemantauan lewat ID Muxueuma.

## [Versi 1.1.0] - 15 September 2026

### Peluncuran Gacha Tracker

- Gacha Tracker mencatat tarikan per banner, menghitung pity dan rate SSR, serta memantau progres Spark.
- Katalog banner JP dapat disinkronkan dengan `php artisan uma:sync-gametora`.

## [Versi 1.0.0] - 15 September 2026

### Peluncuran Uma Musume Pretty Derby Companion

- Rilis perdana mencatat sesi karier dan perolehan fans, merangkum performa per skenario, serta memantau target bulanan Circle.
- Cadangan JSON mendukung mode merge dan overwrite melalui `php artisan uma:backup` dan `php artisan uma:restore`.
