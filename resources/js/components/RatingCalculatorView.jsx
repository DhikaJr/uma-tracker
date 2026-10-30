import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    Calculator,
    Sparkles,
    RotateCcw,
    Trash2,
    Search,
    Plus,
    X,
    Check,
    ArrowRight,
    Award,
    Layers,
    ChevronDown,
    Zap,
    Sliders,
    HelpCircle,
    UserCheck,
    CheckCircle2
} from 'lucide-react';
import RankBadge from './RankBadge';
import {
    calculateStatRating,
    calculateTotalStatsRating,
    calculateUniqueSkillRating,
    calculateSkillRating,
    calculateProjectedRating,
    getBucketForGrade,
    MAX_STAT_VALUE,
    RANK_THRESHOLDS
} from '../utils/ratingCalculatorHelper';
import rawSkillsData from '../data/ratingSkillsCatalog.json';

// Local storage key for calculator state
const STORAGE_KEY = 'uma_rating_calculator_state_v1';

// Default race config
const DEFAULT_RACE_CONFIG = {
    turf: 'A',
    dirt: 'G',
    sprint: 'D',
    mile: 'C',
    medium: 'A',
    long: 'B',
    front: 'A',
    pace: 'B',
    late: 'C',
    end: 'B',
};

// Default stats
const DEFAULT_STATS = {
    speed: 0,
    stamina: 0,
    power: 0,
    guts: 0,
    wisdom: 0,
};

// Grade options S to G
const GRADE_OPTIONS = ['S', 'A', 'B', 'C', 'D', 'E', 'F', 'G'];

// Aptitude styling helper
function getGradeColorClass(grade) {
    const bucket = getBucketForGrade(grade);
    switch (bucket) {
        case 'good':
            return 'border-emerald-500/60 text-emerald-400 bg-emerald-500/10 focus:border-emerald-400';
        case 'average':
            return 'border-amber-500/60 text-amber-400 bg-amber-500/10 focus:border-amber-400';
        case 'bad':
            return 'border-rose-500/60 text-rose-400 bg-rose-500/10 focus:border-rose-400';
        default:
            return 'border-rose-700/60 text-rose-500 bg-rose-950/20 focus:border-rose-500';
    }
}

