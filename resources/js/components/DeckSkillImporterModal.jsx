import React, { useState, useEffect, useMemo } from 'react';
import {
    X,
    Search,
    CheckSquare,
    Square,
    Layers,
    Sparkles,
    Award,
    Zap,
    BookOpen,
    Filter,
    Flame,
    Lock,
    Unlock,
    ArrowRight,
    RefreshCw,
    Check,
    User
} from 'lucide-react';
import rawSkillsCatalog from '../data/ratingSkillsCatalog.json';
import { calculateDiscountedSkillCost } from '../utils/skillOptimizerHelper';
import { calculateSkillRating } from '../utils/ratingCalculatorHelper';

// Build rapid lookup index for catalog skills
const catalogById = new Map();
const catalogByNameEn = new Map();
const catalogByNameJa = new Map();

rawSkillsCatalog.forEach(sk => {
    if (sk.id) catalogById.set(String(sk.id), sk);
    if (sk.name_en) catalogByNameEn.set(sk.name_en.toLowerCase().trim(), sk);
    if (sk.name_ja) catalogByNameJa.set(sk.name_ja.trim(), sk);
});

function enrichSkillWithCatalog(sk, fallbackRarity = 'Normal') {
    const byId = sk.id ? catalogById.get(String(sk.id)) : null;
    const byEn = sk.name || sk.name_en ? catalogByNameEn.get(String(sk.name || sk.name_en).toLowerCase().trim()) : null;
    const byJa = sk.name_jp || sk.name_ja ? catalogByNameJa.get(String(sk.name_jp || sk.name_ja).trim()) : null;
    const match = byId || byEn || byJa;

    const isGold = sk.is_gold || sk.rarity === 2 || sk.rarity_label === 'Gold' || sk.rarity_label === 'Rare' || (match && match.type === 'Gold');
    const isEvo = sk.is_evo || sk.rarity === 'Evolution' || (match && match.is_evo);

    const baseCost = match?.base_cost ?? match?.cost ?? (isGold ? 160 : 160);
    const score = match?.score ?? (isGold ? 508 : (isEvo ? 508 : 129));
    const iconId = match?.icon_id ?? sk.icon_id;
    const iconUrl = match?.icon_url ?? sk.icon_url ?? (iconId ? `https://gametora.com/images/umamusume/skill_icons/utx_ico_skill_${iconId}.png` : null);

    return {
        ...sk,
        id: match?.id ?? sk.id ?? Math.floor(Math.random() * 1000000),
        name_en: match?.name_en || sk.name || sk.name_en || 'Unknown Skill',
        name_ja: match?.name_ja || sk.name_jp || sk.name_ja || '',
        score,
        base_cost: baseCost,
        cost: baseCost,
        type: match?.type || (isEvo ? 'Evolution' : (isGold ? 'Gold' : 'Normal')),
        check_type: match?.check_type || null,
        prereq_id: match?.prereq_id ?? null,
        lower_id: match?.lower_id ?? null,
        icon_id: iconId,
        icon_url: iconUrl,
        is_gold: isGold,
        is_evo: isEvo,
    };
}

