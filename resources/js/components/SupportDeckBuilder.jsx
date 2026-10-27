import React, { useState, useEffect, useMemo } from 'react';
import { 
    Layers, 
    Plus, 
    X, 
    RotateCcw, 
    Save, 
    FolderOpen, 
    Trash2, 
    AlertTriangle, 
    CheckCircle2, 
    Search, 
    Crown, 
    Filter, 
    ExternalLink, 
    Shield, 
    Zap, 
    BookOpen, 
    Info, 
    Sparkles, 
    Check, 
    SlidersHorizontal,
    Heart,
    Flame,
    Trophy
} from 'lucide-react';
import { 
    SUPPORT_EFFECTS_MAP, 
    getEffectDef, 
    formatSupportUniqueEffect 
} from '../utils/supportUniqueEffectFormatter';

const SCENARIOS = [
    'The Shuntaisai Festival',
    'Tracen-ken',
    'Beyond Dreams',
    'Yukoma Onsen',
    'Design Your Island',
    'The Twinkle Legends',
    'Mecha Uma Musume',
    'Great Food Festival',
    'U.A.F. Ready GO!',
    "Project L'Arc",
    'Grand Masters',
    'Grand Live',
    'Make a New Track (Twinkle Star Climax)',
    'Aoharu Hai',
    'URA Finals',
];

const LB_KEYS = ['0lb', '1lb', '2lb', '3lb', 'mlb'];
const LB_LABELS = ['0LB', '1LB', '2LB', '3LB', '4LB (MLB)'];

const CARD_TYPE_COLORS = {
    Speed: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-400/40',
    Stamina: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-400/40',
    Power: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-400/40',
    Guts: 'bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-400/40',
    Wit: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-400/40',
    Friend: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-400/40',
    Group: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-400/40',
};

const CARD_TYPE_BADGES = {
    Speed: '⚡ Speed',
    Stamina: '💙 Stamina',
    Power: '💪 Power',
    Guts: '🔥 Guts',
    Wit: '🧠 Wit',
    Friend: '🤝 Friend',
    Group: '👥 Group',
};

// Initial state for 6 slots
const createInitialSlots = () => [
    { slot_index: 0, card: null, limit_break: 4, is_friend: false },
    { slot_index: 1, card: null, limit_break: 4, is_friend: false },
    { slot_index: 2, card: null, limit_break: 4, is_friend: false },
    { slot_index: 3, card: null, limit_break: 4, is_friend: false },
    { slot_index: 4, card: null, limit_break: 4, is_friend: false },
    { slot_index: 5, card: null, limit_break: 4, is_friend: true },
];

