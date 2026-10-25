import React, { useState, useEffect, useCallback } from 'react';
import AllSkillsCatalogModal from './AllSkillsCatalogModal';
import {
    Search,
    Filter,
    Sparkles,
    BookOpen,
    Layers,
    User,
    CheckCircle2,
    XCircle,
    ChevronDown,
    ChevronUp,
    Zap,
    RefreshCw,
    ExternalLink,
    HelpCircle
} from 'lucide-react';

const PRESET_QUICK_SEARCHES = [
    { label: 'Groundwork / 地固め', query: 'Groundwork' },
    { label: 'Swinging Maestro / 円弧のマエストロ', query: 'Swinging Maestro' },
    { label: 'Professor of Curvature / 弧線のプロフェッサー', query: 'Professor of Curvature' },
];

export default function ReverseSkillFinder({ 
    onSkillDetail, 
    onOpenSupportCard, 
    onOpenCharacter, 
    onToggleCompareCard, 
    compareCards = [], 
    onNotify 
}) {
    const [query, setQuery] = useState(() => {
        const pending = sessionStorage.getItem('uma_pending_skill_search');
        if (pending) {
            sessionStorage.removeItem('uma_pending_skill_search');
            return pending;
        }
        return '';
    });
    const [debouncedQuery, setDebouncedQuery] = useState(query);
    const [rarityFilter, setRarityFilter] = useState('all'); // all, rare, normal, unique, evolved
    const [sourceTypeFilter, setSourceTypeFilter] = useState('all'); // all, support_card, character
    const [ownedOnly, setOwnedOnly] = useState(false);

    const [skills, setSkills] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [expandedCards, setExpandedCards] = useState({});
    const [showAllSkillsModal, setShowAllSkillsModal] = useState(false);

    // Global listener for shortcut events to find skill sources
    useEffect(() => {
        const handleFindSkillSources = (e) => {
            const q = e.detail?.query;
            if (q) {
                setQuery(q);
                setDebouncedQuery(q);
            }
        };
        window.addEventListener('uma:find-skill-sources', handleFindSkillSources);
        return () => window.removeEventListener('uma:find-skill-sources', handleFindSkillSources);
    }, []);

    // 300ms Debounce Query
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(query);
        }, 300);
        return () => clearTimeout(handler);
    }, [query]);

    // Fetch skill sources
    const fetchSkillSources = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (debouncedQuery.trim()) {
                params.set('q', debouncedQuery.trim());
            }
            if (rarityFilter !== 'all') {
                params.set('rarity', rarityFilter);
            }
            if (sourceTypeFilter !== 'all') {
                params.set('source_type', sourceTypeFilter);
            }
            if (ownedOnly) {
                params.set('owned_only', '1');
            }
            params.set('limit', '50');

            const res = await fetch(`/api/collection/skill-sources?${params.toString()}`);
            const data = await res.json();
            if (data.success) {
                setSkills(data.skills || []);
            } else {
                onNotify?.(data.message || 'Gagal memuat sumber skill', 'error');
            }
        } catch (err) {
            console.error('Failed to search skill sources:', err);
            onNotify?.('Terjadi kesalahan saat memuat pencarian skill', 'error');
        } finally {
            setLoading(false);
            setHasSearched(true);
        }
    }, [debouncedQuery, rarityFilter, sourceTypeFilter, ownedOnly, onNotify]);

    useEffect(() => {
        fetchSkillSources();
    }, [fetchSkillSources]);

    const toggleExpandSources = (skillId) => {
        setExpandedCards(prev => ({
            ...prev,
            [skillId]: !prev[skillId]
        }));
    };

    const getRarityBadge = (rarity) => {
        switch (Number(rarity)) {
            case 2:
                return (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shadow-2xs">
                        Gold / Rare
                    </span>
                );
            case 3:
                return (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-300 dark:border-purple-800 shadow-2xs">
                        Unique
                    </span>
                );
            case 4:
                return (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-pink-100 text-pink-800 dark:bg-pink-950/80 dark:text-pink-300 border border-pink-300 dark:border-pink-800 shadow-2xs">
                        Evolved
                    </span>
                );
            default:
                return (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700 shadow-2xs">
                        White / Normal
                    </span>
                );
        }
    };

    const getTypeColor = (type) => {
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
    };

    return (
        <div className="space-y-6">
            {/* Header Description & Search Banner */}
            <div className="bg-gradient-to-br from-indigo-900/90 via-slate-900 to-slate-900 p-5 sm:p-6 rounded-3xl border border-indigo-700/40 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                                <Sparkles className="w-4 h-4 text-amber-400" />
                                <span>Katalog Terbalik Skill (Reverse Skill Finder)</span>
                            </div>
                            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                                Temukan Kartu Support & Uma Musume Pemberi Skill
                            </h2>
                            <p className="text-xs text-indigo-200/80 max-w-2xl leading-relaxed">
                                Cari nama skill dalam bahasa Inggris atau Jepang untuk mengetahui Support Card mana yang memberikan skill tersebut (via Hints atau Event) serta karakter Uma Musume yang memilikinya secara alami.
                            </p>
                        </div>

                        {/* Ownership Switcher */}
                        <div className="flex items-center gap-2.5 bg-indigo-950/70 border border-indigo-800/80 px-4 py-2.5 rounded-2xl shrink-0">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={ownedOnly}
                                    onChange={(e) => setOwnedOnly(e.target.checked)}
                                    className="w-4 h-4 text-emerald-500 rounded border-indigo-700 focus:ring-emerald-400 focus:ring-offset-slate-900 cursor-pointer"
                                />
                                <span className="text-xs font-bold text-indigo-100">
                                    Hanya Koleksi Milik Saya
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                            <Search className="w-4 h-4" />
                        </div>
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Cari nama skill EN atau JP (misal: Groundwork, 円弧, Curvature, Spurt, 好転一息)..."
                            className="w-full pl-10 pr-10 py-3 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={() => setQuery('')}
                                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white"
                            >
                                <XCircle className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Quick Search Chips & View All Skills Button */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-bold text-indigo-300/80 flex items-center gap-1 shrink-0">
                                <span>Preset Populer:</span>
                            </span>
                            {PRESET_QUICK_SEARCHES.map((preset) => (
                                <button
                                    key={preset.query}
                                    type="button"
                                    onClick={() => {
                                        setQuery(preset.query);
                                        setDebouncedQuery(preset.query);
                                    }}
                                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
                                        query === preset.query
                                            ? 'bg-indigo-500 text-white border-indigo-400 shadow-sm'
                                            : 'bg-indigo-950/60 text-indigo-200 border-indigo-800/70 hover:bg-indigo-900 hover:text-white'
                                    }`}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>

                        {/* Button Lihat Semua Skill */}
                        <button
                            type="button"
                            onClick={() => setShowAllSkillsModal(true)}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-500 text-white shadow-sm flex items-center gap-1.5 border border-indigo-400/40 shrink-0 self-start sm:self-auto hover:scale-[1.02]"
                            title="Buka daftar seluruh skill yang tersedia di game"
                        >
                            <BookOpen className="w-3.5 h-3.5 text-indigo-200" />
                            <span>Lihat Semua Skill</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 mr-2">
                        <Filter className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Filter:</span>
                    </div>

                    {/* Rarity Filter */}
                    <div className="flex items-center gap-1">
                        {[
                            { key: 'all', label: 'Semua Rarity' },
                            { key: 'rare', label: 'Gold / Rare' },
                            { key: 'normal', label: 'White / Normal' },
                            { key: 'unique', label: 'Unique' },
                            { key: 'evolved', label: 'Evolved' },
                        ].map((item) => (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => setRarityFilter(item.key)}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                                    rarityFilter === item.key
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Source Type Filter */}
                <div className="flex items-center gap-1.5 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] font-bold text-slate-400">Sumber:</span>
                    {[
                        { key: 'all', label: 'Semua' },
                        { key: 'support_card', label: 'Support Card' },
                        { key: 'character', label: 'Karakter' },
                    ].map((item) => (
                        <button
                            key={item.key}
                            type="button"
                            onClick={() => setSourceTypeFilter(item.key)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                sourceTypeFilter === item.key
                                    ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results Counter / Loading Indicator */}
            <div className="flex items-center justify-between text-xs px-1">
                <span className="font-bold text-slate-600 dark:text-slate-400">
                    {loading ? (
                        <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Sedang mencari skill & sumber...
                        </span>
                    ) : (
                        <span>Menampilkan <strong>{skills.length}</strong> skill ditemukan</span>
                    )}
                </span>
                {ownedOnly && (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Filter aktif: Hanya sumber koleksi milik Anda
                    </span>
                )}
            </div>

            {/* Skills List */}
            {skills.length === 0 && !loading && hasSearched ? (
                <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 flex items-center justify-center">
                        <Search className="w-6 h-6" />
                    </div>
                    <h3 className="font-black text-slate-800 dark:text-slate-200 text-base">
                        Tidak Ada Skill Ditemukan
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                        Tidak ada skill yang cocok dengan kata kunci "{query}" atau kriteria filter yang dipilih. Coba periksa ejaan atau nonaktifkan filter kepemilikan.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {skills.map((item, idx) => {
                        const skill = item.skill || item;
                        const skillKey = skill.id || skill.name || `skill-${idx}`;
                        const isExpanded = expandedCards[skillKey] !== false; // Default expanded
                        const cardSources = item.support_cards || skill.support_cards || [];
                        const charSources = item.characters || skill.characters || [];
                        const totalSources = item.total_sources ?? (cardSources.length + charSources.length);

                        return (
                            <div
                                key={skillKey}
                                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition-all hover:border-indigo-300 dark:hover:border-indigo-800/80"
                            >
                                {/* Skill Header */}
                                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/60">
                                    <div className="flex items-start gap-3.5 min-w-0">
                                        {/* Skill Icon */}
                                        <div className="relative shrink-0">
                                            {skill.icon_url ? (
                                                <img
                                                    src={skill.icon_url}
                                                    alt={skill.name_en || skill.name}
                                                    className="w-12 h-12 rounded-2xl object-contain bg-slate-900/80 border border-slate-700 shadow-xs"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none';
                                                        e.currentTarget.nextSibling.style.display = 'flex';
                                                    }}
                                                />
                                            ) : null}
                                            <div className={`w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 ${skill.icon_url ? 'hidden' : 'flex'}`}>
                                                <Zap className="w-6 h-6" />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5 min-w-0 flex-1">
                                            {/* Rarity, Skill Name, Cost, and Sources Count in a single unified row */}
                                            <div className="flex flex-wrap items-center gap-2">
                                                {getRarityBadge(skill.rarity)}

                                                {/* Nama skill tepat di antara rarity badge dan jumlah sumber perolehan */}
                                                <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight flex items-baseline gap-1.5">
                                                    <span>{skill.name_en || skill.name || 'Skill Tanpa Nama'}</span>
                                                    {skill.name_ja && skill.name_ja !== (skill.name_en || skill.name) && (
                                                        <span className="text-xs font-normal text-slate-400">
                                                            ({skill.name_ja})
                                                        </span>
                                                    )}
                                                </span>

                                                {skill.cost && (
                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                                        Cost: {skill.cost} Pt
                                                    </span>
                                                )}

                                                <span className="text-[11px] font-bold text-slate-400">
                                                    • {totalSources} Sumber Perolehan
                                                </span>
                                            </div>

                                            {(skill.desc_en || skill.desc || skill.desc_ja || skill.description_en || skill.description) && (
                                                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                                                    {skill.desc_en || skill.desc || skill.desc_ja || skill.description_en || skill.description}
                                                </p>
                                            )}

                                            {/* Related Skills (Gold <-> White, Evolved, Variants) */}
                                            {Boolean((item.related_skills || skill.related_skills)?.length) && (
                                                <div className="pt-2 flex flex-wrap items-center gap-1.5 text-xs">
                                                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                        🔗 Skill Terkait (Versi Dasar / Upgrade):
                                                    </span>
                                                    {(item.related_skills || skill.related_skills).map((rel) => (
                                                        <button
                                                            key={rel.id || rel.name_en}
                                                            type="button"
                                                            onClick={() => {
                                                                const targetName = rel.name_en || rel.name_ja;
                                                                setQuery(targetName);
                                                                setDebouncedQuery(targetName);
                                                            }}
                                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/70 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer shadow-2xs"
                                                            title={`Cari sumber untuk ${rel.name_en || rel.name_ja}`}
                                                        >
                                                            {rel.icon_url && (
                                                                <img src={rel.icon_url} alt="" className="w-3.5 h-3.5 rounded object-contain shrink-0" />
                                                            )}
                                                            <span>{rel.name_en || rel.name_ja}</span>
                                                            {rel.rarity === 2 && <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold">(Gold)</span>}
                                                            {rel.rarity === 1 && <span className="text-[9px] text-slate-400 font-bold">(White)</span>}
                                                            {rel.rarity === 6 && <span className="text-[9px] text-pink-600 dark:text-pink-400 font-bold">(Evolved)</span>}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                        <button
                                            type="button"
                                            onClick={() => onSkillDetail?.(skill)}
                                            className="px-3.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                                            title="Buka rumus, scaling, dan durasi skill lengkap"
                                        >
                                            <Sparkles className="w-3.5 h-3.5" />
                                            <span>Detail Formula</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => toggleExpandSources(skillKey)}
                                            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                            title={isExpanded ? 'Sembunyikan sumber' : 'Tampilkan sumber'}
                                        >
                                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Sources Body */}
                                {isExpanded && (
                                    <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-5 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-slate-800">
                                        {/* Column 1: Support Cards */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                                                    <Layers className="w-3.5 h-3.5" />
                                                    <span>Support Card Pemberi ({cardSources.length})</span>
                                                </div>
                                                {cardSources.some(c => c.is_owned) && (
                                                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                                        Dimiliki di Koleksi
                                                    </span>
                                                )}
                                            </div>

                                            {cardSources.length === 0 ? (
                                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-center text-xs text-slate-400">
                                                    Tidak ada support card pemberi untuk skill ini.
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                                                    {cardSources.map((card, cIdx) => {
                                                        const isInCompare = compareCards?.some(c => (c.id && c.id === card.id) || c.name === card.name);

                                                        return (
                                                            <div
                                                                key={`${card.id || card.name}-${cIdx}`}
                                                                onClick={() => onOpenSupportCard?.(card)}
                                                                role="button"
                                                                tabIndex={0}
                                                                title="Klik untuk membuka detail kartu"
                                                                className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer group hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-xs ${
                                                                    card.is_owned
                                                                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80'
                                                                        : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    {/* Card Thumbnail */}
                                                                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-slate-300 dark:border-slate-700 group-hover:ring-2 group-hover:ring-emerald-400/50 transition-all">
                                                                        <img
                                                                            src={card.image_url || card.icon_url}
                                                                            alt={card.name}
                                                                            className="w-full h-full object-cover"
                                                                            onError={(e) => {
                                                                                e.currentTarget.src = 'https://gametora.com/images/umamusume/characters/support_card_default.png';
                                                                            }}
                                                                        />
                                                                    </div>

                                                                    <div className="min-w-0 space-y-0.5">
                                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-slate-900 text-white">
                                                                                {card.rarity || 'SSR'}
                                                                            </span>
                                                                            {card.card_type && (
                                                                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${getTypeColor(card.card_type)}`}>
                                                                                    {card.card_type}
                                                                                </span>
                                                                            )}
                                                                            {card.is_owned ? (
                                                                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-600 text-white">
                                                                                    {card.limit_break === 4 ? 'MLB' : `${card.limit_break}LB`}
                                                                                </span>
                                                                            ) : (
                                                                                <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold text-slate-400 bg-slate-200 dark:bg-slate-700">
                                                                                    Belum Punya
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" title={card.name}>
                                                                            {card.name}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="shrink-0 flex items-center gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            onToggleCompareCard?.(card);
                                                                        }}
                                                                        className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer ${
                                                                            isInCompare
                                                                                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-2xs'
                                                                                : 'bg-slate-200 dark:bg-slate-700 hover:bg-amber-100 hover:text-amber-800 dark:hover:bg-amber-950/60 dark:hover:text-amber-300 text-slate-700 dark:text-slate-300 border border-transparent hover:border-amber-300 dark:hover:border-amber-700'
                                                                        }`}
                                                                        title={isInCompare ? 'Hapus kartu dari perbandingan' : 'Pilih kartu ini untuk dikomparasi side-by-side'}
                                                                    >
                                                                        <span>{isInCompare ? '✓ Dipilih' : '⚖️ Banding'}</span>
                                                                    </button>

                                                                    <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full" title={card.obtain_method}>
                                                                        🎯 {card.obtain_method === 'hint' ? 'Hint Skill' : card.obtain_method === 'event' ? 'Event Skill' : 'Hint & Event'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        {/* Column 2: Uma Musume Characters */}
                                        <div className="space-y-3 pt-3 lg:pt-0 lg:pl-5">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-xs font-black text-pink-600 dark:text-pink-400 uppercase tracking-wider">
                                                    <User className="w-3.5 h-3.5" />
                                                    <span>Karakter Uma Musume ({charSources.length})</span>
                                                </div>
                                                {charSources.some(c => c.is_owned) && (
                                                    <span className="text-[10px] font-black text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/40 px-2 py-0.5 rounded-full border border-pink-200 dark:border-pink-800">
                                                        Dimiliki di Koleksi
                                                    </span>
                                                )}
                                            </div>

                                            {charSources.length === 0 ? (
                                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-center text-xs text-slate-400">
                                                    Tidak ada karakter langsung yang memiliki skill ini di status dasar / awakening.
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                                                    {charSources.map((char, chIdx) => (
                                                        <div
                                                            key={`${char.id || char.name}-${chIdx}`}
                                                            onClick={() => onOpenCharacter?.(char)}
                                                            role="button"
                                                            tabIndex={0}
                                                            title="Klik untuk membuka detail karakter & skill tree"
                                                            className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer group hover:border-pink-400 dark:hover:border-pink-600 hover:shadow-xs ${
                                                                char.is_owned
                                                                    ? 'bg-pink-50/50 dark:bg-pink-950/20 border-pink-300 dark:border-pink-800/80'
                                                                    : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                {/* Char Thumbnail */}
                                                                <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-slate-300 dark:border-slate-700 group-hover:ring-2 group-hover:ring-pink-400/50 transition-all">
                                                                    <img
                                                                        src={char.image_url}
                                                                        alt={char.name}
                                                                        className="w-full h-full object-cover"
                                                                        onError={(e) => {
                                                                            e.currentTarget.src = 'https://gametora.com/images/umamusume/characters/uma_default.png';
                                                                        }}
                                                                    />
                                                                </div>

                                                                <div className="min-w-0 space-y-0.5">
                                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-400 text-slate-900">
                                                                            {char.stars || char.base_stars || 3}★
                                                                        </span>
                                                                        {char.is_owned ? (
                                                                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-600 text-white">
                                                                                Dimiliki ({char.stars || char.base_stars}★)
                                                                            </span>
                                                                        ) : (
                                                                            <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold text-slate-400 bg-slate-200 dark:bg-slate-700">
                                                                                Belum Punya
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors" title={char.name}>
                                                                        {char.name}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="shrink-0 text-right">
                                                                <span className="text-[10px] text-pink-700 dark:text-pink-300 font-bold bg-pink-50 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-800 px-2 py-0.5 rounded-full" title={char.skill_category || char.obtain_method}>
                                                                    🌸 {char.skill_category || char.obtain_method || 'Skill Alami'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal Daftar Semua Skill */}
            <AllSkillsCatalogModal
                isOpen={showAllSkillsModal}
                onClose={() => setShowAllSkillsModal(false)}
                onSelectSkill={(selectedName) => {
                    setQuery(selectedName);
                    setDebouncedQuery(selectedName);
                }}
            />
        </div>
    );
}
