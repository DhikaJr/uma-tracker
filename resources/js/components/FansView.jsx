import React, { useState, useEffect } from 'react';
import {
    Trophy,
    Plus,
    Users,
    Target,
    Trash2,
    Layers,
    Sparkles,
    Crown,
    TrendingUp,
    Search,
    ChevronLeft,
    ChevronRight,
    Edit3,
    CheckCircle2,
    RefreshCw,
    Calendar,
    RotateCcw
} from 'lucide-react';
import RankBadge from './RankBadge';
import DeleteConfirmModal from './DeleteConfirmModal';
import CareerOcrZone from './CareerOcrZone';
import EditCareerRunModal from './EditCareerRunModal';

// Categorized Rank Tiers for quick selection
const rankTierGroups = {
    'U-TIER': [
        'UG', 'UG1', 'UG3', 'UG5', 'UG7', 'UG9',
        'UF', 'UF1', 'UF3', 'UF5', 'UF7', 'UF9',
        'UE', 'UE1', 'UE3', 'UE5', 'UE7', 'UE9',
        'UD', 'UD1', 'UD3', 'UD5', 'UD7', 'UD9',
        'UC', 'UC1', 'UC3', 'UC5', 'UC7', 'UC9',
        'UB', 'UB1', 'UB3', 'UB5', 'UB7', 'UB9',
        'UA', 'UA1', 'UA3', 'UA5', 'UA7', 'UA9',
        'US', 'US1', 'US3', 'US5', 'US7', 'US9',
    ],
    'LEGEND (LG)': [
        'LG', 'LG1', 'LG2', 'LG3', 'LG4', 'LG5', 'LG6', 'LG7', 'LG8', 'LG9',
        'LG10', 'LG12', 'LG15', 'LG18', 'LG20', 'LG22', 'LG24',
    ],
    'LEGEND (LF)': [
        'LF', 'LF1', 'LF2', 'LF3', 'LF4', 'LF5', 'LF6', 'LF7', 'LF8', 'LF9',
        'LF10', 'LF12', 'LF15', 'LF18', 'LF20', 'LF22', 'LF24',
    ],
    'STAR (A-SS)': [
        'A', 'A+', 'S', 'S+', 'SS', 'SS+',
    ],
    'BEGINNER (G-B)': [
        'G', 'G+', 'F', 'F+', 'E', 'E+', 'D', 'D+', 'C', 'C+', 'B', 'B+',
    ],
};

// Default initial star ratings for base Uma Musume (1-star and 2-star; others default to 3)
const STATIC_UMA_STARS = {
    'Agnes Tachyon': 1,
    'Haru Urara': 1,
    'King Halo': 1,
    'Matikanefukukitaru': 1,
    'Mejiro Ryan': 1,
    'Nice Nature': 1,
    'Sakura Bakushin O': 1,
    'Twin Turbo': 1,
    'Winning Ticket': 1,
    'Air Groove': 2,
    'Biko Pegasus': 2,
    'Daiwa Scarlet': 2,
    'El Condor Pasa': 2,
    'Gold Ship': 2,
    'Grass Wonder': 2,
    'Ikuno Dictus': 2,
    'Matikanetannhauser': 2,
    'Mayano Top Gun': 2,
    'Royce and Royce': 2,
    'Super Creek': 2,
    'Tsurumaru Tsuyoshi': 2,
    'Vodka': 2,
};

// Quick Fill Presets for Career Run Notes
const QUICK_NOTES = [
    'Fans Gain Run',
    'Sprint Ace Run',
    'Mile Ace Run',
    'Medium Ace Run',
    'Long Ace Run',
    'Mile (Dirt) Ace Run',
    'Sprint (Dirt) Ace Run',
    'Medium (Dirt) Ace Run',
];

