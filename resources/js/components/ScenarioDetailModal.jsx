import React, { useState, useEffect, useMemo } from 'react';
import { X, Target, Users, Trophy, Calendar, Search, ArrowUpDown, ChevronRight, Sparkles, RefreshCw, Layers } from 'lucide-react';
import RankBadge from './RankBadge';
import { formatIndonesianDate } from '../utils/dateHelper';

export default function ScenarioDetailModal({
    isOpen,
    scenarioName,
    onClose,
}) {
    const [loading, setLoading] = useState(false);
    const [detail, setDetail] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('total_fans');
    const [sortOrder, setSortOrder] = useState('desc');
    const [activeTab, setActiveTab] = useState('characters'); // 'characters' | 'recent'

    // Fetch scenario detail from API
    const fetchDetail = async () => {
        if (!scenarioName) return;
        setLoading(true);
        setErrorMsg('');
        try {
            const res = await fetch(`/api/career/scenario-detail?scenario=${encodeURIComponent(scenarioName)}`, {
                headers: { 'Accept': 'application/json' },
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Gagal memuat detail skenario.');
            }
            setDetail(data);
        } catch (err) {
            console.error('Error fetching scenario detail:', err);
            setErrorMsg(err.message || 'Terjadi kesalahan saat memuat detail skenario.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && scenarioName) {
            setSearchQuery('');
            setSortBy('total_fans');
            setSortOrder('desc');
            setActiveTab('characters');
            fetchDetail();
        } else {
            setDetail(null);
            setErrorMsg('');
        }
    }, [isOpen, scenarioName]);

    // Handle ESC key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Filter & sort characters
    const filteredCharacters = useMemo(() => {
        if (!detail?.characters) return [];
        let list = [...detail.characters];

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(c => c.uma_name.toLowerCase().includes(q));
        }

        list.sort((a, b) => {
            let valA = a[sortBy];
            let valB = b[sortBy];

            if (typeof valA === 'string') {
                valA = valA.toLowerCase();
                valB = (valB || '').toLowerCase();
                return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }

            valA = Number(valA) || 0;
            valB = Number(valB) || 0;
            return sortOrder === 'asc' ? valA - valB : valB - valA;
        });

        return list;
    }, [detail?.characters, searchQuery, sortBy, sortOrder]);

    if (!isOpen) return null;

    const totalScenarioFans = detail?.total_fans || 0;

    return (
        <div
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] animate-scaleUp"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/40">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
                            <Target className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                                    {scenarioName}
                                </h3>
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold shrink-0">
                                    Skenario Latihan
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                Rincian performa fans dan daftar karakter yang tercatat pada skenario ini
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
                    {loading ? (
                        <div className="py-16 text-center space-y-3">
                            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
                            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                                Memuat data rincian skenario {scenarioName}...
                            </p>
                        </div>
                    ) : errorMsg ? (
                        <div className="py-12 text-center space-y-3">
                            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center mx-auto">
                                <X className="w-6 h-6" />
                            </div>
                            <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{errorMsg}</p>
                            <button
                                type="button"
                                onClick={fetchDetail}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                            >
                                Coba Lagi
                            </button>
                        </div>
                    ) : detail ? (
                        <>
                            {/* Summary KPI Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {/* Total Fans */}
                                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 dark:border-emerald-500/30">
                                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                                        Total Fans Diraih
                                    </span>
                                    <div className="mt-1 font-mono font-black text-xl sm:text-2xl text-emerald-600 dark:text-emerald-400">
                                        {(detail.total_fans || 0).toLocaleString('id-ID')}
                                    </div>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                                        Akumulasi seluruh sesi
                                    </span>
                                </div>

                                {/* Total Runs */}
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                                        Total Sesi Latihan
                                    </span>
                                    <div className="mt-1 font-mono font-black text-xl sm:text-2xl text-slate-800 dark:text-slate-100">
                                        {detail.total_runs || 0}
                                    </div>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                                        {detail.characters?.length || 0} karakter berbeda
                                    </span>
                                </div>

                                {/* Avg Fans */}
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                                        Rata-rata Fans
                                    </span>
                                    <div className="mt-1 font-mono font-black text-xl sm:text-2xl text-slate-800 dark:text-slate-100">
                                        {(detail.avg_fans || 0).toLocaleString('id-ID')}
                                    </div>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                                        per sesi latihan
                                    </span>
                                </div>

                                {/* Max Record */}
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                                        Rekor Maksimal
                                    </span>
                                    <div className="mt-1 font-mono font-black text-xl sm:text-2xl text-amber-600 dark:text-amber-400">
                                        {(detail.max_fans || 0).toLocaleString('id-ID')}
                                    </div>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                                        Min: {(detail.min_fans || 0).toLocaleString('id-ID')}
                                    </span>
                                </div>
                            </div>

                            {/* Tabs Switcher */}
                            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('characters')}
                                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                            activeTab === 'characters'
                                                ? 'bg-emerald-600 text-white shadow-xs'
                                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        <Users className="w-3.5 h-3.5" />
                                        <span>Karakter Tercatat ({detail.characters?.length || 0})</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('recent')}
                                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                            activeTab === 'recent'
                                                ? 'bg-emerald-600 text-white shadow-xs'
                                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        <Layers className="w-3.5 h-3.5" />
                                        <span>Riwayat Sesi Terakhir ({detail.recent_runs?.length || 0})</span>
                                    </button>
                                </div>
                            </div>

                            {/* Tab 1: Characters Breakdown */}
                            {activeTab === 'characters' && (
                                <div className="space-y-3">
                                    {/* Search & Sort Controls */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                        <div className="relative flex-1">
                                            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Cari nama Uma Musume..."
                                                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                            />
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
                                                Urutkan:
                                            </span>
                                            <select
                                                value={sortBy}
                                                onChange={(e) => setSortBy(e.target.value)}
                                                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                            >
                                                <option value="total_fans">Total Fans</option>
                                                <option value="runs_count">Jumlah Sesi</option>
                                                <option value="avg_fans">Rata-rata Fans</option>
                                                <option value="max_fans">Rekor Tertinggi</option>
                                                <option value="uma_name">Nama Karakter</option>
                                            </select>

                                            <button
                                                type="button"
                                                onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                                                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                                title={sortOrder === 'desc' ? 'Urutan Menurun (Tertinggi)' : 'Urutan Menaik (Terendah)'}
                                            >
                                                <ArrowUpDown className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Characters List */}
                                    {filteredCharacters.length === 0 ? (
                                        <div className="py-8 text-center text-slate-400 text-xs font-semibold">
                                            Tidak ada karakter yang cocok dengan pencarian.
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {filteredCharacters.map((char, idx) => {
                                                const fanPercent = totalScenarioFans > 0
                                                    ? Math.round((char.total_fans / totalScenarioFans) * 100)
                                                    : 0;

                                                return (
                                                    <div
                                                        key={idx}
                                                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 hover:border-emerald-400 dark:hover:border-emerald-500/60 transition-all flex flex-col justify-between gap-3 shadow-2xs"
                                                    >
                                                        {/* Top Row: Avatar & Name */}
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                {char.image_url ? (
                                                                    <img
                                                                        src={char.image_url}
                                                                        alt={char.uma_name}
                                                                        className="w-11 h-11 rounded-xl object-cover object-top shrink-0 border border-slate-200 dark:border-slate-700 shadow-2xs"
                                                                        loading="lazy"
                                                                    />
                                                                ) : (
                                                                    <div className="w-11 h-11 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center font-black text-sm shrink-0">
                                                                        {char.uma_name.slice(0, 2).toUpperCase()}
                                                                    </div>
                                                                )}
                                                                <div className="min-w-0">
                                                                    <div className="font-black text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate" title={char.uma_name}>
                                                                        {char.uma_name}
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                                                            {char.runs_count} sesi latihan
                                                                        </span>
                                                                        <span className="text-slate-300 dark:text-slate-600">•</span>
                                                                        <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                                            {fanPercent}% dari skenario
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Best Rank Badge */}
                                                            {char.best_rank && (
                                                                <div className="shrink-0 flex flex-col items-end">
                                                                    <RankBadge rank={char.best_rank} size="xs" />
                                                                    <span className="text-[9px] text-slate-400 mt-0.5 font-bold">Best Rank</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Bottom Row: Stats Grid */}
                                                        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 grid grid-cols-3 gap-1 text-center">
                                                            <div className="text-left">
                                                                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                                                                    Total Fans
                                                                </span>
                                                                <span className="font-mono font-black text-xs text-emerald-600 dark:text-emerald-400">
                                                                    {char.total_fans.toLocaleString('id-ID')}
                                                                </span>
                                                            </div>
                                                            <div className="text-center">
                                                                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                                                                    Rata-rata
                                                                </span>
                                                                <span className="font-mono font-black text-xs text-slate-800 dark:text-slate-200">
                                                                    {char.avg_fans.toLocaleString('id-ID')}
                                                                </span>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                                                                    Rekor Tertinggi
                                                                </span>
                                                                <span className="font-mono font-black text-xs text-amber-600 dark:text-amber-400">
                                                                    {char.max_fans.toLocaleString('id-ID')}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Tab 2: Recent Runs in this Scenario */}
                            {activeTab === 'recent' && (
                                <div className="space-y-2.5">
                                    {(!detail.recent_runs || detail.recent_runs.length === 0) ? (
                                        <div className="py-8 text-center text-slate-400 text-xs font-semibold">
                                            Belum ada catatan sesi pelatihan pada skenario ini.
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {detail.recent_runs.map((r) => (
                                                <div
                                                    key={r.id}
                                                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="shrink-0 text-center font-mono">
                                                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                                                                {formatIndonesianDate(r.run_date, 'short')}
                                                            </span>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                                                                {r.uma_name}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                                <span className={`px-1.5 py-0.2 rounded font-bold ${
                                                                    r.training_type === 'independent'
                                                                        ? 'bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300'
                                                                        : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                                                }`}>
                                                                    {r.training_type === 'independent' ? '⚡ Mandiri' : '🎮 Manual'}
                                                                </span>
                                                                {r.notes && (
                                                                    <span className="truncate italic">
                                                                        {r.notes}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-3 shrink-0">
                                                        <div className="text-right">
                                                            <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 block">
                                                                +{r.fans_gained.toLocaleString('id-ID')}
                                                            </span>
                                                            {r.evaluation_score && (
                                                                <span className="text-[10px] font-mono text-slate-400">
                                                                    {r.evaluation_score.toLocaleString('id-ID')} pts
                                                                </span>
                                                            )}
                                                        </div>
                                                        <RankBadge rank={r.final_rank} size="xs" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : null}
                </div>

                {/* Footer */}
                <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Klik di luar atau tekan ESC untuk menutup</span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
}
