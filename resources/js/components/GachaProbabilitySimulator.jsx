import React, { useState, useMemo } from 'react';
import { 
    Sparkles, 
    Percent, 
    Calculator, 
    HelpCircle, 
    Dice5, 
    TrendingUp, 
    AlertTriangle, 
    CheckCircle2, 
    Info, 
    Flame, 
    Coins, 
    Ticket, 
    RotateCcw,
    ChevronRight,
    Award,
    ShieldAlert,
    Sliders
} from 'lucide-react';

/**
 * Lanczos logGamma approximation for high precision factorial math in JS without overflow
 */
function logGamma(x) {
    const p = [
        1.000000000190015,
        76.18009172947146,
        -86.50532032941677,
        24.01409824083091,
        -1.231739572450155,
        0.001208650973866179,
        -0.000005395239384953,
    ];

    let y = x;
    let tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    let ser = p[0];
    for (let j = 1; j <= 6; j++) {
        y += 1.0;
        ser += p[j] / y;
    }

    return -tmp + Math.log(2.5066282746310005 * ser / x);
}

/**
 * Standard error function erf(x) approximation
 */
function erf(x) {
    const sign = x < 0 ? -1.0 : 1.0;
    const absX = Math.abs(x);

    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const t = 1.0 / (1.0 + p * absX);
    const y = 1.0 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX));

    return sign * y;
}

/**
 * Compute Cumulative Binomial Distribution P(X <= k) for n trials with success rate p
 */
function computeBinomialCdf(n, k, p) {
    if (n <= 0) return 50.0;
    if (k < 0) return 0.0;
    if (k >= n) return 100.0;
    if (p <= 0.0) return 100.0;
    if (p >= 1.0) return k >= n ? 100.0 : 0.0;

    // Exact summation using log-gamma for n <= 3000
    if (n <= 3000) {
        let sum = 0.0;
        const logP = Math.log(p);
        const log1p = Math.log(1.0 - p);

        for (let x = 0; x <= k; x++) {
            const logCoeff = logGamma(n + 1) - logGamma(x + 1) - logGamma(n - x + 1);
            const logProb = logCoeff + (x * logP) + ((n - x) * log1p);
            sum += Math.exp(logProb);
        }

        return Math.round(Math.min(1.0, Math.max(0.0, sum)) * 10000) / 100;
    }

    // Normal approximation with continuity correction
    const mean = n * p;
    const variance = n * p * (1.0 - p);
    const stdDev = Math.sqrt(variance);

    if (stdDev <= 0) return k >= mean ? 100.0 : 0.0;

    const z = (k + 0.5 - mean) / stdDev;
    const cdf = 0.5 * (1.0 + erf(z / Math.SQRT2));

    return Math.round(Math.min(1.0, Math.max(0.0, cdf)) * 10000) / 100;
}

/**
 * Determine Luck Tier information from percentile
 */
