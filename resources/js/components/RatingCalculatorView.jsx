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
    CheckCircle2,
    Lock,
    Unlock,
    Flame,
    Coins,
    TrendingUp,
    PlusCircle,
    CheckSquare,
    Square,
    Percent,
    AlertCircle,
    BookOpen
} from 'lucide-react';
import RankBadge from './RankBadge';
import DeckSkillImporterModal from './DeckSkillImporterModal';
import {
    calculateStatRating,
    calculateTotalStatsRating,
    calculateUniqueSkillRating,
    calculateSkillRating,
    calculateProjectedRating,
    getBucketForGrade,
    getRankFromScore,
    MAX_STAT_VALUE,
    RANK_THRESHOLDS
} from '../utils/ratingCalculatorHelper';
import {
    calculateDiscountedSkillCost,
    calculateSkillEfficiency,
    optimizeSkillBuild,
    HINT_DISCOUNTS,
    FAST_LEARNER_DISCOUNT
} from '../utils/skillOptimizerHelper';
import rawSkillsData from '../data/ratingSkillsCatalog.json';

// Local storage keys
const STORAGE_KEY = 'uma_rating_calculator_state_v1';
const STORAGE_KEY_OPTIMIZER = 'uma_skill_optimizer_state_v1';

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
    // Mode Switcher: 'manual' | 'optimizer'
    const [activeMode, setActiveMode] = useState('manual');

    // Deck Skill Importer Modal State
    const [isDeckImporterOpen, setIsDeckImporterOpen] = useState(false);
    const [initialDeckPayload, setInitialDeckPayload] = useState(null);

    // Toast notification inside calculator
    const [calculatorToast, setCalculatorToast] = useState(null);

    const showCalculatorToast = (message, type = 'success') => {
        setCalculatorToast({ message, type });
        setTimeout(() => setCalculatorToast(null), 3500);
    };

    // Race Configuration & Stats
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

    // Selected skills array for Manual Mode
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
    const [selectedCharacterObj, setSelectedCharacterObj] = useState(null);

    // ==========================================
    // SKILL OPTIMIZER STATE
    // ==========================================
    const [budgetPt, setBudgetPt] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_OPTIMIZER);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.budgetPt !== undefined) return parseInt(parsed.budgetPt, 10) || 1500;
            }
        } catch {}
        return 1500;
    });

    const [isFastLearner, setIsFastLearner] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_OPTIMIZER);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.isFastLearner !== undefined) return Boolean(parsed.isFastLearner);
            }
        } catch {}
        return false;
    });

    const [optimizerCandidates, setOptimizerCandidates] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_OPTIMIZER);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed.candidates) && parsed.candidates.length > 0) {
                    return parsed.candidates;
                }
            }
        } catch {}
        return [];
    });

    const [optimizerSearch, setOptimizerSearch] = useState('');
    const [isAddManualCandidateOpen, setIsAddManualCandidateOpen] = useState(false);
    const [manualCandidateQuery, setManualCandidateQuery] = useState('');

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

    // Listen to global event and check sessionStorage for deck skills import
    useEffect(() => {
        const checkPendingDeckSkills = () => {
            try {
                const raw = sessionStorage.getItem('uma_import_deck_skills_v1');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed && Array.isArray(parsed.cards)) {
                        setInitialDeckPayload(parsed);
                        setIsDeckImporterOpen(true);
                        sessionStorage.removeItem('uma_import_deck_skills_v1');
                    }
                }
            } catch (e) {
                console.error('Failed to parse sessionStorage deck skills:', e);
            }
        };

        checkPendingDeckSkills();

        const handleCustomEvent = (e) => {
            if (e.detail?.cards) {
                setInitialDeckPayload(e.detail);
                setIsDeckImporterOpen(true);
            }
        };

        window.addEventListener('uma:open-rating-calculator-with-skills', handleCustomEvent);
        return () => window.removeEventListener('uma:open-rating-calculator-with-skills', handleCustomEvent);
    }, []);

    // Save manual calculator state to localStorage
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
                        base_cost: r.skill.base_cost ?? r.skill.cost,
                        cost: r.skill.cost ?? r.skill.base_cost,
                        type: r.skill.type,
                        check_type: r.skill.check_type,
                        icon_id: r.skill.icon_id,
                        icon_url: r.skill.icon_url,
                        is_evo: r.skill.is_evo,
                        prereq_id: r.skill.prereq_id,
                        lower_id: r.skill.lower_id,
                    } : null
                }))
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
        } catch (e) {
            console.error('Failed to save calculator state:', e);
        }
    }, [raceConfig, stats, starLevel, uniqueLevel, skillRows]);

    // Save optimizer state to localStorage
    useEffect(() => {
        try {
            const stateToSave = {
                budgetPt,
                isFastLearner,
                candidates: optimizerCandidates.map(c => ({
                    id: c.id,
                    name_en: c.name_en,
                    name_ja: c.name_ja,
                    score: c.score,
                    base_cost: c.base_cost ?? c.cost ?? 160,
                    cost: c.cost ?? c.base_cost ?? 160,
                    type: c.type,
                    check_type: c.check_type,
                    icon_id: c.icon_id,
                    icon_url: c.icon_url,
                    is_evo: c.is_evo,
                    prereq_id: c.prereq_id,
                    lower_id: c.lower_id,
                    hintLevel: c.hintLevel ?? 0,
                    isLocked: Boolean(c.isLocked),
                    sourceCategory: c.sourceCategory,
                    sourceLabel: c.sourceLabel,
                }))
            };
            localStorage.setItem(STORAGE_KEY_OPTIMIZER, JSON.stringify(stateToSave));
        } catch (e) {
            console.error('Failed to save optimizer state:', e);
        }
    }, [budgetPt, isFastLearner, optimizerCandidates]);

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

    // Projected rating breakdown calculation (Manual Mode)
    const breakdown = useMemo(() => {
        return calculateProjectedRating({
            stats,
            starLevel,
            uniqueLevel,
            selectedSkills,
            raceConfig
        });
    }, [stats, starLevel, uniqueLevel, selectedSkills, raceConfig]);

    // Dynamic Knapsack Optimization Solver Execution
    const optimizationResult = useMemo(() => {
        return optimizeSkillBuild({
            budgetPt,
            candidates: optimizerCandidates,
            raceConfig,
            isFastLearner,
            alreadyOwnedSkillIds: selectedSkills.map(s => s.id),
        });
    }, [budgetPt, optimizerCandidates, raceConfig, isFastLearner, selectedSkills]);

    // Rating projection after applying optimizer
    const projectedTotalScoreAfterOptimizer = breakdown.totalScore + optimizationResult.totalRatingGain;
    const projectedRankAfterOptimizer = getRankFromScore(projectedTotalScoreAfterOptimizer);

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
        setSelectedCharacterObj(char);

        const stars = char.current_stars || char.base_stars || 3;
        setStarLevel(stars);
        setShowCharModal(false);
    };

    // Skill row management
    const handleSelectSkillForRow = (rowId, skill) => {
        setSkillRows(prev => {
            const next = prev.map(r => (r.rowId === rowId ? { ...r, skill } : r));
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
        setSelectedCharacterObj(null);
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch {}
        showCalculatorToast('Kalkulator rating berhasil di-reset ke nilai bawaan.', 'info');
    };

    // ==========================================
    // IMPORTER HANDLERS (Feature #1)
    // ==========================================
    const handleImportToCalculator = (skills) => {
        if (!Array.isArray(skills) || skills.length === 0) return;

        setSkillRows(prev => {
            const existingIds = new Set(prev.filter(r => r.skill).map(r => String(r.skill.id)));
            const newRows = [...prev.filter(r => r.skill !== null)];

            let maxId = Math.max(0, ...prev.map(r => r.rowId));

            skills.forEach(sk => {
                if (!existingIds.has(String(sk.id))) {
                    existingIds.add(String(sk.id));
                    maxId++;
                    newRows.push({ rowId: maxId, skill: sk });
                }
            });

            // Add final empty row
            newRows.push({ rowId: maxId + 1, skill: null });
            return newRows;
        });

        setActiveMode('manual');
        showCalculatorToast(`${skills.length} skill berhasil dimuat ke Kalkulator Rating!`, 'success');
    };

    const handleImportToOptimizer = (candidates) => {
        if (!Array.isArray(candidates) || candidates.length === 0) return;

        setOptimizerCandidates(prev => {
            const map = new Map();
            // Preserve existing
            prev.forEach(c => map.set(String(c.id), c));
            // Add/update new
            candidates.forEach(c => map.set(String(c.id), c));
            return Array.from(map.values());
        });

        setActiveMode('optimizer');
        showCalculatorToast(`${candidates.length} skill berhasil dikirim ke kandidat Skill Optimizer!`, 'success');
    };

    // ==========================================
    // OPTIMIZER HANDLERS (Feature #2)
    // ==========================================
    const handleToggleCandidateLock = (candId) => {
        setOptimizerCandidates(prev => prev.map(c =>
            String(c.id) === String(candId) ? { ...c, isLocked: !c.isLocked } : c
        ));
    };

    const handleChangeCandidateHint = (candId, lvl) => {
        setOptimizerCandidates(prev => prev.map(c =>
            String(c.id) === String(candId) ? { ...c, hintLevel: parseInt(lvl, 10) } : c
        ));
    };

    const handleRemoveCandidate = (candId) => {
        setOptimizerCandidates(prev => prev.filter(c => String(c.id) !== String(candId)));
    };

    const handleClearAllCandidates = () => {
        setOptimizerCandidates([]);
        showCalculatorToast('Seluruh daftar kandidat optimizer dikosongkan.', 'info');
    };

    const handleAddManualCandidate = (skill) => {
        if (!skill) return;
        const exists = optimizerCandidates.some(c => String(c.id) === String(skill.id));
        if (exists) {
            showCalculatorToast(`Skill "${skill.name_en}" sudah ada di daftar kandidat!`, 'info');
            setIsAddManualCandidateOpen(false);
            return;
        }

        const newCand = {
            ...skill,
            base_cost: skill.base_cost ?? skill.cost ?? (skill.type === 'Gold' ? 160 : 160),
            hintLevel: 0,
            isLocked: false,
            sourceCategory: 'manual',
            sourceLabel: 'Input Manual',
        };

        setOptimizerCandidates(prev => [newCand, ...prev]);
        setIsAddManualCandidateOpen(false);
        showCalculatorToast(`Skill "${skill.name_en}" ditambahkan ke kandidat optimizer.`, 'success');
    };

    // Apply optimal combination to Manual Calculator
    const handleApplyOptimalToCalculator = () => {
        const optimal = optimizationResult.recommendedSkills;
        if (!optimal || optimal.length === 0) {
            showCalculatorToast('Tidak ada kombinasi skill yang direkomendasikan.', 'error');
            return;
        }

        const replacedIds = new Set(optimizationResult.replacedSkillIds);
        const finalSkills = [...selectedSkills, ...optimal]
            .filter(skill => !replacedIds.has(String(skill.skillId || skill.id)));
        const rows = finalSkills.map((skill, index) => ({ rowId: index + 1, skill }));
        rows.push({ rowId: finalSkills.length + 1, skill: null });
        setSkillRows(rows);

        setActiveMode('manual');
        showCalculatorToast(`✅ Kombinasi ${optimal.length} skill optimal (+${optimizationResult.totalRatingGain} pts) berhasil diterapkan ke Kalkulator!`, 'success');
    };

    // Filter characters for modal
    const filteredChars = useMemo(() => {
        if (!charSearch.trim()) return charactersList;
        const q = charSearch.toLowerCase();
        return charactersList.filter(c => c.name.toLowerCase().includes(q));
    }, [charactersList, charSearch]);

    // Filter candidates for search
    const filteredCandidates = useMemo(() => {
        if (!optimizerSearch.trim()) return optimizerCandidates;
        const q = optimizerSearch.toLowerCase();
        return optimizerCandidates.filter(c =>
            c.name_en?.toLowerCase().includes(q) ||
            c.name_ja?.toLowerCase().includes(q) ||
            c.sourceLabel?.toLowerCase().includes(q)
        );
    }, [optimizerCandidates, optimizerSearch]);

    // Manual add candidate search suggestions
    const manualCandidateSuggestions = useMemo(() => {
        const q = manualCandidateQuery.trim().toLowerCase();
        if (!q || q.length < 2) return [];

        const matches = [];
        for (let i = 0; i < rawSkillsData.length; i++) {
            const s = rawSkillsData[i];
            const matchEn = s.name_en && s.name_en.toLowerCase().includes(q);
            const matchJa = s.name_ja && s.name_ja.toLowerCase().includes(q);
            if (matchEn || matchJa) {
                matches.push(s);
                if (matches.length >= 20) break;
            }
        }
        return matches;
    }, [manualCandidateQuery]);

    return (
        <div className="space-y-6">
            {/* TOAST ALERT */}
            {calculatorToast && (
                <div className={`p-3.5 rounded-2xl flex items-center justify-between text-xs font-bold shadow-lg animate-in fade-in transition-all ${
                    calculatorToast.type === 'success'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : calculatorToast.type === 'error'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                }`}>
                    <div className="flex items-center gap-2">
                        {calculatorToast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4" />}
                        <span>{calculatorToast.message}</span>
                    </div>
                    <button type="button" onClick={() => setCalculatorToast(null)} className="opacity-70 hover:opacity-100">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* HEADER TITLE & TOP ACTIONS */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-sm">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                            <Calculator className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2 flex-wrap">
                                <span>🧮 Kalkulator Proyeksi Rating & Skill Optimizer</span>
                                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    Server JP • 298 Rank (G–LS24)
                                </span>
                            </h2>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Simulasi akurat skor evaluasi, jembatan impor skill deck 6 kartu, dan algoritma knapsack rekomendasi skill optimal server JP.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        type="button"
                        onClick={() => setIsDeckImporterOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/40 transition-all shadow-sm cursor-pointer"
                        title="Buka jembatan impor skill dari preset formasi deck 6 kartu & karakter koleksi"
                    >
                        <Layers className="w-4 h-4 text-amber-400" />
                        <span>🃏 Muat Skill Preset Deck / Karakter</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleResetCalculator}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:border-slate-600 transition-all shadow-sm"
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
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer"
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

                            {/* RUNNING STYLE */}
                            <div>
                                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1.5">
                                    Running Style
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

                    <div className="pt-4 mt-4 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                        <span>Aptitude Grade Multiplier:</span>
                        <span className="font-mono text-emerald-400 font-bold">A/S: 1.0x • B/C: 0.9x • D+: 0.5x</span>
                    </div>
                </div>

                {/* RIGHT CARD: Stats & Projected Rating Output (7 cols) */}
                <div className="lg:col-span-7 bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-xl flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                            <h3 className="font-bold text-sm text-slate-200 uppercase tracking-wider flex items-center gap-2">
                                <Award className="w-4 h-4 text-emerald-400" />
                                Basic Stats (5 Attributes)
                            </h3>

                            {/* Stat Quick Presets */}
                            <div className="flex items-center gap-1">
                                {[1000, 1200, 1500, 1800, 2000].map(val => (
                                    <button
                                        key={val}
                                        type="button"
                                        onClick={() => handleSetAllStats(val)}
                                        className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                                        title={`Set seluruh stat ke ${val}`}
                                    >
                                        {val}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 5 Stats Inputs */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
                            {['speed', 'stamina', 'power', 'guts', 'wisdom'].map(statKey => {
                                const labels = {
                                    speed: { name: 'Speed', color: 'text-sky-400', border: 'focus:border-sky-500' },
                                    stamina: { name: 'Stamina', color: 'text-rose-400', border: 'focus:border-rose-500' },
                                    power: { name: 'Power', color: 'text-amber-400', border: 'focus:border-amber-500' },
                                    guts: { name: 'Guts', color: 'text-orange-400', border: 'focus:border-orange-500' },
                                    wisdom: { name: 'Wisdom', color: 'text-emerald-400', border: 'focus:border-emerald-500' },
                                };
                                const conf = labels[statKey];
                                const currentScore = calculateStatRating(stats[statKey]);

                                return (
                                    <div key={statKey} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`text-xs font-black uppercase tracking-wider ${conf.color}`}>
                                                {conf.name}
                                            </span>
                                            <span className="text-[10px] font-mono font-bold text-slate-400">
                                                +{currentScore.toLocaleString('id-ID')}
                                            </span>
                                        </div>

                                        <input
                                            type="number"
                                            min="0"
                                            max={MAX_STAT_VALUE}
                                            value={stats[statKey] || ''}
                                            onChange={e => handleStatChange(statKey, e.target.value)}
                                            placeholder="0"
                                            className={`w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-base font-black text-white text-center focus:ring-1 focus:ring-emerald-500 ${conf.border}`}
                                        />

                                        <div className="grid grid-cols-2 gap-1 mt-1.5">
                                            <button
                                                type="button"
                                                onClick={() => handleStatStep(statKey, -50)}
                                                className="py-0.5 rounded text-[10px] font-bold bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800"
                                            >
                                                -50
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleStatStep(statKey, 50)}
                                                className="py-0.5 rounded text-[10px] font-bold bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800"
                                            >
                                                +50
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Star Level & Unique Skill Level */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
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

                        {/* Progress Bar to Next Rank */}
                        {breakdown.nextRank ? (
                            <div className="mt-4 pt-3 border-t border-slate-800">
                                <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 font-medium">
                                    <span>Menuju Rank <strong className="text-white font-bold">{breakdown.nextRank}</strong></span>
                                    <span className="font-mono text-emerald-400 font-bold">
                                        -{breakdown.pointsToNext.toLocaleString('id-ID')} pts ({breakdown.progressPercent}%)
                                    </span>
                                </div>
                                <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                                    <div
                                        className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 rounded-full transition-all duration-300"
                                        style={{ width: `${breakdown.progressPercent}%` }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="mt-3 text-xs font-bold text-amber-400 text-center">
                                👑 Cap Rank Tertinggi Tercapai (LS24)!
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ======================================================== */}
            {/* MODE SWITCHER: 1. KALKULATOR MANUAL vs 2. SKILL OPTIMIZER */}
            {/* ======================================================== */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-md">
                <div className="flex items-center gap-2 flex-1">
                    <button
                        type="button"
                        onClick={() => setActiveMode('manual')}
                        className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            activeMode === 'manual'
                                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30 border border-emerald-500/40'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                        }`}
                    >
                        <Calculator className="w-4 h-4" />
                        <span>🧮 Mode Kalkulator Manual</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/30 text-white">
                            {selectedSkills.length} Skill Terbeli
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveMode('optimizer')}
                        className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            activeMode === 'optimizer'
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/30 border border-amber-400/40'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                        }`}
                    >
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>⚡ Skill Optimizer (Rekomendasi Pt)</span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-black/20 text-slate-900 dark:text-white">
                            {optimizerCandidates.length} Kandidat
                        </span>
                    </button>
                </div>
            </div>

            {/* ======================================================== */}
            {/* VIEW CONTENT: MODE 1 - MANUAL CALCULATOR VIEW            */}
            {/* ======================================================== */}
            {activeMode === 'manual' && (
                <>
                    {/* Selected Skills Summary Bar */}
                    <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-lg">
                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                            <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-amber-400" />
                                Ringkasan Skill Terpilih di Kalkulator
                            </h3>

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
                                                className="text-slate-400 hover:text-rose-400 transition-colors ml-0.5 cursor-pointer"
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
                                Belum ada skill yang dipilih. Pilih skill pada baris input di bawah atau tekan tombol <strong>"🃏 Muat Skill Preset Deck / Karakter"</strong> di atas.
                            </p>
                        )}
                    </div>

                    {/* Dynamic Skill Input Rows (Server JP) */}
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
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
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
                </>
            )}

            {/* ======================================================== */}
            {/* VIEW CONTENT: MODE 2 - SKILL OPTIMIZER (JP KNAPSACK AI)  */}
            {/* ======================================================== */}
            {activeMode === 'optimizer' && (
                <div className="space-y-6">
                    {/* OPTIMIZER CONTROL PANEL */}
                    <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                            <div>
                                <h3 className="text-base font-black text-white flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-amber-400" />
                                    <span>Kontrol Anggaran Skill Points (Pt) & Status Trainee</span>
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Algoritma Knapsack terkelompok mengevaluasi kombinasi skill untuk menghasilkan kenaikan rating tertinggi dalam batasan Pt.
                                </p>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                <button
                                    type="button"
                                    onClick={() => setIsAddManualCandidateOpen(true)}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                                >
                                    <Plus className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>➕ Tambah Skill Manual</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleClearAllCandidates}
                                    disabled={optimizerCandidates.length === 0}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Kosongkan Pool ({optimizerCandidates.length})</span>
                                </button>
                            </div>
                        </div>

                        {/* Controls: Budget Pt & Fast Learner Switch */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                            {/* Budget Pt Input (7 cols) */}
                            <div className="md:col-span-7 bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                        <Coins className="w-4 h-4 text-amber-400" />
                                        <span>Sisa Skill Points (Pt) Tersedia:</span>
                                    </label>
                                    <span className="text-xs font-mono font-bold text-amber-400">
                                        {budgetPt.toLocaleString('id-ID')} Pt
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="0"
                                        max="50000"
                                        step="10"
                                        value={budgetPt}
                                        onChange={e => setBudgetPt(Math.max(0, parseInt(e.target.value, 10) || 0))}
                                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-base font-black text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setBudgetPt(prev => Math.max(0, prev - 100))}
                                        className="px-2.5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700"
                                    >
                                        -100
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setBudgetPt(prev => prev + 100)}
                                        className="px-2.5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700"
                                    >
                                        +100
                                    </button>
                                </div>

                                {/* Quick Budget Presets */}
                                <div className="flex items-center gap-1.5 pt-1 overflow-x-auto scrollbar-none">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase shrink-0">Preset:</span>
                                    {[800, 1200, 1500, 1800, 2200, 2600].map(val => (
                                        <button
                                            key={val}
                                            type="button"
                                            onClick={() => setBudgetPt(val)}
                                            className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all ${
                                                budgetPt === val
                                                    ? 'bg-amber-500 text-slate-950 font-black'
                                                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                                            }`}
                                        >
                                            {val} Pt
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Fast Learner Toggle (5 cols) */}
                            <div className="md:col-span-5 bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between h-full">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                        <Percent className="w-4 h-4 text-emerald-400" />
                                        <span>Status Fast Learner (切れ者)</span>
                                    </span>
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                        isFastLearner ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-500'
                                    }`}>
                                        {isFastLearner ? 'Aktif (-10% Pt)' : 'Non-Aktif'}
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setIsFastLearner(prev => !prev)}
                                    className={`w-full py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                                        isFastLearner
                                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md shadow-emerald-500/10'
                                            : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                                    }`}
                                >
                                    {isFastLearner ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <Square className="w-4 h-4 text-slate-500" />}
                                    <span>{isFastLearner ? '⚡ Fast Learner Aktif (Diskon Tambahan 10%)' : 'Klik untuk Aktifkan Fast Learner (切れ者)'}</span>
                                </button>

                                <span className="text-[10px] text-slate-500 mt-2 block">
                                    Diskon diakumulasi dengan level Hint: <code>Lv0: 10%</code>, <code>Lv1: 20%</code>, ..., <code>Lv5: 50%</code>.
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* OPTIMIZER REAL-TIME RESULTS DASHBOARD */}
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-2 border-amber-500/40 shadow-2xl space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <span className="text-[11px] font-black uppercase tracking-widest text-amber-400 block mb-1">
                                    Hasil Optimasi Knapsack (Server JP)
                                </span>
                                <div className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-baseline gap-2">
                                    +{optimizationResult.totalRatingGain.toLocaleString('id-ID')}
                                    <span className="text-sm font-semibold text-slate-400">pts rating gain</span>
                                </div>
                            </div>

                            {/* Rank Transition Comparison */}
                            <div className="flex items-center gap-3 bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                                <div className="flex flex-col items-center">
                                    <span className="text-[9px] font-extrabold uppercase text-slate-400">Rank Awal</span>
                                    <RankBadge rank={breakdown.currentRank} size="sm" />
                                    <span className="text-[10px] font-mono text-slate-300 mt-0.5">{breakdown.totalScore.toLocaleString('id-ID')}</span>
                                </div>

                                <div className="text-amber-400 font-black text-lg">➔</div>

                                <div className="flex flex-col items-center">
                                    <span className="text-[9px] font-extrabold uppercase text-amber-400">Proyeksi Akhir</span>
                                    <RankBadge rank={projectedRankAfterOptimizer} size="sm" />
                                    <span className="text-[10px] font-mono text-emerald-400 font-bold mt-0.5">
                                        {projectedTotalScoreAfterOptimizer.toLocaleString('id-ID')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Budget Spend Progress & Stats */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Pt Terpakai</span>
                                <div className="flex items-baseline justify-between mt-0.5">
                                    <span className="text-lg font-black text-amber-400">
                                        {optimizationResult.totalCostPt} <span className="text-xs font-normal text-slate-400">/ {budgetPt} Pt</span>
                                    </span>
                                    <span className="text-xs font-mono font-bold text-slate-400">
                                        Sisa: {optimizationResult.remainingPt} Pt
                                    </span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden mt-2">
                                    <div
                                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                                        style={{ width: `${Math.min(100, budgetPt > 0 ? (optimizationResult.totalCostPt / budgetPt) * 100 : 0)}%` }}
                                    />
                                </div>
                            </div>

                            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Jumlah Skill Dipilih</span>
                                <span className="text-lg font-black text-emerald-400 block mt-0.5">
                                    {optimizationResult.recommendedSkills.length} <span className="text-xs font-normal text-slate-400">dari {optimizerCandidates.length} kandidat</span>
                                </span>
                            </div>

                            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Rata-Rata Efisiensi</span>
                                <span className="text-lg font-black text-sky-400 block mt-0.5">
                                    {optimizationResult.averageEfficiency} <span className="text-xs font-normal text-slate-400">pts per 1 Pt</span>
                                </span>
                            </div>
                        </div>

                        {/* Warning if locked skills exceed budget */}
                        {optimizationResult.hasLockedUnaffordable && (
                            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                                <span>Perhatian: Total biaya skill yang Anda kunci (🔒) melebihi anggaran Pt. Mohon naikkan sisa Pt atau lepaskan kunci beberapa skill.</span>
                            </div>
                        )}

                        {/* Apply Button */}
                        <div className="pt-2 flex justify-end">
                            <button
                                type="button"
                                onClick={handleApplyOptimalToCalculator}
                                disabled={optimizationResult.recommendedSkills.length === 0}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/25 transition-all transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                                <Check className="w-4 h-4 stroke-[3]" />
                                <span>✅ Terapkan Kombinasi Optimal ke Kalkulator Rating</span>
                            </button>
                        </div>
                    </div>

                    {/* RECOMMENDED SKILLS vs UNSELECTED SKILLS */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* COLUMN 1: Recommended Skills (7 cols) */}
                        <div className="lg:col-span-7 bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-lg space-y-3">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-emerald-400" />
                                    <h4 className="text-sm font-black text-white">
                                        Rekomendasi Pembelian Optimal ({optimizationResult.recommendedSkills.length})
                                    </h4>
                                </div>
                                <span className="text-[10px] font-mono font-bold text-emerald-400">
                                    +{optimizationResult.totalRatingGain} pts • {optimizationResult.totalCostPt} Pt
                                </span>
                            </div>

                            {optimizationResult.recommendedSkills.length === 0 ? (
                                <p className="text-xs text-slate-500 py-8 text-center italic">
                                    Belum ada rekomendasi. Masukkan kandidat skill atau sesuaikan anggaran Pt.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {optimizationResult.recommendedSkills.map(sk => {
                                        const { purchaseCost: cost, ratingGain } = sk;
                                        const eff = calculateSkillEfficiency(ratingGain, cost);
                                        const iconUrl = getSkillIconUrl(sk);

                                        return (
                                            <div
                                                key={sk.id}
                                                className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3 shadow-sm hover:border-emerald-500/50 transition-colors"
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                    {iconUrl ? (
                                                        <img
                                                            src={iconUrl}
                                                            alt=""
                                                            className="w-8 h-8 rounded-lg object-contain bg-slate-900 border border-slate-700 shrink-0"
                                                            loading="lazy"
                                                            onError={e => { e.currentTarget.style.display = 'none'; }}
                                                        />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0">
                                                            <Zap className="w-4 h-4 text-slate-400" />
                                                        </div>
                                                    )}

                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h5 className="text-xs font-bold text-white truncate" title={`${sk.name_en} (${sk.name_ja})`}>
                                                                {sk.name_en}
                                                            </h5>
                                                            {sk.isLocked && (
                                                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                                                    🔒 Terkunci
                                                                </span>
                                                            )}
                                                            <span className={`text-[9px] font-black px-1.5 py-0.2 rounded border ${eff.badgeClass}`}>
                                                                {optimizationResult.replacedSkillIds.includes(sk.skillId) ? 'Prasyarat' : eff.tier}
                                                            </span>
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                                                            Hint: <strong className="text-emerald-400">Lv.{sk.hintLevel ?? 0}</strong> • {sk.sourceLabel || 'Support/Character'}{cost > sk.discountedCost && ' • Termasuk prasyarat'}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="text-right shrink-0">
                                                    <span className="text-xs font-mono font-bold text-amber-400 block">
                                                        {cost} Pt
                                                    </span>
                                                    <span className="text-[11px] font-black text-emerald-400 block">
                                                        {ratingGain > 0 ? '+' : ''}{ratingGain} pts
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* COLUMN 2: Unselected Skills Pool (5 cols) */}
                        <div className="lg:col-span-5 bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-lg space-y-3">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                                <h4 className="text-sm font-black text-slate-400">
                                    Skill Tidak Terpilih ({optimizationResult.unselectedSkills.length})
                                </h4>
                                <span className="text-[10px] text-slate-500">
                                    Tereliminasi oleh efisiensi/biaya Pt
                                </span>
                            </div>

                            {optimizationResult.unselectedSkills.length === 0 ? (
                                <p className="text-xs text-slate-500 py-8 text-center italic">
                                    Semua kandidat skill terbeli dalam batas anggaran!
                                </p>
                            ) : (
                                <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                                    {optimizationResult.unselectedSkills.map(sk => {
                                        const { requiredCost: cost, effectiveScore: ratingGain } = sk;
                                        const eff = calculateSkillEfficiency(ratingGain, cost);
                                        const reason = {
                                            insufficient_budget: 'Anggaran tidak mencukupi',
                                            missing_prerequisite: 'Data prasyarat tidak tersedia',
                                            conflicting_upgrade: 'Upgrade lain sudah dipilih',
                                            already_owned: 'Sudah dimiliki',
                                        }[sk.reason];
                                        const iconUrl = getSkillIconUrl(sk);

                                        return (
                                            <div
                                                key={sk.id}
                                                className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80 flex items-center justify-between gap-2 opacity-60 hover:opacity-100 transition-opacity"
                                            >
                                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                                    {iconUrl ? (
                                                        <img
                                                            src={iconUrl}
                                                            alt=""
                                                            className="w-7 h-7 rounded-lg object-contain bg-slate-900 border border-slate-700 shrink-0"
                                                            loading="lazy"
                                                            onError={e => { e.currentTarget.style.display = 'none'; }}
                                                        />
                                                    ) : (
                                                        <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0">
                                                            <Zap className="w-3.5 h-3.5 text-slate-500" />
                                                        </div>
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <h5 className="text-xs font-semibold text-slate-300 truncate" title={sk.name_en}>
                                                            {sk.name_en}
                                                        </h5>
                                                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                                                            <span>Hint Lv.{sk.hintLevel ?? 0}</span>
                                                            <span>•</span>
                                                            <span>{reason || `${eff.ratio} pts/Pt`}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="text-right shrink-0">
                                                    <span className="text-xs font-mono text-slate-400 block">{cost} Pt</span>
                                                    <span className="text-[10px] text-slate-500 block">+{ratingGain} pts</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* CANDIDATES POOL TABLE (FULL MANAGEMENT) */}
                    <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-lg space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                            <div>
                                <h4 className="text-sm font-black text-white flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-amber-400" />
                                    <span>Pool Kandidat Skill Optimizer ({optimizerCandidates.length} Skill)</span>
                                </h4>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Atur level Hint per skill atau kunci skill (🔒) agar selalu diprioritaskan oleh optimizer.
                                </p>
                            </div>

                            <div className="relative w-full sm:w-64">
                                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                                <input
                                    type="text"
                                    value={optimizerSearch}
                                    onChange={e => setOptimizerSearch(e.target.value)}
                                    placeholder="Cari kandidat..."
                                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                                />
                            </div>
                        </div>

                        {filteredCandidates.length === 0 ? (
                            <div className="py-12 text-center text-slate-500">
                                <p className="text-sm font-semibold">Belum ada kandidat skill di dalam pool.</p>
                                <p className="text-xs text-slate-600 mt-1">
                                    Tekan tombol <strong>"🃏 Muat Skill Preset Deck / Karakter"</strong> di atas untuk mengimpor dari deck 6 kartu, atau tekan <strong>"➕ Tambah Skill Manual"</strong>.
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-800/50 space-y-1">
                                {filteredCandidates.map(cand => {
                                    const ratingGain = calculateSkillRating(cand, raceConfig);
                                    const cost = calculateDiscountedSkillCost(cand.base_cost, cand.hintLevel, isFastLearner);
                                    const eff = calculateSkillEfficiency(ratingGain, cost);
                                    const iconUrl = getSkillIconUrl(cand);
                                    const isRecommended = optimizationResult.recommendedSkills.some(s => String(s.id) === String(cand.id));

                                    return (
                                        <div
                                            key={cand.id}
                                            className={`p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                                                isRecommended
                                                    ? 'bg-emerald-500/5 border border-emerald-500/20'
                                                    : 'bg-slate-950/40 border border-slate-800/40'
                                            }`}
                                        >
                                            {/* Left: Lock, Icon, Name, Source */}
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleCandidateLock(cand.id)}
                                                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer shrink-0 ${
                                                        cand.isLocked
                                                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                                                            : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
                                                    }`}
                                                    title={cand.isLocked ? 'Skill Terkunci (Wajib Dipilih)' : 'Kunci skill ini'}
                                                >
                                                    {cand.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                                </button>

                                                {iconUrl ? (
                                                    <img
                                                        src={iconUrl}
                                                        alt=""
                                                        className="w-8 h-8 rounded-lg object-contain bg-slate-900 border border-slate-700 shrink-0"
                                                        loading="lazy"
                                                        onError={e => { e.currentTarget.style.display = 'none'; }}
                                                    />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0">
                                                        <Zap className="w-4 h-4 text-slate-400" />
                                                    </div>
                                                )}

                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h5 className="text-xs sm:text-sm font-bold text-white truncate" title={`${cand.name_en} (${cand.name_ja})`}>
                                                            {cand.name_en}
                                                        </h5>
                                                        {cand.type === 'Gold' && (
                                                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                                                Gold
                                                            </span>
                                                        )}
                                                        {cand.is_evo && (
                                                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-pink-500/20 text-pink-300 border border-pink-500/40">
                                                                Evolved
                                                            </span>
                                                        )}
                                                        <span className={`text-[9px] font-black px-1.5 py-0.2 rounded border ${eff.badgeClass}`}>
                                                            {eff.tier} ({eff.ratio} pts/Pt)
                                                        </span>
                                                        {isRecommended && (
                                                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                                                Dipilih Solver
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                                                        {cand.sourceLabel || 'Support Card / Karakter'} • {cand.name_ja}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right: Hint Selector, Cost, Gain, Delete */}
                                            <div className="flex items-center gap-3 shrink-0 justify-between sm:justify-end">
                                                {/* Hint Selector */}
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] font-bold text-slate-400">Hint:</span>
                                                    <select
                                                        value={cand.hintLevel ?? 0}
                                                        onChange={e => handleChangeCandidateHint(cand.id, e.target.value)}
                                                        className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-emerald-400 cursor-pointer"
                                                    >
                                                        {[0, 1, 2, 3, 4, 5].map(lv => (
                                                            <option key={lv} value={lv}>Lv.{lv}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Cost */}
                                                <div className="text-right min-w-[65px]">
                                                    <span className="text-xs font-mono font-bold text-amber-400 block">
                                                        {cost} Pt
                                                    </span>
                                                    {cand.hintLevel > 0 && (
                                                        <span className="text-[10px] text-slate-500 line-through">
                                                            {cand.base_cost} Pt
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Gain */}
                                                <div className="text-right min-w-[60px]">
                                                    <span className="text-xs font-black text-emerald-400 block">
                                                        +{ratingGain}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">pts</span>
                                                </div>

                                                {/* Remove */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveCandidate(cand.id)}
                                                    className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                                                    title="Hapus kandidat"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* MODALS:                                                  */}
            {/* 1. CHARACTER SELECTOR MODAL (Race Config Auto-Fill)      */}
            {/* 2. DECK SKILL IMPORTER MODAL (Feature #1)                */}
            {/* 3. ADD MANUAL CANDIDATE MODAL                            */}
            {/* ======================================================== */}

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
                                            className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800/60 transition-colors text-left group cursor-pointer"
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
                                <p className="text-xs text-slate-500 py-6 text-center">
                                    Tidak ada karakter yang cocok dengan kata kunci "{charSearch}".
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* DECK SKILL IMPORTER MODAL (Feature #1) */}
            <DeckSkillImporterModal
                isOpen={isDeckImporterOpen}
                onClose={() => setIsDeckImporterOpen(false)}
                onImportToCalculator={handleImportToCalculator}
                onImportToOptimizer={handleImportToOptimizer}
                activeCharacter={selectedCharacterObj}
                raceConfig={raceConfig}
                initialDeckSkills={initialDeckPayload}
            />

            {/* ADD MANUAL CANDIDATE MODAL */}
            {isAddManualCandidateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-slate-800">
                            <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                <PlusCircle className="w-4 h-4 text-emerald-400" />
                                <span>Tambah Skill Manual ke Kandidat Optimizer</span>
                            </h4>
                            <button
                                type="button"
                                onClick={() => setIsAddManualCandidateOpen(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 border-b border-slate-800 bg-slate-950/40">
                            <div className="relative">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={manualCandidateQuery}
                                    onChange={e => setManualCandidateQuery(e.target.value)}
                                    placeholder="Cari nama skill EN/JP (minimal 2 huruf)..."
                                    className="w-full pl-9 pr-4 py-2 bg-slate-900 text-sm text-white rounded-xl border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="p-4 overflow-y-auto flex-1 divide-y divide-slate-800/60 space-y-1">
                            {manualCandidateSuggestions.length > 0 ? (
                                manualCandidateSuggestions.map(s => {
                                    const ratingGain = calculateSkillRating(s, raceConfig);
                                    const iconUrl = getSkillIconUrl(s);
                                    return (
                                        <button
                                            key={s.id}
                                            type="button"
                                            onClick={() => handleAddManualCandidate(s)}
                                            className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800/70 transition-colors text-left group cursor-pointer"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                {iconUrl ? (
                                                    <img
                                                        src={iconUrl}
                                                        alt=""
                                                        className="w-8 h-8 rounded-lg object-contain bg-slate-950 border border-slate-700 shrink-0"
                                                        loading="lazy"
                                                        onError={e => { e.currentTarget.style.display = 'none'; }}
                                                    />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                                                        <Zap className="w-4 h-4 text-slate-400" />
                                                    </div>
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-xs font-bold text-white group-hover:text-emerald-300 truncate">
                                                        {s.name_en}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 truncate">
                                                        {s.name_ja} {s.type && `• [${s.type}]`}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-right shrink-0">
                                                <span className="text-xs font-mono font-bold text-amber-400 block">
                                                    {s.base_cost ?? s.cost ?? 160} Pt
                                                </span>
                                                <span className="text-[10px] font-black text-emerald-400 block">
                                                    +{ratingGain} pts
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })
                            ) : (
                                <p className="text-xs text-slate-500 py-6 text-center italic">
                                    {manualCandidateQuery.trim().length < 2
                                        ? 'Ketik minimal 2 karakter untuk mencari skill.'
                                        : `Tidak ditemukan skill dengan nama "${manualCandidateQuery}".`}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Single dynamic skill input row with autocomplete (Manual Mode)
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
                                    className="w-full p-2.5 flex items-center justify-between text-left hover:bg-slate-800/80 transition-colors group cursor-pointer"
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
                className="w-8 h-8 rounded-lg bg-slate-950 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 border border-slate-800 hover:border-rose-500/40 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                title="Hapus baris skill"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}
