import React, { useState, useEffect } from 'react';
import { 
    Sparkles, 
    Trophy, 
    Users, 
    TrendingUp, 
    Target, 
    Flame, 
    Zap, 
    ChevronRight,
    Award,
    Calendar,
    RefreshCw
} from 'lucide-react';
import { 
    ResponsiveContainer, 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    Tooltip, 
    PieChart, 
    Pie, 
    Cell, 
    BarChart, 
    Bar, 
    CartesianGrid,
    ReferenceLine,
    Legend
} from 'recharts';
import RarityBadge from './RarityBadge';
import RankBadge from './RankBadge';
import CirclePaceWidget from './CirclePaceWidget';
import { formatIndonesianDate } from '../utils/dateHelper';

export default function DashboardView({ 
    summaryData, 
    loading, 
    setActiveTab, 
    circleGoal = 20000000,
    baseRate = 3.0,
    setBaseRate,
    onNotify,
    onReload
}) {
    const [selectedPityBannerId, setSelectedPityBannerId] = useState(null);
    const [syncingGametora, setSyncingGametora] = useState(false);
    const [careerRange, setCareerRange] = useState('this_month');
    const [careerStats, setCareerStats] = useState(null);
    const [loadingCareerTrends, setLoadingCareerTrends] = useState(false);
    const [hoveredPie, setHoveredPie] = useState(null);

    useEffect(() => {
        let isMounted = true;
        const loadCareerStats = async () => {
            setLoadingCareerTrends(true);
            try {
                const res = await fetch(`/api/career/stats?range=${careerRange}`);
                if (res.ok && isMounted) {
                    const data = await res.json();
                    setCareerStats(data);
                }
            } catch (err) {
                console.error('Failed to load career stats for dashboard chart:', err);
            } finally {
                if (isMounted) setLoadingCareerTrends(false);
            }
        };
        loadCareerStats();
        return () => { isMounted = false; };
    }, [careerRange]);

    const handleSyncGametora = async () => {
        setSyncingGametora(true);
        try {
            const res = await fetch('/api/gacha/sync-gametora', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await res.json();
            if (res.ok && data.success) {
                onReload?.();
                onNotify?.(data.message || 'Katalog karakter dan banner berhasil disinkronkan dari GameTora!', 'success');
            } else {
                onNotify?.(data.message || 'Gagal menyinkronkan data GameTora.', 'error');
            }
        } catch (err) {
            console.error('Sync failed:', err);
            onNotify?.('Gagal menghubungi server untuk sinkronisasi.', 'error');
        } finally {
            setSyncingGametora(false);
        }
    };

    if (loading || !summaryData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[450px] space-y-3">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-emerald-800 font-semibold text-sm">Memuat Dasbor Trainer...</p>
            </div>
        );
    }

    const { gacha, career, recent_pulls = [], recent_runs = [], fan_trends = [], active_banners = [] } = summaryData;

    const bannerPities = gacha?.banner_pities || [];
    const currentBannerPity = selectedPityBannerId
        ? bannerPities.find(b => b.banner_id === selectedPityBannerId)
        : (bannerPities[0] || null);

    const activePity = currentBannerPity ? currentBannerPity.current_pity : (gacha?.active_pity || 0);
    const activeBannerName = currentBannerPity ? currentBannerPity.name : (gacha?.active_banner_name || null);
    const pityPercent = Math.min(100, Math.round((activePity / 200) * 100));
    const pullsToSpark = Math.max(0, 200 - activePity);

    const pools = gacha?.pools;
    const activePool = baseRate === 4.5
        ? (pools?.boosted || { total_pulls: 0, ssr_count: 0, ssr_rate: 0, luck_diff: -4.5, base_rate: 4.5, name: 'Premium (4.5%)' })
        : baseRate === 3.0
            ? (pools?.standard || { total_pulls: gacha?.total_pulls || 0, ssr_count: gacha?.ssr_count || 0, ssr_rate: gacha?.ssr_rate || 0, luck_diff: Math.round(((gacha?.ssr_rate || 0) - 3.0) * 100) / 100, base_rate: 3.0, name: 'Standar (3.0%)' })
            : (pools?.all || { total_pulls: gacha?.total_pulls || 0, ssr_count: gacha?.ssr_count || 0, ssr_rate: gacha?.ssr_rate || 0, luck_diff: Math.round(((gacha?.ssr_rate || 0) - (baseRate || 3.0)) * 100) / 100, base_rate: baseRate, name: 'Semua Gacha' });

    const ssrRate = activePool.ssr_rate;
    const luckDiff = activePool.luck_diff;
    const isLucky = luckDiff >= 0;

    const monthlyFans = career?.monthly_fans || 0;
    const circlePercent = Math.min(100, Math.round((monthlyFans / (circleGoal || 1)) * 100));

    // Prepare chart data
    const pieData = (gacha?.rarity_distribution || []).map(item => ({
        name: item.name,
        value: item.count || 0,
        color: item.color || '#94a3b8',
    }));

    const formattedTrends = (fan_trends || []).map(item => ({
        date: item.run_date ? String(item.run_date).slice(5) : '',
        fans: Math.round((item.total_fans || 0) / 10000) / 100, // In Millions for cleaner chart
        rawFans: item.total_fans || 0,
        runs: item.runs_count || 1,
    }));

    const targetQuota = careerStats?.monthly_circle_target || circleGoal || 20000000;
    const dailyTrends = careerStats?.daily_trends || [];
    const formattedCumulativeTrends = dailyTrends.map(item => ({
        date: item.date || (item.run_date ? String(item.run_date).slice(5) : ''),
        fans: item.fans_gained,
        cumulative_fans: item.cumulative_fans,
        cumulative_fans_m: Math.round(((item.cumulative_fans || 0) / 1000000) * 100) / 100,
        target_m: Math.round((targetQuota / 1000000) * 100) / 100,
        runs: item.runs_count || 0,
    }));

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Top Banner / Welcome */}
            <div className="bg-gradient-to-r from-emerald-800 via-green-700 to-teal-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-amber-400/10 to-transparent pointer-events-none"></div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/50 border border-emerald-500/40 text-xs font-bold text-amber-300 mb-3">
                            <Flame className="w-3.5 h-3.5 text-amber-400" />
                            <span>Pusat Komando Trainer</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                            Selamat Datang Kembali, Trainer!
                        </h1>
                        <p className="text-emerald-100/90 text-sm mt-1 max-w-xl">
                            Pantau tarikan gacha Anda, monitor target spark pity, dan tingkatkan perolehan fans Circle bulanan menuju peringkat teratas!
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={() => setActiveTab('gacha')}
                            className="btn-log-gacha px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-extrabold text-sm transition-all shadow-md shadow-amber-400/30 flex items-center gap-2 cursor-pointer"
                        >
                            <Sparkles className="w-4 h-4 text-slate-900" />
                            <span>Catat Gacha</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('career')}
                            className="px-4 py-2.5 rounded-2xl bg-white hover:bg-emerald-50 text-emerald-900 font-extrabold text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer"
                        >
                            <Trophy className="w-4 h-4 text-emerald-600" />
                            <span>Catat Run Karier</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* 4 Hero KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {/* 1. Total Pulls */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Tarikan</span>
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Sparkles className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-3xl font-black text-slate-900 font-mono">
                            {(gacha?.total_pulls || 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                            <span className="font-semibold text-emerald-700">SSR: {gacha?.ssr_count || 0}</span>
                            <span>•</span>
                            <span>Rate Dasar: 3.0%</span>
                        </div>
                    </div>
                </div>

                {/* 2. Active Pity & Spark (Per-Banner) */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div className="min-w-0 pr-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pity Aktif (Spark)</span>
                            <span className="block text-[11px] font-extrabold text-amber-600 dark:text-amber-400 truncate max-w-[200px]" title={activeBannerName || 'Pool Karakter'}>
                                {activeBannerName ? activeBannerName : 'Pool Karakter'}
                            </span>
                        </div>
                        <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                            <Target className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-slate-900 dark:text-slate-100 font-mono">{activePity}</span>
                            <span className="text-xs font-semibold text-slate-400">/ 200 tarikan</span>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-2 overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
                                style={{ width: `${pityPercent}%` }}
                            ></div>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 flex justify-between font-medium">
                            <span>{pityPercent}% menuju spark</span>
                            <span className="font-semibold text-amber-600 dark:text-amber-400">{pullsToSpark} lagi</span>
                        </div>

                        {/* Banner selector chips if multiple banners have active pity */}
                        {bannerPities.length > 1 && (
                            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto pb-1">
                                {bannerPities.map(bp => (
                                    <button
                                        key={bp.banner_id}
                                        type="button"
                                        onClick={() => setSelectedPityBannerId(bp.banner_id)}
                                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0 transition-colors cursor-pointer ${
                                            (selectedPityBannerId === bp.banner_id || (!selectedPityBannerId && bannerPities[0]?.banner_id === bp.banner_id))
                                                ? 'bg-amber-500 text-white shadow-2xs'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                        }`}
                                    >
                                        {bp.name.replace('Pretty Derby Gacha', '').trim()} ({bp.current_pity})
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Real SSR Rate (Separated by Standard 3% vs Boosted 4.5%) */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Hit Rate SSR</span>
                            <span className="block text-[10px] font-extrabold text-amber-600 dark:text-amber-400">
                                {activePool.name || `Pool ${activePool.base_rate}%`}
                            </span>
                        </div>
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isLucky ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300'}`}>
                            <TrendingUp className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-3xl font-black text-slate-900 dark:text-slate-100 font-mono">
                            {Number(ssrRate).toFixed(2)}%
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full ${
                                isLucky ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                            }`}>
                                {isLucky ? `+${Number(luckDiff).toFixed(2)}% Beruntung` : `${Number(luckDiff).toFixed(2)}% Kurang Beruntung`}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                                {activePool.total_pulls || 0} tarikan ({activePool.ssr_count || 0} SSR)
                            </span>
                        </div>
                        {/* Quick Base Rate & Pool Switcher */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-[10px] font-bold flex-wrap">
                            <span className="text-slate-400">Pool Rate:</span>
                            <button
                                type="button"
                                onClick={() => setBaseRate?.(3.0)}
                                className={`px-2 py-0.5 rounded-lg cursor-pointer transition-colors ${baseRate === 3.0 ? 'bg-emerald-600 text-white font-black' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'}`}
                            >
                                Standar 3.0%
                            </button>
                            <button
                                type="button"
                                onClick={() => setBaseRate?.(4.5)}
                                title="Tarikan banner Premium Pretty Derby (Anniv, Movie & Special Debut) rate 4.5%"
                                className={`px-2 py-0.5 rounded-lg cursor-pointer transition-colors ${baseRate === 4.5 ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'}`}
                            >
                                Premium 4.5%
                            </button>
                            <button
                                type="button"
                                onClick={() => setBaseRate?.(1.0)}
                                title="Gabungan semua tarikan dari semua banner"
                                className={`px-1.5 py-0.5 rounded-lg cursor-pointer transition-colors ${baseRate !== 3.0 && baseRate !== 4.5 ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 font-black' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'}`}
                            >
                                Semua
                            </button>
                        </div>
                    </div>
                </div>

                {/* 4. Circle Monthly Fans */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Fans Circle Bulanan</span>
                        <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
                            <Users className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono truncate">
                            {(monthlyFans).toLocaleString()}
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-teal-500 to-emerald-600 rounded-full transition-all duration-500"
                                style={{ width: `${circlePercent}%` }}
                            ></div>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1.5 flex justify-between font-medium">
                            <span>Target: {(circleGoal / 1000000).toFixed(0)}M</span>
                            <span className="font-semibold text-teal-700">{circlePercent}% tercapai</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Daily Circle Pace & Run Estimator Widget */}
            <CirclePaceWidget circleGoal={circleGoal} />

            {/* Ongoing Banners Today Section */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-amber-500" />
                            <h2 className="text-base font-black text-slate-900 dark:text-white">
                                Banner Gacha Berlangsung Hari Ini
                            </h2>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                                {active_banners.length} Aktif
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Daftar banner gacha resmi Uma Musume yang sedang berlangsung hari ini (sinkronisasi langsung dengan GameTora)
                        </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            disabled={syncingGametora}
                            onClick={handleSyncGametora}
                            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            title="Tarik & sinkronkan data banner terbaru serta katalog Uma Musume dari GameTora"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${syncingGametora ? 'animate-spin text-emerald-600' : 'text-slate-500 dark:text-slate-400'}`} />
                            <span>{syncingGametora ? 'Menyinkronkan...' : 'Sinkronkan GameTora'}</span>
                        </button>
                    </div>
                </div>

                {/* Banner Cards Grid */}
                {active_banners.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                        Tidak ada banner aktif tercatat untuk hari ini. Klik tombol "Sinkronkan GameTora" untuk memperbarui.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {active_banners.map((banner) => {
                            const isChar = banner.banner_type === 'character';
                            const isPremium = (banner.base_rate || 3.0) > 3.0;
                            return (
                                <div
                                    key={banner.id}
                                    className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/60 hover:border-amber-300 dark:hover:border-amber-700/50 transition-all flex flex-col justify-between gap-3 group"
                                >
                                    <div>
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                                                isChar
                                                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/50'
                                                    : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/50'
                                            }`}>
                                                <span>{isChar ? '🌸 Pretty Derby Gacha' : '🃏 Support Card Gacha'}</span>
                                            </span>

                                            <div className="flex items-center gap-1">
                                                {isPremium && (
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-2xs">
                                                        {banner.base_rate}% Rate
                                                    </span>
                                                )}
                                                {banner.days_remaining !== null && (
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                        banner.days_remaining === 0
                                                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 animate-pulse'
                                                            : banner.days_remaining <= 2
                                                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                                                : 'bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                                    }`}>
                                                        {banner.days_remaining === 0 ? 'Hari Terakhir!' : `${banner.days_remaining} hari lagi`}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <h3 className="text-sm font-black text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                            {banner.name}
                                        </h3>

                                        <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-200 mt-1.5 flex items-center gap-1.5 font-mono">
                                            <Calendar className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                                            <span>{banner.start_date} s/d {banner.end_date || 'Permanen'}</span>
                                        </div>

                                        {/* Featured Items List (Satu Kotak Penuh per Baris) */}
                                        {banner.featured_items?.length > 0 && (
                                            <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 dark:border-slate-800 space-y-1.5">
                                                <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-amber-300">
                                                    <Sparkles className="w-3 h-3 text-amber-500 dark:text-amber-400 shrink-0" />
                                                    <span>
                                                        {banner.category === 'select_rate_up' || /select\s*pick\s*up/i.test(banner.name || '')
                                                            ? 'Featured Rate-Up (Pilihan 2 dari 10 SSR):'
                                                            : 'Featured Rate-Up:'}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col gap-1.5 w-full">
                                                    {banner.featured_items.map((item, idx) => {
                                                        const isObj = typeof item === 'object' && item !== null;
                                                        const itemName = isObj ? item.name : item;
                                                        const isCardSupport = isObj ? item.is_support : !isChar;
                                                        const stars = isObj ? (item.stars || 3) : 3;
                                                        const tierLabel = isObj ? item.tier_label : (isChar ? 'B3' : 'SSR');
                                                        const badgeText = isObj ? item.badge_text : (isChar ? '★★★ (B3)' : 'SSR');

                                                        return (
                                                            <div
                                                                key={idx}
                                                                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 shadow-2xs gap-2"
                                                            >
                                                                <span className="text-xs font-bold truncate flex-1 text-slate-800 dark:text-slate-200">
                                                                    {itemName}
                                                                </span>

                                                                {isCardSupport ? (
                                                                    <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                                                        tierLabel === 'SSR'
                                                                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-2xs'
                                                                            : tierLabel === 'SR'
                                                                                ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                                                                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                                                    }`}>
                                                                        {tierLabel}
                                                                    </span>
                                                                ) : (
                                                                    <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-black flex items-center gap-1 ${
                                                                        stars === 1
                                                                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800'
                                                                            : stars === 2
                                                                                ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-300/80 dark:border-sky-800'
                                                                                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                                                    }`}>
                                                                        <span>{badgeText}</span>
                                                                    </span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('gacha')}
                                        className="w-full mt-2 py-2 px-3 rounded-xl bg-white hover:bg-amber-50 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 hover:text-amber-700 dark:hover:text-amber-300 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                                    >
                                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                        <span>Tarik di Gacha Tracker</span>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Line/Area Chart: Akumulasi Fans Harian vs Target Kuota Circle (2 columns) */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div>
                            <div className="flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                <h3 className="text-base font-black text-slate-900 dark:text-white">
                                    Tren Akumulasi Fans Harian
                                </h3>
                                <span className="text-[11px] font-normal text-slate-400">vs Target Kuota Circle</span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                Garis akumulasi total fans (dalam Jutaan) dibandingkan garis kuota target ({(targetQuota / 1000000).toFixed(0)}M)
                            </p>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto">
                            {/* Time Range Switcher */}
                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/70 dark:border-slate-700">
                                <button
                                    type="button"
                                    onClick={() => setCareerRange('this_month')}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                        careerRange === 'this_month'
                                            ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                                            : 'text-slate-600 dark:text-slate-400'
                                    }`}
                                >
                                    Bulan Berjalan
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCareerRange('30_days')}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                        careerRange === '30_days'
                                            ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                                            : 'text-slate-600 dark:text-slate-400'
                                    }`}
                                >
                                    30 Hari
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCareerRange('7_days')}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                        careerRange === '7_days'
                                            ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                                            : 'text-slate-600 dark:text-slate-400'
                                    }`}
                                >
                                    7 Hari
                                </button>
                            </div>

                            <button 
                                onClick={() => setActiveTab('analytics')}
                                className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 flex items-center gap-0.5 ml-1"
                            >
                                <span>Detail</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    <div className="h-72 w-full">
                        {loadingCareerTrends ? (
                            <div className="h-full flex items-center justify-center text-xs text-slate-400">
                                Memuat tren akumulasi fans...
                            </div>
                        ) : formattedCumulativeTrends.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-xs text-slate-400">
                                Belum ada data karir tercatat untuk rentang ini.
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={formattedCumulativeTrends} margin={{ top: 15, right: 15, left: -5, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="dashboardCumulFanColor" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                                    <XAxis 
                                        dataKey="date" 
                                        tick={{ fontSize: 11, fill: '#64748b' }} 
                                        axisLine={false} 
                                        tickLine={false} 
                                    />
                                    <YAxis 
                                        tick={{ fontSize: 11, fill: '#64748b' }} 
                                        axisLine={false} 
                                        tickLine={false} 
                                        unit="M" 
                                    />
                                    <Tooltip 
                                        formatter={(val, name) => {
                                            if (name === 'Akumulasi Fans') return [`${(Number(val) * 1000000).toLocaleString('id-ID')} fans`, name];
                                            if (name === 'Target Circle') return [`${(Number(val) * 1000000).toLocaleString('id-ID')} fans`, name];
                                            return [val, name];
                                        }}
                                        contentStyle={{ 
                                            backgroundColor: '#ffffff', 
                                            borderRadius: '12px', 
                                            border: '1px solid #e2e8f0', 
                                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                            fontSize: '12px',
                                            color: '#0f172a'
                                        }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                    {/* Target Quota Reference Line */}
                                    <ReferenceLine 
                                        y={targetQuota / 1000000} 
                                        stroke="#f59e0b" 
                                        strokeDasharray="4 4" 
                                        strokeWidth={2}
                                        label={{ 
                                            value: `Target Quota (${(targetQuota / 1000000).toFixed(0)}M)`, 
                                            position: 'top', 
                                            fill: '#d97706', 
                                            fontSize: 10,
                                            fontWeight: 'bold'
                                        }} 
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="cumulative_fans_m" 
                                        name="Akumulasi Fans"
                                        stroke="#059669" 
                                        strokeWidth={3} 
                                        fillOpacity={1} 
                                        fill="url(#dashboardCumulFanColor)" 
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Gacha Rarity Distribution Chart (1 column) */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-base font-black text-slate-900">Distribusi Rarity</h2>
                            <button 
                                onClick={() => setActiveTab('gacha')}
                                className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-0.5"
                            >
                                <span>Gacha</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mb-4">Distribusi tarikan SSR, SR, dan R</p>

                        <div className="h-44 w-full relative">
                            {gacha?.total_pulls > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            innerRadius={46}
                                            outerRadius={68}
                                            paddingAngle={4}
                                            dataKey="value"
                                            onMouseEnter={(entry) => setHoveredPie(entry)}
                                            onMouseLeave={() => setHoveredPie(null)}
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            formatter={(val, name) => [`${val} tarikan`, name]}
                                            contentStyle={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }}
                                            wrapperStyle={{ zIndex: 40 }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                                    Belum ada tarikan tercatat.
                                </div>
                            )}
                            <div className={`absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-opacity duration-150 z-0 ${hoveredPie ? 'opacity-0' : 'opacity-100'}`}>
                                <span className="text-xl font-black text-slate-800 dark:text-slate-100 font-mono">{gacha?.total_pulls || 0}</span>
                                <span className="text-[10px] text-slate-400 font-semibold uppercase">Tarikan</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-slate-100">
                        {pieData.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                                    <span className="font-semibold text-slate-700">{item.name}</span>
                                </div>
                                <div className="font-mono font-bold text-slate-900">
                                    {item.value} <span className="text-[11px] text-slate-400 font-normal">
                                        ({gacha?.total_pulls > 0 ? ((item.value / gacha.total_pulls) * 100).toFixed(1) : 0}%)
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Feeds Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Career Runs */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-emerald-600" />
                            <h2 className="text-base font-black text-slate-900">Run Karier Terbaru</h2>
                        </div>
                        <button
                            onClick={() => setActiveTab('career')}
                            className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
                        >
                            Lihat Semua
                        </button>
                    </div>

                    <div className="space-y-3">
                        {recent_runs.length === 0 ? (
                            <p className="text-xs text-slate-400 py-6 text-center">Belum ada run karier tercatat.</p>
                        ) : (
                            recent_runs.map((run) => (
                                <div 
                                    key={run.id}
                                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-emerald-200 transition-colors flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-3">
                                        <RankBadge rank={run.final_rank} size="sm" />
                                        <div>
                                            <div className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                                                <span>{run.uma_name}</span>
                                                {run.evaluation_score ? (
                                                    <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                                        {run.evaluation_score.toLocaleString('id-ID')} pts
                                                    </span>
                                                ) : null}
                                            </div>
                                            <div className="text-[11px] text-slate-500">{run.scenario} • {formatIndonesianDate(run.run_date)}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-black text-emerald-700 font-mono">
                                            +{(run.fans_gained || 0).toLocaleString()}
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-medium">fans diperoleh</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Recent Gacha Pulls */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-amber-500" />
                            <h2 className="text-base font-black text-slate-900">Tarikan Gacha Terbaru</h2>
                        </div>
                        <button
                            onClick={() => setActiveTab('gacha')}
                            className="text-xs font-bold text-amber-700 hover:text-amber-800"
                        >
                            Lihat Semua
                        </button>
                    </div>

                    <div className="space-y-3">
                        {recent_pulls.length === 0 ? (
                            <p className="text-xs text-slate-400 py-6 text-center">Belum ada tarikan gacha tercatat.</p>
                        ) : (
                            recent_pulls.map((pull) => (
                                <div 
                                    key={pull.id}
                                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-amber-200 transition-colors flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-3">
                                        <RarityBadge rarity={pull.rarity} size="sm" />
                                        <div>
                                            <div className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                                                <span>{pull.item_name}</span>
                                                {pull.is_rate_up && (
                                                    <span className="px-1.5 py-0.2 text-[10px] font-bold bg-rose-100 text-rose-700 rounded">
                                                        Rate Up
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[11px] text-slate-500 capitalize">
                                                {pull.banner_type.replace('_', ' ')} • {pull.pull_type.replace('_', ' ')}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right text-xs">
                                        <span className="font-mono text-slate-400">Pity #{pull.pity_count_at_pull}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