// Skill type badge styling
function getSkillTypeBadge(type, isEvo) {
    const t = (type || '').toLowerCase();
    if (isEvo || t === 'evo') {
        return { label: 'Evolution', bg: 'bg-pink-500/20 text-pink-300 border-pink-500/40' };
    }
    if (t === 'gold') {
        return { label: 'Gold', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
    }
    if (t === 'ius') {
        return { label: 'Inherited', bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' };
    }
    if (t === 'purple') {
        return { label: 'Purple', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40' };
    }
    if (t === 'blue') {
        return { label: 'Recovery', bg: 'bg-blue-500/20 text-blue-300 border-blue-500/40' };
    }
    if (t === 'green') {
        return { label: 'Passive', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
    }
    if (t === 'red') {
        return { label: 'Debuff', bg: 'bg-red-500/20 text-red-300 border-red-500/40' };
    }
    return { label: 'White', bg: 'bg-slate-500/20 text-slate-300 border-slate-500/40' };
}

function getSkillIconUrl(s) {
    if (!s) return null;
    if (s.icon_url) return s.icon_url;
    if (s.icon_id) return `https://gametora.com/images/umamusume/skill_icons/utx_ico_skill_${s.icon_id}.png`;
    return null;
}

export default function RatingCalculatorView({ onApplyToCareerForm }) {
    // State initialization from localStorage
    const [raceConfig, setRaceConfig] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.raceConfig) return { ...DEFAULT_RACE_CONFIG, ...parsed.raceConfig };
            }
        } catch {}
        return DEFAULT_RACE_CONFIG;
    });

    const [stats, setStats] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.stats) return { ...DEFAULT_STATS, ...parsed.stats };
            }
        } catch {}
        return DEFAULT_STATS;
    });

    const [starLevel, setStarLevel] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.starLevel !== undefined) return parsed.starLevel;
            }
        } catch {}
        return 3;
    });

    const [uniqueLevel, setUniqueLevel] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.uniqueLevel !== undefined) return parsed.uniqueLevel;
            }
        } catch {}
        return 3;
    });

    // Selected skills array: each item is a skill object with unique rowId
    const [skillRows, setSkillRows] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed.skillRows) && parsed.skillRows.length > 0) {
                    return parsed.skillRows;
                }
            }
        } catch {}
        return [{ rowId: 1, skill: null }];
    });

    // Collection characters for auto-fill
    const [charactersList, setCharactersList] = useState([]);
    const [loadingChars, setLoadingChars] = useState(false);
    const [showCharModal, setShowCharModal] = useState(false);
    const [charSearch, setCharSearch] = useState('');
    const [selectedCharName, setSelectedCharName] = useState('');

    // Fetch collection characters for quick auto-fill
    useEffect(() => {
        let mounted = true;
        setLoadingChars(true);
        fetch('/api/collection/characters')
            .then(res => res.json())
            .then(data => {
                if (mounted) {
                    const list = Array.isArray(data) ? data : (data?.characters || []);
                    setCharactersList(list);
                }
            })
            .catch(err => {
                console.error('Failed to load collection characters for calculator:', err);
            })
            .finally(() => {
                if (mounted) setLoadingChars(false);
            });
        return () => {
            mounted = false;
        };
    }, []);

    // Save state to localStorage
    useEffect(() => {
        try {
            const stateToSave = {
                raceConfig,
                stats,
                starLevel,
                uniqueLevel,
                skillRows: skillRows.map(r => ({
                    rowId: r.rowId,
                    skill: r.skill ? {
                        id: r.skill.id,
                        name_en: r.skill.name_en,
                        name_ja: r.skill.name_ja,
                        score: r.skill.score,
                        type: r.skill.type,
                        check_type: r.skill.check_type,
                        icon_id: r.skill.icon_id,
                        icon_url: r.skill.icon_url,
                        is_evo: r.skill.is_evo
                    } : null
                }))
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
        } catch (e) {
            console.error('Failed to save calculator state:', e);
        }
    }, [raceConfig, stats, starLevel, uniqueLevel, skillRows]);

    // Ensure unique level is clamped when star level changes
    useEffect(() => {
        const maxLv = (starLevel === 1 || starLevel === 2) ? 4 : 6;
        if (uniqueLevel > maxLv) {
            setUniqueLevel(maxLv);
        }
    }, [starLevel, uniqueLevel]);

    // Filtered selected skills
    const selectedSkills = useMemo(() => {
        return skillRows.filter(r => r.skill !== null).map(r => r.skill);
    }, [skillRows]);

    // Projected rating breakdown calculation
    const breakdown = useMemo(() => {
        return calculateProjectedRating({
            stats,
            starLevel,
            uniqueLevel,
            selectedSkills,
            raceConfig
        });
    }, [stats, starLevel, uniqueLevel, selectedSkills, raceConfig]);

    // Handle stat input change
    const handleStatChange = (statKey, value) => {
        const num = Math.max(0, Math.min(MAX_STAT_VALUE, parseInt(value, 10) || 0));
        setStats(prev => ({ ...prev, [statKey]: num }));
    };

    // Quick add to stat
    const handleStatStep = (statKey, delta) => {
        setStats(prev => ({
            ...prev,
            [statKey]: Math.max(0, Math.min(MAX_STAT_VALUE, (prev[statKey] || 0) + delta))
        }));
    };

    // Set stat presets
    const handleSetAllStats = (val) => {
        setStats({
            speed: val,
            stamina: val,
            power: val,
            guts: val,
            wisdom: val,
        });
    };

    // Auto-fill race config and star level from character
    const handleSelectCharacter = (char) => {
        if (!char) return;
        const apt = char.aptitudes || {};
        const dist = apt.distance || {};
        const track = apt.track || {};
        const style = apt.style || {};

        const newConfig = {
            turf: track.turf || apt.turf || 'A',
            dirt: track.dirt || apt.dirt || 'G',
            sprint: dist.short || apt.short || 'D',
            mile: dist.mile || apt.mile || 'C',
            medium: dist.medium || apt.medium || 'A',
            long: dist.long || apt.long || 'B',
            front: style.runner || apt.runner || 'A',
            pace: style.leader || apt.leader || 'B',
            late: style.betweener || apt.betweener || 'C',
            end: style.chaser || apt.chaser || 'B',
        };

        setRaceConfig(newConfig);
        setSelectedCharName(char.name);

        const stars = char.current_stars || char.base_stars || 3;
        setStarLevel(stars);
        setShowCharModal(false);
    };

    // Skill row management
    const handleSelectSkillForRow = (rowId, skill) => {
        setSkillRows(prev => {
            const next = prev.map(r => (r.rowId === rowId ? { ...r, skill } : r));
            // If the row was the last one and now has a skill, append a new empty row
            const lastRow = next[next.length - 1];
            if (lastRow && lastRow.skill !== null) {
                const maxId = Math.max(...next.map(r => r.rowId), 0);
                next.push({ rowId: maxId + 1, skill: null });
            }
            return next;
        });
    };

    const handleRemoveSkillRow = (rowId) => {
        setSkillRows(prev => {
            if (prev.length <= 1) {
                return [{ rowId: 1, skill: null }];
            }
            const filtered = prev.filter(r => r.rowId !== rowId);
            const lastRow = filtered[filtered.length - 1];
            if (!lastRow || lastRow.skill !== null) {
                const maxId = Math.max(...filtered.map(r => r.rowId), 0);
                filtered.push({ rowId: maxId + 1, skill: null });
            }
            return filtered;
        });
    };

    const handleClearAllSkills = () => {
        setSkillRows([{ rowId: 1, skill: null }]);
    };

    const handleResetCalculator = () => {
        setRaceConfig(DEFAULT_RACE_CONFIG);
        setStats(DEFAULT_STATS);
        setStarLevel(3);
        setUniqueLevel(3);
        setSkillRows([{ rowId: 1, skill: null }]);
        setSelectedCharName('');
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch {}
    };

    // Filter characters for modal
    const filteredChars = useMemo(() => {
        if (!charSearch.trim()) return charactersList;
        const q = charSearch.toLowerCase();
        return charactersList.filter(c => c.name.toLowerCase().includes(q));
    }, [charactersList, charSearch]);

    return (
        <div className="space-y-6">
            {/* Header Title & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-sm">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                            <Calculator className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                🧮 Kalkulator Proyeksi Rating
                                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    Server JP • 298 Rank (G–LS24)
                                </span>
                            </h2>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Simulasi akurat skor evaluasi karakter berdasarkan stat, unique skill, dan pengali aptitude skill resmi.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        type="button"
                        onClick={handleResetCalculator}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:border-slate-600 transition-all shadow-sm"
                        title="Kembalikan seluruh stat, aptitude, dan daftar skill ke default"
                    >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                        Reset
                    </button>
                    {onApplyToCareerForm && (
                        <button
                            type="button"
                            onClick={() => onApplyToCareerForm(breakdown.totalScore, stats)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/30 border border-emerald-500/40 transition-all transform active:scale-95"
                        >
                            <ArrowRight className="w-4 h-4" />
                            📥 Terapkan ke Form Karier ({breakdown.totalScore.toLocaleString('id-ID')})
                        </button>
                    )}
                </div>
            </div>

            {/* TOP SECTION: 2 COLUMNS (Race Configuration vs Stats & Projected Rating) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* LEFT CARD: Race Configuration (5 cols) */}
                <div className="lg:col-span-5 bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-xl flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                            <div className="flex items-center gap-2">
                                <Sliders className="w-4 h-4 text-emerald-400" />
                                <h3 className="font-bold text-sm text-slate-200 uppercase tracking-wider">
                                    Race Configuration
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCharModal(true)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-colors"
                            >
                                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                                {selectedCharName ? `🌸 ${selectedCharName}` : '🌸 Isi Otomatis dari Karakter'}
                            </button>
                        </div>

                        {/* Aptitude dropdowns */}
                        <div className="space-y-4">
                            {/* TRACK */}
                            <div>
                                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1.5">
                                    Track
                                </span>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-slate-400 block mb-1 font-medium">Turf</label>
                                        <select
                                            value={raceConfig.turf}
                                            onChange={e => setRaceConfig(prev => ({ ...prev, turf: e.target.value }))}
                                            className={`w-full px-3 py-1.5 rounded-xl font-bold text-sm bg-slate-950 border transition-all cursor-pointer ${getGradeColorClass(raceConfig.turf)}`}
                                        >
                                            {GRADE_OPTIONS.map(g => (
                                                <option key={g} value={g} className="bg-slate-900 text-white">{g}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 block mb-1 font-medium">Dirt</label>
                                        <select
                                            value={raceConfig.dirt}
                                            onChange={e => setRaceConfig(prev => ({ ...prev, dirt: e.target.value }))}
                                            className={`w-full px-3 py-1.5 rounded-xl font-bold text-sm bg-slate-950 border transition-all cursor-pointer ${getGradeColorClass(raceConfig.dirt)}`}
                                        >
                                            {GRADE_OPTIONS.map(g => (
                                                <option key={g} value={g} className="bg-slate-900 text-white">{g}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* DISTANCE */}
                            <div>
                                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1.5">
                                    Distance
                                </span>
                                <div className="grid grid-cols-4 gap-2">
                                    <div>
                                        <label className="text-[11px] text-slate-400 block mb-1 font-medium truncate">Sprint</label>
                                        <select
                                            value={raceConfig.sprint}
                                            onChange={e => setRaceConfig(prev => ({ ...prev, sprint: e.target.value }))}
                                            className={`w-full px-2 py-1.5 rounded-xl font-bold text-sm bg-slate-950 border transition-all cursor-pointer text-center ${getGradeColorClass(raceConfig.sprint)}`}
                                        >
                                            {GRADE_OPTIONS.map(g => (
                                                <option key={g} value={g} className="bg-slate-900 text-white">{g}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[11px] text-slate-400 block mb-1 font-medium truncate">Mile</label>
                                        <select
                                            value={raceConfig.mile}
                                            onChange={e => setRaceConfig(prev => ({ ...prev, mile: e.target.value }))}
                                            className={`w-full px-2 py-1.5 rounded-xl font-bold text-sm bg-slate-950 border transition-all cursor-pointer text-center ${getGradeColorClass(raceConfig.mile)}`}
                                        >
                                            {GRADE_OPTIONS.map(g => (
                                                <option key={g} value={g} className="bg-slate-900 text-white">{g}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[11px] text-slate-400 block mb-1 font-medium truncate">Medium</label>
                                        <select
                                            value={raceConfig.medium}
                                            onChange={e => setRaceConfig(prev => ({ ...prev, medium: e.target.value }))}
                                            className={`w-full px-2 py-1.5 rounded-xl font-bold text-sm bg-slate-950 border transition-all cursor-pointer text-center ${getGradeColorClass(raceConfig.medium)}`}
                                        >
                                            {GRADE_OPTIONS.map(g => (
                                                <option key={g} value={g} className="bg-slate-900 text-white">{g}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[11px] text-slate-400 block mb-1 font-medium truncate">Long</label>
                                        <select
                                            value={raceConfig.long}
                                            onChange={e => setRaceConfig(prev => ({ ...prev, long: e.target.value }))}
                                            className={`w-full px-2 py-1.5 rounded-xl font-bold text-sm bg-slate-950 border transition-all cursor-pointer text-center ${getGradeColorClass(raceConfig.long)}`}
                                        >
                                            {GRADE_OPTIONS.map(g => (
                                                <option key={g} value={g} className="bg-slate-900 text-white">{g}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* STRATEGY */}
                            <div>
                                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1.5">
                                    Strategy / Running Style
                                </span>
                                <div className="grid grid-cols-4 gap-2">
                                    <div>
                                        <label className="text-[11px] text-slate-400 block mb-1 font-medium truncate">Front</label>
                                        <select
                                            value={raceConfig.front}
                                            onChange={e => setRaceConfig(prev => ({ ...prev, front: e.target.value }))}
                                            className={`w-full px-2 py-1.5 rounded-xl font-bold text-sm bg-slate-950 border transition-all cursor-pointer text-center ${getGradeColorClass(raceConfig.front)}`}
                                        >
                                            {GRADE_OPTIONS.map(g => (
                                                <option key={g} value={g} className="bg-slate-900 text-white">{g}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[11px] text-slate-400 block mb-1 font-medium truncate">Pace</label>
                                        <select
                                            value={raceConfig.pace}
                                            onChange={e => setRaceConfig(prev => ({ ...prev, pace: e.target.value }))}
                                            className={`w-full px-2 py-1.5 rounded-xl font-bold text-sm bg-slate-950 border transition-all cursor-pointer text-center ${getGradeColorClass(raceConfig.pace)}`}
                                        >
                                            {GRADE_OPTIONS.map(g => (
                                                <option key={g} value={g} className="bg-slate-900 text-white">{g}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[11px] text-slate-400 block mb-1 font-medium truncate">Late</label>
                                        <select
                                            value={raceConfig.late}
                                            onChange={e => setRaceConfig(prev => ({ ...prev, late: e.target.value }))}
                                            className={`w-full px-2 py-1.5 rounded-xl font-bold text-sm bg-slate-950 border transition-all cursor-pointer text-center ${getGradeColorClass(raceConfig.late)}`}
                                        >
                                            {GRADE_OPTIONS.map(g => (
                                                <option key={g} value={g} className="bg-slate-900 text-white">{g}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[11px] text-slate-400 block mb-1 font-medium truncate">End</label>
                                        <select
                                            value={raceConfig.end}
                                            onChange={e => setRaceConfig(prev => ({ ...prev, end: e.target.value }))}
                                            className={`w-full px-2 py-1.5 rounded-xl font-bold text-sm bg-slate-950 border transition-all cursor-pointer text-center ${getGradeColorClass(raceConfig.end)}`}
                                        >
                                            {GRADE_OPTIONS.map(g => (
                                                <option key={g} value={g} className="bg-slate-900 text-white">{g}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                        <span>Pengali Aptitude:</span>
                        <div className="flex items-center gap-2">
                            <span className="text-emerald-400 font-bold">S/A = 1.1x</span>
                            <span>•</span>
                            <span className="text-amber-400 font-bold">B/C = 0.9x</span>
                            <span>•</span>
                            <span className="text-rose-400 font-bold">D-G = 0.8x-0.7x</span>
                        </div>
                    </div>
                </div>

                {/* RIGHT CARD: Stats & Projected Rating (7 cols) */}
                <div className="lg:col-span-7 bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-xl flex flex-col justify-between">
                    <div>
                        {/* 5 Stats Input Row */}
                        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                            <h3 className="font-bold text-sm text-slate-200 uppercase tracking-wider flex items-center gap-2">
                                <Zap className="w-4 h-4 text-emerald-400" />
                                Stats & Rating
                            </h3>
                            <div className="flex items-center gap-1.5 text-xs">
                                <button
                                    type="button"
                                    onClick={() => handleSetAllStats(0)}
                                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                                >
                                    0 All
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSetAllStats(1200)}
                                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                                >
                                    1200 All
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSetAllStats(1500)}
                                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                                >
                                    1500 All
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-5 gap-2 sm:gap-3 mb-5">
                            {[
                                { key: 'speed', label: 'Speed', color: 'text-sky-400' },
                                { key: 'stamina', label: 'Stamina', color: 'text-rose-400' },
                                { key: 'power', label: 'Power', color: 'text-amber-400' },
                                { key: 'guts', label: 'Guts', color: 'text-pink-400' },
                                { key: 'wisdom', label: 'Wisdom', color: 'text-emerald-400' },
                            ].map(st => (
                                <div key={st.key} className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 text-center">
                                    <label className={`text-xs font-bold block mb-1 truncate ${st.color}`}>
                                        {st.label}
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max={MAX_STAT_VALUE}
                                        value={stats[st.key] || ''}
                                        onChange={e => handleStatChange(st.key, e.target.value)}
                                        placeholder="0"
                                        className="w-full text-center font-black text-sm sm:text-base py-1 px-1 bg-slate-900 text-white rounded-lg border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                    />
                                    <div className="flex items-center justify-center gap-1 mt-1.5">
                                        <button
                                            type="button"
                                            onClick={() => handleStatStep(st.key, -50)}
                                            className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-400 rounded"
                                        >
                                            -50
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleStatStep(st.key, 50)}
                                            className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                                        >
                                            +50
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Star Level & Unique Skill Level */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 mb-5">
                            <div>
                                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                                    Star Level (★ Rarity)
                                </label>
                                <div className="grid grid-cols-5 gap-1">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setStarLevel(star)}
                                            className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                starLevel === star
                                                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                                                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                                            }`}
                                        >
                                            ★{star}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                                    Unique Skill Level {starLevel <= 2 && <span className="text-[10px] text-amber-400 font-normal">(Max Lv4 untuk ★1-★2)</span>}
                                </label>
                                <div className="grid grid-cols-6 gap-1">
                                    {[1, 2, 3, 4, 5, 6].map(lv => {
                                        const disabled = (starLevel === 1 || starLevel === 2) && lv > 4;
                                        return (
                                            <button
                                                key={lv}
                                                type="button"
                                                disabled={disabled}
                                                onClick={() => setUniqueLevel(lv)}
                                                className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                    disabled
                                                        ? 'bg-slate-900/40 text-slate-600 border border-slate-900 cursor-not-allowed'
                                                        : uniqueLevel === lv
                                                            ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                                                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                                                }`}
                                            >
                                                Lv{lv}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* 3 Summary Component Boxes */}
                        <div className="grid grid-cols-3 gap-3 mb-5">
                            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 text-center">
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Stats</span>
                                <span className="text-lg sm:text-xl font-black text-slate-100">
                                    {breakdown.statsScore.toLocaleString('id-ID')}
                                </span>
                            </div>
                            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 text-center">
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Skills</span>
                                <span className="text-lg sm:text-xl font-black text-amber-400">
                                    {breakdown.skillsScore.toLocaleString('id-ID')}
                                </span>
                            </div>
                            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 text-center">
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Unique</span>
                                <span className="text-lg sm:text-xl font-black text-emerald-400">
                                    {breakdown.uniqueScore.toLocaleString('id-ID')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* PROJECTED RATING MAIN BOX */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-2 border-emerald-500/40 shadow-2xl relative overflow-hidden">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400 block mb-0.5">
                                    Projected Rating
                                </span>
                                <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight flex items-baseline gap-2">
                                    {breakdown.totalScore.toLocaleString('id-ID')}
                                    <span className="text-xs font-semibold text-slate-400">pts</span>
                                </div>
                            </div>

                            <div className="flex flex-col items-center">
                                <RankBadge rank={breakdown.currentRank} size="lg" />
                                <span className="text-[10px] font-bold text-slate-400 mt-1">
                                    Tier {breakdown.currentRank}
                                </span>
                            </div>
                        </div>

                        {/* Progress bar to next rank */}
                        {breakdown.nextRank ? (
                            <div className="mt-4 pt-3 border-t border-slate-800/80">
                                <div className="flex items-center justify-between text-xs mb-1.5">
                                    <span className="text-slate-400 font-medium">
                                        NEXT: <strong className="text-white">{breakdown.nextRank}</strong> AT <strong className="text-slate-200">{breakdown.nextThreshold.toLocaleString('id-ID')}</strong>
                                    </span>
                                    <span className="text-emerald-400 font-bold">
                                        +{breakdown.pointsToNext.toLocaleString('id-ID')} pts lagi
                                    </span>
                                </div>
                                <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden relative">
                                    <div
                                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                                        style={{ width: `${breakdown.progressPercent}%` }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs text-amber-300 font-bold text-center">
                                👑 Puncak Rank Tertinggi Tercapai (LS24)!
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MIDDLE SECTION: Selected Skills Summary */}
            <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-400" />
                        <h3 className="font-bold text-sm text-slate-200">
                            Selected Skills Summary
                        </h3>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-bold">
                            Skills: {selectedSkills.length}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                            Skill Score: +{breakdown.skillsScore.toLocaleString('id-ID')}
                        </span>
                    </div>
                </div>

                {selectedSkills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {skillRows.filter(r => r.skill !== null).map(r => {
                            const sk = r.skill;
                            const effectiveScore = calculateSkillRating(sk, raceConfig);
                            const badge = getSkillTypeBadge(sk.type, sk.is_evo);
                            const iconUrl = getSkillIconUrl(sk);
                            return (
                                <div
                                    key={r.rowId}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs shadow-sm hover:border-slate-700 transition-colors"
                                >
                                    {iconUrl ? (
                                        <img
                                            src={iconUrl}
                                            alt=""
                                            className="w-4 h-4 rounded object-contain shrink-0"
                                            loading="lazy"
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        />
                                    ) : (
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold border ${badge.bg}`}>
                                            {badge.label}
                                        </span>
                                    )}
                                    <span className="font-medium text-slate-200 max-w-[200px] truncate" title={`${sk.name_en} (${sk.name_ja})`}>
                                        {sk.name_en}
                                    </span>
                                    <span className={`font-bold ${effectiveScore >= 0 ? 'text-emerald-400' : 'text-purple-400'}`}>
                                        {effectiveScore >= 0 ? `+${effectiveScore}` : effectiveScore}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveSkillRow(r.rowId)}
                                        className="text-slate-400 hover:text-rose-400 transition-colors ml-0.5"
                                        title="Hapus skill"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-xs text-slate-500 italic">
                        Belum ada skill yang dipilih. Pilih skill pada baris input di bawah untuk menambahkan poin evaluasi.
                    </p>
                )}
            </div>

            {/* BOTTOM SECTION: Dynamic Skill Input Rows (Server JP) */}
            <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 pb-44 shadow-lg relative z-20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-800">
                    <div>
                        <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                            <Layers className="w-4 h-4 text-emerald-400" />
                            Daftar Input Skill Dinamis (Server JP)
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Data GameTora & Umakonga • Terhubung dengan {rawSkillsData.length.toLocaleString('id-ID')} skill Server JP
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleClearAllSkills}
                            disabled={selectedSkills.length === 0}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Clear All Skills
                        </button>
                    </div>
                </div>

                {/* Skill Rows */}
                <div className="space-y-2.5">
                    {skillRows.map((row, index) => (
                        <SkillInputRow
                            key={row.rowId}
                            row={row}
                            index={index}
                            allSkills={rawSkillsData}
                            raceConfig={raceConfig}
                            onSelectSkill={(skill) => handleSelectSkillForRow(row.rowId, skill)}
                            onRemoveRow={() => handleRemoveSkillRow(row.rowId)}
                        />
                    ))}
                </div>
            </div>

            {/* CHARACTER SELECTOR MODAL */}
            {showCharModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-800">
                            <div>
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    🌸 Pilih Karakter untuk Isi Otomatis Aptitude
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Mengisi otomatis kesepuluh aptitude Turf..End dan Star Level karakter.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCharModal(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Search input */}
                        <div className="p-4 border-b border-slate-800 bg-slate-950/40">
                            <div className="relative">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={charSearch}
                                    onChange={e => setCharSearch(e.target.value)}
                                    placeholder="Cari nama karakter..."
                                    className="w-full pl-9 pr-4 py-2 bg-slate-900 text-sm text-white rounded-xl border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Characters List */}
                        <div className="p-4 overflow-y-auto flex-1 divide-y divide-slate-800/60 space-y-1">
                            {filteredChars.length > 0 ? (
                                filteredChars.map(char => {
                                    const apt = char.aptitudes || {};
                                    return (
                                        <button
                                            key={char.name}
                                            type="button"
                                            onClick={() => handleSelectCharacter(char)}
                                            className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800/60 transition-colors text-left group"
                                        >
                                            <div className="flex items-center gap-3">
                                                {char.image_url ? (
                                                    <img
                                                        src={char.image_url}
                                                        alt={char.name}
                                                        className="w-10 h-10 rounded-xl object-cover bg-slate-950 border border-slate-700"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-slate-400">
                                                        {char.name[0]}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="text-sm font-bold text-slate-200 group-hover:text-emerald-300 transition-colors">
                                                        {char.name}
                                                    </div>
                                                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                                        <span className="text-amber-400 font-bold">★{char.current_stars || char.base_stars || 3}</span>
                                                        <span>•</span>
                                                        <span>Turf: {apt.turf || apt.track?.turf || 'A'}</span>
                                                        <span>•</span>
                                                        <span>Dirt: {apt.dirt || apt.track?.dirt || 'G'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                Pilih
                                                <ChevronDown className="w-4 h-4 -rotate-90" />
                                            </div>
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="text-center py-10 text-slate-500 text-xs">
                                    {loadingChars ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                                            <span>Memuat daftar karakter...</span>
                                        </div>
                                    ) : (
                                        `Tidak ada karakter yang cocok dengan kata kunci "${charSearch}".`
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Single dynamic skill input row with autocomplete
 */
function SkillInputRow({ row, index, allSkills, raceConfig, onSelectSkill, onRemoveRow }) {
    const [query, setQuery] = useState(row.skill ? row.skill.name_en : '');
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Sync input query if skill in row changes from outside
    useEffect(() => {
        if (row.skill) {
            setQuery(row.skill.name_en);
        } else {
            setQuery('');
        }
    }, [row.skill]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter skills matching query
    const suggestions = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q || q.length < 2) return [];

        const matches = [];
        for (let i = 0; i < allSkills.length; i++) {
            const s = allSkills[i];
            const matchEn = s.name_en && s.name_en.toLowerCase().includes(q);
            const matchJa = s.name_ja && s.name_ja.toLowerCase().includes(q);
            const matchAlias = s.aliases && s.aliases.some(a => a.toLowerCase().includes(q));

            if (matchEn || matchJa || matchAlias) {
                matches.push(s);
                if (matches.length >= 25) break; // limit to 25 suggestions for smooth performance
            }
        }
        return matches;
    }, [query, allSkills]);

    const effectiveScore = row.skill ? calculateSkillRating(row.skill, raceConfig) : 0;
    const badge = row.skill ? getSkillTypeBadge(row.skill.type, row.skill.is_evo) : null;

    return (
        <div ref={containerRef} className="flex items-center gap-2 relative">
            {/* Type badge */}
            <div className="w-24 shrink-0 text-center">
                {badge ? (
                    <span className={`inline-block w-full py-1 px-1.5 rounded-lg text-[10px] font-bold border truncate ${badge.bg}`}>
                        {badge.label}
                    </span>
                ) : (
                    <span className="inline-block w-full py-1 px-1.5 rounded-lg text-[10px] font-bold text-slate-500 bg-slate-950/60 border border-slate-800 truncate">
                        Auto
                    </span>
                )}
            </div>

            {/* Autocomplete Input */}
            <div className="relative flex-1">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => {
                        if (query.trim().length >= 2) setIsOpen(true);
                    }}
                    placeholder="Ketik nama skill EN / JP (contoh: Arc Maestro, Groundwork)..."
                    className="w-full px-3 py-1.5 rounded-xl text-xs sm:text-sm bg-slate-950 text-white border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder-slate-600 transition-colors"
                />

                {/* Dropdown Suggestions */}
                {isOpen && suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-h-64 overflow-y-auto z-50 divide-y divide-slate-800/60 ring-1 ring-black/50">
                        {suggestions.map(s => {
                            const sc = calculateSkillRating(s, raceConfig);
                            const itemBadge = getSkillTypeBadge(s.type, s.is_evo);
                            const itemIconUrl = getSkillIconUrl(s);
                            return (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => {
                                        onSelectSkill(s);
                                        setQuery(s.name_en);
                                        setIsOpen(false);
                                    }}
                                    className="w-full p-2.5 flex items-center justify-between text-left hover:bg-slate-800/80 transition-colors group"
                                >
                                    <div className="flex items-center gap-2.5 truncate">
                                        {itemIconUrl ? (
                                            <img
                                                src={itemIconUrl}
                                                alt=""
                                                className="w-5 h-5 rounded object-contain shrink-0"
                                                loading="lazy"
                                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                            />
                                        ) : (
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border shrink-0 ${itemBadge.bg}`}>
                                                {itemBadge.label}
                                            </span>
                                        )}
                                        <div className="truncate">
                                            <div className="text-xs font-bold text-slate-200 group-hover:text-emerald-300 truncate">
                                                {s.name_en}
                                            </div>
                                            <div className="text-[10px] text-slate-400 truncate">
                                                {s.name_ja} {s.check_type && `• [${s.check_type}]`}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-xs font-bold text-emerald-400 shrink-0 ml-2">
                                        {sc >= 0 ? `+${sc} pts` : `${sc} pts`}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Score Display */}
            <div className="w-20 shrink-0 text-right pr-2">
                <span className={`text-xs font-black ${effectiveScore > 0 ? 'text-emerald-400' : effectiveScore < 0 ? 'text-purple-400' : 'text-slate-600'}`}>
                    {row.skill ? (effectiveScore >= 0 ? `+${effectiveScore}` : effectiveScore) : '-'}
                </span>
            </div>

            {/* Remove button */}
            <button
                type="button"
                onClick={onRemoveRow}
                className="w-8 h-8 rounded-lg bg-slate-950 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 border border-slate-800 hover:border-rose-500/40 flex items-center justify-center transition-colors shrink-0"
                title="Hapus baris skill"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}
