import React, { useState, useEffect } from 'react';
import { 
    Calculator, 
    Info, 
    RotateCcw, 
    Coins, 
    Flame, 
    Sparkles, 
    Zap, 
    X, 
    ExternalLink, 
    CheckCircle2, 
    AlertTriangle,
    Layers,
    BookOpen,
    Calendar,
    ArrowRight
} from 'lucide-react';

/**
 * Detailed Information Database for each Feature Popup
 * Verified against Japanese community guides (GameWith & KamiGame) and official Cygames JP news #3497.
 */
const FEATURE_INFO = {
    available_jewels: {
        id: 'available_jewels',
        title: 'Jewel yang Tersedia (Carat / ジュエル)',
        badge: 'Saldo Terisi Otomatis',
        badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        summary: 'Jumlah total Jewel (Free Carat + Paid Carat) yang terisi otomatis langsung dari Saldo Aset Saat Ini.',
        description: 'Di game Uma Musume JP, Jewel (Carat) adalah mata uang utama untuk melakukan tarikan gacha karakter dan support card, pemulihan TP/RP, serta berbagai fitur optimasi pelatihan kompetitif.',
        details: [
            {
                label: 'Sinkronisasi Otomatis 100%',
                text: 'Angka ini terisi otomatis dan tersinkronisasi secara realtime dari total Free Carats + Paid Carats pada card Saldo Aset Saat Ini tanpa perlu diinput manual.',
            },
            {
                label: 'Ketentuan Gacha Server JP',
                text: '1x Pull berbiaya 150 Jewel, 10x Pull berbiaya 1.500 Jewel, dan 1x Pity Spark (200 pulls) membutuhkan 30.000 Jewel.',
            },
            {
                label: 'Tujuan Simulasi',
                text: 'Membantu trainer memperkirakan apakah sisa saldo Jewel setelah aktivitas farming masih mencukupi untuk mencapai target Spark banner impian.',
            },
        ],
        mechanics: [
            'Saldo modal diambil langsung secara dinamis dari data Saldo Aset Saat Ini.',
            'Pengeluaran farming akan mengurangi saldo ini untuk menampilkan sisa alokasi gacha.',
        ],
        source: {
            name: 'GameWith & KamiGame Uma Musume Database',
            url: 'https://gametora.com/umamusume',
            note: 'Standar resmi server Jepang: 150 Carat / pull, 30.000 Carat / Spark.',
        },
    },
    factor_reroll: {
        id: 'factor_reroll',
        title: 'Jumlah Reroll Faktor (因子再獲得 - Factor Re-acquire)',
        badge: '30 Jewel / Reroll',
        badgeColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
        summary: 'Fitur pengundian ulang faktor (inji) pada layar akhir setelah sesi latihan karakter selesai.',
        description: 'Ketika sesi latihan (U.R.A, Aoharu, Grand Live, L\'Arc, U.A.F, dll.) selesai, karakter akan memperoleh faktor warisan (Blue Factor, Red Factor, Green Factor, dan White Factor). Jika hasil roll pertama kurang memuaskan, trainer dapat melakukan pengundian ulang untuk mengincar faktor bintang 3 atau skill putih unggulan.',
        details: [
            {
                label: 'Roll Pertama (Bawaan)',
                text: 'Gratis Jewel, hanya mengonsumsi 30 TP (Toughness Points).',
            },
            {
                label: 'Roll Kedua & Seterusnya',
                text: 'Mengonsumsi 30 Jewel per kali reroll (maksimal kesempatan reroll tergantung event kampanye).',
            },
            {
                label: 'Pengecualian Gratis (Pass Bulanan)',
                text: 'Jika trainer membeli "Factor Re-acquire Pass" (因子再獲得パス, seharga 500 JPY untuk 30 hari), seluruh biaya Jewel menjadi 0 (Gratis tanpa batas reroll).',
            },
        ],
        mechanics: [
            'Biaya: 30 Jewel dikalikan dengan jumlah pengundian ulang yang direncanakan.',
            'Sangat sering dilakukan oleh trainer kompetitif (inji farmer) untuk mencetak indukan sempurna (parent/grandparent bintang 9).',
        ],
        source: {
            name: 'GameWith (ウマ娘 因子再獲得のやり方と仕様) & KamiGame',
            url: 'https://gametora.com/umamusume',
            note: 'Terkonfirmasi: 30 Jewel per reroll jika tanpa Factor Re-acquire Pass (500 JPY/bln).',
        },
    },
    spark_selection: {
        id: 'spark_selection',
        title: 'Penggunaan Spark Selection (因子指定 - Factor Designation)',
        badge: '100 Jewel / Penggunaan',
        badgeColor: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
        summary: 'Fitur penguncian spesifik kategori faktor (Blue Stat atau Red Aptitude) agar pasti masuk undian faktor akhir.',
        description: 'Fitur penetapan faktor (sering disebut Spark Selection atau Factor Designation) memungkinkan trainer untuk mengunci satu jenis faktor tertentu (misalnya Blue Factor: Stamina/Power atau Red Factor: Jarak Menengah/Turf dengan syarat aptitude minimal A) agar dipastikan muncul ke dalam slot hasil undian karakter akhir.',
        details: [
            {
                label: 'Biaya Standar Tanpa Pass',
                text: 'Mengonsumsi 100 Jewel per kali penggunaan saat sesi latihan selesai.',
            },
            {
                label: 'Pengecualian Pass Bulanan',
                text: 'Jika trainer membeli "Factor Designation Pass" (因子指定パス, langganan bulanan ~800–980 JPY), fitur pemilihan faktor ini dapat digunakan tanpa konsumsi Jewel.',
            },
            {
                label: 'Tiket Khusus',
                text: 'Jika memiliki tiket designated factor khusus dari hadiah event/misi, tiket akan dikonsumsi terlebih dahulu sebelum memotong Jewel.',
            },
        ],
        mechanics: [
            'Biaya: 100 Jewel dikalikan dengan frekuensi pemilihan faktor spesifik.',
            'Menghilangkan keacakan kategori status sehingga peluang mendapat stat bintang 3 yang diinginkan meningkat drastis.',
        ],
        source: {
            name: 'KamiGame (因子指定機能の使い方と消費ジュエル) & GameWith',
            url: 'https://gametora.com/umamusume',
            note: 'Terkonfirmasi: 100 Jewel per penggunaan jika tidak memiliki pass atau tiket khusus.',
        },
    },
    ability_pt: {
        id: 'ability_pt',
        title: 'Ability Pt yang Dibeli (トレーナーアビリティ - Trainer Ability Pt)',
        badge: '1 Jewel / 1 Pt • Update Resmi 14 Okt',
        badgeColor: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
        summary: 'Sistem buff latihan resmi 5.5th Half Anniversary dengan spesifikasi baru per 14 Oktober 2026 (durasi 12 menit & biaya pt turun hingga 80%).',
        description: 'Fitur Trainer Ability (トレーナーアビリティ) dirilis pada pembaruan 5.5th Half Anniversary server Jepang (24 Agustus 2026). Melalui pengumuman resmi Cygames pada 14 Oktober 2026 pukul 11:30 JST (News #3497), spesifikasi fitur ini disempurnakan: durasi efektif per 1x aktivasi diubah dari 1 jam menjadi 12 menit agar pas untuk 1 run pelatihan, dan seluruh kebutuhan Ability Pt diturunkan secara proporsional (turun 80% / rasio 1/5).',
        details: [
            {
                label: 'Mata Uang Khusus Ability Pt',
                text: 'Efek buff diaktifkan menggunakan Ability Pt yang diperoleh dari Training Pass (Standard & Premium) dan misi event.',
            },
            {
                label: 'Ketentuan Penambalan Jewel (1 Pt = 1 Jewel)',
                text: 'Apabila stok Ability Pt tidak mencukupi saat hendak mengaktifkan buff, trainer dapat menambal kekurangan tersebut langsung menggunakan Jewel dengan rasio resmi 1 Jewel per 1 Ability Pt.',
            },
            {
                label: 'Perubahan Durasi Efek: 1 Jam → 12 Menit',
                text: 'Mulai 14 Oktober 2026 (11:30 JST), masa aktif buff diubah dari semula 1 jam menjadi 12 menit per 1x aktivasi agar pas dengan durasi 1 sesi run normal tanpa membuang sisa waktu.',
            },
            {
                label: 'Rencana Fitur Auto-Aktivasi (Akhir Tahun 2026)',
                text: 'Cygames menjadwalkan implementasi fitur Auto-Activate (mengaktifkan Trainer Ability secara otomatis saat memulai pelatihan selama rentang waktu yang ditentukan) sebelum akhir tahun 2026.',
            },
        ],
        adjustments: [
            { nameJp: '勉強家付与', nameId: 'Pemberian Pelajar Giat (Diskon Skill Pt 4%)', before: '40 pt', after: '8 pt' },
            { nameJp: 'メンタルガード付与', nameId: 'Pemberian Mental Guard (Anti Motivasi Turun)', before: '10 pt', after: '2 pt' },
            { nameJp: 'リカバリー精神付与', nameId: 'Pemberian Semangat Pemulihan', before: '10 pt', after: '2 pt' },
            { nameJp: '相性ボーナス上昇', nameId: 'Peningkatan Bonus Kompatibilitas Silsilah', before: '10 pt', after: '2 pt' },
            { nameJp: '固有因子発動', nameId: 'Aktivasi Faktor Unik (Unique Factor)', before: '15 pt', after: '3 pt' },
            { nameJp: '汎用因子追加抽選', nameId: 'Tambahan Undian Faktor Umum (White Factor)', before: '20 pt', after: '4 pt' },
            { nameJp: '獲得因子強化', nameId: 'Penguatan Faktor yang Didapat (Kualitas Bintang)', before: '20 pt', after: '4 pt' },
            { nameJp: 'レース再挑戦回数増加', nameId: 'Penambahan Kesempatan Balapan Ulang (Continue)', before: '5 pt', after: '1 pt' },
        ],
        mechanics: [
            'Biaya: 1 Jewel per 1 Ability Pt yang dibeli/ditambal.',
            'Dengan penyesuaian biaya baru (hanya butuh 1–8 Pt per buff), biaya Jewel yang dibutuhkan saat menambal menjadi jauh lebih hemat.',
        ],
        source: {
            name: 'Pengumuman Resmi Cygames JP (News #3497)',
            url: 'https://umamusume.jp/news/detail?id=3497',
            note: 'Terkonfirmasi resmi per 14/10/2026 11:30 JST: Durasi disesuaikan menjadi 12 menit dan kebutuhan Ability Pt diturunkan proporsional 5x lipat.',
        },
    },
};

