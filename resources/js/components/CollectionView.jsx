import React, { useState, useEffect, useMemo } from 'react';
import { 
    Layers, 
    Sparkles, 
    Search, 
    Filter, 
    RefreshCw, 
    Star, 
    Check, 
    Lock, 
    Trophy, 
    ArrowUpDown, 
    SlidersHorizontal,
    CheckCircle2,
    Zap,
    ExternalLink,
    ShieldCheck,
    User,
    Maximize2,
    X,
    BookOpen,
    Info
} from 'lucide-react';
import CharacterDetailModal from './CharacterDetailModal';
import SupportCardDetailModal from './SupportCardDetailModal';

export default function CollectionView({ onNotify }) {
    const [activeSection, setActiveSection] = useState('characters'); // 'characters' | 'cards'
    const [previewCard, setPreviewCard] = useState(null);
    const [previewCharacter, setPreviewCharacter] = useState(null);
    const [selectedCharForDetail, setSelectedCharForDetail] = useState(null);
    const [selectedCardForDetail, setSelectedCardForDetail] = useState(null);

    // Character collection states
    const [characters, setCharacters] = useState([]);
    const [charStats, setCharStats] = useState(null);
    const [loadingChars, setLoadingChars] = useState(true);
    const [charSearch, setCharSearch] = useState('');
    const [charFilterOwned, setCharFilterOwned] = useState('all'); // 'all', 'owned', 'unowned'
    const [charFilterBaseStars, setCharFilterBaseStars] = useState('all'); // 'all', '3', '2', '1'
    const [charFilterCurrentStars, setCharFilterCurrentStars] = useState('all'); // 'all', '5', '4', '3', '2', '1'
    const [charSort, setCharSort] = useState('stars_desc'); // 'stars_desc', 'stars_asc', 'name_asc'

    // Support card collection states
    const [cards, setCards] = useState([]);
    const [cardStats, setCardStats] = useState(null);
    const [loadingCards, setLoadingCards] = useState(true);
    const [cardSearch, setCardSearch] = useState('');
    const [cardFilterOwned, setCardFilterOwned] = useState('all'); // 'all', 'owned', 'unowned'
    const [cardFilterRarity, setCardFilterRarity] = useState('all'); // 'all', 'SSR', 'SR', 'R'
    const [cardFilterType, setCardFilterType] = useState('all'); // 'all', 'Speed', 'Stamina', 'Power', 'Guts', 'Wit', 'Friend', 'Group'
    const [cardFilterLb, setCardFilterLb] = useState('all'); // 'all', 'mlb', '0', '1', '2', '3'
    const [cardSort, setCardSort] = useState('rarity_desc'); // 'rarity_desc', 'lb_desc', 'name_asc'

    // GameTora sync state
    const [syncingGameTora, setSyncingGameTora] = useState(false);
    const [lastSyncDate, setLastSyncDate] = useState(null);

    // Fetch character collection
    const fetchCharacters = async () => {
        setLoadingChars(true);
        try {
            const res = await fetch('/api/collection/characters');
            const data = await res.json();
            if (data.success) {
                setCharacters(data.characters || []);
                setCharStats(data.stats || null);
            }
        } catch (err) {
            console.error('Failed to load characters collection:', err);
            onNotify?.('Gagal memuat daftar koleksi karakter', 'error');
        } finally {
            setLoadingChars(false);
        }
    };

    // Fetch support cards collection
    const fetchSupportCards = async () => {
        setLoadingCards(true);
        try {
            const res = await fetch('/api/collection/support-cards');
            const data = await res.json();
            if (data.success) {
                setCards(data.cards || []);
                setCardStats(data.stats || null);
            }
        } catch (err) {
            console.error('Failed to load support cards collection:', err);
            onNotify?.('Gagal memuat daftar koleksi support card', 'error');
        } finally {
            setLoadingCards(false);
        }
    };

    // Fetch GameTora sync status
    const fetchSyncStatus = async () => {
        try {
            const res = await fetch('/api/gacha/sync-status');
            const data = await res.json();
            if (data.success && data.status) {
                setLastSyncDate(data.status.last_synced_at || null);
            }
        } catch (err) {
            // non-critical
        }
    };

    useEffect(() => {
        fetchCharacters();
        fetchSupportCards();
        fetchSyncStatus();
    }, []);

    // Trigger GameTora Synchronization
    const handleSyncGameTora = async () => {
        setSyncingGameTora(true);
        try {
            const res = await fetch('/api/gacha/sync-gametora', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await res.json();
            if (data.success) {
                onNotify?.(data.message || 'Katalog GameTora berhasil disinkronkan!', 'success');
                fetchCharacters();
                fetchSupportCards();
                fetchSyncStatus();
            } else {
                onNotify?.(data.message || 'Gagal menyinkronkan data GameTora', 'error');
            }
        } catch (err) {
            onNotify?.('Koneksi ke GameTora gagal: ' + err.message, 'error');
        } finally {
            setSyncingGameTora(false);
        }
    };

    // Toggle character ownership
    const handleToggleCharacter = async (char) => {
        const nextOwned = !char.is_owned;

        // Optimistic UI update
        setCharacters(prev => prev.map(c => c.name === char.name ? { ...c, is_owned: nextOwned } : c));
        setCharStats(prev => {
            if (!prev) return prev;
            const diff = nextOwned ? 1 : -1;
            const newOwned = Math.max(0, prev.total_owned + diff);
            const rate = prev.total_available > 0 ? ((newOwned / prev.total_available) * 100).toFixed(1) : 0;
            const starKey = `count_${char.current_stars}_star`;
            return {
                ...prev,
                total_owned: newOwned,
                completion_rate: parseFloat(rate),
                [starKey]: Math.max(0, (prev[starKey] || 0) + diff),
            };
        });

        try {
            const res = await fetch('/api/collection/characters/toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: char.name, is_owned: nextOwned }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Gagal mengubah status kepemilikan');
            }
            onNotify?.(data.message, 'info');
        } catch (err) {
            // Revert on error
            setCharacters(prev => prev.map(c => c.name === char.name ? { ...c, is_owned: char.is_owned } : c));
            onNotify?.(err.message, 'error');
            fetchCharacters();
        }
    };

    // Update character star rating (Strict: cannot lower below base_stars)
    const handleUpdateStars = async (char, newStars) => {
        if (newStars < char.base_stars) {
            onNotify?.(`Karakter ini bawaan ${char.base_stars}★, tidak boleh diturunkan di bawah ${char.base_stars}★!`, 'error');
            return;
        }

        const oldStars = char.current_stars;
        const wasOwned = char.is_owned;

        // Optimistic update
        setCharacters(prev => prev.map(c => {
            if (c.name === char.name) {
                return { ...c, current_stars: newStars, is_owned: true };
            }
            return c;
        }));

        try {
            const res = await fetch('/api/collection/characters/stars', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: char.name, stars: newStars }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Gagal memperbarui bintang karakter');
            }
            onNotify?.(data.message, 'success');
            // Refresh stats to ensure sync
            fetchCharacters();
        } catch (err) {
            // Revert
            setCharacters(prev => prev.map(c => c.name === char.name ? { ...c, current_stars: oldStars, is_owned: wasOwned } : c));
            onNotify?.(err.message, 'error');
        }
    };

    // Auto mark all base 1★ and 2★ as owned
    const handleBatchOwn1and2 = async () => {
        if (!confirm('Apakah Anda ingin menandai SEMUA karakter bintang 1★ dan 2★ sebagai dimiliki?')) {
            return;
        }
        try {
            const res = await fetch('/api/collection/characters/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'own_all_base_1_2' }),
            });
            const data = await res.json();
            if (data.success) {
                onNotify?.(data.message, 'success');
                fetchCharacters();
            }
        } catch (err) {
            onNotify?.('Gagal menandai karakter: ' + err.message, 'error');
        }
    };

    // Toggle support card ownership
    const handleToggleCard = async (card) => {
        const nextOwned = !card.is_owned;

        // Optimistic UI update
        setCards(prev => prev.map(c => c.name === card.name ? { ...c, is_owned: nextOwned } : c));
        setCardStats(prev => {
            if (!prev) return prev;
            const diff = nextOwned ? 1 : -1;
            const newOwned = Math.max(0, prev.total_owned + diff);
            const rate = prev.total_available > 0 ? ((newOwned / prev.total_available) * 100).toFixed(1) : 0;
            const rarityKey = `count_${card.rarity.toLowerCase()}`;
            return {
                ...prev,
                total_owned: newOwned,
                completion_rate: parseFloat(rate),
                [rarityKey]: Math.max(0, (prev[rarityKey] || 0) + diff),
            };
        });

        try {
            const res = await fetch('/api/collection/support-cards/toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: card.name, is_owned: nextOwned }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Gagal mengubah status kepemilikan');
            }
            onNotify?.(data.message, 'info');
        } catch (err) {
            setCards(prev => prev.map(c => c.name === card.name ? { ...c, is_owned: card.is_owned } : c));
            onNotify?.(err.message, 'error');
            fetchSupportCards();
        }
    };

    // Update support card Limit Break (0 to 4 MLB)
    const handleUpdateLimitBreak = async (card, newLb) => {
        const oldLb = card.limit_break;
        const wasOwned = card.is_owned;

        // Optimistic update
        setCards(prev => prev.map(c => {
            if (c.name === card.name) {
                return { ...c, limit_break: newLb, is_owned: true, is_mlb: newLb === 4 };
            }
            return c;
        }));

        try {
            const res = await fetch('/api/collection/support-cards/limit-break', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: card.name, limit_break: newLb }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Gagal memperbarui Limit Break');
            }
            onNotify?.(data.message, 'success');
            fetchSupportCards();
        } catch (err) {
            setCards(prev => prev.map(c => c.name === card.name ? { ...c, limit_break: oldLb, is_owned: wasOwned, is_mlb: oldLb === 4 } : c));
            onNotify?.(err.message, 'error');
        }
    };

    // Filter & sort characters
    const filteredCharacters = useMemo(() => {
        return characters.filter(char => {
            // Search
            if (charSearch.trim()) {
                const q = charSearch.toLowerCase();
                if (!char.name.toLowerCase().includes(q)) {
                    return false;
                }
            }
            // Owned status
            if (charFilterOwned === 'owned' && !char.is_owned) return false;
            if (charFilterOwned === 'unowned' && char.is_owned) return false;

            // Base stars
            if (charFilterBaseStars !== 'all' && char.base_stars !== parseInt(charFilterBaseStars, 10)) {
                return false;
            }

            // Current stars
            if (charFilterCurrentStars !== 'all' && char.current_stars !== parseInt(charFilterCurrentStars, 10)) {
                return false;
            }

            return true;
        }).sort((a, b) => {
            if (charSort === 'stars_desc') {
                return b.current_stars - a.current_stars || b.base_stars - a.base_stars || a.name.localeCompare(b.name);
            }
            if (charSort === 'stars_asc') {
                return a.current_stars - b.current_stars || a.base_stars - b.base_stars || a.name.localeCompare(b.name);
            }
            if (charSort === 'owned_first') {
                if (a.is_owned !== b.is_owned) return a.is_owned ? -1 : 1;
                return b.current_stars - a.current_stars;
            }
            return a.name.localeCompare(b.name);
        });
    }, [characters, charSearch, charFilterOwned, charFilterBaseStars, charFilterCurrentStars, charSort]);

    // Filter & sort support cards
    const filteredCards = useMemo(() => {
        return cards.filter(card => {
            // Search
            if (cardSearch.trim()) {
                const q = cardSearch.toLowerCase();
                const matchName = card.name.toLowerCase().includes(q);
                const matchChar = card.char_name && card.char_name.toLowerCase().includes(q);
                if (!matchName && !matchChar) return false;
            }

            // Owned status
            if (cardFilterOwned === 'owned' && !card.is_owned) return false;
            if (cardFilterOwned === 'unowned' && card.is_owned) return false;

            // Rarity
            if (cardFilterRarity !== 'all' && card.rarity !== cardFilterRarity) {
                return false;
            }

            // Card Type
            if (cardFilterType !== 'all' && card.card_type?.toLowerCase() !== cardFilterType.toLowerCase()) {
                return false;
            }

            // Limit Break
            if (cardFilterLb === 'mlb' && card.limit_break !== 4) return false;
            if (cardFilterLb === 'non_mlb' && (card.limit_break >= 4 || card.is_mlb)) return false;
            if (['0', '1', '2', '3'].includes(cardFilterLb) && card.limit_break !== parseInt(cardFilterLb, 10)) {
                return false;
            }

            return true;
        }).sort((a, b) => {
            const rarityWeight = { SSR: 3, SR: 2, R: 1 };
            if (cardSort === 'rarity_desc') {
                const diff = (rarityWeight[b.rarity] || 0) - (rarityWeight[a.rarity] || 0);
                if (diff !== 0) return diff;
                return b.limit_break - a.limit_break || a.name.localeCompare(b.name);
            }
            if (cardSort === 'lb_desc') {
                return b.limit_break - a.limit_break || (rarityWeight[b.rarity] || 0) - (rarityWeight[a.rarity] || 0);
            }
            if (cardSort === 'owned_first') {
                if (a.is_owned !== b.is_owned) return a.is_owned ? -1 : 1;
                return b.limit_break - a.limit_break;
            }
            return a.name.localeCompare(b.name);
        });
    }, [cards, cardSearch, cardFilterOwned, cardFilterRarity, cardFilterType, cardFilterLb, cardSort]);

    // Type badge color mapping
    const getTypeColor = (type) => {
        const lower = (type || '').toLowerCase();
        switch (lower) {
            case 'speed': return 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border-sky-300 dark:border-sky-800';
            case 'stamina': return 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800';
            case 'power': return 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800';
            case 'guts': return 'bg-pink-100 text-pink-800 dark:bg-pink-950/80 dark:text-pink-300 border-pink-300 dark:border-pink-800';
            case 'wit':
            case 'intelligence': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
            case 'friend': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/80 dark:text-yellow-300 border-yellow-300 dark:border-yellow-800';
            case 'group': return 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border-purple-300 dark:border-purple-800';
            default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700';
        }
    };

    // Aptitude grade color styling
    const getAptitudeGradeClass = (grade) => {
        const g = (grade || '-').toUpperCase().trim();
        switch (g) {
            case 'S': return 'text-fuchsia-600 dark:text-fuchsia-400 font-black';
            case 'A': return 'text-emerald-600 dark:text-emerald-400 font-black';
            case 'B': return 'text-sky-600 dark:text-sky-400 font-black';
            case 'C': return 'text-amber-600 dark:text-amber-400 font-black';
            case 'D': return 'text-slate-600 dark:text-slate-400 font-black';
            default: return 'text-rose-500 dark:text-rose-400 font-bold';
        }
    };

    return (
        <div className="w-full max-w-[1366px] 2xl:max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            {/* Header with Title & GameTora Sync Button */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2.5 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-md shadow-pink-500/20">
                            <Layers className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                                <span>Koleksi Trainer Uma Musume</span>
                                <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                    Server JP
                                </span>
                            </h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Catat karakter & support card yang Anda miliki, atur level bintang (★) dan limit break (LB)
                            </p>
                        </div>
                    </div>
                </div>

                {/* GameTora Sync Button & Last Synced Info */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {lastSyncDate && (
                        <div className="text-right hidden sm:block">
                            <div className="text-[10px] text-slate-400">Sinkronisasi Terakhir:</div>
                            <div className="text-xs font-semibold font-mono text-slate-700 dark:text-slate-300">
                                {new Date(lastSyncDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={handleSyncGameTora}
                        disabled={syncingGameTora}
                        className="px-4 py-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-xs font-black transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                        title="Sinkronkan data karakter dan support card terbaru dari GameTora server Jepang"
                    >
                        <RefreshCw className={`w-4 h-4 ${syncingGameTora ? 'animate-spin' : ''}`} />
                        <span>{syncingGameTora ? 'Menyinkronkan GameTora...' : 'Sinkronkan GameTora JP'}</span>
                    </button>
                </div>
            </div>

            {/* Main Tabs Navigation: Characters vs Support Cards */}
            <div className="flex bg-slate-100 dark:bg-slate-950/60 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 gap-1 sm:gap-2">
                <button
                    type="button"
                    onClick={() => setActiveSection('characters')}
                    className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        activeSection === 'characters'
                            ? 'bg-white dark:bg-slate-900 text-pink-600 dark:text-pink-400 shadow-sm border border-slate-200 dark:border-slate-700'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <Sparkles className="w-4 h-4" />
                    <span>🌸 Koleksi Karakter (Uma Musume)</span>
                    {charStats && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-pink-100 dark:bg-pink-950/80 text-pink-700 dark:text-pink-300">
                            {charStats.total_owned}/{charStats.total_available} ({charStats.completion_rate}%)
                        </span>
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => setActiveSection('cards')}
                    className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        activeSection === 'cards'
                            ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm border border-slate-200 dark:border-slate-700'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <Layers className="w-4 h-4" />
                    <span>🃏 Koleksi Support Card</span>
                    {cardStats && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300">
                            {cardStats.total_owned}/{cardStats.total_available} ({cardStats.completion_rate}%)
                        </span>
                    )}
                </button>
            </div>

            {/* ============================================================ */}
            {/* SECTION 1: CHARACTER COLLECTION */}
            {/* ============================================================ */}
            {activeSection === 'characters' && (
                <div className="space-y-5">
                    {/* Completion Tracker & Stats Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Total Dimiliki</div>
                            <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-0.5">
                                {charStats?.total_owned || 0}
                                <span className="text-xs font-medium text-slate-400 ml-1">/ {charStats?.total_available || 0}</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                                <div 
                                    className="bg-pink-500 h-full rounded-full transition-all duration-300"
                                    style={{ width: `${charStats?.completion_rate || 0}%` }}
                                />
                            </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                            <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                                <span>Bintang 5★ (Maksimal)</span>
                            </div>
                            <div className="text-xl sm:text-2xl font-black font-mono text-amber-500 mt-0.5">
                                {charStats?.count_5_star || 0}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">Karakter 5★</div>
                        </div>

                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                            <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                <span>Bintang 4★</span>
                            </div>
                            <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-0.5">
                                {charStats?.count_4_star || 0}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">Karakter 4★</div>
                        </div>

                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                            <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                                <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                                <span>Bintang 3★</span>
                            </div>
                            <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-0.5">
                                {charStats?.count_3_star || 0}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">Karakter 3★</div>
                        </div>

                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                            <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                <Star className="w-3.5 h-3.5 fill-slate-400 text-slate-400" />
                                <span>Bintang 2★</span>
                            </div>
                            <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-0.5">
                                {charStats?.count_2_star || 0}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">Karakter 2★</div>
                        </div>

                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                            <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                <Star className="w-3.5 h-3.5 fill-slate-300 text-slate-300" />
                                <span>Bintang 1★</span>
                            </div>
                            <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-0.5">
                                {charStats?.count_1_star || 0}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">Karakter 1★</div>
                        </div>
                    </div>

                    {/* Filter & Search Bar for Characters */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                        <div className="flex flex-col md:flex-row gap-3">
                            {/* Search Input */}
                            <div className="relative flex-1">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Cari karakter (misal: Epiphaneia, Oguri Cap, Special Week)..."
                                    value={charSearch}
                                    onChange={(e) => setCharSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:outline-hidden"
                                />
                                {charSearch && (
                                    <button 
                                        onClick={() => setCharSearch('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                    >
                                        &times;
                                    </button>
                                )}
                            </div>

                            {/* Ownership Filter */}
                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
                                {[
                                    { id: 'all', label: 'Semua' },
                                    { id: 'owned', label: 'Dimiliki' },
                                    { id: 'unowned', label: 'Belum' },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setCharFilterOwned(tab.id)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            charFilterOwned === tab.id
                                                ? 'bg-white dark:bg-slate-700 text-pink-600 dark:text-pink-400 shadow-xs'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Sort Selector */}
                            <div className="flex items-center gap-2 shrink-0">
                                <select
                                    value={charSort}
                                    onChange={(e) => setCharSort(e.target.value)}
                                    aria-label="Urutkan Karakter"
                                    className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-pink-500"
                                >
                                    <option value="stars_desc">Bintang Tertinggi (5★ s.d. 1★)</option>
                                    <option value="stars_asc">Bintang Terendah (1★ s.d. 5★)</option>
                                    <option value="owned_first">Dimiliki Terlebih Dahulu</option>
                                    <option value="name_asc">Nama Karakter (A - Z)</option>
                                </select>
                            </div>
                        </div>

                        {/* Secondary Filters: Base Star & Current Star + Batch button */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-slate-500 font-semibold">Bintang Bawaan:</span>
                                {['all', '3', '2', '1'].map(val => (
                                    <button
                                        key={val}
                                        type="button"
                                        onClick={() => setCharFilterBaseStars(val)}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                                            charFilterBaseStars === val
                                                ? 'bg-pink-100 dark:bg-pink-950 border-pink-400 text-pink-700 dark:text-pink-300'
                                                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                        }`}
                                    >
                                        {val === 'all' ? 'Semua Base' : `Base ${val}★`}
                                    </button>
                                ))}

                                <span className="text-slate-300 dark:text-slate-700 mx-1">|</span>

                                <span className="text-slate-500 font-semibold">Bintang Saat Ini:</span>
                                {['all', '5', '4', '3', '2', '1'].map(val => (
                                    <button
                                        key={val}
                                        type="button"
                                        onClick={() => setCharFilterCurrentStars(val)}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                                            charFilterCurrentStars === val
                                                ? 'bg-amber-100 dark:bg-amber-950 border-amber-400 text-amber-800 dark:text-amber-300'
                                                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                        }`}
                                    >
                                        {val === 'all' ? 'Semua Saat Ini' : `${val}★`}
                                    </button>
                                ))}
                            </div>

                            {/* Batch Action Button */}
                            <button
                                type="button"
                                onClick={handleBatchOwn1and2}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px] transition-colors cursor-pointer ml-auto"
                                title="Tandai semua karakter base 1★ dan 2★ sebagai dimiliki secara otomatis"
                            >
                                ✨ Miliki Semua 1★ & 2★
                            </button>
                        </div>
                    </div>

                    {/* Character Grid */}
                    {loadingChars ? (
                        <div className="py-16 text-center space-y-3">
                            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-pink-500" />
                            <p className="text-xs text-slate-500">Memuat data koleksi karakter GameTora...</p>
                        </div>
                    ) : filteredCharacters.length === 0 ? (
                        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2">
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Tidak ada karakter yang cocok dengan filter pencarian.</p>
                            <p className="text-xs text-slate-400">Coba atur ulang filter atau kata kunci pencarian Anda.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {filteredCharacters.map((char) => {
                                const isOwned = char.is_owned;
                                const baseStars = char.base_stars || 3;
                                const currentStars = char.current_stars || baseStars;

                                return (
                                    <div
                                        key={char.name}
                                        className={`rounded-3xl p-4 border transition-all duration-200 flex flex-col justify-between relative overflow-hidden ${
                                            isOwned
                                                ? 'bg-white dark:bg-slate-900 border-pink-300/80 dark:border-pink-900/60 shadow-md shadow-pink-500/5'
                                                : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/80 opacity-70 hover:opacity-100'
                                        }`}
                                    >
                                        {/* Top Info Header */}
                                        <div className="space-y-2">
                                            <div className="flex items-start justify-between gap-2">
                                                {/* Base Rarity Badge */}
                                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                                                    baseStars === 3
                                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300'
                                                        : baseStars === 2
                                                            ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-400'
                                                            : 'bg-amber-900/20 text-amber-800 dark:text-amber-400 border-amber-800/40'
                                                }`}>
                                                    Bawaan {baseStars}★
                                                </span>

                                                {/* Ownership Toggle Button */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleCharacter(char)}
                                                    className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                                                        isOwned
                                                            ? 'bg-pink-600 hover:bg-pink-700 text-white shadow-xs'
                                                            : 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                                                    }`}
                                                >
                                                    <Check className={`w-3.5 h-3.5 ${isOwned ? 'opacity-100' : 'opacity-0'}`} />
                                                    <span>{isOwned ? 'Dimiliki' : 'Miliki'}</span>
                                                </button>
                                            </div>

                                            {/* Character Avatar & Name */}
                                            <div className="flex items-center gap-3 pt-1">
                                                <div 
                                                    onClick={() => setPreviewCharacter(char)}
                                                    className={`w-14 h-14 rounded-2xl overflow-hidden shrink-0 border relative flex items-center justify-center shadow-xs transition-transform cursor-pointer hover:scale-105 group/avatar ${
                                                    baseStars === 3
                                                        ? 'border-amber-300/80 bg-amber-50/60 dark:bg-amber-950/30'
                                                        : baseStars === 2
                                                            ? 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800'
                                                            : 'border-amber-700/40 bg-amber-900/10 dark:bg-amber-950/20'
                                                }`}
                                                    title="Klik untuk melihat ilustrasi karakter penuh (Full Stand Zoom)"
                                                >
                                                    <User className="w-6 h-6 text-slate-300 dark:text-slate-600 absolute" />
                                                    {char.image_url || char.icon_url ? (
                                                        <img 
                                                            src={char.image_url || char.icon_url} 
                                                            alt={char.name} 
                                                            loading="lazy" 
                                                            className="w-full h-full object-cover object-top relative z-10"
                                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                        />
                                                    ) : null}
                                                    <div className="absolute inset-0 bg-black/0 group-hover/avatar:bg-black/35 z-20 transition-colors flex items-center justify-center opacity-0 group-hover/avatar:opacity-100">
                                                        <Maximize2 className="w-4 h-4 text-white drop-shadow-md" />
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 
                                                        onClick={() => setSelectedCharForDetail(char)}
                                                        className="text-sm font-black text-slate-900 dark:text-white line-clamp-2 leading-snug cursor-pointer hover:text-pink-600 dark:hover:text-pink-400 transition-colors" 
                                                        title={`${char.name} - Klik untuk lihat detail`}
                                                    >
                                                        {char.name}
                                                    </h3>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Star Rating Customizer */}
                                        <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                                            <div className="flex items-center justify-between text-[11px]">
                                                <span className="font-semibold text-slate-500 dark:text-slate-400">
                                                    Kustomisasi Bintang:
                                                </span>
                                                <span className="font-mono font-black text-amber-600 dark:text-amber-400">
                                                    {currentStars}★ / 5★
                                                </span>
                                            </div>

                                            {/* 5 Interactive Stars */}
                                            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-2 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                                                {[1, 2, 3, 4, 5].map((starIdx) => {
                                                    const isLockedBelowBase = starIdx < baseStars;
                                                    const isFilled = starIdx <= currentStars;

                                                    return (
                                                        <button
                                                            key={starIdx}
                                                            type="button"
                                                            disabled={isLockedBelowBase}
                                                            onClick={() => handleUpdateStars(char, starIdx)}
                                                            title={
                                                                isLockedBelowBase
                                                                    ? `Terkunci: Bintang bawaan karakter ini adalah ${baseStars}★ (tidak boleh di bawah ${baseStars}★)`
                                                                    : `Set ke ${starIdx}★`
                                                            }
                                                            className={`p-1.5 rounded-xl transition-all relative ${
                                                                isLockedBelowBase
                                                                    ? 'opacity-30 cursor-not-allowed text-slate-400'
                                                                    : 'cursor-pointer hover:scale-125 active:scale-95'
                                                            }`}
                                                        >
                                                            {isLockedBelowBase ? (
                                                                <Lock className="w-4 h-4 text-slate-400" />
                                                            ) : (
                                                                <Star
                                                                    className={`w-5 h-5 transition-colors ${
                                                                        isFilled
                                                                            ? 'fill-amber-400 text-amber-500 drop-shadow-xs'
                                                                            : 'text-slate-300 dark:text-slate-600'
                                                                    }`}
                                                                />
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {/* Helper Note for locked stars */}
                                            <div className="text-[10px] text-slate-400 text-center">
                                                {baseStars > 1 ? (
                                                    <span>Bintang minimum: <strong>{baseStars}★</strong> (tidak bisa diturunkan)</span>
                                                ) : (
                                                    <span>Dapat dinaikkan dari 1★ hingga 5★</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Aptitude Badges & Detail Button */}
                                        {(() => {
                                            const apt = typeof char.aptitudes === 'string' 
                                                ? (() => { try { return JSON.parse(char.aptitudes); } catch (e) { return null; } })()
                                                : char.aptitudes;
                                            
                                            if (!apt || (!apt.turf && !apt.dirt)) {
                                                return (
                                                    <div className="pt-2.5 mt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedCharForDetail(char)}
                                                            className="w-full py-1.5 px-2 rounded-xl bg-pink-50 hover:bg-pink-100 dark:bg-pink-950/40 dark:hover:bg-pink-950/70 text-pink-700 dark:text-pink-300 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-pink-200/60 dark:border-pink-800/50"
                                                        >
                                                            <BookOpen className="w-3.5 h-3.5" />
                                                            <span>Detail Karakter</span>
                                                        </button>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div className="pt-2.5 mt-2.5 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                                                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                                        <span>Kesesuaian (Aptitude):</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedCharForDetail(char)}
                                                            className="text-pink-600 hover:text-pink-700 dark:text-pink-400 dark:hover:text-pink-300 flex items-center gap-1 font-bold cursor-pointer"
                                                        >
                                                            <BookOpen className="w-3 h-3" />
                                                            <span>Detail</span>
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-3 gap-1 text-[9.5px]">
                                                        {/* Trek */}
                                                        <div className="bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-xl border border-slate-200/50 dark:border-slate-700/50 flex flex-col justify-between">
                                                            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase">Trek</span>
                                                            <div className="flex items-center justify-between gap-1 font-mono mt-0.5">
                                                                <span title="Turf (Rumput)">T:<strong className={getAptitudeGradeClass(apt.turf)}>{apt.turf || '-'}</strong></span>
                                                                <span title="Dirt (Tanah)">D:<strong className={getAptitudeGradeClass(apt.dirt)}>{apt.dirt || '-'}</strong></span>
                                                            </div>
                                                        </div>

                                                        {/* Jarak */}
                                                        <div className="bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-xl border border-slate-200/50 dark:border-slate-700/50 flex flex-col justify-between">
                                                            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase">Jarak</span>
                                                            <div className="flex items-center justify-between gap-0.5 font-mono text-[9px] mt-0.5">
                                                                <span title="Short (Sprint)">S:<strong className={getAptitudeGradeClass(apt.short)}>{apt.short || '-'}</strong></span>
                                                                <span title="Mile">M:<strong className={getAptitudeGradeClass(apt.mile)}>{apt.mile || '-'}</strong></span>
                                                                <span title="Medium (Menengah)">I:<strong className={getAptitudeGradeClass(apt.medium)}>{apt.medium || '-'}</strong></span>
                                                                <span title="Long (Jauh)">L:<strong className={getAptitudeGradeClass(apt.long)}>{apt.long || '-'}</strong></span>
                                                            </div>
                                                        </div>

                                                        {/* Gaya Lari */}
                                                        <div className="bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-xl border border-slate-200/50 dark:border-slate-700/50 flex flex-col justify-between">
                                                            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase">Gaya</span>
                                                            <div className="flex items-center justify-between gap-0.5 font-mono text-[9px] mt-0.5">
                                                                <span title="Runner (Nige)">R:<strong className={getAptitudeGradeClass(apt.runner)}>{apt.runner || '-'}</strong></span>
                                                                <span title="Leader (Senkou)">L:<strong className={getAptitudeGradeClass(apt.leader)}>{apt.leader || '-'}</strong></span>
                                                                <span title="Betweener (Sashi)">B:<strong className={getAptitudeGradeClass(apt.betweener)}>{apt.betweener || '-'}</strong></span>
                                                                <span title="Chaser (Oikomi)">C:<strong className={getAptitudeGradeClass(apt.chaser)}>{apt.chaser || '-'}</strong></span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Detail Button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedCharForDetail(char)}
                                                        className="w-full mt-1 py-1.5 px-2 rounded-xl bg-pink-50 hover:bg-pink-100 dark:bg-pink-950/40 dark:hover:bg-pink-950/70 text-pink-700 dark:text-pink-300 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-pink-200/60 dark:border-pink-800/50"
                                                    >
                                                        <BookOpen className="w-3.5 h-3.5" />
                                                        <span>Detail Karakter</span>
                                                    </button>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ============================================================ */}
            {/* SECTION 2: SUPPORT CARD COLLECTION */}
            {/* ============================================================ */}
            {activeSection === 'cards' && (
                <div className="space-y-5">
                    {/* Completion Tracker & Stats Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Total Kartu Dimiliki</div>
                            <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-0.5">
                                {cardStats?.total_owned || 0}
                                <span className="text-xs font-medium text-slate-400 ml-1">/ {cardStats?.total_available || 0}</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                                <div 
                                    className="bg-amber-500 h-full rounded-full transition-all duration-300"
                                    style={{ width: `${cardStats?.completion_rate || 0}%` }}
                                />
                            </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                            <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                <span>MLB (Max Limit Break)</span>
                            </div>
                            <div className="text-xl sm:text-2xl font-black font-mono text-amber-500 mt-0.5">
                                {cardStats?.count_mlb || 0}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">Kartu 4LB (MLB)</div>
                        </div>

                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                            <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <Zap className="w-3.5 h-3.5 text-amber-500" />
                                <span>Kartu SSR Dimiliki</span>
                            </div>
                            <div className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                                {cardStats?.count_ssr || 0}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">Rarity SSR</div>
                        </div>

                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                            <div className="text-[11px] font-bold text-purple-600 dark:text-purple-400">
                                Kartu SR Dimiliki
                            </div>
                            <div className="text-xl sm:text-2xl font-black font-mono text-purple-600 dark:text-purple-400 mt-0.5">
                                {cardStats?.count_sr || 0}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">Rarity SR</div>
                        </div>

                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                            <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                Kartu R Dimiliki
                            </div>
                            <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-0.5">
                                {cardStats?.count_r || 0}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">Rarity R</div>
                        </div>

                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Kelengkapan</div>
                            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                                {cardStats?.completion_rate || 0}%
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">Total Catalog JP</div>
                        </div>
                    </div>

                    {/* Filter & Search Bar for Support Cards */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                        <div className="flex flex-col md:flex-row gap-3">
                            {/* Search Input */}
                            <div className="relative flex-1">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Cari support card (misal: Kitasan Black, Fine Motion, Super Creek)..."
                                    value={cardSearch}
                                    onChange={(e) => setCardSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                                />
                                {cardSearch && (
                                    <button 
                                        onClick={() => setCardSearch('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                    >
                                        &times;
                                    </button>
                                )}
                            </div>

                            {/* Ownership Filter */}
                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
                                {[
                                    { id: 'all', label: 'Semua' },
                                    { id: 'owned', label: 'Dimiliki' },
                                    { id: 'unowned', label: 'Belum' },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setCardFilterOwned(tab.id)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            cardFilterOwned === tab.id
                                                ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Sort Selector */}
                            <div className="flex items-center gap-2 shrink-0">
                                <select
                                    value={cardSort}
                                    onChange={(e) => setCardSort(e.target.value)}
                                    aria-label="Urutkan Kartu"
                                    className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500"
                                >
                                    <option value="rarity_desc">Rarity (SSR &rarr; SR &rarr; R)</option>
                                    <option value="lb_desc">Limit Break Tertinggi (MLB &rarr; 0LB)</option>
                                    <option value="owned_first">Dimiliki Terlebih Dahulu</option>
                                    <option value="name_asc">Nama Kartu (A - Z)</option>
                                </select>
                            </div>
                        </div>

                        {/* Secondary Filters: Rarity, Card Type, and LB */}
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                            <span className="text-slate-500 font-semibold">Rarity:</span>
                            {['all', 'SSR', 'SR', 'R'].map(val => (
                                <button
                                    key={val}
                                    type="button"
                                    onClick={() => setCardFilterRarity(val)}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                                        cardFilterRarity === val
                                            ? 'bg-amber-100 dark:bg-amber-950 border-amber-400 text-amber-800 dark:text-amber-300'
                                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                    }`}
                                >
                                    {val === 'all' ? 'Semua Rarity' : val}
                                </button>
                            ))}

                            <span className="text-slate-300 dark:text-slate-700 mx-1">|</span>

                            <span className="text-slate-500 font-semibold">Tipe:</span>
                            {['all', 'Speed', 'Stamina', 'Power', 'Guts', 'Wit', 'Friend', 'Group'].map(type => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setCardFilterType(type)}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                                        cardFilterType.toLowerCase() === type.toLowerCase()
                                            ? 'bg-emerald-100 dark:bg-emerald-950 border-emerald-400 text-emerald-800 dark:text-emerald-300'
                                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                    }`}
                                >
                                    {type === 'all' ? 'Semua Tipe' : type}
                                </button>
                            ))}

                            <span className="text-slate-300 dark:text-slate-700 mx-1">|</span>

                            <span className="text-slate-500 font-semibold">Limit Break:</span>
                            {['all', 'mlb', 'non_mlb', '3', '2', '1', '0'].map(lb => (
                                <button
                                    key={lb}
                                    type="button"
                                    onClick={() => setCardFilterLb(lb)}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                                        cardFilterLb === lb
                                            ? 'bg-purple-100 dark:bg-purple-950 border-purple-400 text-purple-800 dark:text-purple-300'
                                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                    }`}
                                >
                                    {lb === 'all' ? 'Semua LB' : lb === 'mlb' ? '★ MLB' : lb === 'non_mlb' ? 'Non-MLB' : `${lb}LB`}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Support Cards Grid */}
                    {loadingCards ? (
                        <div className="py-16 text-center space-y-3">
                            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-500" />
                            <p className="text-xs text-slate-500">Memuat data koleksi kartu support GameTora...</p>
                        </div>
                    ) : filteredCards.length === 0 ? (
                        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2">
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Tidak ada support card yang cocok dengan filter pencarian.</p>
                            <p className="text-xs text-slate-400">Coba atur ulang filter atau kata kunci pencarian Anda.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {filteredCards.map((card) => {
                                const isOwned = card.is_owned;
                                const lb = card.limit_break || 0;
                                const isMlb = lb === 4;

                                return (
                                    <div
                                        key={card.name}
                                        className={`rounded-3xl p-4 border transition-all duration-200 flex flex-col justify-between relative overflow-hidden ${
                                            isOwned
                                                ? isMlb
                                                    ? 'bg-gradient-to-br from-white via-amber-50/20 to-yellow-50/30 dark:from-slate-900 dark:via-amber-950/20 dark:to-slate-900 border-amber-400/90 dark:border-amber-600/70 shadow-lg shadow-amber-500/10'
                                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs'
                                                : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/80 opacity-70 hover:opacity-100'
                                        }`}
                                    >
                                        {/* Top Card Info Header */}
                                        <div className="space-y-2">
                                            <div className="flex items-start justify-between gap-2">
                                                {/* Rarity & Type Badges */}
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                                                        card.rarity === 'SSR'
                                                            ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 border-amber-300 font-black shadow-xs'
                                                            : card.rarity === 'SR'
                                                                ? 'bg-gradient-to-r from-purple-400 to-indigo-500 text-white border-purple-300 font-bold'
                                                                : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-400 font-bold'
                                                    }`}>
                                                        {card.rarity}
                                                    </span>

                                                    {card.card_type && (
                                                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${getTypeColor(card.card_type)}`}>
                                                            {card.card_type}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Ownership Toggle Button */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleCard(card)}
                                                    className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                                                        isOwned
                                                            ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                                                            : 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                                                    }`}
                                                >
                                                    <Check className={`w-3.5 h-3.5 ${isOwned ? 'opacity-100' : 'opacity-0'}`} />
                                                    <span>{isOwned ? 'Dimiliki' : 'Miliki'}</span>
                                                </button>
                                            </div>

                                            {/* Card Art Illustration & Name */}
                                            <div className="flex items-center gap-3 pt-1">
                                                <div 
                                                    onClick={() => setPreviewCard(card)}
                                                    className="w-16 h-[85px] rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 relative flex items-center justify-center shadow-xs cursor-pointer group/card-art hover:ring-2 hover:ring-amber-400 dark:hover:ring-amber-500 transition-all"
                                                    title="Klik untuk melihat ilustrasi kartu penuh (Full Art)"
                                                >
                                                    <Layers className="w-6 h-6 text-slate-300 dark:text-slate-600 absolute" />
                                                    {card.image_url || card.icon_url ? (
                                                        <img 
                                                            src={card.image_url || card.icon_url} 
                                                            alt={card.name} 
                                                            loading="lazy" 
                                                            className="w-full h-full object-cover relative z-10 transition-transform duration-300 group-hover/card-art:scale-105"
                                                            onError={(e) => { 
                                                                if (card.gametora_id && !e.currentTarget.dataset.fallback) {
                                                                    e.currentTarget.dataset.fallback = 'true';
                                                                    e.currentTarget.src = `https://gametora.com/images/umamusume/supports/support_card_s_${card.gametora_id}.png`;
                                                                } else {
                                                                    e.currentTarget.style.display = 'none'; 
                                                                }
                                                            }}
                                                        />
                                                    ) : null}
                                                    <div className="absolute inset-0 bg-black/0 group-hover/card-art:bg-black/30 z-20 transition-colors flex items-center justify-center opacity-0 group-hover/card-art:opacity-100">
                                                        <Maximize2 className="w-4 h-4 text-white drop-shadow-md" />
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-sm font-black text-slate-900 dark:text-white line-clamp-2 leading-snug" title={card.name}>
                                                        {card.name}
                                                    </h3>
                                                    {card.char_name && (
                                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                                            Karakter: <strong>{card.char_name}</strong>
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Limit Break (LB) Customizer with Crystal Icons */}
                                        <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                                            <div className="flex items-center justify-between text-[11px]">
                                                <span className="font-semibold text-slate-500 dark:text-slate-400">
                                                    Limit Break:
                                                </span>
                                                <span className={`font-mono font-black ${
                                                    isMlb 
                                                        ? 'text-amber-500 dark:text-amber-400 flex items-center gap-1 animate-pulse'
                                                        : 'text-slate-900 dark:text-white'
                                                }`}>
                                                    {isMlb ? '✨ 4LB (MLB)' : `${lb}LB / 4LB`}
                                                </span>
                                            </div>

                                            {/* 4 Interactive Limit Break Crystals (Diamonds) */}
                                            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-2 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                                                {/* Reset to 0LB button */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleUpdateLimitBreak(card, 0)}
                                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                                                        lb === 0 
                                                            ? 'bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200' 
                                                            : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                                    }`}
                                                    title="Atur ke 0LB (Kartu Dasar)"
                                                >
                                                    0LB
                                                </button>

                                                <div className="flex items-center gap-2">
                                                    {[1, 2, 3, 4].map((lbIndex) => {
                                                        const isFilled = lbIndex <= lb;
                                                        const isThisMlb = lbIndex === 4 && isMlb;

                                                        return (
                                                            <button
                                                                key={lbIndex}
                                                                type="button"
                                                                onClick={() => handleUpdateLimitBreak(card, lbIndex)}
                                                                title={`Limit Break ${lbIndex}LB ${lbIndex === 4 ? '(MLB)' : ''}`}
                                                                className="p-1 rounded-lg transition-transform hover:scale-125 active:scale-95 cursor-pointer"
                                                            >
                                                                {/* Diamond / Crystal shape */}
                                                                <div className={`w-5 h-5 rounded-xs rotate-45 border-2 transition-all flex items-center justify-center ${
                                                                    isFilled
                                                                        ? isThisMlb
                                                                            ? 'bg-gradient-to-br from-amber-400 via-orange-400 to-yellow-300 border-amber-300 shadow-md shadow-amber-400/50'
                                                                            : 'bg-amber-400 dark:bg-amber-500 border-amber-500 dark:border-amber-400 shadow-xs'
                                                                        : 'bg-transparent border-slate-300 dark:border-slate-700'
                                                                }`}>
                                                                    {isFilled && (
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
                                                                    )}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* MLB Status Indicator */}
                                            <div className="text-[10px] text-center">
                                                {isMlb ? (
                                                    <span className="text-amber-600 dark:text-amber-400 font-bold">
                                                        🏆 Max Limit Break Tercapai!
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">
                                                        Klik kristal untuk mengatur limit break (1 s.d. 4LB)
                                                    </span>
                                                )}
                                            </div>
                                            {/* Detail Efek 0LB-MLB & Event Button */}
                                            <button
                                                type="button"
                                                onClick={() => setSelectedCardForDetail(card)}
                                                className="w-full mt-2 py-1.5 px-2 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-950/70 text-amber-800 dark:text-amber-300 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-amber-200/60 dark:border-amber-800/50"
                                                title="Lihat tabel stats efek 0LB s.d. MLB, skill hint, dan training event"
                                            >
                                                <BookOpen className="w-3.5 h-3.5" />
                                                <span>Detail Efek (0LB-MLB) & Event</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Full Card Art Preview Modal */}
            {previewCard && (
                <div 
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
                    onClick={() => setPreviewCard(null)}
                >
                    <div 
                        className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full max-h-[92vh] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/40">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                                        previewCard.rarity === 'SSR'
                                            ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 border-amber-300 font-black shadow-xs'
                                            : previewCard.rarity === 'SR'
                                                ? 'bg-gradient-to-r from-purple-400 to-indigo-500 text-white border-purple-300 font-bold'
                                                : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-400 font-bold'
                                    }`}>
                                        {previewCard.rarity}
                                    </span>
                                    {previewCard.card_type && (
                                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${getTypeColor(previewCard.card_type)}`}>
                                            {previewCard.card_type}
                                        </span>
                                    )}
                                </div>
                                <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">
                                    {previewCard.name}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPreviewCard(null)}
                                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors shrink-0"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal Body: High-Res Card Artwork */}
                        <div className="p-4 sm:p-6 flex items-center justify-center bg-slate-950/40 overflow-y-auto">
                            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-700/60 max-w-sm w-full aspect-[3/4] bg-slate-900 flex items-center justify-center">
                                <img 
                                    src={previewCard.image_full || previewCard.image_url} 
                                    alt={previewCard.name}
                                    className="w-full h-full object-contain"
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between text-xs gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    const targetCard = previewCard;
                                    setPreviewCard(null);
                                    setSelectedCardForDetail(targetCard);
                                }}
                                className="px-3.5 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 font-bold transition-colors cursor-pointer flex items-center gap-1.5 text-xs"
                            >
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>Detail Efek & Event</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setPreviewCard(null)}
                                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition-colors cursor-pointer"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Full Character Stand Illustration Zoom Preview Modal */}
            {previewCharacter && (
                <div 
                    className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
                    onClick={() => setPreviewCharacter(null)}
                >
                    <div 
                        className="bg-white dark:bg-slate-900 rounded-3xl max-w-md sm:max-w-lg w-full max-h-[92vh] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/40">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                                        previewCharacter.base_stars === 3
                                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300'
                                            : previewCharacter.base_stars === 2
                                                ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-400'
                                                : 'bg-amber-900/20 text-amber-800 dark:text-amber-400 border-amber-800/40'
                                    }`}>
                                        Bawaan {previewCharacter.base_stars || 3}★
                                    </span>
                                    <span className="text-xs text-amber-500 font-bold font-mono">
                                        {'★'.repeat(previewCharacter.current_stars || previewCharacter.base_stars || 3)}
                                    </span>
                                </div>
                                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                                    {previewCharacter.name}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPreviewCharacter(null)}
                                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors shrink-0"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal Body: High-Res Character Stand Illustration */}
                        <div className="p-4 sm:p-6 flex items-center justify-center bg-gradient-to-b from-slate-900/60 via-slate-950/80 to-slate-900/90 overflow-y-auto min-h-[380px] max-h-[66vh]">
                            <div className="relative rounded-2xl overflow-hidden max-w-sm w-full flex items-center justify-center">
                                <img 
                                    src={previewCharacter.image_full || previewCharacter.image_url?.replace('/thumb/', '/')} 
                                    alt={previewCharacter.name}
                                    className="max-h-[60vh] w-auto object-contain drop-shadow-2xl transition-transform hover:scale-105 duration-300"
                                    onError={(e) => {
                                        if (previewCharacter.image_url && e.currentTarget.src !== previewCharacter.image_url) {
                                            e.currentTarget.src = previewCharacter.image_url;
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between gap-3 text-xs">
                            <button
                                type="button"
                                onClick={() => {
                                    const targetChar = previewCharacter;
                                    setPreviewCharacter(null);
                                    setSelectedCharForDetail(targetChar);
                                }}
                                className="px-4 py-2 rounded-xl bg-pink-50 hover:bg-pink-100 dark:bg-pink-950/60 dark:hover:bg-pink-900/80 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800 font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                            >
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>Detail Karakter</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setPreviewCharacter(null)}
                                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition-colors cursor-pointer"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Character Detail & Skill Tree Modal */}
            <CharacterDetailModal
                character={selectedCharForDetail}
                isOpen={!!selectedCharForDetail}
                onClose={() => setSelectedCharForDetail(null)}
            />

            {/* Support Card Detail Modal (0LB to MLB, Hints, Training Events) */}
            <SupportCardDetailModal
                card={selectedCardForDetail}
                isOpen={!!selectedCardForDetail}
                onClose={() => setSelectedCardForDetail(null)}
            />
        </div>
    );
}
