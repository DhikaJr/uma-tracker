import React, { useState, useEffect, useMemo } from 'react';
import {
    Sparkles,
    X,
    Plus,
    Minus,
    Check,
    AlertCircle,
    Calendar,
    Layers,
    ToggleLeft,
    ToggleRight,
    Search,
    Zap
} from 'lucide-react';
import RarityBadge from './RarityBadge';

export default function Quick10PullModal({
    isOpen,
    onClose,
    onSuccess,
    banners = [],
    gachaMeta = { characters: [], support_cards: [], character_rarities: {} },
    onNotify,
}) {
    const todayDate = new Date().toISOString().slice(0, 10);

    // Form state
    const [selectedBannerId, setSelectedBannerId] = useState(() => {
        return banners.length > 0 ? String(banners[0].id) : '';
    });
    const [pulledAt, setPulledAt] = useState(todayDate);
    const [submitting, setSubmitting] = useState(false);

    // Rarity counters (default: 9 R + 1 SR)
    const [rCount, setRCount] = useState(9);
    const [srCount, setSrCount] = useState(1);
    const [ssrCount, setSsrCount] = useState(0);

    // SSR details: array of { id, item_name, is_rate_up }
    const [ssrItems, setSsrItems] = useState([]);

    // Autocomplete search query for active SSR row: { [ssrIndex]: query }
    const [searchQueries, setSearchQueries] = useState({});
    const [openDropdownIdx, setOpenDropdownIdx] = useState(null);

    // Active banner details
    const currentBanner = useMemo(() => {
        return banners.find(b => String(b.id) === String(selectedBannerId)) || banners[0] || null;
    }, [banners, selectedBannerId]);

    const bannerType = currentBanner?.banner_type || 'character';
    const isTwinkle = useMemo(() => {
        if (!currentBanner) return false;
        return currentBanner.category === 'twinkle' ||
            (typeof currentBanner.name === 'string' && currentBanner.name.toLowerCase().includes('twinkle collection'));
    }, [currentBanner]);

    const featuredItems = useMemo(() => {
        if (!currentBanner || !Array.isArray(currentBanner.featured_items)) return [];
        return currentBanner.featured_items
            .map(item => typeof item === 'object' && item !== null ? item.name : item)
            .filter(item => bannerType === 'character' ? (typeof item === 'string' ? item.includes('[') : true) : true);
    }, [currentBanner, bannerType]);

    const catalogPool = useMemo(() => {
        if (isTwinkle && featuredItems.length > 0) {
            return featuredItems;
        }
        return bannerType === 'character'
            ? (gachaMeta.characters || []).filter(c => typeof c === 'string' ? c.includes('[') : true)
            : (gachaMeta.support_cards || []);
    }, [isTwinkle, featuredItems, bannerType, gachaMeta]);

    // Total count validation
    const totalCount = rCount + srCount + ssrCount;
    const isValidTotal = totalCount === 10;

    // Synchronize ssrItems array length with ssrCount
    useEffect(() => {
        if (!isOpen) return;
        setSsrItems(prev => {
            const next = [...prev];
            if (next.length < ssrCount) {
                for (let i = next.length; i < ssrCount; i++) {
                    const defaultFeatured = featuredItems[i % (featuredItems.length || 1)] || '';
                    next.push({
                        item_name: defaultFeatured,
                        is_rate_up: isTwinkle ? false : Boolean(defaultFeatured),
                    });
                }
            } else if (next.length > ssrCount) {
                return next.slice(0, ssrCount);
            }
            return next;
        });
    }, [isOpen, ssrCount, featuredItems, isTwinkle]);

    if (!isOpen) return null;

    // Check if an item is considered rate-up
    const checkRateUp = (name) => {
        if (isTwinkle) return false;
        if (!name || featuredItems.length === 0) return false;
        const norm = name.trim().toLowerCase();
        return featuredItems.some(f => norm.includes(f.toLowerCase()) || f.toLowerCase().includes(norm));
    };

    // Quick presets
    const applyPreset = (r, sr, ssr) => {
        setRCount(r);
        setSrCount(sr);
        setSsrCount(ssr);
    };

    const handleSsrNameChange = (idx, name) => {
        const isUp = checkRateUp(name);
        setSsrItems(prev => prev.map((item, i) => i === idx ? {
            ...item,
            item_name: name,
            is_rate_up: isUp,
        } : item));
        setSearchQueries(prev => ({ ...prev, [idx]: name }));
    };

    const handleToggleRateUp = (idx) => {
        if (isTwinkle) return;
        setSsrItems(prev => prev.map((item, i) => {
            if (i !== idx) return item;
            if (!item.is_rate_up) {
                if (!checkRateUp(item.item_name)) {
                    onNotify?.(
                        `"${item.item_name || `SSR #${idx + 1}`}" bukan merupakan pilihan kartu kandidat rate-up pada banner yang dipilih.`,
                        'warning'
                    );
                    return item;
                }
                return { ...item, is_rate_up: true };
            }
            return { ...item, is_rate_up: false };
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedBannerId) {
            onNotify?.('Silakan pilih Banner JP 2026 terlebih dahulu!', 'error');
            return;
        }

        if (totalCount !== 10) {
            onNotify?.(`Total tarikan harus tepat 10 kartu (saat ini ${totalCount}/10)!`, 'error');
            return;
        }

        // Validate SSR items have names
        for (let i = 0; i < ssrItems.length; i++) {
            if (!ssrItems[i].item_name || !ssrItems[i].item_name.trim()) {
                onNotify?.(`Harap isi nama karakter/kartu untuk SSR #${i + 1}!`, 'error');
                return;
            }
        }

        // Validate Twinkle SSR characters
        if (isTwinkle && featuredItems.length > 0) {
            for (let i = 0; i < ssrItems.length; i++) {
                const name = ssrItems[i].item_name.trim();
                const matched = featuredItems.some(f => f.toLowerCase() === name.toLowerCase());
                if (!matched) {
                    onNotify?.(`SSR #${i + 1} ("${name}") bukan bagian dari 8 karakter Twinkle Collection pada banner ini. Harap pilih karakter dari lineup Twinkle!`, 'error');
                    return;
                }
            }
        }

        setSubmitting(true);
        try {
            // Build 10 pulls
            const pulls = [];

            // 1. Add SSRs
            ssrItems.forEach((ssr, idx) => {
                pulls.push({
                    item_name: ssr.item_name.trim(),
                    rarity: 'SSR',
                    is_rate_up: isTwinkle ? false : Boolean(ssr.is_rate_up),
                });
            });

            // 2. Add SRs
            const srDefaultName = bannerType === 'character' ? 'Generic SR Umamusume' : 'Generic SR Support Card';
            for (let i = 0; i < srCount; i++) {
                pulls.push({
                    item_name: srDefaultName,
                    rarity: 'SR',
                    is_rate_up: false,
                });
            }

            // 3. Add Rs
            const rDefaultName = bannerType === 'character' ? 'Generic R Umamusume' : 'Generic R Support Card';
            for (let i = 0; i < rCount; i++) {
                pulls.push({
                    item_name: rDefaultName,
                    rarity: 'R',
                    is_rate_up: false,
                });
            }

            const payload = {
                banner_type: bannerType,
                gacha_banner_id: parseInt(selectedBannerId, 10),
                pull_type: 'multi_10',
                pulled_at: pulledAt || todayDate,
                pulls: pulls,
            };

            const res = await fetch('/api/gacha/pulls/batch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const result = await res.json();
            if (!res.ok) {
                throw new Error(result.message || 'Gagal menyimpan tarikan 10x.');
            }

            onNotify?.(`10x Pull berhasil dicatat! Pity bertambah 10 poin.`, 'success');
            onSuccess?.();
            onClose?.();
        } catch (err) {
            console.error('Quick 10 pull error:', err);
            onNotify?.(err.message || 'Terjadi kesalahan saat menyimpan tarikan.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 my-auto space-y-4 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                            <Zap className="w-5 h-5 fill-white" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>Quick 10-Pull Input</span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                                    Instant
                                </span>
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Input cepat 10 tarikan gacha sekaligus dengan counter rarity & detail SSR
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form Content (Scrollable) */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs">
                    {/* Banner & Date Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700">
                        <div className="sm:col-span-2 space-y-1">
                            <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                <span>Banner JP 2026</span>
                            </label>
                            <select
                                value={selectedBannerId}
                                onChange={(e) => setSelectedBannerId(e.target.value)}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            >
                                {banners.map(b => (
                                    <option key={b.id} value={b.id}>
                                        {b.banner_type === 'character' ? '🌸' : '🃏'} {b.name} ({b.base_rate || 3.0}%)
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>Pull Date</span>
                            </label>
                            <input
                                type="date"
                                value={pulledAt}
                                max={todayDate}
                                onChange={(e) => setPulledAt(e.target.value)}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                            />
                        </div>
                    </div>

                    {/* Quick Rarity Grid */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                                    <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                    <span>Quick Rarity Grid</span>
                                </h4>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Tentukan komposisi kartu tarikan menggunakan stepper atau preset
                                </p>
                            </div>

                            {/* Total Counter Status Badge */}
                            <div className={`px-2.5 py-1 rounded-xl font-bold font-mono text-xs flex items-center gap-1.5 ${
                                isValidTotal
                                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                    : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 animate-pulse'
                            }`}>
                                {isValidTotal ? (
                                    <>
                                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                        <span>Total: 10 / 10 (Pas)</span>
                                    </>
                                ) : (
                                    <>
                                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                                        <span>Total: {totalCount} / 10 ({totalCount < 10 ? `kurang ${10 - totalCount}` : `kelebihan ${totalCount - 10}`})</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Preset Buttons */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Presets:</span>
                            <button
                                type="button"
                                onClick={() => applyPreset(9, 1, 0)}
                                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                                    rCount === 9 && srCount === 1 && ssrCount === 0
                                        ? 'bg-amber-500 text-white shadow-xs'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                            >
                                9 R + 1 SR
                            </button>
                            <button
                                type="button"
                                onClick={() => applyPreset(8, 1, 1)}
                                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                                    rCount === 8 && srCount === 1 && ssrCount === 1
                                        ? 'bg-amber-500 text-white shadow-xs'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                            >
                                8 R + 1 SR + 1 SSR
                            </button>
                            <button
                                type="button"
                                onClick={() => applyPreset(7, 2, 1)}
                                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                                    rCount === 7 && srCount === 2 && ssrCount === 1
                                        ? 'bg-amber-500 text-white shadow-xs'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                            >
                                7 R + 2 SR + 1 SSR
                            </button>
                            <button
                                type="button"
                                onClick={() => applyPreset(7, 1, 2)}
                                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                                    rCount === 7 && srCount === 1 && ssrCount === 2
                                        ? 'bg-amber-500 text-white shadow-xs'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                            >
                                7 R + 1 SR + 2 SSR 🌟
                            </button>
                            <button
                                type="button"
                                onClick={() => applyPreset(10, 0, 0)}
                                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                                    rCount === 10 && srCount === 0 && ssrCount === 0
                                        ? 'bg-amber-500 text-white shadow-xs'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                            >
                                10 R (All R)
                            </button>
                        </div>

                        {/* Stepper Counters Grid */}
                        <div className="grid grid-cols-3 gap-3 pt-2">
                            {/* R Counter */}
                            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center space-y-2">
                                <span className="inline-block px-2.5 py-0.5 rounded-md font-black text-[11px] bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300">
                                    R (Rare)
                                </span>
                                <div className="flex items-center justify-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setRCount(prev => Math.max(0, prev - 1))}
                                        className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center justify-center font-bold text-base cursor-pointer shadow-2xs"
                                    >
                                        <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="w-8 text-lg font-black font-mono text-slate-900 dark:text-white">
                                        {rCount}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setRCount(prev => Math.min(10, prev + 1))}
                                        className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center justify-center font-bold text-base cursor-pointer shadow-2xs"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* SR Counter */}
                            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center space-y-2">
                                <span className="inline-block px-2.5 py-0.5 rounded-md font-black text-[11px] bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300">
                                    SR (Super Rare)
                                </span>
                                <div className="flex items-center justify-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSrCount(prev => Math.max(0, prev - 1))}
                                        className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center justify-center font-bold text-base cursor-pointer shadow-2xs"
                                    >
                                        <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="w-8 text-lg font-black font-mono text-slate-900 dark:text-white">
                                        {srCount}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setSrCount(prev => Math.min(10, prev + 1))}
                                        className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center justify-center font-bold text-base cursor-pointer shadow-2xs"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* SSR Counter */}
                            <div className="p-3 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-center space-y-2">
                                <span className="inline-block px-2.5 py-0.5 rounded-md font-black text-[11px] bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs">
                                    SSR (Rainbow)
                                </span>
                                <div className="flex items-center justify-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSsrCount(prev => Math.max(0, prev - 1))}
                                        className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40 flex items-center justify-center font-bold text-base text-amber-700 dark:text-amber-300 cursor-pointer shadow-2xs"
                                    >
                                        <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="w-8 text-lg font-black font-mono text-amber-700 dark:text-amber-300">
                                        {ssrCount}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setSsrCount(prev => Math.min(10, prev + 1))}
                                        className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40 flex items-center justify-center font-bold text-base text-amber-700 dark:text-amber-300 cursor-pointer shadow-2xs"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SSR Details Section (Only shown when ssrCount > 0) */}
                    {ssrCount > 0 && (
                        <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-slate-900 border border-amber-200/80 dark:border-slate-800 space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                    <span>Detail Kartu SSR ({ssrCount})</span>
                                </h4>
                                <span className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold">
                                    Pilih karakter/kartu & centang jika rate-up
                                </span>
                            </div>

                            {/* Featured Rate Up Chips or Twinkle Lineup */}
                            {featuredItems.length > 0 && (
                                isTwinkle ? (
                                    <div className="p-3 bg-gradient-to-r from-sky-50 via-indigo-50 to-sky-50 dark:from-sky-950/40 dark:via-indigo-950/30 dark:to-sky-950/40 rounded-xl border border-sky-200 dark:border-sky-800 space-y-1.5">
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <span className="text-xs font-black text-sky-950 dark:text-sky-200">
                                                Lineup Karakter B3 Twinkle Collection (8 Karakter • Rate Rata 0.375% per Karakter)
                                            </span>
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-sky-500 text-white">
                                                Tanpa Rate-Up / Rate-Off
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-sky-900/80 dark:text-sky-300/80">
                                            Seluruh 3% rate SSR terbagi rata ke 8 karakter B3 di bawah ini (tidak ada spook). Klik untuk mengisi slot SSR:
                                        </p>
                                        <div className="flex flex-wrap gap-1">
                                            {featuredItems.map((featName, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => {
                                                        const targetIdx = ssrItems.findIndex(s => !s.item_name || s.item_name === featName);
                                                        const slotToUse = targetIdx !== -1 ? targetIdx : 0;
                                                        handleSsrNameChange(slotToUse, featName);
                                                    }}
                                                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white dark:bg-slate-800 text-sky-900 dark:text-sky-200 border border-sky-300 dark:border-sky-700 hover:bg-sky-500 hover:text-white dark:hover:bg-sky-500 transition-colors cursor-pointer shadow-2xs"
                                                >
                                                    + {featName}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">
                                            Item Featured Banner Ini (Klik untuk Isi Cepat):
                                        </span>
                                        <div className="flex flex-wrap gap-1">
                                            {featuredItems.map((featName, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => {
                                                        // Find first SSR with empty or non-featured name
                                                        const targetIdx = ssrItems.findIndex(s => !s.item_name || s.item_name === featName);
                                                        const slotToUse = targetIdx !== -1 ? targetIdx : 0;
                                                        handleSsrNameChange(slotToUse, featName);
                                                    }}
                                                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-100 dark:bg-amber-950/90 text-amber-900 dark:text-amber-200 border border-amber-300/80 dark:border-amber-700 hover:bg-amber-200 dark:hover:bg-amber-900 transition-colors cursor-pointer shadow-2xs"
                                                >
                                                    ⭐ {featName}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )
                            )}

                            {/* SSR Rows */}
                            <div className="space-y-2.5 pt-1">
                                {ssrItems.map((ssr, idx) => {
                                    const search = searchQueries[idx] ?? ssr.item_name ?? '';
                                    const filteredSuggestions = catalogPool.filter(name =>
                                        name.toLowerCase().includes(search.toLowerCase())
                                    ).slice(0, 10);

                                    return (
                                        <div
                                            key={idx}
                                            className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-slate-700 shadow-2xs space-y-2 relative"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 text-xs">
                                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                                                        SSR #{idx + 1}
                                                    </span>
                                                </div>

                                                {/* Rate Up Toggle */}
                                                {isTwinkle ? (
                                                    <div
                                                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 select-none cursor-default"
                                                        title="Twinkle Collection: 8 Karakter B3 memiliki rate sama rata (0.375% per karakter) tanpa rate-up."
                                                    >
                                                        <span className="font-extrabold text-[10px] uppercase">Pool B3</span>
                                                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">(Tanpa Rate-Up)</span>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleRateUp(idx)}
                                                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                                            ssr.is_rate_up
                                                                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 shadow-2xs'
                                                                : 'bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600'
                                                        }`}
                                                    >
                                                        {ssr.is_rate_up ? (
                                                            <ToggleRight className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                                                        ) : (
                                                            <ToggleLeft className="w-4 h-4 text-slate-400" />
                                                        )}
                                                        <span>Rate-Up Hit: {ssr.is_rate_up ? 'YA' : 'TIDAK'}</span>
                                                    </button>
                                                )}
                                            </div>

                                            {/* Item Name Input with Suggestions Dropdown */}
                                            <div className="relative">
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={search}
                                                        onChange={(e) => {
                                                            handleSsrNameChange(idx, e.target.value);
                                                            setOpenDropdownIdx(idx);
                                                        }}
                                                        onFocus={() => setOpenDropdownIdx(idx)}
                                                        placeholder={isTwinkle ? 'Pilih salah satu dari 8 karakter B3 Twinkle...' : `Ketik nama ${bannerType === 'character' ? 'Uma Musume' : 'Support Card'}...`}
                                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                                                    />
                                                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                                                </div>

                                                {/* Suggestions Dropdown */}
                                                {openDropdownIdx === idx && search.trim().length > 0 && (
                                                    <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-44 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                                                        {filteredSuggestions.map((sug, sIdx) => (
                                                            <button
                                                                key={sIdx}
                                                                type="button"
                                                                onClick={() => {
                                                                    handleSsrNameChange(idx, sug);
                                                                    setOpenDropdownIdx(null);
                                                                }}
                                                                className="w-full px-3 py-2 text-left hover:bg-amber-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between cursor-pointer"
                                                            >
                                                                <span className="truncate">{sug}</span>
                                                                {checkRateUp(sug) && (
                                                                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">
                                                                        Rate Up
                                                                    </span>
                                                                )}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* SR & R Summary Note */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 flex items-center justify-between">
                        <span>
                            ⚡ <strong>{srCount} kartu SR</strong> & <strong>{rCount} kartu R</strong> akan otomatis dicatat dengan nama standar sehingga input tetap instan.
                        </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !isValidTotal}
                            className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 hover:from-amber-600 hover:to-pink-600 text-white shadow-md shadow-orange-500/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Sparkles className="w-4 h-4" />
                            <span>{submitting ? 'Menyimpan 10 Pull...' : 'Simpan 10x Pull'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