export default function DeckSkillImporterModal({
    isOpen,
    onClose,
    onImportToCalculator,
    onImportToOptimizer,
    activeCharacter = null,
    raceConfig = {},
    initialDeckSkills = null,
}) {
    if (!isOpen) return null;

    // Presets & Cards State
    const [presets, setPresets] = useState([]);
    const [loadingPresets, setLoadingPresets] = useState(false);
    const [selectedPresetId, setSelectedPresetId] = useState('active'); // 'active' or preset.id
    const [supportCards, setSupportCards] = useState([]);
    const [charactersList, setCharactersList] = useState([]);
    const [selectedChar, setSelectedChar] = useState(activeCharacter);

    // Filter & Search
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('all'); // 'all' | 'char' | 'gold' | 'hint' | 'event'

    // Extracted Skills Items State: array of items with { item, selected, hintLevel, isLocked }
    const [skillItems, setSkillItems] = useState([]);

    // Fetch presets, cards, and characters on mount
    useEffect(() => {
        let mounted = true;
        setLoadingPresets(true);

        Promise.all([
            fetch('/api/collection/deck-presets').then(r => r.json()).catch(() => []),
            fetch('/api/collection/support-cards').then(r => r.json()).catch(() => []),
            fetch('/api/collection/characters').then(r => r.json()).catch(() => [])
        ]).then(([presetsData, cardsData, charsData]) => {
            if (!mounted) return;
            const pList = Array.isArray(presetsData) ? presetsData : [];
            const cList = Array.isArray(cardsData) ? cardsData : (cardsData?.cards || []);
            const chList = Array.isArray(charsData) ? charsData : (charsData?.characters || []);

            setPresets(pList);
            setSupportCards(cList);
            setCharactersList(chList);

            if (pList.length > 0 && selectedPresetId === 'active' && !initialDeckSkills) {
                setSelectedPresetId(pList[0].id);
            }
        }).finally(() => {
            if (mounted) setLoadingPresets(false);
        });

        return () => {
            mounted = false;
        };
    }, []);

    // Helper: resolve card object from identifier
    const resolveCard = (identifier) => {
        if (!identifier || !supportCards.length) return null;
        return supportCards.find(c =>
            (c.id && c.id === identifier) ||
            (c.uma_catalog_item_id && c.uma_catalog_item_id === identifier) ||
            (c.gametora_id && c.gametora_id === identifier) ||
            c.name === identifier
        ) || null;
    };

    // Re-extract skills whenever selected preset, supportCards, selectedChar, or initialDeckSkills change
    useEffect(() => {
        const extracted = [];
        const seenSkillKeys = new Set();

        // 1. EXTRACT FROM CHARACTER (if selected)
        if (selectedChar) {
            const rawSkills = typeof selectedChar.skills === 'string'
                ? (() => { try { return JSON.parse(selectedChar.skills); } catch { return {}; } })()
                : (selectedChar.skills || {});

            const innate = rawSkills.innate || [];
            const awakening = rawSkills.awakening || [];
            const evolve = rawSkills.evolve || [];

            // Innate skills
            innate.forEach(sk => {
                const key = 'char_innate_' + (sk.id || sk.name || sk.name_en);
                if (!seenSkillKeys.has(key)) {
                    seenSkillKeys.add(key);
                    const enriched = enrichSkillWithCatalog(sk, 'Normal');
                    extracted.push({
                        id: key,
                        skill: enriched,
                        category: 'char',
                        subCategory: 'Innate',
                        sourceLabel: selectedChar.name,
                        defaultHintLevel: 0,
                        cardCount: 1,
                        is_gold: enriched.is_gold,
                        is_evo: false,
                    });
                }
            });

            // Awakening skills (Lv2 to Lv5)
            awakening.forEach(sk => {
                const isGold = sk.rarity === 2 || sk.level === 3 || sk.level === 5 || sk.is_gold;
                const key = 'char_awakening_' + (sk.id || sk.name || sk.name_en);
                if (!seenSkillKeys.has(key)) {
                    seenSkillKeys.add(key);
                    const enriched = enrichSkillWithCatalog({ ...sk, is_gold: isGold }, isGold ? 'Gold' : 'Normal');
                    extracted.push({
                        id: key,
                        skill: enriched,
                        category: 'char',
                        subCategory: `Awakening Lv.${sk.level || 3}`,
                        sourceLabel: selectedChar.name,
                        defaultHintLevel: 0,
                        cardCount: 1,
                        is_gold: isGold,
                        is_evo: false,
                    });
                }
            });

            // Evolved skills
            evolve.forEach(sk => {
                const key = 'char_evo_' + (sk.id || sk.name || sk.name_en);
                if (!seenSkillKeys.has(key)) {
                    seenSkillKeys.add(key);
                    const enriched = enrichSkillWithCatalog({ ...sk, is_evo: true }, 'Evolution');
                    extracted.push({
                        id: key,
                        skill: enriched,
                        category: 'char',
                        subCategory: 'Evolved',
                        sourceLabel: selectedChar.name,
                        defaultHintLevel: 0,
                        cardCount: 1,
                        is_gold: true,
                        is_evo: true,
                    });
                }
            });
        }

        // 2. EXTRACT FROM DECK CARDS (Active deck or chosen preset)
        let deckCards = [];
        if (selectedPresetId === 'active' && initialDeckSkills?.cards) {
            deckCards = initialDeckSkills.cards;
        } else {
            const currentPreset = presets.find(p => String(p.id) === String(selectedPresetId));
            if (currentPreset && Array.isArray(currentPreset.slots)) {
                deckCards = currentPreset.slots
                    .map(s => resolveCard(s.card_id) || resolveCard(s.gametora_id) || resolveCard(s.card_name))
                    .filter(Boolean);
            }
        }

        // Map to count hint occurrences across cards in deck
        const hintOccurrences = new Map();
        const hintCardSources = new Map();

        deckCards.forEach(card => {
            const details = card.details || {};
            const hintSkills = details.hints?.skills || [];
            hintSkills.forEach(sk => {
                const k = String(sk.id || sk.name || sk.name_en);
                hintOccurrences.set(k, (hintOccurrences.get(k) || 0) + 1);
                if (!hintCardSources.has(k)) hintCardSources.set(k, []);
                hintCardSources.get(k).push(card.name);
            });
        });

        // Add Deck Gold / Rare skills
        deckCards.forEach(card => {
            const details = card.details || {};
            const eventSkills = details.event_skills || [];

            eventSkills.forEach(sk => {
                const isGold = sk.rarity === 2 || sk.is_gold || sk.rarity_label === 'Gold' || sk.rarity_label === 'Rare';
                if (isGold) {
                    const key = 'deck_gold_' + (sk.id || sk.name || sk.name_en);
                    if (!seenSkillKeys.has(key)) {
                        seenSkillKeys.add(key);
                        const enriched = enrichSkillWithCatalog({ ...sk, is_gold: true }, 'Gold');
                        extracted.push({
                            id: key,
                            skill: enriched,
                            category: 'gold',
                            subCategory: 'Gold / Rare',
                            sourceLabel: card.name,
                            defaultHintLevel: 1,
                            cardCount: 1,
                            is_gold: true,
                            is_evo: false,
                        });
                    }
                }
            });
        });

        // Add Deck Hint skills
        deckCards.forEach(card => {
            const details = card.details || {};
            const hintSkills = details.hints?.skills || [];

            hintSkills.forEach(sk => {
                const k = String(sk.id || sk.name || sk.name_en);
                const count = hintOccurrences.get(k) || 1;
                const key = 'deck_hint_' + k;

                if (!seenSkillKeys.has(key)) {
                    seenSkillKeys.add(key);
                    const enriched = enrichSkillWithCatalog(sk, 'Normal');
                    // Grouping rule: count >= 2 => Lv3 with flame badge, else Lv2
                    const defaultLvl = count >= 2 ? 3 : 2;
                    extracted.push({
                        id: key,
                        skill: enriched,
                        category: 'hint',
                        subCategory: 'Hint Skill',
                        sourceLabel: (hintCardSources.get(k) || [card.name]).join(', '),
                        defaultHintLevel: defaultLvl,
                        cardCount: count,
                        is_gold: enriched.is_gold,
                        is_evo: false,
                    });
                }
            });
        });

        // Add Deck Event Normal/White skills
        deckCards.forEach(card => {
            const details = card.details || {};
            const eventSkills = details.event_skills || [];

            eventSkills.forEach(sk => {
                const isGold = sk.rarity === 2 || sk.is_gold || sk.rarity_label === 'Gold' || sk.rarity_label === 'Rare';
                if (!isGold) {
                    const key = 'deck_event_' + (sk.id || sk.name || sk.name_en);
                    if (!seenSkillKeys.has(key)) {
                        seenSkillKeys.add(key);
                        const enriched = enrichSkillWithCatalog(sk, 'Normal');
                        extracted.push({
                            id: key,
                            skill: enriched,
                            category: 'event',
                            subCategory: 'Event Normal',
                            sourceLabel: card.name,
                            defaultHintLevel: 1,
                            cardCount: 1,
                            is_gold: false,
                            is_evo: false,
                        });
                    }
                }
            });
        });

        // Initialize state wrapper
        const items = extracted.map(ext => ({
            ...ext,
            selected: true, // Default checked
            hintLevel: ext.defaultHintLevel,
            isLocked: ext.is_gold || ext.category === 'char', // Default lock gold & character skills
        }));

        setSkillItems(items);
    }, [selectedPresetId, supportCards, selectedChar, presets, initialDeckSkills]);

    // Bulk selection actions
    const handleSelectAll = () => {
        setSkillItems(prev => prev.map(it => ({ ...it, selected: true })));
    };

    const handleSelectGoldAndCharOnly = () => {
        setSkillItems(prev => prev.map(it => ({
            ...it,
            selected: it.category === 'char' || it.category === 'gold' || it.is_gold,
        })));
    };

    const handleResetSelection = () => {
        setSkillItems(prev => prev.map(it => ({ ...it, selected: false })));
    };

    // Toggle individual selection
    const handleToggleSelect = (id) => {
        setSkillItems(prev => prev.map(it => it.id === id ? { ...it, selected: !it.selected } : it));
    };

    // Toggle lock
    const handleToggleLock = (id) => {
        setSkillItems(prev => prev.map(it => it.id === id ? { ...it, isLocked: !it.isLocked } : it));
    };

    // Change hint level
    const handleChangeHint = (id, lvl) => {
        setSkillItems(prev => prev.map(it => it.id === id ? { ...it, hintLevel: parseInt(lvl, 10) } : it));
    };

    // Filter items
    const filteredItems = useMemo(() => {
        let list = skillItems;
        if (activeCategory !== 'all') {
            list = list.filter(it => it.category === activeCategory);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(it =>
                it.skill.name_en.toLowerCase().includes(q) ||
                it.skill.name_ja.toLowerCase().includes(q) ||
                it.sourceLabel.toLowerCase().includes(q)
            );
        }
        return list;
    }, [skillItems, activeCategory, searchQuery]);

    // Category Counts
    const counts = useMemo(() => {
        const c = { all: skillItems.length, char: 0, gold: 0, hint: 0, event: 0 };
        skillItems.forEach(it => {
            if (c[it.category] !== undefined) c[it.category]++;
        });
        return c;
    }, [skillItems]);

    const selectedCount = skillItems.filter(it => it.selected).length;

    // Handle Import to Rating Calculator
    const handleConfirmToCalculator = () => {
        const chosen = skillItems
            .filter(it => it.selected)
            .map(it => it.skill);

        if (chosen.length === 0) {
            alert('Pilih minimal 1 skill untuk diimpor!');
            return;
        }

        onImportToCalculator?.(chosen);
        onClose();
    };

    // Handle Import to Skill Optimizer
    const handleConfirmToOptimizer = () => {
        const candidates = skillItems
            .filter(it => it.selected)
            .map(it => ({
                ...it.skill,
                hintLevel: it.hintLevel,
                isLocked: it.isLocked,
                sourceCategory: it.category,
                sourceLabel: it.sourceLabel,
            }));

        if (candidates.length === 0) {
            alert('Pilih minimal 1 skill kandidat untuk optimizer!');
            return;
        }

        onImportToOptimizer?.(candidates);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
                {/* MODAL HEADER */}
                <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
                            <Layers className="w-5 h-5 text-slate-950" />
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                                <span>🃏 Impor Cepat Skill dari Preset Deck 6 Kartu & Karakter</span>
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    Server JP
                                </span>
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Muat skill bawaan/awakening karakter dan kartu support deck ke Kalkulator Proyeksi Rating atau Skill Optimizer.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* CONTROLS BAR: PRESET SELECTOR & CHARACTER SELECTOR */}
                <div className="p-4 border-b border-slate-800 bg-slate-900/90 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Preset Selector */}
                    <div>
                        <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                            <span>Pilih Preset Formasi Deck:</span>
                        </label>
                        <select
                            value={selectedPresetId}
                            onChange={e => setSelectedPresetId(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                        >
                            {initialDeckSkills && (
                                <option value="active">🌟 Deck Aktif Saat Ini ({initialDeckSkills.cards?.length || 6} Kartu)</option>
                            )}
                            {presets.map(p => (
                                <option key={p.id} value={p.id}>
                                    📋 {p.name} ({p.scenario || 'Default'}) • {(p.slots || []).length} Kartu
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Character Selector */}
                    <div>
                        <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-pink-400" />
                            <span>Pilih Karakter Trainee (Aptitude & Awakening):</span>
                        </label>
                        <select
                            value={selectedChar?.name || ''}
                            onChange={e => {
                                const found = charactersList.find(c => c.name === e.target.value);
                                setSelectedChar(found || null);
                            }}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 cursor-pointer"
                        >
                            <option value="">-- Tanpa Karakter Khusus --</option>
                            {charactersList.map(c => (
                                <option key={c.name} value={c.name}>
                                    🌸 {c.name} (★{c.current_stars || c.base_stars || 3})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* CATEGORY TABS & SEARCH & BULK ACTIONS */}
                <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Category Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                        <button
                            type="button"
                            onClick={() => setActiveCategory('all')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
                                activeCategory === 'all'
                                    ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                                    : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            Semua ({counts.all})
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveCategory('char')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                                activeCategory === 'char'
                                    ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
                                    : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <span>🌸 Karakter ({counts.char})</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveCategory('gold')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                                activeCategory === 'gold'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <span>🌟 Gold Deck ({counts.gold})</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveCategory('hint')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                                activeCategory === 'hint'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <span>💡 Hint Skills ({counts.hint})</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveCategory('event')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                                activeCategory === 'event'
                                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                                    : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <span>⚡ Event Skills ({counts.event})</span>
                        </button>
                    </div>

                    {/* Search & Bulk buttons */}
                    <div className="flex items-center gap-2">
                        <div className="relative w-full sm:w-48">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Cari skill / kartu..."
                                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                            />
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                            <button
                                type="button"
                                onClick={handleSelectAll}
                                className="px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
                                title="Pilih Semua Skill"
                            >
                                Pilih Semua
                            </button>
                            <button
                                type="button"
                                onClick={handleSelectGoldAndCharOnly}
                                className="px-2 py-1 rounded-lg text-[11px] font-bold bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30"
                                title="Hanya Gold & Karakter"
                            >
                                Gold & Karakter
                            </button>
                            <button
                                type="button"
                                onClick={handleResetSelection}
                                className="px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-800 text-slate-400 hover:text-rose-400"
                                title="Reset Pilihan"
                            >
                                Reset
                            </button>
                        </div>
                    </div>
                </div>

                {/* SKILLS LIST TABLE / CARDS */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 divide-y divide-slate-800/40">
                    {filteredItems.length === 0 ? (
                        <div className="py-12 text-center text-slate-500">
                            <p className="text-sm font-semibold">Tidak ada skill yang cocok dengan filter atau preset ini.</p>
                            <p className="text-xs text-slate-600 mt-1">Pastikan preset deck terisi atau pilih karakter di atas.</p>
                        </div>
                    ) : (
                        filteredItems.map(item => {
                            const sk = item.skill;
                            const ratingGain = calculateSkillRating(sk, raceConfig);
                            const discountedCost = calculateDiscountedSkillCost(sk.base_cost, item.hintLevel, false);

                            return (
                                <div
                                    key={item.id}
                                    className={`pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl transition-all ${
                                        item.selected
                                            ? 'bg-slate-950/60 border border-slate-800 shadow-sm'
                                            : 'opacity-50 hover:opacity-80 bg-slate-950/20'
                                    }`}
                                >
                                    {/* Left: Checkbox, Icon, Name, Source Badge */}
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <button
                                            type="button"
                                            onClick={() => handleToggleSelect(item.id)}
                                            className="cursor-pointer text-emerald-400 hover:text-emerald-300 shrink-0"
                                        >
                                            {item.selected ? (
                                                <CheckSquare className="w-5 h-5 text-emerald-400" />
                                            ) : (
                                                <Square className="w-5 h-5 text-slate-600" />
                                            )}
                                        </button>

                                        {sk.icon_url ? (
                                            <img
                                                src={sk.icon_url}
                                                alt=""
                                                className="w-9 h-9 rounded-xl object-contain bg-slate-900 border border-slate-700 shrink-0"
                                                loading="lazy"
                                                onError={e => { e.currentTarget.style.display = 'none'; }}
                                            />
                                        ) : (
                                            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                                                <Zap className="w-4 h-4 text-slate-400" />
                                            </div>
                                        )}

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className="text-xs sm:text-sm font-bold text-white truncate" title={`${sk.name_en} (${sk.name_ja})`}>
                                                    {sk.name_en}
                                                </h4>
                                                {item.is_evo && (
                                                    <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-pink-500/20 text-pink-300 border border-pink-500/40">
                                                        Evolution
                                                    </span>
                                                )}
                                                {item.is_gold && !item.is_evo && (
                                                    <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                                        Gold / Rare
                                                    </span>
                                                )}
                                                {item.cardCount >= 2 && (
                                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                                                        <Flame className="w-3 h-3 text-rose-400 animate-pulse" />
                                                        {item.cardCount} Kartu di Deck (Lv. 3)
                                                    </span>
                                                )}
                                            </div>

                                            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 truncate">
                                                <span className="text-slate-300 font-medium truncate max-w-[220px]" title={item.sourceLabel}>
                                                    {item.subCategory}: {item.sourceLabel}
                                                </span>
                                                {sk.name_ja && (
                                                    <span className="text-slate-500 font-mono text-[10px] truncate">
                                                        {sk.name_ja}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Hint Level, Cost, Rating Gain, Lock toggle */}
                                    <div className="flex items-center gap-3 shrink-0 justify-between sm:justify-end">
                                        {/* Hint Level selector */}
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[11px] font-bold text-slate-400">Hint:</span>
                                            <select
                                                value={item.hintLevel}
                                                onChange={e => handleChangeHint(item.id, e.target.value)}
                                                disabled={!item.selected}
                                                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-emerald-400 focus:outline-none focus:border-emerald-500 cursor-pointer disabled:opacity-40"
                                            >
                                                {[0, 1, 2, 3, 4, 5].map(lv => (
                                                    <option key={lv} value={lv}>Lv.{lv}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Cost */}
                                        <div className="text-right min-w-[70px]">
                                            <span className="text-xs font-mono font-bold text-amber-400 block">
                                                {discountedCost} Pt
                                            </span>
                                            {item.hintLevel > 0 && (
                                                <span className="text-[10px] text-slate-500 line-through">
                                                    {sk.base_cost} Pt
                                                </span>
                                            )}
                                        </div>

                                        {/* Rating Gain */}
                                        <div className="text-right min-w-[65px]">
                                            <span className="text-xs font-black text-emerald-400 block">
                                                +{ratingGain}
                                            </span>
                                            <span className="text-[10px] text-slate-400">
                                                skor
                                            </span>
                                        </div>

                                        {/* Lock Toggle (for Optimizer) */}
                                        <button
                                            type="button"
                                            onClick={() => handleToggleLock(item.id)}
                                            disabled={!item.selected}
                                            className={`p-1.5 rounded-lg border transition-colors ${
                                                item.isLocked
                                                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                                                    : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
                                            } disabled:opacity-40`}
                                            title={item.isLocked ? 'Skill Dikunci (Wajib Diambil Optimizer)' : 'Kunci Skill untuk Optimizer'}
                                        >
                                            {item.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* MODAL FOOTER */}
                <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs text-slate-400">
                        Dipilih: <span className="font-bold text-emerald-400">{selectedCount}</span> dari {skillItems.length} skill
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        >
                            Batal
                        </button>

                        <button
                            type="button"
                            onClick={handleConfirmToCalculator}
                            disabled={selectedCount === 0}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/40 hover:border-emerald-500 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Tambahkan skill yang dipilih langsung ke daftar kalkulator manual"
                        >
                            <ArrowRight className="w-4 h-4" />
                            <span>📥 Tambahkan ke Kalkulator Rating</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleConfirmToOptimizer}
                            disabled={selectedCount === 0}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 shadow-lg shadow-amber-500/20 transition-all transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Kirim skill terpilih sebagai pool kandidat ke Skill Optimizer"
                        >
                            <Sparkles className="w-4 h-4 text-slate-950" />
                            <span>⚡ Kirim ke Skill Optimizer (Kandidat)</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
