import React, { useState, useEffect } from 'react';
import { X, Trophy, Save, Calendar, Check, AlertCircle, RefreshCw, Search } from 'lucide-react';
import RankBadge from './RankBadge';
import { formatIndonesianDate } from '../utils/dateHelper';

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

export default function EditCareerRunModal({
    run,
    isOpen,
    onClose,
    onSuccess,
    metadata = { scenarios: [], ranks: [], uma_presets: [], rank_thresholds: [] }
}) {
    const [form, setForm] = useState({
        uma_name: '',
        scenario: '',
        training_type: 'manual',
        fans_gained: '',
        evaluation_score: '',
        final_rank: 'G',
        notes: '',
        run_date: '',
    });
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [rankTierTab, setRankTierTab] = useState('U-TIER');
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const parseNumber = (val) => {
        if (!val) return 0;
        const cleaned = String(val).replace(/[^0-9]/g, '');
        return parseInt(cleaned, 10) || 0;
    };

    const formatNumber = (num) => {
        if (num === '' || num === null || num === undefined) return '';
        const clean = String(num).replace(/[^0-9]/g, '');
        if (!clean) return '';
        return parseInt(clean, 10).toLocaleString('id-ID');
    };

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

    useEffect(() => {
        if (!isOpen || !run) return;

        const currentRank = run.final_rank || 'G';
        setForm({
            uma_name: run.uma_name || '',
            scenario: run.scenario || (metadata.scenarios?.[0] || 'The Twinkle Legends'),
            training_type: run.training_type || 'manual',
            fans_gained: formatNumber(run.fans_gained),
            evaluation_score: formatNumber(run.evaluation_score),
            final_rank: currentRank,
            notes: run.notes || '',
            run_date: run.run_date ? String(run.run_date).slice(0, 10) : new Date().toISOString().slice(0, 10),
        });
        setRankTierTab(getTierTabForRank(currentRank));
        setErrorMsg('');
        setShowSuggestions(false);
    }, [isOpen, run]);

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

    if (!isOpen || !run) return null;

    // Handle Uma Musume Autocomplete
    const handleUmaNameChange = (val) => {
        setForm(prev => ({ ...prev, uma_name: val }));
        if (!val || val.length < 1) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        const presets = metadata.uma_presets || [];
        const q = val.toLowerCase();
        const matches = presets.filter(name => name.toLowerCase().includes(q)).slice(0, 6);
        setSuggestions(matches);
        setShowSuggestions(matches.length > 0);
    };

    const handleScoreChange = (raw) => {
        const formatted = formatNumber(raw);
        const scoreNum = parseNumber(raw);

        setForm(prev => {
            const next = { ...prev, evaluation_score: formatted };
            if (raw.trim() !== '' && scoreNum > 0) {
                const autoRank = getRankFromScore(scoreNum);
                if (autoRank) {
                    next.final_rank = autoRank;
                    const tier = getTierTabForRank(autoRank);
                    if (tier) setRankTierTab(tier);
                }
            }
            return next;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.uma_name.trim()) {
            setErrorMsg('Nama Uma Musume wajib diisi.');
            return;
        }

        const fansNum = parseNumber(form.fans_gained);
        if (fansNum <= 0) {
            setErrorMsg('Jumlah Fans Gained harus lebih dari 0.');
            return;
        }

        const scoreNum = parseNumber(form.evaluation_score);
        const computedRank = (scoreNum > 0 ? getRankFromScore(scoreNum) : null) || form.final_rank || 'G';

        setSaving(true);
        setErrorMsg('');

        try {
            const payload = {
                uma_name: form.uma_name.trim(),
                scenario: form.scenario,
                training_type: form.training_type || 'manual',
                fans_gained: fansNum,
                evaluation_score: scoreNum > 0 ? scoreNum : null,
                final_rank: computedRank,
                notes: form.notes.trim() || null,
                run_date: form.run_date,
            };

            const res = await fetch(`/api/career/runs/${run.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (res.ok && data.data) {
                onSuccess?.(data.data, data.message || 'Data career run berhasil diperbarui.');
                onClose?.();
            } else {
                throw new Error(data.message || 'Gagal menyimpan perubahan career run.');
            }
        } catch (err) {
            console.error('Error updating career run:', err);
            setErrorMsg(err.message || 'Terjadi kesalahan saat memperbarui data career run.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/40">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-black">
                            <Trophy className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                                Edit Catatan Career Run
                            </h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Perbarui data fans gain, skenario latihan, atau rank hasil breeding
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    {errorMsg && (
                        <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {/* Uma Name Input with Suggestions */}
                    <div className="relative">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            Nama Uma Musume <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={form.uma_name}
                                onChange={(e) => handleUmaNameChange(e.target.value)}
                                onFocus={() => {
                                    if (form.uma_name) handleUmaNameChange(form.uma_name);
                                }}
                                placeholder="Cari nama Uma Musume (misal: Oguri Cap, Almond Eye)..."
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-3 pr-8 py-2 text-xs font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                required
                            />
                            <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                        </div>

                        {showSuggestions && suggestions.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-30 overflow-hidden max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60">
                                {suggestions.map((name) => (
                                    <button
                                        key={name}
                                        type="button"
                                        onClick={() => {
                                            setForm(prev => ({ ...prev, uma_name: name }));
                                            setShowSuggestions(false);
                                        }}
                                        className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                                    >
                                        {name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Scenario & Training Type */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                Skenario Pelatihan
                            </label>
                            <select
                                value={form.scenario}
                                onChange={(e) => setForm(prev => ({ ...prev, scenario: e.target.value }))}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            >
                                {(metadata.scenarios || []).map((sc) => (
                                    <option key={sc} value={sc}>{sc}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                Mode Pelatihan
                            </label>
                            <div className="grid grid-cols-2 gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setForm(prev => ({ ...prev, training_type: 'manual' }))}
                                    className={`py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                                        form.training_type === 'manual'
                                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                                    }`}
                                >
                                    <span>🎮 Manual</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setForm(prev => ({ ...prev, training_type: 'independent' }))}
                                    className={`py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                                        form.training_type === 'independent'
                                            ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                                    }`}
                                >
                                    <span>⚡ Mandiri</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Fans Gained & Rating Points */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                Fans Gained <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={form.fans_gained}
                                onChange={(e) => setForm(prev => ({ ...prev, fans_gained: formatNumber(e.target.value) }))}
                                placeholder="Misal: 350.000"
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-black text-emerald-700 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                                <span>Rating Points (pts)</span>
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Auto-Rank</span>
                            </label>
                            <input
                                type="text"
                                value={form.evaluation_score}
                                onChange={(e) => handleScoreChange(e.target.value)}
                                placeholder="Misal: 21.500"
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Final Rank Selection */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                <span>Hasil Rank:</span>
                                <RankBadge rank={form.final_rank || 'G'} size="sm" />
                            </label>

                            {/* Tier Selector tabs */}
                            <div className="flex items-center gap-1">
                                {Object.keys(rankTierGroups).map((tier) => (
                                    <button
                                        key={tier}
                                        type="button"
                                        onClick={() => setRankTierTab(tier)}
                                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                                            rankTierTab === tier
                                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                        }`}
                                    >
                                        {tier}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                            {(rankTierGroups[rankTierTab] || []).map((r) => (
                                <button
                                    key={r}
                                    type="button"
                                    onClick={() => setForm(prev => ({ ...prev, final_rank: r }))}
                                    className={`px-2 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                                        form.final_rank === r
                                            ? 'bg-emerald-600 text-white shadow-xs scale-105'
                                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200/60 dark:border-slate-700'
                                    }`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Run Date & Quick Notes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Tanggal Latihan</span>
                                </label>
                                {form.run_date && (
                                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                        {formatIndonesianDate(form.run_date, 'long')}
                                    </span>
                                )}
                            </div>
                            <input
                                type="date"
                                lang="id-ID"
                                value={form.run_date}
                                onChange={(e) => setForm(prev => ({ ...prev, run_date: e.target.value }))}
                                max={new Date().toISOString().slice(0, 10)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                Catatan / Build Strategy
                            </label>
                            <input
                                type="text"
                                value={form.notes}
                                onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                                placeholder="Contoh: Sprint Ace Run, TT Legend..."
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Quick Note Chips */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                        {QUICK_NOTES.map((qn) => (
                            <button
                                key={qn}
                                type="button"
                                onClick={() => setForm(prev => ({ ...prev, notes: qn }))}
                                className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                            >
                                + {qn}
                            </button>
                        ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-5 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                        >
                            {saving ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Save className="w-3.5 h-3.5" />
                            )}
                            <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