function getLuckTier(percentile) {
    if (percentile >= 85.0) {
        return {
            tier: 'blessed',
            label: 'Blessed / Ultra Lucky',
            sub: 'Keberuntungan tingkat dewa! Lebih beruntung dari 85% trainer lainnya.',
            badgeClass: 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black shadow-lg shadow-amber-500/20 border-amber-300',
            bgCard: 'bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-transparent border-amber-400/40 dark:border-amber-500/30',
            color: 'text-amber-500',
            barColor: 'from-amber-400 to-yellow-500',
            icon: Sparkles,
        };
    }
    if (percentile >= 60.0) {
        return {
            tier: 'lucky',
            label: 'Above Average / Lucky',
            sub: 'Hasil gacha Anda di atas rata-rata! SSR datang lebih sering dari probabilitas dasar.',
            badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-400 font-black',
            bgCard: 'bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border-emerald-300 dark:border-emerald-800',
            color: 'text-emerald-500',
            barColor: 'from-emerald-400 to-teal-500',
            icon: Award,
        };
    }
    if (percentile >= 40.0) {
        return {
            tier: 'average',
            label: 'Average / On-Rate',
            sub: 'Hasil gacha normal dan sesuai dengan benchmark resmi rate game (on-rate).',
            badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-400 font-black',
            bgCard: 'bg-gradient-to-br from-blue-500/10 via-sky-500/5 to-transparent border-blue-300 dark:border-blue-800',
            color: 'text-blue-500',
            barColor: 'from-blue-400 to-sky-500',
            icon: TrendingUp,
        };
    }
    if (percentile >= 15.0) {
        return {
            tier: 'unlucky',
            label: 'Unlucky',
            sub: 'Kurang beruntung. Jumlah SSR yang diperoleh di bawah ekspektasi rata-rata.',
            badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-400 font-black',
            bgCard: 'bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border-amber-300 dark:border-amber-800',
            color: 'text-amber-600',
            barColor: 'from-amber-400 to-orange-500',
            icon: AlertTriangle,
        };
    }
    return {
        tier: 'cursed',
        label: 'Cursed / Extreme Salty',
        sub: 'Zona garam ekstrem! Berada di 15% paling tidak beruntung, spark sangat disarankan.',
        badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-400 font-black',
        bgCard: 'bg-gradient-to-br from-rose-500/10 via-red-500/5 to-transparent border-rose-300 dark:border-rose-800',
        color: 'text-rose-600',
        barColor: 'from-rose-500 to-red-600',
        icon: ShieldAlert,
    };
}

