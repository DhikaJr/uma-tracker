import React, { useState, useEffect, useMemo } from 'react';
import {
    TrendingUp,
    Sparkles,
    Trophy,
    Calendar,
    Target,
    Flame,
    PieChart as PieChartIcon,
    BarChart3,
    Layers,
    RotateCcw,
    Zap,
    Award,
    History,
    CheckCircle2
} from 'lucide-react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    LineChart,
    Line,
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

function CustomPityTooltip({ active, payload, label }) {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl shadow-xl text-xs space-y-1 z-50">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1 gap-2">
                    <p className="font-bold text-slate-900 dark:text-white">{label}</p>
                    {data.is_boosted ? (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                            Pool 4.5% Boost
                        </span>
                    ) : (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                            Pool 3.0% Standar
                        </span>
                    )}
                </div>
                <div className="text-slate-600 dark:text-slate-300 flex items-center justify-between gap-3 pt-0.5">
                    <span className="font-semibold text-amber-600 dark:text-amber-400">Jarak Tarikan:</span>
                    <span className="font-mono font-black text-slate-900 dark:text-white text-sm">{payload[0].value} tarikan</span>
                </div>
                <div className="text-slate-700 dark:text-slate-300 font-medium">
                    {data.is_character ? 'Karakter:' : 'Kartu:'} <span className="font-bold text-slate-900 dark:text-white">{data.item_name || (data.is_character ? 'Karakter B3' : 'SSR')}</span>
                    {data.is_rate_up && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                            Rate Up!
                        </span>
                    )}
                </div>
                {data.pulled_at && (
                    <div className="text-[10px] text-slate-400">
                        Tanggal: {data.pulled_at}
                    </div>
                )}
                <div className="pt-1 text-[10px]">
                    <span className={`font-bold px-2 py-0.5 rounded-md inline-block ${data.is_lucky ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'}`}>
                        {data.is_lucky ? `🍀 Di bawah patokan (~${data.expected_pulls || 33.3} pull)` : `⚠️ Di atas patokan (~${data.expected_pulls || 33.3} pull)`}
                    </span>
                </div>
            </div>
        );
    }
    return null;
}

function CustomDonutTooltip({ active, payload }) {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl shadow-xl text-xs z-50">
                <div className="flex items-center gap-1.5 mb-1.5 border-b border-slate-100 dark:border-slate-800 pb-1">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: data.color }} />
                    <span className="font-bold text-slate-900 dark:text-white">{data.name}</span>
                </div>
                <div className="text-slate-600 dark:text-slate-300 text-[11px] space-y-0.5">
                    <div className="flex justify-between gap-3">
                        <span>Jumlah:</span>
                        <span className="font-bold text-slate-900 dark:text-white font-mono">{data.value} tarikan ({data.percentage}%)</span>
                    </div>
                    <div className="flex justify-between gap-3">
                        <span>Rate Resmi:</span>
                        <span className="font-semibold text-slate-500 dark:text-slate-400 font-mono">{data.baseline}</span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
}

function CustomScenarioTooltip({ active, payload }) {
    if (active && payload && payload.length) {
        const item = payload[0].payload;
        return (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl shadow-xl text-xs z-50">
                <p className="font-bold text-slate-900 dark:text-white mb-1">{item.name}</p>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5">
                    <div>Rata-rata: <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{(item.avg_fans || 0).toLocaleString('id-ID')} fans</span></div>
                    <div className="text-slate-400 text-[10px]">Min: {(item.min_fans || 0).toLocaleString('id-ID')} | Max: {(item.max_fans || 0).toLocaleString('id-ID')}</div>
                </div>
            </div>
        );
    }
    return null;
}