/**
 * Modal Popup component to explain each feature with detailed verified mechanics
 */
function InfoModal({ featureKey, onClose }) {
    const info = FEATURE_INFO[featureKey];

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    if (!info) return null;

    return (
        <div 
            className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-5 animate-scaleUp overflow-hidden max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black border ${info.badgeColor}`}>
                                <Sparkles className="w-3 h-3" />
                                <span>{info.badge}</span>
                            </span>
                        </div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">
                            {info.title}
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                        title="Tutup"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Summary / Lead */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    {info.summary}
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Penjelasan & Mekanisme Game</span>
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {info.description}
                    </p>
                </div>

                {/* Detail Points */}
                <div className="space-y-2.5">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Rincian Ketentuan & Jadwal</span>
                    </h4>
                    <div className="space-y-2">
                        {info.details.map((item, idx) => (
                            <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 space-y-0.5">
                                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                                    • {item.label}
                                </span>
                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                    {item.text}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Optional Table of Ability Pt Adjustments (Cygames News #3497) */}
                {info.adjustments && (
                    <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                <Flame className="w-3.5 h-3.5 text-rose-500" />
                                <span>Penyesuaian Biaya Ability Pt (Cygames 14 Okt 2026)</span>
                            </h4>
                            <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                                Turun 80% (1/5)
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {info.adjustments.map((adj, i) => (
                                <div key={i} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                                    <div className="truncate mr-2">
                                        <div className="font-bold text-slate-900 dark:text-white truncate">
                                            {adj.nameJp}
                                        </div>
                                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                            {adj.nameId}
                                        </div>
                                    </div>
                                    <div className="shrink-0 flex items-center gap-1 font-mono font-bold">
                                        <span className="line-through text-slate-400 text-[11px]">{adj.before}</span>
                                        <span className="text-slate-400 text-[10px]">→</span>
                                        <span className="text-emerald-600 dark:text-emerald-400 text-xs font-black">{adj.after}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Source Confirmation Badge */}
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-start justify-between gap-2.5 text-xs">
                    <div className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                            <div className="font-bold">Dikonfirmasi Sumber Resmi ({info.source.name})</div>
                            <p className="text-[11px] opacity-90 leading-relaxed">
                                {info.source.note}
                            </p>
                        </div>
                    </div>
                    {info.source.url && (
                        <a
                            href={info.source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 p-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 transition-colors"
                            title="Buka pengumuman resmi di tab baru"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    )}
                </div>

                {/* Footer Action */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 transition-colors cursor-pointer shadow-xs"
                    >
                        Mengerti & Tutup
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * JewelSacrificeCalculator Component
 * Provides text box inputs (NO sliders) for factor rerolls, spark selections, and Ability Pt,
 * with popups explaining each feature and real-time reactive calculations matching the design.
 */
export default function JewelSacrificeCalculator({ currentCarats = 140000 }) {
    // Jewel yang tersedia auto-fill langsung dari Saldo Aset Saat Ini (Free + Paid Carats)
    const availableJewels = typeof currentCarats === 'number' ? currentCarats : 140000;

    // Inputs (Defaults match standard simulation counts)
    const [rerollCount, setRerollCount] = useState(50);
    const [sparkSelectionCount, setSparkSelectionCount] = useState(30);
    const [abilityPtCount, setAbilityPtCount] = useState(400);

    // Active popup for info
    const [activeInfoModal, setActiveInfoModal] = useState(null);

    // Calculations
    const costReroll = rerollCount * 30;
    const costSparkSelection = sparkSelectionCount * 100;
    const costAbilityPt = abilityPtCount * 1;

    const totalFarmingCost = costReroll + costSparkSelection + costAbilityPt;
    const remainingJewels = Math.max(0, availableJewels - totalFarmingCost);

    // Pull equivalents (Official JP Server: 150 Carat / pull, 1.500 Carat / 10-pull)
    const pullsLost = Math.floor(totalFarmingCost / 150);
    const tenPullsLost = (totalFarmingCost / 1500).toFixed(1);

    // Reset handler (kembalikan input simulasi ke 0)
    const handleReset = () => {
        setRerollCount(0);
        setSparkSelectionCount(0);
        setAbilityPtCount(0);
    };

    // Preset to image example (50 rerolls, 30 spark selections, 400 ability pt)
    const handleSetExamplePreset = () => {
        setRerollCount(50);
        setSparkSelectionCount(30);
        setAbilityPtCount(400);
    };

    // Helper for safe integer inputs
    const handleNumberChange = (setter, val, max = 9999999) => {
        const clean = val.replace(/[^0-9]/g, '');
        if (clean === '') {
            setter(0);
            return;
        }
        const num = Math.min(max, parseInt(clean, 10));
        setter(isNaN(num) ? 0 : num);
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                        <Flame className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                            Kalkulator Pengorbanan Jewel
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Simulasi kebutuhan Jewel untuk farming vs sisa alokasi gacha
                        </p>
                    </div>
                </div>

                {/* Preset quick buttons */}
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <button
                        type="button"
                        onClick={handleReset}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 transition-colors cursor-pointer flex items-center gap-1"
                        title="Reset seluruh input farming ke 0"
                    >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleSetExamplePreset}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition-colors cursor-pointer"
                        title="Terapkan preset simulasi default (50 reroll, 30 spark, 400 Pt)"
                    >
                        Preset Contoh (4.900)
                    </button>
                </div>
            </div>

            {/* Form Fields: All in Text Box / Number Inputs (NO Sliders) */}
            <div className="space-y-4">
                {/* 1. Jewel yang tersedia (Auto-fill dari Saldo Aset Saat Ini) */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <Coins className="w-3.5 h-3.5 text-amber-500" />
                            <span>Jewel yang tersedia</span>
                            <button
                                type="button"
                                onClick={() => setActiveInfoModal('available_jewels')}
                                className="text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                                title="Klik untuk penjelasan fungsi Jewel yang tersedia"
                            >
                                <Info className="w-3.5 h-3.5" />
                            </button>
                        </label>
                        <span className="text-xs font-mono font-black text-slate-900 dark:text-white">
                            {availableJewels.toLocaleString('id-ID')} <span className="text-[10px] font-bold text-slate-500">Jewel</span>
                        </span>
                    </div>

                    {/* Auto-filled synchronized display card */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70 flex items-center justify-between gap-2">
                        <div className="space-y-0.5">
                            <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Auto-fill dari Saldo Aset Saat Ini</span>
                            </div>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                                Tersinkronisasi otomatis dari Free Carats + Paid Carats
                            </span>
                        </div>
                        <div className="text-right shrink-0">
                            <div className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                                {availableJewels.toLocaleString('id-ID')}
                            </div>
                            <span className="text-[10px] font-mono text-slate-400 block font-bold">
                                {Math.floor(availableJewels / 150)} Pulls Gacha
                            </span>
                        </div>
                    </div>
                </div>

                {/* 2. Jumlah reroll faktor */}
                <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <span>Jumlah reroll faktor</span>
                            <button
                                type="button"
                                onClick={() => setActiveInfoModal('factor_reroll')}
                                className="text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 transition-colors cursor-pointer"
                                title="Klik untuk penjelasan fungsi Reroll Faktor (30 Jewel/reroll)"
                            >
                                <Info className="w-3.5 h-3.5" />
                            </button>
                        </label>
                        <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-mono text-slate-400">
                                ({costReroll.toLocaleString()} Jewel)
                            </span>
                            <span className="text-xs font-mono font-black text-slate-900 dark:text-white">
                                {rerollCount} kali
                            </span>
                        </div>
                    </div>

                    <div className="relative">
                        <input
                            type="text"
                            inputMode="numeric"
                            value={rerollCount === 0 ? '0' : rerollCount.toString()}
                            onChange={(e) => handleNumberChange(setRerollCount, e.target.value, 10000)}
                            placeholder="0"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                            kali
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span>Simulasi 30 Jewel per reroll.</span>
                        <div className="flex items-center gap-1">
                            {[0, 10, 30, 50, 100].map((num) => (
                                <button
                                    key={num}
                                    type="button"
                                    onClick={() => setRerollCount(num)}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer ${
                                        rerollCount === num
                                            ? 'bg-amber-500 text-white font-bold'
                                            : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    {num}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 3. Jumlah penggunaan spark selection */}
                <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <span>Jumlah penggunaan spark selection</span>
                            <button
                                type="button"
                                onClick={() => setActiveInfoModal('spark_selection')}
                                className="text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                                title="Klik untuk penjelasan fungsi Spark Selection (100 Jewel/penggunaan)"
                            >
                                <Info className="w-3.5 h-3.5" />
                            </button>
                        </label>
                        <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-mono text-slate-400">
                                ({costSparkSelection.toLocaleString()} Jewel)
                            </span>
                            <span className="text-xs font-mono font-black text-slate-900 dark:text-white">
                                {sparkSelectionCount} kali
                            </span>
                        </div>
                    </div>

                    <div className="relative">
                        <input
                            type="text"
                            inputMode="numeric"
                            value={sparkSelectionCount === 0 ? '0' : sparkSelectionCount.toString()}
                            onChange={(e) => handleNumberChange(setSparkSelectionCount, e.target.value, 10000)}
                            placeholder="0"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                            kali
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span>100 Jewel per penggunaan jika tidak memiliki pass atau tiket.</span>
                        <div className="flex items-center gap-1">
                            {[0, 10, 30, 50].map((num) => (
                                <button
                                    key={num}
                                    type="button"
                                    onClick={() => setSparkSelectionCount(num)}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer ${
                                        sparkSelectionCount === num
                                            ? 'bg-indigo-500 text-white font-bold'
                                            : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    {num}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 4. Ability Pt yang dibeli */}
                <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <span>Ability Pt yang dibeli</span>
                            <button
                                type="button"
                                onClick={() => setActiveInfoModal('ability_pt')}
                                className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer"
                                title="Klik untuk penjelasan fungsi Trainer Ability Pt (1 Jewel/Pt & penyesuaian 14 Okt)"
                            >
                                <Info className="w-3.5 h-3.5" />
                            </button>
                        </label>
                        <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-mono text-slate-400">
                                ({costAbilityPt.toLocaleString()} Jewel)
                            </span>
                            <span className="text-xs font-mono font-black text-slate-900 dark:text-white">
                                {abilityPtCount} Pt
                            </span>
                        </div>
                    </div>

                    <div className="relative">
                        <input
                            type="text"
                            inputMode="numeric"
                            value={abilityPtCount === 0 ? '0' : abilityPtCount.toString()}
                            onChange={(e) => handleNumberChange(setAbilityPtCount, e.target.value, 100000)}
                            placeholder="0"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                            Pt
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span>Simulasi dengan asumsi 1 Jewel per 1 Ability Pt.</span>
                        <div className="flex items-center gap-1">
                            {[0, 100, 400, 1000].map((num) => (
                                <button
                                    key={num}
                                    type="button"
                                    onClick={() => setAbilityPtCount(num)}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer ${
                                        abilityPtCount === num
                                            ? 'bg-rose-500 text-white font-bold'
                                            : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    {num}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Results Output Block */}
            <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 space-y-3">
                {/* Total Jewel untuk farming */}
                <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
                        Total Jewel untuk farming
                    </span>
                    <span className="text-lg sm:text-xl font-mono font-black text-rose-500 dark:text-rose-400">
                        {totalFarmingCost.toLocaleString()}
                    </span>
                </div>

                {/* Sisa Jewel untuk gacha */}
                <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
                        Sisa Jewel untuk gacha
                    </span>
                    <span className="text-lg sm:text-xl font-mono font-black text-emerald-500 dark:text-emerald-400">
                        {remainingJewels.toLocaleString()}
                    </span>
                </div>

                {/* Official JP Server Note */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {totalFarmingCost > 0 ? (
                        <p className="text-emerald-700 dark:text-emerald-400 font-medium">
                            💡 Standar Resmi Server JP (150 Jewel/pull): Pengeluaran di atas setara dengan mengorbankan <strong>{pullsLost} Pull</strong> (~{tenPullsLost}x 10-Pull) dari modal tabungan gacha Anda.
                        </p>
                    ) : (
                        <p>
                            💡 Standar Resmi Server JP: 1x Pull = 150 Jewel, 10x Pull = 1.500 Jewel, 1x Spark (200 pulls) = 30.000 Jewel.
                        </p>
                    )}
                </div>

                {/* Reset button */}
                <button
                    type="button"
                    onClick={handleReset}
                    className="w-full py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
                >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset simulasi</span>
                </button>
            </div>

            {/* Popup Modal Detail for Feature Info */}
            {activeInfoModal && (
                <InfoModal 
                    featureKey={activeInfoModal} 
                    onClose={() => setActiveInfoModal(null)} 
                />
            )}
        </div>
    );
}
