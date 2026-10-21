import React, { useState, useEffect, useMemo } from 'react';
import { formatSupportUniqueEffect } from '../utils/supportUniqueEffectFormatter';
import {
    X,
    Sparkles,
    Zap,
    Layers,
    ArrowRightLeft,
    CheckCircle2,
    Search,
    ChevronDown,
    Plus,
    Minus,
    HelpCircle,
    Info,
    Trophy,
    RefreshCw
} from 'lucide-react';

const LB_KEYS = [
    { key: '0lb', label: '0LB', levelIdx: 0 },
    { key: '1lb', label: '1LB', levelIdx: 1 },
    { key: '2lb', label: '2LB', levelIdx: 2 },
    { key: '3lb', label: '3LB', levelIdx: 3 },
    { key: 'mlb', label: 'MLB', levelIdx: 4 },
];

function getTypeColor(type) {
    const lower = (type || '').toLowerCase();
    switch (lower) {
        case 'speed': return 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border-sky-300';
        case 'stamina': return 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300';
        case 'power': return 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300';
        case 'guts': return 'bg-pink-100 text-pink-800 dark:bg-pink-950/80 dark:text-pink-300 border-pink-300';
        case 'wit':
        case 'intelligence': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300';
        case 'friend': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/80 dark:text-yellow-300 border-yellow-300';
        case 'group': return 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border-purple-300';
        default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300';
    }
}