export default function FansView({ onNotify, circleGoal, setCircleGoal, onCareerStatsUpdate }) {
    // State
    const [runs, setRuns] = useState([]);
    const [editingRun, setEditingRun] = useState(null);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [stats, setStats] = useState(null);
    const [metadata, setMetadata] = useState({ scenarios: [], ranks: [], uma_presets: [], rank_thresholds: [], uma_stars: {} });
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Filters
    const [scenarioFilter, setScenarioFilter] = useState('all');
    const [rankMinFilter, setRankMinFilter] = useState('all');
    const [rankMaxFilter, setRankMaxFilter] = useState('all');
    const [trainingTypeFilter, setTrainingTypeFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);

    // Selection & Delete Modal State
    const [selectedRunIds, setSelectedRunIds] = useState([]);
    const [deleteModal, setDeleteModal] = useState({
        isOpen: false,
        mode: 'single', // 'single' or 'bulk'
        id: null,
        count: 1,
        loading: false,
    });

    // Form State
    const [form, setForm] = useState({
        uma_name: '',
        scenario: 'The Twinkle Legends',
        training_type: 'manual', // 'manual' or 'independent' (Latihan Mandiri / 自主練)
        fans_gained: '',
        evaluation_score: '',
        final_rank: '',
        notes: '',
        run_date: new Date().toISOString().slice(0, 10),
    });

    // Uma Character Directory Modal & Search
    const [showUmaModal, setShowUmaModal] = useState(false);
    const [umaModalSearch, setUmaModalSearch] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Helper: Parse thousand-separated string to integer
    const parseNumber = (val) => {
        if (!val) return 0;
        const cleaned = String(val).replace(/[^0-9]/g, '');
        return parseInt(cleaned, 10) || 0;
    };

    // Helper: Format number with dots (Indonesian thousands separator: 100.000.000)
    const formatNumber = (num) => {
        if (num === '' || num === null || num === undefined) return '';
        const clean = String(num).replace(/[^0-9]/g, '');
        if (!clean) return '';
        return parseInt(clean, 10).toLocaleString('id-ID');
    };

    // Uma Catalog Syncing State
    const [syncingCatalog, setSyncingCatalog] = useState(false);

    // Fetch Metadata (Scenarios, Ranks E to LG24, Uma presets)
    const fetchMeta = async () => {
        try {
            const res = await fetch('/api/career/metadata');
            const data = await res.json();
            setMetadata(data);
            if (data.scenarios?.length > 0 && !form.scenario) {
                setForm(prev => ({ ...prev, scenario: data.scenarios[0] }));
            }
        } catch (err) {
            console.error('Failed to load metadata:', err);
        }
    };

    useEffect(() => {
        fetchMeta();
    }, []);

    // Sync Uma Catalog from GameTora
    const handleSyncGametora = async () => {
        setSyncingCatalog(true);
        try {
            const res = await fetch('/api/career/sync-gametora', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await res.json();
            if (res.ok && data.success) {
                await fetchMeta();
                onNotify?.(data.message || 'Katalog karakter Uma Musume berhasil disinkronkan dari GameTora!', 'success');
            } else {
                onNotify?.(data.message || 'Gagal menyinkronkan data GameTora.', 'error');
            }
        } catch (err) {
            console.error('Sync failed:', err);
            onNotify?.('Gagal menghubungi server untuk sinkronisasi.', 'error');
        } finally {
            setSyncingCatalog(false);
        }
    };

    // Fetch Stats & Runs
    const fetchStats = async () => {
        try {
            const res = await fetch('/api/career/stats');
            const data = await res.json();
            setStats(data);
            onCareerStatsUpdate?.(data);
        } catch (err) {
            console.error('Failed to fetch career stats:', err);
        }
    };

    const fetchRuns = async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams({
                scenario: scenarioFilter,
                rank_min: rankMinFilter,
                rank_max: rankMaxFilter,
                training_type: trainingTypeFilter,
                date_from: dateFrom,
                date_to: dateTo,
                search: searchQuery,
                per_page: String(perPage),
                page: String(page),
            });
            const res = await fetch(`/api/career/runs?${query.toString()}`);
            const data = await res.json();
            setRuns(data.data || []);
            setPagination({
                current_page: data.current_page || 1,
                last_page: data.last_page || 1,
                total: data.total || 0,
            });
        } catch (err) {
            console.error('Failed to fetch runs:', err);
            onNotify?.('Error loading career runs', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        fetchRuns();
    }, [scenarioFilter, rankMinFilter, rankMaxFilter, trainingTypeFilter, dateFrom, dateTo, perPage, page]);

    // Handle Search
    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        fetchRuns();
    };

    // Handle Reset Filters
    const handleResetFilters = () => {
        setScenarioFilter('all');
        setRankMinFilter('all');
        setRankMaxFilter('all');
        setTrainingTypeFilter('all');
        setDateFrom('');
        setDateTo('');
        setSearchQuery('');
        setPage(1);
    };

    const fansGainedNum = parseNumber(form.fans_gained);

    // Form Submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.uma_name.trim()) {
            onNotify?.('Harap masukkan atau pilih nama Uma Musume!', 'error');
            return;
        }

        if (!form.fans_gained || fansGainedNum <= 0) {
            onNotify?.('Harap masukkan jumlah Fans Gained per Career Run!', 'error');
            return;
        }

        const scoreNum = parseNumber(form.evaluation_score);
        if (!scoreNum || scoreNum <= 0) {
            onNotify?.('Harap masukkan Skor Evaluasi / Rating Points (Auto-Select Rank) sebelum menyimpan!', 'error');
            return;
        }

        const computedRank = getRankFromScore(scoreNum) || form.final_rank || 'G';

        setSubmitting(true);
        try {
            const payload = {
                uma_name: form.uma_name.trim(),
                scenario: form.scenario,
                training_type: form.training_type || 'manual',
                fans_gained: fansGainedNum,
                evaluation_score: scoreNum,
                final_rank: computedRank,
                notes: form.notes.trim() || null,
                run_date: form.run_date,
            };

            const res = await fetch('/api/career/runs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.message || 'Failed to record career run');

            onNotify?.(`Career run recorded! +${fansGainedNum.toLocaleString('id-ID')} fans gained (${computedRank})!`, 'success');
            setForm(prev => ({ ...prev, fans_gained: '', evaluation_score: '', final_rank: '', notes: '' }));
            fetchStats();
            fetchRuns();
        } catch (err) {
            onNotify?.(err.message, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // Delete Modal Open
    const openDeleteModal = (mode, id = null) => {
        if (mode === 'bulk' && selectedRunIds.length === 0) return;
        setDeleteModal({
            isOpen: true,
            mode,
            id,
            count: mode === 'bulk' ? selectedRunIds.length : 1,
            loading: false,
        });
    };

    // Confirm Delete (Single or Bulk)
    const handleConfirmDelete = async () => {
        setDeleteModal(prev => ({ ...prev, loading: true }));
        try {
            if (deleteModal.mode === 'bulk') {
                const res = await fetch('/api/career/bulk-delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({ ids: selectedRunIds }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || 'Gagal menghapus data career run');
                onNotify?.(data.message || `${deleteModal.count} data career run berhasil dihapus!`, 'success');
                setSelectedRunIds([]);
            } else {
                const res = await fetch(`/api/career/runs/${deleteModal.id}`, {
                    method: 'DELETE',
                    headers: { 'Accept': 'application/json' },
                });
                if (!res.ok) throw new Error('Gagal menghapus catatan run');
                onNotify?.('Catatan career run berhasil dihapus!', 'info');
            }
            setDeleteModal({ isOpen: false, mode: 'single', id: null, count: 1, loading: false });
            fetchStats();
            fetchRuns();
        } catch (err) {
            onNotify?.(err.message || 'Terjadi kesalahan saat menghapus data.', 'error');
            setDeleteModal(prev => ({ ...prev, loading: false }));
        }
    };

    // Helper: Map rank to tier tab
    const getTierTabForRank = (rank) => {
        if (!rank) return 'U-TIER';
        for (const [tier, list] of Object.entries(rankTierGroups)) {
            if (list.includes(rank)) return tier;
        }
        if (/^(UG|UF|UE|UD|UC|UB|UA|US)/.test(rank)) return 'U-TIER';
        if (rank.startsWith('LF')) return 'LEGEND (LF)';
        if (rank.startsWith('LG')) return 'LEGEND (LG)';
        if (/^(A|S)/.test(rank)) return 'STAR (A-SS)';
        if (/^(G|F|E|D|C|B)/.test(rank)) return 'BEGINNER (G-B)';
        return 'U-TIER';
    };

    // Helper: Calculate rank from score based on metadata thresholds
    const getRankFromScore = (scoreNum) => {
        if (scoreNum === null || scoreNum === undefined || isNaN(scoreNum) || scoreNum < 0) return null;
        const list = metadata.rank_thresholds || [];
        if (!list.length) return null;
        let matched = list[0].rank;
        for (let i = 0; i < list.length; i++) {
            if (scoreNum >= list[i].score) {
                matched = list[i].rank;
            } else {
                break;
            }
        }
        return matched;
    };

    // Helper: Get score range description for a rank
    const getRankThresholdInfo = (rank) => {
        const list = metadata.rank_thresholds || [];
        const idx = list.findIndex(item => item.rank === rank);
        if (idx === -1) return null;
        const min = list[idx].score;
        const max = idx < list.length - 1 ? list[idx + 1].score - 1 : null;
        if (max !== null) {
            return `${min.toLocaleString('id-ID')} - ${max.toLocaleString('id-ID')} pts`;
        }
        return `≥ ${min.toLocaleString('id-ID')} pts`;
    };

    // Handle Score Input Change (Auto-detects & auto-selects rank)
    const handleScoreInput = (e) => {
        const raw = e.target.value;
        const formatted = formatNumber(raw);
        const scoreNum = parseNumber(raw);

        setForm(prev => {
            const next = { ...prev, evaluation_score: formatted };
            if (raw.trim() !== '' && scoreNum > 0) {
                const autoRank = getRankFromScore(scoreNum);
                if (autoRank) {
                    next.final_rank = autoRank;
                }
            } else {
                next.final_rank = '';
            }
            return next;
        });
    };

    const applyQuickScore = (scoreNum) => {
        const formatted = formatNumber(scoreNum);
        const autoRank = getRankFromScore(scoreNum);
        setForm(prev => ({
            ...prev,
            evaluation_score: formatted,
            final_rank: autoRank || '',
        }));
    };

    // Handle Auto-Fill from OCR Screenshot
    const handleOcrExtracted = (parsed) => {
        setForm(prev => {
            const next = { ...prev };
            if (parsed.uma_name) {
                next.uma_name = parsed.uma_name;
            }
            if (parsed.scenario) {
                const matchedSc = (metadata.scenarios || []).find(
                    s => s.toLowerCase() === parsed.scenario.toLowerCase() ||
                         s.toLowerCase().includes(parsed.scenario.toLowerCase()) ||
                         parsed.scenario.toLowerCase().includes(s.toLowerCase())
                );
                if (matchedSc) {
                    next.scenario = matchedSc;
                } else {
                    next.scenario = parsed.scenario;
                }
            }
            if (parsed.fans_gained) {
                next.fans_gained = formatNumber(parsed.fans_gained);
            }
            if (parsed.evaluation_score) {
                next.evaluation_score = formatNumber(parsed.evaluation_score);
                const autoRank = getRankFromScore(parsed.evaluation_score);
                if (autoRank) {
                    next.final_rank = autoRank;
                } else if (parsed.final_rank) {
                    next.final_rank = parsed.final_rank;
                }
            } else if (parsed.final_rank) {
                next.final_rank = parsed.final_rank;
            }
            return next;
        });
    };

    const handleManualRankSelect = (r) => {
        setForm(prev => ({ ...prev, final_rank: r }));
        const tier = getTierTabForRank(r);
        if (tier) setRankTierTab(tier);
    };

    const monthlyFans = stats?.monthly_fans || 0;
    const circlePercent = Math.min(100, Math.round((monthlyFans / (circleGoal || 1)) * 100));

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Turf Green Hero Header */}
            <div className="bg-gradient-to-r from-emerald-800 via-green-700 to-teal-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-400/40 text-xs font-bold text-amber-300 mb-2">
                            <Trophy className="w-3.5 h-3.5" />
                            <span>Career & Circle Quota Hub</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black">Fans Gain & Career Tracker</h1>
                        <p className="text-emerald-100 text-sm mt-1 max-w-xl">
                            Catat sesi latihan Anda dengan kalkulasi otomatis perolehan fan, pantau performa skenario, dan capai kuota fan bulanan Circle Anda!
                        </p>
                    </div>

                    {/* Circle Monthly Goal Progress Card */}
                    <div className="bg-emerald-950/70 border border-emerald-600/50 rounded-2xl p-4 min-w-[280px]">
                        <div className="flex items-center justify-between text-xs text-emerald-200 font-bold mb-1">
                            <span className="flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-amber-300" />
                                <span>Monthly Circle Progress</span>
                            </span>
                            <span className="text-amber-400 font-mono font-black">{circlePercent}%</span>
                        </div>
                        <div className="text-xl font-black text-white font-mono mt-1">
                            {monthlyFans.toLocaleString('id-ID')} <span className="text-xs font-normal text-emerald-300">fans</span>
                        </div>
                        <div className="w-full bg-emerald-900/80 rounded-full h-2.5 mt-2 overflow-hidden p-0.5">
                            <div
                                className="h-full bg-gradient-to-r from-amber-400 via-emerald-300 to-green-400 rounded-full transition-all duration-500 shadow-sm"
                                style={{ width: `${circlePercent}%` }}
                            ></div>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-1 text-[11px] text-emerald-300">
                            <span>Target: {(circleGoal).toLocaleString('id-ID')} fans</span>
                            <button
                                onClick={() => {
                                    const input = prompt('Enter new monthly Circle Goal (Fans):', String(circleGoal));
                                    if (input) {
                                        const clean = parseInt(input.replace(/[^0-9]/g, ''), 10);
                                        if (clean > 0) setCircleGoal(clean);
                                    }
                                }}
                                className="text-amber-300 hover:text-white underline font-semibold cursor-pointer"
                            >
                                Edit Goal
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Career Metrics KPI Bar */}
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
                        <span className="text-xs font-bold text-slate-500 uppercase">Total Career Runs</span>
                        <div className="text-2xl font-black text-slate-900 font-mono mt-1">{stats.total_runs}</div>
                    </div>
                    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
                        <span className="text-xs font-bold text-slate-500 uppercase">Lifetime Fans Gained</span>
                        <div className="text-2xl font-black text-emerald-600 font-mono mt-1">
                            {(stats.total_fans).toLocaleString('id-ID')}
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
                        <span className="text-xs font-bold text-slate-500 uppercase">Avg Fans / Run</span>
                        <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                            {(stats.avg_fans).toLocaleString('id-ID')}
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
                        <span className="text-xs font-bold text-slate-500 uppercase">Best Single Run Record</span>
                        <div className="text-xl font-black text-amber-600 font-mono mt-1 truncate">
                            {stats.record_run ? `+${(stats.record_run.fans_gained).toLocaleString('id-ID')}` : '-'}
                        </div>
                        {stats.record_run && (
                            <div className="text-[10px] text-slate-400 truncate mt-0.5">
                                {stats.record_run.uma_name} ({stats.record_run.final_rank})
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Add Career Run Form */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
                <div className="pb-5 mb-6 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                            <Plus className="w-5 h-5 text-emerald-600" />
                            <span>Record Career Training Run</span>
                        </h2>
                        <p className="text-xs text-slate-500">
                            Enter run details, select scenario, and specify fans count with auto thousand-separator format
                        </p>
                    </div>

                    {/* Direct Fans Gained Display Badge */}
                    <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-2xl text-right">
                        <span className="text-[10px] uppercase font-bold text-emerald-600 block">Career Gain</span>
                        <span className="text-base font-black text-emerald-800 font-mono">
                            {form.fans_gained ? `+${form.fans_gained} fans` : '0 fans'}
                        </span>
                    </div>
                </div>

                {/* Career OCR Screenshot Drop & Paste Zone */}
                <div className="mb-6">
                    <CareerOcrZone
                        umaPresets={metadata.uma_presets || []}
                        umaOcrMap={metadata.uma_ocr_map || {}}
                        scenarios={metadata.scenarios || []}
                        rankThresholds={metadata.rank_thresholds || []}
                        onDataExtracted={handleOcrExtracted}
                        onNotify={onNotify}
                    />
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {/* Uma Name with Autocomplete & Roster Search */}
                        <div className="relative">
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Uma Musume Name *
                                </label>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        disabled={syncingCatalog}
                                        onClick={handleSyncGametora}
                                        className="text-[11px] font-bold text-slate-500 hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition-colors"
                                        title="Sinkronkan katalog karakter dari GameTora"
                                    >
                                        <RefreshCw className={`w-3 h-3 ${syncingCatalog ? 'animate-spin text-emerald-600' : ''}`} />
                                        <span>Sync</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setShowUmaModal(true); setUmaModalSearch(''); }}
                                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                                    >
                                        <Search className="w-3 h-3" />
                                        <span>Browse Roster ({metadata.uma_presets?.length || 100}+)</span>
                                    </button>
                                </div>
                            </div>

                            <input
                                type="text"
                                required
                                value={form.uma_name}
                                onChange={(e) => {
                                    setForm({ ...form, uma_name: e.target.value });
                                    setShowSuggestions(true);
                                }}
                                onFocus={() => setShowSuggestions(true)}
                                placeholder="Type or search name (e.g. Epiphaneia, Oguri Cap)"
                                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />

                            {/* Floating Autocomplete Suggestions */}
                            {showSuggestions && form.uma_name.trim().length >= 1 && (
                                <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-30 max-h-52 overflow-y-auto py-1 divide-y divide-slate-100 dark:divide-slate-800/60">
                                    {(metadata.uma_presets || [])
                                        .filter(u => u.toLowerCase().includes(form.uma_name.toLowerCase()))
                                        .slice(0, 8)
                                        .map((uma) => {
                                            const isVar = uma.includes('(') && uma.endsWith(')');
                                            let base = uma;
                                            let vTag = null;
                                            if (isVar) {
                                                const m = uma.match(/^(.*?)\s*\((.*?)\)$/);
                                                if (m) {
                                                    base = m[1];
                                                    vTag = m[2];
                                                }
                                            }
                                            return (
                                                <button
                                                    key={uma}
                                                    type="button"
                                                    onClick={() => {
                                                        setForm({ ...form, uma_name: uma });
                                                        setShowSuggestions(false);
                                                    }}
                                                    className="w-full text-left px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-800/80 hover:text-emerald-900 dark:hover:text-emerald-300 cursor-pointer flex items-center justify-between transition-colors"
                                                >
                                                    <div className="flex items-center gap-2 truncate">
                                                        <span>{base}</span>
                                                        {vTag ? (
                                                            <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800">
                                                                {vTag}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[9px] text-amber-500 font-bold" title={`Original (${metadata.uma_stars?.[base] ?? STATIC_UMA_STARS[base] ?? 3} Star)`}>
                                                                {'★'.repeat(metadata.uma_stars?.[base] ?? STATIC_UMA_STARS[base] ?? 3)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold shrink-0 ml-2">Pilih</span>
                                                </button>
                                            );
                                        })}
                                </div>
                            )}

                            {/* Quick Popular Chips */}
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase mr-1 flex items-center">Quick:</span>
                                {['Special Week', 'Silence Suzuka', 'Tokai Teio', 'Oguri Cap', 'Kitasan Black', 'Epiphaneia', 'Phalaenopsis', 'Almond Eye'].map((uma) => (
                                    <button
                                        key={uma}
                                        type="button"
                                        onClick={() => {
                                            setForm({ ...form, uma_name: uma });
                                            setShowSuggestions(false);
                                        }}
                                        className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:hover:text-emerald-300 transition-colors cursor-pointer"
                                    >
                                        {uma}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Scenario Selector */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Training Scenario *
                            </label>
                            <select
                                value={form.scenario}
                                onChange={(e) => setForm({ ...form, scenario: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            >
                                {(metadata.scenarios || []).map((sc) => (
                                    <option key={sc} value={sc}>{sc}</option>
                                ))}
                            </select>
                            <span className="text-[11px] text-slate-400 mt-1 block">
                                Choose the scenario played during this run
                            </span>
                        </div>

                        {/* Run Date */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Run Date *
                            </label>
                            <input
                                type="date"
                                required
                                max={new Date().toISOString().slice(0, 10)}
                                value={form.run_date}
                                onChange={(e) => setForm({ ...form, run_date: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Mode Pelatihan: Latihan Manual vs Latihan Mandiri (自主練 / Independent Training) */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2">
                            Mode Pelatihan (Training Mode) *
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setForm({ ...form, training_type: 'manual' })}
                                className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                                    form.training_type === 'manual'
                                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs training-opt-manual-active dark:!bg-emerald-950/70 dark:border-emerald-500'
                                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80 text-slate-600 dark:!bg-slate-900/60 dark:border-slate-800'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">🎮</span>
                                    <div>
                                        <div className={`text-xs font-black flex items-center gap-1.5 ${
                                            form.training_type === 'manual'
                                                ? 'text-emerald-950 dark:!text-emerald-300'
                                                : 'text-slate-900 dark:!text-slate-300'
                                        }`}>
                                            <span>Latihan Manual</span>
                                            <span className={`text-[10px] font-semibold ${
                                                form.training_type === 'manual'
                                                    ? 'text-emerald-700 dark:!text-emerald-400'
                                                    : 'text-slate-500 dark:!text-slate-400'
                                            }`}>(Manual Training)</span>
                                        </div>
                                        <div className={`text-[11px] mt-0.5 ${
                                            form.training_type === 'manual'
                                                ? 'text-emerald-800/80 dark:!text-emerald-300/80'
                                                : 'text-slate-500 dark:!text-slate-400'
                                        }`}>
                                            Skenario karir turn-by-turn manual dengan rotasi race & stat
                                        </div>
                                    </div>
                                </div>
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                                    form.training_type === 'manual' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 dark:border-slate-700'
                                }`}>
                                    {form.training_type === 'manual' && <span className="text-[10px] font-bold">✓</span>}
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setForm({ ...form, training_type: 'independent' })}
                                className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                                    form.training_type === 'independent'
                                        ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-500/20 shadow-xs training-opt-independent-active dark:!bg-purple-950/70 dark:border-purple-500'
                                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80 text-slate-600 dark:!bg-slate-900/60 dark:border-slate-800'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">⚡</span>
                                    <div>
                                        <div className={`text-xs font-black flex items-center gap-1.5 ${
                                            form.training_type === 'independent'
                                                ? 'text-purple-950 dark:!text-purple-300'
                                                : 'text-slate-900 dark:!text-slate-300'
                                        }`}>
                                            <span>Latihan Mandiri</span>
                                            <span className="px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-700 dark:!bg-purple-900/80 dark:!text-purple-200 font-extrabold text-[10px]">自主練</span>
                                            <span className={`text-[10px] font-semibold ${
                                                form.training_type === 'independent'
                                                    ? 'text-purple-700 dark:!text-purple-400'
                                                    : 'text-slate-500 dark:!text-slate-400'
                                            }`}>(Independent)</span>
                                        </div>
                                        <div className={`text-[11px] mt-0.5 ${
                                            form.training_type === 'independent'
                                                ? 'text-purple-800/80 dark:!text-purple-300/80'
                                                : 'text-slate-500 dark:!text-slate-400'
                                        }`}>
                                            Mode auto / latihan mandiri cepat untuk panen fans harian
                                        </div>
                                    </div>
                                </div>
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                                    form.training_type === 'independent' ? 'border-purple-600 bg-purple-600 text-white' : 'border-slate-300 dark:border-slate-700'
                                }`}>
                                    {form.training_type === 'independent' && <span className="text-[10px] font-bold">✓</span>}
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Fans Gained Input with Auto Thousand-Formatting */}
                    <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200">
                        <label className="block text-xs font-bold text-slate-800 mb-1">
                            Fans Gained per Career Run *
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                required
                                value={form.fans_gained}
                                onChange={(e) => setForm({ ...form, fans_gained: formatNumber(e.target.value) })}
                                placeholder="Contoh: 35.000.000 (ketik angka perolehan fans)"
                                className="w-full bg-white border border-emerald-300 rounded-xl px-4 py-2.5 text-base font-mono font-black text-emerald-950 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                            <span className="absolute right-4 top-2.5 text-xs font-bold text-emerald-600 pointer-events-none">
                                fans
                            </span>
                        </div>
                        <span className="text-[11px] text-slate-500 mt-1 block">
                            Masukkan jumlah perolehan fans yang didapat dari run ini (otomatis format titik)
                        </span>
                    </div>

                    {/* Final Rank & Evaluation Score Section (Auto-Select Rank, Read-Only) */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                            <div>
                                <div className="text-xs font-black text-slate-800 flex items-center gap-2">
                                    <span>Final Evaluation Rank & Rating Score *</span>
                                    {form.final_rank ? (
                                        <div className="flex items-center gap-1.5">
                                            <RankBadge rank={form.final_rank} size="sm" />
                                            <span className="text-[10px] uppercase font-extrabold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded-md">
                                                Read-Only (Auto)
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-[11px] font-bold text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                                            Menunggu Input Skor
                                        </span>
                                    )}
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    Ketik skor evaluasi akhir untuk menentukan rank secara otomatis (Wajib diisi, rank bersifat read-only)
                                </p>
                            </div>
                        </div>

                        {/* Evaluation Score Input Field with Auto-Detection */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center bg-white p-3.5 rounded-xl border border-slate-200">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                    <span>Skor Evaluasi / Rating Points (Wajib Diisi) *</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        required
                                        value={form.evaluation_score}
                                        onChange={handleScoreInput}
                                        placeholder="Contoh: 19.200 atau 23.900"
                                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                    />
                                    <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400 pointer-events-none">
                                        pts
                                    </span>
                                </div>
                            </div>

                            {/* Auto Select Indicator & Hint */}
                            <div className="text-xs">
                                {form.evaluation_score && parseNumber(form.evaluation_score) > 0 ? (
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-emerald-900">
                                        <div className="font-bold flex items-center gap-1 text-[11px]">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                            <span>Skor {form.evaluation_score} pts &rarr; Auto Rank:</span>
                                        </div>
                                        <div className="mt-1 flex items-center gap-2">
                                            <RankBadge rank={form.final_rank} size="sm" />
                                            <span className="font-mono text-[11px] text-emerald-700 font-semibold">
                                                ({getRankThresholdInfo(form.final_rank)})
                                            </span>
                                            <span className="text-[10px] text-slate-400 italic">(Read-Only)</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-slate-500 text-[11px] bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
                                        <div className="font-semibold text-amber-700 flex items-center gap-1 mb-1">
                                            <span>⚠️</span>
                                            <span>Wajib input skor evaluasi sebelum submit run</span>
                                        </div>
                                        <span className="text-[11px] text-slate-500">
                                            Ketik angka skor evaluasi dari hasil training, atau klik tombol isi cepat di bawah.
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick Score Presets */}
                        <div className="p-3 rounded-xl bg-white border border-slate-200">
                            <div className="text-[11px] font-bold text-slate-600 mb-1.5 flex items-center gap-1">
                                <span>💡</span>
                                <span>Isi Cepat Skor Evaluasi (Klik untuk coba):</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {[
                                    { score: 19200, label: '19.200 (SS+)' },
                                    { score: 19600, label: '19.600 (UG)' },
                                    { score: 23900, label: '23.900 (UF)' },
                                    { score: 28800, label: '28.800 (UE)' },
                                    { score: 34400, label: '34.400 (UD)' },
                                    { score: 40700, label: '40.700 (UC)' },
                                    { score: 47600, label: '47.600 (UB)' },
                                    { score: 55200, label: '55.200 (UA)' },
                                    { score: 63400, label: '63.400 (US)' },
                                    { score: 72400, label: '72.400 (LG)' },
                                    { score: 91400, label: '91.400 (LF)' },
                                    { score: 102700, label: '102.700 (LF20)' },
                                ].map((sample) => (
                                    <button
                                        key={sample.score}
                                        type="button"
                                        onClick={() => applyQuickScore(sample.score)}
                                        className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-emerald-800 font-mono font-bold cursor-pointer text-[11px] transition-colors"
                                    >
                                        {sample.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Notes / Strategy Summary (Optional)
                        </label>
                        <textarea
                            rows={2}
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            placeholder="e.g. G1 race schedule, skill inheritance, or training condition notes"
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />

                        {/* Quick Fill Notes Buttons */}
                        <div className="mt-2">
                            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                <span>Isi Cepat Notes:</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {QUICK_NOTES.map((preset) => {
                                    const isSelected = form.notes === preset;
                                    return (
                                        <button
                                            key={preset}
                                            type="button"
                                            onClick={() => setForm({ ...form, notes: preset })}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                                                isSelected
                                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300 dark:bg-slate-800/80 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700'
                                            }`}
                                        >
                                            {preset}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Submit button */}
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm transition-all shadow-md shadow-emerald-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                            <Trophy className="w-4 h-4" />
                            <span>{submitting ? 'Saving...' : 'Record Career Run'}</span>
                        </button>
                    </div>
                </form>
            </div>

            {/* Scenario Performance Breakdown Cards */}
            {stats?.scenario_stats?.length > 0 && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <Target className="w-5 h-5 text-emerald-600" />
                        <h2 className="text-base font-black text-slate-900">Rincian Performa Skenario</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {stats.scenario_stats.map((sc, idx) => (
                            <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-emerald-300 transition-colors">
                                <div className="font-black text-sm text-slate-900 truncate">{sc.scenario}</div>
                                <div className="text-xs text-slate-500 mt-0.5">{sc.runs_count} runs completed</div>
                                <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800 grid grid-cols-3 gap-1 text-xs">
                                    <div>
                                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Min Record</span>
                                        <span className="font-mono font-black text-blue-600 dark:text-blue-400">
                                            {(parseInt(sc.min_fans ?? sc.avg_fans, 10)).toLocaleString('id-ID')}
                                        </span>
                                    </div>
                                    <div className="text-center">
                                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Avg Fans</span>
                                        <span className="font-mono font-black text-emerald-700 dark:text-emerald-400">
                                            {(parseInt(sc.avg_fans, 10)).toLocaleString('id-ID')}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Max Record</span>
                                        <span className="font-mono font-black text-amber-600 dark:text-amber-400">
                                            {(parseInt(sc.max_fans, 10)).toLocaleString('id-ID')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Character Performance Breakdown Cards */}
            {stats?.character_stats?.length > 0 && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <Users className="w-5 h-5 text-emerald-600" />
                        <h2 className="text-base font-black text-slate-900">Character Performance Breakdown</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {stats.character_stats.map((char, idx) => (
                            <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-emerald-300 transition-colors">
                                <div className="font-black text-sm text-slate-900 truncate" title={char.uma_name}>{char.uma_name}</div>
                                <div className="text-xs text-slate-500 mt-0.5">{char.runs_count} runs completed</div>
                                <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800 grid grid-cols-3 gap-1 text-xs">
                                    <div>
                                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Min Record</span>
                                        <span className="font-mono font-black text-blue-600 dark:text-blue-400">
                                            {(parseInt(char.min_fans ?? char.avg_fans, 10)).toLocaleString('id-ID')}
                                        </span>
                                    </div>
                                    <div className="text-center">
                                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Avg Fans</span>
                                        <span className="font-mono font-black text-emerald-700 dark:text-emerald-400">
                                            {(parseInt(char.avg_fans, 10)).toLocaleString('id-ID')}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Max Record</span>
                                        <span className="font-mono font-black text-amber-600 dark:text-amber-400">
                                            {(parseInt(char.max_fans, 10)).toLocaleString('id-ID')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Career Runs History Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Table Filters Header */}
                <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Layers className="w-5 h-5 text-slate-500" />
                        <h2 className="text-base font-black text-slate-900">Career Run Logs</h2>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono text-xs font-bold">
                            {pagination.total} runs
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Date Range Filter */}
                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-600">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                                className="bg-transparent text-slate-800 font-mono text-xs focus:outline-none"
                                title="Tanggal Mulai (From)"
                            />
                            <span className="text-slate-400">~</span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                                className="bg-transparent text-slate-800 font-mono text-xs focus:outline-none"
                                title="Tanggal Akhir (To)"
                            />
                        </div>

                        {/* Scenario filter */}
                        <select
                            value={scenarioFilter}
                            onChange={(e) => { setScenarioFilter(e.target.value); setPage(1); }}
                            className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        >
                            <option value="all">Semua Skenario</option>
                            {(metadata.scenarios || []).map((s) => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>

                        {/* Rank Min filter */}
                        <select
                            value={rankMinFilter}
                            onChange={(e) => { setRankMinFilter(e.target.value); setPage(1); }}
                            className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        >
                            <option value="all">Min Rank (Semua)</option>
                            {(metadata.ranks || []).map((r) => (
                                <option key={`min-${r}`} value={r}>Min {r}</option>
                            ))}
                        </select>

                        {/* Rank Max filter */}
                        <select
                            value={rankMaxFilter}
                            onChange={(e) => { setRankMaxFilter(e.target.value); setPage(1); }}
                            className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        >
                            <option value="all">Max Rank (Semua)</option>
                            {(metadata.ranks || []).map((r) => (
                                <option key={`max-${r}`} value={r}>Max {r}</option>
                            ))}
                        </select>

                        {/* Training type filter */}
                        <select
                            value={trainingTypeFilter}
                            onChange={(e) => { setTrainingTypeFilter(e.target.value); setPage(1); }}
                            className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        >
                            <option value="all">Semua Mode</option>
                            <option value="manual">🎮 Manual</option>
                            <option value="independent">⚡ Mandiri (自主練)</option>
                        </select>

                        {/* Search */}
                        <form onSubmit={handleSearch} className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Cari Uma / notes..."
                                className="bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none w-36 sm:w-40"
                            />
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        </form>

                        {/* Reset filter button */}
                        <button
                            type="button"
                            onClick={handleResetFilters}
                            className="px-2.5 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-600 hover:text-slate-900 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                            title="Reset semua filter ke default"
                        >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reset</span>
                        </button>
                    </div>
                </div>

                {/* Bulk Actions Alert Bar */}
                {selectedRunIds.length > 0 && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border-b border-rose-200 dark:border-rose-900/60 flex items-center justify-between gap-3 text-xs animate-fadeIn">
                        <div className="flex items-center gap-2 font-bold text-rose-800 dark:text-rose-200">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                            <span>{selectedRunIds.length} data training run dipilih</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setSelectedRunIds([])}
                                className="px-3 py-1 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 font-bold transition cursor-pointer"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={() => openDeleteModal('bulk')}
                                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black flex items-center gap-1.5 shadow-sm shadow-rose-600/30 transition cursor-pointer"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Hapus Data Terpilih ({selectedRunIds.length})</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th className="px-3 py-3.5 w-8 text-center">
                                    <input
                                        type="checkbox"
                                        checked={runs.length > 0 && runs.every(r => selectedRunIds.includes(r.id))}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                const newIds = Array.from(new Set([...selectedRunIds, ...runs.map(r => r.id)]));
                                                setSelectedRunIds(newIds);
                                            } else {
                                                const pageIds = runs.map(r => r.id);
                                                setSelectedRunIds(selectedRunIds.filter(id => !pageIds.includes(id)));
                                            }
                                        }}
                                        className="rounded border-slate-300 dark:border-slate-600 dark:bg-slate-800 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                        title="Pilih semua data pada halaman ini"
                                    />
                                </th>
                                <th className="px-4 py-3.5">Date</th>
                                <th className="px-4 py-3.5">Uma Musume</th>
                                <th className="px-4 py-3.5">Mode</th>
                                <th className="px-4 py-3.5">Scenario</th>
                                <th className="px-4 py-3.5">Rank</th>
                                <th className="px-4 py-3.5">Fans Gained</th>
                                <th className="px-4 py-3.5">Notes</th>
                                <th className="px-4 py-3.5 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="9" className="text-center py-10 text-slate-400 dark:text-slate-500">Loading career runs...</td>
                                </tr>
                            ) : runs.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="text-center py-10 text-slate-400 dark:text-slate-500">No career runs found matching filters.</td>
                                </tr>
                            ) : (
                                runs.map((run) => {
                                    const isSelected = selectedRunIds.includes(run.id);
                                    return (
                                        <tr
                                            key={run.id}
                                            className={`transition-colors ${
                                                isSelected
                                                    ? 'bg-rose-50/80 dark:bg-rose-950/50 border-l-4 border-rose-500 hover:bg-rose-100/70 dark:hover:bg-rose-900/50'
                                                    : 'hover:bg-emerald-50/40 dark:hover:bg-slate-800/50'
                                            }`}
                                        >
                                            <td className="px-3 py-3 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedRunIds(prev => [...prev, run.id]);
                                                        } else {
                                                            setSelectedRunIds(prev => prev.filter(id => id !== run.id));
                                                        }
                                                    }}
                                                    className="rounded border-slate-300 dark:border-slate-600 dark:bg-slate-800 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                                />
                                            </td>
                                            <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                                {run.run_date}
                                            </td>
                                            <td className="px-4 py-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                                                {run.uma_name}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {run.training_type === 'independent' ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800 shadow-2xs" title="Latihan Mandiri / 自主練 (Independent Training)">
                                                        <span>⚡</span>
                                                        <span>Mandiri</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700" title="Latihan Manual (Manual Training)">
                                                        <span>🎮</span>
                                                        <span>Manual</span>
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                                {run.scenario}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <RankBadge rank={run.final_rank} size="sm" />
                                                    {run.evaluation_score ? (
                                                        <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700" title="Rating Points">
                                                            {run.evaluation_score.toLocaleString('id-ID')} pts
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm">
                                                    +{(run.fans_gained || 0).toLocaleString('id-ID')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 max-w-xs truncate text-slate-500 dark:text-slate-400 text-[11px]" title={run.notes || ''}>
                                                {run.notes || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditingRun(run)}
                                                        className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition-colors cursor-pointer"
                                                        title="Edit catatan career run ini"
                                                    >
                                                        <Edit3 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => openDeleteModal('single', run.id)}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                                                        title="Hapus catatan run ini"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Dynamic Pagination Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                        <span>Tampilkan</span>
                        <select
                            value={perPage}
                            onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
                            className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
                        >
                            <option value="10">10</option>
                            <option value="25">25</option>
                            <option value="50">50</option>
                        </select>
                        <span>entri per halaman &bull; Total <strong className="text-slate-700 dark:text-slate-200">{pagination.total}</strong> entri (Hal {pagination.current_page} dari {pagination.last_page})</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button
                            disabled={pagination.current_page <= 1}
                            onClick={() => setPage(prev => Math.max(1, prev - 1))}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 font-bold flex items-center gap-1 cursor-pointer transition"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            <span>Prev</span>
                        </button>

                        <span className="px-3 py-1 font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200/60 dark:border-slate-700">
                            {pagination.current_page} / {pagination.last_page}
                        </span>

                        <button
                            disabled={pagination.current_page >= pagination.last_page}
                            onClick={() => setPage(prev => Math.min(pagination.last_page, prev + 1))}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 font-bold flex items-center gap-1 cursor-pointer transition"
                        >
                            <span>Next</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Uma Musume Character Roster Modal */}
            {showUmaModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[85vh] flex flex-col">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                    <span>🐎</span>
                                    <span>Uma Musume Roster (Gametora)</span>
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Pilih karakter playable atau cari nama dalam romaji / English
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled={syncingCatalog}
                                    onClick={handleSyncGametora}
                                    className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                    title="Sinkronkan katalog karakter Uma Musume & varian dari GameTora"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${syncingCatalog ? 'animate-spin text-emerald-600' : 'text-emerald-600 dark:text-emerald-400'}`} />
                                    <span>{syncingCatalog ? 'Menyinkronkan...' : 'Sinkronkan GameTora'}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowUmaModal(false)}
                                    className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer font-bold text-sm transition-colors"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Search Input */}
                        <div className="py-3">
                            <div className="relative">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                                <input
                                    type="text"
                                    autoFocus
                                    value={umaModalSearch}
                                    onChange={(e) => setUmaModalSearch(e.target.value)}
                                    placeholder="Search by name (e.g. Epiphaneia, Silence Suzuka, Oguri Cap, Almond Eye)..."
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Character List Grid */}
                        <div className="flex-1 overflow-y-auto py-2 pr-1">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {(metadata.uma_presets || [])
                                    .filter(uma => !umaModalSearch || uma.toLowerCase().includes(umaModalSearch.toLowerCase()))
                                    .map((uma) => {
                                        const isVar = uma.includes('(') && uma.endsWith(')');
                                        let base = uma;
                                        let vTag = null;
                                        if (isVar) {
                                            const m = uma.match(/^(.*?)\s*\((.*?)\)$/);
                                            if (m) {
                                                base = m[1];
                                                vTag = m[2];
                                            }
                                        }
                                        const isSelected = form.uma_name === uma;
                                        const starCount = metadata.uma_stars?.[base] ?? STATIC_UMA_STARS[base] ?? 3;
                                        const starString = '★'.repeat(starCount);
                                        return (
                                            <button
                                                key={uma}
                                                type="button"
                                                onClick={() => {
                                                    setForm({ ...form, uma_name: uma });
                                                    setShowUmaModal(false);
                                                    setShowSuggestions(false);
                                                }}
                                                className={`p-2.5 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                                                    isSelected
                                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-400/40'
                                                        : 'bg-slate-50 hover:bg-emerald-50/70 text-slate-800 border-slate-200 hover:border-emerald-300 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 dark:border-slate-700'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between w-full gap-1">
                                                    <span className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                                                        {base}
                                                    </span>
                                                    {isSelected && <span className="text-white text-xs shrink-0 font-bold">✓</span>}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    {vTag ? (
                                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-extrabold tracking-wide uppercase ${
                                                            isSelected
                                                                ? 'bg-white/20 text-white'
                                                                : 'bg-purple-100 text-purple-800 border border-purple-200/80 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-800'
                                                        }`}>
                                                            {vTag}
                                                        </span>
                                                    ) : (
                                                        <span className={`text-[10px] font-black tracking-wider ${
                                                            isSelected ? 'text-amber-200' : 'text-amber-500 dark:text-amber-400'
                                                        }`} title={`Original (${starCount} Star)`}>
                                                            {starString} <span className="text-[9px] font-semibold opacity-75">(Original)</span>
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                            <span>Showing {
                                (metadata.uma_presets || []).filter(uma => !umaModalSearch || uma.toLowerCase().includes(umaModalSearch.toLowerCase())).length
                            } characters</span>
                            <button
                                type="button"
                                onClick={() => setShowUmaModal(false)}
                                className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold cursor-pointer transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <DeleteConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, mode: 'single', id: null, count: 1, loading: false })}
                onConfirm={handleConfirmDelete}
                title={deleteModal.mode === 'bulk' ? 'Hapus Data Career Run Terpilih?' : 'Hapus Record Career Run?'}
                message={
                    deleteModal.mode === 'bulk'
                        ? `Apakah Anda yakin ingin menghapus ${deleteModal.count} data career training run yang dipilih? Data yang dihapus tidak dapat dikembalikan.`
                        : 'Apakah Anda yakin ingin menghapus catatan career training run ini?'
                }
                itemCount={deleteModal.count}
                confirmText={deleteModal.mode === 'bulk' ? `Ya, Hapus ${deleteModal.count} Data` : 'Ya, Hapus Data'}
                loading={deleteModal.loading}
            />

            {/* Edit Career Run Modal */}
            <EditCareerRunModal
                run={editingRun}
                isOpen={!!editingRun}
                onClose={() => setEditingRun(null)}
                onSuccess={(updatedRun, msg) => {
                    onNotify?.(msg || 'Data career run berhasil diperbarui.', 'success');
                    fetchStats();
                    fetchRuns();
                }}
                metadata={metadata}
            />
        </div>
    );
}