export default function GachaProbabilitySimulator({ stats, onNotify }) {
    // -------------------------------------------------------------
    // FEATURE 1: Account Luck Percentile State
    // -------------------------------------------------------------
    const [luckPool, setLuckPool] = useState('overall'); // 'overall', 'standard', 'boosted', 'custom'
    const [customPulls, setCustomPulls] = useState(100);
    const [customSsr, setCustomSsr] = useState(3);
    const [customRate, setCustomRate] = useState(3.0);

    // Read live pool data from server stats
    const pools = stats?.pools || {};
    const stdPool = pools.standard || { total_pulls: 0, ssr_count: 0, base_rate: 3.0 };
    const bstPool = pools.boosted || { total_pulls: 0, ssr_count: 0, base_rate: 4.5 };
    const allPool = pools.all || { total_pulls: 0, ssr_count: 0, base_rate: 3.0 };

    // Active Luck data based on selected pool
    const activeLuckData = useMemo(() => {
        if (luckPool === 'custom') {
            const n = Math.max(0, parseInt(customPulls, 10) || 0);
            const k = Math.max(0, parseInt(customSsr, 10) || 0);
            const p = Math.max(0.001, parseFloat(customRate) / 100.0 || 0.03);
            const pct = n > 0 ? computeBinomialCdf(n, k, p) : 50.0;
            const expected = Math.round(n * p * 10) / 10;
            const ssrRate = n > 0 ? Math.round((k / n) * 10000) / 100 : 0.0;

            return {
                name: 'Kalkulator Kustom (Simulasi Bebas)',
                total_pulls: n,
                ssr_count: k,
                base_rate: Math.round(p * 10000) / 100,
                ssr_rate: ssrRate,
                expected_ssr: expected,
                percentile: pct,
                is_custom: true,
            };
        }

        if (luckPool === 'standard') {
            const n = stdPool.total_pulls || 0;
            const k = stdPool.ssr_count || 0;
            const pct = n > 0 ? computeBinomialCdf(n, k, 0.03) : 50.0;
            return {
                name: 'Banner Standar (Base Rate 3.0%)',
                total_pulls: n,
                ssr_count: k,
                base_rate: 3.0,
                ssr_rate: stdPool.ssr_rate || 0.0,
                expected_ssr: Math.round(n * 0.03 * 10) / 10,
                percentile: pct,
            };
        }

        if (luckPool === 'boosted') {
            const n = bstPool.total_pulls || 0;
            const k = bstPool.ssr_count || 0;
            const pct = n > 0 ? computeBinomialCdf(n, k, 0.045) : 50.0;
            return {
                name: 'Banner Boosted (Special 4.5% Epiphaneia/Anniv)',
                total_pulls: n,
                ssr_count: k,
                base_rate: 4.5,
                ssr_rate: bstPool.ssr_rate || 0.0,
                expected_ssr: Math.round(n * 0.045 * 10) / 10,
                percentile: pct,
            };
        }

        // Overall hybrid pool
        const nStd = stdPool.total_pulls || 0;
        const kStd = stdPool.ssr_count || 0;
        const nBst = bstPool.total_pulls || 0;
        const kBst = bstPool.ssr_count || 0;
        const nAll = allPool.total_pulls || (nStd + nBst);
        const kAll = allPool.ssr_count || (kStd + kBst);

        const expSsr = (nStd * 0.03) + (nBst * 0.045);
        const variance = (nStd * 0.03 * 0.97) + (nBst * 0.045 * 0.955);
        let pct = 50.0;
        if (nAll > 0 && variance > 0) {
            const z = (kAll + 0.5 - expSsr) / Math.sqrt(variance);
            pct = Math.round(Math.min(1.0, Math.max(0.0, 0.5 * (1.0 + erf(z / Math.SQRT2)))) * 10000) / 100;
        }

        return {
            name: 'Semua Gacha Akun (Standar 3% + Boosted 4.5%)',
            total_pulls: nAll,
            ssr_count: kAll,
            base_rate: allPool.base_rate || 3.0,
            ssr_rate: allPool.ssr_rate || (nAll > 0 ? Math.round((kAll / nAll) * 10000) / 100 : 0.0),
            expected_ssr: Math.round(expSsr * 10) / 10,
            percentile: pct,
        };
    }, [luckPool, customPulls, customSsr, customRate, stdPool, bstPool, allPool]);

    const activeTier = getLuckTier(activeLuckData.percentile);
    const TierIcon = activeTier.icon;

    // -------------------------------------------------------------
    // FEATURE 2: Interactive Pull Chance Simulator State
    // -------------------------------------------------------------
    const [simCarats, setSimCarats] = useState(12000);
    const [simTickets, setSimTickets] = useState(0);
    const [targetType, setTargetType] = useState('rate_up'); // 'rate_up', 'any_ssr', 'any_boosted', 'custom'
    const [customTargetRate, setCustomTargetRate] = useState(0.75); // in percent

    // Total pull calculation: 150 carats = 1 pull, 1 ticket = 1 pull
    const totalSimPulls = useMemo(() => {
        const cPulls = Math.floor(Math.max(0, parseInt(simCarats, 10) || 0) / 150);
        const tPulls = Math.max(0, parseInt(simTickets, 10) || 0);
        return cPulls + tPulls;
    }, [simCarats, simTickets]);

    // Active single-pull probability rate (p)
    const targetProbability = useMemo(() => {
        switch (targetType) {
            case 'rate_up':
                return 0.0075; // 0.75% featured rate-up character/card
            case 'any_ssr':
                return 0.03;   // 3.0% standard base SSR rate
            case 'any_boosted':
                return 0.045;  // 4.5% special anniversary SSR rate
            case 'custom':
                return Math.max(0.0001, Math.min(1.0, (parseFloat(customTargetRate) || 0.75) / 100.0));
            default:
                return 0.0075;
        }
    }, [targetType, customTargetRate]);

    // Calculate Chance: P(>= 1) = 1 - (1 - p)^N
    const probAtLeastOne = useMemo(() => {
        if (totalSimPulls <= 0) return 0.0;
        const pFail = Math.pow(1.0 - targetProbability, totalSimPulls);
        return Math.round(Math.min(100.0, Math.max(0.0, (1.0 - pFail) * 100)) * 10) / 10;
    }, [totalSimPulls, targetProbability]);

    // Calculate Chance: P(>= 2)
    const probAtLeastTwo = useMemo(() => {
        if (totalSimPulls < 2) return 0.0;
        const p0 = Math.pow(1.0 - targetProbability, totalSimPulls);
        const p1 = totalSimPulls * targetProbability * Math.pow(1.0 - targetProbability, totalSimPulls - 1);
        return Math.round(Math.min(100.0, Math.max(0.0, (1.0 - (p0 + p1)) * 100)) * 10) / 10;
    }, [totalSimPulls, targetProbability]);

    // Confidence Milestones: pulls needed for 50%, 75%, 90%, 99%
    const confidenceMilestones = useMemo(() => {
        const getPullsNeeded = (targetConf) => {
            if (targetProbability <= 0 || targetProbability >= 1) return 0;
            return Math.ceil(Math.log(1.0 - targetConf) / Math.log(1.0 - targetProbability));
        };

        return [
            { conf: '50% (Coin Flip)', pulls: getPullsNeeded(0.50), carats: getPullsNeeded(0.50) * 150 },
            { conf: '75% (Cukup Aman)', pulls: getPullsNeeded(0.75), carats: getPullsNeeded(0.75) * 150 },
            { conf: '90% (Sangat Tinggi)', pulls: getPullsNeeded(0.90), carats: getPullsNeeded(0.90) * 150 },
            { conf: '99% (Hampir Pasti)', pulls: getPullsNeeded(0.99), carats: getPullsNeeded(0.99) * 150 },
        ];
    }, [targetProbability]);

    // Quick Carat Presets
    const setPreset = (caratAmount, ticketAmount = 0) => {
        setSimCarats(caratAmount);
        setSimTickets(ticketAmount);
    };

    return (
        <div className="space-y-6">
            {/* Top Banner Introduction */}
            <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-emerald-900/90 via-slate-900 to-green-950 text-white border border-emerald-500/30 shadow-lg relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                <Dice5 className="w-5 h-5" />
                            </span>
                            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                                Gacha Luck & Binomial Probability Simulator
                            </h2>
                        </div>
                        <p className="text-xs sm:text-sm text-emerald-200/80 max-w-2xl">
                            Analisis matematis berbasis <strong>Distribusi Binomial Kumulatif P(X ≤ k)</strong> untuk mengukur persentil keberuntungan akun riil dan mensimulasikan peluang tarikan banner target.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 bg-emerald-950/80 p-2 rounded-2xl border border-emerald-800/80 text-xs font-mono self-start md:self-auto">
                        <span className="text-emerald-400 font-bold">Base Rate Resmi:</span>
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-black">SSR 3.0%</span>
                        <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-black">Rate-Up 0.75%</span>
                    </div>
                </div>
            </div>

            {/* ============================================================= */}
            {/* FEATURE 1: ACCOUNT LUCK PERCENTILE (DISTRIBUSI BINOMIAL)       */}
            {/* ============================================================= */}
            <div className={`p-5 sm:p-6 rounded-3xl border shadow-sm transition-all ${activeTier.bgCard}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/60 dark:border-slate-800">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Percent className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                                Fitur 1: Account Luck Percentile (Distribusi Binomial)
                            </h3>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Mengukur seberapa hoki akun Anda dibandingkan seluruh pemain Uma Musume di seluruh dunia
                        </p>
                    </div>

                    {/* Pool Filter Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800/90 p-1.5 rounded-2xl shrink-0">
                        {[
                            { id: 'overall', label: 'Semua Banner' },
                            { id: 'standard', label: 'Standar (3.0%)' },
                            { id: 'boosted', label: 'Boosted (4.5%)' },
                            { id: 'custom', label: '🧪 Kustom' },
                        ].map((p) => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => setLuckPool(p.id)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                    luckPool === p.id
                                        ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Custom Testing Mode Inputs */}
                {luckPool === 'custom' && (
                    <div className="mt-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                <Sliders className="w-4 h-4 text-emerald-500" />
                                <span>Input Data Pengujian Bebas (Hipotetis)</span>
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">Bebas uji angka tarikan & perolehan SSR</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                    Total Tarikan Pull (n)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="50000"
                                    value={customPulls}
                                    onChange={(e) => setCustomPulls(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold font-mono focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                    Jumlah SSR Didapat (k)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max={customPulls}
                                    value={customSsr}
                                    onChange={(e) => setCustomSsr(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold font-mono focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                    Base SSR Rate (%)
                                </label>
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0.1"
                                        max="100"
                                        value={customRate}
                                        onChange={(e) => setCustomRate(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold font-mono focus:ring-2 focus:ring-emerald-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setCustomRate(3.0)}
                                        className="px-2 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 cursor-pointer"
                                    >
                                        3%
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCustomRate(4.5)}
                                        className="px-2 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 cursor-pointer"
                                    >
                                        4.5%
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Percentile Result Card */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5">
                    {/* Left: Big Percentile & Tier Badge */}
                    <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                {activeLuckData.name}
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                                    {activeLuckData.percentile}%
                                </span>
                                <span className="text-xs font-bold text-slate-400">Percentile</span>
                            </div>

                            {/* Tier Badge */}
                            <div className="pt-1">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border ${activeTier.badgeClass}`}>
                                    <TierIcon className="w-4 h-4 shrink-0" />
                                    <span>{activeTier.label}</span>
                                </span>
                            </div>
                        </div>

                        {/* Progress Bar of Percentile */}
                        <div className="space-y-1.5 pt-2">
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
                                <div 
                                    className={`h-full rounded-full bg-gradient-to-r ${activeTier.barColor} transition-all duration-500`}
                                    style={{ width: `${Math.min(100, Math.max(2, activeLuckData.percentile))}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-[10px] font-mono text-slate-400">
                                <span>0% (Cursed)</span>
                                <span>50% (On-Rate)</span>
                                <span>100% (Blessed)</span>
                            </div>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3">
                            {activeTier.sub}
                        </p>
                    </div>

                    {/* Right: Detailed Metric Table & Tier Legend */}
                    <div className="lg:col-span-7 space-y-4">
                        {/* Stats Matrix Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                                <div className="text-[10px] font-bold text-slate-400">Total Tarikan (n)</div>
                                <div className="text-lg font-black font-mono text-slate-900 dark:text-white mt-0.5">
                                    {activeLuckData.total_pulls.toLocaleString('id-ID')}
                                </div>
                            </div>
                            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                                <div className="text-[10px] font-bold text-amber-500">SSR Diperoleh (k)</div>
                                <div className="text-lg font-black font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                                    {activeLuckData.ssr_count} <span className="text-[11px] font-semibold text-slate-400">SSR</span>
                                </div>
                            </div>
                            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                                <div className="text-[10px] font-bold text-slate-400">Ekspektasi SSR (n×p)</div>
                                <div className="text-lg font-black font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                                    {activeLuckData.expected_ssr}
                                </div>
                            </div>
                            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                                <div className="text-[10px] font-bold text-slate-400">Selisih Realita</div>
                                <div className={`text-lg font-black font-mono mt-0.5 ${
                                    activeLuckData.ssr_count >= activeLuckData.expected_ssr
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-rose-600 dark:text-rose-400'
                                }`}>
                                    {activeLuckData.ssr_count >= activeLuckData.expected_ssr ? '+' : ''}
                                    {(activeLuckData.ssr_count - activeLuckData.expected_ssr).toFixed(1)}
                                </div>
                            </div>
                        </div>

                        {/* Tier Reference System */}
                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2">
                            <div className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                <Info className="w-3.5 h-3.5 text-slate-400" />
                                <span>Klasifikasi Tingkat Keberuntungan Akun (Binomial Tiers)</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60">
                                    <span className="font-bold text-amber-800 dark:text-amber-300">≥ 85%: Blessed / Ultra Lucky</span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 font-bold">Top 15%</span>
                                </div>
                                <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
                                    <span className="font-bold text-emerald-800 dark:text-emerald-300">60% - 84%: Above Average / Lucky</span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 font-bold">Di atas rata-rata</span>
                                </div>
                                <div className="flex items-center justify-between p-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60">
                                    <span className="font-bold text-blue-800 dark:text-blue-300">40% - 59%: Average / On-Rate</span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-200 font-bold">Normal / Sesuai rate</span>
                                </div>
                                <div className="flex items-center justify-between p-2 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/60">
                                    <span className="font-bold text-orange-800 dark:text-orange-300">15% - 39%: Unlucky</span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-200 dark:bg-orange-900 text-orange-900 dark:text-orange-200 font-bold">Di bawah rata-rata</span>
                                </div>
                                <div className="flex items-center justify-between p-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 sm:col-span-2">
                                    <span className="font-bold text-rose-800 dark:text-rose-300">&lt; 15%: Cursed / Extreme Salty</span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200 font-bold">15% Paling Garam</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ============================================================= */}
            {/* FEATURE 2: INTERACTIVE PULL CHANCE SIMULATOR                  */}
            {/* ============================================================= */}
            <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Calculator className="w-5 h-5 text-amber-500" />
                            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                                Fitur 2: Interactive Pull Chance Simulator
                            </h3>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Hitung probabilitas keberhasilan menarik kartu target berdasarkan Carat dan Tiket yang Anda siapkan
                        </p>
                    </div>

                    <div className="text-right">
                        <span className="text-xs font-semibold text-slate-400">Total Tarikan: </span>
                        <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                            {totalSimPulls} Pull
                        </span>
                    </div>
                </div>

                {/* Input Controls & Quick Presets */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                    {/* Inputs */}
                    <div className="md:col-span-6 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                                    <Coins className="w-3.5 h-3.5 text-amber-500" />
                                    <span>Jumlah Carats</span>
                                </label>
                                <input
                                    type="number"
                                    step="150"
                                    min="0"
                                    value={simCarats}
                                    onChange={(e) => setSimCarats(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-black font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                                />
                                <span className="text-[10px] text-slate-400 mt-1 block">
                                    = {Math.floor(simCarats / 150)} pull ({simCarats.toLocaleString('id-ID')} Carat)
                                </span>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                                    <Ticket className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>Jumlah Tiket Gacha</span>
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={simTickets}
                                    onChange={(e) => setSimTickets(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-black font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                                />
                                <span className="text-[10px] text-slate-400 mt-1 block">
                                    = {simTickets} pull tiket
                                </span>
                            </div>
                        </div>

                        {/* Quick Presets */}
                        <div>
                            <span className="text-[11px] font-bold text-slate-400 block mb-1.5">Preset Cepat:</span>
                            <div className="flex flex-wrap gap-1.5">
                                {[
                                    { label: '10 Pull (1.500)', carats: 1500, tickets: 0 },
                                    { label: '50 Pull (7.500)', carats: 7500, tickets: 0 },
                                    { label: '80 Pull (12.000)', carats: 12000, tickets: 0 },
                                    { label: '100 Pull (15.000)', carats: 15000, tickets: 0 },
                                    { label: '⭐ Spark 200 Pull (30.000)', carats: 30000, tickets: 0 },
                                ].map((btn) => (
                                    <button
                                        key={btn.label}
                                        type="button"
                                        onClick={() => setPreset(btn.carats, btn.tickets)}
                                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition-colors cursor-pointer"
                                    >
                                        {btn.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Target Selection */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                Target Banner yang Dihitung:
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {[
                                    { id: 'rate_up', title: 'Minimal 1 Rate-Up', rate: '0.75%', desc: 'Karakter / Kartu Featured' },
                                    { id: 'any_ssr', title: 'Minimal 1 Sembarang SSR', rate: '3.00%', desc: 'Rate SSR Dasar Standar' },
                                    { id: 'any_boosted', title: 'Minimal 1 SSR Boosted', rate: '4.50%', desc: 'Spesial Anniv / Epiphaneia' },
                                    { id: 'custom', title: 'Custom Rate Target', rate: `${customTargetRate}%`, desc: 'Input Persentase Bebas' },
                                ].map((t) => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => setTargetType(t.id)}
                                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                                            targetType === t.id
                                                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 text-amber-950 dark:text-amber-200 shadow-xs'
                                                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between font-black text-xs">
                                            <span>{t.title}</span>
                                            <span className="font-mono text-amber-600 dark:text-amber-400">{t.rate}</span>
                                        </div>
                                        <div className="text-[10px] text-slate-400 mt-0.5">{t.desc}</div>
                                    </button>
                                ))}
                            </div>

                            {targetType === 'custom' && (
                                <div className="pt-2">
                                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                                        Persentase Peluang Target (%)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.05"
                                        min="0.01"
                                        max="100"
                                        value={customTargetRate}
                                        onChange={(e) => setCustomTargetRate(e.target.value)}
                                        className="w-full sm:w-48 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Gauge / Progress Bar & Math Output */}
                    <div className="md:col-span-6 bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 flex flex-col justify-between space-y-4">
                        {/* Hero Probability Gauge */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Peluang Sukses Matematis (≥ 1 Target)
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                    P = 1 - (1 - p)^N
                                </span>
                            </div>

                            <div className="flex items-baseline gap-2">
                                <span className={`text-4xl sm:text-5xl font-black font-mono tracking-tight ${
                                    probAtLeastOne >= 75
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : probAtLeastOne >= 50
                                            ? 'text-amber-600 dark:text-amber-400'
                                            : 'text-rose-600 dark:text-rose-400'
                                }`}>
                                    {probAtLeastOne}%
                                </span>
                                <span className="text-xs font-semibold text-slate-500">Peluang Sukses</span>
                            </div>

                            {/* Dynamic Segmented Progress Bar */}
                            <div className="space-y-1">
                                <div className="w-full bg-slate-200 dark:bg-slate-700 h-4 rounded-full overflow-hidden p-0.5">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-300 ${
                                            probAtLeastOne >= 75
                                                ? 'bg-gradient-to-r from-emerald-500 to-green-400'
                                                : probAtLeastOne >= 50
                                                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                                                    : 'bg-gradient-to-r from-rose-500 to-orange-400'
                                        }`}
                                        style={{ width: `${Math.min(100, Math.max(1, probAtLeastOne))}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                                    <span>0%</span>
                                    <span>50%</span>
                                    <span>75%</span>
                                    <span>100% (Spark)</span>
                                </div>
                            </div>

                            {/* Clear Human-Readable Verdict */}
                            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 font-medium">
                                💬 <strong>Kesimpulan:</strong> Dengan <strong>{(simCarats).toLocaleString('id-ID')} Carat</strong> ({totalSimPulls} pull), peluang mendapatkan minimal 1 kartu target adalah <strong className="text-emerald-600 dark:text-emerald-400">{probAtLeastOne}%</strong>. Peluang mendapatkan 2 kartu atau lebih adalah <strong>{probAtLeastTwo}%</strong>.
                            </div>
                        </div>

                        {/* Confidence Table (Pulls Needed) */}
                        <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-2">
                                Berapa Pull yang Dibutuhkan untuk Target Kepercayaan?
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                                {confidenceMilestones.map((m) => (
                                    <div key={m.conf} className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                        <div className="text-[10px] text-slate-400 font-semibold">{m.conf}</div>
                                        <div className="text-xs font-black font-mono text-slate-900 dark:text-white mt-0.5">
                                            {m.pulls} Pull
                                        </div>
                                        <div className="text-[10px] font-mono text-amber-600 dark:text-amber-400">
                                            {m.carats.toLocaleString('id-ID')} Carat
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
