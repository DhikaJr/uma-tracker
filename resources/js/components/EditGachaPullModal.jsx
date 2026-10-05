import React, { useState, useEffect } from 'react';
import { X, Sparkles, Save, Calendar, Check, AlertCircle, RefreshCw } from 'lucide-react';
import RarityBadge from './RarityBadge';

export default function EditGachaPullModal({
    pull,
    isOpen,
    onClose,
    onSuccess,
    banners = [],
    gachaMeta = { characters: [], support_cards: [] }
}) {
    const [form, setForm] = useState({
        banner_type: 'character',
        gacha_banner_id: '',
        pull_type: 'single',
        item_name: '',
        rarity: 'SSR',
        is_rate_up: false,
        pulled_at: '',
    });
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (!isOpen || !pull) return;

        setForm({
            banner_type: pull.banner_type || 'character',
            gacha_banner_id: pull.gacha_banner_id ? String(pull.gacha_banner_id) : '',
            pull_type: pull.pull_type || 'single',
            item_name: pull.item_name || '',
            rarity: pull.rarity || 'SSR',
            is_rate_up: Boolean(pull.is_rate_up),
            pulled_at: pull.pulled_at 
                ? (typeof pull.pulled_at === 'string' && pull.pulled_at.includes('T')
                    ? pull.pulled_at.slice(0, 10)
                    : String(pull.pulled_at).slice(0, 10))
                : new Date().toISOString().slice(0, 10),
        });
        setErrorMsg('');
        setShowSuggestions(false);
    }, [isOpen, pull]);

    // Handle ESC key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !pull) return null;

    // Helper: Determine if banner is Twinkle Collection
    const isTwinkleBanner = (banner) => {
        if (!banner) return false;
        return banner.category === 'twinkle' ||
            (typeof banner.name === 'string' && banner.name.toLowerCase().includes('twinkle collection'));
    };

    // Helper: Determine if item is rate-up on banner
    const isItemRateUp = (itemName, banner) => {
        if (!itemName || !banner || isTwinkleBanner(banner)) return false;

        const normalize = (str) => {
            if (!str || typeof str !== 'string') return '';
            return str
                .trim()
                .toLowerCase()
                .replace(/^(ssr|sr|r)\s+/i, '')
                .replace(/\s*\([^)]+\)\s*$/, '')
                .replace(/［/g, '[').replace(/］/g, ']')
                .trim();
        };

        const target = normalize(itemName);
        if (!target) return false;

        const featuredList = Array.isArray(banner.featured_items) ? banner.featured_items : [];
        return featuredList.some(featured => {
            const featStr = typeof featured === 'object' && featured !== null ? featured.name : featured;
            const feat = normalize(featStr);
            if (!feat) return false;
            if (target === feat) return true;
            if (feat.length >= 5 && target.includes(feat)) return true;
            if (target.length >= 5 && feat.includes(target)) return true;
            return false;
        });
    };

    // Autocomplete filtering
    const handleItemNameChange = (val) => {
        const curBanner = banners.find(b => String(b.id) === String(form.gacha_banner_id));
        const isTwinkle = isTwinkleBanner(curBanner);
        const autoUp = isTwinkle ? false : isItemRateUp(val, curBanner);
        setForm(prev => ({ 
            ...prev, 
            item_name: val,
            is_rate_up: Boolean(autoUp),
        }));
        setErrorMsg('');

        if (!val || val.length < 1) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        if (isTwinkle && Array.isArray(curBanner?.featured_items) && curBanner.featured_items.length > 0) {
            const q = val.toLowerCase();
            const featuredMatches = curBanner.featured_items
                .filter(item => {
                    const nameStr = typeof item === 'object' && item !== null ? item.name : item;
                    return nameStr.toLowerCase().includes(q);
                })
                .map(item => {
                    const nameStr = typeof item === 'object' && item !== null ? item.name : item;
                    return { name: nameStr, rarity: 'SSR', base_stars: 3 };
                });

            const rawPool = form.banner_type === 'character' 
                ? (gachaMeta.characters || []) 
                : (gachaMeta.support_cards || []);
            
            const b1AndB2Matches = rawPool
                .map(item => {
                    const nameStr = typeof item === 'object' && item !== null ? item.name : item;
                    const r = (gachaMeta.character_rarities && gachaMeta.character_rarities[nameStr])
                        || (typeof item === 'object' && item !== null ? item.rarity : null)
                        || (nameStr.startsWith('SR ') ? 'SR' : nameStr.startsWith('R ') ? 'R' : null);
                    return {
                        name: nameStr,
                        rarity: r || 'SR',
                        base_stars: r === 'R' ? 1 : 2,
                    };
                })
                .filter(item => {
                    if (item.rarity === 'SSR') return false;
                    return item.name.toLowerCase().includes(q);
                })
                .slice(0, 8);

            const combined = [...featuredMatches, ...b1AndB2Matches].slice(0, 10);
            setSuggestions(combined);
            setShowSuggestions(combined.length > 0);
            return;
        }

        const pool = form.banner_type === 'character' 
            ? (gachaMeta.characters || []) 
            : (gachaMeta.support_cards || []);
        
        const q = val.toLowerCase();
        const matches = pool.map(item => {
            if (typeof item === 'object' && item !== null) return item;
            const r = (gachaMeta.character_rarities && gachaMeta.character_rarities[item])
                || (item.startsWith('SSR ') ? 'SSR' : item.startsWith('SR ') ? 'SR' : item.startsWith('R ') ? 'R' : 'SSR');
            return {
                name: item,
                rarity: r,
                base_stars: r === 'SSR' ? 3 : (r === 'SR' ? 2 : 1),
            };
        }).filter(item => {
            const nameMatch = item.name?.toLowerCase().includes(q);
            const jaMatch = item.raw_data?.name_jp?.toLowerCase().includes(q);
            const charMatch = item.raw_data?.character?.toLowerCase().includes(q);
            return nameMatch || jaMatch || charMatch;
        }).slice(0, 8);

        setSuggestions(matches);
        setShowSuggestions(matches.length > 0);
    };

    const handleSelectSuggestion = (item) => {
        const curBanner = banners.find(b => String(b.id) === String(form.gacha_banner_id));
        const isTwinkle = isTwinkleBanner(curBanner);
        const autoUp = isTwinkle ? false : isItemRateUp(item.name, curBanner);
        const updates = {
            item_name: item.name,
            is_rate_up: Boolean(autoUp),
        };

        if (item.rarity) {
            updates.rarity = item.rarity;
        } else if (item.base_stars) {
            updates.rarity = item.base_stars === 3 ? 'SSR' : (item.base_stars === 2 ? 'SR' : 'R');
        } else if (gachaMeta.character_rarities && gachaMeta.character_rarities[item.name]) {
            updates.rarity = gachaMeta.character_rarities[item.name];
        }

        setForm(prev => ({ ...prev, ...updates }));
        setShowSuggestions(false);
        setErrorMsg('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.item_name.trim()) {
            setErrorMsg('Nama item / karakter wajib diisi.');
            return;
        }

        const curBanner = banners.find(b => String(b.id) === String(form.gacha_banner_id));
        const isTwinkle = isTwinkleBanner(curBanner);
        if (isTwinkle && form.rarity === 'SSR' && Array.isArray(curBanner?.featured_items) && curBanner.featured_items.length > 0) {
            const matched = curBanner.featured_items.some(f => {
                const fName = typeof f === 'object' && f !== null ? f.name : f;
                return fName.toLowerCase() === form.item_name.trim().toLowerCase();
            });
            if (!matched) {
                setErrorMsg(`Karakter B3 (SSR) "${form.item_name.trim()}" bukan bagian dari 8 karakter Twinkle Collection pada banner ini.`);
                return;
            }
        } else if (!isTwinkle && form.is_rate_up && !isItemRateUp(form.item_name.trim(), curBanner)) {
            setErrorMsg(`Kartu "${form.item_name.trim()}" bukan merupakan pilihan rate-up pada banner yang dipilih.`);
            return;
        }

        setSaving(true);
        setErrorMsg('');

        try {
            const payload = {
                banner_type: form.banner_type,
                gacha_banner_id: form.gacha_banner_id ? Number(form.gacha_banner_id) : null,
                pull_type: form.pull_type,
                item_name: form.item_name.trim(),
                rarity: form.rarity,
                is_rate_up: isTwinkle ? false : form.is_rate_up,
                pulled_at: form.pulled_at,
            };

            const res = await fetch(`/api/gacha/pulls/${pull.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (res.ok && data.data) {
                onSuccess?.(data.data, data.message || 'Data pull berhasil diperbarui.');
                onClose?.();
            } else {
                throw new Error(data.message || 'Gagal menyimpan perubahan pull.');
            }
        } catch (err) {
            console.error('Error updating gacha pull:', err);
            setErrorMsg(err.message || 'Terjadi kesalahan saat memperbarui data pull.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div 
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/40">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center font-black">
                            <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                                Edit Riwayat Pull Gacha
                            </h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Pity count akan dihitung ulang secara otomatis
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {errorMsg && (
                        <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {/* Banner Type & Pull Type */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                Kategori Pool
                            </label>
                            <select
                                value={form.banner_type}
                                onChange={(e) => {
                                    setForm(prev => ({ 
                                        ...prev, 
                                        banner_type: e.target.value,
                                        gacha_banner_id: '',
                                    }));
                                }}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            >
                                <option value="character">🌸 Character (Uma)</option>
                                <option value="support_card">🎴 Support Card</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                Tipe Pull
                            </label>
                            <select
                                value={form.pull_type}
                                onChange={(e) => setForm(prev => ({ ...prev, pull_type: e.target.value }))}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            >
                                <option value="single">Single Pull (1x)</option>
                                <option value="multi_10">Multi Pull (10x)</option>
                                <option value="ticket">Ticket Pull</option>
                            </select>
                        </div>
                    </div>

                    {/* Gacha Banner JP 2026 */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            Banner Banner JP (Opsional)
                        </label>
                        <select
                            value={form.gacha_banner_id}
                            onChange={(e) => {
                                const newId = e.target.value;
                                const b = banners.find(item => String(item.id) === String(newId));
                                const isTwinkle = isTwinkleBanner(b);
                                setForm(prev => ({
                                    ...prev,
                                    gacha_banner_id: newId,
                                    is_rate_up: isTwinkle ? false : Boolean(isItemRateUp(prev.item_name, b)),
                                }));
                                setErrorMsg('');
                            }}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        >
                            <option value="">-- General / Tidak Tertaut Banner Spesifik --</option>
                            {banners
                                .filter(b => !form.banner_type || b.category === form.banner_type || b.category === 'both')
                                .map(b => (
                                    <option key={b.id} value={b.id}>
                                        [{b.base_rate > 3.0 ? '4.5%' : '3.0%'}] {b.name} ({b.start_date || ''})
                                    </option>
                                ))}
                        </select>
                    </div>

                    {/* Item / Character Name with Autocomplete */}
                    <div className="relative">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            Nama Karakter / Support Card <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.item_name}
                            onChange={(e) => handleItemNameChange(e.target.value)}
                            onFocus={() => {
                                if (form.item_name) handleItemNameChange(form.item_name);
                            }}
                            placeholder="Ketik nama karakter atau support card..."
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            required
                        />

                        {/* Suggestions Dropdown */}
                        {showSuggestions && suggestions.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-30 overflow-hidden max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60">
                                {suggestions.map((item) => (
                                    <button
                                        key={item.name}
                                        type="button"
                                        onClick={() => handleSelectSuggestion(item)}
                                        className="w-full px-3.5 py-2.5 text-left text-xs hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            {item.image_url || item.icon_url ? (
                                                <img 
                                                    src={item.image_url || item.icon_url} 
                                                    alt={item.name}
                                                    className="w-6 h-6 rounded-lg object-cover shrink-0" 
                                                />
                                            ) : null}
                                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                                {item.name}
                                            </span>
                                        </div>
                                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                                            {item.rarity || `${item.base_stars || 3}★`}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Rarity & Rate-Up Toggle */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                Rarity
                            </label>
                            <div className="flex items-center gap-1.5">
                                {['SSR', 'SR', 'R'].map((r) => (
                                    <button
                                        key={r}
                                        type="button"
                                        onClick={() => {
                                            const curBanner = banners.find(b => String(b.id) === String(form.gacha_banner_id));
                                            const isSelect = curBanner?.category === 'select_rate_up' || /select\s*pick\s*up/i.test(curBanner?.name || '');
                                            setForm(prev => ({
                                                ...prev,
                                                rarity: r,
                                                is_rate_up: (r === 'R' || (isSelect && r !== 'SSR')) ? false : prev.is_rate_up,
                                            }));
                                            setErrorMsg('');
                                        }}
                                        className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                                            form.rarity === r
                                                ? r === 'SSR'
                                                    ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                                                    : r === 'SR'
                                                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                                                        : 'bg-slate-600 text-white border-slate-600 shadow-xs'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                                        }`}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                Status Rate-Up
                            </label>
                            {(() => {
                                const curBanner = banners.find(b => String(b.id) === String(form.gacha_banner_id));
                                const isTwinkle = isTwinkleBanner(curBanner);

                                if (isTwinkle) {
                                    return (
                                        <div
                                            className="w-full py-1.5 px-3 rounded-xl text-xs font-black border flex items-center justify-center gap-1.5 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800"
                                            title="Twinkle Collection: Seluruh 8 karakter B3 memiliki rate sama rata (0.375% per karakter) tanpa sistem rate-up/rate-off."
                                        >
                                            <span>Pool B3 (Tanpa UP)</span>
                                        </div>
                                    );
                                }

                                return (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const curBanner = banners.find(b => String(b.id) === String(form.gacha_banner_id));
                                            if (!form.is_rate_up) {
                                                if (!isItemRateUp(form.item_name, curBanner)) {
                                                    setErrorMsg(`Kartu "${form.item_name || 'ini'}" bukan merupakan pilihan rate-up pada banner yang dipilih.`);
                                                    return;
                                                }
                                                setForm(prev => ({ ...prev, is_rate_up: true }));
                                                setErrorMsg('');
                                            } else {
                                                setForm(prev => ({ ...prev, is_rate_up: false }));
                                            }
                                        }}
                                        className={`w-full py-1.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${
                                            form.is_rate_up
                                                ? 'bg-rose-500 text-white border-rose-500 shadow-xs'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                                        }`}
                                    >
                                        <Check className={`w-3.5 h-3.5 ${form.is_rate_up ? 'opacity-100' : 'opacity-30'}`} />
                                        <span>{form.is_rate_up ? 'Featured Rate-Up' : 'Biasa (Off-Rate)'}</span>
                                    </button>
                                );
                            })()}
                        </div>
                    </div>

                    {/* Pulled At Date */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>Tanggal Pull</span>
                        </label>
                        <input
                            type="date"
                            value={form.pulled_at}
                            onChange={(e) => setForm(prev => ({ ...prev, pulled_at: e.target.value }))}
                            max={new Date().toISOString().slice(0, 10)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            required
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-5 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                        >
                            {saving ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Save className="w-3.5 h-3.5" />
                            )}
                            <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
