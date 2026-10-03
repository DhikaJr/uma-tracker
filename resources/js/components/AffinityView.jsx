import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
    GitFork, 
    Sparkles, 
    Trophy, 
    Layers, 
    Search, 
    Filter, 
    Check, 
    X, 
    ChevronDown, 
    ChevronUp, 
    Info, 
    RotateCcw, 
    Award, 
    ArrowRight, 
    ShieldCheck, 
    Star, 
    Flame, 
    Calendar, 
    CheckCircle2, 
    AlertTriangle,
    SlidersHorizontal,
    Plus,
    UserCheck,
    HelpCircle
} from 'lucide-react';

export default function AffinityView({ onNotify, darkMode }) {
    // 7-slot tree state: { target, parent1, parent2, gp11, gp12, gp21, gp22 }
    const [slots, setSlots] = useState({
        target: null,
        parent1: null,
        parent2: null,
        gp11: null,
        gp12: null,
        gp21: null,
        gp22: null,
    });

    // Affinity Calculation Results from backend
    const [calculationResult, setCalculationResult] = useState(null);
    const [calculating, setCalculating] = useState(false);

    // G1 shared races state
    const [selectedRaces, setSelectedRaces] = useState([1005, 1010, 1015]); // Default: Classic Triple Crown
    const [pointsPerRace, setPointsPerRace] = useState(3);
    const [calculationMethod, setCalculationMethod] = useState('pairwise'); // 'pairwise' | 'triple'
    const [raceCategories, setRaceCategories] = useState({});
    const [allRaces, setAllRaces] = useState([]);
    const [loadingRaces, setLoadingRaces] = useState(true);
    const [showRaceSelector, setShowRaceSelector] = useState(false);

    // Character picker modal state
    const [pickerOpen, setPickerOpen] = useState(false);
    const [activePickingSlot, setActivePickingSlot] = useState(null);
    const [charactersList, setCharactersList] = useState([]);
    const [loadingCharacters, setLoadingCharacters] = useState(true);
    const [charSearch, setCharSearch] = useState('');
    const [onlyOwnedFilter, setOnlyOwnedFilter] = useState(false);
    const [charRarityFilter, setCharRarityFilter] = useState('all');

    // Recommendations modal state
    const [recModalOpen, setRecModalOpen] = useState(false);
    const [recommendations, setRecommendations] = useState([]);
    const [loadingRecs, setLoadingRecs] = useState(false);
    const [recTargetMeta, setRecTargetMeta] = useState(null);

    // Career run sync modal state
    const [careerSyncOpen, setCareerSyncOpen] = useState(false);
    const [careerRuns, setCareerRuns] = useState([]);
    const [loadingCareerRuns, setLoadingCareerRuns] = useState(false);

    // Collapsible breakdown state
    const [showBreakdown, setShowBreakdown] = useState(true);
    const [showGuide, setShowGuide] = useState(false);

    // 1. Fetch character collection from API for the character picker
    const loadCharacters = async () => {
        setLoadingCharacters(true);
        try {
            const res = await fetch('/api/collection/characters');
            if (res.ok) {
                const data = await res.json();
                if (data.success && Array.isArray(data.characters)) {
                    setCharactersList(data.characters);
                }
            }
        } catch (err) {
            console.error('Failed to load characters:', err);
        } finally {
            setLoadingCharacters(false);
        }
    };

    // 2. Fetch G1 races from API
    const loadRaces = async () => {
        setLoadingRaces(true);
        try {
            const res = await fetch('/api/affinity/races');
            if (res.ok) {
                const data = await res.json();
                setRaceCategories(data.categories || {});
                setAllRaces(data.all_races || []);
            }
        } catch (err) {
            console.error('Failed to load races:', err);
        } finally {
            setLoadingRaces(false);
        }
    };

    useEffect(() => {
        loadCharacters();
        loadRaces();
    }, []);

    // Helper to extract canonical identifier for calculation
    const getSlotId = (slot) => {
        if (!slot) return 0;
        return slot.char_id || slot.uma_catalog_item_id || slot.catalog_item_id || slot.id || slot.name || 0;
    };

    // Check if two character items represent the same Uma Musume (even with different costumes)
    const isSameUma = (charA, charB) => {
        if (!charA || !charB) return false;
        const cidA = charA.char_id || charA.uma_catalog_item_id;
        const cidB = charB.char_id || charB.uma_catalog_item_id;
        if (cidA && cidB && Number(cidA) === Number(cidB)) {
            return true;
        }
        // Compare base names without costume brackets (e.g. "[Beyond the Horizon] Tokai Teio" -> "tokai teio")
        const nameA = (charA.name || '').replace(/^\[.*?\]\s*/u, '').trim().toLowerCase();
        const nameB = (charB.name || '').replace(/^\[.*?\]\s*/u, '').trim().toLowerCase();
        if (nameA && nameB && nameA === nameB) {
            return true;
        }
        return false;
    };

    // Check reasons why a character cannot be selected for an active picking slot
    const getDisabledReason = (char, slotKey, currentSlots) => {
        if (!char || !slotKey || !currentSlots) return null;

        if (slotKey === 'target') {
            if (isSameUma(char, currentSlots.parent1)) {
                return 'Sama dengan Parent 1 (Aturan JP: Dilarang sama)';
            }
            if (isSameUma(char, currentSlots.parent2)) {
                return 'Sama dengan Parent 2 (Aturan JP: Dilarang sama)';
            }
        } else if (slotKey === 'parent1') {
            if (isSameUma(char, currentSlots.target)) {
                return 'Sama dengan Target Trainee (Aturan JP: Dilarang sama)';
            }
            if (isSameUma(char, currentSlots.parent2)) {
                return 'Sama dengan Parent 2 (Aturan JP: Dilarang sama)';
            }
            if (isSameUma(char, currentSlots.gp11)) {
                return 'Sama dengan Grandparent 1A (Aturan JP: Dilarang sama)';
            }
            if (isSameUma(char, currentSlots.gp12)) {
                return 'Sama dengan Grandparent 1B (Aturan JP: Dilarang sama)';
            }
        } else if (slotKey === 'parent2') {
            if (isSameUma(char, currentSlots.target)) {
                return 'Sama dengan Target Trainee (Aturan JP: Dilarang sama)';
            }
            if (isSameUma(char, currentSlots.parent1)) {
                return 'Sama dengan Parent 1 (Aturan JP: Dilarang sama)';
            }
            if (isSameUma(char, currentSlots.gp21)) {
                return 'Sama dengan Grandparent 2A (Aturan JP: Dilarang sama)';
            }
            if (isSameUma(char, currentSlots.gp22)) {
                return 'Sama dengan Grandparent 2B (Aturan JP: Dilarang sama)';
            }
        } else if (slotKey === 'gp11') {
            if (isSameUma(char, currentSlots.parent1)) {
                return 'Sama dengan Parent 1 (Aturan JP: Dilarang sama)';
            }
            if (isSameUma(char, currentSlots.gp12)) {
                return 'Sama dengan Grandparent 1B (Aturan JP: Dilarang sama)';
            }
        } else if (slotKey === 'gp12') {
            if (isSameUma(char, currentSlots.parent1)) {
                return 'Sama dengan Parent 1 (Aturan JP: Dilarang sama)';
            }
            if (isSameUma(char, currentSlots.gp11)) {
                return 'Sama dengan Grandparent 1A (Aturan JP: Dilarang sama)';
            }
        } else if (slotKey === 'gp21') {
            if (isSameUma(char, currentSlots.parent2)) {
                return 'Sama dengan Parent 2 (Aturan JP: Dilarang sama)';
            }
            if (isSameUma(char, currentSlots.gp22)) {
                return 'Sama dengan Grandparent 2B (Aturan JP: Dilarang sama)';
            }
        } else if (slotKey === 'gp22') {
            if (isSameUma(char, currentSlots.parent2)) {
                return 'Sama dengan Parent 2 (Aturan JP: Dilarang sama)';
            }
            if (isSameUma(char, currentSlots.gp21)) {
                return 'Sama dengan Grandparent 2A (Aturan JP: Dilarang sama)';
            }
        }
        return null;
    };

    // Conflict detection across all current slots
    const slotConflicts = useMemo(() => {
        const conflicts = {};
        if (slots.target && slots.parent1 && isSameUma(slots.target, slots.parent1)) {
            conflicts.target = 'Sama dengan Parent 1 (Aturan JP: Dilarang Sama)';
            conflicts.parent1 = 'Sama dengan Target Trainee (Aturan JP: Dilarang Sama)';
        }
        if (slots.target && slots.parent2 && isSameUma(slots.target, slots.parent2)) {
            conflicts.target = conflicts.target ? `${conflicts.target} & Parent 2` : 'Sama dengan Parent 2 (Aturan JP: Dilarang Sama)';
            conflicts.parent2 = 'Sama dengan Target Trainee (Aturan JP: Dilarang Sama)';
        }
        if (slots.parent1 && slots.parent2 && isSameUma(slots.parent1, slots.parent2)) {
            conflicts.parent1 = conflicts.parent1 ? `${conflicts.parent1} & Parent 2` : 'Sama dengan Parent 2 (Aturan JP: Dilarang Sama)';
            conflicts.parent2 = conflicts.parent2 ? `${conflicts.parent2} & Parent 1` : 'Sama dengan Parent 1 (Aturan JP: Dilarang Sama)';
        }
        if (slots.parent1 && slots.gp11 && isSameUma(slots.parent1, slots.gp11)) {
            conflicts.gp11 = 'Sama dengan Parent 1 (Aturan JP: Dilarang Sama)';
        }
        if (slots.parent1 && slots.gp12 && isSameUma(slots.parent1, slots.gp12)) {
            conflicts.gp12 = 'Sama dengan Parent 1 (Aturan JP: Dilarang Sama)';
        }
        if (slots.gp11 && slots.gp12 && isSameUma(slots.gp11, slots.gp12)) {
            conflicts.gp11 = conflicts.gp11 ? `${conflicts.gp11} & GP 1B` : 'Sama dengan GP 1B (Aturan JP: Dilarang Sama)';
            conflicts.gp12 = conflicts.gp12 ? `${conflicts.gp12} & GP 1A` : 'Sama dengan GP 1A (Aturan JP: Dilarang Sama)';
        }
        if (slots.parent2 && slots.gp21 && isSameUma(slots.parent2, slots.gp21)) {
            conflicts.gp21 = 'Sama dengan Parent 2 (Aturan JP: Dilarang Sama)';
        }
        if (slots.parent2 && slots.gp22 && isSameUma(slots.parent2, slots.gp22)) {
            conflicts.gp22 = 'Sama dengan Parent 2 (Aturan JP: Dilarang Sama)';
        }
        if (slots.gp21 && slots.gp22 && isSameUma(slots.gp21, slots.gp22)) {
            conflicts.gp21 = conflicts.gp21 ? `${conflicts.gp21} & GP 2B` : 'Sama dengan GP 2B (Aturan JP: Dilarang Sama)';
            conflicts.gp22 = conflicts.gp22 ? `${conflicts.gp22} & GP 2A` : 'Sama dengan GP 2A (Aturan JP: Dilarang Sama)';
        }
        return conflicts;
    }, [slots]);

    const slotLabels = {
        target: 'Target Trainee',
        parent1: 'Parent 1 (Indukan 1)',
        parent2: 'Parent 2 (Indukan 2)',
        gp11: 'Grandparent 1A',
        gp12: 'Grandparent 1B',
        gp21: 'Grandparent 2A',
        gp22: 'Grandparent 2B',
    };

    // 3. Perform calculation whenever tree slots or G1 races change
    const calculateAffinity = useCallback(async () => {
        const targetId = getSlotId(slots.target);
        const p1Id = getSlotId(slots.parent1);
        const p2Id = getSlotId(slots.parent2);

        // If no target or parents are set, provide empty result
        if (!targetId && !p1Id && !p2Id) {
            setCalculationResult(null);
            return;
        }

        setCalculating(true);
        try {
            const payload = {
                target_id: targetId,
                p1_tree: {
                    parent_id: p1Id,
                    gp1_id: getSlotId(slots.gp11),
                    gp2_id: getSlotId(slots.gp12),
                },
                p2_tree: {
                    parent_id: p2Id,
                    gp1_id: getSlotId(slots.gp21),
                    gp2_id: getSlotId(slots.gp22),
                },
                shared_g1_races: selectedRaces,
                points_per_race: pointsPerRace,
                method: calculationMethod,
            };

            const res = await fetch('/api/affinity/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                const data = await res.json();
                setCalculationResult(data);
            }
        } catch (err) {
            console.error('Failed to calculate affinity:', err);
        } finally {
            setCalculating(false);
        }
    }, [slots, selectedRaces, pointsPerRace, calculationMethod]);

    useEffect(() => {
        calculateAffinity();
    }, [calculateAffinity]);

    // Set initial default sample if empty (Special Week, Silence Suzuka, Tokai Teio)
    useEffect(() => {
        if (charactersList.length > 0 && !slots.target && !slots.parent1) {
            const teio = charactersList.find(c => (c.char_id === 1003 || c.name.includes('Tokai Teio')));
            const spe = charactersList.find(c => (c.char_id === 1001 || c.name.includes('Special Week')));
            const suzuka = charactersList.find(c => (c.char_id === 1002 || c.name.includes('Silence Suzuka')));
            const goldShip = charactersList.find(c => (c.char_id === 1007 || c.name.includes('Gold Ship')));
            const rudolf = charactersList.find(c => (c.char_id === 1017 || c.name.includes('Symboli Rudolf')));
            const oguri = charactersList.find(c => (c.char_id === 1006 || c.name.includes('Oguri Cap')));
            const grass = charactersList.find(c => (c.char_id === 1011 || c.name.includes('Grass Wonder')));

            if (teio) {
                setSlots({
                    target: teio,
                    parent1: spe || null,
                    parent2: suzuka || null,
                    gp11: goldShip || null,
                    gp12: rudolf || null,
                    gp21: oguri || null,
                    gp22: grass || null,
                });
            }
        }
    }, [charactersList]);

    // Handle slot selection
    const openPickerForSlot = (slotKey) => {
        setActivePickingSlot(slotKey);
        setCharSearch('');
        setPickerOpen(true);
    };

    const handleSelectCharacter = (char) => {
        if (!activePickingSlot) return;

        const reason = getDisabledReason(char, activePickingSlot, slots);
        if (reason) {
            onNotify?.(reason, 'warning');
            return;
        }

        setSlots(prev => ({
            ...prev,
            [activePickingSlot]: char,
        }));
        setPickerOpen(false);
        setActivePickingSlot(null);
    };

    const handleClearSlot = (slotKey, e) => {
        e?.stopPropagation();
        setSlots(prev => ({
            ...prev,
            [slotKey]: null,
        }));
    };

    const handleResetAll = () => {
        setSlots({
            target: null,
            parent1: null,
            parent2: null,
            gp11: null,
            gp12: null,
            gp21: null,
            gp22: null,
        });
        setSelectedRaces([]);
        onNotify?.('Silsilah berhasil dikosongkan', 'info');
    };

    // Filter characters in modal
    const filteredCharacters = useMemo(() => {
        return charactersList.filter(char => {
            if (onlyOwnedFilter && !char.is_owned) {
                return false;
            }

            if (charRarityFilter !== 'all') {
                const targetStars = parseInt(charRarityFilter, 10);
                const baseStars = char.base_stars || char.rarity || 3;
                if (baseStars !== targetStars) return false;
            }

            if (charSearch.trim()) {
                const query = charSearch.toLowerCase().trim();
                const name = (char.name || '').toLowerCase();
                const jpName = (char.raw_data?.name_jp || '').toLowerCase();
                const title = (char.title || '').toLowerCase();
                return name.includes(query) || jpName.includes(query) || title.includes(query);
            }

            return true;
        });
    }, [charactersList, onlyOwnedFilter, charRarityFilter, charSearch]);

    // Preset race buttons
    const applyRacePreset = (presetKey) => {
        if (presetKey === 'all') {
            setSelectedRaces(allRaces.map(r => r.id));
        } else if (presetKey === 'none') {
            setSelectedRaces([]);
        } else if (raceCategories[presetKey]) {
            const ids = raceCategories[presetKey].races.map(r => r.id);
            setSelectedRaces(prev => Array.from(new Set([...prev, ...ids])));
        }
    };

    const toggleRace = (raceId) => {
        setSelectedRaces(prev => {
            if (prev.includes(raceId)) {
                return prev.filter(id => id !== raceId);
            } else {
                return [...prev, raceId];
            }
        });
    };

    // Load recommendations for Target
    const fetchRecommendations = async () => {
        const targetId = slots.target?.char_id || slots.target?.id;
        if (!targetId) {
            onNotify?.('Pilih Target Trainee terlebih dahulu untuk melihat rekomendasi', 'info');
            return;
        }

        setLoadingRecs(true);
        setRecModalOpen(true);
        try {
            const res = await fetch(`/api/affinity/recommendations/${targetId}?limit=8`);
            if (res.ok) {
                const data = await res.json();
                setRecommendations(data.recommendations || []);
                setRecTargetMeta(data.target || slots.target);
            } else {
                const errData = await res.json();
                onNotify?.(errData.message || 'Gagal mengambil rekomendasi', 'error');
            }
        } catch (err) {
            console.error('Failed to fetch recommendations:', err);
            onNotify?.('Terjadi kesalahan jaringan saat mengambil rekomendasi', 'error');
        } finally {
            setLoadingRecs(false);
        }
    };

    const applyRecommendationPair = (p1Meta, p2Meta) => {
        // Find in charactersList to get full object if possible
        const p1 = charactersList.find(c => c.char_id === p1Meta.char_id) || p1Meta;
        const p2 = charactersList.find(c => c.char_id === p2Meta.char_id) || p2Meta;

        setSlots(prev => ({
            ...prev,
            parent1: p1,
            parent2: p2,
        }));
        setRecModalOpen(false);
        onNotify?.(`Parent 1 (${p1.name}) & Parent 2 (${p2.name}) berhasil diterapkan!`, 'success');
    };

    // Load Career Runs for sync
    const openCareerSync = async () => {
        setCareerSyncOpen(true);
        setLoadingCareerRuns(true);
        try {
            const res = await fetch('/api/affinity/career-runs');
            if (res.ok) {
                const data = await res.json();
                setCareerRuns(data.runs || []);
            }
        } catch (err) {
            console.error('Failed to load career runs:', err);
        } finally {
            setLoadingCareerRuns(false);
        }
    };

    const handleSyncRunToSlot = (run, targetSlotKey) => {
        const matchedChar = charactersList.find(c => 
            c.name.toLowerCase().includes(run.uma_name.toLowerCase()) ||
            run.uma_name.toLowerCase().includes(c.name.toLowerCase())
        );

        if (matchedChar) {
            setSlots(prev => ({
                ...prev,
                [targetSlotKey]: matchedChar,
            }));
            setCareerSyncOpen(false);
            onNotify?.(`${run.uma_name} diterapkan ke slot!`, 'success');
        } else {
            onNotify?.(`Karakter ${run.uma_name} tidak ditemukan di katalog`, 'error');
        }
    };

    // Score calculations
    const totalScore = calculationResult?.total_score || 0;
    const baseScore = calculationResult?.base_score || 0;
    const g1BonusScore = calculationResult?.g1_bonus_score || 0;
    const badgeInfo = calculationResult?.badge_info || { symbol: '△', label: 'Peluang Rendah', color: 'slate' };
    const warnings = calculationResult?.warnings || [];
    const breakdown = calculationResult?.breakdown || {};
    const circleNeeded = calculationResult?.thresholds?.circle_needed || 0;
    const doubleCircleNeeded = calculationResult?.thresholds?.double_circle_needed || 0;

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* 1. Header Banner */}
            <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-cyan-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-700/60 border border-emerald-400/30 text-xs font-bold text-emerald-200">
                            <GitFork className="w-3.5 h-3.5 text-amber-300" />
                            <span>JP Server Inheritance Formula</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                            Kalkulator Kompatibilitas Silsilah
                            <span className="text-xs px-2.5 py-0.5 rounded-md bg-amber-400 text-slate-950 font-black uppercase tracking-wider">
                                相性
                            </span>
                        </h1>
                        <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed">
                            Simulasikan relasi 7 slot silsilah (Target, 2 Parent, 4 Grandparent) & bonus kemenangan G1 bersama untuk memaksimalkan peluang pewarisan bintang faktor (Double Circle ◎).
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        <button
                            type="button"
                            onClick={fetchRecommendations}
                            disabled={!slots.target}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer ${
                                slots.target 
                                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-amber-500/20 active:scale-95'
                                    : 'bg-emerald-950/40 text-emerald-400/60 border border-emerald-700/40 cursor-not-allowed'
                            }`}
                        >
                            <Sparkles className="w-4 h-4 text-slate-950" />
                            <span>Cari Parent Terbaik</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowGuide(prev => !prev)}
                            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-900/60 hover:bg-emerald-900 border border-emerald-600/40 text-xs font-bold text-emerald-100 transition-all cursor-pointer"
                        >
                            <HelpCircle className="w-4 h-4 text-emerald-300" />
                            <span className="hidden sm:inline">Panduan</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleResetAll}
                            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-900/60 hover:bg-emerald-900 border border-emerald-600/40 text-xs font-bold text-emerald-100 transition-all cursor-pointer"
                            title="Reset Semua Slot"
                        >
                            <RotateCcw className="w-4 h-4 text-emerald-300" />
                            <span className="hidden sm:inline">Reset</span>
                        </button>
                    </div>
                </div>

                {/* Guide Accordion */}
                {showGuide && (
                    <div className="mt-6 pt-6 border-t border-emerald-600/40 text-xs text-emerald-100/90 space-y-3 bg-emerald-950/40 p-4 rounded-2xl">
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                            <Info className="w-4 h-4 text-amber-300" />
                            Aturan Kompatibilitas Pewarisan (Inheritance Affinity JP):
                        </div>
                        <p>
                            • <b>Skor Total:</b> Ditentukan oleh nilai relasi dasar (Base Affinity) antar karakter di dalam silsilah ditambah Bonus Balapan G1 (重賞ボーナス).
                        </p>
                        <p>
                            • <b>Kombinasi Relasi yang Dihitung:</b> Target ↔ Parent 1, Target ↔ Parent 2, Parent 1 ↔ Parent 2, Parent 1 ↔ GP1A, Parent 1 ↔ GP1B, Parent 2 ↔ GP2A, Parent 2 ↔ GP2B.
                        </p>
                        <p>
                            • <b>Bonus Balapan G1:</b> Setiap kemenangan balapan G1 yang sama antar pasangan parent dan grandparent menambahkan <b>+3 poin</b> per balapan (standar update JP post-2nd Anni).
                        </p>
                        <p>
                            • <b>Klasifikasi Badge:</b>
                            <span className="ml-2 font-mono font-bold text-slate-300">△ (&lt; 51: Peluang Rendah)</span> | 
                            <span className="ml-2 font-mono font-bold text-emerald-300">○ (51 - 150: Normal)</span> | 
                            <span className="ml-2 font-mono font-bold text-amber-300">◎ (≥ 151: Peluang Maksimal / Double Circle)</span>
                        </p>
                    </div>
                )}
            </div>

            {/* Warnings Alert */}
            {warnings.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-2xl p-4 flex items-start gap-3 text-amber-900 dark:text-amber-200">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-sm">
                        <div className="font-bold">Peringatan Validitas Silsilah Game:</div>
                        <ul className="list-disc list-inside space-y-0.5 text-xs opacity-90">
                            {warnings.map((warn, i) => (
                                <li key={i}>{warn}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* 2. Main Score & Dynamic Badge Card */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between relative overflow-hidden">
                    {/* Background glow if double circle */}
                    {totalScore >= 151 && (
                        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-pink-500/10 to-purple-500/10 pointer-events-none animate-pulse" />
                    )}

                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <Award className="w-4 h-4 text-emerald-500" />
                                Hasil Kalkulasi Kompatibilitas
                            </span>

                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                    Metode:
                                </span>
                                <select 
                                    value={calculationMethod} 
                                    onChange={(e) => setCalculationMethod(e.target.value)}
                                    className="text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-300 cursor-pointer"
                                >
                                    <option value="pairwise">Standar 7-Cabang Pairwise</option>
                                    <option value="triple">GameTora 3-Way Overlap (T ∩ P ∩ GP)</option>
                                </select>
                            </div>
                        </div>

                        {/* Large Score + Badge Section */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 py-2">
                            <div className="flex items-center gap-5">
                                {/* Dynamic Badge Symbol */}
                                <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl flex flex-col items-center justify-center font-black text-4xl sm:text-5xl shadow-lg shrink-0 transition-transform ${
                                    totalScore >= 151
                                        ? 'bg-gradient-to-tr from-amber-400 via-rose-400 to-indigo-400 text-white shadow-amber-500/30 ring-4 ring-amber-300/40'
                                        : totalScore >= 51
                                        ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-emerald-500/30'
                                        : 'bg-gradient-to-tr from-slate-300 to-slate-400 dark:from-slate-700 dark:to-slate-600 text-slate-800 dark:text-slate-200'
                                }`}>
                                    <span className="leading-none mt-1">{badgeInfo.symbol}</span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-90 mt-1">
                                        {totalScore >= 151 ? 'Maksimal' : totalScore >= 51 ? 'Normal' : 'Rendah'}
                                    </span>
                                </div>

                                <div className="space-y-1">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                                            {totalScore}
                                        </span>
                                        <span className="text-sm sm:text-base font-bold text-slate-400">
                                            Poin
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                            Dasar: <b>{baseScore}</b>
                                        </span>
                                        <span className="text-slate-400">+</span>
                                        <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
                                            Bonus G1: <b>+{g1BonusScore}</b>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Status and Progress to next tier */}
                            <div className="w-full sm:w-auto sm:max-w-xs space-y-2 text-left sm:text-right">
                                <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                    {badgeInfo.label}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                    {totalScore >= 151 ? (
                                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center sm:justify-end gap-1">
                                            <CheckCircle2 className="w-4 h-4" />
                                            Target ◎ Tercapai! Peluang warisan faktor tertinggi.
                                        </span>
                                    ) : totalScore >= 51 ? (
                                        <span>
                                            Butuh <b>+{doubleCircleNeeded}</b> poin lagi untuk mencapai target <b>◎ (151+)</b>.
                                        </span>
                                    ) : (
                                        <span>
                                            Butuh <b>+{circleNeeded}</b> poin lagi untuk mencapai <b>○ (51+)</b>.
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar towards 151 */}
                        <div className="space-y-1.5 pt-2">
                            <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative flex">
                                {/* First Tier Marker: 51/180 = ~28% */}
                                <div 
                                    className="absolute top-0 bottom-0 w-0.5 bg-slate-400 dark:bg-slate-600 z-10" 
                                    style={{ left: `${(51 / 180) * 100}%` }}
                                    title="Target Lingkaran ○: 51 Poin"
                                />
                                {/* Second Tier Marker: 151/180 = ~84% */}
                                <div 
                                    className="absolute top-0 bottom-0 w-0.5 bg-amber-500 z-10" 
                                    style={{ left: `${(151 / 180) * 100}%` }}
                                    title="Target Lingkaran Ganda ◎: 151 Poin"
                                />

                                <div 
                                    className={`h-full transition-all duration-500 rounded-full ${
                                        totalScore >= 151 
                                            ? 'bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-400' 
                                            : totalScore >= 51 
                                            ? 'bg-emerald-500' 
                                            : 'bg-slate-400'
                                    }`}
                                    style={{ width: `${Math.min(100, Math.max(5, (totalScore / 180) * 100))}%` }}
                                />
                            </div>

                            <div className="flex justify-between text-[10px] font-semibold text-slate-400">
                                <span>0</span>
                                <span className="text-slate-600 dark:text-slate-400 font-bold">○ 51</span>
                                <span className="text-amber-600 dark:text-amber-400 font-bold">◎ 151</span>
                                <span>180+</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side Quick Summary Card */}
                <div className="lg:col-span-4 bg-slate-50 dark:bg-slate-800/60 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Balapan G1 Terpilih
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                                {selectedRaces.length} Balapan
                            </span>
                        </div>

                        <div className="space-y-1.5 text-xs">
                            <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                                <span>Bonus per Kemenangan:</span>
                                <span className="font-bold text-slate-900 dark:text-white">+{pointsPerRace} Poin</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                                <span>Total Relasi yang Diuji:</span>
                                <span className="font-bold text-slate-900 dark:text-white">5 Relasi Indukan</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                                <span>Total Kontribusi Bonus:</span>
                                <span className="font-bold text-amber-600 dark:text-amber-400">+{g1BonusScore} Poin</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                        <button
                            type="button"
                            onClick={() => setShowRaceSelector(true)}
                            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <Trophy className="w-4 h-4" />
                            <span>Pilih Balapan G1 Bersama</span>
                        </button>

                        <button
                            type="button"
                            onClick={openCareerSync}
                            className="w-full py-2 px-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            <span>Sinkronkan dari Karier Saya</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* 3. Visual Pedigree Tree Diagram (7 Slots) */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                            <GitFork className="w-5 h-5 text-emerald-500" />
                            Diagram Visual Silsilah (Pedigree Tree)
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Klik slot mana saja untuk mengganti karakter dari katalog atau koleksi Anda.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setShowBreakdown(prev => !prev)}
                            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                            <span>{showBreakdown ? 'Sembunyikan' : 'Tampilkan'} Rincian Poin</span>
                            {showBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* Lineage Duplicate Conflicts Warning Banner */}
                {Object.keys(slotConflicts).length > 0 && (
                    <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-start gap-3 shadow-xs">
                        <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                        <div className="text-xs space-y-1">
                            <p className="font-bold text-sm text-rose-900 dark:text-rose-100">
                                Peringatan Validasi Silsilah (Aturan Resmi Game Umamusume JP):
                            </p>
                            <p className="leading-relaxed">
                                Di dalam game, <strong>Target Trainee tidak dapat mewarisi dari dirinya sendiri</strong> (Target ≠ Parent 1 & Target ≠ Parent 2), dan <strong>kedua Parent tidak boleh berasal dari karakter yang sama</strong> (Parent 1 ≠ Parent 2), meskipun variasi kostum atau epithet-nya berbeda.
                            </p>
                            <ul className="list-disc list-inside pt-1 space-y-0.5 font-semibold text-rose-700 dark:text-rose-300">
                                {Object.entries(slotConflicts).map(([k, reason]) => (
                                    <li key={k}>
                                        <span className="font-bold underline">{slotLabels[k] || k}</span>: {reason}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                {/* 7-Slot Diagram Container */}
                <div className="flex flex-col items-center space-y-6 sm:space-y-8 max-w-4xl mx-auto">
                    {/* ROW 1: TARGET UMA (TRAINEE) */}
                    <div className="flex flex-col items-center relative">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-3 py-1 rounded-full mb-2 border border-emerald-300 dark:border-emerald-700/50">
                            Target Trainee (Karakter yang Dilatih)
                        </div>

                        <SlotCard 
                            slotKey="target"
                            char={slots.target}
                            label="Target Trainee"
                            isCenter={true}
                            conflict={Boolean(slotConflicts.target)}
                            conflictReason={slotConflicts.target}
                            onSelect={() => openPickerForSlot('target')}
                            onClear={(e) => handleClearSlot('target', e)}
                        />

                        {/* Branch lines down to Parents */}
                        <div className="w-0.5 h-6 bg-slate-300 dark:bg-slate-700 mt-2" />
                    </div>

                    {/* ROW 2: PARENTS (P1 on Left, P2 on Right) */}
                    <div className="w-full relative">
                        {/* Cross connector line above parents */}
                        <div className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-slate-300 dark:bg-slate-700 -translate-y-2 sm:-translate-y-3" />
                        <div className="absolute top-0 left-1/4 w-0.5 h-3 bg-slate-300 dark:bg-slate-700 -translate-y-2 sm:-translate-y-3" />
                        <div className="absolute top-0 right-1/4 w-0.5 h-3 bg-slate-300 dark:bg-slate-700 -translate-y-2 sm:-translate-y-3" />

                        {/* Center P1 <-> P2 connection badge */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden md:flex flex-col items-center">
                            {isSameUma(slots.parent1, slots.parent2) ? (
                                <span className="px-2.5 py-1 rounded-full bg-rose-600 text-white text-[10px] font-black shadow-md border border-rose-400 whitespace-nowrap flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>P1 = P2 (Dilarang)</span>
                                </span>
                            ) : (
                                <span className="px-2.5 py-1 rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-[10px] font-black shadow-md border border-slate-700 dark:border-slate-300 whitespace-nowrap">
                                    P1 ↔ P2: +{breakdown.p1_p2?.total || 0}
                                </span>
                            )}
                            <span className="text-[9px] text-slate-500 font-medium">Relasi Indukan</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12">
                            {/* Parent 1 (Left) */}
                            <div className="flex flex-col items-center relative">
                                <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-3 py-1 rounded-full mb-2 border border-indigo-200 dark:border-indigo-800">
                                    Parent 1 (Indukan 1)
                                </div>
                                <SlotCard 
                                    slotKey="parent1"
                                    char={slots.parent1}
                                    label="Parent 1"
                                    relationScore={breakdown.target_p1?.total}
                                    relationLabel="Target ↔ P1"
                                    conflict={Boolean(slotConflicts.parent1)}
                                    conflictReason={slotConflicts.parent1}
                                    onSelect={() => openPickerForSlot('parent1')}
                                    onClear={(e) => handleClearSlot('parent1', e)}
                                />
                                <div className="w-0.5 h-6 bg-slate-300 dark:bg-slate-700 mt-2" />
                            </div>

                            {/* Parent 2 (Right) */}
                            <div className="flex flex-col items-center relative">
                                <div className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/80 px-3 py-1 rounded-full mb-2 border border-rose-200 dark:border-rose-800">
                                    Parent 2 (Indukan 2)
                                </div>
                                <SlotCard 
                                    slotKey="parent2"
                                    char={slots.parent2}
                                    label="Parent 2"
                                    relationScore={breakdown.target_p2?.total}
                                    relationLabel="Target ↔ P2"
                                    conflict={Boolean(slotConflicts.parent2)}
                                    conflictReason={slotConflicts.parent2}
                                    onSelect={() => openPickerForSlot('parent2')}
                                    onClear={(e) => handleClearSlot('parent2', e)}
                                />
                                <div className="w-0.5 h-6 bg-slate-300 dark:bg-slate-700 mt-2" />
                            </div>
                        </div>
                    </div>

                    {/* ROW 3: GRANDPARENTS (4 Slots) */}
                    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12">
                        {/* Grandparents of Parent 1 */}
                        <div className="bg-slate-50/80 dark:bg-slate-800/40 p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 relative">
                            <div className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-4">
                                Kakek-Nenek Parent 1
                            </div>
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                <SlotCard 
                                    slotKey="gp11"
                                    char={slots.gp11}
                                    label="GP 1A"
                                    isSmall={true}
                                    relationScore={breakdown.p1_gp1a?.total}
                                    relationLabel="P1 ↔ GP1A"
                                    conflict={Boolean(slotConflicts.gp11)}
                                    conflictReason={slotConflicts.gp11}
                                    onSelect={() => openPickerForSlot('gp11')}
                                    onClear={(e) => handleClearSlot('gp11', e)}
                                />
                                <SlotCard 
                                    slotKey="gp12"
                                    char={slots.gp12}
                                    label="GP 1B"
                                    isSmall={true}
                                    relationScore={breakdown.p1_gp1b?.total}
                                    relationLabel="P1 ↔ GP1B"
                                    conflict={Boolean(slotConflicts.gp12)}
                                    conflictReason={slotConflicts.gp12}
                                    onSelect={() => openPickerForSlot('gp12')}
                                    onClear={(e) => handleClearSlot('gp12', e)}
                                />
                            </div>
                        </div>

                        {/* Grandparents of Parent 2 */}
                        <div className="bg-slate-50/80 dark:bg-slate-800/40 p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 relative">
                            <div className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-4">
                                Kakek-Nenek Parent 2
                            </div>
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                <SlotCard 
                                    slotKey="gp21"
                                    char={slots.gp21}
                                    label="GP 2A"
                                    isSmall={true}
                                    relationScore={breakdown.p2_gp2a?.total}
                                    relationLabel="P2 ↔ GP2A"
                                    conflict={Boolean(slotConflicts.gp21)}
                                    conflictReason={slotConflicts.gp21}
                                    onSelect={() => openPickerForSlot('gp21')}
                                    onClear={(e) => handleClearSlot('gp21', e)}
                                />
                                <SlotCard 
                                    slotKey="gp22"
                                    char={slots.gp22}
                                    label="GP 2B"
                                    isSmall={true}
                                    relationScore={breakdown.p2_gp2b?.total}
                                    relationLabel="P2 ↔ GP2B"
                                    conflict={Boolean(slotConflicts.gp22)}
                                    conflictReason={slotConflicts.gp22}
                                    onSelect={() => openPickerForSlot('gp22')}
                                    onClear={(e) => handleClearSlot('gp22', e)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. Detailed Breakdown Accordion Table */}
                {showBreakdown && (
                    <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                <SlidersHorizontal className="w-4 h-4 text-emerald-500" />
                                Rincian Perolehan Poin per Cabang Silsilah
                            </h3>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold">
                                        <th className="py-2.5 px-3">Cabang Relasi</th>
                                        <th className="py-2.5 px-3">Poin Dasar</th>
                                        <th className="py-2.5 px-3">Bonus Kemenangan G1</th>
                                        <th className="py-2.5 px-3 text-right">Total Subskor</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                                    {Object.entries(breakdown).map(([key, item]) => (
                                        <tr key={key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                            <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                                                {item.label}
                                            </td>
                                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                                                {item.base} Poin
                                            </td>
                                            <td className="py-2.5 px-3 text-amber-600 dark:text-amber-400 font-semibold">
                                                {item.g1_bonus > 0 ? `+${item.g1_bonus} Poin (${item.matches} match)` : '-'}
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                                                {item.total} Poin
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="bg-emerald-50/50 dark:bg-emerald-950/30 font-bold text-sm">
                                        <td className="py-3 px-3 text-emerald-800 dark:text-emerald-300">
                                            TOTAL KOMPATIBILITAS KESELURUHAN
                                        </td>
                                        <td className="py-3 px-3 text-emerald-700 dark:text-emerald-400">
                                            {baseScore} Poin
                                        </td>
                                        <td className="py-3 px-3 text-amber-600 dark:text-amber-400">
                                            +{g1BonusScore} Poin
                                        </td>
                                        <td className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400 font-black text-base">
                                            {totalScore} ({badgeInfo.symbol})
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL 1: Character Selector Modal */}
            {pickerOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
                        {/* Modal Header */}
                        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg">
                                    Pilih Karakter untuk Slot {activePickingSlot?.toUpperCase()}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Cari berdasarkan nama Romaji, Kanji, atau gelar.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPickerOpen(false)}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Search & Filter Controls */}
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                            <div className="relative">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={charSearch}
                                    onChange={(e) => setCharSearch(e.target.value)}
                                    placeholder="Ketik nama Uma Musume (misal: Teio, Special Week, Suzuka)..."
                                    className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    autoFocus
                                />
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-700 dark:text-slate-300">
                                    <input
                                        type="checkbox"
                                        checked={onlyOwnedFilter}
                                        onChange={(e) => setOnlyOwnedFilter(e.target.checked)}
                                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                    />
                                    <span>Tampilkan Hanya Koleksi Saya</span>
                                </label>

                                <div className="flex items-center gap-1.5">
                                    <span className="text-slate-400 font-medium">Bintang:</span>
                                    {['all', '3', '2', '1'].map(r => (
                                        <button
                                            key={r}
                                            type="button"
                                            onClick={() => setCharRarityFilter(r)}
                                            className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                                                charRarityFilter === r
                                                    ? 'bg-emerald-600 text-white'
                                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                                            }`}
                                        >
                                            {r === 'all' ? 'Semua' : `${r}★`}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Characters Grid */}
                        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                            {filteredCharacters.map(c => {
                                const isCurrentSelected = slots[activePickingSlot]?.char_id === c.char_id;
                                const disabledReason = getDisabledReason(c, activePickingSlot, slots);
                                const isDisabled = Boolean(disabledReason);

                                return (
                                    <button
                                        key={c.uma_catalog_item_id || c.catalog_item_id || c.id || c.name}
                                        type="button"
                                        disabled={isDisabled}
                                        onClick={() => {
                                            if (isDisabled) {
                                                onNotify?.(disabledReason, 'warning');
                                                return;
                                            }
                                            handleSelectCharacter(c);
                                        }}
                                        className={`flex items-center gap-2.5 p-2 rounded-2xl text-left border transition-all ${
                                            isDisabled
                                                ? 'opacity-40 cursor-not-allowed bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
                                                : isCurrentSelected
                                                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500/30 cursor-pointer'
                                                : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer'
                                        }`}
                                    >
                                        <img 
                                            src={c.image_url || c.thumb || '/placeholder-uma.png'} 
                                            alt={c.name}
                                            className={`w-12 h-12 rounded-xl object-cover bg-slate-100 dark:bg-slate-700 shrink-0 ${isDisabled ? 'grayscale' : ''}`}
                                            onError={(e) => { e.currentTarget.src = 'https://gametora.com/images/umamusume/ui/arrow_plus.png'; }}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                {c.name}
                                            </div>
                                            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                                {c.title || c.raw_data?.title_en_gl || ''}
                                            </div>
                                            {isDisabled ? (
                                                <div className="mt-1 px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-bold text-[9px] flex items-center gap-1 truncate" title={disabledReason}>
                                                    <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                                    <span className="truncate">{disabledReason}</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <span className="text-[10px] text-amber-500 font-bold flex items-center">
                                                        ★ {c.base_stars || c.rarity || 3}
                                                    </span>
                                                    {c.is_owned && (
                                                        <span className="text-[9px] px-1 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 font-bold">
                                                            Milik
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: G1 Race Bonus Selector Modal */}
            {showRaceSelector && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg flex items-center gap-2">
                                    <Trophy className="w-5 h-5 text-amber-500" />
                                    Pilih Balapan G1 yang Dimenangkan Bersama
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Tiap balapan G1 yang sama antar parent & grandparent memberikan bonus poin kompatibilitas.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowRaceSelector(false)}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Presets Bar */}
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                                    Preset Cepat:
                                </span>
                                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                    <span className="text-slate-500 font-medium">Poin Kemenangan G1:</span>
                                    {[
                                        { pts: 3, label: '+3 Poin (Standar 2nd Anni)', note: 'Standar JP Server pasca 2nd Anniversary (Februari 2023)' },
                                        { pts: 2, label: '+2 Poin', note: 'Opsi kalkulasi kustom' },
                                        { pts: 1, label: '+1 Poin', note: 'Opsi kalkulasi kustom' },
                                    ].map(item => (
                                        <button
                                            key={item.pts}
                                            type="button"
                                            onClick={() => setPointsPerRace(item.pts)}
                                            title={item.note}
                                            className={`px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer transition-all ${
                                                pointsPerRace === item.pts 
                                                    ? 'bg-amber-400 text-slate-950 shadow-xs ring-2 ring-amber-400/50' 
                                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                                            }`}
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5">
                                <Info className="w-3.5 h-3.5 shrink-0" />
                                <span>Pembaruan 2nd Anniversary JP meningkatkan bonus kemenangan G1 yang cocok menjadi <strong>+3 poin per balapan</strong> untuk tiap relasi indukan.</span>
                            </p>

                            <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => applyRacePreset('classic_triple_crown')}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-xs hover:bg-emerald-200 cursor-pointer"
                                >
                                    Classic Triple Crown
                                </button>
                                <button
                                    type="button"
                                    onClick={() => applyRacePreset('tiara_triple_crown')}
                                    className="px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-bold text-xs hover:bg-rose-200 cursor-pointer"
                                >
                                    Tiara Triple Crown
                                </button>
                                <button
                                    type="button"
                                    onClick={() => applyRacePreset('spring_senior_g1')}
                                    className="px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-bold text-xs hover:bg-indigo-200 cursor-pointer"
                                >
                                    Spring Senior G1
                                </button>
                                <button
                                    type="button"
                                    onClick={() => applyRacePreset('autumn_senior_g1')}
                                    className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold text-xs hover:bg-amber-200 cursor-pointer"
                                >
                                    Autumn Senior G1
                                </button>
                                <button
                                    type="button"
                                    onClick={() => applyRacePreset('dirt_g1')}
                                    className="px-2.5 py-1 rounded-lg bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 font-bold text-xs hover:bg-orange-200 cursor-pointer"
                                >
                                    Dirt G1
                                </button>
                                <button
                                    type="button"
                                    onClick={() => applyRacePreset('none')}
                                    className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-300 cursor-pointer ml-auto"
                                >
                                    Kosongkan
                                </button>
                            </div>
                        </div>

                        {/* Races Checkbox List */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
                            {Object.entries(raceCategories).map(([catKey, cat]) => (
                                <div key={catKey} className="space-y-2.5">
                                    <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                            {cat.category_name}
                                        </h4>
                                        <span className="text-[11px] text-slate-400">
                                            {cat.description}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {cat.races.map(race => {
                                            const isChecked = selectedRaces.includes(race.id);
                                            return (
                                                <label
                                                    key={race.id}
                                                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                                                        isChecked
                                                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-950 dark:text-emerald-100'
                                                            : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                                                    }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => toggleRace(race.id)}
                                                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-xs font-bold truncate flex items-center justify-between">
                                                            <span>{race.name_ja}</span>
                                                            <span className="text-[10px] text-slate-400 font-mono">
                                                                {race.surface} {race.distance}m
                                                            </span>
                                                        </div>
                                                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                                            {race.name_en} ({race.track})
                                                        </div>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                {selectedRaces.length} Balapan Dipilih (+{selectedRaces.length * 5 * pointsPerRace} potensi bonus silsilah)
                            </span>
                            <button
                                type="button"
                                onClick={() => setShowRaceSelector(false)}
                                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-md cursor-pointer"
                            >
                                Selesai
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 3: Best Parent Recommendations Modal */}
            {recModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-amber-500" />
                                    Rekomendasi Parent dari Koleksi Anda
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Menampilkan kombinasi 2 Parent terbaik dari karakter yang Anda miliki untuk target <b>{recTargetMeta?.name}</b>.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setRecModalOpen(false)}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Recommendations list */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {loadingRecs ? (
                                <div className="text-center py-12 text-slate-400 text-sm">
                                    Menganalisis kombinasi karakter koleksi...
                                </div>
                            ) : recommendations.length === 0 ? (
                                <div className="text-center py-12 text-slate-400 text-sm">
                                    Tidak ada rekomendasi parent yang cocok dari koleksi. Pastikan Anda memiliki setidaknya 2 karakter di menu Koleksi.
                                </div>
                            ) : (
                                recommendations.map((pair, idx) => (
                                    <div 
                                        key={idx}
                                        className="p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-emerald-500 transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            {/* Parent 1 Avatar */}
                                            <div className="flex items-center -space-x-3">
                                                <img 
                                                    src={pair.parent1.image_url || '/placeholder-uma.png'}
                                                    alt={pair.parent1.name}
                                                    className="w-12 h-12 rounded-2xl object-cover border-2 border-white dark:border-slate-900 bg-slate-100"
                                                    onError={(e) => { e.currentTarget.src = 'https://gametora.com/images/umamusume/ui/arrow_plus.png'; }}
                                                />
                                                <img 
                                                    src={pair.parent2.image_url || '/placeholder-uma.png'}
                                                    alt={pair.parent2.name}
                                                    className="w-12 h-12 rounded-2xl object-cover border-2 border-white dark:border-slate-900 bg-slate-100"
                                                    onError={(e) => { e.currentTarget.src = 'https://gametora.com/images/umamusume/ui/arrow_plus.png'; }}
                                                />
                                            </div>

                                            <div>
                                                <div className="text-xs font-bold text-slate-900 dark:text-white">
                                                    {pair.parent1.name} & {pair.parent2.name}
                                                </div>
                                                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                                                    <span>Target-P1: <b>{pair.breakdown.target_p1}</b></span>
                                                    <span>•</span>
                                                    <span>Target-P2: <b>{pair.breakdown.target_p2}</b></span>
                                                    <span>•</span>
                                                    <span>P1-P2: <b>{pair.breakdown.p1_p2}</b></span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                                            <div className="text-right">
                                                <div className="text-base font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1 justify-end">
                                                    <span>{pair.total_base_score}</span>
                                                    <span className="text-xs font-bold text-slate-400">Poin Dasar</span>
                                                </div>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                                                    Badge {pair.badge.symbol}
                                                </span>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => applyRecommendationPair(pair.parent1, pair.parent2)}
                                                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
                                            >
                                                Gunakan
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 4: Career Run Sync Modal */}
            {careerSyncOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden">
                        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-emerald-500" />
                                    Pilih dari Riwayat Karier Anda
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Gunakan data Uma dari log Career Runs Anda untuk mengisi slot silsilah secara otomatis.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCareerSyncOpen(false)}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                            {loadingCareerRuns ? (
                                <div className="text-center py-12 text-slate-400 text-sm">
                                    Memuat catatan karier...
                                </div>
                            ) : careerRuns.length === 0 ? (
                                <div className="text-center py-12 text-slate-400 text-sm">
                                    Belum ada log catatan karier tersimpan.
                                </div>
                            ) : (
                                careerRuns.map(run => (
                                    <div 
                                        key={run.id}
                                        className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-3 text-xs"
                                    >
                                        <div>
                                            <div className="font-bold text-slate-900 dark:text-white">
                                                {run.uma_name}
                                            </div>
                                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                                Rank: <span className="font-bold text-emerald-600 dark:text-emerald-400">{run.final_rank}</span> ({run.evaluation_score?.toLocaleString()} poin) • {run.run_date}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => handleSyncRunToSlot(run, 'parent1')}
                                                className="px-2 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-bold text-[10px] hover:bg-indigo-200 cursor-pointer"
                                            >
                                                P1
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleSyncRunToSlot(run, 'parent2')}
                                                className="px-2 py-1 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-bold text-[10px] hover:bg-rose-200 cursor-pointer"
                                            >
                                                P2
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleSyncRunToSlot(run, 'target')}
                                                className="px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] hover:bg-emerald-200 cursor-pointer"
                                            >
                                                Target
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Subcomponent: SlotCard for visual tree
function SlotCard({ 
    slotKey, 
    char, 
    label, 
    isCenter = false, 
    isSmall = false, 
    relationScore, 
    relationLabel, 
    conflict = false,
    conflictReason = null,
    onSelect, 
    onClear 
}) {
    if (!char) {
        return (
            <div 
                onClick={onSelect}
                className={`relative group rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-white dark:bg-slate-800/50 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-all cursor-pointer flex flex-col items-center justify-center p-3 text-center ${
                    isCenter ? 'w-48 sm:w-56 h-36' : isSmall ? 'w-full h-28' : 'w-44 sm:w-52 h-32'
                }`}
            >
                <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:scale-110 transition-transform mb-1.5">
                    <Plus className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {label}
                </div>
                <div className="text-[10px] text-slate-400">
                    Pilih Karakter
                </div>
            </div>
        );
    }

    return (
        <div 
            onClick={onSelect}
            className={`relative rounded-3xl border transition-all cursor-pointer flex flex-col items-center justify-center p-3 text-center group ${
                conflict
                    ? 'border-rose-500 ring-2 ring-rose-500/50 bg-rose-50/60 dark:bg-rose-950/40 shadow-sm shadow-rose-500/10'
                    : isCenter 
                    ? 'border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-400 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md ring-2 ring-emerald-500/20' 
                    : 'border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-400 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md'
            } ${
                isCenter 
                    ? 'w-48 sm:w-56 h-36' 
                    : isSmall 
                    ? 'w-full h-28' 
                    : 'w-44 sm:w-52 h-32'
            }`}
        >
            {/* Clear Button */}
            <button
                type="button"
                onClick={onClear}
                className="absolute top-2 right-2 p-1 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                title="Hapus slot ini"
            >
                <X className="w-3.5 h-3.5" />
            </button>

            {/* Avatar */}
            <div className="relative mb-1.5 shrink-0">
                <img 
                    src={char.image_url || char.thumb || '/placeholder-uma.png'} 
                    alt={char.name}
                    className={`rounded-2xl object-cover bg-slate-100 dark:bg-slate-700 ${
                        isSmall ? 'w-10 h-10' : 'w-12 h-12'
                    } ${conflict ? 'ring-2 ring-rose-500' : ''}`}
                    onError={(e) => { e.currentTarget.src = 'https://gametora.com/images/umamusume/ui/arrow_plus.png'; }}
                />
                {char.is_owned && !conflict && (
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[9px] shadow-xs">
                        ✓
                    </span>
                )}
                {conflict && (
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[9px] shadow-xs font-black">
                        !
                    </span>
                )}
            </div>

            {/* Names */}
            <div className="w-full px-1">
                <div className={`text-xs font-bold truncate ${conflict ? 'text-rose-900 dark:text-rose-200' : 'text-slate-900 dark:text-white'}`}>
                    {char.name}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {char.title || char.raw_data?.title_en_gl || ''}
                </div>
            </div>

            {/* Conflict or Relation Badge */}
            {conflict ? (
                <div className="mt-1 px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/80 text-rose-800 dark:text-rose-200 font-bold text-[9px] border border-rose-300 dark:border-rose-700 flex items-center gap-1 justify-center truncate max-w-full" title={conflictReason}>
                    <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate">{conflictReason}</span>
                </div>
            ) : (
                typeof relationScore === 'number' && relationScore > 0 && (
                    <div className="mt-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[9px] border border-emerald-300 dark:border-emerald-800">
                        +{relationScore} poin
                    </div>
                )
            )}
        </div>
    );
}