function CustomCumulativeFansTooltip({ active, payload, label }) {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl shadow-xl text-xs z-50">
                <p className="font-bold text-slate-900 dark:text-white mb-1.5 pb-1 border-b border-slate-100 dark:border-slate-800">{label}</p>
                {payload.map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-3 text-[11px] py-0.5">
                        <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            {entry.name}:
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white font-mono">
                            {(Number(entry.value) * 1000000).toLocaleString('id-ID')} fans
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
}

export default function AnalyticsView({ circleGoal = 20000000, baseRate = 3.0, onNotify }) {
    const [section, setSection] = useState('all'); // 'all', 'career', 'gacha'
    const [careerRange, setCareerRange] = useState('this_month'); // 'this_month', '30_days', '7_days'
    const [gachaCategory, setGachaCategory] = useState('all'); // 'all', 'character', 'support_card'
    const [gachaPool, setGachaPool] = useState('all'); // 'all', 'standard', 'boosted'

    // Data state
    const [careerStats, setCareerStats] = useState(null);
    const [gachaStats, setGachaStats] = useState(null);
    const [loadingCareer, setLoadingCareer] = useState(true);
    const [loadingGacha, setLoadingGacha] = useState(true);
    const [hoveredRarity, setHoveredRarity] = useState(null);
    const [selectedPastMonthKey, setSelectedPastMonthKey] = useState(null);

    // Fetch Career stats with range
    const fetchCareerStats = async () => {
        setLoadingCareer(true);
        try {
            const res = await fetch(`/api/career/stats?range=${careerRange}`);
            const data = await res.json();
            setCareerStats(data);
        } catch (err) {
            console.error('Failed to load career stats:', err);
        } finally {
            setLoadingCareer(false);
        }
    };

    // Fetch Gacha stats
    const fetchGachaStats = async () => {
        setLoadingGacha(true);
        try {
            const res = await fetch(`/api/gacha/stats?banner_type=${gachaCategory}&rate_pool=${gachaPool}`);
            const data = await res.json();
            setGachaStats(data);
        } catch (err) {
            console.error('Failed to load gacha stats:', err);
        } finally {
            setLoadingGacha(false);
        }
    };

    useEffect(() => {
        fetchCareerStats();
    }, [careerRange]);

    useEffect(() => {
        fetchGachaStats();
    }, [gachaCategory, gachaPool]);

    const targetQuota = careerStats?.monthly_circle_target || circleGoal || 20000000;

    // Career Fans Trends Data formatting
    const dailyTrends = careerStats?.daily_trends || [];
    const formattedTrends = dailyTrends.map(item => ({
        date: item.date || item.run_date,
        fans: item.fans_gained,
        cumulative_fans: item.cumulative_fans,
        cumulative_fans_m: Math.round(((item.cumulative_fans || 0) / 1000000) * 100) / 100,
        target_m: Math.round((targetQuota / 1000000) * 100) / 100,
        runs: item.runs_count || 0,
    }));

    // Historical previous months tracks
    const historicalMonths = careerStats?.historical_months || [];
    const activePastMonth = useMemo(() => {
        if (!historicalMonths || historicalMonths.length === 0) return null;
        return historicalMonths.find(m => m.month_key === selectedPastMonthKey) || historicalMonths[0];
    }, [historicalMonths, selectedPastMonthKey]);

    const formattedPastTrends = useMemo(() => {
        if (!activePastMonth?.daily_trends?.length) return [];
        return activePastMonth.daily_trends.map(item => ({
            date: item.date || item.run_date,
            fans: item.fans_gained,
            cumulative_fans: item.cumulative_fans,
            cumulative_fans_m: Math.round(((item.cumulative_fans || 0) / 1000000) * 100) / 100,
            target_m: Math.round(((activePastMonth.target_quota || 20000000) / 1000000) * 100) / 100,
            runs: item.runs_count || 0,
        }));
    }, [activePastMonth]);

    // Scenario Performance Data formatting
    const scenarioStats = careerStats?.scenario_stats || [];
    const formattedScenarios = scenarioStats.map(s => ({
        name: s.scenario,
        avg_fans: parseInt(s.avg_fans, 10) || 0,
        avg_fans_m: Math.round(((parseInt(s.avg_fans, 10) || 0) / 1000000) * 100) / 100,
        min_fans: parseInt(s.min_fans ?? s.avg_fans, 10) || 0,
        max_fans: parseInt(s.max_fans, 10) || 0,
        runs_count: s.runs_count || 0,
    }));

    // Gacha Rarity Donut Data & Dynamic Benchmarks
    const totalPulls = gachaStats?.total_pulls || 0;
    const ssrCount = gachaStats?.ssr_count || 0;
    const srCount = gachaStats?.sr_count || 0;
    const rCount = gachaStats?.r_count || 0;

    const ssrPct = totalPulls > 0 ? ((ssrCount / totalPulls) * 100).toFixed(1) : '0.0';
    const srPct = totalPulls > 0 ? ((srCount / totalPulls) * 100).toFixed(1) : '0.0';
    const rPct = totalPulls > 0 ? ((rCount / totalPulls) * 100).toFixed(1) : '0.0';

    const categories = gachaStats?.categories || {};
    const charCat = categories.character || {
        name: 'Gacha Karakter',
        type: 'character',
        total_pulls: 0,
        ssr_count: 0,
        ssr_rate: 0,
        base_rate: 4.5,
        luck_diff: 0,
        expected_interval: 22.2,
    };
    const suppCat = categories.support_card || {
        name: 'Gacha Support Card',
        type: 'support_card',
        total_pulls: 0,
        ssr_count: 0,
        ssr_rate: 0,
        base_rate: 3.0,
        luck_diff: 0,
        expected_interval: 33.3,
    };
    const allCat = categories.all || {
        name: 'Semua Gacha (Gabungan)',
        type: 'all',
        total_pulls: 0,
        ssr_count: 0,
        ssr_rate: 0,
        base_rate: 3.0,
        luck_diff: 0,
        expected_interval: 33.3,
    };

    const activeCatInfo = gachaCategory === 'character' ? charCat : (gachaCategory === 'support_card' ? suppCat : allCat);

    // Current base rate determination
    let currentBaseRate = 3.0;
    if (gachaPool === 'boosted') {
        currentBaseRate = 4.5;
    } else if (gachaPool === 'standard') {
        currentBaseRate = 3.0;
    } else if (gachaStats?.base_rate) {
        currentBaseRate = Number(gachaStats.base_rate);
    } else {
        currentBaseRate = Number(activeCatInfo.base_rate) || 3.0;
    }

    const currentExpectedInterval = currentBaseRate > 3.0 ? 22.2 : 33.3;
    const currentLuckyThreshold = currentBaseRate > 3.0 ? 22 : 33;

    const isChar = gachaCategory === 'character';

    const rarityDonutData = [
        {
            name: isChar ? 'Karakter 3★ / B3 (Rainbow)' : (gachaCategory === 'support_card' ? 'SSR Support Card (Rainbow)' : 'SSR / B3 (Rainbow)'),
            value: ssrCount,
            percentage: ssrPct,
            baseline: `${currentBaseRate.toFixed(1)}%`,
            color: currentBaseRate > 3.0 ? '#f43f5e' : '#f59e0b'
        },
        {
            name: isChar ? 'Karakter 2★ / B2 (Gold)' : 'SR (Gold)',
            value: srCount,
            percentage: srPct,
            baseline: '18.0%',
            color: '#6366f1'
        },
        {
            name: isChar ? 'Karakter 1★ / B1 (Silver)' : 'R (Silver)',
            value: rCount,
            percentage: rPct,
            baseline: currentBaseRate > 3.0 ? '77.5%' : '79.0%',
            color: '#94a3b8'
        },
    ];

    // Gacha Pity Intervals Data (distance between SSR pulls)
    const ssrIntervals = gachaStats?.ssr_intervals || [];
    const formattedIntervals = ssrIntervals.map((item, idx) => {
        const itemBaseRate = item.banner_base_rate || currentBaseRate;
        const expectedPulls = itemBaseRate > 3.0 ? 22.2 : 33.3;
        const luckyThreshold = itemBaseRate > 3.0 ? 22 : 33;
        const itemIsChar = isChar || item.is_character;
        const fallbackNum = item.ssr_number || (idx + 1);
        const itemLabel = itemIsChar ? `B3 #${fallbackNum}` : (item.label || `SSR #${fallbackNum}`);
        return {
            label: itemLabel,
            ssr_number: fallbackNum,
            pulls_count: item.pulls_count,
            item_name: item.item_name,
            is_rate_up: item.is_rate_up,
            pulled_at: item.pulled_at,
            banner_base_rate: itemBaseRate,
            is_boosted: item.is_boosted || itemBaseRate > 3.0,
            is_lucky: item.pulls_count <= luckyThreshold,
            expected_pulls: expectedPulls,
            is_character: itemIsChar,
        };
    });

    const pools = gachaStats?.pools || {};
    const stdPool = pools.standard || {
        total_pulls: 0,
        ssr_count: 0,
        ssr_rate: 0,
        luck_diff: 0,
    };
    const bstPool = pools.boosted || {
        total_pulls: 0,
        ssr_count: 0,
        ssr_rate: 0,
        luck_diff: 0,
    };
    const allPool = pools.all || {
        total_pulls: 0,
        ssr_count: 0,
        ssr_rate: 0,
        luck_diff: 0,
    };

    return (
        <div className="space-y-6">
            {/* Header & Section Navigation */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-teal-500/20 shrink-0">
                        <BarChart3 className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                                Visualisasi Data & Analytics
                            </h1>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                                Recharts Interactive
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Eksplorasi tren akumulasi fans karir, perbandingan performa skenario, dan interval keberuntungan gacha
                        </p>
                    </div>
                </div>

                {/* Section Toggle Pill */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700 self-start md:self-auto shrink-0">
                    <button
                        type="button"
                        onClick={() => setSection('all')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            section === 'all'
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        Semua Analytics
                    </button>
                    <button
                        type="button"
                        onClick={() => setSection('career')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            section === 'career'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <Trophy className="w-3.5 h-3.5 text-amber-300" />
                        <span>Career Fans</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setSection('gacha')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            section === 'gacha'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Gacha Tracker</span>
                    </button>
                </div>
            </div>

            {/* CAREER ANALYTICS SECTION */}
            {(section === 'all' || section === 'career') && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            <h2 className="text-base font-black text-slate-900 dark:text-white">
                                Analisis Pelacakan Karir & Fans
                            </h2>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Line Chart: Fans Tracking with Target Quota (2 columns) */}
                        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                                        <span>Tren Akumulasi Fans Harian</span>
                                        {careerRange === 'this_month' && (
                                            <span className="text-[11px] font-normal text-slate-400">vs Target Kuota Circle</span>
                                        )}
                                    </h3>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                        {careerRange === 'this_month'
                                            ? `Garis akumulasi total fans (dalam Jutaan) dibandingkan garis kuota target (${(targetQuota / 1000000).toFixed(0)}M)`
                                            : `Garis akumulasi total fans (dalam Jutaan) pada rentang ${careerRange === '30_days' ? '30 hari terakhir' : '7 hari terakhir'}`}
                                    </p>
                                </div>

                                {/* Time Range Switcher */}
                                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/70 dark:border-slate-700 self-start sm:self-auto">
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
                            </div>

                            {/* Chart Container */}
                            <div className="h-72 w-full">
                                {formattedTrends.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                                        Belum ada data karir tercatat untuk rentang ini.
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={formattedTrends} margin={{ top: 15, right: 15, left: -5, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="cumulFanColor" x1="0" y1="0" x2="0" y2="1">
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
                                            <Tooltip content={<CustomCumulativeFansTooltip />} />
                                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                            {/* Target Quota Reference Line - Only visible on Bulan Berjalan */}
                                            {careerRange === 'this_month' && (
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
                                            )}
                                            <Area
                                                type="monotone"
                                                dataKey="cumulative_fans_m"
                                                name="Akumulasi Fans"
                                                stroke="#059669"
                                                strokeWidth={3}
                                                fillOpacity={1}
                                                fill="url(#cumulFanColor)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        {/* Bar Chart: Scenario Performance Breakdown (1 column) */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
                            <div>
                                <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                                        Performa Skenario
                                    </h3>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                        Perbandingan rata-rata perolehan fans (in Millions) antar skenario
                                    </p>
                                </div>

                                <div className="h-64 w-full mt-3">
                                    {formattedScenarios.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-xs text-slate-400">
                                            Belum ada skenario karir tercatat.
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={formattedScenarios} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                                                <XAxis type="number" unit="M" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                                <YAxis
                                                    type="category"
                                                    dataKey="name"
                                                    tick={{ fontSize: 10, fill: '#64748b' }}
                                                    width={90}
                                                    axisLine={false}
                                                    tickLine={false}
                                                />
                                                <Tooltip content={<CustomScenarioTooltip />} />
                                                <Bar dataKey="avg_fans_m" fill="#10b981" radius={[0, 6, 6, 0]}>
                                                    {formattedScenarios.map((entry, index) => (
                                                        <Cell
                                                            key={`cell-${index}`}
                                                            fill={index === 0 ? '#059669' : index === 1 ? '#10b981' : '#34d399'}
                                                        />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>

                            <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <span>Total Skenario: {formattedScenarios.length}</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                    Top: {formattedScenarios[0]?.name || '-'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Card: Trek Akumulasi Fans pada Bulan-Bulan Sebelumnya */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
                        {/* Card Header & Month Switcher */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="p-1.5 rounded-xl bg-indigo-500/15 text-indigo-500">
                                        <History className="w-5 h-5" />
                                    </span>
                                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                                        Trek Akumulasi Fans Bulan-Bulan Sebelumnya
                                    </h3>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Histori akumulasi capaian fans harian per bulan lampau terhadap target kuota circle
                                </p>
                            </div>

                            {/* Month Selector Buttons */}
                            {historicalMonths.length > 0 && (
                                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200/70 dark:border-slate-700 self-start sm:self-auto flex-wrap">
                                    {historicalMonths.map(m => {
                                        const isSelected = activePastMonth?.month_key === m.month_key;
                                        return (
                                            <button
                                                key={m.month_key}
                                                type="button"
                                                onClick={() => setSelectedPastMonthKey(m.month_key)}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                                                    isSelected
                                                        ? 'bg-indigo-600 text-white shadow-xs'
                                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                                }`}
                                            >
                                                <Calendar className="w-3.5 h-3.5" />
                                                <span>{m.month_name}</span>
                                                {m.quota_achieved && (
                                                    <span className={`text-[10px] px-1 py-0.2 rounded font-bold ${
                                                        isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                                    }`}>
                                                        ✓
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {historicalMonths.length === 0 ? (
                            <div className="py-12 text-center space-y-2">
                                <div className="inline-flex p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400">
                                    <History className="w-6 h-6" />
                                </div>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                    Belum ada data karir pada bulan-bulan sebelumnya.
                                </p>
                                <p className="text-[11px] text-slate-400">
                                    Data karir bulan berjalan akan tersimpan dan tampil sebagai arsip riwayat begitu memasuki bulan berikutnya.
                                </p>
                            </div>
                        ) : activePastMonth ? (
                            <div className="space-y-5">
                                {/* Quick Metrics Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80">
                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                            Total Fans
                                        </span>
                                        <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5 block">
                                            {(activePastMonth.total_fans / 1000000).toFixed(2)}M
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                            {activePastMonth.total_fans.toLocaleString('id-ID')} fans
                                        </span>
                                    </div>

                                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80">
                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                            Total Karir Run
                                        </span>
                                        <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5 block">
                                            {activePastMonth.runs_count} Run
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                            Terselesaikan
                                        </span>
                                    </div>

                                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80">
                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                            Rata-Rata Fans / Run
                                        </span>
                                        <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5 block">
                                            {(activePastMonth.avg_fans / 1000).toFixed(0)}K
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                            {activePastMonth.avg_fans.toLocaleString('id-ID')} fans/run
                                        </span>
                                    </div>

                                    <div className={`p-3.5 rounded-2xl border ${
                                        activePastMonth.quota_achieved
                                            ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/60'
                                            : 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-800/60'
                                    }`}>
                                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                                            Target Kuota ({(activePastMonth.target_quota / 1000000).toFixed(0)}M)
                                        </span>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className={`text-base sm:text-lg font-black ${
                                                activePastMonth.quota_achieved
                                                    ? 'text-emerald-600 dark:text-emerald-400'
                                                    : 'text-amber-600 dark:text-amber-400'
                                            }`}>
                                                {activePastMonth.quota_percentage}%
                                            </span>
                                            {activePastMonth.quota_achieved && (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                            )}
                                        </div>
                                        <span className={`text-[10px] font-semibold ${
                                            activePastMonth.quota_achieved
                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                : 'text-amber-600 dark:text-amber-400'
                                        }`}>
                                            {activePastMonth.quota_achieved ? 'Kuota Tercapai 🎉' : 'Belum Memenuhi Target'}
                                        </span>
                                    </div>
                                </div>

                                {/* Accumulation Chart Container */}
                                <div className="h-72 w-full pt-2">
                                    {formattedPastTrends.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-xs text-slate-400">
                                            Belum ada data akumulasi harian untuk bulan ini.
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={formattedPastTrends} margin={{ top: 15, right: 15, left: -5, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="pastMonthCumulFanColor" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
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
                                                <Tooltip content={<CustomCumulativeFansTooltip />} />
                                                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                                <ReferenceLine
                                                    y={activePastMonth.target_quota / 1000000}
                                                    stroke="#f59e0b"
                                                    strokeDasharray="4 4"
                                                    strokeWidth={2}
                                                    label={{
                                                        value: `Target Quota (${(activePastMonth.target_quota / 1000000).toFixed(0)}M)`,
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
                                                    stroke="#4f46e5"
                                                    strokeWidth={3}
                                                    fillOpacity={1}
                                                    fill="url(#pastMonthCumulFanColor)"
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}

            {/* GACHA ANALYTICS SECTION */}
            {(section === 'all' || section === 'gacha') && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-amber-500" />
                            <div>
                                <h2 className="text-base font-black text-slate-900 dark:text-white">
                                    Analisis Hoki & Distribusi Rarity Gacha
                                </h2>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Evaluasi terpisah antara Gacha Karakter (Pretty Derby) dan Gacha Support Card
                                </p>
                            </div>
                        </div>

                        {/* Category Selector Toggle */}
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700 self-start sm:self-auto shrink-0">
                            <button
                                type="button"
                                onClick={() => setGachaCategory('character')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                    gachaCategory === 'character'
                                        ? 'bg-rose-500 text-white shadow-xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <span>🌸 Karakter</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setGachaCategory('support_card')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                    gachaCategory === 'support_card'
                                        ? 'bg-amber-500 text-white shadow-xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <span>🃏 Support Card</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setGachaCategory('all')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    gachaCategory === 'all'
                                        ? 'bg-indigo-600 text-white shadow-xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <span>🌐 Semua</span>
                            </button>
                        </div>
                    </div>

                    {/* Secondary Context & Rate Pool Sub-filter */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-850/80 p-3 rounded-2xl border border-slate-200/70 dark:border-slate-800 text-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-500 dark:text-slate-400">Filter Aktif:</span>
                            <span className={`px-2.5 py-0.5 rounded-lg font-black text-[11px] ${
                                gachaCategory === 'character'
                                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                    : gachaCategory === 'support_card'
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                        : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                            }`}>
                                {gachaCategory === 'character' ? '🌸 Gacha Karakter' : gachaCategory === 'support_card' ? '🃏 Gacha Support Card' : '🌐 Semua Gacha'}
                            </span>
                            <span className="text-slate-300 dark:text-slate-700">•</span>
                            <span className="text-slate-600 dark:text-slate-400">
                                Target Patokan: <strong className="text-slate-900 dark:text-white font-mono">{currentBaseRate.toFixed(1)}%</strong> (~{currentExpectedInterval} pull/{isChar ? 'Karakter B3' : 'SSR'})
                            </span>
                        </div>

                        <div className="flex items-center gap-1 self-start sm:self-auto shrink-0 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700">
                            <span className="text-[10px] font-bold text-slate-400 px-1.5 uppercase">Pool Rate:</span>
                            <button
                                type="button"
                                onClick={() => setGachaPool('all')}
                                className={`px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                                    gachaPool === 'all'
                                        ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-xs'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                                }`}
                            >
                                Semua
                            </button>
                            <button
                                type="button"
                                onClick={() => setGachaPool('standard')}
                                className={`px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                                    gachaPool === 'standard'
                                        ? 'bg-amber-500 text-white shadow-xs'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                                }`}
                            >
                                Standar (3.0%)
                            </button>
                            <button
                                type="button"
                                onClick={() => setGachaPool('boosted')}
                                className={`px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                                    gachaPool === 'boosted'
                                        ? 'bg-rose-500 text-white shadow-xs'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                                }`}
                            >
                                Boosted (4.5%)
                            </button>
                        </div>
                    </div>

                    {/* Category Separation Breakdown Cards (Karakter vs Support Card) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Card 1: Gacha Karakter */}
                        <div
                            onClick={() => setGachaCategory('character')}
                            className={`rounded-3xl p-5 border transition-all cursor-pointer relative ${
                                gachaCategory === 'character'
                                    ? 'bg-white dark:bg-slate-900 border-rose-500 ring-2 ring-rose-500/20 shadow-md'
                                    : 'bg-white/70 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:border-rose-400/60'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                                        <span>🌸 Gacha Karakter</span>
                                    </h3>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                        Pretty Derby (3★ Uma Musume)
                                    </p>
                                </div>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                                    Base: {charCat.base_rate}%
                                </span>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                                    <span>Target Interval Patokan:</span>
                                    <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">
                                        ~{charCat.expected_interval} Tarikan / Karakter B3
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                                    <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
                                        <div className="text-[10px] text-slate-400 font-medium">Total Pull</div>
                                        <div className="text-base font-black text-slate-900 dark:text-white font-mono mt-0.5">
                                            {charCat.total_pulls}
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
                                        <div className="text-[10px] text-slate-400 font-medium">Karakter B3</div>
                                        <div className="text-base font-black text-rose-600 dark:text-rose-400 font-mono mt-0.5">
                                            {charCat.ssr_count}
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
                                        <div className="text-[10px] text-slate-400 font-medium">Rate B3</div>
                                        <div className={`text-base font-black font-mono mt-0.5 ${charCat.luck_diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                            {charCat.ssr_rate}%
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between text-[10px] pt-1 font-semibold">
                                    <span className={charCat.luck_diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                                        {charCat.total_pulls > 0 ? `${charCat.luck_diff >= 0 ? '+' : ''}${charCat.luck_diff}% vs base ${charCat.base_rate}%` : 'Belum ada data'}
                                    </span>
                                    <span className="text-rose-600 dark:text-rose-400 font-bold">
                                        {gachaCategory === 'character' ? '● Aktif Ditampilkan' : 'Pilih Karakter →'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Card 2: Gacha Support Card */}
                        <div
                            onClick={() => setGachaCategory('support_card')}
                            className={`rounded-3xl p-5 border transition-all cursor-pointer relative ${
                                gachaCategory === 'support_card'
                                    ? 'bg-white dark:bg-slate-900 border-amber-500 ring-2 ring-amber-500/20 shadow-md'
                                    : 'bg-white/70 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:border-amber-400/60'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                                        <span>🃏 Gacha Support Card</span>
                                    </h3>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                        Kartu Bantuan Latihan (SSR / SR)
                                    </p>
                                </div>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60">
                                    Base: {suppCat.base_rate}%
                                </span>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                                    <span>Target Interval Patokan:</span>
                                    <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">
                                        ~{suppCat.expected_interval} Tarikan / SSR
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                                    <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
                                        <div className="text-[10px] text-slate-400 font-medium">Total Pull</div>
                                        <div className="text-base font-black text-slate-900 dark:text-white font-mono mt-0.5">
                                            {suppCat.total_pulls}
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
                                        <div className="text-[10px] text-slate-400 font-medium">SSR</div>
                                        <div className="text-base font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5">
                                            {suppCat.ssr_count}
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
                                        <div className="text-[10px] text-slate-400 font-medium">SSR Rate</div>
                                        <div className={`text-base font-black font-mono mt-0.5 ${suppCat.luck_diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                            {suppCat.ssr_rate}%
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between text-[10px] pt-1 font-semibold">
                                    <span className={suppCat.luck_diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                                        {suppCat.total_pulls > 0 ? `${suppCat.luck_diff >= 0 ? '+' : ''}${suppCat.luck_diff}% vs base ${suppCat.base_rate}%` : 'Belum ada data'}
                                    </span>
                                    <span className="text-amber-600 dark:text-amber-400 font-bold">
                                        {gachaCategory === 'support_card' ? '● Aktif Ditampilkan' : 'Pilih Support →'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Card 3: Semua Gacha (Gabungan) */}
                        <div
                            onClick={() => setGachaCategory('all')}
                            className={`rounded-3xl p-5 border transition-all cursor-pointer relative ${
                                gachaCategory === 'all'
                                    ? 'bg-white dark:bg-slate-900 border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                                    : 'bg-white/70 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:border-indigo-400/60'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                                        <span>🌐 Semua Gacha</span>
                                    </h3>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                        Akumulasi Karakter + Support Card
                                    </p>
                                </div>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700/60">
                                    Semua Tipe
                                </span>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                                    <span>Komposisi Tarikan:</span>
                                    <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">
                                        {charCat.total_pulls} Karakter + {suppCat.total_pulls} Support
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                                    <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
                                        <div className="text-[10px] text-slate-400 font-medium">Total Pull</div>
                                        <div className="text-base font-black text-slate-900 dark:text-white font-mono mt-0.5">
                                            {allCat.total_pulls}
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
                                        <div className="text-[10px] text-slate-400 font-medium">SSR</div>
                                        <div className="text-base font-black text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">
                                            {allCat.ssr_count}
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
                                        <div className="text-[10px] text-slate-400 font-medium">SSR Rate</div>
                                        <div className="text-base font-black text-slate-900 dark:text-white font-mono mt-0.5">
                                            {allCat.ssr_rate}%
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between text-[10px] pt-1 font-semibold">
                                    <span className="text-slate-500 dark:text-slate-400">
                                        {charCat.ssr_count} B3 Karakter • {suppCat.ssr_count} SSR Support
                                    </span>
                                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                                        {gachaCategory === 'all' ? '● Aktif Ditampilkan' : 'Pilih Semua →'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Donut Chart: Actual Rarity vs Baseline (1 column) */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
                            <div>
                                <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                                        <span>Distribusi Rarity</span>
                                        <span className="text-[11px] font-normal text-slate-400">vs Patokan Resmi ({currentBaseRate.toFixed(1)}%)</span>
                                    </h3>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                        Persentase perolehan {isChar ? 'Karakter B3' : 'SSR'} aktual {gachaCategory === 'character' ? 'Gacha Karakter' : gachaCategory === 'support_card' ? 'Gacha Support Card' : 'Semua Gacha'} dibandingkan target patokan {currentBaseRate.toFixed(1)}%
                                    </p>
                                </div>

                                <div className="h-48 w-full relative mt-2">
                                    {totalPulls > 0 ? (
                                        <>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={rarityDonutData}
                                                        innerRadius={52}
                                                        outerRadius={76}
                                                        paddingAngle={3}
                                                        dataKey="value"
                                                        onMouseEnter={(entry) => setHoveredRarity(entry)}
                                                        onMouseLeave={() => setHoveredRarity(null)}
                                                    >
                                                        {rarityDonutData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip content={<CustomDonutTooltip />} wrapperStyle={{ zIndex: 40 }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className={`absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-opacity duration-150 z-0 ${hoveredRarity ? 'opacity-0' : 'opacity-100'}`}>
                                                <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">{ssrPct}%</span>
                                                <span className={`text-[10px] font-black uppercase tracking-wider ${currentBaseRate > 3.0 ? 'text-rose-500' : 'text-amber-500'}`}>
                                                    {isChar ? 'Rate B3' : 'SSR Rate'} ({currentBaseRate.toFixed(1)}%)
                                                </span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-center p-4">
                                            <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center mb-2">
                                                <PieChartIcon className="w-6 h-6 text-slate-400" />
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                Belum ada tarikan gacha tercatat pada kategori/pool ini.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Comparison Legend & Luck Delta */}
                            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                                {rarityDonutData.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                                            <span className="font-semibold text-slate-700 dark:text-slate-300">{item.name}</span>
                                        </div>
                                        <div className="font-mono text-right">
                                            <span className="font-bold text-slate-900 dark:text-white">{item.percentage}%</span>
                                            <span className="text-[10px] text-slate-400 ml-1.5">(Resmi: {item.baseline})</span>
                                        </div>
                                    </div>
                                ))}

                                <div className="mt-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px]">
                                    <span className="font-bold text-slate-600 dark:text-slate-400">Indikator Hoki {isChar ? 'Karakter B3' : 'SSR'}:</span>
                                    <span className={`font-black font-mono px-2 py-0.5 rounded-md ${
                                        parseFloat(ssrPct) >= currentBaseRate
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                            : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                    }`}>
                                        {parseFloat(ssrPct) >= currentBaseRate ? '+' : ''}{(parseFloat(ssrPct) - currentBaseRate).toFixed(2)}% vs {currentBaseRate.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Bar / Scatter Chart: Pity Intervals (2 columns) */}
                        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                                        <span>Interval Tarikan per {isChar ? 'Karakter B3' : 'Kartu SSR'} (Pity Intervals)</span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                            gachaCategory === 'character' || currentBaseRate > 3.0
                                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                        }`}>
                                            {formattedIntervals.length} {isChar ? 'Karakter B3' : (gachaCategory === 'support_card' ? 'SSR Support Card' : 'SSR')}
                                        </span>
                                    </h3>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                        Jumlah tarikan yang dibutuhkan untuk tiap {isChar ? 'Karakter B3' : 'kartu SSR'} (Patokan rata-rata: ~{currentExpectedInterval} tarikan pada rate {currentBaseRate.toFixed(1)}%)
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 text-[11px]">
                                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                                        <span>Hoki (&le; {currentLuckyThreshold} pull)</span>
                                    </span>
                                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                                        <span>Pity (&gt; {currentLuckyThreshold} pull)</span>
                                    </span>
                                </div>
                            </div>

                            <div className="h-64 w-full">
                                {formattedIntervals.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                                        Belum ada data {isChar ? 'Karakter B3' : 'kartu SSR'} tercatat pada kategori/pool ini untuk mengukur interval tarikan.
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={formattedIntervals} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                                            <XAxis
                                                dataKey="label"
                                                tick={{ fontSize: 10, fill: '#64748b' }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <YAxis
                                                tick={{ fontSize: 10, fill: '#64748b' }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <Tooltip content={<CustomPityTooltip />} />
                                            <ReferenceLine
                                                y={currentExpectedInterval}
                                                stroke="#94a3b8"
                                                strokeDasharray="4 4"
                                                label={{
                                                    value: `Patokan (~${currentExpectedInterval} pull)`,
                                                    position: 'right',
                                                    fill: '#64748b',
                                                    fontSize: 10
                                                }}
                                            />
                                            <Bar dataKey="pulls_count" radius={[6, 6, 0, 0]}>
                                                {formattedIntervals.map((entry, index) => (
                                                    <Cell
                                                        key={`cell-${index}`}
                                                        fill={entry.is_lucky ? '#10b981' : entry.pulls_count > (currentExpectedInterval * 2) ? '#f43f5e' : '#f59e0b'}
                                                    />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
