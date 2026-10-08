import React, { useState, useEffect, useMemo } from 'react';
import { X, Users, Trophy, Calendar, Search, ArrowUpDown, ChevronRight, Sparkles, RefreshCw, Layers, Award } from 'lucide-react';
import RankBadge from './RankBadge';
import { formatIndonesianDate } from '../utils/dateHelper';

export default function CharacterScenarioDetailModal({
    isOpen,
    umaName,
    onClose,
}) {
    const [loading, setLoading] = useState(false);
    const [detail, setDetail] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('total_fans');
    const [sortOrder, setSortOrder] = useState('desc');
    const [activeTab, setActiveTab] = useState('scenarios'); // 'scenarios' | 'recent'
    const [imgFailed, setImgFailed] = useState(false);

    // Fetch character detail from API
    const fetchDetail = async () => {
        if (!umaName) return;
        setLoading(true);
        setErrorMsg('');
        setImgFailed(false);
        try {
            const res = await fetch(`/api/career/character-detail?uma_name=${encodeURIComponent(umaName)}`, {
                headers: { 'Accept': 'application/json' },
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Gagal memuat statistik karakter.');
            }
            setDetail(data);
        } catch (err) {
            console.error('Error fetching character detail:', err);
            setErrorMsg(err.message || 'Terjadi kesalahan saat memuat statistik karakter.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && umaName) {
            setSearchQuery('');
            setSortBy('total_fans');
            setSortOrder('desc');
            setActiveTab('scenarios');
            fetchDetail();
        } else {
            setDetail(null);
            setErrorMsg('');
        }
    }, [isOpen, umaName]);

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

    // Filter & sort scenarios
    const filteredScenarios = useMemo(() => {
        if (!detail?.scenarios) return [];
        let list = [...detail.scenarios];

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(s => s.scenario.toLowerCase().includes(q));
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
    }, [detail?.scenarios, searchQuery, sortBy, sortOrder]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-scaleUp"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/60 dark:bg-slate-800/40">
                    <div className="flex items-center gap-3.5 min-w-0">
                        {/* Avatar */}
                        {detail?.image_url && !imgFailed ? (
                            <img
                                src={detail.image_url}
                                alt={umaName}
                                onError={() => setImgFailed(true)}
                                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover object-top border-2 border-emerald-500 shadow-sm shrink-0"
                                loading="eager"
                            />
                        ) : (
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-black text-base sm:text-lg shrink-0 shadow-sm">
                                {umaName ? umaName.slice(0, 2).toUpperCase() : 'UM'}
                            </div>
                        )}

                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300">
                                    Performa Karakter Per Skenario
                                </span>
                            </div>
                            <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-slate-100 truncate mt-0.5" title={umaName}>
                                {umaName}
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Statistik penggunaan & capaian fans pada tiap skenario latihan
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {detail?.best_rank && (
                            <div className="hidden sm:flex flex-col items-end mr-1">
                                <RankBadge rank={detail.best_rank} size="sm" />
                                <span className="text-[9px] text-slate-400 font-bold mt-0.5">Best Overall</span>
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Tutup dialog"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                    {/* Loading State */}
                    {loading && (
                        <div className="py-20 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 gap-3">
                            <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 dark:text-emerald-400" />
                            <span className="text-sm font-bold">Memuat statistik performa skenario...</span>
                        </div>
                    )}

                    {/* Error State */}
                    {errorMsg && !loading && (
                        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-sm flex items-center justify-between">
                            <span>{errorMsg}</span>
                            <button
                                type="button"
                                onClick={fetchDetail}
                                className="px-3 py-1 rounded-lg bg-rose-200 dark:bg-rose-800 text-xs font-bold hover:opacity-90"
                            >
                                Coba Lagi
                            </button>
                        </div>
                    )}

                    {/* Content Loaded */}
                    {!loading && !errorMsg && detail && (
                        <>
                            {/* Summary Metrics Cards */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                                {/* Total Runs */}
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                                        Total Latihan
                                    </span>
                                    <div className="mt-1 font-mono font-black text-xl sm:text-2xl text-slate-900 dark:text-slate-100">
                                        {detail.total_runs} <span className="text-xs font-sans text-slate-400 font-bold">sesi</span>
                                    </div>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                                        di {detail.scenarios?.length || 0} skenario berbeda
                                    </span>
                                </div>

                                {/* Total Fans */}
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                                        Total Fans Diraih
                                    </span>
                                    <div className="mt-1 font-mono font-black text-xl sm:text-2xl text-emerald-600 dark:text-emerald-400">
                                        {(detail.total_fans || 0).toLocaleString('id-ID')}
                                    </div>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                                        seluruh riwayat karir
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
                                        Rekor Tertinggi
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
                                        onClick={() => setActiveTab('scenarios')}
                                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                            activeTab === 'scenarios'
                                                ? 'bg-emerald-600 text-white shadow-xs'
                                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        <Layers className="w-3.5 h-3.5" />
                                        <span>Rincian Skenario ({detail.scenarios?.length || 0})</span>
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
                                        <Award className="w-3.5 h-3.5" />
                                        <span>Riwayat Sesi Terakhir ({detail.recent_runs?.length || 0})</span>
                                    </button>
                                </div>
                            </div>

                            {/* Tab 1: Scenarios Breakdown */}
                            {activeTab === 'scenarios' && (
                                <div className="space-y-3">
                                    {/* Search & Sort Controls */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                        <div className="relative flex-1">
                                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                            <input
                                                type="text"
                                                placeholder="Cari skenario..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            />
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Urutkan:</span>
                                            <select
                                                value={sortBy}
                                                onChange={(e) => setSortBy(e.target.value)}
                                                className="text-xs font-bold py-1.5 px-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none"
                                            >
                                                <option value="total_fans">Total Fans</option>
                                                <option value="runs_count">Sesi Latihan</option>
                                                <option value="avg_fans">Rata-rata Fans</option>
                                                <option value="max_fans">Rekor Tertinggi</option>
                                                <option value="scenario">Nama Skenario</option>
                                            </select>

                                            <button
                                                type="button"
                                                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                title={`Arah urutan: ${sortOrder === 'asc' ? 'Menaik' : 'Menurun'}`}
                                            >
                                                <ArrowUpDown className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Empty Scenarios */}
                                    {filteredScenarios.length === 0 ? (
                                        <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs font-bold">
                                            Tidak ada skenario yang sesuai dengan pencarian.
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {filteredScenarios.map((sc, idx) => (
                                                <div
                                                    key={idx}
                                                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 hover:border-emerald-400 dark:hover:border-emerald-500/60 transition-all flex flex-col justify-between gap-3 shadow-2xs"
                                                >
                                                    {/* Top Row: Scenario Name & Best Rank */}
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <div className="font-black text-sm text-slate-900 dark:text-slate-100 truncate" title={sc.scenario}>
                                                                {sc.scenario}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 mt-1">
                                                                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                                                    {sc.runs_count} sesi latihan
                                                                </span>
                                                                <span className="text-slate-300 dark:text-slate-600">•</span>
                                                                <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                                    {sc.percentage}% dari total latihan
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {sc.best_rank && (
                                                            <div className="shrink-0 flex flex-col items-end">
                                                                <RankBadge rank={sc.best_rank} size="xs" />
                                                                <span className="text-[9px] text-slate-400 mt-0.5 font-bold">Best Rank</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Bottom Row: Stats Grid */}
                                                    <div className="pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 grid grid-cols-3 gap-1 text-center">
                                                        <div className="text-left">
                                                            <span className="text-[10px] text-slate-400 uppercase font-bold block">
                                                                Total Fans
                                                            </span>
                                                            <span className="font-mono font-black text-xs text-emerald-600 dark:text-emerald-400">
                                                                {sc.total_fans.toLocaleString('id-ID')}
                                                            </span>
                                                        </div>
                                                        <div className="text-center">
                                                            <span className="text-[10px] text-slate-400 uppercase font-bold block">
                                                                Rata-rata
                                                            </span>
                                                            <span className="font-mono font-black text-xs text-slate-800 dark:text-slate-200">
                                                                {sc.avg_fans.toLocaleString('id-ID')}
                                                            </span>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-[10px] text-slate-400 uppercase font-bold block">
                                                                Rekor Tertinggi
                                                            </span>
                                                            <span className="font-mono font-black text-xs text-amber-600 dark:text-amber-400">
                                                                {sc.max_fans.toLocaleString('id-ID')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Tab 2: Recent Runs */}
                            {activeTab === 'recent' && (
                                <div className="space-y-2.5">
                                    {detail.recent_runs?.length === 0 ? (
                                        <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs font-bold">
                                            Belum ada riwayat sesi yang tercatat untuk karakter ini.
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                                                    <tr>
                                                        <th className="px-3.5 py-2.5">Tanggal</th>
                                                        <th className="px-3.5 py-2.5">Skenario</th>
                                                        <th className="px-3.5 py-2.5">Rank Evaluasi</th>
                                                        <th className="px-3.5 py-2.5 text-right">Skor Total</th>
                                                        <th className="px-3.5 py-2.5 text-right">Fans Diraih</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                                                    {detail.recent_runs.map((r, idx) => (
                                                        <tr key={r.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                                            <td className="px-3.5 py-2 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                                                                {r.run_date ? formatIndonesianDate(r.run_date) : '-'}
                                                            </td>
                                                            <td className="px-3.5 py-2 font-bold text-slate-800 dark:text-slate-200">
                                                                {r.scenario}
                                                            </td>
                                                            <td className="px-3.5 py-2">
                                                                <RankBadge rank={r.final_rank || 'G'} size="xs" />
                                                            </td>
                                                            <td className="px-3.5 py-2 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                                                                {r.evaluation_score ? r.evaluation_score.toLocaleString('id-ID') : '-'}
                                                            </td>
                                                            <td className="px-3.5 py-2 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                                                                +{(r.fans_gained || 0).toLocaleString('id-ID')}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/30">
                    <span>
                        Menampilkan performa riil sesi latihan dari database lokal
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-xl font-bold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
}
