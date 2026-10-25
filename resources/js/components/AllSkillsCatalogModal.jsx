import React, { useState, useEffect, useMemo } from 'react';
import {
    X,
    Search,
    XCircle,
    Sparkles,
    BookOpen,
    Filter,
    Layers,
    User,
    ArrowRight,
    Zap,
    RefreshCw,
    SlidersHorizontal,
    Check
} from 'lucide-react';

export default function AllSkillsCatalogModal({ isOpen, onClose, onSelectSkill }) {
    const [skills, setSkills] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [rarityFilter, setRarityFilter] = useState('all'); // all, rare, normal, unique, evolved
    const [distanceFilter, setDistanceFilter] = useState('all'); // all, short, mile, medium, long
    const [styleFilter, setStyleFilter] = useState('all'); // all, front, pace, late, end
    const [categoryFilter, setCategoryFilter] = useState('all'); // all, speed, accel, recovery, passive, debuff
    const [sortBy, setSortBy] = useState('popular'); // popular, name
    const [displayLimit, setDisplayLimit] = useState(60);

    // Fetch skills from API when modal opens
    useEffect(() => {
        if (!isOpen) return;

        let isMounted = true;
        const fetchAllSkills = async () => {
            if (skills.length > 0) return; // Already cached in state
            setLoading(true);
            try {
                const res = await fetch('/api/collection/skills');
                const data = await res.json();
                if (isMounted && data.success) {
                    setSkills(data.skills || []);
                }
            } catch (err) {
                console.error('Failed to load all skills:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchAllSkills();
        return () => { isMounted = false; };
    }, [isOpen, skills.length]);

    // Reset pagination when search or filter changes
    useEffect(() => {
        setDisplayLimit(60);
    }, [search, rarityFilter, distanceFilter, styleFilter, categoryFilter, sortBy]);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Filter and sort skills
    const filteredSkills = useMemo(() => {
        let result = skills;

        // Rarity Filter
        if (rarityFilter !== 'all') {
            result = result.filter((sk) => {
                const r = Number(sk.rarity || 1);
                if (rarityFilter === 'rare') return r === 2;
                if (rarityFilter === 'unique') return r === 3 || r === 4 || r === 5;
                if (rarityFilter === 'evolved') return r === 6;
                if (rarityFilter === 'normal') return r === 1 || r === 0;
                return true;
            });
        }

        // Tactical Filter: Distance
        if (distanceFilter !== 'all') {
            result = result.filter((sk) => {
                const dists = sk.distance_types || [];
                return dists.includes(distanceFilter);
            });
        }

        // Tactical Filter: Running Style
        if (styleFilter !== 'all') {
            result = result.filter((sk) => {
                const styles = sk.running_styles || [];
                return styles.includes(styleFilter);
            });
        }

        // Tactical Filter: Effect Category
        if (categoryFilter !== 'all') {
            result = result.filter((sk) => {
                const cats = sk.effect_categories || [];
                return cats.includes(categoryFilter);
            });
        }

        // Search Filter
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            result = result.filter((sk) => {
                const nameEn = (sk.name_en || '').toLowerCase();
                const nameJa = (sk.name_ja || '').toLowerCase();
                const desc = (sk.description_en || '').toLowerCase();
                return nameEn.includes(q) || nameJa.includes(q) || desc.includes(q);
            });
        }

        // Sort
        if (sortBy === 'name') {
            result = [...result].sort((a, b) => (a.name_en || '').localeCompare(b.name_en || ''));
        } else {
            // Default: Popularity (cards + chars count)
            result = [...result].sort((a, b) => {
                const totalA = (a.cards_count || 0) + (a.chars_count || 0);
                const totalB = (b.cards_count || 0) + (b.chars_count || 0);
                if (totalA !== totalB) return totalB - totalA;
                return (a.name_en || '').localeCompare(b.name_en || '');
            });
        }

        return result;
    }, [skills, search, rarityFilter, distanceFilter, styleFilter, categoryFilter, sortBy]);

    if (!isOpen) return null;

    const visibleSkills = filteredSkills.slice(0, displayLimit);
    const hasMore = displayLimit < filteredSkills.length;

    const getRarityBadge = (rarity) => {
        const r = Number(rarity || 1);
        switch (r) {
            case 2:
                return (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                        Gold / Rare
                    </span>
                );
            case 3:
            case 4:
            case 5:
                return (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                        Unique
                    </span>
                );
            case 6:
                return (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-pink-100 text-pink-800 dark:bg-pink-950/80 dark:text-pink-300 border border-pink-300 dark:border-pink-800">
                        Evolved
                    </span>
                );
            default:
                return (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                        White / Normal
                    </span>
                );
        }
    };

    const handleSelect = (skill) => {
        const targetQuery = skill.name_en || skill.name_ja || skill.name || '';
        onSelectSkill(targetQuery);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
            <div 
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh]"
                role="dialog"
                aria-modal="true"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 text-white p-4 sm:p-5 flex items-center justify-between shrink-0 shadow-sm">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
                            <BookOpen className="w-5 h-5 text-indigo-200" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-base sm:text-lg font-black tracking-tight truncate">
                                    Daftar Semua Skill
                                </h3>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/80 border border-indigo-400/40 text-white shadow-2xs">
                                    {skills.length > 0 ? `${skills.length.toLocaleString()} Skill` : 'Memuat...'}
                                </span>
                            </div>
                            <p className="text-xs text-indigo-200/90 truncate">
                                Klik skill untuk langsung mencari Kartu Support & Uma Musume penyedianya
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-xl text-indigo-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        title="Tutup Modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search & Filter Toolbar */}
                <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 space-y-3.5 shrink-0">
                    {/* Search Input Bar */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                            <Search className="w-4 h-4" />
                        </div>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari nama skill EN atau JP (misal: Arc, Maestro, Groundwork, 円弧, 直線)..."
                            className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-2xs"
                            autoFocus
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                            >
                                <XCircle className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Filter Pills & Sort Controls */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                        {/* Rarity Tabs */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {[
                                { key: 'all', label: 'Semua' },
                                { key: 'rare', label: 'Gold / Rare' },
                                { key: 'normal', label: 'White / Normal' },
                                { key: 'unique', label: 'Unique' },
                                { key: 'evolved', label: 'Evolved' },
                            ].map((item) => (
                                <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => setRarityFilter(item.key)}
                                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                        rarityFilter === item.key
                                            ? 'bg-indigo-600 text-white shadow-xs'
                                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                                    }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>

                        {/* Sort Switcher */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto text-xs text-slate-500">
                            <span className="text-[11px] font-bold text-slate-400">Urutkan:</span>
                            <button
                                type="button"
                                onClick={() => setSortBy('popular')}
                                className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                    sortBy === 'popular'
                                        ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                            >
                                Terpopuler
                            </button>
                            <button
                                type="button"
                                onClick={() => setSortBy('name')}
                                className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                    sortBy === 'name'
                                        ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                            >
                                A-Z
                            </button>
                        </div>
                    </div>

                    {/* Tactical Multi-Dimensional Filters */}
                    <div className="pt-2.5 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2">
                        {/* Row 1: Distance & Running Style */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
                            {/* Distance Filter */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0">Jarak:</span>
                                {[
                                    { key: 'all', label: 'Semua Jarak' },
                                    { key: 'short', label: 'Short' },
                                    { key: 'mile', label: 'Mile' },
                                    { key: 'medium', label: 'Medium' },
                                    { key: 'long', label: 'Long' },
                                ].map((item) => (
                                    <button
                                        key={item.key}
                                        type="button"
                                        onClick={() => setDistanceFilter(item.key)}
                                        className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                            distanceFilter === item.key
                                                ? 'bg-sky-600 text-white shadow-2xs'
                                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>

                            {/* Running Style Filter */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0">Gaya:</span>
                                {[
                                    { key: 'all', label: 'Semua Gaya' },
                                    { key: 'front', label: 'Front (Nige)' },
                                    { key: 'pace', label: 'Pace (Senko)' },
                                    { key: 'late', label: 'Late (Sashi)' },
                                    { key: 'end', label: 'End (Oikomi)' },
                                ].map((item) => (
                                    <button
                                        key={item.key}
                                        type="button"
                                        onClick={() => setStyleFilter(item.key)}
                                        className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                            styleFilter === item.key
                                                ? 'bg-amber-600 text-white shadow-2xs'
                                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Row 2: Effect Category */}
                        <div className="flex items-center gap-1.5 flex-wrap text-xs">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0">Kategori Efek:</span>
                            {[
                                { key: 'all', label: 'Semua Efek' },
                                { key: 'speed', label: '⚡ Speed' },
                                { key: 'accel', label: '🚀 Acceleration' },
                                { key: 'recovery', label: '💙 Recovery' },
                                { key: 'passive', label: '🟢 Green / Passive' },
                                { key: 'debuff', label: '🔻 Debuff' },
                            ].map((item) => (
                                <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => setCategoryFilter(item.key)}
                                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                        categoryFilter === item.key
                                            ? 'bg-emerald-600 text-white shadow-2xs'
                                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                                    }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Skill List Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
                    {loading ? (
                        <div className="p-16 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-3">
                            <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                            <span className="font-medium">Memuat katalog seluruh skill...</span>
                        </div>
                    ) : filteredSkills.length === 0 ? (
                        <div className="p-12 text-center text-xs text-slate-400 space-y-2">
                            <p className="font-semibold text-slate-600 dark:text-slate-300">
                                Tidak ada skill yang cocok dengan pencarian "{search}".
                            </p>
                            <p className="text-[11px]">
                                Coba gunakan kata kunci nama skill dalam bahasa Inggris atau karakter Jepang lainnya.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between px-1">
                                <span>Menampilkan {visibleSkills.length} dari {filteredSkills.length} skill yang cocok:</span>
                                {search && (
                                    <button
                                        type="button"
                                        onClick={() => setSearch('')}
                                        className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                                    >
                                        Reset Filter Pencarian
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                {visibleSkills.map((sk) => {
                                    const iconUrl = sk.icon_id
                                        ? `https://gametora.com/images/umamusume/skill_icons/utx_ico_skill_${sk.icon_id}.png`
                                        : null;

                                    return (
                                        <button
                                            key={sk.id || `${sk.name_en}_${sk.name_ja}`}
                                            type="button"
                                            onClick={() => handleSelect(sk)}
                                            className="group text-left p-3 rounded-2xl bg-white dark:bg-slate-800/80 hover:bg-indigo-50/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500/50 shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-start gap-3 relative"
                                        >
                                            {/* Skill Icon */}
                                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-900 border border-slate-300 dark:border-slate-700 shrink-0 flex items-center justify-center">
                                                {iconUrl ? (
                                                    <img
                                                        src={iconUrl}
                                                        alt={sk.name_en}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                            e.currentTarget.nextSibling.style.display = 'flex';
                                                        }}
                                                    />
                                                ) : null}
                                                <div 
                                                    className={`w-full h-full flex items-center justify-center bg-indigo-950 text-indigo-300 ${iconUrl ? 'hidden' : 'flex'}`}
                                                >
                                                    <Zap className="w-5 h-5" />
                                                </div>
                                            </div>

                                            {/* Skill Info */}
                                            <div className="min-w-0 flex-1 space-y-1">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    {getRarityBadge(sk.rarity)}
                                                    {(sk.cards_count > 0 || sk.chars_count > 0) && (
                                                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-1.5 py-0.2 rounded">
                                                            {sk.cards_count > 0 && `${sk.cards_count} Kartu`}
                                                            {sk.cards_count > 0 && sk.chars_count > 0 && ' • '}
                                                            {sk.chars_count > 0 && `${sk.chars_count} Karakter`}
                                                        </span>
                                                    )}

                                                    {/* Tactical Badges: Distance */}
                                                    {sk.distance_types && sk.distance_types.length > 0 && !sk.distance_types.includes('all') && (
                                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                                                            {sk.distance_types.join('/')}
                                                        </span>
                                                    )}

                                                    {/* Tactical Badges: Running Style */}
                                                    {sk.running_styles && sk.running_styles.length > 0 && !sk.running_styles.includes('all') && (
                                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                                            {sk.running_styles.join('/')}
                                                        </span>
                                                    )}

                                                    {/* Tactical Badges: Effect Categories */}
                                                    {sk.effect_categories && sk.effect_categories.map((cat) => {
                                                        const catLabel = {
                                                            speed: '⚡ Speed',
                                                            accel: '🚀 Accel',
                                                            recovery: '💙 Heal',
                                                            passive: '🟢 Green',
                                                            debuff: '🔻 Debuff',
                                                        }[cat] || cat;
                                                        return (
                                                            <span key={cat} className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                                                {catLabel}
                                                            </span>
                                                        );
                                                    })}
                                                </div>

                                                <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                                                    {sk.name_en || sk.name_ja || sk.name || 'Skill Tanpa Nama'}
                                                </h4>

                                                {sk.name_ja && sk.name_ja !== sk.name_en && (
                                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                                        {sk.name_ja}
                                                    </div>
                                                )}

                                                {sk.description_en && (
                                                    <p className="text-[10px] text-slate-600 dark:text-slate-300 line-clamp-1 italic pt-0.5">
                                                        {sk.description_en}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Select Action Arrow */}
                                            <div className="shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity pl-1">
                                                <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-xs">
                                                    <ArrowRight className="w-3.5 h-3.5" />
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Load More Button */}
                            {hasMore && (
                                <div className="text-center pt-3 pb-1">
                                    <button
                                        type="button"
                                        onClick={() => setDisplayLimit(prev => prev + 60)}
                                        className="px-5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 shadow-2xs transition-all cursor-pointer"
                                    >
                                        Muat Lebih Banyak ({filteredSkills.length - visibleSkills.length} skill tersisa)...
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 flex items-center justify-between text-xs text-slate-500 shrink-0">
                    <div className="text-[11px]">
                        💡 Klik salah satu skill untuk memuat seluruh sumber penyedianya di <strong>Katalog Terbalik</strong>.
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-xl font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
}