export default function SupportDeckBuilder({ 
    supportCards = [], 
    onOpenSupportCard, 
    onOpenSkillDetail, 
    onNotify 
}) {
    const [slots, setSlots] = useState(createInitialSlots);
    const [presets, setPresets] = useState([]);
    const [loadingPresets, setLoadingPresets] = useState(false);
    const [savingPreset, setSavingPreset] = useState(false);

    // Preset Form State
    const [presetName, setPresetName] = useState('');
    const [presetScenario, setPresetScenario] = useState('The Shuntaisai Festival');
    const [presetNotes, setPresetNotes] = useState('');
    const [editingPresetId, setEditingPresetId] = useState(null);

    // Modals
    const [activeSelectSlot, setActiveSelectSlot] = useState(null); // null or slotIndex (0..5)
    const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);

    // Active sub-tab
    const [activeTab, setActiveTab] = useState('effects'); // 'effects' | 'unique' | 'skills'

    // Sub-filters
    const [effectSearch, setEffectSearch] = useState('');
    const [skillSearch, setSkillSearch] = useState('');
    const [skillFilterTab, setSkillFilterTab] = useState('all'); // 'all' | 'gold' | 'hint' | 'event'

    // Load saved presets from backend API on mount
    const fetchPresets = async () => {
        setLoadingPresets(true);
        try {
            const res = await fetch('/api/collection/deck-presets');
            const data = await res.json();
            if (Array.isArray(data)) {
                setPresets(data);
            }
        } catch (err) {
            console.error('Failed to load deck presets:', err);
        } finally {
            setLoadingPresets(false);
        }
    };

    useEffect(() => {
        fetchPresets();
    }, []);

    // Helper: Find full card in supportCards
    const resolveCard = (identifier) => {
        if (!identifier) return null;
        return supportCards.find(c => 
            (c.id && c.id === identifier) ||
            (c.uma_catalog_item_id && c.uma_catalog_item_id === identifier) ||
            (c.gametora_id && c.gametora_id === identifier) ||
            c.name === identifier
        ) || null;
    };

    // Slot actions
    const handleSetSlotCard = (slotIndex, card) => {
        if (!card) return;
        const fullCard = resolveCard(card.id || card.uma_catalog_item_id || card.name) || card;
        
        // Prevent duplicate card already in another slot
        const duplicateSlotIndex = slots.findIndex(s => 
            s.slot_index !== slotIndex && 
            s.card && 
            (s.card.name === fullCard.name || (s.card.gametora_id && s.card.gametora_id === fullCard.gametora_id))
        );

        if (duplicateSlotIndex !== -1) {
            onNotify?.(`Kartu "${fullCard.name}" sudah terpasang di Slot ${duplicateSlotIndex + 1}!`, 'error');
            return;
        }

        const isFriendSlot = slotIndex === 5;
        // Default LB: 4 (MLB) for friend slot, or user's owned LB level (default 4 if not owned)
        const defaultLb = isFriendSlot ? 4 : (fullCard.is_owned ? (fullCard.limit_break ?? 4) : 4);

        setSlots(prev => prev.map(s => {
            if (s.slot_index === slotIndex) {
                return {
                    ...s,
                    card: fullCard,
                    limit_break: defaultLb,
                    is_friend: isFriendSlot,
                };
            }
            return s;
        }));
        setActiveSelectSlot(null);
    };

    const handleClearSlot = (slotIndex) => {
        setSlots(prev => prev.map(s => {
            if (s.slot_index === slotIndex) {
                return {
                    ...s,
                    card: null,
                    limit_break: 4,
                };
            }
            return s;
        }));
    };

    const handleSetSlotLb = (slotIndex, lb) => {
        setSlots(prev => prev.map(s => {
            if (s.slot_index === slotIndex) {
                return { ...s, limit_break: lb };
            }
            return s;
        }));
    };

    const handleResetAllSlots = () => {
        setSlots(createInitialSlots());
        setEditingPresetId(null);
        setPresetName('');
        setPresetNotes('');
        onNotify?.('Seluruh slot deck telah dikosongkan.', 'info');
    };

    // Save current deck as preset
    const handleSavePreset = async (e) => {
        e?.preventDefault();
        const trimmed = presetName.trim();
        if (!trimmed) {
            onNotify?.('Harap masukkan nama preset deck!', 'error');
            return;
        }

        const filledCount = slots.filter(s => s.card).length;
        if (filledCount === 0) {
            onNotify?.('Pilih minimal 1 kartu support sebelum menyimpan preset deck!', 'error');
            return;
        }

        setSavingPreset(true);
        try {
            const payload = {
                id: editingPresetId || undefined,
                name: trimmed,
                scenario: presetScenario,
                notes: presetNotes,
                slots: slots.map(s => ({
                    slot_index: s.slot_index,
                    card_id: s.card?.id || s.card?.uma_catalog_item_id || null,
                    gametora_id: s.card?.gametora_id || null,
                    card_name: s.card?.name || null,
                    limit_break: s.limit_break ?? 4,
                    is_friend: Boolean(s.is_friend),
                })),
            };

            const res = await fetch('/api/collection/deck-presets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (data.success) {
                onNotify?.(data.message || 'Preset deck berhasil disimpan!', 'success');
                setEditingPresetId(data.preset?.id || null);
                fetchPresets();
            } else {
                throw new Error(data.message || 'Gagal menyimpan preset deck');
            }
        } catch (err) {
            onNotify?.(err.message, 'error');
        } finally {
            setSavingPreset(false);
        }
    };

    // Load preset into slots
    const handleLoadPreset = (preset) => {
        if (!preset || !Array.isArray(preset.slots)) return;

        const newSlots = createInitialSlots();
        preset.slots.forEach(slotData => {
            const idx = slotData.slot_index;
            if (idx >= 0 && idx < 6) {
                const found = resolveCard(slotData.card_id) || 
                              resolveCard(slotData.gametora_id) || 
                              resolveCard(slotData.card_name);
                newSlots[idx] = {
                    slot_index: idx,
                    card: found,
                    limit_break: slotData.limit_break ?? 4,
                    is_friend: idx === 5 || Boolean(slotData.is_friend),
                };
            }
        });

        setSlots(newSlots);
        setEditingPresetId(preset.id);
        setPresetName(preset.name || '');
        setPresetScenario(preset.scenario || 'The Shuntaisai Festival');
        setPresetNotes(preset.notes || '');
        setIsPresetModalOpen(false);
        onNotify?.(`Preset deck "${preset.name}" berhasil dimuat!`, 'success');
    };

    // Delete preset
    const handleDeletePreset = async (presetId) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus preset deck ini?')) return;
        try {
            const res = await fetch(`/api/collection/deck-presets/${presetId}`, {
                method: 'DELETE',
                headers: { 'Accept': 'application/json' },
            });
            const data = await res.json();
            if (data.success) {
                onNotify?.('Preset deck berhasil dihapus.', 'success');
                if (editingPresetId === presetId) {
                    setEditingPresetId(null);
                }
                fetchPresets();
            } else {
                throw new Error(data.message || 'Gagal menghapus preset deck');
            }
        } catch (err) {
            onNotify?.(err.message, 'error');
        }
    };

    // Character duplication check across slots
    const duplicateCharWarnings = useMemo(() => {
        const charCount = {};
        slots.forEach(s => {
            if (s.card && s.card.char_name) {
                const char = s.card.char_name;
                charCount[char] = (charCount[char] || 0) + 1;
            }
        });

        return Object.entries(charCount)
            .filter(([_, count]) => count > 1)
            .map(([char, count]) => ({ char, count }));
    }, [slots]);

    // Active types in deck for Type 103 evaluation
    const activeDeckTypes = useMemo(() => {
        const set = new Set();
        slots.forEach(s => {
            if (s.card?.card_type) {
                set.add(s.card.card_type);
            }
        });
        return set;
    }, [slots]);

    // =========================================================================
    // SECTION 3 CALCULATIONS: BAGIAN A & BAGIAN B
    // =========================================================================

    // Bagian A: HANYA 4 Stat Ini yang Dijumlahkan
    // 1) Race Bonus (ID 15)
    // 2) Fan Bonus (ID 16)
    // 3) Total Initial Stats (ID 9, 10, 11, 12, 13)
    // 4) Initial Skill Points Up (ID 32)
    const accumulatedStats = useMemo(() => {
        let raceBonus = 0;
        let fanBonus = 0;
        let initialSpeed = 0;
        let initialStamina = 0;
        let initialPower = 0;
        let initialGuts = 0;
        let initialWit = 0;
        let initialSkillPt = 0;

        slots.forEach(slot => {
            if (!slot.card) return;
            const lbKey = LB_KEYS[slot.limit_break ?? 4] || 'mlb';
            const effectsTable = slot.card.details?.effects_table || [];

            effectsTable.forEach(eff => {
                const id = Number(eff.id);
                const val = Number(eff.levels?.[lbKey] || 0);

                if (id === 15 || eff.name_en === 'Race Bonus') {
                    raceBonus += val;
                } else if (id === 16 || eff.name_en === 'Fan Bonus') {
                    fanBonus += val;
                } else if (id === 9 || eff.name_en === 'Initial Speed') {
                    initialSpeed += val;
                } else if (id === 10 || eff.name_en === 'Initial Stamina') {
                    initialStamina += val;
                } else if (id === 11 || eff.name_en === 'Initial Power') {
                    initialPower += val;
                } else if (id === 12 || eff.name_en === 'Initial Guts') {
                    initialGuts += val;
                } else if (id === 13 || eff.name_en === 'Initial Wit') {
                    initialWit += val;
                } else if (id === 32 || eff.name_en === 'Initial Skill Points Up' || eff.name_en === 'Effect 32') {
                    initialSkillPt += val;
                }
            });
        });

        const totalInitialStats = initialSpeed + initialStamina + initialPower + initialGuts + initialWit;

        return {
            raceBonus,
            fanBonus,
            initialSpeed,
            initialStamina,
            initialPower,
            initialGuts,
            initialWit,
            totalInitialStats,
            initialSkillPt,
        };
    }, [slots]);

    // Bagian B: Rincian Efek Latihan Lainnya (Baris Terpisah Berurutan, TANPA Dijumlahkan)
    const separatedEffectsGrouped = useMemo(() => {
        // Excluded IDs from Bagian A
        const excludedIds = new Set([9, 10, 11, 12, 13, 15, 16, 32]);
        const groupMap = new Map();

        slots.forEach(slot => {
            if (!slot.card) return;
            const lbKey = LB_KEYS[slot.limit_break ?? 4] || 'mlb';
            const effectsTable = slot.card.details?.effects_table || [];

            effectsTable.forEach(eff => {
                const id = Number(eff.id);
                if (excludedIds.has(id)) return;

                const val = Number(eff.levels?.[lbKey] || 0);
                if (val <= 0) return;

                const def = getEffectDef(id);
                const nameEn = def.name_en || eff.name_en || `Effect ${id}`;
                const nameId = def.name_id || eff.name_ja || nameEn;
                const symbol = eff.symbol === 'percent' ? '%' : (def.symbol || '');

                const key = String(id || nameEn);
                if (!groupMap.has(key)) {
                    groupMap.set(key, {
                        id,
                        name_en: nameEn,
                        name_id: nameId,
                        symbol,
                        cards: [],
                    });
                }

                groupMap.get(key).cards.push({
                    slot_index: slot.slot_index,
                    is_friend: slot.is_friend,
                    card_name: slot.card.name,
                    char_name: slot.card.char_name,
                    card_type: slot.card.card_type,
                    rarity: slot.card.rarity,
                    image_url: slot.card.image_url,
                    limit_break: slot.limit_break,
                    value: val,
                    symbol,
                });
            });
        });

        // Filter by effectSearch if provided
        let list = Array.from(groupMap.values());
        if (effectSearch.trim()) {
            const q = effectSearch.toLowerCase();
            list = list.filter(g => 
                g.name_en.toLowerCase().includes(q) || 
                g.name_id.toLowerCase().includes(q) ||
                g.cards.some(c => c.card_name?.toLowerCase().includes(q) || c.char_name?.toLowerCase().includes(q))
            );
        }

        // Sort groups: Friendship Bonus (1), Training Effectiveness (8), Specialty Priority (19), Stat Bonuses (3..7), then others
        const priorityOrder = [1, 8, 2, 19, 3, 4, 5, 6, 7, 30, 17, 18, 14, 28, 25, 26, 27, 31];
        list.sort((a, b) => {
            const idxA = priorityOrder.indexOf(a.id);
            const idxB = priorityOrder.indexOf(b.id);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.name_en.localeCompare(b.name_en);
        });

        return list;
    }, [slots, effectSearch]);

    // =========================================================================
    // SECTION 4: DECK UNIQUE EFFECT VALIDATOR
    // =========================================================================
    const uniqueEffectsDeckList = useMemo(() => {
        return slots.map(slot => {
            if (!slot.card) return null;

            const card = slot.card;
            const rawUnique = card.raw_unique || card.details?.raw_unique || null;
            const formattedUe = formatSupportUniqueEffect(card.details?.unique_effect, rawUnique, card.card_type);

            // Condition evaluation
            let conditionStatus = null; // { type: 'deck_type' | 'runtime' | 'unconditional', satisfied: boolean, text: string, current: number, target: number }

            // Check if Type 103 (Deck Diversity)
            const rawType = Number(rawUnique?.type || 0);
            if (rawType === 103 || (formattedUe?.condition_id && formattedUe.condition_id.includes('Jenis Kartu'))) {
                const reqCount = Number(rawUnique?.value || 4);
                const currentTypesCount = activeDeckTypes.size;
                const satisfied = currentTypesCount >= reqCount;
                conditionStatus = {
                    type: 'deck_type',
                    satisfied,
                    current: currentTypesCount,
                    target: reqCount,
                    text: satisfied 
                        ? `✅ Syarat Terpenuhi (${currentTypesCount}/${reqCount} Tipe Terpasang)` 
                        : `⚠️ Belum Terpenuhi (${currentTypesCount}/${reqCount} Tipe Terpasang - Butuh ${reqCount - currentTypesCount} lagi)`,
                };
            } else if (rawType === 105) {
                // Initial Stat Up per Card in deck
                const matchingCount = slots.filter(s => s.card?.card_type === card.card_type).length;
                conditionStatus = {
                    type: 'deck_type',
                    satisfied: true,
                    current: matchingCount,
                    target: 6,
                    text: `✅ Efek Berskala Deck (${matchingCount} Kartu ${card.card_type} di Deck)`,
                };
            } else if (formattedUe?.condition_id) {
                conditionStatus = {
                    type: 'runtime',
                    satisfied: false,
                    text: '⚡ Aktif Saat Sesi Latihan',
                };
            }

            return {
                slot_index: slot.slot_index,
                is_friend: slot.is_friend,
                limit_break: slot.limit_break,
                card,
                formattedUe,
                conditionStatus,
            };
        }).filter(Boolean);
    }, [slots, activeDeckTypes]);

    // =========================================================================
    // SECTION 5: DECK SKILLS AGGREGATOR
    // =========================================================================
    const aggregatedSkills = useMemo(() => {
        const skillMap = new Map();

        slots.forEach(slot => {
            if (!slot.card) return;
            const card = slot.card;
            const details = card.details || {};

            // 1. Hint Skills
            const hintSkills = details.hints?.skills || [];
            hintSkills.forEach(sk => {
                const key = String(sk.id || sk.name || sk.name_en || sk.name_jp);
                if (!skillMap.has(key)) {
                    skillMap.set(key, {
                        ...sk,
                        is_gold: false,
                        is_hint: true,
                        is_event: false,
                        provided_by: [],
                    });
                }
                const entry = skillMap.get(key);
                entry.is_hint = true;
                if (!entry.provided_by.some(p => p.slot_index === slot.slot_index && p.source_type === 'hint')) {
                    entry.provided_by.push({
                        slot_index: slot.slot_index,
                        card_name: card.name,
                        char_name: card.char_name,
                        image_url: card.image_url,
                        source_type: 'hint',
                        hint_level: sk.level || 1,
                    });
                }
            });

            // 2. Event Skills (Gold vs Normal)
            const eventSkills = details.event_skills || [];
            eventSkills.forEach(sk => {
                const isGold = sk.rarity === 2 || sk.is_gold || sk.rarity_label === 'Gold' || sk.rarity_label === 'Rare';
                const key = String(sk.id || sk.name || sk.name_en || sk.name_jp);
                if (!skillMap.has(key)) {
                    skillMap.set(key, {
                        ...sk,
                        is_gold: isGold,
                        is_hint: false,
                        is_event: true,
                        provided_by: [],
                    });
                }
                const entry = skillMap.get(key);
                if (isGold) entry.is_gold = true;
                entry.is_event = true;
                if (!entry.provided_by.some(p => p.slot_index === slot.slot_index && p.source_type === (isGold ? 'gold_event' : 'event'))) {
                    entry.provided_by.push({
                        slot_index: slot.slot_index,
                        card_name: card.name,
                        char_name: card.char_name,
                        image_url: card.image_url,
                        source_type: isGold ? 'gold_event' : 'event',
                    });
                }
            });
        });

        let list = Array.from(skillMap.values());

        // Apply Tab Filter
        if (skillFilterTab === 'gold') {
            list = list.filter(s => s.is_gold);
        } else if (skillFilterTab === 'hint') {
            list = list.filter(s => s.is_hint);
        } else if (skillFilterTab === 'event') {
            list = list.filter(s => s.is_event && !s.is_gold);
        }

        // Apply Search Filter
        if (skillSearch.trim()) {
            const q = skillSearch.toLowerCase();
            list = list.filter(s => 
                (s.name && s.name.toLowerCase().includes(q)) ||
                (s.name_en && s.name_en.toLowerCase().includes(q)) ||
                (s.name_jp && s.name_jp.toLowerCase().includes(q)) ||
                (s.description && s.description.toLowerCase().includes(q)) ||
                (s.desc_jp && s.desc_jp.toLowerCase().includes(q)) ||
                s.provided_by.some(p => p.card_name?.toLowerCase().includes(q) || p.char_name?.toLowerCase().includes(q))
            );
        }

        // Sort: Gold skills first, then most provided_by cards, then name
        list.sort((a, b) => {
            if (a.is_gold && !b.is_gold) return -1;
            if (!a.is_gold && b.is_gold) return 1;
            if (b.provided_by.length !== a.provided_by.length) {
                return b.provided_by.length - a.provided_by.length;
            }
            return (a.name || a.name_en || '').localeCompare(b.name || b.name_en || '');
        });

        return list;
    }, [slots, skillFilterTab, skillSearch]);

    const skillCounts = useMemo(() => {
        let gold = 0;
        let hint = 0;
        let event = 0;
        const seen = new Set();

        slots.forEach(slot => {
            if (!slot.card) return;
            const details = slot.card.details || {};
            (details.hints?.skills || []).forEach(sk => {
                const k = String(sk.id || sk.name || sk.name_en);
                if (!seen.has(k)) {
                    seen.add(k);
                    hint++;
                }
            });
            (details.event_skills || []).forEach(sk => {
                const isGold = sk.rarity === 2 || sk.is_gold || sk.rarity_label === 'Gold';
                const k = String(sk.id || sk.name || sk.name_en);
                if (!seen.has(k)) {
                    seen.add(k);
                    if (isGold) gold++;
                    else event++;
                }
            });
        });

        return { total: seen.size, gold, hint, event };
    }, [slots]);

    return (
        <div className="space-y-6">
            {/* Header & Preset Toolbar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <span className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-sm">
                                <Layers className="w-5 h-5" />
                            </span>
                            <div>
                                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                    <span>Simulasi Deck 6 Support Card</span>
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                        v3.0 Deck Builder
                                    </span>
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Simulasikan komposisi 5 kartu koleksi utama + 1 kartu pinjaman Friend MLB, pantau akumulasi bonus latihan, dan validasi syarat efek unik.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Deck Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            type="button"
                            onClick={() => setIsPresetModalOpen(true)}
                            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                            <FolderOpen className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            <span>Kelola Preset ({presets.length})</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleResetAllSlots}
                            className="px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Kosongkan Deck</span>
                        </button>
                    </div>
                </div>

                {/* Preset Save Bar */}
                <form onSubmit={handleSavePreset} className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1">
                        <input
                            type="text"
                            value={presetName}
                            onChange={(e) => setPresetName(e.target.value)}
                            placeholder="Beri nama preset deck (misal: Deck Speed-Wit Shuntaisai, Sprint Focus)..."
                            className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            maxLength={80}
                        />
                    </div>
                    <div className="w-full sm:w-56 shrink-0">
                        <select
                            value={presetScenario}
                            onChange={(e) => setPresetScenario(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                            {SCENARIOS.map(sc => (
                                <option key={sc} value={sc}>{sc}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        type="submit"
                        disabled={savingPreset}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 disabled:opacity-50 text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-amber-500/20 cursor-pointer shrink-0"
                    >
                        <Save className="w-3.5 h-3.5" />
                        <span>{savingPreset ? 'Menyimpan...' : (editingPresetId ? 'Perbarui Preset' : 'Simpan Preset')}</span>
                    </button>
                </form>
            </div>

            {/* Duplicate Character Warning Banner */}
            {duplicateCharWarnings.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                        <div className="font-black text-amber-950 dark:text-amber-300">
                            Peringatan Aturan Deck Game: Duplikasi Karakter Terdeteksi
                        </div>
                        <p className="leading-relaxed">
                            Terdeteksi lebih dari satu kartu dari karakter yang sama: 
                            <span className="font-black underline mx-1">
                                {duplicateCharWarnings.map(d => `${d.char} (${d.count}x)`).join(', ')}
                            </span>. 
                            Di dalam game Uma Musume, satu deck tidak boleh membawa lebih dari satu kartu support dari karakter yang sama.
                        </p>
                    </div>
                </div>
            )}

            {/* 6 SLOTS GRID (5 Main Slots + 1 Friend Slot) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
                {slots.map((slot, index) => {
                    const isFriend = slot.is_friend;
                    const card = slot.card;
                    const typeColor = card?.card_type ? (CARD_TYPE_COLORS[card.card_type] || 'bg-slate-500/10 text-slate-700 border-slate-300') : '';
                    const typeBadge = card?.card_type ? (CARD_TYPE_BADGES[card.card_type] || card.card_type) : null;

                    return (
                        <div
                            key={slot.slot_index}
                            className={`relative rounded-2xl border transition-all flex flex-col justify-between p-3 ${
                                isFriend
                                    ? 'bg-gradient-to-b from-amber-50/60 to-white dark:from-amber-950/20 dark:to-slate-900 border-amber-300/80 dark:border-amber-700/60 shadow-sm'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                            }`}
                        >
                            {/* Slot Header Badge */}
                            <div className="flex items-center justify-between mb-2">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                    isFriend 
                                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700' 
                                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                }`}>
                                    {isFriend ? <Crown className="w-2.5 h-2.5 text-amber-600" /> : null}
                                    <span>{isFriend ? 'Slot 6 (Friend MLB)' : `Slot ${index + 1}`}</span>
                                </span>

                                {card && (
                                    <button
                                        type="button"
                                        onClick={() => handleClearSlot(index)}
                                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                        title="Kosongkan slot ini"
                                        aria-label="Kosongkan slot kartu"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Slot Content: Empty vs Card Info */}
                            {card ? (
                                <div className="space-y-2.5">
                                    {/* Card Thumbnail & Basic Meta */}
                                    <div className="flex items-start gap-2.5">
                                        <div className="relative shrink-0 w-14 h-18 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
                                            {card.image_url ? (
                                                <img 
                                                    src={card.image_url} 
                                                    alt={card.name} 
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xs">
                                                    {card.rarity}
                                                </div>
                                            )}
                                            <span className="absolute top-1 left-1 px-1 rounded text-[8px] font-black bg-slate-900/80 text-white">
                                                {card.rarity}
                                            </span>
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="text-[10px] font-black text-slate-400 uppercase truncate">
                                                {card.char_name || 'Support'}
                                            </div>
                                            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-2 leading-tight" title={card.name}>
                                                {card.name}
                                            </div>
                                            {typeBadge && (
                                                <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold border ${typeColor}`}>
                                                    {typeBadge}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Limit Break Selector (0LB s.d. MLB) */}
                                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                                        <div className="text-[10px] font-bold text-slate-400 flex items-center justify-between">
                                            <span>Limit Break:</span>
                                            <span className="text-amber-600 dark:text-amber-400 font-black">
                                                {LB_LABELS[slot.limit_break]}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-5 gap-0.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
                                            {[0, 1, 2, 3, 4].map(lb => (
                                                <button
                                                    key={lb}
                                                    type="button"
                                                    onClick={() => handleSetSlotLb(index, lb)}
                                                    className={`py-1 text-[9px] font-black rounded transition-all cursor-pointer ${
                                                        slot.limit_break === lb
                                                            ? 'bg-amber-600 text-white shadow-xs'
                                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                                    }`}
                                                >
                                                    {lb === 4 ? 'MLB' : `${lb}`}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Action Buttons: Detail & Change */}
                                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => onOpenSupportCard?.(card)}
                                            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                        >
                                            <Search className="w-2.5 h-2.5" />
                                            <span>Detail</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveSelectSlot(index)}
                                            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                        >
                                            <RotateCcw className="w-2.5 h-2.5" />
                                            <span>Ganti</span>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setActiveSelectSlot(index)}
                                    className="my-auto py-8 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-500 dark:hover:border-amber-400 bg-slate-50/50 hover:bg-amber-50/30 dark:bg-slate-800/40 dark:hover:bg-amber-950/20 text-slate-500 hover:text-amber-700 dark:text-slate-400 dark:hover:text-amber-300 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer group"
                                >
                                    <div className="w-9 h-9 rounded-full bg-slate-200 group-hover:bg-amber-100 dark:bg-slate-700 dark:group-hover:bg-amber-900/40 flex items-center justify-center transition-colors">
                                        <Plus className="w-5 h-5 text-slate-600 group-hover:text-amber-600 dark:text-slate-300 dark:group-hover:text-amber-400" />
                                    </div>
                                    <span className="text-[11px] font-bold">
                                        {isFriend ? '+ Pinjam Friend MLB' : '+ Pilih Kartu'}
                                    </span>
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* TAB NAVIGATION: EFEL LATIHAN vs EFEK UNIK vs SKILL DECK */}
            <div className="flex bg-slate-100 dark:bg-slate-950/60 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 gap-1.5">
                <button
                    type="button"
                    onClick={() => setActiveTab('effects')}
                    className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        activeTab === 'effects'
                            ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm border border-slate-200 dark:border-slate-700'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <Flame className="w-4 h-4" />
                    <span>Efek Latihan (Training Effects)</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('unique')}
                    className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        activeTab === 'unique'
                            ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm border border-slate-200 dark:border-slate-700'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <Sparkles className="w-4 h-4" />
                    <span>Syarat Efek Unik Deck ({uniqueEffectsDeckList.length})</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('skills')}
                    className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        activeTab === 'skills'
                            ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-700'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <BookOpen className="w-4 h-4" />
                    <span>Daftar Skill Deck ({skillCounts.total})</span>
                </button>
            </div>

            {/* TAB CONTENT: 1. EFEK LATIHAN (BAGIAN A & BAGIAN B) */}
            {activeTab === 'effects' && (
                <div className="space-y-6">
                    {/* BAGIAN A: AKUMULASI EFEK LATIHAN (HANYA 4 STAT DIJUMLAHKAN) */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                    <span>Bagian A — Akumulasi Efek Latihan Utama</span>
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                        Total Dijumlahkan (4 Stat)
                                    </span>
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Hanya 4 efek berikut yang dihitung secara aditif/dijumlahkan dari seluruh kartu di dalam deck.
                                </p>
                            </div>
                        </div>

                        {/* 4 Cards Grid for Bagian A */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* 1. Race Bonus */}
                            <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-gradient-to-br from-amber-50/70 to-white dark:from-amber-950/20 dark:to-slate-900 space-y-1">
                                <div className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center justify-between">
                                    <span>Race Bonus (レースボーナス)</span>
                                    <Trophy className="w-4 h-4 text-amber-500" />
                                </div>
                                <div className="text-2xl font-black text-amber-950 dark:text-amber-100 font-mono">
                                    {accumulatedStats.raceBonus}%
                                </div>
                                <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                    {accumulatedStats.raceBonus >= 35 ? '✅ Sangat Efisien (≥ 35%)' : 'Rekomendasi minimal 35%'}
                                </div>
                            </div>

                            {/* 2. Fan Bonus */}
                            <div className="p-4 rounded-xl border border-sky-200 dark:border-sky-800/60 bg-gradient-to-br from-sky-50/70 to-white dark:from-sky-950/20 dark:to-slate-900 space-y-1">
                                <div className="text-xs font-bold text-sky-700 dark:text-sky-300 flex items-center justify-between">
                                    <span>Fan Bonus (ファン数ボーナス)</span>
                                    <Heart className="w-4 h-4 text-sky-500" />
                                </div>
                                <div className="text-2xl font-black text-sky-950 dark:text-sky-100 font-mono">
                                    {accumulatedStats.fanBonus}%
                                </div>
                                <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                    Peningkatan perolehan fans balapan
                                </div>
                            </div>

                            {/* 3. Total Initial Stats */}
                            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-gradient-to-br from-emerald-50/70 to-white dark:from-emerald-950/20 dark:to-slate-900 space-y-2">
                                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
                                    <span>Total Initial Stats (初期ステ)</span>
                                    <Sparkles className="w-4 h-4 text-emerald-500" />
                                </div>
                                <div className="text-2xl font-black text-emerald-950 dark:text-emerald-100 font-mono">
                                    +{accumulatedStats.totalInitialStats}
                                </div>
                                <div className="flex flex-wrap gap-1 text-[9px] font-black">
                                    {accumulatedStats.initialSpeed > 0 && (
                                        <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                                            Spd +{accumulatedStats.initialSpeed}
                                        </span>
                                    )}
                                    {accumulatedStats.initialStamina > 0 && (
                                        <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                            Sta +{accumulatedStats.initialStamina}
                                        </span>
                                    )}
                                    {accumulatedStats.initialPower > 0 && (
                                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                            Pow +{accumulatedStats.initialPower}
                                        </span>
                                    )}
                                    {accumulatedStats.initialGuts > 0 && (
                                        <span className="px-1.5 py-0.5 rounded bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300">
                                            Gut +{accumulatedStats.initialGuts}
                                        </span>
                                    )}
                                    {accumulatedStats.initialWit > 0 && (
                                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                            Wit +{accumulatedStats.initialWit}
                                        </span>
                                    )}
                                    {accumulatedStats.totalInitialStats === 0 && (
                                        <span className="text-slate-400">Tidak ada bonus stat awal</span>
                                    )}
                                </div>
                            </div>

                            {/* 4. Initial Skill Points Up */}
                            <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-gradient-to-br from-indigo-50/70 to-white dark:from-indigo-950/20 dark:to-slate-900 space-y-1">
                                <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center justify-between">
                                    <span>Initial Skill Pt (初期スキルPt)</span>
                                    <Zap className="w-4 h-4 text-indigo-500" />
                                </div>
                                <div className="text-2xl font-black text-indigo-950 dark:text-indigo-100 font-mono">
                                    +{accumulatedStats.initialSkillPt} Pt
                                </div>
                                <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                    Modal skill point di awal ikusei
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* BAGIAN B: RINCIAN EFEK LATIHAN LAINNYA (BARIS TERPISAH, TANPA DIJUMLAHKAN) */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                    <span>Bagian B — Rincian Efek Latihan per Kartu</span>
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                        Baris Terpisah Berurutan (Tidak Dijumlahkan)
                                    </span>
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Efek latihan multiplikatif dihitung independen per kejadian latihan oleh masing-masing kartu yang bertumpuk (Friendship, Specialty, Stat Bonus, dll.).
                                </p>
                            </div>

                            <div className="relative w-full sm:w-64">
                                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                                <input
                                    type="text"
                                    value={effectSearch}
                                    onChange={(e) => setEffectSearch(e.target.value)}
                                    placeholder="Filter efek latihan..."
                                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                            </div>
                        </div>

                        {/* List of Separated Groups */}
                        {separatedEffectsGrouped.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {separatedEffectsGrouped.map(group => (
                                    <div 
                                        key={group.id || group.name_en}
                                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-3.5 space-y-2.5"
                                    >
                                        <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
                                            <span className="font-black text-xs text-slate-900 dark:text-slate-100">
                                                {group.name_en}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400">
                                                {group.cards.length} Kartu
                                            </span>
                                        </div>

                                        {/* Individual Cards with Sequential Numbering (Friendship Bonus 1, 2, 3...) */}
                                        <div className="space-y-1.5">
                                            {group.cards.map((item, idx) => (
                                                <div 
                                                    key={`${item.slot_index}-${idx}`}
                                                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 shadow-2xs text-xs"
                                                >
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0">
                                                            {group.name_en} {idx + 1}
                                                        </span>
                                                        <div className="w-5 h-5 rounded overflow-hidden shrink-0 bg-slate-200">
                                                            {item.image_url && (
                                                                <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                                                            )}
                                                        </div>
                                                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate text-[11px]" title={item.card_name}>
                                                            {item.card_name}
                                                        </span>
                                                    </div>

                                                    <div className="shrink-0 font-mono font-black text-amber-600 dark:text-amber-400 text-xs">
                                                        {item.symbol === '' ? `+${item.value}` : `${item.value}${item.symbol}`}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-xs text-slate-400">
                                Belum ada kartu support yang terpasang di deck atau tidak ada efek yang cocok dengan pencarian.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB CONTENT: 2. SYARAT EFEK UNIK DECK */}
            {activeTab === 'unique' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                    <div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <span>Validasi Syarat Efek Unik Kartu Support Deck</span>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                                Evaluasi Otomatis
                            </span>
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Memeriksa apakah syarat komposisi kartu di dalam deck (seperti syarat minimal tipe kartu berbeda Tipe 103) telah terpenuhi.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {uniqueEffectsDeckList.map((item, idx) => {
                            const { card, slot_index, is_friend, limit_break, formattedUe, conditionStatus } = item;
                            const isSatisfied = conditionStatus?.satisfied;

                            return (
                                <div
                                    key={slot_index}
                                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 flex flex-col justify-between space-y-3"
                                >
                                    <div className="space-y-2">
                                        {/* Card Header in Unique */}
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-10 h-13 rounded-lg overflow-hidden shrink-0 bg-slate-200 dark:bg-slate-800 border">
                                                {card.image_url ? (
                                                    <img src={card.image_url} alt="" className="w-full h-full object-cover" />
                                                ) : null}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                        Slot {slot_index + 1} {is_friend ? '(Friend)' : ''}
                                                    </span>
                                                    <span className="text-[9px] font-black text-amber-600">
                                                        {LB_LABELS[limit_break]}
                                                    </span>
                                                </div>
                                                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                                                    {card.name}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Unique Effect Title & Description */}
                                        {formattedUe ? (
                                            <div className="space-y-1.5 pt-1">
                                                <div className="text-xs font-black text-purple-700 dark:text-purple-300">
                                                    {formattedUe.title_id || formattedUe.title_en || 'Efek Unik'}
                                                </div>
                                                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                                                    {formattedUe.desc_id || formattedUe.desc_en}
                                                </p>

                                                {/* Bonus Pills */}
                                                {formattedUe.bonuses?.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 pt-1">
                                                        {formattedUe.bonuses.map((b, bIdx) => (
                                                            <span 
                                                                key={bIdx}
                                                                className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-100 text-purple-900 dark:bg-purple-950/80 dark:text-purple-200 border border-purple-200 dark:border-purple-800/60"
                                                            >
                                                                {b.name_id || b.name_en}: {b.formatted || `+${b.value}${b.symbol}`}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-xs text-slate-400 italic">
                                                Kartu ini tidak memiliki efek unik (Raritas SR/R).
                                            </div>
                                        )}
                                    </div>

                                    {/* Evaluation Status Badge */}
                                    {conditionStatus && (
                                        <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black border ${
                                                conditionStatus.type === 'deck_type'
                                                    ? (isSatisfied 
                                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700' 
                                                        : 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700')
                                                    : 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700'
                                            }`}>
                                                {conditionStatus.text}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {uniqueEffectsDeckList.length === 0 && (
                            <div className="col-span-full p-8 text-center text-xs text-slate-400">
                                Belum ada kartu support yang terpasang di deck.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB CONTENT: 3. DAFTAR SKILL DECK */}
            {activeTab === 'skills' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <span>Agregasi Seluruh Skill Deck</span>
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                    {aggregatedSkills.length} Skill Ditemukan
                                </span>
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Kumpulan seluruh skill Gold/Rare, Hint, dan Event dari ke-6 kartu di deck. Klik untuk membuka detail formula & kondisi.
                            </p>
                        </div>

                        {/* Search Filter */}
                        <div className="relative w-full sm:w-64">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                            <input
                                type="text"
                                value={skillSearch}
                                onChange={(e) => setSkillSearch(e.target.value)}
                                placeholder="Cari nama skill..."
                                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                    </div>

                    {/* Skill Sub-tabs */}
                    <div className="flex gap-2 border-b border-slate-100 dark:border-slate-800 pb-2 flex-wrap">
                        <button
                            type="button"
                            onClick={() => setSkillFilterTab('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                skillFilterTab === 'all'
                                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            Semua ({skillCounts.total})
                        </button>
                        <button
                            type="button"
                            onClick={() => setSkillFilterTab('gold')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                skillFilterTab === 'gold'
                                    ? 'bg-amber-600 text-white'
                                    : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                            }`}
                        >
                            <span>🌟 Gold / Rare</span>
                            <span className="font-mono">({skillCounts.gold})</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setSkillFilterTab('hint')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                skillFilterTab === 'hint'
                                    ? 'bg-sky-600 text-white'
                                    : 'text-sky-700 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40'
                            }`}
                        >
                            <span>💡 Hint Skills</span>
                            <span className="font-mono">({skillCounts.hint})</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setSkillFilterTab('event')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                skillFilterTab === 'event'
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                            }`}
                        >
                            <span>⚡ Event Skills</span>
                            <span className="font-mono">({skillCounts.event})</span>
                        </button>
                    </div>

                    {/* Skill List Grid */}
                    {aggregatedSkills.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {aggregatedSkills.map((sk, idx) => {
                                const isGold = sk.is_gold;
                                const multipleSources = sk.provided_by.length >= 2;

                                return (
                                    <div
                                        key={`${sk.id || sk.name}-${idx}`}
                                        onClick={() => onOpenSkillDetail?.(sk)}
                                        className={`p-3.5 rounded-xl border transition-all cursor-pointer hover:shadow-sm flex flex-col justify-between gap-2.5 ${
                                            isGold
                                                ? 'bg-gradient-to-br from-amber-50/70 to-white dark:from-amber-950/30 dark:to-slate-900 border-amber-300 dark:border-amber-700/80 hover:border-amber-400'
                                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                        }`}
                                    >
                                        <div className="space-y-1.5">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                                                        {sk.icon_url ? (
                                                            <img src={sk.icon_url} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <BookOpen className="w-4 h-4 text-slate-400" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-black text-slate-900 dark:text-slate-100 line-clamp-1">
                                                            {sk.name || sk.name_en || 'Skill'}
                                                        </div>
                                                        {sk.name_jp && (
                                                            <div className="text-[10px] text-slate-400 truncate">
                                                                {sk.name_jp}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black shrink-0 ${
                                                    isGold
                                                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-200 border border-amber-300'
                                                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                                }`}>
                                                    {isGold ? 'Gold / Rare' : 'Normal / White'}
                                                </span>
                                            </div>

                                            <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                                                {sk.description || sk.desc_jp || 'Klik untuk melihat formula dan kondisi aktivasi.'}
                                            </p>
                                        </div>

                                        {/* Provided By Deck Cards */}
                                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="font-bold text-slate-400">Dari:</span>
                                                {sk.provided_by.map((p, pIdx) => (
                                                    <span 
                                                        key={pIdx}
                                                        className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1"
                                                        title={`${p.card_name} (Slot ${p.slot_index + 1})`}
                                                    >
                                                        <span>Slot {p.slot_index + 1}</span>
                                                        <span className="text-slate-400 font-normal">({p.source_type === 'gold_event' ? 'Gold Event' : (p.source_type === 'hint' ? 'Hint' : 'Event')})</span>
                                                    </span>
                                                ))}
                                            </div>

                                            {multipleSources && (
                                                <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-black shrink-0">
                                                    🔥 {sk.provided_by.length} Kartu
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-xs text-slate-400">
                            Tidak ada skill yang cocok dengan pencarian atau filter tab saat ini.
                        </div>
                    )}
                </div>
            )}

            {/* ========================================================================= */}
            {/* CARD SELECT MODAL (SLOT 1..5 vs SLOT 6 FRIEND)                            */}
            {/* ========================================================================= */}
            {activeSelectSlot !== null && (
                <CardSelectModal
                    slotIndex={activeSelectSlot}
                    isFriendSlot={activeSelectSlot === 5}
                    allCards={supportCards}
                    currentSlots={slots}
                    onClose={() => setActiveSelectSlot(null)}
                    onSelectCard={(card) => handleSetSlotCard(activeSelectSlot, card)}
                />
            )}

            {/* ========================================================================= */}
            {/* PRESET MANAGEMENT MODAL                                                   */}
            {/* ========================================================================= */}
            {isPresetModalOpen && (
                <PresetManageModal
                    presets={presets}
                    currentEditingId={editingPresetId}
                    supportCards={supportCards}
                    onClose={() => setIsPresetModalOpen(false)}
                    onLoadPreset={handleLoadPreset}
                    onDeletePreset={handleDeletePreset}
                />
            )}
        </div>
    );
}

// =============================================================================
// SUBCOMPONENT: CARD SELECT MODAL
// =============================================================================
function CardSelectModal({ 
    slotIndex, 
    isFriendSlot, 
    allCards = [], 
    currentSlots = [], 
    onClose, 
    onSelectCard 
}) {
    const [search, setSearch] = useState('');
    const [onlyOwned, setOnlyOwned] = useState(!isFriendSlot);
    const [typeFilter, setTypeFilter] = useState('all');
    const [rarityFilter, setRarityFilter] = useState('all');

    // Prevent body scroll
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Cards currently used in other slots
    const usedCardNames = useMemo(() => {
        const map = new Map();
        currentSlots.forEach(s => {
            if (s.slot_index !== slotIndex && s.card) {
                map.set(s.card.name, s.slot_index + 1);
            }
        });
        return map;
    }, [currentSlots, slotIndex]);

    // Filter cards
    const filteredCards = useMemo(() => {
        let list = allCards;

        if (onlyOwned && !isFriendSlot) {
            list = list.filter(c => c.is_owned);
        }

        if (typeFilter !== 'all') {
            list = list.filter(c => c.card_type === typeFilter);
        }

        if (rarityFilter !== 'all') {
            list = list.filter(c => c.rarity === rarityFilter);
        }

        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(c => 
                (c.name && c.name.toLowerCase().includes(q)) ||
                (c.char_name && c.char_name.toLowerCase().includes(q))
            );
        }

        return list;
    }, [allCards, onlyOwned, isFriendSlot, typeFilter, rarityFilter, search]);

    return (
        <div 
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
            style={{ overscrollBehavior: 'contain' }}
        >
            <div 
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
                style={{ overscrollBehavior: 'contain' }}
            >
                {/* Modal Header */}
                <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <span className={`p-2 rounded-xl text-white ${isFriendSlot ? 'bg-amber-600' : 'bg-slate-900 dark:bg-slate-700'}`}>
                            {isFriendSlot ? <Crown className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
                        </span>
                        <div>
                            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
                                {isFriendSlot ? 'Pilih Kartu Pinjaman Friend (Slot 6 - MLB)' : `Pilih Kartu Support (Slot ${slotIndex + 1})`}
                            </h3>
                            <p className="text-[11px] text-slate-500">
                                {isFriendSlot ? 'Seluruh katalog terbuka secara otomatis pada level MLB (4LB).' : 'Pilih kartu koleksi Anda atau jelajahi katalog.'}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        aria-label="Tutup pemilih kartu"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Filter Toolbar */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                    <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Cari nama kartu atau karakter (misal: Kitasan Black, Fine Motion)..."
                                className="w-full pl-10 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                        </div>

                        {!isFriendSlot && (
                            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setOnlyOwned(true)}
                                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                        onlyOwned 
                                            ? 'bg-amber-600 text-white shadow-xs' 
                                            : 'text-slate-600 dark:text-slate-400'
                                    }`}
                                >
                                    Hanya Koleksi Saya
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setOnlyOwned(false)}
                                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                        !onlyOwned 
                                            ? 'bg-amber-600 text-white shadow-xs' 
                                            : 'text-slate-600 dark:text-slate-400'
                                    }`}
                                >
                                    Semua Katalog
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Type and Rarity Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                        <span className="text-[11px] font-bold text-slate-400 shrink-0">Tipe:</span>
                        {['all', 'Speed', 'Stamina', 'Power', 'Guts', 'Wit', 'Friend', 'Group'].map(t => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setTypeFilter(t)}
                                className={`px-2.5 py-1 rounded-lg font-bold shrink-0 text-[11px] transition-all cursor-pointer ${
                                    typeFilter === t
                                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                }`}
                            >
                                {t === 'all' ? 'Semua Tipe' : (CARD_TYPE_BADGES[t] || t)}
                            </button>
                        ))}

                        <span className="text-[11px] font-bold text-slate-400 shrink-0 ml-2">Rarity:</span>
                        {['all', 'SSR', 'SR', 'R'].map(r => (
                            <button
                                key={r}
                                type="button"
                                onClick={() => setRarityFilter(r)}
                                className={`px-2.5 py-1 rounded-lg font-bold shrink-0 text-[11px] transition-all cursor-pointer ${
                                    rarityFilter === r
                                        ? 'bg-amber-600 text-white'
                                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                }`}
                            >
                                {r === 'all' ? 'Semua' : r}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Cards Grid */}
                <div 
                    className="p-4 sm:p-5 overflow-y-auto max-h-[60vh] space-y-2"
                    style={{ overscrollBehavior: 'contain' }}
                >
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {filteredCards.map(card => {
                            const isUsed = usedCardNames.has(card.name);
                            const usedSlot = usedCardNames.get(card.name);
                            const typeColor = CARD_TYPE_COLORS[card.card_type] || 'bg-slate-100 text-slate-700';

                            return (
                                <div
                                    key={card.id || card.uma_catalog_item_id || card.name}
                                    className={`relative rounded-xl border p-2 flex flex-col justify-between transition-all ${
                                        isUsed
                                            ? 'opacity-40 bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                                            : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700/80 hover:border-amber-500 hover:shadow-md cursor-pointer'
                                    }`}
                                    onClick={() => {
                                        if (!isUsed) onSelectCard(card);
                                    }}
                                >
                                    <div>
                                        <div className="relative aspect-3/4 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 border mb-2">
                                            {card.image_url ? (
                                                <img 
                                                    src={card.image_url} 
                                                    alt="" 
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-400">
                                                    {card.rarity}
                                                </div>
                                            )}

                                            <span className="absolute top-1 left-1 px-1.5 py-0.2 rounded text-[9px] font-black bg-slate-900/80 text-white">
                                                {card.rarity}
                                            </span>

                                            {card.is_owned && !isFriendSlot && (
                                                <span className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-600 text-white shadow-2xs">
                                                    {card.is_mlb ? 'MLB' : `${card.limit_break}LB`}
                                                </span>
                                            )}
                                        </div>

                                        <div className="text-[10px] font-black text-slate-400 truncate">
                                            {card.char_name || 'Support'}
                                        </div>
                                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-2 leading-tight" title={card.name}>
                                            {card.name}
                                        </div>
                                    </div>

                                    <div className="mt-2 pt-1 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[9px]">
                                        <span className={`px-1.5 py-0.5 rounded font-bold border ${typeColor}`}>
                                            {card.card_type}
                                        </span>

                                        {isUsed ? (
                                            <span className="font-bold text-rose-500">
                                                Slot {usedSlot}
                                            </span>
                                        ) : (
                                            <span className="text-amber-600 dark:text-amber-400 font-bold">
                                                Pilih ➜
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {filteredCards.length === 0 && (
                        <div className="p-8 text-center text-xs text-slate-400">
                            Tidak ada kartu support yang sesuai dengan filter pencarian.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// SUBCOMPONENT: PRESET MANAGE MODAL
// =============================================================================
function PresetManageModal({ 
    presets = [], 
    currentEditingId, 
    supportCards = [], 
    onClose, 
    onLoadPreset, 
    onDeletePreset 
}) {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const resolveThumb = (cardId, cardName) => {
        if (!cardId && !cardName) return null;
        const found = supportCards.find(c => 
            (c.id && c.id === cardId) ||
            (c.uma_catalog_item_id && c.uma_catalog_item_id === cardId) ||
            c.name === cardName
        );
        return found?.image_url || null;
    };

    return (
        <div 
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
            style={{ overscrollBehavior: 'contain' }}
        >
            <div 
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
                style={{ overscrollBehavior: 'contain' }}
            >
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="p-2 rounded-xl bg-amber-600 text-white">
                            <FolderOpen className="w-4 h-4" />
                        </span>
                        <div>
                            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
                                Daftar Preset Deck Tersimpan
                            </h3>
                            <p className="text-[11px] text-slate-500">
                                Muat atau hapus preset deck support card Anda.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        aria-label="Tutup daftar preset"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Preset List */}
                <div 
                    className="p-4 sm:p-5 overflow-y-auto max-h-[60vh] space-y-3"
                    style={{ overscrollBehavior: 'contain' }}
                >
                    {presets.length > 0 ? (
                        presets.map(p => {
                            const isCurrent = currentEditingId === p.id;

                            return (
                                <div
                                    key={p.id}
                                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                                        isCurrent
                                            ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/80 shadow-xs'
                                            : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:border-slate-300'
                                    }`}
                                >
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                                                {p.name}
                                            </span>
                                            {p.scenario && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-300">
                                                    {p.scenario}
                                                </span>
                                            )}
                                            {isCurrent && (
                                                <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-amber-500 text-white">
                                                    Aktif di Builder
                                                </span>
                                            )}
                                        </div>

                                        {/* 6 mini card thumbnails */}
                                        <div className="flex items-center gap-1.5">
                                            {(p.slots || []).map((s, idx) => {
                                                const thumb = resolveThumb(s.card_id, s.card_name);
                                                const isFriend = idx === 5 || Boolean(s.is_friend);

                                                return (
                                                    <div 
                                                        key={idx}
                                                        className={`relative w-8 h-10 rounded-md overflow-hidden border ${
                                                            isFriend 
                                                                ? 'border-amber-400 bg-amber-50 dark:bg-amber-950' 
                                                                : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800'
                                                        }`}
                                                        title={s.card_name || `Slot ${idx + 1}`}
                                                    >
                                                        {thumb ? (
                                                            <img src={thumb} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-[8px] text-slate-400">
                                                                {idx + 1}
                                                            </div>
                                                        )}
                                                        {isFriend && (
                                                            <Crown className="w-2 h-2 text-amber-500 absolute top-0.5 right-0.5" />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {p.notes && (
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 italic">
                                                {p.notes}
                                            </p>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => onLoadPreset(p)}
                                            className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                                        >
                                            <FolderOpen className="w-3.5 h-3.5" />
                                            <span>Muat Deck</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onDeletePreset(p.id)}
                                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                            title="Hapus preset ini"
                                            aria-label="Hapus preset ini"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-8 text-center text-xs text-slate-400">
                            Belum ada preset deck yang tersimpan. Simpan deck saat ini menggunakan panel di atas.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