export default function SupportCardCompareModal({
    cardA,
    cardB,
    isOpen,
    onClose,
    allCards = [],
    onSelectCardA,
    onSelectCardB,
    onSkillDetail
}) {
    if (!isOpen || !cardA) return null;

    const lbKeyMap = ['0lb', '1lb', '2lb', '3lb', 'mlb'];

    // Initial limit break states
    const [lbA, setLbA] = useState(() => (cardA?.is_owned ? lbKeyMap[cardA.limit_break || 0] : 'mlb'));
    const [lbB, setLbB] = useState(() => (cardB?.is_owned ? lbKeyMap[cardB.limit_break || 0] : 'mlb'));

    // Details state
    const [detailsA, setDetailsA] = useState(cardA?.details || null);
    const [detailsB, setDetailsB] = useState(cardB?.details || null);
    const [loadingA, setLoadingA] = useState(false);
    const [loadingB, setLoadingB] = useState(false);

    // Dropdown selectors
    const [selectorAOpen, setSelectorAOpen] = useState(false);
    const [selectorBOpen, setSelectorBOpen] = useState(false);
    const [searchA, setSearchA] = useState('');
    const [searchB, setSearchB] = useState('');

    // Active sub-tab
    const [activeTab, setActiveTab] = useState('effects'); // 'effects' | 'unique' | 'skills'

    // Reset / update on card change
    useEffect(() => {
        if (cardA) {
            setLbA(cardA.is_owned ? lbKeyMap[cardA.limit_break || 0] : 'mlb');
            setDetailsA(cardA.details || null);
            if (!cardA.details?.effects_table || cardA.details.effects_table.length === 0) {
                const queryId = cardA.uma_catalog_item_id || cardA.gametora_id || cardA.id;
                if (queryId) {
                    setLoadingA(true);
                    fetch(`/api/collection/support-cards/detail?id=${encodeURIComponent(queryId)}`)
                        .then(r => r.json())
                        .then(data => {
                            if (data.success && data.card?.details) {
                                setDetailsA(data.card.details);
                            }
                        })
                        .catch(err => console.error('Fetch Card A error:', err))
                        .finally(() => setLoadingA(false));
                }
            }
        }
    }, [cardA]);

    useEffect(() => {
        if (cardB) {
            setLbB(cardB.is_owned ? lbKeyMap[cardB.limit_break || 0] : 'mlb');
            setDetailsB(cardB.details || null);
            if (!cardB.details?.effects_table || cardB.details.effects_table.length === 0) {
                const queryId = cardB.uma_catalog_item_id || cardB.gametora_id || cardB.id;
                if (queryId) {
                    setLoadingB(true);
                    fetch(`/api/collection/support-cards/detail?id=${encodeURIComponent(queryId)}`)
                        .then(r => r.json())
                        .then(data => {
                            if (data.success && data.card?.details) {
                                setDetailsB(data.card.details);
                            }
                        })
                        .catch(err => console.error('Fetch Card B error:', err))
                        .finally(() => setLoadingB(false));
                }
            }
        }
    }, [cardB]);

    // Keyboard ESC listener
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose?.();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Merged effects list
    const mergedEffects = useMemo(() => {
        const effectsMap = new Map();

        const tableA = detailsA?.effects_table || [];
        const tableB = detailsB?.effects_table || [];

        tableA.forEach((eff) => {
            const key = eff.id ? String(eff.id) : (eff.name_en || eff.name_ja);
            effectsMap.set(key, {
                id: eff.id,
                name_en: eff.name_en === 'Effect 32' || eff.id === 32 ? 'Initial Skill Points Up' : (eff.name_en || `Effect ${eff.id}`),
                name_ja: eff.name_ja || '',
                desc_en: eff.desc_en || '',
                symbol: eff.symbol === 'percent' ? '%' : '',
                valA: eff.levels?.[lbA] ?? 0,
                valB: 0,
                hasA: true,
                hasB: false,
            });
        });

        tableB.forEach((eff) => {
            const key = eff.id ? String(eff.id) : (eff.name_en || eff.name_ja);
            if (effectsMap.has(key)) {
                const item = effectsMap.get(key);
                item.valB = eff.levels?.[lbB] ?? 0;
                item.hasB = true;
            } else {
                effectsMap.set(key, {
                    id: eff.id,
                    name_en: eff.name_en === 'Effect 32' || eff.id === 32 ? 'Initial Skill Points Up' : (eff.name_en || `Effect ${eff.id}`),
                    name_ja: eff.name_ja || '',
                    desc_en: eff.desc_en || '',
                    symbol: eff.symbol === 'percent' ? '%' : '',
                    valA: 0,
                    valB: eff.levels?.[lbB] ?? 0,
                    hasA: false,
                    hasB: true,
                });
            }
        });

        return Array.from(effectsMap.values());
    }, [detailsA, detailsB, lbA, lbB]);

    // Filter cards for quick selection dropdown
    const availableCardsA = useMemo(() => {
        if (!searchA.trim()) return allCards.slice(0, 50);
        const q = searchA.toLowerCase();
        return allCards.filter(c => c.name?.toLowerCase().includes(q) || c.char_name?.toLowerCase().includes(q)).slice(0, 50);
    }, [allCards, searchA]);

    const availableCardsB = useMemo(() => {
        if (!searchB.trim()) return allCards.slice(0, 50);
        const q = searchB.toLowerCase();
        return allCards.filter(c => c.name?.toLowerCase().includes(q) || c.char_name?.toLowerCase().includes(q)).slice(0, 50);
    }, [allCards, searchB]);

    // Unique effects
    const uniqueEffectA = formatSupportUniqueEffect(detailsA?.unique_effect, cardA?.raw_unique, cardA?.card_type);
    const uniqueEffectB = formatSupportUniqueEffect(detailsB?.unique_effect, cardB?.raw_unique, cardB?.card_type);

    // Hint & Event skills
    const hintSkillsA = detailsA?.hints?.skills || [];
    const eventSkillsA = detailsA?.event_skills || [];

    const hintSkillsB = detailsB?.hints?.skills || [];
    const eventSkillsB = detailsB?.event_skills || [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-5xl w-full overflow-hidden flex flex-col max-h-[94vh]">
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-amber-900/60 border border-amber-400/40 text-amber-200 shadow-xs">
                            <ArrowRightLeft className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                                <span>Komparator Side-by-Side 2 Support Card</span>
                                <span className="text-[10px] uppercase font-bold bg-amber-800/80 px-2 py-0.5 rounded-full border border-amber-400/30">
                                    0LB s.d. MLB
                                </span>
                            </h2>
                            <p className="text-xs text-amber-100/90">
                                Bandingkan efek training, efek unik, hint skill, dan event skill secara berdampingan
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-xl text-amber-200 hover:text-white hover:bg-amber-700/80 transition-colors cursor-pointer"
                        title="Tutup (Esc)"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Sub Navigation Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-4 py-2 gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={() => setActiveTab('effects')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                            activeTab === 'effects'
                                ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm border border-slate-200 dark:border-slate-700'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <Zap className="w-4 h-4" />
                        <span>1. Tabel Efek Support ({mergedEffects.length})</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('unique')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                            activeTab === 'unique'
                                ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm border border-slate-200 dark:border-slate-700'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <Sparkles className="w-4 h-4" />
                        <span>2. Efek Unik</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('skills')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                            activeTab === 'skills'
                                ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm border border-slate-200 dark:border-slate-700'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <Layers className="w-4 h-4" />
                        <span>3. Hint & Event Skills</span>
                    </button>
                </div>

                {/* Compare Arena: Card A & Card B Selector Banner */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-slate-100/70 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 shrink-0">
                    {/* Card A Panel */}
                    <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-2.5 relative">
                        <div className="flex items-start justify-between gap-2.5">
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-slate-300 dark:border-slate-700 shrink-0">
                                    <img
                                        src={cardA.image_url || cardA.icon_url}
                                        alt={cardA.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.currentTarget.src = 'https://gametora.com/images/umamusume/characters/support_card_default.png';
                                        }}
                                    />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-slate-900 text-white">
                                            {cardA.rarity || 'SSR'}
                                        </span>
                                        {cardA.card_type && (
                                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${getTypeColor(cardA.card_type)}`}>
                                                {cardA.card_type}
                                            </span>
                                        )}
                                        {cardA.is_owned ? (
                                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-600 text-white">
                                                Milik Anda: {cardA.limit_break === 4 ? 'MLB' : `${cardA.limit_break}LB`}
                                            </span>
                                        ) : (
                                            <span className="px-1.5 py-0.2 rounded text-[9px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800">
                                                Belum Dimiliki
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate mt-0.5" title={cardA.name}>
                                        {cardA.name}
                                    </h3>
                                    <div className="text-[10px] text-slate-500 truncate">
                                        Karakter: <strong>{cardA.char_name || '-'}</strong>
                                    </div>
                                </div>
                            </div>

                            {/* Dropdown switch button */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectorAOpen(!selectorAOpen);
                                        setSelectorBOpen(false);
                                    }}
                                    className="px-2 py-1.5 rounded-xl text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1 cursor-pointer shrink-0"
                                >
                                    <span>Ganti Kartu A</span>
                                    <ChevronDown className="w-3 h-3" />
                                </button>

                                {selectorAOpen && (
                                    <div className="absolute right-0 top-full mt-1.5 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 p-2 space-y-2">
                                        <input
                                            type="text"
                                            value={searchA}
                                            onChange={(e) => setSearchA(e.target.value)}
                                            placeholder="Cari kartu pengganti A..."
                                            className="w-full px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                                            autoFocus
                                        />
                                        <div className="max-h-48 overflow-y-auto space-y-1">
                                            {availableCardsA.map((c) => (
                                                <button
                                                    key={c.id || c.name}
                                                    type="button"
                                                    onClick={() => {
                                                        onSelectCardA?.(c);
                                                        setSelectorAOpen(false);
                                                    }}
                                                    className="w-full text-left p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-xs transition-colors cursor-pointer"
                                                >
                                                    <div className="w-6 h-6 rounded bg-slate-800 shrink-0 overflow-hidden">
                                                        <img src={c.image_url || c.icon_url} alt="" className="w-full h-full object-cover" />
                                                    </div>
                                                    <span className="truncate font-semibold text-slate-800 dark:text-slate-200">{c.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Limit Break Selector Bar A */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Limit Break A:</span>
                            <div className="flex items-center gap-1">
                                {LB_KEYS.map((k) => (
                                    <button
                                        key={k.key}
                                        type="button"
                                        onClick={() => setLbA(k.key)}
                                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                                            lbA === k.key
                                                ? 'bg-amber-600 text-white shadow-xs scale-105'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                        }`}
                                    >
                                        {k.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Card B Panel */}
                    <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-2.5 relative">
                        {cardB ? (
                            <>
                                <div className="flex items-start justify-between gap-2.5">
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-slate-300 dark:border-slate-700 shrink-0">
                                            <img
                                                src={cardB.image_url || cardB.icon_url}
                                                alt={cardB.name}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    e.currentTarget.src = 'https://gametora.com/images/umamusume/characters/support_card_default.png';
                                                }}
                                            />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-slate-900 text-white">
                                                    {cardB.rarity || 'SSR'}
                                                </span>
                                                {cardB.card_type && (
                                                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${getTypeColor(cardB.card_type)}`}>
                                                        {cardB.card_type}
                                                    </span>
                                                )}
                                                {cardB.is_owned ? (
                                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-600 text-white">
                                                        Milik Anda: {cardB.limit_break === 4 ? 'MLB' : `${cardB.limit_break}LB`}
                                                    </span>
                                                ) : (
                                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800">
                                                        Belum Dimiliki
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate mt-0.5" title={cardB.name}>
                                                {cardB.name}
                                            </h3>
                                            <div className="text-[10px] text-slate-500 truncate">
                                                Karakter: <strong>{cardB.char_name || '-'}</strong>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Dropdown switch button */}
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectorBOpen(!selectorBOpen);
                                                setSelectorAOpen(false);
                                            }}
                                            className="px-2 py-1.5 rounded-xl text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1 cursor-pointer shrink-0"
                                        >
                                            <span>Ganti Kartu B</span>
                                            <ChevronDown className="w-3 h-3" />
                                        </button>

                                        {selectorBOpen && (
                                            <div className="absolute right-0 top-full mt-1.5 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 p-2 space-y-2">
                                                <input
                                                    type="text"
                                                    value={searchB}
                                                    onChange={(e) => setSearchB(e.target.value)}
                                                    placeholder="Cari kartu pengganti B..."
                                                    className="w-full px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                                                    autoFocus
                                                />
                                                <div className="max-h-48 overflow-y-auto space-y-1">
                                                    {availableCardsB.map((c) => (
                                                        <button
                                                            key={c.id || c.name}
                                                            type="button"
                                                            onClick={() => {
                                                                onSelectCardB?.(c);
                                                                setSelectorBOpen(false);
                                                            }}
                                                            className="w-full text-left p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-xs transition-colors cursor-pointer"
                                                        >
                                                            <div className="w-6 h-6 rounded bg-slate-800 shrink-0 overflow-hidden">
                                                                <img src={c.image_url || c.icon_url} alt="" className="w-full h-full object-cover" />
                                                            </div>
                                                            <span className="truncate font-semibold text-slate-800 dark:text-slate-200">{c.name}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Limit Break Selector Bar B */}
                                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Limit Break B:</span>
                                    <div className="flex items-center gap-1">
                                        {LB_KEYS.map((k) => (
                                            <button
                                                key={k.key}
                                                type="button"
                                                onClick={() => setLbB(k.key)}
                                                className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                                                    lbB === k.key
                                                        ? 'bg-amber-600 text-white shadow-xs scale-105'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                                }`}
                                            >
                                                {k.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="p-6 text-center space-y-2">
                                <p className="text-xs text-slate-500">Pilih kartu kedua untuk dibandingkan</p>
                                <button
                                    type="button"
                                    onClick={() => setSelectorBOpen(true)}
                                    className="px-3 py-1.5 rounded-xl text-xs font-black bg-amber-500 text-white cursor-pointer"
                                >
                                    Pilih Kartu B
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Compare Body */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1">
                    {/* TAB 1: EFFECTS TABLE */}
                    {activeTab === 'effects' && (
                        <div className="space-y-4">
                            {loadingA || loadingB ? (
                                <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                                    <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
                                    <span>Sedang memuat data efek kedua kartu...</span>
                                </div>
                            ) : mergedEffects.length === 0 ? (
                                <div className="p-10 text-center text-xs text-slate-400">
                                    Data efek belum tersedia untuk kartu yang dipilih.
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold">
                                                <th className="px-4 py-3 text-center w-1/3 text-amber-700 dark:text-amber-400">
                                                    {cardA.name} ({lbA.toUpperCase()})
                                                </th>
                                                <th className="px-4 py-3 text-center w-1/3">
                                                    Nama Efek Support
                                                </th>
                                                <th className="px-4 py-3 text-center w-1/3 text-orange-700 dark:text-orange-400">
                                                    {cardB?.name || 'Kartu B'} ({lbB.toUpperCase()})
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {mergedEffects.map((item) => {
                                                const valA = Number(item.valA) || 0;
                                                const valB = Number(item.valB) || 0;
                                                const isAWinner = valA > valB;
                                                const isBWinner = valB > valA;
                                                const delta = Math.abs(valA - valB);

                                                return (
                                                    <tr
                                                        key={item.id || item.name_en}
                                                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                                                    >
                                                        {/* Col A Value */}
                                                        <td className={`px-4 py-3 text-center font-mono font-bold transition-all ${
                                                            isAWinner
                                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-sm'
                                                                : 'text-slate-700 dark:text-slate-300'
                                                        }`}>
                                                            {item.hasA ? (
                                                                <div className="flex items-center justify-center gap-1.5">
                                                                    <span>{valA}{item.symbol}</span>
                                                                    {isAWinner && valB > 0 && (
                                                                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                                                            (+{delta}{item.symbol})
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-slate-300 dark:text-slate-600 font-normal">-</span>
                                                            )}
                                                            {!item.hasB && (
                                                                <div className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                                                                    Hanya Kartu A
                                                                </div>
                                                            )}
                                                        </td>

                                                        {/* Col Effect Name */}
                                                        <td className="px-4 py-3 text-center bg-slate-50/40 dark:bg-slate-900/40">
                                                            <div className="font-bold text-slate-900 dark:text-white">
                                                                {item.name_en}
                                                            </div>
                                                            {item.name_ja && (
                                                                <div className="text-[10px] font-mono text-slate-400">
                                                                    {item.name_ja}
                                                                </div>
                                                            )}
                                                        </td>

                                                        {/* Col B Value */}
                                                        <td className={`px-4 py-3 text-center font-mono font-bold transition-all ${
                                                            isBWinner
                                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-sm'
                                                                : 'text-slate-700 dark:text-slate-300'
                                                        }`}>
                                                            {item.hasB ? (
                                                                <div className="flex items-center justify-center gap-1.5">
                                                                    <span>{valB}{item.symbol}</span>
                                                                    {isBWinner && valA > 0 && (
                                                                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                                                            (+{delta}{item.symbol})
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-slate-300 dark:text-slate-600 font-normal">-</span>
                                                            )}
                                                            {!item.hasA && (
                                                                <div className="text-[9px] text-orange-600 dark:text-orange-400 font-semibold mt-0.5">
                                                                    Hanya Kartu B
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 2: UNIQUE EFFECTS */}
                    {activeTab === 'unique' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Card A Unique */}
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                                <div className="flex items-center justify-between flex-wrap gap-1.5">
                                    <h4 className="text-xs font-black text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5" />
                                        <span>Efek Unik: {cardA.name}</span>
                                    </h4>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        {(uniqueEffectA?.condition_id || uniqueEffectA?.condition) && (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                                {uniqueEffectA.condition_id || uniqueEffectA.condition}
                                            </span>
                                        )}
                                        {uniqueEffectA?.level !== undefined && (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white">
                                                Aktif di Lv. {uniqueEffectA.level}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {uniqueEffectA ? (
                                    <div className="space-y-2.5">
                                        <div className="space-y-1">
                                            {uniqueEffectA.description_id && (
                                                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                                                    {uniqueEffectA.description_id}
                                                </p>
                                            )}
                                            {uniqueEffectA.description_en && uniqueEffectA.description_en !== uniqueEffectA.description_id && (
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                                                    {uniqueEffectA.description_en}
                                                </p>
                                            )}
                                        </div>
                                        {uniqueEffectA.bonuses && uniqueEffectA.bonuses.length > 0 ? (
                                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                {uniqueEffectA.bonuses.map((b, idx) => (
                                                    <span key={idx} className="px-2 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                                                        <span>{b.name_id || b.name_en}</span>
                                                        <strong className="text-emerald-600 dark:text-emerald-400">{b.formatted}</strong>
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="space-y-1.5">
                                                {uniqueEffectA.effects?.map((ue, idx) => (
                                                    <div key={idx} className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold flex justify-between">
                                                        <span>{ue.name_id || ue.name_en || ue.name_ja}</span>
                                                        <span className="text-emerald-600 dark:text-emerald-400">+{ue.value || 0}%</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-xs text-slate-400 italic">Tidak ada efek unik khusus.</div>
                                )}
                            </div>

                            {/* Card B Unique */}
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                                <div className="flex items-center justify-between flex-wrap gap-1.5">
                                    <h4 className="text-xs font-black text-orange-700 dark:text-orange-300 flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5" />
                                        <span>Efek Unik: {cardB?.name || 'Kartu B'}</span>
                                    </h4>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        {(uniqueEffectB?.condition_id || uniqueEffectB?.condition) && (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 dark:bg-orange-950/70 text-orange-800 dark:text-orange-300 border border-orange-300 dark:border-orange-800">
                                                {uniqueEffectB.condition_id || uniqueEffectB.condition}
                                            </span>
                                        )}
                                        {uniqueEffectB?.level !== undefined && (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white">
                                                Aktif di Lv. {uniqueEffectB.level}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {uniqueEffectB ? (
                                    <div className="space-y-2.5">
                                        <div className="space-y-1">
                                            {uniqueEffectB.description_id && (
                                                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                                                    {uniqueEffectB.description_id}
                                                </p>
                                            )}
                                            {uniqueEffectB.description_en && uniqueEffectB.description_en !== uniqueEffectB.description_id && (
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                                                    {uniqueEffectB.description_en}
                                                </p>
                                            )}
                                        </div>
                                        {uniqueEffectB.bonuses && uniqueEffectB.bonuses.length > 0 ? (
                                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                {uniqueEffectB.bonuses.map((b, idx) => (
                                                    <span key={idx} className="px-2 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                                                        <span>{b.name_id || b.name_en}</span>
                                                        <strong className="text-emerald-600 dark:text-emerald-400">{b.formatted}</strong>
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="space-y-1.5">
                                                {uniqueEffectB.effects?.map((ue, idx) => (
                                                    <div key={idx} className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold flex justify-between">
                                                        <span>{ue.name_id || ue.name_en || ue.name_ja}</span>
                                                        <span className="text-emerald-600 dark:text-emerald-400">+{ue.value || 0}%</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-xs text-slate-400 italic">Tidak ada efek unik khusus.</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB 3: HINTS & EVENT SKILLS */}
                    {activeTab === 'skills' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Card A Skills */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-black text-amber-700 dark:text-amber-300">
                                    Skill Kartu A ({cardA.name})
                                </h4>

                                {/* Hint skills */}
                                <div className="space-y-1.5">
                                    <div className="text-[11px] font-bold text-slate-500">Hint Skills ({hintSkillsA.length}):</div>
                                    <div className="space-y-1">
                                        {hintSkillsA.length === 0 ? (
                                            <span className="text-xs text-slate-400 italic">Tidak ada hint skills.</span>
                                        ) : (
                                            hintSkillsA.map((s, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => onSkillDetail?.(s)}
                                                    className="w-full text-left p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/30 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between cursor-pointer transition-colors"
                                                >
                                                    <span className="truncate">{s.name || s.name_en}</span>
                                                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold shrink-0">Lihat Formula ›</span>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Event skills */}
                                <div className="space-y-1.5">
                                    <div className="text-[11px] font-bold text-slate-500">Event Skills ({eventSkillsA.length}):</div>
                                    <div className="space-y-1">
                                        {eventSkillsA.length === 0 ? (
                                            <span className="text-xs text-slate-400 italic">Tidak ada event skills.</span>
                                        ) : (
                                            eventSkillsA.map((s, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => onSkillDetail?.(s)}
                                                    className="w-full text-left p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/30 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between cursor-pointer transition-colors"
                                                >
                                                    <span className="truncate">{s.name || s.name_en}</span>
                                                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold shrink-0">Lihat Formula ›</span>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Card B Skills */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-black text-orange-700 dark:text-orange-300">
                                    Skill Kartu B ({cardB?.name || 'Kartu B'})
                                </h4>

                                {/* Hint skills */}
                                <div className="space-y-1.5">
                                    <div className="text-[11px] font-bold text-slate-500">Hint Skills ({hintSkillsB.length}):</div>
                                    <div className="space-y-1">
                                        {hintSkillsB.length === 0 ? (
                                            <span className="text-xs text-slate-400 italic">Tidak ada hint skills.</span>
                                        ) : (
                                            hintSkillsB.map((s, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => onSkillDetail?.(s)}
                                                    className="w-full text-left p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-orange-50 dark:hover:bg-orange-950/30 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between cursor-pointer transition-colors"
                                                >
                                                    <span className="truncate">{s.name || s.name_en}</span>
                                                    <span className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold shrink-0">Lihat Formula ›</span>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Event skills */}
                                <div className="space-y-1.5">
                                    <div className="text-[11px] font-bold text-slate-500">Event Skills ({eventSkillsB.length}):</div>
                                    <div className="space-y-1">
                                        {eventSkillsB.length === 0 ? (
                                            <span className="text-xs text-slate-400 italic">Tidak ada event skills.</span>
                                        ) : (
                                            eventSkillsB.map((s, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => onSkillDetail?.(s)}
                                                    className="w-full text-left p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-orange-50 dark:hover:bg-orange-950/30 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between cursor-pointer transition-colors"
                                                >
                                                    <span className="truncate">{s.name || s.name_en}</span>
                                                    <span className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold shrink-0">Lihat Formula ›</span>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between shrink-0">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Highlight hijau menandakan nilai efek training yang lebih tinggi (keunggulan kartu).
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer transition-colors"
                    >
                        Tutup Komparator
                    </button>
                </div>
            </div>
        </div>
    );
}
